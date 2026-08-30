/**
 * Sky dome, hills and dust (owner: render).
 *
 * The dome draws the atmosphere model from lighting.js (ATMOS_GLSL), the same
 * function that colours the aerial perspective in every material and the
 * environment map, so the sky, the hazed ground and the fill light are one
 * atmosphere: pale warm horizon rising through a pale neutral band to a grey
 * blue at the top of a level frame and a deeper blue overhead, a warm glow
 * and a small disc where the sun is (azimuth 250, elevation 22), thin high
 * cloud streaks between 8 and 40 degrees, and a haze band along the horizon.
 * No texture, no image.
 *
 * The vertex shader pins the dome to the far plane so it draws behind
 * everything whatever the camera's far value is; the dome follows the camera.
 *
 * The hills: a world fixed ring of two ridge lines at 700 and 1100 m, drawn as
 * silhouettes coloured by the same atmosphere at their own haze level (0.42 near,
 * 0.64 far, so the far ridge is the paler layer behind the near one), so the
 * map edge has something behind it at every heading and the horizon is not a
 * straight line. Two draw calls (dome, hills), plus the dust motes on high.
 *
 * Colours are mixed in linear space and pushed through the renderer's ACES
 * curve and output colour space in the fragment shader.
 */
import { sunDirection, SUN_COLOR, ATMOS_UNIFORMS_GLSL, ATMOS_GLSL, atmosUniforms } from './lighting.js?v=r24-202608300029';
import { getTier } from './quality.js?v=r24-202608300029';

export const ZENITH_COLOR = 0x6987b9;    // documentary: the linear values live in lighting.js ATMOS
export const HORIZON_COLOR = 0xeee0c8;

const SKY_VS = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  p.z = p.w * 0.999999;   // far plane, always behind the scene
  gl_Position = p;
}`;

const SKY_FS = ATMOS_UNIFORMS_GLSL + ATMOS_GLSL + /* glsl */`
uniform vec3 uSun;
uniform float uSunDisc;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = atmosSky(d, 1.0);
  float sd = max(dot(d, uAtmSunDir), 0.0);
  float disc = smoothstep(0.99925, 0.99965, sd);
  col = mix(col, uSun * uSunDisc, disc);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Hills: world space ring. aHaze per vertex is the haze fraction of that ridge.
