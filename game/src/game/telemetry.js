/**
 * game/telemetry.js  (owner: game)
 *
 * Publishes window.__GAME__ every frame with every field tools/CONTRACT.md lists, plus
 * visibleAssets (asset names in the frustum, CLAIMS 8 and 9) and hostileJoints (upperLegL
 * and upperArmR of every visible hostile, CLAIMS 11).
 *
 * aim: the screen position of the nearest hostile whose chest the player's eye can see
 * through world.lineOfSight. aimMouse: the mouse delta that centres it, from the player's
 * live radians per pixel (which shrinks in ADS). aimDrag: the same in touch drag pixels,
 * from the touch pad's own scale (raw drag px -> look units -> radians through the player).
 *
 * fps comes from the REAL elapsed time between frames, never the clamped simulation dt.
 */
import * as THREE from 'three';
import { RAD_PER_PX } from '../ui/input.js?v=r22-202608292135';

const _chest = new THREE.Vector3(), _eye = new THREE.Vector3(), _proj = new THREE.Vector3();
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

export function createTelemetry({ renderer, player, bots, mode, camera, quality, level, terrain, world, touch, weapons, screens }) {
  const state = { fps: 0, frames: 0, acc: 0, lastT: performance.now(), overrideOver: null };
  const G = {
    pos: [0, 0], posY: 0, fps: 0, speed: 0, score: 0, over: false,
    draws: 0, tris: 0, hp: 100, shots: 0, kills: 0, alive: 0,
    aim: [0, 0, false], aimMouse: [0, 0], aimDrag: [0, 0], aimDist: 0,
    quality: quality && quality.name ? quality.name : String(quality || 'high'),
    staticMeshes: 0, enemyMeshes: 0, blocksVisible: 0,
    visibleAssets: [], hostileJoints: [], scoreRangers: 0, scoreMilitia: 0, timeLeft: 0, yaw: 0, pitch: 0,
  };
  window.__GAME__ = G;

  const staticTotal = level && typeof level.staticMeshes === 'number' ? level.staticMeshes : 0;

  function tick() {
    const now = performance.now();
    const real = (now - state.lastT) / 1000;
    state.lastT = now;
    state.acc += real; state.frames++;
    if (state.acc >= 0.5) { state.fps = state.frames / state.acc; state.frames = 0; state.acc = 0; }
  }

  function publish() {
    tick();
    const W = renderer.domElement.clientWidth || innerWidth, H = renderer.domElement.clientHeight || innerHeight;
    G.pos[0] = +player.pos.x.toFixed(3); G.pos[1] = +player.pos.z.toFixed(3);
    G.posY = +player.pos.y.toFixed(3);
    G.fps = Math.round(state.fps);
    G.speed = +player.speed.toFixed(2);
    G.scoreRangers = mode.score.rangers; G.scoreMilitia = mode.score.militia;
    G.score = mode.score.rangers;
    G.timeLeft = Math.round(mode.timeLeft);
    G.over = !player.alive || mode.over || (screens && screens.over && screens.over.classList.contains('on'));
    G.draws = renderer.info.render.calls;
    G.tris = renderer.info.render.triangles;
    G.hp = Math.round(player.hp);
    G.shots = weapons ? weapons.shots : 0;
    G.kills = weapons ? weapons.kills : 0;
    G.yaw = +player.yaw.toFixed(4); G.pitch = +player.pitch.toFixed(4);
    G.quality = quality && quality.name ? quality.name : G.quality;

    // hostiles
    const hostiles = bots.filter((b) => b.team !== player.team);
    G.alive = hostiles.filter((b) => b.alive).length;
    const eye = player.eye(_eye).clone();
    let best = null, bestD = Infinity;
    camera.updateMatrixWorld();
    _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pv);
    G.hostileJoints.length = 0;
    let enemyMeshes = 0;
    for (const b of hostiles) {
      if (!b.alive || !b.loaded) continue;
      const chest = b.chest ? b.chest(_chest) : _chest.set(b.pos.x, b.pos.y + 1.25, b.pos.z);
      const d = chest.distanceTo(eye);
      _sphere.set(chest, 1.0);
      const inView = _frustum.intersectsSphere(_sphere);
      if (inView) {
        b.object.traverse((o) => { if (o.isMesh) enemyMeshes++; });
        if (b.rig && b.rig.jointAngles) {
          const j = b.rig.jointAngles();
          G.hostileJoints.push({ id: b.id, dist: +d.toFixed(1), upperLegL: +j.upperLegL.toFixed(3), upperArmR: +j.upperArmR.toFixed(3) });
        }
      }
      if (d < bestD && inView && world.lineOfSight(eye, chest)) { bestD = d; best = chest.clone(); }
    }
    G.enemyMeshes = enemyMeshes;
    if (best) {
      _proj.copy(best).project(camera);
      const visible = _proj.z < 1 && _proj.z > -1;
      const sx = (_proj.x * 0.5 + 0.5) * W, sy = (-_proj.y * 0.5 + 0.5) * H;
      const onScreen = visible && sx >= 0 && sx <= W && sy >= 0 && sy <= H;
      G.aim[0] = +sx.toFixed(1); G.aim[1] = +sy.toFixed(1); G.aim[2] = onScreen;
      G.aimDist = +bestD.toFixed(1);
      // the yaw and pitch that would centre it, then to input units
      const dx = best.x - eye.x, dy = best.y - eye.y, dz = best.z - eye.z;
      const yawTo = Math.atan2(-dx, -dz);
      const pitchTo = Math.atan2(dy, Math.hypot(dx, dz));
      let dyaw = yawTo - player.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const dpitch = pitchTo - player.pitch;
      const rp = player.radPerPx();                 // radians per look unit at the live fov
      // yaw -= dx * rp, so a positive mouse dx turns right (negative yaw)
      G.aimMouse[0] = +(-dyaw / rp).toFixed(1);
      G.aimMouse[1] = +(-dpitch / rp).toFixed(1);
      const tc = touch && touch.enabled ? touch : null;
      if (tc) {
        // touch look units per raw drag px: 1 / (sensitivity * RAD_PER_PX); the player then
        // applies rp per unit, so radians per drag px = rp / (sensitivity * RAD_PER_PX)
        const radPerDrag = rp / (tc.sensitivity * RAD_PER_PX);
        G.aimDrag[0] = +(-dyaw / radPerDrag).toFixed(1);
        G.aimDrag[1] = +(-dpitch / radPerDrag).toFixed(1);
      } else { G.aimDrag[0] = G.aimMouse[0]; G.aimDrag[1] = G.aimMouse[1]; }
    } else {
      G.aim[2] = false; G.aimDist = 0;
      G.aimMouse[0] = 0; G.aimMouse[1] = 0; G.aimDrag[0] = 0; G.aimDrag[1] = 0;
    }

    // static diagnostics: blocks and terrain tiles in the frustum, asset names in view
    let blocksVisible = 0, staticMeshes = 0;
    G.visibleAssets.length = 0;
    if (level && level.blocks) {
      const seen = new Set();
      for (const [key, g] of level.blocks) {
        let vis = false;
        g.traverse((o) => {
          if (!o.isMesh || vis) return;
          if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          _sphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
          if (_frustum.intersectsSphere(_sphere)) vis = true;
        });
        if (vis) {
          blocksVisible++;
          g.traverse((o) => { if (o.isMesh) staticMeshes++; });
          for (const a of (g.userData.assets || [])) seen.add(a);
        }
      }
      G.visibleAssets.push(...seen);
    }
    if (terrain && terrain.tiles) {
      for (const t of terrain.tiles) {
        _sphere.copy(t.geometry.boundingSphere).applyMatrix4(t.matrixWorld);
        if (_frustum.intersectsSphere(_sphere)) staticMeshes++;
      }
    }
    G.blocksVisible = blocksVisible;
    G.staticMeshes = staticMeshes || staticTotal;
    return G;
  }

  return { publish, state: G };
}
