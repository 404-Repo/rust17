/**
 * The HUD for DERRICK, per docs/ARCHITECTURE.md and tools/CONTRACT.md.
 *
 * Creates #hud (score, timer, compass, kill feed, health, ammo, crosshair, hit marker,
 * the round tag in the bottom right corner) and its sibling #dmg (damage vignette and the
 * directional hit indicator). Both are pointer-events none and both are what
 * `fpstest.mjs --nohud` hides, so nothing measured in a frame comes from the interface.
 *
 * No image, no font file: system sans, uppercase, tracked, one warm off white
 * (#efe6d3) over a dark shadow, red oxide (#8b4530) and floodlight warm (#ffd9a0) as the
 * only accents, the two team colours for names. Every dash is a plain hyphen.
 *
 * Everything time based (hit markers, feed lines, damage flashes) runs on CSS animations
 * and timeouts, so the HUD works with or without update(dt).
 */
const WEAPON_NAMES = { ar: 'Assault rifle', smg: 'SMG', dmr: 'Marksman rifle', frag: 'Frag' };
const WEAPON_SHORT = { ar: 'AR', smg: 'SMG', dmr: 'DMR', frag: 'FRAG', assault_rifle: 'AR', marksman_rifle: 'DMR', frag_grenade: 'FRAG' };
const FEED_LINES = 5, FEED_MS = 5000;

