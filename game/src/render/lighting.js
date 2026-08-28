/**
 * The lighting rig (owner: render). Round 1 rewrite after the blind critic's
 * FAIL ("there is no sun ... shade is warmer than light").
 *
 * What was wrong in round 0, measured (work/fix1_render/NOTES.md): the sun and
 * the CSM shadows were fine, but the integrator's scene.environment (the cream
 * sky dome filtered at intensity 0.3) put about eight times the hemisphere
 * light's irradiance into every shadow, and it was warm. Shade came out at 0.75
 * of lit sand and warmer than it. So the rig now OWNS the ambient term:
 *
 *  1. TWO COLOUR TEMPERATURES. Warm low sun (0xffd8b0, azimuth 250, elevation
 *     22) is the key. The fill is a small analytic environment map built here
 *     (PMREM of the ENV_* palette: blue grey overhead, neutral cool at the
 *     horizon, warm sand bounce below) plus a matching HemisphereLight. Both are
 *     directional: a north face sees sky and goes cool, the underside of a
 *     walkway sees sand and stays warm neutral. There is no post tint anywhere.
 *     If main.js sets its own scene.environment, update() replaces it.
 *
 *  2. THE SUN CASTS REAL SHADOWS. CSM from three/addons/csm/CSM.js. One 4096
 *     cascade over 65 m on the high tier (2.3 cm texels), one 1024 cascade over
 *     45 m on the phone. No blob, no decal, no baked AO.
 *
 *  3. AERIAL PERSPECTIVE, not flat fog. Every material's fog chunk is replaced
 *     so the haze colour is the sky radiance in the pixel's view direction
 *     (pale warm at the horizon, cooler and greyer looking up, the sun glow
 *     when looking west) and the amount grows with distance and, a little,
 *     with view elevation, so a derrick crown is paler than its base and far
 *     tanks lose contrast before near ones. scene.fog stays set (a plain Fog
 *     of the horizon colour) so USE_FOG is defined and unpatched materials
 *     (sprites) still fog to a sensible colour.
 *
 * CSM patches every lit material's shader (setupMaterial). A lit material that
 * is NOT set up receives every cascade as a separate light. The rig walks the
 * scene on a schedule and on demand (`rig.refresh()`).
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
export const SUN_COLOR = 0xffd8b0;   // was 0xffd2a0; the critic's tells included a red ORANGE derrick and orange sand, so the key is a shade less saturated
export const SUN_INTENSITY = 5.6;   // with EXPOSURE 1.15: lit horizontal sand 0.60 luma, a west facing bleached wall 0.80 (work/fix1_render/NOTES.md); round 0 measured 0.47 on the integrated terrain
export const SKY_COLOR = 0x86a0e0;   // hemisphere sky term, blue grey (the cyan leaning contract value 0x8fb0d8 went green on sand)
export const GROUND_COLOR = 0xa08a66;
export const SKY_INTENSITY = 0.35;  // the environment map carries the rest of the fill, see ENV_*
export const FOG_COLOR = 0xeadcc4;  // plain Fog colour for unpatched materials: the horizon haze after ACES
export const FOG_NEAR = 35;
export const FOG_FAR = 190;
export const EXPOSURE = 1.15;       // was 0.95: the integrated terrain (maps plus vertex colour) is darker than the stub the rig was tuned on

/**
 * Atmosphere palette, LINEAR radiance before the ACES curve (EXPOSURE 1.15).
 * Each value was solved (work/fix1_render/NOTES.md) so the dome lands on the
 * target sRGB written beside it. The reference frames at level pitch show the
 * sky to 37 degrees only and measure pale warm grey there (222,216,197), so
 * the visible top of a level frame is a pale neutral grey and the deeper blue
 * is what a player looking up at the derrick crown sees.
 */
