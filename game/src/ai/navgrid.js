/**
 * Nav grid for the bots: a 1 m ground layer over the whole map plus one small 0.5 m island
 * per level 2 walkable (roofs, decks, rings, bridges), joined by the links from MAP-PLAN
 * section 6 (stairs, ladders, slopes, the culvert). A* over the whole thing, with the link
 * costs from MAP-PLAN section 7: stair 1.0 per metre, ladder 2.5, slope 1.2, tunnel 1.0.
 *
 * The ground layer is built from the terrain (slope under 35 degrees) and the world's static
 * colliders (a cell is blocked when a collider covers its centre with 0.5 m radius and 1.9 m
 * height clearance). Colliders are read duck typed from `world.colliders()`: boxes carry
 * `center`, `size` and `yaw`, cylinders carry `center`, `radius` and `height`; anything else
 * is ignored. The wadi bed and the trench floor are ordinary ground cells that sit lower.
 */
import * as THREE from 'three';

const LINK_COST = { stair: 1.0, ladder: 2.5, slope: 1.2, tunnel: 1.0, catwalk: 1.0, bridge: 1.0 };
const LINK_KIND = ['walk', 'stair', 'ladder', 'slope', 'tunnel', 'catwalk'];
const MAX_SLOPE = 35 * Math.PI / 180;
const MAX_STEP = 0.75;           // metres of rise per metre of run between two ground cells
const CLEAR_R = 0.5;
const CLEAR_H = 1.9;

// MAP-PLAN section 3.5 and 3.6: the two low level flank channels, as centre lines.
const WADI_PATH = [[-14, -55], [-10, -42], [-4, -30], [4, -22], [11, -12], [14, -2], [14, 8], [16, 18], [18, 30], [22, 42], [26, 55]];
const WADI_ENTRIES = [[-10, -46], [-6, -33], [-2, -33], [7, -16], [16, 30], [20, 30], [24, 48]];
const TRENCH_PATH = [[-46, 49], [-24, 49], [-22, 51], [2, 51], [4, 49], [30, 49]];
const TRENCH_ENTRIES = [[-46, 49], [-12, 49], [30, 49]];

const v3 = (a) => (a && a.isVector3 ? a : new THREE.Vector3(a[0], a[1], a[2]));
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Binary min heap keyed on f. */
class Heap {
  constructor() { this.ids = []; this.keys = []; }
  get size() { return this.ids.length; }
  push(id, key) {
    const ids = this.ids, keys = this.keys;
    let i = ids.length; ids.push(id); keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= keys[i]) break;
      [ids[p], ids[i]] = [ids[i], ids[p]]; [keys[p], keys[i]] = [keys[i], keys[p]]; i = p;
    }
  }
  pop() {
    const ids = this.ids, keys = this.keys;
    const top = ids[0];
    const lid = ids.pop(), lk = keys.pop();
    if (ids.length) {
      ids[0] = lid; keys[0] = lk;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < ids.length && keys[l] < keys[m]) m = l;
        if (r < ids.length && keys[r] < keys[m]) m = r;
        if (m === i) break;
        [ids[m], ids[i]] = [ids[i], ids[m]]; [keys[m], keys[i]] = [keys[i], keys[m]]; i = m;
      }
    }
    return top;
  }
}

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distToPolyEdge(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t - x, pz = az + dz * t - z;
    const d = Math.sqrt(px * px + pz * pz);
    if (d < best) best = d;
  }
  return best;
}

