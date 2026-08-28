// corrugated_wall_panel candidate 1: profile extrusion. The corrugation is a
// sine profile Shape extruded UP (along y); the run is three overlapping sheets
// of different heights so the top edge steps, and the posts are extruded
// I-section profiles as the reference shows. Rails, screws, rust, sand drift.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvB = M(0xa7aba9, 'metal', 0.72, 0.55, true);
  const post = M(0x8d8b84, 'metal', 0.80, 0.30, true);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const timber = M(0xa07a4f, 'timber', 0.90, 0.0);
  const timberS = M(0xab8453, 'timber', 0.90, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc5b088, 'ground', 0.95, 0.0);
  const sandL = M(0xbba37b, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const W = 3.0, PITCH = 0.076, AMP = 0.012, TH = 0.004;

  // a corrugated sheet as a closed thin profile (front wave, back wave) extruded along y
  const corrSheet = (len, height, mat) => {
    const n = Math.round(len / PITCH) * 6;
    const s = new THREE.Shape();
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (i / n) * len;
      const z = AMP * Math.sin((x + len / 2) / PITCH * Math.PI * 2);
      if (i === 0) s.moveTo(x, z + TH / 2); else s.lineTo(x, z + TH / 2);
    }
    for (let i = n; i >= 0; i--) {
      const x = -len / 2 + (i / n) * len;
      const z = AMP * Math.sin((x + len / 2) / PITCH * Math.PI * 2);
      s.lineTo(x, z - TH / 2);
    }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 1 });
    const mm = new THREE.Mesh(geo, mat);
    mm.rotation.x = -Math.PI / 2;           // extrude axis z -> +y, shape y -> -z... fix below
    return mm;
  };
  // three sheets lapping by one pitch, heights 2.40, 2.32, 2.37 so the top steps
  const sheets = [[-1.0, 1.08, 2.40, galv], [0.0, 1.08, 2.31, galvB], [1.0, 1.08, 2.37, galv]];
  for (const [cx, len, h, mat] of sheets) {
    const mm = corrSheet(len, h, mat);
    // after rotation.x = -PI/2: local (x, y, z) -> (x, z, -y): the shape's y (rib depth) maps to -z, extrude depth maps to +y
    mm.position.set(cx, 0, -0.02);
    g.add(mm);
  }
  // bent bottom corner: a short curled strip in front of the left sheet's foot
  const curl = new THREE.Group(); curl.position.set(-W / 2 + 0.1, 0.02, -0.005); g.add(curl);
  const c1 = corrSheet(0.30, 0.30, galvB); c1.rotation.x = -Math.PI / 2 + 0.12; c1.position.set(0.05, 0.0, -0.015); curl.add(c1);
  box(0.30, 0.03, 0.006, rustD, 0.05, 0.31, 0.025, curl);   // torn edge, rusted
  // sand colour on the bottom 0.3 m: thin sand skins front and back
  for (const sz of [1, -1]) {
    const sk = corrSheet(W - 0.08, 0.30, sandL); sk.position.set(0, 0.0, -0.02 + sz * 0.003); g.add(sk);
  }

  // ---- I-section posts (0.08 square envelope) as extruded profiles ----
  const iProfile = new THREE.Shape([
    [-0.04, -0.04], [0.04, -0.04], [0.04, -0.03], [0.006, -0.03], [0.006, 0.03], [0.04, 0.03], [0.04, 0.04],
    [-0.04, 0.04], [-0.04, 0.03], [-0.006, 0.03], [-0.006, -0.03], [-0.04, -0.03],
  ].map(([a, b]) => new THREE.Vector2(a, b)));
  for (const px of [-W / 2 + 0.04, 0, W / 2 - 0.04]) {
    const geo = new THREE.ExtrudeGeometry(iProfile, { depth: 2.45, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, post); mm.rotation.x = -Math.PI / 2; mm.rotation.z = Math.PI / 2;
    mm.position.set(px, 0.012, -0.06); g.add(mm);
    box(0.16, 0.012, 0.10, steel, px, 0.006, -0.06);
    for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 8), rust);
      b.position.set(px + bx * 0.06, 0.019, -0.06 + bz * 0.035); g.add(b);
    }
    box(0.03, 0.22, 0.006, rust, px - 0.018, 0.14, -0.017);
    box(0.07, 0.05, 0.006, rustD, px, 0.04, -0.017);
    box(0.03, 0.22, 0.006, rust, px + 0.018, 0.14, -0.103);
    box(0.06, 0.008, 0.07, dust, px, 2.466, -0.06);
    box(0.02, 0.10, 0.006, rust, px + 0.02, 2.36, -0.017);
    box(0.02, 0.10, 0.006, rust, px - 0.02, 2.36, -0.103);
  }
  // ---- timber rails at 0.7 and 1.9 behind the sheet between the posts; screw
  //      heads and rust runs on the front face, screw tips on the rail backs ----
  for (const ry of [0.7, 1.9]) {
    for (const [x0, x1] of [[-W / 2 + 0.08, -0.04], [0.04, W / 2 - 0.08]]) {
      const len = x1 - x0, cx = (x0 + x1) / 2;
      box(len, 0.10, 0.05, timber, cx, ry, -0.058);
      box(len - 0.04, 0.04, 0.004, timberS, cx, ry + 0.025, -0.085);
      box(len, 0.008, 0.05, dust, cx, ry + 0.054, -0.058);
      for (let sx = x0 + 0.15; sx < x1 - 0.05; sx += 0.30) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 8), steel);
        s.rotation.x = Math.PI / 2; s.position.set(sx, ry, -0.004); g.add(s);
        box(0.014, 0.2, 0.004, rust, sx, ry - 0.14, -0.005);
        box(0.008, 0.12, 0.004, rustD, sx - 0.004, ry - 0.24, -0.004);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 6), rust);
        t.rotation.x = Math.PI / 2; t.position.set(sx, ry, -0.088); g.add(t);
        box(0.012, 0.09, 0.004, rust, sx, ry - 0.075, -0.086);
      }
    }
    for (let sx = -1.05; sx < 1.3; sx += 0.45) box(0.02, 0.16, 0.004, rust, sx, ry - 0.13, -0.034);
  }
  // dirt and rust on the sheet back: at the two laps, and splash above the drift
  for (const lx of [-0.5, 0.5]) { box(0.03, 2.2, 0.004, rustD, lx, 1.2, -0.036); box(0.06, 0.4, 0.004, rust, lx + 0.03, 0.6, -0.037); }
  for (let sx = -1.3; sx < 1.4; sx += 0.35) box(0.12, 0.08 + 0.05 * Math.abs(Math.sin(sx * 3)), 0.004, sandL, sx, 0.34, -0.036);
  // ---- sand drift, front berm and back skin ----
  box(W, 0.05, 0.04, sand, 0, 0.025, 0.01);
  box(W - 0.8, 0.06, 0.03, sand, -0.1, 0.075, 0.005);
  box(1.4, 0.06, 0.02, dust, 0.3, 0.13, 0.0);
  box(0.7, 0.05, 0.015, dust, 0.6, 0.18, -0.003);
  box(W, 0.05, 0.02, sand, 0, 0.025, -0.10);
  box(1.2, 0.06, 0.015, sandL, 0.7, 0.075, -0.098);

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) box3.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
