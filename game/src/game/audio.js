/**
 * game/audio.js  (owner: game)
 *
 * Round 21 (Ben: "generate sound effects and music that make this a better game using atlas"): file based now.
 * Every sound is an mp3 in ./audio/ generated through Atlas (tools/genaudio.py: ElevenLabs SFX v2 for effects,
 * Google Lyria 3 Pro for music), decoded into AudioBuffers on start(). Variants are picked at random with a
 * little pitch jitter so a magazine never sounds the same twice. Positioned sounds take a distance gain and a
 * stereo pan from the listener's yaw; far shots swap to the distant shot recording. Loops: the desert ambience
 * bed, the pump jacks (positioned) and the music (title theme before deploy, the in game bed after, the end
 * sting on round end), each on its own gain so they can crossfade. The procedural fallback stays for any file
 * that failed to load. The context is created on the first user gesture.
 *
 * Events consumed (game/events.js): shot, footstep, explosion, hit, damage, kill, death, respawn, reload, dry,
 * impact, grenade. main.js also calls title(), deploy(), roundEnd().
 */
const FILES = {
  shot_ar: ['shot_ar_1', 'shot_ar_2', 'shot_ar_3'], shot_smg: ['shot_smg_1', 'shot_smg_2'], shot_dmr: ['shot_dmr_1', 'shot_dmr_2'], shot_far: ['shot_far'],
  reload_ar: ['reload_ar'], reload_smg: ['reload_smg'], reload_dmr: ['reload_dmr'], dry: ['dry_click'],
  grenade_pin: ['grenade_pin'], explosion: ['grenade_explode'],
  impact_sand: ['impact_sand_1', 'impact_sand_2'], impact_metal: ['impact_metal_1', 'impact_metal_2'], impact_concrete: ['impact_concrete_1'], impact_wood: ['impact_wood'], impact_rock: ['impact_concrete_1'], ricochet: ['ricochet'], flesh: ['flesh_hit'],
  step_sand: ['step_sand_1', 'step_sand_2', 'step_sand_3', 'step_sand_4'], step_metal: ['step_metal_1', 'step_metal_2'], step_concrete: ['step_concrete_1', 'step_concrete_2'],
  hit: ['hit_marker'], headshot: ['headshot'], damage: ['damage_taken'], death: ['death'], kill: ['kill_confirm'],
  ambience: ['ambience_desert'], pumpjack: ['pumpjack_loop'], generator: ['generator_loop'], gust: ['wind_gust'],
  ui_deploy: ['ui_deploy'], ui_end: ['ui_round_end'],
  music_title: ['music_title'], music_ingame: ['music_ingame'], music_end: ['music_end'],
};
const VOL = { music: 0.32, ambience: 0.35, loops: 0.5, sfx: 1.0 };

