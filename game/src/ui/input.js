/**
 * Keyboard and mouse input for DERRICK, per tools/CONTRACT.md.
 *
 *   WASD / arrows   walk (arrows also turn: ArrowLeft yaws left, ArrowRight yaws right)
 *   ShiftLeft       sprint (hold)        KeyC    crouch (hold)
 *   Space           jump (one shot)      KeyR    reload (one shot)
 *   KeyG            grenade (one shot)   Digit1..3  weapon slot (consumed on read)
 *   mouse left      fire (hold)          mouse right  ADS (hold)
 *   wheel           slot cycle request (wheel: -1 | 0 | 1, consumed on read)
 *
 * look.dx / look.dy are ACCUMULATED MOUSE PIXELS since the last consume(), plus the
 * arrow key turn converted to the same unit. The player turns the view by
 * `yaw -= look.dx * RAD_PER_PX` (RAD_PER_PX is exported so the touch layer and the
 * telemetry use the same constant). Positive dx is mouse right, positive dy is mouse down.
 *
 * Pointer lock is requested on the first mousedown on the element; that click never
 * fires. If the lock does not arrive (headless, denied) the next clicks fire anyway and
 * mousemove is read while a button is held, so the game stays playable. Synthetic
 * mousemove events carrying movementX (what tools/fpstest.mjs dispatches when pointer
 * lock is unavailable headless) are read as if locked: same listener, same code path.
 */
export const RAD_PER_PX = 0.0022;          // radians of yaw per mouse pixel (hip fire)
const ARROW_TURN_RAD_S = 2.1;              // arrow key yaw rate, radians per second

export class Input {
  constructor(domElement) {
    this.el = domElement || document.body;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this._look = { dx: 0, dy: 0 };
    this._dx = 0; this._dy = 0;
    this.fire = false; this.ads = false; this.sprint = false; this.crouch = false;
    this.reload = false; this.jump = false; this.grenade = false;
    this._slot = null; this._wheel = 0;
    this.locked = false;
    this.active = true;                    // the game may set this false on menus
    this.radPerPx = RAD_PER_PX;
    this._lastConsume = performance.now();
    this._lockRequestedAt = 0;
    this._lockFailed = false;
    this._buttons = 0;
    this._bindKeys();
    this._bindMouse();
  }

  /** accumulated look delta in mouse pixels (getter so the arrow turn is exact per frame) */
  get look() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this._lastConsume) / 1000);
    const turn = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    this._look.dx = this._dx + turn * ARROW_TURN_RAD_S * dt / this.radPerPx;
    this._look.dy = this._dy;
    return this._look;
  }

  /** weapon slot request 1 | 2 | 3 | null, consumed on read */
  get slot() { const s = this._slot; this._slot = null; return s; }
  set slot(v) { this._slot = v; }
  /** wheel cycle request -1 | 0 | 1, consumed on read */
  get wheel() { const w = this._wheel; this._wheel = 0; return w; }

  _recomputeMove() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyA')) x -= 1;
    if (k.has('KeyD')) x += 1;
    const m = Math.hypot(x, y) || 1;
    this.move.x = x / m; this.move.y = y / m;
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    this.crouch = k.has('KeyC') || k.has('ControlLeft');
  }

  _bindKeys() {
    const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
    addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.reload = true;
      if (e.code === 'Space') this.jump = true;
      if (e.code === 'KeyG') this.grenade = true;
      if (e.code === 'Digit1' || e.code === 'Numpad1') this._slot = 1;
      if (e.code === 'Digit2' || e.code === 'Numpad2') this._slot = 2;
      if (e.code === 'Digit3' || e.code === 'Numpad3') this._slot = 3;
      this._recomputeMove();
    }, { passive: false });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this._recomputeMove(); });
    addEventListener('blur', () => { this.keys.clear(); this._recomputeMove(); this.fire = false; this.ads = false; });
  }

  _bindMouse() {
    const el = this.el;
    el.addEventListener('mousedown', (e) => {
      this._buttons |= (1 << e.button);
      if (!this.locked && !this._lockFailed && !this._isTouchDevice()) {
        this.requestPointerLock();
        return;                            // the locking click never fires
      }
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.ads = true;
      e.preventDefault();
    });
    addEventListener('mouseup', (e) => {
      this._buttons &= ~(1 << e.button);
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.ads = false;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      // locked: the real thing. Unlocked: a synthetic event with movementX (the
      // harness fallback), or a drag with a button held (lock denied).
      const synthetic = !e.isTrusted && (e.movementX || e.movementY);
      if (!(this.locked || synthetic || (this._buttons && this._lockFailed))) return;
      this._dx += e.movementX || 0;
      this._dy += e.movementY || 0;
    });
    addEventListener('wheel', (e) => { if (this.locked) this._wheel = e.deltaY > 0 ? 1 : -1; }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      if (this.locked) this._lockFailed = false;
      else { this.fire = false; this.ads = false; }
    });
    document.addEventListener('pointerlockerror', () => { this._lockFailed = true; });
  }

  _isTouchDevice() {
    return (('ontouchstart' in window) || navigator.maxTouchPoints > 0) &&
           !window.matchMedia('(pointer:fine)').matches;
  }

  requestPointerLock() {
    if (this.locked) return;
    this._lockRequestedAt = performance.now();
    try {
      const p = this.el.requestPointerLock?.({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.el.requestPointerLock(); } catch (_) { this._lockFailed = true; } });
    } catch (_) {
      try { this.el.requestPointerLock(); } catch (__) { this._lockFailed = true; }
    }
    // no lock 400 ms after asking: treat it as unavailable so clicks fire and drags look
    setTimeout(() => { if (!this.locked) this._lockFailed = true; }, 400);
  }

  exitPointerLock() { if (this.locked) document.exitPointerLock?.(); }

  /** resets per frame deltas and one shot flags; call once per frame after reading */
  consume() {
    this._dx = 0; this._dy = 0;
    this.jump = false; this.reload = false; this.grenade = false;
    this._lastConsume = performance.now();
  }
}
