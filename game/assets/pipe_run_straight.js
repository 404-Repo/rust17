// pipe_run_straight c2: different breakdown. Pipe in three courses (bleached crown, base tone,
// stained belly) plus a longitudinal weld strip; trestles read from the reference as channel legs
// with a wide top beam, wedge saddle with cheek plates and a mid tie.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const wedge = (len, out, h, m, x, y, z, ry, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const sector = (r, len, start, span, m, x, y, z, parent = g, seg = 6) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, true, start, span), m, x, y, z, parent); o.rotation.z = PI / 2; return o; };

  const mCrown = mat(shade(P.steel, 1.1), 'metal', 0.8, 0.2, true);
  const mSide = mat(P.steel, 'metal', 0.85, 0.2, true);
  const mSideS = mat(shade(P.steel, 1.05), 'metal', 0.85, 0.2, true);
  const mBelly = mat(shade(P.steel, 0.88), 'metal', 0.9, 0.15, true);
  const mFlange = mat(shade(P.steel, 0.93), 'metal', 0.8, 0.25);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mLeg = mat(P.galv, 'metal', 0.75, 0.45);
  const mLegS = mat(shade(P.galv, 1.06), 'metal', 0.75, 0.45);
  const mBeam = mat(shade(P.galv, 0.92), 'metal', 0.8, 0.4);

  const R = 0.25, AX = 1.25, L = 6.0, FT = 0.06, FR = 0.35;
  const bodyLen = L - 2 * FT;
  // three courses: crown 100 deg, two flanks, belly 80 deg
  sector(R, bodyLen, PI / 2 - 0.87, 1.74, mCrown, 0, AX, 0, g, 5);
  sector(R, bodyLen, PI / 2 + 0.87, PI - 0.87 - 0.7, mSide, 0, AX, 0, g, 5);
  sector(R, bodyLen, -PI / 2 + 0.7, PI - 0.87 - 0.7, mSideS, 0, AX, 0, g, 5);
  sector(R, bodyLen, -PI / 2 - 0.7, 1.4, mBelly, 0, AX, 0, g, 4);
  sector(R + 0.008, bodyLen - 0.4, PI / 2 - 0.6, 1.2, mDust, 0, AX, 0, g, 4);
  // longitudinal weld strip on the south flank, rust run on the belly
  box(bodyLen - 0.2, 0.02, 0.012, mRust, 0, AX + 0.02, R + 0.002);
  sector(R + 0.006, bodyLen - 0.1, -PI / 2 - 0.12, 0.24, mRust, 0, AX, 0, g, 3);
  // girth welds at 2 m spacing
  for (const wx of [-1.0, 1.0]) { const w = add(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.04, 14), mRust, wx, AX, 0); w.rotation.z = PI / 2; }

  for (const s of [-1, 1]) {
    const fx = s * (L / 2 - FT / 2);
    const f = add(new THREE.CylinderGeometry(FR, FR, FT, 14), mFlange, fx, AX, 0); f.rotation.z = PI / 2;
    const ring = add(new THREE.CylinderGeometry(R + 0.016, R + 0.016, 0.07, 14), mRust, s * (L / 2 - FT - 0.035), AX, 0); ring.rotation.z = PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6 + PI / 12;
      const by = AX + 0.295 * Math.cos(a), bz = 0.295 * Math.sin(a);
      const b = add(new THREE.CylinderGeometry(0.024, 0.024, 0.032, 6), mBolt, s * (L / 2 + 0.006), by, bz); b.rotation.z = PI / 2;
      if (Math.cos(a) > -0.9) box(0.006, 0.05 + 0.08 * Math.abs(Math.sin(a)), 0.03, mRust, s * (L / 2 + 0.002), by - 0.06, bz);
    }
    // long rust streak on the pipe below each flange, running down the flank
    box(0.03, 0.006, 0.18, mRust, s * (L / 2 - FT - 0.03), AX - R - 0.002, 0);
  }

  // trestles: channel legs (web + two flanges) in an A, wide top beam, wedge saddle with cheeks
  const legLen = 0.98, tilt = Math.atan2(0.26, 0.93);
  for (const tx of [-1.8, 1.8]) {
    const t = new THREE.Group(); t.position.set(tx, 0, 0); g.add(t);
    for (const s of [-1, 1]) {
      const lm = s > 0 ? mLegS : mLeg;
      const legG = new THREE.Group(); legG.position.set(0, 0.475, s * 0.24); legG.rotation.x = -s * tilt; t.add(legG);
      box(0.12, legLen, 0.01, lm, 0, 0, 0, legG);            // web, facing along X
      box(0.12, legLen, 0.05, lm, 0, 0, s * 0.03, legG);      // lip toward outside
      box(0.02, legLen, 0.05, lm, -0.05, 0, -s * 0.02, legG);
      box(0.02, legLen, 0.05, lm, 0.05, 0, -s * 0.02, legG);
      box(0.3, 0.02, 0.16, mBeam, 0, 0.01, s * 0.39, t);       // foot plate
      for (const bx of [-0.11, 0.11]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mBolt, bx, 0.03, s * 0.44, t);
      box(0.03, 0.14, 0.008, mRust, 0.03, 0.12, s * 0.475, t);   // rust from foot bolts up the plate edge
    }
    box(0.06, 0.05, 0.5, mLeg, 0, 0.48, 0, t);                  // mid tie across the A
    box(0.42, 0.06, 0.9, mBeam, 0, 0.94, 0, t);                  // top beam spanning the full 0.9 m
    box(0.36, 0.004, 0.84, mDust, 0, 0.973, 0, t);              // dust cap on the beam
    // wedge saddle: two cheek plates hugging the pipe and a block between
    box(0.3, 0.05, 0.36, mBeam, 0, 0.995, 0, t);
    for (const cz of [-0.19, 0.19]) box(0.3, 0.16, 0.015, mBeam, 0, 1.05, cz, t);
    for (const cz of [-0.2, 0.2]) box(0.02, 0.12, 0.008, mRust, 0.1, 0.9, cz, t);
    wedge(0.86, 0.28, 0.12, mSand, 0.21, 0, 0, 0, t);
    wedge(0.86, 0.28, 0.12, mSand, -0.21, 0, 0, PI, t);
  }

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
