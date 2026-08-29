"use client";

import { useEffect, useRef, useState } from "react";
import { CINEMA_MQ } from "@/lib/globe.config";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import {
  PATIENCE_MS,
  onProgress,
  progress,
  startSiteReady,
  whenSiteReady,
} from "@/lib/siteReady";

/**
 * The visible half of the readiness gate: a small counter, bottom-left.
 *
 * It is deliberately not a preloader. The lockup is still beat zero of the
 * scroll story and still builds on its own timeline — this only holds the
 * scroll until there is a drawn planet to scroll onto, and shows how far off
 * that is. On a warm cache it appears for a handful of frames.
 *
 * It also covers the session-skip path, where no intro plays at all: the
 * counter is the entire gate there, over the fog hero, and it unlocks the
 * moment the globe can draw.
 */
export default function ReadyGate() {
  // Starts hidden so the no-JS payload never ships a frozen "00%"; the effect
  // shows it only when the cinema will actually run.
  const [shown, setShown] = useState(false);
  const [patient, setPatient] = useState(false);
  const numRef = useRef<HTMLSpanElement>(null);
  /** Displayed value, smoothed. Real progress arrives in bursts as each
      texture lands; lerping toward it — and never downward — keeps the count
      from jumping 12 → 71 → 74 and reading as broken. */
  const shownPct = useRef(0);

  useEffect(() => {
    startSiteReady();

    // Non-cinema (mobile, coarse pointer, reduced motion) mounts no globe, so
    // there is nothing to wait for: clear the inline scroll-lock immediately —
    // without this the page would stay locked until the 25s inline backstop —
    // and never paint the counter (pure anxiety with no globe behind it).
    if (!window.matchMedia(CINEMA_MQ).matches) {
      unlockScroll();
      return;
    }

    setShown(true);
    lockScroll();

    let raf = 0;
    let target = progress();
    const off = onProgress((p) => {
      target = p;
    });

    const tick = () => {
      shownPct.current += (target - shownPct.current) * 0.12;
      // Snap the last sliver so the counter always lands on 100, and never
      // sits at 99 for a frame after the gate has already opened.
      if (target >= 1 && shownPct.current > 0.995) shownPct.current = 1;
      if (numRef.current) {
        numRef.current.textContent = String(Math.floor(shownPct.current * 100)).padStart(2, "0");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const patience = window.setTimeout(() => setPatient(true), PATIENCE_MS);

    let done = false;
    whenSiteReady().then(() => {
      done = true;
      unlockScroll();
      // Let the counter finish its run to 100 before it goes.
      window.setTimeout(() => setShown(false), 420);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(patience);
      off();
      // Never leave the page locked because this unmounted mid-gate.
      if (!done) unlockScroll();
    };
  }, []);

  if (!shown) return null;

  return (
    <div className="ready-gate" aria-live="polite" aria-label="Loading">
      <span className="ready-gate-num">
        <span ref={numRef}>00</span>
        <span className="ready-gate-pct">%</span>
      </span>
      {patient && <span className="ready-gate-note">Preparing the experience</span>}
    </div>
  );
}
