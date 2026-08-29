// corrugated_wall_panel (round 13 rebuild): the sheet is a CONTINUOUS corrugated surface, one indexed
// BufferGeometry per sheet (front skin, back skin, wavy top lip, wavy bottom lip) with analytic smooth
// normals from the sine profile, so the shading rolls over each rib instead of facetting into a row of
// rods. 76 mm pitch, 18 mm depth. Three sheets lap by one pitch so the top edge steps; the left sheet's
// bottom corner is cut and bent back (0.08 m: the 0.15 m depth envelope caps the spec's 0.2 m). I-section posts, timber rails behind, screw heads on the
// crests over the rails with rust runs below, a dust line along the foot and a sand drift.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55);
  const galvB = M(0xa7aba9, 'metal', 0.72, 0.55);
  const galvC = M(0x989d9b, 'metal', 0.72, 0.55);
  const post = M(0x8d8b84, 'metal', 0.80, 0.30);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const steelB = M(0x565a5e, 'metal', 0.78, 0.35);
  const timber = M(0xa07a4f, 'timber', 0.90, 0.0);
  const timberS = M(0xab8453, 'timber', 0.90, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc5b088, 'ground', 0.95, 0.0);
  const sandL = M(0xbba37b, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, h, seg, mat, x, y, z, rx) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    if (rx) mm.rotation.x = rx; mm.position.set(x, y, z); g.add(mm); return mm;
  };
  const W = 3.0, PITCH = 0.076, DEPTH = 0.018, AMP = DEPTH / 2, TH = 0.0012, SPP = 6;
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0x10000; };

  // ---- a corrugated sheet: x from -len/2..len/2 (local), profile z = AMP sin(2 pi x / PITCH) measured from
  //      the sheet's left edge so every sheet starts on the same phase; top(x) and bot(x) give the ragged
  //      edges. Front skin ROWS rows, back skin BROWS rows, lips one quad per column. Smooth normals from
  //      the derivative, hard edge at the lips.
  // profile of one pitch, as fractions of the pitch: flat trough, flank up, flat crest, flank down. Corners are
  // duplicated columns so the crest and trough edges stay crisp; the flanks sit at about 47 degrees so the
  // shader's edge wear lightens them the way a real rolled edge polishes.
  const FL = Math.hypot(0.22 * PITCH, DEPTH), FNX = DEPTH / FL, FNZ = 0.22 * PITCH / FL;
  const PROF = [
    [0.00, -AMP, 0, 1], [0.28, -AMP, 0, 1],
    [0.28, -AMP, FNX, FNZ], [0.50, AMP, FNX, FNZ],
    [0.50, AMP, 0, 1], [0.78, AMP, 0, 1],
    [0.78, AMP, -FNX, FNZ], [1.00, -AMP, -FNX, FNZ],
  ];
  const corrSheet = (len, top, bot, mat, rows, brows) => {
    const np = Math.round(len / PITCH), cols = [];   // [x, z, nx, nz, joined-to-previous]
    for (let k = 0; k < np; k++) for (let j = 0; j < PROF.length; j++) {
      const [u, z, nx, nz] = PROF[j];
      cols.push([(k + u) * PITCH - len / 2, z, nx, nz, j % 2 === 1]);
    }
    const P = [], N = [], I = [];
    const skin = (R, sign, off) => {
      const base = P.length / 3;
      cols.forEach((c) => {
        const y0 = bot(c[0]), y1 = top(c[0]);
        for (let r = 0; r <= R; r++) { P.push(c[0], y0 + (y1 - y0) * r / R, c[1] + off); N.push(c[2] * sign, 0, c[3] * sign); }
      });
      for (let i = 1; i < cols.length; i++) {
        if (!cols[i][4]) continue;
        for (let r = 0; r < R; r++) {
          const a = base + (i - 1) * (R + 1) + r, b = a + R + 1;
          if (sign > 0) I.push(a, b, a + 1, b, b + 1, a + 1); else I.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    };
    const lip = (isTop) => {
      const base = P.length / 3, ny = isTop ? 1 : -1;
      cols.forEach((c) => { const y = isTop ? top(c[0]) : bot(c[0]); P.push(c[0], y, c[1] + TH / 2, c[0], y, c[1] - TH / 2); N.push(0, ny, 0, 0, ny, 0); });
      for (let i = 1; i < cols.length; i++) {
        if (!cols[i][4]) continue;
        const a = base + (i - 1) * 2, b = a + 2;
        if (isTop) I.push(a, a + 1, b, b, a + 1, b + 1); else I.push(a, b, a + 1, b, b + 1, a + 1);
      }
    };
    skin(rows, 1, TH / 2); skin(brows, -1, -TH / 2); lip(true); lip(false);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((P.length / 3) * 2).fill(0), 2));
    geo.setIndex(I);
    return new THREE.Mesh(geo, mat);
  };
  // three sheets lapping by one pitch: [centre x, length, nominal height, material, z of the sheet mid plane]
  // the middle sheet laps in front of the two outer ones. The top edge wanders +-3 cm on top of the step.
  const SH = [[-1.0, 1.08, 2.40, galv, -0.020], [0.0, 1.08, 2.32, galvB, -0.014], [1.0, 1.08, 2.37, galvC, -0.020]];
  const CUT_W = 0.30, CUT_H = 0.30;   // bent corner: left sheet, bottom left
  // round 21: the right sheet has torn along the screw line over the 1.9 m rail. The sheet above it is
  // genuinely GONE from the outline (top(x) drops to the tear), and the freed piece is folded back over
  // the rail as its own mesh, so you see through the wall where it came from.
  const TEAR = { x0: 0.58, x1: 0.98, y: 1.95 };
  const sheetMeshes = [];
  SH.forEach(([cx, len, h, mat, z], si) => {
    const top = (x) => {
      const t0 = h + 0.03 * Math.sin((x + cx) * 5.3 + si) + 0.015 * Math.sin((x + cx) * 17.1);
      const wx = x + cx;
      if (si !== 2 || wx <= TEAR.x0 || wx >= TEAR.x1) return t0;
      return TEAR.y + 0.03 + 0.022 * Math.sin(wx * 39.0) + 0.016 * Math.sin(wx * 91.0);
    };
    const bot = si === 0 ? (x) => (x < -len / 2 + CUT_W ? CUT_H : 0) : () => 0;
    const mm = corrSheet(len, top, bot, mat, 3, 1);
    mm.position.set(cx, 0, z); g.add(mm); sheetMeshes.push(mm);
  });
  // rib under a given world x: which sheet, and the front crest of that pitch cell
  const ribAt = (x) => {
    const s = x < -0.5 ? SH[0] : x > 0.5 ? SH[2] : SH[1];
    const left = s[0] - s[1] / 2, k = Math.max(0, Math.min(Math.round(s[1] / PITCH) - 1, Math.floor((x - left) / PITCH)));
    const X = left + k * PITCH; return { X, crest: X + PITCH * 0.64, trough: X + PITCH * 0.14, z: s[4] };
  };
  // a rust run down a crest: thin box sat on the crest, proud by 1.5 mm; dz > 0 front, < 0 back (back sits in the trough)
  const rustRun = (x, y0, h, mat, front) => {
    const r = ribAt(x);
    if (front) box(0.014, h, 0.002, mat, r.crest, y0 + h / 2, r.z + AMP + TH / 2 + 0.0005);
    else box(0.014, h, 0.002, mat, r.crest, y0 + h / 2, r.z - AMP - TH / 2 - 0.0005);
  };

  // ---- bent bottom corner: the cut piece of the left sheet, hinged at its top edge and bent BACK ----
  {
    const s = SH[0], left = s[0] - s[1] / 2;
    const piece = corrSheet(CUT_W, () => CUT_H, () => 0, galv, 2, 1);
    const hinge = new THREE.Group(); hinge.position.set(left + CUT_W / 2, CUT_H, s[4]); g.add(hinge);
    piece.position.set(0, -CUT_H, 0); hinge.add(piece);
    hinge.rotation.x = 0.26;                                   // bottom swings back ~0.1 m (the 0.15 m envelope caps it) and up
    hinge.rotation.z = 0.12;                                   // and twists a little
    box(CUT_W, 0.02, 0.004, rustD, 0, -0.005, AMP + 0.004, hinge);   // torn hinge line, rusted
    box(CUT_W - 0.04, 0.012, 0.004, rust, 0.01, -0.02, AMP + 0.003, hinge);
    box(0.012, CUT_H, 0.004, rust, CUT_W / 2 - 0.004, -CUT_H / 2, AMP + 0.003, hinge);   // torn vertical edge
  }

  // ---- I-section posts (0.08 square envelope), flanges front and back of the sheet, base plates with bolts ----
  const iProfile = new THREE.Shape([
    [-0.04, -0.04], [0.04, -0.04], [0.04, -0.032], [0.005, -0.032], [0.005, 0.032], [0.04, 0.032], [0.04, 0.04],
    [-0.04, 0.04], [-0.04, 0.032], [-0.005, 0.032], [-0.005, -0.032], [-0.04, -0.032],
  ].map(([a, b]) => new THREE.Vector2(a, b)));
  const POSTS = [-W / 2 + 0.04, 0, W / 2 - 0.04];
  for (const px of POSTS) {
    const geo = new THREE.ExtrudeGeometry(iProfile, { depth: 2.45, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, post); mm.rotation.x = -Math.PI / 2; mm.rotation.z = Math.PI / 2;
    mm.position.set(px, 0.012, -0.022); g.add(mm);   // front flange 2 cm proud of the sheet, as the reference
    box(0.16, 0.012, 0.11, steel, px, 0.006, -0.03);
    for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.008, 0.014, 6, rust, px + bx * 0.06, 0.019, -0.03 + bz * 0.04);
    // paint loss and rust on the flanges: at the foot, and a run below the rail fixings
    box(0.03, 0.22, 0.004, rust, px - 0.016, 0.14, 0.02);
    box(0.07, 0.05, 0.004, rustD, px, 0.04, 0.02);
    box(0.03, 0.22, 0.004, rust, px + 0.016, 0.14, -0.064);
    box(0.06, 0.006, 0.07, dust, px, 2.465, -0.022);
    box(0.02, 0.10, 0.004, rust, px + 0.02, 2.36, 0.02);
    box(0.02, 0.10, 0.004, rust, px - 0.02, 2.36, -0.064);
    box(0.024, 0.7, 0.003, sandL, px - 0.01, 0.9, 0.0205);   // dust film on the sun side flange
  }
  // ---- timber rails at 0.7 and 1.9 behind the sheet between the posts; screw heads on the crests every 0.3 m
  //      with rust runs below, screw tips out of the rail backs ----
  for (const ry of [0.7, 1.9]) {
    for (const [x0, x1] of [[-W / 2 + 0.08, -0.04], [0.04, W / 2 - 0.08]]) {
      const len = x1 - x0, cx = (x0 + x1) / 2;
      box(len, 0.10, 0.05, timber, cx, ry, -0.058);
      box(len - 0.04, 0.04, 0.004, timberS, cx, ry + 0.025, -0.085);
      box(len, 0.006, 0.05, dust, cx, ry + 0.053, -0.058);
      for (let sx = x0 + 0.15, n = 0; sx < x1 - 0.05; sx += 0.30, n++) {
        const r = ribAt(sx);
        const zf = r.z + AMP + TH / 2;
        cyl(0.009, 0.008, 6, steel, r.crest, ry, zf + 0.004, Math.PI / 2);                    // hex head on the crest
        const h1 = 0.10 + 0.30 * rnd(); rustRun(sx, ry - 0.02 - h1, h1, n % 3 === 1 ? rustD : rust, true);   // run below every screw, uneven
        if (rnd() < 0.35) { const h2 = 0.08 + 0.2 * rnd(); rustRun(sx, ry - 0.25 - h2, h2, rustD, true); }
        cyl(0.004, 0.012, 4, rust, r.crest, ry, -0.088, Math.PI / 2);                          // tip out of the rail back
        box(0.012, 0.09, 0.004, rust, r.crest, ry - 0.075, -0.086);
        if (n % 2 === 0) rustRun(sx, ry - 0.4, 0.3, rust, false);                             // and down the back of the sheet
      }
    }
    for (let sx = -1.05; sx < 1.3; sx += 0.9) rustRun(sx, ry - 0.26, 0.15, rustD, false);
  }
  // ---- back: X bracing of 40 x 5 flat bar bolted to the rails in each bay with a centre plate, a steel angle
  //      along the top holding the uneven sheet edges, and a bolted patch sheet over a hole ----
  const brace = (x0, y0, x1, y1, mat) => {
    const dx = x1 - x0, dy = y1 - y0;
    const b = box(0.04, Math.hypot(dx, dy), 0.005, mat, (x0 + x1) / 2, (y0 + y1) / 2, -0.0885);
    b.rotation.z = -Math.atan2(dx, dy); return b;
  };
  const boltB = (x, y, z, len) => {
    cyl(0.008, 0.008, 6, steel, x, y, z, Math.PI / 2);
    box(0.014, len, 0.004, rust, x + 0.01, y - len / 2 - 0.01, z + 0.0015);
  };
  for (const [x0, x1] of [[-1.38, -0.08], [0.08, 1.38]]) {
    brace(x0, 0.72, x1, 1.88, steel); brace(x0, 1.88, x1, 0.72, steelB);
    box(0.12, 0.12, 0.004, steel, (x0 + x1) / 2, 1.3, -0.0925);
    for (const [bx, by] of [[x0, 0.72], [x1, 0.72], [x0, 1.88], [x1, 1.88], [(x0 + x1) / 2, 1.3]]) boltB(bx, by, -0.095, 0.12);
  }
  for (const [x0, x1] of [[-W / 2 + 0.08, -0.04], [0.04, W / 2 - 0.08]]) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    box(len, 0.04, 0.004, steelB, cx, 2.26, -0.034);
    box(len, 0.004, 0.04, steelB, cx, 2.282, -0.054);
    for (let sx = x0 + 0.2; sx < x1; sx += 0.4) boltB(ribAt(sx).trough, 2.26, -0.036, 0.08);
  }
  {
    const r = ribAt(-1.3), left = r.X, wP = 6 * PITCH, zP = -0.02 - 0.004;
    const pm = corrSheet(wP, () => 1.62, () => 1.0, M(0x8f9492, 'metal', 0.74, 0.5), 2, 1); pm.position.set(left + wP / 2, 0, zP); g.add(pm);
    for (const [bx, by] of [[left + PITCH * 0.75, 1.07], [left + PITCH * 4.75, 1.07], [left + PITCH * 0.75, 1.55], [left + PITCH * 4.75, 1.55]]) boltB(bx, by, zP - AMP - TH / 2 - 0.004, 0.1);
  }
  // dirt and rust on the sheet back: at the two laps, and splash above the drift
  for (const lx of [-0.5, 0.5]) { box(0.03, 2.2, 0.004, rustD, lx, 1.2, -0.034); box(0.06, 0.4, 0.004, rust, lx + 0.03, 0.6, -0.035); }
  for (let sx = -1.3; sx < 1.4; sx += 0.35) box(0.12, 0.08 + 0.05 * Math.abs(Math.sin(sx * 3)), 0.004, sandL, sx, 0.34, -0.034);
  // ---- round 21 battle damage: the rounds went THROUGH the sheet. Each hole is an outer ring lying on the
  //      real corrugated surface, a torn collar proud of it in bare bright steel, then a wall falling to a
  //      near black floor; on the back the same builder makes the exit: a cone of petals blown outward with
  //      a dark mouth. Nothing here is a flat plate on the face. ----
  const torn = M(0xc6cac7, 'metal', 0.62, 0.55, true);   // double sided: a torn rim is seen from both sides of the hole
  const holeM = M(0x0e0c0a, 'metal', 0.95, 0.10, true);
  const tearM = M(0x9aa09d, 'metal', 0.70, 0.50);
  // the sheet surface at a world x: which sheet, its mid plane, and the sine-free trapezoid rib on it
  const surfZ = (xw) => {
    const sh = xw < -0.5 ? SH[0] : xw > 0.5 ? SH[2] : SH[1];
    const t = (((((xw - sh[0]) + sh[1] / 2) / PITCH) % 1) + 1) % 1;
    const f = t < 0.28 ? -1 : t < 0.50 ? -1 + 2 * (t - 0.28) / 0.22 : t < 0.78 ? 1 : 1 - 2 * (t - 0.78) / 0.22;
    return sh[4] + f * AMP;
  };
  const faceF = (u, v, off) => [u, v, surfZ(u) + TH / 2 + off];
  const faceB = (u, v, off) => [u, v, surfZ(u) - TH / 2 - off];
  const rawAdd = (Pp, Ii, m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((Pp.length / 3) * 2).fill(0), 2));
    geo.setIndex(Ii); geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, m); g.add(mm); return mm;
  };
  function craters(list, place, o) {
    const fO = o.fO, fL = o.fL, fM = o.fM, oL = o.oL, oM = o.oM, oC = o.oC, N = o.seg;
    const PA = [], IA = [], PB = [], IB = [];
    for (const [u0, v0, r] of list) {
      const bA = PA.length / 3, bB = PB.length / 3, ph = Math.abs(u0 * 7.31 + v0 * 3.17) % 6.2832;
      const wob = (k, sd) => 1 + 0.12 * Math.sin(k * 2.39 + ph + sd) + 0.06 * Math.sin(k * 4.71 + ph * 2 + sd);
      for (let k = 0; k < N; k++) {
        const t = (k / N) * Math.PI * 2 + ph * 0.13, ca = Math.cos(t), sa = Math.sin(t);
        const rO = r * fO * wob(k, 0), rL = r * fL * wob(k, 1.7), rM = r * fM * wob(k, 3.4);
        PA.push(...place(u0 + ca * rO, v0 + sa * rO, 0), ...place(u0 + ca * rL, v0 + sa * rL, oL));
        PB.push(...place(u0 + ca * rL, v0 + sa * rL, oL), ...place(u0 + ca * rM, v0 + sa * rM, oM));
      }
      PB.push(...place(u0, v0, oC));
      for (let k = 0; k < N; k++) {
        const k1 = (k + 1) % N, a = bA + k * 2, b = bA + k1 * 2, c = bB + k * 2, d = bB + k1 * 2;
        IA.push(a, a + 1, b + 1, a, b + 1, b);
        IB.push(c, c + 1, d + 1, c, d + 1, d, c + 1, bB + 2 * N, d + 1);
      }
    }
    rawAdd(PA, IA, o.rim); rawAdd(PB, IB, holeM);
  }
  // snapped to a rib CREST: in a trough the crater sinks below the ribs either side and disappears
  const HITS = [[-0.78, 1.55, 0.024], [-1.15, 0.46, 0.021], [-0.20, 1.68, 0.026], [0.25, 1.02, 0.022], [0.92, 1.36, 0.025]]
    .map(([x, y, r]) => [ribAt(x).crest, y, r]);
  craters(HITS, faceF, { fO: 1.85, fL: 1.28, fM: 0.95, oL: 0.010, oM: 0.004, oC: 0.003, seg: 10, rim: torn });
  craters(HITS, faceB, { fO: 1.40, fL: 0.62, fM: 0.42, oL: 0.026, oM: 0.022, oC: 0.019, seg: 8, rim: torn });
  for (const [x, y, r] of HITS) rustRun(x, y - r * 2.6, 0.10 + 0.18 * rnd(), rnd() < 0.5 ? rust : rustD, true);
  // ---- the piece that tore off the top of the right sheet, folded back over the rail, torn edges rusted ----
  {
    const hx = (TEAR.x0 + TEAR.x1) / 2, w = TEAR.x1 - TEAR.x0;
    const piece = corrSheet(w, (x) => 0.34 + 0.02 * Math.sin(x * 33 + 1.2), () => 0, tearM, 1, 1);
    const hinge = new THREE.Group(); hinge.position.set(hx, TEAR.y + 0.015, SH[2][4]); g.add(hinge);
    hinge.rotation.x = -0.24; hinge.rotation.z = -0.38;   // folded back over the rail and twisted; the 0.15 m depth envelope caps the fold
    hinge.add(piece);
    box(w - 0.02, 0.014, 0.004, rustD, 0, 0.006, AMP + 0.004, hinge);                 // the tear line on the piece
    box(0.010, 0.34, 0.004, rust, -w / 2 + 0.005, 0.17, AMP + 0.003, hinge);          // and its two torn ends
    box(0.010, 0.34, 0.004, rust, w / 2 - 0.005, 0.17, AMP + 0.003, hinge);
    box(w, 0.018, 0.004, rustD, hx, TEAR.y + 0.022, SH[2][4] + AMP + 0.004);          // rust along the cut on the sheet
    for (let sx = TEAR.x0 + 0.06; sx < TEAR.x1; sx += 0.11) rustRun(sx, TEAR.y - 0.30, 0.28, rust, true);
  }
  // ---- dust line along the foot of the front, sand drift front berm and back skin ----
  for (const [dx, dw, dy] of [[-0.75, 0.5, 0.31], [-0.1, 0.7, 0.295], [0.55, 0.45, 0.32], [1.15, 0.4, 0.30]]) box(dw, 0.012, 0.002, dust, dx, dy, -0.0095);   // dust line where the drift met the sheet, broken, in the troughs
  box(W - 0.2, 0.05, 0.05, sand, 0.05, 0.025, 0.015);
  box(W - 0.8, 0.07, 0.035, sand, -0.1, 0.075, 0.008);
  box(1.4, 0.07, 0.025, dust, 0.3, 0.14, 0.003);
  box(0.7, 0.06, 0.018, dust, 0.6, 0.20, -0.001);
  box(0.5, 0.05, 0.03, sandL, -1.1, 0.025, -0.06);                         // sand blown through the cut corner
  box(W, 0.05, 0.02, sand, 0, 0.025, -0.10);
  box(1.2, 0.06, 0.015, sandL, 0.7, 0.075, -0.098);
  const WEATHER_OPTS = { sand: 0.32 };   // vertex colour: the bottom 0.3 m of the sheet goes sand coloured
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
