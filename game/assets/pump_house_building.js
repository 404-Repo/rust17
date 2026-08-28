// pump_house_building candidate 0: primitives assembly. Flat roofed industrial
// block 12 x 8 x 5.2: walls built as boxes around the openings (roller shutter
// north, personnel door east standing open, two windows south with broken
// glazing bars), roof slab with kerb and parapet cap, three ventilator cowls,
// lift grooves and panel seams with bolt plates, stained base band, interior
// with plaster band, ceiling pipe, one lamp and a pump plinth. Dust, rust, sand.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds, extra) => {
    const mat = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: r, metalness: m }, extra || {}));
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xb8ae9b, 'stone', 0.90, 0.0);
  const concS = M(0xc4baa6, 'stone', 0.90, 0.0);
  const concN = M(0xaea491, 'stone', 0.90, 0.0);
  const concIn = M(0xa39a88, 'stone', 0.92, 0.0);
  const plaster = M(0xb5ab97, 'plaster', 0.92, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x746c5d, 'stone', 0.94, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvD = M(0x8d9290, 'metal', 0.74, 0.55, true);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const steelL = M(0x5a5d62, 'metal', 0.75, 0.35);
  const tankB = M(0x9c988c, 'metal', 0.80, 0.2);
  const blue = M(0x2f4d66, 'metal', 0.80, 0.2);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const glass = M(0x2a3538, null, 0.45, 0.2, true);
  const lens = M(0x8a7a5a, null, 0.6, 0.0, false, { emissive: 0xffd9a0, emissiveIntensity: 0.9 });
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc6b189, 'ground', 0.95, 0.0);
  const packed = M(0xa89372, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const L = 12.0, D = 8.0, H = 4.6, T = 0.25, PAR = 0.6;

  // a wall along x at depth z, length len, with openings [[x0, x1, y0, y1], ...]
  const wallX = (z, len, mat, opens) => {
    const os = opens.slice().sort((a, b) => a[0] - b[0]);
    let x = -len / 2;
    for (const [x0, x1, y0, y1] of os) {
      if (x0 > x) box(x0 - x, H, T, mat, (x + x0) / 2, H / 2, z);
      if (y0 > 0) box(x1 - x0, y0, T, mat, (x0 + x1) / 2, y0 / 2, z);
      if (y1 < H) box(x1 - x0, H - y1, T, mat, (x0 + x1) / 2, (y1 + H) / 2, z);
      x = x1;
    }
    if (x < len / 2) box(len / 2 - x, H, T, mat, (x + len / 2) / 2, H / 2, z);
  };
  const wallZ = (x, len, mat, opens) => {
    const os = opens.slice().sort((a, b) => a[0] - b[0]);
    let z = -len / 2;
    for (const [z0, z1, y0, y1] of os) {
      if (z0 > z) box(T, H, z0 - z, mat, x, H / 2, (z + z0) / 2);
      if (y0 > 0) box(T, y0, z1 - z0, mat, x, y0 / 2, (z0 + z1) / 2);
      if (y1 < H) box(T, H - y1, z1 - z0, mat, x, (y1 + H) / 2, (z0 + z1) / 2);
      z = z1;
    }
    if (z < len / 2) box(T, H, len / 2 - z, mat, x, H / 2, (z + len / 2) / 2);
  };
  const ZS = D / 2 - T / 2, ZN = -D / 2 + T / 2, XE = L / 2 - T / 2, XW = -L / 2 + T / 2;
  const WIN = [[-3.6, -2.4, 1.5, 2.4], [2.4, 3.6, 1.5, 2.4]];
  const SHUT = [-4.0, -1.0, 0, 3.0];
  const DOOR = [0.9, 1.8, 0, 2.1];
  wallX(ZS, L, concS, WIN);                       // south
  wallX(ZN, L, concN, [SHUT]);                    // north
  wallZ(XE, D - 2 * T, conc, [DOOR]);             // east
  wallZ(XW, D - 2 * T, conc, []);                 // west

  // ---- floor, roof slab, parapet, kerb, cap ----
  box(L - 2 * T, 0.1, D - 2 * T, stainD, 0, 0.05, 0);
  box(L - 2 * T - 0.4, 0.006, D - 2 * T - 0.4, packed, 0.3, 0.103, -0.2);
  box(L, 0.25, D, conc, 0, H - 0.125, 0);
  box(L - 2 * T - 0.2, 0.01, D - 2 * T - 0.2, concIn, 0, H - 0.255, 0);      // ceiling skin
  for (const [w, d, x, z, mat] of [[L, T, 0, D / 2 - T / 2, concS], [L, T, 0, -D / 2 + T / 2, concN], [T, D, L / 2 - T / 2, 0, conc], [T, D, -L / 2 + T / 2, 0, conc]]) {
    box(w, PAR, d, mat, x, H + PAR / 2, z);
  }
  for (const [w, d, x, z] of [[L + 0.06, T + 0.06, 0, D / 2 - T / 2], [L + 0.06, T + 0.06, 0, -D / 2 + T / 2], [T + 0.06, D + 0.06, L / 2 - T / 2, 0], [T + 0.06, D + 0.06, -L / 2 + T / 2, 0]]) {
    box(w, 0.06, d, steelL, x, H + PAR + 0.03, z);                            // parapet cap
    box(w - 0.1, 0.01, d - 0.1, dust, x, H + PAR + 0.065, z);
  }
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, D / 2 - T - 0.05);      // kerb inside the parapet
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, -D / 2 + T + 0.05);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, L / 2 - T - 0.05, H + 0.06, 0);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, -L / 2 + T + 0.05, H + 0.06, 0);
  box(L - 2 * T - 0.4, 0.015, D - 2 * T - 0.4, dust, 0, H + 0.008, 0);          // dust layer on the roof
  box(5.0, 0.01, 3.0, sand, -2.5, H + 0.02, 1.5);
  box(3.5, 0.01, 2.5, sand, 3.0, H + 0.02, -1.5);
  // rust runs below the parapet cap, outside faces
  for (const rx of [-5.0, -3.4, -1.1, 0.6, 2.3, 4.4]) for (const sz of [-1, 1]) {
    box(0.05, 0.4, 0.006, rust, rx, H + PAR - 0.25, sz * (D / 2 + 0.003));
    box(0.02, 0.25, 0.006, rustD, rx + 0.03, H + PAR - 0.45, sz * (D / 2 + 0.005));
  }
  for (const rz of [-3.0, -1.2, 0.8, 2.6]) for (const sx of [-1, 1]) {
    box(0.006, 0.4, 0.05, rust, sx * (L / 2 + 0.003), H + PAR - 0.25, rz);
    box(0.006, 0.25, 0.02, rustD, sx * (L / 2 + 0.005), H + PAR - 0.45, rz - 0.03);
  }
  // ---- ventilator cowls, three, 0.5 tall ----
  for (const [cx, cz] of [[-3.5, -1.0], [0.5, 0.8], [4.0, -1.5]]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 12), tankB); base.position.set(cx, H + 0.09, cz); g.add(base);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), galvD); neck.position.set(cx, H + 0.22, cz); g.add(neck);
    const turb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), galv); turb.scale.set(1, 0.7, 1); turb.position.set(cx, H + 0.38, cz); g.add(turb);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.05, 10), galvD); hat.position.set(cx, H + 0.5, cz); g.add(hat);
    box(0.14, 0.006, 0.36, rust, cx, H + 0.02, cz + 0.2);                      // rust bleed onto the roof
    box(0.3, 0.008, 0.3, dust, cx, H + 0.185, cz);
  }
  // ---- exterior: lift groove at 2.4, stained base band, panel seams with bolt plates ----
  for (const sz of [-1, 1]) {
    box(L + 0.01, 0.03, 0.012, groove, 0, 2.4, sz * (D / 2 + 0.0));
    box(L + 0.01, 0.4, 0.016, stain, 0, 0.2, sz * (D / 2 + 0.0));
    for (const px of [-3, 0, 3]) {
      if (sz < 0 && px < -0.5 && px > -4.5) continue;                          // seam falls in the shutter
      box(0.04, H - 0.45, 0.012, groove, px, 0.45 + (H - 0.45) / 2, sz * (D / 2));
      for (const py of [1.0, 2.2, 3.6]) {
        box(0.16, 0.16, 0.012, steel, px, py, sz * (D / 2 + 0.008));
        box(0.06, 0.35, 0.006, rust, px, py - 0.25, sz * (D / 2 + 0.012));
      }
    }
  }
  for (const sx of [-1, 1]) {
    box(0.012, 0.03, D + 0.01, groove, sx * (L / 2), 2.4, 0);
    box(0.016, 0.4, D + 0.01, stain, sx * (L / 2), 0.2, 0);
    for (const pz of [-2, 2]) {
      box(0.012, H - 0.45, 0.04, groove, sx * (L / 2), 0.45 + (H - 0.45) / 2, pz);
      for (const py of [1.0, 2.2, 3.6]) {
        box(0.012, 0.16, 0.16, steel, sx * (L / 2 + 0.008), py, pz);
        box(0.006, 0.35, 0.06, rust, sx * (L / 2 + 0.012), py - 0.25, pz);
      }
    }
  }
  // ---- roller shutter, north wall: guides, curtain rolled half up, drum housing ----
  {
    const [x0, x1, , y1] = SHUT, cx = (x0 + x1) / 2, w = x1 - x0, zf = -D / 2;
    box(0.1, y1, 0.14, steel, x0 - 0.05, y1 / 2, zf + 0.07);
    box(0.1, y1, 0.14, steel, x1 + 0.05, y1 / 2, zf + 0.07);
    for (let i = 0; i < 16; i++) {
      const y = 1.8 + 0.0375 + i * 0.075;
      box(w, 0.075, 0.02, i % 2 ? galv : galvD, cx, y, zf + 0.07);
    }
    box(w, 0.06, 0.05, steel, cx, 1.8 + 0.03, zf + 0.07);                       // bottom rail
    box(w + 0.3, 0.5, 0.45, tankB, cx, y1 + 0.25, zf - 0.1);                    // drum housing
    box(w + 0.3, 0.012, 0.35, dust, cx, y1 + 0.506, zf - 0.1);
    box(0.02, 0.5, 0.45, steel, x0 - 0.15, y1 + 0.25, zf - 0.1);
    box(0.02, 0.5, 0.45, steel, x1 + 0.15, y1 + 0.25, zf - 0.1);
    for (const rx of [-0.9, -0.2, 0.7, 1.2]) box(0.05, 0.3, 0.006, rust, cx + rx, y1 + 0.45, zf - 0.33);
    box(w + 0.3, 0.06, 0.006, rustD, cx, y1 + 0.03, zf - 0.33);
    box(w, 0.4, 0.008, rust, cx, 1.9 + 0.2, zf + 0.081);                         // rust on the lower slats
    box(w + 0.6, 0.02, 0.6, stain, cx, 0.11, zf + 0.1);                          // worn threshold
  }
  // ---- personnel door, east wall, open 60 degrees outward ----
  {
    const [z0, z1, , y1] = DOOR, cz = (z0 + z1) / 2, xf = L / 2;
    box(0.06, y1 + 0.05, 0.06, steel, xf - 0.03, (y1 + 0.05) / 2, z0 - 0.03);
    box(0.06, y1 + 0.05, 0.06, steel, xf - 0.03, (y1 + 0.05) / 2, z1 + 0.03);
    box(0.06, 0.06, z1 - z0 + 0.12, steel, xf - 0.03, y1 + 0.02, cz);
    const hinge = new THREE.Group(); hinge.position.set(xf + 0.02, 0, z0); hinge.rotation.y = Math.PI / 3; g.add(hinge);
    box(0.05, y1 - 0.05, z1 - z0 - 0.04, tankB, 0, (y1 - 0.05) / 2 + 0.02, (z1 - z0) / 2, hinge);
    box(0.012, 0.3, 0.5, galvD, 0.03, 0.5, (z1 - z0) / 2, hinge);                 // louvre vent
    for (let i = 0; i < 5; i++) box(0.02, 0.02, 0.46, steel, 0.035, 0.4 + i * 0.05, (z1 - z0) / 2, hinge);
    box(0.03, 0.05, 0.6, steel, 0.04, 1.05, (z1 - z0) / 2, hinge);                 // push bar
    box(0.006, 0.5, 0.05, rust, 0.028, 1.5, 0.08, hinge);
    box(0.006, 0.3, 0.3, rustD, 0.028, 0.2, 0.5, hinge);
    for (const hy of [0.4, 1.1, 1.8]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), rust); h.position.set(0, hy, 0.02, hinge); hinge.add(h); h.position.set(0, hy, 0.02); }
    box(0.4, 0.02, 1.2, stain, xf + 0.15, 0.11, cz);                               // worn threshold outside
  }
  // ---- windows, south wall, broken glazing bars ----
  for (const [x0, x1, y0, y1] of WIN) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, zf = D / 2;
    box(0.05, y1 - y0 + 0.1, 0.12, steel, x0 - 0.025, cy, zf - 0.06);
    box(0.05, y1 - y0 + 0.1, 0.12, steel, x1 + 0.025, cy, zf - 0.06);
    box(x1 - x0 + 0.1, 0.05, 0.12, steel, cx, y1 + 0.025, zf - 0.06);
    box(x1 - x0 + 0.1, 0.05, 0.12, steel, cx, y0 - 0.025, zf - 0.06);
    box(0.03, y1 - y0, 0.03, steel, cx, cy, zf - 0.06);                            // mullion
    box((x1 - x0) / 2 - 0.02, 0.03, 0.03, steel, cx + (x1 - x0) / 4, cy, zf - 0.06); // transom, one half only
    const bent = box(0.25, 0.03, 0.03, rust, cx - 0.15, cy - 0.1, zf - 0.06); bent.rotation.z = 0.5;
    box((x1 - x0) / 2 - 0.03, (y1 - y0) / 2 - 0.03, 0.006, glass, cx - (x1 - x0) / 4, cy + (y1 - y0) / 4, zf - 0.06);
    box((x1 - x0) / 2 - 0.03, (y1 - y0) / 2 - 0.03, 0.006, glass, cx + (x1 - x0) / 4, cy - (y1 - y0) / 4, zf - 0.06);
    box(x1 - x0 + 0.2, 0.04, 0.1, stain, cx, y0 - 0.07, zf + 0.02);              // sill
    box(0.05, 0.6, 0.006, rust, x0 + 0.1, y0 - 0.4, zf + 0.004);
    box(0.03, 0.4, 0.006, rustD, x1 - 0.15, y0 - 0.3, zf + 0.004);
  }
  // ---- west wall extras: downpipe, control cabinet, conduit ----
  {
    const xf = -L / 2;
    const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H + 0.4, 10), steel); dp.position.set(xf - 0.09, (H + 0.4) / 2, -2.6); g.add(dp);
    for (const by of [0.8, 2.4, 4.0]) box(0.12, 0.05, 0.16, rust, xf - 0.06, by, -2.6);
    box(0.008, 1.2, 0.12, rust, xf - 0.004, 0.7, -2.6);
    box(0.25, 0.8, 0.6, blue, xf - 0.125, 1.4, 1.5);
    box(0.02, 0.6, 0.45, steel, xf - 0.26, 1.4, 1.5);
    box(0.006, 0.5, 0.5, rust, xf - 0.004, 0.75, 1.5);
    box(0.25, 0.012, 0.6, dust, xf - 0.125, 1.806, 1.5);
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), galvD); cd.rotation.x = Math.PI / 2; cd.position.set(xf - 0.05, 2.2, 0.2); g.add(cd);
  }
  // ---- interior: plaster band at 1.2, ceiling pipe with hangers, lamp, pump plinth ----
  box(L - 2 * T - 0.02, 0.35, 0.02, plaster, 0, 1.2, D / 2 - T - 0.01);
  box(L - 2 * T - 0.02, 0.35, 0.02, plaster, 0, 1.2, -D / 2 + T + 0.01);
  box(0.02, 0.35, D - 2 * T - 0.02, plaster, L / 2 - T - 0.01, 1.2, 0);
  box(0.02, 0.35, D - 2 * T - 0.02, plaster, -L / 2 + T + 0.01, 1.2, 0);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, L - 2 * T - 0.1, 12), steel); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, H - 0.5, -1.5); g.add(pipe);
  for (const hx of [-4, -1.3, 1.3, 4]) { box(0.04, 0.25, 0.04, steel, hx, H - 0.35, -1.5); const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), rust); fl.rotation.z = Math.PI / 2; fl.position.set(hx + 0.4, H - 0.5, -1.5); g.add(fl); }
  box(0.3, 0.08, 0.3, steel, 1.0, H - 0.3, 0.5); box(0.22, 0.02, 0.22, lens, 1.0, H - 0.35, 0.5);
  box(1.6, 0.5, 0.7, stain, -1.5, 0.35, 0.5);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12), blue); pump.rotation.z = Math.PI / 2; pump.position.set(-1.5, 0.85, 0.5); g.add(pump);
  box(0.5, 0.4, 0.5, steel, -0.7, 0.8, 0.5);
  // ---- sand fillet: south and west, wrapping the corners ----
  box(L + 0.4, 0.12, 0.3, sand, 0, 0.06, D / 2 + 0.15);
  box(L - 2, 0.12, 0.18, sand, -0.5, 0.17, D / 2 + 0.09);
  box(4.0, 0.08, 0.1, dust, 2.0, 0.27, D / 2 + 0.05);
  box(0.3, 0.12, D + 0.4, sand, -L / 2 - 0.15, 0.06, 0);
  box(0.18, 0.12, D - 2, sand, -L / 2 - 0.09, 0.17, 0.5);
  box(0.3, 0.1, D + 0.4, sand, L / 2 + 0.15, 0.05, 0);
  box(L + 0.4, 0.08, 0.3, sand, 0, 0.04, -D / 2 - 0.15);

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) box3.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
