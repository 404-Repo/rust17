/**
 * The lighting rig (owner: render).
 *
 * This is the subsystem that lost the previous runs of this method, so the two
 * rules are written here rather than left to taste. Both come from the
 * reference frames in refs/aaa/ and the numbers in docs/CLAIMS.md.
 *
 *  1. TWO COLOUR TEMPERATURES IN EVERY FRAME. A warm low sun (0xffd2a0,
 *     azimuth 250, elevation 22) is the key, and a cool HemisphereLight
 *     (sky 0x8fb0d8) is the fill. Nothing in the rig is neutral white. Shade
 *     on the sand is blue grey because the sky lights it, not because a post
 *     pass tinted it: CLAIMS.md claim 1 measures that on the ground and claim
 *     10 measures it on the structures, and both are gamed by a tint, so there
 *     is no tint anywhere in this rig.
 *
 *  2. THE SUN CASTS REAL SHADOWS ON EVERYTHING. Cascaded shadow maps from
 *     three/addons/csm/CSM.js, two cascades on the high tier, one on the phone
 *     tier. Contact darkening under a prop is the shadow map plus the sand
 *     fillet every asset carries; there is no blob, no decal, no baked AO.
 *
 * CSM works by patching every lit material's shader (setupMaterial) so that
 * each fragment reads exactly one cascade. A lit material that is NOT set up
 * receives every cascade light as a separate directional light and comes out
 * `cascades` times too bright with double shadows. So the rig walks the scene
 * and sets up every lit material it finds, on a schedule (every few frames)
 * and on demand (`rig.refresh()` after a level build). Call refresh() after
 * adding a lot of geometry at once; the scheduled sweep catches the rest.
 *
 * Usage (main.js):
 *   const rig = createLightingRig(THREE, { scene, renderer, camera, tier });
 *   ... per frame, after everything moved and before post.render():
 *   rig.update(camera);
 */
import { CSM } from 'three/addons/csm/CSM.js';
import { getTier } from './quality.js';

/** Sun placement, MAP-PLAN section 1: azimuth 250 degrees, elevation 22. */
export const SUN_AZIMUTH_DEG = 250;
export const SUN_ELEVATION_DEG = 22;
export const SUN_COLOR = 0xffd2a0;
export const SUN_INTENSITY = 4.6;   // ARCHITECTURE says 3.2; measured against refs/aaa the lit sand was 0.48 luma and needs to be near 0.8, see work/render/NOTES.md
export const SKY_COLOR = 0x8fa2d8;   // ARCHITECTURE says 0x8fb0d8; that cyan leaning blue times yellow sand gave a GREEN shade (measured teal in the screenshot); the green channel is pulled down so shade reads blue grey
export const GROUND_COLOR = 0xa08a66;
export const SKY_INTENSITY = 0.6;   // ARCHITECTURE says 0.9; at 0.9 shade/sun luma was 0.71 against a bar of 0.55 (CLAIMS claim 2)
export const FOG_COLOR = 0xd8c7a6;
export const FOG_NEAR = 35;
export const FOG_FAR = 190;
export const EXPOSURE = 0.95;

/**
 * Direction FROM the origin TOWARD the sun, unit length. Azimuth is measured
 * from north (-Z) clockwise seen from above, so east (+X) is 90 and 250 is
 * west south west: x negative, z positive. Shadows therefore fall east north
 * east, and at 22 degrees they are about 2.5 times the caster's height long,
 * which is what CLAIMS.md claim 2 expects to see.
 */
export function sunDirection(THREE, out) {
  const az = SUN_AZIMUTH_DEG * Math.PI / 180, el = SUN_ELEVATION_DEG * Math.PI / 180;
  const c = Math.cos(el);
  const v = out || new THREE.Vector3();
  return v.set(Math.sin(az) * c, Math.sin(el), -Math.cos(az) * c).normalize();
}

function isLit(m) {
  return !!m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
}

