/**
 * DERRICK level placements: docs/MAP-PLAN.md section 4 as data.
 *
 * Every entry is { asset, x, z, rot, y, dy, block, moving, tag }.
 *   x, z   world metres, the object's base centre on the ground
 *   rot    degrees about +Y, counter clockwise seen from above, 0 = front (+Z) faces south
 *   y      null means "terrain height at (x, z)"; a number is an absolute y
 *   dy     metres added above the resolved y (stacked modules, things on roofs)
 *   ySample optional [x, z]: sample the terrain there instead of at (x, z) (pipes that
 *          span the wadi take the lip height, not the bed height under their centre)
 *   block  '<bx>_<bz>' per MAP-PLAN section 8, computed once here
 *   tilt   optional degrees of lean (palms), tiltDir the compass direction of the lean
 *   railGaps optional list of world angles (degrees, atan2(z, x)) where a tank ring rail is open
 *   density true on the two scatter assets that the quality tier thins
 *
 * Plan corrections applied here, each written in work/level/NOTES.md:
 *   the derrick south ladder uses rot 0 (its back must face the deck it climbs),
 *   the two derrick to shed bridge catwalks use rot 0 and sit at x -8.5 and -11.5 so they
 *   actually span deck edge (-7) to shed roof edge (-13),
 *   the T1 to T2 bridge uses rot 0 (long axis X spans the tanks along X) and the T2 to T3
 *   bridge uses rot 76 (the bearing from T2 to T3), the watchtower uses rot 0 so its
 *   ladder is on the south side where the section 6 link says it is.
 */

// Pad heights from MAP-PLAN section 3.7: the flat ground every level 2 surface stands on.
export const PADS = {
  derrick: 0.3, shed: 0.3, hardstand: 0.6, pipeYard: 0.2, pumpHouse: 0.3, compound: 0.4,
  watchtower: 0.3, westPlateau: 2.2, eastPlateau: 2.2,
};
const PAD_RECTS = [
  { name: 'derrick', x0: -8, x1: 4, z0: -16, z1: -4 },
  { name: 'shed', x0: -19, x1: -13, z0: -15, z1: -5 },
  { name: 'hardstand', x0: -48, x1: -16, z0: -48, z1: -22 },
  { name: 'pipeYard', x0: -12, x1: 30, z0: -48, z1: -22 },
  { name: 'pumpHouse', x0: -37, x1: -23, z0: 27, z1: 37 },
  { name: 'compound', x0: 26, x1: 56, z0: 24, z1: 50 },
  { name: 'watchtower', x0: 24, x1: 28, z0: -50, z1: -46 },
];
export function padAt(x, z) {
  for (const p of PAD_RECTS) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) return p.name;
  return null;
}
const ROAD = (x, z) => z >= 3 && z <= 9;

export function blockOf(x, z) {
  const bx = Math.max(0, Math.min(6, Math.floor((x + 70) / 20)));
  const bz = Math.max(0, Math.min(5, Math.floor((z + 55) / 20)));
  return { bx, bz, key: `${bx}_${bz}` };
}

// ---------------------------------------------------------------------------
// The wadi path (section 3.5), sampled once so lips, rocks, shrubs and ramps can be derived.
export const WADI_PATH = [
  [-14, -55], [-10, -42], [-4, -30], [4, -22], [11, -12], [14, -2], [14, 8], [16, 18],
  [18, 30], [22, 42], [26, 55],
];
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
const WADI_SAMPLES = (() => {
  const P = WADI_PATH, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < 24; s++) {
      const t = s / 24;
      out.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
})();
/** Wadi centre line at a given z: { x, z, tx, tz, nx, nz } with n pointing to the east bank. */
export function wadiAt(z) {
  const S = WADI_SAMPLES;
  let i = 0;
  while (i < S.length - 2 && S[i + 1][1] < z) i++;
  const a = S[i], b = S[i + 1];
  const t = Math.max(0, Math.min(1, (z - a[1]) / Math.max(1e-6, b[1] - a[1])));
  const x = a[0] + (b[0] - a[0]) * t;
  let tx = b[0] - a[0], tz = b[1] - a[1];
  const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  // normal to the right of the direction of travel (south bound): east side
  const nx = -tz, nz = tx;
  return { x, z, tx, tz, nx: nx < 0 ? -nx : nx, nz: nx < 0 ? -nz : nz };
}
const WADI_HALF_TOP = 4.5;   // top width 9 m

// ---------------------------------------------------------------------------
const list = [];
function P(asset, x, z, rot = 0, o = {}) {
  const e = { asset, x, z, rot, y: null, dy: 0, moving: false, tag: null, ...o };
  e.block = blockOf(x, z).key;
  list.push(e);
  return e;
}
const many = (asset, pts, rot = 0, o = {}) => pts.forEach((p) => P(asset, p[0], p[1], p[2] ?? rot, o));
const cluster = (asset, cx, cz, n, seed) => {   // drums: 3 to 4, 0.7 m apart, not in a row
  const offs = [[0, 0], [0.7, 0.15], [0.3, 0.68], [-0.55, 0.5], [0.95, 0.75]];
  for (let i = 0; i < n; i++) {
    const s = ((seed * 7 + i * 13) % 5);
    P(asset, cx + offs[(i + s) % 5][0], cz + offs[(i + s) % 5][1], (seed * 37 + i * 61) % 360);
  }
};
// Rotation that points an object's +Z (its front) toward a target.
const faceTo = (x, z, tx, tz) => Math.round((Math.atan2(tx - x, tz - z) * 180) / Math.PI);