/** Normalise one entry of world.colliders() into { kind, cx, cz, y0, y1, hx, hz, yaw, r }. */
function readCollider(c) {
  if (!c || typeof c !== 'object') return null;
  // world/collision.js records: { kind:'box', cx, cz, hx, hz, yaw, minY, maxY } and
  // { kind:'cyl', cx, cz, r, minY, maxY }; walk, ramp, ladder, slope and tunnel never block.
  // (integrator fix: the World's yaw rotates the opposite way to boxContains below, so it is negated)
  if (c.kind !== undefined) {
    if (c.kind === 'box' && c.hx !== undefined) return { kind: 'box', cx: num(c.cx), cz: num(c.cz), hx: num(c.hx), hz: num(c.hz), yaw: -num(c.yaw), y0: num(c.minY), y1: num(c.maxY), r: 0 };
    if (c.kind === 'cyl' && c.r !== undefined) return { kind: 'cyl', cx: num(c.cx), cz: num(c.cz), r: num(c.r), y0: num(c.minY), y1: num(c.maxY), hx: 0, hz: 0, yaw: 0 };
    return null;
  }
  const tag = String(c.tag || c.type || '');
  if (/ramp|stair|ladder|walkable|link|trigger|terrain/i.test(tag)) return null;
  const center = c.center || c.pos || c.position || c.c;
  if (!center) return null;
  const cx = num(center.x, center[0]), cy = num(center.y, center[1]), cz = num(center.z, center[2]);
  if (c.radius !== undefined && c.size === undefined) {
    const h = num(c.height, 2);
    const base = c.base !== undefined ? num(c.base) : (c.y0 !== undefined ? num(c.y0) : cy - h * 0.5);
    return { kind: 'cyl', cx, cz, r: num(c.radius, 0.5), y0: base, y1: base + h, hx: 0, hz: 0, yaw: 0 };
  }
  const size = c.size || c.extents || c.dims;
  if (!size) return null;
  const sx = num(size.x, size[0]), sy = num(size.y, size[1]), sz = num(size.z, size[2]);
  const half = c.halfExtents ? 1 : 0.5;
  const y0 = c.base !== undefined ? num(c.base) : (c.y0 !== undefined ? num(c.y0) : cy - sy * half);
  return { kind: 'box', cx, cz, hx: sx * half, hz: sz * half, yaw: num(c.yaw, num(c.rot, num(c.angle, 0))), y0, y1: y0 + sy * (half === 1 ? 2 : 1), r: 0 };
}

function boxContains(b, x, z, pad) {
  const dx = x - b.cx, dz = z - b.cz;
  const c = Math.cos(-b.yaw), s = Math.sin(-b.yaw);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= b.hx + pad && Math.abs(lz) <= b.hz + pad;
}

export class NavGrid {
  constructor() {
    this.cell = 1.0;
    this.count = 0;
    this.px = null; this.py = null; this.pz = null; this.layer = null;    // per node
    this.offsets = null; this.adj = null; this.cost = null; this.kind = null;
    this.gridW = 0; this.gridH = 0; this.minX = 0; this.minZ = 0; this.gridId = null;
    this.islands = [];               // { name, y, x0, z0, w, h, cell, ids: Int32Array }
    this.links = [];
    this.coverPoints = [];
    this.world = null; this.terrain = null; this.boundary = null;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
  }

