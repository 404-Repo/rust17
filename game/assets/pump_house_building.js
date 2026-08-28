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
  // ---- r4 detail pass: steel corner columns, process pipe, ladder, electrics, plates, bolt heads, small ironmongery ----
  {
    const steelS = M(0x5c5f64, 'metal', 0.75, 0.35);
    const yellow = M(0xc9a227, 'metal', 0.80, 0.2);
    const red = M(0x9c4a3c, 'metal', 0.80, 0.2);
    const rubber = M(0x1d1e20, null, 0.9, 0.0);
    const holeM = M(0x5a5348, 'stone', 0.95, 0.0, true);
    const cone = (x, y, z, rx, rz, mat) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.016, 6), mat || rust); b.rotation.x = rx; b.rotation.z = rz; b.position.set(x, y, z); g.add(b); return b; };
    const cyl = (r, h, seg, mat, x, y, z, rx, rz, open) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, !!open), mat); c.rotation.x = rx || 0; c.rotation.z = rz || 0; c.position.set(x, y, z); g.add(c); return c; };
    // bolt heads on the existing seam plates
    for (const sz of [-1, 1]) for (const px of [-3, 0, 3]) {
      if (sz < 0 && px < -0.5 && px > -4.5) continue;
      for (const py of [1.0, 2.2, 3.6]) for (const [bx, by] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) cone(px + bx, py + by, sz * (D / 2 + 0.022), sz * Math.PI / 2, 0);
    }
    for (const sx of [-1, 1]) for (const pz of [-2, 2]) for (const py of [1.0, 2.2, 3.6]) for (const [bz, by] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) cone(sx * (L / 2 + 0.022), py + by, pz + bz, 0, -sx * Math.PI / 2);
    // corner columns: I section, base plate with bolts, splice plate at 2.4 with six bolts, top gusset, rust under every plate
    const CH = H + PAR + 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (L / 2 + 0.12), cz = sz * (D / 2 + 0.12);
      const fm = sz > 0 ? steelS : steel;
      box(0.22, CH - 0.02, 0.02, fm, cx, CH / 2 + 0.01, cz + 0.1); box(0.22, CH - 0.02, 0.02, steel, cx, CH / 2 + 0.01, cz - 0.1);
      box(0.012, CH - 0.02, 0.18, steel, cx, CH / 2 + 0.01, cz);
      box(0.36, 0.02, 0.36, steel, cx, 0.01, cz);
      for (const [bx, bz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) cone(cx + bx, 0.028, cz + bz, 0, 0);
      box(0.2, 0.3, 0.006, rust, cx, 0.2, cz + sz * 0.114);
      box(0.006, 0.3, 0.14, rustD, cx + sx * 0.114, 0.18, cz);
      for (const face of [1, -1]) {                                              // splice plates on both outward faces
        const px = cx + (face > 0 ? sx * 0.12 : 0), pz = cz + (face > 0 ? 0 : sz * 0.12);
        if (face > 0) { box(0.012, 0.5, 0.2, steel, px, 2.4, cz); for (const [a, b] of [[-0.06, -0.16], [0.06, -0.16], [-0.06, 0], [0.06, 0], [-0.06, 0.16], [0.06, 0.16]]) cone(px + sx * 0.008, 2.4 + b, cz + a, 0, -sx * Math.PI / 2); box(0.006, 0.45, 0.16, rust, px + sx * 0.002, 1.9, cz); }
        else { box(0.24, 0.5, 0.012, steel, cx, 2.4, pz); for (const [a, b] of [[-0.06, -0.16], [0.06, -0.16], [-0.06, 0], [0.06, 0], [-0.06, 0.16], [0.06, 0.16]]) cone(cx + a, 2.4 + b, pz + sz * 0.008, sz * Math.PI / 2, 0); box(0.16, 0.45, 0.006, rust, cx, 1.9, pz + sz * 0.002); }
      }
      box(0.26, 0.012, 0.26, steel, cx, CH - 0.006, cz);                          // cap plate
      box(0.012, 0.3, 0.22, steel, cx + sx * 0.12, H + PAR - 0.15, cz); box(0.24, 0.3, 0.012, steel, cx, H + PAR - 0.15, cz + sz * 0.12);   // top gusset plates
      cone(cx + sx * 0.128, H + PAR - 0.15, cz, 0, -sx * Math.PI / 2); cone(cx, H + PAR - 0.15, cz + sz * 0.128, sz * Math.PI / 2, 0);
      box(0.22, 0.008, 0.22, dust, cx, CH + 0.004, cz);
    }
    // concrete footing strip proud of the walls
    box(L + 0.16, 0.15, 0.08, stain, 0, 0.075, D / 2 + 0.04); box(L + 0.16, 0.15, 0.08, stain, 0, 0.075, -D / 2 - 0.04);
    box(0.08, 0.15, D + 0.16, stain, L / 2 + 0.04, 0.075, 0); box(0.08, 0.15, D + 0.16, stain, -L / 2 - 0.04, 0.075, 0);
    // process pipe through the south wall: thrust block, riser, valve, elbow, wall flange with bolts
    {
      const px = 0.0, zr = D / 2 + 0.34, yh = 1.15, R = 0.15;
      box(0.6, 0.35, 0.4, stain, px, 0.175, zr);
      box(0.5, 0.01, 0.3, dust, px, 0.355, zr);
      cyl(R, yh - 0.35 - R, 14, steel, px, 0.35 + (yh - 0.35 - R) / 2, zr);        // riser
      const el = new THREE.Mesh(new THREE.TorusGeometry(R, R, 8, 10, Math.PI / 2), steel); el.rotation.y = -Math.PI / 2; el.rotation.z = 0; el.position.set(px, yh - R, zr - R); g.add(el);
      cyl(R, zr - R - D / 2, 14, steel, px, yh, D / 2 + (zr - R - D / 2) / 2, Math.PI / 2);   // horizontal into the wall
      cyl(R + 0.06, 0.04, 14, rustD, px, yh, D / 2 + 0.03, Math.PI / 2);            // wall flange
      cyl(R + 0.06, 0.04, 14, steel, px, yh, D / 2 + 0.09, Math.PI / 2);            // pipe flange
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cone(px + Math.cos(a) * (R + 0.035), yh + Math.sin(a) * (R + 0.035), D / 2 + 0.118, Math.PI / 2, 0); }
      box(0.1, 0.9, 0.006, rust, px + 0.05, yh - 0.6, D / 2 + 0.004);
      cyl(R + 0.04, 0.05, 14, rustD, px, 0.75, zr);                                // riser joint
      cyl(0.06, 0.25, 10, steel, px + R + 0.1, 0.75, zr, 0, Math.PI / 2);          // valve bonnet, side mounted
      const wh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 14), red); wh.rotation.y = Math.PI / 2; wh.position.set(px + R + 0.26, 0.75, zr); g.add(wh);
      for (let i = 0; i < 3; i++) { const sp = box(0.02, 0.32, 0.02, red, px + R + 0.26, 0.75, zr); sp.rotation.x = i * Math.PI / 3; }
      box(0.08, 0.3, 0.006, rust, px + 0.06, 0.5, zr + R + 0.003);
      box(0.9, 0.06, 0.4, sand, px + 0.1, 0.03, zr);
    }
    // roof ladder on the west wall with hoops and bracketed feet
    {
      const lx = -L / 2 - 0.2, lz = -0.6, LH = H + PAR + 0.15;
      for (const rz of [-0.22, 0.22]) box(0.05, LH, 0.05, steel, lx, LH / 2, lz + rz);
      for (let ry = 0.45; ry < LH - 0.1; ry += 0.3) cyl(0.014, 0.44, 6, steel, lx, ry, lz, Math.PI / 2);
      for (const by of [1.2, 2.6, 4.0, 5.0]) { for (const rz of [-0.22, 0.22]) box(0.2, 0.05, 0.05, steel, lx + 0.1, by, lz + rz); box(0.006, 0.35, 0.5, rust, -L / 2 - 0.004, by - 0.25, lz); }
      for (let hy = 2.5; hy < LH - 0.2; hy += 0.9) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.015, 5, 10, Math.PI), steel); hoop.rotation.z = -Math.PI / 2; hoop.rotation.y = Math.PI / 2; hoop.position.set(lx, hy, lz); g.add(hoop); }
      for (const hz of [-0.3, 0.3]) box(0.012, 2.4, 0.03, steelL, lx - 0.34, 3.9, lz + hz);
      box(0.4, 0.05, 0.6, stain, lx + 0.05, 0.025, lz);
    }
    // electrics on the north wall: junction box, conduit up and across, lamp over the shutter, cable sag to the corner column
    {
      const zf = -D / 2, jx = 0.7, jy = 1.6;
      box(0.3, 0.4, 0.14, blue, jx, jy, zf - 0.07);
      box(0.26, 0.012, 0.14, dust, jx, jy + 0.206, zf - 0.07);
      box(0.006, 0.4, 0.2, rust, jx, jy - 0.4, zf - 0.004);
      box(0.2, 0.06, 0.006, rustD, jx, jy - 0.24, zf - 0.142);
      cyl(0.025, 2.0, 6, galvD, jx, jy + 0.2 + 1.0, zf - 0.05);
      cyl(0.025, 3.3, 6, galvD, jx - 1.65, jy + 2.2, zf - 0.05, 0, Math.PI / 2);
      for (const cx of [jx - 0.5, jx - 1.6, jx - 2.8]) box(0.06, 0.06, 0.04, steel, cx, jy + 2.2, zf - 0.03);
      const lxp = -2.6, ly = 3.85;
      box(0.06, 0.06, 0.5, steel, lxp, ly, zf - 0.25);
      box(0.3, 0.18, 0.24, galvD, lxp, ly - 0.1, zf - 0.45);
      box(0.2, 0.02, 0.14, lens, lxp, ly - 0.2, zf - 0.45);
      box(0.3, 0.008, 0.24, dust, lxp, ly - 0.005, zf - 0.45);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(lxp, ly, zf - 0.28), new THREE.Vector3(lxp - 1.4, ly - 0.45, zf - 0.3), new THREE.Vector3(lxp - 2.6, ly - 0.35, zf - 0.28), new THREE.Vector3(-L / 2 - 0.12, H + PAR - 0.2, zf - 0.13)]);
      const cab = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 5, false), rubber); g.add(cab);
      // bump posts either side of the roller door
      for (const bx of [-4.4, -0.6]) { cyl(0.08, 0.9, 10, yellow, bx, 0.45 + 0.12, zf - 0.24); box(0.24, 0.12, 0.24, stain, bx, 0.06, zf - 0.24); box(0.06, 0.25, 0.006, rustD, bx, 0.3, zf - 0.364); }
      box(0.25, 0.25, 0.012, red, -0.85, 2.2, zf - 0.147); cone(-0.85, 2.31, zf - 0.155, -Math.PI / 2, 0); cone(-0.85, 2.09, zf - 0.155, -Math.PI / 2, 0); box(0.04, 0.3, 0.006, rust, -0.83, 1.9, zf - 0.147);
    }
    // scupper stubs above the parapet rust runs
    for (const rx of [-3.4, 0.6, 4.4]) for (const sz of [-1, 1]) cyl(0.035, 0.14, 8, rustD, rx, H + PAR - 0.05, sz * (D / 2 + 0.05), Math.PI / 2, 0, true);
    for (const rz of [-1.2, 2.6]) for (const sx of [-1, 1]) cyl(0.035, 0.14, 8, rustD, sx * (L / 2 + 0.05), H + PAR - 0.05, rz, 0, Math.PI / 2, true);
    // louvre vent on the west wall
    {
      const vx = -L / 2 - 0.03, vy = 3.2, vz = 2.5;
      box(0.04, 0.55, 0.65, galvD, vx, vy, vz);
      for (let i = 0; i < 6; i++) { const s = box(0.03, 0.03, 0.55, steel, vx - 0.02, vy - 0.2 + i * 0.08, vz); s.rotation.z = -0.6; }
      box(0.006, 0.4, 0.5, rust, vx - 0.045 + 0.02, vy - 0.5, vz);
    }
    // windows: bars, flats and drip hoods; bullet holes by the west window
    for (const [x0, x1, y0, y1] of WIN) {
      const cx = (x0 + x1) / 2, zb = D / 2 + 0.06;
      for (const bx of [-0.3, 0, 0.3]) cyl(0.012, y1 - y0 + 0.1, 6, steel, cx + bx, (y0 + y1) / 2, zb);
      for (const by of [y0 + 0.15, y1 - 0.15]) box(x1 - x0 + 0.1, 0.03, 0.012, steel, cx, by, zb);
      box(x1 - x0 + 0.3, 0.05, 0.22, stain, cx, y1 + 0.12, D / 2 + 0.11);
      box(x1 - x0 + 0.2, 0.008, 0.18, dust, cx, y1 + 0.149, D / 2 + 0.11);
      box(0.05, 0.3, 0.006, rust, x0 + 0.05, y1 - 0.05, D / 2 + 0.004);
    }
    for (const [hx, hy] of [[-4.5, 1.6], [-4.35, 1.45], [-4.2, 1.7], [-4.6, 1.3], [-4.05, 1.5], [-4.3, 1.2], [-1.6, 2.0], [-1.45, 1.85]]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6, 1, true), holeM); h.rotation.x = Math.PI / 2; h.position.set(hx, hy, D / 2); g.add(h); }
    // door: handle, hasp and padlock, kick plate, step outside; sign plate beside it
    {
      const [z0, z1] = DOOR, cz = (z0 + z1) / 2;
      box(0.5, 0.15, 1.3, stain, L / 2 + 0.28, 0.075, cz);
      box(0.4, 0.008, 1.2, dust, L / 2 + 0.28, 0.154, cz);
      box(0.012, 0.35, 0.12, steel, L / 2 - 0.02, 1.1, z0 - 0.15); box(0.04, 0.12, 0.06, rust, L / 2 - 0.005, 1.03, z0 - 0.15); box(0.04, 0.05, 0.05, steel, L / 2 - 0.005, 0.95, z0 - 0.15);   // hasp keep, staple, padlock on the frame
      box(0.3, 0.2, 0.012, yellow, 0, 0, 0).position.set(L / 2 + 0.006, 1.7, z1 + 0.55);
      cone(L / 2 + 0.014, 1.7, z1 + 0.43, 0, -Math.PI / 2); cone(L / 2 + 0.014, 1.7, z1 + 0.67, 0, -Math.PI / 2);
      box(0.006, 0.3, 0.05, rust, L / 2 + 0.002, 1.45, z1 + 0.5);
    }
    // roof: pipe penetration boot with flange, drain grate with rust
    cyl(0.12, 0.35, 10, galvD, 2.0, H + 0.175, 0.2); cyl(0.2, 0.03, 10, galvD, 2.0, H + 0.02, 0.2); cyl(0.13, 0.04, 10, rustD, 2.0, H + 0.36, 0.2);
    box(0.3, 0.02, 0.3, steel, L / 2 - 0.6, H + 0.02, -D / 2 + 0.6); box(0.36, 0.006, 0.36, rustD, L / 2 - 0.6, H + 0.015, -D / 2 + 0.62);
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