// 4.1 Centre: the derrick -------------------------------------------------------------------
P('derrick_base_module', -2, -10, 0, { tag: 'derrick_base' });
P('derrick_mid_module', -2, -10, 0, { dy: 4.6, tag: 'derrick_mid' });
P('derrick_crown_module', -2, -10, 0, { dy: 9.2, tag: 'derrick_crown' });
P('external_steel_stair', -8.2, -5.2, 180, { tag: 'derrick_stair_1' });
P('catwalk_section', -8.2, -8.6, 90, { dy: 2.15, tag: 'derrick_landing' });
P('external_steel_stair', -8.2, -12.0, 180, { dy: 2.3, tag: 'derrick_stair_2' });
P('caged_ladder', -2, -4.6, 0, { tag: 'derrick_south_ladder' });          // plan said 180
P('caged_ladder', 2.6, -10, 90, { dy: 4.6, tag: 'derrick_east_ladder' });
P('catwalk_section', -8.5, -10, 0, { dy: 4.45, tag: 'derrick_bridge_1', bridge: true });   // plan: (-11.5) rot 90
P('catwalk_section', -11.5, -10, 0, { dy: 4.45, tag: 'derrick_bridge_2', bridge: true });  // plan: (-14.5) rot 90
P('mud_pump_shed', -16, -10, 90, { tag: 'shed' });
P('caged_ladder', -19.4, -10, 270, { tag: 'shed_west_ladder' });
P('generator_set', -16, -12, 0);
P('valve_manifold', -16, -8, 90);
many('oil_drum', [[-18.5, -13.5, 20], [-18, -6.5, 140], [-13.5, -6.5, 75]]);
P('sandbag_wall', -8, -4, 0);
P('sandbag_wall', 4, -16, 90);
P('crate_stack', 3, -6, 15);
P('ibc_tote', -6, -15, 0);
P('tyre_stack', 3.5, -14, 0);
P('debris_scatter', -5, -5, 30, { density: true });
P('wellhead_christmas_tree', 20, -18, 0);
P('wellhead_christmas_tree', -46, -30, 0);

// 4.2 Centre: the road ----------------------------------------------------------------------
P('fuel_truck_wreck', -26, 8, 70, { tag: 'fuel_truck' });
P('shipping_container_blue', 22, 1, 90, { tag: 'container_blue' });
P('shipping_container_rust_red', 26, 9, 0, { tag: 'container_red' });
P('shipping_container_open', 30, -6, 0, { tag: 'container_open_road' });
P('culvert_crossing', 14, 6, 0, { y: null, tag: 'culvert', wadiBed: true });
many('jersey_barrier', [[-50, 2], [-46, 2], [-42, 2], [-38, 2]]);
many('jersey_barrier', [[38, 10], [42, 10], [46, 10], [50, 10]]);
many('jersey_barrier', [[11, 2], [17, 2], [11, 10], [17, 10]]);
many('jersey_barrier', [[-55, 2], [-55, 10], [55, 2], [55, 10]]);
P('pickup_wreck', 42, 12, 200);
P('pump_jack', 34, -12, 0, { moving: true, tag: 'pump_jack_east' });
P('pump_jack', -40, 18, 90, { moving: true, tag: 'pump_jack_west' });
// floodlight masts, lamps pointing at the derrick pad, the chicane, the tank farm, the pipe yard
P('floodlight_mast', -10, 16, faceTo(-10, 16, -2, -10));
P('floodlight_mast', 38, 14, faceTo(38, 14, 24, 5));
P('floodlight_mast', -24, -24, faceTo(-24, -24, -33, -34));
P('floodlight_mast', 32, -30, faceTo(32, -30, 10, -36));
// debris along the road every 12 m, offset 1 to 2 m from the centre line (z = 6)
many('debris_scatter', [[-46, 7.6, 10], [-34, 4.4, 80], [-20, 7.8, 130], [8, 4.2, 200], [34, 7.4, 260], [46, 4.6, 320]], 0, { density: true });

