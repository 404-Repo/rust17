// assault_rifle, round 2 rebuild for the viewmodel (player fix agent).
//
// Round 1 built the geometry (A2 front sight, T charging handle, curved magazine, quad
// rail, hooded holo, crane stock) but the critic still read "a navy voxel block with a
// cube red dot": the receiver was near black (0x3a3e45 at metalness 0.50, so the diffuse
// albedo was 0.02 and every face that the sun did not hit with a specular lobe rendered
// as zero), the polymer was black on black, and the wear lines were 2 mm of dark grey.
// Measured in the round 2 frames: top faces median luma 0, front faces 0, only the sun
// side face read at all.
//
// This one is built so the FORM reads under the rig's fill light and its two colour
// temperatures:
//  * Two tone finish. Receiver, barrel, rails and magazine in worn parkerised steel: a mid
//    grey (steel dark 0x4f5257 from the style lock, lifted 3 to 8 percent per part) at
//    metalness 0.30 so the sky fill shows on the shade side; the bare barrel and every
//    recess in gunmetal 0x3a3d40. Furniture (stock, grip, foregrip, rail covers) in flat
//    dark earth polymer, militia khaki 0x7a6a4c, the desert issue furniture that makes an
//    M4 read as one at a glance and separates the parts tonally from the receiver.
//  * Edge wear you can see at frame scale: bare aluminium (galvanised 0x9ea3a1 toned down)
//    3 mm crest strips along the top rails, the handguard corners, the magwell lip, the
//    charging handle, the hood of the optic; the sun catches these first.
//  * Iron sights: A2 front sight tower and a folded flip up rear aperture behind the optic.
//  * The optic is a hooded holo with a see through window, a raised mount with a thumb nut,
//    a battery cap and a wear lip, not a closed cube.
// No dust caps (a held rifle is wiped by the hands). Muzzle at +Z, barrel axis at y = B.
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
  // parkerised steel, mid grey, three tones (plain, sun side, north side); metalness 0.18
  // keeps a real diffuse term so the shade side reads under the sky fill. Deliberately
  // UNNAMED: surfaces.js classifies a low saturation mid grey as `stone`, which is the matte
  // phosphate grain a parkerised finish has, without the metal recipe's roughness floor of
  // 0.24 (the flats became a mirror of the dark zenith, navy blotches that read as camouflage)
  // and without its rust patches on aluminium; and the round 2 weathering block below skips
  // unnamed materials, so a held rifle does not get the ground relative stain band and rust
  // foot meant for plant standing in sand.
  const steel = M(0x6e7378, null, 0.62, 0.18);
  const steelS = M(0x777c80, null, 0.60, 0.18);        // sun side, bleached
  const steelD = M(0x60646a, null, 0.64, 0.18);        // north side and undersides
  const gunmetal = M(0x3a3d40, 'metal', 0.55, 0.45);   // bare barrel, gas tube, pins
  const recess = M(0x34373a, 'metal', 0.65, 0.25, { side: THREE.DoubleSide });   // slots, vents, the bore
  const worn = M(0x929698, 'metal', 0.46, 0.45);       // finish rubbed through to bare aluminium: every handled edge
  const bright = M(0x9ea3a1, 'metal', 0.42, 0.55);     // contact wear: barrel step, bolt, latch, the top rail crest
  // flat dark earth polymer furniture, militia khaki, lighter on every handled edge
  const fde = M(0x7a6a4c, 'fabric', 0.72, 0.02);
  const fdeL = M(0x857552, 'fabric', 0.70, 0.02);      // handled edges, sun side
  const fdeD = M(0x66583e, 'fabric', 0.76, 0.02);      // ribs, recesses, undersides
  const rubber = M(0x222325, null, 0.80, 0.02);        // buttpad, rail cover ribs: near black, unnamed on purpose
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
  // a bare metal strip along an edge: the wear the sun catches
  const edge = (w, h, d, x, y, z, parent, mat) => box(w, h, d, mat || worn, x, y, z, parent);
  const B = 0.20;   // barrel axis height before normalisation

  // ---- upper receiver: flat top rail, ejection port with open dust cover, deflector, forward assist ----
  const upper = new THREE.Group(); upper.position.set(0, B + 0.004, -0.095); g.add(upper);
  box(0.040, 0.034, 0.25, steel, 0, 0, 0, upper);
  box(0.041, 0.006, 0.25, steelS, 0, 0.015, 0, upper);               // sun catches the shoulder
  box(0.040, 0.006, 0.25, steelD, 0, -0.015, 0, upper);              // underside darker
  edge(0.0415, 0.0025, 0.25, 0, 0.0175, 0, upper);                   // worn shoulder line, both sides
  edge(0.0025, 0.034, 0.25, -0.0205, 0, 0, upper, steelD);           // left flank edge, cool
  box(0.024, 0.012, 0.25, steel, 0, 0.023, 0, upper);                // top rail
  edge(0.027, 0.003, 0.25, 0, 0.030, 0, upper, bright);              // rail crest worn bright: the sun's line
  for (let i = 0; i < 12; i++) box(0.028, 0.006, 0.008, recess, 0, 0.0275, -0.115 + i * 0.02, upper);
  box(0.003, 0.018, 0.058, recess, 0.0205, -0.002, 0.03, upper);     // ejection port
  const cover = box(0.002, 0.020, 0.060, worn, 0.0225, -0.013, 0.03, upper); cover.rotation.z = 0.9; // dust cover hanging open
  box(0.008, 0.022, 0.018, steelS, 0.023, 0.0, -0.01, upper);        // brass deflector
  cyl(0.008, 0.024, steel, 0.024, 0.0, -0.035, 'z', 8, upper);       // forward assist
  cyl(0.0045, 0.006, bright, 0.024, 0.0, -0.05, 'z', 8, upper);
  box(0.006, 0.030, 0.018, steelD, -0.022, -0.002, 0.075, upper);    // left side boss
  // finish rubbed off the left flank where the sling and the plate carrier ride: two bare patches
  box(0.0015, 0.016, 0.070, worn, -0.0205, 0.004, 0.02, upper);
  box(0.0015, 0.010, 0.040, worn, -0.0205, -0.008, -0.085, upper);
  // T charging handle, rear of the upper, wings wide enough to read over the stock
  const ch = new THREE.Group(); ch.position.set(0, 0.011, -0.128); upper.add(ch);
  box(0.018, 0.009, 0.05, steel, 0, 0, 0, ch);
  box(0.054, 0.007, 0.014, steel, 0, 0, -0.024, ch);                 // T wings
  edge(0.056, 0.0025, 0.016, 0, 0.0045, -0.024, ch, bright);         // worn top of the T
  box(0.014, 0.011, 0.016, bright, -0.030, 0, -0.024, ch);           // latch, left, thumb polished
  box(0.004, 0.006, 0.030, recess, -0.011, 0.002, -0.006, ch);       // latch slot
  // folded flip up rear sight, on the rail behind the optic
  const buis = new THREE.Group(); buis.position.set(0, 0.030, -0.085); upper.add(buis);
  box(0.024, 0.008, 0.024, steel, 0, 0.004, 0, buis);                // base
  box(0.020, 0.005, 0.020, steelD, 0, 0.0105, 0, buis);              // folded leaf lying flat
  edge(0.022, 0.002, 0.021, 0, 0.0135, 0, buis, worn);
  cyl(0.004, 0.026, worn, 0, 0.0035, -0.010, 'x', 6, buis);          // hinge pin
  cyl(0.0055, 0.004, worn, 0.013, 0.004, 0.004, 'x', 8, buis);       // windage drum, right

  // ---- lower receiver, magwell, pins, selector, bolt catch, mag release, trigger ----
  const lower = new THREE.Group(); lower.position.set(0, B - 0.034, -0.12); g.add(lower);
  box(0.038, 0.036, 0.20, steel, 0, 0, 0, lower);
  box(0.039, 0.005, 0.20, steelS, 0, 0.0155, 0, lower);
  box(0.044, 0.052, 0.070, steelD, 0, -0.030, 0.058, lower);         // magwell
  edge(0.046, 0.003, 0.072, 0, -0.0565, 0.058, lower);               // worn magwell lip
  edge(0.046, 0.054, 0.003, 0, -0.030, 0.0935, lower);               // worn front edge of the magwell
  edge(0.003, 0.054, 0.070, -0.0225, -0.030, 0.058, lower, steel);   // magwell left face, mid tone
  box(0.0015, 0.030, 0.050, worn, -0.0235, -0.032, 0.058, lower);     // bare patch, the magwell is grabbed every reload
  box(0.0015, 0.020, 0.060, worn, -0.0195, -0.004, -0.040, lower);    // left flank of the lower, worn by the sling
  cyl(0.004, 0.044, gunmetal, 0, -0.008, -0.08, 'x', 6, lower);      // takedown pin
  cyl(0.004, 0.044, gunmetal, 0, -0.008, 0.07, 'x', 6, lower);       // pivot pin
  cyl(0.0055, 0.004, worn, -0.021, -0.008, -0.08, 'x', 8, lower);
  cyl(0.0055, 0.004, worn, -0.021, -0.008, 0.07, 'x', 8, lower);
  box(0.016, 0.005, 0.024, worn, -0.024, 0.006, -0.045, lower);      // selector, left
  cyl(0.006, 0.006, gunmetal, -0.022, 0.006, -0.045, 'x', 8, lower);
  box(0.006, 0.010, 0.010, steel, 0.022, -0.004, 0.090, lower);      // mag release, right
  box(0.004, 0.014, 0.022, worn, 0.022, -0.004, 0.074, lower);       // mag release fence
  box(0.012, 0.016, 0.018, steel, -0.024, -0.002, 0.088, lower);     // bolt catch, left
  box(0.036, 0.003, 0.20, recess, 0, 0.018, 0, lower);               // upper/lower seam
  // trigger guard and trigger
  box(0.004, 0.004, 0.062, steel, -0.019, -0.048, 0.02, lower);
  box(0.004, 0.004, 0.062, steel, 0.019, -0.048, 0.02, lower);
  box(0.042, 0.004, 0.006, steel, 0, -0.048, 0.05, lower);
  box(0.042, 0.004, 0.006, steel, 0, -0.048, -0.01, lower);
  edge(0.042, 0.005, 0.004, 0, -0.049, 0.02, lower);                 // guard bottom rib
  const trig = box(0.006, 0.026, 0.004, bright, 0, -0.030, 0.015, lower); trig.rotation.x = 0.25;

  // ---- hooded holo sight on a raised mount, real window, ring reticle behind the pane ----
  const sight = new THREE.Group(); sight.position.set(0, B + 0.036, -0.125); g.add(sight);
  box(0.040, 0.010, 0.090, steelD, 0, 0.005, 0, sight);               // mount
  box(0.046, 0.010, 0.092, steel, 0, 0.014, 0, sight);                // base
  edge(0.047, 0.0025, 0.092, 0, 0.0195, 0, sight);                    // base top edge
  box(0.006, 0.030, 0.062, steelS, -0.023, 0.036, 0.0, sight);        // hood sides, thin
  box(0.006, 0.030, 0.062, steelS, 0.023, 0.036, 0.0, sight);
  edge(0.007, 0.030, 0.003, -0.023, 0.036, 0.032, sight);             // hood front edges worn
  edge(0.007, 0.030, 0.003, 0.023, 0.036, 0.032, sight);
  box(0.052, 0.005, 0.062, steel, 0, 0.053, 0.0, sight);              // hood top
  edge(0.053, 0.0025, 0.064, 0, 0.0565, 0, sight, bright);            // hood crest worn bright
  edge(0.053, 0.003, 0.004, 0, 0.052, 0.033, sight, bright);          // hood front lip
  box(0.040, 0.030, 0.0015, glass, 0, 0.036, 0.030, sight);           // the window, see through
  box(0.044, 0.003, 0.062, recess, 0, 0.020, 0, sight);               // window sill
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.0006, 5, 22), reticle);
  ring.position.set(0, 0.036, 0.020); sight.add(ring);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 6, 4), reticle);
  dot.position.set(0, 0.036, 0.020); sight.add(dot);
  box(0.012, 0.006, 0.025, rubber, -0.027, 0.016, 0.030, sight);      // side buttons
  box(0.012, 0.006, 0.025, rubber, 0.027, 0.016, 0.030, sight);
  box(0.026, 0.014, 0.012, steelD, 0, 0.012, -0.050, sight);          // battery compartment
  cyl(0.0075, 0.006, worn, 0, 0.012, -0.058, 'z', 8, sight);          // knurled cap
  cyl(0.0045, 0.050, gunmetal, 0, 0.004, 0.0, 'x', 6, sight);         // mount cross bolt
  cyl(0.0085, 0.008, worn, 0.028, 0.004, 0, 'x', 8, sight);           // thumb nut, right
  box(0.030, 0.006, 0.012, worn, 0.030, 0.008, -0.030, sight);        // mount lever, right
  const sightSock = new THREE.Object3D(); sightSock.name = 'socket_sight'; sightSock.position.set(0, 0.036, 0.030); sight.add(sightSock);

  // ---- delta ring and quad rail handguard with recessed vents and khaki rail covers ----
  cyl(0.030, 0.020, steel, 0, B, 0.040, 'z', 12);                     // delta ring
  cyl(0.031, 0.006, worn, 0, B, 0.032, 'z', 12);
  const hg = new THREE.Group(); hg.position.set(0, B, 0.19); g.add(hg);
  box(0.046, 0.046, 0.28, steelD, 0, 0, 0, hg);                        // body
  box(0.024, 0.010, 0.28, steel, 0, 0.028, 0, hg);                     // top rail
  edge(0.027, 0.003, 0.28, 0, 0.0345, 0, hg, bright);                  // top rail crest, worn bright
  box(0.024, 0.010, 0.28, steel, 0, -0.028, 0, hg);                    // bottom rail
  box(0.010, 0.024, 0.28, steel, -0.028, 0, 0, hg);                    // left rail
  box(0.010, 0.024, 0.28, steelS, 0.028, 0, 0, hg);                    // right rail (sun side)
  edge(0.0025, 0.026, 0.28, 0.0335, 0, 0, hg);                         // right rail crest
  edge(0.0025, 0.026, 0.28, -0.0335, 0, 0, hg);                        // left rail crest
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) edge(0.004, 0.004, 0.28, sx * 0.022, sy * 0.022, 0, hg);   // corner wear lines
  for (let i = 0; i < 13; i++) {
    const z = -0.12 + i * 0.02;
    box(0.028, 0.006, 0.008, recess, 0, 0.032, z, hg);
    box(0.028, 0.006, 0.008, recess, 0, -0.032, z, hg);
    box(0.006, 0.028, 0.008, recess, -0.032, 0, z, hg);
    box(0.006, 0.028, 0.008, recess, 0.032, 0, z, hg);
  }
  for (let i = 0; i < 7; i++) {                                        // vents: dark discs proud of the face, in rows between the rails
    const z = -0.10 + i * 0.03;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      cyl(0.0065, 0.003, recess, sx * 0.0235, sy * 0.017, z, 'x', 8, hg);
      cyl(0.0065, 0.003, recess, sx * 0.017, sy * 0.0235, z, 'y', 8, hg);
    }
  }
  box(0.048, 0.048, 0.010, worn, 0, 0, 0.142, hg);                     // worn front cap
  box(0.048, 0.048, 0.008, steel, 0, 0, -0.140, hg);
  // khaki ladder rail covers, left side and underside: the second tone on the handguard
  box(0.008, 0.026, 0.12, fde, -0.035, 0, -0.02, hg);
  for (let i = 0; i < 6; i++) box(0.003, 0.028, 0.006, fdeD, -0.039, 0, -0.07 + i * 0.02, hg);
  edge(0.002, 0.027, 0.12, -0.0395, 0, -0.02, hg, fdeL);
  box(0.026, 0.008, 0.12, fde, 0, -0.035, -0.02, hg);
  for (let i = 0; i < 6; i++) box(0.028, 0.003, 0.006, fdeD, 0, -0.039, -0.07 + i * 0.02, hg);

  // ---- barrel, gas tube, A2 front sight tower with ears and post, sling swivel ----
  cyl(0.011, 0.44, gunmetal, 0, B, 0.23, 'z', 10);
  cyl(0.0095, 0.05, bright, 0, B, 0.395, 'z', 10);                     // barrel step, wear bright
  cyl(0.004, 0.32, gunmetal, 0, B + 0.021, 0.20, 'z', 6);              // gas tube
  const fsb = new THREE.Group(); fsb.position.set(0, B, 0.352); g.add(fsb);
  const tower = cyl(0.004, 0.046, steel, 0, 0.035, 0, 'y', 4, fsb, 0.017); tower.rotation.y = Math.PI / 4; tower.scale.x = 0.75;
  box(0.022, 0.014, 0.034, steelS, 0, 0.008, 0, fsb);                  // base collar over the barrel
  box(0.022, 0.014, 0.034, steelD, 0, -0.008, 0, fsb);
  cyl(0.0035, 0.026, gunmetal, 0, 0.0, 0, 'x', 6, fsb);                // taper pins
  box(0.005, 0.024, 0.007, steel, -0.0095, 0.066, 0, fsb);             // ears
  box(0.005, 0.024, 0.007, steel, 0.0095, 0.066, 0, fsb);
  edge(0.005, 0.002, 0.007, -0.0095, 0.079, 0, fsb, bright);           // ear tips worn
  edge(0.005, 0.002, 0.007, 0.0095, 0.079, 0, fsb, bright);
  box(0.024, 0.003, 0.008, worn, 0, 0.058, 0, fsb);                    // shelf, worn
  cyl(0.0018, 0.020, gunmetal, 0, 0.066, 0, 'y', 6, fsb);              // the post
  box(0.010, 0.012, 0.018, steel, 0, -0.019, -0.006, fsb);             // bayonet lug
  const swivel = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 6, 12), worn);
  swivel.position.set(0, -0.030, -0.004); swivel.rotation.y = Math.PI / 2; fsb.add(swivel);
  const bc = new THREE.Group(); bc.position.set(0, B, 0.428); g.add(bc);
  cyl(0.0135, 0.008, gunmetal, 0, 0, -0.018, 'z', 10, bc);             // rear ring
  cyl(0.0135, 0.008, gunmetal, 0, 0, 0.018, 'z', 10, bc);              // front ring
  cyl(0.006, 0.044, recess, 0, 0, 0, 'z', 8, bc);                      // bore tube
  for (let i = 0; i < 6; i++) {                                        // prongs, closed at the bottom
    const a = i * Math.PI / 3 + Math.PI / 6;
    const p = box(0.005, 0.005, 0.030, steel, Math.sin(a) * 0.012, Math.cos(a) * 0.012, 0, bc);
    p.rotation.z = -a;
  }
  box(0.020, 0.004, 0.030, gunmetal, 0, -0.012, 0, bc);
  cyl(0.015, 0.006, worn, 0, 0, -0.024, 'z', 10, bc);                  // crush washer

  // ---- buffer tube and crane stock, khaki polymer with worn edges ----
  cyl(0.016, 0.20, steelD, 0, B + 0.005, -0.32, 'z', 10);
  box(0.040, 0.012, 0.020, steel, 0, B + 0.018, -0.225);               // castle nut and end plate
  cyl(0.0185, 0.006, worn, 0, B + 0.005, -0.228, 'z', 10);
  for (let i = 0; i < 5; i++) box(0.006, 0.006, 0.006, recess, 0, B - 0.012, -0.39 + i * 0.03);
  const st = new THREE.Group(); st.position.set(0, B - 0.01, -0.36); g.add(st);
  box(0.052, 0.050, 0.13, fde, 0, 0.0, 0, st);                         // body
  box(0.054, 0.004, 0.132, fdeL, 0, 0.026, 0, st);                     // handled top edge
  box(0.004, 0.052, 0.132, fdeL, 0.026, 0, 0, st);                     // right edge, sun side
  box(0.054, 0.004, 0.132, fdeD, 0, -0.026, 0, st);                    // underside darker
  cyl(0.014, 0.12, fdeD, -0.020, -0.006, 0, 'z', 10, st);              // battery tubes
  cyl(0.014, 0.12, fdeD, 0.020, -0.006, 0, 'z', 10, st);
  cyl(0.0145, 0.004, fdeL, -0.020, -0.006, 0.058, 'z', 10, st);        // tube caps
  cyl(0.0145, 0.004, fdeL, 0.020, -0.006, 0.058, 'z', 10, st);
  box(0.030, 0.020, 0.13, fde, 0, 0.030, 0, st);                       // cheek
  box(0.032, 0.003, 0.13, fdeL, 0, 0.0415, 0, st);
  for (let i = 0; i < 3; i++) box(0.031, 0.002, 0.13, fdeD, 0, 0.022 + i * 0.006, 0, st);   // cheek grooves
  box(0.020, 0.014, 0.050, rubber, 0, -0.038, 0.02, st);               // release lever
  cyl(0.004, 0.056, gunmetal, 0, 0.015, -0.04, 'x', 6, st);            // sling pin
  box(0.055, 0.110, 0.028, rubber, 0, -0.005, -0.075, st);             // buttpad
  for (let i = 0; i < 4; i++) box(0.057, 0.005, 0.006, fdeD, 0, -0.045 + i * 0.026, -0.086, st);
  box(0.057, 0.112, 0.004, fdeL, 0, -0.005, -0.060, st);
  const sling = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 10), steel);
  sling.position.set(0.035, B - 0.03, -0.30); sling.rotation.y = Math.PI / 2; g.add(sling);
  box(0.014, 0.012, 0.012, steel, 0.029, B - 0.03, -0.30);

  // ---- pistol grip, khaki polymer, finger ridges, worn back strap ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.052, -0.165); grip.rotation.x = 0.35; g.add(grip);
  box(0.030, 0.118, 0.036, fde, 0, -0.059, 0, grip);
  box(0.034, 0.020, 0.040, fde, 0, -0.010, 0.006, grip);               // beavertail
  box(0.031, 0.118, 0.004, fdeL, 0, -0.059, -0.0185, grip);            // back strap, worn by the palm
  for (let i = 0; i < 3; i++) box(0.032, 0.004, 0.038, fdeD, 0, -0.040 - i * 0.025, 0, grip);
  box(0.034, 0.006, 0.040, fdeD, 0, -0.116, 0, grip);                  // base plate

  // ---- curved steel magazine with ribs, witness slot, tape band ----
  // the magazine group IS the mag socket: the reload animation moves this node, so the
  // magazine geometry has to hang under it (a sibling empty would move nothing)
  const mag = new THREE.Group(); mag.name = 'socket_mag'; mag.position.set(0, B - 0.004, -0.062); mag.rotation.x = -0.10; g.add(mag);
  box(0.025, 0.090, 0.062, steelD, 0, -0.045, 0, mag);
  box(0.026, 0.003, 0.064, worn, 0, -0.030, 0, mag);                   // ribs
  box(0.026, 0.003, 0.064, worn, 0, -0.060, 0, mag);
  box(0.003, 0.090, 0.063, steelS, 0.0125, -0.045, 0, mag);            // sun side face
  edge(0.026, 0.090, 0.003, 0, -0.045, 0.0315, mag);                   // front edge, worn by the pouch
  edge(0.026, 0.090, 0.003, 0, -0.045, -0.0315, mag);                  // rear edge
  const lowerMag = new THREE.Group(); lowerMag.position.set(0, -0.09, 0); lowerMag.rotation.x = -0.16; mag.add(lowerMag);
  box(0.025, 0.100, 0.062, steelD, 0, -0.050, 0, lowerMag);
  box(0.031, 0.034, 0.068, tape, 0, -0.024, 0, lowerMag);              // tape band
  box(0.033, 0.006, 0.070, tapeD, 0, -0.010, 0, lowerMag);
  box(0.033, 0.004, 0.070, tapeD, 0, -0.040, 0, lowerMag);
  box(0.026, 0.003, 0.064, worn, 0, -0.062, 0, lowerMag);
  box(0.026, 0.003, 0.064, worn, 0, -0.085, 0, lowerMag);
  edge(0.026, 0.100, 0.003, 0, -0.050, 0.0315, lowerMag);
  edge(0.026, 0.100, 0.003, 0, -0.050, -0.0315, lowerMag);
  box(0.029, 0.008, 0.066, fdeD, 0, -0.104, 0, lowerMag);              // polymer floor plate
  box(0.030, 0.003, 0.067, worn, 0, -0.100, 0, lowerMag);
  box(0.002, 0.070, 0.008, recess, -0.013, -0.055, 0.015, lowerMag);   // witness slot, left

  // ---- vertical foregrip, khaki polymer, ribbed, with hand stop ----
  const fg = new THREE.Group(); fg.position.set(0, B - 0.034, 0.16); g.add(fg);
  box(0.036, 0.010, 0.042, steel, 0, -0.005, 0, fg);                   // rail clamp
  edge(0.037, 0.0025, 0.043, 0, -0.011, 0, fg);
  cyl(0.016, 0.090, fde, 0, -0.055, 0, 'y', 10, fg);
  for (let i = 0; i < 4; i++) cyl(0.017, 0.004, fdeD, 0, -0.030 - i * 0.018, 0, 'y', 10, fg);
  cyl(0.014, 0.008, fdeL, 0, -0.102, 0, 'y', 10, fg);
  box(0.038, 0.008, 0.010, steel, 0, -0.006, 0.060, fg);               // hand stop ahead of the grip

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
