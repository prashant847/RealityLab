"""Character-consistency experiment: Marketing Flat Characters LoRA (style) + IP-Adapter (identity) on SD 1.5, through the local ComfyUI API.

  python tools/comfy/character_test.py master --seed 7                 # reference candidate, LoRA only
  python tools/comfy/character_test.py variant --ref <master.png> --name standing_worried --seed 101 --scene "..." --weight 0.7

Everything is saved in frontend/art-staging/character-consistency-test/ with a records.json (prompt, seed, models, weights, peak VRAM).
Nothing here touches the game or the vector characters. The trigger is "flat illustration" only (never "noise texture").
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate as G  # noqa: E402

OUT = G.ROOT / "frontend" / "art-staging" / "character-consistency-test"
LORA = "MarketingFlat-v1.safetensors"
NEGATIVE = ("photograph, photorealistic, 3d render, glossy, plastic, anime, outline, thick black lines, noise, grain, blurry, bright saturated colours, "
            "text, letters, words, watermark, logo, signature, frame, border, deformed, cluttered, messy")


def vram_sampler(stop: threading.Event, peak: list[int]) -> None:
    while not stop.is_set():
        try:
            v = int(subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"], text=True, timeout=5).split()[0])
            peak[0] = max(peak[0], v)
        except Exception:
            pass
        time.sleep(0.4)


def workflow(prompt: str, seed: int, w: int, h: int, ref: str | None, weight: float, preset: str, lora_w: float, steps: int, cfg: float) -> dict:
    wf = {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": G.CONFIG["checkpoint"]}},
        "20": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA, "strength_model": lora_w, "strength_clip": lora_w, "model": ["4", 0], "clip": ["4", 1]}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["20", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["20", 1]}},
        "3": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1,
                                                  "model": ["20", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "char_test", "images": ["8", 0]}},
    }
    if ref:
        wf["30"] = {"class_type": "LoadImage", "inputs": {"image": ref}}
        wf["31"] = {"class_type": "IPAdapterUnifiedLoader", "inputs": {"model": ["20", 0], "preset": preset}}
        wf["32"] = {"class_type": "IPAdapterAdvanced", "inputs": {"model": ["31", 0], "ipadapter": ["31", 1], "image": ["30", 0], "weight": weight, "weight_type": "linear",
                                                                  "combine_embeds": "concat", "start_at": 0.0, "end_at": 1.0, "embeds_scaling": "V only"}}
        wf["3"]["inputs"]["model"] = ["32", 0]
    return wf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["master", "variant"])
    ap.add_argument("--ref", help="master reference image (path)")
    ap.add_argument("--name", required=False, default="master")
    ap.add_argument("--scene", default="")
    ap.add_argument("--seed", type=int, required=True)
    ap.add_argument("--weight", type=float, default=0.7)
    ap.add_argument("--preset", default="PLUS FACE (portraits)")
    ap.add_argument("--lora-weight", type=float, default=1.0)
    ap.add_argument("--width", type=int, default=576); ap.add_argument("--height", type=int, default=768)
    ap.add_argument("--steps", type=int, default=28); ap.add_argument("--cfg", type=float, default=7.0)
    a = ap.parse_args()
    G.check()
    OUT.mkdir(parents=True, exist_ok=True)
    prompt = "flat illustration, " + a.scene
    ref_name = G.upload(Path(a.ref)) if a.mode == "variant" else None
    peak = [0]; stop = threading.Event()
    th = threading.Thread(target=vram_sampler, args=(stop, peak), daemon=True); th.start()
    t0 = time.time()
    pid = G.call("/prompt", {"prompt": workflow(prompt, a.seed, a.width, a.height, ref_name, a.weight, a.preset, a.lora_weight, a.steps, a.cfg)})["prompt_id"]
    while True:
        h = G.call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            stop.set(); sys.exit("generation failed: " + json.dumps(h[pid]["status"])[:900])
        if time.time() - t0 > 900:
            stop.set(); sys.exit("timed out")
        time.sleep(1)
    stop.set(); th.join(timeout=2)
    img = next(i for n in h[pid]["outputs"].values() for i in n.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    data = urllib.request.urlopen(G.CONFIG["server"] + "/view?" + q, timeout=60).read()
    out = OUT / f"{a.name}_s{a.seed}.png"
    out.write_bytes(data)
    rec_path = OUT / "records.json"
    rows = json.loads(rec_path.read_text(encoding="utf-8")) if rec_path.exists() else []
    rows.append({"file": out.name, "mode": a.mode, "checkpoint": G.CONFIG["checkpoint"], "lora": LORA, "lora_weight": a.lora_weight,
                 "ipadapter_preset": a.preset if ref_name else None, "ipadapter_weight": a.weight if ref_name else None, "reference": Path(a.ref).name if a.ref else None,
                 "clip_vision": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" if ref_name else None, "seed": a.seed, "size": [a.width, a.height], "steps": a.steps, "cfg": a.cfg,
                 "positive": prompt, "negative": NEGATIVE, "seconds": round(time.time() - t0, 1), "peak_vram_mib": peak[0],
                 "comfyui": "v0.3.50", "ipadapter_plus_commit": "a0f451a", "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    rec_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("saved", out, f"{time.time() - t0:.0f}s", f"peak VRAM {peak[0]} MiB")


if __name__ == "__main__":
    main()
