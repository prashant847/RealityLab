# Illustrated art: pipeline, status and credits

## Status
**The first page now shows no faces.** After testing five ways of making Arjun and the director (docs/ART_FEASIBILITY.md section 9, gallery
`frontend/lab/first-page.html`), none reached the quality of a mature graphic novel, so the opening panels depict them through
openly licensed photographs: Arjun's hands at a keyboard, and the director as a silhouette against an office window. These are **stand-ins, not
the characters**; no character artwork exists yet. Nothing is AI-generated and nothing is drawn in code. The photographs are not hand-inked;
a restrained cinematic colour grade in CSS unifies them (a halftone "graphic" grade was compared and rejected: the dots read as noise over photographs).

| Id | File (under `frontend/public/assets/art/`) | Size | Status |
|---|---|---|---|
| `env.warehouse.wide_dark` | `env/warehouse_wide_dark.png` | 1600×900 | **real** |
| `env.arjun.hands_keyboard` | `env/arjun_hands_keyboard.png` | 1600×860 | **real** |
| `env.control_room.terminals` | `env/control_room_terminals.png` | 1600×900 | **real** |
| `fg.terminal.failed_evidence` | `foreground/terminal_failed_evidence.png` | 1200×800 | **real** |
| `env.director.skyline_silhouette` | `env/director_skyline_silhouette.png` | 1600×667 | **real** |
| `env.ops_office.decision` | `env/ops_office_decision.png` | 1600×500 | **real** |

## Credits and licence evidence (every asset used on the first page)
Originals are Wikimedia Commons files, stored locally (never hotlinked), cropped and resized only. The last column is what the Commons file page itself says, re-read on 2026-10-27.

