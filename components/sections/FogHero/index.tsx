"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { getLenis } from "@/lib/lenis";
import { useIsomorphicLayoutEffect } from "@/lib/motion";
import Hero from "@/components/sections/Hero";
import SiteIntro from "@/components/intro/SiteIntro";
import { whenLockupBuilt } from "@/lib/introState";
import {
  isReady,
  markGlobeUnavailable,
  onProgress,
  whenSiteReady,
  whenTexturesLoaded,
} from "@/lib/siteReady";
import { BEATS, CINEMA_MQ, COVER, COVER_VH, GLOBE_PIN_VH, TYPE_SWAP } from "@/lib/globe.config";

// The three/R3F chunk must never enter the initial bundle — the DOM fog owns
// the screen until the canvas reports a frame, and mobile never downloads it.
const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

/**
 * The site opening: first frame is the inside of the cloud layer, scrolling
 * plays a pinned pull-back (~380vh) that ends on the ignited US and hands off
 * to the paper site. Supersedes the type-only hero AND the coverage section —
 * the type hero is now the final beat's copy and the fallback below.
 *
 * Same architecture as DeskSequence: native `position: sticky` over a real
 * spacer, every value a pure function of window.scrollY — no ScrollTrigger
 * pin, no tweens on the scroll path (see the SMOOTHNESS note in the README).
 * Which layout shows is decided by CSS alone (media query), so the server
 * HTML is right on arrival; gsap.matchMedia gates the JS to the same query.
 *
 * The DOM fog IS the preloader: three blurred drift layers render instantly,
 * the canvas crossfades in underneath when its first frame is ready. WebGL
 * missing/lost or slow (>6s) parts the fog into the type-only hero instead.
 */

/** Scroll-cinema memory: this session has already watched the sequence, so a
    reload starts past it. (The lockup has no session memory — it is beat zero
    of the story, not a preloader, and always rebuilds at the top.) */
const SESSION_KEY = "ars-sequence-done";
const CANVAS_TIMEOUT_MS = 6000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Local progress inside [a,b], clamped. */
const span = (p: number, a: number, b: number) => clamp01((p - a) / Math.max(b - a, 1e-6));

// --ink and --paper, as channels, for the scrub-linked type swap.
const INK = [26, 26, 23];
const PAPER = [247, 245, 240];

