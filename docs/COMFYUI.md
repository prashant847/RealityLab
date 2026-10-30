# Local background generation with ComfyUI

Comic **backgrounds** (and, if needed, evidence or object close-ups) can be generated locally with [ComfyUI](https://github.com/comfyanonymous/ComfyUI).
It is free, runs on this machine only, and needs no API key, subscription or credits. LlamaGen was never connected to this project and there is no
LlamaGen code, configuration or documentation in it.

**Scope.** Backgrounds only. The six vector characters (`arjun`, `kavya`, `nisha`, `isha`, `raghav` and the director) are never generated or replaced.
The game does not depend on ComfyUI: it keeps working with the vector backgrounds whether ComfyUI is running or not, and nothing is swapped
automatically.

## Setup (already done on this machine)

- ComfyUI lives in `D:\ComfyUI` with its own Python venv (PyTorch CUDA 12.1). It was installed on `D:` because `C:` has very little free space.
- Checkpoint: `D:\ComfyUI\models\checkpoints\v1-5-pruned-emaonly.safetensors` (Stable Diffusion 1.5, about 4 GB). It is the lightest widely compatible model and
  fits the RTX 3050 6 GB. SDXL-class models are too heavy for 6 GB.
- Settings are in `tools/comfy/config.json` (server address, checkpoint, size 768x448, 24 steps, shared style prompts, one prompt per environment).

To set it up again elsewhere on Windows:

```powershell
git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git D:\ComfyUI
cd D:\ComfyUI; git fetch --depth 1 origin tag v0.3.50; git checkout v0.3.50   # newest ComfyUI needs a newer PyTorch than 2.5.1
python -m venv D:\ComfyUI\venv
D:\ComfyUI\venv\Scripts\python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
D:\ComfyUI\venv\Scripts\python -m pip install -r D:\ComfyUI\requirements.txt
# download v1-5-pruned-emaonly.safetensors (Stable Diffusion 1.5) into D:\ComfyUI\models\checkpoints
```

## Everyday use

```powershell
powershell -File scripts\comfyui.ps1              # start the server (add -LowVram if it runs out of memory), leave it running
python tools\comfy\generate.py --check            # is it up and is the checkpoint installed?
python tools\comfy\generate.py --env control_room # one background into the staging folder
python tools\comfy\generate.py --env control_room --seed 7 --prompt "extra detail"
python tools\comfy\approve.py frontend\art-staging\control_room\control_room_s7.png   # copy ONE approved image to production
```

Environments: `warehouse_floor`, `control_room`, `electrical_area`, `loading_dock`, `ops_office`, `hospital_corridor`, `flooded_highway`, `alt_depot`,
`press_scene` (these are the backend's environment ids; in the story they are the office, server room, terminal quay, terminal gate, operations centre,
customer floor, access road, recovery room and communications room).

## Where things go

- `frontend/art-staging/<environment>/` generated images, and `frontend/art-staging/manifest.json` (prompt, negative prompt, model, seed, size, steps, time,
  approved flag). Nothing here is used by the game.
- `frontend/public/assets/generated/<environment>.png` only images copied by `approve.py`. Still not used until a panel is pointed at it.

## Notes

Installed version: ComfyUI v0.3.50 with PyTorch 2.5.1+cu121. The newest ComfyUI failed to start on that PyTorch (its `comfy-kitchen` dependency needs a newer one), so it is pinned to v0.3.50. One 768x448 image takes about 18 seconds on the RTX 3050 6 GB with default settings; no low-memory mode was needed.

## Limits

Stable Diffusion 1.5 does not draw clean flat vector art by itself. The shared prompt pushes it that way, but results can be painterly or noisy. A flat-illustration
LoRA would help; none is installed. Generated images must not contain text, so any labels stay in the game's own vector layer.
