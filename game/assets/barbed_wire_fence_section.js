// barbed_wire_fence_section c1: profiles and buffers. Posts are ExtrudeGeometry channel sections
// (open C, so the flanges read), the chain link is ONE hand built BufferGeometry of double sided
// diagonal quads (0.05 m diamonds), the concertina coil is a TubeGeometry along an 18 turn helix,
// barbed strands are tubes with lathe barb knots, feet are extruded pyramidal frustums with a
// chamfer, drifts are extruded triangle wedges along the foot of the mesh.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, concB: 0xb8ae9b, concS: 0x857c6c, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, gun: 0x3a3d40 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.3, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const ext = (sh, depth) => new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  const mPost = mat(P.galv, 'metal', 0.7, 0.5, true), mPostS = mat(shade(P.galv, 1.07), 'metal', 0.7, 0.5, true), mPostD = mat(shade(P.galv, 0.85), 'metal', 0.8, 0.4, true);
  const mWire = mat(shade(P.galv, 0.92), 'metal', 0.7, 0.55, true), mWireR = mat(shade(P.rust, 1.25), 'metal', 0.9, 0.2, true);
  const mBarb = mat(P.rust, 'metal', 0.95, 0.1), mBolt = mat(P.gun, 'metal', 0.7, 0.5), mRust = mat(P.rust, 'metal', 0.95, 0.05);
  const mFoot = mat(P.concB, 'stone', 0.95, 0), mFootS = mat(P.concS, 'stone', 0.95, 0);
  const mSand = mat(P.sand, 'ground', 0.95, 0), mDust = mat(P.sand, 'ground', 0.95, 0);

  const PX = 1.43, PH = 2.3, PW = 0.07;
  // channel section: C open toward the mesh (inward)
  const chan = (open) => { const t = 0.008, w = PW, d = PW; const sh = new THREE.Shape(); const s = open; sh.moveTo(-w / 2, -d / 2); sh.lineTo(w / 2, -d / 2); sh.lineTo(w / 2, d / 2); sh.lineTo(-w / 2, d / 2); sh.lineTo(-w / 2, d / 2 - t); sh.lineTo(w / 2 - t * s, d / 2 - t); sh.lineTo(w / 2 - t * s, -d / 2 + t); sh.lineTo(-w / 2, -d / 2 + t); sh.closePath(); return sh; };
  // frustum foot profile (plan square, tapered): built as a lathe with 4 segments
  const footGeo = new THREE.LatheGeometry([[0.2, 0], [0.2, 0.08], [0.17, 0.25], [0, 0.25]].map(([r, y]) => new THREE.Vector2(r, y)), 4);
  for (const sx of [-1, 1]) {
    const x = sx * PX;
    const f = add(footGeo, mFoot, x, 0, 0); f.rotation.y = PI / 4;
    add(new THREE.LatheGeometry([[0.205, 0], [0.205, 0.09], [0.19, 0.09]].map(([r, y]) => new THREE.Vector2(r, y)), 4), mFootS, x, 0, 0).rotation.y = PI / 4;
    add(new THREE.BoxGeometry(0.2, 0.008, 0.2), mDust, x, 0.254, 0);
    const pg = ext(chan(1), PH - 0.25); pg.rotateX(-PI / 2); pg.rotateY(sx > 0 ? PI : 0);
    add(pg, mPost, x, 0.25, 0);
    add(new THREE.BoxGeometry(PW - 0.01, PH - 0.3, 0.004), mPostS, x, 0.25 + (PH - 0.25) / 2, PW / 2 + 0.001);
    add(new THREE.BoxGeometry(PW + 0.004, 0.012, PW + 0.004), mPostD, x, PH - 0.002, 0);
    // arm: extruded channel too, leaning 20 degrees outward
    const arm = new THREE.Group(); arm.position.set(x, PH - 0.02, 0); arm.rotation.x = -0.35; g.add(arm);
    const ag = ext(chan(1), 0.3); ag.rotateX(-PI / 2); ag.scale(0.7, 1, 0.7);
    add(ag, mPostD, 0, 0, 0, arm);
    for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 5), mWire, 0, 0.09 + k * 0.09, 0.03, arm).rotation.z = PI / 2;
    // gusset: extruded triangle
    const gs = new THREE.Shape(); gs.moveTo(0, 0); gs.lineTo(0, 0.12); gs.lineTo(0.08, 0); gs.closePath();
    const gg = ext(gs, 0.006); gg.rotateY(PI / 2);
    add(gg, mPostD, x, PH - 0.13, PW / 2);
    for (const bz of [0.05, -0.05]) { add(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 6), mBolt, x, PH - 0.06, bz).rotation.x = PI / 2; add(new THREE.BoxGeometry(0.012, 0.18, 0.003), mRust, x, PH - 0.17, bz > 0 ? PW / 2 + 0.0035 : -PW / 2 - 0.0035); }
    add(new THREE.CylinderGeometry(0.006, 0.006, 2.05, 5), mPostD, x - sx * 0.045, 1.08, 0);
    for (let k = 0; k < 3; k++) { const y = 0.3 + k * 0.85; add(new THREE.BoxGeometry(0.05, 0.02, 0.02), mPostD, x - sx * 0.025, y, 0); add(new THREE.CylinderGeometry(0.007, 0.007, 0.024, 6), mBolt, x - sx * 0.025, y, 0).rotation.x = PI / 2; add(new THREE.BoxGeometry(0.02, 0.15, 0.003), mRust, x - sx * 0.025, y - 0.09, 0.012); }
  }
  // chain link as one buffer of diagonal quads
  const X0 = -PX + 0.045, X1 = PX - 0.045, Y0 = 0.06, Y1 = 2.1;
  const pitch = 0.05 * Math.SQRT2, hw = 0.0028;
  const pos = [], posR = [];
  let n = 0;
  for (const dir of [1, -1]) {
    for (let c = -(Y1 + 0.2); c < X1 - X0 + Y1 + 0.2; c += pitch) {
      const yAt = (x) => Y0 + dir * (x - X0) - c;
      const xs = [X0, X1, c / dir + X0, (Y1 - Y0 + c) / dir + X0].sort((a, b) => a - b);
      const xa = Math.max(X0, xs[1]), xb = Math.min(X1, xs[2]);
      if (xb - xa < 0.03) continue;
      const ya = yAt(xa), yb = yAt(xb);
      if (ya < Y0 - 1e-6 || ya > Y1 + 1e-6 || yb < Y0 - 1e-6 || yb > Y1 + 1e-6) continue;
      const nx = -(yb - ya), ny = (xb - xa); const L = Math.hypot(nx, ny); const ox = (nx / L) * hw, oy = (ny / L) * hw;
      const buf = (n++ % 7 === 0) ? posR : pos;
      const zz = dir > 0 ? 0.002 : -0.002;
      buf.push(xa - ox, ya - oy, zz, xb - ox, yb - oy, zz, xb + ox, yb + oy, zz, xa - ox, ya - oy, zz, xb + ox, yb + oy, zz, xa + ox, ya + oy, zz);
    }
  }
  for (const [buf, m] of [[pos, mWire], [posR, mWireR]]) { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(buf, 3)); ge.computeVertexNormals(); add(ge, m); }
  // tension wires
  for (const y of [Y0, Y1]) { add(new THREE.CylinderGeometry(0.003, 0.003, X1 - X0 + 0.06, 5), mWire, 0, y, 0.006).rotation.z = PI / 2; for (let x = X0 + 0.2; x < X1; x += 0.4) add(new THREE.TorusGeometry(0.008, 0.002, 4, 6), mWireR, x, y, 0.003).rotation.y = PI / 2; }
  // barbed strands: tube plus lathe knots
  const knot = new THREE.LatheGeometry([[0, -0.012], [0.004, -0.004], [0.004, 0.004], [0, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 4);
  for (let k = 0; k < 3; k++) {
    const t = 0.09 + k * 0.09;
    const y = PH - 0.02 + t * Math.cos(0.35), z = t * Math.sin(0.35) + 0.03;
    add(new THREE.CylinderGeometry(0.003, 0.003, 2 * PX, 5), mWire, 0, y, z).rotation.z = PI / 2;
    for (let x = -PX + 0.075; x < PX; x += 0.15) { const b = add(knot, mBarb, x, y, z); b.rotation.set(0.7, 0, 0.9); const b2 = add(new THREE.BoxGeometry(0.026, 0.003, 0.003), mBarb, x, y, z); b2.rotation.set(0, 0.6, -0.7); }
  }
  // concertina helix tube
  const R = 0.15, CY = 2.45, turns = 18;
  const pts = []; for (let i = 0; i <= turns * 12; i++) { const a = (i / 12) * PI * 2, x = -PX + 0.02 + (i / (turns * 12)) * (2 * PX - 0.04); pts.push(new THREE.Vector3(x, CY + Math.cos(a) * R, Math.sin(a) * R)); }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 14, 0.0035, 3, false), mWire, 0, 0, 0);
  for (let i = 0; i < turns * 4; i++) { const p = pts[Math.floor((i / (turns * 4)) * pts.length)]; const b = add(new THREE.BoxGeometry(0.022, 0.004, 0.004), mBarb, p.x, p.y, p.z); b.rotation.y = i * 1.3; b.rotation.x = i * 0.7; }
  // drift wedges along the mesh foot, both sides
  const wedge = (out, h, len) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(out, 0); sh.lineTo(0, h); sh.closePath(); const ge = ext(sh, len); ge.rotateY(-PI / 2); ge.translate(len / 2, 0, 0); return ge; };
  add(wedge(0.14, 0.12, 2.6), mSand, 0, 0, 0.01);
  add(wedge(-0.12, 0.09, 2.2), mSand, 0.15, 0, -0.01);
  add(new THREE.CylinderGeometry(0.06, 0.15, 0.1, 8), mSand, PX - 0.25, 0.05, 0.0);

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
