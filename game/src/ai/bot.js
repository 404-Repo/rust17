/**
 * One soldier bot. Loads its own articulated soldier (keepHierarchy, per instance), hangs a
 * weapon on the hand, and runs a small state machine over the nav grid: advance along the
 * squad's lane, engage what it sees, break for cover within half a second of being shot,
 * peek and fire in bursts, flank through the wadi or the trench when the squad says so,
 * retreat when low, fall over when dead and stay on the ground until the squad respawns it.
 *
 * Weapon numbers mirror player/weapons.js WEAPONS from docs/ARCHITECTURE.md (they are the
 * contract, copied here so the ai module loads without the player module). Bot spread is
 * 2x the player's hip spread; reaction time 0.35 s at point blank to 0.7 s at 60 m.
 */
import * as THREE from 'three';
import { ASSET } from '../../assetlib.js?v=r18-202608291915';
import { loadGlbSoldier } from './glbsoldier.js?v=r18-202608291915';
import { applyTeamLook, attachTeamMarks, teamLookEnabled } from './teamlook.js?v=r18-202608291915';   // round 10: abstract team colour figures   // round 8: skinned soldiers from Atlas (Titan v1 + rig_humanoid_mesh)
import { SoldierRig } from './animation.js?v=r18-202608291915';
import { applyMaterials } from '../render/materials.js?v=r18-202608291915';   // materials r3: triplanar PBR sets, wraps vertexiseMaterials

export const BOT_WEAPONS = {
  // integrator: spread was 2x the player's HIP cone (0.020 / 0.032 / 0.012); a bot shoulders its rifle,
  // so it is now 1.5x hip (5x the player's ADS cone). At 0.020 a bot at 60 m landed one round in ten seconds.
  ar:  { asset: 'assault_rifle',  damage: 28, headMult: 2.0, rpm: 720, spread: 0.015, range: 80,  burst: [3, 6] },
  smg: { asset: 'smg',            damage: 20, headMult: 1.8, rpm: 900, spread: 0.024, range: 45,  burst: [4, 8] },
  dmr: { asset: 'marksman_rifle', damage: 60, headMult: 2.5, rpm: 220, spread: 0.008, range: 140, burst: [1, 2] },
};
const BOT_DAMAGE_TO_PLAYER = 0.7;    // bots hit the player a little softer than the numbers say; CoD does the same
const WALK = 3.2, RUN = 5.4, CROUCH_WALK = 1.8, CLIMB = 1.2;
// integrator r1: how far past the weapon's range a bot will open fire. Bot against bot stays at
// 1.1 (the round 0 value); at the human it is 1.4 so the road bots start shooting at 110 m, where
// first contact on this map happens, instead of walking 25 m in silence under the player's rifle.
// Damage still falls to 55 percent at 1.8 x range (weapons contract).
const fireReach = (t) => (t && !t.hitboxes ? 1.4 : 1.1);
const SEE_RANGE = 75, SEE_HALF_CONE = (110 / 2) * Math.PI / 180;   // integrator: was 60; first contact on this map is at 60 to 80 m and bots stood silent at 65 m
const GRAVITY = 14;
// fix4 ai: a bot that has seen or been shot at inside this window keeps its rifle shouldered
// (the 'aim' posture, both hands on the weapon) whether it is standing, walking or stepping out
// of cover; only a full run drops the rifle across the chest. The critic saw a hostile "in the same
// rigid pose in two frames with the rifle held loose": that was a bot hiding at high cover with no
// target, which the round 3 rule left in the low ready idle for up to ten seconds.
const ALERT_HOLD = 6.0;
const RUN_POSE_SPEED = 4.2;          // above this the rig runs; below it an alert bot walks shouldered
// fix4 ai: bodies stay on the sand after the squad respawns the bot (CoD leaves them for the round).
// A corpse is a flat copy of the bot's meshes in its final death pose; geometry and materials are
// shared, so the cost is draw calls only (about 20 per body, capped at 4 bodies, 25 s each).
const CORPSE_LIFE = 25, CORPSE_MAX = 4;
const CORPSES = [];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3(), _ray = new THREE.Ray();
const _boxV = new THREE.Vector3();

let SEQ = 0;

