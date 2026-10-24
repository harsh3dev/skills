// pixelkit.js
// Helpers for pixel-art style 3D scenes built with three.js (r128+).
//
// In a project, import the helpers you need. For a single-file build,
// copy the functions you use and remove the `export` keyword.

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Basics                                                             */
/* ------------------------------------------------------------------ */

// Deterministic PRNG (Park-Miller), so a scene renders identically on every load.
export function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // Rises 0 -> 1 -> 0 over the interval; suits hops and flashes.
  bump: (t) => Math.sin(Math.PI * clamp(t, 0, 1)),
};

/* ------------------------------------------------------------------ */
/* Renderer and camera                                                */
/* ------------------------------------------------------------------ */

// The core of the look: render small, display large.
//
// The mount element must have a size of its own (CSS height or aspect-ratio);
// the canvas derives its dimensions from the mount, not the other way around.
export function createPixelRenderer(mount, { pixelSize = 4, viewHeight = 8, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // hard-edged shadows suit the pixel look
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
    // Integer upscale: each art pixel occupies exactly p screen pixels.
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

// Positions an orthographic camera at an isometric angle. Azimuth PI/4 gives the classic diagonal view.
export function placeIsoCamera(camera, { azimuth = Math.PI / 4, elevation = 0.65, distance = 15, target = [0, 0.8, 0] } = {}) {
  const [tx, ty, tz] = target;
  camera.position.set(
    tx + Math.cos(azimuth) * Math.cos(elevation) * distance,
    ty + Math.sin(elevation) * distance,
    tz + Math.sin(azimuth) * Math.cos(elevation) * distance
  );
  camera.lookAt(tx, ty, tz);
}

// Snaps the camera position to whole art pixels to prevent shimmer while
// panning or zooming. Call each frame after positioning the camera.
// Corrects translation only; rotation is unaffected.
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();
export function snapCameraToPixels(camera, renderHeight) {
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

// Standard lighting rig: a soft hemisphere fill plus one directional sun with hard shadows.
export function addPixelLights(scene, { sunDir = [2, 8, 6], sunColor = 0xfff3dd, sun = 0.8, fill = 0.75, ground = 0x6b7a4a, area = 7 } = {}) {
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

/* ------------------------------------------------------------------ */
/* Textures                                                           */
/* ------------------------------------------------------------------ */

export function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // three r152+: tag the canvas as sRGB so texel colors match material hex values
  if ("colorSpace" in tex) tex.colorSpace = "srgb";
  return tex;
}

function rgbOf(hex) {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

// Ground texture (grass, sand, dirt) whose edges dissolve into scattered pixels.
// Use with new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5 }).
// shape: "circle" | "square"; fade: width of the dotted border (0..1).
export function ditheredGroundTexture({ size = 128, colors = ["#76a83c", "#88ba46", "#649432", "#9cc656"], shape = "circle", fade = 0.2, wobble = 0.05, seed = 7 } = {}) {
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

// Noisy surface texture (asphalt, stone, wood) drawn from a small set of shades.
export function speckleTexture({ size = 32, colors = ["#555", "#5c5c5c", "#4d4d4d"], seed = 3 } = {}) {
  const rand = rng(seed);
  return canvasTexture(size, (ctx, n) => {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */

export const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

export function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Rotation joint: attach a limb offset from the origin, then rotate the group.
export function pivot(x, y, z, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
}

// Builds voxel geometry from pixel drawings, one cube per drawn pixel.
// slices: front-to-back layers, each an array of strings (top row first).
// palette maps characters to colors; "." and " " are empty. Origin is bottom-center.
export function voxelsFromSlices(slices, palette, { size = 0.1, center = true } = {}) {
  const cells = {};
  const H = slices[0].length;
  const W = Math.max(...slices[0].map((r) => r.length));
  const D = slices.length;
  slices.forEach((rows, z) =>
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (!(ch in palette)) return;
        cells[ch] = cells[ch] || [];
        cells[ch].push([c, H - 1 - r, z]);
      })
    )
  );
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(size, size, size);
  const m = new THREE.Matrix4();
  const ox = center ? (W - 1) / 2 : 0;
  const oz = center ? (D - 1) / 2 : 0;
  Object.keys(cells).forEach((ch) => {
    const list = cells[ch];
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: palette[ch] }), list.length);
    list.forEach(([x, y, z], i) => {
      m.makeTranslation((x - ox) * size, (y + 0.5) * size, (oz - z) * size);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

// Extrudes a single flat drawing into `depth` cube layers.
export function voxelsFromRows(rows, palette, { size = 0.1, depth = 2, center = true } = {}) {
  return voxelsFromSlices(Array.from({ length: depth }, () => rows), palette, { size, center });
}

/* ------------------------------------------------------------------ */
/* Motion                                                             */
/* ------------------------------------------------------------------ */

// Scripted event sequences, with times in seconds.
// { at, run }            fires once at time `at`
// { at, dur, update(p) } runs each frame while active with p in 0..1, then once with p = 1
export function createTimeline(events, { loop = true } = {}) {
  const length = Math.max(...events.map((e) => e.at + (e.dur || 0)));
  const fired = new Set();
  const active = new Set();
  let last = -1;
  return {
    length,
    update(time) {
      const t = loop ? time % length : Math.min(time, length);
      if (t < last) {
        active.forEach((e) => e.update(1, t));
        active.clear();
        fired.clear();
      }
      last = t;
      events.forEach((e) => {
        const dur = e.dur || 0;
        if (!dur) {
          if (t >= e.at && !fired.has(e)) {
            fired.add(e);
            if (e.run) e.run();
          }
        } else if (t >= e.at && t < e.at + dur) {
          active.add(e);
          e.update((t - e.at) / dur, t);
        } else if (active.has(e)) {
          active.delete(e);
          e.update(1, t);
        }
      });
    },
  };
}

// Moves an object through a list of [x, z] waypoints at a constant speed,
// turning to face its direction of travel.
// Returns update(dt), which reports true while the object is still moving.
export function createWalker(obj, points, { speed = 1.5, loop = true, turn = 10 } = {}) {
  let i = 0;
  const target = new THREE.Vector3();
  return function update(dt) {
    if (i >= points.length) {
      if (!loop) return false;
      i = 0;
    }
    target.set(points[i][0], obj.position.y, points[i][1]);
    const dx = target.x - obj.position.x;
    const dz = target.z - obj.position.z;
    const dist = Math.hypot(dx, dz);
    const step = speed * dt;
    if (dist <= step) {
      obj.position.x = target.x;
      obj.position.z = target.z;
      i++;
    } else {
      obj.position.x += (dx / dist) * step;
      obj.position.z += (dz / dist) * step;
      const want = Math.atan2(dx, dz);
      let diff = want - obj.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      obj.rotation.y += diff * Math.min(1, turn * dt);
    }
    return true;
  };
}

/* ------------------------------------------------------------------ */
/* Effects                                                            */
/* ------------------------------------------------------------------ */

// Square point particles for sparks, rain, spray and embers.
// `size` is in art pixels; 1 to 3 works well.
export function createParticles({ max = 200, size = 2, color = "#ffffff", gravity = -6, drag = 0.9 } = {}) {
  const pos = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max);
  for (let i = 0; i < max; i++) pos[i * 3 + 1] = -9999;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size, color, sizeAttenuation: false }));
  points.frustumCulled = false;
  let next = 0;
  return {
    points,
    spawn(x, y, z, vx, vy, vz, seconds = 1) {
      const i = next;
      next = (next + 1) % max;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      vel[i * 3] = vx;
      vel[i * 3 + 1] = vy;
      vel[i * 3 + 2] = vz;
      life[i] = seconds;
    },
    update(dt) {
      const k = Math.pow(drag, dt);
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -9999;
          continue;
        }
        vel[i * 3] *= k;
        vel[i * 3 + 1] = vel[i * 3 + 1] * k + gravity * dt;
        vel[i * 3 + 2] *= k;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Chunky puffs that grow, then shrink: dust, smoke, steam, fire. Set color per spawn.
export function createPuffs({ max = 40, color = "#d9cbb0" } = {}) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const items = [];
  for (let i = 0; i < max; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    m.visible = false;
    m.castShadow = true;
    group.add(m);
    items.push({ m, t: 0, life: 1, size: 0.3, v: new THREE.Vector3() });
  }
  let next = 0;
  return {
    group,
    spawn(x, y, z, { size = 0.3, seconds = 0.8, vx = 0, vy = 0.6, vz = 0, color: c } = {}) {
      const p = items[next];
      next = (next + 1) % max;
      p.t = 0;
      p.life = seconds;
      p.size = size;
      p.v.set(vx, vy, vz);
      if (c) p.m.material.color.set(c);
      p.m.position.set(x, y, z);
      p.m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      p.m.visible = true;
    },
    update(dt) {
      items.forEach((p) => {
        if (!p.m.visible) return;
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1) {
          p.m.visible = false;
          return;
        }
        p.m.position.addScaledVector(p.v, dt);
        const s = p.size * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75);
        p.m.scale.setScalar(Math.max(0.001, s));
      });
    },
  };
}

// Jagged lightning bolt built from thin unlit boxes. Call zap(from, to) roughly every 50 ms to animate the flicker.
export function createBolt({ color = "#fff27a", thickness = 0.06, segments = 8, jitter = 0.35, seed = 3 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const pieces = Array.from({ length: segments }, () => {
    const m = new THREE.Mesh(geo, mat);
    group.add(m);
    return m;
  });
  const rand = rng(seed);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  group.visible = false;
  return {
    group,
    zap(from, to) {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const p = new THREE.Vector3().lerpVectors(from, to, i / segments);
        if (i > 0 && i < segments) {
          p.x += (rand() - 0.5) * jitter * 2;
          p.y += (rand() - 0.5) * jitter * 2;
          p.z += (rand() - 0.5) * jitter * 2;
        }
        pts.push(p);
      }
      pieces.forEach((m, i) => {
        dir.subVectors(pts[i + 1], pts[i]);
        const len = dir.length() || 0.0001;
        m.position.addVectors(pts[i], pts[i + 1]).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(up, dir.normalize());
        m.scale.set(thickness, len, thickness);
      });
      group.visible = true;
    },
    hide() {
      group.visible = false;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Post-processing: outlines and palette                              */
/* ------------------------------------------------------------------ */

// const post = createPostPass(renderer, { outline: 0.5, palette: ["#1d1d21", ...] });
// post.render(scene, camera); // use in place of renderer.render(scene, camera)
export function createPostPass(renderer, { outline = 0.5, threshold = 0.0015, palette = null } = {}) {
  const size = new THREE.Vector2();
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  target.depthTexture = new THREE.DepthTexture();
  const pal = (palette || []).slice(0, 32).map((c) => new THREE.Color(c));
  const n = pal.length;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: target.texture },
      tDepth: { value: target.depthTexture },
      texel: { value: new THREE.Vector2(1, 1) },
      strength: { value: outline },
      threshold: { value: threshold },
      palette: { value: n ? pal : [new THREE.Color()] },
    },
    defines: { PALETTE_SIZE: Math.max(n, 1), USE_PALETTE: n ? 1 : 0 },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tDepth;
      uniform vec2 texel; uniform float strength; uniform float threshold;
      uniform vec3 palette[PALETTE_SIZE];
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tColor, vUv);
        float d = texture2D(tDepth, vUv).r;
        float far = 0.0;
        far = max(far, texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r - d);
        far = max(far, texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r - d);
        far = max(far, texture2D(tDepth, vUv + vec2(0.0, texel.y)).r - d);
        far = max(far, texture2D(tDepth, vUv - vec2(0.0, texel.y)).r - d);
        vec3 rgb = c.rgb;
        if (c.a > 0.0 && far > threshold) rgb *= (1.0 - strength);
        #if USE_PALETTE == 1
          vec3 best = palette[0]; float bd = 1e9;
          for (int i = 0; i < PALETTE_SIZE; i++) {
            vec3 e = palette[i] - rgb; float dd = dot(e, e);
            if (dd < bd) { bd = dd; best = palette[i]; }
          }
          rgb = best;
        #endif
        gl_FragColor = vec4(rgb, c.a);
      }`,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCam = new THREE.Camera();
  return {
    render(scene, camera) {
      renderer.getSize(size);
      if (target.width !== size.x || target.height !== size.y) {
        target.setSize(size.x, size.y);
        material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
      }
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    },
    dispose() {
      target.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Cleanup                                                            */
/* ------------------------------------------------------------------ */

// Disposes every geometry, material and texture in the scene graph.
export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
  });
}
