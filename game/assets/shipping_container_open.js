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

const CFG = { kind: 'open', livery: 0x9ea3a1, bleach: 0.12, plates: [], open: true, bullets: [[-1.4, 1.3], [-1.1, 1.05], [-0.7, 1.4]] };
  // ---- strategy c2: frame first, sheets as displaced planes. Posts flush with the rib crests, castings proud, sheets welded between rails. ----
  const L = 6.06, W = 2.44, H = 2.59, PITCH = 0.28, RIBD = 0.036;
  const liv = CFG.livery, bl = CFG.bleach;
  const paint = (f, extra) => M(tint(liv, f), 'metal', Object.assign({ roughness: 0.86, metalness: 0.08, side: DS, flatShading: true }, extra || {}));
  const mSouth = paint(bl), mNorth = paint(bl * 0.35), mEnd = paint(bl * 0.6), mRoof = paint(bl * 0.8), mDoor = paint(bl * 0.55);
  const mPost = M(tint(P.steel, 0.02), 'metal', { roughness: 0.8, metalness: 0.2 });
  const mCast = M(tint(P.rust, 0.12), 'metal', { roughness: 0.9, metalness: 0.15 });
  const mSandSheet = M(P.sandSun, 'ground', { roughness: 0.95, metalness: 0, side: DS, flatShading: true });
  const wallY0 = 0.17, wallY1 = H - 0.15, wallH = wallY1 - wallY0, wallYc = (wallY0 + wallY1) / 2, panelL = L - 0.36;

  // frame: posts flush with the crest plane, rails as angle sections, castings 10 mm proud
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (L / 2 - 0.09), cz = sz * (W / 2 - 0.09);
    box(g, 0.18, H - 0.36, 0.18, mPost, cx, H / 2, cz);
    for (const cy of [0.09, H - 0.09]) {
      box(g, 0.2, 0.18, 0.2, mCast, cx, cy, cz);
      box(g, 0.02, 0.05, 0.08, GUN, cx + sx * 0.1, cy, cz);
      box(g, 0.08, 0.05, 0.02, GUN, cx, cy, cz + sz * 0.1);
      if (cy > 1) box(g, 0.08, 0.02, 0.05, GUN, cx, cy + 0.09, cz);
      streak(g, sz > 0 ? 'pz' : 'nz', cx, cy - 0.09, cz + sz * 0.1, cy > 1 ? (CFG.rustHeavy ? 0.7 : 0.45) : 0.0, 0.16);
      streak(g, sx > 0 ? 'px' : 'nx', cx + sx * 0.1, cy - 0.09, cz, cy > 1 ? 0.4 : 0.0, 0.14);
    }
  }
  const railZ = W / 2 - 0.075;
  for (const sz of [-1, 1]) {
    box(g, L - 0.36, 0.14, 0.15, mPost, 0, 0.09, sz * railZ);                       // bottom rail
    box(g, L - 0.36, 0.04, 0.06, mPost, 0, 0.18, sz * (W / 2 - 0.03));             // lower angle lip
    box(g, L - 0.36, 0.12, 0.15, mPost, 0, H - 0.08, sz * railZ);                  // top rail
    box(g, L - 0.36, 0.05, 0.03, mPost, 0, H - 0.04, sz * (W / 2 - 0.015));        // top rail lip over the sheet
    for (const px of [-1.025, 1.025]) { box(g, 0.36, 0.115, 0.03, GUN, px, 0.09, sz * (railZ + 0.07)); box(g, 0.42, 0.15, 0.015, mCast, px, 0.09, sz * (railZ + 0.07)); }
    if (CFG.rustHeavy) box(g, L - 0.4, 0.04, 0.005, RUST, 0, H - 0.14, sz * (railZ + 0.078));
  }
  for (const sx of [-1, 1]) { box(g, 0.15, 0.14, W - 0.36, mPost, sx * (L / 2 - 0.075), 0.09, 0); box(g, 0.15, 0.12, W - 0.36, mPost, sx * (L / 2 - 0.075), H - 0.08, 0); }
  for (let i = 0; i < 14; i++) box(g, 0.05, 0.11, W - 0.34, mPost, -2.6 + i * 0.4, 0.075, 0);
  if (!CFG.open) box(g, L - 0.36, 0.04, W - 0.32, M(tint(P.timber, CFG.doorOpen ? -0.5 : -0.45), 'timber', { roughness: 0.93 }), 0, 0.15, 0);
  else {
    const nb = 14, z0 = -(nb * 0.15) / 2 + 0.075;
    for (let i = 0; i < nb; i++) box(g, L - 0.4, 0.04, 0.144, M(tint(P.timber, 0.28 + 0.09 * ((i * 5) % 3)), 'timber', { roughness: 0.92 }), 0, 0.15, z0 + i * 0.15);
    for (const sx of [-1, 1]) { fillet(g, W - 0.4, 0.32, 0.06, sx * (L / 2 - 0.2), 0.17, 0, sx > 0 ? -PI / 2 : PI / 2); box(g, 0.06, 0.03, W - 0.36, RUST, sx * (L / 2 - 0.2), 0.185, 0); }
  }

  // side walls: one displaced plane per band, two height segments so the dent can bell in the middle
  function sideWall(sz) {
    const mOut = sz > 0 ? mSouth : mNorth, zBack = sz * (W / 2 - 0.046);
    const dent = CFG.dent && sz < 0 ? CFG.dent : null;
    const bands = CFG.band ? [[wallY0, wallY0 + CFG.band.h, M(CFG.band.color, 'metal', { roughness: 0.86, metalness: 0.08, side: DS, flatShading: true })], [wallY0 + CFG.band.h, wallY1, mOut]] : [[wallY0, wallY1, mOut]];
    for (const [y0, y1, mat] of bands) {
      const h = y1 - y0;
      const mod = dent ? (x, y) => { const xx = sz < 0 ? -x : x; if (xx < dent.x0 || xx > dent.x1) return 0; return -dent.depth * Math.sin(PI * (xx - dent.x0) / (dent.x1 - dent.x0)) * (0.55 + 0.45 * Math.cos(y / h * PI)); } : null;
      mesh(g, corrPlane(panelL, h, PITCH, RIBD, dent ? 4 : 1, mod), mat, 0, (y0 + y1) / 2, zBack, 0, sz > 0 ? 0 : PI, 0);
    }
    if (CFG.rustRibs) { const pts = corrPts(panelL, PITCH, RIBD); for (let i = 1; i < pts.length - 1; i += 4) streak(g, sz > 0 ? 'pz' : 'nz', (pts[i][0] + pts[i + 1][0]) / 2 - panelL / 2, wallY0 + 0.16, sz * (W / 2 - 0.01), 0.16, 0.12); }
    for (let i = 0; i < 7; i++) {
      const x = -2.5 + i * 0.83 + (i % 2) * 0.2;
      box(g, 0.03, 0.03, 0.02, mCast, x, H - 0.08, sz * (railZ + 0.08));
      streak(g, sz > 0 ? 'pz' : 'nz', x, H - 0.1, sz * (W / 2 - 0.01), 0.18 + 0.12 * (i % 3), 0.05);
    }
    if (sz > 0) { const p = CFG.plates.find((q) => q.on === 'side'); if (p) box(g, p.w, p.h, 0.012, M(tint(liv, 0.75), 'metal', { roughness: 0.85 }), 1.1, 1.55, sz * (W / 2 - 0.004)); }
    if (CFG.bullets && sz > 0) for (const [bx, by] of CFG.bullets) { disc(g, 0.045, RUST, bx, by, W / 2 - 0.006); disc(g, 0.022, GUN, bx, by, W / 2 - 0.003); }
  }
  sideWall(1); sideWall(-1);

  function plainEnd(sx) { mesh(g, corrPlane(W - 0.36, wallH, PITCH, RIBD, 1), mEnd, sx * (L / 2 - 0.046), wallYc, 0, 0, sx * PI / 2, 0); }
  function doorLeaf(parent, sx, sz, lz) {
    // leaf: a backing plate plus a horizontally corrugated skin, lock bars carried on brackets
    box(parent, 0.03, wallH, 1.0, mDoor, sx * 0.0, wallYc, lz);
    const skin = corrPlane(wallH, 0.96, 0.5, 0.025, 1); skin.rotateZ(-PI / 2);
    mesh(parent, skin, mDoor, sx * 0.016, wallYc, lz, 0, sx * PI / 2, 0);
    for (const t of [0.3, 0.75]) {
      const bz = lz + sz * (0.52 - t);
      cyl(parent, 0.018, 2.15, GALV, sx * 0.085, wallYc, bz);
      for (const ky of [0.3, 2.3]) box(parent, 0.07, 0.09, 0.08, STEEL, sx * 0.07, ky, bz);
      for (const gy of [0.95, 1.75]) { box(parent, 0.06, 0.07, 0.08, STEEL, sx * 0.065, gy, bz); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.042, gy - 0.035, bz, 0.22, 0.07); }
      box(parent, 0.035, 0.34, 0.03, GALV, sx * 0.11, 1.05, bz + sz * 0.02, 0.12, 0, 0);
      box(parent, 0.015, 0.14, 0.07, STEEL, sx * 0.055, 1.02, bz + sz * 0.06);
    }
    for (let h = 0; h < 4; h++) { box(parent, 0.07, 0.13, 0.05, STEEL, sx * 0.03, 0.45 + h * 0.6, sz * 0.02); streak(parent, sx > 0 ? 'px' : 'nx', sx * 0.055, 0.39 + h * 0.6, sz * 0.02, 0.2, 0.06); }
    if (sz > 0) { const p = CFG.plates.find((q) => q.on === 'door'); if (p) box(parent, 0.012, p.h, p.w, M(tint(liv, 0.75), 'metal', { roughness: 0.85 }), sx * 0.045, 1.95, lz); }
    else box(parent, 0.012, 0.1, 0.15, M(tint(liv, 0.6), 'metal', { roughness: 0.85 }), sx * 0.045, 0.65, lz);
    if (CFG.rustHeavy) { box(parent, 0.01, 0.2, 1.0, RUST, sx * 0.045, wallY0 + 0.1, lz); box(parent, 0.01, 0.12, 1.0, RUST, sx * 0.045, wallY1 - 0.06, lz); }
    else box(parent, 0.01, 0.08, 1.0, RUST, sx * 0.045, wallY0 + 0.04, lz);
  }
  function doorEnd(sx) {
    const xFace = sx * (L / 2 - 0.03), leaves = [];
    for (const sz of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(xFace, 0, sz * 1.03); g.add(pv); leaves.push(pv); doorLeaf(pv, sx, sz, -sz * 0.515); }
    if (CFG.doorOpen) leaves[1].rotation.y = -CFG.doorOpen * PI / 180 * sx;
  }
  function openFrame(sx) {
    const x = sx * (L / 2 - 0.14);
    for (const sz of [-1, 1]) { box(g, 0.1, wallH, 0.1, mPost, x, wallYc, sz * (W / 2 - 0.23)); for (let h = 0; h < 4; h++) { box(g, 0.06, 0.12, 0.05, STEEL, sx * (L / 2 - 0.03), 0.45 + h * 0.6, sz * (W / 2 - 0.16)); streak(g, sx > 0 ? 'px' : 'nx', sx * (L / 2 - 0.01), 0.39 + h * 0.6, sz * (W / 2 - 0.16), 0.25, 0.06); } }
    box(g, 0.1, 0.1, W - 0.36, mPost, x, wallY1 - 0.05, 0);
    box(g, 0.15, 0.05, W - 0.36, RUST, sx * (L / 2 - 0.075), 0.18, 0);
    box(g, 0.1, 0.06, W - 0.36, RUST, sx * (L / 2 - 0.075), H - 0.15, 0);
  }
  if (CFG.open) { openFrame(1); openFrame(-1); } else { doorEnd(1); plainEnd(-1); }

  // roof: displaced plane with the sag baked in, and the dust sheet 8 mm above it following the same ribs
  const sag = (x) => -0.03 * (1 - (x / 2.85) * (x / 2.85));
  const roof = corrPlane(panelL, W - 0.36, PITCH, 0.03, 2, (x) => sag(x)); roof.rotateX(-PI / 2);
  mesh(g, roof, mRoof, 0, H - 0.05, 0);
  const dustR = corrPlane(panelL - 0.08, W - 0.44, PITCH, 0.03, 2, (x) => sag(x)); dustR.rotateX(-PI / 2);
  mesh(g, dustR, mSandSheet, 0, H - 0.042, 0);
  if (CFG.open) { const under = corrPlane(panelL, W - 0.36, PITCH, 0.03, 1, (x) => sag(x)); under.rotateX(-PI / 2); mesh(g, under, M(tint(liv, -0.35), 'metal', { roughness: 0.9, side: DS, flatShading: true }), 0, H - 0.08, 0); }

  fillet(g, L - 0.5, 0.28, 0.16, 0, 0, W / 2, 0);
  fillet(g, W - 0.4, 0.3, 0.14, -L / 2, 0, 0, -PI / 2);

  // ---- contract: base at y = 0, centred on x and z, measured from vertices ----
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
