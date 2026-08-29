/**
 * Contact fillets (owner: level). Round 17 item 1 (terrain inspection): "nothing meets the ground". Every solid
 * prop gets a ring of sand around its footprint: the inner edge hugs the base 6 cm up the object, the outer edge
 * lies on the terrain 35 cm out, a quarter cosine between, every vertex sampling the terrain so the ring follows
 * the slope. Sand set through the 'ground' recipe, merged into the prop's block by bakeStatic (one extra bucket
 * per block at most). The prop itself is sunk 4 cm (level/build.js) so the fillet has something to climb.
 * Round 15's flat shelf pads are gone except under objects on real slopes (footprint_pads.js, regenerated).
 */
import * as THREE from 'three';

/** assets that get a fillet, with the footprint shape: rect from the TSV size, or a round base of radius r */
export const FILLET_ASSETS = {
  crate_stack: {}, wooden_pallet_stack: {}, oil_drum: { r: 0.3 }, tyre_stack: { r: 0.5 }, ibc_tote: {}, sandbag_wall: { width: 0.5 },
  jersey_barrier: {}, generator_set: {}, control_cabinet: {}, ammo_crate: {}, locker_bank: {}, steel_shelving: {},
  shipping_container_blue: {}, shipping_container_rust_red: {}, shipping_container_tan: {}, shipping_container_open: {},
  oil_storage_tank: { r: 4.0, width: 0.6 }, oil_storage_tank_open: { r: 4.0, width: 0.6 }, bullet_tank_horizontal: {},
  pump_house_building: { width: 0.5 }, bunkhouse_building: { width: 0.5 }, mud_pump_shed: { width: 0.5 },
  compound_wall_panel: {}, corrugated_wall_panel: { width: 0.25 }, fuel_truck_wreck: {}, pickup_wreck: {},
  valve_manifold: {}, wellhead_christmas_tree: {}, pipe_rack_stack: { width: 0.3 }, large_pipe_section: { width: 0.3 },
  pump_jack: {}, floodlight_mast: { r: 0.7 }, watchtower_gantry: { width: 0.4 }, derrick_base_module: { width: 0.5 },
  palm_tree: { r: 0.42, width: 0.5, lift: 0.05 },   // 18c: a low collar; the 16 cm one read as a hat on a slope   // sunk 25 cm (build.js), a wider, taller fillet over the buried boots rock_outcrop_large: { width: 0.6 }, rock_outcrop_small: { width: 0.4 },
};

const _v = new THREE.Vector3();

/**
 * p: placement (x, z, rot in degrees), size: [w, d] metres, spec: FILLET_ASSETS entry, heightAt(x, z), baseY of the prop.
 * Returns a Mesh in world space (position 0) or null when the footprint is too small.
 */
