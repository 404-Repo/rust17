// ibc_tote candidate 1: a different reading. The bottle is a blow moulded rounded cube made
// by pulling a subdivided box onto a superellipse, the cage is square section welded bar with
// flat bar rings, the pallet is a pressed steel tray on six feet with open fork pockets.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, galv: 0x9ea3a1, concB: 0xb8ae9b, concS: 0x857c6c, red: 0x9c4a3c, gun: 0x3a3d40 };
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
  const wedge = (L, out, h, m, x, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
    const o = add(geo, m, x, 0, z); o.rotation.y = ry; return o;
  };

  const galv = mat(C.galv, 'metal', 0.7, 0.55);
  const galvD = mat(tint(C.galv, 0.85), 'metal', 0.75, 0.5);
  const bar = mat(tint(C.galv, 0.95), 'metal', 0.7, 0.55);
  const barS = mat(tint(C.galv, 1.05), 'metal', 0.7, 0.55);
  const plastic = mat(C.concB, 'plaster', 0.85, 0.0);
  const plasticLo = mat(tint(C.concB, 0.86), 'plaster', 0.85, 0.0);
  const tide = mat(tint(C.concS, 0.8), 'plaster', 0.9, 0.0);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const red = mat(C.red, 'metal', 0.75, 0.2);
  const gun = mat(C.gun, 'metal', 0.7, 0.4);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  // pallet: tray deck, six feet, fork pockets open through both long sides
  const PW = 1.2, PD = 1.0, PH = 0.16;
  box(PW, 0.04, PD, galv, 0, PH - 0.02, 0);
  box(PW, 0.03, 0.03, galvD, 0, PH - 0.055, PD / 2 - 0.015);
  box(PW, 0.03, 0.03, galvD, 0, PH - 0.055, -PD / 2 + 0.015);
  for (const x of [-0.55, 0, 0.55]) for (const z of [-0.4, 0.4]) box(0.1, PH - 0.04, 0.16, galvD, x, (PH - 0.04) / 2, z);
  for (const x of [-0.55, 0, 0.55]) box(0.08, 0.03, PD - 0.2, galvD, x, 0.015, 0);
  for (const x of [-0.55, 0.55]) for (const s of [-1, 1]) drip(0.07, 0.03, rustM, x, PH - 0.04, s * (PD / 2 + 0.002), s > 0 ? 0 : Math.PI);
  // bottle: rounded cube, split at the tide line into a stained lower and a cleaner upper
  const rounded = (w, h, d, y0, y1) => {
    const geo = new THREE.BoxGeometry(w, h, d, 6, 8, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), vv = p.getY(i) / (h / 2), ww = p.getZ(i) / (d / 2);
      const n = Math.pow(Math.pow(Math.abs(u), 6) + Math.pow(Math.abs(vv), 6) + Math.pow(Math.abs(ww), 6), 1 / 6) || 1;
      const k = 1 / Math.max(n, 0.9);
      p.setXYZ(i, u * k * (w / 2), vv * k * (h / 2), ww * k * (d / 2));
    }
    geo.computeVertexNormals();
    // keep only the slab between y0 and y1 of the full cube by clamping vertices (a cheap split)
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, Math.min(Math.max(y, y0), y1)); }
    return geo;
  };
  const B = 0.95, bx0 = PH, cy = bx0 + B / 2, split = 0.7;
  add(rounded(B, B, B, -B / 2, split - cy), plasticLo, 0, cy, 0);
  add(rounded(B, B, B, split - cy, B / 2), plastic, 0, cy, 0);
  box(B + 0.004, 0.03, B + 0.004, tide, 0, split, 0);
  for (let k = 1; k < 4; k++) { const y = bx0 + 0.25 * k; if (Math.abs(y - split) > 0.03) box(B - 0.03, 0.012, B + 0.004, plasticLo, 0, y, 0); }
  box(B - 0.16, 0.008, B - 0.16, dustM, 0, bx0 + B + 0.002, 0);
  cyl(0.09, 0.09, 0.012, 14, plasticLo, 0, bx0 + B + 0.004, 0);
  cyl(0.075, 0.075, 0.03, 14, gun, 0, bx0 + B + 0.02, 0);
  // valve
  const vb = box(0.06, 0.06, 0.09, galvD, 0, PH + 0.08, B / 2 + 0.03); void vb;
  cyl(0.036, 0.036, 0.02, 10, gun, 0, PH + 0.08, B / 2 + 0.075).rotation.x = Math.PI / 2;
  box(0.09, 0.016, 0.02, red, 0, PH + 0.13, B / 2 + 0.04);
  box(0.016, 0.05, 0.016, red, 0, PH + 0.105, B / 2 + 0.04);
  // cage: square bar verticals, flat bar rings, angle corner posts, boxed top frame
  const half = 0.49, yb = PH, yt = 1.15;
  const vgeo = new THREE.BoxGeometry(0.02, yt - yb, 0.02);
  const positions = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45];
  for (const p of positions) {
    add(vgeo, barS, p, (yt + yb) / 2, half);
    add(vgeo, bar, p, (yt + yb) / 2, -half);
    add(vgeo, bar, half, (yt + yb) / 2, p);
    add(vgeo, bar, -half, (yt + yb) / 2, p);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.03, yt - yb, 0.006, galvD, sx * (half + 0.005), (yt + yb) / 2, sz * (half + 0.017));
    box(0.006, yt - yb, 0.03, galvD, sx * (half + 0.017), (yt + yb) / 2, sz * (half + 0.005));
  }
  const rings = [0.19, 0.34, 0.49, 0.64, 0.79, 0.94, 1.09];
  for (const y of rings) {
    box(2 * half + 0.04, 0.02, 0.006, barS, 0, y, half + 0.013);
    box(2 * half + 0.04, 0.02, 0.006, bar, 0, y, -half - 0.013);
    box(0.006, 0.02, 2 * half + 0.04, bar, half + 0.013, y, 0);
    box(0.006, 0.02, 2 * half + 0.04, bar, -half - 0.013, y, 0);
  }
  box(2 * half + 0.04, 0.03, 0.03, galvD, 0, yt, half + 0.005);
  box(2 * half + 0.04, 0.03, 0.03, galvD, 0, yt, -half - 0.005);
  box(0.03, 0.03, 2 * half + 0.04, galvD, half + 0.005, yt, 0);
  box(0.03, 0.03, 2 * half + 0.04, galvD, -half - 0.005, yt, 0);
  for (const y of [0.34, 0.79, 1.09]) for (const p of positions) {
    drip(0.06, 0.022, rustM, p, y - 0.01, half + 0.017, 0);
    drip(0.06, 0.022, rustM, p, y - 0.01, -half - 0.017, Math.PI);
    drip(0.06, 0.022, rustM, half + 0.017, y - 0.01, p, Math.PI / 2);
    drip(0.06, 0.022, rustM, -half - 0.017, y - 0.01, p, -Math.PI / 2);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) drip(0.14, 0.03, rustM, sx * (half + 0.005), yt - 0.015, sz * (half + 0.021), sz > 0 ? 0 : Math.PI);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(PD, 0.055, 0.12, fill, PW / 2, 0, 0);
  wedge(PD, 0.055, 0.1, fill, -PW / 2, 0, Math.PI);
  wedge(PW - 0.1, 0.045, 0.08, fill, 0, PD / 2, -Math.PI / 2);
  wedge(PW - 0.1, 0.045, 0.1, fill, 0, -PD / 2, Math.PI / 2);

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
