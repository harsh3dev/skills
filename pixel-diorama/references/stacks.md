# Stack setups

Three ways to ship the same scene. The look comes from the same four settings in all of them: low render size, `image-rendering: pixelated`, antialias off, orthographic camera. Only the wiring differs.

## Contents
- Choosing
- React + plain three.js
- React Three Fiber (R3F)
- Plain HTML
- Using the scene inside a real site (Next.js, Vite)

## Choosing

| Situation | Use |
|---|---|
| Previewing in claude.ai chat (artifact) | React + plain three (`.jsx`), or plain HTML. R3F is **not** available in artifacts. |
| User's React/Next project already has `@react-three/fiber` | R3F |
| React project, no R3F, one scene | React + plain three (one dependency: `three`) |
| Lots of separate interactive objects (hover, click per object) | R3F (pointer events per mesh come free) |
| Static site, plain HTML portfolio, no framework, or "one file I can drop in" | Plain HTML |
| Unsure | React + plain three; it's easy to move to the other two |

In Claude Code, look at `package.json` before choosing. If you build an artifact for preview and the user's real project uses R3F, say so and offer the R3F version too.

## React + plain three.js

Start from `assets/starter-react.jsx`. It already has the renderer, resize, pause, reduced motion, off-screen pause and cleanup. Edit only `buildScene()` and `updateScene()`. Paste extra helpers you need from `assets/pixelkit.js` into the helper section; in a real project, import them from `pixelkit.js` instead.

Three rules that prevent the most common bugs:
- Build the scene inside the `useEffect` that creates the renderer, and dispose it in that effect's cleanup. Building in render or in `useMemo` leaks GPU memory on every hot reload.
- Read changing UI values (paused, pixel size) through refs inside the animation loop. Putting them in the effect's dependency list rebuilds the whole scene on every click.
- The mount `div` needs its own size (`aspect-ratio` or a height). The canvas is sized from the mount, so a mount with `height: auto` collapses to zero.

## React Three Fiber

```jsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ditheredGroundTexture } from "./pixelkit";

// Fit a fixed number of world units into the canvas height, like the plain-three version.
function FitCamera({ viewHeight = 8, target = [0, 0.8, 0] }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    camera.zoom = size.height / viewHeight;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, size.height, viewHeight]);
  return null;
}

function Ground() {
  const map = useMemo(() => ditheredGroundTexture({ shape: "circle" }), []);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[9, 9]} />
      <meshLambertMaterial map={map} alphaTest={0.5} />
    </mesh>
  );
}

function Hero() {
  const arm = useRef();
  useFrame((state) => {
    arm.current.rotation.z = 2.4 + Math.sin(state.clock.elapsedTime * 8) * 0.35;
  });
  return (
    <group rotation-y={Math.PI / 4}>
      <mesh position-y={1.26} castShadow>
        <boxGeometry args={[0.62, 0.72, 0.36]} />
        <meshLambertMaterial color="#3d6fb6" />
      </mesh>
      <group ref={arm} position={[0.4, 1.56, 0]}>
        <mesh position-y={-0.35} castShadow>
          <boxGeometry args={[0.16, 0.7, 0.16]} />
          <meshLambertMaterial color="#e2a77f" />
        </mesh>
      </group>
    </group>
  );
}

export default function PixelScene({ pixelSize = 4 }) {
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div style={{ width: "100%", aspectRatio: "10 / 9" }}>
      <Canvas
        orthographic
        dpr={1 / pixelSize}               // the pixel trick: render 1/pixelSize as many pixels
        gl={{ antialias: false, alpha: true }}
        shadows="basic"                    // BasicShadowMap = hard shadows
        flat                               // no tone mapping: colors stay as written
        frameloop={reduceMotion ? "demand" : "always"}
        camera={{ position: [8.5, 9, 8.5], near: 0.1, far: 100 }}
        style={{ imageRendering: "pixelated" }}
      >
        <FitCamera viewHeight={8} />
        <hemisphereLight args={["#ffffff", "#6b7a4a", 0.75]} />
        <directionalLight
          position={[2, 8, 6]}
          intensity={0.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-bias={-0.002}
        />
        <Ground />
        <Hero />
      </Canvas>
    </div>
  );
}
```

Notes for R3F:
- `dpr={1/pixelSize}` is the whole pixel trick here. The canvas stays full size in CSS; only its internal resolution drops. Pixel widths can be slightly uneven at odd sizes. If that bothers the user, size the wrapper to a multiple of `pixelSize`.
- The pixelkit helpers work unchanged: create objects with them inside `useMemo` and render with `<primitive object={...} />`. Wrap disposal in a `useEffect` cleanup.
- Use `useFrame((state, dt) => ...)` for animation. Keep your own time accumulator if the scene can pause.
- The `createPostPass` outline pass needs manual rendering: `useFrame(({ gl, scene, camera }) => post.render(scene, camera), 1)`. Giving `useFrame` a priority above 0 makes R3F stop its own render, so yours is the only one.
- R3F turns on tone mapping by default, which washes out flat pixel colors. Add `flat` to `<Canvas>` so colors look like the hex values you wrote.

## Plain HTML

For claude.ai preview, load three r128 from cdnjs (the only allowed CDN there). For a real site, prefer `npm i three` with a bundler, or an import map pointing at a current three build; the code is the same apart from the import line.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pixel scene</title>
<style>
  :root { --text: #4a4a4a; }
  @media (prefers-color-scheme: dark) { :root { --text: #c8c8c8; color-scheme: dark; } }
  body { margin: 0; color: var(--text); font: 14px system-ui, sans-serif; }
  #scene { width: min(640px, 100%); aspect-ratio: 10 / 9; margin: 0 auto; overflow: hidden; }
</style>
</head>
<body>
<div id="scene" role="img" aria-label="Animated pixel-art scene"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
// Paste the pixelkit functions you need here, without the "export" keyword.
// (With the UMD build, THREE is a global, so the helpers work as-is.)

const mount = document.getElementById("scene");
const view = createPixelRenderer(mount, { pixelSize: 4, viewHeight: 8 });
const scene = new THREE.Scene();
addPixelLights(scene);
// ... build the scene ...

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let t = 0, last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!reduceMotion) t += dt;
  // ... update(t, dt) ...
  placeIsoCamera(view.camera);
  view.renderer.render(scene, view.camera);
}
requestAnimationFrame(tick);
</script>
</body>
</html>
```

## Using the scene inside a real site

- **Next.js**: three needs `window`. Load the component with `dynamic(() => import("./PixelScene"), { ssr: false })` and show a still image (a screenshot of the scene) while it loads.
- **Vite / CRA**: import normally. Code-split with `React.lazy` if the scene is below the fold.
- **Fallback**: if WebGL fails, `new THREE.WebGLRenderer()` throws. Wrap creation in `try/catch` and render a static image instead.
- **Size**: three adds roughly 150 KB gzipped. Everything else in the scene is code, so the scene itself is a few KB. That's much smaller than a video of the same thing.
- **Accessibility**: give the mount `role="img"` and an `aria-label` describing the scene. Respect reduced motion: start paused or render one still frame.
