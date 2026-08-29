/**
 * DERRICK level builder: turns level/placements.js into scenery, colliders, walkables,
 * links, movers and interior lamps, baked per 20 x 20 m block.
 *
 *   const level = await buildLevel(THREE, { scene, world, terrain, quality, onProgress });
 *   level.blocks      Map<'bx_bz', THREE.Group>  baked static groups, already in the scene
 *   level.movers      [{ asset, object, update(dt) }]  pump jacks, driven here
 *   level.colliders   number registered on world
 *   level.assetNames  Set of asset names actually placed
 *   level.missing     asset names whose file was not there (placements skipped, never boxed)
 *   level.sightlines  the MAP-PLAN section 5 ray checks, one { name, expect, got, ok } each
 *
 * Rules honoured here (docs/ARCHITECTURE.md): every prop goes through ASSET() with surfaces,
 * nothing is ever replaced by a box, static scenery is baked per block with bakeStatic(),
 * movers load with keepHierarchy per instance and are never cloned, colliders are registered
 * before the bake because the bake leaves no individual objects behind.
 */
import * as THREE from 'three';
import { ASSET, preloadAssets, bakeStatic, assetSize } from '../../assetlib.js?v=r19-202608291932';
import { PLACEMENTS, LINKS, WALKABLES, INTERIORS, SIGHTLINES, PADS, padAt } from './placements.js?v=r19-202608291932';
import { GLB_STATIC, loadGlbStatic } from './glbstatic.js?v=r19-202608291932';   // round 11: Atlas rocks
import { applyMaterials } from '../render/materials.js?v=r19-202608291932';   // materials r3: triplanar PBR sets, wraps vertexiseMaterials
import { collapsePerJoint } from '../ai/animation.js?v=r19-202608291932';
import { buildDecals } from '../render/decals.js?v=r19-202608291932';   // decals r6: near field decals, built after the bake
import { FILLET_ASSETS, makeFillet } from './fillets.js?v=r19-202608291932';   // round 17 item 1: contact fillets
// round 17 item 1: props that sit IN the sand (4 cm down) so the fillet has something to climb; nothing with a walkable
const SINK = new Set(['crate_stack', 'wooden_pallet_stack', 'oil_drum', 'tyre_stack', 'ibc_tote', 'sandbag_wall', 'jersey_barrier', 'generator_set', 'control_cabinet', 'ammo_crate', 'locker_bank', 'steel_shelving', 'shipping_container_blue', 'shipping_container_rust_red', 'shipping_container_tan', 'shipping_container_open', 'fuel_truck_wreck', 'pickup_wreck', 'valve_manifold', 'wellhead_christmas_tree', 'compound_wall_panel', 'corrugated_wall_panel', 'bullet_tank_horizontal']);

const EYE = 1.65;
const DEG = Math.PI / 180;
const CYLINDER_ASSETS = new Set(['oil_drum', 'tyre_stack', 'palm_tree', 'floodlight_mast', 'wellhead_christmas_tree']);
const NO_COLLIDER = new Set(['dead_shrub', 'grass_tuft', 'debris_scatter', 'ammo_crate', 'external_steel_stair', 'caged_ladder']);   // level r5: grass_tuft
const SIZE_TOLERANCE = 0.25;
// integrator: scatter and wire fences are baked into a second group per block that casts no shadow (render notes lever)
const NO_SHADOW = new Set(['dead_shrub', 'grass_tuft', 'debris_scatter', 'barbed_wire_fence_section', 'perimeter_fence']);
// level r5: grass_tuft (44 triangles, three alpha cards) joins the no shadow scatter group: its cast would be
// a solid bar from the base clump, it is culled with the shrubs at FAR_CULL_N, and the group takes no fine split.
// level r2: furniture inside the two buildings joins the no shadow group. It stands under a roof
// (the sun never reaches it, the lamp casts none) and is only ever seen through a door within a
// few metres, yet as clutter it was drawn from 55 m: block 5_4 cost 171 k triangles in every frame
// looking east from the road, of which the bunk beds, shelving and lockers were about 110 k.
// The no shadow group is culled at 32 m from the block edge, which still shows it from every door.
const INTERIOR = new Set(['bunk_bed', 'locker_bank', 'office_desk', 'mess_table', 'steel_shelving', 'control_cabinet']);
// integrator: big silhouettes are baked apart from the clutter so the game can stop drawing
// clutter (drums, crates, sandbags, pipes) past ~90 m in the haze while every landmark stays
// to the map edge. Nothing is decimated; a far block just loses its small props.
const LANDMARK = new Set(['derrick_base_module', 'derrick_mid_module', 'derrick_crown_module', 'oil_storage_tank', 'oil_storage_tank_open',
  'bullet_tank_horizontal', 'pump_house_building', 'bunkhouse_building', 'mud_pump_shed', 'watchtower_gantry', 'culvert_crossing',
  'floodlight_mast', 'shipping_container_rust_red', 'shipping_container_blue', 'shipping_container_tan', 'shipping_container_open',
  'fuel_truck_wreck', 'pickup_wreck', 'rock_outcrop_large', 'palm_tree', 'large_pipe_section', 'compound_wall_panel', 'corrugated_wall_panel',
  'tank_catwalk_bridge', 'catwalk_section', 'external_steel_stair', 'caged_ladder', 'generator_set', 'pipe_run_elbow', 'pipe_run_straight']);   // warn when a loaded asset is this far (fraction) from its TSV size

