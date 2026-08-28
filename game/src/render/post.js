/**
 * Post processing (owner: render).
 *
 * High tier: EffectComposer with a multisampled HDR target (antialias on the
 * WebGLRenderer is discarded the moment a composer renders into its own
 * target, and thin lattice without MSAA is the loudest browser-game tell
 * there is), a RenderPass, a very small bloom for the floodlight lenses and
 * the sun disc only (strength 0.08, threshold well above the sunlit sand),
 * the OutputPass (ACES and sRGB, the same as the renderer would do), and one
 * grade pass: vignette 0.25, a slight cool lift in the shadows and warm gain
 * in the highlights, and the damage edge. No grain, no chromatic aberration,
 * no global desaturation: CLAIMS.md names each of those as a way to game a
 * metric, and a critic who sees them is right to reject the frame.
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

// Runs in display space, after OutputPass.
const GRADE_FS = /* glsl */`
uniform sampler2D tDiffuse;
uniform float uVignette, uHurt;
uniform vec3 uLift, uGain;
varying vec2 vUv;
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // shadows lifted a touch toward the sky colour, highlights a touch warm:
  // a split tone of about two percent, kept far below what the lights do
  col = col * uGain + uLift * (1.0 - smoothstep(0.0, 0.5, l));
  // vignette, corners only: r2 * 2 is 1.0 in the corners and 0.5 at the top
  // centre, so the top centre loses about one percent and a corner 25 percent
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  float v = 1.0 - smoothstep(0.35, 1.0, r2 * 2.0);
  col *= mix(1.0, v, uVignette);
  // damage: a red edge that closes in as t -> 1
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

    // Threshold 1.15 in linear HDR: sunlit sand sits near 0.9, floodlight
    // lenses and the sun disc sit above 2. Strength 0.08 is under the 0.1 cap.
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.08, 0.35, 1.15);
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uVignette: { value: 0.25 },
        uHurt: { value: 0 },
        uLift: { value: new THREE.Vector3(0.006, 0.010, 0.020) },
        uGain: { value: new THREE.Vector3(1.012, 1.000, 0.985) },
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
