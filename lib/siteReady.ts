"use client";

import { CINEMA_MQ, TEXTURES } from "@/lib/globe.config";

/**
 * THE READINESS GATE.
 *
 * The bug this exists for: the lockup finished building and scroll opened
 * while the globe's textures were still on the wire, so a reader on a slow
 * connection could scrub straight into "130,000+ closings." with the copy
 * sitting on an empty background. Nothing was wrong with the sequence — it
 * simply had nothing to draw yet.
 *
 * So scroll is held until the globe can actually be SEEN, not until its bytes
 * have arrived: the gate wants a rendered frame, which is a strictly later
 * event than "textures decoded" (shader compile and the first GPU upload sit
 * between them, and they are the expensive part).
 *
 * Gated:
 *   - the four globe textures, through ONE THREE.LoadingManager so the
 *     counter reads real bytes rather than a guess
 *   - document.fonts.ready
 *   - the states data-map bake (CPU, ~250ms, and it blocks the first draw)
 *   - one rendered frame of the globe scene
 *
 * NOT gated any more: the two baked cover fog sprites. They belong to the end
 * of the sequence, the CSS loads them when the cover paints, and holding the
 * opening gate on 394KB the reader will not see until the flyover was waste.
 *
 * NOT gated, because they do not exist: there is no hero video. The opening
 * fog is three CSS gradient plates (.fog-blob), which are painted by the same
 * stylesheet that renders everything else — there is no separate asset to
 * wait on.
 *
 * Nothing may hang on this. Any single asset that errors is counted as done,
 * and HARD_MS resolves the gate regardless — a degraded globe beats a page
 * that will not scroll.
 */

/** One reassurance line appears after this. No spinners. */
export const PATIENCE_MS = 8000;
/** Absolute ceiling. Past this the gate opens whatever the network is doing.
    No visitor should sit on a frozen page longer than this under any failure. */
export const HARD_MS = 8000;

/** Weights sum to 1. Textures dominate because they ARE the download. The two
    cover fog sprites used to gate here (0.16), but they belong to the END of
    the 380vh sequence and the CSS loads them when the cover paints — so they
    no longer hold the opening gate; their weight went to textures and frame. */
const WEIGHTS = { textures: 0.72, fonts: 0.07, dataMap: 0.05, frame: 0.16 };

type Slice = keyof typeof WEIGHTS;

let ready = false;
let readyAt = 0;
const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
const waiters = new Set<() => void>();
const progressListeners = new Set<(p: number) => void>();

/** Per-slice completion, 0..1. `progress()` is their weighted sum. */
const slices: Record<Slice, number> = {
  textures: 0,
  fonts: 0,
  dataMap: 0,
  frame: 0,
};

export function progress(): number {
  let p = 0;
  for (const k of Object.keys(WEIGHTS) as Slice[]) p += slices[k] * WEIGHTS[k];
  return Math.min(1, p);
}

function setSlice(k: Slice, v: number) {
  const next = Math.max(slices[k], Math.min(1, v));
  if (next === slices[k]) return;
  slices[k] = next;
  if (k === "textures" && next >= 1) {
    textureWaiters.forEach((cb) => cb());
    textureWaiters.clear();
  }
  const p = progress();
  progressListeners.forEach((cb) => cb(p));
  if (p >= 1) resolveReady();
}

function resolveReady() {
  if (ready) return;
  ready = true;
  readyAt = performance.now() - startedAt;
  waiters.forEach((cb) => cb());
  waiters.clear();
}

export const isReady = () => ready;
/** Milliseconds from module init to the gate opening. For reporting. */
export const readyTime = () => readyAt;

export function whenSiteReady(): Promise<void> {
  if (ready) return Promise.resolve();
  return new Promise((resolve) => waiters.add(resolve));
}

export function onProgress(cb: (p: number) => void): () => void {
  progressListeners.add(cb);
  cb(progress());
  return () => progressListeners.delete(cb);
}

const textureWaiters = new Set<() => void>();

/**
 * Resolves when every globe texture is decoded and sitting in the loader
 * cache (or has failed and been written off).
 *
 * FogHero mounts the <Canvas> on this. Without it the canvas mounts on the
 * lockup build, suspends inside useTexture waiting for a download, produces
 * no frame, and the 6s "canvas never rendered" watchdog concludes WebGL is
 * broken and swaps in the type hero. On Slow 4G that fires every time — the
 * watchdog was written to catch a dead renderer and was instead measuring
 * the network. Mounting after the textures land makes those 6 seconds mean
 * what they were meant to mean.
 */
export function whenTexturesLoaded(): Promise<void> {
  if (slices.textures >= 1) return Promise.resolve();
  return new Promise((resolve) => textureWaiters.add(resolve));
}

/** The scene calls this from its first rendered frame — the last slice. */
export function markFirstFrame(): void {
  setSlice("frame", 1);
}

/** statesOverlay calls this once its data map is baked. */
export function markDataMap(): void {
  setSlice("dataMap", 1);
}

