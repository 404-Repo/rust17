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
  // control_cabinet c1: profile built. Body as an extruded rectangular ring (an open fronted shell) closed by a back plate,
  // door as an extruded shape with a real window hole, plinth from a stepped profile, conduits as tubes on a bent path,
  // lenses as lathe domes, hinge knuckles as lathes.
  const W = 0.78, D = 0.36, BY0 = 0.1, BY1 = 1.6;
  const BLUE = mat(C.cBlue, 'metal', 0.82, 0.2, 1.05, { side: DS });
  const BLUE_S = mat(C.cBlue, 'metal', 0.8, 0.2, 1.16, { side: DS });
  const BLUE_N = mat(C.cBlue, 'metal', 0.84, 0.2, 0.9, { side: DS });
  const GUN = mat(C.gun, 'metal', 0.7, 0.45);
  const GALV = mat(C.galv, 'metal', 0.72, 0.5);
  const PLATE = mat(C.galv, 'metal', 0.7, 0.45, 1.1);
  const rect = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; };
  const holeRect = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath(); return p; };
  // plinth: stepped profile in (z, y) extruded across the width
  const pp = new THREE.Shape(); pp.moveTo(-D / 2 + 0.015, 0); pp.lineTo(D / 2 - 0.04, 0); pp.lineTo(D / 2 - 0.04, 0.06); pp.lineTo(D / 2 - 0.015, 0.06); pp.lineTo(D / 2 - 0.015, BY0); pp.lineTo(-D / 2 + 0.015, BY0); pp.closePath();
  const pg = new THREE.ExtrudeGeometry(pp, { depth: W - 0.04, bevelEnabled: false }); pg.rotateY(Math.PI / 2); pg.scale(1, 1, -1);
  mesh(pg, RUST(), -(W - 0.04) / 2, 0, 0);
  // shell: ring in (x, y) with the front open, extruded along z, plus a back plate
  const ring = rect(-W / 2, BY0, W / 2, BY1); ring.holes.push(holeRect(-W / 2 + 0.012, BY0 + 0.012, W / 2 - 0.012, BY1 - 0.012));
  const rg = new THREE.ExtrudeGeometry(ring, { depth: D, bevelEnabled: false });
  mesh(rg, BLUE, 0, 0, -D / 2);
  mesh(new THREE.ExtrudeGeometry(rect(-W / 2 + 0.01, BY0 + 0.01, W / 2 - 0.01, BY1 - 0.01), { depth: 0.012, bevelEnabled: false }), BLUE_N, 0, 0, -D / 2);
  // front frame ring around the door opening
  const ff = rect(-W / 2, BY0, W / 2, BY1); ff.holes.push(holeRect(-0.33, 0.25, 0.33, 1.55));
  mesh(new THREE.ExtrudeGeometry(ff, { depth: 0.012, bevelEnabled: false }), BLUE_S, 0, 0, D / 2 - 0.012);
  const zf = D / 2;
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const y = 0.3 + i * 0.24; bolt(sx * (W / 2 - 0.03), y, zf + 0.0005, 'z', 0.007, i % 2 ? 0.1 : 0.04); }
  box(W + 0.02, 0.02, D + 0.02, mat(C.cBlue, 'metal', 0.8, 0.2, 1.0), 0, BY1 + 0.01, 0);
  dust(W, D, 0, BY1 + 0.02, 0, 0.04);
  // door: shape with a window hole and a handle recess hole
  const ds = rect(-0.325, 0.255, 0.325, 1.545);
  ds.holes.push(holeRect(-0.02, 1.285, 0.18, 1.435));
  ds.holes.push(holeRect(-0.255, 0.92, -0.185, 1.08));
  mesh(new THREE.ExtrudeGeometry(ds, { depth: 0.015, bevelEnabled: false }), BLUE_S, 0, 0, zf);
  box(0.22, 0.17, 0.004, mat(0x5a6068, '', 0.5, 0.3), 0.08, 1.36, zf + 0.004);            // glass behind the hole
  for (const [w, h, dx, dy] of [[0.22, 0.01, 0, 0.08], [0.22, 0.01, 0, -0.08], [0.01, 0.17, 0.105, 0], [0.01, 0.17, -0.105, 0]]) box(w, h, 0.006, GALV, 0.08 + dx, 1.36 + dy, zf + 0.017);
  for (const dx of [-0.1, 0.1]) for (const dy of [-0.075, 0.075]) bolt(0.08 + dx, 1.36 + dy, zf + 0.02, 'z', 0.004, dy < 0 ? 0.03 : 0);
  box(0.08, 0.17, 0.004, GUN, -0.22, 1.0, zf + 0.004);                                     // handle recess floor
  box(0.02, 0.11, 0.02, mat(C.steel, 'metal', 0.6, 0.5), -0.22, 1.0, zf + 0.016);
  streak(-0.22, 0.915, zf + 0.015, 'z', 0.2, 0.03);
  for (const sx of [-1, 1]) box(0.008, 1.29, 0.002, GUN, sx * 0.321, 0.9, zf + 0.016);
  box(0.65, 0.008, 0.002, GUN, 0, 1.541, zf + 0.016);
  box(0.63, 0.06, 0.002, RUST(), 0, 0.29, zf + 0.016);
  // lens domes
  const lensCols = [C.cRed, C.olive, C.cRed, C.olive, C.lamp, C.rust];
  const dome = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.011, 0), new THREE.Vector2(0.01, 0.006), new THREE.Vector2(0.006, 0.01), new THREE.Vector2(0.001, 0.012)], 10);
  for (let i = 0; i < 6; i++) {
    const x = 0.02 + (i % 2) * 0.1, y = 1.16 - Math.floor(i / 2) * 0.06;
    mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 10), BOLT(), x, y, zf + 0.017);
    const lit = i === 4;
    const lm = lit ? mat(C.lamp, '', 0.5, 0, 1, { emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 1.2 }) : mat(lensCols[i], '', 0.5, 0.1, 0.9);
    const l = mesh(dome, lm, x, y, zf + 0.016); l.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 4; i++) { const x = -0.15 + i * 0.1; box(0.09, 0.09, 0.004, PLATE, x, 0.78, zf + 0.017); for (const dx of [-0.035, 0.035]) bolt(x + dx, 0.815, zf + 0.02, 'z', 0.003, 0); }
  // hinge knuckles as lathes
  const kn = new THREE.LatheGeometry([new THREE.Vector2(0.001, -0.05), new THREE.Vector2(0.011, -0.05), new THREE.Vector2(0.011, -0.02), new THREE.Vector2(0.013, -0.02), new THREE.Vector2(0.013, 0.02), new THREE.Vector2(0.011, 0.02), new THREE.Vector2(0.011, 0.05), new THREE.Vector2(0.001, 0.05)], 8);
  for (const y of [0.45, 1.35]) { mesh(kn, GUN, 0.335, y, zf + 0.012); box(0.03, 0.06, 0.006, GUN, 0.31, y, zf + 0.017); streak(0.335, y - 0.05, zf + 0.02, 'z', 0.12, 0.02); }
  // sides
  for (const sx of [-1, 1]) {
    const n = sx > 0 ? 'x' : '-x', xf = sx * (W / 2 + 0.0005);
    box(0.003, 0.004, D - 0.04, GUN, xf, 0.85, 0);
    const lv = rect(-0.1, 1.26, 0.1, 1.42); for (let i = 0; i < 4; i++) lv.holes.push(holeRect(-0.08, 1.28 + i * 0.035, 0.08, 1.29 + i * 0.035));
    const lg = new THREE.ExtrudeGeometry(lv, { depth: 0.005, bevelEnabled: false }); lg.rotateY(sx * Math.PI / 2);
    mesh(lg, mat(C.cBlue, 'metal', 0.8, 0.2, 1.15), sx * W / 2, 0, 0.02);
    for (let i = 0; i < 5; i++) for (const z of [-0.15, 0.15]) bolt(xf, 0.25 + i * 0.3, z, n, 0.007, i % 2 ? 0.08 : 0);
    streak(xf, 1.25, 0.02, n, 0.25, 0.05);
  }
  // back ribs and gland
  for (const y of [0.55, 1.15]) { box(W - 0.02, 0.04, 0.012, BLUE_N, 0, y, -D / 2 - 0.006); for (const x of [-0.3, 0, 0.3]) bolt(x, y, -D / 2 - 0.012, '-z', 0.008, 0.12); }
  for (const sx of [-1, 1]) for (const y of [0.25, 1.5]) bolt(sx * (W / 2 - 0.03), y, -D / 2 - 0.0005, '-z', 0.008, 0.08);
  box(0.12, 0.08, 0.02, GUN, 0.2, 0.3, -D / 2 - 0.01);
  cyl(0.009, 0.009, 0.26, 6, mat(C.rubber, '', 0.9, 0), 0.2, 0.13, -D / 2 - 0.02);
  // conduits as tubes on a bent path
  box(0.3, 0.03, 0.12, GUN, -0.14, BY1 + 0.035, 0.06);
  for (let i = 0; i < 3; i++) {
    const x = -0.24 + i * 0.1, r = 0.025, top = 1.9 - r;
    cyl(0.035, 0.035, 0.03, 8, GUN, x, BY1 + 0.065, 0.06);
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(new THREE.Vector3(x, BY1 + 0.08, 0.06), new THREE.Vector3(x, top - 0.07, 0.06)));
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, top - 0.07, 0.06), new THREE.Vector3(x, top, 0.06), new THREE.Vector3(x, top, -0.01)));
    path.add(new THREE.LineCurve3(new THREE.Vector3(x, top, -0.01), new THREE.Vector3(x, top, -D / 2)));
    mesh(new THREE.TubeGeometry(path, 20, r, 10, false), GALV, 0, 0, 0);
    mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, top - 0.07, 0.06), new THREE.Vector3(x, top, 0.06), new THREE.Vector3(x, top, -0.01)), 8, r + 0.002, 10, false), RUST(), 0, 0, 0);
    cyl(0.03, 0.03, 0.02, 8, RUST(), x, BY1 + 0.15, 0.06);
  }
  fillet('front', W - 0.1, 0, D / 2 - 0.015, 0.03, 0.05, 0.05);
  fillet('left', D - 0.06, 0, -W / 2 + 0.02, 0.04, 0.06, 0.05);
  fillet('right', D - 0.06, 0, W / 2 - 0.02, 0.04, 0.05, 0.05);
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
