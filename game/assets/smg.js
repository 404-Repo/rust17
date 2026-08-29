// smg candidate 2: a different part breakdown read off the reference. Open reflex
// sight instead of a tube, handguard ribs as stacked rings, stock as two round
// rods with a diamond cross brace, receiver in a top cover with a raised centre
// rib and a lower frame with stamped panels, suppressor with a knurled band.
//
// Round 4 detail pass (pass 2, after the judge's reject): the fixings a stamped steel SMG is
// held together with, sized to read at 1.5 m. Six 7 mm slotted grip screws and two frame
// screws with 20 mm rust runs, eight 5 mm rivets per side standing 3 mm proud of the lower
// frame with rust below each, three stamped grooves per flank with a light lip, a raised
// stamped panel, serial plate and sling bracket on the right flank behind the ejection port,
// the stock hinge as a vertical knuckle with a bolt head on top and a nut below plus a latch
// plate with its own cross bolt and thumb lever, the suppressor slimmed to 34 mm (the concept
// shows it thinner than the 48 mm handguard) with a knurled index band at the thread collar,
// a three segment rubber cord through the rear lanyard loop, a 6 mm mag release paddle and
// selector lever. The suppressor stays low poly on purpose so the densest cell (and the
// assetview close tile) stays at the receiver, not at the muzzle.
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
  const rustM = M(0x6b4426, 'metal', 0.75, 0.3);
  const dust = M(0x80858a, null, 0.58, 0.18);   // up faces: lighter, bleached steel (a held weapon is wiped clean, no tan cap)
  const rubber = M(0x2a2c2e, null, 0.74, 0.03);
  const rubberL = M(0x3d4043, null, 0.70, 0.03);
  const cordM = M(0x1d1e20, null, 0.80, 0.02);     // rubber black: the lanyard cord (unnamed, near black, the rubber tile on a held asset)
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });   // see through: ADS looks THROUGH the optic
  const reticle = new THREE.MeshStandardMaterial({ color: 0x3a0e08, roughness: 0.6, metalness: 0.0, emissive: 0xff4a30, emissiveIntensity: 2.2 });
  const dark = M(0x34373a, 'metal', 0.65, 0.25, true);

  const box = (w, h, d, mat, x, y, z, parent) => {
    // round 12 item 4: parts over 2.5 cm on every side get a 3 mm chamfer through the loader's ChamferBox (a viewmodel is seen at 30 cm; box edges are the loudest tell there)
    const geo = THREE.ChamferBox && Math.min(w, h, d) >= 0.025 ? new THREE.ChamferBox(w, h, d, 0.003) : new THREE.BoxGeometry(w, h, d);
    const mm = new THREE.Mesh(geo, mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const ring = (r, t, mat, x, y, z, parent, rs, ts) => {
    const mm = new THREE.Mesh(new THREE.TorusGeometry(r, t, rs || 6, ts || 12), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  // a slotted screw head on a side face (axis x), head diameter d, standing 2 mm proud, with a rust run below
  const screw = (sx, x, y, z, parent, d, run, slotA) => {
    const r = (d || 0.007) / 2;
    cyl(r, 0.004, worn, x + sx * 0.001, y, z, 'x', 8, parent);
    const s = box(0.0016, 0.0014, d * 0.9, dark, x + sx * 0.0032, y, z, parent); s.rotation.x = slotA || 0;
    box(0.0014, run || 0.020, 0.0035, rustM, x, y - r - (run || 0.020) / 2 + 0.001, z, parent);
  };
  // a rivet head standing proud of a side face, with a short rust run under it
  const rivet = (sx, x, y, z, parent, mat) => {
    cyl(0.0025, 0.005, mat || worn, x + sx * 0.0015, y, z, 'x', 6, parent);
    box(0.0012, 0.008, 0.0025, rustM, x, y - 0.0065, z, parent);
  };
  const B = 0.20;

  // ---- lower frame with stamped side panels, top cover with a centre rib ----
  const rc = new THREE.Group(); rc.position.set(0, B, -0.03); g.add(rc);
  box(0.044, 0.03, 0.26, gun, 0, -0.01, 0, rc);                          // lower frame
  box(0.046, 0.028, 0.26, gunS, 0, 0.018, 0, rc);                        // top cover
  box(0.016, 0.006, 0.24, gunS, 0, 0.034, 0, rc);                        // raised centre rib
  box(0.046, 0.003, 0.26, dust, 0, 0.0325, 0, rc);                       // dust on the cover
  box(0.048, 0.003, 0.262, worn, 0, 0.004, 0, rc);                       // worn seam edge
  for (const sx of [-1, 1]) {
    box(0.003, 0.02, 0.10, gunD, sx * 0.023, -0.01, 0.06, rc);           // stamped panel front
    box(0.003, 0.02, 0.06, gunD, sx * 0.023, -0.01, -0.08, rc);          // stamped panel rear
    cyl(0.004, 0.005, dark, sx * 0.0235, -0.02, -0.11, 'x', 8, rc);
    cyl(0.004, 0.005, dark, sx * 0.0235, -0.02, 0.10, 'x', 8, rc);
    box(0.003, 0.004, 0.008, rustM, sx * 0.0235, -0.028, -0.11, rc);     // rust below the pins
    // pass 2: rivet row along the lower frame, eight per side, 5 mm heads 3 mm proud, rust under each
    for (let i = 0; i < 8; i++) rivet(sx, sx * 0.0245, -0.012, -0.118 + i * 0.031, rc);
    // pass 2: the frame screw behind the trigger, 7 mm slotted head
    screw(sx, sx * 0.0225, 0.0, -0.047, rc, 0.007, 0.014, 0.4);
  }
  // pass 2: stamped grooves along the top cover, a dark groove with a light lower lip. Left side runs full
  // length above and below the charging slot; right side in two runs either side of the ejection port
  const groove = (sx, y, z, len) => {
    box(0.0025, 0.0035, len, dark, sx * 0.0235, y, z, rc);
    box(0.002, 0.0015, len, worn, sx * 0.0235, y - 0.0025, z, rc);
  };
  groove(-1, 0.009, 0.0, 0.21); groove(-1, 0.029, 0.0, 0.21);
  for (const y of [0.009, 0.017, 0.026]) { groove(1, y, -0.082, 0.085); groove(1, y, 0.082, 0.078); }
  box(0.003, 0.014, 0.05, dark, 0.024, 0.014, 0.01, rc);                 // ejection port right
  box(0.0025, 0.016, 0.052, worn, 0.0245, 0.014, 0.01, rc);              // port frame lip (light)
  box(0.003, 0.012, 0.048, dark, 0.0252, 0.014, 0.01, rc);               // the port itself, dark inside the lip
  box(0.004, 0.02, 0.02, worn, 0.024, -0.01, -0.02, rc);                 // right side catch plate
  box(0.004, 0.01, 0.014, gun, 0.025, 0.0, 0.11, rc);                    // right lug
  // pass 2: the right flank behind the port is dressed: a raised stamped panel with a rivet at each end,
  // a serial plate, and the sling loop bracket
  box(0.0035, 0.012, 0.056, gunD, 0.0245, 0.004, -0.075, rc);            // raised stamped panel
  box(0.0045, 0.002, 0.056, worn, 0.0245, 0.0105, -0.075, rc);           // its top lip catches the light
  rivet(1, 0.026, 0.004, -0.098, rc); rivet(1, 0.026, 0.004, -0.052, rc);
  box(0.003, 0.007, 0.022, worn, 0.0245, 0.026, -0.10, rc);              // serial plate, plated panel, no letters
  box(0.004, 0.012, 0.010, worn, 0.024, 0.026, -0.06, rc);               // sling loop bracket
  const slr = ring(0.006, 0.0015, gun, 0.030, 0.026, -0.06, rc, 5, 8); slr.rotation.y = Math.PI / 2;
  box(0.002, 0.004, 0.12, dark, -0.022, 0.02, 0.01, rc);                 // charging slot left
  box(0.018, 0.012, 0.024, gun, -0.03, 0.02, -0.03, rc);
  cyl(0.009, 0.012, rubber, -0.035, 0.02, -0.03, 'x', 8, rc);            // charging knob left
  box(0.042, 0.052, 0.014, gunD, 0, 0.004, -0.137, rc);                  // rear cap
  box(0.02, 0.006, 0.02, gun, 0, 0.035, -0.125, rc);                     // rear sight block
  box(0.004, 0.012, 0.004, gun, -0.008, 0.043, -0.125, rc);
  box(0.004, 0.012, 0.004, gun, 0.008, 0.043, -0.125, rc);
  cyl(0.0025, 0.005, dark, 0, 0.043, -0.125, 'z', 6, rc);                // rear sight aperture
  // pass 2: selector lever on the left above the grip, 6 mm, with its slot; mag release paddle at the heel
  box(0.0025, 0.004, 0.030, dark, -0.0235, -0.006, -0.028, rc);          // selector slot
  box(0.005, 0.007, 0.012, worn, -0.0245, -0.006, -0.034, rc);           // the lever, 7 mm tall, 5 mm proud
  box(0.0015, 0.010, 0.0035, rustM, -0.0235, -0.015, -0.034, rc);
  // pass 2: lanyard loop with a rubber cord through it, three segments hanging off the rear
  const loop = ring(0.006, 0.0018, gun, 0, -0.024, -0.147, rc, 4, 8);
  const c1 = cyl(0.0022, 0.030, cordM, 0, -0.038, -0.152, 'y', 5, rc);   c1.rotation.z = 0.12;    // down from the loop
  const c2 = cyl(0.0022, 0.026, cordM, 0.004, -0.061, -0.150, 'y', 5, rc); c2.rotation.z = -0.35; // swings out
  const c3 = cyl(0.0022, 0.024, cordM, 0.010, -0.082, -0.148, 'y', 5, rc); c3.rotation.z = 0.15;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 5, 4), cordM); knot.position.set(0.011, -0.095, -0.148); rc.add(knot);

  // ---- top rail and an open reflex sight with a hooded window ----
  box(0.022, 0.01, 0.22, gun, 0, B + 0.037, -0.04);
  for (let i = 0; i < 10; i++) box(0.024, 0.004, 0.006, dark, 0, B + 0.042, -0.13 + i * 0.02);
  const rd = new THREE.Group(); rd.position.set(0, B + 0.042, -0.07); g.add(rd);
  box(0.026, 0.012, 0.06, gun, 0, 0.006, 0, rd);                         // base
  box(0.026, 0.003, 0.06, dust, 0, 0.0135, 0, rd);
  box(0.004, 0.02, 0.004, gunS, -0.012, 0.022, 0.024, rd);              // hood posts
  box(0.004, 0.02, 0.004, gunS, 0.012, 0.022, 0.024, rd);
  box(0.028, 0.004, 0.004, gunS, 0, 0.033, 0.024, rd);                    // hood top
  const win = box(0.026, 0.022, 0.0015, glass, 0, 0.022, 0.024, rd); win.rotation.x = -0.15;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 6, 4), reticle); dot.position.set(0, 0.022, 0.016); rd.add(dot);   // the red dot, behind the window
  const sightSock = new THREE.Object3D(); sightSock.name = 'socket_sight'; sightSock.position.set(0, 0.022, 0.024); rd.add(sightSock);
  box(0.014, 0.008, 0.02, gunD, 0, 0.016, -0.01, rd);                    // emitter housing
  box(0.006, 0.006, 0.006, worn, 0.016, 0.006, -0.02, rd);               // adjustment screw
  cyl(0.004, 0.03, dark, 0, 0.004, 0.0, 'x', 6, rd);                     // clamp bolt
  cyl(0.0050, 0.004, worn, 0.016, 0.004, 0, 'x', 8, rd);                 // cross bolt head right, hex nut left, rust under both
  cyl(0.0050, 0.004, worn, -0.016, 0.004, 0, 'x', 6, rd);
  box(0.0015, 0.006, 0.004, rustM, 0.016, -0.003, 0.0, rd); box(0.0015, 0.006, 0.004, rustM, -0.016, -0.003, 0.0, rd);

  // ---- handguard: core with stacked rib rings, screw plates, hand stop ----
  const hg = new THREE.Group(); hg.position.set(0, B, 0.16); g.add(hg);
  cyl(0.02, 0.12, gunD, 0, 0, 0, 'z', 12, hg);
  // pass 2: the handguard is a finely ribbed pressing (22 ribs at 5 mm pitch as in the concept), one lathe
  // rather than stacked tori, so the ribs read as a corrugated surface and the silhouette is round
  {
    const pts = [new THREE.Vector2(0.0205, -0.056)];
    for (let i = 0; i < 22; i++) { const y0 = -0.055 + i * 0.005; pts.push(new THREE.Vector2(0.0205, y0), new THREE.Vector2(0.0205, y0 + 0.0012), new THREE.Vector2(0.0237, y0 + 0.0018), new THREE.Vector2(0.0237, y0 + 0.0044)); }
    pts.push(new THREE.Vector2(0.0205, 0.056));
    const ribs = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), gun); ribs.rotation.x = Math.PI / 2; hg.add(ribs);
    for (const z of [-0.031, 0.019]) ring(0.0238, 0.0012, worn, 0, 0, z, hg, 4, 16);   // two crests worn to bare metal where the hand rides
  }
  cyl(0.024, 0.008, gunS, 0, 0, 0.062, 'z', 12, hg);                     // front collar
  cyl(0.024, 0.008, gunS, 0, 0, -0.06, 'z', 12, hg);                     // rear collar
  box(0.006, 0.014, 0.02, dark, 0.022, 0.0, -0.045, hg);                 // screw plates
  box(0.006, 0.014, 0.02, dark, -0.022, 0.0, -0.045, hg);
  screw(1, 0.0245, 0.0, -0.045, hg, 0.006, 0.010, 1.2); screw(-1, -0.0245, 0.0, -0.045, hg, 0.006, 0.010, -0.8);
  box(0.03, 0.028, 0.02, gunD, 0, -0.034, -0.02, hg);                    // hand stop
  box(0.032, 0.008, 0.026, rubber, 0, -0.05, -0.018, hg);
  cyl(0.004, 0.042, dark, 0, -0.03, -0.02, 'x', 6, hg);

  // ---- barrel, front sight and suppressor: slim, low poly, with a knurled index band at the thread collar ----
  cyl(0.009, 0.20, gun, 0, B, 0.20, 'z', 10);
  box(0.018, 0.008, 0.012, gun, 0, B + 0.024, 0.235);
  box(0.003, 0.014, 0.004, gun, -0.006, B + 0.034, 0.235);
  box(0.003, 0.014, 0.004, gun, 0.006, B + 0.034, 0.235);
  box(0.002, 0.008, 0.002, worn, 0, B + 0.032, 0.235);
  cyl(0.012, 0.016, worn, 0, B, 0.255, 'z', 10);                         // barrel collar
  box(0.006, 0.006, 0.008, gun, 0, B - 0.014, 0.255);                    // front sling loop under the collar
  const fsl = ring(0.006, 0.0015, gun, 0, B - 0.021, 0.255, null, 5, 8); fsl.rotation.y = Math.PI / 2;
  const sup = new THREE.Group(); sup.position.set(0, B, 0.365); g.add(sup);
  const SR = 0.017;                                                       // 34 mm on a 48 mm handguard, as in the concept
  cyl(SR, 0.20, gunS, 0, 0, 0.005, 'z', 12, sup);                        // body
  cyl(0.0135, 0.010, worn, 0, 0, -0.098, 'z', 10, sup);                  // thread collar between the barrel collar and the band
  cyl(0.0145, 0.0015, dark, 0, 0, -0.100, 'z', 10, sup);                 // two thread rings
  cyl(0.0145, 0.0015, dark, 0, 0, -0.096, 'z', 10, sup);
  cyl(SR + 0.002, 0.022, gunD, 0, 0, -0.082, 'z', 12, sup);              // knurled index band at the collar
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const k = box(0.0025, 0.0025, 0.022, worn, Math.sin(a) * (SR + 0.002), Math.cos(a) * (SR + 0.002), -0.082, sup); k.rotation.z = -a; }
  box(0.0035, 0.002, 0.010, worn, 0, SR + 0.0005, -0.064, sup);          // index mark forward of the band
  cyl(SR + 0.0005, 0.006, worn, 0, 0, 0.102, 'z', 12, sup);              // worn front rim
  cyl(0.013, 0.006, gunD, 0, 0, 0.106, 'z', 12, sup);                    // end cap step
  cyl(0.0065, 0.004, dark, 0, 0, 0.108, 'z', 8, sup);                    // bore
  box(0.003, 0.012, 0.012, worn, SR, 0, 0.080, sup);                     // wrench flats at the front, bare metal
  box(0.003, 0.012, 0.012, worn, -SR, 0, 0.080, sup);
  box(0.010, 0.002, 0.15, dust, 0, SR - 0.0005, 0.01, sup);              // dust along the top
  box(0.0035, 0.005, 0.05, rustM, SR - 0.001, -0.006, -0.045, sup);      // rust run from the band
  box(0.0035, 0.005, 0.035, rustM, -SR + 0.001, -0.006, -0.052, sup);

  // ---- grip: metal core, rubber slabs with diamond ridges, safety, guard, screwed panels ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.025, -0.02); g.add(grip);
  box(0.03, 0.098, 0.048, gunD, 0, -0.049, 0, grip);
  box(0.038, 0.01, 0.054, worn, 0, -0.005, 0, grip);                     // worn top collar
  box(0.036, 0.066, 0.052, rubber, 0, -0.05, 0, grip);                   // rubber wrap
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
    const a = box(0.002, 0.003, 0.05, rubberL, sx * 0.0185, -0.024 - i * 0.01, 0, grip); a.rotation.x = 0.7;
    const b = box(0.002, 0.003, 0.05, rubberL, sx * 0.0185, -0.024 - i * 0.01, 0, grip); b.rotation.x = -0.7;
  }
  // pass 2: three 7 mm slotted screws per side through the grip panels, 20 mm rust runs below each
  for (const sx of [-1, 1]) {
    screw(sx, sx * 0.0185, -0.028, -0.016, grip, 0.007, 0.020, 0.3);
    screw(sx, sx * 0.0185, -0.028, 0.017, grip, 0.007, 0.020, -0.6);
    screw(sx, sx * 0.0185, -0.070, 0.0, grip, 0.007, 0.018, 1.1);
  }
  for (const sx of [-1, 1]) { rivet(sx, sx * 0.019, -0.004, -0.017, grip, gunD); rivet(sx, sx * 0.019, -0.004, 0.017, grip, gunD); }   // the grip frame stamping is riveted to the collar
  box(0.02, 0.02, 0.01, worn, 0, -0.026, -0.03, grip);                   // grip safety
  box(0.034, 0.006, 0.05, gun, 0, -0.1, 0, grip);                        // heel
  cyl(0.004, 0.036, dark, 0, -0.09, 0.0, 'x', 6, grip);                  // heel pin
  box(0.006, 0.014, 0.014, worn, -0.019, -0.091, -0.014, grip);          // mag release paddle, left heel, 6 mm proud
  box(0.004, 0.004, 0.06, gun, -0.016, -0.056, 0.058, grip);             // guard
  box(0.004, 0.004, 0.06, gun, 0.016, -0.056, 0.058, grip);
  box(0.036, 0.004, 0.006, gun, 0, -0.056, 0.086, grip);
  box(0.036, 0.03, 0.004, gun, 0, -0.04, 0.086, grip);
  const trig = box(0.006, 0.02, 0.004, worn, 0, -0.034, 0.042, grip); trig.rotation.x = 0.2;

  // ---- magazine with witness slots ----
  const mag = new THREE.Group(); mag.name = 'socket_mag'; mag.position.set(0, B + 0.028, -0.02); g.add(mag);   // the group IS the socket so the reload moves the geometry
  box(0.026, 0.22, 0.04, gun, 0, -0.11, 0, mag);
  for (let i = 0; i < 3; i++) box(0.028, 0.003, 0.042, worn, 0, -0.15 - i * 0.025, 0, mag);
  box(0.002, 0.07, 0.006, dark, -0.0135, -0.172, 0.008, mag);
  box(0.002, 0.07, 0.006, dark, 0.0135, -0.172, 0.008, mag);
  box(0.03, 0.008, 0.044, rubber, 0, -0.216, 0, mag);

  // ---- skeleton stock folded on the right: two rods, a diamond cross brace, a real hinge ----
  const st = new THREE.Group(); st.position.set(0.033, B - 0.005, -0.15); g.add(st);
  // pass 2: the hinge is a vertical pivot knuckle with a bolt head on top and a nut below, joined to the
  // rear cap by a leaf, and a separate latch plate forward of it with its own cross bolt and thumb lever
  cyl(0.009, 0.050, gun, 0, 0, 0, 'y', 8, st);                           // pivot knuckle
  cyl(0.0065, 0.004, worn, 0, 0.027, 0, 'y', 6, st);                     // hex bolt head on top
  cyl(0.0035, 0.003, dark, 0, 0.0305, 0, 'y', 6, st);
  cyl(0.0065, 0.004, worn, 0, -0.027, 0, 'y', 6, st);                    // nut below
  box(0.002, 0.020, 0.005, rustM, 0.0085, 0.012, 0.0, st);               // rust run down the knuckle from the bolt
  box(0.002, 0.014, 0.005, rustM, 0.0085, -0.020, 0.0, st);
  box(0.016, 0.040, 0.012, gun, -0.010, 0, 0, st);                       // hinge leaf into the rear cap
  box(0.006, 0.030, 0.026, worn, 0.005, -0.005, 0.030, st);              // latch plate, forward of the knuckle
  cyl(0.0045, 0.006, gun, 0.010, 0.002, 0.030, 'x', 8, st);              // its cross bolt head
  box(0.0018, 0.012, 0.0035, rustM, 0.0085, -0.011, 0.030, st);
  const lever = box(0.004, 0.006, 0.020, dark, 0.010, -0.017, 0.040, st); lever.rotation.x = 0.35;   // thumb lever
  cyl(0.005, 0.17, gunS, 0, 0.018, 0.095, 'z', 8, st);                   // upper rod
  cyl(0.005, 0.17, gunS, 0, -0.028, 0.095, 'z', 8, st);                  // lower rod
  const b1 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.075, st); b1.rotation.x = 0.75;   // diamond brace
  const b2 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.075, st); b2.rotation.x = -0.75;
  const b3 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.135, st); b3.rotation.x = 0.75;
  const b4 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.135, st); b4.rotation.x = -0.75;
  box(0.014, 0.05, 0.028, rubber, 0, -0.005, 0.186, st);                 // folded buttplate
  box(0.016, 0.003, 0.03, worn, 0, 0.021, 0.186, st);
  cyl(0.0050, 0.052, gunD, 0, -0.005, 0.172, 'y', 8, st);                // buttplate hinge
  cyl(0.0030, 0.056, worn, 0, -0.005, 0.172, 'y', 6, st);

  // ---- sockets ----
  const sock = (name, x, y, z, parent) => { const o = new THREE.Object3D(); o.name = 'socket_' + name; o.position.set(x, y, z); (parent || g).add(o); return o; };
  g.userData.sockets = {
    muzzle: sock('muzzle', 0, 0, 0.106, sup),
    gripR: sock('gripR', 0, 0, 0, grip),
    gripL: sock('gripL', 0, -0.04, -0.02, hg),
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
