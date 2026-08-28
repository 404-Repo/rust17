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
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const gunL = M(0x45494d, 'metal', 0.68, 0.60);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const lens = M(0xc9a227, null, 0.5, 0.0, false, 0xffd9a0);

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

  const YT = 7.5, H0 = 3.25, H1 = 1.25;
  const hw = (y) => H0 - (H0 - H1) * (y / YT);

  // ---- legs: box section 0.16 in two bands, splice collars with bolts at 0.3 and 5.0 ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (const [ya, yb, matA] of [[0, 5.0, sz > 0 ? oxS : oxN], [5.0, YT + 0.1, sz > 0 ? oxBS : oxB]]) {
      const p = V(sx * (hw(ya) - 0.08), ya, sz * (hw(ya) - 0.08)), q = V(sx * (hw(yb) - 0.08), yb, sz * (hw(yb) - 0.08));
      const { gr, len } = frame(p, q, V(0, 0, sz));
      box(0.16, len, 0.16, matA, 0, 0, 0, gr);
      box(0.17, len, 0.01, sz > 0 ? oxN : oxS, 0, 0, -0.08, gr);   // shaded inner face
    }
    for (const yy of [0.3, 5.0]) {
      const c = V(sx * (hw(yy) - 0.08), yy, sz * (hw(yy) - 0.08));
      box(0.22, 0.4, 0.22, yy > 4 ? oxB : ox, c.x, c.y, c.z);
      for (const [nx, nz] of [[sx, 0], [0, sz]]) for (const dy of [-0.12, 0, 0.12]) cyl(0.018, 0.03, gun, c.x + nx * 0.115, yy + dy, c.z + nz * 0.115, nx ? 'x' : 'z', 6);
      box(sx ? 0.006 : 0.1, 0.25, 0.1, rust, c.x + sx * 0.113, yy - 0.32, c.z);
      box(0.1, 0.25, 0.006, rust, c.x, yy - 0.32, c.z + sz * 0.113);
    }
    box(0.14, 0.008, 0.14, dust, sx * (hw(YT + 0.1) - 0.08), YT + 0.104, sz * (hw(YT + 0.1) - 0.08));
  }

  // ---- diamonds: girts at 0, 1.85, 3.7, 5.55, 7.4 and X braces between, plates at crossings ----
  const faceMat = (f, y) => y > 5 ? (f === 'S' ? oxBS : oxB) : (f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW);
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const levels = [0.12, 1.95, 3.7, 5.55, YT - 0.1];
  for (const y of levels) {
    const w = hw(y);
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f, y);
      if (nz) { box(2 * w, 0.1, 0.05, mat, 0, y, nz * (w + 0.03)); box(2 * w - 0.5, 0.006, 0.04, dust, 0, y + 0.053, nz * (w + 0.03)); }
      else { box(0.05, 0.1, 2 * w, mat, nx * (w + 0.03), y, 0); box(0.04, 0.006, 2 * w - 0.5, dust, nx * (w + 0.03), y + 0.053, 0); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const [nx, nz, f] of [[0, sz, sz > 0 ? 'S' : 'N'], [sx, 0, sx > 0 ? 'E' : 'W']]) {
        box(nx ? 0.012 : 0.3, 0.26, nz ? 0.012 : 0.3, faceMat(f, y), sx * w + nx * 0.06, y, sz * w + nz * 0.06);
        for (const u of [-0.1, 0.1]) for (const v of [-0.07, 0.07]) cyl(0.016, 0.03, gun, sx * w + nx * 0.075 + (nz ? u : 0), y + v, sz * w + nz * 0.075 + (nx ? u : 0), nx ? 'x' : 'z', 6);
        box(nx ? 0.006 : 0.08, 0.25, nz ? 0.006 : 0.08, rust, sx * w + nx * 0.07, y - 0.26, sz * w + nz * 0.07);
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
        bar(p, q, 0.07, 0.02, s > 0 ? mat : oxR, V(nx, 0, nz));
      }
      box(nx ? 0.012 : 0.22, 0.22, nz ? 0.012 : 0.22, mat, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      cyl(0.015, 0.03, gun, nx * (wm + o + 0.03), ym, nz * (wm + o + 0.03), nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.18, nz ? 0.006 : 0.05, rust, nx * (wm + o + 0.03), ym - 0.2, nz * (wm + o + 0.03));
    }
  }

  // ---- crown block: two deep I beams on edge 0.9 m tall, end ties, the sheaves stand proud ----
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
    for (const x of [-0.85, -0.3, 0.3, 0.85]) { cyl(0.018, 0.03, gun, x, BY0 + PH - 0.1, zc + sz * 0.012, 'z', 6); cyl(0.018, 0.03, gun, x, BY0 + 0.12, zc + sz * 0.012, 'z', 6); }
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
