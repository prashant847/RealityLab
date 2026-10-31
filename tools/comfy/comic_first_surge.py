"""Paints the backdrops of the hospital simulation's first comic ("The first surge") with the local ComfyUI server, then gives them a comic-ink look.

Each page is a backdrop (painted here) plus a cast of vector stickmen and live text (drawn by the app). So no people are generated: consistent characters
come from the app, and the picture only has to be a good place for them to stand in.

  python tools/comfy/comic_first_surge.py --page morning --seeds 3 4      # paint, then ink, into frontend/art-staging/first-surge/
  python tools/comfy/comic_first_surge.py --ink-only                      # re-run the ink filter on existing raw pictures
  python tools/comfy/comic_first_surge.py --approve morning_s3_ink.png    # copy a chosen picture to frontend/public/comic/first-surge/<page>.png

Needs ComfyUI running (powershell -File scripts\\comfyui.ps1) and the layout pictures from the app's #/comic-layout/<page> route (see docs).
Local only: no cloud, no keys. Staging first; `--approve` is the only step that touches what the app ships.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import environments as E  # noqa: E402
import generate as G  # noqa: E402

STAGING = G.ROOT / "frontend" / "art-staging" / "first-surge"
PUBLIC = G.ROOT / "frontend" / "public" / "comic" / "first-surge"

STYLE = "flat illustration, bold colourful cartoon comic book background, bright saturated colours, strong contrast, rich detail, lush green bushes and trees, deep blue sky, clean shapes, no people"
SCENES = {
    "morning": "early morning outside a small district hospital, a beige two-storey hospital building with a red cross sign and a blue glass entrance door, a white ambulance with a red stripe parked on the left, empty pavement in front, green trees and bushes, orange and blue sunrise sky with a big yellow sun low on the left",
    "waiting": "inside a hospital emergency waiting room, pale green walls, a dark blank electronic board on the wall, a window on the left, a row of blue plastic chairs, beige tiled floor, a round wall clock",
    "huddle": "a hospital corridor, long ceiling light panels, a white board on the wall, pale blue-grey walls, beige tiled floor, soft lavender tint",
    "question": "a wide hospital hall, pale blue walls, beige tiled floor, large empty space in the middle, warm light from the left",
}
NEGATIVE = ("photograph, photorealistic, 3d render, glossy, anime, noise, grain, blurry, people, person, human, face, hands, crowd, text, letters, words, numbers, "
            "watermark, logo, signature, frame, border, deformed, cluttered, messy, tilted horizon, dark, gloomy")


INTERIOR_NEG = ", trees, plants, flowers, grass, bushes, outdoors, sky, clouds, rugs, toys, food, clutter on the floor, furniture in the middle"


def paint(page: str, seed: int, denoise: float, lora_w: float) -> Path:
    G.check()
    E.NEGATIVE = NEGATIVE + (INTERIOR_NEG if page != "morning" else "")
    layout = STAGING / f"layout_{page}.png"
    if not layout.exists():
        sys.exit(f"{layout} is missing: render the page's backdrop from the app (#/comic-layout/{page}) first.")
    ref = G.upload(layout)
    style = STYLE if page == "morning" else "flat illustration, bold colourful cartoon comic book interior, bright saturated colours, strong contrast, clean simple shapes, tidy empty room, no people"
    prompt = f"{style}, {SCENES[page]}"
    t0 = time.time()
    pid = G.call("/prompt", {"prompt": E.workflow(prompt, seed, "layout", ref, lora_w, True, 768, 320, denoise)})["prompt_id"]
    while True:
        h = G.call(f"/history/{pid}")
        if pid in h and h[pid].get("outputs"):
            break
        if pid in h and h[pid].get("status", {}).get("status_str") == "error":
            sys.exit(json.dumps(h[pid]["status"])[:800])
        time.sleep(1)
    img = next(i for n in h[pid]["outputs"].values() for i in n.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    out = STAGING / f"{page}_s{seed}_raw.png"
    out.write_bytes(urllib.request.urlopen(G.CONFIG["server"] + "/view?" + q, timeout=60).read())
    record = {"file": out.name, "page": page, "seed": seed, "denoise": denoise, "lora": E.LORA, "lora_weight": lora_w, "checkpoint": G.CONFIG["checkpoint"],
              "positive": prompt, "negative": NEGATIVE, "seconds": round(time.time() - t0, 1), "approval": "pending"}
    mp = STAGING / "manifest.json"
    rows = json.loads(mp.read_text(encoding="utf-8")) if mp.exists() else []
    mp.write_text(json.dumps([r for r in rows if r["file"] != out.name] + [record], indent=2), encoding="utf-8")
    print("painted", out.name, f"({record['seconds']} s)")
    return out


def ink(src: Path, w: int = 1232, h: int = 520) -> Path:
    """Comic-ink look: flatten the colours, push the saturation, draw black outlines, and add halftone dots in the shadows."""
    img = cv2.imdecode(np.fromfile(str(src), dtype=np.uint8), cv2.IMREAD_COLOR)
    ih, iw = img.shape[:2]
    scale = max(w / iw, h / ih)
    img = cv2.resize(img, (round(iw * scale), round(ih * scale)), interpolation=cv2.INTER_CUBIC)
    y0, x0 = (img.shape[0] - h) // 2, (img.shape[1] - w) // 2
    img = img[y0:y0 + h, x0:x0 + w]
    flat = cv2.pyrMeanShiftFiltering(img, sp=9, sr=22)
    hsv = cv2.cvtColor(flat, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.7 + 14, 0, 255)
    hsv[..., 2] = np.clip((hsv[..., 2] - 128) * 1.18 + 132, 0, 255)
    colour = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    gray = cv2.cvtColor(flat, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (0, 0), 1.4), 38, 96)
    edges = cv2.dilate(edges, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # halftone: dots whose size follows how dark the area is, on a grid turned 30 degrees
    dark = 1.0 - cv2.GaussianBlur(gray, (0, 0), 2.0).astype(np.float32) / 255.0
    dots = np.zeros((h, w), np.float32)
    step, c30, s30 = 8, np.cos(np.pi / 6), np.sin(np.pi / 6)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = (xx * c30 + yy * s30) / step, (-xx * s30 + yy * c30) / step
    du, dv = u - np.round(u), v - np.round(v)
    dist = np.sqrt(du * du + dv * dv)
    radius = np.clip((dark - 0.38) * 1.5, 0, 0.5)
    dots = (dist < radius).astype(np.float32)
    out = colour.astype(np.float32) * (1 - 0.55 * dots[..., None])
    out[edges > 0] = (22, 18, 15)
    dst = src.with_name(src.name.replace("_raw", "_ink"))
    cv2.imencode(".png", np.clip(out, 0, 255).astype(np.uint8))[1].tofile(str(dst))
    print("inked", dst.name)
    return dst


def approve(name: str) -> None:
    src = STAGING / name
    page = name.split("_")[0]
    PUBLIC.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, PUBLIC / f"{page}.png")
    mp = STAGING / "manifest.json"
    if mp.exists():
        rows = json.loads(mp.read_text(encoding="utf-8"))
        for r in rows:
            if r["file"] == name.replace("_ink", "_raw"):
                r["approval"] = "approved"
        mp.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("approved", name, "->", PUBLIC / f"{page}.png")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--page", choices=list(SCENES), nargs="*", default=list(SCENES))
    ap.add_argument("--seeds", type=int, nargs="*", default=[3])
    ap.add_argument("--denoise", type=float, default=0.68)
    ap.add_argument("--lora", type=float, default=0.55)
    ap.add_argument("--ink-only", action="store_true")
    ap.add_argument("--approve", metavar="FILE")
    a = ap.parse_args()
    STAGING.mkdir(parents=True, exist_ok=True)
    if a.approve:
        return approve(a.approve)
    if a.ink_only:
        for f in sorted(STAGING.glob("*_raw.png")):
            ink(f)
        return
    for page in a.page:
        for seed in a.seeds:
            ink(paint(page, seed, a.denoise, a.lora))


if __name__ == "__main__":
    main()
