// pump_jack c2: different reading, closer to the reference photo. Samson post is a braced lattice
// of four angle legs with ladder rungs between the front pair, the walking beam is a box girder
// of two channels with cover plates and a bolted centre saddle, the cranks are the reference's
// angular wedge shaped arms with the counterweight mass built in and yellow tips, the belt guard
// has a round drum end, and the horsehead is a plate box with the yellow arc face. Same local
// frame and joint hierarchy as c0.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x7e4835, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20, olive: 0x4e5238 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (r, h, seg, m, x, y, z, parent) => add(new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z, parent);
  const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; };
  const extrudeZ = (shape, depth) => { const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); geo.translate(0, 0, -depth / 2); return geo; };
  const wedge = (len, out, h, m, x, y, z, ry, parent) => { const o = add(extrudeZ(poly([[0, 0], [out, 0], [0, h]]), len), m, x, y, z, parent); o.rotation.y = ry; return o; };
  // a member between two points, as a box of the given section
  const member = (a, b, w, d, m, parent) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const o = box(w, len, d, m, 0, 0, 0, parent);
    o.position.copy(va).add(vb).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return o;
  };

  const mConc = mat(P.concB, 'stone', 0.95, 0.0);
  const mConcS = mat(P.concS, 'stone', 0.95, 0.0);
  const mOx = mat(P.oxide, 'metal', 0.9, 0.1);
  const mOxS = mat(shade(P.oxide, 1.1), 'metal', 0.88, 0.1);
  const mOxD = mat(shade(P.oxide, 0.88), 'metal', 0.92, 0.1);
  const mBox = mat(shade(P.oxide, 0.95), 'metal', 0.9, 0.1);
  const mOlive = mat(P.olive, 'metal', 0.9, 0.1);
  const mSteel = mat(P.steel, 'metal', 0.8, 0.3);
  const mRod = mat(P.galv, 'metal', 0.55, 0.6);
  const mBolt = mat(P.gun, 'metal', 0.7, 0.4);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mYellow = mat(P.yellow, 'metal', 0.85, 0.1, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);

  const O = new THREE.Group(); O.rotation.y = PI / 2; g.add(O);
  const ZP = 0.1, beamTilt = -0.08, crankAngle = 0.35;

  box(2.6, 0.18, 9.0, mConcS, 0, 0.09, 0, O);
  box(2.6, 0.12, 9.0, mConc, 0, 0.24, 0, O);
  box(2.5, 0.006, 8.9, mDust, 0, 0.303, 0, O);
  wedge(8.6, 0.1, 0.12, mSand, 1.3, 0, 0, 0, O);
  wedge(8.6, 0.1, 0.12, mSand, -1.3, 0, 0, PI, O);
  wedge(2.6, 0.3, 0.15, mSand, 0, 0, -4.5, PI / 2, O);
  wedge(2.6, 0.3, 0.15, mSand, 0, 0, 4.5, -PI / 2, O);
  for (const sx of [-1.0, 1.0]) { box(0.15, 0.22, 8.4, mOx, sx, 0.41, 0, O); box(0.11, 0.004, 8.3, mDust, sx, 0.522, 0, O); }
  for (const sz of [-4.1, -2.0, ZP, 2.5, 4.1]) box(1.85, 0.2, 0.12, mOxD, 0, 0.4, sz, O);
  for (const sz of [-3.5, -1.0, 1.5, 3.5]) for (const sx of [-1.0, 1.0]) { cyl(0.018, 0.02, 6, mBolt, sx, 0.53, sz, O); box(0.03, 0.12, 0.006, mRust, sx + 0.085 * Math.sign(sx), 0.42, sz, O).rotation.y = PI / 2; }

  // lattice samson post: four angle legs (front pair in an A, rear pair leaning back), rungs, X bracing
  const footY = 0.55, topY = 4.4, dx = 1.1;
  const top = [0, topY, ZP];
  const feet = [[-dx, footY, ZP + 0.25], [dx, footY, ZP + 0.25], [-0.5, footY, ZP - 1.9], [0.5, footY, ZP - 1.9]];
  const topPts = [[-0.3, topY, ZP + 0.15], [0.3, topY, ZP + 0.15], [-0.25, topY, ZP - 0.2], [0.25, topY, ZP - 0.2]];
  for (let i = 0; i < 4; i++) {
    member(feet[i], topPts[i], 0.08, 0.08, i < 2 ? (i === 1 ? mOxS : mOx) : mOxD, O);
    member([feet[i][0] + (i % 2 ? -0.03 : 0.03), feet[i][1], feet[i][2] + (i < 2 ? -0.03 : 0.03)], [topPts[i][0] + (i % 2 ? -0.03 : 0.03), topPts[i][1], topPts[i][2] + (i < 2 ? -0.03 : 0.03)], 0.06, 0.02, mOxD, O);
    box(0.36, 0.05, 0.36, mOx, feet[i][0], footY - 0.025, feet[i][2], O);
    for (const c of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) cyl(0.014, 0.02, 6, mBolt, feet[i][0] + c[0], footY + 0.005, feet[i][2] + c[1], O);
    box(0.03, 0.2, 0.008, mRust, feet[i][0], footY + 0.12, feet[i][2] + 0.12, O);
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // ladder rungs between the front legs, ties and X braces between front and rear legs
  for (let t = 0.12; t < 0.95; t += 0.09) member(lerp(feet[0], topPts[0], t), lerp(feet[1], topPts[1], t), 0.035, 0.035, mOxD, O);
  for (const t of [0.25, 0.5, 0.75]) {
    for (const s of [0, 1]) {
      member(lerp(feet[s], topPts[s], t), lerp(feet[s + 2], topPts[s + 2], t), 0.06, 0.06, mOx, O);
      member(lerp(feet[s], topPts[s], t), lerp(feet[s + 2], topPts[s + 2], t + 0.25), 0.04, 0.04, mOxD, O);
      member(lerp(feet[s], topPts[s], t + 0.25), lerp(feet[s + 2], topPts[s + 2], t), 0.04, 0.04, mOxD, O);
    }
    member(lerp(feet[2], topPts[2], t), lerp(feet[3], topPts[3], t), 0.06, 0.06, mOx, O);
  }
  // top bearing block
  box(0.8, 0.3, 0.55, mOx, 0, topY - 0.05, ZP, O);
  for (const s of [-1, 1]) box(0.06, 0.4, 0.4, mOxD, s * 0.26, 4.5, ZP, O);
  cyl(0.09, 0.7, 10, mSteel, 0, 4.5, ZP, O).rotation.z = PI / 2;
  box(0.7, 0.005, 0.48, mDust, 0, topY + 0.103, ZP, O);
  box(0.03, 0.2, 0.008, mRust, 0.2, topY - 0.25, ZP + 0.28, O);

  // walking beam: box girder from two channels and cover plates
  const wb = new THREE.Group(); wb.name = 'walkingBeam'; wb.position.set(0, 4.5, ZP); wb.rotation.x = beamTilt; O.add(wb);
  const zRear = -2.75, zFront = 4.2, beamLen = zFront - zRear, zMid = (zRear + zFront) / 2;
  for (const s of [-1, 1]) box(0.03, 0.46, beamLen, s > 0 ? mOxS : mOxD, s * 0.14, 0, zMid, wb);
  box(0.34, 0.03, beamLen, mOxS, 0, 0.235, zMid, wb);
  box(0.34, 0.03, beamLen, mOxD, 0, -0.235, zMid, wb);
  box(0.3, 0.005, beamLen - 0.3, mDust, 0, 0.253, zMid, wb);
  for (let z = -2.4; z <= 4.0; z += 0.6) for (const s of [-1, 1]) { for (const by of [-0.18, 0.18]) cyl(0.014, 0.02, 6, mBolt, s * 0.165, by, z, wb).rotation.z = PI / 2; }
  for (let z = -2.1; z <= 3.8; z += 1.2) box(0.34, 0.006, 0.12, mRust, 0, -0.238, z, wb);
  box(0.6, 0.16, 0.8, mOxD, 0, -0.31, 0, wb);
  for (const s of [-1, 1]) for (const bz of [-0.3, 0.3]) cyl(0.02, 0.02, 6, mBolt, s * 0.22, -0.38, bz, wb);
  box(1.4, 0.16, 0.16, mOxD, 0, -0.1, zRear + 0.05, wb);
  for (const s of [-1, 1]) cyl(0.05, 0.14, 8, mSteel, s * 0.6, -0.1, zRear + 0.05, wb).rotation.z = PI / 2;
  // horsehead: plate box with the yellow arc face and a hanger drum
  const hh = new THREE.Group(); hh.name = 'horsehead'; wb.add(hh);
  const faceR = zFront, thetaLo = -0.1, thetaHi = 0.19;
  add(new THREE.CylinderGeometry(faceR, faceR, 0.3, 6, 1, true, thetaLo, thetaHi - thetaLo), mYellow, 0, 0, 0, hh).rotation.z = PI / 2;
  add(new THREE.CylinderGeometry(faceR - 0.025, faceR - 0.025, 0.34, 6, 1, true, thetaLo, thetaHi - thetaLo), mOxD, 0, 0, 0, hh).rotation.z = PI / 2;
  for (const s of [-1, 1]) {
    const plate = add(extrudeZ(poly([[zFront - 0.6, -0.4], [zFront - 0.02, -0.42], [zFront - 0.02, 0.79], [zFront - 0.6, 0.72]]), 0.03), s > 0 ? mOxS : mOx, s * 0.165, 0, 0, hh);
    plate.rotation.y = -PI / 2;
    for (const by of [0.6, 0.1, -0.3]) cyl(0.02, 0.02, 6, mBolt, s * 0.19, by, zFront - 0.25, hh).rotation.z = PI / 2;
  }
  box(0.36, 1.12, 0.03, mOx, 0, 0.16, zFront - 0.6, hh);
  box(0.36, 0.03, 0.55, mOxS, 0, 0.73, zFront - 0.31, hh);
  box(0.3, 0.005, 0.5, mDust, 0, 0.748, zFront - 0.31, hh);
  box(0.03, 0.2, 0.006, mRust, 0.1, 0.45, zFront - 0.62, hh);
  const tangentTheta = -beamTilt;
  const br = new THREE.Group(); br.position.set(0, faceR * Math.sin(tangentTheta), faceR * Math.cos(tangentTheta)); br.rotation.x = -beamTilt; hh.add(br);
  const rodLen = 4.5 - 1.3;
  for (const s of [-1, 1]) cyl(0.015, rodLen, 6, mSteel, s * 0.1, -rodLen / 2, 0, br);
  box(0.36, 0.08, 0.12, mSteel, 0, -rodLen, 0, br);
  cyl(0.02, 0.62, 6, mRod, 0, -rodLen - 0.31, 0, br);
  const zWell = ZP + faceR;
  cyl(0.13, 0.3, 10, mSteel, 0, 0.45, zWell, O);
  cyl(0.19, 0.05, 10, mSteel, 0, 0.625, zWell, O);
  cyl(0.08, 0.08, 8, mSteel, 0, 0.69, zWell, O);
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; cyl(0.012, 0.02, 6, mBolt, 0.15 * Math.cos(a), 0.66, zWell + 0.15 * Math.sin(a), O); }
  cyl(0.04, 0.3, 8, mSteel, 0.22, 0.5, zWell, O).rotation.z = PI / 2;
  box(0.02, 0.15, 0.03, mRust, 0.14, 0.4, zWell, O);

  // gearbox on a pedestal with an access ladder, axle
  const zG = -3.8, yAxle = 1.6;
  box(0.7, 0.6, 1.0, mOxD, 0, 0.6, zG, O);
  box(0.9, 0.9, 1.2, mBox, 0, 1.35, zG, O);
  box(0.84, 0.005, 1.14, mDust, 0, 1.803, zG, O);
  for (const s of [-1, 1]) { box(0.02, 0.5, 0.7, mOxD, s * 0.455, 1.3, zG, O); for (const bz of [-0.28, 0, 0.28]) for (const by of [1.1, 1.5]) cyl(0.014, 0.02, 6, mBolt, s * 0.475, by, zG + bz, O).rotation.z = PI / 2; box(0.006, 0.25, 0.03, mRust, s * 0.466, 0.98, zG + 0.28, O); }
  box(0.9, 0.08, 0.06, mOxD, 0, 1.0, zG + 0.61, O);
  for (const r of [0.55, 0.8, 1.05, 1.3, 1.55]) box(0.4, 0.03, 0.03, mSteel, 0, r, zG - 0.62, O);
  for (const s of [-1, 1]) box(0.03, 1.2, 0.03, mSteel, s * 0.2, 1.1, zG - 0.62, O);
  cyl(0.1, 1.5, 10, mSteel, 0, yAxle, zG, O).rotation.z = PI / 2;
  // angular cranks with built in counterweight mass and yellow tips
  const crank = new THREE.Group(); crank.name = 'crank'; crank.position.set(0, yAxle, zG); crank.rotation.x = crankAngle; O.add(crank);
  const crankGeo = extrudeZ(poly([[-0.25, -0.25], [0.25, -0.25], [0.3, 0.7], [0.3, 1.2], [-0.3, 1.2], [-0.3, 0.7]]), 0.22); crankGeo.rotateY(PI / 2);
  for (const s of [-1, 1]) {
    add(crankGeo, s > 0 ? mOxS : mOx, s * 0.62, 0, 0, crank);
    cyl(0.24, 0.26, 12, mOxD, s * 0.62, 0, 0, crank).rotation.z = PI / 2;
    box(0.24, 0.06, 0.62, mYellow, s * 0.62, 1.17, 0, crank);
    box(0.24, 0.06, 0.62, mYellow, s * 0.62, 0.73, 0, crank);
    for (const bz of [-0.15, 0.15]) cyl(0.02, 0.02, 6, mBolt, s * 0.74, 0.95, bz, crank).rotation.z = PI / 2;
    box(0.006, 0.2, 0.03, mRust, s * 0.735, 0.55, 0.15, crank);
  }
  cyl(0.05, 1.3, 8, mSteel, 0, 0.95, 0, crank).rotation.z = PI / 2;
  const pinWorldY = yAxle + 0.95 * Math.cos(crankAngle), pinWorldZ = zG + 0.95 * Math.sin(crankAngle);
  const eqY = 4.5 + (-0.1) * Math.cos(beamTilt) - (zRear + 0.05) * Math.sin(beamTilt);
  const eqZ = ZP + (-0.1) * Math.sin(beamTilt) + (zRear + 0.05) * Math.cos(beamTilt);
  const pitLen = Math.hypot(eqY - pinWorldY, eqZ - pinWorldZ);
  const pitAng = Math.atan2(eqZ - pinWorldZ, eqY - pinWorldY);
  const pitman = new THREE.Group(); pitman.name = 'pitman'; pitman.position.set(0, 0.95, 0); pitman.rotation.x = pitAng - crankAngle; crank.add(pitman);
  for (const s of [-1, 1]) { box(0.1, pitLen, 0.1, mOx, s * 0.5, pitLen / 2, 0, pitman); cyl(0.08, 0.12, 8, mOxD, s * 0.5, 0, 0, pitman).rotation.z = PI / 2; }
  box(1.1, 0.1, 0.1, mOxD, 0, 0.15, 0, pitman);
  // motor and belt guard with a drum end
  box(0.6, 0.55, 0.8, mOlive, 0.95, 0.575, -4.05, O);
  box(0.54, 0.005, 0.74, mDust, 0.95, 0.853, -4.05, O);
  cyl(0.28, 0.06, 12, mOlive, 0.95, 0.575, -4.05, O).rotation.z = PI / 2;
  const guard = new THREE.Group(); guard.position.set(0.6, 1.1, -3.72); guard.rotation.x = Math.atan2(0.65, 1.0); O.add(guard);
  box(0.12, 1.1, 0.5, mOxD, 0, 0, 0, guard);
  cyl(0.28, 0.12, 12, mOxD, 0, 0.55, 0, guard).rotation.z = PI / 2;
  cyl(0.25, 0.12, 12, mOxD, 0, -0.55, 0, guard).rotation.z = PI / 2;
  box(0.03, 0.15, 0.008, mRust, 0.95, 0.4, -3.646, O);

  g.userData.joints = { walkingBeam: wb, crank, pitman };
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
