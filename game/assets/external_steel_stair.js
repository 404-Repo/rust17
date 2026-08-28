// external_steel_stair candidate 1: profiles. Each stringer is the true stringer
// polygon (vertical foot cut, sloped web, head into the landing frame) extruded as a
// web with flange strips; each tread is one extrude of five bar rectangles plus the
// nosing; each handrail is one tube swept from the foot post, up the slope, level
// over the landing and down the end post; foot and landing plates are extruded.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const tint = (hex, f) => {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
    const gg = Math.min(255, Math.round(((hex >> 8) & 255) * f));
    const b = Math.min(255, Math.round((hex & 255) * f));
    return (r << 16) | (gg << 8) | b;
  };
  const STEEL = 0x4f5257, GALV = 0x9ea3a1, RUST = 0x6b4426, SAND = 0xcdb88e;
  const steelL = M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true);
  const steelR = M(STEEL, 'metal', 0.82, 0.3, true);
  const steelD = M(tint(STEEL, 0.9), 'metal', 0.85, 0.3, true);
  const galv = M(GALV, 'metal', 0.7, 0.55, true);
  const galvD = M(tint(GALV, 0.88), 'metal', 0.75, 0.5);
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const sand = M(SAND, 'ground', 0.95, 0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);

  const RISE = 2.3 / 14, GO = 0.254, N = 13, ZF0 = -1.727;
  const nosing = (z) => RISE * (1 + (z - ZF0) / GO);
  const A = Math.atan2(RISE, GO), COS = Math.cos(A);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bx = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  // shapes drawn in (z, y); rotation.y = -PI/2 sends shape x to world z and the extrusion toward -x
  const ext = (shape, depth, mat, x0) => { const mm = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat); mm.rotation.y = -Math.PI / 2; mm.position.x = x0; g.add(mm); return mm; };
  const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.lineTo(pts[0][0], pts[0][1]); return s; };

  // ---- stringers: polygon web, flange strips, bolts with rust -----------------------------
  const topLine = (z) => nosing(z) - 0.085, D = 0.25 / COS;
  const zBot0 = ZF0 + GO * ((0.085 + D) / RISE - 1);          // where the bottom edge meets the ground
  const web = poly([[-1.55, 0], [-1.55, topLine(-1.55)], [1.4, topLine(1.4)], [1.4, 2.29], [1.8, 2.29], [1.8, 2.02], [1.5, 2.02], [1.5, topLine(1.5) - D], [zBot0, 0]]);
  for (const sx of [-1, 1]) {
    const mat = sx > 0 ? steelL : steelR;
    ext(web, 0.012, mat, sx * 0.58 + 0.006);
    const fl = 2.95 / COS;
    const ft = bx(0.06, 0.012, fl, steelD, sx * 0.555, topLine(-0.075) - 0.006, -0.075); ft.rotation.x = -A;
    const fb = bx(0.06, 0.012, fl, steelD, sx * 0.555, topLine(-0.075) - D + 0.006, -0.075); fb.rotation.x = -A;
    for (const z of [-1.2, -0.6, 0, 0.6, 1.2]) {
      const y = topLine(z) - D / 2;
      for (const dy of [0.05, -0.05]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 6), gun); b.rotation.z = Math.PI / 2; b.position.set(sx * 0.592, y + dy, z); g.add(b); }
      bx(0.004, 0.16, 0.03, rust, sx * 0.59, y - 0.14, z + 0.02);
    }
    bx(0.004, 0.2, 0.14, rust, sx * 0.59, 2.1, 1.62);
  }

  // ---- treads: one extrude per tread (five bars and a nosing), carriers, dust -------------
  const barsShape = [];
  for (let k = 0; k < 5; k++) barsShape.push(poly([[-0.1 + k * 0.05 - 0.003, -0.03], [-0.1 + k * 0.05 + 0.003, -0.03], [-0.1 + k * 0.05 + 0.003, 0], [-0.1 + k * 0.05 - 0.003, 0]]));
  barsShape.push(poly([[-0.145, -0.04], [-0.105, -0.04], [-0.105, 0], [-0.145, 0]]));
  barsShape.push(poly([[-0.11, -0.036], [0.11, -0.036], [0.11, -0.03], [-0.11, -0.03]]));
  const treadGeo = new THREE.ExtrudeGeometry(barsShape, { depth: 1.1, bevelEnabled: false });
  for (let i = 0; i < N; i++) {
    const yt = (i + 1) * RISE, zc = -1.6 + i * GO;
    const t = new THREE.Mesh(treadGeo, i % 2 ? galv : M(tint(GALV, 0.95), 'metal', 0.72, 0.55, true));
    t.rotation.y = -Math.PI / 2; t.position.set(0.55, yt, zc); g.add(t);
    for (const sx of [-1, 1]) bx(0.03, 0.04, 0.25, steelD, sx * 0.535, yt - 0.05, zc);
    bx(0.9, 0.004, 0.14, sand, (i % 2 ? 0.05 : -0.05), yt + 0.002, zc + 0.01);
  }

  // ---- foot plates and landing plate, extruded with bolt bosses ---------------------------
  for (const sx of [-1, 1]) {
    ext(poly([[-1.8, 0], [-1.45, 0], [-1.45, 0.02], [-1.7, 0.02], [-1.7, 0.035], [-1.75, 0.035], [-1.75, 0.02], [-1.8, 0.02]]), 0.22, steelD, sx > 0 ? 0.65 : -0.43);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), gun); b.position.set(sx * 0.62, 0.045, -1.725); g.add(b);
    bx(0.06, 0.004, 0.06, rust, sx * 0.62, 0.021, -1.66);
  }
  ext(poly([[1.5, 2.28], [1.8, 2.28], [1.8, 2.3], [1.5, 2.3]]), 1.24, steelD, 0.62);
  bx(1.0, 0.005, 0.24, sand, 0, 2.302, 1.65);
  for (const [x, z] of [[-0.5, 1.55], [0.5, 1.55], [-0.5, 1.75], [0.5, 1.75]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), gun); b.position.set(x, 2.31, z); g.add(b); bx(0.05, 0.004, 0.04, rust, x, 2.3, z + 0.04); }

  // ---- handrails: one swept tube per side, knee rail, mid post ---------------------------
  for (const sx of [-1, 1]) {
    const x = sx * 0.63, mat = sx > 0 ? steelL : steelR;
    const path = new THREE.CurvePath();
    const zA = -1.4, zB = 1.4, r = 0.1;
    path.add(new THREE.LineCurve3(V3(x, nosing(zA) - 0.09, zA), V3(x, nosing(zA) + 1.0 - r, zA)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x, nosing(zA) + 1.0 - r, zA), V3(x, nosing(zA) + 1.0, zA), V3(x, nosing(zA + r) + 1.0, zA + r)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zA + r) + 1.0, zA + r), V3(x, nosing(zB) + 1.0, zB)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zB) + 1.0, zB), V3(x, nosing(zB) + 1.0, 1.8 - r)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x, nosing(zB) + 1.0, 1.8 - r), V3(x, nosing(zB) + 1.0, 1.8), V3(x, nosing(zB) + 1.0 - r, 1.8)));
    path.add(new THREE.LineCurve3(V3(x, nosing(zB) + 1.0 - r, 1.8), V3(x, 2.3, 1.8)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.021, 7, false), mat));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.09, 8), mat); mid.position.set(x, nosing(0) + 0.455, 0); g.add(mid);
    const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.8 / COS, 8), mat); knee.rotation.x = Math.PI / 2 - A; knee.position.set(x, nosing(0) + 0.5, 0); g.add(knee);
    for (const z of [zA, 0, zB]) { bx(0.05, 0.05, 0.012, steelD, x - sx * 0.02, nosing(z) - 0.04, z); bx(0.03, 0.08, 0.004, rust, x - sx * 0.04, nosing(z) - 0.11, z); }
    const cap = bx(0.02, 0.006, 2.6, sx > 0 ? M(tint(STEEL, 1.16), 'metal', 0.8, 0.3) : sand, x, nosing(0) + 1.022, 0); cap.rotation.x = -A;
  }

  // ---- sand fillet at the foot --------------------------------------------------------
  bx(1.3, 0.1, 0.55, sand, 0, 0.05, -1.62);
  bx(0.4, 0.06, 0.4, sand, 0.45, 0.03, -1.35);
  bx(0.35, 0.05, 0.3, sand, -0.45, 0.025, -1.3);
  // ---- r4 detail pass: a bolted cleat on the outside of the stringer at every tread, post clip plates with bolts, safety
  // yellow nosings on the bottom and top treads, two cross ties under the flight, a bolted end plate and cleat angle where
  // the landing meets the roof edge, second bolts in the foot plates, rust runs under all of it. Rise stays 2.300. ----
  {
    const hex = (mat, x, y, z, r, h, axis) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), mat); if (axis === 'z') b.rotation.x = Math.PI / 2; else if (axis === 'x') b.rotation.z = Math.PI / 2; b.position.set(x, y, z); g.add(b); return b; };
    const yel = M(0xc9a227, 'metal', 0.72, 0.15);
    const cleat = M(tint(STEEL, 0.95), 'metal', 0.84, 0.3);
    for (let i = 1; i < N; i++) {
      const yt = (i + 1) * RISE, zc = -1.6 + i * GO;
      if (Math.abs(zc + 1.4) < 0.12 || Math.abs(zc - 1.4) < 0.12) continue;
      for (const sx of [-1, 1]) {
        bx(0.012, 0.12, 0.16, cleat, sx * 0.598, yt - 0.09, zc);
        for (const dz of [-0.045, 0.045]) hex(gun, sx * 0.61, yt - 0.075, zc + dz, 0.012, 0.024, 'x');
        bx(0.004, 0.07, 0.05, rust, sx * 0.6, yt - 0.19, zc + 0.03 * (i % 2 ? 1 : -1));
      }
    }
    for (const z of [-1.4, 0, 1.4]) for (const sx of [-1, 1]) {
      const y0 = nosing(z) - 0.06;
      bx(0.014, 0.2, 0.1, cleat, sx * 0.599, y0 - 0.1, z);
      for (const dy of [-0.04, -0.15]) hex(gun, sx * 0.612, y0 + dy, z, 0.012, 0.024, 'x');
      bx(0.004, 0.08, 0.04, rust, sx * 0.6, y0 - 0.24, z + 0.02);
    }
    for (const i of [0, N - 1]) { const yt = (i + 1) * RISE, zc = -1.6 + i * GO; bx(1.1, 0.008, 0.045, yel, 0, yt + 0.004, zc - 0.125); bx(1.1, 0.036, 0.006, yel, 0, yt - 0.02, zc - 0.148); }
    for (const z of [-0.6, 0.8]) bx(1.15, 0.04, 0.06, steelD, 0, topLine(z) - D + 0.06, z);
    bx(1.25, 0.28, 0.02, steelD, 0, 2.155, 1.81);
    for (const x of [-0.42, 0.42]) { for (const y of [2.08, 2.23]) hex(gun, x, y, 1.822, 0.014, 0.024, 'z'); bx(0.04, 0.05, 0.004, rust, x + 0.015, 2.045, 1.822); }
    bx(0.9, 0.05, 0.12, steelD, 0, 2.04, 1.87);
    for (const x of [-0.3, 0.3]) hex(gun, x, 2.07, 1.89, 0.014, 0.02);
    bx(1.15, 0.03, 0.004, rust, 0, 2.265, 1.822);
    for (const sx of [-1, 1]) { hex(gun, sx * 0.47, 0.045, -1.725, 0.018, 0.02); bx(0.06, 0.004, 0.06, rust, sx * 0.47, 0.021, -1.66); }
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

  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return; const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); }; if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; } put(n.matrixWorld); });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
