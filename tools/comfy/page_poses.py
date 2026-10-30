"""OpenPose skeletons for the page test: P3 (640x512, medium close-up) and P4 (768x416, speaker on the right)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import character_test_v2 as C

OUT = C.G.ROOT / "frontend" / "art-staging" / "page-test"


def pts(cx, nose_y, neck_y, sh_dx, sh_y, elbows):
    return {0: (cx, nose_y), 1: (cx, neck_y), 2: (cx - sh_dx, sh_y), 5: (cx + sh_dx, sh_y), 3: elbows[0], 6: elbows[1],
            14: (cx - 26, nose_y - 18), 15: (cx + 26, nose_y - 18), 16: (cx - 58, nose_y - 2), 17: (cx + 58, nose_y - 2)}


for name, ((w, h), p) in {
    "pose_P3": ((640, 512), pts(320, 215, 345, 150, 372, ((140, 505), (500, 505)))),
    "pose_P4": ((768, 416), pts(560, 150, 245, 120, 268, ((425, 400), (695, 400)))),
}.items():
    C.W, C.H = w, h
    C.draw_pose(p).save(OUT / f"{name}.png")
print("poses saved")
