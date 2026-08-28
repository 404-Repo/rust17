// enemy_soldier candidate 1: profiles. Limbs, head, cap and shemagh are LatheGeometry sweeps,
// torso, boots, pouches, backpack and the rifle body are ExtrudeGeometry from drawn outlines
// (bevelEnabled false everywhere). Same skeleton and joint names as the contract asks.
// Metres, base y=0, centred x z, front +Z. Left of the soldier is +X.
export default function (THREE) {
  const g = new THREE.Group();
  const DS = THREE.DoubleSide;
  const mat = (name, color, r = 0.88, m = 0.05, ds = false) => {
    const mm = new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, side: ds ? DS : THREE.FrontSide });
    if (name) mm.name = name;
    return mm;
  };
  const fat  = mat('fabric', 0x7a6a4c, 0.9, 0.05, true);   // militia khaki
  const fatF = mat('fabric', 0x827252, 0.9, 0.05, true);   // bleached front panels
  const fatD = mat('fabric', 0x716245, 0.9, 0.05, true);   // seams, shaded
  const fatT = mat('fabric', 0x87765b, 0.9, 0.05, true);   // cap and shoulder tops
  const rig  = mat('fabric', 0x3e4144, 0.92, 0.05, true);
  const rigL = mat('fabric', 0x484b4f, 0.92, 0.05, true);
  const pack = mat('fabric', 0x6d5e43, 0.9, 0.05, true);
  const shem = mat('fabric', 0xb0a07c, 0.92, 0.0, true);
  const skin = mat('plaster', 0xa89372, 0.75, 0.0, true);
  const gun  = mat('metal', 0x3a3d40, 0.55, 0.6, true);
  const gunL = mat('metal', 0x46494d, 0.5, 0.6, true);
  const steel = mat('metal', 0x4f5257, 0.7, 0.4);
  const rust = mat('metal', 0x6b4426, 0.95, 0.1);
  const rubber = mat(null, 0x1d1e20, 0.8, 0.0, true);
  const rubberL = mat(null, 0x26272b, 0.8, 0.0, true);
  const dust = mat('ground', 0xcdb88e, 0.95, 0.0);
  const tape = mat('fabric', 0xb0a07c, 0.9);

  const add = (parent, geo, m, x, y, z, rot) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(o);
    return o;
  };
  const box = (parent, w, h, d, x, y, z, m, rot) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z, rot);
  const cyl = (parent, rt, rb, h, seg, x, y, z, m, rot) => add(parent, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, rot);
  const lathe = (parent, pts, seg, x, y, z, m, rot) =>
    add(parent, new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m, x, y, z, rot);
  const shapeOf = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  };
  // extrude a drawn outline along +Z by depth, centred on z
  const extrude = (parent, pts, depth, m, x, y, z, rot) => {
    const geo = new THREE.ExtrudeGeometry(shapeOf(pts), { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    return add(parent, geo, m, x, y, z, rot);
  };
  // an octagon (cut corners) outline of w x h centred at 0
  const oct = (w, h, c) => [[-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c],
    [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]];
  const boltX = (parent, x, y, z, r, sign) => {
    cyl(parent, r, r, 0.012, 10, x, y, z, rust, [0, 0, Math.PI / 2]);
    box(parent, 0.004, r * 3.2, r * 0.55, x - sign * 0.004, y - r * 2.4, z, rust);
  };
  const rivetZ = (parent, x, y, z, r) => {
    cyl(parent, r, r, 0.01, 8, x, y, z, rust, [Math.PI / 2, 0, 0]);
    box(parent, r * 0.6, r * 3, 0.004, x, y - r * 2.3, z - 0.004, rust);
  };
  const joints = {};

  // ---------------- pelvis (root) ----------------
  // pelvis as an extruded front outline (wider at the hips), 0.2 deep
  extrude(g, [[-0.17, 0.83], [0.17, 0.83], [0.18, 0.95], [0.16, 0.985], [-0.16, 0.985], [-0.18, 0.95]], 0.2, fat, 0, 0, 0);
  box(g, 0.32, 0.12, 0.006, 0, 0.90, 0.103, fatF);               // bleached front panel
  extrude(g, oct(0.37, 0.05, 0.01), 0.23, rig, 0, 0.985, 0);      // belt
  box(g, 0.06, 0.035, 0.012, 0, 0.985, 0.12, steel);
  box(g, 0.014, 0.06, 0.004, 0, 0.94, 0.108, rust);
  extrude(g, oct(0.05, 0.12, 0.01), 0.05, pack, 0.20, 0.90, -0.03); // canteen pouch
  boltX(g, 0.181, 0.95, 0, 0.024, 1);
  boltX(g, -0.181, 0.95, 0, 0.024, -1);

  // ---------------- legs ----------------
  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.09, 0.95, 0);
    g.add(hip);
    // thigh: lathe with a seam groove
    lathe(hip, [[0, 0], [0.07, 0], [0.079, -0.05], [0.081, -0.11], [0.074, -0.12], [0.081, -0.13], [0.078, -0.30], [0.072, -0.43], [0, -0.43]], 10, 0, 0, 0, fat);
    box(hip, 0.09, 0.26, 0.006, 0, -0.27, 0.079, fatF);            // bleached front panel
    extrude(hip, oct(0.10, 0.13, 0.01), 0.014, fatD, side * 0.082, -0.26, 0, [0, Math.PI / 2, 0]); // cargo pocket
    box(hip, 0.016, 0.035, 0.105, side * 0.083, -0.205, 0, fatF);  // pocket flap
    rivetZ(hip, side * 0.03, -0.06, 0.081, 0.011);
    rivetZ(hip, -side * 0.03, -0.06, 0.081, 0.011);
    boltX(hip, side * 0.078, -0.45, 0, 0.022, side);

    const knee = new THREE.Group();
    knee.position.set(0, -0.45, 0);
    hip.add(knee);
    lathe(knee, [[0, 0.03], [0.075, 0.03], [0.078, -0.06], [0.07, -0.16], [0.064, -0.17], [0.07, -0.18], [0.066, -0.33], [0.06, -0.36], [0, -0.36]], 10, 0, 0, 0, fat);
    box(knee, 0.08, 0.18, 0.006, 0, -0.24, 0.068, fatF);
    rivetZ(knee, 0, -0.10, 0.075, 0.01);
    // boot from a side profile, extruded across x. Shape x = -z (toe at negative shape x), shape y = height
    const bootProfile = [[0.10, 0.02], [-0.16, 0.02], [-0.16, 0.06], [-0.12, 0.095], [-0.05, 0.11], [-0.05, 0.18], [0.09, 0.18], [0.10, 0.08]];
    const bt = extrude(knee, bootProfile, 0.125, rubber, 0, -0.5, 0, [0, Math.PI / 2, 0]);
    bt.material = rubber;
    extrude(knee, [[0.11, 0], [-0.17, 0], [-0.17, 0.02], [0.11, 0.02]], 0.135, rubberL, 0, -0.5, 0, [0, Math.PI / 2, 0]); // sole
    for (let i = 0; i < 4; i++) box(knee, 0.075, 0.008, 0.012, 0, -0.335 - i * 0.016, 0.052, rubberL);
    box(knee, 0.09, 0.006, 0.09, 0, -0.404, 0.10, dust);           // dust on the toe
    box(knee, 0.11, 0.006, 0.12, 0, -0.317, 0.02, dust);           // dust on the shaft top
    box(knee, 0.15, 0.006, 0.30, 0, -0.497, 0.03, dust);           // sand skirt at the base
    return { hip, knee };
  };
  const legL = makeLeg(1), legR = makeLeg(-1);
  joints.upperLegL = legL.hip; joints.lowerLegL = legL.knee;
  joints.upperLegR = legR.hip; joints.lowerLegR = legR.knee;

  // ---------------- torso ----------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.95, 0);
  g.add(torso);
  joints.torso = torso;
  // torso cross-section: an octagon 0.4 x 0.22 drawn in (x, -z), extruded along y, front half and back half
  const half = (front) => {
    const s = front ? -1 : 1;    // shape y = -z, so the front half has negative shape y
    return [[-0.16, 0], [0.16, 0], [0.20, s * 0.04], [0.20, s * 0.09], [0.17, s * 0.11], [-0.17, s * 0.11], [-0.20, s * 0.09], [-0.20, s * 0.04]];
  };
  const mkTorso = (front, m) => {
    const geo = new THREE.ExtrudeGeometry(shapeOf(half(front)), { depth: 0.6, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);   // extrude direction z -> +y, shape y -> -z
    return add(torso, geo, m, 0, 0.0, 0);
  };
  mkTorso(true, fatF);
  mkTorso(false, fat);
  // waist taper: a shaded band that narrows the read of the lower torso
  extrude(torso, oct(0.35, 0.22, 0.02), 0.225, fatD, 0, 0.11, 0, [Math.PI / 2, 0, 0]);
  box(torso, 0.41, 0.01, 0.224, 0, 0.26, 0, fatD);                 // waist seam
  // shoulders: short lathes on their side
  lathe(torso, [[0, -0.05], [0.07, -0.05], [0.078, 0], [0.07, 0.05], [0, 0.05]], 10, 0.20, 0.50, 0, fatT, [0, 0, Math.PI / 2]);
  lathe(torso, [[0, -0.05], [0.07, -0.05], [0.078, 0], [0.07, 0.05], [0, 0.05]], 10, -0.20, 0.50, 0, fatT, [0, 0, Math.PI / 2]);
  box(torso, 0.08, 0.006, 0.09, 0.20, 0.58, 0, dust);
  box(torso, 0.08, 0.006, 0.09, -0.20, 0.58, 0, dust);
  // neck and shemagh as a lathe ring
  cyl(torso, 0.05, 0.055, 0.09, 10, 0, 0.60, 0, skin);
  lathe(torso, [[0.055, 0], [0.12, 0.02], [0.135, 0.06], [0.11, 0.10], [0.06, 0.105]], 12, 0, 0.545, 0.01, shem);
  extrude(torso, [[-0.09, 0.06], [0.09, 0.06], [0.05, -0.07], [-0.02, -0.07]], 0.03, shem, 0.03, 0.50, 0.128, [0.3, 0, 0.15]); // draped tail
  // chest rig: extruded trapezoid panel with PALS rows
  extrude(torso, [[-0.17, -0.13], [0.17, -0.13], [0.15, 0.14], [-0.15, 0.14]], 0.02, rig, 0, 0.35, 0.121);
  for (let i = 0; i < 4; i++) box(torso, 0.30, 0.018, 0.006, 0, 0.455 - i * 0.03, 0.134, rigL);
  for (const sx of [1, -1]) {
    box(torso, 0.06, 0.2, 0.014, sx * 0.12, 0.545, 0.065, rig, [-0.78, 0, 0]);
    box(torso, 0.06, 0.2, 0.014, sx * 0.12, 0.545, -0.065, rig, [0.78, 0, 0]);
  }
  for (const x of [-0.135, -0.045, 0.045, 0.135]) {
    extrude(torso, oct(0.07, 0.14, 0.012), 0.045, rig, x, 0.235, 0.153);
    extrude(torso, oct(0.076, 0.05, 0.01), 0.05, rigL, x, 0.30, 0.154);
    box(torso, 0.028, 0.02, 0.006, x, 0.283, 0.181, steel);
    box(torso, 0.012, 0.04, 0.004, x, 0.245, 0.177, rust);
  }
  cyl(torso, 0.028, 0.028, 0.08, 10, 0.185, 0.24, 0.13, pack);
  box(torso, 0.012, 0.05, 0.02, 0.185, 0.29, 0.13, steel);
  // backpack: extruded front outline with a rounded top, 0.06 deep, plus lid and straps
  extrude(torso, [[-0.14, -0.17], [0.14, -0.17], [0.14, 0.13], [0.11, 0.17], [-0.11, 0.17], [-0.14, 0.13]], 0.06, pack, 0, 0.36, -0.13);
  extrude(torso, [[-0.145, -0.04], [0.145, -0.04], [0.145, 0.03], [0.12, 0.045], [-0.12, 0.045], [-0.145, 0.03]], 0.07, pack, 0, 0.54, -0.13);
  for (const sx of [1, -1]) {
    box(torso, 0.03, 0.36, 0.006, sx * 0.08, 0.36, -0.164, rig);
    box(torso, 0.035, 0.025, 0.006, sx * 0.08, 0.46, -0.168, steel);
    box(torso, 0.012, 0.05, 0.004, sx * 0.08, 0.415, -0.168, rust);
  }
  box(torso, 0.22, 0.006, 0.05, 0, 0.588, -0.13, dust);
  box(torso, 0.05, 0.52, 0.006, 0.02, 0.33, -0.168, tape, [0, 0, -0.62]);

  // slung rifle: side outline drawn with the barrel along +X, top +Y, extruded 0.04 thick,
  // then tilted so the muzzle points down to the left hip and the stock sits at the right shoulder
  const rifle = new THREE.Group();
  rifle.position.set(0.025, 0.10, 0.196);
  rifle.rotation.z = -0.96;
  rifle.name = 'slungRifle';
  torso.add(rifle);
  const body = [[-0.42, -0.045], [-0.42, 0.03], [-0.30, 0.03], [-0.30, 0.02], [-0.18, 0.02], [-0.18, 0.045], [0.07, 0.045],
    [0.07, 0.03], [0.33, 0.03], [0.33, -0.02], [0.07, -0.02], [0.07, -0.03], [-0.05, -0.03], [-0.06, -0.04], [-0.10, -0.12],
    [-0.13, -0.115], [-0.105, -0.03], [-0.18, -0.03], [-0.18, -0.01], [-0.30, -0.01], [-0.30, -0.055]];
  extrude(rifle, body, 0.04, gun, 0, 0, 0);
  extrude(rifle, [[0.0, -0.03], [0.055, -0.03], [0.025, -0.20], [-0.025, -0.20]], 0.028, gun, 0, 0, 0);   // magazine
  box(rifle, 0.05, 0.03, 0.032, 0.005, -0.11, 0, tape, [0, 0, 0.17]);                              // tape
  extrude(rifle, [[-0.05, 0.045], [0.04, 0.045], [0.04, 0.10], [-0.05, 0.10]], 0.03, gun, 0, 0, 0); // sight
  box(rifle, 0.006, 0.03, 0.022, -0.045, 0.078, 0, gunL);                                           // sight window
  box(rifle, 0.5, 0.012, 0.03, 0.08, 0.05, 0, gunL);                                                // top rail
  for (let i = 0; i < 5; i++) box(rifle, 0.016, 0.006, 0.048, 0.10 + i * 0.05, 0.03, 0, gunL);      // rail slots
  cyl(rifle, 0.011, 0.011, 0.10, 10, 0.38, 0.0, 0, gun, [0, 0, Math.PI / 2]);                        // barrel
  cyl(rifle, 0.014, 0.014, 0.05, 10, 0.425, 0.0, 0, gunL, [0, 0, Math.PI / 2]);                      // flash hider
  cyl(rifle, 0.014, 0.014, 0.09, 10, 0.19, -0.065, 0, rubber);                                       // foregrip
  box(rifle, 0.012, 0.075, 0.042, -0.42, -0.005, 0, rubber);                                         // buttpad
  box(rifle, 0.03, 0.014, 0.02, -0.16, 0.05, 0, gunL);                                               // charging handle
  g.userData.slungRifle = rifle;

  const bodyHit = new THREE.Group();
  bodyHit.position.set(0, 0.32, 0);
  bodyHit.userData.size = [0.44, 0.72, 0.36];
  torso.add(bodyHit);

  // ---------------- arms ----------------
  const makeArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.24, 0.50, 0);
    torso.add(shoulder);
    lathe(shoulder, [[0, 0], [0.05, 0], [0.054, -0.05], [0.05, -0.15], [0.045, -0.16], [0.05, -0.17], [0.047, -0.29], [0, -0.29]], 10, 0, 0, 0, fat);
    box(shoulder, 0.06, 0.18, 0.006, 0, -0.15, 0.05, fatF);
    box(shoulder, 0.008, 0.06, 0.05, side * 0.052, -0.09, 0, pack);   // arm patch plate
    boltX(shoulder, side * 0.053, -0.03, 0, 0.022, side);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.30, 0);
    shoulder.add(elbow);
    lathe(elbow, [[0, 0.04], [0.046, 0.04], [0.048, -0.02], [0.044, -0.20], [0.05, -0.26], [0.05, -0.285], [0, -0.285]], 10, 0, 0, 0, fat);
    box(elbow, 0.05, 0.16, 0.006, 0, -0.14, 0.045, fatF);
    boltX(elbow, side * 0.049, -0.01, 0, 0.019, side);
    // glove: lathe palm and fingers as a short extrude
    lathe(elbow, [[0, -0.29], [0.036, -0.29], [0.04, -0.33], [0.038, -0.40], [0, -0.40]], 10, 0, 0, 0, rubber);
    extrude(elbow, oct(0.07, 0.07, 0.012), 0.04, rubberL, 0, -0.425, 0.012, [-0.25, 0, 0]);   // curled fingers
    box(elbow, 0.024, 0.05, 0.03, -side * 0.042, -0.33, 0.012, rubberL, [0, 0, side * 0.3]);  // thumb
    box(elbow, 0.08, 0.02, 0.06, 0, -0.30, 0, rubberL);
    return { shoulder, elbow };
  };
  const armL = makeArm(1), armR = makeArm(-1);
  joints.upperArmL = armL.shoulder; joints.lowerArmL = armL.elbow;
  joints.upperArmR = armR.shoulder; joints.lowerArmR = armR.elbow;
  const socket = new THREE.Group();
  socket.position.set(0, -0.36, 0.03);
  armR.elbow.add(socket);
  joints.weaponSocket = socket;
  armL.shoulder.rotation.x = 0.12; armL.elbow.rotation.x = -0.30;
  armR.shoulder.rotation.x = 0.16; armR.elbow.rotation.x = -0.36;
  armL.shoulder.rotation.z = 0.04; armR.shoulder.rotation.z = -0.04;

  // ---------------- head ----------------
  const head = new THREE.Group();
  head.position.set(0, 0.60, 0);
  torso.add(head);
  joints.head = head;
  lathe(head, [[0, 0.03], [0.06, 0.03], [0.082, 0.07], [0.09, 0.13], [0.09, 0.20], [0.075, 0.23], [0, 0.235]], 10, 0, 0, 0, skin);
  extrude(head, [[-0.015, 0.0], [0.015, 0.0], [0.012, 0.045], [-0.012, 0.045]], 0.03, skin, 0, 0.11, 0.095, [-0.3, 0, 0]);  // nose
  box(head, 0.15, 0.018, 0.012, 0, 0.165, 0.086, fatD);             // brow line
  box(head, 0.014, 0.04, 0.03, 0.092, 0.14, 0, skin);
  box(head, 0.014, 0.04, 0.03, -0.092, 0.14, 0, skin);
  lathe(head, [[0, 0], [0.10, 0], [0.102, 0.04], [0.09, 0.058], [0, 0.06]], 10, 0, 0.215, 0, fatT);   // cap crown
  extrude(head, [[-0.08, 0], [0.08, 0], [0.06, 0.075], [-0.06, 0.075]], 0.014, fatD, 0, 0.225, 0.10, [-Math.PI / 2, 0, 0]);  // peak
  cyl(head, 0.085, 0.085, 0.006, 10, 0, 0.276, 0, dust);
  const headHit = new THREE.Group();
  headHit.position.set(0, 0.15, 0);
  headHit.userData.size = [0.24, 0.30, 0.26];
  head.add(headHit);

  g.userData.joints = joints;
  g.userData.hitboxes = { head: headHit, body: bodyHit };

  g.updateMatrixWorld(true);
  const pq = new THREE.Quaternion();
  socket.parent.getWorldQuaternion(pq);
  socket.quaternion.copy(pq.invert());

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
