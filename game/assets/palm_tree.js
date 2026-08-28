// palm_tree round 2 rebuild. Trunk is one hand built BufferGeometry: 16 radials by 4.8 cm rings with
// an in/out diamond relief (the old frond bases, under 5 cm each) and a per vertex colour that runs
// from grey at the foot to tan under the crown, dark in the diamond hollows and light on the ridges.
// Crown: 14 live fronds, each a curved rib carrying 22 bent leaflet strips a side (feathered
// silhouette), plus a skirt of 7 dead brown fronds hanging against the trunk, three date bunches,
// dust at the frond bases, sand fillet at the foot. Vertex colours only: no textures, no images.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 19; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, rock: 0xc4b393, timber: 0xa07a4f, rust: 0x6b4426, foliage: 0x8a7a4e, packed: 0xa89372 };
  const mat = (hex, name, r = 0.9, mt = 0.0, ds = false, vc = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide, vertexColors: vc }); m.name = name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hash = (x, y) => { const q = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return q - Math.floor(q); };

  // ---- trunk ----
  const H = 7.1, RAD = 16, RING = 0.048, NR = Math.round(H / RING);
  const radiusAt = (y) => { const t = y / H; let r = 0.235 - 0.075 * t; if (y < 0.5) r += (0.5 - y) * 0.09; if (y > H - 0.5) r += (y - (H - 0.5)) * 0.12; return r; };
  const mTrunk = mat(0xffffff, 'timber', 0.93, 0, false, true);
  {
    const grey = new THREE.Color(0x8f8a7e), tan = new THREE.Color(P.timber).lerp(new THREE.Color(P.rock), 0.35), pale = new THREE.Color(P.rock);
    const pos = [], nrm = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= NR; i++) {
      const y = i * RING, r0 = radiusAt(y);
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * PI * 2 + (i % 2) * (PI / RAD) * 0;   // seam duplicated for normals
        const jj = j % RAD;
        const out = ((i + jj) % 2) === 0 ? 1 : 0;                   // diamond relief: alternate vertices proud
        const relief = y < 0.35 || y > H - 0.25 ? 0 : (out ? 0.014 : -0.010);
        const wob = 0.006 * Math.sin(y * 3.1 + a * 2) + 0.004 * Math.sin(y * 7.3 - a * 3);
        const r = r0 + relief + wob;
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
        nrm.push(Math.cos(a), 0.12, Math.sin(a));
        const t = cl(y / H, 0, 1);
        c.copy(grey).lerp(tan, Math.pow(t, 0.8));
        if (t > 0.92) c.lerp(pale, (t - 0.92) / 0.08 * 0.6);       // bleached collar under the crown
        const shade = out ? 1.12 : 0.78;
        const mottle = 0.9 + 0.2 * hash(i * 0.37, jj * 0.61);
        c.multiplyScalar(shade * mottle);
        if (y < 0.4) c.lerp(new THREE.Color(P.packed), (0.4 - y) / 0.4 * 0.5);   // sand at the foot
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
  }
  // crown boss: the mass of live frond bases, a squat lathe
  const bossProf = [[0.22, H - 0.1], [0.34, H + 0.15], [0.36, H + 0.4], [0.28, H + 0.62], [0.1, H + 0.72], [0, H + 0.72]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(bossProf, 12), mat(0xb3a181, 'foliage', 0.95), 0, 0, 0);
  add(new THREE.CylinderGeometry(0.2, 0.26, 0.02, 12), mat(P.sand, 'ground', 0.95), 0, H + 0.62, 0);

  // ---- fronds ----
  const up = new THREE.Vector3(0, 1, 0);
  const mLive = mat(0xffffff, 'foliage', 0.9, 0, true, true);
  const mDead = mat(0xffffff, 'foliage', 0.95, 0, true, true);
  const mRib = mat(0x9c8a5a, 'foliage', 0.9);
  const mRibDead = mat(0x7a6242, 'foliage', 0.95);
  const cBase = new THREE.Color(P.foliage).lerp(new THREE.Color(0xb3a06a), 0.35), cTop = new THREE.Color(P.foliage).multiply(new THREE.Color(0.94, 1.08, 0.9)), cTip = new THREE.Color(0x9a8a5e), cBrown = new THREE.Color(0x7a6242), cBrownL = new THREE.Color(0x9a8560);
  // one leaflet: a strip len x w, three verts along, bent down toward the tip; colour runs base -> tip
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
      p.setY(i, p.getY(i) * (1 - 0.7 * t * t));           // tapers to the tip
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
      pts = [p0, new THREE.Vector3(p0.x + dx * 0.42, p0.y - 0.35, p0.z + dz * 0.42), new THREE.Vector3(p0.x + dx * 0.38, p0.y - 1.4, p0.z + dz * 0.38), new THREE.Vector3(p0.x + dx * 0.3, p0.y - L * 0.95, p0.z + dz * 0.3)];
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const dead = kind === 'dead';
    add(new THREE.TubeGeometry(curve, 7, dead ? 0.018 : 0.024, 3, false), dead ? mRibDead : mRib);
    const n = dead ? 12 : 22;
    const c0 = dead ? cBrown : (kind === 'top' ? cTop : cBase), c1 = dead ? cBrownL : cTip;
    for (let j = 0; j < n; j++) {
      const t = 0.12 + (j / (n - 1)) * 0.86;
      const p = curve.getPoint(t), T = curve.getTangent(t).normalize();
      const S = new THREE.Vector3().crossVectors(T, up).normalize();
      const l = dead ? 0.55 - 0.25 * (j / n) : 0.78 - 0.42 * Math.pow(j / (n - 1), 1.4);
      const w = dead ? 0.028 : 0.034;
      for (const side of [1, -1]) {
        const sweep = 0.52 + 0.06 * Math.sin(j * 1.7);
        const dir = S.clone().multiplyScalar(side * Math.cos(sweep)).add(T.clone().multiplyScalar(Math.sin(sweep))).add(new THREE.Vector3(0, dead ? -0.9 : -0.35, 0)).normalize();
        const z = new THREE.Vector3().crossVectors(dir, T).normalize();
        const y = new THREE.Vector3().crossVectors(z, dir).normalize();
        const leaf = add(leaflet(l, w, dead ? 0.02 : 0.16 + 0.1 * (j / n), c0, c1), dead ? mDead : mLive);
        leaf.position.copy(p);
        leaf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, z, y.negate()));
        leaf.rotateX((side > 0 ? 1 : -1) * 0.55);          // leaflet plane pitched like a V along the rib
      }
    }
  };
  for (let i = 0; i < 5; i++) frond((i / 5) * PI * 2 + 0.3, 1.05, 2.9, 0.9, 'top');
  for (let i = 0; i < 9; i++) frond((i / 9) * PI * 2, 0.34 + 0.08 * Math.sin(i * 2.1), 3.15, 2.0 + 0.3 * Math.cos(i * 1.3), i % 3 === 0 ? 'top' : 'mid');
  for (let i = 0; i < 7; i++) frond((i / 7) * PI * 2 + 0.5, 0, 2.6 + 0.3 * (i % 2), 0, 'dead');
  // dates: a lathe bunch on a stalk
  const dprof = [[0, 0], [0.08, 0.05], [0.13, 0.25], [0.1, 0.5], [0.03, 0.62], [0, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
  const mDate = mat(0x8a5a30, 'foliage', 0.9);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 1.0;
    const bx = Math.cos(a) * 0.45, bz = Math.sin(a) * 0.45;
    const stalk = add(new THREE.CylinderGeometry(0.015, 0.02, 0.6, 5), mRib, bx * 0.6, H + 0.1, bz * 0.6);
    stalk.rotation.z = -Math.cos(a) * 0.5; stalk.rotation.x = Math.sin(a) * 0.5;
    add(new THREE.LatheGeometry(dprof, 7), mDate, bx, H - 0.85, bz);
  }
  // sand fillet at the foot, a low irregular mound
  const fillet = new THREE.CylinderGeometry(0.3, 0.7, 0.24, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.1 * Math.sin(z * 9 + x)), fp.getY(i), z * (1 + 0.1 * Math.cos(x * 8))); }
  fillet.computeVertexNormals();
  add(fillet, mat(P.sand, 'ground', 0.95), 0.04, 0.12, 0.05);

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
