// debris_scatter c1: profiles. Corrugated sheet as an ExtrudeGeometry of a sine polyline profile
// (one rib per 76 mm, 6 points per pitch) in two panels with a crease, boards as extruded planks
// with a jagged split end polygon, jerry can as an extruded can profile with the handle loops as
// holes and then crushed, cable coil as a TubeGeometry along a flat spiral, pipe as a lathe with
// wall thickness, bricks extruded with a frog, stones as flattened lathes, wedge drifts extruded.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 61; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, timber: 0xa07a4f, rubber: 0x1d1e20, red: 0x9c4a3c, concS: 0x857c6c };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false, flat = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); if (name) m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const ext = (sh, depth) => new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  const mTimber = mat(P.timber, 'timber', 0.9), mTimberB = mat(shade(P.timber, 1.1), 'timber', 0.9), mTimberD = mat(shade(P.timber, 0.8), 'timber', 0.92);
  const mGalv = mat(P.galv, 'metal', 0.75, 0.5, true), mRust = mat(P.rust, 'metal', 0.95, 0.05, true), mSteel = mat(P.steel, 'metal', 0.8, 0.3, true);
  const mCable = mat(P.rubber, null, 0.85, 0.0);
  const mCan = mat(shade(P.red, 0.85), 'metal', 0.85, 0.15), mCanB = mat(P.red, 'metal', 0.85, 0.15);
  const mBrick = mat(shade(P.concS, 1.1), 'stone', 0.95), mBrickD = mat(P.concS, 'stone', 0.95);
  const mStone = mat(P.rock, 'stone', 0.95, 0, false, true), mStoneD = mat(shade(P.rock, 0.92), 'stone', 0.95, 0, false, true);
  const mSand = mat(P.sand, 'ground', 0.95), mDust = mat(P.sand, 'ground', 0.95);

  // wedge drift: triangle profile extruded along the piece
  const drift = (x, z, len, out, h, ry) => { len *= 0.65; out *= 0.8; h *= 0.7; const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-out, 0); sh.lineTo(0, h); sh.closePath(); const ge = ext(sh, len); ge.translate(0, 0, -len / 2); const o = add(ge, mSand, x, 0, z); o.rotation.y = ry; return o; };

  // plank with a jagged split end, drawn as a plan polygon and extruded 22 mm
  const plank = (L, W) => { const sh = new THREE.Shape(); sh.moveTo(-L / 2, -W / 2); sh.lineTo(L / 2 - 0.1, -W / 2); sh.lineTo(L / 2 + 0.05, -W / 4); sh.lineTo(L / 2 - 0.04, 0); sh.lineTo(L / 2 + 0.08, W / 3); sh.lineTo(L / 2 - 0.06, W / 2); sh.lineTo(-L / 2, W / 2); sh.closePath(); const ge = ext(sh, 0.022); ge.rotateX(-PI / 2); return ge; };
  const boards = [[-0.55, 0.55, 1.2, 0.35], [0.25, -0.6, 0.9, -0.7], [0.55, 0.35, 0.6, 1.3]];
  boards.forEach(([x, z, L, ry], i) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
    add(plank(L, 0.12), i === 1 ? mTimberD : mTimber, 0, 0, 0, b);
    add(new THREE.BoxGeometry(L * 0.8, 0.005, 0.09), mTimberB, -0.05, 0.024, 0, b);
    for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 5), mRust, -L / 2 + 0.08 + k * (L * 0.4), 0.025, 0.03, b);
    add(new THREE.BoxGeometry(0.04, 0.024, 0.1), mRust, -L / 2 + 0.12, 0.011, 0.0, b);
    drift(x, z, L * 0.8, 0.2, 0.05, ry);
  });
  // corrugated sheet profile: sine across 0.5 m, 6 points per 76 mm pitch, 3 mm thick
  const corrProfile = (w) => { const sh = new THREE.Shape(); const n = Math.round(w / 0.076) * 6; const pts = []; for (let i = 0; i <= n; i++) { const x = (i / n) * w - w / 2; pts.push([x, Math.sin((x / 0.076) * PI * 2) * 0.012]); } sh.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) sh.lineTo(x, y); for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i][0], pts[i][1] + 0.004); sh.closePath(); return sh; };
  const sheet = new THREE.Group(); sheet.position.set(-0.45, 0.014, -0.5); sheet.rotation.y = 0.5; g.add(sheet);
  const flatGeo = ext(corrProfile(0.5), 0.45); flatGeo.rotateY(PI / 2); flatGeo.translate(-0.42, 0, 0);
  add(flatGeo, mGalv, 0, 0, 0, sheet);
  const bent = new THREE.Group(); bent.position.set(0.03, 0.02, 0); bent.rotation.z = 0.6; sheet.add(bent);
  const bentGeo = ext(corrProfile(0.5), 0.35); bentGeo.rotateY(PI / 2);
  add(bentGeo, mGalv, 0, 0, 0, bent);
  add(new THREE.BoxGeometry(0.05, 0.04, 0.5), mRust, 0.02, 0.0, 0, sheet);
  add(new THREE.BoxGeometry(0.4, 0.012, 0.08), mRust, -0.2, 0.016, -0.25, sheet);
  add(new THREE.BoxGeometry(0.4, 0.004, 0.42), mDust, -0.2, 0.02, 0, sheet);
  add(new THREE.BoxGeometry(0.5, 0.02, 0.2), mSand, -0.3, 0.0, -0.22, sheet);
  drift(-0.75, -0.6, 0.5, 0.28, 0.07, 0.5);
  // cable coil: a flat spiral tube, 4 turns
  const spiralPts = []; for (let i = 0; i <= 64; i++) { const t = i / 64, a = t * PI * 2 * 4; const r = 0.14 + t * 0.06; spiralPts.push(new THREE.Vector3(Math.cos(a) * r, 0.012 + Math.sin(a * 2.3) * 0.004 + t * 0.03, Math.sin(a) * r)); }
  spiralPts.push(new THREE.Vector3(0.35, 0.012, 0.12));
  const coil = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 80, 0.011, 4, false), mCable, 0.6, 0, -0.25); coil.rotation.y = 0.3;
  drift(0.6, -0.25, 0.3, 0.14, 0.04, 0);
  // jerry can profile with handle holes, extruded 0.16, then crushed by scale and tilt
  const canSh = new THREE.Shape(); canSh.moveTo(-0.175, 0); canSh.lineTo(0.175, 0); canSh.lineTo(0.175, 0.22); canSh.lineTo(0.12, 0.3); canSh.lineTo(-0.12, 0.3); canSh.lineTo(-0.175, 0.22); canSh.closePath();
  for (let k = 0; k < 3; k++) { const h = new THREE.Path(); const cx = -0.06 + k * 0.06; h.moveTo(cx - 0.02, 0.23); h.lineTo(cx + 0.02, 0.23); h.lineTo(cx + 0.02, 0.26); h.lineTo(cx - 0.02, 0.26); h.closePath(); canSh.holes.push(h); }
  const can = new THREE.Group(); can.position.set(-0.05, 0, 0); can.rotation.y = -0.6; g.add(can);
  const canGeo = ext(canSh, 0.16); canGeo.translate(0, 0, -0.08);
  const canM = add(canGeo, mCan, 0, 0, 0, can); canM.rotation.z = 0.3; canM.rotation.x = 0.12; canM.scale.set(1, 0.7, 1); canM.position.y = 0.02;
  add(new THREE.BoxGeometry(0.3, 0.015, 0.14), mCanB, -0.02, 0.2, 0, can).rotation.z = 0.3;
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), mSteel, 0.12, 0.23, 0.04, can);
  add(new THREE.BoxGeometry(0.1, 0.05, 0.005), mRust, 0.05, 0.08, 0.082, can);
  drift(-0.05, 0, 0.3, 0.18, 0.05, -0.6);
  // bricks with a frog: outer rectangle minus an inner one, extruded 65 mm
  const brickSh = new THREE.Shape(); brickSh.moveTo(-0.1075, -0.05); brickSh.lineTo(0.1075, -0.05); brickSh.lineTo(0.1075, 0.05); brickSh.lineTo(-0.1075, 0.05); brickSh.closePath();
  const frog = new THREE.Path(); frog.moveTo(-0.06, -0.025); frog.lineTo(0.06, -0.025); frog.lineTo(0.06, 0.025); frog.lineTo(-0.06, 0.025); frog.closePath(); brickSh.holes.push(frog);
  [[0.05, 0.75, 0.4], [0.2, 0.72, -0.2]].forEach(([x, z, ry], i) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.set(i ? 0 : 0.08, ry, i ? 0.06 : 0); g.add(b);
    const ge = ext(brickSh, 0.055); ge.rotateX(-PI / 2);
    add(ge, i ? mBrickD : mBrick, 0, 0.01, 0, b);
    add(new THREE.BoxGeometry(0.215, 0.012, 0.1), mBrickD, 0, 0.006, 0, b);  // frog floor
    drift(x, z, 0.2, 0.1, 0.03, ry);
  });
  // pipe offcut: lathe with wall thickness, both ends open
  const pp = [[0.075, -0.25], [0.075, 0.25], [0.065, 0.25], [0.065, -0.25], [0.075, -0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const pipe = new THREE.Group(); pipe.position.set(0.55, 0.075, 0.7); pipe.rotation.y = 1.1; g.add(pipe);
  add(new THREE.LatheGeometry(pp, 10), mSteel, 0, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.CylinderGeometry(0.077, 0.077, 0.03, 10, 1, true), mRust, 0.235, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.CylinderGeometry(0.077, 0.077, 0.03, 10, 1, true), mRust, -0.235, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.BoxGeometry(0.4, 0.005, 0.05), mDust, 0, 0.074, 0, pipe);
  drift(0.55, 0.7, 0.45, 0.2, 0.06, 1.1);
  // stones: flattened irregular lathes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.4, r = rr(0.55, 0.95), sz = rr(0.045, 0.07);
    const prof = [[0, 0], [sz * 0.8, 0.005], [sz, sz * 0.4], [sz * 0.7, sz * 0.75], [0, sz * 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
    const st = add(new THREE.LatheGeometry(prof, 6), i % 2 ? mStone : mStoneD, Math.cos(a) * r, 0, Math.sin(a) * r);
    st.rotation.y = rr(0, PI); st.scale.z = 0.8;
  }
  add(new THREE.BoxGeometry(0.7, 0.008, 0.25), mat(P.packed, 'ground', 0.95), 0.2, 0.004, 0.2).rotation.y = 0.4;

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
