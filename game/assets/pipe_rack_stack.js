// pipe_rack_stack c2: different reading. Casing pipes with a thickened coupling collar at one end,
// ends open with a rust lip; the whole stack skewed a few degrees on its bearers, two bottom
// pipes pulled out of line, bearers as rough sawn timbers with nail heads, bottom sleepers as
// heavier baulks; a long sand drift half burying the south side.
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

  const tones = [1.0, 0.92, 1.08, 0.88, 1.12, 0.96, 1.04].map((f) => mat(shade(P.steel, f), 'metal', 0.88, 0.2, true));
  const mCollar = mat(shade(P.steel, 0.85), 'metal', 0.85, 0.25);
  const mInner = mat(shade(P.steel, 0.65), 'metal', 0.95, 0.1, true);
  const mEnd = mat(P.oxide, 'metal', 0.9, 0.1, true);
  const mEndB = mat(shade(P.oxide, 1.08), 'metal', 0.9, 0.1, true);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mTimber = mat(P.timber, 'timber', 0.9, 0.0);
  const mTimberD = mat(shade(P.timber, 0.82), 'timber', 0.92, 0.0);
  const mNail = mat(P.gun, 'metal', 0.7, 0.4);

  const R = 0.125, L = 6.0, WALL = 0.02, SLEEP = 0.32, BEAR = 0.18;
  const stack = new THREE.Group(); stack.rotation.y = 0.02; g.add(stack);
  const pipe = (x, y, z, rotY, tone, collarSide, exposed = true) => {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = rotY; stack.add(p);
    const body = add(new THREE.CylinderGeometry(R, R, L - 0.5, 10, 1, true), tones[tone % tones.length], 0, 0, 0, p); body.rotation.z = PI / 2;
    // red oxide end bands, one end with a coupling collar
    for (const s of [-1, 1]) {
      const isCollar = s === collarSide;
      if (isCollar) {
        const col = add(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.25, 10), mCollar, s * (L / 2 - 0.125), 0, 0, p); col.rotation.z = PI / 2;
        const lip = add(new THREE.RingGeometry(R - WALL, R + 0.02, 10), mRust, s * L / 2, 0, 0, p); lip.rotation.y = s * PI / 2;
        const rr = add(new THREE.CylinderGeometry(R + 0.022, R + 0.022, 0.03, 10), mRust, s * (L / 2 - 0.25), 0, 0, p); rr.rotation.z = PI / 2;
      } else {
        const e = add(new THREE.CylinderGeometry(R, R, 0.25, 10, 1, true), s > 0 ? mEndB : mEnd, s * (L / 2 - 0.125), 0, 0, p); e.rotation.z = PI / 2;
        const lip = add(new THREE.RingGeometry(R - WALL, R, 10), mRust, s * L / 2, 0, 0, p); lip.rotation.y = s * PI / 2;
      }
      const inner = add(new THREE.CylinderGeometry(R - WALL, R - WALL, 0.45, 10, 1, true), mInner, s * (L / 2 - 0.22), 0, 0, p); inner.rotation.z = PI / 2;
    }
    if (exposed) { const d = add(new THREE.CylinderGeometry(R + 0.006, R + 0.006, L - 1.2, 3, 1, true, PI / 2 - 0.3, 0.6), mDust, 0.1, 0, 0, p); d.rotation.z = PI / 2; }
    const r = add(new THREE.CylinderGeometry(R + 0.004, R + 0.004, L - 2.0, 2, 1, true, -PI / 2 - 0.1, 0.2), mRust, -0.3, 0, 0, p); r.rotation.z = PI / 2;
    return p;
  };

  const rows = [7, 5, 3];
  const widthRow = (n) => n * 2 * R + (n - 1) * 0.015;
  const BX = [-2.0, 2.0];
  let y = 0;
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r], th = r === 0 ? SLEEP : BEAR, wRow = widthRow(n) + 0.16;
    for (const bx of BX) {
      const b = box(0.18, th, wRow, r === 0 ? mTimberD : mTimber, bx, y + th / 2, 0, stack);
      b.rotation.y = ((bx > 0 ? 1 : -1) * 0.02);
      box(0.14, 0.006, wRow - 0.06, mDust, bx, y + th + 0.003, 0, stack);
      // nail heads at the bearer ends
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), mNail, bx, y + th + 0.005, s * (wRow / 2 - 0.06), stack);
      if (r === 0) for (const s of [-1, 1]) {
        wedge(0.18, 0.08, 0.22, mTimber, bx, y + th, s * (wRow / 2 - 0.01), s > 0 ? PI / 2 : -PI / 2, stack);
      }
    }
    y += th;
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * (2 * R + 0.015);
      const jitter = ((i * 7 + r * 3) % 5 - 2) * 0.007;
      let dx = ((i * 5 + r) % 3 - 1) * 0.05;
      if (r === 0 && i === 1) dx = 0.15;
      if (r === 0 && i === 5) dx = -0.12;
      pipe(dx, y + R, z, jitter, i + r * 2, (i + r) % 2 === 0 ? 1 : -1, r === 2 || i === 0 || i === n - 1);
    }
    if (r === 2) for (const vz of [-(R + 0.0075), R + 0.0075]) box(L - 1.6, 0.06, 0.09, mDust, 0.1, y + R + 0.05, vz, stack);
    y += 2 * R;
  }
  // sand drift half burying the south side, smaller drift on the north, fillets at the sleeper ends
  wedge(5.4, 0.18, 0.28, mSand, 0.1, 0, widthRow(7) / 2 + 0.01, -PI / 2, stack);
  wedge(3.0, 0.16, 0.15, mSand, -0.8, 0, -widthRow(7) / 2 - 0.01, PI / 2, stack);
  for (const bx of BX) { wedge(1.8, 0.25, 0.14, mSand, bx + 0.09, 0, 0, 0, stack); wedge(1.8, 0.25, 0.14, mSand, bx - 0.09, 0, 0, PI, stack); }
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
