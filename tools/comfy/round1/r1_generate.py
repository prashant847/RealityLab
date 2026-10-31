"""Round 1 generation driver. Own code: it submits ComfyUI API workflows (data written by Manga Studio's workflow builder in a dry run) to the local server, adds
IP-Adapter Plus Face conditioning the way Manga Studio's workflow does, and records time and VRAM. It runs no code from the third-party repository.

  python r1_generate.py refs --seeds 1 2 3 4 5 6        # character reference portraits -> refs/<name>_s<seed>.png
  python r1_generate.py panels --seeds 11 12 13 14      # the five panels, best-of-N -> panels/p<k>_s<seed>.png
"""
import argparse, json, subprocess, sys, threading, time, urllib.parse, urllib.request
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
MS = HERE / "manga-studio"
WF = MS / "output" / "the_first_surge" / "workflows"
CFG = yaml.safe_load((MS / "config.yaml").read_text(encoding="utf-8"))
SERVER = "http://127.0.0.1:8188"
REFS, PANELS = HERE / "refs", HERE / "panels"

PREFIX = CFG["style"]["prompt_prefix"]
SUFFIX = CFG["style"]["prompt_suffix_color"]
NEG = CFG["style"]["negative"]
# which panels use a character reference (solo faces only), and with which character
IPA = {3: "nurse", 4: "lead", 5: "hakim"}


def call(path, data=None, timeout=120):
    req = urllib.request.Request(SERVER + path, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def upload(path: Path) -> str:
    b = "----r1"
    body = (f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{path.name}"\r\nContent-Type: image/png\r\n\r\n').encode() + path.read_bytes() + (
        f'\r\n--{b}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{b}--\r\n').encode()
    req = urllib.request.Request(SERVER + "/upload/image", data=body, headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())["name"]


def template() -> dict:
    return json.loads((WF / "p04_panel01.json").read_text(encoding="utf-8"))


def retarget(wf: dict, positive: str, negative: str, size, seed: int, ref: str | None = None, weight: float = 0.55) -> dict:
    ks = next(n for n in wf.values() if n["class_type"] == "KSampler")
    wf[ks["inputs"]["positive"][0]]["inputs"]["text"] = positive
    wf[ks["inputs"]["negative"][0]]["inputs"]["text"] = negative
    ks["inputs"]["seed"] = seed
    for n in wf.values():
        if n["class_type"] == "EmptyLatentImage":
            n["inputs"]["width"], n["inputs"]["height"] = size
        if n["class_type"] == "SaveImage":
            n["inputs"]["filename_prefix"] = "r1"
    if ref:
        ipa = CFG["ipadapter"]
        wf["900"] = {"class_type": "IPAdapterUnifiedLoader", "inputs": {"model": ks["inputs"]["model"], "preset": ipa["preset"]}}
        wf["901"] = {"class_type": "LoadImage", "inputs": {"image": ref}}
        wf["902"] = {"class_type": "IPAdapter", "inputs": {"model": ["900", 0], "ipadapter": ["900", 1], "image": ["901", 0], "weight": weight,
                                                           "start_at": ipa["start_at"], "end_at": ipa["end_at"], "weight_type": "standard"}}
        ks["inputs"]["model"] = ["902", 0]
    return wf


def run(wf: dict, dst: Path) -> float:
    t0 = time.time()
    pid = call("/prompt", {"prompt": wf})["prompt_id"]
    while True:
        h = call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            sys.exit(json.dumps(h[pid]["status"])[:900])
        time.sleep(1)
    img = next(i for o in h[pid]["outputs"].values() for i in o.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    dst.write_bytes(urllib.request.urlopen(SERVER + "/view?" + q, timeout=60).read())
    return time.time() - t0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["refs", "panels"])
    ap.add_argument("--seeds", type=int, nargs="+", default=[1])
    ap.add_argument("--only", type=int, nargs="*", default=[])
    ap.add_argument("--weight", type=float, default=0.55)
    ap.add_argument("--ref", action="append", default=[], help="name=path of the chosen reference portrait (panels mode)")
    a = ap.parse_args()
    peak, stop = [0], threading.Event()

    def sample():
        while not stop.is_set():
            try:
                peak[0] = max(peak[0], int(subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"], text=True, timeout=5).split()[0]))
            except Exception:
                pass
            time.sleep(0.4)
    threading.Thread(target=sample, daemon=True).start()
    times = {}
    if a.mode == "refs":
        REFS.mkdir(exist_ok=True)
        for name, ch in CFG["characters"].items():
            pos = f"{PREFIX}, ({ch['triggers']}:1.05), {ch['outfit']}, solo, portrait, head and shoulders, face focus, front view, looking at viewer, plain neutral grey background, {SUFFIX}"
            for s in a.seeds:
                times[f"{name}_s{s}"] = round(run(retarget(template(), pos, NEG + ", " + ch.get("negative", ""), (896, 1152), s), REFS / f"{name}_s{s}.png"), 1)
                print(name, s, times[f"{name}_s{s}"], "s", flush=True)
    else:
        PANELS.mkdir(exist_ok=True)
        refs = {k: upload(Path(v)) for k, v in (r.split("=", 1) for r in a.ref)}
        for k in range(1, 6):
            if a.only and k not in a.only:
                continue
            base = json.loads((WF / f"p0{k}_panel01.json").read_text(encoding="utf-8"))
            ks = next(n for n in base.values() if n["class_type"] == "KSampler")
            pos, neg = base[ks["inputs"]["positive"][0]]["inputs"]["text"], base[ks["inputs"]["negative"][0]]["inputs"]["text"]
            for s in a.seeds:
                wf = retarget(json.loads(json.dumps(base)), pos, neg, (1344, 768), s, refs.get(IPA.get(k, "")), a.weight)
                times[f"p{k}_s{s}"] = round(run(wf, PANELS / f"p{k}_s{s}.png"), 1)
                print(f"p{k}", s, times[f"p{k}_s{s}"], "s", flush=True)
    stop.set()
    (HERE / f"report_{a.mode}.json").write_text(json.dumps({"seconds": times, "peak_vram_mib": peak[0], "vram_total_mib": 6144}, indent=2), encoding="utf-8")
    print("peak VRAM MiB", peak[0])


if __name__ == "__main__":
    main()
