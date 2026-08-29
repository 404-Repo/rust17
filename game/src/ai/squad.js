/**
 * Squad manager: one per team. Hands each bot a lane from MAP-PLAN section 5 (north, road,
 * south) with at most two bots per lane, sends the third bot through a flank (the wadi or the
 * trench, MAP-PLAN 5.4 and 5.5) once a lane has been contested for 8 s, keeps the derrick
 * contested by sending the first road bot up to platform 1, and respawns dead bots after the
 * mode's respawn delay at the spawn chosen by the MAP-PLAN section 7 rule (farthest from any
 * enemy with no enemy line of sight; else the fewest enemies within 30 m).
 *
 * Lane waypoints are listed west to east; militia walk them in reverse.
 */
import * as THREE from 'three';
import { Bot } from './bot.js?v=r22-202608292058';   // fix4 ai: corpse ageing

export const LANES = {
  north: [[-58, -16], [-44, -14], [-36, -26], [-22, -33], [-4, -33], [8, -30], [20, -30], [30, -24], [46, -36], [58, -16]],
  road:  [[-54, 6], [-44, 6], [-32, 4], [-20, 4], [-10, 6], [0, 6], [14, 6], [24, 7], [34, 6], [44, 6], [54, 6]],
  south: [[-58, 16], [-44, 18], [-30, 24], [-18, 22], [-4, 27], [8, 28], [18, 30], [27, 31], [36, 30], [47, 24], [58, 16]],
  wadi:  [[-10, -46], [-4, -30], [4, -22], [11, -12], [14, -2], [14, 8], [16, 18], [18, 30], [24, 48]],
  trench: [[-46, 49], [-24, 49], [-22, 51], [2, 51], [4, 49], [30, 49], [33, 46]],
};
const MAIN = ['north', 'road', 'south'];
const DERRICK_P1 = [-2, -10];          // platform 1 (y from the nav island)
const HOLD_FRACTION = 0.8;             // how far along the lane a bot pushes before holding (integrator: was 0.68; first contact came too late)

