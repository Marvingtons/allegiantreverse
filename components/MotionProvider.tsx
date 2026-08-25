"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { setLenis } from "@/lib/lenis";

/**
 * Registers ScrollTrigger once and drives Lenis off the GSAP ticker, so scrub
 * triggers read the same frame Lenis just wrote (no one-frame jitter).
 *
 * Under `prefers-reduced-motion` Lenis never starts — native scrolling only —
 * and every section renders in its final state via `useReducedMotion`.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) {
      // Make sure anything that did mount a trigger settles at its end state.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({ lerp: 0.1 });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Fonts land after first paint and change every measured position.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      gsap.ticker.remove(raf);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
