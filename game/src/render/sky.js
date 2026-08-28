/**
 * Sky dome (owner: render).
 *
 * A gradient dome computed in the shader from the view direction: no texture,
 * no image. Zenith 0x7f9cc0, horizon 0xe8d6b0 warm haze, a haze band that gets
 * paler toward the horizon, and a sun glow around the sun direction from
 * lighting.js. Below the horizon the dome is the fog colour, so the far edge
 * of the terrain fades into exactly the colour that stands behind it.
 *
 * The vertex shader pins the dome to the far plane (gl_Position.z = w), so it
 * draws behind everything whatever the camera's far value is, and the dome
 * follows the camera in update(). One draw call. On the high tier a second
 * draw adds dust motes: a few hundred points drifting in a box around the
 * camera, soft discs from gl_PointCoord, wrapped so they never run out.
 *
 * Colours are mixed in linear space and then pushed through the renderer's
 * tone mapping and output colour space (the same ACES curve as the scene), so
 * the sky and the fogged terrain agree at the horizon.
 */
import { sunDirection, FOG_COLOR, SUN_COLOR } from './lighting.js';
import { getTier } from './quality.js';

export const ZENITH_COLOR = 0x7f9cc0;
export const HORIZON_COLOR = 0xe8d6b0;
export const HAZE_COLOR = 0xf1e6cf;
export const MID_COLOR = 0xd3d3cb;      // pale warm grey, the sky 20 to 40 degrees up in the reference frames (measured 222,216,197 sRGB)

const SKY_VS = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // far plane, always behind the scene
  p.z = p.w * 0.999999;
  gl_Position = p;
}`;

const SKY_FS = /* glsl */`
uniform vec3 uZenith, uMid, uHorizon, uHaze, uFog, uSun;
uniform vec3 uSunDir;
uniform float uSunGlow, uSunDisc, uBright;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;                                   // 1 up, 0 horizon, -1 down
  float el = asin(clamp(y, -1.0, 1.0));           // elevation in radians
  // Measured on refs/aaa: at level pitch the frame top reaches 37 degrees
  // and the sky there is pale warm grey (about 222,216,197 sRGB), never
  // saturated blue. So the contract zenith colour is reached only high up:
  // horizon -> mid (pale grey blue) by 40 degrees, mid -> zenith by 90.
  float t1 = smoothstep(0.0, 0.70, el);            // 0 at horizon, 1 at 40 deg
  float t2 = smoothstep(0.70, 1.55, el);           // 40 deg -> zenith
  vec3 col = mix(uHorizon, uMid, t1);
  col = mix(col, uZenith, t2);
  // haze band: paler and warmer in the lowest 8 degrees, dust in the air.
  // CLAIMS claim 6 wants the horizon paler than the sky above it.
  float band = pow(1.0 - clamp(el / 0.14, 0.0, 1.0), 1.6);
  col = mix(col, uHaze, band * 0.85);
  col *= uBright;
  // sun: a wide warm glow, a tighter core and a small disc
  float sd = max(dot(d, uSunDir), 0.0);
  float glowWide = pow(sd, 5.0) * 0.30;
  float glowCore = pow(sd, 40.0) * 0.55;
  float disc = smoothstep(0.99925, 0.99965, sd);
  col += uSun * (glowWide + glowCore) * uSunGlow;
  col = mix(col, uSun * uSunDisc, disc);
  // below the horizon: the fog colour exactly, so the fogged terrain edge
  // meets a dome of the same colour; the haze band sits just above it.
  float below = smoothstep(0.006, -0.01, y);
  col = mix(col, uFog, below);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const MOTE_VS = /* glsl */`
uniform vec3 uCam;
uniform float uTime, uBox, uSize;
attribute float aSeed;
varying float vA;
void main() {
  // drift in world space, then wrap into a box centred on the camera
  vec3 p = position;
  p.x += uTime * (0.35 + aSeed * 0.4) + sin(uTime * 0.7 + aSeed * 31.0) * 0.6;
  p.y += sin(uTime * 0.5 + aSeed * 17.0) * 0.4 - uTime * 0.05;
  p.z += cos(uTime * 0.6 + aSeed * 13.0) * 0.5;
  p = uCam + mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  // fade near the box edge and very near the camera
  float edge = 1.0 - smoothstep(uBox * 0.36, uBox * 0.5, length(p - uCam));
  float nearFade = smoothstep(0.3, 1.2, dist);
  vA = edge * nearFade * (0.5 + 0.5 * aSeed);
  gl_PointSize = uSize * (0.6 + aSeed * 0.8) * 30.0 / max(dist, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const MOTE_FS = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = (1.0 - smoothstep(0.35, 1.0, r)) * vA * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSky(THREE, { scene, tier }) {
  const T = getTier(tier);
  const sunDir = sunDirection(THREE);

  const geo = new THREE.SphereGeometry(80, 40, 24);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(ZENITH_COLOR) },
      uMid: { value: new THREE.Color(MID_COLOR) },
      uHorizon: { value: new THREE.Color(HORIZON_COLOR) },
      uHaze: { value: new THREE.Color(HAZE_COLOR) },
      uFog: { value: new THREE.Color(FOG_COLOR) },
      uSun: { value: new THREE.Color(SUN_COLOR) },
      uSunDir: { value: sunDir },
      uSunGlow: { value: 1.0 },
      uSunDisc: { value: 4.0 },
      uBright: { value: 1.75 },   // the dome is HDR: the reference sky sits near 230 sRGB after the ACES curve
    },
    vertexShader: SKY_VS,
    fragmentShader: SKY_FS,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    fog: false,
    toneMapped: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = true;
  scene.add(mesh);

  // Dust motes, high tier only. One draw call.
  let motes = null;
  if (T.name === 'high') {
    const N = 420, BOX = 26;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    let s = 7;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd() - 0.5) * BOX; pos[i * 3 + 1] = (rnd() - 0.5) * BOX; pos[i * 3 + 2] = (rnd() - 0.5) * BOX;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uBox: { value: BOX }, uSize: { value: 0.09 },
        uColor: { value: new THREE.Color(0xf3e4c4) }, uOpacity: { value: 0.22 },
      },
      vertexShader: MOTE_VS, fragmentShader: MOTE_FS,
      transparent: true, depthWrite: false, depthTest: true, fog: false, toneMapped: true,
    });
    motes = new THREE.Points(g, m);
    motes.name = 'dust';
    motes.frustumCulled = false;
    motes.renderOrder = 500;
    scene.add(motes);
  }

  let time = 0;
  function update(camera, dt = 0.016) {
    time += dt;
    if (camera) {
      camera.getWorldPosition(mesh.position);
      if (motes) motes.material.uniforms.uCam.value.copy(mesh.position);
    }
    if (motes) motes.material.uniforms.uTime.value = time;
  }

  function dispose() {
    scene.remove(mesh); geo.dispose(); mat.dispose();
    if (motes) { scene.remove(motes); motes.geometry.dispose(); motes.material.dispose(); }
  }

  return { mesh, motes, sunDir, update, dispose };
}
