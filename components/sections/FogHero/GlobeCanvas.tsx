"use client";

import { Suspense, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { GlobeScene } from "./GlobeScene";

/**
 * R3F container for the fog-hero sequence. Loaded via next/dynamic (ssr:false)
 * from the section shell, so the three chunk never enters the initial bundle —
 * the DOM fog owns the screen until this reports its first frame.
 *
 * - `onReady` fires from the scene's first rendered frame → shell crossfades
 *   the DOM fog out over it.
 * - `onContextLost` → shell swaps to the type-only hero. Never a black hole.
 * - Frameloop pauses when the tab is hidden or the pin has scrolled fully out
 *   of view (the hero sits at the top, so this matters for long sessions
 *   parked further down the page).
 */
export default function GlobeCanvas({
  progress,
  cover,
  onReady,
  onSky,
  onContextLost,
}: {
  progress: MutableRefObject<number>;
  cover?: MutableRefObject<number>;
  onReady?: () => void;
  /** The dawn grade, forwarded so the DOM stage can match the canvas. */
  onSky?: (css: string) => void;
  onContextLost?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);

    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 1.35], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
        frameloop={inView && tabVisible ? "always" : "never"}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              onContextLost?.();
            },
            { once: true }
          );
        }}
      >
        <color attach="background" args={["#0b0b09"]} />
        <Suspense fallback={null}>
          <GlobeScene progress={progress} cover={cover} onReady={onReady} onSky={onSky} />
        </Suspense>
      </Canvas>
    </div>
  );
}