/** The globe will never draw (no WebGL2, context lost, or the canvas never
    produced a frame). Complete its slices so the page is not held on assets
    nobody is going to use — without this, a WebGL-less desktop sat locked
    for the full HARD_MS. */
export function markGlobeUnavailable(): void {
  for (const k of ["textures", "dataMap", "frame"] as Slice[]) setSlice(k, 1);
}

let started = false;

/**
 * Kick every download at page load, in parallel with the intro's build.
 *
 * NOTE ON THE CANVAS MOUNT: the textures start downloading here, but the
 * <Canvas> deliberately still mounts after the lockup has drawn. Mounting it
 * at load was measured to cost a 716ms long task landing mid letter-stagger
 * and a 922ms frozen frame — that is the "preloader is laggy" bug, and it is
 * shader compile and GPU upload, not the download. Preloading here gets the
 * parallelism without putting that work back on the draw: by the time the
 * canvas mounts every texture is already in r3f's loader cache and the mount
 * is nearly free.
 *
 * three and @react-three/fiber are imported DYNAMICALLY. Importing them at
 * module scope would pull the whole 3D stack into the initial bundle, which
 * is exactly what FogHero's next/dynamic boundary exists to avoid — the gate
 * would have paid for its own progress bar with a slower first load.
 */
async function preloadGlobeAssets(): Promise<void> {
  // The two cover fog sprites are not preloaded here any more: they belong to
  // the end of the sequence, and the CSS loads them when the cover decks paint.
  // Keeping them out of this path is what lets the opening gate ignore 394KB
  // that the reader will not see until the flyover.
  try {
    const [THREE, { useLoader }] = await Promise.all([
      import("three"),
      import("@react-three/fiber"),
    ]);
    const urls = Object.values(TEXTURES);
    const manager = new THREE.LoadingManager();
    // itemsTotal grows as requests are queued, so manager's own denominator
    // reads 1/1 early and the counter would leap to 100 and back. The set of
    // URLs is known up front — pin the denominator to it.
    manager.onProgress = (_url, loaded) => setSlice("textures", loaded / urls.length);
    manager.onLoad = () => setSlice("textures", 1);
    manager.onError = (url) => {
      console.warn(`[siteReady] texture failed, continuing without it: ${url}`);
      setSlice("textures", 1);
    };
    // This writes the SAME cache the scene's useTexture reads, keyed by
    // loader + url — so it is one fetch and one decode, not a duplicate
    // warmed alongside the real one.
    useLoader.preload(THREE.TextureLoader, urls, (loader) => {
      (loader as InstanceType<typeof THREE.TextureLoader>).manager = manager;
    });
  } catch (err) {
    console.warn("[siteReady] 3D chunk failed to load, opening the gate:", err);
    markGlobeUnavailable();
  }
}

export function startSiteReady(): void {
  if (started) return;
  started = true;

  // Non-cinema (mobile, coarse pointer, reduced motion) never mounts the
  // globe, so gating on globe assets would lock the page on textures that are
  // never requested. Those visitors wait on fonts alone.
  const mql = window.matchMedia(CINEMA_MQ);
  const cinema = mql.matches;
  if (!cinema) markGlobeUnavailable();

  // If the cinema query STOPS matching after load — the reader zooms in and
  // the CSS viewport drops under 900px, turns on reduced motion, or switches
  // to a coarse pointer — gsap.matchMedia reverts FogHero and the canvas stops
  // producing frames, so the frame/dataMap slices would never complete and the
  // gate would hang at ~89% with scroll locked until HARD_MS. Completing the
  // globe slices on the flip opens the gate immediately. (Permanent listener:
  // startSiteReady is a one-time init with no teardown, and this must outlive
  // any single mount.)
  mql.addEventListener("change", () => {
    if (!mql.matches) markGlobeUnavailable();
  });

  if (document.fonts) {
    document.fonts.ready.then(() => setSlice("fonts", 1)).catch(() => setSlice("fonts", 1));
  } else {
    setSlice("fonts", 1);
  }

  if (cinema) {
    void preloadGlobeAssets();
    // Warm the R3F/drei dynamic chunk NOW, in parallel with the intro, rather
    // than letting FogHero's next/dynamic first request it when it mounts the
    // canvas after the lockup draw (~3.2s). Only the shader compile and GPU
    // upload need to wait for the draw; the ~275KB download does not. The mount
    // stays gated on whenLockupBuilt — this just moves the bytes off the
    // critical path. Import for effect only; the module cache holds it.
    void import("@/components/sections/FogHero/GlobeCanvas");
  }

  window.setTimeout(() => {
    if (ready) return;
    console.warn(
      `[siteReady] gate timed out at ${Math.round(progress() * 100)}% after ${HARD_MS}ms — ` +
        "opening scroll anyway. Unfinished: " +
        (Object.keys(WEIGHTS) as Slice[]).filter((k) => slices[k] < 1).join(", ")
    );
    resolveReady();
  }, HARD_MS);
}
