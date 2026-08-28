/**
 * game/mode.js  (owner: game)
 *
 * Team deathmatch, 5 v 5, first to 30, seven minutes. Counts kills from the shared
 * Events bus (the shooter emits 'kill'; victims never do, so nothing double counts),
 * keeps a per name scoreboard, ends the round at the target or when the clock runs
 * out, and emits 'roundEnd' { winner, rangers, militia } once.
 *
 * Bot names are the ARCHITECTURE list; the player is 'You' on the rangers.
 */
export class TDM {
  constructor({ events, target = 30, seconds = 420, respawnDelay = 4.0, playerName = 'You' } = {}) {
    this.events = events;
    this.target = target;
    this.seconds = seconds;
    this.respawnDelay = respawnDelay;
    this.playerName = playerName;
    this.botNames = {
      rangers: ['Reaper', 'Ghost', 'Hawk', 'Viper'],
      militia: ['Jackal', 'Cobra', 'Scorpion', 'Hyena', 'Vulture'],
    };
    this.score = { rangers: 0, militia: 0 };
    this.timeLeft = seconds;
    this.over = false;
    this.winner = null;
    this.running = false;
    this.board = new Map();          // id -> { id, name, team, kills, deaths, headshots }
    this.playerStats = { kills: 0, deaths: 0, shots: 0, hits: 0 };
    this.elapsed = 0;
    this.feed = [];
    if (events && events.on) {
      events.on('kill', (p) => this.onKill(p));
      events.on('shot', (p) => { if (this.running && p && (p.by === 'player' || (p.by && p.by.id === 'player'))) this.playerStats.shots++; });
      events.on('hit', (p) => { if (this.running && p && (p.by === 'player' || (p.by && p.by.id === 'player'))) this.playerStats.hits++; });
    }
  }

  /** register an entity so it appears on the scoreboard even with zero kills */
  register(ent) {
    if (!ent || ent.id == null) return;
    if (!this.board.has(ent.id)) this.board.set(ent.id, { id: ent.id, name: ent.name || String(ent.id), team: ent.team || 'militia', kills: 0, deaths: 0, headshots: 0 });
    return this.board.get(ent.id);
  }

  start() {
    this.running = true;
    this.over = false;
    this.winner = null;
  }

  reset() {
    this.score.rangers = 0; this.score.militia = 0;
    this.timeLeft = this.seconds;
    this.over = false; this.winner = null; this.running = false;
    this.elapsed = 0;
    this.feed.length = 0;
    for (const row of this.board.values()) { row.kills = 0; row.deaths = 0; row.headshots = 0; }
    this.playerStats.kills = 0; this.playerStats.deaths = 0; this.playerStats.shots = 0; this.playerStats.hits = 0;
  }

  update(dt) {
    if (!this.running || this.over) return;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) this._end();
  }

  onKill({ killer, victim, weapon, headshot } = {}) {
    if (!this.running || this.over) return;
    const k = this.register(killer), v = this.register(victim);
    if (k && v && k.team !== v.team) {
      k.kills++;
      if (headshot) k.headshots++;
      if (this.score[k.team] !== undefined) this.score[k.team]++;
    }
    if (v) v.deaths++;
    if (k && k.id === 'player') this.playerStats.kills++;
    if (v && v.id === 'player') this.playerStats.deaths++;
    this.feed.push({ killer, victim, weapon, headshot, t: this.elapsed });
    if (this.feed.length > 40) this.feed.shift();
    if (this.score.rangers >= this.target || this.score.militia >= this.target) this._end();
  }

  _end() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    const r = this.score.rangers, m = this.score.militia;
    this.winner = r > m ? 'rangers' : m > r ? 'militia' : 'draw';
    if (this.events && this.events.emit) this.events.emit('roundEnd', { winner: this.winner, rangers: r, militia: m });
  }

  /** scoreboard rows for the round end screen */
  scoreboard() {
    return [...this.board.values()].map((r) => ({ name: r.name, team: r.team, kills: r.kills, deaths: r.deaths, me: r.id === 'player' }));
  }

  accuracy() {
    const s = this.playerStats;
    return s.shots ? Math.min(1, s.hits / s.shots) : 0;
  }
}
