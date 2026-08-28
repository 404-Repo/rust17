/**
 * DERRICK terrain. One displaced grid composed from docs/MAP-PLAN.md section 3, split into
 * the 7 x 6 bake blocks of section 8 so far tiles cull. Everything that shapes or paints the
 * ground lives in TERRAIN_SPEC as data; buildTerrain() turns it into meshes plus exact,
 * cheap samplers (heightAt matches the rendered triangles, not just the vertices).
 *
 * Order of the height function, per MAP-PLAN: base, domes, mounds, berms, flatten pads,
 * road smoothing, then the wadi and trench cuts (so a pad never fills the wadi back in;
 * "depth below the local ground" is measured against the pad and road heights), then the
 * tyre ruts and the sand ripples.
 *
 * The one deliberate departure from the plan text: the grid is sampled at 0.25 m, not the
 * 1.0 m the plan quotes. A 0.35 m rut and a 1.6 m wide trench do not exist on a 1.0 m grid,
 * and CLAIMS.md claims 3 and 12 are about exactly those features. Pass a spec with
 * `cell: 0.5` for a cheaper phone build; heightAt stays exact against whatever was built.
 */
import * as THREE from 'three';
import { RECIPES } from '../../surfaces.js';

const DEG = Math.PI / 180;

export const TERRAIN_SPEC = {
  cell: 0.25,
  bounds: { minX: -70, maxX: 70, minZ: -55, maxZ: 55 },
  blocks: { size: 20, originX: -70, originZ: -55, cols: 7, rows: 6 },

  // 3.1 base: the ground reading at running speed, not decoration.
  base: {
    octaves: [ { amp: 0.12, wl: 9 }, { amp: 0.04, wl: 2.5 }, { amp: 0.03, wl: 1.1 } ],   // third octave is ours: hummocks that catch the low sun
    // wind ripples on open sand only (never on road, pads, bed or trench floor)
    ripple: { amp: 0.010, wl: 1.25, dirDeg: 300, warp: 2.2 },
  },

  // 3.2 domes and 3.3 mounds: cosine falloff from h at centre to 0 at r.
  domes: [
    { name: 'west spawn rise', x: -48, z: 0, r: 34, h: 2.2 },
    { name: 'east spawn rise', x: 48, z: 0, r: 34, h: 2.2 },
  ],
  mounds: [
    { name: 'south west mound', x: -20, z: 40, r: 8, h: 1.2 },
    { name: 'north east mound', x: 36, z: -18, r: 7, h: 1.0 },
    { name: 'south centre mound', x: -8, z: 28, r: 6, h: 0.9 },
    { name: 'tank farm lip', x: -16, z: -24, r: 5, h: 0.6 },
  ],

  // 3.4 berms: ridge along a segment, flat crest, sloping sides, rounded ends, a road gap.
  berms: [
    { name: 'west berm', from: [-54, -12], to: [-54, 12], crest: 2, side: 3.2, h: 1.8, gap: { z0: 3, z1: 9, blend: 1.5 } },
    { name: 'east berm', from: [54, -12], to: [54, 12], crest: 2, side: 3.2, h: 1.8, gap: { z0: 3, z1: 9, blend: 1.5 } },
  ],

  // 3.5 wadi: trapezoid section, Catmull Rom path, graded entries.
  wadi: {
    points: [[-14, -55], [-10, -42], [-4, -30], [4, -22], [11, -12], [14, -2], [14, 8], [16, 18], [18, 30], [22, 42], [26, 55]],
    bedW: 4, topW: 9, depth: 2.6, lipR: 0.6,
    rampDeg: 20, rampLen: 7,
    entries: [
      { name: 'north ford', z: -33, banks: 'both' },
      { name: 'north entry', at: [-10, -46], banks: 'west' },
      { name: 'derrick entry', at: [7, -16], banks: 'west' },
      { name: 'south ford', z: 30, banks: 'both' },
      { name: 'south entry', at: [24, 48], banks: 'east' },
    ],
    // drums and debris darken the bed a little where the plan puts them; paint only
    bedStain: [[-6, -36], [12, -8], [17, 22], [21, 40]],
  },

  // 3.6 trench: rectangular section with end ramps and one side ramp.
  trench: {
    points: [[-46, 49], [-24, 49], [-22, 51], [2, 51], [4, 49], [30, 49]],
    width: 1.6, depth: 1.3, endRamp: 3, shoulder: 0.5,   // shoulder: the wall is 69 degrees over two cells, not one (a one cell wall Gouraud shades as a sawtooth)
    sideRamps: [ { at: [-12, 49], side: 'north', len: 3 } ],
  },

  // 3.7 flatten pads: override to y with a blended edge; painted by surface.
  pads: [
    { name: 'derrick pad', x0: -8, x1: 4, z0: -16, z1: -4, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'shed pad', x0: -19, x1: -13, z0: -15, z1: -5, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'tank farm hardstand', x0: -48, x1: -16, z0: -48, z1: -22, y: 0.6, surface: 'packed', blend: 1.5 },
    { name: 'pipe yard', x0: -12, x1: 30, z0: -48, z1: -22, y: 0.2, surface: 'packed', blend: 1.5 },
    { name: 'pump house pad', x0: -37, x1: -23, z0: 27, z1: 37, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'compound yard', x0: 26, x1: 56, z0: 24, z1: 50, y: 0.4, surface: 'packed', blend: 1.5 },
    { name: 'watchtower pad', x0: 24, x1: 28, z0: -50, z1: -46, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'west spawn plateau', x0: -70, x1: -58, z0: -14, z1: 14, y: 2.2, surface: 'sand', blend: 1.5 },
    { name: 'east spawn plateau', x0: 58, x1: 70, z0: -14, z1: 14, y: 2.2, surface: 'sand', blend: 1.5 },
  ],
  // concrete rings under the three storage tanks, paint only (8.6 m diameter)
  tankRings: [ { x: -40, z: -40, r: 4.3 }, { x: -27, z: -40, r: 4.3 }, { x: -30, z: -28, r: 4.3 } ],

  // 3.8 road: centre z = 6, 6 m wide, 5 m box filter along its length, causeway over the wadi.
  road: {
    z: 6, halfW: 3, verge: 1.5, filter: 5,
    causeway: { x0: 9, x1: 19, crestHalf: 4, slope: 1.0 },
    // the box tunnel: terrain is cut to bed level inside the culvert so the asset's tunnel is
    // real; the slot is narrower than the asset (3.4 m) so the cut faces hide inside its walls
    culvert: { x: 14, z: 6, halfW: 1.6, halfLen: 4, splay: 0.9 },
  },

  // tyre tracks: two bands 0.35 m wide, 1.6 m apart, packed darkened 8%, plus a 30 mm rut.
  tracks: {
    bandW: 0.35, gauge: 1.6, rut: 0.03, rutW: 0.5, darken: 0.08,
    branches: [
      { name: 'to pump house roller door', from: [-40, 9], ctrl: [-35, 17], to: [-30, 27] },
      { name: 'to compound north gap', from: [40, 9], ctrl: [45, 15], to: [47, 24] },
    ],
  },

  // painting: STYLE-LOCK palette, exact hex
  paint: {
    sand: 0xcdb88e, packed: 0xa89372, concrete: 0xb8ae9b, rock: 0xc4b393,
    rockSlopeDeg: 35, rockBlendDeg: 6,
    mottle: 0.08, streak: 0.035, ao: 0.18,
  },
};

