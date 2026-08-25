import { useMemo, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * The rim shader — where the "neon outline vs. real atmosphere" battle is
 * fought. BackSide + additive so it reads as scattered light behind the limb.
 * All uniforms are driven from the Leva panel via props.
 */

const rimVertex = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const rimFragment = /* glsl */ `
varying vec3 vNormal;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFalloff;
void main() {
  float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), uFalloff);
  gl_FragColor = vec4(uColor, 1.0) * rim * uIntensity;
}
`;

// Front-side haze so the planet's limb softens into the rim instead of ending
// at a hard edge (mont-fort has this; most amateur globes don't).
const hazeFragment = /* glsl */ `
varying vec3 vNormal;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFalloff;
void main() {
  float rim = pow(1.0 - clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), uFalloff);
  gl_FragColor = vec4(uColor, 1.0) * rim * uIntensity;
}
`;

interface AtmosphereProps {
  color: string;
  intensity: number;
  falloff: number;
  radius: number;
}

export function AtmosphereRim({
  color,
  intensity,
  falloff,
  radius,
  /** Per-frame intensity multiplier — the rim brightens on the approach as
      the camera enters the atmosphere. A ref, not a prop value, because the
      scene does not re-render per frame. */
  mulRef,
}: AtmosphereProps & { mulRef?: MutableRefObject<number> }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 1 },
      uFalloff: { value: 3 },
    }),
    []
  );
  uniforms.uColor.value.set(color);
  uniforms.uIntensity.value = intensity;
  uniforms.uFalloff.value = falloff;
  useFrame(() => {
    uniforms.uIntensity.value = intensity * (mulRef?.current ?? 1);
  });

  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={rimVertex}
        fragmentShader={rimFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export function InnerHaze({ color, intensity, falloff }: Omit<AtmosphereProps, "radius">) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 1 },
      uFalloff: { value: 3 },
    }),
    []
  );
  uniforms.uColor.value.set(color);
  uniforms.uIntensity.value = intensity;
  uniforms.uFalloff.value = falloff;

  return (
    <mesh scale={1.002}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={rimVertex}
        fragmentShader={hazeFragment}
        uniforms={uniforms}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
