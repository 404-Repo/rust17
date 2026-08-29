// rock_outcrop_large r13 rebuild: coded sandstone, not slabs. A stratified body built as a hand made ring lattice (quarter
// superellipse profile, rounded wind eroded shoulder, bedding planes as hard edges between bands, each band
// its own shifted, scaled ring set with a recessed underside), displaced by inline layered value noise, with
// displaced icosahedron rubble clipped to the ground plane and a sand skirt feathering to y = 0. No boxes.
// Material recipe 'stone' with pale/dark colour variants per band ('ground' for the skirt).
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const V3 = THREE.Vector3;
  const P = { sand: 0xcdb88e, packed: 0xa89372, rock: 0xc4b393, rockPale: 0xd2c2a0, rockDark: 0x9e8a6f, rockBand: 0xb09b7c, rockBase: 0xb7a283 };
  const mat = (hex, name, r = 0.92, mt = 0.0, flat = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, flatShading: flat, side: THREE.DoubleSide });   // round 18c: two sided, the bands read as open shells from below with front faces only m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  // ---- layered value noise (inline, seeded). fbm(p, oct) in [-1, 1]
  const hash3 = (x, y, z) => { const t = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + 11 * 0.917) * 43758.5453; return t - Math.floor(t); };
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

  // ---- the stratified body. A hand made lattice of rings: side rings follow a quarter superellipse (near vertical
  // sides, rounded wind eroded shoulder), then cap rings walk inward across a slightly domed top. Each strata band
  // owns its own ring vertices so computeVertexNormals leaves a hard edge at every bedding plane while the vertices
  // inside a band shade smooth. The band underside is pushed in (recess) so the beds read as ledges, every band
  // is shifted and scaled a little so the strata step in and out, and every vertex is displaced by layered value
  // noise. Rings close modulo S (no seam). One Mesh per band with its own colour variant of 'stone'.
  const body = (o) => {
    const { cx, cz, rx, rz, h, S } = o;
    const seedB = o.seed || 0;
    const bands = o.bands;                        // [{y0, y1, tone}] ascending, y1 of last = h
    const q = o.q || 7;                           // superellipse exponent
    const lobeAmp = o.lobe === undefined ? 0.16 : o.lobe, lobeK = o.lobeK || 1.3;
    const nAmp = o.noise === undefined ? 0.05 : o.noise;   // fraction of min radius
    const rmin = Math.min(rx, rz);
    const profile = (v) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, v), q)), 1 / q);
    const outline = (th) => 1 + lobeAmp * ring(th, lobeK, seedB * 2.1) + lobeAmp * 0.6 * (Math.abs(ring(th, lobeK * 2.7, seedB * 5.3)) - 0.35);
    const jointAmp = (o.joint === undefined ? 0.07 : o.joint) * rmin, jointK = o.jointK || 4.5;
    const joint = (th) => Math.max(0, ring(th, jointK, seedB * 3.3 + 8) - 0.12) * jointAmp + Math.max(0, ring(th, jointK * 2.3, seedB + 21) - 0.3) * jointAmp * 0.6;
    const shoulder = o.shoulder === undefined ? 0.08 * h : o.shoulder;
    const yaw = o.yaw || 0;
    const toneMats = {};
    const matFor = (tone) => toneMats[tone] || (toneMats[tone] = mat(tone, 'stone', 0.93, 0, !!o.flat));
    const skirtPts = [];                          // foot outline for the sand skirt
    let prevTop = null;                           // the top ring of the band below: the next band starts from it, so
                                                  // its recessed underside is a real ledge face and not an open seam
    bands.forEach((b, bi) => {
      const isTop = bi === bands.length - 1;
      const bh = b.y1 - b.y0;
      const nr = o.ringsPerBand || 3;
      const rings = [];                           // {y, rf (side radius factor), cap (0 side, >0 = cap inset fraction), t (0 bottom..1 top of band)}
      const sh = b.shift || [0, 0], sc = b.scale === undefined ? 1 : b.scale, rec = b.recess === undefined ? 0.2 : b.recess;
      const yTop = isTop ? b.y1 - shoulder : b.y1;
      for (let i = 0; i < nr; i++) { const t = i / (nr - 1); rings.push({ y: b.y0 + (yTop - b.y0) * t, t, cap: 0 }); }
      if (isTop) { [0.08, 0.3, 0.52, 0.72, 0.88, 1].forEach((c) => rings.push({ y: b.y1, t: 1, cap: c })); }
      const nR = rings.length, pos = [], col = [], idx = [];
      const cbase = new THREE.Color(b.tone);
      const topRing = [];
      for (let r = 0; r < nR; r++) {
        const R = rings[r];
        for (let i = 0; i < S; i++) {
          const th = (i / S) * PI * 2;
          const v = R.y / h;
          let rf = profile(v) * outline(th) * sc;
          // underside recess: the bottom of each band tucks in so the bed above overhangs it
          const cx0 = cx + sh[0], cz0 = cz + sh[1];
          let px, py, pz;
          if (R.cap === 0) {
            let dx = Math.cos(th + yaw) * rx * rf, dz = Math.sin(th + yaw) * rz * rf;
            { const L0 = Math.hypot(dx, dz) || 1, tuck = rec * Math.pow(1 - R.t, 1.8) + joint(th); dx -= (dx / L0) * tuck; dz -= (dz / L0) * tuck; }   // underside of the bed tucked in (metres)
            const n = fbm((cx0 + dx) * 1.1 / rmin + 0.3, R.y * 1.6 / rmin, (cz0 + dz) * 1.1 / rmin, 3) * nAmp * rmin
                    + fbm((cx0 + dx) * 5 / rmin, R.y * 5 / rmin, (cz0 + dz) * 5 / rmin, 2) * nAmp * 0.35 * rmin;
            const L = Math.hypot(dx, dz) || 1;
            px = cx0 + dx + (dx / L) * n; pz = cz0 + dz + (dz / L) * n;
            py = R.y + (R.t > 0 && R.t < 1 ? fbm(px * 3, R.y, pz * 3, 2) * bh * 0.12 : 0);
            if (R.y <= 1e-6) { py = 0; }
            else if (R.t === 0 && bi > 0) py = R.y + fbm(px * 1.4, 7 + bi, pz * 1.4, 2) * bh * 0.18;   // wavy bedding plane
            else if (R.t === 1 && !isTop) py = R.y + fbm(px * 1.4, 7 + bi + 1, pz * 1.4, 2) * (bands[bi + 1].y1 - bands[bi + 1].y0) * 0.18;
            if (bi === 0 && R.t === 0) skirtPts.push([px, pz]);
          } else {
            const f = (profile(rings[nr - 1].y / h) * outline(th) * sc - joint(th) / Math.max(rx, rz) * 0.5) * (1 - R.cap);
            const dx = Math.cos(th + yaw) * rx * f, dz = Math.sin(th + yaw) * rz * f;
            px = cx0 + dx; pz = cz0 + dz;
            const dome = (o.dome === undefined ? 0.025 : o.dome) * h * Math.sin(R.cap * PI * 0.5);
            py = R.y + dome + fbm(px * 1.6 / Math.max(1, rmin * 0.5), 11, pz * 1.6 / Math.max(1, rmin * 0.5), 3) * h * 0.035 * (0.5 + R.cap);
            if (R.cap === 1) { px = cx0 + fbm(1, bi, 2) * rx * 0.1; pz = cz0 + fbm(3, bi, 5) * rz * 0.1; }
          }
          pos.push(px, py, pz);
          if (r === nr - 1) topRing.push(px, py, pz);
          // vertex tone: paler toward the top of a band and on the cap, darker in the recess under a bed
          const k = 0.86 + 0.2 * R.t + (R.cap > 0 ? 0.08 : 0) + 0.06 * fbm(px * 2, py * 2, pz * 2, 2);
          col.push(cbase.r * k, cbase.g * k, cbase.b * k);
        }
      }
      // ledge: ring 0 of this band is a copy of the band below's top ring, so the face from it to this band's
      // tucked bottom ring is the underside of the bed (dark, in shadow). Closes the seam between bands.
      let off = 0;
      if (bi > 0 && prevTop) {
        const lc = []; for (let i = 0; i < S; i++) lc.push(cbase.r * 0.72, cbase.g * 0.72, cbase.b * 0.72);
        pos.unshift(...prevTop); col.unshift(...lc); off = 1;
      }
      prevTop = topRing;
      for (let r = 0; r < nR + off - 1; r++) {
        const capPole = rings[r + 1 - off].cap === 1;
        for (let i = 0; i < S; i++) {
          const a = r * S + i, b2 = r * S + (i + 1) % S, c = (r + 1) * S + i, d = (r + 1) * S + (i + 1) % S;
          if (capPole) { idx.push(a, c, b2); } else { idx.push(a, c, b2, b2, c, d); }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      const gOut = o.flat ? geo.toNonIndexed() : geo;
      if (o.tilt) {   // lean the whole mass about its foot; anything that dips below the ground is clamped to y = 0
        const pv = gOut.attributes.position, e = new THREE.Euler(o.tilt[0], 0, o.tilt[1]), w = new V3();
        for (let i = 0; i < pv.count; i++) { w.set(pv.getX(i) - cx, pv.getY(i), pv.getZ(i) - cz).applyEuler(e); pv.setXYZ(i, w.x + cx, Math.max(0, w.y), w.z + cz); }
      }
      gOut.computeVertexNormals();
      add(gOut, matFor(b.tone));
    });
    return skirtPts;
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
    const rows = [[0.0, hIn, -(0.3)], [0.42, hIn * 0.55, 0], [0.75, hIn * 0.18, 0], [1.0, 0, 0]];
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


  // plan (metres, before centring): a tall main mass, a lower east lobe, a low front lobe, six fallen blocks
  // along the south and east feet, a sand skirt feathering to the toe.
  const B5 = (h, tones, over) => {
    const cuts = [0, 0.19, 0.39, 0.6, 0.8, 1].map((f) => f * h);
    return tones.map((t, i) => ({ y0: cuts[i], y1: cuts[i + 1], tone: t, shift: [rr(-0.07, 0.07), rr(-0.07, 0.07)], scale: over === i ? 0.93 : rr(0.98, 1.02), recess: over === i ? 0.45 : rr(0.1, 0.22) }));
  };
  body({ cx: -0.4, cz: 0.1, rx: 2.7, rz: 1.65, h: 3.0, S: 56, seed: 1, flat: true, ringsPerBand: 4, lobe: 0.15, lobeK: 1.4, noise: 0.06, joint: 0.08, jointK: 6, yaw: 0.2,
    bands: B5(3.0, [P.rockBase, P.rockBand, P.rock, P.rockBand, P.rockPale], 2) });
  body({ cx: 2.35, cz: 0.35, rx: 1.65, rz: 1.5, h: 2.05, S: 40, seed: 2, flat: true, ringsPerBand: 3, lobe: 0.14, lobeK: 1.6, noise: 0.06, yaw: 1.1, q: 6,
    bands: [0, 0.3, 0.55, 0.78, 1].slice(0, 4).map((f, i, a) => ({ y0: f * 2.05, y1: (i === 3 ? 1 : a[i + 1]) * 2.05, tone: [P.rockBase, P.rock, P.rockBand, P.rockPale][i], shift: [rr(-0.1, 0.1), rr(-0.1, 0.1)], scale: rr(0.98, 1.02), recess: rr(0.08, 0.18) })) });
  body({ cx: -2.2, cz: 1.35, rx: 1.3, rz: 1.0, h: 1.3, S: 32, seed: 3, flat: true, ringsPerBand: 3, lobe: 0.12, noise: 0.07, yaw: 2.2, q: 5,
    bands: [{ y0: 0, y1: 0.5, tone: P.rockBase, shift: [0, 0], scale: 1, recess: 0.08 }, { y0: 0.5, y1: 0.95, tone: P.rockBand, shift: [0.08, -0.06], scale: 0.98, recess: 0.14 }, { y0: 0.95, y1: 1.3, tone: P.rockPale, shift: [-0.05, 0.04], scale: 0.96, recess: 0.1 }] });
  [[-1.2, 2.25, 0.4], [0.3, 2.3, 0.32], [1.6, 2.15, 0.26], [3.6, 1.5, 0.3], [3.9, -0.6, 0.22], [2.4, -1.6, 0.34]].forEach(([x, z, r], i) => rubble(x, z, r, i * 3.1, rr(0, PI), 0.35));
  {
    const S = 64, pts = [];
    for (let i = 0; i < S; i++) { const th = (i / S) * PI * 2; const f = 1 + 0.12 * ring(th, 1.2, 4); pts.push([0.2 + Math.cos(th) * 3.3 * f, 0.35 + Math.sin(th) * 1.95 * f]); }
    skirt(pts, 0.2, 0.35, 0.55, 0.14);
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
