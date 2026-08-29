/**
 * Footprint pads (owner: world). Round 15, Ben 2026-08-29 14:22: "some objects don't sit correctly on the ground,
 * they overhang in places, adjust the ground accordingly". Measured with work/ground_probe3.js (tools/shot.mjs
 * --eval): every placed object whose footprint had the terrain more than 12 cm above or below its base. Each one
 * (round 22g, Ben's pipe photo: every prop that stands on LEGS or saddles (pipe runs, manifolds, racks, horizontal
 * tanks, generators) also gets a flat pad wherever the terrain under its footprint varies by more than 14 cm, with a
 * 2.5 m blend: a fillet cannot hide a leg that ends 40 cm above the sand. Overlapping pads are MERGED into one
 * rectangle at their mean height, or neighbours step into each other and lift the ground under the next prop's legs.)
 * (round 17 item 1: only objects on a REAL slope, terrain range over 0.5 m under the footprint, keep a pad, with a
 * 3 m blend; the rest rely on the contact fillets in level/fillets.js) gets a flat sand pad at its base height with a 0.8 m blend, 40 cm beyond the footprint. mode 'fill' only raises ground, 'cut' only lowers it, 'flat' does both, so a pad
 * cannot drag a neighbour's ground the wrong way (the first flat version pulled the tank farm 3 m down). Objects that legitimately
 * span the wadi cut (the pipe yard racks and lines over it, the derrick pad edge) are excluded by tag (work/ground_probe3.js). Generated, do not edit
 * by hand: rerun the probe and regenerate (work/ground_bad.json holds the measurement).
 */
export const FOOTPRINT_PADS = [
{
"name": "merged fp bullet_tank_horizontal_1",
"x0": -25.5,
"x1": -9.5,
"z0": -45.8,
"z1": -42.2,
"y": -1.364,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp bullet_tank_horizontal_2",
"x0": -25.3,
"x1": -7.6,
"z0": -41.0,
"z1": -27.3,
"y": 0.108,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp compound_wall_panel_3",
"x0": 25.4,
"x1": 26.6,
"z0": 37.6,
"z1": 46.4,
"y": -0.899,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp tank_e1",
"x0": 39.2,
"x1": 57.2,
"z0": -41.2,
"z1": -18.59,
"y": 0.158,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp jersey_barrier_1",
"x0": -56.9,
"x1": -48.1,
"z0": 0.0,
"z1": 2.7,
"y": 2.928,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp compound_wall_panel_12",
"x0": 25.6,
"x1": 34.42,
"z0": 44.92,
"z1": 50.6,
"y": -0.969,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp jersey_barrier_8",
"x0": 48.1,
"x1": 56.9,
"z0": 9.3,
"z1": 10.7,
"y": 2.248,
"surface": "sand",
"blend": 2.5,
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
"name": "merged fp mast_road_e",
"x0": 25.6,
"x1": 52.73,
"z0": -7.6,
"z1": -1.75,
"y": 1.864,
"surface": "sand",
"blend": 2.5,
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
"name": "merged fp sandbag_wall_16",
"x0": -21.4,
"x1": -12.0,
"z0": 49.4,
"z1": 50.8,
"y": -0.845,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp sandbag_wall_22",
"x0": 6.6,
"x1": 16.0,
"z0": 47.4,
"z1": 48.8,
"y": -0.914,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp ibc_tote_15",
"x0": -51.2,
"x1": -31.66,
"z0": -15.6,
"z1": -7.92,
"y": 1.648,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged fp sandbag_wall_14",
"x0": -45.4,
"x1": -36.0,
"z0": 47.4,
"z1": 48.8,
"y": -0.933,
"surface": "sand",
"blend": 2.5,
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
"name": "legs bullet_tank_horizontal_3",
"x0": 38.2,
"x1": 41.8,
"z0": -44.5,
"z1": -35.5,
"y": 0.254,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged legs p1_a",
"x0": -10.5,
"x1": 8.5,
"z0": -36.95,
"z1": -35.05,
"y": -1.084,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "legs pipe_run_straight_7",
"x0": 7.5,
"x1": 14.5,
"z0": -25.35,
"z1": -23.45,
"y": 0.208,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "legs generator_set_3",
"x0": 29.9,
"x1": 32.1,
"z0": -23.1,
"z1": -18.9,
"y": 0.178,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "merged legs large_pipe_section_1",
"x0": -25.5,
"x1": 16.5,
"z0": 16.5,
"z1": 25.25,
"y": -0.035,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "legs pipe_rack_stack_4",
"x0": -44.5,
"x1": -37.5,
"z0": -20.5,
"z1": -17.5,
"y": 0.939,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "legs p4_elbow",
"x0": -7.32,
"x1": -3.32,
"z0": -4.4,
"z1": -0.4,
"y": 0.044,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
},
{
"name": "legs p4_b",
"x0": 1.84,
"x1": 8.84,
"z0": -2.17,
"z1": -0.27,
"y": -0.05,
"surface": "sand",
"blend": 2.5,
"mode": "flat"
}
];
