// rock_outcrop_small r13 rebuild (rev 2): three squat sandstone blocks, not barrels. Each boulder is a ring lattice
// on a rounded rectangle plan (plan superellipse), wider and deeper than it is tall, near vertical sides that tuck
// in at the foot, a flat bedding top with a small eroded shoulder, one or two bedding lines as recessed band
// joints down the sides, small chips knocked out of the top edges, displaced by inline layered value noise. The
// upper block rests across the two lower ones with real contact, a rubble chock under its tail; sand skirt feathers
// the foot to y = 0. Material recipe 'stone' with pale/dark colour variants ('ground' for the skirt).
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 23; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const V3 = THREE.Vector3;
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, rockPale: 0xd2c2a0, rockDark: 0x9e8a6f, rockBand: 0xb09b7c, rockBase: 0xb7a283 };
  const mat = (hex, name, r = 0.92, mt = 0.0, flat = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, flatShading: flat }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  // ---- layered value noise (inline, seeded). fbm(p, oct) in [-1, 1]
  const hash3 = (x, y, z) => { const t = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + 23 * 0.917) * 43758.5453; return t - Math.floor(t); };
  const sm = (t) => t * t * (3 - 2 * t);
  const vnoise = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
    let v = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += hash3(ix + a, iy + b, iz + c) * (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz);
    return v * 2 - 1;
  };
  const fbm = (x, y, z, oct = 3, lac = 2.1, gain = 0.5) => { let a = 1, f = 1, v = 0, n = 0; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f + i * 3.7, y * f + i * 1.3, z * f + i * 9.1); n += a; a *= gain; f *= lac; } return v / n; };
  // periodic 1D noise round the outline: sampled on a circle so theta = 0 and 2 pi agree
  const ring = (th, k, ph) => fbm(Math.cos(th) * k + ph, Math.sin(th) * k + ph * 0.3, ph * 1.7, 2);

  // ---- a squat block. Ring lattice: plan radius follows a superellipse (rounded rectangle, exponent planQ), the
  // side profile is near vertical with a foot tuck and a small rounded shoulder under the flat top, the top is a
  // set of cap rings walking inward. Bedding lines: the block is cut into bands, each band its own vertex set
  // (hard edge at the joint, flat shaded), the bottom of a band tucked in so the bed above overhangs it. Chips:
  // a few top edge vertices are dropped and pushed in. Every vertex gets layered value noise. Then the whole
  // block is tilted about its centre and lifted, anything under the ground clamped to y = 0.
  const block = (o) => {
    const { cx, cz, hx, hz, h, S } = o;                // half extents in plan, height
    const seedB = o.seed || 0;
    const bands = o.bands;                             // [{y0, y1, tone}] ascending, y1 of last = h
    const planQ = o.planQ || 4.2;
    const nAmp = o.noise === undefined ? 0.03 : o.noise; // metres
    const lobeAmp = o.lobe === undefined ? 0.05 : o.lobe;
    const shoulder = o.shoulder === undefined ? 0.06 : o.shoulder;   // metres of rounded top edge
    const foot = o.foot === undefined ? 0.05 : o.foot;               // metres of tuck at the foot
    const yaw = o.yaw || 0;
    const plan = (th) => Math.pow(Math.pow(Math.abs(Math.cos(th)), planQ) + Math.pow(Math.abs(Math.sin(th)), planQ), -1 / planQ);
    const outline = (th) => 1 + lobeAmp * ring(th, 1.4, seedB * 2.1) + lobeAmp * 0.5 * ring(th, 3.1, seedB * 5.3);
    const chips = []; for (let i = 0; i < (o.chips || 2); i++) chips.push({ i: Math.floor(rr(0, S)), d: rr(0.025, 0.05) });
    const toneMats = {};
    const matFor = (tone) => toneMats[tone] || (toneMats[tone] = mat(tone, 'stone', 0.93, 0, true));
    const meshes = [];
    let prevTop = null;                                // top ring of the band below: the next band starts from it (ledge face, no seam)
    bands.forEach((b, bi) => {
      const isTop = bi === bands.length - 1;
      const rings = [];                                // {y, t (0..1 in band), cap (0 side, >0 = inset fraction), tuck (metres)}
      const rec = b.recess === undefined ? 0.03 : b.recess;
      const yTop = isTop ? b.y1 - shoulder : b.y1;
      const nr = o.ringsPerBand || 3;
      for (let i = 0; i < nr; i++) { const t = i / (nr - 1); rings.push({ y: b.y0 + (yTop - b.y0) * t, t, cap: 0, tuck: (bi === 0 ? foot * Math.pow(1 - t, 2) : rec * Math.pow(1 - t, 1.5)) }); }
      if (isTop) { rings.push({ y: b.y1 - shoulder * 0.35, t: 1, cap: 0, tuck: shoulder * 0.45 }); [0.12, 0.34, 0.6, 0.85, 1].forEach((c) => rings.push({ y: b.y1, t: 1, cap: c, tuck: 0 })); }
      const nR = rings.length, pos = [], col = [], idx = [];
      const cbase = new THREE.Color(b.tone);
      const topRing = [];
      for (let r = 0; r < nR; r++) {
        const R = rings[r];
        const edge = isTop && R.cap === 0.12;          // the top edge ring: chips live here
        for (let i = 0; i < S; i++) {
          const th = (i / S) * PI * 2;
          const pf = plan(th) * outline(th) * b.scale;
          let rad = pf * (R.cap > 0 ? 1 - R.cap * 0.92 : 1);
          let dx = Math.cos(th) * hx * rad, dz = Math.sin(th) * hz * rad;
          const L = Math.hypot(dx, dz) || 1;
          let tuck = R.tuck;
          const chip = chips.find((c) => c.i === i || (c.i + 1) % S === i);
          if (edge && chip) tuck += chip.d;
          dx -= (dx / L) * tuck; dz -= (dz / L) * tuck;
          let n = fbm((cx + dx) * 2.2 + seedB, R.y * 2.2, (cz + dz) * 2.2, 3) * nAmp + fbm((cx + dx) * 7, R.y * 7, (cz + dz) * 7 + seedB, 2) * nAmp * 0.4;
          if (R.cap > 0) n *= 0.5;
          let px = cx + dx + (dx / L) * n, pz = cz + dz + (dz / L) * n, py = R.y;
          if (R.cap > 0) py += fbm(px * 3, 11 + seedB, pz * 3, 2) * h * 0.03 + (o.dome || 0) * Math.sin(R.cap * PI * 0.5);
          else if (R.t > 0 && R.t < 1) py += fbm(px * 3, R.y, pz * 3, 2) * (b.y1 - b.y0) * 0.1;
          else if (R.t === 0 && bi > 0) py += fbm(px * 2.5, 7 + bi + seedB, pz * 2.5, 2) * 0.02;   // wavy bedding plane
          else if (R.t === 1 && !isTop) py += fbm(px * 2.5, 8 + bi + seedB, pz * 2.5, 2) * 0.02;
          if (edge && chip) py -= chip.d * 0.8;
          if (R.cap === 1) { px = cx + fbm(1, bi + seedB, 2) * hx * 0.1; pz = cz + fbm(3, bi + seedB, 5) * hz * 0.1; }
          pos.push(px, py, pz);
          if (r === nr - 1) topRing.push(px, py, pz);
          const k = 0.88 + 0.14 * R.t + (R.cap > 0 ? 0.08 : 0) + 0.06 * fbm(px * 2, py * 2, pz * 2, 2) - (R.t === 0 && bi > 0 ? 0.1 : 0) - (R.t === 1 && !isTop ? 0.12 : 0);
          col.push(cbase.r * k, cbase.g * k, cbase.b * k);
        }
      }
      // closure: band 0 gets a bottom fan (the block may be lifted or tilted, so its underside is seen); every
      // later band starts from a copy of the band below's top ring so its tucked bottom ring is a real ledge face.
      let off = 1, bottomPole = false;
      if (bi === 0) {
        const bp = [], bc = []; for (let i = 0; i < S; i++) { bp.push(cx, b.y0, cz); bc.push(cbase.r * 0.7, cbase.g * 0.7, cbase.b * 0.7); }
        pos.unshift(...bp); col.unshift(...bc); bottomPole = true;
      } else {
        const lc = []; for (let i = 0; i < S; i++) lc.push(cbase.r * 0.72, cbase.g * 0.72, cbase.b * 0.72);
        pos.unshift(...prevTop); col.unshift(...lc);
      }
      prevTop = topRing;
      for (let r = 0; r < nR + off - 1; r++) {
        const capPole = rings[r + 1 - off].cap === 1;
        for (let i = 0; i < S; i++) {
          const a = r * S + i, b2 = r * S + (i + 1) % S, c = (r + 1) * S + i, d = (r + 1) * S + (i + 1) % S;
          if (r === 0 && bottomPole) idx.push(d, a, c); else if (capPole) idx.push(a, c, b2); else idx.push(a, c, b2, b2, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      meshes.push({ geo: geo.toNonIndexed(), tone: b.tone });
    });
    // tilt about the block centre (mid height), yaw, lift, clamp to ground
    const e = new THREE.Euler(o.tilt ? o.tilt[0] : 0, yaw, o.tilt ? o.tilt[1] : 0, 'YXZ'), w = new V3(), lift = o.lift || 0;
    meshes.forEach(({ geo, tone }) => {
      const pv = geo.attributes.position;
      for (let i = 0; i < pv.count; i++) { w.set(pv.getX(i) - cx, pv.getY(i) - h * 0.5, pv.getZ(i) - cz).applyEuler(e); pv.setXYZ(i, w.x + cx, Math.max(0, w.y + h * 0.5 + lift), w.z + cz); }
      geo.computeVertexNormals();
      add(geo, matFor(tone));
    });
  };

  // ---- rubble: a displaced icosahedron, squashed, flattened where it meets the ground so it sits half buried
  const rubble = (x, z, r, seed, yaw = 0, sink = 0.35) => {
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const p = geo.attributes.position;
    const sy = rr(0.55, 0.8), sx = rr(0.85, 1.2);
    const nv = new V3();
    for (let i = 0; i < p.count; i++) {
      nv.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const n = 1 + 0.28 * fbm(nv.x * 1.7 + seed, nv.y * 1.7, nv.z * 1.7 + seed, 2) + 0.1 * fbm(nv.x * 5 + seed, nv.y * 5, nv.z * 5, 2);
      let px = nv.x * r * n * sx, py = nv.y * r * n * sy, pz = nv.z * r * n;
      // a bedding step across the middle: the upper half sits a touch out
      if (py > r * 0.05) { px *= 1.05; pz *= 1.05; }
      p.setXYZ(i, px, py, pz);
    }
    geo.computeVertexNormals();
    const geo2 = geo.toNonIndexed(); geo2.computeVertexNormals();
    const o = add(geo2, mat(rnd() < 0.5 ? P.rock : P.rockBand, 'stone', 0.93, 0, true), x, r * sy * (1 - sink), z);
    o.rotation.y = yaw;
    // clip the buried part to the ground plane: nothing below y = 0 after placement
    o.updateMatrix();
    const pp = geo2.attributes.position, w = new V3();
    for (let i = 0; i < pp.count; i++) { w.set(pp.getX(i), pp.getY(i), pp.getZ(i)).applyMatrix4(o.matrix); if (w.y < 0) { w.y = 0; w.applyMatrix4(o.matrix.clone().invert()); pp.setXYZ(i, w.x, w.y, w.z); } }
    return o;
  };

  // ---- sand skirt: a low ring lattice from the foot outline out to a feathered toe at y = 0
  const skirt = (pts, cx, cz, out, hIn) => {
    const S = pts.length, pos = [], idx = [];
    const rows = [[0.0, hIn, -0.06], [0.42, hIn * 0.55, 0], [0.75, hIn * 0.18, 0], [1.0, 0, 0]];
    rows.forEach(([f, y, inset]) => {
      for (let i = 0; i < S; i++) {
        const [px, pz] = pts[i];
        const dx = px - cx, dz = pz - cz, L = Math.hypot(dx, dz) || 1;
        const th = Math.atan2(dz, dx);
        const reach = out * (1 + 0.35 * ring(th, 1.1, 9));
        const ex = (dx / L) * (reach * f + inset), ez = (dz / L) * (reach * f + inset);
        const yy = y + (y > 0 ? fbm((px + ex) * 2, 3, (pz + ez) * 2, 2) * y * 0.3 : 0);
        pos.push(px + ex, Math.max(0, yy), pz + ez);
      }
    });
    for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < S; i++) {
      const a = r * S + i, b = r * S + (i + 1) % S, c = (r + 1) * S + i, d = (r + 1) * S + (i + 1) % S;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    add(geo, mat(P.sand, 'ground', 0.97));
  };


  // plan: block A (the big one, 0.9 x 0.7 x 0.55) front left, block C (small) front right, block B resting across the
  // back halves of both, tilted so its tail drops onto a rubble chock: real contact, the upper block reads as
  // fallen onto the lower two. Each block: rounded rectangle plan, flat top, one or two bedding lines, chips.
  block({ cx: -0.45, cz: 0.12, hx: 0.45, hz: 0.35, h: 0.55, S: 16, seed: 1, yaw: 0.12, tilt: [0.02, -0.03], chips: 3, noise: 0.03,
    bands: [{ y0: 0, y1: 0.2, tone: P.rockBand, scale: 0.985, recess: 0 }, { y0: 0.2, y1: 0.38, tone: P.rock, scale: 1, recess: 0.015 }, { y0: 0.38, y1: 0.55, tone: P.rockPale, scale: 0.99, recess: 0.015 }] });
  block({ cx: 0.5, cz: 0.32, hx: 0.3, hz: 0.24, h: 0.36, S: 14, seed: 2, yaw: -0.35, tilt: [-0.04, 0.05], chips: 2, noise: 0.025, shoulder: 0.045,
    bands: [{ y0: 0, y1: 0.16, tone: P.rockBand, scale: 0.98, recess: 0 }, { y0: 0.16, y1: 0.36, tone: P.rock, scale: 1, recess: 0.015 }] });
  block({ cx: -0.15, cz: -0.2, hx: 0.42, hz: 0.3, h: 0.44, S: 16, seed: 3, yaw: 0.25, tilt: [-0.3, 0.1], lift: 0.42, chips: 3, noise: 0.03,
    bands: [{ y0: 0, y1: 0.2, tone: P.rock, scale: 0.99, recess: 0 }, { y0: 0.2, y1: 0.44, tone: P.rockPale, scale: 1, recess: 0.015 }] });
  rubble(-0.3, -0.62, 0.27, 4, 0.7, 0.25);      // chock under the tail of B
  rubble(0.75, -0.15, 0.13, 5, 1.9, 0.45);    // loose chip by C
  {
    const S = 40, pts = [];
    for (let i = 0; i < S; i++) { const th = (i / S) * PI * 2; const f = 1 + 0.08 * ring(th, 1.2, 4); pts.push([0.0 + Math.cos(th) * 0.85 * f, 0.0 + Math.sin(th) * 0.62 * f]); }
    skirt(pts, 0.0, 0.0, 0.14, 0.09);
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
