// culvert_crossing candidate 2: a different reading. The barrel is four precast
// box segments of 1.85 m with open joints and chamfered joint edges, lifting
// lugs on the crown of each, a heavier collar headwall with chamfered top
// corners and a coping, wing walls as two stepped blocks, the silt floor as a
// displaced plane with a meandering channel and tyre ruts running through.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m, ds) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
    if (ds) mat.side = THREE.DoubleSide;
    if (name) mat.name = name;
    return mat;
  };
  const conc = M(0xb8ae9b, 'stone', 0.90, 0.0);
  const concB = M(0xbfb5a1, 'stone', 0.90, 0.0);      // alternate segment tone
  const concS = M(0xc5bba7, 'stone', 0.90, 0.0);
  const concN = M(0xaba191, 'stone', 0.90, 0.0);
  const concIn = M(0x8a8275, 'stone', 0.92, 0.0, true);
  const stain = M(0x857c6c, 'stone', 0.92, 0.0, true);
  const stainD = M(0x6f6759, 'stone', 0.94, 0.0, true);
  const groove = M(0x625b4e, 'stone', 0.95, 0.0);
  const rust = M(0x6b4426, 'metal', 0.85, 0.2);
  const rustD = M(0x573620, 'metal', 0.85, 0.2);
  const lug = M(0x4f5257, 'metal', 0.75, 0.4);
  const dust = M(0xcdb88e, 'ground', 0.95, 0.0);
  const silt = M(0xc1ac86, 'ground', 0.95, 0.0, true);
  const packed = M(0xa89372, 'ground', 0.95, 0.0);
  const sand = M(0xc7b28a, 'ground', 0.95, 0.0);

  const box = (w, h, d, mat, x, y, z, parent) => {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mm.position.set(x, y, z); (parent || g).add(mm); return mm;
  };

  const IW = 2.4, WT = 0.35, IH = 2.0, FL = 0.12, RT = 0.38;
  const OW = IW + 2 * WT, roofTop = FL + IH + RT;
  const SEG = 1.85, GAP = 0.03, NSEG = 4;
  const L = NSEG * SEG + (NSEG - 1) * GAP;      // 7.49

  // ---- four precast segments ----
  for (let i = 0; i < NSEG; i++) {
    const zc = -L / 2 + SEG / 2 + i * (SEG + GAP);
    const mat = i % 2 ? concB : conc;
    box(OW, FL, SEG, stainD, 0, FL / 2, zc);
    for (const sx of [-1, 1]) box(WT, IH, SEG, mat, sx * (IW / 2 + WT / 2), FL + IH / 2, zc);
    box(OW, RT, SEG, mat, 0, FL + IH + RT / 2, zc);
    // chamfered joint edges: dark strips at each segment end, outside and on the crown
    for (const e of [-1, 1]) {
      const ez = zc + e * (SEG / 2 - 0.02);
      for (const sx of [-1, 1]) box(0.02, roofTop - 0.45, 0.04, groove, sx * (OW / 2 + 0.002), roofTop / 2 + 0.2, ez);
      box(OW + 0.004, 0.02, 0.04, groove, 0, roofTop + 0.002, ez);
    }
    // interior skins per segment: darker walls, stained band, ceiling
    for (const sx of [-1, 1]) {
      box(0.01, IH - 0.02, SEG - 0.02, concIn, sx * (IW / 2 - 0.005), FL + IH / 2, zc);
      box(0.012, 0.7, SEG - 0.02, stainD, sx * (IW / 2 - 0.012), FL + 0.35, zc);
      box(0.01, 0.05, SEG - 0.02, stain, sx * (IW / 2 - 0.014), FL + 0.74, zc);
    }
    box(IW - 0.02, 0.01, SEG - 0.02, concIn, 0, FL + IH - 0.005, zc);
    // lifting lugs on the crown, two per segment, rust bloom around them
    for (const lx of [-0.8, 0.8]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), lug);
      r.position.set(lx, roofTop + 0.06, zc); g.add(r);
      box(0.2, 0.01, 0.2, rustD, lx, roofTop + 0.005, zc);
    }
    // exterior stained base, rust runs down from the crown joints
    for (const sx of [-1, 1]) {
      box(0.02, 0.4, SEG, stain, sx * (OW / 2 + 0.005), 0.2, zc);
      box(0.006, 0.45, 0.05, rust, sx * (OW / 2 + 0.012), roofTop - 0.45, zc + SEG / 2 - 0.06);
      box(0.006, 0.28, 0.025, rustD, sx * (OW / 2 + 0.014), roofTop - 0.75, zc + SEG / 2 - 0.05);
      if (i % 2) box(0.006, 0.3, 0.04, rust, sx * (OW / 2 + 0.012), roofTop - 0.35, zc - 0.3);
    }
    box(OW - 0.14, 0.012, SEG - 0.1, dust, 0, roofTop + 0.006, zc);
  }
  // ---- silt floor: displaced plane with a meandering channel, along the full length ----
  {
    const geo = new THREE.PlaneGeometry(IW - 0.02, L + 0.4, 12, 40);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);       // y is along z after rotation
      const ch = 0.25 * Math.sin(y * 0.9);        // channel meanders
      const d = Math.abs(x - ch);
      let h = 0.20 - 0.13 * Math.max(0, 1 - d / 0.45);
      h += 0.012 * Math.sin(x * 9 + y * 3);
      p.setZ(i, h);
    }
    geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, silt); mm.rotation.x = -Math.PI / 2; mm.position.y = FL; g.add(mm);
    // side skirts so the silt layer has thickness at the ends
    box(IW - 0.02, 0.06, 0.02, packed, 0, FL + 0.03, L / 2 + 0.19);
    box(IW - 0.02, 0.06, 0.02, packed, 0, FL + 0.03, -L / 2 - 0.19);
  }

  // ---- collar headwalls with chamfered top corners and a coping ----
  const HW = OW + 0.16, HT = 2.35;
  for (const sz of [-1, 1]) {
    const face = sz > 0 ? concS : concN;
    const zc = sz * (L / 2 + 0.17);
    box(HW, HT - (FL + IH), 0.34, face, 0, (FL + IH + HT) / 2, zc);
    for (const sx of [-1, 1]) box((HW - IW) / 2, FL + IH, 0.34, face, sx * (IW / 2 + (HW - IW) / 4), (FL + IH) / 2, zc);
    box(HW, 0.4, 0.35, stain, 0, 0.2, zc);
    // chamfered top corners: a rotated block cut across each corner in stained tone
    for (const sx of [-1, 1]) {
      const ch = box(0.3, 0.3, 0.36, stainD, sx * (HW / 2), HT, zc);
      ch.rotation.z = Math.PI / 4;
    }
    // opening reveal, darker, and the sill lip
    box(0.04, IH, 0.36, concIn, -(IW / 2 + 0.02), FL + IH / 2, zc);
    box(0.04, IH, 0.36, concIn, (IW / 2 + 0.02), FL + IH / 2, zc);
    box(IW + 0.08, 0.04, 0.36, concIn, 0, FL + IH - 0.02, zc);
    box(IW + 0.4, 0.06, 0.06, stain, 0, FL + 0.03, zc + sz * 0.19);
    // coping and rebar stubs with rust runs
    box(HW + 0.12, 0.12, 0.44, conc, 0, HT + 0.06, zc);
    box(HW + 0.04, 0.13, 0.40, concB, 0, HT + 0.185, zc);
    box(HW - 0.06, 0.012, 0.34, dust, 0, HT + 0.256, zc);
    for (const rx of [-1.25, -0.5, 0.5, 1.25]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), rustD);
      r.position.set(rx, HT + 0.25 + 0.08, zc + sz * 0.06); g.add(r);
      box(0.05, 0.02, 0.05, rustD, rx, HT + 0.252, zc + sz * 0.06);
      box(0.04, 0.55, 0.006, rust, rx, HT - 0.22, zc + sz * 0.174);
      box(0.02, 0.3, 0.006, rustD, rx + (rx > 0 ? 0.03 : -0.03), HT - 0.55, zc + sz * 0.176);
    }
    // a lamp bracket bolt pair on the sun side with rust
    for (const bx of [-0.9, 0.9]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), rust);
      b.rotation.x = Math.PI / 2; b.position.set(bx, 0.55, zc + sz * 0.18); g.add(b);
      box(0.03, 0.15, 0.006, rust, bx, 0.45, zc + sz * 0.174);
    }
    // wing walls: two stepped blocks each, splayed 30 degrees off the axis
    for (const sx of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(sx * (HW / 2), 0, zc - sz * 0.17);
      wg.rotation.y = sx * sz * Math.PI / 6;
      g.add(wg);
      box(0.2, 2.1, 0.18, conc, sx * 0.1, 1.05, -sz * 0.09, wg);
      box(0.2, 1.5, 0.16, conc, sx * 0.1, 0.75, -sz * 0.26, wg);
      box(0.21, 0.4, 0.34, stain, sx * 0.1, 0.2, -sz * 0.17, wg);
      box(0.16, 0.012, 0.14, dust, sx * 0.1, 2.106, -sz * 0.09, wg);
      box(0.16, 0.012, 0.12, dust, sx * 0.1, 1.506, -sz * 0.26, wg);
    }
  }
  // ---- sand fillet and tyre ruts through the tunnel approaches ----
  for (const sx of [-1, 1]) {
    box(0.25, 0.10, L - 0.2, sand, sx * (OW / 2 + 0.12), 0.05, 0);
    box(0.15, 0.10, L - 1.0, sand, sx * (OW / 2 + 0.07), 0.15, 0.2);
    box(0.08, 0.06, 2.4, dust, sx * (OW / 2 + 0.04), 0.23, -1.0);
  }
  for (const sz of [-1, 1]) {
    box(1.4, 0.08, 0.3, sand, sz * 0.9, 0.04, sz * (L / 2 + 0.48));
    box(0.7, 0.05, 0.2, dust, sz * 0.7, 0.10, sz * (L / 2 + 0.43));
  }

  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) box3.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
