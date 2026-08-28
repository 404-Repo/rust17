/**
 * player/viewmodel.js  (owner: player)
 *
 * First person arms and weapon, parented to the camera and rendered in the
 * same scene by the same lighting rig. No viewmodel light, ever: the last
 * time this method ran, a gun brighter than the room it stood in was the
 * tell that lost the blind rounds. The materials are exposed through
 * materials() so the render agent can register them with its CSM (a material
 * the CSM has not patched is lit by every cascade at once and glows).
 *
 * Orientation. The arms asset is authored "for the camera": hands 0.35 m
 * forward on +Z, 0.2 m below the origin, the right hand on +X. A three.js
 * camera looks down -Z, and no rotation maps +Z forward to -Z forward while
 * keeping +X on the right, so the holder mirrors Z (scale.z = -1), which the
 * renderer handles by flipping the front face. If an asset arrives with the
 * right hand on -X instead, a half turn about Y is used and nothing is
 * mirrored. Both cases are detected from the hand joints at load.
 *
 * The loader normalises every asset to "base at y 0, centred in XZ"; the arms
 * are authored about the camera origin, so that offset is removed after load.
 *
 * Animation is procedural: bob from the player's stride, sway that lags the
 * look, a spring kick on fire, a reload with the magazine leaving and
 * returning, a switch that drops the weapon out of frame, a sprint carry,
 * and a two bone IK that keeps the left hand on the weapon's gripL socket.
 *
 * Round 1 (player fix): the rifle was held low and small and its optic hood blocked the
 * ADS view. Hip pose raised and brought in, a hip scale and a smaller ADS scale (the
 * "viewmodel fov" trick without a second camera), a slight inward cant so the left side
 * of the receiver shows, ADS aligned on the weapon's `sight` socket (the optic window)
 * at a fixed eye relief instead of on the muzzle, the left hand placed so the palm wraps
 * the foregrip instead of the wrist sitting on it, the hand kept level after IK, and the
 * left elbow pulled under the weapon in ADS so the sleeve leaves the frame.
 */
import * as THREE from 'three';
import { ASSET } from '../../assetlib.js';
import { applyMaterials } from '../render/materials.js';   // materials r3: triplanar PBR sets, wraps vertexiseMaterials
import { collapsePerJoint } from '../ai/animation.js';

const WEAPON_ASSET = { ar: 'assault_rifle', smg: 'smg', dmr: 'marksman_rifle' };
const SIGHT = { ar: 0.075, smg: 0.060, dmr: 0.090 };   // fallback sight height over the muzzle when an asset has no `sight` socket
const ADS_EYE = { ar: 0.14, smg: 0.13, dmr: 0.10 };   // the DMR ocular sits close so the eyepiece fills, the zoom is the ADS fov     // eye relief in ADS, camera units, sight socket to lens
const HIP_SCALE = 0.70, ADS_SCALE = 0.62;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();

/** Rotation of `node` relative to `root`, ignoring scale (the asset tree carries none). */
function quatRel(node, root, out) {
  out.identity();
  const chain = [];
  for (let n = node; n && n !== root; n = n.parent) chain.push(n);
  for (let i = chain.length - 1; i >= 0; i--) out.multiply(chain[i].quaternion);
  return out;
}

function posRel(node, root, out) {
  root.updateMatrixWorld(true);
  node.getWorldPosition(out);
  return root.worldToLocal(out);
}

