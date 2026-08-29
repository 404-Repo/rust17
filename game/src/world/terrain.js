/**
 * DERRICK terrain. One displaced grid composed from docs/MAP-PLAN.md section 3, split into
 * the 7 x 6 bake blocks of section 8 so far tiles cull. Everything that shapes or paints the
 * ground lives in TERRAIN_SPEC as data; buildTerrain() turns it into meshes plus exact,
 * cheap samplers (heightAt matches the rendered triangles, not just the vertices).
 *
 * Order of the height function, per MAP-PLAN: base, domes, mounds, berms, flatten pads,
 * road smoothing, then the wadi and trench cuts (so a pad never fills the wadi back in;
 * "depth below the local ground" is measured against the pad and road heights). That is
 * the SMOOTH field S, sampled at the mesh cell.
 *
 * On top of S sits the DETAIL field D: tyre ruts, wind ripples, hummocks, gravel hollows and
 * the sand drift against the foot of every prop. D is evaluated at a fine step (0.125 m,
 * spec.detail.cellF) over the whole map and stored two ways:
 *   - its value at every mesh vertex goes into the geometry (H = S + D), so heightAt and the
 *     collision see the ruts and the drifts, and
 *   - its GRADIENT goes into a world space texture that the ground material reads per pixel
 *     and folds into the surface normal (a normal map that follows the map, not a tile).
 * So a 0.7 m rut with a lit lip and a shaded lip exists on a 0.5 m mesh, and every drift, ripple
 * and hollow has a sun side and a shade side at texel resolution. Vertex normals come from S
 * only, so the detail is never counted twice. Nothing here is a baked light: the shading is
 * the rig's, applied to a finer normal.
 *
 * The same texture carries a gravel mask (blue channel). The ground material blends two tile
 * sets by it: open sand (soft relief, sparse fine grit) and gravel (pebbles with a lit and a
 * shaded side, in the normal map, not as dark spots in the albedo). Gravel gathers in patches
 * of 4 to 15 m on the open sand, on the packed hardstands and in the wadi bed.
 *
 * The one deliberate departure from the plan text: the grid is sampled at 0.25 m by default,
 * not the 1.0 m the plan quotes. The integrator passes 0.5 (high) or 1.0 (phone); the detail
 * texture carries the fine relief either way and heightAt stays exact against what was built.
 */
import * as THREE from 'three';
import { FOOTPRINT_PADS } from './footprint_pads.js?v=r16-202608291520';
import { RECIPES } from '../../surfaces.js?v=r16-202608291520';
import { PLACEMENTS } from '../level/placements.js?v=r16-202608291520';

const DEG = Math.PI / 180;

