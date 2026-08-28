/**
 * Keyed pose animation for the soldiers (owner: ai). Round 1 rewrite after the owner played
 * round 0: "the characters look quite bad, and the way they run looks worse than the reference."
 *
 * The round 0 rig was a sine wave per joint. This one is a keyframe system:
 *
 *   - POSTURES are joint angle sets, one per state (idle low ready, walk, run, sprint lean, aim
 *     shouldered with the head on the sight, crouch, strafe). A state change blends the whole
 *     posture from where it is to the new set over 0.1 to 0.25 s with a smoothstep.
 *   - CYCLES are rings of keys (8 per stride pair) for one leg; the other leg samples the same
 *     ring half a cycle later. Keys are read through a cyclic Catmull-Rom spline so every limb
 *     eases into and out of each key. Walk, run, crouch walk, strafe and the turn-in-place
 *     shuffle are separate rings and are mixed by the actual velocity, not by the state.
 *   - The cycle phase advances by DISTANCE (one turn per stride pair), so the planted foot does
 *     not slide: stride = 0.55 + 0.16 * speed, clamped to [0.6, 1.5] m, which is 0.75 m at a
 *     1.4 m/s walk and 1.4 m at the bots' 5.4 m/s run. A turn in place advances the ring by the
 *     yaw swept times the hip radius (the feet shuffle round). Backward travel runs it in reverse.
 *   - The pelvis (the asset's inner root) yaws toward the leading leg and the torso counter
 *     rotates against it; the head cancels both so it stays on the aim. Root height comes from a
 *     lift ring that dips on the foot plant and peaks in the flight phase of a run.
 *   - Arms: the weapon hand and the barrel direction are part of every posture (that is what an
 *     animator keys on a two handed rifle), solved onto the right arm by a two bone analytic IK
 *     from measured limb lengths, so the rig is correct whatever rest pose a candidate asset
 *     ships in. The weapon socket is oriented absolutely to the barrel direction and the LEFT
 *     hand is solved by the same two bone IK onto the weapon's gripL socket (the handguard),
 *     or onto a virtual handguard 0.3 m up the barrel when no weapon is attached. Both hands
 *     stay on the rifle in every live state. fire() adds a recoil kick.
 *   - Hit is a 0.35 s flinch overlay. Death is three keys over 0.6 s (knees buckle, body goes
 *     over, lands) plus a settle key at 0.85 s, then holds. No physics.
 *
 * Joint contract (assets/enemy_soldier.js, docs/OBJECTS.tsv): userData.joints = head, torso,
 * upperArmL/R, lowerArmL/R, upperLegL/R, lowerLegL/R, weaponSocket; pivots at the joints; the
 * figure faces +Z and its left is +X. Legs are assumed to hang -Y at rest: a NEGATIVE rotation.x
 * swings a hanging limb forward, so "thigh forward" is applied as -angle and knee flexion as
 * +angle (userData.jointHints = { hipForward, kneeFlex } overrides the signs). Abduction is
 * rotation.z, positive toward +X for either leg.
 *
 * The rig also collapses the loaded instance to one mesh per surface PER JOINT (collapsePerJoint,
 * used by level/build.js and player/viewmodel.js too), so a soldier is about twenty draws and
 * every limb still moves.
 *
 * Public surface used by bot.js / telemetry.js: constructor(object), attachWeapon(weapon),
 * muzzleWorld(out), setState(name, blend), reset(), update(dt, { speed, aimPitch, crouch,
 * moving, lateral, backward }), hitboxes(), jointAngles(), deathDir, headshot, fire().
 * debugPose(name, t, opts) puts the rig into a named state at t seconds for a test page.
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const JOINT_NAMES = ['head', 'torso', 'upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'upperLegL', 'lowerLegL', 'upperLegR', 'lowerLegR', 'weaponSocket'];
const STATES = ['idle', 'walk', 'run', 'sprint', 'aim', 'crouch', 'strafe', 'hit', 'death'];
const D2R = Math.PI / 180;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoothRange = (v, a, b) => smooth((v - a) / (b - a));

// ------------------------------------------------------------------ pose fields
// tx ty tz: torso pitch (+ forward), yaw, roll.  hx hy hz: head.  lfL lfR: thigh forward.
// abL abR: thigh out to its own side.  knL knR: knee bend.  lift: root height.  py pz: pelvis yaw, roll.
// wx wy wz: weapon hand in figure space (x already on the weapon side).  fx fy fz: barrel direction.
const FIELDS = ['tx', 'ty', 'tz', 'hx', 'hy', 'hz', 'lfL', 'abL', 'knL', 'lfR', 'abR', 'knR', 'lift', 'py', 'pz', 'wx', 'wy', 'wz', 'fx', 'fy', 'fz'];
const blank = () => { const o = {}; for (const f of FIELDS) o[f] = 0; return o; };
const copyPose = (dst, src) => { for (const f of FIELDS) dst[f] = src[f]; return dst; };
const lerpPose = (dst, a, b, k) => { for (const f of FIELDS) dst[f] = a[f] + (b[f] - a[f]) * k; return dst; };

// ------------------------------------------------------------------ cycle rings
// 8 uniform keys per stride pair for ONE leg: [thigh forward deg, knee bend deg, abduction deg].
// The other leg reads the same ring at u + 0.5. `lift` rings are per half cycle (both feet).
const RUN = {
  stride: 1.4,
  leg: [[40, 16, 0], [15, 42, 0], [-8, 25, 0], [-31, 18, 0], [-33, 56, 0], [-12, 110, 0], [20, 104, 0], [46, 52, 0]],
  //      contact     absorb      mid stance   push off     toe off      heel up      knee drive   knee high
  lift: [0.0, -0.045, -0.015, 0.045, 0.0, -0.045, -0.015, 0.045],
  pelvisYaw: 9, torsoCounter: 1.5, torsoRoll: 2.5, handBob: 1.0,
};
const WALK = {
  stride: 0.75,
  leg: [[22, 5, 0], [15, 14, 0], [2, 8, 0], [-14, 10, 0], [-21, 30, 0], [-12, 58, 0], [5, 54, 0], [17, 26, 0]],
  //      heel strike  loading    mid stance   push         toe off      swing        through      reaching
  lift: [-0.012, -0.004, 0.014, 0.004, -0.012, -0.004, 0.014, 0.004],
  pelvisYaw: 5, torsoCounter: 1.4, torsoRoll: 1.5, handBob: 0.5,
};
// strafe: the LEAD leg (the one on the side of travel). abduction is toward the direction of travel.
const STRAFE = {
  stride: 0.6,
  leg: [[0, 6, 22], [0, 8, 16], [0, 10, 8], [1, 14, 2], [2, 16, -2], [8, 40, 6], [6, 36, 16], [2, 16, 22]],
  //      reach        over        over         closing      closed      lift+reach   reaching     landing
  lift: [0.0, 0.006, 0.01, 0.004, -0.008, 0.012, 0.016, 0.006],
  pelvisYaw: 3, torsoCounter: 1.0, torsoRoll: 3.0, handBob: 0.35,
};

function ringSample(ring, u, col) {
  const n = ring.length;
  u -= Math.floor(u);
  const x = u * n, i = Math.floor(x), t = x - i;
  const g = (k) => { const v = ring[((k % n) + n) % n]; return col === undefined ? v : v[col]; };
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
  // Catmull-Rom: C1 through every key, so the limb eases through each pose instead of hitting it
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

// ------------------------------------------------------------------ material collapse (unchanged contract)
function materialKey(m) {
  if (!m) return 'none';
  const t = (x) => (x ? x.uuid : '-');
  return [m.type, m.color?.getHexString?.(), m.roughness, m.metalness, m.transparent, m.opacity, m.side,
    m.emissive?.getHexString?.(), m.vertexColors, t(m.map), t(m.roughnessMap), t(m.normalMap)].join('|');
}
/** Materials that differ only in colour share a bucket; the colour goes into a vertex attribute. */
function surfaceKey(m) {
  if (!m) return 'none';
  const t = (x) => (x ? x.uuid : '-');
  const r = (v) => (typeof v === 'number' ? Math.round(v * 5) / 5 : v);
  return [m.type, r(m.roughness), r(m.metalness), m.transparent, m.opacity, m.side, m.emissive?.getHexString?.(),
    t(m.map), t(m.roughnessMap), t(m.normalMap), m.flatShading].join('|');
}
function bakeColorAttribute(g, color) {
  const n = g.attributes.position.count;
  const old = g.attributes.color;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = old ? old.getX(i) : 1, l = old ? old.getY(i) : 1, m = old ? old.getZ(i) : 1;
    arr[i * 3] = color.r * k; arr[i * 3 + 1] = color.g * l; arr[i * 3 + 2] = color.b * m;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
/** One mesh per surface per joint (colour baked to vertices). Joints keep their transforms; nothing stops moving. */
export function collapsePerJoint(root, keepNodes = [], opts = {}) {
  const bake = opts.bakeColors !== false;
  const keep = new Set([root]);
  for (const n of keepNodes) if (n && n.isObject3D) keep.add(n);
  root.updateMatrixWorld(true);
  const owner = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || Array.isArray(o.material)) return;
    let p = o.parent, host = root;
    while (p) { if (keep.has(p)) { host = p; break; } p = p.parent; }
    if (!owner.has(host)) owner.set(host, []);
    owner.get(host).push(o);
  });
  const inv = new THREE.Matrix4(), im = new THREE.Matrix4();
  const sharedMats = new Map();
  let before = 0, after = 0;
  for (const [host, meshes] of owner) {
    before += meshes.length;
    inv.copy(host.matrixWorld).invert();
    const buckets = new Map();
    for (const m of meshes) {
      const sig = Object.keys(m.geometry.attributes).filter((n) => n !== 'color').sort().join(',');
      const k = (bake ? surfaceKey(m.material) : materialKey(m.material)) + '#' + sig;
      if (!buckets.has(k)) buckets.set(k, { mat: m.material, geos: [], mats: new Set() });
      const b = buckets.get(k);
      b.mats.add(m.material);
      const col = m.material && m.material.color ? m.material.color : new THREE.Color(1, 1, 1);
      if (m.isInstancedMesh) {
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, im);
          const gi = m.geometry.clone();
          gi.applyMatrix4(im); gi.applyMatrix4(m.matrixWorld); gi.applyMatrix4(inv);
          if (bake) bakeColorAttribute(gi, col);
          b.geos.push(gi);
        }
        continue;
      }
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld); g.applyMatrix4(inv);
      if (bake) bakeColorAttribute(g, col);
      b.geos.push(g);
    }
    for (const m of meshes) m.parent && m.parent.remove(m);
    for (const b of buckets.values()) {
      if (bake) {
        const key = surfaceKey(b.mat);
        if (!sharedMats.has(key)) { const mm = b.mat.clone(); mm.color = new THREE.Color(1, 1, 1); mm.vertexColors = true; sharedMats.set(key, mm); }
        b.mat = sharedMats.get(key);
      }
    }
    for (const { mat, geos } of buckets.values()) {
      let geo = geos.length === 1 ? geos[0] : null;
      if (!geo) {
        const plain = geos.map((g) => (g.index ? g.toNonIndexed() : g));
        let common = null;
        for (const g of plain) { const names = new Set(Object.keys(g.attributes)); common = common ? new Set([...common].filter((n) => names.has(n))) : names; }
        for (const g of plain) { for (const n of Object.keys(g.attributes)) if (!common.has(n)) g.deleteAttribute(n); g.morphAttributes = {}; g.clearGroups(); }
        try { geo = BufferGeometryUtils.mergeGeometries(plain, false); } catch (e) { geo = null; }
      }
      if (!geo) { for (const g of geos) { const mm = new THREE.Mesh(g, mat); mm.castShadow = mm.receiveShadow = true; host.add(mm); after++; } continue; }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      host.add(mesh); after++;
    }
  }
  root.updateMatrixWorld(true);
  return { before, after };
}

