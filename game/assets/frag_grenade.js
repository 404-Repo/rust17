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
