// floodlight_mast candidate 2: a different reading of the reference, which shows a
// square tapered pole. Four trapezoid face plates (south bleached, north shaded, east
// and west mid) with a seam strip on each corner, a stepped concrete plinth with a
// broken edge, a heavier base plate with gusset ribs, a rectangular hollow cross arm
// with end caps, wide flat floodlight housings with a hood and a wire guard, a cable
// tray down the north face rather than a conduit, sand wedges on two sides.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds, emis) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    if (emis) { mat.emissive = new THREE.Color(emis); mat.emissiveIntensity = 1.2; }
    return mat;
  };
  const ox = M(0x8b4530, 'metal', 0.82, 0.15);
  const oxS = M(0x9c5842, 'metal', 0.79, 0.15);
  const oxN = M(0x7b3c29, 'metal', 0.85, 0.15);
  const oxE = M(0x874431, 'metal', 0.83, 0.15);
  const oxW = M(0x924d37, 'metal', 0.81, 0.15);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const house = M(0x9c988c, 'metal', 0.80, 0.25);
  const houseD = M(0x8c887d, 'metal', 0.82, 0.25);
  const conc = M(0xb8ae9b, 'stone', 0.92, 0.0);
  const concS = M(0x857c6c, 'stone', 0.94, 0.0);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const lens = M(0xc9a227, null, 0.5, 0.0, false, 0xffd9a0);

  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };

  const PH = 0.4, TOP = 9.0, ARM = 8.5, MH = TOP - PH;
  const half = (y) => 0.125 - (0.065 * (y - PH)) / MH;   // half width of the square at height y

  // ---- stepped plinth, broken corner, dust cap, sand wedges ----
  box(0.8, 0.22, 0.8, conc, 0, PH - 0.11, 0);
  box(0.84, 0.18, 0.84, concS, 0, 0.09, 0);
  box(0.7, 0.008, 0.7, dust, 0, PH + 0.004, 0);
  box(0.14, 0.1, 0.14, concS, 0.36, PH - 0.05, 0.36);        // a spalled corner, darker
  const w1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.2, 10), dust); w1.scale.set(1, 1, 0.8); w1.position.set(0.05, 0.1, 0.25); g.add(w1);
  const w2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.16, 10), dust); w2.scale.set(0.8, 1, 1); w2.position.set(-0.3, 0.08, -0.05); g.add(w2);
  const w3 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.12, 9), dust); w3.position.set(0.3, 0.06, -0.25); g.add(w3);
  // ---- base plate, bolts with nuts, gusset ribs ----
  box(0.5, 0.025, 0.5, ox, 0, PH + 0.0125, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cyl(0.018, 0.1, gun, sx * 0.19, PH + 0.07, sz * 0.19, 'y', 6);
    cyl(0.03, 0.03, gun, sx * 0.19, PH + 0.04, sz * 0.19, 'y', 6);
    box(0.05, 0.16, 0.006, rust, sx * 0.19, PH - 0.1, sz * 0.424);
  }
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    const rib = box(0.012, 0.28, 0.12, ox, 0, 0, 0);
    rib.position.set(0.185 * Math.sin(a), PH + 0.165, 0.185 * Math.cos(a)); rib.rotation.y = a;
    const r2 = box(0.012, 0.03, 0.12, ox, 0, 0, 0); r2.position.set(0.185 * Math.sin(a), PH + 0.04, 0.185 * Math.cos(a)); r2.rotation.y = a;
  }
  // ---- mast: four trapezoid face plates plus corner seam strips ----
  const facePlate = (mat, rotY) => {
    const s = new THREE.Shape(); s.moveTo(-0.125, 0); s.lineTo(0.125, 0); s.lineTo(0.06, MH); s.lineTo(-0.06, MH); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat);
    // plate in the xy plane at local z = 0..0.012; rotate about y so it faces its direction
    const gr = new THREE.Group(); gr.rotation.y = rotY; gr.position.y = PH; g.add(gr);
    mm.position.z = 0.0; gr.add(mm);
    // corner seam strip along the edge, tilted with the taper
    return gr;
  };
  // each plate sits at its face: translate before rotating. Build with a translate on the mesh.
  for (const [mat, rotY] of [[oxS, 0], [oxE, Math.PI / 2], [oxN, Math.PI], [oxW, -Math.PI / 2]]) {
    const gr = facePlate(mat, rotY); const mm = gr.children[0];
    // slope: the plate should lean inward from half(PH) to half(TOP) - use a shear via rotation.x
    const tilt = Math.atan((0.125 - 0.06) / MH);
    mm.rotation.x = tilt; mm.position.z = 0.125 - 0.006;
  }
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, MH, 0.02), ox);
    const gr = new THREE.Group(); gr.rotation.y = a; gr.position.y = PH + MH / 2; g.add(gr);
    s.position.z = (0.125 + 0.06) / 2 * Math.SQRT2 - 0.01; s.rotation.x = Math.atan((0.125 - 0.06) * Math.SQRT2 / MH); gr.add(s);
  }
  box(0.16, 0.03, 0.16, ox, 0, TOP - 0.015, 0);                            // cap plate
  box(0.14, 0.006, 0.14, dust, 0, TOP + 0.003, 0);
  for (const y of [3.3, 6.2]) {
    const h = half(y);
    box(2 * h + 0.03, 0.08, 2 * h + 0.03, ox, 0, y, 0);                     // bolted joint collar
    for (const sx of [-1, 1]) cyl(0.012, 0.02, gun, sx * 0.05, y, h + 0.025, 'z', 6);
    box(0.05, 0.3, 0.006, rust, 0.03, y - 0.2, h + 0.004);
    box(0.006, 0.28, 0.05, rust, -h - 0.004, y - 0.19, -0.02);
  }
  // ---- cross arm: RHS with end caps, through bolted with rust, dust on top ----
  const ha = half(ARM);
  box(1.4, 0.12, 0.14, ox, 0, ARM, 0);
  box(1.36, 0.006, 0.1, dust, 0, ARM + 0.063, 0);
  for (const sx of [-1, 1]) { box(0.02, 0.16, 0.18, oxN, sx * 0.69, ARM, 0); box(0.04, 0.14, 0.005, rust, sx * 0.69, ARM - 0.17, 0.093); }
  box(0.3, 0.3, 2 * ha + 0.16, steel, 0, ARM, 0);
  for (const sx of [-1, 1]) for (const dy of [-0.1, 0.1]) { cyl(0.014, 0.03, gun, sx * 0.1, ARM + dy, ha + 0.09, 'z', 6); cyl(0.014, 0.03, gun, sx * 0.1, ARM + dy, -ha - 0.09, 'z', 6); }
  box(0.16, 0.5, 0.006, rust, 0, ARM - 0.42, ha + 0.004);
  box(0.006, 0.5, 0.16, rust, -ha - 0.004, ARM - 0.42, 0);
  // ---- floodlights: wide flat housings with hood and wire guard, on stirrup brackets ----
  for (const sx of [-1, 1]) {
    const x = sx * 0.5;
    box(0.06, 0.04, 0.16, steel, x, ARM + 0.08, 0);
    const fl = new THREE.Group(); fl.position.set(x, ARM + 0.24, 0); fl.rotation.x = 35 * Math.PI / 180; g.add(fl);
    for (const dx of [-0.21, 0.21]) box(0.02, 0.3, 0.05, steel, dx, -0.02, -0.02, fl);        // stirrup arms
    box(0.4, 0.3, 0.2, houseD, 0, 0, 0, fl);
    box(0.36, 0.26, 0.012, lens, 0, 0, 0.105, fl);
    box(0.42, 0.02, 0.24, house, 0, 0.16, 0.03, fl);                                          // hood
    box(0.36, 0.006, 0.16, dust, 0, 0.173, 0.0, fl);
    for (let i = 0; i < 4; i++) box(0.006, 0.26, 0.006, gun, -0.15 + i * 0.1, 0, 0.12, fl);   // guard wires
    box(0.36, 0.006, 0.006, gun, 0, 0, 0.12, fl);
    box(0.06, 0.12, 0.006, rust, 0, -0.1, -0.104, fl);
    cyl(0.012, 0.04, gun, 0, 0, -0.12, 'z', 6, fl);
  }
  // ---- junction box on the north face, cable tray down the north face with cover clips ----
  const hj = half(1.6);
  box(0.2, 0.2, 0.12, house, 0, 1.6, -hj - 0.06);
  box(0.22, 0.03, 0.14, houseD, 0, 1.71, -hj - 0.06);
  box(0.06, 0.25, 0.006, rust, 0, 1.36, -hj - 0.123);
  const tray = new THREE.Group(); g.add(tray);
  box(0.08, 1.05, 0.03, galv, 0, PH + 0.5, -hj - 0.03 - 0.02);
  for (const y of [0.6, 1.0, 1.4]) box(0.1, 0.02, 0.05, steel, 0, y, -hj - 0.045);
  cyl(0.008, ARM - 1.75, steel, 0.0, (ARM + 1.75) / 2, -0.11, 'y', 5);
  for (const y of [2.5, 3.7, 4.9, 6.1, 7.3]) box(0.04, 0.03, 0.03, steel, 0, y, -half(y) - 0.004);

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
