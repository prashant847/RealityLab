# BLACKOUT: The NotPetya Incident. Revised ten-round outline (v2, for approval)

Status: **Stage 1 and 2 only.** No story, code or art has been changed. This replaces the draft in `NOTPETYA_OUTLINE.md`.

Branch `feature/notpetya-maersk`. Checkpoint tag `pre-notpetya-checkpoint` (commit `a8a2c0c`). Working tree was clean and the database backup was byte-identical (SHA1 `84aab706...` for both files) when I started this stage.

## 0. What changed since v1, and why

1. **The engine fixes what kind of decision each round is.** The ten rounds, their order, each choice's numbers, and the follow-up events are engine data, and you ruled out changing them. v1 invented choices the engine does not have, such as "pay the ransom or not", "Windows 10 or Windows 7", "courier or network". Those cannot be choices under your rules. In v2 every round keeps the three existing choices, with reworded text. Real decisions that don't fit a choice (ransom, Windows 10, Ghana) appear as **"What the record says"** captions, so the player sees the real outcome next to their own.
2. **Some existing rounds describe things that never happened at Maersk** (a fire hazard, a monsoon flood, hospitals as customers). Rewording alone cannot make them true. v2 keeps their mechanics but reframes each as a **labelled simulation scenario** that has a documented counterpart. Section 3 says which rounds are strong fits and which are loose.
3. **The Ghana and courier claims were checked.** Result in section 2.

## 1. Timeline treatment

The story runs over about ten days from **Tuesday 27 June 2017**. I show exact dates only where sources agree. Everything else gets a phase label.

| Rounds | Label shown | Basis |
|---|---|---|
| 1-2 | Day 1, 27 June | Documented: the attack and Maersk's first statement fall on this date |
| 3 | Day 2, 28 June | Documented: Maersk said on 28 June the attack was contained and business-continuity plans were running |
| 4-6 | Days 2-5, "phase" only | Phases overlap in reality; no sourced dates |
| 7-9 | Days 5-9, "phase" only | Same |
| 10 | About Day 10 | Snabe said the rebuild was done "over ten days". Other sources say bookings mostly resumed after about 8 days and full restoration took about four weeks, so the story labels this **core rebuild**, not full restoration |
| Epilogue | 2018 onward | Attribution and lessons |

I will not show clock times such as "13:21". One outlet gave that time and I found no second source. The engine's `clock` strings are display labels, so replacing "8:40 PM" with "Day 1 · 27 June" is wording only. I still need to confirm that nothing in tests or scoring parses them (see section 6).

## 2. Verification results (Stage 1)

| Claim | Status | Basis |
|---|---|---|
| Attack on **27 June 2017**, Maersk confirmed IT systems down | **Documented** | Maersk statements as reported by several outlets (wording differs by outlet; I have not seen the original post) |
| **Contained 28 June**; business-continuity plans in progress | **Documented** | Maersk investor announcement of 28 June, via press |
| Mainly hit **Maersk Line, APM Terminals, Damco**; estimated impact **USD 200-300m** (mostly Q3, mostly Maersk Line); no data breach to third parties; malware was a previously unseen type | **Documented** | Maersk Q2 2017 interim report, via press coverage (the PDF itself returned 403) |
| **4,000 servers, 45,000 PCs, 2,500 applications reinstalled "over ten days"** | **Documented as a statement** by the chairman, Davos, Jan 2018 | Several outlets quote it nearly identically |
| Spread from a poisoned update to **M.E.Doc**, Ukrainian tax software | **Widely reported** | Secondary sources; "believed" is the right verb |
| Malware looked like ransomware but worked as a **wiper**; fake USD 300 Bitcoin demand | **Widely reported** | Wikipedia and its cited sources |
| Staff first noticed devices going dark worldwide, then servers, then domain controllers; recovery plans assumed losing a site, not everything | **First-hand** | Gavin Ashton (Maersk IT), read in full |
| Active Directory restored first; Windows 10 chosen over a Windows 7 rollback; admin rights reduced; MFA mandated | **First-hand** | Same |
| Manual processes for a period | **Reported** | iTnews; no dates, so not used as a precise duration |
| **A surviving domain controller in Ghana** (Accra) saved the directory because a power outage had left it offline | **Reported, not verified by me** | Repeated by several write-ups that credit Wired (Greenberg). I could not open the Wired piece or the book, so I did not confirm it against an original |
| **The courier handover via Nigeria / a hard drive** | **Not confirmed. Dropped.** | My searches found no source for Nigeria or a hard drive. Some say the data went to the UK; none give a route |
| About 150 domain controllers | **Reported, single lineage** | Same Wired-derived summaries |
| A rebuild "in 10 days" | **Disputed framing** | Ten days is the chairman's number for the core rebuild. Other sources give about 8 days for bookings and about four weeks for full IT |
| Attribution: UK government (Feb 2018), US indictment of six GRU officers (Oct 2020); Russia denies | **Documented as statements** | Press and DOJ summaries |
| Specific numbers of lost TEU, the Odessa employee, an exact infection time | **Not used** | Single source or disputed |

