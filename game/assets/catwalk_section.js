// catwalk_section candidate 1: profiles. Side channels are one C shape extruded 3 m;
// the grating is one ExtrudeGeometry of nineteen bar rectangles; each handrail with
// its two end posts is a single tube swept along a path with bent corners; the toe
// plate is an extruded L angle; end plates carry four bolt bosses and rust runs.
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
  const steelS = M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true);
  const steelN = M(STEEL, 'metal', 0.82, 0.3, true);
  const steelD = M(tint(STEEL, 0.9), 'metal', 0.85, 0.3, true);
  const galv = M(GALV, 'metal', 0.7, 0.55, true);
  const galvD = M(tint(GALV, 0.88), 'metal', 0.75, 0.5);
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const sand = M(SAND, 'ground', 0.95, 0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const L = 3.0, W = 1.2, CD = 0.15, RH = 1.0;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bx = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  const ext = (shape, depth, mat) => new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat);
  const rect = (x, y, w, h) => { const s = new THREE.Shape(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.lineTo(x, y); return s; };

  // ---- C channel profile in (z, y), opening inward, extruded along x --------------
  const cShape = (sz) => {
    const s = new THREE.Shape(); const t = 0.01, f = 0.07;
    const zo = sz * W / 2, zi = sz * (W / 2 - f), zt = sz * (W / 2 - t);
    s.moveTo(zo, 0); s.lineTo(zi, 0); s.lineTo(zi, t); s.lineTo(zt, t); s.lineTo(zt, CD - t); s.lineTo(zi, CD - t); s.lineTo(zi, CD); s.lineTo(zo, CD); s.lineTo(zo, 0);
    return s;
  };
  for (const sz of [-1, 1]) {
    const ch = ext(cShape(sz), L, sz > 0 ? steelS : steelN);
    ch.rotation.y = -Math.PI / 2; ch.position.x = L / 2; g.add(ch);        // shape x -> world z, extrude -> -x
    for (const x of [-1.0, 0, 1.0]) {
      bx(0.03, 0.03, 0.015, gun, x, CD - 0.045, sz * (W / 2 + 0.005));
      bx(0.025, 0.07, 0.004, rust, x, CD - 0.09, sz * (W / 2 + 0.008));
    }
  }
  for (const x of [-1.0, 0, 1.0]) bx(0.05, 0.1, W - 0.04, steelD, x, 0.06, 0);

  // ---- grating: nineteen bar rectangles in one extrude, plus cross rods ----------
  const nb = 19, pitch = (W - 0.08) / (nb - 1);
  const bars = [];
  for (let i = 0; i < nb; i++) bars.push(rect(-(W - 0.08) / 2 + i * pitch - 0.0025, CD - 0.03, 0.005, 0.03));
  const grate = new THREE.Mesh(new THREE.ExtrudeGeometry(bars, { depth: L - 0.02, bevelEnabled: false }), galv);
  grate.rotation.y = -Math.PI / 2; grate.position.x = L / 2 - 0.01; g.add(grate);
  for (let j = 0; j <= 20; j++) bx(0.006, 0.008, W - 0.08, galvD, -L / 2 + 0.01 + j * (L - 0.02) / 20, CD - 0.004, 0);

  // ---- toe plate as an L angle, with sand along its foot ---------------------------
  for (const sz of [-1, 1]) {
    const l = new THREE.Shape(); const z0 = sz * (W / 2 - 0.08);
    l.moveTo(z0, CD); l.lineTo(z0 + sz * 0.006, CD); l.lineTo(z0 + sz * 0.006, CD + 0.15); l.lineTo(z0, CD + 0.15); l.lineTo(z0, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD); l.lineTo(z0, CD);
    const toe = ext(l, L, sz > 0 ? steelS : steelN); toe.rotation.y = -Math.PI / 2; toe.position.x = L / 2; g.add(toe);
    bx(L - 0.4, 0.018, 0.1, sand, 0.1 * sz, CD + 0.03, sz * (W / 2 - 0.14));
    bx(0.7, 0.012, 0.16, sand, 0.7 * sz, CD + 0.006, sz * (W / 2 - 0.18));
  }

  // ---- end plates, bolts, rust and a sand wedge -----------------------------------
  for (const sx of [-1, 1]) {
    bx(0.02, CD + 0.06, W + 0.04, steelD, sx * (L / 2 + 0.01), (CD + 0.06) / 2, 0);
    for (const [y, z] of [[0.04, -0.45], [0.04, 0.45], [CD + 0.01, -0.45], [CD + 0.01, 0.45]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), gun); b.rotation.z = Math.PI / 2; b.position.set(sx * (L / 2 + 0.03), y, z); g.add(b);
      bx(0.004, 0.05, 0.03, rust, sx * (L / 2 + 0.023), Math.max(y - 0.045, 0.026), z);
    }
    bx(0.25, 0.06, W + 0.04, sand, sx * (L / 2 - 0.05), 0.03, 0);
  }

  // ---- rail: one tube per side, up the end posts and along the top, bent corners ---
  for (const sz of [-1, 1]) {
    const z = sz * (W / 2 - 0.035), mat = sz > 0 ? steelS : steelN;
    const x0 = -L / 2 + 0.06, x1 = L / 2 - 0.06, top = CD + RH, r = 0.09;
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V3(x0, CD, z), V3(x0, top - r, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x0, top - r, z), V3(x0, top, z), V3(x0 + r, top, z)));
    path.add(new THREE.LineCurve3(V3(x0 + r, top, z), V3(x1 - r, top, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x1 - r, top, z), V3(x1, top, z), V3(x1, top - r, z)));
    path.add(new THREE.LineCurve3(V3(x1, top - r, z), V3(x1, CD, z)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.02, 7, false), mat));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, RH, 8), mat); mid.position.set(0, CD + RH / 2, z); g.add(mid);
    const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L - 0.12, 8), mat); midRail.rotation.z = Math.PI / 2; midRail.position.set(0, CD + RH * 0.55, z); g.add(midRail);
    for (const x of [x0, 0, x1]) {
      bx(0.1, 0.012, 0.08, steelD, x, CD + 0.006, z);
      bx(0.04, 0.06, 0.004, rust, x, CD - 0.04, sz * (W / 2 + 0.006));
    }
    bx(L - 0.3, 0.006, 0.02, sz > 0 ? M(tint(STEEL, 1.16), 'metal', 0.8, 0.3) : sand, 0, top + 0.02, z);
  }

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
