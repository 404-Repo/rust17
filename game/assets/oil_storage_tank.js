// oil_storage_tank candidate 0: primitives assembly. Five open cylinder courses split
// into a sun side (+Z, bleached) and a shade side, lap seam rings between courses,
// six vertical rivet strips, cone roof with radial ribs and a dust cone, walkway ring
// on twelve tube brackets with a yellow tube rail, inlet valve north, drain south,
// concrete plinth and a sand fillet.
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
  const TANK = 0x9c988c, RUST = 0x6b4426, GALV = 0x9ea3a1, STEEL = 0x4f5257, SAND = 0xcdb88e;
  const YEL = 0xc9a227, CONC = 0x857c6c, CONCB = 0xb8ae9b;
  const rust = M(RUST, 'metal', 0.9, 0.1);
  const galv = M(GALV, 'metal', 0.75, 0.55, true);
  const galvD = M(tint(GALV, 0.9), 'metal', 0.8, 0.5, true);
  const steel = M(STEEL, 'metal', 0.8, 0.3);
  const steelL = M(tint(STEEL, 1.08), 'metal', 0.78, 0.3);
  const seam = M(tint(TANK, 0.86), 'metal', 0.85, 0.2);
  const yel = M(YEL, 'metal', 0.7, 0.15);
  const yelD = M(tint(YEL, 0.92), 'metal', 0.72, 0.15);
  const sand = M(SAND, 'ground', 0.95, 0.0);
  const conc = M(CONC, 'stone', 0.92, 0.0);
  const concB = M(CONCB, 'stone', 0.9, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.75, 0.5);
  const red = M(0x9c4a3c, 'metal', 0.75, 0.15);

  const R = 3.2, RW = 4.0, H = 4.6, C = 0.92, SEG = 28;
  const bx = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg, open, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, !!open), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  // a swing group around the tank axis, so parts can be laid out in the r,y plane
  const swing = (theta) => { const s = new THREE.Group(); s.rotation.y = theta; g.add(s); return s; };

  // ---- courses: bottom stained, top bleached, sun side lighter -------------------
  const courseTint = [0.82, 0.9, 1.0, 1.06, 1.12];
  for (let i = 0; i < 5; i++) {
    const base = tint(TANK, courseTint[i]);
    for (const side of [0, 1]) {
      const col = side === 0 ? tint(base, 1.07) : base;   // side 0 faces +Z
      const geo = new THREE.CylinderGeometry(R, R, C - 0.02, SEG, 1, true, side === 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI);
      const mm = new THREE.Mesh(geo, M(col, 'metal', 0.85, 0.2, true));
      mm.position.y = i * C + C / 2;
      g.add(mm);
    }
    // lap seam ring at the top of each course except the top one
    if (i < 4) cyl(R + 0.035, R + 0.035, 0.09, seam, 0, (i + 1) * C, 0, SEG, false);
  }
  // rivet lines every 60 degrees, rivets every 0.23 m, rust drip under each course strip
  for (let k = 0; k < 6; k++) {
    const th = k * Math.PI / 3 + Math.PI / 6;
    const s = swing(th);
    bx(0.14, H - 0.04, 0.02, seam, 0, H / 2, R + 0.01, s);
    for (let i = 0; i < 20; i++) {
      const y = 0.115 + i * 0.23;
      bx(0.05, 0.05, 0.03, steelL, 0.035 * ((i & 1) ? 1 : -1), y, R + 0.03, s);
    }
    for (let i = 0; i < 5; i++) bx(0.05, 0.22, 0.008, rust, 0.03, i * C + 0.25, R + 0.024, s);
  }
  // rust runs under the seam rings, staggered around
  for (let i = 0; i < 4; i++) for (let k = 0; k < 8; k++) {
    const s = swing(k * Math.PI / 4 + i * 0.2 + 0.1);
    bx(0.06, 0.18 + 0.05 * (k % 3), 0.006, rust, 0, (i + 1) * C - 0.15, R + 0.006, s);
  }

  // ---- plinth and sand fillet --------------------------------------------------
  cyl(R + 0.05, R + 0.08, 0.12, conc, 0, 0.06, 0, SEG, false);
  const fil = cyl(0.2, R + 0.6, 0.26, sand, 0, 0.13, 0, SEG, false);
  fil.scale.set(1.04, 1, 0.96);
  bx(0.3, 0.06, 0.02, rust, 0.9, 0.14, R + 0.1);
  // ---- contact ring: a stained band on the bottom course, a collar of packed oil dark sand over the fillet, a splash line ----
  const stain = M(tint(TANK, 0.7), 'metal', 0.92, 0.12, true);
  const collar = cyl(R + 0.02, R + 0.42, 0.22, M(0xa89372, 'ground', 0.96, 0.0), 0, 0.11, 0, SEG, false);
  collar.scale.set(1.04, 1, 0.96);
  cyl(R + 0.004, R + 0.004, 0.38, stain, 0, 0.31, 0, SEG, true);
  for (let k = 0; k < 10; k++) { const s = swing(k * Math.PI / 5 + 0.3); bx(0.3 + 0.1 * (k % 3), 0.07 + 0.05 * (k % 2), 0.006, conc, 0, 0.53 + 0.04 * (k % 2), R + 0.006, s); }

  // ---- roof: cone, eave ring, 12 radial ribs, dust cone, vent stub ------------
  const roof = new THREE.Mesh(new THREE.ConeGeometry(R + 0.08, 0.6, SEG, 1, false), M(tint(TANK, 1.15), 'metal', 0.85, 0.2, true));
  roof.position.y = H + 0.3; g.add(roof);
  cyl(R + 0.1, R + 0.1, 0.06, seam, 0, H + 0.01, 0, SEG, false);
  const ribLen = Math.hypot(R - 0.1, 0.56), ribAng = Math.atan2(0.56, R - 0.1);
  for (let k = 0; k < 12; k++) {
    const s = swing(k * Math.PI / 6);
    const rib = bx(0.06, 0.035, ribLen, seam, 0, H + 0.3, (R - 0.1) / 2 + 0.1, s);
    rib.rotation.x = ribAng;
    bx(0.05, 0.1, 0.008, rust, 0, H - 0.08, R + 0.006, s);        // drip off each rafter foot
  }
  const dust = new THREE.Mesh(new THREE.ConeGeometry(R - 0.15, 0.53, SEG, 1, true), sand);
  dust.position.y = H + 0.02 + 0.265; g.add(dust);
  cyl(0.15, 0.15, 0.28, seam, 0, H + 0.6 + 0.12, 0, 14, false);
  cyl(0.2, 0.2, 0.04, steel, 0, H + 0.6 + 0.26, 0, 14, false);
  cyl(0.12, 0.12, 0.03, gun, 0, H + 0.6 + 0.29, 0, 14, false);

  // ---- walkway ring at 4.6: grating deck, toe plate, radial bars, dust drift ----
  const deck = new THREE.Mesh(new THREE.RingGeometry(R + 0.02, RW, SEG, 1), galv);
  deck.rotation.x = -Math.PI / 2; deck.position.y = H; g.add(deck);
  const deckU = new THREE.Mesh(new THREE.RingGeometry(R + 0.02, RW, SEG, 1), galvD);
  deckU.rotation.x = Math.PI / 2; deckU.position.y = H - 0.04; g.add(deckU);
  for (let k = 0; k < SEG; k++) {
    const s = swing((k + 0.5) * 2 * Math.PI / SEG);
    bx(0.03, 0.035, RW - R - 0.06, galvD, 0, H + 0.005, (R + RW) / 2, s);
  }
  for (const rr of [R + 0.28, R + 0.53]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 4, SEG), galvD);
    t.rotation.x = Math.PI / 2; t.position.y = H + 0.02; g.add(t);
  }
  const drift = new THREE.Mesh(new THREE.RingGeometry(R + 0.03, R + 0.3, SEG, 1), sand);
  drift.rotation.x = -Math.PI / 2; drift.position.y = H + 0.03; g.add(drift);
  cyl(RW, RW, 0.15, steel, 0, H + 0.055, 0, SEG, true).material = M(STEEL, 'metal', 0.8, 0.3, true);
  cyl(RW + 0.01, RW + 0.01, 0.06, steelL, 0, H - 0.05, 0, SEG, true).material = M(tint(STEEL, 1.08), 'metal', 0.8, 0.3, true);

  // ---- twelve angled brackets with mount plates and rust drips -----------------
  const strutLen = Math.hypot(0.75, 0.85), strutAng = -Math.atan2(0.85, 0.75);
  for (let k = 0; k < 12; k++) {
    const s = swing(k * Math.PI / 6 + Math.PI / 12);
    bx(0.08, 0.1, RW - R - 0.04, steel, 0, H - 0.09, (R + RW) / 2, s);
    const st = bx(0.07, 0.07, strutLen, steel, 0, H - 0.09 - 0.425, R + 0.375, s);
    st.rotation.x = strutAng;
    bx(0.16, 0.16, 0.03, steelL, 0, H - 0.95, R + 0.015, s);
    bx(0.16, 0.14, 0.03, steelL, 0, H - 0.09, R + 0.015, s);
    bx(0.07, 0.3, 0.008, rust, 0, H - 1.2, R + 0.007, s);
    bx(0.05, 0.35, 0.008, rust, 0.04, H - 0.35, R + 0.007, s);
  }

  // ---- yellow tube handrail: 24 posts, top and mid rail ------------------------
  const RR = RW - 0.06;
  for (let k = 0; k < 24; k++) {
    const s = swing(k * Math.PI / 12);
    cyl(0.025, 0.025, 1.05, k % 2 ? yel : yelD, 0, H + 0.525, RR, 6, false, s);
    bx(0.09, 0.02, 0.09, steel, 0, H + 0.02, RR, s);
    bx(0.04, 0.06, 0.006, rust, 0, H + 0.07, RR + 0.03, s);
    bx(0.05, 0.10, 0.006, rust, 0, H + 0.03, RW + 0.004, s);      // drip from the post foot down the kerb face
    bx(0.045, 0.12, 0.006, rust, 0.01, H - 0.06, RW + 0.014, s);  // and on down the deck edge ring
  }
  for (const [y, mat] of [[H + 1.05, yel], [H + 0.55, yelD]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.027, 6, SEG), mat);
    t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t);
  }

  // ---- inlet pipe north (-Z) with flange, valve and hand wheel, elbow to ground --
  const N = new THREE.Group(); N.rotation.y = Math.PI; g.add(N);
  const pipe = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  pipe(0.125, 0.75, steel, 0, 0.55, R + 0.3, 'z', 10, N);
  pipe(0.2, 0.05, steelL, 0, 0.55, R + 0.12, 'z', 10, N);
  pipe(0.2, 0.05, steelL, 0, 0.55, R + 0.5, 'z', 10, N);
  bx(0.36, 0.34, 0.28, steel, 0, 0.55, R + 0.7, N);
  pipe(0.04, 0.3, gun, 0, 0.85, R + 0.7, 'y', 8, N);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 14), red);
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 1.0, R + 0.7); N.add(wheel);
  bx(0.32, 0.02, 0.03, red, 0, 1.0, R + 0.7, N);
  bx(0.03, 0.02, 0.32, red, 0, 1.0, R + 0.7, N);
  const elb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), steel); elb.position.set(0, 0.55, R + 0.95); N.add(elb);
  pipe(0.125, 0.55, steel, 0, 0.275, R + 0.95, 'y', 10, N);
  bx(0.5, 0.1, 0.5, sand, 0, 0.05, R + 0.95, N);
  bx(0.1, 0.35, 0.008, rust, 0.15, 0.3, R + 0.006, N);
  bx(0.1, 0.35, 0.008, rust, -0.15, 0.3, R + 0.006, N);
  // ---- drain south (+Z) with a rust drip and a stain on the sand ---------------
  pipe(0.05, 0.45, steel, 0.6, 0.32, R + 0.2, 'z', 8);
  pipe(0.08, 0.04, steelL, 0.6, 0.32, R + 0.06, 'z', 8);
  bx(0.14, 0.3, 0.008, rust, 0.6, 0.15, R + 0.006);
  bx(0.4, 0.02, 0.35, M(0x8a7a5c, 'ground', 0.95, 0), 0.6, 0.25, R + 0.35);
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
