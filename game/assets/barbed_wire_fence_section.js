// barbed_wire_fence_section r4 detail pass. Same posts, feet, mesh, strands and coil as c1, made
// strict: a flat tension bar at each post with seven wire ties round the post, hog rings every
// 0.25 m on the top and bottom wires, a head plate with two hex bolts and rust drips where the arm
// meets the post, a grout collar and a crack on each foot, a rust band on the post foot, clip rings
// where the coil crosses the barbed strands, crossed barb clusters and a second inner helix so the
// coil reads dense, a dent bulged out of the lower corner of the mesh (the mesh strips are cut into
// 0.3 m pieces so they can bend), a red contrast plate tied to the mesh, four stones at the foot.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, concB: 0xb8ae9b, concS: 0x857c6c, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, gun: 0x3a3d40, red: 0x9c4a3c, rock: 0xc4b393 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.3, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const ext = (sh, depth) => new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  const mPost = mat(P.galv, 'metal', 0.7, 0.5, true), mPostS = mat(shade(P.galv, 1.07), 'metal', 0.7, 0.5, true), mPostD = mat(shade(P.galv, 0.85), 'metal', 0.8, 0.4, true);
  const mWire = mat(shade(P.galv, 0.92), 'metal', 0.7, 0.55, true), mWireR = mat(shade(P.rust, 1.25), 'metal', 0.9, 0.2, true);
  const mBarb = mat(P.rust, 'metal', 0.95, 0.1), mBolt = mat(P.gun, 'metal', 0.7, 0.5), mRust = mat(P.rust, 'metal', 0.95, 0.05);
  const mFoot = mat(P.concB, 'stone', 0.95, 0), mFootS = mat(P.concS, 'stone', 0.95, 0), mStone = mat(P.rock, 'stone', 0.95, 0);
  const mPlate = mat(P.red, 'metal', 0.85, 0.15);
  const mSand = mat(P.sand, 'ground', 0.95, 0), mDust = mat(P.sand, 'ground', 0.95, 0);

  const PX = 1.43, PH = 2.3, PW = 0.07;
  const chan = (open) => { const t = 0.008, w = PW, d = PW; const sh = new THREE.Shape(); const s = open; sh.moveTo(-w / 2, -d / 2); sh.lineTo(w / 2, -d / 2); sh.lineTo(w / 2, d / 2); sh.lineTo(-w / 2, d / 2); sh.lineTo(-w / 2, d / 2 - t); sh.lineTo(w / 2 - t * s, d / 2 - t); sh.lineTo(w / 2 - t * s, -d / 2 + t); sh.lineTo(-w / 2, -d / 2 + t); sh.closePath(); return sh; };
  const footGeo = new THREE.LatheGeometry([[0.2, 0], [0.2, 0.08], [0.17, 0.25], [0, 0.25]].map(([r, y]) => new THREE.Vector2(r, y)), 4);
  const X0 = -PX + 0.045, X1 = PX - 0.045, Y0 = 0.06, Y1 = 2.1;
  for (const sx of [-1, 1]) {
    const x = sx * PX;
    const f = add(footGeo, mFoot, x, 0, 0); f.rotation.y = PI / 4;
    add(new THREE.LatheGeometry([[0.205, 0], [0.205, 0.09], [0.19, 0.09]].map(([r, y]) => new THREE.Vector2(r, y)), 4), mFootS, x, 0, 0).rotation.y = PI / 4;
    add(new THREE.BoxGeometry(0.2, 0.008, 0.2), mDust, x, 0.254, 0);
    // grout collar round the post and a crack in the foot face
    add(new THREE.LatheGeometry([[0.05, 0], [0.085, 0], [0.075, 0.035], [0.05, 0.05]].map(([r, y]) => new THREE.Vector2(r, y)), 8), mFootS, x, 0.25, 0);
    add(new THREE.BoxGeometry(0.008, 0.14, 0.004), mFootS, x + sx * 0.03, 0.1, 0.132).rotation.z = 0.25;
    const pg = ext(chan(1), PH - 0.25); pg.rotateX(-PI / 2); pg.rotateY(sx > 0 ? PI : 0);
    add(pg, mPost, x, 0.25, 0);
    add(new THREE.BoxGeometry(PW - 0.01, PH - 0.3, 0.004), mPostS, x, 0.25 + (PH - 0.25) / 2, PW / 2 + 0.001);
    add(new THREE.BoxGeometry(PW + 0.006, 0.22, PW + 0.006), mRust, x, 0.3 + 0.11, 0);                 // rust band at the foot
    add(new THREE.BoxGeometry(PW + 0.004, 0.012, PW + 0.004), mPostD, x, PH - 0.002, 0);
    // arm: extruded channel too, leaning 20 degrees outward
    const arm = new THREE.Group(); arm.position.set(x, PH - 0.02, 0); arm.rotation.x = -0.35; g.add(arm);
    const ag = ext(chan(1), 0.3); ag.rotateX(-PI / 2); ag.scale(0.7, 1, 0.7);
    add(ag, mPostD, 0, 0, 0, arm);
    for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 5), mWire, 0, 0.09 + k * 0.09, 0.03, arm).rotation.z = PI / 2;
    // head plate: a bolted plate on the front of the post head, two hex bolts, rust drips
    add(new THREE.BoxGeometry(0.1, 0.11, 0.01), mPostD, x, PH - 0.075, PW / 2 + 0.005);
    for (const bx of [-0.03, 0.03]) { add(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 6), mBolt, x + bx, PH - 0.06, PW / 2 + 0.014).rotation.x = PI / 2; add(new THREE.BoxGeometry(0.016, 0.22, 0.003), mRust, x + bx, PH - 0.2, PW / 2 + 0.011); }
    const gs = new THREE.Shape(); gs.moveTo(0, 0); gs.lineTo(0, 0.12); gs.lineTo(0.08, 0); gs.closePath();
    const gg = ext(gs, 0.006); gg.rotateY(PI / 2);
    add(gg, mPostD, x, PH - 0.13, PW / 2);
    // tension bar and seven wire ties round the post
    const tbx = x - sx * (PW / 2 + 0.016);
    add(new THREE.BoxGeometry(0.004, Y1 - Y0, 0.025), mPostD, tbx, (Y0 + Y1) / 2, 0.0);
    for (let k = 0; k < 7; k++) { const y = Y0 + 0.15 + k * (Y1 - Y0 - 0.3) / 6; add(new THREE.TorusGeometry(0.052, 0.003, 4, 10), k % 2 ? mWireR : mWire, x - sx * 0.01, y, 0).rotation.x = PI / 2; add(new THREE.BoxGeometry(0.02, 0.12, 0.003), mRust, tbx, y - 0.08, 0.014); }
  }
  // chain link: diagonal quads cut into 0.3 m pieces so the lower corner can bulge (the dent)
  const pitch = 0.05 * Math.SQRT2, hw = 0.0028;
  const dentZ = (x, y) => { const dx = (x - (X1 - 0.45)) / 0.4, dy = (y - (Y0 + 0.35)) / 0.4; const r2 = dx * dx + dy * dy; return r2 < 1 ? 0.07 * (1 - r2) * (1 - r2) : 0; };
  const pos = [], posR = [];
  let n = 0;
  for (const dir of [1, -1]) {
    for (let c = -(Y1 + 0.2); c < X1 - X0 + Y1 + 0.2; c += pitch) {
      const yAt = (x) => Y0 + dir * (x - X0) - c;
      const xs = [X0, X1, c / dir + X0, (Y1 - Y0 + c) / dir + X0].sort((a, b) => a - b);
      const xa = Math.max(X0, xs[1]), xb = Math.min(X1, xs[2]);
      if (xb - xa < 0.03) continue;
      const ya = yAt(xa), yb = yAt(xb);
      if (ya < Y0 - 1e-6 || ya > Y1 + 1e-6 || yb < Y0 - 1e-6 || yb > Y1 + 1e-6) continue;
      const nx = -(yb - ya), ny = (xb - xa); const L = Math.hypot(nx, ny); const ox = (nx / L) * hw, oy = (ny / L) * hw;
      const buf = (n++ % 7 === 0) ? posR : pos;
      const zz = dir > 0 ? 0.002 : -0.002;
      const segs = Math.max(1, Math.ceil(L / 0.3));
      for (let sgi = 0; sgi < segs; sgi++) {
        const t0 = sgi / segs, t1 = (sgi + 1) / segs;
        const x0 = xa + (xb - xa) * t0, y0 = ya + (yb - ya) * t0, x1 = xa + (xb - xa) * t1, y1 = ya + (yb - ya) * t1;
        const z0 = zz + dentZ(x0, y0), z1 = zz + dentZ(x1, y1);
        buf.push(x0 - ox, y0 - oy, z0, x1 - ox, y1 - oy, z1, x1 + ox, y1 + oy, z1, x0 - ox, y0 - oy, z0, x1 + ox, y1 + oy, z1, x0 + ox, y0 + oy, z0);
      }
    }
  }
  for (const [buf, m] of [[pos, mWire], [posR, mWireR]]) { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(buf, 3)); ge.computeVertexNormals(); add(ge, m); }
  // tension wires with hog rings every 0.25 m; the bottom wire kinks out through the dent
  for (const y of [Y0, Y1]) {
    if (y === Y0) {
      add(new THREE.CylinderGeometry(0.003, 0.003, X1 - 0.85 - X0, 5), mWire, (X0 + X1 - 0.85) / 2, y, 0.006).rotation.z = PI / 2;
      const kink = new THREE.CatmullRomCurve3([new THREE.Vector3(X1 - 0.85, y, 0.006), new THREE.Vector3(X1 - 0.45, y + 0.01, 0.04), new THREE.Vector3(X1 - 0.1, y, 0.006), new THREE.Vector3(X1 + 0.03, y, 0.006)]);
      add(new THREE.TubeGeometry(kink, 6, 0.003, 4, false), mWire);
    } else add(new THREE.CylinderGeometry(0.003, 0.003, X1 - X0 + 0.06, 5), mWire, 0, y, 0.006).rotation.z = PI / 2;
    for (let x = X0 + 0.15; x < X1; x += 0.25) add(new THREE.TorusGeometry(0.008, 0.002, 3, 6), mWireR, x, y, 0.003 + dentZ(x, y)).rotation.y = PI / 2;
  }
  // barbed strands: tube plus barb knots
  const strandY = [], strandZ = [];
  for (let k = 0; k < 3; k++) {
    const t = 0.09 + k * 0.09;
    const y = PH - 0.02 + t * Math.cos(0.35), z = t * Math.sin(0.35) + 0.03;
    strandY.push(y); strandZ.push(z);
    add(new THREE.CylinderGeometry(0.003, 0.003, 2 * PX, 5), mWire, 0, y, z).rotation.z = PI / 2;
    for (let x = -PX + 0.075; x < PX; x += 0.15) { const b2 = add(new THREE.BoxGeometry(0.03, 0.004, 0.004), mBarb, x, y, z); b2.rotation.set(0.5, 0.6, -0.7); }
  }
  // concertina: outer helix, inner helix half a turn out of phase, crossed barb clusters, clip rings to the strands
  const R = 0.15, CY = 2.45, turns = 18;
  const pts = [], pts2 = [];
  for (let i = 0; i <= turns * 8; i++) { const a = (i / 8) * PI * 2, x = -PX + 0.02 + (i / (turns * 8)) * (2 * PX - 0.04); pts.push(new THREE.Vector3(x, CY + Math.cos(a) * R, Math.sin(a) * R)); pts2.push(new THREE.Vector3(x + 0.03, CY + Math.cos(a + PI) * R * 0.9, Math.sin(a + PI) * R * 0.9)); }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 8, 0.0035, 3, false), mWire, 0, 0, 0);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), turns * 8, 0.003, 3, false), mWireR, 0, 0, 0);
  for (let i = 0; i < turns * 4; i++) {
    const p = pts[Math.floor((i / (turns * 4)) * pts.length)];
    for (const rot of [0, 1.2]) { const b = add(new THREE.BoxGeometry(0.024, 0.004, 0.004), mBarb, p.x, p.y, p.z); b.rotation.y = i * 1.3 + rot; b.rotation.x = i * 0.7; }
  }
  for (let t = 1; t < turns; t += 3) { const p = pts[t * 8 + 1]; add(new THREE.TorusGeometry(0.014, 0.003, 4, 8), mWireR, p.x, strandY[2] + 0.004, strandZ[2] + 0.002).rotation.y = PI / 2; }
  for (let t = 2; t < turns; t += 5) { const p = pts[t * 8 + 5]; add(new THREE.TorusGeometry(0.012, 0.003, 4, 8), mWire, p.x, p.y, p.z).rotation.x = PI / 2; }   // ties between the two helices
  // red contrast plate tied to the mesh, with its rust drip
  add(new THREE.BoxGeometry(0.2, 0.15, 0.006), mPlate, 0.55, 1.42, 0.012);
  for (const px of [0.47, 0.63]) { add(new THREE.TorusGeometry(0.01, 0.002, 3, 6), mWireR, px, 1.5, 0.008).rotation.y = PI / 2; add(new THREE.TorusGeometry(0.01, 0.002, 3, 6), mWireR, px, 1.35, 0.008).rotation.y = PI / 2; }
  add(new THREE.BoxGeometry(0.03, 0.12, 0.002), mRust, 0.58, 1.28, 0.012);
  // drift wedges along the mesh foot, both sides, and four stones
  const wedge = (out, h, len) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(out, 0); sh.lineTo(0, h); sh.closePath(); const ge = ext(sh, len); ge.rotateY(-PI / 2); ge.translate(len / 2, 0, 0); return ge; };
  add(wedge(0.14, 0.12, 2.6), mSand, 0, 0, 0.01);
  add(wedge(-0.12, 0.09, 2.2), mSand, 0.15, 0, -0.01);
  add(new THREE.CylinderGeometry(0.06, 0.15, 0.1, 8), mSand, PX - 0.25, 0.05, 0.0);
  for (const [sxx, sz, a] of [[-0.9, 0.1, 0.08], [0.3, 0.12, 0.06], [1.0, -0.1, 0.07], [-1.6, -0.08, 0.05]]) { const st = add(new THREE.BoxGeometry(a, a * 0.6, a * 0.8), mStone, sxx, a * 0.2, sz); st.rotation.set(0.3, sxx * 2, 0.2); }
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
