// smg candidate 2: a different part breakdown read off the reference. Open reflex
// sight instead of a tube, handguard ribs as stacked rings, stock as two round
// rods with a diamond cross brace, receiver in a top cover with a raised centre
// rib and a lower frame with stamped panels, suppressor with a knurled band.
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
  const gunD = M(0x33363a, 'metal', 0.58, 0.65);
  const worn = M(0x5c5f63, 'metal', 0.50, 0.70);
  const rustM = M(0x6b4426, 'metal', 0.75, 0.3);
  const dust = M(0x6b654f, 'metal', 0.65, 0.3);
  const rubber = M(0x1d1e20, null, 0.70, 0.05);
  const rubberL = M(0x2a2b2e, null, 0.68, 0.05);
  const glass = M(0x27363a, null, 0.45, 0.2, true);
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
  const ring = (r, t, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 12), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
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
    box(0.003, 0.003, 0.20, worn, sx * 0.0235, 0.012, 0, rc);            // cover crease
    box(0.003, 0.003, 0.20, worn, sx * 0.0235, 0.024, 0, rc);
    cyl(0.004, 0.005, dark, sx * 0.0235, -0.02, -0.11, 'x', 8, rc);
    cyl(0.004, 0.005, dark, sx * 0.0235, -0.02, 0.10, 'x', 8, rc);
    box(0.003, 0.004, 0.008, rustM, sx * 0.0235, -0.028, -0.11, rc);     // rust below the pins
  }
  box(0.003, 0.014, 0.05, dark, 0.024, 0.014, 0.01, rc);                 // ejection port right
  box(0.004, 0.02, 0.02, worn, 0.024, -0.01, -0.02, rc);                 // right side catch plate
  box(0.004, 0.01, 0.014, gun, 0.025, 0.0, 0.11, rc);                    // right lug
  box(0.002, 0.004, 0.12, dark, -0.022, 0.02, 0.01, rc);                 // charging slot left
  box(0.018, 0.012, 0.024, gun, -0.03, 0.02, -0.03, rc);
  cyl(0.009, 0.012, rubber, -0.035, 0.02, -0.03, 'x', 8, rc);            // charging knob left
  box(0.042, 0.052, 0.014, gunD, 0, 0.004, -0.137, rc);                  // rear cap
  box(0.02, 0.006, 0.02, gun, 0, 0.035, -0.125, rc);                     // rear sight block
  box(0.004, 0.012, 0.004, gun, -0.008, 0.043, -0.125, rc);
  box(0.004, 0.012, 0.004, gun, 0.008, 0.043, -0.125, rc);
  ring(0.008, 0.002, gun, 0, -0.02, -0.146, rc);                         // lanyard loop

  // ---- top rail and an open reflex sight with a hooded window ----
  box(0.022, 0.01, 0.22, gun, 0, B + 0.037, -0.04);
  for (let i = 0; i < 10; i++) box(0.024, 0.004, 0.006, dark, 0, B + 0.042, -0.13 + i * 0.02);
  const rd = new THREE.Group(); rd.position.set(0, B + 0.042, -0.07); g.add(rd);
  box(0.026, 0.012, 0.06, gun, 0, 0.006, 0, rd);                         // base
  box(0.026, 0.003, 0.06, dust, 0, 0.0135, 0, rd);
  box(0.004, 0.02, 0.004, gunS, -0.012, 0.022, 0.024, rd);              // hood posts
  box(0.004, 0.02, 0.004, gunS, 0.012, 0.022, 0.024, rd);
  box(0.028, 0.004, 0.004, gunS, 0, 0.033, 0.024, rd);                    // hood top
  const win = box(0.02, 0.018, 0.0015, glass, 0, 0.022, 0.024, rd); win.rotation.x = -0.15;
  box(0.014, 0.008, 0.02, gunD, 0, 0.016, -0.01, rd);                    // emitter housing
  box(0.006, 0.006, 0.006, worn, 0.016, 0.006, -0.02, rd);               // adjustment screw
  cyl(0.004, 0.03, dark, 0, 0.004, 0.0, 'x', 6, rd);                     // clamp bolt

  // ---- handguard: core with stacked rib rings, screw plates, hand stop ----
  const hg = new THREE.Group(); hg.position.set(0, B, 0.16); g.add(hg);
  cyl(0.02, 0.12, gunD, 0, 0, 0, 'z', 12, hg);
  for (let i = 0; i < 11; i++) ring(0.021, 0.0025, i % 4 === 0 ? worn : gun, 0, 0, -0.05 + i * 0.01, hg);
  cyl(0.024, 0.008, gunS, 0, 0, 0.062, 'z', 12, hg);                     // front collar
  cyl(0.024, 0.008, gunS, 0, 0, -0.06, 'z', 12, hg);                     // rear collar
  box(0.006, 0.014, 0.02, dark, 0.022, 0.0, -0.045, hg);                 // screw plates
  box(0.006, 0.014, 0.02, dark, -0.022, 0.0, -0.045, hg);
  box(0.03, 0.028, 0.02, gunD, 0, -0.034, -0.02, hg);                    // hand stop
  box(0.032, 0.008, 0.026, rubber, 0, -0.05, -0.018, hg);
  cyl(0.004, 0.042, dark, 0, -0.03, -0.02, 'x', 6, hg);

  // ---- barrel, front sight and suppressor with a knurled band ----
  cyl(0.009, 0.20, gun, 0, B, 0.20, 'z', 10);
  box(0.018, 0.008, 0.012, gun, 0, B + 0.024, 0.235);
  box(0.003, 0.014, 0.004, gun, -0.006, B + 0.034, 0.235);
  box(0.003, 0.014, 0.004, gun, 0.006, B + 0.034, 0.235);
  box(0.002, 0.008, 0.002, worn, 0, B + 0.032, 0.235);
  cyl(0.012, 0.016, worn, 0, B, 0.255, 'z', 10);
  const sup = new THREE.Group(); sup.position.set(0, B, 0.365); g.add(sup);
  cyl(0.02, 0.21, gunS, 0, 0, 0, 'z', 12, sup);
  cyl(0.0215, 0.024, gunD, 0, 0, -0.09, 'z', 12, sup);                   // knurled mount band
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const k = box(0.002, 0.002, 0.024, worn, Math.sin(a) * 0.0215, Math.cos(a) * 0.0215, -0.09, sup); k.rotation.z = -a; }
  cyl(0.0215, 0.006, worn, 0, 0, 0.1, 'z', 12, sup);                     // worn front rim
  cyl(0.016, 0.006, gunD, 0, 0, 0.104, 'z', 12, sup);                    // end cap step
  cyl(0.008, 0.004, dark, 0, 0, 0.106, 'z', 8, sup);                     // bore
  box(0.012, 0.003, 0.16, dust, 0, 0.0195, 0.01, sup);                     // dust along the top
  box(0.004, 0.006, 0.06, rustM, 0.019, -0.006, -0.05, sup);             // rust run from the band
  box(0.004, 0.006, 0.04, rustM, -0.019, -0.006, -0.06, sup);

  // ---- grip: metal core, rubber slabs with diamond ridges, safety, guard ----
  const grip = new THREE.Group(); grip.position.set(0, B - 0.025, -0.02); g.add(grip);
  box(0.03, 0.098, 0.048, gunD, 0, -0.049, 0, grip);
  box(0.038, 0.01, 0.054, worn, 0, -0.005, 0, grip);                     // worn top collar
  box(0.036, 0.066, 0.052, rubber, 0, -0.05, 0, grip);                   // rubber wrap
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
    const a = box(0.002, 0.003, 0.05, rubberL, sx * 0.0185, -0.024 - i * 0.01, 0, grip); a.rotation.x = 0.7;
    const b = box(0.002, 0.003, 0.05, rubberL, sx * 0.0185, -0.024 - i * 0.01, 0, grip); b.rotation.x = -0.7;
  }
  box(0.02, 0.02, 0.01, worn, 0, -0.026, -0.03, grip);                   // grip safety
  box(0.034, 0.006, 0.05, gun, 0, -0.1, 0, grip);                        // heel
  cyl(0.004, 0.036, dark, 0, -0.09, 0.0, 'x', 6, grip);                  // heel pin
  box(0.004, 0.004, 0.06, gun, -0.016, -0.056, 0.058, grip);             // guard
  box(0.004, 0.004, 0.06, gun, 0.016, -0.056, 0.058, grip);
  box(0.036, 0.004, 0.006, gun, 0, -0.056, 0.086, grip);
  box(0.036, 0.03, 0.004, gun, 0, -0.04, 0.086, grip);
  const trig = box(0.006, 0.02, 0.004, worn, 0, -0.034, 0.042, grip); trig.rotation.x = 0.2;

  // ---- magazine with witness slots ----
  const mag = new THREE.Group(); mag.position.set(0, B + 0.028, -0.02); g.add(mag);
  box(0.026, 0.22, 0.04, gun, 0, -0.11, 0, mag);
  for (let i = 0; i < 3; i++) box(0.028, 0.003, 0.042, worn, 0, -0.15 - i * 0.025, 0, mag);
  box(0.002, 0.07, 0.006, dark, -0.0135, -0.172, 0.008, mag);
  box(0.002, 0.07, 0.006, dark, 0.0135, -0.172, 0.008, mag);
  box(0.03, 0.008, 0.044, rubber, 0, -0.216, 0, mag);

  // ---- skeleton stock folded on the right: two rods, a diamond cross brace ----
  const st = new THREE.Group(); st.position.set(0.033, B - 0.005, -0.15); g.add(st);
  cyl(0.012, 0.022, gun, 0, 0, 0, 'x', 10, st);                          // hinge barrel
  cyl(0.005, 0.03, rustM, 0, 0, 0, 'x', 8, st);
  box(0.004, 0.006, 0.02, rustM, 0, -0.012, 0.0, st);                    // rust drip under the hinge
  cyl(0.005, 0.17, gunS, 0, 0.018, 0.095, 'z', 8, st);                   // upper rod
  cyl(0.005, 0.17, gunS, 0, -0.028, 0.095, 'z', 8, st);                  // lower rod
  box(0.01, 0.046, 0.012, gunS, 0, -0.005, 0.02, st);                    // web at the hinge
  const b1 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.075, st); b1.rotation.x = 0.75;   // diamond brace
  const b2 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.075, st); b2.rotation.x = -0.75;
  const b3 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.135, st); b3.rotation.x = 0.75;
  const b4 = box(0.008, 0.006, 0.065, gunS, 0, -0.005, 0.135, st); b4.rotation.x = -0.75;
  box(0.014, 0.05, 0.028, rubber, 0, -0.005, 0.186, st);                 // folded buttplate
  box(0.016, 0.003, 0.03, worn, 0, 0.021, 0.186, st);
  box(0.004, 0.008, 0.016, worn, 0.008, -0.028, 0.05, st);               // release catch

  // ---- sockets ----
  const sock = (name, x, y, z, parent) => { const o = new THREE.Object3D(); o.name = 'socket_' + name; o.position.set(x, y, z); (parent || g).add(o); return o; };
  g.userData.sockets = {
    muzzle: sock('muzzle', 0, 0, 0.106, sup),
    gripR: sock('gripR', 0, 0, 0, grip),
    gripL: sock('gripL', 0, -0.04, -0.02, hg),
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
