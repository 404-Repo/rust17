// jersey_barrier candidate 2: a hand built loft. The profile polygon is swept along x as a
// BufferGeometry with a material group per face, so the south slope, north slope, stained
// toe and top each get their own colour with no overlapping skins. End caps are ShapeGeometry.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, concB: 0xb8ae9b, concS: 0x857c6c, rust: 0x6b4426, steel: 0x4f5257, rock: 0xc4b393 };
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

  const L = 3.0;
  const mats = [
    mat(C.concS, 'stone', 0.95),                 // 0 stained toe and lower batter
    mat(tint(C.concB, 1.07), 'stone', 0.92),     // 1 south slope, bleached lighter
    mat(tint(C.concB, 0.97), 'stone', 0.92),     // 2 north slope
    mat(C.concB, 'stone', 0.92),                 // 3 top and ends
    mat(tint(C.concS, 1.06), 'stone', 0.95),     // 4 south stained band
  ];
  // profile going clockwise seen from +x, as (z, y); the material index applies to the edge
  // starting at that point
  const P = [
    [0.30, 0.0, 0], [0.30, 0.075, 4], [0.20, 0.25, 4], [0.174, 0.40, 1], [0.10, 0.82, 3],
    [-0.10, 0.82, 2], [-0.174, 0.40, 0], [-0.20, 0.25, 0], [-0.30, 0.075, 0],
  ];
  const pos = [], groups = [];
  const segs = 3; // three bays along x so the loft carries mould seam lines at the third points
  let tri = 0;
  for (let e = 0; e < P.length; e++) {
    const a = P[e], b = P[(e + 1) % P.length];
    const start = tri;
    for (let sIdx = 0; sIdx < segs; sIdx++) {
      const x0 = -L / 2 + (L * sIdx) / segs, x1 = -L / 2 + (L * (sIdx + 1)) / segs;
      // quad: (x0,a) (x1,a) (x1,b) (x0,b), outward facing
      pos.push(x0, a[1], a[0], x1, a[1], a[0], x1, b[1], b[0]);
      pos.push(x0, a[1], a[0], x1, b[1], b[0], x0, b[1], b[0]);
      tri += 2;
    }
    groups.push([start * 3, (tri - start) * 3, a[2]]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const gr of groups) geo.addGroup(gr[0], gr[1], gr[2]);
  geo.computeVertexNormals();
  add(geo, mats);
  // end caps
  const prof = new THREE.Shape();
  prof.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) prof.lineTo(P[i][0], P[i][1]); prof.closePath();
  for (const s of [-1, 1]) {
    const cap = add(new THREE.ShapeGeometry(prof), mats[3], s * L / 2, 0, 0);
    cap.rotation.y = s * Math.PI / 2;
  }
  // mould seam lines at the bay joints, both faces, faint darker strips
  const seamM = mat(tint(C.concB, 0.9), 'stone', 0.9);
  const upA = Math.atan2(0.1, 0.57);
  for (const x of [-0.5, 0.5]) {
    const s1 = box(0.01, 0.55, 0.004, seamM, x, 0.55, 0.20 - (0.10 * 0.30) / 0.57 + 0.002); s1.rotation.x = -upA;
    const s2 = box(0.01, 0.55, 0.004, seamM, x, 0.55, -(0.20 - (0.10 * 0.30) / 0.57 + 0.002)); s2.rotation.x = upA;
  }
  // end details
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const stain = mats[0];
  for (const s of [-1, 1]) {
    const ex = s * L / 2;
    box(0.012, 0.14, 0.14, stain, ex + s * 0.004, 0.5, 0);
    const loop = add(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI), rustM, ex + s * 0.01, 0.47, 0);
    loop.rotation.y = Math.PI / 2;
    drip(0.34, 0.05, rustM, ex + s * 0.002, 0.44, 0, s * Math.PI / 2);
    if (s > 0) box(0.05, 0.45, 0.12, stain, ex + 0.025, 0.4, 0);
    else {
      box(0.006, 0.47, 0.14, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - 0.002, 0.4, 0);
      box(0.02, 0.47, 0.02, mats[3], ex - 0.01, 0.4, 0.08); box(0.02, 0.47, 0.02, mats[3], ex - 0.01, 0.4, -0.08);
    }
    box(0.2, 0.06, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.35, 0.03, 0.30);
    box(0.2, 0.06, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.35, 0.03, -0.30);
  }
  // a steel anchor plate on top at each third with a rust run down the south slope
  const steelM = mat(C.steel, 'metal', 0.8, 0.3);
  for (const x of [-0.95, 0.95]) {
    box(0.1, 0.01, 0.1, steelM, x, 0.825, 0);
    // four hex bolts on each anchor plate, and a rust bloom under the centre one
    for (const bx of [-0.035, 0.035]) for (const bz of [-0.035, 0.035]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), rustM, x + bx, 0.836, bz);
    box(0.018, 0.02, 0.018, rustM, x, 0.838, 0);
    // a rebar stub showing where the top edge has spalled beside the plate
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), rustM, x + 0.09, 0.80, 0.06).rotation.z = Math.PI / 2;
    drip(0.28, 0.05, rustM, x, 0.82, 0.104, 0).rotation.x = -upA;
  }
  const chipM = mat(C.rock, 'stone', 0.95);
  const chip1 = box(0.14, 0.03, 0.05, chipM, -1.1, 0.81, 0.09); chip1.rotation.z = 0.15;
  const chip2 = box(0.1, 0.035, 0.05, chipM, 0.6, 0.808, -0.085); chip2.rotation.z = -0.2;
  box(L - 0.08, 0.008, 0.14, mat(C.sandS, 'ground', 0.95, 0), 0, 0.824, 0);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(L - 0.1, 0.025, 0.12, fill, 0, 0.30, -Math.PI / 2);
  wedge(L - 0.1, 0.025, 0.09, fill, 0, -0.30, Math.PI / 2);
  wedge(0.6, 0.1, 0.1, fill, L / 2 + 0.05, 0, 0);
  wedge(0.6, 0.1, 0.1, fill, -L / 2, 0, Math.PI);
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
