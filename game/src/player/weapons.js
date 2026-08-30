/**
 * player/weapons.js  (owner: player)
 *
 * Hitscan weapons, reload, switch, grenades. Hit test order: world.raycast for
 * static geometry, then every target's hitboxes (head, body) transformed by
 * its current pose; nearest wins, a head box within 0.25 m of a body hit is
 * taken as the head. Emits 'shot', 'hit', 'kill' on the shared Events bus.
 *
 * Damage falls off past `range`: full to range, down to 55% at 1.8 x range.
 * Spread grows with movement and consecutive fire (bloom) and shrinks in ADS
 * and crouch. Recoil is a per weapon kick handed to player.addRecoil; the
 * viewmodel gets the same kick through play('fire').
 */
import * as THREE from 'three';
import { ASSET } from '../../assetlib.js?v=r24-202608300022';

export const WEAPONS = {
  ar:  { asset: 'assault_rifle',  name: 'M4 CARBINE',  damage: 28, headMult: 2.0, rpm: 720, mag: 30, reserve: 150, reload: 2.1, spread: 0.010, adsSpread: 0.003, recoil: [0.012, 0.004], range: 80,  auto: true,  adsFov: 55, sight: 0.075, switchTime: 0.45 },
  smg: { asset: 'smg',            name: 'MP5 SD',      damage: 20, headMult: 1.8, rpm: 900, mag: 30, reserve: 180, reload: 1.8, spread: 0.016, adsSpread: 0.006, recoil: [0.009, 0.005], range: 45,  auto: true,  adsFov: 60, sight: 0.060, switchTime: 0.38 },
  dmr: { asset: 'marksman_rifle', name: 'MK14 DMR',    damage: 60, headMult: 2.5, rpm: 220, mag: 20, reserve: 80,  reload: 2.6, spread: 0.006, adsSpread: 0.001, recoil: [0.030, 0.006], range: 140, auto: false, adsFov: 32, sight: 0.090, switchTime: 0.55 },
  frag: { asset: 'frag_grenade', damage: 120, radius: 5.5, fuse: 3.0, throwSpeed: 18, count: 2 },
};

