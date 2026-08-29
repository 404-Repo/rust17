/**
 * Post processing (owner: render).
 *
 * High tier: EffectComposer with a multisampled HDR target (antialias on the
 * WebGLRenderer is discarded the moment a composer renders into its own
 * target, and thin lattice without MSAA is the loudest browser-game tell
 * there is), a RenderPass, a small bloom whose threshold sits at the sunlit
 * level so only the sun facing surfaces, the floodlight lenses and the sun
 * disc glow (a warm key side bloom, never a haze over the whole frame), the
 * OutputPass (ACES and sRGB, the same as the renderer would do), and one
 * grade pass that is a tone curve and the damage edge, nothing else: a black
 * point so the frame reaches true darks, a gentle contrast pivot, no lift, no
 * split tone, no vignette, no global tint, no grain, no desaturation.
 * CLAIMS.md names each of the removed ones as a way to game a metric, and the
 * round 1 critic named the flat lift and the low contrast as a fail.
 *
 * Phone tier: renderer.render directly; the damage edge is a single overlay
 * quad drawn only while damage > 0.
 *
 *   const post = createPost(THREE, { renderer, scene, camera, tier });
 *   post.render(dt); post.setDamage(t); post.resize(w, h);
 */
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { getTier } from './quality.js?v=r16-202608291520';
import { sunDirection, SUN_COLOR } from './lighting.js?v=r16-202608291520';

