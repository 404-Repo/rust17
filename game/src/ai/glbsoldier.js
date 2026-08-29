/**
 * Skinned soldier loader (owner: ai). Round 8: characters from Atlas image_to_3d (Titan v1) through
 * the rig_humanoid_mesh node. The GLB carries one SkinnedMesh and a 24 bone Mixamo style skeleton
 * (Hips, Spine, Spine01, Spine02, neck, Head, Left/Right Arm, ForeArm, Hand, UpLeg, Leg, Foot,
 * ToeBase) in an A pose, no motion clips.
 *
 * This makes it look like a coded soldier to ai/animation.js: root faces +Z with its left on +X,
 * base at y = 0, 1.8 m tall, userData.joints = { head, torso, upperArm*, lowerArm*, upperLeg*,
 * lowerLeg*, weaponSocket } pointing at the BONES (a Bone is an Object3D, so the rig's additive
 * Euler pose and its quaternion arm IK both apply), plus an inner "pelvis" group as children[0]
 * because the rig yaws object.children[0] with the stride. The skinned mesh must NOT be collapsed
 * (collapsePerJoint would flatten it): pass { collapse: false } to SoldierRig.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const BONE_MAP = {
  head: ['Head', 'head'], torso: ['Spine', 'Spine01', 'spine'],
  upperArmL: ['LeftArm'], lowerArmL: ['LeftForeArm'], upperArmR: ['RightArm'], lowerArmR: ['RightForeArm'],
  upperLegL: ['LeftUpLeg'], lowerLegL: ['LeftLeg'], upperLegR: ['RightUpLeg'], lowerLegR: ['RightLeg'],
};

export async function loadGlbSoldier(url, { height = 1.8, name = 'glb_soldier' } = {}) {
  const gltf = await loader.loadAsync(url);
  const src = gltf.scene;
  const bones = {};
  src.traverse((o) => { if (o.isBone || o.type === 'Bone') bones[o.name] = o; });
  const find = (names) => { for (const n of names) if (bones[n]) return bones[n]; return null; };
  let skinned = null; src.traverse((o) => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (!skinned) throw new Error(`[glbsoldier] ${url}: no SkinnedMesh`);

  // facing and handedness from the skeleton in its bind pose: left hip should end up on +X and the
  // toes ahead of the heels on +Z
  src.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  const lHip = find(['LeftUpLeg']), rHip = find(['RightUpLeg']), lFoot = find(['LeftFoot']), lToe = find(['LeftToeBase']);
  let fwd = new THREE.Vector3(0, 0, 1);
  if (lFoot && lToe) { fwd = wp(lToe).sub(wp(lFoot)); fwd.y = 0; fwd.normalize(); }
  else if (lHip && rHip) { const side = wp(lHip).sub(wp(rHip)); side.y = 0; fwd.set(-side.z, 0, side.x).normalize(); }
  const yaw = Math.atan2(fwd.x, fwd.z) + Math.PI;  // rotate by -yaw so fwd lands on +Z (the toe bone sits behind the foot pivot on this rig, hence the half turn; checked in soldierview)

  const g = new THREE.Group(); g.name = name;
  const inner = new THREE.Group(); inner.name = 'pelvis'; g.add(inner);   // the rig's children[0]
  const holder = new THREE.Group(); holder.rotation.y = -yaw; inner.add(holder);
  holder.add(src);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g, true);
  const k = height / (box.max.y - box.min.y);
  holder.scale.setScalar(k);
  g.updateMatrixWorld(true);
  box.setFromObject(g, true);
  const c = box.getCenter(new THREE.Vector3());
  holder.position.set(-c.x * 1, -box.min.y, -c.z * 1);
  g.updateMatrixWorld(true);

  // the rigger's Left/Right are the viewer's, not the character's: after facing +Z the bone named
  // LeftUpLeg sits on -X. The contract wants the character's left on +X, so the map is mirrored then.
  const mirrored = !!(lHip && rHip && wp(lHip).x < wp(rHip).x);
  const side = (n) => (mirrored ? n.replace(/^Left/, '__R').replace(/^Right/, 'Left').replace(/^__R/, 'Right') : n);
  const joints = {};
  for (const [j, names] of Object.entries(BONE_MAP)) { const b = find(names.map(side)); if (b) joints[j] = b; else console.warn(`[glbsoldier] ${name}: no bone for ${j} (${names.join('/')})`); }
  const hand = find([side('RightHand')]);
  if (hand) { const s = new THREE.Object3D(); s.name = 'weaponSocket'; hand.add(s); joints.weaponSocket = s; }
  g.userData.joints = joints;
  g.userData.skinned = true;
  g.userData.glb = true;
  skinned.frustumCulled = false;
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  let tris = 0; g.traverse((m) => { if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  g.userData.tris = tris;
  console.log(`[glbsoldier] ${name}: ${tris} tris, ${Object.keys(bones).length} bones, yaw ${(yaw * 180 / Math.PI).toFixed(0)} deg, scale ${k.toFixed(3)}, mirrored ${mirrored}, joints ${Object.keys(joints).join(',')}`);
  return g;
}
