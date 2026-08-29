/**
 * DERRICK  render/materials.js  (owner: materials, round 3)
 *
 * Real PBR surfaces on every object, from the 14 Atlas material sets in ./textures/, applied
 * by TRIPLANAR projection so no asset needs UVs. The blind critic's deciding property was
 * "every object in the build is one flat albedo with no wear"; this is the single approved
 * change for round 3.
 *
 * How it fits the pipeline that already exists (nothing in assetlib.js, surfaces.js or the
 * assets is touched):
 *
 *   ASSET(url, { surfaces: true })          the loader, unchanged: flat colours, recipe NAMES
 *   applyMaterials(obj, opts)               THIS MODULE, replaces the vertexiseMaterials() call
 *     phase 1  pick a material SET per part from the recipe name first (plaster | stone |
 *              timber | tile | metal | fabric | foliage | ground) and the part colour second,
 *              and put that set's textures on the part's material as an identity
 *     phase 2  bake.js vertexiseMaterials(): colour, roughness and metalness go into vertex
 *              attributes and every part of one set shares ONE material value
 *     phase 3  swap that shared material for the TriplanarMaterial of the set, shared across
 *              every asset in the game, so assetlib's bakeStatic() merges a block to one mesh
 *              per set exactly as it merged one mesh per surfaces.js recipe before
 *   bakeStatic(block)                        unchanged
 *
 * The tint: the asset's own colour is in the `color` vertex attribute, the texture is
 * normalised to its mean (albedo = tint * texel / mean), so the palette in
 * style/STYLE-LOCK.md survives on average and the texture carries only the surface: grain,
 * rust streaks, seams, ripples. Same for roughness. Metalness is the asset's own.
 *
 * Space: static bakes carry world positions in their vertices (bakeStatic applies each
 * placement's world matrix before merging), so the projection reads the WORLD position
 * through modelMatrix, which is the identity for a baked block and the real matrix for
 * anything not baked. Anything that moves (soldiers, pump jacks, the viewmodel) projects in
 * its own LOCAL space instead (opts.local), so the surface sticks to the part as it moves.
 *
 * The lighting rig's hooks chain after this material's own (prevHook, then CSM, then the
 * dust film, the aerial perspective and the cull fade). The film and the fade look for
 * `#include <normal_fragment_maps>`, `#include <fog_vertex>` and friends, so those include
 * lines are left in place: this module's normal code runs BEFORE that include and the include
 * expands to nothing because the material carries no normalMap of its own.
 *
 *   await preloadMaterials(tier)                    once, before the level (main.js)
 *   applyMaterials(obj, { asset, unify, local })    after ASSET(), in place of vertexiseMaterials
 *   applyTerrainMaterial(terrain, tier)             after buildTerrain (main.js)
 *
 * Round 5 (foliage): CARDS. A material named 'card:<name>' (assets/palm_tree.js, dead_shrub.js,
 * grass_tuft.js) is an alpha tested plane wearing one of the Atlas cutouts in ./textures/card_*.webp
 * through the plane's own 0..1 uvs, not the triplanar projection: see CardMaterial below. Same
 * three phases, same one shared material per card across the game, so bakeStatic merges every
 * frond_a in a block to one mesh (DoubleSide and alphaTest live on that shared material, and the
 * merge keeps the material object, so both survive). Shadows come from three's own depth material,
 * which copies map and alphaTest from the material (WebGLShadowMap.getDepthMaterial, 0.169), so a
 * frond throws a leaflet shaped shadow, not a rectangle.
 */
import * as THREE from 'three';
import { VertexPBRMaterial, vertexiseMaterials } from '../game/bake.js?v=r13-202608291158';
import { classify, RECIPES } from '../../surfaces.js?v=r13-202608291158';
import { sunDirection, SUN_COLOR, SUN_INTENSITY } from './lighting.js?v=r13-202608291158';   // round 5: the cards' backlight reads the rig's sun

/**
 * The sets. `scale` is metres per tile. `normal` is the normal map strength, `albedo` and
 * `rough` how much of the texture's variation is used (1 = all of it). `recipe` is the
 * surfaces.js name the lighting rig reads for its dust hold (DUST_HOLD) and its sand skip.
 */
export const SETS = {
  // round 4 (owner): the sand ripples read too large and too even, like wrinkled cloth, at a 3 m tile with a
  // 1.3 normal. Real ripples are 5 to 15 cm apart and a centimetre high: the tile drops to 1 m (the same
  // micro tile the terrain samples, so a fillet and the ground it sits on carry the same ripple) and the
  // relief to 0.5. The macro 12 m sample on the terrain carries the drift scale variation.
  sand_sunlit:           { scale: 1.0, normal: 0.5, albedo: 1.0, rough: 0.8, recipe: 'ground' },
  sand_packed:           { scale: 2.0, normal: 0.7, albedo: 1.0, rough: 0.8, recipe: 'ground' },
  red_oxide_steel:       { scale: 2.0, normal: 0.8, albedo: 1.0, rough: 1.0, recipe: 'metal' },
  // round 4 (owner): zinc sheet in shade went blue grey. The fill is now warm neutral (lighting.js) and the set
  // takes a small warm bias on top: dust and rust bloom on twenty year old galvanising
  galvanised_corrugated: { scale: 1.2, normal: 0.9, albedo: 1.0, rough: 1.0, recipe: 'metal', tint: [1.04, 1.0, 0.92] },
  concrete_bleached:     { scale: 2.5, normal: 0.9, albedo: 1.0, rough: 0.9, recipe: 'stone' },
  timber_weathered:      { scale: 1.0, normal: 0.9, albedo: 1.0, rough: 0.9, recipe: 'timber' },
  canvas_tan:            { scale: 0.5, normal: 0.8, albedo: 0.9, rough: 0.8, recipe: 'fabric' },
  rubber_black:          { scale: 0.6, normal: 0.7, albedo: 0.8, rough: 0.8, recipe: '' },
  olive_fabric:          { scale: 0.5, normal: 0.8, albedo: 0.9, rough: 0.8, recipe: 'fabric' },
  rock_desert:           { scale: 2.5, normal: 1.0, albedo: 1.0, rough: 0.9, recipe: 'stone' },
  plaster_khaki:         { scale: 2.0, normal: 0.8, albedo: 1.0, rough: 0.9, recipe: 'plaster' },
  metal_painted_grey:    { scale: 2.0, normal: 0.8, albedo: 1.0, rough: 1.0, recipe: 'metal' },
  dry_palm:              { scale: 1.0, normal: 0.9, albedo: 1.0, rough: 0.9, recipe: 'foliage' },
  // round 5 (foliage): the date palm trunk, frond boots in a spiral; the tile carries about seven boots across, a
  // real boot is 0.2 m wide, so 1.5 m per tile. Keyed by the material NAME 'palm_bark' (chooseSet), no recipe guess.
  palm_bark:             { scale: 1.5, normal: 0.9, albedo: 1.0, rough: 0.9, recipe: 'timber' },
};

