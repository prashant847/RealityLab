"""Assemble the single test page (round 1) from ComfyUI outputs: backgrounds/objects (layout img2img), the IT Lead cut out from the v3 character pipeline, and
real text (narration and speech) drawn by this script, never by the image model. Output: frontend/art-staging/page-test/page_round1.png (staging only)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "frontend" / "art-staging" / "page-test"
E = ROOT / "frontend" / "art-staging" / "environments"
F = "C:/Windows/Fonts/"
font = lambda n, s: ImageFont.truetype(F + n, s)
INK = (29, 28, 43)


def cutout(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    marker = (255, 0, 255)
    w, h = im.size
    work = im.copy()
    for seed in [(2, 2), (w - 3, 2), (2, h // 2), (w - 3, h // 2), (w // 2, 2)]:
        if work.getpixel(seed) != marker:
            ImageDraw.floodfill(work, seed, marker, thresh=38)
    mask = Image.new("L", im.size, 255)
    px_w, px_m = work.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px_w[x, y] == marker:
                px_m[x, y] = 0
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA"); out.putalpha(mask)
    return out


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    r = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * r + 0.5), int(im.height * r + 0.5)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def wrap(d: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = word
    return lines + [cur]


def narration(img: Image.Image, text: str, xy=(24, 20), width=520, size=24) -> None:
    d = ImageDraw.Draw(img); f = font("arialbd.ttf", size)
    lines = wrap(d, text, f, width); h = len(lines) * (size + 6) + 22
    x, y = xy
    d.rectangle((x + 4, y + 4, x + width + 32, y + h + 4), fill=(0, 0, 0, 120))
    d.rectangle((x, y, x + width + 28, y + h), fill=(233, 214, 174), outline=INK, width=3)
    for i, l in enumerate(lines): d.text((x + 14, y + 11 + i * (size + 6)), l, font=f, fill=(26, 20, 8))


def bubble(img: Image.Image, text: str, who: str, xy, width=440, size=24, tail=(0, 0)) -> None:
    d = ImageDraw.Draw(img); f = font("arial.ttf", size); fn = font("arialbd.ttf", 14)
    lines = wrap(d, text, f, width); h = len(lines) * (size + 6) + 44
    x, y = xy
    d.rounded_rectangle((x + 4, y + 4, x + width + 36, y + h + 4), 22, fill=(0, 0, 0, 110))
    d.polygon([(x + 40, y + h - 2), (tail[0], tail[1]), (x + 90, y + h - 2)], fill=(238, 242, 247), outline=INK)
    d.rounded_rectangle((x, y, x + width + 32, y + h), 22, fill=(238, 242, 247), outline=INK, width=3)
    d.rectangle((x + 36, y + h - 5, x + 94, y + h + 1), fill=(238, 242, 247))
    d.text((x + 18, y + 10), who.upper(), font=fn, fill=(70, 80, 110))
    for i, l in enumerate(lines): d.text((x + 18, y + 32 + i * (size + 6)), l, font=f, fill=(11, 18, 32))


def tag(img: Image.Image, text: str, kind: str) -> None:
    d = ImageDraw.Draw(img); f = font("arialbd.ttf", 15)
    w = int(d.textlength(text, font=f)) + 20
    x, y = img.width - w - 12, img.height - 34
    d.rectangle((x, y, x + w, y + 24), fill={"R": (207, 214, 232), "D": (191, 227, 194)}[kind], outline=INK, width=2)
    d.text((x + 10, y + 4), text, font=f, fill=INK)


def panel(path: Path, w: int, h: int) -> Image.Image:
    return fit(Image.open(path).convert("RGB"), w, h).convert("RGBA")


def main() -> None:
    W, M = 1440, 30
    CW = W - 2 * M
    p1 = panel(D / "P1_wide_monitors_s11.png", CW, 575)
    narration(p1, "Tuesday 27 June 2017. Across the company, screens begin to go dark, one after another.", (28, 24), 640, 26); tag(p1, "RECONSTRUCTED SCENE", "R")

    p2 = panel(D / "P2_ransom_screen_s12.png", 810, 435)
    d2 = ImageDraw.Draw(p2)
    d2.text((405, 150), "YOUR FILES ARE LOCKED", font=font("arialbd.ttf", 38), fill=(255, 224, 216), anchor="mm")
    d2.text((405, 196), "Pay to get them back.", font=font("arial.ttf", 24), fill=(255, 194, 180), anchor="mm")
    narration(p2, "On some, a red message demands payment. It looks like ransomware.", (20, 16), 420, 22)
    d2.rectangle((205, 392, 605, 420), fill=(242, 194, 48), outline=INK, width=2)
    d2.text((405, 406), "RECONSTRUCTED MESSAGE (PLACEHOLDER TEXT)", font=font("arialbd.ttf", 14), fill=INK, anchor="mm")

    # P3: IT Lead (v3 pipeline, cut out) in front of a ComfyUI office plate
    bg3 = fit(Image.open(E / "warehouse_floor" / "warehouse_floor_layout_s5.png").convert("RGB"), 640, 512).convert("RGBA")
    bg3 = Image.blend(bg3, Image.new("RGBA", bg3.size, (30, 34, 58, 255)), 0.25)
    bg3.alpha_composite(cutout(D / "C3_plain_s701.png"))
    p3 = bg3.resize((560, 448), Image.LANCZOS).crop((0, 6, 560, 441)).convert("RGBA")
    bubble(p3, "This isn't one machine. It's spreading from one to the next.", "IT Lead", (16, 14), 300, 21, tail=(255, 118))

    # P4: IT Lead speaking, server-room plate
    bg4 = fit(Image.open(E / "control_room" / "control_room_layout_b_s6.png").convert("RGB"), 768, 416).convert("RGBA")
    bg4 = Image.blend(bg4, Image.new("RGBA", bg4.size, (30, 34, 58, 255)), 0.2)
    bg4.alpha_composite(cutout(D / "C4_plain_s802.png"))
    p4 = fit(bg4.convert("RGB"), CW, 575).convert("RGBA")
    bubble(p4, "I can't tell you what this is yet. Only that it isn't routine.", "IT Lead", (60, 70), 520, 30, tail=(930, 230))
    tag(p4, "RECONSTRUCTED DIALOGUE", "R")

    H = 150 + 575 + 435 + 575 + 4 * 12 + 60
    page = Image.new("RGB", (W, H), (11, 14, 24)); d = ImageDraw.Draw(page)
    d.text((M, 22), "BLACKOUT: THE NOTPETYA INCIDENT", font=font("arialbd.ttf", 22), fill=(242, 169, 59))
    d.text((M, 54), "THE SCREENS GO DARK", font=font("arialbd.ttf", 54), fill=(233, 238, 248))
    d.text((M, 118), "Round 1 of 10  ·  Day 1  ·  27 Jun   |   Test page: backgrounds and IT Lead generated with ComfyUI; text drawn by the page layer", font=font("arial.ttf", 17), fill=(150, 160, 185))
    y = 150
    page.paste(p1.convert("RGB"), (M, y)); y += 575 + 12
    page.paste(p2.convert("RGB"), (M, y)); page.paste(p3.convert("RGB"), (M + 810 + 10, y)); y += 435 + 12
    page.paste(p4.convert("RGB"), (M, y))
    page.save(D / "page_round1.png")
    print("saved", D / "page_round1.png", page.size)


if __name__ == "__main__":
    main()
