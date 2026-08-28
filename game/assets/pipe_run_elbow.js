// pipe_run_elbow c2: different breakdown. Legs as south/north half shells in two tints, the bend
// as a six facet torus wrapped in three seam bands (three sheet segments, each rolled in two
// facets), channel-leg trestles with a wide top beam and cheek plates matching the straight run
// winner, and a sand drift piled into the inside corner.
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
  const UP = new THREE.Vector3(0, 1, 0);
  const alongDir = (o, dir) => { o.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); return o; };

  const mCrown = mat(shade(P.steel, 1.1), 'metal', 0.8, 0.2, true);
  const mSide = mat(P.steel, 'metal', 0.85, 0.2, true);
  const mSideS = mat(shade(P.steel, 1.05), 'metal', 0.85, 0.2, true);
  const mBelly = mat(shade(P.steel, 0.88), 'metal', 0.9, 0.15, true);
  const mBend = mat(shade(P.steel, 1.02), 'metal', 0.85, 0.2);
  const mFlange = mat(shade(P.steel, 0.93), 'metal', 0.8, 0.25);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mLeg = mat(P.galv, 'metal', 0.75, 0.45);
  const mLegS = mat(shade(P.galv, 1.06), 'metal', 0.75, 0.45);
  const mBeam = mat(shade(P.galv, 0.92), 'metal', 0.8, 0.4);

  const R = 0.25, AX = 1.25, RB = 0.8, LEG = 2.0, FT = 0.06, FR = 0.35;
  const L = LEG - FT;
  // leg A along X: crown / flanks / belly courses. top = theta PI/2 after rotation.z = PI/2
  const secX = (r, len, start, span, m, x, seg = 5) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, true, start, span), m, x, AX, -RB); o.rotation.z = PI / 2; return o; };
  secX(R, L, PI / 2 - 0.87, 1.74, mCrown, L / 2);
  secX(R, L, PI / 2 + 0.87, PI - 1.57, mSide, L / 2);
  secX(R, L, -PI / 2 + 0.7, PI - 1.57, mSideS, L / 2);
  secX(R, L, -PI / 2 - 0.7, 1.4, mBelly, L / 2, 4);
  secX(R + 0.008, L - 0.4, PI / 2 - 0.4, 0.8, mDust, L / 2, 4);
  secX(R + 0.006, L - 0.1, -PI / 2 - 0.12, 0.24, mRust, L / 2, 3);
  // leg B along Z: top = theta 0 after rotation.x = -PI/2, +X side = theta PI/2
  const secZ = (r, len, start, span, m, z, seg = 5) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, true, start, span), m, -RB, AX, z); o.rotation.x = -PI / 2; return o; };
  secZ(R, L, -0.87, 1.74, mCrown, L / 2);
  secZ(R, L, 0.87, PI - 1.57, mSideS, L / 2);
  secZ(R, L, PI + 0.7, PI - 1.57, mSide, L / 2);
  secZ(R, L, PI - 0.7, 1.4, mBelly, L / 2, 4);
  secZ(R + 0.008, L - 0.4, -0.4, 0.8, mDust, L / 2, 4);
  secZ(R + 0.006, L - 0.1, PI - 0.12, 0.24, mRust, L / 2, 3);
  // longitudinal weld strips
  box(L - 0.2, 0.02, 0.012, mRust, L / 2, AX + 0.02, -RB + R + 0.002);
  box(0.012, 0.02, L - 0.2, mRust, -RB + R + 0.002, AX + 0.02, L / 2);

  // bend: six facet quarter torus with three rolled sheet segments, seams at every 30 degrees
  const torus = new THREE.TorusGeometry(RB, R, 14, 6, PI / 2);
  torus.rotateX(PI / 2); torus.rotateY(PI);
  add(torus, mBend, 0, AX, 0);
  const pt = (a) => new THREE.Vector3(RB * Math.cos(a), AX, RB * Math.sin(a));
  const tan = (a) => new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  for (let i = 0; i <= 3; i++) {
    const a = -PI / 2 - i * PI / 6;
    const p = pt(a);
    const ring = add(new THREE.CylinderGeometry(R + 0.022, R + 0.022, 0.05, 14), mRust, p.x, p.y, p.z); alongDir(ring, tan(a));
    const drip = box(0.03, 0.14 + 0.05 * i, 0.008, mRust, p.x + Math.cos(a) * (R + 0.004), AX - 0.1, p.z + Math.sin(a) * (R + 0.004));
    drip.rotation.y = -a;
  }
  // dust on the crown of the bend: a thin torus sector sitting on top
  const dustBend = new THREE.TorusGeometry(RB, R + 0.008, 4, 6, PI / 2 - 0.2);
  dustBend.rotateX(PI / 2); dustBend.rotateY(PI + 0.1);
  add(dustBend, mDust, 0, AX, 0);

  // flanges
  const flange = (pos, dir, side) => {
    const f = add(new THREE.CylinderGeometry(FR, FR, FT, 14), mFlange, pos.x, pos.y, pos.z); alongDir(f, dir);
    const back = pos.clone().sub(dir.clone().multiplyScalar(FT / 2 + 0.035));
    const ring = add(new THREE.CylinderGeometry(R + 0.016, R + 0.016, 0.07, 14), mRust, back.x, back.y, back.z); alongDir(ring, dir);
    const face = pos.clone().add(dir.clone().multiplyScalar(FT / 2 + 0.016));
    for (let i = 0; i < 12; i++) {
      const a = i * PI / 6 + PI / 12;
      const by = 0.295 * Math.cos(a), bs = 0.295 * Math.sin(a);
      const b = add(new THREE.CylinderGeometry(0.024, 0.024, 0.032, 6), mBolt, face.x + side.x * bs, face.y + by, face.z + side.z * bs); alongDir(b, dir);
      if (Math.cos(a) > -0.9) {
        const d = box(0.03, 0.05 + 0.08 * Math.abs(Math.sin(a)), 0.006, mRust, face.x + side.x * bs - dir.x * 0.014, face.y + by - 0.06, face.z + side.z * bs - dir.z * 0.014);
        d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    }
  };
  flange(new THREE.Vector3(LEG - FT / 2, AX, -RB), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
  flange(new THREE.Vector3(-RB, AX, LEG - FT / 2), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));

  // trestles: channel legs, wide top beam, wedge saddle with cheek plates
  const legLen = 0.98, tilt = Math.atan2(0.26, 0.93);
  const trestle = (x, z, ry) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry; g.add(t);
    for (const s of [-1, 1]) {
      const lm = s > 0 ? mLegS : mLeg;
      const legG = new THREE.Group(); legG.position.set(0, 0.475, s * 0.24); legG.rotation.x = -s * tilt; t.add(legG);
      box(0.12, legLen, 0.01, lm, 0, 0, 0, legG);
      box(0.12, legLen, 0.05, lm, 0, 0, s * 0.03, legG);
      box(0.02, legLen, 0.05, lm, -0.05, 0, -s * 0.02, legG);
      box(0.02, legLen, 0.05, lm, 0.05, 0, -s * 0.02, legG);
      box(0.3, 0.02, 0.16, mBeam, 0, 0.01, s * 0.39, t);
      for (const bx of [-0.11, 0.11]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mBolt, bx, 0.03, s * 0.44, t);
      box(0.03, 0.14, 0.008, mRust, 0.03, 0.12, s * 0.475, t);
    }
    box(0.06, 0.05, 0.5, mLeg, 0, 0.48, 0, t);
    box(0.42, 0.06, 0.9, mBeam, 0, 0.94, 0, t);
    box(0.36, 0.004, 0.84, mDust, 0, 0.973, 0, t);
    box(0.3, 0.05, 0.36, mBeam, 0, 0.995, 0, t);
    for (const cz of [-0.19, 0.19]) box(0.3, 0.16, 0.015, mBeam, 0, 1.05, cz, t);
    for (const cz of [-0.2, 0.2]) box(0.02, 0.12, 0.008, mRust, 0.1, 0.9, cz, t);
    wedge(0.86, 0.28, 0.12, mSand, 0.21, 0, 0, 0, t);
    wedge(0.86, 0.28, 0.12, mSand, -0.21, 0, 0, PI, t);
  };
  trestle(LEG - 1.0, -RB, 0);
  trestle(-RB, LEG - 1.0, PI / 2);
  // sand drift piled into the inside corner and against the far leg
  add(new THREE.LatheGeometry([new THREE.Vector2(0, 0.22), new THREE.Vector2(0.25, 0.15), new THREE.Vector2(0.45, 0.04), new THREE.Vector2(0.55, 0)], 12), mSand, -0.5, 0, -0.5);
  wedge(1.2, 0.22, 0.12, mSand, -RB - R - 0.01, 0, 1.3, PI);
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