/**
 * The foliage cards (round 5). `sss` is the backlight: a thin leaf lit from behind glows, so the card
 * adds emissive = albedo x sun x sss where the sun is on the far side of the card from the viewer.
 * `tint` is how far the card's own colour is pulled toward the asset's material colour (0 = the
 * photo as is, 1 = the same tint rule the triplanar sets use). The alpha cut is 0.5 for every card.
 */
export const CARDS = {
  // sss is a fraction of the Lambert term of the sun (the shader divides by pi as three does): 0.15 on a frond seen
  // against the sun adds a quarter of what a face square to the sun receives; the first cut at 0.3 without the
  // pi went 2.5x the direct term and the crown read white from below
  palm_frond_a: { sss: 0.15, tint: 0.30 },
  palm_frond_b: { sss: 0.15, tint: 0.30 },
  palm_frond_c: { sss: 0.10, tint: 0.35 },
  date_cluster: { sss: 0.03, tint: 0.30 },   // the card itself is desaturated at prep (the photo's stalks were orange); a light pull toward the asset's brown
  dead_shrub_a: { sss: 0.06, tint: 0.35 },
  dead_shrub_b: { sss: 0.10, tint: 0.45 },   // the saltbush photo is grey green; the lock allows barely green
  grass_tuft_a: { sss: 0.20, tint: 0.35 },
  grass_tuft_b: { sss: 0.20, tint: 0.35 },
};
const CARD_PREFIX = 'card:';

/** Sets that ship a 1024 tile for the high tier: the ground under every frame and the derrick's own steel. */
const HERO_1024 = new Set(['sand_sunlit', 'red_oxide_steel']);

/** Assets whose grey metal is galvanised sheet, mesh or grating rather than painted plant. */
const GALVANISED_ASSETS = /corrugated|shipping_container|barbed_wire|caged_ladder|catwalk|ibc_tote|mud_pump_shed|pump_house|bunkhouse|watchtower|floodlight_mast|steel_shelving|locker_bank/;
/** Assets whose 'stone' is rock, not concrete. */
const ROCK_ASSETS = /rock_outcrop|culvert|debris_scatter/;
/**
 * Per asset tint on a recipe (round 4, owner): the palm trunk read paler than lit sand. Its vertex
 * colours run grey 0x8f8a7e to tan and, being a vertical cylinder, it takes the low sun at 2.5x the
 * irradiance of flat ground; the reference trunk is a dark grey brown. The asset is not touched:
 * the multiplier goes onto the part's colour here, before it is baked into the vertices.
 */
const ASSET_TINT = [
  // round 5: the palm_tree trunk entry (0.58 on timber) is gone; the trunk wears the palm_bark set with its own colour
];

// ------------------------------------------------------------------------------------------ textures
const TEX = {};                  // set -> { map, normal, rough, mean: Color, roughMean }
const TEX_TO_SET = new Map();    // basecolor texture -> set name (the phase 1 identity)
const CARD_TEX = {};             // card -> { map, mean: Color }  (round 5)
const TEX_TO_CARD = new Map();   // card texture -> card name
let loading = null;
let NORMAL_FLIP = 1.0;           // +1 for OpenGL green up (measured against the height maps, see NOTES.md)

function meanOf(image, srgb, alphaWeighted = false) {
  // mean in LINEAR space, from a 32 x 32 downsample: enough for a tile mean, free at load.
  // alphaWeighted: the mean of what a card SHOWS (round 5), transparent texels count for nothing
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let r = 0, g = 0, b = 0, n = 0;
  const lin = (v) => { v /= 255; return srgb ? (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) : v; };
  for (let i = 0; i < d.length; i += 4) {
    const w = alphaWeighted ? d[i + 3] / 255 : 1;
    if (w <= 0) continue;
    r += lin(d[i]) * w; g += lin(d[i + 1]) * w; b += lin(d[i + 2]) * w; n += w;
  }
  n = Math.max(n, 1e-6);
  return [r / n, g / n, b / n];
}

/**
 * Load every set for the tier. 512 tiles everywhere; the high tier takes 1024 for the three
 * HERO_1024 sets. Basecolor is sRGB, normal and roughness are linear data; mipmaps on,
 * anisotropy from the tier. Resolves when every texture is decoded and its mean is known.
 */
