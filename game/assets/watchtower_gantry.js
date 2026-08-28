// watchtower_gantry candidate 2: a different reading. Heavier I section legs, a deep
// fascia plate round the deck with rust running down it as in the concept, the deck
// as a 0.25 m both ways bar mesh over a dark plate, infill panels in two courses of
// corrugated sheet built as rows of half round ribs on a plate, canopy the same way,
// a boxed floodlight with a hood, cage hoops as octagons of flat bar, the ladder up
// the outside of the south face reaching a hatch through the fascia.
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
  const oxT = M(0x96674f, 'metal', 0.80, 0.15);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const galv = M(0x9ea3a1, 'metal', 0.70, 0.55, true);
  const galvS = M(0xaaafad, 'metal', 0.68, 0.55, true);
  const galvD = M(0x8b9090, 'metal', 0.74, 0.55, true);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const steelL = M(0x5c5f64, 'metal', 0.76, 0.30);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
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
  // corrugated as geometry: a thin plate with a half round rib every 76 mm, 6 segment cylinders
  const ribbed = (w, h, mat, parent) => {
    const gr = new THREE.Group();
    box(w, h, 0.006, mat, 0, 0, 0, gr);
    const n = Math.floor(w / 0.076);
    for (let i = 0; i < n; i++) { const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, h, 6, 1, true), mat); rb.position.set(-w / 2 + 0.038 + i * 0.076, 0, 0.006); gr.add(rb); }
    (parent || g).add(gr); return gr;
  };

  const H = 1.5, Y2 = 4.6, w = H - 0.08;

  // ---- feet: base plates with bolts, sand wedges and a mound ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * w, z = sz * w;
    box(0.34, 0.024, 0.34, ox, x, 0.012, z);
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) cyl(0.014, 0.05, gun, x + bx * 0.13, 0.04, z + bz * 0.13, 'y', 6);
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.16, 10), dust); mound.position.set(x - sx * 0.16, 0.08, z - sz * 0.16); g.add(mound);
    const m2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.1, 8), dust); m2.position.set(x - sx * 0.25, 0.05, z - sz * 0.2); g.add(m2);
    box(0.08, 0.2, 0.006, rust, x, 0.15, z + sz * 0.083);
  }

  // ---- legs: I section with stiffeners ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const { gr, len } = frame(V(sx * w, 0.024, sz * w), V(sx * w, Y2, sz * w), V(0, 0, sz));
    box(0.01, len, 0.13, ox, 0, 0, 0, gr);
    box(0.16, len, 0.012, sz > 0 ? oxS : oxN, 0, 0, 0.07, gr);
    box(0.16, len, 0.012, sz > 0 ? oxN : oxS, 0, 0, -0.07, gr);
    for (let i = 1; i < 4; i++) { box(0.14, 0.01, 0.12, oxT, 0, -len / 2 + i * 1.15, 0, gr); box(0.12, 0.1, 0.005, rust, 0, -len / 2 + i * 1.15 - 0.06, 0.077, gr); }
  }

  // ---- girts, X bracing with plates ----
  const faceMat = (f) => f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW;
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const levels = [0.14, 1.5, 3.0];
  for (const y of levels) {
    for (const [f, nx, nz] of faces) {
      if (nz) { box(2 * w, 0.1, 0.05, faceMat(f), 0, y, nz * (w + 0.1)); box(2 * w - 0.4, 0.005, 0.04, dust, 0, y + 0.053, nz * (w + 0.1)); }
      else { box(0.05, 0.1, 2 * w, faceMat(f), nx * (w + 0.1), y, 0); box(0.04, 0.005, 2 * w - 0.4, dust, nx * (w + 0.1), y + 0.053, 0); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [nx, nz, f] of [[0, sz, sz > 0 ? 'S' : 'N'], [sx, 0, sx > 0 ? 'E' : 'W']]) {
      box(nx ? 0.012 : 0.26, 0.24, nz ? 0.012 : 0.26, faceMat(f), sx * w + nx * 0.085, y, sz * w + nz * 0.085);
      for (const u of [-0.08, 0.08]) for (const v of [-0.07, 0.07]) cyl(0.013, 0.025, gun, sx * w + nx * 0.095 + (nz ? u : 0), y + v, sz * w + nz * 0.095 + (nx ? u : 0), nx ? 'x' : 'z', 6);
      box(nx ? 0.005 : 0.07, 0.22, nz ? 0.005 : 0.07, rust, sx * w + nx * 0.093, y - 0.23, sz * w + nz * 0.093);
    }
  }
  const bays = [[0.14, 1.5], [1.5, 3.0], [3.0, Y2 - 0.2]];
  for (const [ya, yb] of bays) {
    const y1 = ya + 0.08, y2 = yb - 0.08, ym = (y1 + y2) / 2, o = 0.13;
    for (const [f, nx, nz] of faces) {
      for (const s of [-1, 1]) {
        let p, q;
        if (nz) { p = V(-s * w, y1, nz * (w + o)); q = V(s * w, y2, nz * (w + o)); }
        else { p = V(nx * (w + o), y1, -s * w); q = V(nx * (w + o), y2, s * w); }
        bar(p, q, 0.06, 0.016, faceMat(f), V(nx, 0, nz));
      }
      box(nx ? 0.012 : 0.2, 0.2, nz ? 0.012 : 0.2, faceMat(f), nx * (w + o + 0.015), ym, nz * (w + o + 0.015));
      cyl(0.012, 0.025, gun, nx * (w + o + 0.025), ym, nz * (w + o + 0.025), nx ? 'x' : 'z', 6);
      box(nx ? 0.005 : 0.05, 0.15, nz ? 0.005 : 0.05, rust, nx * (w + o + 0.024), ym - 0.18, nz * (w + o + 0.024));
    }
  }

  // ---- deck: deep fascia plate all round with rust runs, joists, bar mesh ----
  const D = H, FY = Y2 - 0.2, FH = 0.4;
  for (const [f, nx, nz] of faces) {
    if (nz) { box(2 * D, FH, 0.02, faceMat(f), 0, FY, nz * (D - 0.01)); for (let i = -2; i <= 2; i++) { cyl(0.012, 0.025, gun, i * 0.6, FY + 0.15, nz * (D + 0.005), 'z', 6); box(0.05, 0.25 + 0.05 * (i % 2), 0.005, rust, i * 0.6, FY - 0.02, nz * (D + 0.004)); } }
    else { box(0.02, FH, 2 * D, faceMat(f), nx * (D - 0.01), FY, 0); for (let i = -2; i <= 2; i++) { cyl(0.012, 0.025, gun, nx * (D + 0.005), FY + 0.15, i * 0.6, 'x', 6); box(0.005, 0.25 + 0.05 * (i % 2), 0.05, rust, nx * (D + 0.004), FY - 0.02, i * 0.6); } }
  }
  for (const [f, nx, nz] of faces) { if (nz) box(2 * D, 0.03, 0.08, faceMat(f), 0, FY - FH / 2, nz * (D - 0.04)); else box(0.08, 0.03, 2 * D, faceMat(f), nx * (D - 0.04), FY - FH / 2, 0); }
  for (const z of [-0.75, 0, 0.75]) box(2 * D - 0.06, 0.12, 0.05, ox, 0, Y2 - 0.12, z);
  const HX0 = -0.4, HX1 = 0.4, HZ0 = D - 0.95, HZ1 = D - 0.1;
  const plate = (x0, x1, z0, z1) => { box(x1 - x0, 0.01, z1 - z0, steel, (x0 + x1) / 2, Y2 - 0.045, (z0 + z1) / 2); box(x1 - x0 - 0.05, 0.006, z1 - z0 - 0.05, dust, (x0 + x1) / 2, Y2 - 0.037, (z0 + z1) / 2); };
  plate(-D + 0.02, D - 0.02, -D + 0.02, HZ0); plate(-D + 0.02, HX0, HZ0, D - 0.02); plate(HX1, D - 0.02, HZ0, D - 0.02); plate(HX0, HX1, HZ1, D - 0.02);
  for (let i = 0; i <= 11; i++) {
    const u = -D + 0.125 + i * 0.25;
    if (u > HZ0 && u < HZ1) { box(HX0 + D - 0.04, 0.03, 0.016, galv, (-D + HX0) / 2, Y2 - 0.015, u); box(D - HX1 - 0.04, 0.03, 0.016, galv, (D + HX1) / 2, Y2 - 0.015, u); }
    else box(2 * D - 0.04, 0.03, 0.016, galv, 0, Y2 - 0.015, u);
    if (u > HX0 && u < HX1) box(0.016, 0.03, HZ0 + D - 0.04, galvD, u, Y2 - 0.015, (HZ0 - D) / 2); else box(0.016, 0.03, 2 * D - 0.04, galvD, u, Y2 - 0.015, 0);
  }
  box(HX1 - HX0 + 0.08, 0.1, 0.03, galv, 0, Y2 + 0.03, HZ0 - 0.015); box(0.03, 0.1, HZ1 - HZ0, galv, HX0 - 0.015, Y2 + 0.03, (HZ0 + HZ1) / 2); box(0.03, 0.1, HZ1 - HZ0, galv, HX1 + 0.015, Y2 + 0.03, (HZ0 + HZ1) / 2);

  // ---- handrail, flat bar posts, infill in two courses on N, E, W ----
  const E = D - 0.05, TOP = 1.1;
  const post = (x, z, nx, nz) => { box(nx ? 0.012 : 0.05, TOP, nz ? 0.012 : 0.05, steel, x, Y2 + TOP / 2, z); box(nx ? 0.012 : 0.09, 0.14, nz ? 0.012 : 0.09, steel, x, Y2 + 0.07, z); cyl(0.01, 0.025, gun, x + nx * 0.01, Y2 + 0.1, z + nz * 0.01, nx ? 'x' : 'z', 6); };
  for (const [f, nx, nz] of faces) {
    const segs = f === 'S' ? [[-E, -0.45], [0.45, E]] : [[-E, E]];
    for (const [a, b] of segs) {
      const len = b - a, c = (a + b) / 2;
      if (nz) { cyl(0.02, len, steelL, c, Y2 + TOP, nz * E, 'x', 8); cyl(0.018, len, steelL, c, Y2 + 0.55, nz * E, 'x', 8); box(len, 0.12, 0.01, steel, c, Y2 + 0.06, nz * E); }
      else { cyl(0.02, len, steelL, nx * E, Y2 + TOP, c, 'z', 8); cyl(0.018, len, steelL, nx * E, Y2 + 0.55, c, 'z', 8); box(0.01, 0.12, len, steel, nx * E, Y2 + 0.06, c); }
      const n = Math.max(1, Math.round(len / 0.75));
      for (let i = 0; i <= n; i++) { const u = a + (len * i) / n; if (nz) post(u, nz * E, 0, nz); else post(nx * E, u, nx, 0); }
    }
    if (f !== 'S') {
      for (let k = 0; k < 4; k++) for (const [cy, ch] of [[Y2 + 0.36, 0.45], [Y2 + 0.8, 0.42]]) {
        const u = -1.08 + k * 0.72;
        const pnl = ribbed(0.68, ch, (k + (cy > Y2 + 0.5 ? 1 : 0)) % 2 ? galvS : galv);
        if (nz) { pnl.rotation.y = nz > 0 ? 0 : Math.PI; pnl.position.set(u, cy, nz * (E - 0.03)); }
        else { pnl.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2; pnl.position.set(nx * (E - 0.03), cy, u); }
        box(nz ? 0.03 : 0.004, 0.08, nz ? 0.004 : 0.03, rust, nz ? u : nx * (E - 0.035), cy - 0.2, nz ? nz * (E - 0.035) : u);
      }
    }
  }

  // ---- canopy: square posts, ribbed sheet, 5 degree slope to 7.0, hood floodlight ----
  const CY = 7.0, tilt = 5 * Math.PI / 180, CW = 3.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const ph = CY - 0.08 - sz * (CW / 2) * Math.sin(tilt) - Y2;
    box(0.06, ph, 0.06, steel, sx * (E - 0.02), Y2 + ph / 2, sz * (E - 0.02));
    box(0.1, 0.012, 0.1, steel, sx * (E - 0.02), Y2 + 0.006, sz * (E - 0.02));
    box(0.05, 0.16, 0.005, rust, sx * (E - 0.02), Y2 + 0.14, sz * (E - 0.02) + 0.033);
  }
  const can = new THREE.Group(); can.position.set(0, CY - 0.05, 0); can.rotation.x = tilt; g.add(can);
  const sheet = ribbed(CW, CW, galv, can); sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.02;
  box(CW - 0.3, 0.006, CW - 0.5, dust, 0, 0.045, 0, can);
  for (const z of [-1.2, 0, 1.2]) box(CW - 0.1, 0.06, 0.04, steel, 0, -0.01, z, can);
  for (const x of [-E + 0.02, E - 0.02]) box(0.06, 0.05, CW - 0.2, steel, x, -0.015, 0, can);
  for (let i = 0; i < 6; i++) for (const z of [-1.2, 0, 1.2]) cyl(0.008, 0.02, gun, -1.35 + i * 0.54, 0.05, z, 'y', 5, can);
  const fl = new THREE.Group(); fl.position.set(E - 0.35, CY - 0.45, E - 0.25); fl.rotation.x = 0.7; g.add(fl);
  box(0.35, 0.22, 0.16, steel, 0, 0, 0, fl);
  box(0.3, 0.16, 0.012, lens, 0, 0, 0.083, fl);
  box(0.37, 0.02, 0.2, steel, 0, 0.12, 0.02, fl);          // hood
  box(0.02, 0.24, 0.2, steel, -0.185, 0, 0.02, fl); box(0.02, 0.24, 0.2, steel, 0.185, 0, 0.02, fl);
  box(0.03, 0.3, 0.03, steel, E - 0.35, CY - 0.25, E - 0.12);
  box(0.06, 0.03, 0.2, steel, E - 0.35, CY - 0.1, E - 0.12);
  box(0.03, 0.14, 0.005, rust, E - 0.35, CY - 0.55, E - 0.11);

  // ---- caged ladder inside the south face, octagonal flat bar hoops ----
  const LZ = D - 0.3;
  for (const sx of [-1, 1]) cyl(0.03, Y2 + 1.0, galv, sx * 0.225, (Y2 + 1.0) / 2, LZ, 'y', 8);
  for (let i = 1; i <= 15; i++) cyl(0.014, 0.42, galvD, 0, i * 0.3, LZ, 'x', 6);
  for (const y of [0.7, 1.7, 2.7, 3.7]) for (const sx of [-1, 1]) { box(0.04, 0.04, 0.24, steel, sx * 0.225, y, LZ + 0.1); box(0.1, 0.1, 0.012, steel, sx * 0.225, y, LZ + 0.22); box(0.06, 0.16, 0.005, rust, sx * 0.225, y - 0.13, LZ + 0.23); }
  for (let k = 0; k < 4; k++) {
    const y = 2.2 + k * 0.78;
    for (let s = 0; s < 4; s++) {
      const a0 = Math.PI * s / 4, a1 = Math.PI * (s + 1) / 4;
      bar(V(0.36 * Math.cos(a0), y, LZ - 0.27 * Math.sin(a0)), V(0.36 * Math.cos(a1), y, LZ - 0.27 * Math.sin(a1)), 0.03, 0.01, galv, V(0, 1, 0));
    }
  }
  for (const a of [Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6]) box(0.03, 2.5, 0.01, galvD, 0.36 * Math.cos(a), 2.2 + 1.25, LZ - 0.27 * Math.sin(a));
  cyl(0.03, 0.4, galv, 0, Y2 + 1.0, LZ - 0.2, 'z', 8); cyl(0.03, 0.42, galv, 0, Y2 + 1.0, LZ, 'x', 8);
  const mound = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.1, 8), dust); mound.position.set(0, 0.05, LZ); g.add(mound);

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
