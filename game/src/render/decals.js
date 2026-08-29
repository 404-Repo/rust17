/**
 * DERRICK  render/decals.js  (owner: decals, round 6)
 *
 * Near field decals: twenty RGBA marks generated with Atlas (tyre tracks, stains, drifts,
 * footprints, litter, gravel, cable, stencils, signs, hazard stripes, bullet holes, rust runs,
 * scuffs, grease), packed into ONE 2048 atlas (textures/decals_atlas.webp, prep in
 * work/r6_decals/prep_atlas.py) and projected onto the ground and onto walls so the first
 * eight metres carry marks the way the Rust reference frames do, and the sand tile repeat
 * at 10 to 30 m is broken by things that are not tiles.
 *
 *   const decals = await buildDecals(THREE, { scene, terrain, world, blocks, tier });
 *   decals.update(cameraPosition, farCull)   per frame, the block cull (same rule as clutter)
 *   decals.stats                             { ground, wall, skipped, tris, meshes, blocks }
 *
 * Ground decals: a quad per decal draped on the terrain (4 x 4 to 8 x 8 cells, every vertex at
 * heightAt + LIFT, the normal from the terrain), polygonOffset so they never z fight, no cast,
 * receive on, so they sit in the same shadows as the sand.
 * Wall decals: a 4 x 4 quad placed off the face along its normal, every vertex snapped to the
 * collider world by world.raycast from 0.5 m outside inward (so a stencil wraps a tank and a
 * scuff wraps a drum), and the depth corrected once per decal against the baked block mesh at
 * the centre (a jersey barrier's collider box is wider than its sloped face). A decal whose
 * centre finds no surface is skipped, never floated.
 * Two shared materials: CUT (alphaTest 0.35: tracks, stencils, signs, stripes, holes, cable,
 * arrows) and SOFT (transparent, depthWrite off: stains, drifts, footprints, litter, gravel,
 * rust, scuffs, grease, so the feathered edges blend). All decals of a 20 m block merge into at
 * most two meshes (BufferGeometryUtils), so the whole system is under 40 draws in any view.
 * The materials are named 'ground' so lighting.js gives them no dust film (the sand has none)
 * and carry __cullFade 'clutter' so they dither out over the same last 10 m as the clutter.
 * Per decal: a random 10 percent dark or light tint (vertex colour) and a random mirror on
 * the marks that are not text, so repeats do not read.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DECALS } from '../level/placements.js?v=r22-202608292305';

// UV rects in the atlas, three.js convention (v = 0 at the bottom): [u0, v0, u1, v1, w / h]
export const ATLAS_RECTS = {
  seepage_streak: [0.00366, 0.77661, 0.0686, 0.99634, 0.3002],
  oil_stain_large: [0.073, 0.78296, 0.29272, 0.99634, 1.0295],
  footprints: [0.29712, 0.80005, 0.49292, 0.99634, 0.9975],
  gravel_patch: [0.49731, 0.80786, 0.6936, 0.99634, 1.0411],
  drain_stain: [0.698, 0.81616, 0.86743, 0.99634, 0.9409],
  sand_drift: [0.00366, 0.59497, 0.19165, 0.77222, 1.0601],
  litter_patch: [0.19604, 0.59985, 0.36694, 0.77222, 0.9916],
  bullet_holes_concrete: [0.37134, 0.59985, 0.5437, 0.77222, 1.0],
  rust_run: [0.87183, 0.82397, 0.92456, 0.99634, 0.3118],
  bullet_holes: [0.5481, 0.60522, 0.72046, 0.77222, 1.0319],
  spill_wall: [0.72485, 0.61548, 0.84204, 0.77222, 0.75],
  oil_stain_small: [0.00366, 0.43677, 0.1604, 0.59058, 1.0189],
  notice_poster: [0.84644, 0.6394, 0.94116, 0.77222, 0.7164],
  scuff_marks: [0.16479, 0.46069, 0.31323, 0.59058, 1.1413],
  stencil_arrow: [0.31763, 0.46167, 0.40845, 0.59058, 0.7079],
  grease_smear: [0.41284, 0.46216, 0.56128, 0.59058, 1.1541],
  stencil_danger: [0.56567, 0.46851, 0.73413, 0.59058, 1.3755],
  rust_bloom: [0.73853, 0.47339, 0.82446, 0.59058, 0.7366],
  stencil_no_smoking: [0.82886, 0.48706, 0.9895, 0.59058, 1.5442],
  stencil_02: [0.00366, 0.33179, 0.13257, 0.43237, 1.2775],
  stencil_07: [0.13696, 0.33276, 0.26587, 0.43237, 1.2899],
  hazard_stripe: [0.27026, 0.35425, 0.52173, 0.43237, 3.1779],
  concrete_crack: [0.52612, 0.36597, 0.73022, 0.43237, 3.0288],
};
// blended, feathered edges; everything else is an alpha cut
// round 22 (decal review, Ben "do all 3"): bullet holes and the rust bloom are one stamp repeated (same size, hard
// edge, bright core) and read as stickers at this texel density; damage is geometry in the assets now.
const REMOVED = new Set(['tyre_track_straight', 'tyre_track_curve', 'cable_on_ground', 'gravel_patch', 'litter_patch',
  'bullet_holes', 'bullet_holes_concrete', 'rust_bloom']);   // round 17 item 4: the gravel and litter sprites read as grey stickers ("the rocks"); gravel is a terrain paint class, litter is debris_scatter geometry
const SOFT = new Set(['seepage_streak', 'drain_stain', 'rust_bloom', 'spill_wall', 'tyre_track_straight', 'tyre_track_curve', 'oil_stain_large', 'oil_stain_small', 'sand_drift', 'footprints', 'litter_patch', 'gravel_patch', 'rust_run', 'scuff_marks', 'grease_smear']);
// text and the arrow never mirror; a rust run hangs from its bolt, so it never mirrors vertically either
const NO_FLIP = new Set(['notice_poster', 'seepage_streak', 'drain_stain', 'rust_bloom', 'spill_wall', 'stencil_02', 'stencil_07', 'stencil_danger', 'stencil_no_smoking', 'stencil_arrow', 'hazard_stripe']);
const LIFT = 0.025;                 // metres above the drawn terrain triangles
const WALL_OFF_FLAT = 0.01;         // metres off a flat face (concrete, painted housings, barriers)
const WALL_OFF_RIBBED = 0.03;       // off a corrugated or curved face (containers, tanks, drums, wrecks)
const RIBBED = /container|tank|drum|wreck|fuel_truck|pickup|bullet/;
const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

function blockKeyOf(x, z) {
  const bx = Math.max(0, Math.min(6, Math.floor((x + 70) / 20)));
  const bz = Math.max(0, Math.min(5, Math.floor((z + 55) / 20)));
  return `${bx}_${bz}`;
}

function makeGeom(pos, nor, uv, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export async function buildDecals(THREE_, { scene, terrain, world, blocks, tier, decals = DECALS, textureBase = './textures/' } = {}) {
  const t0 = performance.now();
  const T = tier || { name: 'high', anisotropy: 4 };
  let param = null;
  try { param = new URLSearchParams(location.search).get('decals'); } catch (e) { /* no location */ }
  const stats = { ground: 0, wall: 0, skipped: 0, tris: 0, meshes: 0, blocks: 0, snapped: 0, meshFix: 0, maxFix: 0, bigFix: [], ruts: 0, skippedTags: [], skipDebug: [] };
  const empty = { stats, groups: new Map(), update() {} };
  if (param === '0' || !terrain) return empty;   // '?decals=0' is the A/B
  // round 7 (Ben 2026-08-29: "tire tracks don't line up and the wires look fake"): the tread images are
  // perspective photos, not orthographic tiles, so chained pieces can never meet; the cable image is a
  // product shot of coiled hose. Both are dropped at load; the road ruts live in the terrain heightmap.
  decals = decals.filter((d) => !REMOVED.has(d.d));
  // round 22: nothing wraps a cylinder any more. The round projection uses a collider radius, and a scaled tank or a
  // rebuilt drum leaves the quad floating beside the object (Ben's photo of the east tank).
  decals = decals.filter((d) => d.snap !== 'round');

  let tex;
  try { tex = await new THREE.TextureLoader().loadAsync(textureBase + 'decals_atlas.webp'); }
  catch (e) { console.warn('[decals] atlas failed to load', e && e.message); return empty; }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = T.anisotropy || 1;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const base = { map: tex, vertexColors: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.FrontSide };
  const matCut = new THREE.MeshStandardMaterial({ ...base, alphaTest: 0.35 });
  const matSoft = new THREE.MeshStandardMaterial({ ...base, transparent: true, depthWrite: false, alphaTest: 0.02 });
  for (const m of [matCut, matSoft]) { m.name = 'ground'; m.userData = { surface: 'ground', __cullFade: 'clutter', decal: true }; }

  // deterministic per decal randoms (tint, mirror)
  let seed = 8891;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const heightAt = (x, z) => terrain.heightAt(x, z);
  const _n = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Vector3();

  /** Two rut hollows across the line at (x, z) heading (tx, tz): the offset of their midpoint, or null. */
  function rutOffset(x, z, tx, tz) {
    const nx = -tz, nz = tx, N = 52, step = 0.05, s0 = -1.3;
    const h = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) h[i] = heightAt(x + nx * (s0 + i * step), z + nz * (s0 + i * step));
    const mins = [];
    for (let i = 2; i < N - 1; i++) if (h[i] <= h[i - 1] && h[i] <= h[i + 1] && h[i] < h[i - 2] && h[i] < h[i + 2]) mins.push(i);
    let best = null, bd = 0;
    for (const i of mins) for (const j of mins) {
      const gap = (j - i) * step;
      if (gap < 1.2 || gap > 2.0) continue;
      let ridge = -1e9; for (let k = i; k <= j; k++) ridge = Math.max(ridge, h[k]);
      const depth = ridge - Math.max(h[i], h[j]);
      if (depth > bd) { bd = depth; best = (i + j) / 2; }
    }
    if (best === null || bd < 0.03) return null;
    return s0 + best * step;
  }
  /** Slide a track piece sideways into the terrain's own ruts and turn it along them. */
  function alignToRuts(d) {
    const a = d.rot * DEG, tx = -Math.sin(a), tz = -Math.cos(a);   // the image's vertical in the world
    const o0 = rutOffset(d.x, d.z, tx, tz);
    if (o0 === null) return d;
    const oA = rutOffset(d.x - tx * 1.4, d.z - tz * 1.4, tx, tz), oB = rutOffset(d.x + tx * 1.4, d.z + tz * 1.4, tx, tz);
    const nx = -tz, nz = tx;
    let rot = d.rot;
    if (oA !== null && oB !== null && Math.abs(oB - oA) < 0.8) {
      const ax = d.x - tx * 1.4 + nx * oA, az = d.z - tz * 1.4 + nz * oA, bx = d.x + tx * 1.4 + nx * oB, bz = d.z + tz * 1.4 + nz * oB;
      rot = (Math.atan2(-(bx - ax), -(bz - az)) * 180) / Math.PI;
    }
    stats.ruts = (stats.ruts || 0) + 1;
    return { ...d, x: d.x + nx * o0, z: d.z + nz * o0, rot };
  }

  function groundGeom(d0) {
    const d = d0.rut ? alignToRuts(d0) : d0;
    const rect = ATLAS_RECTS[d.d];
    const n = Math.min(8, Math.max(4, Math.ceil(Math.max(d.w, d.h) / 0.5)));
    const a = d.rot * DEG, c = Math.cos(a), s = Math.sin(a);
    const flip = !NO_FLIP.has(d.d) && rnd() < 0.5;
    const tint = 1 + (rnd() - 0.5) * 0.2;
    const [u0, v0, u1, v1] = rect;
    const pos = [], nor = [], uv = [], col = [], idx = [];
    const hx = d.w / n / 2, hz = d.h / n / 2;
    for (let iz = 0; iz <= n; iz++) {
      for (let ix = 0; ix <= n; ix++) {
        const lx = (ix / n - 0.5) * d.w, lz = (iz / n - 0.5) * d.h;
        const wx = d.x + lx * c + lz * s, wz = d.z - lx * s + lz * c;
        // the drawn terrain is piecewise linear on its own cells and the decal on its own, so the
        // vertex takes the highest of the five samples over its half cell: a rut lip between two
        // decal vertices can never rise through the mark
        let y = heightAt(wx, wz);
        y = Math.max(y, heightAt(wx + hx * c, wz - hx * s), heightAt(wx - hx * c, wz + hx * s), heightAt(wx + hz * s, wz + hz * c), heightAt(wx - hz * s, wz - hz * c));
        terrain.normalAt(wx, wz, _n);
        pos.push(wx, y + LIFT, wz); nor.push(_n.x, _n.y, _n.z);
        const fu = flip ? 1 - ix / n : ix / n;
        uv.push(u0 + fu * (u1 - u0), v1 - (iz / n) * (v1 - v0));
        col.push(tint, tint, tint);
      }
    }
    for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
      const a0 = iz * (n + 1) + ix, b0 = a0 + 1, c0 = a0 + n + 1, d0 = c0 + 1;
      idx.push(a0, d0, b0, a0, c0, d0);
    }
    return makeGeom(pos, nor, uv, col, idx);
  }

  /** Collider surface along -N from 0.5 m outside p; returns the depth along N (negative = inside the plane) or null. */
  function snapDepth(p, N, out) {
    if (!world || !world.raycast) return null;
    _o.copy(p).addScaledVector(N, 0.5);
    _d.copy(N).negate();
    const r = world.raycast(_o, _d, 0.9);
    if (!r || !r.hit || r.tag === 'terrain' || r.tag === 'boundary') return null;
    if (out && r.normal) out.copy(r.normal);
    return 0.5 - r.dist;
  }
  /** The baked block mesh along the same ray, for the true face depth at the decal centre. */
  function meshDepth(p, N) {
    if (!blocks) return null;
    const cands = [];
    for (const k of new Set([blockKeyOf(p.x, p.z), blockKeyOf(p.x + N.x, p.z + N.z), blockKeyOf(p.x - N.x, p.z - N.z)])) { const g = blocks.get(k); if (g) cands.push(g); }
    if (!cands.length) return null;
    _o.copy(p).addScaledVector(N, 0.5);
    _d.copy(N).negate();
    ray.set(_o, _d); ray.near = 0; ray.far = 0.9;
    const hits = ray.intersectObjects(cands, true);
    for (const h of hits) {
      if (h.object.userData && h.object.userData.decal) continue;
      const pn = h.object.parent ? String(h.object.parent.name) : '';
      if (pn.endsWith('#nocast') || pn.endsWith('#fine')) continue;   // a shrub card or a bolt in front of the face is not the face
      return 0.5 - h.distance;
    }
    return null;
  }

  function wallGeom(d) {
    const rect = ATLAS_RECTS[d.d];
    const N = new THREE.Vector3(d.nx, 0, d.nz).normalize();
    const R = new THREE.Vector3().crossVectors(UP, N);
    const cy = heightAt(d.ax, d.az) + d.h0;
    _c.set(d.x, cy, d.z);
    const off = RIBBED.test(d.tag || '') ? WALL_OFF_RIBBED : WALL_OFF_FLAT;
    // centre first: the collider depth, then the mesh depth; a 'need' decal with no surface is skipped
    const hitN = new THREE.Vector3();
    const round = d.snap === 'round' && d.r > 0;
    let depthC = (d.snap === 'none' || round) ? 0 : snapDepth(_c, N, hitN);
    if (depthC === null) {
      if (d.snap === 'need') {
        if (stats.skipDebug.length < 8 && world && world.raycast) { _o.copy(_c).addScaledVector(N, 0.5); _d.copy(N).negate(); const r = world.raycast(_o, _d, 0.9); stats.skipDebug.push(`${d.tag}:${d.d} at (${_c.x.toFixed(1)},${_c.y.toFixed(2)},${_c.z.toFixed(1)}) n(${N.x.toFixed(2)},${N.z.toFixed(2)}) -> ${r && r.hit ? r.tag + '@' + r.dist.toFixed(2) : 'miss'}`); }
        return null;
      }
      depthC = 0;
    }
    else stats.snapped++;
    let fix = 0;
    if (d.snap !== 'none') {
      const md = meshDepth(_c, N);
      if (md !== null && Math.abs(md - depthC) < 0.35) { fix = md - depthC; stats.meshFix++; stats.maxFix = Math.max(stats.maxFix, Math.abs(fix)); if (Math.abs(fix) > 0.08 && stats.bigFix.length < 40) stats.bigFix.push(`${d.tag}:${d.d}:${fix.toFixed(2)}`); }
    }
    const m = 4;
    const flip = !NO_FLIP.has(d.d) && d.d !== 'rust_run' && rnd() < 0.5;
    const tint = 1 + (rnd() - 0.5) * 0.2;
    const [u0, v0, u1, v1] = rect;
    const pos = [], nor = [], uv = [], col = [], idx = [];
    const vn = new THREE.Vector3();
    for (let j = 0; j <= m; j++) {
      for (let i = 0; i <= m; i++) {
        const a = (i / m - 0.5) * d.w, b = (j / m - 0.5) * d.h;
        _p.copy(_c).addScaledVector(R, a).addScaledVector(UP, b);
        let depth;
        if (round) {
          // wrap on the known cylinder: the vertex goes radially onto the surface, its normal radial
          const rx = _p.x - d.ax, rz = _p.z - d.az, rl = Math.hypot(rx, rz) || 1;
          vn.set(rx / rl, 0, rz / rl);
          _p.x = d.ax + vn.x * d.r; _p.z = d.az + vn.z * d.r;
          _p.addScaledVector(vn, fix + off);
          pos.push(_p.x, _p.y, _p.z); nor.push(vn.x, vn.y, vn.z);
          const fu = flip ? 1 - i / m : i / m;
          uv.push(u0 + fu * (u1 - u0), v0 + (j / m) * (v1 - v0));
          col.push(tint, tint, tint);
          continue;
        }
        depth = d.snap === 'none' ? 0 : snapDepth(_p, N, vn);
        if (depth === null) { depth = depthC; vn.copy(N); }
        if (Math.abs(vn.y) > 0.6 || vn.lengthSq() < 0.5) vn.copy(N);
        _p.addScaledVector(N, depth + fix + off);
        pos.push(_p.x, _p.y, _p.z); nor.push(vn.x, vn.y, vn.z);
        const fu = flip ? 1 - i / m : i / m;
        uv.push(u0 + fu * (u1 - u0), v0 + (j / m) * (v1 - v0));
        col.push(tint, tint, tint);
      }
    }
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
      const a0 = j * (m + 1) + i, b0 = a0 + 1, c0 = a0 + m + 1, d0 = c0 + 1;
      idx.push(a0, b0, d0, a0, d0, c0);
    }
    return makeGeom(pos, nor, uv, col, idx);
  }

  // build, grouped per block and mode
  const parts = new Map();   // '<block>#cut' | '<block>#soft' -> geometries
  const phone = T.name === 'phone';
  decals.forEach((d, i) => {
    if (!ATLAS_RECTS[d.d]) { stats.skipped++; return; }
    if (phone && !d.p && (i % 2)) return;   // half on the phone tier
    const g = d.k === 'g' ? groundGeom(d) : wallGeom(d);
    if (!g) { stats.skipped++; if (stats.skippedTags.length < 60) stats.skippedTags.push(`${d.tag}:${d.d}`); return; }
    if (d.k === 'g') stats.ground++; else stats.wall++;
    const key = blockKeyOf(d.x, d.z) + (SOFT.has(d.d) ? '#soft' : '#cut');
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(g);
  });

  const groups = new Map();
  for (const [pk, geoms] of parts) {
    const [key, mode] = pk.split('#');
    let holder = groups.get(key);
    if (!holder) {
      holder = new THREE.Group(); holder.name = 'decals_' + key;
      const [bx, bz] = key.split('_').map(Number);
      holder.userData = { block: key, cx: -70 + bx * 20 + 10, cz: -55 + bz * 20 + 10 };
      groups.set(key, holder); scene.add(holder); stats.blocks++;
    }
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mode === 'soft' ? matSoft : matCut);
    mesh.name = `decals_${key}#${mode}`;
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.renderOrder = mode === 'soft' ? 2 : 1;
    mesh.userData.decal = true;
    holder.add(mesh);
    stats.meshes++; stats.tris += merged.index.count / 3;
  }
  console.info(`[decals] ${stats.ground} ground + ${stats.wall} wall decals (${stats.skipped} skipped, ${stats.ruts} in ruts, ${stats.snapped} snapped, ${stats.meshFix} mesh depth fixes, max ${stats.maxFix.toFixed(3)} m) in ${stats.meshes} meshes over ${stats.blocks} blocks, ${stats.tris} triangles, ${(performance.now() - t0).toFixed(0)} ms`);
  if (stats.bigFix.length) console.info('[decals] depth fixes over 8 cm: ' + stats.bigFix.join(' '));
  if (stats.skipDebug.length) console.info('[decals] skip detail: ' + stats.skipDebug.join(' | '));
  if (stats.skippedTags.length) console.info('[decals] skipped (no surface under the centre): ' + stats.skippedTags.join(' '));

  return {
    stats, groups, materials: { cut: matCut, soft: matSoft }, texture: tex,
    /** Same rule as main.js for the clutter group: hide a block whose nearest edge is past `far`. */
    update(camPos, far = 50) {
      const cx = camPos.x, cz = camPos.z;
      for (const g of groups.values()) {
        const dx = Math.max(0, Math.abs(cx - g.userData.cx) - 10), dz = Math.max(0, Math.abs(cz - g.userData.cz) - 10);
        const shown = Math.hypot(dx, dz) < far;
        if (g.visible !== shown) g.visible = shown;
      }
    },
  };
}
