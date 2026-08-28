// ibc_tote candidate 1, round 4 detail pass. The bottle is a blow moulded rounded cube made by
// pulling a subdivided box onto a superellipse, the cage is square section welded bar with flat
// bar rings, the pallet is a pressed steel tray on six feet with open fork pockets. Round 4 adds
// what the Rust IBCs carry: a label plate and document pouch on the front of the cage, two bars
// across the top opening, bolts with rust at the four cage to pallet corners, a hose from the
// valve running along the front base, a flanged valve with a cap, a spill run down the bottle,
// lipped pallet side rails and a vent cap.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, galv: 0x9ea3a1, concB: 0xb8ae9b, concS: 0x857c6c, red: 0x9c4a3c, gun: 0x3a3d40, rubber: 0x1d1e20 };
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
  const wedge = (L, out, h, m, x, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
    const o = add(geo, m, x, 0, z); o.rotation.y = ry; return o;
  };

  const galv = mat(C.galv, 'metal', 0.7, 0.55);
  const galvD = mat(tint(C.galv, 0.85), 'metal', 0.75, 0.5);
  const bar = mat(tint(C.galv, 0.95), 'metal', 0.7, 0.55);
  const barS = mat(tint(C.galv, 1.05), 'metal', 0.7, 0.55);
  const plastic = mat(C.concB, 'plaster', 0.85, 0.0);
  const plasticLo = mat(tint(C.concB, 0.86), 'plaster', 0.85, 0.0);
  const tide = mat(tint(C.concS, 0.8), 'plaster', 0.9, 0.0);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const red = mat(C.red, 'metal', 0.75, 0.2);
  const gun = mat(C.gun, 'metal', 0.7, 0.4);
  const plateD = mat(tint(C.concS, 0.75), 'metal', 0.85, 0.1);
  const rubber = new THREE.MeshStandardMaterial({ color: C.rubber, roughness: 0.92, metalness: 0.0 });
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.008, 6);

  // pallet: tray deck, lipped side rails, six feet, fork pockets open through both long sides
  const PW = 1.2, PD = 1.0, PH = 0.16;
  box(PW, 0.04, PD, galv, 0, PH - 0.02, 0);
  box(PW, 0.03, 0.03, galvD, 0, PH - 0.055, PD / 2 - 0.015);
  box(PW, 0.03, 0.03, galvD, 0, PH - 0.055, -PD / 2 + 0.015);
  box(0.03, 0.05, PD, galvD, PW / 2 - 0.015, PH + 0.005, 0);
  box(0.03, 0.05, PD, galvD, -PW / 2 + 0.015, PH + 0.005, 0);
  for (const x of [-0.55, 0, 0.55]) for (const z of [-0.4, 0.4]) box(0.1, PH - 0.04, 0.16, galvD, x, (PH - 0.04) / 2, z);
  for (const x of [-0.55, 0, 0.55]) box(0.08, 0.03, PD - 0.2, galvD, x, 0.015, 0);
  for (const x of [-0.55, 0.55]) for (const s of [-1, 1]) drip(0.07, 0.03, rustM, x, PH - 0.04, s * (PD / 2 + 0.002), s > 0 ? 0 : Math.PI);
  // bottle: rounded cube, split at the tide line into a stained lower and a cleaner upper
  const rounded = (w, h, d, y0, y1) => {
    const geo = new THREE.BoxGeometry(w, h, d, 6, 8, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), vv = p.getY(i) / (h / 2), ww = p.getZ(i) / (d / 2);
      const n = Math.pow(Math.pow(Math.abs(u), 6) + Math.pow(Math.abs(vv), 6) + Math.pow(Math.abs(ww), 6), 1 / 6) || 1;
      const k = 1 / Math.max(n, 0.9);
      p.setXYZ(i, u * k * (w / 2), vv * k * (h / 2), ww * k * (d / 2));
    }
    geo.computeVertexNormals();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, Math.min(Math.max(y, y0), y1)); }
    return geo;
  };
  const B = 0.95, bx0 = PH, cy = bx0 + B / 2, split = 0.7;
  add(rounded(B, B, B, -B / 2, split - cy), plasticLo, 0, cy, 0);
  add(rounded(B, B, B, split - cy, B / 2), plastic, 0, cy, 0);
  box(B + 0.004, 0.03, B + 0.004, tide, 0, split, 0);
  for (let k = 1; k < 4; k++) { const y = bx0 + 0.25 * k; if (Math.abs(y - split) > 0.03) box(B - 0.03, 0.012, B + 0.004, plasticLo, 0, y, 0); }
  box(B - 0.16, 0.008, B - 0.16, dustM, 0, bx0 + B + 0.002, 0);
  // fill cap with a vent cap beside it, and the spill that ran down the front from the cap
  cyl(0.09, 0.09, 0.012, 14, plasticLo, 0, bx0 + B + 0.004, 0);
  cyl(0.075, 0.075, 0.03, 14, gun, 0, bx0 + B + 0.02, 0);
  cyl(0.03, 0.03, 0.01, 10, plasticLo, 0.3, bx0 + B + 0.003, 0.25);
  cyl(0.022, 0.022, 0.022, 10, gun, 0.3, bx0 + B + 0.012, 0.25);
  box(0.06, 0.006, 0.38, tide, 0.06, bx0 + B + 0.003, 0.27);
  drip(0.38, 0.07, tide, 0.06, bx0 + B - 0.01, B / 2 + 0.004, 0);
  drip(0.2, 0.04, tide, 0.11, bx0 + B - 0.02, B / 2 + 0.004, 0);
  // valve: flange on the bottle sump, body, butterfly with a red handle, a cap on the outlet, a drip
  cyl(0.055, 0.055, 0.012, 12, galvD, 0, PH + 0.08, B / 2 + 0.006).rotation.x = Math.PI / 2;
  box(0.07, 0.07, 0.07, galvD, 0, PH + 0.08, B / 2 + 0.04);
  cyl(0.04, 0.04, 0.014, 12, gun, 0, PH + 0.08, B / 2 + 0.082).rotation.x = Math.PI / 2;
  cyl(0.034, 0.034, 0.012, 12, gun, 0, PH + 0.08, B / 2 + 0.09).rotation.x = Math.PI / 2;
  box(0.09, 0.016, 0.02, red, 0, PH + 0.135, B / 2 + 0.05);
  box(0.016, 0.05, 0.016, red, 0, PH + 0.11, B / 2 + 0.05);
  for (const bx of [-0.04, 0.04]) add(boltGeo, gun, bx, PH + 0.08, B / 2 + 0.002).rotation.x = Math.PI / 2;
  drip(0.06, 0.03, rustM, 0, PH + 0.045, B / 2 + 0.004, 0);
  // hose: clipped on the valve outlet, drops to the sand and runs off along the front of the pallet
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, PH + 0.08, B / 2 + 0.09), new THREE.Vector3(0.03, PH + 0.02, B / 2 + 0.06), new THREE.Vector3(0.12, 0.05, 0.53),
    new THREE.Vector3(0.3, 0.05, 0.525), new THREE.Vector3(0.5, 0.05, 0.5), new THREE.Vector3(0.62, 0.045, 0.45),
  ]);
  add(new THREE.TubeGeometry(path, 14, 0.019, 6, false), rubber);
  cyl(0.024, 0.024, 0.03, 8, gun, 0.03, PH + 0.03, B / 2 + 0.07).rotation.x = Math.PI / 2 + 0.9;
  cyl(0.022, 0.022, 0.04, 8, gun, 0.6, 0.046, 0.46).rotation.y = 0.9;
  // cage: square bar verticals, flat bar rings, angle corner posts, boxed top frame, two top bars
  const half = 0.49, yb = PH, yt = 1.15;
  const vgeo = new THREE.BoxGeometry(0.02, yt - yb, 0.02);
  const positions = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45];
  for (const p of positions) {
    add(vgeo, barS, p, (yt + yb) / 2, half);
    add(vgeo, bar, p, (yt + yb) / 2, -half);
    add(vgeo, bar, half, (yt + yb) / 2, p);
    add(vgeo, bar, -half, (yt + yb) / 2, p);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.03, yt - yb, 0.006, galvD, sx * (half + 0.005), (yt + yb) / 2, sz * (half + 0.017));
    box(0.006, yt - yb, 0.03, galvD, sx * (half + 0.017), (yt + yb) / 2, sz * (half + 0.005));
    // bolted foot where the corner post meets the pallet: a plate, two hex bolts, rust running down the rail
    box(0.06, 0.05, 0.006, galvD, sx * (half + 0.003), yb + 0.035, sz * (half + 0.021));
    for (const dx of [-0.018, 0.018]) add(boltGeo, gun, sx * (half + 0.003) + dx, yb + 0.035, sz * (half + 0.026)).rotation.x = Math.PI / 2;
    drip(0.1, 0.04, rustM, sx * (half + 0.003), yb + 0.012, sz * (half + 0.025), sz > 0 ? 0 : Math.PI);
  }
  const rings = [0.19, 0.34, 0.49, 0.64, 0.79, 0.94, 1.09];
  for (const y of rings) {
    box(2 * half + 0.04, 0.02, 0.006, barS, 0, y, half + 0.013);
    box(2 * half + 0.04, 0.02, 0.006, bar, 0, y, -half - 0.013);
    box(0.006, 0.02, 2 * half + 0.04, bar, half + 0.013, y, 0);
    box(0.006, 0.02, 2 * half + 0.04, bar, -half - 0.013, y, 0);
  }
  box(2 * half + 0.04, 0.03, 0.03, galvD, 0, yt, half + 0.005);
  box(2 * half + 0.04, 0.03, 0.03, galvD, 0, yt, -half - 0.005);
  box(0.03, 0.03, 2 * half + 0.04, galvD, half + 0.005, yt, 0);
  box(0.03, 0.03, 2 * half + 0.04, galvD, -half - 0.005, yt, 0);
  for (const x of [-0.2, 0.2]) box(0.03, 0.006, 2 * half, galvD, x, yt + 0.012, 0);
  // label plate with four rivets and a document pouch on the front of the cage, top left
  box(0.22, 0.15, 0.004, plateD, -0.27, 0.98, half + 0.019);
  for (const dx of [-0.095, 0.095]) for (const dy of [-0.06, 0.06]) cyl(0.004, 0.004, 0.004, 6, gun, -0.27 + dx, 0.98 + dy, half + 0.022).rotation.x = Math.PI / 2;
  box(0.16, 0.11, 0.003, mat(tint(C.concB, 1.04), 'plaster', 0.85, 0.0), 0.05, 0.96, half + 0.019);
  box(0.16, 0.012, 0.004, plateD, 0.05, 1.012, half + 0.02);
  for (const y of [0.34, 0.79, 1.09]) for (const p of positions) {
    drip(0.06, 0.022, rustM, p, y - 0.01, half + 0.017, 0);
    drip(0.06, 0.022, rustM, p, y - 0.01, -half - 0.017, Math.PI);
    drip(0.06, 0.022, rustM, half + 0.017, y - 0.01, p, Math.PI / 2);
    drip(0.06, 0.022, rustM, -half - 0.017, y - 0.01, p, -Math.PI / 2);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) drip(0.14, 0.03, rustM, sx * (half + 0.005), yt - 0.015, sz * (half + 0.021), sz > 0 ? 0 : Math.PI);
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(PD, 0.055, 0.12, fill, PW / 2, 0, 0);
  wedge(PD, 0.055, 0.1, fill, -PW / 2, 0, Math.PI);
  wedge(PW - 0.1, 0.045, 0.08, fill, 0, PD / 2, -Math.PI / 2);
  wedge(PW - 0.1, 0.045, 0.1, fill, 0, -PD / 2, Math.PI / 2);
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
