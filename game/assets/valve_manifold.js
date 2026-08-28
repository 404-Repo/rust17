// valve_manifold c2: different reading, closer to the reference. Each riser carries a cast gate
// valve with a side outlet toward +Z ending in a second, smaller red wheel, so the manifold reads
// as a bank of valves from the front. Stands are pipe stanchions with base plates; the header
// has a lifting lug and a drain plug; gauge with a bracket and drip.
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

  const mPipeS = mat(shade(P.steel, 1.08), 'metal', 0.85, 0.2, true);
  const mPipeN = mat(shade(P.steel, 0.95), 'metal', 0.85, 0.2, true);
  const mPipe = mat(P.steel, 'metal', 0.85, 0.2);
  const mBody = mat(shade(P.steel, 0.88), 'metal', 0.88, 0.25);
  const mBodyB = mat(shade(P.steel, 0.96), 'metal', 0.88, 0.25);
  const mFlange = mat(shade(P.steel, 0.84), 'metal', 0.8, 0.25);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mWheel = mat(shade(P.red, 1.05), 'metal', 0.85, 0.1);
  const mWheelD = mat(shade(P.red, 0.9), 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mStand = mat(shade(P.steel, 1.0), 'metal', 0.8, 0.3);
  const mDial = mat(P.galv, 'metal', 0.7, 0.2);

  const R = 0.15, AX = 0.8, L = 2.4, FT = 0.05, FR = 0.22;
  const hs = add(new THREE.CylinderGeometry(R, R, L - 2 * FT, 12, 1, true, -PI / 2, PI), mPipeS, 0, AX, 0); hs.rotation.z = PI / 2;
  const hn = add(new THREE.CylinderGeometry(R, R, L - 2 * FT, 12, 1, true, PI / 2, PI), mPipeN, 0, AX, 0); hn.rotation.z = PI / 2;
  const hd = add(new THREE.CylinderGeometry(R + 0.006, R + 0.006, L - 0.5, 3, 1, true, PI / 2 - 0.25, 0.5), mDust, 0, AX, 0); hd.rotation.z = PI / 2;
  const hr = add(new THREE.CylinderGeometry(R + 0.005, R + 0.005, L - 0.3, 3, 1, true, -PI / 2 - 0.12, 0.24), mRust, 0, AX, 0); hr.rotation.z = PI / 2;
  for (const s of [-1, 1]) {
    const f = cyl(FR, FT, 12, mFlange, s * (L / 2 - FT / 2), AX, 0); f.rotation.z = PI / 2;
    const rr = cyl(R + 0.012, 0.05, 12, mRust, s * (L / 2 - FT - 0.025), AX, 0); rr.rotation.z = PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * PI / 4 + PI / 8;
      const by = AX + 0.185 * Math.cos(a), bz = 0.185 * Math.sin(a);
      const b = cyl(0.018, 0.025, 6, mBolt, s * (L / 2 + 0.005), by, bz); b.rotation.z = PI / 2;
      if (Math.cos(a) > -0.9) box(0.005, 0.04 + 0.04 * Math.abs(Math.sin(a)), 0.02, mRust, s * (L / 2 + 0.002), by - 0.04, bz);
    }
  }
  // drain plug under the header, lifting lug on top between branches
  cyl(0.03, 0.06, 8, mBody, 0.6, AX - R - 0.02, 0);
  box(0.06, 0.06, 0.012, mBody, 0, AX + R + 0.02, 0);
  // pipe stanchions with base plates and clamp saddles
  for (const sx of [-0.8, 0.8]) {
    box(0.36, 0.02, 0.36, mStand, sx, 0.01, 0);
    box(0.3, 0.004, 0.3, mDust, sx, 0.022, 0);
    cyl(0.05, AX - R - 0.04, 10, mStand, sx, (AX - R - 0.04) / 2 + 0.02, 0);
    cyl(0.07, 0.02, 10, mStand, sx, 0.03, 0);
    const sad = add(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.16, 8, 1, true, -PI / 2 - 0.9, 1.8), mStand, sx, AX, 0); sad.rotation.z = PI / 2;
    box(0.16, 0.03, 0.34, mStand, sx, AX - R - 0.03, 0);
    for (const c of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) cyl(0.012, 0.02, 6, mBolt, sx + c[0], 0.03, c[1]);
    box(0.03, 0.18, 0.006, mRust, sx, AX - R - 0.15, 0.052);
    wedge(0.4, 0.3, 0.12, mSand, sx, 0, 0.18, -PI / 2);
    wedge(0.4, 0.3, 0.12, mSand, sx, 0, -0.18, PI / 2);
    wedge(0.4, 0.2, 0.1, mSand, sx + 0.18, 0, 0, 0);
    wedge(0.4, 0.2, 0.1, mSand, sx - 0.18, 0, 0, PI);
  }
  const wheel = (x, y, z, rad, m, axisZ) => {
    const w = new THREE.Group(); w.position.set(x, y, z); if (axisZ) w.rotation.x = PI / 2; g.add(w);
    const rim = add(new THREE.TorusGeometry(rad, 0.013, 6, 14), m, 0, 0, 0, w); rim.rotation.x = PI / 2;
    for (let i = 0; i < 3; i++) { const sp = box(rad * 2 - 0.01, 0.012, 0.018, m, 0, 0, 0, w); sp.rotation.y = i * PI / 3; }
    cyl(0.03, 0.036, 8, m, 0, 0, 0, w);
    cyl(0.016, 0.02, 6, mBolt, 0, 0.026, 0, w);
    return w;
  };
  for (let k = 0; k < 4; k++) {
    const bx = [-0.9, -0.3, 0.3, 0.9][k];
    const bm = k % 2 ? mBody : mBodyB;
    cyl(0.075, 0.3, 10, mPipe, bx, AX + 0.15, 0);
    cyl(0.085, 0.03, 10, mRust, bx, AX + R - 0.005, 0);
    cyl(0.12, 0.03, 10, mFlange, bx, 1.095, 0);
    cyl(0.12, 0.03, 10, mFlange, bx, 1.13, 0);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3 + PI / 6; cyl(0.012, 0.075, 6, mBolt, bx + 0.1 * Math.cos(a), 1.112, 0.1 * Math.sin(a)); }
    box(0.03, 0.08, 0.005, mRust, bx + 0.02, 1.04, 0.077);
    // cast body: a box with rounded cheeks, side outlet toward +Z
    box(0.2, 0.26, 0.16, bm, bx, 1.28, 0);
    const cheek = cyl(0.09, 0.2, 10, bm, bx, 1.28, 0); cheek.rotation.z = PI / 2;
    cyl(0.05, 0.16, 10, mPipe, bx, 1.24, 0.14).rotation.x = PI / 2;
    cyl(0.085, 0.025, 10, mFlange, bx, 1.24, 0.23).rotation.x = PI / 2;
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; const b = cyl(0.01, 0.02, 6, mBolt, bx + 0.065 * Math.cos(a), 1.24 + 0.065 * Math.sin(a), 0.245); b.rotation.x = PI / 2; }
    cyl(0.03, 0.06, 8, bm, bx, 1.24, 0.27).rotation.x = PI / 2;
    cyl(0.01, 0.06, 6, mStem, bx, 1.24, 0.31).rotation.x = PI / 2;
    wheel(bx, 1.24, 0.33, 0.1, k % 2 ? mWheelD : mWheel, true);
    box(0.03, 0.09, 0.005, mRust, bx + 0.05, 1.19, 0.081);
    // bonnet flange, bonnet, yoke, stem, top wheel
    cyl(0.11, 0.03, 10, mFlange, bx, 1.425, 0);
    for (let i = 0; i < 4; i++) { const a = i * PI / 2; cyl(0.011, 0.02, 6, mBolt, bx + 0.09 * Math.cos(a), 1.45, 0.09 * Math.sin(a)); }
    cyl(0.05, 0.1, 10, bm, bx, 1.49, 0);
    box(0.02, 0.14, 0.05, bm, bx - 0.045, 1.57, 0); box(0.02, 0.14, 0.05, bm, bx + 0.045, 1.57, 0);
    box(0.11, 0.03, 0.05, bm, bx, 1.625, 0);
    cyl(0.012, 0.2, 6, mStem, bx, 1.6, 0);
    wheel(bx, 1.56, 0, 0.165, k % 2 ? mWheelD : mWheel, false);
  }
  // gauge on a bracket at the -X end
  box(0.03, 0.22, 0.03, mStand, -1.06, AX + 0.26, 0);
  box(0.03, 0.03, 0.14, mStand, -1.06, AX + 0.38, 0.06);
  cyl(0.012, 0.06, 6, mStem, -1.06, AX + 0.42, 0.1);
  const gauge = cyl(0.05, 0.03, 12, mBody, -1.06, AX + 0.49, 0.1); gauge.rotation.x = PI / 2;
  add(new THREE.CircleGeometry(0.04, 12), mDial, -1.06, AX + 0.49, 0.116);
  box(0.02, 0.07, 0.005, mRust, -1.05, AX + 0.4, 0.0);

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