export function createLightingRig(THREE, { scene, renderer, camera, tier }) {
  const T = getTier(tier);

  // Fixed renderer settings. Set here, once, so no other module can leave
  // the frame in linear space or with a different curve.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const sunDir = sunDirection(THREE);
  const lightDir = sunDir.clone().negate();   // CSM wants the direction light travels

  // Cascaded sun. `lightMargin` is how far behind the cascade box the shadow
  // camera sits along the light direction; at 22 degrees a 20 m derrick 60 m
  // up sun throws its shadow into the view, so the margin is generous.
  const csm = new CSM({
    camera,
    parent: scene,
    cascades: T.cascades,
    maxFar: T.shadowDist,
    mode: 'practical',
    shadowMapSize: T.shadowMap,
    shadowBias: -0.00025,
    lightDirection: lightDir,
    lightIntensity: SUN_INTENSITY,
    lightNear: 1,
    lightFar: 420,
    lightMargin: 60,     // integrator: was 150; the tallest caster (20 m crown) at 22 degrees throws 50 m, and 150 pulled the whole map into every cascade pass
  });
  csm.fade = true;
  for (const l of csm.lights) {
    l.color.setHex(SUN_COLOR);
    l.shadow.normalBias = T.name === 'phone' ? 0.09 : 0.06;
    l.name = 'sun';
  }
  csm.updateFrustums();
  const sun = csm.lights[0];

  // The cool fill. This is the second colour temperature. Measured on the
  // test captures (work/render/NOTES.md): with the sun at 4.6 and this at 0.6
  // the shade on sand reads 41,39,41 sRGB against lit sand 204,169,122, a
  // shade/sun luma ratio of 0.23 (CLAIMS claim 2 bar 0.55, reference median
  // 0.35) and shadowBR of +70 (claim 1 bar +15).
  const sky = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, SKY_INTENSITY);
  sky.position.set(0, 50, 0);
  sky.name = 'skyfill';
  scene.add(sky);

  // Dust haze. Linear so the derrick at 60 m is still a silhouette and the
  // sky at the horizon takes over past it. sky.js paints the dome so the fog
  // colour meets a horizon of the same colour and the join is invisible.
  const fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  if (T.fog !== false) scene.fog = fog;
  if (!scene.background) scene.background = new THREE.Color(FOG_COLOR);

  // Material setup. Every lit material must go through csm.setupMaterial once;
  // see the header. A WeakSet remembers which ones are done.
  const done = new WeakSet();
  function setupMaterial(m) {
    if (!isLit(m) || done.has(m)) return false;
    done.add(m);
    // CSM replaces onBeforeCompile. If a module (terrain, fx) already hooked
    // the material, keep its hook and run both, and keep the program cache
    // key distinct so two materials with different hooks do not share a program.
    const prevHook = m.onBeforeCompile;
    const prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.call(m) : '';
    csm.setupMaterial(m);
    const csmHook = m.onBeforeCompile;
    const hasPrev = typeof prevHook === 'function' && prevHook !== THREE.Material.prototype.onBeforeCompile;
    if (hasPrev) {
      m.onBeforeCompile = function (shader, r) { prevHook.call(this, shader, r); csmHook.call(this, shader, r); };
      m.customProgramCacheKey = () => prevKey + '|csm' + T.cascades;
    }
    m.needsUpdate = true;
    return true;
  }
  function refresh(root = scene) {
    let n = 0;
    root.traverse((o) => {
      const m = o.material;
      if (!m) return;
      if (Array.isArray(m)) { for (const mm of m) if (setupMaterial(mm)) n++; }
      else if (setupMaterial(m)) n++;
    });
    return n;
  }
  refresh();

  let frame = 0;
  let lastNear = camera.near, lastFar = camera.far, lastFov = camera.fov, lastAspect = camera.aspect;

  function update(cam = camera) {
    // Zoom (ADS) and resize change the frustum the cascades are split over.
    if (cam.near !== lastNear || cam.far !== lastFar || cam.fov !== lastFov || cam.aspect !== lastAspect) {
      lastNear = cam.near; lastFar = cam.far; lastFov = cam.fov; lastAspect = cam.aspect;
      csm.camera = cam;
      csm.updateFrustums();
    }
    csm.update();
    // Sweep for new materials: every frame during the first two seconds of
    // play (the level is still being built), every 15th frame after.
    frame++;
    if (frame < 120 || frame % 15 === 0) refresh();
  }

  function setExposure(v) { renderer.toneMappingExposure = v; }

  function dispose() {
    csm.dispose(); csm.remove();
    scene.remove(sky);
    if (scene.fog === fog) scene.fog = null;
  }

  return {
    sun, sky, fog, csm, sunDir, tier: T,
    update, setExposure, setupMaterial, refresh, dispose,
  };
}
