"""One-image comic page: ComfyUI background in the style of img1, two ComfyUI-generated characters in the style of img2 and img3 (IP-Adapter), real text drawn by this script.
Output: frontend/art-staging/page-test/page_single.png (staging only; nothing is wired into the game)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import page_assemble as A

D = A.D
S = D / "style_test"
W, H = 1536, 1024


def cut(path: Path, thresh: int = 34) -> Image.Image:
    return A.cutout(path) if thresh == 38 else _cut(path, thresh)


def _cut(path: Path, thresh: int) -> Image.Image:
    im = Image.open(path).convert("RGB"); w, h = im.size
    marker = (255, 0, 255); work = im.copy()
    for seed in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3), (2, h // 2), (w - 3, h // 2), (w // 2, 2)]:
        if work.getpixel(seed) != marker:
            ImageDraw.floodfill(work, seed, marker, thresh=thresh)
    mask = Image.new("L", im.size, 255); pw, pm = work.load(), None
    pm = mask.load()
    for y in range(h):
        for x in range(w):
            if pw[x, y] == marker: pm[x, y] = 0
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    out = im.convert("RGBA"); out.putalpha(mask)
    return out.crop(out.getbbox())


def place(base: Image.Image, ch: Image.Image, cx: int, feet: int, height: int) -> None:
    w = int(ch.width * height / ch.height)
    c = ch.resize((w, height), Image.LANCZOS)
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((cx - w // 2, feet - 14, cx + w // 2, feet + 22), fill=(8, 10, 20, 120))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    base.alpha_composite(c, (cx - w // 2, feet - height))


def main() -> None:
    bg = Image.open(D / "BG_img1style_d62_s31.png").convert("RGBA").resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(bg)
    # the wall screen of the plate shows the red system alert (real text from this script)
    x0, y0, x1, y1 = 477, 325, 891, 571
    d.rectangle((x0, y0, x1, y1), fill=(120, 24, 28)); d.rectangle((x0, y0, x1, y1), outline=(25, 25, 38), width=6)
    d.text(((x0 + x1) // 2, y0 + 80), "SYSTEMS OFFLINE", font=A.font("arialbd.ttf", 38), fill=(255, 226, 218), anchor="mm")
    d.text(((x0 + x1) // 2, y0 + 130), "Cause unknown", font=A.font("arial.ttf", 28), fill=(255, 190, 176), anchor="mm")
    d.rectangle((x0 + 50, y0 + 170, x1 - 50, y0 + 184), fill=(210, 70, 66))
    # a soft dark grade so the plate sits as night
    bg = Image.blend(bg, Image.new("RGBA", bg.size, (14, 18, 36, 255)), 0.18)
    worried = _cut(S / "img3_w6_s302.png", 22)
    shocked = _cut(S / "img2pad_s332.png", 22)
    place(bg, worried, 330, 990, 720)
    place(bg, shocked, 1150, 990, 770)
    A.narration(bg, "Tuesday 27 June 2017. Across the company, screens begin to go dark, one after another.", (40, 40), 500, 27)
    A.bubble(bg, "It isn't one machine. It's spreading from one to the next!", "IT Lead", (700, 36), 400, 28, tail=(1135, 300))
    d = ImageDraw.Draw(bg)
    d.rectangle((0, 0, W - 1, H - 1), outline=(20, 20, 32), width=10)
    A.tag(bg, "RECONSTRUCTED SCENE", "R")
    d.text((40, H - 46), "BLACKOUT: THE NOTPETYA INCIDENT   ·   ROUND 1   ·   THE SCREENS GO DARK   ·   DAY 1, 27 JUN", font=A.font("arialbd.ttf", 18), fill=(235, 238, 248))
    out = D / "page_single.png"
    bg.convert("RGB").save(out); print("saved", out, bg.size)


if __name__ == "__main__":
    main()
