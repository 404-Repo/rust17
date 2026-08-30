/**
 * player/fx.js  (owner: player)
 *
 * Pooled effects. Everything is one of four draw calls plus up to four flash
 * sprites, whatever is happening:
 *   dust   one instanced billboard mesh (alpha blended, fogged, up to 320 puffs)
 *   sparks one instanced billboard mesh (additive, up to 200)
 *   tracer one dynamic quad mesh (additive, up to 24 streaks)
 *   flash  a pool of 4 sprites (additive) and, on the high tier, 2 point lights
 * Point sprites were not used because gl_PointSize is capped at 64 px on the
 * Apple and ANGLE stacks, and a dust cloud two metres from the camera is far
 * bigger than that. The billboards are expanded in the vertex shader in view
 * space, so they cost the same as points.
 *
 * Textures are drawn into canvases at construction (no image files).
 * Colours follow style/STYLE-LOCK.md: sand sunlit 0xcdb88e, sand packed
 * 0xa89372, concrete bleached 0xb8ae9b, rock pale 0xc4b393. Dust is tinted by
 * the sun (setLighting) so a puff in the open reads as lit sand, not paint.
 */
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);

function puffTexture(size = 128, seed = 7) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  let s = seed;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  // a soft core plus a few lobes so the puff has an irregular edge
  const lobes = [[0.5, 0.5, 0.46, 1.0]];
  for (let i = 0; i < 7; i++) lobes.push([0.5 + (r() - 0.5) * 0.4, 0.5 + (r() - 0.5) * 0.4, 0.16 + r() * 0.18, 0.5 + r() * 0.4]);
  for (const [x, y, rad, a] of lobes) {
    const gr = g.createRadialGradient(x * size, y * size, 0, x * size, y * size, rad * size);
    gr.addColorStop(0, `rgba(255,255,255,${a * 0.55})`);
    gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.22})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

