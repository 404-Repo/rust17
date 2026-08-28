// compound_wall_panel candidate 1: profile extrusion. The whole cross section
// (spread foot with batter, plinth step at 0.4, upright, chamfered top) is one
// Shape extruded along x, so the foot and the plinth line are real geometry
// rather than applied strips. Details: lifting eyes, end grooves, rust, dust, sand.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xbdb39f, 'stone', 0.90, 0.0);
  const concS = M(0xc6bca8, 'stone', 0.90, 0.0);
  const concN = M(0xb1a793, 'stone', 0.90, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x78705f, 'stone', 0.92, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x5a381f, 'metal', 0.85, 0.2);
  const eye = M(0x4f5257, 'metal', 0.70, 0.5);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc4af87, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  // extrude a (z, y) profile along x, centred on x
  const sweep = (pts, len, mat, x0) => {
    const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat);
    mm.rotation.y = Math.PI / 2;               // extrude axis z -> x
    mm.position.x = (x0 === undefined ? -len / 2 : x0);
    g.add(mm); return mm;
  };

  const W = 4.0, H = 2.4;
  // cross section, z across, y up. Foot 0.40 deep, upright 0.32, cap chamfer.
  const prof = [
    [-0.185, 0.00], [0.185, 0.00], [0.185, 0.08], [0.175, 0.16], [0.16, 0.36],
    [0.18, 0.36], [0.18, 0.42], [0.16, 0.44], [0.16, 2.33], [0.14, 2.40],
    [-0.14, 2.40], [-0.16, 2.33], [-0.16, 0.44], [-0.18, 0.42], [-0.18, 0.36],
    [-0.16, 0.36], [-0.175, 0.16], [-0.185, 0.08],
  ];
  // bleached body above the plinth, stained foot below: two sweeps split at 0.44
  const lower = prof.filter(([, y]) => y <= 0.44);
  const upperPts = [[-0.16, 0.44], [0.16, 0.44], [0.16, 2.33], [0.14, 2.40], [-0.14, 2.40], [-0.16, 2.33]];
  sweep(lower, W, stain);
  sweep(upperPts, W, conc);
  // face skins carrying the sun/shade tint, inset from the grooves
  box(W - 0.20, H - 0.52, 0.012, concS, 0, 0.48 + (H - 0.52) / 2, 0.165);
  box(W - 0.20, H - 0.52, 0.012, concN, 0, 0.48 + (H - 0.52) / 2, -0.165);
  // lift line at 1.2 and end joint grooves
  box(W - 0.2, 0.025, 0.36, groove, 0, 1.22, 0);
  for (const sx of [-1, 1]) {
    box(0.04, H - 0.5, 0.36, groove, sx * (W / 2 - 0.07), 0.46 + (H - 0.5) / 2, 0);
    box(0.018, H - 0.1, 0.42, stainD, sx * (W / 2 - 0.009), H / 2, 0);   // end faces stained
  }
  // lifting eye recesses in the top face
  for (const ex of [-1.3, 1.3]) {
    box(0.15, 0.04, 0.15, groove, ex, H - 0.01, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 6, 12), eye);
    ring.rotation.x = Math.PI / 2; ring.position.set(ex, H - 0.012, 0); g.add(ring);
    box(0.07, 0.01, 0.16, rust, ex, H - 0.015, 0);
  }
  // face anchors with rust runs: two south, one north
  for (const [ex, sz] of [[-1.3, 1], [1.3, 1], [-0.2, -1]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.012, 6, 12), rust);
    ring.position.set(ex, 1.9, sz * 0.174); g.add(ring);
    box(0.045, 1.1, 0.006, rust, ex, 1.30, sz * 0.175);
    box(0.02, 0.6, 0.006, rustD, ex - 0.02, 0.95, sz * 0.177);
    box(0.02, 0.4, 0.006, rustD, ex + 0.025, 1.20, sz * 0.177);
  }
  // dust cap on the top and on the plinth ledge
  box(W - 0.08, 0.012, 0.25, dust, 0, H + 0.005, 0);
  for (const sz of [-1, 1]) box(W - 0.3, 0.008, 0.02, dust, 0.1, 0.424, sz * 0.176);
  // chipped corners
  box(0.18, 0.14, 0.34, stainD, W / 2 - 0.09, H - 0.07, 0);
  box(0.12, 0.09, 0.34, stainD, -W / 2 + 0.06, H - 0.045, 0);
  box(0.12, 0.10, 0.02, groove, W / 2 - 0.06, H - 0.06, 0.171);
  // sand skin against both sides of the foot, higher against the north side
  for (const sz of [-1, 1]) {
    box(W, 0.05, 0.03, sand, 0, 0.025, sz * 0.20);
    box(W - 0.8, 0.06, 0.025, sand, -0.3, 0.075, sz * 0.195);
    box(W - 2.0, 0.06, 0.02, sand, 0.5, 0.13, sz * 0.185);
    if (sz < 0) box(1.6, 0.07, 0.02, dust, -0.6, 0.19, sz * 0.178);
  }

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
