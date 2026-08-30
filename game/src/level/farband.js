/**
 * The far band (owner: level). Round 24, Ben's list item 2: beyond the fence there was nothing but sand to the
 * hills, so every frame ended in emptiness at about 80 m. This is a ring of low detail oilfield landmarks between
 * 150 and 400 m: two more derricks, a line of pump jacks, power poles marching away, a flare stack, tank clusters,
 * a couple of sheds and a wrecked truck. They sit on the map skirt, carry no colliders, cast no shadows and are
 * built as ONE merged mesh per material, so the whole band is two draw calls and about 6k triangles.
 */
import * as THREE from 'three';

const T = Math.PI * 2;

function boxAt(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  list.push(g);
}
function cylAt(list, r, h, x, y, z, seg = 6) {
  const g = new THREE.CylinderGeometry(r, r * 1.15, h, seg);
  g.translate(x, y + h / 2, z);
  list.push(g);
}

/** a lattice tower: four legs and three girt rings, drawn as thin boxes */
function derrick(list, x, y, z, H = 26, W = 7) {
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of legs) {
    const g = new THREE.BoxGeometry(0.35, H, 0.35);
    g.translate(x + sx * W * 0.36, y + H / 2, z + sz * W * 0.36);
    // lean the legs in by shearing the top: cheap taper, four boxes only
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) - y) / H;
      pos.setX(i, pos.getX(i) - sx * W * 0.36 * 0.62 * t);
      pos.setZ(i, pos.getZ(i) - sz * W * 0.36 * 0.62 * t);
    }
    list.push(g);
  }
  for (let i = 1; i <= 4; i++) {
    const t = i / 5, w = W * (1 - 0.62 * t);
    boxAt(list, w, 0.3, 0.3, x, y + H * t, z - w / 2);
    boxAt(list, w, 0.3, 0.3, x, y + H * t, z + w / 2);
    boxAt(list, 0.3, 0.3, w, x - w / 2, y + H * t, z);
    boxAt(list, 0.3, 0.3, w, x + w / 2, y + H * t, z);
  }
  boxAt(list, 2.2, 1.4, 1.6, x, y + H, z);
}

function pumpJack(list, x, y, z, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const [ax, az] = at(0, 0); boxAt(list, 1.2, 4.2, 1.2, ax, y, az, ry);          // the A frame post
  const [bx, bz] = at(-1.2, 0); boxAt(list, 6.5, 0.8, 0.7, bx, y + 4.4, bz, ry); // the walking beam
  const [hx, hz] = at(3.4, 0); boxAt(list, 1.0, 1.6, 1.0, hx, y + 1.2, hz, ry);  // counterweight end
  const [px, pz] = at(-3.6, 0); boxAt(list, 0.7, 2.6, 0.7, px, y, pz, ry);       // the well head
}

function poleLine(list, x0, z0, x1, z1, n = 9) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    boxAt(list, 0.5, 13, 0.5, x, 0, z);
    boxAt(list, 3.4, 0.35, 0.35, x, 11.8, z);
    boxAt(list, 2.4, 0.3, 0.3, x, 10.6, z);
  }
}

export function createFarBand(terrain, { seed = 7 } = {}) {
  const B = terrain.bounds;
  const groundAt = (x, z) => terrain.heightAt(Math.max(B.minX + 1, Math.min(B.maxX - 1, x)), Math.max(B.minZ + 1, Math.min(B.maxZ - 1, z))) - 0.3;
  const parts = [];
  const P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];   // a point on a ring, x and z

  // two more derricks, one behind the north west ridge line, one out east
  let [x, z] = P(2.4, 150); derrick(parts, x, groundAt(x, z), z, 34, 9);
  [x, z] = P(-0.55, 190); derrick(parts, x, groundAt(x, z), z, 30, 8);
  [x, z] = P(1.15, 240); derrick(parts, x, groundAt(x, z), z, 38, 10);

  // a line of pump jacks working the same lease, and a second pair further out
  for (let i = 0; i < 4; i++) { const a = 3.5 + i * 0.16; [x, z] = P(a, 135 + i * 10); pumpJack(parts, x, groundAt(x, z), z, a + 1.2); }
  for (let i = 0; i < 2; i++) { const a = 0.35 + i * 0.22; [x, z] = P(a, 175 + i * 15); pumpJack(parts, x, groundAt(x, z), z, a); }

  // power poles marching away from the compound to the south east, and a second run north
  { const [ax, az] = P(0.9, 120), [bx, bz] = P(0.62, 300); poleLine(parts, ax, az, bx, bz, 10); }
  { const [ax, az] = P(4.0, 125), [bx, bz] = P(4.35, 280); poleLine(parts, ax, az, bx, bz, 9); }

  // a flare stack with its tip, tank clusters, sheds and a wrecked truck on the ridge
  [x, z] = P(2.9, 175); { const y = groundAt(x, z); cylAt(parts, 1.1, 42, x, y, z, 8); boxAt(parts, 2.6, 2.6, 2.6, x, y + 42, z); }
  for (const [a, r] of [[1.8, 145], [1.95, 152], [2.1, 143]]) { [x, z] = P(a, r); cylAt(parts, 6.5, 9, x, groundAt(x, z), z, 12); }
  for (const [a, r] of [[5.1, 150], [5.25, 158]]) { [x, z] = P(a, r); cylAt(parts, 5.5, 8, x, groundAt(x, z), z, 12); }
  for (const [a, r] of [[0.2, 130], [3.1, 138], [4.6, 145], [5.6, 165]]) { [x, z] = P(a, r); const y = groundAt(x, z); boxAt(parts, 18, 7, 10, x, y, z, a); boxAt(parts, 19, 0.6, 11, x, y + 7, z, a); }
  [x, z] = P(2.2, 200); { const y = groundAt(x, z); boxAt(parts, 8, 3, 2.6, x, y, z, 0.6); boxAt(parts, 3, 2.4, 2.4, x + 3, y + 3, z, 0.6); }

  const merged = new THREE.BufferGeometry();
  const pos = [], idx = []; let base = 0;
  for (const g of parts) {
    const gp = g.attributes.position, gi = g.index;
    for (let i = 0; i < gp.count; i++) pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
    for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
    base += gp.count; g.dispose();
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setIndex(idx);
  merged.computeVertexNormals();
  // darker than the sand so the silhouettes hold against a pale sky through 30 to 50 percent haze
const mat = new THREE.MeshStandardMaterial({ color: 0x5a4e42, roughness: 0.95, metalness: 0.1 });
  mat.name = 'metal';
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'far_band';
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
  mesh.userData.tris = idx.length / 3;
  return mesh;
}
