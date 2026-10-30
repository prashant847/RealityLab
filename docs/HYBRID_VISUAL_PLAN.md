# Hybrid visual pipeline: Stage 1 audit and plan

Checkpoint before this work: tag `checkpoint-hybrid-stage1-2026-10-30`, branch `checkpoint/hybrid-stage1-2026-10-30`, on `feature/notpetya-maersk` (commit `f45f8a0`).
Stages 1 and 2 changed no application code, no production asset, and nothing in the backend.

## What exists today

**Rendering path.** A story panel becomes an `ArtPanelScript` with ordered `layers` (`frontend/src/story/compose.ts`). `ArtImage` draws each layer:
`flatenv` (an environment, a story shot or the evidence board, all vector SVG from `comic/notpetya/Env.tsx` and `Shots.tsx`), then `person` layers (`Cast.tsx`).
Narration and speech bubbles are HTML overlays above the picture, so they are never baked into artwork. `story/panels.ts` names the picture for each of the 27 story panels,
and `compose.ts` maps decisions and events to pictures. The game never talks to ComfyUI.

**Characters** (`comic/notpetya/Cast.tsx`): six recurring roles keyed to the unchanged backend ids (`arjun` IT Lead, `kavya` Terminal Supervisor, `nisha` Operations Manager,
`isha` Customer Representative, `raghav` Network Administrator, `director` Recovery Team Lead) plus four generic staff looks. One dark outline, flat fills, 10 expressions
(neutral, tired, concern, shock, suspicion, frustration, concentration, confusion, determination, relief), 6 poses (idle, point, clipboard, hand_chin, arms_crossed, phone).

**Environments:** 9 vector rooms keyed to the backend environment ids, 25 props, 5 effect overlays, 14 story "shots" (objects) with decision variants.
The older `public/assets/environments/*.svg`, `characters/*.svg` and `public/assets/art` belong to earlier designs and are only used by non-flat fallback paths and tests; I will not remove them.

**Gaps against the brief**
- Expressions: no *speaking* face (open mouth, neutral brows). The others exist; eyebrows, eyes and head tilt already vary, and I will review each for how distinct it reads.
- Poses missing: sitting, walking, working at a computer, listening, reacting to an incident.
- Environments are plain vector blocks with little detail, no lighting cones and no depth cues.

## Visual needs of the ten rounds (from `panels.ts`)
1 office, then server room. 2 terminal quay, with a crane close-up and a paper manifest. 3 terminal gate, access road and a route map. 4 terminal gate (yard) and a records comparison.
5 operations centre and a whiteboard. 6 server room, a supply-chain diagram and a wiped disk. 7 customer floor and a priority diagram. 8 recovery room and a survivor map.
9 communications room, a news screen and the customer floor. 10 terminal gate opening. Every readable message, sign, label and number stays vector (never AI text).

## Stage 2 result (this stage): environment plates
Tools: `tools/comfy/environments.py`, `layouts` rendered from the existing vector rooms. Output only in `frontend/art-staging/environments/` and `previews/`, each plate with prompt, seed, model, LoRA, denoise and `approval: pending` in `manifest.json`.

Methods compared on two rooms (`previews/method_compare.png`):
- Marketing Flat LoRA, text only: flat and on-style, but it ignores the room type (the "server room" became a kitchenette).
- Style reference img2img: odd 3D-like geometry.
- Plain SD 1.5: photographic, off-style.
- **Layout method (chosen):** img2img from the vector room render with the Marketing Flat LoRA (weight 0.8, trigger `flat illustration` only), denoise 0.65, plus a 1.5x latent upscale to 1152x648.
  The vector layout keeps the content correct, and ComfyUI adds detail and finish.

## Proposed integration design (Stage 4, after approval)
- Approved plates are converted to WebP (about 100 to 200 KB each) in `frontend/public/assets/environments/plates/<env>.webp`.
- `NpEnv` draws the plate as an `<image>` underneath, with the existing vector room as the automatic fallback if a plate is missing. Props, effects, characters, shots and text stay vector layers on top.
- Add a soft shared shadow under each character and a gentle colour grade on the characters so they sit in the plate; narration and speech remain HTML.
- Nothing is fetched from ComfyUI at runtime.
