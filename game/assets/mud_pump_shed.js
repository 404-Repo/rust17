// mud_pump_shed candidate 2: a different reading of the reference. The deck is
// six framed grating panels (bars at 0.1 pitch with cross bars) between the
// beams, with a corrugated top skin only over the two end bays; columns are
// I-sections with haunch gussets and stiffener plates; the cladding is hung as
// overlapping 0.9 m sheets with visible laps and hook bolts; bracing has
// turnbuckles and cleats. Slab, base plates, rust runs, dust, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const red = M(0x7e4835, 'metal', 0.85, 0.15);
  const redS = M(0x8d5a45, 'metal', 0.85, 0.15);
  const redD = M(0x6d3f2e, 'metal', 0.85, 0.15);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.35, true);
  const galvB = M(0xaaafad, 'metal', 0.72, 0.35, true);
  const galvD = M(0x8c9190, 'metal', 0.74, 0.35, true);
  const grate = M(0x7f8483, 'metal', 0.70, 0.6);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const conc = M(0xb8ae9b, 'stone', 0.90, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc6b189, 'ground', 0.95, 0.0);
  const packed = M(0xa89372, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const corr = (w, h, mat) => {
    const PITCH = 0.076, AMP = 0.012;
    const geo = new THREE.PlaneGeometry(w, h, Math.round(w / PITCH) * 6, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, AMP * Math.sin((p.getX(i) + w / 2) / PITCH * Math.PI * 2));
    const f = geo.toNonIndexed(); f.computeVertexNormals();
    return new THREE.Mesh(f, mat);
  };

  const L = 10.0, D = 6.0, DECK = 4.6, CLAD = 2.4;
  const CX = [-4.85, 0, 4.85], CZ = [-2.85, 2.85];

  // ---- slab with a drain channel across the front ----
  box(L + 0.2, 0.15, D + 0.2, conc, 0, 0.075, 0);
  box(L + 0.22, 0.05, D + 0.22, stain, 0, 0.025, 0);
  box(L - 0.6, 0.008, D - 0.8, dust, 0.2, 0.154, 0.0);
  box(L - 1.0, 0.02, 0.2, stain, 0, 0.145, D / 2 - 0.6);                    // drain channel
  box(2.2, 0.006, 1.6, packed, -1.0, 0.162, -0.4);
  box(1.4, 0.006, 1.0, packed, 3.2, 0.162, 1.0);

  // ---- columns ----
  for (const cx of CX) for (const cz of CZ) {
    const h = DECK - 0.3 - 0.15;
    box(0.2, h, 0.016, cz > 0 ? redS : red, cx, 0.15 + h / 2, cz + 0.092);
    box(0.2, h, 0.016, cz > 0 ? red : redD, cx, 0.15 + h / 2, cz - 0.092);
    box(0.012, h, 0.17, red, cx, 0.15 + h / 2, cz);
    for (const sy of [1.4, 2.8]) box(0.18, 0.012, 0.17, red, cx, sy, cz);       // stiffener plates
    box(0.34, 0.02, 0.34, steel, cx, 0.16, cz);
    for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), rust);
      b.position.set(cx + bx * 0.13, 0.185, cz + bz * 0.13); g.add(b);
    }
    box(0.05, 0.45, 0.006, rust, cx + 0.04, 0.42, cz + 0.101);
    box(0.03, 0.3, 0.006, rustD, cx - 0.05, 0.35, cz - 0.101);
    box(0.2, 0.08, 0.008, rustD, cx, 0.21, cz + 0.1);
    // haunch gussets both ways
    const hg = box(0.012, 0.42, 0.42, red, cx, DECK - 0.5, cz); hg.rotation.x = Math.PI / 4;
    box(0.06, 0.008, 0.19, dust, cx, 0.16 + h + 0.004, cz);
  }
  // ---- beams: edge beams along x, cross beams along z, splice plates ----
  for (const cz of CZ) {
    const zo = cz > 0 ? 1 : -1;
    box(L + 0.1, 0.3, 0.02, cz > 0 ? redS : redD, 0, DECK - 0.15, cz + 0.1);
    box(L + 0.1, 0.3, 0.02, red, 0, DECK - 0.15, cz - 0.1);
    box(L + 0.1, 0.016, 0.22, red, 0, DECK - 0.29, cz);
    box(L + 0.1, 0.016, 0.22, red, 0, DECK - 0.01, cz);
    box(L + 0.1, 0.012, 0.2, red, 0, DECK - 0.15, cz);
    for (const sx of [-2.45, 2.45]) {
      box(0.5, 0.22, 0.012, steel, sx, DECK - 0.15, cz + zo * 0.112);
      for (const bx of [-0.18, -0.06, 0.06, 0.18]) for (const by of [-0.07, 0.07]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), rust);
        b.rotation.x = Math.PI / 2; b.position.set(sx + bx, DECK - 0.15 + by, cz + zo * 0.122); g.add(b);
      }
      box(0.4, 0.35, 0.006, rust, sx, DECK - 0.45, cz + zo * 0.112);
    }
    for (const rx of [-4.4, -3.0, -1.6, 0.6, 2.1, 3.9]) box(0.04, 0.25, 0.006, rust, rx, DECK - 0.35, cz + zo * 0.113);
  }
  const BX = [-4.85, -2.9, -0.97, 0.97, 2.9, 4.85];                               // beams framing six grating bays
  for (const bx of BX) { box(0.16, 0.25, D - 0.2, red, bx, DECK - 0.13, 0); box(0.2, 0.014, D - 0.2, red, bx, DECK - 0.26, 0); }

  // ---- deck: six framed grating panels; corrugated skin over the two end bays ----
  for (let i = 0; i < 5; i++) {
    const x0 = BX[i] + 0.1, x1 = BX[i + 1] - 0.1, w = x1 - x0, cx = (x0 + x1) / 2;
    // panel frame
    box(w, 0.05, 0.04, grate, cx, DECK - 0.025, -D / 2 + 0.12);
    box(w, 0.05, 0.04, grate, cx, DECK - 0.025, D / 2 - 0.12);
    box(0.04, 0.05, D - 0.2, grate, x0 + 0.02, DECK - 0.025, 0);
    box(0.04, 0.05, D - 0.2, grate, x1 - 0.02, DECK - 0.025, 0);
    // bearing bars along z at 0.1 pitch, cross bars along x at 0.6
    for (let bx = x0 + 0.1; bx < x1 - 0.05; bx += 0.1) box(0.006, 0.05, D - 0.24, grate, bx, DECK - 0.025, 0);
    for (let bz = -D / 2 + 0.4; bz < D / 2 - 0.2; bz += 0.6) box(w - 0.08, 0.008, 0.008, galvD, cx, DECK - 0.005, bz);
    if (i === 0 || i === 4) {
      const sk = corr(w, D - 0.2, galvB); sk.rotation.x = -Math.PI / 2; sk.position.set(cx, DECK + 0.01, 0); g.add(sk);
      box(w - 0.2, 0.012, D - 0.5, dust, cx, DECK + 0.03, 0.05);
    } else {
      box(w - 0.2, 0.006, D - 0.5, dust, cx, DECK + 0.004, 0.05);              // dust caught on the grating
    }
  }
  // kerb, 0.3 upstand, with the dust cap and fixing bolts
  for (const [w, d, x, z, mat] of [[L + 0.2, 0.08, 0, D / 2 + 0.06, redS], [L + 0.2, 0.08, 0, -D / 2 - 0.06, red], [0.08, D + 0.2, L / 2 + 0.06, 0, red], [0.08, D + 0.2, -L / 2 - 0.06, 0, red]]) {
    box(w, 0.30, d, mat, x, DECK + 0.15, z);
    box(w, 0.012, d, dust, x, DECK + 0.306, z);
  }
  for (let bx = -4.5; bx <= 4.5; bx += 1.5) for (const sz of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), rust);
    b.rotation.x = Math.PI / 2; b.position.set(bx, DECK + 0.2, sz * (D / 2 + 0.106)); g.add(b);
    box(0.03, 0.14, 0.006, rustD, bx, DECK + 0.1, sz * (D / 2 + 0.103));
  }
  for (let bz = -2.5; bz <= 2.5; bz += 1.25) for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), rust);
    b.rotation.z = Math.PI / 2; b.position.set(sx * (L / 2 + 0.106), DECK + 0.2, bz); g.add(b);
    box(0.006, 0.14, 0.03, rustD, sx * (L / 2 + 0.103), DECK + 0.1, bz);
  }

  // ---- cladding: overlapping 0.9 m sheets, staggered heights, hook bolts, girts ----
  const hang = (n, along, place) => {
    for (let i = 0; i < n; i++) {
      const w = 0.98, h = CLAD - 0.15 - (i % 3 === 1 ? 0.08 : 0);
      const s = corr(w, h, i % 2 ? galv : galvB);
      place(s, i, w, h);
    }
  };
  hang(11, L, (s, i, w, h) => { s.position.set(-L / 2 + 0.45 + i * 0.91, 0.15 + h / 2, -D / 2 - 0.06 - (i % 2) * 0.006); g.add(s); });
  for (const sx of [-1, 1]) hang(7, D, (s, i, w, h) => { s.rotation.y = -sx * Math.PI / 2; s.position.set(sx * (L / 2 + 0.06 + (i % 2) * 0.006), 0.15 + h / 2, -D / 2 + 0.45 + i * 0.91); g.add(s); });
  for (const gy of [0.9, 2.0]) {
    box(L, 0.06, 0.04, steel, 0, gy, -D / 2);
    for (const sx of [-1, 1]) box(0.04, 0.06, D, steel, sx * (L / 2), gy, 0);
    for (let hx = -4.5; hx <= 4.5; hx += 0.91) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8), rust);
      b.rotation.x = Math.PI / 2; b.position.set(hx, gy, -D / 2 - 0.08); g.add(b);
      box(0.02, 0.16, 0.006, rust, hx, gy - 0.11, -D / 2 - 0.078);
    }
    for (let hz = -2.5; hz <= 2.5; hz += 0.91) for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8), rust);
      b.rotation.z = Math.PI / 2; b.position.set(sx * (L / 2 + 0.08), gy, hz); g.add(b);
      box(0.006, 0.16, 0.02, rust, sx * (L / 2 + 0.078), gy - 0.11, hz);
    }
  }
  box(L + 0.14, 0.04, 0.08, steel, 0, CLAD + 0.02, -D / 2 - 0.06);
  for (const sx of [-1, 1]) box(0.08, 0.04, D + 0.02, steel, sx * (L / 2 + 0.06), CLAD + 0.02, 0);

  // ---- X bracing with cleats and turnbuckles ----
  const rodLen = Math.hypot(D - 0.4, DECK - 0.7);
  for (const sx of [-1, 1]) for (const dir of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, rodLen, 8), redD);
    r.rotation.x = dir * Math.atan2(D - 0.4, DECK - 0.7);
    r.position.set(sx * (L / 2 - 0.16), 0.35 + (DECK - 0.7) / 2, 0); g.add(r);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8), steel);
    t.rotation.x = r.rotation.x; t.position.copy(r.position); g.add(t);
    box(0.012, 0.25, 0.25, steel, sx * (L / 2 - 0.16), 0.4, dir * (D / 2 - 0.25));       // cleat at the foot
    box(0.012, 0.25, 0.25, steel, sx * (L / 2 - 0.16), DECK - 0.5, -dir * (D / 2 - 0.25));
  }
  // ---- sand fillet ----
  box(L + 0.4, 0.12, 0.3, sand, 0, 0.06, -D / 2 - 0.22);
  box(L - 1.5, 0.12, 0.18, sand, 0.8, 0.17, -D / 2 - 0.15);
  box(3.0, 0.08, 0.1, dust, -2.0, 0.27, -D / 2 - 0.1);
  for (const sx of [-1, 1]) {
    box(0.3, 0.12, D + 0.4, sand, sx * (L / 2 + 0.22), 0.06, 0);
    box(0.18, 0.12, D - 1.0, sand, sx * (L / 2 + 0.15), 0.17, -0.2);
    box(0.1, 0.08, 2.0, dust, sx * (L / 2 + 0.1), 0.27, 0.8);
  }
  box(2.0, 0.05, 0.4, sand, 2.5, 0.175, D / 2 - 0.1);
  box(1.6, 0.05, 0.3, sand, -3.8, 0.175, D / 2 - 0.05);
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
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) box3.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
