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
  const gun = M(0x6e7378, null, 0.62, 0.18);     // round 2: mid grey parkerised steel at metalness 0.18, the assault rifle's finish, so the shade side reads under the sky fill (0x3a3e45 at 0.50 rendered black off the sun). Unnamed on purpose: see assault_rifle.js, classify() gives it the matte stone grain and the weathering block leaves a held weapon alone
  const gunS = M(0x777c80, null, 0.60, 0.18);
  const gunD = M(0x60646a, null, 0.64, 0.18);
  const worn = M(0x929698, 'metal', 0.46, 0.45);    // finish rubbed through to bare metal
  const rustM = M(0x6b4426, 'metal', 0.75, 0.3);
  const dust = M(0x80858a, null, 0.58, 0.18);   // up faces: lighter, bleached steel (a held weapon is wiped clean, no tan cap)
  const rubber = M(0x2a2c2e, null, 0.74, 0.03);
  const rubberL = M(0x3d4043, null, 0.70, 0.03);
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });   // see through: ADS looks THROUGH the optic
  const reticle = new THREE.MeshStandardMaterial({ color: 0x3a0e08, roughness: 0.6, metalness: 0.0, emissive: 0xff4a30, emissiveIntensity: 2.2 });
  const dark = M(0x34373a, 'metal', 0.65, 0.25, true);

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
  const win = box(0.026, 0.022, 0.0015, glass, 0, 0.022, 0.024, rd); win.rotation.x = -0.15;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 6, 4), reticle); dot.position.set(0, 0.022, 0.016); rd.add(dot);   // the red dot, behind the window
  const sightSock = new THREE.Object3D(); sightSock.name = 'socket_sight'; sightSock.position.set(0, 0.022, 0.024); rd.add(sightSock);
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
  const mag = new THREE.Group(); mag.name = 'socket_mag'; mag.position.set(0, B + 0.028, -0.02); g.add(mag);   // the group IS the socket so the reload moves the geometry
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