**Rule in the story:** a "reported, not verified" item gets an explicit "reported" caption, and the courier route is not shown at all. Before release I'd like to check the Ghana item against Greenberg's original. If you can give me access, or the text, I can upgrade it.

## 3. Fit between the real incident and the fixed mechanics

| Round | Engine decision (unchanged) | Real counterpart | Fit |
|---|---|---|---|
| 1 | Contain and preserve evidence / staged recovery / rush restore | Network shutdown and containment on Day 1-2 | **Strong** |
| 2 | Evacuate and call responders / cordon and assess / carry on unassessed | Sites running without systems (manual) | **Loose.** Safety incident is invented |
| 3 | Pay for extra transport / divert via another depot / reserve for urgent runs | Moving cargo with booking and terminal systems down | **Medium.** Specific routing choices are simulation |
| 4 | Pause for a full count / release verified batches / use records provisionally | Records you cannot trust after a wipe | **Medium** |
| 5 | Spend the recovery budget: minimal / balanced / heavy / logistics / negotiated | Where scarce recovery effort went; outside help was brought in | **Medium** |
| 6 | Restrict the suspect account / bring specialists / restore in parallel | Third-party software update as the entry route; outside experts engaged | **Strong** |
| 7 | Priority customers first / follow orders / negotiate a split | Whose cargo moves first when capacity is short | **Loose.** I found no documented case |
| 8 | Transfer to alternate site / restricted operations / suspend | Recovery on unreliable footing; fallback site | **Loose** |
| 9 | Holding statement / wait / coordinated briefing | Maersk's public updates; reporters asking | **Strong** |
| 10 | Dispatch verified only / final sweep / dispatch provisional | Reopening on trustworthy vs doubtful data | **Medium** |

"Loose" rounds keep a simulation label on screen throughout. If you would rather have no loose rounds, the alternative is to allow engine changes later; I have not assumed that.

## 4. Re-labelled vocabulary (wording only)

- **Money (₹ lakh)** becomes *recovery effort points*, an abstract simulation currency. No financial figure from the real event is used inside the game. USD 200-300m appears only in the epilogue, as Maersk's own estimate.
- **Units** become *cargo lots*, a made-up scale. They are not container counts.
- **Hospitals** become *time-critical customers*. I found no documented link between Maersk and hospitals, so none is claimed. The cast list's "Customer or Hospital Representative" becomes **Customer Representative**.
- **Contract customer** becomes *key account customer*.
- **3PL account** becomes *third-party software update*, echoing M.E.Doc.
- **Monsoon, flood, fire panel, backup-power flicker** are rewritten as terminal and recovery-site problems. The weather overlay ("rain") and "smoke" effects are no longer used in the text; their ids stay in the vocabulary so nothing breaks.

## 5. The ten rounds

