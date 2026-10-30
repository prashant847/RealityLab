# Proposed rebase: NotPetya and Maersk (outline for approval, nothing implemented yet)

Status: **draft for review.** No story, code or art has been changed on this branch.
Checkpoint of the original: branch `checkpoint/pre-notpetya-2026-10-30`, tag `pre-notpetya-checkpoint`.

## How facts are labelled

| Tag | Meaning |
|---|---|
| **[F]** | Documented fact: stated by Maersk or reported consistently by several credible outlets |
| **[F?]** | Reported but from one source, or sources disagree. Shown with a hedge, or left out |
| **[R]** | Reconstructed scene. The event is documented, the exact words and visuals are ours |
| **[S]** | Simulation: a player choice or a hypothetical outcome. Never presented as history |

## Sources checked, and how well

I could read only some of these directly. The rest I know from search summaries, and the final story should be checked against the originals.

- Maersk Interim Report Q2 2017: via press coverage of it. The investor-site PDF returned 403.
  - Attack hit in the last week of the quarter, mainly Maersk Line, APM Terminals and Damco.
  - Contained 28 June. No data breach to third parties. Malware previously unseen. Impact estimate USD 200-300m.
- Jim Hagemann Snabe (Maersk chairman), Davos, January 2018: via ITPro, iTnews, SecurityAffairs.
  - "4,000 new servers, 45,000 new PCs and 2,500 applications... over ten days".
- Gavin Ashton, "Maersk, me & NotPetya" (read in full). First-hand account by a Maersk IT employee.
  - Devices went dark worldwide, then servers, then domain controllers.
  - Disaster-recovery plans assumed losing a site, not everything everywhere.
  - Active Directory was restored first. Windows 10 was chosen over a Windows 7 rollback.
  - Azure AD single sign-on had been enabled shortly before, so cloud mail stayed usable.
- Wikipedia, "2017 Ukraine ransomware attacks": read. Used only as a pointer to its cited sources.
  - M.E.Doc update as the likely entry point. EternalBlue and Mimikatz used for spread.
  - Fake USD 300 ransom, but the malware was effectively a wiper.
  - Attribution: UK Feb 2018, US indictment of six GRU officers Oct 2020. Russia denies it.
- Columbia SIPA NotPetya case study: not readable (compressed PDF). Cited sources not yet verified.
- Wired / Andy Greenberg (23 Aug 2018): **blocked, not read.** The Ghana domain-controller story and the roughly 150 domain controllers come from secondary summaries of it, so they are **[F?]**.

Disputed or single-source, so hedged or left out:

- Exact time of the first infection, and whether an Odessa employee was the entry point.
- A "13:21 Maersk confirms IT down" time.
- Total recovery time. "Ten days" is Snabe's figure for the core rebuild. Other reports say bookings mostly returned after about 8 days and full IT after about four weeks.
- 70,000 TEU lost volume.
- The Ghana domain controller and the hard-drive handover via Nigeria.
- Device counts. One case study says 49,000 laptops.

## What can be kept and what has to change

| Keep (mechanics and screens) | Change (story content) |
|---|---|
| Ten decision rounds, choices, consequences, rewind/replay, SQLite persistence | All text: briefs, panels, choices, consequences, endings, stakeholder names |
| The plain-language layer (Where we are / The problem / Your job), the glossary and the story-so-far recap | Setting: a shipping and ports company, not a medical-equipment maker. No medical framing |
| The comic engine and flat art style | Clock: the real event runs over days (see decision A) |
| Report: judged by what you knew, luck vs choice, alternatives | Resource labels (see decision B) |

## The ten rounds

Actors are unnamed roles, not real individuals. Real executives appear only as clearly sourced quotations in a "What the record says" caption, never as invented dialogue.

**Round 1. The screens go dark** (Tue 27 June, morning) **[F]** **[R]**
- Historical: workstations across the office go dark, then devices worldwide, then servers and domain controllers (Ashton, first-hand).
- Comic: wide office panel, monitors failing in a wave. Close-up of a black screen with a red ransom note. A worker looks to the observer.
- Narrator: "No one knows yet that this is not a fault."
- Decision **[S]**: (a) cut the network now across sites, (b) keep services up while IT investigates, (c) cut only the affected offices.
- Consequences: (a) spread stops sooner, but everything goes offline. (b) more machines are lost. (c) the malware keeps moving through unaffected links.
- Doc: Maersk's report says systems were shut down and the attack was contained 28 June.
- Leads to: the whole company is now offline and must decide what to tell people.

**Round 2. What do we tell customers?** (midday 27 June) **[F]** **[R]**
- Historical: bookings and terminals are affected. Maersk published that its IT systems were down.
- Comic: phone-bank panel, a ship's agent waiting outside a gate, and a customer-service screen showing nothing.
- Decision **[S]**: (a) say everything known, including that cause and scale are unclear, (b) a short holding statement, (c) stay silent until sure.
- Consequences: trust and confusion trade off. Nothing in the record tells us which would have been better.
- Leads to: customers act on what you said, and the terminals need orders.

**Round 3. Terminals without systems** (27-28 June) **[F]** **[R]**
- Historical: ports and terminals were affected. APM Terminals Rotterdam was reported inactive for a few days **[F?]**. Operations fell back to manual processes (iTnews).
- Comic: a quayside with cranes, trucks waiting at a gate, paper lists, a worker with a radio.
- Decision **[S]**: (a) run manually with paper and phones, (b) stop affected terminals until systems are back, (c) run only priority cargo.
- Consequences: throughput versus errors versus safety. All are trade-offs.
- Leads to: someone asks whether paying the ransom would restore anything.

