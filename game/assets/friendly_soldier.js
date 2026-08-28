// friendly_soldier candidate cand1: lofted anatomy. Every body part is a hand built BufferGeometry made by
// lofting a closed superellipse cross section through a stack of rings, each ring with its own
// width, depth and offset, so the torso has shoulders, a chest and a waist, the thigh tapers to
// the knee, the calf bulges and the forearm narrows to the wrist. Joint ends are rounded so a limb
// can rotate at its pivot without tearing. Gear is lofted or boxed on top. The rest pose is low
// ready: both arms are solved by two bone IK inside the module onto a rifle grip position in the
// right hand; a rifle rides slung on the back (userData.slungRifle, hidden by the rig once a real weapon is attached).
// Metres, base y=0, centred x z, front +Z. Left of the soldier is +X.
export default function (THREE) {
  const TEAM = 'friendly';
  const isEnemy = TEAM === 'enemy';
  const g = new THREE.Group();
  const DS = THREE.DoubleSide;
  const mat = (name, color, r = 0.88, m = 0.05, ds = false) => {
    const mm = new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, side: ds ? DS : THREE.FrontSide });
    if (name) mm.name = name;
    return mm;
  };
  // ---------------- palette (worn variations of the locked palette) ----------------
  const P = isEnemy ? {
    shirt: 0x7a6a4c, shirtL: 0x857559, shirtD: 0x6f6045,   // militia khaki, bleached, shaded
    trouser: 0x474440, trouserL: 0x4f4c47,                 // dark worn trousers
    rig: 0x625640, rigL: 0x6c5f47,                          // dark chest rig
    pouch: 0x6b5e45,
    hat: 0x5a5539, hatL: 0x64603f,                          // dark khaki patrol cap
    pack: 0x6d5e43,
    boot: 0x1d1e20, bootL: 0x26272b,
  } : {
    shirt: 0x4e5238, shirtL: 0x585c3f, shirtD: 0x464a32,   // olive drab, bleached, shaded
    trouser: 0x4b4f36, trouserL: 0x53573c,
    rig: 0xb0a07c, rigL: 0xb8a884,                          // tan plate carrier
    pouch: 0xa89572,
    hat: 0xa89372, hatL: 0xb5a07e,                          // tan covered helmet
    pack: 0x9c8b66,
    boot: 0x2a2622, bootL: 0x35302a,
  };
  const fabric = (c) => mat('fabric', c, 0.9, 0.05);
  const mShirt = fabric(P.shirt), mShirtL = fabric(P.shirtL), mShirtD = fabric(P.shirtD);
  const mTrou = fabric(P.trouser), mTrouL = fabric(P.trouserL);
  const mRig = fabric(P.rig), mRigL = fabric(P.rigL), mPouch = fabric(P.pouch), mPack = fabric(P.pack);
  const mHat = fabric(P.hat), mHatL = fabric(P.hatL);
  const mSkin = mat('plaster', 0xb3936c, 0.75, 0.0);
  const mSkinD = mat('plaster', 0x9a7c5c, 0.78, 0.0);        // beard shadow, ear recess
  const mDark = mat(null, 0x1d1e20, 0.8, 0.0);              // eyes, mouth, gloves, rubber
  const mBoot = mat(null, P.boot, 0.82, 0.0), mBootL = mat(null, P.bootL, 0.8, 0.0);
  const mSteel = mat('metal', 0x4f5257, 0.7, 0.4);
  const mGun = mat('metal', 0x3a3d40, 0.55, 0.6), mGunL = mat('metal', 0x46494d, 0.5, 0.6);
  const mWood = mat('timber', 0x6e4a2e, 0.7, 0.05);
  const mShem = fabric(0xcdb88e), mShemR = fabric(0x9c4a3c);
  const mBand = fabric(0xb8a77f);
  const mGaiter = fabric(0x454a33);
  const mRust = mat('metal', 0x6b4426, 0.95, 0.1);

  const add = (parent, geo, m, x = 0, y = 0, z = 0, rot) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(o);
    return o;
  };
  const box = (parent, w, h, d, x, y, z, m, rot) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z, rot);
  const cyl = (parent, rt, rb, h, seg, x, y, z, m, rot) => add(parent, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, rot);

  // ---------------- the loft ----------------
  // A closed cross section: superellipse of exponent p (2 = ellipse, 4 = rounded box), with the
  // front half (z > 0) and back half scaled separately so a chest can be flatter than a back.
  const prof = (n, p, fz = 1, bz = 1) => {
    const pts = [];
    for (let j = 0; j < n; j++) {
      const t = (j / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
      let z = Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
      z *= z > 0 ? fz : bz;
      pts.push([x, z]);
    }
    return pts;
  };
  // rings: [y, width, depth, offsetX, offsetZ], bottom to top. Smooth normals around the ring,
  // hard edged caps, uv u round the girth and v up the height in metres.
  const loft = (parent, profile, rings, m, opts = {}) => {
    const N = profile.length, R = rings.length;
    const pos = [], uv = [], idx = [];
    const ring = (r) => { const [ry, w, d, ox = 0, oz = 0] = r; for (const [px, pz] of profile) pos.push(ox + px * w / 2, ry, oz + pz * d / 2); };
    for (let i = 0; i < R; i++) { ring(rings[i]); const girth = Math.PI * (rings[i][1] + rings[i][2]) / 2; for (let j = 0; j < N; j++) uv.push((j / N) * girth, rings[i][0]); }
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < N; j++) {
      const a = i * N + j, b = i * N + (j + 1) % N, c = a + N, dd = b + N;
      idx.push(a, dd, b, a, c, dd);
    }
    const cap = (i, up) => {
      const base = pos.length / 3;
      const [ry, w, d, ox = 0, oz = 0] = rings[i];
      pos.push(ox, ry, oz); uv.push(0, 0);
      ring(rings[i]);
      for (const [px, pz] of profile) uv.push(px * w / 2, pz * d / 2);
      for (let j = 0; j < N; j++) { const v = base + 1 + j, v2 = base + 1 + (j + 1) % N; if (up) idx.push(base, v2, v); else idx.push(base, v, v2); }
    };
    if (opts.capBottom !== false) cap(0, false);
    if (opts.capTop !== false) cap(R - 1, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return add(parent, geo, m, opts.x || 0, opts.y || 0, opts.z || 0, opts.rot);
  };
  // rings that round a limb end into a dome centred on (y0), so a joint can turn without a gap
  const dome = (y0, w, d, dir, ox = 0, oz = 0) => {
    const out = [];
    for (const a of [0.35, 0.7, 1.05, 1.35]) out.push([y0 + dir * Math.min(w, d) / 2 * Math.sin(a) * 0.95, w * Math.cos(a), d * Math.cos(a), ox, oz]);
    return out;
  };
  const up = (rings) => rings.slice().sort((a, b) => a[0] - b[0]);   // lofts want bottom to top
  // an open band (a strap, a cuff, a belt) round a limb
  const band = (parent, profile, y0, y1, w, d, m, ox = 0, oz = 0) => loft(parent, profile, [[y0, w, d, ox, oz], [y1, w, d, ox, oz]], m, { capTop: false, capBottom: false });

  const limb = prof(12, 2.3);          // limbs: slightly squared ellipse
  const body = prof(16, 3.2, 0.9, 1.0); // torso: rounded box, flatter chest
  const headP = prof(14, 2.6, 1.0, 1.05);
  const foot = prof(12, 2.6, 1.36, 0.64);
  const joints = {};
  const side = { L: 1, R: -1 };

  // ---------------- pelvis (root) ----------------
  loft(g, body, [[0.80, 0.26, 0.19], [0.84, 0.33, 0.22], [0.90, 0.36, 0.235], [0.96, 0.355, 0.23], [1.00, 0.34, 0.225]], mTrou);
  for (const s of [1, -1]) box(g, 0.09, 0.09, 0.012, s * 0.075, 0.905, -0.121, mTrouL);   // back pockets
  band(g, body, 0.975, 1.005, 0.365, 0.245, mRig);                                       // belt
  box(g, 0.05, 0.03, 0.012, 0, 0.99, 0.125, mSteel);                                    // buckle
  if (isEnemy) box(g, 0.07, 0.11, 0.05, 0.19, 0.93, 0.02, mPack);                      // canteen pouch on the left hip
  else { box(g, 0.05, 0.14, 0.09, -0.20, 0.90, 0.02, mRigL); box(g, 0.04, 0.05, 0.03, -0.20, 0.96, 0.06, mSteel); }  // holster right hip

  // ---------------- legs ----------------
  const makeLeg = (sd) => {
    const s = side[sd];
    const hip = new THREE.Group(); hip.name = 'upperLeg' + sd;
    hip.position.set(s * 0.095, 0.95, 0);
    g.add(hip);
    // thigh: wide at the top, tapering to the knee, a dome at the knee end centred on the pivot
    loft(hip, limb, up([[0.06, 0.15, 0.16, 0, 0.005], [0.0, 0.17, 0.185, 0, 0.008], [-0.10, 0.17, 0.19, 0, 0.01], [-0.22, 0.155, 0.17, 0, 0.008],
      [-0.34, 0.135, 0.15, 0, 0.004], [-0.43, 0.125, 0.135], [-0.45, 0.12, 0.13], ...dome(-0.45, 0.12, 0.13, -1)]), mTrou);
    // cargo pocket on the outer thigh with a flap
    box(hip, 0.02, 0.15, 0.12, s * 0.086, -0.24, 0.005, mTrouL);
    box(hip, 0.024, 0.035, 0.125, s * 0.087, -0.17, 0.005, mTrouL);
    box(hip, 0.03, 0.006, 0.006, s * 0.09, -0.19, 0.005, mSteel);

    const knee = new THREE.Group(); knee.name = 'lowerLeg' + sd;
    knee.position.set(0, -0.45, 0);
    hip.add(knee);
    // shin: dome at the knee, calf bulge behind, narrowing to the ankle, bloused into the boot
    loft(knee, limb, up([...dome(0, 0.12, 0.13, 1), [0, 0.12, 0.13], [-0.08, 0.125, 0.145, 0, -0.008], [-0.16, 0.12, 0.14, 0, -0.01],
      [-0.24, 0.105, 0.115, 0, -0.004], [-0.27, 0.125, 0.135], [-0.30, 0.13, 0.14], [-0.34, 0.10, 0.11]]), mTrou);
    if (!isEnemy) {
      // knee pad: a lofted oval bump on the front of the knee and a strap under it
      loft(knee, limb, up([[0.07, 0.06, 0.03, 0, 0.055], [0.03, 0.10, 0.06, 0, 0.06], [-0.02, 0.11, 0.065, 0, 0.062], [-0.07, 0.09, 0.05, 0, 0.055], [-0.10, 0.05, 0.03, 0, 0.05]]), mDark);
      band(knee, limb, -0.115, -0.09, 0.128, 0.148, mDark);
    }
    // boot: the foot outline lofted up, the toe cap sloping into an ankle and a shaft
    const bt = -0.50;   // sole
    const bootLower = [[bt + 0.02, 0.104, 0.28, 0, 0], [bt + 0.045, 0.104, 0.28, 0, 0], [bt + 0.07, 0.10, 0.256, 0, -0.005], [bt + 0.095, 0.094, 0.19, 0, -0.015], [bt + 0.115, 0.092, 0.152, 0, -0.02]];
    loft(knee, foot, bootLower, mBoot, { capBottom: false });
    loft(knee, foot, [[bt + 0.115, 0.092, 0.152, 0, -0.02], [bt + 0.16, 0.094, 0.144, 0, -0.018], [bt + 0.22, 0.098, 0.140, 0, -0.014]], mBootL, { capBottom: false });
    loft(knee, foot, [[bt, 0.112, 0.296, 0, 0], [bt + 0.022, 0.112, 0.296, 0, 0]], mDark);    // sole
    for (let i = 0; i < 3; i++) box(knee, 0.05, 0.007, 0.01, 0, bt + 0.13 + i * 0.03, 0.055 - i * 0.004, mDark);   // laces
    box(knee, 0.06, 0.02, 0.012, 0, bt + 0.20, 0.052, mBoot);                                                          // tongue
    return { hip, knee };
  };
  const legL = makeLeg('L'), legR = makeLeg('R');
  joints.upperLegL = legL.hip; joints.lowerLegL = legL.knee;
  joints.upperLegR = legR.hip; joints.lowerLegR = legR.knee;

  // ---------------- torso ----------------
  const torso = new THREE.Group(); torso.name = 'torso';
  torso.position.set(0, 0.95, 0);
  g.add(torso);
  joints.torso = torso;
  // waist, ribcage, chest, shoulders, the trapezius slope into the neck root
  loft(torso, body, [[-0.03, 0.34, 0.225], [0.06, 0.325, 0.215], [0.18, 0.36, 0.235], [0.30, 0.40, 0.25], [0.42, 0.43, 0.26], [0.49, 0.45, 0.245], [0.52, 0.42, 0.235], [0.56, 0.32, 0.20], [0.61, 0.19, 0.155]], mShirt);
  box(torso, 0.02, 0.28, 0.008, 0, 0.44, 0.13, mShirtD);                       // placket seam
  // neck
  loft(torso, limb, [[0.55, 0.115, 0.12], [0.62, 0.11, 0.115], [0.67, 0.115, 0.12]], mSkin);
  const bodyHit = new THREE.Group(); bodyHit.name = 'hitbox_body';
  bodyHit.position.set(0, 0.30, 0);
  bodyHit.userData.size = [0.46, 0.70, 0.36];
  torso.add(bodyHit);

  const pouches = (parent, n, y, z, w, h, d, spacing, m, mL) => {
    const x0 = -(n - 1) * spacing / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * spacing;
      box(parent, w, h, d, x, y, z, m);
      box(parent, w + 0.006, h * 0.36, d + 0.008, x, y + h * 0.36, z, mL);          // flap
      box(parent, w * 0.5, 0.012, 0.005, x, y + h * 0.05, z + d / 2 + 0.004, mSteel); // buckle
      box(parent, 0.006, 0.04, 0.004, x, y - h * 0.2, z + d / 2 + 0.003, mRust);      // streak below it
    }
  };
  if (isEnemy) {
    // chest rig: a dark panel wrapped round the chest as an open band, four AK pouches, a radio
    band(torso, body, 0.20, 0.44, 0.44, 0.275, mRig);
    for (const s of [1, -1]) { box(torso, 0.05, 0.16, 0.012, s * 0.11, 0.53, 0.09, mRig, [-0.75, 0, 0]); box(torso, 0.05, 0.16, 0.012, s * 0.11, 0.53, -0.09, mRig, [0.75, 0, 0]); }
    pouches(torso, 4, 0.30, 0.165, 0.075, 0.15, 0.055, 0.088, mPouch, mRig);
    cyl(torso, 0.024, 0.024, 0.09, 8, 0.19, 0.36, 0.16, mDark);                  // radio
    cyl(torso, 0.004, 0.004, 0.12, 6, 0.19, 0.46, 0.16, mDark);                  // antenna
    // shemagh: a fat ring round the neck in sand and container red, the check as red patches,
    // with a draped tail across the chest
    const ring = (r, tube, sy, m, y) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 16), m); t.rotation.x = Math.PI / 2; t.position.set(0, y, 0.015); t.scale.set(1, 0.9, sy); torso.add(t); return t; };
    ring(0.105, 0.046, 0.85, mShem, 0.57);                                       // the rolled scarf
    ring(0.105, 0.0475, 0.22, mShemR, 0.57);                                     // red band round its middle
    ring(0.105, 0.047, 0.12, mShemR, 0.595);                                     // and a thinner one above
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; box(torso, 0.018, 0.014, 0.018, Math.cos(a) * 0.145, 0.57 + (i % 2 ? 0.026 : -0.026), 0.015 + Math.sin(a) * 0.126, mShemR, [0, -a, 0]); }   // the check
    box(torso, 0.09, 0.12, 0.02, 0.05, 0.47, 0.135, mShem, [0.2, 0, 0.3]);
    box(torso, 0.05, 0.08, 0.02, 0.04, 0.42, 0.14, mShemR, [0.2, 0, 0.3]);
    // small backpack
    loft(torso, body, [[0.18, 0.26, 0.055, 0, -0.125], [0.30, 0.28, 0.06, 0, -0.13], [0.44, 0.28, 0.06, 0, -0.13], [0.52, 0.24, 0.055, 0, -0.125]], mPack);
    box(torso, 0.26, 0.05, 0.06, 0, 0.545, -0.13, mPack);                        // lid
    for (const s of [1, -1]) { box(torso, 0.03, 0.30, 0.008, s * 0.08, 0.34, -0.156, mRig); box(torso, 0.035, 0.02, 0.006, s * 0.08, 0.44, -0.158, mSteel); }
  } else {
    // plate carrier: an open tan band round the torso, shoulder straps, three pouches front and
    // back, a radio pouch on the left shoulder strap with an antenna, an admin panel
    band(torso, body, 0.17, 0.48, 0.47, 0.30, mRig);
    box(torso, 0.30, 0.28, 0.012, 0, 0.32, 0.15, mRigL);                          // front plate bag
    box(torso, 0.30, 0.30, 0.012, 0, 0.32, -0.152, mRigL);                        // back plate bag
    for (const s of [1, -1]) { box(torso, 0.06, 0.15, 0.016, s * 0.12, 0.54, 0.09, mRig, [-0.75, 0, 0]); box(torso, 0.06, 0.15, 0.016, s * 0.12, 0.54, -0.09, mRig, [0.75, 0, 0]); }
    pouches(torso, 3, 0.29, 0.165, 0.075, 0.14, 0.05, 0.085, mPouch, mRig);
    pouches(torso, 3, 0.29, -0.15, 0.075, 0.14, 0.05, 0.085, mPouch, mRig);
    box(torso, 0.18, 0.06, 0.02, 0, 0.42, 0.166, mPouch);                          // admin panel
    box(torso, 0.06, 0.10, 0.045, 0.19, 0.46, 0.11, mPouch);                       // radio pouch
    cyl(torso, 0.004, 0.004, 0.22, 6, 0.20, 0.62, 0.10, mDark);                    // antenna
    box(torso, 0.05, 0.12, 0.05, -0.19, 0.30, 0.13, mPouch);                       // utility pouch right
    // neck gaiter rising to the chin
    loft(torso, limb, [[0.54, 0.15, 0.15], [0.60, 0.135, 0.14], [0.67, 0.15, 0.165]], mGaiter);
  }

  // ---------------- arms ----------------
  const makeArm = (sd) => {
    const s = side[sd];
    const shoulder = new THREE.Group(); shoulder.name = 'upperArm' + sd;
    shoulder.position.set(s * 0.215, 0.50, 0);
    torso.add(shoulder);
    const rolled = isEnemy || sd === 'L';     // enemy both sleeves rolled, Ranger the left one
    // deltoid dome above the pivot, then the upper arm tapering to the elbow
    loft(shoulder, limb, up([...dome(0.0, 0.125, 0.125, 1), [0.0, 0.125, 0.125], [-0.05, 0.12, 0.12]]), mShirtL);
    if (rolled) {
      loft(shoulder, limb, up([[-0.05, 0.12, 0.12], [-0.12, 0.112, 0.112], [-0.19, 0.105, 0.105]]), mShirt);
      loft(shoulder, limb, up([[-0.19, 0.118, 0.118], [-0.235, 0.118, 0.118]]), mShirtD);                                  // the roll
      loft(shoulder, limb, up([[-0.235, 0.095, 0.095], [-0.30, 0.088, 0.088], ...dome(-0.30, 0.088, 0.088, -1)]), mSkin);
    } else {
      loft(shoulder, limb, up([[-0.05, 0.12, 0.12], [-0.14, 0.11, 0.11], [-0.24, 0.10, 0.10], [-0.30, 0.092, 0.092], ...dome(-0.30, 0.092, 0.092, -1)]), mShirt);
    }
    box(shoulder, 0.008, 0.06, 0.05, s * 0.061, -0.085, 0, isEnemy ? mPack : mRigL);   // shoulder patch plate
    if (!isEnemy && sd === 'L') band(shoulder, limb, -0.17, -0.12, 0.125, 0.125, mBand); // tan armband

    const elbow = new THREE.Group(); elbow.name = 'lowerArm' + sd;
    elbow.position.set(0, -0.30, 0);
    shoulder.add(elbow);
    // forearm: dome at the elbow, a bulge below it, narrowing to the wrist, then the glove cuff
    const fore = up([...dome(0, 0.088, 0.09, 1), [0, 0.088, 0.09], [-0.07, 0.092, 0.097], [-0.16, 0.076, 0.08], [-0.25, 0.06, 0.064]]);
    loft(elbow, limb, fore, rolled ? mSkin : mShirt);
    if (!rolled) loft(elbow, limb, up([[-0.20, 0.08, 0.084], [-0.255, 0.072, 0.076]]), mShirtD);   // sleeve cuff
    loft(elbow, limb, up([[-0.245, 0.072, 0.076], [-0.285, 0.068, 0.072]]), mDark);                // glove cuff
    // fist: a lofted block, knuckles forward, thumb on the inner side
    loft(elbow, limb, up([[-0.28, 0.062, 0.066], [-0.30, 0.082, 0.072, 0, 0.004], [-0.335, 0.09, 0.078, 0, 0.008], [-0.37, 0.082, 0.07, 0, 0.006], ...dome(-0.37, 0.08, 0.07, -1, 0, 0.006)]), mDark);
    box(elbow, 0.02, 0.05, 0.03, -s * 0.045, -0.31, 0.02, mDark, [0, 0, s * 0.3]);
    for (let i = 0; i < 3; i++) box(elbow, 0.024, 0.008, 0.012, (i - 1) * 0.026, -0.325, 0.045, mDark); // knuckle ridges
    return { shoulder, elbow };
  };
  const armL = makeArm('L'), armR = makeArm('R');
  joints.upperArmL = armL.shoulder; joints.lowerArmL = armL.elbow;
  joints.upperArmR = armR.shoulder; joints.lowerArmR = armR.elbow;
  const socket = new THREE.Group(); socket.name = 'weaponSocket';
  socket.position.set(0, -0.335, 0.0);
  armR.elbow.add(socket);
  joints.weaponSocket = socket;
  const gripL = new THREE.Object3D(); gripL.name = 'soldier_gripL';
  gripL.position.set(0, -0.335, 0.0);
  armL.elbow.add(gripL);

  // rifle slung across the back (the rig hides it once a real weapon is in the hands). Drawn with
  // the muzzle along +Z of its own group, then laid diagonally across the backpack.
  const rifle = new THREE.Group(); rifle.name = 'slungRifle';
  rifle.position.set(-0.02, 0.45, -0.16);
  {
    // muzzle down, top of the receiver facing out from the back, then laid diagonally
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0));
    rifle.quaternion.setFromRotationMatrix(m).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.30));
  }
  torso.add(rifle);
  const B = 0.0;
  box(rifle, 0.032, 0.07, 0.03, 0, B - 0.055, -0.01, mDark, [0.3, 0, 0]);          // pistol grip
  box(rifle, 0.04, 0.06, 0.30, 0, B, 0.09, mGun);                                   // receiver
  box(rifle, 0.035, 0.03, 0.30, 0, B + 0.04, 0.10, mGunL);                          // dust cover
  box(rifle, 0.045, 0.05, 0.16, 0, B - 0.005, 0.32, isEnemy ? mWood : mGun);        // handguard
  cyl(rifle, 0.012, 0.012, 0.36, 8, 0, B + 0.005, 0.54, mGun, [Math.PI / 2, 0, 0]);  // barrel
  cyl(rifle, 0.015, 0.015, 0.06, 8, 0, B + 0.005, 0.72, mGunL, [Math.PI / 2, 0, 0]); // muzzle device
  box(rifle, 0.012, 0.045, 0.02, 0, B + 0.03, 0.58, mGun);                           // front sight
  box(rifle, 0.035, 0.05, 0.11, 0, B - 0.075, 0.06, mGun, [0.35, 0, 0]);            // magazine
  box(rifle, 0.035, 0.045, 0.25, 0, B - 0.01, -0.17, isEnemy ? mWood : mGun, [0.08, 0, 0]);  // stock
  box(rifle, 0.04, 0.09, 0.015, 0, B - 0.03, -0.30, mDark);                         // butt pad
  box(rifle, 0.03, 0.03, 0.05, 0, B + 0.05, 0.02, mGunL);                           // rear sight / optic
  box(torso, 0.04, 0.58, 0.008, 0.02, 0.34, 0.14, mRig, [0, 0, 0.55]);              // sling across the chest
  g.userData.slungRifle = rifle;

  // ---------------- head ----------------
  const head = new THREE.Group(); head.name = 'head';
  head.position.set(0, 0.60, 0);
  torso.add(head);
  joints.head = head;
  // jaw in beard shadow, then cheek, temple, crown. Chin at 0.02 above the pivot, crown at 0.25.
  const jaw = [[0.015, 0.09, 0.10, 0, 0.012], [0.04, 0.13, 0.15, 0, 0.006], [0.08, 0.15, 0.18, 0, 0.004], [0.105, 0.155, 0.185, 0, 0.004]];
  const skull = [[0.105, 0.155, 0.185, 0, 0.004], [0.15, 0.158, 0.19, 0, 0.003], [0.20, 0.152, 0.188, 0, 0.0], [0.235, 0.125, 0.16, 0, -0.005], [0.255, 0.06, 0.08, 0, -0.008]];
  loft(head, headP, jaw, isEnemy ? mSkinD : mSkin, { capTop: false });
  loft(head, headP, skull, mSkin, { capBottom: false });
  box(head, 0.11, 0.022, 0.024, 0, 0.165, 0.092, mSkin);                          // brow
  for (const s of [1, -1]) box(head, 0.028, 0.012, 0.012, s * 0.03, 0.148, 0.095, mDark);   // eye recesses
  loft(head, limb, [[0.10, 0.03, 0.045, 0, 0.088], [0.13, 0.024, 0.045, 0, 0.094], [0.16, 0.016, 0.016, 0, 0.088]], mSkin);   // nose
  box(head, 0.04, 0.006, 0.006, 0, 0.075, 0.093, mSkinD);                          // mouth line
  for (const s of [1, -1]) { box(head, 0.014, 0.036, 0.024, s * 0.083, 0.135, -0.005, mSkin); box(head, 0.006, 0.02, 0.012, s * 0.087, 0.135, -0.005, mSkinD); }  // ears
  if (isEnemy) {
    // patrol cap: flat topped crown lofted over the skull, a peak, a sweatband
    loft(head, headP, [[0.19, 0.165, 0.20, 0, 0.0], [0.23, 0.17, 0.205, 0, 0.002], [0.265, 0.17, 0.20, 0, 0.004], [0.27, 0.16, 0.19, 0, 0.004]], mHat);
    loft(head, headP, [[0.27, 0.16, 0.19, 0, 0.004], [0.276, 0.15, 0.18, 0, 0.004]], mHatL);                       // sun bleached top
    band(head, headP, 0.185, 0.20, 0.172, 0.208, mShirtD);
    box(head, 0.13, 0.008, 0.07, 0, 0.20, 0.125, mHat, [0.18, 0, 0]);                                                // peak
  } else {
    // ballistic helmet: a dome lofted over the skull, a side rail, the front mount plate, chin strap
    loft(head, headP, [[0.135, 0.215, 0.255, 0, 0.0], [0.165, 0.222, 0.262, 0, 0.0], [0.21, 0.215, 0.255, 0, 0.0], [0.255, 0.19, 0.225, 0, -0.003]], mHat);
    loft(head, headP, [[0.255, 0.19, 0.225, 0, -0.003], [0.295, 0.14, 0.17, 0, -0.005], [0.325, 0.07, 0.09, 0, -0.008]], mHatL);   // dust on the crown
    for (const s of [1, -1]) box(head, 0.012, 0.02, 0.12, s * 0.11, 0.17, -0.02, mDark);                              // rails
    box(head, 0.04, 0.035, 0.02, 0, 0.19, 0.125, mDark);                                                              // mount plate
    box(head, 0.035, 0.03, 0.03, 0.05, 0.19, 0.135, mDark);                                                            // helmet light
    for (const s of [1, -1]) { box(head, 0.006, 0.09, 0.02, s * 0.087, 0.09, 0.02, mDark, [0, 0, -s * 0.15]); cyl(head, 0.035, 0.035, 0.03, 10, s * 0.09, 0.105, -0.005, mDark, [0, 0, Math.PI / 2]); }   // strap + ear cups
    box(head, 0.14, 0.028, 0.03, 0, 0.15, 0.09, mDark);                                                              // sunglasses band
  }
  const headHit = new THREE.Group(); headHit.name = 'hitbox_head';
  headHit.position.set(0, 0.14, 0.0);
  headHit.userData.size = [0.24, 0.30, 0.26];
  head.add(headHit);

  g.userData.joints = joints;
  g.userData.hitboxes = { head: headHit, body: bodyHit };
  g.userData.sockets = { gripL };
  g.userData.jointHints = { hipForward: -1, kneeFlex: 1 };

  // ---------------- rest pose: two bone IK onto the rifle at low ready ----------------
  // Same convention as the game's rig: the upper arm's local -Y is the bone, local +X is the
  // normal of the elbow plane.
  const frameRotation = (f0, s0, f1, s1) => {
    const m0 = new THREE.Matrix4(), m1 = new THREE.Matrix4();
    const b0s = s0.clone().addScaledVector(f0, -s0.dot(f0)).normalize();
    m0.makeBasis(f0, b0s, new THREE.Vector3().crossVectors(f0, b0s));
    const b1s = s1.clone().addScaledVector(f1, -s1.dot(f1)).normalize();
    m1.makeBasis(f1, b1s, new THREE.Vector3().crossVectors(f1, b1s));
    m0.transpose();
    return new THREE.Quaternion().setFromRotationMatrix(m1.multiply(m0));
  };
  const solveArm = (upper, lower, palmY, target, pole) => {
    g.updateMatrixWorld(true);
    const S = upper.getWorldPosition(new THREE.Vector3());
    const L1 = 0.30, L2 = -palmY;
    const d = target.clone().sub(S);
    let dist = Math.min(Math.max(d.length(), Math.abs(L1 - L2) + 0.01), L1 + L2 - 0.01);
    const dh = d.normalize();
    const ang = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))));
    const pp = pole.clone().addScaledVector(dh, -pole.dot(dh)).normalize();
    const U = dh.clone().multiplyScalar(Math.cos(ang)).addScaledVector(pp, Math.sin(ang)).normalize();
    const E = S.clone().addScaledVector(U, L1);
    const Lw = S.clone().addScaledVector(dh, dist).sub(E).normalize();
    const n = new THREE.Vector3().crossVectors(Lw, U).normalize();
    const down = new THREE.Vector3(0, -1, 0), x = new THREE.Vector3(1, 0, 0);
    const pq = upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    upper.quaternion.copy(pq.multiply(frameRotation(down, x, U, n)));
    upper.updateMatrixWorld(true);
    const uq = upper.getWorldQuaternion(new THREE.Quaternion()).invert();
    lower.quaternion.copy(uq.multiply(frameRotation(down, x, Lw, n)));
    g.updateMatrixWorld(true);
  };
  const aim = new THREE.Vector3(0.40, -0.50, 0.77).normalize();     // muzzle forward, down 30 degrees, a little to the left
  solveArm(armR.shoulder, armR.elbow, -0.335, new THREE.Vector3(-0.27, 0.86, 0.06), new THREE.Vector3(-0.4, -0.3, -1));   // hand beside the right thigh
  // socket: +Z along the aim, no roll
  {
    const m = new THREE.Matrix4().lookAt(aim, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    const pq = socket.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    socket.quaternion.copy(pq.multiply(new THREE.Quaternion().setFromRotationMatrix(m)));
    g.updateMatrixWorld(true);
  }
  // support hand under where the handguard of a held rifle sits: 0.25 m ahead of the grip, a little above it
  const handguard = socket.localToWorld(new THREE.Vector3(0.0, 0.045, 0.25));
  solveArm(armL.shoulder, armL.elbow, -0.335, new THREE.Vector3(0.27, 0.86, 0.06), new THREE.Vector3(0.4, -0.3, -1));    // hand beside the left thigh (rest pose is patrol carry, rifle slung; the rig re-solves both arms onto the held weapon)
  head.rotation.x = 0.04;

  // ---------------- contract: base at y=0, centred on x and z (root children only) ----------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
