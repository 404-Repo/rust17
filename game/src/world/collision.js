/**
 * DERRICK collision world: the terrain heightfield plus oriented boxes, cylinders, walkable
 * platforms (roofs, decks, rings, bridges), stair ramps and ladders, with a capsule mover,
 * a raycaster and a line of sight test. Static geometry only; bots and the player are not
 * in here.
 *
 * Model
 *  - terrain: always the floor, sampled through terrain.heightAt (exact against the mesh).
 *    Slopes steeper than MAX_SLOPE cannot be walked up (the wadi banks at 46 degrees, the
 *    trench walls, the causeway shoulders); they can always be jumped or fallen down.
 *  - boxes and cylinders: solid. A capsule cannot enter them; it can stand on a top that is
 *    no more than STEP above its feet (drums, kerbs, sandbags when jumped onto).
 *  - walkables: one sided floors at a fixed y (a deck is grating, a roof is a slab). They
 *    support a capsule whose feet are at or above them minus STEP. Nothing stops a player
 *    walking off the edge; MAP-PLAN says every roof drop is a legal jump.
 *  - stair links: a sloped floor along from -> to, `width` wide. Treads are visual.
 *  - ladder links: a climb column at `from`; holding toward the ladder climbs, holding away
 *    descends, sideways leaves it. At the top the capsule is walked onto `to`.
 *
 * Solids that a walkable cuts through are clipped, because the level builder registers a box
 * per placement from assetSize() and a lattice tower's box would otherwise fill its own deck:
 * a box straddling a walkable keeps the part below the floor and, if tall enough, the part
 * more than 2 m above it; a large footprint (over 2.5 m^2) resting on a walkable becomes an
 * overhead solid 2 m up, so a player walks between the legs of the module standing on the
 * deck. Small props resting on a roof (sandbags, crates, tyres) keep blocking. Boxes whose
 * centre sits on a stair ramp near its own foot are dropped (that is the stair asset itself)
 * with a console.warn naming the tag, so an integrator can see it happened.
 */
import * as THREE from 'three';

const STEP = 0.4;                          // auto step, metres
const MAX_SLOPE = 40 * Math.PI / 180;      // terrain steeper than this is a wall going up
const CELL = 4;                            // spatial hash cell, metres
const OVERHEAD = 2.0;                      // clearance carved above a walkable through a solid
const LADDER_R = 0.75;                     // climb column radius
const LADDER_SPEED = 0.5;                  // vertical metres per horizontal metre of input (about 2 m/s at walk)

const _v = new THREE.Vector3();
const _q = {};

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a) / 2;
}

export class World {
  constructor(terrain) {
    this.terrain = terrain;
    this.items = [];                 // every collider, any kind
    this.ladders = [];
    this.navLinks = [];              // slope and tunnel links, nav only
    this.grid = new Map();
    this._id = 0;
    const b = terrain.bounds;
    // the invisible wall at the map extent, 4 m high on every edge, above the highest ground
    const top = (terrain.grid ? terrain.grid.hMax : 3) + 4.5;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ, cy = top / 2 - 4;
    this.addBox(new THREE.Vector3(b.minX - 0.5, cy, cz), new THREE.Vector3(1, top + 8, d + 2), 0, 'boundary');
    this.addBox(new THREE.Vector3(b.maxX + 0.5, cy, cz), new THREE.Vector3(1, top + 8, d + 2), 0, 'boundary');
    this.addBox(new THREE.Vector3(cx, cy, b.minZ - 0.5), new THREE.Vector3(w + 2, top + 8, 1), 0, 'boundary');
    this.addBox(new THREE.Vector3(cx, cy, b.maxZ + 0.5), new THREE.Vector3(w + 2, top + 8, 1), 0, 'boundary');
    this._addCulvert();
  }

