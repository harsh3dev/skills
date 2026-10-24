# Polish and troubleshooting

Polish is optional. Add it when it helps the scene; a clean base look beats a pile of effects.

## Contents
- Camera snapping (shimmer when the camera moves)
- Outlines and limited palette
- Dithering
- Troubleshooting table

## Camera snapping

**The problem:** when the camera pans or zooms by less than one art pixel, every edge in the scene jumps around differently. This "crawl" or "shimmer" is the most common thing that makes 3D pixel art look cheap.

**The fix:** after placing the camera each frame, call `snapCameraToPixels(camera, view.renderHeight)`. It moves the camera to the nearest whole art pixel along the screen's left-right and up-down directions, so the whole image shifts by exact pixels, the way a 2D pixel game scrolls.

- Snapping fixes panning and zooming. It cannot fix rotation, because a rotating view really does change which pixels each edge covers. Keep orbits slow, or avoid them.
- Moving objects can still shimmer slightly. That's normal and looks fine; only the camera needs snapping.
- Advanced smooth scrolling (optional): render 1 extra art pixel on each side, snap the camera, then shift the canvas with CSS `transform` by the leftover sub-pixel amount × `pixelSize`. Scrolling becomes smooth while pixels stay crisp. Only do this if the user asks for buttery camera motion.

## Outlines and limited palette

`createPostPass(renderer, { outline, palette })` from pixelkit renders the scene into a texture, then draws it again through one small shader that:
1. **Darkens the outer edge pixel of every object.** It finds where the depth jumps between neighboring pixels. `outline: 0.5` makes the edge 50% darker, and `0` turns it off. Raise `threshold` if lines appear inside flat surfaces; lower it if small objects lose their outline.
2. **Snaps every pixel to the nearest palette color** (optional, up to 32 colors). This gives the strongest "real pixel art" feel, because there are no in-between shades. Build the palette from the colors already in the scene plus 1–2 darker and lighter versions of each main color. A palette that's too small turns shadows into ugly flat blocks.

Then use `post.render(scene, camera)` instead of `renderer.render(scene, camera)`, and call `post.dispose()` in cleanup.

When to use: outlines help busy scenes (many characters, a detailed floor) where objects blend into the ground. A palette helps when the user wants a strict retro look. For a soft, illustrated diorama (like a juggler on a grass island), skip both.

## Dithering

- **Edges fading out** (grass, sand, snow, water borders): random alpha with `alphaTest`, already done by `ditheredGroundTexture`. For a more ordered, retro look, replace the random check with a 4×4 Bayer pattern: `solid > bayer[(y % 4) * 4 + (x % 4)] / 16`, where `bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]`.
- **Sky or background gradients**: draw them as a canvas texture with dithered bands instead of a smooth gradient. Smooth gradients look out of place in pixel art.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blurry, not crisp | Canvas stretched with smoothing | `image-rendering: pixelated` on the canvas; `antialias: false`; `setPixelRatio(1)` |
| Pixels uneven widths | Canvas scaled by a non-whole number | Size the canvas CSS to `renderWidth × pixelSize` (pixelkit does this) |
| Canvas has zero height | Mount div has no height of its own | Give the mount `aspect-ratio` or a fixed height |
| Textures sparkle or flicker | Texture has more pixels than the screen shows | Lower the texture size to about 1 texel per art pixel; keep `NearestFilter` |
| Striped "acne" on shadowed surfaces | Shadow bias | `shadow.bias = -0.002`; also try `shadow.normalBias = 0.02` (r130+) |
| Shadows cut off at the edges | Shadow camera too small | Increase `area` in `addPixelLights` to cover the whole stage |
| Shadows too blurry or fine | Wrong shadow type or map size | `BasicShadowMap`; 1024 map is enough; bigger maps look too detailed for pixel art |
| Dotted edge looks like a solid line | `alphaTest` missing, or material `transparent: true` | Use `alphaTest: 0.5` and leave `transparent` off |
| Thin parts vanish or flicker | Thinner than one art pixel | Make them at least 1 art pixel thick (about 0.04 units with defaults) |
| Colors washed out (R3F) | Tone mapping on by default | Add `flat` to `<Canvas>` |
| Colors too light (three r152+) | Color management on canvas textures | `tex.colorSpace = "srgb"` (pixelkit's `canvasTexture` does this) |
| Scene runs after unmount or GPU memory grows | No cleanup | Cancel the animation frame, disconnect observers, call `disposeScene` and `renderer.dispose()` |
| Edits rebuild the whole scene | UI state in the effect's dependency list | Read paused or pixel size through refs inside the loop |
