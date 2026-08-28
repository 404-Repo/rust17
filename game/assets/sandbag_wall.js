// sandbag_wall candidate 1: pillow bags. Each bag is a subdivided box pulled into a rounded
// pillow by a superellipse map on its vertices, all courses stretchers in running bond,
// two rows deep, ends stepped one bag per course, steel pickets, sand fillet.
export default function (THREE) {
  const g = new THREE.Group();
  const C = { sandS: 0xcdb88e, rust: 0x6b4426, steel: 0x4f5257, bag: 0xb0a07c };
  const tint = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, roughness = 0.9, metalness = 0.05, side) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, side: side || THREE.FrontSide });
    if (name) m.name = name; return m;
  };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const drip = (len, w, m, x, y, z, ry, parent) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w * 0.15, -len); s.lineTo(-w * 0.15, -len); s.closePath();
    const o = add(new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false }), m, x, y, z, parent); o.rotation.y = ry; return o;
  };
  let seed = 5; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  // pillow geometry: box 0.5 x 0.2 x 0.3, corners pulled in by an L4 norm, bottom flattened
  const pillow = (w, h, d) => {
    const geo = new THREE.BoxGeometry(w, h, d, 6, 3, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), vv = p.getY(i) / (h / 2), ww = p.getZ(i) / (d / 2);
      const n = Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(vv), 4) + Math.pow(Math.abs(ww), 4), 0.25) || 1;
      const k = 1 / Math.max(n, 0.85);
      let y = vv * k * (h / 2);
      if (y < -h * 0.42) y = -h * 0.42;            // sits flat on the course below
      p.setXYZ(i, u * k * (w / 2), y, ww * k * (d / 2));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const bagGeo = pillow(0.5, 0.2, 0.3);
  const halfGeo = pillow(0.26, 0.2, 0.3);

  const front = [0.98, 1.02, 1.06, 1.09].map((f) => mat(tint(C.bag, f), 'fabric', 0.95, 0));
  const back = [0.93, 0.96, 1.0, 1.03].map((f) => mat(tint(C.bag, f), 'fabric', 0.95, 0));
  const low = [0.72, 0.78].map((f) => mat(tint(C.bag, f), 'fabric', 0.95, 0));
  const seamM = mat(tint(C.bag, 0.78), 'fabric', 0.95, 0);
  const dustM = mat(C.sandS, 'ground', 0.95, 0);
  const steelM = mat(C.steel, 'metal', 0.8, 0.3);
  const rustM = mat(C.rust, 'metal', 0.9, 0.1, THREE.DoubleSide);

  const bag = (geo, x, y, z, m, rz, rx, top) => {
    const o = add(geo, m, x, y, z); o.rotation.z = rz; o.rotation.x = rx;
    const w = geo === halfGeo ? 0.2 : 0.42;
    const s = box(w, 0.005, 0.012, seamM, 0, 0.099, 0); o.add(s);
    if (top) { const dcap = box(w * 0.8, 0.006, 0.18, dustM, 0, 0.1, 0); o.add(dcap); }
    return o;
  };

  for (let i = 0; i < 5; i++) {
    const y = 0.1 + 0.195 * i;
    const halfLen = 1.0 - 0.125 * i;
    const top = i === 4;
    for (let row = 0; row < 2; row++) {
      const z = row === 0 ? 0.15 : -0.15;
      const stagger = ((i + row) % 2) * 0.25;
      let x = -halfLen + 0.25 + stagger;
      if (stagger > 0) bag(halfGeo, -halfLen + 0.13, y + 0.003, z, (row === 0 ? front : back)[i % 4], 0.04, 0, top);
      while (x + 0.25 <= halfLen + 0.01) {
        const m = i === 0 ? low[Math.abs(row + Math.round(x * 2)) % 2] : (row === 0 ? front : back)[Math.abs(Math.round(x * 2)) % 4];
        bag(bagGeo, x, y + (rnd() - 0.5) * 0.01, z + (rnd() - 0.5) * 0.03, m, (rnd() - 0.5) * 0.07, (rnd() - 0.5) * 0.04, top);
        x += 0.5;
      }
      if (x - 0.25 < halfLen - 0.1) bag(halfGeo, halfLen - 0.13, y + 0.003, z, (row === 0 ? front : back)[(i + 2) % 4], -0.04, 0, top);
    }
  }
  // two bags slumped into the top course, one hanging over the front, one over the back
  bag(bagGeo, -0.2, 0.88, 0.12, front[3], 0.12, 0.3, false);
  bag(bagGeo, 0.3, 0.87, -0.12, back[1], -0.1, -0.26, false);

  // angle iron pickets, one each end, following the taper, bolts with rust runs
  for (const s of [-1, 1]) {
    const pk = new THREE.Group(); pk.position.set(s * 0.97, 0, 0); pk.rotation.z = s * 0.46; g.add(pk);
    box(0.05, 1.1, 0.006, steelM, 0, 0.55, 0.025, pk);
    box(0.006, 1.1, 0.05, steelM, s * 0.022, 0.55, 0, pk);
    for (const yy of [0.3, 0.7]) { box(0.02, 0.02, 0.012, rustM, 0, yy, 0.032, pk); drip(0.22, 0.03, rustM, 0, yy - 0.01, 0.029, 0, pk); }
  }
  drip(0.3, 0.06, rustM, 0.55, 0.62, 0.305, 0);
  drip(0.2, 0.05, rustM, -0.4, 0.42, -0.305, Math.PI);

  // sand at the base: a low mound the bottom course sits in, plus drifts at both ends
  const sandM = mat(C.sandS, 'ground', 0.95, 0, THREE.DoubleSide);
  const mound = new THREE.Shape(); mound.moveTo(-0.32, 0); mound.lineTo(0.32, 0); mound.lineTo(0.29, 0.09); mound.lineTo(0.0, 0.13); mound.lineTo(-0.29, 0.09); mound.closePath();
  const mg = new THREE.ExtrudeGeometry(mound, { depth: 2.16, bevelEnabled: false }); mg.translate(0, 0, -1.08);
  const mm = add(mg, sandM, 0, 0, 0); mm.rotation.y = Math.PI / 2;
  const endDrift = new THREE.Shape(); endDrift.moveTo(0, 0); endDrift.lineTo(0.1, 0); endDrift.lineTo(0, 0.2); endDrift.closePath();
  for (const s of [-1, 1]) {
    const eg = new THREE.ExtrudeGeometry(endDrift, { depth: 0.6, bevelEnabled: false }); eg.translate(0, 0, -0.3);
    const e = add(eg, sandM, s * 0.99, 0, 0); e.rotation.y = s > 0 ? 0 : Math.PI;
  }

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), mtx = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm2) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm2)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mtx.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const cc = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= cc.x; o.position.y -= box3.min.y; o.position.z -= cc.z; });
  return g;
}
