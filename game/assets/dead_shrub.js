// dead_shrub r4 detail pass. Same 1.2 x 1.2 x 0.8 mound and the gnarled reading of c2, made strict:
// twigs now fork three times and end in short bushy tip pairs (a fuzzy outline, not spears), the
// square leaf placards are replaced by ten dried clusters of five pointed leaves, seed heads on the
// tips, a three leader trunk with bark ridges, a dry grass tuft on the lee side, two fallen twigs on
// the sand, and a fillet with a windward drift. No green, no rust.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 37; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, foliage: 0x8a7a4e, khaki: 0x7a6a4c, packed: 0xa89372 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.92, mt = 0.0, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const up = new THREE.Vector3(0, 1, 0);
  const mBase = mat(shade(P.foliage, 0.68), 'foliage', 0.95), mBark = mat(shade(P.foliage, 0.5), 'foliage', 0.95);
  const mats = [mat(shade(P.foliage, 0.84), 'foliage', 0.95), mat(P.foliage, 'foliage', 0.95), mat(shade(P.foliage, 1.1), 'foliage', 0.95), mat(shade(P.foliage, 1.22), 'foliage', 0.95)];
  const mLeaf = mat(shade(P.khaki, 1.15), 'foliage', 0.9, 0, true), mLeafD = mat(shade(P.khaki, 0.95), 'foliage', 0.9, 0, true);
  const mSeed = mat(shade(P.foliage, 0.75), 'foliage', 0.95);
  const mGrass = mat(0x9a8a5e, 'foliage', 0.95, 0, true), mGrassD = mat(P.foliage, 'foliage', 0.95, 0, true);
  const mSand = mat(P.sand, 'ground', 0.95);
  const cone = (a, b, r, m, parent = g) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = add(new THREE.ConeGeometry(r, len, 4, 1, true), m, 0, 0, 0, parent);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(up, d.normalize());
    return o;
  };
  // a leaf: one pointed triangle, double sided
  const leafGeo = (() => { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.012, 0.02, 0, 0, 0.055, 0, 0, 0, 0, 0, 0.055, 0, -0.012, 0.02, 0], 3)); ge.computeVertexNormals(); return ge; })();
  const seedGeo = new THREE.ConeGeometry(0.007, 0.022, 4);
  const tips = [];
  const twig = (a, dir, len, r, level) => {
    let p = a.clone(), d = dir.clone();
    const steps = level === 0 ? 3 : level === 1 ? 2 : 1;
    for (let i = 0; i < steps; i++) {
      d = d.clone().add(new THREE.Vector3(rr(-0.28, 0.28), 0.08, rr(-0.28, 0.28))).normalize();
      const q = p.clone().addScaledVector(d, len / steps);
      cone(p, q, r * (1 - i * 0.2), mats[level]);
      p = q;
    }
    if (level === 3) {
      // bushy tip: two short fine twiglets so the outline is fuzzy, a seed head on one
      for (let k = 0; k < 2; k++) {
        const nd = d.clone().add(new THREE.Vector3(rr(-0.7, 0.7), rr(-0.2, 0.5), rr(-0.7, 0.7))).normalize();
        const q = p.clone().addScaledVector(nd, len * 0.45);
        cone(p, q, r * 0.6, mats[3]);
        if (k === 0) tips.push({ p: q, d: nd });
      }
      return;
    }
    for (let k = 0; k < 2; k++) {
      const nd = d.clone().add(new THREE.Vector3(rr(-0.6, 0.6), rr(-0.3, 0.3), rr(-0.6, 0.6))).normalize();
      twig(p, nd, len * rr(0.55, 0.72), r * 0.62, level + 1);
    }
  };
  // three leader trunk with bark ridges
  add(new THREE.CylinderGeometry(0.05, 0.085, 0.1, 6), mBase, 0, 0.05, 0);
  const leaders = [[new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(-0.09, 0.2, 0.03), 0.038], [new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0.07, 0.19, -0.05), 0.034], [new THREE.Vector3(0.01, 0.07, 0.01), new THREE.Vector3(0.02, 0.17, 0.08), 0.03]];
  for (const [a, b, r] of leaders) cone(a, b, r, mBase);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const rg = add(new THREE.BoxGeometry(0.008, 0.11, 0.012), mBark, Math.cos(a) * 0.06, 0.06, Math.sin(a) * 0.06); rg.rotation.y = -a; rg.rotation.z = rr(-0.2, 0.2); }
  const froms = [new THREE.Vector3(-0.09, 0.2, 0.03), new THREE.Vector3(0.07, 0.19, -0.05), new THREE.Vector3(0.02, 0.17, 0.08)];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * PI * 2 + rr(-0.1, 0.1);
    const el = rr(-0.05, 0.85);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    twig(froms[i % 3], dir, rr(0.22, 0.3), rr(0.011, 0.017), 0);
  }
  // dried leaf clusters on ten of the tips, five pointed leaves each fanning from the tip
  for (let i = 0; i < 10; i++) {
    const t = tips[Math.floor((i / 10) * tips.length)];
    for (let k = 0; k < 5; k++) {
      const leaf = add(leafGeo, k % 2 ? mLeaf : mLeafD);
      leaf.position.copy(t.p).addScaledVector(t.d, -0.01);
      leaf.quaternion.setFromUnitVectors(up, t.d.clone().add(new THREE.Vector3(rr(-0.8, 0.8), rr(-0.5, 0.5), rr(-0.8, 0.8))).normalize());
    }
  }
  // seed heads on twenty four tips
  for (let i = 0; i < 24; i++) { const t = tips[Math.floor((i / 24) * tips.length) + 1] || tips[0]; const sd = add(seedGeo, mSeed); sd.position.copy(t.p); sd.quaternion.setFromUnitVectors(up, t.d); }
  // dry grass tuft on the lee side, two fallen twigs on the sand
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2 + rr(-0.3, 0.3), L = rr(0.14, 0.26);
    const b = add(new THREE.ConeGeometry(0.006, L, 3, 1, true), i % 3 ? mGrass : mGrassD, -0.42 + Math.cos(a) * 0.04, L * 0.45, 0.2 + Math.sin(a) * 0.04);
    b.rotation.z = -Math.cos(a) * rr(0.3, 0.6); b.rotation.x = Math.sin(a) * rr(0.3, 0.6);
  }
  cone(new THREE.Vector3(0.25, 0.012, 0.45), new THREE.Vector3(0.5, 0.018, 0.38), 0.012, mats[1]);
  cone(new THREE.Vector3(0.5, 0.018, 0.38), new THREE.Vector3(0.6, 0.03, 0.46), 0.009, mats[2]);
  cone(new THREE.Vector3(-0.4, 0.01, -0.38), new THREE.Vector3(-0.55, 0.014, -0.2), 0.01, mats[0]);
  // fillet with a windward (west) drift
  const fillet = new THREE.CylinderGeometry(0.1, 0.36, 0.08, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); const wnd = x < 0 ? 1.25 : 1; fp.setXYZ(i, x * wnd * (1 + 0.12 * Math.sin(z * 11 + x)), fp.getY(i) * (x < 0 ? 1.3 : 1), z * (1 + 0.12 * Math.cos(x * 9))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.02, 0.04, 0.03);
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
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
