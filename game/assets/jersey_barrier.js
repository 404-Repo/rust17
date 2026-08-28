// jersey_barrier candidate 2: a hand built loft. The profile polygon is swept along x as a
// BufferGeometry with a material group per face, so the south slope, north slope, stained
// toe and top each get their own colour with no overlapping skins. End caps are ShapeGeometry.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, concB: 0xb8ae9b, concS: 0x857c6c, rust: 0x6b4426, steel: 0x4f5257, rock: 0xc4b393 };
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

  const L = 3.0;
  const mats = [
    mat(C.concS, 'stone', 0.95),                 // 0 stained toe and lower batter
    mat(tint(C.concB, 1.07), 'stone', 0.92),     // 1 south slope, bleached lighter
    mat(tint(C.concB, 0.97), 'stone', 0.92),     // 2 north slope
    mat(C.concB, 'stone', 0.92),                 // 3 top and ends
    mat(tint(C.concS, 1.06), 'stone', 0.95),     // 4 south stained band
  ];
  // profile going clockwise seen from +x, as (z, y); the material index applies to the edge
  // starting at that point
  const P = [
    [0.30, 0.0, 0], [0.30, 0.075, 4], [0.20, 0.25, 4], [0.174, 0.40, 1], [0.10, 0.82, 3],
    [-0.10, 0.82, 2], [-0.174, 0.40, 0], [-0.20, 0.25, 0], [-0.30, 0.075, 0],
  ];
  const pos = [], groups = [];
  const segs = 3; // three bays along x so the loft carries mould seam lines at the third points
  let tri = 0;
  for (let e = 0; e < P.length; e++) {
    const a = P[e], b = P[(e + 1) % P.length];
    const start = tri;
    for (let sIdx = 0; sIdx < segs; sIdx++) {
      const x0 = -L / 2 + (L * sIdx) / segs, x1 = -L / 2 + (L * (sIdx + 1)) / segs;
      // quad: (x0,a) (x1,a) (x1,b) (x0,b), outward facing
      pos.push(x0, a[1], a[0], x1, a[1], a[0], x1, b[1], b[0]);
      pos.push(x0, a[1], a[0], x1, b[1], b[0], x0, b[1], b[0]);
      tri += 2;
    }
    groups.push([start * 3, (tri - start) * 3, a[2]]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const gr of groups) geo.addGroup(gr[0], gr[1], gr[2]);
  geo.computeVertexNormals();
  add(geo, mats);
  // end caps
  const prof = new THREE.Shape();
  prof.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) prof.lineTo(P[i][0], P[i][1]); prof.closePath();
  for (const s of [-1, 1]) {
    const cap = add(new THREE.ShapeGeometry(prof), mats[3], s * L / 2, 0, 0);
    cap.rotation.y = s * Math.PI / 2;
  }
  // mould seam lines at the bay joints, both faces, faint darker strips
  const seamM = mat(tint(C.concB, 0.9), 'stone', 0.9);
  const upA = Math.atan2(0.1, 0.57);
  for (const x of [-0.5, 0.5]) {
    const s1 = box(0.01, 0.55, 0.004, seamM, x, 0.55, 0.20 - (0.10 * 0.30) / 0.57 + 0.002); s1.rotation.x = -upA;
    const s2 = box(0.01, 0.55, 0.004, seamM, x, 0.55, -(0.20 - (0.10 * 0.30) / 0.57 + 0.002)); s2.rotation.x = upA;
  }
  // end details
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const stain = mats[0];
  for (const s of [-1, 1]) {
    const ex = s * L / 2;
    box(0.012, 0.14, 0.14, stain, ex + s * 0.004, 0.5, 0);
    const loop = add(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI), rustM, ex + s * 0.01, 0.47, 0);
    loop.rotation.y = Math.PI / 2;
    drip(0.34, 0.05, rustM, ex + s * 0.002, 0.44, 0, s * Math.PI / 2);
    if (s > 0) box(0.05, 0.45, 0.12, stain, ex + 0.025, 0.4, 0);
    else {
      box(0.006, 0.47, 0.14, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - 0.002, 0.4, 0);
      box(0.02, 0.47, 0.02, mats[3], ex - 0.01, 0.4, 0.08); box(0.02, 0.47, 0.02, mats[3], ex - 0.01, 0.4, -0.08);
    }
    box(0.2, 0.06, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.35, 0.03, 0.30);
    box(0.2, 0.06, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.35, 0.03, -0.30);
  }
  // a steel anchor plate on top at each third with a rust run down the south slope
  const steelM = mat(C.steel, 'metal', 0.8, 0.3);
  for (const x of [-0.95, 0.95]) {
    box(0.1, 0.01, 0.1, steelM, x, 0.825, 0);
    // four hex bolts on each anchor plate, and a rust bloom under the centre one
    for (const bx of [-0.035, 0.035]) for (const bz of [-0.035, 0.035]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), rustM, x + bx, 0.836, bz);
    box(0.018, 0.02, 0.018, rustM, x, 0.838, 0);
    // a rebar stub showing where the top edge has spalled beside the plate
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), rustM, x + 0.09, 0.80, 0.06).rotation.z = Math.PI / 2;
    drip(0.28, 0.05, rustM, x, 0.82, 0.104, 0).rotation.x = -upA;
  }
  const chipM = mat(C.rock, 'stone', 0.95);
  const chip1 = box(0.14, 0.03, 0.05, chipM, -1.1, 0.81, 0.09); chip1.rotation.z = 0.15;
  const chip2 = box(0.1, 0.035, 0.05, chipM, 0.6, 0.808, -0.085); chip2.rotation.z = -0.2;
  box(L - 0.08, 0.008, 0.14, mat(C.sandS, 'ground', 0.95, 0), 0, 0.824, 0);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(L - 0.1, 0.025, 0.12, fill, 0, 0.30, -Math.PI / 2);
  wedge(L - 0.1, 0.025, 0.09, fill, 0, -0.30, Math.PI / 2);
  wedge(0.6, 0.1, 0.1, fill, L / 2 + 0.05, 0, 0);
  wedge(0.6, 0.1, 0.1, fill, -L / 2, 0, Math.PI);

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
