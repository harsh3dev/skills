# Motion and effects

## Contents
- Time and loops
- The animation bar
- Timing a single action
- Many actors (sports, crowds, traffic)
- Scripted sequences (fights, stories)
- Camera moves
- Effects recipes: lightning, dust and smoke, fire, sparks and spray, projectiles and beams, shockwaves, hit flash, cracks, teleport

## Time and loops

- Keep one time value `t` (seconds), advanced by `dt` each frame and frozen while paused. Drive everything from `t` and `dt`. Never count frames, because 120 Hz screens would play double speed.
- Cap `dt` (`Math.min(0.05, dt)`). After a tab switch, a huge `dt` otherwise teleports everything.
- **Seamless loops**: pick one loop length `L` and make every cycle divide into it. If the loop is 6 s, a walk cycle of 0.75 s and a bob of 3 s both fit. Then `t % L` restarts cleanly. Background scenes (hero sections) should loop. Story scenes can either loop with a reset or end on a calm idle.

## The animation bar

An actor counts as animated when it has all five layers, not just a walk cycle:

1. **Idle** — breathing, sway, scan, flicker. The environment needs at least two ambient loops too.
2. **Locomotion** — distance-driven walk/run with feet planted, not sliding.
3. **Action** — a readable wind-up, contact and recovery (throw, shoot, open, dive).
4. **Reaction** — a flinch, knockback, squash or look-up that recovers to the same pose.
5. **Exit / consequence** — the actor leaves or the place changes: walks out with the bag, a door closes, a stain or dropped item remains. The scene must show the actor changed it.

Background actors need 1, 2 and 5. Hero actors need all five. A prop with a moving part (flag, wheel, door) needs its own loop. Nothing at hero scale is static — a character that slides without a step reads as unfinished even with good geometry.

## Timing a single action

When the user shared a video or GIF of the action, count frames at a known fps and convert: `seconds = frames / fps`. Then write four lines before animating:

```
wind-up   0.00 -> 0.42   weight back, anticipation
contact   0.42 -> 0.55   fastest frames, one pose held
follow    0.55 -> 0.90   overshoot, then settle
recover   0.90 -> 1.30   back to idle
```

Every attack, throw or dunk needs all four. Missing anticipation is why an action reads as "it just happens"; missing follow-through is why it reads as "it snaps back". Scale the four numbers to the loop length you're building.

## Many actors (sports, crowds, traffic)

Give each actor a route, and use `createWalker(obj, points, { speed })` from pixelkit. To make a scene like a pickup basketball game look alive:
- Use different speeds and start points per player so they never move in sync.
- Give each player a small state machine: `run → wait → pass/shoot → run`. Keep it simple:

```js
const player = { obj, state: "run", timer: 0, walker: createWalker(obj, route, { speed: 1.6 }) };
function updatePlayer(p, dt) {
  p.timer -= dt;
  if (p.state === "run" && !p.walker(dt)) { p.state = "wait"; p.timer = 0.6; }
  else if (p.state === "wait" && p.timer <= 0) { p.state = "run"; }
}
```

- **The ball follows the story, not physics.** Decide who has it. While held, glue it to that player's hand position (`hand.getWorldPosition(v)`). For a pass, fly it on a parabola from the passer's hand to the receiver's hand over 0.5–0.8 s and hand it over at the end. For a shot, fly it to the rim, then drop it straight down through the hoop with a small bounce.
- For dribbling, ball height is `handY - abs(sin(t * 10)) * handY` while running.
- Use seeded random choices (who to pass to, when to shoot) so the scene varies but doesn't break.

## Scripted sequences (fights, stories)

Use `createTimeline` from pixelkit. Write the whole sequence as a list, like a screenplay:

