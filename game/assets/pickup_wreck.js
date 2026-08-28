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

  // ---- pickup wreck, strategy c1: profiles. Body sides are one extruded silhouette with wheel arches and door openings cut in it,
  //      wheels are lathes, the bull bar is a tube swept along a path, the front panel has real headlight holes. ----
  const mB = (f) => M(tint(P.tank, f), 'metal', { roughness: 0.86, metalness: 0.08, side: DS });
  const BS = mB(0.3), BN = mB(0.12), BR = mB(0.62), BED = mB(0.05);
  const INT = M(0x2e3032, 'metal', { roughness: 0.92, metalness: 0.05 });
  const TYRE = new THREE.MeshStandardMaterial({ color: 0x262628, roughness: 0.95, metalness: 0, side: DS });
  const RIM = M(tint(P.gun, 0.12), 'metal', { roughness: 0.75, metalness: 0.35, side: DS });
  const V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function plate(outline, holes, t) {
    const s = new THREE.Shape(); s.moveTo(outline[0][0], outline[0][1]); for (let i = 1; i < outline.length; i++) s.lineTo(outline[i][0], outline[i][1]); s.closePath();
    for (const h of holes || []) { const p = new THREE.Path(); p.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]); p.closePath(); s.holes.push(p); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 8 }); geo.translate(0, 0, -t / 2); return geo;
  }
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const arc = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };

  // chassis and wheels
  for (const sz of [-1, 1]) box(g, 4.4, 0.12, 0.06, STEEL, 0, 0.4, sz * 0.55);
  for (const cx of [-1.8, -0.4, 1.2]) box(g, 0.06, 0.1, 1.1, STEEL, cx, 0.4, 0);
  cyl(g, 0.04, 1.5, STEEL, 1.75, 0.375, 0, PI / 2, 0, 0); cyl(g, 0.04, 1.5, STEEL, -1.35, 0.375, 0, PI / 2, 0, 0);
  for (const sz of [-1, 1]) box(g, 0.9, 0.05, 0.06, STEEL, -1.35, 0.3, sz * 0.55);
  cyl(g, 0.03, 2.2, STEEL, -1.0, 0.33, -0.6, 0, 0, PI / 2); box(g, 0.6, 0.25, 0.5, GUN, -0.9, 0.35, 0.3);
  const tyreGeo = new THREE.LatheGeometry([V2(0.24, -0.12), V2(0.33, -0.12), V2(0.375, -0.07), V2(0.375, 0.07), V2(0.33, 0.12), V2(0.24, 0.12), V2(0.24, -0.12)], 14);
  const rimGeo = new THREE.LatheGeometry([V2(0, 0.04), V2(0.08, 0.04), V2(0.1, -0.02), V2(0.22, -0.02), V2(0.24, -0.12), V2(0.245, 0.12)], 14);
  function wheel(x, z, flat) {
    const y = flat ? 0.27 : 0.375, out = z > 0 ? 1 : -1;
    const t = mesh(g, tyreGeo, TYRE, x, y, z, out * PI / 2, 0, 0); if (flat) t.scale.set(1.15, 1, 0.72);
    mesh(g, rimGeo, RIM, x, y, z, out * PI / 2, 0, 0);
    for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; cyl(g, 0.012, 0.02, GUN, x + Math.cos(a) * 0.14, y + Math.sin(a) * 0.14, z + out * 0.045, PI / 2, 0, 0, { seg: 6 }); }
    fillet(g, 0.7, 0.12, 0.1, x, 0, z + out * 0.05, z > 0 ? 0 : PI);
  }
  wheel(1.75, 0.8); wheel(1.75, -0.8); wheel(-1.35, 0.8); wheel(-1.35, -0.8, true);
  fillet(g, 1.0, 0.15, 0.16, -1.35, 0, -0.9, PI); fillet(g, 0.8, 0.3, 0.14, -1.35, 0, -0.65, 0);

  // body side silhouette: rear post, bed, cab, wing, with wheel arches and the door opening cut out
  // one simple polygon, walked along the bottom edge from the rear with the two arch cutouts and the door notch, then back along the top
  const side = [[-2.1, 0.45], ...arc(-1.35, 0.4, 0.5, PI - 0.1, 0.1, 8), [-0.3, 0.45], [-0.3, 1.72], [0.9, 1.72], [0.9, 0.45], ...arc(1.75, 0.4, 0.5, PI - 0.1, 0.1, 8),
    [2.35, 0.45], [2.35, 1.05], [1.3, 1.05], [1.25, 1.15], [1.07, 1.78], [-0.42, 1.78], [-0.42, 1.15], [-0.5, 1.15], [-0.5, 1.05], [-2.1, 1.05]];
  for (const sz of [-1, 1]) {
    const ms = sz > 0 ? BS : BN;
    mesh(g, plate(side, [], 0.05), ms, 0, 0, sz * 0.9);
    box(g, 1.2, 0.15, 0.05, ms, 0.3, 0.525, sz * 0.9); box(g, 1.2, 0.03, 0.005, RUST, 0.3, 0.47, sz * 0.93);
    box(g, 0.75, 0.03, 0.03, RUST, 1.675, 0.79, sz * 0.92); box(g, 1.0, 0.025, 0.02, RUST, -1.35, 0.68, sz * 0.92);
    streak(g, sz > 0 ? 'pz' : 'nz', 2.05, 1.05, sz * 0.925, 0.35, 0.06); streak(g, sz > 0 ? 'pz' : 'nz', -1.5, 1.0, sz * 0.925, 0.25, 0.3);
    box(g, 1.6, 0.03, 0.08, ms, -1.3, 1.06, sz * 0.9);
    box(g, 0.9, 0.25, 0.3, ms, -1.35, 0.875, sz * 0.75);
    box(g, 0.75, 0.45, 0.04, GUN, 1.675, 0.775, sz * 0.62);
    box(g, 1.05, 0.03, 0.32, BR, 1.825, 1.065, sz * 0.775); dust(g, 1.05, 0.32, 1.825, 1.08, sz * 0.775, 0.03, 0.006);
    box(g, 0.02, 0.12, 0.08, M(tint(P.red, -0.1), 'metal', { roughness: 0.8 }), -2.13, 0.9, sz * 0.88);
    cyl(g, 0.008, 0.55, GALV, -2.3, 0.9, sz * 0.82, 0, 0, 1.0);
    // door: plate with the window cut out, hung on the front edge
    const dr = new THREE.Group(); dr.position.set(0.9, 0, sz * 0.9); dr.rotation.y = sz > 0 ? 0.14 : 0; g.add(dr);
    mesh(dr, plate(rect(-1.2, 0.6, 0, 1.75), [rect(-1.14, 1.15, -0.06, 1.69)], 0.05), ms, 0, 0, 0);
    box(dr, 0.14, 0.03, 0.04, GALV, -0.95, 1.05, sz * 0.03); box(dr, 1.2, 0.04, 0.005, RUST, -0.6, 0.62, sz * 0.03);
    for (const hy of [0.75, 1.05]) { box(dr, 0.05, 0.1, 0.06, STEEL, 0.0, hy, 0); streak(dr, sz > 0 ? 'pz' : 'nz', 0.0, hy - 0.05, sz * 0.03, 0.2, 0.05); }
    box(dr, 0.03, 0.03, 0.08, STEEL, -1.05, 1.35, sz * 0.06);   // mirror arm stub, the head is gone with everything else worth taking
  }
  // cab structure and interior
  box(g, 1.8, 0.05, 1.75, GUN, 0.4, 0.45, 0);
  mesh(g, plate(rect(-0.9, 0.45, 0.9, 1.78), [rect(-0.45, 1.2, 0.45, 1.65)], 0.05), BN, -0.5, 0, 0, 0, PI / 2, 0);   // rear wall with window
  box(g, 1.75, 0.05, 1.8, BR, 0.375, 1.775, 0); dust(g, 1.75, 1.8, 0.375, 1.8, 0, 0.06);
  box(g, 1.75, 0.03, 0.04, RUST, 0.375, 1.76, 0.91);
  box(g, 0.08, 0.1, 1.8, BS, 1.05, 1.75, 0);
  box(g, 0.35, 0.06, 1.75, BR, 1.1, 1.12, 0); box(g, 0.3, 0.25, 1.7, INT, 1.12, 0.97, 0);
  box(g, 0.55, 0.4, 1.5, INT, 0.05, 0.8, 0); box(g, 0.15, 0.5, 1.5, INT, -0.3, 1.25, 0);
  mesh(g, new THREE.TorusGeometry(0.18, 0.02, 8, 14), GUN, 0.85, 1.2, 0.5, 0, PI / 2, 0.4);
  for (const sz of [-1, 1]) { cyl(g, 0.03, 1.1, STEEL, -0.6, 1.3, sz * 0.7); cyl(g, 0.03, 1.18, STEEL, -0.85, 1.315, sz * 0.7, 0, 0, -0.437); }
  cyl(g, 0.03, 1.46, STEEL, -0.6, 1.85, 0, PI / 2, 0, 0);
  // engine bay
  box(g, 0.05, 0.65, 1.7, BN, 1.3, 0.775, 0);
  box(g, 0.7, 0.45, 0.55, GUN, 1.8, 0.75, 0); box(g, 0.65, 0.18, 0.4, M(tint(P.gun, 0.15), 'metal', { roughness: 0.7, metalness: 0.4 }), 1.8, 1.06, 0);
  mesh(g, new THREE.LatheGeometry([V2(0, 0), V2(0.15, 0), V2(0.16, 0.08), V2(0.13, 0.1), V2(0, 0.1)], 14), GUN, 1.75, 1.15, 0.05);
  cyl(g, 0.03, 0.4, RUBBER, 1.95, 1.05, 0.35, 0, 0, PI / 2); box(g, 0.25, 0.2, 0.18, RUBBER, 1.5, 0.98, 0.6);
  box(g, 0.06, 0.5, 0.9, GUN, 2.28, 0.8, 0); disc(g, 0.2, GUN, 2.2, 0.8, 0, 0, PI / 2, 0); cyl(g, 0.03, 0.5, RUBBER, 2.05, 1.05, -0.3, 0, 0, PI / 2);
  // front panel with headlight holes, lamps set behind them
  const fp = new THREE.Shape(); fp.moveTo(-0.875, 0.55); fp.lineTo(0.875, 0.55); fp.lineTo(0.875, 1.05); fp.lineTo(-0.875, 1.05); fp.closePath();
  for (const sz of [-1, 1]) { const h = new THREE.Path(); h.absarc(sz * 0.62, 0.85, 0.11, 0, PI * 2, false); fp.holes.push(h); }
  const fpg = new THREE.ExtrudeGeometry(fp, { depth: 0.05, bevelEnabled: false, curveSegments: 7 }); fpg.translate(0, 0, -0.025); fpg.rotateY(-PI / 2);
  mesh(g, fpg, BS, 2.35, 0, 0);
  for (const sz of [-1, 1]) { disc(g, 0.11, GALV, 2.34, 0.85, sz * 0.62, 0, PI / 2, 0); disc(g, 0.05, GUN, 2.345, 0.85, sz * 0.62, 0, PI / 2, 0); box(g, 0.02, 0.06, 0.12, M(tint(P.yellow, 0.25), 'metal', { roughness: 0.8 }), 2.38, 0.65, sz * 0.7); }
  for (let i = 0; i < 6; i++) box(g, 0.02, 0.02, 0.8, GUN, 2.38, 0.62 + i * 0.065, 0);
  box(g, 0.1, 0.12, 1.8, STEEL, 2.45, 0.5, 0);
  // bull bar: a 60 mm tube bent round a path
  const path = new THREE.CatmullRomCurve3([V3(2.5, 0.38, -0.55), V3(2.62, 0.75, -0.55), V3(2.62, 1.1, -0.5), V3(2.62, 1.15, -0.4), V3(2.62, 1.15, 0.4), V3(2.62, 1.1, 0.5), V3(2.62, 0.75, 0.55), V3(2.5, 0.38, 0.55)], false, 'catmullrom', 0.2);
  const tube = new THREE.Shape(); tube.absarc(0, 0, 0.03, 0, PI * 2, false);
  mesh(g, new THREE.ExtrudeGeometry(tube, { steps: 28, bevelEnabled: false, extrudePath: path, curveSegments: 6 }), STEEL, 0, 0, 0);
  cyl(g, 0.03, 1.0, STEEL, 2.6, 0.75, 0, PI / 2, 0, 0);
  for (const sz of [-1, 1]) box(g, 0.15, 0.04, 0.06, STEEL, 2.52, 0.5, sz * 0.5);
  // bed
  box(g, 1.6, 0.04, 1.8, BED, -1.3, 0.75, 0);
  for (let i = 0; i < 5; i++) box(g, 1.55, 0.02, 0.06, BED, -1.3, 0.78, -0.6 + i * 0.3);
  box(g, 1.3, 0.008, 1.3, SAND, -1.3, 0.794, 0.1);
  box(g, 0.05, 0.3, 1.8, BN, -0.5, 0.9, 0);
  mesh(g, plate(rect(-0.25, -0.85, 0.25, 0.85), [], 0.05), BN, -2.35, 0.735, 0, PI / 2, 0, 0);
  for (let i = 0; i < 3; i++) box(g, 0.44, 0.02, 0.05, BN, -2.35, 0.77, -0.5 + i * 0.5); dust(g, 0.5, 1.7, -2.35, 0.76, 0, 0.05, 0.006);
  box(g, 0.08, 0.1, 1.7, STEEL, -2.15, 0.42, 0);
  fillet(g, 3.6, 0.1, 0.12, 0.1, 0, -0.94, PI);

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
