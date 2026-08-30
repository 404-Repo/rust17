/**
 * Loading, start, death and round end screens for RUST 17 (was DERRICK), per tools/CONTRACT.md.
 *
 *   #load    the loading overlay: shown from construction, `display:none` and
 *            `pointer-events:none` after ready()
 *   #start   the start screen, class 'on' while shown, with #startb (DEPLOY)
 *   #over    ONE overlay used for both the death screen and the round end screen, with
 *            ONE #overb, so document.getElementById('overb') is never a hidden duplicate
 *
 * #startb and #overb answer a real click and a real tap (touchend, with the synthetic
 * click suppressed). On death the pointer stays locked, the way CoD keeps you in the
 * game; a mousedown anywhere while the death screen is up counts as REDEPLOY, because
 * under pointer lock a click on the button is delivered to the locked canvas. On round
 * end the lock is released so the scoreboard can be read and the button clicked.
 *
 * Plain hyphens only in every string here: Ben reads these screens and reuses the text.
 */
// round 20 (Ben: "make it more 404", then "use licensed faces"): the 404 deck system in the brand faces (game/fonts, woff2 subsets). Pilat Extended Black
// -> Archivo Black (the wide divider word), Helvetica Now Display XBold -> Inter Tight 800 (content), fourzerofourpixel
// -> Silkscreen (labels, numbers, the footer lockup). Coral #ED5851. Swap the three families here to use the real ones.
const FONT = `"Helvetica Now Display","Inter Tight","Helvetica Neue",Helvetica,Arial,sans-serif`;
const WIDE = `"Pilat Extended","Archivo Black","Arial Black",Impact,sans-serif`;
const PIX = `fourzerofourpixel,Silkscreen,"Courier New",monospace`;
const CORAL = '#ED5851';
const CSS = `
#load,#start,#over{position:fixed;inset:0;z-index:20;font-family:${FONT};color:#f2ece2;font-weight:800;
  font-variant-numeric:tabular-nums;-webkit-user-select:none;user-select:none}
.ttl{font-family:${WIDE};font-weight:900;font-size:clamp(46px,11vw,132px);line-height:.88;letter-spacing:-.045em;color:#f2ece2;text-transform:uppercase}
.ttl i{font-style:normal;color:${CORAL}}
.pix{font-family:${PIX};font-weight:400;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.rule{height:4px;background:${CORAL};width:min(340px,42vw);margin:14px 0 12px}
#load{background:#100c0a;display:flex;flex-direction:column;justify-content:flex-end;padding:0 max(24px,6vw) max(28px,env(safe-area-inset-bottom));z-index:30}
#load .sub{font-size:13px;letter-spacing:.02em;opacity:.8;margin-top:4px}
#load .bar{width:min(520px,72vw);height:6px;background:rgba(242,236,226,.12);margin-top:22px}
#load .fill{height:100%;width:0;background:${CORAL};transition:width .15s linear}
#load .lbl{margin-top:10px;min-height:1.4em;opacity:.8}
#load .credit{position:absolute;right:max(24px,6vw);bottom:max(28px,env(safe-area-inset-bottom));text-align:right;opacity:.55;line-height:1.7}
#start{display:none;background:linear-gradient(90deg,rgba(16,12,10,.86) 0%,rgba(16,12,10,.72) 46%,rgba(16,12,10,.15) 100%)}
#start.on{display:block}
#start .col{position:absolute;left:max(24px,6vw);top:max(22px,env(safe-area-inset-top));bottom:max(56px,env(safe-area-inset-bottom));width:min(560px,86vw);display:flex;flex-direction:column;justify-content:flex-end}
#start .mode{font-size:clamp(18px,3vw,26px);letter-spacing:-.01em;margin-top:6px}
#start .teams{font-size:14px;margin:6px 0 2px;font-weight:600}
#start .teams b{color:#9fc9de}#start .teams i{color:${CORAL};font-style:normal;font-weight:800}
#start .rules{opacity:.8;margin-top:6px}
#start .keys{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;margin:16px 0 20px;max-width:440px;line-height:1.45;opacity:.85}
#start .keys span:nth-child(odd){color:${CORAL}}
#startb,#overb{display:block;pointer-events:auto;cursor:pointer;width:min(440px,100%);padding:16px 22px;
  background:${CORAL};color:#100c0a;border:0;border-radius:0;font-family:${WIDE};font-weight:900;
  font-size:22px;letter-spacing:-.02em;text-transform:uppercase;touch-action:manipulation;text-align:left;
  box-shadow:6px 6px 0 #100c0a}
#startb:active,#overb:active{transform:translate(3px,3px);box-shadow:3px 3px 0 #100c0a}
#startb:hover,#overb:hover{background:#ff6f67}
#start .foot{position:absolute;left:max(24px,6vw);right:max(24px,6vw);bottom:max(18px,env(safe-area-inset-bottom));display:flex;justify-content:space-between;opacity:.7}
#over{display:none;background:rgba(16,12,10,.5)}
#over.on{display:block}
#over.death{background:linear-gradient(90deg,rgba(60,10,6,.78) 0%,rgba(16,10,8,.6) 100%)}
#over.end{background:rgba(16,12,10,.9)}
#over .pan{position:absolute;left:max(24px,6vw);top:50%;transform:translateY(-50%);width:min(560px,86vw);text-align:left;
  max-height:92vh;overflow:auto}
#over .big{font-family:${WIDE};font-weight:900;font-size:clamp(40px,9vw,96px);letter-spacing:-.04em;line-height:.9;text-transform:uppercase}
#over .big.win{color:#f2ece2}#over .big.lose{color:${CORAL}}
#over .by{font-size:15px;margin:12px 0 4px;font-weight:600}
#over .by b{font-weight:800;color:${CORAL}}
#over .wep{font-family:${PIX};font-size:11px;letter-spacing:.06em;opacity:.7;text-transform:uppercase}
#over .cnt{font-family:${PIX};font-size:11px;letter-spacing:.06em;margin:22px 0 14px;opacity:.9;text-transform:uppercase}
#over .cnt b{font-size:28px;color:${CORAL};margin-left:6px}
#over .score{display:flex;align-items:baseline;gap:18px;margin:12px 0 6px;font-family:${PIX};font-size:12px;text-transform:uppercase}
#over .score b{font-family:${WIDE};font-weight:900;font-size:44px;letter-spacing:-.03em}
#over .score .r{color:#9fc9de}#over .score .m{color:${CORAL}}
#over .stats{display:flex;gap:26px;margin:10px 0 16px;font-family:${PIX};font-size:10px;text-transform:uppercase;opacity:.85}
#over .stats b{display:block;font-family:${FONT};font-size:20px;margin-top:2px}
#over table{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 20px;font-weight:600}
#over th{font-family:${PIX};font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;font-weight:400;padding:4px 6px;border-bottom:2px solid ${CORAL}}
#over td{padding:5px 6px;border-bottom:1px solid rgba(242,236,226,.1)}
#over td:first-child,#over th:first-child{text-align:left}
#over td:not(:first-child),#over th:not(:first-child){text-align:right}
#over tr.rangers td:first-child{color:#9fc9de}#over tr.militia td:first-child{color:${CORAL}}
#over tr.me td{background:rgba(237,88,81,.16)}
`;

