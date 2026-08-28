// wooden_pallet_stack c2: a different reading, block pallets. Each pallet is nine timber blocks
// under three stringer boards under seven deck boards, with three bottom boards, which is what
// the reference photograph actually shows in its side elevation (blocks with gaps, not solid
// bearers). Boards carry bleached top faces, darker underside, end grain caps, rusty nail plates
// at block positions, the broken board on pallet two hangs down into the pocket, top pallet
// turned 6 degrees, dust on the top deck, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 101; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, timber: 0xa07a4f, rust: 0x6b4426, gun: 0x3a3d40 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.9, mt = 0.0) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const mTop = mat(shade(P.timber, 1.12), 'timber', 0.9), mTopB = mat(shade(P.timber, 1.04), 'timber', 0.9), mSide = mat(P.timber, 'timber', 0.9);
  const mBlock = mat(shade(P.timber, 0.84), 'timber', 0.93), mEnd = mat(shade(P.timber, 0.7), 'timber', 0.95), mUnder = mat(shade(P.timber, 0.78), 'timber', 0.95);
  const mNail = mat(P.gun, 'metal', 0.6, 0.5), mRust = mat(P.rust, 'timber', 0.95);
  const mDust = mat(P.sand, 'ground', 0.95), mSand = mat(P.sand, 'ground', 0.95);

  const T = 0.022, W = 1.2, D = 0.78, BLK = 0.078, bw = 0.095, gap = (D - 7 * bw) / 6;
  const pallet = (parent, broken, top) => {
    // bottom boards along x (three), blocks 3 x 3, stringer boards along x on top of blocks, deck across
    for (const z of [-0.34, 0, 0.34]) add(new THREE.BoxGeometry(W, T, 0.1), mUnder, 0, T / 2, z, parent);
    for (const x of [-0.525, 0, 0.525]) for (const z of [-0.34, 0, 0.34]) {
      add(new THREE.BoxGeometry(0.145, BLK, 0.1), mBlock, x, T + BLK / 2, z, parent);
      add(new THREE.BoxGeometry(0.03, 0.03, 0.002), mRust, x, T + BLK / 2, z + 0.051, parent);    // nail plate rust bloom
      add(new THREE.BoxGeometry(0.006, 0.006, 0.003), mNail, x, T + BLK / 2, z + 0.052, parent);
    }
    for (const z of [-0.34, 0, 0.34]) add(new THREE.BoxGeometry(W, T, 0.1), mSide, 0, T + BLK + T / 2, z, parent);
    const y = 2 * T + BLK + T / 2;
    for (let k = 0; k < 7; k++) {
      const z = -D / 2 + bw / 2 + k * (bw + gap);
      const m = k % 2 ? mTop : mTopB;
      if (broken && k === 3) {
        add(new THREE.BoxGeometry(0.45, T, bw), m, -0.375, y, z, parent);
        const h = add(new THREE.BoxGeometry(0.5, T, bw), mSide, 0.3, y - 0.045, z, parent); h.rotation.z = 0.2;   // hanging half
        add(new THREE.BoxGeometry(0.1, 0.008, 0.02), mEnd, -0.12, y, z - 0.02, parent);
      } else add(new THREE.BoxGeometry(W, T, bw), m, 0, y, z, parent);
      add(new THREE.BoxGeometry(0.004, T, bw), mEnd, W / 2 + 0.001, y, z, parent); add(new THREE.BoxGeometry(0.004, T, bw), mEnd, -W / 2 - 0.001, y, z, parent);
      for (const x of [-0.525, 0, 0.525]) { for (const dx of [-0.03, 0.03]) add(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 6), mNail, x + dx, y + T / 2 + 0.001, z, parent); add(new THREE.BoxGeometry(0.09, 0.001, 0.02), mRust, x, y + T / 2 + 0.0005, z, parent); }
      if (top) add(new THREE.BoxGeometry(W * 0.9, 0.004, bw * 0.7), mDust, 0, y + T / 2 + 0.003, z, parent);
    }
    // weathered darker lead edge boards (the reference shows the outer boards greyer)
    add(new THREE.BoxGeometry(W, 0.004, bw * 0.98), mUnder, 0, y + T / 2 + 0.001, -D / 2 + bw / 2, parent);
  };
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group();
    p.position.set((i % 2 ? 0.03 : -0.03) + rr(-0.008, 0.008), i * 0.144, (i % 2 ? 0.02 : -0.02) + rr(-0.008, 0.008));
    p.rotation.y = i === 3 ? 4 * PI / 180 : rr(-0.012, 0.012);
    g.add(p);
    pallet(p, i === 1, i === 3);
  }
  const fillet = new THREE.CylinderGeometry(0.5, 0.62, 0.05, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.04 * Math.sin(z * 6 + x)), fp.getY(i), z * 0.58 * (1 + 0.05 * Math.cos(x * 5))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.0, 0.025, 0.0);

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