// ---------------------------------------------------------------------------------------------
// Collider specs in the object's own frame (base at y 0, centred, front +Z), from the sizes in
// docs/OBJECTS.tsv. Anything not listed gets a box (or a cylinder) from its measured size.
//   box  { c:[x,y,z], s:[w,h,d] }        cyl { c:[x,y,z], r, h }   (c is the geometric centre)
//   all y relative to the object's base. Walkable surfaces come from WALKABLES, not from here.
function box(cx, cy, cz, sx, sy, sz) { return { type: 'box', c: [cx, cy, cz], s: [sx, sy, sz] }; }
function cyl(cx, cy, cz, r, h) { return { type: 'cyl', c: [cx, cy, cz], r, h }; }

/** A run of rail boxes along one edge, with gaps. axis 'x' means the rail runs along X at z = at. */
function rail(axis, at, from, to, y0, h, gaps = [], thick = 0.08) {
  const out = [];
  const cuts = [from, ...gaps.flatMap((g) => [g[0] - g[1] / 2, g[0] + g[1] / 2]), to].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    if (b - a < 0.05) continue;
    const mid = (a + b) / 2, len = b - a;
    out.push(axis === 'x' ? box(mid, y0 + h / 2, at, len, h, thick) : box(at, y0 + h / 2, mid, thick, h, len));
  }
  return out;
}

/** A wall with openings: { at, w, y0, y1 } along its run; returns the solid pieces. */
function wall(axis, at, from, to, height, thick, openings = []) {
  const out = [];
  const sorted = [...openings].sort((a, b) => a.at - b.at);
  let cursor = from;
  const piece = (a, b, y0, y1) => {
    if (b - a < 0.02 || y1 - y0 < 0.02) return;
    const mid = (a + b) / 2, len = b - a, cy = (y0 + y1) / 2, h = y1 - y0;
    out.push(axis === 'x' ? box(mid, cy, at, len, h, thick) : box(at, cy, mid, thick, h, len));
  };
  for (const o of sorted) {
    const a = o.at - o.w / 2, b = o.at + o.w / 2;
    piece(cursor, a, 0, height);
    piece(a, b, 0, o.y0 ?? 0);
    piece(a, b, o.y1 ?? height, height);
    cursor = b;
  }
  piece(cursor, to, 0, height);
  return out;
}

/** Ring of short boxes around a circle (tank rails, the open tank's shell). Gaps in degrees. */
function ring(r, y0, h, thick, segments, gaps = []) {
  const out = [];
  for (let i = 0; i < segments; i++) {
    const a = (i + 0.5) * (360 / segments);
    if (gaps.some((g) => Math.abs(((a - g.at + 540) % 360) - 180) < g.w / 2)) continue;
    const rad = a * DEG, len = (2 * Math.PI * r) / segments + 0.05;
    out.push({ type: 'box', c: [r * Math.cos(rad), y0 + h / 2, r * Math.sin(rad)], s: [thick, h, len], yaw: -rad });
  }
  return out;
}

function tankSpec(p, open) {
  const gaps = (p.railGaps || []).map((at) => ({ at, w: 22 }));
  const out = [];
  if (open) {
    out.push(...ring(4.0, 0, 4.6, 0.15, 24, [{ at: 90, w: 36 }, { at: 315, w: 20 }]));
    out.push(cyl(0, 4.5, 0, 4.0, 0.2));            // roof slab, top at 4.6
  } else {
    out.push(cyl(0, 2.3, 0, 4.0, 4.6));
  }
  out.push(cyl(0, 4.9, 0, 3.3, 0.6));              // cone roof: the centre of the ring is not walkable
  out.push(...ring(4.5, 4.6, 1.1, 0.08, 24, gaps));
  return out;
}

function buildingSpec(w, d, opts) {
  const H = 4.6 + 0.6;      // wall plus parapet as one piece
  const hx = w / 2, hz = d / 2, t = 0.3;
  const out = [];
  out.push(...wall('x', -hz + t / 2, -hx, hx, H, t, opts.north || []));
  out.push(...wall('x', hz - t / 2, -hx, hx, H, t, opts.south || []));
  out.push(...wall('z', -hx + t / 2, -hz, hz, H, t, opts.west || []));
  out.push(...wall('z', hx - t / 2, -hz, hz, H, t, opts.east || []));
  out.push(box(0, 4.5, 0, w, 0.2, d));                 // roof slab, ceiling at 4.4, top at 4.6
  for (const extra of opts.extra || []) out.push(extra);
  return out;
}