const CSS = `
#hud,#dmg{position:fixed;inset:0;pointer-events:none;z-index:10;display:none;overflow:hidden;
  font-family:"Helvetica Neue",Helvetica,Arial,"Segoe UI",Roboto,sans-serif;color:#efe6d3;
  text-transform:uppercase;letter-spacing:.08em;font-variant-numeric:tabular-nums;
  text-shadow:0 1px 2px rgba(0,0,0,.75),0 0 6px rgba(0,0,0,.35)}
#dmg{z-index:9}
#hud.on,#dmg.on{display:block}
#hud .h-top{position:absolute;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);
  display:flex;align-items:center;gap:14px;font-size:13px;font-weight:700}
#hud .h-team{display:flex;align-items:center;gap:8px;padding:5px 10px;background:rgba(16,12,9,.42);border-bottom:2px solid transparent}
#hud .h-team.rangers{border-bottom-color:#9fc9de}
#hud .h-team.militia{border-bottom-color:#e0654a}
#hud .h-team b{font-size:20px;line-height:1;min-width:1.4em;text-align:center;font-weight:800}
#hud .h-team.lead b{color:#ffd9a0}
#hud .h-time{font-size:22px;font-weight:800;letter-spacing:.05em;min-width:4.2em;text-align:center;padding:2px 8px;background:rgba(16,12,9,.42)}
#hud .h-time.late{color:#e0654a}
#hud .h-target{position:absolute;left:50%;transform:translateX(-50%);top:calc(max(10px,env(safe-area-inset-top)) + 40px);
  font-size:9px;letter-spacing:.22em;opacity:.7}
#hud .h-compass{position:absolute;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 56px);width:min(300px,56vw);height:18px;
  margin-left:min(-150px,-28vw);overflow:hidden;opacity:.85;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent);mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)}
#hud .h-compass .strip{position:absolute;top:0;left:50%;height:100%;white-space:nowrap;will-change:transform}
#hud .h-compass .t{position:absolute;top:0;font-size:10px;font-weight:700;letter-spacing:0;transform:translateX(-50%)}
#hud .h-compass .t.m{top:6px;width:1px;height:6px;background:rgba(239,230,211,.5)}
#hud .h-compass .c{position:absolute;left:50%;top:0;width:2px;height:100%;margin-left:-1px;background:#ffd9a0}
#hud .h-feed{position:absolute;right:max(14px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));
  display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:11px;font-weight:700;letter-spacing:.06em}
#hud .h-feed .l{padding:3px 8px;background:rgba(16,12,9,.48);animation:hfeed ${FEED_MS}ms linear forwards;display:flex;gap:7px;align-items:center}
#hud .h-feed .l.me{background:rgba(139,69,48,.55)}
#hud .h-feed .w{font-size:9px;padding:1px 4px;border:1px solid rgba(239,230,211,.55);letter-spacing:.1em}
#hud .h-feed .hs{font-size:8px;padding:1px 3px;background:#e0654a;color:#1a1512;letter-spacing:.1em}
#hud .rangers,#hud .t-rangers{color:#9fc9de}
#hud .militia,#hud .t-militia{color:#e0654a}
@keyframes hfeed{0%{opacity:0;transform:translateX(10px)}4%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
#hud .h-hp{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:min(220px,40vw)}
#hud .h-hp .n{display:flex;justify-content:space-between;align-items:baseline;font-size:10px;letter-spacing:.2em;margin-bottom:4px}
#hud .h-hp .n b{font-size:18px;letter-spacing:.04em}
#hud .h-hp .bar{height:6px;background:rgba(16,12,9,.55);border:1px solid rgba(239,230,211,.28);position:relative}
#hud .h-hp .fill{height:100%;background:#efe6d3;transition:width .18s ease-out,background .2s}
#hud .h-hp .seg{position:absolute;top:0;bottom:0;width:1px;background:rgba(16,12,9,.7)}
#hud .h-hp.low .fill{background:#e0654a}
#hud .h-hp.low b{color:#e0654a;animation:hpulse .7s ease-in-out infinite alternate}
@keyframes hpulse{from{opacity:1}to{opacity:.45}}
#hud .h-ammo{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(30px,calc(env(safe-area-inset-bottom) + 30px));text-align:right}
#hud .h-ammo .wn{font-size:10px;letter-spacing:.22em;opacity:.85;margin-bottom:2px}
#hud .h-ammo .mag{font-size:34px;font-weight:800;line-height:1;letter-spacing:.02em}
#hud .h-ammo .mag.low{color:#e0654a}
#hud .h-ammo .mag.empty{color:#e0654a;animation:hpulse .5s ease-in-out infinite alternate}
#hud .h-ammo .res{font-size:15px;font-weight:600;opacity:.75;margin-left:6px}
#hud .h-ammo .nade{margin-top:4px;font-size:10px;letter-spacing:.18em;opacity:.85;display:flex;justify-content:flex-end;gap:5px;align-items:center}
#hud .h-ammo .nade i{display:inline-block;width:7px;height:9px;border-radius:3px 3px 4px 4px;background:#4e5238;border:1px solid rgba(239,230,211,.6)}
#hud .h-ammo .nade i.off{opacity:.25}
#hud .h-round{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.1em;text-transform:none;opacity:.8}
#hud .h-cross{position:absolute;left:50%;top:50%;width:0;height:0}
#hud .h-cross i{position:absolute;background:#efe6d3;box-shadow:0 0 0 1px rgba(0,0,0,.55);transition:opacity .12s}
#hud .h-cross .d{left:-1px;top:-1px;width:2px;height:2px;border-radius:1px}
#hud .h-cross .l,#hud .h-cross .r{top:-1px;width:9px;height:2px}
#hud .h-cross .u,#hud .h-cross .b{left:-1px;width:2px;height:9px}
#hud .h-cross.ads .l,#hud .h-cross.ads .r,#hud .h-cross.ads .u,#hud .h-cross.ads .b{opacity:0}
#hud.dead .h-cross,#hud.dead .h-hit,#hud.dead .h-notice{display:none}
#hud .h-hit{position:absolute;left:50%;top:50%;width:0;height:0;opacity:0}
#hud .h-hit i{position:absolute;left:-1px;top:-11px;width:2px;height:22px;background:#efe6d3;box-shadow:0 0 2px rgba(0,0,0,.7)}
#hud .h-hit i:nth-child(1){transform:rotate(45deg) translateY(-9px)}
#hud .h-hit i:nth-child(2){transform:rotate(135deg) translateY(-9px)}
#hud .h-hit i:nth-child(3){transform:rotate(225deg) translateY(-9px)}
#hud .h-hit i:nth-child(4){transform:rotate(315deg) translateY(-9px)}
#hud .h-hit.headshot i{background:#ffd9a0}
#hud .h-hit.kill i{background:#e0654a;height:26px;top:-13px}
#hud .h-hit.go{animation:hhit .26s ease-out forwards}
#hud .h-hit.kill.go{animation:hkill .42s ease-out forwards}
@keyframes hhit{0%{opacity:1;transform:scale(1.25)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1)}}
@keyframes hkill{0%{opacity:1;transform:scale(1.6)}50%{opacity:1;transform:scale(1.05)}100%{opacity:0;transform:scale(1)}}
#hud .h-notice{position:absolute;left:50%;top:32%;transform:translateX(-50%);text-align:center;opacity:0;font-weight:800;font-size:18px;letter-spacing:.24em}
#hud .h-notice small{display:block;font-size:10px;letter-spacing:.2em;opacity:.8;margin-top:3px;font-weight:600}
#hud .h-notice.go{animation:hnote 1.6s ease-out forwards}
@keyframes hnote{0%{opacity:0;transform:translate(-50%,6px)}10%{opacity:1;transform:translate(-50%,0)}75%{opacity:1}100%{opacity:0}}
#dmg .v{position:absolute;inset:0;opacity:0;transition:opacity .12s;
  background:radial-gradient(ellipse at center,rgba(150,20,10,0) 46%,rgba(150,20,10,.62) 100%)}
#dmg .v.hit{opacity:1;transition:none}
#dmg .v.fade{opacity:0;transition:opacity .55s ease-out}
#dmg .v.low{animation:dlow 1.1s ease-in-out infinite alternate}
@keyframes dlow{from{opacity:.25}to{opacity:.6}}
#dmg .a{position:absolute;left:50%;top:50%;width:0;height:0;opacity:0}
#dmg .a i{position:absolute;left:-42px;top:-118px;width:84px;height:24px;
  background:radial-gradient(ellipse at 50% 100%,rgba(224,101,74,.95) 0%,rgba(224,101,74,.55) 45%,rgba(224,101,74,0) 72%);
  clip-path:polygon(0 100%,50% 0,100% 100%)}
#dmg .a.go{animation:darc 1s ease-out forwards}
@keyframes darc{0%{opacity:1}70%{opacity:.9}100%{opacity:0}}
`;

