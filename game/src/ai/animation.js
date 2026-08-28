/**
 * Procedural soldier animation, driven from the joints the asset names on userData.joints
 * (docs/OBJECTS.tsv): head, torso, upperArmL, lowerArmL, upperArmR, lowerArmR, upperLegL,
 * lowerLegL, upperLegR, lowerLegR, weaponSocket. Pivots are at the joints (hips 0.95, knees
 * 0.50, shoulders 1.45, elbows 1.15, neck 1.55); the figure faces +Z.
 *
 * Legs, torso and head are posed as rotation offsets from the asset's rest pose, with the
 * legs assumed to hang down -Y at rest (a standing figure). Sign convention (Three.js, +Z
 * forward): a limb hanging down -Y rotated by a NEGATIVE rotation.x swings forward (+Z), so
 * hip swing forward is negative and knee flexion (foot goes back) is positive. An asset can
 * override on userData.jointHints = { hipForward: -1, kneeFlex: 1 }.
 *
 * Arms are NOT posed by angles. They are solved by two bone IK from measured limb lengths and
 * rest directions, so they are correct whatever rest pose the asset ships in (arms hanging
 * or arms already raised on the weapon): the weapon hand goes to a target in figure space,
 * the weapon socket is oriented absolutely so the barrel points where the figure aims, and
 * the support hand is solved onto the weapon's gripL socket (the handguard). Both hands are
 * on the weapon in every state.
 *
 * The feet do not slide: the cycle phase advances by distance travelled (2 pi per stride
 * pair) and the hip swing amplitude is derived from the step length and the leg length. The
 * cycle is applied directly; only posture (lean, crouch, arm targets) is blended, so a
 * state change is smooth and a run cycle keeps its full amplitude.
 *
 * The rig also collapses the loaded instance to one mesh per material PER JOINT, so a
 * soldier costs about twenty draws instead of a hundred and every limb still moves. That is
 * a merge inside a joint, never a clone of the articulated asset.
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const JOINT_NAMES = ['head', 'torso', 'upperArmL', 'lowerArmL', 'upperArmR', 'lowerArmR', 'upperLegL', 'lowerLegL', 'upperLegR', 'lowerLegR', 'weaponSocket'];
const ROT_JOINTS = ['head', 'torso', 'upperLegL', 'lowerLegL', 'upperLegR', 'lowerLegR'];
const STATES = ['idle', 'walk', 'run', 'aim', 'crouch', 'hit', 'death'];
const LEG_LEN = 0.9;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

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
  const r = (v) => (typeof v === 'number' ? Math.round(v * 5) / 5 : v);     // 0.2 rungs: a bucket per surface, not per part
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
        // one shared material per surface: white with vertex colours carrying each part's own colour
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

function readBox(spec, fallbackSize, fallbackCenter) {
  const size = new THREE.Vector3().fromArray(fallbackSize);
  const center = new THREE.Vector3().fromArray(fallbackCenter);
  if (!spec) return { size, center, given: false };
  if (spec.isObject3D) {
    // the asset placed an empty node at the hitbox centre with userData.size (enemy_soldier.js does)
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

export class SoldierRig {
  constructor(object, opts = {}) {
    this.object = object;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._t = new THREE.Vector3();
    this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._m = new THREE.Matrix4();
    this.joints = {};
    const j = (object && object.userData && object.userData.joints) || {};
    for (const n of JOINT_NAMES) if (j[n] && j[n].isObject3D) this.joints[n] = j[n];
    this.articulated = !!(this.joints.upperLegL && this.joints.upperLegR && this.joints.upperArmR);
    if (object && !this.articulated) console.warn('[rig] soldier has no joints (merged asset or missing declarations); it will not animate');
    this.meshCount = 0;
    // a rifle modelled slung on the back stays its own node so it can be hidden once a weapon is in the hands
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

    // hitbox specs in joint local space
    const hb = (object && object.userData && object.userData.hitboxes) || null;
    const head = readBox(hb && hb.head, [0.26, 0.28, 0.26], [0, 0.14, 0.02]);
    const body = readBox(hb && hb.body, [0.46, 0.62, 0.32], [0, 0.31, 0]);
    const headRestY = this.joints.head ? this._restRootPos('head').y : 1.55;
    const torsoRestY = this.joints.torso ? this._restRootPos('torso').y : 0.95;
    if (head.given && !head.node) head.center.y -= headRestY;
    if (body.given && !body.node) body.center.y -= torsoRestY;
    this.hb = { head, body, legs: { size: new THREE.Vector3(0.5, 1.0, 0.42), center: new THREE.Vector3(0, 0.5, 0) } };

    this.state = 'idle';
    this.blend = 0.15;
    this.phase = Math.random() * Math.PI * 2;
    this.t = 0; this.speed = 0; this.aimPitch = 0;
    this.hitT = 999; this.hitDir = 1;
    this.deathT = -1; this.deathDir = new THREE.Vector3(0, 0, 1); this.headshot = false;
    this.P = {}; this.T = {}; this.C = {};
    for (const n of ROT_JOINTS) { this.P[n] = [0, 0, 0]; this.T[n] = [0, 0, 0]; this.C[n] = [0, 0, 0]; }
    this.rootLift = 0; this.rootTargetLift = 0; this.rootTiltX = 0; this.rootTiltZ = 0;
    this._crouch = 0;
    // arms
    this.weapon = null; this.gripL = null; this.gripR = null; this.muzzle = null;
    this.arms = this._measureArms();
    this.sW = this.arms.W ? Math.sign(this.arms.W.S0.x) || 1 : 1;     // which side the weapon hand is on
    this.hand = { W: new THREE.Vector3(0.2 * this.sW, 1.05, 0.3), S: new THREE.Vector3(-0.25 * this.sW, 1.05, 0.3) };
    this.handT = { W: this.hand.W.clone(), S: this.hand.S.clone() };
    this.handBob = new THREE.Vector3();
    this.wdir = new THREE.Vector3(-0.2 * this.sW, -0.6, 0.78).normalize();
    this.wdirT = this.wdir.clone();
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
        // hand end from the lower arm geometry: farthest vertex from the elbow along the limb
        const box = new THREE.Box3();
        lower.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { const g = o.geometry; g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
        if (!box.isEmpty()) {
          const ex = box.max.clone().sub(box.min);
          const axis = ex.x > ex.y && ex.x > ex.z ? 'x' : (ex.z > ex.y ? 'z' : 'y');
          const el = lower.getWorldPosition(new THREE.Vector3());
          const far = el.clone(); far[axis] = Math.abs(box.max[axis] - el[axis]) > Math.abs(box.min[axis] - el[axis]) ? box.max[axis] : box.min[axis];
          H0 = this.object.worldToLocal(far);
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

  setState(state, blend = 0.15) {
    if (!STATES.includes(state)) return;
    if (state === 'hit') { if (this.state === 'death') return; this.hitT = 0; this.hitDir = Math.random() < 0.5 ? -1 : 1; return; }
    if (state === 'death') { if (this.state !== 'death') this.deathT = 0; this.state = 'death'; return; }
    if (state === this.state) return;
    this.state = state;
    this.blend = Math.max(0.03, blend);
    this.deathT = -1;
  }

  /** Reset to rest (a respawn). */
  reset() {
    for (const n of ROT_JOINTS) { this.P[n] = [0, 0, 0]; this.T[n] = [0, 0, 0]; this.C[n] = [0, 0, 0]; }
    this.rootLift = 0; this.rootTargetLift = 0; this.rootTiltX = 0; this.rootTiltZ = 0;
    this.deathT = -1; this.hitT = 999; this.state = 'idle'; this._crouch = 0;
    this.hand.W.set(0.2 * this.sW, 1.05, 0.3); this.hand.S.set(-0.25 * this.sW, 1.05, 0.3);
    this.wdir.set(-0.2 * this.sW, -0.6, 0.78).normalize();
    this._applyRotations();
    this._applyArms();
  }

  update(dt, { speed = 0, aimPitch = 0, crouch = false, moving = null } = {}) {
    if (!this.object) return;
    dt = Math.min(dt, 0.1);
    this.t += dt;
    this.speed = speed; this.aimPitch = aimPitch;
    const T = this.T, C = this.C, S = this.sign, sW = this.sW;
    for (const n of ROT_JOINTS) { T[n][0] = T[n][1] = T[n][2] = 0; C[n][0] = C[n][1] = C[n][2] = 0; }
    this.handBob.set(0, 0, 0);
    if (this.state === 'death') { this._death(dt); return; }

    // ---- locomotion cycle (direct)
    const isMoving = moving === null ? speed > 0.15 : moving;
    const runF = clamp((speed - 3.2) / 2.4, 0, 1);
    const step = 0.55 + 0.11 * speed;
    const cycleLen = 2 * step;
    if (isMoving) this.phase += (Math.PI * 2) * (speed * dt) / cycleLen; else this.phase += dt * 1.2;
    const p = this.phase;
    const stride = isMoving ? clamp(speed / 2.0, 0, 1) : 0;
    const A = Math.asin(clamp(step * 0.5 / LEG_LEN, 0, 0.95)) * stride;
    const sL = Math.sin(p), sR = Math.sin(p + Math.PI);
    C.upperLegL[0] = S.hip * A * sL;
    C.upperLegR[0] = S.hip * A * sR;
    const kneeAmp = (0.55 + 0.6 * runF) * stride;
    C.lowerLegL[0] = S.knee * kneeAmp * Math.max(0, Math.cos(p));
    C.lowerLegR[0] = S.knee * kneeAmp * Math.max(0, Math.cos(p + Math.PI));
    C.torso[2] = Math.sin(p) * 0.04 * stride;
    C.torso[1] = -Math.sin(p) * 0.07 * stride;
    C.head[1] = Math.sin(p) * 0.05 * stride;
    let lift = Math.abs(Math.sin(p)) * (0.03 + 0.03 * runF) * stride;
    this.handBob.set(0.012 * sL * stride, 0.025 * Math.sin(2 * p) * stride, 0.02 * sL * stride);

    // ---- posture (blended)
    const st = this.state;
    const crouchT = st === 'crouch' || crouch ? 1 : 0;
    this._crouch = lerp(this._crouch, crouchT, 1 - Math.exp(-dt * 8));
    const c = this._crouch;
    T.lowerLegL[0] = S.knee * 0.06; T.lowerLegR[0] = S.knee * 0.06;
    if (c > 0.01) {
      T.upperLegL[0] += S.hip * 1.05 * c; T.upperLegR[0] += S.hip * 0.85 * c;
      T.lowerLegL[0] += S.knee * 1.35 * c; T.lowerLegR[0] += S.knee * 1.25 * c;
      lift -= 0.42 * c;
    }
    const lean = 0.06 + 0.22 * runF * stride + 0.30 * c;
    T.torso[0] = lean;
    T.head[0] = -lean * 0.7 + 0.02 * Math.sin(this.t * 1.3);
    T.head[1] = st === 'idle' ? Math.sin(this.t * 0.6) * 0.3 : 0;

    const aiming = st === 'aim' || (st === 'crouch' && this.aimPitch !== 0);
    const HW = this.handT.W, HS = this.handT.S, F = this.wdirT;
    const pitch = clamp(this.aimPitch, -0.9, 0.9);
    if (aiming) {
      // stock in the shoulder, cheek down, torso bladed so the weapon shoulder is behind the stock
      HW.set(0.17 * sW, 1.34 + 0.12 * pitch, 0.28 - 0.06 * Math.abs(pitch));
      F.set(0, Math.sin(pitch), Math.cos(pitch));
      T.torso[1] += -0.32 * sW; T.torso[0] += 0.04 - pitch * 0.2;
      T.head[0] = 0.10 - pitch * 0.45; T.head[1] = 0.25 * sW; T.head[2] = -0.10 * sW;
      T.upperLegL[0] += S.hip * 0.06; T.upperLegR[0] -= S.hip * 0.06;
    } else if (st === 'run') {
      // sprint carry: weapon across the chest, muzzle up and to the support side
      HW.set(0.10 * sW, 1.16, 0.30);
      F.set(-0.70 * sW, 0.35, 0.62).normalize();
      T.torso[1] += 0.08 * sW;
    } else {
      // low ready: both hands on the weapon in front of the hips, barrel forward and down
      HW.set(0.20 * sW, 1.04 - 0.30 * c, 0.32);
      F.set(-0.22 * sW, -0.55, 0.80).normalize();
      T.torso[1] += -0.12 * sW;
    }
    HS.set(-0.22 * sW, HW.y + 0.02, HW.z + 0.22);      // used only when there is no weapon to reach for

    // ---- hit reaction overlay
    this.hitT += dt;
    if (this.hitT < 0.4) {
      const k = Math.sin(clamp(this.hitT / 0.4, 0, 1) * Math.PI);
      T.torso[0] += -0.28 * k; T.torso[2] += 0.2 * k * this.hitDir;
      T.head[0] += -0.3 * k;
      this.handBob.y -= 0.06 * k; this.handBob.z -= 0.05 * k;
      lift -= 0.03 * k;
    }
    this.rootTargetLift = lift;
    const k = 1 - Math.exp(-dt / this.blend);
    this._blendPosture(k);
    this._applyRotations();
    this._applyArms();
  }

  _blendPosture(k) {
    const P = this.P, T = this.T;
    for (const n of ROT_JOINTS) { const p = P[n], t = T[n]; p[0] += (t[0] - p[0]) * k; p[1] += (t[1] - p[1]) * k; p[2] += (t[2] - p[2]) * k; }
    this.rootLift += (this.rootTargetLift - this.rootLift) * k;
    this.hand.W.lerp(this.handT.W, k); this.hand.S.lerp(this.handT.S, k);
    this.wdir.lerp(this.wdirT, k).normalize();
  }

  _applyRotations() {
    for (const n of ROT_JOINTS) {
      const j = this.joints[n]; if (!j) continue;
      const p = this.P[n], c = this.C[n], r = this.rest[n].rot;
      j.rotation.set(r.x + p[0] + c[0], r.y + p[1] + c[1], r.z + p[2] + c[2]);
    }
    const inner = this.object.children[0];
    if (inner) inner.position.y = (inner.userData.__baseY ?? (inner.userData.__baseY = inner.position.y)) + this.rootLift;
    this.object.rotation.x = this.rootTiltX; this.object.rotation.z = this.rootTiltZ;
    this.object.updateMatrixWorld(true);
  }

  /** Two bone IK for both arms, the weapon socket oriented to the aim direction. */
  _applyArms() {
    const A = this.arms;
    if (!A.W) return;
    const rootQ = this.object.getWorldQuaternion(this._q2);
    const lift = this.rootLift;
    // weapon hand
    const tW = this._t.copy(this.hand.W).add(this.handBob); tW.y += lift;
    this.object.localToWorld(tW);
    const poleW = this._u.set(0.6 * Math.sign(A.W.S0x || 1), -0.7, -0.3).applyQuaternion(rootQ);
    this._solveArm(A.W, tW, poleW);
    // socket: barrel along the aim direction, no roll
    const sock = this.joints.weaponSocket;
    if (sock) {
      const Fw = this._v.copy(this.wdir).applyQuaternion(rootQ);
      const up = Math.abs(Fw.y) > 0.95 ? this._w.set(0, 0, 1).applyQuaternion(rootQ) : this._w.set(0, 1, 0);
      this._m.lookAt(Fw, new THREE.Vector3(0, 0, 0), up);
      const Qw = this._q.setFromRotationMatrix(this._m);
      const pq = sock.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      sock.quaternion.copy(pq.multiply(Qw));
      sock.updateMatrixWorld(true);
    }
    // support hand onto the handguard
    if (A.S) {
      let tS;
      if (this.gripL && this.state !== 'death') tS = this.gripL.getWorldPosition(this._t);
      else { tS = this._t.copy(this.hand.S).add(this.handBob); tS.y += lift; this.object.localToWorld(tS); }
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

  _death(dt) {
    this.deathT += dt;
    const k = clamp(this.deathT / 0.75, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    const T = this.T, S = this.sign, sW = this.sW;
    const yaw = this.object.rotation.y;
    const local = Math.atan2(this.deathDir.x, this.deathDir.z) - yaw;
    const tilt = e * (Math.PI / 2 - 0.08);
    this.rootTiltX = Math.cos(local) * tilt;
    this.rootTiltZ = -Math.sin(local) * tilt;
    this.rootTargetLift = Math.sin(e * Math.PI) * 0.08 - e * 0.12;
    T.lowerLegL[0] = S.knee * e * 1.1; T.lowerLegR[0] = S.knee * e * 0.7;
    T.upperLegL[0] = S.hip * e * 0.45; T.upperLegR[0] = S.hip * e * 0.15;
    T.torso[0] = -e * 0.3; T.torso[1] = e * 0.3 * sW; T.torso[2] = -Math.sin(local) * e * 0.2;
    T.head[0] = e * (this.headshot ? -0.7 : 0.5); T.head[2] = e * 0.3;
    // arms go loose and out; the weapon hand drops and the barrel follows it down
    this.handT.W.set(0.55 * sW, 0.75 - 0.25 * e, 0.25 + 0.1 * e);
    this.handT.S.set(-0.55 * sW, 0.8 - 0.2 * e, 0.10);
    this.wdirT.set(0.5 * sW, -0.7, 0.4).normalize();
    const kk = 1 - Math.exp(-dt / 0.09);
    this._blendPosture(kk);
    this._applyRotations();
    this._applyArms();
  }

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

export { JOINT_NAMES };
