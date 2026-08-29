/**
 * Multi touch controls for DERRICK on a phone.
 *
 * Layout (portrait or landscape, safe area aware):
 *   #stick   the left 45% of the screen; a floating stick appears where the thumb lands
 *   #look    the right 55%; drag to aim, a short tap fires
 *   #bfire #bads #bjump #bcrouch #brel #bswap #bnade   buttons over the lower right of the
 *            look pad. A finger that lands on a button presses it AND still feeds the look
 *            pad while it drags, so a button never eats an aim.
 *
 * Every finger is routed by its identifier from the element it STARTED on, and move / end
 * are read on the container, so it does not matter which element the browser targets a
 * touchmove at (tools/fpstest.mjs dispatches the stick and the look finger in separate
 * events for that reason; this handles either way).
 *
 * Units: move is -1..1 (y forward). look.dx / look.dy are in the same unit as
 * ui/input.js (mouse pixels, turn by RAD_PER_PX per unit), scaled from raw drag pixels so
 * that `radians = rawDragPx / sensitivity`. `sensitivity` is drag px per radian at the
 * current fov and is what game/telemetry.js multiplies by to publish aimDrag. Set
 * `fovScale` (current fov / hip fov) when ADS narrows the view; sensitivity rises with it.
 */
import { RAD_PER_PX } from './input.js?v=r22-202608292104';

const STICK_R = 40;              // px of deflection for a full 1.0 input
const BASE_PX_PER_RAD = 150;     // hip fire: 150 drag px turn one radian
const TAP_PX = 14, TAP_MS = 260;

const CSS = `
#touch{position:fixed;inset:0;z-index:14;display:none;touch-action:none;user-select:none;-webkit-user-select:none;
  font-family:"Helvetica Neue",Helvetica,Arial,"Segoe UI",Roboto,sans-serif;color:#efe6d3}
#touch.on{display:block}
#touch .tpad{position:absolute;touch-action:none}
#stick{left:0;top:26%;width:45%;bottom:0}
#look{right:0;top:0;width:55%;bottom:0}
#stickbase,#sticknub{position:absolute;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .12s}
#stickbase{width:108px;height:108px;margin:-54px 0 0 -54px;border:1.5px solid rgba(239,230,211,.55);
  background:rgba(20,16,12,.18);box-shadow:inset 0 0 0 26px rgba(239,230,211,.05)}
#sticknub{width:46px;height:46px;margin:-23px 0 0 -23px;background:rgba(239,230,211,.78);
  box-shadow:0 0 0 2px rgba(20,16,12,.35)}
#touch .tbtn{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;
  font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(239,230,211,.85);background:rgba(20,16,12,.34);border:1.5px solid rgba(239,230,211,.55);
  box-shadow:0 1px 6px rgba(0,0,0,.35);touch-action:none}
#touch .tbtn.dn{background:rgba(139,69,48,.72);border-color:#ffd9a0;color:#fff}
#bfire{right:max(16px,env(safe-area-inset-right));bottom:calc(24% + env(safe-area-inset-bottom));width:96px;height:96px;font-size:13px}
#bjump{right:max(34px,calc(env(safe-area-inset-right) + 34px));bottom:calc(24% + 110px + env(safe-area-inset-bottom));width:60px;height:60px}
#bads{right:max(126px,calc(env(safe-area-inset-right) + 126px));bottom:calc(17% + env(safe-area-inset-bottom));width:66px;height:66px}
#bcrouch{right:max(131px,calc(env(safe-area-inset-right) + 131px));bottom:calc(17% + 80px + env(safe-area-inset-bottom));width:56px;height:56px}
#bnade{right:max(131px,calc(env(safe-area-inset-right) + 131px));bottom:calc(17% + 150px + env(safe-area-inset-bottom));width:56px;height:56px}
#bswap{right:max(206px,calc(env(safe-area-inset-right) + 206px));bottom:calc(13% + env(safe-area-inset-bottom));width:56px;height:56px}
#brel{right:max(206px,calc(env(safe-area-inset-right) + 206px));bottom:calc(13% + 70px + env(safe-area-inset-bottom));width:56px;height:56px}
@media (orientation:landscape){
  #stick{top:20%}
  #bfire{bottom:calc(20% + env(safe-area-inset-bottom))}
  #bjump{bottom:calc(20% + 106px + env(safe-area-inset-bottom))}
  #bads{bottom:calc(14% + env(safe-area-inset-bottom))}
  #bcrouch{bottom:calc(14% + 74px + env(safe-area-inset-bottom))}
  #bnade{bottom:calc(14% + 140px + env(safe-area-inset-bottom))}
  #bswap{bottom:calc(12% + env(safe-area-inset-bottom))}
  #brel{bottom:calc(12% + 64px + env(safe-area-inset-bottom))}
}
`;