export function preloadMaterials(tier = {}, base = './textures/') {
  if (loading) return loading;
  const aniso = Math.max(1, tier.anisotropy || 1);
  const high = tier.name !== 'phone';
  const loader = new THREE.TextureLoader();
  const one = (url, srgb) => new Promise((resolve) => {
    loader.load(url, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
      resolve(t);
    }, undefined, (e) => { console.warn('[materials] failed to load', url, e && e.message); resolve(null); });
  });
  loading = (async () => {
    const t0 = performance.now();
    await Promise.all(Object.keys(SETS).map(async (set) => {
      const res = high && HERO_1024.has(set) ? 1024 : 512;
      const [map, normal, rough] = await Promise.all([
        one(`${base}${set}_basecolor_${res}.webp`, true),
        one(`${base}${set}_normal_${res}.webp`, false),
        one(`${base}${set}_roughness_${res}.webp`, false),
      ]);
      if (!map || !normal) return;   // a set that fails to load is simply not applied
      const mean = meanOf(map.image, true);
      const rm = rough ? meanOf(rough.image, false) : [1, 1, 1];
      TEX[set] = { map, normal, rough, mean: new THREE.Color(mean[0], mean[1], mean[2]), roughMean: rm[0], res };
      TEX_TO_SET.set(map, set);
    }));
    // round 5: the cards. Clamped (a cutout never repeats), mipmapped, anisotropy from the tier
    await Promise.all(Object.keys(CARDS).map(async (card) => {
      const map = await one(`${base}card_${card}.webp`, true);
      if (!map) return;
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      map.needsUpdate = true;
      const mean = meanOf(map.image, true, true);
      CARD_TEX[card] = { map, mean: new THREE.Color(mean[0], mean[1], mean[2]) };
      TEX_TO_CARD.set(map, card);
    }));
    console.info(`[materials] ${Object.keys(TEX).length}/${Object.keys(SETS).length} sets, ${Object.keys(CARD_TEX).length}/${Object.keys(CARDS).length} cards loaded in ${(performance.now() - t0).toFixed(0)} ms`);
    return TEX;
  })();
  return loading;
}
export function loadedSets() { return TEX; }
export function loadedCards() { return CARD_TEX; }
/** The card a material asks for by name ('card:palm_frond_a' -> 'palm_frond_a'), or null. */
export function cardOf(m) {
  const n = m && m.name;
  return n && n.startsWith(CARD_PREFIX) && CARDS[n.slice(CARD_PREFIX.length)] ? n.slice(CARD_PREFIX.length) : null;
}
export function setNormalFlip(v) { NORMAL_FLIP = v; }

// ------------------------------------------------------------------------------------------ classification
const _c = new THREE.Color();
function hsl(m) {
  _c.copy(m.color).convertLinearToSRGB();
  const r = _c.r, g = _c.g, b = _c.b;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  let hue = 0;
  if (max > min) {
    const d = max - min;
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
    if (hue < 0) hue += 360;
  }
  return { sat, lum, hue, r, g, b };
}

/**
 * Recipe name first, colour second. Returns a set name or null (glass and emissive lenses keep
 * the material they arrived with).
 */
export function chooseSet(m, asset = '', local = false) {
  if (!m || !m.color) return null;
  if (m.name && SETS[m.name]) return m.name;   // round 5: an asset may name a set outright ('palm_bark')
  if (m.transparent && m.opacity < 0.95) return null;
  if (m.emissive && m.emissive.getHex() && (m.emissiveIntensity || 1) > 0.5) return null;
  const { sat, lum, hue, r, g } = hsl(m);
  let recipe = m.name && RECIPES[m.name] ? m.name : null;
  if (!recipe) {
    // unnamed near black: tyres, hoses, grips, cable. Static parts share the painted grey tile (at 0x1d1e20
    // the two tiles are the same black; a rubber bucket in every block with a tyre or a hose cost draws),
    // the rubber tile is kept for what is held and seen at 0.3 m: weapon grips, the viewmodel
    if (lum < 0.16) return local ? 'rubber_black' : 'metal_painted_grey';
    recipe = classify(m);
    if (!recipe) return null;
  }
  switch (recipe) {
    case 'ground': return 'sand_sunlit';
    case 'stone': return ROCK_ASSETS.test(asset) ? 'rock_desert' : 'concrete_bleached';
    case 'plaster': return 'plaster_khaki';
    case 'timber': return 'timber_weathered';
    case 'tile': return 'concrete_bleached';
    case 'foliage': return 'dry_palm';
    case 'fabric': return (hue >= 55 && hue <= 170 && g >= r * 0.92) ? 'olive_fabric' : 'canvas_tan';   // olive drab 0x4e5238; khaki, sandbag and canvas go tan
    case 'metal': {
      if (sat > 0.3 && (hue < 20 || hue > 340) && lum < 0.6) return 'red_oxide_steel';           // derrick red oxide 0x8b4530, container red 0x9c4a3c
      // rust 0x6b4426: the drips and plates are 5 to 40 cm and read from their tint; a set of their own cost one
      // bakeStatic bucket in nearly every block (peak draws 813 against 659 before), so they share the
      // galvanised tile, which carries rust streaks of its own, and rust_steel is not shipped
      if (sat > 0.3 && hue >= 20 && hue < 50 && lum < 0.45) return 'galvanised_corrugated';
      if (GALVANISED_ASSETS.test(asset) && sat < 0.6) return 'galvanised_corrugated';           // sheet, mesh, grating, container livery
      return 'metal_painted_grey';                                                               // tanks, pipes, generators, machinery, weapons
    }
    default: return null;
  }
}

// ------------------------------------------------------------------------------------------ the material
const TRI_PARS_VS = /* glsl */`
attribute vec2 aRM;
varying vec2 vRM;
varying vec3 vTriPos;
varying vec3 vTriNrm;
uniform float uTriLocal;`;