  /**
   * The terrain cuts a slot through the causeway for the culvert tunnel, so the World owns
   * the tunnel's walls and its roof (the road surface over the slot). The culvert asset is
   * visual; a solid box registered for it would fill the tunnel, so one whose centre lies in
   * the slot at bed level is dropped with a warning.
   */
  _addCulvert() {
    const spec = this.terrain.spec;
    const C = spec && spec.road && spec.road.culvert;
    if (!C) return;
    const T = this.terrain;
    const bed = T.heightAt(C.x, C.z);
    const roadY = Math.max(T.heightAt(C.x - C.halfW - 1.2, C.z), T.heightAt(C.x + C.halfW + 1.2, C.z));
    const depth = spec.wadi ? spec.wadi.depth : 2.6;
    if (roadY - bed < depth * 0.8) { console.warn('[world] culvert slot not found in the terrain; no tunnel colliders added'); return; }
    this.culvert = { x: C.x, z: C.z, halfW: C.halfW, halfLen: C.halfLen, bed, roadY };
    const wallT = 0.6, h = roadY - bed;
    this.addBox(new THREE.Vector3(C.x - C.halfW - wallT / 2 + 0.1, bed + h / 2, C.z), new THREE.Vector3(wallT, h, C.halfLen * 2), 0, 'culvert_wall');
    this.addBox(new THREE.Vector3(C.x + C.halfW + wallT / 2 - 0.1, bed + h / 2, C.z), new THREE.Vector3(wallT, h, C.halfLen * 2), 0, 'culvert_wall');
    const x0 = C.x - C.halfW - wallT, x1 = C.x + C.halfW + wallT, z0 = C.z - C.halfLen, z1 = C.z + C.halfLen;
    this.addWalkable([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], roadY, 'culvert_roof');
    // a thin slab under the roof so a capsule inside the tunnel has a ceiling and rays stop
    this.addBox(new THREE.Vector3(C.x, roadY - 0.25, C.z), new THREE.Vector3(x1 - x0, 0.5, C.halfLen * 2), 0, 'culvert_roof');
  }

  // ---------------------------------------------------------------- registration
  _key(ix, iz) { return (ix + 512) * 4096 + (iz + 512); }
  _insert(item) {
    const a = item.aabb;
    for (let ix = Math.floor(a.minX / CELL); ix <= Math.floor(a.maxX / CELL); ix++) {
      for (let iz = Math.floor(a.minZ / CELL); iz <= Math.floor(a.maxZ / CELL); iz++) {
        const k = this._key(ix, iz);
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(item);
      }
    }
    this.items.push(item);
    return item;
  }
  _rebuild() {
    const items = this.items; this.items = []; this.grid.clear();
    for (const it of items) this._insert(it);
  }
  _remove(item) {
    const i = this.items.indexOf(item);
    if (i >= 0) this.items.splice(i, 1);
    const a = item.aabb;
    for (let ix = Math.floor(a.minX / CELL); ix <= Math.floor(a.maxX / CELL); ix++) {
      for (let iz = Math.floor(a.minZ / CELL); iz <= Math.floor(a.maxZ / CELL); iz++) {
        const arr = this.grid.get(this._key(ix, iz));
        if (!arr) continue;
        const j = arr.indexOf(item); if (j >= 0) arr.splice(j, 1);
      }
    }
  }

  addBox(center, size, yaw = 0, tag = 'static') {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const hx = size.x / 2, hy = size.y / 2, hz = size.z / 2;
    const ex = Math.abs(c) * hx + Math.abs(s) * hz, ez = Math.abs(s) * hx + Math.abs(c) * hz;
    const box = {
      kind: 'box', id: this._id++, tag,
      cx: center.x, cz: center.z, hx, hz, yaw, c, s,
      minY: center.y - hy, maxY: center.y + hy,
      area: size.x * size.z,
      aabb: { minX: center.x - ex, maxX: center.x + ex, minZ: center.z - ez, maxZ: center.z + ez },
    };
    return this._addSolid(box);
  }

