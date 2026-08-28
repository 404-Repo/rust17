// dead_shrub c2: a different reading. Gnarled rather than straight: every twig is a chain of three
// kinked 4 sided cones curving upward, forking twice, so the mound reads as a windblown tangle;
// a thicker split trunk with two leaders, leaf clusters as crossed pairs of planes, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 37; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, rust: 0x6b4426, foliage: 0x8a7a4e, khaki: 0x7a6a4c };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const up = new THREE.Vector3(0, 1, 0);
  const mBase = mat(shade(P.foliage, 0.7), 'foliage', 0.95);
  const mats = [mat(shade(P.foliage, 0.86), 'foliage', 0.95), mat(P.foliage, 'foliage', 0.95), mat(shade(P.foliage, 1.14), 'foliage', 0.95)];
  const mLeaf = mat(shade(P.khaki, 1.1), 'foliage', 0.9, 0, true);
  const mRust = mat(P.rust, 'foliage', 0.95);
  const mSand = mat(P.sand, 'ground', 0.95);
  const cone = (a, b, r, m) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = add(new THREE.ConeGeometry(r, len, 4, 1, false), m);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(up, d.normalize());
    return o;
  };
  // a kinked twig: three cones, each bending a little upward and sideways
  const tips = [];
  const twig = (a, dir, len, r, level) => {
    let p = a.clone(), d = dir.clone();
    for (let i = 0; i < 3; i++) {
      d = d.clone().add(new THREE.Vector3(rr(-0.25, 0.25), 0.07, rr(-0.25, 0.25))).normalize();
      const q = p.clone().addScaledVector(d, len / 3);
      cone(p, q, r * (1 - i * 0.2), mats[level]);
      p = q;
    }
    if (level === 2) { tips.push({ p, d }); return; }
    for (let k = 0; k < 2; k++) {
      const nd = d.clone().add(new THREE.Vector3(rr(-0.6, 0.6), rr(-0.3, 0.3), rr(-0.6, 0.6))).normalize();
      twig(p, nd, len * rr(0.55, 0.75), r * 0.6, level + 1);
    }
  };
  // split trunk: two leaders
  add(new THREE.CylinderGeometry(0.04, 0.07, 0.1, 6), mBase, 0, 0.05, 0);
  cone(new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(-0.08, 0.2, 0.03), 0.035, mBase);
  cone(new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0.07, 0.18, -0.04), 0.03, mBase);
  add(new THREE.BoxGeometry(0.02, 0.07, 0.015), mRust, -0.02, 0.05, 0.06);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * PI * 2 + rr(-0.08, 0.08);
    const el = rr(-0.05, 0.8);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const from = i % 2 ? new THREE.Vector3(-0.06, 0.16, 0.02) : new THREE.Vector3(0.05, 0.15, -0.03);
    twig(from, dir, rr(0.24, 0.33), rr(0.01, 0.016), 0);
  }
  for (let i = 0; i < 8; i++) {
    const t = tips[Math.floor((i / 8) * tips.length)];
    for (let k = 0; k < 2; k++) {
      const leaf = add(new THREE.PlaneGeometry(0.07, 0.04), mLeaf);
      leaf.position.copy(t.p).addScaledVector(t.d, -0.03);
      leaf.rotation.set(rr(-0.4, 0.4), k * PI / 2 + rr(-0.2, 0.2), rr(-0.4, 0.4));
    }
  }
  const fillet = new THREE.CylinderGeometry(0.1, 0.34, 0.07, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.12 * Math.sin(z * 11 + x)), fp.getY(i), z * (1 + 0.12 * Math.cos(x * 9))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.02, 0.035, 0.03);

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