const TRI_VS = /* glsl */`
{
  vec4 triW = modelMatrix * vec4( transformed, 1.0 );
  vec3 triN = normalize( mat3( modelMatrix ) * objectNormal );
  vTriPos = mix( triW.xyz, transformed, uTriLocal );
  vTriNrm = mix( triN, objectNormal, uTriLocal );
}`;

const TRI_PARS_FS = /* glsl */`
varying vec2 vRM;
varying vec3 vTriPos;
varying vec3 vTriNrm;
uniform sampler2D uTriMap;
uniform sampler2D uTriNormal;
uniform sampler2D uTriRough;
uniform vec4 uTriK;          // x: 1 / metres per tile, y: normal strength, z: albedo strength, w: roughness strength
uniform vec3 uTriMean;       // mean linear albedo of the tile
uniform vec3 uTriTint;       // per set colour bias (SETS[].tint), 1 for most sets
uniform float uTriRoughMean;
uniform float uTriLocal;
uniform float uTriNFlip;
uniform float uTriWear;      // round 12: edge wear amount per set (SETS[].wear, default 1 for metal and timber, 0.4 otherwise)
uniform mat4 modelMatrix;`;

/**
 * The projection. Per axis a right handed tangent frame (T, B, N) with T x B = N, so the
 * normal map's green is always "up the tile" in world space and the sign flips on the
 * negative faces keep the tile unmirrored:
 *   X: T = (0,0,-s), B = (0,1,0), N = (s,0,0)   uv = (-s z, y)
 *   Y: T = (1,0,0),  B = (0,0,-s), N = (0,s,0)  uv = (x, -s z)
 *   Z: T = (s,0,0),  B = (0,1,0), N = (0,0,s)   uv = (s x, y)
 * Whiteout blend per projection, then the three are summed by the blend weights and
 * renormalised. Weights are |n| cut by 0.2 and raised to the 4th, so an axis aligned face
 * samples ONE projection (3 texture reads) and a 45 degree edge blends over a tight band.
 */
const TRI_FS = /* glsl */`
vec3 triN; float triR;
{
  vec3 n = normalize( vTriNrm );
  #ifdef DOUBLE_SIDED
    n *= gl_FrontFacing ? 1.0 : -1.0;
  #endif
  vec3 bw = abs( n );
  bw = max( bw - 0.2, 0.0 );
  bw = bw * bw; bw = bw * bw;
  bw /= ( bw.x + bw.y + bw.z + 1e-5 );
  vec3 s = vec3( n.x < 0.0 ? -1.0 : 1.0, n.y < 0.0 ? -1.0 : 1.0, n.z < 0.0 ? -1.0 : 1.0 );
  vec3 p = vTriPos * uTriK.x;
  vec3 alb = vec3( 0.0 ); vec3 nrm = vec3( 0.0 ); float rgh = 0.0;
  if ( bw.x > 0.0 ) {
    vec2 uv = vec2( -s.x * p.z, p.y );
    alb += texture2D( uTriMap, uv ).rgb * bw.x;
    vec3 t = texture2D( uTriNormal, uv ).xyz * 2.0 - 1.0; t.y *= uTriNFlip; t.xy *= uTriK.y;
    vec3 nT = vec3( -s.x * n.z, n.y, s.x * n.x );
    vec3 w = vec3( t.xy + nT.xy, abs( t.z ) * nT.z );
    nrm += vec3( s.x * w.z, w.y, -s.x * w.x ) * bw.x;
    rgh += texture2D( uTriRough, uv ).r * bw.x;
  }
  if ( bw.y > 0.0 ) {
    vec2 uv = vec2( p.x, -s.y * p.z );
    alb += texture2D( uTriMap, uv ).rgb * bw.y;
    vec3 t = texture2D( uTriNormal, uv ).xyz * 2.0 - 1.0; t.y *= uTriNFlip; t.xy *= uTriK.y;
    vec3 nT = vec3( n.x, -s.y * n.z, s.y * n.y );
    vec3 w = vec3( t.xy + nT.xy, abs( t.z ) * nT.z );
    nrm += vec3( w.x, s.y * w.z, -s.y * w.y ) * bw.y;
    rgh += texture2D( uTriRough, uv ).r * bw.y;
  }
  if ( bw.z > 0.0 ) {
    vec2 uv = vec2( s.z * p.x, p.y );
    alb += texture2D( uTriMap, uv ).rgb * bw.z;
    vec3 t = texture2D( uTriNormal, uv ).xyz * 2.0 - 1.0; t.y *= uTriNFlip; t.xy *= uTriK.y;
    vec3 nT = vec3( s.z * n.x, n.y, s.z * n.z );
    vec3 w = vec3( t.xy + nT.xy, abs( t.z ) * nT.z );
    nrm += vec3( s.z * w.x, w.y, s.z * w.z ) * bw.z;
    rgh += texture2D( uTriRough, uv ).r * bw.z;
  }
  vec3 ratio = clamp( alb / max( uTriMean, vec3( 0.02 ) ), 0.2, 3.0 );
  diffuseColor.rgb *= mix( vec3( 1.0 ), ratio, uTriK.z ) * uTriTint;
  triN = normalize( nrm );
  triR = clamp( mix( 1.0, rgh / max( uTriRoughMean, 0.05 ), uTriK.w ), 0.2, 1.6 );
  // round 12 (audit): MACRO VARIATION. The same tile read once more at 1/9 of the frequency on the dominant
  // projection; its luminance against the tile mean modulates albedo and roughness by up to 35 percent, so
  // three tiles side by side no longer read as three copies. One extra texture read, no new texture.
  {
    vec3 pm = vTriPos * uTriK.x * 0.11;
    vec2 uvm = bw.y >= bw.x && bw.y >= bw.z ? vec2( pm.x, -s.y * pm.z ) : ( bw.x >= bw.z ? vec2( -s.x * pm.z, pm.y ) : vec2( s.z * pm.x, pm.y ) );
    vec3 m = texture2D( uTriMap, uvm + vec2( 0.37, 0.61 ) ).rgb;
    float lm = dot( m, vec3( 0.3, 0.59, 0.11 ) ) / max( dot( uTriMean, vec3( 0.3, 0.59, 0.11 ) ), 0.02 );
    lm = clamp( lm, 0.5, 1.8 );
    diffuseColor.rgb *= mix( 1.0, lm, 0.35 );
    triR *= mix( 1.0, 1.0 / lm, 0.25 );
  }
  // round 12 (audit): EDGE WEAR. Where the surface normal leaves the three projection axes (the chamfers the
  // loader now cuts on every box over 25 cm, the shoulders of every cylinder) the paint is worn to a lighter,
  // smoother base. Axis aligned faces get none; a 45 degree face gets the full amount.
  {
    float offAxis = 1.0 - max( bw.x, max( bw.y, bw.z ) );
    float wear = smoothstep( 0.08, 0.45, offAxis ) * uTriWear;
    diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 1.3 + vec3( 0.06 ), wear * 0.7 );
    triR = mix( triR, triR * 0.7, wear );
  }
}`;

