// crate_stack candidate 0, round 4 detail pass. Each crate is a dark liner box wrapped in
// individual boards with 30 mm gaps, corner cleats proud of the boards, a diagonal brace on
// each long face, a galvanised strap with a buckle plate, a nailed name plate. Round 4 adds
// nail heads at every board and cleat crossing on all faces and on the lid battens, steel
// corner angles with rust runs on the heavy bottom crate, hand holds in its end boards, one
// sprung board with a pulled nail, and a plate on the back of the right small crate.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, galv: 0x9ea3a1, timber: 0xa07a4f, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.0, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const wedge = (L, out, h, m, x, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
    const o = add(geo, m, x, 0, z); o.rotation.y = ry; return o;
  };

  const boards = [0.92, 0.97, 1.02, 1.06].map((f) => mat(tint(C.timber, f), 'timber', 0.9));
  const boardsS = [0.98, 1.03, 1.08, 1.11].map((f) => mat(tint(C.timber, f), 'timber', 0.9));
  const lidM = mat(tint(C.timber, 1.12), 'timber', 0.92);
  const cleatM = mat(tint(C.timber, 0.88), 'timber', 0.9);
  const linerM = mat(tint(C.timber, 0.55), 'timber', 0.95);
  const plateM = mat(tint(C.timber, 0.6), 'timber', 0.9);
  const strapM = mat(C.galv, 'metal', 0.7, 0.5);
  const angleM = mat(tint(C.galv, 0.9), 'metal', 0.75, 0.45);
  const nailM = mat(C.gun, 'metal', 0.7, 0.4);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const nailGeo = new THREE.BoxGeometry(0.009, 0.009, 0.005);
  const nailGeoX = new THREE.BoxGeometry(0.005, 0.009, 0.009);
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const crate = (w, h, d, cx, cy, cz, straps, plateFace, opts = {}) => {
    const cr = new THREE.Group(); cr.position.set(cx, cy, cz); g.add(cr);
    box(w - 0.05, h - 0.05, d - 0.05, linerM, 0, h / 2, 0, cr);
    const n = Math.round(h / 0.13), pitch = h / n, bh = pitch - 0.03;
    for (let i = 0; i < n; i++) {
      const y = pitch * i + pitch / 2;
      if (opts.sprung === i) {
        // a sprung board: one end pulled off its cleat, hanging on the other nail
        const sb = box(w - 0.04, bh, 0.02, boardsS[i % 4], 0.01, y - 0.012, d / 2 - 0.02, cr); sb.rotation.z = 0.05; sb.rotation.y = -0.06;
        add(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 5), nailM, w / 2 - 0.025, y + 0.004, d / 2 + 0.012, cr).rotation.x = Math.PI / 2 + 0.4;
      } else box(w - 0.04, bh, 0.02, boardsS[i % 4], 0, y, d / 2 - 0.03, cr);
      box(w - 0.04, bh, 0.02, boards[(i + 1) % 4], 0, y, -d / 2 + 0.03, cr);
      box(0.02, bh, d - 0.08, boards[(i + 2) % 4], w / 2 - 0.03, y, 0, cr);
      box(0.02, bh, d - 0.08, boards[(i + 3) % 4], -w / 2 + 0.03, y, 0, cr);
      // nail heads: two per board end where it crosses each corner cleat, on all four faces
      for (const sx of [-1, 1]) {
        const nx = sx * (w / 2 - 0.025);
        for (const dy of [-0.018, 0.018]) {
          if (!(opts.sprung === i && sx > 0)) add(nailGeo, (i + sx) % 3 === 0 ? rustM : nailM, nx + (rnd() - 0.5) * 0.01, y + dy, d / 2 + 0.0025, cr);
          add(nailGeo, nailM, nx + (rnd() - 0.5) * 0.01, y - dy, -d / 2 - 0.0025, cr);
        }
      }
      for (const sz of [-1, 1]) {
        const nz = sz * (d / 2 - 0.025);
        for (const dy of [-0.018, 0.018]) {
          add(nailGeoX, nailM, w / 2 + 0.0025, y + dy, nz + (rnd() - 0.5) * 0.01, cr);
          add(nailGeoX, (i + sz) % 3 === 1 ? rustM : nailM, -w / 2 - 0.0025, y - dy, nz + (rnd() - 0.5) * 0.01, cr);
        }
      }
    }
    // corner cleats, proud of the boards
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, h, 0.05, cleatM, sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025), cr);
    // lid boards across, plus two battens, nailed
    const nl = Math.round((d - 0.1) / 0.12);
    for (let i = 0; i < nl; i++) {
      const z = -d / 2 + 0.05 + ((d - 0.1) / nl) * (i + 0.5);
      box(w - 0.1, 0.02, (d - 0.1) / nl - 0.02, lidM, 0, h - 0.01, z, cr);
      for (const bx of [-w / 4, w / 4]) add(new THREE.BoxGeometry(0.009, 0.005, 0.009), nailM, bx + (rnd() - 0.5) * 0.02, h + 0.0225, z, cr);
    }
    box(0.06, 0.02, d - 0.1, cleatM, -w / 4, h + 0.01, 0, cr);
    box(0.06, 0.02, d - 0.1, cleatM, w / 4, h + 0.01, 0, cr);
    box(w - 0.04, 0.02, d - 0.04, cleatM, 0, 0.01, 0, cr);
    // diagonal brace on each long face, between the cleats, nailed at both ends
    const bl = Math.hypot(w - 0.12, h - 0.12), ba = Math.atan2(h - 0.12, w - 0.12);
    const b1 = box(bl, 0.07, 0.02, cleatM, 0, h / 2, d / 2 - 0.01, cr); b1.rotation.z = ba;
    const b2 = box(bl, 0.07, 0.02, cleatM, 0, h / 2, -d / 2 + 0.01, cr); b2.rotation.z = -ba;
    for (const e of [-0.42, 0.42]) {
      add(nailGeo, nailM, e * (w - 0.12), h / 2 + e * (h - 0.12), d / 2 + 0.0025, cr);
      add(nailGeo, nailM, e * (w - 0.12), h / 2 - e * (h - 0.12), -d / 2 - 0.0025, cr);
    }
    // straps with buckle plate and rust
    for (const fy of straps) {
      const y = h * fy;
      box(w + 0.008, 0.03, 0.004, strapM, 0, y, d / 2 + 0.002, cr);
      box(w + 0.008, 0.03, 0.004, strapM, 0, y, -d / 2 - 0.002, cr);
      box(0.004, 0.03, d + 0.008, strapM, w / 2 + 0.002, y, 0, cr);
      box(0.004, 0.03, d + 0.008, strapM, -w / 2 - 0.002, y, 0, cr);
      box(0.06, 0.045, 0.012, strapM, w * 0.18, y, d / 2 + 0.008, cr);
      box(0.02, 0.02, 0.006, rustM, w * 0.18, y, d / 2 + 0.016, cr);
      drip(0.16, 0.05, rustM, w * 0.18, y - 0.02, d / 2 + 0.003, 0, cr);
      drip(0.12, 0.04, rustM, -w * 0.3, y - 0.015, d / 2 + 0.003, 0, cr);
      drip(0.1, 0.03, rustM, w * 0.38, y - 0.015, d / 2 + 0.003, 0, cr);
      drip(0.12, 0.04, rustM, 0, y - 0.015, -d / 2 - 0.003, Math.PI, cr);
      drip(0.1, 0.04, rustM, -w / 2 - 0.003, y - 0.015, -d * 0.2, -Math.PI / 2, cr);
      drip(0.1, 0.04, rustM, w / 2 + 0.003, y - 0.015, d * 0.25, Math.PI / 2, cr);
    }
    // nailed plate of darker timber with four rusty nails
    const plate = (face) => {
      if (face === 'front') {
        box(0.15, 0.1, 0.008, plateM, -w * 0.25, h * 0.7, d / 2 + 0.004, cr);
        for (const nx of [-0.065, 0.065]) for (const ny of [-0.04, 0.04]) box(0.01, 0.01, 0.006, rustM, -w * 0.25 + nx, h * 0.7 + ny, d / 2 + 0.01, cr);
      } else if (face === 'back') {
        box(0.15, 0.1, 0.008, plateM, w * 0.2, h * 0.62, -d / 2 - 0.004, cr);
        for (const nx of [-0.065, 0.065]) for (const ny of [-0.04, 0.04]) box(0.01, 0.01, 0.006, rustM, w * 0.2 + nx, h * 0.62 + ny, -d / 2 - 0.01, cr);
      } else {
        box(0.008, 0.1, 0.15, plateM, w / 2 + 0.004, h * 0.65, 0.05, cr);
        for (const nz of [-0.065, 0.065]) for (const ny of [-0.04, 0.04]) box(0.006, 0.01, 0.01, rustM, w / 2 + 0.01, h * 0.65 + ny, 0.05 + nz, cr);
      }
    };
    for (const f of [].concat(plateFace)) plate(f);
    if (opts.heavy) {
      // galvanised corner angles over the four vertical corners, screwed, rust running from each screw
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        box(0.045, h * 0.9, 0.004, angleM, sx * (w / 2 - 0.0225), h / 2, sz * (d / 2 + 0.002), cr);
        box(0.004, h * 0.9, 0.045, angleM, sx * (w / 2 + 0.002), h / 2, sz * (d / 2 - 0.0225), cr);
        for (const fy of [0.15, 0.5, 0.85]) {
          add(nailGeo, rustM, sx * (w / 2 - 0.02), h * fy, sz * (d / 2 + 0.0045), cr);
          add(nailGeoX, rustM, sx * (w / 2 + 0.0045), h * fy, sz * (d / 2 - 0.02), cr);
        }
        drip(0.08, 0.03, rustM, sx * (w / 2 - 0.02), h * 0.5 - 0.008, sz * (d / 2 + 0.005), sz > 0 ? 0 : Math.PI, cr);
        drip(0.07, 0.03, rustM, sx * (w / 2 + 0.005), h * 0.15 - 0.008, sz * (d / 2 - 0.02), sx > 0 ? Math.PI / 2 : -Math.PI / 2, cr);
      }
      // hand hold cut through the end boards, the dark liner showing through
      for (const sx of [-1, 1]) box(0.012, 0.045, 0.12, linerM, sx * (w / 2 - 0.028), h * 0.72, 0.0, cr);
    }
    return cr;
  };
  crate(1.2, 0.6, 1.0, 0, 0, 0, [0.3, 0.72], 'front', { heavy: true });
  crate(0.55, 0.7, 0.5, -0.325, 0.62, -0.15, [0.45], 'side', { sprung: 3 });
  crate(0.55, 0.7, 0.5, 0.325, 0.62, -0.15, [0.5], ['front', 'back']);
  // dust: on the exposed front strip of the bottom lid and on each small lid
  box(1.1, 0.008, 0.26, dustM, 0, 0.626, 0.26);
  box(0.47, 0.008, 0.42, dustM, -0.325, 1.336, -0.15);
  box(0.47, 0.008, 0.42, dustM, 0.325, 1.336, -0.15);
  // sand fillet
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(1.2, 0.05, 0.14, fill, 0, 0.5, -Math.PI / 2);
  wedge(1.2, 0.05, 0.1, fill, 0, -0.5, Math.PI / 2);
  wedge(1.0, 0.04, 0.16, fill, 0.6, 0, 0);
  wedge(1.0, 0.04, 0.12, fill, -0.6, 0, Math.PI);
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
    const put = (mm) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
