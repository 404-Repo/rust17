// derrick_crown_module r4 detail pass: box bolt heads, foot plates with bolts, the fast line over
// the centre sheaves down to a travelling block with a hook hanging at eye height above the mid
// deck, a dead line to an anchor at the south west foot, step irons up the north east leg, a flat
// bar guard over the sheaves, a lightning rod, a plated ID panel, one bent diagonal on the W face.
// derrick_crown_module candidate 2: a different reading. Heavier box section legs
// with bolted splice collars, X bracing with a horizontal at every crossing so each
// face reads as a ladder of diamonds like the reference, the crown block as an open
// frame of two deep I beams with the sheaves between and a top cross frame, sheaves
// as grooved discs with four cut spokes, guy stubs with turnbuckles, a caged light.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds, emis) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    if (emis) { mat.emissive = new THREE.Color(emis); mat.emissiveIntensity = 1.2; }
    return mat;
  };
  const ox = M(0x7e4835, 'metal', 0.82, 0.15);
  const oxS = M(0x8d5a45, 'metal', 0.79, 0.15);
  const oxN = M(0x6d3f2e, 'metal', 0.85, 0.15);
  const oxE = M(0x7a4634, 'metal', 0.83, 0.15);
  const oxW = M(0x86513d, 'metal', 0.81, 0.15);
  const oxB = M(0x9d7159, 'metal', 0.80, 0.12);
  const oxBS = M(0xa67a63, 'metal', 0.79, 0.12);
  const oxR = M(0x6f4732, 'metal', 0.90, 0.12);   // members gone to rust
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const steelD = M(0x45484c, 'metal', 0.80, 0.30);
  const steelT = M(0x5a5d62, 'metal', 0.78, 0.30);
  const gun = M(0x3a3d40, 'metal', 0.50, 0.60);   // machined: holds no dust film
  const gunL = M(0x45494d, 'metal', 0.68, 0.60);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const plate = M(0x9c988c, 'metal', 0.80, 0.20); // plated ID panel
  const lens = M(0xc9a227, null, 0.5, 0.0, false, 0xffd9a0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    // bolt heads (gunmetal, 25 mm and under) are boxes: 12 triangles against 24 and identical at any game distance
    const mm = new THREE.Mesh(mat === gun && r <= 0.025 ? new THREE.BoxGeometry(r * 2.4, len, r * 2.4) : new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const frame = (p, q, up) => {
    const dir = q.clone().sub(p); const len = dir.length(); dir.normalize();
    const u = (up || (Math.abs(dir.y) > 0.9 ? V(0, 0, 1) : V(0, 1, 0))).clone();
    const xa = new THREE.Vector3().crossVectors(dir, u).normalize();
    const za = new THREE.Vector3().crossVectors(xa, dir).normalize();
    const gr = new THREE.Group();
    gr.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, dir, za));
    gr.position.copy(p).lerp(q, 0.5); g.add(gr); return { gr, len };
  };
  const bar = (p, q, w, t, mat, up) => { const { gr, len } = frame(p, q, up); box(w, len, t, mat, 0, 0, 0, gr); return gr; };

  // round 11 (Ben 2026-08-29: "the high tower in the center ... proportions seem weird / stretched"): the top
  // section is 20.5 m of lattice, not 7.5, so the whole derrick stands 31 m on an 8 m base like the concept
  // (concepts/oil_derrick.png). Same taper rule, same members; eleven bays of diamonds, three leg bands, a
  // 2.6 m monkey board platform 4.5 m under the crown. Nothing is scaled: every member is drawn at its size.
  const YT = 20.5, H0 = 3.25, H1 = 1.25;
  const hw = (y) => H0 - (H0 - H1) * (y / YT);

  // ---- legs: box section 0.16 in two bands, splice collars with bolts at 0.3 and 5.0 ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (const [ya, yb, matA] of [[0, 7.0, sz > 0 ? oxS : oxN], [7.0, 14.0, sz > 0 ? oxS : oxN], [14.0, YT + 0.1, sz > 0 ? oxBS : oxB]]) {
      const p = V(sx * (hw(ya) - 0.08), ya, sz * (hw(ya) - 0.08)), q = V(sx * (hw(yb) - 0.08), yb, sz * (hw(yb) - 0.08));
      const { gr, len } = frame(p, q, V(0, 0, sz));
      box(0.16, len, 0.16, matA, 0, 0, 0, gr);
      box(0.17, len, 0.01, sz > 0 ? oxN : oxS, 0, 0, -0.08, gr);   // shaded inner face
    }
    for (const yy of [0.3, 7.0, 14.0]) {
      const c = V(sx * (hw(yy) - 0.08), yy, sz * (hw(yy) - 0.08));
      box(0.22, 0.4, 0.22, yy > 13 ? oxB : ox, c.x, c.y, c.z);
      for (const [nx, nz] of [[sx, 0], [0, sz]]) for (const dy of [-0.12, 0, 0.12]) cyl(0.025, 0.03, gun, c.x + nx * 0.115, yy + dy, c.z + nz * 0.115, nx ? 'x' : 'z', 6);
      // the drip under the lower collar stops at the foot plate; it used to hang 0.45 m below the base plane and lift the crown off the mid deck
      const dl = yy > 1 ? 0.25 : 0.06, dy = yy - 0.2 - dl / 2;
      box(0.006, dl, 0.1, rust, c.x + sx * 0.113, dy, c.z);
      box(0.1, dl, 0.006, rust, c.x, dy, c.z + sz * 0.113);
    }
    box(0.14, 0.008, 0.14, dust, sx * (hw(YT + 0.1) - 0.08), YT + 0.104, sz * (hw(YT + 0.1) - 0.08));
    // foot plate with four bolts and nuts where the leg lands on the mid deck
    { const c = hw(0) - 0.08; box(0.36, 0.03, 0.36, ox, sx * c, 0.015, sz * c);
      for (const bx of [-1, 1]) for (const bz of [-1, 1]) { cyl(0.016, 0.05, gun, sx * c + bx * 0.14, 0.045, sz * c + bz * 0.14, 'y', 6); box(0.05, 0.016, 0.05, gun, sx * c + bx * 0.14, 0.038, sz * c + bz * 0.14); } }
  }

  // ---- diamonds: girts at 0, 1.85, 3.7, 5.55, 7.4 and X braces between, plates at crossings ----
  const faceMat = (f, y) => y > 14 ? (f === 'S' ? oxBS : oxB) : (f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW);
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const levels = [0.12]; for (let y = 1.95; y < YT - 1.2; y += 1.85) levels.push(+y.toFixed(2)); levels.push(YT - 0.1);
  for (const y of levels) {
    const w = hw(y);
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f, y);
      if (nz) { box(2 * w, 0.1, 0.05, mat, 0, y, nz * (w + 0.03)); box(2 * w - 0.5, 0.006, 0.04, dust, 0, y + 0.053, nz * (w + 0.03)); }
      else { box(0.05, 0.1, 2 * w, mat, nx * (w + 0.03), y, 0); box(0.04, 0.006, 2 * w - 0.5, dust, nx * (w + 0.03), y + 0.053, 0); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const [nx, nz, f] of [[0, sz, sz > 0 ? 'S' : 'N'], [sx, 0, sx > 0 ? 'E' : 'W']]) {
        box(nx ? 0.012 : 0.3, 0.26, nz ? 0.012 : 0.3, oxR, sx * w + nx * 0.06, y, sz * w + nz * 0.06);
        for (const u of [-0.1, 0.1]) for (const v of [-0.07, 0.07]) cyl(0.022, 0.03, gun, sx * w + nx * 0.075 + (nz ? u : 0), y + v, sz * w + nz * 0.075 + (nx ? u : 0), nx ? 'x' : 'z', 6);
        { const dl = Math.min(0.25, Math.max(0, y - 0.15)); if (dl > 0.05) box(nx ? 0.006 : 0.08, dl, nz ? 0.006 : 0.08, rust, sx * w + nx * 0.07, y - 0.13 - dl / 2, sz * w + nz * 0.07); }
      }
    }
  }
  for (let li = 0; li < levels.length - 1; li++) {
    const y1 = levels[li] + 0.08, y2 = levels[li + 1] - 0.08, ym = (y1 + y2) / 2;
    const w1 = hw(y1), w2 = hw(y2), wm = hw(ym), o = 0.07;
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f, ym);
      for (const s of [-1, 1]) {
        let p, q;
        if (nz) { p = V(-s * w1, y1, nz * (w1 + o)); q = V(s * w2, y2, nz * (w2 + o)); }
        else { p = V(nx * (w1 + o), y1, -s * w1); q = V(nx * (w2 + o), y2, s * w2); }
        if (li === 1 && f === 'W' && s < 0) {
          // one diagonal took a knock and is bent outward at its middle, rust at the crease
          const k = p.clone().lerp(q, 0.5); k.x += nx * 0.14; k.y -= 0.04;
          bar(p, k, 0.07, 0.02, oxR, V(nx, 0, nz)); bar(k, q, 0.07, 0.02, oxR, V(nx, 0, nz));
          box(0.03, 0.1, 0.09, rust, k.x + nx * 0.012, k.y - 0.02, k.z);
        } else bar(p, q, 0.07, 0.02, s > 0 ? mat : oxR, V(nx, 0, nz));
      }
      box(nx ? 0.012 : 0.22, 0.22, nz ? 0.012 : 0.22, oxR, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      cyl(0.021, 0.03, gun, nx * (wm + o + 0.03), ym, nz * (wm + o + 0.03), nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.18, nz ? 0.006 : 0.05, rust, nx * (wm + o + 0.03), ym - 0.2, nz * (wm + o + 0.03));
    }
  }

  // ---- crown block: two deep I beams on edge 0.9 m tall, end ties, the sheaves stand proud ----
  // ---- monkey board: a 2.6 m grating platform 4.5 m under the crown, rails, on outriggers off the legs ----
  { const PY = YT - 4.5, pw = hw(PY) + 0.55;
    box(2 * pw, 0.05, 2 * pw, steel, 0, PY + 0.025, 0);
    box(2 * pw - 0.3, 0.006, 2 * pw - 0.3, dust, 0, PY + 0.053, 0);
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      box(nz ? 2 * pw : 0.06, 0.06, nz ? 0.06 : 2 * pw, ox, nx * pw, PY - 0.02, nz * pw);              // kerb angle
      for (const ry of [0.55, 1.1]) box(nz ? 2 * pw : 0.035, 0.035, nz ? 0.035 : 2 * pw, oxR, nx * pw, PY + ry, nz * pw);   // rails
      for (const t of [-1, -0.33, 0.33, 1]) box(0.035, 1.1, 0.035, oxR, nz ? t * pw : nx * pw, PY + 0.55, nx ? t * pw : nz * pw);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = hw(PY) - 0.08; bar(V(sx * c, PY - 0.9, sz * c), V(sx * pw, PY - 0.03, sz * pw), 0.06, 0.02, ox); }
  }

  const BX = 1.25, BZ = 0.8, BY0 = YT, BH = 1.3, PH = 0.9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.3, 0.03, 0.3, steel, sx * (hw(YT) - 0.08), BY0 + 0.015, sz * (hw(YT) - 0.08));
  for (const sz of [-1, 1]) {
    const mat = sz > 0 ? steel : steelD, zc = sz * (BZ - 0.1);
    box(2 * BX, PH - 0.1, 0.012, mat, 0, BY0 + PH / 2, zc);                          // web
    box(2 * BX, 0.03, 0.2, steelT, 0, BY0 + PH - 0.015, zc);                        // top flange
    box(2 * BX, 0.03, 0.2, mat, 0, BY0 + 0.05, zc);                                  // bottom flange
    box(2 * BX - 0.2, 0.008, 0.16, dust, 0, BY0 + PH + 0.004, zc);
    for (const x of [-1.1, -0.55, 0, 0.55, 1.1]) {
      box(0.03, PH - 0.16, 0.19, mat, x, BY0 + PH / 2, zc);                         // stiffeners
      box(0.05, 0.3, 0.006, rust, x + 0.05, BY0 + 0.35, zc + sz * 0.1);
    }
    for (const x of [-0.85, -0.3, 0.3, 0.85]) { cyl(0.025, 0.03, gun, x, BY0 + PH - 0.1, zc + sz * 0.012, 'z', 6); cyl(0.025, 0.03, gun, x, BY0 + 0.12, zc + sz * 0.012, 'z', 6); }
  }
  for (const sx of [-1, 1]) { box(0.06, PH - 0.1, 2 * BZ, steelD, sx * (BX - 0.03), BY0 + PH / 2, 0); box(0.12, 0.03, 2 * BZ, steelT, sx * (BX - 0.06), BY0 + PH - 0.015, 0); }
  // axle carried in pillow blocks on the beam tops, four grooved sheaves with cut spokes
  const AY = BY0 + PH + 0.05;
  cyl(0.03, 2 * BX + 0.24, gunL, 0, AY, 0, 'x', 8);
  for (const sx of [-1, 1]) { box(0.16, 0.2, 0.24, gun, sx * (BX - 0.08), AY - 0.03, 0); cyl(0.06, 0.06, gun, sx * (BX + 0.16), AY, 0, 'x', 8); box(0.06, 0.2, 0.006, rust, sx * (BX - 0.08), AY - 0.23, 0.123); }
  for (let i = 0; i < 4; i++) {
    const x = -0.75 + i * 0.5;
    cyl(0.45, 0.04, gun, x - 0.045, AY, 0, 'x', 14); cyl(0.45, 0.04, gun, x + 0.045, AY, 0, 'x', 14);
    cyl(0.38, 0.05, gunL, x, AY, 0, 'x', 14);
    for (let k = 0; k < 4; k++) { const b = box(0.06, 0.62, 0.05, gun, x, AY, 0); b.rotation.x = k * Math.PI / 4 + Math.PI / 8; }
    for (let k = 0; k < 4; k++) { const b = box(0.06, 0.62, 0.05, gun, x, AY, 0); b.rotation.x = k * Math.PI / 4 + Math.PI / 8 + Math.PI / 2; }
    cyl(0.12, 0.13, gunL, x, AY, 0, 'x', 10);
  }
  // ---- the lines: fast line over the two centre sheaves down to a travelling block with a hook, hanging where a player
  //      on the mid deck sees it at eye height; a dead line from the outer sheave to an anchor at the south west foot ----
  const BLK = 2.0, by = BLK - 0.28;
  for (const x of [-0.25, 0.25]) cyl(0.014, AY - 0.45 - (by + 0.3), gunL, x, (AY - 0.45 + by + 0.3) / 2, 0, 'y', 6);
  for (const sx of [-1, 1]) box(0.024, 0.6, 0.34, steelD, sx * 0.14, by, 0);                 // cheek plates
  cyl(0.24, 0.06, gun, 0, by, 0, 'x', 14); cyl(0.09, 0.3, gunL, 0, by, 0, 'x', 10);           // sheave and its hub
  for (const [dy, dz] of [[0.24, 0.12], [0.24, -0.12], [-0.24, 0.12], [-0.24, -0.12]]) cyl(0.02, 0.32, gun, 0, by + dy, dz, 'x', 6);   // spacer bolts
  box(0.12, 0.12, 0.08, steel, 0, by - 0.36, 0);                                              // becket
  cyl(0.025, 0.14, gunL, 0, by - 0.48, 0, 'y', 8);                                            // hook shank
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 10, Math.PI * 1.55), gun); hook.position.set(0, by - 0.62, 0); hook.rotation.z = Math.PI * 0.72; g.add(hook);
  box(0.006, 0.24, 0.06, rust, -0.153, by - 0.1, 0.06); box(0.006, 0.2, 0.05, rust, 0.153, by - 0.12, -0.08);
  {
    const p = V(-0.75, AY - 0.3, 0.3), q = V(-(hw(0) - 0.08) + 0.35, 0.3, (hw(0) - 0.08) - 0.35);
    const { gr, len } = frame(p, q);
    cyl(0.012, len, gunL, 0, 0, 0, 'y', 6, gr);
    box(0.2, 0.26, 0.2, steel, q.x, 0.13, q.z); box(0.08, 0.12, 0.006, rust, q.x, 0.06, q.z + 0.103);   // dead line anchor
    for (const bx of [-1, 1]) cyl(0.016, 0.03, gun, q.x + bx * 0.06, 0.28, q.z, 'y', 6);
  }
  // ---- flat bar guard over the sheaves: two half hoops and three longitudinals; a lightning rod on the crown ----
  for (const gx of [-1.0, 1.0]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.012, 5, 10, Math.PI), gunL); h.position.set(gx, AY, 0); h.rotation.y = Math.PI / 2; g.add(h); }
  for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) cyl(0.012, 2.0, gunL, 0, AY + 0.56 * Math.sin(a), 0.56 * Math.cos(a), 'x', 6);
  box(0.1, 0.03, 0.1, steel, -1.1, BY0 + PH + 0.015, -(BZ - 0.1)); cyl(0.01, 0.8, gunL, -1.1, BY0 + PH + 0.43, -(BZ - 0.1), 'y', 5);
  // ---- step irons welded up the north east leg every 0.35 m, how the crew reaches the crown ----
  for (let y = 0.5; y < YT - 0.2; y += 0.35) {
    const c = hw(y) - 0.08;
    box(0.02, 0.022, 0.3, steel, c + 0.23, y, -c);
    for (const dz of [-0.13, 0.13]) box(0.17, 0.022, 0.022, steel, c + 0.145, y, -c + dz);
  }
  // plated ID panel on the south face of the SE leg at 1.6 m (eye height from the mid deck)
  { const c = hw(1.6) - 0.08; box(0.18, 0.24, 0.008, gun, c, 1.6, c + 0.085); box(0.15, 0.2, 0.012, plate, c, 1.6, c + 0.095); box(0.06, 0.14, 0.005, rust, c, 1.42, c + 0.092); }
  // aircraft light in a wire guard on the beam top, outboard of the sheaves
  cyl(0.08, 0.08, gun, 1.1, BY0 + PH + 0.04, BZ - 0.1, 'y', 10);
  cyl(0.085, 0.16, lens, 1.1, BY0 + PH + 0.16, BZ - 0.1, 'y', 10);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 5, 10), gunL); guard.rotation.x = Math.PI / 2; guard.position.set(1.1, BY0 + PH + 0.2, BZ - 0.1); g.add(guard);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; cyl(0.006, 0.26, gunL, 1.1 + 0.11 * Math.cos(a), BY0 + PH + 0.13, BZ - 0.1 + 0.11 * Math.sin(a), 'y', 5); }
  cyl(0.01, PH, gun, 1.1, BY0 + PH / 2 + 0.02, BZ + 0.02, 'y', 6);

  // ---- guy stubs with turnbuckles and eye plates ----
  for (const sx of [-1, 1]) {
    const p = V(sx * (BX + 0.05), BY0 + PH - 0.1, 0);
    const q = V(sx * (BX + 0.05 + 3 * Math.cos(55 * Math.PI / 180)), BY0 + PH - 0.1 - 3 * Math.sin(55 * Math.PI / 180), 0);
    const { gr, len } = frame(p, q);
    cyl(0.015, len, gunL, 0, 0, 0, 'y', 6, gr);
    cyl(0.04, 0.3, gun, 0, -len / 2 + 0.6, 0, 'y', 8, gr);            // turnbuckle body
    box(0.03, 0.34, 0.09, gun, 0, -len / 2 + 0.6, 0, gr);
    box(0.08, 0.1, 0.16, steel, 0, -len / 2 + 0.03, 0, gr);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), steel); eye.position.y = len / 2 + 0.05; gr.add(eye);
    box(0.14, 0.12, 0.02, steel, sx * (BX + 0.02), BY0 + PH - 0.1, 0);
    box(0.06, 0.25, 0.006, rust, sx * (BX + 0.035), BY0 + PH - 0.3, 0);
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
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