const TRI_ROUGH_FS = /* glsl */`float roughnessFactor = clamp( vRM.x * triR, 0.04, 1.0 );`;
const TRI_METAL_FS = /* glsl */`float metalnessFactor = vRM.y;`;
const TRI_NORMAL_FS = /* glsl */`
{
  vec3 nW = mix( triN, normalize( mat3( modelMatrix ) * triN ), uTriLocal );
  normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
}`;

export class TriplanarMaterial extends VertexPBRMaterial {
  constructor(set, params) {
    super(params);
    if (set) {
      const S = SETS[set];
      this.userData = { __vrm: true, surface: S.recipe, triSet: set, triLocal: 0, triDetail: 1 };
      this.name = S.recipe;
      // IDENTITY, not a uv map: assetlib's bakeStatic merges by material VALUES and its key reads the map
      // uuids; with no map every set was equal by value and a block collapsed to one bucket drawn with the
      // first set met (measured: 10 assets baked to 2 meshes, everything wearing sand). The basecolor sits
      // on `map` so the buckets stay one per set; the shader below replaces map_fragment whole, so the uv
      // sampling three would do with USE_MAP never runs.
      if (TEX[set]) this.map = TEX[set].map;
    }
  }
  onBeforeCompile(shader) {
    const set = this.userData.triSet, S = SETS[set], T = TEX[set];
    if (!S || !T) return;
    shader.uniforms.uTriMap = { value: T.map };
    shader.uniforms.uTriNormal = { value: T.normal };
    shader.uniforms.uTriRough = { value: T.rough || T.normal };
    const detail = this.userData.triDetail || 1;   // < 1 = a smaller tile: weapons and the viewmodel are seen at 0.3 m
    shader.uniforms.uTriK = { value: new THREE.Vector4(1 / (S.scale * detail), S.normal, S.albedo, T.rough ? S.rough : 0) };
    shader.uniforms.uTriMean = { value: T.mean };
    shader.uniforms.uTriTint = { value: new THREE.Color(...(S.tint || [1, 1, 1])) };
    shader.uniforms.uTriWear = { value: S.wear !== undefined ? S.wear : ((S.recipe === 'metal' || S.recipe === 'timber') ? 1.0 : 0.4) };
    shader.uniforms.uTriRoughMean = { value: T.roughMean };
    shader.uniforms.uTriLocal = { value: this.userData.triLocal ? 1 : 0 };
    shader.uniforms.uTriNFlip = { value: NORMAL_FLIP };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>' + TRI_PARS_VS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRM = aRM;')
      .replace('#include <project_vertex>', '#include <project_vertex>' + TRI_VS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + TRI_PARS_FS)
      .replace('#include <map_fragment>', TRI_FS)
      .replace('#include <roughnessmap_fragment>', TRI_ROUGH_FS)
      .replace('#include <metalnessmap_fragment>', TRI_METAL_FS)
      .replace('#include <normal_fragment_maps>', TRI_NORMAL_FS + '\n#include <normal_fragment_maps>');
  }
  customProgramCacheKey() { return 'derrick_tri'; }
}
Object.defineProperty(TriplanarMaterial.prototype, 'isTriplanar', { value: true });

// ------------------------------------------------------------------------------------------ cards (round 5)
const CARD_PARS_FS = /* glsl */`
uniform vec3 uCardInvMean;   // 1 / mean linear albedo of the card's opaque texels
uniform vec4 uCardK;         // x: tint toward the asset colour, y: backlight, z w: unused
uniform vec3 uCardSunW;      // direction toward the sun, world
uniform vec3 uCardSun;       // sun colour x intensity`;
// the asset's colour (vertex colour) pulls the photo's colour lightly toward the palette
const CARD_COLOR_FS = /* glsl */`diffuseColor.rgb *= mix( vec3( 1.0 ), vColor * uCardInvMean, uCardK.x );`;
// a card is a leaf, not a wall: both faces shade from the SAME normal (the asset bends its normals toward up
// and outward so a crown reads as one lit mass, not as a fan of planes each lit or unlit by its own facing)
const CARD_NORMAL_FS = /* glsl */`
#ifdef DOUBLE_SIDED
  normal = normalize( vNormal );
#endif`;
// backlight: the geometric facing from the view position derivatives (always toward the viewer); when the sun is
// on the far side of the card the leaf transmits, so the albedo glows by uCardK.y of the sun
const CARD_EMISSIVE_FS = /* glsl */`
{
  vec3 cgp = - vViewPosition;
  vec3 cgN = normalize( cross( dFdx( cgp ), dFdy( cgp ) ) );
  vec3 csun = normalize( ( viewMatrix * vec4( uCardSunW, 0.0 ) ).xyz );
  float cback = max( 0.0, - dot( cgN, csun ) );
  totalEmissiveRadiance += diffuseColor.rgb * uCardSun * ( uCardK.y * cback );
}`;

