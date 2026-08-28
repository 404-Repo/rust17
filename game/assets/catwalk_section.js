// catwalk_section candidate 1: profiles. Side channels are one C shape extruded 3 m;
// the grating is one ExtrudeGeometry of nineteen bar rectangles; each handrail with
// its two end posts is a single tube swept along a path with bent corners; the toe
// plate is an extruded L angle; end plates carry four bolt bosses and rust runs.
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
  const steelS = M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true);
  const steelN = M(STEEL, 'metal', 0.82, 0.3, true);
  const steelD = M(tint(STEEL, 0.9), 'metal', 0.85, 0.3, true);
  const galv = M(GALV, 'metal', 0.7, 0.55, true);
  const galvD = M(tint(GALV, 0.88), 'metal', 0.75, 0.5);
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const sand = M(SAND, 'ground', 0.95, 0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const L = 3.0, W = 1.2, CD = 0.15, RH = 1.0;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bx = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  const ext = (shape, depth, mat) => new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat);
  const rect = (x, y, w, h) => { const s = new THREE.Shape(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.lineTo(x, y); return s; };

  // ---- C channel profile in (z, y), opening inward, extruded along x --------------
  const cShape = (sz) => {
    const s = new THREE.Shape(); const t = 0.01, f = 0.07;
    const zo = sz * W / 2, zi = sz * (W / 2 - f), zt = sz * (W / 2 - t);
    s.moveTo(zo, 0); s.lineTo(zi, 0); s.lineTo(zi, t); s.lineTo(zt, t); s.lineTo(zt, CD - t); s.lineTo(zi, CD - t); s.lineTo(zi, CD); s.lineTo(zo, CD); s.lineTo(zo, 0);
    return s;
  };
  for (const sz of [-1, 1]) {
    const ch = ext(cShape(sz), L, sz > 0 ? steelS : steelN);
    ch.rotation.y = -Math.PI / 2; ch.position.x = L / 2; g.add(ch);        // shape x -> world z, extrude -> -x
    for (const x of [-1.0, 0, 1.0]) {
      bx(0.03, 0.03, 0.015, gun, x, CD - 0.045, sz * (W / 2 + 0.005));
      bx(0.025, 0.07, 0.004, rust, x, CD - 0.09, sz * (W / 2 + 0.008));
    }
  }
  for (const x of [-1.0, 0, 1.0]) bx(0.05, 0.1, W - 0.04, steelD, x, 0.06, 0);

  // ---- grating: nineteen bar rectangles in one extrude, plus cross rods ----------
  const nb = 19, pitch = (W - 0.08) / (nb - 1);
  const bars = [];
  for (let i = 0; i < nb; i++) bars.push(rect(-(W - 0.08) / 2 + i * pitch - 0.0025, CD - 0.03, 0.005, 0.03));
  const grate = new THREE.Mesh(new THREE.ExtrudeGeometry(bars, { depth: L - 0.02, bevelEnabled: false }), galv);
  grate.rotation.y = -Math.PI / 2; grate.position.x = L / 2 - 0.01; g.add(grate);
  for (let j = 0; j <= 20; j++) bx(0.006, 0.008, W - 0.08, galvD, -L / 2 + 0.01 + j * (L - 0.02) / 20, CD - 0.004, 0);

  // ---- toe plate as an L angle, with sand along its foot ---------------------------
  for (const sz of [-1, 1]) {
    const l = new THREE.Shape(); const z0 = sz * (W / 2 - 0.08);
    l.moveTo(z0, CD); l.lineTo(z0 + sz * 0.006, CD); l.lineTo(z0 + sz * 0.006, CD + 0.15); l.lineTo(z0, CD + 0.15); l.lineTo(z0, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD + 0.02); l.lineTo(z0 - sz * 0.04, CD); l.lineTo(z0, CD);
    const toe = ext(l, L, sz > 0 ? steelS : steelN); toe.rotation.y = -Math.PI / 2; toe.position.x = L / 2; g.add(toe);
    bx(L - 0.4, 0.018, 0.1, sand, 0.1 * sz, CD + 0.03, sz * (W / 2 - 0.14));
    bx(0.7, 0.012, 0.16, sand, 0.7 * sz, CD + 0.006, sz * (W / 2 - 0.18));
  }

  // ---- end plates, bolts, rust and a sand wedge -----------------------------------
  for (const sx of [-1, 1]) {
    bx(0.02, CD + 0.06, W + 0.04, steelD, sx * (L / 2 + 0.01), (CD + 0.06) / 2, 0);
    for (const [y, z] of [[0.04, -0.45], [0.04, 0.45], [CD + 0.01, -0.45], [CD + 0.01, 0.45]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 6), gun); b.rotation.z = Math.PI / 2; b.position.set(sx * (L / 2 + 0.03), y, z); g.add(b);
      bx(0.004, 0.05, 0.03, rust, sx * (L / 2 + 0.023), Math.max(y - 0.045, 0.026), z);
    }
    bx(0.25, 0.06, W + 0.04, sand, sx * (L / 2 - 0.05), 0.03, 0);
  }

  // ---- rail: one tube per side, up the end posts and along the top, bent corners ---
  for (const sz of [-1, 1]) {
    const z = sz * (W / 2 - 0.035), mat = sz > 0 ? steelS : steelN;
    const x0 = -L / 2 + 0.06, x1 = L / 2 - 0.06, top = CD + RH, r = 0.09;
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V3(x0, CD, z), V3(x0, top - r, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x0, top - r, z), V3(x0, top, z), V3(x0 + r, top, z)));
    path.add(new THREE.LineCurve3(V3(x0 + r, top, z), V3(x1 - r, top, z)));
    path.add(new THREE.QuadraticBezierCurve3(V3(x1 - r, top, z), V3(x1, top, z), V3(x1, top - r, z)));
    path.add(new THREE.LineCurve3(V3(x1, top - r, z), V3(x1, CD, z)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.02, 7, false), mat));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, RH, 8), mat); mid.position.set(0, CD + RH / 2, z); g.add(mid);
    const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L - 0.12, 8), mat); midRail.rotation.z = Math.PI / 2; midRail.position.set(0, CD + RH * 0.55, z); g.add(midRail);
    for (const x of [x0, 0, x1]) {
      bx(0.1, 0.012, 0.08, steelD, x, CD + 0.006, z);
      bx(0.04, 0.06, 0.004, rust, x, CD - 0.04, sz * (W / 2 + 0.006));
    }
    bx(L - 0.3, 0.006, 0.02, sz > 0 ? M(tint(STEEL, 1.16), 'metal', 0.8, 0.3) : sand, 0, top + 0.02, z);
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
