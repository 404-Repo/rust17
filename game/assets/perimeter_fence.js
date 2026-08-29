// perimeter_fence: a 10 m run of security fence as ONE alpha card (card:fence_panel, a chain link photo cut out
// through Atlas) between three coded posts, for the ring around the whole map edge (round 18d, Ben: "run the fence
// all the way along the edge of the map to enclose the area"). The coded barbed_wire_fence_section is 9k
// triangles a section; 160 of those around the boundary would be 1.4M, this is 60 a section. The card is double
// sided and alpha tested by the material system (game/src/render/materials.js CARDS.fence_panel), lit as fabric.
export default function (THREE) {
  const g = new THREE.Group();
  const M = (hex, name, r, m) => { const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m }); if (name) mat.name = name; return mat; };
  const galv = M(0x9ea3a1, 'metal', 0.72, 0.55);
  const conc = M(0xb9b2a2, 'stone', 0.9, 0.0);
  const card = (name, hex) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, vertexColors: true }); m.name = 'card:' + name; return m; };
  const L = 10, H = 3.0;
  // the card: one quad, uv 0..1, vertex colours white (the material system tints by the asset colour)
  // three quads of L/3 each with the full photo (the card texture clamps, so no uv repeat): the photo is a 3.5 m
  // wide, 3 m tall run with two posts, so each quad shows two mesh panels
  const cm = card('fence_panel', 0xffffff);
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(L / 3, H, 1, 1);
    const col = new Float32Array(geo.attributes.position.count * 3).fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, cm);
    mesh.position.set(-L / 2 + (i + 0.5) * (L / 3), H / 2, 0);
    g.add(mesh);
  }
  // three posts with footings, at the ends and the middle, so the run reads as built where the card is thin
  for (const x of [-L / 2, 0, L / 2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, H + 0.1, 8), galv); post.position.set(x, (H + 0.1) / 2, 0); g.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), conc); foot.position.set(x, 0.075, 0); g.add(foot);
  }
  // ---- contract: base at y=0, centred on x and z ----
  const box3 = new THREE.Box3().setFromObject(g);
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
