export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandSun: 0xcdb88e, sandPack: 0xa89372, rockPale: 0xc4b393, concB: 0xb8ae9b, concS: 0x857c6c,
    redox: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tankB: 0x9c988c, cBlue: 0x2f4d66,
    cRed: 0x9c4a3c, timber: 0xa07a4f, olive: 0x4e5238, khaki: 0x7a6a4c, sandbag: 0xb0a07c, gun: 0x3a3d40,
    rubber: 0x1d1e20, yellow: 0xc9a227, lamp: 0xffd9a0 };
  const DS = THREE.DoubleSide;
  const _mats = {};
  // mat(hex, recipe name, roughness, metalness, tint factor, extra props)
  function mat(hex, name, rough, metal, f, extra) {
    f = f || 1;
    const key = hex + '|' + name + '|' + rough + '|' + metal + '|' + f + '|' + JSON.stringify(extra || {});
    if (_mats[key]) return _mats[key];
    const col = new THREE.Color(hex).multiplyScalar(f);
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: rough, metalness: metal }, extra || {}));
    if (name) m.name = name;
    _mats[key] = m; return m;
  }
  function mesh(geo, m, x, y, z, parent) { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); (parent || g).add(o); return o; }
  function box(w, h, d, m, x, y, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent); }
  function cyl(rt, rb, h, seg, m, x, y, z, parent, open) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), m, x, y, z, parent); }
  function dirVec(n) { const v = new THREE.Vector3(); if (n === 'x') v.x = 1; else if (n === '-x') v.x = -1; else if (n === 'y') v.y = 1; else if (n === '-y') v.y = -1; else if (n === 'z') v.z = 1; else v.z = -1; return v; }
  // rotate o so its local +Y points along n
  function aim(o, n) { if (n === 'z') o.rotation.x = Math.PI / 2; else if (n === '-z') o.rotation.x = -Math.PI / 2; else if (n === 'x') o.rotation.z = -Math.PI / 2; else if (n === '-x') o.rotation.z = Math.PI / 2; else if (n === '-y') o.rotation.x = Math.PI; return o; }
  const RUST = () => mat(C.rust, 'metal', 0.92, 0.1);
  const DUST = () => mat(C.sandSun, 'ground', 0.95, 0);
  const BOLT = () => mat(C.steel, 'metal', 0.7, 0.5);
  // rust streak: a thin tapered plate hanging down a vertical face whose normal is n; (x,y,z) is its top on the face
  function streak(x, y, z, n, len, w, parent) {
    len = len || 0.12; w = w || 0.02;
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false }), RUST());
    if (n === '-z') o.rotation.y = Math.PI; else if (n === 'x') o.rotation.y = Math.PI / 2; else if (n === '-x') o.rotation.y = -Math.PI / 2;
    const d = dirVec(n).multiplyScalar(0.0006);
    o.position.set(x + d.x, y, z + d.z); (parent || g).add(o); return o;
  }
  // hex bolt head sitting proud of a face with normal n, with an optional rust streak below it
  function bolt(x, y, z, n, r, streakLen, parent) {
    r = r || 0.012; const h = 0.009;
    const o = cyl(r, r, h, 6, BOLT(), 0, 0, 0, parent); aim(o, n);
    const d = dirVec(n).multiplyScalar(h * 0.4); o.position.set(x + d.x, y + d.y, z + d.z);
    if (streakLen) streak(x, y - r, z, n, streakLen, r * 1.6, parent);
    return o;
  }
  // dust cap: thin sand slab on an up facing surface, inset from its edge
  function dust(w, d, x, yTop, z, inset, parent) { inset = inset === undefined ? 0.04 : inset; return box(Math.max(0.01, w - 2 * inset), 0.008, Math.max(0.01, d - 2 * inset), DUST(), x, yTop + 0.004, z, parent); }
  // sand fillet: a drift against one side of the object. side: front|back|left|right, faceAt = coordinate of that face
  function fillet(side, len, c, faceAt, out, hi, inw) {
    out = out || 0.08; hi = hi || 0.16; inw = inw === undefined ? 0.12 : inw;
    const s = new THREE.Shape(); s.moveTo(-inw, 0); s.lineTo(out, 0); s.lineTo(out * 0.55, hi * 0.3); s.lineTo(0, hi * 0.7); s.lineTo(-inw, hi); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    if (side === 'front') { geo.rotateY(-Math.PI / 2); geo.translate(c + len / 2, 0, faceAt); }
    else if (side === 'back') { geo.rotateY(Math.PI / 2); geo.translate(c - len / 2, 0, faceAt); }
    else if (side === 'right') { geo.translate(faceAt, 0, c - len / 2); }
    else { geo.rotateY(Math.PI); geo.translate(faceAt, 0, c + len / 2); }
    return mesh(geo, DUST(), 0, 0, 0);
  }
  // sand mound around a foot
  function mound(x, z, r, h) { return cyl(r * 0.2, r, h, 8, DUST(), x, h / 2, z); }
  // bunk_bed c2: different reading. C channel side rails (three boxes), expanded metal base of diagonal bars, hoop guard
  // rails, mattress with a sag, blanket as a three layer stack, bedding mirrored between tiers as in the reference.
  const L = 1.94, W = 0.84, H = 1.7, P = 0.045;
  const px = L / 2 - P / 2, pz = W / 2 - P / 2;
  const FRAME = mat(C.tankB, 'metal', 0.82, 0.22, 0.95);
  const FRAME_S = mat(C.tankB, 'metal', 0.8, 0.22, 1.09);
  const FRAME_N = mat(C.tankB, 'metal', 0.84, 0.22, 0.9);
  const MESH = mat(C.galv, 'metal', 0.78, 0.5, 0.88);
  const MATT = mat(C.khaki, 'fabric', 0.92, 0, 1.04);
  const MATT2 = mat(C.khaki, 'fabric', 0.92, 0, 0.9);
  const BLANKET = mat(C.olive, 'fabric', 0.93, 0);
  const PILLOW = mat(C.sandbag, 'fabric', 0.9, 0, 1.02);
  const LEATHER = mat(C.rust, 'fabric', 0.85, 0, 1.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(P, H, P, FRAME, sx * px, H / 2, sz * pz);
    box(P + 0.02, 0.01, P + 0.02, RUST(), sx * px, 0.005, sz * pz);  // rusted foot
    box(P + 0.008, 0.02, P + 0.008, mat(C.tankB, 'metal', 0.8, 0.22, 0.85), sx * px, H - 0.01, sz * pz); // cap
    mound(sx * px, sz * pz, 0.07, 0.04);
  }
  function channel(len, h, fl, t, m, x, y, z, along, flangeDir) {
    // C channel: web vertical, flanges pointing inward (flangeDir on the axis perpendicular to along)
    const grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    if (along === 'x') {
      box(len, h, t, m, 0, 0, 0, grp);
      box(len, t, fl, m, 0, h / 2 - t / 2, flangeDir * fl / 2, grp);
      box(len, t, fl, m, 0, -h / 2 + t / 2, flangeDir * fl / 2, grp);
    } else {
      box(t, h, len, m, 0, 0, 0, grp);
      box(fl, t, len, m, flangeDir * fl / 2, h / 2 - t / 2, 0, grp);
      box(fl, t, len, m, flangeDir * fl / 2, -h / 2 + t / 2, 0, grp);
    }
    return grp;
  }
  function tier(yT, blanketX, pillowX) {
    const h = 0.06, t = 0.006, fl = 0.04;
    const innerX = px - P / 2, innerZ = pz - P / 2;
    for (const sz of [-1, 1]) channel(innerX * 2, h, fl, t, sz > 0 ? FRAME_S : FRAME_N, 0, yT - h / 2, sz * (innerZ + t / 2), 'x', -sz);
    for (const sx of [-1, 1]) channel(innerZ * 2, h, fl, t, FRAME, sx * (innerX + t / 2), yT - h / 2, 0, 'z', -sx);
    // riveted corner plates
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const zf = sz * (innerZ + t + 0.003);
      box(0.12, h + 0.02, 0.006, mat(C.tankB, 'metal', 0.8, 0.22, 0.88), sx * (innerX - 0.07), yT - h / 2, zf);
      for (const dx of [-0.035, 0.035]) for (const dy of [-0.018, 0.018]) bolt(sx * (innerX - 0.07) + dx, yT - h / 2 + dy, zf + sz * 0.003, sz > 0 ? 'z' : '-z', 0.008, dy < 0 ? 0.1 : 0);
      streak(sx * (innerX - 0.07), yT - h - 0.01, zf + sz * 0.003, sz > 0 ? 'z' : '-z', 0.18, 0.05);
    }
    // expanded metal base: diagonal bars both ways
    const yM = yT - h + t + 0.004, sw = innerX * 2 - 0.02, sd = innerZ * 2 - 0.02;
    const pitch = 0.16;
    for (const s of [-1, 1]) for (let x = -sw / 2 - sd; x < sw / 2 + sd; x += pitch) {
      // clip bars to the rectangle: build as a sequence of short segments inside the rect
      for (let z = -sd / 2; z < sd / 2 - 0.001; z += 0.08) {
        const xa = x + s * (z + sd / 2), xb = x + s * (z + 0.08 + sd / 2);
        const cx = (xa + xb) / 2, cz = z + 0.04;
        if (cx < -sw / 2 + 0.02 || cx > sw / 2 - 0.02) continue;
        const bar = box(0.004, 0.005, 0.08 * Math.SQRT2, MESH, cx, yM, cz); bar.rotation.y = -s * Math.PI / 4;
      }
    }
    // mattress with a sag in the middle: three slabs, centre lower
    const mw = innerX * 2 - 0.05, md = innerZ * 2 - 0.05, mh = 0.12;
    box(mw, mh, md, MATT2, 0, yM + 0.004 + mh / 2, 0);
    box(mw - 0.02, 0.012, md - 0.02, MATT, 0, yM + 0.004 + mh + 0.006, 0);
    box(mw * 0.5, 0.006, md * 0.8, mat(C.khaki, 'fabric', 0.95, 0, 0.82), 0, yM + 0.004 + mh + 0.014, 0); // worn hollow
    for (const s of [-1, 1]) box(mw + 0.004, 0.006, 0.006, mat(C.khaki, 'fabric', 0.95, 0, 0.8), 0, yM + 0.004 + mh - 0.02, s * md / 2); // piping
    dust(mw, md, 0, yM + 0.004 + mh + 0.018, 0, 0.06);
    const yB = yM + 0.004 + mh + 0.02;
    // blanket: three folded layers, stepped
    box(0.5, 0.03, 0.66, BLANKET, blanketX, yB + 0.015, 0);
    box(0.48, 0.03, 0.62, mat(C.olive, 'fabric', 0.93, 0, 1.06), blanketX + 0.01, yB + 0.045, 0.01);
    box(0.44, 0.03, 0.56, mat(C.olive, 'fabric', 0.93, 0, 1.12), blanketX + 0.03, yB + 0.075, 0.02);
    dust(0.44, 0.56, blanketX + 0.03, yB + 0.09, 0.02, 0.04);
    // pillow: flattened cylinder plus a fold
    const pil = cyl(0.09, 0.09, 0.48, 10, PILLOW, pillowX, yB + 0.07, 0); pil.rotation.x = Math.PI / 2; pil.scale.y = 0.75;
    const flap = box(0.12, 0.02, 0.44, mat(C.sandbag, 'fabric', 0.9, 0, 0.92), pillowX - 0.07, yB + 0.09, 0); flap.rotation.z = 0.5;
  }
  tier(0.35, -0.64, 0.7);
  tier(1.25, 0.7, -0.64);   // upper tier bedding mirrored, as in the reference
  // guard rail: hoops of bent tube on the open side
  const TUBE = mat(C.tankB, 'metal', 0.78, 0.3, 1.05);
  const railZ = pz + 0.022;
  function hoop(x0, x1, y0, y1, z, r) {
    const a = cyl(r, r, y1 - y0, 8, TUBE, x0, (y0 + y1) / 2, z);
    const b = cyl(r, r, y1 - y0, 8, TUBE, x1, (y0 + y1) / 2, z);
    const c = cyl(r, r, x1 - x0, 8, TUBE, (x0 + x1) / 2, y1, z); c.rotation.z = Math.PI / 2;
    for (const x of [x0, x1]) { box(0.05, 0.06, 0.006, RUST(), x, y0 + 0.03, z + 0.004); bolt(x, y0 + 0.03, z + 0.01, 'z', 0.01, 0.1); }
  }
  hoop(-0.22, 0.28, 1.26, 1.62, railZ, 0.013);
  hoop(0.34, px - 0.03, 1.26, 1.62, railZ, 0.013);
  const midRail = cyl(0.011, 0.011, px - 0.03 + 0.22, 8, TUBE, (px - 0.03 - 0.22) / 2, 1.44, railZ); midRail.rotation.z = Math.PI / 2;
  hoop(0.38, 0.9, 0.36, 0.62, -railZ, 0.011);   // lower head rail, back side
  for (const x of [0.51, 0.64, 0.77]) cyl(0.008, 0.008, 0.24, 6, TUBE, x, 0.49, -railZ);
  // ladder at the foot end, stiles bolted to the end posts
  for (const sz of [-1, 1]) { box(0.03, 0.9, 0.035, FRAME, -px - 0.032, 0.92, sz * 0.28); }
  for (const y of [0.62, 0.87, 1.12]) { const r = box(0.03, 0.03, 0.56, FRAME, -px - 0.032, y, 0); }
  for (const y of [0.52, 1.32]) for (const sz of [-1, 1]) { const br = box(0.03, 0.04, 0.12, RUST(), -px - 0.02, y, sz * 0.32); bolt(-px - 0.036, y, sz * 0.32, '-x', 0.009, 0.07); }
  // back X brace between tiers
  for (const s of [-1, 1]) { const b = box(0.035, 1.02, 0.005, FRAME_N, -0.45, 0.8, -(pz + 0.026)); b.rotation.z = s * 0.6; }
  box(0.09, 0.09, 0.006, RUST(), -0.45, 0.8, -(pz + 0.03)); bolt(-0.45, 0.8, -(pz + 0.033), '-z', 0.012, 0.16);
  // boots
  function boot(x, z, rot) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = rot; g.add(b);
    box(0.3, 0.03, 0.11, mat(C.rubber, '', 0.9, 0), 0, 0.015, 0, b);
    box(0.26, 0.08, 0.1, LEATHER, -0.01, 0.07, 0, b);
    box(0.12, 0.04, 0.1, LEATHER, 0.08, 0.05, 0, b); // toe cap
    cyl(0.05, 0.052, 0.12, 10, LEATHER, -0.08, 0.17, 0, b);
    for (let i = 0; i < 4; i++) box(0.005, 0.01, 0.07, mat(C.sandbag, 'fabric', 0.9, 0, 0.8), -0.04 + i * 0.012, 0.115 + i * 0.012, 0, b); // laces
  }
  boot(0.08, 0.2, 0.3); boot(0.26, 0.24, 0.0);
  fillet('left', W, 0, -px - P / 2 - 0.04, 0.05, 0.09, 0.1);
  fillet('right', W, 0, px + P / 2, 0.07, 0.08, 0.1);
  // contract: measure vertices, base at y=0, centred on x and z
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
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mx) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mx)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
