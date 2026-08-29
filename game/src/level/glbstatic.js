/**
 * Static GLB props (owner: level). Round 11: rocks from Atlas image_to_3d (Titan v1, remeshed to 8 to 10k,
 * maps baked), the one place generated meshes beat the coded ones (organic, no thin parts, never seen closer
 * than a few metres). A generated GLB arrives normalised to a unit box in an arbitrary orientation, so:
 *   - up = the axis of least extent (an outcrop is wider than it is tall; measured between the 1 and 99
 *     percentiles so a stray fragment cannot pick it), signed so the flatter side (the sand skirt) is down;
 *   - the footprint is scaled so its longest side matches the SIZES entry the colliders use, base at y = 0,
 *     centred on x and z; textures stay as generated (no applyMaterials), the shared lighting film still
 *     applies because it patches every MeshStandardMaterial.
 * Prototypes are cached; every placement gets a clone (bakeStatic merges it into its block afterwards).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/** name -> file, for level/build.js: an asset listed here loads the GLB instead of assets/<name>.js */
export const GLB_STATIC = {
  rock_outcrop_large: './assets/rock_outcrop_large.glb',
  rock_outcrop_small: './assets/rock_outcrop_small.glb',
  rock_ridge: './assets/rock_ridge.glb',
};

/** Sampled world positions of the vertices that are actually DRAWN (walks the index, so vertices left behind
 *  by the skirt cut do not count; the plate still sat in the position attribute and kept inflating the box). */
function points(root, step = 4) {
  const pts = []; const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position, idx = m.geometry.index;
    const n = idx ? idx.count : p.count;
    for (let i = 0; i < n; i += step) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); }
  });
  return pts;
}
/** Box of the drawn vertices (every one), same reason. */
function drawnBox(root) {
  const P = points(root, 1); const b = new THREE.Box3();
  for (let i = 0; i < P.length; i += 3) b.expandByPoint(new THREE.Vector3(P[i], P[i + 1], P[i + 2]));
  return b;
}
function leastExtentAxis(pts) {
  const n = pts.length / 3, proj = new Float32Array(n);
  let best = Infinity, bestDir = new THREE.Vector3(0, 1, 0), bestLo = 0, bestHi = 0;
  const N = 400, dir = new THREE.Vector3();
  for (let k = 0; k < N; k++) {
    const y = 1 - (k / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = k * 2.399963;
    dir.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    for (let i = 0; i < n; i++) proj[i] = pts[i * 3] * dir.x + pts[i * 3 + 1] * dir.y + pts[i * 3 + 2] * dir.z;
    const s = Float32Array.from(proj).sort();
    const lo = s[Math.floor(n * 0.01)], hi = s[Math.floor(n * 0.99)];
    if (hi - lo < best) { best = hi - lo; bestDir = dir.clone(); bestLo = lo; bestHi = hi; }
  }
  // sign: the side with MORE points near its extreme is the flat base (the skirt), so it goes down
  let nearLo = 0, nearHi = 0; const band = (bestHi - bestLo) * 0.12;
  for (let i = 0; i < n; i++) { const t = pts[i * 3] * bestDir.x + pts[i * 3 + 1] * bestDir.y + pts[i * 3 + 2] * bestDir.z; if (t < bestLo + band) nearLo++; else if (t > bestHi - band) nearHi++; }
  return nearLo >= nearHi ? bestDir : bestDir.negate();   // returns the DOWN direction... flipped below
}

function powerAxis(pts, mean, deflate) {
  const n = pts.length / 3; let C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    let x = pts[i * 3] - mean.x, y = pts[i * 3 + 1] - mean.y, z = pts[i * 3 + 2] - mean.z;
    if (deflate) { const d = x * deflate.x + y * deflate.y + z * deflate.z; x -= d * deflate.x; y -= d * deflate.y; z -= d * deflate.z; }
    C[0] += x * x; C[1] += x * y; C[2] += x * z; C[4] += y * y; C[5] += y * z; C[8] += z * z;
  }
  C[3] = C[1]; C[6] = C[2]; C[7] = C[5];
  let v = new THREE.Vector3(0.3, 0.5, 0.8).normalize();
  if (deflate) v.addScaledVector(deflate, -v.dot(deflate)).normalize();
  for (let k = 0; k < 50; k++) v.set(C[0] * v.x + C[1] * v.y + C[2] * v.z, C[3] * v.x + C[4] * v.y + C[5] * v.z, C[6] * v.x + C[7] * v.y + C[8] * v.z).normalize();
  return v;
}
function skirtNormal(pts, down0) {
  const n = pts.length / 3; const t = new Float32Array(n); let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { t[i] = pts[i * 3] * down0.x + pts[i * 3 + 1] * down0.y + pts[i * 3 + 2] * down0.z; if (t[i] < lo) lo = t[i]; if (t[i] > hi) hi = t[i]; }
  // the plate is at one end of the axis; take the 15 percent slab at each end and keep the flatter one
  const slabs = [[], []]; const cutHi = hi - 0.15 * (hi - lo), cutLo = lo + 0.15 * (hi - lo);
  for (let i = 0; i < n; i++) { if (t[i] > cutHi) slabs[0].push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]); else if (t[i] < cutLo) slabs[1].push(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]); }
  const flatness = (sl) => { if (sl.length < 60) return Infinity; let s1 = 0, s2 = 0; for (let i = 0; i < sl.length; i += 3) { const v = sl[i] * down0.x + sl[i + 1] * down0.y + sl[i + 2] * down0.z; s1 += v; s2 += v * v; } const k = sl.length / 3; return s2 / k - (s1 / k) * (s1 / k); };
  const slab = flatness(slabs[0]) <= flatness(slabs[1]) ? slabs[0] : slabs[1];
  if (slab.length < 60) return down0.clone().negate();
  const m = new THREE.Vector3(); for (let i = 0; i < slab.length; i += 3) m.x += slab[i], m.y += slab[i + 1], m.z += slab[i + 2]; m.divideScalar(slab.length / 3);
  const e1 = powerAxis(slab, m, null), e2 = powerAxis(slab, m, e1);
  const nrm = new THREE.Vector3().crossVectors(e1, e2).normalize();
  // sign: the body sits on the up side of the plate. (The point density test got the large outcrop and the
  // ridge upside down: their plates carry more vertices than their tops.)
  const all = new THREE.Vector3(); for (let i = 0; i < n; i++) all.x += pts[i * 3], all.y += pts[i * 3 + 1], all.z += pts[i * 3 + 2]; all.divideScalar(n);
  if (all.clone().sub(m).dot(nrm) < 0) nrm.negate();
  return nrm;
}