export class Bot {
  constructor({ id, name, team = 'militia', scene, world, nav, events, quality, weaponKey = 'ar' }) {
    this.id = id ?? `bot${++SEQ}`;
    this.name = name || this.id;
    this.team = team;
    this.scene = scene; this.world = world; this.nav = nav; this.events = events; this.quality = quality;
    this.weaponKey = BOT_WEAPONS[weaponKey] ? weaponKey : 'ar';
    this.weapon = BOT_WEAPONS[this.weaponKey];
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.yawTarget = 0;
    this.hp = 100; this.alive = true;
    this.object = new THREE.Group(); this.object.name = `bot_${this.id}`;
    this.object.rotation.order = 'YXZ';
    if (scene) scene.add(this.object);
    this.rig = null; this.model = null; this.weaponObject = null;
    this.state = 'patrol';
    this.crouched = false; this.grounded = false; this.speed = 0;
    this.objective = null;              // { lane, waypoints, index, hold, flank }
    this.path = []; this.pathIdx = 0; this.pathGoal = new THREE.Vector3(); this.repathT = 0;
    this.target = null; this.targetChest = new THREE.Vector3(); this.lastKnown = new THREE.Vector3(); this.lastSeenT = -99;
    this.reactT = 0; this.burstLeft = 0; this.burstPause = 0; this.fireT = 0;
    this.underFireT = 0; this.lastHitFrom = new THREE.Vector3(); this.regenT = 0;
    this.cover = null; this.coverT = 0; this.peek = false; this.peekT = 0; this.coverSince = 0;
    this.engageT = 0; this.strafeT = 0; this.strafeTo = null;
    this.stuckT = 0; this.lastPos = new THREE.Vector3(); this.direct = false; this.unstickT = 0; this.unstickSide = 1;
    this.senseT = Math.random() * 0.1;
    this.deadT = 0; this.time = 0;
    this.alertT = 0; this.alertPitch = 0; this.hideCrouch = false; this.frozen = false;
    this.ctx = null;
    this.loaded = false;
    this._deathHeadshot = false;
  }

  entity() { return { id: this.id, name: this.name, team: this.team }; }

  async load() {
    const soldier = this.team === 'rangers' ? 'friendly_soldier' : 'enemy_soldier';
    // round 8: '?soldiers=titan' (default) loads the skinned Atlas soldiers (assets/<name>_titan.glb, textures as
    // generated, no collapse: the skin must stay one mesh); '?soldiers=js' is the coded round 4 figure.
    let src = 'js';   // Ben 2026-08-29 09:22: "the soldiers are also bad, let's remove those meshes"; GLBs stay behind ?soldiers=titan
    try { const q = new URLSearchParams(location.search).get('soldiers'); if (q) src = q; } catch (e) { /* no location */ }
    let model;
    if (src !== 'js') {
      model = await loadGlbSoldier(`./assets/${soldier}_${src}.glb`, { height: 1.8, name: soldier });
      this.model = model;
      this.object.add(model);
      this.rig = new SoldierRig(model, { collapse: false });
    } else {
      model = await ASSET(`./assets/${soldier}.js`, { keepHierarchy: true, surfaces: true });
      if (!model.userData || !model.userData.joints) console.warn(`[bot] ${soldier} arrived without joints (missing asset or merged); ${this.id} will not animate`);
      this.model = model;
      // round 10: with the team look the set is forced to the neutral canvas_tan (olive_fabric's green basecolor
      // turned the rangers' slate blue into grey green)
      const look = teamLookEnabled();
      if (look) applyTeamLook(model, this.team);
      applyMaterials(model, { asset: soldier, unify: true, local: true, set: look ? 'canvas_tan' : undefined });   // materials r3: was vertexiseMaterials(model, { unify: true }); one set per soldier, projected in its own space
      if (look) attachTeamMarks(model, this.team);
      this.object.add(model);
      this.rig = new SoldierRig(model);
    }
    const wep = await ASSET(`./assets/${this.weapon.asset}.js`, { keepHierarchy: true, surfaces: true });
    applyMaterials(wep, { asset: this.weapon.asset, unify: true, local: true, detail: 0.15 });   // materials r3: was vertexiseMaterials(wep, { unify: true })
    if (wep.children.length) { this.weaponObject = wep; this.rig.attachWeapon(wep); }
    else console.warn(`[bot] weapon ${this.weapon.asset} missing for ${this.id}`);
    this.loaded = true;
    this.object.position.copy(this.pos); this.object.rotation.y = this.yaw;
    return this;
  }

  // ---------------------------------------------------------------- squad hooks
  setObjective(obj) {
    this.objective = obj ? { index: 0, ...obj } : null;
    this.path = []; this.pathIdx = 0;
    if (this.state === 'patrol' || this.state === 'advance' || this.state === 'flank') this.state = obj && obj.flank ? 'flank' : 'advance';
  }

