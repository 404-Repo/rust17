// palm_tree c1: profiles. Trunk is a LatheGeometry (10 radial) with a flared foot and a crown
// bulge, frond base plates are extruded rhombus prisms, frond ribs are TubeGeometry along a
// CatmullRom curve (3 radial), leaflets are extruded tapered leaf profiles, dates are a lathe
// cluster. Same crown layout: 5 upright, 9 arching, 6 dead hanging.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 19; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, rock: 0xc4b393, timber: 0xa07a4f, rust: 0x6b4426, foliage: 0x8a7a4e };
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  const trunkHex = mix(P.timber, P.rock, 0.45);
  const mTrunk = mat(trunkHex, 'timber', 0.92, 0, true);
  const mPlate = mat(shade(trunkHex, 0.88), 'timber', 0.95);
  const mPlateS = mat(shade(trunkHex, 0.98), 'timber', 0.95);
  const mRust = mat(P.rust, 'timber', 0.95);
  const greenish = new THREE.Color(P.foliage).multiply(new THREE.Color(0.94, 1.06, 0.9)).getHex();
  const mFrondTop = mat(greenish, 'foliage', 0.9, 0, true);
  const mFrond = mat(P.foliage, 'foliage', 0.9, 0, true);
  const mFrondDead = mat(shade(P.foliage, 0.78), 'foliage', 0.95, 0, true);
  const mRib = mat(shade(P.foliage, 0.85), 'foliage', 0.9);
  const mDate = mat(shade(P.rust, 1.2), 'foliage', 0.9);
  const mDust = mat(P.sand, 'ground', 0.95);
  const mSand = mat(P.sand, 'ground', 0.95);

  const H = 7.0;
  // trunk lathe: (radius, y)
  const prof = [[0.27, 0], [0.24, 0.3], [0.225, 0.8], [0.21, 2.2], [0.19, 3.9], [0.17, 5.6], [0.16, 6.7], [0.24, 7.05], [0.28, 7.3], [0.18, 7.5], [0, 7.5]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(prof, 10), mTrunk, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 10), mDust, 0, 7.42, 0);
  // rhombus plate profile, extruded 0.05
  const rh = new THREE.Shape(); rh.moveTo(0, 0.11); rh.lineTo(0.09, 0); rh.lineTo(0, -0.11); rh.lineTo(-0.09, 0); rh.closePath();
  const plateGeo = new THREE.ExtrudeGeometry(rh, { depth: 0.06, bevelEnabled: false });
  let ring = 0;
  for (let y = 0.4; y < H - 0.3; y += 0.3, ring++) {
    const r = 0.225 - (0.06 * y) / H;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2 + ring * (PI / 5);
      const holder = new THREE.Group(); holder.position.set(Math.cos(a) * r, y, Math.sin(a) * r); holder.rotation.y = -a + PI / 2; g.add(holder);
      const plate = add(plateGeo, Math.sin(a) > 0 ? mPlateS : mPlate, 0, 0, -0.03, holder);
      plate.rotation.x = -0.6;   // top edge tipped outward
      if ((k + ring) % 4 === 1) add(new THREE.BoxGeometry(0.04, 0.2, 0.015), mRust, 0.0, -0.2, 0.01, holder);
    }
  }
  // leaf profile: tapered leaf, extruded thin
  const leafGeo = (l) => { const sh = new THREE.Shape(); sh.moveTo(0, -0.04); sh.lineTo(l * 0.55, -0.05); sh.lineTo(l, 0); sh.lineTo(l * 0.55, 0.05); sh.lineTo(0, 0.04); sh.closePath(); const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); ge.rotateX(PI / 2); return ge; };
  const up = new THREE.Vector3(0, 1, 0);
  const frond = (az, e, L, sag, m, dead) => {
    const dx = Math.cos(az), dz = Math.sin(az);
    const p0 = new THREE.Vector3(dx * 0.18, H + 0.35, dz * 0.18);
    let pts;
    if (!dead) {
      pts = [p0,
        p0.clone().add(new THREE.Vector3(dx * L * 0.3 * Math.cos(e), L * 0.3 * Math.sin(e) + 0.1, dz * L * 0.3 * Math.cos(e))),
        p0.clone().add(new THREE.Vector3(dx * L * 0.62 * Math.cos(e), L * 0.62 * Math.sin(e) - sag * 0.3, dz * L * 0.62 * Math.cos(e))),
        p0.clone().add(new THREE.Vector3(dx * L * 0.9 * Math.cos(e), L * 0.9 * Math.sin(e) - sag, dz * L * 0.9 * Math.cos(e)))];
    } else {
      pts = [p0, new THREE.Vector3(p0.x + dx * 0.5, p0.y - 0.5, p0.z + dz * 0.5), new THREE.Vector3(p0.x + dx * 0.45, p0.y - 1.6, p0.z + dz * 0.45), new THREE.Vector3(p0.x + dx * 0.35, p0.y - L * 0.95, p0.z + dz * 0.35)];
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(new THREE.TubeGeometry(curve, 8, 0.022, 3, false), mRib, 0, 0, 0);
    for (let j = 0; j < 8; j++) {
      const t = 0.14 + (j / 7) * 0.84;
      const p = curve.getPoint(t), T = curve.getTangent(t).normalize();
      const S = new THREE.Vector3().crossVectors(T, up).normalize();
      const l = 0.85 - 0.45 * (j / 7);
      for (const side of [1, -1]) {
        const dir = S.clone().multiplyScalar(side * Math.cos(0.45)).add(T.clone().multiplyScalar(Math.sin(0.45))).add(new THREE.Vector3(0, -0.5, 0)).normalize();
        const z = new THREE.Vector3().crossVectors(dir, T).normalize();
        const y = new THREE.Vector3().crossVectors(z, dir).normalize();
        const leaf = add(leafGeo(l), m, 0, 0, 0);
        leaf.position.copy(p);
        leaf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, y, z));
      }
    }
  };
  for (let i = 0; i < 5; i++) frond((i / 5) * PI * 2 + 0.3, 1.0, 3.2, 1.0, mFrondTop, false);
  for (let i = 0; i < 9; i++) frond((i / 9) * PI * 2, 0.32, 3.4, 2.2, i % 3 ? mFrond : mFrondTop, false);
  for (let i = 0; i < 6; i++) frond((i / 6) * PI * 2 + 0.5, 0, 3.0, 0, mFrondDead, true);
  // dates: a lathe bunch (teardrop cluster) on a stalk
  const dprof = [[0, 0], [0.08, 0.05], [0.13, 0.25], [0.1, 0.5], [0.03, 0.62], [0, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 1.0;
    const bx = Math.cos(a) * 0.45, bz = Math.sin(a) * 0.45;
    const stalk = add(new THREE.CylinderGeometry(0.015, 0.02, 0.6, 5), mRib, bx * 0.6, H - 0.05, bz * 0.6);
    stalk.rotation.z = -Math.cos(a) * 0.5; stalk.rotation.x = Math.sin(a) * 0.5;
    add(new THREE.LatheGeometry(dprof, 7), mDate, bx, H - 1.0, bz);
  }
  const fillet = new THREE.CylinderGeometry(0.28, 0.65, 0.24, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.1 * Math.sin(z * 9 + x)), fp.getY(i), z * (1 + 0.1 * Math.cos(x * 8))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.04, 0.12, 0.05);

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
