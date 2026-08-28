// oil_drum candidate 0: lathe. One revolved profile carries both chimes and both rolling
// hoops, split into a stained lower third and a bleached upper body. A dent is pushed into
// the upper shell by displacing vertices. Raised lid, two bungs, weld seam with rivets, rust.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, tank: 0x9c988c, concS: 0x857c6c, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.8, metalness = 0.2, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const lathe = (pts, seg, m) => add(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m);

  const R = 0.2925, H = 0.88, SEG = 14;
  const bleachedTan = tint(C.tank, 1.12);        // sun bleached tan steel
  const upperM = mat(bleachedTan, 'metal', 0.85, 0.15, THREE.DoubleSide);
  const upperS = mat(tint(bleachedTan, 1.06), 'metal', 0.85, 0.15);
  const lowerM = mat(tint(C.concS, 0.95), 'metal', 0.9, 0.1, THREE.DoubleSide);
  const hoopM = mat(tint(bleachedTan, 0.92), 'metal', 0.8, 0.2, THREE.DoubleSide);
  const lidM = mat(tint(bleachedTan, 0.97), 'metal', 0.85, 0.15, THREE.DoubleSide);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const gun = mat(C.gun, 'metal', 0.7, 0.5);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  // lower third: bottom chime, shell, first hoop
  lathe([[0.25, 0.0], [R + 0.006, 0.0], [R + 0.008, 0.018], [R, 0.03], [R, 0.26], [R + 0.012, 0.27], [R + 0.012, 0.29], [R, 0.30]], SEG, lowerM);
  // upper body: shell with the second hoop, top chime and a recessed lid rim
  const upper = lathe([[R, 0.30], [R, 0.58], [R + 0.012, 0.59], [R + 0.012, 0.61], [R, 0.62], [R, 0.85], [R + 0.008, 0.862], [R + 0.008, 0.878], [R - 0.004, H], [R - 0.02, H - 0.006], [R - 0.02, H - 0.012], [0.0, H - 0.012]], SEG, upperM);
  // hoops re-coloured: a second thin lathe on each hoop so they read darker
  lathe([[R + 0.0125, 0.268], [R + 0.0125, 0.292]], SEG, hoopM);
  lathe([[R + 0.0125, 0.588], [R + 0.0125, 0.612]], SEG, hoopM);
  // dent, 0.15 m across, pushed into the upper shell on the -x side between the hoops
  const p = upper.geometry.attributes.position;
  const dentY = 0.45, dentA = Math.PI;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z); if (r < R - 0.001 || y < 0.31 || y > 0.57) continue;
    const a = Math.atan2(z, x);
    let da = Math.abs(a - dentA); if (da > Math.PI) da = 2 * Math.PI - da;
    const dArc = da * R, dy = Math.abs(y - dentY);
    const d = Math.hypot(dArc / 0.075, dy / 0.13);
    if (d < 1) { const k = 0.045 * (1 - d * d); p.setXYZ(i, x - (x / r) * k, y, z - (z / r) * k); }
  }
  p.needsUpdate = true; upper.geometry.computeVertexNormals();
  // lid: a flat disc inside the top chime with two bung caps, dust settled on it
  cyl(R - 0.02, R - 0.02, 0.006, SEG, lidM, 0, H - 0.012, 0);
  cyl(0.2, 0.2, 0.004, SEG, dustM, 0, H - 0.007, 0);
  for (const [bx, bz, br] of [[0.19, 0.0, 0.03], [-0.19, 0.0, 0.02]]) {
    cyl(br + 0.008, br + 0.008, 0.004, 10, hoopM, bx, H - 0.006, bz);
    cyl(br, br, 0.012, 10, gun, bx, H - 0.002, bz);
  }
  // south face lighter: a thin skin panel on the +z side of the upper shell
  const skin = add(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.5, SEG, 1, true, -Math.PI / 4 + Math.PI / 2 * 0, Math.PI / 2), upperS, 0, 0.58, 0);
  skin.rotation.y = 0;
  // vertical weld seam with four rivets on the +x side, rust down the seam
  const seamA = 0.3;
  const sx = Math.cos(seamA) * (R + 0.002), sz = Math.sin(seamA) * (R + 0.002);
  const seam = box(0.006, 0.8, 0.004, mat(tint(bleachedTan, 0.85), 'metal', 0.8, 0.2), sx, 0.44, sz); seam.rotation.y = -seamA + Math.PI / 2;
  for (const ry of [0.12, 0.38, 0.5, 0.75]) { const rv = cyl(0.006, 0.006, 0.006, 6, gun, sx, ry, sz); rv.rotation.z = -Math.PI / 2; rv.rotation.y = -seamA; }
  drip(0.2, 0.03, rustM, Math.cos(seamA) * (R + 0.004), 0.37, Math.sin(seamA) * (R + 0.004), Math.PI / 2 - seamA);
  // rust streaks from each bung down the side
  drip(0.34, 0.05, rustM, R + 0.004, 0.86, 0.0, Math.PI / 2);
  drip(0.2, 0.04, rustM, -(R + 0.004), 0.86, 0.03, -Math.PI / 2);
  drip(0.14, 0.03, rustM, 0.0, 0.26, R + 0.004, 0);     // stain under the lower hoop, south side
  // sand fillet around the base as a low mound, and blown against the north side
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  lathe([[R - 0.02, 0.09], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  const drift = lathe([[0.0, 0.14], [R * 0.6, 0.1], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  drift.scale.set(0.95, 1, 0.5); drift.position.z = -0.12;

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pp = n.isMesh && n.geometry.attributes.position; if (!pp) return;
    const put = (mm) => { for (let i = 0; i < pp.count; i++) box3.expandByPoint(v.fromBufferAttribute(pp, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
