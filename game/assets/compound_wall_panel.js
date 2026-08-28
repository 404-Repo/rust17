// compound_wall_panel, r4 pass 2. The body is three extrusions of ONE chipped (x, y) outline along z
// (south skin 45 mm, core 230 mm, north skin 45 mm) so the two chipped top corners are real cuts in the
// silhouette, the lifting eye recesses are pockets cut into the core's top edge (open at the top, closed by
// the skins), and the spall and the bullet holes are pockets cut through the south skin into the core with
// the rebar sitting INSIDE the spall recess. The foot is a spread foot 60 mm proud of each face with two
// forklift slots, swept along x as a (z, y) profile. Concrete stays orthogonal: no chamfers, no bevels.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xbdb39f, 'stone', 0.90, 0.0);
  const concS = M(0xc6bca8, 'stone', 0.90, 0.0);
  const concN = M(0xb1a793, 'stone', 0.90, 0.0);
  const concL = M(0xcbc2ad, 'stone', 0.90, 0.0);      // fresh chip, lighter than the bleached face
  const chipM = M(0xa39a87, 'stone', 0.92, 0.0);      // broken face of a chip: exposed aggregate, between face and stain
  const endM = M(0x9a9182, 'stone', 0.92, 0.0);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x78705f, 'stone', 0.92, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const holeM = M(0x5a5348, 'stone', 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x5a381f, 'metal', 0.85, 0.2);
  const eye = M(0x4f5257, 'metal', 0.70, 0.5);
  const yellow = M(0xc9a227, 'metal', 0.80, 0.2);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc4af87, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, h, n, mat, x, y, z, rx, rz) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), mat);
    mm.rotation.set(rx || 0, 0, rz || 0); mm.position.set(x, y, z); g.add(mm); return mm;
  };
  // extrude a (z, y) profile along +x from x0
  const sweep = (pts, len, mat, x0) => {
    const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat);
    mm.rotation.y = Math.PI / 2;               // extrude axis z -> x
    mm.position.x = x0;
    g.add(mm); return mm;
  };
  // extrude an (x, y) outline with optional hole paths along +z from z0
  const slab = (pts, holes, depth, z0, mat) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes || []) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat); mm.position.z = z0; g.add(mm); return mm;
  };
  const circ = (cx, cy, r, n) => { const p = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; };

  const W = 4.0, H = 2.4, T = 0.16, SK = 0.045, FOOT = 0.22, Y0 = 0.44;

  // ---- the spread foot: (z, y) profile, batter from 0.22 at 0.10 up to the plinth ledge at 0.36, in
  //      three runs with two forklift slots 0.30 wide x 0.10 high through the base at x = +-1.0
  const footFull = [
    [-FOOT, 0.00], [FOOT, 0.00], [FOOT, 0.10], [0.175, 0.34], [0.18, 0.36], [0.18, 0.42], [0.16, Y0],
    [-0.16, Y0], [-0.18, 0.42], [-0.18, 0.36], [-0.175, 0.34], [-FOOT, 0.10],
  ];
  const footSlot = footFull.filter(([, y]) => y >= 0.10);
  for (const [x0, x1] of [[-W / 2, -1.15], [-0.85, 0.85], [1.15, W / 2]]) sweep(footFull, x1 - x0, stain, x0);
  for (const x0 of [-1.15, 0.85]) sweep(footSlot, 0.30, stainD, x0);

  // ---- the body: one chipped outline, three slabs ----
  // right top corner: a big chip 0.32 wide x 0.26 down in three wedge cuts; left top corner a small one
  const chipR = [[W / 2, 2.14], [1.93, 2.19], [1.86, 2.16], [1.78, 2.30], [1.72, 2.33], [1.68, H]];
  const chipL = [[-1.86, H], [-1.90, 2.34], [-1.96, 2.36], [-W / 2, 2.27]];
  const EYES = [1.3, -1.3], EYE_W = 0.07, EYE_D = 0.06;
  const outline = (eyes) => {
    const pts = [[-W / 2, Y0], [W / 2, Y0], ...chipR];
    if (eyes) for (const ex of EYES) pts.push([ex + EYE_W, H], [ex + EYE_W, H - EYE_D], [ex - EYE_W, H - EYE_D], [ex - EYE_W, H]);
    pts.push(...chipL);
    return pts;
  };
  // spall pocket, south face low right, irregular rim; bullet holes chest height, one stray on the north
  const spall = [[1.28, 0.70], [1.36, 0.64], [1.52, 0.66], [1.62, 0.74], [1.60, 0.86], [1.50, 0.92], [1.38, 0.90], [1.30, 0.82]];
  const holesS = [[0.55, 1.35], [0.72, 1.22], [0.86, 1.44], [0.98, 1.28], [0.64, 1.05], [1.12, 1.12], [0.80, 0.90], [-1.35, 1.72]];
  const holesN = [[-0.9, 1.55], [0.3, 1.2]];
  slab(outline(true), [], 2 * (T - SK), -(T - SK), conc);                                         // core with the eye pockets
  slab(outline(false), [spall, ...holesS.map(([x, y]) => circ(x, y, 0.021, 6))], SK, T - SK, concS); // south skin, cut
  slab(outline(false), holesN.map(([x, y]) => circ(x, y, 0.021, 6)), SK, -T, concN);               // north skin, cut

  // chip faces: a darker strip along every cut edge, set 4 mm into the concrete so the silhouette is the cut
  const strip = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const mm = box(L + 0.006, 0.012, 2 * T - 0.006, chipM, (a[0] + b[0]) / 2 + nx * 0.005, (a[1] + b[1]) / 2 + ny * 0.005, 0);
    mm.rotation.z = Math.atan2(dy, dx); return mm;
  };
  for (let i = 0; i < chipR.length - 1; i++) strip(chipR[i], chipR[i + 1]);
  for (let i = 0; i < chipL.length - 1; i++) strip(chipL[i], chipL[i + 1]);
  // a rebar end sticking out of the big chip, and dust settling in it
  cyl(0.007, 0.16, 5, rustD, 1.86, 2.24, 0.02, 0, Math.PI / 2 - 0.25);
  box(0.06, 0.006, 0.20, dust, 1.90, 2.192, 0.0);
  box(0.06, 0.03, 0.005, rust, 1.83, 2.16, T + 0.0025);

  // ---- lifting eye recesses: dark floor, the rebar loop standing in the pocket, rust bloom ----
  for (const ex of EYES) {
    box(2 * EYE_W - 0.004, 0.004, 2 * (T - SK) - 0.004, groove, ex, H - EYE_D + 0.002, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 12), eye);
    ring.position.set(ex, H - EYE_D + 0.020, 0); g.add(ring);
    box(0.09, 0.003, 0.05, rust, ex, H - EYE_D + 0.005, 0);
    for (const sz of [-1, 1]) box(0.05, 0.012, 0.005, rust, ex + 0.01 * sz, H - 0.006, sz * (T + 0.0025));   // rust over the lip
  }
  // ---- face anchors: U loops of rebar standing proud, ends in the wall, long rust runs below ----
  for (const [ex, sz] of [[-1.3, 1], [1.3, 1], [-0.2, -1]]) {
    const u = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 5, 8, Math.PI), rustD);
    u.rotation.set(0, sz * Math.PI / 2, Math.PI / 2); u.position.set(ex, 1.9, sz * (T + 0.011)); g.add(u);
    box(0.05, 0.03, 0.02, rust, ex, 1.9, sz * (T + 0.016));
    box(0.045, 1.1, 0.006, rust, ex, 1.30, sz * (T + 0.003));
    box(0.02, 0.6, 0.006, rustD, ex - 0.02, 0.95, sz * (T + 0.005));
    box(0.02, 0.4, 0.006, rustD, ex + 0.025, 1.20, sz * (T + 0.005));
  }
  // ---- form seams: lift line at 1.22, vertical seams at +-1.0, joint grooves at the ends ----
  box(W - 0.2, 0.025, 2 * T + 0.002, groove, 0, 1.22, 0);
  for (const vx of [-1.0, 1.0]) box(0.02, H - Y0 - 0.34, 2 * T + 0.002, groove, vx, Y0 + (H - Y0 - 0.34) / 2, 0);
  for (const sx of [-1, 1]) {
    box(0.04, 1.62, 2 * T + 0.002, groove, sx * (W / 2 - 0.07), Y0 + 0.02 + 0.81, 0);
    const top = sx > 0 ? 2.12 : 2.25;
    box(0.018, top - 0.05, 2 * T + 0.004, endM, sx * (W / 2 + 0.001), (top + 0.05) / 2, 0);                    // end faces stained
    // end connector plate with two bolts and a rust streak below
    box(0.012, 0.5, 0.12, eye, sx * (W / 2 + 0.008), 1.6, 0);
    for (const by of [1.45, 1.75]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.014, 6), rust); b.rotation.z = -sx * Math.PI / 2; b.position.set(sx * (W / 2 + 0.019), by, 0); g.add(b); }
    box(0.006, 0.45, 0.06, rust, sx * (W / 2 + 0.012), 1.1, 0.01);
  }
  // ---- the spall: dark back, two rebar rods and a stirrup INSIDE the recess, chipped rim, rust run below ----
  {
    const zb = T - SK;
    box(0.22, 0.16, 0.004, holeM, 1.45, 0.78, zb + 0.002);
    for (const ry of [0.72, 0.83]) cyl(0.007, 0.34, 5, rustD, 1.45, ry, zb + 0.014, 0, Math.PI / 2);
    cyl(0.006, 0.26, 5, rust, 1.40, 0.78, zb + 0.020, 0, 0);
    for (const [px, py, a] of [[1.31, 0.66, 0.6], [1.58, 0.69, -0.5], [1.62, 0.82, 1.2], [1.44, 0.92, 0.1], [1.34, 0.88, -0.8]]) {
      const c = box(0.045, 0.014, 0.012, concL, px, py, T - 0.004); c.rotation.z = a;
    }
    box(0.10, 0.19, 0.005, rust, 1.47, 0.535, T + 0.0025);
    box(0.03, 0.14, 0.005, rustD, 1.42, 0.56, T + 0.004);
  }
  // ---- bullet holes: dark back disc set into the core, light chipped rim on the face ----
  const pock = (x, y, sz) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.02, 6), holeM);
    d.position.set(x, y, sz * (T - SK + 0.001)); if (sz < 0) d.rotation.y = Math.PI; g.add(d);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.036, 6), concL);
    r.position.set(x, y, sz * (T + 0.001)); if (sz < 0) r.rotation.y = Math.PI; g.add(r);
  };
  for (const [x, y] of holesS) pock(x, y, 1);
  for (const [x, y] of holesN) pock(x, y, -1);
  // ---- safety yellow plate near the left end with two bolts and a drip ----
  box(0.3, 0.2, 0.01, yellow, -1.55, 1.5, T + 0.005);
  for (const bx of [-1.66, -1.44]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.014, 6), rust); b.rotation.x = Math.PI / 2; b.position.set(bx, 1.5, T + 0.017); g.add(b); }
  box(0.04, 0.25, 0.006, rust, -1.62, 1.28, T + 0.003);
  // ---- dust on the top (broken around the eye pockets and clear of the chips) and on the plinth ledge ----
  for (const [x0, x1] of [[-1.80, -1.40], [-1.20, 1.20], [1.40, 1.66]]) box(x1 - x0, 0.012, 0.25, dust, (x0 + x1) / 2, H + 0.005, 0);
  for (const sz of [-1, 1]) box(W - 0.3, 0.008, 0.02, dust, 0.1, 0.424, sz * 0.176);
  // ---- sand against the foot on both sides, higher on the north; the inner skins ride up the batter ----
  for (const sz of [-1, 1]) {
    // broken at the two forklift slots so the slots read as holes with sand piled either side
    for (const [x0, x1] of [[-W / 2, -1.17], [-0.83, 0.83], [1.17, W / 2]]) box(x1 - x0, 0.05, 0.045, sand, (x0 + x1) / 2, 0.025, sz * 0.20);
    for (const [x0, x1] of [[-1.85, -1.19], [-0.81, 0.81]]) box(x1 - x0, 0.06, 0.045, sand, (x0 + x1) / 2, 0.08, sz * 0.20);
    const b = box(W - 2.0, 0.04, 0.04, sand, 0.5, 0.15, sz * 0.195); b.rotation.x = sz * 0.2;
    if (sz < 0) { const d = box(1.6, 0.04, 0.04, dust, -0.6, 0.22, sz * 0.185); d.rotation.x = sz * 0.2; }
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
