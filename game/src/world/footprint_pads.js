/**
 * Footprint pads (owner: world). Round 15, Ben 2026-08-29 14:22: "some objects don't sit correctly on the ground,
 * they overhang in places, adjust the ground accordingly". Measured with work/ground_probe3.js (tools/shot.mjs
 * --eval): every placed object whose footprint had the terrain more than 12 cm above or below its base. Each one
 * (round 17 item 1: only objects on a REAL slope, terrain range over 0.5 m under the footprint, keep a pad, with a
 * 3 m blend; the rest rely on the contact fillets in level/fillets.js) gets a flat sand pad at its base height with a 0.8 m blend, 40 cm beyond the footprint. mode 'fill' only raises ground, 'cut' only lowers it, 'flat' does both, so a pad
 * cannot drag a neighbour's ground the wrong way (the first flat version pulled the tank farm 3 m down). Objects that legitimately
 * span the wadi cut (the pipe yard racks and lines over it, the derrick pad edge) are excluded by tag (work/ground_probe3.js). Generated, do not edit
 * by hand, except the last entry: round 22h, ONE pad under the manifold Ben photographed at (-35.5, -11), whose
 * downhill legs hung 42 cm clear. A sweep of all 28 leg standing props was tried and reverted at his request:
 * "i want you to have only changed that single pipe i pointed out, no other props". The probe that finds them is
 * work/legs_probe.js if it is ever wanted again.
 * Rerun the probe and regenerate (work/ground_bad.json holds the measurement).
 */