// ------------------------------------------------------------------ hitbox specs
function readBox(spec, fallbackSize, fallbackCenter) {
  const size = new THREE.Vector3().fromArray(fallbackSize);
  const center = new THREE.Vector3().fromArray(fallbackCenter);
  if (!spec) return { size, center, given: false };
  if (spec.isObject3D) {
    const sz = spec.userData && spec.userData.size;
    if (Array.isArray(sz) && sz.length >= 3) size.fromArray(sz);
    return { size, center: new THREE.Vector3(0, 0, 0), given: false, node: spec };
  }
  const arr = (a) => (Array.isArray(a) && a.length >= 3 ? a : (a && a.isVector3 ? [a.x, a.y, a.z] : null));
  if (Array.isArray(spec)) { const s = arr(spec); if (s) size.fromArray(s); return { size, center, given: false }; }
  if (typeof spec === 'object') {
    const s = arr(spec.size) || arr(spec.dims) || (spec.w !== undefined ? [spec.w, spec.h, spec.d] : (spec.width !== undefined ? [spec.width, spec.height, spec.depth] : null));
    if (s) size.fromArray(s);
    const c = arr(spec.center) || arr(spec.centre) || arr(spec.offset) || arr(spec.pos);
    if (c) { center.fromArray(c); return { size, center, given: true }; }
  }
  return { size, center, given: false };
}

