# Characters and props in code

No model files. Two methods, often mixed in one scene.

## Contents
- Which method
- Method A: basic shapes with pivots
- Method B: pixel drawings turned into cubes
- Animating characters
- Props cookbook
- Original characters only

## Which method

| The thing is... | Use | Why |
|---|---|---|
| A person or animal that walks, throws, juggles, fights | A: shapes + pivots | Joints are easy: rotate a pivot and the limb swings. |
| Big environment: courts, floors, benches, buildings, trees, rocks | A: shapes | A few boxes and low-poly shapes cover it, and they're cheap. |
| A mascot, logo, icon, or sprite the user already has as pixel art | B: pixel grid | Users can edit it like a drawing; it stays faithful to their art. |
| A small creature, item or pickup that should look "chunky pixel" | B: pixel grid | The cube look reads as pixel art from every angle. |
| A creature with a weird shape (blob, golem made of rocks, segmented snake) | A, with repeated parts | Chains of spheres or boxes animate well along a curve. |

Mixing is normal. A typical scene uses shapes for the world and pixel grids for the hero.

**Scale.** With the default camera (`viewHeight` 8, about 200 art pixels tall), one world unit is about 25 art pixels. A person 2 units tall is about 50 art pixels, and a small creature 0.6 units tall is about 15. Below about 10 art pixels, details vanish, so exaggerate: big heads, thick limbs, and strong color contrast between body parts.

## Method A: basic shapes with pivots

Build every character the same way:

```
character (Group)          ← move/turn the whole character here
├── hips (pivot)           ← bob / lean
│   ├── torso
│   ├── neck (pivot) → head
│   ├── shoulderL (pivot) → upperArm → elbowL (pivot) → forearm
│   └── shoulderR (pivot) → ...
├── hipL (pivot) → leg
└── hipR (pivot) → leg
```

A pivot sits at the joint. The limb inside it is shifted by half its length so it hangs from the joint:

```js
const shoulderR = pivot(0.4, 1.56, 0);            // at the shoulder
const arm = box(0.16, 0.7, 0.16, skinMat);
arm.position.y = -0.35;                           // hang down from the joint
shoulderR.add(arm);
// later: shoulderR.rotation.x = -1.2  → arm swings forward
```

Rotation directions, for a limb that hangs down along -y in a character facing +z:
- `rotation.x` negative swings it forward and positive swings it back.
- `rotation.z` positive on the right side (+x) lifts it out to the side. The left side is mirrored.

Shape tips:
- Use boxes for almost everything. At this resolution a box reads as a limb.
- For round things (heads of creatures, balls, rocks), use low-segment spheres (`SphereGeometry(r, 6, 4)`), `IcosahedronGeometry(r, 0)` or `DodecahedronGeometry(r, 0)` with `flatShading: true`. The facets give nice pixel shading.
- Use striped or patterned clothing with a tiny canvas texture (16 px, `NearestFilter`). A 16 px texture with 2 px stripes gives 4 stripes per face.
- Make faces with one or two dark pixels: tiny boxes for eyes slightly in front of the head. Skip mouths unless the head is large.
- Set `castShadow` on every character part. The shadow on the ground does a lot of work selling the 3D.

## Method B: pixel drawings turned into cubes

```js
const palette = { o: "#2b2b38", w: "#f2f2f2", c: "#4fc3f7", y: "#ffd54f" };
const robot = voxelsFromRows([
  "..ooooo..",
  ".owwwwwo.",
  ".owcwcwo.",
  ".owwwwwo.",
  "..ooooo..",
  "...oyo...",
  "..ooooo..",
  ".o.ooo.o.",
  "...o.o...",
], palette, { size: 0.09, depth: 3 });
scene.add(robot);
```

