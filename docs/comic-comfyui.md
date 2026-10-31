# Comic backdrops with local ComfyUI

How the hospital's first comic ("The first surge") gets its pictures. Everything is local: no cloud, no keys, and the game never needs ComfyUI at run time
(it only ships the finished PNGs).

**Split:** each page is a *backdrop* (the setting, painted by ComfyUI) plus a *cast* (the vector stickmen, signs, clock and live text, drawn by the app). People are
never generated, so the characters stay the same on every page.

## Steps

1. Start ComfyUI: `powershell -File scripts\comfyui.ps1` (needs `D:\ComfyUI`, SD 1.5 and the MarketingFlat LoRA).
2. Layout guides: build the app, open `#/comic-layout/<page>` (morning, waiting, huddle, question) and screenshot the `#layout` element at 1232x520 into
   `frontend/art-staging/first-surge/layout_<page>.png`. These are the page backdrops drawn in code; the painted version follows their composition.
3. Paint and ink: `python tools/comfy/comic_first_surge.py --page waiting --seeds 11 12 13 --denoise 0.58 --lora 0.6`
   (the ink filter adds flat colour, black outlines and halftone dots; `--ink-only` re-runs it on existing raw pictures).
4. Look at `frontend/art-staging/first-surge/<page>_s<seed>_ink.png`, then approve one:
   `python tools/comfy/comic_first_surge.py --approve waiting_s12_ink.png` copies it to `frontend/public/comic/first-surge/waiting.png`.
5. The app uses any picture it finds there under the stickmen and live text; a page with no picture shows the drawn backdrop.

`frontend/art-staging` is working space and is never committed. Prompts, seeds and settings are recorded in its `manifest.json`.

## Tips
- Richer layout guides give richer pictures: a bare room paints as a bare room. Doors, posters, rails and floor tiles in the layout come through.
- Lower `--denoise` (0.5) stays closer to the layout; higher (0.68) invents more. Interiors work best around 0.58, the outdoor page around 0.68.
- Pictures must contain no lettering: the app draws all text itself.