Notation: **[D]** documented, **[R]** reconstructed scene, **[S]** simulation. Characters are fictional roles. No real employee is shown or given words. Real people appear only as sourced captions.

### Round 1. The screens go dark · Day 1, Tue 27 June
- **Engine decision:** `r1_isolate` / `r1_controlled` / `r1_rush`.
- **Situation:** workstations go dark worldwide, then servers, then domain controllers **[D, first-hand]**.
- **Panels:**
  1. Wide: an open-plan office, monitors blinking out in a wave.
  2. Close-up: a single black screen with a red ransom message.
  3. Medium: the IT Lead stares at a log window, brow knitted (concern). The Operations Manager enters mid-stride.
  4. Reaction: the Network Administrator reaches for a cable, then looks up at the observer.
- **Narration:** "27 June 2017. Nobody inside yet knows this is not a fault." **[R]**
- **Dialogue (reconstructed):** IT Lead: "This isn't one machine. It's everything." Ops Manager: "Then say what we cut and what we keep."
- **Choices (reworded):**
  - *Cut affected connections now and keep the evidence.* Slower, fewer machines lost.
  - *Recover in stages while watching the spread.* Partial containment.
  - *Bring everything back as fast as possible.* Fast, overwrites evidence, risks reinfection.
- **Immediate:** the engine's containment, evidence and capacity changes, shown in story terms.
- **Later:** with no containment, the existing **relapse** event fires: systems fail again **[S]**.
- **Record caption:** "Maersk's own report: systems were shut down and the attack was contained on 28 June." **[D]**
- **Uncertain:** the exact first-infection time. Not shown.
- **Leads to:** with the network down, the sites still have to run.

### Round 2. Running blind at the terminal · Day 1, 27 June
- **Engine decision:** `r2_evacuate` / `r2_secure` / `r2_maintain`.
- **Situation:** terminals and offices lose their systems and fall back to manual working **[D, reported by iTnews; duration not given]**. APM Terminals reported affected ports **[D]**.
- **Panels:** wide quay with cranes idle; a gate queue of trucks; a supervisor with a clipboard and radio; close-up of a handwritten container list.
- **Narration:** "Cranes need instructions. The instructions are gone." **[R]**
- **Dialogue (reconstructed):** Terminal Supervisor: "Nobody moves a box until I know where it goes."
- **Choices (reworded):**
  - *Stop and clear the affected area, then restart under a safety check.*
  - *Cordon the area and let a qualified lead assess it.*
  - *Carry on manually elsewhere with no formal safety review.*
- **Later [S]:** the existing event where the unassessed hazard injures workers becomes a **manual-handling accident**, shown as a simulation outcome. The story says: **"No injuries are documented in the sources used here; this is what the simulation explores."**
- **Uncertain:** how long each site worked manually. Not stated.
- **Leads to:** cargo is stuck at gates and needs routes.

### Round 3. Cargo with nowhere to go · Day 2, Wed 28 June
- **Engine decision:** `r3_alt_transport` / `r3_divert_depot` / `r3_reserve_hospital`.
- **Situation:** Maersk confirmed IT down, then said on 28 June it was contained and recovery plans were running **[D]**. How cargo was rerouted is not documented in my sources **[S]**.
- **Panels:** the road to the terminal clogged with trucks; a regional map with sites greyed out; the Regional Coordinator on a phone.
- **Narration:** "Contained does not mean working. Outside the gates, trucks keep arriving." **[R]**
- **Choices (reworded):**
  - *Pay for extra capacity.* Known size, higher cost.
  - *Divert through another site.* Cheaper, but its status is not confirmed.
  - *Keep the few usable routes for the most urgent cargo only.*
- **Later:** if the diversion was unverified, a scout report later says part of it is unusable **[S]**.
- **Leads to:** nobody can say what is actually where.

