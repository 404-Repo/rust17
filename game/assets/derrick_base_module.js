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
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
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
    box(nx ? 0.014 : size, size, nz ? 0.014 : size, faceMat(f), x + nx * 0.105, y, z + nz * 0.105);
    const nb = size > 0.3 ? [-0.12, 0, 0.12] : [-0.07, 0.07];
    for (const u of nb) for (const v of [-0.1, 0.1]) cyl(0.017, 0.03, gun, x + nx * 0.118 + (nz ? u : 0), y + v, z + nz * 0.118 + (nx ? u : 0), nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.1, 0.3, nz ? 0.006 : 0.1, rust, x + nx * 0.115, y - size / 2 - 0.15, z + nz * 0.115);
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
          bar(p, q, 0.05, 0.014, s > 0 ? oxR : mat, V(nx, 0, nz));
        }
      }
      box(nx ? 0.012 : 0.34, 0.34, nz ? 0.012 : 0.34, mat, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      for (const u of [-0.1, 0.1]) for (const v of [-0.1, 0.1]) cyl(0.016, 0.03, gun, nx * (wm + o + 0.03) + (nz ? u : 0), ym + v, nz * (wm + o + 0.03) + (nx ? u : 0), nx ? 'x' : 'z', 6);
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
      cyl(0.016, 0.03, gun, nx ? nx * (D - 0.05 + 0.01) : u, BY, nz ? nz * (D - 0.05 + 0.01) : u, nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, nx ? nx * (D - 0.05 + 0.012) : u, BY - 0.1, nz ? nz * (D - 0.05 + 0.012) : u);
    }
  }
  // knee braces from each leg down to the overhanging edge beams
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    bar(V(sx * (wt + 0.02), Y2 - 1.1, sz * wt), V(sx * (D - 0.1), BY - 0.12, sz * wt), 0.07, 0.07, sx > 0 ? oxE : oxW, V(0, 0, sz));
    bar(V(sx * wt, Y2 - 1.1, sz * (wt + 0.02)), V(sx * wt, BY - 0.12, sz * (D - 0.1)), 0.07, 0.07, sz > 0 ? oxS : oxN, V(sx, 0, 0));
    box(0.42, 0.024, 0.42, ox, sx * wt, BY - 0.12, sz * wt);
  }

  // ---- deck: dark plate, both ways 0.25 m bar mesh, dust between the bars, kerb angle ----
  box(2 * D - 0.06, 0.012, 2 * D - 0.06, steel, 0, Y2 - 0.05, 0);
  box(2 * D - 0.2, 0.008, 2 * D - 0.2, dust, 0, Y2 - 0.04, 0);
  for (let i = 0; i <= 39; i++) {
    const u = -D + 0.125 + i * 0.25;
    box(2 * D - 0.06, 0.035, 0.018, i % 2 ? galv : galvD, 0, Y2 - 0.018, u);
    box(0.018, 0.035, 2 * D - 0.06, i % 2 ? galvD : galv, u, Y2 - 0.018, 0);
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