const SPECS = {
  derrick_base_module: () => [
    box(0, 2.3, 0, 8, 4.6, 8),
    box(0, 4.475, 0, 10, 0.25, 10),
    ...rail('x', -5, -5, 5, 4.6, 1.1),
    ...rail('x', 5, -5, 5, 4.6, 1.1, [[0, 1.2]]),
    ...rail('z', 5, -5, 5, 4.6, 1.1),
    ...rail('z', -5, -5, 5, 4.6, 1.1, [[0, 1.2], [-3.8, 1.4]]),
  ],
  derrick_mid_module: () => [
    ...[[-3.7, -3.7], [3.7, -3.7], [3.7, 3.7], [-3.7, 3.7]].map(([x, z]) => box(x, 2.3, z, 0.35, 4.6, 0.35)),
    box(0, 4.475, 0, 8, 0.25, 8),
    ...rail('x', -4, -4, 4, 4.6, 1.1),
    ...rail('x', 4, -4, 4, 4.6, 1.1),
    ...rail('z', -4, -4, 4, 4.6, 1.1),
    ...rail('z', 4, -4, 4, 4.6, 1.1, [[0, 0.8]]),
  ],
  // round 11: the crown section is 21.8 m tall now; legs as three stacked boxes following the taper (3.25 -> 1.25 half width)
  derrick_crown_module: () => { const out = []; const hw = (y) => 3.25 - 2.0 * (y / 20.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [ya, yb] of [[0, 7], [7, 14], [14, 20.6]]) { const ym = (ya + yb) / 2, c = hw(ym) - 0.08; out.push(box(sx * c, ym, sz * c, 0.3, yb - ya, 0.3)); }
    out.push(box(0, 20.9, 0, 3.0, 0.7, 2.0));   // the crown block
    return out; },
  oil_storage_tank: (p) => tankSpec(p, false),
  oil_storage_tank_open: (p) => tankSpec(p, true),
  tank_catwalk_bridge: () => [
    box(0, 0.1, 0, 5, 0.2, 1.2),
    box(0, 0.75, -0.56, 5, 1.1, 0.08), box(0, 0.75, 0.56, 5, 1.1, 0.08),
  ],
  catwalk_section: (p) => [
    box(0, 0.075, 0, 3, 0.15, 1.2),
    ...(p.bridge ? [box(0, 0.7, -0.56, 3, 1.1, 0.08), box(0, 0.7, 0.56, 3, 1.1, 0.08)] : []),
  ],
  pump_house_building: () => buildingSpec(12, 8, {
    north: [{ at: 0, w: 3.0, y0: 0, y1: 1.8 }],
    east: [{ at: 2, w: 0.9, y0: 0, y1: 2.1 }],
    south: [{ at: -3, w: 1.2, y0: 1.5, y1: 2.4 }, { at: 3, w: 1.2, y0: 1.5, y1: 2.4 }, { at: -1.4, w: 1.2, y0: 4.6, y1: 5.2 }],
  }),
  bunkhouse_building: () => buildingSpec(14, 8, {
    west: [{ at: -2, w: 0.9, y0: 0, y1: 2.1 }],
    north: [{ at: 3, w: 0.9, y0: 0, y1: 2.1 }],
    east: [{ at: 0, w: 1.2, y0: 1.5, y1: 2.4 }],
    south: [{ at: -4, w: 1.2, y0: 1.5, y1: 2.4 }, { at: 3, w: 1.2, y0: 1.5, y1: 2.4 }, { at: 2.6, w: 1.2, y0: 4.6, y1: 5.2 }],
    extra: [...wall('z', -1, -3.7, 3.7, 4.4, 0.2, [{ at: 0, w: 0.9, y0: 0, y1: 2.1 }]), box(5.6, 5.4, 0, 1.2, 1.6, 1.2)],
  }),
  mud_pump_shed: () => [
    ...[-4.9, 0, 4.9].flatMap((x) => [box(x, 2.3, -2.9, 0.2, 4.6, 0.2), box(x, 2.3, 2.9, 0.2, 4.6, 0.2)]),
    box(0, 1.2, -2.925, 10, 2.4, 0.15), box(-4.925, 1.2, 0, 0.15, 2.4, 6), box(4.925, 1.2, 0, 0.15, 2.4, 6),
    box(0, 4.525, 0, 10, 0.15, 6),
    ...rail('x', 2.95, -5, 5, 4.6, 0.3, [[0, 1.4]], 0.1), ...rail('x', -2.95, -5, 5, 4.6, 0.3, [[0, 1.2]], 0.1),
    ...rail('z', -4.95, -3, 3, 4.6, 0.3, [], 0.1), ...rail('z', 4.95, -3, 3, 4.6, 0.3, [], 0.1),
  ],
  watchtower_gantry: () => [
    ...[[-1.35, -1.35], [1.35, -1.35], [1.35, 1.35], [-1.35, 1.35]].map(([x, z]) => box(x, 2.3, z, 0.15, 4.6, 0.15)),
    box(0, 4.5, 0, 3, 0.2, 3),
    ...rail('x', -1.5, -1.5, 1.5, 4.6, 1.1), ...rail('z', -1.5, -1.5, 1.5, 4.6, 1.1), ...rail('z', 1.5, -1.5, 1.5, 4.6, 1.1),
    ...rail('x', 1.5, -1.5, 1.5, 4.6, 1.1, [[0, 0.9]]),
    box(0, 7.05, 0, 3.4, 0.1, 3.4),
  ],
  culvert_crossing: () => [box(-1.45, 1.3, 0, 0.5, 2.6, 8), box(1.45, 1.3, 0, 0.5, 2.6, 8), box(0, 2.3, 0, 3.4, 0.6, 8)],
  shipping_container_open: () => [box(0, 1.295, -1.17, 6.06, 2.59, 0.1), box(0, 1.295, 1.17, 6.06, 2.59, 0.1), box(0, 2.545, 0, 6.06, 0.09, 2.44)],
  pipe_run_elbow: () => [box(0, 0.75, -1.05, 3, 1.5, 0.9), box(-1.05, 0.75, 0, 0.9, 1.5, 3)],
  pump_jack: () => [box(0, 0.15, 0, 9, 0.3, 2.6), box(-2.5, 2.4, 0, 3.6, 4.5, 2.6), box(3.8, 0.7, 0, 0.5, 1.1, 0.5)],
  floodlight_mast: () => [box(0, 0.2, 0, 0.8, 0.4, 0.8), cyl(0, 4.5, 0, 0.16, 9)],
  palm_tree: () => [cyl(0, 3, 0, 0.28, 6)],
  wellhead_christmas_tree: () => [cyl(0, 1.2, 0, 0.55, 2.4)],
};

