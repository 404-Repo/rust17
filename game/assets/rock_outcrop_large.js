// rock_outcrop_large c0: primitives. Five lobes, each a stack of 0.5 m bedding courses built from
// jittered BoxGeometry (hash jitter so shared edges stay closed), plan of each course drifts so the
// bedding reads as steps; one overhang course on the south lobe, six fallen blocks, dust on ledges,
// dark bedding strips between courses, sand fillet all round.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, concS: 0x857c6c, rust: 0x6b4426 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false, flat = true) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const hsh = (x, y, z, k) => { const t = Math.sin(Math.round(x * 1e3) * 0.1271 + Math.round(y * 1e3) * 0.3117 + Math.round(z * 1e3) * 0.0747 + k * 19.3) * 43758.5453; return t - Math.floor(t); };
  // A faceted block: box with hashed vertex jitter, bottom ring kept flat so it sits.
  const jbox = (w, h, d, jit, seed) => {
    const geo = new THREE.BoxGeometry(w, h, d, 2, 1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const jx = (hsh(x, y, z, seed) - 0.5) * jit * w, jz = (hsh(x, y, z, seed + 7) - 0.5) * jit * d;
      const jy = y <= -h / 2 + 1e-4 ? 0 : (hsh(x, y, z, seed + 13) - 0.5) * jit * h * 0.6;
      p.setXYZ(i, x + jx, y + jy, z + jz);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const mRockN = mat(P.rock, 'stone');                       // north faces
  const mRockS = mat(shade(P.rock, 1.04), 'stone');          // south, bleached
  const mRockW = mat(shade(P.rock, 0.96), 'stone');
  const mBed = mat(shade(P.rock, 0.82), 'stone', 0.95);       // bedding line, slightly darker
  const mCrack = mat(P.concS, 'stone', 0.95);
  const mStreak = mat(P.rust, 'stone', 0.95);
  const mDust = mat(P.sand, 'ground', 0.95);
  const mSand = mat(P.sand, 'ground', 0.95, 0, false, false);

  // Lobes: x, z, w, d, height (courses), which face is bleached
  const lobes = [
    { x: -2.1, z: 0.5, w: 2.9, d: 2.35, n: 5, seed: 1 },
    { x: 0.2, z: -0.1, w: 3.1, d: 2.5, n: 6, seed: 2 },
    { x: 2.2, z: 0.4, w: 2.7, d: 2.15, n: 5, seed: 3 },
    { x: -0.9, z: -1.4, w: 2.6, d: 1.6, n: 4, seed: 4 },
    { x: 1.5, z: -1.5, w: 2.3, d: 1.45, n: 3, seed: 5 },
    { x: 0.3, z: -1.9, w: 3.0, d: 1.1, n: 2, seed: 6 },
  ];
  const COURSE = 0.5;
  for (const L of lobes) {
    let y = 0;
    for (let c = 0; c < L.n; c++) {
      const h = COURSE * rr(0.8, 1.3);
      const inset = c === 0 ? 1 : rr(0.84, 1.04);
      let w = L.w * inset, d = L.d * inset;
      let zoff = 0;
      // the overhang: south lobe (z positive), top-but-one course pushes 0.5 m south
      if (L.seed === 3 && c === L.n - 2) { d += 0.5; zoff = 0.25; }
      const m = (L.z > 0 || c % 2) ? mRockS : (c % 3 === 0 ? mRockW : mRockN);
      const blk = add(jbox(w, h, d, 0.16, L.seed * 10 + c), m, L.x + rr(-0.1, 0.1), y + h / 2 - 0.03, L.z + zoff + rr(-0.1, 0.1));
      blk.rotation.y = rr(-0.09, 0.09);
      // bedding line strip between courses, poking out where the course above is inset
      if (c > 0) add(new THREE.BoxGeometry(w * 1.01, 0.05, d * 1.01), mBed, L.x, y + 0.02, L.z + zoff);
      y += h;
    }
    // dust on the top ledge
    add(new THREE.BoxGeometry(L.w * 0.74, 0.012, L.d * 0.74), mDust, L.x, y + 0.02, L.z);
    // a couple of vertical cracks and a streak on the south face
    for (let k = 0; k < 2; k++) {
      const cx = L.x + rr(-L.w * 0.35, L.w * 0.35);
      add(new THREE.BoxGeometry(0.05, y * rr(0.35, 0.7), 0.06), mCrack, cx, y * 0.5, L.z + L.d / 2 - 0.02);
    }
    add(new THREE.BoxGeometry(0.08, 0.35, 0.05), mStreak, L.x + rr(-0.5, 0.5), 0.55, L.z + L.d / 2 - 0.01);
    add(new THREE.BoxGeometry(0.05, 0.4, 0.08), mStreak, L.x + L.w / 2 - 0.01, 0.9, L.z + rr(-0.5, 0.5));
    // ledge dust on the mid course steps
    add(new THREE.BoxGeometry(L.w * 0.5, 0.01, 0.12), mDust, L.x, COURSE * 2 + 0.03, L.z + L.d / 2 - 0.08);
  }
  // fallen blocks along the south and east base
  const blocks = [[-3.2, 1.9, 0.8], [-1.6, 2.05, 0.55], [0.4, 2.0, 0.7], [2.0, 1.95, 0.4], [3.5, 1.2, 0.6], [3.5, -0.4, 0.35]];
  for (let i = 0; i < blocks.length; i++) {
    const [x, z, a] = blocks[i];
    const b = add(jbox(a, a * 0.7, a * 0.85, 0.12, 100 + i), i % 2 ? mRockS : mRockN, x, a * 0.3, z);
    b.rotation.y = rr(-0.5, 0.5); b.rotation.z = rr(-0.12, 0.12);
    add(new THREE.BoxGeometry(a * 0.6, 0.01, a * 0.5), mDust, x, a * 0.66, z);
  }
  // sand fillet: an irregular low mound under the whole mass
  const fillet = new THREE.CylinderGeometry(3.55, 4.0, 0.22, 16, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.06 * Math.sin(x * 3.1 + z)), fp.getY(i), z * 0.56 * (1 + 0.06 * Math.cos(z * 2.7 + x))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.1, 0.11, 0.2);
  // packed sand scuffs on the fillet
  add(new THREE.BoxGeometry(2.2, 0.02, 0.5), mat(P.packed, 'ground', 0.95, 0, false, false), -1.0, 0.23, 1.85);

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
