/**
 * Quality tiers for DERRICK (owner: render).
 *
 * Two tiers only. The numbers are the ones docs/ARCHITECTURE.md fixes; every
 * other module reads them through `tier.density`, `tier.pointLights` and so on
 * rather than re-deciding what a phone can do.
 *
 *   import { TIERS, detectTier, getTier } from './src/render/quality.js?v=r16-202608291520';
 *   const tierName = detectTier();          // 'high' | 'phone'
 *   const tier = getTier(tierName);         // the TIERS entry, with .name attached
 */

// integrator (round 0): high cascades 2 -> 1 and shadowDist 90 -> 45 (2048 map). Two cascades over 50 m cost
// 0.9 to 1.0 M shadow triangles on top of a 1.1 M main pass against the 1.7 M budget.
// render (round 1): the critic wants shadow coverage to at least 60 m. A second cascade would put the frame over
// budget, so the single cascade grows to 65 m and the map to 4096 (2.3 cm texels, the same as 2048 over 45 m).
// The shadow pass triangle count is set by main.js CAST_DIST (blocks cast within 30 m), not by shadowDist.
export const TIERS = {
  high:  { pixelRatio: 1.5, shadowMap: 4096, cascades: 1, shadowDist: 65, fog: true, post: true,  density: 1.0, pointLights: true,  anisotropy: 4 },
  phone: { pixelRatio: 1.0, shadowMap: 1024, cascades: 1, shadowDist: 45, fog: true, post: false, density: 0.5, pointLights: false, anisotropy: 1 },
};
for (const k of Object.keys(TIERS)) TIERS[k].name = k;

/**
 * '?q=high' or '?q=phone' wins. Otherwise a touch device with a small viewport
 * is a phone; everything else is high. The check is deliberately conservative
 * about calling something a phone: a touch laptop with a 1400 px viewport gets
 * the high tier, a 412 x 915 phone (the fpstest viewport) gets phone.
 */
export function detectTier() {
  try {
    const q = new URLSearchParams(location.search).get('q');
    if (q && TIERS[q]) return q;
  } catch (e) { /* no location (tests) */ }
  const touch = (typeof navigator !== 'undefined') &&
    (('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) || ('ontouchstart' in globalThis));
  const w = globalThis.innerWidth || 1280, h = globalThis.innerHeight || 720;
  const small = Math.min(w, h) <= 500 || (w * h) <= 1000 * 1000;
  const mobileUA = typeof navigator !== 'undefined' && /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent || '');
  if ((touch && small) || (mobileUA && small)) return 'phone';
  return 'high';
}

/** Accepts a tier name or a tier object and always returns the tier object. */
export function getTier(t) {
  if (!t) return TIERS.high;
  if (typeof t === 'string') return TIERS[t] || TIERS.high;
  return t;
}

/**
 * Renderer settings that belong to the tier: pixel ratio and anisotropy. The
 * colour pipeline (ACES, sRGB, exposure, shadow map type) is fixed and lives in
 * lighting.js so it cannot be set differently by two callers.
 */
export function applyTierToRenderer(renderer, tier) {
  const T = getTier(tier);
  const dpr = (globalThis.devicePixelRatio || 1);
  renderer.setPixelRatio(Math.min(dpr, T.pixelRatio));
  return T;
}