const _m0 = new THREE.Matrix4(), _m1 = new THREE.Matrix4();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
/** Rotation (world) that maps local frame (f0, s0) onto (f1, s1). */
function frameRotation(f0, s0, f1, s1, out) {
  const b0s = _a.copy(s0).addScaledVector(f0, -s0.dot(f0)).normalize();
  const b0u = _b.crossVectors(f0, b0s);
  _m0.makeBasis(f0, b0s, b0u);
  const b1s = _c.copy(s1).addScaledVector(f1, -s1.dot(f1)).normalize();
  const b1u = new THREE.Vector3().crossVectors(f1, b1s);
  _m1.makeBasis(f1, b1s, b1u);
  _m0.transpose();
  _m1.multiply(_m0);
  return out.setFromRotationMatrix(_m1);
}

// ------------------------------------------------------------------ death keys (absolute, animator units)
// Fields not listed hold the value of the previous key. Legs in radians here. `tilt` is the whole body
// going over along deathDir; `settle` is the small bounce after landing.
const DEATH_KEYS = [
  { t: 0.18, tilt: 0.18, raise: 0.0, tx: 0.38, ty: 0.0, tz: 0.08, hx: 0.35, hy: 0, hz: 0.15, lfL: 0.45, knL: 1.0, lfR: 0.3, knR: 0.7, abL: 0.05, abR: 0.05, lift: -0.16, wx: 0.30, wy: 0.85, wz: 0.32, fx: 0.15, fy: -0.75, fz: 0.6 },
  { t: 0.40, tilt: 1.05, raise: 0.06, tx: 0.20, ty: 0.25, tz: 0.15, hx: 0.15, hy: 0.15, hz: 0.25, lfL: 0.55, knL: 1.25, lfR: 0.15, knR: 0.45, abL: 0.10, abR: 0.02, lift: -0.22, wx: 0.55, wy: 0.75, wz: 0.20, fx: 0.55, fy: -0.6, fz: 0.45 },
  { t: 0.60, tilt: 1.62, raise: 0.16, tx: -0.10, ty: 0.35, tz: 0.10, hx: -0.25, hy: 0.30, hz: 0.35, lfL: 0.55, knL: 1.35, lfR: 0.08, knR: 0.35, abL: 0.16, abR: 0.02, lift: -0.10, wx: 0.62, wy: 0.62, wz: 0.10, fx: 0.7, fy: -0.5, fz: 0.4 },
  { t: 0.85, tilt: 1.52, raise: 0.14, tx: -0.14, ty: 0.38, tz: 0.12, hx: -0.30, hy: 0.32, hz: 0.38, lfL: 0.50, knL: 1.30, lfR: 0.05, knR: 0.30, abL: 0.18, abR: 0.03, lift: -0.07, wx: 0.64, wy: 0.58, wz: 0.08, fx: 0.72, fy: -0.48, fz: 0.4 },
];

export class SoldierRig {
  constructor(object, opts = {}) {
    this.object = object;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._t = new THREE.Vector3();
    this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._e = new THREE.Euler();
    this.joints = {};
    const j = (object && object.userData && object.userData.joints) || {};
    for (const n of JOINT_NAMES) if (j[n] && j[n].isObject3D) this.joints[n] = j[n];
    this.articulated = !!(this.joints.upperLegL && this.joints.upperLegR && this.joints.upperArmR);
    if (object && !this.articulated) console.warn('[rig] soldier has no joints (merged asset or missing declarations); it will not animate');
    this.meshCount = 0;
    this.slung = object && object.userData && object.userData.slungRifle && object.userData.slungRifle.isObject3D ? object.userData.slungRifle : null;
    if (object && opts.collapse !== false) this.meshCount = collapsePerJoint(object, [...Object.values(this.joints), this.slung].filter(Boolean)).after;
    if (object) object.rotation.order = 'YXZ';
    const hints = (object && object.userData && object.userData.jointHints) || {};
    this.sign = {
      hip: hints.hipForward !== undefined ? Math.sign(hints.hipForward) || -1 : -1,
      knee: hints.kneeFlex !== undefined ? Math.sign(hints.kneeFlex) || 1 : 1,
    };
    this.rest = {};
    for (const [n, node] of Object.entries(this.joints)) this.rest[n] = { rot: node.rotation.clone(), quat: node.quaternion.clone(), pos: node.position.clone() };
    this.inner = object ? object.children[0] : null;
    if (this.inner) { this.inner.rotation.order = 'YXZ'; this.restInner = { pos: this.inner.position.clone(), rot: this.inner.rotation.clone() }; }

    // hitbox specs in joint local space
    const hb = (object && object.userData && object.userData.hitboxes) || null;
    const head = readBox(hb && hb.head, [0.26, 0.28, 0.26], [0, 0.14, 0.02]);
    const body = readBox(hb && hb.body, [0.46, 0.62, 0.32], [0, 0.31, 0]);
    const headRestY = this.joints.head ? this._restRootPos('head').y : 1.55;
    const torsoRestY = this.joints.torso ? this._restRootPos('torso').y : 0.95;
    if (head.given && !head.node) head.center.y -= headRestY;
    if (body.given && !body.node) body.center.y -= torsoRestY;
    this.hb = { head, body, legs: { size: new THREE.Vector3(0.5, 1.0, 0.42), center: new THREE.Vector3(0, 0.5, 0) } };

    // arms: measured once, solved every frame
    this.weapon = null; this.gripL = null; this.gripR = null; this.muzzle = null;
    this.arms = this._measureArms();
    this.sW = this.arms.W ? Math.sign(this.arms.W.S0.x) || -1 : -1;     // which side the weapon hand is on (-1 = right)

    // animation state
    this.state = 'idle';
    this.blendDur = 0.15; this.blendT = 1;
    this.pose = blank(); this.from = blank(); this.target = blank(); this.out = blank();
    this.phase = Math.random();            // cycle phase in turns (1 = one stride pair)
    this.t = 0; this.speed = 0; this.aimPitch = 0;
    this._crouch = 0; this._runF = 0; this._moveW = 0; this._lat = 0; this._back = 0; this._turn = 0;
    this.hitT = 999; this.hitDir = 1;
    this.kickT = 999;
    this.deathT = -1; this.deathDir = new THREE.Vector3(0, 0, 1); this.headshot = false;
    this.deathFrom = blank(); this.deathTilt = 0;
    this.tiltX = 0; this.tiltZ = 0; this.raise = 0;
    this._lastPos = null; this._lastYaw = null; this._vel = new THREE.Vector3(); this._yawRate = 0;
    this.headScan = Math.random() * 10;
    this._posture(this.pose, 'idle', 0);
    copyPose(this.from, this.pose);
  }