// ------------------------------------------------------------------------------------------
// deterministic gradient noise (same idea as surfaces.js, kept local so this module has no
// dependency on unexported helpers)
function makeNoise(seed = 1) {
  const P = new Uint8Array(512);
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const cosFall = (d, r) => (d >= r ? 0 : 0.5 * (1 + Math.cos(Math.PI * d / r)));

/** A polyline with arc length; nearest() gives distance, arc length, side and tangent. */
class Polyline {
  constructor(points) {
    this.p = points;
    this.n = points.length - 1;
    this.len = new Float64Array(this.n);
    this.cum = new Float64Array(this.n + 1);
    this.box = [];
    for (let i = 0; i < this.n; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      this.len[i] = Math.hypot(bx - ax, bz - az);
      this.cum[i + 1] = this.cum[i] + this.len[i];
      this.box.push([Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)]);
    }
    this.total = this.cum[this.n];
  }
  /** nearest point within maxD (segments further than that are rejected by box first) */
  nearest(px, pz, maxD, out) {
    let best = Infinity, bs = 0, bside = 0, btx = 0, btz = 1, bqx = px, bqz = pz;
    for (let i = 0; i < this.n; i++) {
      const b = this.box[i];
      if (px < b[0] - maxD || px > b[1] + maxD || pz < b[2] - maxD || pz > b[3] + maxD) continue;
      const [ax, az] = this.p[i], [bx, bz] = this.p[i + 1];
      const L = this.len[i];
      if (L < 1e-9) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L;
      let t = ((px - ax) * tx + (pz - az) * tz);
      if (t < 0) t = 0; else if (t > L) t = L;
      const qx = ax + tx * t, qz = az + tz * t;
      const d = Math.hypot(px - qx, pz - qz);
      if (d < best) {
        best = d; bs = this.cum[i] + t; btx = tx; btz = tz; bqx = qx; bqz = qz;
        bside = tx * (pz - qz) - tz * (px - qx);     // > 0: west of a south running path
      }
    }
    out.d = best; out.s = bs; out.side = bside; out.tx = btx; out.tz = btz; out.qx = bqx; out.qz = bqz;
    return out;
  }
  arcAtZ(z) {
    let best = Infinity, s = 0;
    for (let i = 0; i <= this.n; i++) {
      const dz = Math.abs(this.p[i][1] - z);
      if (dz < best) { best = dz; s = this.cum[i]; }
    }
    return s;
  }
  arcAt(x, z) { const o = {}; this.nearest(x, z, 1e9, o); return o.s; }
  pointAt(s) {
    let i = 0;
    while (i < this.n - 1 && this.cum[i + 1] < s) i++;
    const [ax, az] = this.p[i], [bx, bz] = this.p[i + 1];
    const L = this.len[i] || 1, t = Math.max(0, Math.min(1, (s - this.cum[i]) / L));
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / L, tz: (bz - az) / L };
  }
}

