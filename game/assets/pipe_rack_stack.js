// pipe_rack_stack c2: different reading. Casing pipes with a thickened coupling collar at one end,
// ends open with a rust lip; the whole stack skewed a few degrees on its bearers, two bottom
// pipes pulled out of line, bearers as rough sawn timbers with nail heads, bottom sleepers as
// heavier baulks; a long sand drift half burying the south side.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  const P = { sand: 0xcdb88e, packed: 0xa89372, concB: 0xb8ae9b, concS: 0x857c6c, oxide: 0x8b4530, rust: 0x6b4426, galv: 0x9ea3a1, steel: 0x4f5257, tank: 0x9c988c, red: 0x9c4a3c, timber: 0xa07a4f, yellow: 0xc9a227, gun: 0x3a3d40, rubber: 0x1d1e20 };
  const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
  const mat = (hex, name, r = 0.85, mt = 0.15, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: mt, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const wedge = (len, out, h, m, x, y, z, ry, parent = g) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(out, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    const o = add(geo, m, x, y, z, parent); o.rotation.y = ry; return o;
  };

  const tones = [1.0, 0.92, 1.08, 0.88, 1.12, 0.96, 1.04].map((f) => mat(shade(P.steel, f), 'metal', 0.88, 0.2, true));
  const mCollar = mat(shade(P.steel, 0.85), 'metal', 0.85, 0.25);
  const mInner = mat(shade(P.steel, 0.65), 'metal', 0.95, 0.1, true);
  const mEnd = mat(P.oxide, 'metal', 0.9, 0.1, true);
  const mEndB = mat(shade(P.oxide, 1.08), 'metal', 0.9, 0.1, true);
  const mRust = mat(P.rust, 'metal', 0.95, 0.05, true);
  const mDust = mat(P.sand, 'ground', 0.95, 0.0, true);
  const mSand = mat(P.sand, 'ground', 0.95, 0.0);
  const mTimber = mat(P.timber, 'timber', 0.9, 0.0);
  const mTimberD = mat(shade(P.timber, 0.82), 'timber', 0.92, 0.0);
  const mNail = mat(P.gun, 'metal', 0.7, 0.4);

  const R = 0.125, L = 6.0, WALL = 0.02, SLEEP = 0.32, BEAR = 0.18;
  const stack = new THREE.Group(); stack.rotation.y = 0.02; g.add(stack);
  const pipe = (x, y, z, rotY, tone, collarSide, exposed = true) => {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = rotY; stack.add(p);
    const body = add(new THREE.CylinderGeometry(R, R, L - 0.5, 10, 1, true), tones[tone % tones.length], 0, 0, 0, p); body.rotation.z = PI / 2;
    // red oxide end bands, one end with a coupling collar
    for (const s of [-1, 1]) {
      const isCollar = s === collarSide;
      if (isCollar) {
        const col = add(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.25, 10), mCollar, s * (L / 2 - 0.125), 0, 0, p); col.rotation.z = PI / 2;
        const lip = add(new THREE.RingGeometry(R - WALL, R + 0.02, 10), mRust, s * L / 2, 0, 0, p); lip.rotation.y = s * PI / 2;
        const rr = add(new THREE.CylinderGeometry(R + 0.022, R + 0.022, 0.03, 10), mRust, s * (L / 2 - 0.25), 0, 0, p); rr.rotation.z = PI / 2;
      } else {
        const e = add(new THREE.CylinderGeometry(R, R, 0.25, 10, 1, true), s > 0 ? mEndB : mEnd, s * (L / 2 - 0.125), 0, 0, p); e.rotation.z = PI / 2;
        const lip = add(new THREE.RingGeometry(R - WALL, R, 10), mRust, s * L / 2, 0, 0, p); lip.rotation.y = s * PI / 2;
      }
      const inner = add(new THREE.CylinderGeometry(R - WALL, R - WALL, 0.45, 10, 1, true), mInner, s * (L / 2 - 0.22), 0, 0, p); inner.rotation.z = PI / 2;
    }
    if (exposed) { const d = add(new THREE.CylinderGeometry(R + 0.006, R + 0.006, L - 1.2, 3, 1, true, PI / 2 - 0.3, 0.6), mDust, 0.1, 0, 0, p); d.rotation.z = PI / 2; }
    const r = add(new THREE.CylinderGeometry(R + 0.004, R + 0.004, L - 2.0, 2, 1, true, -PI / 2 - 0.1, 0.2), mRust, -0.3, 0, 0, p); r.rotation.z = PI / 2;
    return p;
  };

  const rows = [7, 5, 3];
  const widthRow = (n) => n * 2 * R + (n - 1) * 0.015;
  const BX = [-2.0, 2.0];
  let y = 0;
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r], th = r === 0 ? SLEEP : BEAR, wRow = widthRow(n) + 0.16;
    for (const bx of BX) {
      const b = box(0.18, th, wRow, r === 0 ? mTimberD : mTimber, bx, y + th / 2, 0, stack);
      b.rotation.y = ((bx > 0 ? 1 : -1) * 0.02);
      box(0.14, 0.006, wRow - 0.06, mDust, bx, y + th + 0.003, 0, stack);
      // nail heads at the bearer ends
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), mNail, bx, y + th + 0.005, s * (wRow / 2 - 0.06), stack);
      if (r === 0) for (const s of [-1, 1]) {
        wedge(0.18, 0.08, 0.22, mTimber, bx, y + th, s * (wRow / 2 - 0.01), s > 0 ? PI / 2 : -PI / 2, stack);
      }
    }
    y += th;
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * (2 * R + 0.015);
      const jitter = ((i * 7 + r * 3) % 5 - 2) * 0.007;
      let dx = ((i * 5 + r) % 3 - 1) * 0.05;
      if (r === 0 && i === 1) dx = 0.15;
      if (r === 0 && i === 5) dx = -0.12;
      pipe(dx, y + R, z, jitter, i + r * 2, (i + r) % 2 === 0 ? 1 : -1, r === 2 || i === 0 || i === n - 1);
    }
    if (r === 2) for (const vz of [-(R + 0.0075), R + 0.0075]) box(L - 1.6, 0.06, 0.09, mDust, 0.1, y + R + 0.05, vz, stack);
    y += 2 * R;
  }
  // sand drift half burying the south side, smaller drift on the north, fillets at the sleeper ends
  wedge(5.4, 0.18, 0.28, mSand, 0.1, 0, widthRow(7) / 2 + 0.01, -PI / 2, stack);
  wedge(3.0, 0.16, 0.15, mSand, -0.8, 0, -widthRow(7) / 2 - 0.01, PI / 2, stack);
  for (const bx of BX) { wedge(1.8, 0.25, 0.14, mSand, bx + 0.09, 0, 0, 0, stack); wedge(1.8, 0.25, 0.14, mSand, bx - 0.09, 0, 0, PI, stack); }

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
