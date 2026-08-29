// pump_house_building, round 13 rebuild (audit item 3: "a flat box with almost no features, walls read as
// untextured plaster"). Flat roofed industrial block 12 x 8 x 5.2. Walls are cast concrete in two 2.4 m lifts,
// the upper lift proud of the lower with a recessed shadow groove at the joint, formwork panel seams and a grid
// of tie holes, a proud stained base band on a footing strip. North: 3 m roller shutter half up (1.8 m clear)
// with drum, drum housing, C channel guide rails, bottom rail and a concrete step. East: 0.9 x 2.1 steel door
// open 60 degrees in a real frame with lintel, sill step and threshold. South: two 1.2 x 0.9 windows at 1.5 m
// sill with frames, sills, lintels, drip hoods, broken glazing bars and burglar bars. Parapet with a coping that
// has a drip edge both sides, rust streaked, scupper drain outlets with stain streaks below, three roof cowls,
// dust. Conduit with saddle clips and a junction box, a caged wall lamp over the shutter, sign plates as decal
// boxes, louvre vents, corner steel columns, ladder, process pipe. Interior: same concrete, plaster band at 1.2,
// concrete floor, 0.2 m ceiling pipe, lamp, pump plinth. Double sided walls so the interior reads.
// Openings (SHUT, DOOR, WIN) are at the same place and size as before; the level's colliders use them.
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
  const concLo = M(0xa9a08e, 'stone', 0.92, 0.0);        // lower lift, a shade darker (older pour, more splash)
  const concIn = M(0xa39a88, 'stone', 0.92, 0.0);
  const plaster = M(0xb5ab97, 'plaster', 0.92, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x746c5d, 'stone', 0.94, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const tie = M(0x5e5749, 'stone', 0.95, 0.0);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvD = M(0x8d9290, 'metal', 0.74, 0.55, true);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const steelL = M(0x5a5d62, 'metal', 0.75, 0.35);
  const steelS = M(0x5c5f64, 'metal', 0.75, 0.35);
  const tankB = M(0x9c988c, 'metal', 0.80, 0.2);
  const blue = M(0x2f4d66, 'metal', 0.80, 0.2);
  const yellow = M(0xc9a227, 'metal', 0.80, 0.2);
  const red = M(0x9c4a3c, 'metal', 0.80, 0.2);
  const white = M(0xd8d4c8, 'metal', 0.80, 0.1);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const rubber = M(0x1d1e20, null, 0.9, 0.0);
  const glass = M(0x2a3538, null, 0.45, 0.2, true);
  const lens = M(0x8a7a5a, null, 0.6, 0.0, false, { emissive: 0xffd9a0, emissiveIntensity: 0.9 });
  const holeM = M(0x5a5348, 'stone', 0.95, 0.0, true);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc6b189, 'ground', 0.95, 0.0);
  const packed = M(0xa89372, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, h, seg, mat, x, y, z, rx, rz, open) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, !!open), mat); c.rotation.x = rx || 0; c.rotation.z = rz || 0; c.position.set(x, y, z); g.add(c); return c; };
  const cone = (x, y, z, rx, rz, mat) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.016, 6), mat || rust); b.rotation.x = rx; b.rotation.z = rz; b.position.set(x, y, z); g.add(b); return b; };
  const disc = (r, mat, x, y, z, rx, ry) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 8), mat); d.rotation.x = rx || 0; d.rotation.y = ry || 0; d.position.set(x, y, z); g.add(d); return d; };
  const seg = (r) => (r >= 0.4 ? 24 : r >= 0.08 ? 16 : 8);
  const L = 12.0, D = 8.0, H = 4.6, T = 0.25, PAR = 0.6;
  const LIFT = 2.4, GR = 0.02;                  // lift joint height, half groove height
  const PROUD = 0.03;                          // upper lift stands proud of the lower by this on the outer face

  // ---- walls in two lifts around the openings. A wall along x at depth z (sign s says which side is
  // outside), length len, openings [[x0, x1, y0, y1], ...]. Each lift is its own run of boxes; the joint is a
  // recessed dark groove so the lift line casts a shadow at 2 m and reads as a line at 20 m.
  const lifts = (mats) => [[0, LIFT - GR, mats[0], 0], [LIFT + GR, H, mats[1], PROUD], [LIFT - GR, LIFT + GR, groove, -0.05]];
  const wallX = (z, s, len, mats, opens) => {
    for (const [ya, yb, mat, pr] of lifts(mats)) {
      const t = T + pr, zc = z + s * pr / 2;
      const os = opens.filter((o) => o[2] < yb && o[3] > ya).sort((a, b) => a[0] - b[0]);
      let x = -len / 2;
      for (const [x0, x1, y0, y1] of os) {
        if (x0 > x) box(x0 - x, yb - ya, t, mat, (x + x0) / 2, (ya + yb) / 2, zc);
        if (y0 > ya) box(x1 - x0, y0 - ya, t, mat, (x0 + x1) / 2, (ya + y0) / 2, zc);
        if (y1 < yb) box(x1 - x0, yb - y1, t, mat, (x0 + x1) / 2, (y1 + yb) / 2, zc);
        x = x1;
      }
      if (x < len / 2) box(len / 2 - x, yb - ya, t, mat, (x + len / 2) / 2, (ya + yb) / 2, zc);
    }
  };
  const wallZ = (x, s, len, mats, opens) => {
    for (const [ya, yb, mat, pr] of lifts(mats)) {
      const t = T + pr, xc = x + s * pr / 2;
      const os = opens.filter((o) => o[2] < yb && o[3] > ya).sort((a, b) => a[0] - b[0]);
      let z = -len / 2;
      for (const [z0, z1, y0, y1] of os) {
        if (z0 > z) box(t, yb - ya, z0 - z, mat, xc, (ya + yb) / 2, (z + z0) / 2);
        if (y0 > ya) box(t, y0 - ya, z1 - z0, mat, xc, (ya + y0) / 2, (z0 + z1) / 2);
        if (y1 < yb) box(t, yb - y1, z1 - z0, mat, xc, (y1 + yb) / 2, (z0 + z1) / 2);
        z = z1;
      }
      if (z < len / 2) box(t, yb - ya, len / 2 - z, mat, xc, (ya + yb) / 2, (z + len / 2) / 2);
    }
  };
  const ZS = D / 2 - T / 2, ZN = -D / 2 + T / 2, XE = L / 2 - T / 2, XW = -L / 2 + T / 2;
  const WIN = [[-3.6, -2.4, 1.5, 2.4], [2.4, 3.6, 1.5, 2.4]];
  const SHUT = [-4.0, -1.0, 0, 3.0];
  const DOOR = [0.9, 1.8, 0, 2.1];
  wallX(ZS, 1, L, [concLo, concS], WIN);                       // south
  wallX(ZN, -1, L, [concLo, concN], [SHUT]);                   // north
  wallZ(XE, 1, D - 2 * T, [concLo, conc], [DOOR]);             // east
  wallZ(XW, -1, D - 2 * T, [concLo, conc], []);                // west

  // ---- formwork: vertical panel seams every 3 m (recessed), tie hole grid, and the proud base band on its
  // footing. The tie holes are flat discs a hair off the face: cheap and they read as concrete at any distance.
  const inShut = (x) => x > SHUT[0] - 0.2 && x < SHUT[1] + 0.2;
  const inWin = (x) => WIN.some(([a, b]) => x > a - 0.2 && x < b + 0.2);
  const inDoor = (z) => z > DOOR[0] - 0.2 && z < DOOR[1] + 0.2;
  for (const sz of [-1, 1]) {
    const zf = sz * (D / 2), zu = zf + sz * PROUD;
    for (const px of [-3, 0, 3]) {
      if (sz < 0 && inShut(px)) continue;
      box(0.03, LIFT - GR - 0.45, 0.02, groove, px, 0.45 + (LIFT - GR - 0.45) / 2, zf);
      box(0.03, H - LIFT - GR, 0.02, groove, px, LIFT + GR + (H - LIFT - GR) / 2, zu);
    }
    for (let ix = -5; ix <= 5; ix++) for (const ty of [0.9, 1.7, 3.0, 3.9]) {
      const px = ix * 1.15 + (ty > 2.4 ? 0.55 : 0);
      if (Math.abs(px) > L / 2 - 0.4) continue;
      if (sz < 0 && inShut(px)) continue;
      if (sz > 0 && ty < 2.6 && inWin(px)) continue;
      disc(0.022, tie, px, ty, (ty > 2.4 ? zu : zf) + sz * 0.003, 0, sz > 0 ? 0 : Math.PI);
    }
    box(L + 0.02, 0.4, 0.05, stain, 0, 0.2, zf + sz * 0.02);                     // proud base band, stained
    box(L + 0.02, 0.05, 0.03, stainD, 0, 0.415, zf + sz * 0.045);                 // its top chamfer strip (drip)
  }
  for (const sx of [-1, 1]) {
    const xf = sx * (L / 2), xu = xf + sx * PROUD;
    for (const pz of [-2, 2]) {
      if (sx > 0 && inDoor(pz)) continue;
      box(0.02, LIFT - GR - 0.45, 0.03, groove, xf, 0.45 + (LIFT - GR - 0.45) / 2, pz);
      box(0.02, H - LIFT - GR, 0.03, groove, xu, LIFT + GR + (H - LIFT - GR) / 2, pz);
    }
    for (let iz = -3; iz <= 3; iz++) for (const ty of [0.9, 1.7, 3.0, 3.9]) {
      const pz = iz * 1.15 + (ty > 2.4 ? 0.55 : 0);
      if (Math.abs(pz) > D / 2 - 0.4) continue;
      if (sx > 0 && ty < 2.4 && inDoor(pz)) continue;
      disc(0.022, tie, (ty > 2.4 ? xu : xf) + sx * 0.003, ty, pz, 0, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    box(0.05, 0.4, D + 0.02, stain, xf + sx * 0.02, 0.2, 0);
    box(0.03, 0.05, D + 0.02, stainD, xf + sx * 0.045, 0.415, 0);
  }
  // concrete footing strip proud of the walls
  box(L + 0.16, 0.15, 0.08, stain, 0, 0.075, D / 2 + 0.04); box(L + 0.16, 0.15, 0.08, stain, 0, 0.075, -D / 2 - 0.04);
  box(0.08, 0.15, D + 0.16, stain, L / 2 + 0.04, 0.075, 0); box(0.08, 0.15, D + 0.16, stain, -L / 2 - 0.04, 0.075, 0);

  // ---- floor, roof slab, parapet, kerb, coping with drip edges ----
  box(L - 2 * T, 0.1, D - 2 * T, stainD, 0, 0.05, 0);
  box(L - 2 * T - 0.4, 0.006, D - 2 * T - 0.4, packed, 0.3, 0.103, -0.2);
  box(L, 0.25, D, conc, 0, H - 0.125, 0);
  box(L - 2 * T - 0.2, 0.01, D - 2 * T - 0.2, concIn, 0, H - 0.255, 0);      // ceiling skin
  const PO = PROUD;                                                            // parapet sits on the proud upper lift
  for (const [w, d, x, z, mat] of [[L + 2 * PO, T + PO, 0, D / 2 - T / 2 + PO / 2, concS], [L + 2 * PO, T + PO, 0, -D / 2 + T / 2 - PO / 2, concN], [T + PO, D, L / 2 - T / 2 + PO / 2, 0, conc], [T + PO, D, -L / 2 + T / 2 - PO / 2, 0, conc]]) {
    box(w, PAR, d, mat, x, H + PAR / 2, z);
  }
  // coping: a wider cap with a down turned drip lip on both edges, dust on top, rust bleed on the outer lip
  const CT = T + PO + 0.12, CY = H + PAR;
  for (const [w, d, x, z, ax] of [[L + 0.2, CT, 0, D / 2 - T / 2 + PO / 2, 'x'], [L + 0.2, CT, 0, -D / 2 + T / 2 - PO / 2, 'x'], [CT, D + 0.2, L / 2 - T / 2 + PO / 2, 0, 'z'], [CT, D + 0.2, -L / 2 + T / 2 - PO / 2, 0, 'z']]) {
    box(w, 0.06, d, steelL, x, CY + 0.03, z);
    box(w - 0.1, 0.01, d - 0.1, dust, x, CY + 0.065, z);
    if (ax === 'x') { for (const e of [-1, 1]) box(w, 0.05, 0.015, steel, x, CY - 0.02, z + e * (d / 2 - 0.0075)); }
    else { for (const e of [-1, 1]) box(0.015, 0.05, d, steel, x + e * (w / 2 - 0.0075), CY - 0.02, z); }
  }
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, D / 2 - T - 0.05);      // kerb inside the parapet
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, -D / 2 + T + 0.05);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, L / 2 - T - 0.05, H + 0.06, 0);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, -L / 2 + T + 0.05, H + 0.06, 0);
  box(L - 2 * T - 0.4, 0.015, D - 2 * T - 0.4, dust, 0, H + 0.008, 0);          // dust layer on the roof
  box(5.0, 0.01, 3.0, sand, -2.5, H + 0.02, 1.5);
  box(3.5, 0.01, 2.5, sand, 3.0, H + 0.02, -1.5);
  // weather band under the coping: a darker stone strip the width of each wall, then the rust runs
  for (const sz of [-1, 1]) box(L + 0.06, 0.22, 0.008, stain, 0, CY - 0.16, sz * (D / 2 + PO + 0.002));
  for (const sx of [-1, 1]) box(0.008, 0.22, D + 0.06, stain, sx * (L / 2 + PO + 0.002), CY - 0.16, 0);
  // rust runs below the coping lip, outside faces
  for (const rx of [-5.4, -5.0, -4.2, -3.4, -2.2, -1.1, -0.3, 0.6, 1.5, 2.3, 3.3, 4.4, 5.3]) for (const sz of [-1, 1]) {
    const zo = sz * (D / 2 + PO + 0.003);
    box(0.05, 0.4, 0.006, rust, rx, CY - 0.25, zo);
    box(0.02, 0.25, 0.006, rustD, rx + 0.03, CY - 0.45, zo + sz * 0.002);
  }
  for (const rz of [-3.6, -3.0, -2.1, -1.2, -0.2, 0.8, 1.7, 2.6, 3.5]) for (const sx of [-1, 1]) {
    const xo = sx * (L / 2 + PO + 0.003);
    box(0.006, 0.4, 0.05, rust, xo, CY - 0.25, rz);
    box(0.006, 0.25, 0.02, rustD, xo + sx * 0.002, CY - 0.45, rz - 0.03);
  }
  // ---- roof drain outlets: scupper boxes through the parapet with a spout, and a stain streak below each
  // that narrows as it runs down the wall (three boxes stepping in width and darkness)
  const scupper = (x, z, sx, sz) => {
    const ox = sx * (D / 2 + PO), oz = sz * (L / 2 + PO);                     // unused names kept simple below
    if (sx !== 0) {
      const xf = sx * (L / 2 + PO);
      box(0.3, 0.16, 0.26, steel, xf, H + 0.1, z);                              // scupper box through the parapet foot
      cyl(0.05, 0.3, 8, rustD, xf + sx * 0.2, H + 0.06, z, 0, Math.PI / 2, true);  // spout
      box(0.006, 1.6, 0.16, stain, xf + sx * 0.004, H - 0.8, z);
      box(0.006, 1.4, 0.09, stainD, xf + sx * 0.006, H - 1.0, z + 0.02);
      box(0.006, 0.9, 0.04, rustD, xf + sx * 0.008, H - 0.5, z - 0.03);
    } else {
      const zf = sz * (D / 2 + PO);
      box(0.26, 0.16, 0.3, steel, x, H + 0.1, zf);
      cyl(0.05, 0.3, 8, rustD, x, H + 0.06, zf + sz * 0.2, Math.PI / 2, 0, true);
      box(0.16, 1.6, 0.006, stain, x, H - 0.8, zf + sz * 0.004);
      box(0.09, 1.4, 0.006, stainD, x + 0.02, H - 1.0, zf + sz * 0.006);
      box(0.04, 0.9, 0.006, rustD, x - 0.03, H - 0.5, zf + sz * 0.008);
    }
  };
  scupper(0, -3.0, -1, 0); scupper(0, 1.0, 1, 0); scupper(4.6, 0, 0, 1); scupper(-4.6, 0, 0, -1);
  // small scupper stubs above the rust runs
  for (const rx of [-3.4, 0.6]) for (const sz of [-1, 1]) cyl(0.035, 0.14, 8, rustD, rx, CY - 0.05, sz * (D / 2 + PO + 0.05), Math.PI / 2, 0, true);
  for (const rz of [-1.2, 2.6]) for (const sx of [-1, 1]) cyl(0.035, 0.14, 8, rustD, sx * (L / 2 + PO + 0.05), CY - 0.05, rz, 0, Math.PI / 2, true);
  // ---- ventilator cowls, three, 0.5 tall ----
  for (const [cx, cz] of [[-3.5, -1.0], [0.5, 0.8], [4.0, -1.5]]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.18, 16), tankB); base.position.set(cx, H + 0.09, cz); g.add(base);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), galvD); neck.position.set(cx, H + 0.22, cz); g.add(neck);
    const turb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 7), galv); turb.scale.set(1, 0.7, 1); turb.position.set(cx, H + 0.38, cz); g.add(turb);
    for (let i = 0; i < 6; i++) { const v = box(0.03, 0.22, 0.012, galvD, cx + Math.cos(i * Math.PI / 3) * 0.19, H + 0.38, cz + Math.sin(i * Math.PI / 3) * 0.19); v.rotation.y = -i * Math.PI / 3; }
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.05, 12), galvD); hat.position.set(cx, H + 0.5, cz); g.add(hat);
    box(0.14, 0.006, 0.36, rust, cx, H + 0.02, cz + 0.2);                      // rust bleed onto the roof
    box(0.3, 0.008, 0.3, dust, cx, H + 0.185, cz);
  }
  // ---- roller shutter, north wall: lintel, C channel guides, curtain rolled half up with a lip on each slat,
  // bottom rail with rubber seal, drum on end plates inside a housing, step and worn threshold ----
  {
    const [x0, x1, , y1] = SHUT, cx = (x0 + x1) / 2, w = x1 - x0, zf = -D / 2;
    box(w + 0.6, 0.3, T + 0.06, concN, cx, y1 + 0.15, zf + T / 2 - 0.03);        // lintel beam proud of the wall
    box(w + 0.6, 0.02, 0.03, groove, cx, y1 + 0.01, zf - 0.045);                  // shadow line under the lintel
    for (const gx of [x0 - 0.06, x1 + 0.06]) {                                    // C channel guides: back, two flanges
      box(0.12, y1, 0.02, steel, gx, y1 / 2, zf + 0.14);
      box(0.12, y1, 0.02, steel, gx, y1 / 2, zf + 0.02);
      box(0.02, y1, 0.14, steel, gx + (gx < cx ? -0.05 : 0.05), y1 / 2, zf + 0.08);
      box(0.006, 0.5, 0.1, rust, gx + (gx < cx ? -0.055 : 0.055) + (gx < cx ? -0.004 : 0.004), 0.4, zf + 0.08);
    }
    for (let i = 0; i < 16; i++) {
      const y = 1.8 + 0.0375 + i * 0.075;
      box(w, 0.075, 0.02, i % 2 ? galv : galvD, cx, y, zf + 0.08);
      box(w, 0.012, 0.012, i % 2 ? galvD : galv, cx, y - 0.03, zf + 0.064);       // rolled lip on each slat
    }
    box(w, 0.06, 0.06, steel, cx, 1.8 + 0.03, zf + 0.08);                         // bottom rail
    box(w, 0.02, 0.03, rubber, cx, 1.8 - 0.01, zf + 0.08);                        // rubber seal
    box(0.3, 0.04, 0.02, rust, cx - 0.9, 1.82, zf + 0.112);
    box(w, 0.4, 0.008, rust, cx, 1.9 + 0.2, zf + 0.091);                          // rust on the lower slats
    // drum housing: three sides plus end plates, drum visible under the open front
    box(w + 0.3, 0.05, 0.5, tankB, cx, y1 + 0.5, zf - 0.1);                       // top
    box(w + 0.3, 0.5, 0.05, tankB, cx, y1 + 0.25, zf - 0.325);                    // front
    box(w + 0.3, 0.2, 0.05, tankB, cx, y1 + 0.1, zf - 0.11);                       // rear apron under the lintel
    box(w + 0.3, 0.012, 0.4, dust, cx, y1 + 0.531, zf - 0.1);
    for (const ex of [x0 - 0.15, x1 + 0.15]) { box(0.02, 0.5, 0.5, steel, ex, y1 + 0.25, zf - 0.1); box(0.01, 0.42, 0.42, steelS, ex + (ex < cx ? -0.006 : 0.006), y1 + 0.25, zf - 0.1); for (const [a, b] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) cone(ex + (ex < cx ? -0.012 : 0.012), y1 + 0.25 + b, zf - 0.1 + a, 0, ex < cx ? Math.PI / 2 : -Math.PI / 2); }
    const drum = cyl(0.2, w + 0.26, 24, galvD, cx, y1 + 0.22, zf - 0.08, 0, Math.PI / 2);
    for (const rx of [-0.9, -0.2, 0.7, 1.2]) box(0.05, 0.3, 0.006, rust, cx + rx, y1 + 0.45, zf - 0.355);
    box(w + 0.3, 0.06, 0.006, rustD, cx, y1 + 0.03, zf - 0.355);
    box(w + 0.6, 0.15, 0.5, stain, cx, 0.075, zf - 0.25);                         // concrete step / apron
    box(w + 0.6, 0.02, 0.03, stainD, cx, 0.15, zf - 0.49);                        // step nosing
    box(w, 0.006, 0.4, dust, cx, 0.153, zf - 0.3);
    box(w + 0.2, 0.02, 0.4, stain, cx, 0.11, zf + 0.2);                           // worn threshold inside
    // signage: a "DANGER" plate and a shutter number plate as decal boxes on the lintel
    box(0.5, 0.25, 0.012, red, cx + 0.9, y1 + 0.15, zf - 0.03 - 0.006); box(0.44, 0.19, 0.006, white, cx + 0.9, y1 + 0.15, zf - 0.045);
    box(0.25, 0.25, 0.012, yellow, cx - 1.0, y1 + 0.15, zf - 0.036); cone(cx - 1.0, y1 + 0.26, zf - 0.045, -Math.PI / 2, 0); cone(cx - 1.0, y1 + 0.04, zf - 0.045, -Math.PI / 2, 0);
    // bump posts either side of the roller door
    for (const bx of [x0 - 0.4, x1 + 0.4]) { cyl(0.08, 0.9, 16, yellow, bx, 0.45 + 0.15, zf - 0.42); box(0.24, 0.15, 0.24, stain, bx, 0.075, zf - 0.42); box(0.06, 0.25, 0.006, rustD, bx, 0.3, zf - 0.42 - 0.084); }
  }
  // ---- personnel door, east wall: frame with stops and lintel, door open 60 degrees outward, step ----
  {
    const [z0, z1, , y1] = DOOR, cz = (z0 + z1) / 2, xf = L / 2;
    box(T + 0.06, 0.25, z1 - z0 + 0.5, conc, xf - T / 2 + 0.03, y1 + 0.2, cz);           // lintel proud
    box(0.03, 0.02, z1 - z0 + 0.5, groove, xf + 0.045, y1 + 0.085, cz);                  // shadow line under it
    for (const zz of [z0 - 0.04, z1 + 0.04]) { box(0.16, y1 + 0.06, 0.08, steel, xf - 0.08, (y1 + 0.06) / 2, zz); box(0.03, y1, 0.03, steelS, xf - 0.015, y1 / 2, zz + (zz < cz ? 0.05 : -0.05)); }   // jambs and stops
    box(0.16, 0.08, z1 - z0 + 0.16, steel, xf - 0.08, y1 + 0.03, cz);                    // head
    box(0.03, 0.03, z1 - z0, steelS, xf - 0.015, y1 - 0.015, cz);
    const hinge = new THREE.Group(); hinge.position.set(xf + 0.02, 0, z0); hinge.rotation.y = Math.PI / 3; g.add(hinge);
    box(0.05, y1 - 0.05, z1 - z0 - 0.04, tankB, 0, (y1 - 0.05) / 2 + 0.02, (z1 - z0) / 2, hinge);
    box(0.012, y1 - 0.25, z1 - z0 - 0.2, tankB, 0.03, (y1 - 0.05) / 2 + 0.02, (z1 - z0) / 2, hinge);       // raised panel
    box(0.012, 0.3, 0.5, galvD, 0.04, 0.5, (z1 - z0) / 2, hinge);                 // louvre vent
    for (let i = 0; i < 5; i++) box(0.02, 0.02, 0.46, steel, 0.045, 0.4 + i * 0.05, (z1 - z0) / 2, hinge);
    box(0.03, 0.05, 0.6, steel, 0.05, 1.05, (z1 - z0) / 2, hinge);                 // push bar
    box(0.012, 0.25, z1 - z0 - 0.1, steelS, 0.04, 0.15, (z1 - z0) / 2, hinge);      // kick plate
    box(0.006, 0.5, 0.05, rust, 0.038, 1.5, 0.08, hinge);
    box(0.006, 0.3, 0.3, rustD, 0.038, 0.2, 0.5, hinge);
    for (const hy of [0.4, 1.1, 1.8]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), rust); h.position.set(0, hy, 0.02); hinge.add(h); }
    box(0.4, 0.02, 1.2, stain, xf + 0.15, 0.11, cz);                               // worn threshold outside
    box(0.6, 0.15, 1.4, stain, xf + 0.33, 0.075, cz);                              // step
    box(0.03, 0.02, 1.4, stainD, xf + 0.62, 0.15, cz);                             // nosing
    box(0.5, 0.008, 1.3, dust, xf + 0.33, 0.154, cz);
    box(0.012, 0.35, 0.12, steel, xf - 0.02, 1.1, z0 - 0.15); box(0.04, 0.12, 0.06, rust, xf - 0.005, 1.03, z0 - 0.15); box(0.04, 0.05, 0.05, steel, xf - 0.005, 0.95, z0 - 0.15);   // hasp keep, staple, padlock on the frame
    // sign plates beside the door: yellow warning, white notice
    box(0.012, 0.2, 0.3, yellow, xf + 0.006, 1.7, z1 + 0.55);
    cone(xf + 0.014, 1.7, z1 + 0.43, 0, -Math.PI / 2); cone(xf + 0.014, 1.7, z1 + 0.67, 0, -Math.PI / 2);
    box(0.012, 0.3, 0.22, white, xf + 0.006, 1.3, z1 + 0.55); box(0.006, 0.2, 0.14, steel, xf + 0.013, 1.3, z1 + 0.55);
    box(0.006, 0.3, 0.05, rust, xf + 0.002, 1.45, z1 + 0.5);
    box(0.006, 0.2, 0.2, rustD, xf + 0.002, 1.05, z1 + 0.55);
  }
  // ---- windows, south wall: proud lintel, sill with drip, steel frame with a rebate, mullion, broken
  // transom and glazing, burglar bars, drip hood, rust ----
  for (const [x0, x1, y0, y1] of WIN) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, zf = D / 2, w = x1 - x0;
    box(w + 0.5, 0.22, T + 0.06, concS, cx, y1 + 0.16, zf - T / 2 + 0.03);       // lintel
    box(w + 0.5, 0.02, 0.03, groove, cx, y1 + 0.06, zf + 0.045);                  // shadow line under the lintel
    box(w + 0.4, 0.07, 0.2, stain, cx, y0 - 0.085, zf + 0.06);                    // sill, projecting
    box(w + 0.4, 0.02, 0.02, stainD, cx, y0 - 0.13, zf + 0.15);                   // sill drip
    box(0.05, y1 - y0 + 0.1, 0.12, steel, x0 - 0.025, cy, zf - 0.06);
    box(0.05, y1 - y0 + 0.1, 0.12, steel, x1 + 0.025, cy, zf - 0.06);
    box(w + 0.1, 0.05, 0.12, steel, cx, y1 + 0.025, zf - 0.06);
    box(w + 0.1, 0.05, 0.12, steel, cx, y0 - 0.025, zf - 0.06);
    box(0.025, y1 - y0, 0.025, steelS, x0 + 0.0125, cy, zf - 0.1);                // inner rebate
    box(0.025, y1 - y0, 0.025, steelS, x1 - 0.0125, cy, zf - 0.1);
    box(w, 0.025, 0.025, steelS, cx, y1 - 0.0125, zf - 0.1);
    box(w, 0.025, 0.025, steelS, cx, y0 + 0.0125, zf - 0.1);
    box(0.03, y1 - y0, 0.03, steel, cx, cy, zf - 0.06);                            // mullion
    box(w / 2 - 0.02, 0.03, 0.03, steel, cx + w / 4, cy, zf - 0.06);               // transom, one half only
    const bent = box(0.25, 0.03, 0.03, rust, cx - 0.15, cy - 0.1, zf - 0.06); bent.rotation.z = 0.5;
    box(w / 2 - 0.03, (y1 - y0) / 2 - 0.03, 0.006, glass, cx - w / 4, cy + (y1 - y0) / 4, zf - 0.06);
    box(w / 2 - 0.03, (y1 - y0) / 2 - 0.03, 0.006, glass, cx + w / 4, cy - (y1 - y0) / 4, zf - 0.06);
    const shard = box(0.2, 0.25, 0.006, glass, cx + w / 4 + 0.15, cy + 0.2, zf - 0.06); shard.rotation.z = 0.3;
    box(0.05, 0.6, 0.006, rust, x0 + 0.1, y0 - 0.45, zf + 0.004);
    box(0.03, 0.4, 0.006, rustD, x1 - 0.15, y0 - 0.35, zf + 0.004);
    // burglar bars and flats, drip hood above the lintel
    const zb = zf + 0.06;
    for (const bx of [-0.3, 0, 0.3]) cyl(0.012, y1 - y0 + 0.1, 8, steel, cx + bx, cy, zb);
    for (const by of [y0 + 0.15, y1 - 0.15]) box(w + 0.1, 0.03, 0.012, steel, cx, by, zb);
    box(w + 0.5, 0.04, 0.24, steel, cx, y1 + 0.29, zf + 0.12);
    box(w + 0.5, 0.03, 0.015, steel, cx, y1 + 0.255, zf + 0.233);                // hood drip
    box(w + 0.4, 0.008, 0.18, dust, cx, y1 + 0.314, zf + 0.12);
    box(0.05, 0.3, 0.006, rust, x0 + 0.05, y1 - 0.05, zf + 0.004);
  }
  for (const [hx, hy] of [[-4.5, 1.6], [-4.35, 1.45], [-4.2, 1.7], [-4.6, 1.3], [-4.05, 1.5], [-4.3, 1.2], [-1.6, 2.0], [-1.45, 1.85]]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6, 1, true), holeM); h.rotation.x = Math.PI / 2; h.position.set(hx, hy, D / 2); g.add(h); }
  // ---- corner steel columns: I section, base plate with bolts, splice plate at 2.4, top gusset, rust ----
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
    box(0.012, 0.5, 0.2, steel, cx + sx * 0.12, 2.4, cz); for (const [a, b] of [[-0.06, -0.16], [0.06, -0.16], [-0.06, 0], [0.06, 0], [-0.06, 0.16], [0.06, 0.16]]) cone(cx + sx * 0.128, 2.4 + b, cz + a, 0, -sx * Math.PI / 2); box(0.006, 0.45, 0.16, rust, cx + sx * 0.122, 1.9, cz);
    box(0.24, 0.5, 0.012, steel, cx, 2.4, cz + sz * 0.12); for (const [a, b] of [[-0.06, -0.16], [0.06, -0.16], [-0.06, 0], [0.06, 0], [-0.06, 0.16], [0.06, 0.16]]) cone(cx + a, 2.4 + b, cz + sz * 0.128, sz * Math.PI / 2, 0); box(0.16, 0.45, 0.006, rust, cx, 1.9, cz + sz * 0.122);
    box(0.26, 0.012, 0.26, steel, cx, CH - 0.006, cz);                          // cap plate
    box(0.012, 0.3, 0.22, steel, cx + sx * 0.12, H + PAR - 0.15, cz); box(0.24, 0.3, 0.012, steel, cx, H + PAR - 0.15, cz + sz * 0.12);
    cone(cx + sx * 0.128, H + PAR - 0.15, cz, 0, -sx * Math.PI / 2); cone(cx, H + PAR - 0.15, cz + sz * 0.128, sz * Math.PI / 2, 0);
    box(0.22, 0.008, 0.22, dust, cx, CH + 0.004, cz);
  }
  // ---- process pipe through the south wall: thrust block, riser, valve, elbow, wall flange with bolts ----
  {
    const px = 0.0, zr = D / 2 + 0.34, yh = 1.15, R = 0.15;
    box(0.6, 0.35, 0.4, stain, px, 0.175, zr);
    box(0.5, 0.01, 0.3, dust, px, 0.355, zr);
    cyl(R, yh - 0.35 - R, 16, steel, px, 0.35 + (yh - 0.35 - R) / 2, zr);
    const el = new THREE.Mesh(new THREE.TorusGeometry(R, R, 8, 10, Math.PI / 2), steel); el.rotation.y = -Math.PI / 2; el.position.set(px, yh - R, zr - R); g.add(el);
    cyl(R, zr - R - D / 2, 16, steel, px, yh, D / 2 + (zr - R - D / 2) / 2, Math.PI / 2);
    cyl(R + 0.06, 0.04, 16, rustD, px, yh, D / 2 + 0.03, Math.PI / 2);
    cyl(R + 0.06, 0.04, 16, steel, px, yh, D / 2 + 0.09, Math.PI / 2);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cone(px + Math.cos(a) * (R + 0.035), yh + Math.sin(a) * (R + 0.035), D / 2 + 0.118, Math.PI / 2, 0); }
    box(0.1, 0.9, 0.006, rust, px + 0.05, yh - 0.6, D / 2 + 0.004);
    cyl(R + 0.04, 0.05, 16, rustD, px, 0.75, zr);
    cyl(0.06, 0.25, 8, steel, px + R + 0.1, 0.75, zr, 0, Math.PI / 2);
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 14), red); wh.rotation.y = Math.PI / 2; wh.position.set(px + R + 0.26, 0.75, zr); g.add(wh);
    for (let i = 0; i < 3; i++) { const sp = box(0.02, 0.32, 0.02, red, px + R + 0.26, 0.75, zr); sp.rotation.x = i * Math.PI / 3; }
    box(0.08, 0.3, 0.006, rust, px + 0.06, 0.5, zr + R + 0.003);
    box(0.9, 0.06, 0.4, sand, px + 0.1, 0.03, zr);
  }
  // ---- west wall: roof ladder with hoops, downpipe, control cabinet, louvre vent ----
  {
    const lx = -L / 2 - 0.2, lz = -0.6, LH = H + PAR + 0.15, xf = -L / 2;
    for (const rz of [-0.22, 0.22]) box(0.05, LH, 0.05, steel, lx, LH / 2, lz + rz);
    for (let ry = 0.45; ry < LH - 0.1; ry += 0.3) cyl(0.014, 0.44, 8, steel, lx, ry, lz, Math.PI / 2);
    for (const by of [1.2, 2.6, 4.0, 5.0]) { for (const rz of [-0.22, 0.22]) box(0.2, 0.05, 0.05, steel, lx + 0.1, by, lz + rz); box(0.006, 0.35, 0.5, rust, xf - 0.004, by - 0.25, lz); }
    for (let hy = 2.5; hy < LH - 0.2; hy += 0.9) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.015, 5, 10, Math.PI), steel); hoop.rotation.z = -Math.PI / 2; hoop.rotation.y = Math.PI / 2; hoop.position.set(lx, hy, lz); g.add(hoop); }
    for (const hz of [-0.3, 0.3]) box(0.012, 2.4, 0.03, steelL, lx - 0.34, 3.9, lz + hz);
    box(0.4, 0.05, 0.6, stain, lx + 0.05, 0.025, lz);
    // downpipe from the west scupper, with brackets and a shoe at the foot
    const dp = cyl(0.05, H - 0.4, 8, steel, xf - 0.11, (H - 0.4) / 2 + 0.25, -3.0);
    cyl(0.05, 0.3, 8, steel, xf - 0.11 - 0.12, 0.2, -3.0, 0, Math.PI / 2);        // shoe
    for (const by of [0.8, 2.4, 4.0]) box(0.14, 0.05, 0.16, rust, xf - 0.07, by, -3.0);
    box(0.008, 1.2, 0.14, rust, xf - 0.004, 0.7, -3.0);
    box(0.25, 0.8, 0.6, blue, xf - 0.125, 1.4, 1.5);                              // control cabinet
    box(0.02, 0.6, 0.45, steel, xf - 0.26, 1.4, 1.5);
    box(0.02, 0.05, 0.12, steel, xf - 0.27, 1.4, 1.75);                           // handle
    box(0.006, 0.5, 0.5, rust, xf - 0.004, 0.75, 1.5);
    box(0.25, 0.012, 0.6, dust, xf - 0.125, 1.806, 1.5);
    cyl(0.03, 2.6, 8, galvD, xf - 0.05, 2.2, 0.2, Math.PI / 2);                   // conduit into the cabinet
    for (const cz of [-0.8, 0.4, 1.2]) box(0.05, 0.08, 0.06, steel, xf - 0.03, 2.2, cz);   // saddle clips
    cyl(0.03, 0.9, 8, galvD, xf - 0.05, 2.2 - 0.45 + 0.03, 1.5);
    // louvre vent
    const vx = xf - 0.03, vy = 3.2, vz = 2.5;
    box(0.04, 0.55, 0.65, galvD, vx, vy, vz);
    box(0.02, 0.6, 0.7, steelS, vx + 0.01, vy, vz);                               // flange frame
    for (let i = 0; i < 6; i++) { const s = box(0.03, 0.03, 0.55, steel, vx - 0.02, vy - 0.2 + i * 0.08, vz); s.rotation.z = -0.6; }
    box(0.006, 0.4, 0.5, rust, vx - 0.025, vy - 0.5, vz);
    // second louvre vent high on the east wall, matching
    box(0.04, 0.55, 0.65, galvD, L / 2 + 0.03, vy, -2.5);
    box(0.02, 0.6, 0.7, steelS, L / 2 + 0.02, vy, -2.5);
    for (let i = 0; i < 6; i++) { const s = box(0.03, 0.03, 0.55, steel, L / 2 + 0.05, vy - 0.2 + i * 0.08, -2.5); s.rotation.z = 0.6; }
    box(0.006, 0.4, 0.5, rust, L / 2 + 0.025, vy - 0.5, -2.5);
  }
  // ---- electrics on the north wall: junction box with gland, conduit up and across with saddle clips,
  // caged wall lamp over the shutter, cable sag to the corner column ----
  {
    const zf = -D / 2, jx = 0.7, jy = 1.6;
    box(0.3, 0.4, 0.14, blue, jx, jy, zf - 0.07);
    box(0.26, 0.3, 0.012, steelS, jx, jy, zf - 0.146);                             // lid
    for (const [a, b] of [[-0.11, -0.13], [0.11, -0.13], [-0.11, 0.13], [0.11, 0.13]]) cone(jx + a, jy + b, zf - 0.155, -Math.PI / 2, 0, steel);
    box(0.26, 0.012, 0.14, dust, jx, jy + 0.206, zf - 0.07);
    box(0.006, 0.4, 0.2, rust, jx, jy - 0.4, zf - 0.004);
    box(0.2, 0.06, 0.006, rustD, jx, jy - 0.24, zf - 0.142);
    cyl(0.04, 0.06, 8, steel, jx, jy + 0.23, zf - 0.05);                           // gland
    cyl(0.025, 2.0, 8, galvD, jx, jy + 0.2 + 1.0, zf - 0.05);
    cyl(0.025, 3.3, 8, galvD, jx - 1.65, jy + 2.2, zf - 0.05, 0, Math.PI / 2);
    for (const cx of [jx - 0.5, jx - 1.6, jx - 2.8]) box(0.06, 0.06, 0.04, steel, cx, jy + 2.2, zf - 0.03);
    for (const cy of [jy + 0.6, jy + 1.4]) box(0.06, 0.04, 0.06, steel, jx, cy, zf - 0.03);
    cyl(0.025, 0.8, 8, galvD, jx, jy - 0.6, zf - 0.05);                             // conduit down to the ground too
    cyl(0.03, 0.06, 8, rubber, jx, jy - 0.22, zf - 0.05);
    // caged lamp over the shutter: bracket arm, lamp body, lens, and a cage of bars and rings
    const lxp = -2.6, ly = 3.85, lz = zf - 0.45;
    box(0.06, 0.06, 0.5, steel, lxp, ly, zf - 0.25);
    box(0.12, 0.2, 0.012, steel, lxp, ly, zf - 0.006);                              // wall plate
    box(0.3, 0.18, 0.24, galvD, lxp, ly - 0.1, lz);
    box(0.2, 0.02, 0.14, lens, lxp, ly - 0.2, lz);
    box(0.3, 0.008, 0.24, dust, lxp, ly - 0.005, lz);
    for (const [bx, bz] of [[-0.16, -0.13], [0.16, -0.13], [-0.16, 0.13], [0.16, 0.13]]) cyl(0.008, 0.36, 6, steel, lxp + bx, ly - 0.2, lz + bz);
    for (const ry of [ly - 0.36, ly - 0.24]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.007, 4, 12), steel); ring.rotation.x = Math.PI / 2; ring.position.set(lxp, ry, lz); g.add(ring); }
    for (const bx of [-0.08, 0, 0.08]) cyl(0.006, 0.28, 5, steel, lxp + bx, ly - 0.36, lz, Math.PI / 2);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(lxp, ly, zf - 0.28), new THREE.Vector3(lxp - 1.4, ly - 0.45, zf - 0.3), new THREE.Vector3(lxp - 2.6, ly - 0.35, zf - 0.28), new THREE.Vector3(-L / 2 - 0.12, H + PAR - 0.2, zf - 0.13)]);
    const cab = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 5, false), rubber); g.add(cab);
    // sign plates on the north wall: white notice board, stencilled number plate
    box(0.7, 0.5, 0.012, white, 2.6, 2.0, zf - 0.006); box(0.62, 0.42, 0.006, steelS, 2.6, 2.0, zf - 0.013); box(0.5, 0.06, 0.004, red, 2.6, 2.12, zf - 0.017);
    for (const [a, b] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) cone(2.6 + a, 2.0 + b, zf - 0.02, -Math.PI / 2, 0, steel);
    box(0.006, 0.35, 0.2, rust, 2.6, 1.55, zf - 0.004);
    box(0.4, 0.3, 0.012, yellow, 4.6, 1.5, zf - 0.006); box(0.3, 0.2, 0.006, rubber, 4.6, 1.5, zf - 0.013);
  }
  // ---- roof: pipe penetration boot with flange, drain grate with rust, walkway pads to the cowls ----
  cyl(0.12, 0.35, 16, galvD, 2.0, H + 0.175, 0.2); cyl(0.2, 0.03, 16, galvD, 2.0, H + 0.02, 0.2); cyl(0.13, 0.04, 16, rustD, 2.0, H + 0.36, 0.2);
  box(0.3, 0.02, 0.3, steel, L / 2 - 0.6, H + 0.02, -D / 2 + 0.6); box(0.36, 0.006, 0.36, rustD, L / 2 - 0.6, H + 0.015, -D / 2 + 0.62);
  for (const px of [-5.2, -4.4, -3.6, -2.8]) box(0.6, 0.02, 0.6, stainD, px, H + 0.025, -3.0);
  // ---- interior: plaster band at 1.2, ceiling pipe with hangers, lamp, pump plinth ----
  box(L - 2 * T - 0.02, 0.35, 0.02, plaster, 0, 1.2, D / 2 - T - 0.01);
  box(L - 2 * T - 0.02, 0.35, 0.02, plaster, 0, 1.2, -D / 2 + T + 0.01);
  box(0.02, 0.35, D - 2 * T - 0.02, plaster, L / 2 - T - 0.01, 1.2, 0);
  box(0.02, 0.35, D - 2 * T - 0.02, plaster, -L / 2 + T + 0.01, 1.2, 0);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, L - 2 * T - 0.1, 16), steel); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, H - 0.5, -1.5); g.add(pipe);
  for (const hx of [-4, -1.3, 1.3, 4]) { box(0.04, 0.25, 0.04, steel, hx, H - 0.35, -1.5); const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16), rust); fl.rotation.z = Math.PI / 2; fl.position.set(hx + 0.4, H - 0.5, -1.5); g.add(fl); }
  box(0.3, 0.08, 0.3, steel, 1.0, H - 0.3, 0.5); box(0.22, 0.02, 0.22, lens, 1.0, H - 0.35, 0.5);
  cyl(0.02, 0.6, 6, galvD, 1.0, H - 0.3 + 0.04 + 0.3, 0.5);
  box(1.6, 0.5, 0.7, stain, -1.5, 0.35, 0.5);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16), blue); pump.rotation.z = Math.PI / 2; pump.position.set(-1.5, 0.85, 0.5); g.add(pump);
  box(0.5, 0.4, 0.5, steel, -0.7, 0.8, 0.5);
  // ---- sand fillet: south and west, wrapping the corners ----
  box(L + 0.4, 0.12, 0.3, sand, 0, 0.06, D / 2 + 0.15);
  box(L - 2, 0.12, 0.18, sand, -0.5, 0.17, D / 2 + 0.09);
  box(4.0, 0.08, 0.1, dust, 2.0, 0.27, D / 2 + 0.05);
  box(0.3, 0.12, D + 0.4, sand, -L / 2 - 0.15, 0.06, 0);
  box(0.18, 0.12, D - 2, sand, -L / 2 - 0.09, 0.17, 0.5);
  box(0.3, 0.1, D + 0.4, sand, L / 2 + 0.15, 0.05, 0);
  box(L + 0.4, 0.08, 0.3, sand, 0, 0.04, -D / 2 - 0.15);
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
