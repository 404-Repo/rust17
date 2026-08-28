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
  // locker_bank c2: different breakdown. Three separate welded locker units bolted side by side with visible joint seams,
  // each on its own channel foot; doors hinged on the left; the open door swings left; a padlock on one hasp.
  const UW = 0.4, D = 0.46, H = 1.8, T = 0.012, PL = 0.1;
  const GUN = mat(C.gun, 'metal', 0.7, 0.4);
  const PLATE = mat(C.galv, 'metal', 0.7, 0.45, 1.1);
  function unit(cx, openAngle, tintF, withHasp, padlock) {
    const u = new THREE.Group(); u.position.set(cx, 0, 0); g.add(u);
    const S = mat(C.cBlue, 'metal', 0.82, 0.2, tintF, { side: DS });
    const SS = mat(C.cBlue, 'metal', 0.8, 0.2, tintF * 1.13, { side: DS });
    const SN = mat(C.cBlue, 'metal', 0.84, 0.2, tintF * 0.9, { side: DS });
    const IN = mat(C.cBlue, 'metal', 0.86, 0.15, tintF * 0.8, { side: DS });
    const w = UW - 0.006;
    // foot channel (plinth), rusted
    box(w - 0.04, PL, D - 0.04, RUST(), 0, PL / 2, -0.01, u);
    // shell
    box(w, T, D, S, 0, H - T / 2, 0, u);
    box(w, H - PL - T, T, SN, 0, PL + (H - PL - T) / 2, -D / 2 + T / 2, u);
    for (const sx of [-1, 1]) box(T, H - PL - T, D, S, sx * (w / 2 - T / 2), PL + (H - PL - T) / 2, 0, u);
    box(w, 0.02, D - 0.02, IN, 0, PL + 0.01, 0, u);
    // front frame of the unit
    box(w, 0.05, T, SS, 0, H - 0.035, D / 2 - T / 2, u);
    box(w, 0.04, T, RUST(), 0, PL + 0.02, D / 2 - T / 2, u);
    for (const sx of [-1, 1]) box(0.025, H - PL, T, SS, sx * (w / 2 - 0.0125), PL + (H - PL) / 2, D / 2 - T / 2, u);
    // back: a pressed X stiffener and a bolt row along the top
    for (const s of [-1, 1]) { const b = box(0.03, 1.5, 0.006, SN, 0, PL + 0.8, -D / 2 - 0.003, u); b.rotation.z = s * 0.22; }
    for (const x of [-0.13, 0, 0.13]) bolt(x, H - 0.05, -D / 2 - 0.001, '-z', 0.008, x === 0 ? 0.2 : 0.1, u);
    for (const x of [-0.13, 0.13]) bolt(x, PL + 0.08, -D / 2 - 0.001, '-z', 0.008, 0, u);
    // top: raised lip rail and dust
    box(w, 0.015, 0.015, S, 0, H + 0.0075, D / 2 - 0.0075, u);
    dust(w, D - 0.02, 0, H, -0.01, 0.03, u);
    // interior shelves and rail
    for (const y of [0.42, 1.44]) { box(w - 0.03, T, D - 0.05, IN, 0, y, 0.01, u); dust(w - 0.03, D - 0.05, 0, y + T / 2, 0.01, 0.03, u); }
    const rail = cyl(0.008, 0.008, w - 0.03, 8, GUN, 0, 1.38, 0.05, u); rail.rotation.z = Math.PI / 2;
    box(0.02, 0.05, 0.02, GUN, 0.05, 1.7, -0.1, u); // coat hook under the top
    // door hinged on the LEFT edge; door extends toward +x from the hinge
    const d = new THREE.Group(); d.position.set(-w / 2 + 0.025, 0, D / 2); d.rotation.y = openAngle; u.add(d);
    const dw = w - 0.06, dh = H - PL - 0.1, dx = dw / 2 + 0.003, dy = PL + 0.06 + dh / 2;
    box(dw, dh, 0.016, SS, dx, dy, 0.008, d);
    // pressed panel line around the door
    const frame = [[dw - 0.03, 0.006, 0, dh / 2 - 0.02], [dw - 0.03, 0.006, 0, -dh / 2 + 0.02], [0.006, dh - 0.03, dw / 2 - 0.02, 0], [0.006, dh - 0.03, -dw / 2 + 0.02, 0]];
    for (const [fw, fh, ox, oy] of frame) box(fw, fh, 0.003, mat(C.cBlue, 'metal', 0.8, 0.2, tintF * 0.95), dx + ox, dy + oy, 0.0175, d);
    for (const sx of [-1, 1]) box(0.007, dh, 0.002, GUN, dx + sx * (dw / 2 - 0.0035), dy, 0.017, d);
    box(dw, 0.007, 0.002, GUN, dx, dy + dh / 2 - 0.0035, 0.017, d);
    box(dw - 0.01, 0.07, 0.002, RUST(), dx, PL + 0.1, 0.017, d);
    for (let i = 0; i < 3; i++) { const y = H - 0.19 - i * 0.04; box(0.2, 0.014, 0.01, mat(C.cBlue, 'metal', 0.8, 0.2, tintF * 1.22), dx, y, 0.02, d); box(0.2, 0.007, 0.002, GUN, dx, y - 0.012, 0.017, d); }
    streak(dx - 0.05, H - 0.28, 0.017, 'z', 0.1, 0.02, d);
    box(0.1, 0.05, 0.004, PLATE, dx, 1.36, 0.018, d);
    for (const bx of [-0.04, 0.04]) for (const by of [-0.018, 0.018]) bolt(dx + bx, 1.36 + by, 0.02, 'z', 0.004, 0, d);
    // handle on the free (right) edge at 1.0 m
    box(0.05, 0.11, 0.004, GUN, dx + dw / 2 - 0.06, 1.0, 0.016, d);
    box(0.016, 0.07, 0.012, mat(C.steel, 'metal', 0.6, 0.5), dx + dw / 2 - 0.06, 1.0, 0.022, d);
    streak(dx + dw / 2 - 0.06, 0.94, 0.017, 'z', 0.15, 0.03, d);
    if (withHasp) {
      box(0.03, 0.04, 0.008, GUN, dx + dw / 2 - 0.015, 1.0, 0.02, d);
      const r = mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 10), BOLT(), dx + dw / 2 - 0.005, 1.0, 0.024, d); r.rotation.y = Math.PI / 2;
      if (padlock) { box(0.035, 0.03, 0.014, mat(C.gun, 'metal', 0.6, 0.5, 1.1), dx + dw / 2 - 0.005, 0.965, 0.03, d); const sh = mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 10), BOLT(), dx + dw / 2 - 0.005, 0.99, 0.03, d); }
    }
    for (const y of [PL + 0.3, H - 0.3]) { cyl(0.009, 0.009, 0.07, 8, GUN, 0.0, y, 0.012, d); streak(0.0, y - 0.035, 0.02, 'z', 0.08, 0.016, d); }
    return u;
  }
  unit(-0.4, 0, 1.0, true, true);
  unit(0, -Math.PI * 0.917, 0.96, false, false);   // flung back against the next door, resting on its handle
  unit(0.4, 0, 1.04, true, false);
  // joint bolts and seam strips where units meet, front and back
  for (const x of [-0.2, 0.2]) {
    box(0.006, H - PL - 0.02, 0.004, GUN, x, PL + (H - PL) / 2, D / 2 + 0.0005);
    box(0.006, H - PL - 0.02, 0.004, GUN, x, PL + (H - PL) / 2, -D / 2 - 0.0005);
    for (const y of [PL + 0.3, 0.95, H - 0.2]) { bolt(x, y, D / 2 + 0.002, 'z', 0.007, 0.08); bolt(x, y, -D / 2 - 0.002, '-z', 0.007, 0.08); }
  }
  // side rivet rows on the outer units
  for (const sx of [-1, 1]) { const n = sx > 0 ? 'x' : '-x'; for (let i = 0; i < 6; i++) for (const z of [-0.2, 0.2]) bolt(sx * 0.6, PL + 0.15 + i * 0.28, z, n, 0.008, i % 2 ? 0.09 : 0); box(0.003, 0.004, D - 0.04, GUN, sx * 0.6, 0.95, 0); }
  fillet('front', 1.1, 0, D / 2 - 0.02, 0.035, 0.05, 0.04);
  fillet('left', D - 0.06, 0, -0.58, 0.05, 0.07, 0.05);
  fillet('right', D - 0.06, 0, 0.58, 0.05, 0.06, 0.05);
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
