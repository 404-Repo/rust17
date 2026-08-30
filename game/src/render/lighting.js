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
 *  4. (round 2) A WEATHERING FILM on every object material (see DUST_* below): a
 *     sand film that returns the sky in shade, dust on up faces, bleach on south
 *     faces, a few percent of colour variation. And a dithered CULL FADE on the
 *     clutter and scatter groups so main.js's distance switch is never seen.
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
import { getTier } from './quality.js?v=r24-202608300023';

/** Sun placement, MAP-PLAN section 1: azimuth 250 degrees, elevation 22. */
export const SUN_AZIMUTH_DEG = 250;
export const SUN_ELEVATION_DEG = 22;
export const SUN_COLOR = 0xffd6ac;   // round 15: a notch warmer for the same reason   // was 0xffd2a0; the critic's tells included a red ORANGE derrick and orange sand, so the key is a shade less saturated. round 4: a hair yellower (0xffd8b0 -> 0xffdab4), the reference's lit sand is yellow tan (218,185,123), not orange
export const SUN_INTENSITY = 5.6;   // round 2: was 5.6 at EXPOSURE 1.15, and lit sand measured 205 to 233 luma on the critic frames (bar 170 to 205, palette sand 0xcdb88e); the sun and the exposure both come down a step, the fill does not, so shade lifts relative to sun
/**
 * ROUND 4, the fill re-solved against eyedrops of the reference (work/r4/render/ref_eyedrops.txt). In the
 * CoD frames NOTHING in shade is blue: a shaded corrugated wall is (114,96,76), a shaded generator
 * (104,90,56), sand in a container's shadow (134,122,105) down to (46,37,30), all at B minus R
 * between -5 and -48. What makes the second colour temperature is the LIT side, which is far
 * warmer than ours was: lit sand (218,185,123) at B minus R -96 against our -57. The round 3 fill
 * (sky 0x7d9de8 at 0.5 plus a blue env) put blue into every shade AND into the lit sand, so shade
 * read blue grey (the owner's galvanised complaint) and lit sand read pale and neutral. So:
 *   sky term      dimmer and less saturated: shade on sand goes to a neutral grey and 0.35 to
 *                 0.45 of lit sand, the lit sand loses its blue cast
 *   ground term   dim warm: what an underside sees is the ground in its own shadow
 *   GROUND BOUNCE a warm lit sand term added in the shader (bouncePatch) that peaks on VERTICAL
 *                 faces and is cut to a third on undersides: a wall in shade sees half a hemisphere
 *                 of sunlit sand, the underside of a catwalk sees mostly its own shadow. This is
 *                 the asymmetry the reference has (vertical shade at 65 to 115 luma while sand in
 *                 shadow drops to 45) and a HemisphereLight alone cannot make: its ground colour
 *                 lights undersides more than walls.
 */
export const SKY_COLOR = 0x8797c2;   // round 15: 0x8c98b8 -> 0x8797c2, warmCool measured 15 against the reference median 42 (shade a notch cooler)   // hemisphere sky term: a desaturated blue grey (round 3: 0x7d9de8 blue; the cyan leaning contract value 0x8fb0d8 went green on sand; iterations 1 to 3: 0x8c9bc0, 0x929cb4). Shade on sand should land a little warm of neutral, the reference's is (134,122,105) to (46,37,30), B minus R -16 to -28; iteration 3 measured -22 to -29 on the shadowed frames
export const GROUND_COLOR = 0x6e6c68;   // the ground an underside sees: its own shadow, near neutral, dim. Round 4 iteration 1 tried warm (0x7c6a54) and the frame's darkest quarter went as warm as its brightest (warmCool +5); the reference's deep shade is neutral (B minus R -5 to -12), so the underside terms are neutral and only the wall bounce is warm
export const SKY_INTENSITY = 0.33;   // round 16: 0.36 -> 0.33 after the atmosphere refit lifted shade (shadowRatio 0.38 -> 0.45); round 15: 0.40 -> 0.36, shadowRatio measured 0.46 against the CoD median 0.35 (docs/CLAIMS.md 2)  // round 4: 0.50 -> 0.40 with the sky colour desaturated: shade on sand was 0.41 to 0.5 of lit sand and blue; the bar is 0.35 to 0.45 and neutral
/** Lit sand bounce onto vertical faces, linear irradiance: the sun on flat sand is (2.1, 1.5, 1.0) x sand albedo (0.61, 0.48, 0.27) / pi = (0.41, 0.23, 0.09) radiance; a wall sees half that hemisphere, cut by the ground its own shadow covers. */
export const BOUNCE_COLOR = [0.20, 0.14, 0.08];   // iteration 4: a touch less saturated than the pure sand bounce (0.21, 0.135, 0.062): the reference's shaded rust is (76,62,50), ours measured redder
export const BOUNCE_UNDER = 0.25;   // fraction of the bounce an underside gets: the ground beneath a deck is that deck's shadow (0.35 in iteration 1: undersides read warm, the reference's are neutral dark)
export const FOG_COLOR = 0xeadcc4;  // plain Fog colour for unpatched materials: the horizon haze after ACES
export const FOG_NEAR = 35;
export const FOG_FAR = 190;
export const EXPOSURE = 0.82;       // round 15: 0.85 -> 0.82 with the panorama sky, the sky band and lit sand sat a step above the reference       // round 2: 1.15 -> 0.88, lit sand was blown to near white (critic item 100); measured after the change in work/fix2_render/NOTES.md. round 4: 0.88 -> 0.85, the brightest 30 percent of the near sand measured 200 to 202 on the sun facing dune (bar 170 to 200) with 175 on flat ground; the ATMOS stops below were solved at 0.88 and land 2 to 3 units darker now, inside the reference spread

