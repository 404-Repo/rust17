// tyre_stack candidate 1, round 4 (second pass: shoulder lugs seated on the tube, a dished rim with a
// recessed bolt circle and rust ring, a wind shaped sand drift in place of the wrap band). Each tyre is a torus (major 0.39, tube 0.11, so the outside
// is 1.0 m and the opening 0.56 m) with a squashed section, twelve tread blocks as boxes, a bead
// ring, rims in the top two, rust, dust on the top tread, a sand mound.
// Round 4 fixes the shipped module, which did not render: tyre() takes a course index k as its
// eighth argument and every call passed seven, so k was undefined, a RingGeometry got NaN angles
// and the centring pass spread NaN into every part. Then adds valve stems on the rims, a rust
// ring round the bolt circle with a drip from the hub, one tread block torn out, and a rust bead
// line where the steel rim meets the rubber.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, tank: 0x9c988c, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.0, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };

  const SEG = 20, W = 0.22;
  const rubber = (f) => new THREE.MeshStandardMaterial({ color: tint(0x2a2a2a, f), roughness: 0.92, metalness: 0.0 });
  const dusted = new THREE.MeshStandardMaterial({ color: 0x5c5546, roughness: 0.95, metalness: 0.0 });
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const rimM = mat(tint(C.tank, 1.08), 'metal', 0.8, 0.3, THREE.DoubleSide);   // a shade lighter: the dish sits in the sidewall's shadow
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const gun = mat(C.gun, 'metal', 0.7, 0.4);

  const torGeo = new THREE.TorusGeometry(0.385, 0.115, 8, SEG);
  const TS = W / 0.23;                                   // vertical squash of the tube section
  // the outer surface of the squashed tube at height dy from the tread centre: radius and outward normal
  const surf = (dy) => {
    const sn = Math.min(0.999, Math.abs(dy) / (0.115 * TS)), cs = Math.sqrt(1 - sn * sn);
    const nr = cs, ny = (Math.sign(dy) * sn) / TS, l = Math.hypot(nr, ny);
    return { r: 0.385 + 0.115 * cs, nr: nr / l, ny: ny / l };
  };
  const blockGeo = new THREE.BoxGeometry(0.1, 0.12, 0.024);
  const lugGeo = new THREE.BoxGeometry(0.03, 0.05, 0.07);   // x thickness along the surface normal, y up the shoulder, z round the tyre
  const crust = (f) => new THREE.MeshStandardMaterial({ color: tint(0x6a5c48, f), roughness: 0.96, metalness: 0.0, side: THREE.DoubleSide });   // dried mud on the tread, unnamed like the rubber
  const tyre = (x, y, z, rx, shade, rim, dustTop, k) => {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.x = rx; g.add(t);
    const body = add(torGeo, rubber(shade), 0, W / 2, 0, t); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, TS);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (k === 2 && i === 4) {
        // a block torn out of the tread: the cords showing as a rough darker patch
        const torn = add(new THREE.BoxGeometry(0.08, 0.1, 0.006), rubber(shade * 0.6), Math.cos(a) * 0.478, W / 2, Math.sin(a) * 0.478, t); torn.rotation.y = Math.PI / 2 - a;
      } else {
        const b = add(blockGeo, i % 3 === 0 ? dusted : rubber(shade * 1.1), Math.cos(a) * 0.488, W / 2, Math.sin(a) * 0.488, t);
        b.rotation.y = Math.PI / 2 - a;
      }
      // second staggered row of smaller shoulder lugs above and below the main blocks, each SEATED on
      // the squashed tube: placed at the local surface radius for its height and tilted along the
      // surface normal there, so nothing stands clear of the silhouette
      const a2 = a + Math.PI / 12;
      for (const dy of [-0.075, 0.075]) {
        const sf = surf(dy);
        const gr = new THREE.Group(); gr.position.set(0, W / 2 + dy, 0); gr.rotation.y = -a2; t.add(gr);
        const b2 = add(lugGeo, (i + k) % 4 === 1 ? dusted : rubber(shade * (dy > 0 ? 1.15 : 0.9)), sf.r + sf.nr * 0.005, sf.ny * 0.005, 0, gr);
        b2.rotation.z = Math.atan2(sf.ny, sf.nr);
      }
    }
    // circumferential groove round the tread centre: a dark thin ring proud of the crown between the blocks
    add(new THREE.TorusGeometry(0.497, 0.008, 4, SEG), rubber(shade * 0.55), 0, W / 2, 0, t).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.30, 0.012, 5, SEG), rubber(shade * 0.85), 0, W - 0.01, 0, t).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.30, 0.012, 5, SEG), rubber(shade * 0.85), 0, 0.01, 0, t).rotation.x = Math.PI / 2;
    // raised sidewall lettering ring on the top face (the face the stack offset exposes as a crescent)
    add(new THREE.TorusGeometry(0.40, 0.006, 4, SEG), rubber(shade * 1.25), 0, W - 0.004, 0, t).rotation.x = Math.PI / 2;
    // dried mud crust on the windward third of the tread on the second and third tyres
    if (k === 1 || k === 2) {
      const cr = add(new THREE.CylinderGeometry(0.506, 0.506, 0.09, 7, 1, true, 1.9 + k * 0.5, 1.5), crust(k === 1 ? 0.15 : 0.35), 0, W / 2 - 0.03, 0, t);
      cr.material.side = THREE.DoubleSide;
    }
    if (dustTop) {
      // dust drifted across the top sidewall on the windward side, not a full ring
      add(new THREE.RingGeometry(0.32, 0.45, 12, 1, Math.PI * 0.55, Math.PI * 1.1), dustM, 0, W + 0.002, 0, t).rotation.x = -Math.PI / 2;
      add(new THREE.RingGeometry(0.34, 0.42, 6, 1, Math.PI * 1.85, Math.PI * 0.45), dustM, 0, W + 0.002, 0, t).rotation.x = -Math.PI / 2;
    } else {
      // every lower tyre shows a crescent of its top sidewall past the offset of the one above: sand settles there
      add(new THREE.RingGeometry(0.40, 0.49, 7, 1, Math.PI * (0.9 + 0.35 * k), Math.PI * 0.55), dustM, 0, W + 0.002, 0, t).rotation.x = -Math.PI / 2;
    }
    if (rim) {
      // dished steel rim as in the concept: a flat outer flange over the bead, a dish sloping in and
      // down to a hub face recessed 18 mm (the sun is 22 degrees up and the sidewall shadows anything deeper), a centre bore, eight nuts on a bolt circle in a rust halo,
      // four hand holes in the dish, a rust ring where the dish meets the flange, a valve stem
      const top = W * 0.45 + 0.025;
      // profile runs outer to inner so the lathe's face normals point UP on the hub face and the dish
      // (checked: reversed they point down and the weather pass paints the dish as an underside)
      const rimGeo = new THREE.LatheGeometry([[0.27, top - 0.03], [0.285, top - 0.03], [0.285, top], [0.235, top - 0.004], [0.19, top - 0.018], [0.05, top - 0.018], [0.05, top - 0.05]].map((p) => new THREE.Vector2(p[0], p[1])), SEG);
      add(rimGeo, rimM, 0, 0, 0, t);
      const hub = top - 0.018;
      add(new THREE.TorusGeometry(0.115, 0.016, 4, 16), rustM, 0, hub + 0.001, 0, t).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        cyl(0.014, 0.014, 0.02, 6, gun, Math.cos(a) * 0.115, hub + 0.01, Math.sin(a) * 0.115, t);
        cyl(0.02, 0.02, 0.003, 8, rubber(0.8), Math.cos(a) * 0.115, hub + 0.001, Math.sin(a) * 0.115, t);
      }
      cyl(0.052, 0.052, 0.006, 12, rustM, 0, hub - 0.02, 0, t);                       // rust in the bore
      add(new THREE.TorusGeometry(0.233, 0.006, 4, SEG), rustM, 0, top - 0.004, 0, t).rotation.x = Math.PI / 2;
      add(new THREE.TorusGeometry(0.283, 0.006, 4, SEG), rustM, 0, top + 0.001, 0, t).rotation.x = Math.PI / 2;   // bead line where steel meets rubber
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const hg = new THREE.Group(); hg.position.set(0, hub + 0.007, 0); hg.rotation.y = -a; t.add(hg);
        const hole = add(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 8), rubber(0.6), 0.212, 0, 0, hg); hole.rotation.z = 1.27;
      }
      // valve stem through the flange, bent over, with its cap
      const vs = cyl(0.005, 0.005, 0.045, 6, gun, 0.245, top + 0.015, 0.06, t); vs.rotation.z = 0.5;
      cyl(0.007, 0.007, 0.01, 6, gun, 0.256, top + 0.035, 0.06, t).rotation.z = 0.5;
      // rust run from a nut across the hub face and one down the dish
      const hd = drip(0.055, 0.02, rustM, 0.11, hub + 0.002, 0.03, 0, t); hd.rotation.x = -Math.PI / 2; hd.rotation.z = 0.6;
      const dd = drip(0.06, 0.025, rustM, 0.19, top - 0.01, -0.07, 0, t); dd.rotation.y = Math.PI / 2 + 0.35; dd.rotation.x = -0.75;
    }
    return t;
  };
  tyre(0.0, 0.0, 0.0, 0, 0.9, false, false, 0);
  tyre(0.05, W, 0.03, 0, 1.0, false, false, 1);
  tyre(-0.02, 2 * W, -0.04, 0, 0.95, false, false, 2);
  tyre(0.04, 3 * W, 0.02, 0, 1.05, true, false, 3);
  tyre(-0.03, 4 * W + 0.06, -0.01, 0.14, 1.0, true, true, 4);
  drip(0.16, 0.05, rustM, 0.04, 3 * W - 0.01, 0.5 + 0.026, 0);
  drip(0.12, 0.04, rustM, 0.2, 3 * W - 0.01, 0.48, 0.4);
  drip(0.14, 0.05, rustM, -0.1, 2 * W + 0.02, 0.466, -0.2);
  drip(0.1, 0.04, rustM, 0.545, 2 * W + 0.04, 0.05, Math.PI / 2);
  // sand drifted against the bottom tyre: one closed sweep whose reach and height follow the wind, so it
  // climbs 0.16 m up the tread on the windward side (back left) and is still a fillet past the bulge on the lee, and
  // meets the tread on every side with no cut edge and no wrap band
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  const prof = [[0.36, 0.17], [0.44, 0.16], [0.52, 0.10], [0.57, 0.04], [0.60, 0.0]];
  const N = 36, spos = [];
  const SP = (i, j) => {
    const a = (i / N) * Math.PI * 2, f = 0.7 + 0.3 * Math.pow(0.5 + 0.5 * Math.cos(a - Math.PI * 1.25), 1.6);
    const r = 0.36 + (prof[j][0] - 0.36) * f, yy = prof[j][1] * (0.35 + 0.65 * f);
    return [Math.cos(a) * r, yy, Math.sin(a) * r];
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < prof.length - 1; j++) { const p0 = SP(i, j), p1 = SP(i + 1, j), p2 = SP(i + 1, j + 1), p3 = SP(i, j + 1); spos.push(...p0, ...p3, ...p2, ...p0, ...p2, ...p1); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sgeo.computeVertexNormals();
  add(sgeo, fill, 0, 0, 0);
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
    const pp = n.isMesh && n.geometry.attributes.position; if (!pp) return;
    const put = (mm) => { for (let i = 0; i < pp.count; i++) box3.expandByPoint(v.fromBufferAttribute(pp, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