function ensureStyle() {
  if (document.getElementById('ui-style-hud')) return;
  const s = document.createElement('style'); s.id = 'ui-style-hud'; s.textContent = CSS;
  document.head.appendChild(s);
}
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

export class HUD {
  constructor(container, { round = 'r0', playerName = 'You', playerTeam = 'rangers', compass = true } = {}) {
    ensureStyle();
    this.container = container || document.body;
    this.playerName = playerName; this.playerTeam = playerTeam;
    this.spreadPx = 6; this._adsT = 0; this._heading = 0;
    let hud = this.container.querySelector('#hud');
    if (!hud) { hud = document.createElement('div'); hud.id = 'hud'; this.container.appendChild(hud); }
    let dmg = this.container.querySelector('#dmg');
    if (!dmg) { dmg = document.createElement('div'); dmg.id = 'dmg'; this.container.insertBefore(dmg, hud); }
    this.hud = hud; this.dmg = dmg;
    hud.innerHTML = '';
    dmg.innerHTML = '';

    this.top = h(`<div class="h-top">
      <div class="h-team rangers"><span>Rangers</span><b class="s-r">0</b></div>
      <div class="h-time">7:00</div>
      <div class="h-team militia"><b class="s-m">0</b><span>Militia</span></div></div>`);
    this.target = h(`<div class="h-target">First to 30</div>`);
    this.compass = h(`<div class="h-compass"><div class="strip"></div><div class="c"></div></div>`);
    this.feed = h(`<div class="h-feed"></div>`);
    this.hp = h(`<div class="h-hp"><div class="n"><span class="t-${playerTeam}">${esc(playerName)}</span><b>100</b></div>
      <div class="bar"><div class="fill" style="width:100%"></div><i class="seg" style="left:25%"></i><i class="seg" style="left:50%"></i><i class="seg" style="left:75%"></i></div></div>`);
    this.ammo = h(`<div class="h-ammo"><div class="wn">Assault rifle</div><div><span class="mag">30</span><span class="res">150</span></div>
      <div class="nade"><span>Frag</span><i></i><i></i></div></div>`);
    this.roundTag = h(`<div class="h-round">${esc(round)}</div>`);
    this.cross = h(`<div class="h-cross"><i class="d"></i><i class="l"></i><i class="r"></i><i class="u"></i><i class="b"></i></div>`);
    this.hit = h(`<div class="h-hit"><i></i><i></i><i></i><i></i></div>`);
    this.notice = h(`<div class="h-notice"><span></span><small></small></div>`);
    hud.append(this.top, this.target, this.feed, this.hp, this.ammo, this.roundTag, this.cross, this.hit, this.notice);
    if (compass) hud.append(this.compass);
    this.vig = h(`<div class="v"></div>`);
    this.arc = h(`<div class="a"><i></i></div>`);
    dmg.append(this.vig, this.arc);
    this._buildCompass();
    this.el = {
      sr: this.top.querySelector('.s-r'), sm: this.top.querySelector('.s-m'), time: this.top.querySelector('.h-time'),
      hpN: this.hp.querySelector('b'), hpFill: this.hp.querySelector('.fill'),
      wn: this.ammo.querySelector('.wn'), mag: this.ammo.querySelector('.mag'), res: this.ammo.querySelector('.res'),
      nade: this.ammo.querySelector('.nade'),
    };
    this._targetScore = 30;
    this.crosshair(0.01, false);
  }

  _buildCompass() {
    const strip = this.compass.querySelector('.strip');
    const PX_PER_DEG = 2.2;
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    let html = '';
    for (let d = -360; d <= 720; d += 15) {
      const n = names[((d % 360) + 360) % 360];
      html += n ? `<span class="t" style="left:${d * PX_PER_DEG}px">${n}</span>` : `<span class="t m" style="left:${d * PX_PER_DEG}px"></span>`;
    }
    strip.innerHTML = html;
    this._compassPx = PX_PER_DEG;
  }

