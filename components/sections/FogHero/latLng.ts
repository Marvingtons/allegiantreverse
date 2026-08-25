import * as THREE from "three";

/**
 * Lat/lng → position on a sphere whose equirectangular texture has its seam
 * at lon ±180 (the standard three.js SphereGeometry UV convention, matching
 * the stock planet maps). Same convention as the overlay canvas projection.
 */
export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
