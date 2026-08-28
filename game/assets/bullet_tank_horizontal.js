// bullet_tank_horizontal candidate 1: profiles. The whole vessel is one lathe profile
// (hemispherical heads and raised weld beads in the profile) revolved in two phi halves
// for the sun side, laid along x. Saddles are an extruded concrete profile with an
// extruded steel cradle whose top is the shell arc. Ladder rails are extruded along a
// path with a curl over the top; hoops are torus arcs; sand fillets are lathe dunes.
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
  const TANK = 0x9c988c, RUST = 0x6b4426, STEEL = 0x4f5257, SAND = 0xcdb88e, GALV = 0x9ea3a1;
  const rust = M(RUST, 'metal', 0.9, 0.1, true);
  const steel = M(STEEL, 'metal', 0.8, 0.3, true);
  const steelL = M(tint(STEEL, 1.1), 'metal', 0.78, 0.3);
  const galv = M(GALV, 'metal', 0.75, 0.55);
  const sand = M(SAND, 'ground', 0.95, 0.0);
  const conc = M(0xb8ae9b, 'stone', 0.9, 0.0);
  const concD = M(0x857c6c, 'stone', 0.92, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const red = M(0x9c4a3c, 'metal', 0.75, 0.15);

  const R = 1.2, L = 5.6, CY = 2.0, SEG = 20;
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const bx = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cylY = (r, len, mat, x, y, z, seg, parent) => { const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };

  // ---- vessel profile: (radius, axial) with beads, revolved about the axis ------------
  const prof = [];
  // -x pole, round the -x head to the head weld
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; prof.push(V2(R * Math.sin(a) + (i === 0 ? 0.001 : 0), -(L / 2 + R * Math.cos(a)))); }
  const beads = [-L / 2, -1.4, 0.2, 1.8, L / 2];
  for (const bxx of beads) { prof.push(V2(R, bxx - 0.03), V2(R + 0.03, bxx - 0.012), V2(R + 0.03, bxx + 0.012), V2(R, bxx + 0.03)); }
  for (let i = 8; i >= 0; i--) { const a = i / 8 * Math.PI / 2; prof.push(V2(R * Math.sin(a) + (i === 0 ? 0.001 : 0), L / 2 + R * Math.cos(a))); }
  // LatheGeometry revolves about y: with rotation.z = -PI/2 local y goes to +x and phi 0 (local +z) stays +z.
  for (const [phi0, col] of [[-Math.PI / 2, tint(TANK, 1.08)], [Math.PI / 2, TANK]]) {
    const mm = new THREE.Mesh(new THREE.LatheGeometry(prof, SEG / 2, phi0, Math.PI), M(col, 'metal', 0.85, 0.2, true));
    mm.rotation.z = -Math.PI / 2; mm.position.set(0, CY, 0); g.add(mm);
  }
  // a surface arc helper for rust, dust and stains: theta 0 faces +Z, PI/2 is the top
  const arc = (rr, x0, x1, th0, thLen, mat, seg) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, x1 - x0, seg || 4, 1, true, th0, thLen), mat);
    mm.rotation.z = Math.PI / 2; mm.position.set((x0 + x1) / 2, CY, 0); g.add(mm); return mm;
  };
  for (const bxx of beads) {
    arc(R + 0.035, bxx - 0.05, bxx + 0.05, 3 * Math.PI / 2 - 0.5, 1.0, rust, 4);
    arc(R + 0.01, bxx + 0.03, bxx + 0.14, 3 * Math.PI / 2 - 0.3, 0.6, rust, 3);
    arc(R + 0.01, bxx - 0.14, bxx - 0.03, 3 * Math.PI / 2 - 0.2, 0.5, rust, 3);
  }
  // dust drift along the top in two patches, and a paler bleached patch on the sun side
  arc(R + 0.012, -L / 2 + 0.25, -0.35, Math.PI / 2 - 0.45, 0.9, sand, 5);
  arc(R + 0.012, -0.15, L / 2 - 0.25, Math.PI / 2 - 0.38, 0.76, sand, 5);
  arc(R + 0.006, -1.4, 0.9, -0.35, 0.7, M(tint(TANK, 1.14), 'metal', 0.85, 0.2), 4);

  // ---- saddles: extruded concrete block profile + extruded steel cradle ------------
  const blk = new THREE.Shape(); blk.moveTo(-0.9, 0); blk.lineTo(0.9, 0); blk.lineTo(0.9, 0.8); blk.lineTo(0.75, 0.8); blk.lineTo(0.75, 0.72); blk.lineTo(-0.75, 0.72); blk.lineTo(-0.75, 0.8); blk.lineTo(-0.9, 0.8); blk.lineTo(-0.9, 0);
  const blkGeo = new THREE.ExtrudeGeometry(blk, { depth: 0.6, bevelEnabled: false });
  const cradle = new THREE.Shape();
  cradle.moveTo(-0.85, 0.72); cradle.lineTo(0.85, 0.72); cradle.lineTo(0.85, 1.18);
  cradle.absarc(0, CY, R + 0.02, Math.atan2(1.18 - CY, 0.85), Math.atan2(1.18 - CY, -0.85), true);
  cradle.lineTo(-0.85, 0.72);
  const crGeo = new THREE.ExtrudeGeometry(cradle, { depth: 0.5, bevelEnabled: false });
  for (const sx of [-1, 1]) {
    const x = sx * 2.0;
    // shape is in (z, y); extrude along x
    const b = new THREE.Mesh(blkGeo, conc); b.rotation.y = Math.PI / 2; b.position.set(x - 0.3, 0, 0); g.add(b);
    bx(0.62, 0.4, 1.82, concD, x, 0.2, 0);
    const cr = new THREE.Mesh(crGeo, steel); cr.rotation.y = Math.PI / 2; cr.position.set(x - 0.25, 0, 0); g.add(cr);
    bx(0.5, 0.01, 1.4, sand, x, 0.805, 0);
    for (const sz of [-1, 1]) {
      bx(0.03, 0.46, 0.3, steelL, x + 0.26, 0.95, sz * 0.7);                 // end webs
      bx(0.03, 0.46, 0.3, steelL, x - 0.26, 0.95, sz * 0.7);
      cylY(0.025, 0.06, gun, x + 0.2, 0.75, sz * 0.82, 6);
      cylY(0.025, 0.06, gun, x - 0.2, 0.75, sz * 0.82, 6);
      bx(0.03, 0.25, 0.006, rust, x + 0.2, 0.6, sz * 0.905);
      bx(0.35, 0.22, 0.006, rust, x - 0.05, 0.6, sz * 0.905);
    }
    const dune = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0.18), V2(0.4, 0.13), V2(0.8, 0.05), V2(1.1, 0)], 10), sand);
    dune.scale.set(0.8, 1, 1.1); dune.position.set(x, 0.01, 0); g.add(dune);
    const dune2 = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0.1), V2(0.3, 0.06), V2(0.55, 0)], 8), sand);
    dune2.position.set(x + sx * 0.45, 0.01, -0.7); g.add(dune2);
  }

  // ---- manhole west end: lathe of the neck and flanges, bolts, rust runs -----------
  const MX = -2.3;
  const mh = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(0.2, 0), V2(0.2, 0.2), V2(0.29, 0.2), V2(0.29, 0.25), V2(0.27, 0.25), V2(0.27, 0.27), V2(0.29, 0.27), V2(0.29, 0.31), V2(0, 0.31)], 14), M(tint(TANK, 0.85), 'metal', 0.85, 0.2));
  mh.position.set(MX, CY + R - 0.1, 0); g.add(mh);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; cylY(0.02, 0.05, rust, MX + 0.245 * Math.cos(a), CY + R + 0.23, 0.245 * Math.sin(a), 6); }
  arc(R + 0.012, MX - 0.2, MX - 0.08, Math.PI / 2 - 0.75, 0.75, rust, 4);
  arc(R + 0.012, MX + 0.05, MX + 0.14, Math.PI / 2, 0.6, rust, 4);
  arc(R + 0.012, MX - 0.04, MX + 0.03, Math.PI / 2 - 1.0, 1.0, rust, 5);
  // relief nozzle
  const nz = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(0.06, 0), V2(0.06, 0.22), V2(0.1, 0.22), V2(0.1, 0.26), V2(0, 0.26)], 8), steel);
  nz.position.set(1.0, CY + R - 0.02, 0); g.add(nz);
  arc(R + 0.012, 0.94, 1.06, Math.PI / 2, 0.45, rust, 3);

  // ---- drain and valve under the belly, run out to +Z ------------------------------
  const drop = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(0.12, 0), V2(0.12, 0.04), V2(0.075, 0.04), V2(0.075, 0.5), V2(0, 0.5)], 10), steel);
  drop.rotation.x = Math.PI; drop.position.set(0.4, CY - R + 0.02, 0); g.add(drop);
  const kn = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), steel); kn.position.set(0.4, 0.55, 0); g.add(kn);
  const run = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(0.075, 0), V2(0.075, 0.3), V2(0.12, 0.3), V2(0.12, 0.34), V2(0.075, 0.34), V2(0.075, 0.85), V2(0.12, 0.85), V2(0.12, 0.9), V2(0, 0.9)], 10), steel);
  run.rotation.x = Math.PI / 2; run.position.set(0.4, 0.55, 0); g.add(run);
  bx(0.22, 0.24, 0.2, steel, 0.4, 0.55, 0.55);
  cylY(0.03, 0.25, gun, 0.4, 0.78, 0.55, 8);
  const wh = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 14), red); wh.rotation.x = Math.PI / 2; wh.position.set(0.4, 0.9, 0.55); g.add(wh);
  bx(0.28, 0.02, 0.025, red, 0.4, 0.9, 0.55); bx(0.025, 0.02, 0.28, red, 0.4, 0.9, 0.55);
  bx(0.3, 0.02, 0.3, M(0x8a7a5c, 'ground', 0.95, 0), 0.4, 0.01, 0.9);
  // north side stub
  const stub = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(0.05, 0), V2(0.05, 0.18), V2(0.09, 0.18), V2(0.09, 0.22), V2(0, 0.22)], 8), steel);
  stub.rotation.x = -Math.PI / 2; stub.position.set(1.6, CY - 0.6, -R + 0.15); g.add(stub);
  arc(R + 0.01, 1.5, 1.7, Math.PI + 0.55, 0.6, rust, 3);

  // ---- ladder: rails extruded along a path with a curl at the top, rungs, hoops -----
  const LX = -2.0, LZ = R + 0.1;
  const railPath = new THREE.CurvePath();
  railPath.add(new THREE.LineCurve3(new THREE.Vector3(0, 0.85, LZ), new THREE.Vector3(0, 3.1, LZ)));
  railPath.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 3.1, LZ), new THREE.Vector3(0, 3.4, LZ), new THREE.Vector3(0, 3.4, LZ - 0.3)));
  const railGeo = new THREE.TubeGeometry(railPath, 12, 0.02, 6, false);
  for (const sx of [-1, 1]) {
    const rl = new THREE.Mesh(railGeo, galv); rl.position.x = LX + sx * 0.2; g.add(rl);
    bx(0.06, 0.06, 0.1, steel, LX + sx * 0.2, 0.86, LZ - 0.03);
  }
  for (let k = 0; k < 8; k++) { const rg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.4, 6), galv); rg.rotation.z = Math.PI / 2; rg.position.set(LX, 1.0 + k * 0.28, LZ); g.add(rg); }
  for (const [y, len] of [[1.4, 0.35], [2.6, 0.6]]) {
    bx(0.06, 0.04, len, steel, LX, y, LZ - len / 2 + 0.02);
    arc(R + 0.012, LX - 0.05, LX + 0.05, Math.asin((y - CY) / R) - 0.35, 0.3, rust, 3);
  }
  for (const y of [2.0, 2.5, 3.0]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 5, 10, Math.PI), galv);
    h.rotation.x = Math.PI / 2; h.position.set(LX, y, LZ + 0.02); g.add(h);
  }
  for (const a of [0.3, Math.PI / 2, Math.PI - 0.3]) bx(0.04, 1.05, 0.015, galv, LX + 0.25 * Math.cos(a), 2.5, LZ + 0.02 + 0.25 * Math.sin(a));
  bx(0.04, 0.3, 0.006, rust, LX + 0.2, 0.64, LZ + 0.02);

  // contrast plate on the sun side
  const plate = bx(0.5, 0.3, 0.02, M(0x2f4d66, 'metal', 0.8, 0.2), 1.5, CY + 0.3, 0);
  plate.rotation.x = -Math.asin(0.3 / R); plate.position.z = Math.sqrt(R * R - 0.09) + 0.005;
  bx(0.5, 0.1, 0.006, rust, 0, -0.2, 0.012, plate);

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
