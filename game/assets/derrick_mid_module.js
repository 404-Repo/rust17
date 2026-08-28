// derrick_mid_module candidate 2: a different reading. I section legs with web
// stiffeners, a horizontal at mid bay so the X braces meet a plate, the deck as four
// framed grating panels with visible seams and a kerb, a chain across the east
// opening as the concept shows, and the standpipe with flanged joints and U bolt
// saddle clamps to the north west leg.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const ox = M(0x7e4835, 'metal', 0.82, 0.15);
  const oxS = M(0x8d5a45, 'metal', 0.79, 0.15);
  const oxN = M(0x6d3f2e, 'metal', 0.85, 0.15);
  const oxE = M(0x7a4634, 'metal', 0.83, 0.15);
  const oxW = M(0x86513d, 'metal', 0.81, 0.15);
  const oxT = M(0x96674f, 'metal', 0.80, 0.15);
  const oxR = M(0x6f4732, 'metal', 0.90, 0.12);   // members gone to rust
  const rust = M(0x6b4426, 'metal', 0.92, 0.10);
  const galv = M(0x9ea3a1, 'metal', 0.70, 0.55);
  const galvD = M(0x8b9090, 'metal', 0.74, 0.55);
  const steel = M(0x4f5257, 'metal', 0.78, 0.30);
  const steelL = M(0x5c5f64, 'metal', 0.76, 0.30);
  const pipe = M(0x565a5e, 'metal', 0.75, 0.35);
  const pipeS = M(0x5e6266, 'metal', 0.74, 0.35);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.50, 0.60);   // machined: holds no dust film

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const box = (w, h, d, mat, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mm.position.set(x, y, z); (parent || g).add(mm); return mm; };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const frame = (p, q, up) => {
    const dir = q.clone().sub(p); const len = dir.length(); dir.normalize();
    const u = (up || (Math.abs(dir.y) > 0.9 ? V(0, 0, 1) : V(0, 1, 0))).clone();
    const xa = new THREE.Vector3().crossVectors(dir, u).normalize();
    const za = new THREE.Vector3().crossVectors(xa, dir).normalize();
    const gr = new THREE.Group();
    gr.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, dir, za));
    gr.position.copy(p).lerp(q, 0.5); g.add(gr); return { gr, len };
  };
  const bar = (p, q, w, t, mat, up) => { const { gr, len } = frame(p, q, up); box(w, len, t, mat, 0, 0, 0, gr); return gr; };

  const HT = 5.7, Y2 = 4.6, H0 = 4.0, H1 = 3.25;
  const hw = (y) => H0 - (H0 - H1) * (y / HT);

  // ---- legs: I section, stiffeners, splice plates at the foot ----
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = V(sx * (H0 - 0.08), 0, sz * (H0 - 0.08)), q = V(sx * (hw(HT) - 0.08), HT, sz * (hw(HT) - 0.08));
    const { gr, len } = frame(p, q, V(0, 0, sz));
    box(0.012, len, 0.14, ox, 0, 0, 0, gr);
    box(0.16, len, 0.014, sz > 0 ? oxS : oxN, 0, 0, 0.073, gr);
    box(0.16, len, 0.014, sz > 0 ? oxN : oxS, 0, 0, -0.073, gr);
    box(0.13, 0.008, 0.06, dust, 0, len / 2 + 0.004, 0, gr);
    for (let i = 1; i < 5; i++) { box(0.14, 0.012, 0.13, oxT, 0, -len / 2 + i * 1.15, 0, gr); box(0.13, 0.12, 0.006, rust, 0, -len / 2 + i * 1.15 - 0.07, 0.077, gr); }
    // splice: cover plates over both flanges, two rows of bolts
    for (const s of [-1, 1]) {
      box(0.18, 0.7, 0.012, s > 0 ? (sz > 0 ? oxS : oxN) : ox, 0, -len / 2 + 0.4, s * 0.086, gr);
      for (const dy of [-0.2, 0.15]) for (const dx of [-0.05, 0.05]) cyl(0.022, 0.03, gun, dx, -len / 2 + 0.4 + dy, s * 0.098, 'z', 6, gr);
    }
    box(0.1, 0.22, 0.006, rust, 0, -len / 2 + 0.08, 0.1, gr);
  }

  // ---- girts, mid bay horizontals, braces ----
  const faceMat = (f) => f === 'S' ? oxS : f === 'N' ? oxN : f === 'E' ? oxE : oxW;
  const faces = [['S', 0, 1], ['N', 0, -1], ['E', 1, 0], ['W', -1, 0]];
  const horizontal = (y, size, thick, withDust) => {
    const w = hw(y);
    for (const [f, nx, nz] of faces) {
      const mat = faceMat(f);
      if (nz) { box(2 * w, size, thick, mat, 0, y, nz * (w + 0.02)); if (withDust) box(2 * w - 0.6, 0.006, thick - 0.01, dust, 0, y + size / 2 + 0.003, nz * (w + 0.02)); }
      else { box(thick, size, 2 * w, mat, nx * (w + 0.02), y, 0); if (withDust) box(thick - 0.01, 0.006, 2 * w - 0.6, dust, nx * (w + 0.02), y + size / 2 + 0.003, 0); }
    }
    return w;
  };
  const gusset = (x, y, z, nx, nz, size, f) => {
    box(nx ? 0.014 : size, size, nz ? 0.014 : size, oxR, x + nx * 0.06, y, z + nz * 0.06);
    for (const u of [-0.12, 0.12]) for (const v of [-0.1, 0.1]) cyl(0.024, 0.03, gun, x + nx * 0.073 + (nz ? u : 0), y + v, z + nz * 0.073 + (nx ? u : 0), nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.1, 0.3, nz ? 0.006 : 0.1, rust, x + nx * 0.07, y - size / 2 - 0.15, z + nz * 0.07);
  };
  const levels = [0.12, 2.3, Y2 - 0.15];
  for (const y of levels) {
    const w = horizontal(y, 0.14, 0.06, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gusset(sx * w, y, sz * w, 0, sz, 0.4, sz > 0 ? 'S' : 'N'); gusset(sx * w, y, sz * w, sx, 0, 0.4, sx > 0 ? 'E' : 'W'); }
  }
  for (let li = 0; li < 2; li++) {
    const y1 = levels[li] + 0.14, y2 = levels[li + 1] - 0.14, ym = (y1 + y2) / 2;
    const w1 = hw(y1), w2 = hw(y2), wm = hw(ym);
    horizontal(ym, 0.08, 0.05, false);
    for (const [f, nx, nz] of faces) {
      const o = 0.05, mat = faceMat(f);
      for (const s of [-1, 1]) {
        let p, q;
        if (nz) { p = V(-s * w1, y1, nz * (w1 + o)); q = V(s * w2, y2, nz * (w2 + o)); }
        else { p = V(nx * (w1 + o), y1, -s * w1); q = V(nx * (w2 + o), y2, s * w2); }
        bar(p, q, 0.075, 0.02, s > 0 ? mat : oxR, V(nx, 0, nz));
      }
      // secondary X in each half bay: lighter flat bar in its own plane, so the lattice reads at every height
      for (const [ya, yb] of [[y1 + 0.05, ym - 0.06], [ym + 0.06, y2 - 0.05]]) {
        const wa = hw(ya), wb = hw(yb), o2 = o + 0.04;
        for (const s of [-1, 1]) {
          let p, q;
          if (nz) { p = V(-s * wa, ya, nz * (wa + o2)); q = V(s * wb, yb, nz * (wb + o2)); }
          else { p = V(nx * (wa + o2), ya, -s * wa); q = V(nx * (wb + o2), yb, s * wb); }
          bar(p, q, 0.05, 0.014, s > 0 ? oxR : mat, V(nx, 0, nz));
        }
      }
      box(nx ? 0.012 : 0.34, 0.34, nz ? 0.012 : 0.34, mat, nx * (wm + o + 0.02), ym, nz * (wm + o + 0.02));
      for (const u of [-0.1, 0.1]) for (const v of [-0.1, 0.1]) cyl(0.022, 0.03, gun, nx * (wm + o + 0.03) + (nz ? u : 0), ym + v, nz * (wm + o + 0.03) + (nx ? u : 0), nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.08, 0.24, nz ? 0.006 : 0.08, rust, nx * (wm + o + 0.03), ym - 0.29, nz * (wm + o + 0.03));
    }
  }

  // ---- deck frame: I beams, joists, and four framed grating panels with seams ----
  const D = 4.0, BY = Y2 - 0.16, wt = hw(Y2);
  const ibeam = (len, along, x, z, mat) => {
    if (along === 'x') { box(len, 0.22, 0.01, mat, x, BY, z); box(len, 0.012, 0.1, oxT, x, BY + 0.105, z); box(len, 0.012, 0.1, mat, x, BY - 0.105, z); }
    else { box(0.01, 0.22, len, mat, x, BY, z); box(0.1, 0.012, len, oxT, x, BY + 0.105, z); box(0.1, 0.012, len, mat, x, BY - 0.105, z); }
  };
  ibeam(2 * D, 'x', 0, D - 0.05, oxS); ibeam(2 * D, 'x', 0, -D + 0.05, oxN);
  ibeam(2 * D - 0.1, 'z', D - 0.05, 0, oxE); ibeam(2 * D - 0.1, 'z', -D + 0.05, 0, oxW);
  for (const z of [-wt, 0, wt]) ibeam(2 * D - 0.1, 'x', 0, z, ox);
  for (const x of [-wt, 0, wt]) ibeam(2 * D - 0.1, 'z', x, 0, ox);
  for (let i = -3; i <= 3; i++) {
    const u = i * 1.1;
    for (const [, nx, nz] of faces) {
      cyl(0.022, 0.03, gun, nx ? nx * (D - 0.04) : u, BY, nz ? nz * (D - 0.04) : u, nx ? 'x' : 'z', 6);
      box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, nx ? nx * (D - 0.038) : u, BY - 0.1, nz ? nz * (D - 0.038) : u);
    }
  }
  for (const px of [-1, 1]) for (const pz of [-1, 1]) {
    const cx = px * D / 2, cz = pz * D / 2, S = D - 0.06;
    // panel frame (flat bar edge), dusted plate, bearing bars along x
    box(S, 0.05, 0.04, galv, cx, Y2 - 0.025, cz + S / 2 - 0.02); box(S, 0.05, 0.04, galv, cx, Y2 - 0.025, cz - S / 2 + 0.02);
    box(0.04, 0.05, S, galv, cx + S / 2 - 0.02, Y2 - 0.025, cz);  box(0.04, 0.05, S, galv, cx - S / 2 + 0.02, Y2 - 0.025, cz);
    box(S - 0.08, 0.012, S - 0.08, steel, cx, Y2 - 0.045, cz);
    box(S - 0.2, 0.008, S - 0.2, dust, cx, Y2 - 0.036, cz);
    for (let i = 1; i < 32; i++) box(S - 0.08, 0.03, 0.018, i % 2 ? galv : galvD, cx, Y2 - 0.015, cz - S / 2 + i * (S / 32));
    for (let i = 1; i < 8; i++) box(0.018, 0.03, S - 0.08, galvD, cx - S / 2 + i * (S / 8), Y2 - 0.015, cz);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.3, 0.1, 0.3, ox, sx * wt, Y2 + 0.02, sz * wt);

  // ---- handrail: flat bar posts, tube rails, toe plate, chain across the east opening ----
  const E = D - 0.05, TOP = 1.1, MID = 0.55;
  const post = (x, z, nx, nz) => {
    box(nx ? 0.012 : 0.06, TOP, nz ? 0.012 : 0.06, steel, x, Y2 + TOP / 2, z);
    box(nx ? 0.012 : 0.1, 0.16, nz ? 0.012 : 0.1, steel, x, Y2 + 0.08, z);
    cyl(0.012, 0.03, gun, x + nx * 0.01, Y2 + 0.11, z + nz * 0.01, nx ? 'x' : 'z', 6);
    box(nx ? 0.006 : 0.05, 0.14, nz ? 0.006 : 0.05, rust, x + nx * 0.01, Y2 - 0.08, z + nz * 0.01);
  };
  const side = (along, sgn, gap) => {
    const segs = gap ? [[-E, -0.4], [0.4, E]] : [[-E, E]];
    for (const [a, b] of segs) {
      const len = b - a, c = (a + b) / 2;
      if (along === 'x') { cyl(0.025, len, steelL, c, Y2 + TOP, sgn * E, 'x', 8); cyl(0.022, len, steelL, c, Y2 + MID, sgn * E, 'x', 8); box(len, 0.15, 0.01, steel, c, Y2 + 0.075, sgn * (E - 0.03)); }
      else { cyl(0.025, len, steelL, sgn * E, Y2 + TOP, c, 'z', 8); cyl(0.022, len, steelL, sgn * E, Y2 + MID, c, 'z', 8); box(0.01, 0.15, len, steel, sgn * (E - 0.03), Y2 + 0.075, c); }
      const n = Math.max(1, Math.round(len / 1.1));
      for (let i = 0; i <= n; i++) { const u = a + (len * i) / n; if (along === 'x') post(u, sgn * E, 0, sgn); else post(sgn * E, u, sgn, 0); }
    }
  };
  side('x', 1, false); side('x', -1, false); side('z', 1, true); side('z', -1, false);
  // chain: a sagging run of small tori between the two east opening posts
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, z = -0.4 + 0.8 * t, sag = 0.12 * Math.sin(Math.PI * t);
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 8), gun);
    link.position.set(E, Y2 + TOP - sag, z); link.rotation.y = i % 2 ? 0 : Math.PI / 2; g.add(link);
  }

  // ---- standpipe: flanged pipe clamped with U bolts to the north west leg ----
  {
    const p = V(-(hw(0) - 0.08) - 0.14, 0, -(hw(0) - 0.08) - 0.14), q = V(-(hw(HT) - 0.08) - 0.14, HT, -(hw(HT) - 0.08) - 0.14);
    const { gr, len } = frame(p, q);
    cyl(0.05, len / 2 - 0.02, pipe, 0, -len / 4, 0, 'y', 10, gr);
    cyl(0.05, len / 2 - 0.02, pipeS, 0, len / 4, 0, 'y', 10, gr);
    cyl(0.08, 0.03, pipe, 0, -0.03, 0, 'y', 10, gr); cyl(0.08, 0.03, pipe, 0, 0.03, 0, 'y', 10, gr);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(0.01, 0.09, gun, 0.065 * Math.cos(a), 0, 0.065 * Math.sin(a), 'y', 6, gr); }
    box(0.05, 0.4, 0.006, rust, 0, -0.28, 0.05, gr);
    for (const yy of [0.8, 2.6, 4.3]) {
      const c = p.clone().lerp(q, yy / HT);
      // U bolt round the pipe, into a saddle plate bolted to the leg flange
      const u = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 10, Math.PI), gun);
      u.position.set(c.x, yy, c.z); u.rotation.x = -Math.PI / 2; u.rotation.z = Math.PI / 4; g.add(u);
      box(0.24, 0.1, 0.02, steel, c.x + 0.04, yy, c.z + 0.075);
      box(0.02, 0.1, 0.24, steel, c.x + 0.075, yy, c.z + 0.04);
      box(0.08, 0.3, 0.006, rust, c.x, yy - 0.2, c.z + 0.086);
      box(0.006, 0.3, 0.08, rust, c.x + 0.086, yy - 0.2, c.z);
    }
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
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