function ensureStyle() {
  if (document.getElementById('ui-style-touch')) return;
  const s = document.createElement('style'); s.id = 'ui-style-touch'; s.textContent = CSS;
  document.head.appendChild(s);
}
function el(tag, id, cls, text) {
  const e = document.createElement(tag);
  if (id) e.id = id; if (cls) e.className = cls; if (text) e.textContent = text;
  return e;
}

export class TouchControls {
  constructor(container, opts = {}) {
    ensureStyle();
    this.container = container || document.body;
    this.move = { x: 0, y: 0 };
    this.look = { dx: 0, dy: 0 };
    this.fire = false; this.ads = false; this.jump = false; this.crouch = false;
    this.reload = false; this.grenade = false; this.sprint = false;
    this._slot = null; this._slotIdx = 1;
    this.fovScale = 1;
    this._pxPerRad = opts.pxPerRad || BASE_PX_PER_RAD;
    this.enabled = opts.enabled ?? (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    this._wanted = true;
    this._fingers = new Map();      // identifier -> { role, x, y, ox, oy, moved, t0, el }
    this._build();
    this._bind();
    this._apply();
    // a touch on a desktop with a touchscreen: switch the pad on the first time it is used
    addEventListener('touchstart', () => { if (!this.enabled) { this.enabled = true; this._apply(); } }, { passive: true, once: true });
  }

  /** drag px per radian at the current fov, for telemetry aimDrag */
  get sensitivity() { return this._pxPerRad / Math.max(0.2, this.fovScale); }
  set sensitivity(v) { this._pxPerRad = v * Math.max(0.2, this.fovScale); }

  /** weapon slot request 1 | 2 | 3 | null, consumed on read (swap button cycles) */
  get slot() { const s = this._slot; this._slot = null; return s; }
  set slot(v) { this._slot = v; }

  show(on) { this._wanted = !!on; this._apply(); }
  _apply() { this.root.classList.toggle('on', this.enabled && this._wanted); }

  _build() {
    let root = this.container.querySelector('#touch');
    if (!root) { root = el('div', 'touch'); this.container.appendChild(root); }
    root.innerHTML = '';
    this.root = root;
    this.stick = el('div', 'stick', 'tpad');
    this.base = el('div', 'stickbase'); this.nub = el('div', 'sticknub');
    this.stick.append(this.base, this.nub);
    this.lookPad = el('div', 'look', 'tpad');
    this.btn = {
      bfire: el('div', 'bfire', 'tbtn', 'Fire'),
      bads: el('div', 'bads', 'tbtn', 'Ads'),
      bjump: el('div', 'bjump', 'tbtn', 'Jump'),
      bcrouch: el('div', 'bcrouch', 'tbtn', 'Crouch'),
      brel: el('div', 'brel', 'tbtn', 'Reload'),
      bswap: el('div', 'bswap', 'tbtn', 'Swap'),
      bnade: el('div', 'bnade', 'tbtn', 'Nade'),
    };
    root.append(this.stick, this.lookPad, ...Object.values(this.btn));
  }

  _bind() {
    const start = (role, element) => (e) => {
      for (const t of e.changedTouches) {
        if (this._fingers.has(t.identifier)) continue;
        const f = { role, x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY, moved: 0, t0: performance.now(), el: element };
        this._fingers.set(t.identifier, f);
        if (role === 'stick') this._stickStart(f);
        else if (role === 'btn') this._press(element, true);
      }
      e.preventDefault();
    };
    this.stick.addEventListener('touchstart', start('stick', this.stick), { passive: false });
    this.lookPad.addEventListener('touchstart', start('look', this.lookPad), { passive: false });
    for (const b of Object.values(this.btn)) b.addEventListener('touchstart', start('btn', b), { passive: false });

    this.root.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const f = this._fingers.get(t.identifier);
        if (!f) continue;
        const dx = t.clientX - f.x, dy = t.clientY - f.y;
        f.x = t.clientX; f.y = t.clientY; f.moved += Math.abs(dx) + Math.abs(dy);
        if (f.role === 'stick') this._stickMove(f);
        else this._lookMove(dx, dy);          // look pad and buttons both aim while dragging
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      for (const t of e.changedTouches) {
        const f = this._fingers.get(t.identifier);
        if (!f) continue;
        this._fingers.delete(t.identifier);
        if (f.role === 'stick') this._stickEnd();
        else if (f.role === 'btn') this._press(f.el, false);
        else if (f.role === 'look' && f.moved < TAP_PX && performance.now() - f.t0 < TAP_MS) this._tapFire();
      }
      if (e.cancelable) e.preventDefault();
    };
    this.root.addEventListener('touchend', end, { passive: false });
    this.root.addEventListener('touchcancel', end, { passive: false });
  }