**Round 4. Is it ransomware?** (28 June) **[F]** **[R]**
- Historical: the note asked for USD 300 in Bitcoin, but the malware worked as a wiper, so payment could not restore data. The attack was contained 28 June.
- Comic: a split panel of the ransom screen against the wiped disk, plus an analyst reading logs.
- Decision **[S]**: (a) investigate before any decision, (b) treat as a wiper and plan rebuild, (c) look at paying.
- Consequences: (c) costs time and does not help, as the later record shows. Whether Maersk was actually asked to pay is not documented and is not claimed.
- Leads to: the real problem is the identity directory.

**Round 5. The directory is gone** (28-29 June) **[F]** **[F?]**
- Historical: Active Directory was destroyed. Recovery plans covered losing a site, not everything (Ashton). One surviving copy in Ghana is reported by secondary sources **[F?]**.
- Comic: a server room with dead racks, a map with lights going out, and a lone machine marked offline.
- Decision **[S]**: (a) search globally for any surviving copy, (b) rebuild from scratch, (c) call outside vendors first.
- Consequences: a global search is faster if a copy exists. A rebuild needs no luck but is slower.
- Leads to: getting the data out.

**Round 6. Moving the data** (29 June - early July) **[F?]** **[R]**
- Historical: a reconstructed account says weak bandwidth and a courier handover were used. Single-source, so shown as "reported".
- Comic: a car, an airport hall, a drive in a bag.
- Decision **[S]**: (a) courier it, (b) try the network anyway, (c) split it across routes.
- Consequences: speed versus risk of loss. Hypothetical.
- Leads to: a directory exists again, and everything depends on rebuild order.

**Round 7. What to rebuild first** (first days of July) **[F]** **[R]**
- Historical: directory services were restored first, and the rebuild covered thousands of servers and tens of thousands of PCs (Snabe, Davos 2018). Maersk later said it would normally take far longer.
- Comic: lines of laptops on a table, a whiteboard with a priority list.
- Decision **[S]**: (a) booking and terminal systems first, (b) staff laptops first, (c) security hardening first.
- Consequences: each helps one side of the business and delays another.
- Leads to: the people doing the work.

**Round 8. The people doing the work** (first week) **[F]** **[R]**
- Historical: staff flew in with equipment and worked round the clock. Ashton describes a human cost.
- Comic: a person asleep on a desk, a shift board, a team arriving at a door.
- Decision **[S]**: (a) enforce rest rotations, (b) keep everyone on until it is done, (c) bring in outside staff.
- Consequences: fewer errors versus slower recovery. Hypothetical.
- Leads to: rebuilding in a safer way.

**Round 9. Rebuild safer, or rebuild the same?** (first two weeks) **[F]**
- Historical: Windows 10 was chosen over a Windows 7 rollback, admin rights were reduced, and tiered admin access plus MFA were adopted (Ashton).
- Comic: a laptop being imaged from a USB stick, a closed door marked "admin only".
- Decision **[S]**: (a) harden as you rebuild, (b) restore as fast as possible and harden later, (c) split by priority.
- Consequences: speed now versus risk later.
- Leads to: reopening.

**Round 10. Reopening and the record** (about 8 to 10 days on, and after) **[F]** **[F?]**
- Historical: bookings returned within days. Maersk reported USD 200-300m in impact, mostly in Maersk Line. Governments later attributed the attack to Russia's military intelligence (UK Feb 2018, US indictment Oct 2020), which Russia denies.
- Comic: ships and gates moving again, then a closing panel with a plain "what actually happened" caption.
- Decision **[S]**: (a) phased restart, (b) full restart, (c) wait for a security review.
- Ending: a "what actually happened" page, kept visibly separate from "what your choices did in this simulation". It states that alternatives are hypothetical and that nothing here shows any single decision would have changed the real outcome.

## Comic storytelling plan, once approved

- A third-person narrator in caption boxes drives each page. The player is an observer, with no player-character in every scene.
- Close-ups only when someone speaks or acts. Quiet panels show the place and objects, and speakers can glance at the observer.
- Varied layouts per beat: a wide establishing panel, an evidence close-up, a tall tension panel, a small reaction panel.
- Historical captions are tagged "The record", reconstructed lines "Reconstructed", player outcomes "In this simulation".

## Decisions I need from you

- **A. The title and clock.** The real event is days, not 24 hours. Options: rename and use day/time labels across about 10 days (my suggestion), or compress to "first 24 hours" only (fewer documented events).
- **B. Backend text and mechanics.** The choices, endings and stakeholder text live in `backend/app/scenario`. A real rebase means editing that text. I would keep the engine, the rules, the numbers and the database schema and change wording and labels only, and re-label the shipping meters as priority and key-account cargo. This reverses your earlier "do not touch the backend". Do you allow it?
- **C. Art.** Your new brief says to use image assets and not draw people with SVG shapes. The current people are drawn in SVG, and your earlier rules said no AI-generated images. What would you like me to do about the source of character art? I can't generate or source new image files myself without breaking one of those rules.
- **D. Existing characters.** The current fictional cast would become unnamed roles ("the IT lead", "the terminal supervisor") so no real person is depicted. OK?
