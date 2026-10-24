# Planning the scene

Everything here happens before geometry. A plausible scene that matches nothing is the most common way a build fails.

## Contents
- Premise as a verb
- The scene router
- If the router misses
- The assumption line
- Cast and beat sheets
- The detail bar

## Premise as a verb

Write the premise as one sentence: **[place] + [a repeated action] + [who or what interrupts it] + [payoff]**. "A bakery at closing: the baker sells the last loaves, an inspector walks in, the sign flips before she reaches the counter." A subject with no verb is a shelf model, not a diorama — even a quiet scene needs a ritual (laps in a pool, a lighthouse sweep) and a residue (towel left, light fails).

## The scene router

Pick the closest row instead of inventing a structure from scratch:

| The prompt is... | Systems/props | Cast | What goes wrong |
|---|---|---|---|
| fight, battle, arena | arena floor, gates, effects anchors | 2 fighters + effects | one goes down, recall/finish |
| sport, court, field | court lines, hoops/goals, benches | 4–6 players | a scored point |
| market, bakery, cafe, food truck | stalls, oven, counter, till | vendors, customers, courier | closing time / service rush |
| pool, harbour, aquarium | water, slides, pumps, lights | swimmers, lifeguard | a dive, a storm, feeding |
| street, heist, transit | vehicles, doors, signals | crew, guards, commuters | arrival / getaway / last departure |
| farm, garden, nature | beds, tools, weather vane | animals, farmer | harvest, storm |
| stage, festival | stage, lights, rides | performers, crowd | the climax |

If none fit, answer four questions about the noun: what does this place repeat, who operates it, what interrupts it, and what visibly changes afterwards. Those answers are the systems, cast, disruption and residue.

## If the router misses

Don't freeze. Any subject works if it gets: 3–5 systems or props that do something, 3–6 actors with jobs, one interruption, and five beats (establish → first output → interruption → contact/finale → residue and loop seam). No combat required — a deadline, an inspection or a closing bell is a valid boss.

## The assumption line

When the user gave a one-line prompt and the scene is decidable, state the choices in one line and build in the same turn — don't wait for approval:

> Assumption: court scene, 8 s loop, 5 players plus a scored basket, 4 px pixels, React + three. Say if you want a different scale or cast.

That line is the contract: it lets the user redirect after seeing the choices, without blocking the build. Still ask first when the scene itself is unclear (who, what happens, mood) — the router fills structure, not the subject.

## Cast and beat sheets

Before modelling, write two small tables (in the project README or a DESIGN.md for bigger builds):

```
CAST   role | silhouette feature | how it moves | its action | its exit
BEATS  0.0 establish  ·  2.0 first system output  ·  4.5 interruption
       6.0 contact / finale  ·  8.0 residue + loop seam
```

Rules:
- A beat without a timestamp isn't staged. Pick the timestamps now — they double as the QA frames (see verification.md).
- If a role has no action, cut it. If a system has no visible consequence, cut it.
- Name every hero object (`oven`, `gatehouse`, `fox`), not `prop12`. Unnamed objects become clutter because nobody owns their silhouette.
- If time is tight, cut the number of systems or actors — never the detail per hero or the animation layers. Two rich actors beat six blockouts.

## The detail bar

"Aim for rich scenes" in SKILL.md is the goal; this is the test. Every hero object survives three passes:

1. **Silhouette.** Recognisable from its outline at 1:1 in about 0.2 s, before colour or detail.
2. **Construction.** The silhouette is explained by visible assemblies: posts, rails, bands, hinges, wheels, fasteners. A single primitive is a placeholder — a box gets a chamfer or plank divisions, a sphere gets ties or a snout, a cylinder gets a cap or rings.
3. **Story.** One detail says who used it: a chipped edge, a repair strap, a rag, tally marks, a spent shell. If removing it changes nothing, it's greeble, not story.

Plus four grounding rules:

- **Every prop touches the ground** — feet, wheels, a base, a contact shadow. A prop hovering two centimetres is the most common "looks cheap" report. Check the lowest vertex, not the group origin.
- **One landmark per silhouette.** Two identical towers or trees read as duplication, not composition. Move, scale or redesign the second.
- **Clear thresholds.** Keep empty ground in front of doors, gates and spawn points — no crates, smoke or props in that pocket.
- **Detail lives on the camera-facing surfaces.** Model the front and top; simplify the back. Don't add detail below ~1.5 screen pixels: it aliases into speckle (see SKILL.md's default numbers).