// 4.3 North lane: tank farm (west) and pipe yard (east) --------------------------------------
P('oil_storage_tank', -40, -40, 0, { tag: 'tank_t1', railGaps: [180, 0] });
P('oil_storage_tank', -27, -40, 0, { tag: 'tank_t2', railGaps: [180, 104] });
P('oil_storage_tank_open', -30, -28, 0, { tag: 'tank_t3', railGaps: [284, 0] });
many('oil_drum', [[-33.2, -28.6, 10], [-33.1, -27.4, 95], [-32.6, -29.6, 200], [-32.4, -26.4, 300]]);   // T3 west wall
many('wooden_pallet_stack', [[-27.2, -28.8, 90], [-27.2, -27.2, 85]]);                                    // T3 east wall
P('debris_scatter', -30, -28.2, 60, { density: true });
P('tank_catwalk_bridge', -33.5, -40, 0, { dy: 4.4, tag: 'bridge_t1_t2' });      // plan: rot 90
P('tank_catwalk_bridge', -28.3, -34, 76, { dy: 4.4, tag: 'bridge_t2_t3' });     // plan: rot 13
P('external_steel_stair', -42, -34.6, 270, { tag: 't1_stair_1' });
P('catwalk_section', -45.2, -36.2, 0, { dy: 2.15, tag: 't1_landing' });
P('external_steel_stair', -45.2, -38.4, 180, { dy: 2.3, tag: 't1_stair_2' });
P('caged_ladder', -25.8, -28, 90, { tag: 't3_east_ladder' });
P('bullet_tank_horizontal', -14, -44, 0);
P('bullet_tank_horizontal', -14, -30, 0);
P('bullet_tank_horizontal', 40, -40, 90);
// pipe run P1 along z = -36; the two pieces over the wadi take the lip height
P('pipe_run_straight', -7, -36, 0, { ySample: [-12.5, -36], tag: 'p1_a' });
P('pipe_run_straight', -1, -36, 0, { ySample: [-1.5, -36], tag: 'p1_b' });
many('pipe_run_straight', [[5, -36], [11, -36], [17, -36], [23, -36]]);
P('pipe_run_elbow', 26, -36, 0);
P('pipe_run_straight', 26, -31, 90);
P('pipe_run_elbow', 26, -26, 90);
// pipe run P2 along z = -26
many('pipe_run_straight', [[23, -26], [17, -26], [11, -26]]);
P('pipe_run_elbow', 8, -26, 180);
P('pipe_run_straight', 8, -23, 90);
P('valve_manifold', 8, -20, 0);
P('pipe_run_straight', -22, -44, 0);
P('pipe_run_straight', -16, -37, 90);
P('pipe_run_elbow', -10, -40, 270);
many('pipe_rack_stack', [[16, -46, 0], [0, -46, 0], [-20, -34, 90]]);
P('valve_manifold', -22, -40, 0);
P('valve_manifold', 44, -30, 0);
P('watchtower_gantry', 26, -48, 0, { tag: 'watchtower' });     // plan said 180; ladder must be south
P('shipping_container_open', 46, -36, 90, { tag: 'container_open_ne' });
P('shipping_container_tan', 50, -22, 45, { tag: 'container_tan' });
P('shipping_container_open', -44, -14, 0, { tag: 'container_open_nw' });
P('generator_set', -22, -28, 0);
P('generator_set', 30, -22, 90);
many('ibc_tote', [[-18, -40], [-16.7, -40], [-18, -38.8], [-16.7, -38.8]]);
many('ibc_tote', [[14, -30], [15.3, -30], [14, -28.8]]);
P('pickup_wreck', -36, -46, 20);
P('tyre_stack', -34, -46, 0);
P('tyre_stack', 24, -42, 0);
many('crate_stack', [[-24, -46, 10], [6, -42, 35], [30, -44, 5], [-46, -22, 70]]);
cluster('oil_drum', -36, -34, 3, 1);
cluster('oil_drum', -20, -46, 3, 2);
cluster('oil_drum', 10, -40, 3, 3);
cluster('oil_drum', 28, -30, 3, 4);
cluster('oil_drum', 42, -46, 3, 5);
P('sandbag_wall', -30, -22, 0);
P('sandbag_wall', 22, -22, 0);
P('sandbag_wall', 26, -45, 0);
for (let i = 0; i < 10; i++) P('corrugated_wall_panel', -46.5 + i * 3, -50, 0);        // tank farm north screen
for (let i = 0; i < 4; i++) P('corrugated_wall_panel', -18.5 + i * 3, -16, 0);         // shed wind break
for (let i = 0; i < 14; i++) P('barbed_wire_fence_section', -14.5 + i * 3, -54, 0);   // north edge fence
for (let i = 0; i < 6; i++) P('barbed_wire_fence_section', -16.5 + i * 3, 54, 0);     // south edge, x -18..0

