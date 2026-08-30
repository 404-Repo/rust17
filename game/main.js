/**
 * DERRICK  main.js  (owner: game)
 *
 * Boot order per docs/ARCHITECTURE.md: tier, renderer, sky, lighting, terrain, world, level
 * (progress to the loading screen), player, viewmodel, weapons, fx, bots and squads, HUD,
 * mode, telemetry. Then window.__READY__ and window.__START__. The DEPLOY button starts
 * play: pointer lock on a desktop, the touch pad on a phone, mode.start().
 *
 * Frame: dt = min(real, 0.05) for the simulation, fps from the real elapsed time.
 * Order: input -> player -> weapons -> viewmodel -> bots -> squads -> movers -> mode ->
 * fx -> sky -> lighting.update(camera) -> post.render -> hud -> telemetry -> consume.
 *
 * Everything loads relative to this folder: ./assets, ./assetlib.js, ./src/...
 */
import * as THREE from 'three';
import { TIERS, detectTier, getTier, applyTierToRenderer } from './src/render/quality.js?v=r24-202608300031';
import { createLightingRig, SUN_COLOR, SKY_COLOR, SUN_INTENSITY, SKY_INTENSITY, sunDirection } from './src/render/lighting.js?v=r24-202608300031';
import { createSky } from './src/render/sky.js?v=r24-202608300031';
import { createPost } from './src/render/post.js?v=r24-202608300031';
import { TERRAIN_SPEC, buildTerrain } from './src/world/terrain.js?v=r24-202608300031';
import { createSkirt } from './src/world/skirt.js?v=r24-202608300031';   // round 17 item 5: ground beyond the map edge
import { createFarBand } from './src/level/farband.js?v=r24-202608300031';   // round 24: oilfield landmarks at 150 to 400 m
import { World } from './src/world/collision.js?v=r24-202608300031';
import { buildLevel } from './src/level/build.js?v=r24-202608300031';
import { PLACEMENTS, LINKS, WALKABLES, SPAWNS, COVER_POINTS, BOUNDARY } from './src/level/placements.js?v=r24-202608300031';
import { Player } from './src/player/controller.js?v=r24-202608300031';
import { WeaponSystem, WEAPONS } from './src/player/weapons.js?v=r24-202608300031';
import { Viewmodel } from './src/player/viewmodel.js?v=r24-202608300031';
import { FX } from './src/player/fx.js?v=r24-202608300031';
import { NavGrid } from './src/ai/navgrid.js?v=r24-202608300031';
import { Bot } from './src/ai/bot.js?v=r24-202608300031';
import { SquadManager } from './src/ai/squad.js?v=r24-202608300031';
import { Input, RAD_PER_PX } from './src/ui/input.js?v=r24-202608300031';
import { TouchControls } from './src/ui/touch.js?v=r24-202608300031';
import { HUD } from './src/ui/hud.js?v=r24-202608300031';
import { Screens } from './src/ui/screens.js?v=r24-202608300031';
import { Events } from './src/game/events.js?v=r24-202608300031';
import { TDM } from './src/game/mode.js?v=r24-202608300031';
import { createTelemetry } from './src/game/telemetry.js?v=r24-202608300031';
import { Audio } from './src/game/audio.js?v=r24-202608300031';
import { ASSET } from './assetlib.js?v=r24-202608300031';
import { vertexiseMaterials } from './src/game/bake.js?v=r24-202608300031';
import { preloadMaterials, applyTerrainMaterial, applyMaterials } from './src/render/materials.js?v=r24-202608300031';   // materials r3

const ROUND = (globalThis.__BUILD_STAMP__ || 'r19-dev').split('-')[0];   // the round label on the HUD and screens comes from the publish stamp (was a hardcoded 'r6' for thirteen rounds)
const DEG = Math.PI / 180;
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ screens first, so #load shows
const screens = new Screens(document.body, { round: ROUND });
screens.loading(0.01, 'Starting');

const events = new Events();
const tierName = detectTier();
const tier = { ...getTier(tierName) };
if (params.get('casc')) tier.cascades = +params.get('casc');
if (params.get('sd')) tier.shadowDist = +params.get('sd');
if (params.get('density')) tier.density = +params.get('density');
console.info(`[main] tier ${tier.name}`);

// ------------------------------------------------------------------ renderer, scene, camera
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.post, powerPreference: 'high-performance', stencil: false });
applyTierToRenderer(renderer, tier);
renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.02, 420);
camera.rotation.order = 'YXZ';
scene.add(camera);                                   // the viewmodel is a child of the camera

const sky = createSky(THREE, { scene, tier });
// round 15 (Ben: "generate nice sky with atlas"): an Atlas equirect panorama (textures/sky_equirect.jpg, Seedream 5
// Pro 2:1 4K, horizon remapped to the middle row, seam blended) as the scene background; the analytic dome is
// hidden, the hills ring and the motes stay, the rig keeps its own environment map and fill. '?sky=dome' = before.
// The panorama's sun sits at u 0.254 of the width; backgroundRotation turns it onto the rig's azimuth.
if (params.get('hills') === 'off' && sky.hills) sky.hills.visible = false;   // debug
if (params.get('sky') === 'black') { scene.background = new THREE.Color(0x000000); if (sky.mesh) sky.mesh.visible = false; }
else if (params.get('sky') !== 'dome') {
  new THREE.TextureLoader().load('./textures/sky_equirect.jpg', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    scene.background = tex;
    const sunU = 0.263;   // measured on the shipped texture (work/sky, brightest blob in the sky half); the sky half is warped so its sun sits at the rig's 22 degrees
    // equirect u runs with atan2(dir.z, dir.x) in three; the sun direction in world is sunDirection(); solve the yaw so u(sun) lands on sunU
    const sd = sunDirection(THREE); const sunYaw = Math.atan2(sd.z, sd.x);                 // world yaw of the sun
    const texYaw = (sunU - 0.5) * Math.PI * 2;                                            // yaw the panorama places its sun at (u 0.5 = +x axis, three's equirect convention)
    // checked with tools/shot.mjs '?skyrot=' sweeps: three samples the rotated direction, so the sun lands at sunYaw - texYaw - PI
    scene.backgroundRotation = new THREE.Euler(0, +(params.get('skyrot') || (sunYaw - texYaw - Math.PI)), 0);
    if (sky.mesh) sky.mesh.visible = false;
    console.info(`[sky] atlas panorama on, rotation ${(scene.backgroundRotation.y * 180 / Math.PI).toFixed(0)} deg (sun yaw ${(sunYaw * 180 / Math.PI).toFixed(0)}, tex sun yaw ${(texYaw * 180 / Math.PI).toFixed(0)}); '?sky=dome' for the analytic dome, '?skyrot=' to override`);
  });
}
const rig = createLightingRig(THREE, { scene, renderer, camera, tier });
const post = createPost(THREE, { renderer, scene, camera, tier });
// integrator r1: the environment map lives in the lighting rig now (its own analytic dome
// through PMREM, cool zenith and warm ground bounce); the cream sky PMREM that used to be built
// here flooded every shadow with warm light (render notes, round 1) and is gone.
screens.loading(0.04, 'Lighting');
await preloadMaterials(tier);   // materials r3: the 14 texture sets, before anything that calls applyMaterials
screens.loading(0.06, 'Materials');