export const ATMOS = {
  horizon: [1.285, 0.793, 0.400],   // 238,224,200 pale warm
  low:     [0.912, 0.737, 0.473],   // 228,221,205 at 12 degrees, pale, a touch less warm
  mid:     [0.520, 0.508, 0.455],   // 206,205,200 at 35 degrees, the top of a level frame: pale neutral grey (the reference frames measure 222,216,197 there; a blue top pushes CLAIMS 10 warmCool negative because the sky is the bright quartile)
  zenith:  [0.132, 0.199, 0.370],   // 120,145,185 overhead, deeper and cooler, seen when the player looks up the derrick
  haze:    [1.824, 1.129, 0.525],   // 244,234,214 the dust band on the horizon
  below:   [0.846, 0.613, 0.397],   // 226,214,196 the dome under the horizon: a little darker than the haze so the far ground edge is not a bright seam
  sunGlow: [1.0, 0.72, 0.42],
  cloud:   [1.253, 0.977, 0.779],   // 236,230,224 thin high cloud
};
/**
 * The fill (environment map) palette, linear radiance. Deliberately NOT the
 * visible sky scaled down: in three's units a sky bright enough to look right
 * puts five times too much light into the shade, and the pale warm horizon
 * band dominates the integral and makes shade warm (that was round 0). This
 * is the sky as a light: cool overhead, neutral cool at the horizon, a small
 * warm lobe toward the sun, warm sand bounce from below. With the hemisphere
 * light on top, shade on sand comes out near 0.33 of lit sand (sRGB luma) and
 * 80 to 90 B minus R units cooler than it.
 */
export const ENV_ZENITH = [0.055, 0.100, 0.260];
export const ENV_HORIZON = [0.100, 0.140, 0.225];
export const ENV_GROUND = [0.150, 0.115, 0.070];   // sand bounce seen by down facing surfaces: warm, unshadowed; kept under the sky term so a vertical shade face (half sky, half ground) still reads cool and only an underside reads warm
export const ENV_SUN_LOBE = 0.05;

/**
 * Direction FROM the origin TOWARD the sun, unit length. Azimuth from north
 * (-Z) clockwise seen from above; east (+X) is 90; 250 is west south west so
 * x is negative and z positive. Shadows fall east north east, 2.5x the height.
 */
export function sunDirection(THREE, out) {
  const az = SUN_AZIMUTH_DEG * Math.PI / 180, el = SUN_ELEVATION_DEG * Math.PI / 180;
  const c = Math.cos(el);
  const v = out || new THREE.Vector3();
  return v.set(Math.sin(az) * c, Math.sin(el), -Math.cos(az) * c).normalize();
}

/**
 * GLSL atmosphere model shared by the sky dome (sky.js), the aerial
 * perspective in every material, the hills ring and the environment map.
 * Needs the uniforms below in the shader that includes it.
 *   atmosSky(dir, clouds01): linear radiance of the sky in a direction.
 *   aerialAmount(depth, dirY): 0..1 haze mix for a fragment.
 */
export const ATMOS_UNIFORMS_GLSL = /* glsl */`
uniform vec3 uAtmHorizon, uAtmLow, uAtmMid, uAtmZenith, uAtmHaze, uAtmBelow, uAtmSunGlow, uAtmCloud;
uniform vec3 uAtmSunDir;
uniform float uAtmGlow, uAtmTime, uAerDensity, uAerLift, uAerStart;
`;
export const ATMOS_GLSL = /* glsl */`
float atmHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float atmNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(atmHash(i), atmHash(i + vec2(1.0, 0.0)), f.x),
             mix(atmHash(i + vec2(0.0, 1.0)), atmHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 atmosSky(vec3 d, float clouds) {
  float y = clamp(d.y, -1.0, 1.0);
  float el = asin(y);
  // gradient: horizon -> low by 12 degrees -> mid by 35 -> zenith by 90
  vec3 col = mix(uAtmHorizon, uAtmLow, smoothstep(0.0, 0.21, el));
  col = mix(col, uAtmMid, smoothstep(0.17, 0.61, el));
  col = mix(col, uAtmZenith, smoothstep(0.55, 1.50, el));
  // dust band, the lowest 5 degrees, paler and warmer
  float band = pow(1.0 - clamp(el / 0.09, 0.0, 1.0), 1.5);
  col = mix(col, uAtmHaze, band * 0.8);
  // sun: a wide warm lobe, a tighter core; the disc is drawn by the dome only
  float sd = max(dot(d, uAtmSunDir), 0.0);
  float glow = pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.45;
  // forward scatter along the horizon toward the sun: the west sky is warmer
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(uAtmSunDir.x, 0.0, uAtmSunDir.z))), 0.0);
  glow += pow(az, 3.0) * 0.10 * (1.0 - smoothstep(0.0, 0.5, el));
  col += uAtmSunGlow * glow * uAtmGlow;
  // thin high cloud streaks, 8 to 40 degrees, stretched along the wind (x)
  if (clouds > 0.0) {
    vec2 p = vec2(atan(d.x, d.z) * 3.2, el * 14.0);
    p.x += uAtmTime * 0.004;
    float n = atmNoise(p * vec2(0.55, 2.0)) * 0.55 + atmNoise(p * vec2(1.4, 4.6) + 3.7) * 0.30 + atmNoise(p * vec2(3.2, 9.0) + 9.1) * 0.15;
    float win = smoothstep(0.14, 0.30, el) * (1.0 - smoothstep(0.55, 0.85, el));
    float c = smoothstep(0.64, 0.82, n) * win * clouds;
    vec3 cc = uAtmCloud + uAtmSunGlow * pow(sd, 3.0) * 0.20;
    col = mix(col, cc, c * 0.40);
  }
  // below the horizon: the far ground meets a dome of the haze colour
  col = mix(col, uAtmBelow, smoothstep(0.004, -0.02, y));
  return col;
}
float aerialAmount(float depth, float dirY) {
  float t = max(depth - uAerStart, 0.0);
  float k = uAerDensity * (1.0 + uAerLift * clamp(dirY, 0.0, 0.5) * 2.0);
  return 1.0 - exp(-t * k);
}
`;