// 4.4 South lane: pump station (west) and workers' compound (east) --------------------------
P('pump_house_building', -30, 32, 0, { tag: 'pump_house' });
P('generator_set', -33, 34, 0);
P('control_cabinet', -35.5, 30, 90);
P('control_cabinet', -35.5, 31.5, 90);
P('office_desk', -27, 30, 180);
P('locker_bank', -31, 35.6, 180);
P('steel_shelving', -26.5, 35.6, 180);
many('oil_drum', [[-34.2, 29, 15], [-33.5, 29.4, 120], [-34.1, 29.7, 240]]);
many('ammo_crate', [[-25.6, 31.4, 10], [-25.6, 30.9, 5]]);
P('debris_scatter', -30, 32, 100, { density: true });
P('external_steel_stair', -37.2, 34.4, 0, { tag: 'pump_stair_1' });
P('catwalk_section', -36.6, 36.9, 0, { dy: 2.15, tag: 'pump_landing' });
P('external_steel_stair', -33.3, 36.9, 90, { dy: 2.3, tag: 'pump_stair_2' });
P('sandbag_wall', -26, 29, 0, { dy: 4.6 });
P('crate_stack', -34, 30, 20, { dy: 4.6 });
many('large_pipe_section', [[-12, 24], [-4, 24], [4, 24], [12, 24]]);
// compound wall, 2.4 m concrete
many('compound_wall_panel', [[26, 26], [26, 36], [26, 40], [26, 44], [26, 48]], 90);               // west, gap z 28..34
many('compound_wall_panel', [[28, 24], [32, 24], [36, 24], [40, 24], [52, 24], [54, 24]], 0);      // north, gap x 44..50
many('compound_wall_panel', [[28, 50], [38, 50], [42, 50], [46, 50], [50, 50], [54, 50]], 0);      // south, gap x 30..36
many('compound_wall_panel', [[56, 26], [56, 30], [56, 34], [56, 38], [56, 42], [56, 46]], 90);     // east
P('sandbag_wall', 27.5, 31, 120);      // inside the west gap, offset 1.5 m, angled 30 degrees
P('sandbag_wall', 47, 25.5, 30);       // north gap
P('sandbag_wall', 33, 48.5, 330);      // south gap
P('bunkhouse_building', 38, 36, 0, { tag: 'bunkhouse' });
many('bunk_bed', [[32.5, 33.5, 90], [32.5, 38.5, 90], [35.5, 33.5, 270], [35.5, 38.5, 270]]);
P('locker_bank', 34, 39.6, 180);
many('ammo_crate', [[33.4, 39.4, 5], [34.1, 39.4, 0], [34.8, 39.4, 8]]);
P('mess_table', 41, 36, 0);
P('mess_table', 41, 38.8, 0);
P('steel_shelving', 44.6, 34, 270);
P('steel_shelving', 44.6, 38, 270);
P('office_desk', 39, 32.8, 0);
P('locker_bank', 43, 39.6, 180);
P('control_cabinet', 44.6, 36, 270);
many('oil_drum', [[43, 33.2, 40], [43.6, 33.5, 160]]);
P('debris_scatter', 34, 36, 45, { density: true });
P('debris_scatter', 41, 37.4, 190, { density: true });
P('external_steel_stair', 46.2, 38.4, 0, { tag: 'bunk_stair_1' });
P('catwalk_section', 45.6, 40.9, 0, { dy: 2.15, tag: 'bunk_landing' });
P('external_steel_stair', 42.3, 40.9, 270, { dy: 2.3, tag: 'bunk_stair_2' });
P('sandbag_wall', 34, 32.3, 0, { dy: 4.6 });
P('sandbag_wall', 42, 32.3, 0, { dy: 4.6 });
P('crate_stack', 38, 37, 30, { dy: 4.6 });
P('tyre_stack', 32, 39, 0, { dy: 4.6 });
many('ibc_tote', [[35, 29], [36.3, 29], [35, 30.2]]);
cluster('oil_drum', 48, 46, 4, 6);
many('crate_stack', [[50, 28, 25], [30, 46, 80]]);
many('wooden_pallet_stack', [[52, 44, 10], [29, 40, 95]]);
P('tyre_stack', 46, 30, 0);
P('debris_scatter', 40, 44, 15, { density: true });
P('debris_scatter', 30, 28, 250, { density: true });
P('tyre_stack', -4, 22, 0);
P('tyre_stack', 18, 44, 0);
P('crate_stack', -8, 40, 40);
P('crate_stack', 10, 36, 5);
// trench parapets, three groups of four at 2.2 m pitch on the north lip
for (let i = 0; i < 4; i++) P('sandbag_wall', -44 + i * 2.2, 48.1, 0, { ySample: [-44 + i * 2.2, 47.6] });
for (let i = 0; i < 4; i++) P('sandbag_wall', -20 + i * 2.2, 50.1, 0, { ySample: [-20 + i * 2.2, 49.6] });
for (let i = 0; i < 4; i++) P('sandbag_wall', 8 + i * 2.2, 48.1, 0, { ySample: [8 + i * 2.2, 47.6] });
many('sandbag_wall', [[16, 28, 300], [20, 32, 60], [-6, 22, 0], [6, 22, 0]]);
P('wooden_pallet_stack', -14, 46, 20);
P('wooden_pallet_stack', 4, 46, 70);
cluster('oil_drum', -22, 40, 3, 7);
cluster('oil_drum', 0, 44, 3, 8);
cluster('oil_drum', 12, 30, 3, 9);

// 4.5 Spawns and map edge -------------------------------------------------------------------
many('crate_stack', [[-62, -6, 10], [-62, 8, 100]]);
cluster('oil_drum', -60, 0, 4, 10);
P('sandbag_wall', -58, -10, 90);
P('sandbag_wall', -58, 10, 90);
P('wooden_pallet_stack', -64, 12, 30);
many('crate_stack', [[62, -6, 190], [62, 8, 280]]);
cluster('oil_drum', 60, 0, 4, 11);
P('sandbag_wall', 58, -10, 270);
P('sandbag_wall', 58, 10, 270);
P('wooden_pallet_stack', 64, -12, 60);
many('rock_outcrop_large', [[-64, -46, 0], [-60, -40, 30], [60, -48, 0], [64, -42, 300], [64, 40, 0], [50, 52, 0], [-64, 40, 0]]);
for (let i = 0; i < 4; i++) P('barbed_wire_fence_section', 69, -12.5 + i * 3, 90);
for (let i = 0; i < 4; i++) P('barbed_wire_fence_section', 69, 3.5 + i * 3, 90);
for (let i = 0; i < 6; i++) P('barbed_wire_fence_section', -44.5 + i * 3, 54, 0);
for (let i = 0; i < 4; i++) P('barbed_wire_fence_section', -69, -4.5 + i * 3, 90);
// small rocks: 12 on the wadi lips alternating banks, 4 on the plateau edges
{
  const zs = [-48, -38, -28, -20, -12, -6, 4, 14, 26, 38, 44, 50];
  zs.forEach((z, i) => {
    const w = wadiAt(z), side = i % 2 === 0 ? 1 : -1, out = WADI_HALF_TOP + 0.9;
    P('rock_outcrop_small', +(w.x + w.nx * out * side).toFixed(2), +(z + w.nz * out * side).toFixed(2), (i * 53) % 360);
  });
  many('rock_outcrop_small', [[-59, -18, 20], [-59, 18, 200], [59, -18, 110], [59, 18, 290]]);
}

