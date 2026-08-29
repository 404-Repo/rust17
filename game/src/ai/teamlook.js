/**
 * Team look for the coded soldiers (owner: ai). Round 10, Ben 2026-08-29 09:28: "lets use some abstracted
 * red/blue shapes for characters bc they look too bad" -> the figure keeps its body, rig and animation; only
 * the surface changes, after the concept in work/abstract/lineup.png:
 *   - skin and clothing: ONE matte team colour (militia brick red, rangers slate blue), desaturated so it
 *     takes the desert light and shadows like the props;
 *   - gear (dark fabric: chest rig, pouches, belt; timber; gloves, boots, eyes, mouth): dark neutral grey;
 *   - metal (rifle, steel) untouched;
 *   - a dark visor slab across the face and one thin emissive team stripe across the chest, both hung on
 *     the head / torso joints so they animate and collapse with the figure.
 * Two calls: applyTeamLook(model, team) BEFORE applyMaterials (it recolours the asset's own named materials;
 * applyMaterials then bakes those colours into the vertices and puts the shared canvas_tan triplanar set on,
 * so the micro texture and the dust film stay), and attachTeamMarks(model, team) AFTER it (the visor and the
 * stripe are their own materials, which the shared set must not swallow), before SoldierRig collapses per
 * joint. '?look=real' switches both off.
 */
import * as THREE from 'three';

// the triplanar set's basecolor multiplies these (mean about 0.55), so they are set light to land on brick red
// 0x8a3e34 and slate blue 0x4a5f78 on screen
export const TEAM_COLOUR = { militia: 0xa64a3a, rangers: 0x5b7290 };   // first pass 0xd6604c / 0x7c9ec4 read as toy orange and periwinkle in assetview
const GEAR = 0x5c5d60, GEAR_DARK = 0x3c3d40;

export function teamLookEnabled() {
  try { return new URLSearchParams(location.search).get('look') !== 'real'; } catch (e) { return true; }
}

export function applyTeamLook(model, team) {
  const teamHex = TEAM_COLOUR[team] || TEAM_COLOUR.militia;
  const done = new Map();
  let n = 0;
  model.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const src = o.material;
    let mm = done.get(src.uuid);
    if (!mm) {
      mm = src.clone(); mm.name = src.name;
      const name = src.name || '';
      const lum = src.color.r * 0.3 + src.color.g * 0.59 + src.color.b * 0.11;
      if (name === 'metal') { /* rifle, steel: as authored */ }
      else if (name === 'plaster' || name === 'fabric') { mm.color.setHex(teamHex); mm.roughness = 0.92; mm.metalness = 0; }
      else if (name === 'fabric' || name === 'timber') { mm.color.setHex(GEAR); mm.roughness = 0.9; mm.metalness = 0; }
      else { mm.color.setHex(GEAR_DARK); mm.roughness = 0.85; mm.metalness = 0; }
      done.set(src.uuid, mm);
    }
    o.material = mm; n++;
  });
  model.userData.teamLook = team;
  return { meshes: n, materials: done.size };
}

export function attachTeamMarks(model, team) {
  const teamHex = TEAM_COLOUR[team] || TEAM_COLOUR.militia;
  const j = model.userData.joints || {};
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.35, metalness: 0.2 }); gearMat.name = 'visor';
  if (j.head) {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.07), gearMat);
    visor.name = 'team_visor'; visor.position.set(0, 0.14, 0.085); visor.castShadow = true;
    j.head.add(visor);
  }
  if (j.torso) {
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(teamHex).multiplyScalar(1.6), emissiveIntensity: 2.5, roughness: 0.6 });
    stripeMat.name = 'stripe';
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), stripeMat);
    stripe.name = 'team_stripe'; stripe.position.set(0, 0.42, 0.135);
    j.torso.add(stripe);
  }
  return true;
}