export const FOOTPRINT_PADS = [
{
"name": "fp bullet_tank_horizontal_1",
"x0": -18.4,
"x1": -9.6,
"z0": -45.7,
"z1": -42.3,
"y": -1.852,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp bullet_tank_horizontal_2",
"x0": -16.4,
"x1": -7.6,
"z0": -30.7,
"z1": -27.3,
"y": -0.319,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp compound_wall_panel_3",
"x0": 25.4,
"x1": 26.6,
"z0": 37.6,
"z1": 42.4,
"y": 0.229,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp compound_wall_panel_4",
"x0": 25.4,
"x1": 26.6,
"z0": 41.6,
"z1": 46.4,
"y": -2.027,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp tank_e1",
"x0": 46.8,
"x1": 57.2,
"z0": -41.2,
"z1": -30.8,
"y": -0.165,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_1",
"x0": -51.9,
"x1": -48.1,
"z0": 1.3,
"z1": 2.7,
"y": 1.978,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp compound_wall_panel_12",
"x0": 25.6,
"x1": 30.4,
"z0": 49.4,
"z1": 50.6,
"y": -1.984,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_8",
"x0": 48.1,
"x1": 51.9,
"z0": 9.3,
"z1": 10.7,
"y": 1.81,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_13",
"x0": -56.9,
"x1": -53.1,
"z0": 1.3,
"z1": 2.7,
"y": 2.958,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_15",
"x0": 53.1,
"x1": 56.9,
"z0": 1.3,
"z1": 2.7,
"y": 2.91,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_16",
"x0": 53.1,
"x1": 56.9,
"z0": 9.3,
"z1": 10.7,
"y": 2.686,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp mast_road_e",
"x0": 50.27,
"x1": 52.73,
"z0": -6.73,
"z1": -4.27,
"y": 3.065,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp jersey_barrier_14",
"x0": -56.9,
"x1": -53.1,
"z0": 9.3,
"z1": 10.7,
"y": 2.633,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp compound_wall_panel_6",
"x0": 25.6,
"x1": 30.4,
"z0": 23.4,
"z1": 24.6,
"y": 0.417,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp east_line_b",
"x0": 33.6,
"x1": 42.4,
"z0": -4.15,
"z1": -1.85,
"y": 1.941,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp tyre_stack_10",
"x0": -57.4,
"x1": -55.6,
"z0": -9.9,
"z1": -8.1,
"y": 2.471,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp mast_road_w",
"x0": -51.36,
"x1": -48.64,
"z0": 10.64,
"z1": 13.36,
"y": 1.733,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp tyre_stack_7",
"x0": 17.1,
"x1": 18.9,
"z0": 43.1,
"z1": 44.9,
"y": -0.156,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp container_open_road",
"x0": 26.55,
"x1": 33.45,
"z0": -7.6,
"z1": -4.4,
"y": 1.065,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_16",
"x0": -21.4,
"x1": -18.6,
"z0": 49.4,
"z1": 50.8,
"y": -0.88,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_22",
"x0": 11.0,
"x1": 13.8,
"z0": 47.4,
"z1": 48.8,
"y": -0.904,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_23",
"x0": 13.2,
"x1": 16.0,
"z0": 47.4,
"z1": 48.8,
"y": -0.882,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp container_tan",
"x0": 46.59,
"x1": 53.41,
"z0": -25.41,
"z1": -18.59,
"y": 0.552,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_19",
"x0": -14.8,
"x1": -12.0,
"z0": 49.4,
"z1": 50.8,
"y": -0.844,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp ibc_tote_15",
"x0": -33.74,
"x1": -31.66,
"z0": -10.05,
"z1": -8.15,
"y": 1.758,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_14",
"x0": -41.0,
"x1": -38.2,
"z0": 47.4,
"z1": 48.8,
"y": -0.951,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_15",
"x0": -38.8,
"x1": -36.0,
"z0": 47.4,
"z1": 48.8,
"y": -0.938,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_20",
"x0": 6.6,
"x1": 9.4,
"z0": 47.4,
"z1": 48.8,
"y": -0.943,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp east_line_a",
"x0": 25.6,
"x1": 34.4,
"z0": -4.15,
"z1": -1.85,
"y": 1.107,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_13",
"x0": -43.2,
"x1": -40.4,
"z0": 47.4,
"z1": 48.8,
"y": -0.927,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_17",
"x0": -19.2,
"x1": -16.4,
"z0": 49.4,
"z1": 50.8,
"y": -0.827,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_18",
"x0": -17.0,
"x1": -14.2,
"z0": 49.4,
"z1": 50.8,
"y": -0.828,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_21",
"x0": 8.8,
"x1": 11.6,
"z0": 47.4,
"z1": 48.8,
"y": -0.928,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_12",
"x0": -45.4,
"x1": -42.6,
"z0": 47.4,
"z1": 48.8,
"y": -0.915,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp pump_jack_west",
"x0": -41.7,
"x1": -38.3,
"z0": 13.1,
"z1": 22.9,
"y": 0.797,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp tank_e2",
"x0": 39.2,
"x1": 46.8,
"z0": -30.8,
"z1": -23.2,
"y": 0.147,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_9",
"x0": 31.58,
"x1": 34.42,
"z0": 47.34,
"z1": 49.66,
"y": -0.087,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp pump_jack_east",
"x0": 29.1,
"x1": 38.9,
"z0": -13.7,
"z1": -10.3,
"y": 0.978,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp ibc_tote_3",
"x0": -18.9,
"x1": -16.9,
"z0": -40.9,
"z1": -39.1,
"y": -0.155,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp east_line_c",
"x0": 41.6,
"x1": 50.4,
"z0": -4.15,
"z1": -1.85,
"y": 2.07,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp wellhead_west",
"x0": -51.2,
"x1": -49.2,
"z0": -12.0,
"z1": -10.0,
"y": 1.846,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp crate_stack_18",
"x0": -53.68,
"x1": -51.52,
"z0": 0.0,
"z1": 2.0,
"y": 3.849,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp crate_stack_21",
"x0": -35.0,
"x1": -33.0,
"z0": -10.08,
"z1": -7.92,
"y": 2.007,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp container_red",
"x0": 22.55,
"x1": 29.45,
"z0": 7.4,
"z1": 10.6,
"y": 0.583,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp container_open_nw",
"x0": -47.45,
"x1": -40.55,
"z0": -15.6,
"z1": -12.4,
"y": 1.345,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp sandbag_wall_2",
"x0": 3.3,
"x1": 4.7,
"z0": -17.4,
"z1": -14.6,
"y": -1.975,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp ibc_tote_5",
"x0": -18.9,
"x1": -16.9,
"z0": -39.7,
"z1": -37.9,
"y": 0.124,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp ibc_tote_2",
"x0": -20.2,
"x1": -18.2,
"z0": -40.9,
"z1": -39.1,
"y": 0.294,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "fp crate_stack_9",
"x0": 29.0,
"x1": 31.0,
"z0": 44.92,
"z1": 47.08,
"y": -0.836,
"surface": "sand",
"blend": 3.0,
"mode": "flat"
},
{
"name": "legs p3_manifold",
"x0": -37.3,
"x1": -33.7,
"z0": -12.1,
"z1": -9.9,
"y": 1.899,
"surface": "sand",
"blend": 2.0,
"mode": "flat"
}
];