// 4.6 Foliage and detail --------------------------------------------------------------------
{
  const palms = [[-52, -14, 8, 40], [-56, 20, 11, 200], [50, -20, 6, 120], [52, 18, 9, 300], [-12, 30, 12, 70], [8, -48, 5, 250], [44, 44, 10, 160]];
  palms.forEach(([x, z, tilt, dir], i) => P('palm_tree', x, z, (i * 97) % 360, { tilt, tiltDir: dir }));
  // dead shrubs: 18 on the wadi lips (every 6 m of path, alternating banks, 1 to 2 m out), never inside a pad
  const shrubs = [];
  for (let i = 0; i < 18; i++) {
    const z = -50 + i * 6, w = wadiAt(z), side = i % 2 === 0 ? -1 : 1, out = WADI_HALF_TOP + 1 + (i % 3) * 0.5;
    const x = w.x + w.nx * out * side, zz = z + w.nz * out * side;
    if (!padAt(x, zz) && !ROAD(x, zz)) shrubs.push([x, zz, (i * 71) % 360]);
  }
  const plateau = [[-57, -12], [-57, -4], [-57, 4], [-57, 12], [57, -12], [57, -4], [57, 4], [57, 12]];
  const rocks = [[-60, -43], [-56, -38], [58, -44], [61, 37], [47, 49], [-60, 37]];
  const open = [[-30, 13], [-8, 16], [10, 18], [30, 18], [-50, 30], [12, -14], [36, -6], [-36, 14],
    [-20, 16], [20, 16], [-44, 28], [8, 42], [-2, 14], [24, 40], [-52, 40], [40, 2]];
  const all = shrubs.concat(plateau, rocks, open);
  for (let i = 0; i < 40 && i < all.length; i++) {
    const [x, z] = all[i];
    P('dead_shrub', +x.toFixed(2), +z.toFixed(2), (i * 37) % 360, { density: true });
  }
  // debris in the wadi bed and in the open, to make 20 with the ones listed above
  many('debris_scatter', [[-6, -36, 20], [17, 22, 140], [-44, -8, 60], [-52, 26, 200], [24, -14, 300], [52, 6, 90], [-20, 30, 170]], 0, { density: true });
  // ammo crates beyond the five the plan lists, to reach the TSV count
  many('ammo_crate', [[-63, -8, 20], [-63, 6, 100], [63, -8, 200], [63, 6, 280], [26.6, -47.2, 10], [1.5, -14.2, 30], [43.6, 35.2, 90]], 0);
  // drums in the wadi bed (5.4) beside the debris
  many('oil_drum', [[12.4, -8, 20], [21.3, 40, 100]]);
}

// tags: unique names for anything not named explicitly
{
  const n = new Map();
  for (const e of list) {
    if (e.tag) continue;
    const k = (n.get(e.asset) || 0) + 1; n.set(e.asset, k);
    e.tag = `${e.asset}_${k}`;
  }
}

export const PLACEMENTS = list;

/** Count of placements per asset, to compare with docs/OBJECTS.tsv count_in_map. */
export function countByAsset() {
  const c = {};
  for (const e of list) c[e.asset] = (c[e.asset] || 0) + 1;
  return c;
}