/** Two bone IK in the arms' local frame. upper and lower are joint nodes, end is the hand joint. */
function solveTwoBone(root, upper, lower, end, target, pole) {
  const S = posRel(upper, root, new THREE.Vector3());
  const E = posRel(lower, root, new THREE.Vector3());
  const H = posRel(end, root, new THREE.Vector3());
  const L1 = S.distanceTo(E), L2 = E.distanceTo(H);
  if (L1 < 1e-4 || L2 < 1e-4) return false;
  const d = clamp(S.distanceTo(target), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const axis = _v1.subVectors(target, S).normalize();
  // elbow bend direction: the rest elbow's offset off the axis, biased down and out
  const rest = _v2.subVectors(E, S);
  rest.addScaledVector(axis, -rest.dot(axis));
  if (pole) rest.addScaledVector(pole, 0.6);
  if (rest.lengthSq() < 1e-6) rest.set(0, -1, 0);
  rest.addScaledVector(axis, -rest.dot(axis)).normalize();
  const a = (L1 * L1 + d * d - L2 * L2) / (2 * d);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const Et = _v3.copy(S).addScaledVector(axis, a).addScaledVector(rest, h);
  rotateJoint(root, upper, S, E, Et);
  const E2 = posRel(lower, root, new THREE.Vector3());
  const H2 = posRel(end, root, new THREE.Vector3());
  rotateJoint(root, lower, E2, H2, target);
  return true;
}

function rotateJoint(root, joint, pivot, from, to) {
  const a = _v1.subVectors(from, pivot).normalize();
  const b = _v2.subVectors(to, pivot).normalize();
  if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) return;
  const rot = _q1.setFromUnitVectors(a, b);
  const qp = quatRel(joint.parent, root, _q2);
  const qpi = _q3.copy(qp).invert();
  // R_local' = (Qp^-1 * rot * Qp) * R_local
  const delta = qpi.multiply(rot).multiply(qp);
  joint.quaternion.premultiply(delta);
}

export class Viewmodel {
  constructor({ camera, quality, assetBase = './assets/' }) {
    this.camera = camera; this.quality = quality || {}; this.assetBase = assetBase;
    this.root = new THREE.Group(); this.root.name = 'viewmodel';
    this.holder = new THREE.Group(); this.holder.name = 'viewmodel_arms_holder';
    this.root.add(this.holder);
    // The weapon hangs off the root, not the hand: its position follows the hand's
    // weaponSocket every frame but its orientation is locked to the view axis, the way
    // every shooter does it, so a socket authored at a slight angle cannot point the
    // barrel at the sky. Mirrored in Z so the weapon's +Z muzzle faces the camera's -Z
    // with the sides kept (the renderer flips the front face for a reflected matrix).
    this.weaponHolder = new THREE.Group(); this.weaponHolder.name = 'viewmodel_weapon_holder';
    this.weaponHolder.scale.set(1, 1, -1);
    this.root.add(this.weaponHolder);
    // Apparent size. A 0.9 m rifle held 0.35 m from a 74 degree camera fills the frame;
    // shooters render the viewmodel at a narrower fov, and scaling the rig is the same
    // thing without a second camera or a second light.
    this.scale = HIP_SCALE; this.adsScale = ADS_SCALE;
    this.root.scale.setScalar(this.scale);
    if (camera) camera.add(this.root);
    this.arms = null; this.joints = {}; this.weapons = {}; this.sockets = {};
    this.current = null; this.weaponObj = null; this.loaded = false;
    this.mirrored = true;
    this.state = 'idle'; this.stateT = 0; this.stateDur = 0.5;
    this.adsT = 0; this.adsTarget = 0;
    this.sprintT = 0; this.bobK = 0; this.bobPhase = 0;
    this.swayX = 0; this.swayY = 0; this.swayVX = 0; this.swayVY = 0;
    this.kick = 0; this.kickV = 0; this.kickRoll = 0; this.kickYaw = 0;
    this.landDip = 0; this.wasGrounded = true;
    this.time = 0;
    this.adsOffset = new THREE.Vector3();
    // hip rest: sight window lands about 60% across and 66% down the frame, muzzle just right
    // of centre; the shoulders stay behind the lens
    this.restPos = new THREE.Vector3(0.020, -0.046, -0.07);
    this.hip = new THREE.Vector3(0.0, 0.0, 0.0);
    // camera space: forward is -Z, so +ry swings the muzzle LEFT (in toward the centre, showing
    // the left flank of the receiver the way the reference holds it) and +rx lifts it
    this.hipYaw = 0.17; this.hipPitch = 0.02; this.hipRoll = 0.12;
    this.adsDist = 0.16;
    this.socketPos = new THREE.Vector3();
    this.ikTarget = new THREE.Vector3(); this.ikHasTarget = false;
    this.leftPole = new THREE.Vector3(-0.6, -1, 0);
    this.leftPoleAds = new THREE.Vector3(-0.1, -1, 0.15);   // elbow straight under the weapon when aiming
    this.pole = new THREE.Vector3();
    this.handLRest = null;                                    // hand orientation to keep after IK
    this.palmL = new THREE.Vector3(0.042, 0.0, 0.10);          // foregrip position in the left hand's own frame (palm side +X, fingers +Z)
    this._mats = null;
    this.gripLLocal = new THREE.Vector3(); this.magRest = null;
  }

