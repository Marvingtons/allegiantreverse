"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import { AtmosphereRim, InnerHaze } from "./Atmosphere";
import { buildStatesDataMap } from "./statesOverlay";
import { markDataMap, markFirstFrame } from "@/lib/siteReady";
import { waveVertex, waveFragment } from "./statesWaveShader";
import { useStateBorders, type BorderHandles } from "./StateBorders";
import { latLngToVec3 } from "./latLng";
import * as cfg from "@/lib/globe.config";

export function GlobeScene({
  progress,
  cover,
  onSky,
  onReady,
}: {
  progress: MutableRefObject<number>;
  /** 0..1 through the into-the-fog cover — eases the cloud spin, never stops it. */
  cover?: MutableRefObject<number>;
  /** Receives the dawn grade each frame so the DOM stage can match it. */
  onSky?: (css: string) => void;
  /** Fires on the first rendered frame — the DOM fog crossfades out on this. */
  onReady?: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  const textures = useTexture(cfg.TEXTURES);
  textures.map.colorSpace = THREE.SRGBColorSpace;
  textures.map.anisotropy = 8;
  textures.clouds.colorSpace = THREE.SRGBColorSpace;
  textures.clouds.anisotropy = 8;

  // ~250ms of CPU that has to finish before anything can be drawn, so the
  // gate counts it rather than letting it run past a counter reading 100%.
  const dataMap = useMemo(() => {
    const t = buildStatesDataMap();
    markDataMap();
    return t;
  }, []);
  const waveMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waveVertex,
        fragmentShader: waveFragment,
        uniforms: {
          uDataMap: { value: dataMap },
          uProgress: { value: 0 },
          uFade: { value: cfg.WAVE_SHADER.fade },
          uMaskLo: { value: cfg.WAVE_SHADER.maskLo },
          uMaskHi: { value: cfg.WAVE_SHADER.maskHi },
          uGoldDeep: { value: new THREE.Color(cfg.WAVE_SHADER.goldDeep) },
          uGoldMid: { value: new THREE.Color(cfg.WAVE_SHADER.goldMid) },
          uGoldHigh: { value: new THREE.Color(cfg.WAVE_SHADER.goldHigh) },
          uCenterAlpha: { value: cfg.WAVE_SHADER.centerAlpha },
          uEdgeAlpha: { value: cfg.WAVE_SHADER.edgeAlpha },
          uFallRange: { value: cfg.WAVE_SHADER.fallRange },
          uGlowRange: { value: cfg.WAVE_SHADER.glowRange },
          uGlowIntensity: { value: cfg.WAVE_SHADER.glowIntensity },
          uHaloRange: { value: cfg.WAVE_SHADER.haloRange },
          uHaloIntensity: { value: cfg.WAVE_SHADER.haloIntensity },
          uLightDir: { value: new THREE.Vector3(0, 0, 1) },
          uSpecStrength: { value: cfg.WAVE_SHADER.specStrength },
          uSpecPower: { value: cfg.WAVE_SHADER.specPower },
          uDebug: { value: 0 },
          uSweep: { value: 0 },
          uSweepIntensity: { value: cfg.SWEEP.intensity },
          uSweepWidth: { value: cfg.SWEEP.width },
          uSweepStart: { value: 0.145 },
          uSweepEnd: { value: 0.325 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [dataMap]
  );

  const earthRef = useRef<THREE.Mesh>(null!);
  const innerGroup = useRef<THREE.Group>(null!);
  const outerGroup = useRef<THREE.Group>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const cloudMat = useRef<THREE.MeshLambertMaterial>(null!);
  const labelRef = useRef<HTMLDivElement>(null!);
  const cur = useRef<Record<string, number> | null>(null);

  const borderMats = useRef<BorderHandles | null>(null);
  const borderEls = useStateBorders(borderMats);

  const timeAcc = useRef(0);
  /** Flyover rotation only — see SPIN_COVER; zero unless the cover is live. */
  // (the idle drift is a pure function of elapsed time — nothing to hold)
  const rimBoost = useRef(1);
  const readyFired = useRef(false);
  const sweepArmed = useRef(true);
  const sweepT0 = useRef<number | null>(null);
  const pinged = useRef(false);
  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const lightPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    scene.fog = new THREE.Fog(cfg.FOG.openColor, cfg.FOG.fogNear, cfg.FOG.fogFar);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Hoisted fog endpoints — no per-frame Color allocations.
  const fogCloud = useMemo(() => new THREE.Color(cfg.FOG.cloudColor), []);
  const fogBg = useMemo(() => new THREE.Color(cfg.FOG.bgColor), []);

  // Dawn-grade endpoints and the scratch colour the ramp is written into —
  // hoisted so the grade costs no per-frame allocation.
  const dawnSpace = useMemo(() => new THREE.Color(cfg.DAWN.space), []);
  const dawnAtmo = useMemo(() => new THREE.Color(cfg.DAWN.atmo), []);
  const dawnSky = useMemo(() => new THREE.Color(cfg.DAWN.sky), []);
  const sky = useMemo(() => new THREE.Color(), []);
  const lastSky = useRef(-1);

  useEffect(() => {
    scene.background = sky;
    return () => {
      scene.background = null;
    };
  }, [scene, sky]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = cfg.GRADE.exposure;
  }, [gl]);

  const ROSEVILLE = useMemo(
    () => latLngToVec3(cfg.ROSEVILLE_LAT, cfg.ROSEVILLE_LNG, 1.006),
    []
  );

  const keyframes = cfg.KEYFRAMES;
  const KF_KEYS = ["dist", "camX", "camY", "tgtX", "tgtY", "yaw", "pitch", "tilt", "clouds"] as const;

  useFrame((_, delta) => {
    if (!readyFired.current) {
      readyFired.current = true;
      // "Ready" means DRAWN. This runs inside useFrame, so the scene has a
      // frame on screen — textures decoded, shaders compiled, first upload
      // done. That is a strictly later event than "the bytes arrived", and
      // it is the one the scroll gate actually cares about.
      markFirstFrame();
      onReady?.();
    }
    const dt = Math.min(delta, 0.05);
    const p = progress.current;
    timeAcc.current += dt;

    let a = keyframes[0];
    let b = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (p >= keyframes[i].t && p <= keyframes[i + 1].t) {
        a = keyframes[i];
        b = keyframes[i + 1];
        break;
      }
    }
    const span = Math.max(b.t - a.t, 1e-6);
    let lt = THREE.MathUtils.clamp((p - a.t) / span, 0, 1);
    if (a.t === cfg.PHASES.reveal) lt = 1 - Math.pow(1 - lt, 2.2);

    if (!cur.current) {
      cur.current = {};
      for (const k of KF_KEYS) cur.current[k] = THREE.MathUtils.lerp(a[k], b[k], lt);
    }
    const c = cur.current;
    for (const k of KF_KEYS) {
      const target = THREE.MathUtils.lerp(a[k], b[k], lt);
      c[k] = THREE.MathUtils.damp(c[k], target, cfg.MOTION.damping, dt);
    }

    // Ambient life at the opening: the camera sways a little, so the fogged
    // surface slides past. Applied BEFORE lookAt, so the camera keeps facing
    // its target and the sway reads as parallax rather than as a pan. The
    // globe's own orientation is untouched — see AMBIENT.
    const driftK = 1 - THREE.MathUtils.smoothstep(p, 0, cfg.PHASES.reveal);
    const ta = timeAcc.current;
    camera.position.set(
      c.camX + Math.sin(ta * cfg.AMBIENT.driftFreqX) * cfg.AMBIENT.driftX * driftK,
      c.camY + Math.sin(ta * cfg.AMBIENT.driftFreqY + 1.3) * cfg.AMBIENT.driftY * driftK,
      c.dist
    );
    camera.lookAt(c.tgtX, c.tgtY, 0);

    const cp = cover?.current ?? 0;
    const spinMul = THREE.MathUtils.lerp(1, cfg.COVER.spinFloor, cp);

    // SINGLE WRITER for the spin: this line and nothing else.
    //
    //   spin = idleAccum + scrollOffset
    //
    // Both terms are ADDITIVE and nothing is ever tweened toward an absolute
    // target. `idle` is a tiny always-alive breath (bounded); the offset
    // is a pure function of how far the reader has scrubbed the transition,
    // multiplied by K — the same degrees-per-viewport the copy beats have
    // been turning the planet at all along. That is why the boundary is
    // undetectable in rotation terms, and why scrolling back up rolls the
    // planet back symmetrically: the offset simply unwinds.
    const idle =
      cfg.IDLE.amp * Math.sin((timeAcc.current * Math.PI * 2) / cfg.IDLE.periodSec);
    // The beats' yaw (c.yaw) is keyframed, eased and damped — that is the
    // choreography: roll in through the descent, ease out across the arrival,
    // settle for the landing. The cover ADDS to it rather than replacing it,
    // and the ROLL_EASE exponent means the added roll starts at zero rate, so
    // it grows out of the settle instead of interrupting it.
    const exitRoll =
      cfg.K_SIGN *
      cfg.K_RAD_PER_VH *
      cfg.COVER_VH *
      Math.pow(cp, cfg.ROLL_EASE);
    const roll = c.yaw + exitRoll;
    innerGroup.current.rotation.set(c.pitch, roll + idle, 0);
    // Published so the rotation rate can be MEASURED across the pin/cover
    // boundary rather than argued about. One number assignment per frame.
    (window as unknown as { __globeRoll?: number; __globeYaw?: number }).__globeRoll = roll;
    // Includes the idle breath — this is the angle actually on screen.
    (window as unknown as { __globeYaw?: number }).__globeYaw = roll + idle;

    // THE EXIT. One transform on the rig that holds the whole planet — up,
    // left and growing — interpolated between literal keyframes so the
    // acceleration comes from their placement rather than from an eased
    // scrub. The rig never touches the spin axis; that is innerGroup's.
    const K = cfg.EXIT;
    let k0 = K[0];
    let k1 = K[K.length - 1];
    for (let i = 0; i < K.length - 1; i++) {
      if (cp >= K[i].t && cp <= K[i + 1].t) {
        k0 = K[i];
        k1 = K[i + 1];
        break;
      }
    }
    const kt = THREE.MathUtils.clamp((cp - k0.t) / Math.max(k1.t - k0.t, 1e-6), 0, 1);
    outerGroup.current.scale.setScalar(THREE.MathUtils.lerp(k0.scale, k1.scale, kt));
    outerGroup.current.position.x = THREE.MathUtils.lerp(k0.x, k1.x, kt);
    outerGroup.current.position.y = THREE.MathUtils.lerp(k0.y, k1.y, kt);
    outerGroup.current.rotation.z = c.tilt;

    // Entering the atmosphere: the rim lights up on the approach, then
    // leaves with the limb.
    rimBoost.current = THREE.MathUtils.lerp(
      1,
      cfg.RIM_BOOST.to,
      THREE.MathUtils.smoothstep(cp, 0, cfg.RIM_BOOST.by)
    );

    // THE DAWN GRADE. space black -> atmosphere blue -> pale sky, on the
    // same scrub. The windows overlap deliberately: the result is one
    // continuous, monotonic brightening (luminance 10 -> 82 -> 206) with no
    // step, and the fog decks (which do not start until 0.45) therefore
    // never composite over anything darker than the atmosphere.
    sky
      .copy(dawnSpace)
      .lerp(dawnAtmo, THREE.MathUtils.smoothstep(cp, cfg.DAWN.atmoFrom, cfg.DAWN.atmoTo))
      .lerp(dawnSky, THREE.MathUtils.smoothstep(cp, cfg.DAWN.skyFrom, cfg.DAWN.skyTo));
    // The DOM stage behind the canvas reads the SAME colour, so the canvas
    // crossfade at the end of the cover has no boundary to give away.
    // QUANTIZED: a background-color write repaints a full-viewport element
    // that contains the canvas, so doing it every frame invalidates the
    // stage's layer 60x a second for a colour the eye cannot resolve. One
    // step per 1/255 of the ramp is finer than the display can show and
    // costs a paint only when the colour has actually moved.
    const skyKey =
      (Math.round(sky.r * 255) << 16) | (Math.round(sky.g * 255) << 8) | Math.round(sky.b * 255);
    if (skyKey !== lastSky.current) {
      lastSky.current = skyKey;
      onSky?.(sky.getStyle());
    }

    cloudMat.current.opacity = c.clouds;

    if (scene.fog instanceof THREE.Fog) {
      // Phase 1 is a near-white immersion (the DOM fog's tone); it hands off
      // to the lab's blue-grey as the descent starts, then clears mid-reveal.
      const kIn = THREE.MathUtils.smoothstep(p, 0, cfg.PHASES.fog);
      const k = THREE.MathUtils.smoothstep(p, cfg.FOG.clearFrom, cfg.FOG.clearBy);
      scene.fog.near = THREE.MathUtils.lerp(cfg.FOG.fogNear, 4, k);
      scene.fog.far = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(cfg.FOG.openFar, cfg.FOG.denseFar, kIn),
        cfg.FOG.clearFar,
        k
      );
      scene.fog.color.set(cfg.FOG.openColor).lerp(fogCloud, kIn).lerp(fogBg, k);
    }
    // The one ambient motion in the scene: the cloud shell drifts, the earth
    // does not. Fast while the camera sits inside the deck (this is the
    // movement in the opening frame), easing off as it pulls back to the
    // full disc, then eased again toward spinFloor across the cover.
    const cloudRate = THREE.MathUtils.lerp(
      cfg.AMBIENT.cloudsNear,
      cfg.AMBIENT.cloudsFar,
      THREE.MathUtils.smoothstep(p, 0, cfg.PHASES.reveal)
    );
    cloudsRef.current.rotation.y += cloudRate * spinMul * dt;

    const lk = THREE.MathUtils.smoothstep(p, cfg.LIGHT_TRAVEL.from, cfg.LIGHT_TRAVEL.to);
    lightPos.set(
      THREE.MathUtils.lerp(cfg.LIGHTING.x, cfg.LIGHTING.endX, lk),
      THREE.MathUtils.lerp(cfg.LIGHTING.y, cfg.LIGHTING.endY, lk),
      THREE.MathUtils.lerp(cfg.LIGHTING.z, cfg.LIGHTING.endZ, lk)
    );
    if (lightRef.current) lightRef.current.position.copy(lightPos);

    const gk = THREE.MathUtils.smoothstep(p, 0.55, 1.0);
    (waveMat.uniforms.uLightDir.value as THREE.Vector3)
      .set(
        THREE.MathUtils.lerp(cfg.WAVE_SHADER.glintFrom.x, cfg.WAVE_SHADER.glintTo.x, gk),
        THREE.MathUtils.lerp(cfg.WAVE_SHADER.glintFrom.y, cfg.WAVE_SHADER.glintTo.y, gk),
        THREE.MathUtils.lerp(cfg.WAVE_SHADER.glintFrom.z, cfg.WAVE_SHADER.glintTo.z, gk)
      )
      .normalize();

    const wave = THREE.MathUtils.clamp((p - cfg.WAVE_START) / (cfg.WAVE_END - cfg.WAVE_START), 0, 1);
    waveMat.uniforms.uProgress.value = wave;

    if (borderMats.current) {
      borderMats.current.interior.opacity =
        THREE.MathUtils.smoothstep(wave, 0, 0.6) * cfg.BORDER_LINES.intOpacity;
      borderMats.current.exterior.opacity =
        THREE.MathUtils.smoothstep(wave, 0, 0.75) * cfg.BORDER_LINES.extOpacity;
    }

    // Landing line: composes once the wave has finished and the globe settles.
    // The text foil and the shader sweep fire TOGETHER, and only once the line
    // is actually visible — a sweep nobody sees is a wasted signature moment.
    const landing = document.getElementById("hero-landing");
    if (landing) landing.classList.toggle("show", p >= cfg.LANDING_AT);
    if (wave >= 1 && p >= cfg.LANDING_AT && sweepArmed.current) {
      sweepArmed.current = false;
      sweepT0.current = timeAcc.current;
      landing?.classList.add("foil");
    }
    if (p < 0.6 && !sweepArmed.current) {
      sweepArmed.current = true;
      sweepT0.current = null;
      pinged.current = false;
      waveMat.uniforms.uSweep.value = 0;
      landing?.classList.remove("foil");
      labelRef.current?.classList.remove("on");
    }
    if (sweepT0.current !== null) {
      const s = THREE.MathUtils.clamp((timeAcc.current - sweepT0.current) / cfg.SWEEP.duration, 0, 1);
      const eased = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
      waveMat.uniforms.uSweep.value = eased;
      if (eased >= 0.15 && !pinged.current) {
        pinged.current = true;
        labelRef.current?.classList.add("on");
      }
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={[cfg.LIGHTING.x, cfg.LIGHTING.y, cfg.LIGHTING.z]}
        intensity={cfg.LIGHTING.sunIntensity}
      />
      <ambientLight intensity={cfg.LIGHTING.ambientIntensity} />

      <group ref={outerGroup}>
        <group ref={innerGroup}>
          <mesh ref={earthRef}>
            <sphereGeometry args={[1, 128, 128]} />
            <meshPhongMaterial
              map={textures.map}
              normalMap={textures.normalMap}
              normalScale={new THREE.Vector2(0.85, 0.85)}
              specularMap={textures.specularMap}
              specular={new THREE.Color("#39434f")}
              shininess={8}
              color={cfg.GRADE.tint}
            />
          </mesh>

          <mesh scale={1.0028}>
            <sphereGeometry args={[1, 128, 128]} />
            <primitive object={waveMat} attach="material" />
          </mesh>

          {/* Border linework — real geometry, crisp at any zoom */}
          {borderEls}

          <mesh ref={cloudsRef} scale={1.012}>
            <sphereGeometry args={[1, 128, 128]} />
            <meshLambertMaterial
              ref={cloudMat}
              color="#ffffff"
              alphaMap={textures.clouds}
              transparent
              depthWrite={false}
            />
          </mesh>

          <InnerHaze
            color={cfg.INNER_HAZE.color}
            intensity={cfg.INNER_HAZE.intensity}
            falloff={cfg.INNER_HAZE.falloff}
          />

          <Html position={ROSEVILLE} occlude={[earthRef]} zIndexRange={[2, 0]}>
            <div ref={labelRef} className="hq-marker">
              <span className="hq-ring" />
              <span className="hq-dot" />
              <span className="hq-text">HQ — SINCE 2003</span>
            </div>
          </Html>
        </group>

        <AtmosphereRim
          color={cfg.ATMOSPHERE_RIM.color}
          intensity={cfg.ATMOSPHERE_RIM.intensity}
          falloff={cfg.ATMOSPHERE_RIM.falloff}
          radius={cfg.ATMOSPHERE_RIM.radius}
          mulRef={rimBoost}
        />
      </group>
    </>
  );
}
