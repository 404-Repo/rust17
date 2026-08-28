// derrick_base_module r4 detail pass: box bolt heads (12 tris each), leg shoes with gusset ribs
// and double nuts, a standpipe with a gate valve on the north west leg under the mid module's
// pipe, conduit and a junction box on the south east leg, hazard toe blocks at the two openings,
// knee brace end plates, plated ID panels at eye height, one torn secondary brace, rail caps.
// derrick_base_module candidate 2: a different reading of the reference. I section
// legs (web + two flanges), a central column under the deck as the concept shows,
// knee braces carrying the 1 m deck overhang, a horizontal at mid bay so the X braces
// meet a plate, deck as a both ways 0.25 m bar mesh over a dark plate, flat bar posts.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const ox = M(0x7e4835, 'metal', 0.82, 0.15);
  const oxS = M(0x8d5a45, 'metal', 0.79, 0.15);
  const oxN = M(0x6d3f2e, 'metal', 0.85, 0.15);
  const oxE = M(0x7a4634, 'metal', 0.83, 0.15);
  const oxW = M(0x86513d, 'metal', 0.81, 0.15);
  const oxT = M(0x96674f, 'metal', 0.80, 0.15);   // bleached top faces of flanges
  const oxR = M(0x6f4732, 'metal', 0.90, 0.12);   // members gone to rust
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const galv = M(0x9ea3a1, 'metal', 0.70, 0.55);
  const galvD = M(0x8b9090, 'metal', 0.74, 0.55);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const steelL = M(0x5c5f64, 'metal', 0.76, 0.30);
  const conc = M(0xb8ae9b, 'stone', 0.92, 0.0);
  const concS = M(0x857c6c, 'stone', 0.94, 0.0);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.50, 0.60);   // machined: holds no dust film
  const yel = M(0xc9a227, 'metal', 0.80, 0.15);   // hazard blocks on the toe plates
  const red = M(0x9c4a3c, 'metal', 0.80, 0.15);   // valve handwheel
  const plate = M(0x9c988c, 'metal', 0.80, 0.20); // plated ID panels, junction box
  const pipe = M(0x565a5e, 'metal', 0.75, 0.35);
  const rub = M(0x1d1e20, null, 0.90, 0.0);       // cable: unnamed so surfaces.js skips it

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    // bolt heads (gunmetal, 25 mm and under) are boxes: 12 triangles against 24 and identical at any game distance
    const mm = new THREE.Mesh(mat === gun && r <= 0.025 ? new THREE.BoxGeometry(r * 2.4, len, r * 2.4) : new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  // oriented group from p to q with local y along the member and local z along `up`
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

  const PL = 0.3, Y0 = PL, Y1 = 2.3, Y2 = 4.6, H0 = 4.0;
  const lean = Math.tan(2 * Math.PI / 180);
  const hw = (y) => H0 - (y - Y0) * lean;

  // ---- plinths, base plates with bolts, sand fillets built from wedges on two sides ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * H0, z = sz * H0;
    box(0.6, 0.16, 0.6, conc, x, 0.22, z);
    box(0.62, 0.14, 0.62, concS, x, 0.07, z);
    box(0.5, 0.008, 0.5, dust, x, 0.304, z);
    box(0.46, 0.024, 0.46, ox, x, PL + 0.012, z);
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) cyl(0.02, 0.06, gun, x + bx * 0.18, PL + 0.05, z + bz * 0.18, 'y', 6);
    // double nuts on the anchor bolts, four gusset ribs standing on the plate against the leg (the clamp shoe of the CoD derrick feet)
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) box(0.06, 0.018, 0.06, gun, x + bx * 0.18, PL + 0.038, z + bz * 0.18);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const rb = box(0.012, 0.16, 0.1, oxR, 0, 0, 0); rb.position.set(x + 0.13 * Math.sin(a), PL + 0.104, z + 0.13 * Math.cos(a)); rb.rotation.y = a; }
    box(0.07, 0.14, 0.006, rust, x - 0.18, 0.23, z + sz * 0.305);
    box(0.006, 0.16, 0.07, rust, x + sx * 0.305, 0.22, z + 0.18);
    // sand drifted against the plinth: wedges on the outward faces, mound on the corner
    const wedge = (w, h, d, px, pz, rotY) => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(d, 0); s.lineTo(0, h); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
      const mm = new THREE.Mesh(geo, dust); mm.rotation.y = rotY; mm.position.set(px, 0, pz); g.add(mm);
      // extrude runs along local z; rotate the wedge to lie along the face
      return mm;
    };
    // wedge along the x face (outward on z): profile in (z outward, y), extruded along x
    // rotation.y = -90 sends local x to +z and the extrusion toward -x, so start at +0.45
    wedge(0.9, 0.2, 0.45, x + (sz > 0 ? 0.45 : -0.45), z + sz * 0.31, sz > 0 ? -Math.PI / 2 : Math.PI / 2);
    wedge(0.9, 0.2, 0.45, x + sx * 0.31, z + (sx > 0 ? -0.45 : 0.45), sx > 0 ? 0 : Math.PI);
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.2, 10), dust);
    mound.position.set(x + sx * 0.45, 0.1, z + sz * 0.45); g.add(mound);
  }

  // ---- standpipe up the north west leg, directly under the mid module's pipe: saddle clamps with U bolts,
  //      flange pairs at 0.95 and at deck level, a gate valve with a red handwheel at 1.25 m, a collar plate at the grating ----
  {
    const px = -(hw(Y2) + 0.21), pz = px;
    cyl(0.05, 0.95 - PL, pipe, px, (0.95 + PL) / 2, pz, 'y', 10);
    cyl(0.05, Y2 + 0.15 - 1.55, pipe, px, (Y2 + 0.15 + 1.55) / 2, pz, 'y', 10);
    for (const yy of [0.95, 1.55, Y2 + 0.11]) {
      cyl(0.085, 0.03, pipe, px, yy, pz, 'y', 10); cyl(0.085, 0.03, pipe, px, yy + 0.04, pz, 'y', 10);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(0.01, 0.1, gun, px + 0.068 * Math.cos(a), yy + 0.02, pz + 0.068 * Math.sin(a), 'y', 6); }
      box(0.06, 0.3, 0.006, rust, px, yy - 0.2, pz + 0.052);
    }
    cyl(0.075, 0.5, gun, px, 1.25, pz, 'y', 10);                                   // valve body between the flanges
    const st = frame(V(px, 1.25, pz), V(px + 0.2, 1.25, pz + 0.2));                // bonnet and stem toward the deck centre
    cyl(0.03, 0.14, gun, 0, -st.len / 2 + 0.07, 0, 'y', 8, st.gr);
    cyl(0.014, st.len, steelL, 0, 0, 0, 'y', 6, st.gr);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 6, 12), red); wheel.position.y = st.len / 2 - 0.02; wheel.rotation.x = Math.PI / 2; st.gr.add(wheel);
    for (let k = 0; k < 3; k++) { const sp = box(0.26, 0.016, 0.016, red, 0, st.len / 2 - 0.02, 0, st.gr); sp.rotation.y = k * Math.PI / 3; }
    for (const yy of [0.7, 2.5, 4.1]) {
      const w = hw(yy);
      bar(V(-w - 0.06, yy, -w - 0.06), V(px + 0.03, yy, pz + 0.03), 0.02, 0.1, steel, V(0, 1, 0));
      const u = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 4, 8, Math.PI), gun); u.position.set(px, yy, pz); u.rotation.x = -Math.PI / 2; u.rotation.z = Math.PI / 4; g.add(u);
      box(0.06, 0.28, 0.006, rust, px, yy - 0.2, pz + 0.052);
    }
    box(0.34, 0.02, 0.34, steel, px, Y2 + 0.01, pz);
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) cyl(0.012, 0.03, gun, px + bx * 0.14, Y2 + 0.03, pz + bz * 0.14, 'y', 6);
  }
  // ---- conduit, saddle clamps and a junction box on the south east leg, a rubber cable dropping to the sand ----
  {
    const q1 = V(hw(PL) + 0.2, PL, hw(PL) + 0.2), q2 = V(hw(Y2) + 0.2, Y2 - 0.2, hw(Y2) + 0.2);
    const { gr, len } = frame(q1, q2);
    cyl(0.02, len, galv, 0, 0, 0, 'y', 8, gr);
    for (const t of [0.12, 0.55, 0.9]) { const c = q1.clone().lerp(q2, t); box(0.06, 0.05, 0.24, steel, c.x - 0.09, c.y, c.z); box(0.24, 0.05, 0.06, steel, c.x, c.y, c.z - 0.09); box(0.05, 0.16, 0.006, rust, c.x - 0.09, c.y - 0.1, c.z + 0.123); }
    const cj = q1.clone().lerp(q2, 0.3);
    box(0.22, 0.28, 0.12, plate, cj.x + 0.05, cj.y, cj.z + 0.05);
    box(0.24, 0.03, 0.14, steel, cj.x + 0.05, cj.y + 0.155, cj.z + 0.05);
    box(0.03, 0.06, 0.012, gun, cj.x + 0.05, cj.y - 0.05, cj.z + 0.116);
    box(0.08, 0.3, 0.006, rust, cj.x + 0.05, cj.y - 0.3, cj.z + 0.113);
    cyl(0.012, cj.y - 0.15, rub, cj.x + 0.12, (cj.y - 0.15) / 2, cj.z + 0.12, 'y', 6);
    const cm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.08, 7), dust); cm.position.set(cj.x + 0.12, 0.04, cj.z + 0.12); g.add(cm);
  }

  // ---- legs: I section, web across the diagonal of the tower, flanges 0.16 ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = V(sx * H0, Y0, sz * H0), q = V(sx * hw(Y2 + 0.2), Y2 + 0.2, sz * hw(Y2 + 0.2));
    const { gr, len } = frame(p, q, V(0, 0, sz));
    box(0.012, len, 0.14, ox, 0, 0, 0, gr);                                   // web
    box(0.16, len, 0.014, sz > 0 ? oxS : oxN, 0, 0, 0.073, gr);              // outer flange
    box(0.16, len, 0.014, sz > 0 ? oxN : oxS, 0, 0, -0.073, gr);             // inner flange
    box(0.13, 0.008, 0.06, dust, 0, len / 2 + 0.004, 0, gr);                  // dust on the leg top
    // web stiffeners, rusted, every 1.15 m
    for (let i = 1; i < 4; i++) { box(0.14, 0.012, 0.13, oxT, 0, -len / 2 + i * 1.1, 0, gr); box(0.13, 0.12, 0.006, rust, 0, -len / 2 + i * 1.1 - 0.07, 0.077, gr); }
    box(0.09, 0.22, 0.006, rust, p.x, PL + 0.14, p.z + sz * 0.083);
  }

  // ---- central column: box section under the deck ----
  box(0.2, Y2 - 0.4 - Y0, 0.2, ox, 0, (Y2 - 0.4 + Y0) / 2, 0);
  box(0.32, 0.03, 0.32, ox, 0, Y0 + 0.015, 0);
  box(0.36, 0.03, 0.36, ox, 0, Y2 - 0.4, 0);
  box(0.15, 0.25, 0.006, rust, 0, Y2 - 0.55, 0.103);
  box(0.006, 0.25, 0.15, rust, -0.103, Y2 - 0.55, 0);
  // a plinth for it too
  box(0.6, 0.3, 0.6, concS, 0, 0.15, 0);
  box(0.5, 0.008, 0.5, dust, 0, 0.304, 0);

  // ---- girts, mid bay horizontals, X braces with centre plates ----
  const faceMat = (f) => f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW;
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const horizontal = (y, size, thick, withDust) => {
    const w = hw(y);
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f);
      if (nz) { box(2 * w, size, thick, mat, 0, y, nz * (w + 0.09)); if (withDust) box(2 * w - 0.6, 0.006, thick - 0.01, dust, 0, y + size / 2 + 0.003, nz * (w + 0.09)); }
      else { box(thick, size, 2 * w, mat, nx * (w + 0.09), y, 0); if (withDust) box(thick - 0.01, 0.006, 2 * w - 0.6, dust, nx * (w + 0.09), y + size / 2 + 0.003, 0); }
    }
    return w;
  };
  const gusset = (x, y, z, nx, nz, size, f) => {
    box(nx ? 0.014 : size, size, nz ? 0.014 : size, oxR, x + nx * 0.105, y, z + nz * 0.105);   // gusset plates rust before the members
    const nb = [-0.12, 0.12];   // four corner bolts per gusset; six read no differently at 1.5 m and cost 576 triangles across the module
    for (const u of nb) for (const v of [-0.1, 0.1]) cyl(0.024, 0.03, gun, x + nx * 0.118 + (nz ? u : 0), y + v, z + nz * 0.118 + (nx ? u : 0), nx ? 'x' : 'z', 6);
    // the drip never hangs below the base plane: it used to, and put the whole module 0.1 m high on its plinths
    const dl = Math.min(0.3, Math.max(0, y - size / 2 - 0.02));
    if (dl > 0.05) box(nx ? 0.006 : 0.1, dl, nz ? 0.006 : 0.1, rust, x + nx * 0.115, y - size / 2 - dl / 2, z + nz * 0.115);
  };
  const levels = [Y0 + 0.1, Y1, Y2 - 0.15];
  for (const y of levels) {
    const w = horizontal(y, 0.14, 0.06, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gusset(sx * w, y, sz * w, 0, sz, 0.4, sz > 0 ? 'S' : 'N'); gusset(sx * w, y, sz * w, sx, 0, 0.4, sx > 0 ? 'E' : 'W'); }
  }
  for (let li = 0; li < 2; li++) {
    const y1 = levels[li] + 0.14, y2 = levels[li + 1] - 0.14, ym = (y1 + y2) / 2;
    const w1 = hw(y1), w2 = hw(y2), wm = hw(ym);
    horizontal(ym, 0.08, 0.05, false);
    for (const [f, nx, nz] of faces) {
      const o = 0.12, mat = faceMat(f);
      for (const s of [-1, 1]) {
        let p, q;
        if (nz) { p = V(-s * w1, y1, nz * (w1 + o)); q = V(s * w2, y2, nz * (w2 + o)); }
        else { p = V(nx * (w1 + o), y1, -s * w1); q = V(nx * (w2 + o), y2, s * w2); }
        bar(p, q, 0.075, 0.02, s > 0 ? mat : oxR, V(nx, 0, nz));
      }
      // secondary X in each half bay: lighter flat bar in its own plane, so the lattice reads at every height
      for (const [ya, yb] of [[y1 + 0.05, ym - 0.06], [ym + 0.06, y2 - 0.05]]) {
        const wa = hw(ya), wb = hw(yb), o2 = o - 0.04;
        for (const s of [-1, 1]) {
          let p, q;
          if (nz) { p = V(-s * wa, ya, nz * (wa + o2)); q = V(s * wb, yb, nz * (wb + o2)); }
          else { p = V(nx * (wa + o2), ya, -s * wa); q = V(nx * (wb + o2), yb, s * wb); }
          if (li === 0 && f === 'N' && ya < ym && s > 0) {
            // one secondary brace has torn at its upper bolt and hangs kinked from the lower end, gone to rust
            const k = p.clone().lerp(q, 0.55);
            bar(p, k, 0.05, 0.014, oxR, V(nx, 0, nz));
            bar(k, V(k.x + 0.2, k.y - 0.5, k.z - 0.05), 0.05, 0.014, oxR, V(nx, 0, nz));
            box(0.08, 0.02, 0.03, rust, k.x, k.y, k.z);
          } else bar(p, q, 0.05, 0.014, s > 0 ? oxR : mat, V(nx, 0, nz));
        }
      }
      box(nx ? 0.012 : 0.34, 0.34, nz ? 0.012 : 0.34, oxR, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      for (const u of [-0.1, 0.1]) for (const v of [-0.1, 0.1]) cyl(0.022, 0.03, gun, nx * (wm + o + 0.03) + (nz ? u : 0), ym + v, nz * (wm + o + 0.03) + (nx ? u : 0), nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.08, 0.24, nz ? 0.006 : 0.08, rust, nx * (wm + o + 0.03), ym - 0.29, nz * (wm + o + 0.03));
    }
  }
  // internal diagonals from the column to the leg feet, as the concept shows
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bar(V(sx * 0.12, Y2 - 0.5, sz * 0.12), V(sx * (H0 - 0.25), Y0 + 0.2, sz * (H0 - 0.25)), 0.07, 0.07, ox);
  }

  // ---- deck frame at 4.6: I beams round the edge, joists, knee braces to the legs ----
  const D = 5.0, BY = Y2 - 0.16, wt = hw(Y2);
  const ibeam = (len, along, x, z, mat) => {
    if (along === 'x') { box(len, 0.22, 0.01, mat, x, BY, z); box(len, 0.012, 0.1, oxT, x, BY + 0.105, z); box(len, 0.012, 0.1, mat, x, BY - 0.105, z); }
    else { box(0.01, 0.22, len, mat, x, BY, z); box(0.1, 0.012, len, oxT, x, BY + 0.105, z); box(0.1, 0.012, len, mat, x, BY - 0.105, z); }
  };
  ibeam(2 * D, 'x', 0, D - 0.05, oxS); ibeam(2 * D, 'x', 0, -D + 0.05, oxN);
  ibeam(2 * D - 0.1, 'z', D - 0.05, 0, oxE); ibeam(2 * D - 0.1, 'z', -D + 0.05, 0, oxW);
  for (const z of [-wt, -wt / 2, 0, wt / 2, wt]) ibeam(2 * D - 0.1, 'x', 0, z, ox);
  for (const x of [-wt, wt]) ibeam(2 * D - 0.1, 'z', x, 0, ox);
  for (let i = -4; i <= 4; i++) {
    const u = i * 1.1;
    for (const [, nx, nz] of faces) {
      cyl(0.022, 0.03, gun, nx ? nx * (D - 0.05 + 0.01) : u, BY, nz ? nz * (D - 0.05 + 0.01) : u, nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, nx ? nx * (D - 0.05 + 0.012) : u, BY - 0.1, nz ? nz * (D - 0.05 + 0.012) : u);
    }
  }
  // knee braces from each leg down to the overhanging edge beams
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bar(V(sx * (wt + 0.02), Y2 - 1.1, sz * wt), V(sx * (D - 0.1), BY - 0.12, sz * wt), 0.07, 0.07, sx > 0 ? oxE : oxW, V(0, 0, sz));
    bar(V(sx * wt, Y2 - 1.1, sz * (wt + 0.02)), V(sx * wt, BY - 0.12, sz * (D - 0.1)), 0.07, 0.07, sz > 0 ? oxS : oxN, V(sx, 0, 0));
    box(0.42, 0.024, 0.42, ox, sx * wt, BY - 0.12, sz * wt);
    // bolted end plates where the knee braces meet the overhanging edge beams
    for (const [ex, ez] of [[sx * (D - 0.1), sz * wt], [sx * wt, sz * (D - 0.1)]]) { box(0.2, 0.014, 0.2, oxR, ex, BY - 0.125, ez); cyl(0.02, 0.03, gun, ex + 0.06, BY - 0.14, ez, 'y', 6); cyl(0.02, 0.03, gun, ex - 0.06, BY - 0.14, ez, 'y', 6); box(0.05, 0.12, 0.006, rust, ex, BY - 0.2, ez + 0.1); }
  }

  // ---- deck: dark plate, both ways 0.25 m bar mesh, dust between the bars, kerb angle ----
  box(2 * D - 0.06, 0.012, 2 * D - 0.06, steel, 0, Y2 - 0.05, 0);
  box(2 * D - 0.2, 0.008, 2 * D - 0.2, dust, 0, Y2 - 0.04, 0);
  for (let i = 0; i <= 39; i++) {
    const u = -D + 0.125 + i * 0.25;
    box(2 * D - 0.06, 0.035, 0.018, i % 2 ? galv : galvD, 0, Y2 - 0.018, u);
    if (i % 2) box(0.018, 0.035, 2 * D - 0.06, galvD, u, Y2 - 0.018, 0);   // cross bars at twice the bearing bar pitch, as real bar grating is
  }
  box(2 * D, 0.06, 0.06, galv, 0, Y2 - 0.03, D - 0.03); box(2 * D, 0.06, 0.06, galv, 0, Y2 - 0.03, -D + 0.03);
  box(0.06, 0.06, 2 * D, galv, D - 0.03, Y2 - 0.03, 0); box(0.06, 0.06, 2 * D, galv, -D + 0.03, Y2 - 0.03, 0);

  // ---- handrail: flat bar posts at 1.1 m, tube rails, toe plate, openings W and S ----
  const E = D - 0.05, TOP = 1.1, MID = 0.55;
  const post = (x, z, nx, nz) => {
    box(nx ? 0.012 : 0.06, TOP, nz ? 0.012 : 0.06, steel, x, Y2 + TOP / 2, z);
    box(nx ? 0.012 : 0.1, 0.16, nz ? 0.012 : 0.1, steel, x, Y2 + 0.08, z);
    cyl(0.012, 0.03, gun, x + nx * 0.01, Y2 + 0.11, z + nz * 0.01, nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, x + nx * 0.01, Y2 - 0.08, z + nz * 0.01);
  };
  const side = (along, sgn, gap) => {
    const segs = gap ? [[-E, -0.6], [0.6, E]] : [[-E, E]];
    for (const [a, b] of segs) {
      const len = b - a, c = (a + b) / 2;
      if (along === 'x') {
        cyl(0.025, len, steelL, c, Y2 + TOP, sgn * E, 'x', 8); cyl(0.022, len, steelL, c, Y2 + MID, sgn * E, 'x', 8);
        box(len, 0.15, 0.01, steel, c, Y2 + 0.075, sgn * (E - 0.03));
      } else {
        cyl(0.025, len, steelL, sgn * E, Y2 + TOP, c, 'z', 8); cyl(0.022, len, steelL, sgn * E, Y2 + MID, c, 'z', 8);
        box(0.01, 0.15, len, steel, sgn * (E - 0.03), Y2 + 0.075, c);
      }
      const n = Math.max(1, Math.round(len / 1.1));
      for (let i = 0; i <= n; i++) { const u = a + (len * i) / n; if (along === 'x') post(u, sgn * E, 0, sgn); else post(sgn * E, u, sgn, 0); }
    }
  };
  side('x', 1, true); side('x', -1, false); side('z', 1, false); side('z', -1, true);
  // hazard blocks along the toe plates of the two sides with openings, alternating yellow and gunmetal, 0.4 m each
  for (let i = -12; i < 12; i++) {
    const u = i * 0.4 + 0.2; if (Math.abs(u) < 0.8) continue;
    box(0.38, 0.14, 0.014, i % 2 ? yel : gun, u, Y2 + 0.075, E - 0.018);
    box(0.014, 0.14, 0.38, i % 2 ? gun : yel, -E + 0.018, Y2 + 0.075, u);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, 0.012, 0.08, steel, sx * E, Y2 + TOP + 0.03, sz * E);   // rail corner caps
  // plated ID panels at eye height on the S and W legs (signage as a contrasting plate, never letters)
  { const w = hw(1.6);
    box(0.18, 0.24, 0.008, gun, w, 1.6, w + 0.088); box(0.15, 0.2, 0.012, plate, w, 1.6, w + 0.098); box(0.06, 0.14, 0.005, rust, w, 1.42, w + 0.095);
    box(0.008, 0.24, 0.18, gun, -w - 0.088, 1.6, w); box(0.012, 0.2, 0.15, plate, -w - 0.098, 1.6, w); box(0.005, 0.14, 0.06, rust, -w - 0.095, 1.42, w); }
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
