/**
 * GLB weapon loader (owner: player). Round 8: hero meshes from Atlas image_to_3d (Titan v1 / 404-GEN).
 *
 * A generated GLB arrives normalised to a unit box in an arbitrary orientation with no sockets.
 * This makes it look like a coded weapon asset to viewmodel.js: +Z is the muzzle, +Y up, base at
 * y = 0, centred on x and z, real length in metres, and userData.sockets {muzzle, gripR, gripL,
 * mag, sight} placed by the same proportions the coded assault_rifle carries (measured with
 * tools/glbprobe.mjs: muzzle 0.69 H at +L/2, gripR 0.52 H at -0.18 L, gripL 0.41 H at +0.18 L,
 * mag 0.68 H at -0.07 L, sight 0.93 H at -0.11 L).
 *
 * Orientation is found from the geometry, not typed in: the principal axis of the vertex cloud is
 * the barrel line; the thinner end is the muzzle; the side the mass hangs from (mag and grip) is
 * down. The textures stay as generated, so materials.js must NOT be applied to these.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);


function samplePoints(root, step = 5) {
  const pts = []; const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); }
  });
  return pts;
}

/** Largest eigenvector of the 3x3 covariance by power iteration. */
function principalAxis(pts, mean) {
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0; const n = pts.length / 3;
  for (let i = 0; i < pts.length; i += 3) {
    const x = pts[i] - mean.x, y = pts[i + 1] - mean.y, z = pts[i + 2] - mean.z;
    xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z;
  }
  const C = [xx / n, xy / n, xz / n, xy / n, yy / n, yz / n, xz / n, yz / n, zz / n];
  let v = new THREE.Vector3(1, 0.3, 0.2).normalize();
  for (let k = 0; k < 60; k++) {
    v.set(C[0] * v.x + C[1] * v.y + C[2] * v.z, C[3] * v.x + C[4] * v.y + C[5] * v.z, C[6] * v.x + C[7] * v.y + C[8] * v.z).normalize();
  }
  return v;
}

/** Direction of greatest extent, measured between the 0.5 and 99.5 percentiles of the projection so a
 *  stray fragment (Titan left the foregrip floating) cannot steer it. `avoid` = a direction to stay
 *  perpendicular to (the second pass finds the height axis at right angles to the barrel). */