async function prototype(name, file, size) {
  const gltf = await loader.loadAsync(file);
  const src = gltf.scene;
  const pts = points(src);
  { src.updateMatrixWorld(true); const rb = new THREE.Box3().setFromObject(src, true).getSize(new THREE.Vector3()); console.info(`[glbstatic] ${name}: raw box ${rb.toArray().map((v) => v.toFixed(3)).join(' x ')}`); }
  const down0 = leastExtentAxis(pts);       // first guess: points from the body toward the flat base
  // refine on the skirt itself: the points in the bottom 15 percent along that guess lie on Titan's sand
  // plate, and the plate's normal is the true up (the first guess tilts 20 to 30 degrees on a rock whose
  // body is lopsided; the plate is dead flat)
  const up = skirtNormal(pts, down0);
  if ((globalThis.__GLB_FLIP__ || '').split(',').includes(name)) up.negate();   // debug: tools/assetview.mjs --flip
  // any horizontal x axis perpendicular to up
  const helper = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const xa = new THREE.Vector3().crossVectors(helper, up).normalize();
  const za = new THREE.Vector3().crossVectors(xa, up).normalize();
  const rot0 = new THREE.Matrix4().makeBasis(xa, up, za).invert();
  // yaw: the body's longest horizontal extent goes along X (the TSV lists width along x, depth along z, and
  // placements.js rotations assume that), measured after the up alignment on the 2 to 98 percentile
  const rot = rot0.clone();
  { const P2 = []; const v = new THREE.Vector3();
    for (let i = 0; i < pts.length; i += 3) { v.set(pts[i], pts[i + 1], pts[i + 2]).applyMatrix4(rot0); P2.push(v.x, v.z); }
    const n2 = P2.length / 2; const proj = new Float32Array(n2); let best = -1, bestA = 0;
    for (let k = 0; k < 90; k++) { const a = (k / 90) * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      for (let i = 0; i < n2; i++) proj[i] = P2[i * 2] * c + P2[i * 2 + 1] * sn;
      const sorted = Float32Array.from(proj).sort(); const ext = sorted[Math.floor(n2 * 0.98)] - sorted[Math.floor(n2 * 0.02)];
      if (ext > best) { best = ext; bestA = a; } }
    rot.premultiply(new THREE.Matrix4().makeRotationY(bestA));   // rotate the long axis (at angle bestA from +X toward +Z) back onto +X
  }
  const g = new THREE.Group(); g.name = name;
  const holder = new THREE.Group(); holder.applyMatrix4(rot); g.add(holder); holder.add(src);
  g.updateMatrixWorld(true);
  // Titan draws the concept's sand skirt as a thin plate under the body, wider than the body itself (the
  // large outcrop's skirt is 2.5x the rock). It would float on any slope and it steals the footprint the
  // colliders are sized from, so the plate goes: every triangle whose three corners sit in the bottom
  // 8 percent of the height is dropped (the body's own underside goes with it, nobody sees that).
  { const b0 = new THREE.Box3().setFromObject(g, true); const cut = b0.min.y + 0.12 * (b0.max.y - b0.min.y);
    const v = new THREE.Vector3();
    g.traverse((m) => {
      if (!m.isMesh) return;
      const geo = m.geometry, pos = geo.attributes.position, idx = geo.index;
      const n = idx ? idx.count : pos.count; const keep = [];
      const yOf = (i) => v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).y;
      for (let t = 0; t < n; t += 3) {
        const a = idx ? idx.getX(t) : t, b = idx ? idx.getX(t + 1) : t + 1, c = idx ? idx.getX(t + 2) : t + 2;
        if (yOf(a) > cut || yOf(b) > cut || yOf(c) > cut) keep.push(a, b, c);
      }
      const dropped = n - keep.length;
      if (dropped > 0) { geo.setIndex(keep); geo.computeBoundingBox(); geo.computeBoundingSphere(); console.info(`[glbstatic] ${name}: skirt cut, ${dropped / 3} triangles dropped`); }
    });
  }
  // footprint of the BODY (vertices above the plate line, 2 to 98 percentile), not of the bounding box: the
  // large outcrop's plate is 2.5x wider than its rock, and scaling the plate to 8 m left a 3 m rock in the game
  const box = drawnBox(g);
  let fx = 0, fz = 0;
  { const P = points(g, 2); const n = P.length / 3; const cutY = box.min.y + 0.12 * (box.max.y - box.min.y);
    const xs = [], zs = []; for (let i = 0; i < n; i++) if (P[i * 3 + 1] > cutY) { xs.push(P[i * 3]); zs.push(P[i * 3 + 2]); }
    xs.sort((a, b) => a - b); zs.sort((a, b) => a - b); const q = (arr, f) => arr[Math.floor((arr.length - 1) * f)];
    if (xs.length > 50) { fx = q(xs, 0.98) - q(xs, 0.02); fz = q(zs, 0.98) - q(zs, 0.02); } }
  const sz = box.getSize(new THREE.Vector3());
  const foot = fx > 0 ? Math.max(fx, fz) : Math.max(sz.x, sz.z);
  const k = Math.max(size[0], size[1]) / foot;   // the long side matches the TSV's long side; the rest follows uniformly
  holder.scale.setScalar(k);
  g.updateMatrixWorld(true);
  box.copy(drawnBox(g));
  const c = box.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -box.min.y - 0.05, -c.z);   // 5 cm into the sand so the skirt edge never floats
  g.updateMatrixWorld(true);
  // Titan's winding is not reliable: the large outcrop and the ridge came inside out (front faces culled, the far
  // inside showed as a small dark block); two sided costs nothing at 7 to 10k tris.
  let tris = 0; g.traverse((m) => { if (m.isMesh) { tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; m.material.side = THREE.DoubleSide; } });
  box.copy(drawnBox(g));
  console.info(`[glbstatic] ${name}: ${tris} tris, up ${up.toArray().map((v) => v.toFixed(2))}, ${box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join(' x ')} m`);
  return g;
}

export async function loadGlbStatic(name, size) {
  const file = GLB_STATIC[name];
  if (!file) return null;
  if (!cache.has(name)) cache.set(name, prototype(name, file, size));
  const proto = await cache.get(name);
  return proto.clone(true);
}