function catmullPolyline(points, perSeg = 24) {
  const v = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(v, false, 'centripetal');
  const pts = curve.getPoints(perSeg * (points.length - 1));
  return new Polyline(pts.map((p) => [p.x, p.z]));
}

function bezierPolyline(from, ctrl, to, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * from[0] + 2 * u * t * ctrl[0] + t * t * to[0],
              u * u * from[1] + 2 * u * t * ctrl[1] + t * t * to[1]]);
  }
  return new Polyline(pts);
}

/** distance outside an axis aligned rectangle (0 inside) */
function rectDist(x, z, x0, x1, z0, z1) {
  const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
  return Math.hypot(dx, dz);
}

// ------------------------------------------------------------------------------------------
/**
 * The ground recipe from surfaces.js, made tileable. surface(THREE, 'ground') samples a non
 * periodic noise across the tile, so every repeat carries a seam, and heightToNormal wraps
 * around it into a one texel normal spike. On a 30 cm sand fillet nobody sees that; on a
 * 140 m terrain it draws a 2.6 m grid across the whole map. Same recipe, same seed, same
 * maths, with a 20% border crossfade so the repeat is continuous. Cached per size.
 */
let groundMaps = null;
function seamlessGround(T, size = 512) {
  if (groundMaps) return groundMaps;
  const r = RECIPES.ground;
  const noise = makeNoise(r.seed);
  const clamp = clamp01;
  const hAt = (u, v) => clamp(r.height(noise, u, v));
  const band = 0.2;
  const hf = new Float32Array(size * size);
  const alb = new Uint8ClampedArray(size * size * 4);
  const rgh = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const wv = v > 1 - band ? smooth01((v - (1 - band)) / band) : 0;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const wu = u > 1 - band ? smooth01((u - (1 - band)) / band) : 0;
      let h = hAt(u, v);
      if (wu > 0) h = mix(h, hAt(u - 1, v), wu);
      if (wv > 0) {
        let h2 = hAt(u, v - 1);
        if (wu > 0) h2 = mix(h2, hAt(u - 1, v - 1), wu);
        h = mix(h, h2, wv);
      }
      hf[y * size + x] = h;
      const t = clamp(r.tint(h, noise, u, v));
      const i = (y * size + x) * 4;
      alb[i] = t * 255; alb[i + 1] = t * 255; alb[i + 2] = t * 255; alb[i + 3] = 255;
      const rv = clamp(mix(r.rough[1], r.rough[0], h)) * 255;
      rgh[i] = rv; rgh[i + 1] = rv; rgh[i + 2] = rv; rgh[i + 3] = 255;
    }
  }
  // Gravel and grit: the recipe's height field is soft at the 2 to 6 cm scale, and that is the
  // scale that reads at running speed (CLAIMS.md claim 3). Pebbles are domes in the height
  // field, so the normal map gives each one a lit and a shaded side, plus a darker (packed or
  // rock pale) or lighter speck in the albedo. Periodic, so the repeat stays seamless.
  {
    let seed = 977;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const count = Math.round(size * size / 90);            // candidates per 2.6 m repeat
    const TAU = Math.PI * 2;
    for (let n = 0; n < count; n++) {
      const cx = rnd() * size, cy = rnd() * size;
      // gravel gathers in patches and leaves clean drifts between; the modulation is built
      // from sines so it is periodic and the repeat stays seamless
      const u = cx / size, v = cy / size;
      const m = 0.5 + 0.5 * Math.sin(TAU * (u + 0.35 * Math.sin(TAU * v + 1.7)))
              * Math.cos(TAU * (v * 2 + 0.3 * Math.sin(TAU * u * 3 + 0.4)));
      if (rnd() > 0.22 + 0.78 * m * m) continue;
      const rad = 1.5 + rnd() * rnd() * rnd() * 7;          // mostly grit, the odd stone up to 40 mm
      const dark = rnd() < 0.8;
      const tone = dark ? 0.66 + rnd() * 0.22 : 1.10 + rnd() * 0.08;
      const hgt = 0.3 + rnd() * 0.4;
      const ex = rnd() * 0.5 + 0.75;                        // slightly oval
      const R = Math.ceil(rad) + 1;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx / ex, dy) / rad;
        if (d >= 1) continue;
        const px = ((Math.round(cx) + dx) % size + size) % size, py = ((Math.round(cy) + dy) % size + size) % size;
        const i = py * size + px, i4 = i * 4;
        const dome = Math.sqrt(1 - d * d);
        hf[i] = Math.min(1, hf[i] + hgt * dome * 0.6);
        const t = 1 - smooth01((d - 0.6) / 0.4);            // soft edge on the colour
        const cur = alb[i4] / 255, nt = mix(cur, cur * tone, t);
        alb[i4] = nt * 255; alb[i4 + 1] = nt * 255; alb[i4 + 2] = nt * 255;
        rgh[i4] = mix(rgh[i4] / 255, 0.72, t) * 255; rgh[i4 + 1] = rgh[i4]; rgh[i4 + 2] = rgh[i4];
      }
    }
  }
  // height field to normal map by central difference, periodic (the field now is)
  const strength = r.bump * 2.4;
  const nrm = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => hf[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    nrm[i] = ((-dx / len) * 0.5 + 0.5) * 255;
    nrm[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
    nrm[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
    nrm[i + 3] = 255;
  }
  const mk = (data) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').putImageData(new ImageData(data, size, size), 0, 0);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter;
    return t;
  };
  groundMaps = { map: mk(alb), roughnessMap: mk(rgh), normalMap: mk(nrm), tileMeters: r.tile };
  groundMaps.map.colorSpace = T.SRGBColorSpace;
  return groundMaps;
}

