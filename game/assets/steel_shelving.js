export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandSun: 0xcdb88e, sandPack: 0xa89372, rockPale: 0xc4b393, concB: 0xb8ae9b, concS: 0x857c6c,
    redox: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tankB: 0x9c988c, cBlue: 0x2f4d66,
    cRed: 0x9c4a3c, timber: 0xa07a4f, olive: 0x4e5238, khaki: 0x7a6a4c, sandbag: 0xb0a07c, gun: 0x3a3d40,
    rubber: 0x1d1e20, yellow: 0xc9a227, lamp: 0xffd9a0 };
  const DS = THREE.DoubleSide;
  const _mats = {};
  // mat(hex, recipe name, roughness, metalness, tint factor, extra props)
  function mat(hex, name, rough, metal, f, extra) {
    f = f || 1;
    const key = hex + '|' + name + '|' + rough + '|' + metal + '|' + f + '|' + JSON.stringify(extra || {});
    if (_mats[key]) return _mats[key];
    const col = new THREE.Color(hex).multiplyScalar(f);
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: rough, metalness: metal }, extra || {}));
    if (name) m.name = name;
    _mats[key] = m; return m;
  }
  function mesh(geo, m, x, y, z, parent) { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); (parent || g).add(o); return o; }
  function box(w, h, d, m, x, y, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent); }
  function cyl(rt, rb, h, seg, m, x, y, z, parent, open) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), m, x, y, z, parent); }
  function dirVec(n) { const v = new THREE.Vector3(); if (n === 'x') v.x = 1; else if (n === '-x') v.x = -1; else if (n === 'y') v.y = 1; else if (n === '-y') v.y = -1; else if (n === 'z') v.z = 1; else v.z = -1; return v; }
  // rotate o so its local +Y points along n
  function aim(o, n) { if (n === 'z') o.rotation.x = Math.PI / 2; else if (n === '-z') o.rotation.x = -Math.PI / 2; else if (n === 'x') o.rotation.z = -Math.PI / 2; else if (n === '-x') o.rotation.z = Math.PI / 2; else if (n === '-y') o.rotation.x = Math.PI; return o; }
  const RUST = () => mat(C.rust, 'metal', 0.92, 0.1);
  const DUST = () => mat(C.sandSun, 'ground', 0.95, 0);
  const BOLT = () => mat(C.steel, 'metal', 0.7, 0.5);
  // rust streak: a thin tapered plate hanging down a vertical face whose normal is n; (x,y,z) is its top on the face
  function streak(x, y, z, n, len, w, parent) {
    len = len || 0.12; w = w || 0.02;
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false }), RUST());
    if (n === '-z') o.rotation.y = Math.PI; else if (n === 'x') o.rotation.y = Math.PI / 2; else if (n === '-x') o.rotation.y = -Math.PI / 2;
    const d = dirVec(n).multiplyScalar(0.0006);
    o.position.set(x + d.x, y, z + d.z); (parent || g).add(o); return o;
  }
  // hex bolt head sitting proud of a face with normal n, with an optional rust streak below it
  function bolt(x, y, z, n, r, streakLen, parent) {
    r = r || 0.012; const h = 0.009;
    const o = cyl(r, r, h, 4, BOLT(), 0, 0, 0, parent); aim(o, n);
    const d = dirVec(n).multiplyScalar(h * 0.4); o.position.set(x + d.x, y + d.y, z + d.z);
    if (streakLen) streak(x, y - r, z, n, streakLen, r * 1.6, parent);
    return o;
  }
  // dust cap: thin sand slab on an up facing surface, inset from its edge
  function dust(w, d, x, yTop, z, inset, parent) { inset = inset === undefined ? 0.04 : inset; return box(Math.max(0.01, w - 2 * inset), 0.008, Math.max(0.01, d - 2 * inset), DUST(), x, yTop + 0.004, z, parent); }
  // sand fillet: a drift against one side of the object. side: front|back|left|right, faceAt = coordinate of that face
  function fillet(side, len, c, faceAt, out, hi, inw) {
    out = out || 0.08; hi = hi || 0.16; inw = inw === undefined ? 0.12 : inw;
    const s = new THREE.Shape(); s.moveTo(-inw, 0); s.lineTo(out, 0); s.lineTo(out * 0.55, hi * 0.3); s.lineTo(0, hi * 0.7); s.lineTo(-inw, hi); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    if (side === 'front') { geo.rotateY(-Math.PI / 2); geo.translate(c + len / 2, 0, faceAt); }
    else if (side === 'back') { geo.rotateY(Math.PI / 2); geo.translate(c - len / 2, 0, faceAt); }
    else if (side === 'right') { geo.translate(faceAt, 0, c - len / 2); }
    else { geo.rotateY(Math.PI); geo.translate(faceAt, 0, c + len / 2); }
    return mesh(geo, DUST(), 0, 0, 0);
  }
  // sand mound around a foot
  function mound(x, z, r, h) { return cyl(r * 0.2, r, h, 8, DUST(), x, h / 2, z); }
  // steel_shelving c1: profile built. Slotted angle uprights from punched flat shapes, pan shelves from a C profile,
  // lathe tins, extruded jerry can silhouette with handle holes, extruded toolboxes, blankets as S folds, tarp as a wavy profile.
  const SW = 0.98, SD = 0.44, SH = 1.8, A = 0.04, T = 0.004;
  const GALV = mat(C.galv, 'metal', 0.75, 0.5, 1.0, { side: DS });
  const GALV_S = mat(C.galv, 'metal', 0.72, 0.5, 1.08, { side: DS });
  const GALV_N = mat(C.galv, 'metal', 0.78, 0.5, 0.9, { side: DS });
  const GUN = mat(C.gun, 'metal', 0.7, 0.45);
  const shelves = [0.1, 0.5, 0.9, 1.3, 1.72];
  // punched flange: rectangle A x SH with a column of round holes, extruded T
  function flange() {
    const s = new THREE.Shape(); s.moveTo(-A / 2, 0); s.lineTo(A / 2, 0); s.lineTo(A / 2, SH); s.lineTo(-A / 2, SH); s.closePath();
    for (let i = 0; i < 6; i++) { const h = new THREE.Path(); h.absarc(0, 0.15 + i * 0.3, 0.007, 0, Math.PI * 2, true); s.holes.push(h); }
    return new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 3 });
  }
  const fg = flange();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (SW / 2 - A / 2), z = sz * (SD / 2 - A / 2);
    const f1 = mesh(fg, sz > 0 ? GALV_S : GALV_N, x, 0, z + sz * (A / 2 - T)); if (sz < 0) f1.rotation.y = Math.PI;      // flange in the z face
    const f2 = mesh(fg, GALV, x + sx * (A / 2), 0, z); f2.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;               // flange in the x face
    if (sx < 0) f2.position.x = x - A / 2 + T;
    box(A + 0.02, 0.008, A + 0.02, RUST(), x, 0.004, z);
    mound(x, z, 0.04, 0.03);
  }
  // pan shelf: C profile (lip down at front and back) extruded across the width, plus a timber board
  const pan = new THREE.Shape(); const hd = SD / 2 - T - 0.002, lip = 0.03;
  pan.moveTo(-hd, 0); pan.lineTo(hd, 0); pan.lineTo(hd, -lip); pan.lineTo(hd - T, -lip); pan.lineTo(hd - T, -T); pan.lineTo(-hd + T, -T); pan.lineTo(-hd + T, -lip); pan.lineTo(-hd, -lip); pan.closePath();
  shelves.forEach((y, i) => {
    const iw = SW - 2 * T - 0.002;
    const pg = new THREE.ExtrudeGeometry(pan, { depth: iw, bevelEnabled: false }); pg.rotateY(Math.PI / 2); pg.scale(1, 1, -1);
    mesh(pg, i === 4 ? GALV_S : GALV, -iw / 2, y - 0.018, 0);
    for (const sx of [-1, 1]) box(T, lip, hd * 2, GALV, sx * (iw / 2 - T / 2), y - 0.018 - lip / 2, 0);
    box(iw - 0.01, 0.018, hd * 2 - 0.01, mat(C.timber, 'timber', 0.88, 0, 1.0 + (i % 2) * 0.1), 0, y - 0.009, 0);
    box(iw - 0.02, 0.004, hd * 2 - 0.02, mat(C.timber, 'timber', 0.88, 0, 1.18), 0, y + 0.002, 0);
    dust(iw, hd * 2, 0, y + 0.004, 0, 0.03);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bolt(sx * (SW / 2 - 0.02), y - 0.03, sz * (SD / 2 + 0.0005), sz > 0 ? 'z' : '-z', 0.007, 0.06 + (i % 3) * 0.03);
      bolt(sx * (SW / 2 + 0.0005), y - 0.03, sz * (SD / 2 - 0.02), sx > 0 ? 'x' : '-x', 0.007, 0.04);
    }
  });
  const bl = Math.sqrt(SW * SW + 1.5 * 1.5), ba = Math.atan2(SW, 1.5);
  for (const s of [-1, 1]) { const b = box(0.03, bl - 0.1, 0.004, GALV_N, 0, 0.95, -SD / 2 - 0.003); b.rotation.z = s * ba; }
  box(0.06, 0.06, 0.005, RUST(), 0, 0.95, -SD / 2 - 0.006); bolt(0, 0.95, -SD / 2 - 0.009, '-z', 0.008, 0.15);
  for (const sx of [-1, 1]) for (const y of [0.2, 1.7]) bolt(sx * (SW / 2 - 0.03) * (y > 1 ? 1 : -1), y, -SD / 2 - 0.006, '-z', 0.008, 0.1);
  for (const sx of [-1, 1]) { const b = box(0.004, 0.6, 0.025, GALV, sx * (SW / 2 + 0.003), 0.4, 0); b.rotation.x = sx * 0.6; }
  // boxes with open flaps: an extruded box outline plus flap plates
  const y3 = shelves[3] + 0.004;
  for (const [x, w, d, h] of [[-0.22, 0.4, 0.3, 0.34], [0.22, 0.38, 0.3, 0.3]]) {
    box(w, h, d, mat(C.sandbag, 'fabric', 0.92, 0), x, y3 + h / 2, 0.02);
    const fl = box(w, 0.006, d / 2, mat(C.sandbag, 'fabric', 0.92, 0, 1.08), x, y3 + h + 0.03, 0.02 - d / 4 - 0.02); fl.rotation.x = -0.35;
    box(0.04, h + 0.002, d + 0.002, mat(C.khaki, 'fabric', 0.9, 0, 1.1), x, y3 + h / 2, 0.02);
    dust(w, d / 2, x, y3 + h, 0.02 + d / 4, 0.03);
  }
  // lathe tins with rolled rims and a wire handle
  const y2 = shelves[2] + 0.004;
  const tinPts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.072, 0.02), new THREE.Vector2(0.072, 0.19), new THREE.Vector2(0.076, 0.195), new THREE.Vector2(0.076, 0.205), new THREE.Vector2(0.06, 0.205), new THREE.Vector2(0.06, 0.2), new THREE.Vector2(0.001, 0.2)];
  const lidCols = [C.tankB, C.cRed, C.tankB, C.cBlue, C.tankB, C.rust];
  for (let i = 0; i < 6; i++) {
    const x = -0.38 + i * 0.15, z = (i % 2) * 0.06 - 0.02;
    mesh(new THREE.LatheGeometry(tinPts, 8), mat(C.tankB, 'metal', 0.7, 0.35, 0.95 + (i % 3) * 0.05, { side: DS }), x, y2, z);
    cyl(0.06, 0.06, 0.004, 8, mat(lidCols[i], 'metal', 0.7, 0.3, 1.1), x, y2 + 0.202, z);
    const hd = mesh(new THREE.TorusGeometry(0.075, 0.003, 3, 8, Math.PI), GUN, x, y2 + 0.2, z); hd.rotation.y = 0.3 * i;
    box(0.144, 0.05, 0.002, mat(C.sandbag, 'fabric', 0.9, 0), x, y2 + 0.1, z + 0.072);
    streak(x - 0.02, y2 + 0.19, z + 0.072, 'z', 0.1, 0.02);
  }
  // rope coils and blankets as S folds
  const y1 = shelves[1] + 0.004;
  for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(0.065, 0.028, 5, 10), mat(C.sandbag, 'fabric', 0.95, 0, 0.95 + i * 0.04), -0.32 + i * 0.16, y1 + 0.028, 0.02); r.rotation.x = Math.PI / 2; }
  const bs = new THREE.Shape(); bs.moveTo(0, 0); bs.lineTo(0.36, 0); bs.lineTo(0.36, 0.05); bs.lineTo(0.02, 0.05); bs.lineTo(0.02, 0.06); bs.lineTo(0.35, 0.06); bs.lineTo(0.35, 0.11); bs.lineTo(0.0, 0.11); bs.lineTo(0, 0.12); bs.lineTo(0.34, 0.12); bs.lineTo(0.34, 0.17); bs.lineTo(0.02, 0.17); bs.lineTo(0.02, 0.18); bs.lineTo(0.33, 0.18); bs.lineTo(0.33, 0.225); bs.lineTo(0, 0.225); bs.closePath();
  mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.28, bevelEnabled: false }), mat(C.olive, 'fabric', 0.93, 0, 1.0, { side: DS }), 0.07, y1, -0.14);
  dust(0.3, 0.26, 0.24, y1 + 0.225, 0, 0.03);
  // jerry can silhouette with handle holes, extruded to its thickness
  const y0 = shelves[0] + 0.004, JX = -0.33;
  const jc = new THREE.Shape(); jc.moveTo(-0.165, 0); jc.lineTo(0.165, 0); jc.lineTo(0.165, 0.3); jc.lineTo(0.12, 0.35); jc.lineTo(-0.165, 0.35); jc.closePath();
  for (const hx of [-0.09, -0.02, 0.05]) { const h = new THREE.Path(); h.moveTo(hx - 0.025, 0.3); h.lineTo(hx - 0.025, 0.325); h.lineTo(hx + 0.025, 0.325); h.lineTo(hx + 0.025, 0.3); h.closePath(); jc.holes.push(h); }
  const jg = new THREE.ExtrudeGeometry(jc, { depth: 0.17, bevelEnabled: false }); jg.rotateY(Math.PI / 2);
  mesh(jg, mat(C.olive, 'metal', 0.8, 0.2, 1.05, { side: DS }), JX - 0.085, y0, 0);
  for (const s of [-1, 1]) { const rib = box(0.004, 0.3, 0.03, mat(C.olive, 'metal', 0.8, 0.2, 0.9), JX + s * 0.087, y0 + 0.15, 0); rib.rotation.x = s * 0.7; }
  cyl(0.022, 0.022, 0.03, 8, RUST(), JX, y0 + 0.355, 0.14);
  // toolboxes: extruded end profile with a lid overhang
  const tbp = new THREE.Shape(); tbp.moveTo(-0.1, 0); tbp.lineTo(0.1, 0); tbp.lineTo(0.1, 0.16); tbp.lineTo(0.105, 0.16); tbp.lineTo(0.105, 0.19); tbp.lineTo(-0.105, 0.19); tbp.lineTo(-0.105, 0.16); tbp.lineTo(-0.1, 0.16); tbp.closePath();
  for (let i = 0; i < 2; i++) {
    const y = y0 + i * 0.19, x = 0.14 + i * 0.03;
    const tg = new THREE.ExtrudeGeometry(tbp, { depth: 0.5, bevelEnabled: false }); tg.rotateY(Math.PI / 2);
    mesh(tg, mat(C.cRed, 'metal', 0.78, 0.25, 1.0 + i * 0.1), x - 0.25, y, 0);
    const h = cyl(0.008, 0.008, 0.15, 6, GUN, x, y + 0.21, 0); h.rotation.z = Math.PI / 2;
    for (const dx of [-0.15, 0.15]) { box(0.03, 0.03, 0.006, GUN, x + dx, y + 0.06, 0.106); streak(x + dx, y + 0.045, 0.109, 'z', 0.05, 0.02); }
  }
  // tarp: wavy hanging profile extruded across the bay
  const tp = new THREE.Shape(); tp.moveTo(0, 0.5); tp.lineTo(0.16, 0.5); tp.lineTo(0.16, 0.56); tp.lineTo(-0.02, 0.56); tp.lineTo(0.0, 0.4); tp.lineTo(0.03, 0.25); tp.lineTo(0.0, 0.12); tp.lineTo(0.05, 0.0); tp.lineTo(-0.02, 0.0); tp.lineTo(-0.025, 0.12); tp.lineTo(0.005, 0.25); tp.lineTo(-0.025, 0.4); tp.closePath();
  const tgeo = new THREE.ExtrudeGeometry(tp, { depth: 0.42, bevelEnabled: false }); tgeo.rotateY(Math.PI / 2);
  mesh(tgeo, mat(C.khaki, 'fabric', 0.94, 0, 1.0, { side: DS }), 0.02, 0, SD / 2 - 0.01);
  box(0.36, 0.05, 0.04, mat(C.khaki, 'fabric', 0.94, 0, 0.88), 0.2, 0.025, SD / 2 + 0.005);
  box(0.08, 0.02, 0.08, GUN, -0.3, shelves[4] + 0.014, 0.05);
  box(0.12, 0.03, 0.05, RUST(), 0.2, shelves[4] + 0.019, -0.05);
  fillet('left', SD, 0, -SW / 2, 0.05, 0.07, 0.06);
  fillet('right', SD, 0, SW / 2, 0.05, 0.06, 0.06);
  // ---- r4 detail pass: top gussets, foot plates with anchor bolts, lip label plates, a dented lip, a rope coil on a
  // hook, a broom against the side, a fire extinguisher, top shelf funnel, tarp and wire coil, back tie bars, ties.
  (function () {
    const PLATE = mat(C.galv, 'metal', 0.7, 0.45, 1.15);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (SW / 2 - A / 2), z = sz * (SD / 2 - A / 2);
      box(A + 0.05, 0.005, A + 0.05, GALV_N, x, 0.0105, z);
      for (const d of [-1, 1]) {
        bolt(x + d * 0.032, 0.013, z - d * 0.032, 'y', 0.005, 0);
        if (sz > 0) { cyl(0.009, 0.009, 0.002, 8, PLATE, x + d * 0.032, 0.014, z - d * 0.032); cyl(0.0055, 0.0055, 0.006, 6, BOLT(), x + d * 0.032, 0.019, z - d * 0.032); }   // washer and nut, front feet
      }
      if (sx < 0 && sz > 0) { box(0.01, 0.02, 0.008, RUST(), x - 0.045, 0.01, z + 0.04); streak(x - A / 2 - 0.0005, 0.06, z, '-x', 0.05, 0.03); }   // a chipped anchor and its run of rust on the front left foot
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-sx * 0.09, 0); s.lineTo(0, -0.09); s.closePath();
      mesh(new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false }), sz > 0 ? GALV_S : GALV_N, sx * (SW / 2 - A), 1.672, sz * (SD / 2) + (sz > 0 ? 0.001 : -0.006));
      bolt(sx * (SW / 2 - A - 0.028), 1.672 - 0.028, sz * (SD / 2 + 0.0065), sz > 0 ? 'z' : '-z', 0.006, 0.07);
    }
    shelves.forEach((y) => box(0.08, 0.022, 0.003, PLATE, -0.36, y - 0.033, SD / 2 + 0.0015));
    box(0.14, 0.03, 0.004, GALV, 0.25, shelves[2] - 0.033, SD / 2 + 0.004).rotation.x = 0.3;   // kicked out lip
    // rope coil on a hook, right side; broom against the left side
    const coil = mesh(new THREE.TorusGeometry(0.075, 0.022, 5, 10), mat(C.sandbag, 'fabric', 0.95, 0, 0.98), SW / 2 + 0.024, 1.15, 0); coil.rotation.y = Math.PI / 2;
    const hk = cyl(0.004, 0.004, 0.05, 5, GUN, SW / 2 + 0.022, 1.235, 0); hk.rotation.z = Math.PI / 2;
    streak(SW / 2 + 0.0005, 1.23, 0.0, 'x', 0.08, 0.016);
    // broom hung head down on the left side in two bolted spring clips (40 mm plate, 32 mm ring, arm) that visibly carry
    // the handle; the head is a timber block with a ferruled shoulder where the handle enters and six tapered rows of
    // dark bristles below it
    { const BX = -SW / 2 - 0.044, BZ = 0.1, HT = mat(C.timber, 'timber', 0.88, 0, 0.78);
      for (const y of [0.5, 1.32]) {
        box(0.006, 0.04, 0.03, PLATE, -SW / 2 - 0.003, y, BZ); bolt(-SW / 2 - 0.0065, y + 0.012, BZ, '-x', 0.005, 0.05);
        box(0.02, 0.006, 0.006, GUN, -SW / 2 - 0.016, y, BZ);
        const ring = mesh(new THREE.TorusGeometry(0.016, 0.004, 5, 10, Math.PI * 1.55), GUN, BX, y, BZ); ring.rotation.x = Math.PI / 2; ring.rotation.z = -Math.PI * 0.775;
      }
      cyl(0.012, 0.012, 1.25, 6, mat(C.timber, 'timber', 0.85, 0, 1.05), BX, 0.925, BZ);
      cyl(0.0125, 0.0125, 0.01, 6, GUN, BX, 1.545, BZ);                       // handle end cap
      cyl(0.0145, 0.0145, 0.012, 8, GUN, BX, 0.312, BZ);                      // ferrule
      cyl(0.017, 0.021, 0.035, 8, HT, BX, 0.2875, BZ);                        // shoulder boss
      box(0.06, 0.03, 0.26, HT, BX, 0.255, BZ);                               // head block
      for (const sz of [-1, 1]) box(0.062, 0.032, 0.004, mat(C.timber, 'timber', 0.9, 0, 0.5), BX, 0.255, BZ + sz * 0.13);   // sawn ends
      // bristles: 18 tapered tufts across the head, spaced along its length with air between them, so the side that
      // faces out of the rack reads as a comb of dark fibres and not as one flat face
      const BR = mat(C.gun, 'metal', 0.92, 0.05, 1.0, { side: DS });   // stiff dark synthetic fibre, reads near black against the timber head
      const tuft = new THREE.Shape(); tuft.moveTo(-0.0027, 0); tuft.lineTo(0.0027, 0); tuft.lineTo(0.0014, -0.092); tuft.lineTo(-0.0014, -0.092); tuft.closePath();
      const tg2 = new THREE.ExtrudeGeometry(tuft, { depth: 0.056, bevelEnabled: false }); tg2.rotateY(Math.PI / 2); tg2.translate(-0.028, 0, 0);
      for (let i = 0; i < 18; i++) { const t = mesh(tg2, BR, BX + ((i % 3) - 1) * 0.001, 0.24, BZ - 0.1147 + i * 0.0135); t.rotation.x = ((i % 4) - 1.5) * 0.03; }
      for (const sx of [-1, 1]) box(0.003, 0.004, 0.246, GUN, BX + sx * 0.029, 0.236, BZ);   // binding wire along each side of the rows
    }
    // fire extinguisher on the bottom shelf between the jerry can and the toolboxes
    const EX = -0.18, EZ = 0.08, RED = mat(C.cRed, 'metal', 0.75, 0.2, 1.05);
    cyl(0.052, 0.052, 0.01, 12, GUN, EX, y0 + 0.005, EZ);
    cyl(0.05, 0.05, 0.22, 12, RED, EX, y0 + 0.12, EZ);
    mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0.04, 0.02), new THREE.Vector2(0.015, 0.035), new THREE.Vector2(0.001, 0.04)], 12), RED, EX, y0 + 0.23, EZ);
    cyl(0.015, 0.015, 0.04, 8, GUN, EX, y0 + 0.28, EZ);
    box(0.06, 0.008, 0.02, GUN, EX + 0.02, y0 + 0.305, EZ).rotation.z = 0.3;
    box(0.06, 0.05, 0.002, PLATE, EX, y0 + 0.13, EZ + 0.051);
    { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(EX + 0.012, y0 + 0.27, EZ + 0.02), new THREE.Vector3(EX + 0.055, y0 + 0.2, EZ + 0.05), new THREE.Vector3(EX + 0.05, y0 + 0.05, EZ + 0.04)]); mesh(new THREE.TubeGeometry(c, 10, 0.006, 5, false), mat(C.rubber, '', 0.9, 0), 0, 0, 0); }
    // top shelf: funnel, folded tarp, coil of wire
    const yTop = shelves[4] + 0.004;
    mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.012, 0), new THREE.Vector2(0.012, 0.06), new THREE.Vector2(0.07, 0.14), new THREE.Vector2(0.075, 0.145), new THREE.Vector2(0.07, 0.15), new THREE.Vector2(0.065, 0.142), new THREE.Vector2(0.011, 0.065), new THREE.Vector2(0.001, 0.065)], 10), mat(C.galv, 'metal', 0.7, 0.5, 0.92, { side: DS }), 0.4, yTop, -0.1);
    box(0.3, 0.07, 0.24, mat(C.khaki, 'fabric', 0.94, 0, 0.95), 0.0, yTop + 0.035, 0.05);
    box(0.28, 0.008, 0.22, mat(C.khaki, 'fabric', 0.94, 0, 1.08), 0.01, yTop + 0.074, 0.06);
    dust(0.28, 0.22, 0.01, yTop + 0.078, 0.06, 0.03);
    const wc = mesh(new THREE.TorusGeometry(0.06, 0.008, 5, 12), GUN, -0.35, yTop + 0.012, -0.12); wc.rotation.x = Math.PI / 2;
    // back tie bars, side plated panel, tarp ties
    for (const y of [1.76, 0.14]) { box(SW - 0.06, 0.03, 0.004, GALV_N, 0, y, -SD / 2 - 0.003); for (const sx of [-1, 1]) bolt(sx * (SW / 2 - 0.06), y, -SD / 2 - 0.0055, '-z', 0.006, y > 1 ? 0.06 : 0); }
    box(0.004, 0.08, 0.12, PLATE, SW / 2 + 0.002, 1.5, 0);
    for (const dz of [-0.045, 0.045]) bolt(SW / 2 + 0.0045, 1.5, dz, 'x', 0.004, dz > 0 ? 0.04 : 0);
    for (const x of [0.1, 0.36]) { const t = cyl(0.006, 0.006, 0.03, 6, mat(C.sandbag, 'fabric', 0.9, 0, 0.9), x, 0.55, SD / 2 + 0.02); t.rotation.x = Math.PI / 2; }
  })();
  // contract: measure vertices, base at y=0, centred on x and z
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
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mx) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mx)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