  // ------------------------------------------------------------------ build
  static build({ world, terrain, placements = [], links = [], walkables = [], boundary, cell = 1.0, coverPoints = [] }) {
    const nav = new NavGrid();
    nav.world = world; nav.terrain = terrain; nav.cell = cell;
    const b = terrain && terrain.bounds ? terrain.bounds : { minX: -70, maxX: 70, minZ: -55, maxZ: 55 };
    nav.boundary = boundary || { minX: b.minX + 4, maxX: b.maxX - 4, minZ: b.minZ + 3, maxZ: b.maxZ - 3 };
    nav.minX = b.minX; nav.minZ = b.minZ;
    nav.gridW = Math.round((b.maxX - b.minX) / cell) + 1;
    nav.gridH = Math.round((b.maxZ - b.minZ) / cell) + 1;
    const W = nav.gridW, H = nav.gridH;

    const cols = [];
    let raw = [];
    try { raw = (world && typeof world.colliders === 'function') ? (world.colliders() || []) : []; } catch (e) { raw = []; }
    for (const c of raw) { const r = readCollider(c); if (r) cols.push(r); }
    nav._cols = cols;

    // Cells forced free: along tunnel and slope links (the culvert interior gets a box
    // collider from the level; the link says bots go through it).
    const forced = [];
    for (const L of links) {
      if (!L || !(L.type === 'tunnel' || L.type === 'slope')) continue;
      const f = v3(L.from), t = v3(L.to);
      forced.push({ f, t, w: num(L.width, 2) * 0.5 + 0.6 });
    }
    const isForced = (x, z) => {
      for (const s of forced) {
        const dx = s.t.x - s.f.x, dz = s.t.z - s.f.z, l2 = dx * dx + dz * dz || 1e-9;
        let u = ((x - s.f.x) * dx + (z - s.f.z) * dz) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = s.f.x + dx * u - x, pz = s.f.z + dz * u - z;
        if (px * px + pz * pz <= s.w * s.w) return true;
      }
      return false;
    };

    const heightAt = (x, z) => (terrain && terrain.heightAt ? terrain.heightAt(x, z) : 0);
    const slopeAt = (x, z) => (terrain && terrain.slopeAt ? terrain.slopeAt(x, z) : 0);

    // Ground layer.
    const gridId = new Int32Array(W * H).fill(-1);
    const px = [], py = [], pz = [], layer = [];
    const bd = nav.boundary;
    for (let gz = 0; gz < H; gz++) {
      for (let gx = 0; gx < W; gx++) {
        const x = b.minX + gx * cell, z = b.minZ + gz * cell;
        if (x < bd.minX + 0.4 || x > bd.maxX - 0.4 || z < bd.minZ + 0.4 || z > bd.maxZ - 0.4) continue;
        const y = heightAt(x, z);
        const free = isForced(x, z);
        if (!free && slopeAt(x, z) > MAX_SLOPE) continue;
        if (!free && nav._blockedAt(x, z, y)) continue;
        gridId[gz * W + gx] = px.length;
        px.push(x); py.push(y); pz.push(z); layer.push(0);
      }
    }
    nav.gridId = gridId;

    // Islands: one 0.5 m grid per walkable polygon.
    let li = 1;
    for (const wk of walkables) {
      if (!wk || !wk.polygon || wk.polygon.length < 3) continue;
      const poly = wk.polygon.map((p) => (p.isVector3 ? [p.x, p.z] : [num(p[0]), num(p[1] !== undefined && p.length === 2 ? p[1] : p[2])]));
      const holes = (wk.holes || []).map((h) => h.map((p) => (p.isVector3 ? [p.x, p.z] : [num(p[0]), num(p.length === 2 ? p[1] : p[2])])));
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      const ic = 0.5;
      const w = Math.max(1, Math.round((x1 - x0) / ic) + 1), h = Math.max(1, Math.round((z1 - z0) / ic) + 1);
      const ids = new Int32Array(w * h).fill(-1);
      const y = num(wk.y, heightAt((x0 + x1) / 2, (z0 + z1) / 2));
      let n = 0;
      for (let gz = 0; gz < h; gz++) {
        for (let gx = 0; gx < w; gx++) {
          const x = x0 + gx * ic, z = z0 + gz * ic;
          if (!pointInPolygon(x, z, poly)) continue;
          if (distToPolyEdge(x, z, poly) < 0.3) continue;
          let inHole = false;
          for (const hp of holes) { if (pointInPolygon(x, z, hp) || distToPolyEdge(x, z, hp) < 0.3) { inHole = true; break; } }
          if (inHole) continue;
          if (nav._blockedAt(x, z, y)) continue;
          ids[gz * w + gx] = px.length;
          px.push(x); py.push(y); pz.push(z); layer.push(li);
          n++;
        }
      }
      nav.islands.push({ name: wk.name || `island${li}`, y, x0, z0, w, h, cell: ic, ids, layer: li, nodes: n });
      li++;
    }

    nav.count = px.length;
    nav.px = Float32Array.from(px); nav.py = Float32Array.from(py); nav.pz = Float32Array.from(pz);
    nav.layer = Int16Array.from(layer);

    // Adjacency (CSR). Ground: 8 neighbours with a step test. Islands: 8 neighbours.
    const nbrs = new Array(nav.count);
    for (let i = 0; i < nav.count; i++) nbrs[i] = [];
    const addEdge = (a, c, cost, kind) => { nbrs[a].push(c, cost, kind); };
    const D = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let gz = 0; gz < H; gz++) {
      for (let gx = 0; gx < W; gx++) {
        const a = gridId[gz * W + gx]; if (a < 0) continue;
        for (const [dx, dz] of D) {
          const nx = gx + dx, nz = gz + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
          const c = gridId[nz * W + nx]; if (c < 0) continue;
          const run = (dx && dz) ? cell * Math.SQRT2 : cell;
          const rise = Math.abs(nav.py[c] - nav.py[a]);
          if (rise > MAX_STEP * run) continue;
          if (dx && dz) {   // no corner cutting past a blocked cell
            if (gridId[gz * W + nx] < 0 || gridId[nz * W + gx] < 0) continue;
          }
          addEdge(a, c, run * (1 + 1.5 * rise / run), 0);
        }
      }
    }
    for (const isl of nav.islands) {
      for (let gz = 0; gz < isl.h; gz++) {
        for (let gx = 0; gx < isl.w; gx++) {
          const a = isl.ids[gz * isl.w + gx]; if (a < 0) continue;
          for (const [dx, dz] of D) {
            const nx = gx + dx, nz = gz + dz;
            if (nx < 0 || nz < 0 || nx >= isl.w || nz >= isl.h) continue;
            const c = isl.ids[nz * isl.w + nx]; if (c < 0) continue;
            if (dx && dz && (isl.ids[gz * isl.w + nx] < 0 || isl.ids[nz * isl.w + gx] < 0)) continue;
            addEdge(a, c, (dx && dz) ? isl.cell * Math.SQRT2 : isl.cell, 0);
          }
        }
      }
    }

