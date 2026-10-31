# COVID Hospital, Round 1: the illustrated opening

Five illustrated pages open Round 1 ("The first surge") before the unchanged decision screen. The pictures are static files in `frontend/public/comic/round1/p1.jpg`
to `p5.jpg` (1344x768, about 170 KB each). **ComfyUI is never needed when the app runs.** All words (narration, Dr. Hakim's speech bubble, the question) are drawn
by the app on top of the pictures; none are inside the images. If any picture is missing, the app uses the earlier drawn stickman comic instead.

Words, from the round itself: Day 3 07:30 / overnight admissions doubled; 31 waiting, a mix of mild and severe breathing difficulty; patients arriving faster than the
team can assess them; guidance still changing, team anxious and partly new; Dr. Farid Hakim's line and the round's question. No treatment advice or extra events.

## How the pictures were made (offline, in staging)

- **Workflow:** Manga Studio (MIT, ahmet360/manga-studio) script + workflow builder, run as a dry run to write ComfyUI workflows; the workflows were submitted to the local
  ComfyUI by `tools/comfy/round1/r1_generate.py` (own code). The script is `tools/comfy/round1/round1_script.txt`.
- **Checkpoint:** DreamShaper XL Turbo v2 **SFW** (`DreamShaperXL_Turbo_V2-SFW.safetensors`, Lykon, OpenRAIL++, 6.94 GB, SHA-256 `6e718af0...cc94fc`).
- **Character consistency:** IP-Adapter Plus Face SDXL ViT-H (h94/IP-Adapter, Apache-2.0, 848 MB, SHA-256 `677ad886...a292c1`) with the already installed CLIP-ViT-H image
  encoder, weight 0.55, from one reference portrait per character (Duty Medical Lead, Dr. Hakim, the newer nurse). Solo face panels only (pages 3, 4, 5).
- **Sampling:** 8 steps, CFG 2.0, dpmpp_sde / karras, 1344x768, no hires fix (low VRAM). Style: western graphic-novel illustration, realistic proportions.
- **Hardware:** RTX 3050 6 GB. About 22 s per 1344x768 panel (first run about 64 s including model load); peak VRAM about 4.4 GB; 43 images generated to choose the final five.
- **Licences:** model terms are OpenRAIL++ (use restrictions apply) and Apache-2.0; Manga Studio is MIT. The people are fictional.

## Reproducing or redoing a panel

1. `powershell -File scripts\comfyui.ps1` (needs the two models above in `D:\ComfyUI\models`).
2. Run Manga Studio's `generate.py round1_script.txt --dry-run` in a work copy configured for the checkpoint (see `r1_generate.py` for the expected paths).
3. `python r1_generate.py refs --seeds 1 2 3 4`, choose the portraits, then `python r1_generate.py panels --seeds 11 12 13 --ref lead=... --ref hakim=... --ref nurse=...`.
4. Convert the chosen PNGs to JPEG and replace `p1.jpg` ... `p5.jpg`.