  /** `center` is the GEOMETRIC centre, half a height up from the base, same as addBox (docs/ARCHITECTURE.md). */
  addCylinder(center, radius, height, tag = 'static') {
    const cyl = {
      kind: 'cyl', id: this._id++, tag,
      cx: center.x, cz: center.z, r: radius,
      minY: center.y - height / 2, maxY: center.y + height / 2,
      area: Math.PI * radius * radius,
      aabb: { minX: center.x - radius, maxX: center.x + radius, minZ: center.z - radius, maxZ: center.z + radius },
    };
    return this._addSolid(cyl);
  }

  /** register a solid after reconciling it with the walkables and ramps already present */
  _addSolid(sol) {
    const cv = this.culvert;
    if (cv && sol.tag !== 'culvert_wall' && sol.tag !== 'culvert_roof'
        && Math.abs(sol.cx - cv.x) < cv.halfW && Math.abs(sol.cz - cv.z) < cv.halfLen
        && sol.minY < cv.bed + 0.6 && sol.maxY > cv.bed + 1.5) {
      console.warn(`[world] dropped solid '${sol.tag}': it would fill the culvert tunnel (the World owns those colliders)`);
      return null;
    }
    const pieces = [sol];
    for (const w of this.items) {
      if (w.kind === 'walk') {
        for (let i = pieces.length - 1; i >= 0; i--) {
          const out = this._clipByWalkable(pieces[i], w);
          if (out) pieces.splice(i, 1, ...out);
        }
      } else if (w.kind === 'ramp') {
        for (let i = pieces.length - 1; i >= 0; i--) {
          if (this._onRampFoot(pieces[i], w)) {
            console.warn(`[world] dropped solid '${pieces[i].tag}' sitting on stair ramp '${w.tag}'`);
            pieces.splice(i, 1);
          } else if (this._onRamp(pieces[i], w)) {
            console.warn(`[world] solid '${pieces[i].tag}' stands on stair ramp '${w.tag}' and will block it; move the placement`);
          }
        }
      }
    }
    let last = null;
    for (const p of pieces) last = this._insert(p);
    return last;
  }

  /** returns null (untouched) or an array of replacement pieces (possibly empty) */
  _clipByWalkable(sol, w) {
    // does the solid's footprint sit mostly inside the walkable polygon?
    const cxIn = pointInPoly(sol.cx, sol.cz, w.poly);
    if (!cxIn) return null;
    const a = sol.aabb;
    // corners pulled 0.25 m toward the centre, so a deck exactly the size of its module counts
    const ex = Math.max(0, (a.maxX - a.minX) / 2 - 0.25), ez = Math.max(0, (a.maxZ - a.minZ) / 2 - 0.25);
    const corners = [[sol.cx - ex, sol.cz - ez], [sol.cx + ex, sol.cz - ez], [sol.cx - ex, sol.cz + ez], [sol.cx + ex, sol.cz + ez]];
    let inside = 0; for (const c of corners) if (pointInPoly(c[0], c[1], w.poly)) inside++;
    const mostly = inside >= 2 || sol.area < 4;
    if (!mostly) return null;
    const y = w.y;
    const straddles = sol.minY < y - 0.3 && sol.maxY > y + 0.05;
    const rests = Math.abs(sol.minY - y) <= 0.3 && sol.maxY > y + 0.3 && sol.area >= 2.5;
    if (!straddles && !rests) return null;
    const out = [];
    if (straddles) {
      const low = { ...sol, id: this._id++, maxY: y - 0.02 };
      out.push(low);
    }
    const hiBottom = y + OVERHEAD;
    if (sol.maxY > hiBottom + 0.2) out.push({ ...sol, id: this._id++, minY: hiBottom });
    return out;
  }

  _onRamp(sol, r) {
    const dx = sol.cx - r.ax, dz = sol.cz - r.az;
    const t = dx * r.ux + dz * r.uz;
    if (t < -0.3 || t > r.len + 0.3) return false;
    const perp = Math.abs(dx * -r.uz + dz * r.ux);
    if (perp > r.halfW + 0.2) return false;
    const yRamp = r.ay + (r.by - r.ay) * Math.max(0, Math.min(1, t / r.len));
    return sol.minY < yRamp + 0.5 && sol.maxY > yRamp + 0.4;
  }