export function makeFillet(p, size, spec, heightAt, baseY) {
  const width = spec.width || 0.35, lift = spec.lift || 0.06;
  const a = (p.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const toWorld = (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
  // the inner outline: a rounded rectangle (or a circle) sampled every ~0.35 m, with the outward normal
  const pts = [];
  if (spec.r) {
    const r = spec.r * (p.scale || 1), n = Math.max(12, Math.round((2 * Math.PI * r) / 0.35));
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([r * Math.cos(t), r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
  } else {
    const hw = (size[0] * (p.scale || 1)) / 2 + 0.02, hd = (size[1] * (p.scale || 1)) / 2 + 0.02;
    if (hw < 0.15 || hd < 0.08) return null;
    const cr = Math.min(0.15, hw, hd);   // corner radius
    const side = (x0, z0, x1, z1, nx, nz) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.35)); for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, nx, nz]); } };
    const arc = (cx, cz, a0) => { for (let i = 0; i < 3; i++) { const t = a0 + (i / 3) * (Math.PI / 2); pts.push([cx + cr * Math.cos(t), cz + cr * Math.sin(t), Math.cos(t), Math.sin(t)]); } };
    side(-hw + cr, -hd, hw - cr, -hd, 0, -1); arc(hw - cr, -hd + cr, -Math.PI / 2);
    side(hw, -hd + cr, hw, hd - cr, 1, 0); arc(hw - cr, hd - cr, 0);
    side(hw - cr, hd, -hw + cr, hd, 0, 1); arc(-hw + cr, hd - cr, Math.PI / 2);
    side(-hw, hd - cr, -hw, -hd + cr, -1, 0); arc(-hw + cr, -hd + cr, Math.PI);
  }
  const RINGS = 3, pos = [], idx = [], n = pts.length;
  for (let r = 0; r <= RINGS; r++) {
    const t = r / RINGS;                             // 0 at the object, 1 at the outer edge
    const prof = 1 - Math.sin(t * Math.PI / 2);      // quarter cosine: steep at the object, flat at the edge
    for (let i = 0; i < n; i++) {
      const [lx, lz, nx, nz] = pts[i];
      const [x, z] = toWorld(lx + nx * width * t, lz + nz * width * t);
      const g = heightAt(x, z);
      // the inner ring follows the terrain up the object (never a flat plate over a drop: the object is sunk to the low side)
      const y = t === 0 ? g + lift : g + lift * prof;
      pos.push(x, y + 0.01, z);
    }
  }
  for (let r = 0; r < RINGS; r++) for (let i = 0; i < n; i++) {
    const a0 = r * n + i, a1 = r * n + (i + 1) % n, b0 = a0 + n, b1 = a1 + n;
    idx.push(a0, a1, b0, a1, b1, b0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // round 19 item 5: the trampled set (named outright, materials.js honours a set name) and a darker tone, so the
  // collar reads as disturbed ground at the foot of the object instead of a pale ring on the sand
  const mat = new THREE.MeshStandardMaterial({ color: 0xa8926c, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
  mat.name = 'sand_disturbed';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fillet_' + (p.tag || p.asset);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

/**
 * Stilts (round 22i, Ben: "what if we just create pillars underneath them that extend through the ground, we could
 * just do this for all to be safe and then everyone would be grounded?"). For a prop that stands on legs or
 * saddles, a short concrete pier is dropped at each corner of its footprint wherever the terrain there sits below
 * the prop's base, running from the base down to 40 cm INTO the ground. Nothing floats, whatever the dunes do,
 * and no terrain is reshaped: this is the safe version of the pad sweep the owner reverted.
 */
export const STILT_ASSETS = new Set(['pipe_run_straight', 'pipe_run_elbow', 'large_pipe_section', 'pipe_rack_stack',
  'valve_manifold', 'bullet_tank_horizontal', 'wellhead_christmas_tree', 'generator_set', 'mess_table', 'office_desk',
  'steel_shelving', 'locker_bank', 'tank_catwalk_bridge', 'catwalk_section', 'external_steel_stair', 'watchtower_gantry']);

export function makeStilts(p, size, heightAt, baseY, THREE_ = THREE, height = 1.5) {
  // Round 22j, to Ben's drawing: a column directly UNDER each of the prop's own feet, the width of its base plate,
  // running from just under the plate straight down into the sand. Not a thin post beside the object (22i) and not
  // a pale block stopping at the surface (the first cut): a pier the pipe visibly stands on.
  const a = (p.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const k = p.scale || 1;
  const hw = (size[0] * k) / 2, hd = (size[1] * k) / 2;
  if (hw <= 0.2 || hd <= 0.1) return null;
  // where the asset's own feet are: a long run carries saddles near its ends and at the middle, a compact prop
  // stands on four corner feet, both inset from the outline the way a base plate is
  const inset = 0.45;
  const feet = hw > hd * 2
    ? [[-(hw - inset), 0], [0, 0], [hw - inset, 0]]
    : [[-(hw - inset), -(hd - 0.3)], [hw - inset, -(hd - 0.3)], [hw - inset, hd - 0.3], [-(hw - inset), hd - 0.3]];
  const geos = [];
  for (const [lx, lz] of feet) {
    const x = p.x + lx * c + lz * s, z = p.z - lx * s + lz * c;
    const g = heightAt(x, z);
    const top = baseY + 0.12;             // just under the foot plate
    const bottom = Math.min(g, baseY) - 0.5;
    const h = top - bottom;
    if (h < 0.75) continue;               // the ground is close enough under this foot: the fillet covers it
    const w = Math.min(0.45, Math.max(0.28, (hd * 2) * 0.45));
    const box = new THREE_.BoxGeometry(w, h, w);
    box.translate(x, bottom + h / 2, z);
    geos.push(box);
  }
  if (!geos.length) return null;
  const merged = new THREE_.BufferGeometry();
  const pos = [], idx = []; let base = 0;
  for (const g of geos) {
    const gp = g.attributes.position, gi = g.index;
    for (let i = 0; i < gp.count; i++) pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
    for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
    base += gp.count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE_.Float32BufferAttribute(pos, 3));
  merged.setIndex(idx);
  merged.computeVertexNormals();
  const mat = new THREE_.MeshStandardMaterial({ color: 0x6b6f74, roughness: 0.85, metalness: 0.25 });
  mat.name = 'metal';
  const mesh = new THREE_.Mesh(merged, mat);
  mesh.name = 'stilts_' + (p.tag || p.asset);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
