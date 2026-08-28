// dead_shrub, round 5 (foliage): cards, the way a shipped game does scatter. Three crossed vertical
// planes 1.15 m wide wearing the Atlas cutout dead_shrub_a (a bare twig ball), a smaller pair of
// crossed planes 0.7 m wide wearing dead_shrub_b (a dusty saltbush) leaning against one side, and a
// low sand mound. Card materials are named 'card:<name>' (game/src/render/materials.js: alpha tested,
// double sided, the photo on the plane's own uvs); they ship transparent 0.9 so the loader's surfaces
// pass leaves their uvs alone. Normals are bent toward up so the planes shade as one bush.
//   variant undefined (what the loader passes): both cards, as above, 1.2 x 1.2 x 0.8
//   variant 0: dead_shrub_a only;  variant 1: dead_shrub_b only (1.15 m)
// The loader builds ONE prototype per asset file and clones it, so the mixed default is what the game
// shows; the placement yaw (every shrub has its own) breaks the repeat. 60 triangles (40 of them the mound).
let variantCounter = 0;
export default function (THREE, variant) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 41; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const which = variant === undefined || variant === null ? 'mixed' : (variant === 0 ? 'a' : variant === 1 ? 'b' : (variantCounter++ % 2 ? 'b' : 'a'));
  const card = (name, hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, vertexColors: true }); m.name = 'card:' + name; return m; };
  // two colour values on purpose: the loader merges materials by value before the photos are on them
  const mA = card('dead_shrub_a', 0x8a7a4e), mB = card('dead_shrub_b', 0x86804e);
  const mSand = new THREE.MeshStandardMaterial({ color: 0xcdb88e, roughness: 0.95, metalness: 0 }); mSand.name = 'ground';
  const UP = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3();
  // one vertical card: width w, aspect from the photo, bottom at y0, yaw about y; normals up and a little outward
  const plane = (m, w, aspect, x, y0, z, yaw, bright) => {
    const h = w * aspect;
    const geo = new THREE.PlaneGeometry(w, h, 2, 1);
    geo.translate(0, h / 2, 0);
    geo.rotateY(yaw);
    const n = geo.attributes.normal, p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      _n.fromBufferAttribute(n, i); if (_n.z < 0) _n.negate();
      _n.multiplyScalar(0.2).addScaledVector(UP, 0.8).normalize();
      n.setXYZ(i, _n.x, _n.y, _n.z);
      col[i * 3] = bright; col[i * 3 + 1] = bright; col[i * 3 + 2] = bright;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const o = new THREE.Mesh(geo, m); o.position.set(x, y0, z); g.add(o); return o;
  };
  const A = 363 / 512, B = 398 / 511;   // photo aspects (h / w)
  if (which === 'a' || which === 'mixed') {
    const w = which === 'mixed' ? 1.18 : 1.15, x0 = which === 'mixed' ? -0.03 : 0, yaw0 = rr(0, PI / 3);
    for (let i = 0; i < 3; i++) plane(mA, w, A, x0, -0.015, 0, yaw0 + i * PI / 3 + rr(-0.08, 0.08), 0.92 + 0.08 * i);
  }
  if (which === 'b') {
    const yaw0 = rr(0, PI / 3);
    for (let i = 0; i < 3; i++) plane(mB, 1.15, B, 0, -0.015, 0, yaw0 + i * PI / 3 + rr(-0.08, 0.08), 0.92 + 0.08 * i);
  }
  if (which === 'mixed') {
    const yaw0 = rr(0, PI / 2);
    for (let i = 0; i < 2; i++) plane(mB, 0.7, B, 0.28, -0.01, 0.2, yaw0 + i * PI / 2 + rr(-0.1, 0.1), 0.95 + 0.1 * i);
  }
  // the mound: a low irregular sand cone, taller on the windward (west) side
  const mound = new THREE.CylinderGeometry(0.1, 0.4, 0.07, 10, 1);
  const mp = mound.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i); const wnd = x < 0 ? 1.25 : 1; mp.setXYZ(i, x * wnd * (1 + 0.12 * Math.sin(z * 11 + x)), mp.getY(i) * (x < 0 ? 1.3 : 1), z * (1 + 0.12 * Math.cos(x * 9))); }
  mound.computeVertexNormals();
  const mo = new THREE.Mesh(mound, mSand); mo.position.set(which === 'mixed' ? 0.06 : 0.02, 0.035, 0.03); g.add(mo);

  // ---- contract: base at y = 0, centred on x and z, measured on vertices ----
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
