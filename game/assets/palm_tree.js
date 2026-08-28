// palm_tree r4 detail pass. Same crown, spread and 9 m height as r2; the trunk is rebuilt with real
// frond boots: 14 radials by 0.12 m rings, a checkerboard of proud and hollow vertices that makes
// 0.24 m diamonds with 3 cm of relief, dark in the hollows and dusty on the up faces, a flared foot
// with a damp band. Under the crown a ring of proud boot plates and cut frond stubs replaces the flat
// collar, a dark fibre mass with hanging fibre strips fills the boss, the dead skirt is twelve fronds
// hugging the trunk, and the date bunches hang on thick curved stalks with a bract. Vertex colours
// only on the trunk and leaflets: no textures, no images.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 19; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, rock: 0xc4b393, timber: 0xa07a4f, rust: 0x6b4426, foliage: 0x8a7a4e, packed: 0xa89372 };
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false, vc = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, vertexColors: vc }); if (name) m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hash = (x, y) => { const q = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return q - Math.floor(q); };

  // ---- trunk: boots as a checkerboard relief ----
  const H = 7.1, RAD = 14, RING = 0.12, NR = Math.round(H / RING);
  const radiusAt = (y) => { const t = y / H; let r = 0.225 - 0.07 * t; if (y < 0.6) r += (0.6 - y) * 0.11; if (y > H - 0.4) r += (y - (H - 0.4)) * 0.15; return r; };
  const mTrunk = mat(0xffffff, 'timber', 0.93, 0, false, true);
  {
    const grey = new THREE.Color(0x8f8a7e), tan = new THREE.Color(P.timber).lerp(new THREE.Color(P.rock), 0.35), pale = new THREE.Color(P.rock), dark = new THREE.Color(0x5e4d36), dust = new THREE.Color(P.sand);
    const pos = [], nrm = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= NR; i++) {
      const y = i * RING, r0 = radiusAt(y);
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * PI * 2;
        const jj = j % RAD;
        const out = ((i + jj) % 2) === 0;                            // checkerboard: diamonds 2 rings tall, 2 radials wide
        const boots = y > 0.5 && y < H - 0.15;
        const amp = boots ? (y < 1.0 ? (y - 0.5) / 0.5 : 1) : 0;
        const relief = amp * (out ? 0.032 : -0.028);
        const wob = 0.006 * Math.sin(y * 3.1 + a * 2) + 0.004 * Math.sin(y * 7.3 - a * 3);
        const r = r0 + relief + wob;
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
        nrm.push(Math.cos(a), 0.12, Math.sin(a));
        const t = cl(y / H, 0, 1);
        c.copy(grey).lerp(tan, Math.pow(t, 0.8));
        if (t > 0.94) c.lerp(pale, (t - 0.94) / 0.06 * 0.5);
        if (boots) { if (out) { c.multiplyScalar(1.15); c.lerp(dust, 0.18); } else c.lerp(dark, 0.55 * amp); }
        const mottle = 0.9 + 0.2 * hash(i * 0.37, jj * 0.61);
        c.multiplyScalar(mottle);
        if (y < 0.5) c.lerp(new THREE.Color(0x7a6f5e), (0.5 - y) / 0.5 * 0.6);   // damp, sand blasted foot
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < RAD; j++) {
      const a = i * (RAD + 1) + j, b = a + RAD + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    add(geo, mTrunk);
    // top cap so the boss cannot show a hole
    add(new THREE.CylinderGeometry(radiusAt(H) * 0.98, radiusAt(H) * 0.98, 0.02, RAD), mat(0x6b5a3c, 'foliage', 0.95), 0, H, 0);
  }
  // ---- crown base: fibre mass, proud boot plates, cut stubs, fibre strips ----
  const mFibre = mat(0x6b5a3c, 'foliage', 0.95), mBoot = mat(0x9c8a5a, 'foliage', 0.92), mBootD = mat(0x7d6a44, 'foliage', 0.95);
  const mStrip = mat(0x5e4d36, 'foliage', 0.95, 0, true);
  const bossProf = [[0.24, H - 0.05], [0.3, H + 0.2], [0.31, H + 0.42], [0.24, H + 0.6], [0.1, H + 0.7], [0, H + 0.7]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(bossProf, 12), mFibre, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.16, 0.22, 0.02, 12), mat(P.sand, 'ground', 0.95), 0, H + 0.6, 0);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2 + row * 0.45, y = H - 0.05 + row * 0.3, r = 0.27 + row * 0.02;
    const b = add(new THREE.BoxGeometry(0.17, 0.24, 0.05), row ? mBoot : mBootD, Math.cos(a) * r, y, Math.sin(a) * r);
    b.rotation.y = -a; b.rotateX(-0.5);
    add(new THREE.BoxGeometry(0.12, 0.012, 0.04), mat(P.sand, 'ground', 0.95), 0, 0.12, -0.02, b);   // dust on the boot lip
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.2, y = H - 0.62;
    const st = add(new THREE.CylinderGeometry(0.035, 0.06, 0.22, 4), mBootD, Math.cos(a) * 0.3, y, Math.sin(a) * 0.3);
    st.rotation.z = -Math.cos(a) * 1.1; st.rotation.x = Math.sin(a) * 1.1;
    add(new THREE.CylinderGeometry(0.036, 0.036, 0.015, 4), mat(0xb3a181, 'foliage', 0.95), 0, 0.11, 0, st);   // the cut face, pale
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2 + 0.1, r = 0.3;
    const f = add(new THREE.PlaneGeometry(0.035, rr(0.4, 0.75)), mStrip, Math.cos(a) * r, H - 0.45, Math.sin(a) * r);
    f.rotation.y = -a + PI / 2; f.rotation.x = rr(-0.15, 0.15);
  }

  // ---- fronds ----
  const up = new THREE.Vector3(0, 1, 0);
  const mLive = mat(0xffffff, 'foliage', 0.9, 0, true, true);
  const mDead = mat(0xffffff, 'foliage', 0.95, 0, true, true);
  const mRib = mat(0x9c8a5a, 'foliage', 0.9);
  const mRibDead = mat(0x7a6242, 'foliage', 0.95);
  const cBase = new THREE.Color(P.foliage).lerp(new THREE.Color(0xb3a06a), 0.35), cTop = new THREE.Color(P.foliage).multiply(new THREE.Color(0.94, 1.08, 0.9)), cTip = new THREE.Color(0x9a8a5e), cBrown = new THREE.Color(0x7a6242), cBrownL = new THREE.Color(0x9a8560);
  const leafCache = {};
  const leaflet = (len, w, droop, c0, c1) => {
    const key = [len.toFixed(2), w.toFixed(3), droop.toFixed(2), c0.getHex(), c1.getHex()].join('|');
    if (leafCache[key]) return leafCache[key];
    const geo = new THREE.PlaneGeometry(len, w, 3, 1);
    geo.translate(len / 2, 0, 0);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const t = p.getX(i) / len;
      p.setZ(i, -droop * t * t);
      p.setY(i, p.getY(i) * (1 - 0.7 * t * t));
      cc.copy(c0).lerp(c1, t * t);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    leafCache[key] = geo; return geo;
  };
  const frond = (az, elev, L, sag, kind) => {
    const dx = Math.cos(az), dz = Math.sin(az);
    const p0 = new THREE.Vector3(dx * 0.26, H + 0.42, dz * 0.26);
    let pts;
    if (kind !== 'dead') {
      const ce = Math.cos(elev), se = Math.sin(elev);
      pts = [p0,
        p0.clone().add(new THREE.Vector3(dx * L * 0.32 * ce, L * 0.32 * se + 0.05, dz * L * 0.32 * ce)),
        p0.clone().add(new THREE.Vector3(dx * L * 0.66 * ce, L * 0.66 * se - sag * 0.28, dz * L * 0.66 * ce)),
        p0.clone().add(new THREE.Vector3(dx * L * 0.92 * ce, L * 0.92 * se - sag, dz * L * 0.92 * ce))];
    } else {
      pts = [new THREE.Vector3(dx * 0.28, H + 0.1, dz * 0.28), new THREE.Vector3(dx * 0.4, H - 0.3, dz * 0.4), new THREE.Vector3(dx * 0.36, H - 1.4, dz * 0.36), new THREE.Vector3(dx * 0.28, H - L * 0.95, dz * 0.28)];
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const dead = kind === 'dead';
    add(new THREE.TubeGeometry(curve, 7, dead ? 0.018 : 0.024, 3, false), dead ? mRibDead : mRib);
    const n = dead ? 14 : 22;
    const c0 = dead ? cBrown : (kind === 'top' ? cTop : cBase), c1 = dead ? cBrownL : cTip;
    for (let j = 0; j < n; j++) {
      const t = 0.12 + (j / (n - 1)) * 0.86;
      const p = curve.getPoint(t), T = curve.getTangent(t).normalize();
      const S = new THREE.Vector3().crossVectors(T, up).normalize();
      const l = dead ? 0.5 - 0.22 * (j / n) : 0.78 - 0.42 * Math.pow(j / (n - 1), 1.4);
      const w = dead ? 0.03 : 0.034;
      for (const side of [1, -1]) {
        const sweep = 0.52 + 0.06 * Math.sin(j * 1.7);
        const dir = S.clone().multiplyScalar(side * Math.cos(sweep)).add(T.clone().multiplyScalar(Math.sin(sweep))).add(new THREE.Vector3(0, dead ? -0.9 : -0.35, 0)).normalize();
        const z = new THREE.Vector3().crossVectors(dir, T).normalize();
        const y = new THREE.Vector3().crossVectors(z, dir).normalize();
        const leaf = add(leaflet(l, w, dead ? 0.02 : 0.16 + 0.1 * (j / n), c0, c1), dead ? mDead : mLive);
        leaf.position.copy(p);
        leaf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, z, y.negate()));
        leaf.rotateX((side > 0 ? 1 : -1) * 0.55);
      }
    }
  };
  for (let i = 0; i < 5; i++) frond((i / 5) * PI * 2 + 0.3, 1.05, 2.9, 0.9, 'top');
  for (let i = 0; i < 9; i++) frond((i / 9) * PI * 2, 0.34 + 0.08 * Math.sin(i * 2.1), 3.15, 2.0 + 0.3 * Math.cos(i * 1.3), i % 3 === 0 ? 'top' : 'mid');
  for (let i = 0; i < 12; i++) frond((i / 12) * PI * 2 + 0.5, 0, 2.4 + 0.4 * (i % 3), 0, 'dead');
  // dates: thick curved stalk from the boss, a bract plate, a lumpy cluster (fabric recipe: the canvas set reads as fibrous fruit, not straw)
  const dprof = [[0, 0], [0.09, 0.04], [0.12, 0.12], [0.1, 0.2], [0.14, 0.3], [0.11, 0.4], [0.13, 0.5], [0.08, 0.6], [0.03, 0.66], [0, 0.66]].map(([r, y]) => new THREE.Vector2(r, y));
  const mDate = mat(0x7a4a28, 'fabric', 0.85), mStalk = mat(0xa08a5a, 'foliage', 0.9), mBract = mat(0x9c8a5a, 'foliage', 0.9, 0, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 1.0;
    const bx = Math.cos(a), bz = Math.sin(a);
    const stalk = new THREE.CatmullRomCurve3([new THREE.Vector3(bx * 0.22, H + 0.2, bz * 0.22), new THREE.Vector3(bx * 0.5, H + 0.05, bz * 0.5), new THREE.Vector3(bx * 0.52, H - 0.35, bz * 0.52), new THREE.Vector3(bx * 0.46, H - 0.65, bz * 0.46)]);
    add(new THREE.TubeGeometry(stalk, 6, 0.028, 5, false), mStalk);
    const br = add(new THREE.PlaneGeometry(0.14, 0.34), mBract, bx * 0.42, H - 0.05, bz * 0.42); br.rotation.y = -a + PI / 2; br.rotation.x = 0.4;
    const cluster = add(new THREE.LatheGeometry(dprof, 8), mDate, bx * 0.46, H - 1.3, bz * 0.46);
    cluster.rotation.y = i * 1.1;
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 4), mStalk, bx * 0.46 + rr(-0.05, 0.05), H - 0.75, bz * 0.46 + rr(-0.05, 0.05));   // strand stems
  }
  // fallen date: a few on the sand
  for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.018, 5, 4), mDate, rr(-0.5, 0.5), 0.02, rr(-0.5, 0.5)).scale.set(1, 0.7, 1.5);
  // sand fillet at the foot, a low irregular mound, and a windward drift
  const fillet = new THREE.CylinderGeometry(0.32, 0.72, 0.24, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.1 * Math.sin(z * 9 + x)), fp.getY(i), z * (1 + 0.1 * Math.cos(x * 8))); }
  fillet.computeVertexNormals();
  add(fillet, mat(P.sand, 'ground', 0.95), 0.04, 0.12, 0.05);
  { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 0.2); sh.closePath(); const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }); ge.translate(0, 0, -0.4); add(ge, mat(P.sand, 'ground', 0.95), 0.3, 0.0, 0.0); }
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
