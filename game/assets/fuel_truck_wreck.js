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

  // ---- fuel truck wreck, strategy c1: profiles. Tank and wheels are lathes, cab walls are plates with real openings, rails are C-channels. ----
  const mRed = (f) => M(tint(P.red, f), 'metal', { roughness: 0.88, metalness: 0.08, side: DS });
  const mTan = (f) => M(tint(P.tank, f), 'metal', { roughness: 0.84, metalness: 0.1, side: DS });
  const SCORCH = M(0x232426, 'metal', { roughness: 0.95, metalness: 0.05, side: DS });
  const INT = M(0x2e3032, 'metal', { roughness: 0.92, metalness: 0.05 });
  const FRAME = M(tint(P.steel, -0.08), 'metal', { roughness: 0.82, metalness: 0.2, side: DS });
  const TYRE = new THREE.MeshStandardMaterial({ color: 0x262628, roughness: 0.95, metalness: 0, side: DS });
  const RIM = M(tint(P.gun, 0.1), 'metal', { roughness: 0.75, metalness: 0.35, side: DS });
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // a plate in the XY plane from an outline and holes, thickness t centred on z = 0
  function plate(outline, holes, t) {
    const s = new THREE.Shape(); s.moveTo(outline[0][0], outline[0][1]); for (let i = 1; i < outline.length; i++) s.lineTo(outline[i][0], outline[i][1]); s.closePath();
    for (const h of holes || []) { const p = new THREE.Path(); p.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]); p.closePath(); s.holes.push(p); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); geo.translate(0, 0, -t / 2); return geo;
  }
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  // chassis rails as C-channels extruded along x
  function channel(len, h, w, t) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, t); s.lineTo(t, t); s.lineTo(t, h - t); s.lineTo(w, h - t); s.lineTo(w, h); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(-w / 2, -h / 2, -len / 2); geo.rotateY(PI / 2); return geo;
  }
  for (const sz of [-1, 1]) mesh(g, channel(7.7, 0.25, 0.12, 0.03), FRAME, -0.15, 0.95, sz * 0.45, 0, sz > 0 ? PI : 0, 0);
  for (let i = 0; i < 7; i++) { mesh(g, channel(0.9, 0.2, 0.08, 0.02), FRAME, -3.6 + i * 1.05, 0.95, 0, 0, PI / 2, 0); streak(g, 'pz', -3.6 + i * 1.05, 0.83, 0.49, 0.12, 0.08); }
  cyl(g, 0.04, 4.2, STEEL, -0.6, 0.86, 0, 0, 0, PI / 2);
  // wheels: tyre and dished rim as lathes, axis turned to z
  const tyreGeo = new THREE.LatheGeometry([V2(0.34, -0.15), V2(0.47, -0.15), V2(0.525, -0.09), V2(0.525, 0.09), V2(0.47, 0.15), V2(0.34, 0.15), V2(0.34, -0.15)], 20);
  const rimGeo = new THREE.LatheGeometry([V2(0.0, 0.05), V2(0.11, 0.05), V2(0.13, -0.03), V2(0.31, -0.03), V2(0.34, -0.15), V2(0.345, 0.15)], 20);
  const wheel = (x, z, y) => {
    y = y === undefined ? 0.525 : y; const out = z > 0 ? 1 : -1;
    mesh(g, tyreGeo, TYRE, x, y, z, out * PI / 2, 0, 0); mesh(g, rimGeo, RIM, x, y, z, out * PI / 2, 0, 0);
    for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; cyl(g, 0.016, 0.03, GUN, x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.2, z + out * 0.06, PI / 2, 0, 0, { seg: 6 }); }
  };
  for (const ax of [-1.5, -2.8]) { cyl(g, 0.07, 2.2, STEEL, ax, 0.525, 0, PI / 2, 0, 0); for (const sz of [-1, 1]) { wheel(ax, sz * 0.8); wheel(ax, sz * 1.1); box(g, 1.1, 0.09, 0.09, STEEL, ax, 0.74, sz * 0.45); } }
  cyl(g, 0.06, 2.0, STEEL, 2.5, 0.5, 0.05, PI / 2, 0, 0.06);
  box(g, 1.1, 0.09, 0.09, STEEL, 2.5, 0.74, 0.45);
  wheel(2.5, 1.05);
  mesh(g, new THREE.LatheGeometry([V2(0, -0.1), V2(0.2, -0.1), V2(0.22, 0.1), V2(0.16, 0.1), V2(0.16, 0.0), V2(0.0, 0.0)], 14), GUN, 2.5, 0.24, -1.0, -PI / 2, 0, 0);
  fillet(g, 0.5, 0.25, 0.12, 2.5, 0, -1.1, PI);
  mesh(g, new THREE.LatheGeometry([V2(0, 0), V2(0.24, 0), V2(0.27, 0.05), V2(0.27, 1.05), V2(0.24, 1.1), V2(0, 1.1)], 14), mTan(0.1), 0.05, 0.62, 1.0, 0, 0, -PI / 2);
  box(g, 0.08, 0.5, 0.06, STEEL, 0.25, 0.7, 1.0); box(g, 0.08, 0.5, 0.06, STEEL, 0.95, 0.7, 1.0);
  box(g, 0.7, 0.4, 0.5, GUN, 0.6, 0.62, -0.9);

  // cab: plates with the windscreen, windows and door openings cut through them
  const cab = new THREE.Group(); cab.position.set(2.55, -0.17, 0); cab.rotation.set(-0.04, 0, -0.04); g.add(cab);
  const cS = mRed(0.2), cN = mRed(0.07), cR = mRed(0.38);
  box(cab, 2.0, 0.06, 2.3, INT, 0, 1.0, 0);
  mesh(cab, plate(rect(-1.15, 0.55, 1.15, 2.6), [rect(-1.0, 1.6, 1.0, 2.35)], 0.06), cS, 1.0, 0, 0, 0, -PI / 2, 0);              // front wall, windscreen gone
  mesh(cab, plate(rect(-1.15, 1.0, 1.15, 2.6), [rect(-0.6, 1.7, 0.6, 2.3)], 0.06), cN, -1.0, 0, 0, 0, -PI / 2, 0);              // rear wall with window
  for (let i = 0; i < 6; i++) box(cab, 0.03, 0.03, 1.6, GUN, 1.035, 1.05 + i * 0.07, 0);
  for (const sz of [-1, 1]) { disc(cab, 0.12, GALV, 1.035, 0.85, sz * 0.9, 0, PI / 2, 0); disc(cab, 0.05, GUN, 1.04, 0.85, sz * 0.9, 0, PI / 2, 0); }
  for (const sz of [-1, 1]) {
    const ms = sz > 0 ? cS : cN;
    const side = [[-1.0, 1.0], [-0.2, 1.0], [-0.2, 2.4], [0.85, 2.4], [0.85, 1.0], [1.0, 1.0], [1.0, 2.6], [-1.0, 2.6]];
    mesh(cab, plate(side, [rect(-0.9, 1.65, -0.3, 2.3)], 0.05), ms, 0, 0, sz * 1.125);
    box(cab, 0.3, 0.06, 0.4, GUN, 0.3, 0.78, sz * 1.18); box(cab, 0.3, 0.06, 0.4, GUN, 0.3, 0.55, sz * 1.18);
    streak(cab, sz > 0 ? 'pz' : 'nz', -0.6, 1.6, sz * 1.15, 0.3, 0.3);
    const dr = new THREE.Group(); dr.position.set(0.85, 0, sz * 1.15); dr.rotation.y = sz > 0 ? 0.245 : -0.105; cab.add(dr);
    mesh(dr, plate(rect(-1.05, 1.0, 0, 2.4), [rect(-0.98, 1.78, -0.07, 2.32)], 0.05), ms, 0, 0, 0);
    box(dr, 0.12, 0.03, 0.05, GALV, -0.6, 1.5, sz * 0.03);
    for (const hy of [1.2, 2.2]) { box(dr, 0.06, 0.12, 0.07, STEEL, 0.02, hy, 0); streak(dr, sz > 0 ? 'pz' : 'nz', 0.02, hy - 0.06, sz * 0.035, 0.25, 0.06); }
    box(cab, 0.05, 0.05, 0.1, STEEL, 0.95, 2.3, sz * 1.17); streak(cab, sz > 0 ? 'pz' : 'nz', 0.95, 2.27, sz * 1.15, 0.3, 0.06); // mirror bracket, head torn off
  }
  // roof: a front to back profile with the dent in it, extruded across the cab
  {
    const s = new THREE.Shape(); s.moveTo(-1.0, 2.55); s.lineTo(1.0, 2.55); s.lineTo(1.0, 2.6); s.lineTo(0.5, 2.6); s.lineTo(0.3, 2.53); s.lineTo(-0.3, 2.53); s.lineTo(-0.5, 2.6); s.lineTo(-1.0, 2.6); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 2.3, bevelEnabled: false }); geo.translate(0, 0, -1.15);
    mesh(cab, geo, cR, 0, 0.003, 0);
    box(cab, 0.5, 0.03, 0.6, cR, 0.7, 2.615, 0);
    dust(cab, 0.45, 2.3, 0.75, 2.603, 0); dust(cab, 0.45, 2.3, -0.75, 2.603, 0); dust(cab, 0.6, 2.2, 0, 2.533, 0, 0.06);
  }
  box(cab, 0.5, 0.45, 0.6, INT, -0.3, 1.25, 0.55); box(cab, 0.15, 0.55, 0.6, INT, -0.55, 1.75, 0.55);
  box(cab, 0.5, 0.45, 0.6, INT, -0.3, 1.25, -0.55); box(cab, 0.15, 0.55, 0.6, INT, -0.55, 1.75, -0.55);
  box(cab, 0.4, 0.3, 2.1, INT, 0.75, 1.45, 0); box(cab, 1.2, 0.35, 0.7, GUN, 0.1, 1.2, 0);
  mesh(cab, new THREE.TorusGeometry(0.2, 0.02, 8, 14), GUN, 0.45, 1.75, 0.55, 0, -PI / 2 + 0.4, 0);
  mesh(cab, channel(2.4, 0.25, 0.2, 0.03), STEEL, 1.35, 0.67, 0, 0, PI / 2, 0); box(cab, 0.2, 0.06, 2.4, RUST, 1.35, 0.52, 0);

  // tank: two lathes (tan, scorched) with the saddle bands in the profile, dished ends, laid along x and squashed to an ellipse
  const tank = new THREE.Group(); tank.position.set(0, 2.05, 0); g.add(tank);
  const front = [V2(0, 0), V2(0.85, 0), V2(1.1, 0.24), V2(1.1, 0.66), V2(1.13, 0.66), V2(1.13, 0.78), V2(1.1, 0.78), V2(1.1, 2.26), V2(1.13, 2.26), V2(1.13, 2.38), V2(1.1, 2.38), V2(1.1, 3.62)];
  const rear = [V2(1.1, 3.62), V2(1.1, 4.06), V2(1.14, 4.06), V2(1.14, 4.18), V2(1.1, 4.18), V2(1.1, 5.3), V2(0.85, 5.54), V2(0, 5.54)];
  const lathe = (pts, m) => { const c = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), m); c.rotation.z = PI / 2; c.scale.set(0.68, 1, 1); c.position.set(1.42, 0, 0); c.castShadow = c.receiveShadow = true; tank.add(c); return c; };
  lathe(front, mTan(0.14)); lathe(rear, SCORCH);
  // plate courses: a welded seam ring and a rivet row at each course line, rust running down from the rivets on the sides
  const RIVET = M(tint(P.gun, 0.05), 'metal', { roughness: 0.55, metalness: 0.45 });
  for (const [yl, scorched] of [[1.5, false], [3.0, false], [4.7, true]]) {
    const x = 1.42 - yl;
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(1.112, 1.112, 0.03, 20, 1, true), scorched ? SCORCH : RUST); seam.rotation.z = PI / 2; seam.scale.set(0.68, 1, 1); seam.position.set(x, 0, 0); tank.add(seam);
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * PI * 2, cy = Math.cos(a) * 0.68 * 1.115, cz = Math.sin(a) * 1.115;
      const rv = box(tank, 0.045, 0.028, 0.028, RIVET, x + (k % 2 ? 0.05 : -0.05), cy, cz, Math.atan2(cy / 0.68, cz), 0, 0);
      if (!scorched && Math.abs(cz) > 0.9 && cy > -0.3 && cy < 0.5 && k % 3 === 0) streak(tank, cz > 0 ? 'pz' : 'nz', x, cy - 0.02, cz > 0 ? 1.1 : -1.1, 0.25 + 0.1 * (k % 2), 0.05);
    }
  }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.1, 20), GUN); ring.rotation.z = PI / 2; ring.scale.set(0.68, 1, 1); ring.position.set(-2.2, 0, 0); tank.add(ring);
  for (const bx of [0.7, -0.9, -2.7]) {
    for (const sz of [-1, 1]) streak(tank, sz > 0 ? 'pz' : 'nz', bx, 0.05, sz * 1.1, 0.5, 0.14);
    const s = new THREE.Shape(); s.moveTo(-0.85, 0); s.lineTo(0.85, 0); s.lineTo(0.6, 0.45); s.lineTo(-0.6, 0.45); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: false }); geo.translate(0, 0, -0.17); geo.rotateY(PI / 2);
    mesh(g, geo, FRAME, bx, 1.05, 0); streak(g, 'pz', bx, 1.1, 0.86, 0.2, 0.3);
  }
  box(g, 5.2, 0.12, 1.2, FRAME, -1.2, 1.15, 0);
  mesh(tank, new THREE.LatheGeometry([V2(0, 0), V2(0.25, 0), V2(0.25, 0.14), V2(0.29, 0.14), V2(0.29, 0.18), V2(0, 0.18)], 14), mTan(0.02), -0.3, 0.72, 0);
  box(tank, 0.08, 0.05, 0.1, STEEL, -0.3, 0.95, 0.26); streak(tank, 'pz', -0.3, 0.73, 0.25, 0.2, 0.2);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.106, 1.106, 3.3, 20, 1, true, PI / 2 - 0.55, 1.1), M(P.sandSun, 'ground', { roughness: 0.95, side: DS }));
  crown.rotation.z = PI / 2; crown.scale.set(0.68, 1, 1); crown.position.set(-0.4, 0, 0); tank.add(crown);
  for (const sz of [-1, 1]) cyl(g, 0.02, 1.6, STEEL, -4.15, 1.9, sz * 0.2 + 0.7);
  for (let i = 0; i < 5; i++) cyl(g, 0.012, 0.4, STEEL, -4.15, 1.25 + i * 0.32, 0.7, PI / 2, 0, 0);
  // valve cabinet with a hanging door
  box(g, 0.6, 0.6, 1.0, GUN, -3.65, 1.42, 0); box(g, 0.02, 0.6, 1.0, INT, -3.94, 1.42, 0);
  cyl(g, 0.04, 0.3, STEEL, -3.8, 1.3, -0.2, 0, 0, PI / 2); cyl(g, 0.04, 0.3, STEEL, -3.8, 1.5, 0.15, 0, 0, PI / 2);
  mesh(g, new THREE.TorusGeometry(0.08, 0.015, 8, 10), mRed(0), -3.92, 1.5, 0.15, 0, PI / 2, 0);
  const cd = new THREE.Group(); cd.position.set(-3.96, 1.42, 0.5); cd.rotation.y = 1.1; g.add(cd);
  mesh(cd, plate(rect(-0.98, -0.29, 0, 0.29), [], 0.03), mTan(0.05), 0, 0, 0, 0, PI / 2, 0);
  box(cd, 0.04, 0.1, 0.06, STEEL, 0, 0.2, -0.05); box(cd, 0.04, 0.1, 0.06, STEEL, 0, -0.2, -0.05); streak(cd, 'nx', -0.02, 0.15, -0.05, 0.3, 0.06);
  mesh(g, channel(2.3, 0.12, 0.1, 0.02), STEEL, -4.0, 0.75, 0, 0, PI / 2, 0);
  box(g, 0.08, 0.3, 0.06, STEEL, -3.95, 0.9, 0.7); box(g, 0.08, 0.3, 0.06, STEEL, -3.95, 0.9, -0.7);
  for (const sz of [-1, 1]) { box(g, 0.03, 0.1, 0.15, mRed(-0.1), -4.06, 0.75, sz * 1.0); box(g, 0.03, 0.5, 0.45, RUBBER, -3.35, 0.45, sz * 0.95); }
  fillet(g, 5.0, 0.2, 0.18, -0.8, 0, -1.1, PI);
  fillet(g, 2.2, 0.2, 0.12, -0.8, 0, 1.05, 0);
  box(g, 4.6, 0.08, 1.3, SAND, -0.5, 0.04, 0);
  fillet(g, 0.7, 0.2, 0.12, -1.5, 0, 1.2, 0); fillet(g, 0.7, 0.2, 0.12, -2.8, 0, 1.2, 0); fillet(g, 0.6, 0.2, 0.12, 2.5, 0, 1.2, 0);

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
