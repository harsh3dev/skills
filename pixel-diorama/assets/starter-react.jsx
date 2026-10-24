// Starter: React + plain three.js pixel-art scene.
// Self-contained (helpers copied from pixelkit.js) so it runs as a single-file artifact.
// Edit buildScene() and updateScene(); the component part rarely needs changes.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ================================================================== */
/* Helpers (copied from pixelkit.js)                                  */
/* ================================================================== */

function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // goes 0 -> 1 -> 0, good for "hop" and "flash"
  bump: (t) => Math.sin(Math.PI * clamp(t, 0, 1)),
};

function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // three r152+ only: mark canvas colors as sRGB so they match material hex colors
  if ("colorSpace" in tex) tex.colorSpace = "srgb";
  return tex;
}

function rgbOf(hex) {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function ditheredGroundTexture({ size = 128, colors = ["#76a83c", "#88ba46", "#649432", "#9cc656"], shape = "circle", fade = 0.2, wobble = 0.05, seed = 7 } = {}) {
  const rand = rng(seed);
  const cols = colors.map(rgbOf);
  return canvasTexture(size, (ctx, n) => {
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = ((x + 0.5) / n) * 2 - 1;
        const dy = ((y + 0.5) / n) * 2 - 1;
        const a = Math.atan2(dy, dx);
        const edge = 0.9 + wobble * Math.sin(a * 3 + 1) + wobble * 0.6 * Math.sin(a * 7 + 2);
        const d = shape === "circle" ? Math.hypot(dx, dy) : Math.max(Math.abs(dx), Math.abs(dy));
        const solid = clamp((1 - d / edge) / fade, 0, 1);
        const col = cols[Math.floor(rand() * cols.length)];
        const i = (y * n + x) * 4;
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = rand() < solid ? 255 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function createPixelRenderer(mount, { pixelSize = 4, viewHeight = 8, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // hard, blocky shadows
  }
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  mount.appendChild(canvas);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const state = { pixelSize, viewHeight, w: 1, h: 1 };

  function resize() {
    const W = mount.clientWidth;
    const H = mount.clientHeight;
    if (!W || !H) return;
    const p = state.pixelSize;
    state.w = Math.max(1, Math.floor(W / p));
    state.h = Math.max(1, Math.floor(H / p));
    renderer.setSize(state.w, state.h, false);
    // Whole-number scale: every art pixel is exactly p screen pixels wide.
    canvas.style.width = state.w * p + "px";
    canvas.style.height = state.h * p + "px";
    const aspect = state.w / state.h;
    const vh = state.viewHeight;
    camera.left = (-vh * aspect) / 2;
    camera.right = (vh * aspect) / 2;
    camera.top = vh / 2;
    camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  return {
    renderer,
    camera,
    canvas,
    get renderWidth() {
      return state.w;
    },
    get renderHeight() {
      return state.h;
    },
    setPixelSize(p) {
      state.pixelSize = p;
      resize();
    },
    setViewHeight(v) {
      state.viewHeight = v;
      resize();
    },
    resize,
    dispose() {
      ro.disconnect();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}

function placeIsoCamera(camera, { azimuth = Math.PI / 4, elevation = 0.65, distance = 15, target = [0, 0.8, 0] } = {}) {
  const [tx, ty, tz] = target;
  camera.position.set(
    tx + Math.cos(azimuth) * Math.cos(elevation) * distance,
    ty + Math.sin(elevation) * distance,
    tz + Math.sin(azimuth) * Math.cos(elevation) * distance
  );
  camera.lookAt(tx, ty, tz);
}

// Snap the camera to whole art pixels so panning/zooming doesn't shimmer.
// Call every frame AFTER placing the camera. Only fixes moves, not rotation.
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
function snapCameraToPixels(camera, renderHeight) {
  camera.updateMatrixWorld();
  const px = (camera.top - camera.bottom) / camera.zoom / renderHeight;
  _r.setFromMatrixColumn(camera.matrixWorld, 0);
  _u.setFromMatrixColumn(camera.matrixWorld, 1);
  const x = camera.position.dot(_r);
  const y = camera.position.dot(_u);
  camera.position.addScaledVector(_r, Math.round(x / px) * px - x);
  camera.position.addScaledVector(_u, Math.round(y / px) * px - y);
  camera.updateMatrixWorld();
}

function addPixelLights(scene, { sunDir = [2, 8, 6], sunColor = 0xfff3dd, sun = 0.8, fill = 0.75, ground = 0x6b7a4a, area = 7 } = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, ground, fill);
  const light = new THREE.DirectionalLight(sunColor, sun);
  light.position.set(...sunDir);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  const c = light.shadow.camera;
  c.left = -area;
  c.right = area;
  c.top = area;
  c.bottom = -area;
  c.near = 0.5;
  c.far = 40;
  light.shadow.bias = -0.002;
  scene.add(hemi, light);
  return { hemi, sun: light };
}

const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function pivot(x, y, z, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
}

function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
  });
}


/* ================================================================== */
/* Scene: replace this part with the user's scene                     */
/* ================================================================== */

// Build everything once. Return the things that move.
function buildScene() {
  const scene = new THREE.Scene();
  addPixelLights(scene);

  // Ground: grass island with a dotted edge
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshLambertMaterial({ map: ditheredGroundTexture({ size: 128, shape: "circle" }), alphaTest: 0.5 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // A character built from boxes, with a pivot for each moving part
  const skin = lambert("#e2a77f");
  const shirt = lambert("#3d6fb6");
  const pants = lambert("#2c3038");
  const hero = new THREE.Group();
  const legL = pivot(-0.14, 0.9, 0, box(0.22, 0.9, 0.24, pants));
  const legR = pivot(0.14, 0.9, 0, box(0.22, 0.9, 0.24, pants));
  legL.children[0].position.y = -0.45;
  legR.children[0].position.y = -0.45;
  const torso = box(0.62, 0.72, 0.36, shirt);
  torso.position.y = 1.26;
  const head = box(0.38, 0.4, 0.38, skin);
  head.position.y = 1.84;
  const armL = pivot(-0.4, 1.56, 0, box(0.16, 0.7, 0.16, skin));
  const armR = pivot(0.4, 1.56, 0, box(0.16, 0.7, 0.16, skin));
  armL.children[0].position.y = -0.35;
  armR.children[0].position.y = -0.35;
  hero.add(legL, legR, torso, head, armL, armR);
  hero.rotation.y = Math.PI / 4; // face the camera
  scene.add(hero);

  // cameraOptions go to placeIsoCamera (target, azimuth, elevation).
  // Set s.zoom (1 = default) and s.snapCamera = true in updateScene for camera moves.
  return { scene, hero, armL, armR, legL, legR, cameraOptions: { target: [0, 0.8, 0] } };
}

// Called every frame. t = seconds since start, dt = seconds since last frame (both stop while paused).
function updateScene(s, t, dt) {
  s.armR.rotation.z = 2.4 + Math.sin(t * 8) * 0.35; // waving arm
  s.armL.rotation.x = Math.sin(t * 2) * 0.1;
  s.hero.position.y = Math.abs(Math.sin(t * 2)) * 0.04;
}

/* ================================================================== */
/* Component: usually no changes needed below                         */
/* ================================================================== */

export default function PixelScene({ pixelSize = 4, viewHeight = 8, showControls = true }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const pausedRef = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [px, setPx] = useState(pixelSize);
  const [paused, setPaused] = useState(reduceMotion);
  pausedRef.current = paused;

  useEffect(() => {
    if (apiRef.current) apiRef.current.setPixelSize(px);
  }, [px]);

  useEffect(() => {
    const mount = mountRef.current;
    const view = createPixelRenderer(mount, { pixelSize: px, viewHeight });
    apiRef.current = view;
    const s = buildScene();

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(mount);

    let raf;
    let last = performance.now();
    let t = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return; // skip work when off-screen
      const step = pausedRef.current ? 0 : dt;
      t += step;
      updateScene(s, t, step);
      // Camera: optional zoom (s.zoom, 1 = default) and pixel snapping (s.snapCamera)
      const zoom = s.zoom || 1;
      if (view.camera.zoom !== zoom) {
        view.camera.zoom = zoom;
        view.camera.updateProjectionMatrix();
      }
      placeIsoCamera(view.camera, s.cameraOptions);
      if (s.snapCamera) snapCameraToPixels(view.camera, view.renderHeight);
      view.renderer.render(s.scene, view.camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      disposeScene(s.scene);
      view.dispose();
    };
  }, [viewHeight]);

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div ref={mountRef} className="w-full overflow-hidden" style={{ aspectRatio: "10 / 9" }} />
      {showControls && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
          <label className="flex items-center gap-2">
            Pixel size
            <input type="range" min="1" max="8" value={px} onChange={(e) => setPx(Number(e.target.value))} />
            <span className="w-4 tabular-nums">{px}</span>
          </label>
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-3 py-1 rounded border border-neutral-400 hover:bg-neutral-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </div>
  );
}
