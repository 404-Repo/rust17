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
  const gun = M(0x3a3e45, 'metal', 0.48, 0.50);     // round 1: metalness 0.65 -> 0.50, the shade side went black with only the environment to reflect
  const gunS = M(0x43474e, 'metal', 0.47, 0.50);
  const gunD = M(0x33373d, 'metal', 0.52, 0.50);
  const worn = M(0x62656a, 'metal', 0.45, 0.55);
  const dust = M(0x42464b, 'metal', 0.52, 0.50);   // round 1: was a tan dust cap; a held weapon is wiped clean, so the up faces are just lighter gunmetal
  const rustM = M(0x6b4426, 'metal', 0.75, 0.3);
  const rubber = M(0x1d1e20, null, 0.70, 0.05);
  const rubberL = M(0x27282b, null, 0.68, 0.05);
  const olive = M(0x4e5238, 'fabric', 0.70, 0.1);
  const oliveS = M(0x585c40, 'fabric', 0.70, 0.1);
  const cloth = M(0xb0a07c, 'fabric', 0.85, 0.0);
  const clothD = M(0xa09270, 'fabric', 0.85, 0.0);
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });   // see through: ADS looks THROUGH the optic
  const reticle = new THREE.MeshStandardMaterial({ color: 0x3a0e08, roughness: 0.6, metalness: 0.0, emissive: 0xff4a30, emissiveIntensity: 2.2 });
  const dark = M(0x2a2c2f, 'metal', 0.60, 0.6, true);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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
