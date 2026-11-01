"""Slice the narrator and Archivist sheets (ElevenLabs images) into transparent sprites with the same outline-following cutout as slice_sprites.py.

  python tools/slice_story_sheets.py narrator   -> public/assets/narrator/narrator_{idle,talk,sigh,mug}.webp          (4 x 1 sheet)
  python tools/slice_story_sheets.py archivist  -> public/assets/archivist/archivist_{mood}_{closed,open}.webp       (4 x 2 sheet: closed mouths, then open)

Inputs are art-staging/stickcast/sheet_<name>.jpg (and, optionally, cut_<name>.png from the background-removal model, used only to drop stray specks).
"""
import importlib.util
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ss", ROOT / "tools" / "slice_sprites.py")
ss = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ss)

JOBS = {
    "narrator": dict(cols=4, rows=1, names=["idle", "talk", "sigh", "mug"], out="narrator", prefix="narrator_{n}", height=640, canvas=(520, 680)),
    "archivist": dict(cols=4, rows=2, names=[f"{m}_{o}" for o in ("closed", "open") for m in ("calm", "warm", "pointed", "grave")], out="archivist", prefix="archivist_{n}", height=880, canvas=(760, 920)),
}


def main(which: str) -> None:
    job = JOBS[which]
    src = ss.SRC
    img = cv2.cvtColor(cv2.imread(str(src / f"sheet_{which}.jpg")), cv2.COLOR_BGR2RGB)
    fg = ss.ink_mask(img)
    cut = src / f"cut_{which}.png"
    if cut.exists():
        a0 = cv2.imread(str(cut), cv2.IMREAD_UNCHANGED)[:, :, 3]
        fg = fg & cv2.dilate((a0 > 20).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    masks = ss.cell_figures(fg, job["cols"], job["rows"])
    sprites = [None if m is None else ss.sprite_from(img, m) for m in masks]
    tallest = max(sp[0].shape[0] for sp in sprites if sp is not None)
    scale = job["height"] / tallest                                    # one scale for every pose, so he never changes size
    out = ROOT / "public" / "assets" / job["out"]
    out.mkdir(parents=True, exist_ok=True)
    for name, sp in zip(job["names"], sprites):
        if sp is None:
            print(name, "MISSING")
            continue
        rgba = sp[0]
        h, w = rgba.shape[:2]
        band = rgba[int(h * 0.94):, :, 3] > 128
        xs = np.where(band.any(axis=0))[0]
        foot_x = (xs.min() + xs.max()) / 2 if len(xs) else w / 2
        ss.save(ss.fit(rgba, scale, job["canvas"], foot_x), out / (job["prefix"].format(n=name) + ".webp"))
        print(name, rgba.shape[:2])


if __name__ == "__main__":
    main(sys.argv[1])