/**
 * Atmosphere palette, LINEAR radiance before the ACES curve (EXPOSURE 1.15).
 * Each value was solved (work/fix1_render/NOTES.md) so the dome lands on the
 * target sRGB written beside it. The reference frames at level pitch show the
 * sky to 37 degrees only and measure pale warm grey there (222,216,197), so
 * the visible top of a level frame is a pale neutral grey and the deeper blue
 * is what a player looking up at the derrick crown sees.
 */
export const ATMOS = {
  // round 16 (Ben: "Do 2", sky to ground handshake): every stop below refitted to the RENDERED Atlas panorama
  // (work/sky/atmos_new.json: sky read off two level shots at 3, 12 and 30 degrees away from the sun, inverted
  // through the ACES curve at EXPOSURE 0.82; high and zenith scaled from the panorama by the same ratio as mid).
  // The aerial perspective, the far hills and the fill now fade toward the sky that is actually behind them.
  // 16b (Ben: "the mountains on the horizon seem very white"): `below`, what the far sand fades toward, is a
  // tan a step darker than the horizon band (was the same brightness), so the edge dunes stop reading as white.
  // round 2, solved for EXPOSURE 0.88 (work/fix2_render/NOTES.md): the horizon band is warmer
  // and paler than before, the top of a level frame stays pale (the reference frames measure
  // 222,216,197 at 37 degrees), and the sky turns blue above 40 degrees so a frame pitched up
  // at the derrick crown has a blue zenith (critic item 7).
  // round 4: the top of a level frame (37 degrees at fov 74) measured neutral in the build (B minus R +4 to -13)
  // and warm in twelve reference frames (median -31, range -14 to -58: work/r4/render/ref_eyedrops.txt), so the low
  // and mid stops warm up. The frame's brightest quarter is sky and lit sand; a neutral sky there was half of
  // the missing warm side of claim 10. Solved with work/r4/render/solve_atmos.py.
  horizon: [1.600, 0.880, 0.390],   // 240,226,200 pale warm, 0 degrees
  low:     [0.572, 0.472, 0.329],   // 232,219,192 at 12 degrees (was 228,220,204)
  mid:     [0.316, 0.314, 0.289],   // 212,203,182 at 35 degrees, the top of a level frame (was 210,209,202; reference 222,216,197 at 37 and warmer still in most frames)
  high:    [0.210, 0.241, 0.257],   // 176,186,204 at 55 degrees, the blue starts (was 170,184,207)
  zenith:  [0.151, 0.189, 0.221],   // 104,134,188 overhead
  haze:    [1.450, 0.800, 0.360],   // 244,233,212 the dust band, thickest at the horizon, gone by 9 degrees
  below:   [0.950, 0.520, 0.240],   // 228,214,194 the dome under the horizon: a little darker than the haze so the far ground edge is not a bright seam
  sunGlow: [1.0, 0.72, 0.42],
  cloud:   [1.790, 1.322, 1.009],   // 238,231,224 thin high cloud
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
export const ENV_ZENITH = [0.065, 0.100, 0.190];   // round 4: down and less blue (was 0.070, 0.125, 0.310): shade on sand is the sky's colour and the reference's is neutral grey, not blue
export const ENV_HORIZON = [0.150, 0.145, 0.135];  // round 4: the horizon band as a light is the pale warm haze the dome shows, not a blue sky (was 0.140, 0.195, 0.300, which put blue into every wall)
export const ENV_GROUND = [0.110, 0.102, 0.092];   // round 4: dim and near neutral: the ground an underside sees is its own shadow (round 2: 0.125, 0.120, 0.110; iteration 1 tried warm 0.140, 0.105, 0.065 and the darks went warm); the lit sand bounce onto walls is BOUNCE_COLOR in the shader
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
uniform vec3 uAtmHorizon, uAtmLow, uAtmMid, uAtmHigh, uAtmZenith, uAtmHaze, uAtmBelow, uAtmSunGlow, uAtmCloud;
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
  // gradient: horizon -> low by 12 degrees -> mid by 35 -> high by 55 -> zenith by 90
  vec3 col = mix(uAtmHorizon, uAtmLow, smoothstep(0.0, 0.21, el));
  col = mix(col, uAtmMid, smoothstep(0.17, 0.61, el));
  col = mix(col, uAtmHigh, smoothstep(0.58, 0.96, el));
  col = mix(col, uAtmZenith, smoothstep(0.90, 1.55, el));
  // dust band: thickest at the horizon, thinning out by 9 degrees, paler and warmer than the sky above it
  float band = pow(1.0 - clamp(el / 0.16, 0.0, 1.0), 1.7);
  col = mix(col, uAtmHaze, band * 0.85);
  // sun: a wide warm lobe, a tighter core; the disc is drawn by the dome only
  float sd = max(dot(d, uAtmSunDir), 0.0);
  float glow = pow(sd, 6.0) * 0.16 + pow(sd, 48.0) * 0.45;
  // forward scatter along the horizon toward the sun: the west sky is warmer
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(uAtmSunDir.x, 0.0, uAtmSunDir.z))), 0.0);
  glow += pow(az, 3.0) * 0.08 * (1.0 - smoothstep(0.0, 0.5, el));
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
    uAtmHorizon: c(ATMOS.horizon), uAtmLow: c(ATMOS.low), uAtmMid: c(ATMOS.mid), uAtmHigh: c(ATMOS.high), uAtmZenith: c(ATMOS.zenith),
    uAtmHaze: c(ATMOS.haze), uAtmBelow: c(ATMOS.below), uAtmSunGlow: c(ATMOS.sunGlow), uAtmCloud: c(ATMOS.cloud),
    uAtmSunDir: { value: sunDir },
    uAtmGlow: { value: 1.0 },
    uAtmTime: { value: 0 },
    uAerDensity: { value: 0.0027 },   // round 17 item 5: 0.0038 -> 0.0027 so the skirt dunes at 200 to 400 m keep some of their own colour (was 78 percent haze at 400 m, a pale wall); 30 m: 6, 140 m: 30, 400 m: 65
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
 * ROUND 2 ROOT CAUSE of "objects get no sky light" (critic item 2), found while adding the
 * film below: game/src/game/bake.js VertexPBRMaterial moves roughness and metalness into a
 * vertex attribute and its prototype hook replaces the TEXT `float roughnessFactor =
 * roughness;` and `float metalnessFactor = metalness;`. In three 0.169 onBeforeCompile
 * receives the shader with its `#include <...>` lines still unexpanded (measured: the
 * fragment source handed to the hook is 4 kB and contains `#include <roughnessmap_fragment>`
 * and no `roughnessFactor`), so both replacements silently match nothing and every baked
 * material renders with the material's own values, which the class sets to roughness 1 and
 * METALNESS 1. Every asset, soldier and the viewmodel has been drawn as a fully rough metal:
 * no Lambert term, so the hemisphere light and the sun's diffuse never reached them, and
 * their only fill was the environment map's specular lobe. That is exactly the frame the
 * critic described. The terrain is a plain material, so the sand was lit correctly.
 *
 * The rig repairs it in the same hook chain: for a VertexPBR material whose source still
 * carries the two include lines after its own hook ran, the includes are expanded here with
 * vRM.x and vRM.y in place of the uniforms (the chunk text below is three 0.169's). If
 * bake.js is fixed to replace the include lines itself, the source no longer carries them,
 * this does nothing, and nothing is applied twice. The exact bake.js change is written in
 * work/fix2_render/NOTES.md for the integrator.
 */
const VRM_ROUGH = /* glsl */`
float roughnessFactor = vRM.x;
#ifdef USE_ROUGHNESSMAP
  vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
  roughnessFactor *= texelRoughness.g;
#endif`;
const VRM_METAL = /* glsl */`
float metalnessFactor = vRM.y;
#ifdef USE_METALNESSMAP
  vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
  metalnessFactor *= texelMetalness.b;
#endif`;
function vrmPatch(shader) {
  if (!shader.fragmentShader.includes('varying vec2 vRM;')) return false;   // bake.js's hook did not run: nothing to read
  if (!shader.fragmentShader.includes('#include <roughnessmap_fragment>')) return false;   // already handled upstream
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <roughnessmap_fragment>', VRM_ROUGH)
    .replace('#include <metalnessmap_fragment>', VRM_METAL);
  return true;
}

/**
 * The weathering film (round 2, critic item 2: "give objects the same sky light the
 * terrain receives"). The hemisphere light and the environment map already reach every
 * material; what crushed the objects was albedo. Red oxide (0x8b4530) is 0.26 / 0.06 / 0.03
 * linear, so under a blue grey sky it returns almost nothing and the shade side of a beam
 * measured 0.06 to 0.10 luma, red. Sand (0xcdb88e) is 0.61 / 0.48 / 0.27 and shows the same
 * sky at 0.35. Twenty years of blowing sand puts a film of that sand on every face of every
 * object (STYLE-LOCK: dust on every up face, bleach on every south face, 3 to 8 percent
 * variation between parts), and that film is what returns the sky in shade.
 *
 * So every lit material that is not itself sand gets, in its own shader, before lighting:
 *   dust  = a sand coloured film, DUST_SIDE on every face (less on undersides), plus DUST_UP
 *           on faces that look up, uneven by a 0.3 to 0.6 m value noise in object space;
 *           the film raises roughness and kills metalness where it lies
 *   bleach = the +Z (south) face 6 percent lighter than the -Z face
 *   vary  = plus or minus 4 percent of the base colour by the same noise
 * It is a material change lit by the real rig, not a tint: the underside of a deck gets the
 * ground bounce (warm) through the film exactly as before, a north face gets the sky through
 * it (cool), and the lit face gets the sun. Sand fillets, dust caps and the terrain (material
 * name 'ground') are skipped: they are the dust.
 */
export const DUST_COLOR = [0.40, 0.39, 0.36];    // a thin film reads greyer than the drift it came from: sand sunlit 0xcdb88e linear (0.61, 0.48, 0.27) dulled and greyed. In the sun it goes warm with the sun; in shade it returns the sky. round 4: a touch greyer (was 0.42, 0.40, 0.35)
export const DUST_SIDE = 0.22; // integrator r2: 0.28 -> 0.15 now the assets' own material pass carries the tone variation (render agent's own lever). round 4: 0.15 -> 0.22, the shade side of red oxide measured B minus R -41 against the reference's shaded rust at -26; the film is what greys it   // measured at 0.10 first: the shade side of a beam moved 3 luma units, invisible
export const DUST_UP = 0.35;
export const BLEACH_SOUTH = 0.06;
export const VARY = 0.08;

const DUST_PARS_VS = /* glsl */`
varying vec2 vDst;
uniform vec4 uDstK;
float dstHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dstNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dstHash(i), dstHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(dstHash(i + vec3(0.0, 1.0, 0.0)), dstHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(dstHash(i + vec3(0.0, 0.0, 1.0)), dstHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(dstHash(i + vec3(0.0, 1.0, 1.0)), dstHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}`;
// Per vertex (the assets carry 800 to 14,000 triangles, so a 0.4 m noise is sampled well
// enough, and per fragment it is eight sines on every pixel of the frame for nothing). The
// normal here is the vertex normal: baked geometry is non indexed with a normal per face,
// so a box top and a box side classify as their face.
const DUST_VS = /* glsl */`
{
  vec3 dN = normalize(transpose(mat3(viewMatrix)) * transformedNormal);
  float dUp = clamp(dN.y, 0.0, 1.0);
  float dDown = clamp(-dN.y, 0.0, 1.0);
  float dSouth = clamp(dN.z, 0.0, 1.0);
  float dV = dstNoise(transformed * 2.3);
  // handled, machined and painted-this-year surfaces (weapons, roughness under 0.6 in the
  // style lock) hold no film; rough paint, sheet and cloth hold all of it. The author's
  // roughness, before the recipe's roughness map multiplies it.
  float dHold = smoothstep(0.52, 0.74, DST_BASE_ROUGH);
  float dust = (uDstK.x * (1.0 - 0.6 * dDown) + uDstK.y * dUp * dUp) * (0.7 + 0.6 * dV) * dHold;
  vDst = vec2(clamp(dust, 0.0, 0.8), 1.0 + uDstK.z * dSouth + uDstK.w * (dV - 0.5));
}`;
const DUST_PARS_FS = /* glsl */`
varying vec2 vDst;
uniform vec3 uDstColor;`;
const DUST_FS = /* glsl */`
{
  diffuseColor.rgb = mix(diffuseColor.rgb, uDstColor, vDst.x) * vDst.y;
  roughnessFactor = mix(roughnessFactor, 0.95, vDst.x);
  metalnessFactor *= 1.0 - vDst.x;
}`;
function dustPatch(shader, uniforms, vertexPBR) {
  Object.assign(shader.uniforms, uniforms);
  // bake.js declares `attribute vec2 aRM` in the vertex shader of its materials; plain
  // materials read the roughness uniform (declared here for the vertex stage; it is the
  // same program uniform the fragment stage reads)
  const baseRough = vertexPBR ? 'aRM.x' : 'roughness';
  const pars = DUST_PARS_VS + (vertexPBR ? '' : '\nuniform float roughness;');
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>' + pars)
    .replace('#include <fog_vertex>', '#include <fog_vertex>' + DUST_VS.replace('DST_BASE_ROUGH', baseRough));
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>' + DUST_PARS_FS)
    .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + DUST_FS);
}
/**
 * The ground bounce (round 4). Added to `irradiance` right after three's lights_fragment_begin,
 * where the ambient and hemisphere terms have just been summed and before lights_fragment_end
 * folds it through the material's Lambert term, so it is lit exactly as the hemisphere light is
 * (albedo, dust film, metalness all apply) and is not a tint. Weight by the WORLD normal:
 * 1 on a vertical face, 0 facing up (sand in shadow sees only sky), BOUNCE_UNDER facing down.
 * Verified in work/r4/render/probe.html: a grey box's east face goes from blue grey (61,68,83)
 * to warm grey, its top stays neutral, and the underside of the watchtower deck stays darker
 * than its legs' shade side.
 */
