// oil_storage_tank_open, rebuild round 13: the same riveted five course tank as the closed one
// (lap seam rings with a stain band under each, vertical rivet lines every 60 degrees, cone roof
// with seams over the rafters, full walkway ring with grating, brackets, handrail, caged ladder
// on the west side) but hollow and enterable. Two rough cuts, south 2.4 x 2.0 m and north east
// 1.2 x 2.0 m at 45 degrees (the `cuts` table is the level's collider contract, do not move it),
// with torn bent flanges around the cut edges, double sided shell so the inside shows the same
// courses, interior stiffening ribs, and a sludge floor with a darker ring at the wall foot.
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
  const TANK = 0xcac2ae, RUST = 0x6b4426, GALV = 0x9ea3a1, STEEL = 0x4f5257, SAND = 0xcdb88e;
  const YEL = 0xc9a227, CONC = 0x857c6c;
  const rust = M(RUST, 'metal', 0.9, 0.1, true);
  const rustD = M(0x4e2d19, 'metal', 0.92, 0.1, true);
  const galv = M(GALV, 'metal', 0.75, 0.55, true);
  const galvD = M(tint(GALV, 0.86), 'metal', 0.8, 0.5, true);
  const steel = M(STEEL, 'metal', 0.8, 0.3, true);
  const steelL = M(tint(STEEL, 1.1), 'metal', 0.78, 0.3);
  const rivetM = M(0x5c5852, 'metal', 0.72, 0.4);                 // darker than the plate so the heads read at 15 m
  const strip = M(tint(TANK, 0.78), 'metal', 0.85, 0.2, true);     // lap seam ring, a shade under the plates
  const seamShadow = M(tint(TANK, 0.6), 'metal', 0.9, 0.15, true); // the dark line under every lap
  const inner = M(tint(TANK, 0.66), 'metal', 0.88, 0.15, true);
  const innerD = M(tint(TANK, 0.5), 'metal', 0.9, 0.12, true);
  const stain = M(0x4a453c, 'metal', 0.92, 0.1, true);
  const yel = M(YEL, 'metal', 0.7, 0.15);
  const yelD = M(tint(YEL, 0.92), 'metal', 0.72, 0.15);
  const sand = M(SAND, 'ground', 0.95, 0.0);
  const sandP = M(0xa89372, 'ground', 0.95, 0.0);
  const conc = M(CONC, 'stone', 0.92, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const sludge = M(0x2a2721, 'metal', 0.55, 0.05);                 // lum < 0.06: the weathering pass leaves it alone
  const sludgeD = M(0x17150f, 'metal', 0.5, 0.05);

  const R = 3.2, RW = 4.0, H = 4.6, C = 0.92;
  const bx = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const swing = (theta, parent) => { const s = new THREE.Group(); s.rotation.y = theta; (parent || g).add(s); return s; };
  // partial bands are lathes, not cylinders: the loader floors every cylinder over 0.4 m radius to 32
  // segments whatever the arc length, which would render a 20 degree plate at the cost of a full ring
  const band = (r0, r1, y0, y1, th0, thLen, mat, seg) => {
    const mm = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(r0, y0), new THREE.Vector2(r1, y1)], seg, th0, thLen), mat);
    g.add(mm); return mm;
  };
  const arc = (rr, y0, y1, th0, thLen, mat, segPer) => {
    const seg = Math.max(2, Math.round(thLen * (segPer || 32) / (2 * Math.PI)));
    if (thLen > Math.PI * 2 - 1e-3) { const mm = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, y1 - y0, 32, 1, true), mat); mm.position.y = (y0 + y1) / 2; g.add(mm); return mm; }
    return band(rr, rr, y0, y1, th0, thLen, mat, seg);
  };
  const rivet = (th, y, rr, parent, big) => { const s = swing(th, parent); bx(big ? 0.07 : 0.06, big ? 0.07 : 0.06, 0.04, rivetM, 0, y, rr + 0.016, s); };
  // cuts: [centre, half angle, bottom, top]. South 2.4 m wide, north east 1.2 m wide, both 2.0 m tall.
  // These are the level's collider gaps (build.js tankSpec): keep them exactly.
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
  const angDist = (a, b) => Math.abs(((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  const inCut = (th, y, pad) => cuts.some(([c, ha, bot, top]) => y < top + (pad || 0) && y > bot && angDist(th, c) < ha + (pad === undefined ? 0.03 : pad));
  const ySplits = (y0, y1) => {
    const ys = [y0, y1];
    for (const [, , bot, top] of cuts) for (const yy of [bot, top]) if (yy > y0 && yy < y1) ys.push(yy);
    ys.sort((a, b) => a - b);
    const out = []; for (let i = 0; i + 1 < ys.length; i++) out.push([ys[i], ys[i + 1]]); return out;
  };

  // ---- five courses of six plates each, alternating lap radius, double sided liner inside ----------
  const courseTint = [0.86, 0.93, 1.0, 1.05, 1.1];
  const A = Math.PI / 3;
  for (let i = 0; i < 5; i++) {
    const base = tint(TANK, courseTint[i]);
    for (let k = 0; k < 6; k++) {
      const th0 = k * A - Math.PI / 6 - A / 2 + 0.01, mid = th0 + A / 2;
      const sun = Math.cos(mid) > 0.2 ? 1.06 : Math.cos(mid) < -0.2 ? 0.98 : 1.02;
      const rr = R + ((i + k) % 2 ? 0.03 : 0);
      const mat = M(tint(base, sun * (1 + 0.012 * ((k + i) % 3))), 'metal', 0.85, 0.2, true);
      const matIn = (i + k) % 2 ? inner : innerD;
      for (const [y0, y1] of ySplits(i * C, (i + 1) * C)) for (const [p, q] of minus(th0, th0 + A - 0.02, y0, y1)) {
        arc(rr, y0, y1, p, q - p, mat);
        arc(rr - 0.05, y0, y1, p, q - p, matIn);
      }
    }
    // lap seam: the raised strip, the shadow line under it, a stain band running down from the lap, rivet row
    if (i < 4) {
      const ys = (i + 1) * C;
      for (const [p, q] of minus(0, Math.PI * 2, ys - 0.06, ys + 0.06)) {
        arc(R + 0.045, ys - 0.06, ys + 0.06, p, q - p, strip);
        arc(R + 0.038, ys - 0.1, ys - 0.06, p, q - p, seamShadow);
        arc(R - 0.085, ys - 0.05, ys + 0.05, p, q - p, strip);
      }
      // stain band: a darker wash 0.18 m under the lap on every plate, broken up per plate so it reads as run marks
      for (let k = 0; k < 6; k++) {
        const th0 = k * A - Math.PI / 6 - A / 2 + 0.02;
        const rr = R + ((i + k) % 2 ? 0.03 : 0) + 0.006;
        const bandMat = M(tint(TANK, courseTint[i] * (0.74 + 0.04 * (k % 2))), 'metal', 0.9, 0.15, true);
        for (const [p, q] of minus(th0, th0 + A - 0.04, ys - 0.28, ys - 0.1)) arc(rr, ys - 0.28, ys - 0.1, p, q - p, bandMat);
      }
      for (let k = 0; k < 36; k++) { const th = k * Math.PI / 18 + (i % 2) * Math.PI / 36; if (!inCut(th, ys)) rivet(th, ys, R + 0.045); }
      // rust weeps under a third of the seam rivets
      for (let k = 0; k < 12; k++) {
        const th = k * Math.PI / 6 + i * 0.09 + 0.05;
        if (inCut(th, ys)) continue;
        const s = swing(th);
        bx(0.05, 0.16 + 0.08 * (k % 3), 0.006, k % 5 ? rust : rustD, 0, ys - 0.2 - 0.04 * (k % 3), R + ((i + k) % 2 ? 0.03 : 0) + 0.008, s);
      }
    }
  }
  // vertical rivet lines every 60 degrees: a butt strap on the outside, two staggered rivet rows, a rust wash
  for (let k = 0; k < 6; k++) {
    const th = k * A - Math.PI / 6 - A / 2;
    const s = swing(th);
    for (let i = 0; i < 5; i++) {
      for (const [y0, y1] of ySplits(i * C + 0.06, (i + 1) * C - 0.06)) {
        if (inCut(th, (y0 + y1) / 2, 0.02)) continue;
        bx(0.18, y1 - y0, 0.03, strip, 0, (y0 + y1) / 2, R + 0.025, s);
        bx(0.08, Math.min(0.3, y1 - y0), 0.006, rust, 0.03, y0 + Math.min(0.3, y1 - y0) / 2 + 0.02, R + 0.045, s);
      }
    }
    for (let i = 0; i < 16; i++) { const y = 0.3 + i * 0.27; if (!inCut(th, y, 0.05)) { rivet(th + 0.016, y, R + 0.04); rivet(th - 0.016, y - 0.13, R + 0.04); } }
  }
  // bottom chime: an angle ring with a rivet row, and the concrete plinth under it
  for (const [p, q] of minus(0, Math.PI * 2, 0.12, 0.24)) arc(R + 0.05, 0.12, 0.24, p, q - p, strip);
  for (let k = 0; k < 36; k++) { const th = k * Math.PI / 18 + Math.PI / 36; if (!inCut(th, 0.19)) rivet(th, 0.19, R + 0.05); }
  for (const [p, q] of minus(0, Math.PI * 2, 0, 0.12)) arc(R + 0.06, 0, 0.12, p, q - p, conc);

  // ---- inside: floor plate, sludge with a darker ring at the wall, 0.4 m tide band, six stiffening ribs ----
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, 0.08, 32), M(0x6a655a, 'metal', 0.9, 0.15)); fl.position.y = 0.06; g.add(fl);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.07, R - 0.07, 0.03, 32), sludge); sl.position.y = 0.115; g.add(sl);
  const slRing = new THREE.Mesh(new THREE.RingGeometry(R - 0.85, R - 0.06, 32, 1), sludgeD); slRing.rotation.x = -Math.PI / 2; slRing.position.y = 0.134; g.add(slRing);
  const slPool = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.006, 20), sludgeD); slPool.position.set(-0.9, 0.134, 0.6); slPool.scale.set(1, 1, 0.6); g.add(slPool);
  for (const [p, q] of minus(0, Math.PI * 2, 0.13, 0.53)) arc(R - 0.06, 0.13, 0.53, p, q - p, stain);
  for (const [p, q] of minus(0, Math.PI * 2, 0.53, 0.62)) arc(R - 0.058, 0.53, 0.62, p, q - p, M(0x6c655a, 'metal', 0.9, 0.12, true));
  for (let k = 0; k < 6; k++) {
    const th = k * A;
    if (inCut(th, 1.0, 0.12)) continue;
    const s = swing(th);
    bx(0.12, H - 0.5, 0.07, steel, 0, 0.3 + (H - 0.5) / 2, R - 0.115, s);
    bx(0.04, H - 0.5, 0.05, steelL, 0.04, 0.3 + (H - 0.5) / 2, R - 0.135, s);
        bx(0.14, 0.5, 0.006, rust, 0, 0.5, R - 0.152, s);
  }

  // ---- the two cuts: torn bent flanges around the edges, sills, sand drifts through them ----------
  for (const [cth, ha, bot, top] of cuts) {
    const plateM = M(tint(TANK, 0.96), 'metal', 0.85, 0.2, true);
    const edgeW = 2 * ha * R;
    // top edge: flaps bent outward and inward alternately, hanging from a torn lip
    band(R - 0.02, R + 0.1, top - 0.02, top + 0.08, cth - ha - 0.02, 2 * ha + 0.04, rust, 8);
    const nTop = Math.max(3, Math.round(edgeW / 0.32));
    for (let j = 0; j < nTop; j++) {
      const th = cth - ha + (j + 0.5) * 2 * ha / nTop;
      const s = swing(th);
      const out = j % 4 === 2 ? -1 : 1;
      const fh = 0.14 + 0.12 * ((j * 7) % 3) / 2;
      const flap = bx(edgeW / nTop + 0.01, fh, 0.014, j % 3 ? plateM : rust, 0, top + 0.02, R + 0.04, s);
      flap.geometry.translate(0, -fh / 2, 0);
      flap.rotation.x = out * (0.7 + 0.45 * ((j * 5) % 3) / 2);
      bx(edgeW / nTop - 0.05, 0.03, 0.02, rustD, 0, -fh / 2, 0, flap);
    }
    // side edges: jambs of bent plate, flaps folded back around the vertical axis, a row of empty rivet holes
    for (const sgn of [-1, 1]) {
      const s = swing(cth + sgn * (ha + 0.012));
      const jamb = bx(0.08, top - bot - 0.04, 0.14, rust, 0, (top + bot) / 2, R - 0.02, s);
      jamb.rotation.y = sgn * 0.3;
      const nSide = Math.round((top - bot) / 0.36);
      for (let j = 0; j < nSide; j++) {
        const y = bot + (j + 0.5) * (top - bot) / nSide;
        const fw = 0.18 + 0.12 * ((j * 3) % 3) / 2;
        const out = j % 2 ? 1 : -1;
        const flap = bx(fw, (top - bot) / nSide - 0.04, 0.014, j % 3 === 1 ? rust : plateM, sgn * fw / 2 * 0.9, y, R + (out > 0 ? 0.06 : -0.05), s);
        flap.rotation.y = sgn * out * (0.6 + 0.5 * ((j * 5) % 3) / 2);
        flap.rotation.z = sgn * 0.12 * ((j % 3) - 1);
        bx(0.03, (top - bot) / nSide - 0.06, 0.02, rustD, sgn * fw / 2, 0, 0, flap);
      }
      bx(0.1, 0.8, 0.008, rust, sgn * 0.12, top - 0.8, R + 0.035, s);
      bx(0.06, 0.5, 0.008, rustD, -sgn * 0.02, top - 0.4, R - 0.058, s);
    }
    // sand drifted 0.2 m deep through the cut and fanning over the sludge inside
    const drift = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), sand);
    drift.scale.set(ha * R * 1.35, 0.26, 1.9); drift.position.set(R * 0.6 * Math.sin(cth), 0.03, R * 0.6 * Math.cos(cth)); drift.rotation.y = cth; g.add(drift);
    const drift2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), sandP);
    drift2.scale.set(ha * R * 1.25, 0.17, 1.1); drift2.position.set((R + 0.15) * Math.sin(cth), 0.0, (R + 0.15) * Math.cos(cth)); drift2.rotation.y = cth; g.add(drift2);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), sandP);
    tongue.scale.set(ha * R * 0.7, 0.12, 1.3); tongue.position.set(R * 0.25 * Math.sin(cth), 0.05, R * 0.25 * Math.cos(cth)); tongue.rotation.y = cth; g.add(tongue);
  }

  // ---- fillet and sand collar at the foot ------------------------------------------------------
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.55, 0.2, 32, 1, true), sand);
  fil.position.y = 0.1; fil.scale.set(1.04, 1, 0.96); g.add(fil);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.4, 0.16, 32, 1, true), sandP);
  collar.position.y = 0.08; collar.scale.set(1.04, 1, 0.96); g.add(collar);
  const stainB = M(tint(TANK, 0.68), 'metal', 0.92, 0.12, true);
  for (const [p, q] of minus(0, Math.PI * 2, 0.24, 0.5)) arc(R + 0.006, 0.24, 0.5, p, q - p, stainB);

  // ---- roof: eight panels, seam strips with rivets on top, rafters under, dust, vent with rain cap -----
  const slope = 0.6 / (R + 0.1);
  for (let k = 0; k < 8; k++) {
    const pan = new THREE.Mesh(new THREE.ConeGeometry(R + 0.1, 0.6, 4, 1, true, k * Math.PI / 4, Math.PI / 4), M(tint(TANK, k % 2 ? 1.1 : 1.15), 'metal', 0.85, 0.2, true));
    pan.position.y = H + 0.3; g.add(pan);
  }
  arc(R + 0.13, H - 0.04, H + 0.06, 0, Math.PI * 2, strip);
  arc(R + 0.12, H - 0.1, H - 0.04, 0, Math.PI * 2, seamShadow);
  for (let k = 0; k < 24; k++) rivet(k * Math.PI / 12, H + 0.01, R + 0.13);
  const ribLen = Math.hypot(R - 0.1, 0.56), ribAng = Math.atan2(0.56, R - 0.1);
  for (let k = 0; k < 8; k++) {
    const s = swing(k * Math.PI / 4);
    const rib = bx(0.08, 0.045, ribLen, strip, 0, H + 0.31, (R - 0.1) / 2 + 0.1, s);
    rib.rotation.x = ribAng;
    for (let j = 0; j < 5; j++) { const rr = 0.7 + j * 0.55; bx(0.05, 0.05, 0.04, rivetM, 0, H + 0.6 * (1 - rr / (R + 0.1)) + 0.05, rr, s); }
    bx(0.06, 0.14, 0.006, rust, 0, H - 0.09, R + 0.135, s);
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
  const dust = new THREE.Mesh(new THREE.ConeGeometry(R - 0.2, 0.52, 32, 1, true), sand);
  dust.position.y = H + 0.03 + 0.26; g.add(dust);
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 14), strip); vent.position.y = H + 0.72; g.add(vent);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.1, 14), gun); cap.position.y = H + 0.9; g.add(cap);

  // ---- walkway ring: full deck (the level's walkable ring is unbroken), grating slats, toe kerb, brackets -----
  const LAD = 3 * Math.PI / 2;                                   // ladder on the west side, clear of both cuts
  const hatchA = 0.14;
  const dk = new THREE.Mesh(new THREE.RingGeometry(R + 0.05, RW, 32, 1), galv);
  dk.rotation.x = -Math.PI / 2; dk.position.y = H; g.add(dk);
  const slatW = 2 * Math.PI * (R + 0.4) / 32 - 0.03;
  for (let k = 0; k < 32; k++) {
    const th = k * 2 * Math.PI / 32;
    if (angDist(th, LAD) < hatchA) continue;                     // hatch for the ladder
    const s = swing(th);
    bx(slatW, 0.035, RW - R - 0.1, k % 2 ? galv : galvD, 0, H - 0.017, (R + RW) / 2 + 0.02, s);
    for (let j = 0; j < 2; j++) bx(0.02, 0.05, RW - R - 0.12, galvD, -slatW / 2 + 0.12 + j * (slatW - 0.24), H - 0.017, (R + RW) / 2 + 0.02, s);
  }
  for (const rr of [R + 0.15, RW - 0.15]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 4, 32), steel);
    t.rotation.x = Math.PI / 2; t.position.y = H - 0.06; g.add(t);
  }
  arc(RW + 0.01, H - 0.02, H + 0.13, 0, Math.PI * 2, steel);
  const dustRing = new THREE.Mesh(new THREE.RingGeometry(R + 0.03, R + 0.34, 32, 1), sand);
  dustRing.rotation.x = -Math.PI / 2; dustRing.position.y = H + 0.02; g.add(dustRing);
  const gusShape = new THREE.Shape(); gusShape.moveTo(0, 0); gusShape.lineTo(0.76, 0); gusShape.lineTo(0.76, -0.12); gusShape.lineTo(0, -0.95); gusShape.lineTo(0, 0);
  const gusGeo = new THREE.ExtrudeGeometry(gusShape, { depth: 0.05, bevelEnabled: false });
  for (let k = 0; k < 12; k++) {
    const th = k * Math.PI / 6 + Math.PI / 12;
    const s = swing(th);
    bx(0.2, 1.05, 0.035, steelL, 0, H - 0.6, R + 0.03, s);
    bx(0.09, 0.4, 0.006, rust, 0.07, H - 1.35, R + 0.03, s);
    const gus = new THREE.Mesh(gusGeo, steel);
    gus.rotation.y = -Math.PI / 2; gus.position.set(0.025, H - 0.09, R + 0.03); s.add(gus);
  }
  // handrail: posts every 12 degrees, two rails, gaps where the level declares them (east, and the T2 bridge side)
  const RR = RW - 0.07;
  const railGaps = [[Math.PI / 2, 0.19], [Math.PI * 166 / 180, 0.19]];
  const inGap = (th) => railGaps.some(([c, ha]) => angDist(th, c) < ha);
  for (let k = 0; k < 30; k++) {
    const th = k * Math.PI / 15;
    const s = swing(th);
    if (inGap(th)) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.05, 6), k % 4 ? yel : yelD);
    post.position.set(0, H + 0.525, RR); s.add(post);
    bx(0.08, 0.02, 0.08, steel, 0, H + 0.02, RR, s);
    bx(0.035, 0.06, 0.006, rust, 0, H + 0.07, RR + 0.03, s);
    bx(0.05, 0.18, 0.006, rust, 0.01, H + 0.02, RW + 0.016, s);
  }
  const railArcs = [];
  { const edges = railGaps.map(([c, ha]) => [c - ha, c + ha]).sort((a, b) => a[0] - b[0]);
    let p = edges[edges.length - 1][1] - 2 * Math.PI;
    for (const [lo, hi] of edges) { railArcs.push([p, lo]); p = hi; } }
  for (const [y, mat] of [[H + 1.05, yel], [H + 0.56, yelD]]) for (const [p, q] of railArcs) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.026, 4, Math.max(4, Math.round((q - p) * 32 / (2 * Math.PI))), q - p), mat);
    t.rotation.x = Math.PI / 2; t.rotation.z = -p + Math.PI / 2 - (q - p); t.position.y = y; g.add(t);
  }
  // end posts at each gap so the rails terminate on something
  for (const [c, ha] of railGaps) for (const sgn of [-1, 1]) {
    const s = swing(c + sgn * (ha + 0.01));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.05, 6), yel); post.position.set(0, H + 0.525, RR); s.add(post);
    bx(0.08, 0.02, 0.08, steel, 0, H + 0.02, RR, s);
  }

  // ---- caged ladder on the west side, from the sand to the walkway hatch, hoops from 2.2 m ------------
  {
    const s = swing(LAD);
    const LR = R + 0.32;
    for (const sx of [-0.2, 0.2]) bx(0.04, H + 1.05 - 0.3, 0.06, galvD, sx, 0.3 + (H + 1.05 - 0.3) / 2, LR, s);
    for (let i = 0; i < 17; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), galv);
      rung.rotation.z = Math.PI / 2; rung.position.set(0, 0.45 + i * 0.28, LR); s.add(rung);
    }
    for (let i = 0; i < 6; i++) {
      const y = 0.9 + i * 0.75;
      const st = bx(0.5, 0.05, 0.06, steel, 0, y, LR - 0.15, s);
      bx(0.06, 0.06, 0.06, rustD, 0, y - 0.05, R + 0.04, s);
      st.rotation.y = 0;
    }
    for (let i = 0; i < 5; i++) {
      const y = 2.2 + i * 0.62;
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.018, 4, 14, Math.PI), i % 2 ? galv : galvD);
      hoop.rotation.x = Math.PI / 2; hoop.rotation.z = 0; hoop.position.set(0, y, LR); s.add(hoop);
    }
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + j * Math.PI / 4;
      const bar = bx(0.025, H + 1.05 - 2.2, 0.025, galvD, 0.36 * Math.cos(a), 2.2 + (H + 1.05 - 2.2) / 2, LR + 0.36 * Math.sin(a), s);
      bar.rotation.y = 0;
    }
    bx(0.3, 0.03, 0.03, rust, 0, H + 0.02, LR + 0.36, s);
  }
  // a contrast plate on a shade side plate in place of a stencil
  const pl = bx(0.6, 0.28, 0.02, M(0x2f4d66, 'metal', 0.8, 0.2), 0, 2.4, 0);
  pl.rotation.y = Math.PI + 0.5; pl.position.set(R * Math.sin(Math.PI + 0.5), 2.4, R * Math.cos(Math.PI + 0.5));
  bx(0.6, 0.12, 0.006, rust, 0, -0.2, 0.012, pl);
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

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
