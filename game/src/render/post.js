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
import { getTier } from './quality.js';

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

export function createPost(THREE, { renderer, scene, camera, tier }) {
  const T = getTier(tier);
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
    });
    const composer = new EffectComposer(renderer, rt);
    composer.setSize(size.x, size.y);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Threshold 0.85 in linear HDR: sunlit sand sits at 0.9 to 1.3, a west
    // facing bleached wall at 1.2 to 1.6, shade under 0.2, so only the sun
    // side of things blooms, and it blooms in its own warm colour. Strength
    // 0.12, radius 0.45: a soft key side halo, not a browser game glow.
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.45, 0.85);
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uHurt: { value: 0 },
        uBlack: { value: 0.02 },
        uContrast: { value: 1.06 },
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
        composer.render(dt);
      },
      setDamage(t) { damage = Math.max(0, Math.min(1, t || 0)); },
      resize(w, h) {
        composer.setSize(w, h);
        bloom.setSize(w, h);
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
