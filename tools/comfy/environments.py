"""Generate comic ENVIRONMENT PLATES (empty rooms, no characters) with the local ComfyUI server. Staging only; nothing is wired into the game.

  python tools/comfy/environments.py --env control_room --method lora --seed 5
  methods: lora  = Marketing Flat LoRA ("flat illustration" trigger, never "noise texture")
           ref   = img2img from the style reference image (img1.jpeg) at high denoise
           plain = the SD 1.5 checkpoint with the style prompt only
Two passes: 768x432 draft, then a 1.5x latent upscale with a light re-denoise (1152x648). Records prompt, seed, model, LoRA, settings and approval status.
Output: frontend/art-staging/environments/<env>/<env>_<method>_s<seed>.png and manifest.json beside them.
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

OUT = G.ROOT / "frontend" / "art-staging" / "environments"
LORA = "MarketingFlat-v1.safetensors"
STYLE = ("flat 2D vector illustration, interior or exterior environment, dark charcoal slate and muted teal palette, soft translucent cones of light, solid colour shapes, "
         "no outlines, minimal shading, clean simple shapes, clear foreground middle ground and background, wide cinematic view, large empty floor area in the centre foreground")
NEGATIVE = ("photograph, photorealistic, 3d render, glossy, plastic, anime, outline, thick black lines, noise, grain, blurry, bright saturated colours, people, person, human, face, hands, "
            "text, letters, words, numbers, watermark, logo, signature, frame, border, deformed, cluttered, messy, tilted horizon")
SCENES = {
    "warehouse_floor": "wide interior of a dark open-plan office at night, long rows of desks with computer monitors, tall windows with distant city lights, ceiling light panels",
    "control_room": "interior of a server room, a long aisle between tall black server racks with small amber and red indicator lights, cool dim blue light",
    "electrical_area": "container shipping terminal quay at dusk, a large orange gantry crane, stacked colourful shipping containers, concrete ground, calm sky",
    "loading_dock": "shipping terminal entrance gate, a red and white barrier arm, a small white gatehouse, stacks of containers behind, empty asphalt lanes",
    "ops_office": "operations centre room with three large wall screens, a long meeting table with chairs, dim lighting",
    "hospital_corridor": "customer service floor, rows of desks with desk phones and headsets, low partition panels, a large wall clock, even office light",
    "flooded_highway": "empty access road with lane markings leading to a container terminal entrance, a barrier in the distance, stacked containers, dusk sky",
    "alt_depot": "dim recovery room, a long table with many open laptops, a wall map with pins, amber emergency lights",
    "press_scene": "small communications room, a podium with a microphone, a large wall screen, two desk phones, a neutral backdrop",
}


def sampler(stop: threading.Event, peak: list[int]) -> None:
    while not stop.is_set():
        try:
            peak[0] = max(peak[0], int(subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"], text=True, timeout=5).split()[0]))
        except Exception:
            pass
        time.sleep(0.4)


def workflow(prompt: str, seed: int, method: str, ref: str | None, lora_w: float, hires: bool, w: int, h: int, dn: float = 0.65) -> dict:
    model, clip = ["4", 0], ["4", 1]
    wf: dict = {"4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": G.CONFIG["checkpoint"]}}}
    if method in ("lora", "layout"):
        wf["20"] = {"class_type": "LoraLoader", "inputs": {"lora_name": LORA, "strength_model": lora_w, "strength_clip": lora_w, "model": ["4", 0], "clip": ["4", 1]}}
        model, clip = ["20", 0], ["20", 1]
    wf["6"] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": clip}}
    wf["7"] = {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": clip}}
    if method in ("ref", "layout"):
        wf["10"] = {"class_type": "LoadImage", "inputs": {"image": ref}}
        wf["12"] = {"class_type": "ImageScale", "inputs": {"image": ["10", 0], "upscale_method": "lanczos", "width": w, "height": h, "crop": "center"}}
        wf["11"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["12", 0], "vae": ["4", 2]}}
        latent, denoise = ["11", 0], (dn if method == "layout" else 0.9)
    else:
        wf["5"] = {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}}
        latent, denoise = ["5", 0], 1.0
    wf["3"] = {"class_type": "KSampler", "inputs": {"seed": seed, "steps": 28, "cfg": 7.0, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": denoise,
                                                   "model": model, "positive": ["6", 0], "negative": ["7", 0], "latent_image": latent}}
    last = ["3", 0]
    if hires:
        wf["13"] = {"class_type": "LatentUpscaleBy", "inputs": {"samples": last, "upscale_method": "bislerp", "scale_by": 1.5}}
        wf["14"] = {"class_type": "KSampler", "inputs": {"seed": seed + 1, "steps": 20, "cfg": 6.5, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 0.5,
                                                         "model": model, "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["13", 0]}}
        last = ["14", 0]
    wf["8"] = {"class_type": "VAEDecode", "inputs": {"samples": last, "vae": ["4", 2]}}
    wf["9"] = {"class_type": "SaveImage", "inputs": {"filename_prefix": "env", "images": ["8", 0]}}
    return wf


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", required=True, choices=sorted(SCENES))
    ap.add_argument("--method", choices=["lora", "ref", "plain", "layout"], default="lora")
    ap.add_argument("--seed", type=int, required=True)
    ap.add_argument("--extra", default="", help="extra scene words")
    ap.add_argument("--lora-weight", type=float, default=0.8)
    ap.add_argument("--denoise", type=float, default=0.65, help="layout method: how far to move away from the vector layout")
    ap.add_argument("--no-hires", action="store_true")
    ap.add_argument("--tag", default="")
    a = ap.parse_args()
    G.check()
    prompt = ", ".join(x for x in (("flat illustration, " if a.method in ("lora", "layout") else "") + SCENES[a.env], a.extra, STYLE) if x)
    ref = G.upload(G.ROOT / G.CONFIG["style_reference"]) if a.method == "ref" else (G.upload(OUT / "layouts" / f"{a.env}.png") if a.method == "layout" else None)
    peak = [0]; stop = threading.Event(); threading.Thread(target=sampler, args=(stop, peak), daemon=True).start()
    t0 = time.time()
    pid = G.call("/prompt", {"prompt": workflow(prompt, a.seed, a.method, ref, a.lora_weight, not a.no_hires, 768, 432, a.denoise)})["prompt_id"]
    while True:
        h = G.call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            stop.set(); sys.exit("generation failed: " + json.dumps(h[pid]["status"])[:1200])
        if time.time() - t0 > 1200:
            stop.set(); sys.exit("timed out")
        time.sleep(1)
    stop.set()
    img = next(i for n in h[pid]["outputs"].values() for i in n.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    d = OUT / a.env; d.mkdir(parents=True, exist_ok=True)
    f = d / f"{a.env}_{a.method}{a.tag}_s{a.seed}.png"
    f.write_bytes(urllib.request.urlopen(G.CONFIG["server"] + "/view?" + q, timeout=60).read())
    mp = d / "manifest.json"
    rows = json.loads(mp.read_text(encoding="utf-8")) if mp.exists() else []
    rows.append({"file": f.name, "environment": a.env, "method": a.method, "checkpoint": G.CONFIG["checkpoint"], "lora": LORA if a.method in ("lora", "layout") else None, "init_image": f"layouts/{a.env}.png (vector layout render)" if a.method == "layout" else None, "denoise": a.denoise if a.method == "layout" else None,
                 "lora_weight": a.lora_weight if a.method in ("lora", "layout") else None, "style_reference": G.CONFIG["style_reference"] if a.method == "ref" else None, "seed": a.seed,
                 "draft_size": [768, 432], "hires": not a.no_hires, "positive": prompt, "negative": NEGATIVE, "seconds": round(time.time() - t0, 1), "peak_vram_mib": peak[0],
                 "approval": "pending", "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    mp.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("saved", f, f"{time.time() - t0:.0f}s peak VRAM {peak[0]} MiB")


if __name__ == "__main__":
    main()
