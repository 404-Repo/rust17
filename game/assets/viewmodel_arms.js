// viewmodel_arms candidate 2: a different part breakdown. Sleeves as three
// octagonal segments each slightly turned so the cloth reads as folded, creases
// as dark rings at every fold, a flared gauntlet cuff, gloves with four separate
// two joint fingers and a thumb, a watch with a strap ring. Origin is the eye;
// see userData.sockets.camera. +Z forward.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const olive = M(0x4e5238, 'fabric', 0.85, 0.0);
  const oliveS = M(0x585c40, 'fabric', 0.85, 0.0);
  const oliveD = M(0x43472f, 'fabric', 0.88, 0.0);
  const dust = M(0x6e6b4c, 'fabric', 0.90, 0.0, true);   // dusty olive, sand settled on cloth
  const skin = M(0xa89372, null, 0.75, 0.0);
  // gloves: worn leather, dark olive brown rather than rubber black, so the fingers still read
  // against a blued receiver in shade; knuckles and seams lighter where they rub
  const glove = M(0x3a3528, 'fabric', 0.82, 0.0);
  const gloveL = M(0x4e4838, 'fabric', 0.80, 0.0);
  const gloveD = M(0x2e2b22, 'fabric', 0.84, 0.0);
  const gun = M(0x3a3d40, 'metal', 0.55, 0.65);
  const glass = M(0x27363a, null, 0.45, 0.2);

  const cyl = (r1, r2, len, mat, x, y, z, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg || 8), mat);
    mm.rotation.x = Math.PI / 2; mm.position.set(x, y, z); parent.add(mm); return mm;
  };
  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); parent.add(mm); return mm;
  };
  const cap = (r, z, parent) => {                                       // dust on the top of a segment
    const geo = new THREE.CylinderGeometry(r, r, 0.006, 8, 1, true, Math.PI * 1.3, Math.PI * 0.4);
    const mm = new THREE.Mesh(geo, dust); mm.rotation.x = Math.PI / 2; mm.rotation.z = Math.PI; mm.position.set(0, 0.002, z); parent.add(mm); return mm;
  };

  const sleeveSeg = (r1, r2, len, z, turn, parent) => {
    const s = new THREE.Group(); s.position.z = z; s.rotation.z = turn; parent.add(s);
    cyl(r1, r2, len, olive, 0, 0, len / 2, 8, s);
    cyl(r1 + 0.002, r1 + 0.003, 0.008, oliveD, 0, 0, 0.004, 8, s);        // crease ring at the fold
    box(0.012, r1 * 2 + 0.002, len * 0.6, oliveS, 0, 0, len / 2, s);       // one bright fold line
    return s;
  };
  const upperArm = (side, parent) => {
    cyl(0.046, 0.046, 0.02, oliveD, 0, 0, 0.01, 8, parent);                // shoulder cut edge
    sleeveSeg(0.047, 0.045, 0.10, 0.02, 0.0, parent);
    sleeveSeg(0.046, 0.044, 0.09, 0.12, 0.2, parent);
    sleeveSeg(0.045, 0.045, 0.07, 0.21, -0.2, parent);
    for (const z of [0.05, 0.16]) cap(0.05, z, parent);
    const patch = box(0.10, 0.056, 0.04, oliveD, 0, -0.012, 0.27, parent); // elbow patch
    box(0.10, 0.004, 0.04, dust, 0, 0.018, 0.27, parent);
    for (const sx of [-1, 1]) box(0.002, 0.06, 0.042, oliveS, sx * 0.051, -0.012, 0.27, parent); // patch stitching
  };
  const foreArm = (side, parent) => {
    sleeveSeg(0.044, 0.04, 0.10, 0.0, 0.1, parent);
    sleeveSeg(0.04, 0.038, 0.08, 0.10, -0.15, parent);
    cap(0.044, 0.05, parent); cap(0.04, 0.14, parent);
    cyl(0.046, 0.05, 0.03, oliveS, 0, 0, 0.19, 8, parent);                 // rolled cuff, flared
    cyl(0.051, 0.051, 0.006, oliveD, 0, 0, 0.205, 8, parent);              // cuff edge
    cyl(0.03, 0.029, 0.05, skin, 0, 0, 0.23, 10, parent);
    if (side < 0) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.004, 5, 12), gun); strap.position.z = 0.232; parent.add(strap);
      box(0.04, 0.008, 0.04, gun, 0, 0.032, 0.232, parent);
      box(0.03, 0.002, 0.03, glass, 0, 0.037, 0.232, parent);
    }
  };
  const finger = (parent, x, y, z, side, curl, curl2) => {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = side * -curl; parent.add(f);
    cyl(0.009, 0.0085, 0.045, glove, 0, 0, 0.0225, 8, f);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 6), gloveL); k.position.z = 0.045; f.add(k);
    const f2 = new THREE.Group(); f2.position.z = 0.045; f2.rotation.y = side * -(curl2 === undefined ? 1.2 : curl2); f.add(f2);
    cyl(0.0085, 0.008, 0.038, glove, 0, 0, 0.019, 8, f2);
    const k2 = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), glove); k2.position.z = 0.038; f2.add(k2);
  };
  const fist = (side, parent) => {
    cyl(0.038, 0.034, 0.035, glove, 0, 0, 0.0175, 10, parent);             // gauntlet cuff
    cyl(0.04, 0.04, 0.006, gloveL, 0, 0, 0.003, 10, parent);               // cuff edge
    box(0.052, 0.072, 0.095, glove, 0, 0, 0.075, parent);                  // palm
    box(0.046, 0.004, 0.085, gloveD, 0, 0.038, 0.075, parent);             // dusty back
    box(0.054, 0.002, 0.09, gloveL, 0, 0.018, 0.07, parent);               // seam
    // index finger lies along the receiver (trigger discipline), the other three wrap the grip
    for (let i = 0; i < 4; i++) finger(parent, side * 0.0, 0.028 - i * 0.019, 0.12, side, i === 0 ? 0.35 : 1.05 + i * 0.05, i === 0 ? 0.55 : 1.25);
    const th = new THREE.Group(); th.position.set(side * -0.018, 0.038, 0.05); th.rotation.x = -0.35; th.rotation.y = side * -0.5; parent.add(th);
    cyl(0.011, 0.0105, 0.04, glove, 0, 0, 0.02, 8, th);
    const tk = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), gloveL); tk.position.z = 0.04; th.add(tk);
    const th2 = new THREE.Group(); th2.position.z = 0.04; th2.rotation.x = 0.6; th.add(th2);
    cyl(0.0105, 0.009, 0.032, glove, 0, 0, 0.016, 8, th2);
  };

  const S = { R: [0.13, -0.20, -0.05], L: [-0.13, -0.20, -0.05] };
  const E = { R: [0.15, -0.42, 0.08], L: [-0.15, -0.36, 0.16] };
  const W = { R: [0.12, -0.24, 0.26], L: [-0.10, -0.25, 0.39] };
  const joints = {};
  const chain = (side) => {
    const s = side > 0 ? 'R' : 'L';
    const ua = new THREE.Group(); ua.name = 'upperArm' + s; ua.position.fromArray(S[s]); g.add(ua);
    ua.lookAt(new THREE.Vector3().fromArray(E[s]));
    upperArm(side, ua);
    g.updateMatrixWorld(true);
    const la = new THREE.Group(); la.name = 'lowerArm' + s; ua.add(la);
    la.position.copy(ua.worldToLocal(new THREE.Vector3().fromArray(E[s])));
    g.updateMatrixWorld(true);
    la.lookAt(new THREE.Vector3().fromArray(W[s]));
    foreArm(side, la);
    g.updateMatrixWorld(true);
    const h = new THREE.Group(); h.name = 'hand' + s; la.add(h);
    h.position.copy(la.worldToLocal(new THREE.Vector3().fromArray(W[s])));
    g.updateMatrixWorld(true);
    h.lookAt(new THREE.Vector3(W[s][0], W[s][1] + 0.06, W[s][2] + 0.3));
    fist(side, h);
    joints['upperArm' + s] = ua; joints['lowerArm' + s] = la; joints['hand' + s] = h;
    return h;
  };
  const handR = chain(1);
  const handL = chain(-1);
  g.updateMatrixWorld(true);
  const ws = new THREE.Object3D(); ws.name = 'weaponSocket'; handR.add(ws);
  ws.position.set(-0.040, 0.045, 0.10);   // grip top against the palm, inside the fingers (palm side is -X on the right hand)
  ws.quaternion.copy(handR.getWorldQuaternion(new THREE.Quaternion()).invert());
  joints.weaponSocket = ws;
  const gl = new THREE.Object3D(); gl.name = 'socket_gripL'; handL.add(gl); gl.position.set(0.01, 0.05, 0.06);
  gl.quaternion.copy(handL.getWorldQuaternion(new THREE.Quaternion()).invert());
  const cam = new THREE.Object3D(); cam.name = 'socket_camera'; g.add(cam);
  g.userData.joints = joints;
  g.userData.sockets = { gripL: gl, camera: cam };

  // ---- contract: base at y=0, centred on x and z ----
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
