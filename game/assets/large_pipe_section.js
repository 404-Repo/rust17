// large_pipe_section c2: different reading. Spigot and socket sections: each course ends in a bell
// that the next slides into, bolts on the bell, a longitudinal weld strip on each course rotated
// round the pipe, two rust runs per joint, saddles as two stacked concrete blocks with a timber
// packer, the drift built from three overlapping wedges so it undulates like the reference.
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
  const cylX = (r, len, seg, m, x, y, z, open = false, start = 0, span = PI * 2, parent = g) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, open, start, span), m, x, y, z, parent); o.rotation.z = PI / 2; return o; };

  const tints = [0.97, 1.05, 0.92, 1.02];
  const mCrown = tints.map((f) => mat(shade(P.tank, f * 1.06), 'metal', 0.85, 0.1, true));
  const mFlank = tints.map((f) => mat(shade(P.tank, f), 'metal', 0.87, 0.1, true));
  const mBelly = tints.map((f) => mat(shade(P.tank, f * 0.88), 'metal', 0.9, 0.1, true));
  const mBell = mat(shade(P.tank, 0.9), 'metal', 0.8, 0.2);
  const mFlange = mat(shade(P.tank, 0.86), 'metal', 0.8, 0.2);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mBore = mat(shade(P.steel, 0.6), 'metal', 0.95, 0.1, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mSandD = mat(shade(P.sand, 0.96), 'ground', 0.95, 0.0);
  const mOxide = mat(P.oxide, 'metal', 0.9, 0.05, true);
  const mConc = mat(P.concB, 'stone', 0.95, 0.0);
  const mConcS = mat(P.concS, 'stone', 0.95, 0.0);
  const mTimber = mat(P.timber, 'timber', 0.9, 0.0);

  const R = 0.6, AX = 1.0, L = 8.0, SEC = 2.0;
  for (let i = 0; i < 4; i++) {
    const cx = -L / 2 + SEC / 2 + i * SEC;
    cylX(R, SEC, 20, mCrown[i], cx, AX, 0, true, PI / 2 - 0.9, 1.8);
    cylX(R, SEC, 20, mFlank[i], cx, AX, 0, true, PI / 2 + 0.9, PI - 1.6);
    cylX(R, SEC, 20, mFlank[i], cx, AX, 0, true, -PI / 2 + 0.7, PI - 1.6);
    cylX(R, SEC, 20, mBelly[i], cx, AX, 0, true, -PI / 2 - 0.7, 1.4);
    // longitudinal weld strip, rotated a different way round on each course
    const wa = 0.5 + i * 1.3;
    const strip = box(SEC - 0.3, 0.025, 0.012, mRust, cx, AX + (R + 0.004) * Math.cos(wa), (R + 0.004) * Math.sin(wa)); strip.rotation.x = -wa;
    // bell socket at the +X end of the first three courses, with bolts round it
    if (i < 3) {
      const bx = cx + SEC / 2;
      cylX(R + 0.035, 0.3, 20, mBell, bx - 0.05, AX, 0);
      cylX(R + 0.04, 0.04, 20, mRust, bx - 0.21, AX, 0);
      for (let k = 0; k < 20; k++) {
        const a = k * PI / 10 + (i % 2) * PI / 20;
        const ny = Math.cos(a), nz = Math.sin(a);
        const b = add(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6), mBolt, bx - 0.02, AX + (R + 0.05) * ny, (R + 0.05) * nz); b.rotation.x = -a;
        if (ny < 0.85 && ny > -0.6) {
          const dl = 0.12 + 0.3 * Math.abs(nz), a2 = a + 0.5 * dl / R * (nz > 0 ? 1 : -1);
          const s2 = box(0.03, dl, 0.006, mRust, bx + 0.12, AX + (R + 0.004) * Math.cos(a2), (R + 0.004) * Math.sin(a2)); s2.rotation.x = -a2;
        }
      }
    }
  }
  cylX(R + 0.008, L - 0.8, 6, mDust, 0.3, AX, 0, true, PI / 2 - 0.3, 0.6);
  cylX(R + 0.005, L - 0.4, 4, mRust, 0.1, AX, 0, true, -PI / 2 - 0.1, 0.2);
  // flange at +X
  cylX(0.7, 0.08, 20, mFlange, L / 2 - 0.04, AX, 0);
  cylX(R + 0.02, 0.05, 20, mRust, L / 2 - 0.105, AX, 0);
  for (let i = 0; i < 20; i++) {
    const a = i * PI / 10;
    const by = AX + 0.655 * Math.cos(a), bz = 0.655 * Math.sin(a);
    const b = add(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 6), mBolt, L / 2 + 0.01, by, bz); b.rotation.z = PI / 2;
    if (Math.cos(a) > -0.9) box(0.006, 0.05 + 0.1 * Math.abs(Math.sin(a)), 0.03, mRust, L / 2 + 0.002, by - 0.06, bz);
  }
  // open end at -X
  const ring = add(new THREE.RingGeometry(R - 0.03, R, 20), mRust, -L / 2, AX, 0); ring.rotation.y = -PI / 2;
  cylX(R - 0.03, 1.0, 20, mBore, -L / 2 + 0.5, AX, 0, true);
  const bulk = add(new THREE.CircleGeometry(R - 0.03, 20), mBore, -L / 2 + 1.0, AX, 0); bulk.rotation.y = -PI / 2;
  // primer patch on course two, high on the south flank
  cylX(R + 0.004, 0.6, 6, mOxide, -0.9, AX, 0, true, -0.1, 0.95);
  // saddles: two stacked blocks, stained lower, timber packer under the pipe, cheek blocks
  for (const sx of [-2.5, 2.5]) {
    box(0.7, 0.2, 1.5, mConcS, sx, 0.1, 0);
    box(0.6, 0.2, 1.3, mConc, sx, 0.3, 0);
    box(0.54, 0.006, 1.24, mDust, sx, 0.403, 0);
    box(0.5, 0.1, 0.5, mTimber, sx, 0.4, 0);
    for (const s of [-1, 1]) {
      box(0.6, 0.4, 0.2, mConc, sx, 0.6, s * 0.55);
      box(0.54, 0.006, 0.14, mDust, sx, 0.803, s * 0.55);
      box(0.03, 0.18, 0.008, mRust, sx + 0.1, 0.5, s * 0.655);
    }
    wedge(1.5, 0.28, 0.14, mSand, sx + 0.35, 0, 0, 0);
    wedge(1.5, 0.28, 0.14, mSand, sx - 0.35, 0, 0, PI);
  }
  box(6.0, 0.38, 0.4, mSand, 0.4, 0.19, 0);
  wedge(3.2, 0.55, 0.45, mSand, -0.8, 0, 0.2, -PI / 2);
  wedge(3.0, 0.5, 0.38, mSandD, 1.8, 0, 0.2, -PI / 2);
  wedge(2.0, 0.4, 0.25, mSand, 3.2, 0, 0.2, -PI / 2);
  wedge(4.0, 0.3, 0.2, mSandD, -0.6, 0, -0.2, PI / 2);

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
