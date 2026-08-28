/**
 * game/audio.js  (owner: game, optional)
 *
 * Procedural WebAudio only: no files. Gunshots are a short noise burst through a band
 * pass with a low thump, footsteps a filtered click, the grenade a long low boom, hits a
 * short tick. Everything is positioned with a simple distance gain and stereo pan from the
 * listener's yaw. The context is created on the first user gesture (the DEPLOY press).
 */
export class Audio {
  constructor({ events, player }) {
    this.events = events; this.player = player;
    this.ctx = null; this.master = null; this.noise = null;
    this.enabled = true;
    this._bind();
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  }

  _pan(pos) {
    const p = this.player;
    if (!pos || !p) return { gain: 1, pan: 0 };
    const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const gain = 1 / (1 + d * d / 90);
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const pan = d > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0;
    return { gain, pan };
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

  shot(pos, weapon = 'ar', own = false) {
    const ctx = this.ctx; if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const out = this._voice(own ? null : pos, own ? 0.5 : 0.35); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = weapon === 'dmr' ? 0.7 : weapon === 'smg' ? 1.3 : 1.0;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = weapon === 'dmr' ? 700 : 1400; bp.Q.value = 0.7;
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + (weapon === 'dmr' ? 0.22 : 0.12));
    src.connect(bp); bp.connect(env); env.connect(out);
    src.start(t); src.stop(t + 0.3);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    const oe = ctx.createGain(); oe.gain.setValueAtTime(0.7, t); oe.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(oe); oe.connect(out); osc.start(t); osc.stop(t + 0.12);
  }

  footstep(pos, surface, strength) {
    const ctx = this.ctx; if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const out = this._voice(null, 0.12 * strength); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = surface === 'concrete' || surface === 'rock' ? 2400 : 900;
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(f); f.connect(env); env.connect(out); src.start(t, Math.random()); src.stop(t + 0.1);
  }

  explosion(pos) {
    const ctx = this.ctx; if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const out = this._voice(pos, 0.9); if (!out) return;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const env = ctx.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    src.connect(f); f.connect(env); env.connect(out); src.start(t); src.stop(t + 1.2);
  }

  tick(vol = 0.2, freq = 1800) {
    const ctx = this.ctx; if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    const out = this._voice(null, vol); if (!out) return;
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
    const env = ctx.createGain(); env.gain.setValueAtTime(0.5, t); env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(env); env.connect(out); osc.start(t); osc.stop(t + 0.06);
  }

  _bind() {
    const ev = this.events; if (!ev || !ev.on) return;
    ev.on('shot', (p) => { const own = p.by === 'player' || (p.by && p.by.id === 'player'); this.shot(p.from, p.weapon, own); });
    ev.on('footstep', (p) => this.footstep(p.pos, p.surface, p.strength));
    ev.on('explosion', (p) => this.explosion(p.pos));
    ev.on('hit', (p) => { if (p.by === 'player' || (p.by && p.by.id === 'player')) this.tick(0.16, p.part === 'head' ? 2400 : 1800); });
    ev.on('damage', (p) => { if (p.target && (p.target.id === 'player' || p.target === this.player)) this.tick(0.14, 300); });
  }
}
