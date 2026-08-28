// ammo_crate candidate 1: profiles. The body is the end profile (a rectangle with a pressed
// rib line) extruded along x, the lid is a profile with the rim lip and the two raised ribs
// built into it and extruded along x. Handles are half tori, latch and hinges are small parts.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, olive: 0x4e5238, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.8, metalness = 0.15, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  // extrude a (z, y) profile along x, centred
  const sweep = (pts, len, m) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m); o.rotation.y = Math.PI / 2; return o;
  };

  const W = 0.6, D = 0.35, H = 0.3, lidT = 0.03, bodyH = H - lidT;
  const oliveN = mat(C.olive, 'metal');
  const oliveS = mat(tint(C.olive, 1.08), 'metal');
  const oliveTop = mat(tint(C.olive, 1.04), 'metal');
  const oliveDark = mat(tint(C.olive, 0.8), 'metal');
  const gun = mat(C.gun, 'metal', 0.65, 0.5);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  // body profile: box outline with a pressed swage line at 0.1 on both faces
  const h = D / 2;
  sweep([[-h, 0], [h, 0], [h, 0.09], [h + 0.004, 0.095], [h + 0.004, 0.105], [h, 0.11], [h, bodyH],
    [-h, bodyH], [-h, 0.11], [-h - 0.004, 0.105], [-h - 0.004, 0.095], [-h, 0.09]], W, oliveN);
  box(W - 0.004, bodyH - 0.13, 0.004, oliveS, 0, bodyH / 2 + 0.06, h + 0.001);
  box(W - 0.004, 0.08, 0.004, oliveS, 0, 0.045, h + 0.001);
  // lid profile: 10 mm overhang, a rim lip, two raised ribs 8 mm high
  const l = h + 0.01, y0 = bodyH, y1 = H;
  sweep([[-l, y0], [l, y0], [l, y1], [l - 0.012, y1], [l - 0.012, y1 + 0.008], [l - 0.024, y1 + 0.008], [l - 0.024, y1],
    [0.07, y1], [0.07, y1 + 0.008], [0.05, y1 + 0.008], [0.05, y1], [-0.05, y1], [-0.05, y1 + 0.008], [-0.07, y1 + 0.008], [-0.07, y1],
    [-l + 0.024, y1], [-l + 0.024, y1 + 0.008], [-l + 0.012, y1 + 0.008], [-l + 0.012, y1], [-l, y1]], W + 0.02, oliveTop);
  // rim lip across the ends of the lid
  box(0.012, 0.008, D + 0.02, oliveDark, W / 2 + 0.004, H + 0.004, 0);
  box(0.012, 0.008, D + 0.02, oliveDark, -W / 2 - 0.004, H + 0.004, 0);
  box(0.16, 0.005, 0.09, dustM, -0.15, H + 0.0105, 0);
  box(0.16, 0.005, 0.09, dustM, 0.18, H + 0.0105, 0);
  // latch: hasp on the lid edge, staple and spring on the body
  box(0.04, 0.05, 0.006, oliveDark, 0, bodyH + 0.006, l + 0.003);
  box(0.05, 0.06, 0.006, gun, 0, bodyH - 0.035, h + 0.003);
  cyl(0.006, 0.006, 0.035, 8, gun, 0, bodyH - 0.02, h + 0.012);
  box(0.03, 0.02, 0.004, gun, 0, bodyH - 0.05, h + 0.014);
  // handles: pressed bracket and a wire loop, each end
  for (const s of [-1, 1]) {
    box(0.006, 0.05, 0.08, oliveDark, s * (W / 2 + 0.003), bodyH * 0.55, 0);
    const loop = add(new THREE.TorusGeometry(0.035, 0.005, 6, 10, Math.PI), gun, s * (W / 2 + 0.012), bodyH * 0.5, 0);
    loop.rotation.y = s * Math.PI / 2; loop.rotation.z = Math.PI;
    box(0.012, 0.012, 0.09, gun, s * (W / 2 + 0.009), bodyH * 0.53, 0);
    drip(0.06, 0.02, rustM, s * (W / 2 + 0.001), bodyH * 0.52 - 0.04, 0, s * Math.PI / 2);
  }
  // hinges at the back with rust
  for (const x of [-0.18, 0.18]) {
    cyl(0.009, 0.009, 0.07, 8, gun, x, bodyH + 0.002, -l + 0.002).rotation.z = Math.PI / 2;
    box(0.06, 0.04, 0.005, oliveDark, x, bodyH - 0.025, -h - 0.003);
    box(0.06, 0.008, 0.03, oliveDark, x, H - 0.005, -l + 0.01);
    box(0.02, 0.02, 0.008, rustM, x, bodyH - 0.008, -h - 0.005);
    drip(0.12, 0.04, rustM, x, bodyH - 0.02, -h - 0.004, Math.PI);
  }
  // name plate and rivets
  box(0.15, 0.08, 0.004, oliveDark, -0.12, 0.18, h + 0.004);
  for (const px of [-0.065, 0.065]) for (const py of [-0.03, 0.03]) cyl(0.004, 0.004, 0.004, 6, gun, -0.12 + px, 0.18 + py, h + 0.008).rotation.x = Math.PI / 2;
  // scuffs to gunmetal along the edges
  box(W + 0.02, 0.004, 0.004, gun, 0, H, l);
  box(0.004, bodyH, 0.004, gun, W / 2, bodyH / 2, h);
  box(0.004, bodyH, 0.004, gun, -W / 2, bodyH / 2, h);
  box(W, 0.004, 0.004, gun, 0, 0.002, h);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.012, 0); s.lineTo(0, 0.03); s.closePath();
  const fg = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); fg.translate(0, 0, -0.25);
  const f1 = add(fg, fill, 0, 0, h); f1.rotation.y = -Math.PI / 2;
  const fg2 = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); fg2.translate(0, 0, -0.15);
  add(fg2, fill, -W / 2, 0, 0).rotation.y = Math.PI;

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
