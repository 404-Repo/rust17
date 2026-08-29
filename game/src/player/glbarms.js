/**
 * Generated viewmodel arms (owner: player). Ben 2026-08-29 12:08: "I don't like the hand in the foreground
 * holding the gun what if we generate this with atlas using the titan model with low poly settings don't
 * remesh?" then "I meant just the arm not the gun". So: one Titan v1 mesh per arm (concepts/vm_arm_right.png,
 * vm_arm_left.png, Basic geometry, 25k face limit, 4k texture, no remesh) placed by hand around the CODED
 * rifle. The arms are rigid (no joints): sway, bob, recoil and ADS come from the holder as before; the reload
 * hand motion and the left hand IK do not apply. '?arms=titan' switches them on (viewmodel.js).
 *
 * A generated arm arrives normalised to a unit box in an arbitrary orientation. Here the long axis (elbow to
 * fingertips, the percentile extent) goes to +Z, the flat elbow cap decides which end is the elbow (the cap is
 * a disc: its end has the widest cross section within the last 6 percent), the roll about the axis is a
 * per arm constant tuned by eye (ARMS table in viewmodel.js), and the length is scaled to metres.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function samplePoints(root, step = 3) {
  const pts = []; const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position, idx = m.geometry.index; const n = idx ? idx.count : p.count;
    for (let i = 0; i < n; i += step) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); }
  });
  return pts;
}
function extentAxis(pts) {
  const n = pts.length / 3; const proj = new Float32Array(n);
  let best = -1, bestDir = new THREE.Vector3(0, 0, 1); const N = 500, dir = new THREE.Vector3();
  for (let k = 0; k < N; k++) {
    const y = 1 - (k / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = k * 2.399963;
    dir.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    for (let i = 0; i < n; i++) proj[i] = pts[i * 3] * dir.x + pts[i * 3 + 1] * dir.y + pts[i * 3 + 2] * dir.z;
    const s = Float32Array.from(proj).sort(); const ext = s[Math.floor(n * 0.995)] - s[Math.floor(n * 0.005)];
    if (ext > best) { best = ext; bestDir = dir.clone(); }
  }
  return bestDir;
}

export async function loadGlbArm(url, { length = 0.42, name = 'arm', flip = false, roll = 0 } = {}) {
  const gltf = await loader.loadAsync(url);
  const src = gltf.scene;
  const pts = samplePoints(src); const n = pts.length / 3;
  const mean = new THREE.Vector3(); for (let i = 0; i < n; i++) mean.x += pts[i * 3], mean.y += pts[i * 3 + 1], mean.z += pts[i * 3 + 2]; mean.divideScalar(n);
  const axis = extentAxis(pts);
  // which end is the elbow: the cap disc makes that end's cross section the widest in its last 6 percent
  const t = new Float32Array(n), r = new Float32Array(n); let tMin = Infinity, tMax = -Infinity; const d = new THREE.Vector3();
  for (let i = 0; i < n; i++) { d.set(pts[i * 3] - mean.x, pts[i * 3 + 1] - mean.y, pts[i * 3 + 2] - mean.z); const s = d.dot(axis); t[i] = s; r[i] = Math.sqrt(Math.max(0, d.lengthSq() - s * s)); if (s < tMin) tMin = s; if (s > tMax) tMax = s; }
  const L = tMax - tMin; let rA = 0, nA = 0, rB = 0, nB = 0;
  for (let i = 0; i < n; i++) { if (t[i] < tMin + 0.06 * L) { rA += r[i]; nA++; } else if (t[i] > tMax - 0.06 * L) { rB += r[i]; nB++; } }
  rA /= Math.max(1, nA); rB /= Math.max(1, nB);
  // fingers go +Z: the elbow (wider end) goes to -Z
  let fwd = rA > rB ? axis.clone() : axis.clone().negate();
  if (flip) fwd.negate();
  const helper = Math.abs(fwd.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const xa = new THREE.Vector3().crossVectors(helper, fwd).normalize();
  const ya = new THREE.Vector3().crossVectors(fwd, xa).normalize();
  const rot = new THREE.Matrix4().makeBasis(xa, ya, fwd).invert();
  const g = new THREE.Group(); g.name = name;
  const holder = new THREE.Group(); holder.applyMatrix4(rot); holder.rotateZ(roll); g.add(holder); holder.add(src);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g, true);
  const k = length / (box.max.z - box.min.z);
  holder.scale.multiplyScalar(k); holder.updateMatrixWorld(true); box.setFromObject(g, true);
  // origin at the fingertip end on the axis, so a placement position is where the hand is
  const c = box.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -c.y, -box.max.z);
  g.updateMatrixWorld(true);
  let tris = 0, dotSum = 0, dotN = 0;
  g.traverse((m) => {
    if (!m.isMesh) return;
    tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
    // Titan's normals can point inward (the arms rendered near black under the sun); measure them against the
    // outward direction from the mesh centre and rebuild them from the winding when they disagree
    const geo = m.geometry, pos = geo.attributes.position, nrm = geo.attributes.normal;
    if (nrm) {
      geo.computeBoundingBox(); const cc = geo.boundingBox.getCenter(new THREE.Vector3());
      for (let i = 0; i < pos.count; i += 9) { const px = pos.getX(i) - cc.x, py = pos.getY(i) - cc.y, pz = pos.getZ(i) - cc.z; dotSum += (px * nrm.getX(i) + py * nrm.getY(i) + pz * nrm.getZ(i)) / (Math.hypot(px, py, pz) || 1); dotN++; }
      // a mean near zero means the shipped normals are not outward at all (both arms measured -0.01 and rendered
      // as flat grey silhouettes under the sun); rebuild from the winding whenever they are not clearly outward
      // meshopt ships normals as normalized Int8; computeVertexNormals writing floats into that array made NaNs and
      // a black frame (the bloom downsample spreads one NaN over the screen), so the attribute is replaced first
      if (dotN && dotSum / dotN < 0.3) { geo.deleteAttribute('normal'); geo.computeVertexNormals(); console.log(`[glbarms] ${name}: normals not outward (mean ${(dotSum / dotN).toFixed(2)}), rebuilt from the winding`); }
    }
    m.material.side = THREE.DoubleSide;
    // cloth and leather are not metal: Titan's metalness map made both arms render near black under the sun
    { const mt = m.material; console.log(`[glbarms] ${name} material: type ${mt.type} map ${!!mt.map} ${mt.map ? mt.map.colorSpace : ''} color ${mt.color ? mt.color.getHexString() : '-'} emissive ${mt.emissive ? mt.emissive.getHexString() : '-'} vc ${mt.vertexColors} transparent ${mt.transparent} opacity ${mt.opacity} rough ${mt.roughness} metal ${mt.metalness} normalMap ${!!mt.normalMap} ao ${!!mt.aoMap}`); }
    // a fresh standard material with only the baked colour map: whatever else Titan's GLTF material carried
    // (metalness 1, extension props) rendered the arms as an unlit grey silhouette even facing the sun
    let kind = 'standard', noShadow = false;
    try { const q = new URLSearchParams(location.search); kind = q.get('armsmat') || 'standard'; noShadow = q.get('armsshadow') === '0'; } catch (e) { /* no location */ }
    { const old = m.material; const opts = { map: old.map || null, color: 0xffffff, side: THREE.DoubleSide };
      const fresh = kind === 'basic' ? new THREE.MeshBasicMaterial(opts) : kind === 'lambert' ? new THREE.MeshLambertMaterial(opts) : kind === 'nomap' ? new THREE.MeshStandardMaterial({ color: 0xc0a080, roughness: 0.85, metalness: 0, side: THREE.FrontSide }) : new THREE.MeshStandardMaterial({ ...opts, roughness: 0.85, metalness: 0 });
      fresh.name = 'titan_arm'; m.userData.noShadow = noShadow;
      // fill: the coded viewmodel gets a dust film and a hemisphere lift from the rig that a plain material lacks, so
      // the baked map is also fed back as a weak emissive ('?armsfill=' scales it, default 0.3)
      try { const f = new URLSearchParams(location.search).get('armsfill'); const k = f === null ? 0.3 : +f; if (k > 0 && fresh.isMeshStandardMaterial && fresh.map) { fresh.emissiveMap = fresh.map; fresh.emissive = new THREE.Color(0xffffff); fresh.emissiveIntensity = k; } } catch (e) { /* no location */ }
      try { if (new URLSearchParams(location.search).get('armsfog') === '0') fresh.fog = false; } catch (e) { /* no location */ } if (fresh.map) { fresh.map.colorSpace = THREE.SRGBColorSpace; fresh.map.anisotropy = 4; fresh.map.needsUpdate = true; } m.material = fresh; }
  });
  g.userData.tris = tris; g.userData.glb = true;
  console.log(`[glbarms] ${name}: ${tris} tris, axis ${axis.toArray().map((v) => v.toFixed(2))}, capA ${rA.toFixed(3)} capB ${rB.toFixed(3)}, ${box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(' x ')} m`);
  return g;
}
