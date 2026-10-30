"""Copy ONE approved staged background into the production asset folder (frontend/public/assets/generated/<environment>.png).

  python tools/comfy/approve.py frontend/art-staging/control_room/control_room_s123.png

The game does not use anything in that folder until a panel is pointed at it, and the vector backgrounds remain as fallbacks.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "config.json").read_text(encoding="utf-8"))
if len(sys.argv) != 2:
    sys.exit(__doc__)
src = (ROOT / sys.argv[1]).resolve()
if not src.is_file() or (ROOT / CONFIG["staging_dir"]).resolve() not in src.parents:
    sys.exit("Give a file inside the staging folder.")
env = src.parent.name
dest = ROOT / CONFIG["production_dir"] / f"{env}.png"
dest.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(src, dest)
log = ROOT / CONFIG["staging_dir"] / "manifest.json"
rows = json.loads(log.read_text(encoding="utf-8"))
for r in rows:
    if (ROOT / r["file"]).resolve() == src:
        r["approved"] = True
log.write_text(json.dumps(rows, indent=2), encoding="utf-8")
print("approved ->", dest)