  _stickStart(f) {
    const r = this.stick.getBoundingClientRect();
    const x = f.ox - r.left, y = f.oy - r.top;
    this.base.style.left = this.nub.style.left = x + 'px';
    this.base.style.top = this.nub.style.top = y + 'px';
    this.base.style.opacity = '1'; this.nub.style.opacity = '1';
    this._stickT0 = performance.now();
  }
  _stickMove(f) {
    let dx = f.x - f.ox, dy = f.y - f.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx = dx / d * STICK_R; dy = dy / d * STICK_R; }
    this.move.x = dx / STICK_R; this.move.y = -dy / STICK_R;
    this._updateSprint();
    const r = this.stick.getBoundingClientRect();
    this.nub.style.left = (f.ox - r.left + dx) + 'px';
    this.nub.style.top = (f.oy - r.top + dy) + 'px';
  }
  /** auto sprint: a full forward push held for a third of a second, the way phone shooters do it.
   *  Re-evaluated every consume() too, because a finger held still sends no touchmove. */
  _updateSprint() {
    const full = Math.hypot(this.move.x, this.move.y) > 0.9 && this.move.y > 0.5;
    if (!full) this._fullSince = 0;
    else if (!this._fullSince) this._fullSince = performance.now();
    this.sprint = !!this._fullSince && performance.now() - this._fullSince > 330;
  }
  _stickEnd() {
    this.move.x = 0; this.move.y = 0; this.sprint = false; this._fullSince = 0;
    this.base.style.opacity = '0'; this.nub.style.opacity = '0';
  }
  _lookMove(dx, dy) {
    const k = 1 / (this.sensitivity * RAD_PER_PX);
    this.look.dx += dx * k; this.look.dy += dy * k;
  }
  _tapFire() {
    this.fire = true;
    clearTimeout(this._tapT);
    this._tapT = setTimeout(() => { if (!this._fingers.size || ![...this._fingers.values()].some((f) => f.el === this.btn.bfire)) this.fire = false; }, 110);
  }
  _press(b, down) {
    switch (b.id) {
      case 'bfire': this.fire = down; b.classList.toggle('dn', down); break;
      case 'bads': if (down) { this.ads = !this.ads; b.classList.toggle('dn', this.ads); } break;
      case 'bjump': if (down) this.jump = true; b.classList.toggle('dn', down); break;
      case 'bcrouch': if (down) { this.crouch = !this.crouch; b.classList.toggle('dn', this.crouch); } break;
      case 'brel': if (down) this.reload = true; b.classList.toggle('dn', down); break;
      case 'bnade': if (down) this.grenade = true; b.classList.toggle('dn', down); break;
      case 'bswap': if (down) { this._slotIdx = this._slotIdx % 3 + 1; this._slot = this._slotIdx; } b.classList.toggle('dn', down); break;
    }
  }

  /** tell the pad which slot the player is holding so the swap button cycles from it */
  setSlot(n) { if (n >= 1 && n <= 3) this._slotIdx = n; }

  /** resets per frame deltas and one shot flags */
  consume() {
    this._updateSprint();
    this.look.dx = 0; this.look.dy = 0;
    this.jump = false; this.reload = false; this.grenade = false;
  }
}