let SUN_W = sunDirection(THREE).clone().normalize(), SUN_RGB = new THREE.Color(SUN_COLOR).multiplyScalar(SUN_INTENSITY / Math.PI);
/** Where the sun is and how bright, for the backlight; taken from lighting.js at load, this lets a probe move it. */
export function setCardSun(dirToSun, color, intensity) {
  SUN_W = dirToSun.clone().normalize();
  SUN_RGB = new THREE.Color(color).multiplyScalar(intensity / Math.PI);
}

/**
 * One alpha tested, double sided VertexPBR per card, shared by every asset in the game. The card's
 * photo goes through three's own map path (uv 0..1 across the plane, sRGB decode, mipmaps,
 * alphaTest 0.5 in alphatest_fragment) and the depth material picks map and alphaTest up for the
 * shadow. isVertexPBR stays true so the rig's chain (CSM, dust film at the foliage hold, aerial
 * perspective, cull fade) applies as to everything else; the triplanar hook is NOT used here.
 */
export class CardMaterial extends VertexPBRMaterial {
  constructor(card, params) {
    super(params);
    if (card && CARD_TEX[card]) {
      this.userData = { __vrm: true, surface: 'foliage', card, triSet: CARD_PREFIX + card };
      this.name = 'foliage';   // the rig's dust class: fronds shed the film (DUST_HOLD.foliage)
      this.map = CARD_TEX[card].map;
      this.alphaTest = 0.5;
      this.side = THREE.DoubleSide;
      this.transparent = false;
      this.alphaToCoverage = true;   // softer cut on the MSAA target; a no op without MSAA (phone tier)
    }
  }
  onBeforeCompile(shader) {
    VertexPBRMaterial.prototype.onBeforeCompile.call(this, shader);
    const card = this.userData.card, C = CARDS[card], T = CARD_TEX[card];
    if (!C || !T) return;
    shader.uniforms.uCardInvMean = { value: new THREE.Vector3(1 / Math.max(T.mean.r, 0.02), 1 / Math.max(T.mean.g, 0.02), 1 / Math.max(T.mean.b, 0.02)) };
    shader.uniforms.uCardK = { value: new THREE.Vector4(C.tint, C.sss, 0, 0) };
    shader.uniforms.uCardSunW = { value: SUN_W };
    shader.uniforms.uCardSun = { value: SUN_RGB };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + CARD_PARS_FS)
      .replace('#include <color_fragment>', CARD_COLOR_FS)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>' + CARD_NORMAL_FS)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + CARD_EMISSIVE_FS);
  }
  customProgramCacheKey() { return 'derrick_card'; }
}
Object.defineProperty(CardMaterial.prototype, 'isCard', { value: true });

const CARD_SHARED = new Map();   // card|depthWrite|... -> CardMaterial
const WARNED_CARDS = new Set();
function cardSharedFor(card, m) {
  const key = [card, m.depthWrite ? 1 : 0, m.flatShading ? 1 : 0].join('|');
  let t = CARD_SHARED.get(key);
  if (!t) {
    t = new CardMaterial(card);
    t.depthWrite = m.depthWrite; t.flatShading = m.flatShading;
    CARD_SHARED.set(key, t);
  }
  return t;
}

const SHARED = new Map();   // set|side|transparent|opacity|emissive|... -> TriplanarMaterial, shared across every asset
function sharedFor(set, m, local, detail = 1) {
  const key = [set, m.side, m.transparent ? 1 : 0, m.opacity, m.emissive ? m.emissive.getHexString() : '-', m.emissiveIntensity,
    m.alphaTest, m.depthWrite ? 1 : 0, m.flatShading ? 1 : 0, local ? 'L' : 'W', detail].join('|');
  let t = SHARED.get(key);
  if (!t) {
    t = new TriplanarMaterial(set);
    t.side = m.side; t.transparent = m.transparent; t.opacity = m.opacity;
    if (m.emissive) t.emissive.copy(m.emissive);
    t.emissiveIntensity = m.emissiveIntensity; t.alphaTest = m.alphaTest; t.depthWrite = m.depthWrite; t.flatShading = m.flatShading;
    t.userData.triLocal = local ? 1 : 0;
    t.userData.triDetail = detail;
    SHARED.set(key, t);
  }
  return t;
}

/**
 * Texture one loaded asset. Replaces the vertexiseMaterials() call the integrator made:
 *   applyMaterials(obj, { asset: 'oil_drum' })                       static, world projection
 *   applyMaterials(obj, { asset: 'pump_jack', unify: true, local: true })   articulated
 * `unify` (bake.js) puts the whole figure on one set (the set with the most vertices), so the
 * per joint collapse still yields one mesh per joint. `local` projects in the object's own
 * space so the surface travels with it. `detail` scales the tile (0.3 on a weapon: a 2 m paint
 * tile is one flat colour across a 0.9 m rifle). Returns { tagged, swapped, sets }.
 */