    // Links join layers.
    for (const L of links) {
      if (!L) continue;
      const bots = L.bots;
      if (bots === false || bots === 'no' || bots === 0) continue;
      const type = String(L.type || 'stair');
      const f = v3(L.from), t = v3(L.to);
      const a = nav.nearest(f), c = nav.nearest(t);
      if (a < 0 || c < 0) { console.warn('[nav] link has no node', L); continue; }
      const da = Math.hypot(nav.px[a] - f.x, nav.pz[a] - f.z), dc = Math.hypot(nav.px[c] - t.x, nav.pz[c] - t.z);
      if (da > 3 || dc > 3) console.warn(`[nav] link ${type} ends far from the grid (${da.toFixed(1)} m, ${dc.toFixed(1)} m)`, L.name || '');
      if (a === c) continue;
      const len = f.distanceTo(t) + da + dc;
      const kind = Math.max(0, LINK_KIND.indexOf(type));
      const cost = len * (LINK_COST[type] || 1.0);
      addEdge(a, c, cost, kind); addEdge(c, a, cost, kind);
      nav.links.push({ type, from: f.clone(), to: t.clone(), a, c, kind, width: num(L.width, 1.2) });
    }

    const offsets = new Int32Array(nav.count + 1);
    let total = 0;
    for (let i = 0; i < nav.count; i++) { offsets[i] = total; total += nbrs[i].length / 3; }
    offsets[nav.count] = total;
    nav.offsets = offsets;
    nav.adj = new Int32Array(total); nav.cost = new Float32Array(total); nav.kind = new Uint8Array(total);
    for (let i = 0, k = 0; i < nav.count; i++) {
      const n = nbrs[i];
      for (let j = 0; j < n.length; j += 3) { nav.adj[k] = n[j]; nav.cost[k] = n[j + 1]; nav.kind[k] = n[j + 2]; k++; }
    }

