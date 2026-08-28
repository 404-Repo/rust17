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
  // ---- r4 detail pass: screw rows along every roof edge and panel edge like the concept, a silencer drum under the stack,
  //      drip edge rust under each roof lip, roof stiffener seams, cable conduit from the cabinet to a junction box on the
  //      skid and a cable on the ground, battery box, cable glands, earth stud, drain plug, document pocket, hazard plate. ----
  const mYel = M(tint(P.yellow, 0.15), 'metal', { roughness: 0.88, metalness: 0.05 });
  const mods = [[-1.3, -0.65, 1.6], [-0.62, 0.72, 1.45], [0.75, 1.3, 1.5]];
  for (const [x0, x1, top] of mods) {
    const w = x1 - x0, cx = (x0 + x1) / 2, n = Math.max(2, Math.round(w / 0.16));
    for (const sz of [-1, 1]) {
      box(g, w - 0.04, 0.02, 0.006, RUST, cx, top - 0.045, sz * (EZ + 0.003));                                      // drip edge rust under the roof lip
      for (let i = 0; i <= n; i++) { const x = x0 + 0.03 + (w - 0.06) * i / n; cyl(g, 0.011, 0.01, GUN, x, top - 0.06, sz * (EZ + 0.005), PI / 2, 0, 0, { seg: 6 }); if (i % 3 === 1) streak(g, sz > 0 ? 'pz' : 'nz', x, top - 0.072, sz * EZ, 0.08 + 0.05 * (i % 2), 0.03); }
      for (let k = 1; k < 5; k++) { const y = EY0 + 0.05 + (top - EY0 - 0.1) * k / 5; cyl(g, 0.011, 0.01, GUN, x0 + 0.03, y, sz * (EZ + 0.005), PI / 2, 0, 0, { seg: 6 }); cyl(g, 0.011, 0.01, GUN, x1 - 0.03, y, sz * (EZ + 0.005), PI / 2, 0, 0, { seg: 6 }); }
    }
    for (const rx of [cx - w * 0.25, cx + w * 0.25]) box(g, 0.02, 0.012, 1.02, OE, rx, top + 0.012, 0);           // roof stiffener seams
  }
  for (let k = 0; k < 6; k++) for (const sz of [-1, 1]) cyl(g, 0.011, 0.008, GUN, -1.304, 0.3 + k * 0.22, sz * 0.5, 0, 0, PI / 2, { seg: 6 });   // cabinet end face screw columns, 4 mm proud of the face at x -1.30
  // silencer drum under the stack, saddles, rust collar where the stack leaves it
  cyl(g, 0.13, 0.7, STEEL, 0.1, eng.top + 0.16, -0.25, 0, 0, PI / 2, { seg: 14 });
  for (const dx of [-0.22, 0.22]) cyl(g, 0.135, 0.03, RUST, 0.1 + dx, eng.top + 0.16, -0.25, 0, 0, PI / 2, { seg: 14 });
  for (const dx of [-0.25, 0.25]) box(g, 0.06, 0.05, 0.3, GUN, 0.1 + dx, eng.top + 0.025, -0.25);
  cyl(g, 0.058, 0.05, RUST, 0.45, eng.top + 0.31, -0.25); disc(g, 0.16, RUST, 0.45, eng.top + 0.012, -0.25, -PI / 2, 0, 0);
  // ---- r4b: the skid end cluster rebuilt so nothing overhangs the skid outline (x -1.6) and every cable goes somewhere ----
  // a cable or rod between two points, and a knot where two segments meet
  function seg(parent, a, b, r, mat, sg) {
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A), L = d.length();
    const m = mesh(parent, new THREE.CylinderGeometry(r, r, L, sg || 6), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  const knot = (parent, p, r, mat) => mesh(parent, new THREE.SphereGeometry(r, 6, 5), mat, p[0], p[1], p[2]);
  const DECK = 0.15;   // skid deck top
  // conduit from the cabinet gland (x -1.34, y 0.72, z -0.3) straight down, elbow, then a short run in -z into the SIDE of the junction box
  box(g, 0.08, 0.08, 0.08, GUN, -1.34, 0.72, -0.3);
  cyl(g, 0.02, 0.28, STEEL, -1.35, 0.54, -0.3); box(g, 0.05, 0.03, 0.06, STEEL, -1.34, 0.6, -0.3);          // conduit and saddle clip on the cabinet face
  knot(g, [-1.35, 0.4, -0.3], 0.026, STEEL);                                                                 // elbow
  cyl(g, 0.02, 0.09, STEEL, -1.35, 0.4, -0.345, PI / 2, 0, 0);                                               // horizontal run to the box side
  cyl(g, 0.03, 0.03, GUN, -1.35, 0.4, -0.375, PI / 2, 0, 0, { seg: 8 });                                     // gland on the box side
  // junction box on the cabinet end face beside the louvre panel, inside the skid outline: body, proud lid with four screws, rust run below it
  const JB = mO(0.05), JZ = -0.48;
  box(g, 0.1, 0.22, 0.2, JB, -1.35, 0.37, JZ);
  box(g, 0.014, 0.18, 0.16, mO(0.12), -1.407, 0.37, JZ);
  for (const [ly, lz] of [[0.45, JZ - 0.07], [0.45, JZ + 0.07], [0.29, JZ - 0.07], [0.29, JZ + 0.07]]) cyl(g, 0.008, 0.008, GUN, -1.418, ly, lz, 0, 0, PI / 2, { seg: 6 });
  streak(g, 'nx', -1.3, 0.26, JZ, 0.1, 0.16);
  // cable out of the box BOTTOM straight down onto the deck, a short clipped run to the skid edge, then down the skid side face to the sand
  cyl(g, 0.012, 0.11, RUBBER, -1.35, 0.205, JZ); cyl(g, 0.024, 0.02, GUN, -1.35, 0.25, JZ, 0, 0, 0, { seg: 8 });   // cable and its gland
  knot(g, [-1.35, DECK + 0.012, JZ], 0.014, RUBBER);
  seg(g, [-1.35, DECK + 0.012, JZ], [-1.35, DECK + 0.012, -0.6], 0.012, RUBBER);
  box(g, 0.04, 0.02, 0.03, GALV, -1.35, DECK + 0.01, -0.55);                                                 // deck clip
  knot(g, [-1.35, DECK + 0.012, -0.6], 0.014, RUBBER);
  seg(g, [-1.35, DECK + 0.012, -0.6], [-1.35, 0.012, -0.615], 0.012, RUBBER);                                // down the skid side face
  box(g, 0.03, 0.03, 0.02, GALV, -1.35, 0.09, -0.61);                                                        // clip on the skid side
  // ground cable: three short segments lying loosely on the sand, knots where they meet, a connector at the end instead of a cut
  const gc = [[-1.35, 0.012, -0.615], [-1.0, 0.026, -0.648], [-0.65, 0.012, -0.628], [-0.27, 0.024, -0.65]];
  for (let i = 0; i < 3; i++) { seg(g, gc[i], gc[i + 1], 0.012, RUBBER); knot(g, gc[i + 1], 0.014, RUBBER); }
  cyl(g, 0.02, 0.07, GUN, -0.21, 0.02, -0.65, 0, 0, PI / 2, { seg: 8 }); cyl(g, 0.024, 0.02, GALV, -0.19, 0.02, -0.65, 0, 0, PI / 2, { seg: 8 });
  // battery box on the sun side of the skid apron, inside the skid outline and clear of the lifting eye: body and lid in olive so it weathers
  // like the cabinet, dark lid seam, dust on the lid, two terminal studs with clamps and a cable each into the cabinet foot, strap with a buckle, rust run under the strap
  const BX = -1.45, BZ = 0.2;
  box(g, 0.22, 0.18, 0.3, mO(0.0), BX, DECK + 0.09, BZ); box(g, 0.22, 0.06, 0.3, mO(0.1), BX, DECK + 0.21, BZ);
  box(g, 0.226, 0.006, 0.306, DARK, BX, DECK + 0.18, BZ);
  dust(g, 0.22, 0.3, BX, DECK + 0.24, BZ, 0.03, 0.008);
  box(g, 0.025, 0.008, 0.31, GALV, BX, DECK + 0.252, BZ); for (const sz of [-1, 1]) box(g, 0.025, 0.25, 0.008, GALV, BX, DECK + 0.125, BZ + sz * 0.154);
  box(g, 0.05, 0.05, 0.02, GUN, BX, DECK + 0.19, BZ + 0.165); cyl(g, 0.006, 0.05, GUN, BX, DECK + 0.19, BZ + 0.176, 0, 0, PI / 2, { seg: 6 });   // buckle and pin
  streak(g, 'pz', BX, DECK + 0.16, BZ + 0.15, 0.14, 0.04); streak(g, 'nz', BX, DECK + 0.15, BZ - 0.15, 0.12, 0.04);
  for (const [tx, tz, gz] of [[-1.5, BZ - 0.05, 0.16], [-1.4, BZ + 0.05, 0.28]]) {
    cyl(g, 0.012, 0.03, GALV, tx, DECK + 0.265, tz, 0, 0, 0, { seg: 6 }); box(g, 0.03, 0.02, 0.03, GUN, tx, DECK + 0.285, tz);   // stud and clamp
    const top = [tx, DECK + 0.295, tz], mid = [(tx - 1.31) / 2, DECK + 0.32, tz + 0.01], end = [-1.31, 0.22, gz];
    seg(g, top, mid, 0.008, RUBBER); knot(g, mid, 0.009, RUBBER); seg(g, mid, end, 0.008, RUBBER);
    cyl(g, 0.018, 0.03, GUN, -1.31, 0.22, gz, 0, 0, PI / 2, { seg: 8 });                                   // gland in the cabinet foot
  }
  // earth strap from the earth stud down into the sand fillet
  box(g, 0.02, 0.09, 0.004, GALV, -1.5, 0.12, 0.6);
  // cable glands, earth stud, drain plug, document pocket, hazard plate
  for (const gx of [-1.2, -1.05, -0.9]) cyl(g, 0.02, 0.05, GUN, gx, 0.3, EZ + 0.03, PI / 2, 0, 0, { seg: 8 });
  cyl(g, 0.01, 0.05, GALV, -1.5, 0.17, 0.56, PI / 2, 0, 0, { seg: 6 }); box(g, 0.04, 0.04, 0.01, GALV, -1.5, 0.19, 0.555);
  cyl(g, 0.02, 0.02, GUN, 0.3, 0.06, 0.61, PI / 2, 0, 0, { seg: 8 }); streak(g, 'pz', 0.3, 0.04, 0.6, 0.03, 0.05);
  box(g, 0.012, 0.22, 0.16, mO(0.35), -1.318, 0.75, 0.15); box(g, 0.006, 0.02, 0.16, GUN, -1.325, 0.85, 0.15);
  box(g, 0.16, 0.16, 0.008, mYel, -0.97, 1.3, EZ + 0.02, 0, 0, PI / 4); box(g, 0.07, 0.07, 0.006, GUN, -0.97, 1.3, EZ + 0.026, 0, 0, PI / 4);

  fillet(g, 3.0, 0.1, 0.1, 0, 0, 0.6, 0); fillet(g, 1.1, 0.2, 0.12, -1.6, 0, 0, -PI / 2); fillet(g, 1.1, 0.2, 0.12, 1.6, 0, 0, PI / 2);

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
