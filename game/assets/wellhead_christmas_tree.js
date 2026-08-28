// wellhead_christmas_tree c2: different reading. Gate valve bodies read as cast rectangular blocks
// with round flanged necks (the way real API gate valves look), every flange pair is a stud ring
// with visible nuts, the cross is a forged block, wheels have five spokes and a rim bead, the
// master valve at the bottom carries its own small wheel, plate has a sand drift over one corner.
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

  const mConc = mat(P.concB, 'stone', 0.95, 0.0);
  const mConcS = mat(P.concS, 'stone', 0.95, 0.0);
  const mBlockS = mat(shade(P.steel, 1.06), 'metal', 0.85, 0.25);
  const mBlockN = mat(shade(P.steel, 0.9), 'metal', 0.88, 0.25);
  const mBody = mat(P.steel, 'metal', 0.85, 0.25, true);
  const mFlange = mat(shade(P.steel, 0.82), 'metal', 0.8, 0.3);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mWheel = mat(P.red, 'metal', 0.85, 0.1);
  const mWheelB = mat(shade(P.red, 1.08), 'metal', 0.85, 0.1);
  const mYellow = mat(P.yellow, 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mDial = mat(P.galv, 'metal', 0.7, 0.2);
  const mPlate = mat(P.tank, 'metal', 0.8, 0.15);
  const mFlow = mat(shade(P.steel, 0.95), 'metal', 0.85, 0.25);

  // plate
  box(1.2, 0.07, 1.2, mConcS, 0, 0.035, 0);
  box(1.2, 0.06, 1.2, mConc, 0, 0.1, 0);
  box(1.1, 0.006, 1.1, mDust, 0, 0.133, 0);
  for (const c of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) { cyl(0.02, 0.03, 6, mBolt, c[0], 0.145, c[1]); }
  box(0.03, 0.06, 0.006, mRust, 0.5, 0.1, 0.603); box(0.03, 0.06, 0.006, mRust, -0.5, 0.1, 0.603);
  add(new THREE.LatheGeometry([new THREE.Vector2(0.3, 0.21), new THREE.Vector2(0.45, 0.165), new THREE.Vector2(0.58, 0.135)], 14), mSand, 0, 0, 0);
  const corner = add(new THREE.LatheGeometry([new THREE.Vector2(0, 0.24), new THREE.Vector2(0.15, 0.19), new THREE.Vector2(0.28, 0.135)], 10), mSand, 0.4, 0, 0.4);
  wedge(0.9, 0.1, 0.1, mSand, 0.6, 0, 0.15, 0);
  wedge(0.5, 0.1, 0.1, mSand, -0.3, 0, -0.6, PI / 2);

  // two tone block: south face lighter
  const block = (w, h, d, y) => {
    box(w, h, d * 0.5, mBlockS, 0, y, d * 0.25);
    box(w, h, d * 0.5, mBlockN, 0, y, -d * 0.25);
    box(w - 0.06, 0.006, d - 0.06, mDust, 0, y + h / 2 + 0.003, 0);
  };
  const studRing = (y, r, n, rot = 0) => {
    cyl(r, 0.04, 14, mFlange, 0, y + 0.02, 0);
    cyl(r, 0.04, 14, mFlange, 0, y + 0.06, 0);
    cyl(r + 0.01, 0.015, 14, mRust, 0, y + 0.04, 0);
    for (let i = 0; i < n; i++) {
      const a = i * 2 * PI / n + rot;
      cyl(0.012, 0.13, 6, mBolt, (r - 0.04) * Math.cos(a), y + 0.04, (r - 0.04) * Math.sin(a));
      cyl(0.02, 0.02, 6, mBolt, (r - 0.04) * Math.cos(a), y + 0.09, (r - 0.04) * Math.sin(a));
      cyl(0.02, 0.02, 6, mBolt, (r - 0.04) * Math.cos(a), y - 0.01, (r - 0.04) * Math.sin(a));
    }
    add(new THREE.RingGeometry(0.15, r - 0.05, 14), mDust, 0, y + 0.081, 0).rotation.x = -PI / 2;
  };
  const drips = (y, r, count, len) => { for (let i = 0; i < count; i++) { const a = i * 2 * PI / count + 0.3; const d = box(0.025, len, 0.005, mRust, r * Math.cos(a), y, r * Math.sin(a)); d.rotation.y = -a + PI / 2; } };
  // base flange
  cyl(0.3, 0.1, 16, mFlange, 0, 0.18, 0);
  for (let i = 0; i < 16; i++) { const a = i * PI / 8; cyl(0.016, 0.03, 6, mBolt, 0.26 * Math.cos(a), 0.245, 0.26 * Math.sin(a)); }
  add(new THREE.RingGeometry(0.15, 0.24, 16), mDust, 0, 0.231, 0).rotation.x = -PI / 2;
  cyl(0.31, 0.03, 16, mRust, 0, 0.145, 0);
  // spool and master valve (block with its own small wheel on +Z)
  cyl(0.13, 0.22, 12, mBody, 0, 0.34, 0);
  studRing(0.44, 0.21, 8);
  block(0.34, 0.36, 0.26, 0.7);
  cyl(0.15, 0.36, 12, mBody, 0, 0.7, 0);
  drips(0.36, 0.131, 3, 0.09);
  cyl(0.04, 0.08, 8, mFlange, 0, 0.7, 0.17).rotation.x = PI / 2;
  cyl(0.01, 0.06, 6, mStem, 0, 0.7, 0.23).rotation.x = PI / 2;
  const mw = new THREE.Group(); mw.position.set(0, 0.7, 0.27); mw.rotation.x = PI / 2; g.add(mw);
  add(new THREE.TorusGeometry(0.09, 0.012, 6, 12), mWheel, 0, 0, 0, mw).rotation.x = PI / 2;
  for (let i = 0; i < 3; i++) { const sp = box(0.17, 0.01, 0.016, mWheel, 0, 0, 0, mw); sp.rotation.y = i * PI / 3; }
  studRing(0.88, 0.21, 8, PI / 8);
  drips(0.83, 0.171, 4, 0.1);
  // second valve
  block(0.34, 0.36, 0.26, 1.14);
  cyl(0.15, 0.36, 12, mBody, 0, 1.14, 0);
  drips(1.27, 0.171, 3, 0.12);
  // cross block at 1.5
  cyl(0.14, 0.2, 12, mBody, 0, 1.42, 0);
  block(0.3, 0.26, 0.3, 1.5);
  for (const s of [-1, 1]) {
    cyl(0.1, 0.12, 12, mBody, s * 0.17, 1.5, 0).rotation.z = PI / 2;
    for (const fx of [0.23, 0.27]) cyl(0.15, 0.04, 12, mFlange, s * fx, 1.5, 0).rotation.z = PI / 2;
    cyl(0.16, 0.015, 12, mRust, s * 0.25, 1.5, 0).rotation.z = PI / 2;
    box(0.025, 0.08, 0.005, mRust, s * 0.2, 1.46, 0.103);
    box(0.025, 0.12, 0.005, mRust, s * 0.33, 1.42, 0.108);
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; const b = cyl(0.012, 0.13, 6, mBolt, s * 0.25, 1.5 + 0.11 * Math.cos(a), 0.11 * Math.sin(a)); b.rotation.z = PI / 2; }
    // wing valve block
    box(0.2, 0.3, 0.14, mBlockS, s * 0.41, 1.5, 0.035); box(0.2, 0.3, 0.14, mBlockN, s * 0.41, 1.5, -0.035);
    cyl(0.12, 0.2, 12, mBody, s * 0.41, 1.5, 0).rotation.z = PI / 2;
    box(0.14, 0.006, 0.08, mDust, s * 0.41, 1.653, 0);
    box(0.025, 0.1, 0.005, mRust, s * 0.36, 1.4, 0.071);
    cyl(0.055, 0.04, 10, mFlange, s * 0.53, 1.5, 0).rotation.z = PI / 2;
    cyl(0.012, 0.1, 6, mStem, s * 0.58, 1.5, 0).rotation.z = PI / 2;
    const w = new THREE.Group(); w.position.set(s * 0.63, 1.5, 0); w.rotation.z = PI / 2; g.add(w);
    add(new THREE.TorusGeometry(0.185, 0.016, 6, 14), s > 0 ? mWheelB : mWheel, 0, 0, 0, w).rotation.x = PI / 2;
    for (let i = 0; i < 5; i++) { const sp = box(0.18, 0.012, 0.02, mWheel, 0, 0, 0, w); sp.rotation.y = i * 2 * PI / 5; sp.position.set(0.09 * Math.cos(i * 2 * PI / 5), 0, -0.09 * Math.sin(i * 2 * PI / 5)); }
    cyl(0.035, 0.04, 8, mWheel, 0, 0, 0, w);
    cyl(0.016, 0.02, 6, mBolt, 0, 0.03, 0, w);
  }
  // flowline off the +X wing: tee stub, flanged union with bolts and a rust ring, drop pipe to the cellar plate
  // with a bottom flange and its own sand mound, clamp bar and U bolt tying it to the stack
  cyl(0.06, 0.1, 10, mBody, 0.41, 1.31, 0);
  for (const fy of [1.245, 1.21]) cyl(0.09, 0.03, 10, mFlange, 0.41, fy, 0);
  cyl(0.095, 0.012, 10, mRust, 0.41, 1.228, 0);
  for (let i = 0; i < 6; i++) { const a = i * PI / 3 + PI / 6; cyl(0.01, 0.07, 6, mBolt, 0.41 + 0.075 * Math.cos(a), 1.228, 0.075 * Math.sin(a)); }
  box(0.02, 0.1, 0.005, mRust, 0.43, 1.14, 0.052);
  cyl(0.05, 0.98, 10, mFlow, 0.41, 0.71, 0);
  cyl(0.09, 0.03, 10, mFlange, 0.41, 0.215, 0);
  cyl(0.095, 0.012, 10, mRust, 0.41, 0.235, 0);
  add(new THREE.LatheGeometry([new THREE.Vector2(0, 0.25), new THREE.Vector2(0.1, 0.21), new THREE.Vector2(0.2, 0.16)], 10), mSand, 0.41, 0, 0);
  box(0.2, 0.03, 0.16, mFlange, 0.28, 0.9, 0);
  { const tg = new THREE.TorusGeometry(0.062, 0.008, 4, 8, PI); tg.rotateZ(-PI / 2); tg.rotateX(PI / 2); add(tg, mStem, 0.41, 0.9, 0); }
  for (const s of [-1, 1]) { cyl(0.008, 0.08, 6, mStem, 0.31, 0.9, s * 0.062).rotation.z = PI / 2; cyl(0.014, 0.012, 6, mBolt, 0.27, 0.9, s * 0.062).rotation.z = PI / 2; }
  box(0.02, 0.08, 0.005, mRust, 0.3, 0.84, 0.083);
  // tag plates on the master and second valve, stencil plate on the third, gauge line down the stack with clips
  box(0.08, 0.05, 0.005, mPlate, -0.1, 0.82, 0.133);
  box(0.08, 0.05, 0.005, mPlate, 0.1, 1.2, 0.133);
  box(0.14, 0.08, 0.006, mPlate, 0, 1.86, 0.133);
  cyl(0.006, 0.56, 6, mStem, -0.16, 2.0, 0.16);
  cyl(0.006, 0.12, 6, mStem, -0.11, 2.28, 0.135).rotation.z = PI / 2;
  for (const cy of [2.05, 1.8]) box(0.02, 0.02, 0.03, mBolt, -0.16, cy, 0.15);
  // lifting eyes on the top flange
  for (const ex of [-0.12, 0.12]) add(new THREE.TorusGeometry(0.025, 0.007, 4, 8), mFlange, ex, 2.23, 0);
  studRing(1.63, 0.21, 8);
  // third valve
  block(0.34, 0.3, 0.26, 1.86);
  cyl(0.15, 0.3, 12, mBody, 0, 1.86, 0);
  drips(1.72, 0.171, 3, 0.08);
  studRing(2.01, 0.21, 8, PI / 8);
  // top cap, yellow band, swab valve, gauge
  cyl(0.19, 0.08, 14, mYellow, 0, 2.13, 0);
  cyl(0.16, 0.04, 14, mFlange, 0, 2.19, 0);
  add(new THREE.RingGeometry(0.06, 0.15, 14), mDust, 0, 2.211, 0).rotation.x = -PI / 2;
  cyl(0.055, 0.12, 10, mBody, 0, 2.27, 0);
  cyl(0.07, 0.03, 10, mFlange, 0, 2.345, 0);
  cyl(0.02, 0.04, 6, mStem, 0, 2.38, 0);
  cyl(0.012, 0.08, 6, mStem, -0.06, 2.29, 0.06).rotation.x = PI / 2;
  const gauge = cyl(0.045, 0.03, 12, mBody, -0.06, 2.31, 0.11); gauge.rotation.x = PI / 2;
  add(new THREE.CircleGeometry(0.036, 12), mDial, -0.06, 2.31, 0.126);
  box(0.02, 0.06, 0.005, mRust, 0.04, 2.06, 0.191);
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