const BOUNCE_PARS_FS = /* glsl */`
uniform vec3 uBounce;
uniform float uBounceUnder;`;
const BOUNCE_FS = /* glsl */`
{
  vec3 bN = normalize( ( vec4( geometryNormal, 0.0 ) * viewMatrix ).xyz );
  // walls only: nothing under 9 degrees of tilt (rippled ground in shadow measured 20 units warmer in the
  // game than on the probe's flat plane before this gate: the ripple normals were collecting bounce), all of
  // it past 55 degrees
  float bW = smoothstep( 0.15, 0.6, 1.0 - abs( bN.y ) ) + clamp( -bN.y, 0.0, 1.0 ) * uBounceUnder;
  irradiance += uBounce * bW;
}`;
const _bounceUniforms = {};
function bounceUniforms(THREE) {
  if (!_bounceUniforms.uBounce) {
    _bounceUniforms.uBounce = { value: new THREE.Color(BOUNCE_COLOR[0], BOUNCE_COLOR[1], BOUNCE_COLOR[2]) };
    _bounceUniforms.uBounceUnder = { value: BOUNCE_UNDER };
  }
  return _bounceUniforms;
}
function bouncePatch(shader, uniforms) {
  // the CSM hook has already replaced the lights_pars_begin and lights_fragment_begin include lines
  // with its own expanded text, so the hooks here are the neighbours that survive: `common` for the
  // uniforms and `lights_fragment_maps` (still an include line, straight after the hemisphere sum)
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>' + BOUNCE_PARS_FS)
    .replace('#include <lights_fragment_maps>', BOUNCE_FS + '\n#include <lights_fragment_maps>');
}
/** How much film each surface class holds, as a fraction of DUST_SIDE / DUST_UP: fronds and cloth shed it, paint and sheet keep it. */
export const DUST_HOLD = { foliage: 0.3, fabric: 0.55, timber: 0.8, default: 1.0 };
const _dustUniforms = {};
function dustUniforms(THREE, cls = 'default') {
  if (!_dustUniforms[cls]) {
    const h = DUST_HOLD[cls] !== undefined ? DUST_HOLD[cls] : DUST_HOLD.default;
    _dustUniforms[cls] = {
      uDstColor: { value: new THREE.Color(DUST_COLOR[0], DUST_COLOR[1], DUST_COLOR[2]) },
      uDstK: { value: new THREE.Vector4(DUST_SIDE * h, DUST_UP * h, BLEACH_SOUTH, VARY) },
    };
  }
  return _dustUniforms[cls];
}
function dustClassOf(m) {
  const n = m.name || (m.userData && m.userData.surface) || '';
  return DUST_HOLD[n] !== undefined ? n : 'default';
}
/** Debug knobs for A/B in the critic rounds: `?dust=0` no film, `?fade=0` no cull fade. */
function knob(name) {
  try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
}
/** Sand is the dust: the terrain, the fillets and the dust caps carry the ground recipe and are left alone. */
function isSand(m) {
  return m.name === 'ground' || (m.userData && m.userData.surface === 'ground');
}