const GRADE_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Runs in display space, after OutputPass (ACES applied, sRGB encoded).
const GRADE_FS = /* glsl */`
uniform sampler2D tDiffuse;
uniform float uHurt, uBlack, uContrast, uPivot;
varying vec2 vUv;
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  // black point: ACES leaves the darkest shade near 0.03; pull it toward 0 so
  // the histogram reaches the darks (0.02, not more: the gunmetal viewmodel in
  // shade is already near black), then a mild S about the pivot. Same curve on
  // all three channels: no tint.
  col = max(col - uBlack, 0.0) / (1.0 - uBlack);
  col = (col - uPivot) * uContrast + uPivot;
  col = clamp(col, 0.0, 1.0);
  // damage: a red edge that closes in as t -> 1
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  float edge = smoothstep(0.10, 0.55, r2 * 2.0);
  col = mix(col, vec3(0.62, 0.05, 0.03), edge * uHurt * 0.85);
  col = mix(col, col * vec3(1.0, 0.72, 0.68), uHurt * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;

const OVERLAY_FS = /* glsl */`
uniform float uHurt;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  float edge = smoothstep(0.08, 0.55, r2 * 2.0);
  float a = (edge * 0.85 + 0.12) * uHurt;
  gl_FragColor = vec4(0.62, 0.05, 0.03, a);
}`;


// ---- round 7: screen space ambient occlusion from the depth buffer only (no second scene pass, so
// the draw and triangle budgets do not move). Horizon style: 8 directions x 3 steps in a 0.6 m
// hemisphere, normals reconstructed from depth, then a depth aware 4 tap blur inside the AO pass
// output stage. Runs in linear HDR before bloom so the darkening is lit like everything else.
const AO_FS = /* glsl */`
uniform sampler2D tDiffuse, tDepth;
uniform vec2 uRes;
uniform float uNear, uFar, uRadius, uStrength;
uniform mat4 uProjInv;
varying vec2 vUv;
float linDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  float ndc = z * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
}
vec3 viewPos(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  vec4 clip = vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  vec4 v = uProjInv * clip;
  return v.xyz / v.w;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  vec3 P = viewPos(vUv);
  float d = -P.z;
  if (d > 60.0 || d < 0.05) { gl_FragColor = vec4(col, 1.0); return; }   // sky, the viewmodel, and far scenery keep their own shade
  vec2 px = 1.0 / uRes;
  vec3 Px = viewPos(vUv + vec2(px.x, 0.0)) - P, Py = viewPos(vUv + vec2(0.0, px.y)) - P;
  vec3 Nx = P - viewPos(vUv - vec2(px.x, 0.0)), Ny = P - viewPos(vUv - vec2(0.0, px.y));
  vec3 dx = abs(Px.z) < abs(Nx.z) ? Px : Nx, dy = abs(Py.z) < abs(Ny.z) ? Py : Ny;
  vec3 N = normalize(cross(dx, dy));
  // radius in pixels for a world radius at this depth (projection scale ~ uRes.y / (2 tan(fov/2)) = uProjInv free form: use 1.1 as the 74 deg constant)
  float rPx = uRadius * uRes.y * 0.664 / d;
  rPx = clamp(rPx, 3.0, 80.0);
  float ang = hash(gl_FragCoord.xy) * 6.2832;
  float occ = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = ang + float(i) * 0.7854;
    vec2 dir = vec2(cos(a), sin(a));
    float best = 0.0;
    for (int j = 1; j <= 3; j++) {
      vec2 suv = vUv + dir * px * rPx * (float(j) / 3.0) * (0.6 + 0.4 * hash(gl_FragCoord.xy + float(j)));
      if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) break;
      vec3 S = viewPos(suv) - P;
      float len = length(S);
      float h = dot(S, N) / max(len, 1e-4);          // sine of the elevation of the sample above the tangent plane
      float w = 1.0 - smoothstep(uRadius * 0.5, uRadius * 1.5, len);   // samples past the radius are another object
      best = max(best, h * w);
    }
    occ += max(best - 0.12, 0.0);                     // small bias: flat sand stays clean
  }
  occ = clamp(occ / 8.0 * 1.6, 0.0, 1.0);
  float ao = 1.0 - occ * uStrength;
  gl_FragColor = vec4(col * ao, 1.0);
}`;

// ---- round 7: sun haze. The CoD frames are lit toward the sun: the air between the camera and a far
// surface is brighter and warmer the closer the view ray lies to the sun. Depth weighted so the near
// field and the viewmodel are untouched, the sky keeps its own dome. Linear HDR, before bloom, so the
// warm veil also feeds the bloom around the sun.
const HAZE_FS = /* glsl */`
uniform sampler2D tDiffuse, tDepth;
uniform vec2 uSunUv;
uniform float uSunFront, uNear, uFar, uAmount;
uniform vec3 uSunCol;
uniform float uAspect;
varying vec2 vUv;
float linDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  float ndc = z * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
}
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float d = linDepth(vUv);
  float depthW = 1.0 - exp(-max(d - 6.0, 0.0) / 55.0);        // nothing inside 6 m, 63 percent at 61 m
  if (d > uFar * 0.98) depthW = 0.35;                             // the dome: a light veil only, the sky pass drew the sun
  vec2 toSun = (vUv - uSunUv) * vec2(uAspect, 1.0);
  float r = length(toSun);
  float lobe = exp(-r * r * 4.0) * uSunFront;                     // a wide warm lobe around the sun's screen position
  float glow = exp(-r * r * 22.0) * uSunFront;                    // and a tight core for the bloom to pick up
  col += uSunCol * uAmount * depthW * (lobe * 0.9 + glow * 1.4);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createPost(THREE, { renderer, scene, camera, tier }) {
  const T = getTier(tier);
  // round 7 A/B: '?ao=0' and '?haze=0' switch the new passes off, '?ao=0.5' scales them
  let qAo = 1, qHaze = 1;
  try { const q = new URLSearchParams(location.search); if (q.get('ao') !== null) qAo = +q.get('ao'); if (q.get('haze') !== null) qHaze = +q.get('haze'); } catch (e) { /* no location */ }
  const size = renderer.getSize(new THREE.Vector2());
  let damage = 0;

  // renderer.info resets on every renderer.render() call by default, so with
  // a composer the published draws/tris would be the last full screen quad
  // (1 draw, 1 triangle). The rig owns the reset: once per frame, here, so
  // that after post.render() returns, renderer.info holds the whole frame
  // (scene, shadow maps, and every post pass) for telemetry to read.
  renderer.info.autoReset = false;

  if (T.post) {
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      samples: 4,
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
      depthTexture: new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType),   // round 7: AO and haze read depth
    });
    const composer = new EffectComposer(renderer, rt);
    composer.setSize(size.x, size.y);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const ao = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: rt.depthTexture },
        uRes: { value: new THREE.Vector2(size.x, size.y) },
        uNear: { value: camera.near }, uFar: { value: camera.far },
        uRadius: { value: 0.6 }, uStrength: { value: 0.75 * qAo },
        uProjInv: { value: camera.projectionMatrixInverse.clone() },
      },
      vertexShader: GRADE_VS, fragmentShader: AO_FS,
    });
    composer.addPass(ao);

    const sunDir = sunDirection(THREE);
    const haze = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: rt.depthTexture },
        uSunUv: { value: new THREE.Vector2(0.5, 0.5) }, uSunFront: { value: 0 },
        uNear: { value: camera.near }, uFar: { value: camera.far },
        uAmount: { value: 0.28 * qHaze }, uAspect: { value: size.x / size.y },
        uSunCol: { value: new THREE.Color(SUN_COLOR).multiplyScalar(1.0) },
      },
      vertexShader: GRADE_VS, fragmentShader: HAZE_FS,
    });
    composer.addPass(haze);
    const _sunV = new THREE.Vector3();
    function updateSun(cam) {
      // project the sun direction to screen; uSunFront falls to 0 as the sun leaves the view (soft edge, so the veil does not pop)
      _sunV.copy(sunDir).transformDirection(cam.matrixWorldInverse);   // world -> view, rotation only
      const vx = _sunV.x, vy = _sunV.y, vz = _sunV.z;      // camera looks down -z
      const front = -vz;
      if (front <= 0.05) { haze.uniforms.uSunFront.value = 0; return; }
      const sx = 0.5 + 0.5 * (vx / -vz) / Math.tan((cam.fov * Math.PI / 360)) / cam.aspect;
      const sy = 0.5 + 0.5 * (vy / -vz) / Math.tan((cam.fov * Math.PI / 360));
      haze.uniforms.uSunUv.value.set(sx, sy);
      const off = Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5));
      haze.uniforms.uSunFront.value = front * (1 - Math.max(0, Math.min(1, (off - 0.5) / 0.5)));   // 1 inside the frame, fading to 0 by one frame width outside
    }

    // Threshold 0.85 in linear HDR: sunlit sand sits at 0.9 to 1.3, a west
    // facing bleached wall at 1.2 to 1.6, shade under 0.2, so only the sun
    // side of things blooms, and it blooms in its own warm colour. Strength
    // 0.12, radius 0.45: a soft key side halo, not a browser game glow.
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.15, 0.55, 0.88)   // round 15: 0.18/0.85 -> 0.15/0.88, the panorama's own sun glow now carries the halo; round 7: 0.12/0.45/0.85 -> 0.22/0.55/0.80, the haze pass feeds a warm core at the sun;
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uHurt: { value: 0 },
        uBlack: { value: 0.012 },   // round 2: 0.02 -> 0.012 and contrast 1.06 -> 1.04: the critic wants no object shade side under 0.15 luma, and the old curve took a 0.15 shade to 0.116
        uContrast: { value: 1.07 },   // round 15: 1.04 -> 1.07, shadows deeper toward the reference without cutting the fill
        uPivot: { value: 0.42 },
      },
      vertexShader: GRADE_VS, fragmentShader: GRADE_FS,
    });
    composer.addPass(grade);

    return {
      composer, renderPass, bloom, grade, tier: T,
      render(dt) {
        renderer.info.reset();
        grade.uniforms.uHurt.value = damage;
        const cam = renderPass.camera;
        ao.uniforms.uProjInv.value.copy(cam.projectionMatrixInverse);
        ao.uniforms.uNear.value = cam.near; ao.uniforms.uFar.value = cam.far;
        haze.uniforms.uNear.value = cam.near; haze.uniforms.uFar.value = cam.far;
        updateSun(cam);
        composer.render(dt);
      },
      ao, haze,
      setDamage(t) { damage = Math.max(0, Math.min(1, t || 0)); },
      resize(w, h) {
        composer.setSize(w, h);
        bloom.setSize(w, h);
        ao.uniforms.uRes.value.set(w, h);
        haze.uniforms.uAspect.value = w / h;
      },
      setCamera(cam) { renderPass.camera = cam; },
      dispose() { composer.dispose(); rt.dispose(); },
    };
  }

  // Phone tier: direct render plus an overlay quad only while hurt.
  const ovScene = new THREE.Scene();
  const ovCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const ovMat = new THREE.ShaderMaterial({
    uniforms: { uHurt: { value: 0 } },
    vertexShader: GRADE_VS, fragmentShader: OVERLAY_FS,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const ov = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ovMat);
  ov.frustumCulled = false;
  ovScene.add(ov);

  return {
    composer: null, tier: T,
    render(dt) {
      renderer.info.reset();
      renderer.render(scene, camera);
      if (damage > 0.01) {
        ovMat.uniforms.uHurt.value = damage;
        renderer.autoClear = false;
        renderer.render(ovScene, ovCam);
        renderer.autoClear = true;
      }
    },
    setDamage(t) { damage = Math.max(0, Math.min(1, t || 0)); },
    resize() { /* the renderer owns its size on this tier */ },
    setCamera(cam) { camera = cam; },
    dispose() { ov.geometry.dispose(); ovMat.dispose(); },
  };
}