- Each letter is one cube, and `.` is empty. Top row first. `depth` repeats the drawing front to back for thickness.
- For a true 3D shape, use `voxelsFromSlices([frontLayer, middleLayer, backLayer], palette)`. Each layer is its own drawing, which lets the back look different from the front.
- **Cube size** sets the look. `size` equal to one art pixel (about 0.04 with defaults) looks like a flat sprite. Two or three art pixels per cube (0.08–0.12) looks like chunky voxel art and survives rotation better.
- **Moving parts** must be separate drawings in pivots, just like Method A. For example, draw the arm as its own 1×4 grid, put it in a pivot at the shoulder, and rotate it.
- **Expressions and frame-by-frame animation**: build two versions (eyes open and closed, walk pose 1 and 2) and swap `visible` on a timer. This is the voxel version of a sprite flipbook.
- **A user's existing pixel art** (a mascot, a pfp): copy its pixels into the grid, one letter per color. If they upload an image, read the pixels with a short script and generate the grid strings instead of typing them by hand.
- `voxelsFromSlices` uses `InstancedMesh`, one draw call per color, so a few thousand cubes are fine.

## Animating characters

Everything is driven by time `t`. Use sine waves for loops and offset the phase for opposite limbs.

**Walk cycle** (shapes):
```js
const w = t * 8;                                  // step speed
hipL.rotation.x = Math.sin(w) * 0.6;
hipR.rotation.x = Math.sin(w + Math.PI) * 0.6;
shoulderL.rotation.x = Math.sin(w + Math.PI) * 0.5; // arms opposite to legs
shoulderR.rotation.x = Math.sin(w) * 0.5;
body.position.y = Math.abs(Math.sin(w)) * 0.06;    // bob twice per cycle
```
Match the step speed to the movement speed, or the feet will slide. Roughly, `stepSpeed ≈ moveSpeed * 5` for a 0.9-unit leg.

**Idle**: a slow body bob (`sin(t*2)*0.02`) and a blink (hide the eyes for 0.12 s every 3–4 s). A still character looks dead, and these two lines fix it.

**Facing**: `createWalker` turns the character toward its next point. For anything else, use `obj.rotation.y = Math.atan2(dx, dz)`.

**Squash and stretch** for hops, landings and hits: `scale.set(1 + s, 1 - s, 1 + s)` for a short moment. Keep `s` under 0.25.

**Throws and jumps** follow a parabola. Given `p` from 0 to 1, height is `y = start + 4 * h * p * (1 - p)`, and x and z move linearly.

**Stepped poses** for a hand-animated feel: compute poses from `Math.floor(t * 12) / 12` instead of `t`, which gives 12 poses per second. Leave the camera and particles smooth.

## Props cookbook

All of these are a few lines with `box()` and low-poly shapes:
- **Tree**: a cylinder trunk with 2–3 `IcosahedronGeometry(r, 0)` blobs, `flatShading`, in two greens.
- **Rock**: `DodecahedronGeometry(r, 0)` scaled unevenly (`scale.set(1, 0.6, 0.8)`), flat shaded grey.
- **Bench, crate, table**: boxes. Add a 16 px canvas texture for wood grain or wicker.
- **Lamp post or hoop pole**: a thin box or cylinder plus a box on top. A basketball hoop is a pole, a board (flat box with a canvas-drawn square), and a ring (`TorusGeometry(r, 0.03, 4, 12)`).
- **Court or arena floor**: a flat box or plane with a canvas texture. Draw the lines with `fillRect` at texture resolution so the lines stay 1 art pixel wide.
- **Cracks or scorch marks**: a plane slightly above the floor with a canvas texture of dark lines, plus `alphaTest`.
- **Small scattered stones and pebbles**: an `InstancedMesh` of tiny dodecahedrons at seeded-random positions.

## Original characters only

If the user asks for a scene "like" a game or show with famous characters (Pokémon, Mario, Disney and so on), build original characters with the same energy: a fire fox instead of a known starter, a rock golem instead of a known rock snake. Say so in one line, then make them. Don't recreate recognizable designs, color schemes plus silhouettes included, and don't put the IP's names in the scene.
