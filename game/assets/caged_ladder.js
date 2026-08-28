// caged_ladder candidate 1: built from profiles. Each stile is a circle profile
// extruded along one path (straight up, a bend, a return to the wall), rungs are
// circle sweeps, the cage hoops are true flat bar bands (a D shaped ring Shape
// extruded 40 mm), the vertical cage bars are flat rectangles swept, brackets are an
// extruded angle profile, sand at the feet is lathed. Its back faces -Z.
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
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const gun = M(0x3a3d40, 'metal', 0.70, 0.60);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
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

  const SX = 0.225, SR = 0.03, WALL = -0.23, TOP = 4.6;

  // ---- stiles: one extrusion along a path with the bend in it ----
  for (const sx of [-1, 1]) {
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V(sx * SX, 0.0, 0), V(sx * SX, TOP - 0.15, 0)));
    path.add(new THREE.QuadraticBezierCurve3(V(sx * SX, TOP - 0.15, 0), V(sx * SX, TOP, 0), V(sx * SX, TOP, -0.15)));
    path.add(new THREE.LineCurve3(V(sx * SX, TOP, -0.15), V(sx * SX, TOP, WALL)));
    const geo = new THREE.ExtrudeGeometry(circle(SR), { steps: 40, bevelEnabled: false, extrudePath: path, curveSegments: 4 });
    g.add(new THREE.Mesh(geo, sx > 0 ? galv : galvS));
    sweep(rect(0.1, 0.1), V(sx * SX, TOP, WALL + 0.002), V(sx * SX, TOP, WALL - 0.01), steel);
  }
  // ---- rungs ----
  for (let i = 1; i <= 12; i++) {
    sweep(circle(0.0125), V(-SX, i * 0.3, 0), V(SX, i * 0.3, 0), galvD, V(0, 1, 0));
    box(0.36, 0.006, 0.014, worn, 0, i * 0.3 + 0.012, 0);
  }
  // ---- brackets: extruded angle from the stile to the wall, plate and bolts ----
  const angle = () => { const s = new THREE.Shape(); s.moveTo(-0.025, -0.025); s.lineTo(0.025, -0.025); s.lineTo(0.025, -0.017); s.lineTo(-0.017, -0.017); s.lineTo(-0.017, 0.025); s.lineTo(-0.025, 0.025); s.closePath(); return s; };
  for (const y of [0.6, 1.5, 2.4, 3.3]) for (const sx of [-1, 1]) {
    sweep(angle(), V(sx * SX, y, SR), V(sx * SX, y, WALL), steel, V(0, 1, 0));
    sweep(rect(0.12, 0.12), V(sx * SX, y, WALL + 0.002), V(sx * SX, y, WALL - 0.01), steel);
    for (const dy of [-0.04, 0.04]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.02, 6), gun); b.rotation.x = Math.PI / 2; b.position.set(sx * SX, y + dy, WALL - 0.02); g.add(b); }
    box(0.05, 0.22, 0.005, rust, sx * SX, y - 0.17, WALL - 0.015);
    box(0.02, 0.1, 0.005, rust, sx * SX + 0.03, y - 0.09, SR + 0.002);
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
    const mm = sweep(Dring(0.36, 0.26, 0.008), V(0, y - 0.02, 0), V(0, y + 0.02, 0), galv, V(0, 0, -1), 10);
  }
  for (const a of [Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6]) {
    const x = 0.36 * Math.cos(a), z = 0.26 * Math.sin(a);
    sweep(rect(0.03, 0.008), V(x, hoopY[0] - 0.02, z), V(x, hoopY[4] + 0.02, z), a === Math.PI / 2 ? galvS : galv, V(-Math.cos(a), 0, -Math.sin(a)));
  }
  // ---- feet: lathed sand mounds ----
  const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(0.17 * (1 - t), 0.1 * (1 - (1 - t) * (1 - t)))); }
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), dust); m.scale.set(1, 1, 0.9); m.position.set(sx * SX, 0, 0.02); g.add(m); }
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
