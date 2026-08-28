/**
 * Loading, start, death and round end screens for DERRICK, per tools/CONTRACT.md.
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
const FONT = `"Helvetica Neue",Helvetica,Arial,"Segoe UI",Roboto,sans-serif`;
const CSS = `
#load,#start,#over{position:fixed;inset:0;z-index:20;font-family:${FONT};color:#efe6d3;text-transform:uppercase;
  letter-spacing:.1em;font-variant-numeric:tabular-nums;-webkit-user-select:none;user-select:none}
#load{background:#17130f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:30}
#load .ttl,#start .ttl{font-size:clamp(34px,7vw,64px);font-weight:800;letter-spacing:.3em;line-height:1;padding-left:.3em}
#load .sub,#start .sub{font-size:11px;letter-spacing:.32em;opacity:.7}
#load .bar{width:min(320px,70vw);height:3px;background:rgba(239,230,211,.14);margin-top:14px}
#load .fill{height:100%;width:0;background:#ffd9a0;transition:width .15s linear}
#load .lbl{font-size:10px;letter-spacing:.24em;opacity:.65;min-height:1.2em}
#start{display:none;background:radial-gradient(ellipse at 50% 60%,rgba(23,19,15,.28) 0%,rgba(23,19,15,.74) 100%)}
#start.on{display:block}
#start .hd{position:absolute;left:max(28px,env(safe-area-inset-left));top:max(26px,env(safe-area-inset-top))}
#start .rule{width:56px;height:3px;background:#8b4530;margin:10px 0 8px}
#start .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(360px,86vw);
  background:rgba(23,19,15,.78);border:1px solid rgba(239,230,211,.16);padding:26px 26px 22px;text-align:center;
  box-shadow:0 8px 40px rgba(0,0,0,.45)}
#start .mode{font-size:20px;font-weight:800;letter-spacing:.22em}
#start .teams{font-size:11px;letter-spacing:.2em;margin:8px 0 2px}
#start .teams b{color:#9fc9de;font-weight:700}#start .teams i{color:#e0654a;font-style:normal;font-weight:700}
#start .rules{font-size:10px;letter-spacing:.18em;opacity:.7}
#start .keys{font-size:9.5px;letter-spacing:.14em;opacity:.62;margin:16px 0 18px;line-height:1.7;text-transform:none}
#startb,#overb{display:inline-block;pointer-events:auto;cursor:pointer;min-width:200px;padding:14px 26px;
  background:#8b4530;color:#fff;border:1px solid #b06a4c;border-radius:2px;font-family:${FONT};
  font-size:14px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;touch-action:manipulation;
  box-shadow:0 3px 0 #5d2c1d,0 6px 18px rgba(0,0,0,.4)}
#startb:active,#overb:active{transform:translateY(2px);box-shadow:0 1px 0 #5d2c1d}
#startb:hover,#overb:hover{background:#9c4e36}
#start .foot{position:absolute;left:0;right:0;bottom:max(16px,env(safe-area-inset-bottom));text-align:center;font-size:9px;letter-spacing:.24em;opacity:.5}
#over{display:none;background:rgba(23,19,15,.5)}
#over.on{display:block}
#over.death{background:radial-gradient(ellipse at center,rgba(60,10,6,.35) 0%,rgba(23,10,8,.82) 100%)}
#over.end{background:rgba(23,19,15,.86)}
#over .pan{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,90vw);text-align:center;
  max-height:92vh;overflow:auto;padding:8px}
#over .big{font-size:clamp(28px,6vw,44px);font-weight:800;letter-spacing:.26em;line-height:1.1;padding-left:.26em}
#over .big.win{color:#ffd9a0}#over .big.lose{color:#e0654a}
#over .by{font-size:12px;letter-spacing:.2em;margin:10px 0 4px;opacity:.9}
#over .by b{font-weight:800}
#over .wep{font-size:10px;letter-spacing:.24em;opacity:.62}
#over .cnt{font-size:11px;letter-spacing:.24em;margin:22px 0 14px;opacity:.85}
#over .cnt b{font-size:22px;letter-spacing:.05em;color:#ffd9a0}
#over .score{display:flex;justify-content:center;align-items:center;gap:16px;margin:14px 0 6px;font-size:12px;letter-spacing:.2em}
#over .score b{font-size:30px;font-weight:800;letter-spacing:.02em}
#over .score .r{color:#9fc9de}#over .score .m{color:#e0654a}
#over .stats{display:flex;justify-content:center;gap:22px;margin:8px 0 14px;font-size:9.5px;letter-spacing:.2em;opacity:.8}
#over .stats b{display:block;font-size:16px;letter-spacing:.02em;margin-top:2px;opacity:1}
#over table{width:100%;border-collapse:collapse;font-size:11px;letter-spacing:.08em;margin:0 0 18px;text-transform:none}
#over th{font-size:9px;letter-spacing:.22em;text-transform:uppercase;opacity:.55;font-weight:600;padding:4px 6px;border-bottom:1px solid rgba(239,230,211,.18)}
#over td{padding:5px 6px;border-bottom:1px solid rgba(239,230,211,.07)}
#over td:first-child,#over th:first-child{text-align:left}
#over td:not(:first-child),#over th:not(:first-child){text-align:right}
#over tr.rangers td:first-child{color:#9fc9de}#over tr.militia td:first-child{color:#e0654a}
#over tr.me td{background:rgba(139,69,48,.28);font-weight:700}
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
  constructor(container, { round = 'r0' } = {}) {
    ensureStyle();
    this.container = container || document.body;
    this.round = round;
    this._startFns = []; this._restartFns = [];
    const get = (id, html) => {
      let e = this.container.querySelector('#' + id);
      if (!e) { e = h(html); this.container.appendChild(e); } else { e.innerHTML = h(html).innerHTML; }
      return e;
    };
    this.load = get('load', `<div id="load"><div class="ttl">Derrick</div><div class="sub">Oil lease, 16:30</div>
      <div class="bar"><div class="fill"></div></div><div class="lbl">Loading</div></div>`);
    const keys = isTouch()
      ? 'Left thumb moves, right thumb aims, tap or hold Fire.<br>Push the stick fully to sprint.'
      : 'WASD move, mouse aim, left click fire, right click aim down sights.<br>Shift sprint, C crouch, Space jump, R reload, G grenade, 1 2 3 weapons.';
    this.start = get('start', `<div id="start"><div class="hd"><div class="ttl">Derrick</div><div class="rule"></div><div class="sub">Desert oil lease</div></div>
      <div class="card"><div class="mode">Team deathmatch</div><div class="teams"><b>Rangers</b> vs <i>Militia</i></div>
      <div class="rules">First to 30, seven minutes</div><div class="keys">${keys}</div>
      <button id="startb" type="button">Deploy</button></div>
      <div class="foot">Build ${esc(round)}</div></div>`);
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
