// sandbag_wall round 13 rebuild: soft filled sacks. Each bag is a shared vertex superellipsoid
// lattice (a sphere grid remapped onto a rounded box) with a flattened, spread bottom, a pinched
// tied end with a knot, a sewn square end, a slight top sag and per bag jitter, laid in courses
// that alternate header and stretcher bond, ends stepped back one bag per course, the top course
// uneven with two bags slipped, two split bags leaking sand, a sand fillet at the foot, and the
// two angle iron pickets from the earlier build.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, steel: 0x4f5257, bag: 0xb0a07c };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.05, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  // A filled sack. w along x (the long axis, tied end at +x), h up, d across. Sphere grid with its
  // poles on the long axis so the tie is a real pinch, remapped onto a p = 3.2 superellipsoid so
  // it reads as a rounded box, then: bottom flattened and spread onto the bag below, tied end
  // pinched to a knot, sewn end squared, top dished by the bag above, small per bag noise.
  const sack = (w, h, d, jit) => {
    const geo = new THREE.SphereGeometry(1, 10, 5);
    const p = geo.attributes.position; const P = 6;
    for (let i = 0; i < p.count; i++) {
      // sphere y is the long axis
      const dx = p.getY(i), dy = p.getX(i), dz = -p.getZ(i);   // swap keeps handedness with the z flip
      const r = 1 / Math.pow(Math.pow(Math.abs(dx), P) + Math.pow(Math.abs(dy), P) + Math.pow(Math.abs(dz), P), 1 / P);
      let x = dx * r, y = dy * r, z = dz * r;              // unit rounded box
      const u = x;                                          // -1 sewn end, +1 tied end
      if (u > 0.5) { const t = (u - 0.5) / 0.5; const k = 1 - 0.5 * t * t; y *= k; z *= k; x = 0.5 + (x - 0.5) * 0.85; }
      if (u < -0.6) { const t = (-u - 0.6) / 0.4; y *= 1 - 0.12 * t; z *= 1 - 0.12 * t; }
      // bottom: flatten below -0.45 and spread the foot outward
      if (y < -0.45) { const t = (-y - 0.45) / 0.55; y = -0.45 - t * 0.1; x *= 1 + 0.04 * t; z *= 1 + 0.06 * t; }
      // top dished where the bag above bears
      if (y > 0.3) { const t = (y - 0.3) / 0.7; y -= 0.09 * t * (1 - u * u * 0.6) * (1 - z * z * 0.5); }
      const nz = Math.sin(x * 9.1 + jit) * Math.cos(z * 7.3 + jit * 2.1) * 0.02;
      p.setXYZ(i, x * w / 2, (y + nz) * h / 2, (z + nz) * d / 2);
    }
    // the knot: pole vertex pulled a little further out
    geo.computeVertexNormals();
    return geo;
  };
  const geos = [0, 1, 2, 3].map((k) => sack(0.52, 0.23, 0.29, k * 1.7));
  const halfGeos = [0, 1].map((k) => sack(0.32, 0.23, 0.29, k * 2.3 + 0.5));

  const fab = [0.96, 1.02, 1.08].map((f) => mat(tint(C.bag, f), 'fabric', 0.95, 0));
  const low = [0.7, 0.76].map((f) => mat(tint(C.bag, f), 'fabric', 0.95, 0));
  const seamM = mat(tint(C.bag, 0.72), 'fabric', 0.95, 0);
  const sandM = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  const steelM = mat(C.steel, 'metal', 0.8, 0.3);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);

  let bagN = 0;
  // one bag: pos, yaw (0 stretcher along x, PI/2 header along z), material, small tilt
  const bag = (geo, x, y, z, ry, m, rz, rx) => {
    const o = add(geo, m, x, y, z);
    o.rotation.set(rx || 0, ry + (rnd() - 0.5) * 0.06, rz || 0);
    const w = geo.parameters ? 0.5 : 0.5;
    // seam ridge along the top, slightly off centre like a sewn sack
    const L = halfGeos.includes(geo) ? 0.2 : 0.36;
    box(L, 0.006, 0.01, seamM, -0.03, 0.078, 0.03, o);
    bagN++;
    return o;
  };

  // five courses: stretcher (two rows), header, stretcher, header, stretcher. Ends step back.
  const H = 0.19;
  for (let i = 0; i < 5; i++) {
    const y = 0.1 + H * i;
    const halfLen = 1.0 - 0.12 * i;
    const header = i % 2 === 1;
    const pick = (x, row) => (i === 0 ? low[(row + Math.round(x * 4) + 4) % 2] : fab[(Math.round(x * 4) + row * 2 + i + 40) % 3]);
    if (!header) {
      for (let row = 0; row < 2; row++) {
        const z = row === 0 ? 0.14 : -0.14;
        const stagger = ((i / 2 + row) % 2) * 0.25;
        let x = -halfLen + 0.25 + stagger;
        if (stagger > 0) bag(halfGeos[row], -halfLen + 0.15, y, z, row ? Math.PI : 0, pick(-halfLen, row), 0.05, 0);
        while (x + 0.25 <= halfLen + 0.02) {
          bag(geos[bagN % 4], x, y + (rnd() - 0.5) * 0.012, z + (rnd() - 0.5) * 0.02, row ? Math.PI : 0, pick(x, row), (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.06 + (row ? 0.03 : -0.03));
          x += 0.5;
        }
        if (x - 0.25 < halfLen - 0.1) bag(halfGeos[(row + 1) % 2], halfLen - 0.15, y, z, row ? Math.PI : 0, pick(halfLen, row), -0.05, 0);
      }
    } else {
      // headers: bags across the wall, 0.31 pitch, tied ends alternating front and back
      const n = Math.floor((2 * halfLen) / 0.31);
      const x0 = -(n - 1) * 0.31 / 2;
      for (let k = 0; k < n; k++) {
        const x = x0 + k * 0.31;
        bag(geos[bagN % 4], x + (rnd() - 0.5) * 0.02, y + (rnd() - 0.5) * 0.012, (rnd() - 0.5) * 0.02, (k % 2 ? 1 : -1) * Math.PI / 2, pick(x, k % 2), (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.06);
      }
    }
  }
  // top course: two bags slipped, one rolled forward over the front face, one dropped back and tilted
  const s1 = bag(geos[1], -0.25, 0.9, 0.06, 0, fab[2], 0.12, 0.24);
  const s2 = bag(geos[2], 0.42, 0.88, -0.06, 0.2, fab[0], -0.14, -0.18);
  void s1; void s2;

  // two split bags on the front face, a dark tear and a spill of sand onto the bag below
  const tearM = mat(tint(C.bag, 0.5), 'fabric', 0.95, 0);
  const split = (x, y, z, ry) => {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.y = ry; g.add(t);
    box(0.12, 0.02, 0.01, tearM, 0, 0.02, 0.15, t);
    const spill = add(sack(0.22, 0.09, 0.16, 3.3), sandM, 0.02, -0.11, 0.07, t); spill.rotation.z = 0.05;
    const run = add(sack(0.12, 0.04, 0.12, 4.1), sandM, 0.05, -0.28, 0.1, t);
    void run;
  };
  split(-0.28, 0.5, 0.14, 0.04);
  split(0.55, 0.3, 0.145, -0.05);

  // angle iron pickets, one each end, following the taper, bolts with rust runs
  for (const s of [-1, 1]) {
    const pk = new THREE.Group(); pk.position.set(s * 0.97, 0, 0); pk.rotation.z = s * 0.46; g.add(pk);
    box(0.05, 1.1, 0.006, steelM, 0, 0.55, 0.025, pk);
    box(0.006, 1.1, 0.05, steelM, s * 0.022, 0.55, 0, pk);
    for (const yy of [0.3, 0.7]) { box(0.02, 0.02, 0.012, rustM, 0, yy, 0.032, pk); drip(0.22, 0.03, rustM, 0, yy - 0.01, 0.029, 0, pk); }
  }

  // sand at the base: a fillet the bottom course sits in, plus drifts at both ends
  const mound = new THREE.Shape(); mound.moveTo(-0.32, 0); mound.lineTo(0.32, 0); mound.lineTo(0.28, 0.07); mound.lineTo(0.0, 0.11); mound.lineTo(-0.28, 0.07); mound.closePath();
  const mg = new THREE.ExtrudeGeometry(mound, { depth: 2.2, bevelEnabled: false }); mg.translate(0, 0, -1.1);
  const mm = add(mg, sandM, 0, 0, 0); mm.rotation.y = Math.PI / 2;
  const endDrift = new THREE.Shape(); endDrift.moveTo(0, 0); endDrift.lineTo(0.12, 0); endDrift.lineTo(0, 0.2); endDrift.closePath();
  for (const s of [-1, 1]) {
    const eg = new THREE.ExtrudeGeometry(endDrift, { depth: 0.6, bevelEnabled: false }); eg.translate(0, 0, -0.3);
    const e = add(eg, sandM, s * 1.0, 0, 0); e.rotation.y = s > 0 ? 0 : Math.PI;
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

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm2) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm2)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