// ------------------------------------------------------------------ terrain and world
await new Promise((r) => setTimeout(r, 0));
// integrator: 0.5 m cells on high, 1.0 m on the phone. The world agent built at 0.25 m (493 k
// triangles) for the ruts; at 0.5 m the ruts are still one cell wide and the map costs 123 k,
// which is what the 1.7 M in view budget can afford next to 1.8 M of props. heightAt stays exact.
const TERRAIN_CELL = +(params.get('cell') || (tier.name === 'phone' ? 1.0 : 0.5));
const terrain = buildTerrain(THREE, { ...TERRAIN_SPEC, cell: TERRAIN_CELL });
for (const t of terrain.tiles) {
  if (tier.name === 'phone') t.castShadow = false;   // the render notes' first lever; banks still shade from their normals
  scene.add(t);
}
// round 17 item 2: where the sand is trampled (disturbed tile): building doors, cover points, spawns, rack and machine feet
const DISTURB = [];
for (const [x, z] of [[-23.2, 34], [-30, 27.2], [30.2, 34], [41, 31.2], [25.2, 31], [47, 23.2], [33, 50.8], [-30, -23.4], [-27.2, -25.2], [14, 1.4], [14, 10.6], [-8.2, -3.0], [-19.9, -10], [-2, -3.9]]) DISTURB.push([x, z, 2.4]);
for (const c of COVER_POINTS) DISTURB.push([c.x, c.z, 1.5]);
for (const team of Object.values(SPAWNS)) for (const [x, z] of team) DISTURB.push([x, z, 2.6]);
for (const p of PLACEMENTS) if (!p.dy && /pipe_rack_stack|generator_set|control_cabinet|crate_stack|wooden_pallet_stack|ibc_tote|valve_manifold|wellhead_christmas_tree|shipping_container_open/.test(p.asset)) DISTURB.push([p.x, p.z, 2.0]);
// round 19 item 2: worn paths, a 1.1 m wide band from every door to its two nearest cover points and from every spawn
// to its nearest door, so the ground between where people stand is walked ground
{
  const DOORS = [[-23.2, 34], [-30, 27.2], [30.2, 34], [41, 31.2], [25.2, 31], [47, 23.2], [33, 50.8], [-30, -23.4], [-27.2, -25.2], [14, 1.4], [14, 10.6], [-8.2, -3.0], [-19.9, -10], [-2, -3.9]];
  const near = (x, z, pts, k) => pts.map((p) => [Math.hypot(p[0] - x, p[1] - z), p]).sort((a, b) => a[0] - b[0]).slice(0, k).map((a) => a[1]);
  const cov = COVER_POINTS.map((c) => [c.x, c.z]);
  for (const [x, z] of DOORS) for (const [cx, cz] of near(x, z, cov, 2)) if (Math.hypot(cx - x, cz - z) < 30) DISTURB.push([x, z, cx, cz, 1.1]);
  for (const team of Object.values(SPAWNS)) for (const [x, z] of team) { const [d] = near(x, z, DOORS, 1); if (d && Math.hypot(d[0] - x, d[1] - z) < 60) DISTURB.push([x, z, d[0], d[1], 1.0]); }
}
applyTerrainMaterial(terrain, tier, { disturb: DISTURB });   // materials r3: sand_sunlit and sand_packed tiles on the terrain's own material; r17: + sand_disturbed
if (params.get('skirt') !== 'off') { const skirt = createSkirt(terrain); if (params.get('skirt') !== 'plain') applyMaterials(skirt, { asset: 'map_skirt' }); scene.add(skirt); }   // round 17 item 5 ('?skirt=off|plain' to debug)
// round 24b (Ben: "roll back 2 - these objects in the distance don't look great"): the far band is OFF by default.
// '?farband=on' brings it back (level/farband.js is untouched and still builds in one merged mesh).
if (params.get('farband') === 'on') { const fb = createFarBand(terrain); applyMaterials(fb, { asset: 'far_band' }); scene.add(fb); console.info(`[farband] ${fb.userData.tris} triangles`); }
const world = new World(terrain);
// Shadow caster proxy for the ground: the 0.25 m tiles receive shadows but do not cast them
// (that was ~0.5 M triangles per cascade); a 1 m sampling of the same heightfield, lowered
// 0.1 m so the fine ground never sits under it, casts the wadi banks' shade on the bed. It
// lives on layer 1, which only the CSM shadow cameras see.
if (tier.name !== 'phone') {
  for (const t of terrain.tiles) t.castShadow = false;
  const proxy = buildShadowProxy(terrain, Math.max(1, Math.round(1 / TERRAIN_CELL)), 0.1);
  proxy.layers.set(1);
  scene.add(proxy);
  for (const l of rig.csm.lights) l.shadow.camera.layers.enable(1);
}
screens.loading(0.08, 'Terrain');
await new Promise((r) => setTimeout(r, 0));

