/**
 * Map edge skirt (owner: world). Round 17 item 5 (terrain inspection): beyond the 140 x 110 m terrain the sky
 * panorama's flat cream ground showed as a bright lake between the map edge and the hill ring. This is a ring
 * of ground from the terrain bounds out to `far` metres: its inner edge samples the terrain height along the
 * boundary (so there is no step), its outer edge settles to low rolling dunes from a hash, in the sand set
 * (materials.js maps the 'ground' recipe to sand_sunlit, world projection), hazed by the same aerial
 * perspective as everything else. One mesh, one draw, no shadows, no collider (BOUNDARY keeps the player in).
 */
import * as THREE from 'three';

export function createSkirt(terrain, { far = 400, rings = 6, around = 96 } = {}) {
  const B = terrain.bounds;
  const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
  const hw = (B.maxX - B.minX) / 2, hd = (B.maxZ - B.minZ) / 2;
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const pos = [], idx = [];
  // a point on the boundary rectangle at angle th, then pushed out by t in [0, 1] toward `far`
  const edge = (th) => {
    const dx = Math.cos(th), dz = Math.sin(th);
    const k = Math.min(hw / Math.abs(dx || 1e-6), hd / Math.abs(dz || 1e-6));   // rectangle radius at th
    return [cx + dx * k, cz + dz * k, dx, dz];
  };
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, ease = t * t;
    for (let i = 0; i <= around; i++) {
      const th = (i / around) * Math.PI * 2;
      const [ex, ez, dx, dz] = edge(th);
      const x = ex + dx * ease * far, z = ez + dz * ease * far;
      const h0 = terrain.heightAt(Math.max(B.minX + 0.5, Math.min(B.maxX - 0.5, ex)), Math.max(B.minZ + 0.5, Math.min(B.maxZ - 0.5, ez)));
      // dunes grow with distance, low near the edge so the join stays clean
      const dune = (hash(i * 0.37, r * 1.3) - 0.5) * 6 * t + Math.sin(th * 3.1 + r) * 1.5 * t;
      const y = h0 * (1 - t) + dune;
      pos.push(x, y - 0.06, z);   // 6 cm down at the join so the terrain edge wins the depth test
    }
  }
  for (let r = 0; r < rings; r++) for (let i = 0; i < around; i++) {
    const a = r * (around + 1) + i, b = a + around + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);   // counter clockwise seen from above (the first winding faced down and the ring was culled: a white band of sky showed through)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0xcdb88e, roughness: 0.95, metalness: 0 });
  m.name = 'ground';   // recipe: materials.js puts the sand set on it
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'map_skirt';
  mesh.receiveShadow = false; mesh.castShadow = false; mesh.frustumCulled = false;
  return mesh;
}
