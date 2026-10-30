"""Generate comic BACKGROUNDS with a local ComfyUI server (http://127.0.0.1:8188). No API keys, no cloud, no extra Python packages.

Nothing here touches the game: images go to a staging folder first (frontend/art-staging) and only `approve.py` copies a chosen image into the
production asset folder. Characters are never generated; the six vector characters stay as they are.

  python tools/comfy/generate.py --check                     # is ComfyUI up, and is the checkpoint installed?
  python tools/comfy/generate.py --env control_room          # one image for one environment (default prompt from config.json)
  python tools/comfy/generate.py --env control_room --seed 7 --prompt "extra detail to add"
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CONFIG = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
WORKFLOW = json.loads((HERE / "workflow_txt2img.json").read_text(encoding="utf-8"))


def call(path: str, data: dict | None = None, timeout: int = 30):
    req = urllib.request.Request(CONFIG["server"] + path, data=None if data is None else json.dumps(data).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def check() -> list[str]:
    """Returns the installed checkpoints. Raises SystemExit with an explanation if the server or the model is missing."""
    try:
        call("/system_stats", timeout=5)
    except (urllib.error.URLError, OSError):
        sys.exit(f"ComfyUI is not answering at {CONFIG['server']}. Start it with: powershell -File scripts\\comfyui.ps1")
    info = call("/object_info/CheckpointLoaderSimple")
    names = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
    if CONFIG["checkpoint"] not in names:
        sys.exit(f"Checkpoint {CONFIG['checkpoint']} is not installed. Installed: {names or 'none'}. Put it in ComfyUI/models/checkpoints.")
    return names


def build(prompt_text: str, seed: int, o: dict) -> dict:
    wf = copy.deepcopy(WORKFLOW)
    wf["4"]["inputs"]["ckpt_name"] = CONFIG["checkpoint"]
    wf["5"]["inputs"].update(width=o["width"], height=o["height"])
    wf["6"]["inputs"]["text"] = prompt_text
    wf["7"]["inputs"]["text"] = CONFIG["style"]["negative"]
    wf["3"]["inputs"].update(seed=seed, steps=o["steps"], cfg=o["cfg"], sampler_name=o["sampler"], scheduler=o["scheduler"])
    return wf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--env", choices=sorted(CONFIG["environments"]))
    ap.add_argument("--prompt", default="", help="extra words appended to the environment prompt")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--width", type=int); ap.add_argument("--height", type=int); ap.add_argument("--steps", type=int); ap.add_argument("--cfg", type=float)
    a = ap.parse_args()
    names = check()
    print("ComfyUI is up. Checkpoints:", ", ".join(names))
    if a.check or not a.env:
        return
    o = {**CONFIG["defaults"], **{k: v for k, v in vars(a).items() if k in ("width", "height", "steps", "cfg") and v}}
    seed = a.seed if a.seed is not None else int(time.time()) % 2_000_000_000
    positive = ", ".join(x for x in (CONFIG["environments"][a.env], a.prompt, CONFIG["style"]["positive"]) if x)
    pid = call("/prompt", {"prompt": build(positive, seed, o)})["prompt_id"]
    print("queued", pid, "seed", seed, o)
    t0 = time.time()
    while True:
        h = call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            sys.exit("generation failed: " + json.dumps(h[pid]["status"])[:600])
        if time.time() - t0 > 900:
            sys.exit("timed out after 15 minutes")
        time.sleep(2)
    img = next(i for node in h[pid]["outputs"].values() for i in node.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    data = urllib.request.urlopen(CONFIG["server"] + "/view?" + q, timeout=60).read()
    stage = ROOT / CONFIG["staging_dir"] / a.env
    stage.mkdir(parents=True, exist_ok=True)
    out = stage / f"{a.env}_s{seed}.png"
    out.write_bytes(data)
    log = ROOT / CONFIG["staging_dir"] / "manifest.json"
    rows = json.loads(log.read_text(encoding="utf-8")) if log.exists() else []
    rows.append({"file": str(out.relative_to(ROOT)).replace("\\", "/"), "environment": a.env, "checkpoint": CONFIG["checkpoint"], "seed": seed, "settings": o,
                 "positive": positive, "negative": CONFIG["style"]["negative"], "seconds": round(time.time() - t0, 1), "approved": False,
                 "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    log.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("saved", out, f"({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