function buildShadowProxy(T, stride, drop) {
  const G = T.grid;
  const nx = Math.floor((G.nx - 1) / stride) + 1, nz = Math.floor((G.nz - 1) / stride) + 1;
  const pos = new Float32Array(nx * nz * 3);
  let k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const ix = Math.min(G.nx - 1, i * stride), iz = Math.min(G.nz - 1, j * stride);
    pos[k++] = G.minX + ix * G.cell; pos[k++] = G.heights[iz * G.nx + ix] - drop; pos[k++] = G.minZ + iz * G.cell;
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  m.name = 'terrain_shadow_proxy'; m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false;
  return m;
}

// ------------------------------------------------------------------ level
const level = await buildLevel(THREE, {
  scene, world, terrain, quality: tier,
  onProgress: (t, label) => screens.loading(0.08 + t * 0.62, label),
});
rig.refresh();
if (level.missing && level.missing.length) console.warn('[main] missing assets:', level.missing.join(', '));
screens.loading(0.72, 'Nav grid');
await new Promise((r) => setTimeout(r, 0));

// ------------------------------------------------------------------ nav grid (after buildLevel: slope and tunnel link heights are filled in place)
const nav = NavGrid.build({ world, terrain, placements: PLACEMENTS, links: LINKS, walkables: WALKABLES, boundary: BOUNDARY, cell: 1.0, coverPoints: COVER_POINTS });
if (params.get('nav') === '1') scene.add(nav.debugMesh(THREE));

// ------------------------------------------------------------------ input
const input = new Input(canvas);
const touch = new TouchControls(document.body);
const isTouch = () => touch.enabled;
const controls = () => (touch.enabled ? touch : input);

// ------------------------------------------------------------------ player, fx, viewmodel, weapons
const fx = new FX({ scene, quality: tier, terrain, camera });
fx.setCamera(camera);
fx.setLighting({ sun: SUN_COLOR, sky: SKY_COLOR, sunI: SUN_INTENSITY, skyI: SKY_INTENSITY });
const player = new Player({ camera, world, input, events, terrain, fx });
player.sens = RAD_PER_PX;                             // one constant for mouse, arrows and touch (ui/input.js)
const viewmodel = new Viewmodel({ camera, quality: tier });
screens.loading(0.76, 'Arms and weapons');
await viewmodel.load();
rig.refresh();
const bots = [];
const hostiles = () => bots.filter((b) => b.team !== player.team);
const weapons = new WeaponSystem({ player, world, targets: hostiles, events, viewmodel, fx });
weapons.setScene(scene);

// ------------------------------------------------------------------ mode, bots, squads
const mode = new TDM({ events, target: 30, seconds: 420, respawnDelay: 4.0 });
mode.register({ id: 'player', name: 'You', team: 'rangers' });
const WEAPON_PLAN = ['ar', 'smg', 'ar', 'dmr', 'ar'];
const mkBot = (name, team, i) => new Bot({ id: name.toLowerCase(), name, team, scene, world, nav, events, quality: tier, weaponKey: WEAPON_PLAN[i % WEAPON_PLAN.length], fx });   // round 24: bots get the effects too
mode.botNames.rangers.forEach((n, i) => bots.push(mkBot(n, 'rangers', i + 1)));
mode.botNames.militia.forEach((n, i) => bots.push(mkBot(n, 'militia', i)));
for (const b of bots) mode.register(b.entity());
screens.loading(0.8, 'Soldiers');
{
  let done = 0;
  await Promise.all(bots.map((b) => b.load().then(() => { done++; screens.loading(0.8 + 0.14 * done / bots.length, 'Soldiers'); })
    .catch((e) => console.warn('[main] bot load failed', b.id, e && e.message))));
}
rig.refresh();
const spawnsRad = (team) => SPAWNS[team].map(([x, z, d]) => [x, z, d * DEG]);
const squads = {
  rangers: new SquadManager({ bots: bots.filter((b) => b.team === 'rangers'), team: 'rangers', nav, events, spawns: spawnsRad('rangers'), respawnDelay: mode.respawnDelay, world }),
  militia: new SquadManager({ bots: bots.filter((b) => b.team === 'militia'), team: 'militia', nav, events, spawns: spawnsRad('militia'), respawnDelay: mode.respawnDelay, world }),
};

/** MAP-PLAN section 7: farthest from any enemy with no enemy line of sight; else the fewest enemies within 30 m. */
const ROAD_VERGE_W = [-54, 3];
function pickPlayerSpawn() {
  const enemies = hostiles().filter((b) => b.alive);
  const list = SPAWNS.rangers;
  let best = null, bestD = -Infinity, fallback = null, fewest = Infinity;
  const eye = new THREE.Vector3(), ee = new THREE.Vector3();
  for (const s of list) {
    const [x, z] = s;
    const y = world.groundY(x, z);
    eye.set(x, y + 1.65, z);
    let minD = Infinity, near = 0, seen = false;
    for (const e of enemies) {
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d < minD) minD = d;
      if (d < 30) near++;
      if (!seen) { ee.set(e.pos.x, e.pos.y + 1.6, e.pos.z); if (world.lineOfSight(eye, ee)) seen = true; }
    }
    // integrator r1: among the points no enemy can see, the human takes the one nearest the
    // west end of the road's north verge (-54, 3): the road is the human's lane (the rangers
    // squad takes the flanks, see squad.js) and MAP-PLAN section 10 describes the walk east
    // from there. The section 7 "farthest from any enemy" rule put the player behind the new
    // west tower with no view of the road, and four runs in five never met a hostile.
    const score = -Math.hypot(x - ROAD_VERGE_W[0], z - ROAD_VERGE_W[1]);
    if (!seen && score > bestD) { bestD = score; best = s; }
    if (near < fewest) { fewest = near; fallback = s; }
  }
  return best || fallback || list[0];
}

function placeBotsAtSpawns() {
  for (const team of ['rangers', 'militia']) {
    const list = spawnsRad(team);
    let k = team === 'rangers' ? 1 : 0;              // the player takes a rangers slot
    for (const b of bots) {
      if (b.team !== team) continue;
      const s = list[k++ % list.length];
      b.respawn(s[0], s[1], s[2]);
    }
  }
}

