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
    const o = cyl(r, r, h, 6, BOLT(), 0, 0, 0, parent); aim(o, n);
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
    for (let i = 0; i < 17; i++) { const h = new THREE.Path(); h.absarc(0, 0.08 + i * 0.1, 0.006, 0, Math.PI * 2, true); s.holes.push(h); }
    return new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 4 });
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
    mesh(new THREE.LatheGeometry(tinPts, 10), mat(C.tankB, 'metal', 0.7, 0.35, 0.95 + (i % 3) * 0.05, { side: DS }), x, y2, z);
    cyl(0.06, 0.06, 0.004, 10, mat(lidCols[i], 'metal', 0.7, 0.3, 1.1), x, y2 + 0.202, z);
    const hd = mesh(new THREE.TorusGeometry(0.075, 0.003, 4, 10, Math.PI), GUN, x, y2 + 0.2, z); hd.rotation.y = 0.3 * i;
    box(0.144, 0.05, 0.002, mat(C.sandbag, 'fabric', 0.9, 0), x, y2 + 0.1, z + 0.072);
    streak(x - 0.02, y2 + 0.19, z + 0.072, 'z', 0.1, 0.02);
  }
  // rope coils and blankets as S folds
  const y1 = shelves[1] + 0.004;
  for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(0.065, 0.028, 6, 12), mat(C.sandbag, 'fabric', 0.95, 0, 0.95 + i * 0.04), -0.32 + i * 0.16, y1 + 0.028, 0.02); r.rotation.x = Math.PI / 2; }
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
  // contract: measure vertices, base at y=0, centred on x and z
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
