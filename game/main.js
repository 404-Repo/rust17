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
import { TIERS, detectTier, getTier, applyTierToRenderer } from './src/render/quality.js';
import { createLightingRig, SUN_COLOR, SKY_COLOR, SUN_INTENSITY, SKY_INTENSITY } from './src/render/lighting.js';
import { createSky } from './src/render/sky.js';
import { createPost } from './src/render/post.js';
import { TERRAIN_SPEC, buildTerrain } from './src/world/terrain.js';
import { World } from './src/world/collision.js';
import { buildLevel } from './src/level/build.js';
import { PLACEMENTS, LINKS, WALKABLES, SPAWNS, COVER_POINTS, BOUNDARY } from './src/level/placements.js';
import { Player } from './src/player/controller.js';
import { WeaponSystem, WEAPONS } from './src/player/weapons.js';
import { Viewmodel } from './src/player/viewmodel.js';
import { FX } from './src/player/fx.js';
import { NavGrid } from './src/ai/navgrid.js';
import { Bot } from './src/ai/bot.js';
import { SquadManager } from './src/ai/squad.js';
import { Input, RAD_PER_PX } from './src/ui/input.js';
import { TouchControls } from './src/ui/touch.js';
import { HUD } from './src/ui/hud.js';
import { Screens } from './src/ui/screens.js';
import { Events } from './src/game/events.js';
import { TDM } from './src/game/mode.js';
import { createTelemetry } from './src/game/telemetry.js';
import { Audio } from './src/game/audio.js';
import { ASSET } from './assetlib.js';
import { vertexiseMaterials } from './src/game/bake.js';

const ROUND = 'r0';
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
const rig = createLightingRig(THREE, { scene, renderer, camera, tier });
const post = createPost(THREE, { renderer, scene, camera, tier });
// Environment for the PBR metals. Without scene.environment a MeshStandardMaterial with
// metalness 0.5 to 0.7 (gunmetal, galvanised: the style lock allows up to 0.7) has nothing to
// reflect but the sun's highlight and renders near black; the first filmstrip's rifle was a
// silhouette. The sky dome itself is filtered into the environment, at a low intensity so the
// hemisphere light stays the fill the render agent measured against the references.
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const dome = sky.mesh.clone();
  dome.position.set(0, 0, 0);
  envScene.add(dome);
  try {
    const rt = pmrem.fromScene(envScene, 0.04, 1, 200);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.3;
  } catch (e) { console.warn('[main] environment map failed', e && e.message); }
  pmrem.dispose();
}
screens.loading(0.04, 'Lighting');

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
const mkBot = (name, team, i) => new Bot({ id: name.toLowerCase(), name, team, scene, world, nav, events, quality: tier, weaponKey: WEAPON_PLAN[i % WEAPON_PLAN.length] });
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
function pickPlayerSpawn() {
  const enemies = hostiles().filter((b) => b.alive);
  const list = SPAWNS.rangers;
  let best = null, bestD = -1, fallback = null, fewest = Infinity;
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
    if (!seen && minD > bestD) { bestD = minD; best = s; }
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
  const s = pickPlayerSpawn();
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
  audio.start();
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
const CAST_DIST = +(params.get('cast') || (tier.name === 'phone' ? 26 : 30));
// Clutter (and the no shadow scatter) in blocks whose nearest edge is beyond FAR_CULL is not
// drawn: at 90 m the haze has taken a third of it and a drum is four pixels; landmarks stay.
const FAR_CULL = +(params.get('far') || (tier.name === 'phone' ? 60 : 70));
// shrubs, debris and wire fences (the no shadow group) go sooner: a shrub is 0.74 m tall
const FAR_CULL_N = +(params.get('farn') || (tier.name === 'phone' ? 40 : 50));
const blockCenters = new Map();
for (const [key, g] of level.blocks) {
  const [bx, bz] = key.split('_').map(Number);
  blockCenters.set(key, { x: -70 + bx * 20 + 10, z: -55 + bz * 20 + 10, g });
}
function updateShadowCasters() {
  const cx = camera.position.x, cz = camera.position.z;
  for (const { x, z, g } of blockCenters.values()) {
    const dx = Math.max(0, Math.abs(cx - x) - 10), dz = Math.max(0, Math.abs(cz - z) - 10);
    const d = Math.hypot(dx, dz);
    const near = d < CAST_DIST;
    const shown = d < FAR_CULL;
    const shownN = d < FAR_CULL_N;
    if (g.userData.shown !== shown || g.userData.shownN !== shownN) {
      g.userData.shown = shown; g.userData.shownN = shownN;
      for (const c of g.children) { if (c.name.endsWith('#clutter')) c.visible = shown; else if (c.name.endsWith('#nocast')) c.visible = shownN; }
    }
    if (g.userData.casting !== near) {
      g.userData.casting = near;
      g.traverse((o) => { if (o.isMesh && !(o.parent && String(o.parent.name).endsWith('#nocast'))) o.castShadow = near; });
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

function frame() {
  requestAnimationFrame(frame);
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
  fx.update(dt);
  sky.update(camera, dt);
  rig.update(camera);

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
