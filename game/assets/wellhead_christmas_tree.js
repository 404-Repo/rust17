// wellhead_christmas_tree c2: different reading. Gate valve bodies read as cast rectangular blocks
// with round flanged necks (the way real API gate valves look), every flange pair is a stud ring
// with visible nuts, the cross is a forged block, wheels have five spokes and a rim bead, the
// master valve at the bottom carries its own small wheel, plate has a sand drift over one corner.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (r, h, seg, m, x, y, z, parent = g) => add(new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z, parent);
  const wedge = (len, out, h, m, x, y, z, ry, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o;
  };

  const mConc = mat(P.concB, 'stone', 0.95, 0.0);
  const mConcS = mat(P.concS, 'stone', 0.95, 0.0);
  const mBlockS = mat(shade(P.steel, 1.06), 'metal', 0.85, 0.25);
  const mBlockN = mat(shade(P.steel, 0.9), 'metal', 0.88, 0.25);
  const mBody = mat(P.steel, 'metal', 0.85, 0.25, true);
  const mFlange = mat(shade(P.steel, 0.82), 'metal', 0.8, 0.3);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mWheel = mat(P.red, 'metal', 0.85, 0.1);
  const mWheelB = mat(shade(P.red, 1.08), 'metal', 0.85, 0.1);
  const mYellow = mat(P.yellow, 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mDial = mat(P.galv, 'metal', 0.7, 0.2);

  // plate
  box(1.2, 0.07, 1.2, mConcS, 0, 0.035, 0);
  box(1.2, 0.06, 1.2, mConc, 0, 0.1, 0);
  box(1.1, 0.006, 1.1, mDust, 0, 0.133, 0);
  for (const c of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) { cyl(0.02, 0.03, 6, mBolt, c[0], 0.145, c[1]); }
  box(0.03, 0.06, 0.006, mRust, 0.5, 0.1, 0.603); box(0.03, 0.06, 0.006, mRust, -0.5, 0.1, 0.603);
  add(new THREE.LatheGeometry([new THREE.Vector2(0.3, 0.21), new THREE.Vector2(0.45, 0.165), new THREE.Vector2(0.58, 0.135)], 14), mSand, 0, 0, 0);
  const corner = add(new THREE.LatheGeometry([new THREE.Vector2(0, 0.24), new THREE.Vector2(0.15, 0.19), new THREE.Vector2(0.28, 0.135)], 10), mSand, 0.4, 0, 0.4);
  wedge(0.9, 0.1, 0.1, mSand, 0.6, 0, 0.15, 0);
  wedge(0.5, 0.1, 0.1, mSand, -0.3, 0, -0.6, PI / 2);

  // two tone block: south face lighter
  const block = (w, h, d, y) => {
    box(w, h, d * 0.5, mBlockS, 0, y, d * 0.25);
    box(w, h, d * 0.5, mBlockN, 0, y, -d * 0.25);
    box(w - 0.06, 0.006, d - 0.06, mDust, 0, y + h / 2 + 0.003, 0);
  };
  const studRing = (y, r, n, rot = 0) => {
    cyl(r, 0.04, 14, mFlange, 0, y + 0.02, 0);
    cyl(r, 0.04, 14, mFlange, 0, y + 0.06, 0);
    cyl(r + 0.01, 0.015, 14, mRust, 0, y + 0.04, 0);
    for (let i = 0; i < n; i++) {
      const a = i * 2 * PI / n + rot;
      cyl(0.012, 0.13, 6, mBolt, (r - 0.04) * Math.cos(a), y + 0.04, (r - 0.04) * Math.sin(a));
      cyl(0.02, 0.02, 6, mBolt, (r - 0.04) * Math.cos(a), y + 0.09, (r - 0.04) * Math.sin(a));
      cyl(0.02, 0.02, 6, mBolt, (r - 0.04) * Math.cos(a), y - 0.01, (r - 0.04) * Math.sin(a));
    }
    add(new THREE.RingGeometry(0.15, r - 0.05, 14), mDust, 0, y + 0.081, 0).rotation.x = -PI / 2;
  };
  const drips = (y, r, count, len) => { for (let i = 0; i < count; i++) { const a = i * 2 * PI / count + 0.3; const d = box(0.025, len, 0.005, mRust, r * Math.cos(a), y, r * Math.sin(a)); d.rotation.y = -a + PI / 2; } };
  // base flange
  cyl(0.3, 0.1, 16, mFlange, 0, 0.18, 0);
  for (let i = 0; i < 16; i++) { const a = i * PI / 8; cyl(0.016, 0.03, 6, mBolt, 0.26 * Math.cos(a), 0.245, 0.26 * Math.sin(a)); }
  add(new THREE.RingGeometry(0.15, 0.24, 16), mDust, 0, 0.231, 0).rotation.x = -PI / 2;
  cyl(0.31, 0.03, 16, mRust, 0, 0.145, 0);
  // spool and master valve (block with its own small wheel on +Z)
  cyl(0.13, 0.22, 12, mBody, 0, 0.34, 0);
  studRing(0.44, 0.21, 8);
  block(0.34, 0.36, 0.26, 0.7);
  cyl(0.15, 0.36, 12, mBody, 0, 0.7, 0);
  drips(0.36, 0.131, 3, 0.09);
  cyl(0.04, 0.08, 8, mFlange, 0, 0.7, 0.17).rotation.x = PI / 2;
  cyl(0.01, 0.06, 6, mStem, 0, 0.7, 0.23).rotation.x = PI / 2;
  const mw = new THREE.Group(); mw.position.set(0, 0.7, 0.27); mw.rotation.x = PI / 2; g.add(mw);
  add(new THREE.TorusGeometry(0.09, 0.012, 6, 12), mWheel, 0, 0, 0, mw).rotation.x = PI / 2;
  for (let i = 0; i < 3; i++) { const sp = box(0.17, 0.01, 0.016, mWheel, 0, 0, 0, mw); sp.rotation.y = i * PI / 3; }
  studRing(0.88, 0.21, 8, PI / 8);
  drips(0.83, 0.171, 4, 0.1);
  // second valve
  block(0.34, 0.36, 0.26, 1.14);
  cyl(0.15, 0.36, 12, mBody, 0, 1.14, 0);
  drips(1.27, 0.171, 3, 0.12);
  // cross block at 1.5
  cyl(0.14, 0.2, 12, mBody, 0, 1.42, 0);
  block(0.3, 0.26, 0.3, 1.5);
  for (const s of [-1, 1]) {
    cyl(0.1, 0.12, 12, mBody, s * 0.17, 1.5, 0).rotation.z = PI / 2;
    for (const fx of [0.23, 0.27]) cyl(0.15, 0.04, 12, mFlange, s * fx, 1.5, 0).rotation.z = PI / 2;
    cyl(0.16, 0.015, 12, mRust, s * 0.25, 1.5, 0).rotation.z = PI / 2;
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; const b = cyl(0.012, 0.13, 6, mBolt, s * 0.25, 1.5 + 0.11 * Math.cos(a), 0.11 * Math.sin(a)); b.rotation.z = PI / 2; }
    // wing valve block
    box(0.2, 0.3, 0.14, mBlockS, s * 0.41, 1.5, 0.035); box(0.2, 0.3, 0.14, mBlockN, s * 0.41, 1.5, -0.035);
    cyl(0.12, 0.2, 12, mBody, s * 0.41, 1.5, 0).rotation.z = PI / 2;
    box(0.14, 0.006, 0.08, mDust, s * 0.41, 1.653, 0);
    box(0.025, 0.1, 0.005, mRust, s * 0.36, 1.4, 0.071);
    cyl(0.055, 0.04, 10, mFlange, s * 0.53, 1.5, 0).rotation.z = PI / 2;
    cyl(0.012, 0.1, 6, mStem, s * 0.58, 1.5, 0).rotation.z = PI / 2;
    const w = new THREE.Group(); w.position.set(s * 0.63, 1.5, 0); w.rotation.z = PI / 2; g.add(w);
    add(new THREE.TorusGeometry(0.185, 0.016, 6, 14), s > 0 ? mWheelB : mWheel, 0, 0, 0, w).rotation.x = PI / 2;
    for (let i = 0; i < 5; i++) { const sp = box(0.18, 0.012, 0.02, mWheel, 0, 0, 0, w); sp.rotation.y = i * 2 * PI / 5; sp.position.set(0.09 * Math.cos(i * 2 * PI / 5), 0, -0.09 * Math.sin(i * 2 * PI / 5)); }
    cyl(0.035, 0.04, 8, mWheel, 0, 0, 0, w);
    cyl(0.016, 0.02, 6, mBolt, 0, 0.03, 0, w);
  }
  studRing(1.63, 0.21, 8);
  // third valve
  block(0.34, 0.3, 0.26, 1.86);
  cyl(0.15, 0.3, 12, mBody, 0, 1.86, 0);
  drips(1.72, 0.171, 3, 0.08);
  studRing(2.01, 0.21, 8, PI / 8);
  // top cap, yellow band, swab valve, gauge
  cyl(0.19, 0.08, 14, mYellow, 0, 2.13, 0);
  cyl(0.16, 0.04, 14, mFlange, 0, 2.19, 0);
  add(new THREE.RingGeometry(0.06, 0.15, 14), mDust, 0, 2.211, 0).rotation.x = -PI / 2;
  cyl(0.055, 0.12, 10, mBody, 0, 2.27, 0);
  cyl(0.07, 0.03, 10, mFlange, 0, 2.345, 0);
  cyl(0.02, 0.04, 6, mStem, 0, 2.38, 0);
  cyl(0.012, 0.08, 6, mStem, -0.06, 2.29, 0.06).rotation.x = PI / 2;
  const gauge = cyl(0.045, 0.03, 12, mBody, -0.06, 2.31, 0.11); gauge.rotation.x = PI / 2;
  add(new THREE.CircleGeometry(0.036, 12), mDial, -0.06, 2.31, 0.126);
  box(0.02, 0.06, 0.005, mRust, 0.04, 2.06, 0.191);

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
