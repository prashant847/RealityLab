"""Slice ElevenLabs-generated 4x2 character sheets into transparent sprites.

Input : art-staging/stickcast/sheet_<who>.jpg  (4 columns x 2 rows, plain light-grey background)
Output: public/assets/stick/<who>_<pose>.webp        full-body, feet anchored bottom-centre
        public/assets/stick/<who>_<pose>_bust.webp   head and shoulders
        public/assets/stick/sprites.json             sizes + anchors

Usage: python tools/slice_sprites.py [who ...]
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art-staging" / "stickcast"
OUT = ROOT / "public" / "assets" / "stick"
POSES = ["calm", "speaking", "pointing", "angry", "worried", "exhausted", "surprised", "determined"]
WHO = ["arjun", "kavya", "nisha", "raghav", "isha", "director", "worker", "worker_b", "worker_c", "worker_d"]
CALM_H = 600            # height of the calm pose on the canvas, in px
CANVAS = (600, 650)     # width, height
BUST = (380, 400)


def foreground_mask(img):
    """255 where the figure is. Background is flood-filled inward from the sheet border."""
    h, w = img.shape[:2]
    blur = cv2.GaussianBlur(img, (0, 0), 1.2)
    bg = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, 8):
        for y in (0, h - 1):
            cv2.floodFill(blur.copy(), bg, (x, y), 0, (9, 9, 9), (9, 9, 9), cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    for y in range(0, h, 8):
        for x in (0, w - 1):
            cv2.floodFill(blur.copy(), bg, (x, y), 0, (9, 9, 9), (9, 9, 9), cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    fg = 255 - bg[1:-1, 1:-1]
    # drop specks and fill pinholes
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return fg


def ink_mask(img_rgb):
    """The figure is whatever the black outline encloses. 'Background' = light, unsaturated pixels reachable from the sheet border
    without crossing ink; the ink is closed first so tiny gaps in the line cannot leak. Cleaner than a generic matting alpha, which keeps
    grey ghosts of the sheet background next to the outline."""
    h, w = img_rgb.shape[:2]
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    sat, val = hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    bglike = (sat < 38) & (val > 150)
    solid = (~bglike).astype(np.uint8) * 255
    solid = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    free = (solid == 0).astype(np.uint8)
    n, lab = cv2.connectedComponents(free, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    border.discard(0)
    outside = np.isin(lab, list(border))
    fg = (~outside).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # drop pieces with no black line in them (pale ghosts of the sheet background); hands, hair and clothes all carry ink
    dark = (val < 85).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats((cv2.dilate(fg, np.ones((5, 5), np.uint8)) > 0).astype(np.uint8))
    for i in range(1, n2):
        comp = (lab2 == i) & (fg > 0)
        if comp.sum() and dark[comp].mean() < 0.045:
            fg[comp] = 0
    return fg


def cell_figures(fg, cols=4, rows=2):
    """One mask per grid cell: the largest connected piece of the figure (hands and arms are joined to it), plus any piece at least 8%
    of its size. Small detached marks that the generator likes to add (motion arcs, sweat, sparkles) are left out."""
    h, w = fg.shape
    n, lab, stats, cent = cv2.connectedComponentsWithStats((fg > 0).astype(np.uint8), connectivity=8)
    cells = {}
    for i in range(1, n):
        area = stats[i][4]
        if area < 400:
            continue
        cx, cy = cent[i]
        c = int(cx / (w / cols)) + cols * int(cy / (h / rows))
        cells.setdefault(c, []).append((area, i))
    out = []
    for c in range(cols * rows):
        comps = sorted(cells.get(c, []), reverse=True)
        if not comps:
            out.append(None); continue
        big = comps[0][0]
        out.append(np.isin(lab, [i for a, i in comps if a >= 0.08 * big]))
    return out


def sprite_from(img, mask):
    ys, xs = np.where(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    m = (mask.astype(np.uint8) * 255)
    # pull the edge in by a pixel, then colour the rim like the ink so no pale halo survives the soft edge
    core = cv2.erode(m, np.ones((3, 3), np.uint8))
    inner = cv2.erode(core, np.ones((5, 5), np.uint8))
    rim = (core > 0) & (inner == 0)
    rgb = img.copy()
    rgb[rim] = (rgb[rim] * 0.35 + np.array([22, 20, 28]) * 0.65).astype(np.uint8)
    a = cv2.GaussianBlur(core, (0, 0), 0.7)
    rgba = np.dstack([rgb, a])
    return rgba[y0:y1, x0:x1], (x0, x1, y0, y1)


def fit(sprite, scale, canvas, foot_x):
    h, w = sprite.shape[:2]
    s = cv2.resize(sprite, (max(1, round(w * scale)), max(1, round(h * scale))), interpolation=cv2.INTER_AREA)
    cw, ch = canvas
    out = np.zeros((ch, cw, 4), np.uint8)
    fx = round(foot_x * scale)
    x = cw // 2 - fx
    y = ch - 14 - s.shape[0]
    sx0, dx0 = max(0, -x), max(0, x)
    sw = min(s.shape[1] - sx0, cw - dx0)
    sy0, dy0 = max(0, -y), max(0, y)
    sh = min(s.shape[0] - sy0, ch - dy0)
    out[dy0:dy0 + sh, dx0:dx0 + sw] = s[sy0:sy0 + sh, sx0:sx0 + sw]
    return out


def save(rgba, path):
    bgra = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA)
    cv2.imwrite(str(path), bgra, [cv2.IMWRITE_WEBP_QUALITY, 92])


def main(who_list):
    OUT.mkdir(parents=True, exist_ok=True)
    meta_path = OUT / "sprites.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    for who in who_list:
        sheet = SRC / f"sheet_{who}.jpg"
        if sheet.exists():
            img = cv2.cvtColor(cv2.imread(str(sheet)), cv2.COLOR_BGR2RGB)
        else:   # only the matting result was kept: put it back on the sheet's light grey
            c4 = cv2.cvtColor(cv2.imread(str(SRC / f"cut_{who}.png"), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA)
            al = c4[:, :, 3:4].astype(np.float32) / 255
            img = (c4[:, :, :3] * al + np.array([206, 210, 216]) * (1 - al)).astype(np.uint8)
        fg = ink_mask(img)
        cut = SRC / f"cut_{who}.png"          # the generic matting result is only used to drop stray specks the ink test kept
        if cut.exists():
            a0 = cv2.imread(str(cut), cv2.IMREAD_UNCHANGED)[:, :, 3]
            fg = fg & (cv2.dilate((a0 > 20).astype(np.uint8) * 255, np.ones((5, 5), np.uint8)))
        masks = cell_figures(fg)
        sprites = []
        for m in masks:
            sprites.append(None if m is None else sprite_from(img, m))
        if sprites[0] is None:
            print(who, "calm missing"); continue
        scale = CALM_H / sprites[0][0].shape[0]
        meta[who] = {"canvas": CANVAS, "bust": BUST, "poses": POSES}
        for pose, sp in zip(POSES, sprites):
            if sp is None:
                print(who, pose, "MISSING"); continue
            rgba, (x0, x1, y0, y1) = sp
            h, w = rgba.shape[:2]
            # feet: horizontal centre of the lowest 6% of the figure
            band = rgba[int(h * 0.94):, :, 3] > 128
            xs = np.where(band.any(axis=0))[0]
            foot_x = (xs.min() + xs.max()) / 2 if len(xs) else w / 2
            save(fit(rgba, scale, CANVAS, foot_x), OUT / f"{who}_{pose}.webp")
            # bust: head and shoulders = top 40% of this figure, centred on the head
            top = rgba[: int(h * 0.34)]
            head = rgba[: int(h * 0.16), :, 3] > 128
            hx = np.where(head.any(axis=0))[0]
            head_x = (hx.min() + hx.max()) / 2 if len(hx) else w / 2
            bw, bh = BUST
            bscale = bw / (w * 0 + (top.shape[0] * 0.95))  # head+shoulders height maps onto the bust canvas
            bscale = min(bscale, (bh - 20) / top.shape[0])
            bust = np.zeros((bh, bw, 4), np.uint8)
            t = cv2.resize(top, (max(1, round(top.shape[1] * bscale)), max(1, round(top.shape[0] * bscale))), interpolation=cv2.INTER_AREA)
            ox = bw // 2 - round(head_x * bscale)
            sx0, dx0 = max(0, -ox), max(0, ox)
            sw = min(t.shape[1] - sx0, bw - dx0)
            bust[10:10 + t.shape[0], dx0:dx0 + sw] = t[:, sx0:sx0 + sw][: bh - 10]
            save(bust, OUT / f"{who}_{pose}_bust.webp")
        print(who, "ok", scale)
    meta_path.write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main(sys.argv[1:] or WHO)
