# The first surge: image prompts (for Google Flow or any image generator)

Written for the four pages of the comic that opens the hospital simulation's first step. Generate one picture per page, in order, and save each into
`frontend/public/comic/first-surge/` with the file name shown. The app lays your picture under live speech bubbles and a caption, so **the pictures must not
contain any text, letters, numbers or speech bubbles.** A page with no picture keeps its drawn art, so you can do them one at a time.

**Size:** wide, 16:9 (the app crops to a 2.4:1 band, so keep the subjects in the middle two thirds and the top and bottom edges quiet).
Leave the top-left and bottom-left corners calm: a caption box covers the bottom-left.

## Style block (paste at the start of every prompt)

> Comic panel in a stickman cartoon style: characters are simple stick figures with large round white heads, dot eyes, expressive mouths, thin black
> stick arms and legs, and a few clothing details. Bold black ink outlines, flat saturated colours, halftone dot shading, a hand-inked newspaper-comic
> look. Detailed painted cartoon backgrounds. No text, no letters, no numbers, no speech bubbles, no captions, no logos.

## Characters (keep them the same on every page)

- **The Duty Medical Lead:** stick figure in a teal surgical scrub top and a teal scrub cap, small grey stethoscope.
- **The senior consultant:** stick figure in a long white coat, round glasses, grey hair at the sides.
- **A newer nurse:** stick figure in a blue tunic with a white apron and a small white nurse cap with a red cross.
- **Patients:** plain stick figures, some wearing light-blue face masks.

## Page 1: `morning.png`

> [Style block] Early morning outside a district hospital: a beige two-storey hospital building on the right with a red cross sign and an EMERGENCY door
> (no readable lettering), a white ambulance with a red stripe parked on the left, a long queue of small masked stick figures waiting outside the door. Peach
> and blue sunrise sky with a low yellow sun. In the foreground the Duty Medical Lead stands facing the hospital, one arm pointing at the queue, mouth open.

## Page 2: `waiting.png`

> [Style block] Inside a crowded hospital emergency waiting room: pale green walls, a wall clock, a big dark electronic board on the wall (leave it blank), rows of blue
> chairs. One masked stick-figure patient sits gasping with sweat drops, another sits looking worried, another sits with a mask and a cough, one stands
> grimacing. Coughing lines near the patients. The Duty Medical Lead stands in the middle distance looking worried with arms out.

## Page 3: `huddle.png`

> [Style block] A hospital corridor with ceiling lights and a whiteboard of notes on the wall (leave it blank). A newer nurse in a blue tunic holds her head with
> both hands, sweating and anxious. A doctor in teal scrubs holds up a pager that is buzzing, looking startled. A senior consultant in a white coat shrugs, worried,
> in the middle. Lavender and grey colour mood, tense.

## Page 4: `question.png`

> [Style block] Close, dramatic framing of the Duty Medical Lead in teal scrubs and cap holding a clipboard, looking worried and sweating, on the left. Behind
> him a long line of many small masked stick-figure patients stretches across the hospital hall under a wall clock. On the right the senior consultant in a long
> white coat and round glasses points at him questioningly. Warm yellow and blue colours. A large red question mark floats above the Medical Lead.

## Tips

- If a generated picture contains lettering, regenerate it: the app draws its own text, and baked-in text will clash with it.
- Keep the same character descriptions in every prompt so the cast looks consistent from page to page.
- Reload the step after adding a picture; the app checks for pictures each time the comic opens.
