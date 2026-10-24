---
name: pixel-diorama
description: Build animated 3D scenes that look like pixel art — small isometric dioramas (a juggler on a grass island, a pickup basketball court, a creature battle with lightning) rendered live in the browser with three.js at low resolution and scaled up with crisp pixels, with every character and prop made in code (no 3D model files). Use this skill whenever the user wants a pixel-art style animation, "3D pixel art", an isometric pixel scene or tiny animated world, a pixel mascot that moves in 3D, or an animated hero/background component in this style for a website — including when they only share a video, GIF or screenshot of this look and ask how to make it, or say things like "low-res 3D", "pixelated three.js", or "like t3ssel8r". Covers React + three.js, React Three Fiber and plain HTML, characters from basic shapes or pixel grids turned into cubes, animation, effects (lightning, dust, fire, sparks, camera zoom/shake) and polish (outlines, palette, pixel-snapped camera).
---

# Pixel Diorama

Tiny isometric 3D scenes that look like hand-made pixel art and animate live in the browser. Everything is built in code: no model files, no image assets.

## How the look works

Four things create the style. Get them right first, because they matter more than any amount of model detail. Detail below the pixel size simply disappears.

1. **Render small, show big.** Draw the scene to a canvas 3–5× smaller than its size on the page, then stretch it with CSS `image-rendering: pixelated`, with `antialias: false` and `setPixelRatio(1)`. This turns every 3D shape into crisp pixel art automatically, and it's the main trick.
2. **Orthographic camera at an isometric angle.** There's no perspective shrinking, so it reads like a game map. Zoom with `camera.zoom`, never by scaling the canvas, so pixels stay the same size on screen while things get bigger. That's how real pixel art zooms.
3. **Simple light.** Use one sun with hard shadows (`BasicShadowMap`), a soft hemisphere fill, Lambert materials, and flat shading on round things. Hard shadows on the ground sell the 3D more than anything else.
4. **Tiny crisp textures and dotted edges.** Canvas-drawn textures with `NearestFilter`, about 1 texel per art pixel. Ground edges break up into scattered pixels (random alpha + `alphaTest`) instead of ending in a clean line. Use a transparent background so the diorama floats on the page.

## Aim for rich, detailed scenes

A sparse scene looks like a tech demo. Every diorama should feel like a hand-crafted little world with a clear 3D read:

- **Fill the stage.** Beyond the main actors, add props at different scales and depths — foreground, middle, background — so the isometric angle reads as real 3D space. Empty ground is a missed opportunity.
- **Vary height and silhouette.** Flat islands look 2D. Stack crates, raise platforms, add trees, lamps, flags, rocks — anything that breaks the skyline and casts shadows.
- **Sell the 3D with light and motion.** Hard shadows under everything, drifting particles (dust, sparks, steam, leaves), and small secondary animations (bobbing, swaying, flickering) so the scene feels alive, not a static model.
- **Texture the surfaces.** Dotted ground edges, scattered pixels, and mixed floor materials (grass, dirt, wood planks) at the pixel scale — detail below the pixel size disappears, so spend detail at the pixel scale.

`assets/pixelkit.js` implements all four plus characters, motion and effects. Use it instead of rewriting these pieces. In a project, import it. For a single-file artifact or one HTML file, copy only the helpers the scene uses (plus anything they call) and drop the `export` keywords.

### Default numbers

| Setting | Default | Notes |
|---|---|---|
| Pixel size (screen px per art px) | 4 | 3 = finer, 5–6 = chunkier |
| Render height | ~150–250 art px | Follows from container height ÷ pixel size |
| `viewHeight` (world units visible top to bottom) | 8 | 1 unit ≈ 25 art px |
| Main character height | 1.5–2.2 units | Below ~10 art px tall, details vanish, so exaggerate |
| Texture size | ≈ (surface size ÷ viewHeight) × render height | Round down to 16/32/64/128; bigger textures sparkle |
| Camera | azimuth π/4, elevation ~0.65 rad | `placeIsoCamera` |

## Workflow

1. **Understand the scene — ask if it isn't given.** List the stage (ground shape, floor), props, actors, what moves, any effects, and whether it loops (hero background) or tells a short story (a fight). Note whether the camera stays still or moves. If the user shared a video, extract frames (`ffmpeg -i in.mp4 -vf fps=1,scale=320:-1,tile=5x4 sheet.png`) and study the pixel size, camera angle, palette and what moves. **If the user hasn't described the scene or story, or it's too vague to list the pieces above, ask for it before building**: what's in the scene, who the characters are, what happens, and the mood. Once the scene is clear, make the remaining choices yourself and state them briefly, rather than asking many questions.
2. **Pick the stack from the project — confirm before building.** Read `references/stacks.md`. First look at the project the scene will be integrated into and pick the matching stack:
   - An existing React + three.js project (Next.js, Vite, CRA) → React + plain three, starting from `assets/starter-react.jsx`.
   - The project already uses R3F → R3F.
   - A plain HTML site or "one file to drop in" → plain HTML.
   - Previewing in claude.ai → React + plain three, starting from `assets/starter-react.jsx`. R3F is not available in artifacts.
   
   If the target project or its stack isn't clear from context, **ask the user which stack to build for**. Even when the project makes the choice obvious, state the stack you picked and why, and confirm it with the user before writing code.
