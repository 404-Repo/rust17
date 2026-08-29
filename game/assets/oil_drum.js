// oil_drum candidate 0, round 4 detail pass (second pass: 28 segment lathes, rolled half round hoops and
// top chime with the rust in the crease under them, a dark hazard plate with a 0.12 m diamond). One revolved profile carries both chimes and both
// rolling hoops, split into a stained lower third and a bleached upper body. Round 4 rebuilds
// the hoops as rolled half round beads and the top chime as a fat rolled bead, adds a rust
// line in the crease under every hoop and chime, hex bung plugs in raised flanges, a curved
// hazard plate with a diamond on the front and a stencil plate on the back, a second dent low
// on the north side, and drips on more than one side.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, tank: 0x9c988c, concS: 0x857c6c, gun: 0x3a3d40, yellow: 0xc9a227 };
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
  const lathe = (pts, seg, m) => add(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m);
  // a curved plate lying on the shell: an open cylinder segment centred on angle a (radians from +x towards +z)
  const curved = (r, h, arc, a, y, m) => { const o = add(new THREE.CylinderGeometry(r, r, h, 6, 1, true, 0, arc), m, 0, y, 0); o.rotation.y = Math.PI / 2 - a - arc / 2; return o; };   // CylinderGeometry theta 0 is +z, so this centres the segment on a
  // a drip hanging on the shell at angle a
  const dripAt = (len, w, a, y, m) => drip(len, w, m, Math.cos(a) * (R + 0.004), y, Math.sin(a) * (R + 0.004), Math.PI / 2 - a);

  const R = 0.2925, H = 0.88, SEG = 28;
  const bleachedTan = tint(C.tank, 1.12);        // sun bleached tan steel
  const upperM = mat(bleachedTan, 'metal', 0.85, 0.15, THREE.DoubleSide);
  const upperS = mat(tint(bleachedTan, 1.06), 'metal', 0.85, 0.15);
  const lowerM = mat(tint(C.concS, 0.95), 'metal', 0.9, 0.1, THREE.DoubleSide);
  const hoopM = mat(tint(bleachedTan, 0.92), 'metal', 0.8, 0.2, THREE.DoubleSide);
  const lidM = mat(tint(bleachedTan, 0.97), 'metal', 0.85, 0.15, THREE.DoubleSide);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);
  const gun = mat(C.gun, 'metal', 0.7, 0.5);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const plateM = mat(tint(C.tank, 0.42), 'metal', 0.85, 0.15, THREE.DoubleSide);   // a dark hazard plate the diamond reads against
  const diamondM = mat(C.yellow, 'metal', 0.85, 0.1, THREE.DoubleSide);

  // a true half round: an arc of radius rr bulging out of the shell, centred on (rc, yc), 7 points
  const arc = (rc, yc, rr, n = 6) => { const o = []; for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (Math.PI * i) / n; o.push([rc + rr * Math.cos(t), yc + rr * Math.sin(t)]); } return o; };
  // rolling hoop: a rolled bead of radius 12 mm, so it has a crown that catches the sun and a shadow under it
  const bead = (yc) => arc(R, yc, 0.012);
  // lower third: bottom chime (a rolled bead too), shell, first hoop
  lathe([[0.25, 0.0], [R + 0.008, 0.0], [R + 0.012, 0.012], [R + 0.008, 0.024], [R, 0.032], ...bead(0.28), [R, 0.31]], SEG, lowerM);
  // upper body: shell with the second hoop, a fat rolled top chime (16 mm half round), recessed lid rim
  const upper = lathe([[R, 0.31], ...bead(0.60), [R, 0.846], ...arc(R - 0.002, 0.862, 0.016), [R - 0.012, H - 0.002], [R - 0.02, H - 0.008], [R - 0.02, H - 0.014], [0.0, H - 0.014]], SEG, upperM);
  // rust lives in the crease UNDER every rolled edge, where water sat: a thin dark line, not a band on the face
  lathe([[R + 0.001, 0.838], [R + 0.006, 0.845]], SEG, rustM);
  lathe([[R + 0.001, 0.264], [R + 0.005, 0.270]], SEG, rustM);
  lathe([[R + 0.001, 0.584], [R + 0.005, 0.590]], SEG, rustM);
  lathe([[R + 0.013, 0.004], [R + 0.013, 0.02]], SEG, rustM);
  // the crown of each hoop and the top chime a shade darker where the paint has worn through to steel
  lathe([[R + 0.0125, 0.277], [R + 0.0125, 0.283]], SEG, hoopM);
  lathe([[R + 0.0125, 0.597], [R + 0.0125, 0.603]], SEG, hoopM);
  // a curved polygon lying on the shell at radius r: pts as [angle, y] round the centroid, edges subdivided
  const curvedPoly = (r, pts, m) => {
    let ac = 0, yc = 0; for (const p of pts) { ac += p[0]; yc += p[1]; } ac /= pts.length; yc /= pts.length;
    const P = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const pos = [];
    for (let i = 0; i < pts.length; i++) {
      const a0 = pts[i], a1 = pts[(i + 1) % pts.length];
      for (let k = 0; k < 4; k++) {
        const t0 = k / 4, t1 = (k + 1) / 4;
        const p0 = P(a0[0] + (a1[0] - a0[0]) * t0, a0[1] + (a1[1] - a0[1]) * t0), p1 = P(a0[0] + (a1[0] - a0[0]) * t1, a0[1] + (a1[1] - a0[1]) * t1), c = P(ac, yc);
        // wind so the face points outward along the radius
        const ux = p0[0] - c[0], uy = p0[1] - c[1], uz = p0[2] - c[2], vx = p1[0] - c[0], vy = p1[1] - c[1], vz = p1[2] - c[2];
        const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
        if (nx * Math.cos(ac) + nz * Math.sin(ac) >= 0) pos.push(...c, ...p0, ...p1); else pos.push(...c, ...p1, ...p0);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return add(geo, m);
  };
  // dent, 0.15 m across, pushed into the upper shell on the -x side between the hoops
  const dentAt = (mesh, y0, y1, dentY, dentA, depth, rx, ry) => {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const r = Math.hypot(x, z); if (r < R - 0.001 || y < y0 || y > y1) continue;
      const a = Math.atan2(z, x);
      let da = Math.abs(a - dentA); if (da > Math.PI) da = 2 * Math.PI - da;
      const dArc = da * R, dy = Math.abs(y - dentY);
      const d = Math.hypot(dArc / rx, dy / ry);
      if (d < 1) { const k = depth * (1 - d * d); p.setXYZ(i, x - (x / r) * k, y, z - (z / r) * k); }
    }
    p.needsUpdate = true; mesh.geometry.computeVertexNormals();
  };
  dentAt(upper, 0.31, 0.64, 0.46, -0.30, 0.085, 0.105, 0.160);   // round 21: one big dent in the side, on the shell the player walks past   // round 21: the side dent is a real one now, deep enough to pull the 0.60 hoop in with it
  const lower = g.children[0];
  dentAt(lower, 0.04, 0.25, 0.15, -Math.PI / 2 + 0.5, 0.03, 0.06, 0.1);
  // lid: a flat disc inside the top chime with two hex bung plugs in raised flanges, dust settled on it
  cyl(R - 0.02, R - 0.02, 0.006, SEG, lidM, 0, H - 0.014, 0);
  cyl(0.2, 0.2, 0.004, SEG, dustM, 0, H - 0.009, 0);
  for (const [bx, bz, br] of [[0.19, 0.0, 0.03], [-0.19, 0.0, 0.02]]) {
    cyl(br + 0.012, br + 0.012, 0.008, 12, hoopM, bx, H - 0.006, bz);
    cyl(br, br, 0.014, 6, gun, bx, H, bz);
    cyl(br * 0.5, br * 0.5, 0.006, 6, gun, bx, H + 0.008, bz);
    lathe([[br + 0.012, H - 0.01], [br + 0.02, H - 0.012]], 12, rustM).position.set(bx, 0, bz);
  }
  // south face lighter: a thin skin panel on the +z side of the upper shell
  add(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.5, SEG, 1, true, -Math.PI / 4, Math.PI / 2), upperS, 0, 0.58, 0);
  // vertical weld seam with four rivets on the +x side, rust down the seam
  const seamA = 0.3;
  const sx = Math.cos(seamA) * (R + 0.002), sz = Math.sin(seamA) * (R + 0.002);
  const seam = box(0.006, 0.8, 0.004, mat(tint(bleachedTan, 0.85), 'metal', 0.8, 0.2), sx, 0.44, sz); seam.rotation.y = -seamA + Math.PI / 2;
  for (const ry of [0.12, 0.38, 0.5, 0.75]) { const rv = cyl(0.006, 0.006, 0.006, 6, gun, sx, ry, sz); rv.rotation.z = -Math.PI / 2; rv.rotation.y = -seamA; }
  dripAt(0.2, 0.03, seamA, 0.37, rustM);
  // hazard plate on the front (south): a dark curved plate with a 0.12 m safety yellow diamond and a
  // dark centre mark, both curved onto the shell so no corner sinks in; a stencil plate on the back
  curved(R + 0.003, 0.17, 0.62, Math.PI / 2, 0.47, plateM);
  const dA = 0.06 / R;
  curvedPoly(R + 0.006, [[Math.PI / 2 - dA, 0.47], [Math.PI / 2, 0.53], [Math.PI / 2 + dA, 0.47], [Math.PI / 2, 0.41]], diamondM);
  curvedPoly(R + 0.008, [[Math.PI / 2 - dA * 0.3, 0.47], [Math.PI / 2, 0.488], [Math.PI / 2 + dA * 0.3, 0.47], [Math.PI / 2, 0.452]], gun);
  for (const [px, py] of [[-0.09, 0.4], [0.09, 0.4], [-0.09, 0.54], [0.09, 0.54]]) curvedPoly(R + 0.007, [[Math.PI / 2 + px / R - 0.012, py], [Math.PI / 2 + px / R, py + 0.005], [Math.PI / 2 + px / R + 0.012, py], [Math.PI / 2 + px / R, py - 0.005]], gun);
  curved(R + 0.003, 0.07, 0.42, -Math.PI / 2, 0.18, plateM);
  curved(R + 0.0035, 0.02, 0.3, -Math.PI / 2 + 0.03, 0.2, mat(tint(C.tank, 0.55), 'metal', 0.85, 0.15, THREE.DoubleSide));
  // rust streaks from the bungs, the top chime and both hoops, on several sides
  dripAt(0.24, 0.05, 0.0, 0.85, rustM);   // shortened so its tail stops above the dent shoulder
  dripAt(0.2, 0.04, Math.PI - 0.1, 0.85, rustM);
  dripAt(0.16, 0.035, Math.PI / 2 + 0.6, 0.845, rustM);
  dripAt(0.12, 0.03, -Math.PI / 2 - 0.4, 0.845, rustM);
  dripAt(0.14, 0.03, Math.PI / 2, 0.255, rustM);
  dripAt(0.1, 0.03, Math.PI / 2 - 0.9, 0.575, rustM);
  dripAt(0.12, 0.035, -Math.PI / 2 + 0.8, 0.575, rustM);
  dripAt(0.08, 0.03, Math.PI + 0.7, 0.255, rustM);
  // sand fillet around the base as a low mound, and blown against the north side
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  lathe([[R - 0.02, 0.09], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  const drift = lathe([[0.0, 0.14], [R * 0.6, 0.1], [R + 0.012, 0.02], [R + 0.02, 0.0]], SEG, fill);
  drift.scale.set(0.95, 1, 0.5); drift.position.z = -0.12;
  // ---- round 21 battle damage: the bullet holes are PUNCHED GEOMETRY, not decals. Each is an outer ring
  //      lying on the shell, a torn collar 10 mm proud in bare bright steel, a wall falling away to a near
  //      black floor, and oil that has run out of the middle one as narrow ribbons of real geometry that
  //      break at the rolling hoop and pick up again below it. ----
  const tornM = mat(tint(bleachedTan, 1.22), 'metal', 0.62, 0.5, THREE.DoubleSide);
  const holeM = mat(0x0e0c0a, 'metal', 0.95, 0.10, THREE.DoubleSide);
  const oilM = mat(0x15110d, 'metal', 0.42, 0.15, THREE.DoubleSide);
  const shellAt = (a, y, off) => [Math.cos(a) * (R + off), y, Math.sin(a) * (R + off)];
  const rawAdd = (Pp, Ii, m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((Pp.length / 3) * 2).fill(0), 2));
    geo.setIndex(Ii); geo.computeVertexNormals(); return add(geo, m);
  };
  function craters(list) {
    const PA = [], IA = [], PB = [], IB = [], N = 12;
    for (const [a0, y0, r] of list) {
      const bA = PA.length / 3, bB = PB.length / 3, ph = Math.abs(a0 * 7.31 + y0 * 3.17) % 6.2832;
      const wob = (k, sd) => 1 + 0.10 * Math.sin(k * 2.39 + ph + sd) + 0.05 * Math.sin(k * 4.71 + ph * 2 + sd);
      const put = (du, dv, off) => shellAt(a0 + du / R, y0 + dv, off);
      for (let k = 0; k < N; k++) {
        const t = (k / N) * Math.PI * 2 + ph * 0.13, ca = Math.cos(t), sa = Math.sin(t);
        const rO = r * 1.70 * wob(k, 0), rL = r * 1.26 * wob(k, 1.7), rM = r * 0.95 * wob(k, 3.4);
        PA.push(...put(ca * rO, sa * rO, 0.002), ...put(ca * rL, sa * rL, 0.011));
        PB.push(...put(ca * rL, sa * rL, 0.011), ...put(ca * rM, sa * rM, 0.005));
      }
      PB.push(...put(0, 0, 0.004));
      for (let k = 0; k < N; k++) {
        const k1 = (k + 1) % N, a = bA + k * 2, b = bA + k1 * 2, c = bB + k * 2, d = bB + k1 * 2;
        IA.push(a, a + 1, b + 1, a, b + 1, b);
        IB.push(c, c + 1, d + 1, c, d + 1, d, c + 1, bB + 2 * N, d + 1);
      }
    }
    rawAdd(PA, IA, tornM); rawAdd(PB, IB, holeM);
  }
  craters([[Math.PI / 2 - 0.78, 0.71, 0.021], [Math.PI / 2 - 0.60, 0.45, 0.024], [Math.PI / 2 + 0.22, 0.74, 0.018]]);
  // a run of oil: a strip that starts wide at the rim and thins as it goes, standing off the shell and wandering
  function ribbon(a0, yTop, len, w0, w1, seg, m) {
    const PA = [], IA = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, y = yTop - len * t, w = w0 + (w1 - w0) * t, off = 0.005 - 0.002 * t;
      const wa = 0.5 * w * Math.sin(t * 6.1 + a0 * 3.3);
      PA.push(...shellAt(a0 + (wa - w / 2) / R, y, off), ...shellAt(a0 + (wa + w / 2) / R, y, off));
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; IA.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    rawAdd(PA, IA, m);
  }
  ribbon(Math.PI / 2 - 0.60, 0.424, 0.124, 0.028, 0.015, 3, oilM);   // out of the rim, down to the hoop
  ribbon(Math.PI / 2 - 0.58, 0.262, 0.20, 0.016, 0.006, 4, oilM);    // and on below it
  ribbon(Math.PI / 2 - 0.66, 0.418, 0.085, 0.010, 0.004, 2, oilM);   // a second thinner trickle
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
