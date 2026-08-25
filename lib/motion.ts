"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

/**
 * Motion language: everything settles.
 *
 * Documents laid on a desk, not elements flying in. Long-tailed out-easings,
 * short travel, no rotation, no scale-bounce, no parallax stacking. If an
 * animation draws attention to itself it is wrong for this audience.
 */

export const EASE = {
  /** Default reveal. Long tail, dead stop. */
  settle: "power3.out",
  /** Heavier reveal for ledger rows and list items. */
  lay: "power2.out",
} as const;

export const DUR = {
  reveal: 1.1,
  row: 0.9,
  count: 1.6,
  quick: 0.6,
} as const;

/** Travel distance ceiling. Nothing in this build moves further than this. */
export const SHIFT = 24;

/** ScrollTrigger defaults — every trigger fires once, except the timeline scrub. */
export const TRIGGER = {
  start: "top 82%",
  once: true,
} as const;

const MQ = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * `prefers-reduced-motion` gate.
 *
 * Read via useSyncExternalStore rather than useEffect + useState, so the real
 * value is available on the first client render — before paint, before any
 * `gsap.set` hides an element. Nothing branches JSX on it (the server snapshot
 * is always `false`), so there is no hydration mismatch; components use it only
 * to decide whether to build a timeline at all.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MQ).matches,
    () => false
  );
}

/** One-shot read for non-hook contexts (Lenis setup, event handlers). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MQ).matches;
}

/**
 * useLayoutEffect on the client, useEffect on the server.
 *
 * Entrance animations set their from-state here so the hidden state is
 * committed before the browser paints — a plain useEffect would flash the
 * final state for one frame first.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
