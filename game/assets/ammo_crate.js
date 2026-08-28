// ammo_crate candidate 1: profiles. The body is the end profile (a rectangle with a pressed
// rib line) extruded along x, the lid is a profile with the rim lip and the two raised ribs
// built into it and extruded along x. Handles are half tori, latch and hinges are small parts.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, olive: 0x4e5238, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.8, metalness = 0.15, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  // extrude a (z, y) profile along x, centred
  const sweep = (pts, len, m) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m); o.rotation.y = Math.PI / 2; return o;
  };

  const W = 0.6, D = 0.35, H = 0.3, lidT = 0.03, bodyH = H - lidT;
  const oliveN = mat(C.olive, 'metal');
  const oliveS = mat(tint(C.olive, 1.08), 'metal');
  const oliveTop = mat(tint(C.olive, 1.04), 'metal');
  const oliveDark = mat(tint(C.olive, 0.8), 'metal');
  const gun = mat(C.gun, 'metal', 0.65, 0.5);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  // body profile: box outline with a pressed swage line at 0.1 on both faces
  const h = D / 2;
  sweep([[-h, 0], [h, 0], [h, 0.09], [h + 0.004, 0.095], [h + 0.004, 0.105], [h, 0.11], [h, bodyH],
    [-h, bodyH], [-h, 0.11], [-h - 0.004, 0.105], [-h - 0.004, 0.095], [-h, 0.09]], W, oliveN);
  box(W - 0.004, bodyH - 0.13, 0.004, oliveS, 0, bodyH / 2 + 0.06, h + 0.001);
  box(W - 0.004, 0.08, 0.004, oliveS, 0, 0.045, h + 0.001);
  // lid profile: 10 mm overhang, a rim lip, two raised ribs 8 mm high
  const l = h + 0.01, y0 = bodyH, y1 = H;
  sweep([[-l, y0], [l, y0], [l, y1], [l - 0.012, y1], [l - 0.012, y1 + 0.008], [l - 0.024, y1 + 0.008], [l - 0.024, y1],
    [0.07, y1], [0.07, y1 + 0.008], [0.05, y1 + 0.008], [0.05, y1], [-0.05, y1], [-0.05, y1 + 0.008], [-0.07, y1 + 0.008], [-0.07, y1],
    [-l + 0.024, y1], [-l + 0.024, y1 + 0.008], [-l + 0.012, y1 + 0.008], [-l + 0.012, y1], [-l, y1]], W + 0.02, oliveTop);
  // rim lip across the ends of the lid
  box(0.012, 0.008, D + 0.02, oliveDark, W / 2 + 0.004, H + 0.004, 0);
  box(0.012, 0.008, D + 0.02, oliveDark, -W / 2 - 0.004, H + 0.004, 0);
  box(0.16, 0.005, 0.09, dustM, -0.15, H + 0.0105, 0);
  box(0.16, 0.005, 0.09, dustM, 0.18, H + 0.0105, 0);
  // latch: hasp on the lid edge, staple and spring on the body
  box(0.04, 0.05, 0.006, oliveDark, 0, bodyH + 0.006, l + 0.003);
  box(0.05, 0.06, 0.006, gun, 0, bodyH - 0.035, h + 0.003);
  cyl(0.006, 0.006, 0.035, 8, gun, 0, bodyH - 0.02, h + 0.012);
  box(0.03, 0.02, 0.004, gun, 0, bodyH - 0.05, h + 0.014);
  // handles: pressed bracket and a wire loop, each end
  for (const s of [-1, 1]) {
    box(0.006, 0.05, 0.08, oliveDark, s * (W / 2 + 0.003), bodyH * 0.55, 0);
    const loop = add(new THREE.TorusGeometry(0.035, 0.005, 6, 10, Math.PI), gun, s * (W / 2 + 0.012), bodyH * 0.5, 0);
    loop.rotation.y = s * Math.PI / 2; loop.rotation.z = Math.PI;
    box(0.012, 0.012, 0.09, gun, s * (W / 2 + 0.009), bodyH * 0.53, 0);
    drip(0.06, 0.02, rustM, s * (W / 2 + 0.001), bodyH * 0.52 - 0.04, 0, s * Math.PI / 2);
  }
  // hinges at the back with rust
  for (const x of [-0.18, 0.18]) {
    cyl(0.009, 0.009, 0.07, 8, gun, x, bodyH + 0.002, -l + 0.002).rotation.z = Math.PI / 2;
    box(0.06, 0.04, 0.005, oliveDark, x, bodyH - 0.025, -h - 0.003);
    box(0.06, 0.008, 0.03, oliveDark, x, H - 0.005, -l + 0.01);
    box(0.02, 0.02, 0.008, rustM, x, bodyH - 0.008, -h - 0.005);
    drip(0.12, 0.04, rustM, x, bodyH - 0.02, -h - 0.004, Math.PI);
  }
  // name plate and rivets
  box(0.15, 0.08, 0.004, oliveDark, -0.12, 0.18, h + 0.004);
  for (const px of [-0.065, 0.065]) for (const py of [-0.03, 0.03]) cyl(0.004, 0.004, 0.004, 6, gun, -0.12 + px, 0.18 + py, h + 0.008).rotation.x = Math.PI / 2;
  // scuffs to gunmetal along the edges
  box(W + 0.02, 0.004, 0.004, gun, 0, H, l);
  box(0.004, bodyH, 0.004, gun, W / 2, bodyH / 2, h);
  box(0.004, bodyH, 0.004, gun, -W / 2, bodyH / 2, h);
  box(W, 0.004, 0.004, gun, 0, 0.002, h);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.012, 0); s.lineTo(0, 0.03); s.closePath();
  const fg = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); fg.translate(0, 0, -0.25);
  const f1 = add(fg, fill, 0, 0, h); f1.rotation.y = -Math.PI / 2;
  const fg2 = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); fg2.translate(0, 0, -0.15);
  add(fg2, fill, -W / 2, 0, 0).rotation.y = Math.PI;
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

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