function spawnPlayer() {
  // round 11: '?spawn=x,z,yawDeg' (map plan yaw, 0 = facing south) puts the player somewhere exact, for tools/shot.mjs
  const sp = (params.get('spawn') || '').split(',').map(Number);
  const s = sp.length >= 2 && sp.every((v) => !Number.isNaN(v)) ? [sp[0], sp[1], sp[2] || 0] : pickPlayerSpawn();
  player.spawnAt(s[0], s[1], s[2] * DEG);
  hurt = 0;
}

// ------------------------------------------------------------------ HUD and audio
const hud = new HUD(document.body, { round: ROUND, playerName: 'You', playerTeam: 'rangers' });
const audio = new Audio({ events, player });
let hurt = 0;
const botById = (id) => bots.find((b) => b.id === id);

events.on('kill', (p) => {
  hud.killFeed(p);
  if (p.killer && p.killer.id === 'player') {
    hud.hitMarker('kill');
    hud.showNotice(p.headshot ? 'Headshot' : 'Eliminated', p.victim ? p.victim.name : '');
  }
});
events.on('hit', (p) => { if (p.by === 'player' || (p.by && p.by.id === 'player')) hud.hitMarker(p.part === 'head' ? 'headshot' : 'hit'); });
events.on('damage', (p) => {
  if (!p.target || (p.target !== player && p.target.id !== 'player')) return;
  hurt = Math.min(1, hurt + 0.25 + (p.amount || 0) / 120);
  if (p.fromPos) {
    const dx = p.fromPos.x - player.pos.x, dz = p.fromPos.z - player.pos.z;
    // player frame: forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw)
    const fwd = -Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz;
    const right = Math.cos(player.yaw) * dx - Math.sin(player.yaw) * dz;
    hud.damageFrom(Math.atan2(right, fwd));
  }
});
events.on('death', (p) => {
  if (!p || p.id !== 'player') return;
  const killer = botById(p.by);
  screens.death({ killer: killer ? killer.name : (p.by === 'fall' ? 'the fall' : p.by === 'player' ? 'your own grenade' : null), weapon: p.weapon, respawnIn: mode.respawnDelay });
  hurt = 1;
});
events.on('roundEnd', (p) => {
  audio.roundEnd();   // round 21: the sting and the end cue
  screens.roundEnd({
    winner: p.winner, rangers: p.rangers, militia: p.militia,
    kills: mode.playerStats.kills, deaths: mode.playerStats.deaths, accuracy: mode.accuracy(),
    scoreboard: mode.scoreboard(), team: 'rangers',
  });
});

// ------------------------------------------------------------------ start, restart
let started = false;
const ctx = { player, bots, time: 0 };
let simTime = 0;
placeBotsAtSpawns();
spawnPlayer();
camera.updateMatrixWorld(true);


function startGame() {
  if (started) return;
  started = true;
  audio.deploy();   // round 21: deploy thunk, the in game bed, the ambience
  hud.show(true);
  touch.show(true);
  mode.reset();
  mode.start();
  if (!isTouch()) input.requestPointerLock();
  canvas.focus && canvas.focus();
}
function restartRound() {
  mode.reset();
  for (const b of bots) b.deadT = 0;
  placeBotsAtSpawns();
  for (const s of Object.values(squads)) { s.derrickHolder = null; for (const k of Object.keys(s.lanes)) s.lanes[k].contestedT = 0; }
  spawnPlayer();
  mode.start();
  hud.show(true);
  touch.show(true);
}
screens.onStart(() => startGame());
screens.onRestart(({ kind }) => {
  if (kind === 'end') restartRound();
  else spawnPlayer();                                // redeploy at a spawn chosen by the section 7 rule
  if (!isTouch()) input.requestPointerLock();
});
window.__START__ = () => { if (!started) { screens.hideAll(); startGame(); } };