const KEYS = ['ar', 'smg', 'dmr'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;

const PLAYER_ID = { id: 'player', name: 'You', team: 'rangers' };

export class WeaponSystem {
  constructor({ player, world, targets, events, viewmodel, fx, assetBase = './assets/' }) {
    this.player = player; this.world = world; this.targets = targets || (() => []);
    this.events = events; this.viewmodel = viewmodel; this.fx = fx;
    this.assetBase = assetBase;
    this.mags = {};
    for (const k of KEYS) this.mags[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve };
    this.current = 'ar';
    this.grenades = WEAPONS.frag.count;
    this.reloading = 0; this.reloadTotal = 0;
    this.switching = 0; this.switchTo = null; this.switchTotal = 0;
    this.fireCooldown = 0;
    this.bloom = 0;
    this.prevFire = false; this.prevReload = false; this.prevGrenade = false;
    this.shots = 0; this.hits = 0; this.kills = 0; this.headshots = 0;
    this.lastShot = null;
    this.liveGrenades = [];
    this.grenadeAsset = null;
    this._o = new THREE.Vector3(); this._d = new THREE.Vector3(); this._r = new THREE.Vector3(); this._u = new THREE.Vector3();
    this._ray = new THREE.Ray(); this._hitP = new THREE.Vector3(); this._muzzle = new THREE.Vector3();
    this._scene = null;
    if (player) player.adsFov = WEAPONS[this.current].adsFov;
    if (events && events.on) events.on('respawn', (p) => { if (p && p.id === 'player') this.resetLife(); });
  }

  /** ammo of the current weapon, { mag, reserve } */
  get ammo() { return this.mags[this.current]; }
  get weapon() { return WEAPONS[this.current]; }

  /** Scene for thrown grenade meshes (optional; without it grenades are invisible but still explode). */
  setScene(scene) { this._scene = scene; }

  resetLife() {
    this.shots = 0; this.hits = 0; this.kills = 0; this.headshots = 0;
    for (const k of KEYS) { this.mags[k].mag = WEAPONS[k].mag; this.mags[k].reserve = WEAPONS[k].reserve; }
    this.grenades = WEAPONS.frag.count;
    this.reloading = 0; this.switching = 0; this.switchTo = null; this.fireCooldown = 0; this.bloom = 0;
    if (this.current !== 'ar') this.setWeapon('ar', true);
  }

  setWeapon(key, instant = false) {
    if (!WEAPONS[key] || key === 'frag') return;
    if (instant) {
      this.current = key; this.switching = 0; this.switchTo = null;
      if (this.player) this.player.adsFov = WEAPONS[key].adsFov;
      if (this.viewmodel && this.viewmodel.setWeapon) this.viewmodel.setWeapon(key);
      return;
    }
    if (key === this.current && !this.switchTo) return;
    this.switchTo = key; this.switchTotal = WEAPONS[key].switchTime; this.switching = this.switchTotal;
    this.reloading = 0;
    if (this.viewmodel && this.viewmodel.play) this.viewmodel.play('switch', this.switchTotal);
  }

  startReload() {
    const w = WEAPONS[this.current], a = this.mags[this.current];
    if (this.reloading > 0 || this.switching > 0) return false;
    if (a.mag >= w.mag || a.reserve <= 0) return false;
    this.reloading = w.reload; this.reloadTotal = w.reload;
    if (this.viewmodel && this.viewmodel.play) this.viewmodel.play('reload', w.reload);
    this.events && this.events.emit && this.events.emit('reload', { weapon: this.current });   // round 21: audio
    return true;
  }

  get busy() { return this.reloading > 0 || this.switching > 0; }

  update(dt, input) {
    const p = this.player;
    const inp = input || {};
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.bloom = Math.max(0, this.bloom - dt * 0.03);

    // switch
    if (this.switching > 0) {
      this.switching -= dt;
      if (this.switchTo && this.switching <= this.switchTotal * 0.5) {
        this.current = this.switchTo; this.switchTo = null;
        if (p) p.adsFov = WEAPONS[this.current].adsFov;
        if (this.viewmodel && this.viewmodel.setWeapon) this.viewmodel.setWeapon(this.current);
      }
      if (this.switching <= 0) this.switching = 0;
    }
    // reload
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        const w = WEAPONS[this.current], a = this.mags[this.current];
        const take = Math.min(w.mag - a.mag, a.reserve);
        a.mag += take; a.reserve -= take;
      }
    }

    if (p && p.alive) {
      // slot request: 1/2/3, consumed on read by the input module
      const slot = inp.slot;
      if (slot === 1 || slot === 2 || slot === 3) this.setWeapon(KEYS[slot - 1]);
      else if (typeof slot === 'string' && WEAPONS[slot]) this.setWeapon(slot);

      const reloadEdge = !!inp.reload && !this.prevReload;
      if (reloadEdge) this.startReload();

      const grenadeEdge = !!inp.grenade && !this.prevGrenade;
      if (grenadeEdge && this.grenades > 0 && !this.busy) this.throwGrenade();

      const w = WEAPONS[this.current];
      const fire = !!inp.fire;
      const wantShot = w.auto ? fire : (fire && !this.prevFire);
      if (wantShot && this.fireCooldown <= 0 && !this.busy) {
        const a = this.mags[this.current];
        if (a.mag > 0) this.fire();
        else if (!this.prevFire || w.auto) { this.startReload(); this.fireCooldown = 0.25; }
      }
      this.prevFire = fire; this.prevReload = !!inp.reload; this.prevGrenade = !!inp.grenade;
    } else {
      this.prevFire = false; this.prevReload = false; this.prevGrenade = false;
    }

    this._updateGrenades(dt);
  }

  /** Current cone half angle in radians (for the HUD crosshair). */
  spread() {
    const p = this.player, w = WEAPONS[this.current];
    const adsT = p ? p.adsT : 0;
    let s = lerp(w.spread, w.adsSpread, adsT);
    if (p) {
      if (p.moving) s *= 1 + 0.35 * clamp(p.speed / 4.2, 0, 1.5);   // integrator: was 0.6; walking fire at 40 m could not land a burst
      if (p.crouched) s *= 0.8;
      if (!p.grounded) s *= 1.8;
    }
    return s + this.bloom * (1 - adsT * 0.6);
  }

  fire() {
    const p = this.player, w = WEAPONS[this.current], a = this.mags[this.current];
    if (!p || a.mag <= 0) {
      // round 21: the dry click, once per 0.3 s while the trigger is held on an empty magazine
      if (p && a.mag <= 0 && this.events && this.events.emit) { const now = performance.now(); if (!this._dryAt || now - this._dryAt > 300) { this._dryAt = now; this.events.emit('dry', { weapon: this.current }); } }
      return null;
    }
    a.mag--; this.shots++;
    this.fireCooldown = 60 / w.rpm;
    this.bloom = Math.min(this.bloom + 0.0018, 0.012);

    const origin = this._o.copy(p.eye());
    const dir = this._d.copy(p.forward());
    // spread cone
    const s = this.spread();
    const up = this._u.set(0, 1, 0);
    const right = this._r.crossVectors(dir, up).normalize();
    up.crossVectors(right, dir).normalize();
    dir.addScaledVector(right, gauss() * s).addScaledVector(up, gauss() * s).normalize();

    const MAXD = 320;
    let best = null;
    if (this.world && this.world.raycast) {
      const h = this.world.raycast(origin, dir, MAXD, { ignoreTag: 'player' });
      if (h && h.hit) best = { kind: 'static', dist: h.dist, point: h.point ? h.point.clone() : origin.clone().addScaledVector(dir, h.dist), normal: h.normal ? h.normal.clone() : up.clone(), tag: h.tag, surface: h.surface };
    }
    // targets
    this._ray.set(origin, dir);
    let bestT = null;
    for (const t of this.targets() || []) {
      if (!t || !t.alive || !t.hitboxes) continue;
      let boxes; try { boxes = t.hitboxes(); } catch { continue; }
      let head = null, body = null;
      for (const hb of boxes || []) {
        if (!hb || !hb.box) continue;
        if (this._ray.intersectBox(hb.box, this._hitP)) {
          const d = this._hitP.distanceTo(origin);
          if (d > MAXD) continue;
          const rec = { dist: d, point: this._hitP.clone(), part: hb.part };
          if (hb.part === 'head') { if (!head || d < head.dist) head = rec; }
          else if (!body || d < body.dist) body = rec;
        }
      }
      let pick = null;
      if (head && body) pick = (head.dist - body.dist) < 0.25 ? head : body;
      else pick = head || body;
      if (pick && (!bestT || pick.dist < bestT.dist)) bestT = { kind: 'target', target: t, ...pick };
    }
    if (bestT && (!best || bestT.dist < best.dist)) best = bestT;

    const from = origin.clone(), d0 = dir.clone();
    this.events && this.events.emit && this.events.emit('shot', { by: 'player', weapon: this.current, from, dir: d0 });

    // fx
    const muzzle = this.viewmodel && this.viewmodel.muzzleWorld ? this.viewmodel.muzzleWorld(this._muzzle) : this._muzzle.copy(origin).addScaledVector(dir, 0.5);
    const end = best ? best.point : origin.clone().addScaledVector(dir, MAXD);
    if (this.fx) {
      if (this.fx.muzzleFlash) this.fx.muzzleFlash(muzzle, dir);
      if (this.fx.casing) this.fx.casing(muzzle, dir);   // round 24: brass
      if (this.fx.tracer && (!best || best.dist > 2.5)) this.fx.tracer(muzzle.clone(), end.clone());
    }

    if (best && best.kind === 'target') {
      const t = best.target;
      const fall = best.dist <= w.range ? 1 : lerp(1, 0.55, clamp((best.dist - w.range) / (w.range * 0.8), 0, 1));
      const dmg = Math.round(w.damage * (best.part === 'head' ? w.headMult : 1) * fall);
      const wasAlive = t.alive;
      if (this.fx && this.fx.bloodHit) this.fx.bloodHit(best.point);
      this.hits++;
      if (t.takeDamage) t.takeDamage(dmg, from, 'player', { weapon: this.current, headshot: best.part === 'head' });
      this.events && this.events.emit && this.events.emit('hit', { by: 'player', target: t, part: best.part, damage: dmg });
      if (wasAlive && !t.alive) {
        this.kills++; if (best.part === 'head') this.headshots++;
        this.events && this.events.emit && this.events.emit('kill', {
          killer: { ...PLAYER_ID }, victim: { id: t.id, name: t.name, team: t.team }, weapon: this.current, headshot: best.part === 'head',
        });
      }
    } else if (best && this.fx && this.fx.impact) {
      const surf = this._surfaceOf(best);
      this.fx.impact(best.point, best.normal, surf);
      this.events && this.events.emit && this.events.emit('impact', { pos: best.point, surface: surf, by: 'player' });   // round 21: audio
    }

    // kick
    const adsT = p.adsT || 0;
    const kp = w.recoil[0] * (1 - adsT * 0.3) * (p.crouched ? 0.8 : 1);
    const ky = (Math.random() - 0.5) * 2 * w.recoil[1];
    if (p.addRecoil) p.addRecoil(kp, ky);
    if (p.blockSprint) p.blockSprint(0.35);
    if (this.viewmodel && this.viewmodel.play) this.viewmodel.play('fire');
    this.lastShot = { from, dir: d0, hit: best };
    return best;
  }

  _surfaceOf(hit) {
    if (hit.surface) return hit.surface;
    const tag = String(hit.tag || '').toLowerCase();
    if (/terrain|ground|sand|wadi|road/.test(tag)) {
      const tr = this.world && this.world.terrain;
      if (tr && tr.surfaceAt) return tr.surfaceAt(hit.point.x, hit.point.z);
      return 'sand';
    }
    if (/concrete|wall|bunker|pad|jersey|culvert|building|house|plinth|saddle/.test(tag)) return 'concrete';
    if (/rock|outcrop/.test(tag)) return 'rock';
    if (/wood|timber|pallet|crate|desk|table|bunk|shelv/.test(tag)) return 'wood';
    if (/sandbag|tyre|shrub|palm|debris/.test(tag)) return 'sand';
    return 'metal';
  }

  // ---------------------------------------------------------------- grenades
  async _loadGrenade() {
    if (this.grenadeAsset !== null) return;
    this.grenadeAsset = false;
    try {
      const g = await ASSET(this.assetBase + 'frag_grenade.js', { keepHierarchy: false, surfaces: true });
      if (g && g.children.length) this.grenadeAsset = true;
    } catch { this.grenadeAsset = false; }
  }

  throwGrenade() {
    const p = this.player; if (!p || this.grenades <= 0) return;
    this.grenades--;
    const spec = WEAPONS.frag;
    const origin = p.eye().clone();
    const dir = p.forward().clone();
    dir.y += 0.12; dir.normalize();
    const vel = dir.multiplyScalar(spec.throwSpeed).add(p.vel.clone().multiplyScalar(0.5));
    const g = { pos: origin.addScaledVector(p.forward(), 0.5), vel, fuse: spec.fuse, mesh: null, bounces: 0 };
    this.liveGrenades.push(g);
    if (this.viewmodel && this.viewmodel.play) this.viewmodel.play('grenade', 0.6);
    if (p.blockSprint) p.blockSprint(0.5);
    this._loadGrenade().then(async () => {
      if (!this._scene) return;
      const m = await ASSET(this.assetBase + 'frag_grenade.js', { keepHierarchy: false, surfaces: true });
      if (!m.children.length) return;
      // the loader puts the base at y 0; centre it so it tumbles about its middle
      m.children[0].position.y -= 0.055;
      if (this.liveGrenades.includes(g)) { g.mesh = m; this._scene.add(m); m.position.copy(g.pos); }
    });
    this.events && this.events.emit && this.events.emit('grenade', { by: 'player', pos: g.pos.clone() });
  }

  _updateGrenades(dt) {
    if (!this.liveGrenades.length) return;
    const G = 14;
    for (let i = this.liveGrenades.length - 1; i >= 0; i--) {
      const g = this.liveGrenades[i];
      g.fuse -= dt;
      g.vel.y -= G * dt;
      const step = g.vel.clone().multiplyScalar(dt);
      const len = step.length();
      if (len > 1e-5 && this.world && this.world.raycast) {
        const h = this.world.raycast(g.pos, step.clone().normalize(), len + 0.08, { ignoreTag: 'player' });
        if (h && h.hit && h.normal) {
          const n = h.normal.clone();
          const vn = g.vel.dot(n);
          if (vn < 0) g.vel.addScaledVector(n, -vn * 1.35);
          g.vel.multiplyScalar(0.55); g.bounces++;
          step.copy(g.vel).multiplyScalar(dt);
        }
      }
      g.pos.add(step);
      const gy = this.world && this.world.groundY ? this.world.groundY(g.pos.x, g.pos.z) : 0;
      if (g.pos.y < gy + 0.05) {
        g.pos.y = gy + 0.05;
        if (g.vel.y < 0) { g.vel.y = -g.vel.y * 0.35; g.vel.x *= 0.6; g.vel.z *= 0.6; g.bounces++; if (Math.abs(g.vel.y) < 0.6) g.vel.y = 0; }
      }
      if (g.mesh) {
        g.mesh.position.copy(g.pos);
        g.mesh.rotation.x += g.vel.length() * dt * 3; g.mesh.rotation.z += g.vel.length() * dt * 2.1;
      }
      if (g.fuse <= 0) {
        this._explode(g);
        if (g.mesh && g.mesh.parent) g.mesh.parent.remove(g.mesh);
        this.liveGrenades.splice(i, 1);
      }
    }
  }

  _explode(g) {
    const spec = WEAPONS.frag;
    const pos = g.pos.clone(); pos.y += 0.1;
    if (this.fx && this.fx.grenadeExplosion) this.fx.grenadeExplosion(pos);
    this.events && this.events.emit && this.events.emit('explosion', { by: 'player', pos: pos.clone(), radius: spec.radius });
    const chest = new THREE.Vector3();
    const los = (a, b) => (this.world && this.world.lineOfSight ? this.world.lineOfSight(a, b) : true);
    const p = this.player;
    for (const t of this.targets() || []) {
      if (!t || !t.alive || !t.pos) continue;
      chest.copy(t.pos); chest.y += 1.0;
      const d = chest.distanceTo(pos);
      if (d > spec.radius) continue;
      if (!los(pos, chest)) continue;
      const dmg = Math.round(spec.damage * Math.pow(1 - d / spec.radius, 1.1));
      if (dmg <= 0) continue;
      const wasAlive = t.alive;
      if (t.takeDamage) t.takeDamage(dmg, pos, 'player', { weapon: 'frag' });
      this.hits++;
      this.events && this.events.emit && this.events.emit('hit', { by: 'player', target: t, part: 'body', damage: dmg });
      if (wasAlive && !t.alive) {
        this.kills++;
        this.events && this.events.emit && this.events.emit('kill', { killer: { ...PLAYER_ID }, victim: { id: t.id, name: t.name, team: t.team }, weapon: 'frag', headshot: false });
      }
    }
    if (p && p.alive) {
      chest.copy(p.pos); chest.y += 1.0;
      const d = chest.distanceTo(pos);
      if (d < spec.radius && los(pos, chest)) {
        const dmg = Math.round(spec.damage * Math.pow(1 - d / spec.radius, 1.1) * 0.6);
        if (dmg > 0) p.takeDamage(dmg, pos, 'player', { weapon: 'frag' });
      }
      if (d < 20 && p.shake) p.shake(0.09 * (1 - d / 20), 0.35);
    }
  }
}