function extentAxis(pts, avoid) {
  const n = pts.length / 3; const proj = new Float32Array(n);
  let best = -1, bestDir = new THREE.Vector3(1, 0, 0);
  const N = 600, dir = new THREE.Vector3();
  for (let k = 0; k < N; k++) {
    // Fibonacci sphere, then flatten onto the plane perpendicular to `avoid` when given
    const y = 1 - (k / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = k * 2.399963;
    dir.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    if (avoid) { dir.addScaledVector(avoid, -dir.dot(avoid)); if (dir.lengthSq() < 1e-6) continue; dir.normalize(); }
    for (let i = 0; i < n; i++) proj[i] = pts[i * 3] * dir.x + pts[i * 3 + 1] * dir.y + pts[i * 3 + 2] * dir.z;
    const sorted = Float32Array.from(proj).sort();
    const ext = sorted[Math.floor(n * 0.995)] - sorted[Math.floor(n * 0.005)];
    if (ext > best) { best = ext; bestDir = dir.clone(); }
  }
  return bestDir;
}

export async function loadGlbWeapon(url, { length = 0.9, name = 'glb_weapon', flipUp = false, flipFwd = false } = {}) {
  const gltf = await loader.loadAsync(url);
  const src = gltf.scene;
  const pts = samplePoints(src);
  const n = pts.length / 3;
  const mean = new THREE.Vector3();
  for (let i = 0; i < pts.length; i += 3) mean.x += pts[i], mean.y += pts[i + 1], mean.z += pts[i + 2];
  mean.divideScalar(n);
  // the barrel line: the cloud's diameter (muzzle tip to stock end), not the PCA axis, which on a
  // compact carbine tilts toward the magazine and grip and reports the rifle 60 percent as tall as long
  const axis = extentAxis(pts, null);

  // muzzle end = the end whose cross section is thinnest (mean distance from the axis over the last 15 percent)
  const t = new Float32Array(n), r = new Float32Array(n); let tMin = Infinity, tMax = -Infinity;
  const d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    d.set(pts[i * 3] - mean.x, pts[i * 3 + 1] - mean.y, pts[i * 3 + 2] - mean.z);
    const s = d.dot(axis); t[i] = s; r[i] = Math.sqrt(Math.max(0, d.lengthSq() - s * s));
    if (s < tMin) tMin = s; if (s > tMax) tMax = s;
  }
  // muzzle end: the mass that hangs off the barrel line (magazine, pistol grip, stock) sits BEHIND the
  // centre on every rifle, so forward is the direction away from where the far-from-axis points lie.
  // (The thinnest-end test failed on the M4: a collapsed stock is as thin as the barrel.)
  const L = tMax - tMin;
  let rMax = 0; for (let i = 0; i < n; i++) if (r[i] > rMax) rMax = r[i];
  let wSum = 0, tHang = 0;
  for (let i = 0; i < n; i++) if (r[i] > 0.5 * rMax) { const w = r[i] * r[i]; wSum += w; tHang += w * t[i]; }
  tHang = wSum > 0 ? tHang / wSum : 0;
  let fwd = tHang < 0 ? axis.clone() : axis.clone().negate();
  console.log(`[glbweapon] orient: L ${L.toFixed(3)} tHang ${(tHang / L).toFixed(3)} rMax ${rMax.toFixed(3)} hangW ${wSum.toFixed(2)}`);
  if (flipFwd) fwd.negate();

  // height axis: the greatest extent at right angles to the barrel (sight top to magazine bottom);
  // its sign comes from where the mass hangs (magazine, grip): that side is down
  const hAxis = extentAxis(pts, fwd);
  const off = new THREE.Vector3(); let hangSum = 0;
  for (let i = 0; i < n; i++) {
    off.set(pts[i * 3] - mean.x, pts[i * 3 + 1] - mean.y, pts[i * 3 + 2] - mean.z);
    const h = off.dot(hAxis); hangSum += h * Math.abs(h);
  }
  const hang = hangSum > 0 ? hAxis.clone() : hAxis.clone().negate();
  let up = hang.clone().negate();
  if (flipUp) up.negate();
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
  up.crossVectors(fwd, right).normalize();
  // basis (right, up, fwd) -> (X, Y, Z)
  const basis = new THREE.Matrix4().makeBasis(right, up, fwd);
  const rot = new THREE.Matrix4().copy(basis).invert();

  const g = new THREE.Group(); g.name = name;
  const holder = new THREE.Group(); holder.applyMatrix4(rot); g.add(holder);
  holder.add(src);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g, true);
  const size = box.getSize(new THREE.Vector3());
  const k = length / size.z;
  holder.scale.multiplyScalar(k);
  holder.updateMatrixWorld(true);
  box.setFromObject(g, true);
  const c = box.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -box.min.y, -c.z);
  holder.updateMatrixWorld(true);
  box.setFromObject(g, true);
  const H = box.max.y, Lz = box.max.z - box.min.z;

  // sockets found on the oriented mesh: the pistol grip is the lowest cluster behind the magazine, the
  // magazine the lowest cluster around the centre, the foregrip the lowest cluster ahead of it, the
  // sight the highest cluster over the receiver, the muzzle the mean of the last 2 percent in z.
  const P = samplePoints(g, 3);
  const nP = P.length / 3;
  const zs = [], ys = [], xs = [];
  for (let i = 0; i < nP; i++) { xs.push(P[i * 3]); ys.push(P[i * 3 + 1]); zs.push(P[i * 3 + 2]); }
  const zMin = box.min.z, zMax = box.max.z;
  const slab = (z0, z1) => { const idx = []; for (let i = 0; i < nP; i++) if (zs[i] >= zMin + z0 * Lz && zs[i] <= zMin + z1 * Lz) idx.push(i); return idx; };
  const lowest = (idx, frac) => { idx.sort((i, j) => ys[i] - ys[j]); return idx.slice(0, Math.max(3, Math.floor(idx.length * frac))); };
  const highest = (idx, frac) => { idx.sort((i, j) => ys[j] - ys[i]); return idx.slice(0, Math.max(3, Math.floor(idx.length * frac))); };
  const meanOf = (idx) => { const m = new THREE.Vector3(); for (const i of idx) m.add(new THREE.Vector3(xs[i], ys[i], zs[i])); return m.divideScalar(Math.max(1, idx.length)); };
  // barrel line height: the median y of the front third (barrel and handguard), the reference every socket hangs from
  const front = slab(0.6, 0.95); front.sort((i, j) => ys[i] - ys[j]); const barrelY = ys[front[Math.floor(front.length / 2)]] || H * 0.7;
  const grip = meanOf(lowest(slab(0.22, 0.42), 0.08));     // pistol grip bottom (z 0.22 to 0.42 of the length from the stock end)
  const mag = meanOf(lowest(slab(0.42, 0.56), 0.05));      // magazine bottom
  const fore = meanOf(lowest(slab(0.6, 0.8), 0.08));       // foregrip or handguard underside
  const sight = meanOf(highest(slab(0.3, 0.55), 0.04));    // optic top
  const muz = meanOf(slab(0.98, 1.0));
  const S = {
    muzzle: [muz.x, muz.y, zMax],
    gripR: [0, Math.min(barrelY - 0.04, grip.y + 0.06), grip.z],       // hand wraps the grip a little above its bottom
    gripL: [0, Math.min(barrelY - 0.02, fore.y + 0.03), fore.z],
    mag: [0, barrelY - 0.03, mag.z],
    sight: [0, sight.y - 0.018, sight.z],                             // the optic window centre, just under the hood top
  };
  g.userData.sockets = {};
  for (const [nm, p] of Object.entries(S)) { const o = new THREE.Object3D(); o.name = 'socket_' + nm; o.position.set(p[0], p[1], p[2]); g.add(o); g.userData.sockets[nm] = o; }
  console.log(`[glbweapon] sockets: barrelY ${barrelY.toFixed(3)} ` + Object.entries(S).map(([k, p]) => `${k} ${p.map((v) => v.toFixed(3)).join(',')}`).join('  '));
  g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; if (m.material) { m.material.side = THREE.FrontSide; } } });
  g.userData.glb = true;
  g.userData.tris = 0; g.traverse((m) => { if (m.isMesh) g.userData.tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  console.log(`[glbweapon] ${name}: ${g.userData.tris} tris, axis ${axis.toArray().map((v) => v.toFixed(2))}, size ${size.toArray().map((v) => v.toFixed(3))} -> H ${H.toFixed(3)} L ${Lz.toFixed(3)}`);
  return g;
}