// ---------------------------------------------------------------------------
// Walkables: roofs, decks, rings, bridges, landings. y is absolute (pad height + level).
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const rotRect = (cx, cz, w, d, deg) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([x, z]) => [+(cx + x * c + z * s).toFixed(3), +(cz - x * s + z * c).toFixed(3)]);
};
const annulusQuarters = (cx, cz, r0, r1, y, name) => {
  const out = [];
  for (let q = 0; q < 4; q++) {
    const a0 = (q * Math.PI) / 2, a1 = ((q + 1) * Math.PI) / 2, poly = [];
    for (let i = 0; i <= 4; i++) { const a = a0 + ((a1 - a0) * i) / 4; poly.push([+(cx + r1 * Math.cos(a)).toFixed(3), +(cz + r1 * Math.sin(a)).toFixed(3)]); }
    for (let i = 4; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / 4; poly.push([+(cx + r0 * Math.cos(a)).toFixed(3), +(cz + r0 * Math.sin(a)).toFixed(3)]); }
    out.push({ polygon: poly, y, name: `${name}_q${q}`, island: name });
  }
  return out;
};
export const WALKABLES = [
  { polygon: rect(-7, 3, -15, -5), y: PADS.derrick + 4.6, name: 'derrick_p1', island: 'derrick_p1' },
  { polygon: rect(-6, 2, -14, -6), y: PADS.derrick + 9.2, name: 'derrick_p2', island: 'derrick_p2' },
  { polygon: rect(-19, -13, -15, -5), y: PADS.shed + 4.6, name: 'shed_roof', island: 'shed_roof' },
  { polygon: rect(-13, -7, -10.6, -9.4), y: PADS.derrick + 4.6, name: 'derrick_shed_bridge', island: 'derrick_p1' },
  { polygon: rect(-8.8, -7.6, -10.1, -7.1), y: PADS.derrick + 2.3, name: 'derrick_landing', island: 'derrick_landing' },
  { polygon: rect(-36, -24, 28, 36), y: PADS.pumpHouse + 4.6, name: 'pump_house_roof', island: 'pump_house_roof' },
  { polygon: rect(-38.1, -35.1, 36.3, 37.5), y: PADS.pumpHouse + 2.3, name: 'pump_landing', island: 'pump_landing' },
  { polygon: rect(31, 45, 32, 40), y: PADS.compound + 4.6, name: 'bunkhouse_roof', island: 'bunkhouse_roof' },
  { polygon: rect(44.1, 47.1, 40.3, 41.5), y: PADS.compound + 2.3, name: 'bunk_landing', island: 'bunk_landing' },
  { polygon: rect(24.5, 27.5, -49.5, -46.5), y: PADS.watchtower + 4.6, name: 'watchtower_deck', island: 'watchtower_deck' },
  ...annulusQuarters(-40, -40, 3.5, 4.5, PADS.hardstand + 4.6, 't1_ring'),
  ...annulusQuarters(-27, -40, 3.5, 4.5, PADS.hardstand + 4.6, 't2_ring'),
  ...annulusQuarters(-30, -28, 3.5, 4.5, PADS.hardstand + 4.6, 't3_ring'),
  { polygon: rect(-36, -31, -40.6, -39.4), y: PADS.hardstand + 4.6, name: 'bridge_t1_t2', island: 'bridge_t1_t2' },
  { polygon: rotRect(-28.3, -34, 5, 1.2, 76), y: PADS.hardstand + 4.6, name: 'bridge_t2_t3', island: 'bridge_t2_t3' },
  { polygon: rect(-46.7, -43.7, -36.8, -35.6), y: PADS.hardstand + 2.3, name: 't1_landing', island: 't1_landing' },
];

// ---------------------------------------------------------------------------
// Links: MAP-PLAN section 6. y null = terrain height there (build.js resolves it in place).
const L = (name, type, from, to, width, bots = true, extra = {}) => ({ name, type, from, to, width, bots, ...extra });
const wadiRamp = (name, z, side, along = null) => {
  // side: -1 west bank, +1 east bank. A 20 degree ramp 6 m long along the path direction.
  const w = wadiAt(z);
  const lipOut = WADI_HALF_TOP + 0.5, bedIn = 1.6;
  const from = [+(w.x + w.nx * lipOut * side).toFixed(2), null, +(z + w.nz * lipOut * side).toFixed(2)];
  const to = [+(w.x + w.nx * bedIn * side).toFixed(2), null, +(z + w.nz * bedIn * side).toFixed(2)];
  return L(name, 'slope', from, to, 6, true, { terrainY: true, along });
};
export const LINKS = [
  L('derrick_stair_1', 'stair', [-8.2, PADS.derrick, -3.4], [-8.2, PADS.derrick + 2.3, -7.0], 1.2),
  L('derrick_stair_2', 'stair', [-8.2, PADS.derrick + 2.3, -10.2], [-8.2, PADS.derrick + 4.6, -13.8], 1.2),
  L('derrick_south_ladder', 'ladder', [-2, PADS.derrick, -4.2], [-2, PADS.derrick + 4.6, -5.2], 0.8, 'slow'),
  L('derrick_east_ladder', 'ladder', [2.6, PADS.derrick + 4.6, -10], [2.0, PADS.derrick + 9.2, -10], 0.8, 'slow'),
  L('derrick_shed_bridge', 'catwalk', [-7, PADS.derrick + 4.6, -10], [-13, PADS.shed + 4.6, -10], 1.2),
  L('shed_west_ladder', 'ladder', [-19.4, PADS.shed, -10], [-18.8, PADS.shed + 4.6, -10], 0.8, 'slow'),
  L('t1_stair_1', 'stair', [-40.2, PADS.hardstand, -34.6], [-43.8, PADS.hardstand + 2.3, -34.6], 1.2),
  L('t1_stair_2', 'stair', [-45.2, PADS.hardstand + 2.3, -36.6], [-45.2, PADS.hardstand + 4.6, -40.2], 1.2),
  L('bridge_t1_t2', 'catwalk', [-36, PADS.hardstand + 4.6, -40], [-31, PADS.hardstand + 4.6, -40], 1.2),
  L('bridge_t2_t3', 'catwalk', [-29, PADS.hardstand + 4.6, -36], [-30, PADS.hardstand + 4.6, -32], 1.2),
  L('t3_east_ladder', 'ladder', [-25.8, PADS.hardstand, -28], [-26.4, PADS.hardstand + 4.6, -28], 0.8, 'slow'),
  L('pump_stair_1', 'stair', [-37.2, PADS.pumpHouse, 32.6], [-37.2, PADS.pumpHouse + 2.3, 36.2], 1.2),
  L('pump_stair_2', 'stair', [-35.1, PADS.pumpHouse + 2.3, 36.9], [-31.5, PADS.pumpHouse + 4.6, 36.9], 1.2),
  L('bunk_stair_1', 'stair', [46.2, PADS.compound, 36.6], [46.2, PADS.compound + 2.3, 40.2], 1.2),
  L('bunk_stair_2', 'stair', [44.1, PADS.compound + 2.3, 40.9], [40.5, PADS.compound + 4.6, 40.9], 1.2),
  L('watchtower_ladder', 'ladder', [26, PADS.watchtower, -46.2], [26, PADS.watchtower + 4.6, -47], 0.8, 'slow'),
  wadiRamp('wadi_north_ford_w', -33, -1),
  wadiRamp('wadi_north_ford_e', -33, 1),
  wadiRamp('wadi_north_entry', -46, -1),
  wadiRamp('wadi_derrick_entry', -16, -1),
  wadiRamp('wadi_south_ford_w', 30, -1),
  wadiRamp('wadi_south_ford_e', 30, 1),
  wadiRamp('wadi_south_entry', 48, 1),
  L('culvert', 'tunnel', [14, null, 10], [14, null, 2], 2.4, true, { terrainY: true, clear: 2.0 }),
  L('trench_ramp_w', 'slope', [-49, null, 49], [-46, null, 49], 1.6, true, { terrainY: true }),
  L('trench_ramp_e', 'slope', [33, null, 49], [30, null, 49], 1.6, true, { terrainY: true }),
  L('trench_ramp_side', 'slope', [-12, null, 48.4], [-12, null, 51], 1.6, true, { terrainY: true }),
];

