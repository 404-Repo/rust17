// rock_outcrop_large r4 detail pass 2. Same six lobe plan, overhang, talus and tufts as pass 1, rebuilt
// on a real surface hit test: every block is a 4 x 2 x 4 jittered box with knocked off top corners,
// sagged top edge mid vertices and kinked vertical arrises; cracks, iron stains and bedding bands are
// flush dark planes seated on the triangle they cross (no side faces, so nothing can stand proud as a
// pale stick); dust caps and ledge sand pockets are conforming mounds whose vertices sit on the hit
// surface with the rim sunk and the radius clamped inside the top polygon; the sand fillet is an
// analytic mound with a tangent toe at y = 0 and nothing is sunk below the ground, rubble and tufts
// settle onto the mound height instead, so the asset is never lifted and the fillet never floats.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, concS: 0x857c6c, rust: 0x6b4426, foliage: 0x8a7a4e };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false, flat = true) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const hsh = (x, y, z, k) => { const t = Math.sin(Math.round(x * 1e3) * 0.1271 + Math.round(y * 1e3) * 0.3117 + Math.round(z * 1e3) * 0.0747 + k * 19.3) * 43758.5453; return t - Math.floor(t); };
  const V3 = THREE.Vector3;

  // ---- jittered block: the hash is keyed on the vertex position so the duplicated vertices of BoxGeometry stay welded
  const JIT = (x, y, z, w, h, d, jit, seed, chip) => {
    const ex = Math.abs(x) > w / 2 - 1e-4, ez = Math.abs(z) > d / 2 - 1e-4, top = y > h / 2 - 1e-4, bot = y < -h / 2 + 1e-4, mid = !top && !bot;
    let jx = (hsh(x, y, z, seed) - 0.5) * jit * w, jz = (hsh(x, y, z, seed + 7) - 0.5) * jit * d;
    let jy = bot ? 0 : (hsh(x, y, z, seed + 13) - 0.5) * jit * h * 0.6;
    if (bot) { if (ex) jx -= Math.sign(x) * chip * w * 0.3 * hsh(x, y, z, seed + 24); if (ez) jz -= Math.sign(z) * chip * d * 0.3 * hsh(x, y, z, seed + 25); }
    if (mid) { if (ex) jx -= Math.sign(x) * chip * w * 0.5 * hsh(x, y, z, seed + 27); if (ez) jz -= Math.sign(z) * chip * d * 0.5 * hsh(x, y, z, seed + 28); }   // kinked vertical arris
    if (top && (ex || ez) && !(ex && ez)) {   // top edge mid vertices sagged and pulled in: the arris is chipped, not a line
      jy -= chip * h * (0.2 + 0.9 * hsh(x, y, z, seed + 26));
      if (ex) jx -= Math.sign(x) * chip * w * 0.45 * hsh(x, y, z, seed + 29); if (ez) jz -= Math.sign(z) * chip * d * 0.45 * hsh(x, y, z, seed + 30);
    }
    if (top && ex && ez) {   // top corners knocked off
      jx -= Math.sign(x) * chip * w * (0.4 + 0.6 * hsh(x, y, z, seed + 21));
      jz -= Math.sign(z) * chip * d * (0.4 + 0.6 * hsh(x, y, z, seed + 22));
      jy -= chip * h * (0.5 + 1.0 * hsh(x, y, z, seed + 23));
    }
    return [jx, jy, jz];
  };
  const jbox = (w, h, d, jit, seed, chip, sx = 4, sy = 2) => {
    const geo = new THREE.BoxGeometry(w, h, d, sx, sy, sx);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const [jx, jy, jz] = JIT(x, y, z, w, h, d, jit, seed, chip);
      p.setXYZ(i, x + jx, y + jy, z + jz);
    }
    geo.computeVertexNormals();
    return geo;
  };
  // ---- the real triangles of a block, and a hit test on one face of it
  const trisOf = (geo) => {
    const p = geo.attributes.position, ix = geo.index.array, out = [];
    const A = new V3(), B = new V3(), C = new V3(), N = new V3(), e1 = new V3(), e2 = new V3();
    for (let i = 0; i < ix.length; i += 3) {
      A.fromBufferAttribute(p, ix[i]); B.fromBufferAttribute(p, ix[i + 1]); C.fromBufferAttribute(p, ix[i + 2]);
      N.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)).normalize();
      out.push({ a: A.toArray(), b: B.toArray(), c: C.toArray(), n: N.toArray() });
    }
    return out;
  };
  const AX = { x: [2, 1, 0], y: [0, 2, 1], z: [0, 1, 2] };   // face axis -> [u index, v index, axis index]
  const cross2 = (ou, ov, pu, pv, qu, qv) => (pu - ou) * (qv - ov) - (pv - ov) * (qu - ou);
  const hit = (tris, axis, sign, u, v) => {
    const [iu, iv, ia] = AX[axis];
    for (const t of tris) {
      if (t.n[ia] * sign < 0.55) continue;
      if (axis !== 'y' && Math.abs(t.n[1]) > 0.45) continue;   // side faces only: the chamfer under a chipped top edge faces up and anything seated there reads as a lit shelf
      const D = cross2(t.a[iu], t.a[iv], t.b[iu], t.b[iv], t.c[iu], t.c[iv]);
      if (Math.abs(D) < 1e-9) continue;
      const la = cross2(u, v, t.b[iu], t.b[iv], t.c[iu], t.c[iv]) / D, lb = cross2(t.a[iu], t.a[iv], u, v, t.c[iu], t.c[iv]) / D, lc = 1 - la - lb;
      if (la < -1e-4 || lb < -1e-4 || lc < -1e-4) continue;
      const p = new V3(); p.setComponent(iu, u); p.setComponent(iv, v); p.setComponent(ia, la * t.a[ia] + lb * t.b[ia] + lc * t.c[ia]);
      return { p, n: new V3(t.n[0], t.n[1], t.n[2]) };
    }
    return null;
  };
  const dirV = (axis, du, dv) => axis === 'z' ? new V3(du, dv, 0) : axis === 'x' ? new V3(0, dv, du) : new V3(du, 0, dv);
  // seat a flat geometry (drawn in local xy, normal +z, +y along the run direction) on the face at (u, v), off metres proud
  const seat = (parent, tris, axis, sign, u, v, geo, m, du, dv, off) => {
    const hh = hit(tris, axis, sign, u, v); if (!hh) return null;
    const N = hh.n, D = dirV(axis, du, dv);
    const Y = D.sub(N.clone().multiplyScalar(D.dot(N))).normalize();
    const X = new V3().crossVectors(Y, N);
    const o = new THREE.Mesh(geo, m);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, N));
    o.position.copy(hh.p).addScaledVector(N, off);
    parent.add(o); return o;
  };
  const trap = (w0, w1, L) => { const sh = new THREE.Shape(); sh.moveTo(-w0 / 2, -L / 2); sh.lineTo(w0 / 2, -L / 2); sh.lineTo(w1 / 2, L / 2); sh.lineTo(-w1 / 2, L / 2); sh.closePath(); return new THREE.ShapeGeometry(sh); };
  // a wandering run of short flush strips down a face: cracks (dark, thin) and iron stains (rust, wide to narrow)
  const run = (parent, tris, axis, sign, u0, v0, len, w0, w1, m, a0, wander, off, segLen = 0.09, vMin = -1e9) => {
    const n = Math.max(3, Math.round(len / segLen)), seg = len / n;
    let u = u0, v = v0, a = a0;
    for (let k = 0; k < n; k++) {
      a = Math.max(-1.0, Math.min(1.0, a + rr(-wander, wander)));
      const du = Math.sin(a), dv = -Math.cos(a), t0 = k / n, t1 = (k + 1) / n;
      if (v + dv * seg < vMin) break;   // never into the sand at the foot
      const geo = trap(w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1, seg * 1.04);
      // both ends of the strip must be on the face, or the strip would hang off a chipped edge into the air
      if (!hit(tris, axis, sign, u, v) || !hit(tris, axis, sign, u + du * seg, v + dv * seg)) break;
      if (!seat(parent, tris, axis, sign, u + du * seg / 2, v + dv * seg / 2, geo, m, du, dv, off)) break;
      u += du * seg; v += dv * seg;
    }
    return [u, v, a];
  };
  const crack = (parent, tris, axis, sign, u, v, len, branch = true, vMin = -1e9) => {
    const end = run(parent, tris, axis, sign, u, v, len, 0.02, 0.006, mCrack, rr(-0.35, 0.35), 0.4, 0.004, 0.09, vMin);
    if (branch && rnd() < 0.6) run(parent, tris, axis, sign, u + (end[0] - u) * 0.5, v + (end[1] - v) * 0.5, len * 0.4, 0.012, 0.004, mCrack, end[2] + (rnd() < 0.5 ? 0.9 : -0.9), 0.3, 0.004, 0.09, vMin);
  };
  const stain = (parent, tris, axis, sign, u, v, len, vMin = -1e9) => run(parent, tris, axis, sign, u, v, len, 0.07, 0.015, mStain, rr(-0.08, 0.08), 0.08, 0.003, 0.11, vMin);
  // bedding: a dark flush band running under the top edge of a face
  const band = (parent, tris, axis, sign, uMin, uMax, v, hgt) => {
    const n = Math.max(3, Math.round((uMax - uMin) / 0.16)), seg = (uMax - uMin) / n;
    for (let k = 0; k < n; k++) {
      const u = uMin + seg * (k + 0.5), vv = v + rr(-0.004, 0.004);
      if (!hit(tris, axis, sign, u - seg * 0.55, vv) || !hit(tris, axis, sign, u + seg * 0.55, vv)) continue;   // both ends on the face
      seat(parent, tris, axis, sign, u, vv, new THREE.PlaneGeometry(hgt * rr(0.8, 1.2), seg * 1.12), mBed, 1, 0, 0.0035);
    }
  };
  // a conforming mound on the top of a block: vertices on the hit surface plus a bump, rim sunk, radius clamped inside the top polygon
  const capOn = (parent, tris, cu, cv, R, h, sx, sz, tilt = null, sink = 0.02, na = 10, nr = 3) => {
    const c0 = hit(tris, 'y', 1, cu, cv); if (!c0) return null;
    const rad = [];
    for (let i = 0; i < na; i++) {
      const th = i / na * 2 * PI, cs = Math.cos(th), sn = Math.sin(th);
      const Rt = R * (0.8 + 0.4 * hsh(i, cu, cv, 3)) / Math.sqrt((cs / sx) ** 2 + (sn / sz) ** 2);
      let ok = 0;
      for (let f = 1; f >= 0.2; f -= 0.08) { const r = Rt * f; if (hit(tris, 'y', 1, cu + cs * r, cv + sn * r)) { ok = r; break; } }
      rad.push(ok * 0.92);
    }
    const pos = [], idx = [];
    pos.push(cu, c0.p.y + h, cv);
    for (let j = 1; j <= nr; j++) {
      const t = j / nr;
      for (let i = 0; i < na; i++) {
        const th = i / na * 2 * PI, cs = Math.cos(th), sn = Math.sin(th), r = rad[i] * t;
        const hh = hit(tris, 'y', 1, cu + cs * r, cv + sn * r);
        const base = hh ? hh.p.y : c0.p.y;
        const k = tilt ? 1 + 0.45 * (tilt[0] * cs + tilt[1] * sn) : 1;
        pos.push(cu + cs * r, j === nr ? base - sink : base + h * k * Math.pow(1 - t * t, 1.5), cv + sn * r);
      }
    }
    for (let i = 0; i < na; i++) idx.push(0, 1 + (i + 1) % na, 1 + i);
    for (let j = 1; j < nr; j++) for (let i = 0; i < na; i++) {
      const a = 1 + (j - 1) * na + i, b = 1 + (j - 1) * na + (i + 1) % na, c = a + na, d = b + na;
      idx.push(a, d, c, a, b, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return add(geo, mDust, 0, 0, 0, parent);
  };
  // ---- the sand fillet: an analytic mound with a tangent toe at y = 0, longer to the south, wobbled outline
  const FIL = { cx: 0.1, cz: 0.15, Rx: 4.4, RzP: 2.7, RzN: 2.25, h: 0.3 };
  const F = (x, z) => {
    const dx = x - FIL.cx, dz = z - FIL.cz, th = Math.atan2(dz, dx);
    const wob = 1 + 0.05 * Math.sin(3 * th + 0.7) + 0.035 * Math.sin(5 * th + 2.1);
    const r = Math.sqrt((dx / (FIL.Rx * wob)) ** 2 + (dz / ((dz > 0 ? FIL.RzP : FIL.RzN) * wob)) ** 2);
    return r >= 1 ? 0 : FIL.h * Math.pow(1 - r * r * r * r, 1.5);
  };
  const groundDisc = (cx, cz, radX, radZ, fn, rings, na, m) => {
    const pos = [], idx = [];
    pos.push(cx, fn(cx, cz, 0, 0), cz);
    for (let j = 0; j < rings.length; j++) for (let i = 0; i < na; i++) {
      const th = i / na * 2 * PI, t = rings[j], x = cx + Math.cos(th) * radX(th) * t, z = cz + Math.sin(th) * radZ(th) * t;
      pos.push(x, fn(x, z, t, th), z);
    }
    for (let i = 0; i < na; i++) idx.push(0, 1 + (i + 1) % na, 1 + i);
    for (let j = 1; j < rings.length; j++) for (let i = 0; i < na; i++) {
      const a = 1 + (j - 1) * na + i, b = 1 + (j - 1) * na + (i + 1) % na, c = a + na, d = b + na;
      idx.push(a, d, c, a, b, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return add(geo, m);
  };
  // a small mound lying on the fillet: rim exactly on the fillet surface
  const pocket = (cx, cz, R, h, sx = 1, sz = 1) => groundDisc(cx, cz, (th) => R * sx * (0.85 + 0.3 * hsh(th, cx, cz, 5)), (th) => R * sz * (0.85 + 0.3 * hsh(th, cx, cz, 5)), (x, z, t) => Math.max(0, F(x, z)) + (t >= 1 ? 0 : h * Math.pow(1 - t * t, 1.5)), [0.45, 0.8, 1.0], 10, mSand);
  // lift a placed mesh so its lowest vertex sits at yBottom (never below the ground)
  const settle = (o, yBottom) => {
    o.updateMatrixWorld(true);
    const p = o.geometry.attributes.position, v = new V3(); let mn = Infinity;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y < mn) mn = v.y; }
    o.position.y += Math.max(0.003, yBottom) - mn;
  };

  // the foot of a course follows the top of the course below: a bottom vertex that would hang past the chipped
  // top is pulled toward the centre until it is over rock, and dropped 3 cm under that surface so no gap opens
  const conform = (geo, h, cx, cy, cz, ry, prev) => {
    const p = geo.attributes.position, wp = new V3(), cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); if (y > -h / 2 + 1e-4) continue;
      let x = p.getX(i), z = p.getZ(i), hh = null;
      for (let k = 0; k < 16; k++) {
        wp.set(cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs);
        prev.blk.worldToLocal(wp);
        hh = hit(prev.tris, 'y', 1, wp.x, wp.z);
        if (hh) break;
        x *= 0.93; z *= 0.93;
      }
      if (!hh) continue;
      p.setXYZ(i, x, Math.min(y, prev.blk.position.y + hh.p.y - cy - 0.03), z);
    }
    geo.computeVertexNormals();
  };

  const mRockN = mat(P.rock, 'stone');
  const mRockS = mat(shade(P.rock, 1.05), 'stone');
  const mRockW = mat(shade(P.rock, 0.96), 'stone');
  const mBed = mat(shade(P.concS, 0.72), 'stone', 0.95);          // bedding band, reads as the shadow of a recess
  const mCrack = mat(shade(P.concS, 0.58), 'stone', 0.95);        // crack, well below the rock in value
  const mStain = mat(mix(P.rust, P.rock, 0.25), 'stone', 0.95);   // iron stain, tapered
  const mShadow = mat(shade(P.concS, 0.7), 'stone', 0.95);
  const mDust = mat(P.sand, 'ground', 0.95, 0, false, false);
  const mSand = mat(P.sand, 'ground', 0.95, 0, false, false);
  const mGrass = mat(0x9a8a5e, 'foliage', 0.95, 0, true);
  const mGrassD = mat(P.foliage, 'foliage', 0.95, 0, true);
  const tuft = (x, z, n, lean) => {
    const y0 = Math.max(F(x, z), 0.012);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rr(-0.3, 0.3), L = rr(0.16, 0.3);
      const b = add(new THREE.ConeGeometry(0.008, L, 3, 1, true), i % 3 ? mGrass : mGrassD, x + Math.cos(a) * 0.03, y0 + L * 0.5 - 0.005, z + Math.sin(a) * 0.03);
      b.rotation.z = -Math.cos(a) * lean * rr(0.6, 1.3); b.rotation.x = Math.sin(a) * lean * rr(0.6, 1.3);
    }
  };

  const lobes = [
    { x: -2.1, z: 0.5, w: 2.9, d: 2.35, n: 5, seed: 1 },
    { x: 0.2, z: -0.1, w: 3.1, d: 2.5, n: 6, seed: 2 },
    { x: 2.2, z: 0.4, w: 2.7, d: 2.15, n: 5, seed: 3 },
    { x: -0.9, z: -1.4, w: 2.6, d: 1.6, n: 4, seed: 4 },
    { x: 1.5, z: -1.5, w: 2.3, d: 1.45, n: 3, seed: 5 },
    { x: 0.3, z: -1.9, w: 3.0, d: 1.1, n: 2, seed: 6 },
  ];
  const COURSE = 0.54, JT = 0.09, OVL = 0.06;
  const tmp = new V3();
  for (const L of lobes) {
    let y = 0, prev = null;
    for (let c = 0; c < L.n; c++) {
      const h = COURSE * rr(0.78, 1.24);
      const inset = c === 0 ? 1 : rr(0.84, 1.03);
      let w = L.w * inset, d = L.d * inset, zoff = 0;
      if (L.seed === 3 && c === L.n - 2) { d += 0.5; zoff = 0.25; }          // the south overhang
      if (L.seed === 1 && c === L.n - 2) { w += 0.4; }                        // a smaller west overhang
      const m = (L.z > 0 || c % 2) ? mRockS : (c % 3 === 0 ? mRockW : mRockN);
      const seed = L.seed * 10 + c;
      const yb = c === 0 ? 0 : y - OVL;                                       // courses overlap: no gap can open
      const chip = 0.11 + 0.06 * (c / L.n);
      const geo = jbox(w, h, d, JT, seed, chip);
      const cx = L.x + rr(-0.08, 0.08), cz = L.z + zoff + rr(-0.08, 0.08), ry = rr(-0.07, 0.07);
      if (prev) conform(geo, h, cx, yb + h / 2, cz, ry, prev);
      const tris = trisOf(geo);
      const blk = add(geo, m, cx, yb + h / 2, cz);
      blk.rotation.y = ry;
      blk.updateMatrixWorld(true);
      // bedding: a dark band round the foot of every course above the first, where it rises out of the course below
      if (c > 0) {
        const bv = -h / 2 + OVL + 0.035;
        band(blk, tris, 'z', 1, -w / 2 + 0.1, w / 2 - 0.1, bv + rr(0, 0.03), 0.03);
        band(blk, tris, 'z', -1, -w / 2 + 0.1, w / 2 - 0.1, bv + rr(0, 0.03), 0.03);
        band(blk, tris, 'x', 1, -d / 2 + 0.1, d / 2 - 0.1, bv + rr(0, 0.03), 0.03);
        band(blk, tris, 'x', -1, -d / 2 + 0.1, d / 2 - 0.1, bv + rr(0, 0.03), 0.03);
      }
      // cracks and stains on the faces the player sees (south, east, and the north of the back lobes); none into the sand
      const vMin = c === 0 ? -h / 2 + 0.36 : -h / 2 + OVL + 0.02;
      crack(blk, tris, 'z', 1, rr(-w * 0.35, w * 0.35), h * rr(0.1, 0.3), h * rr(0.45, 0.7), true, vMin);
      if (c % 2 === 0 || w > 2.8) crack(blk, tris, 'z', 1, rr(-w * 0.4, w * 0.4), h * rr(0.0, 0.3), h * rr(0.3, 0.5), false, vMin);
      crack(blk, tris, 'x', 1, rr(-d * 0.35, d * 0.35), h * rr(0.1, 0.3), h * rr(0.4, 0.65), true, vMin);
      if (L.z < 0 || c % 2) crack(blk, tris, 'z', -1, rr(-w * 0.35, w * 0.35), h * rr(0.1, 0.3), h * rr(0.35, 0.6), true, vMin);
      if (L.x < 0) crack(blk, tris, 'x', -1, rr(-d * 0.35, d * 0.35), h * rr(0.1, 0.3), h * rr(0.35, 0.6), true, vMin);
      if (c === 1 || c === 3) stain(blk, tris, 'z', 1, rr(-w * 0.35, w * 0.35), h * 0.3, h * rr(0.5, 0.8), vMin);
      if (c === 2) stain(blk, tris, 'x', 1, rr(-d * 0.3, d * 0.3), h * 0.3, h * rr(0.5, 0.8), vMin);
      if (L.seed === 3 && c === L.n - 2) add(new THREE.BoxGeometry(w * 0.72, 0.012, 0.34), mShadow, 0, -h / 2 + 0.004, d / 2 - 0.33, blk);   // overhang underside shadow, well inside the chipped outline
      // sand pockets on the ledges of the course below, piled against this course's foot
      if (prev) {
        const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [ex, ez] of sides) {
          const upEdge = ex ? cx + ex * w / 2 : cz + ez * d / 2;
          const loEdge = ex ? prev.cx + ex * prev.w / 2 : prev.cz + ez * prev.d / 2;
          const ledge = (upEdge - loEdge) * (ex + ez) * -1;
          if (ledge < 0.14 || (ex + ez < 0 && rnd() < 0.4)) continue;
          const nP = ex ? 1 + (prev.d > 2 ? 1 : 0) : 1 + (prev.w > 2.6 ? 1 : 0);
          for (let q = 0; q < nP; q++) {
            const along = ex ? cz + rr(-0.3, 0.3) * d : cx + rr(-0.3, 0.3) * w;
            tmp.set(ex ? upEdge - ex * 0.03 : along, 0, ex ? along : upEdge - ez * 0.03);
            prev.blk.worldToLocal(tmp);
            const R = Math.min(ledge, 0.55) + 0.06;
            capOn(prev.blk, prev.tris, tmp.x, tmp.z, R, Math.min(0.05 + 0.35 * ledge, 0.16), ex ? 1 : 1.7, ex ? 1.7 : 1, [-ex, -ez], 0.025);
          }
        }
      }
      prev = { blk, tris, w, d, cx, cz };
      y = yb + h;
      if (c === L.n - 1) {   // dust settled on the top as two conforming drifts
        const el = w >= d ? [w / d, 1] : [1, d / w];
        capOn(blk, tris, rr(-0.1, 0.1) * w, rr(-0.1, 0.1) * d, 0.45 * Math.min(w, d), 0.014, el[0], el[1]);
        capOn(blk, tris, rr(0.1, 0.25) * w, rr(-0.25, -0.1) * d, 0.22 * Math.min(w, d), 0.01, 1.3, 1);
      }
    }
  }
  // the fillet mound
  groundDisc(FIL.cx, FIL.cz, (th) => FIL.Rx * (1 + 0.05 * Math.sin(3 * th + 0.7) + 0.035 * Math.sin(5 * th + 2.1)), (th) => (Math.sin(th) > 0 ? FIL.RzP : FIL.RzN) * (1 + 0.05 * Math.sin(3 * th + 0.7) + 0.035 * Math.sin(5 * th + 2.1)), (x, z, t) => (t >= 1 ? 0 : F(x, z)), [0.3, 0.55, 0.72, 0.84, 0.92, 0.97, 1.0], 26, mSand);
  // talus: rubble settled onto the mound along the south and east foot, plus a few on the low back lobes
  const rubble = [[-3.3, 1.8, 0.75], [-2.55, 2.3, 0.32], [-1.75, 1.95, 0.55], [-1.05, 2.45, 0.24], [-0.3, 2.0, 0.68], [0.55, 2.4, 0.3], [1.25, 1.9, 0.42], [2.05, 2.25, 0.36], [2.7, 1.75, 0.26], [3.35, 1.4, 0.6], [3.7, 0.5, 0.28], [3.55, -0.35, 0.38], [3.5, -1.15, 0.24], [-3.65, 0.9, 0.34], [-3.6, -0.15, 0.26], [0.3, -2.0, 0.3], [1.5, -1.65, 0.22], [2.85, -1.7, 0.42], [-0.9, 2.0, 0.24], [1.75, 2.15, 0.22]];
  for (let i = 0; i < rubble.length; i++) {
    const [x, z, a] = rubble[i];
    const hh = a * rr(0.55, 0.8);
    const geo = jbox(a, hh, a * rr(0.7, 1.0), 0.16, 100 + i, a < 0.3 ? 0.09 : 0.15, 3, 2);
    const b = add(geo, i % 3 === 0 ? mRockS : (i % 3 === 1 ? mRockN : mRockW), x, hh / 2, z);
    b.rotation.y = rr(-1.2, 1.2); b.rotation.z = rr(-0.3, 0.3); b.rotation.x = rr(-0.25, 0.25);
    settle(b, F(x, z) - hh * 0.35);
    if (a > 0.45) crack(b, trisOf(geo), 'z', 1, rr(-a * 0.2, a * 0.2), hh * 0.2, hh * 0.5, false);
    if (a > 0.5) pocket(x + rr(-0.1, 0.1) - 0.15, z + a * 0.45, a * 0.5, 0.03, 1.2, 0.8);   // sand banked against the stone
  }
  // dead grass in the foot cracks and one on the low back ledge
  tuft(-2.2, 2.25, 9, 0.5); tuft(0.9, 2.3, 8, 0.45); tuft(3.7, 0.15, 8, 0.5); tuft(-3.5, 1.5, 7, 0.4); tuft(2.4, 2.25, 6, 0.5); tuft(-1.3, -2.4, 7, 0.4);
  // ---- DERRICK material pass (round 2): weathering as a per vertex colour attribute. No extra draw
  // calls, no extra triangles except long single segment boxes, which are re-cut along their length
  // so the mottle, the streaks and the rust to paint gradient have vertices to live on. Rules by
  // recipe name: metal gets rust at the foot and below fixings, streaks, dust on up faces, bleach on
  // the sun side; stone a stained bottom band; timber grey bleach on top; fabric a dirty foot;
  // foliage and ground a mottle. The attribute is a multiplier on the material colour, so every part
  // keeps the author's colour where nothing has happened to it. Unnamed materials (glass, rubber) and
  // emissive lenses are untouched. WEATHER_OPTS may be set before this block.
  (function weather(root, opt) {
    opt = Object.assign({ rustH: 0, mottle: 1, streak: 1, dust: 1, cut: 1.8, seed: 0, sand: 0 }, opt || {});
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3(), tb = new THREE.Box3();
    root.traverse((n) => { if (n.isMesh && n.geometry.attributes.position) { n.geometry.computeBoundingBox(); tb.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld); bb.union(tb); } });
    const y0 = bb.min.y, H = Math.max(0.3, bb.max.y - y0);
    const rustH = opt.rustH || Math.min(2.2, Math.max(0.4, H * 0.42));
    const S = opt.seed * 17.3;
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + S) * 43758.5453; return s - Math.floor(s); };
    const sm = (t) => t * t * (3 - 2 * t);
    const noise = (x, y, z) => {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      let v = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += hash(ix + a, iy + b, iz + c) * (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz);
      return v * 2 - 1;
    };
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    const RUST = new THREE.Color(0x4e2d19), RUST2 = new THREE.Color(0x6b4426), DUST = new THREE.Color(0xcdb88e), STAIN = new THREE.Color(0x5e5850), GREY = new THREE.Color(0xa89e88);
    const p = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
    const shared = new Set();
    root.traverse((o) => { if (o.isInstancedMesh || (o.isMesh && Array.isArray(o.material))) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => shared.add(m)); });
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      const m = o.material;
      if (!m || !m.isMeshStandardMaterial || !m.name || shared.has(m) || m.transparent || (m.emissive && m.emissive.getHex())) return;
      const kind = m.name;
      let geo = o.geometry;
      // long single segment boxes: re-cut along the long axis so the gradient has vertices
      const pr = geo.parameters;
      if (geo.type === 'BoxGeometry' && pr && pr.widthSegments === 1 && pr.heightSegments === 1 && pr.depthSegments === 1) {
        const L = Math.max(pr.width, pr.height, pr.depth), thin = Math.min(pr.width, pr.height, pr.depth);
        const mid = pr.width + pr.height + pr.depth - L - thin;
        if (L > opt.cut && thin >= 0.012 && mid >= 0.05 && kind === 'metal') {
          const n = Math.min(3, Math.ceil(L / 2.0));
          geo = new THREE.BoxGeometry(pr.width, pr.height, pr.depth, pr.width === L ? n : 1, pr.height === L ? n : 1, pr.depth === L ? n : 1);
        } else geo = geo.clone();
      } else geo = geo.clone();
      o.geometry = geo;
      const pos = geo.attributes.position;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const nor = geo.attributes.normal;
      nm.getNormalMatrix(o.matrixWorld);
      const mc = m.color, lum = 0.2126 * mc.r + 0.7152 * mc.g + 0.0722 * mc.b;
      const dark = lum < 0.06;                                      // gunmetal, rubber, scorched: no rust, no dust
      const hx = mc.getHex(), isRust = hx === 0x6b4426 || hx === 0x573620 || hx === 0x6f4732 || hx === 0x4e2d19;   // already a rust part
      const cnt = pos.count, col = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        nv.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        c.copy(mc);
        const n1 = noise(p.x * 2.6, p.y * 2.6, p.z * 2.6), n2 = noise(p.x * 9 + 5, p.y * 9, p.z * 9 + 2);
        let k = 1 + (0.11 * n1 + 0.05 * n2) * opt.mottle;
        const up = nv.y > 0.55, down = nv.y < -0.55;
        if (!up && !down) { if (nv.z > 0.4) k *= 1.06; else if (nv.z < -0.4) k *= 0.95; if (nv.x < -0.4) k *= 1.03; }
        if (down) k *= 0.92;
        if (kind === 'metal' && !dark && !isRust) {
          const foot = cl(1 - (p.y - y0) / rustH, 0, 1);
          const st = Math.max(0, noise(p.x * 13 + p.z * 9, p.y * 0.8, 7.7)) * opt.streak;    // vertical run marks
          let r = Math.pow(foot, 1.3) * (0.6 + 0.4 * cl(n1 + 0.5, 0, 1)) + st * 0.6 * (0.35 + 0.65 * foot) + Math.max(0, n2) * 0.18;
          if (down) r += 0.25;
          c.lerp(RUST, cl(r, 0, 0.9));
          if (up && opt.dust) c.lerp(DUST, (lum > 0.25 ? 0.14 : 0.26) + 0.1 * cl(n1, -1, 1));
          if (opt.sand) c.lerp(DUST, Math.pow(cl(1 - (p.y - y0) / opt.sand, 0, 1), 1.5) * (0.75 + 0.15 * n1));   // sand blown up the foot of a sheet
        } else if (kind === 'metal' && isRust) {
          k *= 1 + 0.12 * n2; c.lerp(RUST, cl(0.3 - (p.y - y0) / H, 0, 0.5));
        } else if (kind === 'stone' || kind === 'plaster') {
          const f = cl(1 - (p.y - y0) / 0.5, 0, 1);
          c.lerp(STAIN, f * f * 0.75 + Math.max(0, noise(p.x * 7, p.y * 1.3, p.z * 7)) * 0.15);
          if (up && opt.dust) c.lerp(DUST, 0.3);
        } else if (kind === 'timber') {
          k *= 1 + 0.08 * n2;
          if (up) c.lerp(GREY, 0.35); else if (!down) c.lerp(GREY, cl(0.18 + 0.2 * n1, 0, 0.4));
          c.lerp(STAIN, cl(1 - (p.y - y0) / 0.25, 0, 1) * 0.4);
        } else if (kind === 'fabric') {
          k *= 1 + 0.05 * n2;
          c.lerp(STAIN, cl(1 - (p.y - y0) / 0.3, 0, 1) * 0.45);
          if (up && opt.dust) c.lerp(DUST, 0.3);
        } else if (kind === 'foliage') {
          k *= 1 + 0.12 * n1;
        } else if (kind === 'ground') {
          k = 1 + 0.06 * n1 + 0.02 * n2;
        } else if (dark) {
          k = 1 + 0.05 * n2; if (up) k *= 1.08;
        }
        c.multiplyScalar(k);
        col[i * 3] = mc.r > 1e-4 ? cl(c.r / mc.r, 0, 6) : 1;
        col[i * 3 + 1] = mc.g > 1e-4 ? cl(c.g / mc.g, 0, 6) : 1;
        col[i * 3 + 2] = mc.b > 1e-4 ? cl(c.b / mc.b, 0, 6) : 1;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      m.vertexColors = true;
    });
  })(g, typeof WEATHER_OPTS !== 'undefined' ? WEATHER_OPTS : null);

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