```js
const tl = createTimeline([
  { at: 0.0, dur: 0.6, update: (p) => { fox.position.x = lerp(-2, -1.2, ease.out(p)); } }, // step in
  { at: 0.6, run: () => roar() },
  { at: 1.0, dur: 0.4, update: (p) => zoomTo(1.6, p) },                                   // camera push-in
  { at: 1.2, dur: 0.5, update: (p) => boltBetween(fox, golem, p) },                       // attack
  { at: 1.7, run: () => { hitFlash(golem); shake(0.25); dust(golem.position); } },        // impact
  { at: 2.6, dur: 0.6, update: (p) => zoomTo(1.0, p) },                                   // ease back out
  { at: 4.0, run: () => {} },                                                             // hold before looping
]);
// in the loop: tl.update(t);
```

Pacing that reads well: anticipation (0.2–0.4 s wind-up), action (fast, 0.1–0.3 s), impact (flash, shake, particles all on the same frame), then a recovery hold (0.5–1 s) before the next beat. Readers need the holds, and battles without them feel noisy.

## Camera moves

All with an orthographic camera:
- **Zoom**: change `camera.zoom` (1 = default) and call `camera.updateProjectionMatrix()`. Pixels stay the same size on screen and objects get bigger, which is the authentic pixel-art zoom. Don't scale the canvas.
- **Pan or follow**: move the look-at target, easing toward it with `target.lerp(goal, 1 - Math.pow(0.001, dt))`. Then call `placeIsoCamera(camera, { target })`.
- **Shake**: add a small random offset to the target for 0.2–0.3 s, fading out. Use whole art pixels, about `2 * pixelWorldSize`, so the shake looks like pixel jumps, not blur.
- **Shimmer fix**: after every camera move, call `snapCameraToPixels(camera, view.renderHeight)`. See polish.md.
- **Rotation** (orbiting) always shimmers a bit at low resolution. Use it slowly, or avoid it for hero sections.

## Effects recipes

Low resolution makes simple effects look good. A handful of boxes or points reads as a strong effect. Use `MeshBasicMaterial` (unlit) for anything that glows, so shadows and shading don't dull it.

**Lightning** uses `createBolt`. While the attack is active, call `bolt.zap(from, to)` every 0.04–0.06 s so it flickers into new shapes. Add 2–3 short side branches (smaller bolts from a random point on the main one). On the strike frame, raise the hemisphere light intensity for 2 frames for a scene flash. A yellow core with a white 1-pixel inner bolt (a second, thinner bolt) looks great.

**Dust and smoke** use `createPuffs`. On impact, spawn 6–10 puffs in a ring around the hit point with outward `vx`/`vz` and a small `vy`. Use beige for dirt, grey for smoke, and white for steam (spawn one every 0.3 s, slow rise, longer life).

**Fire** uses `createPuffs` with color stages. Spawn yellow small puffs at the base, orange mid-size, and red large ones higher up, all rising (`vy` 1–1.5) and short-lived (0.4–0.6 s). Add a `PointLight` with flickering intensity for warm light on nearby objects.

**Sparks, water spray, rain, embers** use `createParticles`. Size is 1–2 art pixels. Water: blue-white, upward arc velocity, gravity -6. Sparks: yellow, fast outward, short life. Rain: thin, fast down, respawn at the top.

**Projectiles and beams.** A projectile is a small box or icosahedron moving along a line or parabola, with particles spawned behind it each frame as a trail. A beam is a long thin box from A to B, scaled from 0 to full length, held, then shrunk. A "return" or capture beam is the same in red, ending with the target shrinking (`scale → 0`) while flashing (below).

**Shockwave** is a flat `RingGeometry` on the ground (`MeshBasicMaterial`, `side: DoubleSide`). Scale it from 0.2 to 3 over 0.3 s and drop opacity to 0 (`transparent: true`), or hide it at the end for a harder pixel look.

**Hit flash**: set the material's `emissive` to white (Lambert supports it) for 0.06 s, twice. For voxel characters, loop over the group's instanced meshes. Pair it with knockback (shift 0.2 units away), the camera shake, and dust, all on the same frame.

**Cracks** are a decal plane slightly above the floor with a canvas texture of jagged dark lines from a center point, plus `alphaTest`. Show it on impact and keep it until the loop resets.

**Teleport, appear, disappear**: scale the y-axis to 0 over 0.2 s while flashing, with a column of particles rising. Reverse it to appear.
