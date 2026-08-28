// pipe_run_straight c2 r4b: pipe in three courses (bleached crown, base tone, stained belly) plus a
// longitudinal weld strip; channel leg trestles with a wide top beam, wedge saddle and a bolted
// hold down strap. Round 4 second pass: the blind flange face carries a raised face, a rim ring, washers
// under every bolt head and a rust drip running down the face below each; girth welds are 40 mm rolled
// seam rings with a rust run beneath each; gussets and straps are plate, sized to read at 10 m.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const wedge = (len, out, h, m, x, y, z, ry, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  // open cylinder sector along X. theta 0 is the south flank (+z), PI/2 the crown, -PI/2 the belly
  const sector = (r, len, start, span, m, x, y, z, parent = g, seg = 6) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, true, start, span), m, x, y, z, parent); o.rotation.z = PI / 2; return o; };
  // tapered rust drip plate lying on a face whose normal is nx (+1 or -1 along X); hangs down from (x, y, z)
  const dripX = (x, y, z, w, len, m, nx, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 6, -len); s.lineTo(-w / 6, -len); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }); geo.rotateY(nx * PI / 2);
    return add(geo, m, x, y, z, parent);
  };

  const mCrown = mat(shade(P.steel, 1.1), 'metal', 0.8, 0.2, true);
  const mSide = mat(P.steel, 'metal', 0.85, 0.2, true);
  const mSideS = mat(shade(P.steel, 1.05), 'metal', 0.85, 0.2, true);
  const mBelly = mat(shade(P.steel, 0.88), 'metal', 0.9, 0.15, true);
  const mFlange = mat(shade(P.steel, 0.93), 'metal', 0.8, 0.25);
  const mFace = mat(shade(P.steel, 1.08), 'metal', 0.82, 0.2);      // blind flange face, lighter than the ring so it is not a black disc
  const mChain = mat(shade(P.galv, 0.7), 'metal', 0.7, 0.5);
  const mRim = mat(shade(P.steel, 1.08), 'metal', 0.8, 0.25);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mWasher = mat(shade(P.galv, 0.8), 'metal', 0.7, 0.45);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mRustD = mat(shade(P.rust, 0.85), 'metal', 0.95, 0.05, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mLeg = mat(P.galv, 'metal', 0.75, 0.45);
  const mLegS = mat(shade(P.galv, 1.06), 'metal', 0.75, 0.45);
  const mBeam = mat(shade(P.galv, 0.92), 'metal', 0.8, 0.4);
  const mGusset = mat(shade(P.galv, 0.82), 'metal', 0.8, 0.4);
  const mStrap = mat(shade(P.galv, 0.85), 'metal', 0.8, 0.4, true);
  const mPlate = mat(P.tank, 'metal', 0.8, 0.15);
  const mWheel = mat(P.red, 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);
  // gusset plate: right angle at the origin, one edge out along local +x, one edge down (negative down = up);
  // ry turns local +x to world +z (ry = -PI/2) or -z (ry = PI/2); 20 mm plate
  const gusset = (x, y, z, out, down, m, ry, parent = g) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, -down); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }); geo.translate(0, 0, -0.01); const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o; };

  const R = 0.25, AX = 1.25, L = 6.0, FT = 0.06, FR = 0.35;
  const bodyLen = L - 2 * FT;
  // three courses: crown 100 deg, two flanks, belly 80 deg
  sector(R, bodyLen, PI / 2 - 0.87, 1.74, mCrown, 0, AX, 0, g, 5);
  sector(R, bodyLen, PI / 2 + 0.87, PI - 0.87 - 0.7, mSide, 0, AX, 0, g, 5);
  sector(R, bodyLen, -PI / 2 + 0.7, PI - 0.87 - 0.7, mSideS, 0, AX, 0, g, 5);
  sector(R, bodyLen, -PI / 2 - 0.7, 1.4, mBelly, 0, AX, 0, g, 4);
  sector(R + 0.008, bodyLen - 0.4, PI / 2 - 0.6, 1.2, mDust, 0, AX, 0, g, 4);
  // longitudinal weld strip on the south flank, rust run on the belly
  box(bodyLen - 0.2, 0.02, 0.012, mRust, 0, AX + 0.02, R + 0.002);
  sector(R + 0.006, bodyLen - 0.1, -PI / 2 - 0.12, 0.24, mRust, 0, AX, 0, g, 3);
  // girth welds: 40 mm rolled seam rings at 1 m spacing, a rust band under the lower half of each and a
  // drip running down both flanks from the seam
  for (const wx of [-2.0, -1.0, 0.0, 1.0, 2.0]) {
    const w = add(new THREE.CylinderGeometry(R + 0.022, R + 0.022, 0.04, 14), mRust, wx, AX, 0); w.rotation.z = PI / 2;
    const w2 = add(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.07, 14), mRustD, wx, AX, 0); w2.rotation.z = PI / 2;
    sector(R + 0.007, 0.11, -PI / 2 - 0.75, 1.5, mRustD, wx + 0.02, AX, 0, g, 4);
    sector(R + 0.007, 0.035, -0.95, 1.0, mRust, wx + 0.04, AX, 0, g, 4);
    sector(R + 0.007, 0.035, PI - 0.05, 1.0, mRust, wx - 0.045, AX, 0, g, 4);
  }
  // fittings along the run: drain nipple with a cap under the belly, bleed valve with a red wheel on the crown,
  // two lifting lugs with rings, a stencil plate on the south flank with rust off its corners
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), mFlange, 0.6, AX - R - 0.04, 0);
  add(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 8), mBolt, 0.6, AX - R - 0.1, 0);
  sector(R + 0.01, 0.14, -PI / 2 - 0.3, 0.6, mRust, 0.6, AX, 0, g, 3);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), mFlange, -1.5, AX + R + 0.02, 0);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), mFlange, -1.5, AX + R + 0.055, 0);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8), mBolt, -1.5, AX + R + 0.09, 0);
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), mStem, -1.5, AX + R + 0.125, 0);
  const bw = add(new THREE.TorusGeometry(0.06, 0.009, 6, 12), mWheel, -1.5, AX + R + 0.145, 0); bw.rotation.x = PI / 2;
  for (let i = 0; i < 3; i++) { const sp = box(0.11, 0.008, 0.012, mWheel, -1.5, AX + R + 0.145, 0); sp.rotation.y = i * PI / 3; }
  sector(R + 0.01, 0.14, PI / 2 - 0.35, 0.7, mRust, -1.5, AX, 0, g, 4);
  for (const lx of [-2.4, 2.4]) {
    box(0.12, 0.09, 0.016, mFlange, lx, AX + R + 0.04, 0);
    add(new THREE.TorusGeometry(0.03, 0.008, 4, 8), mFlange, lx, AX + R + 0.1, 0);
    sector(R + 0.01, 0.18, PI / 2 - 0.3, 0.6, mRust, lx, AX, 0, g, 3);
  }
  const plate = box(0.34, 0.18, 0.006, mPlate, 1.45, AX + R * Math.sin(0.25), R * Math.cos(0.25) + 0.004); plate.rotation.x = -0.25;
  for (const px of [1.3, 1.6]) { const d = box(0.02, 0.12, 0.006, mRust, px, AX - R * Math.sin(0.3), R * Math.cos(0.3) + 0.003); d.rotation.x = 0.3; }

  for (const s of [-1, 1]) {
    const fx = s * (L / 2 - FT / 2);
    const f = add(new THREE.CylinderGeometry(FR, FR, FT, 14), mFlange, fx, AX, 0); f.rotation.z = PI / 2;
    // blind flange face: raised face disc inside the bolt circle, a rolled rim ring at the edge
    const rf = add(new THREE.CylinderGeometry(0.24, 0.24, 0.014, 14), mFace, s * (L / 2 + 0.007), AX, 0); rf.rotation.z = PI / 2;
    const rim = add(new THREE.TorusGeometry(FR - 0.018, 0.015, 6, 20), mRim, s * (L / 2 + 0.004), AX, 0); rim.rotation.y = PI / 2;
    // weld neck hub tapering into the pipe, rust ring past it, 12 hex nuts on the back face of the flange
    const hub = add(new THREE.CylinderGeometry(s > 0 ? R + 0.004 : R + 0.022, s > 0 ? R + 0.022 : R + 0.004, 0.1, 14), mFlange, s * (L / 2 - FT - 0.05), AX, 0); hub.rotation.z = PI / 2;
    const ring = add(new THREE.CylinderGeometry(R + 0.016, R + 0.016, 0.05, 14), mRust, s * (L / 2 - FT - 0.125), AX, 0); ring.rotation.z = PI / 2;
    for (let i = 0; i < 12; i++) { const a = i * PI / 6 + PI / 12; const n = add(new THREE.CylinderGeometry(0.024, 0.024, 0.024, 6), mBolt, s * (L / 2 - FT - 0.012), AX + 0.295 * Math.cos(a), 0.295 * Math.sin(a)); n.rotation.z = PI / 2; }
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6 + PI / 12;
      const by = AX + 0.295 * Math.cos(a), bz = 0.295 * Math.sin(a);
      const wsh = add(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 8), mWasher, s * (L / 2 + 0.003), by, bz); wsh.rotation.z = PI / 2;
      const b = add(new THREE.CylinderGeometry(0.024, 0.024, 0.036, 6), mBolt, s * (L / 2 + 0.018), by, bz); b.rotation.z = PI / 2;
      // rust drip down the face under every bolt head: longest under the top bolts, short stubs at the bottom
      const len = 0.08 + 0.16 * Math.max(0, Math.cos(a)) + 0.05 * Math.abs(Math.sin(a));
      dripX(s * (L / 2 + 0.002), by - 0.02, bz, 0.07, len, mRust, s);
      const halo = add(new THREE.CylinderGeometry(0.046, 0.046, 0.003, 8), mRustD, s * (L / 2 + 0.0015), by, bz); halo.rotation.z = PI / 2;
    }
    // rust pooled along the bottom of the rim and a run off it down the pipe belly
    const rimRust = add(new THREE.TorusGeometry(FR - 0.018, 0.018, 5, 8, 1.6), mRust, s * (L / 2 + 0.003), AX, 0); rimRust.rotation.y = PI / 2; rimRust.rotation.z = -PI / 2 - 0.8;
    // blind flange centre: a tapped boss with a hex plug on the west end, a lifting eye on the east end
    if (s > 0) {
      const boss = add(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10), mRim, s * (L / 2 + 0.028), AX, 0); boss.rotation.z = PI / 2;
      const plug = add(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 6), mBolt, s * (L / 2 + 0.055), AX, 0); plug.rotation.z = PI / 2;
      dripX(s * (L / 2 + 0.015), AX - 0.06, 0, 0.06, 0.16, mRust, s);
    } else {
      // lifting lug on the west face with a short length of chain left hanging from its eye
      box(0.03, 0.1, 0.02, mFlange, s * (L / 2 + 0.03), AX + 0.05, 0);
      const eye = add(new THREE.TorusGeometry(0.035, 0.009, 5, 10), mFlange, s * (L / 2 + 0.03), AX + 0.12, 0); eye.rotation.y = PI / 2;
      for (let k = 0; k < 7; k++) { const link = add(new THREE.TorusGeometry(0.022, 0.006, 5, 8), mChain, s * (L / 2 + 0.03), AX + 0.09 - k * 0.032, 0.0); link.rotation.y = k % 2 ? 0 : PI / 2; }
      dripX(s * (L / 2 + 0.015), AX, 0.06, 0.05, 0.14, mRust, s);
    }
    // rust off the rim onto the pipe below each flange, running down the flank
    box(0.03, 0.006, 0.18, mRust, s * (L / 2 - FT - 0.03), AX - R - 0.002, 0);
    sector(R + 0.02, 0.04, -PI / 2 - 0.5, 1.0, mRustD, s * (L / 2 - FT - 0.12), AX, 0, g, 3);
  }

  // trestles: channel legs (web + two flanges) in an A, wide top beam, wedge saddle with cheeks
  const legLen = 0.98, tilt = Math.atan2(0.26, 0.93);
  for (const tx of [-1.8, 1.8]) {
    const t = new THREE.Group(); t.position.set(tx, 0, 0); g.add(t);
    for (const s of [-1, 1]) {
      const lm = s > 0 ? mLegS : mLeg;
      const legG = new THREE.Group(); legG.position.set(0, 0.475, s * 0.24); legG.rotation.x = -s * tilt; t.add(legG);
      box(0.12, legLen, 0.01, lm, 0, 0, 0, legG);            // web, facing along X
      box(0.12, legLen, 0.05, lm, 0, 0, s * 0.03, legG);      // lip toward outside
      box(0.02, legLen, 0.05, lm, -0.05, 0, -s * 0.02, legG);
      box(0.02, legLen, 0.05, lm, 0.05, 0, -s * 0.02, legG);
      box(0.3, 0.02, 0.3, mBeam, 0, 0.01, s * 0.35, t);        // foot plate, deep enough to carry the gussets
      for (const bx of [-0.11, 0.11]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mBolt, bx, 0.03, s * 0.44, t);
      box(0.03, 0.14, 0.008, mRust, 0.03, 0.12, s * 0.475, t);   // rust from foot bolts up the plate edge
      // foot gussets: leg to foot plate, both faces of the web, 0.2 m plates
      for (const gx of [-0.07, 0.07]) gusset(gx, 0.02, s * 0.35, 0.15, -0.18, mGusset, s > 0 ? PI / 2 : -PI / 2, t);
      box(0.2, 0.004, 0.06, mRust, 0, 0.022, s * 0.3, t);
    }
    box(0.06, 0.05, 0.5, mLeg, 0, 0.48, 0, t);                  // mid tie across the A
    box(0.42, 0.06, 0.9, mBeam, 0, 0.94, 0, t);                  // top beam spanning the full 0.9 m
    box(0.36, 0.004, 0.84, mDust, 0, 0.973, 0, t);              // dust cap on the beam
    // wedge saddle: two cheek plates hugging the pipe and a block between
    box(0.3, 0.05, 0.36, mBeam, 0, 0.995, 0, t);
    for (const cz of [-0.19, 0.19]) box(0.3, 0.16, 0.015, mBeam, 0, 1.05, cz, t);
    for (const cz of [-0.2, 0.2]) box(0.02, 0.12, 0.008, mRust, 0.1, 0.9, cz, t);
    // hold down strap over the pipe: 6 mm plate, 80 mm wide, with edge rings so the thickness reads; tie rods,
    // nuts and foot lugs down to the beam
    const span = 3.9, st = PI / 2 - span / 2;
    const strapO = add(new THREE.CylinderGeometry(R + 0.036, R + 0.036, 0.08, 10, 1, true, st, span), mStrap, 0, AX, 0, t); strapO.rotation.z = PI / 2;
    const strapI = add(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.08, 10, 1, true, st, span), mStrap, 0, AX, 0, t); strapI.rotation.z = PI / 2;
    for (const ex of [-0.04, 0.04]) { const e = add(new THREE.RingGeometry(R + 0.03, R + 0.036, 10, 1, st, span), mStrap, ex, AX, 0, t); e.rotation.y = PI / 2; }
    for (const s of [-1, 1]) {
      box(0.1, 0.04, 0.08, mBeam, 0, 1.13, s * 0.28, t);
      add(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 6), mStem, 0, 1.06, s * 0.29, t);
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6), mBolt, 0, 1.16, s * 0.29, t);
      box(0.06, 0.004, 0.1, mRust, 0.0, 0.977, s * 0.3, t);
      box(0.03, 0.12, 0.006, mRust, 0.02, 1.06, s * 0.335, t);
      // beam gussets: leg to top beam, both faces of the web, 0.26 x 0.24 plates with a rust run beneath
      for (const gx of [-0.07, 0.07]) gusset(gx, 0.91, s * 0.1, 0.26, 0.24, mGusset, s > 0 ? -PI / 2 : PI / 2, t);
      box(0.03, 0.1, 0.006, mRust, 0.0, 0.62, s * 0.115, t);
    }
    wedge(0.86, 0.28, 0.12, mSand, 0.21, 0, 0, 0, t);
    wedge(0.86, 0.28, 0.12, mSand, -0.21, 0, 0, PI, t);
  }
  // ---- DERRICK material pass (round 2): weathering as a per vertex colour attribute. No extra draw
  // calls, no extra triangles except long single segment boxes, which are re-cut along their length
  // so the mottle, the streaks and the rust to paint gradient have vertices to live on. Rules by
  // recipe name: metal gets rust at the foot and below fixings, streaks, dust on up faces, bleach on
  // the sun side; stone a stained bottom band; timber grey bleach on top; fabric a dirty foot;
  // foliage and ground a mottle. The attribute is a multiplier on the material colour, so every part
  // keeps the author's colour where nothing has happened to it. Unnamed materials (glass, rubber) and
  // emissive lenses are untouched. WEATHER_OPTS may be set before this block.
  (function weather(root, opt) {
    opt = Object.assign({ rustH: 0, mottle: 1, streak: 1, dust: 1, cut: 1.8, seed: 0, sand: 0 }, opt || {});
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3(), tb = new THREE.Box3();
    root.traverse((n) => { if (n.isMesh && n.geometry.attributes.position) { n.geometry.computeBoundingBox(); tb.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld); bb.union(tb); } });
    const y0 = bb.min.y, H = Math.max(0.3, bb.max.y - y0);
    const rustH = opt.rustH || Math.min(2.2, Math.max(0.4, H * 0.42));
    const S = opt.seed * 17.3;
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + S) * 43758.5453; return s - Math.floor(s); };
    const sm = (t) => t * t * (3 - 2 * t);
    const noise = (x, y, z) => {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
      let v = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += hash(ix + a, iy + b, iz + c) * (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz);
      return v * 2 - 1;
    };
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
    const RUST = new THREE.Color(0x4e2d19), RUST2 = new THREE.Color(0x6b4426), DUST = new THREE.Color(0xcdb88e), STAIN = new THREE.Color(0x5e5850), GREY = new THREE.Color(0xa89e88);
    const p = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
    const shared = new Set();
    root.traverse((o) => { if (o.isInstancedMesh || (o.isMesh && Array.isArray(o.material))) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => shared.add(m)); });
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
      const m = o.material;
      if (!m || !m.isMeshStandardMaterial || !m.name || shared.has(m) || m.transparent || (m.emissive && m.emissive.getHex())) return;
      const kind = m.name;
      let geo = o.geometry;
      // long single segment boxes: re-cut along the long axis so the gradient has vertices
      const pr = geo.parameters;
      if (geo.type === 'BoxGeometry' && pr && pr.widthSegments === 1 && pr.heightSegments === 1 && pr.depthSegments === 1) {
        const L = Math.max(pr.width, pr.height, pr.depth), thin = Math.min(pr.width, pr.height, pr.depth);
        const mid = pr.width + pr.height + pr.depth - L - thin;
        if (L > opt.cut && thin >= 0.012 && mid >= 0.05 && kind === 'metal') {
          const n = Math.min(3, Math.ceil(L / 2.0));
          geo = new THREE.BoxGeometry(pr.width, pr.height, pr.depth, pr.width === L ? n : 1, pr.height === L ? n : 1, pr.depth === L ? n : 1);
        } else geo = geo.clone();
      } else geo = geo.clone();
      o.geometry = geo;
      const pos = geo.attributes.position;
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const nor = geo.attributes.normal;
      nm.getNormalMatrix(o.matrixWorld);
      const mc = m.color, lum = 0.2126 * mc.r + 0.7152 * mc.g + 0.0722 * mc.b;
      const dark = lum < 0.06;                                      // gunmetal, rubber, scorched: no rust, no dust
      const hx = mc.getHex(), isRust = hx === 0x6b4426 || hx === 0x573620 || hx === 0x6f4732 || hx === 0x4e2d19;   // already a rust part
      const cnt = pos.count, col = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        nv.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        c.copy(mc);
        const n1 = noise(p.x * 2.6, p.y * 2.6, p.z * 2.6), n2 = noise(p.x * 9 + 5, p.y * 9, p.z * 9 + 2);
        let k = 1 + (0.11 * n1 + 0.05 * n2) * opt.mottle;
        const up = nv.y > 0.55, down = nv.y < -0.55;
        if (!up && !down) { if (nv.z > 0.4) k *= 1.06; else if (nv.z < -0.4) k *= 0.95; if (nv.x < -0.4) k *= 1.03; }
        if (down) k *= 0.92;
        if (kind === 'metal' && !dark && !isRust) {
          const foot = cl(1 - (p.y - y0) / rustH, 0, 1);
          const st = Math.max(0, noise(p.x * 13 + p.z * 9, p.y * 0.8, 7.7)) * opt.streak;    // vertical run marks
          let r = Math.pow(foot, 1.3) * (0.6 + 0.4 * cl(n1 + 0.5, 0, 1)) + st * 0.6 * (0.35 + 0.65 * foot) + Math.max(0, n2) * 0.18;
          if (down) r += 0.25;
          c.lerp(RUST, cl(r, 0, 0.9));
          if (up && opt.dust) c.lerp(DUST, (lum > 0.25 ? 0.14 : 0.26) + 0.1 * cl(n1, -1, 1));
          if (opt.sand) c.lerp(DUST, Math.pow(cl(1 - (p.y - y0) / opt.sand, 0, 1), 1.5) * (0.75 + 0.15 * n1));   // sand blown up the foot of a sheet
        } else if (kind === 'metal' && isRust) {
          k *= 1 + 0.12 * n2; c.lerp(RUST, cl(0.3 - (p.y - y0) / H, 0, 0.5));
        } else if (kind === 'stone' || kind === 'plaster') {
          const f = cl(1 - (p.y - y0) / 0.5, 0, 1);
          c.lerp(STAIN, f * f * 0.75 + Math.max(0, noise(p.x * 7, p.y * 1.3, p.z * 7)) * 0.15);
          if (up && opt.dust) c.lerp(DUST, 0.3);
        } else if (kind === 'timber') {
          k *= 1 + 0.08 * n2;
          if (up) c.lerp(GREY, 0.35); else if (!down) c.lerp(GREY, cl(0.18 + 0.2 * n1, 0, 0.4));
          c.lerp(STAIN, cl(1 - (p.y - y0) / 0.25, 0, 1) * 0.4);
        } else if (kind === 'fabric') {
          k *= 1 + 0.05 * n2;
          c.lerp(STAIN, cl(1 - (p.y - y0) / 0.3, 0, 1) * 0.45);
          if (up && opt.dust) c.lerp(DUST, 0.3);
        } else if (kind === 'foliage') {
          k *= 1 + 0.12 * n1;
        } else if (kind === 'ground') {
          k = 1 + 0.06 * n1 + 0.02 * n2;
        } else if (dark) {
          k = 1 + 0.05 * n2; if (up) k *= 1.08;
        }
        c.multiplyScalar(k);
        col[i * 3] = mc.r > 1e-4 ? cl(c.r / mc.r, 0, 6) : 1;
        col[i * 3 + 1] = mc.g > 1e-4 ? cl(c.g / mc.g, 0, 6) : 1;
        col[i * 3 + 2] = mc.b > 1e-4 ? cl(c.b / mc.b, 0, 6) : 1;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      m.vertexColors = true;
    });
  })(g, typeof WEATHER_OPTS !== 'undefined' ? WEATHER_OPTS : null);

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