  respawn(x, z, yaw = 0) {
    if (!this.alive && this.deadT > 0.9) this._leaveCorpse();
    this.alertT = 0; this.alertPitch = 0; this.hideCrouch = false;
    this.pos.set(x, this.nav ? this.nav.groundY(x, z) : 0, z);
    this.vel.set(0, 0, 0);
    this.yaw = this.yawTarget = yaw;
    this.hp = 100; this.alive = true; this.deadT = 0;
    this.state = 'patrol';
    this.path = []; this.pathIdx = 0; this.objective = null;
    this.target = null; this.cover = null; this.peek = false; this.underFireT = 0; this.direct = false; this.stuckT = 0;
    this.burstLeft = 0; this.burstPause = 0; this.reactT = 0; this.engageT = 0;
    if (this.rig) this.rig.reset();
    this.object.visible = true;
    this.object.position.copy(this.pos); this.object.rotation.set(0, this.yaw, 0);
    this.lastPos.copy(this.pos);
  }

  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + (this.crouched ? 1.1 : 1.6), this.pos.z); }
  chest(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + (this.crouched ? 0.85 : 1.25), this.pos.z); }

  hitboxes() { return this.alive && this.rig ? this.rig.hitboxes() : []; }

  // ---------------------------------------------------------------- damage
  takeDamage(amount, fromPos, byId) {
    if (!this.alive) return;
    this.hp -= amount;
    this.underFireT = 1.5; this.regenT = 5; this.alertT = ALERT_HOLD;
    if (fromPos) this.lastHitFrom.copy(fromPos);
    if (this.events) this.events.emit('damage', { target: this.entity(), amount, fromPos: fromPos ? fromPos.clone() : this.pos.clone() });
    if (this.hp <= 0) { this._die(fromPos, amount >= 50); return; }
    if (this.rig) this.rig.setState('hit');
    if (fromPos) {
      this.yawTarget = Math.atan2(fromPos.x - this.pos.x, fromPos.z - this.pos.z);
      this.lastKnown.copy(fromPos); this.lastSeenT = this.time - 0.5;
    }
    // under fire: cover within 0.5 s; new cover if the current one does not face the shooter
    const threat = fromPos || this.lastKnown;
    let needCover = this.state !== 'cover' || !this.cover;
    if (!needCover && fromPos) {
      const tx = fromPos.x - this.cover.point.x, tz = fromPos.z - this.cover.point.z, tl = Math.hypot(tx, tz) || 1;
      if ((this.cover.normal.x * tx + this.cover.normal.z * tz) / tl < 0.3) needCover = true;
    }
    if (needCover && !this._seekCover(threat, 18)) this._seekCover(threat, 30);
  }

  _die(fromPos, big) {
    this.hp = 0; this.alive = false; this.state = 'dead'; this.deadT = 0; this.speed = 0; this.vel.set(0, 0, 0);
    this.target = null; this.path = []; this.cover = null; this.peek = false; this.burstLeft = 0;
    this.crouched = false;
    if (this.rig) {
      const d = fromPos ? _v.subVectors(this.pos, fromPos) : _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).negate();
      d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); d.normalize();
      this.rig.deathDir.copy(d); this.rig.headshot = !!big;
      this.rig.setState('death');
    }
  }

  // ---------------------------------------------------------------- perception
  _enemies() {
    const out = [];
    const ctx = this.ctx; if (!ctx) return out;
    if (ctx.player && ctx.player.alive !== false && (ctx.player.team || 'rangers') !== this.team) out.push(ctx.player);
    for (const b of ctx.bots || []) if (b !== this && b.alive && b.team !== this.team) out.push(b);
    return out;
  }

  _chestOf(e, out) {
    if (e.chest) return e.chest(out);
    return out.set(e.pos.x, e.pos.y + (e.crouched ? 0.85 : 1.25), e.pos.z);
  }

  visibleTarget() {
    const eye = this.eye(_v);
    let best = null, bestD = SEE_RANGE;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const e of this._enemies()) {
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      let d = Math.hypot(dx, dz, e.pos.y - this.pos.y);
      // integrator: the human is the preferred target and is noticed further out (CoD bots weight
      // the player the same way); with four friendly bots ahead of the player the militia never
      // fired at them inside the first twenty seconds. Weapon range still gates the trigger.
      if (!e.hitboxes) d *= 0.6;
      if (d > bestD) continue;
      const cos = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1e-6);
      if (d > 3 && cos < Math.cos(SEE_HALF_CONE)) continue;
      const chest = this._chestOf(e, _w);
      if (this.world && !this.world.lineOfSight(eye, chest)) continue;
      best = e; bestD = d;
    }
    return best;
  }

  // ---------------------------------------------------------------- pathing
  _pathTo(goal, opts) {
    if (!this.nav) { this.path = [goal.clone()]; this.pathIdx = 0; return true; }
    const p = this.nav.findPath(this.pos, goal, opts);
    this.path = p; this.pathIdx = 0; this.pathGoal.copy(goal); this.repathT = rnd(2.5, 4);
    this.direct = false; this.stuckT = 0;
    return p.length > 0;
  }

  _pathDone() { return this.pathIdx >= this.path.length; }

  _arrived(goal, r = 0.7) { return Math.hypot(goal.x - this.pos.x, goal.z - this.pos.z) < r && Math.abs(goal.y - this.pos.y) < 2.2; }

  /** Follow the current path; returns the desired horizontal move direction (unit) or null at the end. */
  _followPath(out) {
    while (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const near = wp.link ? 0.45 : 0.6;
      if (this._arrived(wp, near)) { this.pathIdx++; this.direct = false; this.stuckT = 0; continue; }
      out.set(wp.x - this.pos.x, 0, wp.z - this.pos.z);
      const l = out.length();
      if (l > 1e-4) out.divideScalar(l);
      return wp;
    }
    return null;
  }

  _seekCover(threat, radius = 18) {
    if (!this.nav || !threat) return false;
    const avoid = [];
    if (this.ctx && this.ctx.bots) for (const b of this.ctx.bots) if (b !== this && b.alive && b.team === this.team && b.cover) avoid.push(b.cover.point);
    const c = this.nav.coverNear(this.pos, threat, radius, { avoid });
    if (!c) return false;
    this.cover = c; this.state = 'cover'; this.coverSince = this.time; this.peek = false; this.peekT = rnd(0.6, 1.2); this.coverT = 0;
    this._pathTo(c.point);
    return true;
  }

  // ---------------------------------------------------------------- update
  update(dt, ctx) {
    this.ctx = ctx; this.time = ctx && ctx.time !== undefined ? ctx.time : this.time + dt;
    if (!this.alive) {
      this.deadT += dt;
      if (this.rig) this.rig.update(dt, { speed: 0 });
      return;
    }
    if (this.frozen) { if (this.rig) this.rig.update(dt, { speed: 0 }); return; }
    if (this.underFireT > 0) this.underFireT -= dt;
    if (this.alertT > 0) this.alertT -= dt;
    if (this.regenT > 0) this.regenT -= dt; else if (this.hp < 100) this.hp = Math.min(100, this.hp + 6 * dt);

    // senses at 10 Hz, staggered
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT += 0.1;
      const t = this.visibleTarget();
      // integrator r1: the reaction clock restarts only after a real loss of contact (0.8 s). The
      // player walking behind a palm trunk flickered the target every few tenths and the road
      // bots never finished a reaction in the whole first contact.
      if (t && t !== this.target && (t !== this.lastTarget || this.time - this.lastSeenT > 0.8)) { this.reactT = 0.35 + 0.35 * clamp(this.pos.distanceTo(t.pos) / 60, 0, 1); this.burstLeft = 0; this.burstPause = 0; }
      if (t) this.lastTarget = t;
      if (t) { this.lastSeenT = this.time; this.lastKnown.copy(t.pos); this.alertT = ALERT_HOLD; }
      this.target = t;
    }
    if (this.target && (!this.target.alive || (this.target.alive === undefined && this.target.hp <= 0))) this.target = null;

    this._think(dt);
    const move = _u.set(0, 0, 0);
    let speed = 0, climbing = false;
    const r = this._move(dt, move);
    speed = r.speed; climbing = r.climbing;
    this._integrate(dt, move, speed, climbing);
    this._fireControl(dt);

    // facing
    let dy = this.yawTarget - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const turn = clamp(dy, -9 * dt, 9 * dt);
    this.yaw += turn;

    // animation (fix4 ai): in contact the rifle stays at the shoulder at every speed short of a
    // run, so a bot walking to cover, hiding behind it, stepping out to peek or strafing in a
    // firefight is the shouldered figure of the reference, not the low ready idle. The pitch
    // follows the target, or the last known position while the bot is alert, and settles to
    // level otherwise.
    if (this.rig) {
      const contact = !!this.target || this.alertT > 0;
      let st = 'idle';
      if (climbing) st = 'walk';
      else if (this.crouched) st = 'crouch';
      else if (this.speed > RUN_POSE_SPEED) st = 'run';
      else if (contact) st = 'aim';
      else if (this.speed > 0.3) st = 'walk';
      let pitch = 0;
      if (this.target) pitch = this.pitch;
      else if (contact) { const e = this.eye(_v); pitch = Math.atan2(this.lastKnown.y + 1.2 - e.y, Math.max(1, Math.hypot(this.lastKnown.x - e.x, this.lastKnown.z - e.z))); }
      this.alertPitch += (clamp(pitch, -0.6, 0.6) - this.alertPitch) * Math.min(1, dt * 6);
      this.rig.setState(st, st === 'aim' ? 0.12 : 0.18);
      this.rig.update(dt, { speed: climbing ? 1.5 : this.speed, aimPitch: this.alertPitch, crouch: this.crouched });
    }
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
  }

  _think(dt) {
    const tgt = this.target;
    const seenAgo = this.time - this.lastSeenT;
    const threat = tgt ? tgt.pos : (seenAgo < 10 ? this.lastKnown : (this.underFireT > 0 ? this.lastHitFrom : null));

    // low health and nobody in sight: fall back to cover away from the last threat
    if (this.hp < 30 && this.state !== 'retreat' && this.state !== 'cover') {
      if (threat) { this._seekCover(threat, 30); if (this.state === 'cover') return; }
      this.state = 'retreat';
      const back = this.nav ? this.nav.randomPointNear(_v.set(this.pos.x + (this.team === 'rangers' ? -14 : 14), this.pos.y, this.pos.z), 6) : this.pos.clone();
      this._pathTo(back);
      return;
    }

    switch (this.state) {
      case 'patrol':
      case 'advance':
      case 'flank': {
        if (tgt) {
          this.state = 'engage'; this.engageT = 0; this.strafeT = 0;
          this.path = [];
          return;
        }
        if (!this.objective) {
          // no orders: wander near the current position toward the last known enemy
          if (this._pathDone()) {
            const goal = threat && seenAgo < 10 ? this.nav.randomPointNear(threat, 6) : this.nav.randomPointNear(this.pos, 8);
            this._pathTo(goal);
          }
          return;
        }
        const o = this.objective;
        if (this._pathDone()) {
          if (o.index < o.waypoints.length) {
            const wp = o.waypoints[o.index];
            if (this._arrived(wp, 2.5)) { o.index++; return; }
            if (!this._pathTo(wp)) { o.index++; }   // unreachable waypoint: skip it
          } else {
            // at the lane end: hold, roaming a few metres around the hold point
            this.state = 'patrol';
            const h = o.hold || o.waypoints[o.waypoints.length - 1] || this.pos;
            this._pathTo(this.nav ? this.nav.randomPointNear(h, 7) : h);
          }
        }
        break;
      }
      case 'engage': {
        this.engageT += dt;
        if (!tgt) {
          if (seenAgo > 4) { this.state = this.objective && this.objective.flank ? 'flank' : 'advance'; this.path = []; }
          else if (this._pathDone() && seenAgo > 1.0) this._pathTo(this.lastKnown);   // push the last known spot
          return;
        }
        const d = this.pos.distanceTo(tgt.pos);
        // fighting in the open for a while: find cover that faces the target
        // (integrator: only once the target is inside weapon range; a bot that spotted the player
        // at 110 m went to cover out of range and creeped for the rest of the round)
        // (integrator r1: against the human the push goes on to 55 percent of range before any cover
        // is taken. Round 1 runs showed the road bots stopping at 79 m, ducking behind the chicane and
        // never being seen again; a CoD bot that has spotted the player closes on them.)
        const coverAt = tgt.hitboxes ? this.weapon.range : this.weapon.range * 0.55;
        if (this.engageT > rnd(2.5, 4.0) && !this.cover && d <= coverAt) { if (this._seekCover(tgt.pos, 16)) return; this.engageT = 0; }
        if (d > this.weapon.range * 0.55) { if (this._pathDone() || this.repathT <= 0) this._pathTo(this.nav.randomPointNear(tgt.pos, 6)); }
        else if (d < 4 && this.weaponKey !== 'smg') {
          if (this._pathDone()) this._pathTo(this.nav.randomPointNear(this.pos, 5));   // back off a step
        } else {
          this.strafeT -= dt;
          if (this.strafeT <= 0 && this._pathDone()) {
            this.strafeT = rnd(1.8, 3.5);
            const side = _v.set(tgt.pos.z - this.pos.z, 0, -(tgt.pos.x - this.pos.x)).normalize().multiplyScalar(rnd(-3, 3));
            this._pathTo(this.nav.randomPointNear(_w.copy(this.pos).add(side), 1.5));
          }
        }
        this.repathT -= dt;
        break;
      }
      case 'cover': {
        const c = this.cover;
        if (!c) { this.state = 'advance'; return; }
        const at = this._arrived(c.point, 0.7);
        this.coverT += dt;
        if (!at) {
          if (this._pathDone()) {
            if (this.coverT > 6) { this.cover = null; this.state = 'advance'; }   // never got there
            else this._pathTo(c.point);
          }
          return;
        }
        // at cover: face the threat, alternate hide and peek
        const thr = threat || _v.copy(c.point).add(c.normal);
        this.yawTarget = Math.atan2(thr.x - this.pos.x, thr.z - this.pos.z);
        this.peekT -= dt;
        if (this.peekT <= 0) {
          this.peek = !this.peek; this.peekT = this.peek ? rnd(1.2, 2.0) : rnd(0.8, 1.6);
          // fix4 ai: hiding at high cover is a crouch most of the time (reload, wait out the burst) and a
          // standing shouldered hold the rest, re rolled at every peek so two frames of one bot differ
          if (!this.peek) this.hideCrouch = c.height === 'low' || this.hp < 50 || this.underFireT > 0 || Math.random() < 0.55;
        }
        this.crouched = !this.peek && (c.height === 'low' || this.hideCrouch);
        // step out sideways to peek from high cover
        if (this.peek && c.height === 'high') {
          const side = (this.id.charCodeAt(this.id.length - 1) & 1) ? 1 : -1;
          _w.set(c.normal.z * side, 0, -c.normal.x * side).multiplyScalar(0.7).add(c.point);
          this.strafeTo = _w.clone();
        } else this.strafeTo = c.point.clone();
        // leave cover when it stops being useful
        const age = this.time - this.coverSince;
        const farTarget = tgt && this.pos.distanceTo(tgt.pos) > 45 && this.underFireT <= 0 && age > 3;
        if (age > 10 || (!tgt && seenAgo > 5) || farTarget) {
          this.cover = null; this.crouched = false; this.strafeTo = null; this.state = this.objective && this.objective.flank ? 'flank' : 'advance'; this.path = [];
        } else if (tgt && this.pos.distanceTo(tgt.pos) < 5) {
          this.cover = null; this.crouched = false; this.strafeTo = null; this.state = 'engage'; this.engageT = 0;
        }
        break;
      }
      case 'retreat': {
        if (this._pathDone()) {
          if (this.hp > 55 || (!tgt && seenAgo > 6 && this.hp > 40)) { this.state = 'advance'; this.path = []; }
          else if (threat) this._seekCover(threat, 30);
          else this._pathTo(this.nav.randomPointNear(this.pos, 6));
        }
        break;
      }
      default: break;
    }
  }

  /** Decide the horizontal move for this frame. */
  _move(dt, move) {
    let speed = 0, climbing = false;
    if (this.state === 'cover' && this.strafeTo && this._arrived(this.cover.point, 0.7)) {
      move.set(this.strafeTo.x - this.pos.x, 0, this.strafeTo.z - this.pos.z);
      const l = move.length();
      if (l > 0.12) { move.divideScalar(l); speed = CROUCH_WALK; } else move.set(0, 0, 0);
      return { speed, climbing };
    }
    const wp = this._followPath(move);
    if (!wp) { move.set(0, 0, 0); if (this.target) this._faceTarget(); return { speed, climbing }; }
    const seenAgo = this.time - this.lastSeenT;
    if (wp.link === 'ladder') { climbing = true; speed = CLIMB; }
    else if (this.crouched) speed = CROUCH_WALK;
    // integrator: close the distance first. fix4 ai: the close is a run between bursts and a shouldered
    // walk while a burst is going out, the run, stop, fire rhythm of the reference bots.
    else if (this.state === 'engage' && this.target && this.pos.distanceTo(this.target.pos) > this.weapon.range) speed = this.burstLeft > 0 && this.reactT <= 0 ? WALK : RUN;
    // fix4 ai: a bot breaking for cover runs until the last three metres ("cover within 0.5 s")
    else if (this.state === 'cover' && this.cover && !wp.link && Math.hypot(this.cover.point.x - this.pos.x, this.cover.point.z - this.pos.z) > 3) speed = RUN;
    else if (this.state === 'cover' || this.state === 'engage' || this.state === 'retreat' || wp.link) speed = WALK;
    else speed = seenAgo < 6 ? WALK : RUN;
    if (this.state === 'engage' && this.target) this._faceTarget();
    else this.yawTarget = Math.atan2(move.x, move.z);
    // stuck detection: no progress while wanting to move
    if (this.pos.distanceTo(this.lastPos) < 0.05 * Math.max(0.5, speed) * 0.5) this.stuckT += dt; else { this.stuckT = 0; this.lastPos.copy(this.pos); }
    if (this.stuckT > 0.8) {
      if (wp.link) this.direct = true;         // the world has no collider for this link yet: walk the line
      else if (this.stuckT > 1.6) {
        // wedged against something the grid does not know: sidestep for a moment, then path again
        this.stuckT = 0; this.unstickT = 0.6; this.unstickSide = Math.random() < 0.5 ? -1 : 1;
        this._pathTo(this.pathGoal.clone());
      }
    }
    if (this.unstickT > 0) {
      this.unstickT -= dt;
      move.set(-move.z * this.unstickSide + move.x * 0.2, 0, move.x * this.unstickSide + move.z * 0.2).normalize();
    }
    return { speed, climbing, wp };
  }

  _faceTarget() {
    const t = this.target; if (!t) return;
    this.yawTarget = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    const c = this._chestOf(t, _w), e = this.eye(_v);
    this.pitch = Math.atan2(c.y - e.y, Math.hypot(c.x - e.x, c.z - e.z));
  }

  _integrate(dt, move, speed, climbing) {
    const prev = _w.copy(this.pos);
    // separation from other bots
    if (this.ctx && this.ctx.bots) {
      for (const b of this.ctx.bots) {
        if (b === this || !b.alive) continue;
        const dx = this.pos.x - b.pos.x, dz = this.pos.z - b.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 1.0 && d2 > 1e-6) { const d = Math.sqrt(d2); move.x += dx / d * (1 - d) * 1.5; move.z += dz / d * (1 - d) * 1.5; }
      }
    }
    const wp = this.path[this.pathIdx];
    if ((climbing || this.direct) && wp) {
      // straight line along the link at climb speed, no collision, no gravity
      const to = _v.set(wp.x - this.pos.x, wp.y - this.pos.y, wp.z - this.pos.z);
      const l = to.length();
      const s = climbing ? CLIMB : WALK;
      if (l > 1e-4) { to.multiplyScalar(Math.min(1, s * dt / l)); this.pos.add(to); }
      this.vel.set(0, 0, 0); this.grounded = true;
    } else {
      this.vel.y -= GRAVITY * dt;
      if (this.grounded && this.vel.y < 0) this.vel.y = -2;
      const delta = _v.set(move.x * speed * dt, this.vel.y * dt, move.z * speed * dt);
      if (this.world && typeof this.world.moveCapsule === 'function') {
        const r = this.world.moveCapsule(this.pos, delta, 0.35, this.crouched ? 1.3 : 1.8);
        if (r && r.pos) this.pos.copy(r.pos);
        this.grounded = !!(r && r.grounded);
        if (this.grounded) this.vel.y = 0;
      } else {
        this.pos.add(delta);
        const gy = this.nav ? this.nav.groundY(this.pos.x, this.pos.z) : 0;
        if (this.pos.y <= gy) { this.pos.y = gy; this.vel.y = 0; this.grounded = true; } else this.grounded = false;
      }
    }
    // never leave the boundary
    const b = this.nav && this.nav.boundary;
    if (b) { this.pos.x = clamp(this.pos.x, b.minX, b.maxX); this.pos.z = clamp(this.pos.z, b.minZ, b.maxZ); }
    const hs = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z) / Math.max(dt, 1e-4);
    this.speed += (hs - this.speed) * Math.min(1, dt * 12);
  }

  // ---------------------------------------------------------------- shooting
  _fireControl(dt) {
    const t = this.target;
    if (!t) { this.reactT = 0; return; }
    if (this.state === 'cover' && !this.peek && this._arrived(this.cover ? this.cover.point : this.pos, 0.7)) return;
    if (this.reactT > 0) { this.reactT -= dt; return; }
    const d = this.pos.distanceTo(t.pos);
    if (d > this.weapon.range * fireReach(t)) return;
    if (this.burstPause > 0) { this.burstPause -= dt; return; }
    if (this.burstLeft <= 0) {
      const [a, b] = this.weapon.burst;
      this.burstLeft = Math.round(rnd(a, b));
      this.fireT = 0;
    }
    this.fireT -= dt;
    if (this.fireT > 0) return;
    this.fireT += 60 / this.weapon.rpm;
    this.burstLeft--;
    if (this.burstLeft <= 0) this.burstPause = rnd(0.5, 1.0) * (this.weaponKey === 'dmr' ? 1.6 : 1);
    this._shoot(t);
  }

  _shoot(t) {
    const from = this.rig ? this.rig.muzzleWorld(new THREE.Vector3()) : this.eye(new THREE.Vector3());
    // muzzle can be inside cover geometry; if it is behind the eye plane, fire from the eye
    const eye = this.eye(_v);
    if (from.distanceTo(eye) > 1.2) from.copy(eye);
    const aim = this._chestOf(t, _w);
    if (t.hp !== undefined && Math.random() < 0.12) aim.y += 0.35;      // an occasional head shot
    const dir = new THREE.Vector3().subVectors(aim, from).normalize();
    // spread: a cone of the weapon's bot spread, wider on the first rounds after acquiring
    // integrator r1: at the human beyond half the weapon's range the cone opens with distance
    // (x1.5 at 60 m, x2.2 at 80 m, x2.9 at 100 m for the AR). With fireReach 1.4 the road bots
    // open up at 110 m as a real squad would, but a run where the player died 3 s after DEPLOY
    // to two bots at 95 m is not CoD; this is the standard bot accuracy fall off.
    const dAim = from.distanceTo(aim);
    const farMult = t.hitboxes ? 1 : clamp(Math.pow(dAim / (this.weapon.range * 0.5), 1.2), 1, 3);
    const sp = this.weapon.spread * (this.crouched ? 0.75 : 1) * farMult;
    const up = Math.abs(dir.y) < 0.9 ? _u.set(0, 1, 0) : _u.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const upv = new THREE.Vector3().crossVectors(right, dir).normalize();
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    dir.addScaledVector(right, g() * sp).addScaledVector(upv, g() * sp).normalize();

    // integrator: the trigger gate is range * 1.1 (above) but the hit ray was only `range` long, so a bot
    // firing at the player between 80 and 88 m emptied bursts that could never land
    const range = this.weapon.range * fireReach(t);
    let maxD = range;
    if (this.world && typeof this.world.raycast === 'function') {
      const r = this.world.raycast(from, dir, range, {});
      if (r && r.hit && r.dist < maxD) maxD = r.dist;
    }
    if (this.events) this.events.emit('shot', { by: this.entity(), weapon: this.weaponKey, from: from.clone(), dir: dir.clone(), to: from.clone().addScaledVector(dir, maxD) });
    // targets: every enemy's hitboxes, nearest wins
    _ray.set(from, dir);
    let hitE = null, hitPart = 'body', hitD = maxD;
    for (const e of this._enemies()) {
      if (e.hitboxes) {
        for (const hb of e.hitboxes()) {
          const p = _ray.intersectBox(hb.box, _boxV);
          if (p) { const dd = p.distanceTo(from); if (dd < hitD) { hitD = dd; hitE = e; hitPart = hb.part; } }
        }
      } else {
        // the player: a capsule and a head sphere
        const crouch = !!e.crouched;
        const headY = e.pos.y + (crouch ? 1.1 : 1.62);
        const dh = this._raySphere(from, dir, _boxV.set(e.pos.x, headY, e.pos.z), 0.19);
        if (dh !== null && dh < hitD) { hitD = dh; hitE = e; hitPart = 'head'; }
        const db = this._rayCapsule(from, dir, e.pos.x, e.pos.y + 0.3, e.pos.z, e.pos.y + (crouch ? 1.0 : 1.4), 0.32);
        if (db !== null && db < hitD) { hitD = db; hitE = e; hitPart = 'body'; }
      }
    }
    if (!hitE) return;
    let dmg = this.weapon.damage * (hitPart === 'head' ? this.weapon.headMult : 1);
    const isPlayer = !hitE.hitboxes;
    if (isPlayer) dmg *= BOT_DAMAGE_TO_PLAYER;
    const wasAlive = hitE.alive !== false && !(hitE.hp !== undefined && hitE.hp <= 0);
    if (typeof hitE.takeDamage === 'function') hitE.takeDamage(dmg, from.clone(), this.id);
    const victim = hitE.entity ? hitE.entity() : { id: hitE.id ?? 'player', name: hitE.name ?? 'You', team: hitE.team ?? 'rangers' };
    if (this.events) {
      this.events.emit('hit', { by: this.entity(), target: victim, part: hitPart, damage: dmg });
      const nowDead = hitE.alive === false || (hitE.hp !== undefined && hitE.hp <= 0);
      if (wasAlive && nowDead) this.events.emit('kill', { killer: this.entity(), victim, weapon: this.weaponKey, headshot: hitPart === 'head' });
    }
  }

  // ---------------------------------------------------------------- corpses
  /** Copy the meshes of the finished death pose into a flat static group so the body stays after respawn. */
  _leaveCorpse() {
    if (!this.scene || !this.object) return;
    this.object.updateMatrixWorld(true);
    const g = new THREE.Group(); g.name = `corpse_${this.id}`;
    let n = 0;
    this.object.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      let p = o.parent, vis = true;
      while (p && p !== this.object) { if (!p.visible) { vis = false; break; } p = p.parent; }
      if (!vis) return;
      const m = new THREE.Mesh(o.geometry, o.material);
      m.matrixAutoUpdate = false; m.matrix.copy(o.matrixWorld); m.matrixWorldNeedsUpdate = true;
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = true;
      g.add(m); n++;
    });
    if (!n) return;
    this.scene.add(g);
    CORPSES.push({ group: g, born: this.time });
    while (CORPSES.length > CORPSE_MAX) Bot._dropCorpse(CORPSES.shift());
  }

  static _dropCorpse(c) { if (c && c.group && c.group.parent) c.group.parent.remove(c.group); }

  /** Age the bodies against the mission clock; idempotent, so every squad may call it each frame. */
  static updateCorpses(now) {
    for (let i = CORPSES.length - 1; i >= 0; i--) {
      const c = CORPSES[i];
      if (now - c.born > CORPSE_LIFE || now < c.born) { Bot._dropCorpse(c); CORPSES.splice(i, 1); }
    }
  }

  /** Remove every body (mission restart). */
  static clearCorpses() { while (CORPSES.length) Bot._dropCorpse(CORPSES.pop()); }

  _raySphere(o, d, c, r) {
    const oc = _v.subVectors(o, c);
    const b = oc.dot(d), cc = oc.dot(oc) - r * r;
    const disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : null;
  }

  _rayCapsule(o, d, x, y0, z, y1, r) {
    // vertical segment capsule: sample the closest approach of the ray to the axis
    // solve for t where the ray is nearest the vertical line, then check radius and height
    const ox = o.x - x, oz = o.z - z;
    const a = d.x * d.x + d.z * d.z;
    if (a < 1e-8) { const dd = Math.hypot(ox, oz); if (dd > r) return null; return o.y > y1 ? (o.y - y1) / -d.y : null; }
    const b = ox * d.x + oz * d.z;
    const c = ox * ox + oz * oz - r * r;
    const disc = b * b - a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / a;
    if (t < 0) return null;
    const y = o.y + d.y * t;
    if (y < y0 - r || y > y1 + r) return null;
    return t;
  }
}