    nav._buildCover(coverPoints);
    console.log(`[nav] ${nav.count} nodes (${nav.count - nav.islands.reduce((s, i) => s + i.nodes, 0)} ground, ${nav.islands.length} islands), ${nav.links.length} links, ${nav.coverPoints.length} cover points`);
    return nav;
  }

  _blockedAt(x, z, floorY) {
    const lo = floorY + 0.25, hi = floorY + CLEAR_H;
    for (const c of this._cols) {
      if (c.y1 < lo || c.y0 > hi) continue;
      if (c.kind === 'cyl') {
        const dx = x - c.cx, dz = z - c.cz;
        if (dx * dx + dz * dz <= (c.r + CLEAR_R) * (c.r + CLEAR_R)) return true;
      } else {
        const reach = Math.hypot(c.hx, c.hz) + CLEAR_R;
        if (Math.abs(x - c.cx) > reach || Math.abs(z - c.cz) > reach) continue;
        if (boxContains(c, x, z, CLEAR_R)) return true;
      }
    }
    return false;
  }

  _buildCover(given) {
    const out = [];
    for (const cp of given || []) {
      if (!cp) continue;
      const x = num(cp.x), z = num(cp.z);
      const y = cp.y !== undefined && cp.y !== null ? num(cp.y) : this.groundY(x, z);
      const nx = num(cp.nx), nz = num(cp.nz);
      const l = Math.hypot(nx, nz) || 1;
      out.push({ x, y, z, nx: nx / l, nz: nz / l, height: cp.height === 'low' ? 'low' : 'high', asset: cp.asset || '' });
    }
    // Derived from colliders when the level gives none (or too few): a point 0.75 m off every
    // face of every chest to head high static collider, the normal pointing away from the face.
    if (out.length < 40) {
      for (const c of this._cols) {
        const h = c.y1 - c.y0;
        if (h < 0.7 || h > 4.0) continue;
        const cands = [];
        if (c.kind === 'cyl') {
          if (c.r > 5) continue;
          for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4;
            cands.push([c.cx + Math.cos(a) * (c.r + 0.75), c.cz + Math.sin(a) * (c.r + 0.75), -Math.cos(a), -Math.sin(a)]);
          }
        } else {
          if (c.hx > 8 || c.hz > 8) continue;
          const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
          const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (const [fx, fz] of faces) {
            const ext = fx ? c.hx : c.hz;
            const along = fx ? c.hz : c.hx;
            const nsteps = Math.max(1, Math.floor(along / 2.5));
            for (let s = 0; s < nsteps; s++) {
              const t = nsteps === 1 ? 0 : (s / (nsteps - 1) - 0.5) * (along * 2 - 1.2);
              const lx = fx * (ext + 0.75) + (fz ? t : 0), lz = fz * (ext + 0.75) + (fx ? t : 0);
              const wx = c.cx + lx * cs - lz * sn, wz = c.cz + lx * sn + lz * cs;
              const nwx = -(fx * cs - fz * sn), nwz = -(fx * sn + fz * cs);
              cands.push([wx, wz, nwx, nwz]);
            }
          }
        }
        for (const [x, z, nx, nz] of cands) {
          const id = this.nearest(this._v.set(x, this.groundY(x, z), z));
          if (id < 0) continue;
          if (Math.hypot(this.px[id] - x, this.pz[id] - z) > 1.0) continue;
          const y = this.py[id];
          if (c.y0 > y + 1.2) continue;             // hanging above head, no cover
          const top = c.y1 - y;
          if (top < 0.7) continue;
          out.push({ x: this.px[id], y, z: this.pz[id], nx, nz, height: top < 1.45 ? 'low' : 'high', asset: '' });
        }
      }
    }
    this.coverPoints = out;
  }

  // ------------------------------------------------------------------ queries
  nodePos(id, out = new THREE.Vector3()) { return out.set(this.px[id], this.py[id], this.pz[id]); }

  /** Nearest walkable node to a world position, on the layer whose height fits best. */
  nearest(pos) {
    const x = pos.x, z = pos.z, y = num(pos.y, this.groundY(x, z));
    let best = -1, bestScore = Infinity;
    // islands first when we are up high
    for (const isl of this.islands) {
      if (Math.abs(isl.y - y) > 1.6) continue;
      const gx = Math.round((x - isl.x0) / isl.cell), gz = Math.round((z - isl.z0) / isl.cell);
      for (let r = 0; r <= 4; r++) {
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const ix = gx + dx, iz = gz + dz;
            if (ix < 0 || iz < 0 || ix >= isl.w || iz >= isl.h) continue;
            const id = isl.ids[iz * isl.w + ix]; if (id < 0) continue;
            const s = Math.hypot(this.px[id] - x, this.pz[id] - z) + 2 * Math.abs(this.py[id] - y);
            if (s < bestScore) { bestScore = s; best = id; }
          }
        }
        if (best >= 0 && bestScore < r * isl.cell) break;
      }
    }
    const W = this.gridW, H = this.gridH;
    const gx = Math.round((x - this.minX) / this.cell), gz = Math.round((z - this.minZ) / this.cell);
    for (let r = 0; r <= 8; r++) {
      let found = false;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const ix = gx + dx, iz = gz + dz;
          if (ix < 0 || iz < 0 || ix >= W || iz >= H) continue;
          const id = this.gridId[iz * W + ix]; if (id < 0) continue;
          const s = Math.hypot(this.px[id] - x, this.pz[id] - z) + 2 * Math.abs(this.py[id] - y);
          if (s < bestScore) { bestScore = s; best = id; found = true; }
        }
      }
      if (found && bestScore < (r + 1) * this.cell) break;
    }
    return best;
  }

  groundY(x, z) {
    if (this.world && typeof this.world.groundY === 'function') { const y = this.world.groundY(x, z); if (Number.isFinite(y)) return y; }
    if (this.terrain && this.terrain.heightAt) return this.terrain.heightAt(x, z);
    return 0;
  }

  lineOfSight(a, b) {
    if (this.world && typeof this.world.lineOfSight === 'function') return this.world.lineOfSight(a, b);
    return true;
  }

  inBoundary(x, z) {
    const b = this.boundary;
    return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  }

  /** A* from one world position to another. Returns waypoints; a waypoint that ends a link
   *  edge carries `.link` ('stair'|'ladder'|'slope'|'tunnel'|'catwalk'). Empty when unreachable. */
  findPath(from, to, opts = {}) {
    const allowLadders = opts.allowLadders !== false;
    const s = this.nearest(from), g = this.nearest(to);
    if (s < 0 || g < 0) return [];
    if (s === g) return [this.nodePos(g)];
    const n = this.count;
    if (!this._gScore || this._gScore.length !== n) {
      this._gScore = new Float32Array(n); this._came = new Int32Array(n); this._cameKind = new Uint8Array(n);
      this._closed = new Uint8Array(n); this._open = new Uint8Array(n);
    }
    const gScore = this._gScore, came = this._came, cameKind = this._cameKind, closed = this._closed, openF = this._open;
    gScore.fill(Infinity); closed.fill(0); openF.fill(0); came.fill(-1);
    const px = this.px, py = this.py, pz = this.pz;
    const gxp = px[g], gyp = py[g], gzp = pz[g];
    const h = (i) => { const dx = px[i] - gxp, dy = py[i] - gyp, dz = pz[i] - gzp; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
    const heap = new Heap();
    gScore[s] = 0; heap.push(s, h(s)); openF[s] = 1;
    let found = false, expanded = 0;
    while (heap.size) {
      const cur = heap.pop();
      if (closed[cur]) continue;
      if (cur === g) { found = true; break; }
      closed[cur] = 1;
      if (++expanded > 60000) break;
      const o0 = this.offsets[cur], o1 = this.offsets[cur + 1];
      const gc = gScore[cur];
      for (let k = o0; k < o1; k++) {
        const nb = this.adj[k];
        if (closed[nb]) continue;
        const kind = this.kind[k];
        if (kind === 2 && !allowLadders) continue;
        const t = gc + this.cost[k];
        if (t < gScore[nb]) {
          gScore[nb] = t; came[nb] = cur; cameKind[nb] = kind;
          heap.push(nb, t + h(nb)); openF[nb] = 1;
        }
      }
    }
    if (!found) return [];
    const ids = [];
    for (let c = g; c >= 0; c = came[c]) { ids.push(c); if (c === s) break; }
    ids.reverse();
    return this._smooth(ids, cameKind);
  }

  /** Keep link ends, and string pull between them on the same layer. */
  _smooth(ids, cameKind) {
    const out = [];
    const pushNode = (id, link) => { const v = this.nodePos(id); if (link) v.link = link; out.push(v); };
    let i = 0;
    pushNode(ids[0], null);
    while (i < ids.length - 1) {
      // a link edge: ids[j] -> ids[j+1] with cameKind[ids[j+1]] != 0
      const nextKind = cameKind[ids[i + 1]];
      if (nextKind !== 0) { pushNode(ids[i + 1], LINK_KIND[nextKind]); i++; continue; }
      // farthest j reachable in a straight line on the same layer without crossing a link edge
      let j = i + 1;
      let far = j;
      while (j < ids.length - 1 && cameKind[ids[j + 1]] === 0) {
        j++;
        if (this._clearLine(ids[i], ids[j])) far = j; else if (j - far > 6) break;
      }
      if (far === i + 1 && j > i + 1 && !this._clearLine(ids[i], ids[i + 1])) far = i + 1;
      pushNode(ids[far], null);
      i = far;
    }
    return out;
  }

  _clearLine(a, b) {
    if (this.layer[a] !== this.layer[b]) return false;
    const ax = this.px[a], az = this.pz[a], bx = this.px[b], bz = this.pz[b];
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(d / 0.4));
    const lay = this.layer[a];
    let lastY = this.py[a];
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const id = this._cellAt(ax + (bx - ax) * t, az + (bz - az) * t, lay);
      if (id < 0) return false;
      if (Math.abs(this.py[id] - lastY) > MAX_STEP * 0.6) return false;
      lastY = this.py[id];
    }
    return true;
  }

  _cellAt(x, z, lay) {
    if (lay === 0) {
      const gx = Math.round((x - this.minX) / this.cell), gz = Math.round((z - this.minZ) / this.cell);
      if (gx < 0 || gz < 0 || gx >= this.gridW || gz >= this.gridH) return -1;
      return this.gridId[gz * this.gridW + gx];
    }
    const isl = this.islands[lay - 1];
    const gx = Math.round((x - isl.x0) / isl.cell), gz = Math.round((z - isl.z0) / isl.cell);
    if (gx < 0 || gz < 0 || gx >= isl.w || gz >= isl.h) return -1;
    return isl.ids[gz * isl.w + gx];
  }

  /** Straight walk possible between two world points on one layer (no path needed). */
  straightWalkable(a, b) {
    const ia = this.nearest(a), ib = this.nearest(b);
    if (ia < 0 || ib < 0) return false;
    return this._clearLine(ia, ib);
  }

  randomPointNear(pos, radius = 8) {
    const c = this.nearest(pos);
    if (c < 0) return pos.clone();
    const lay = this.layer[c];
    let best = null, bestD = -1;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = radius * Math.sqrt(Math.random());
      const x = this.px[c] + Math.cos(a) * r, z = this.pz[c] + Math.sin(a) * r;
      const id = this._cellAt(x, z, lay);
      if (id < 0) continue;
      const d = Math.hypot(this.px[id] - pos.x, this.pz[id] - pos.z);
      if (d > bestD) { bestD = d; best = id; if (d > radius * 0.5) break; }
    }
    return best === null ? this.nodePos(c) : this.nodePos(best);
  }

  /** Cover within radius whose normal faces the threat. Prefers points the threat cannot see. */
  coverNear(pos, threatPos, radius = 18, opts = {}) {
    let best = null, bestScore = Infinity;
    const avoid = opts.avoid || null;          // points already taken by squad mates
    const eyeT = this._w.set(threatPos.x, num(threatPos.y, this.groundY(threatPos.x, threatPos.z)) + 1.6, threatPos.z);
    const r2 = radius * radius;
    for (const cp of this.coverPoints) {
      const dx = cp.x - pos.x, dz = cp.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      if (Math.abs(cp.y - pos.y) > 3 && Math.abs(cp.y - num(pos.y, cp.y)) > 3) continue;
      let tx = threatPos.x - cp.x, tz = threatPos.z - cp.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const facing = cp.nx * tx + cp.nz * tz;
      if (facing < 0.35) continue;
      if (tl < 3.5) continue;                        // cover on top of the threat is no cover
      let score = Math.sqrt(d2) + (1 - facing) * 6;
      if (avoid) { let taken = false; for (const a of avoid) { if (Math.hypot(a.x - cp.x, a.z - cp.z) < 1.5) { taken = true; break; } } if (taken) score += 10; }
      if (this.world && typeof this.world.lineOfSight === 'function') {
        const eyeH = cp.height === 'low' ? 1.05 : 1.6;
        const eye = this._v.set(cp.x, cp.y + eyeH, cp.z);
        if (this.world.lineOfSight(eye, eyeT)) score += 8;
      }
      if (score < bestScore) { bestScore = score; best = cp; }
    }
    if (!best) return null;
    return { point: new THREE.Vector3(best.x, best.y, best.z), normal: new THREE.Vector3(best.nx, 0, best.nz), height: best.height };
  }

  /** Waypoints for a flank through the wadi (sideSign <= 0) or the trench (sideSign > 0). */
  flankPoints(from, to, sideSign = 1) {
    const path = sideSign > 0 ? TRENCH_PATH : WADI_PATH;
    const entries = sideSign > 0 ? TRENCH_ENTRIES : WADI_ENTRIES;
    const nearestEntry = (p) => {
      let best = 0, bd = Infinity;
      entries.forEach((e, i) => { const d = Math.hypot(e[0] - p.x, e[1] - p.z); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const ei = nearestEntry(from), xi = nearestEntry(to);
    const idxOnPath = (e) => {
      let best = 0, bd = Infinity;
      path.forEach((p, i) => { const d = Math.hypot(p[0] - e[0], p[1] - e[1]); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const out = [];
    const push = (x, z) => out.push(new THREE.Vector3(x, this.groundY(x, z), z));
    const e = entries[ei], x = entries[xi];
    push(e[0], e[1]);
    if (ei !== xi) {
      const a = idxOnPath(e), b = idxOnPath(x);
      const step = a <= b ? 1 : -1;
      for (let i = a; i !== b + step; i += step) {
        const p = path[i];
        // keep channel points inside the boundary
        const cx = Math.min(this.boundary.maxX - 1, Math.max(this.boundary.minX + 1, p[0]));
        const cz = Math.min(this.boundary.maxZ - 1, Math.max(this.boundary.minZ + 1, p[1]));
        push(cx, cz);
      }
      push(x[0], x[1]);
    }
    push(to.x, to.z);
    return out;
  }

  // ------------------------------------------------------------------ debug
  debugMesh(THREE_) {
    const T = THREE_ || THREE;
    const group = new T.Group();
    group.name = 'navDebug';
    const geo = new T.PlaneGeometry(0.7, 0.7);
    geo.rotateX(-Math.PI / 2);
    const mat = new T.MeshBasicMaterial({ vertexColors: false, transparent: true, opacity: 0.55 });
    const inst = new T.InstancedMesh(geo, mat, this.count);
    const m = new T.Matrix4(), col = new T.Color();
    const palette = [0x4fa3ff, 0xffb347, 0x9bff7a, 0xff6ec7, 0xfff45c, 0x7ae7ff];
    for (let i = 0; i < this.count; i++) {
      m.makeTranslation(this.px[i], this.py[i] + 0.08, this.pz[i]);
      const s = this.layer[i] === 0 ? 1 : 0.55;
      m.elements[0] = s; m.elements[10] = s;
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, col.setHex(palette[this.layer[i] % palette.length]));
    }
    group.add(inst);
    const pts = [];
    for (const L of this.links) { pts.push(L.from.x, L.from.y + 0.2, L.from.z, L.to.x, L.to.y + 0.2, L.to.z); }
    if (pts.length) {
      const lg = new T.BufferGeometry();
      lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      group.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xff2020 })));
    }
    const cpts = [];
    for (const c of this.coverPoints) { cpts.push(c.x, c.y + 0.1, c.z, c.x + c.nx * 0.6, c.y + 0.1 + (c.height === 'low' ? 0.5 : 1.2), c.z + c.nz * 0.6); }
    if (cpts.length) {
      const cg = new T.BufferGeometry();
      cg.setAttribute('position', new T.Float32BufferAttribute(cpts, 3));
      group.add(new T.LineSegments(cg, new T.LineBasicMaterial({ color: 0x20ff60 })));
    }
    return group;
  }
}

export { WADI_PATH, TRENCH_PATH };
