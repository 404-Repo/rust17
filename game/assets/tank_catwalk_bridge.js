// tank_catwalk_bridge candidate 1: profiles. Channels are one C shape extruded 5 m;
// the grating is one extrude of nineteen bar rectangles with the 30 mm sag written
// into its vertices; each yellow rail is a single tube swept along a path that loops
// down into the deck at both ends, as in the concept; landing plates are extruded
// with a raised bolt boss; toe plates are extruded L angles.
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
  const STEEL = 0x4f5257, GALV = 0x9ea3a1, RUST = 0x6b4426, SAND = 0xcdb88e, YEL = 0xc9a227;
  const galvS = M(tint(GALV, 1.04), 'metal', 0.72, 0.55, true);
  const galvN = M(tint(GALV, 0.96), 'metal', 0.75, 0.55, true);
  const galvD = M(tint(GALV, 0.85), 'metal', 0.78, 0.5, true);
  const grate = M(GALV, 'metal', 0.7, 0.55, true);
  const grateD = M(tint(GALV, 0.88), 'metal', 0.75, 0.5);
  const steelD = M(STEEL, 'metal', 0.82, 0.3);
  const yelS = M(YEL, 'metal', 0.7, 0.15);
  const yelN = M(tint(YEL, 0.92), 'metal', 0.72, 0.15);
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const sand = M(SAND, 'ground', 0.95, 0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const L = 5.0, W = 1.2, CD = 0.2, RH = 0.95, SAG = 0.03;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bx = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  // shapes are drawn in (z, y); rotation.y = -PI/2 sends shape x to world z and the extrusion to -x
  const ext = (shape, depth, mat, x0) => { const mm = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat); mm.rotation.y = -Math.PI / 2; mm.position.x = x0; g.add(mm); return mm; };
  const rect = (x, y, w, h) => { const s = new THREE.Shape(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.lineTo(x, y); return s; };

  // ---- channels ------------------------------------------------------------------------
  for (const sz of [-1, 1]) {
    const s = new THREE.Shape(); const t = 0.012, f = 0.08;
    const zo = sz * W / 2, zi = sz * (W / 2 - f), zt = sz * (W / 2 - t);
    s.moveTo(zo, 0); s.lineTo(zi, 0); s.lineTo(zi, t); s.lineTo(zt, t); s.lineTo(zt, CD - t); s.lineTo(zi, CD - t); s.lineTo(zi, CD); s.lineTo(zo, CD); s.lineTo(zo, 0);
    ext(s, L, sz > 0 ? galvS : galvN, L / 2);
    for (const sx of [-1, 1]) bx(0.5, CD - 0.03, 0.005, rust, sx * (L / 2 - 0.25), CD / 2, sz * (W / 2 + 0.003));
    for (const x of [-1.5, 0, 1.5]) { bx(0.03, 0.03, 0.015, gun, x, CD - 0.05, sz * (W / 2 + 0.006)); bx(0.025, 0.09, 0.004, rust, x, CD - 0.11, sz * (W / 2 + 0.009)); }
  }
  for (const x of [-1.6, 0, 1.6]) bx(0.05, 0.12, W - 0.05, galvD, x, 0.07, 0);

  // ---- grating: one extrude of bars, sagged by editing the vertices ------------------------
  const nb = 19, pitch = (W - 0.1) / (nb - 1), GL = L - 0.6;
  const bars = [];
  for (let i = 0; i < nb; i++) bars.push(rect(-(W - 0.1) / 2 + i * pitch - 0.0025, CD - 0.035, 0.005, 0.035));
  const geo = new THREE.ExtrudeGeometry(bars, { depth: GL, bevelEnabled: false, steps: 10 });
  {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = GL / 2 - p.getZ(i); p.setY(i, p.getY(i) - SAG * (1 - (x / (L / 2)) ** 2)); }
    p.needsUpdate = true; geo.computeVertexNormals();
  }
  const gr = new THREE.Mesh(geo, grate); gr.rotation.y = -Math.PI / 2; gr.position.x = GL / 2; g.add(gr);
  for (let j = 0; j <= 22; j++) { const x = -GL / 2 + j * GL / 22; bx(0.006, 0.008, W - 0.1, grateD, x, CD - 0.004 - SAG * (1 - (x / (L / 2)) ** 2), 0); }

  // ---- landing plates: extruded plate with a raised bolt boss strip, four bolts, end plate --
  for (const sx of [-1, 1]) {
    const x0 = sx * (L / 2 - 0.15);
    const pl = new THREE.Shape(); pl.moveTo(-W / 2, CD); pl.lineTo(W / 2, CD); pl.lineTo(W / 2, CD + 0.02); pl.lineTo(0.5, CD + 0.02); pl.lineTo(0.5, CD + 0.035); pl.lineTo(0.4, CD + 0.035); pl.lineTo(0.4, CD + 0.02); pl.lineTo(-0.4, CD + 0.02); pl.lineTo(-0.4, CD + 0.035); pl.lineTo(-0.5, CD + 0.035); pl.lineTo(-0.5, CD + 0.02); pl.lineTo(-W / 2, CD + 0.02); pl.lineTo(-W / 2, CD);
    ext(pl, 0.3, galvD, x0 + 0.15);
    bx(0.22, 0.006, 0.7, sand, x0, CD + 0.023, 0);
    for (const [dx, z] of [[-0.09, -0.45], [-0.09, 0.45], [0.09, -0.45], [0.09, 0.45]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), gun); b.position.set(x0 + dx, CD + 0.045, z); g.add(b); }
    bx(0.02, CD + 0.02, W + 0.02, galvD, sx * (L / 2 + 0.01), (CD + 0.02) / 2, 0);
    for (const [y, z] of [[0.05, -0.45], [0.05, 0.45], [CD - 0.04, -0.45], [CD - 0.04, 0.45]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), gun); b.rotation.z = Math.PI / 2; b.position.set(sx * (L / 2 + 0.03), y, z); g.add(b);
      bx(0.004, 0.06, 0.03, rust, sx * (L / 2 + 0.023), Math.max(y - 0.05, 0.031), z);
    }
    bx(0.35, 0.05, W + 0.04, sand, sx * (L / 2 - 0.1), 0.025, 0);
  }

  // ---- toe plates as L angles, sand against them --------------------------------------------
  for (const sz of [-1, 1]) {
    const l = new THREE.Shape(); const z0 = sz * (W / 2 - 0.09);
    l.moveTo(z0, CD); l.lineTo(z0 + sz * 0.006, CD); l.lineTo(z0 + sz * 0.006, CD + 0.15); l.lineTo(z0, CD + 0.15); l.lineTo(z0, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD); l.lineTo(z0, CD);
    ext(l, L - 0.6, sz > 0 ? galvS : galvN, (L - 0.6) / 2);
    bx(L - 1.2, 0.02, 0.09, sand, 0.2 * sz, CD + 0.03, sz * (W / 2 - 0.14));
    bx(1.0, 0.012, 0.18, sand, -1.2 * sz, CD + 0.006, sz * (W / 2 - 0.19));
  }

  // ---- yellow rails: one looped tube per side, three middle posts, mid rail -----------------
  for (const sz of [-1, 1]) {
    const z = sz * (W / 2 - 0.04), mat = sz > 0 ? yelS : yelN;
    const x0 = -L / 2 + 0.1, x1 = L / 2 - 0.1, top = CD + RH, r = 0.12;
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V3(x0, CD, z), V3(x0, top - r, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x0, top - r, z), V3(x0, top, z), V3(x0 + r, top, z)));
    path.add(new THREE.LineCurve3(V3(x0 + r, top, z), V3(x1 - r, top, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x1 - r, top, z), V3(x1, top, z), V3(x1, top - r, z)));
    path.add(new THREE.LineCurve3(V3(x1, top - r, z), V3(x1, CD, z)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 48, 0.022, 7, false), mat));
    for (const x of [-L / 4, 0, L / 4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, RH, 8), mat); p.position.set(x, CD + RH / 2, z); g.add(p); }
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L - 0.24, 8), mat); mid.rotation.z = Math.PI / 2; mid.position.set(0, CD + RH * 0.55, z); g.add(mid);
    for (const x of [x0, -L / 4, 0, L / 4, x1]) {
      bx(0.1, 0.012, 0.09, steelD, x, CD + 0.006, z);
      bx(0.05, 0.07, 0.004, rust, x, CD - 0.045, sz * (W / 2 + 0.008));
      bx(0.04, 0.03, 0.004, rust, x, CD + 0.03, z + sz * 0.024);
    }
    bx(L - 0.6, 0.006, 0.02, sz > 0 ? M(tint(YEL, 1.12), 'metal', 0.7, 0.15) : sand, 0, top + 0.022, z);
  }

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
