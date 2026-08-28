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

  // ---- generator set, strategy c2: a different reading. Three modules on the skid like the reference: a taller control cabinet at one end,
  //      the engine enclosure in the middle, a radiator module at the other end with louvres on three faces. Stepped roof, hinged doors on plates. ----
  const mO = (f) => M(tint(P.olive, f), 'metal', { roughness: 0.88, metalness: 0.08 });
  const OS = mO(0.16), ON = mO(0.06), OR = mO(0.24), OE = mO(0.1), OP = mO(0.2), OC = mO(0.02);
  const SKID = M(tint(P.steel, -0.1), 'metal', { roughness: 0.85, metalness: 0.2 });
  const GLASS = new THREE.MeshStandardMaterial({ color: 0x2a2e30, roughness: 0.45, metalness: 0.1 });
  const CHIP = M(P.gun, 'metal', { roughness: 0.7, metalness: 0.4 });
  const DARK = M(0x232426, 'metal', { roughness: 0.9 });
  const EZ = 0.55, EY0 = 0.15;

  // skid
  for (const sz of [-1, 1]) { box(g, 3.2, 0.15, 0.1, SKID, 0, 0.075, sz * 0.55); box(g, 3.2, 0.02, 0.16, SKID, 0, 0.14, sz * 0.52); }
  for (const sx of [-1, 1]) box(g, 0.1, 0.15, 1.2, SKID, sx * 1.55, 0.075, 0);
  box(g, 3.0, 0.02, 1.1, SKID, 0, 0.14, 0);
  for (const px of [-0.8, 0.8]) { box(g, 0.42, 0.12, 1.24, GUN, px, 0.075, 0); for (const sz of [-1, 1]) box(g, 0.36, 0.08, 0.012, DARK, px, 0.075, sz * 0.625); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { mesh(g, new THREE.TorusGeometry(0.05, 0.014, 8, 10), SKID, sx * 1.45, 0.2, sz * 0.45); box(g, 0.1, 0.02, 0.1, SKID, sx * 1.45, 0.16, sz * 0.45); streak(g, sz > 0 ? 'pz' : 'nz', sx * 1.45, 0.15, sz * 0.6, 0.12, 0.08); }
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) cyl(g, 0.014, 0.012, GUN, -1.25 + i * 0.5, 0.1, sz * 0.605, PI / 2, 0, 0, { seg: 6 });

  // a module: box body with a per face tint, chipped edges, dust cap
  function module(x0, x1, top, mS, mN) {
    const w = x1 - x0, cx = (x0 + x1) / 2, h = top - EY0, cy = (top + EY0) / 2;
    box(g, w - 0.06, h - 0.06, 1.1 - 0.06, DARK, cx, cy, 0);
    box(g, w, h, 0.03, mS, cx, cy, EZ - 0.015); box(g, w, h, 0.03, mN, cx, cy, -EZ + 0.015);
    box(g, 0.03, h, 1.1, OE, x0 + 0.015, cy, 0); box(g, 0.03, h, 1.1, OE, x1 - 0.015, cy, 0);
    box(g, w, 0.03, 1.1, OR, cx, top - 0.015, 0);
    for (const sz of [-1, 1]) { box(g, w, 0.025, 0.025, CHIP, cx, top, sz * EZ); box(g, w, 0.025, 0.025, CHIP, cx, EY0, sz * EZ); }
    for (const sx of [x0, x1]) { box(g, 0.025, 0.025, 1.1, CHIP, sx, top, 0); for (const sz of [-1, 1]) box(g, 0.025, h, 0.025, CHIP, sx, cy, sz * EZ); }
    dust(g, w, 1.1, cx, top, 0, 0.05);
    return { cx, cy, top };
  }
  // control cabinet, engine enclosure, radiator module
  module(-1.3, -0.65, 1.6, mO(0.14), mO(0.04));
  const eng = module(-0.62, 0.72, 1.45, OS, ON);
  module(0.75, 1.3, 1.5, mO(0.12), mO(0.03));
  // gaps between modules read as dark seams
  box(g, 0.03, 1.3, 1.06, DARK, -0.635, 0.85, 0); box(g, 0.03, 1.3, 1.06, DARK, 0.735, 0.85, 0);
  // engine enclosure doors: two per side, hung on hinge plates, bolts round the edge, recessed handles
  for (const sz of [-1, 1]) for (const px of [-0.3, 0.38]) {
    const z = sz * (EZ + 0.012), m = sz > 0 ? OP : mO(0.1), w = 0.6;
    box(g, w, 1.0, 0.024, m, px, 0.8, z);
    box(g, 0.03, 0.9, 0.03, CHIP, px - w / 2 + 0.02, 0.8, z);
    for (const hy of [-0.35, 0.35]) { box(g, 0.05, 0.1, 0.03, STEEL, px - w / 2 + 0.03, 0.8 + hy, z + sz * 0.01); streak(g, sz > 0 ? 'pz' : 'nz', px - w / 2 + 0.03, 0.75 + hy, z + sz * 0.02, 0.18, 0.05); }
    const bolts = [[-0.24, 0.45], [0, 0.45], [0.24, 0.45], [-0.24, -0.45], [0, -0.45], [0.24, -0.45], [0.26, 0.15], [0.26, -0.15]];
    for (const [bx, by] of bolts) { cyl(g, 0.014, 0.012, GUN, px + bx, 0.8 + by, z + sz * 0.018, PI / 2, 0, 0, { seg: 6 }); if (by < 0) streak(g, sz > 0 ? 'pz' : 'nz', px + bx, 0.8 + by - 0.014, z + sz * 0.014, 0.12, 0.035); }
    box(g, 0.12, 0.06, 0.02, GUN, px + 0.15, 0.8, z + sz * 0.004); box(g, 0.08, 0.016, 0.02, GALV, px + 0.15, 0.8, z + sz * 0.016);
    streak(g, sz > 0 ? 'pz' : 'nz', px + 0.15, 0.77, z + sz * 0.014, 0.15, 0.08);
    if (sz > 0 && px > 0) box(g, 0.3, 0.3, 0.008, mO(0.6), px - 0.05, 1.05, z + sz * 0.016);
  }
  // radiator module: horizontal louvres on the end and both sides
  function louvres(face) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const y = 0.32 + i * 0.05;
      if (face === 'px') box(g, 0.035, 0.016, 0.9, OE, 1.31, y, 0, 0, 0, 0.6);
      else box(g, 0.42, 0.016, 0.035, OE, 1.03, y, face === 'pz' ? 0.575 : -0.575, -0.6 * (face === 'pz' ? 1 : -1), 0, 0);
    }
  }
  box(g, 0.02, 1.2, 0.95, DARK, 1.29, 0.87, 0); box(g, 0.45, 1.2, 0.012, DARK, 1.03, 0.87, 0.556); box(g, 0.45, 1.2, 0.012, DARK, 1.03, 0.87, -0.556);
  louvres('px'); louvres('pz'); louvres('nz');
  box(g, 0.03, 0.06, 1.0, OE, 1.31, 0.28, 0); box(g, 0.03, 0.06, 1.0, OE, 1.31, 1.44, 0); box(g, 0.03, 1.22, 0.05, OE, 1.31, 0.86, 0.475); box(g, 0.03, 1.22, 0.05, OE, 1.31, 0.86, -0.475);
  for (const [y, z] of [[0.28, 0.42], [0.28, -0.42], [1.44, 0.42], [1.44, -0.42]]) { cyl(g, 0.014, 0.012, GUN, 1.33, y, z, 0, 0, PI / 2, { seg: 6 }); streak(g, 'px', 1.33, y - 0.014, z, 0.12, 0.035); }
  // control cabinet: full height door on the end with a window panel, meter dials, emergency stop
  box(g, 0.012, 1.2, 0.5, OC, -1.306, 0.85, 0.15);
  for (const hy of [0.4, 1.3]) { box(g, 0.03, 0.1, 0.05, STEEL, -1.31, hy, -0.08); streak(g, 'nx', -1.32, hy - 0.05, -0.08, 0.2, 0.05); }
  box(g, 0.03, 0.02, 0.1, GALV, -1.32, 0.85, 0.35);
  box(g, 0.03, 0.3, 0.4, GUN, -1.31, 1.25, 0.15); box(g, 0.01, 0.2, 0.3, GLASS, -1.33, 1.27, 0.15);
  for (const dz of [0.05, 0.2]) { cyl(g, 0.03, 0.01, GALV, -1.335, 1.27, dz, 0, 0, PI / 2); cyl(g, 0.02, 0.005, DARK, -1.34, 1.27, dz, 0, 0, PI / 2); }
  cyl(g, 0.02, 0.02, M(P.red, 'metal', { roughness: 0.8 }), -1.33, 1.0, 0.3, 0, 0, PI / 2, { seg: 8 });
  box(g, 0.012, 0.4, 0.3, mO(0.08), -1.306, 0.7, -0.3); for (let i = 0; i < 5; i++) box(g, 0.02, 0.012, 0.24, DARK, -1.312, 0.55 + i * 0.07, -0.3);
  streak(g, 'nx', -1.32, 1.1, 0.15, 0.25, 0.3);
  // exhaust from the engine roof with a cone rain cap, filler cap, plate on the cabinet roof
  cyl(g, 0.05, 0.42, STEEL, 0.45, eng.top + 0.21, -0.25); cyl(g, 0.056, 0.1, RUST, 0.45, eng.top + 0.06, -0.25); cyl(g, 0.09, 0.02, STEEL, 0.45, eng.top + 0.01, -0.25);
  disc(g, 0.14, RUST, 0.45, eng.top + 0.011, -0.25, -PI / 2, 0, 0);
  cyl(g, 0.02, 0.06, STEEL, 0.45, eng.top + 0.45, -0.25, 0, 0, 0, { rt: 0.09 }); cyl(g, 0.012, 0.03, STEEL, 0.45, eng.top + 0.42, -0.25);
  box(g, 0.5, 0.02, 0.5, mO(0.3), -0.2, eng.top + 0.01, 0.1); cyl(g, 0.08, 0.04, GALV, -0.2, eng.top + 0.04, 0.1); cyl(g, 0.04, 0.01, GUN, -0.2, eng.top + 0.065, 0.1);
  fillet(g, 3.0, 0.14, 0.1, 0, 0, 0.6, 0); fillet(g, 1.1, 0.2, 0.12, -1.6, 0, 0, -PI / 2); fillet(g, 1.1, 0.2, 0.12, 1.6, 0, 0, PI / 2);

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
