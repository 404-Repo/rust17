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
  // mess_table c1: profile built. A frames as one extruded shape each (triangle with a triangular hole), planks with worn
  // corner profiles, lathe mugs and canteen, radio front as a slotted plate, hinge plates from shapes.
  const TL = 2.34, TW = 0.79, TH = 0.74, PT = 0.04;
  const OLIVE = mat(C.olive, 'metal', 0.85, 0.2, 1.25, { side: DS });
  const OLIVE_D = mat(C.olive, 'metal', 0.87, 0.2, 1.1, { side: DS });
  const GUN = mat(C.gun, 'metal', 0.7, 0.45);
  // plank cross section with worn top corners, extruded along its length
  function plankGeo(len, w, t) {
    const c = 0.008, s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, t - c); s.lineTo(w / 2 - c, t); s.lineTo(-w / 2 + c, t); s.lineTo(-w / 2, t - c); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-len / 2, 0, 0); return geo;
  }
  function plank(len, w, x, yTop, z, f) {
    mesh(plankGeo(len, w, PT - 0.012), mat(C.timber, 'timber', 0.88, 0, f), x, yTop - PT + 0.012, z);
    box(len, 0.012, w, mat(C.timber, 'timber', 0.9, 0, 0.78), x, yTop - PT + 0.006, z);
    dust(len, w, x, yTop, z, 0.03);
  }
  for (let i = 0; i < 5; i++) {
    const z = -TW / 2 + 0.075 + i * 0.16;
    plank(TL, 0.15, 0, TH, z, 1.06 + (i % 2) * 0.08);
    for (const x of [-0.75, 0.75]) { bolt(x, TH + 0.0005, z, 'y', 0.005, 0); box(0.014, 0.002, 0.03, RUST(), x, TH + 0.001, z + 0.02); }
  }
  for (const x of [-0.75, 0.75]) box(0.06, 0.045, TW - 0.02, mat(C.timber, 'timber', 0.9, 0, 0.85), x, TH - PT - 0.0225, 0);
  // A frame as one shape: outer triangle minus inner triangle, plus a cross bar, extruded 0.008 in x
  function aFrame(x, yTop, zApex, zSpread, bar, crossY, m) {
    const h = yTop - 0.01;
    const s = new THREE.Shape();
    s.moveTo(-zSpread - bar, 0); s.lineTo(zSpread + bar, 0); s.lineTo(zApex + bar * 0.6, h); s.lineTo(-zApex - bar * 0.6, h); s.closePath();
    const hole = new THREE.Path(); const k = bar * 1.3;
    hole.moveTo(-zSpread + k, 0.02); hole.lineTo(-zApex + k * 0.5, h - 0.03); hole.lineTo(zApex - k * 0.5, h - 0.03); hole.lineTo(zSpread - k, 0.02); hole.closePath();
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false }); geo.rotateY(Math.PI / 2);
    mesh(geo, m, x, 0, 0);
    // cross bar and hinge plate
    const zc = zApex + (zSpread - zApex) * (1 - crossY / h);
    box(bar, 0.006, zc * 2, m, x, crossY, 0);
    const hp = new THREE.Shape(); hp.moveTo(-0.03, 0); hp.lineTo(0.03, 0); hp.lineTo(0.03, 0.05); hp.lineTo(0, 0.07); hp.lineTo(-0.03, 0.05); hp.closePath();
    const hg = new THREE.ExtrudeGeometry(hp, { depth: bar + 0.03, bevelEnabled: false }); hg.rotateY(Math.PI / 2);
    mesh(hg, RUST(), x - (bar + 0.03) / 2, yTop - 0.08, 0);
    bolt(x + bar / 2 + 0.016, yTop - 0.045, 0, 'x', 0.007, 0.1); bolt(x - bar / 2 - 0.016, yTop - 0.045, 0, '-x', 0.007, 0.1);
    for (const t of [-1, 1]) { box(bar + 0.02, 0.01, 0.05, RUST(), x, 0.005, t * zSpread); mound(x, t * zSpread, 0.05, 0.03); }
  }
  aFrame(-0.75, TH - PT, 0.08, 0.36, 0.04, 0.3, OLIVE);
  aFrame(0.75, TH - PT, 0.08, 0.36, 0.04, 0.3, OLIVE_D);
  box(1.5, 0.03, 0.006, OLIVE, 0, 0.3, 0);
  for (const x of [-0.72, 0.72]) bolt(x, 0.3, 0.0035, 'z', 0.006, 0.05);
  for (const s of [-1, 1]) {
    const zc = s * 0.555;
    for (const dz of [-0.065, 0.065]) plank(2.2, 0.115, 0, 0.45, zc + dz, dz < 0 ? 1.0 : 1.12);
    for (const x of [-0.7, 0.7]) {
      const h = 0.41;
      const sh = new THREE.Shape(); sh.moveTo(-0.11 - 0.03, 0); sh.lineTo(0.11 + 0.03, 0); sh.lineTo(0.05 + 0.02, h); sh.lineTo(-0.05 - 0.02, h); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(-0.11 + 0.04, 0.02); hole.lineTo(-0.05 + 0.015, h - 0.025); hole.lineTo(0.05 - 0.015, h - 0.025); hole.lineTo(0.11 - 0.04, 0.02); hole.closePath(); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }); geo.rotateY(Math.PI / 2);
      mesh(geo, s > 0 ? OLIVE : OLIVE_D, x, 0, zc);
      box(0.035, 0.006, 0.24, OLIVE, x, 0.18, zc);
      box(0.06, 0.05, 0.025, RUST(), x, 0.39, zc); bolt(x + 0.031, 0.39, zc, 'x', 0.006, 0.08);
      for (const t of [-1, 1]) { box(0.05, 0.01, 0.04, RUST(), x, 0.005, zc + t * 0.11); mound(x, zc + t * 0.11, 0.045, 0.025); }
    }
    box(1.3, 0.025, 0.006, OLIVE, 0, 0.18, zc);
  }
  // items
  const yT = TH + 0.006;
  const tin = new THREE.Shape(); tin.moveTo(-0.085, -0.055); tin.lineTo(0.085, -0.055); tin.lineTo(0.085, 0.055); tin.lineTo(-0.085, 0.055); tin.closePath();
  const tinHole = new THREE.Path(); tinHole.moveTo(-0.075, -0.045); tinHole.lineTo(-0.075, 0.045); tinHole.lineTo(0.075, 0.045); tinHole.lineTo(0.075, -0.045); tinHole.closePath(); tin.holes.push(tinHole);
  const tg = new THREE.ExtrudeGeometry(tin, { depth: 0.05, bevelEnabled: false }); tg.rotateX(-Math.PI / 2);
  mesh(tg, mat(C.galv, 'metal', 0.65, 0.55, 1.02, { side: DS }), -0.6, yT, -0.1);
  box(0.15, 0.004, 0.09, mat(C.galv, 'metal', 0.65, 0.55, 0.9), -0.6, yT + 0.004, -0.1);
  const mugPts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.038, 0), new THREE.Vector2(0.04, 0.07), new THREE.Vector2(0.044, 0.08), new THREE.Vector2(0.036, 0.08), new THREE.Vector2(0.034, 0.005), new THREE.Vector2(0.001, 0.005)];
  for (const [x, z] of [[-0.3, 0.1], [0.1, -0.2]]) { mesh(new THREE.LatheGeometry(mugPts, 10), mat(C.cBlue, 'metal', 0.6, 0.1, 1.3, { side: DS }), x, yT, z); mesh(new THREE.TorusGeometry(0.02, 0.005, 5, 8), mat(C.cBlue, 'metal', 0.6, 0.1, 1.3), x + 0.045, yT + 0.045, z); }
  const canGeo = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0.06, 0.03), new THREE.Vector2(0.06, 0.15), new THREE.Vector2(0.035, 0.19), new THREE.Vector2(0.02, 0.2), new THREE.Vector2(0.02, 0.22), new THREE.Vector2(0.001, 0.22)], 12);
  canGeo.scale(1, 1, 0.65); canGeo.rotateZ(-Math.PI / 2);
  mesh(canGeo, mat(C.olive, 'metal', 0.8, 0.2, 1.15), 0.2, yT + 0.03, 0.15);
  box(0.3, 0.03, 0.22, mat(C.sandbag, 'fabric', 0.9, 0, 1.1), 0.7, yT + 0.015, -0.05);
  box(0.28, 0.006, 0.2, mat(C.sandbag, 'fabric', 0.9, 0, 0.95), 0.7, yT + 0.033, -0.05);
  // radio: body plus slotted grille plate
  box(0.2, 0.07, 0.12, mat(C.olive, 'metal', 0.8, 0.2, 1.3), 0.85, yT + 0.035, 0.22);
  const gr = new THREE.Shape(); gr.moveTo(-0.055, -0.025); gr.lineTo(0.055, -0.025); gr.lineTo(0.055, 0.025); gr.lineTo(-0.055, 0.025); gr.closePath();
  for (let i = 0; i < 4; i++) { const y = -0.018 + i * 0.012; const h = new THREE.Path(); h.moveTo(-0.045, y - 0.003); h.lineTo(-0.045, y + 0.003); h.lineTo(0.045, y + 0.003); h.lineTo(0.045, y - 0.003); h.closePath(); gr.holes.push(h); }
  mesh(new THREE.ExtrudeGeometry(gr, { depth: 0.004, bevelEnabled: false }), mat(C.sandbag, 'metal', 0.7, 0.3), 0.81, yT + 0.035, 0.28);
  for (const dx of [0.06, 0.085]) { const k = cyl(0.01, 0.01, 0.01, 8, GUN, 0.85 + dx, yT + 0.035, 0.285); k.rotation.x = Math.PI / 2; }
  { const ae = cyl(0.003, 0.003, 0.18, 5, GUN, 0.85, yT + 0.075, 0.17); ae.rotation.z = Math.PI / 2; }
  fillet('left', TW + 0.1, 0, -TL / 2, 0.04, 0.05, 0.05);
  fillet('right', TW + 0.1, 0, TL / 2, 0.04, 0.05, 0.05);
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
