# Verification

A screenshot is evidence; a lucky capture is not. Verify before calling a scene done.

## Contents
- Freeze any frame
- Proof frames per beat
- Numbers the eye forgives
- Motion strips
- Long builds and context

## Freeze any frame

Drive animation from `t` so the scene can be frozen at any second and screenshotted deterministically — seeded randomness (SKILL.md checklist) plus no accumulated state that depends on frame history. If the build supports it, expose a debug hook:

```js
window.__diorama = { scene, camera, renderer, freeze(t) { /* draw frame t synchronously */ } };
```

`freeze(t)` must draw synchronously. A screenshot that races the render loop may show a different frame than asked for, and then it proves nothing. In plain HTML, a `?t=12.4` query param that renders one frozen frame works just as well.

## Proof frames per beat

Take the beat sheet from planning.md and capture every beat:

1. Freeze at each beat timestamp and screenshot (or render one frame and save it).
2. Read the captures side by side with any reference frames the user gave (or the ones extracted in workflow step 1).
3. Anything that needs a caption to explain is not finished — fix the frame, not the description.

Keep the captures (`shots/t-06.00.png`) next to the build so the next session can re-read them without re-running anything.

## Numbers the eye forgives

At 300 px the eye forgives a lot. Check these with code instead:

- **Console errors**: zero, including the first second after load.
- **NaN scan**: walk every mesh's position/scale once per second of the loop; any NaN fails.
- **Stuck actors**: sample each actor's world position across the loop. A flat line for a hero actor means it isn't animating.
- **Teleports**: frame-to-frame jumps larger than `speed × dt` mean a state boundary is snapping instead of blending.
- **Off-screen actors**: project each actor to NDC at its beat; outside ±1 means the staging or framing is wrong.
- **Facing**: for anything the viewer must read (faces, signs, screens), dot its forward with the camera direction; it should point toward the camera side.

## Motion strips

For any action with contact (a throw, a dunk, a door opening), capture a strip of 6–9 frames across the action window and tile them (`ffmpeg -i frames/%02d.png -vf tile=3x3 strip.png`). Contact moments fail in singles and read instantly in strips: palms off the ball, feet through the floor, a prop teleporting between hands.

## Long builds and context

Big scenes run for many turns and the conversation may be compacted; compaction is lossy. Build so a compact doesn't cost the work:

- **State lives in files, not chat.** The beat sheet, the cast table and the QA captures carry every decision. If a fact only exists in a message, it's already gone.
- **Name the shots.** `shots/t-12.40.png` is a stable handle a later session can re-read.
- **Re-derive, don't remember.** After a compact, re-freeze a beat frame rather than trusting a summary of what it looked like — the numbers are cheap and a confident memory of an old frame is the most expensive thing in the session.
