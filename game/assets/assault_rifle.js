// assault_rifle candidate 2: a different part breakdown read off the reference.
// Quad rail handguard with vent holes, EOTech style hooded sight, crane stock with
// battery tubes, near straight STANAG magazine with a single kink, birdcage hider
// built from prongs so the slots are real gaps, and a raised delta ring.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const gun = M(0x3a3d40, 'metal', 0.55, 0.65);
  const gunS = M(0x42464b, 'metal', 0.55, 0.65);
  const gunD = M(0x34373a, 'metal', 0.58, 0.65);   // north faces, slightly darker
  const worn = M(0x5c5f63, 'metal', 0.50, 0.70);
  const dust = M(0x6b654f, 'metal', 0.65, 0.3);    // dust settled on the up faces (sand over gunmetal)
  const rubber = M(0x1d1e20, null, 0.70, 0.05);
  const rubberL = M(0x27282b, null, 0.68, 0.05);
  const tape = M(0xb0a07c, 'fabric', 0.80, 0.0);
  const glass = M(0x27363a, null, 0.45, 0.2);
  const dark = M(0x2a2c2f, 'metal', 0.60, 0.6, true);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const B = 0.20;

  // ---- upper receiver with flat top, ejection port, deflector, forward assist ----
  const upper = new THREE.Group(); upper.position.set(0, B + 0.004, -0.095); g.add(upper);
  box(0.040, 0.034, 0.25, gunS, 0, 0, 0, upper);
  box(0.040, 0.004, 0.25, dust, 0, 0.019, 0, upper);                 // dust on the flat top
  box(0.024, 0.012, 0.25, gun, 0, 0.026, 0, upper);                  // rail
  for (let i = 0; i < 12; i++) box(0.026, 0.005, 0.006, dark, 0, 0.031, -0.115 + i * 0.02, upper);
  box(0.042, 0.003, 0.252, worn, 0, 0.0185, 0, upper);               // worn edge under the dust
  box(0.003, 0.017, 0.056, dark, 0.0205, -0.002, 0.03, upper);       // ejection port
  box(0.003, 0.019, 0.058, worn, 0.0195, 0.008, 0.03, upper);        // port cover, open, worn
  box(0.008, 0.022, 0.018, gun, 0.023, 0.0, -0.01, upper);           // deflector
  cyl(0.008, 0.024, gun, 0.024, 0.0, -0.035, 'z', 8, upper);         // forward assist
  cyl(0.004, 0.006, dark, 0.024, 0.0, -0.05, 'z', 8, upper);
  // charging handle with latch on the left
  box(0.018, 0.008, 0.05, gun, 0, 0.012, -0.135, upper);
  box(0.03, 0.006, 0.014, gun, -0.012, 0.012, -0.152, upper);
  box(0.012, 0.012, 0.012, worn, -0.03, 0.012, -0.152, upper);        // latch, left

  // ---- lower receiver, magwell, pins, selector, mag release ----
  const lower = new THREE.Group(); lower.position.set(0, B - 0.034, -0.12); g.add(lower);
  box(0.038, 0.036, 0.20, gun, 0, 0, 0, lower);
  box(0.042, 0.05, 0.068, gunD, 0, -0.03, 0.058, lower);             // magwell
  box(0.043, 0.004, 0.07, worn, 0, -0.056, 0.058, lower);            // worn magwell lip
  cyl(0.004, 0.044, dark, 0, -0.008, -0.08, 'x', 6, lower);          // takedown pin
  cyl(0.004, 0.044, dark, 0, -0.008, 0.07, 'x', 6, lower);           // pivot pin
  box(0.014, 0.004, 0.022, worn, -0.024, 0.006, -0.04, lower);       // selector, left
  cyl(0.005, 0.006, dark, -0.022, 0.006, -0.04, 'x', 8, lower);
  box(0.006, 0.01, 0.01, gun, 0.022, -0.004, 0.09, lower);           // mag release, right
  box(0.004, 0.012, 0.02, worn, 0.022, -0.004, 0.075, lower);        // mag release fence
  box(0.012, 0.014, 0.016, gun, -0.024, -0.004, 0.09, lower);        // bolt catch, left
  box(0.036, 0.003, 0.20, dark, 0, 0.018, 0, lower);                 // seam

  // ---- EOTech hooded sight, tall hood with real window ----
  const sight = new THREE.Group(); sight.position.set(0, B + 0.036, -0.15); g.add(sight);
  box(0.046, 0.016, 0.095, gun, 0, 0.008, 0, sight);
  box(0.046, 0.004, 0.095, dust, 0, 0.018, 0, sight);
  box(0.005, 0.026, 0.06, gunS, -0.0205, 0.031, 0.0, sight);
  box(0.005, 0.026, 0.06, gunS, 0.0205, 0.031, 0.0, sight);
  box(0.046, 0.005, 0.06, gun, 0, 0.0455, 0.0, sight);
  box(0.046, 0.003, 0.06, dust, 0, 0.0495, 0.0, sight);
  box(0.036, 0.022, 0.002, glass, 0, 0.031, -0.028, sight);
  box(0.036, 0.022, 0.002, glass, 0, 0.031, 0.028, sight);
  box(0.048, 0.003, 0.06, worn, 0, 0.0435, 0, sight);
  box(0.012, 0.005, 0.025, rubber, -0.026, 0.016, 0.04, sight);
  box(0.012, 0.005, 0.025, rubber, 0.026, 0.016, 0.04, sight);
  box(0.024, 0.012, 0.008, dark, 0, 0.008, -0.05, sight);            // battery cap
  cyl(0.004, 0.05, dark, -0.018, 0.0, 0, 'x', 6, sight);             // mount cross bolt
  box(0.03, 0.006, 0.01, worn, 0.03, 0.0, 0, sight);                 // mount lever, right

  // ---- delta ring and quad rail handguard with vent holes ----
  cyl(0.03, 0.02, gun, 0, B, 0.04, 'z', 12);                          // delta ring
  cyl(0.031, 0.006, worn, 0, B, 0.032, 'z', 12);
  const hg = new THREE.Group(); hg.position.set(0, B, 0.19); g.add(hg);
  box(0.046, 0.046, 0.28, gunD, 0, 0, 0, hg);                        // body
  box(0.024, 0.01, 0.28, gun, 0, 0.028, 0, hg);                      // top rail
  box(0.024, 0.01, 0.28, gun, 0, -0.028, 0, hg);                     // bottom rail
  box(0.01, 0.024, 0.28, gun, -0.028, 0, 0, hg);                     // left rail
  box(0.01, 0.024, 0.28, gun, 0.028, 0, 0, hg);                      // right rail
  box(0.026, 0.003, 0.28, dust, 0, 0.0335, 0, hg);                   // dust on the top rail
  for (let i = 0; i < 13; i++) {
    const z = -0.12 + i * 0.02;
    box(0.026, 0.005, 0.007, dark, 0, 0.032, z, hg);
    box(0.026, 0.005, 0.007, dark, 0, -0.032, z, hg);
    box(0.005, 0.026, 0.007, dark, -0.032, 0, z, hg);
    box(0.005, 0.026, 0.007, dark, 0.032, 0, z, hg);
  }
  for (let i = 0; i < 7; i++) {                                      // vent holes between the rails
    const z = -0.10 + i * 0.03;
    cyl(0.005, 0.004, dark, -0.0235, 0.017, z, 'x', 8, hg);
    cyl(0.005, 0.004, dark, 0.0235, 0.017, z, 'x', 8, hg);
    cyl(0.005, 0.004, dark, -0.0235, -0.017, z, 'x', 8, hg);
    cyl(0.005, 0.004, dark, 0.0235, -0.017, z, 'x', 8, hg);
  }
  box(0.048, 0.048, 0.01, worn, 0, 0, 0.142, hg);                    // worn front cap
  box(0.048, 0.048, 0.008, gun, 0, 0, -0.14, hg);

  // ---- barrel, gas block, birdcage with open slots ----
  cyl(0.011, 0.44, gun, 0, B, 0.23, 'z', 10);
  cyl(0.0095, 0.04, worn, 0, B, 0.36, 'z', 10);                       // worn barrel step
  box(0.024, 0.026, 0.028, gunS, 0, B + 0.008, 0.345);                // low profile gas block
  cyl(0.004, 0.30, gun, 0, B + 0.021, 0.19, 'z', 6);                  // gas tube
  const bc = new THREE.Group(); bc.position.set(0, B, 0.428); g.add(bc);
  cyl(0.0135, 0.008, gun, 0, 0, -0.018, 'z', 10, bc);                 // rear ring
  cyl(0.0135, 0.008, gun, 0, 0, 0.018, 'z', 10, bc);                  // front ring
  cyl(0.006, 0.044, dark, 0, 0, 0, 'z', 8, bc);                       // bore tube
  for (let i = 0; i < 6; i++) {                                      // prongs, closed at the bottom
    const a = i * Math.PI / 3 + Math.PI / 6;
    const p = box(0.005, 0.005, 0.03, gunS, Math.sin(a) * 0.012, Math.cos(a) * 0.012, 0, bc);
    p.rotation.z = -a;
  }
  box(0.02, 0.004, 0.03, gun, 0, -0.012, 0, bc);                      // solid bottom
  cyl(0.015, 0.006, worn, 0, 0, -0.024, 'z', 10, bc);                 // crush washer

  // ---- crane stock on a buffer tube ----
  cyl(0.016, 0.20, gun, 0, B + 0.005, -0.32, 'z', 10);
  box(0.04, 0.012, 0.02, gun, 0, B + 0.018, -0.225);
  for (let i = 0; i < 5; i++) box(0.006, 0.006, 0.006, dark, 0, B - 0.012, -0.39 + i * 0.03);
  const st = new THREE.Group(); st.position.set(0, B - 0.01, -0.36); g.add(st);
  box(0.052, 0.05, 0.13, gun, 0, 0.0, 0, st);                         // body with battery tubes
  cyl(0.014, 0.12, gunS, -0.02, -0.006, 0, 'z', 10, st);               // battery tube left
  cyl(0.014, 0.12, gunS, 0.02, -0.006, 0, 'z', 10, st);                // battery tube right
  box(0.03, 0.02, 0.13, gunS, 0, 0.03, 0, st);                         // cheek
  box(0.03, 0.004, 0.13, dust, 0, 0.042, 0, st);
  box(0.02, 0.014, 0.05, rubber, 0, -0.038, 0.02, st);                 // lever
  box(0.054, 0.003, 0.132, worn, 0, 0.0265, 0, st);
  cyl(0.004, 0.056, dark, 0, 0.015, -0.04, 'x', 6, st);                // sling pin
  box(0.055, 0.11, 0.028, rubber, 0, -0.005, -0.075, st);              // buttpad
  for (let i = 0; i < 4; i++) box(0.057, 0.005, 0.006, rubberL, 0, -0.045 + i * 0.026, -0.086, st);
  box(0.057, 0.112, 0.004, worn, 0, -0.005, -0.06, st);
  const sling = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 10), gun);
  sling.position.set(0.035, B - 0.03, -0.30); sling.rotation.y = Math.PI / 2; g.add(sling);
  box(0.014, 0.012, 0.012, gun, 0.029, B - 0.03, -0.30);

  // ---- pistol grip, trigger, guard ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.052, -0.165); grip.rotation.x = 0.35; g.add(grip);
  box(0.03, 0.118, 0.036, rubber, 0, -0.059, 0, grip);
  box(0.034, 0.02, 0.04, rubber, 0, -0.01, 0.006, grip);               // beavertail
  for (let i = 0; i < 3; i++) box(0.032, 0.004, 0.038, rubberL, 0, -0.04 - i * 0.025, 0, grip);
  box(0.034, 0.006, 0.04, gun, 0, -0.116, 0, grip);
  box(0.004, 0.004, 0.06, gun, -0.02, B - 0.082, -0.10);
  box(0.004, 0.004, 0.06, gun, 0.02, B - 0.082, -0.10);
  box(0.044, 0.004, 0.006, gun, 0, B - 0.082, -0.07);
  box(0.044, 0.004, 0.006, gun, 0, B - 0.082, -0.13);
  const trig = box(0.006, 0.024, 0.004, worn, 0, B - 0.066, -0.105); trig.rotation.x = 0.25;

  // ---- STANAG magazine, tan, one kink, tape band ----
  const mag = new THREE.Group(); mag.position.set(0, B - 0.004, -0.062); mag.rotation.x = -0.10; g.add(mag);
  box(0.024, 0.09, 0.062, gun, 0, -0.045, 0, mag);
  box(0.026, 0.003, 0.064, worn, 0, -0.03, 0, mag);
  box(0.026, 0.003, 0.064, worn, 0, -0.06, 0, mag);
  const lowerMag = new THREE.Group(); lowerMag.position.set(0, -0.09, 0); lowerMag.rotation.x = -0.16; mag.add(lowerMag);
  box(0.024, 0.10, 0.062, gun, 0, -0.05, 0, lowerMag);
  box(0.03, 0.032, 0.068, tape, 0, -0.02, 0, lowerMag);              // tape band
  box(0.032, 0.006, 0.07, tape, 0, -0.008, 0, lowerMag);
  box(0.026, 0.003, 0.064, worn, 0, -0.06, 0, lowerMag);
  box(0.026, 0.003, 0.064, worn, 0, -0.085, 0, lowerMag);
  box(0.028, 0.008, 0.066, rubber, 0, -0.104, 0, lowerMag);         // floor plate
  box(0.002, 0.07, 0.008, dark, -0.0125, -0.055, 0.015, lowerMag);   // witness slot, left

  // ---- vertical foregrip ----
  const fg = new THREE.Group(); fg.position.set(0, B - 0.034, 0.16); g.add(fg);
  box(0.036, 0.01, 0.042, gun, 0, -0.005, 0, fg);
  cyl(0.016, 0.09, rubber, 0, -0.055, 0, 'y', 10, fg);
  for (let i = 0; i < 4; i++) cyl(0.017, 0.004, rubberL, 0, -0.03 - i * 0.018, 0, 'y', 10, fg);
  cyl(0.014, 0.008, gun, 0, -0.102, 0, 'y', 10, fg);

  // ---- sockets ----
  const sock = (name, x, y, z, parent) => { const o = new THREE.Object3D(); o.name = 'socket_' + name; o.position.set(x, y, z); (parent || g).add(o); return o; };
  g.userData.sockets = {
    muzzle: sock('muzzle', 0, 0, 0.022, bc),
    gripR: sock('gripR', 0, 0, 0, grip),
    gripL: sock('gripL', 0, -0.05, 0, fg),
    mag: sock('mag', 0, 0, 0, mag),
  };

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