function ensureStyle() {
  if (document.getElementById('ui-style-screens')) return;
  const s = document.createElement('style'); s.id = 'ui-style-screens'; s.textContent = CSS;
  document.head.appendChild(s);
}
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
const WEAPON_NAMES = { ar: 'assault rifle', smg: 'SMG', dmr: 'marksman rifle', frag: 'frag grenade', assault_rifle: 'assault rifle', marksman_rifle: 'marksman rifle', frag_grenade: 'frag grenade' };
const isTouch = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !window.matchMedia('(pointer:fine)').matches;

/** click or tap, once per gesture, with the tap's synthetic click suppressed */
function pressable(btn, fn) {
  let tapped = -1e9;
  btn.addEventListener('touchend', (e) => { e.preventDefault(); tapped = performance.now(); fn(e); }, { passive: false });
  btn.addEventListener('click', (e) => { if (performance.now() - tapped < 700) return; fn(e); });
}

export class Screens {
  constructor(container, { round = 'r6' } = {}) {
    ensureStyle();
    this.container = container || document.body;
    this.round = round;
    this._startFns = []; this._restartFns = [];
    const get = (id, html) => {
      let e = this.container.querySelector('#' + id);
      if (!e) { e = h(html); this.container.appendChild(e); } else { e.innerHTML = h(html).innerHTML; }
      return e;
    };
    this.load = get('load', `<div id="load"><div class="ttl">Rust <i>17</i></div><div class="sub">Oil lease. Late afternoon. Two teams.</div>
      <div class="bar"><div class="fill"></div></div><div class="lbl pix">Loading</div>
      <div class="credit pix">404—GEN<br>Subnet 17<br>github.com/404-Repo/404-game-recipe</div></div>`);
    const keys = isTouch()
      ? '<span class="pix">Move</span><span>Left thumb</span><span class="pix">Aim</span><span>Right thumb</span><span class="pix">Fire</span><span>Tap or hold</span><span class="pix">Sprint</span><span>Push the stick fully</span>'
      : '<span class="pix">Move</span><span>W A S D</span><span class="pix">Aim</span><span>Mouse, right click for sights</span><span class="pix">Fire</span><span>Left click</span><span class="pix">Sprint</span><span>Shift</span><span class="pix">Crouch, jump</span><span>C, Space</span><span class="pix">Reload, grenade</span><span>R, G</span><span class="pix">Weapons</span><span>1, 2, 3</span>';
    this.start = get('start', `<div id="start"><div class="col"><div class="ttl">Rust <i>17</i></div><div class="rule"></div>
      <div class="mode">Team deathmatch</div><div class="teams"><b>Rangers</b> vs <i>Militia</i></div>
      <div class="rules pix">First to 30. Seven minutes.</div><div class="keys">${keys}</div>
      <button id="startb" type="button">Deploy</button></div>
      <div class="foot pix"><span>404—GEN</span><span>Build ${esc(round)}</span><span>Subnet 17</span></div></div>`);
    this.over = get('over', `<div id="over"><div class="pan"></div></div>`);
    this.pan = this.over.querySelector('.pan');
    this.startb = this.start.querySelector('#startb');
    pressable(this.startb, () => this._start());
    // any press while the death screen is up is a redeploy (pointer lock routes the
    // click on the button to the canvas, so the button alone would be unreachable)
    document.addEventListener('mousedown', (e) => {
      if (this.over.classList.contains('on') && this.over.classList.contains('death') && document.pointerLockElement) this._restart(e);
    });
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.over.classList.contains('on') && this.over.classList.contains('death')) this._restart(e);
    });
    this._mode = null;
  }

  loading(progress01, label) {
    this.load.querySelector('.fill').style.width = (Math.max(0, Math.min(1, progress01)) * 100).toFixed(1) + '%';
    if (label != null) this.load.querySelector('.lbl').textContent = label;
  }

  ready() {
    this.loading(1, 'Ready');
    this.load.style.pointerEvents = 'none';
    this.load.style.display = 'none';
    this.start.classList.add('on');
  }

  onStart(fn) { this._startFns.push(fn); }
  onRestart(fn) { this._restartFns.push(fn); }

  _start() {
    if (!this.start.classList.contains('on')) return;
    this.start.classList.remove('on');
    for (const f of this._startFns) { try { f(); } catch (e) { console.error(e); } }
  }
  _restart(e) {
    if (!this.over.classList.contains('on')) return;
    const kind = this._mode;
    clearInterval(this._cntT);
    this.over.classList.remove('on', 'death', 'end');
    document.getElementById('hud')?.classList.remove('dead');
    this._mode = null;
    for (const f of this._restartFns) { try { f({ kind, event: e }); } catch (err) { console.error(err); } }
  }

  death({ killer, weapon, respawnIn = 4 } = {}) {
    const name = killer && typeof killer === 'object' ? killer.name : killer;
    this._mode = 'death';
    this.pan.innerHTML = `<div class="big lose">Killed</div>
      <div class="by">${name ? `by <b>${esc(name)}</b>` : ''}</div>
      <div class="wep">${weapon ? esc(WEAPON_NAMES[weapon] || String(weapon).replace(/_/g, ' ')) : ''}</div>
      <div class="cnt">Redeploy in <b>${Math.ceil(respawnIn)}</b></div>
      <button id="overb" type="button">Redeploy</button>`;
    this._wireOverb();
    this.over.className = 'on death';
    document.getElementById('hud')?.classList.add('dead');
    const t0 = performance.now();
    clearInterval(this._cntT);
    this._cntT = setInterval(() => {
      const left = respawnIn - (performance.now() - t0) / 1000;
      const b = this.pan.querySelector('.cnt b');
      if (!b) return clearInterval(this._cntT);
      b.textContent = Math.max(0, Math.ceil(left));
      if (left <= 0) clearInterval(this._cntT);
    }, 100);
  }

  roundEnd({ winner, rangers = 0, militia = 0, kills = 0, deaths = 0, accuracy = 0, scoreboard = [], team = 'rangers' } = {}) {
    this._mode = 'end';
    const won = winner === team, draw = winner === 'draw' || !winner;
    const title = draw ? 'Draw' : won ? 'Victory' : 'Defeat';
    const rows = [...scoreboard].sort((a, b) => (b.kills || 0) - (a.kills || 0) || (a.deaths || 0) - (b.deaths || 0));
    const kd = deaths ? (kills / deaths).toFixed(2) : String(kills.toFixed ? kills.toFixed(2) : kills);
    this.pan.innerHTML = `<div class="big ${draw ? '' : won ? 'win' : 'lose'}">${title}</div>
      <div class="score"><span class="r">Rangers</span><b class="r">${rangers}</b><span>:</span><b class="m">${militia}</b><span class="m">Militia</span></div>
      <div class="stats"><div>Kills<b>${kills}</b></div><div>Deaths<b>${deaths}</b></div><div>K/D<b>${kd}</b></div><div>Accuracy<b>${Math.round(accuracy * (accuracy <= 1 ? 100 : 1))}%</b></div></div>
      <table><thead><tr><th>Name</th><th>Team</th><th>Kills</th><th>Deaths</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="${esc(r.team)}${r.me ? ' me' : ''}"><td>${esc(r.name)}</td><td>${esc(r.team)}</td><td>${r.kills ?? 0}</td><td>${r.deaths ?? 0}</td></tr>`).join('')}
      </tbody></table>
      <button id="overb" type="button">Play again</button>`;
    this._wireOverb();
    this.over.className = 'on end';
    document.getElementById('hud')?.classList.add('dead');
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  _wireOverb() {
    this.overb = this.pan.querySelector('#overb');
    pressable(this.overb, (e) => this._restart(e));
  }

  hideAll() {
    clearInterval(this._cntT);
    this.load.style.display = 'none'; this.load.style.pointerEvents = 'none';
    this.start.classList.remove('on');
    this.over.classList.remove('on', 'death', 'end');
    document.getElementById('hud')?.classList.remove('dead');
    this._mode = null;
  }
}