// ---------------------------------------------------------------------------------------------
/** Quantise material values so the per block bake can merge across assets. 1/24 sRGB steps. */
const _c = new THREE.Color();
function quantiseMaterials(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || m.userData.__q) continue;
      if (m.color) {
        _c.copy(m.color).convertLinearToSRGB();
        _c.setRGB(Math.round(_c.r * 24) / 24, Math.round(_c.g * 24) / 24, Math.round(_c.b * 24) / 24);
        m.color.copy(_c.convertSRGBToLinear());
      }
      if (typeof m.roughness === 'number') m.roughness = Math.round(m.roughness * 10) / 10;
      if (typeof m.metalness === 'number') m.metalness = Math.round(m.metalness * 10) / 10;
      m.userData.__q = true;
    }
  });
}

const _v = new THREE.Vector3();
function toWorld(p, yaw, lx, ly, lz, baseY) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return new THREE.Vector3(p.x + lx * c + lz * s, baseY + ly, p.z - lx * s + lz * c);
}

function registerColliders(world, p, yaw, baseY, size) {
  const specFn = SPECS[p.asset];
  let specs;
  if (specFn) specs = specFn(p);
  else if (NO_COLLIDER.has(p.asset)) specs = [];
  else if (CYLINDER_ASSETS.has(p.asset)) specs = [cyl(0, size.y / 2, 0, Math.max(size.x, size.z) / 2, size.y)];
  else specs = [box(0, size.y / 2, 0, size.x, size.y, size.z)];
  // level r2: a placement may carry a uniform `scale` (far tanks of different heights, the ridge
  // rocks at the map edge); the collider specs are in the asset's own frame, so scale them too
  const k = p.scale && p.scale !== 1 ? p.scale : 1;
  if (k !== 1) specs = specs.map((s) => s.type === 'box'
    ? { ...s, c: s.c.map((v) => v * k), s: s.s.map((v) => v * k) }
    : { ...s, c: s.c.map((v) => v * k), r: s.r * k, h: s.h * k });
  let n = 0;
  for (const s of specs) {
    if (s.type === 'box') {
      const c = toWorld(p, yaw, s.c[0], s.c[1], s.c[2], baseY);
      world.addBox(c, new THREE.Vector3(s.s[0], s.s[1], s.s[2]), yaw + (s.yaw || 0), p.tag);
    } else if (s.type === 'cyl') {
      const c = toWorld(p, yaw, s.c[0], s.c[1], s.c[2], baseY);
      world.addCylinder(c, s.r, s.h, p.tag);
    }
    n++;
  }
  return n;
}

/** Pump jack: walking beam nods, crank turns, pitman follows. Joints per docs/OBJECTS.tsv. */
function pumpJackMover(p, object) {
  const j = object.userData.joints || {};
  if (!j.walkingBeam || !j.crank) console.warn('[level] pump_jack has no joints (walkingBeam, crank), it will stand still:', p.tag);
  let t = Math.random() * 6;
  const rate = 0.55 * Math.PI * 2 / 6;   // one stroke every six seconds
  return {
    asset: p.asset, object, tag: p.tag,
    update(dt) {
      t += dt * rate;
      if (j.crank) j.crank.rotation.x = t;
      if (j.walkingBeam) j.walkingBeam.rotation.x = Math.sin(t) * 8 * DEG;
      if (j.pitman) j.pitman.rotation.x = -Math.sin(t) * 6 * DEG;
    },
  };
}