// ---------------------------------------------------------------------------
// Spawns: eight per team, 1 m behind an object, yaw in the same degrees convention as rot
// (0 faces south, 90 faces east, 270 faces west). Rangers look east, Militia look west.
export const SPAWNS = {
  rangers: [[-63, -6, 90], [-63, 8, 90], [-61.5, 0, 90], [-59.5, -10, 90], [-59.5, 10, 90], [-65, 12, 90], [-64, -11, 90], [-66, 2, 90]],
  militia: [[63, -6, 270], [63, 8, 270], [61.5, 0, 270], [59.5, -10, 270], [59.5, 10, 270], [65, -12, 270], [64, 11, 270], [66, -2, 270]],
};

export const BOUNDARY = { minX: -66, maxX: 66, minZ: -52, maxZ: 52 };

export const INTERIORS = [
  { name: 'pump_house', polygon: rect(-35.7, -24.3, 28.3, 35.7), lamp: [-27, PADS.pumpHouse + 3.2, 30], floor: PADS.pumpHouse },
  { name: 'bunk_room', polygon: rect(31.3, 36.9, 32.3, 39.7), lamp: [34, PADS.compound + 3.2, 36], floor: PADS.compound },
  { name: 'mess_room', polygon: rect(37.1, 44.7, 32.3, 39.7), lamp: [41, PADS.compound + 3.2, 36], floor: PADS.compound },
  { name: 'tank_t3', polygon: annulusQuarters(-30, -28, 0, 3.8, 0, 'x').flatMap((q) => q.polygon.slice(0, 5)), lamp: null, floor: PADS.hardstand },
  { name: 'culvert', polygon: rect(12.8, 15.2, 2, 10), lamp: null, floor: null },
];

// ---------------------------------------------------------------------------
// Cover points: one per side of every cover object, normal pointing from the point through
// the object toward the threat it protects from. Generated from PLACEMENTS.
const COVER_ASSETS = {
  sandbag_wall: { sides: 'front', h: 1.0 }, jersey_barrier: { sides: 'front', h: 0.82 },
  crate_stack: { sides: 'all', h: 1.3 }, tyre_stack: { sides: 'all', h: 1.2 }, ibc_tote: { sides: 'all', h: 1.16 },
  generator_set: { sides: 'front', h: 1.9 },
  pipe_run_straight: { sides: 'front', h: 1.5 }, large_pipe_section: { sides: 'front', h: 1.6 },
  bullet_tank_horizontal: { sides: 'front', h: 3.2 }, wooden_pallet_stack: { sides: 'all', h: 0.6 },
  valve_manifold: { sides: 'front', h: 1.6 }, wellhead_christmas_tree: { sides: 'all', h: 2.4 },
  fuel_truck_wreck: { sides: 'front', h: 3.2 }, pickup_wreck: { sides: 'front', h: 1.8 },
  shipping_container_blue: { sides: 'front', h: 2.59 }, shipping_container_rust_red: { sides: 'front', h: 2.59 },
  shipping_container_tan: { sides: 'front', h: 2.59 }, shipping_container_open: { sides: 'front', h: 2.59 },
  compound_wall_panel: { sides: 'front', h: 2.4 }, corrugated_wall_panel: { sides: 'front', h: 2.4 },
  rock_outcrop_large: { sides: 'front', h: 3.0 }, rock_outcrop_small: { sides: 'front', h: 1.0 },
  pipe_rack_stack: { sides: 'front', h: 1.6 }, pump_jack: { sides: 'front', h: 6 }, oil_storage_tank: { sides: 'all', h: 4.6 },
  oil_storage_tank_open: { sides: 'all', h: 4.6 }, culvert_crossing: { sides: 'ends', h: 2.6 },
};
const SIZES = {   // w x d from docs/OBJECTS.tsv for the cover set (metres)
  sandbag_wall: [2, 0.6], jersey_barrier: [3, 0.6], crate_stack: [1.2, 1], tyre_stack: [1, 1], ibc_tote: [1.2, 1],
  oil_drum: [0.585, 0.585], generator_set: [3.2, 1.2], pipe_run_straight: [6, 0.9], large_pipe_section: [8, 1.5],
  bullet_tank_horizontal: [8, 2.6], wooden_pallet_stack: [1.2, 0.8], valve_manifold: [2.4, 1], wellhead_christmas_tree: [1.2, 1.2],
  fuel_truck_wreck: [8, 2.5], pickup_wreck: [5.2, 2], shipping_container_blue: [6.06, 2.44], shipping_container_rust_red: [6.06, 2.44],
  shipping_container_tan: [6.06, 2.44], shipping_container_open: [6.06, 2.44], compound_wall_panel: [4, 0.4],
  corrugated_wall_panel: [3, 0.15], rock_outcrop_large: [8, 5], rock_outcrop_small: [2, 1.5], pipe_rack_stack: [6, 2],
  pump_jack: [9, 2.6], oil_storage_tank: [8, 8], oil_storage_tank_open: [8, 8], culvert_crossing: [3.4, 8],
};
export const COVER_POINTS = (() => {
  const out = [];
  for (const e of list) {
    const spec = COVER_ASSETS[e.asset];
    if (!spec || e.dy > 0) continue;   // drums are too small to be cover on their own
    const [w, d] = SIZES[e.asset];
    const a = (e.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const toWorld = (lx, lz) => [e.x + lx * c + lz * s, e.z - lx * s + lz * c];
    const localSides = spec.sides === 'front' ? [[0, 1], [0, -1]] : spec.sides === 'ends' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [lx, lz] of localSides) {
      const half = lx !== 0 ? w / 2 : d / 2;
      const off = half + 0.55;
      const [px, pz] = toWorld(-lx * off, -lz * off);            // stand on this side
      const [nx0, nz0] = toWorld(lx, lz);                          // normal through the object
      const nx = nx0 - e.x, nz = nz0 - e.z;
      const base = padAt(px, pz);
      out.push({
        x: +px.toFixed(2), z: +pz.toFixed(2), y: base ? PADS[base] : null,
        nx: +nx.toFixed(3), nz: +nz.toFixed(3),
        height: spec.h >= 1.3 ? 'high' : 'low', asset: e.asset, tag: e.tag,
      });
    }
  }
  return out;
})();

