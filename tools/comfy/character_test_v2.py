"""Character-consistency experiment 2: LoRA (style) + IP-Adapter plus-face at 0.5 from a FACE-ONLY crop (identity) + OpenPose ControlNet (body and arms).

  python tools/comfy/character_test_v2.py prepare                      # face crop of the master + three OpenPose skeleton images
  python tools/comfy/character_test_v2.py gen --name A_worried --seed 201 --pose A --scene "..." --expression "..."

Outputs go to frontend/art-staging/character-consistency-test-v2/ with records.json (prompt, seed, models, weights, peak VRAM).
OpenPose skeletons are drawn by this script in the standard OpenPose colours, so no preprocessor node is needed.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate as G  # noqa: E402

V1 = G.ROOT / "frontend" / "art-staging" / "character-consistency-test"
OUT = G.ROOT / "frontend" / "art-staging" / "character-consistency-test-v2"
LORA = "MarketingFlat-v1.safetensors"
CONTROLNET = "control_v11p_sd15_openpose_fp16.safetensors"
W, H = 576, 768
NEGATIVE = ("photograph, photorealistic, 3d render, glossy, plastic, anime, outline, thick black lines, noise, grain, blurry, bright saturated colours, "
            "text, letters, words, watermark, logo, signature, frame, border, deformed, cluttered, messy, extra limbs, extra arms, extra hands, extra fingers, "
            "mutated hands, bad anatomy, two heads, duplicate, multiple people, cropped head")

# OpenPose body-18 keypoints (pixels on a 576x768 canvas): 0 nose 1 neck 2 rShoulder 3 rElbow 4 rWrist 5 lShoulder 6 lElbow 7 lWrist 8 rHip 9 rKnee 10 rAnkle
# 11 lHip 12 lKnee 13 lAnkle 14 rEye 15 lEye 16 rEar 17 lEar. Upper body only (the shots are waist-up); missing joints are simply not drawn.
def pose(nose_y: int, neck_y: int, sh: tuple[int, int], elbows: tuple, wrists: tuple, hips_y: int = 700) -> dict[int, tuple[int, int]]:
    cx = 288
    p = {0: (cx, nose_y), 1: (cx, neck_y), 2: (cx - sh[0], sh[1]), 5: (cx + sh[0], sh[1]), 3: elbows[0], 6: elbows[1], 4: wrists[0], 7: wrists[1],
         8: (cx - 58, hips_y), 11: (cx + 58, hips_y), 14: (cx - 24, nose_y - 16), 15: (cx + 24, nose_y - 16), 16: (cx - 54, nose_y - 2), 17: (cx + 54, nose_y - 2)}
    return p


POSES = {
    # A: standing, worried, tense raised shoulders, arms stiff and slightly bent, hands in front
    "A": pose(250, 375, (112, 385), ((178, 530), (398, 530)), ((214, 655), (362, 655)), hips_y=730),
    # B: shocked, hands raised beside the face
    "B": pose(255, 385, (120, 400), ((140, 480), (436, 480)), ((205, 335), (371, 335)), hips_y=730),
    # C: seated at a computer, arms bent forward with hands low in front of the body
    "C": pose(275, 400, (122, 415), ((150, 555), (426, 555)), ((236, 660), (340, 660)), hips_y=740),
    # N: neutral, relaxed, arms hanging (used by experiment 3 so that only the expression changes)
    "N": pose(250, 375, (112, 385), ((160, 545), (416, 545)), ((178, 690), (398, 690)), hips_y=740),
}
LIMBS = [(1, 2), (1, 5), (2, 3), (3, 4), (5, 6), (6, 7), (1, 8), (1, 11), (1, 0), (0, 14), (14, 16), (0, 15), (15, 17)]
COLORS = [(255, 0, 0), (255, 85, 0), (255, 170, 0), (255, 255, 0), (170, 255, 0), (85, 255, 0), (0, 255, 0), (0, 255, 85), (0, 255, 170), (0, 255, 255), (0, 170, 255), (0, 85, 255),
          (0, 0, 255), (85, 0, 255), (170, 0, 255), (255, 0, 255), (255, 0, 170), (255, 0, 85)]


def draw_pose(pts: dict[int, tuple[int, int]]) -> Image.Image:
    im = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(im)
    for i, (a, b) in enumerate(LIMBS):
        if a in pts and b in pts:
            (x1, y1), (x2, y2) = pts[a], pts[b]
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2; L = math.hypot(x2 - x1, y2 - y1); ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
            c = Image.new("RGB", (int(L) + 8, 9 * 2), (0, 0, 0)); cd = ImageDraw.Draw(c)
            cd.ellipse((0, 4, L + 7, 13), fill=tuple(int(v * 0.6) for v in COLORS[i % 18]))
            r = c.rotate(-ang, expand=True, resample=Image.BICUBIC)
            m = r.convert("L").point(lambda v: 255 if v > 0 else 0)
            im.paste(r, (int(mx - r.width / 2), int(my - r.height / 2)), m)
    for k, (x, y) in pts.items():
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=COLORS[k % 18])
    return im


def prepare() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not (OUT / "master_face_crop.png").exists() and OUT.name == "character-consistency-test-v2":
        master = Image.open(V1 / "master_it_lead.png").convert("RGB")
        master.crop((170, 70, 410, 310)).resize((512, 512), Image.LANCZOS).save(OUT / "master_face_crop.png")
    for k, p in POSES.items():
        draw_pose(p).save(OUT / f"pose_{k}.png")
    print("prepared face crop and poses in", OUT)


def vram_sampler(stop: threading.Event, peak: list[int]) -> None:
    while not stop.is_set():
        try:
            peak[0] = max(peak[0], int(subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"], text=True, timeout=5).split()[0]))
        except Exception:
            pass
        time.sleep(0.4)


def workflow(prompt: str, seed: int, face: str, posename: str, ipa_w: float, cn_s: float, steps: int, cfg: float, neg: str = NEGATIVE, preset: str = "PLUS FACE (portraits)") -> dict:
    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": G.CONFIG["checkpoint"]}},
        "20": {"class_type": "LoraLoader", "inputs": {"lora_name": LORA, "strength_model": 1.0, "strength_clip": 1.0, "model": ["4", 0], "clip": ["4", 1]}},
        "30": {"class_type": "LoadImage", "inputs": {"image": face}},
        "31": {"class_type": "IPAdapterUnifiedLoader", "inputs": {"model": ["20", 0], "preset": preset}},
        "32": {"class_type": "IPAdapterAdvanced", "inputs": {"model": ["31", 0], "ipadapter": ["31", 1], "image": ["30", 0], "weight": ipa_w, "weight_type": "linear",
                                                              "combine_embeds": "concat", "start_at": 0.0, "end_at": 1.0, "embeds_scaling": "V only"}},
        "40": {"class_type": "LoadImage", "inputs": {"image": posename}},
        "41": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": CONTROLNET}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["20", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": neg, "clip": ["20", 1]}},
        "42": {"class_type": "ControlNetApplyAdvanced", "inputs": {"positive": ["6", 0], "negative": ["7", 0], "control_net": ["41", 0], "image": ["40", 0], "strength": cn_s,
                                                                  "start_percent": 0.0, "end_percent": 1.0, "vae": ["4", 2]}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1,
                                                  "model": ["32", 0], "positive": ["42", 0], "negative": ["42", 1], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "char_v2", "images": ["8", 0]}},
    }


def gen(a) -> None:
    G.check()
    face_path = Path(a.face) if a.face else OUT / "master_face_crop.png"
    face = G.upload(face_path)
    posename = G.upload(Path(a.pose_file) if a.pose_file else OUT / f"pose_{a.pose}.png")
    prompt = f"flat illustration, {a.scene}"
    neg = NEGATIVE + (", " + a.neg_extra if a.neg_extra else "")
    peak = [0]; stop = threading.Event()
    th = threading.Thread(target=vram_sampler, args=(stop, peak), daemon=True); th.start()
    t0 = time.time()
    pid = G.call("/prompt", {"prompt": workflow(prompt, a.seed, face, posename, a.ipa_weight, a.cn_strength, a.steps, a.cfg, neg, a.preset)})["prompt_id"]
    while True:
        h = G.call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            stop.set(); sys.exit("generation failed: " + json.dumps(h[pid]["status"])[:1200])
        if time.time() - t0 > 900:
            stop.set(); sys.exit("timed out")
        time.sleep(1)
    stop.set(); th.join(timeout=2)
    img = next(i for n in h[pid]["outputs"].values() for i in n.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    out = OUT / f"{a.name}_s{a.seed}.png"
    out.write_bytes(urllib.request.urlopen(G.CONFIG["server"] + "/view?" + q, timeout=60).read())
    rp = OUT / "records.json"
    rows = json.loads(rp.read_text(encoding="utf-8")) if rp.exists() else []
    rows.append({"file": out.name, "checkpoint": G.CONFIG["checkpoint"], "lora": LORA, "lora_weight": 1.0, "ipadapter": "ip-adapter-plus-face_sd15.safetensors (preset PLUS FACE)",
                 "ipadapter_weight": a.ipa_weight, "clip_vision": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors", "identity_reference": str(face_path.name),
                 "controlnet": CONTROLNET, "controlnet_strength": a.cn_strength, "pose_image": Path(a.pose_file).name if a.pose_file else f"pose_{a.pose}.png", "seed": a.seed, "size": [W, H], "steps": a.steps, "cfg": a.cfg,
                 "positive": prompt, "negative": neg, "seconds": round(time.time() - t0, 1), "peak_vram_mib": peak[0], "comfyui": "v0.3.50", "ipadapter_plus_commit": "a0f451a",
                 "created": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    rp.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("saved", out, f"{time.time() - t0:.0f}s", f"peak VRAM {peak[0]} MiB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["prepare", "gen"])
    ap.add_argument("--name"); ap.add_argument("--seed", type=int); ap.add_argument("--pose", choices=sorted(POSES), default=None); ap.add_argument("--scene", default="")
    ap.add_argument("--out", default=None, help="output folder name under frontend/art-staging (default character-consistency-test-v2)")
    ap.add_argument("--face", default=None, help="identity reference image (path); default master_face_crop.png in the output folder")
    ap.add_argument("--neg-extra", default="", help="extra negative-prompt words, e.g. smile, grin")
    ap.add_argument("--size", default=None, help="WxH of the picture, e.g. 640x512")
    ap.add_argument("--pose-file", default=None, help="a ready-made OpenPose skeleton image to use instead of --pose")
    ap.add_argument("--preset", default="PLUS FACE (portraits)", help="IP-Adapter preset, e.g. \"PLUS (high strength)\" for whole-figure style")
    ap.add_argument("--ipa-weight", type=float, default=0.5); ap.add_argument("--cn-strength", type=float, default=0.9)
    ap.add_argument("--steps", type=int, default=28); ap.add_argument("--cfg", type=float, default=7.0)
    a = ap.parse_args()
    global OUT, W, H
    if a.size:
        W, H = (int(v) for v in a.size.lower().split("x"))
    if a.out:
        OUT = G.ROOT / "frontend" / "art-staging" / a.out
    prepare() if a.mode == "prepare" else gen(a)


if __name__ == "__main__":
    main()
