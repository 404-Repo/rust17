// external_steel_stair candidate 1: profiles. Each stringer is the true stringer
// polygon (vertical foot cut, sloped web, head into the landing frame) extruded as a
// web with flange strips; each tread is one extrude of five bar rectangles plus the
// nosing; each handrail is one tube swept from the foot post, up the slope, level
// over the landing and down the end post; foot and landing plates are extruded.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const tint = (hex, f) => {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
    const gg = Math.min(255, Math.round(((hex >> 8) & 255) * f));
    const b = Math.min(255, Math.round((hex & 255) * f));
    return (r << 16) | (gg << 8) | b;
  };
  const STEEL = 0x4f5257, GALV = 0x9ea3a1, RUST = 0x6b4426, SAND = 0xcdb88e;
  const steelL = M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true);
  const steelR = M(STEEL, 'metal', 0.82, 0.3, true);
  const steelD = M(tint(STEEL, 0.9), 'metal', 0.85, 0.3, true);
  const galv = M(GALV, 'metal', 0.7, 0.55, true);
  const galvD = M(tint(GALV, 0.88), 'metal', 0.75, 0.5);
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const sand = M(SAND, 'ground', 0.95, 0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);

  const RISE = 2.3 / 14, GO = 0.254, N = 13, ZF0 = -1.727;
  const nosing = (z) => RISE * (1 + (z - ZF0) / GO);
  const A = Math.atan2(RISE, GO), COS = Math.cos(A);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bx = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  // shapes drawn in (z, y); rotation.y = -PI/2 sends shape x to world z and the extrusion toward -x
  const ext = (shape, depth, mat, x0) => { const mm = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat); mm.rotation.y = -Math.PI / 2; mm.position.x = x0; g.add(mm); return mm; };
  const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.lineTo(pts[0][0], pts[0][1]); return s; };

  // ---- stringers: polygon web, flange strips, bolts with rust -----------------------------
  const topLine = (z) => nosing(z) - 0.085, D = 0.25 / COS;
  const zBot0 = ZF0 + GO * ((0.085 + D) / RISE - 1);          // where the bottom edge meets the ground
  const web = poly([[-1.55, 0], [-1.55, topLine(-1.55)], [1.4, topLine(1.4)], [1.4, 2.29], [1.8, 2.29], [1.8, 2.02], [1.5, 2.02], [1.5, topLine(1.5) - D], [zBot0, 0]]);
  for (const sx of [-1, 1]) {
    const mat = sx > 0 ? steelL : steelR;
    ext(web, 0.012, mat, sx * 0.58 + 0.006);
    const fl = 2.95 / COS;
    const ft = bx(0.06, 0.012, fl, steelD, sx * 0.555, topLine(-0.075) - 0.006, -0.075); ft.rotation.x = -A;
    const fb = bx(0.06, 0.012, fl, steelD, sx * 0.555, topLine(-0.075) - D + 0.006, -0.075); fb.rotation.x = -A;
    for (const z of [-1.2, -0.6, 0, 0.6, 1.2]) {
      const y = topLine(z) - D / 2;
      for (const dy of [0.05, -0.05]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 6), gun); b.rotation.z = Math.PI / 2; b.position.set(sx * 0.592, y + dy, z); g.add(b); }
      bx(0.004, 0.16, 0.03, rust, sx * 0.59, y - 0.14, z + 0.02);
    }
    bx(0.004, 0.2, 0.14, rust, sx * 0.59, 2.1, 1.62);
  }

  // ---- treads: one extrude per tread (five bars and a nosing), carriers, dust -------------
  const barsShape = [];
  for (let k = 0; k < 5; k++) barsShape.push(poly([[-0.1 + k * 0.05 - 0.003, -0.03], [-0.1 + k * 0.05 + 0.003, -0.03], [-0.1 + k * 0.05 + 0.003, 0], [-0.1 + k * 0.05 - 0.003, 0]]));
  barsShape.push(poly([[-0.145, -0.04], [-0.105, -0.04], [-0.105, 0], [-0.145, 0]]));
  barsShape.push(poly([[-0.11, -0.036], [0.11, -0.036], [0.11, -0.03], [-0.11, -0.03]]));
  const treadGeo = new THREE.ExtrudeGeometry(barsShape, { depth: 1.1, bevelEnabled: false });
  for (let i = 0; i < N; i++) {
    const yt = (i + 1) * RISE, zc = -1.6 + i * GO;
    const t = new THREE.Mesh(treadGeo, i % 2 ? galv : M(tint(GALV, 0.95), 'metal', 0.72, 0.55, true));
    t.rotation.y = -Math.PI / 2; t.position.set(0.55, yt, zc); g.add(t);
    for (const sx of [-1, 1]) bx(0.03, 0.04, 0.25, steelD, sx * 0.535, yt - 0.05, zc);
    bx(0.9, 0.004, 0.14, sand, (i % 2 ? 0.05 : -0.05), yt + 0.002, zc + 0.01);
  }

  // ---- foot plates and landing plate, extruded with bolt bosses ---------------------------
  for (const sx of [-1, 1]) {
    ext(poly([[-1.8, 0], [-1.45, 0], [-1.45, 0.02], [-1.7, 0.02], [-1.7, 0.035], [-1.75, 0.035], [-1.75, 0.02], [-1.8, 0.02]]), 0.22, steelD, sx > 0 ? 0.65 : -0.43);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), gun); b.position.set(sx * 0.62, 0.045, -1.725); g.add(b);
    bx(0.06, 0.004, 0.06, rust, sx * 0.62, 0.021, -1.66);
  }
  ext(poly([[1.5, 2.28], [1.8, 2.28], [1.8, 2.3], [1.5, 2.3]]), 1.24, steelD, 0.62);
  bx(1.0, 0.005, 0.24, sand, 0, 2.302, 1.65);
  for (const [x, z] of [[-0.5, 1.55], [0.5, 1.55], [-0.5, 1.75], [0.5, 1.75]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), gun); b.position.set(x, 2.31, z); g.add(b); bx(0.05, 0.004, 0.04, rust, x, 2.3, z + 0.04); }

  // ---- handrails: one swept tube per side, knee rail, mid post ---------------------------
  for (const sx of [-1, 1]) {
    const x = sx * 0.63, mat = sx > 0 ? steelL : steelR;
    const path = new THREE.CurvePath();
    const zA = -1.4, zB = 1.4, r = 0.1;
    path.add(new THREE.LineCurve3(V3(x, nosing(zA) - 0.09, zA), V3(x, nosing(zA) + 1.0 - r, zA)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x, nosing(zA) + 1.0 - r, zA), V3(x, nosing(zA) + 1.0, zA), V3(x, nosing(zA + r) + 1.0, zA + r)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zA + r) + 1.0, zA + r), V3(x, nosing(zB) + 1.0, zB)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zB) + 1.0, zB), V3(x, nosing(zB) + 1.0, 1.8 - r)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x, nosing(zB) + 1.0, 1.8 - r), V3(x, nosing(zB) + 1.0, 1.8), V3(x, nosing(zB) + 1.0 - r, 1.8)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zB) + 1.0 - r, 1.8), V3(x, 2.3, 1.8)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.021, 7, false), mat));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.09, 8), mat); mid.position.set(x, nosing(0) + 0.455, 0); g.add(mid);
    const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.8 / COS, 8), mat); knee.rotation.x = Math.PI / 2 - A; knee.position.set(x, nosing(0) + 0.5, 0); g.add(knee);
    for (const z of [zA, 0, zB]) { bx(0.05, 0.05, 0.012, steelD, x - sx * 0.02, nosing(z) - 0.04, z); bx(0.03, 0.08, 0.004, rust, x - sx * 0.04, nosing(z) - 0.11, z); }
    const cap = bx(0.02, 0.006, 2.6, sx > 0 ? M(tint(STEEL, 1.16), 'metal', 0.8, 0.3) : sand, x, nosing(0) + 1.022, 0); cap.rotation.x = -A;
  }

  // ---- sand fillet at the foot --------------------------------------------------------
  bx(1.3, 0.1, 0.55, sand, 0, 0.05, -1.62);
  bx(0.4, 0.06, 0.4, sand, 0.45, 0.03, -1.35);
  bx(0.35, 0.05, 0.3, sand, -0.45, 0.025, -1.3);

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