export function buildTerrain(THREE_, spec = TERRAIN_SPEC) {
  const T = THREE_ || THREE;
  const t0 = performance.now();
  const cell = spec.cell || 0.25;
  const B = spec.bounds;
  const NX = Math.round((B.maxX - B.minX) / cell) + 1;
  const NZ = Math.round((B.maxZ - B.minZ) / cell) + 1;
  const N = NX * NZ;
  const X = (ix) => B.minX + ix * cell;
  const Z = (iz) => B.minZ + iz * cell;

  const H = new Float32Array(N);
  const wRoad = new Float32Array(N);      // packed paint weight from the road
  const wBed = new Float32Array(N);       // wadi bed
  const wTrench = new Float32Array(N);    // trench floor
  const wPack = new Float32Array(N);      // packed pads
  const wConc = new Float32Array(N);      // concrete pads and rings
  const wTrack = new Float32Array(N);     // tyre bands
  const wCut = new Float32Array(N);       // any cut (bank or floor) for ripple masking
  const cls = new Uint8Array(N);          // 0 sand 1 packed 2 concrete 3 rock

  const n1 = makeNoise(7), n2 = makeNoise(19), n3 = makeNoise(41), n4 = makeNoise(67);

  // ---- pass 1: base, domes, mounds, berms, pads
  const pads = spec.pads;
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      let h = 0;
      for (const o of spec.base.octaves) h += n1(x / o.wl + 13.1, z / o.wl + 7.7) * o.amp;
      for (const d of spec.domes) h += d.h * cosFall(Math.hypot(x - d.x, z - d.z), d.r);
      for (const m of spec.mounds) h += m.h * cosFall(Math.hypot(x - m.x, z - m.z), m.r);
      for (const b of spec.berms) {
        // distance to the crest segment, ends rounded
        const ax = b.from[0], az = b.from[1], bx = b.to[0], bz = b.to[1];
        const L = Math.hypot(bx - ax, bz - az);
        const tx = (bx - ax) / L, tz = (bz - az) / L;
        let t = (x - ax) * tx + (z - az) * tz; t = Math.max(0, Math.min(L, t));
        const d = Math.hypot(x - (ax + tx * t), z - (az + tz * t));
        const half = b.crest / 2;
        let f = d <= half ? 1 : d >= half + b.side ? 0 : 1 - (d - half) / b.side;
        f = f * f * (3 - 2 * f);
        if (b.gap) {
          const gc = (b.gap.z0 + b.gap.z1) / 2, gh = (b.gap.z1 - b.gap.z0) / 2;
          f *= smooth01((Math.abs(z - gc) - gh) / b.gap.blend);
        }
        h += b.h * f;
      }
      for (const p of pads) {
        const d = rectDist(x, z, p.x0, p.x1, p.z0, p.z1);
        if (d >= p.blend) continue;
        const w = smooth01(1 - d / p.blend);
        h = mix(h, p.y, w);
        if (p.surface === 'packed') wPack[i] = Math.max(wPack[i], w);
        else if (p.surface === 'concrete') wConc[i] = Math.max(wConc[i], w);
      }
      H[i] = h;
    }
  }

  // ---- road profile: box filter along x of the pre road height at the centre line
  const R = spec.road;
  const izRoad = Math.round((R.z - B.minZ) / cell);
  const half = Math.round(R.filter / cell / 2);
  const roadY = new Float32Array(NX);
  for (let ix = 0; ix < NX; ix++) {
    let s = 0, c = 0;
    for (let k = -half; k <= half; k++) {
      const j = Math.min(NX - 1, Math.max(0, ix + k));
      s += H[izRoad * NX + j]; c++;
    }
    roadY[ix] = s / c;
  }

  // ---- pass 2: road, wadi, trench, ruts, ripple
  const W = spec.wadi;
  const wadi = catmullPolyline(W.points, 24);
  const bedHalf = W.bedW / 2, bankW = (W.topW - W.bedW) / 2;
  const rampBank = W.depth / Math.tan(W.rampDeg * DEG);
  // an entry is a point on the centre line plus the path tangent there; its weight is measured
  // by projection onto that tangent, not by arc length, because on a bend the nearest centre
  // line point of a bank vertex slides along the curve and would push the ramp off one bank
  const entries = W.entries.map((e) => {
    const s = e.z !== undefined ? wadi.arcAtZ(e.z) : wadi.arcAt(e.at[0], e.at[1]);
    const pt = wadi.pointAt(s);
    return { x: pt.x, z: pt.z, tx: pt.tx, tz: pt.tz, banks: e.banks };
  });
  const TR = spec.trench;
  const trPts = TR.points.slice();
  {
    // extend both ends by the ramp length so the floor rises to ground over it
    const a = trPts[0], b = trPts[1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    trPts.unshift([a[0] - (b[0] - a[0]) / L * TR.endRamp, a[1] - (b[1] - a[1]) / L * TR.endRamp]);
    const c = trPts[trPts.length - 2], d = trPts[trPts.length - 1];
    const L2 = Math.hypot(d[0] - c[0], d[1] - c[1]);
    trPts.push([d[0] + (d[0] - c[0]) / L2 * TR.endRamp, d[1] + (d[1] - c[1]) / L2 * TR.endRamp]);
  }
  const trench = new Polyline(trPts);
  const trHalf = TR.width / 2;
  const tracks = spec.tracks.branches.map((b) => bezierPolyline(b.from, b.ctrl, b.to, 40));
  const TK = spec.tracks;
  const rip = spec.base.ripple;
  const rdx = Math.cos(rip.dirDeg * DEG), rdz = Math.sin(rip.dirDeg * DEG);
  const q = {};
  const maxWadiD = W.topW / 2 + rampBank + 2;
  const rutProfile = (off) => {
    // off: distance from the band centre; a shallow U, rutW wide
    const a = Math.abs(off);
    if (a >= TK.rutW / 2) return 0;
    return 0.5 * (1 + Math.cos(Math.PI * a / (TK.rutW / 2)));
  };
  const bandWeight = (off) => {
    const a = Math.abs(off);
    return a <= TK.bandW / 2 ? 1 : a >= TK.bandW / 2 + 0.15 ? 0 : 1 - (a - TK.bandW / 2) / 0.15;
  };

  // 2a. road: flattened across, verge blended. Written into H so the cuts see it as local ground.
  const onRoadA = new Uint8Array(N);
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    const dzr = Math.abs(z - R.z);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      if (dzr <= R.halfW) { H[i] = roadY[ix]; onRoadA[i] = 1; }
      else if (dzr < R.halfW + R.verge) {
        const w = smooth01((R.halfW + R.verge - dzr) / R.verge);
        H[i] = mix(H[i], roadY[ix], w);
      }
      // ragged paint edge for the packed road
      const edge = R.halfW + 0.35 * n2(x / 2.3, z / 2.3) + 0.15;
      wRoad[i] = dzr <= edge - 0.4 ? 1 : dzr >= edge + 0.4 ? 0 : 1 - (dzr - (edge - 0.4)) / 0.8;
    }
  }
  // local ground before any cut, kept so a ramp can be built from the centre line height
  const Lg = new Float32Array(H);
  const localAt = (x, z) => {
    let fx = (x - B.minX) / cell, fz = (z - B.minZ) / cell;
    fx = Math.max(0, Math.min(NX - 1.001, fx)); fz = Math.max(0, Math.min(NZ - 1.001, fz));
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, i = iz * NX + ix;
    return (Lg[i] * (1 - u) + Lg[i + 1] * u) * (1 - v) + (Lg[i + NX] * (1 - u) + Lg[i + NX + 1] * u) * v;
  };
  const tanRamp = Math.tan(W.rampDeg * DEG);

  // 2b. cuts, ruts, ripple
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      const dzr = Math.abs(z - R.z);
      const onRoad = onRoadA[i];
      const local = Lg[i];   // local ground for the cuts
      let h = local;

      // wadi cut
      wadi.nearest(x, z, maxWadiD, q);
      let cut = 0;
      if (q.d < maxWadiD) {
        let ramp = 0;
        const west = q.side > 0;
        for (const e of entries) {
          if (e.banks === 'both' || (e.banks === 'west') === west) {
            const ds = Math.abs((x - e.x) * e.tx + (z - e.z) * e.tz);
            const w = 1 - smooth01((ds - W.rampLen / 2) / (W.rampLen / 2));
            if (w > ramp) ramp = w;
          }
        }
        // plain bank: straight slope from bed to lip, relative to the local ground, with the
        // lip and the toe rounded over lipR (a sharp crease 45 degrees to the grid aliases
        // into a serrated silhouette; sand does not hold a sharp crease anyway)
        let f = 0;
        for (let k = -2; k <= 2; k++) {
          const dd = q.d + k * (W.lipR / 2);
          f += dd < bedHalf ? 1 : dd < bedHalf + bankW ? 1 - (dd - bedHalf) / bankW : 0;
        }
        const hn = local - W.depth * (f / 5);
        let hc = hn;
        if (ramp > 0) {
          // graded entry: a true 20 degree surface rising from the bed level at the centre line
          const centreLocal = localAt(q.qx, q.qz);
          const hr = Math.min(local, centreLocal - W.depth + Math.max(0, q.d - bedHalf) * tanRamp);
          hc = mix(hn, hr, ramp);
        }
        cut = local - hc;
        if (cut > 0.001) {
          // causeway: the road keeps its height, 1:1 shoulders down to the bed
          if (x >= R.causeway.x0 - 3 && x <= R.causeway.x1 + 3) {
            let cw = Math.min(local, roadY[ix] - Math.max(0, dzr - R.causeway.crestHalf) / R.causeway.slope);
            // culvert channel through the fill: bed level inside the box (sharp edged, the
            // asset's walls hide the cut faces), widening past the wing walls so the fill's
            // toe meets the natural bank instead of a stepped slot
            const C = R.culvert;
            const az = Math.abs(z - C.z), ax = Math.abs(x - C.x);
            const beyond = Math.max(0, az - C.halfLen);
            const hw = C.halfW + beyond * C.splay;
            const wx = 1 - smooth01((ax - hw) / (beyond > 0 ? 1.2 : 0.3));
            if (wx > 0) cw = mix(cw, Math.min(cw, local - W.depth), wx);
            // soft maximum with the bank: a hard crease where the fill meets the bank aliases
            const tb = smooth01((cw - hc) / 0.8 + 0.5);
            hc = mix(hc, Math.max(hc, cw), tb);
          }
          h = hc;
          cut = local - hc;
          wCut[i] = Math.max(wCut[i], cut / W.depth);
          wBed[i] = q.d < bedHalf ? 1 : q.d < bedHalf + 1.0 ? 1 - (q.d - bedHalf) : 0;
          if (cut < W.depth * 0.999 && q.d >= bedHalf) wBed[i] *= 0.6;
        }
      }

      // trench cut
      trench.nearest(x, z, trHalf + TR.shoulder + 0.5, q);
      let tcut = 0;
      if (q.d < trHalf + TR.shoulder) {
        const rampF = Math.min(1, q.s / TR.endRamp, (trench.total - q.s) / TR.endRamp);
        const depth = TR.depth * Math.max(0, rampF);
        tcut = q.d <= trHalf ? depth : depth * (1 - (q.d - trHalf) / TR.shoulder);
        if (q.d <= trHalf) wTrench[i] = 1;
      }
      for (const sr of TR.sideRamps) {
        const [sx, sz] = sr.at;
        const dir = sr.side === 'north' ? -1 : 1;
        const zEdge = sz + dir * trHalf, zFar = zEdge + dir * sr.len;
        const zin = dir < 0 ? (z <= zEdge && z >= zFar) : (z >= zEdge && z <= zFar);
        if (Math.abs(x - sx) <= trHalf && zin) {
          const f = 1 - Math.abs(z - zEdge) / sr.len;
          tcut = Math.max(tcut, TR.depth * f);
          wTrench[i] = Math.max(wTrench[i], 0.8);
        } else if (Math.abs(x - sx) <= trHalf + TR.shoulder && zin) {
          const f = (1 - Math.abs(z - zEdge) / sr.len) * (1 - (Math.abs(x - sx) - trHalf) / TR.shoulder);
          tcut = Math.max(tcut, TR.depth * f);
        }
      }
      // the trench runs into the wadi at its east end: take the deeper cut, never both
      if (tcut > 0) { const ht = local - tcut; if (ht < h) { h = ht; wCut[i] = Math.max(wCut[i], tcut / TR.depth); } else wTrench[i] = 0; }

      // tyre tracks: road bands the whole length, plus the two branches
      let track = 0, rut = 0;
      if (dzr < TK.gauge / 2 + TK.rutW) {
        for (const sgn of [-1, 1]) {
          const off = (z - R.z) - sgn * TK.gauge / 2;
          track = Math.max(track, bandWeight(off));
          rut = Math.max(rut, rutProfile(off));
        }
      }
      for (const tk of tracks) {
        tk.nearest(x, z, TK.gauge / 2 + TK.rutW, q);
        if (q.d < TK.gauge / 2 + TK.rutW) {
          const off = q.d - TK.gauge / 2;
          track = Math.max(track, bandWeight(off));
          rut = Math.max(rut, rutProfile(off));
        }
      }
      if (rut > 0) h -= TK.rut * rut * (1 - 0.3 * n3(x * 0.8, z * 0.8));
      wTrack[i] = track;

      // wind ripples on open sand only
      const open = 1 - Math.max(onRoad, wCut[i], wPack[i], wConc[i], track, Math.min(1, wRoad[i] * 2));
      if (open > 0) {
        const warp = n4(x / 3.1, z / 3.1) * rip.warp;
        const ph = ((x * rdx + z * rdz) / rip.wl) * Math.PI * 2 + warp;
        h += rip.amp * Math.sin(ph) * open * (0.6 + 0.4 * n3(x / 5.3 + 3, z / 5.3));
      }

      H[i] = h;
    }
  }

  // ---- samplers over the finished grid
  const inv = 1 / cell;
  function heightAt(x, z) {
    let fx = (x - B.minX) * inv, fz = (z - B.minZ) * inv;
    if (fx < 0) fx = 0; else if (fx > NX - 1) fx = NX - 1;
    if (fz < 0) fz = 0; else if (fz > NZ - 1) fz = NZ - 1;
    let ix = fx | 0, iz = fz | 0;
    if (ix >= NX - 1) ix = NX - 2;
    if (iz >= NZ - 1) iz = NZ - 2;
    const u = fx - ix, v = fz - iz;
    const i = iz * NX + ix;
    const ha = H[i], hb = H[i + 1], hc = H[i + NX], hd = H[i + NX + 1];
    // same diagonal as the mesh (b to c), so the sample lies exactly on the drawn triangle
    if (u + v <= 1) return ha + (hb - ha) * u + (hc - ha) * v;
    return hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v);
  }
  const eps = cell;
  function normalAt(x, z, out) {
    out = out || new T.Vector3();
    const dx = (heightAt(x + eps, z) - heightAt(x - eps, z)) / (2 * eps);
    const dz = (heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
    return out.set(-dx, 1, -dz).normalize();
  }
  const _n = new T.Vector3();
  function slopeAt(x, z) { normalAt(x, z, _n); return Math.acos(Math.min(1, Math.max(-1, _n.y))); }

  // ---- pass 3: slopes, paint, class
  const P = spec.paint;
  const col = new Float32Array(N * 3);
  const cSand = new T.Color(P.sand), cPack = new T.Color(P.packed), cConc = new T.Color(P.concrete), cRock = new T.Color(P.rock);
  const rock0 = (P.rockSlopeDeg - P.rockBlendDeg / 2) * DEG, rock1 = (P.rockSlopeDeg + P.rockBlendDeg / 2) * DEG;
  const rings = spec.tankRings;
  const stains = W.bedStain;
  const c = new T.Color();
  const lapStep = Math.max(1, Math.round(1.0 / cell));
  const at = (ix, iz) => H[Math.min(NZ - 1, Math.max(0, iz)) * NX + Math.min(NX - 1, Math.max(0, ix))];
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      // slope from the grid
      const gx = (at(ix + 1, iz) - at(ix - 1, iz)) / (2 * cell);
      const gz = (at(ix, iz + 1) - at(ix, iz - 1)) / (2 * cell);
      const slope = Math.atan(Math.hypot(gx, gz));
      const wRock = smooth01((slope - rock0) / (rock1 - rock0));

      let wc = wConc[i];
      for (const r of rings) {
        const d = Math.hypot(x - r.x, z - r.z) + 0.25 * n3(x / 1.1 + 40, z / 1.1);   // sand drifted over the edge
        if (d < r.r + 0.3) wc = Math.max(wc, d <= r.r ? 1 : 1 - (d - r.r) / 0.3);
      }
      const wp = Math.max(wRoad[i], wBed[i], wTrench[i], wPack[i]);

      c.copy(cSand);
      c.lerp(cPack, wp);
      c.lerp(cConc, wc);
      c.lerp(cRock, wRock);
      // tyre bands: packed darkened 8%
      if (wTrack[i] > 0) c.multiplyScalar(1 - TK.darken * wTrack[i]);
      // mottle: three scales so no 1 m^2 reads flat
      let m = 1 + P.mottle * n2(x / 3.5 + 50, z / 3.5) + 0.045 * n3(x / 0.9, z / 0.9 + 20) + 0.015 * n1(x / 0.7 + 9, z / 0.7)
              + P.streak * n4((x * rdx + z * rdz) / 1.1, (x * -rdz + z * rdx) / 9 + 8);
      // concavity darkening at 1 m and at the grid scale (ruts, trench and bed edges)
      const lap1 = at(ix + lapStep, iz) + at(ix - lapStep, iz) + at(ix, iz + lapStep) + at(ix, iz - lapStep) - 4 * H[i];
      const lap0 = at(ix + 1, iz) + at(ix - 1, iz) + at(ix, iz + 1) + at(ix, iz - 1) - 4 * H[i];
      const ao = Math.min(P.ao, Math.max(-0.06, lap1 * 0.35 + lap0 * 2.5));
      m *= 1 - ao;
      // damp stain in the bed near the listed debris
      for (const s of stains) {
        const d = Math.hypot(x - s[0], z - s[1]);
        if (d < 3) m *= 1 - 0.10 * (1 - d / 3) * wBed[i];
      }
      col[i * 3] = c.r * m; col[i * 3 + 1] = c.g * m; col[i * 3 + 2] = c.b * m;
      cls[i] = wRock > 0.5 ? 3 : wc > 0.5 ? 2 : wp > 0.5 ? 1 : 0;
    }
  }

  // ---- tiles: 7 x 6 blocks, shared vertex rows so there is never a crack
  const maps = seamlessGround(T);
  const material = new T.MeshStandardMaterial({
    name: 'ground', color: 0xffffff, vertexColors: true,
    roughness: 0.94, metalness: 0.0,
    map: maps.map, roughnessMap: maps.roughnessMap, normalMap: maps.normalMap,
    normalScale: new T.Vector2(1.0, 1.0),
  });
  // Fade the normal map out with distance: past 25 m a 5 mm texel is far below a pixel and
  // only adds sparkle; the vertex relief and the haze carry the far ground.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'mapN.xy *= normalScale;',
      'mapN.xy *= normalScale * ( 1.0 - smoothstep( 25.0, 60.0, length( vViewPosition ) ) );');
  };
  material.customProgramCacheKey = () => 'derrick_ground_fade';
  const BL = spec.blocks;
  const perBlock = Math.round(BL.size / cell);
  const tiles = [];
  const uvScale = 1 / maps.tileMeters;
  for (let bz = 0; bz < BL.rows; bz++) {
    for (let bx = 0; bx < BL.cols; bx++) {
      const ix0 = bx * perBlock, iz0 = bz * perBlock;
      const nx = Math.min(perBlock, NX - 1 - ix0) + 1;
      const nz = Math.min(perBlock, NZ - 1 - iz0) + 1;
      if (nx < 2 || nz < 2) continue;
      const vc = nx * nz;
      const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), cc = new Float32Array(vc * 3);
      let k = 0;
      for (let j = 0; j < nz; j++) {
        for (let i2 = 0; i2 < nx; i2++) {
          const ix = ix0 + i2, iz = iz0 + j;
          const gi = iz * NX + ix;
          const x = X(ix), z = Z(iz);
          pos[k * 3] = x; pos[k * 3 + 1] = H[gi]; pos[k * 3 + 2] = z;
          const gx = (at(ix + 1, iz) - at(ix - 1, iz)) / (2 * cell);
          const gz = (at(ix, iz + 1) - at(ix, iz - 1)) / (2 * cell);
          const il = 1 / Math.hypot(gx, 1, gz);
          nor[k * 3] = -gx * il; nor[k * 3 + 1] = il; nor[k * 3 + 2] = -gz * il;
          // world xz UVs stretch into streaks on a wall; skewing by height gives steep faces
          // texture variation while a near flat ground shifts by a few centimetres at most
          uv[k * 2] = (x + 0.8 * H[gi]) * uvScale; uv[k * 2 + 1] = (z + 0.55 * H[gi]) * uvScale;
          cc[k * 3] = col[gi * 3]; cc[k * 3 + 1] = col[gi * 3 + 1]; cc[k * 3 + 2] = col[gi * 3 + 2];
          k++;
        }
      }
      const quads = (nx - 1) * (nz - 1);
      const idx = vc > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6);
      let q2 = 0;
      for (let j = 0; j < nz - 1; j++) {
        for (let i2 = 0; i2 < nx - 1; i2++) {
          const a = j * nx + i2, b = a + 1, cV = a + nx, d = cV + 1;
          idx[q2++] = a; idx[q2++] = cV; idx[q2++] = b;
          idx[q2++] = b; idx[q2++] = cV; idx[q2++] = d;
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('normal', new T.BufferAttribute(nor, 3));
      g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      g.setAttribute('color', new T.BufferAttribute(cc, 3));
      g.setIndex(new T.BufferAttribute(idx, 1));
      g.computeBoundingBox(); g.computeBoundingSphere();
      const mesh = new T.Mesh(g, material);
      mesh.name = `terrain_${bx}_${bz}`;
      mesh.receiveShadow = true;
      mesh.castShadow = true;         // the wadi bank must shade the bed
      mesh.userData.block = { bx, bz, key: `${bx}_${bz}` };
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      tiles.push(mesh);
    }
  }

  const names = ['sand', 'packed', 'concrete', 'rock'];
  function surfaceAt(x, z) {
    let ix = Math.round((x - B.minX) * inv), iz = Math.round((z - B.minZ) * inv);
    if (ix < 0) ix = 0; else if (ix > NX - 1) ix = NX - 1;
    if (iz < 0) iz = 0; else if (iz > NZ - 1) iz = NZ - 1;
    return names[cls[iz * NX + ix]];
  }
  function blockOf(x, z) {
    let bx = Math.floor((x - BL.originX) / BL.size), bz = Math.floor((z - BL.originZ) / BL.size);
    bx = Math.max(0, Math.min(BL.cols - 1, bx)); bz = Math.max(0, Math.min(BL.rows - 1, bz));
    return { bx, bz, key: `${bx}_${bz}` };
  }
  let hMin = Infinity, hMax = -Infinity;
  for (let i = 0; i < N; i++) { if (H[i] < hMin) hMin = H[i]; if (H[i] > hMax) hMax = H[i]; }

  console.info(`[terrain] ${NX}x${NZ} verts at ${cell} m, ${tiles.length} tiles, y ${hMin.toFixed(2)}..${hMax.toFixed(2)}, ${(performance.now() - t0).toFixed(0)} ms`);

  return {
    tiles, material, heightAt, normalAt, slopeAt, surfaceAt, blockOf,
    bounds: { minX: B.minX, maxX: B.maxX, minZ: B.minZ, maxZ: B.maxZ },
    // raw grid for anyone who wants it (navgrid): heights row major, iz * nx + ix
    grid: { heights: H, classes: cls, nx: NX, nz: NZ, cell, minX: B.minX, minZ: B.minZ, hMin, hMax },
    spec,
  };
}
