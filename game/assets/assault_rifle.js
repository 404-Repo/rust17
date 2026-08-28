// assault_rifle, round 1 rebuild for the viewmodel. The first version read as a stack of
// tan and olive blocks: dust caps on every up face (the camera looks DOWN on a held rifle,
// so the caps were most of what it showed), a boxed optic with an opaque pane, no front
// sight, a stub charging handle. This one is built for the silhouette a shooter reads at
// a glance: A2 style front sight tower on the barrel, T charging handle at the rear of the
// upper, curved polymer magazine, quad rail with recessed vents, hooded holo sight with a
// see through window and a red ring reticle behind it, crane stock, birdcage hider.
// Materials: blued steel (dark, cool, low roughness so the sun draws a highlight down the
// barrel) and worn polymer (near black, lighter along every handled edge). No dust caps: a
// rifle in the hands is wiped clean by the hands. Muzzle at +Z, barrel axis at y = B.
// Sockets: muzzle, gripR, gripL, mag, sight (centre of the optic window, on the sight line).
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, extra) => {
    // extras go through the constructor (setValues): assigning a hex NUMBER over the
    // emissive Color object with Object.assign leaves a number where a Color is expected
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m, ...(extra || {}) });
    if (name) mat.name = name;
    return mat;
  };
  // blued steel: cool dark grey, three tones (sun side, plain, north side) and a worn edge
  // metalness held at 0.5: at 0.7 the shade side of the receiver had nothing but the
  // environment to reflect and went black in the frame; the sun still draws the highlight
  const blued = M(0x3a3e45, 'metal', 0.48, 0.50);
  const bluedS = M(0x43474e, 'metal', 0.47, 0.50);
  const bluedD = M(0x33373d, 'metal', 0.52, 0.50);
  const worn = M(0x62656a, 'metal', 0.45, 0.55);
  const bright = M(0x74777b, 'metal', 0.45, 0.60);   // contact wear: barrel step, bolt, handle tip
  const dark = M(0x26292c, 'metal', 0.60, 0.40, { side: THREE.DoubleSide });   // slots, vents, recesses
  // worn polymer: unnamed near black is left untextured by surfaces.js on purpose
  const poly = M(0x2e3034, null, 0.72, 0.03);
  const polyL = M(0x45484d, null, 0.68, 0.03);       // handled edges, lighter
  const polyD = M(0x26282b, null, 0.75, 0.03);
  const rubber = M(0x222325, null, 0.78, 0.03);
  const tape = M(0xb0a07c, 'fabric', 0.85, 0.0);
  const tapeD = M(0xa09270, 'fabric', 0.85, 0.0);
  // the window: matte and nearly clear, so a muzzle flash cannot light it into an opaque glow
  const glass = M(0x2a3a44, null, 0.95, 0.0, { transparent: true, opacity: 0.14, depthWrite: false });
  const reticle = M(0x3a0e08, null, 0.6, 0.0, { emissive: 0xff4a30, emissiveIntensity: 2.2 });

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const cyl = (r, len, mat, x, y, z, axis, seg, parent, r2) => {
    const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 === undefined ? r : r2, len, seg || 10), mat);
    if (axis === 'z') mm.rotation.x = Math.PI / 2; else if (axis === 'x') mm.rotation.z = Math.PI / 2;
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };
  const B = 0.20;   // barrel axis height before normalisation

  // ---- upper receiver: flat top rail, ejection port with open dust cover, deflector, forward assist ----
  const upper = new THREE.Group(); upper.position.set(0, B + 0.004, -0.095); g.add(upper);
  box(0.040, 0.034, 0.25, blued, 0, 0, 0, upper);
  box(0.041, 0.006, 0.25, bluedS, 0, 0.015, 0, upper);               // sun catches the shoulder
  box(0.040, 0.006, 0.25, bluedD, 0, -0.015, 0, upper);              // underside darker
  box(0.024, 0.012, 0.25, blued, 0, 0.023, 0, upper);                // top rail
  box(0.026, 0.002, 0.25, worn, 0, 0.0295, 0, upper);                // rail crest worn bright
  for (let i = 0; i < 12; i++) box(0.027, 0.005, 0.007, dark, 0, 0.027, -0.115 + i * 0.02, upper);
  box(0.003, 0.018, 0.058, dark, 0.0205, -0.002, 0.03, upper);       // ejection port
  const cover = box(0.002, 0.020, 0.060, worn, 0.0225, -0.013, 0.03, upper); cover.rotation.z = 0.9; // dust cover hanging open
  box(0.008, 0.022, 0.018, bluedS, 0.023, 0.0, -0.01, upper);        // brass deflector
  cyl(0.008, 0.024, blued, 0.024, 0.0, -0.035, 'z', 8, upper);       // forward assist
  cyl(0.0045, 0.006, bright, 0.024, 0.0, -0.05, 'z', 8, upper);
  box(0.006, 0.030, 0.018, bluedD, -0.022, -0.002, 0.075, upper);    // left side boss
  // T charging handle, rear of the upper, wings wide enough to read over the stock
  const ch = new THREE.Group(); ch.position.set(0, 0.011, -0.128); upper.add(ch);
  box(0.018, 0.009, 0.05, blued, 0, 0, 0, ch);
  box(0.054, 0.007, 0.014, blued, 0, 0, -0.024, ch);                 // T wings
  box(0.056, 0.002, 0.016, worn, 0, 0.0045, -0.024, ch);             // worn top of the T
  box(0.014, 0.011, 0.016, bright, -0.030, 0, -0.024, ch);           // latch, left, thumb polished
  box(0.004, 0.006, 0.030, dark, -0.011, 0.002, -0.006, ch);         // latch slot

  // ---- lower receiver, magwell, pins, selector, bolt catch, mag release, trigger ----
  const lower = new THREE.Group(); lower.position.set(0, B - 0.034, -0.12); g.add(lower);
  box(0.038, 0.036, 0.20, blued, 0, 0, 0, lower);
  box(0.039, 0.005, 0.20, bluedS, 0, 0.0155, 0, lower);
  box(0.044, 0.052, 0.070, bluedD, 0, -0.030, 0.058, lower);         // magwell
  box(0.046, 0.003, 0.072, worn, 0, -0.0565, 0.058, lower);          // worn magwell lip
  box(0.046, 0.054, 0.003, worn, 0, -0.030, 0.0935, lower);          // worn front edge of the magwell
  cyl(0.004, 0.044, dark, 0, -0.008, -0.08, 'x', 6, lower);          // takedown pin
  cyl(0.004, 0.044, dark, 0, -0.008, 0.07, 'x', 6, lower);           // pivot pin
  cyl(0.0055, 0.004, worn, -0.021, -0.008, -0.08, 'x', 8, lower);
  cyl(0.0055, 0.004, worn, -0.021, -0.008, 0.07, 'x', 8, lower);
  box(0.016, 0.005, 0.024, worn, -0.024, 0.006, -0.045, lower);      // selector, left
  cyl(0.006, 0.006, dark, -0.022, 0.006, -0.045, 'x', 8, lower);
  box(0.006, 0.010, 0.010, blued, 0.022, -0.004, 0.090, lower);      // mag release, right
  box(0.004, 0.014, 0.022, worn, 0.022, -0.004, 0.074, lower);       // mag release fence
  box(0.012, 0.016, 0.018, blued, -0.024, -0.002, 0.088, lower);     // bolt catch, left
  box(0.036, 0.003, 0.20, dark, 0, 0.018, 0, lower);                 // upper/lower seam
  // trigger guard and trigger
  box(0.004, 0.004, 0.062, blued, -0.019, -0.048, 0.02, lower);
  box(0.004, 0.004, 0.062, blued, 0.019, -0.048, 0.02, lower);
  box(0.042, 0.004, 0.006, blued, 0, -0.048, 0.05, lower);
  box(0.042, 0.004, 0.006, blued, 0, -0.048, -0.01, lower);
  box(0.042, 0.005, 0.004, worn, 0, -0.049, 0.02, lower);            // guard bottom rib
  const trig = box(0.006, 0.026, 0.004, bright, 0, -0.030, 0.015, lower); trig.rotation.x = 0.25;

  // ---- hooded holo sight with a real window, ring reticle behind the pane ----
  const sight = new THREE.Group(); sight.position.set(0, B + 0.036, -0.15); g.add(sight);
  box(0.046, 0.016, 0.095, blued, 0, 0.008, 0, sight);                // base
  box(0.047, 0.003, 0.095, bluedS, 0, 0.0165, 0, sight);
  box(0.004, 0.034, 0.064, bluedS, -0.024, 0.035, 0.0, sight);        // hood sides, thin
  box(0.004, 0.034, 0.064, bluedS, 0.024, 0.035, 0.0, sight);
  box(0.052, 0.004, 0.064, blued, 0, 0.054, 0.0, sight);              // hood top
  box(0.053, 0.002, 0.066, worn, 0, 0.0565, 0, sight);                // hood crest worn
  box(0.044, 0.032, 0.0015, glass, 0, 0.035, 0.030, sight);           // the window, see through
  box(0.044, 0.003, 0.064, dark, 0, 0.0175, 0, sight);                // window sill
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.0006, 5, 22), reticle);
  ring.position.set(0, 0.035, 0.020); sight.add(ring);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 6, 4), reticle);
  dot.position.set(0, 0.035, 0.020); sight.add(dot);
  box(0.012, 0.005, 0.025, rubber, -0.027, 0.013, 0.036, sight);      // side buttons
  box(0.012, 0.005, 0.025, rubber, 0.027, 0.013, 0.036, sight);
  box(0.024, 0.012, 0.010, dark, 0, 0.008, -0.052, sight);            // battery cap
  cyl(0.0045, 0.052, dark, 0, 0.0, 0, 'x', 6, sight);                 // mount cross bolt
  box(0.030, 0.006, 0.012, worn, 0.030, 0.0, 0, sight);               // mount lever, right
  const sightSock = new THREE.Object3D(); sightSock.name = 'socket_sight'; sightSock.position.set(0, 0.035, 0.030); sight.add(sightSock);

  // ---- delta ring and quad rail handguard with recessed vents ----
  cyl(0.030, 0.020, blued, 0, B, 0.040, 'z', 12);                     // delta ring
  cyl(0.031, 0.006, worn, 0, B, 0.032, 'z', 12);
  const hg = new THREE.Group(); hg.position.set(0, B, 0.19); g.add(hg);
  box(0.046, 0.046, 0.28, bluedD, 0, 0, 0, hg);                        // body
  box(0.024, 0.010, 0.28, blued, 0, 0.028, 0, hg);                     // top rail
  box(0.026, 0.002, 0.28, worn, 0, 0.0335, 0, hg);                     // top rail crest, worn
  box(0.024, 0.010, 0.28, blued, 0, -0.028, 0, hg);                    // bottom rail
  box(0.010, 0.024, 0.28, blued, -0.028, 0, 0, hg);                    // left rail
  box(0.010, 0.024, 0.28, bluedS, 0.028, 0, 0, hg);                    // right rail (sun side)
  box(0.002, 0.026, 0.28, worn, 0.0335, 0, 0, hg);                     // right rail crest
  for (let i = 0; i < 13; i++) {
    const z = -0.12 + i * 0.02;
    box(0.026, 0.005, 0.007, dark, 0, 0.032, z, hg);
    box(0.026, 0.005, 0.007, dark, 0, -0.032, z, hg);
    box(0.005, 0.026, 0.007, dark, -0.032, 0, z, hg);
    box(0.005, 0.026, 0.007, dark, 0.032, 0, z, hg);
  }
  for (let i = 0; i < 7; i++) {                                        // vents: dark discs proud of the face, in rows between the rails
    const z = -0.10 + i * 0.03;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      cyl(0.0065, 0.003, dark, sx * 0.0235, sy * 0.017, z, 'x', 8, hg);
      cyl(0.0065, 0.003, dark, sx * 0.017, sy * 0.0235, z, 'y', 8, hg);
    }
  }
  box(0.048, 0.048, 0.010, worn, 0, 0, 0.142, hg);                     // worn front cap
  box(0.048, 0.048, 0.008, blued, 0, 0, -0.140, hg);
  box(0.006, 0.020, 0.10, poly, -0.032, 0, -0.03, hg);                 // rail cover panel, left
  for (let i = 0; i < 4; i++) box(0.007, 0.002, 0.10, polyL, -0.032, -0.008 + i * 0.005, -0.03, hg);

  // ---- barrel, gas tube, A2 front sight tower with ears and post, sling swivel ----
  cyl(0.011, 0.44, blued, 0, B, 0.23, 'z', 10);
  cyl(0.0095, 0.05, bright, 0, B, 0.395, 'z', 10);                     // barrel step, wear bright
  cyl(0.004, 0.32, bluedD, 0, B + 0.021, 0.20, 'z', 6);                // gas tube
  const fsb = new THREE.Group(); fsb.position.set(0, B, 0.352); g.add(fsb);
  const tower = cyl(0.004, 0.046, blued, 0, 0.035, 0, 'y', 4, fsb, 0.017); tower.rotation.y = Math.PI / 4; tower.scale.x = 0.75;
  box(0.022, 0.014, 0.034, bluedS, 0, 0.008, 0, fsb);                  // base collar over the barrel
  box(0.022, 0.014, 0.034, bluedD, 0, -0.008, 0, fsb);
  cyl(0.0035, 0.026, dark, 0, 0.0, 0, 'x', 6, fsb);                    // taper pins
  box(0.004, 0.022, 0.006, blued, -0.009, 0.066, 0, fsb);              // ears
  box(0.004, 0.022, 0.006, blued, 0.009, 0.066, 0, fsb);
  box(0.022, 0.003, 0.007, worn, 0, 0.058, 0, fsb);                    // shelf, worn
  cyl(0.0015, 0.018, bluedD, 0, 0.066, 0, 'y', 6, fsb);                // the post
  box(0.010, 0.012, 0.018, blued, 0, -0.019, -0.006, fsb);             // bayonet lug
  const swivel = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 6, 12), worn);
  swivel.position.set(0, -0.030, -0.004); swivel.rotation.y = Math.PI / 2; fsb.add(swivel);
  const bc = new THREE.Group(); bc.position.set(0, B, 0.428); g.add(bc);
  cyl(0.0135, 0.008, blued, 0, 0, -0.018, 'z', 10, bc);                // rear ring
  cyl(0.0135, 0.008, blued, 0, 0, 0.018, 'z', 10, bc);                 // front ring
  cyl(0.006, 0.044, dark, 0, 0, 0, 'z', 8, bc);                        // bore tube
  for (let i = 0; i < 6; i++) {                                        // prongs, closed at the bottom
    const a = i * Math.PI / 3 + Math.PI / 6;
    const p = box(0.005, 0.005, 0.030, bluedS, Math.sin(a) * 0.012, Math.cos(a) * 0.012, 0, bc);
    p.rotation.z = -a;
  }
  box(0.020, 0.004, 0.030, blued, 0, -0.012, 0, bc);
  cyl(0.015, 0.006, worn, 0, 0, -0.024, 'z', 10, bc);                  // crush washer

  // ---- buffer tube and crane stock, polymer with worn edges ----
  cyl(0.016, 0.20, bluedD, 0, B + 0.005, -0.32, 'z', 10);
  box(0.040, 0.012, 0.020, blued, 0, B + 0.018, -0.225);               // castle nut and end plate
  cyl(0.0185, 0.006, worn, 0, B + 0.005, -0.228, 'z', 10);
  for (let i = 0; i < 5; i++) box(0.006, 0.006, 0.006, dark, 0, B - 0.012, -0.39 + i * 0.03);
  const st = new THREE.Group(); st.position.set(0, B - 0.01, -0.36); g.add(st);
  box(0.052, 0.050, 0.13, poly, 0, 0.0, 0, st);                        // body
  box(0.054, 0.003, 0.132, polyL, 0, 0.0265, 0, st);                   // handled top edge
  box(0.003, 0.052, 0.132, polyL, 0.0265, 0, 0, st);                   // right edge
  cyl(0.014, 0.12, polyD, -0.020, -0.006, 0, 'z', 10, st);              // battery tubes
  cyl(0.014, 0.12, polyD, 0.020, -0.006, 0, 'z', 10, st);
  cyl(0.0145, 0.004, polyL, -0.020, -0.006, 0.058, 'z', 10, st);        // tube caps
  cyl(0.0145, 0.004, polyL, 0.020, -0.006, 0.058, 'z', 10, st);
  box(0.030, 0.020, 0.13, poly, 0, 0.030, 0, st);                       // cheek
  box(0.032, 0.002, 0.13, polyL, 0, 0.041, 0, st);
  box(0.020, 0.014, 0.050, rubber, 0, -0.038, 0.02, st);                // release lever
  cyl(0.004, 0.056, dark, 0, 0.015, -0.04, 'x', 6, st);                 // sling pin
  box(0.055, 0.110, 0.028, rubber, 0, -0.005, -0.075, st);              // buttpad
  for (let i = 0; i < 4; i++) box(0.057, 0.005, 0.006, polyL, 0, -0.045 + i * 0.026, -0.086, st);
  box(0.057, 0.112, 0.004, polyL, 0, -0.005, -0.060, st);
  const sling = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 10), blued);
  sling.position.set(0.035, B - 0.03, -0.30); sling.rotation.y = Math.PI / 2; g.add(sling);
  box(0.014, 0.012, 0.012, blued, 0.029, B - 0.03, -0.30);

  // ---- pistol grip, polymer, finger ridges, worn back strap ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.052, -0.165); grip.rotation.x = 0.35; g.add(grip);
  box(0.030, 0.118, 0.036, poly, 0, -0.059, 0, grip);
  box(0.034, 0.020, 0.040, poly, 0, -0.010, 0.006, grip);               // beavertail
  box(0.031, 0.118, 0.003, polyL, 0, -0.059, -0.0185, grip);            // back strap, worn by the palm
  for (let i = 0; i < 3; i++) box(0.032, 0.004, 0.038, polyD, 0, -0.040 - i * 0.025, 0, grip);
  box(0.034, 0.006, 0.040, polyL, 0, -0.116, 0, grip);                  // base plate

  // ---- curved polymer magazine with ribs, witness slot, tape band ----
  // the magazine group IS the mag socket: the reload animation moves this node, so the
  // magazine geometry has to hang under it (a sibling empty would move nothing)
  const mag = new THREE.Group(); mag.name = 'socket_mag'; mag.position.set(0, B - 0.004, -0.062); mag.rotation.x = -0.10; g.add(mag);
  box(0.025, 0.090, 0.062, poly, 0, -0.045, 0, mag);
  box(0.026, 0.003, 0.064, polyL, 0, -0.030, 0, mag);                   // ribs
  box(0.026, 0.003, 0.064, polyL, 0, -0.060, 0, mag);
  box(0.003, 0.090, 0.063, polyL, 0.0125, -0.045, 0, mag);              // sun side edge
  const lowerMag = new THREE.Group(); lowerMag.position.set(0, -0.09, 0); lowerMag.rotation.x = -0.16; mag.add(lowerMag);
  box(0.025, 0.100, 0.062, poly, 0, -0.050, 0, lowerMag);
  box(0.031, 0.034, 0.068, tape, 0, -0.024, 0, lowerMag);               // tape band
  box(0.033, 0.006, 0.070, tapeD, 0, -0.010, 0, lowerMag);
  box(0.033, 0.004, 0.070, tapeD, 0, -0.040, 0, lowerMag);
  box(0.026, 0.003, 0.064, polyL, 0, -0.062, 0, lowerMag);
  box(0.026, 0.003, 0.064, polyL, 0, -0.085, 0, lowerMag);
  box(0.029, 0.008, 0.066, polyD, 0, -0.104, 0, lowerMag);              // floor plate
  box(0.030, 0.003, 0.067, polyL, 0, -0.100, 0, lowerMag);
  box(0.002, 0.070, 0.008, dark, -0.013, -0.055, 0.015, lowerMag);      // witness slot, left

  // ---- vertical foregrip, polymer, ribbed, with hand stop ----
  const fg = new THREE.Group(); fg.position.set(0, B - 0.034, 0.16); g.add(fg);
  box(0.036, 0.010, 0.042, blued, 0, -0.005, 0, fg);                    // rail clamp
  cyl(0.016, 0.090, poly, 0, -0.055, 0, 'y', 10, fg);
  for (let i = 0; i < 4; i++) cyl(0.017, 0.004, polyL, 0, -0.030 - i * 0.018, 0, 'y', 10, fg);
  cyl(0.014, 0.008, polyL, 0, -0.102, 0, 'y', 10, fg);
  box(0.038, 0.008, 0.010, blued, 0, -0.006, 0.060, fg);                // hand stop ahead of the grip

  // ---- sockets ----
  const sock = (name, x, y, z, parent) => { const o = new THREE.Object3D(); o.name = 'socket_' + name; o.position.set(x, y, z); (parent || g).add(o); return o; };
  g.userData.sockets = {
    muzzle: sock('muzzle', 0, 0, 0.022, bc),
    gripR: sock('gripR', 0, 0, 0, grip),
    gripL: sock('gripL', 0, -0.05, 0, fg),
    mag: mag,
    sight: sightSock,
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
