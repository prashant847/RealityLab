"""Cel/ink post-process for a Blender character render: flattens shading into a few tone bands, keeps hue, adds inked
edges and a little paper grain. Pure image processing of the render; nothing is drawn. Usage: stylize.py in.png out.png"""
import sys

import numpy as np
from PIL import Image, ImageFilter

src = Image.open(sys.argv[1]).convert("RGBA")
alpha = np.array(src.getchannel("A"), dtype=np.float32) / 255
rgb = src.convert("RGB").filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
a = np.array(rgb, dtype=np.float32) / 255
lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

bands = np.array([0.10, 0.26, 0.46, 0.68, 0.9], dtype=np.float32)
idx = np.clip(np.digitize(lum, [0.18, 0.36, 0.56, 0.78]), 0, 4)
target = bands[idx]
out = np.clip(a * (target / np.maximum(lum, 0.03))[..., None], 0, 1)

gy, gx = np.gradient(lum)
edge = np.hypot(gx, gy)
ea = np.gradient(alpha)
edge = np.maximum(edge * 6, np.hypot(*ea) * 3)
mask = (edge > 0.2).astype(np.uint8) * 255
mask = Image.fromarray(mask).filter(ImageFilter.MaxFilter(3))
m = np.array(mask, dtype=np.float32)[..., None] / 255
out = out * (1 - 0.85 * m) + np.array([0.02, 0.02, 0.03], dtype=np.float32) * 0.85 * m

# hatch in the darkest band
yy, xx = np.mgrid[0:out.shape[0], 0:out.shape[1]]
hatch = (((xx + yy) % 9) < 2) & (idx == 0)
out[hatch] *= 0.6
rng = np.random.default_rng(3)
out = np.clip(out + rng.normal(0, 0.015, out.shape[:2])[..., None], 0, 1)

res = Image.fromarray((out * 255).astype(np.uint8)).convert("RGBA")
res.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
res.save(sys.argv[2])