const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class SquadManager {
  constructor({ bots = [], team = 'militia', nav, events, spawns = null, respawnDelay = 4.0, world = null }) {
    this.bots = bots; this.team = team; this.nav = nav; this.events = events; this.world = world;
    this.spawns = spawns;               // [[x, z, yaw], ...] or null (then 'respawnRequest' is emitted)
    this.respawnDelay = respawnDelay;
    this.lanes = {};
    for (const k of Object.keys(LANES)) this.lanes[k] = { contestedT: 0 };
    this.derrickHolder = null;
    this.intel = { pos: new THREE.Vector3(), t: -99 };
    this.time = 0;
    this._pending = new Set();
    this.desiredAlive = 5;
    // fix4 ai: read only probe for the filmstrip tools (bot state, rig state, speed per bot); harmless in play
    if (typeof window !== 'undefined') {
      const reg = (window.__DBGAI_SQUADS__ ||= []); reg.push(this);
      window.__DBGAI__ = () => reg.flatMap((s) => s.bots.map((b) => ({ id: b.id, team: b.team, st: b.state, rig: b.rig ? b.rig.state : '-', spd: +b.speed.toFixed(1), hp: Math.round(b.hp), tgt: b.target ? (b.target.id || 'player') : null, peek: b.peek, cr: b.crouched, x: +b.pos.x.toFixed(1), z: +b.pos.z.toFixed(1) })));
    }
  }

  laneCount(lane) { let n = 0; for (const b of this.bots) if (b.alive && b.objective && b.objective.lane === lane) n++; return n; }
  flankCount(lane) { let n = 0; for (const b of this.bots) if (b.alive && b.objective && b.objective.flank && b.objective.flankOf === lane) n++; return n; }

  _laneWaypoints(lane, forward) {
    const pts = LANES[lane].map(([x, z]) => new THREE.Vector3(x, this.nav ? this.nav.groundY(x, z) : 0, z));
    return forward ? pts : pts.slice().reverse();
  }

  _objectiveFor(bot, lane, flank = false) {
    const forward = this.team === 'rangers';
    let wps = this._laneWaypoints(lane, forward);
    if (flank && this.nav) {
      // through the low channel from the bot to the far end of the lane it is flanking
      const laneEnd = wps[Math.floor(wps.length * HOLD_FRACTION)];
      const side = lane === 'south' || lane === 'trench' ? 1 : -1;
      const fp = this.nav.flankPoints(bot.pos, laneEnd, side);
      return { lane: side > 0 ? 'trench' : 'wadi', waypoints: fp, hold: laneEnd, flank: true, flankOf: lane };
    }
    if (lane === 'wadi' || lane === 'trench') {
      const holdIdx = Math.floor(wps.length * 0.5);
      return { lane, waypoints: wps, hold: wps[holdIdx], flank: false };
    }
    const holdIdx = Math.min(wps.length - 1, Math.floor(wps.length * HOLD_FRACTION));
    const hold = wps[holdIdx];
    const list = wps.slice(0, holdIdx + 1);
    return { lane, waypoints: list, hold, flank: false };
  }

  assignLanes() {
    for (const b of this.bots) {
      if (!b.alive || b.objective) continue;
      // a lane contested for 8 s with a bot already in it: the reinforcement flanks it instead
      let hot = null, hotT = 8;
      for (const l of MAIN) { const L = this.lanes[l]; if (L.contestedT > hotT && this.laneCount(l) >= 1 && this.flankCount(l) < 1) { hot = l; hotT = L.contestedT; } }
      if (hot) { b.setObjective(this._objectiveFor(b, hot, true)); continue; }
      // pick the emptiest main lane; prefer the lane where the enemy was last seen.
      // integrator: the player's own team takes the flanks first and leaves the road (the
      // human's lane) to the human, so the enemy road push meets the player, not four escorts.
      const order = this.team === 'rangers' ? ['north', 'south', 'road'] : MAIN;
      const counts = MAIN.map((l) => [l, this.laneCount(l)]);
      counts.sort((a, c) => a[1] - c[1] || order.indexOf(a[0]) - order.indexOf(c[0]));
      let lane = counts[0][0];
      if (this.time - this.intel.t < 15) {
        const near = this._laneNearest(this.intel.pos);
        if (this.laneCount(near) < 2) lane = near;
      }
      if (this.laneCount(lane) >= 2) lane = counts[0][0];
      const obj = this._objectiveFor(b, lane);
      // first road bot goes up the derrick
      if (lane === 'road' && (!this.derrickHolder || !this.derrickHolder.alive)) {
        this.derrickHolder = b;
        const y = this.nav ? this.nav.groundY(DERRICK_P1[0], DERRICK_P1[1]) : 0;
        const p1 = new THREE.Vector3(DERRICK_P1[0], Math.max(y, 4.8), DERRICK_P1[1]);
        // find the island node if it exists; a nearest node with y above 4 m is the deck
        let deck = null;
        if (this.nav) { const id = this.nav.nearest(p1); if (id >= 0 && this.nav.py[id] > 3.5) deck = this.nav.nodePos(id); }
        if (deck) { obj.waypoints = obj.waypoints.filter((w) => (this.team === 'rangers' ? w.x < -8 : w.x > 4)); obj.waypoints.push(deck); obj.hold = deck; }
      }
      b.setObjective(obj);
    }
  }

  _laneNearest(p) {
    let best = 'road', bd = Infinity;
    for (const l of MAIN) for (const [x, z] of LANES[l]) { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = l; } }
    return best;
  }

  _enemies(ctx) {
    const out = [];
    if (ctx.player && ctx.player.alive !== false && (ctx.player.team || 'rangers') !== this.team) out.push(ctx.player);
    for (const b of ctx.bots || []) if (b.alive && b.team !== this.team) out.push(b);
    return out;
  }

  /** MAP-PLAN section 7: farthest from any enemy with no enemy line of sight, else fewest enemies within 30 m. */
  pickSpawn(ctx) {
    const spawns = this.spawns;
    if (!spawns || !spawns.length) return null;
    const enemies = this._enemies(ctx);
    let best = null, bestD = -1;
    let fallback = null, fewest = Infinity;
    for (const s of spawns) {
      const x = s[0], z = s[1];
      const y = this.nav ? this.nav.groundY(x, z) : 0;
      let minD = Infinity, near = 0, seen = false;
      const eye = _v.set(x, y + 1.65, z);
      for (const e of enemies) {
        const d = Math.hypot(e.pos.x - x, e.pos.z - z);
        if (d < minD) minD = d;
        if (d < 30) near++;
        if (!seen && this.world && typeof this.world.lineOfSight === 'function') {
          const ee = _w.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
          if (this.world.lineOfSight(eye, ee)) seen = true;
        }
      }
      if (!seen && minD > bestD) { bestD = minD; best = s; }
      if (near < fewest) { fewest = near; fallback = s; }
    }
    return best || fallback || spawns[Math.floor(Math.random() * spawns.length)];
  }

  update(dt, ctx) {
    this.time = ctx && ctx.time !== undefined ? ctx.time : this.time + dt;
    Bot.updateCorpses(this.time);
    // shared intel: anything any bot can see
    for (const b of this.bots) {
      if (b.alive && b.target) { this.intel.pos.copy(b.target.pos); this.intel.t = this.time; }
    }
    // contested lanes
    for (const k of Object.keys(this.lanes)) {
      let hot = false;
      for (const b of this.bots) if (b.alive && b.objective && (b.objective.lane === k || b.objective.flankOf === k) && (b.target || b.underFireT > 0)) { hot = true; break; }
      const L = this.lanes[k];
      L.contestedT = hot ? L.contestedT + dt : Math.max(0, L.contestedT - dt * 0.5);
    }
    // respawns
    for (const b of this.bots) {
      if (b.alive || b.deadT < this.respawnDelay) continue;
      if (this._pending.has(b)) continue;
      const s = this.pickSpawn(ctx || {});
      if (s) {
        b.respawn(s[0], s[1], s[2] !== undefined ? s[2] : (this.team === 'rangers' ? Math.PI / 2 : -Math.PI / 2));
        if (this.events) this.events.emit('respawn', { id: b.id, team: b.team, pos: b.pos.clone() });
      } else if (this.events) {
        this._pending.add(b);
        this.events.emit('respawnRequest', { bot: b, team: this.team, done: () => this._pending.delete(b) });
      }
    }
    // a bot that reached its hold and has been idle a while gets a fresh lane
    for (const b of this.bots) {
      if (!b.alive || !b.objective) continue;
      if (b.state === 'patrol' && b.objective.index >= b.objective.waypoints.length) {
        b.objective.holdT = (b.objective.holdT || 0) + dt;
        if (b.objective.holdT > rnd(18, 30)) { if (this.derrickHolder === b) this.derrickHolder = null; b.setObjective(null); }
      }
    }
    this.assignLanes();
  }
}