| Id | Source | Author | Licence | Attribution required | Evidence on the file page |
|---|---|---|---|---|---|
| `env.warehouse.wide_dark` | [VR Warehouse interior in Helsinki, Finland, 1999.jpg](https://commons.wikimedia.org/wiki/File:VR_Warehouse_interior_in_Helsinki%2C_Finland%2C_1999.jpg) | Kari Hakli | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | Yes | Commons file page carries {{cc-by-4.0}}; source recorded as a Finnish Heritage Agency (Finna) record, author Kari Hakli. |
| `env.arjun.hands_keyboard` | [Keyboard Warrior (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Keyboard_Warrior_%28Unsplash%29.jpg) | Glenn Carstens-Peters glenncarstenspeters | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | No | Commons file page carries {{Unsplash}}; the Unsplash upload is dated 2017-02-05, before 5 June 2017 when Unsplash photos were CC0, and Wayback copies are linked on the page. Category 'Images from Unsplash (review needed)': no Commons reviewer has confirmed it yet. |
| `env.control_room.terminals` | [Control room of BESSY II, 2025-06-28.jpeg](https://commons.wikimedia.org/wiki/File:Control_room_of_BESSY_II%2C_2025-06-28.jpeg) | Nylki | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | No | Commons file page carries {{cc0}}; {{own}} work of the uploader Nylki. |
| `fg.terminal.failed_evidence` | [Blue Screen of Death on Internet Terminal.JPG](https://commons.wikimedia.org/wiki/File:Blue_Screen_of_Death_on_Internet_Terminal.JPG) | Ente75 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | No | Commons file page carries {{self|cc-zero}}; {{own}} work of the uploader Ente75. |
| `env.director.skyline_silhouette` | [Staring out building windows (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Staring_out_building_windows_%28Unsplash%29.jpg) | Alex Knight agkdesign | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | No | Commons file page carries {{Unsplash}}; the Unsplash upload is dated 2016-12-29, before 5 June 2017 when Unsplash photos were CC0, and Wayback copies are linked on the page. Category 'Images from Unsplash (review needed)': no Commons reviewer has confirmed it yet. |
| `env.ops_office.decision` | [Cube Farm.jpg](https://commons.wikimedia.org/wiki/File:Cube_Farm.jpg) | Dan4th Nicholas from Cambridge, MA, USA | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | Yes | Commons file page carries {{cc-by-2.0}}; source is the author's Flickr photo 'cube farm' (dan4th). |

**Caveat:** the two Unsplash-origin photographs (hands at the keyboard, the skyline silhouette) are marked CC0 on Commons through the generic `{{Unsplash}}` template, which relies on their Unsplash upload dates (before 5 June 2017). Commons has not human-reviewed them
("review needed"). They show an unnamed person's hands and an unidentifiable silhouette, but no model release is recorded. If you want certainty, replace them with files carrying an explicit `{{cc0}}`/`{{self|cc-zero}}` tag or your own photographs.
In the app, an "Image credits" line under the page lists all six.

## Still needed
Real character artwork for Arjun Mehta, Kavya Rao, Nisha Sen, Raghav Verma, Dr. Isha Kapoor and the Operations Director (briefs in the manifest history
and `src/comic/art/looks.ts`): a commissioned or properly licensed set of illustrated faces with several expressions and poses. Until then the
first page stays faceless; rounds 2 to 10 still use the earlier drawn comic.

## How the pipeline works
```
backend page (narration, dialogue, effects)  ─┐
public/assets/art/manifest.json (id -> file)  ─┼─►  <IllustratedPage script=ART_SCENES[round]>
src/comic/illustrated/scenes.ts (layers)      ─┘        panel = image layers + existing NarrationBox / SpeechBubble / PanelFrame / effects
```
`artManifest.ts` validates ids, PNG/WebP paths, alt text, file existence, and that a `real` asset has a complete credit record, https links and a `fit` note.
A missing asset shows a red MISSING ART box. A `placeholder` asset shows a PLACEHOLDER ART tag (none are left on this page).

## Interactive layer (React/CSS)
Panels reveal on scroll; narration and bubbles arrive in order; layers drift with the pointer; backgrounds slowly push in; one dark grade unifies the
photographs; the evidence panel has an **Inspect evidence** dialog (portalled) showing the scene's own known facts. All motion is flattened under
`prefers-reduced-motion`.

## Flat style, story flow and evidence (current)

All ten rounds, the consequence pages and the evidence inspector use the flat reference style (solid shapes, no outlines, full-body people, mitten hands, colour-block rooms). It is drawn in code: `src/comic/flat/` (people, rooms, props, effects). No photographs or generated images.

- Characters: Arjun's beard is a thin chin/jaw band; no hair highlights on anyone (the director's grey hair is flat).
- Story flow: `src/story/` turns the backend's own page, outcome and events into panels. Each decision has a picture (`BEATS`), each event has a picture (`EVENT_BEATS`), and later rooms carry earlier choices (`carriedProps`, `carriedEffects`): e.g. tape barrier after evacuating, sparks/warning lights after rushing restoration, hold tags after pausing dispatch, cash on the desk after the budget choice. Presentation only: no facts are invented.
- Evidence: the Inspect dialog lets the player ask the round's advisor to analyse it. It shows the advisor's reading, confidence, a stance on each option and any unverified claim; stances also appear on the decision cards. Uses the existing `stakeholder-advice` endpoint.
- Screenshots: `docs/art-review/img/flat-*.png`.

Limits: faces are tiny by design, poses are a small set, prop positions are approximate, and the start screen and the dead-end backdrop still use the older art.

### Polish pass
- Wall clock has both hands; Kavya's ponytail is attached to the head and Nisha's bob frames the face (hair is drawn in a back and a front layer).
- Speech bubbles and narration boxes no longer cover people: `textReserve` in `src/story/compose.ts` estimates how far down the text stack reaches above each person and draws them lower only when a bubble is above them.
- Less repetition: four staff looks, seeded wall and floor dressing (posters, notice boards, hazard signs, extinguishers, pallets, plants, bins, lamps), and a lighting mood per round that deepens through the night and warms at dawn. Screenshots: `docs/art-review/img/v2-*.png`.

### Consistency pass
- Hair: tapered sideburns, an uneven hairline with a part or sweep, and darker strand lines inside the hair mass (black at low opacity, so it darkens and never shines). Nisha's bob leaves the neck and ears visible.
- Sidebar and advice portraits, the landing-page picture (`src/comic/flat/Hero.tsx`) and the dead-end backdrop use the flat style. `Portrait` is now a head-and-shoulders crop of `FlatPerson`.
- One world scale: a person is `PERSON_UNITS` (340) scene units tall; the room is zoomed to match the person's size on the panel, and vehicles are drawn about 1.4x a person's height. Vehicles only appear on roads and docks, never inside the depot.
- Context fixes: the alternate depot is a lit depot with windows and a DEPOT B sign (it read as a cellar); the office clock shows each round's real time; the desk lamp no longer sits behind the person.

### Between-rounds pass
- The "Since your last decision" event panels now use the flat style (`composeEventsPage`), like the result pages.
- Everyone in a panel is drawn at one size (the size the tallest text stack above anyone allows).
- One vehicle per scene (`oneVehicle`); trucks have their own colours (white striped box, amber cab) and the dock doors are darker, so they no longer blend together. Room zoom is capped at 1.6 and people are scaled down with it.

### Plain-language layer (`src/story/plain.ts`, `src/ui/PlainGuide.tsx`)
The story, choices, numbers and consequences are unchanged and still come from the backend. The frontend now also says them in everyday words:
- A three-line briefing per round (Where we are / The problem / Your job now), plus a collapsible "story so far" recap built from the player's earlier decisions. The original briefing stays one click away.
- A short plain note in every panel, and simpler speech that keeps the same meaning.
- Each decision card shows what the option does in plain words, including its catch.
- The result page shows a plain result sentence and plain event titles; the backend's own wording is kept as the "Official note" and as the event text (which carries the numbers).
- A "Words explained" glossary shows only the hard words that appear in the round (3PL, provisional, verified, units, time slack, containment, lakh, ...).
Anything without a plain version falls back to the backend text.

### Drawn stickmen cast (current)
The ten people (the six named characters plus four staff extras) are now drawn stickmen in the Henry Stickmin style: round white head, thick ink outline, mitten hands, flat cel shading.
- Made with ElevenLabs image generation: `gemini-3.1-flash-lite-image` (about 5.6 US cents per image) from a style reference, then `birefnet-v2-bg-removal` (about 0.5 cent) for the cut-outs. One 4x2 sheet per character gives eight poses: calm, speaking, pointing, angry, worried, exhausted, surprised, determined. Total spend for all ten: about 1 US dollar.
- `frontend/tools/slice_sprites.py` cuts the sheets in `frontend/art-staging/stickcast/` (`sheet_*.jpg`, `cut_*.png`) into `frontend/public/assets/stick/<who>_<pose>.webp` (full body) and `<who>_<pose>_bust.webp` (head and shoulders).
- `src/comic/stick/StickSprite.tsx` draws them and maps the game's expression and pose names onto the eight drawn poses. `NpPerson`, `FlatPerson` (so portraits, the landing picture and every comic panel) and `CharacterLayer` use it. If a sprite fails to load, `CharacterLayer` falls back to the vector figure and then the old images.
- Animation (`stick.css`): idle breathing, a squash-and-settle pop when the pose changes, a talking bob while someone speaks. All off under `prefers-reduced-motion`.
- `public/assets/manifest.json` now points at the same sprites.

### Comic-book backgrounds, theme and choice animation (current)
- **Backgrounds:** every room is a generated comic illustration in the style of the Henry Stickmin game backgrounds (thick ink, flat colour): nine rooms in `frontend/public/assets/scene/env/<id>.webp`, fourteen object close-ups in `scene/shot/<name>.webp`, and the three library-card pictures in `scene/hub/`. They were made with `gemini-3.1-flash-lite-image` (about 7.5 US cents each) with two reference frames as the style guide; sources are in `frontend/art-staging/bg`, `shot` and `hub_*.jpg`. `NpEnv` / `Shot` (`src/comic/notpetya/Env.tsx`, `Shots.tsx`) now only place these pictures; small story props (cones, tape, trucks) and page effects are still drawn on top. The old vector rooms, the SVG characters (`public/assets/characters`), the SVG environments and the SVG library previews are deleted.
- **Theme:** `src/theme.css` (loaded last) re-skins the older stylesheets: dark ink canvas with violet, lime and orange accents, Permanent Marker headings and Rubik body text (both bundled through `@fontsource`, so the desktop app works offline), pill buttons with a hard offset shadow, rounded cards, and a thick black frame with a coloured offset shadow around each comic panel.
- **Choice reaction:** committing a decision plays `ChoiceCutscene` (`src/comic/stick/`, about 5 s) in the room where the decision is made. The script comes from `reaction.ts` and is different for every choice: the Recovery Team Lead announces the call (with the option's own words) with a gesture, then the round's advisor and a bystander react with a new expression, a hop, a shake or a pointing arm and a line of dialogue that quotes the option's effort and time cost. The advisor's mood is the team's real stance if the player asked them (support, caution, oppose), otherwise it is read from the option's cost. A sound-effect word (YES! / HMM... / UH-OH! / DECIDED!) lands, the screen shakes on opposition, and ink wipes open and close the scene; then the decision is submitted and the result page follows. It is skipped when reduce-motion is on (the OS setting or Settings > Reduce motion), which also switches off every other animation.
- **Sprite cut-outs:** `tools/slice_sprites.py` follows the black outline to cut each pose out (no pale halo, no stray marks from the generator).

### Props, effects and the COVID comic (current)
- **Story props** (cones, caution tape, hold/verified/provisional tags, sticky notes, trucks, road signs, order sheets, pallets, podium, cut cables, damaged crates, warning sign) are comic images with transparent backgrounds in `frontend/public/assets/scene/prop/` (made with `gemini-3.1-flash-lite-image`, then `birefnet-v2-bg-removal`; sources in `frontend/art-staging/props`). `NpProps` in `src/comic/notpetya/Env.tsx` places each one by percentage in the 16:9 frame. The old server-rack progress bars (`staged_recovery`, `rush_restore`, `account_locked`) were dropped. Page effects (power failure, emergency lighting, warning lights) are plain CSS.
- **COVID Hospital round 1** is eleven generated comic panels (`public/assets/scene/covid/<panel>.webp`, sources in `art-staging/covid`) on three printed sheets, with live comic lettering (bubbles, captions, sound effects, and the "31 WAITING" board) on top. The old SVG drawing kit (`ink.tsx`, `firstSurge.tsx`) and `flat/World.tsx` are deleted.
- **Captions** now live inside their panel, so the Next/Back buttons can no longer overlap them. **Dialogue** is always visible, including with Reduce motion on, and the choice reaction scene plays calmly (poses, bubbles and the sound-effect word, no movement) under that setting.
- Still present but unused by the active screens: the older vector renderers under `src/comic/vector`, `toons`, `portraits` and `art` (used only by a non-default page style and the dev gallery).