  async load() {
    const base = this.assetBase;
    const arms = await ASSET(base + 'viewmodel_arms.js', { keepHierarchy: true, surfaces: true });
    if (!arms || !arms.children.length) console.warn('[viewmodel] viewmodel_arms.js missing or empty');
    // undo the loader's base-at-y0 normalisation: the arms are authored about the camera origin
    if (arms.children[0]) arms.children[0].position.set(0, 0, 0);
    // integrator: the shipped viewmodel_arms.js carries the eye as the empty node sockets.camera
    // (the asset contract centres the group and puts its base at y 0, so the authored origin is
    // lost); move the group so that node sits on the camera origin. Without this the hands sat
    // 0.13 m ABOVE the eye and the shoulders behind it, a black wall across the top of the frame.
    const camNode = arms.userData.sockets && arms.userData.sockets.camera;
    if (camNode && camNode.isObject3D && arms.children[0]) {
      arms.updateMatrixWorld(true);
      const cp = posRel(camNode, arms, new THREE.Vector3());
      arms.children[0].position.sub(cp);
      arms.updateMatrixWorld(true);
    }
    this.arms = arms; this.joints = arms.userData.joints || {};
    // integrator: 310 viewmodel meshes in the first run; collapse to one mesh per joint per surface
    applyMaterials(arms, { asset: 'viewmodel_arms', local: true, detail: 0.6 });   // materials r3: was vertexiseMaterials(arms); projected in the arms' own space so the cloth does not swim
    collapsePerJoint(arms, [...Object.values(this.joints), ...Object.values(arms.userData.sockets || {})].filter((n) => n && n.isObject3D), { bakeColors: false });
    this.holder.add(arms);
    // right hand on screen right, hands forward (-Z in camera space)
    const hR = this.joints.handR, hL = this.joints.handL;
    let rightOnPlusX = true;
    if (hR && hL) {
      arms.updateMatrixWorld(true);
      const pr = posRel(hR, arms, new THREE.Vector3()), pl = posRel(hL, arms, new THREE.Vector3());
      rightOnPlusX = pr.x >= pl.x;
    }
    if (rightOnPlusX) { this.holder.scale.set(1, 1, -1); this.holder.rotation.set(0, 0, 0); this.mirrored = true; }
    else { this.holder.scale.set(1, 1, 1); this.holder.rotation.set(0, Math.PI, 0); this.mirrored = false; }
    this._prepMeshes(arms);

    const loads = Object.entries(WEAPON_ASSET).map(async ([key, name]) => {
      const w = await ASSET(base + name + '.js', { keepHierarchy: true, surfaces: true });
      if (!w || !w.children.length) console.warn(`[viewmodel] weapon asset missing: ${name}`);
      applyMaterials(w, { asset: name, local: true, detail: 0.15 });   // materials r3: was vertexiseMaterials(w)
      collapsePerJoint(w, Object.values(w.userData.sockets || {}).filter((n) => n && n.isObject3D), { bakeColors: false });
      this._prepMeshes(w);
      w.visible = false;
      this.weapons[key] = w;
    });
    await Promise.all(loads);
    this.loaded = true;
    this._mats = null;
    if (!this.current) this.setWeapon('ar');
    return this;
  }

  _prepMeshes(obj) {
    // integrator: the viewmodel gets its own copies of the shared surface materials, FrontSide,
    // so a sleeve passing the near plane shows nothing instead of its unlit inside (a black slab
    // across the lower right of the frame in the first filmstrip)
    if (!this._ownMats) this._ownMats = new Map();
    obj.traverse((o) => {
      if (o.isMesh) {
        if (!Array.isArray(o.material) && o.material) {
          let mm = this._ownMats.get(o.material);
          if (!mm) { mm = o.material.clone(); mm.side = THREE.FrontSide; mm.name = o.material.name; this._ownMats.set(o.material, mm); }
          o.material = mm;
        }
        o.castShadow = false; o.receiveShadow = true; o.frustumCulled = false;
        // the arms and gun sit between the near plane and everything else; draw them last
        o.renderOrder = 10;
      }
    });
  }

