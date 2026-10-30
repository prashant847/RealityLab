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
WORKFLOW_I2I = json.loads((HERE / "workflow_img2img.json").read_text(encoding="utf-8"))


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


def upload(path: Path) -> str:
    """Uploads the style reference image to ComfyUI (its input folder) and returns the name it was stored under."""
    b = "----blackout"
    crlf = b"\r\n"
    head = b"--" + b.encode() + crlf + ('Content-Disposition: form-data; name="image"; filename="%s"' % path.name).encode() + crlf + b"Content-Type: application/octet-stream" + crlf + crlf
    tail = crlf + b"--" + b.encode() + crlf + b'Content-Disposition: form-data; name="overwrite"' + crlf + crlf + b"true" + crlf + b"--" + b.encode() + b"--" + crlf
    req = urllib.request.Request(CONFIG["server"] + "/upload/image", data=head + path.read_bytes() + tail, headers={"Content-Type": "multipart/form-data; boundary=" + b})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())["name"]


def build(prompt_text: str, seed: int, o: dict, ref: str | None = None, lora: tuple[str, float] | None = None) -> dict:
    wf = copy.deepcopy(WORKFLOW_I2I if ref else WORKFLOW)
    if ref:
        wf["10"]["inputs"]["image"] = ref
        wf["12"]["inputs"].update(width=o["width"], height=o["height"])
        wf["3"]["inputs"]["denoise"] = o["denoise"]
    wf["4"]["inputs"]["ckpt_name"] = CONFIG["checkpoint"]
    if not ref:
        wf["5"]["inputs"].update(width=o["width"], height=o["height"])
    wf["6"]["inputs"]["text"] = prompt_text
    wf["7"]["inputs"]["text"] = CONFIG["style"]["negative"]
    wf["3"]["inputs"].update(seed=seed, steps=o["steps"], cfg=o["cfg"], sampler_name=o["sampler"], scheduler=o["scheduler"])
    if lora:
        wf["20"] = {"class_type": "LoraLoader", "inputs": {"lora_name": lora[0], "strength_model": lora[1], "strength_clip": lora[1], "model": ["4", 0], "clip": ["4", 1]}}
        wf["3"]["inputs"]["model"] = ["20", 0]
        wf["6"]["inputs"]["clip"] = ["20", 1]
        wf["7"]["inputs"]["clip"] = ["20", 1]
    return wf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--env", choices=sorted(CONFIG["environments"]))
    ap.add_argument("--scene", help="custom scene text instead of an environment prompt (use with --name)")
    ap.add_argument("--name", help="output name for --scene, e.g. r1a")
    ap.add_argument("--prompt", default="", help="extra words appended to the environment prompt")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--denoise", type=float, help="0.7 keeps more of the reference look and layout, 0.95 almost ignores it")
    ap.add_argument("--lora", help="LoRA file name in ComfyUI/models/loras")
    ap.add_argument("--lora-weight", type=float, default=0.9)
    ap.add_argument("--style-only", action="store_true", help="do not append the shared style prompt (use with --lora)")
    ap.add_argument("--init", help="image to start from instead of the style reference (a layout render of the panel)")
    ap.add_argument("--people", action="store_true", help="allow people in the picture")
    ap.add_argument("--no-ref", action="store_true", help="do not use the style reference image")
    ap.add_argument("--tag", default="", help="suffix for the output file name")
    ap.add_argument("--width", type=int); ap.add_argument("--height", type=int); ap.add_argument("--steps", type=int); ap.add_argument("--cfg", type=float)
    a = ap.parse_args()
    names = check()
    print("ComfyUI is up. Checkpoints:", ", ".join(names))
    if a.check or not (a.env or a.scene):
        return
    key = a.env or a.name or "scene"
    o = {**CONFIG["defaults"], **{k: v for k, v in vars(a).items() if k in ("width", "height", "steps", "cfg", "denoise") and v}}
    seed = a.seed if a.seed is not None else int(time.time()) % 2_000_000_000
    if a.people:
        CONFIG["style"]["positive"] = CONFIG["style"]["positive"].replace(", no people", "")
        CONFIG["style"]["negative"] = ", ".join(w for w in CONFIG["style"]["negative"].split(", ") if w not in ("people", "person", "human", "face", "hands"))
    positive = ", ".join(x for x in (a.scene or CONFIG["environments"][a.env], a.prompt, "" if a.style_only else CONFIG["style"]["positive"]) if x)
    ref = None if a.no_ref else upload(ROOT / (a.init or CONFIG["style_reference"]))
    pid = call("/prompt", {"prompt": build(positive, seed, o, ref, (a.lora, a.lora_weight) if a.lora else None)})["prompt_id"]
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
    stage = ROOT / CONFIG["staging_dir"] / key
    stage.mkdir(parents=True, exist_ok=True)
    out = stage / f"{key}_s{seed}{a.tag}.png"
    out.write_bytes(data)
    log = ROOT / CONFIG["staging_dir"] / "manifest.json"
    rows = json.loads(log.read_text(encoding="utf-8")) if log.exists() else []
    rows.append({"file": str(out.relative_to(ROOT)).replace("\\", "/"), "environment": key, "checkpoint": CONFIG["checkpoint"], "seed": seed, "lora": a.lora, "lora_weight": a.lora_weight if a.lora else None, "settings": o,
                 "style_reference": None if a.no_ref else CONFIG["style_reference"], "positive": positive, "negative": CONFIG["style"]["negative"], "seconds": round(time.time() - t0, 1), "approved": False,
                 "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    log.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("saved", out, f"({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