// ------------------------------------------------------------------ resize
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  post.resize(w, h);
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ shadow caster distance
// A prop 60 m away throws a shadow the haze swallows; drawing it into both cascades cost
// more triangles than the whole main pass. Blocks (and bots) cast only within CAST_DIST of
// the camera, measured to the block's nearest edge, so the sun still throws every near shadow.
const CAST_DIST = +(params.get('cast') || (tier.name === 'phone' ? 26 : 26));   // integrator r1: high 30 -> 28; r4: 28 -> 26 (see the r4 budget note below)
// integrator r1: two caster distances. Landmarks (tanks, towers, containers, palms, walls, the
// derrick) throw 10 to 50 m shadows the critic wants to see at 40 m; clutter (drums, crates,
// sandbags, pallets) throws 1 to 3 m and its shadow is a few pixels at 20 m.
const CAST_L = +(params.get('castl') || CAST_DIST);
const CAST_C = +(params.get('castc') || Math.min(CAST_DIST, tier.name === 'phone' ? 18 : 12));   // round 13: 14 -> 12 (see FINE_CULL)   // integrator r4: high 20 -> 14
// Clutter (and the no shadow scatter) in blocks whose nearest edge is beyond FAR_CULL is not
// drawn: at 90 m the haze has taken a third of it and a drum is four pixels; landmarks stay.
const FAR_CULL = +(params.get('far') || (tier.name === 'phone' ? 60 : 50));   // integrator r1: high 70 -> 55 (round 1 props put the peak view at 1.95 M); r4: 55 -> 50
// shrubs, debris and wire fences (the no shadow group) go sooner: a shrub is 0.74 m tall
const FAR_CULL_N = +(params.get('farn') || (tier.name === 'phone' ? 40 : 28));   // integrator r1: high 50 -> 32, same reason; r4: 32 -> 28
// integrator r4: the '#fine' group (parts under 18 cm on every axis, see level/build.js) is hidden past
// this block edge distance; an 18 cm part is under 4 px at 22 m and a 6 cm bolt under 2 px. Fade in
// lighting.js. '?finecull=' overrides.
// Budget note (round 4): the asset pass put the probe views at 2.40 M (spawn) and 2.32 M (strafe) against
// the 1.7 M budget, main pass 1.81 M alone; the four r1 knobs at their harshest (far 30, farn 20, cast 20,
// castc 12) still left 1.97 M, so the fine split was added: 0.44 M out of the spawn main pass and 0.2 M out
// of the cascade with nothing removed inside its reading distance. With it, cast 26 / castc 14 / far 50 /
// farn 28 / finecull 22 put the six probe views at 1.61 to 1.65 M (work/game/tp_r4_*.txt).
const FINE_CULL = +(params.get('finecull') || (tier.name === 'phone' ? 15 : 15));   // round 13: 22 -> 15, the rebuilt tanks and buildings carry rivet rows; measured 1.77M -> 1.70M with castc 12
// Budget note (round 1): the six probe views in work/game/triprobe.mjs peaked at 1.95 M with
// cast 30 / far 70 / farn 50 after the round 1 level, asset and sky additions. Measured there:
// clutter casting at 20 m instead of 30 saves about 100 k in the cascade, landmarks at 28 m
// another 150 k at the worst view, clutter culled at 55 m and scatter at 32 m about 110 k in the
// main pass; together the peak view is 1.56 M against the 1.7 M budget. Nothing was decimated;
// the level's west approach, the gantry and every asset change of the round are kept.
// integrator r1: a block only casts when its shadow can land in the frame. The shadow of a block
// is its box swept along the sun's ground direction by height / tan(elevation) (2.5 x height at
// 22 degrees); if that swept box misses the camera frustum, the block is not drawn into the
// cascade. The union box over approximates the true swept hull, so no visible shadow is lost;
// measured at the harness's worst view it drops the blocks behind and beside the camera whose
// shadows fall away from the frame (the cascade was 0.8 M of a 1.95 M frame).
const SHADOW_GROUND = new THREE.Vector2(-rig.sunDir.x, -rig.sunDir.z).normalize();
const SHADOW_PER_M = 1 / Math.tan(Math.atan2(rig.sunDir.y, Math.hypot(rig.sunDir.x, rig.sunDir.z)));
const _fr = new THREE.Frustum(), _pv = new THREE.Matrix4(), _swept = new THREE.Box3();
function sweptShadowBox(g) {
  // the shadow region is the block box swept along SHADOW_GROUND by L; it is tested as a
  // chain of translated copies of the box (step 4 m) so a block beside the frame whose
  // shadow runs parallel to the frame edge is not pulled in by a union box's empty corner
  const b = new THREE.Box3();
  const tmp = new THREE.Box3();
  for (const c of g.children) { const nm = String(c.name); if (nm.endsWith('#nocast') || nm.endsWith('#fine')) continue; tmp.setFromObject(c); if (!tmp.isEmpty()) b.union(tmp); }
  if (b.isEmpty()) return null;
  b.min.y -= 2; b.expandByScalar(1.0);
  const L = Math.max(0, b.max.y - b.min.y) * SHADOW_PER_M;
  const n = Math.max(1, Math.ceil(L / 4));
  const boxes = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * L;
    boxes.push(b.clone().translate(new THREE.Vector3(SHADOW_GROUND.x * t, 0, SHADOW_GROUND.y * t)));
  }
  return boxes;
}
function shadowCanReachFrame(boxes) {
  for (const bx of boxes) if (_fr.intersectsBox(bx)) return true;
  return false;
}
const blockCenters = new Map();
for (const [key, g] of level.blocks) {
  const [bx, bz] = key.split('_').map(Number);
  blockCenters.set(key, { x: -70 + bx * 20 + 10, z: -55 + bz * 20 + 10, g, swept: sweptShadowBox(g) });
}
function updateShadowCasters() {
  const cx = camera.position.x, cz = camera.position.z;
  camera.updateMatrixWorld();
  _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _fr.setFromProjectionMatrix(_pv);
  for (const { x, z, g, swept } of blockCenters.values()) {
    const dx = Math.max(0, Math.abs(cx - x) - 10), dz = Math.max(0, Math.abs(cz - z) - 10);
    const d = Math.hypot(dx, dz);
    const reach = !swept || shadowCanReachFrame(swept);
    const nearL = d < CAST_L && reach, nearC = d < CAST_C && reach;
    const shown = d < FAR_CULL;
    const shownN = d < FAR_CULL_N;
    const shownF = d < FINE_CULL;
    if (g.userData.shown !== shown || g.userData.shownN !== shownN || g.userData.shownF !== shownF) {
      g.userData.shown = shown; g.userData.shownN = shownN; g.userData.shownF = shownF;
      for (const c of g.children) { if (c.name.endsWith('#clutter')) c.visible = shown; else if (c.name.endsWith('#nocast')) c.visible = shownN; else if (c.name.endsWith('#fine')) c.visible = shownF; }
    }
    if (g.userData.castingL !== nearL || g.userData.castingC !== nearC) {
      g.userData.castingL = nearL; g.userData.castingC = nearC; g.userData.casting = nearL || nearC;
      g.traverse((o) => {
        if (!o.isMesh) return;
        const pn = o.parent ? String(o.parent.name) : '';
        if (pn.endsWith('#nocast') || pn.endsWith('#fine')) return;   // a bolt's shadow is not a shadow anyone sees
        o.castShadow = pn.endsWith('#clutter') ? nearC : nearL;
      });
    }
  }
  for (const b of bots) {
    const near = Math.hypot(b.pos.x - cx, b.pos.z - cz) < CAST_DIST + 10;
    if (b.object.userData.casting !== near) { b.object.userData.casting = near; b.object.traverse((o) => { if (o.isMesh) o.castShadow = near; }); }
  }
  for (const mv of level.movers) {
    const near = Math.hypot(mv.object.position.x - cx, mv.object.position.z - cz) < CAST_DIST + 10;
    if (mv.object.userData.casting !== near) { mv.object.userData.casting = near; mv.object.traverse((o) => { if (o.isMesh) o.castShadow = near; }); }
  }
}

// ------------------------------------------------------------------ telemetry
const telemetry = createTelemetry({ renderer, player, bots, mode, camera, quality: tier, level, terrain, world, touch, weapons, screens });

// ------------------------------------------------------------------ the loop
let lastT = performance.now();
let prevYaw = player.yaw, prevPitch = player.pitch;
let lastWeapon = null, lastGrenades = -1, lastHpShown = -1;

