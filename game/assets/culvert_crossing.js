// culvert_crossing rebuild (round 13, audit item 3): a cast in place concrete box culvert, 8 m along Z,
// 2.4 x 2.0 m clear opening, 0.5 m walls and roof, headwalls with 30 degree wing walls and a parapet
// slab at both ends, a silt floor with a shallow channel and two recessed tyre tracks, staining bands
// inside and out, weep holes with rust runs, a rusted grille leaning at the north end and a sand drift
// blown into each mouth. Inside faces stay where the level's colliders expect them: walls at x = +-1.2,
// floor slab top at y = 0.12, ceiling at y = 2.12.
// The concrete parts name the 'concrete_bleached' set outright: the material system's ROCK_ASSETS rule
// sends the plain 'stone' recipe of anything called culvert to rock_desert, which is the strata texture
// that made the old file read as a striped timber box.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const CONC = 'concrete_bleached';
  const conc = M(0xb9b0a0, CONC, 0.90, 0.0);
  const concB = M(0xc2b9a7, CONC, 0.90, 0.0);      // parapet, coping: a touch paler, sun on top
  const concW = M(0xb2a998, CONC, 0.90, 0.0);      // wing walls
  const concIn = M(0x8b8478, CONC, 0.92, 0.0, true);
  const stain = M(0x837a6b, CONC, 0.93, 0.0, true);
  const stainD = M(0x6a6255, CONC, 0.94, 0.0, true);
  const tide = M(0x9b9282, CONC, 0.92, 0.0, true);
  const groove = M(0x5b5449, CONC, 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const silt = M(0xbfa984, 'ground', 0.95, 0.0, true);
  const packed = M(0x9d886a, 'ground', 0.95, 0.0);
  const packedD = M(0x86735a, 'ground', 0.96, 0.0);
  const sand = M(0xc9b48c, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, h, mat, x, y, z, rx, rz, parent, seg) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || (r >= 0.4 ? 24 : r >= 0.08 ? 16 : 8)), mat);
    mm.rotation.set(rx || 0, 0, rz || 0); mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };

  const IW = 2.4, WT = 0.5, IH = 2.0, FL = 0.12, RT = 0.5;
  const OW = IW + 2 * WT;                 // 3.4
  const roofTop = FL + IH + RT;           // 2.62
  const L = 7.3;                          // barrel between the headwall inner faces
  const HWT = 0.4;                        // headwall thickness
  const HT = 2.35;                        // headwall to the underside of the parapet
  const PT = 0.3;                         // parapet slab

  // ---- the barrel: floor slab, two walls, roof, cast as one ----
  box(OW, FL, L, stainD, 0, FL / 2, 0);
  for (const sx of [-1, 1]) box(WT, IH, L, conc, sx * (IW / 2 + WT / 2), FL + IH / 2, 0);
  box(OW, RT, L, conc, 0, FL + IH + RT / 2, 0);
  // two construction joints across the barrel, outside and over the crown, with a dark groove
  for (const jz of [-L / 6, L / 6]) {
    for (const sx of [-1, 1]) box(0.02, roofTop - 0.5, 0.04, groove, sx * (OW / 2 + 0.003), (roofTop + 0.5) / 2 - 0.05, jz);
    box(OW + 0.006, 0.02, 0.04, groove, 0, roofTop + 0.003, jz);
  }
  // outside: stained base band, tide line, dust on the crown, rust runs below the crown joints
  for (const sx of [-1, 1]) {
    box(0.02, 0.45, L, stain, sx * (OW / 2 + 0.006), 0.225, 0);
    box(0.02, 0.06, L, stainD, sx * (OW / 2 + 0.008), 0.48, 0);
    for (const rz of [-2.6, -0.4, 1.9]) {
      box(0.008, 0.5, 0.06, rust, sx * (OW / 2 + 0.014), roofTop - 0.42, rz);
      box(0.008, 0.3, 0.03, rustD, sx * (OW / 2 + 0.016), roofTop - 0.6, rz + 0.05);
    }
  }
  box(OW - 0.2, 0.012, L - 0.2, dust, 0, roofTop + 0.006, 0);
  // interior skins: darker walls and ceiling, a 0.7 m stained band, a pale tide line above it
  for (const sx of [-1, 1]) {
    box(0.01, IH - 0.02, L, concIn, sx * (IW / 2 - 0.005), FL + IH / 2, 0);
    box(0.012, 0.7, L, stainD, sx * (IW / 2 - 0.012), FL + 0.35, 0);
    box(0.012, 0.05, L, tide, sx * (IW / 2 - 0.014), FL + 0.74, 0);
    box(0.012, 0.03, L, stain, sx * (IW / 2 - 0.014), FL + 0.82, 0);
  }
  box(IW - 0.02, 0.01, L, concIn, 0, FL + IH - 0.005, 0);
  // interior weep holes through the walls at the stain line, three per side, with a run below each
  for (const sx of [-1, 1]) for (const wz of [-2.4, 0, 2.4]) {
    cyl(0.03, 0.05, groove, sx * (IW / 2 - 0.02), FL + 0.5, wz, 0, Math.PI / 2, null, 8);
    box(0.008, 0.36, 0.09, stainD, sx * (IW / 2 - 0.022), FL + 0.3, wz);
  }
  // ---- silt floor: a displaced plane with a channel and two recessed tyre tracks ----
  const RUT = 0.72, RUTW = 0.14;
  const siltH = (x, y) => {
    const ch = 0.18 * Math.sin(y * 0.8);                         // channel meanders a little
    const d = Math.abs(x - ch);
    let h = 0.20 - 0.10 * Math.max(0, 1 - d / 0.45);
    for (const rx of [-RUT, RUT]) { const t = Math.abs(x - rx); if (t < RUTW) h -= 0.045 * (1 - (t / RUTW) * (t / RUTW)); }
    h += 0.010 * Math.sin(x * 9 + y * 3) + 0.006 * Math.sin(x * 21 - y * 7);
    return h;
  };
  {
    const geo = new THREE.PlaneGeometry(IW - 0.02, L + 0.02, 24, 30);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, siltH(p.getX(i), p.getY(i)));
    geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, silt); mm.rotation.x = -Math.PI / 2; mm.position.y = FL; g.add(mm);
    // packed tread at the bottom of each rut so the tracks read as darker strips from the mouth
    for (const rx of [-RUT, RUT]) box(0.10, 0.006, L, packedD, rx, FL + 0.153, 0);
    // channel bed, darker where the water last stood
    box(0.2, 0.005, L * 0.6, packed, 0.05, FL + 0.103, -0.3);
  }

  // ---- headwalls, parapets, wing walls at both ends ----
  const HW = OW;                                  // 3.4 m wide, flush with the barrel
  for (const sz of [-1, 1]) {
    const zc = sz * (L / 2 + HWT / 2), zf = zc + sz * HWT / 2;   // headwall centre, outer face
    // jambs and lintel, the opening cut clean through
    for (const sx of [-1, 1]) box(WT, HT, HWT, conc, sx * (IW / 2 + WT / 2), HT / 2, zc);
    box(IW, HT - (FL + IH), HWT, conc, 0, (FL + IH + HT) / 2, zc);
    // stained base band and a drip line under the parapet
    box(HW, 0.45, 0.02, stain, 0, 0.225, zf + sz * 0.002);
    box(HW - 0.1, 0.02, 0.02, groove, 0, HT - 0.08, zf + sz * 0.003);
    // opening reveal and the soffit, darker, and a spalled patch on the lintel corner
    for (const sx of [-1, 1]) box(0.012, IH, HWT + 0.02, concIn, sx * (IW / 2 + 0.006), FL + IH / 2, zc);
    box(IW + 0.02, 0.012, HWT + 0.02, concIn, 0, FL + IH - 0.006, zc);
    box(0.5, 0.18, 0.02, stainD, sz * 0.9, FL + IH + 0.09, zf + sz * 0.003);
    // parapet slab, oversailing 0.1 m each side and 0.05 front and back, with dust on top
    box(HW + 0.2, PT, HWT + 0.1, concB, 0, HT + PT / 2, zc);
    box(HW - 0.1, 0.012, HWT - 0.05, dust, 0, HT + PT + 0.006, zc);
    // four rusted rebar stubs out of the parapet, each with a run down the face
    for (const rx of [-1.2, -0.4, 0.4, 1.2]) {
      cyl(0.014, 0.18, rustD, rx, HT + PT + 0.09, zc + sz * 0.05, 0, sz * 0.12, null, 8);
      box(0.06, 0.02, 0.06, rustD, rx, HT + PT + 0.012, zc + sz * 0.05);
      box(0.05, 0.22 + 0.1 * Math.abs(rx), 0.008, rust, rx, HT + PT - 0.12 - 0.05 * Math.abs(rx), zf + sz * 0.052);
      if (rx > 0) box(0.025, 0.18, 0.008, rustD, rx + 0.03, HT - 0.05, zf + sz * 0.054);
    }
    // weep holes through the headwall, two, with rust below
    for (const wx of [-1.0, 1.0]) {
      cyl(0.04, 0.12, rustD, wx, 0.75, zf, Math.PI / 2, 0, null, 8);
      box(0.08, 0.4, 0.008, rust, wx, 0.5, zf + sz * 0.004);
    }
    // form tie holes, two rows
    for (const ty of [1.0, 1.75]) for (const tx of [-1.35, -0.55, 0.55, 1.35]) cyl(0.018, 0.02, groove, tx, ty, zf, Math.PI / 2, 0, null, 6);
    // wing walls: 0.6 m long, splayed 30 degrees forward and outward, stepped down toward the end
    for (const sx of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(sx * (HW / 2 - 0.22), 0, zf);
      wg.rotation.y = sx * sz * Math.PI / 6;
      g.add(wg);
      box(0.3, HT, 0.5, concW, 0, HT / 2, sz * 0.25, wg);                 // wing body
      box(0.34, 0.16, 0.54, concB, 0, HT + 0.08, sz * 0.25, wg);          // wing coping, steps down from the parapet
      box(0.3, 0.012, 0.48, dust, 0, HT + 0.166, sz * 0.25, wg);
      box(0.32, 0.45, 0.5, stain, 0, 0.225, sz * 0.25, wg);
      box(0.008, 0.5, 0.05, rust, sx * 0.164, HT - 0.35, sz * 0.4, wg);
    }
    // sand drift at the mouth: a displaced tongue from the jambs out onto the approach, ruts running through it
    {
      const DL = 0.45, DW = IW + 0.4;
      const geo = new THREE.PlaneGeometry(DW, DL, 20, 12);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const t = (y + DL / 2) / DL;                                       // 0 at the far end, 1 at the wall
        const edge = Math.max(0, 1 - Math.pow(Math.abs(x) / (DW / 2), 3));
        let h = (0.04 + 0.24 * t * t) * edge;
        h *= 1 + 0.15 * Math.sin(x * 4 + y * 2);
        for (const rx of [-RUT, RUT]) { const tt = Math.abs(x - rx); if (tt < RUTW) h -= 0.04 * h * 1.2 * (1 - (tt / RUTW) * (tt / RUTW)) / 0.3; }
        p.setZ(i, Math.max(0.01, h));
      }
      geo.computeVertexNormals();
      const mm = new THREE.Mesh(geo, sand);
      mm.rotation.x = -Math.PI / 2; mm.rotation.z = sz > 0 ? 0 : Math.PI;
      mm.position.set(0, 0.001, zf + sz * DL / 2 - sz * 0.02);
      g.add(mm);
      // the drift continues just inside the mouth as a ridge over the silt
      box(IW - 0.1, 0.10, 0.8, sand, 0, FL + 0.22, sz * (L / 2 - 0.4));
      box(IW - 0.8, 0.06, 0.5, dust, sz * 0.15, FL + 0.29, sz * (L / 2 - 0.3));
      for (const rx of [-RUT, RUT]) box(0.1, 0.006, 0.4, packedD, rx, 0.035, zf + sz * 0.2);
    }
  }
  // ---- a rusted grille, leaning against the north headwall beside the opening ----
  {
    const gr = new THREE.Group();
    const GW = 0.9, GH = 1.6;
    gr.position.set(1.45, 0.02, L / 2 + HWT + 0.3);
    gr.rotation.y = 0.12; gr.rotation.x = -0.18;                          // foot out on the sand, top resting on the headwall
    g.add(gr);
    box(GW, 0.05, 0.05, rustD, 0, GH - 0.025, 0, gr);
    box(GW, 0.05, 0.05, rustD, 0, 0.025, 0, gr);
    box(0.05, GH, 0.05, rustD, -GW / 2 + 0.025, GH / 2, 0, gr);
    box(0.05, GH, 0.05, rustD, GW / 2 - 0.025, GH / 2, 0, gr);
    for (let i = 1; i < 6; i++) box(0.022, GH - 0.1, 0.022, rust, -GW / 2 + i * (GW / 6), GH / 2, 0, gr);
    for (let i = 1; i < 4; i++) box(GW - 0.1, 0.022, 0.022, rust, 0, i * (GH / 4), 0.012, gr);
    box(0.06, 0.1, 0.022, rustD, 0.3, 0.9, 0.03, gr);                     // a hinge knuckle
    box(0.06, 0.1, 0.022, rustD, 0.3, 0.3, 0.03, gr);
    box(0.5, 0.05, 0.25, sand, 0.1, 0.005, 0.02, gr);                     // sand blown against its foot
  }
  // a smear of rust on the wall behind the grille, and a couple of concrete chunks on the south approach
  box(0.4, 0.8, 0.008, rust, 1.45, 0.75, L / 2 + HWT + 0.004);
  for (const [rx, ry, rz, s, r] of [[-1.25, 0.09, -(L / 2 + HWT + 0.22), 0.22, 0.5], [-1.55, 0.07, -(L / 2 + HWT + 0.12), 0.16, 1.2]]) {
    const b = box(s, s * 0.7, s * 0.8, conc, rx, ry, rz); b.rotation.y = r;
    cyl(0.01, s * 0.9, rustD, rx + s * 0.4, ry + s * 0.3, rz, 0, 1.2, null, 6);
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
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) box3.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