export class Audio {
  constructor({ events, player, base = './audio/' }) {
    this.events = events; this.player = player; this.base = base;
    this.ctx = null; this.master = null; this.noise = null;
    this.buffers = new Map(); this.loaded = false;
    this.enabled = true;
    this.musicGain = null; this.music = null; this.musicKey = null;
    this.loops = [];   // { src, gain, pos, base }
    this.lastStep = 0; this.lastShotAt = new Map();
    this._bind();
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = VOL.music; this.musicGain.connect(this.master);
      this._load();
    } catch (e) { this.ctx = null; }
  }

  async _load() {
    const names = new Set(); for (const list of Object.values(FILES)) for (const n of list) names.add(n);
    const stamp = globalThis.__BUILD_STAMP__ ? `?v=${globalThis.__BUILD_STAMP__}` : '';
    let ok = 0, fail = 0;
    await Promise.all([...names].map(async (n) => {
      try {
        const r = await fetch(`${this.base}${n}.mp3${stamp}`);
        if (!r.ok) throw new Error(r.status);
        const ab = await r.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(ab);
        this.buffers.set(n, buf); ok++;
      } catch (e) { fail++; }
    }));
    this.loaded = true;
    console.info(`[audio] ${ok} sounds loaded${fail ? `, ${fail} missing (procedural fallback)` : ''}`);
    if (this._pendingMusic) { const k = this._pendingMusic; this._pendingMusic = null; this.playMusic(k); }
    if (this._pendingAmbience) { this._pendingAmbience = false; this.ambience(); }
    this.update();   // the positioned loops queued before the files were decoded (pump jacks, generators)
  }

  _buf(key) {
    const list = FILES[key]; if (!list) return null;
    const have = list.filter((n) => this.buffers.has(n));
    if (!have.length) return null;
    return this.buffers.get(have[(Math.random() * have.length) | 0]);
  }

  _pan(pos) {
    const p = this.player;
    if (!pos || !p) return { gain: 1, pan: 0, d: 0 };
    const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const gain = 1 / (1 + d * d / 90);
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const pan = d > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0;
    return { gain, pan, d };
  }

  _voice(pos, vol) {
    const ctx = this.ctx; if (!ctx) return null;
    const { gain, pan } = this._pan(pos);
    const g = ctx.createGain(); g.gain.value = vol * gain;
    let node = g;
    if (ctx.createStereoPanner) { const sp = ctx.createStereoPanner(); sp.pan.value = pan; g.connect(sp); node = sp; }
    node.connect(this.master);
    return g;
  }

  /** play a file variant at pos (null = on the listener); rate jitter in cents; returns the source or null */
  _play(key, pos, vol, { jitter = 60, rate = 1, out = null, loop = false } = {}) {
    const ctx = this.ctx; if (!ctx || !this.enabled) return null;
    const buf = this._buf(key); if (!buf) return null;
    const dest = out || this._voice(pos, vol); if (!dest) return null;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = loop;
    src.playbackRate.value = rate * Math.pow(2, ((Math.random() * 2 - 1) * jitter) / 1200);
    src.connect(dest); src.start(ctx.currentTime);
    return src;
  }

  // ---------------------------------------------------------------- effects
  shot(pos, weapon = 'ar', own = false) {
    const { d } = this._pan(own ? null : pos);
    // round 22d (Ben: "all 3 gunshot sounds 50% louder"): 0.45/0.55/0.5 -> 0.68/0.83/0.75
    if (!own && d > 70 && this._play('shot_far', pos, 0.68, { jitter: 80 })) return;
    if (this._play('shot_' + (FILES['shot_' + weapon] ? weapon : 'ar'), own ? null : pos, own ? 0.83 : 0.75, { jitter: 50 })) return;
    this._shotProcedural(pos, weapon, own);
  }
  footstep(pos, surface, strength) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (now - this.lastStep < 0.12) return; this.lastStep = now;
    const key = surface === 'metal' || surface === 'grating' ? 'step_metal' : surface === 'concrete' || surface === 'rock' ? 'step_concrete' : 'step_sand';
    if (this._play(key, pos, 0.28 * strength, { jitter: 120 })) return;
    this._stepProcedural(pos, surface, strength);
  }
  explosion(pos) { if (!this._play('explosion', pos, 1.0, { jitter: 40 })) this._explosionProcedural(pos); }
  impact(pos, surface) {
    const key = surface === 'metal' ? 'impact_metal' : surface === 'concrete' ? 'impact_concrete' : surface === 'rock' ? 'impact_rock' : surface === 'wood' || surface === 'timber' ? 'impact_wood' : 'impact_sand';
    this._play(key, pos, 0.45, { jitter: 150 });
    if (surface === 'metal' && Math.random() < 0.3) this._play('ricochet', pos, 0.3, { jitter: 200 });
  }
  reload(weapon) { this._play('reload_' + (FILES['reload_' + weapon] ? weapon : 'ar'), null, 0.5, { jitter: 20 }); }
  dry() { this._play('dry', null, 0.4, { jitter: 40 }); }
  grenadePin() { this._play('grenade_pin', null, 0.4); }
  tick(vol = 0.2, freq = 1800) {
    if (this._play(freq >= 2400 ? 'headshot' : 'hit', null, freq >= 2400 ? 0.5 : 0.45, { jitter: 30 })) return;
    this._tickProcedural(vol, freq);
  }
  damaged() { if (!this._play('damage', null, 0.5, { jitter: 80 })) this._tickProcedural(0.14, 300); }
  died() { this._play('death', null, 0.6); }
  killed(headshot) { this._play('kill', null, 0.35, { jitter: 20 }); }

  // ---------------------------------------------------------------- loops and music
  ambience() {
    if (!this.ctx) return; if (!this.loaded) { this._pendingAmbience = true; return; }
    if (this.loops.some((l) => l.key === 'ambience')) return;
    const g = this.ctx.createGain(); g.gain.value = VOL.ambience; g.connect(this.master);
    const src = this._play('ambience', null, 1, { jitter: 0, out: g, loop: true });
    if (src) this.loops.push({ key: 'ambience', src, gain: g, pos: null, base: VOL.ambience });
  }
  /** a positioned loop (pump jack, generator) at pos; updated by update() with distance */
  addLoop(key, pos, base = VOL.loops) {
    if (!this.ctx || !this.loaded) { (this._pendingLoops = this._pendingLoops || []).push([key, pos, base]); return; }
    const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.master);
    const src = this._play(key, null, 1, { jitter: 30, out: g, loop: true });
    if (src) this.loops.push({ key, src, gain: g, pos, base });
  }
  update() {
    if (!this.ctx) return;
    if (this.loaded && this._pendingLoops) { const L = this._pendingLoops; this._pendingLoops = null; for (const [k, p, b] of L) this.addLoop(k, p, b); }
    for (const l of this.loops) { if (!l.pos) continue; const { gain } = this._pan(l.pos); l.gain.gain.value = l.base * Math.min(1, gain * 3); }
  }
  playMusic(key, fade = 1.5) {
    if (!this.ctx) return; if (!this.loaded) { this._pendingMusic = key; return; }
    if (this.musicKey === key) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (this.music) { const old = this.music, og = this.musicOut; og.gain.setValueAtTime(og.gain.value, t); og.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => { try { old.stop(); } catch (e) { /* stopped */ } }, fade * 1000 + 100); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade); g.connect(this.musicGain);
    const src = this._play(key, null, 1, { jitter: 0, out: g, loop: key !== 'music_end' });
    this.music = src; this.musicOut = g; this.musicKey = src ? key : null;
  }
  stopMusic(fade = 1.0) { if (this.music) { const t = this.ctx.currentTime, old = this.music, og = this.musicOut; og.gain.linearRampToValueAtTime(0, t + fade); setTimeout(() => { try { old.stop(); } catch (e) { /* stopped */ } }, fade * 1000 + 100); this.music = null; this.musicKey = null; } }
  title() { this.start(); this.playMusic('music_title', 2.0); }
  deploy() {
    // round 22g (Ben: "i don't hear music on the title screen"): browsers need a gesture before any audio, and on
    // this screen the only gesture IS the Deploy press, so the title theme never got a chance. Deploy now opens on
    // the theme for four seconds and crossfades into the combat bed, which is what a menu press sounds like in the
    // games this is measured against. Clicking anywhere before Deploy still starts the theme properly (main.js).
    this.start(); this._play('ui_deploy', null, 0.6); this.ambience();
    if (this.musicKey === 'music_title') { setTimeout(() => this.playMusic('music_ingame', 3.0), 4000); return; }
    this.playMusic('music_title', 0.4);
    setTimeout(() => this.playMusic('music_ingame', 3.0), 4000);
  }
  roundEnd() { this._play('ui_end', null, 0.7); this.playMusic('music_end', 0.6); }

  // ---------------------------------------------------------------- procedural fallbacks (the round 0 sounds)
  _shotProcedural(pos, weapon, own) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const out = this._voice(own ? null : pos, own ? 0.5 : 0.35); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = weapon === 'dmr' ? 0.7 : weapon === 'smg' ? 1.3 : 1.0;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = weapon === 'dmr' ? 700 : 1400; bp.Q.value = 0.7;
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + (weapon === 'dmr' ? 0.22 : 0.12));
    src.connect(bp); bp.connect(env); env.connect(out); src.start(t); src.stop(t + 0.3);
  }
  _stepProcedural(pos, surface, strength) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const out = this._voice(null, 0.12 * strength); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = surface === 'concrete' || surface === 'rock' ? 2400 : 900;
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(f); f.connect(env); env.connect(out); src.start(t, Math.random()); src.stop(t + 0.1);
  }
  _explosionProcedural(pos) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const out = this._voice(pos, 0.9); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    src.connect(f); f.connect(env); env.connect(out); src.start(t); src.stop(t + 1.2);
  }
  _tickProcedural(vol, freq) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const out = this._voice(null, vol); if (!out) return;
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
    const env = ctx.createGain(); env.gain.setValueAtTime(0.5, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(env); env.connect(out); osc.start(t); osc.stop(t + 0.06);
  }

  _bind() {
    const ev = this.events; if (!ev || !ev.on) return;
    const isPlayer = (x) => x === 'player' || (x && x.id === 'player');
    ev.on('shot', (p) => this.shot(p.from, p.weapon, isPlayer(p.by)));
    ev.on('footstep', (p) => this.footstep(p.pos, p.surface, p.strength));
    ev.on('explosion', (p) => this.explosion(p.pos));
    ev.on('impact', (p) => this.impact(p.pos, p.surface));
    ev.on('reload', (p) => this.reload(p.weapon));
    ev.on('dry', () => this.dry());
    ev.on('grenade', () => this.grenadePin());
    ev.on('hit', (p) => { if (isPlayer(p.by)) this.tick(0.16, p.part === 'head' ? 2400 : 1800); });
    ev.on('damage', (p) => { if (p.target && (p.target.id === 'player' || p.target === this.player)) this.damaged(); });
    ev.on('kill', (p) => { if (isPlayer(p.killer)) this.killed(!!p.headshot); });
    ev.on('death', (p) => { if (!p || !p.who || isPlayer(p.who) || (p.victim && isPlayer(p.victim))) this.died(); });
  }
}
