// bunkhouse_building candidate 2: a different reading of the reference. A low
// stained concrete plinth to 1.0 m, then a steel framed upper wall: posts at
// 2.33 m centres standing proud, horizontal girts, corrugated cladding hung in
// lapped 0.9 m sheets between them, window hoods, a heavy concrete fascia band
// under the parapet, and the tank on a braced angle stand. Doors open inward,
// interior partition and plaster skins, cowls, dust, rust, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds, extra) => {
    const mat = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: r, metalness: m }, extra || {}));
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xb8ae9b, 'stone', 0.90, 0.0);
  const concS = M(0xc5bba7, 'stone', 0.90, 0.0);
  const concN = M(0xada391, 'stone', 0.90, 0.0);
  const concIn = M(0xa39a88, 'stone', 0.92, 0.0);
  const plaster = M(0xb9b09c, 'plaster', 0.92, 0.0);
  const plasterD = M(0x968c78, 'plaster', 0.93, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x746c5d, 'stone', 0.94, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.35, true);
  const galvS = M(0xa9aeac, 'metal', 0.72, 0.35, true);
  const galvD = M(0x8b908e, 'metal', 0.74, 0.35, true);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const steelL = M(0x5c5f64, 'metal', 0.75, 0.35);
  const tankB = M(0x9c988c, 'metal', 0.80, 0.2);
  const tankD = M(0x8f8b80, 'metal', 0.80, 0.2);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const blueBox = M(0x2f4d66, 'metal', 0.80, 0.2);
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
  const corr = (w, h, mat) => {
    const PITCH = 0.076, AMP = 0.012;
    const geo = new THREE.PlaneGeometry(w, h, Math.max(6, Math.round(w / PITCH) * 6), 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, AMP * Math.sin((p.getX(i) + w / 2) / PITCH * Math.PI * 2));
    const f = geo.toNonIndexed(); f.computeVertexNormals();
    return new THREE.Mesh(f, mat);
  };
  const L = 14.0, D = 8.0, H = 4.6, T = 0.25, PAR = 0.6, PL = 1.0, CL1 = 4.35;

  const wallX = (z, len, mat, opens) => {
    const os = opens.slice().sort((a, b) => a[0] - b[0]);
    let x = -len / 2;
    const seg = (x0, x1, y0, y1) => { if (x1 - x0 > 0.001 && y1 - y0 > 0.001) box(x1 - x0, y1 - y0, T, mat, (x0 + x1) / 2, (y0 + y1) / 2, z); };
    for (const [x0, x1, y0, y1] of os) { seg(x, x0, 0, H); seg(x0, x1, 0, y0); seg(x0, x1, y1, H); x = x1; }
    seg(x, len / 2, 0, H);
  };
  const wallZ = (x, len, mat, opens) => {
    const os = opens.slice().sort((a, b) => a[0] - b[0]);
    let z = -len / 2;
    const seg = (z0, z1, y0, y1) => { if (z1 - z0 > 0.001 && y1 - y0 > 0.001) box(T, y1 - y0, z1 - z0, mat, x, (y0 + y1) / 2, (z0 + z1) / 2); };
    for (const [z0, z1, y0, y1] of os) { seg(z, z0, 0, H); seg(z0, z1, 0, y0); seg(z0, z1, y1, H); z = z1; }
    seg(z, len / 2, 0, H);
  };
  const WIN_S = [[-4.1, -2.9, 1.4, 2.3], [2.6, 3.8, 1.4, 2.3]];
  const WIN_E = [[-1.6, -0.4, 1.4, 2.3]];
  const DOOR_W = [[-0.45, 0.45, 0, 2.1]];
  const DOOR_N = [[L / 2 - 3.45, L / 2 - 2.55, 0, 2.1]];
  wallX(D / 2 - T / 2, L, concS, WIN_S);
  wallX(-D / 2 + T / 2, L, concN, DOOR_N);
  wallZ(L / 2 - T / 2, D - 2 * T, conc, WIN_E);
  wallZ(-L / 2 + T / 2, D - 2 * T, conc, DOOR_W);

  // ---- framed cladding on both long walls: posts, girts, lapped sheets ----
  const framed = (zf, sz, opens, mat) => {
    const os = opens.slice().sort((a, b) => a[0] - b[0]);
    // posts at 2.33 centres, proud of the sheet
    for (let px = -L / 2 + 0.05; px <= L / 2; px += (L - 0.1) / 6) {
      box(0.1, CL1 - PL + 0.1, 0.1, steel, px, PL + (CL1 - PL) / 2, zf + sz * 0.04);
      box(0.1, 0.008, 0.1, dust, px, CL1 + 0.054, zf + sz * 0.04);
      box(0.03, 0.3, 0.006, rust, px, PL - 0.2, zf - sz * 0.03 + sz * 0.033);   // rust on the plinth below the post foot
    }
    for (const gy of [PL + 0.05, 2.7, CL1 - 0.05]) box(L, 0.06, 0.05, steelL, 0, gy, zf - sz * 0.02);
    // lapped sheets 0.9 wide, alternating tone, skipping the openings
    let x = -L / 2;
    let i = 0;
    while (x < L / 2 - 0.05) {
      const w = Math.min(0.95, L / 2 - x);
      const op = os.find(([x0, x1]) => x + w > x0 + 0.02 && x < x1 - 0.02);
      const y0 = PL, y1 = op ? op[3] + 0.06 : CL1;
      const y0b = op ? op[3] + 0.06 : PL;
      const s = corr(w, CL1 - y0b, i % 2 ? mat : galvD); s.position.set(x + w / 2, y0b + (CL1 - y0b) / 2, zf + sz * (i % 2) * 0.006); if (sz < 0) s.rotation.y = Math.PI; g.add(s);
      if (op) { const lo = corr(w, 0.001 + Math.max(0, op[2] - 0.06 - PL), mat); if (op[2] - 0.06 - PL > 0.05) { lo.position.set(x + w / 2, PL + (op[2] - 0.06 - PL) / 2, zf); if (sz < 0) lo.rotation.y = Math.PI; g.add(lo); } }
      // hook bolts on the girts with rust runs
      for (const gy of [PL + 0.05, 2.7, CL1 - 0.05]) {
        if (op && gy < op[3] + 0.1 && gy > op[2] - 0.1) continue;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 6), steel);
        b.rotation.x = Math.PI / 2; b.position.set(x + w / 2, gy, zf + sz * 0.02); g.add(b);
        box(0.014, 0.22, 0.004, rust, x + w / 2, gy - 0.15, zf + sz * 0.018);
      }
      x += w - 0.05; i++;
    }
    // plinth top ledge with dust, and the fascia band under the parapet
    box(L + 0.04, 0.05, 0.1, stain, 0, PL - 0.02, zf - sz * 0.02);
    box(L, 0.008, 0.08, dust, 0, PL + 0.004, zf - sz * 0.02);
    box(L + 0.04, 0.3, 0.1, conc, 0, H - 0.1, zf - sz * 0.0);
    box(L + 0.04, 0.008, 0.1, dust, 0, H + 0.054, zf);
    for (const rx of [-5.9, -3.2, -0.6, 2.1, 4.9, 6.4]) box(0.05, 0.35, 0.006, rust, rx, H - 0.4, zf + sz * 0.053);
  };
  framed(D / 2 + 0.03, 1, WIN_S, galvS);
  framed(-D / 2 - 0.03, -1, DOOR_N, galv);

  // ---- floor, roof, parapet, cap, kerb, dust, cowls ----
  box(L - 2 * T, 0.1, D - 2 * T, stainD, 0, 0.05, 0);
  box(L - 2 * T - 0.6, 0.006, D - 2 * T - 0.6, packed, 0.3, 0.103, -0.3);
  box(L, 0.25, D, conc, 0, H - 0.125, 0);
  box(L - 2 * T - 0.2, 0.01, D - 2 * T - 0.2, concIn, 0, H - 0.255, 0);
  for (const [w, d, x, z, mat] of [[L, T, 0, D / 2 - T / 2, concS], [L, T, 0, -D / 2 + T / 2, concN], [T, D, L / 2 - T / 2, 0, conc], [T, D, -L / 2 + T / 2, 0, conc]]) box(w, PAR, d, mat, x, H + PAR / 2, z);
  for (const [w, d, x, z] of [[L + 0.06, T + 0.06, 0, D / 2 - T / 2], [L + 0.06, T + 0.06, 0, -D / 2 + T / 2], [T + 0.06, D + 0.06, L / 2 - T / 2, 0], [T + 0.06, D + 0.06, -L / 2 + T / 2, 0]]) {
    box(w, 0.05, d, conc, x, H + PAR + 0.025, z);
    box(w - 0.1, 0.01, d - 0.1, dust, x, H + PAR + 0.055, z);
  }
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, D / 2 - T - 0.05);
  box(L - 2 * T - 0.1, 0.12, 0.1, stain, 0, H + 0.06, -D / 2 + T + 0.05);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, L / 2 - T - 0.05, H + 0.06, 0);
  box(0.1, 0.12, D - 2 * T - 0.1, stain, -L / 2 + T + 0.05, H + 0.06, 0);
  box(L - 2 * T - 0.4, 0.015, D - 2 * T - 0.4, dust, 0, H + 0.008, 0);
  box(5.0, 0.01, 3.0, sand, -2.5, H + 0.02, 1.2);
  box(3.5, 0.01, 2.5, sand, 2.5, H + 0.02, -1.5);
  for (const rx of [-6.0, -3.4, -0.9, 1.6, 4.1, 6.2]) for (const sz of [-1, 1]) box(0.05, 0.4, 0.006, rust, rx, H + PAR - 0.25, sz * (D / 2 + 0.003));
  for (const rz of [-2.8, -0.6, 1.4, 3.1]) for (const sx of [-1, 1]) box(0.006, 0.4, 0.05, rust, sx * (L / 2 + 0.003), H + PAR - 0.25, rz);
  for (const [cx, cz] of [[-3.5, -0.8], [1.0, 1.2]]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.2, 12), tankB); base.position.set(cx, H + 0.1, cz); g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.2, 12), galv); body.position.set(cx, H + 0.3, cz); g.add(body);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.1, 12), galvD); cone.position.set(cx, H + 0.45, cz); g.add(cone);
    for (let i = 0; i < 6; i++) { const fin = box(0.02, 0.18, 0.12, galvD, 0, 0, 0); fin.rotation.y = i * Math.PI / 6; fin.position.set(cx + Math.sin(i * Math.PI / 6) * 0.12, H + 0.3, cz + Math.cos(i * Math.PI / 6) * 0.12); }
    box(0.14, 0.006, 0.36, rust, cx, H + 0.02, cz + 0.22);
  }
  // ---- water tank on a braced angle stand at the east end ----
  {
    const tx = L / 2 - 1.3, tz = -1.0, TK = 1.0, LEG = 0.08;
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { box(0.06, LEG, 0.06, steel, tx + lx * 0.5, H + LEG / 2, tz + lz * 0.5); box(0.14, 0.012, 0.14, rust, tx + lx * 0.5, H + 0.006, tz + lz * 0.5); }
    for (const [ax, az, rz] of [[0, 0.5, 0], [0, -0.5, 0], [0.5, 0, 1], [-0.5, 0, 1]]) { const br = box(rz ? 0.03 : 1.0, 0.03, rz ? 1.0 : 0.03, steel, tx + ax, H + LEG / 2, tz + az); br.rotation[rz ? 'x' : 'z'] = 0.14; }
    box(1.15, 0.05, 1.15, steel, tx, H + LEG + 0.025, tz);
    box(TK, TK, TK, tankB, tx, H + LEG + 0.05 + TK / 2, tz);
    box(TK + 0.02, 0.35, TK + 0.02, tankD, tx, H + LEG + 0.05 + 0.2, tz);
    for (const sy of [0.02, 0.52]) box(TK + 0.03, 0.03, TK + 0.03, steelL, tx, H + LEG + 0.05 + sy + 0.02, tz);
    for (const sx of [-1, 1]) { box(0.03, TK, TK + 0.03, steelL, tx + sx * TK / 2, H + LEG + 0.05 + TK / 2, tz); box(TK + 0.03, TK, 0.03, steelL, tx, H + LEG + 0.05 + TK / 2, tz + sx * TK / 2); }
    box(TK + 0.04, 0.05, TK + 0.04, steelL, tx, H + LEG + 0.05 + TK - 0.02, tz);
    box(TK - 0.1, 0.012, TK - 0.1, dust, tx, H + LEG + 0.05 + TK + 0.006, tz);
    box(0.35, 0.05, 0.35, galvD, tx + 0.25, H + LEG + 0.05 + TK + 0.025, tz - 0.2);
    for (const sz of [-1, 1]) { box(0.05, 0.6, 0.006, rust, tx - 0.2, H + LEG + 0.05 + 0.55, tz + sz * (TK / 2 + 0.005)); box(0.006, 0.6, 0.05, rust, tx + sz * (TK / 2 + 0.005), H + LEG + 0.05 + 0.55, tz + 0.3); }
    const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), steel); inlet.position.set(tx - TK / 2 - 0.05, H + LEG + 0.05 + TK - 0.3, tz + 0.3); g.add(inlet);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), steel); feed.rotation.z = Math.PI / 2; feed.position.set(tx - TK / 2 - 0.7, H + LEG + 0.05 + TK - 0.6, tz + 0.3); g.add(feed);
  }
  // ---- end walls: stained base, plinth ledge, seams and plates ----
  for (const sx of [-1, 1]) {
    box(0.016, 0.4, D + 0.01, stain, sx * (L / 2), 0.2, 0);
    box(0.1, 0.05, D + 0.04, stain, sx * (L / 2 + 0.03), PL - 0.02, 0);
    box(0.08, 0.008, D, dust, sx * (L / 2 + 0.03), PL + 0.004, 0);
    box(0.1, 0.3, D + 0.04, conc, sx * (L / 2 + 0.03), H - 0.1, 0);
    box(0.1, 0.008, D + 0.04, dust, sx * (L / 2 + 0.03), H + 0.054, 0);
    for (const pz of [-2.5, 2.5]) for (const py of [1.6, 2.6, 3.6]) { box(0.012, 0.16, 0.16, steel, sx * (L / 2 + 0.008), py, pz); box(0.006, 0.35, 0.06, rust, sx * (L / 2 + 0.012), py - 0.25, pz); }
  }
  // ---- doors, open inward ----
  const door = (frameAt, hingeAt, rotY, along) => {
    if (along === 'z') { box(0.06, 2.15, 0.06, steel, frameAt[0], 1.075, frameAt[1] - 0.48); box(0.06, 2.15, 0.06, steel, frameAt[0], 1.075, frameAt[1] + 0.48); box(0.06, 0.06, 1.02, steel, frameAt[0], 2.13, frameAt[1]); }
    else { box(0.06, 2.15, 0.06, steel, frameAt[0] - 0.48, 1.075, frameAt[1]); box(0.06, 2.15, 0.06, steel, frameAt[0] + 0.48, 1.075, frameAt[1]); box(1.02, 0.06, 0.06, steel, frameAt[0], 2.13, frameAt[1]); }
    const hinge = new THREE.Group(); hinge.position.set(hingeAt[0], 0, hingeAt[1]); hinge.rotation.y = rotY; g.add(hinge);
    box(0.05, 2.05, 0.86, tankB, 0, 1.045, 0.45, hinge);
    box(0.012, 0.3, 0.5, galvD, 0.03, 0.5, 0.45, hinge);
    for (let i = 0; i < 5; i++) box(0.02, 0.02, 0.46, steel, 0.035, 0.4 + i * 0.05, 0.45, hinge);
    box(0.03, 0.05, 0.5, steel, 0.04, 1.05, 0.45, hinge);
    box(0.006, 0.6, 0.06, rust, 0.028, 1.4, 0.1, hinge);
    box(0.006, 0.35, 0.3, rustD, 0.028, 0.25, 0.5, hinge);
    for (const hy of [0.4, 1.1, 1.8]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), rust); h.position.set(0, hy, 0.02); hinge.add(h); }
  };
  door([-L / 2 + T / 2, 0], [-L / 2 + T - 0.02, -0.45], -Math.PI / 2 + 0.35, 'z');
  door([L / 2 - 3.0, -D / 2 + T / 2], [L / 2 - 3.45, -D / 2 + T - 0.02], Math.PI - 0.6, 'x');
  box(0.4, 0.02, 1.2, stain, -L / 2 - 0.15, 0.11, 0); box(1.2, 0.02, 0.4, stain, L / 2 - 3.0, 0.11, -D / 2 - 0.15);
  box(1.3, 0.04, 0.4, galv, L / 2 - 3.0, 2.45, -D / 2 - 0.2);                       // hood over the north door
  box(1.2, 0.008, 0.3, dust, L / 2 - 3.0, 2.474, -D / 2 - 0.2);
  for (const sx of [-1, 1]) { const st = box(0.03, 0.03, 0.4, steel, L / 2 - 3.0 + sx * 0.6, 2.3, -D / 2 - 0.2); st.rotation.x = -0.6; }
  // ---- windows with hoods ----
  const win = (x0, x1, y0, y1, zf) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    box(0.05, y1 - y0 + 0.1, 0.12, steel, x0 - 0.025, cy, zf); box(0.05, y1 - y0 + 0.1, 0.12, steel, x1 + 0.025, cy, zf);
    box(x1 - x0 + 0.1, 0.05, 0.12, steel, cx, y1 + 0.025, zf); box(x1 - x0 + 0.1, 0.05, 0.12, steel, cx, y0 - 0.025, zf);
    box(0.04, y1 - y0, 0.04, steel, cx, cy, zf); box(x1 - x0, 0.04, 0.04, steel, cx, cy, zf);
    box((x1 - x0) / 2 - 0.04, (y1 - y0) / 2 - 0.04, 0.006, glass, cx - (x1 - x0) / 4, cy + (y1 - y0) / 4, zf);
    box((x1 - x0) / 2 - 0.04, (y1 - y0) / 2 - 0.04, 0.006, glass, cx + (x1 - x0) / 4, cy - (y1 - y0) / 4, zf);
    box(x1 - x0 + 0.3, 0.04, 0.3, galv, cx, y1 + 0.2, D / 2 + 0.15);                    // hood
    box(x1 - x0 + 0.2, 0.008, 0.22, dust, cx, y1 + 0.225, D / 2 + 0.15);
    box(x1 - x0 + 0.2, 0.04, 0.12, stain, cx, y0 - 0.07, D / 2 + 0.03);
    box(0.05, 0.5, 0.006, rust, x0 + 0.12, y0 - 0.35, D / 2 + 0.004);
  };
  for (const [x0, x1, y0, y1] of WIN_S) win(x0, x1, y0, y1, D / 2 - 0.06);
  for (const [z0, z1, y0, y1] of WIN_E) {
    const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2, xf = L / 2 - 0.06;
    box(0.12, y1 - y0 + 0.1, 0.05, steel, xf, cy, z0 - 0.025); box(0.12, y1 - y0 + 0.1, 0.05, steel, xf, cy, z1 + 0.025);
    box(0.12, 0.05, z1 - z0 + 0.1, steel, xf, y1 + 0.025, cz); box(0.12, 0.05, z1 - z0 + 0.1, steel, xf, y0 - 0.025, cz);
    box(0.04, y1 - y0, 0.04, steel, xf, cy, cz); box(0.04, 0.04, z1 - z0, steel, xf, cy, cz);
    box(0.006, (y1 - y0) / 2 - 0.04, (z1 - z0) / 2 - 0.04, glass, xf, cy + (y1 - y0) / 4, cz - (z1 - z0) / 4);
    box(0.006, (y1 - y0) / 2 - 0.04, (z1 - z0) / 2 - 0.04, glass, xf, cy - (y1 - y0) / 4, cz + (z1 - z0) / 4);
    box(0.3, 0.04, z1 - z0 + 0.3, galv, L / 2 + 0.15, y1 + 0.2, cz);
    box(0.12, 0.04, z1 - z0 + 0.2, stain, xf + 0.03, y0 - 0.07, cz);
    box(0.006, 0.6, 0.05, rust, L / 2 + 0.004, y0 - 0.4, z0 + 0.12);
  }
  // ---- end wall detail: form tie holes in a grid, roof access ladder on the west
  //      end (the roof carries a tank and two cowls), AC unit and conduit on the east ----
  for (const sx of [-1, 1]) {
    for (let ty = 0.7; ty < H - 0.2; ty += 0.8) for (let tz = -D / 2 + 0.5; tz < D / 2 - 0.3; tz += 0.8) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.02, 6), stainD);
      t.rotation.z = Math.PI / 2; t.position.set(sx * (L / 2 + 0.004), ty, tz); g.add(t);
      if ((Math.round(ty * 10) + Math.round(tz * 10)) % 5 === 0) box(0.006, 0.12, 0.02, rustD, sx * (L / 2 + 0.004), ty - 0.08, tz);
    }
    box(0.012, 0.03, D + 0.01, groove, sx * (L / 2), 2.4, 0);
    box(0.012, 0.03, D + 0.01, groove, sx * (L / 2), 1.2, 0);
    box(0.012, 0.03, D + 0.01, groove, sx * (L / 2), 3.6, 0);
  }
  {
    const lz = 2.6, lx = -L / 2 - 0.16;
    for (const rz of [-0.25, 0.25]) box(0.06, H + PAR - 0.1, 0.06, steel, lx, (H + PAR - 0.1) / 2 + 0.3, lz + rz);
    for (let ry = 0.5; ry < H + PAR + 0.15; ry += 0.3) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), steel); r.rotation.x = Math.PI / 2; r.position.set(lx, ry, lz); g.add(r); }
    for (const by of [1.0, 2.5, 4.0, 5.1]) { box(0.16, 0.05, 0.05, steel, lx + 0.08, by, lz - 0.25); box(0.16, 0.05, 0.05, steel, lx + 0.08, by, lz + 0.25); box(0.006, 0.3, 0.08, rust, -L / 2 - 0.004, by - 0.2, lz - 0.25); box(0.006, 0.3, 0.08, rust, -L / 2 - 0.004, by - 0.2, lz + 0.25); }
    for (let hy = 2.6; hy < H + PAR; hy += 0.9) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.015, 6, 12, Math.PI), steel); hoop.rotation.z = -Math.PI / 2; hoop.rotation.y = Math.PI / 2; hoop.position.set(lx, hy, lz); g.add(hoop); }
    box(0.012, 0.03, 0.62, steel, lx - 0.38, 3.5, lz); box(0.012, 0.03, 0.62, steel, lx - 0.38, 4.6, lz);
    const ac = box(0.35, 0.55, 0.8, tankB, L / 2 + 0.2, 2.9, -2.6);
    for (let i = 0; i < 9; i++) box(0.006, 0.45, 0.02, steel, L / 2 + 0.38, 2.9, -2.6 - 0.32 + i * 0.08);
    box(0.02, 0.08, 0.7, steel, L / 2 + 0.06, 2.6, -2.6); box(0.02, 0.08, 0.7, steel, L / 2 + 0.06, 3.2, -2.6);
    box(0.006, 0.7, 0.6, rust, L / 2 + 0.004, 2.2, -2.6);
    box(0.35, 0.008, 0.8, dust, L / 2 + 0.2, 3.18, -2.6);
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 8), galvD); cd.rotation.x = Math.PI / 2; cd.position.set(L / 2 + 0.05, 2.5, -0.5); g.add(cd);
    const cd2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), galvD); cd2.position.set(L / 2 + 0.05, 1.3, 1.7); g.add(cd2);
    box(0.25, 0.4, 0.3, blueBox, L / 2 + 0.125, 1.5, 1.7);
  }
  // ---- interior ----
  const PX = -L / 2 + 6.0;
  box(0.15, H - 0.35, D - 2 * T - 1.2, plaster, PX, 0.1 + (H - 0.35) / 2, 0.6);
  box(0.15, H - 0.35 - 2.1, 0.9, plaster, PX, 2.2 + (H - 0.35 - 2.1) / 2, -D / 2 + T + 0.75);
  box(0.15, H - 0.35, 0.3, plaster, PX, 0.1 + (H - 0.35) / 2, -D / 2 + T + 0.15);
  box(0.16, 1.0, D - 2 * T - 1.2, plasterD, PX, 0.6, 0.6);
  for (const sz of [-1, 1]) { box(L - 2 * T - 0.02, H - 0.35, 0.02, plaster, 0, 0.1 + (H - 0.35) / 2, sz * (D / 2 - T - 0.01)); box(L - 2 * T - 0.02, 1.0, 0.03, plasterD, 0, 0.6, sz * (D / 2 - T - 0.015)); }
  for (const sx of [-1, 1]) { box(0.02, H - 0.35, D - 2 * T - 0.02, plaster, sx * (L / 2 - T - 0.01), 0.1 + (H - 0.35) / 2, 0); box(0.03, 1.0, D - 2 * T - 0.02, plasterD, sx * (L / 2 - T - 0.015), 0.6, 0); }
  for (const lx of [-4, 3]) { box(0.3, 0.08, 0.3, steel, lx, H - 0.3, 0); box(0.22, 0.02, 0.22, lens, lx, H - 0.35, 0); }
  // ---- sand fillet ----
  box(L + 0.4, 0.12, 0.3, sand, 0, 0.06, D / 2 + 0.15);
  box(L - 3, 0.12, 0.18, sand, 0.5, 0.17, D / 2 + 0.09);
  box(4.0, 0.08, 0.1, dust, -2.5, 0.27, D / 2 + 0.05);
  box(0.3, 0.12, D + 0.4, sand, L / 2 + 0.15, 0.06, 0);
  box(0.18, 0.12, D - 2, sand, L / 2 + 0.09, 0.17, 0.5);
  box(0.3, 0.1, D + 0.4, sand, -L / 2 - 0.15, 0.05, 0);
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
