// culvert_crossing candidate 2: a different reading. The barrel is four precast
// box segments of 1.85 m with open joints and chamfered joint edges, lifting
// lugs on the crown of each, a heavier collar headwall with chamfered top
// corners and a coping, wing walls as two stepped blocks, the silt floor as a
// displaced plane with a meandering channel and tyre ruts running through.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xb8ae9b, 'stone', 0.90, 0.0);
  const concB = M(0xbfb5a1, 'stone', 0.90, 0.0);      // alternate segment tone
  const concS = M(0xc5bba7, 'stone', 0.90, 0.0);
  const concN = M(0xaba191, 'stone', 0.90, 0.0);
  const concIn = M(0x8a8275, 'stone', 0.92, 0.0, true);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0, true);
  const stainD = M(0x6f6759, 'stone', 0.94, 0.0, true);
  const groove = M(0x625b4e, 'stone', 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const lug = M(0x4f5257, 'metal', 0.75, 0.4);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const silt = M(0xc1ac86, 'ground', 0.95, 0.0, true);
  const packed = M(0xa89372, 'ground', 0.95, 0.0);
  const sand = M(0xc7b28a, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };

  const IW = 2.4, WT = 0.35, IH = 2.0, FL = 0.12, RT = 0.38;
  const OW = IW + 2 * WT, roofTop = FL + IH + RT;
  const SEG = 1.85, GAP = 0.03, NSEG = 4;
  const L = NSEG * SEG + (NSEG - 1) * GAP;      // 7.49

  // ---- four precast segments ----
  for (let i = 0; i < NSEG; i++) {
    const zc = -L / 2 + SEG / 2 + i * (SEG + GAP);
    const mat = i % 2 ? concB : conc;
    box(OW, FL, SEG, stainD, 0, FL / 2, zc);
    for (const sx of [-1, 1]) box(WT, IH, SEG, mat, sx * (IW / 2 + WT / 2), FL + IH / 2, zc);
    box(OW, RT, SEG, mat, 0, FL + IH + RT / 2, zc);
    // chamfered joint edges: dark strips at each segment end, outside and on the crown
    for (const e of [-1, 1]) {
      const ez = zc + e * (SEG / 2 - 0.02);
      for (const sx of [-1, 1]) box(0.02, roofTop - 0.45, 0.04, groove, sx * (OW / 2 + 0.002), roofTop / 2 + 0.2, ez);
      box(OW + 0.004, 0.02, 0.04, groove, 0, roofTop + 0.002, ez);
    }
    // interior skins per segment: darker walls, stained band, ceiling
    for (const sx of [-1, 1]) {
      box(0.01, IH - 0.02, SEG - 0.02, concIn, sx * (IW / 2 - 0.005), FL + IH / 2, zc);
      box(0.012, 0.7, SEG - 0.02, stainD, sx * (IW / 2 - 0.012), FL + 0.35, zc);
      box(0.01, 0.05, SEG - 0.02, stain, sx * (IW / 2 - 0.014), FL + 0.74, zc);
    }
    box(IW - 0.02, 0.01, SEG - 0.02, concIn, 0, FL + IH - 0.005, zc);
    // lifting lugs on the crown, two per segment, rust bloom around them
    for (const lx of [-0.8, 0.8]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), lug);
      r.position.set(lx, roofTop + 0.06, zc); g.add(r);
      box(0.2, 0.01, 0.2, rustD, lx, roofTop + 0.005, zc);
    }
    // exterior stained base, rust runs down from the crown joints
    for (const sx of [-1, 1]) {
      box(0.02, 0.4, SEG, stain, sx * (OW / 2 + 0.005), 0.2, zc);
      box(0.006, 0.45, 0.05, rust, sx * (OW / 2 + 0.012), roofTop - 0.45, zc + SEG / 2 - 0.06);
      box(0.006, 0.28, 0.025, rustD, sx * (OW / 2 + 0.014), roofTop - 0.75, zc + SEG / 2 - 0.05);
      if (i % 2) box(0.006, 0.3, 0.04, rust, sx * (OW / 2 + 0.012), roofTop - 0.35, zc - 0.3);
    }
    box(OW - 0.14, 0.012, SEG - 0.1, dust, 0, roofTop + 0.006, zc);
  }
  // ---- silt floor: displaced plane with a meandering channel, along the full length ----
  {
    const geo = new THREE.PlaneGeometry(IW - 0.02, L + 0.4, 12, 40);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);       // y is along z after rotation
      const ch = 0.25 * Math.sin(y * 0.9);        // channel meanders
      const d = Math.abs(x - ch);
      let h = 0.20 - 0.13 * Math.max(0, 1 - d / 0.45);
      h += 0.012 * Math.sin(x * 9 + y * 3);
      p.setZ(i, h);
    }
    geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, silt); mm.rotation.x = -Math.PI / 2; mm.position.y = FL; g.add(mm);
    // side skirts so the silt layer has thickness at the ends
    box(IW - 0.02, 0.06, 0.02, packed, 0, FL + 0.03, L / 2 + 0.19);
    box(IW - 0.02, 0.06, 0.02, packed, 0, FL + 0.03, -L / 2 - 0.19);
  }

  // ---- collar headwalls with chamfered top corners and a coping ----
  const HW = OW + 0.16, HT = 2.35;
  for (const sz of [-1, 1]) {
    const face = sz > 0 ? concS : concN;
    const zc = sz * (L / 2 + 0.17);
    box(HW, HT - (FL + IH), 0.34, face, 0, (FL + IH + HT) / 2, zc);
    for (const sx of [-1, 1]) box((HW - IW) / 2, FL + IH, 0.34, face, sx * (IW / 2 + (HW - IW) / 4), (FL + IH) / 2, zc);
    box(HW, 0.4, 0.35, stain, 0, 0.2, zc);
    // chamfered top corners: a rotated block cut across each corner in stained tone
    for (const sx of [-1, 1]) box(0.22, 0.18, 0.36, stainD, sx * (HW / 2 - 0.12), HT - 0.1, zc);   // dark spalled corner patch
    // opening reveal, darker, and the sill lip
    box(0.04, IH, 0.36, concIn, -(IW / 2 + 0.02), FL + IH / 2, zc);
    box(0.04, IH, 0.36, concIn, (IW / 2 + 0.02), FL + IH / 2, zc);
    box(IW + 0.08, 0.04, 0.36, concIn, 0, FL + IH - 0.02, zc);
    box(IW + 0.4, 0.06, 0.06, stain, 0, FL + 0.03, zc + sz * 0.19);
    // coping and rebar stubs with rust runs
    box(HW + 0.12, 0.12, 0.44, conc, 0, HT + 0.06, zc);
    box(HW + 0.04, 0.13, 0.40, concB, 0, HT + 0.185, zc);
    box(HW - 0.06, 0.012, 0.34, dust, 0, HT + 0.256, zc);
    for (const rx of [-1.25, -0.5, 0.5, 1.25]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), rustD);
      r.position.set(rx, HT + 0.25 + 0.08, zc + sz * 0.06); g.add(r);
      box(0.05, 0.02, 0.05, rustD, rx, HT + 0.252, zc + sz * 0.06);
      box(0.04, 0.55, 0.006, rust, rx, HT - 0.22, zc + sz * 0.174);
      box(0.02, 0.3, 0.006, rustD, rx + (rx > 0 ? 0.03 : -0.03), HT - 0.55, zc + sz * 0.176);
    }
    // a lamp bracket bolt pair on the sun side with rust
    for (const bx of [-0.9, 0.9]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), rust);
      b.rotation.x = Math.PI / 2; b.position.set(bx, 0.55, zc + sz * 0.18); g.add(b);
      box(0.03, 0.15, 0.006, rust, bx, 0.45, zc + sz * 0.174);
    }
    // wing walls: two stepped blocks each, splayed 30 degrees off the axis
    for (const sx of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(sx * (HW / 2 - 0.2), 0, zc + sz * 0.17);
      wg.rotation.y = sx * sz * Math.PI / 6;                        // flares FORWARD and outward from the headwall face
      g.add(wg);
      box(0.26, 2.1, 0.22, conc, sx * 0.13, 1.05, sz * 0.11, wg);
      box(0.26, 1.5, 0.18, conc, sx * 0.13, 0.75, sz * 0.31, wg);
      box(0.27, 0.4, 0.4, stain, sx * 0.13, 0.2, sz * 0.2, wg);
      box(0.2, 0.012, 0.18, dust, sx * 0.13, 2.106, sz * 0.11, wg);
      box(0.2, 0.012, 0.14, dust, sx * 0.13, 1.506, sz * 0.31, wg);
      const an = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 8), rust); an.rotation.y = Math.PI / 2; an.position.set(sx * 0.265, 1.6, sz * 0.11); wg.add(an);
      box(0.006, 0.5, 0.05, rust, sx * 0.264, 1.3, sz * 0.11, wg);
      box(0.06, 0.9, 0.06, lug, sx * 0.13, 1.95, sz * 0.36, wg);                                  // marker post on the wing end
      box(0.012, 0.22, 0.14, M(0xc9a227, 'metal', 0.8, 0.2), sx * 0.166, 2.2, sz * 0.36, wg);
      box(0.006, 0.3, 0.04, rust, sx * 0.164, 1.85, sz * 0.36, wg);
      box(0.2, 0.05, 0.2, sand, sx * 0.13, 0.025, sz * 0.3, wg);
    }
  }
  // ---- sand fillet and tyre ruts through the tunnel approaches ----
  for (const sx of [-1, 1]) {
    box(0.25, 0.10, L - 0.2, sand, sx * (OW / 2 + 0.12), 0.05, 0);
    box(0.15, 0.10, L - 1.0, sand, sx * (OW / 2 + 0.07), 0.15, 0.2);
    box(0.08, 0.06, 2.4, dust, sx * (OW / 2 + 0.04), 0.23, -1.0);
  }
  for (const sz of [-1, 1]) {
    box(1.4, 0.08, 0.3, sand, sz * 0.9, 0.04, sz * (L / 2 + 0.48));
    box(0.7, 0.05, 0.2, dust, sz * 0.7, 0.10, sz * (L / 2 + 0.43));
  }
  // ---- r4 detail pass: tie holes, coping angle with bolts, anchor plates, weep pipes, marker posts, interior fittings ----
  {
    const steel = M(0x4f5257, 'metal', 0.75, 0.35);
    const galvD = M(0x8d9290, 'metal', 0.74, 0.5);
    const yellow = M(0xc9a227, 'metal', 0.80, 0.2);
    const rock = M(0xc4b393, 'stone', 0.92, 0.0);
    const holeM = M(0x5a5348, 'stone', 0.95, 0.0, true);
    const cone = (x, y, z, rx, rz, mat) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.014, 6), mat || rust); b.rotation.x = rx; b.rotation.z = rz; b.position.set(x, y, z); g.add(b); return b; };
    for (const sz of [-1, 1]) {
      const zc = sz * (L / 2 + 0.17), zf = zc + sz * 0.17;     // headwall centre and its outer face
      // form tie holes, two rows of four
      for (const ty of [0.9, 1.7]) for (const tx of [-1.25, -0.45, 0.45, 1.25]) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6, 1, true), holeM);
        h.rotation.x = Math.PI / 2; h.position.set(tx, ty, zf); g.add(h);
      }
      // steel edge angle on the outer top edge of the coping, five bolts, rust runs down the coping
      box(HW + 0.12, 0.04, 0.05, steel, 0, HT + 0.23, zc + sz * 0.195);
      box(HW + 0.12, 0.05, 0.012, steel, 0, HT + 0.185, zc + sz * 0.214);
      for (const bx of [-1.4, -0.7, 0, 0.7, 1.4]) { cone(bx, HT + 0.257, zc + sz * 0.195, 0, 0); box(0.03, 0.22, 0.006, rust, bx + 0.02, HT + 0.05, zc + sz * 0.223); }
      // cast in anchor plate on the crown with four bolts and a streak
      box(0.3, 0.2, 0.012, steel, 0, HT - 0.35, zf);
      for (const [bx, by] of [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]]) cone(bx, HT - 0.35 + by, zf + sz * 0.013, sz * Math.PI / 2, 0);
      box(0.08, 0.5, 0.006, rust, 0.04, HT - 0.72, zf + sz * 0.002);
      box(0.03, 0.3, 0.006, rustD, -0.06, HT - 0.62, zf + sz * 0.003);
      // weep pipes through the headwall with rust below
      for (const wx of [-1.15, 1.15]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8, 1, true), rustD);
        w.rotation.x = Math.PI / 2; w.position.set(wx, 0.85, zf + sz * 0.06); g.add(w);
        box(0.08, 0.45, 0.006, rust, wx, 0.55, zf + sz * 0.003);
      }
      // drip groove under the coping
      box(HW - 0.1, 0.02, 0.012, groove, 0, HT - 0.06, zf);
      // one bent rebar stub per end
      const bent = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 6), rustD);
      bent.rotation.z = sz * 0.9; bent.position.set(-0.9 + sz * 0.1, HT + 0.31, zc - sz * 0.05); g.add(bent);
      // sand drift wedge just inside each mouth and the rubble outside the south mouth
      box(IW - 0.1, 0.08, 0.6, sand, 0, FL + 0.2, sz * (L / 2 - 0.3));
      box(IW - 0.6, 0.06, 0.35, dust, sz * 0.2, FL + 0.27, sz * (L / 2 - 0.35));
    }
    for (const [rx, ry, rz, s, r] of [[1.3, 0.1, L / 2 + 0.45, 0.26, 0.4], [1.5, 0.08, L / 2 + 0.25, 0.2, 1.1], [1.05, 0.07, L / 2 + 0.6, 0.16, 0.7]]) {
      const b = box(s, s * 0.7, s * 0.8, rock, rx, ry, rz); b.rotation.y = r; b.rotation.z = 0.15;
    }
    // interior: conduit along the ceiling corner with clips and a junction box, spall with rebar on the east wall
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L - 0.2, 6), galvD);
    cd.rotation.x = Math.PI / 2; cd.position.set(IW / 2 - 0.1, FL + IH - 0.08, 0); g.add(cd);
    for (const cz of [-2.6, -0.9, 0.9, 2.6]) box(0.06, 0.04, 0.04, steel, IW / 2 - 0.06, FL + IH - 0.08, cz);
    box(0.15, 0.2, 0.15, steel, IW / 2 - 0.085, FL + IH - 0.3, -1.6);
    box(0.006, 0.4, 0.1, rust, IW / 2 - 0.02, FL + IH - 0.6, -1.6);
    box(0.008, 0.25, 0.4, groove, IW / 2 - 0.012, FL + 1.1, 1.4);
    for (const ry of [FL + 1.04, FL + 1.16]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5), rustD); r.rotation.x = Math.PI / 2; r.position.set(IW / 2 - 0.02, ry, 1.4); g.add(r); }
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
