// floodlight_mast r4 detail pass: tubular knee braces with gusset plates from the mast to the arm
// ends, an arm junction box with a drooping cable to each housing, lens frames, back fins, hinge
// bar and wing nuts on the housings, step bolts up the east face, taller anchor bolts with double
// nuts, a hasp on the junction box, a plated ID panel and a hazard band at eye height, and the two
// rust strips that floated off the arm are back on the steel.
// floodlight_mast candidate 2: a different reading of the reference, which shows a
// square tapered pole. Four trapezoid face plates (south bleached, north shaded, east
// and west mid) with a seam strip on each corner, a stepped concrete plinth with a
// broken edge, a heavier base plate with gusset ribs, a rectangular hollow cross arm
// with end caps, wide flat floodlight housings with a hood and a wire guard, a cable
// tray down the north face rather than a conduit, sand wedges on two sides.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds, emis) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    if (emis) { mat.emissive = new THREE.Color(emis); mat.emissiveIntensity = 1.2; }
    return mat;
  };
  const ox = M(0x7e4835, 'metal', 0.82, 0.15);
  const oxS = M(0x9c5842, 'metal', 0.79, 0.15);
  const oxN = M(0x7b3c29, 'metal', 0.85, 0.15);
  const oxE = M(0x874431, 'metal', 0.83, 0.15);
  const oxW = M(0x924d37, 'metal', 0.81, 0.15);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const house = M(0x9c988c, 'metal', 0.80, 0.25);
  const houseD = M(0x8c887d, 'metal', 0.82, 0.25);
  const conc = M(0xb8ae9b, 'stone', 0.92, 0.0);
  const concS = M(0x857c6c, 'stone', 0.94, 0.0);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const lens = M(0xc9a227, null, 0.5, 0.0, false, 0xffd9a0);
  const yel = M(0xc9a227, 'metal', 0.80, 0.15);   // hazard band
  const rub = M(0x1d1e20, null, 0.90, 0.0);       // cable: unnamed so surfaces.js skips it

  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // a straight rod from p to q
  const rod = (p, q, r, mat, seg) => { const d = q.clone().sub(p); const len = d.length(); const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 6), mat); mm.position.copy(p).lerp(q, 0.5); mm.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(mm); return mm; };

  const PH = 0.4, TOP = 9.0, ARM = 8.5, MH = TOP - PH;
  const half = (y) => 0.125 - (0.065 * (y - PH)) / MH;   // half width of the square at height y

  // ---- stepped plinth, broken corner, dust cap, sand wedges ----
  box(0.8, 0.22, 0.8, conc, 0, PH - 0.11, 0);
  box(0.84, 0.18, 0.84, concS, 0, 0.09, 0);
  box(0.7, 0.008, 0.7, dust, 0, PH + 0.004, 0);
  box(0.14, 0.1, 0.14, concS, 0.36, PH - 0.05, 0.36);        // a spalled corner, darker
  const w1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.2, 10), dust); w1.scale.set(1, 1, 0.8); w1.position.set(0.05, 0.1, 0.25); g.add(w1);
  const w2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.16, 10), dust); w2.scale.set(0.8, 1, 1); w2.position.set(-0.3, 0.08, -0.05); g.add(w2);
  const w3 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.12, 9), dust); w3.position.set(0.3, 0.06, -0.25); g.add(w3);
  // ---- base plate, bolts with nuts, gusset ribs ----
  box(0.5, 0.025, 0.5, ox, 0, PH + 0.0125, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cyl(0.018, 0.16, gun, sx * 0.19, PH + 0.1, sz * 0.19, 'y', 6);
    cyl(0.03, 0.03, gun, sx * 0.19, PH + 0.04, sz * 0.19, 'y', 6);
    cyl(0.03, 0.03, gun, sx * 0.19, PH + 0.085, sz * 0.19, 'y', 6);
    box(0.05, 0.16, 0.006, rust, sx * 0.19, PH - 0.1, sz * 0.424);
  }
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    const rib = box(0.012, 0.28, 0.12, ox, 0, 0, 0);
    rib.position.set(0.185 * Math.sin(a), PH + 0.165, 0.185 * Math.cos(a)); rib.rotation.y = a;
    const r2 = box(0.012, 0.03, 0.12, ox, 0, 0, 0); r2.position.set(0.185 * Math.sin(a), PH + 0.04, 0.185 * Math.cos(a)); r2.rotation.y = a;
  }
  // ---- mast: four trapezoid face plates plus corner seam strips ----
  const facePlate = (mat, rotY) => {
    const s = new THREE.Shape(); s.moveTo(-0.125, 0); s.lineTo(0.125, 0); s.lineTo(0.06, MH); s.lineTo(-0.06, MH); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, mat);
    // plate in the xy plane at local z = 0..0.012; rotate about y so it faces its direction
    const gr = new THREE.Group(); gr.rotation.y = rotY; gr.position.y = PH; g.add(gr);
    mm.position.z = 0.0; gr.add(mm);
    // corner seam strip along the edge, tilted with the taper
    return gr;
  };
  // each plate sits at its face: translate before rotating. Build with a translate on the mesh.
  for (const [mat, rotY] of [[oxS, 0], [oxE, Math.PI / 2], [oxN, Math.PI], [oxW, -Math.PI / 2]]) {
    const gr = facePlate(mat, rotY); const mm = gr.children[0];
    // slope: the plate should lean inward from half(PH) to half(TOP) - use a shear via rotation.x
    const tilt = Math.atan((0.125 - 0.06) / MH);
    mm.rotation.x = tilt; mm.position.z = 0.125 - 0.006;
  }
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, MH, 0.02), ox);
    const gr = new THREE.Group(); gr.rotation.y = a; gr.position.y = PH + MH / 2; g.add(gr);
    s.position.z = (0.125 + 0.06) / 2 * Math.SQRT2 - 0.01; s.rotation.x = Math.atan((0.125 - 0.06) * Math.SQRT2 / MH); gr.add(s);
  }
  box(0.16, 0.03, 0.16, ox, 0, TOP - 0.015, 0);                            // cap plate
  // plated ID panel on the south face at eye height, a safety yellow hazard band with dark edge stripes at 1.2 m
  { const h = half(1.6); box(0.16, 0.2, 0.008, gun, 0, 1.6, h + 0.006); box(0.12, 0.16, 0.012, house, 0, 1.6, h + 0.014); box(0.05, 0.12, 0.005, rust, 0, 1.44, h + 0.01); }
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, h = half(1.2) + 0.008;
    for (const [dy, hh, m] of [[0, 0.22, yel], [0.135, 0.05, gun], [-0.135, 0.05, gun]]) { const b = box(2 * half(1.2) + 0.02, hh, 0.012, m, 0, 0, 0); b.position.set(h * Math.sin(a), 1.2 + dy, h * Math.cos(a)); b.rotation.y = a; }
  }
  // step bolts up the east face, alternating sides, with a stop at the tip
  for (let i = 0; i < 9; i++) { const y = 2.4 + i * 0.7, z = (i % 2 ? 0.06 : -0.06), h = half(y); box(0.2, 0.022, 0.022, steel, h + 0.09, y, z); box(0.03, 0.045, 0.045, gun, h + 0.19, y, z); }
  box(0.14, 0.006, 0.14, dust, 0, TOP + 0.003, 0);
  for (const y of [3.3, 6.2]) {
    const h = half(y);
    box(2 * h + 0.03, 0.08, 2 * h + 0.03, ox, 0, y, 0);                     // bolted joint collar
    for (const sx of [-1, 1]) cyl(0.012, 0.02, gun, sx * 0.05, y, h + 0.025, 'z', 6);
    box(0.05, 0.3, 0.006, rust, 0.03, y - 0.2, h + 0.004);
    box(0.006, 0.28, 0.05, rust, -h - 0.004, y - 0.19, -0.02);
  }
  // ---- cross arm: RHS with end caps, through bolted with rust, dust on top ----
  const ha = half(ARM);
  box(1.4, 0.12, 0.14, ox, 0, ARM, 0);
  box(1.36, 0.006, 0.1, dust, 0, ARM + 0.063, 0);
  for (const sx of [-1, 1]) { box(0.02, 0.16, 0.18, oxN, sx * 0.69, ARM, 0); box(0.04, 0.16, 0.005, rust, sx * 0.69, ARM - 0.12, 0.093); }
  box(0.3, 0.3, 2 * ha + 0.16, steel, 0, ARM, 0);
  for (const sx of [-1, 1]) for (const dy of [-0.1, 0.1]) { cyl(0.014, 0.03, gun, sx * 0.1, ARM + dy, ha + 0.09, 'z', 6); cyl(0.014, 0.03, gun, sx * 0.1, ARM + dy, -ha - 0.09, 'z', 6); }
  box(0.16, 0.5, 0.012, rust, 0, ARM - 0.42, ha + 0.001);
  box(0.012, 0.5, 0.16, rust, -ha - 0.001, ARM - 0.42, 0);
  // ---- knee braces: tube from the mast to each arm end, gusset plates and bolts at both ends ----
  for (const sx of [-1, 1]) {
    rod(V(sx * (half(ARM - 0.75) + 0.02), ARM - 0.75, 0), V(sx * 0.6, ARM - 0.07, 0), 0.02, ox, 6);
    box(0.05, 0.14, 0.09, ox, sx * (half(ARM - 0.75) + 0.02), ARM - 0.75, 0); cyl(0.012, 0.03, gun, sx * (half(ARM - 0.75) + 0.05), ARM - 0.75, 0.03, 'x', 6);
    box(0.1, 0.03, 0.1, ox, sx * 0.6, ARM - 0.075, 0); cyl(0.012, 0.03, gun, sx * 0.6, ARM - 0.09, 0.03, 'y', 6);
    box(0.05, 0.14, 0.005, rust, sx * (half(ARM - 0.75) + 0.02), ARM - 0.9, 0.048);
  }
  // arm junction box under the arm, cables drooping from it to each housing's gland
  box(0.12, 0.1, 0.1, house, 0.3, ARM - 0.11, 0); box(0.13, 0.015, 0.11, houseD, 0.3, ARM - 0.055, 0);
  for (const sx of [-1, 1]) {
    const a = V(0.3, ARM - 0.16, -0.03), m = V(sx * 0.32 + 0.1, ARM - 0.02, -0.17), e = V(sx * 0.5, ARM + 0.31, -0.1);
    rod(a, m, 0.008, rub, 5); rod(m, e, 0.008, rub, 5);
  }
  // ---- floodlights: wide flat housings with hood and wire guard, on stirrup brackets ----
  for (const sx of [-1, 1]) {
    const x = sx * 0.5;
    box(0.06, 0.04, 0.16, steel, x, ARM + 0.08, 0);
    const fl = new THREE.Group(); fl.position.set(x, ARM + 0.24, 0); fl.rotation.x = 35 * Math.PI / 180; g.add(fl);
    for (const dx of [-0.21, 0.21]) box(0.02, 0.3, 0.05, steel, dx, -0.02, -0.02, fl);        // stirrup arms
    box(0.4, 0.3, 0.2, houseD, 0, 0, 0, fl);
    box(0.36, 0.26, 0.012, lens, 0, 0, 0.105, fl);
    box(0.42, 0.02, 0.24, house, 0, 0.16, 0.03, fl);                                          // hood
    box(0.36, 0.006, 0.16, dust, 0, 0.173, 0.0, fl);
    // lens frame, hinge bar along the top edge, cooling fins on the back, wing nuts on the stirrup pivots
    box(0.4, 0.02, 0.02, houseD, 0, 0.14, 0.108, fl); box(0.4, 0.02, 0.02, houseD, 0, -0.14, 0.108, fl);
    box(0.02, 0.3, 0.02, houseD, -0.19, 0, 0.108, fl); box(0.02, 0.3, 0.02, houseD, 0.19, 0, 0.108, fl);
    box(0.42, 0.024, 0.024, gun, 0, 0.15, 0.1, fl);
    for (let i = 0; i < 4; i++) box(0.36, 0.012, 0.03, houseD, 0, -0.09 + i * 0.06, -0.112, fl);
    for (const dx of [-0.235, 0.235]) box(0.02, 0.06, 0.02, gun, dx, -0.02, -0.02, fl);
    for (let i = 0; i < 4; i++) box(0.006, 0.26, 0.006, gun, -0.15 + i * 0.1, 0, 0.12, fl);   // guard wires
    box(0.36, 0.006, 0.006, gun, 0, 0, 0.12, fl);
    box(0.06, 0.12, 0.006, rust, 0, -0.1, -0.104, fl);
    cyl(0.012, 0.04, gun, 0, 0, -0.12, 'z', 6, fl);
  }
  // ---- junction box on the north face, cable tray down the north face with cover clips ----
  const hj = half(1.6);
  box(0.2, 0.2, 0.12, house, 0, 1.6, -hj - 0.06);
  box(0.22, 0.03, 0.14, houseD, 0, 1.71, -hj - 0.06);
  box(0.06, 0.25, 0.006, rust, 0, 1.36, -hj - 0.123);
  box(0.03, 0.05, 0.012, gun, 0.06, 1.56, -hj - 0.125); box(0.05, 0.016, 0.014, gun, 0.06, 1.585, -hj - 0.126);   // hasp and staple
  const tray = new THREE.Group(); g.add(tray);
  box(0.08, 1.05, 0.03, galv, 0, PH + 0.5, -hj - 0.03 - 0.02);
  for (const y of [0.6, 1.0, 1.4]) box(0.1, 0.02, 0.05, steel, 0, y, -hj - 0.045);
  cyl(0.008, ARM - 1.75, steel, 0.0, (ARM + 1.75) / 2, -0.11, 'y', 5);
  for (const y of [2.5, 3.7, 4.9, 6.1, 7.3]) box(0.04, 0.03, 0.03, steel, 0, y, -half(y) - 0.004);
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
