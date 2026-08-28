// frag_grenade candidate 0: primitives. Flattened sphere body, torus seam with
// rust, cylinder fuze, safety lever as a chain of short plates following the
// body, pull ring as a torus on a pin, yellow marking plate. Lever faces +Z.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (name) mat.name = name;
    return mat;
  };
  const olive = M(0x4e5238, 'metal', 0.70, 0.2);       // painted steel body
  const oliveS = M(0x565a3e, 'metal', 0.70, 0.2);      // sun side, lighter
  const oliveD = M(0x474b33, 'metal', 0.72, 0.2);      // lower half, stained
  const gun = M(0x3a3d40, 'metal', 0.55, 0.65);
  const worn = M(0x5c5f63, 'metal', 0.50, 0.70);
  const rustM = M(0x6b4426, 'metal', 0.80, 0.3);
  const yellow = M(0xc9a227, 'metal', 0.70, 0.1);
  const dust = M(0x6b654f, 'metal', 0.70, 0.2);

  const R = 0.0325;
  const cy = 0.03;   // body centre height before the contract loop
  // body: two hemispheres so the top is sun bleached and the bottom stained
  const top = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), oliveS);
  top.scale.set(1, 0.92, 1); top.position.y = cy; g.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), oliveD);
  bot.scale.set(1, 0.92, 1); bot.position.y = cy; g.add(bot);
  // equator seam, scuffed to gunmetal, with rust bleeding below it
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0005, 0.0018, 6, 16), worn);
  seam.rotation.x = Math.PI / 2; seam.position.y = cy; g.add(seam);
  const rustBand = new THREE.Mesh(new THREE.TorusGeometry(R - 0.0006, 0.0014, 5, 16), rustM);
  rustBand.rotation.x = Math.PI / 2; rustBand.position.y = cy - 0.0035; g.add(rustBand);
  // paint chips: small flat plates on the surface
  const chips = [[0.4, 0.2], [1.3, -0.3], [2.4, 0.5], [3.6, -0.6], [4.6, 0.1], [5.5, -0.4], [0.9, 0.9], [3.0, 1.0]];
  for (const [a, el] of chips) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.0006), gun);
    const r = R * 0.92;
    p.position.set(Math.cos(a) * Math.cos(el) * R, cy + Math.sin(el) * r, Math.sin(a) * Math.cos(el) * R);
    p.lookAt(0, cy, 0); g.add(p);
  }
  // marking plate, safety yellow, on the +Z face
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.009, 0.001), yellow);
  plate.position.set(0.008, cy + 0.006, R * 0.985); plate.lookAt(0.016, cy + 0.012, R * 3); g.add(plate);
  // dust on the crown
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.0015, 12), dust);
  cap.position.y = cy + R * 0.92 - 0.0015; g.add(cap);

  // fuze assembly: threaded collar, gunmetal cylinder 0.02 tall, cap
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.005, 10), rustM);
  collar.position.y = cy + R * 0.92 - 0.001; g.add(collar);
  const fz = new THREE.Group(); fz.position.y = cy + R * 0.92 + 0.002; g.add(fz);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.010, 0.026, 10), gun); body.position.y = 0.013; fz.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.016), gun); head.position.set(0, 0.032, -0.002); fz.add(head);
  const headTop = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.002, 0.017), worn); headTop.position.set(0, 0.039, -0.002); fz.add(headTop);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.024, 8), worn); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 0.034, 0.008); fz.add(hinge);
  const pinBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 6), worn); pinBoss.rotation.z = Math.PI / 2; pinBoss.position.set(0.006, 0.028, -0.006); fz.add(pinBoss);

  // safety lever: 0.05 long, curved down the +Z side of the body, as a chain of plates
  const lever = new THREE.Group(); lever.position.set(0, 0.034, 0.009); fz.add(lever);
  const segs = 7;
  let link = lever;
  for (let i = 0; i < segs; i++) {
    const s = new THREE.Group();
    s.position.set(0, i === 0 ? 0 : -0.0085, 0);
    s.rotation.x = i === 0 ? -1.0 : 0.2;
    link.add(s);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0095, 0.0015), i < 2 ? gun : worn);
    pl.position.set(0, -0.0045, 0); s.add(pl);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0095, 0.003), gun); lip.position.set(-0.0055, -0.0045, -0.001); s.add(lip);
    const lip2 = lip.clone(); lip2.position.x = 0.0055; s.add(lip2);
    link = s;
  }

  // pull ring 0.02 diameter on a pin at the right side
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0015, 6, 14), worn);
  ring.position.set(0.022, cy + R * 0.92 + 0.036, -0.004); ring.rotation.y = Math.PI / 2 + 0.3; g.add(ring);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.012, 6), worn);
  pin.rotation.z = Math.PI / 2; pin.position.set(0.015, cy + R * 0.92 + 0.03, -0.006); g.add(pin);
  const rustDrip = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.0008), rustM);
  rustDrip.position.set(0.0, cy + R * 0.92 - 0.008, R * 0.9); rustDrip.lookAt(0, cy + R * 0.92 - 0.008, R * 3); g.add(rustDrip);

  // ---- round 4 detail pass ----
  const bright = M(0x8e9294, 'metal', 0.45, 0.70);     // the seam scuffed to bare steel on the sun side
  // hex fuze collar over the threaded collar, the M67's wrench flats
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.004, 6), gun);
  hex.position.y = cy + R * 0.92 + 0.0035; g.add(hex);
  const hexTop = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0008, 6), worn);
  hexTop.position.y = cy + R * 0.92 + 0.0059; g.add(hexTop);
  // yellow marking ring at the crown edge of the body
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.0162, 0.0012, 5, 16), yellow);
  band.rotation.x = Math.PI / 2; band.position.y = cy + (R * 0.92 - 0.004); g.add(band);
  // the seam scuffed bright along the sun side arc
  const scuff = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0009, 0.0011, 5, 12, Math.PI * 0.8), bright);
  scuff.rotation.x = Math.PI / 2; scuff.rotation.z = -0.3; scuff.position.y = cy + 0.0004; g.add(scuff);
  // cotter pin legs spread on the far side of the fuze head
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0012, 0.0012), worn);
    leg.position.set(-0.0155, cy + R * 0.92 + 0.03 + s * 0.0015, -0.006); leg.rotation.z = s * 0.28; g.add(leg);
  }
  // confidence clip: a wire U over the lever just below the head
  const clip = new THREE.Mesh(new THREE.TorusGeometry(0.0068, 0.0008, 5, 8, Math.PI), worn);
  clip.rotation.x = Math.PI / 2; clip.position.set(0, cy + R * 0.92 + 0.022, 0.0115); fz.parent && g.add(clip);
  const clipPin = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.016, 6), worn);
  clipPin.rotation.z = Math.PI / 2; clipPin.position.set(0, cy + R * 0.92 + 0.022, 0.0095); g.add(clipPin);
  // the spoon tip curls out at the end of the lever
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.0015), worn);
  lip.position.set(0, -0.0098, 0.0012); lip.rotation.x = 0.8; link.add(lip);
  // rust run under the pull pin hole on the fuze head
  const pinRust = new THREE.Mesh(new THREE.BoxGeometry(0.0008, 0.008, 0.003), rustM);
  pinRust.position.set(0.0115, cy + R * 0.92 + 0.024, -0.006); g.add(pinRust);

  // ---- contract: base at y=0, centred on x and z ----
  const WEATHER_OPTS = { held: 1 };   // round 4: a grenade is carried, not planted. Without this the rust foot (floored at 0.4 m) covered the whole 0.11 m body and it rendered brown, not olive.
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