const HILL_VS = /* glsl */`
attribute float aHaze;
attribute float aTone;
varying vec3 vDir;
varying float vHaze;
varying float vTone;
varying float vY;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  vHaze = aHaze;
  vTone = aTone;
  vY = position.y;
  vec4 p = projectionMatrix * viewMatrix * wp;
  p.z = p.w * 0.999998;
  gl_Position = p;
}`;
const HILL_FS = ATMOS_UNIFORMS_GLSL + ATMOS_GLSL + /* glsl */`
uniform vec3 uHillLit, uHillShade;
varying vec3 vDir;
varying float vHaze;
varying float vTone;
varying float vY;
void main() {
  vec3 d = normalize(vDir);
  // a ridge lit from the west: the face toward the sun a touch warmer
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uAtmSunDir.x, 0.0, uAtmSunDir.z))), 0.0);
  vec3 rock = mix(uHillShade, uHillLit, 1.0 - az * 0.6) * vTone;
  // round 22k: the silhouette's own slope lights the western flanks and shades the eastern ones
  rock *= 1.0 + 0.16 * clamp(d.y * 6.0, -1.0, 1.0) * (1.0 - vHaze);
  // the sky colour just above the horizon is what the haze mixes toward
  vec3 sky = atmosSky(normalize(vec3(d.x, max(d.y, 0.012) + 0.07, d.z)), 0.0);   // round 16b: the sky 4 degrees up, so a hazed ridge is darker than the dust band it stands in
  vec3 col = mix(rock, sky, vHaze);
  // a soft dissolve at the foot of every band: no ridge meets the ground plane as a hard line
  // round 22n (Ben: "revert back to the mountain silhouettes but make them blend into the sand"): the bottom of
  // each ridge dissolves into the haze over the last 5 degrees, and the last degree goes all the way, so the
  // silhouette has no cut line where it meets the desert floor
  col = mix(col, sky, smoothstep(0.09, 0.0, d.y) * 0.85);
  col = mix(col, sky, smoothstep(0.018, -0.002, d.y));
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
  vec3 p = position;
  p.x += uTime * (0.35 + aSeed * 0.4) + sin(uTime * 0.7 + aSeed * 31.0) * 0.6;
  p.y += sin(uTime * 0.5 + aSeed * 17.0) * 0.4 - uTime * 0.05;
  p.z += cos(uTime * 0.6 + aSeed * 13.0) * 0.5;
  p = uCam + mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
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

/**
 * Ridge line height in metres at a heading (radians), layered sines with a fixed seed.
 * Round 2: 1.6x taller (the near ring peaks at 9 degrees above the horizon from eye height,
 * the far ring at 12, so the far layer shows above the near one) and a sharper profile
 * (the high frequency terms carry more) so the ridge reads as rock, not as a swell.
 */
function ridge(theta, layer) {
  const s = layer === 0
    ? 30 + 24 * Math.sin(theta * 3.0 + 0.4) + 16 * Math.sin(theta * 7.0 + 2.1) + 10 * Math.sin(theta * 13.0 + 1.3) + 5 * Math.sin(theta * 29.0) + 3 * Math.sin(theta * 53.0 + 0.9)
    : 46 + 34 * Math.sin(theta * 2.0 + 1.9) + 20 * Math.sin(theta * 5.0 + 0.7) + 12 * Math.sin(theta * 11.0 + 3.0) + 6 * Math.sin(theta * 23.0 + 0.5) + 3 * Math.sin(theta * 47.0 + 2.2);
  return Math.max(s * 1.6, 6);
}

function buildHills(THREE, atm) {
  // round 2 (critic item 7): the rings were hazed 0.62 and 0.80 into the sky and read as
  // nothing at the horizon; now 0.42 and 0.64, the near ridge a warm grey brown silhouette,
  // the far one paler behind it, both taking the dust band colour of the sky they stand in.
  // nearer bands darker and sharper, far ones paler and softer, each mixing toward the sky at its own depth
  const rings = [
    { r: 700, haze: 0.42, layer: 0, tone: 1.0 },   // round 16b (Ben: "the mountains on the horizon seem very white"): 0.42 -> 0.30
    { r: 1100, haze: 0.60, layer: 1, tone: 0.94 },  // 0.64 -> 0.48, and the haze now mixes toward the sky a few degrees UP, not the bright dust band
  ];
  const N = 480;
  const pos = [], haze = [], tone = [], idx = [];
  let base = 0;
  for (const ring of rings) {
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const x = Math.sin(th) * ring.r, z = Math.cos(th) * ring.r;
      const h = ridge(th, ring.layer) * (ring.r / 700);
      pos.push(x, -60, z, x, h, z);
      haze.push(ring.haze, ring.haze);
      tone.push(ring.tone, ring.tone);
      if (i < N) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    base += (N + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aHaze', new THREE.Float32BufferAttribute(haze, 1));
  g.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 1));
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    uniforms: { ...atm, uHillLit: { value: new THREE.Color(0.30, 0.235, 0.175) }, uHillShade: { value: new THREE.Color(0.13, 0.125, 0.135) } },
    vertexShader: HILL_VS, fragmentShader: HILL_FS,
    side: THREE.DoubleSide, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth, fog: false, toneMapped: true,   // depthTest false drew a screen filling black polygon (probe t_*), so the ring is depth tested at a pinned depth just inside the dome's
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'hills';
  mesh.frustumCulled = false;
  mesh.renderOrder = -999;      // right after the dome; pinned at 0.999998 so it passes over the dome and everything real draws over it
  mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}

export function createSky(THREE, { scene, tier }) {
  const T = getTier(tier);
  const sunDir = sunDirection(THREE);
  const atm = atmosUniforms(THREE);

  const geo = new THREE.SphereGeometry(80, 40, 24);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...atm, uSun: { value: new THREE.Color(SUN_COLOR) }, uSunDisc: { value: 4.0 } },
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

  const hills = buildHills(THREE, atm);
  scene.add(hills);

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
    scene.remove(hills); hills.geometry.dispose(); hills.material.dispose();
    if (motes) { scene.remove(motes); motes.geometry.dispose(); motes.material.dispose(); }
  }

  return { mesh, hills, motes, sunDir, update, dispose };
}
