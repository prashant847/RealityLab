"""Background/object panels for the page test: img2img from a vector layout render, Marketing Flat LoRA ("flat illustration"), two passes. Staging only."""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import environments as E
G = E.G
OUT = G.ROOT / "frontend" / "art-staging" / "page-test"

def run(name: str, layout: str, scene: str, w: int, h: int, seed: int, denoise: float) -> None:
    G.check()
    prompt = ", ".join(["flat illustration, " + scene, E.STYLE])
    ref = G.upload(OUT / layout)
    t0 = time.time()
    pid = G.call("/prompt", {"prompt": E.workflow(prompt, seed, "layout", ref, 0.8, True, w, h, denoise)})["prompt_id"]
    while True:
        hh = G.call(f"/history/{pid}")
        if pid in hh and hh[pid].get("outputs"): break
        if pid in hh and hh[pid].get("status", {}).get("status_str") == "error": sys.exit(json.dumps(hh[pid]["status"])[:800])
        time.sleep(1)
    img = next(i for n in hh[pid]["outputs"].values() for i in n.get("images", []))
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    f = OUT / f"{name}_s{seed}.png"; f.write_bytes(urllib.request.urlopen(G.CONFIG["server"] + "/view?" + q, timeout=60).read())
    rp = OUT / "records.json"; rows = json.loads(rp.read_text(encoding="utf-8")) if rp.exists() else []
    rows.append({"file": f.name, "kind": "background/object (layout img2img)", "init": layout, "checkpoint": G.CONFIG["checkpoint"], "lora": E.LORA, "lora_weight": 0.8, "denoise": denoise,
                 "seed": seed, "draft": [w, h], "hires": 1.5, "positive": prompt, "negative": E.NEGATIVE, "seconds": round(time.time() - t0, 1), "approval": "pending"})
    rp.write_text(json.dumps(rows, indent=2), encoding="utf-8"); print("saved", f.name)

if __name__ == "__main__":
    P1 = "wide dark open-plan office at night, a long grey desk with several computer monitors: the left monitor glowing blue, the next one dim, the next one black, and one small monitor with a red warning screen, tall windows with distant city lights, soft cones of light"
    P2 = "close view of one large computer monitor filling the frame, the screen is solid dark red with pale horizontal bars, thick dark bezel, desk surface below, dark background"
    for s in (11, 12):
        run("P1_wide_monitors", "layout_P1.png", P1, 768, 320, s, 0.6)
        run("P2_ransom_screen", "layout_P2.png", P2, 768, 416, s, 0.55)
