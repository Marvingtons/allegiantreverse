/**
 * Gold-foil coverage fill. Borders are NOT here any more — they're Line2
 * geometry (StateBorders.tsx). This shader owns the fill body, the coastline
 * glow, the outer halo, the specular glint and the light sweep, all driven
 * from the baked data map (R = delay, G = fill mask, B = union SDF).
 *
 * De-mudding rule: deep amber added over brown-green terrain reads as sepia
 * mud, so the FILL leans champagne only and stays a whisper (center alpha
 * ~0.05). Deep gold survives just in the outer halo, over dark ocean where
 * it can't muddy anything. The gold you actually read is the champagne
 * linework plus the moving glint — that's what foil looks like.
 */

export const waveVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const waveFragment = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
uniform sampler2D uDataMap;
uniform float uProgress;       // wave progress 0->1
uniform float uFade;           // per-state fade-in window
uniform float uMaskLo;         // fill-mask smoothstep edges
uniform float uMaskHi;

uniform vec3 uGoldDeep;        // shadowed amber — halo only
uniform vec3 uGoldMid;         // body brass
uniform vec3 uGoldHigh;        // champagne highlight

uniform float uCenterAlpha;    // fill strength deep inside a state
uniform float uEdgeAlpha;      // fill strength near the coast
uniform float uFallRange;      // how fast fill falls from edge to center
uniform float uGlowRange;      // gilt rim just inside the coastline
uniform float uGlowIntensity;
uniform float uHaloRange;      // warm bleed outside the coastline
uniform float uHaloIntensity;

uniform vec3 uLightDir;        // world-space, animates with the scrub
uniform float uSpecStrength;
uniform float uSpecPower;      // MUST stay tight — see note in the fragment

uniform float uSweep;          // eased 0->1 sweep clock (0 = idle)
uniform float uSweepIntensity;
uniform float uSweepWidth;     // in data-map u units
uniform float uSweepStart;     // u at the US west coast
uniform float uSweepEnd;       // u at the US east coast

uniform float uDebug;          // 0 = off, 1 = show SDF (B), 2 = show mask (G)

void main() {
  vec4 d = texture2D(uDataMap, vUv);

  if (uDebug > 0.5) {
    float v = uDebug < 1.5 ? d.b : d.g;
    gl_FragColor = vec4(vec3(v), 1.0);
    return;
  }

  float sdf = d.b;
  float insideT  = clamp((sdf - 0.5) * 2.0, 0.0, 1.0);  // 0 at coast -> 1 deep inside
  float outsideT = clamp((0.5 - sdf) * 2.0, 0.0, 1.0);
  float outMask  = 1.0 - step(0.5, sdf);

  float mask = smoothstep(uMaskLo, uMaskHi, d.g);
  float wave = smoothstep(d.r, d.r + uFade, uProgress);  // R is propagated outside, so halo syncs
  float fillWave = wave * mask;

  // --- fill: a warm breath over terrain, champagne-leaning, never amber ---
  float edgeFall = smoothstep(0.0, uFallRange, insideT);
  vec3 fillCol = mix(uGoldHigh, uGoldMid, edgeFall);
  float fillA = mix(uEdgeAlpha, uCenterAlpha, edgeFall) * fillWave;

  // The SDF is seeded at the union boundary only, so this hugs the coastline
  // and never fires along interior state lines.
  float glow = (1.0 - smoothstep(0.0, uGlowRange, insideT)) * fillWave;
  float halo = (1.0 - smoothstep(0.0, uHaloRange, outsideT)) * outMask * wave * uHaloIntensity;

  // --- foil catches light: the glint slides as the sun animates ---
  // The exponent has to be HIGH. On a smooth sphere normal, pow(N·L, 24) is a
  // lobe wider than the whole country — it reads as a flat cream wash, not a
  // glint (and turns unfilled Iowa into a dark hole by contrast). ~110 gives
  // a highlight small enough to travel across the states.
  float spec = pow(max(dot(normalize(vWorldNormal), normalize(uLightDir)), 0.0), uSpecPower);

  // --- sweep: primary band + faint trailing shimmer 0.15 behind ---
  float span = uSweepEnd - uSweepStart;
  float travel = span + 8.0 * uSweepWidth;
  float c1 = uSweepStart - 3.0 * uSweepWidth + travel * uSweep;
  float c2 = c1 - 0.15 * span;
  float band = (1.0 - smoothstep(0.0, uSweepWidth, abs(vUv.x - c1))) * uSweepIntensity
             + (1.0 - smoothstep(0.0, uSweepWidth * 1.4, abs(vUv.x - c2))) * uSweepIntensity * 0.33;
  float sweep = band * step(0.001, uSweep) * fillWave;

  vec3 color = fillCol * fillA
             + uGoldHigh * glow * uGlowIntensity
             + uGoldDeep * halo
             + uGoldHigh * spec * fillWave * uSpecStrength
             + uGoldHigh * sweep;
  color = min(color, uGoldHigh * 1.25); // never blows to white

  float lum = max(max(color.r, color.g), color.b);
  if (lum < 0.004) discard;
  gl_FragColor = vec4(color, 1.0); // additive: color IS the contribution
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