  _onRampFoot(sol, r) {
    const dx = sol.cx - r.ax, dz = sol.cz - r.az;
    const t = dx * r.ux + dz * r.uz;
    if (t < -0.5 || t > r.len + 0.5) return false;
    const perp = Math.abs(dx * -r.uz + dz * r.ux);
    if (perp > r.halfW + 0.3) return false;
    const yRamp = r.ay + (r.by - r.ay) * Math.max(0, Math.min(1, t / r.len));
    // the stair or catwalk asset: its base is within half a metre of the ramp surface here
    // (a prop smaller than 2.5 m^2 near a stair foot, a sandbag or a crate, stays solid)
    return sol.minY < yRamp + 0.5 && sol.minY > r.ay - 0.6 && sol.area <= 8 && sol.area >= 2.5;
  }

  addWalkable(polygon, y, tag = 'walk') {
    const poly = polygon.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z]));
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of poly) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
    const w = { kind: 'walk', id: this._id++, tag, poly, y, area: polyArea(poly), aabb: { minX, maxX, minZ, maxZ } };
    // reconcile solids that were registered first
    const solids = this.items.filter((it) => it.kind === 'box' || it.kind === 'cyl');
    for (const s of solids) {
      const out = this._clipByWalkable(s, w);
      if (!out) continue;
      this._remove(s);
      for (const p of out) this._insert(p);
    }
    return this._insert(w);
  }

  addLink(link) {
    const from = link.from, to = link.to;
    const fx = from.x !== undefined ? from.x : from[0], fy = from.y !== undefined ? from.y : from[1], fz = from.z !== undefined ? from.z : from[2];
    const tx = to.x !== undefined ? to.x : to[0], ty = to.y !== undefined ? to.y : to[1], tz = to.z !== undefined ? to.z : to[2];
    const tag = link.tag || link.name || link.type;
    if (link.type === 'stair') {
      const len = Math.hypot(tx - fx, tz - fz);
      const ux = (tx - fx) / (len || 1), uz = (tz - fz) / (len || 1);
      const halfW = (link.width || 1.2) / 2;
      const ex = Math.abs(ux) * len / 2 + halfW + 0.3, ez = Math.abs(uz) * len / 2 + halfW + 0.3;
      const r = { kind: 'ramp', id: this._id++, tag, type: 'stair', ax: fx, az: fz, ay: fy, bx: tx, bz: tz, by: ty, ux, uz, len, halfW,
        aabb: { minX: (fx + tx) / 2 - ex, maxX: (fx + tx) / 2 + ex, minZ: (fz + tz) / 2 - ez, maxZ: (fz + tz) / 2 + ez } };
      for (const s of this.items.slice()) {
        if ((s.kind === 'box' || s.kind === 'cyl') && this._onRampFoot(s, r)) {
          console.warn(`[world] dropped solid '${s.tag}' sitting on stair ramp '${tag}'`);
          this._remove(s);
        }
      }
      return this._insert(r);
    }
    if (link.type === 'ladder') {
      const len = Math.hypot(tx - fx, tz - fz) || 1;
      const l = { kind: 'ladder', id: this._id++, tag, x: fx, z: fz, y0: Math.min(fy, ty), y1: Math.max(fy, ty),
        tox: tx, toz: tz, ax: (tx - fx) / len, az: (tz - fz) / len, width: link.width || 0.8 };
      this.ladders.push(l);
      return l;
    }
    const l = { kind: link.type || 'link', id: this._id++, tag, from: [fx, fy, fz], to: [tx, ty, tz], width: link.width || 1.5 };
    this.navLinks.push(l);
    return l;
  }

  removeTag(tag) {
    this.items = this.items.filter((it) => it.tag !== tag);
    this.ladders = this.ladders.filter((it) => it.tag !== tag);
    this.navLinks = this.navLinks.filter((it) => it.tag !== tag);
    this._rebuild();
  }

  colliders() { return this.items.concat(this.ladders, this.navLinks); }

  // ---------------------------------------------------------------- queries
  _near(minX, maxX, minZ, maxZ, out) {
    out.length = 0;
    const seen = new Set();
    for (let ix = Math.floor(minX / CELL); ix <= Math.floor(maxX / CELL); ix++) {
      for (let iz = Math.floor(minZ / CELL); iz <= Math.floor(maxZ / CELL); iz++) {
        const arr = this.grid.get(this._key(ix, iz));
        if (!arr) continue;
        for (const it of arr) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
      }
    }
    return out;
  }

  /** circle (x,z,r) vs solid footprint; fills _q with push vector; returns penetration > 0 */
  _footprintPush(sol, x, z, r) {
    if (sol.kind === 'box') {
      const dx = x - sol.cx, dz = z - sol.cz;
      const lx = dx * sol.c - dz * sol.s, lz = dx * sol.s + dz * sol.c;
      const qx = Math.max(-sol.hx, Math.min(sol.hx, lx)), qz = Math.max(-sol.hz, Math.min(sol.hz, lz));
      const ex = lx - qx, ez = lz - qz;
      const d2 = ex * ex + ez * ez;
      let px, pz, pen;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        if (d >= r) return 0;
        pen = r - d; px = ex / d * pen; pz = ez / d * pen;
      } else {
        const ox = sol.hx - Math.abs(lx), oz = sol.hz - Math.abs(lz);
        if (ox < oz) { pen = ox + r; px = (lx >= 0 ? 1 : -1) * pen; pz = 0; }
        else { pen = oz + r; pz = (lz >= 0 ? 1 : -1) * pen; px = 0; }
      }
      _q.x = px * sol.c + pz * sol.s; _q.z = -px * sol.s + pz * sol.c;
      return pen;
    }
    if (sol.kind === 'cyl') {
      const dx = x - sol.cx, dz = z - sol.cz;
      const d = Math.hypot(dx, dz), R = sol.r + r;
      if (d >= R) return 0;
      const pen = R - d;
      if (d > 1e-6) { _q.x = dx / d * pen; _q.z = dz / d * pen; } else { _q.x = pen; _q.z = 0; }
      return pen;
    }
    return 0;
  }

  _overlapsFootprint(sol, x, z, r) { return this._footprintPush(sol, x, z, r) > 0; }

  _rampY(rp, x, z, tol = 0) {
    const dx = x - rp.ax, dz = z - rp.az;
    const t = dx * rp.ux + dz * rp.uz;
    if (t < -tol || t > rp.len + tol) return null;
    const perp = Math.abs(dx * -rp.uz + dz * rp.ux);
    if (perp > rp.halfW + tol) return null;
    return rp.ay + (rp.by - rp.ay) * Math.max(0, Math.min(1, t / rp.len));
  }

  /** highest support under (x,z) no higher than feet + STEP (boxes and cylinders included) */
  _support(x, z, feet, r, cands) {
    let best = this.terrain.heightAt(x, z);
    const lim = feet + STEP + 1e-3;
    for (const it of cands) {
      if (it.kind === 'walk') {
        if (it.y <= lim && it.y > best && pointInPoly(x, z, it.poly)) best = it.y;
      } else if (it.kind === 'ramp') {
        const y = this._rampY(it, x, z, r * 0.5);
        if (y !== null && y <= lim && y > best) best = y;
      } else if (it.kind === 'box' || it.kind === 'cyl') {
        if (it.maxY <= lim && it.maxY > best && it.tag !== 'boundary' && this._overlapsFootprint(it, x, z, r * 0.8)) best = it.maxY;
      }
    }
    return best;
  }

  groundY(x, z) {
    const c = this._near(x - 0.5, x + 0.5, z - 0.5, z + 0.5, []);
    let best = this.terrain.heightAt(x, z);
    for (const it of c) {
      if (it.kind === 'walk') { if (it.y > best && pointInPoly(x, z, it.poly)) best = it.y; }
      else if (it.kind === 'ramp') { const y = this._rampY(it, x, z, 0); if (y !== null && y > best) best = y; }
    }
    return best;
  }

  _ladderAt(x, z, y) {
    for (const l of this.ladders) {
      const d = Math.hypot(x - l.x, z - l.z);
      if (d <= LADDER_R && y >= l.y0 - 0.4 && y <= l.y1 + 0.3) return l;
    }
    return null;
  }

  // ---------------------------------------------------------------- movement
  /**
   * Move a capsule whose feet are at pos by delta (gravity already inside delta.y).
   * Returns { pos, grounded, groundY, hitWall }. Never mutates the inputs.
   */
  moveCapsule(pos, delta, radius = 0.35, height = 1.8) {
    const out = { pos: pos.clone(), grounded: false, groundY: 0, hitWall: false, ladder: false };
    const feet = pos.y;
    let dx = delta.x, dz = delta.z;
    const mag = Math.hypot(dx, dz);

    // ladders: the column owns the movement while the capsule is inside it and pushing along it
    const lad = this._ladderAt(pos.x, pos.z, feet);
    if (lad) {
      const along = mag > 0 ? (dx * lad.ax + dz * lad.az) : 0;
      let y = feet;
      let nx = pos.x, nz = pos.z;
      if (Math.abs(along) > 1e-6) {
        y += along * LADDER_SPEED;
        if (y > lad.y1) {
          // top: walk off onto the deck side
          const over = (y - lad.y1) / LADDER_SPEED;
          y = lad.y1; nx += lad.ax * over; nz += lad.az * over;
        } else if (y < lad.y0) {
          const under = (lad.y0 - y) / LADDER_SPEED;
          y = lad.y0; nx -= lad.ax * under; nz -= lad.az * under;
        } else {
          // pull to the column while climbing
          nx += (lad.x - nx) * 0.35; nz += (lad.z - nz) * 0.35;
        }
      }
      // lateral component leaves the column
      const lat = mag > 0 ? (dx * -lad.az + dz * lad.ax) : 0;
      nx += -lad.az * lat; nz += lad.ax * lat;
      out.pos.set(nx, y, nz);
      const g = this.groundY(nx, nz);
      if (y <= g + 1e-3) { out.pos.y = g; }
      out.grounded = true; out.groundY = out.pos.y; out.ladder = true;
      return out;
    }

    let nx = pos.x + dx, nz = pos.z + dz;

    // terrain: a steep slope is a wall when going up it
    if (mag > 0) {
      const tH = this.terrain.heightAt(nx, nz);
      if (tH > feet + 0.03) {
        const n = this.terrain.normalAt(nx, nz, _v);
        const slope = Math.acos(Math.min(1, n.y));
        if (slope > MAX_SLOPE) {
          // uphill unit vector in xz is -normal.xz
          let ux = -n.x, uz = -n.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
          const up = dx * ux + dz * uz;
          if (up > 0) { dx -= ux * up; dz -= uz * up; out.hitWall = true; nx = pos.x + dx; nz = pos.z + dz; }
        }
      }
    }

    // solids: iterate the push out a few times so corners resolve
    const reach = radius + mag + 0.5;
    const cands = this._near(nx - reach, nx + reach, nz - reach, nz + reach, []);
    const lo = feet + STEP, hi = feet + height;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const it of cands) {
        if (it.kind !== 'box' && it.kind !== 'cyl') continue;
        if (it.maxY <= lo || it.minY >= hi) continue;       // step onto it, or pass under it
        const pen = this._footprintPush(it, nx, nz, radius);
        if (pen <= 0) continue;
        nx += _q.x; nz += _q.z; moved = true; out.hitWall = true;
      }
      if (!moved) break;
    }

    // vertical
    let g = this._support(nx, nz, feet, radius, cands);
    if (g > feet + STEP + 1e-3) {
      // cannot step that high: cancel the horizontal move
      nx = pos.x; nz = pos.z; out.hitWall = true;
      g = this._support(nx, nz, feet, radius, cands);
    }
    let ny = feet + delta.y;
    if (delta.y > 0) {
      // ceilings: a solid whose underside is between the old head and the new head
      const head = ny + height;
      for (const it of cands) {
        if (it.kind !== 'box' && it.kind !== 'cyl') continue;
        if (it.minY >= feet + height - 1e-3 && it.minY < head && this._overlapsFootprint(it, nx, nz, radius * 0.9)) {
          ny = Math.min(ny, it.minY - height); out.ceiling = true;
        }
      }
    }
    if (ny <= g + 1e-3) { ny = g; out.grounded = true; }
    else if (delta.y <= 0 && feet - g <= STEP && feet >= g - 1e-3) { ny = g; out.grounded = true; }   // snap down a step
    out.pos.set(nx, ny, nz);
    out.groundY = g;
    return out;
  }

  // ---------------------------------------------------------------- rays
  raycast(origin, dir, maxDist, opts = {}) {
    const ignore = opts.ignoreTag;
    const res = { hit: false, point: null, normal: null, dist: maxDist, tag: null };
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dxr = dir.x, dyr = dir.y, dzr = dir.z;

    // terrain: march then bisect. Skip if the ray never gets below the highest ground.
    const T = this.terrain;
    const hMax = T.grid ? T.grid.hMax : 10;
    if (oy <= hMax || dyr < 0) {
      const step = 0.6;
      let tPrev = 0, hPrev = oy - T.heightAt(ox, oz);
      if (hPrev <= 0) { res.hit = true; res.dist = 0; res.tag = 'terrain'; }
      else {
        for (let t = step; t <= maxDist; t += step) {
          const x = ox + dxr * t, y = oy + dyr * t, z = oz + dzr * t;
          if (y > hMax + 0.5 && dyr >= 0) break;
          const h = y - T.heightAt(x, z);
          if (h <= 0) {
            let a = tPrev, b = t;
            for (let k = 0; k < 8; k++) {
              const m = (a + b) / 2;
              const hm = oy + dyr * m - T.heightAt(ox + dxr * m, oz + dzr * m);
              if (hm <= 0) b = m; else a = m;
            }
            res.hit = true; res.dist = b; res.tag = 'terrain';
            break;
          }
          tPrev = t; hPrev = h;
        }
      }
    }

    // colliders along the ray: walk the hash cells (2D DDA in xz)
    const seen = new Set();
    const L = Math.min(res.dist, maxDist);
    const hx = Math.hypot(dxr, dzr);
    const cellsAlong = hx > 1e-6 ? Math.ceil(L * hx / CELL) + 2 : 1;
    for (let i = 0; i <= cellsAlong; i++) {
      const t = Math.min(L, (i * CELL) / (hx || 1));
      const cx = Math.floor((ox + dxr * t) / CELL), cz = Math.floor((oz + dzr * t) / CELL);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const arr = this.grid.get(this._key(cx + a, cz + b));
        if (!arr) continue;
        for (const it of arr) {
          if (seen.has(it.id)) continue; seen.add(it.id);
          if (ignore && it.tag === ignore) continue;
          const h = this._rayItem(it, ox, oy, oz, dxr, dyr, dzr, res.dist);
          if (h && h.dist < res.dist) { res.hit = true; res.dist = h.dist; res.normal = h.normal; res.tag = it.tag; }
        }
      }
      if (t >= L) break;
    }
    if (res.hit) {
      res.point = new THREE.Vector3(ox + dxr * res.dist, oy + dyr * res.dist, oz + dzr * res.dist);
      if (!res.normal) res.normal = res.tag === 'terrain' ? T.normalAt(res.point.x, res.point.z, new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
    }
    return res;
  }

  _rayItem(it, ox, oy, oz, dx, dy, dz, maxT) {
    if (it.kind === 'box') {
      // to local frame
      const rx = ox - it.cx, rz = oz - it.cz;
      const lx = rx * it.c - rz * it.s, lz = rx * it.s + rz * it.c;
      const ldx = dx * it.c - dz * it.s, ldz = dx * it.s + dz * it.c;
      const ly = oy - (it.minY + it.maxY) / 2, hy = (it.maxY - it.minY) / 2;
      let t0 = 0, t1 = maxT, nAxis = -1, nSign = 0;
      const axes = [[lx, ldx, it.hx], [ly, dy, hy], [lz, ldz, it.hz]];
      for (let a = 0; a < 3; a++) {
        const [o, d, h] = axes[a];
        if (Math.abs(d) < 1e-9) { if (o < -h || o > h) return null; continue; }
        let ta = (-h - o) / d, tb = (h - o) / d, sgn = -1;
        if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; sgn = 1; }
        if (ta > t0) { t0 = ta; nAxis = a; nSign = sgn; }
        if (tb < t1) t1 = tb;
        if (t0 > t1) return null;
      }
      if (nAxis < 0) return null;   // started inside
      let n;
      if (nAxis === 1) n = new THREE.Vector3(0, nSign, 0);
      else if (nAxis === 0) n = new THREE.Vector3(nSign * it.c, 0, -nSign * it.s);
      else n = new THREE.Vector3(nSign * it.s, 0, nSign * it.c);
      return { dist: t0, normal: n };
    }
    if (it.kind === 'cyl') {
      const fx = ox - it.cx, fz = oz - it.cz;
      const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - it.r * it.r;
      let tSide = Infinity;
      if (a > 1e-9) {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const t = (-b - Math.sqrt(disc)) / (2 * a);
          if (t >= 0 && t <= maxT) { const y = oy + dy * t; if (y >= it.minY && y <= it.maxY) tSide = t; }
        }
      }
      // caps
      let tCap = Infinity, capN = 0;
      if (Math.abs(dy) > 1e-9) {
        for (const [yy, sgn] of [[it.maxY, 1], [it.minY, -1]]) {
          const t = (yy - oy) / dy;
          if (t >= 0 && t <= maxT && t < tCap) {
            const x = ox + dx * t - it.cx, z = oz + dz * t - it.cz;
            if (x * x + z * z <= it.r * it.r) { tCap = t; capN = sgn; }
          }
        }
      }
      if (tSide === Infinity && tCap === Infinity) return null;
      if (tSide <= tCap) {
        const px = ox + dx * tSide - it.cx, pz = oz + dz * tSide - it.cz;
        return { dist: tSide, normal: new THREE.Vector3(px, 0, pz).normalize() };
      }
      return { dist: tCap, normal: new THREE.Vector3(0, capN, 0) };
    }
    if (it.kind === 'walk') {
      if (Math.abs(dy) < 1e-9) return null;
      const t = (it.y - oy) / dy;
      if (t < 0 || t > maxT) return null;
      if (!pointInPoly(ox + dx * t, oz + dz * t, it.poly)) return null;
      return { dist: t, normal: new THREE.Vector3(0, dy < 0 ? 1 : -1, 0) };
    }
    if (it.kind === 'ramp') {
      // plane through the ramp: contains the axis direction (ux, slope, uz) and the side vector
      const rise = (it.by - it.ay) / (it.len || 1);
      const n = new THREE.Vector3(-rise * it.ux, 1, -rise * it.uz).normalize();
      const denom = n.x * dx + n.y * dy + n.z * dz;
      if (Math.abs(denom) < 1e-9) return null;
      const t = (n.x * (it.ax - ox) + n.y * (it.ay - oy) + n.z * (it.az - oz)) / denom;
      if (t < 0 || t > maxT) return null;
      if (this._rampY(it, ox + dx * t, oz + dz * t, 0) === null) return null;
      if (denom > 0) n.negate();
      return { dist: t, normal: n };
    }
    return null;
  }

  lineOfSight(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-4) return true;
    const r = this.raycast(a, new THREE.Vector3(dx / L, dy / L, dz / L), L - 0.02);
    return !r.hit;
  }
}
