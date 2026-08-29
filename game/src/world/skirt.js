/**
 * Map edge skirt (owner: world). Round 17 item 5 (terrain inspection): beyond the 140 x 110 m terrain the sky
 * panorama's flat cream ground showed as a bright lake between the map edge and the hill ring. This is a ring
 * of ground from the terrain bounds out to `far` metres: its inner edge samples the terrain height along the
 * boundary (so there is no step), its outer edge settles to low rolling dunes from a hash, in the sand set
 * (materials.js maps the 'ground' recipe to sand_sunlit, world projection), hazed by the same aerial
 * perspective as everything else. One mesh, one draw, no shadows, no collider (BOUNDARY keeps the player in).
 */
import * as THREE from 'three';

export function createSkirt(terrain, { far = 400, rings = 6, around = 200 } = {}) {
  const B = terrain.bounds;
  const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
  const hw = (B.maxX - B.minX) / 2, hd = (B.maxZ - B.minZ) / 2;
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const pos = [], idx = [];
  // the boundary rectangle walked by ARC LENGTH with the four corners as vertices (round 18c: walking it by angle
  // put a segment across each corner, and that triangle folded into a grey flat sheet at the map corner, Ben's
  // photo); the push out direction is the outward normal of the side, blended at the corners
  const per = 2 * (2 * hw + 2 * hd);
  const edge = (u) => {   // u in [0, 1) along the perimeter, clockwise from the west south corner
    let d = u * per;
    const sides = [[-hw, -hd, 1, 0, 2 * hw, 0, -1], [hw, -hd, 0, 1, 2 * hd, 1, 0], [hw, hd, -1, 0, 2 * hw, 0, 1], [-hw, hd, 0, -1, 2 * hd, -1, 0]];
    for (const [sx, sz, tx, tz, L, nx, nz] of sides) {
      if (d <= L + 1e-9) { const f = d / L; const px = sx + tx * d, pz = sz + tz * d;
        // outward direction: the side normal, bent toward the diagonal within 8 percent of a corner
        const kx = Math.sign(px || 1) * Math.max(0, Math.abs(px) / hw - 0.92) / 0.08, kz = Math.sign(pz || 1) * Math.max(0, Math.abs(pz) / hd - 0.92) / 0.08;
        let dx = nx + kx * 0.7, dz = nz + kz * 0.7; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
        return [cx + px, cz + pz, dx, dz]; }
      d -= L;
    }
    return [cx - hw, cz - hd, -0.7, -0.7];
  };
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, ease = t * t;
    for (let i = 0; i <= around; i++) {
      const [ex, ez, dx, dz] = edge((i % around) / around);
      const x = ex + dx * ease * far, z = ez + dz * ease * far;
      // round 22e (Ben's photo: "the seam where the map edge is doesn't match in some spots"): the height used to
      // decay toward zero with distance (y = h0 * (1 - t)), so where the boundary sits on a 2.2 m spawn plateau the
      // skirt fell away in the first ring and left a vertical wall of sand at the seam with the fence hanging over
      // it. The skirt now STARTS at the terrain height (sampled exactly on the boundary) and settles gently toward
      // a plain a third lower over the full 400 m, with the dunes growing on top of that.
      const h0 = terrain.heightAt(Math.max(B.minX, Math.min(B.maxX, ex)), Math.max(B.minZ, Math.min(B.maxZ, ez)));
      const dune = (hash(i * 0.37, r * 1.3) - 0.5) * 6 * ease + Math.sin(i * 0.19 + r) * 1.5 * ease;
      const y = h0 * (1 - 0.35 * ease) + dune;
      pos.push(x, y - 0.02, z);   // 2 cm down at the join so the terrain edge wins the depth test
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