/** One shared set of atmosphere uniforms; every shader that includes ATMOS_GLSL gets these same objects. */
export function createAtmosUniforms(THREE, sunDir) {
  const c = (a) => ({ value: new THREE.Color(a[0], a[1], a[2]) });
  return {
    uAtmHorizon: c(ATMOS.horizon), uAtmLow: c(ATMOS.low), uAtmMid: c(ATMOS.mid), uAtmZenith: c(ATMOS.zenith),
    uAtmHaze: c(ATMOS.haze), uAtmBelow: c(ATMOS.below), uAtmSunGlow: c(ATMOS.sunGlow), uAtmCloud: c(ATMOS.cloud),
    uAtmSunDir: { value: sunDir },
    uAtmGlow: { value: 1.0 },
    uAtmTime: { value: 0 },
    uAerDensity: { value: 0.0038 },   // 30 m: 9 percent, 60 m: 19, 140 m (map edge): 40
    uAerLift: { value: 1.6 },         // looking 30 degrees up the density is 2.4x: the crown pales before the base
    uAerStart: { value: 6.0 },
  };
}
let _shared = null;
export function atmosUniforms(THREE) {
  if (!_shared) _shared = createAtmosUniforms(THREE, sunDirection(THREE));
  return _shared;
}

function isLit(m) {
  return !!m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);
}
/** Materials whose shader has the standard fog chunks: those get the aerial perspective. */
function isFoggable(m) {
  return !!m && m.fog !== false && (isLit(m) || m.isMeshBasicMaterial);
}

/**
 * The aerial perspective patch. Vertex: a world space view vector varying.
 * Fragment: replace fog_fragment with a mix toward the sky radiance in that
 * direction. Runs before tonemapping, in linear HDR, so the dome and the
 * hazed terrain agree at the horizon.
 */
function aerialPatch(shader, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\nvarying vec3 vAerDir;')
    .replace('#include <fog_vertex>', '#include <fog_vertex>\nvAerDir = transpose(mat3(viewMatrix)) * mvPosition.xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nvarying vec3 vAerDir;\n' + ATMOS_UNIFORMS_GLSL + ATMOS_GLSL)
    .replace('#include <fog_fragment>', /* glsl */`
#ifdef USE_FOG
  {
    vec3 aerD = normalize(vAerDir);
    float aerA = aerialAmount(vFogDepth, aerD.y);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, atmosSky(aerD, 0.0), aerA);
  }
#endif`);
}

/**
 * The environment map: the ENV_* fill palette above the horizon and a warm
 * sand bounce below, filtered by PMREM. Small: 32 px per face is more
 * than enough for a gradient. Built once.
 */