// Sightline pairs from MAP-PLAN section 5, checked by build.js at eye height.
// y values: 'p1' 'p2' 'roof:<name>' 'ring' or null (terrain at the point).
export const SIGHTLINES = [
  { name: 'T1/T2 bridge (T2 ring south end) to derrick pad', a: [-27.5, PADS.hardstand + 4.6, -35.8], b: [-9, PADS.derrick, -5], expect: true },
  { name: 'watchtower deck to P1', a: [26, PADS.watchtower + 4.6, -48], b: [11, null, -35], expect: true },
  { name: 'watchtower deck to P2', a: [26, PADS.watchtower + 4.6, -48], b: [17, null, -27], expect: true },
  { name: 'derrick P1 to north ford', a: [-6.5, PADS.derrick + 4.6, -14], b: [-5.5, null, -33], expect: true },
  { name: 'derrick P2 to T2 ring', a: [-5.5, PADS.derrick + 9.2, -11], b: [-27, PADS.hardstand + 4.6, -35.6], expect: true },
  { name: 'derrick P1 west down the road', a: [-6.5, PADS.derrick + 4.6, -6], b: [-22, null, 4.2], expect: true },
  { name: 'derrick P1 east down the road', a: [2.5, PADS.derrick + 4.6, -6], b: [20, null, 6.5], expect: true },
  { name: 'derrick P2 to pump house roof', a: [-3.5, PADS.derrick + 9.2, -7.5], b: [-30, PADS.pumpHouse + 4.6, 32], expect: true },
  { name: 'derrick P2 to bunkhouse roof', a: [0, PADS.derrick + 9.2, -7.5], b: [38, PADS.compound + 4.6, 36], expect: true },
  { name: 'pump house roof to south ford', a: [-25, PADS.pumpHouse + 4.6, 33], b: [13.5, null, 31], expect: true },
  { name: 'pump house roof to compound west gap', a: [-25, PADS.pumpHouse + 4.6, 32], b: [25.5, null, 31], expect: true },
  { name: 'bunkhouse roof to south ford', a: [32, PADS.compound + 4.6, 33], b: [18.5, null, 30], expect: true },
  { name: 'bunkhouse roof to trench east ramp', a: [33, PADS.compound + 4.6, 39], b: [32, null, 49], expect: true },
  { name: 'north lane end to end along z -40', a: [-57, null, -40], b: [50, null, -40], expect: false },
  { name: 'Rangers north exit to watchtower deck', a: [-58, null, -16], b: [26, PADS.watchtower + 4.6, -48], expect: false },
  { name: 'Militia north exit to T1/T2 bridge', a: [58, null, -16], b: [-33.5, PADS.hardstand + 4.6, -40], expect: false },
  { name: 'road end to end', a: [-54, null, 6], b: [54, null, 6], expect: false },
  { name: 'pump house roof to bunkhouse roof', a: [-27, PADS.pumpHouse + 4.6, 32], b: [36, PADS.compound + 4.6, 36], expect: false, fix: 'south_mound_rack' },
  { name: 'south lane end to end along z 32', a: [-58, null, 32], b: [58, null, 32], expect: false },
];
