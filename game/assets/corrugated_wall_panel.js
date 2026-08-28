// corrugated_wall_panel candidate 1: profile extrusion. The corrugation is a
// sine profile Shape extruded UP (along y); the run is three overlapping sheets
// of different heights so the top edge steps, and the posts are extruded
// I-section profiles as the reference shows. Rails, screws, rust, sand drift.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55, true);
  const galvB = M(0xa7aba9, 'metal', 0.72, 0.55, true);
  const post = M(0x8d8b84, 'metal', 0.80, 0.30, true);
  const steel = M(0x4f5257, 'metal', 0.75, 0.35);
  const timber = M(0xa07a4f, 'timber', 0.90, 0.0);
  const timberS = M(0xab8453, 'timber', 0.90, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const sand = M(0xc5b088, 'ground', 0.95, 0.0);
  const sandL = M(0xbba37b, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const W = 3.0, PITCH = 0.076, AMP = 0.012, TH = 0.004;

  // a corrugated sheet as a closed thin profile (front wave, back wave) extruded along y
  const corrSheet = (len, height, mat, spp) => {
    const n = Math.round(len / PITCH) * (spp || 4);
    const s = new THREE.Shape();
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (i / n) * len;
      const z = AMP * Math.sin((x + len / 2) / PITCH * Math.PI * 2);
      if (i === 0) s.moveTo(x, z + TH / 2); else s.lineTo(x, z + TH / 2);
    }
    for (let i = n; i >= 0; i--) {
      const x = -len / 2 + (i / n) * len;
      const z = AMP * Math.sin((x + len / 2) / PITCH * Math.PI * 2);
      s.lineTo(x, z - TH / 2);
    }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 1, steps: height > 1 ? 2 : 1 });
    const mm = new THREE.Mesh(geo, mat);
    mm.rotation.x = -Math.PI / 2;           // extrude axis z -> +y, shape y -> -z... fix below
    return mm;
  };
  // three sheets lapping by one pitch, heights 2.40, 2.32, 2.37 so the top steps; the middle sheet laps 4 mm in front
  const sheets = [[-1.0, 1.08, 2.40, galv, -0.02], [0.0, 1.08, 2.31, galvB, -0.016], [1.0, 1.08, 2.37, galv, -0.02]];
  for (const [cx, len, h, mat, z] of sheets) {
    const mm = corrSheet(len, h, mat);
    // after rotation.x = -PI/2: local (x, y, z) -> (x, z, -y): the shape's y (rib depth) maps to -z, extrude depth maps to +y
    mm.position.set(cx, 0, z);
    g.add(mm);
  }
  // the rib under a given x: which sheet, the pitch cell it falls in, and where that cell's front crest is.
  // Everything fixed to the sheet (screws, rust runs, patch) is placed from this so nothing floats over a trough.
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0x10000; };
  const ribAt = (x) => {
    const s = x < -0.5 ? sheets[0] : x > 0.5 ? sheets[2] : sheets[1];
    const left = s[0] - s[1] / 2, k = Math.max(0, Math.min(Math.round(s[1] / PITCH) - 1, Math.round((x - left) / PITCH - 0.5)));
    const X = left + (k + 0.5) * PITCH; return { X, crest: X + PITCH / 4, z: s[4] };
  };
  // a rust run that follows the wave: one pitch wide, the sheet's own profile, set 3.5 mm proud of its front (dz > 0) or back (dz < 0)
  const rustRun = (x, y0, h, mat, dz) => { const r = ribAt(x); const mm = corrSheet(PITCH, h, mat, 3); mm.position.set(r.X, y0, r.z + dz); g.add(mm); return r; };
  // bent bottom corner: a short curled strip in front of the left sheet's foot
  const curl = new THREE.Group(); curl.position.set(-W / 2 + 0.1, 0.02, -0.005); g.add(curl);
  const c1 = corrSheet(0.30, 0.30, galvB); c1.rotation.x = -Math.PI / 2 + 0.12; c1.position.set(0.05, 0.0, -0.015); curl.add(c1);
  box(0.30, 0.03, 0.006, rustD, 0.05, 0.31, 0.025, curl);   // torn edge, rusted
  // sand on the foot of the sheet is a vertex colour band now (WEATHER_OPTS.sand), not two extra corrugated skins

  // ---- I-section posts (0.08 square envelope) as extruded profiles ----
  const iProfile = new THREE.Shape([
    [-0.04, -0.04], [0.04, -0.04], [0.04, -0.03], [0.006, -0.03], [0.006, 0.03], [0.04, 0.03], [0.04, 0.04],
    [-0.04, 0.04], [-0.04, 0.03], [-0.006, 0.03], [-0.006, -0.03], [-0.04, -0.03],
  ].map(([a, b]) => new THREE.Vector2(a, b)));
  for (const px of [-W / 2 + 0.04, 0, W / 2 - 0.04]) {
    const geo = new THREE.ExtrudeGeometry(iProfile, { depth: 2.45, bevelEnabled: false });
    const mm = new THREE.Mesh(geo, post); mm.rotation.x = -Math.PI / 2; mm.rotation.z = Math.PI / 2;
    mm.position.set(px, 0.012, -0.06); g.add(mm);
    box(0.16, 0.012, 0.10, steel, px, 0.006, -0.06);
    for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 4), rust);
      b.position.set(px + bx * 0.06, 0.019, -0.06 + bz * 0.035); g.add(b);
    }
    box(0.03, 0.22, 0.006, rust, px - 0.018, 0.14, -0.017);
    box(0.07, 0.05, 0.006, rustD, px, 0.04, -0.017);
    box(0.03, 0.22, 0.006, rust, px + 0.018, 0.14, -0.103);
    box(0.06, 0.008, 0.07, dust, px, 2.466, -0.06);
    box(0.02, 0.10, 0.006, rust, px + 0.02, 2.36, -0.017);
    box(0.02, 0.10, 0.006, rust, px - 0.02, 2.36, -0.103);
  }
  // ---- timber rails at 0.7 and 1.9 behind the sheet between the posts; screw
  //      heads and rust runs on the front face, screw tips on the rail backs ----
  for (const ry of [0.7, 1.9]) {
    for (const [x0, x1] of [[-W / 2 + 0.08, -0.04], [0.04, W / 2 - 0.08]]) {
      const len = x1 - x0, cx = (x0 + x1) / 2;
      box(len, 0.10, 0.05, timber, cx, ry, -0.058);
      box(len - 0.04, 0.04, 0.004, timberS, cx, ry + 0.025, -0.085);
      box(len, 0.008, 0.05, dust, cx, ry + 0.054, -0.058);
      let n = 0;
      for (let sx = x0 + 0.15; sx < x1 - 0.05; sx += 0.30, n++) {
        const r = ribAt(sx);
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 4), steel);
        s.rotation.x = Math.PI / 2; s.position.set(r.crest, ry, r.z + AMP + TH / 2 + 0.004); g.add(s);   // screw head on the crest
        const h1 = 0.1 + 0.3 * rnd(); if (rnd() < 0.5) rustRun(sx, ry - 0.01 - h1, h1, rust, 0.0035);   // run down the rib below it, uneven
        if (rnd() < 0.25) { const h2 = 0.1 + 0.2 * rnd(); rustRun(sx, ry - 0.2 - h2, h2, rustD, 0.0035); }
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 4), rust);
        t.rotation.x = Math.PI / 2; t.position.set(r.crest, ry, -0.088); g.add(t);                          // tip out of the rail back
        box(0.012, 0.09, 0.004, rust, r.crest, ry - 0.075, -0.086);
        if (n % 2 === 0) rustRun(sx, ry - 0.38, 0.3, rust, -0.0035);                                        // and down the back of the sheet
      }
    }
    for (let sx = -1.05; sx < 1.3; sx += 0.9) rustRun(sx, ry - 0.26, 0.15, rustD, -0.0035);
  }
  // ---- back: X bracing of 40 x 5 flat bar bolted to the rails in each bay with a centre plate, a steel angle along the
  //      top holding the uneven sheet edges, and a bolted patch sheet over a hole; all inside the 0.15 m envelope ----
  const steelB = M(0x565a5e, 'metal', 0.78, 0.35);
  const brace = (x0, y0, x1, y1, mat) => {
    const dx = x1 - x0, dy = y1 - y0;
    const b = box(0.04, Math.hypot(dx, dy), 0.005, mat, (x0 + x1) / 2, (y0 + y1) / 2, -0.0885);
    b.rotation.z = -Math.atan2(dx, dy); return b;
  };
  const boltB = (x, y, z, len) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 4), steel);
    b.rotation.x = Math.PI / 2; b.position.set(x, y, z); g.add(b);
    box(0.014, len, 0.004, rust, x + 0.01, y - len / 2 - 0.01, z + 0.0015);
  };
  for (const [x0, x1] of [[-1.38, -0.08], [0.08, 1.38]]) {
    brace(x0, 0.72, x1, 1.88, steel); brace(x0, 1.88, x1, 0.72, steelB);
    box(0.12, 0.12, 0.004, steel, (x0 + x1) / 2, 1.3, -0.0925);
    for (const [bx, by] of [[x0, 0.72], [x1, 0.72], [x0, 1.88], [x1, 1.88], [(x0 + x1) / 2, 1.3]]) boltB(bx, by, -0.095, 0.12);
  }
  for (const [x0, x1] of [[-W / 2 + 0.08, -0.04], [0.04, W / 2 - 0.08]]) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    box(len, 0.04, 0.004, steelB, cx, 2.26, -0.036);
    box(len, 0.004, 0.04, steelB, cx, 2.282, -0.056);
    for (let sx = x0 + 0.2; sx < x1; sx += 0.4) boltB(ribAt(sx).crest - PITCH / 2, 2.26, -0.04, 0.08);
  }
  {
    const r = ribAt(-1.3), left = r.X - PITCH / 2, wP = 6 * PITCH, zP = -0.02 - 0.006;
    const pm = corrSheet(wP, 0.62, M(0x8f9492, 'metal', 0.74, 0.5, true)); pm.position.set(left + wP / 2, 1.0, zP); g.add(pm);
    for (const [bx, by] of [[left + PITCH * 0.75, 1.07], [left + PITCH * 4.75, 1.07], [left + PITCH * 0.75, 1.55], [left + PITCH * 4.75, 1.55]]) boltB(bx, by, zP - AMP - TH / 2 - 0.004, 0.1);
  }
  // dirt and rust on the sheet back: at the two laps, and splash above the drift
  for (const lx of [-0.5, 0.5]) { box(0.03, 2.2, 0.004, rustD, lx, 1.2, -0.036); box(0.06, 0.4, 0.004, rust, lx + 0.03, 0.6, -0.037); }
  for (let sx = -1.3; sx < 1.4; sx += 0.35) box(0.12, 0.08 + 0.05 * Math.abs(Math.sin(sx * 3)), 0.004, sandL, sx, 0.34, -0.036);
  // ---- sand drift, front berm and back skin ----
  box(W, 0.05, 0.04, sand, 0, 0.025, 0.01);
  box(W - 0.8, 0.06, 0.03, sand, -0.1, 0.075, 0.005);
  box(1.4, 0.06, 0.02, dust, 0.3, 0.13, 0.0);
  box(0.7, 0.05, 0.015, dust, 0.6, 0.18, -0.003);
  box(W, 0.05, 0.02, sand, 0, 0.025, -0.10);
  box(1.2, 0.06, 0.015, sandL, 0.7, 0.075, -0.098);
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
