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
  const gun = M(0x3a3d40, 'metal', 0.50, 0.60);   // machined: holds no dust film
  const oxR = M(0x6f4732, 'metal', 0.90, 0.12);   // plates gone to rust
  const lens = M(0xc9a227, null, 0.5, 0.0, false, 0xffd9a0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    // bolt heads (gunmetal, under 20 mm) are boxes: 12 triangles against 24, and identical at any game distance
    const mm = new THREE.Mesh(mat === gun && r <= 0.02 ? new THREE.BoxGeometry(r * 2.6, len, r * 2.6) : new THREE.CylinderGeometry(r, r, len, seg || 6), mat);
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
  const ribbed = (w, h, mat, parent, both) => {
    const gr = new THREE.Group();
    box(w, h, 0.006, mat, 0, 0, 0, gr);
    const n = Math.floor(w / 0.076);
    for (let i = 0; i < n; i++) {
      const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, h, 3, 1, true, -Math.PI / 2, Math.PI), mat); rb.position.set(-w / 2 + 0.038 + i * 0.076, 0, 0.004); gr.add(rb);
      // the canopy is seen from below far more than from above: ribs on the underside too, so it is corrugated sheet and not a dark plate
      if (both) { const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, h, 3, 1, true, Math.PI / 2, Math.PI), mat); rb2.position.set(-w / 2 + 0.038 + i * 0.076, 0, -0.004); gr.add(rb2); }
    }
    (parent || g).add(gr); return gr;
  };

  const H = 1.5, Y2 = 4.6, w = H - 0.08;

  // ---- feet: base plates with bolts, sand wedges and a mound ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * w, z = sz * w;
    box(0.34, 0.024, 0.34, ox, x, 0.012, z);
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) cyl(0.014, 0.05, gun, x + bx * 0.13, 0.04, z + bz * 0.13, 'y', 6);
    const mound = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.16, 7), dust); mound.position.set(x - sx * 0.16, 0.08, z - sz * 0.16); g.add(mound);
    const m2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.1, 6), dust); m2.position.set(x - sx * 0.25, 0.05, z - sz * 0.2); g.add(m2);
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
      box(nx ? 0.012 : 0.26, 0.24, nz ? 0.012 : 0.26, oxR, sx * w + nx * 0.085, y, sz * w + nz * 0.085);
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
      box(nx ? 0.012 : 0.2, 0.2, nz ? 0.012 : 0.2, oxR, nx * (w + o + 0.015), ym, nz * (w + o + 0.015));
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
  const sheet = ribbed(CW, CW, galv, can, true); sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.02;
  box(CW - 0.3, 0.006, CW - 0.5, dust, 0, 0.045, 0, can);
  // one corner sheet has lifted in the wind: a short ribbed piece hinged up 28 degrees off the south east corner, rust along its torn edge
  const lift = new THREE.Group(); lift.position.set(CW / 2 - 0.42, 0.03, CW / 2 - 0.02); lift.rotation.x = -0.49; can.add(lift);
  const ls = ribbed(0.84, 0.55, galvS, lift); ls.rotation.x = -Math.PI / 2; ls.position.set(0, 0.0, -0.275);
  box(0.84, 0.012, 0.02, rust, 0, 0.004, 0, lift);
  box(0.84, 0.03, 0.012, rust, CW / 2 - 0.42, 0.0, CW / 2 - 0.02, can);
  for (const x of [-1.2, -0.4, 0.4]) box(0.05, 0.012, 0.5, rust, x, -0.045, 0.6, can);
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
  for (let i = 1; i <= 15; i++) cyl(0.014, 0.42, galvD, 0, i * 0.3, LZ, 'x', 4);
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
  const mound = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.1, 6), dust); mound.position.set(0, 0.05, LZ); g.add(mound);
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
