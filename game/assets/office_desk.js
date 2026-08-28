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
  // office_desk c1: profile built and the reference read literally: drawers and modesty panel on the +Z face, chair behind.
  // Extruded L angle legs, C section pedestal shell, drawer fronts with pressed pulls, lathe lamp shade and mug,
  // a cantilever chair from one swept tube per side.
  const DW = 1.36, DD = 0.7, DH = 0.75, ZC = 0.3;
  const STEEL = mat(C.tankB, 'metal', 0.82, 0.25, 1.0, { side: DS });
  const STEEL_S = mat(C.tankB, 'metal', 0.8, 0.25, 1.08, { side: DS });
  const STEEL_N = mat(C.tankB, 'metal', 0.84, 0.25, 0.92, { side: DS });
  const TIMBER = mat(C.timber, 'timber', 0.85, 0);
  const GUN = mat(C.gun, 'metal', 0.7, 0.45);
  const CARD = mat(C.sandbag, 'fabric', 0.92, 0);
  const CANVAS = mat(C.khaki, 'fabric', 0.92, 0, 1.0, { side: DS });
  const zF = ZC + DD / 2, zB = ZC - DD / 2;
  const rect = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; };
  // top: plank profile with a chipped (stepped) front edge, extruded across the width
  const tp = new THREE.Shape(); tp.moveTo(-DD / 2, 0); tp.lineTo(DD / 2 - 0.015, 0); tp.lineTo(DD / 2 - 0.015, 0.012); tp.lineTo(DD / 2, 0.012); tp.lineTo(DD / 2, 0.03); tp.lineTo(-DD / 2, 0.03); tp.closePath();
  const tg = new THREE.ExtrudeGeometry(tp, { depth: DW, bevelEnabled: false }); tg.rotateY(Math.PI / 2); tg.scale(1, 1, -1);
  mesh(tg, TIMBER, -DW / 2, DH - 0.03, ZC);
  box(DW - 0.03, 0.006, DD - 0.03, mat(C.timber, 'timber', 0.85, 0, 1.15), 0, DH + 0.003, ZC);
  for (const x of [-0.5, 0.05, 0.45]) box(0.09, 0.02, 0.025, mat(C.timber, 'timber', 0.9, 0, 0.72), x, DH - 0.02, zF);
  dust(DW, DD, 0, DH + 0.006, ZC, 0.05);
  // steel edge trim strip under the top
  box(DW + 0.004, 0.02, DD + 0.004, STEEL_S, 0, DH - 0.04, ZC);
  // L angle legs
  function angleLeg(x, z, rotY) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.045, 0); s.lineTo(0.045, 0.006); s.lineTo(0.006, 0.006); s.lineTo(0.006, 0.045); s.lineTo(0, 0.045); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: DH - 0.05, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const o = mesh(geo, STEEL, x, 0, z); o.rotation.y = rotY;
    box(0.06, 0.01, 0.06, RUST(), x + (rotY === 0 || rotY === Math.PI / 2 ? 0.02 : -0.02), 0.005, z + (rotY === 0 || rotY === -Math.PI / 2 ? -0.02 : 0.02));
    return o;
  }
  angleLeg(-DW / 2, zF, 0); angleLeg(DW / 2, zF, Math.PI / 2); angleLeg(DW / 2, zB, Math.PI); angleLeg(-DW / 2, zB, -Math.PI / 2);
  for (const sx of [-1, 1]) for (const z of [zB, zF]) mound(sx * (DW / 2 - 0.02), z + (z > ZC ? -0.02 : 0.02), 0.06, 0.035);
  // modesty panel on +Z with a pressed X, and rivets along the top rail
  const mp = rect(-DW / 2 + 0.05, 0.2, 0.26, DH - 0.05);
  const mg = new THREE.ExtrudeGeometry(mp, { depth: 0.01, bevelEnabled: false });
  mesh(mg, STEEL_S, 0, 0, zF - 0.04);
  for (const s of [-1, 1]) { const b = box(0.03, 0.62, 0.005, mat(C.tankB, 'metal', 0.8, 0.25, 1.0), -0.21, 0.45, zF - 0.027); b.rotation.z = s * 0.95; }
  for (const x of [-0.6, -0.4, -0.2, 0.0, 0.2]) bolt(x, DH - 0.075, zF - 0.0295, 'z', 0.007, x % 0.4 === 0 ? 0.14 : 0.05);
  streak(-0.55, 0.42, zF - 0.0295, 'z', 0.22, 0.05);
  // left side panel
  mesh(new THREE.ExtrudeGeometry(rect(zB + 0.05, 0.2, zF - 0.05, DH - 0.05), { depth: 0.01, bevelEnabled: false }).rotateY(-Math.PI / 2), STEEL, -DW / 2 + 0.03, 0, 0);
  for (const dz of [-0.2, 0.2]) for (const dy of [-0.15, 0.15]) bolt(-DW / 2 + 0.019, 0.45 + dy, ZC + dz, '-x', 0.006, dy < 0 ? 0.1 : 0);
  // pedestal: C section shell (top, back, bottom) open toward +Z, with three drawer fronts filling the opening
  const PX = 0.46, PW = 0.38, PD = DD - 0.06;
  const cs = new THREE.Shape(); cs.moveTo(PD / 2, DH - 0.03); cs.lineTo(-PD / 2, DH - 0.03); cs.lineTo(-PD / 2, 0.08); cs.lineTo(PD / 2, 0.08); cs.lineTo(PD / 2, 0.092); cs.lineTo(-PD / 2 + 0.012, 0.092); cs.lineTo(-PD / 2 + 0.012, DH - 0.042); cs.lineTo(PD / 2, DH - 0.042); cs.closePath();
  const cg = new THREE.ExtrudeGeometry(cs, { depth: PW, bevelEnabled: false }); cg.rotateY(Math.PI / 2); cg.scale(1, 1, -1);
  mesh(cg, STEEL, PX - PW / 2, 0, ZC);
  for (const sx of [-1, 1]) box(0.012, DH - 0.122, PD, STEEL, PX + sx * (PW / 2 - 0.006), 0.08 + (DH - 0.122) / 2, ZC);
  box(PW - 0.04, 0.08, PD - 0.1, RUST(), PX, 0.04, ZC);
  for (let i = 0; i < 3; i++) {
    const y = 0.2 + i * 0.185;
    const df = rect(-PW / 2 + 0.02, -0.085, PW / 2 - 0.02, 0.085);
    const pull = new THREE.Path(); pull.moveTo(-0.05, -0.012); pull.lineTo(-0.05, 0.012); pull.lineTo(0.05, 0.012); pull.lineTo(0.05, -0.012); pull.closePath(); df.holes.push(pull);
    mesh(new THREE.ExtrudeGeometry(df, { depth: 0.012, bevelEnabled: false }), STEEL_S, PX, y, zF - 0.03);
    box(0.11, 0.03, 0.003, GUN, PX, y, zF - 0.026);   // recess behind the pull
    const h = cyl(0.005, 0.005, 0.09, 6, GUN, PX, y + 0.004, zF - 0.012); h.rotation.z = Math.PI / 2;
    streak(PX - 0.02, y - 0.014, zF - 0.0175, 'z', 0.09, 0.03);
    streak(PX + 0.12, y + 0.07, zF - 0.0175, 'z', 0.1, 0.02);
  }
  // lamp with a lathe shade
  const LX = -0.5, LZ = ZC + 0.18;
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.085, 0.015), new THREE.Vector2(0.03, 0.025), new THREE.Vector2(0.012, 0.03), new THREE.Vector2(0.001, 0.03)], 12), STEEL, LX, DH + 0.006, LZ);
  cyl(0.011, 0.011, 0.09, 8, STEEL, LX, DH + 0.07, LZ);
  const a1 = cyl(0.008, 0.008, 0.22, 6, STEEL, LX + 0.09, DH + 0.15, LZ - 0.03); a1.rotation.z = -1.0; a1.rotation.x = 0.2;
  const a2 = cyl(0.008, 0.008, 0.2, 6, STEEL, LX + 0.25, DH + 0.15, LZ - 0.08); a2.rotation.z = 1.2; a2.rotation.x = 0.2;
  const sp = cyl(0.005, 0.005, 0.15, 5, RUST(), LX + 0.1, DH + 0.15, LZ - 0.03); sp.rotation.z = -0.5;
  const sh = mesh(new THREE.LatheGeometry([new THREE.Vector2(0.075, 0), new THREE.Vector2(0.06, 0.05), new THREE.Vector2(0.03, 0.095), new THREE.Vector2(0.012, 0.1)], 12), mat(C.tankB, 'metal', 0.8, 0.25, 1.04, { side: DS }), LX + 0.34, DH + 0.065, LZ - 0.13); sh.rotation.x = 0.35;
  const lens = cyl(0.045, 0.045, 0.005, 12, mat(C.lamp, '', 0.6, 0, 1, { emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 0.9 }), LX + 0.34, DH + 0.075, LZ - 0.115); lens.rotation.x = 0.35;
  // box files: extruded profile with a spine ridge
  for (let i = 0; i < 3; i++) {
    const y = DH + 0.006 + i * 0.06;
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.22, 0); fs.lineTo(0.22, 0.06); fs.lineTo(0.215, 0.06); fs.lineTo(0.215, 0.05); fs.lineTo(0.0, 0.05); fs.lineTo(0, 0.06); fs.lineTo(-0.005, 0.06); fs.lineTo(-0.005, 0); fs.closePath();
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: false }); fg.rotateY(Math.PI / 2);
    mesh(fg, i === 1 ? mat(C.sandbag, 'fabric', 0.92, 0, 0.92) : CARD, -0.25 + (i % 2) * 0.015, y, ZC - 0.16);
    box(0.3, 0.06, 0.012, mat(C.khaki, 'fabric', 0.9, 0), -0.1 + (i % 2) * 0.015, y + 0.03, ZC - 0.16 + 0.006);
  }
  // telephone and lathe mug
  const TX = 0.3, TZ = ZC - 0.12;
  box(0.2, 0.05, 0.16, GUN, TX, DH + 0.031, TZ);
  const tt = box(0.18, 0.03, 0.1, GUN, TX, DH + 0.065, TZ + 0.02); tt.rotation.x = 0.25;
  const dial = cyl(0.035, 0.035, 0.006, 12, mat(C.tankB, 'metal', 0.7, 0.4), TX, DH + 0.085, TZ + 0.03); dial.rotation.x = 0.25;
  const hs = cyl(0.014, 0.014, 0.19, 8, GUN, TX, DH + 0.1, TZ - 0.04); hs.rotation.z = Math.PI / 2;
  for (const dx of [-0.085, 0.085]) cyl(0.028, 0.02, 0.03, 8, GUN, TX + dx, DH + 0.085, TZ - 0.04);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.036, 0), new THREE.Vector2(0.038, 0.06), new THREE.Vector2(0.041, 0.09), new THREE.Vector2(0.036, 0.09), new THREE.Vector2(0.033, 0.005), new THREE.Vector2(0.001, 0.005)], 10), mat(C.galv, 'metal', 0.7, 0.5, 0.95, { side: DS }), 0.6, DH + 0.006, ZC + 0.15);
  mesh(new THREE.TorusGeometry(0.02, 0.005, 5, 8), mat(C.galv, 'metal', 0.7, 0.5, 0.95), 0.64, DH + 0.05, ZC + 0.15);
  // cantilever chair: one continuous tube per side (floor runner, up, seat rail, up the back), pushed back behind the desk
  const CX = 0.0, CZ = zB - 0.35, TUBE = mat(C.tankB, 'metal', 0.8, 0.3, 0.98);
  for (const sx of [-1, 1]) {
    const x = CX + sx * 0.2;
    const p = new THREE.CurvePath();
    const P = [[x, 0.012, CZ - 0.22], [x, 0.012, CZ + 0.2], [x, 0.44, CZ + 0.2], [x, 0.44, CZ - 0.2], [x, 0.85, CZ - 0.25]];
    for (let i = 0; i < P.length - 1; i++) p.add(new THREE.LineCurve3(new THREE.Vector3(...P[i]), new THREE.Vector3(...P[i + 1])));
    mesh(new THREE.TubeGeometry(p, 16, 0.012, 8, false), TUBE, 0, 0, 0);
    box(0.03, 0.012, 0.05, RUST(), x, 0.006, CZ - 0.2); mound(x, CZ - 0.2, 0.05, 0.03); mound(x, CZ + 0.18, 0.05, 0.03);
    bolt(x + sx * 0.012, 0.6, CZ - 0.22, sx > 0 ? 'x' : '-x', 0.006, 0.05);
  }
  for (const z of [CZ + 0.2, CZ - 0.2]) { const r = cyl(0.01, 0.01, 0.4, 8, TUBE, CX, 0.44, z); r.rotation.z = Math.PI / 2; }
  const bt = cyl(0.011, 0.011, 0.4, 8, TUBE, CX, 0.85, CZ - 0.25); bt.rotation.z = Math.PI / 2;
  box(0.4, 0.02, 0.4, CANVAS, CX, 0.45, CZ);
  const bk = box(0.4, 0.24, 0.015, CANVAS, CX, 0.73, CZ - 0.235); bk.rotation.x = -0.12;
  fillet('left', DD, ZC, -DW / 2, 0.06, 0.08, 0.08);
  fillet('right', DD, ZC, DW / 2, 0.06, 0.07, 0.08);
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
