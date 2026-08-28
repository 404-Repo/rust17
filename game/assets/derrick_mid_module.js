// derrick_mid_module candidate 2: a different reading. I section legs with web
// stiffeners, a horizontal at mid bay so the X braces meet a plate, the deck as four
// framed grating panels with visible seams and a kerb, a chain across the east
// opening as the concept shows, and the standpipe with flanged joints and U bolt
// saddle clamps to the north west leg.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const ox = M(0x8b4530, 'metal', 0.82, 0.15);
  const oxS = M(0x985340, 'metal', 0.79, 0.15);
  const oxN = M(0x7d3d2a, 'metal', 0.85, 0.15);
  const oxE = M(0x864331, 'metal', 0.83, 0.15);
  const oxW = M(0x924e38, 'metal', 0.81, 0.15);
  const oxT = M(0x9d5a45, 'metal', 0.80, 0.15);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const galv = M(0x9ea3a1, 'metal', 0.70, 0.55);
  const galvD = M(0x8b9090, 'metal', 0.74, 0.55);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const steelL = M(0x5c5f64, 'metal', 0.76, 0.30);
  const pipe = M(0x565a5e, 'metal', 0.75, 0.35);
  const pipeS = M(0x5e6266, 'metal', 0.74, 0.35);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
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

  const HT = 5.7, Y2 = 4.6, H0 = 4.0, H1 = 3.25;
  const hw = (y) => H0 - (H0 - H1) * (y / HT);

  // ---- legs: I section, stiffeners, splice plates at the foot ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = V(sx * (H0 - 0.08), 0, sz * (H0 - 0.08)), q = V(sx * (hw(HT) - 0.08), HT, sz * (hw(HT) - 0.08));
    const { gr, len } = frame(p, q, V(0, 0, sz));
    box(0.012, len, 0.14, ox, 0, 0, 0, gr);
    box(0.16, len, 0.014, sz > 0 ? oxS : oxN, 0, 0, 0.073, gr);
    box(0.16, len, 0.014, sz > 0 ? oxN : oxS, 0, 0, -0.073, gr);
    box(0.13, 0.008, 0.06, dust, 0, len / 2 + 0.004, 0, gr);
    for (let i = 1; i < 5; i++) { box(0.14, 0.012, 0.13, oxT, 0, -len / 2 + i * 1.15, 0, gr); box(0.13, 0.12, 0.006, rust, 0, -len / 2 + i * 1.15 - 0.07, 0.077, gr); }
    // splice: cover plates over both flanges, two rows of bolts
    for (const s of [-1, 1]) {
      box(0.18, 0.7, 0.012, s > 0 ? (sz > 0 ? oxS : oxN) : ox, 0, -len / 2 + 0.4, s * 0.086, gr);
      for (const dy of [-0.2, 0.15]) for (const dx of [-0.05, 0.05]) cyl(0.016, 0.03, gun, dx, -len / 2 + 0.4 + dy, s * 0.098, 'z', 6, gr);
    }
    box(0.1, 0.22, 0.006, rust, 0, -len / 2 + 0.08, 0.1, gr);
  }

  // ---- girts, mid bay horizontals, braces ----
  const faceMat = (f) => f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW;
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const horizontal = (y, size, thick, withDust) => {
    const w = hw(y);
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f);
      if (nz) { box(2 * w, size, thick, mat, 0, y, nz * (w + 0.02)); if (withDust) box(2 * w - 0.6, 0.006, thick - 0.01, dust, 0, y + size / 2 + 0.003, nz * (w + 0.02)); }
      else { box(thick, size, 2 * w, mat, nx * (w + 0.02), y, 0); if (withDust) box(thick - 0.01, 0.006, 2 * w - 0.6, dust, nx * (w + 0.02), y + size / 2 + 0.003, 0); }
    }
    return w;
  };
  const gusset = (x, y, z, nx, nz, size, f) => {
    box(nx ? 0.014 : size, size, nz ? 0.014 : size, faceMat(f), x + nx * 0.06, y, z + nz * 0.06);
    for (const u of [-0.12, 0.12]) for (const v of [-0.1, 0.1]) cyl(0.017, 0.03, gun, x + nx * 0.073 + (nz ? u : 0), y + v, z + nz * 0.073 + (nx ? u : 0), nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.1, 0.3, nz ? 0.006 : 0.1, rust, x + nx * 0.07, y - size / 2 - 0.15, z + nz * 0.07);
  };
  const levels = [0.12, 2.3, Y2 - 0.15];
  for (const y of levels) {
    const w = horizontal(y, 0.14, 0.06, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gusset(sx * w, y, sz * w, 0, sz, 0.4, sz > 0 ? 'S' : 'N'); gusset(sx * w, y, sz * w, sx, 0, 0.4, sx > 0 ? 'E' : 'W'); }
  }
  for (let li = 0; li < 2; li++) {
    const y1 = levels[li] + 0.14, y2 = levels[li + 1] - 0.14, ym = (y1 + y2) / 2;
    const w1 = hw(y1), w2 = hw(y2), wm = hw(ym);
    horizontal(ym, 0.08, 0.05, false);
    for (const [f, nx, nz] of faces) {
      const o = 0.05, mat = faceMat(f);
      for (const s of [-1, 1]) {
        let p, q;
        if (nz) { p = V(-s * w1, y1, nz * (w1 + o)); q = V(s * w2, y2, nz * (w2 + o)); }
        else { p = V(nx * (w1 + o), y1, -s * w1); q = V(nx * (w2 + o), y2, s * w2); }
        bar(p, q, 0.075, 0.02, mat, V(nx, 0, nz));
      }
      box(nx ? 0.012 : 0.34, 0.34, nz ? 0.012 : 0.34, mat, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      for (const u of [-0.1, 0.1]) for (const v of [-0.1, 0.1]) cyl(0.016, 0.03, gun, nx * (wm + o + 0.03) + (nz ? u : 0), ym + v, nz * (wm + o + 0.03) + (nx ? u : 0), nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.08, 0.24, nz ? 0.006 : 0.08, rust, nx * (wm + o + 0.03), ym - 0.29, nz * (wm + o + 0.03));
    }
  }

  // ---- deck frame: I beams, joists, and four framed grating panels with seams ----
  const D = 4.0, BY = Y2 - 0.16, wt = hw(Y2);
  const ibeam = (len, along, x, z, mat) => {
    if (along === 'x') { box(len, 0.22, 0.01, mat, x, BY, z); box(len, 0.012, 0.1, oxT, x, BY + 0.105, z); box(len, 0.012, 0.1, mat, x, BY - 0.105, z); }
    else { box(0.01, 0.22, len, mat, x, BY, z); box(0.1, 0.012, len, oxT, x, BY + 0.105, z); box(0.1, 0.012, len, mat, x, BY - 0.105, z); }
  };
  ibeam(2 * D, 'x', 0, D - 0.05, oxS); ibeam(2 * D, 'x', 0, -D + 0.05, oxN);
  ibeam(2 * D - 0.1, 'z', D - 0.05, 0, oxE); ibeam(2 * D - 0.1, 'z', -D + 0.05, 0, oxW);
  for (const z of [-wt, 0, wt]) ibeam(2 * D - 0.1, 'x', 0, z, ox);
  for (const x of [-wt, 0, wt]) ibeam(2 * D - 0.1, 'z', x, 0, ox);
  for (let i = -3; i <= 3; i++) {
    const u = i * 1.1;
    for (const [, nx, nz] of faces) {
      cyl(0.016, 0.03, gun, nx ? nx * (D - 0.04) : u, BY, nz ? nz * (D - 0.04) : u, nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, nx ? nx * (D - 0.038) : u, BY - 0.1, nz ? nz * (D - 0.038) : u);
    }
  }
  for (const px of [-1, 1]) for (const pz of [-1, 1]) {
    const cx = px * D / 2, cz = pz * D / 2, S = D - 0.06;
    // panel frame (flat bar edge), dusted plate, bearing bars along x
    box(S, 0.05, 0.04, galv, cx, Y2 - 0.025, cz + S / 2 - 0.02); box(S, 0.05, 0.04, galv, cx, Y2 - 0.025, cz - S / 2 + 0.02);
    box(0.04, 0.05, S, galv, cx + S / 2 - 0.02, Y2 - 0.025, cz);  box(0.04, 0.05, S, galv, cx - S / 2 + 0.02, Y2 - 0.025, cz);
    box(S - 0.08, 0.012, S - 0.08, steel, cx, Y2 - 0.045, cz);
    box(S - 0.2, 0.008, S - 0.2, dust, cx, Y2 - 0.036, cz);
    for (let i = 1; i < 32; i++) box(S - 0.08, 0.03, 0.018, i % 2 ? galv : galvD, cx, Y2 - 0.015, cz - S / 2 + i * (S / 32));
    for (let i = 1; i < 8; i++) box(0.018, 0.03, S - 0.08, galvD, cx - S / 2 + i * (S / 8), Y2 - 0.015, cz);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.3, 0.1, 0.3, ox, sx * wt, Y2 + 0.02, sz * wt);

  // ---- handrail: flat bar posts, tube rails, toe plate, chain across the east opening ----
  const E = D - 0.05, TOP = 1.1, MID = 0.55;
  const post = (x, z, nx, nz) => {
    box(nx ? 0.012 : 0.06, TOP, nz ? 0.012 : 0.06, steel, x, Y2 + TOP / 2, z);
    box(nx ? 0.012 : 0.1, 0.16, nz ? 0.012 : 0.1, steel, x, Y2 + 0.08, z);
    cyl(0.012, 0.03, gun, x + nx * 0.01, Y2 + 0.11, z + nz * 0.01, nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, x + nx * 0.01, Y2 - 0.08, z + nz * 0.01);
  };
  const side = (along, sgn, gap) => {
    const segs = gap ? [[-E, -0.4], [0.4, E]] : [[-E, E]];
    for (const [a, b] of segs) {
      const len = b - a, c = (a + b) / 2;
      if (along === 'x') { cyl(0.025, len, steelL, c, Y2 + TOP, sgn * E, 'x', 8); cyl(0.022, len, steelL, c, Y2 + MID, sgn * E, 'x', 8); box(len, 0.15, 0.01, steel, c, Y2 + 0.075, sgn * (E - 0.03)); }
      else { cyl(0.025, len, steelL, sgn * E, Y2 + TOP, c, 'z', 8); cyl(0.022, len, steelL, sgn * E, Y2 + MID, c, 'z', 8); box(0.01, 0.15, len, steel, sgn * (E - 0.03), Y2 + 0.075, c); }
      const n = Math.max(1, Math.round(len / 1.1));
      for (let i = 0; i <= n; i++) { const u = a + (len * i) / n; if (along === 'x') post(u, sgn * E, 0, sgn); else post(sgn * E, u, sgn, 0); }
    }
  };
  side('x', 1, false); side('x', -1, false); side('z', 1, true); side('z', -1, false);
  // chain: a sagging run of small tori between the two east opening posts
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, z = -0.4 + 0.8 * t, sag = 0.12 * Math.sin(Math.PI * t);
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 8), gun);
    link.position.set(E, Y2 + TOP - sag, z); link.rotation.y = i % 2 ? 0 : Math.PI / 2; g.add(link);
  }

  // ---- standpipe: flanged pipe clamped with U bolts to the north west leg ----
  {
    const p = V(-(hw(0) - 0.08) - 0.14, 0, -(hw(0) - 0.08) - 0.14), q = V(-(hw(HT) - 0.08) - 0.14, HT, -(hw(HT) - 0.08) - 0.14);
    const { gr, len } = frame(p, q);
    cyl(0.05, len / 2 - 0.02, pipe, 0, -len / 4, 0, 'y', 10, gr);
    cyl(0.05, len / 2 - 0.02, pipeS, 0, len / 4, 0, 'y', 10, gr);
    cyl(0.08, 0.03, pipe, 0, -0.03, 0, 'y', 10, gr); cyl(0.08, 0.03, pipe, 0, 0.03, 0, 'y', 10, gr);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(0.01, 0.09, gun, 0.065 * Math.cos(a), 0, 0.065 * Math.sin(a), 'y', 6, gr); }
    box(0.05, 0.4, 0.006, rust, 0, -0.28, 0.05, gr);
    for (const yy of [0.8, 2.6, 4.3]) {
      const c = p.clone().lerp(q, yy / HT);
      // U bolt round the pipe, into a saddle plate bolted to the leg flange
      const u = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 10, Math.PI), gun);
      u.position.set(c.x, yy, c.z); u.rotation.x = -Math.PI / 2; u.rotation.z = Math.PI / 4; g.add(u);
      box(0.24, 0.1, 0.02, steel, c.x + 0.04, yy, c.z + 0.075);
      box(0.02, 0.1, 0.24, steel, c.x + 0.075, yy, c.z + 0.04);
      box(0.08, 0.3, 0.006, rust, c.x, yy - 0.2, c.z + 0.086);
      box(0.006, 0.3, 0.08, rust, c.x + 0.086, yy - 0.2, c.z);
    }
  }

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
