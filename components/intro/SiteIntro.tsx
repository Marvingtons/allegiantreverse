"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { CINEMA_MQ } from "@/lib/globe.config";
import { emitLockupBuilt } from "@/lib/introState";
import { AllegiantMark } from "./AllegiantMark";

/**
 * The brand lockup — BEAT ZERO of the scroll story (mont-fort model).
 *
 * No preloader, no scroll lock, no handoff: the lockup is simply the first
 * frame of the sequence. It builds once on load (silk-pour S, navy slides,
 * divider, letter stagger), and from then on it belongs to the scrub like
 * every other beat — FogHero's render loop drives this wrapper's opacity
 * and blur through BEATS.lockup, so scrolling dissolves it and scrolling
 * back always brings it home. It never travels to the header; the nav's own
 * brand is static chrome and carries the accessible name.
 *
 * The build animates only the lockup's INTERNALS, so if the page loads
 * mid-scroll (session jump, deep link) it plays invisibly under the
 * wrapper's scroll-driven opacity-0 — by the time anyone scrubs back to the
 * top, the internals sit in their finished state.
 *
 * Strict-mode note: cleanup fully reverts so the dev double-mount replays
 * the build cleanly.
 */
export default function SiteIntro() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // The cinema CSS hides this on mobile/reduced-motion — skip the work too,
    // and release the globe immediately since no draw will run.
    if (!window.matchMedia(CINEMA_MQ).matches) {
      emitLockupBuilt();
      return;
    }

    const ctx = gsap.context(() => {
      const sReveal = el.querySelector<SVGPathElement>("[data-s-reveal]")!;
      const letters = el.querySelectorAll<HTMLElement>("[data-letter]");
      const divider = el.querySelector<HTMLElement>("[data-divider]")!;
      const eyebrow = el.querySelector<HTMLElement>("[data-eyebrow]")!;

      // Measure AFTER mount (strict-mode-safe), then arm the pour.
      const len = sReveal.getTotalLength();
      gsap.set(sReveal, { strokeDasharray: len, strokeDashoffset: len });

      // onComplete releases the globe's boot: the draw gets a clean main
      // thread, and the WebGL work starts the moment it no longer competes.
      //
      // paused: hydrating the rest of the page is a ~150ms long task, and
      // starting the pour into it cost a 316ms frame right at the top of the
      // draw. Wait for the thread to go idle (capped, so a busy thread can
      // never withhold the intro) — a beat later is invisible, a stutter in
      // the first stroke is not.
      const tl = gsap.timeline({ paused: true, onComplete: emitLockupBuilt });
      const start = () => tl.play();
      if ("requestIdleCallback" in window) {
        (window as Window & typeof globalThis).requestIdleCallback(start, { timeout: 400 });
      } else {
        setTimeout(start, 120);
      }
      tl.to(sReveal, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" }, 0.2);
      tl.to(el.querySelectorAll(".lg-n"), { opacity: 1, x: 0, stagger: 0.06, duration: 0.7, ease: "power2.out" }, 1.35);
      tl.to(divider, { scaleY: 1, duration: 0.55, ease: "power3.inOut" }, 1.75);
      tl.to(letters, { opacity: 1, y: 0, stagger: 0.035, duration: 0.6, ease: "power2.out" }, 1.95);
      tl.to(eyebrow, { opacity: 1, duration: 0.6 }, 2.5);
    }, el);

    return () => ctx.revert();
  }, []);

  // data-beat="lockup": FogHero's loop owns this wrapper's opacity/blur.
  return (
    <div
      ref={root}
      data-beat="lockup"
      className="intro-lockup col-start-1 row-start-1"
      aria-hidden="true"
    >
      <AllegiantMark className="w-[112px] shrink-0" />
      <span data-divider className="intro-divider" style={{ transform: "scaleY(0)" }} />
      <span className="flex flex-col">
        {/* TODO: confirm brand serif — using the site display face (Zodiak). */}
        <span className="intro-name">
          {"ALLEGIANT".split("").map((ch, i) => (
            <span key={i} data-letter style={{ opacity: 0, transform: "translateY(10px)" }}>
              {ch}
            </span>
          ))}
        </span>
        <span data-eyebrow className="intro-eyebrow" style={{ opacity: 0 }}>
          Reverse Services
        </span>
      </span>
    </div>
  );
}
