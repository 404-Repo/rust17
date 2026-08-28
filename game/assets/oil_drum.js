// oil_drum candidate 0: lathe. One revolved profile carries both chimes and both rolling
// hoops, split into a stained lower third and a bleached upper body. A dent is pushed into
// the upper shell by displacing vertices. Raised lid, two bungs, weld seam with rivets, rust.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, tank: 0x9c988c, concS: 0x857c6c, gun: 0x3a3d40 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.8, metalness = 0.2, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (rt, rb, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const lathe = (pts, seg, m) => add(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m);

  const R = 0.2925, H = 0.88, SEG = 14;
  const bleachedTan = tint(C.tank, 1.12);        // sun bleached tan steel
  const upperM = mat(bleachedTan, 'metal', 0.85, 0.15, THREE.DoubleSide);
  const upperS = mat(tint(bleachedTan, 1.06), 'metal', 0.85, 0.15);
  const lowerM = mat(tint(C.concS, 0.95), 'metal', 0.9, 0.1, THREE.DoubleSide);
  const hoopM = mat(tint(bleachedTan, 0.92), 'metal', 0.8, 0.2, THREE.DoubleSide);
  const lidM = mat(tint(bleachedTan, 0.97), 'metal', 0.85, 0.15, THREE.DoubleSide);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const gun = mat(C.gun, 'metal', 0.7, 0.5);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);

  // lower third: bottom chime, shell, first hoop
  lathe([[0.25, 0.0], [R + 0.006, 0.0], [R + 0.008, 0.018], [R, 0.03], [R, 0.26], [R + 0.012, 0.27], [R + 0.012, 0.29], [R, 0.30]], SEG, lowerM);
  // upper body: shell with the second hoop, top chime and a recessed lid rim
  const upper = lathe([[R, 0.30], [R, 0.58], [R + 0.012, 0.59], [R + 0.012, 0.61], [R, 0.62], [R, 0.85], [R + 0.008, 0.862], [R + 0.008, 0.878], [R - 0.004, H], [R - 0.02, H - 0.006], [R - 0.02, H - 0.012], [0.0, H - 0.012]], SEG, upperM);
  // hoops re-coloured: a second thin lathe on each hoop so they read darker
  lathe([[R + 0.0125, 0.268], [R + 0.0125, 0.292]], SEG, hoopM);
  lathe([[R + 0.0125, 0.588], [R + 0.0125, 0.612]], SEG, hoopM);
  // dent, 0.15 m across, pushed into the upper shell on the -x side between the hoops
  const p = upper.geometry.attributes.position;
  const dentY = 0.45, dentA = Math.PI;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z); if (r < R - 0.001 || y < 0.31 || y > 0.57) continue;
    const a = Math.atan2(z, x);
    let da = Math.abs(a - dentA); if (da > Math.PI) da = 2 * Math.PI - da;
    const dArc = da * R, dy = Math.abs(y - dentY);
    const d = Math.hypot(dArc / 0.075, dy / 0.13);
    if (d < 1) { const k = 0.045 * (1 - d * d); p.setXYZ(i, x - (x / r) * k, y, z - (z / r) * k); }
  }
  p.needsUpdate = true; upper.geometry.computeVertexNormals();
  // lid: a flat disc inside the top chime with two bung caps, dust settled on it
  cyl(R - 0.02, R - 0.02, 0.006, SEG, lidM, 0, H - 0.012, 0);
  cyl(0.2, 0.2, 0.004, SEG, dustM, 0, H - 0.007, 0);
  for (const [bx, bz, br] of [[0.19, 0.0, 0.03], [-0.19, 0.0, 0.02]]) {
    cyl(br + 0.008, br + 0.008, 0.004, 10, hoopM, bx, H - 0.006, bz);
    cyl(br, br, 0.012, 10, gun, bx, H - 0.002, bz);
  }
  // south face lighter: a thin skin panel on the +z side of the upper shell
  const skin = add(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.5, SEG, 1, true, -Math.PI / 4 + Math.PI / 2 * 0, Math.PI / 2), upperS, 0, 0.58, 0);
  skin.rotation.y = 0;
  // vertical weld seam with four rivets on the +x side, rust down the seam
  const seamA = 0.3;
  const sx = Math.cos(seamA) * (R + 0.002), sz = Math.sin(seamA) * (R + 0.002);
  const seam = box(0.006, 0.8, 0.004, mat(tint(bleachedTan, 0.85), 'metal', 0.8, 0.2), sx, 0.44, sz); seam.rotation.y = -seamA + Math.PI / 2;
  for (const ry of [0.12, 0.38, 0.5, 0.75]) { const rv = cyl(0.006, 0.006, 0.006, 6, gun, sx, ry, sz); rv.rotation.z = -Math.PI / 2; rv.rotation.y = -seamA; }
  drip(0.2, 0.03, rustM, Math.cos(seamA) * (R + 0.004), 0.37, Math.sin(seamA) * (R + 0.004), Math.PI / 2 - seamA);
  // rust streaks from each bung down the side
  drip(0.34, 0.05, rustM, R + 0.004, 0.86, 0.0, Math.PI / 2);
  drip(0.2, 0.04, rustM, -(R + 0.004), 0.86, 0.03, -Math.PI / 2);
  drip(0.14, 0.03, rustM, 0.0, 0.26, R + 0.004, 0);     // stain under the lower hoop, south side
  // sand fillet around the base as a low mound, and blown against the north side
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  lathe([[R - 0.02, 0.09], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  const drift = lathe([[0.0, 0.14], [R * 0.6, 0.1], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  drift.scale.set(0.95, 1, 0.5); drift.position.z = -0.12;
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
    const pp = n.isMesh && n.geometry.attributes.position; if (!pp) return;
    const put = (mm) => { for (let i = 0; i < pp.count; i++) box3.expandByPoint(v.fromBufferAttribute(pp, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