export default function FogHero() {
  const stage = useRef<HTMLDivElement>(null);
  const fog = useRef<HTMLDivElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const cover = useRef(0);
  const played = useRef(false);
  const readyRef = useRef(false);

  // Canvas mounts only once the cinema query matches (mobile never pays for it);
  // `failed` is the one JS-decided path CSS can't express (WebGL probe/loss).
  const [mountCanvas, setMountCanvas] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Skip was pressed before the gate opened: the button holds a counter and
      completes itself on ready. It must never unlock scroll on its own. */
  const [skipPending, setSkipPending] = useState(false);
  const [skipPct, setSkipPct] = useState(0);
  const [parting, setParting] = useState(false);

  const fail = () => {
    // Release the gate first: there will be no globe and therefore no first
    // frame, so without this the page stays scroll-locked until the 20s
    // ceiling on any machine without WebGL2.
    markGlobeUnavailable();
    setParting(true); // the fog parts into the type hero — never a black hole
    setFailed(true);
  };

  /** Returning visitors this session start AT the landing frame — the full
      sequence plays once. Layout effect, so the jump lands before paint.

      Deep links are owned here too: Chrome DEFERS its own anchor scroll until
      layout settles and then smooth-scrolls, which the canvas boot (shader
      compile + texture upload) can interrupt mid-flight — stranding the visit
      in the fog. A hard jump before paint can't be interrupted. */
  useIsomorphicLayoutEffect(() => {
    if (!window.matchMedia(CINEMA_MQ).matches) return;

    // behavior: "instant" is load-bearing — the site sets scroll-behavior:
    // smooth, so a plain scrollTo would itself become an interruptible
    // animation (and Chrome's own deferred anchor scroll is one too).
    const hash = window.location.hash;
    if (hash && hash !== "#top") {
      const el = document.querySelector<HTMLElement>(hash);
      if (el) {
        played.current = true;
        sessionStorage.setItem(SESSION_KEY, "1"); // arrived below = pre-completed
        const mt = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - mt,
          behavior: "instant",
        });
      }
      return;
    }

    if (sessionStorage.getItem(SESSION_KEY)) {
      played.current = true;
      window.scrollTo({
        top: ((GLOBE_PIN_VH + COVER_VH) / 100) * window.innerHeight,
        behavior: "instant",
      });
    }
  }, []);

  useEffect(() => {
    if (failed) return;
    const el = stage.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(CINEMA_MQ, () => {
      // WebGL2 probe before paying for the chunk.
      let webgl2 = false;
      try {
        webgl2 = !!document.createElement("canvas").getContext("webgl2");
      } catch {
        /* probe failure = no WebGL */
      }
      if (!webgl2) {
        fail();
        return;
      }
      // Slow path: if the canvas hasn't produced a frame in 6s, stop waiting.
      // A hidden tab pauses the frameloop, so hidden time must not count —
      // opening the site in a background tab is not a WebGL failure. The
      // clock starts at the real MOUNT, not here: the mount is deferred
      // below, and the wait must not eat the budget.
      let slow = 0;
      const slowCheck = () => {
        if (readyRef.current) return;
        if (document.hidden) {
          slow = window.setTimeout(slowCheck, 2000);
          return;
        }
        fail();
      };

      let disposed = false;
      let mounted = false;
      const mountNow = () => {
        if (disposed || mounted) return;
        mounted = true;
        window.removeEventListener("scroll", mountNow);
        setMountCanvas(true);
        // The watchdog starts when the textures are IN, not when the canvas
        // mounts. Mounted-and-suspended is the normal state on a slow
        // connection; timing it from the mount meant these 6 seconds were
        // measuring the network, and on Slow 4G they expired every time and
        // swapped in the type hero on a machine whose WebGL was fine.
        void whenTexturesLoaded().then(() => {
          if (disposed || readyRef.current) return;
          slow = window.setTimeout(slowCheck, CANVAS_TIMEOUT_MS);
        });
      };

      // The globe's boot is ~700ms of main-thread work (shader compile, cloud
      // decode + upload, the data-map bake). Run concurrently with the
      // lockup's silk draw it froze a frame for 922ms. The globe is behind
      // dense fog for the whole opening, so nothing is lost by waiting for
      // the draw to finish — but the wait must never DELAY the boot for
      // someone already moving, so it ends on whichever comes first: the
      // draw completing, or the reader scrolling. Arriving deeper (deep
      // link, session jump) mounts immediately.
      if (window.scrollY > window.innerHeight / 2) mountNow();
      else {
        window.addEventListener("scroll", mountNow, { passive: true });
        whenLockupBuilt().then(mountNow);
      }

      let startY = 0;
      let total = 1; // the globe choreography's runway (progress 0..1)
      let coverPx = 1; // the into-the-fog cover appended after it
      const measure = () => {
        startY = el.parentElement!.getBoundingClientRect().top + window.scrollY;
        total = (GLOBE_PIN_VH / 100) * window.innerHeight;
        coverPx = (COVER_VH / 100) * window.innerHeight;
      };
      measure();

      const q = (sel: string) => el.querySelector<HTMLElement>(sel);
      const beats: Array<[HTMLElement | null, readonly number[]]> = [
        [q('[data-beat="lockup"]'), BEATS.lockup],
        [q('[data-beat="since"]'), BEATS.since],
        [q('[data-beat="closings"]'), BEATS.closings],
        [q('[data-beat="product"]'), BEATS.product],
        [q('[data-beat="states"]'), BEATS.states],
      ];
      const cue = q("[data-cue]");
      const skip = q("[data-skip]");
      const skipDark = q("[data-skip-dark]");
      const skipLight = q("[data-skip-light]");
      const beatsLayer = q("[data-beats]");
      const tint = q("[data-cover-tint]");
      const fillEl = q("[data-cover-fill]");
      const banks = [1, 2].map((n) => q(`[data-cover-bank="${n}"]`));

      /** In: mask-up. Out: dissolve (opacity + 6px blur), no movement. */
      const writeBeat = (beat: HTMLElement | null, [i0, i1, o0, o1]: readonly number[]) => {
        if (!beat) return;
        const p = progress.current;
        const tin = i1 > i0 ? span(p, i0, i1) : 1; // beat 1 reveals via CSS on load
        const tout = span(p, o0, o1);
        beat.style.opacity = (tin * (1 - tout)).toFixed(3);
        beat.style.filter = tout > 0.001 ? `blur(${(6 * tout).toFixed(2)}px)` : "none";
        const line = beat.querySelector<HTMLElement>(".beat-line");
        if (line && i1 > i0) line.style.transform = `translateY(${((1 - tin) * 110).toFixed(1)}%)`;
      };

      const render = () => {
        const p = clamp01((window.scrollY - startY) / total);
        progress.current = p;

        // Type swap: ink in the fog → paper for the descent onward. The flip
        // sits in the beat-1→beat-2 gap so no line is on screen while it runs.
        // The same k drives a soft dark halo behind the type — paper needs it
        // over the descent's mid-tone cloudscape, and it retires to nothing
        // when the type is ink on fog.
        const k = span(p, TYPE_SWAP.from, TYPE_SWAP.to);
        el.style.setProperty(
          "--beat-ink",
          `rgb(${Math.round(INK[0] + (PAPER[0] - INK[0]) * k)} ${Math.round(
            INK[1] + (PAPER[1] - INK[1]) * k
          )} ${Math.round(INK[2] + (PAPER[2] - INK[2]) * k)})`
        );
        el.style.setProperty("--beat-halo", (0.45 * k).toFixed(3));

        // Skip control rides the swap as an opacity cross-fade of two
        // solid-colour copies rather than an interpolated colour — so it is
        // always ink-on-light or paper-on-ink, never a mid-grey fill. Its own
        // steeper, slightly-later window keeps the 50/50 frame off the exact
        // scroll position where the ground is mid-grey; the contrasting halos
        // on each copy carry the brief crossover. (Its ground is the darkening
        // corner vignette, which passes through a mid value no single colour
        // can clear at 4.5:1 — the halos are the legibility floor there.)
        const ks = span(p, 0.15, 0.185);
        if (skipDark) skipDark.style.opacity = (1 - ks).toFixed(3);
        if (skipLight) skipLight.style.opacity = ks.toFixed(3);

        // Scrub-linked lateral on the DOM fog (time drift lives in CSS).
        if (fog.current) fog.current.style.transform = `translate3d(${(-48 * p).toFixed(1)}px,0,0)`;

        for (const [beat, win] of beats) writeBeat(beat, win);

        if (cue) cue.style.opacity = (1 - span(p, 0.02, 0.05)).toFixed(3);
        if (skip) {
          const gone = span(p, 0.88, 0.92);
          skip.style.opacity = (1 - gone).toFixed(3);
          skip.style.pointerEvents = gone >= 1 ? "none" : "auto";
        }

        if (p >= 0.99 && !played.current) {
          played.current = true;
          sessionStorage.setItem(SESSION_KEY, "1");
        }

        /* --- Into the fog: cloud banks cover the settled globe. ----------- */
        const cp = clamp01((window.scrollY - startY - total) / coverPx);
        cover.current = cp;
        // `end` lets a deck finish its travel before the cover does, so
        // "full cover by 0.70" is a construction rather than a tuning guess.
        const rise = (
          el: HTMLElement | null,
          d: { start: number; end: number; from: number; to: number; ease: number }
        ) => {
          if (!el) return;
          const y = d.from + (d.to - d.from) * Math.pow(span(cp, d.start, d.end), d.ease);
          el.style.transform = `translate3d(0, ${y.toFixed(2)}vh, 0)`;
        };
        banks.forEach((bank, i) => rise(bank, COVER.banks[i]));
        rise(fillEl, COVER.fill);
        if (tint) tint.style.opacity = span(cp, COVER.tint.from, COVER.tint.to).toFixed(3);
        // No text in the cover — the landing lockup clears as the banks rise.
        if (beatsLayer) {
          beatsLayer.style.opacity = (1 - span(cp, COVER.textOut.from, COVER.textOut.to)).toFixed(3);
        }
        // Hand off to Who We Are, which is laid out behind this stage. Once
        // the stage is fully out it is taken off the compositor entirely —
        // an opacity-0 WebGL canvas still costs a draw every frame.
        if (stage.current) {
          const out = span(cp, COVER.stageOut.from, COVER.stageOut.to);
          stage.current.style.opacity = (1 - out).toFixed(3);
          stage.current.style.visibility = out >= 1 ? "hidden" : "visible";
        }
        // The globe dims under the weather (the HQ marker rides this wrapper).
        if (canvasWrap.current) {
          canvasWrap.current.style.opacity = (
            1 - (1 - COVER.canvasDim) * span(cp, COVER.dim.from, COVER.dim.to)
          ).toFixed(3);
        }
      };

      render();
      gsap.ticker.add(render);
      const onResize = () => {
        measure();
        render();
      };
      window.addEventListener("resize", onResize);

      return () => {
        disposed = true;
        window.removeEventListener("scroll", mountNow);
        window.clearTimeout(slow);
        gsap.ticker.remove(render);
        window.removeEventListener("resize", onResize);
      };
    });

    return () => mm.revert();
  }, [failed]);
  // The dawn grade arrives from the scene each frame. The DOM stage takes
  // the SAME value, so when the canvas fades out at the end of the cover
  // there is no tonal step between it and what is behind it. Written
  // straight to style — this is on the scroll path, never state.
  useEffect(() => {
    if (!skipPending) return;
    return onProgress((p) => setSkipPct(Math.floor(p * 100)));
  }, [skipPending]);

  const onSky = useCallback((css: string) => {
    if (stage.current) stage.current.style.backgroundColor = css;
  }, []);


  const onCanvasReady = () => {
    readyRef.current = true;
    const f = fog.current;
    if (!f) return;
    if (progress.current > 0.12) {
      // Already scrolled past fog depth — cut in at the current scrub position.
      f.style.display = "none";
    } else {
      // Both layers are soft fog-white — the 0.8s swap is invisible.
      f.style.transition = "opacity 0.8s ease";
      f.style.opacity = "0";
      window.setTimeout(() => {
        f.style.display = "none";
      }, 900);
    }
  };

  const runSkip = () => {
    played.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    const target =
      (stage.current?.parentElement?.getBoundingClientRect().top ?? 0) +
      window.scrollY +
      ((GLOBE_PIN_VH + COVER_VH) / 100) * window.innerHeight;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.2 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  /** Skipping while the gate is shut would land the reader on the empty
      background this whole gate exists to prevent. Instead the button takes
      the counter and fires itself the moment the globe can draw. */
  const skipIntro = () => {
    if (isReady()) {
      runSkip();
      return;
    }
    if (skipPending) return;
    setSkipPending(true);
    whenSiteReady().then(runSkip);
  };

  // WebGL failed or was lost: the fog parts into the type-only hero.
  if (failed) {
    return (
      <div id="top" className="relative">
        <Hero />
        {parting && (
          <div className="fog-part" aria-hidden onAnimationEnd={() => setParting(false)} />
        )}
      </div>
    );
  }

  return (
    <div id="top">
      {/* ---- Cinema (desktop, fine pointer, motion allowed) ---------------- */}
      <section className="fog-cinema relative" aria-label="Allegiant Reverse Services — nationwide title and settlement, in reverse since 2003">
        <div ref={stage} className="fog-stage grain sticky top-0 h-screen w-full overflow-hidden">
          {/* Wrapper so the cover phase can dim the whole globe (the HQ
              marker portal rides it too). */}
          <div ref={canvasWrap} className="absolute inset-0">
            {mountCanvas && (
              <GlobeCanvas
                    progress={progress}
                    cover={cover}
                    onReady={onCanvasReady}
                    onSky={onSky}
                    onContextLost={fail}
                  />
            )}
          </div>

          {/* Vignette over the canvas — the globe floats, no starfield. */}
          <div className="hero-vignette" aria-hidden />

          {/* Into-the-fog cover. Deepest deck first so the lead silhouette
              sits in front: deep → mid → the committing mass → lead. Each
              deck rises at its own rate (that difference IS the depth), and
              only the lead carries the autonomous drift. */}
          {/* Each deck is ONE pre-blurred sprite (scripts/bake-fog.mjs). The
              puffs, their tonal spread and the irregular crown line are all
              painted into the texture: the density ramp survives, the eleven
              live blur(24–70px) rasters that froze the renderer do not.
              Nothing here animates but transform and opacity. */}
          <div data-cover-bank="2" className="cover-group" aria-hidden style={{ transform: "translate3d(0,116vh,0)" }}>
            <span className="cover-deck-sprite cover-deck-back" />
          </div>
          <div data-cover-fill className="cover-fill" aria-hidden style={{ transform: "translate3d(0,128vh,0)" }} />
          <div data-cover-bank="1" className="cover-group" aria-hidden style={{ transform: "translate3d(0,108vh,0)" }}>
            <div className="cover-drift">
              <span className="cover-deck-sprite cover-deck-front" />
            </div>
          </div>
          <div data-cover-tint className="cover-tint" aria-hidden style={{ opacity: 0 }} />

          {/* DOM fog — the designed first frame, and the preloader. Oversized
              so the scrub-linked lateral never reveals an edge. */}
          <div ref={fog} className="fog-wrap absolute -inset-[8%]" aria-hidden>
            <div className="fog-blob fog-blob-1" />
            <div className="fog-blob fog-blob-2" />
            <div className="fog-blob fog-blob-3" />
          </div>

          {/* First focusable element in the sequence — keyboard users are two
              keys from the content.

              The control is on screen for the whole sequence, so its ground
              travels from the light preloader fog to ink space. A single colour
              (the old var(--beat-ink)) passed through a mid-grey at the swap and
              measured 1.03:1 mid-scroll. Two stacked copies — ink and paper —
              cross-fade on the same k that drives the type swap: dark on the
              light fog, light on the ink. Neither frame is ever mid-grey. */}
          <button
            type="button"
            data-skip
            onClick={skipIntro}
            aria-live="polite"
            className="absolute bottom-6 right-6 z-10 grid font-mono text-eyebrow uppercase tracking-[0.14em]"
          >
            <span
              data-skip-dark
              className="col-start-1 row-start-1 text-ink"
              style={{ textShadow: "0 0 8px rgb(231 234 236 / 0.9), 0 1px 2px rgb(231 234 236 / 0.75)" }}
            >
              {skipPending ? `Loading ${String(skipPct).padStart(2, "0")}%` : "Skip intro ↓"}
            </span>
            <span
              data-skip-light
              aria-hidden
              className="col-start-1 row-start-1 text-paper"
              style={{ opacity: 0, textShadow: "0 0 10px rgb(11 11 9 / 0.9), 0 1px 3px rgb(11 11 9 / 0.75)" }}
            >
              {skipPending ? `Loading ${String(skipPct).padStart(2, "0")}%` : "Skip intro ↓"}
            </span>
          </button>

          {/* Text beats — lower-third, left on the content grid, one at a time.
              Everything is pointer-events-none: the sequence never intercepts
              the scroll. */}
          <div data-beats className="pointer-events-none absolute inset-x-0 bottom-[14vh] z-[5]">
            <div className="shell grid">
              {/* Beat 0 — the brand lockup (mont-fort model): builds on load,
                  dissolves on scroll, always returns on scrub-back. */}
              <SiteIntro />

              <p data-beat="since" className="beat col-start-1 row-start-1" style={{ opacity: 0 }}>
                <span className="beat-mask">
                  <span className="beat-line">Since 2003.</span>
                </span>
              </p>
              <p data-beat="closings" className="beat col-start-1 row-start-1" style={{ opacity: 0 }}>
                <span className="beat-mask">
                  {/* Was "130,000+ closings." — unsourced against ARS, so cut.
                      This beat keeps its timing slot with a verified line that
                      does not repeat the "Since 2003." beat above. */}
                  <span className="beat-line">Nothing but reverse.</span>
                </span>
              </p>
              <p data-beat="product" className="beat col-start-1 row-start-1" style={{ opacity: 0 }}>
                <span className="beat-mask">
                  <span className="beat-line">One product. Every detail.</span>
                </span>
              </p>
              <p data-beat="states" className="beat col-start-1 row-start-1 text-paper" style={{ opacity: 0 }}>
                <span className="beat-mask">
                  <span className="beat-line">Nationwide.</span>
                </span>
              </p>

              {/* Landing — a quiet factual lockup, not a slogan billboard:
                  the globe is the proof of scale. GlobeScene toggles
                  .show/.foil; the foil pass on "One standard." is the one
                  place gold touches type. */}
              <div id="hero-landing" className="col-start-1 row-start-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[#8fa3b8]">
                  Licensed coast to coast&nbsp;&nbsp;·&nbsp;&nbsp;HQ — California
                </p>
                <h1 className="mt-4 font-display text-[clamp(26px,2.6vw,38px)] font-normal leading-snug text-paper">
                  Every state. <span className="foil-word">One standard.</span>
                </h1>
                <p className="cue mt-8 font-mono text-eyebrow uppercase tracking-[0.35em] text-paper/60">
                  Scroll
                </p>
              </div>
            </div>
          </div>

          {/* Phase-0 cue, gone by the first flick. */}
          <p
            data-cue
            className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-eyebrow uppercase tracking-[0.35em] text-[color:var(--beat-ink)]"
            aria-hidden
          >
            Scroll
          </p>
        </div>

        {/* The scroll runway: globe choreography + the into-the-fog cover. */}
        <div style={{ height: `${GLOBE_PIN_VH + COVER_VH}vh` }} aria-hidden />
      </section>

      {/* ---- Fallback (mobile, touch, reduced motion — and no-JS) ----------
          The cinema above carries the page's single <h1>; this fallback (still
          in the DOM, CSS-hidden on desktop) renders its headline as a <p> so
          there is exactly one h1 in the source. The WebGL-failure branch below
          renders <Hero/> with its default as="h1", since the cinema is gone. */}
      <div className="fog-fallback">
        <Hero as="p" />
      </div>
    </div>
  );
}
