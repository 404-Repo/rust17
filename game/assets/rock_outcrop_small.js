// rock_outcrop_small c0: primitives. Three boulders as hash jittered boxes with flat bedding tops,
// the middle one leaning on the big one, cracks as dark inset strips, sand dust slabs on the tops,
// buried to a third of their height in a sand fillet mound.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, concS: 0x857c6c, rust: 0x6b4426 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false, flat = true) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const hsh = (x, y, z, k) => { const t = Math.sin(Math.round(x * 1e3) * 0.1271 + Math.round(y * 1e3) * 0.3117 + Math.round(z * 1e3) * 0.0747 + k * 19.3) * 43758.5453; return t - Math.floor(t); };
  const jbox = (w, h, d, jit, seed) => {
    const geo = new THREE.BoxGeometry(w, h, d, 4, 2, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const top = y >= h / 2 - 1e-4;
      p.setXYZ(i, x + (hsh(x, y, z, seed) - 0.5) * jit * w, y + (top ? (hsh(x, y, z, seed + 13) - 0.5) * 0.04 : (hsh(x, y, z, seed + 13) - 0.5) * jit * h), z + (hsh(x, y, z, seed + 7) - 0.5) * jit * d);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const mN = mat(P.rock, 'stone'), mS = mat(shade(P.rock, 1.04), 'stone'), mW = mat(shade(P.rock, 0.95), 'stone');
  const mCrack = mat(P.concS, 'stone', 0.95), mBed = mat(shade(P.rock, 0.8), 'stone', 0.95), mStreak = mat(P.rust, 'stone', 0.95);
  const mDust = mat(P.sand, 'ground', 0.95), mSand = mat(P.sand, 'ground', 0.95, 0, false, false);

  // boulders: [x, z, w, h, d, ry, rz, material]
  const B = [
    [-0.4, 0.22, 1.05, 0.72, 0.82, 0.15, 0.0, mS],
    [0.5, 0.0, 0.72, 0.55, 0.68, -0.3, 0.0, mN],
    [0.05, -0.4, 0.55, 0.45, 0.46, 0.5, -0.4, mW],   // the leaner, tipped onto the big one
  ];
  for (let i = 0; i < B.length; i++) {
    const [x, z, w, h, d, ry, rz, m] = B[i];
    const o = add(jbox(w, h, d, 0.12, i + 1), m, x, h * 0.36 + (i === 2 ? 0.12 : 0), z);
    o.rotation.y = ry; o.rotation.z = rz;
    // bedding step: a second, slightly smaller course on top
    const cap = add(jbox(w * 0.9, h * 0.35, d * 0.9, 0.12, i + 11), i === 0 ? mN : mS, 0, h * 0.62, 0, o);
    add(new THREE.BoxGeometry(w * 0.86, 0.04, d * 0.86), mBed, 0, h * 0.45, 0, o);
    add(new THREE.BoxGeometry(w * 0.6, 0.012, d * 0.6), mDust, 0, h * 0.35 / 2 + 0.01, 0, cap);
    add(new THREE.BoxGeometry(w * 0.35, 0.01, 0.08), mDust, 0, h * 0.46, d * 0.44, o);
    // cracks: dark inset strips on the +z and +x faces
    add(new THREE.BoxGeometry(0.025, h * 0.6, 0.04), mCrack, rr(-w * 0.3, w * 0.3), 0, d / 2 + 0.005, o);
    add(new THREE.BoxGeometry(0.04, h * 0.5, 0.025), mCrack, w / 2 + 0.005, 0.05, rr(-d * 0.3, d * 0.3), o);
    add(new THREE.BoxGeometry(0.05, h * 0.3, 0.02), mStreak, rr(-w * 0.3, w * 0.3), -h * 0.15, d / 2 + 0.012, o);
  }
  // sand fillet mound, boulders sit a third buried
  const fillet = new THREE.CylinderGeometry(0.75, 0.9, 0.2, 14, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.07 * Math.sin(z * 4 + x)), fp.getY(i), z * 0.7 * (1 + 0.08 * Math.cos(x * 3.5))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.05, 0.1, 0.0);
  add(new THREE.BoxGeometry(0.5, 0.015, 0.25), mat(P.packed, 'ground', 0.95, 0, false, false), -0.3, 0.2, 0.55);

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
