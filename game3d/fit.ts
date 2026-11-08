// game3d/fit.ts
// Works out how much to scale a building model so it fits the space we give it.
// The Kenney kits use different sizes for different buildings, so instead of one fixed
// scale for everything, we measure each model and fit it.

import * as THREE from "three";

// How wide a building should be by default, in world units. Our character is 1.7 units tall.
export const TARGET_FOOTPRINT = 10;

// The tallest a building may be, in world units, so skyscrapers do not tower over everything.
export const MAX_HEIGHT = 16;

// Returns the scale that makes the model about "footprint" units wide,
// without going over "maxHeight" units tall. Call it on the model before scaling it.
export function fitScale(
  model: THREE.Object3D,
  footprint: number = TARGET_FOOTPRINT,
  maxHeight: number = MAX_HEIGHT,
): number {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const widest = Math.max(size.x, size.z, 0.0001); // never divide by zero
  const tallest = Math.max(size.y, 0.0001);
  return Math.min(footprint / widest, maxHeight / tallest);
}