export default function (THREE) {
  // ---- shared helpers (DERRICK style lock palette, recipe material names) ----
  const g = new THREE.Group();
  const PI = Math.PI, DS = THREE.DoubleSide;
  const P = { sandSun: 0xcdb88e, sandPack: 0xa89372, rockPale: 0xc4b393, concB: 0xb8ae9b, concS: 0x857c6c,
    redox: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, blue: 0x2f4d66,
    red: 0x9c4a3c, timber: 0xa07a4f, olive: 0x4e5238, khaki: 0x7a6a4c, sandbag: 0xb0a07c, gun: 0x3a3d40,
    rubber: 0x1d1e20, yellow: 0xc9a227, lamp: 0xffd9a0 };
  // bleach (f > 0) lerps toward sand sunlit, stain (f < 0) toward a dark warm grey, never past the palette limits
  const tint = (hex, f) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color(f > 0 ? P.sandSun : 0x2a2a28), Math.min(1, Math.abs(f))); return c.getHex(); };
  const _mc = new Map();
  function M(hex, name, o) {
    o = o || {}; const key = hex + '|' + name + '|' + JSON.stringify(o);
    if (_mc.has(key)) return _mc.get(key);
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.82, metalness: 0.12 }, o));
    if (name) m.name = name; _mc.set(key, m); return m;
  }
  const SAND = M(P.sandSun, 'ground', { roughness: 0.95, metalness: 0 });
  const RUST = M(P.rust, 'metal', { roughness: 0.93, metalness: 0.05, side: DS });
  const STEEL = M(P.steel, 'metal', { roughness: 0.78, metalness: 0.22 });
  const GALV = M(P.galv, 'metal', { roughness: 0.7, metalness: 0.45 });
  const GUN = M(P.gun, 'metal', { roughness: 0.72, metalness: 0.4 });
  const RUBBER = new THREE.MeshStandardMaterial({ color: P.rubber, roughness: 0.9, metalness: 0 }); // unnamed on purpose
  const segs = (d) => d < 0.3 ? 10 : d <= 1 ? 14 : d <= 3 ? 20 : 28;
  function mesh(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (parent, w, h, d, mat, x, y, z, rx, ry, rz) => mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  function cyl(parent, r, h, mat, x, y, z, rx, ry, rz, o) {
    o = o || {};
    const geo = new THREE.CylinderGeometry(o.rt === undefined ? r : o.rt, r, h, o.seg || segs(r * 2), 1, !!o.open, o.t0 || 0, o.tl === undefined ? PI * 2 : o.tl);
    return mesh(parent, geo, mat, x, y, z, rx, ry, rz);
  }
  const disc = (parent, r, mat, x, y, z, rx, ry, rz) => mesh(parent, new THREE.CircleGeometry(r, segs(r * 2)), mat, x, y, z, rx, ry, rz);
  // rust drip below a fixing: a tapered plate 4 mm proud of the face. face: pz nz px nx. (x,y,z) is the top centre on the face.
  function streak(parent, face, x, y, z, len, w) {
    if (!(len > 0)) return null;
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.2, -len); s.lineTo(-w * 0.2, -len); s.closePath();
    const off = 0.004, ry = { pz: 0, nz: PI, px: PI / 2, nx: -PI / 2 }[face];
    if (face === 'pz') z += off; else if (face === 'nz') z -= off; else if (face === 'px') x += off; else x -= off;
    return mesh(parent, new THREE.ShapeGeometry(s), RUST, x, y, z, 0, ry, 0);
  }
  // sand drift against a face: concave wedge, length along the face, vertical face at local z=0 sloping out to +z.
  // (x,y,z) is the middle of the foot of the face at ground; ry: 0 for +z face, PI for -z, PI/2 for +x, -PI/2 for -x.
  function fillet(parent, len, out, h, x, y, z, ry) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(out * 0.42, h * 0.32); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2); geo.rotateY(-PI / 2);
    return mesh(parent, geo, SAND, x, y, z, 0, ry || 0, 0);
  }
  // dust cap on an up facing surface: thin sand slab inset from the edges, top at ytop + t
  function dust(parent, w, d, x, ytop, z, inset, t) { inset = inset === undefined ? 0.04 : inset; t = t || 0.01; return box(parent, w - 2 * inset, t, d - 2 * inset, SAND, x, ytop + t / 2, z); }
  // trapezoid corrugation profile points: [along, depth] pairs across width W at the given pitch
  function corrPts(W, pitch, depth, mod) {
    const ribs = Math.max(1, Math.round(W / pitch)), p = W / ribs, f = [0, 0.22, 0.5, 0.72], d = [0, 1, 1, 0], pts = [];
    for (let r = 0; r < ribs; r++) for (let k = 0; k < 4; k++) pts.push([r * p + f[k] * p, d[k] * depth]);
    pts.push([W, 0]);
    if (mod) for (const q of pts) q[1] += mod(q[0] - W / 2);
    return pts;
  }
  // corrugated sheet as a closed extruded profile: centred, spans x +-W/2, y +-H/2, ribs bulge toward +z, back face at z = -thick
  function corrExtrude(W, H, pitch, depth, thick, mod) {
    const pts = corrPts(W, pitch, depth, mod), s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1] - thick);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false });
    geo.translate(-W / 2, 0, -H / 2); geo.rotateX(PI / 2); geo.computeVertexNormals(); return geo;
  }
  // corrugated sheet as a displaced plane: centred in XY, ribs bulge toward +z. hs = height segments, mod(x, y) adds z.
  function corrPlane(W, H, pitch, depth, hs, mod) {
    const pts = corrPts(W, pitch, depth), n = pts.length - 1, geo = new THREE.PlaneGeometry(W, H, n, hs || 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = i % (n + 1), x = pts[k][0] - W / 2, y = pos.getY(i);
      pos.setX(i, x); pos.setZ(i, pts[k][1] + (mod ? mod(x, y) : 0));
    }
    geo.computeVertexNormals(); return geo;
  }
  // ---- end helpers ----

