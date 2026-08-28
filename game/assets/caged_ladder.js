// caged_ladder candidate 1: built from profiles. Each stile is a circle profile
// extruded along one path (straight up, a bend, a return to the wall), rungs are
// circle sweeps, the cage hoops are true flat bar bands (a D shaped ring Shape
// extruded 40 mm), the vertical cage bars are flat rectangles swept, brackets are an
// extruded angle profile, sand at the feet is lathed. Its back faces -Z.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvS = M(0xaaafad, 'metal', 0.70, 0.55, true);
  const galvD = M(0x8c9190, 'metal', 0.74, 0.55, true);
  const worn = M(0x7f8384, 'metal', 0.66, 0.6);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const sweep = (shape, p, q, mat, up, cs) => {
    const dir = q.clone().sub(p); const len = dir.length(); dir.normalize();
    const u = (up || (Math.abs(dir.y) > 0.9 ? V(0, 0, 1) : V(0, 1, 0))).clone();
    const xa = new THREE.Vector3().crossVectors(u, dir).normalize();
    const ya = new THREE.Vector3().crossVectors(dir, xa).normalize();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: cs || 4 });
    const mm = new THREE.Mesh(geo, mat);
    mm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, dir));
    mm.position.copy(p); g.add(mm); return mm;
  };
  const rect = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); return s; };
  const circle = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
  const box = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };

  const SX = 0.225, SR = 0.03, WALL = -0.23, TOP = 4.6;

  // ---- stiles: one extrusion along a path with the bend in it ----
  for (const sx of [-1, 1]) {
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V(sx * SX, 0.0, 0), V(sx * SX, TOP - 0.15, 0)));
    path.add(new THREE.QuadraticBezierCurve3(V(sx * SX, TOP - 0.15, 0), V(sx * SX, TOP, 0), V(sx * SX, TOP, -0.15)));
    path.add(new THREE.LineCurve3(V(sx * SX, TOP, -0.15), V(sx * SX, TOP, WALL)));
    const geo = new THREE.ExtrudeGeometry(circle(SR), { steps: 40, bevelEnabled: false, extrudePath: path, curveSegments: 4 });
    g.add(new THREE.Mesh(geo, sx > 0 ? galv : galvS));
    sweep(rect(0.1, 0.1), V(sx * SX, TOP, WALL + 0.002), V(sx * SX, TOP, WALL - 0.01), steel);
  }
  // ---- rungs ----
  for (let i = 1; i <= 12; i++) {
    sweep(circle(0.0125), V(-SX, i * 0.3, 0), V(SX, i * 0.3, 0), galvD, V(0, 1, 0));
    box(0.36, 0.006, 0.014, worn, 0, i * 0.3 + 0.012, 0);
  }
  // ---- brackets: extruded angle from the stile to the wall, plate and bolts ----
  const angle = () => { const s = new THREE.Shape(); s.moveTo(-0.025, -0.025); s.lineTo(0.025, -0.025); s.lineTo(0.025, -0.017); s.lineTo(-0.017, -0.017); s.lineTo(-0.017, 0.025); s.lineTo(-0.025, 0.025); s.closePath(); return s; };
  for (const y of [0.6, 1.5, 2.4, 3.3]) for (const sx of [-1, 1]) {
    sweep(angle(), V(sx * SX, y, SR), V(sx * SX, y, WALL), steel, V(0, 1, 0));
    sweep(rect(0.12, 0.12), V(sx * SX, y, WALL + 0.002), V(sx * SX, y, WALL - 0.01), steel);
    for (const dy of [-0.04, 0.04]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.02, 6), gun); b.rotation.x = Math.PI / 2; b.position.set(sx * SX, y + dy, WALL - 0.02); g.add(b); }
    box(0.05, 0.22, 0.005, rust, sx * SX, y - 0.17, WALL - 0.015);
    box(0.02, 0.1, 0.005, rust, sx * SX + 0.03, y - 0.09, SR + 0.002);
  }
  // ---- cage hoops: flat bar D rings, extruded 40 mm tall ----
  const Dring = (rx, rz, t) => {
    const s = new THREE.Shape();
    s.moveTo(-rx, 0); s.absellipse(0, 0, rx, rz, Math.PI, 0, true, 0); s.lineTo(rx, WALL); s.lineTo(-rx, WALL); s.closePath();
    const h = new THREE.Path();
    h.moveTo(-rx + t, 0); h.absellipse(0, 0, rx - t, rz - t, Math.PI, 0, true, 0); h.lineTo(rx - t, WALL); h.lineTo(-rx + t, WALL); h.closePath();
    s.holes.push(h); return s;
  };
  const hoopY = [2.2, 2.79, 3.38, 3.97, 4.55];
  for (const y of hoopY) {
    // shape x -> world x, shape y -> world z; sweep along +y with up = -z so local y = +z
    const mm = sweep(Dring(0.36, 0.26, 0.008), V(0, y - 0.02, 0), V(0, y + 0.02, 0), galv, V(0, 0, -1), 10);
  }
  for (const a of [Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6]) {
    const x = 0.36 * Math.cos(a), z = 0.26 * Math.sin(a);
    sweep(rect(0.03, 0.008), V(x, hoopY[0] - 0.02, z), V(x, hoopY[4] + 0.02, z), a === Math.PI / 2 ? galvS : galv, V(-Math.cos(a), 0, -Math.sin(a)));
  }
  // ---- feet: lathed sand mounds ----
  const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(0.17 * (1 - t), 0.1 * (1 - (1 - t) * (1 - t)))); }
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), dust); m.scale.set(1, 1, 0.9); m.position.set(sx * SX, 0, 0.02); g.add(m); }

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
