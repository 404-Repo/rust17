// grass_tuft, round 5 (foliage): the near field filler, 0.6 x 0.6 x 0.45 m. Three crossed vertical
// planes 0.45 m tall wearing the Atlas cutouts grass_tuft_a (two, a full straw fan) and grass_tuft_b
// (one, a sparse tuft with a few green blades), and a sand mound the size of a footprint hiding the
// card bottoms. Card materials are named 'card:<name>' (game/src/render/materials.js: alpha tested,
// double sided, the photo on the plane's own uvs); they ship transparent 0.9 so the loader's surfaces
// pass leaves their uvs alone. Normals are bent toward up so the blades shade as one tuft. 44 triangles.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 53; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const card = (name, hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, vertexColors: true }); m.name = 'card:' + name; return m; };
  const mA = card('grass_tuft_a', 0x9a8a5e), mB = card('grass_tuft_b', 0x8a7a4e);
  const mSand = new THREE.MeshStandardMaterial({ color: 0xcdb88e, roughness: 0.95, metalness: 0 }); mSand.name = 'ground';
  const UP = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3();
  const plane = (m, w, h, x, z, yaw, bright) => {
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
    const o = new THREE.Mesh(geo, m); o.position.set(x, -0.01, z); g.add(o); return o;
  };
  const yaw0 = rr(0, PI / 3);
  plane(mA, 0.58, 0.45, 0, 0, yaw0, 1.0);
  plane(mA, 0.56, 0.44, 0.02, -0.02, yaw0 + PI / 3 + rr(-0.1, 0.1), 0.9);
  plane(mB, 0.3, 0.45, -0.1, 0.06, yaw0 + 2 * PI / 3 + rr(-0.1, 0.1), 1.0);
  const mound = new THREE.CylinderGeometry(0.06, 0.24, 0.04, 8, 1);
  const mp = mound.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i); mp.setXYZ(i, x * (1 + 0.12 * Math.sin(z * 13 + x)), mp.getY(i), z * (1 + 0.12 * Math.cos(x * 11))); }
  mound.computeVertexNormals();
  const mo = new THREE.Mesh(mound, mSand); mo.position.set(0.0, 0.02, 0.01); g.add(mo);

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