// round 19b: '?stats=1' on screen counter for real hardware measurements (Ben's phone and laptop): fps average and
// worst over the last five seconds, frame time, draws, triangles, the GPU name. Every fps number before this came
// from the software renderer in the gate.
const STATS = params.get('stats') === '1';
let statsEl = null, statsFrames = [], statsLast = 0;
if (STATS) {
  statsEl = document.createElement('div');
  statsEl.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:rgba(0,0,0,.72);color:#fff;font:13px/1.35 monospace;padding:8px 10px;border-radius:4px;pointer-events:none;white-space:pre';
  document.body.appendChild(statsEl);
  let gpu = '?'; try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { /* no gpu name */ }
  statsEl.dataset.gpu = String(gpu).slice(0, 60);
}
function frame() {
  requestAnimationFrame(frame);
  if (STATS) {
    const now = performance.now();
    statsFrames.push(now); while (statsFrames.length && statsFrames[0] < now - 5000) statsFrames.shift();
    if (now - statsLast > 500 && statsFrames.length > 2) {
      statsLast = now;
      let worst = 0; for (let i = 1; i < statsFrames.length; i++) worst = Math.max(worst, statsFrames[i] - statsFrames[i - 1]);
      const avg = (statsFrames[statsFrames.length - 1] - statsFrames[0]) / (statsFrames.length - 1);
      const inf = renderer.info.render;
      statsEl.textContent = `fps ${(1000 / avg).toFixed(0)} avg  ${(1000 / worst).toFixed(0)} worst (5 s)\nframe ${avg.toFixed(1)} ms  worst ${worst.toFixed(0)} ms\ndraws ${inf.calls}  tris ${(inf.triangles / 1e6).toFixed(2)}M\n${innerWidth}x${innerHeight} dpr ${devicePixelRatio.toFixed(2)} tier ${tier.name}\n${statsEl.dataset.gpu}`;
    }
  }
  const now = performance.now();
  const real = (now - lastT) / 1000;
  lastT = now;
  const dt = Math.min(real, 0.05);
  simTime += dt;
  ctx.time = simTime;

  const inp = controls();
  player.input = inp;

  if (started) {
    player.update(dt);
    weapons.update(dt, inp);
    viewmodel.setADS(player.adsT);
    viewmodel.update(dt, {
      moving: player.moving, sprinting: player.sprinting, grounded: player.grounded,
      yawDelta: player.yaw - prevYaw, pitchDelta: player.pitch - prevPitch, speed: player.speed,
      crouched: player.crouched, bobPhase: player.bobPhase, alive: player.alive,
    });
    prevYaw = player.yaw; prevPitch = player.pitch;
    for (const b of bots) b.update(dt, ctx);
    squads.rangers.update(dt, ctx);
    squads.militia.update(dt, ctx);
    mode.update(dt);
  } else {
    player.applyCamera(dt);
    viewmodel.update(dt, { moving: false, sprinting: false, grounded: true, yawDelta: 0, pitchDelta: 0, speed: 0, alive: true });
    for (const b of bots) if (b.rig) b.rig.update(dt, { speed: 0 });
  }
  level.update(dt);
  updateShadowCasters();
  if (level.decals) level.decals.update(camera.position, FAR_CULL);   // decals r6: same block cull as the clutter
  fx.update(dt);
  sky.update(camera, dt);
  rig.update(camera, dt);
  audio.update(dt);   // round 21: positioned loops follow the listener; round 22l: the scene one shots

  if (window.__GOD__) { player.hp = 100; hurt = 0; }
  hurt = Math.max(0, hurt - dt * 1.4);
  const lowHp = player.alive ? Math.max(0, (30 - player.hp) / 30) * 0.22 : 0.5;
  post.setDamage(Math.max(hurt, lowHp));
  post.render(dt);

  // HUD
  if (started) {
    if (Math.round(player.hp) !== lastHpShown) { lastHpShown = Math.round(player.hp); hud.setHealth(lastHpShown); }
    const a = weapons.ammo;
    hud.setAmmo(a.mag, a.reserve);
    if (weapons.current !== lastWeapon) { lastWeapon = weapons.current; hud.setWeapon(lastWeapon); touch.setSlot(['ar', 'smg', 'dmr'].indexOf(lastWeapon) + 1); }
    if (weapons.grenades !== lastGrenades) { lastGrenades = weapons.grenades; hud.setGrenades(lastGrenades); }
    hud.crosshair(weapons.spread(), player.adsT);
    hud.setHeading(player.yaw);
    hud.setScore(mode.score.rangers, mode.score.militia, mode.target);
    hud.setTimer(mode.timeLeft);
  }
  telemetry.publish();
  inp.consume();
  if (inp !== input) input.consume();
}

// ------------------------------------------------------------------ ready
screens.loading(0.98, 'Ready');
rig.refresh();
post.render(0);
telemetry.publish();
screens.ready();
// round 21: the title theme starts on the first gesture on the title screen (browsers need one); the pump jacks and
// generators get positioned loops; audio.update() every frame sets their distance gain
{
  const first = () => { audio.title(); removeEventListener('pointerdown', first); removeEventListener('keydown', first); removeEventListener('touchstart', first); };
  addEventListener('pointerdown', first); addEventListener('keydown', first); addEventListener('touchstart', first, { passive: true });
  for (const mv of level.movers) if (mv.asset === 'pump_jack' && mv.object) audio.addLoop('pumpjack', mv.object.position.clone(), 0.5);
  for (const p of PLACEMENTS) if (p.asset === 'generator_set' && !p.dy) audio.addLoop('generator', new THREE.Vector3(p.x, 0, p.z), 0.22);
}
window.__READY__ = true;
console.info(`[main] ready: ${level.stats.placed} props in ${level.blocks.size} blocks, ${level.staticMeshes} static meshes, ${bots.length} bots, nav ${nav.count} nodes`);
requestAnimationFrame(frame);