/**
 * Cull fade (round 2, critic item 100): main.js hides a block's clutter group when the
 * block's nearest edge passes FAR_CULL (50 m high, 60 phone) and its scatter group at
 * FAR_CULL_N (28 / 40), and its fine group (parts under 18 cm) at 22 / 20. The switch was a visible pop. Meshes under a '#clutter' or '#nocast'
 * group get a copy of their material that dithers the surface out over the last FADE_W
 * metres before the switch (Bayer 4 x 4 on the fragment position, in world distance), so by
 * the time main.js hides the group nothing of it is drawn. Same draw calls, one extra
 * program variant; shadows are untouched (clutter casts only within 20 m).
 * The distances follow the same URL knobs main.js reads ('far', 'farn'); rig.setCullFade()
 * lets the integrator drive them directly.
 */
const FADE_W = { clutter: 10, scatter: 8, fine: 6 };   // integrator r4: 'fine' is the small parts group (level/build.js), knob 'finecull'
function defaultCullFade(T) {
  let far = null, farn = null, finec = null;
  try { const q = new URLSearchParams(location.search); far = q.get('far'); farn = q.get('farn'); finec = q.get('finecull'); } catch (e) { /* no location */ }
  const phone = T.name === 'phone';
  const c = +(far || (phone ? 60 : 50)), n = +(farn || (phone ? 40 : 28)), f = +(finec || (phone ? 20 : 22));   // integrator r4: high 55/32 -> 50/28, fine 22
  return { clutter: [c - FADE_W.clutter, c], scatter: [n - FADE_W.scatter, n], fine: [f - FADE_W.fine, f] };
}
const FADE_PARS_VS = /* glsl */`
varying float vFadeD;`;
const FADE_VS = /* glsl */`
{
  vec4 fadeWP = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    fadeWP = batchingMatrix * fadeWP;
  #endif
  #ifdef USE_INSTANCING
    fadeWP = instanceMatrix * fadeWP;
  #endif
  fadeWP = modelMatrix * fadeWP;
  vFadeD = length(fadeWP.xyz - cameraPosition);
}`;
const FADE_PARS_FS = /* glsl */`
varying float vFadeD;
uniform vec2 uFadeRange;
float fadeBayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float fadeBayer4(vec2 a) { return fadeBayer2(0.5 * a) * 0.25 + fadeBayer2(a); }`;
const FADE_FS = /* glsl */`
{
  float fadeT = smoothstep(uFadeRange.x, uFadeRange.y, vFadeD);
  if (fadeT > 0.0 && fadeBayer4(gl_FragCoord.xy) < fadeT) discard;
}`;
function fadePatch(shader, uniform) {
  shader.uniforms.uFadeRange = uniform;
  shader.vertexShader = shader.vertexShader
    .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>' + FADE_PARS_VS)
    .replace('#include <fog_vertex>', '#include <fog_vertex>' + FADE_VS);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>' + FADE_PARS_FS)
    .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FADE_FS);
}
function fadeGroupOf(o) {
  const pn = o.parent ? String(o.parent.name) : '';
  if (pn.endsWith('#clutter')) return 'clutter';
  if (pn.endsWith('#nocast')) return 'scatter';
  if (pn.endsWith('#fine')) return 'fine';
  return null;
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
  const cullFade = defaultCullFade(T);
  const fadeU = { clutter: { value: new THREE.Vector2(...cullFade.clutter) }, scatter: { value: new THREE.Vector2(...cullFade.scatter) }, fine: { value: new THREE.Vector2(...cullFade.fine) } };
  const fadeVariants = new WeakMap();   // source material -> { clutter: variant, scatter: variant }
  function setupMaterial(m) {
    if (!m || done.has(m)) return false;
    const lit = isLit(m), foggable = isFoggable(m);
    if (!lit && !foggable) return false;
    done.add(m);
    const dusty = lit && !isSand(m) && knob('dust') !== '0';
    const dustU = dusty ? dustUniforms(THREE, dustClassOf(m)) : null;
    const bounce = lit && knob('bounce') !== '0' ? bounceUniforms(THREE) : null;   // `?bounce=0` for the A/B
    const vrm = lit && !!m.isVertexPBR;
    const fade = m.userData && m.userData.__cullFade && knob('fade') !== '0' ? fadeU[m.userData.__cullFade] : null;
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
      if (vrm) vrmPatch(shader);
      if (bounce) bouncePatch(shader, bounce);
      if (foggable) aerialPatch(shader, atm);
      if (dusty) dustPatch(shader, dustU, vrm);
      if (fade) fadePatch(shader, fade);
    };
    m.customProgramCacheKey = () => (hasPrev ? prevKey : '') + (csmHook ? '|csm' + T.cascades : '') + (vrm ? '|vrmfix' : '') + (bounce ? '|bounce' : '') + (foggable ? '|aer' : '') + (dusty ? '|dust' : '') + (fade ? '|fade' : '');   // the dust class only changes uniform values, not the program
    m.needsUpdate = true;
    return true;
  }
  /** The fade copy of a material for a cull group; made once per source material and group. */
  function fadeVariant(m, group) {
    if (!m || Array.isArray(m) || !isLit(m)) return m;
    if (m.userData && m.userData.__cullFade) return m;
    let v = fadeVariants.get(m);
    if (!v) { v = {}; fadeVariants.set(m, v); }
    if (!v[group]) {
      const c = m.clone();
      c.userData = Object.assign({}, m.userData, { __cullFade: group });
      c.name = m.name;
      v[group] = c;
    }
    return v[group];
  }
  function refresh(root = scene) {
    applyEnvironment();
    let n = 0;
    root.traverse((o) => {
      let m = o.material;
      if (!m) return;
      if (o.isMesh && !Array.isArray(m)) {
        const g = fadeGroupOf(o);
        if (g) { const fv = fadeVariant(m, g); if (fv !== m) { o.material = fv; m = fv; } }
      }
      if (Array.isArray(m)) { for (const mm of m) if (setupMaterial(mm)) n++; }
      else if (setupMaterial(m)) n++;
    });
    return n;
  }
  /** Integrator hook: rig.setCullFade({ clutter: [start, end], scatter: [start, end] }) in metres from the camera. */
  function setCullFade(r) {
    if (r && r.clutter) fadeU.clutter.value.set(r.clutter[0], r.clutter[1]);
    if (r && r.scatter) fadeU.scatter.value.set(r.scatter[0], r.scatter[1]);
    if (r && r.fine) fadeU.fine.value.set(r.fine[0], r.fine[1]);
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
    update, setExposure, setupMaterial, refresh, setCullFade, cullFade: fadeU, dust: dustUniforms(THREE, 'default'), bounce: bounceUniforms(THREE), dispose,
  };
  try { globalThis.__RIG__ = rig; } catch (e) { /* no globalThis (tests) */ }
  return rig;
}
