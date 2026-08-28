// palm_tree, round 5 (foliage): a date palm the way a shipped game builds one. The trunk is a tapered
// lathe (16 segments) with a slight lean, wearing the palm_bark set (its frond boot diamonds come from
// the texture, keyed by the material NAME 'palm_bark'); the crown is 20 frond CARDS, gently bent planes
// (4 segments along the rachis, a V fold across) wearing the Atlas cutouts palm_frond_a and _b, in two
// rings: an upper ring pointing up and out, a lower ring drooping; six dead frond_c cards hang below,
// two date_cluster cards under the crown; a ring of cut frond stubs and a fibre boss where the fronds
// meet the trunk; a sand fillet and a windward drift at the foot. Cards are materials named
// 'card:<name>' (game/src/render/materials.js turns them into alpha tested double sided planes with
// the photo on the plane's own uvs; the rachis base is at u = 0). They ship transparent 0.9 so the
// loader's surfaces pass leaves their uvs alone; materials.js makes them opaque and alpha tested.
// Card normals are bent toward up and outward so the crown shades as one mass, not as twenty planes.
// 1,244 triangles measured (was 10,214), 6.8 x 6.8 x 9.2 m.
export default function (THREE) {
  const g = new THREE.Group();
  const PI = Math.PI;
  let s = 23; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd();
  const P = { sand: 0xcdb88e, foliage: 0x8a7a4e };
  const mat = (hex, name, r = 0.9, ds = false) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: 0, side: ds ? THREE.DoubleSide : THREE.FrontSide }); m.name = name; return m; };
  // a card material: the colour is the tint the material pass pulls the photo toward (lightly), the vertex colour
  // carries a per frond brightness so twenty copies of one photo do not read as one. Every card material has its
  // OWN colour value: the loader merges materials by value and has not seen the photos yet, so two cards with
  // equal values would be welded into one and both would show the first card's photo.
  const card = (name, hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, vertexColors: true }); m.name = 'card:' + name; return m; };
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const UP = new THREE.Vector3(0, 1, 0);

  // ---- trunk: tapered lathe, 16 segments, flared foot, a swell under the crown, a slight lean ----
  const H = 6.9;                                   // crown base
  const mBark = mat(0x6e6354, 'palm_bark', 0.92);
  const prof = [[0.36, 0], [0.30, 0.25], [0.245, 0.9], [0.22, 2.2], [0.205, 4.0], [0.19, 5.6], [0.19, 6.5], [0.215, H], [0.17, H + 0.2], [0, H + 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const trunk = new THREE.LatheGeometry(prof, 16);
  const lean = (y) => 0.24 * Math.pow(Math.max(0, y) / H, 1.6);   // 24 cm off plumb at the crown
  {
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + lean(y)); p.setZ(i, p.getZ(i) + 0.05 * Math.sin(y * 1.3)); }
    trunk.computeVertexNormals();
  }
  add(trunk, mBark);
  const cx = lean(H), cz = 0.05 * Math.sin(H * 1.3);   // where the crown sits
  // the fibre boss the fronds grow from
  const boss = new THREE.LatheGeometry([[0.2, H - 0.02], [0.27, H + 0.22], [0.25, H + 0.45], [0.12, H + 0.6], [0, H + 0.62]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  add(boss, mat(0x5a4d3c, 'foliage', 0.95), cx, 0, cz);
  // cut frond stubs in a ring under the crown, the boots the bark set draws continued into geometry
  const mStub = mat(0x7a6c5a, 'palm_bark', 0.92), mCut = mat(0xa39270, 'timber', 0.95);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2 + 0.3, y = H - 0.35 + (i % 2) * 0.22, r = 0.22;
    const d = new THREE.Vector3(Math.cos(a), 0.9 - (i % 2) * 0.5, Math.sin(a)).normalize();
    const st = add(new THREE.CylinderGeometry(0.045, 0.07, 0.3, 5), mStub, cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
    st.quaternion.setFromUnitVectors(UP, d);
    st.position.addScaledVector(d, 0.12);
    const cut = add(new THREE.CylinderGeometry(0.046, 0.046, 0.012, 5), mCut);
    cut.position.copy(st.position).addScaledVector(d, 0.15); cut.quaternion.copy(st.quaternion);
  }

  // ---- fronds: a bent, V folded plane along +x, rachis base at the origin (u = 0), 4 x 2 segments ----
  const frondGeo = (L, W, droop, fold, curl) => {
    const NX = 4, pos = [], uv = [], idx = [];
    for (let j = 0; j <= 2; j++) for (let i = 0; i <= NX; i++) {
      const t = i / NX, w = j - 1;                       // w: -1 rachis side, 0 rachis, +1
      const x = t * L;
      const y = -droop * t * t + fold * Math.abs(w) * (1 - 0.6 * t) + curl * t * t * t;
      pos.push(x, y, w * W * 0.5);
      uv.push(t, 0.5 + w * 0.5);
    }
    for (let j = 0; j < 2; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + NX + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const mFrondA = card('palm_frond_a', 0x8a7a4e), mFrondB = card('palm_frond_b', 0x8c7c50), mFrondC = card('palm_frond_c', 0x8a6a42), mDate = card('date_cluster', 0x8a5232);
  const _n = new THREE.Vector3(), _o = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  // place a frond: yaw (radians about y), pitch (up from horizontal), then bend its normals toward up and outward
  const frond = (m, L, W, yaw, pitch, droop, fold, curl, bright, kUp, kOut, kFace) => {
    const geo = frondGeo(L, W, droop, fold, curl);
    _q.setFromEuler(new THREE.Euler(0, -yaw, pitch, 'YXZ'));
    _o.set(cx + Math.cos(yaw) * 0.16, H + 0.32, cz + Math.sin(yaw) * 0.16);
    _m.compose(_o, _q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(_m);
    const p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3);
    const out = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    for (let i = 0; i < p.count; i++) {
      _n.fromBufferAttribute(n, i);
      if (_n.y < 0) _n.negate();                                   // the face's up side, whichever way the winding went
      _n.multiplyScalar(kFace).addScaledVector(UP, kUp).addScaledVector(out, kOut).normalize();
      n.setXYZ(i, _n.x, _n.y, _n.z);
      col[i * 3] = bright; col[i * 3 + 1] = bright * (0.98 + 0.04 * rnd()); col[i * 3 + 2] = bright * 0.97;   // per frond brightness, the photo carries the along frond variation
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return add(geo, m);
  };
  // upper ring: 8 fronds up and out, tips sag a little
  for (let i = 0; i < 8; i++) {
    const yaw = (i / 8) * PI * 2 + rr(-0.12, 0.12), pitch = rr(0.78, 1.05);
    const a = i % 2 === 0;
    frond(a ? mFrondA : mFrondB, rr(2.45, 2.7), a ? 1.2 : 1.1, yaw, pitch, rr(0.55, 0.8), 0.14, 0, rr(0.92, 1.12), 0.45, 0.4, 0.3);
  }
  // lower ring: 12 fronds out and drooping, the silhouette of a date palm from 40 m
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * PI * 2 + PI / 12 + rr(-0.1, 0.1), pitch = rr(0.1, 0.42);
    const a = i % 3 !== 1;
    frond(a ? mFrondA : mFrondB, rr(2.65, 2.95), a ? 1.25 : 1.15, yaw, pitch, rr(1.3, 1.75), 0.12, -0.15, rr(0.82, 1.05), 0.45, 0.4, 0.3);
  }
  // dead skirt: six brown fronds hanging against the trunk (the reference crowns carry a skirt all round)
  for (let i = 0; i < 6; i++) {
    const yaw = (i / 6) * PI * 2 + 0.6 + rr(-0.2, 0.2);
    frond(mFrondC, rr(2.1, 2.5), 1.0, yaw, rr(-1.45, -1.15), rr(0.3, 0.55), 0.08, 0, rr(0.8, 1.0), 0.2, 0.65, 0.2);
  }
  // dates: two clusters hanging from the boss, a plane each, the stalk at the top of the photo
  for (let i = 0; i < 2; i++) {
    const a = i * 2.3 + 1.1, r = 0.34;
    const geo = new THREE.PlaneGeometry(0.55, 0.95);
    geo.translate(0, -0.475, 0);                                    // hang from the origin
    const col = new Float32Array(geo.attributes.position.count * 3).fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const n = geo.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, Math.cos(a) * 0.6, 0.5, Math.sin(a) * 0.6);
    const d = add(geo, mDate, cx + Math.cos(a) * r, H + 0.12, cz + Math.sin(a) * r);
    d.rotation.y = -a + PI / 2 + 0.5;
    d.rotation.z = (i ? -1 : 1) * 0.12;
  }

  // ---- foot: sand fillet, an irregular low mound, and a windward drift ----
  const mSand = mat(P.sand, 'ground', 0.95);
  const fillet = new THREE.CylinderGeometry(0.34, 0.78, 0.22, 12, 1);
  const fp = fillet.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x * (1 + 0.1 * Math.sin(z * 9 + x)), fp.getY(i), z * (1 + 0.1 * Math.cos(x * 8))); }
  fillet.computeVertexNormals();
  add(fillet, mSand, 0.03, 0.11, 0.04);
  { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.55, 0); sh.lineTo(0, 0.18); sh.closePath(); const ge = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false }); ge.translate(0, 0, -0.45); add(ge, mSand, 0.32, 0.0, 0.0); }

  // ---- contract: base at y = 0, centred on x and z, measured on vertices ----
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