  _restRootPos(name, out = new THREE.Vector3()) {
    this.object.updateMatrixWorld(true);
    this.joints[name].getWorldPosition(out);
    return this.object.worldToLocal(out);
  }

  /** Measure both arms in the rest pose: shoulder, lengths, rest directions in joint local space. */
  _measureArms() {
    const J = this.joints;
    if (!this.object || !J.upperArmR || !J.lowerArmR) return { W: null, S: null };
    this.object.updateMatrixWorld(true);
    const rootQ = this.object.getWorldQuaternion(new THREE.Quaternion());
    const rootQi = rootQ.clone().invert();
    const rootPos = (node) => this.object.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
    const localQ = (node) => node.getWorldQuaternion(new THREE.Quaternion()).premultiply(rootQi);
    const sock = J.weaponSocket;
    let weaponSide = 'R';
    if (sock) { let p = sock.parent; while (p && p !== this.object) { if (p === J.upperArmL || p === J.lowerArmL) { weaponSide = 'L'; break; } if (p === J.upperArmR || p === J.lowerArmR) break; p = p.parent; } }
    const measure = (side, hasSocket) => {
      const upper = J['upperArm' + side], lower = J['lowerArm' + side];
      if (!upper || !lower) return null;
      const S0 = rootPos(upper), E0 = rootPos(lower);
      let H0 = null;
      if (hasSocket && sock) H0 = rootPos(sock);
      if (!H0) {
        const box = new THREE.Box3();
        lower.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { const g = o.geometry; g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
        if (!box.isEmpty()) {
          const ex = box.max.clone().sub(box.min);
          const axis = ex.x > ex.y && ex.x > ex.z ? 'x' : (ex.z > ex.y ? 'z' : 'y');
          const el = lower.getWorldPosition(new THREE.Vector3());
          const far = el.clone(); far[axis] = Math.abs(box.max[axis] - el[axis]) > Math.abs(box.min[axis] - el[axis]) ? box.max[axis] : box.min[axis];
          H0 = this.object.worldToLocal(far);
          // the palm sits a little short of the fingertips
          H0.lerp(E0, 0.12);
        }
      }
      if (!H0) H0 = E0.clone().add(E0.clone().sub(S0).normalize().multiplyScalar(0.36));
      const L1 = Math.max(0.05, S0.distanceTo(E0)), L2 = Math.max(0.05, E0.distanceTo(H0));
      const qU = localQ(upper), qL = localQ(lower);
      const dU = E0.clone().sub(S0).normalize().applyQuaternion(qU.clone().invert());
      const dL = H0.clone().sub(E0).normalize().applyQuaternion(qL.clone().invert());
      const pick = (d) => (Math.abs(d.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1));
      return { upper, lower, S0, L1, L2, dU, dL, xU: pick(dU), xL: pick(dL), side, S0x: S0.x };
    };
    const W = measure(weaponSide, true);
    const S = measure(weaponSide === 'R' ? 'L' : 'R', false);
    if (W && S && Math.abs(S.L2 - W.L2) > 0.15 && !sock) S.L2 = W.L2;
    return { W, S };
  }

  /** Put a weapon asset (keepHierarchy instance) in the weapon hand: gripR on the socket, muzzle +Z. */
  attachWeapon(weapon) {
    if (!weapon) return;
    const socket = this.joints.weaponSocket;
    this.weapon = weapon;
    if (this.slung) this.slung.visible = false;
    const sockets = (weapon.userData && weapon.userData.sockets) || {};
    collapsePerJoint(weapon, Object.values(sockets).filter((s) => s && s.isObject3D));
    this.gripL = sockets.gripL && sockets.gripL.isObject3D ? sockets.gripL : null;
    this.gripR = sockets.gripR && sockets.gripR.isObject3D ? sockets.gripR : null;
    this.muzzle = sockets.muzzle && sockets.muzzle.isObject3D ? sockets.muzzle : null;
    weapon.position.set(0, 0, 0); weapon.rotation.set(0, 0, 0);
    if (!socket) { this.object.add(weapon); weapon.position.set(0.2 * this.sW, 1.2, 0.2); return; }
    socket.add(weapon);
    weapon.updateMatrixWorld(true);
    if (this.gripR) {
      const lp = weapon.worldToLocal(this.gripR.getWorldPosition(new THREE.Vector3()));
      weapon.position.copy(lp).negate();
    } else {
      const s = weapon.userData && weapon.userData.nativeSize;
      weapon.position.set(0, -(s ? s.y : 0.25) * 0.5, (s ? s.z : 0.8) * 0.15);
    }
    weapon.updateMatrixWorld(true);
  }

  muzzleWorld(out = new THREE.Vector3()) {
    if (this.muzzle) return this.muzzle.getWorldPosition(out);
    if (this.joints.weaponSocket) { this.joints.weaponSocket.getWorldPosition(out); return out.add(this._v.set(0, 0, 0.5).applyQuaternion(this.joints.weaponSocket.getWorldQuaternion(this._q))); }
    return out.copy(this.object.getWorldPosition(this._w)).add(this._v.set(0, 1.4, 0.4).applyAxisAngle(this._u.set(0, 1, 0), this.object.rotation.y));
  }

  // ---------------------------------------------------------------- state
  setState(state, blend = 0.15) {
    if (!STATES.includes(state)) return;
    if (state === 'hit') { if (this.state === 'death') return; this.hitT = 0; this.hitDir = Math.random() < 0.5 ? -1 : 1; return; }
    if (state === 'death') { if (this.state !== 'death') { this.deathT = 0; copyPose(this.deathFrom, this.out); this.deathTilt = 0; } this.state = 'death'; return; }
    if (state === this.state) return;
    copyPose(this.from, this.pose);
    this.state = state;
    this.blendDur = clamp(blend, 0.03, 0.4);
    this.blendT = 0;
    this.deathT = -1;
  }

  /** Recoil kick: call once per shot. */
  fire() { if (this.state !== 'death') this.kickT = 0; }

  /** Reset to rest (a respawn). */
  reset() {
    this.deathT = -1; this.hitT = 999; this.kickT = 999; this.state = 'idle'; this._crouch = 0;
    this.tiltX = 0; this.tiltZ = 0; this.raise = 0; this.deathTilt = 0; this._runF = 0; this._moveW = 0; this._lat = 0; this._back = 0; this._turn = 0;
    this._lastPos = null; this._lastYaw = null; this._vel.set(0, 0, 0); this._yawRate = 0;
    this._posture(this.pose, 'idle', 0);
    copyPose(this.from, this.pose); this.blendT = 1;
    copyPose(this.out, this.pose);
    this._apply(this.out);
  }

  /**
   * Put the rig into a named state at time t (for a test page). Snaps the posture (no blend from
   * idle), starts the cycle at phase 0 (left foot contact) and simulates forward at the state's
   * canonical speed so cycles, hit and death play out exactly as they would in game.
   */
  debugPose(name, t = 0, opts = {}) {
    const canon = { idle: 0, walk: 1.4, run: 5.4, sprint: 6.4, aim: 0, crouch: 0, strafe: 3.0, hit: 0, death: 0 };
    if (!STATES.includes(name)) name = 'idle';
    this.reset();
    const speed = opts.speed !== undefined ? opts.speed : canon[name];
    const base = name === 'hit' || name === 'death' ? 'idle' : name;
    const input = { speed, aimPitch: opts.aimPitch || 0, crouch: !!opts.crouch || name === 'crouch', moving: speed > 0, lateral: name === 'strafe' ? (opts.lateral !== undefined ? opts.lateral : 1) : 0, backward: 0 };
    this.setState(base, 0.03);
    this.blendT = 1;                         // snap to the posture
    this.phase = 0; this.t = 0; this.headScan = 0;
    // the velocity mixes ease in over ~0.1 s in game; snap them so t = 0 is a full stride pose
    this._moveW = speed > 0 ? 1 : 0; this._runF = smoothRange(speed, 2.0, 4.6); this._lat = input.lateral; this._crouch = input.crouch ? 1 : 0;
    this.update(0, input);
    if (name === 'hit') this.setState('hit');
    if (name === 'death') this.setState('death');
    const dt = 1 / 120;
    for (let s = 0; s < t; s += dt) this.update(Math.min(dt, t - s), input);
    return { state: name, t, phase: this.phase, pose: copyPose({}, this.out) };
  }

  // ---------------------------------------------------------------- postures (joint angle sets)
  /** Fill `p` with the posture for a state given the live inputs. Angles in radians, hand in figure space. */
  _posture(p, st, pitch) {
    const sW = this.sW;
    for (const f of FIELDS) p[f] = 0;
    switch (st) {
      case 'aim': {
        // stock in the shoulder, cheek on the stock, torso bladed so the weapon shoulder sits behind the rifle
        p.tx = 0.05 - pitch * 0.22; p.ty = -0.30 * sW;
        p.hx = 0.12 - pitch * 0.50; p.hy = 0.24 * sW; p.hz = -0.12 * sW;
        p.lfL = 0.08; p.lfR = -0.06; p.knL = 0.10; p.knR = 0.06; p.abL = 0.06; p.abR = 0.06;
        p.wx = 0.16 * sW; p.wy = 1.33 + 0.11 * pitch; p.wz = 0.26 - 0.05 * Math.abs(pitch);
        p.fx = 0; p.fy = Math.sin(pitch); p.fz = Math.cos(pitch);
        break;
      }
      case 'run': case 'sprint': {
        // forward lean from the ankles up, rifle across the chest, muzzle forward and down like the concept
        const sprint = st === 'sprint' ? 1 : 0;
        p.tx = 0.22 + 0.10 * sprint; p.ty = 0.06 * sW; p.py = 0; p.pz = 0;
        p.hx = -0.10 - 0.06 * sprint;
        p.knL = 0.10; p.knR = 0.10;
        p.wx = 0.11 * sW; p.wy = 1.12 - 0.04 * sprint; p.wz = 0.17;
        p.fx = -0.34 * sW; p.fy = -0.26 - 0.10 * sprint; p.fz = 0.90;
        break;
      }
      case 'walk': {
        p.tx = 0.09; p.ty = -0.08 * sW; p.hx = -0.04;
        p.knL = 0.06; p.knR = 0.06;
        p.wx = 0.15 * sW; p.wy = 1.07; p.wz = 0.20;
        p.fx = -0.30 * sW; p.fy = -0.42; p.fz = 0.86;
        break;
      }
      case 'strafe': {
        p.tx = 0.08; p.ty = -0.10 * sW; p.hx = -0.03;
        p.knL = 0.08; p.knR = 0.08;
        p.wx = 0.14 * sW; p.wy = 1.10; p.wz = 0.20;
        p.fx = -0.22 * sW; p.fy = -0.30; p.fz = 0.92;
        break;
      }
      case 'crouch': case 'idle': default: {
        // low ready: feet a little apart, knees soft, rifle in front of the chest with the muzzle down
        p.tx = 0.05; p.ty = -0.14 * sW; p.hx = -0.02;
        p.lfL = 0.02; p.lfR = -0.02; p.knL = 0.06; p.knR = 0.06; p.abL = 0.05; p.abR = 0.05;
        p.wx = 0.16 * sW; p.wy = 1.04; p.wz = 0.18;
        p.fx = -0.36 * sW; p.fy = -0.46; p.fz = 0.82;
        break;
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- update
  update(dt, { speed = 0, aimPitch = 0, crouch = false, moving = null, lateral = null, backward = null } = {}) {
    if (!this.object) return;
    dt = Math.min(dt, 0.1);
    this.t += dt;
    this.speed = speed; this.aimPitch = aimPitch;
    this._trackMotion(dt);
    if (this.state === 'death') { this._death(dt); return; }

    const st = this.state, sW = this.sW, out = this.out;
    const pitch = clamp(aimPitch, -0.9, 0.9);

    // ---- posture blend (state to state, timed)
    this._posture(this.target, st, pitch);
    if (this.blendT < 1) { this.blendT = Math.min(1, this.blendT + dt / this.blendDur); lerpPose(this.pose, this.from, this.target, smooth(this.blendT)); }
    else copyPose(this.pose, this.target);
    copyPose(out, this.pose);

    // ---- locomotion mix from actual velocity
    const isMoving = moving === null ? speed > 0.15 : moving;
    const ease = 1 - Math.exp(-dt * 10);
    this._moveW += ((isMoving ? 1 : 0) - this._moveW) * ease;
    this._runF += (smoothRange(speed, 2.0, 4.6) - this._runF) * ease;
    let latIn = lateral, backIn = backward;
    if (latIn === null || backIn === null) {
      // infer from how the object actually moved relative to its facing (bot.js sets position after us)
      const yaw = this.object.rotation.y;
      const vl = this._vel.length();
      const lx = vl > 0.3 ? (this._vel.x * Math.cos(yaw) - this._vel.z * Math.sin(yaw)) / vl : 0;
      const fz = vl > 0.3 ? (this._vel.x * Math.sin(yaw) + this._vel.z * Math.cos(yaw)) / vl : 1;
      if (latIn === null) latIn = Math.abs(lx) > 0.5 ? lx : 0;
      if (backIn === null) backIn = fz < -0.5 ? 1 : 0;
    }
    this._lat += (clamp(latIn, -1, 1) - this._lat) * ease;
    this._back += (clamp(backIn, 0, 1) - this._back) * ease;
    const crouchT = st === 'crouch' || crouch ? 1 : 0;
    this._crouch += (crouchT - this._crouch) * (1 - Math.exp(-dt * 8));
    const c = this._crouch, runF = this._runF, mw = this._moveW;
    const latW = Math.abs(this._lat) * mw, fwdW = (1 - Math.abs(this._lat)) * mw;

    // ---- phase: by distance, one turn per stride pair; the shuffle when turning in place
    const stride = clamp(0.55 + 0.16 * speed, 0.6, 1.5) * (1 - 0.35 * c);
    const cycleLen = 2 * stride;
    const turning = !isMoving && Math.abs(this._yawRate) > 0.5 ? 1 : 0;
    this._turn += (turning - this._turn) * ease;
    if (isMoving) this.phase += (speed * dt) / cycleLen * (this._back > 0.5 ? -1 : 1);
    else if (this._turn > 0.01) this.phase += Math.abs(this._yawRate) * dt * 0.30 / 0.7;
    const u = this.phase;

    // ---- leg rings (deg), mixed walk/run by speed, crouch walk = walk ring at 55% around the crouch base
    const S = this.sign;
    const legAt = (ring, uu, col) => ringSample(ring.leg, uu, col);
    const gaitAmp = fwdW * (1 - 0.45 * c) + this._turn * 0.35;
    const mix = (uu, col) => lerp(legAt(WALK, uu, col), legAt(RUN, uu, col), runF);
    const lfL = mix(u, 0) * gaitAmp, knL = mix(u, 1) * gaitAmp;
    const lfR = mix(u + 0.5, 0) * gaitAmp, knR = mix(u + 0.5, 1) * gaitAmp;
    // strafe ring: the lead leg is on the side of travel; its abduction is toward the travel direction
    const d = this._lat >= 0 ? 1 : -1;            // +1 = travelling toward the figure's +X (its left)
    const sLead = legAt(STRAFE, u, 2) * D2R, sTrail = -legAt(STRAFE, u, 2) * D2R;
    const sKneeLead = legAt(STRAFE, u, 1) * D2R, sKneeTrail = legAt(STRAFE, u + 0.5, 1) * D2R;
    const sFwdLead = legAt(STRAFE, u, 0) * D2R, sFwdTrail = legAt(STRAFE, u + 0.5, 0) * D2R;
    const leadIsL = d > 0;
    // rotation toward +X: lead leg gets d*lead, trail gets d*trail; abL is "out to +X", abR is "out to -X"
    const abLtoX = d * (leadIsL ? sLead : sTrail), abRtoX = d * (leadIsL ? sTrail : sLead);
    out.lfL += lfL * D2R + latW * (leadIsL ? sFwdLead : sFwdTrail);
    out.lfR += lfR * D2R + latW * (leadIsL ? sFwdTrail : sFwdLead);
    out.knL += knL * D2R + latW * (leadIsL ? sKneeLead : sKneeTrail);
    out.knR += knR * D2R + latW * (leadIsL ? sKneeTrail : sKneeLead);
    out.abL += latW * abLtoX;
    out.abR += latW * -abRtoX;
    // crouch base: thighs up, knees folded, root down
    // crouch base: a tactical crouch, left foot flat in front, right leg folded under with the heel up,
    // torso forward over the knees, rifle out in front of the knees at low ready
    if (c > 0.001) {
      out.lfL += 1.30 * c; out.lfR += 0.80 * c; out.knL += 2.10 * c; out.knR += 2.20 * c; out.abL += 0.10 * c; out.abR += 0.16 * c;
      out.lift -= 0.47 * c; out.tx += 0.32 * c; out.hx -= 0.18 * c; out.py += 0.12 * c * sW;
      out.wy += 0.12 * c; out.wz += 0.10 * c; out.fy += 0.26 * c;
    }

    // ---- lift ring, pelvis / torso counter rotation, hand bob
    const liftF = lerp(ringSample(WALK.lift, u), ringSample(RUN.lift, u), runF);
    out.lift += liftF * gaitAmp * (1 - 0.5 * c) + ringSample(STRAFE.lift, u) * latW;
    const pel = lerp(WALK.pelvisYaw, RUN.pelvisYaw, runF) * D2R * gaitAmp + STRAFE.pelvisYaw * D2R * latW;
    const counter = lerp(WALK.torsoCounter, RUN.torsoCounter, runF);
    const s2 = Math.sin(u * Math.PI * 2), c2 = Math.cos(u * Math.PI * 2);
    // left leg forward at u = 0: the left hip leads, which is a negative yaw about +Y
    out.py += -pel * c2;
    out.ty += pel * counter * c2;
    out.pz += lerp(WALK.torsoRoll, RUN.torsoRoll, runF) * D2R * gaitAmp * s2 * 0.5;
    out.tz += -lerp(WALK.torsoRoll, RUN.torsoRoll, runF) * D2R * gaitAmp * s2 + STRAFE.torsoRoll * D2R * latW * d * -0.6;
    const hb = lerp(WALK.handBob, RUN.handBob, runF) * gaitAmp + STRAFE.handBob * latW;
    out.wx += 0.010 * hb * s2; out.wy += 0.022 * hb * Math.sin(u * Math.PI * 4 + 0.6); out.wz += 0.012 * hb * s2;
    out.fx += 0.05 * hb * s2; out.fy += 0.03 * hb * Math.sin(u * Math.PI * 4);
    // idle breathing and a slow head scan while nothing is happening
    const still = (1 - mw) * (st === 'idle' || st === 'crouch' ? 1 : 0);
    if (still > 0.01) {
      const br = Math.sin(this.t * 1.6);
      out.tx += 0.012 * br * still; out.wy += 0.006 * br * still;
      this.headScan += dt;
      out.hy += still * 0.30 * Math.sin(this.headScan * 0.55) * Math.sin(this.headScan * 0.23 + 1.0);
      // fix4 ai: a slow weight shift from one foot to the other (pelvis roll, the loaded knee
      // straighter, the free knee softer) so a standing figure is a different silhouette two
      // seconds apart instead of a statue
      const ws = Math.sin(this.t * 0.45 + this.headScan * 0.1) * still * (1 - c);
      out.pz += 0.035 * ws; out.tz += -0.02 * ws;
      out.knL += 0.05 * Math.max(0, ws); out.knR += 0.05 * Math.max(0, -ws);
      out.abL += 0.02 * ws; out.abR += -0.02 * ws;
      out.lift -= 0.006 * Math.abs(ws);
    }
    // fix4 ai: an alert figure holding the shoulder scans the muzzle a little and breathes
    const holdW = (1 - mw) * (st === 'aim' ? 1 : 0);
    if (holdW > 0.01) {
      const br = Math.sin(this.t * 1.5);
      out.tx += 0.008 * br * holdW; out.wy += 0.004 * br * holdW;
      const sc = Math.sin(this.t * 0.7) * Math.sin(this.t * 0.31 + 0.8) * holdW;
      out.ty += 0.06 * sc; out.fx += 0.05 * sc; out.pz += 0.02 * Math.sin(this.t * 0.4) * holdW;
    }
    // the head stays on the aim: it cancels the pelvis and torso twist and most of the lean
    out.hy += -(out.ty + out.py) * 0.85;
    out.hx += -out.tx * 0.55;
    out.hz += -out.tz * 0.6;

    // ---- overlays: hit flinch, recoil
    this.hitT += dt;
    if (this.hitT < 0.35) {
      const k = this.hitT < 0.08 ? this.hitT / 0.08 : 1 - smooth((this.hitT - 0.08) / 0.27);
      out.tx += -0.26 * k; out.tz += 0.16 * k * this.hitDir; out.ty += 0.10 * k * this.hitDir;
      out.hx += -0.30 * k; out.hz += 0.12 * k * this.hitDir;
      out.wy -= 0.05 * k; out.wz -= 0.06 * k; out.lift -= 0.025 * k;
      out.knL += 0.12 * k; out.knR += 0.12 * k;
    }
    this.kickT += dt;
    if (this.kickT < 0.14) {
      const k = this.kickT < 0.03 ? this.kickT / 0.03 : 1 - smooth((this.kickT - 0.03) / 0.11);
      out.wz -= 0.035 * k; out.wy += 0.008 * k; out.fy += 0.06 * k; out.tx -= 0.03 * k; out.hx -= 0.02 * k;
    }
    this._apply(out);
  }

  /** World velocity and yaw rate of the object, inferred from its transform (the bot moves it after we run). */
  _trackMotion(dt) {
    const o = this.object;
    if (dt <= 0) return;
    if (this._lastPos) {
      const dx = o.position.x - this._lastPos.x, dy = o.position.y - this._lastPos.y, dz = o.position.z - this._lastPos.z;
      const v = Math.hypot(dx, dy, dz) / dt;
      if (v < 12) { const k = 1 - Math.exp(-dt * 12); this._vel.x += (dx / dt - this._vel.x) * k; this._vel.y += (dy / dt - this._vel.y) * k; this._vel.z += (dz / dt - this._vel.z) * k; }
      else this._vel.set(0, 0, 0);
      let dyaw = o.rotation.y - this._lastYaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const yr = dyaw / dt;
      if (Math.abs(yr) < 12) this._yawRate += (yr - this._yawRate) * (1 - Math.exp(-dt * 12)); else this._yawRate = 0;
    } else { this._lastPos = new THREE.Vector3(); }
    this._lastPos.copy(o.position); this._lastYaw = o.rotation.y;
  }

  // ---------------------------------------------------------------- death
  _death(dt) {
    this.deathT += dt;
    const out = this.out;
    // keys: from the captured pose through DEATH_KEYS with an ease in/out per segment, hold the last
    let prev = this.deathFrom, prevT = 0, prevTilt = 0, prevRaise = 0, next = null, nextT = 0, nextTilt = 0, nextRaise = 0;
    const filled = [];
    let acc = copyPose({}, this.deathFrom);
    for (const k of DEATH_KEYS) { for (const f of FIELDS) if (k[f] !== undefined) acc[f] = k[f]; filled.push({ t: k.t, tilt: k.tilt, raise: k.raise || 0, pose: copyPose({}, acc) }); }
    for (const k of filled) {
      if (this.deathT <= k.t) { next = k.pose; nextT = k.t; nextTilt = k.tilt; nextRaise = k.raise; break; }
      prev = k.pose; prevT = k.t; prevTilt = k.tilt; prevRaise = k.raise;
    }
    let tilt;
    if (!next) { copyPose(out, prev); tilt = prevTilt; this.raise = prevRaise; }
    else {
      const e = smooth((this.deathT - prevT) / Math.max(1e-3, nextT - prevT));
      lerpPose(out, prev, next, e); tilt = lerp(prevTilt, nextTilt, e); this.raise = lerp(prevRaise, nextRaise, e);
    }
    const sW = this.sW;
    // the keys are authored for a right handed figure; mirror the hand for a left handed asset
    out.wx = Math.abs(out.wx) * sW; out.fx = Math.abs(out.fx) * sW;
    if (this.headshot) { out.hx -= 0.45; out.hz += 0.25; }
    const yaw = this.object.rotation.y;
    const local = Math.atan2(this.deathDir.x, this.deathDir.z) - yaw;
    this.tiltX = Math.cos(local) * tilt;
    this.tiltZ = -Math.sin(local) * tilt;
    // falling sideways: the torso and head roll with the fall so the body reads as going over, not planking
    out.tz += -Math.sin(local) * tilt * 0.12; out.py += Math.sin(local) * tilt * 0.08;
    this._apply(out);
  }

  // ---------------------------------------------------------------- apply to the joints
  _apply(p) {
    const J = this.joints, R = this.rest, S = this.sign;
    const set = (name, x, y, z) => { const j = J[name]; if (!j) return; const r = R[name].rot; j.rotation.set(r.x + x, r.y + y, r.z + z); };
    set('torso', p.tx, p.ty, p.tz);
    set('head', p.hx, p.hy, p.hz);
    set('upperLegL', S.hip * p.lfL, 0, p.abL);
    set('upperLegR', S.hip * p.lfR, 0, -p.abR);
    set('lowerLegL', S.knee * p.knL, 0, 0);
    set('lowerLegR', S.knee * p.knR, 0, 0);
    if (this.inner) {
      const ri = this.restInner;
      this.inner.position.set(ri.pos.x, ri.pos.y + p.lift, ri.pos.z);
      if (this.raise) {
        // a WORLD up offset: once the root is tilted over, its own +Y runs along the ground, so
        // undo the tilt to find where "up" is in the root frame and lift the body along that
        this._q.setFromEuler(this._e.set(this.tiltX, 0, this.tiltZ, 'YXZ')).invert();
        this.inner.position.add(this._v.set(0, this.raise, 0).applyQuaternion(this._q));
      }
      this.inner.rotation.set(ri.rot.x, ri.rot.y + p.py, ri.rot.z + p.pz);
    }
    this.object.rotation.x = this.tiltX; this.object.rotation.z = this.tiltZ;
    this.object.updateMatrixWorld(true);
    this._applyArms(p);
  }

  /** Two bone IK for both arms; the weapon socket oriented to the barrel direction. */
  _applyArms(p) {
    const A = this.arms;
    if (!A.W) return;
    const rootQ = this.object.getWorldQuaternion(this._q2);
    // hand targets are authored in figure space at rest height; they ride the pelvis lift and yaw
    const shoulderYaw = p.py + p.ty * 0.7;
    const tW = this._t.set(p.wx, p.wy + p.lift, p.wz).applyAxisAngle(this._u.set(0, 1, 0), shoulderYaw);
    this.object.localToWorld(tW);
    const poleW = this._u.set(0.6 * Math.sign(A.W.S0x || 1), -0.7, -0.3).applyQuaternion(rootQ);
    this._solveArm(A.W, tW, poleW);
    const sock = this.joints.weaponSocket;
    const F = this._v.set(p.fx, p.fy, p.fz);
    if (F.lengthSq() < 1e-6) F.set(0, -0.5, 0.85);
    F.normalize().applyAxisAngle(this._w.set(0, 1, 0), shoulderYaw * 0.6);
    F.applyQuaternion(rootQ);
    if (sock) {
      const up = Math.abs(F.y) > 0.95 ? this._w.set(0, 0, 1).applyQuaternion(rootQ) : this._w.set(0, 1, 0);
      this._m.lookAt(F, new THREE.Vector3(0, 0, 0), up);
      const Qw = this._q.setFromRotationMatrix(this._m);
      const pq = sock.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      sock.quaternion.copy(pq.multiply(Qw));
      sock.updateMatrixWorld(true);
    }
    if (A.S) {
      let tS;
      if (this.gripL && this.state !== 'death') tS = this.gripL.getWorldPosition(this._t);
      else if (this.state === 'death') { tS = this._t.set(-p.wx * 0.9, p.wy - 0.05 + p.lift, p.wz - 0.1); this.object.localToWorld(tS); }
      else tS = tW.addScaledVector(F, 0.30);            // a virtual handguard up the barrel
      const poleS = this._u.set(0.45 * Math.sign(A.S.S0x || -1), -0.8, -0.1).applyQuaternion(rootQ);
      this._solveArm(A.S, tS, poleS);
    }
  }

  _solveArm(arm, target, pole) {
    const S = arm.upper.getWorldPosition(new THREE.Vector3());
    const d = new THREE.Vector3().subVectors(target, S);
    let dist = d.length();
    if (dist < 1e-4) return;
    const L1 = arm.L1, L2 = arm.L2;
    dist = clamp(dist, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
    const dh = d.normalize();
    const cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
    const ang = Math.acos(cosA);
    const pp = new THREE.Vector3().copy(pole).addScaledVector(dh, -pole.dot(dh));
    if (pp.lengthSq() < 1e-6) pp.set(0, -1, 0).addScaledVector(dh, dh.y);
    pp.normalize();
    const U = new THREE.Vector3().copy(dh).multiplyScalar(Math.cos(ang)).addScaledVector(pp, Math.sin(ang)).normalize();
    const E = new THREE.Vector3().copy(S).addScaledVector(U, L1);
    const Tc = new THREE.Vector3().copy(S).addScaledVector(dh, dist);
    const Lw = new THREE.Vector3().subVectors(Tc, E).normalize();
    const n = new THREE.Vector3().crossVectors(Lw, U);
    if (n.lengthSq() < 1e-6) n.crossVectors(pp, U);
    n.normalize();
    const q = new THREE.Quaternion();
    frameRotation(arm.dU, arm.xU, U, n, q);
    const pq = arm.upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    arm.upper.quaternion.copy(pq.multiply(q));
    arm.upper.updateMatrixWorld(true);
    frameRotation(arm.dL, arm.xL, Lw, n, q);
    const uq = arm.upper.getWorldQuaternion(new THREE.Quaternion()).invert();
    arm.lower.quaternion.copy(uq.multiply(q));
    arm.lower.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- queries
  /** World space hitboxes for the current pose: head, torso and legs. */
  hitboxes() {
    this.object.updateMatrixWorld(true);
    const out = [];
    const mk = (node, spec, part) => {
      const box = new THREE.Box3();
      box.setFromCenterAndSize(spec.center, spec.size);
      box.applyMatrix4((spec.node || node).matrixWorld);
      out.push({ part, box });
    };
    const head = this.joints.head, torso = this.joints.torso;
    if (head) mk(head, this.hb.head, 'head');
    else out.push({ part: 'head', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.68, 0), this.hb.head.size).applyMatrix4(this.object.matrixWorld) });
    if (torso) mk(torso, this.hb.body, 'body');
    else out.push({ part: 'body', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.25, 0), this.hb.body.size).applyMatrix4(this.object.matrixWorld) });
    mk(this.object, this.hb.legs, 'body');
    return out;
  }

  jointAngles() {
    return {
      upperLegL: this.joints.upperLegL ? this.joints.upperLegL.rotation.x : 0,
      upperArmR: this.joints.upperArmR ? this.joints.upperArmR.rotation.x : 0,
    };
  }
}

SoldierRig.STATES = STATES;
SoldierRig.FIELDS = FIELDS;
SoldierRig.RINGS = { RUN, WALK, STRAFE };

export { JOINT_NAMES, STATES };
