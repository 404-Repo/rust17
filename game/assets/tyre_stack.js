// tyre_stack candidate 1: primitives. Each tyre is a torus (major 0.39, tube 0.11, so the
// outside is 1.0 m and the opening 0.56 m) with a squashed section, twelve tread blocks as
// boxes, a bead ring, rims in the top two, rust, dust on the top tread, a sand mound.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, tank: 0x9c988c, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.0, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };

  const SEG = 20, W = 0.22;
  const rubber = (f) => new THREE.MeshStandardMaterial({ color: tint(0x2a2a2a, f), roughness: 0.92, metalness: 0.0 });
  const dusted = new THREE.MeshStandardMaterial({ color: 0x5c5546, roughness: 0.95, metalness: 0.0 });
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const rimM = mat(tint(C.tank, 0.95), 'metal', 0.8, 0.3, THREE.DoubleSide);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const gun = mat(C.gun, 'metal', 0.7, 0.4);

  const torGeo = new THREE.TorusGeometry(0.385, 0.115, 8, SEG);
  const blockGeo = new THREE.BoxGeometry(0.1, 0.12, 0.024);
  const tyre = (x, y, z, rx, shade, rim, dustTop) => {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.x = rx; g.add(t);
    const body = add(torGeo, rubber(shade), 0, W / 2, 0, t); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, W / 0.23);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = add(blockGeo, i % 3 === 0 ? dusted : rubber(shade * 1.1), Math.cos(a) * 0.488, W / 2, Math.sin(a) * 0.488, t);
      b.rotation.y = Math.PI / 2 - a;
    }
    add(new THREE.TorusGeometry(0.30, 0.012, 5, SEG), rubber(shade * 0.85), 0, W - 0.01, 0, t).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.30, 0.012, 5, SEG), rubber(shade * 0.85), 0, 0.01, 0, t).rotation.x = Math.PI / 2;
    if (dustTop) {
      // dust drifted across the top sidewall on the windward side, not a full ring
      add(new THREE.RingGeometry(0.32, 0.45, 12, 1, Math.PI * 0.55, Math.PI * 1.1), dustM, 0, W + 0.002, 0, t).rotation.x = -Math.PI / 2;
      add(new THREE.RingGeometry(0.34, 0.42, 6, 1, Math.PI * 1.85, Math.PI * 0.45), dustM, 0, W + 0.002, 0, t).rotation.x = -Math.PI / 2;
    }
    if (rim) {
      cyl(0.285, 0.285, 0.03, SEG, rimM, 0, W * 0.45, 0, t);
      cyl(0.12, 0.12, 0.05, 12, rimM, 0, W * 0.5, 0, t);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(0.012, 0.012, 0.012, 6, gun, Math.cos(a) * 0.16, W * 0.45 + 0.02, Math.sin(a) * 0.16, t); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; cyl(0.03, 0.03, 0.032, 8, rubber(0.9), Math.cos(a) * 0.21, W * 0.45, Math.sin(a) * 0.21, t); }
    }
    return t;
  };
  tyre(0.0, 0.0, 0.0, 0, 0.9, false, false);
  tyre(0.05, W, 0.03, 0, 1.0, false, false);
  tyre(-0.02, 2 * W, -0.04, 0, 0.95, false, false);
  tyre(0.04, 3 * W, 0.02, 0, 1.05, true, false);
  tyre(-0.03, 4 * W + 0.06, -0.01, 0.14, 1.0, true, true);
  drip(0.16, 0.05, rustM, 0.04, 3 * W - 0.01, 0.5 + 0.026, 0);
  drip(0.12, 0.04, rustM, 0.2, 3 * W - 0.01, 0.48, 0.4);
  drip(0.14, 0.05, rustM, -0.1, 2 * W + 0.02, 0.466, -0.2);
  drip(0.1, 0.04, rustM, 0.545, 2 * W + 0.04, 0.05, Math.PI / 2);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  add(new THREE.LatheGeometry([new THREE.Vector2(0.3, 0.1), new THREE.Vector2(0.46, 0.09), new THREE.Vector2(0.52, 0.03), new THREE.Vector2(0.55, 0.0)], SEG), fill, 0, 0, 0);
  const drift = add(new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.16), new THREE.Vector2(0.3, 0.12), new THREE.Vector2(0.5, 0.03), new THREE.Vector2(0.55, 0.0)], SEG), fill, 0, 0, -0.05);
  drift.scale.set(1, 1, 0.9);

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pp = n.isMesh && n.geometry.attributes.position; if (!pp) return;
    const put = (mm) => { for (let i = 0; i < pp.count; i++) box3.expandByPoint(v.fromBufferAttribute(pp, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
