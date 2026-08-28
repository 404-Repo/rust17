/**
 * game/events.js  (owner: game)
 *
 * The one event bus every module shares. Names and payloads, per docs/ARCHITECTURE.md:
 *   'shot'      { by, weapon, from, dir }            by is 'player' or { id, name, team }
 *   'hit'       { by, target, part, damage }
 *   'kill'      { killer, victim, weapon, headshot } killer and victim are { id, name, team }
 *   'respawn'   { id, team, pos }
 *   'roundEnd'  { winner, rangers, militia }
 *   'damage'    { target, amount, fromPos }
 * plus the ones the player and ai modules add: 'death', 'footstep', 'land', 'grenade',
 * 'explosion', 'respawnRequest'.
 *
 * A listener that throws is logged and never stops the others; the game loop must not die
 * because a HUD line failed to render.
 */
export class Events {
  constructor() { this._map = new Map(); }

  on(name, fn) {
    let set = this._map.get(name);
    if (!set) { set = new Set(); this._map.set(name, set); }
    set.add(fn);
    return () => this.off(name, fn);
  }

  once(name, fn) {
    const off = this.on(name, (p) => { off(); fn(p); });
    return off;
  }

  off(name, fn) {
    const set = this._map.get(name);
    if (set) set.delete(fn);
  }

  emit(name, payload) {
    const set = this._map.get(name);
    if (!set || !set.size) return 0;
    let n = 0;
    for (const fn of [...set]) {
      try { fn(payload); n++; } catch (e) { console.warn(`[events] listener for '${name}' threw:`, e && e.message ? e.message : e); }
    }
    return n;
  }

  clear() { this._map.clear(); }
}
