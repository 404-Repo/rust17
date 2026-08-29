// oil_storage_tank, round 13 rebuild (audit: "plating bland, no ladder detail, no staining bands,
// rivets absent"). Five courses of 32 segment shell split sun/shade, a real raised lap seam torus at
// every course line with a rivet row along it, vertical rivet lines every 60 degrees as staggered
// rivet heads on a butt strap, cone roof with twelve radial seam strips and the vent stub with a
// rain cap, a 1 m grating walkway ring at 4.6 m (the level walks on it: deck top y = 4.6, rail top
// 5.7) on twelve angled brackets, a two rail yellow handrail on 24 posts, a caged access ladder with
// hoops and a top hatch gate on the south west, a bolted manway at the base with a davit, an inlet
// pipe with flanges and a hand wheel valve north, a drain south, a level gauge, spill staining bands
// under the manway and round the foot, a stencil ID and a hazard plate as decal boxes, plinth and
// sand fillet.
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
  const TANK = 0x9c988c, RUST = 0x6b4426, GALV = 0x9ea3a1, STEEL = 0x4f5257, SAND = 0xcdb88e;
  const YEL = 0xc9a227, CONC = 0x857c6c, CONCB = 0xb8ae9b;
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const rustD = M(0x4e2d19, 'metal', 0.92, 0.1);
  const galv = M(GALV, 'metal', 0.75, 0.55, true);
  const galvD = M(tint(GALV, 0.88), 'metal', 0.8, 0.5, true);
  const galvS = M(tint(GALV, 0.94), 'metal', 0.76, 0.5);
  const steel = M(STEEL, 'metal', 0.8, 0.3);
  const steelL = M(tint(STEEL, 1.1), 'metal', 0.78, 0.3);
  const steelD = M(tint(STEEL, 0.9), 'metal', 0.84, 0.3);
  const seam = M(tint(TANK, 0.8), 'metal', 0.85, 0.2);
  const strap = M(tint(TANK, 0.9), 'metal', 0.85, 0.2);
  const rivet = M(tint(TANK, 1.12), 'metal', 0.7, 0.35);
  const yel = M(YEL, 'metal', 0.7, 0.15);
  const yelD = M(tint(YEL, 0.9), 'metal', 0.72, 0.15);
  const sand = M(SAND, 'ground', 0.95, 0.0);
  const conc = M(CONC, 'stone', 0.92, 0.0);
  const concB = M(CONCB, 'stone', 0.9, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const red = M(0x9c4a3c, 'metal', 0.75, 0.15);
  const stainD = M(tint(TANK, 0.62), 'metal', 0.94, 0.1, true);   // oil spill dark
  const stainM = M(tint(TANK, 0.74), 'metal', 0.92, 0.12, true);  // stained band
  const white = M(0xd8d2c2, 'metal', 0.8, 0.1);
  const ink = M(0x2a2622, 'metal', 0.85, 0.1);
  const orange = M(0xc8661e, 'metal', 0.75, 0.15);

  const R = 3.2, RW = 4.0, H = 4.6, C = 0.92, SEG = 32, SEGW = 32;
  const bx = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg, open, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, !!open), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const torus = (r, t, ts, seg, mat, y, parent, arc) => {
    const mm = new THREE.Mesh(new THREE.TorusGeometry(r, t, ts, seg, arc || Math.PI * 2), mat);
    mm.rotation.x = Math.PI / 2; mm.position.y = y; (parent || g).add(mm); return mm;
  };
  const hex = (mat, x, y, z, parent, r, h, axis) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.018, r || 0.018, h || 0.024, 6), mat);
    if (axis === 'z') b.rotation.x = Math.PI / 2; else if (axis === 'x') b.rotation.z = Math.PI / 2;
    b.position.set(x, y, z); (parent || g).add(b); return b;
  };
  // a swing group around the tank axis, so parts can be laid out in the r,y plane (child +z faces out)
  const swing = (theta, parent) => { const s = new THREE.Group(); s.rotation.y = theta; (parent || g).add(s); return s; };
  // an arc band hugging the shell: open partial cylinder, centred on angle th, half width `half` (radians)
  const band = (r, h, y, th, half, mat, seg) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 8, 1, true, th - half, half * 2), mat);
    mm.position.y = y; g.add(mm); return mm;
  };
  const LAD = -3 * Math.PI / 4;   // ladder swing angle (world south west, clear of every level rail gap)

  // ---- courses: bottom stained, top bleached, sun side (+Z) lighter --------------------------
  const courseTint = [0.84, 0.92, 1.0, 1.06, 1.12];
  for (let i = 0; i < 5; i++) {
    const base = tint(TANK, courseTint[i]);
    for (const side of [0, 1]) {
      const col = side === 0 ? tint(base, 1.07) : base;
      const geo = new THREE.CylinderGeometry(R, R, C, SEG, 1, true, side === 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI);
      const mm = new THREE.Mesh(geo, M(col, 'metal', 0.85, 0.2, true));
      mm.position.y = i * C + C / 2;
      g.add(mm);
    }
  }
  // ---- raised lap seams: a real torus ring at every course line plus the eave, each with a rivet row ----
  for (let i = 1; i <= 5; i++) {
    const y = i * C;
    torus(R + 0.005, 0.045, 5, SEG, seam, y);
    // the lower course sheet laps under: a thin darker band just below the ring (shadow line)
    cyl(R + 0.012, R + 0.012, 0.05, stainM, 0, y - 0.06, 0, SEG, true);
    // rivet row along the seam, 48 heads
    for (let k = 0; k < 32; k++) {
      const s = swing(k * Math.PI / 16 + (i % 2) * Math.PI / 32);
      bx(0.05, 0.05, 0.04, rivet, 0, y - 0.11, R + 0.02, s);
    }
    // rust weep under the seam, staggered round
    for (let k = 0; k < 8; k++) {
      const s = swing(k * Math.PI / 4 + i * 0.27 + 0.15);
      bx(0.07, 0.16 + 0.05 * (k % 3), 0.006, rust, 0.02 * (k % 2), y - 0.2, R + 0.007, s);
    }
  }
  // ---- vertical rivet lines every 60 degrees: a butt strap with a staggered double row of heads ----
  for (let k = 0; k < 6; k++) {
    const th = k * Math.PI / 3 + Math.PI / 6;
    const s = swing(th);
    bx(0.2, H - 0.06, 0.025, strap, 0, H / 2, R + 0.01, s);
    for (let i = 0; i < 19; i++) {
      const y = 0.16 + i * 0.235;
      if (Math.abs((y % C) - C) < 0.13 || (y % C) < 0.13) continue;   // clear of the seam rings
      bx(0.055, 0.055, 0.04, rivet, 0.05 * ((i & 1) ? 1 : -1), y, R + 0.03, s);
    }
    for (let i = 0; i < 5; i++) bx(0.06, 0.24, 0.008, rust, 0.1 * ((i & 1) ? 1 : -1), i * C + 0.28, R + 0.027, s);
  }

  // ---- plinth, sand fillet, foot staining ------------------------------------------------------
  cyl(R + 0.05, R + 0.08, 0.12, conc, 0, 0.06, 0, SEG, false);
  const fil = cyl(0.2, R + 0.6, 0.26, sand, 0, 0.13, 0, SEG, false);
  fil.scale.set(1.04, 1, 0.96);
  const collar = cyl(R + 0.02, R + 0.42, 0.22, M(0xa89372, 'ground', 0.96, 0.0), 0, 0.11, 0, SEG, false);
  collar.scale.set(1.04, 1, 0.96);
  // stained band round the foot: a dark 0.45 m band, a lighter tide line above it
  cyl(R + 0.004, R + 0.004, 0.42, stainD, 0, 0.33, 0, SEG, true);
  cyl(R + 0.005, R + 0.005, 0.12, stainM, 0, 0.6, 0, SEG, true);
  for (let k = 0; k < 10; k++) { const s = swing(k * Math.PI / 5 + 0.3); bx(0.3 + 0.1 * (k % 3), 0.07 + 0.05 * (k % 2), 0.006, conc, 0, 0.55 + 0.04 * (k % 2), R + 0.008, s); }
  // anchor chairs every 30 degrees round the foot (none behind the inlet or the ladder)
  for (let k = 0; k < 12; k++) {
    if (k === 6 || k === 9) continue;
    const s = swing(k * Math.PI / 6);
    bx(0.24, 0.03, 0.16, steelL, 0, 0.5, R + 0.08, s);
    for (const dx of [-0.1, 0.1]) bx(0.02, 0.36, 0.14, k % 2 ? steel : steelD, dx, 0.32, R + 0.07, s);
    hex(gun, 0, 0.53, R + 0.09, s, 0.022, 0.03);
    bx(0.05, 0.2 + 0.04 * (k % 3), 0.008, rust, 0.14, 0.4, R + 0.009, s);
  }

  // ---- roof: cone, eave ring, twelve radial seam strips with rivets, dust, vent stub with rain cap ----
  const roof = new THREE.Mesh(new THREE.ConeGeometry(R + 0.08, 0.6, SEG, 1, false), M(tint(TANK, 1.15), 'metal', 0.85, 0.2, true));
  roof.position.y = H + 0.3; g.add(roof);
  torus(R + 0.06, 0.04, 6, SEG, seam, H + 0.02);
  const slope = Math.atan2(0.6, R + 0.08);
  const ribLen = Math.hypot(R - 0.1, 0.56);
  for (let k = 0; k < 12; k++) {
    const s = swing(k * Math.PI / 6);
    const rib = bx(0.09, 0.035, ribLen, seam, 0, H + 0.31, (R - 0.1) / 2 + 0.1, s);
    rib.rotation.x = slope;
    for (let i = 0; i < 4; i++) {
      const t = 0.4 + i * 0.75;
      bx(0.04, 0.03, 0.04, rivet, 0, H + 0.6 - t * Math.tan(slope) + 0.035, t, s).rotation.x = slope;
    }
    bx(0.05, 0.1, 0.008, rust, 0, H - 0.08, R + 0.006, s);        // drip off each rafter foot
  }
  const dust = new THREE.Mesh(new THREE.ConeGeometry(R - 0.15, 0.53, SEG, 1, true), sand);
  dust.position.y = H + 0.02 + 0.265; g.add(dust);
  cyl(0.15, 0.15, 0.3, seam, 0, H + 0.6 + 0.13, 0, 16, false);
  cyl(0.2, 0.2, 0.04, steel, 0, H + 0.6 + 0.27, 0, 16, false);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(gun, 0.17 * Math.cos(a), H + 0.6 + 0.3, 0.17 * Math.sin(a), g, 0.014, 0.03); }
  for (let k = 0; k < 3; k++) { const a = k * 2 * Math.PI / 3; bx(0.02, 0.1, 0.02, steel, 0.14 * Math.cos(a), H + 0.6 + 0.34, 0.14 * Math.sin(a)); }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.14, 16), steelD); cap.position.y = H + 0.6 + 0.46; g.add(cap);
  // roof hatch on the north slope, bolted
  {
    const s = swing(Math.PI + 0.35);
    const hatch = cyl(0.3, 0.3, 0.14, strap, 0, 4.79, 2.3, 16, false, s); hatch.rotation.x = slope;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; hex(gun, 0.25 * Math.cos(a), 0.08, 0.25 * Math.sin(a), hatch, 0.014, 0.03); }
    bx(0.16, 0.03, 0.03, gun, 0, 0.085, 0.3, hatch);
    const run = bx(0.4, 0.006, 0.3, rust, 0, 4.7, 2.78, s); run.rotation.x = slope;
  }

  // ---- walkway ring at 4.6: open grating (radial bars + three ring bars over a dark under plate), kerb ----
  const deckU = new THREE.Mesh(new THREE.RingGeometry(R + 0.02, RW, SEGW, 1), M(tint(GALV, 0.55), 'metal', 0.85, 0.4, true));
  deckU.rotation.x = -Math.PI / 2; deckU.position.y = H - 0.05; g.add(deckU);
  const deck = new THREE.Mesh(new THREE.RingGeometry(R + 0.02, RW, SEGW, 1), galv);
  deck.rotation.x = -Math.PI / 2; deck.position.y = H - 0.005; g.add(deck);
  for (let k = 0; k < 48; k++) {
    const s = swing((k + 0.5) * 2 * Math.PI / 48);
    bx(0.025, 0.045, RW - R - 0.08, k % 2 ? galvD : galvS, 0, H - 0.02, (R + RW) / 2, s);
  }
  for (const rr of [R + 0.25, R + 0.55]) torus(rr, 0.014, 4, SEGW, galvD, H + 0.005);
  const drift = new THREE.Mesh(new THREE.RingGeometry(R + 0.03, R + 0.3, SEGW, 1), sand);
  drift.rotation.x = -Math.PI / 2; drift.position.y = H + 0.01; g.add(drift);
  cyl(RW, RW, 0.15, M(STEEL, 'metal', 0.8, 0.3, true), 0, H + 0.055, 0, SEGW, true);           // toe kerb
  cyl(RW + 0.01, RW + 0.01, 0.06, M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true), 0, H - 0.05, 0, SEGW, true);   // edge channel
  torus(RW + 0.005, 0.015, 4, SEGW, steelL, H + 0.13);                                             // kerb lip bevel

  // ---- twelve angled brackets with mount plates, bolts and rust drips ----------------------------
  const strutLen = Math.hypot(0.75, 0.85), strutAng = -Math.atan2(0.85, 0.75);
  for (let k = 0; k < 12; k++) {
    const s = swing(k * Math.PI / 6 + Math.PI / 12);
    bx(0.08, 0.1, RW - R - 0.04, steel, 0, H - 0.09, (R + RW) / 2, s);
    bx(0.03, 0.03, RW - R - 0.04, steelL, 0, H - 0.035, (R + RW) / 2, s);     // channel lip
    const st = bx(0.07, 0.07, strutLen, steel, 0, H - 0.09 - 0.425, R + 0.375, s);
    st.rotation.x = strutAng;
    bx(0.18, 0.18, 0.03, steelL, 0, H - 0.95, R + 0.015, s);
    bx(0.16, 0.14, 0.03, steelL, 0, H - 0.09, R + 0.015, s);
    for (const dx of [-0.055, 0.055]) hex(gun, dx, H - 0.95, R + 0.035, s, 0.016, 0.03, 'z');
    bx(0.09, 0.3, 0.008, rust, 0, H - 1.2, R + 0.008, s);
    bx(0.05, 0.35, 0.008, rust, 0.04, H - 0.35, R + 0.008, s);
  }

  // ---- yellow tube handrail: 24 posts, top and knee rail, post foot plates -----------------------
  const RR = RW - 0.06;
  for (let k = 0; k < 24; k++) {
    const th = k * Math.PI / 12;
    const s = swing(th);
    cyl(0.025, 0.025, 1.05, k % 2 ? yel : yelD, 0, H + 0.525, RR, 8, false, s);
    bx(0.09, 0.02, 0.09, steel, 0, H + 0.02, RR, s);
    bx(0.04, 0.06, 0.006, rust, 0, H + 0.07, RR + 0.03, s);
    bx(0.05, 0.10, 0.006, rust, 0, H + 0.03, RW + 0.004, s);
  }
  for (const [y, mat] of [[H + 1.05, yel], [H + 0.55, yelD]]) torus(RR, 0.027, 6, SEGW, mat, y);

  // ---- caged access ladder south west: stiles, rungs, hoops with three verticals, top hatch gate ----
  {
    const s = swing(LAD);
    const LX = 0.2, LZ = R + 0.34, RUNG0 = 0.4;
    for (const sx of [-1, 1]) {
      cyl(0.03, 0.03, H + 0.9, galvS, sx * LX, (H + 0.9) / 2 + 0.05, LZ, 8, false, s);
      // foot plate on the plinth
      bx(0.14, 0.02, 0.14, steel, sx * LX, 0.13, LZ, s);
      bx(0.06, 0.12, 0.006, rust, sx * LX, 0.22, LZ + 0.032, s);
    }
    for (let i = 0; i * 0.3 + RUNG0 < H + 0.2; i++) {
      const y = RUNG0 + i * 0.3;
      const rung = cyl(0.014, 0.014, 2 * LX, galvD, 0, y, LZ, 6, false, s); rung.rotation.z = Math.PI / 2;
    }
    // wall brackets every 1.2 m, bolted to the shell with a rust run below
    for (const y of [0.9, 2.1, 3.3, 4.4]) {
      for (const sx of [-1, 1]) {
        bx(0.05, 0.06, LZ - R - 0.03, steel, sx * LX, y, (R + LZ) / 2, s);
        bx(0.12, 0.14, 0.03, steelL, sx * LX, y, R + 0.02, s);
        hex(gun, sx * LX, y + 0.04, R + 0.04, s, 0.012, 0.03, 'z');
        bx(0.05, 0.18, 0.008, rust, sx * LX, y - 0.16, R + 0.009, s);
      }
    }
    // cage: hoops from 2.2 m up, three verticals, a flare hoop at the top
    const hoopR = 0.38;
    for (let y = 2.2; y <= H + 0.7; y += 0.6) {
      const hp = new THREE.Mesh(new THREE.TorusGeometry(hoopR, 0.015, 5, 14, Math.PI), galvS);
      hp.rotation.x = Math.PI / 2; hp.rotation.z = 0; hp.position.set(0, y, LZ + 0.02); s.add(hp);
      hp.rotation.set(Math.PI / 2, 0, 0);
      for (const sx of [-1, 1]) bx(0.05, 0.03, 0.03, steel, sx * hoopR, y, LZ + 0.02, s);
    }
    for (let k = 0; k < 5; k++) {
      const a = Math.PI / 6 + k * Math.PI / 6;
      const vb = bx(0.03, H + 0.75 - 2.2, 0.012, galvD, hoopR * Math.cos(a), (2.2 + H + 0.75) / 2, LZ + 0.02 + hoopR * Math.sin(a), s);
      vb.rotation.y = -a + Math.PI / 2;
    }
    // hoop feet tie to a rail post: the rail has a gap here, stile extensions curl into hand hoops
    for (const sx of [-1, 1]) {
      const hh = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 10, Math.PI), yel);
      hh.position.set(sx * LX, H + 0.95, LZ - 0.25); hh.rotation.y = Math.PI / 2; s.add(hh);
      cyl(0.025, 0.025, 0.95, yel, sx * LX, H + 0.475, LZ - 0.4, 8, false, s);
      bx(0.09, 0.02, 0.09, steel, sx * LX, H + 0.02, LZ - 0.4, s);
    }
    // top hatch: a self closing grating gate leaf swung open against the deck, hinge on the right stile
    {
      const gate = new THREE.Group(); gate.position.set(LX + 0.05, H + 0.05, LZ - 0.4); gate.rotation.y = -1.25; s.add(gate);
      const fr = new THREE.Group(); fr.position.x = -0.32; gate.add(fr);
      bx(0.64, 0.03, 0.05, galvD, 0, 0.0, 0, fr);
      bx(0.64, 0.03, 0.05, galvD, 0, 0.95, 0, fr);
      for (const dx of [-0.31, 0.31]) bx(0.03, 0.98, 0.05, galvD, dx, 0.475, 0, fr);
      for (let i = 1; i < 6; i++) bx(0.02, 0.92, 0.01, galvS, -0.32 + i * 0.107, 0.475, 0, fr);
      bx(0.6, 0.03, 0.01, galvS, 0, 0.5, 0, fr);
      for (const y of [0.15, 0.8]) bx(0.05, 0.1, 0.07, gun, 0.32, y, 0, fr);
    }
    // a thin walkway cut line at the ladder head so the deck reads as a hatch opening
    bx(0.7, 0.008, 0.03, ink, 0, H + 0.002, R + 0.1, s);
    bx(0.7, 0.008, 0.03, ink, 0, H + 0.002, RW - 0.15, s);
    for (const sx of [-1, 1]) bx(0.03, 0.008, RW - R - 0.25, ink, sx * 0.35, H + 0.002, (R + RW) / 2 - 0.03, s);
  }

  // ---- manway at the base with a bolted flange, davit, stain band below -------------------------
  {
    const s = swing(Math.PI / 4), my = 0.62;
    const ring = cyl(0.36, 0.36, 0.06, seam, 0, my, R + 0.02, 20, false, s); ring.rotation.x = Math.PI / 2;
    const flange = cyl(0.33, 0.33, 0.05, strap, 0, my, R + 0.075, 20, false, s); flange.rotation.x = Math.PI / 2;
    const cover = cyl(0.27, 0.27, 0.05, strap, 0, my, R + 0.12, 20, false, s); cover.rotation.x = Math.PI / 2;
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 + Math.PI / 16; hex(gun, 0.3 * Math.cos(a), my + 0.3 * Math.sin(a), R + 0.105, s, 0.016, 0.04, 'z'); }
    for (const dy of [0.1, -0.1]) bx(0.1, 0.05, 0.06, steelL, 0.38, my + dy, R + 0.09, s);       // hinge blocks
    bx(0.05, 1.05, 0.05, steel, 0.56, my + 0.3, R + 0.06, s);                                     // davit post
    bx(0.6, 0.04, 0.04, steelD, 0.26, my + 0.82, R + 0.1, s);                                     // davit arm
    bx(0.035, 0.36, 0.035, steelD, 0, my + 0.62, R + 0.1, s);                                     // drop to the cover
    bx(0.16, 0.03, 0.05, gun, 0, my + 0.08, R + 0.15, s);                                         // lifting handle
    bx(0.06, 0.16, 0.006, rust, 0.56, my - 0.28, R + 0.09, s);
    // spill staining under the manway: a wide dark fan down to the foot band, a darker core, rust runs
    band(R + 0.008, 0.36, my - 0.42, Math.PI / 4, 0.16, stainM, 8);
    band(R + 0.010, 0.3, my - 0.4, Math.PI / 4, 0.09, stainD, 6);
    bx(0.14, 0.24, 0.008, rust, 0.3, my - 0.42, R + 0.012, s);
    bx(0.1, 0.2, 0.008, rustD, -0.18, my - 0.4, R + 0.012, s);
  }

  // ---- inlet pipe north (-Z) with bolted flanges, valve with bonnet and hand wheel, elbow to ground ----
  const N = new THREE.Group(); N.rotation.y = Math.PI; g.add(N);
  const pipe = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  pipe(0.125, 0.75, steel, 0, 0.55, R + 0.3, 'z', 16, N);
  pipe(0.2, 0.05, steelL, 0, 0.55, R + 0.12, 'z', 16, N);
  pipe(0.2, 0.05, steelL, 0, 0.55, R + 0.5, 'z', 16, N);
  for (const z of [R + 0.12, R + 0.5]) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; hex(gun, 0.165 * Math.cos(a), 0.55 + 0.165 * Math.sin(a), z + (z < R + 0.3 ? 0.035 : -0.035), N, 0.014, 0.03, 'z'); }
  bx(0.36, 0.34, 0.28, steel, 0, 0.55, R + 0.7, N);
  cyl(0.13, 0.13, 0.03, steel, 0, 0.735, R + 0.7, 12, false, N);
  cyl(0.1, 0.1, 0.12, steelL, 0, 0.8, R + 0.7, 12, false, N);
  pipe(0.04, 0.3, gun, 0, 0.95, R + 0.7, 'y', 8, N);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 16), red);
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 1.05, R + 0.7); N.add(wheel);
  bx(0.32, 0.02, 0.03, red, 0, 1.05, R + 0.7, N);
  bx(0.03, 0.02, 0.32, red, 0, 1.05, R + 0.7, N);
  const elb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), steel); elb.position.set(0, 0.55, R + 0.95); N.add(elb);
  pipe(0.125, 0.55, steel, 0, 0.275, R + 0.95, 'y', 16, N);
  bx(0.5, 0.28, 0.5, conc, 0.45, 0.14, R + 0.95, N); bx(0.44, 0.012, 0.44, sand, 0.45, 0.286, R + 0.95, N);
  bx(0.1, 0.06, 0.32, steel, 0.2, 0.42, R + 0.95, N); hex(gun, 0.2, 0.46, R + 0.95, N, 0.014, 0.03);
  bx(0.5, 0.1, 0.5, sand, 0, 0.05, R + 0.95, N);
  bx(0.1, 0.35, 0.008, rust, 0.15, 0.3, R + 0.006, N);
  bx(0.1, 0.35, 0.008, rust, -0.15, 0.3, R + 0.006, N);
  // ---- drain south (+Z) with a rust drip and a stain on the sand -------------------------------
  pipe(0.05, 0.45, steel, 0.6, 0.32, R + 0.2, 'z', 10);
  pipe(0.08, 0.04, steelL, 0.6, 0.32, R + 0.06, 'z', 10);
  bx(0.14, 0.3, 0.008, rust, 0.6, 0.15, R + 0.006);
  bx(0.4, 0.012, 0.4, M(0x8a7a5c, 'ground', 0.95, 0), 0.6, 0.2, R + 0.3).rotation.x = 0.4;

  // ---- level gauge: a galvanised sight tube on three brackets with a valve top and bottom, a scale plate ----
  {
    const s = swing(-Math.PI / 4 - 0.12);
    cyl(0.03, 0.03, 3.7, galvS, 0, 2.35, R + 0.22, 10, false, s);
    for (const y of [0.9, 2.2, 3.5]) { bx(0.06, 0.05, 0.2, steel, 0, y, R + 0.12, s); bx(0.05, 0.16, 0.006, rust, 0, y - 0.13, R + 0.008, s); }
    for (const y of [0.55, 4.15]) {
      pipe(0.035, 0.24, steel, 0, y, R + 0.11, 'z', 8, s);
      bx(0.12, 0.12, 0.12, steel, 0, y, R + 0.22, s);
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 10), red); w.rotation.y = Math.PI / 2; w.position.set(0.11, y, R + 0.22); s.add(w);
      hex(gun, 0.085, y, R + 0.22, s, 0.012, 0.06, 'x');
      bx(0.08, 0.14, 0.006, rust, 0.05, y - 0.15, R + 0.008, s);
    }
    bx(0.08, 3.0, 0.012, white, -0.1, 2.35, R + 0.015, s);                                         // scale plate
    for (let i = 0; i < 11; i++) bx(0.05, 0.012, 0.006, ink, -0.1, 0.95 + i * 0.28, R + 0.023, s);  // graduations
  }

  // ---- stencil ID and hazard plate as decal boxes (east face, eye height) --------------------------
  {
    const s = swing(Math.PI / 2 + 0.2);
    bx(1.4, 0.5, 0.008, white, 0, 2.35, R + 0.012, s);
    // "T 1 0 4" as stencil bars
    const gl = (x0) => { bx(0.05, 0.3, 0.006, ink, x0, 2.35, R + 0.018, s); bx(0.2, 0.05, 0.006, ink, x0, 2.48, R + 0.018, s); };
    gl(-0.5);
    bx(0.05, 0.3, 0.006, ink, -0.22, 2.35, R + 0.018, s);
    for (const x0 of [0.08, 0.4]) { bx(0.05, 0.3, 0.006, ink, x0 - 0.08, 2.35, R + 0.018, s); bx(0.05, 0.3, 0.006, ink, x0 + 0.08, 2.35, R + 0.018, s); bx(0.16, 0.05, 0.006, ink, x0, 2.48, R + 0.018, s); bx(0.16, 0.05, 0.006, ink, x0, 2.22, R + 0.018, s); }
    bx(1.36, 0.1, 0.006, rust, 0.02, 2.05, R + 0.012, s);                                          // run off the plate foot
    // hazard diamond, orange with a dark border, bolted at the corners
    const hz = new THREE.Group(); hz.position.set(-1.1, 1.75, R + 0.015); hz.rotation.z = Math.PI / 4; s.add(hz);
    bx(0.5, 0.5, 0.01, ink, 0, 0, 0, hz);
    bx(0.42, 0.42, 0.014, orange, 0, 0, 0, hz);
    bx(0.06, 0.2, 0.008, ink, 0, 0.04, 0.008, hz); bx(0.06, 0.06, 0.008, ink, 0, -0.14, 0.008, hz);
    for (const dx of [-0.21, 0.21]) hex(gun, dx, dx, 0.012, hz, 0.012, 0.02, 'z');
    bx(0.2, 0.12, 0.006, rust, -1.1, 1.35, R + 0.012, s);
    // nameplate on the shade side
    const s2 = swing(5 * Math.PI / 4 + 0.4);
    bx(0.5, 0.3, 0.02, M(0x2f4d66, 'metal', 0.8, 0.2), 0, 2.1, R + 0.012, s2);
    for (const dx of [-0.2, 0.2]) for (const dy of [-0.1, 0.1]) hex(gun, dx, 2.1 + dy, R + 0.03, s2, 0.012, 0.02, 'z');
    bx(0.46, 0.14, 0.006, rust, 0, 1.87, R + 0.01, s2);
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
