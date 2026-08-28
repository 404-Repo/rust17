// compound_wall_panel candidate 1: profile extrusion. The whole cross section
// (spread foot with batter, plinth step at 0.4, upright, chamfered top) is one
// Shape extruded along x, so the foot and the plinth line are real geometry
// rather than applied strips. Details: lifting eyes, end grooves, rust, dust, sand.
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
  const stain = M(0x857c6c, 'stone', 0.92, 0.0);
  const stainD = M(0x78705f, 'stone', 0.92, 0.0);
  const groove = M(0x6a6356, 'stone', 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x5a381f, 'metal', 0.85, 0.2);
  const eye = M(0x4f5257, 'metal', 0.70, 0.5);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc4af87, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  // extrude a (z, y) profile along x, centred on x
  const sweep = (pts, len, mat, x0) => {
    const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat);
    mm.rotation.y = Math.PI / 2;               // extrude axis z -> x
    mm.position.x = (x0 === undefined ? -len / 2 : x0);
    g.add(mm); return mm;
  };

  const W = 4.0, H = 2.4;
  // cross section, z across, y up. Foot 0.40 deep, upright 0.32, cap chamfer.
  const prof = [
    [-0.185, 0.00], [0.185, 0.00], [0.185, 0.08], [0.175, 0.16], [0.16, 0.36],
    [0.18, 0.36], [0.18, 0.42], [0.16, 0.44], [0.16, 2.33], [0.14, 2.40],
    [-0.14, 2.40], [-0.16, 2.33], [-0.16, 0.44], [-0.18, 0.42], [-0.18, 0.36],
    [-0.16, 0.36], [-0.175, 0.16], [-0.185, 0.08],
  ];
  // bleached body above the plinth, stained foot below: two sweeps split at 0.44
  const lower = prof.filter(([, y]) => y <= 0.44);
  const upperPts = [[-0.16, 0.44], [0.16, 0.44], [0.16, 2.33], [0.14, 2.40], [-0.14, 2.40], [-0.16, 2.33]];
  sweep(lower, W, stain);
  sweep(upperPts, W, conc);
  // face skins carrying the sun/shade tint, inset from the grooves
  box(W - 0.20, H - 0.52, 0.012, concS, 0, 0.48 + (H - 0.52) / 2, 0.165);
  box(W - 0.20, H - 0.52, 0.012, concN, 0, 0.48 + (H - 0.52) / 2, -0.165);
  // lift line at 1.2 and end joint grooves
  box(W - 0.2, 0.025, 0.36, groove, 0, 1.22, 0);
  for (const sx of [-1, 1]) {
    box(0.04, H - 0.5, 0.36, groove, sx * (W / 2 - 0.07), 0.46 + (H - 0.5) / 2, 0);
    box(0.018, H - 0.1, 0.42, stainD, sx * (W / 2 - 0.009), H / 2, 0);   // end faces stained
  }
  // lifting eye recesses in the top face
  for (const ex of [-1.3, 1.3]) {
    box(0.15, 0.04, 0.15, groove, ex, H - 0.01, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 6, 12), eye);
    ring.rotation.x = Math.PI / 2; ring.position.set(ex, H - 0.012, 0); g.add(ring);
    box(0.07, 0.01, 0.16, rust, ex, H - 0.015, 0);
  }
  // face anchors with rust runs: two south, one north
  for (const [ex, sz] of [[-1.3, 1], [1.3, 1], [-0.2, -1]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.012, 6, 12), rust);
    ring.position.set(ex, 1.9, sz * 0.174); g.add(ring);
    box(0.045, 1.1, 0.006, rust, ex, 1.30, sz * 0.175);
    box(0.02, 0.6, 0.006, rustD, ex - 0.02, 0.95, sz * 0.177);
    box(0.02, 0.4, 0.006, rustD, ex + 0.025, 1.20, sz * 0.177);
  }
  // dust cap on the top and on the plinth ledge
  box(W - 0.08, 0.012, 0.25, dust, 0, H + 0.005, 0);
  for (const sz of [-1, 1]) box(W - 0.3, 0.008, 0.02, dust, 0.1, 0.424, sz * 0.176);
  // chipped corners
  box(0.18, 0.14, 0.34, stainD, W / 2 - 0.09, H - 0.07, 0);
  box(0.12, 0.09, 0.34, stainD, -W / 2 + 0.06, H - 0.045, 0);
  box(0.12, 0.10, 0.02, groove, W / 2 - 0.06, H - 0.06, 0.171);
  // sand skin against both sides of the foot, higher against the north side
  for (const sz of [-1, 1]) {
    box(W, 0.05, 0.03, sand, 0, 0.025, sz * 0.20);
    box(W - 0.8, 0.06, 0.025, sand, -0.3, 0.075, sz * 0.195);
    box(W - 2.0, 0.06, 0.02, sand, 0.5, 0.13, sz * 0.185);
    if (sz < 0) box(1.6, 0.07, 0.02, dust, -0.6, 0.19, sz * 0.178);
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
