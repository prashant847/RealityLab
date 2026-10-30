# BLACKOUT art: asset feasibility report

**Status: for review. Nothing in this report has been integrated, approved or marked `real`.** The game, story data,
backend and rounds 2-10 are unchanged. Visual gallery: `docs/art-review/index.html` (open it in a browser).

Rules followed: no AI image generation, no SVG/CSS/canvas illustration, only existing openly licensed resources or
renders made from them, no unrelated downloads. Story fidelity first, theme second.

## 1. Story requirements (from the repository)
Meridian Industrial Systems, an Indian medical-equipment distribution hub. Opening scene (8:40 PM): dashboard and
scanners fail, suspicious logins, Arjun inspecting a failed system, the director's reaction, then the existing
decision list. Later chapters add smoke at an electrical panel, flooded road, alternate depot, press, hospitals.
Recurring cast (from `manifest.json` and `src/comic/art/looks.ts`): Arjun Mehta (IT & Systems Lead), Kavya Rao
(Safety Chief), Nisha Sen (Finance Director), Raghav Verma (Logistics Manager), Dr. Isha Kapoor (Hospital Liaison),
the Operations Director (player).

## 2. What was investigated, and the evidence

| Source | What it offers | Licence (as verified) | Verdict |
|---|---|---|---|
| **Poly Haven** (polyhaven.com; API checked) | 300+ indoor HDRI panoramas of real places, 500+ 3D props/models. Includes a real warehouse hall, switchboard, boiler-room control panel, hospital rooms. | CC0 for all assets ([polyhaven.com/license](https://polyhaven.com/license)). Authors: Sergej Majboroda, Oliksiy Yakovlyev, Ulan Cabanilla, etc. (per asset). | **Useful for environments and props.** Empty rooms: no racking, no monitors/terminals, no server racks; office HDRIs are bare. Props are 3D (.blend/glTF) so they need a Blender render. |
| **Blender Studio Human Base Meshes v1.4.1** (downloaded, 49 MB, 50.6 MB zip, inspected) | Realistic/stylized male and female bodies, heads, hands, eyes, jaw, skull, skeleton. | CC0 (stated on [blender.org/download/demo-files](https://www.blender.org/download/demo-files/)); needs Blender 4.2+. | **Not usable as characters.** They are colour-coded sculpting meshes: no skin textures, hair, clothing, poses or expressions. Using them would mean sculpting/texturing new characters, which is new artwork. |
| **MakeHuman community** (assets read from `static.makehumancommunity.org` and the GitHub repo; `www.makehumancommunity.org` was **not** used because its HTTPS certificate does not match the host name) | Parametric human generator with CC0 assets: natural skins (incl. Indian female/male), 10 hair styles, eyebrows, eyes, casual/elegant/work suits, shoes, sitting and sports poses, ARKit-style face units and visemes for expressions. Works with the MPFB2 Blender add-on. | Bundled assets CC0 (`LICENSE.md`, `LICENSE.ASSETS.md`); the app code is AGPL but the project states it claims nothing over exports or renderings. Third-party assets in separate repositories carry their own licences. | **The only realistic route to a consistent cast**, but it is a pipeline, not a finished asset. Expression quality of face units is unverified. News page notes "Community services shut down", so mirrors may disappear: download and archive any packs used. |
| **OpenGameArt** (searched) | CC0 visual-novel template sets, pixel/low-poly terminals, simple office furniture. | CC0 on the pages checked; others CC BY-NC. | Wrong style or content: anime/pixel/retro. Rejected as characters; low-poly terminals rejected. |
| **Openverse** (API) | Aggregator. | Per item. | API timed out on every query, so no results. Wikimedia Commons (an Openverse source) was searched directly instead. |
| **Wikimedia Commons** (extra source) | Photographs with machine-readable licences. | Per file; CC0 / public domain / CC BY used. | Provides the six photographs already integrated earlier. |

## 3. Feasibility by required asset

| Asset | Classification | Candidate | Source, creator, licence | Format | Suitability |
|---|---|---|---|---|---|
| `env.warehouse.wide_dark` | Suitable existing asset found (empty hall) | Commons "VR Warehouse interior in Helsinki, Finland, 1999" | Kari Hakli, CC BY 4.0, attribution required | JPG photo | Real industrial hall with strip lights; empty and B&W. Alternative: Poly Haven Empty Warehouse 01 (Sergej Majboroda, CC0), also empty. |
| `env.warehouse.aisle_depth` | Suitable existing asset found | Commons "Interior of an Warehouses" | Encik Tekateki, CC BY 4.0 | JPG photo | Brand-free racking aisle with pallets. |
| `env.control_room.terminals` | Suitable (partial) | Commons "Control room of BESSY II" | Nylki, CC0 | JPG photo | Real control room, but bright and working. No failed-state version exists. |
| `fg.terminal.failed_evidence` | Suitable existing asset found | Commons "Blue Screen of Death on Internet Terminal" | Ente75, CC0 | JPG photo (cropped) | Real crashed terminal. |
| `env.ops_office.night` / `.decision` | Suitable (partial) | Commons "Cubicle land" (public domain, Larsinio) / "Cube Farm" (CC BY 2.0, Dan4th Nicholas) | as listed | JPG photos | Empty offices; no desk lamp, rain or whiteboard. A fuller office would need Poly Haven props rendered in Blender. |
| `char.arjun.concern_closeup` | **No suitable asset found** | none | - | - | Needs a MakeHuman character rendered in Blender (see section 4). |
| `char.director.reaction` | **No suitable asset found** | none | - | - | Same. |
| Kavya, Nisha, Raghav, Isha | **No suitable asset found** | none | - | - | Same pipeline would cover them. |

Existing-asset classification: **4 suitable, 2 partial, 2 (plus 4 later characters) no suitable asset found.** The six
photographs are still in the project with their earlier status; this report does not change them. Per this task's
rules they should be re-reviewed by you before staying `real` (see recommendation).

## 4. Character feasibility, honestly
- No openly licensed finished image of any of the six characters exists.
- The Blender base meshes alone cannot produce them.
- **MakeHuman (CC0 assets) + MPFB2 + Blender could**, giving one fixed model per character rendered with one camera
  and lighting rig. It requires: installing Blender (not installed; about 0.4 to 1 GB), MPFB2, the MakeHuman system
  assets pack (267 MB) plus skins and expression packs. This machine has **7.6 GB free on C:** and an RTX 3050 6 GB,
  which is adequate for stills. Risks: render quality of faces and expressions is unproven; the pipeline is a
  meaningful new build; mirrors may vanish; Indian-appearance skins exist but must be matched to each character.

### Proposed character registry (not approved: nothing here is real yet)
| Character | Role | Intended stable look (from existing design) | Approved model/source | Poses & expressions | Modifications / licence |
|---|---|---|---|---|---|
| Arjun Mehta | IT & Systems Lead | 30s, glasses, short dark hair, light stubble, hooded top | none yet (proposed: MakeHuman, CC0) | to be tested: concerned, focused, suspicious | MakeHuman assets CC0, render unrestricted |
| Kavya Rao | Safety Chief | 40s woman, hair tied back, hi-vis vest over dark shirt | none yet | to be tested | as above |
| Nisha Sen | Finance Director | 40s woman, shoulder-length hair, blazer | none yet | to be tested | as above |
| Raghav Verma | Logistics Manager | 50s man, grey hair, moustache, work jacket | none yet | to be tested | as above |
| Dr. Isha Kapoor | Hospital Liaison | 30s woman, hair up, white coat over scrubs | none yet | to be tested | as above |
| Operations Director | player | 40s, short dark hair greying at temples, jacket and lanyard | none yet | to be tested | as above |

## 5. Visual direction (recommendation, pending approval)
Change from "dark inked graphic novel" to **photographic environments plus consistently rendered CC0 CG characters**,
with a neutral, slightly desaturated grade and moderate contrast. The blackout is communicated by exposure, the
existing effect overlays (power failure, warning lights) and emergency amber lighting, not by heavy darkness, so
equipment, evidence and faces stay readable. This is a theme change only: the story, setting, characters' roles and
the scene data are unchanged. A mixed set of photos and CG will not look seamless; making it coherent is the main risk.

## 6. Decisions needed from you
1. **Backgrounds:** keep the six Commons photographs as the opening-scene backgrounds (status `real` with credits),
   swap any for Poly Haven views from the gallery, or hold all as unapproved until you choose?
2. **Characters:** approve the MakeHuman + MPFB2 + Blender route (needs installing about 1 GB of tools and a pilot on
   one character, Arjun, before anything else), or accept the two character placeholders for now?
3. **Visual theme:** approve the photographic/CG direction in section 5?

Until you answer, no further assets will be downloaded or integrated.

## 7. Update: pilot character render (tried, rejected)
Blender 4.5.9, MPFB 2.0.18 and the MakeHuman CC0 packs (system assets, system poses, skins01, skins02, faceunits01)
were installed under `D:	ools` (outside the repo) and `frontend/tools/art/render_character.py` renders a character from a
JSON spec (`specs/arjun_concern.json`). It works end to end (body, skin, hair, clothes, ARKit face-unit expression,
lights, ink outline, transparent PNG) but the result is not good enough: the face is uncanny and plastic, brows and
hair read poorly, there are no glasses, and the clothing choices are limited to jeans-and-shirt style sets (no hi-vis
vest, lab coat or work jacket). Reaching a professional graphic-novel standard would need substantial custom
modelling and texturing, which is new artwork rather than reuse. **Recommendation: do not pursue this route for the
main characters unless you want that custom-art effort.** Evidence: `docs/art-review/index.html`, section F.

## 8. Character artwork search (illustrated, no Blender)
Gallery: `docs/art-review/characters.html`. Searched itch.io, OpenGameArt, Commons-adjacent sources and the web for realistic or
semi-realistic illustrated adult characters with several expressions and poses. **No suitable asset found; nothing was integrated.**

| Candidate | Creator | Licence (as stated) | Style | Expressions | Problem |
|---|---|---|---|---|---|
| [3 Free Modern Characters](https://assetsmithy.itch.io/3-free-modern-characters-with-6-expressions-each-visual-novel-rpg-sprites-sam) | AssetSmithy | Commercial use and edits allowed, credit optional; raw files may not be redistributed | Semi-realistic comic illustration | 6 per character | Declared AI-generated; no-redistribution clause; male is a blond "college student"; no director |
| [Character Sprites for Visual Novels](https://doublefree.itch.io/4-character-sprites-for-visual-novels) | DoubleFree | CC0 | Flat visual-novel style, no generative AI | 6 to 9 | Four women only; not mature or realistic |
| [Indian/Desi Character Sprites](https://little-fiddle.itch.io/desi-character-sprites) | Little_Fiddle | None stated | Flat sketch, no generative AI | "basic" | No licence; style far from the brief; best ethnicity match |
| [Visual Novel Character Sprite](https://opengameart.org/node/126911) | FALLiNG_AiR | CC0 | Anime | sheets | Wrong style |
| [Male sprite for visual novels](https://opengameart.org/node/101036) | LisadiKaprio | CC BY 4.0 | Anime-like | mix and match | Joke character, nude variants |
| [Public domain portraits](https://opengameart.org/content/public-domain-portraits) | qubodup | CC0 | Historical oil paintings | none | 19th-century faces, no bodies or expression sets |
| [Set 2 VN sprites](https://iam-cyanea.itch.io/set2-vnsprites) | Cyanea | CC BY 4.0 | VN | 2 | One character |
| Digital Comic Museum | various | Public domain per title (unverified per page) | Real hand-inked comics | n/a | 1940s Western cast; not a character set |

Not reachable: Openverse API (timeouts), a Hugging Face OpenGameArt-CC0 index (errors), a Lemma Soft CC0 3D-render set (HTTP 403), itch.io
realistic-tag listings (HTTP 403). None of these blocks was bypassed.

Options for the owner are listed at the bottom of the gallery page: commission an artist (recommended), ask Little_Fiddle for permission
and a restyle, accept AI-generated art as a deliberate exception (not recommended), or re-stage the opening panels without faces (needs approval).

## 9. First-page character method experiment (result)
Prototype: `frontend/lab/first-page.html` (isolated, same scene for every method); screenshot `docs/art-review/img/lab_comparison.png`.

| Method | What was tested | Result |
|---|---|---|
| A. Open character artwork | Two rounds of searching (section 8) | No suitable asset: anime, flat cartoon, AI-generated, female-only or unlicensed |
| B. HTML/CSS characters (no SVG) | Divs, gradients, clip-path; brows, lids, gaze, mouth driven by CSS variables; Arjun and the director | Clear, consistent, controllable expressions and no licence issue, but a toy-like cartoon; not mature or cinematic |
| C. Character library | DiceBear Lorelei (CC0 art) with glasses, hair, brows and mouth options | Generic ink-line avatars, bust only, few expressions; the "cartoon avatar" look to avoid |
| D. Layered raster | FabinhoSC CC0 face parts composed with CSS | Bald stylised head with big cartoon eyes; no hair, mouth, clothes or expression set; both characters identical |
| E. 3D render + cel/ink | CC0 MakeHuman assets in Blender (already installed), then `tools/art/stylize.py` (tone bands and inked edges) | Closest to an inked graphic novel and one pipeline for all characters, but blotchy faces, weak expression, no glasses available, limited clothing |

Browser cost: B is pure CSS (instant). C, D and E are small PNGs (under 1 MB each). Setup cost: only E needs Blender, MPFB and about 0.5 GB of packs, already installed.
**None met the bar**, so the first page uses the faceless stand-in approach, as agreed beforehand. If you later want to push E, the likeliest gains are a
better face shader, glasses and clothing modelled by hand, and per-expression retouching, which is custom art work.

## 10. SVG portrait redesign of the first page (second attempt at SVG)
`src/comic/portraits/`: `draw.ts` (spline and ribbon maths), `Face.tsx` (landmark-driven face: contour, cheekbone and jaw planes, cel shading with hatching, eyes with
iris detail, lids and creases, tapered brows, nose, lips, wrinkles, stubble, five switchable expressions), `Arjun.tsx` and `Director.tsx` (each its own face landmarks,
palette, hair locks, clothing with collars, seams, stitching, lanyard and badge). The first-page script `ART_SCENES_PORTRAITS` uses them; set `FIRST_PAGE_STYLE`
in `scenes.ts` to `"faceless"` to roll back to the photographs. Screenshots: `docs/art-review/img/page1_svg_after.png`, `svg_portraits_closeups.png`, `page1_svg_mobile.png`.
Assessment: clearly better than the first SVG attempt and the two people are distinct, but they are still stylised vector cartoons set on photographs, not a mature
hand-inked graphic novel. See the final report for the remaining weaknesses.

## 11. Fully illustrated first page (vector environments + portraits)
`FIRST_PAGE_STYLE = "vector"` in `src/comic/illustrated/scenes.ts`. Design system in `src/comic/vector/system.tsx` (one ink colour and outline weights, flat fill + one shade +
one highlight, amber emergency light / cyan screen light / red only for failures, one-point perspective). Environments: `Warehouse.tsx`, `Rooms.tsx` (control room, director's office),
`Terminal.tsx` (the evidence). Evidence rows are derived from the scene's own known facts (`evidenceRows`): "Inventory dashboard: OFFLINE", "Barcode scanners: NOT RESPONDING",
"Access logs: UNUSUAL" with the original wording underneath; money facts are excluded and nothing is invented. Rollback: set the style to `"portraits"` or `"faceless"`.
Screenshots: `docs/art-review/img/page1_vector_desktop.png`, `page1_vector_mobile.png`, `page1_vector_inspect.png`. No photographs are used on this page any more.

## 12. Flat 2D cartoon characters (current first-page characters)
`src/comic/toons/` (`kit.tsx` shared eyes, brows, mouth, hands; `ArjunToon.tsx`; `DirectorToon.tsx`). Flat solid fills, one outline weight, one flat shadow shape per material, no gradients,
no hatching, no highlights. Arjun: narrow face, strong nose, black quiff, jaw beard, round-rect glasses, steel-blue work shirt, amber lanyard, optional pointing pose. Director: broad square
face, grey swept hair, heavy grey brows, lined, charcoal blazer, red tie, optional hand-to-chin pose. Expressions: neutral, concern, alarm, suspicion (Arjun); neutral, pressure, uncertain (director).
`PORTRAIT_STYLE` in `scenes.ts` switches back to the earlier shaded set. Backgrounds were not touched. Previews: `docs/art-review/img/toons_preview.png`, `page1_toon_desktop.png`, `page1_toon_mobile.png`.
