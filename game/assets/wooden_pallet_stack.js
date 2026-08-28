// wooden_pallet_stack r4 detail pass 2. Four block pallets stacked crooked, built to the concept's read of
// bleach plus rust: every deck board and the outer faces of the lead boards, stringers and blocks carry a
// 3 mm bleached grey cream skin over a darker warm brown body, so top against side reads at 15 m; nail heads
// are 10 mm six sided domes 3 mm proud with an irregular rust bloom 3 to 4.5 cm across under every one (exact
// rust hex, named metal, so the weather pass darkens instead of greying them) and a tapered rust drip under
// every nail on a vertical face; lead deck boards are an extruded profile with a 12 mm chamfer on the outer
// top edge; bottom boards are extruded profiles worn to a wedge over the last 14 cm of each end; stamps are
// ring plates on the front blocks; the loose board on top is warm timber with a bleached skin, dark end grain,
// a split end and two nails, lying tilted; kept from pass 1: the lean, the strap remnant, the missing board,
// the broken board and the splintered ends; sand as an analytic mound with a drift ridge on the windward end.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 101; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, timber: 0xa07a4f, rust: 0x6b4426, gun: 0x3a3d40, galv: 0x9ea3a1 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const V3 = THREE.Vector3;
  // timber: a dark warm body under a bleached grey cream skin, darker end grain, blocks a shade darker again
  const mBody = mat(0x86613d, 'timber', 0.9), mBodyB = mat(0x926e4a, 'timber', 0.9), mBodyD = mat(0x765537, 'timber', 0.92);
  const mSkin = mat(0xbab2a0, 'timber', 0.92), mSkinB = mat(0xb0a794, 'timber', 0.92), mSkinC = mat(0xc0b8a6, 'timber', 0.92);
  const mEnd = mat(0x6a4e33, 'timber', 0.95), mBlock = mat(0x836040, 'timber', 0.93), mUnder = mat(0x7a5a3a, 'timber', 0.95);
  const mStamp = mat(0x5a4933, 'timber', 0.95), mStampIn = mat(0x9c8f78, 'timber', 0.95);
  const mNail = mat(P.gun, 'metal', 0.6, 0.5), mRust = mat(P.rust, 'metal', 0.95, 0.05), mStrap = mat(P.galv, 'metal', 0.7, 0.5, true);
  const mDust = mat(P.sand, 'ground', 0.95), mSand = mat(P.sand, 'ground', 0.95);

  const T = 0.022, W = 1.2, D = 0.78, BLK = 0.078, bw = 0.095, gap = (D - 7 * bw) / 6, SK = 0.003;
  // fixings: a six sided domed head 10 mm across and 3 mm proud, an irregular rust bloom under it
  const nailGeo = new THREE.ConeGeometry(0.005, 0.003, 6);
  const bloomGeo = (r) => { const ge = new THREE.CircleGeometry(r, 7); const p = ge.attributes.position; for (let i = 1; i < p.count; i++) { const k = rr(0.7, 1.3); p.setXY(i, p.getX(i) * k, p.getY(i) * k); } return ge; };
  const dripGeo = (L) => { const sh = new THREE.Shape(); sh.moveTo(-0.011, 0); sh.lineTo(0.011, 0); sh.lineTo(0.004, -L); sh.lineTo(-0.004, -L); sh.closePath(); return new THREE.ShapeGeometry(sh); };
  // a nail on an up face at (x, top, z), bloom radius r
  const nailUp = (parent, x, top, z, r = 0.018) => {
    add(bloomGeo(r), mRust, x, top + 0.0006, z, parent).rotation.x = -PI / 2;
    add(nailGeo, mNail, x, top + 0.0015, z, parent);
  };
  // a nail on a face looking along +z or -z (sign), with the bloom and a drip below it
  const nailFace = (parent, x, y, zFace, sign, r = 0.018, L = 0.05) => {
    const b = add(bloomGeo(r), mRust, x, y, zFace + sign * 0.0006, parent); if (sign < 0) b.rotation.y = PI;
    if (L > 0) { const dr = add(dripGeo(L), mRust, x, y - r * 0.6, zFace + sign * 0.0007, parent); if (sign < 0) dr.rotation.y = PI; }
    const n = add(nailGeo, mNail, x, y, zFace + sign * 0.0015, parent); n.rotation.x = sign > 0 ? PI / 2 : -PI / 2;
  };
  const endCaps = (parent, y, z, L = W, cx = 0, wz = bw) => { add(new THREE.BoxGeometry(0.004, T, wz), mEnd, cx + L / 2 + 0.001, y, z, parent); add(new THREE.BoxGeometry(0.004, T, wz), mEnd, cx - L / 2 - 0.001, y, z, parent); };
  const splinters = (parent, y, z, sx) => { for (let k = 0; k < 3; k++) { const sp = add(new THREE.BoxGeometry(0.05, T * 0.5, 0.012), mBodyB, sx * (W / 2 + 0.012), y + (k - 1) * 0.005, z - 0.03 + k * 0.03, parent); sp.rotation.y = rr(-0.25, 0.25); sp.rotation.z = sx * rr(-0.2, 0.2); } };
  // a deck board: body plus bleached skin on the top; the lead boards (k 0 and 6) are an extruded profile with a
  // 12 mm chamfer on the outer top edge and a bleached skin on the outer face too
  const board = (parent, y, z, L, cx, lead, skinM) => {
    if (lead) {
      const o = lead, sh = new THREE.Shape(), ch = 0.012;
      sh.moveTo(-bw / 2, -T / 2); sh.lineTo(bw / 2, -T / 2);
      if (o > 0) { sh.lineTo(bw / 2, T / 2 - ch); sh.lineTo(bw / 2 - ch, T / 2); sh.lineTo(-bw / 2, T / 2); }
      else { sh.lineTo(bw / 2, T / 2); sh.lineTo(-bw / 2 + ch, T / 2); sh.lineTo(-bw / 2, T / 2 - ch); }
      sh.closePath();
      const ge = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
      const b = add(ge, mBody, cx + L / 2, y, z, parent); b.rotation.y = -PI / 2;
      add(new THREE.BoxGeometry(L - 0.004, SK, bw - ch - 0.004), skinM, cx, y + T / 2 + SK / 2, z - o * (ch / 2 + 0.001), parent);
      add(new THREE.BoxGeometry(L - 0.004, T - ch - 0.004, 0.002), skinM, cx, y - ch / 2, z + o * (bw / 2 + 0.001), parent);   // bleached outer face
    } else {
      add(new THREE.BoxGeometry(L, T, bw), rnd() < 0.5 ? mBody : mBodyB, cx, y, z, parent);
      add(new THREE.BoxGeometry(L - 0.004, SK, bw - 0.004), skinM, cx, y + T / 2 + SK / 2, z, parent);
    }
    endCaps(parent, y, z, L, cx);
  };
  // a bottom board: extruded profile worn to a wedge over the last 14 cm of each end
  const bottomBoard = (parent, z) => {
    const sh = new THREE.Shape(), wr = 0.14;
    sh.moveTo(-W / 2, T * 0.45); sh.lineTo(-W / 2 + wr, 0); sh.lineTo(W / 2 - wr, 0); sh.lineTo(W / 2, T * 0.45); sh.lineTo(W / 2, T); sh.lineTo(-W / 2, T); sh.closePath();
    add(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), mUnder, 0, 0, z - 0.05, parent);
    add(new THREE.BoxGeometry(0.004, T * 0.5, 0.1), mEnd, W / 2 + 0.001, T * 0.72, z, parent); add(new THREE.BoxGeometry(0.004, T * 0.5, 0.1), mEnd, -W / 2 - 0.001, T * 0.72, z, parent);
  };
  const stamp = (parent, x, y, zFace, sign) => {
    const r = add(new THREE.CylinderGeometry(0.026, 0.026, 0.003, 8), mStamp, x, y, zFace + sign * 0.0015, parent); r.rotation.x = PI / 2;
    const i = add(new THREE.CylinderGeometry(0.016, 0.016, 0.003, 8), mStampIn, x, y, zFace + sign * 0.0022, parent); i.rotation.x = PI / 2;
  };
  const pallet = (parent, idx) => {
    const broken = idx === 1, missing = idx === 2, top = idx === 3;
    const skinM = idx === 3 ? mSkinC : (idx % 2 ? mSkin : mSkinB);
    for (const z of [-0.34, 0, 0.34]) bottomBoard(parent, z);
    for (const x of [-0.525, 0, 0.525]) for (const z of [-0.34, 0, 0.34]) {
      add(new THREE.BoxGeometry(0.145, BLK, 0.1), mBlock, x, T + BLK / 2, z, parent);
      if (z !== 0) {   // outer blocks: bleached outer face, two nails with blooms and drips, a stamp on two of them
        const sg = Math.sign(z), zf = z + sg * 0.05;
        add(new THREE.BoxGeometry(0.141, BLK - 0.004, 0.002), skinM, x, T + BLK / 2, zf + sg * 0.001, parent);
        nailFace(parent, x - 0.04, T + BLK * 0.62, zf + sg * 0.002, sg, rr(0.014, 0.02), 0.045);
        nailFace(parent, x + 0.04, T + BLK * 0.6, zf + sg * 0.002, sg, rr(0.014, 0.02), 0.04);
        if ((z > 0 && x === 0) || (z < 0 && x === 0.525)) stamp(parent, x, T + BLK * 0.42, zf + sg * 0.002, sg);
      }
      // end blocks: a nail on the outer x face, seen from the ends of the stack
      if (x !== 0 && z === 0) { const sg = Math.sign(x); const n = add(nailGeo, mNail, x + sg * (0.0725 + 0.0015), T + BLK * 0.55, z, parent); n.rotation.z = sg > 0 ? -PI / 2 : PI / 2; const b = add(bloomGeo(0.016), mRust, x + sg * (0.0725 + 0.0006), T + BLK * 0.55, z, parent); b.rotation.y = sg > 0 ? PI / 2 : -PI / 2; }
    }
    for (const z of [-0.34, 0, 0.34]) {   // stringer boards, bleached on the outer face
      add(new THREE.BoxGeometry(W, T, 0.1), mBodyD, 0, T + BLK + T / 2, z, parent);
      if (z !== 0) { const sg = Math.sign(z); add(new THREE.BoxGeometry(W - 0.004, T - 0.004, 0.002), skinM, 0, T + BLK + T / 2, z + sg * 0.051, parent); }
      endCaps(parent, T + BLK + T / 2, z, W, 0, 0.1);
    }
    const y = 2 * T + BLK + T / 2, topY = y + T / 2 + SK;
    for (let k = 0; k < 7; k++) {
      const z = -D / 2 + bw / 2 + k * (bw + gap);
      const lead = k === 0 ? -1 : (k === 6 ? 1 : 0);
      if (missing && k === 2) { for (const x of [-0.525, 0, 0.525]) nailUp(parent, x, T + BLK + T, z, 0.02); continue; }   // the missing board: its nails still stand in the stringer
      if (broken && k === 3) {
        board(parent, y, z, 0.45, -0.375, 0, skinM);
        const h = add(new THREE.BoxGeometry(0.5, T, bw), mBody, 0.3, y - 0.045, z, parent); h.rotation.z = 0.2;
        add(new THREE.BoxGeometry(0.1, 0.008, 0.02), mEnd, -0.12, y, z - 0.02, parent);
      } else if (top && k === 6) {
        // split lead board: two halves along the grain, one dropped and shifted
        add(new THREE.BoxGeometry(W, T, bw / 2 - 0.004), mBody, 0, y, z - bw / 4 - 0.002, parent);
        add(new THREE.BoxGeometry(W - 0.004, SK, bw / 2 - 0.008), skinM, 0, y + T / 2 + SK / 2, z - bw / 4 - 0.002, parent);
        add(new THREE.BoxGeometry(W * 0.97, T, bw / 2 - 0.004), mBodyB, 0.02, y - 0.006, z + bw / 4 + 0.006, parent);
        add(new THREE.BoxGeometry(W * 0.97 - 0.004, SK, bw / 2 - 0.008), mSkinB, 0.02, y - 0.006 + T / 2 + SK / 2, z + bw / 4 + 0.006, parent);
        endCaps(parent, y, z);
      } else board(parent, y, z, W, 0, lead, skinM);
      if ((idx === 0 && (k === 1 || k === 4)) || (idx === 2 && k === 5) || (idx === 3 && k === 2)) splinters(parent, y, z, k % 2 ? 1 : -1);
      for (const x of [-0.525, 0, 0.525]) {
        if (broken && k === 3 && x > -0.1) continue;
        for (const dx of [-0.03, 0.03]) nailUp(parent, x + dx, topY, z + rr(-0.012, 0.012), lead ? rr(0.017, 0.023) : rr(0.013, 0.02));
      }
      if (lead) { for (const x of [-0.525, 0, 0.525]) nailFace(parent, x + rr(-0.02, 0.02), y - 0.002, z + lead * (bw / 2 + 0.0025), lead, 0.012, 0.0); }   // lead board face nails, seen from the front
      if (top && k !== 6) add(new THREE.BoxGeometry(W * 0.86, 0.003, bw * 0.6), mDust, rr(-0.04, 0.04), topY + 0.0015, z, parent);
    }
  };
  const offs = [[-0.04, -0.02], [0.04, 0.02], [0.045, -0.015], [-0.02, 0.02]];
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group();
    p.position.set(offs[i][0] + rr(-0.006, 0.006), i * 0.144, offs[i][1] + rr(-0.006, 0.006));
    p.rotation.y = i === 3 ? 4.5 * PI / 180 : rr(-0.015, 0.015);
    g.add(p);
    pallet(p, i);
  }
  // steel strap remnant hanging down the +x side from the second pallet, drooping to the sand
  const strap = new THREE.CatmullRomCurve3([new V3(0.6, 0.3, 0.05), new V3(0.63, 0.2, 0.09), new V3(0.64, 0.08, 0.14), new V3(0.65, 0.012, 0.22), new V3(0.62, 0.008, 0.3)]);
  for (let k = 0; k < 8; k++) {
    const t0 = k / 8, t1 = (k + 1) / 8, a = strap.getPoint(t0), b = strap.getPoint(t1);
    const d = new V3().subVectors(b, a), L = d.length();
    const sp = add(new THREE.PlaneGeometry(0.013, L * 1.05), mStrap, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    sp.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); sp.rotateY(0.4);
  }
  // loose board lying crooked across the top: warm body, bleached skin, dark ends, a split end, two nails, tilted on one nail head
  const lbY = 4 * 0.144 + T / 2 + 0.004;
  const lb = new THREE.Group(); lb.position.set(0.05, lbY, 0.05); lb.rotation.y = 0.45; lb.rotation.z = 0.035; g.add(lb);
  add(new THREE.BoxGeometry(0.8, T, bw), mBodyB, -0.075, 0, 0, lb);
  add(new THREE.BoxGeometry(0.796, SK, bw - 0.004), mSkinC, -0.075, T / 2 + SK / 2, 0, lb);
  add(new THREE.BoxGeometry(0.004, T, bw), mEnd, -0.475 - 0.001, 0, 0, lb);
  add(new THREE.BoxGeometry(0.15, T, bw * 0.55), mBodyB, 0.4, 0, -bw * 0.22, lb).rotation.y = 0.06;          // the split end: two tongues
  add(new THREE.BoxGeometry(0.11, T * 0.9, bw * 0.38), mBody, 0.38, -0.001, bw * 0.3, lb).rotation.y = -0.1;
  add(new THREE.BoxGeometry(0.004, T, bw * 0.55), mEnd, 0.475 + 0.001, 0, -bw * 0.22, lb);
  add(new THREE.BoxGeometry(0.004, T * 0.9, bw * 0.38), mEnd, 0.435 + 0.001, -0.001, bw * 0.3, lb);
  nailUp(lb, -0.3, T / 2 + SK, 0.01, 0.02); nailUp(lb, 0.12, T / 2 + SK, -0.015, 0.018);
  add(new THREE.BoxGeometry(0.35, 0.003, 0.05), mDust, -0.15, T / 2 + SK + 0.0015, 0.005, lb);
  // sand: an analytic mound with a tangent toe at y = 0, and a drift ridge against the windward (-x) end
  const FIL = { Rx: 0.64, Rz: 0.42, h: 0.05 };
  const F = (x, z) => { const th = Math.atan2(z, x), wob = 1 + 0.02 * Math.sin(3 * th + 0.7) + 0.015 * Math.sin(5 * th + 2.1); const r = Math.sqrt((x / (FIL.Rx * wob)) ** 2 + (z / (FIL.Rz * wob)) ** 2); return r >= 1 ? 0 : FIL.h * Math.pow(1 - r * r * r * r, 1.5); };
  const disc = (cx, cz, radX, radZ, fn, rings, na, m) => {
    const pos = [], idx = [];
    pos.push(cx, fn(cx, cz, 0), cz);
    for (let j = 0; j < rings.length; j++) for (let i = 0; i < na; i++) { const th = i / na * 2 * PI, t = rings[j], x = cx + Math.cos(th) * radX(th) * t, z = cz + Math.sin(th) * radZ(th) * t; pos.push(x, fn(x, z, t), z); }
    for (let i = 0; i < na; i++) idx.push(0, 1 + (i + 1) % na, 1 + i);
    for (let j = 1; j < rings.length; j++) for (let i = 0; i < na; i++) { const a = 1 + (j - 1) * na + i, b = 1 + (j - 1) * na + (i + 1) % na, c = a + na, d = b + na; idx.push(a, d, c, a, b, d); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals();
    const o = add(ge, m); return o;
  };
  const wob = (th) => 1 + 0.02 * Math.sin(3 * th + 0.7) + 0.015 * Math.sin(5 * th + 2.1);
  disc(0, 0, (th) => FIL.Rx * wob(th), (th) => FIL.Rz * wob(th), (x, z, t) => (t >= 1 ? 0 : F(x, z)), [0.35, 0.6, 0.8, 0.92, 1.0], 20, mSand);
  disc(-0.6, 0.02, (th) => 0.06 * (0.85 + 0.3 * Math.abs(Math.sin(th * 2.3))), (th) => 0.34, (x, z, t) => Math.max(0, F(x, z)) + (t >= 1 ? 0 : 0.07 * Math.pow(1 - t * t, 1.5)), [0.45, 0.8, 1.0], 12, mSand);
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