// diagnostics for the integrator (no cost unless called)
window.__DIAG__ = () => {
  const out = { blocks: {}, bots: {}, terrainTris: 0, viewmodel: 0, other: [] };
  const tri = (o) => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position.count; return (n / 3) * (o.isInstancedMesh ? o.count : 1); };
  let total = 0;
  for (const [k, g] of level.blocks) {
    const mats = [];
    let t = 0;
    g.traverse((o) => { if (o.isMesh) { t += tri(o); const m = Array.isArray(o.material) ? o.material[0] : o.material; mats.push(`${Array.isArray(o.material) ? 'ARRAY' + o.material.length : ''} ${m.uuid.slice(0, 6)} attrs:${Object.keys(o.geometry.attributes).sort().join('+')} idx${o.geometry.index ? 1 : 0} ` + `${m.name || '-'} s${m.side} fs${m.flatShading ? 1 : 0} e${m.emissive ? m.emissive.getHexString() : '-'} ei${m.emissiveIntensity} t${m.transparent ? 1 : 0} o${m.opacity} ns${m.normalScale ? m.normalScale.x : '-'} at${m.alphaTest} dw${m.depthWrite ? 1 : 0} map${m.map ? String(m.map.uuid || m.map.id).slice(0, 4) : '-'} rm${m.roughnessMap ? String(m.roughnessMap.uuid || m.roughnessMap.id).slice(0, 4) : '-'} nm${m.normalMap ? String(m.normalMap.uuid || m.normalMap.id).slice(0, 4) : '-'} ${m.type}`); } });
    out.blocks[k] = { meshes: mats.length, tris: t, mats };
    total += t;
  }
  out.blockTris = total;
  for (const t of terrain.tiles) out.terrainTris += tri(t);
  for (const b of bots) { let n = 0, t = 0; const list = []; b.object.traverse((o) => { if (o.isMesh) { n++; t += tri(o); list.push(`${o.parent.name || '?'} ${(Array.isArray(o.material) ? o.material[0] : o.material).uuid.slice(0, 6)} ${Object.keys(o.geometry.attributes).sort().join('+')} idx${o.geometry.index ? 1 : 0} ${o.material.name || '-'} s${o.material.side}`); } }); out.bots[b.id] = { meshes: n, tris: t, list }; }
  viewmodel.root.traverse((o) => { if (o.isMesh) out.viewmodel++; });
  scene.traverse((o) => { if (o.isMesh && !o.name.startsWith('terrain') && !(o.parent && String(o.parent.name).startsWith('block_'))) { let p = o; let inBot = false, inVm = false; while (p) { if (String(p.name).startsWith('bot_')) inBot = true; if (p.name === 'viewmodel') inVm = true; p = p.parent; } if (!inBot && !inVm) out.other.push(o.name || o.type); } });
  return out;
};