// ---------------------------------------------------------------------------------------------
export async function buildLevel(THREE_, { scene, world, terrain, quality, onProgress, assetBase = './assets/' } = {}) {
  const progress = (t, label) => { try { onProgress && onProgress(t, label); } catch {} };
  const density = quality && typeof quality.density === 'number' ? quality.density : 1;
  const pointLights = !!(quality && quality.pointLights);
  const heightAt = (x, z) => (terrain && terrain.heightAt ? terrain.heightAt(x, z) : 0);
  // round 18: asset files take the publish stamp (tools/publish.sh writes window.__BUILD_STAMP__ into index.html) so a phone
  // that cached last round's assets for GitHub Pages' ten minutes loads the new ones; assetlib caches by url, unaffected
  const url = (name) => `${assetBase}${name}.js` + (globalThis.__BUILD_STAMP__ ? `?v=${globalThis.__BUILD_STAMP__}` : '');

  // 1. thin the two scatter assets by the tier's density, deterministically
  const counts = {};
  const placements = PLACEMENTS.filter((p) => {
    if (!p.density) return true;
    const k = (counts[p.asset] = (counts[p.asset] || 0) + 1);
    return (k * density) % 1 < density - 1e-9 || density >= 1;
  });

  // 2. which asset files exist. A missing one skips its placements with a warning, never a box.
  const names = [...new Set(placements.map((p) => p.asset))];
  const present = new Set(), missing = [];
  await Promise.all(names.map(async (n) => {
    try {
      const r = await fetch(GLB_STATIC[n] || url(n), { method: 'HEAD' });   // round 11: GLB props live at their own path
      if (r.ok) present.add(n); else missing.push(n);
    } catch { missing.push(n); }
  }));
  for (const n of missing) {
    const k = placements.filter((p) => p.asset === n).length;
    console.warn(`[level] missing asset ${n}: ${k} placement(s) skipped`);
  }
  progress(0.05, 'checking assets');

  let fineParam = null;
  try { fineParam = new URLSearchParams(location.search).get('fine'); } catch (e) { /* no location */ }
  const FINE_SIZE = fineParam === null ? 0.18 : +fineParam;
  // integrator r4: screen size cull. The asset pass added bolts, rivets, nails, hinge leaves, drips and
  // tabs, each its own small mesh; a 6 cm bolt is 3 px at 15 m and an 18 cm part 4 px at 22 m, and the
  // judges' own notes say these parts read only inside a few metres. Once per asset the part tree is
  // loaded, every mesh whose box is under FINE_SIZE on all three axes goes to a fine half and the rest
  // to a coarse half, and each half is collapsed by material (the same merge loadPrototype does), so a
  // placement still clones a handful of meshes. The fine halves are baked into a '#fine' group per
  // block, which main.js hides past FINE_CULL (block edge distance, fade in lighting.js) and which
  // never casts. Nothing is decimated and nothing is removed: within its reading distance every part
  // draws. Instanced meshes (foliage cards), lamps and glass stay in the coarse half. '?fine=0' turns
  // the split off for the A/B.
  const splitProtos = new Map();
  let fineMeshes = 0;
  function loadSplit(name) {
    if (!splitProtos.has(name)) splitProtos.set(name, buildSplit(name));   // the promise, so parallel callers share one build
    return splitProtos.get(name);
  }
  async function buildSplit(name) {
    const tree = await ASSET(url(name), { keepHierarchy: true, surfaces: true });
    tree.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3());   // what assetSize() would report
    const _b = new THREE.Box3(), _s = new THREE.Vector3();
    const fine = [];
    tree.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.isInstancedMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && (m.transparent || (m.emissive && m.emissive.getHex && m.emissive.getHex()))) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); _b.getSize(_s);
      if (Math.max(_s.x, _s.y, _s.z) < FINE_SIZE) fine.push(o);
    });
    const fineRoot = new THREE.Group();
    for (const m of fine) {
      const w = m.matrixWorld.clone();
      m.removeFromParent();
      fineRoot.add(m);
      m.matrix.copy(w); m.matrix.decompose(m.position, m.quaternion, m.scale);
    }
    fineMeshes += fine.length;
    return { coarse: bakeStatic(tree), fine: fine.length ? bakeStatic(fineRoot) : null, fineParts: fine.length, size };
  }
  // 3. preload in chunks so the loading bar moves
  const toLoad = names.filter((n) => present.has(n));
  const sizes = new Map();
  const movingNames = new Set(placements.filter((p) => p.moving).map((p) => p.asset));
  for (let i = 0; i < toLoad.length; i += 6) {
    const chunk = toLoad.slice(i, i + 6);
    if (FINE_SIZE > 0) {
      // integrator r4: one build per asset. The split prototype is the only load path for static props;
      // movers still take the plain merged prototype for their size.
      await Promise.all(chunk.map(async (n) => {
        try {
          if (GLB_STATIC[n]) { const t = TSV_SIZES[n] || [4, 4, 2]; sizes.set(n, new THREE.Vector3(t[0], t[2], t[1])); await loadGlbStatic(n, t); }   // round 11: GLB props, size from the TSV
          else if (movingNames.has(n)) { await preloadAssets([url(n)]); sizes.set(n, await assetSize(url(n))); }
          else sizes.set(n, (await loadSplit(n)).size);
        } catch (e) { console.warn('[level] load failed', n, e.message); }
      }));
    } else {
      await preloadAssets(chunk.filter((n) => !GLB_STATIC[n]).map(url));
      for (const n of chunk) { try { if (GLB_STATIC[n]) { const t = TSV_SIZES[n] || [4, 4, 2]; sizes.set(n, new THREE.Vector3(t[0], t[2], t[1])); continue; } sizes.set(n, await assetSize(url(n))); } catch (e) { console.warn('[level] assetSize failed', n, e.message); } }
    }
    progress(0.05 + 0.5 * ((i + 6) / Math.max(1, toLoad.length)), 'loading assets');
  }

  // 4. place
  const blockGroups = new Map();
  const movers = [];
  const assetNames = new Set();
  const stats = { placed: 0, skipped: 0, empty: 0, colliders: 0 };
  const baseYOf = (p) => {
    let y;
    if (typeof p.y === 'number') y = p.y;
    else if (p.wadiBed) y = Math.min(heightAt(p.x, p.z - 5), heightAt(p.x, p.z + 5), heightAt(p.x, p.z));
    else if (p.ySample) y = heightAt(p.ySample[0], p.ySample[1]);
    else if (p.sink) {
      // level r5: foliage sinks to the lowest of five samples over its footprint (a card whose bottom is
      // under the sand is invisible, a card whose mound floats over a slope is not); NaN where the spread
      // says the footprint is on a bank steeper than the placement allows, and the placement is skipped
      const r = p.sink, hs = [heightAt(p.x, p.z), heightAt(p.x + r, p.z), heightAt(p.x - r, p.z), heightAt(p.x, p.z + r), heightAt(p.x, p.z - r)];
      const lo = Math.min(...hs), hi = Math.max(...hs);
      if (p.sinkMax && hi - lo > p.sinkMax) return NaN;
      y = lo;
    }
    else y = heightAt(p.x, p.z);
    return y + (p.dy || 0);
  };

  let i = 0;
  for (const p of placements) {
    i++;
    if (i % 40 === 0) progress(0.55 + 0.3 * (i / placements.length), 'placing');
    if (!present.has(p.asset)) { stats.skipped++; continue; }
    const baseY = baseYOf(p);
    if (Number.isNaN(baseY)) { stats.sloped = (stats.sloped || 0) + 1; continue; }   // level r5: foliage on a bank
    // integrator r4: static props come from the split prototype (coarse and fine halves, each already
    // collapsed by material, see loadSplit above); movers keep their part tree as before
    const glb = !p.moving && GLB_STATIC[p.asset] ? await loadGlbStatic(p.asset, (TSV_SIZES[p.asset] || [4, 4, 2])) : null;
    const split = (!p.moving && !glb && FINE_SIZE > 0) ? await loadSplit(p.asset) : null;
    const obj = glb || (split ? split.coarse.clone(true) : await ASSET(url(p.asset), p.moving ? { keepHierarchy: true, surfaces: true } : { surfaces: true }));
    let meshes = 0;
    obj.traverse((o) => { if (o.isMesh) meshes++; });
    if (!meshes) { console.warn(`[level] asset ${p.asset} loaded empty, placement ${p.tag} skipped`); stats.empty++; continue; }
    const size = sizes.get(p.asset) || new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const yaw = p.rot * DEG;
    // Ben 2026-08-29 16:33: "the palm trees all sit bad on the ground ... sinking them into the floor a bit more": 25 cm
    let sink = (!p.moving && !p.dy && SINK.has(p.asset)) ? 0.04 : 0;
    if (!p.moving && !p.dy && p.asset === 'palm_tree' && terrain && terrain.heightAt) {
      // Ben 2026-08-29 16:49 (photo): a palm on a dune stood on the high side with its fillet as a flat plate over the
      // low side. The trunk now goes down to the LOWEST ground within 0.6 m of it, 15 cm further, so the boots are
      // buried on the uphill side and nothing floats on the downhill side.
      let lo = baseY; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; lo = Math.min(lo, terrain.heightAt(p.x + Math.cos(a) * 0.6, p.z + Math.sin(a) * 0.6)); }
      sink = baseY - lo + 0.15;
    }
    obj.position.set(p.x, baseY - sink, p.z);
    obj.rotation.y = yaw;
    if (p.scale && p.scale !== 1) obj.scale.setScalar(p.scale);   // level r2: uniform, far objects only (see placements.js)
    if (p.tilt) {
      const dir = (p.tiltDir || 0) * DEG;
      const axis = new THREE.Vector3(Math.cos(dir), 0, -Math.sin(dir)).normalize();   // lean toward tiltDir
      obj.rotateOnWorldAxis(axis, p.tilt * DEG);
    }
    obj.name = p.tag;
    obj.userData.asset = p.asset;
    obj.userData.block = p.block;
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    assetNames.add(p.asset);
    stats.placed++;
    if (world) stats.colliders += registerColliders(world, p, yaw, baseY, size);

    if (p.moving) {
      // integrator: colour and roughness into vertices, then one mesh per joint (the pump jack was ~250 meshes)
      applyMaterials(obj, { asset: p.asset, unify: true, local: true });   // materials r3: was vertexiseMaterials(obj, { unify: true })
      const joints = obj.userData.joints || {};
      collapsePerJoint(obj, Object.values(joints).filter((j) => j && j.isObject3D), { bakeColors: false });
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);
      movers.push(p.asset === 'pump_jack' ? pumpJackMover(p, obj) : { asset: p.asset, object: obj, tag: p.tag, update() {} });
      continue;
    }
    if (glb) {
      // round 11: a GLB prop is one textured mesh already; it is NOT merged into the block (bakeStatic merges by
      // material values and would drop its baked maps), it stands in the scene on its own, one draw each
      // the edge ridges stand outside the walls: their shadows fall where nobody walks, and 6 x 8.5k tris in the
      // shadow pass put the gate over budget (1.80M against 1.7M), so they receive but do not cast
      const casts = p.asset !== 'rock_ridge';
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = casts; o.receiveShadow = true; } });
      scene.add(obj);
      stats.glb = (stats.glb || 0) + 1;
      continue;
    }
    applyMaterials(obj, { asset: p.asset });   // materials r3: was vertexiseMaterials(obj); textures per set, then the same vertex bake
    const gkey = NO_SHADOW.has(p.asset) || INTERIOR.has(p.asset) ? p.block + '#nocast' : LANDMARK.has(p.asset) ? p.block : p.block + '#clutter';
    let g = blockGroups.get(gkey);
    if (!g) { g = new THREE.Group(); g.name = 'block_' + gkey; blockGroups.set(gkey, g); }
    g.add(obj);
    // round 17 item 1: the contact fillet, same block, sand set, baked with the block
    const fspec = !p.dy && FILLET_ASSETS[p.asset];
    if (fspec && terrain && terrain.heightAt) {
      const sz = TSV_SIZES[p.asset] || [size.x, size.z, size.y];
      const fil = makeFillet(p, [sz[0], sz[1]], fspec, (x, z) => terrain.heightAt(x, z), baseY - sink);
      if (fil) { applyMaterials(fil, { asset: 'sand_fillet' }); g.add(fil); stats.fillets = (stats.fillets || 0) + 1; }
    }
    // round 17 item 4: the storage tanks stand on a real concrete plinth (12 cm slab, 45 degree edge) instead of a painted ring
    if (!p.dy && (p.asset === 'oil_storage_tank' || p.asset === 'oil_storage_tank_open')) {
      const r = 4.3 * (p.scale || 1);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.12, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0xb9b2a2, roughness: 0.9, metalness: 0 }));
      plinth.material.name = 'stone';
      plinth.position.set(p.x, baseY - sink + 0.06 - 0.02, p.z); plinth.name = p.tag + '_plinth'; plinth.castShadow = true; plinth.receiveShadow = true;
      applyMaterials(plinth, { asset: 'tank_plinth' });
      g.add(plinth);
    }
    if (split && split.fine && !gkey.endsWith('#nocast')) {
      // integrator r4: the fine half, same transform, its own group of the block (scatter stays whole)
      const fobj = split.fine.clone(true);
      fobj.position.copy(obj.position); fobj.quaternion.copy(obj.quaternion); fobj.scale.copy(obj.scale);
      fobj.name = p.tag + '#fine';
      fobj.userData.asset = p.asset;
      fobj.userData.block = p.block;
      applyMaterials(fobj, { asset: p.asset });
      const fkey = p.block + '#fine';
      let fg = blockGroups.get(fkey);
      if (!fg) { fg = new THREE.Group(); fg.name = 'block_' + fkey; blockGroups.set(fkey, fg); }
      fg.add(fobj);
    }
  }
  stats.fineMeshes = fineMeshes;
  // size sanity against the TSV numbers carried in the collider specs (a wrong size is a
  // collider that does not match what you see)
  for (const [n, s] of sizes) {
    const p = placements.find((q) => q.asset === n);
    if (!p) continue;
    const tsv = TSV_SIZES[n];
    if (!tsv) continue;
    const off = Math.max(Math.abs(s.x - tsv[0]) / tsv[0], Math.abs(s.z - tsv[1]) / tsv[1], Math.abs(s.y - tsv[2]) / tsv[2]);
    if (off > SIZE_TOLERANCE) console.warn(`[level] ${n} measures ${s.x.toFixed(2)} x ${s.z.toFixed(2)} x ${s.y.toFixed(2)} m, TSV says ${tsv.join(' x ')}`);
  }

  // 5. walkables and links (absolute y, corrected against the terrain where a pad height differs)
  if (world) {
    for (const w of WALKABLES) {
      const poly = w.polygon.map(([x, z]) => new THREE.Vector3(x, w.y, z));
      world.addWalkable(poly, w.y, w.name);
      stats.colliders++;
    }
    for (const l of LINKS) {
      if (l.terrainY) {
        l.from[1] = heightAt(l.from[0], l.from[2]);
        l.to[1] = heightAt(l.to[0], l.to[2]);
      }
      if (l.type === 'catwalk') continue;   // bridges are walkables; the navgrid reads LINKS for the island joins
      world.addLink({ type: l.type, from: new THREE.Vector3(...l.from), to: new THREE.Vector3(...l.to), width: l.width, name: l.name });
      stats.colliders++;
    }
    // the invisible wall at the map extent, 4 m high, every edge
    world.addBox(new THREE.Vector3(-70.5, 2, 0), new THREE.Vector3(1, 4, 112), 0, 'boundary');
    world.addBox(new THREE.Vector3(70.5, 2, 0), new THREE.Vector3(1, 4, 112), 0, 'boundary');
    world.addBox(new THREE.Vector3(0, 2, -55.5), new THREE.Vector3(142, 4, 1), 0, 'boundary');
    world.addBox(new THREE.Vector3(0, 2, 55.5), new THREE.Vector3(142, 4, 1), 0, 'boundary');
    stats.colliders += 4;
  }

  // 6. bake per block
  const blocks = new Map();
  let staticMeshes = 0;
  for (const [gkey, g] of blockGroups) {
    const noCast = gkey.endsWith('#nocast') || gkey.endsWith('#fine');   // integrator r4: small parts never cast
    const key = gkey.split('#')[0];
    const names = new Set();
    for (const child of g.children) if (child.userData && child.userData.asset) names.add(child.userData.asset);
    const baked = bakeStatic(g);
    baked.name = 'block_' + gkey;
    baked.userData.block = key;
    baked.userData.assets = [...names];
    baked.traverse((o) => { if (o.isMesh) { o.castShadow = !noCast; o.receiveShadow = true; staticMeshes++; } });
    scene.add(baked);
    if (blocks.has(key)) { const prev = blocks.get(key); prev.add(baked); prev.userData.assets = [...new Set([...prev.userData.assets, ...names])]; }
    else if (gkey === key) blocks.set(key, baked);
    else { const holder = new THREE.Group(); holder.name = 'block_' + key; holder.userData.block = key; holder.userData.assets = [...names]; holder.add(baked); scene.add(holder); blocks.set(key, holder); }
  }
  progress(0.9, 'baking');

  // 7. interior lamps: warm lens plus a small point light on the high tier
  const lamps = [];
  for (const it of INTERIORS) {
    if (!it.lamp) continue;
    const [x, y, z] = it.lamp;
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a3d40, emissive: 0xffd9a0, emissiveIntensity: 2.2, roughness: 0.6 }),
    );
    lens.position.set(x, y, z);
    lens.name = 'lamp_' + it.name;
    scene.add(lens);
    lamps.push(lens);
    if (pointLights) {
      const light = new THREE.PointLight(0xffd9a0, 6, 9, 2);
      light.position.set(x, y - 0.1, z);
      light.castShadow = false;
      light.name = 'lamplight_' + it.name;
      scene.add(light);
      lamps.push(light);
    }
  }

  // 8. sightline check (MAP-PLAN section 5) at eye height
  const sightlines = [];
  if (world && world.lineOfSight) {
    const pt = ([x, y, z]) => new THREE.Vector3(x, (y == null ? heightAt(x, z) : y) + EYE, z);
    for (const s of SIGHTLINES) {
      const a = pt(s.a), b = pt(s.b);
      let got = null;
      try { got = !!world.lineOfSight(a, b); } catch (e) { console.warn('[level] lineOfSight threw', s.name, e.message); }
      const ok = got === s.expect;
      sightlines.push({ name: s.name, expect: s.expect, got, ok, dist: +a.distanceTo(b).toFixed(1) });
      if (!ok) console.warn(`[level] sightline check failed: "${s.name}" expected ${s.expect ? 'open' : 'blocked'} (${a.distanceTo(b).toFixed(0)} m)`);
    }
  }
  // decals r6: ground and wall decals after the bake (the wall snap needs the colliders and the block meshes)
  let decals = null;
  try { decals = await buildDecals(THREE, { scene, terrain, world, blocks, tier: quality }); } catch (e) { console.warn('[level] decals failed', e && e.message); }
  progress(1, 'level ready');
  console.log(`[level] placed ${stats.placed}, skipped ${stats.skipped} (missing files), sloped ${stats.sloped || 0} (foliage on a bank), empty ${stats.empty}, colliders ${stats.colliders}, blocks ${blocks.size}, static meshes ${staticMeshes}, movers ${movers.length}, sightlines ${sightlines.filter((s) => s.ok).length}/${sightlines.length} ok`);

  return {
    blocks, movers, colliders: stats.colliders, assetNames, missing, sightlines, lamps, staticMeshes, stats, decals,   // decals r6
    update(dt) { for (const m of movers) m.update(dt); },
  };
}

