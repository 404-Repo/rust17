// jersey_barrier, round 13 rebuild (audit: "bland slab"). The old loft was ONE mesh with a material
// array; the material system and the weathering pass both skip array materials, so the whole body
// shipped as an untextured flat slab. Now every profile face is its own mesh with a named 'stone'
// material: the true Jersey profile (0.6 m base, vertical toe, lower batter to 0.25 m, upper batter
// to the 0.2 m top) as a polygon swept along x in 0.25 m bays. Two chipped top edge spots are real
// missing wedges: the top and slope faces are re-cut around a notch and a rough inner face fills it.
// Lifting loop recess in each end face with a bent rebar loop and a rust drip, tongue on +x, groove
// on -x, stained lower band, tyre scuffs on the batter, mould seams at the thirds, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, concB: 0xb8ae9b, concS: 0x857c6c, rust: 0x6b4426, rock: 0xc4b393 };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.0, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (r, h, m, x, y, z, seg) => add(new THREE.CylinderGeometry(r, r, h, seg || (r >= 0.08 ? 16 : 8)), m, x, y, z);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  const wedge = (L, out, h, m, x, z, ry) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
    const o = add(geo, m, x, 0, z); o.rotation.y = ry; return o;
  };
  const tri = (pts, m) => { // pts: 3 THREE.Vector3, winding as given
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    geo.computeVertexNormals(); return add(geo, m);
  };

  const L = 3.0, H = 0.82;
  const concM = mat(C.concB, 'stone', 0.92);                   // top, upper slopes, ends
  const concN = mat(tint(C.concB, 0.96), 'stone', 0.92);       // north upper slope, a touch darker
  const stainM = mat(tint(C.concS, 0.86), 'stone', 0.95);                  // stained toe and lower batter
  const stainS = mat(tint(C.concS, 0.94), 'stone', 0.95);      // sun side stained band
  const recessM = mat(tint(C.concS, 0.8), 'stone', 0.95);      // pocket and groove interiors
  const chipM = mat(tint(C.concS, 1.02), 'stone', 0.97);        // fresh fracture, paler and rough
  const aggM = mat(0x5a544c, 'stone', 0.95);                   // aggregate in the fracture
  const scuffM = mat(tint(C.concS, 0.8), 'stone', 0.9);       // tyre rubber on the batter
  const seamM = mat(tint(C.concB, 0.88), 'stone', 0.9);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);

  // ---- the profile, clockwise seen from +x, as (z, y); the material belongs to the edge that starts here
  const P = [
    [0.30, 0.0, stainS], [0.30, 0.10, stainS], [0.215, 0.25, concM], [0.10, H, concM],
    [-0.10, H, concN], [-0.215, 0.25, stainM], [-0.30, 0.10, stainM], [-0.30, 0.0, null],
  ];
  const NE = P.length - 1; // the bottom edge is not built
  // two chips on the top edge: [x, half width, depth into the top, depth down the slope, side]
  const CHIPS = [[-0.875, 0.11, 0.09, 0.14, +1], [0.625, 0.09, 0.075, 0.11, -1]]; // each inside one 0.25 m bay
  const BAY = 0.25, NB = Math.round(L / BAY);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const centre = (x) => V3(x, 0.45, 0);
  const faceTri = (a, b, c, m) => { // outward facing triangle of the body
    const n = V3().subVectors(b, a).cross(V3().subVectors(c, a)), mid = V3().addVectors(a, b).add(c).multiplyScalar(1 / 3);
    return n.dot(mid.sub(centre(mid.x))) < 0 ? tri([a, c, b], m) : tri([a, b, c], m);
  };
  // each edge e of the profile, each bay: a rectangle in (x, t) with t along the edge, cut by the chips
  // that sit on its top corner (edge 2 top side, edge 3 top face, edge 4 north slope)
  for (let e = 0; e < NE; e++) {
    const A = P[e], B = P[e + 1], m = A[2];
    const dz = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dz, dy);
    const at = (x, t) => V3(x, A[1] + dy * t / len, A[0] + dz * t / len);
    for (let b = 0; b < NB; b++) {
      const x0 = -L / 2 + b * BAY, x1 = x0 + BAY;
      // the polygon runs (x,t) counter clockwise: bottom edge then up, with notches inserted on the edge that
      // carries the chip base
      let poly = [[x0, 0], [x1, 0], [x1, len], [x0, len]];
      for (const ch of CHIPS) {
        const [cx, hw, dTop, dSlope, side] = ch;
        if (cx - hw < x0 || cx + hw > x1) continue;
        if (e === 3) { // top face: base on t=0 (side +1, south corner) or t=len (side -1, north corner)
          if (side > 0) poly = [[x0, 0], [cx - hw, 0], [cx, dTop], [cx + hw, 0], [x1, 0], [x1, len], [x0, len]];
          else poly = [[x0, 0], [x1, 0], [x1, len], [cx + hw, len], [cx, len - dTop], [cx - hw, len], [x0, len]];
        } else if (e === 2 && side > 0) { // south upper slope: base on t=len
          poly = [[x0, 0], [x1, 0], [x1, len], [cx + hw, len], [cx, len - dSlope], [cx - hw, len], [x0, len]];
        } else if (e === 4 && side < 0) { // north upper slope: base on t=0
          poly = [[x0, 0], [cx - hw, 0], [cx, dSlope], [cx + hw, 0], [x1, 0], [x1, len], [x0, len]];
        }
      }
      const pts2 = poly.map((p) => new THREE.Vector2(p[0], p[1]));
      const tris = THREE.ShapeUtils.triangulateShape(pts2, []);
      const pos = [];
      for (const t of tris) for (const i of t) { const v = at(poly[i][0], poly[i][1]); pos.push(v.x, v.y, v.z); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      // triangulateShape winds CCW in (x,t); flip if that faces inward for this edge
      const n = V3().fromBufferAttribute(geo.attributes.normal, 0), mid = at((x0 + x1) / 2, len / 2);
      if (n.dot(mid.clone().sub(centre(mid.x))) < 0) { geo.index = null; const p = geo.attributes.position; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i + 1), ay = p.getY(i + 1), az = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ax, ay, az); } geo.computeVertexNormals(); }
      add(geo, m);
    }
  }
  // ---- the chips: rough inner faces of the missing wedge, a sunk centre point, a little aggregate showing
  for (const [cx, hw, dTop, dSlope, side] of CHIPS) {
    const zTop = side * 0.10, slope = side > 0 ? [P[2], P[3]] : [P[4], P[3]]; // slope from the 0.25 corner up to the top
    const sdz = slope[1][0] - slope[0][0], sdy = slope[1][1] - slope[0][1], sl = Math.hypot(sdz, sdy);
    const BL = V3(cx - hw, H, zTop), BR = V3(cx + hw, H, zTop);
    const AT = V3(cx, H, zTop - side * dTop);
    const AS = V3(cx, H - sdy * dSlope / sl, zTop - sdz * dSlope / sl);
    const I = V3(cx + hw * 0.15, H - 0.7 * dSlope * sdy / sl - 0.012, zTop - side * dTop * 0.45);
    for (const [a, b] of [[BL, AT], [AT, BR], [BR, AS], [AS, BL]]) faceTri(a, b, I, chipM);
    for (let k = 0; k < 3; k++) {
      const f = (k + 0.5) / 3;
      const p = V3().lerpVectors(k % 2 ? AT : AS, k % 2 ? BR : BL, f).lerp(I, 0.55);
      box(0.012, 0.01, 0.012, aggM, p.x, p.y, p.z).rotation.set(0.4 * k, 0.6, 0.3);
    }
  }
  // ---- mould seams at the thirds on both slopes and across the top
  const slopeRot = (e) => { const A = P[e], B = P[e + 1]; const dz = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dz, dy); return { ny: -dz / l, nz: dy / l, mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], len: l }; };
  const onFace = (e, x, t, w, h, m, proud) => { // thin strip lying on profile edge e, t in metres from the edge start, w along x, h along the edge
    const A = P[e], B = P[e + 1], dz = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dz, dy), ny = -dz / l, nz = dy / l;
    const o = box(w, h, 0.002, m, x, A[1] + dy * t / l + ny * proud, A[0] + dz * t / l + nz * proud);
    o.rotation.x = Math.atan2(-ny, nz); return o;
  };
  for (const x of [-0.5, 0.5]) {
    onFace(2, x, slopeRot(2).len / 2, 0.012, slopeRot(2).len - 0.01, seamM, 0.002);
    onFace(4, x, slopeRot(4).len / 2, 0.012, slopeRot(4).len - 0.01, seamM, 0.002);
    box(0.012, 0.004, 0.19, seamM, x, H + 0.002, 0);
  }
  // ---- tyre scuffs: thin dark rubber strips on the batter, sun side heavier, a few on the toe bend
  const scuffs = [[-1.2, 2, 0.05, 0.6, 0.022], [-0.5, 2, 0.11, 0.8, 0.018], [0.4, 2, 0.03, 0.7, 0.025], [1.15, 2, 0.08, 0.45, 0.02],
    [-0.9, 1, 0.06, 0.5, 0.02], [0.6, 1, 0.09, 0.7, 0.025], [-0.2, 4, 0.05, 0.55, 0.02], [1.0, 4, 0.10, 0.4, 0.022], [0.9, 5, 0.06, 0.6, 0.025]];
  for (const [x, e, t, w, h] of scuffs) onFace(e, x, t + h / 2, w, h, scuffM, 0.0006).rotation.z = (x % 0.7) * 0.06;
  // ---- ends: lifting loop recess with the bent rebar loop and a rust drip; tongue on +x, groove on -x
  const capShape = (holes) => {
    const s = new THREE.Shape();
    s.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) s.lineTo(P[i][0], P[i][1]); s.closePath();
    for (const [z0, y0, z1, y1] of holes) { const h = new THREE.Path(); h.moveTo(z0, y0); h.lineTo(z1, y0); h.lineTo(z1, y1); h.lineTo(z0, y1); h.closePath(); s.holes.push(h); }
    return s;
  };
  const pocket = (ex, s, z0, y0, z1, y1, depth) => { // a rectangular recess into the end face, open toward s*x
    const w = z1 - z0, h = y1 - y0, zc = (z0 + z1) / 2, yc = (y0 + y1) / 2, xin = ex - s * depth;
    box(0.01, h, w, recessM, xin + s * 0.005, yc, zc);                       // back
    box(depth, 0.01, w, recessM, ex - s * depth / 2, y1 - 0.005, zc);         // ceiling
    box(depth, 0.01, w, recessM, ex - s * depth / 2, y0 + 0.005, zc);         // floor
    box(depth, h, 0.01, recessM, ex - s * depth / 2, yc, z0 + 0.005);         // walls
    box(depth, h, 0.01, recessM, ex - s * depth / 2, yc, z1 - 0.005);
  };
  const LOOP = [-0.08, 0.40, 0.08, 0.58];        // loop pocket z0 y0 z1 y1
  const GROOVE = [-0.06, 0.04, 0.06, 0.30];      // groove on the -x end
  for (const s of [-1, 1]) {
    const ex = s * L / 2;
    const cap = add(new THREE.ShapeGeometry(capShape(s < 0 ? [LOOP, GROOVE] : [LOOP])), concM, ex, 0, 0);
    cap.rotation.y = s * Math.PI / 2;
    pocket(ex, s, ...LOOP, 0.07);
    // bent rebar loop standing in the pocket, two legs into the back, a bar across the top
    const loop = add(new THREE.TorusGeometry(0.045, 0.008, 8, 14, Math.PI), rustM, ex - s * 0.035, 0.455, 0);
    loop.rotation.y = Math.PI / 2;
    for (const z of [-0.045, 0.045]) cyl(0.008, 0.05, rustM, ex - s * 0.045, 0.43, z).rotation.z = Math.PI / 2;
    // rust run out of the pocket floor and down the end face, with a wider stain box behind it
    box(0.006, 0.09, 0.07, recessM, ex + s * 0.003, 0.355, 0.0);
    drip(0.09, 0.03, rustM, ex + s * 0.007, 0.40, 0.012, s * Math.PI / 2);
    drip(0.065, 0.018, rustM, ex + s * 0.007, 0.40, -0.03, s * Math.PI / 2);
    if (s > 0) { // tongue: a keyed rib standing proud of the end face
      box(0.05, 0.26, 0.10, concM, ex + 0.025, 0.17, 0);
      box(0.012, 0.26, 0.10, stainM, ex + 0.054, 0.17, 0);   // its worn nose
    } else pocket(ex, s, ...GROOVE, 0.05);
    // spalled bottom corners: a darker chip strip along the toe at each end
    box(0.2, 0.05, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.3, 0.03, 0.303);
    box(0.2, 0.05, 0.006, mat(tint(C.concS, 0.85), 'stone', 0.95), ex - s * 0.3, 0.03, -0.303);
  }
  // ---- sand fillet along the foot on both sides and around the ends
  const fill = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  wedge(L - 0.1, 0.03, 0.08, fill, 0, 0.30, -Math.PI / 2);
  wedge(L - 0.1, 0.025, 0.06, fill, 0, -0.30, Math.PI / 2);
  wedge(0.6, 0.1, 0.07, fill, L / 2 + 0.055, 0, 0);
  wedge(0.6, 0.1, 0.07, fill, -L / 2, 0, Math.PI);
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
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