function sparkTexture(size = 32) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function flashTexture(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  core.addColorStop(0, 'rgba(255,250,235,1)'); core.addColorStop(0.5, 'rgba(255,215,140,0.85)'); core.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = core; g.fillRect(0, 0, size, size);
  // star spikes
  g.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3 + (i % 2) * 0.35);
    const sp = g.createLinearGradient(0, 0, size * 0.5, 0);
    sp.addColorStop(0, 'rgba(255,220,150,0.9)'); sp.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = sp;
    g.beginPath(); g.moveTo(0, -size * 0.03); g.lineTo(size * 0.5, 0); g.lineTo(0, size * 0.03); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const VERT = /* glsl */`
attribute vec3 aPos; attribute float aSize; attribute vec3 aColor; attribute float aAlpha; attribute float aRot;
varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv; vColor = aColor; vAlpha = aAlpha;
  float c = cos(aRot), s = sin(aRot);
  vec2 p = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aSize;
  vec4 mvPosition = modelViewMatrix * vec4(aPos, 1.0);
  mvPosition.xy += p;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
uniform sampler2D uMap;
varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(uMap, vUv);
  gl_FragColor = vec4(vColor, t.a * vAlpha);
  if (gl_FragColor.a < 0.004) discard;
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Billboards {
  constructor(scene, { max, texture, additive, fog = true }) {
    this.max = max; this.n = 0;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 3);
    this.alpha = new Float32Array(max); this.rot = new Float32Array(max);
    this.aPos = new THREE.InstancedBufferAttribute(this.pos, 3); this.aSize = new THREE.InstancedBufferAttribute(this.size, 1);
    this.aCol = new THREE.InstancedBufferAttribute(this.col, 3); this.aAlpha = new THREE.InstancedBufferAttribute(this.alpha, 1);
    this.aRot = new THREE.InstancedBufferAttribute(this.rot, 1);
    for (const a of [this.aPos, this.aSize, this.aCol, this.aAlpha, this.aRot]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPos', this.aPos); geo.setAttribute('aSize', this.aSize); geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aAlpha', this.aAlpha); geo.setAttribute('aRot', this.aRot);
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null } }]),
      transparent: true, depthWrite: false, depthTest: true, fog,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mat.uniforms.uMap.value = texture;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 20; this.mesh.name = additive ? 'fx_sparks' : 'fx_dust';
    this.geo = geo; this.mat = mat;
    scene.add(this.mesh);
    // per particle simulation state
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max);
    this.size0 = new Float32Array(max); this.alpha0 = new Float32Array(max); this.rotV = new Float32Array(max);
    this.fadeIn = new Float32Array(max);
    this.tmpC = new THREE.Color();
  }
  spawn(o) {
    let i;
    if (this.n < this.max) i = this.n++;
    else { i = (Math.random() * this.max) | 0; }   // recycle a random one when full
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx || 0; this.vel[i * 3 + 1] = o.vy || 0; this.vel[i * 3 + 2] = o.vz || 0;
    this.life[i] = 0; this.maxLife[i] = o.life || 0.6;
    this.grav[i] = o.gravity || 0; this.drag[i] = o.drag == null ? 2.0 : o.drag; this.grow[i] = o.grow || 0;
    this.size0[i] = o.size || 0.3; this.size[i] = this.size0[i];
    this.alpha0[i] = o.alpha == null ? 1 : o.alpha; this.alpha[i] = 0;
    this.rot[i] = o.rot == null ? Math.random() * Math.PI * 2 : o.rot; this.rotV[i] = o.rotV == null ? rnd(-1.2, 1.2) : o.rotV;
    this.fadeIn[i] = o.fadeIn == null ? 0.08 : o.fadeIn;
    const c = this.tmpC.set(o.color == null ? 0xffffff : o.color);
    if (o.mul) c.multiply(o.mul);
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        // swap with the last live one
        n--;
        if (i !== n) this._copy(n, i);
        i--; continue;
      }
      const t = this.life[i] / this.maxLife[i];
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
      const fi = this.fadeIn[i] > 0 ? clamp(this.life[i] / this.fadeIn[i], 0, 1) : 1;
      this.alpha[i] = this.alpha0[i] * fi * (1 - t * t);
      this.rot[i] += this.rotV[i] * dt;
    }
    this.n = n;
    this.geo.instanceCount = n;
    this.aPos.needsUpdate = true; this.aSize.needsUpdate = true; this.aCol.needsUpdate = true; this.aAlpha.needsUpdate = true; this.aRot.needsUpdate = true;
    this.mesh.visible = n > 0;
  }
  _copy(from, to) {
    for (let k = 0; k < 3; k++) { this.pos[to * 3 + k] = this.pos[from * 3 + k]; this.vel[to * 3 + k] = this.vel[from * 3 + k]; this.col[to * 3 + k] = this.col[from * 3 + k]; }
    for (const a of ['size', 'alpha', 'rot', 'life', 'maxLife', 'grav', 'drag', 'grow', 'size0', 'alpha0', 'rotV', 'fadeIn']) this[a][to] = this[a][from];
  }
}

class Tracers {
  constructor(scene, max = 24) {
    this.max = max; this.items = [];
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(max * 4 * 3); this.colArr = new Float32Array(max * 4 * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 4).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint16Array(max * 6);
    for (let i = 0; i < max; i++) { const b = i * 4, o = i * 6; idx[o] = b; idx[o + 1] = b + 1; idx[o + 2] = b + 2; idx[o + 3] = b; idx[o + 4] = b + 2; idx[o + 5] = b + 3; }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 21; this.mesh.name = 'fx_tracers';
    this.geo = geo; scene.add(this.mesh);
    this.color = new THREE.Color(0xffd9a0);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._s = new THREE.Vector3(); this._d = new THREE.Vector3(); this._c = new THREE.Vector3();
  }
  add(from, to) {
    if (this.items.length >= this.max) this.items.shift();
    const dist = from.distanceTo(to);
    this.items.push({ from: from.clone(), to: to.clone(), dist, t: 0, speed: 260, len: Math.min(4.5, dist) });
  }
  update(dt, camPos) {
    let q = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt * it.speed;
      if (it.t - it.len > it.dist) { this.items.splice(i, 1); continue; }
      const d = this._d.subVectors(it.to, it.from).normalize();
      const head = this._a.copy(it.from).addScaledVector(d, Math.min(it.t, it.dist));
      const tail = this._b.copy(it.from).addScaledVector(d, Math.max(it.t - it.len, 0));
      const toCam = camPos ? this._c.subVectors(camPos, head) : this._c.set(0, 1, 0);
      const side = this._s.crossVectors(d, toCam);
      if (side.lengthSq() < 1e-8) side.set(0, 1, 0);
      side.normalize().multiplyScalar(0.018);
      const o = q * 12;
      this.posArr[o] = tail.x - side.x; this.posArr[o + 1] = tail.y - side.y; this.posArr[o + 2] = tail.z - side.z;
      this.posArr[o + 3] = tail.x + side.x; this.posArr[o + 4] = tail.y + side.y; this.posArr[o + 5] = tail.z + side.z;
      this.posArr[o + 6] = head.x + side.x; this.posArr[o + 7] = head.y + side.y; this.posArr[o + 8] = head.z + side.z;
      this.posArr[o + 9] = head.x - side.x; this.posArr[o + 10] = head.y - side.y; this.posArr[o + 11] = head.z - side.z;
      const c = this.color, oc = q * 16;
      const fade = 1 - clamp((it.t - it.dist) / it.len, 0, 1);
      for (let v = 0; v < 4; v++) {
        const a = (v >= 2 ? 1.0 : 0.0) * fade * 0.9;
        this.colArr[oc + v * 4] = c.r * 1.6; this.colArr[oc + v * 4 + 1] = c.g * 1.4; this.colArr[oc + v * 4 + 2] = c.b; this.colArr[oc + v * 4 + 3] = a;
      }
      q++;
    }
    this.geo.setDrawRange(0, q * 6);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.mesh.visible = q > 0;
  }
}

export class FX {
  constructor({ scene, quality, terrain, camera = null }) {
    this.scene = scene; this.quality = quality || {}; this.terrain = terrain; this.camera = camera;
    const high = (this.quality.tier ? this.quality.tier === 'high' : this.quality.pointLights !== false);
    this.high = high;
    this.dust = new Billboards(scene, { max: high ? 320 : 160, texture: puffTexture(128, 7), additive: false });
    this.sparks = new Billboards(scene, { max: high ? 200 : 100, texture: sparkTexture(32), additive: true });
    this.tracers = new Tracers(scene, 24);
    // muzzle flash sprites
    this.flashTex = flashTexture(128);
    this.flashes = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.SpriteMaterial({ map: this.flashTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, color: 0xffd090, fog: false });
      const s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 22; s.name = 'fx_flash'; s.frustumCulled = false;
      scene.add(s); this.flashes.push({ sprite: s, life: 0, max: 0.04, size: 0.3 });
    }
    // lights: only on the high tier, always in the scene so the shader count never changes
    this.lights = [];
    if (high && this.quality.pointLights !== false) {
      for (let i = 0; i < 2; i++) {
        const l = new THREE.PointLight(0xffb060, 0, 2.2, 2); l.castShadow = false; l.name = 'fx_light';
        scene.add(l); this.lights.push({ light: l, life: 0, max: 0.06, peak: 0 });
      }
    }
    // dust tint: sand albedo lit by a warm sun plus sky, so a puff reads as lit sand
    this.sun = new THREE.Color(1.0, 0.82, 0.62); this.sky = new THREE.Color(0.56, 0.69, 0.85);
    this.litSand = new THREE.Color(); this.shadeSand = new THREE.Color();
    this.setLighting({ sun: 0xffd2a0, sky: 0x8fb0d8, sunI: 3.2, skyI: 0.9 });
    this.colors = {
      sand: 0xcdb88e, packed: 0xa89372, concrete: 0xb8ae9b, rock: 0xc4b393, wood: 0x8a6a44,
      blood: 0x4a0e0c, smoke: 0x6e6458, metal: 0x8a8d8f,
    };
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    this.time = 0; this.footstepClock = 0;
  }

  setCamera(camera) { this.camera = camera; }

  /** The rig's sun and sky colours, so dust is tinted like the lit ground. */
  setLighting({ sun = 0xffd2a0, sky = 0x8fb0d8, sunI = 3.2, skyI = 0.9 } = {}) {
    const s = new THREE.Color(sun), k = new THREE.Color(sky);
    // approximate irradiance / pi for a surface facing halfway to the sun, then a sky share
    this.litSand.setRGB(
      clamp((s.r * sunI * 0.62 + k.r * skyI * 0.5) / Math.PI * 1.35, 0, 1.4),
      clamp((s.g * sunI * 0.62 + k.g * skyI * 0.5) / Math.PI * 1.35, 0, 1.4),
      clamp((s.b * sunI * 0.62 + k.b * skyI * 0.5) / Math.PI * 1.35, 0, 1.4));
    this.shadeSand.setRGB(k.r * skyI * 0.55, k.g * skyI * 0.55, k.b * skyI * 0.55);
  }

  _lit(hex, shade = 0.25) {
    // albedo times a blend of sun and sky irradiance
    const a = this._c.set(hex);
    const l = this._c2.copy(this.litSand).lerp(this.shadeSand, shade);
    return a.multiply(l);
  }

  muzzleFlash(pos, dir) {
    let f = this.flashes.find((x) => x.life <= 0) || this.flashes[0];
    f.life = f.max = 0.045; f.size = rnd(0.22, 0.34);
    f.sprite.position.copy(pos).addScaledVector(dir, 0.06);
    f.sprite.material.rotation = Math.random() * Math.PI * 2;
    f.sprite.scale.setScalar(f.size); f.sprite.visible = true; f.sprite.material.opacity = 1;
    // a wisp of warm smoke off the muzzle
    this.sparks.spawn({ x: pos.x + dir.x * 0.1, y: pos.y + dir.y * 0.1, z: pos.z + dir.z * 0.1, vx: dir.x * 3, vy: dir.y * 3 + 0.3, vz: dir.z * 3, size: 0.08, life: 0.06, color: 0xffc070, alpha: 0.8, drag: 6 });
    this.dust.spawn({ x: pos.x + dir.x * 0.15, y: pos.y + dir.y * 0.15, z: pos.z + dir.z * 0.15, vx: dir.x * 1.2 + rnd(-0.2, 0.2), vy: 0.5, vz: dir.z * 1.2 + rnd(-0.2, 0.2), size: 0.07, grow: 3.0, life: rnd(0.35, 0.5), color: 0xd8d0c0, mul: this.litSand, alpha: 0.28, drag: 3.5, fadeIn: 0.02 });
    if (this.lights.length) {
      const L = this.lights.find((x) => x.life <= 0) || this.lights[0];
      L.life = L.max = 0.06; L.peak = 9;
      L.light.position.copy(pos).addScaledVector(dir, 0.15); L.light.intensity = L.peak;
    }
  }

  impact(point, normal, surface = 'sand') {
    const n = normal && normal.lengthSq() > 0 ? normal : new THREE.Vector3(0, 1, 0);
    const p = point; const s = String(surface);
    if (s === 'metal') {
      for (let i = 0; i < 9; i++) {
        this.sparks.spawn({ x: p.x, y: p.y, z: p.z,
          vx: n.x * rnd(2, 5) + rnd(-2.5, 2.5), vy: n.y * rnd(2, 5) + rnd(-1.5, 2.5), vz: n.z * rnd(2, 5) + rnd(-2.5, 2.5),
          size: rnd(0.025, 0.05), life: rnd(0.18, 0.45), color: i % 3 ? 0xffc46a : 0xfff0d0, alpha: 1, gravity: 9, drag: 1.5, fadeIn: 0 });
      }
      this.sparks.spawn({ x: p.x + n.x * 0.02, y: p.y + n.y * 0.02, z: p.z + n.z * 0.02, size: 0.22, life: 0.05, color: 0xffd8a0, alpha: 0.9, drag: 0, fadeIn: 0 });
      this.dust.spawn({ x: p.x + n.x * 0.05, y: p.y + n.y * 0.05, z: p.z + n.z * 0.05, vx: n.x * 0.6, vy: n.y * 0.6 + 0.3, vz: n.z * 0.6, size: 0.1, grow: 2.5, life: 0.5, color: 0x9a9590, mul: this.litSand, alpha: 0.35, drag: 3 });
      return;
    }
    let col, chip, count, size, alpha;
    if (s === 'concrete') { col = this.colors.concrete; chip = 0x8f877a; count = 5; size = 0.12; alpha = 0.55; }
    else if (s === 'rock') { col = this.colors.rock; chip = 0x8a7d66; count = 5; size = 0.12; alpha = 0.55; }
    else if (s === 'wood') { col = this.colors.wood; chip = 0x6e5236; count = 4; size = 0.09; alpha = 0.5; }
    else if (s === 'packed') { col = this.colors.packed; chip = 0x7f6d52; count = 6; size = 0.16; alpha = 0.6; }
    else { col = this.colors.sand; chip = 0x8f7b5c; count = 7; size = 0.18; alpha = 0.65; }
    const lit = this._lit(col, 0.2).clone();
    for (let i = 0; i < count; i++) {
      this.dust.spawn({ x: p.x + n.x * 0.05 + rnd(-0.06, 0.06), y: p.y + n.y * 0.05 + rnd(-0.03, 0.06), z: p.z + n.z * 0.05 + rnd(-0.06, 0.06),
        vx: n.x * rnd(0.8, 2.2) + rnd(-0.7, 0.7), vy: n.y * rnd(0.8, 2.2) + rnd(0.2, 0.9), vz: n.z * rnd(0.8, 2.2) + rnd(-0.7, 0.7),
        size: size * rnd(0.7, 1.3), grow: rnd(2.2, 3.5), life: rnd(0.45, 0.9), color: lit.getHex(), alpha: alpha * rnd(0.7, 1), drag: 2.8, gravity: 0.6, fadeIn: 0.03 });
    }
    // chips: small, dark, ballistic
    for (let i = 0; i < 5; i++) {
      this.dust.spawn({ x: p.x, y: p.y, z: p.z,
        vx: n.x * rnd(2, 4.5) + rnd(-2, 2), vy: n.y * rnd(2, 4.5) + rnd(0.5, 2.5), vz: n.z * rnd(2, 4.5) + rnd(-2, 2),
        size: rnd(0.02, 0.045), grow: 0, life: rnd(0.3, 0.6), color: chip, alpha: 1, gravity: 12, drag: 0.6, fadeIn: 0, rotV: rnd(-8, 8) });
    }
  }

  tracer(from, to) { this.tracers.add(from, to); }

  /** round 24: a brass case flicked out to the right of the weapon, spinning, with a short life */
  casing(pos, dir, right) {
    const r = right || new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    this.dust.spawn({
      x: pos.x + r.x * 0.06, y: pos.y - 0.02, z: pos.z + r.z * 0.06,
      vx: r.x * rnd(1.6, 2.6) + rnd(-0.3, 0.3) - dir.x * 0.8,
      vy: rnd(1.1, 1.9),
      vz: r.z * rnd(1.6, 2.6) + rnd(-0.3, 0.3) - dir.z * 0.8,
      size: 0.022, grow: 0, life: rnd(0.7, 1.0), color: 0xdcae52, alpha: 1, gravity: 11, drag: 0.35, fadeIn: 0, rotV: rnd(-14, 14),
    });
  }

  bloodHit(pos) {
    const c = this.colors.blood;
    for (let i = 0; i < 5; i++) {
      this.dust.spawn({ x: pos.x + rnd(-0.05, 0.05), y: pos.y + rnd(-0.05, 0.05), z: pos.z + rnd(-0.05, 0.05),
        vx: rnd(-0.8, 0.8), vy: rnd(-0.2, 0.9), vz: rnd(-0.8, 0.8), size: rnd(0.06, 0.11), grow: 2.2, life: rnd(0.28, 0.42), color: c, alpha: 0.85, drag: 4, gravity: 1.5, fadeIn: 0 });
    }
    for (let i = 0; i < 6; i++) {
      this.dust.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: rnd(-2.5, 2.5), vy: rnd(0, 2.5), vz: rnd(-2.5, 2.5),
        size: rnd(0.015, 0.03), grow: 0, life: rnd(0.3, 0.5), color: 0x3a0a08, alpha: 1, drag: 0.8, gravity: 11, fadeIn: 0 });
    }
  }

  grenadeExplosion(pos) {
    const p = pos;
    // flash
    let f = this.flashes.find((x) => x.life <= 0) || this.flashes[0];
    f.life = f.max = 0.09; f.size = 3.6;
    f.sprite.position.copy(p); f.sprite.position.y += 0.6; f.sprite.material.rotation = Math.random() * 6.28;
    f.sprite.scale.setScalar(f.size); f.sprite.visible = true; f.sprite.material.opacity = 1;
    // fireball as sparks (additive, fast fade)
    for (let i = 0; i < 14; i++) {
      this.sparks.spawn({ x: p.x + rnd(-0.3, 0.3), y: p.y + rnd(0, 0.6), z: p.z + rnd(-0.3, 0.3), vx: rnd(-3, 3), vy: rnd(1, 5), vz: rnd(-3, 3),
        size: rnd(0.6, 1.4), grow: 1.5, life: rnd(0.12, 0.28), color: i % 2 ? 0xff9a40 : 0xffd090, alpha: 0.9, drag: 3, fadeIn: 0 });
    }
    // hot fragments
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.283, e = rnd(0.1, 1.2), sp = rnd(6, 16);
      this.sparks.spawn({ x: p.x, y: p.y + 0.2, z: p.z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp,
        size: rnd(0.03, 0.06), life: rnd(0.3, 0.8), color: 0xffc070, alpha: 1, gravity: 12, drag: 1.2, fadeIn: 0 });
    }
    // dust and smoke: a rising column plus a ground ring
    const surf = this.terrain && this.terrain.surfaceAt ? this.terrain.surfaceAt(p.x, p.z) : 'sand';
    const base = surf === 'concrete' ? this.colors.concrete : surf === 'rock' ? this.colors.rock : this.colors.sand;
    const lit = this._lit(base, 0.35).clone(), smoke = this._lit(this.colors.smoke, 0.5).clone();
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * 6.283, sp = rnd(1.5, 5);
      this.dust.spawn({ x: p.x + Math.cos(a) * 0.4, y: p.y + rnd(0.1, 0.5), z: p.z + Math.sin(a) * 0.4,
        vx: Math.cos(a) * sp, vy: rnd(1.5, 5), vz: Math.sin(a) * sp,
        size: rnd(0.5, 1.0), grow: rnd(2.0, 3.2), life: rnd(1.2, 2.2), color: (i % 3 === 0 ? smoke : lit).getHex(), alpha: rnd(0.55, 0.8), drag: 1.8, gravity: -0.15, fadeIn: 0.04 });
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * 6.283, sp = rnd(5, 9);
      this.dust.spawn({ x: p.x, y: p.y + 0.15, z: p.z, vx: Math.cos(a) * sp, vy: rnd(0.2, 1.2), vz: Math.sin(a) * sp,
        size: rnd(0.35, 0.7), grow: rnd(2.5, 4), life: rnd(0.8, 1.4), color: lit.getHex(), alpha: rnd(0.5, 0.7), drag: 2.6, gravity: 0.4, fadeIn: 0.02 });
    }
    // debris
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 6.283, e = rnd(0.5, 1.4), sp = rnd(4, 11);
      this.dust.spawn({ x: p.x, y: p.y + 0.2, z: p.z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp,
        size: rnd(0.03, 0.08), life: rnd(0.8, 1.6), color: 0x5c4a34, alpha: 1, gravity: 12, drag: 0.5, fadeIn: 0, rotV: rnd(-10, 10) });
    }
    if (this.lights.length) {
      const L = this.lights.find((x) => x.life <= 0) || this.lights[0];
      L.life = L.max = 0.16; L.peak = 60;
      L.light.position.copy(p); L.light.position.y += 0.8; L.light.distance = 9; L.light.intensity = L.peak;
    }
  }

  footstepDust(pos, surface = 'sand', strength = 0.6) {
    const s = String(surface);
    if (s === 'concrete' || s === 'rock' || s === 'metal') return;
    const packed = s === 'packed';
    const n = packed ? 1 : 2;
    const col = this._lit(packed ? this.colors.packed : this.colors.sand, 0.3).clone();
    for (let i = 0; i < n; i++) {
      this.dust.spawn({ x: pos.x + rnd(-0.15, 0.15), y: pos.y + 0.06, z: pos.z + rnd(-0.15, 0.15),
        vx: rnd(-0.25, 0.25), vy: rnd(0.15, 0.4) * strength + 0.1, vz: rnd(-0.25, 0.25),
        size: rnd(0.12, 0.2), grow: rnd(1.6, 2.4), life: rnd(0.5, 0.9), color: col.getHex(), alpha: (packed ? 0.18 : 0.3) * clamp(strength, 0.3, 1.2), drag: 2.5, gravity: -0.05, fadeIn: 0.05 });
    }
  }

  /** Draw calls this system can add at peak: dust, sparks, tracers, visible flashes. */
  get draws() { return (this.dust.n ? 1 : 0) + (this.sparks.n ? 1 : 0) + (this.tracers.items.length ? 1 : 0) + this.flashes.filter((f) => f.life > 0).length; }

  update(dt) {
    if (!(dt > 0)) return;
    this.time += dt;
    this.dust.update(dt);
    this.sparks.update(dt);
    this.tracers.update(dt, this.camera ? this.camera.getWorldPosition(new THREE.Vector3()) : null);
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) { f.sprite.visible = false; continue; }
      const t = f.life / f.max;
      f.sprite.material.opacity = Math.min(1, t * 1.6);
      f.sprite.scale.setScalar(f.size * (1.25 - t * 0.25));
    }
    for (const L of this.lights) {
      if (L.life <= 0) { L.light.intensity = 0; continue; }
      L.life -= dt;
      L.light.intensity = L.life <= 0 ? 0 : L.peak * (L.life / L.max);
    }
  }
}