// w, d, h from docs/OBJECTS.tsv, for the size sanity warning only
const TSV_SIZES = {
  derrick_base_module: [10, 10, 5.7], derrick_mid_module: [8, 8, 5.7], derrick_crown_module: [6.5, 6.5, 21.8],
  oil_storage_tank: [8, 8, 5.2], oil_storage_tank_open: [8, 8, 5.2], tank_catwalk_bridge: [5, 1.2, 1.1],
  bullet_tank_horizontal: [8, 2.6, 3.2], pump_house_building: [12, 8, 5.2], bunkhouse_building: [14, 8, 5.2],
  mud_pump_shed: [10, 6, 4.9], watchtower_gantry: [3, 3, 7], culvert_crossing: [3.4, 8, 2.6],
  compound_wall_panel: [4, 0.4, 2.4], corrugated_wall_panel: [3, 0.15, 2.4], pipe_run_straight: [6, 0.9, 1.5],
  pipe_run_elbow: [3, 3, 1.5], pipe_rack_stack: [6, 2, 1.6], large_pipe_section: [8, 1.5, 1.6],
  external_steel_stair: [1.2, 3.6, 2.3], catwalk_section: [3, 1.2, 1.1], caged_ladder: [0.8, 0.5, 4.6],
  floodlight_mast: [1.4, 1.4, 9], barbed_wire_fence_section: [3, 0.3, 2.6], perimeter_fence: [10, 0.3, 3.0], pump_jack: [9, 2.6, 6],
  sandbag_wall: [2, 0.6, 1], jersey_barrier: [3, 0.6, 0.82], crate_stack: [1.2, 1, 1.3], ammo_crate: [0.6, 0.35, 0.3],
  oil_drum: [0.585, 0.585, 0.88], ibc_tote: [1.2, 1, 1.16], tyre_stack: [1, 1, 1.2],
  shipping_container_rust_red: [6.06, 2.44, 2.59], shipping_container_blue: [6.06, 2.44, 2.59],
  shipping_container_tan: [6.06, 2.44, 2.59], shipping_container_open: [6.06, 2.44, 2.59],
  rock_outcrop_large: [8, 5, 3], rock_outcrop_small: [2, 1.5, 1], rock_ridge: [20, 8, 5], generator_set: [3.2, 1.2, 1.9],
  fuel_truck_wreck: [8, 2.5, 3.2], pickup_wreck: [5.2, 2, 1.8], wooden_pallet_stack: [1.2, 0.8, 0.6],
  valve_manifold: [2.4, 1, 1.6], wellhead_christmas_tree: [1.2, 1.2, 2.4], palm_tree: [6, 6, 9],
  dead_shrub: [1.2, 1.2, 0.8], grass_tuft: [0.6, 0.6, 0.45], debris_scatter: [2, 2, 0.3], bunk_bed: [2, 0.9, 1.7], locker_bank: [1.2, 0.5, 1.8],
  office_desk: [1.4, 1.3, 0.9], mess_table: [2.4, 1.4, 0.76], steel_shelving: [1, 0.45, 1.8], control_cabinet: [0.8, 0.4, 1.9],
};

export { SPECS as COLLIDER_SPECS, PADS, padAt };
