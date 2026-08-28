// oil_storage_tank_open candidate 2: read from the concept. The shell is six curved
// plates per course with alternating lap radius and rivet rows on every seam, the
// south cut is a doorway and the north east cut a narrower doorway, the walkway
// ring is torn away over the south cut with a bent post and hanging rail stubs, and
// the roof is eight panels with the rafters showing from inside. Plate gussets.
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
  const YEL = 0xc9a227, CONC = 0x857c6c;
  const rust = M(RUST, 'metal', 0.9, 0.1, true);
  const galv = M(GALV, 'metal', 0.75, 0.55, true);
  const galvD = M(tint(GALV, 0.86), 'metal', 0.8, 0.5, true);
  const steel = M(STEEL, 'metal', 0.8, 0.3, true);
  const steelL = M(tint(STEEL, 1.1), 'metal', 0.78, 0.3);
  const strip = M(tint(TANK, 0.8), 'metal', 0.85, 0.2, true);
  const inner = M(tint(TANK, 0.68), 'metal', 0.88, 0.15, true);
  const stain = M(0x585248, 'metal', 0.92, 0.1, true);
  const yel = M(YEL, 'metal', 0.7, 0.15);
  const yelD = M(tint(YEL, 0.92), 'metal', 0.72, 0.15);
  const sand = M(SAND, 'ground', 0.95, 0.0);
  const sandP = M(0xa89372, 'ground', 0.95, 0.0);
  const conc = M(CONC, 'stone', 0.92, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);

  const R = 3.2, RW = 4.0, H = 4.6, C = 0.92;
  const bx = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const swing = (theta, parent) => { const s = new THREE.Group(); s.rotation.y = theta; (parent || g).add(s); return s; };
  const arc = (rr, y0, y1, th0, thLen, mat) => {
    const seg = Math.max(2, Math.round(thLen * 30 / (2 * Math.PI)));
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, y1 - y0, seg, 1, true, th0, thLen), mat);
    mm.position.y = (y0 + y1) / 2; g.add(mm); return mm;
  };
  const rivet = (th, y, rr, parent) => { const s = swing(th, parent); bx(0.045, 0.045, 0.028, steelL, 0, y, rr + 0.012, s); };
  // cuts: [centre, half angle, bottom, top]
  const cuts = [[0, 1.2 / R, 0, 2.0], [3 * Math.PI / 4, 0.6 / R, 0, 2.0]];
  const minus = (a, b, y0, y1) => {
    let list = [[a, b]];
    for (const [cth, ha, bot, top] of cuts) {
      if (y0 >= top || y1 <= bot) continue;
      const out = [];
      for (const [p, q] of list) {
        const lo = cth - ha, hi = cth + ha;
        if (hi <= p || lo >= q) { out.push([p, q]); continue; }
        if (lo > p) out.push([p, lo]);
        if (hi < q) out.push([hi, q]);
      }
      list = out;
    }
    return list;
  };
  const inCut = (th, y) => cuts.some(([c, ha, bot, top]) => y < top && y > bot && Math.abs(((th - c + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) < ha + 0.03);
  // split y range at every cut edge that crosses it
  const ySplits = (y0, y1) => {
    const ys = [y0, y1];
    for (const [, , bot, top] of cuts) for (const yy of [bot, top]) if (yy > y0 && yy < y1) ys.push(yy);
    ys.sort((a, b) => a - b);
    const out = []; for (let i = 0; i + 1 < ys.length; i++) out.push([ys[i], ys[i + 1]]); return out;
  };

  // ---- five courses of six plates, alternating lap radius, liner inside ----------
  const courseTint = [0.8, 0.9, 1.0, 1.07, 1.14];
  const A = Math.PI / 3;
  for (let i = 0; i < 5; i++) {
    const base = tint(TANK, courseTint[i]);
    for (let k = 0; k < 6; k++) {
      const th0 = k * A - Math.PI / 6 - A / 2 + 0.01, mid = th0 + A / 2;
      const sun = Math.cos(mid) > 0.2 ? 1.07 : Math.cos(mid) < -0.2 ? 1.0 : 1.035;
      const rr = R + ((i + k) % 2 ? 0.025 : 0);
      const mat = M(tint(base, sun * (1 + 0.01 * (k % 3))), 'metal', 0.85, 0.2, true);
      for (const [y0, y1] of ySplits(i * C, (i + 1) * C)) for (const [p, q] of minus(th0, th0 + A - 0.02, y0, y1)) {
        arc(rr, y0, y1, p, q - p, mat);
        arc(rr - 0.05, y0, y1, p, q - p, inner);
      }
    }
    if (i < 4) {
      for (const [p, q] of minus(0, Math.PI * 2, (i + 1) * C - 0.05, (i + 1) * C + 0.05)) {
        arc(R + 0.04, (i + 1) * C - 0.05, (i + 1) * C + 0.05, p, q - p, strip);
        arc(R - 0.08, (i + 1) * C - 0.04, (i + 1) * C + 0.04, p, q - p, strip);
      }
      for (let k = 0; k < 28; k++) { const th = k * Math.PI / 14 + i * 0.04; if (!inCut(th, (i + 1) * C)) { rivet(th, (i + 1) * C, R + 0.04); } }
      for (let k = 0; k < 24; k++) { const th = k * Math.PI / 12 + i * 0.06; if (!inCut(th, (i + 1) * C)) { const s = swing(th); bx(0.04, 0.04, 0.025, steelL, 0, (i + 1) * C, R - 0.095, s); } }
      for (let k = 0; k < 10; k++) {
        const th = k * Math.PI / 5 + i * 0.3;
        if (inCut(th, (i + 1) * C - 0.2)) continue;
        const s = swing(th);
        bx(0.05, 0.14 + 0.06 * (k % 3), 0.006, rust, 0, (i + 1) * C - 0.14, R + ((i + k) % 2 ? 0.025 : 0) + 0.006, s);
      }
    }
  }
  for (let k = 0; k < 6; k++) {
    const th = k * A - Math.PI / 6 - A / 2;
    const s = swing(th);
    for (let i = 0; i < 5; i++) {
      if (inCut(th, i * C + 0.46)) continue;
      bx(0.16, C - 0.12, 0.03, strip, 0, i * C + C / 2, R + 0.02, s);
      bx(0.07, 0.25, 0.006, rust, 0.02, i * C + 0.28, R + 0.04, s);
      bx(0.06, 0.22, 0.006, rust, -0.02, i * C + 0.3, R - 0.058, s);
    }
    for (let i = 0; i < 16; i++) { const y = 0.12 + i * 0.29; if (!inCut(th, y)) { rivet(th + 0.014, y, R + 0.03); rivet(th - 0.014, y, R + 0.03); } }
  }
  for (const [p, q] of minus(0, Math.PI * 2, 0.02, 0.42)) arc(R - 0.06, 0.02, 0.42, p, q - p, stain);
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, 0.08, 30), M(0x6a655a, 'metal', 0.9, 0.15)); fl.position.y = 0.06; g.add(fl);

  // ---- torn edges, both cuts ------------------------------------------------------
  for (const [cth, ha, bot, top] of cuts) {
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R - 0.02, 0.14, 6, 1, true, cth - ha - 0.02, 2 * ha + 0.04), rust);
    lip.position.y = top + 0.02; g.add(lip);
    if (bot > 0) {
      const sill = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R + 0.1, 0.12, 6, 1, true, cth - ha - 0.02, 2 * ha + 0.04), rust);
      sill.position.y = bot - 0.02; g.add(sill);
    }
    for (const sgn of [-1, 1]) {
      const s = swing(cth + sgn * (ha + 0.015));
      const jamb = bx(0.09, top - bot - 0.06, 0.16, rust, 0, (top + bot) / 2, R - 0.02, s);
      jamb.rotation.y = sgn * 0.35;
      const t1 = bx(0.3, 0.55, 0.025, strip, sgn * 0.13, top - 0.5, R + 0.1, s);
      t1.rotation.y = sgn * 0.85; t1.rotation.z = sgn * 0.3;
      const t2 = bx(0.22, 0.4, 0.025, M(tint(TANK, 0.95), 'metal', 0.85, 0.2, true), sgn * 0.1, bot + 0.5, R + 0.08, s);
      t2.rotation.y = sgn * 0.55; t2.rotation.z = -sgn * 0.2;
      for (let j = 0; j < 5; j++) bx(0.04, 0.04, 0.03, steelL, sgn * 0.02, bot + 0.25 + j * (top - bot - 0.5) / 4, R + 0.06, s);
      bx(0.08, 0.6, 0.008, rust, sgn * 0.08, top - 0.95, R + 0.02, s);
    }
    if (bot === 0) {
      const drift = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), sand);
      drift.scale.set(ha * R * 1.3, 0.21, 1.7); drift.position.set(R * 0.62 * Math.sin(cth), 0.02, R * 0.62 * Math.cos(cth)); drift.rotation.y = cth; g.add(drift);
      const drift2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), sandP);
      drift2.scale.set(ha * R * 1.2, 0.16, 0.9); drift2.position.set((R + 0.15) * Math.sin(cth), 0.02, (R + 0.15) * Math.cos(cth)); drift2.rotation.y = cth; g.add(drift2);
    } else {
      const spill = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sand);
      spill.scale.set(0.7, 0.2, 1.2); spill.position.set(R * 0.6 * Math.sin(cth), 0.02, R * 0.6 * Math.cos(cth)); spill.rotation.y = cth; g.add(spill);
    }
  }

  // ---- plinth and fillet ----------------------------------------------------------
  for (const [p, q] of minus(0, Math.PI * 2, 0, 0.12)) arc(R + 0.06, 0, 0.12, p, q - p, conc);
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.3, R + 0.55, 0.24, 30), sand);
  fil.position.y = 0.12; fil.scale.set(1.04, 1, 0.96); g.add(fil);
  // ---- contact ring: a collar of packed sand over the fillet (0.2 m, the depth the drift comes through the cuts) and a stained band ----
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.4, 0.2, 30), M(0xa89372, 'ground', 0.96, 0.0));
  collar.position.y = 0.1; collar.scale.set(1.04, 1, 0.96); g.add(collar);
  const stainB = M(tint(TANK, 0.7), 'metal', 0.92, 0.12, true);
  for (const [p, q] of minus(0, Math.PI * 2, 0.12, 0.5)) arc(R + 0.004, 0.12, 0.5, p, q - p, stainB);

  // ---- roof: eight panels, rafters under, dust on top, vent with rain cap ----------
  for (let k = 0; k < 8; k++) {
    const pan = new THREE.Mesh(new THREE.ConeGeometry(R + 0.1, 0.6, 4, 1, true, k * Math.PI / 4, Math.PI / 4), M(tint(TANK, k % 2 ? 1.14 : 1.18), 'metal', 0.85, 0.2, true));
    pan.position.y = H + 0.3; g.add(pan);
  }
  arc(R + 0.12, H - 0.02, H + 0.05, 0, Math.PI * 2, strip);
  const slope = 0.6 / (R + 0.1);
  const ribLen = Math.hypot(R - 0.1, 0.56), ribAng = Math.atan2(0.56, R - 0.1);
  for (let k = 0; k < 8; k++) {
    const s = swing(k * Math.PI / 4);
    const rib = bx(0.07, 0.045, ribLen, strip, 0, H + 0.31, (R - 0.1) / 2 + 0.1, s);
    rib.rotation.x = ribAng;
    bx(0.06, 0.1, 0.006, rust, 0, H - 0.07, R + 0.006, s);
  }
  const rafLen = Math.hypot(R - 0.25, slope * (R - 0.25));
  for (let k = 0; k < 6; k++) {
    const s = swing(k * Math.PI / 3 + Math.PI / 6);
    const rm = (R - 0.25) / 2 + 0.2;
    const raf = bx(0.1, 0.12, rafLen, steel, 0, H + 0.6 - slope * rm - 0.09, rm, s);
    raf.rotation.x = Math.atan(slope);
    bx(0.1, 0.16, 0.08, steelL, 0, H - 0.1, R - 0.09, s);
    bx(0.06, 0.4, 0.008, rust, 0, H - 0.38, R - 0.062, s);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12), steel); hub.position.y = H + 0.42; g.add(hub);
  const dust = new THREE.Mesh(new THREE.ConeGeometry(R - 0.2, 0.52, 30, 1, true), sand);
  dust.position.y = H + 0.03 + 0.26; g.add(dust);
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 14), strip); vent.position.y = H + 0.72; g.add(vent);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.1, 14), gun); cap.position.y = H + 0.9; g.add(cap);

  // ---- walkway torn away over the south cut: deck arcs, slats, toe, brackets, rail --
  const gapA = 0.55;                                     // half angle of the torn section
  const deckArcs = [[gapA, 2 * Math.PI - gapA]];
  for (const [p, q] of deckArcs) {
    const dk = new THREE.Mesh(new THREE.RingGeometry(R + 0.05, RW, 28, 1, p - Math.PI / 2, q - p), galv);
    dk.rotation.x = -Math.PI / 2; dk.position.y = H; g.add(dk);
    // ring geometry theta runs in the xy plane from +x; after rotation.x the start angle shifts, so the
    // slats below are what set the gap visibly
  }
  const slatW = 2 * Math.PI * (R + 0.4) / 30 - 0.03;
  for (let k = 0; k < 30; k++) {
    const th = k * 2 * Math.PI / 30;
    const d = Math.abs(((th + Math.PI) % (2 * Math.PI)) - Math.PI);
    if (d < gapA) continue;
    const s = swing(th);
    const sl = bx(slatW, 0.035, RW - R - 0.1, k % 2 ? galv : galvD, 0, H - 0.017, (R + RW) / 2 + 0.02, s);
    for (let j = 0; j < 4; j++) bx(0.02, 0.045, RW - R - 0.12, galvD, -slatW / 2 + 0.06 + j * (slatW - 0.12) / 3, H - 0.017, (R + RW) / 2 + 0.02, s);
  }
  for (const rr of [R + 0.15, RW - 0.15]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 4, 28, 2 * Math.PI - 2 * gapA), steel);
    t.rotation.x = Math.PI / 2; t.rotation.z = gapA + Math.PI / 2; t.position.y = H - 0.06; g.add(t);
  }
  arc(RW + 0.01, H - 0.02, H + 0.13, gapA, 2 * Math.PI - 2 * gapA, steel);
  const drift = new THREE.Mesh(new THREE.RingGeometry(R + 0.03, R + 0.34, 28, 1), sand);
  drift.rotation.x = -Math.PI / 2; drift.position.y = H + 0.02; g.add(drift);
  const gusShape = new THREE.Shape(); gusShape.moveTo(0, 0); gusShape.lineTo(0.76, 0); gusShape.lineTo(0.76, -0.12); gusShape.lineTo(0, -0.95); gusShape.lineTo(0, 0);
  const gusGeo = new THREE.ExtrudeGeometry(gusShape, { depth: 0.05, bevelEnabled: false });
  for (let k = 0; k < 12; k++) {
    const th = k * Math.PI / 6 + Math.PI / 12;
    const d = Math.abs(((th + Math.PI) % (2 * Math.PI)) - Math.PI);
    const s = swing(th);
    bx(0.2, 1.05, 0.035, steelL, 0, H - 0.6, R + 0.03, s);
    bx(0.09, 0.4, 0.006, rust, 0.07, H - 1.35, R + 0.03, s);
    if (d < gapA) { const stub = bx(0.1, 0.08, 0.3, rust, 0, H - 0.12, R + 0.15, s); stub.rotation.x = 0.6; continue; }
    const gus = new THREE.Mesh(gusGeo, steel);
    gus.rotation.y = -Math.PI / 2; gus.position.set(0.025, H - 0.09, R + 0.03); s.add(gus);
  }
  const RR = RW - 0.07;
  const railArc = 2 * Math.PI - 2 * gapA - 0.1;
  for (let k = 0; k < 30; k++) {
    const th = k * Math.PI / 15;
    const d = Math.abs(((th + Math.PI) % (2 * Math.PI)) - Math.PI);
    const s = swing(th);
    if (d < gapA - 0.1) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.05, 6), k % 4 ? yel : yelD);
    post.position.set(0, H + 0.525, RR); s.add(post);
    if (d < gapA + 0.05) { post.rotation.x = 0.7; post.position.y = H + 0.35; post.position.z = RR + 0.25; }
    bx(0.08, 0.02, 0.08, steel, 0, H + 0.02, RR, s);
    bx(0.035, 0.06, 0.006, rust, 0, H + 0.07, RR + 0.03, s);
    bx(0.05, 0.18, 0.006, rust, 0.01, H + 0.02, RW + 0.016, s);   // drip from the post foot down the kerb face
  }
  for (const [y, mat] of [[H + 1.05, yel], [H + 0.56, yelD]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.026, 6, 28, railArc), mat);
    t.rotation.x = Math.PI / 2; t.rotation.z = gapA + 0.05 + Math.PI / 2; t.position.y = y; g.add(t);
  }
  // hanging rail stubs at the torn ends
  for (const sgn of [-1, 1]) {
    const s = swing(sgn * (gapA + 0.05));
    const stub = bx(0.05, 0.05, 0.6, yelD, 0, H + 0.75, RR, s); stub.rotation.x = sgn * 0.9;
  }
  // a contrast plate on a shade side plate in place of a stencil
  const pl = bx(0.6, 0.28, 0.02, M(0x2f4d66, 'metal', 0.8, 0.2), 0, 2.4, 0);
  pl.rotation.y = Math.PI + 0.5; pl.position.set(R * Math.sin(Math.PI + 0.5), 2.4, R * Math.cos(Math.PI + 0.5));
  bx(0.6, 0.12, 0.006, rust, 0, -0.2, 0.012, pl);

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
