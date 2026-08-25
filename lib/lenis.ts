"use client";

import type Lenis from "lenis";

/**
 * The one Lenis instance, shared.
 *
 * The Desk sequence needs it to run its own phase snapping: the section is held
 * by native `position: sticky` rather than a ScrollTrigger pin, so there is no
 * ScrollTrigger `snapTo` to lean on, and a raw window.scrollTo would fight
 * Lenis for control of the scroll position.
 */
let instance: Lenis | null = null;

/** Desired lock state, kept OUTSIDE the instance. The readiness gate locks on
    first paint and MotionProvider constructs Lenis in an effect, so the lock
    reliably arrives first; holding the intent here means the instance simply
    adopts it whenever it shows up rather than starting unlocked. */
let locked = false;

export const setLenis = (l: Lenis | null) => {
  instance = l;
  if (l && locked) l.stop();
};
export const getLenis = () => instance;

/**
 * Hold the page at the top until the gate opens.
 *
 * Both halves are needed. `lenis.stop()` alone leaves the native scrollbar,
 * keyboard paging and trackpad fallback live; `overflow: hidden` alone does
 * nothing to Lenis, which drives scroll itself. Together they cover every
 * input — and neither blocks `window.scrollTo`, which is load-bearing: the
 * session-skip path jumps to the landing frame while the gate is still shut.
 */
export const lockScroll = () => {
  locked = true;
  instance?.stop();
  document.documentElement.classList.add("scroll-locked");
};

export const unlockScroll = () => {
  locked = false;
  instance?.start();
  document.documentElement.classList.remove("scroll-locked");
};

export const isScrollLocked = () => locked;
