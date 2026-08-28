// crate_stack candidate 0: primitives. Each crate is a dark liner box wrapped in individual
// horizontal boards with 30 mm gaps, corner cleats proud of the boards, one diagonal brace on
// each long face, a galvanised strap with a buckle plate, a nailed name plate, rust runs.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, galv: 0x9ea3a1, timber: 0xa07a4f };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.0, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const wedge = (L, out, h, m, x, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
    const o = add(geo, m, x, 0, z); o.rotation.y = ry; return o;
  };

  const boards = [0.92, 0.97, 1.02, 1.06].map((f) => mat(tint(C.timber, f), 'timber', 0.9));
  const boardsS = [0.98, 1.03, 1.08, 1.11].map((f) => mat(tint(C.timber, f), 'timber', 0.9));
  const lidM = mat(tint(C.timber, 1.12), 'timber', 0.92);
  const cleatM = mat(tint(C.timber, 0.88), 'timber', 0.9);
  const linerM = mat(tint(C.timber, 0.55), 'timber', 0.95);
  const plateM = mat(tint(C.timber, 0.6), 'timber', 0.9);
  const strapM = mat(C.galv, 'metal', 0.7, 0.5);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  const crate = (w, h, d, cx, cy, cz, straps, plateFace) => {
    const cr = new THREE.Group(); cr.position.set(cx, cy, cz); g.add(cr);
    box(w - 0.05, h - 0.05, d - 0.05, linerM, 0, h / 2, 0, cr);
    const n = Math.round(h / 0.13), pitch = h / n, bh = pitch - 0.03;
    for (let i = 0; i < n; i++) {
      const y = pitch * i + pitch / 2;
      box(w - 0.04, bh, 0.02, boardsS[i % 4], 0, y, d / 2 - 0.03, cr);
      box(w - 0.04, bh, 0.02, boards[(i + 1) % 4], 0, y, -d / 2 + 0.03, cr);
      box(0.02, bh, d - 0.08, boards[(i + 2) % 4], w / 2 - 0.03, y, 0, cr);
      box(0.02, bh, d - 0.08, boards[(i + 3) % 4], -w / 2 + 0.03, y, 0, cr);
    }
    // corner cleats, proud of the boards
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, h, 0.05, cleatM, sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025), cr);
    // lid boards across, plus two battens
    const nl = Math.round((d - 0.1) / 0.12);
    for (let i = 0; i < nl; i++) {
      const z = -d / 2 + 0.05 + ((d - 0.1) / nl) * (i + 0.5);
      box(w - 0.1, 0.02, (d - 0.1) / nl - 0.02, lidM, 0, h - 0.01, z, cr);
    }
    box(0.06, 0.02, d - 0.1, cleatM, -w / 4, h + 0.01, 0, cr);
    box(0.06, 0.02, d - 0.1, cleatM, w / 4, h + 0.01, 0, cr);
    box(w - 0.04, 0.02, d - 0.04, cleatM, 0, 0.01, 0, cr);
    // diagonal brace on each long face, between the cleats
    const bl = Math.hypot(w - 0.12, h - 0.12), ba = Math.atan2(h - 0.12, w - 0.12);
    const b1 = box(bl, 0.07, 0.02, cleatM, 0, h / 2, d / 2 - 0.01, cr); b1.rotation.z = ba;
    const b2 = box(bl, 0.07, 0.02, cleatM, 0, h / 2, -d / 2 + 0.01, cr); b2.rotation.z = -ba;
    // straps with buckle plate and rust
    for (const fy of straps) {
      const y = h * fy;
      box(w + 0.008, 0.03, 0.004, strapM, 0, y, d / 2 + 0.002, cr);
      box(w + 0.008, 0.03, 0.004, strapM, 0, y, -d / 2 - 0.002, cr);
      box(0.004, 0.03, d + 0.008, strapM, w / 2 + 0.002, y, 0, cr);
      box(0.004, 0.03, d + 0.008, strapM, -w / 2 - 0.002, y, 0, cr);
      box(0.06, 0.045, 0.012, strapM, w * 0.18, y, d / 2 + 0.008, cr);
      box(0.02, 0.02, 0.006, rustM, w * 0.18, y, d / 2 + 0.016, cr);
      drip(0.16, 0.05, rustM, w * 0.18, y - 0.02, d / 2 + 0.003, 0, cr);
      drip(0.12, 0.04, rustM, -w * 0.3, y - 0.015, d / 2 + 0.003, 0, cr);
      drip(0.1, 0.03, rustM, w * 0.38, y - 0.015, d / 2 + 0.003, 0, cr);
      drip(0.12, 0.04, rustM, 0, y - 0.015, -d / 2 - 0.003, Math.PI, cr);
      drip(0.1, 0.04, rustM, -w / 2 - 0.003, y - 0.015, -d * 0.2, -Math.PI / 2, cr);
      drip(0.1, 0.04, rustM, w / 2 + 0.003, y - 0.015, d * 0.25, Math.PI / 2, cr);
    }
    // nailed plate of darker timber with four rusty nails
    if (plateFace === 'front') {
      box(0.15, 0.1, 0.008, plateM, -w * 0.25, h * 0.7, d / 2 + 0.004, cr);
      for (const nx of [-0.065, 0.065]) for (const ny of [-0.04, 0.04]) box(0.01, 0.01, 0.006, rustM, -w * 0.25 + nx, h * 0.7 + ny, d / 2 + 0.01, cr);
    } else {
      box(0.008, 0.1, 0.15, plateM, w / 2 + 0.004, h * 0.65, 0.05, cr);
      for (const nz of [-0.065, 0.065]) for (const ny of [-0.04, 0.04]) box(0.006, 0.01, 0.01, rustM, w / 2 + 0.01, h * 0.65 + ny, 0.05 + nz, cr);
    }
    return cr;
  };
  crate(1.2, 0.6, 1.0, 0, 0, 0, [0.3, 0.72], 'front');
  crate(0.55, 0.7, 0.5, -0.325, 0.62, -0.15, [0.45], 'side');
  crate(0.55, 0.7, 0.5, 0.325, 0.62, -0.15, [0.5], 'front');
  // dust: on the exposed front strip of the bottom lid and on each small lid
  box(1.1, 0.008, 0.26, dustM, 0, 0.626, 0.26);
  box(0.47, 0.008, 0.42, dustM, -0.325, 1.336, -0.15);
  box(0.47, 0.008, 0.42, dustM, 0.325, 1.336, -0.15);
  // sand fillet
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(1.2, 0.05, 0.14, fill, 0, 0.5, -Math.PI / 2);
  wedge(1.2, 0.05, 0.1, fill, 0, -0.5, Math.PI / 2);
  wedge(1.0, 0.04, 0.16, fill, 0.6, 0, 0);
  wedge(1.0, 0.04, 0.12, fill, -0.6, 0, Math.PI);

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