### Round 4. The records don't match · Days 2-3
- **Engine decision:** `r4_pause` / `r4_release_verified` / `r4_provisional`.
- **Situation:** after a wipe, booking and cargo records cannot be trusted. This is a reasonable inference, **not a documented fact** **[R]**.
- **Panels:** screen close-up with two numbers that disagree; an over-the-shoulder shot of a manual yard count; the Operations Manager looking tired.
- **Narration:** "The last reliable report says one thing. The yard says another." **[R]**
- **Choices (reworded):**
  - *Pause releases until a full physical count is done.*
  - *Release batches as each is independently confirmed.*
  - *Use the last records provisionally and check later.*
- **Later:** "The records overstated stock" event if records were used provisionally **[S]**.
- **Leads to:** rebuilding costs effort, and there is not enough.

### Round 5. Where does the effort go? · Days 3-5
- **Engine decision:** the five spending packages.
- **Situation:** recovery was a huge rebuild: 4,000 servers, 45,000 PCs, 2,500 applications over ten days **[D, chairman's statement]**. Staff flew in with equipment; outside experts helped **[D, first-hand]**.
- **Panels:** a table of laptops being imaged; the Recovery Team Lead at a whiteboard of priorities; a close-up of a tired hand on a keyboard.
- **Narration:** "There is only so much skill, and so many hours." **[R]**
- **Choices (reworded, keeping the engine's five):** minimal essentials, balanced package, heavy early restoration, logistics first, negotiated payment terms. "Recovery effort points" replace rupees.
- **Record caption:** "The chairman later called the rebuild 'a heroic effort over ten days'. Normally he said it would take six months." **[D, as reported; wording differs slightly by outlet]**
- **Leads to:** the cause is still unclear.

### Round 6. How did it get in? · Days 2-6, alongside recovery
- **Engine decision:** `r6_restrict` / `r6_specialist` / `r6_parallel`.
- **Situation:** the malware is believed to have spread through a poisoned update to Ukrainian tax software, M.E.Doc **[widely reported]**. It looked like ransomware but wiped data **[widely reported]**.
- **Panels:** a diagram-style panel of a software update arriving on a computer; the IT Lead pointing at a log; a split panel of the "ransom" screen and an empty disk.
- **Narration:** "The ransom note is a disguise. Payment cannot bring anything back." **[R framing, widely reported fact]**
- **Choices (reworded):**
  - *Restrict the third-party update path and contain what it reached.*
  - *Bring in outside incident specialists.*
  - *Keep restoring while investigating in parallel.*
- **Later:** the "intrusion resurfaces" event if the path was never closed **[S]**.
- **Record caption:** "The record: the demand was USD 300 in Bitcoin, but recovery by paying was not possible." **[D]**
- **Uncertain:** which exact route reached Maersk. Not claimed.

### Round 7. Whose cargo moves first? · Days 5-8
- **Engine decision:** `r7_hospital_first` / `r7_commitments` / `r7_negotiate`.
- **Situation:** capacity is short. The sources say operations were disrupted, but nothing about who was prioritised **[S]**.
- **Panels:** a customer service floor of ringing phones; the Customer Representative at a desk, tense; a spreadsheet printout with highlighted rows.
- **Narration:** "Everyone has a reason to be first." **[R]**
- **Choices (reworded):** time-critical customers first and accept the penalty; follow existing commitments; negotiate a split.
- **Label on screen:** **"This decision is a simulation; the sources do not describe how Maersk prioritised."**
- **Later:** a penalty notice arrives if a contract was broken **[S]**.

### Round 8. A fragile fallback · Days 5-9
- **Engine decision:** `r8_transfer` / `r8_restricted` / `r8_suspend`.
- **Situation:** the recovery rested on a few surviving pieces. The reported example is a domain controller in Ghana that survived because a power outage had left it offline. **Reported, not verified by me.** The courier detail is not used.
- **Panels:** a dim recovery room on emergency lighting; a lone machine marked "offline" on a wall map; the Network Administrator checking a power indicator.
- **Narration:** "Recovery now depends on what happened to survive." **[R]**
- **Choices (reworded):** move verified work to a fallback site; run restricted operations under safety clearance; pause everything until checks are complete.
- **Record caption:** "Reported: a domain controller in Ghana was spared because a local power outage had taken it offline." **[Reported, unverified by me]**
- **Later:** a backup-power dip event **[S]**.

### Round 9. The story gets out · Days 6-10
- **Engine decision:** `r9_holding` / `r9_wait` / `r9_briefing`.
- **Situation:** Maersk made public statements from 27 June, saying systems were down, a recovery plan was under way, and later that there was no data breach **[D]**.
- **Panels:** a press room; a phone showing a headline; the Operations Manager and IT Lead disagreeing at a doorway.
- **Narration:** "Silence is also a statement." **[R]**
- **Choices (reworded):** issue a short factual holding statement; wait for more facts; arrange a coordinated briefing.
- **Record caption:** "Maersk said publicly that no data breach to third parties had occurred." **[D]**

### Round 10. Reopening · About Day 10
- **Engine decision:** `r10_verified` / `r10_sweep` / `r10_provisional`.
- **Situation:** core systems back after about ten days (per the chairman). Bookings mostly resumed after about 8 days, with full IT after about four weeks in other accounts **[D, sources differ]**.
- **Panels:** gates opening; trucks rolling; a final quiet panel of the team asleep or standing in a half-lit office.
- **Narration:** "Reopening is a promise. Whatever you trust will be tested by customers."
- **Choices (reworded):** reopen on verified data only; one last check, then reopen; reopen including doubtful records.

### Epilogue. What actually happened (outside the game)
Kept visibly separate from "what your choices did in this simulation".
- Maersk's own estimate was USD 200-300m **[D]**.
- The UK government (Feb 2018) and the US Department of Justice (Oct 2020 indictment) attributed the attack to Russian military intelligence. Russia denies it **[D as statements]**.
- Lessons from the first-hand account: plan for losing the whole directory, not one site; limit standing admin rights; use multi-factor authentication **[D, first-hand]**.
- Standing caution: **"This simulation explores possible outcomes. It does not show that any alternative would have prevented or shortened the real incident."**

## 6. Backend and compatibility check (scenario files only)

- Edits would be limited to `scenario/rounds.py`, `events.py`, `pages.py`, `risks.py`: wording, panel text, labels, overlay ids.
- Unchanged: the engine, rules, scoring formulas, every number, the schema, API shapes, and every choice and event id. Saves reference ids, so existing saved games stay loadable. Saved text would change after an update; that needs a test.
- **Outside `scenario/`:** names and display words such as "Arjun", "₹", "lakh" and "hospital" also appear in `stakeholders/agents.py` (advisor lines), `engine/engine.py` (2), and the scoring and report text (`report.py`, `rubric.py`, `analysis.py`). These affect advice and report wording. **Two options: (a) you let me edit display strings there (no logic), or (b) I only change the frontend, which keeps old names in advisor and report text.** I recommend (a). I have not touched these.
- Character ids (`arjun`, `kavya` ...) and environment ids stay as they are. The frontend shows role titles (IT Lead, Terminal Supervisor, Network Administrator, Operations Manager, Regional Coordinator, Recovery Team Lead, Customer Representative) and redraws each environment for its new meaning. This is not a vocabulary change.
- The existing cast has five advisors plus the player. The brief lists seven roles. Using all seven would need more than six character ids, which is a contract change. I propose six roles (dropping Regional Coordinator as a speaking role) unless you approve a vocabulary extension.

## 7. Open items before Stage 3

1. Approve this outline, or tell me what to change.
2. Choose (a) or (b) for display strings outside `scenario/`.
3. Accept six character roles, or approve extending the character vocabulary.
4. **Art source.** Your Stage 3 brief says SVG paths and layered vector shapes, which is what the current flat people already are. That conflicts with the earlier line "use actual image assets, do not draw people with SVG". I will follow the latest instruction (SVG vector) unless you say otherwise.
5. If you can, supply the Wired (Greenberg) text for the Ghana item, or I will keep it labelled "reported".