export const TERRAIN_SPEC = {
  cell: 0.25,
  bounds: { minX: -70, maxX: 70, minZ: -55, maxZ: 55 },
  blocks: { size: 20, originX: -70, originZ: -55, cols: 7, rows: 6 },

  // 3.1 base: the ground reading at running speed, not decoration.
  base: {
    // the third octave is the round 2 addition: a 24 m swell of 0.22 m so open sand between the
    // features rolls instead of lying dead flat (pads override it, the road is filtered over it)
    octaves: [ { amp: 0.12, wl: 9 }, { amp: 0.04, wl: 2.5 }, { amp: 0.22, wl: 24 } ],
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
    // Spoil heaps (round 2): the subsoil graded off the pads and the wadi, heaped where a
    // dozer leaves it, on the verges and around the yards. Each has a steeper downwind (ENE)
    // face (`lee` shortens the radius on that side) and a wobbled outline (`warp`), so every
    // one shows a sunlit west face and a shaded east face at 16:30 and casts onto the sand
    // behind it. `spoil` marks them for the paint (packed subsoil, gravelly, no wind ripples).
    // Sited in the gaps of the placement list: no closed base prop inside a heap's radius,
    // checked by work/fix2_world/check_heaps.mjs against level/placements.js.
    { name: 'west road heap', x: -33.5, z: -8, r: 3.6, h: 1.05, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'tower verge heap', x: -43, z: -4.5, r: 2.8, h: 0.8, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'shed verge heap', x: -22, z: -2, r: 3.2, h: 0.95, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'pump jack west heap', x: -47, z: 16, r: 4.0, h: 1.1, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'north exit heap', x: -54, z: -21, r: 4.0, h: 1.1, lee: 0.12, warp: 0.05, spoil: 1 },
    { name: 'tank farm west heap', x: -55, z: -30, r: 4.0, h: 1.2, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'east road heap', x: 46, z: -6, r: 4.0, h: 1.1, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'east verge heap', x: 40, z: -3, r: 3.0, h: 0.85, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'pickup heap', x: 47, z: 18, r: 4.2, h: 1.1, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'north east yard heap', x: 56, z: -32, r: 4.0, h: 1.2, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'mast heap', x: 5, z: 17, r: 3.5, h: 1.0, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'container heap', x: 27, z: 16, r: 3.5, h: 1.1, lee: 0.15, warp: 0.05, spoil: 1 },
    { name: 'trench heap', x: -6, z: 44, r: 3.5, h: 1.0, lee: 0.15, warp: 0.05, spoil: 1 },
  ],

  // 3.4 berms: ridge along a segment, flat crest, sloping sides, rounded ends, a road gap.
  berms: [
    { name: 'west berm', from: [-54, -12], to: [-54, 12], crest: 2, side: 3.2, h: 1.8, gap: { z0: 3, z1: 9, blend: 1.5 } },
    { name: 'east berm', from: [54, -12], to: [54, 12], crest: 2, side: 3.2, h: 1.8, gap: { z0: 3, z1: 9, blend: 1.5 } },
    // round 2: a sand ridge on the south west flank, between the south exit and the pump house
    // pad, 2.2 m over a 5.5 m side (31 degrees, under the nav grid's 35), no gap
    { name: 'south west dune', from: [-53, 27], to: [-45, 38], crest: 2, side: 5.5, h: 2.2 },
  ],

  // 3.5 wadi: trapezoid section, Catmull Rom path, graded entries.
  wadi: {
    points: [[-14, -55], [-10, -42], [-4, -30], [4, -22], [11, -12], [14, -2], [14, 8], [16, 18], [18, 30], [22, 42], [26, 55]],
    bedW: 4, topW: 9, depth: 2.6, lipR: 0.4,
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
    { name: 'derrick pad', x0: -8.6, x1: 4.6, z0: -16.6, z1: -3.4, y: 0.3, surface: 'concrete', blend: 1.5 },   // round 15: 0.6 m wider, the base module's deck overhung the pad edge
    { name: 'shed pad', x0: -19, x1: -13, z0: -15, z1: -5, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'tank farm hardstand', x0: -48, x1: -16, z0: -48, z1: -22, y: 0.6, surface: 'packed', blend: 1.5 },
    { name: 'pipe yard', x0: -12, x1: 30, z0: -48, z1: -22, y: 0.2, surface: 'packed', blend: 1.5 },
    { name: 'pump house pad', x0: -37, x1: -23, z0: 27, z1: 37, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'compound yard', x0: 26, x1: 56, z0: 24, z1: 50, y: 0.4, surface: 'packed', blend: 1.5 },
    { name: 'watchtower pad', x0: 24, x1: 28, z0: -50, z1: -46, y: 0.3, surface: 'concrete', blend: 1.5 },
    { name: 'west spawn plateau', x0: -70, x1: -58, z0: -14, z1: 14, y: 2.2, surface: 'sand', blend: 1.5 },
    { name: 'east spawn plateau', x0: 58, x1: 70, z0: -14, z1: 14, y: 2.2, surface: 'sand', blend: 1.5 },
    ...FOOTPRINT_PADS,   // round 15: one flat sand pad under every object that overhung (footprint_pads.js)
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

  // tyre tracks: two bands 0.4 m wide, 1.6 m apart, packed darkened 10%, in a 90 mm rut
  // 0.7 m wide (a loaded truck in soft sand; the plan's 30 mm is a car on a hard road and
  // does not exist on a 0.5 m mesh). The road carries them full length; the branches are the
  // plan's two plus the service tracks a lease actually has: road to hardstand, road to the
  // shed, road to the pipe yard, road to the east pump jack. `wander` is the driver's line.
  tracks: {
    bandW: 0.4, gauge: 1.6, rut: 0.16, rutW: 0.8, darken: 0.11, wander: 0.22, wanderWl: 7,
    branches: [
      // round 2: the service tracks a lease actually has on the verges, where the harness and
      // the players walk: spawn plateau to the west tower and on to the shed, and the mirror
      { name: 'spawn service track west', from: [-58, -2], ctrl: [-45, -0.2], to: [-36, -4] },
      { name: 'service track to the shed', from: [-36, -4], ctrl: [-28, -3], to: [-20.5, -6] },
      { name: 'spawn service track east', from: [58, -2], ctrl: [46, -1.5], to: [36, -4] },
      { name: 'to pump house roller door', from: [-40, 9], ctrl: [-35, 17], to: [-30, 27] },
      { name: 'to compound north gap', from: [40, 9], ctrl: [45, 15], to: [47, 24] },
      { name: 'to tank farm hardstand', from: [-52, 4], ctrl: [-46, -8], to: [-40, -22] },
      { name: 'to the shed', from: [-32, 4], ctrl: [-26, -6], to: [-20, -16] },
      { name: 'to pipe yard east', from: [24, 4], ctrl: [28, -8], to: [26, -22] },
      { name: 'to east pump jack', from: [52, 4], ctrl: [46, -6], to: [38, -14] },
    ],
  },

  // detail field: everything finer than the mesh cell (see the header)
  detail: {
    cellF: 0.125,
    // hummocks: the third octave of the plan's base, plus grain at half a metre
    hummocks: [ { amp: 0.035, wl: 1.3 }, { amp: 0.012, wl: 0.5 } ],
    // wind ripples on open sand only, 0.9 m mega ripples 18 mm high, in patches
    ripple: { amp: 0.014, wl: 0.9, dirDeg: 300, warp: 2.2, patchWl: 6 },
    // gravel: patches of 4 to 15 m on open sand (about a quarter of it), sunk 30 mm as a
    // deflation hollow so the patch edge has a lip; packed ground and the wadi bed are gravelly
    gravel: { wl1: 5.5, wl2: 14, threshold: 0.56, width: 0.14, sink: 0.03 },
    // sand drift against the foot of every prop: fMax = clamp(a + b * assetHeight, hMin, hMax),
    // out from the face `out` (upwind) to `out * tail` (downwind), profile (1 - t)^2
    drift: { a: 0.08, b: 0.055, hMin: 0.09, hMax: 0.35, out: 0.9, tail: 1.9, inside: 0.6, windDeg: 300 },
  },

  // painting: STYLE-LOCK palette, exact hex
  paint: {
    sand: 0xcdb88e, packed: 0xa89372, concrete: 0xb8ae9b, rock: 0xc4b393,
    rockSlopeDeg: 35, rockBlendDeg: 6,
    mottle: 0.08, streak: 0.035, ao: 0.18,
    gravelTint: [0.93, 0.935, 0.95],
  },
};

/**
 * Footprints for the sand drift, from docs/OBJECTS.tsv (w x d x h, metres; r for round
 * things). Only things that stand on the ground with a closed base are here: open trestles,
 * stairs, ladders, catwalks, fences, pipe runs and interior furniture are not, and anything on
 * a concrete pad is skipped at build time whatever this table says.
 */
const DRIFT_FOOTPRINTS = {
  oil_storage_tank: { r: 4.0, h: 5.2 , p: 0}, oil_storage_tank_open: { r: 4.0, h: 5.2 , p: 0},
  bullet_tank_horizontal: { w: 8.0, d: 2.6, h: 3.2 },
  bunkhouse_building: { w: 14.0, d: 8.0, h: 5.2 , p: 0}, pump_house_building: { w: 12.0, d: 8.0, h: 5.2 , p: 0},
  compound_wall_panel: { w: 4.0, d: 0.4, h: 2.4 , p: 0}, corrugated_wall_panel: { w: 3.0, d: 0.15, h: 2.4 , p: 0},
  pipe_rack_stack: { w: 6.0, d: 2.0, h: 1.6 },
  floodlight_mast: { w: 1.4, d: 1.4, h: 2.0 },
  // lattice towers and skids: sand banks against the legs from outside, the inside stays put
  watchtower_gantry: { w: 3.0, d: 3.0, h: 1.5, p: 0 },
  pump_jack: { w: 9.0, d: 2.6, h: 1.0, p: 0, m: 1 },       // m: a mover whose skid is static
  large_pipe_section: { w: 8.0, d: 1.5, h: 1.6, p: 0 },
  sandbag_wall: { w: 2.0, d: 0.6, h: 1.0 , p: 0}, jersey_barrier: { w: 3.0, d: 0.6, h: 0.82 , p: 0},
  crate_stack: { w: 1.2, d: 1.0, h: 1.3 , p: 0}, oil_drum: { r: 0.3, h: 0.88 , p: 0}, ibc_tote: { w: 1.2, d: 1.0, h: 1.16 , p: 0},
  tyre_stack: { r: 0.5, h: 1.2 , p: 0},
  shipping_container_rust_red: { w: 6.06, d: 2.44, h: 2.59 , p: 0}, shipping_container_blue: { w: 6.06, d: 2.44, h: 2.59 , p: 0},
  shipping_container_tan: { w: 6.06, d: 2.44, h: 2.59 , p: 0}, shipping_container_open: { w: 6.06, d: 2.44, h: 2.59 , p: 0},
  rock_outcrop_large: { w: 8.0, d: 5.0, h: 3.0 }, rock_outcrop_small: { w: 2.0, d: 1.5, h: 1.0 },
  generator_set: { w: 3.2, d: 1.2, h: 1.9 , p: 0},
  fuel_truck_wreck: { w: 8.0, d: 2.5, h: 3.2 }, pickup_wreck: { w: 5.2, d: 2.0, h: 1.8 },
  wooden_pallet_stack: { w: 1.2, d: 0.8, h: 1.0 }, valve_manifold: { w: 2.4, d: 1.0, h: 1.2 },
  wellhead_christmas_tree: { w: 1.2, d: 1.2, h: 2.0 },
  palm_tree: { r: 0.5, h: 3.0 }, dead_shrub: { r: 0.5, h: 0.5 },
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
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < this.n; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      this.len[i] = Math.hypot(bx - ax, bz - az);
      this.cum[i + 1] = this.cum[i] + this.len[i];
      this.box.push([Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)]);
      x0 = Math.min(x0, ax, bx); x1 = Math.max(x1, ax, bx); z0 = Math.min(z0, az, bz); z1 = Math.max(z1, az, bz);
    }
    this.bbox = [x0, x1, z0, z1];
    this.total = this.cum[this.n];
  }
  /** nearest point within maxD (segments further than that are rejected by box first) */
  nearest(px, pz, maxD, out) {
    let best = Infinity, bs = 0, bside = 0, btx = 0, btz = 1, bqx = px, bqz = pz;
    const bb = this.bbox;
    if (px < bb[0] - maxD || px > bb[1] + maxD || pz < bb[2] - maxD || pz > bb[3] + maxD) {
      out.d = best; out.s = 0; out.side = 0; out.tx = 0; out.tz = 1; out.qx = px; out.qz = pz;
      return out;
    }
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
 * The ground recipe from surfaces.js, made tileable, in two variants. surface(THREE,
 * 'ground') samples a non periodic noise across the tile, so every repeat carries a seam, and
 * heightToNormal wraps around it into a one texel normal spike. On a 30 cm sand fillet nobody
 * sees that; on a 140 m terrain it draws a 2.6 m grid across the whole map. Same recipe, same
 * seed, same maths, with a 20% border crossfade so the repeat is continuous.
 *
 * 'sand': the recipe's soft relief plus sparse fine grit, albedo nearly plain (open sand is
 * not spotted; the shading comes from the relief).
 * 'gravel': dense pebbles 1 to 3.5 cm as hemispheres in the height field, so the normal map
 * gives each a lit side and a shaded side, with a mild albedo speck and a darker contact rim.
 * Where gravel lies is decided per pixel by the world mask, not by the tile.
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
  const tint = new Float32Array(size * size);
  const rgh0 = new Float32Array(size * size);
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
      tint[y * size + x] = clamp(r.tint(h, noise, u, v));
      rgh0[y * size + x] = clamp(mix(r.rough[1], r.rough[0], h));
    }
  }
  // pebbles: hemispheres in a separate height field, matching albedo and roughness
  const pebbles = (seed, count, radMin, radMax, opts) => {
    let s = seed;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const peb = new Float32Array(size * size);
    const alb = new Float32Array(size * size * 3);
    const rgh = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) { alb[i * 3] = alb[i * 3 + 1] = alb[i * 3 + 2] = tint[i]; rgh[i] = rgh0[i]; }
    for (let n = 0; n < count; n++) {
      const cx = rnd() * size, cy = rnd() * size;
      const rad = radMin + rnd() * rnd() * (radMax - radMin);
      const kind = rnd();
      let tone, tb;
      if (kind < opts.darkP) { tone = (opts.toneDark || 0.80) + rnd() * (opts.toneDarkW || 0.12); tb = 1.0; }            // most: a shade darker
      else if (kind < opts.darkP + opts.lightP) { tone = 1.04 + rnd() * 0.08; tb = 0.99; }   // pale quartz
      else { tone = 0.86 + rnd() * 0.06; tb = 1.05; }                             // grey stone, a touch cool
      const hgt = opts.hMin + rnd() * (opts.hMax - opts.hMin);
      const ex = rnd() * 0.5 + 0.75;                        // slightly oval
      const R = Math.ceil(rad * 1.25) + 1;
      const ox = Math.round(cx), oy = Math.round(cy);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx / ex, dy) / rad;
        if (d >= 1.25) continue;
        const px = ((ox + dx) % size + size) % size, py = ((oy + dy) % size + size) % size;
        const i = py * size + px;
        if (d < 1) {
          const dome = Math.sqrt(1 - d * d);
          peb[i] = Math.max(peb[i], hgt * dome);
          const t = 1 - smooth01((d - 0.75) / 0.25);        // colour holds to the edge
          const cur = alb[i * 3];
          alb[i * 3] = mix(cur, cur * tone, t); alb[i * 3 + 1] = mix(alb[i * 3 + 1], alb[i * 3 + 1] * tone, t); alb[i * 3 + 2] = mix(alb[i * 3 + 2], alb[i * 3 + 2] * tone * tb, t);
          rgh[i] = mix(rgh[i], 0.72, t);
        } else {
          // contact rim: dust and shade gather at the foot of a stone
          const t = 1 - smooth01((d - 1) / 0.25);
          const k = 1 - opts.rim * t;
          alb[i * 3] *= k; alb[i * 3 + 1] *= k; alb[i * 3 + 2] *= k;
        }
      }
    }
    return { peb, alb, rgh };
  };
  // wind ripples at the sand grain scale: 12 cm wavelength, a gentle stoss side and a steep
  // lee side (the profile every desert photograph shows), sharp crested, running with the
  // 300 degree wind. Periodic in the tile: integer wave numbers (11, -19) give 21.95 waves per
  // 2.6 m repeat at 300 degrees; the warp and the in tile strength are sines so they repeat too.
  const rip = new Float32Array(size * size);
  {
    const TAU = Math.PI * 2;
    const kx = 11, ky = -19;
    const raw = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const warp = 0.35 * Math.sin(TAU * (2 * u + 0.3 * Math.sin(TAU * v))) + 0.25 * Math.cos(TAU * (3 * v + 0.2 * Math.sin(TAU * 2 * u)));
      let p = kx * u + ky * v + warp; p -= Math.floor(p);
      const h = p < 0.68 ? p / 0.68 : 1 - (p - 0.68) / 0.32;
      const m = 0.5 + 0.5 * Math.sin(TAU * (2 * u + 0.4 * Math.sin(TAU * v + 1.1))) * Math.cos(TAU * (3 * v + 0.3 * Math.sin(TAU * u * 2)));
      raw[y * size + x] = 2.6 * h * (0.45 + 0.55 * m);
    }
    // one texel blur rounds the trough without losing the crest
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let a = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += raw[((y + dy + size) % size) * size + ((x + dx + size) % size)];
      rip[y * size + x] = a / 9;
    }
  }
  const nPeb = Math.round(size * size / 90);
  const sand = pebbles(977, Math.round(nPeb * 0.3), 1.0, 2.2, { darkP: 0.6, lightP: 0.3, hMin: 0.25, hMax: 0.45, rim: 0.03, toneDark: 0.88, toneDarkW: 0.07 });
  const grav = pebbles(4111, Math.round(nPeb * 1.7), 1.4, 7.0, { darkP: 0.55, lightP: 0.3, hMin: 0.6, hMax: 1.0, rim: 0.14, toneDark: 0.78, toneDarkW: 0.12 });
  // the ripple crests catch a little more light and the troughs hold the darker grains
  for (let i = 0; i < size * size; i++) { const k = 1 + 0.05 * (rip[i] - 0.35); sand.alb[i * 3] *= k; sand.alb[i * 3 + 1] *= k; sand.alb[i * 3 + 2] *= k; }

  // height field to normal map by central difference, periodic (the field is)
  const toNormal = (base, baseK, peb, pebK, strength, extra = null, extraK = 0) => {
    const nrm = new Uint8ClampedArray(size * size * 4);
    const at = (x, y) => { const i = ((y + size) % size) * size + ((x + size) % size); return base[i] * baseK + peb[i] * pebK + (extra ? extra[i] * extraK : 0); };
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
    return nrm;
  };
  const toRGBA = (alb3) => {
    const out = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) { out[i * 4] = alb3[i * 3] * 255; out[i * 4 + 1] = alb3[i * 3 + 1] * 255; out[i * 4 + 2] = alb3[i * 3 + 2] * 255; out[i * 4 + 3] = 255; }
    return out;
  };
  const toGrey = (g) => {
    const out = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) { const v = g[i] * 255; out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
    return out;
  };
  const strength = r.bump * 2.4;
  const mk = (data, srgb) => {
    const t = new T.DataTexture(data, size, size, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.flipY = false;
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  groundMaps = {
    map: mk(toRGBA(sand.alb), true), roughnessMap: mk(toGrey(sand.rgh), false),
    normalMap: mk(toNormal(hf, 1.0, sand.peb, 0.5, strength), false),
    sandNormal: mk(toNormal(hf, 1.0, sand.peb, 0.5, strength, rip, 1.0), false),
    gravelMap: mk(toRGBA(grav.alb), true),
    gravelNormal: mk(toNormal(hf, 0.55, grav.peb, 0.75, strength), false),
    tileMeters: r.tile,
  };
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

  const S = new Float32Array(N);          // the smooth field (base to cuts)
  const H = new Float32Array(N);          // S plus detail, what is drawn and walked on
  const wRoad = new Float32Array(N);      // packed paint weight from the road
  const wBed = new Float32Array(N);       // wadi bed
  const wTrench = new Float32Array(N);    // trench floor
  const wPack = new Float32Array(N);      // packed pads
  const wConc = new Float32Array(N);      // concrete pads and rings
  const wTrack = new Float32Array(N);     // tyre bands
  const wCut = new Float32Array(N);       // any cut (bank or floor) for ripple masking
  const wOpen = new Float32Array(N);      // open sand: 1 minus everything above
  const wHeap = new Float32Array(N);      // spoil heap weight (paint, gravel, no ripples)
  const cls = new Uint8Array(N);          // 0 sand 1 packed 2 concrete 3 rock

  const n1 = makeNoise(7), n2 = makeNoise(19), n3 = makeNoise(41), n4 = makeNoise(67), n5 = makeNoise(97);
  const windDeg = (spec.detail && spec.detail.drift && spec.detail.drift.windDeg) || 300;
  const wdx = Math.cos(windDeg * DEG), wdz = Math.sin(windDeg * DEG);   // the wind blows toward (wdx, wdz)

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
      for (const m of spec.mounds) {
        const dx = x - m.x, dz = z - m.z;
        const d0 = Math.hypot(dx, dz);
        if (d0 >= m.r * 1.25) continue;
        let r = m.r;
        if (m.lee || m.warp) {
          // downwind side shorter (steeper), outline wobbled at 3.5 m so it is not a circle
          const k = d0 > 1e-6 ? (dx * wdx + dz * wdz) / d0 : 0;
          r *= 1 - (m.lee || 0) * Math.max(0, k);
          r *= 1 + (m.warp || 0) * n5(x / 3.5 + 77, z / 3.5 + 11);
        }
        const f = cosFall(d0, r);
        h += m.h * f;
        if (m.spoil && f > wHeap[i]) wHeap[i] = f;
      }
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
        // round 15: footprint pads may be fill only or cut only (footprint_pads.js); the level pads flatten
        const target = p.mode === 'fill' ? Math.max(h, p.y) : p.mode === 'cut' ? Math.min(h, p.y) : p.y;
        h = mix(h, target, w);
        if (p.surface === 'packed') wPack[i] = Math.max(wPack[i], w);
        else if (p.surface === 'concrete') wConc[i] = Math.max(wConc[i], w);
      }
      S[i] = h;
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
      s += S[izRoad * NX + j]; c++;
    }
    roadY[ix] = s / c;
  }

  // ---- pass 2: road, wadi, trench
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
  const q = {};
  const maxWadiD = W.topW / 2 + rampBank + 2;

  // 2a. road: flattened across, verge blended. Written into S so the cuts see it as local ground.
  const onRoadA = new Uint8Array(N);
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    const dzr = Math.abs(z - R.z);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      if (dzr <= R.halfW) { S[i] = roadY[ix]; onRoadA[i] = 1; }
      else if (dzr < R.halfW + R.verge) {
        const w = smooth01((R.halfW + R.verge - dzr) / R.verge);
        S[i] = mix(S[i], roadY[ix], w);
      }
      // ragged paint edge for the packed road
      const edge = R.halfW + 0.35 * n2(x / 2.3, z / 2.3) + 0.15;
      wRoad[i] = dzr <= edge - 0.4 ? 1 : dzr >= edge + 0.4 ? 0 : 1 - (dzr - (edge - 0.4)) / 0.8;
    }
  }
  // local ground before any cut, kept so a ramp can be built from the centre line height
  const Lg = new Float32Array(S);
  const localAt = (x, z) => {
    let fx = (x - B.minX) / cell, fz = (z - B.minZ) / cell;
    fx = Math.max(0, Math.min(NX - 1.001, fx)); fz = Math.max(0, Math.min(NZ - 1.001, fz));
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, i = iz * NX + ix;
    return (Lg[i] * (1 - u) + Lg[i + 1] * u) * (1 - v) + (Lg[i + NX] * (1 - u) + Lg[i + NX + 1] * u) * v;
  };
  const tanRamp = Math.tan(W.rampDeg * DEG);

  // 2b. cuts
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      const dzr = Math.abs(z - R.z);
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

      S[i] = h;
      wOpen[i] = 1 - Math.max(onRoadA[i], wCut[i], wPack[i], wConc[i], Math.min(1, wRoad[i] * 2));
    }
  }

  // ---- pass 2b (round 15): footprint pads AFTER the road, wadi and trench, so a berm, a heap edge or a cut
  // under a placed object is levelled at its base (footprint_pads.js, fill / cut / flat), and wFoot holds the
  // detail field off inside them (hummocks and drifts were what floated the crates)
  const wFoot = new Float32Array(N);
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix, x = X(ix);
      let h = S[i];
      for (const p of FOOTPRINT_PADS) {
        const d = rectDist(x, z, p.x0, p.x1, p.z0, p.z1);
        if (d >= p.blend) continue;
        const w = smooth01(1 - d / p.blend);
        const target = p.mode === 'fill' ? Math.max(h, p.y) : p.mode === 'cut' ? Math.min(h, p.y) : p.y;
        h = mix(h, target, w);
        if (w > wFoot[i]) wFoot[i] = w;
      }
      S[i] = h;
    }
  }

  // ---- bilinear samplers on the coarse masks, for the detail pass
  const bil = (A, x, z) => {
    let fx = (x - B.minX) / cell, fz = (z - B.minZ) / cell;
    fx = Math.max(0, Math.min(NX - 1.001, fx)); fz = Math.max(0, Math.min(NZ - 1.001, fz));
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, i = iz * NX + ix;
    return (A[i] * (1 - u) + A[i + 1] * u) * (1 - v) + (A[i + NX] * (1 - u) + A[i + NX + 1] * u) * v;
  };

  // ---- the detail field D(x, z): ruts, ripples, hummocks, gravel hollows, drifts
  const DT = spec.detail;
  const TK = spec.tracks;
  const tracks = TK.branches.map((b) => bezierPolyline(b.from, b.ctrl, b.to, 40));
  const rip = DT.ripple;
  const rdx = Math.cos(rip.dirDeg * DEG), rdz = Math.sin(rip.dirDeg * DEG);
  const rutProfile = (off) => {
    // off: distance from the band centre; a U with a rounded bottom, rutW wide
    const a = Math.abs(off);
    if (a >= TK.rutW / 2) return 0;
    const flat = TK.rutW / 2 - 0.25;           // a 0.25 m lip either side of a flat bottom
    return 1 - smooth01((a - flat) / 0.25);
  };
  const bandWeight = (off) => {
    const a = Math.abs(off);
    return a <= TK.bandW / 2 ? 1 : a >= TK.bandW / 2 + 0.15 ? 0 : 1 - (a - TK.bandW / 2) / 0.15;
  };
  const trackReach = TK.gauge / 2 + TK.rutW + TK.wander;

  // drifts: the placements hashed into 4 m cells with their footprint and drift extent
  const DR = DT.drift;
  const driftItems = [];
  const driftHash = new Map();
  const DCELL = 4;
  const dkey = (ix, iz) => (ix + 512) * 4096 + (iz + 512);
  for (const p of PLACEMENTS) {
    const fp = DRIFT_FOOTPRINTS[p.asset];
    if (!fp) continue;
    if (typeof p.y === 'number' || (p.dy && p.dy > 0) || (p.moving && !fp.m)) continue;
    if (bil(wConc, p.x, p.z) > 0.3) continue;                 // nothing drifts on a concrete pad here
    const fMax = Math.max(DR.hMin, Math.min(DR.hMax, DR.a + DR.b * fp.h));
    const reach = DR.out * DR.tail + 0.3;
    const a = (p.rot || 0) * DEG, c = Math.cos(a), s = Math.sin(a);
    const it = { x: p.x, z: p.z, c, s, r: fp.r || 0, hw: (fp.w || 0) / 2, hd: (fp.d || 0) / 2, fMax, plinth: fp.p === 0 ? 0 : DR.inside, ext: (fp.r || Math.hypot(fp.w, fp.d) / 2) + reach };
    driftItems.push(it);
    const x0 = Math.floor((p.x - it.ext) / DCELL), x1 = Math.floor((p.x + it.ext) / DCELL);
    const z0 = Math.floor((p.z - it.ext) / DCELL), z1 = Math.floor((p.z + it.ext) / DCELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = dkey(ix, iz);
      let arr = driftHash.get(k);
      if (!arr) driftHash.set(k, (arr = []));
      arr.push(it);
    }
  }
  const driftAt = (x, z) => {
    const arr = driftHash.get(dkey(Math.floor(x / DCELL), Math.floor(z / DCELL)));
    if (!arr) return 0;
    let best = 0;
    for (const it of arr) {
      const dx = x - it.x, dz = z - it.z;
      if (Math.abs(dx) > it.ext || Math.abs(dz) > it.ext) continue;
      // distance outside the footprint, in the prop's frame (rotation.y = rot)
      let d;
      if (it.r > 0) d = Math.hypot(dx, dz) - it.r;
      else {
        const lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
        const ox = Math.abs(lx) - it.hw, oz = Math.abs(lz) - it.hd;
        d = ox <= 0 && oz <= 0 ? Math.max(ox, oz) : Math.hypot(Math.max(ox, 0), Math.max(oz, 0));
      }
      let hgt;
      if (d <= 0) hgt = it.fMax * it.plinth;
      else {
        // upwind faces hold the higher, shorter drift; downwind the longer, lower tail
        const L = Math.hypot(dx, dz) || 1;
        const up = clamp01(0.5 - 0.5 * (dx * wdx + dz * wdz) / L);
        const out = DR.out * mix(DR.tail, 1, up);
        const t = d / out;
        if (t >= 1) continue;
        hgt = it.fMax * mix(0.45, 1, up) * (1 - t) * (1 - t);
      }
      if (hgt > best) best = hgt;
    }
    return best;
  };

  const GV = DT.gravel;
  const gravelAt = (x, z, open, pack, bed, road, trench, conc, cut, heap = 0) => {
    const v = 0.55 * n5(x / GV.wl1 + 21, z / GV.wl1) + 0.45 * n5(x / GV.wl2 + 5, z / GV.wl2 + 33);
    let g = smooth01((v * 0.75 + 0.5 - GV.threshold) / GV.width) * open;
    const packedG = 0.45 + 0.35 * n2(x / 3 + 9, z / 3 + 4);
    // spoil is subsoil: stony over most of the heap, in the same 3 m clumps as the hardstands
    g = Math.max(g, packedG * pack, 0.8 * bed, 0.5 * road, 0.35 * trench, (0.55 + 0.3 * n2(x / 3 + 9, z / 3 + 4)) * smooth01(heap * 2.5));
    g *= (1 - conc) * (1 - 0.5 * cut);
    return clamp01(g);
  };

  // returns the detail height and fills dq with the gravel mask and the track weight
  const dq = { g: 0, track: 0, ripple: 0 };
  const detailAt = (x, z) => {
    const open = bil(wOpen, x, z), pack = bil(wPack, x, z), conc = bil(wConc, x, z), cut = bil(wCut, x, z);
    const bed = bil(wBed, x, z), road = bil(wRoad, x, z), tr = bil(wTrench, x, z);
    const heap = bil(wHeap, x, z);
    let h = 0;
    // hummocks: full on open sand, reduced on packed ground, none on concrete or in the cuts
    // spoil is clods, not sand: the hummocks run at double strength over a heap
    const hk = (open + 0.4 * pack + 1.2 * smooth01(heap * 2)) * (1 - conc) * (1 - cut);
    if (hk > 0.001) for (const o of DT.hummocks) h += o.amp * hk * n1(x / o.wl + 31, z / o.wl + 17);
    // wind ripples on open sand, in patches
    dq.ripple = 0;
    if (open > 0.001) {
      const patch = clamp01(0.35 + 0.9 * n3(x / rip.patchWl + 3, z / rip.patchWl));
      const warp = n4(x / 3.1, z / 3.1) * rip.warp;
      const ph = ((x * rdx + z * rdz) / rip.wl) * Math.PI * 2 + warp;
      const noHeap = 1 - smooth01(heap * 2.5);        // spoil holds no wind ripples
      h += rip.amp * Math.sin(ph) * open * patch * noHeap;
      dq.ripple = clamp01(open * (0.25 + 0.75 * patch) * (1 - cut) * noHeap);
    }
    // gravel: a deflation hollow with a lip
    const g = gravelAt(x, z, open, pack, bed, road, tr, conc, cut, heap);
    h -= GV.sink * g * open;
    dq.g = g;
    // tyre tracks: road bands the whole length, plus the branches; the line wanders
    let track = 0, rut = 0;
    const dzr = Math.abs(z - R.z);
    if (dzr < trackReach) {
      const wob = TK.wander * n4(x / TK.wanderWl, 1.3);
      for (let sgn = -1; sgn <= 1; sgn += 2) {
        const off = (z - R.z) + wob - sgn * TK.gauge / 2;
        track = Math.max(track, bandWeight(off));
        rut = Math.max(rut, rutProfile(off));
      }
    }
    for (const tk of tracks) {
      tk.nearest(x, z, trackReach, q);
      if (q.d < trackReach) {
        const off = q.d + TK.wander * n4(x / TK.wanderWl + 7, z / TK.wanderWl) - TK.gauge / 2;
        track = Math.max(track, bandWeight(off));
        rut = Math.max(rut, rutProfile(off));
      }
    }
    if (rut > 0) h -= TK.rut * rut * (1 - 0.25 * n3(x * 0.8, z * 0.8)) * (1 - conc);
    dq.track = track;
    // sand drift against the foot of every prop
    h += driftAt(x, z);
    return h;
  };

  // ---- the fine pass: detail over the whole map at cellF, into the gradient texture
  const cellF = cell >= 1 ? Math.max(DT.cellF, 0.25) : Math.min(DT.cellF, cell / 2);
  const NXF = Math.round((B.maxX - B.minX) / cellF) + 1;
  const NZF = Math.round((B.maxZ - B.minZ) / cellF) + 1;
  const Df = new Float32Array(NXF * NZF);
  const Gf = new Uint8Array(NXF * NZF);
  const Rf = new Uint8Array(NXF * NZF);      // wind ripple strength (open sand, in patches)
  for (let jz = 0; jz < NZF; jz++) {
    const z = B.minZ + jz * cellF;
    for (let jx = 0; jx < NXF; jx++) {
      const i = jz * NXF + jx;
      Df[i] = detailAt(B.minX + jx * cellF, z);
      Gf[i] = dq.g * 255;
      Rf[i] = dq.ripple * 255;
    }
  }
  const tFine = performance.now();
  // gradient by central difference, encoded to +-2 in R and G; gravel mask in B; fine
  // concavity (rut bottoms, hollows) in A for a dust darkening at texel resolution
  const detailData = new Uint8ClampedArray(NXF * NZF * 4);
  {
    const atF = (jx, jz) => Df[Math.min(NZF - 1, Math.max(0, jz)) * NXF + Math.min(NXF - 1, Math.max(0, jx))];
    const inv2 = 1 / (2 * cellF);
    for (let jz = 0; jz < NZF; jz++) for (let jx = 0; jx < NXF; jx++) {
      const i = jz * NXF + jx;
      const gx = (atF(jx + 1, jz) - atF(jx - 1, jz)) * inv2;
      const gz = (atF(jx, jz + 1) - atF(jx, jz - 1)) * inv2;
      detailData[i * 4] = (Math.max(-1, Math.min(1, gx / 2)) * 0.5 + 0.5) * 255;
      detailData[i * 4 + 1] = (Math.max(-1, Math.min(1, gz / 2)) * 0.5 + 0.5) * 255;
      detailData[i * 4 + 2] = Gf[i];
      detailData[i * 4 + 3] = Rf[i];
    }
  }

  // ---- H = S + D at the vertices (the same function the texture was built from)
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      H[i] = S[i] + detailAt(X(ix), z) * (1 - wFoot[i]);   // round 15: no hummocks or drifts under a footprint pad
      wTrack[i] = dq.track;
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
  const atS = (ix, iz) => S[Math.min(NZ - 1, Math.max(0, iz)) * NX + Math.min(NX - 1, Math.max(0, ix))];
  const gT = P.gravelTint;
  for (let iz = 0; iz < NZ; iz++) {
    const z = Z(iz);
    for (let ix = 0; ix < NX; ix++) {
      const x = X(ix);
      const i = iz * NX + ix;
      // slope from the smooth grid (the banks), for the rock paint
      const gx = (atS(ix + 1, iz) - atS(ix - 1, iz)) / (2 * cell);
      const gz = (atS(ix, iz + 1) - atS(ix, iz - 1)) / (2 * cell);
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
      // spoil heaps: unbleached subsoil, toward packed over the body of the heap, and the crest
      // is the last part to bleach so it stays a shade darker than the skirt
      if (wHeap[i] > 0.02) c.lerp(cPack, 0.7 * smooth01(wHeap[i] * 1.8));
      c.lerp(cConc, wc);
      c.lerp(cRock, wRock);
      // tyre bands: packed darkened
      if (wTrack[i] > 0) c.multiplyScalar(1 - TK.darken * wTrack[i]);
      // gravel patches: a touch darker and greyer than the sand around them
      const gv = Gf[Math.min(NZF - 1, Math.round((z - B.minZ) / cellF)) * NXF + Math.min(NXF - 1, Math.round((x - B.minX) / cellF))] / 255;
      if (gv > 0) { c.r *= mix(1, gT[0], gv); c.g *= mix(1, gT[1], gv); c.b *= mix(1, gT[2], gv); }
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

  // ---- the detail texture and the ground material
  const maps = seamlessGround(T);
  const detailTex = new T.DataTexture(detailData, NXF, NZF, T.RGBAFormat);
  detailTex.wrapS = detailTex.wrapT = T.ClampToEdgeWrapping;
  detailTex.generateMipmaps = true;
  detailTex.minFilter = T.LinearMipmapLinearFilter;
  detailTex.magFilter = T.LinearFilter;
  detailTex.anisotropy = 8;
  detailTex.flipY = false;
  detailTex.needsUpdate = true;
  // texel jx sits at x = minX + jx * cellF; u = (x - minX + cellF / 2) / (NXF * cellF)
  const detailXf = new T.Vector4(B.minX - cellF / 2, B.minZ - cellF / 2, 1 / (NXF * cellF), 1 / (NZF * cellF));

  const material = new T.MeshStandardMaterial({
    name: 'ground', color: 0xffffff, vertexColors: true,
    roughness: 0.94, metalness: 0.0,
    map: maps.map, roughnessMap: maps.roughnessMap, normalMap: maps.normalMap,
    normalScale: new T.Vector2(1.0, 1.0),
  });
  // The shader patch: (1) the detail gradient folded into the surface normal before the tile
  // normal map, (2) the two tile sets blended by the gravel mask, (3) the fine concavity as a
  // dust darkening. The tile normal map fades past 25 m (a 5 mm texel is far below a pixel
  // there and only adds sparkle); the map wide detail carries the ground beyond that.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.derrickDetail = { value: detailTex };
    shader.uniforms.derrickXf = { value: detailXf };
    shader.uniforms.derrickGravelMap = { value: maps.gravelMap };
    shader.uniforms.derrickGravelNormal = { value: maps.gravelNormal };
    shader.uniforms.derrickSandNormal = { value: maps.sandNormal };
    shader.vertexShader = 'varying vec2 vDerrickWP;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  vDerrickWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    shader.fragmentShader = [
      'uniform sampler2D derrickDetail;',
      'uniform sampler2D derrickGravelMap;',
      'uniform sampler2D derrickGravelNormal;',
      'uniform sampler2D derrickSandNormal;',
      'uniform vec4 derrickXf;',
      'varying vec2 vDerrickWP;',
      '',
    ].join('\n') + shader.fragmentShader
      .replace('#include <map_fragment>', [
        'vec4 dTex = texture2D( derrickDetail, ( vDerrickWP - derrickXf.xy ) * derrickXf.zw );',
        'float dMask = dTex.b;',
        '#ifdef USE_MAP',
        '  vec4 sampledDiffuseColor = mix( texture2D( map, vMapUv ), texture2D( derrickGravelMap, vMapUv ), dMask );',
        '  diffuseColor *= sampledDiffuseColor;',
        '#endif',
      ].join('\n'))
      .replace('vec3 normal = normalize( vNormal );', [
        'vec3 normal = normalize( vNormal );',
        '{',
        '  vec2 dg = ( dTex.rg * 2.0 - 1.0 ) * 2.0;',
        '  vec3 nW = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );',
        '  nW = normalize( nW + nW.y * vec3( -dg.x, 0.0, -dg.y ) );',
        '  normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );',
        '}',
      ].join('\n'))
      .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        'vec3 mapN = mix( mix( texture2D( normalMap, vNormalMapUv ), texture2D( derrickSandNormal, vNormalMapUv ), dTex.a ), texture2D( derrickGravelNormal, vNormalMapUv ), dMask ).xyz * 2.0 - 1.0;')
      .replace('mapN.xy *= normalScale;',
        'mapN.xy *= normalScale * ( 1.0 - smoothstep( 25.0, 60.0, length( vViewPosition ) ) );');
  };
  material.customProgramCacheKey = () => 'derrick_ground_detail3';

  // ---- tiles: 7 x 6 blocks, shared vertex rows so there is never a crack
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
          // normals from the SMOOTH field: the detail is in the gradient texture, once
          const gx = (atS(ix + 1, iz) - atS(ix - 1, iz)) / (2 * cell);
          const gz = (atS(ix, iz + 1) - atS(ix, iz - 1)) / (2 * cell);
          const il = 1 / Math.hypot(gx, 1, gz);
          nor[k * 3] = -gx * il; nor[k * 3 + 1] = il; nor[k * 3 + 2] = -gz * il;
          // world xz UVs stretch into streaks on a wall; skewing by height gives steep faces
          // texture variation while a near flat ground shifts by a few centimetres at most
          uv[k * 2] = (x + 0.8 * S[gi]) * uvScale; uv[k * 2 + 1] = (z + 0.55 * S[gi]) * uvScale;
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

  console.info(`[terrain] ${NX}x${NZ} verts at ${cell} m, detail ${NXF}x${NZF} at ${cellF} m (${(tFine - t0).toFixed(0)} ms), ${driftItems.length} drifts, ${tiles.length} tiles, y ${hMin.toFixed(2)}..${hMax.toFixed(2)}, ${(performance.now() - t0).toFixed(0)} ms`);

  return {
    tiles, material, heightAt, normalAt, slopeAt, surfaceAt, blockOf,
    bounds: { minX: B.minX, maxX: B.maxX, minZ: B.minZ, maxZ: B.maxZ },
    // raw grid for anyone who wants it (navgrid): heights row major, iz * nx + ix
    grid: { heights: H, classes: cls, nx: NX, nz: NZ, cell, minX: B.minX, minZ: B.minZ, hMin, hMax },
    detail: { texture: detailTex, nx: NXF, nz: NZF, cell: cellF },
    maps,
    spec,
  };
}
