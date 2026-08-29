// marksman_rifle candidate 2: a different reading of the reference. Older M16
// style upper with a raised sight base, a triangular carry handle notch, the
// scope on a tall cantilever mount, a round heat shield handguard with rail
// panels bolted on, bipod with a rail adapter block, a solid A2 stock with a
// bolted olive cheek riser, a longer step barrel. Muzzle at +Z.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const gun = M(0x6e7378, null, 0.62, 0.18);     // round 2: mid grey parkerised steel at metalness 0.18, the assault rifle's finish, so the shade side reads under the sky fill (0x3a3e45 at 0.50 rendered black off the sun). Unnamed on purpose: see assault_rifle.js, classify() gives it the matte stone grain and the weathering block leaves a held weapon alone
  const gunS = M(0x777c80, null, 0.60, 0.18);
  const gunD = M(0x60646a, null, 0.64, 0.18);
  const worn = M(0x929698, 'metal', 0.46, 0.45);    // finish rubbed through to bare metal
  const dust = M(0x80858a, null, 0.58, 0.18);   // up faces: lighter, bleached steel (a held weapon is wiped clean, no tan cap)
  const rustM = M(0x6b4426, 'metal', 0.75, 0.3);
  const rubber = M(0x2a2c2e, null, 0.74, 0.03);
  const rubberL = M(0x3d4043, null, 0.70, 0.03);
  const olive = M(0x4e5238, 'fabric', 0.70, 0.1);
  const oliveS = M(0x585c40, 'fabric', 0.70, 0.1);
  const cloth = M(0xb0a07c, 'fabric', 0.85, 0.0);
  const clothD = M(0xa09270, 'fabric', 0.85, 0.0);
  const khaki = M(0x7a6a4c, 'fabric', 0.86, 0.0);      // round 4: the riser strap, militia khaki webbing
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });   // see through: ADS looks THROUGH the optic
  const reticle = new THREE.MeshStandardMaterial({ color: 0x3a0e08, roughness: 0.6, metalness: 0.0, emissive: 0xff4a30, emissiveIntensity: 2.2 });
  const dark = M(0x34373a, 'metal', 0.65, 0.25, true);

  const box = (w, h, d, mat, x, y, z, parent) => {
    // round 12 item 4: parts over 2.5 cm on every side get a 3 mm chamfer through the loader's ChamferBox (a viewmodel is seen at 30 cm; box edges are the loudest tell there)
    const geo = THREE.ChamferBox && Math.min(w, h, d) >= 0.025 ? new THREE.ChamferBox(w, h, d, 0.003) : new THREE.BoxGeometry(w, h, d);
    const mm = new THREE.Mesh(geo, mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent, r2, open) => {
    // open: no end caps. Every cylinder coaxial with the scope tube must be open, or its cap
    // is a solid disc across the eyepiece and ADS looks at a black circle
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, len, seg || 10, 1, !!open), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const ring = (r, t, mat, x, y, z, parent, seg) => {
    const mm = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, seg || 12), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const B = 0.20;

  // ---- receiver ----
  const rc = new THREE.Group(); rc.position.set(0, B, -0.16); g.add(rc);
  box(0.042, 0.04, 0.28, gunS, 0, 0.006, 0, rc);                        // upper
  box(0.040, 0.036, 0.22, gun, 0, -0.032, -0.03, rc);                   // lower
  box(0.044, 0.05, 0.075, gunD, 0, -0.06, 0.06, rc);                    // magwell
  box(0.045, 0.004, 0.077, worn, 0, -0.086, 0.06, rc);
  box(0.038, 0.003, 0.22, dark, 0, -0.014, -0.03, rc);
  box(0.024, 0.012, 0.28, gun, 0, 0.032, 0, rc);                        // rail
  box(0.01, 0.002, 0.28, dust, 0, 0.0415, 0, rc);
  for (let i = 0; i < 13; i++) box(0.026, 0.005, 0.006, dark, 0, 0.038, -0.12 + i * 0.02, rc);
  box(0.003, 0.018, 0.06, dark, 0.0215, 0.006, 0.04, rc);               // ejection port
  box(0.003, 0.02, 0.062, worn, 0.0205, 0.018, 0.04, rc);
  box(0.008, 0.024, 0.02, gun, 0.024, 0.004, 0.0, rc);                  // deflector
  cyl(0.008, 0.024, gun, 0.025, 0.002, -0.03, 'z', 8, rc);              // forward assist
  box(0.018, 0.008, 0.06, gun, 0, 0.018, -0.13, rc);                    // charging handle
  box(0.04, 0.006, 0.014, gun, 0, 0.018, -0.152, rc);
  box(0.014, 0.004, 0.024, worn, -0.026, -0.02, -0.09, rc);             // selector
  box(0.006, 0.01, 0.01, gun, 0.023, -0.03, 0.10, rc);                  // mag release
  box(0.004, 0.014, 0.02, worn, 0.023, -0.03, 0.085, rc);
  box(0.012, 0.014, 0.016, gun, -0.025, -0.03, 0.10, rc);               // bolt catch
  cyl(0.004, 0.046, dark, 0, -0.04, -0.13, 'x', 6, rc);
  cyl(0.004, 0.046, dark, 0, -0.04, 0.08, 'x', 6, rc);
  box(0.003, 0.004, 0.012, rustM, 0.021, -0.048, -0.13, rc);            // rust under the pins
  box(0.003, 0.004, 0.012, rustM, -0.021, -0.048, -0.13, rc);

  // ---- scope on a cantilever mount ----
  const sc = new THREE.Group(); sc.position.set(0, B + 0.038, -0.13); g.add(sc);
  box(0.03, 0.014, 0.10, gun, 0, 0.007, -0.03, sc);                     // cantilever base
  box(0.02, 0.016, 0.03, gunS, 0, 0.02, -0.06, sc);                     // rear riser
  box(0.02, 0.016, 0.03, gunS, 0, 0.02, 0.03, sc);                      // front riser
  for (const z of [-0.06, 0.03]) {
    ring(0.017, 0.005, gunS, 0, 0.038, z, sc);                          // ring halves
    box(0.05, 0.006, 0.02, gunS, 0, 0.038, z, sc);
    cyl(0.004, 0.054, dark, 0, 0.038, z, 'x', 6, sc);
    box(0.004, 0.006, 0.014, rustM, 0.026, 0.031, z, sc);               // rust under the ring bolt
  }
  cyl(0.004, 0.036, dark, 0, 0.0, -0.06, 'x', 6, sc);                   // clamp bolts
  cyl(0.004, 0.036, dark, 0, 0.0, 0.0, 'x', 6, sc);
  box(0.006, 0.008, 0.03, worn, 0.02, 0.004, -0.02, sc);                // clamp lever
  cyl(0.015, 0.30, gun, 0, 0.038, 0.0, 'z', 12, sc, undefined, true);                    // tube
  cyl(0.025, 0.07, gunS, 0, 0.038, 0.13, 'z', 12, sc, 0.019, true);           // bell
  cyl(0.026, 0.01, worn, 0, 0.038, 0.165, 'z', 12, sc, undefined, true);
  cyl(0.02, 0.002, glass, 0, 0.038, 0.171, 'z', 12, sc);
  cyl(0.02, 0.05, gunS, 0, 0.038, -0.13, 'z', 12, sc, 0.016, true);           // ocular
  cyl(0.021, 0.008, rubber, 0, 0.038, -0.156, 'z', 12, sc, undefined, true);
  cyl(0.017, 0.002, glass, 0, 0.038, -0.161, 'z', 12, sc);
  // crosshair on the tube axis, seen through the ocular in ADS; the sight socket is the ocular centre
  box(0.0006, 0.026, 0.0006, dark, 0, 0.038, 0.0, sc);
  box(0.026, 0.0006, 0.0006, dark, 0, 0.038, 0.0, sc);
  const sightSock = new THREE.Object3D(); sightSock.name = 'socket_sight'; sightSock.position.set(0, 0.038, -0.161); sc.add(sightSock);
  cyl(0.02, 0.03, gun, 0, 0.038, -0.015, 'z', 12, sc, undefined, true);                  // saddle
  cyl(0.011, 0.018, gun, 0, 0.065, -0.015, 'y', 10, sc);                // elevation turret
  cyl(0.012, 0.004, worn, 0, 0.075, -0.015, 'y', 10, sc);
  cyl(0.011, 0.018, gun, 0.029, 0.038, -0.015, 'x', 10, sc);            // windage turret
  cyl(0.012, 0.004, worn, 0.039, 0.038, -0.015, 'x', 10, sc);
  cyl(0.008, 0.012, gun, -0.026, 0.038, -0.015, 'x', 10, sc);           // parallax
  const wrap = (z0, n, r) => { for (let i = 0; i < n; i++) { const w = cyl(r, 0.013, i % 2 ? cloth : clothD, 0, 0.038, z0 + i * 0.014, 'z', 12, sc, undefined, true); w.rotation.z = i * 0.3; } };
  wrap(0.04, 5, 0.0185); wrap(-0.10, 3, 0.0185);
  box(0.03, 0.008, 0.004, clothD, 0.01, 0.055, 0.045, sc);              // tied tail
  box(0.018, 0.003, 0.28, dust, 0, 0.053, 0.0, sc);

  // ---- round heat shield handguard with bolted rail panels ----
  const hg = new THREE.Group(); hg.position.set(0, B, 0.155); g.add(hg);
  cyl(0.022, 0.35, gunD, 0, 0, 0, 'z', 12, hg);                         // tube
  for (let i = 0; i < 8; i++) {                                         // heat shield vent holes both sides
    const z = -0.14 + i * 0.04;
    cyl(0.005, 0.004, dark, -0.022, 0.012, z, 'x', 8, hg);
    cyl(0.005, 0.004, dark, 0.022, 0.012, z, 'x', 8, hg);
    cyl(0.005, 0.004, dark, -0.022, -0.012, z + 0.02, 'x', 8, hg);
    cyl(0.005, 0.004, dark, 0.022, -0.012, z + 0.02, 'x', 8, hg);
  }
  box(0.024, 0.012, 0.35, gun, 0, 0.026, 0, hg);                        // top rail, full length
  box(0.01, 0.002, 0.35, dust, 0, 0.0355, 0, hg);
  for (let i = 0; i < 16; i++) box(0.026, 0.005, 0.007, dark, 0, 0.032, -0.155 + i * 0.02, hg);
  box(0.024, 0.012, 0.12, gun, 0, -0.026, 0.10, hg);                    // bottom rail panel, front only
  for (let i = 0; i < 5; i++) box(0.026, 0.005, 0.007, dark, 0, -0.032, 0.06 + i * 0.02, hg);
  box(0.012, 0.024, 0.10, gun, 0.026, 0, 0.0, hg);                      // side rail panels
  box(0.012, 0.024, 0.10, gun, -0.026, 0, 0.0, hg);
  for (let i = 0; i < 4; i++) { box(0.005, 0.026, 0.007, dark, 0.032, 0, -0.03 + i * 0.02, hg); box(0.005, 0.026, 0.007, dark, -0.032, 0, -0.03 + i * 0.02, hg); }
  for (const z of [-0.04, 0.04]) { cyl(0.004, 0.06, dark, 0, 0, z, 'x', 6, hg); box(0.004, 0.006, 0.02, rustM, 0.031, -0.01, z, hg); } // panel bolts
  cyl(0.03, 0.02, gun, 0, 0, -0.165, 'z', 12, hg);                      // barrel nut
  ring(0.03, 0.003, worn, 0, 0, -0.176, hg);
  cyl(0.026, 0.008, worn, 0, 0, 0.176, 'z', 12, hg);                    // front cap
  box(0.006, 0.006, 0.014, gun, 0, -0.03, 0.15, hg);
  ring(0.008, 0.002, gun, 0, -0.042, 0.15, hg, 10);

  // ---- bipod on a rail adapter, folded back beneath the front rail ----
  const bp = new THREE.Group(); bp.position.set(0, B - 0.036, 0.28); g.add(bp);
  box(0.03, 0.016, 0.05, gun, 0, -0.006, 0, bp);                        // adapter block
  cyl(0.005, 0.034, worn, 0, -0.006, -0.015, 'x', 6, bp);
  cyl(0.005, 0.034, worn, 0, -0.006, 0.015, 'x', 6, bp);
  box(0.044, 0.014, 0.024, gunS, 0, -0.02, 0, bp);                      // pivot head
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.022, -0.026, -0.005); leg.rotation.x = -Math.PI / 2 + 0.04; leg.rotation.z = sx * 0.1; bp.add(leg);
    cyl(0.007, 0.012, worn, 0, -0.004, 0, 'y', 8, leg);
    box(0.011, 0.09, 0.011, gunS, 0, -0.055, 0, leg);                   // square section upper leg
    cyl(0.0045, 0.075, gun, 0, -0.135, 0, 'y', 8, leg);                 // round inner leg
    box(0.014, 0.008, 0.014, rubber, 0, -0.174, 0, leg);                // square rubber foot
    for (let i = 0; i < 3; i++) box(0.012, 0.002, 0.012, dark, 0, -0.03 - i * 0.02, 0, leg); // notches
    box(0.008, 0.008, 0.012, worn, 0, -0.095, 0.007, leg);
  }

  // ---- barrel, gas block, three prong brake with a ring ----
  cyl(0.016, 0.40, gun, 0, B, 0.20, 'z', 10);
  cyl(0.013, 0.20, gunS, 0, B, 0.43, 'z', 10);
  box(0.028, 0.03, 0.03, gunS, 0, B + 0.008, 0.335);
  cyl(0.004, 0.33, gun, 0, B + 0.022, 0.17, 'z', 6);
  const mb = new THREE.Group(); mb.position.set(0, B, 0.535); g.add(mb);
  cyl(0.016, 0.012, worn, 0, 0, -0.03, 'z', 10, mb);
  cyl(0.017, 0.02, gun, 0, 0, -0.015, 'z', 10, mb);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 2;
    const p = box(0.008, 0.006, 0.05, gunS, Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0.015, mb); p.rotation.z = a;
  }
  ring(0.0135, 0.0025, gunS, 0, 0, 0.04, mb, 10);
  cyl(0.007, 0.004, dark, 0, 0, 0.04, 'z', 8, mb);

  // ---- grip, trigger, guard ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.05, -0.24); grip.rotation.x = 0.3; g.add(grip);
  box(0.032, 0.12, 0.04, rubber, 0, -0.06, 0, grip);
  box(0.036, 0.02, 0.044, rubber, 0, -0.01, 0.006, grip);
  for (let i = 0; i < 3; i++) box(0.034, 0.004, 0.042, rubberL, 0, -0.04 - i * 0.025, 0, grip);
  box(0.034, 0.006, 0.042, gun, 0, -0.118, 0, grip);
  box(0.004, 0.004, 0.07, gun, -0.02, B - 0.082, -0.17);
  box(0.004, 0.004, 0.07, gun, 0.02, B - 0.082, -0.17);
  box(0.044, 0.004, 0.006, gun, 0, B - 0.082, -0.135);
  box(0.044, 0.004, 0.006, gun, 0, B - 0.082, -0.205);
  const trig = box(0.006, 0.024, 0.004, worn, 0, B - 0.066, -0.18); trig.rotation.x = 0.25;

  // ---- 20 round box mag ----
  const mag = new THREE.Group(); mag.name = 'socket_mag'; mag.position.set(0, B - 0.02, -0.10); mag.rotation.x = -0.06; g.add(mag);   // the group IS the socket so the reload moves the geometry
  box(0.028, 0.17, 0.068, gun, 0, -0.085, 0, mag);
  for (let i = 0; i < 3; i++) box(0.03, 0.003, 0.07, worn, 0, -0.09 - i * 0.025, 0, mag);
  box(0.002, 0.06, 0.008, dark, -0.0145, -0.12, 0.015, mag);
  box(0.002, 0.06, 0.008, dark, 0.0145, -0.12, 0.015, mag);
  box(0.032, 0.008, 0.072, rubber, 0, -0.166, 0, mag);

  // ---- solid A2 style stock with a bolted olive cheek riser ----
  const st = new THREE.Group(); st.position.set(0, B, -0.30); g.add(st);
  cyl(0.016, 0.04, gun, 0, 0.004, 0.02, 'z', 10, st);
  box(0.04, 0.012, 0.02, gun, 0, 0.016, 0.0, st);
  box(0.044, 0.06, 0.25, rubber, 0, -0.02, -0.125, st);                 // body
  box(0.046, 0.04, 0.16, rubber, 0, -0.08, -0.17, st);                  // toe
  box(0.042, 0.004, 0.25, rubberL, 0, 0.011, -0.125, st);               // upper edge
  box(0.036, 0.034, 0.15, olive, 0, 0.027, -0.14, st);                  // cheek riser block
  box(0.038, 0.003, 0.15, oliveS, 0, 0.0455, -0.14, st);
  box(0.034, 0.003, 0.15, dust, 0, 0.048, -0.14, st);
  for (const z of [-0.09, -0.19]) {
    cyl(0.006, 0.048, worn, 0, 0.025, z, 'x', 6, st);                   // riser bolts through
    box(0.004, 0.006, 0.02, rustM, 0.022, 0.018, z, st);                // rust under each bolt
  }
  for (let i = 0; i < 5; i++) box(0.046, 0.004, 0.006, rubberL, 0, -0.045 + i * 0.012, -0.21, st);  // stock vents
  cyl(0.006, 0.008, dark, 0.022, -0.02, -0.06, 'x', 8, st);             // sling loop pin
  box(0.05, 0.14, 0.03, rubber, 0, -0.035, -0.265, st);                 // pad
  for (let i = 0; i < 5; i++) box(0.052, 0.006, 0.006, rubberL, 0, -0.09 + i * 0.026, -0.277, st);
  box(0.052, 0.142, 0.004, worn, 0, -0.035, -0.248, st);
  box(0.006, 0.008, 0.014, gun, 0, -0.104, -0.17, st);
  ring(0.008, 0.002, gun, 0, -0.115, -0.17, st, 10);

  // ---- round 4 detail pass ----
  // stock: the A2 profile tapers under the comb to the toe. A sloped wedge closes the step between body and toe,
  // worn edge strips break the black slab, the trapdoor shows on the buttplate, a QD loop on the end plate.
  const wedge = box(0.046, 0.012, 0.088, rubber, 0, -0.074, -0.055, st); wedge.rotation.x = -0.62;
  const wedgeL = box(0.047, 0.003, 0.088, rubberL, 0, -0.0805, -0.055, st); wedgeL.rotation.x = -0.62;   // its worn lower edge
  box(0.048, 0.003, 0.16, rubberL, 0, -0.0995, -0.17, st);              // toe bottom edge, worn
  box(0.003, 0.062, 0.25, rubberL, 0.0225, -0.02, -0.125, st);          // sun side edge of the body
  box(0.003, 0.042, 0.16, rubberL, 0.0235, -0.08, -0.17, st);
  box(0.030, 0.080, 0.002, dark, 0, -0.040, -0.2815, st);               // trapdoor outline on the buttplate
  box(0.026, 0.074, 0.003, rubber, 0, -0.040, -0.282, st);              // the door itself, proud
  cyl(0.0030, 0.030, worn, 0, 0.002, -0.2825, 'x', 6, st);              // trapdoor hinge pin
  cyl(0.0030, 0.004, worn, 0, -0.082, -0.283, 'z', 6, st);              // latch button
  const qd = ring(0.007, 0.002, gun, -0.026, 0.0, 0.0, st, 10); qd.rotation.y = Math.PI / 2;   // QD sling loop, left of the end plate
  cyl(0.0040, 0.004, worn, -0.022, 0.0, 0.0, 'x', 6, st);
  // cheek riser strap: a khaki webbing loop round body and riser with a buckle on the left
  box(0.040, 0.003, 0.012, khaki, 0, 0.0505, -0.12, st);
  box(0.003, 0.104, 0.012, khaki, -0.0235, -0.001, -0.12, st);
  box(0.003, 0.104, 0.012, khaki, 0.0235, -0.001, -0.12, st);
  box(0.048, 0.003, 0.012, khaki, 0, -0.0525, -0.12, st);
  box(0.006, 0.016, 0.014, worn, -0.0245, 0.020, -0.12, st);            // ladder lock buckle
  box(0.003, 0.010, 0.005, dark, -0.0275, 0.020, -0.12, st);
  // scope: four clamp screws per ring, open flip up lens caps on the bell and the ocular, knurled turret rings
  for (const z of [-0.06, 0.03]) for (const sx of [-1, 1]) for (const dz of [-0.006, 0.006]) {
    cyl(0.0028, 0.010, worn, sx * 0.0235, 0.042, z + dz, 'y', 6, sc);
    cyl(0.0012, 0.002, dark, sx * 0.0235, 0.0475, z + dz, 'y', 6, sc);
  }
  box(0.004, 0.006, 0.014, rustM, -0.026, 0.031, -0.06, sc);           // rust under the left ring bolts too
  box(0.004, 0.006, 0.014, rustM, -0.026, 0.031, 0.03, sc);
  const flipCap = (y, z, open, r) => {
    const h = new THREE.Group(); h.position.set(0, y, z); h.rotation.x = open; sc.add(h);
    cyl(0.0030, 0.014, worn, 0, 0, 0, 'x', 6, h);                       // hinge
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.003, 12), gunS);
    disc.rotation.x = Math.PI / 2; disc.position.set(0, r, 0); h.add(disc);
    const rim = ring(r, 0.002, rubber, 0, r, 0, h, 12);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.004, r - 0.004, 0.002, 12), dark);
    inner.rotation.x = Math.PI / 2; inner.position.set(0, r, open > 0 ? -0.002 : 0.002); h.add(inner);   // matte inside face
    return h;
  };
  flipCap(0.064, 0.170, -1.26, 0.027);                                   // objective cap, open, leaning back over the bell
  flipCap(0.059, -0.161, 1.26, 0.022);                                   // ocular cap, open, leaning forward
  ring(0.0115, 0.0015, worn, 0, 0.070, -0.015, sc, 12).rotation.x = Math.PI / 2;   // elevation turret knurl
  box(0.002, 0.006, 0.004, dark, 0, 0.076, -0.004, sc);                 // index line
  const wk = ring(0.0115, 0.0015, worn, 0.034, 0.038, -0.015, sc, 12); wk.rotation.y = Math.PI / 2;   // windage knurl
  // bipod: lock knobs at the head, rust under the adapter bolts
  cyl(0.0050, 0.006, worn, -0.025, -0.020, 0, 'x', 8, bp);
  cyl(0.0050, 0.006, worn, 0.025, -0.020, 0, 'x', 8, bp);
  box(0.004, 0.006, 0.010, rustM, -0.017, -0.014, -0.015, bp);
  box(0.004, 0.006, 0.010, rustM, 0.017, -0.014, 0.015, bp);
  // handguard: rust under the left panel bolts, a folded flip up front sight on the rail ahead of the panels
  for (const z of [-0.04, 0.04]) box(0.004, 0.006, 0.02, rustM, -0.031, -0.01, z, hg);
  box(0.022, 0.008, 0.024, gun, 0, 0.036, 0.13, hg);
  box(0.018, 0.005, 0.020, gunD, 0, 0.0425, 0.13, hg);
  cyl(0.0030, 0.024, worn, 0, 0.036, 0.121, 'x', 6, hg);
  box(0.003, 0.002, 0.020, worn, 0, 0.0455, 0.13, hg);                  // the folded post catches the sun
  // muzzle brake: cross bolt through the ring, port cuts between the prongs
  cyl(0.0025, 0.030, worn, 0, 0, 0.04, 'x', 6, mb);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 6; const p = box(0.006, 0.003, 0.030, dark, Math.cos(a) * 0.013, Math.sin(a) * 0.013, 0.012, mb); p.rotation.z = a; }
  // magazine floor plate lip
  box(0.034, 0.003, 0.074, worn, 0, -0.1615, 0, mag);
  box(0.012, 0.150, 0.003, gunD, 0, -0.085, -0.0355, mag);              // rear spine rib

  // ---- sockets ----
  const sock = (name, x, y, z, parent) => { const o = new THREE.Object3D(); o.name = 'socket_' + name; o.position.set(x, y, z); (parent || g).add(o); return o; };
  g.userData.sockets = {
    muzzle: sock('muzzle', 0, 0, 0.04, mb),
    gripR: sock('gripR', 0, 0, 0, grip),
    gripL: sock('gripL', 0, -0.03, -0.05, hg),
    mag: mag,
    sight: sightSock,
  };

  // ---- contract: base at y=0, centred on x and z ----
  const WEATHER_OPTS = { held: 1 };   // integrator r2: a held weapon takes the mottle only (player agent's request)
  // ---- DERRICK material pass (round 2): weathering as a per vertex colour attribute. No extra draw
  // calls, no extra triangles except long single segment boxes, which are re-cut along their length
  // so the mottle, the streaks and the rust to paint gradient have vertices to live on. Rules by
  // recipe name: metal gets rust at the foot and below fixings, streaks, dust on up faces, bleach on
  // the sun side; stone a stained bottom band; timber grey bleach on top; fabric a dirty foot;
  // foliage and ground a mottle. The attribute is a multiplier on the material colour, so every part
  // keeps the author's colour where nothing has happened to it. Unnamed materials (glass, rubber) and
  // emissive lenses are untouched. WEATHER_OPTS may be set before this block.
  (function weather(root, opt) {
    opt = Object.assign({ rustH: 0, mottle: 1, streak: 1, dust: 1, cut: 1.8, seed: 0, sand: 0, held: 0 }, opt || {});
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
        if (opt.held) {
          // held asset (weapon, arms): never on the ground, so no rust foot, streaks, stain band or dust; mottle and facing only
        } else if (kind === 'metal' && !dark && !isRust) {
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