  /** Every material on the arms and weapons, for the render rig's CSM setup. */
  materials() {
    if (this._mats) return this._mats;
    const set = new Set();
    this.root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && set.add(m)); });
    this._mats = [...set];
    return this._mats;
  }

  setWeapon(key) {
    const w = this.weapons[key];
    if (!w) { this.current = key; return; }
    if (this.weaponObj && this.weaponObj.parent) { this.weaponObj.parent.remove(this.weaponObj); this.weaponObj.visible = false; }
    this.current = key; this.weaponObj = w; w.visible = true;
    let socket = this.joints.weaponSocket;
    if (!socket) {
      socket = new THREE.Group(); socket.name = 'weaponSocket_fallback';
      socket.position.set(0.12, -0.2, 0.35);
      (this.arms || this.holder).add(socket);
      this.joints.weaponSocket = socket;
    }
    this.socket = socket;
    const holder = this.weaponHolder;
    holder.add(w);
    w.position.set(0, 0, 0); w.rotation.set(0, 0, 0); w.scale.set(1, 1, 1);
    this.sockets = w.userData.sockets || {};
    // put gripR exactly on the holder origin, and the holder on the hand socket
    if (this.sockets.gripR) {
      holder.updateMatrixWorld(true);
      const gp = this.sockets.gripR.getWorldPosition(new THREE.Vector3());
      holder.worldToLocal(gp);
      w.position.sub(gp);
    }
    this._followSocket();
    // mag rest transform for the reload animation
    if (this.sockets.mag) {
      this.magRest = { pos: this.sockets.mag.position.clone(), rot: this.sockets.mag.rotation.clone() };
    } else this.magRest = null;
    // ADS offset: bring the sight line onto the camera axis
    this._computeAds(key);
    this.ikHasTarget = !!(this.sockets.gripL && this.joints.upperArmL && this.joints.lowerArmL && this.joints.handL);
  }

  /** Weapon holder onto the hand's weaponSocket, in root space. */
  _followSocket() {
    if (!this.socket) return;
    this.root.updateMatrixWorld(true);
    posRel(this.socket, this.root, this.socketPos);
    this.weaponHolder.position.copy(this.socketPos);
  }

  _computeAds(key) {
    const cam = this.camera; if (!cam) return;
    // measure the muzzle in CAMERA space with the root at its rest transform
    const p = this.root.position.clone(), r = this.root.rotation.clone();
    this.root.position.set(0, 0, 0); this.root.rotation.set(0, 0, 0);
    cam.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
    const s0 = this.root.scale.x;
    this.root.scale.setScalar(this.adsScale);
    cam.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
    const m = new THREE.Vector3();
    this.adsDist = ADS_EYE[key] || 0.16;
    if (this.sockets.sight) {
      // the optic window centre goes on the camera axis at the eye relief
      this.sockets.sight.getWorldPosition(m);
      cam.worldToLocal(m);
      this.adsOffset.set(-m.x, -m.y, -this.adsDist - m.z);
    } else {
      if (this.sockets.muzzle) this.sockets.muzzle.getWorldPosition(m);
      else if (this.weaponObj) { const b = new THREE.Box3().setFromObject(this.weaponObj); b.getCenter(m); m.z = b.min.z; }
      else m.copy(cam.position);
      cam.worldToLocal(m);
      const sight = (SIGHT[key] || 0.07) * this.adsScale;
      this.adsOffset.set(-m.x, -m.y - sight, 0.05);
    }
    this.root.scale.setScalar(s0);
    this.root.position.copy(p); this.root.rotation.copy(r);
  }

  play(state, duration) {
    if (state === 'fire') {
      this.kickV += 1.0; this.kickRoll = (Math.random() - 0.5); this.kickYaw = (Math.random() - 0.5);
      return;
    }
    if (state === 'idle') { this.state = 'idle'; this.stateT = 0; return; }
    if (state === 'sprint') { this.state = 'sprint'; this.stateT = 0; return; }
    this.state = state; this.stateT = 0;
    this.stateDur = duration || (state === 'reload' ? 2.0 : state === 'switch' ? 0.45 : 0.6);
  }

  setADS(t) { this.adsTarget = clamp(t, 0, 1); }

  muzzleWorld(out = new THREE.Vector3()) {
    if (this.camera) this.camera.updateMatrixWorld(true);
    this.root.updateMatrixWorld(true);
    if (this.sockets.muzzle) return this.sockets.muzzle.getWorldPosition(out);
    if (this.camera) {
      const f = _v1.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const r = _v2.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      out.copy(this.camera.position).addScaledVector(f, 0.65).addScaledVector(r, 0.1);
      out.y -= 0.12;
      return out;
    }
    return out.set(0, 0, 0);
  }

  update(dt, ctx = {}) {
    if (!dt) return;
    this.time += dt;
    const { moving = false, sprinting = false, grounded = true, yawDelta = 0, pitchDelta = 0, speed = 0, crouched = false, bobPhase = null, alive = true } = ctx;
    // a dead player drops the weapon out of frame; it comes back on respawn
    this.deadT = alive ? 0 : (this.deadT || 0) + dt;
    this.root.visible = alive || this.deadT < 0.35;
    const busy = this.state === 'reload' || this.state === 'switch' || this.state === 'grenade';
    this.adsT = damp(this.adsT, busy ? 0 : this.adsTarget, 16, dt);
    this.sprintT = damp(this.sprintT, sprinting && !busy ? 1 : 0, 9, dt);
    const bobTarget = moving ? clamp(speed / 4.2, 0.35, 1.6) : 0;
    this.bobK = damp(this.bobK, bobTarget * (1 - this.adsT * 0.9), 8, dt);
    if (bobPhase != null) this.bobPhase = bobPhase;                       // in step with the player's feet
    else if (moving) this.bobPhase += dt * Math.PI * (speed / (sprinting ? 1.95 : crouched ? 1.0 : 1.5));

    // sway lags the look: velocity from this frame's turn, damped spring
    const sx = clamp(-yawDelta / Math.max(dt, 1e-3), -6, 6), sy = clamp(-pitchDelta / Math.max(dt, 1e-3), -6, 6);
    this.swayX = damp(this.swayX, sx * 0.016 * (1 - this.adsT * 0.8), 9, dt);
    this.swayY = damp(this.swayY, sy * 0.016 * (1 - this.adsT * 0.8), 9, dt);

    // kick spring
    this.kick += this.kickV * dt * 28;
    this.kickV = damp(this.kickV, 0, 34, dt);
    this.kick = damp(this.kick, 0, 14, dt);

    // landing
    if (grounded && !this.wasGrounded) this.landDip = 0.05;
    this.wasGrounded = grounded;
    this.landDip = damp(this.landDip, 0, 10, dt);

    // state clocks
    if (busy) { this.stateT += dt; if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; } }

    // ---- compose the root transform (camera space, -Z forward)
    const pos = _v4.copy(this.restPos).add(this.hip);
    const ads = smooth(this.adsT);
    let rx = this.hipPitch * (1 - ads), ry = this.hipYaw * (1 - ads), rz = this.hipRoll * (1 - ads);
    // idle breathing
    pos.y += Math.sin(this.time * 1.4) * 0.0022 * (1 - this.adsT);
    rx += Math.sin(this.time * 0.9) * 0.002 * (1 - this.adsT);
    ry += Math.sin(this.time * 0.6 + 1) * 0.0015 * (1 - this.adsT);
    // bob: figure eight, a stride you can see in a still
    const A = (sprinting ? 0.028 : crouched ? 0.009 : 0.015) * this.bobK;
    pos.x += Math.sin(this.bobPhase) * A;
    pos.y += (Math.cos(this.bobPhase * 2) - 1) * 0.5 * A * 1.1;
    rz += Math.sin(this.bobPhase) * 0.018 * this.bobK * (0.5 + this.sprintT);
    rx += Math.cos(this.bobPhase * 2) * 0.008 * this.bobK;
    ry += Math.sin(this.bobPhase) * 0.006 * this.bobK;
    // sway
    pos.x += this.swayX * 0.6; pos.y += this.swayY * 0.4;
    ry += this.swayX * 1.4; rx += this.swayY * 1.1; rz += this.swayX * 0.5;
    // landing
    pos.y -= this.landDip;
    if (!alive) { const f = clamp(this.deadT / 0.35, 0, 1); pos.y -= 0.5 * f * f; rx -= 0.9 * f; rz += 0.5 * f; }
    rx -= this.landDip * 1.2;
    // sprint carry: lowered, turned in, muzzle down
    const sp = this.sprintT;
    pos.x += 0.045 * sp; pos.y -= 0.055 * sp; pos.z += 0.02 * sp;
    ry += 0.42 * sp; rx -= 0.28 * sp; rz += 0.18 * sp;
    // ADS: sight window to the camera axis, rig shrinks toward the ADS scale
    pos.lerp(_v1.copy(this.adsOffset), ads);
    this.root.scale.setScalar(lerp(this.scale, this.adsScale, ads));
    // kick: back and up, a little roll
    const k = this.kick;
    pos.z += k * 0.035; pos.y += k * 0.004;
    rx += k * (0.045 + 0.02 * this.kickRoll) * (1 - ads * 0.5);
    ry += k * 0.015 * this.kickYaw;
    rz += k * 0.02 * this.kickRoll;
    // reload / switch / grenade
    let magT = 0, handToMag = 0;
    if (this.state === 'reload') {
      const t = clamp(this.stateT / this.stateDur, 0, 1);
      const arc = Math.sin(Math.PI * t);
      pos.y -= 0.07 * arc; pos.x += 0.02 * arc;
      rx -= 0.28 * arc; rz += 0.22 * arc; ry += 0.12 * arc;
      // magazine out between 0.2 and 0.45, back in between 0.55 and 0.8; rack at 0.9
      if (t < 0.2) magT = 0;
      else if (t < 0.45) magT = smooth((t - 0.2) / 0.25);
      else if (t < 0.55) magT = 1;
      else if (t < 0.8) magT = 1 - smooth((t - 0.55) / 0.25);
      else magT = 0;
      handToMag = t > 0.1 && t < 0.85 ? smooth(clamp(Math.min(t - 0.1, 0.85 - t) / 0.1, 0, 1)) : 0;
      if (t > 0.86 && t < 0.96) { const j = Math.sin(Math.PI * (t - 0.86) / 0.1); pos.z += 0.02 * j; rx += 0.03 * j; }
    } else if (this.state === 'switch') {
      const t = clamp(this.stateT / this.stateDur, 0, 1);
      const down = 1 - Math.abs(t * 2 - 1);
      pos.y -= 0.38 * smooth(down); rx -= 0.55 * smooth(down); rz += 0.15 * down;
    } else if (this.state === 'grenade') {
      const t = clamp(this.stateT / this.stateDur, 0, 1);
      const arc = Math.sin(Math.PI * t);
      pos.y -= 0.12 * arc; pos.x += 0.05 * arc; rx -= 0.35 * arc; ry += 0.3 * arc;
    }
    this.root.position.copy(pos);
    this.root.rotation.set(rx, ry, rz);

    // magazine
    if (this.magRest && this.sockets.mag) {
      const m = this.sockets.mag;
      m.position.copy(this.magRest.pos); m.rotation.copy(this.magRest.rot);
      if (magT > 0) { m.position.y -= 0.16 * magT; m.rotation.x += 0.25 * magT; }
      m.visible = magT < 0.999;
    }

    // weapon follows the right hand socket, orientation stays on the view axis
    this._followSocket();

    // left hand IK onto gripL (or the magazine during a reload). The target is the WRIST, so
    // the grip is moved from the socket into the palm by the hand's own frame; the hand
    // keeps its authored orientation after the solve so the fingers stay wrapped round the
    // foregrip whatever the elbow does.
    if (this.ikHasTarget && this.arms) {
      this.arms.updateMatrixWorld(true);
      const tgt = this.ikTarget;
      if (handToMag > 0 && this.sockets.mag) {
        this.sockets.mag.getWorldPosition(_v2);
        this.sockets.gripL.getWorldPosition(_v3);
        _v2.lerp(_v3, 1 - handToMag);
        this.arms.worldToLocal(_v2);
        tgt.copy(_v2);
      } else {
        this.sockets.gripL.getWorldPosition(_v3);
        this.arms.worldToLocal(_v3);
        tgt.copy(_v3);
      }
      const hand = this.joints.handL;
      if (!this.handLRest) this.handLRest = quatRel(hand, this.arms, new THREE.Quaternion());
      // wrist = grip - R_hand * palmOffset  (grip sits against the palm, inside the fingers)
      _v2.copy(this.palmL).applyQuaternion(this.handLRest);
      tgt.sub(_v2);
      this.pole.copy(this.leftPole).lerp(this.leftPoleAds, ads);
      solveTwoBone(this.arms, this.joints.upperArmL, this.joints.lowerArmL, hand, tgt, this.pole);
      // hold the hand's authored orientation: q_local = inverse(q_parent_rel) * q_rest_rel
      quatRel(hand.parent, this.arms, _q2).invert();
      hand.quaternion.copy(_q2).multiply(this.handLRest);
    }
  }
}
