// debris_scatter c1: profiles. Corrugated sheet as an ExtrudeGeometry of a sine polyline profile
// (one rib per 76 mm, 6 points per pitch) in two panels with a crease, boards as extruded planks
// with a jagged split end polygon, jerry can as an extruded can profile with the handle loops as
// holes and then crushed, cable coil as a TubeGeometry along a flat spiral, pipe as a lathe with
// wall thickness, bricks extruded with a frog, stones as flattened lathes, wedge drifts extruded.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 61; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, timber: 0xa07a4f, rubber: 0x1d1e20, red: 0x9c4a3c, concS: 0x857c6c };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false, flat = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, flatShading: flat }); if (name) m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const ext = (sh, depth) => new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  const mTimber = mat(P.timber, 'timber', 0.9), mTimberB = mat(shade(P.timber, 1.1), 'timber', 0.9), mTimberD = mat(shade(P.timber, 0.8), 'timber', 0.92);
  const mGalv = mat(P.galv, 'metal', 0.75, 0.5, true), mRust = mat(P.rust, 'metal', 0.95, 0.05, true), mSteel = mat(P.steel, 'metal', 0.8, 0.3, true);
  const mCable = mat(P.rubber, null, 0.85, 0.0);
  const mCan = mat(shade(P.red, 0.85), 'metal', 0.85, 0.15), mCanB = mat(P.red, 'metal', 0.85, 0.15);
  const mBrick = mat(shade(P.concS, 1.1), 'stone', 0.95), mBrickD = mat(P.concS, 'stone', 0.95);
  const mStone = mat(P.rock, 'stone', 0.95, 0, false, true), mStoneD = mat(shade(P.rock, 0.92), 'stone', 0.95, 0, false, true);
  const mSand = mat(P.sand, 'ground', 0.95), mDust = mat(P.sand, 'ground', 0.95);

  // wedge drift: triangle profile extruded along the piece
  const drift = (x, z, len, out, h, ry) => { len *= 0.65; out *= 0.8; h *= 0.7; const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-out, 0); sh.lineTo(0, h); sh.closePath(); const ge = ext(sh, len); ge.translate(0, 0, -len / 2); const o = add(ge, mSand, x, 0, z); o.rotation.y = ry; return o; };

  // plank with a jagged split end, drawn as a plan polygon and extruded 22 mm
  const plank = (L, W) => { const sh = new THREE.Shape(); sh.moveTo(-L / 2, -W / 2); sh.lineTo(L / 2 - 0.1, -W / 2); sh.lineTo(L / 2 + 0.05, -W / 4); sh.lineTo(L / 2 - 0.04, 0); sh.lineTo(L / 2 + 0.08, W / 3); sh.lineTo(L / 2 - 0.06, W / 2); sh.lineTo(-L / 2, W / 2); sh.closePath(); const ge = ext(sh, 0.022); ge.rotateX(-PI / 2); return ge; };
  const boards = [[-0.55, 0.55, 1.2, 0.35], [0.25, -0.6, 0.9, -0.7], [0.55, 0.35, 0.6, 1.3]];
  boards.forEach(([x, z, L, ry], i) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b);
    add(plank(L, 0.12), i === 1 ? mTimberD : mTimber, 0, 0, 0, b);
    add(new THREE.BoxGeometry(L * 0.8, 0.005, 0.09), mTimberB, -0.05, 0.024, 0, b);
    for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 5), mRust, -L / 2 + 0.08 + k * (L * 0.4), 0.025, 0.03, b);
    add(new THREE.BoxGeometry(0.04, 0.024, 0.1), mRust, -L / 2 + 0.12, 0.011, 0.0, b);
    drift(x, z, L * 0.8, 0.2, 0.05, ry);
  });
  // corrugated sheet profile: sine across 0.5 m, 6 points per 76 mm pitch, 3 mm thick
  const corrProfile = (w) => { const sh = new THREE.Shape(); const n = Math.round(w / 0.076) * 6; const pts = []; for (let i = 0; i <= n; i++) { const x = (i / n) * w - w / 2; pts.push([x, Math.sin((x / 0.076) * PI * 2) * 0.012]); } sh.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) sh.lineTo(x, y); for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i][0], pts[i][1] + 0.004); sh.closePath(); return sh; };
  const sheet = new THREE.Group(); sheet.position.set(-0.45, 0.014, -0.5); sheet.rotation.y = 0.5; g.add(sheet);
  const flatGeo = ext(corrProfile(0.5), 0.45); flatGeo.rotateY(PI / 2); flatGeo.translate(-0.42, 0, 0);
  add(flatGeo, mGalv, 0, 0, 0, sheet);
  const bent = new THREE.Group(); bent.position.set(0.03, 0.02, 0); bent.rotation.z = 0.6; sheet.add(bent);
  const bentGeo = ext(corrProfile(0.5), 0.35); bentGeo.rotateY(PI / 2);
  add(bentGeo, mGalv, 0, 0, 0, bent);
  add(new THREE.BoxGeometry(0.05, 0.04, 0.5), mRust, 0.02, 0.0, 0, sheet);
  add(new THREE.BoxGeometry(0.4, 0.012, 0.08), mRust, -0.2, 0.016, -0.25, sheet);
  add(new THREE.BoxGeometry(0.4, 0.004, 0.42), mDust, -0.2, 0.02, 0, sheet);
  add(new THREE.BoxGeometry(0.5, 0.02, 0.2), mSand, -0.3, 0.0, -0.22, sheet);
  drift(-0.75, -0.6, 0.5, 0.28, 0.07, 0.5);
  // cable coil: a flat spiral tube, 4 turns
  const spiralPts = []; for (let i = 0; i <= 64; i++) { const t = i / 64, a = t * PI * 2 * 4; const r = 0.14 + t * 0.06; spiralPts.push(new THREE.Vector3(Math.cos(a) * r, 0.012 + Math.sin(a * 2.3) * 0.004 + t * 0.03, Math.sin(a) * r)); }
  spiralPts.push(new THREE.Vector3(0.35, 0.012, 0.12));
  const coil = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 80, 0.011, 4, false), mCable, 0.6, 0, -0.25); coil.rotation.y = 0.3;
  drift(0.6, -0.25, 0.3, 0.14, 0.04, 0);
  // jerry can profile with handle holes, extruded 0.16, then crushed by scale and tilt
  const canSh = new THREE.Shape(); canSh.moveTo(-0.175, 0); canSh.lineTo(0.175, 0); canSh.lineTo(0.175, 0.22); canSh.lineTo(0.12, 0.3); canSh.lineTo(-0.12, 0.3); canSh.lineTo(-0.175, 0.22); canSh.closePath();
  for (let k = 0; k < 3; k++) { const h = new THREE.Path(); const cx = -0.06 + k * 0.06; h.moveTo(cx - 0.02, 0.23); h.lineTo(cx + 0.02, 0.23); h.lineTo(cx + 0.02, 0.26); h.lineTo(cx - 0.02, 0.26); h.closePath(); canSh.holes.push(h); }
  const can = new THREE.Group(); can.position.set(-0.05, 0, 0); can.rotation.y = -0.6; g.add(can);
  const canGeo = ext(canSh, 0.16); canGeo.translate(0, 0, -0.08);
  const canM = add(canGeo, mCan, 0, 0, 0, can); canM.rotation.z = 0.3; canM.rotation.x = 0.12; canM.scale.set(1, 0.7, 1); canM.position.y = 0.02;
  add(new THREE.BoxGeometry(0.3, 0.015, 0.14), mCanB, -0.02, 0.2, 0, can).rotation.z = 0.3;
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), mSteel, 0.12, 0.23, 0.04, can);
  add(new THREE.BoxGeometry(0.1, 0.05, 0.005), mRust, 0.05, 0.08, 0.082, can);
  drift(-0.05, 0, 0.3, 0.18, 0.05, -0.6);
  // bricks with a frog: outer rectangle minus an inner one, extruded 65 mm
  const brickSh = new THREE.Shape(); brickSh.moveTo(-0.1075, -0.05); brickSh.lineTo(0.1075, -0.05); brickSh.lineTo(0.1075, 0.05); brickSh.lineTo(-0.1075, 0.05); brickSh.closePath();
  const frog = new THREE.Path(); frog.moveTo(-0.06, -0.025); frog.lineTo(0.06, -0.025); frog.lineTo(0.06, 0.025); frog.lineTo(-0.06, 0.025); frog.closePath(); brickSh.holes.push(frog);
  [[0.05, 0.75, 0.4], [0.2, 0.72, -0.2]].forEach(([x, z, ry], i) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.set(i ? 0 : 0.08, ry, i ? 0.06 : 0); g.add(b);
    const ge = ext(brickSh, 0.055); ge.rotateX(-PI / 2);
    add(ge, i ? mBrickD : mBrick, 0, 0.01, 0, b);
    add(new THREE.BoxGeometry(0.215, 0.012, 0.1), mBrickD, 0, 0.006, 0, b);  // frog floor
    drift(x, z, 0.2, 0.1, 0.03, ry);
  });
  // pipe offcut: lathe with wall thickness, both ends open
  const pp = [[0.075, -0.25], [0.075, 0.25], [0.065, 0.25], [0.065, -0.25], [0.075, -0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const pipe = new THREE.Group(); pipe.position.set(0.55, 0.075, 0.7); pipe.rotation.y = 1.1; g.add(pipe);
  add(new THREE.LatheGeometry(pp, 10), mSteel, 0, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.CylinderGeometry(0.077, 0.077, 0.03, 10, 1, true), mRust, 0.235, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.CylinderGeometry(0.077, 0.077, 0.03, 10, 1, true), mRust, -0.235, 0, 0, pipe).rotation.z = PI / 2;
  add(new THREE.BoxGeometry(0.4, 0.005, 0.05), mDust, 0, 0.074, 0, pipe);
  drift(0.55, 0.7, 0.45, 0.2, 0.06, 1.1);
  // stones: flattened irregular lathes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.4, r = rr(0.55, 0.95), sz = rr(0.045, 0.07);
    const prof = [[0, 0], [sz * 0.8, 0.005], [sz, sz * 0.4], [sz * 0.7, sz * 0.75], [0, sz * 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
    const st = add(new THREE.LatheGeometry(prof, 6), i % 2 ? mStone : mStoneD, Math.cos(a) * r, 0, Math.sin(a) * r);
    st.rotation.y = rr(0, PI); st.scale.z = 0.8;
  }
  add(new THREE.BoxGeometry(0.7, 0.008, 0.25), mat(P.packed, 'ground', 0.95), 0.2, 0.004, 0.2).rotation.y = 0.4;
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