export function applyMaterials(root, opts = {}) {
  const asset = opts.asset || '';
  const local = !!opts.local;
  const detail = opts.detail || 1;
  const stats = { tagged: 0, swapped: 0, sets: new Set() };
  if (!Object.keys(TEX).length) { vertexiseMaterials(root, { unify: !!opts.unify }); return stats; }

  // phase 1: choose a set per part and mark the part's material with the set's textures
  const chosen = [];
  const counts = new Map();
  const cards = [], orphans = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (!m.isMeshStandardMaterial || m.isVertexPBR) return;
    const card = cardOf(m);
    if (card) { if (CARD_TEX[card]) cards.push([o, card]); else orphans.push([o, card]); return; }
    let set = opts.set || chooseSet(m, asset, local);
    if (!set || !TEX[set]) return;
    chosen.push([o, set]);
    if (opts.unify) counts.set(set, (counts.get(set) || 0) + o.geometry.attributes.position.count * (o.isInstancedMesh ? o.count : 1));
  });
  let force = null;
  if (opts.unify && counts.size) force = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const clones = new Map();   // source material -> its tagged clone (materials may be shared between parts)
  for (const [o, set0] of chosen) {
    const set = force || set0;
    const T = TEX[set];
    const src = o.material;
    const ck = src.uuid + '|' + set;
    let mm = clones.get(ck);
    if (!mm) {
      mm = src.clone();
      mm.name = src.name;
      mm.map = T.map; mm.normalMap = T.normal; mm.roughnessMap = T.rough || null;
      mm.normalScale = new THREE.Vector2(1, 1);
      for (const t of ASSET_TINT) if (t.asset.test(asset) && (src.name === t.recipe || SETS[set].recipe === t.recipe)) mm.color.multiply(new THREE.Color(...t.k));
      clones.set(ck, mm);
    }
    o.material = mm;
    stats.tagged++;
    stats.sets.add(set);
  }
  // a card whose photo did not load is dropped, not drawn: a card plane with no map is a solid tan rectangle
  // hanging in the crown (seen once when a texture was rewritten while the phone gate was loading)
  for (const [o, card] of orphans) {
    if (!WARNED_CARDS.has(card)) { WARNED_CARDS.add(card); console.warn(`[materials] card ${card} not loaded: its planes are dropped from ${asset || 'asset'}`); }
    o.removeFromParent();
  }
  // round 5: cards. The asset ships the card material as transparent 0.9 so surfaces.js leaves its uvs alone
  // (classify() skips transparent parts; otherwise it would tile the plane's uvs by the part size and the
  // photo would repeat three times along a frond). Here it becomes the opaque alpha tested card: the photo on
  // `map` is the phase 1 identity, the asset's colour stays on the material and goes into the vertices in phase 2.
  for (const [o, card] of cards) {
    const src = o.material;
    const ck = src.uuid + '|card:' + card;
    let mm = clones.get(ck);
    if (!mm) {
      mm = src.clone();
      mm.name = src.name;
      mm.map = CARD_TEX[card].map; mm.normalMap = null; mm.roughnessMap = null;
      mm.transparent = false; mm.opacity = 1; mm.alphaTest = 0.5; mm.side = THREE.DoubleSide;
      clones.set(ck, mm);
    }
    o.material = mm;
    stats.tagged++;
    stats.sets.add(CARD_PREFIX + card);
  }

  // phase 2: colour, roughness and metalness into the vertices, one VertexPBR per set (bake.js, untouched)
  vertexiseMaterials(root, { unify: !!opts.unify });

  // phase 3: the shared triplanar material of the set in place of the per asset VertexPBR
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (!m.isVertexPBR || m.isTriplanar || m.isCard) return;
    const card = m.map ? TEX_TO_CARD.get(m.map) : null;
    if (card) { o.material = cardSharedFor(card, m); stats.swapped++; return; }
    const set = m.map ? TEX_TO_SET.get(m.map) : null;
    if (!set) return;
    o.material = sharedFor(set, m, local, detail);
    stats.swapped++;
  });
  return stats;
}

// ------------------------------------------------------------------------------------------ terrain
/**
 * The terrain keeps its own material (world/terrain.js: vertex paint, the world space detail
 * gradient folded into the normal, the cull and film hooks) and only its TILES change: the
 * procedural sand and gravel tiles become sand_sunlit on open ground and sand_packed on the
 * road, the tracks, the wadi bed and the pads, chosen per vertex from the terrain's own
 * surface classes (aPack, built here from terrain.grid.classes, no terrain.js change).
 * Sand is sampled at two scales, micro 2 m and macro 12 m, multiplied, so no repeat shows at
 * 20 m; the micro normal carries the ripples, weighted by the terrain's own ripple mask so
 * the road, the pads and the cuts are calmer than the open dunes.
 */