function buildEnvironment(THREE, renderer, sunDir) {
  const u = atmosUniforms(THREE);
  const envScene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...u, uEnvZenith: { value: new THREE.Color(...ENV_ZENITH) }, uEnvHorizon: { value: new THREE.Color(...ENV_HORIZON) }, uEnvGround: { value: new THREE.Color(...ENV_GROUND) }, uEnvSunLobe: { value: ENV_SUN_LOBE } },
    vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: ATMOS_UNIFORMS_GLSL + ATMOS_GLSL + /* glsl */`
uniform vec3 uEnvZenith, uEnvHorizon, uEnvGround; uniform float uEnvSunLobe;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec3 sky = mix(uEnvHorizon, uEnvZenith, smoothstep(0.0, 0.9, el));
  float sd = max(dot(d, uAtmSunDir), 0.0);
  sky += uAtmSunGlow * pow(sd, 4.0) * uEnvSunLobe;
  // ground bounce below the horizon, blending across the lowest 6 degrees
  float g = smoothstep(0.10, -0.06, d.y);
  vec3 col = mix(sky, uEnvGround, g);
  gl_FragColor = vec4(col, 1.0);
}`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat);
  envScene.add(dome);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let tex = null;
  try {
    const rt = pmrem.fromScene(envScene, 0.02, 1, 100);
    tex = rt.texture;
  } catch (e) { console.warn('[lighting] environment build failed', e && e.message); }
  pmrem.dispose(); dome.geometry.dispose(); mat.dispose();
  return tex;
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
  const atm = atmosUniforms(THREE);

  // Cascaded sun. `lightMargin` is how far behind the cascade box the shadow
  // camera sits along the light direction: a 20 m crown at 22 degrees throws
  // 50 m, so casters up to 60 m up sun of the box still land in it.
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
    lightMargin: 60,
  });
  csm.fade = true;
  for (const l of csm.lights) {
    l.color.setHex(SUN_COLOR);
    l.shadow.normalBias = T.name === 'phone' ? 0.09 : 0.05;
    l.name = 'sun';
  }
  csm.updateFrustums();
  const sun = csm.lights[0];

  // The cool fill, part one: a hemisphere light matching the environment's
  // sky and ground terms. Part two is the environment map below; together
  // they put shade on sand at about 0.35 of lit sand (sRGB luma) and 80 to
  // 90 units bluer in B minus R, which is the reference relationship
  // (CLAIMS.md claims 1, 2 and 10).
  const sky = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, SKY_INTENSITY);
  sky.position.set(0, 50, 0);
  sky.name = 'skyfill';
  scene.add(sky);

  // The environment map. The rig owns scene.environment: see the header.
  const envTex = buildEnvironment(THREE, renderer, sunDir);   // the fill, see ENV_* above
  function applyEnvironment() {
    if (!envTex) return;
    if (scene.environment !== envTex) {
      scene.environment = envTex;
      scene.environmentIntensity = 1.0;
    }
  }
  applyEnvironment();

  // A plain Fog keeps USE_FOG defined on every material and gives sprites and
  // anything unpatched a horizon coloured haze. The patched materials ignore
  // its colour and distances and use the atmosphere model instead.
  const fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  if (T.fog !== false) scene.fog = fog;
  if (!scene.background) scene.background = new THREE.Color(FOG_COLOR);

  // Material setup. Every lit material goes through csm.setupMaterial once and
  // every foggable material gets the aerial perspective patch. A WeakSet
  // remembers which ones are done.
  const done = new WeakSet();
  function setupMaterial(m) {
    if (!m || done.has(m)) return false;
    const lit = isLit(m), foggable = isFoggable(m);
    if (!lit && !foggable) return false;
    done.add(m);
    // CSM replaces onBeforeCompile. If a module (terrain, bake, fx) already
    // hooked the material, keep its hook and run all of them, and keep the
    // program cache key distinct so two materials with different hooks do
    // not share a program.
    const prevHook = m.onBeforeCompile;
    const prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.call(m) : '';
    const hasPrev = typeof prevHook === 'function' && prevHook !== THREE.Material.prototype.onBeforeCompile;
    let csmHook = null;
    if (lit) { csm.setupMaterial(m); csmHook = m.onBeforeCompile; }
    m.onBeforeCompile = function (shader, r) {
      if (hasPrev) prevHook.call(this, shader, r);
      if (csmHook) csmHook.call(this, shader, r);
      if (foggable) aerialPatch(shader, atm);
    };
    m.customProgramCacheKey = () => (hasPrev ? prevKey : '') + (csmHook ? '|csm' + T.cascades : '') + (foggable ? '|aer' : '');
    m.needsUpdate = true;
    return true;
  }
  function refresh(root = scene) {
    applyEnvironment();
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

  function update(cam = camera, dt = 0.016) {
    applyEnvironment();
    atm.uAtmTime.value += dt;
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
    if (scene.environment === envTex) scene.environment = null;
    if (envTex) envTex.dispose();
  }

  const rig = {
    sun, sky, fog, csm, sunDir, tier: T, scene, atmos: atm, environment: envTex,
    update, setExposure, setupMaterial, refresh, dispose,
  };
  try { globalThis.__RIG__ = rig; } catch (e) { /* no globalThis (tests) */ }
  return rig;
}
