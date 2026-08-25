"use client";

/**
 * One signal: the brand lockup has finished drawing.
 *
 * The lockup's silk pour is a main-thread SVG mask animation, and the globe's
 * boot is a ~1.2s pile of main-thread work (shader compile, 8K cloud decode
 * and upload, the states data-map bake). Measured concurrently, the boot's
 * long tasks land squarely on the draw: a 716ms task mid letter-stagger, and
 * a 922ms frozen frame. They are both cheap enough alone — they simply must
 * not overlap. FogHero waits on this before mounting the canvas.
 *
 * Nothing may hang on it: the signal auto-fires after SAFETY_MS whatever
 * happens, so a thrown build or an unmounted lockup can never withhold the
 * globe.
 */

const SAFETY_MS = 4000;

let built = false;
const waiters = new Set<() => void>();
let safety: ReturnType<typeof setTimeout> | null = null;

export function emitLockupBuilt(): void {
  if (built) return;
  built = true;
  // Published so a harness can separate "the gate is slow" from "the intro
  // is 3.5s long" — the gate's own cost is readyTime minus this.
  (window as unknown as { __introBuiltAt?: number }).__introBuiltAt = performance.now();
  if (safety) {
    clearTimeout(safety);
    safety = null;
  }
  waiters.forEach((cb) => cb());
  waiters.clear();
}

/** Resolves when the lockup has drawn — or on the safety timer, whichever first. */
export function whenLockupBuilt(): Promise<void> {
  if (built) return Promise.resolve();
  return new Promise((resolve) => {
    waiters.add(resolve);
    safety ??= setTimeout(emitLockupBuilt, SAFETY_MS);
  });
}