const CFG = { kind: 'red', livery: 0x9c4a3c, bleach: 0.28, plates: [{ on: 'door', w: 0.4, h: 0.3 }], rustHeavy: true };
  // ---- strategy c1: profiles. Every sheet is a closed trapezoid profile extruded; castings and rails are shapes with real holes. ----
  const L = 6.06, W = 2.44, H = 2.59, PITCH = 0.28, RIBD = 0.036, SHEET = 0.012;
  const liv = CFG.livery, bl = CFG.bleach;
  const paint = (f, extra) => M(tint(liv, f), 'metal', Object.assign({ roughness: 0.86, metalness: 0.08, side: DS }, extra || {}));
  const mSouth = paint(bl), mNorth = paint(bl * 0.35), mEnd = paint(bl * 0.6), mRoof = paint(bl * 0.8), mDoor = paint(bl * 0.55);
  const mPost = M(tint(P.steel, -0.05), 'metal', { roughness: 0.8, metalness: 0.2 });
  const mCast = M(tint(P.rust, 0.12), 'metal', { roughness: 0.9, metalness: 0.15, side: DS });
  const mSandSheet = M(P.sandSun, 'ground', { roughness: 0.95, metalness: 0, side: DS });
  const wallY0 = 0.18, wallY1 = H - 0.16, wallH = wallY1 - wallY0, wallYc = (wallY0 + wallY1) / 2, panelL = L - 0.36;

  // a plate with an elliptical hole, extruded `t` thick, lying in XY facing +z
  function holedPlate(w, h, t, rx, ry) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
    const hole = new THREE.Path(); hole.absellipse(0, 0, rx, ry, 0, PI * 2, false); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 }); geo.translate(0, 0, -t / 2); return geo;
  }
  // corner castings: three holed plates round a dark core
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (L / 2 - 0.09), cz = sz * (W / 2 - 0.09);
    for (const cy of [0.09, H - 0.09]) {
      box(g, 0.15, 0.17, 0.15, GUN, cx, cy, cz);
      mesh(g, holedPlate(0.18, 0.18, 0.02, 0.028, 0.045), mCast, cx + sx * 0.08, cy, cz, 0, sx * PI / 2, 0);
      mesh(g, holedPlate(0.18, 0.18, 0.02, 0.045, 0.028), mCast, cx, cy, cz + sz * 0.08, 0, sz > 0 ? 0 : PI, 0);
      mesh(g, holedPlate(0.18, 0.18, 0.02, 0.045, 0.028), mCast, cx, cy + (cy > 1 ? 0.08 : -0.08), cz, cy > 1 ? -PI / 2 : PI / 2, 0, 0);
      streak(g, sz > 0 ? 'pz' : 'nz', cx, cy - 0.09, cz + sz * 0.09, cy > 1 ? (CFG.rustHeavy ? 0.7 : 0.45) : 0.0, 0.16);
      streak(g, sx > 0 ? 'px' : 'nx', cx + sx * 0.09, cy - 0.09, cz, cy > 1 ? 0.4 : 0.0, 0.14);
    }
    box(g, 0.16, H - 0.36, 0.16, mPost, cx, H / 2, cz);
  }
  // bottom side rails: C-channel profile with two fork pocket openings, extruded along x
  function railGeo(len) {
    const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, 0.16); s.lineTo(-len / 2, 0.16); s.closePath();
    for (const px of [-1.025, 1.025]) { const h = new THREE.Path(); h.moveTo(px - 0.18, 0.02); h.lineTo(px + 0.18, 0.02); h.lineTo(px + 0.18, 0.135); h.lineTo(px - 0.18, 0.135); h.closePath(); s.holes.push(h); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); geo.translate(0, 0, -0.07); return geo;
  }
  const railZ = W / 2 - 0.07;
  for (const sz of [-1, 1]) {
    mesh(g, railGeo(L - 0.36), mPost, 0, 0.01, sz * railZ);
    box(g, L - 0.36, 0.12, 0.14, mPost, 0, H - 0.07, sz * railZ);
    for (const px of [-1.025, 1.025]) box(g, 0.36, 0.115, 0.4, GUN, px, 0.095, sz * (railZ - 0.2)); // pocket tube behind the opening
    if (CFG.rustHeavy) box(g, L - 0.4, 0.04, 0.005, RUST, 0, H - 0.13, sz * (railZ + 0.072));
  }
  for (const sx of [-1, 1]) { box(g, 0.14, 0.15, W - 0.36, mPost, sx * (L / 2 - 0.07), 0.095, 0); box(g, 0.14, 0.12, W - 0.36, mPost, sx * (L / 2 - 0.07), H - 0.07, 0); }
  // floor: one C-channel cross member profile repeated, plus the deck
  for (let i = 0; i < 14; i++) box(g, 0.05, 0.11, W - 0.34, mPost, -2.6 + i * 0.4, 0.075, 0);
  if (!CFG.open) box(g, L - 0.36, 0.04, W - 0.32, M(tint(P.timber, CFG.doorOpen ? -0.5 : -0.45), 'timber', { roughness: 0.93 }), 0, 0.16, 0);
  else {
    // plank deck as one extruded profile: 14 boards with 6 mm gaps
    const shapes = []; const nb = 14, bw = 0.144, z0 = -(nb * 0.15) / 2;
    for (let i = 0; i < nb; i++) { const a = z0 + i * 0.15, s = new THREE.Shape(); s.moveTo(a, 0); s.lineTo(a + bw, 0); s.lineTo(a + bw, 0.04); s.lineTo(a, 0.04); s.closePath(); shapes.push(s); }
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: L - 0.4, bevelEnabled: false }); geo.translate(0, 0, -(L - 0.4) / 2); geo.rotateY(PI / 2);
    mesh(g, geo, M(tint(P.timber, 0.35), 'timber', { roughness: 0.93, side: DS }), 0, 0.14, 0);
    for (const sx of [-1, 1]) { fillet(g, W - 0.4, 0.32, 0.06, sx * (L / 2 - 0.2), 0.18, 0, sx > 0 ? -PI / 2 : PI / 2); box(g, 0.06, 0.03, W - 0.36, RUST, sx * (L / 2 - 0.2), 0.195, 0); }
  }

  // side walls as extruded corrugation profiles (the dent is a modifier on the profile)

  // ---- weathering that has to read at 30 m: five welded sheet panels a side each aged differently, weld seams between them,
  //      a rust skin along the rib feet and under the roof rail, rust blooms that follow the corrugation, a bolted repair
  //      patch on the shade side, and every screw and drip sitting on a rib crest instead of floating over a trough ----
  const NP = 5, PW = panelL / NP, RP = PW / 4;
  let seed = ({ tan: 3, red: 7, blue: 11, open: 5 })[CFG.kind] || 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0x10000; };
  const crestX = (xl) => Math.round((xl + panelL / 2 - 0.36 * RP) / RP) * RP + 0.36 * RP - panelL / 2;
  const mBloom = [RUST, mCast, M(tint(P.rust, -0.25), 'metal', { roughness: 0.94, metalness: 0.05, side: DS })];
  const mSeam = M(tint(liv, -0.28), 'metal', { roughness: 0.9, metalness: 0.1 });
  const mPatch = M(tint(liv, -0.12), 'metal', { roughness: 0.88, metalness: 0.08 });
  const wx = (sz, xl) => (sz > 0 ? xl : -xl);
  const skin = (sz, xl, y, w, h, mat) => mesh(g, corrPlane(w, h, PITCH, RIBD, 1), mat, wx(sz, xl), y, sz * (W / 2 - 0.046 + 0.004), 0, sz > 0 ? 0 : PI, 0);
  function bloom(sz, xl, y, n, h) {
    const r0 = Math.round((xl + panelL / 2) / RP), mat = mBloom[Math.floor(rnd() * 3)];
    for (let k = 0; k < n; k++) skin(sz, (r0 + k) * RP + RP / 2 - panelL / 2, y + (rnd() - 0.5) * h * 0.6, RP, h * (0.5 + rnd()), mat);
  }
  function sideDetail(sz) {
    const face = sz > 0 ? 'pz' : 'nz';
    for (let k = 1; k < NP; k++) {
      const xs = k * PW - panelL / 2, d = CFG.dent && sz < 0 ? CFG.dent : null;
      const dz = d && xs > d.x0 && xs < d.x1 ? -d.depth * Math.sin(PI * (xs - d.x0) / (d.x1 - d.x0)) : 0;
      box(g, 0.025, wallH - 0.02, 0.03, mSeam, wx(sz, xs), wallYc, sz * (W / 2 - 0.046 + 0.01 + dz));
    }
    skin(sz, 0, wallY0 + 0.035 + 0.01 * rnd(), panelL, 0.05 + 0.04 * rnd(), RUST);
    skin(sz, 0, wallY1 - 0.03, panelL, 0.04, mCast);
    for (let b = 0; b < 3; b++) bloom(sz, -2.3 + b * 1.7 + rnd() * 0.7, 0.6 + rnd() * 1.2, 2 + Math.floor(rnd() * 3), 0.25 + rnd() * 0.3);
    for (let r = 0; r < 20; r += 2) { const xl = r * RP + 0.36 * RP - panelL / 2; if (rnd() < 0.7) streak(g, face, wx(sz, xl), wallY0 + 0.14 + 0.1 * rnd(), sz * (W / 2 - 0.01), 0.08 + 0.14 * rnd(), 0.05); }
    for (let i = 0; i < 7; i++) {
      const xl = crestX(-2.5 + i * 0.83 + (i % 2) * 0.2), x = wx(sz, xl);
      cyl(g, 0.018, 0.02, mCast, x, H - 0.07, sz * (railZ + 0.08), PI / 2, 0, 0, { seg: 6 });
      streak(g, face, x, H - 0.09, sz * (W / 2 - 0.01), 0.18 + 0.12 * (i % 3), 0.05);
    }
    if (sz < 0) {
      const xl = 1.2 + 0.8 * rnd(), x = wx(sz, xl), y = 1.0 + 0.6 * rnd(), zc = sz * (W / 2 - 0.003);
      box(g, 0.55, 0.42, 0.012, mPatch, x, y, zc);
      for (const ex of [-0.22, 0.22]) for (const ey of [-0.16, 0.16]) { cyl(g, 0.012, 0.012, GUN, x + ex, y + ey, zc + sz * 0.009, PI / 2, 0, 0, { seg: 6 }); streak(g, face, x + ex, y + ey - 0.014, zc + sz * 0.006, 0.1 + 0.12 * rnd(), 0.03); }
    }
  }
  function endDetail(sx) {
    const EW = W - 0.36, p = EW / 7, xo = sx * (L / 2 - 0.046 + 0.004), ry = sx * PI / 2;
    mesh(g, corrPlane(EW, 0.05 + 0.03 * rnd(), PITCH, RIBD, 1), RUST, xo, wallY0 + 0.04, 0, 0, ry, 0);
    const r0 = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < 2; k++) mesh(g, corrPlane(p, 0.25 + 0.3 * rnd(), PITCH, RIBD, 1), mBloom[k], xo, 1.1 + 0.5 * rnd(), -sx * ((r0 + k) * p + p / 2 - EW / 2), 0, ry, 0);
  }
  function sideWall(sz) {
    const zBack = sz * (W / 2 - 0.046), ry = sz > 0 ? 0 : PI;
    const dent = CFG.dent && sz < 0 ? CFG.dent : null;
    const mod = dent ? (x) => (x > dent.x0 && x < dent.x1 ? -dent.depth * Math.sin(PI * (x - dent.x0) / (dent.x1 - dent.x0)) : 0) : null;
    const pf = [1.0, 0.7, 1.25, 0.85, 1.1];
    for (let k = 0; k < NP; k++) {
      const xc = (k + 0.5) * PW - panelL / 2, mOut = paint(bl * (sz > 0 ? 1 : 0.35) * pf[(k + (sz > 0 ? 0 : 2)) % NP]);
      const modk = mod ? (x) => mod(x + xc) : null;
      const bands = CFG.band ? [[wallY0, wallY0 + CFG.band.h, M(CFG.band.color, 'metal', { roughness: 0.86, metalness: 0.08, side: DS })], [wallY0 + CFG.band.h, wallY1, mOut]] : [[wallY0, wallY1, mOut]];
      for (const [y0, y1, mat] of bands) mesh(g, corrExtrude(PW, y1 - y0, PITCH, RIBD, SHEET, modk), mat, wx(sz, xc), (y0 + y1) / 2, zBack, 0, ry, 0);
    }
    sideDetail(sz);
    if (sz > 0) { const p = CFG.plates.find((q) => q.on === 'side'); if (p) box(g, p.w, p.h, 0.012, M(tint(liv, 0.75), 'metal', { roughness: 0.85 }), 1.1, 1.55, sz * (W / 2 - 0.004)); }
    if (CFG.bullets && sz > 0) for (const [bx, by] of CFG.bullets) { disc(g, 0.045, RUST, bx, by, W / 2 - 0.006); disc(g, 0.022, GUN, bx, by, W / 2 - 0.003); }
  }
  sideWall(1); sideWall(-1);

  function plainEnd(sx) {
    const geo = corrExtrude(W - 0.36, wallH, PITCH, RIBD, SHEET);
    mesh(g, geo, mEnd, sx * (L / 2 - 0.046), wallYc, 0, 0, sx * PI / 2, 0);
    endDetail(sx);
  }
  // door leaf: horizontal corrugation, built as a vertical profile then turned on its side
  function doorLeaf(parent, sx, sz, lz) {
    const geo = corrExtrude(1.0, wallH, 0.25, 0.02, 0.03); // r4: vertical ribs like the concept, bulge toward +z of the leaf's local frame
    mesh(parent, geo, mDoor, 0, wallYc, lz, 0, sx * PI / 2, 0);
    for (const t of [0.3, 0.75]) {
      const bz = lz + sz * (0.52 - t);
      cyl(parent, 0.018, 2.15, GALV, sx * 0.075, wallYc, bz);
      for (const ky of [0.3, 2.3]) box(parent, 0.07, 0.09, 0.08, STEEL, sx * 0.06, ky, bz);
      for (const gy of [0.95, 1.75]) { box(parent, 0.06, 0.07, 0.08, STEEL, sx * 0.055, gy, bz); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.03, gy - 0.035, bz, 0.22, 0.07); }
      // handle as a lathe: a bar with a swelling grip
      const lp = []; for (let i = 0; i <= 6; i++) lp.push(new THREE.Vector2(0.012 + 0.008 * Math.sin(i / 6 * PI), i * 0.055));
      mesh(parent, new THREE.LatheGeometry(lp, 8), GALV, sx * 0.1, 0.9, bz + sz * 0.02, 0, 0, 0.12);
      box(parent, 0.015, 0.14, 0.07, STEEL, sx * 0.045, 1.02, bz + sz * 0.06);
    }
    for (let h = 0; h < 4; h++) { box(parent, 0.07, 0.13, 0.05, STEEL, sx * 0.02, 0.45 + h * 0.6, sz * 0.02); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.045, 0.39 + h * 0.6, sz * 0.02, 0.2, 0.06); }
    // r4: gasket strip on the meeting edge, seal lug and padlock on the handle retainer, a stiffener channel across the leaf foot
    box(parent, 0.02, wallH - 0.04, 0.03, RUBBER, sx * 0.035, wallYc, lz + sz * 0.485);
    box(parent, 0.03, 0.06, 0.9, STEEL, sx * 0.04, wallY0 + 0.26, lz); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.055, wallY0 + 0.23, lz, 0.12, 0.7);
    if (sz > 0) { box(parent, 0.03, 0.05, 0.12, GALV, sx * 0.075, 1.16, lz + sz * 0.3); mesh(parent, new THREE.TorusGeometry(0.022, 0.006, 6, 10), GUN, sx * 0.09, 1.12, lz + sz * 0.3, 0, PI / 2, 0); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.045, 1.13, lz + sz * 0.3, 0.2, 0.06); }
    if (sz > 0) { const p = CFG.plates.find((q) => q.on === 'door'); if (p) box(parent, 0.012, p.h, p.w, M(tint(liv, 0.75), 'metal', { roughness: 0.85 }), sx * 0.035, 1.95, lz); }
    else box(parent, 0.012, 0.1, 0.15, M(tint(liv, 0.6), 'metal', { roughness: 0.85 }), sx * 0.035, 0.65, lz);
    if (CFG.rustHeavy) { box(parent, 0.01, 0.2, 1.0, RUST, sx * 0.035, wallY0 + 0.1, lz); box(parent, 0.01, 0.12, 1.0, RUST, sx * 0.035, wallY1 - 0.06, lz); }
    else box(parent, 0.01, 0.08, 1.0, RUST, sx * 0.035, wallY0 + 0.04, lz);
  }
  function doorEnd(sx) {
    const xFace = sx * (L / 2 - 0.02), leaves = [];
    for (const sz of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(xFace, 0, sz * 1.04); g.add(pv); leaves.push(pv); doorLeaf(pv, sx, sz, -sz * 0.52); }
    if (CFG.doorOpen) leaves[1].rotation.y = -CFG.doorOpen * PI / 180 * sx;
    // r4: drip edge under the door header and a sill plate under the leaves
    box(g, 0.03, 0.03, W - 0.3, RUST, sx * (L / 2 - 0.005), H - 0.145, 0);
    box(g, 0.05, 0.04, W - 0.36, GUN, sx * (L / 2 - 0.01), 0.2, 0);
  }
  function openFrame(sx) {
    const x = sx * (L / 2 - 0.14);
    for (const sz of [-1, 1]) { box(g, 0.1, wallH, 0.1, mPost, x, wallYc, sz * (W / 2 - 0.23)); for (let h = 0; h < 4; h++) { box(g, 0.06, 0.12, 0.05, STEEL, sx * (L / 2 - 0.02), 0.45 + h * 0.6, sz * (W / 2 - 0.16)); streak(g, sx > 0 ? 'px' : 'nx', sx * (L / 2 - 0.01), 0.39 + h * 0.6, sz * (W / 2 - 0.16), 0.25, 0.06); } }
    box(g, 0.1, 0.1, W - 0.36, mPost, x, wallY1 - 0.05, 0);
    box(g, 0.14, 0.05, W - 0.36, RUST, sx * (L / 2 - 0.07), 0.19, 0);
    box(g, 0.1, 0.06, W - 0.36, RUST, sx * (L / 2 - 0.07), H - 0.16, 0);
  }
  if (CFG.open) { openFrame(1); openFrame(-1); } else { doorEnd(1); plainEnd(-1); }

  // roof: transverse corrugation profile along x with a sag, and a sand sheet of the same profile 8 mm above it
  const sag = (x) => -0.03 * (1 - (x / 2.85) * (x / 2.85));
  const roofGeo = corrExtrude(panelL, W - 0.36, PITCH, 0.03, SHEET, sag); roofGeo.rotateX(-PI / 2); // ribs bulge toward +y
  mesh(g, roofGeo, mRoof, 0, H - 0.05, 0);
  // r4: dust sheet with a shallower rib, lifted so its troughs clear the roof crests everywhere (the old one let every crest poke through as a stripe)
  const dustGeo = corrExtrude(panelL - 0.08, W - 0.44, PITCH, 0.012, 0.004, sag); dustGeo.rotateX(-PI / 2);
  mesh(g, dustGeo, mSandSheet, 0, H - 0.014, 0);

  // ---- r4 detail pass: vent louvres, long rust runs down the rib crests, hazard placard, hazard bands on the corner posts,
  //      rubble against the rails and a third sand fillet. Everything sits on a rib crest, never floating over a trough. ----
  const mYel = M(tint(P.yellow, 0.2), 'metal', { roughness: 0.85, metalness: 0.05 });
  const mRock = M(P.rockPale, 'ground', { roughness: 0.95, metalness: 0 });   // named ground so it takes the sand set: pale stones half buried, not concrete blocks
  const zCrest = W / 2 - 0.01;
  for (const sz of [-1, 1]) {
    const face = sz > 0 ? 'pz' : 'nz';
    for (const xl of [-2.45, 2.45]) {
      const x = wx(sz, crestX(xl)), y = wallY1 - 0.24, z = sz * (zCrest + 0.006);
      box(g, 0.16, 0.12, 0.012, mCast, x, y, z);
      for (let k = 0; k < 3; k++) box(g, 0.13, 0.014, 0.01, GUN, x, y - 0.03 + k * 0.03, z + sz * 0.008);
      streak(g, face, x, y - 0.06, sz * zCrest, 0.3 + 0.25 * rnd(), 0.09);
    }
    for (let i = 0; i < 5; i++) { const x = wx(sz, crestX(-2.2 + i * 1.1 + 0.5 * rnd())); streak(g, face, x, H - 0.13, sz * zCrest, 0.5 + 0.9 * rnd(), 0.05); }
  }
  if (CFG.kind === 'red' || CFG.kind === 'open') {
    const x = wx(1, crestX(2.05));
    box(g, 0.22, 0.22, 0.01, mYel, x, 1.95, zCrest + 0.005, 0, 0, PI / 4);
    box(g, 0.1, 0.1, 0.008, GUN, x, 1.95, zCrest + 0.011, 0, 0, PI / 4);
    streak(g, 'pz', x, 1.8, zCrest, 0.25, 0.06);
  }
  const bandEnds = CFG.kind === 'open' ? [-1, 1] : CFG.kind === 'blue' ? [1] : [];
  for (const sx of bandEnds) for (const sz of [-1, 1]) {
    const cz = sz * (W / 2 - 0.09), px = sx * (L / 2 + (CFG.open ? 0.006 : -0.004));
    box(g, 0.01, 0.6, 0.15, mYel, px, 0.85, cz);
    for (let k = 0; k < 3; k++) box(g, 0.008, 0.05, 0.16, GUN, px + sx * 0.005, 0.65 + k * 0.2, cz, PI / 4, 0, 0);
  }
  for (let i = 0; i < 9; i++) {
    const end = rnd() < 0.35, s = 0.07 + 0.1 * rnd();
    const x = end ? -L / 2 - 0.02 - 0.06 * rnd() : -2.6 + 5.2 * rnd(), z = end ? -1.0 + 2.0 * rnd() : W / 2 + 0.02 + 0.06 * rnd();
    box(g, s, s * 0.6, s * 0.8, mRock, x, s * 0.12, z, 0, rnd() * PI, 0.1 * rnd());
  }
  fillet(g, 2.6, 0.1, 0.07, 1.4, 0, -W / 2, PI);
  if (CFG.doorOpen) fillet(g, 0.9, 0.5, 0.05, L / 2 - 0.2, 0.2, 0.55, -PI / 2);
  fillet(g, L - 0.5, 0.22, 0.16, 0, 0, W / 2, 0);
  fillet(g, W - 0.4, 0.3, 0.14, -L / 2, 0, 0, -PI / 2);

  // ---- contract: base at y = 0, centred on x and z, measured from vertices ----
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
  const box_ = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box_.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box_.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box_.min.y; o.position.z -= c.z; });
  return g;

}