3. **Build the stage first** (ground, floor, big props) and check that it fits the frame. Dioramas look best as an island floating in space, filling about 70–85% of the frame width. Check this with numbers before writing more code:
   - The visible width is `viewHeight × aspect`.
   - A circle of diameter D looks D wide on screen.
   - A square or rectangle seen corner-on (the default camera) looks about `(width + depth) ÷ 1.41` wide, and a square of side L about `1.41 × L` wide.
   - Tall things add about `height × 0.8` above the ground's top edge.
   
   **Check facing too.** The default camera looks from the +x/+z side, so faces, screens, signs and anything the viewer must see should point roughly toward +x/+z. If two things must face each other (a robot and its laptop, two fighters), set them on a diagonal or side-on so the camera sees both, or accept seeing the back of one and make that back interesting.
4. **Build the characters.** Read `references/characters.md`. Use shapes with pivots for anything with joints or big environment pieces. Use pixel grids turned into cubes for mascots, sprites the user already has, and small chunky creatures or items. Mix both freely.
5. **Add motion and effects.** Read `references/motion-and-effects.md`. Drive everything from time. Use `createWalker` for many actors, `createTimeline` for scripted sequences, and the particle, puff and bolt helpers for effects.
6. **Polish only if it helps.** Read `references/polish.md`. If the camera moves, snap it to pixels. Add outlines for busy scenes and a limited palette for a strict retro look.
7. **Finish as a proper component** using the checklist below, then explain the result in plain words (see "Talking to the user").

## Component checklist

These matter because the component will live on a real website:
- The background is transparent, and the scene sizes itself to its container (ResizeObserver). The pixel size stays the same on resize.
- The mount element has its own size (`aspect-ratio` or a height), because the canvas is sized from it.
- Cleanup on unmount: cancel the animation frame, disconnect observers, dispose geometries, materials, textures and the renderer, and remove the canvas. Leaks pile up fast during hot reload.
- `prefers-reduced-motion` starts it paused, or shows one still frame.
- Rendering pauses when the scene is off-screen (IntersectionObserver).
- Randomness is seeded (`rng(seed)`) so the scene looks the same on every load.
- Time comes from `dt` (capped at 0.05 s), never frame counts.
- Useful props: `pixelSize`, `paused`. A pixel-size slider is a great teaching aid when the user is learning, so include one in demos.
- `role="img"` and an `aria-label` describe the scene.

**claude.ai artifact limits:** three is r128 there. `CapsuleGeometry` doesn't exist, and addons (OrbitControls, GLTFLoader, EffectComposer) can't be imported. Pixelkit is written for r128, and its post pass replaces EffectComposer. No `localStorage`. Put CSS and JS in one file.

## Talking to the user

People asking for this are often seeing the technique for the first time. After building, explain in a few plain sentences:
- the trick (rendered small, then stretched without smoothing);
- how each character was made;
- the two or three places to edit to change things.

Mention what you chose and why when it wasn't specified (stack, character method), and one natural next step. Keep the jargon low unless the user is clearly experienced.

If the user's reference uses famous characters (Pokémon, Mario, Disney and so on), build original characters with the same feel and say so in one line. See the end of `references/characters.md`.

## Files

- `assets/pixelkit.js`: helpers covering the renderer and camera setup, textures, shapes and voxels, walkers, timeline, particles, puffs, lightning, the outline and palette post pass, and cleanup. Import it in projects; in single-file artifacts, paste only the functions you use (drop the `export` keyword).
- `assets/starter-react.jsx`: a runnable React + three component with the full setup and controls. Edit `buildScene()` and `updateScene(s, t, dt)`. For camera moves, set `s.zoom` and `s.snapCamera = true` in the scene state and the component handles the rest.
- `references/stacks.md`: setup for React + three, R3F and plain HTML, plus Next.js and Vite notes.
- `references/characters.md`: choosing between shapes and pixel grids, rigs with pivots, walk cycles, a props cookbook, and the originality rule.
- `references/motion-and-effects.md`: loops, many actors, timelines, camera moves, and effect recipes.
- `references/polish.md`: camera snapping, outlines, palette, dithering, and a troubleshooting table.
