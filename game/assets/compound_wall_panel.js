// compound_wall_panel, round 13 rebuild. Big forms first: a wide spread foot with a real batter and a real
// plinth STEP swept along x as a (z, y) profile, then the body as three extrusions of ONE chipped (x, y) outline
// along z (south skin, core, north skin) so the chipped top corner is a wedge missing from the silhouette with a
// rough inner face, the two lifting eye recesses are 0.15 m pockets cut down into the core with a dark liner, and
// the bullet cluster and the spall are pockets cut through the south skin. The face is left CLEAN except for the
// end joint grooves, the two long rust runs from the eyes, the stencil plate and the spall plates, so at 15 m it
// reads as one heavy precast unit and not a tiled slab.
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

  const W = 4.0, H = 2.4, T = 0.15, SK = 0.045, FOOT = 0.21, Y0 = 0.40;

  // ---- the spread foot: (z, y) profile. Vertical kerb 0 to 0.14, batter in to the plinth at 0.38, a 3 cm
  //      horizontal ledge (the plinth STEP), then the body face at +-T. Two forklift slots through the base.
  const footFull = [
    [-FOOT, 0.00], [FOOT, 0.00], [FOOT, 0.14], [0.185, 0.37], [0.185, Y0], [T, Y0],
    [-T, Y0], [-0.185, Y0], [-0.185, 0.37], [-FOOT, 0.14],
  ];
  const footSlot = [[-0.185, 0.12], [0.185, 0.12], [0.185, 0.37], [0.185, Y0], [T, Y0], [-T, Y0], [-0.185, Y0], [-0.185, 0.37]];
  for (const [x0, x1] of [[-W / 2, -1.15], [-0.85, 0.85], [1.15, W / 2]]) sweep(footFull, x1 - x0, stain, x0);
  for (const x0 of [-1.15, 0.85]) sweep(footSlot, 0.30, stainD, x0);
  // the slot backs, dark
  for (const x0 of [-1.15, 0.85]) box(0.30, 0.12, 0.005, holeM, x0 + 0.15, 0.06, 0);

  // ---- the body: one chipped outline, three slabs ----
  // right top corner: a big wedge missing, 0.46 wide x 0.30 down, in five rough cuts; left corner a small nick
  const chipR = [[W / 2, H - 0.30], [W / 2 - 0.10, H - 0.25], [W / 2 - 0.19, H - 0.27], [W / 2 - 0.28, H - 0.12], [W / 2 - 0.36, H - 0.08], [W / 2 - 0.46, H]];
  const chipL = [[-W / 2 + 0.14, H], [-W / 2 + 0.08, H - 0.05], [-W / 2, H - 0.07]];
  const EYES = [1.25, -1.25], EYE_W = 0.075, EYE_D = 0.13;
  const outline = (eyes) => {
    const pts = [[-W / 2, Y0], [W / 2, Y0], ...chipR];
    if (eyes) for (const ex of EYES) pts.push([ex + EYE_W, H], [ex + EYE_W, H - EYE_D], [ex - EYE_W, H - EYE_D], [ex - EYE_W, H]);
    pts.push(...chipL);
    return pts;
  };
  const sq = (x, y, s) => [[x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s]];
  // spall pocket, south face low right, irregular rim; bullet cluster chest height on the south face only
  const spall = [[1.30, 0.74], [1.40, 0.68], [1.56, 0.70], [1.66, 0.78], [1.64, 0.92], [1.52, 0.98], [1.38, 0.96], [1.30, 0.86]];
  const holesS = [[0.42, 1.42], [0.55, 1.30], [0.66, 1.50], [0.78, 1.36], [0.50, 1.16], [0.90, 1.24], [0.70, 1.08], [0.84, 1.55]];
  slab(outline(true), [], 2 * (T - SK), -(T - SK), conc);                                        // core with the eye pockets
  slab(outline(false), [spall, ...holesS.map(([x, y]) => sq(x, y, 0.016))], SK, T - SK, concS);  // south skin, cut
  slab(outline(false), [], SK, -T, concN);                                                        // north skin

  // chip faces: a rough strip along every cut edge, set 4 mm into the concrete so the silhouette is the cut
  const strip = (a, b, mat, th) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const mm = box(L + 0.006, th, 2 * T - 0.006, mat, (a[0] + b[0]) / 2 + nx * (th / 2 - 0.001), (a[1] + b[1]) / 2 + ny * (th / 2 - 0.001), 0);
    mm.rotation.z = Math.atan2(dy, dx); return mm;
  };
  for (let i = 0; i < chipR.length - 1; i++) strip(chipR[i], chipR[i + 1], chipM, 0.014);
  for (let i = 0; i < chipL.length - 1; i++) strip(chipL[i], chipL[i + 1], chipM, 0.012);
  // exposed aggregate lumps and a rebar end in the big chip, dust settling on its shelf
  for (const [px, py, a] of [[1.86, 2.16, 0.4], [1.76, 2.22, -0.3], [1.68, 2.32, 0.9], [1.94, 2.13, -0.6]]) { const c = box(0.05, 0.02, 0.05, concL, px, py, 0.05); c.rotation.z = a; }
  cyl(0.007, 0.18, 6, rustD, 1.80, 2.19, -0.03, 0, Math.PI / 2 - 0.35);
  box(0.08, 0.006, 0.22, dust, 1.92, 2.106, 0.0);
  box(0.06, 0.04, 0.005, rust, 1.80, 2.10, T + 0.0025);

  // ---- lifting eye recesses: 0.15 m pockets, dark liner walls and floor, the loop standing in the pocket ----
  for (const ex of EYES) {
    const iw = 2 * EYE_W - 0.006, id = 2 * (T - SK) - 0.006;
    box(iw, 0.004, id, holeM, ex, H - EYE_D + 0.002, 0);                                   // floor
    for (const s of [-1, 1]) box(0.004, EYE_D - 0.006, id, holeM, ex + s * (iw / 2 - 0.002), H - EYE_D / 2 - 0.003, 0);          // x walls
    for (const s of [-1, 1]) box(iw, EYE_D - 0.006, 0.004, holeM, ex, H - EYE_D / 2 - 0.003, s * (id / 2 - 0.002));            // z walls
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.009, 6, 12), eye);
    ring.position.set(ex, H - EYE_D + 0.045, 0); g.add(ring);
    box(0.11, 0.003, 0.08, rust, ex, H - EYE_D + 0.006, 0);                                // rust bloom on the floor
    for (const sz of [-1, 1]) box(0.09, 0.02, 0.006, rust, ex, H - 0.01, sz * (T + 0.003));   // rust over the lip
  }
  // ---- the three rust streaks from the eyes: long thin strips, a wide pale run and a dark core ----
  const streak = (x, sz, len, w) => {
    box(w * 2.2, len * 0.9, 0.004, stain, x + 0.01, H - 0.02 - len * 0.45, sz * (T + 0.002));   // pale wash halo
    box(w, len, 0.005, rust, x, H - 0.02 - len / 2, sz * (T + 0.0025));
    box(w * 0.4, len * 0.7, 0.005, rustD, x + 0.008, H - 0.02 - len * 0.35, sz * (T + 0.004));
    box(w * 0.25, len * 0.45, 0.005, rustD, x - 0.012, H - 0.02 - len * 0.7, sz * (T + 0.004));
  };
  streak(1.25, 1, 1.50, 0.10); streak(-1.25, 1, 1.20, 0.08); streak(-1.25, -1, 1.35, 0.09);
  // ---- joint grooves at the ends, a rebate for the next panel ----
  for (const sx of [-1, 1]) {
    box(0.05, H - Y0 - 0.36, 2 * T + 0.002, groove, sx * (W / 2 - 0.09), Y0 + 0.03 + (H - Y0 - 0.36) / 2, 0);
    const top = sx > 0 ? H - 0.30 : H - 0.07;
    box(0.02, top - Y0 - 0.02, 2 * T + 0.004, endM, sx * (W / 2 + 0.002), (top + Y0) / 2, 0);   // end faces stained
  }
  // ---- the spall: dark back with two rebar rods INSIDE, chipped rim, rust run below; plus two spall PLATES ----
  {
    const zb = T - SK;
    box(0.30, 0.24, 0.004, holeM, 1.48, 0.83, zb + 0.002);
    for (const ry of [0.76, 0.88]) cyl(0.007, 0.34, 6, rustD, 1.48, ry, zb + 0.014, 0, Math.PI / 2);
    for (const [px, py, a] of [[1.33, 0.70, 0.6], [1.62, 0.72, -0.5], [1.66, 0.86, 1.2], [1.48, 0.98, 0.1], [1.35, 0.93, -0.8]]) {
      const c = box(0.05, 0.014, 0.012, concL, px, py, T - 0.004); c.rotation.z = a;
    }
    box(0.12, 0.22, 0.005, rust, 1.50, 0.56, T + 0.0025);
    box(0.03, 0.16, 0.005, rustD, 1.45, 0.58, T + 0.004);
    // spall plates: one slightly proud (an old patch of render), one a shallow dark scab
    box(0.34, 0.26, 0.010, concL, -0.55, 1.05, T + 0.004);
    box(0.24, 0.18, 0.006, stain, 0.35, 0.72, T + 0.003);
    box(0.20, 0.14, 0.008, concL, -1.05, 1.75, -T - 0.003);
  }
  // ---- bullet cluster: dark back set into the core behind each square hole, a light chipped rim on the face ----
  for (const [x, y] of holesS) {
    box(0.034, 0.034, 0.003, holeM, x, y, T - SK + 0.001);
    box(0.06, 0.06, 0.003, concL, x, y, T + 0.0015);
    box(0.02, 0.02, 0.004, holeM, x, y, T + 0.002);
  }
  // ---- stencil number plate: a pale painted rectangle with a dark stencilled "17" and a drip ----
  {
    const px = -1.6, py = 1.55, z = T + 0.003;
    box(0.36, 0.24, 0.006, concL, px, py, z);
    const ink = (w, h, x, y) => box(w, h, 0.004, holeM, px + x, py + y, z + 0.004);
    ink(0.03, 0.15, -0.09, 0); ink(0.05, 0.03, -0.11, 0.06);                      // 1
    ink(0.11, 0.03, 0.05, 0.065); ink(0.03, 0.06, 0.09, 0.03); ink(0.03, 0.09, 0.055, -0.04); // 7
    ink(0.30, 0.012, 0, -0.10);
    box(0.02, 0.18, 0.005, rustD, px + 0.10, py - 0.22, T + 0.0025);
  }
  // ---- dust on the top (clear of the pockets and the chips) and on the plinth ledge ----
  for (const [x0, x1] of [[-1.80, -1.35], [-1.15, 1.15], [1.35, 1.52]]) box(x1 - x0, 0.010, 0.26, dust, (x0 + x1) / 2, H + 0.004, 0);
  for (const sz of [-1, 1]) box(W - 0.4, 0.006, 0.03, dust, 0.1, Y0 + 0.003, sz * 0.168);
  // ---- sand: a drift WEDGE at the foot on the north side swept as a (z, y) profile in three runs of
  //      different height, a low fillet on the south, both broken at the forklift slots ----
  const wedge = (h, r, x0, x1, sz) => {
    const z1 = FOOT - 0.002, z0 = FOOT + 0.010 + r;
    const pts = [[sz * z0, 0], [sz * z1, 0], [sz * (z1 - 0.015), h], [sz * (z0 - 0.005), 0.02]];
    if (sz > 0) pts.reverse();
    sweep(pts, x1 - x0, sand, x0);
  };
  for (const [x0, x1, h] of [[-W / 2, -1.17, 0.30], [-0.83, 0.83, 0.36], [1.17, W / 2, 0.24]]) wedge(h, 0.004, x0, x1, -1);
  for (const [x0, x1, h] of [[-W / 2, -1.17, 0.12], [-0.83, 0.83, 0.16], [1.17, W / 2, 0.10]]) wedge(h, 0.004, x0, x1, 1);
  // sand piled in the mouth of each slot on the north side
  for (const x0 of [-1.15, 0.85]) box(0.30, 0.06, 0.05, sand, x0 + 0.15, 0.03, -0.17);
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