  /** heading in radians (yaw about +Y; 0 faces -Z which is north in MAP-PLAN) */
  setHeading(yaw) {
    const deg = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    this._heading = deg;
    this.compass.querySelector('.strip').style.transform = `translateX(${-deg * this._compassPx}px)`;
  }

  setHealth(hp) {
    const v = Math.max(0, Math.min(100, Math.round(hp)));
    this.el.hpN.textContent = v;
    this.el.hpFill.style.width = v + '%';
    const low = v < 30;
    this.hp.classList.toggle('low', low);
    this.vig.classList.toggle('low', low && v > 0);
  }
  setAmmo(mag, reserve) {
    this.el.mag.textContent = mag;
    this.el.res.textContent = reserve;
    this.el.mag.classList.toggle('low', mag > 0 && mag <= 6);
    this.el.mag.classList.toggle('empty', mag === 0);
  }
  setWeapon(key) { this.el.wn.textContent = WEAPON_NAMES[key] || String(key).replace(/_/g, ' '); }
  setGrenades(n) {
    const icons = this.el.nade.querySelectorAll('i');
    if (icons.length !== Math.max(n, 2)) {
      this.el.nade.innerHTML = '<span>Frag</span>' + '<i></i>'.repeat(Math.max(n, 2));
    }
    this.el.nade.querySelectorAll('i').forEach((i, k) => i.classList.toggle('off', k >= n));
  }
  setScore(rangers, militia, target = 30) {
    this.el.sr.textContent = rangers; this.el.sm.textContent = militia;
    if (target !== this._targetScore) { this._targetScore = target; this.target.textContent = `First to ${target}`; }
    this.top.querySelector('.rangers').classList.toggle('lead', rangers > militia);
    this.top.querySelector('.militia').classList.toggle('lead', militia > rangers);
  }
  setTimer(seconds) {
    this.el.time.textContent = fmtTime(seconds);
    this.el.time.classList.toggle('late', seconds <= 30);
  }

  killFeed({ killer, victim, weapon, headshot }) {
    const name = (e) => (e && typeof e === 'object') ? e.name : e;
    const team = (e) => (e && typeof e === 'object') ? e.team : '';
    const me = name(killer) === this.playerName || name(victim) === this.playerName;
    const line = h(`<div class="l${me ? ' me' : ''}"><span class="${esc(team(killer))}">${esc(name(killer))}</span>
      <span class="w">${esc(WEAPON_SHORT[weapon] || weapon || '')}</span>${headshot ? '<span class="hs">HS</span>' : ''}
      <span class="${esc(team(victim))}">${esc(name(victim))}</span></div>`);
    this.feed.appendChild(line);
    while (this.feed.children.length > FEED_LINES) this.feed.firstElementChild.remove();
    setTimeout(() => line.remove(), FEED_MS);
  }

  hitMarker(kind = 'hit') {
    const e = this.hit;
    e.className = 'h-hit';
    void e.offsetWidth;                       // restart the animation
    e.className = `h-hit ${kind} go`;
  }

  /** a short centre notice: 'Eliminated' with a sub line, 'Headshot' etc */
  showNotice(text, sub = '') {
    const n = this.notice;
    n.firstElementChild.textContent = text; n.lastElementChild.textContent = sub;
    n.className = 'h-notice'; void n.offsetWidth; n.className = 'h-notice go';
  }

  /** angle in radians, 0 = the attacker is straight ahead, positive = to the right */
  damageFrom(angle) {
    const a = this.arc;
    a.style.transform = `rotate(${angle}rad)`;
    a.className = 'a'; void a.offsetWidth; a.className = 'a go';
    const v = this.vig;
    v.classList.remove('fade'); v.classList.add('hit');
    clearTimeout(this._vigT);
    this._vigT = setTimeout(() => { v.classList.remove('hit'); v.classList.add('fade'); }, 90);
  }

  /** spread in radians (the weapon's current cone half angle), ads 0..1 or boolean */
  crosshair(spread, ads) {
    const t = typeof ads === 'number' ? ads : (ads ? 1 : 0);
    const px = 5 + Math.max(0, spread) * 1500;
    this.spreadPx += (px - this.spreadPx) * 0.35;
    const s = this.spreadPx.toFixed(1);
    const c = this.cross;
    c.querySelector('.l').style.right = `${s}px`; c.querySelector('.r').style.left = `${s}px`;
    c.querySelector('.u').style.bottom = `${s}px`; c.querySelector('.b').style.top = `${s}px`;
    c.classList.toggle('ads', t > 0.6);
    c.style.opacity = 1 - t * 0.35;
  }

  show(on) { this.hud.classList.toggle('on', !!on); this.dmg.classList.toggle('on', !!on); }

  /** optional per frame hook; nothing here needs it, kept for the main loop's order */
  update(dt) {}
}
