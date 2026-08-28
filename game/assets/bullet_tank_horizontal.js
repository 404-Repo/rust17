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

  // ---- drain under the belly (r4): flanged nozzle, elbow, flanged gate valve with bonnet, stem and wheel, capped stub --
  {
    const hex = (mat, x, y, z, r, h, axis) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), mat); if (axis === 'z') b.rotation.x = Math.PI / 2; else if (axis === 'x') b.rotation.z = Math.PI / 2; b.position.set(x, y, z); g.add(b); return b; };
    const DX = 0.4, DY = 0.5;
    const flangeY = (y) => { cylY(0.13, 0.03, steelL, DX, y, 0, 10); };
    const flangeZ = (z) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10), steelL); f.rotation.x = Math.PI / 2; f.position.set(DX, DY, z); g.add(f); };
    cylY(0.075, 0.36, steel, DX, CY - R + 0.03 - 0.18, 0, 10);
    flangeY(0.64); flangeY(0.6);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(gun, DX + 0.105 * Math.cos(a), 0.62, 0.105 * Math.sin(a), 0.011, 0.09); }
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), steel); el.position.set(DX, DY, 0); g.add(el);
    const run1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 10), steel); run1.rotation.x = Math.PI / 2; run1.position.set(DX, DY, 0.22); g.add(run1);
    flangeZ(0.3); flangeZ(0.34);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(gun, DX + 0.105 * Math.cos(a), DY + 0.105 * Math.sin(a), 0.32, 0.011, 0.09, 'z'); }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 10), steel); body.rotation.x = Math.PI / 2; body.position.set(DX, DY, 0.55); g.add(body);
    cylY(0.07, 0.22, steel, DX, DY + 0.16, 0.55, 10);
    cylY(0.1, 0.03, steelL, DX, DY + 0.13, 0.55, 10);
    cylY(0.02, 0.3, gun, DX, DY + 0.36, 0.55, 8);
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 14), red); wh.rotation.x = Math.PI / 2; wh.position.set(DX, DY + 0.46, 0.55); g.add(wh);
    bx(0.27, 0.02, 0.025, red, DX, DY + 0.46, 0.55); bx(0.025, 0.02, 0.27, red, DX, DY + 0.46, 0.55);
    const run2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.36, 10), steel); run2.rotation.x = Math.PI / 2; run2.position.set(DX, DY, 0.84); g.add(run2);
    flangeZ(1.03);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; hex(gun, DX + 0.1 * Math.cos(a), DY + 0.1 * Math.sin(a), 1.055, 0.011, 0.03, 'z'); }
    bx(0.05, 0.1, 0.004, rust, DX, DY - 0.16, 1.047);
    arc(R + 0.012, DX - 0.12, DX + 0.12, 3 * Math.PI / 2 - 0.35, 0.7, rust, 4);
    bx(0.3, 0.02, 0.3, M(0x8a7a5c, 'ground', 0.95, 0), DX, 0.01, 1.0);
  }
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
  // ---- r4 detail pass: saddle straps with bolted tabs, lifting lugs, bolted nozzle flanges with a relief valve and a
  // gauge, blind flange on the east head, axial weld seam with drips, manway davit, ladder carried to the ground on a
  // pad, belly stain band. The drain assembly above was rebuilt in the same pass.
  {
    const hex = (mat, x, y, z, r, h, axis) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), mat); if (axis === 'z') b.rotation.x = Math.PI / 2; else if (axis === 'x') b.rotation.z = Math.PI / 2; b.position.set(x, y, z); g.add(b); return b; };
    const steelD = M(tint(STEEL, 0.9), 'metal', 0.84, 0.3);
    const shellD = M(tint(TANK, 0.84), 'metal', 0.86, 0.2);
    // saddle straps over the vessel, bolted to tabs on the cradle edges
    for (const sx of [-1, 1]) {
      const x = sx * 2.0;
      const geo = new THREE.TorusGeometry(R + 0.05, 0.022, 5, 24, 4.64); geo.rotateZ(-0.75); geo.rotateY(Math.PI / 2);
      const st = new THREE.Mesh(geo, steelD); st.position.set(x, CY, 0); g.add(st);
      for (const sz of [-1, 1]) {
        bx(0.1, 0.16, 0.03, steelL, x, 1.1, sz * 0.89);
        hex(gun, x, 1.06, sz * 0.91, 0.016, 0.03, 'z'); hex(gun, x, 1.15, sz * 0.91, 0.016, 0.03, 'z');
        bx(0.07, 0.26, 0.006, rust, x + 0.01 * sx, 0.89, sz * 0.907);
      }
    }
    // lifting lugs on top, either side of the nozzles
    for (const sx of [-1, 1]) {
      const x = sx * 1.3;
      bx(0.26, 0.2, 0.03, steelL, x, CY + R + 0.07, 0);
      const rnd = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), steelL); rnd.rotation.x = Math.PI / 2; rnd.position.set(x, CY + R + 0.17, 0); g.add(rnd);
      for (const sz of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 10), gun); h.rotation.x = Math.PI / 2; h.position.set(x, CY + R + 0.19, sz * 0.018); g.add(h); }
      for (const dx of [-0.16, 0.16]) bx(0.04, 0.04, 0.16, steelD, x + dx, CY + R + 0.01, 0);
      arc(R + 0.012, x - 0.18, x + 0.18, Math.PI / 2 - 0.65, 0.5, rust, 3);
    }
    // relief nozzle: six flange bolts, a relief valve with a side outlet and cap
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(gun, 1.0 + 0.08 * Math.cos(a), CY + R + 0.25, 0.08 * Math.sin(a), 0.01, 0.03); }
    cylY(0.045, 0.16, steelD, 1.0, CY + R + 0.32, 0, 10);
    const out = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), steelD); out.rotation.z = Math.PI / 2; out.position.set(1.09, CY + R + 0.36, 0); g.add(out);
    cylY(0.055, 0.03, gun, 1.0, CY + R + 0.415, 0, 10);
    // second nozzle with a pressure gauge facing south
    const nz2 = new THREE.Mesh(nz.geometry, steel); nz2.position.set(-0.5, CY + R - 0.02, 0); g.add(nz2);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(gun, -0.5 + 0.08 * Math.cos(a), CY + R + 0.25, 0.08 * Math.sin(a), 0.01, 0.03); }
    cylY(0.015, 0.1, gun, -0.5, CY + R + 0.29, 0, 6);
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), steelD); gauge.rotation.x = Math.PI / 2; gauge.position.set(-0.5, CY + R + 0.37, 0); g.add(gauge);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.006, 12), M(tint(TANK, 1.12), 'metal', 0.7, 0.1)); face.rotation.x = Math.PI / 2; face.position.set(-0.5, CY + R + 0.37, 0.018); g.add(face);
    arc(R + 0.012, -0.58, -0.42, Math.PI / 2, 0.5, rust, 3);
    // blind flange on the east head
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), shellD); hub.rotation.z = Math.PI / 2; hub.position.set(L / 2 + R - 0.05, CY, 0); g.add(hub);
    const bf = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 12), steelD); bf.rotation.z = Math.PI / 2; bf.position.set(L / 2 + R + 0.04, CY, 0); g.add(bf);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; hex(gun, L / 2 + R + 0.07, CY + 0.155 * Math.cos(a), 0.155 * Math.sin(a), 0.012, 0.03, 'x'); }
    const hr = bx(0.008, 0.3, 0.1, rust, L / 2 + R - 0.04, CY - 0.33, 0); hr.rotation.z = -0.25;
    // axial weld seam along the sun side at 45 degrees, with drips below it
    const seamB = bx(L + 0.1, 0.02, 0.03, shellD, 0, CY + (R + 0.006) * Math.SQRT1_2, (R + 0.006) * Math.SQRT1_2); seamB.rotation.x = Math.PI / 4;
    for (const x of [-2.2, -1.0, 0.3, 1.5, 2.4]) arc(R + 0.01, x - 0.04, x + 0.04, Math.PI / 4 - 0.4, 0.34, rust, 3);
    // manway davit and handle
    bx(0.04, 0.44, 0.04, steel, MX + 0.4, CY + R + 0.16, 0.05);
    bx(0.44, 0.035, 0.035, steelD, MX + 0.18, CY + R + 0.38, 0.05);
    bx(0.03, 0.15, 0.03, steelD, MX, CY + R + 0.29, 0.05);
    for (const dz of [-0.06, 0.06]) bx(0.06, 0.04, 0.04, steelL, MX - 0.29, CY + R + 0.2, dz);
    bx(0.16, 0.03, 0.04, gun, MX, CY + R + 0.225, 0);
    arc(R + 0.012, MX + 0.35, MX + 0.45, Math.PI / 2 - 0.55, 0.45, rust, 3);
    // ladder carried to the ground: rail extensions, foot plates, concrete pad, low rungs, sand
    bx(0.8, 0.12, 0.36, conc, LX, 0.06, LZ);
    bx(0.7, 0.01, 0.28, sand, LX, 0.125, LZ + 0.02);
    for (const sx of [-1, 1]) {
      cylY(0.02, 0.74, galv, LX + sx * 0.2, 0.49, LZ, 6);
      bx(0.1, 0.02, 0.12, steel, LX + sx * 0.2, 0.13, LZ);
      hex(gun, LX + sx * 0.2 + sx * 0.035, 0.145, LZ + 0.04, 0.01, 0.014);
      bx(0.05, 0.08, 0.004, rust, LX + sx * 0.2, 0.08, LZ + 0.182);
    }
    for (const y of [0.44, 0.72]) { const rg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.4, 6), galv); rg.rotation.z = Math.PI / 2; rg.position.set(LX, y, LZ); g.add(rg); }
    bx(1.0, 0.08, 0.5, sand, LX, 0.04, LZ + 0.12);
    // belly stain band
    arc(R + 0.008, -L / 2 + 0.1, L / 2 - 0.1, 3 * Math.PI / 2 - 0.45, 0.9, M(tint(TANK, 0.74), 'metal', 0.9, 0.15, true), 6);
  }
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

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
