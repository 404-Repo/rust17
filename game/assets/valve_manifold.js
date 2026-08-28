// valve_manifold c2: different reading, closer to the reference. Each riser carries a cast gate
// valve with a side outlet toward +Z ending in a second, smaller red wheel, so the manifold reads
// as a bank of valves from the front. Stands are pipe stanchions with base plates; the header
// has a lifting lug and a drain plug; gauge with a bracket and drip.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (r, h, seg, m, x, y, z, parent = g) => add(new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z, parent);
  const wedge = (len, out, h, m, x, y, z, ry, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o;
  };

  const mPipeS = mat(shade(P.steel, 1.08), 'metal', 0.85, 0.2, true);
  const mPipeN = mat(shade(P.steel, 0.95), 'metal', 0.85, 0.2, true);
  const mPipe = mat(P.steel, 'metal', 0.85, 0.2);
  const mBody = mat(shade(P.steel, 0.88), 'metal', 0.88, 0.25);
  const mBodyB = mat(shade(P.steel, 0.96), 'metal', 0.88, 0.25);
  const mFlange = mat(shade(P.steel, 0.84), 'metal', 0.8, 0.25);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mWheel = mat(shade(P.red, 1.05), 'metal', 0.85, 0.1);
  const mWheelD = mat(shade(P.red, 0.9), 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mStand = mat(shade(P.steel, 1.0), 'metal', 0.8, 0.3);
  const mDial = mat(P.galv, 'metal', 0.7, 0.2);
  const mPlate = mat(P.tank, 'metal', 0.8, 0.15);
  const mLever = mat(shade(P.red, 1.05), 'metal', 0.85, 0.1);
  // gusset plate: right angle at the origin, one edge out along local +x, one edge down; ry turns local +x
  // to world +z (ry = -PI/2), -z (ry = PI/2), +x (0) or -x (PI); the plate is 12 mm thick
  const gusset = (x, y, z, out, down, m, ry, parent = g) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, -down); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }); geo.translate(0, 0, -0.006); const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o; };

  const R = 0.15, AX = 0.8, L = 2.4, FT = 0.05, FR = 0.22;
  const hs = add(new THREE.CylinderGeometry(R, R, L - 2 * FT, 12, 1, true, -PI / 2, PI), mPipeS, 0, AX, 0); hs.rotation.z = PI / 2;
  const hn = add(new THREE.CylinderGeometry(R, R, L - 2 * FT, 12, 1, true, PI / 2, PI), mPipeN, 0, AX, 0); hn.rotation.z = PI / 2;
  const hd = add(new THREE.CylinderGeometry(R + 0.006, R + 0.006, L - 0.5, 3, 1, true, PI / 2 - 0.25, 0.5), mDust, 0, AX, 0); hd.rotation.z = PI / 2;
  const hr = add(new THREE.CylinderGeometry(R + 0.005, R + 0.005, L - 0.3, 3, 1, true, -PI / 2 - 0.12, 0.24), mRust, 0, AX, 0); hr.rotation.z = PI / 2;
  for (const s of [-1, 1]) {
    const f = cyl(FR, FT, 12, mFlange, s * (L / 2 - FT / 2), AX, 0); f.rotation.z = PI / 2;
    const rr = cyl(R + 0.012, 0.05, 12, mRust, s * (L / 2 - FT - 0.025), AX, 0); rr.rotation.z = PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * PI / 4 + PI / 8;
      const by = AX + 0.185 * Math.cos(a), bz = 0.185 * Math.sin(a);
      const b = cyl(0.018, 0.025, 6, mBolt, s * (L / 2 + 0.005), by, bz); b.rotation.z = PI / 2;
      if (Math.cos(a) > -0.9) box(0.005, 0.04 + 0.04 * Math.abs(Math.sin(a)), 0.02, mRust, s * (L / 2 + 0.002), by - 0.04, bz);
    }
  }
  // drain plug under the header, lifting lug on top between branches
  cyl(0.03, 0.06, 8, mBody, 0.6, AX - R - 0.02, 0);
  box(0.06, 0.06, 0.012, mBody, 0, AX + R + 0.02, 0);
  // pipe stanchions with base plates and clamp saddles
  for (const sx of [-0.8, 0.8]) {
    box(0.36, 0.02, 0.36, mStand, sx, 0.01, 0);
    box(0.3, 0.004, 0.3, mDust, sx, 0.022, 0);
    cyl(0.05, AX - R - 0.04, 10, mStand, sx, (AX - R - 0.04) / 2 + 0.02, 0);
    cyl(0.07, 0.02, 10, mStand, sx, 0.03, 0);
    const sad = add(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.16, 8, 1, true, -PI / 2 - 0.9, 1.8), mStand, sx, AX, 0); sad.rotation.z = PI / 2;
    box(0.16, 0.03, 0.34, mStand, sx, AX - R - 0.03, 0);
    for (const c of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) cyl(0.012, 0.02, 6, mBolt, sx + c[0], 0.03, c[1]);
    box(0.03, 0.18, 0.006, mRust, sx, AX - R - 0.15, 0.052);
    wedge(0.4, 0.3, 0.12, mSand, sx, 0, 0.18, -PI / 2);
    wedge(0.4, 0.3, 0.12, mSand, sx, 0, -0.18, PI / 2);
    wedge(0.4, 0.2, 0.1, mSand, sx + 0.18, 0, 0, 0);
    wedge(0.4, 0.2, 0.1, mSand, sx - 0.18, 0, 0, PI);
  }
  // four gusset plates on each stanchion foot
  for (const sx of [-0.8, 0.8]) {
    gusset(sx, 0.15, 0.045, 0.1, 0.13, mStand, -PI / 2); gusset(sx, 0.15, -0.045, 0.1, 0.13, mStand, PI / 2);
    gusset(sx + 0.045, 0.15, 0, 0.1, 0.13, mStand, 0); gusset(sx - 0.045, 0.15, 0, 0.1, 0.13, mStand, PI);
  }
  // bypass line under the header: two drops, a 60 mm run with flanged unions and a lever ball valve in the middle
  for (const dx of [-0.6, 0.6]) { cyl(0.03, 0.22, 8, mPipe, dx, AX - R - 0.1, 0); cyl(0.036, 0.07, 8, mPipe, dx, 0.45, 0); cyl(0.036, 0.02, 8, mRust, dx, AX - R - 0.02, 0); }
  cyl(0.03, 1.2, 8, mPipe, 0, 0.45, 0).rotation.z = PI / 2;
  for (const ux of [-0.22, 0.22]) { cyl(0.05, 0.03, 8, mFlange, ux, 0.45, 0).rotation.z = PI / 2; cyl(0.036, 0.02, 8, mRust, ux + (ux > 0 ? 0.03 : -0.03), 0.45, 0).rotation.z = PI / 2; box(0.02, 0.05, 0.005, mRust, ux, 0.41, 0.027); }
  cyl(0.06, 0.14, 10, mBody, 0, 0.45, 0).rotation.z = PI / 2;
  cyl(0.012, 0.05, 6, mStem, 0, 0.5, 0);
  cyl(0.02, 0.02, 8, mLever, 0, 0.53, 0);
  box(0.22, 0.012, 0.02, mLever, 0.1, 0.53, 0.03).rotation.y = 0.3;
  // tag plate on each valve body, stencil plate on the header south face, isolation cock under the gauge
  for (const bx of [-0.9, -0.3, 0.3, 0.9]) box(0.06, 0.04, 0.005, mPlate, bx - 0.06, 1.37, 0.083);
  { const p = box(0.25, 0.1, 0.006, mPlate, 0.6, AX + R * Math.sin(0.15), R * Math.cos(0.15) + 0.004); p.rotation.x = -0.15; }
  cyl(0.02, 0.03, 8, mBody, -1.06, AX + 0.43, 0.1);
  box(0.05, 0.006, 0.01, mLever, -1.035, AX + 0.445, 0.1);
  const wheel = (x, y, z, rad, m, axisZ) => {
    const w = new THREE.Group(); w.position.set(x, y, z); if (axisZ) w.rotation.x = PI / 2; g.add(w);
    const rim = add(new THREE.TorusGeometry(rad, 0.013, 6, 14), m, 0, 0, 0, w); rim.rotation.x = PI / 2;
    for (let i = 0; i < 3; i++) { const sp = box(rad * 2 - 0.01, 0.012, 0.018, m, 0, 0, 0, w); sp.rotation.y = i * PI / 3; }
    cyl(0.03, 0.036, 8, m, 0, 0, 0, w);
    cyl(0.016, 0.02, 6, mBolt, 0, 0.026, 0, w);
    return w;
  };
  for (let k = 0; k < 4; k++) {
    const bx = [-0.9, -0.3, 0.3, 0.9][k];
    const bm = k % 2 ? mBody : mBodyB;
    cyl(0.075, 0.3, 10, mPipe, bx, AX + 0.15, 0);
    cyl(0.085, 0.03, 10, mRust, bx, AX + R - 0.005, 0);
    cyl(0.12, 0.03, 10, mFlange, bx, 1.095, 0);
    cyl(0.12, 0.03, 10, mFlange, bx, 1.13, 0);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3 + PI / 6; cyl(0.012, 0.075, 6, mBolt, bx + 0.1 * Math.cos(a), 1.112, 0.1 * Math.sin(a)); }
    box(0.03, 0.08, 0.005, mRust, bx + 0.02, 1.04, 0.077);
    // cast body: a box with rounded cheeks, side outlet toward +Z
    box(0.2, 0.26, 0.16, bm, bx, 1.28, 0);
    const cheek = cyl(0.09, 0.2, 10, bm, bx, 1.28, 0); cheek.rotation.z = PI / 2;
    cyl(0.05, 0.16, 10, mPipe, bx, 1.24, 0.14).rotation.x = PI / 2;
    cyl(0.085, 0.025, 10, mFlange, bx, 1.24, 0.23).rotation.x = PI / 2;
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; const b = cyl(0.01, 0.02, 6, mBolt, bx + 0.065 * Math.cos(a), 1.24 + 0.065 * Math.sin(a), 0.245); b.rotation.x = PI / 2; }
    cyl(0.03, 0.06, 8, bm, bx, 1.24, 0.27).rotation.x = PI / 2;
    cyl(0.01, 0.06, 6, mStem, bx, 1.24, 0.31).rotation.x = PI / 2;
    wheel(bx, 1.24, 0.33, 0.1, k % 2 ? mWheelD : mWheel, true);
    box(0.03, 0.09, 0.005, mRust, bx + 0.05, 1.19, 0.081);
    // bonnet flange, bonnet, yoke, stem, top wheel
    cyl(0.11, 0.03, 10, mFlange, bx, 1.425, 0);
    for (let i = 0; i < 4; i++) { const a = i * PI / 2; cyl(0.011, 0.02, 6, mBolt, bx + 0.09 * Math.cos(a), 1.45, 0.09 * Math.sin(a)); }
    cyl(0.05, 0.1, 10, bm, bx, 1.49, 0);
    box(0.02, 0.14, 0.05, bm, bx - 0.045, 1.57, 0); box(0.02, 0.14, 0.05, bm, bx + 0.045, 1.57, 0);
    box(0.11, 0.03, 0.05, bm, bx, 1.625, 0);
    cyl(0.012, 0.2, 6, mStem, bx, 1.6, 0);
    wheel(bx, 1.56, 0, 0.165, k % 2 ? mWheelD : mWheel, false);
  }
  // gauge on a bracket at the -X end
  box(0.03, 0.22, 0.03, mStand, -1.06, AX + 0.26, 0);
  box(0.03, 0.03, 0.14, mStand, -1.06, AX + 0.38, 0.06);
  cyl(0.012, 0.06, 6, mStem, -1.06, AX + 0.42, 0.1);
  const gauge = cyl(0.05, 0.03, 12, mBody, -1.06, AX + 0.49, 0.1); gauge.rotation.x = PI / 2;
  add(new THREE.CircleGeometry(0.04, 12), mDial, -1.06, AX + 0.49, 0.116);
  box(0.02, 0.07, 0.005, mRust, -1.05, AX + 0.4, 0.0);
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