window.__DIAG2__ = async (name) => {
  const o = await ASSET('./assets/' + name + '.js', { surfaces: true });
  const before = [];
  o.traverse((m) => { if (m.isMesh) before.push(`${Array.isArray(m.material) ? 'ARR' : m.material.uuid.slice(0, 6)} ${m.material.name || '-'} ${Object.keys(m.geometry.attributes).sort().join('+')} vc${m.material.vertexColors ? 1 : 0} inst${m.isInstancedMesh ? 1 : 0}`); });
  vertexiseMaterials(o);
  const after = [];
  o.traverse((m) => { if (m.isMesh) after.push(`${Array.isArray(m.material) ? 'ARR' : m.material.uuid.slice(0, 6)} ${m.material.name || '-'} ${Object.keys(m.geometry.attributes).sort().join('+')} tag:${m.geometry.userData.__vrm}`); });
  return { before, after };
};
window.__DBG__ = {
  world, nav, audio, fx, weapons,   // round 24: fx and the weapon system, so tools can fire a shot for a screenshot   // round 21: audio state for the tools   // hotfix_cyl probe: the collision world and nav grid, read only
  teleport(x, z, yawDeg, pitch = 0) { player.spawnAt(x, z, yawDeg * DEG); player.pitch = pitch; player.applyCamera(0); },
  botTo(id, x, z, yawDeg) { const b = botById(id); if (b) b.respawn(x, z, yawDeg * DEG); },
  freeze(on) { for (const b of bots) b.frozen = on; },
  vmTest(mode) {
    viewmodel.root.traverse((o) => {
      if (!o.isMesh) return;
      if (mode === 'noshadow') o.receiveShadow = false;
      if (mode === 'basic') o.material = new THREE.MeshBasicMaterial({ vertexColors: true });
      if (mode === 'normal') o.material = new THREE.MeshNormalMaterial();
      if (mode === 'flat') { const m = o.material.clone(); m.normalMap = null; m.needsUpdate = true; o.material = m; }
    });
    if (mode === 'nomirror') { viewmodel.holder.scale.set(1, 1, 1); viewmodel.holder.rotation.set(0, Math.PI, 0); viewmodel.weaponHolder.scale.set(1, 1, 1); viewmodel.weaponHolder.rotation.set(0, Math.PI, 0); }
  },
  vm() {
    const out = [];
    viewmodel.root.updateMatrixWorld(true);
    viewmodel.root.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(new THREE.Vector3()); camera.worldToLocal(c); out.push({ n: o.parent.name, attrs: Object.keys(o.geometry.attributes).join(','), vc: o.material.vertexColors, type: o.material.type, vis: o.visible && o.parent.visible, c: [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)], size: b.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)) }); } });
    return { holderScale: viewmodel.holder.scale.toArray(), rootPos: viewmodel.root.position.toArray(), meshes: out };
  },
};
window.__DIAG3__ = () => {
  const tri = (o) => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position.count; return (n / 3) * (o.isInstancedMesh ? o.count : 1); };
  camera.updateMatrixWorld(true);
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const cats = { main: {}, casc: [] };
  const bump = (o, key, n) => { o[key] = (o[key] || 0) + n; };
  const catOf = (o) => { let p = o; while (p) { const nm = String(p.name); if (nm.startsWith('terrain_shadow')) return 'proxy'; if (nm.startsWith('terrain')) return 'terrain'; if (nm.startsWith('block_')) return nm.endsWith('#nocast') ? 'nocast' : 'block'; if (nm.startsWith('bot_')) return 'bot'; if (nm === 'viewmodel') return 'vm'; p = p.parent; } return 'other:' + (o.name || o.type); };
  const sph = new THREE.Sphere();
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    { let p = o.parent, ok = true; while (p) { if (!p.visible) { ok = false; break; } p = p.parent; } if (!ok) return; }
    let vis = true; if (o.frustumCulled) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); vis = fr.intersectsSphere(sph); }
    const c = catOf(o);
    if (vis && o.layers.test(camera.layers)) bump(cats.main, c, tri(o));
  });
  rig.csm.lights.forEach((l, i) => {
    const cam = l.shadow.camera; cam.updateMatrixWorld(true);
    const f2 = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const acc = {};
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.castShadow) return;
      if (!o.layers.test(cam.layers)) return;
      let vis = true; if (o.frustumCulled) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); vis = f2.intersectsSphere(sph); }
      if (vis) bump(acc, catOf(o), tri(o));
    });
    cats.casc.push(acc);
  });
  cats.info = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  return cats;
};
window.__DIAG4__ = () => {
  // per block triangles in the main pass and in the cascade, with the block's asset list
  const tri = (o) => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position.count; return (n / 3) * (o.isInstancedMesh ? o.count : 1); };
  camera.updateMatrixWorld(true);
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const cam = rig.csm.lights[0].shadow.camera; cam.updateMatrixWorld(true);
  const f2 = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const sph = new THREE.Sphere();
  const out = [];
  for (const [key, g] of level.blocks) {
    let main = 0, casc = 0;
    g.traverse((o) => {
      if (!o.isMesh) return;
      let p = o, ok = true; while (p) { if (!p.visible) { ok = false; break; } p = p.parent; } if (!ok) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (fr.intersectsSphere(sph)) main += tri(o);
      if (o.castShadow && f2.intersectsSphere(sph)) casc += tri(o);
    });
    if (main + casc > 0) out.push({ key, main: Math.round(main), casc: Math.round(casc), assets: g.userData.assets });
  }
  out.sort((a, b) => (b.main + b.casc) - (a.main + a.casc));
  return out;
};
window.__DIAG5__ = () => {
  // integrator r4: per block and per group (landmark, clutter, scatter) triangles in the main pass and cascade 0
  const tri = (o) => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position.count; return (n / 3) * (o.isInstancedMesh ? o.count : 1); };
  camera.updateMatrixWorld(true);
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const cam = rig.csm.lights[0].shadow.camera; cam.updateMatrixWorld(true);
  const f2 = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const sph = new THREE.Sphere();
  const cx = camera.position.x, cz = camera.position.z;
  const out = [];
  for (const [key, g] of level.blocks) {
    const c = blockCenters.get(key);
    const d = c ? Math.hypot(Math.max(0, Math.abs(cx - c.x) - 10), Math.max(0, Math.abs(cz - c.z) - 10)) : -1;
    const acc = {};
    g.traverse((o) => {
      if (!o.isMesh) return;
      let p = o, ok = true; while (p) { if (!p.visible) { ok = false; break; } p = p.parent; } if (!ok) return;
      const pn = o.parent ? String(o.parent.name) : '';
      const grp = pn.endsWith('#nocast') ? 'scatter' : pn.endsWith('#clutter') ? 'clutter' : pn.endsWith('#fine') ? 'fine' : 'landmark';
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      const a = acc[grp] || (acc[grp] = { main: 0, casc: 0 });
      if (fr.intersectsSphere(sph)) a.main += tri(o);
      if (o.castShadow && f2.intersectsSphere(sph)) a.casc += tri(o);
    });
    const tot = Object.values(acc).reduce((s, a) => s + a.main + a.casc, 0);
    if (tot > 0) out.push({ key, d: +d.toFixed(1), groups: acc, assets: g.userData.assets });
  }
  out.sort((a, b) => a.d - b.d);
  return out;
};
window.__DBG__.casters = () => [...blockCenters.entries()].map(([k, v]) => ({ k, casting: v.g.userData.casting, n: v.swept ? v.swept.length : 0, b0: v.swept ? v.swept[0].min.toArray().map((n) => +n.toFixed(0)).concat(v.swept[0].max.toArray().map((n) => +n.toFixed(0))) : null }));
window.__DBG__.bots = () => {
  const p = player;
  return `player ${p.pos.x.toFixed(0)},${p.pos.z.toFixed(0)} hp ${p.hp.toFixed(0)} | ` + bots.filter((b) => b.team === 'militia').map((b) => `${b.id} ${b.pos.x.toFixed(0)},${b.pos.z.toFixed(0)} ${b.state}${b.objective ? '/' + b.objective.lane : ''} tgt:${b.target ? (b.target.id || 'p') : '-'} d:${Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z).toFixed(0)}`).join(' | ');
};
window.__DBG__.los = () => {
  const eye = new THREE.Vector3(), chest = new THREE.Vector3();
  const p = player;
  chest.set(p.pos.x, p.pos.y + 1.25, p.pos.z);
  return bots.filter((b) => b.team === 'militia' && b.alive).map((b) => {
    b.eye(eye);
    const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
    const cos = ((p.pos.x - b.pos.x) * fx + (p.pos.z - b.pos.z) * fz) / (d || 1);
    return `${b.id}@${b.pos.x.toFixed(0)},${b.pos.z.toFixed(0)} d${d.toFixed(0)} los${world.lineOfSight(eye, chest) ? 1 : 0} cone${cos.toFixed(2)} ${b.state} tgt:${b.target ? (b.target.id || 'p') : '-'} react${b.reactT.toFixed(2)} burst${b.burstLeft} pause${b.burstPause.toFixed(1)}`;
  }).join(' | ');
};
window.__DBG__.dmg = 0;
events.on('damage', (p) => { if (p.target === player) window.__DBG__.dmg += p.amount; });
events.on('shot', (p) => { if (p.by && p.by.team === 'militia') window.__DBG__.mshots = (window.__DBG__.mshots || 0) + 1; });
window.__DBG__.hits = 0;
events.on('hit', (p) => { if (p.by && p.by.team === 'militia' && p.target && p.target.id === 'player') window.__DBG__.hits++; });