export function applyTerrainMaterial(terrain, tier = {}) {
  const S = TEX.sand_sunlit, P = TEX.sand_packed;
  const m = terrain && terrain.material;
  if (!m || !S || !P) { console.warn('[materials] terrain: sand sets not loaded, terrain keeps its procedural tiles'); return false; }
  // per vertex packed weight from the class grid: 1 = packed or concrete (road, tracks, bed, pads), 0 = sand or rock
  const G = terrain.grid;
  if (G && G.classes) {
    const inv = 1 / G.cell;
    for (const t of terrain.tiles) {
      const pos = t.geometry.attributes.position;
      const pk = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        let ix = Math.round((pos.getX(i) - G.minX) * inv), iz = Math.round((pos.getZ(i) - G.minZ) * inv);
        ix = Math.max(0, Math.min(G.nx - 1, ix)); iz = Math.max(0, Math.min(G.nz - 1, iz));
        const c = G.classes[iz * G.nx + ix];
        pk[i] = c === 1 || c === 2 ? 1 : 0;
      }
      t.geometry.setAttribute('aPack', new THREE.BufferAttribute(pk, 1));
    }
  }
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (shader, r) {
    if (typeof prev === 'function') prev.call(this, shader, r);
    shader.uniforms.uTrSand = { value: S.map };
    shader.uniforms.uTrSandN = { value: S.normal };
    shader.uniforms.uTrSandR = { value: S.rough || S.normal };
    shader.uniforms.uTrPack = { value: P.map };
    shader.uniforms.uTrPackN = { value: P.normal };
    shader.uniforms.uTrPackR = { value: P.rough || P.normal };
    shader.uniforms.uTrMean = { value: new THREE.Vector4(S.mean.r, S.mean.g, S.mean.b, S.roughMean) };
    shader.uniforms.uTrMeanP = { value: new THREE.Vector4(P.mean.r, P.mean.g, P.mean.b, P.roughMean) };
    shader.uniforms.uTrNFlip = { value: NORMAL_FLIP };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPack;\nvarying float vPack;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPack = aPack;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + TERRAIN_PARS_FS)
      .replace('vec4 sampledDiffuseColor = mix( texture2D( map, vMapUv ), texture2D( derrickGravelMap, vMapUv ), dMask );', TERRAIN_ALB_FS)
      // terrain.js edits the TEXT of normal_fragment_begin and normal_fragment_maps; in three 0.169 the hook
      // sees the include lines unexpanded (the bake.js round 2 finding), so those edits never applied and its
      // ripple, gravel and detail gradient normals never reached the screen. The include lines are replaced
      // whole here: the detail gradient fold the world agent wrote, then the sand and packed normal maps.
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>' + TERRAIN_FOLD_FS)
      .replace('#include <normal_fragment_maps>', TERRAIN_NRM_FS)
      .replace('#include <roughnessmap_fragment>', TERRAIN_ROUGH_FS);
  };
  m.customProgramCacheKey = () => (typeof prevKey === 'function' ? prevKey() : '') + '|tri';
  m.needsUpdate = true;
  return true;
}

const TERRAIN_PARS_FS = /* glsl */`
varying float vPack;
uniform sampler2D uTrSand; uniform sampler2D uTrSandN; uniform sampler2D uTrSandR;
uniform sampler2D uTrPack; uniform sampler2D uTrPackN; uniform sampler2D uTrPackR;
uniform vec4 uTrMean; uniform vec4 uTrMeanP; uniform float uTrNFlip;
float trRough;`;
// micro 1 m (round 4, was 2 m: the owner read the 2 m ripples as wrinkled cloth) and macro 12 m for sand;
// the packed tile (tyre tracks) at 2 m with a 9 m macro
// uv = (x, -z): the same lay as the triplanar Y projection on every sand fillet, so ripples run the
// same way on the ground and on the drift against a wall; three's tangent frame here has +v toward +z
// (vNormalMapUv), so the sampled normal's green is flipped back below
const TERRAIN_ALB_FS = /* glsl */`
vec2 trWP = vec2( vDerrickWP.x, -vDerrickWP.y );
vec2 trUvS = trWP * 1.0, trUvSM = trWP * ( 1.0 / 12.0 ) + 0.37;
vec2 trUvP = trWP * 0.5, trUvPM = trWP * ( 1.0 / 9.0 ) + 0.61;
vec3 trS = texture2D( uTrSand, trUvS ).rgb / max( uTrMean.rgb, 0.02 );
vec3 trSM = texture2D( uTrSand, trUvSM ).rgb / max( uTrMean.rgb, 0.02 );
vec3 trP = texture2D( uTrPack, trUvP ).rgb / max( uTrMeanP.rgb, 0.02 );
vec3 trPM = texture2D( uTrPack, trUvPM ).rgb / max( uTrMeanP.rgb, 0.02 );
float trPk = smoothstep( 0.35, 0.65, vPack );
vec3 trRatio = mix( trS * mix( vec3( 1.0 ), trSM, 0.6 ), trP * mix( vec3( 1.0 ), trPM, 0.5 ), trPk );
vec4 sampledDiffuseColor = vec4( clamp( trRatio, 0.25, 2.5 ), 1.0 );
trRough = mix( texture2D( uTrSandR, trUvS ).r / max( uTrMean.a, 0.05 ), texture2D( uTrPackR, trUvP ).r / max( uTrMeanP.a, 0.05 ), trPk );`;
// the world agent's fold (terrain.js): the map wide detail gradient (ruts, ripples, hollows) into the normal
const TERRAIN_FOLD_FS = /* glsl */`
{
  vec2 dg = ( dTex.rg * 2.0 - 1.0 ) * 2.0;
  vec3 nW = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  nW = normalize( nW + nW.y * vec3( -dg.x, 0.0, -dg.y ) );
  normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
}`;
const TERRAIN_NRM_FS = /* glsl */`
{
  vec3 trNA = texture2D( uTrSandN, trUvS ).xyz * 2.0 - 1.0;
  vec3 trNB = texture2D( uTrSandN, trUvSM ).xyz * 2.0 - 1.0;
  vec3 trNP = texture2D( uTrPackN, trUvP ).xyz * 2.0 - 1.0;
  // round 4: ripple relief cut (was 0.8 to 1.5 micro, 0.4 macro): a centimetre high ripple does not shade
  // like a fold of cloth; the crests no longer catch the sun to white and the troughs no longer fall into
  // the frame's darkest quarter
  float trRip = mix( 0.35, 0.7, dTex.a );
  vec3 trNS = normalize( vec3( trNA.xy * trRip + trNB.xy * 0.25, trNA.z * trNB.z ) );
  vec3 mapN = normalize( mix( trNS, trNP, trPk ) );
  mapN.y *= -uTrNFlip;
  mapN.xy *= normalScale * ( 1.0 - smoothstep( 25.0, 60.0, length( vViewPosition ) ) );
  normal = normalize( tbn * mapN );
}`;
const TERRAIN_ROUGH_FS = /* glsl */`float roughnessFactor = clamp( roughness * mix( 1.0, trRough, 0.8 ), 0.5, 1.0 );`;
