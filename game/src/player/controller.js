/**
 * player/controller.js  (owner: player)
 *
 * First person controller tuned to read like a modern military shooter:
 * fast acceleration, a short friction stop, sprint that breaks on fire, a
 * crouch with a real eye height change, ADS that narrows the fov and slows
 * the walk, a subtle figure eight head bob, landing dip, recoil kick that
 * recovers, and a death camera that falls to the sand.
 *
 * Movement goes through world.moveCapsule (world/collision.js). Gravity, fall
 * damage, jumping and the eye position are here. Stairs are ramps inside
 * moveCapsule; ladders are reported by moveCapsule as `ladder: true` when the
 * capsule is inside a ladder link volume and holding forward, in which case
 * gravity is suspended (see work/player/NOTES.md).
 *
 * Conventions:
 *   yaw   radians about +Y, camera looks down -Z at yaw 0 (three.js camera).
 *   spawnAt(x, z, yaw) takes the MAP-PLAN convention (0 = facing south, +Z;
 *           90 deg = facing east) in RADIANS and converts to camera yaw.
 *   look deltas from input are PIXELS; radPerPx() converts, and it shrinks
 *           with the fov while aiming down sights (relative ADS sensitivity).
 */
import * as THREE from 'three';

export const PLAYER_TUNING = {
  walk: 4.2, sprint: 6.4, crouch: 2.0, ads: 2.8,
  accel: 58, airAccel: 11, friction: 46,
  gravity: 22, jumpApex: 1.2,
  radius: 0.35, height: 1.8, crouchHeight: 1.25,
  eye: 1.65, eyeCrouch: 1.1,
  maxHp: 100, regenDelay: 7.0, regenRate: 9,    // integrator: was 5 s and 40 hp/s (full in 2.5 s from zero); a hit now shows for 7 s and heals at 9 hp/s
  baseFov: 74, sens: 0.0021,          // radians per mouse pixel at base fov
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const lerp = (a, b, t) => a + (b - a) * t;

export class Player {
  constructor({ camera, world, input, events, terrain = null, fx = null }) {
    this.camera = camera; this.world = world; this.input = input; this.events = events;
    this.terrain = terrain; this.fx = fx;
    this.T = PLAYER_TUNING;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.hp = this.T.maxHp; this.alive = true;
    this.crouched = false; this.sprinting = false; this.ads = false;
    this.team = 'rangers';
    this.id = 'player'; this.name = 'You';
    this.grounded = true; this.groundY = 0; this.ladder = false;
    this.speed = 0; this.moving = false;

    // smoothed blends
    this.crouchT = 0; this.adsT = 0; this.sprintT = 0;
    this.adsFov = 55;                    // set by weapons per weapon
    this.baseFov = this.T.baseFov;
    this.sens = this.T.sens;

    // camera feel
    this.bobPhase = 0; this.bobK = 0; this.bobY = 0; this.bobX = 0;
    this.landDip = 0; this.landVel = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;     // accumulated kick (radians)
    this.recoilVelP = 0; this.recoilVelY = 0;
    this.shakeMag = 0; this.shakeT = 0;
    this.deathT = 0;

    this.lastDamageAt = -99;
    this.lastHitBy = null;
    this.fallPeakY = 0;
    this.time = 0;
    this.sprintBlockUntil = 0;
    this.prevJump = false;
    this.footPhase = 0;
    this.footstepCount = 0;

    this._tmpDelta = new THREE.Vector3();
    this._tmpEye = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._camEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    if (camera) { camera.rotation.order = 'YXZ'; camera.fov = this.baseFov; camera.updateProjectionMatrix(); }
  }

  /** yaw here is in the MAP-PLAN convention (radians, 0 = facing +Z south, PI/2 = east). */
  spawnAt(x, z, yaw = 0) {
    const gy = this.world && this.world.groundY ? this.world.groundY(x, z) : 0;
    this.pos.set(x, gy, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw + Math.PI; this.pitch = 0; this.roll = 0;
    this.hp = this.T.maxHp; this.alive = true;
    this.crouched = false; this.crouchT = 0; this.adsT = 0; this.sprintT = 0;
    this.recoilPitch = 0; this.recoilYaw = 0; this.recoilVelP = 0; this.recoilVelY = 0;
    this.landDip = 0; this.shakeT = 0; this.shakeMag = 0; this.deathT = 0;
    this.grounded = true; this.groundY = gy; this.fallPeakY = gy; this.ladder = false;
    this.lastDamageAt = -99; this.lastHitBy = null;
    this.events && this.events.emit && this.events.emit('respawn', { id: this.id, team: this.team, pos: this.pos.clone() });
    this.applyCamera(0);
  }

  /** Radians of turn per input pixel at the current (possibly ADS) fov. */
  radPerPx() {
    const fov = this.camera ? this.camera.fov : this.baseFov;
    return this.sens * (fov / this.baseFov);
  }

  forward(out = this._fwd) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  eye(out = this._tmpEye) {
    const h = lerp(this.T.eye, this.T.eyeCrouch, this.crouchT);
    return out.set(this.pos.x, this.pos.y + h - this.landDip + this.bobY, this.pos.z);
  }

  /** Recoil kick, radians. Called by the weapon system on every shot. */
  addRecoil(pitchUp, yawSide) {
    this.recoilVelP += pitchUp * 26;
    this.recoilVelY += yawSide * 26;
  }

  shake(mag, time) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, time); }

  /** Firing breaks sprint for a moment, like every modern shooter. */
  blockSprint(seconds = 0.4) { this.sprintBlockUntil = this.time + seconds; }

  takeDamage(amount, fromPos = null, byId = null, opts = {}) {
    if (!this.alive || amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.lastDamageAt = this.time;
    this.lastHitBy = byId;
    this.shake(Math.min(0.06, 0.012 + amount * 0.0012), 0.18);
    this.events && this.events.emit && this.events.emit('damage', { target: this, amount, fromPos: fromPos ? fromPos.clone() : null, by: byId });
    if (this.hp <= 0) {
      this.alive = false; this.deathT = 0;
      this.crouched = false; this.sprinting = false; this.ads = false;
      this.events && this.events.emit && this.events.emit('death', {
        id: this.id, name: this.name, team: this.team, by: byId, weapon: opts.weapon || null, headshot: !!opts.headshot, pos: this.pos.clone(),
      });
      return true;
    }
    return false;
  }

  _readInput() {
    const inp = this.input || {};
    const move = inp.move || { x: 0, y: 0 };
    const look = inp.look || { dx: 0, dy: 0 };
    return {
      mx: clamp(move.x || 0, -1, 1), my: clamp(move.y || 0, -1, 1),
      dx: look.dx || 0, dy: look.dy || 0,
      sprint: !!inp.sprint, crouch: !!inp.crouch, jump: !!inp.jump, ads: !!inp.ads, fire: !!inp.fire,
    };
  }

  update(dt) {
    this.time += dt;
    const T = this.T;
    const inp = this.alive ? this._readInput() : { mx: 0, my: 0, dx: 0, dy: 0 };

    // ---- look
    const rp = this.radPerPx();
    if (this.alive) {
      this.yaw -= inp.dx * rp;
      this.pitch = clamp(this.pitch - inp.dy * rp, -1.45, 1.45);
    }
    // recoil: a spring that kicks up fast and settles back most of the way
    this.recoilPitch += this.recoilVelP * dt;
    this.recoilYaw += this.recoilVelY * dt;
    this.recoilVelP = damp(this.recoilVelP, 0, 30, dt);
    this.recoilVelY = damp(this.recoilVelY, 0, 30, dt);
    const settle = this.ads ? 9 : 7;
    const rpBefore = this.recoilPitch;
    this.recoilPitch = damp(this.recoilPitch, 0, settle, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, settle, dt);
    // a third of the kick stays as real aim displacement (the gun climbed)
    this.pitch = clamp(this.pitch + (rpBefore - this.recoilPitch) * 0.35, -1.45, 1.45);

    // ---- stance
    const wantCrouch = this.alive && inp.crouch;
    this.crouched = wantCrouch;
    this.crouchT = damp(this.crouchT, wantCrouch ? 1 : 0, 14, dt);
    this.ads = this.alive && inp.ads && !this.sprinting;
    this.adsT = damp(this.adsT, this.ads ? 1 : 0, 16, dt);
    const canSprint = this.alive && inp.sprint && inp.my > 0.3 && !wantCrouch && !inp.ads &&
      this.time > this.sprintBlockUntil && !this.ladder;
    this.sprinting = canSprint;
    this.sprintT = damp(this.sprintT, this.sprinting ? 1 : 0, 10, dt);

    // ---- desired velocity
    let target = T.walk;
    if (this.sprinting) target = T.sprint;
    if (wantCrouch) target = T.crouch;
    if (this.ads && !wantCrouch) target = T.ads;
    if (!this.alive) target = 0;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const fx = -s, fz = -c, rx = c, rz = -s;
    let wx = fx * inp.my + rx * inp.mx, wz = fz * inp.my + rz * inp.mx;
    const wl = Math.hypot(wx, wz);
    if (wl > 1e-4) { wx /= wl; wz /= wl; }
    const wish = Math.min(wl, 1) * target;
    const accel = this.grounded || this.ladder ? T.accel : T.airAccel;
    const cur = this.vel.x * wx + this.vel.z * wz;
    const add = clamp(wish - cur, 0, accel * dt);
    if (wl > 1e-4) { this.vel.x += wx * add; this.vel.z += wz * add; }
    if (this.grounded || this.ladder) {
      // friction: with no input the whole velocity decays; with input only the
      // part across the wish direction decays, so a strafe reversal is crisp
      const fr = Math.max(T.friction * dt, 0);
      if (wl < 1e-4) {
        const sp = Math.hypot(this.vel.x, this.vel.z);
        const ns = Math.max(sp - Math.max(sp, 1.5) * fr / 1.5, 0);
        if (sp > 1e-5) { this.vel.x *= ns / sp; this.vel.z *= ns / sp; }
      } else {
        const along = this.vel.x * wx + this.vel.z * wz;
        let px = this.vel.x - wx * along, pz = this.vel.z - wz * along;
        const pl = Math.hypot(px, pz);
        const np = Math.max(pl - Math.max(pl, 1.5) * fr / 1.5, 0);
        if (pl > 1e-5) { px *= np / pl; pz *= np / pl; }
        const a2 = along < 0 ? Math.min(along + fr * 2, 0) : along;
        this.vel.x = wx * a2 + px; this.vel.z = wz * a2 + pz;
      }
    }
    // hard cap so a wall slide can never exceed the stance speed
    const spc = Math.hypot(this.vel.x, this.vel.z);
    if (spc > target + 0.01 && this.alive) { const k = (target + 0.01) / spc; this.vel.x *= k; this.vel.z *= k; }

    // ---- jump
    const jumpEdge = inp.jump && !this.prevJump;
    this.prevJump = !!inp.jump;
    if (jumpEdge && this.grounded && this.alive && !wantCrouch) {
      this.vel.y = Math.sqrt(2 * T.gravity * T.jumpApex);
      this.grounded = false;
      this.fallPeakY = this.pos.y;
    }
    if (!this.ladder) this.vel.y -= T.gravity * dt; else this.vel.y = 0;

    // ---- move through the world
    const height = lerp(T.height, T.crouchHeight, this.crouchT);
    this._tmpDelta.set(this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    const wasGrounded = this.grounded;
    let res = null;
    if (this.world && this.world.moveCapsule) {
      res = this.world.moveCapsule(this.pos, this._tmpDelta, T.radius, height, { forward: inp.my > 0.2, yaw: this.yaw });
    }
    if (res && res.pos) {
      const nx = res.pos.x, ny = res.pos.y, nz = res.pos.z;
      if (res.hitWall) {
        // the world took the slide; keep only the velocity it allowed
        const ax = (nx - this.pos.x) / Math.max(dt, 1e-5), az = (nz - this.pos.z) / Math.max(dt, 1e-5);
        if (Math.abs(ax) < Math.abs(this.vel.x)) this.vel.x = ax;
        if (Math.abs(az) < Math.abs(this.vel.z)) this.vel.z = az;
      }
      this.pos.set(nx, ny, nz);
      this.grounded = !!res.grounded;
      this.groundY = typeof res.groundY === 'number' ? res.groundY : this.pos.y;
      this.ladder = !!(res.ladder || res.onLadder);
      if (this.grounded) {
        if (this.vel.y < 0) this.vel.y = 0;
      }
    } else {
      // no world yet: flat floor at y = 0
      this.pos.add(this._tmpDelta);
      if (this.pos.y <= 0) { this.pos.y = 0; this.grounded = true; this.vel.y = Math.max(0, this.vel.y); } else this.grounded = false;
      this.groundY = 0;
    }

    // ---- fall tracking and damage (MAP-PLAN section 6: 4.6 m sand 25, concrete 40, 9.2 m lethal)
    if (!this.grounded) { if (this.pos.y > this.fallPeakY) this.fallPeakY = this.pos.y; }
    if (this.grounded && !wasGrounded) {
      const fall = this.fallPeakY - this.pos.y;
      this.landVel = Math.max(0, fall);
      this.landDip = clamp(fall * 0.06, 0.02, 0.22);
      if (fall > 3.0 && this.alive) {
        const surf = this.terrain && this.terrain.surfaceAt ? this.terrain.surfaceAt(this.pos.x, this.pos.z) : 'sand';
        const hard = surf === 'concrete' || surf === 'rock';
        const base = hard ? 40 : 25;
        const dmg = Math.round(base * Math.pow((fall - 3.0) / 1.6, 1.4));
        this.takeDamage(dmg, null, 'fall', { weapon: 'fall' });
        this.shake(0.05, 0.25);
      }
      this.fallPeakY = this.pos.y;
      this.events && this.events.emit && this.events.emit('land', { pos: this.pos.clone(), fall });
    }
    if (this.grounded) this.fallPeakY = this.pos.y;
    this.landDip = damp(this.landDip, 0, 12, dt);

    // ---- regen
    if (this.alive && this.hp < T.maxHp && this.time - this.lastDamageAt > T.regenDelay) {
      this.hp = Math.min(T.maxHp, this.hp + T.regenRate * dt);
    }

    // ---- speed, bob, footsteps
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.moving = this.speed > 0.4 && (this.grounded || this.ladder);
    // stride length: a footstep every half cycle (pi of phase), 1.5 m walking, 1.95 m sprinting
    const strideLen = this.sprinting ? 1.95 : (wantCrouch ? 1.0 : 1.5);
    const bobTarget = this.moving ? clamp(this.speed / T.walk, 0, 1.6) * (1 - this.adsT * 0.85) : 0;
    this.bobK = damp(this.bobK, bobTarget, 9, dt);
    if (this.moving) this.bobPhase += dt * Math.PI * (this.speed / strideLen);
    const amp = this.sprinting ? 0.030 : 0.017;
    this.bobY = -Math.abs(Math.sin(this.bobPhase)) * amp * this.bobK;
    this.bobX = Math.sin(this.bobPhase * 0.5) * amp * 0.55 * this.bobK;
    // footstep at each bob trough
    const ph = this.bobPhase % Math.PI;
    if (this.moving && this.grounded && ph < this.footPhase) {
      this.footstepCount++;
      const surface = this.terrain && this.terrain.surfaceAt ? this.terrain.surfaceAt(this.pos.x, this.pos.z) : 'sand';
      const strength = this.sprinting ? 1.0 : (wantCrouch ? 0.25 : 0.6);
      this.events && this.events.emit && this.events.emit('footstep', { pos: this.pos.clone(), surface, strength, sprint: this.sprinting });
      if (this.fx && this.fx.footstepDust) this.fx.footstepDust(this.pos, surface, strength);
    }
    this.footPhase = ph;

    // ---- shake
    if (this.shakeT > 0) this.shakeT -= dt; else this.shakeMag = 0;

    // ---- death camera
    if (!this.alive) this.deathT += dt;

    this.applyCamera(dt);
  }

  applyCamera(dt) {
    const cam = this.camera; if (!cam) return;
    const eye = this.eye();
    let px = eye.x, py = eye.y, pz = eye.z;
    // lateral bob in the camera's right direction
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    px += rx * this.bobX; pz += rz * this.bobX;
    let pitch = this.pitch + this.recoilPitch;
    let yaw = this.yaw + this.recoilYaw;
    let roll = this.roll + Math.sin(this.bobPhase * 0.5) * 0.0065 * this.bobK * (0.4 + this.sprintT);
    // strafe lean, tiny
    const rv = this.vel.x * rx + this.vel.z * rz;
    roll -= rv * 0.0045;
    if (this.shakeT > 0 && this.shakeMag > 0) {
      const k = this.shakeMag * Math.min(1, this.shakeT / 0.18);
      pitch += (Math.random() - 0.5) * k; yaw += (Math.random() - 0.5) * k * 0.6; roll += (Math.random() - 0.5) * k * 0.5;
    }
    if (!this.alive) {
      const t = clamp(this.deathT / 0.9, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      py = lerp(eye.y, this.pos.y + 0.35, e);
      roll += e * 0.55; pitch = lerp(pitch, -0.12, e);
    }
    cam.position.set(px, py, pz);
    this._camEuler.set(pitch, yaw, roll, 'YXZ');
    cam.quaternion.setFromEuler(this._camEuler);
    // fov: ADS narrows it, sprint widens it a touch
    const fov = lerp(this.baseFov, this.adsFov, this.adsT) * (1 + this.sprintT * 0.035);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}
