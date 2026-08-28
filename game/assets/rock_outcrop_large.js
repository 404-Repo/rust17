// rock_outcrop_large c0: primitives. Five lobes, each a stack of 0.5 m bedding courses built from
// jittered BoxGeometry (hash jitter so shared edges stay closed), plan of each course drifts so the
// bedding reads as steps; one overhang course on the south lobe, six fallen blocks, dust on ledges,
// dark bedding strips between courses, sand fillet all round.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, concS: 0x857c6c, rust: 0x6b4426 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false, flat = true) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const hsh = (x, y, z, k) => { const t = Math.sin(Math.round(x * 1e3) * 0.1271 + Math.round(y * 1e3) * 0.3117 + Math.round(z * 1e3) * 0.0747 + k * 19.3) * 43758.5453; return t - Math.floor(t); };
  // A faceted block: box with hashed vertex jitter, bottom ring kept flat so it sits.
  const jbox = (w, h, d, jit, seed) => {
    const geo = new THREE.BoxGeometry(w, h, d, 2, 1, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const jx = (hsh(x, y, z, seed) - 0.5) * jit * w, jz = (hsh(x, y, z, seed + 7) - 0.5) * jit * d;
      const jy = y <= -h / 2 + 1e-4 ? 0 : (hsh(x, y, z, seed + 13) - 0.5) * jit * h * 0.6;
      p.setXYZ(i, x + jx, y + jy, z + jz);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const mRockN = mat(P.rock, 'stone');                       // north faces
  const mRockS = mat(shade(P.rock, 1.04), 'stone');          // south, bleached
  const mRockW = mat(shade(P.rock, 0.96), 'stone');
  const mBed = mat(shade(P.rock, 0.82), 'stone', 0.95);       // bedding line, slightly darker
  const mCrack = mat(P.concS, 'stone', 0.95);
  const mStreak = mat(P.rust, 'stone', 0.95);
  const mDust = mat(P.sand, 'ground', 0.95);
  const mSand = mat(P.sand, 'ground', 0.95, 0, false, false);

  // Lobes: x, z, w, d, height (courses), which face is bleached
  const lobes = [
    { x: -2.1, z: 0.5, w: 2.9, d: 2.35, n: 5, seed: 1 },
    { x: 0.2, z: -0.1, w: 3.1, d: 2.5, n: 6, seed: 2 },
    { x: 2.2, z: 0.4, w: 2.7, d: 2.15, n: 5, seed: 3 },
    { x: -0.9, z: -1.4, w: 2.6, d: 1.6, n: 4, seed: 4 },
    { x: 1.5, z: -1.5, w: 2.3, d: 1.45, n: 3, seed: 5 },
    { x: 0.3, z: -1.9, w: 3.0, d: 1.1, n: 2, seed: 6 },
  ];
  const COURSE = 0.5;
  for (const L of lobes) {
    let y = 0;
    for (let c = 0; c < L.n; c++) {
      const h = COURSE * rr(0.8, 1.3);
      const inset = c === 0 ? 1 : rr(0.84, 1.04);
      let w = L.w * inset, d = L.d * inset;
      let zoff = 0;
      // the overhang: south lobe (z positive), top-but-one course pushes 0.5 m south
      if (L.seed === 3 && c === L.n - 2) { d += 0.5; zoff = 0.25; }
      const m = (L.z > 0 || c % 2) ? mRockS : (c % 3 === 0 ? mRockW : mRockN);
      const blk = add(jbox(w, h, d, 0.16, L.seed * 10 + c), m, L.x + rr(-0.1, 0.1), y + h / 2 - 0.03, L.z + zoff + rr(-0.1, 0.1));
      blk.rotation.y = rr(-0.09, 0.09);
      // bedding line strip between courses, poking out where the course above is inset
      if (c > 0) add(new THREE.BoxGeometry(w * 1.01, 0.05, d * 1.01), mBed, L.x, y + 0.02, L.z + zoff);
      y += h;
    }
    // dust on the top ledge
    add(new THREE.BoxGeometry(L.w * 0.74, 0.012, L.d * 0.74), mDust, L.x, y + 0.02, L.z);
    // a couple of vertical cracks and a streak on the south face
    for (let k = 0; k < 2; k++) {
      const cx = L.x + rr(-L.w * 0.35, L.w * 0.35);
      add(new THREE.BoxGeometry(0.05, y * rr(0.35, 0.7), 0.06), mCrack, cx, y * 0.5, L.z + L.d / 2 - 0.02);
    }
    add(new THREE.BoxGeometry(0.08, 0.35, 0.05), mStreak, L.x + rr(-0.5, 0.5), 0.55, L.z + L.d / 2 - 0.01);
    add(new THREE.BoxGeometry(0.05, 0.4, 0.08), mStreak, L.x + L.w / 2 - 0.01, 0.9, L.z + rr(-0.5, 0.5));
    // ledge dust on the mid course steps
    add(new THREE.BoxGeometry(L.w * 0.5, 0.01, 0.12), mDust, L.x, COURSE * 2 + 0.03, L.z + L.d / 2 - 0.08);
  }
  // fallen blocks along the south and east base
  const blocks = [[-3.2, 1.9, 0.8], [-1.6, 2.05, 0.55], [0.4, 2.0, 0.7], [2.0, 1.95, 0.4], [3.5, 1.2, 0.6], [3.5, -0.4, 0.35]];
  for (let i = 0; i < blocks.length; i++) {
    const [x, z, a] = blocks[i];
    const b = add(jbox(a, a * 0.7, a * 0.85, 0.12, 100 + i), i % 2 ? mRockS : mRockN, x, a * 0.3, z);
    b.rotation.y = rr(-0.5, 0.5); b.rotation.z = rr(-0.12, 0.12);
    add(new THREE.BoxGeometry(a * 0.6, 0.01, a * 0.5), mDust, x, a * 0.66, z);
  }
  // sand fillet: an irregular low mound under the whole mass
  const fillet = new THREE.CylinderGeometry(3.55, 4.0, 0.22, 16, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.06 * Math.sin(x * 3.1 + z)), fp.getY(i), z * 0.56 * (1 + 0.06 * Math.cos(z * 2.7 + x))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.1, 0.11, 0.2);
  // packed sand scuffs on the fillet
  add(new THREE.BoxGeometry(2.2, 0.02, 0.5), mat(P.packed, 'ground', 0.95, 0, false, false), -1.0, 0.23, 1.85);
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
