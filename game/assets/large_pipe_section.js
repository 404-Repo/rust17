// large_pipe_section c2: different reading. Spigot and socket sections: each course ends in a bell
// that the next slides into, bolts on the bell, a longitudinal weld strip on each course rotated
// round the pipe, two rust runs per joint, saddles as two stacked concrete blocks with a timber
// packer, the drift built from three overlapping wedges so it undulates like the reference.
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
  const cylX = (r, len, seg, m, x, y, z, open = false, start = 0, span = PI * 2, parent = g) => { const o = add(new THREE.CylinderGeometry(r, r, len, seg, 1, open, start, span), m, x, y, z, parent); o.rotation.z = PI / 2; return o; };

  const tints = [0.97, 1.05, 0.92, 1.02];
  const mCrown = tints.map((f) => mat(shade(P.tank, f * 1.06), 'metal', 0.85, 0.1, true));
  const mFlank = tints.map((f) => mat(shade(P.tank, f), 'metal', 0.87, 0.1, true));
  const mBelly = tints.map((f) => mat(shade(P.tank, f * 0.88), 'metal', 0.9, 0.1, true));
  const mBell = mat(shade(P.tank, 0.9), 'metal', 0.8, 0.2);
  const mFlange = mat(shade(P.tank, 0.86), 'metal', 0.8, 0.2);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mBore = mat(shade(P.steel, 0.6), 'metal', 0.95, 0.1, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mSandD = mat(shade(P.sand, 0.96), 'ground', 0.95, 0.0);
  const mOxide = mat(P.oxide, 'metal', 0.9, 0.05, true);
  const mConc = mat(P.concB, 'stone', 0.95, 0.0);
  const mConcS = mat(P.concS, 'stone', 0.95, 0.0);
  const mTimber = mat(P.timber, 'timber', 0.9, 0.0);
  const mStrap = mat(shade(P.galv, 0.85), 'metal', 0.8, 0.4, true);
  const mPlate = mat(shade(P.steel, 1.1), 'metal', 0.8, 0.2);
  const mYellow = mat(P.yellow, 'metal', 0.85, 0.1);
  const mStem = mat(P.galv, 'metal', 0.6, 0.6);

  const R = 0.6, AX = 1.0, L = 8.0, SEC = 2.0;
  for (let i = 0; i < 4; i++) {
    const cx = -L / 2 + SEC / 2 + i * SEC;
    cylX(R, SEC, 20, mCrown[i], cx, AX, 0, true, PI / 2 - 0.9, 1.8);
    cylX(R, SEC, 20, mFlank[i], cx, AX, 0, true, PI / 2 + 0.9, PI - 1.6);
    cylX(R, SEC, 20, mFlank[i], cx, AX, 0, true, -PI / 2 + 0.7, PI - 1.6);
    cylX(R, SEC, 20, mBelly[i], cx, AX, 0, true, -PI / 2 - 0.7, 1.4);
    // longitudinal weld strip, rotated a different way round on each course
    const wa = 0.5 + i * 1.3;
    const strip = box(SEC - 0.3, 0.025, 0.012, mRust, cx, AX + (R + 0.004) * Math.cos(wa), (R + 0.004) * Math.sin(wa)); strip.rotation.x = -wa;
    // bell socket at the +X end of the first three courses, with bolts round it
    if (i < 3) {
      const bx = cx + SEC / 2;
      cylX(R + 0.035, 0.3, 20, mBell, bx - 0.05, AX, 0);
      cylX(R + 0.04, 0.04, 20, mRust, bx - 0.21, AX, 0);
      for (let k = 0; k < 20; k++) {
        const a = k * PI / 10 + (i % 2) * PI / 20;
        const ny = Math.cos(a), nz = Math.sin(a);
        const b = add(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6), mBolt, bx - 0.02, AX + (R + 0.05) * ny, (R + 0.05) * nz); b.rotation.x = -a;
        if (ny < 0.85 && ny > -0.6) {
          const dl = 0.12 + 0.3 * Math.abs(nz), a2 = a + 0.5 * dl / R * (nz > 0 ? 1 : -1);
          const s2 = box(0.03, dl, 0.006, mRust, bx + 0.12, AX + (R + 0.004) * Math.cos(a2), (R + 0.004) * Math.sin(a2)); s2.rotation.x = -a2;
        }
      }
    }
  }
  cylX(R + 0.008, L - 0.8, 6, mDust, 0.3, AX, 0, true, PI / 2 - 0.3, 0.6);
  cylX(R + 0.005, L - 0.4, 4, mRust, 0.1, AX, 0, true, -PI / 2 - 0.1, 0.2);
  // flange at +X
  cylX(0.7, 0.08, 20, mFlange, L / 2 - 0.04, AX, 0);
  cylX(R + 0.02, 0.05, 20, mRust, L / 2 - 0.105, AX, 0);
  for (let i = 0; i < 20; i++) {
    const a = i * PI / 10;
    const by = AX + 0.655 * Math.cos(a), bz = 0.655 * Math.sin(a);
    const b = add(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 6), mBolt, L / 2 + 0.01, by, bz); b.rotation.z = PI / 2;
    if (Math.cos(a) > -0.9) box(0.006, 0.05 + 0.1 * Math.abs(Math.sin(a)), 0.03, mRust, L / 2 + 0.002, by - 0.06, bz);
  }
  // open end at -X
  const ring = add(new THREE.RingGeometry(R - 0.03, R, 20), mRust, -L / 2, AX, 0); ring.rotation.y = -PI / 2;
  cylX(R - 0.03, 1.0, 20, mBore, -L / 2 + 0.5, AX, 0, true);
  const bulk = add(new THREE.CircleGeometry(R - 0.03, 20), mBore, -L / 2 + 1.0, AX, 0); bulk.rotation.y = -PI / 2;
  // primer patch on course two, high on the south flank
  cylX(R + 0.004, 0.6, 6, mOxide, -0.9, AX, 0, true, -0.1, 0.95);
  // manway on the crown of course 3: neck, bolted cover, rust ring at the base, dust on the cover
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), mBell, 1.0, AX + R + 0.03, 0);
  add(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16), mFlange, 1.0, AX + R + 0.115, 0);
  for (let k = 0; k < 8; k++) { const a = k * PI / 4; add(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6), mBolt, 1.0 + 0.22 * Math.cos(a), AX + R + 0.14, 0.22 * Math.sin(a)); }
  add(new THREE.CylinderGeometry(0.205, 0.205, 0.03, 16), mRust, 1.0, AX + R - 0.02, 0);
  add(new THREE.CircleGeometry(0.19, 16), mDust, 1.0, AX + R + 0.131, 0).rotation.x = -PI / 2;
  // lifting lug with a ring on every course, rust run round its foot
  for (const lx of [-3.6, -1.6, 0.4, 2.4]) {
    box(0.16, 0.12, 0.02, mBell, lx, AX + R + 0.05, 0);
    add(new THREE.TorusGeometry(0.035, 0.01, 4, 8), mBell, lx, AX + R + 0.12, 0);
    cylX(R + 0.012, 0.22, 6, mRust, lx, AX, 0, true, PI / 2 - 0.25, 0.5);
  }
  // stencil plate on course 4, hazard plate at the open end, both on the south flank
  { const a = 1.0, p = box(0.45, 0.22, 0.008, mPlate, 3.0, AX + R * Math.cos(a), R * Math.sin(a) + 0.004); p.rotation.x = -(PI / 2 - a); }
  { const a = 1.2, p = box(0.3, 0.16, 0.008, mYellow, -3.4, AX + R * Math.cos(a), R * Math.sin(a) + 0.004); p.rotation.x = -(PI / 2 - a); }
  // rolled rust lip on the cut end so it reads as sheet, not a disc
  { const lip = add(new THREE.TorusGeometry(R - 0.01, 0.025, 6, 20, PI * 1.5), mRust, -L / 2 + 0.01, AX, 0); lip.rotation.y = PI / 2; }
  // saddles: two stacked blocks, stained lower, timber packer under the pipe, cheek blocks
  for (const sx of [-2.5, 2.5]) {
    box(0.7, 0.2, 1.5, mConcS, sx, 0.1, 0);
    box(0.6, 0.2, 1.3, mConc, sx, 0.3, 0);
    box(0.54, 0.006, 1.24, mDust, sx, 0.403, 0);
    box(0.5, 0.1, 0.5, mTimber, sx, 0.4, 0);
    for (const s of [-1, 1]) {
      box(0.6, 0.4, 0.2, mConc, sx, 0.6, s * 0.55);
      box(0.54, 0.006, 0.14, mDust, sx, 0.803, s * 0.55);
      box(0.03, 0.18, 0.008, mRust, sx + 0.1, 0.5, s * 0.655);
    }
    // hold down strap over the pipe, lug plates, tie rods and nuts into the cheek blocks, anchor bolts on the ledge
    cylX(R + 0.022, 0.09, 20, mStrap, sx, AX, 0, true, PI / 2 - 1.85, 3.7);
    for (const s of [-1, 1]) {
      box(0.14, 0.02, 0.1, mBell, sx, 0.835, s * 0.6);
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), mStem, sx, 0.8, s * 0.6);
      add(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 6), mBolt, sx, 0.86, s * 0.6);
      box(0.03, 0.15, 0.006, mRust, sx - 0.1, 0.72, s * 0.655);
      for (const bx of [-0.325, 0.325]) {
        add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6), mBolt, sx + bx, 0.215, s * 0.7);
        box(0.03, 0.12, 0.006, mRust, sx + bx, 0.14, s * 0.752);
      }
    }
    wedge(1.5, 0.28, 0.14, mSand, sx + 0.35, 0, 0, 0);
    wedge(1.5, 0.28, 0.14, mSand, sx - 0.35, 0, 0, PI);
  }
  box(6.0, 0.38, 0.4, mSand, 0.4, 0.19, 0);
  wedge(3.2, 0.55, 0.45, mSand, -0.8, 0, 0.2, -PI / 2);
  wedge(3.0, 0.5, 0.38, mSandD, 1.8, 0, 0.2, -PI / 2);
  wedge(2.0, 0.4, 0.25, mSand, 3.2, 0, 0.2, -PI / 2);
  wedge(4.0, 0.3, 0.2, mSandD, -0.6, 0, -0.2, PI / 2);
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
