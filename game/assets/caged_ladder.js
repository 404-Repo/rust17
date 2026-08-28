// caged_ladder r4 detail pass, second cut. Round tube stiles (octagonal, not square) on a low
// concrete plinth: each stile stands on a steel foot plate above the sand crest with two anchor
// bolts and hex nuts, a rust collar at the foot and a stain on the plinth around the plate; sand
// drifts bank against the plinth on three sides. A weld collar at every rung end with a rust run
// on the stile face below it; four hex bolt heads on the front of every wall bracket plate with
// rust on the plate face and a rust run down the stile behind the angle; the cage hoops tied to
// the stiles by flat straps with a U bolt ring and two nuts; every hoop to vertical crossing has a
// hex head outside, a bolt shank passing through the hoop and a nut inside, with a rust strip set
// into the bar face below it (no gap); the middle cage bar's bottom kinked outward with rust at the
// crease; an inspection tag on the right stile; and the two stile extensions bent into curved
// handrail hoops (a candy cane of two quarter circle arcs) with the down leg clipped to a wall
// plate. Its back faces -Z (mounts against the wall it climbs).
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvS = M(0xaaafad, 'metal', 0.70, 0.55, true);
  const galvD = M(0x8c9190, 'metal', 0.74, 0.55, true);
  const worn = M(0x7f8384, 'metal', 0.66, 0.6);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const rust = M(0x6b4426, 'metal', 0.92, 0.10, true);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const plate = M(0x9c988c, 'metal', 0.80, 0.20);
  const conc = M(0x857c6c, 'stone', 0.92, 0.0);
  const concS = M(0x8f8676, 'stone', 0.90, 0.0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Y = V(0, 1, 0);
  const sweep = (shape, p, q, mat, up, cs) => {
    const dir = q.clone().sub(p); const len = dir.length(); dir.normalize();
    const u = (up || (Math.abs(dir.y) > 0.9 ? V(0, 0, 1) : V(0, 1, 0))).clone();
    const xa = new THREE.Vector3().crossVectors(u, dir).normalize();
    const ya = new THREE.Vector3().crossVectors(dir, xa).normalize();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: cs || 4 });
    const mm = new THREE.Mesh(geo, mat);
    mm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, dir));
    mm.position.copy(p); g.add(mm); return mm;
  };
  const rect = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); return s; };
  const circle = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
  const box = (w, h, d, mat, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); g.add(mm); return mm; };
  // a cylinder whose axis runs along the unit vector n, centred at c
  const cylAt = (rt, rb, h, seg, mat, c, n, open) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), mat);
    mm.quaternion.setFromUnitVectors(Y, n.clone().normalize()); mm.position.copy(c); g.add(mm); return mm;
  };
  // a rust run hugging a round bar: an open partial cylinder 2.5 mm proud of the bar, facing `face` (a unit vector in xz)
  const rustRun = (c, r, h, face, spread) => {
    const th = Math.atan2(face.x, face.z);
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0025, r + 0.0025, h, 5, 1, true, th - (spread || 0.7), 2 * (spread || 0.7)), rust);
    mm.position.copy(c); g.add(mm); return mm;
  };
  const hex = (r, h, mat, c, n) => cylAt(r, r, h, 6, mat, c, n || Y);

  const SX = 0.225, SR = 0.03, WALL = -0.23, TOP = 4.6, PADH = 0.12, PT = PADH + 0.012, R = 0.1, K = 0.5523;
  g.userData.mounts = 'back';

  // ---- concrete plinth: stained concrete with a lighter sun face, a dust slab on top between the feet ----
  box(0.60, PADH, 0.36, conc, 0, PADH / 2, -0.02);
  box(0.60, PADH, 0.004, concS, 0, PADH / 2, 0.162);
  box(0.24, 0.006, 0.22, dust, 0, PADH + 0.003, -0.04);
  // ---- foot plates on the plinth, two anchor bolts each, rust collar at the foot, a stain around the plate ----
  for (const sx of [-1, 1]) {
    box(0.17, 0.002, 0.17, rust, sx * SX, PADH + 0.001, 0);
    box(0.13, 0.012, 0.13, steel, sx * SX, PADH + 0.006, 0);
    for (const dx of [-0.045, 0.045]) {
      hex(0.012, 0.012, gun, V(sx * SX + dx, PT + 0.006, 0.042));
      cylAt(0.0055, 0.0055, 0.03, 6, gun, V(sx * SX + dx, PT + 0.02, 0.042), Y);
      box(0.026, 0.002, 0.022, rust, sx * SX + dx, PT + 0.001, 0.058);
    }
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(SR + 0.003, SR + 0.003, 0.07, 8, 1, true), rust); foot.position.set(sx * SX, PT + 0.035, 0); g.add(foot);
  }
  // ---- stiles: round tube up to the bend, then a candy cane hoop of two quarter circles and a down leg on a wall clip ----
  for (const sx of [-1, 1]) {
    const mat = sx > 0 ? galv : galvS;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, TOP - R - PADH + 0.005, 8), mat); st.position.set(sx * SX, (TOP - R + PADH - 0.005) / 2, 0); g.add(st);
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V(sx * SX, TOP - R - 0.02, 0), V(sx * SX, TOP - R, 0)));
    path.add(new THREE.CubicBezierCurve3(V(sx * SX, TOP - R, 0), V(sx * SX, TOP - R + K * R, 0), V(sx * SX, TOP, -R + K * R), V(sx * SX, TOP, -R)));
    path.add(new THREE.CubicBezierCurve3(V(sx * SX, TOP, -R), V(sx * SX, TOP, -R - K * R), V(sx * SX, TOP - R + K * R, -2 * R), V(sx * SX, TOP - R, -2 * R)));
    path.add(new THREE.LineCurve3(V(sx * SX, TOP - R, -2 * R), V(sx * SX, TOP - R - 0.22, -2 * R)));
    const geo = new THREE.ExtrudeGeometry(circle(SR), { steps: 18, bevelEnabled: false, extrudePath: path, curveSegments: 8 });
    g.add(new THREE.Mesh(geo, mat));
    // wall clip at the foot of the down leg: plate on the wall, a saddle over the tube, two bolts, rust on the plate
    const cy = TOP - R - 0.17;
    sweep(rect(0.1, 0.1), V(sx * SX, cy, WALL + 0.002), V(sx * SX, cy, WALL - 0.01), steel);
    box(0.08, 0.05, 0.04, steel, sx * SX, cy, WALL + 0.02);
    for (const dx of [-0.035, 0.035]) hex(0.009, 0.01, gun, V(sx * SX + dx, cy - 0.035, WALL + 0.007), V(0, 0, 1));
    box(0.05, 0.03, 0.003, rust, sx * SX, cy - 0.032, WALL + 0.002);
    rustRun(V(sx * SX, cy - 0.06, -2 * R), SR, 0.07, V(0, 0, 1));
  }
  // ---- rungs: round bar with a worn top, a weld collar at each stile and a rust run on the stile below it ----
  for (let i = 1; i <= 12; i++) {
    const y = i * 0.3;
    cylAt(0.0125, 0.0125, 2 * SX, 8, galvD, V(0, y, 0), V(1, 0, 0));
    box(0.36, 0.006, 0.014, worn, 0, y + 0.012, 0);
    for (const sx of [-1, 1]) {
      cylAt(0.019, 0.019, 0.026, 8, galvD, V(sx * (SX - 0.036), y, 0), V(1, 0, 0));
      rustRun(V(sx * SX, y - 0.05, 0), SR, 0.07, V(-sx * 0.5, 0, 1), 0.6);
    }
  }
  // ---- brackets: extruded angle from the stile to the wall, plate with four hex heads, rust on the plate and the stile ----
  const angle = () => { const s = new THREE.Shape(); s.moveTo(-0.025, -0.025); s.lineTo(0.025, -0.025); s.lineTo(0.025, -0.017); s.lineTo(-0.017, -0.017); s.lineTo(-0.017, 0.025); s.lineTo(-0.025, 0.025); s.closePath(); return s; };
  for (const y of [0.6, 1.5, 2.4, 3.3]) for (const sx of [-1, 1]) {
    sweep(angle(), V(sx * SX, y, SR), V(sx * SX, y, WALL), steel, V(0, 1, 0));
    sweep(rect(0.12, 0.12), V(sx * SX, y, WALL + 0.002), V(sx * SX, y, WALL - 0.01), steel);
    for (const dx of [-0.042, 0.042]) for (const dy of [-0.042, 0.042]) hex(0.009, 0.01, gun, V(sx * SX + dx, y + dy, WALL + 0.007), V(0, 0, 1));
    box(0.06, 0.045, 0.003, rust, sx * SX, y - 0.037, WALL + 0.002);
    box(0.02, 0.004, 0.16, rust, sx * SX + sx * 0.016, y - 0.026, (SR + WALL) / 2);
    rustRun(V(sx * SX, y - 0.09, 0), SR, 0.12, V(sx * 0.6, 0, -1), 0.8);
  }
  // ---- cage hoops: flat bar D rings, extruded 40 mm tall ----
  const Dring = (rx, rz, t) => {
    const s = new THREE.Shape();
    s.moveTo(-rx, 0); s.absellipse(0, 0, rx, rz, Math.PI, 0, true, 0); s.lineTo(rx, WALL); s.lineTo(-rx, WALL); s.closePath();
    const h = new THREE.Path();
    h.moveTo(-rx + t, 0); h.absellipse(0, 0, rx - t, rz - t, Math.PI, 0, true, 0); h.lineTo(rx - t, WALL); h.lineTo(-rx + t, WALL); h.closePath();
    s.holes.push(h); return s;
  };
  const hoopY = [2.2, 2.79, 3.38, 3.97, 4.55];
  for (const y of hoopY) {
    // shape x -> world x, shape y -> world z; sweep along +y with up = -z so local y = +z
    sweep(Dring(0.36, 0.26, 0.008), V(0, y - 0.02, 0), V(0, y + 0.02, 0), galv, V(0, 0, -1), 10);
    // stile straps: flat bar from the stile out to the hoop leg, a U bolt ring round the stile with two nuts on top
    for (const sx of [-1, 1]) {
      box(0.36 - SX + 0.01, 0.008, 0.03, galvD, sx * (0.36 + SX - 0.01) / 2, y, 0);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(SR + 0.004, SR + 0.004, 0.012, 8, 1, true), gun); ring.position.set(sx * SX, y, 0); g.add(ring);
      box(0.06, 0.006, 0.1, galvD, sx * SX, y + 0.007, 0);
      for (const dz of [-0.04, 0.04]) hex(0.008, 0.008, gun, V(sx * SX, y + 0.014, dz));
      hex(0.008, 0.008, gun, V(sx * 0.335, y + 0.008, 0));
      rustRun(V(sx * SX, y - 0.05, 0), SR, 0.06, V(sx, 0, 0.3), 0.6);
    }
  }
  for (const a of [Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6]) {
    const x = 0.36 * Math.cos(a), z = 0.26 * Math.sin(a), mid = a === Math.PI / 2;
    const n = V(Math.cos(a), 0, Math.sin(a));
    // the middle bar took a knock at the bottom: its lowest 0.35 m is kinked outward, rust at the crease
    sweep(rect(0.03, 0.008), V(x, mid ? hoopY[0] + 0.3 : hoopY[0] - 0.02, z), V(x, hoopY[4] + 0.02, z), mid ? galvS : galv, V(-Math.cos(a), 0, -Math.sin(a)));
    if (mid) { sweep(rect(0.03, 0.008), V(x, hoopY[0] + 0.3, z), V(x + 0.12, hoopY[0] - 0.06, z + 0.02), galvD, V(0, 0, -1)); box(0.04, 0.05, 0.02, rust, x, hoopY[0] + 0.3, z + 0.01); }
    // every hoop crossing: hex head outside, shank through the hoop, nut inside, rust set into the bar face below
    for (const y of hoopY) {
      const c = V(x, y, z);
      hex(0.011, 0.007, gun, c.clone().addScaledVector(n, 0.0075), n);
      cylAt(0.005, 0.005, 0.026, 6, gun, c.clone().addScaledVector(n, -0.009), n, true);
      hex(0.011, 0.007, gun, c.clone().addScaledVector(n, -0.0115), n);
      const rs = box(0.022, 0.09, 0.003, rust, 0, 0, 0);
      rs.position.copy(c.clone().addScaledVector(n, 0.004)); rs.position.y = y - 0.067; rs.rotation.y = Math.PI / 2 - a;
    }
  }
  // inspection tag plate on the right stile, outside face, two rivets, rust run below it
  box(0.006, 0.1, 0.07, plate, SX + 0.033, 1.95, 0);
  for (const dz of [-0.025, 0.025]) hex(0.004, 0.004, gun, V(SX + 0.038, 1.95 + (dz > 0 ? 0.035 : -0.035), dz), V(1, 0, 0));
  rustRun(V(SX, 1.86, 0), SR, 0.07, V(1, 0, 0), 0.5);
  // ---- sand drifts banked against the plinth on three sides: concave talus, crest at the plinth face ----
  const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(0.15 * (1 - t), 0.11 * t * t)); }
  const drift = (x, z, sx, sz) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), dust); m.scale.set(sx, 1, sz); m.position.set(x, 0, z); g.add(m); };
  drift(-0.30, -0.03, 1.0, 1.5); drift(0.30, -0.01, 1.0, 1.4); drift(0.0, 0.16, 2.1, 0.9);
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
