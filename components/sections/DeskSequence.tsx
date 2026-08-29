"use client";

import { useCallback, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import Eyebrow from "@/components/ui/Eyebrow";
import { clsx } from "@/lib/clsx";
import { getLenis } from "@/lib/lenis";
import { useIsomorphicLayoutEffect } from "@/lib/motion";
import { archivalSrc, duotoneSrc, fullName, portraitAlt, team } from "@/lib/team";

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

const STOPS = [
  {
    year: "2003",
    text: "The team goes all-in on reverse. Years before ARS existed, its founders specialized in one product and never left it.",
  },
  {
    year: "2016",
    text: "Rob Awalt founds Allegiant Reverse Services in Roseville, California — a title company built only for reverse, launched with a team that had already been doing it for over a decade.",
  },
  {
    year: "2020",
    text: "Rob joins the NRMLA board; ARS leadership now sits on the industry's governing bodies.",
  },
  {
    year: "Today",
    text: "130,000+ closings across 48 states, backed by Stewart Title. Still counting.",
  },
];

const CAPTION_A = "Rob Awalt · Founder";
const CAPTION_B = "Seven names you'll actually talk to ↓";

const N = team.length;
const PAD = (n: number) => String(n + 1).padStart(2, "0");
const COUNT = String(N).padStart(2, "0");

/* -------------------------------------------------------------------------- */
/* Maths                                                                       */
/* -------------------------------------------------------------------------- */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Local progress inside [a,b], clamped. */
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Two curves per handoff, because the photograph and the words want opposite
 * treatments — this is measured off the reference, not guessed.
 *
 * Aventura's reveal runs a clip linearly across its whole ~660px cycle: the
 * photo is essentially always in motion, back to back, with no dwell. That
 * slowness is what makes it read as clean. An earlier build here compressed the
 * wipe into 45% of a 502px segment — roughly three times faster — and padded
 * the rest with dead time, which is what "too fast" was describing.
 *
 * The text does the opposite: it hands over quickly (~15% each way) and then
 * sits still, so a name is never smeared across the whole segment.
 */
const photoCurve = (t: number) => t;
const textOut = (t: number) => 1 - clamp01((t - 0.34) / 0.12);
const textIn = (t: number) => clamp01((t - 0.48) / 0.12);

/**
 * The reveal, as a soft-edged mask rather than a hard clip.
 *
 * A hard clip edge splices two faces together, and because the motion is
 * scroll-linked the reader can sit on that frame for as long as they like
 * instead of it flashing past inside a fixed-duration tween. A 12% feather
 * turns the seam into a dissolve band travelling down the plate.
 */
const setWipe = (el: HTMLElement, t: number) => {
  if (t >= 1) {
    el.style.maskImage = "none";
    el.style.webkitMaskImage = "none";
    return;
  }
  const edge = t * 112 - 12;
  const g = `linear-gradient(to bottom, #000 ${edge.toFixed(2)}%, rgba(0,0,0,0) ${(edge + 12).toFixed(2)}%)`;
  el.style.maskImage = g;
  el.style.webkitMaskImage = g;
};

/** Scroll distance for one portrait handoff — the reference spends ~660px. */
const HANDOFF_VH = 0.73;

/** The anchor is exactly this fraction of the full frame, so growth is uniform. */
const ANCHOR_SCALE = 0.28;

/**
 * Timeline → Growth → Desk, as one sticky sequence on one scroll-linked
 * progress value.
 *
 * Architecturally this is the reference (aventuradentalarts.com) rather than a
 * ScrollTrigger pin: a `position: sticky` stage over a real spacer, with every
 * animated value a pure function of scroll position. The consolidated patch
 * specified `pin` + `end: '+='` + `snapTo`, but the JS pin is what made the
 * previous build feel unsmooth — it writes a transform every frame, a frame
 * behind Lenis. The phase map and the snapping below are the same behaviour
 * without that cost; snapping is driven through Lenis directly.
 *
 * Phase boundaries are derived from the real pixel budget rather than the
 * tabulated fractions, because the two disagreed: the table's 0.30 horizontal
 * would have scrubbed ~850px of track across ~1500px of scroll. Deriving them
 * keeps the track at 1:1 with the wheel and every phase paying rent.
 */
export default function DeskSequence() {
  return (
    <section id="people" className="scroll-mt-24 border-t border-rule">
      <PinnedSequence />
      <StackedSequence />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop                                                                     */
/* -------------------------------------------------------------------------- */

function PinnedSequence() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const anchorImg = useRef<HTMLImageElement>(null);
  const capA = useRef<HTMLSpanElement>(null);
  const capB = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const scalers = useRef<(HTMLDivElement | null)[]>([]);
  const archivals = useRef<(HTMLImageElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);

  const posRef = useRef(0);
  const override = useRef<number | null>(null);
  const easingBack = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        let startY = 0;
        let total = 1;
        let move = 0;
        let phase = { horiz: 0.3, settle: 0.34, growth: 0.5 };
        let anchorRect = { x: 0, y: 0 };

        /**
         * One measurement pass. The anchor is static, so this is a handful of
         * rect reads — no landed-track measurement needed.
         */
        const measure = () => {
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          startY = el.getBoundingClientRect().top + window.scrollY;

          // Horizontal travel: the TODAY column's right edge lands 4vw short of
          // the anchor matte's left edge, so the timeline arrives at Rob and no
          // column ever rests beneath the matte.
          const t = track.current;
          const a = anchor.current;
          if (t && a) {
            const prev = t.style.transform;
            t.style.transform = "none";
            const tr = t.getBoundingClientRect();
            const ar = a.getBoundingClientRect();
            move = Math.max(0, tr.right - (ar.left - 0.04 * vw));
            t.style.transform = prev;
          }

          // Where the big frame has to start so it sits exactly over the
          // anchor's image. Frame origin is the stage's top-left.
          const ai = anchorImg.current;
          const st = stage.current;
          if (ai && st) {
            // Relative to the stage: measure() can run while the section is
            // still far below the fold, when viewport coords mean nothing.
            const r = ai.getBoundingClientRect();
            const sr = st.getBoundingClientRect();
            anchorRect = { x: r.left - sr.left, y: r.top - sr.top };
          }

          // Length budget: travel + settle + growth + the handoffs. The desk act
          // also carries a leading dwell on person 1 (13% of it), so the six
          // handoffs themselves land at HANDOFF_VH each.
          const deskPx = ((N - 1) * HANDOFF_VH * vh) / 0.87;
          const px = move + 0.15 * vh + 0.7 * vh + deskPx;
          total = Math.max(1, px);
          if (spacer.current) spacer.current.style.height = `${px}px`;

          // Phases derived from that budget, so each one is paid for in pixels.
          phase = {
            horiz: move / px,
            settle: (move + 0.15 * vh) / px,
            growth: (move + 0.15 * vh + 0.7 * vh) / px,
          };
        };

        measure();

        let lastActive = -1;

        const render = () => {
          const p = clamp01((window.scrollY - startY) / total);

          /* --- Act 1: the track ------------------------------------------- */
          const h = span(p, 0, phase.horiz);
          if (track.current) {
            track.current.style.transform = `translate3d(${(-move * h).toFixed(2)}px,0,0)`;
          }

          /* --- Act 1→2: caption crossfade at the settle -------------------- */
          // Out just before the settle ends, in just after — never both.
          const sLen = phase.settle - phase.horiz;
          const outA = 1 - span(p, phase.horiz + sLen * 0.1, phase.horiz + sLen * 0.25);
          const inB = span(p, phase.horiz + sLen * 0.5, phase.horiz + sLen * 0.75);
          if (capA.current) capA.current.style.opacity = outA.toFixed(3);
          if (capB.current) capB.current.style.opacity = inB.toFixed(3);

          /* --- Act 2: growth ------------------------------------------------ */
          const g = span(p, phase.settle, phase.growth);
          const grown = power2InOut(g);
          const growing = p >= phase.settle && p < phase.growth;

          // Instant swap: identical crop, so the seam is invisible.
          if (anchorImg.current) {
            anchorImg.current.style.opacity = p >= phase.settle ? "0" : "1";
          }
          if (anchor.current) {
            const mount = 1 - span(p, phase.settle, phase.settle + (phase.growth - phase.settle) * 0.15);
            anchor.current.style.opacity = mount.toFixed(3);
            anchor.current.style.pointerEvents = p >= phase.settle ? "none" : "auto";
          }
          if (frame.current) {
            const s = ANCHOR_SCALE + (1 - ANCHOR_SCALE) * grown;
            const x = anchorRect.x * (1 - grown);
            const y = anchorRect.y * (1 - grown);
            frame.current.style.opacity = p >= phase.settle ? "1" : "0";
            frame.current.style.transform =
              `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
            frame.current.style.willChange = growing ? "transform" : "auto";
          }

          // Timeline head, rule and track clear out over the first third.
          const outHead = span(p, phase.settle, phase.settle + (phase.growth - phase.settle) / 3);
          for (const r of [head.current, rule.current, track.current]) {
            if (!r) continue;
            r.style.opacity = (1 - outHead).toFixed(3);
            if (r !== track.current) r.style.transform = `translateY(${(-16 * outHead).toFixed(2)}px)`;
          }
          if (track.current) {
            track.current.style.transform =
              `translate3d(${(-move * h).toFixed(2)}px, ${(-16 * outHead).toFixed(2)}px, 0)`;
          }

          // Plate hairline and the ledger card compose in over the final third.
          const composeStart = phase.growth - (phase.growth - phase.settle) / 3;
          const compose = span(p, composeStart, phase.growth);
          if (plate.current) plate.current.style.opacity = compose.toFixed(3);
          if (card.current) {
            const rows = card.current.querySelectorAll<HTMLElement>("[data-compose]");
            rows.forEach((r, k) => {
              const off = k * 0.12; // stagger, in units of the compose window
              const c = clamp01((compose - off) / (1 - off));
              r.style.opacity = c.toFixed(3);
              r.style.transform = `translateY(${(10 * (1 - c)).toFixed(2)}px)`;
            });
          }

          /* --- Act 3: the seven ------------------------------------------- */
          // Person 1 dwells through the growth; the handoffs start after it.
          const deskP = span(p, phase.growth + (1 - phase.growth) * 0.13, 1);
          const scrollRaw = deskP * (N - 1);
          // Scroll tracks exactly — the position must be a pure function of
          // scrollY, not a lagged one, or the same scroll position renders
          // differently depending on which way you arrived. The easing exists
          // only to glide back after a hover override releases.
          if (override.current !== null) {
            easingBack.current = true;
            posRef.current += (override.current - posRef.current) * 0.2;
          } else if (easingBack.current) {
            posRef.current += (scrollRaw - posRef.current) * 0.2;
            if (Math.abs(posRef.current - scrollRaw) < 0.002) {
              posRef.current = scrollRaw;
              easingBack.current = false;
            }
          } else {
            posRef.current = scrollRaw;
          }

          const raw = posRef.current;
          const base = Math.min(N - 2, Math.floor(raw));
          const local = raw - base;
          const t = photoCurve(local);
          const incoming = base + 1;

          for (let i = 0; i < N; i++) {
            const layer = layers.current[i];
            const scaler = scalers.current[i];
            const arch = archivals.current[i];
            const block = blocks.current[i];
            if (!layer || !scaler || !arch || !block) continue;

            if (i === base) {
              layer.style.opacity = "1";
              layer.style.zIndex = "1";
              setWipe(layer, 1);
              scaler.style.transform = "scale(1)";
              // Rob's colour arrives once, mid-growth. Person 1's segment must
              // not fade it in a second time.
              arch.style.opacity = i === 0 ? smooth(span(p, phase.settle + (phase.growth - phase.settle) * 0.25, phase.growth)).toFixed(3) : "1";
            } else if (i === incoming) {
              layer.style.opacity = "1";
              layer.style.zIndex = "2";
              setWipe(layer, t);
              scaler.style.transform = `scale(${(1.04 - 0.04 * t).toFixed(4)})`;
              arch.style.opacity = clamp01((t - 0.15) / 0.6).toFixed(3);
            } else {
              layer.style.opacity = "0";
              layer.style.zIndex = "0";
            }

            let o = 0, y = 12;
            if (i === base) { o = textOut(local); y = -6 * (1 - o); }
            else if (i === incoming) { o = textIn(local); y = 12 * (1 - o); }
            block.style.opacity = o.toFixed(3);
            block.style.transform = `translateY(${y.toFixed(2)}px)`;
          }

          const nextActive = override.current ?? (local >= 0.5 ? incoming : base);
          if (nextActive !== lastActive) {
            lastActive = nextActive;
            setActiveIndex(nextActive);
          }
        };

        /* --- Phase-aware snapping ------------------------------------------ */
        // Free scrubbing through the timeline act; past it, rest on a phase
        // boundary or a dwell centre so a wheel tick can never leave you
        // stranded mid-growth.
        const stops = () => {
          const out = [phase.settle, phase.growth];
          const deskStart = phase.growth + (1 - phase.growth) * 0.13;
          for (let i = 0; i < N; i++) out.push(deskStart + ((1 - deskStart) * i) / (N - 1));
          out.push(1);
          return out;
        };

        let idle: ReturnType<typeof setTimeout> | null = null;
        let snapping = false;

        const onScroll = () => {
          if (snapping) return;
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => {
            const p = clamp01((window.scrollY - startY) / total);
            if (p <= phase.horiz || p >= 0.999) return; // free zone / done
            const near = stops().reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
            const dy = (near - p) * total;
            if (Math.abs(dy) < 2) return;
            const lenis = getLenis();
            const duration = Math.min(0.6, Math.max(0.25, Math.abs(dy) / 900));
            snapping = true;
            const done = () => { snapping = false; };
            if (lenis) {
              lenis.scrollTo(startY + near * total, {
                duration,
                easing: power2InOut,
                onComplete: done,
              });
            } else {
              window.scrollTo({ top: startY + near * total, behavior: "smooth" });
              setTimeout(done, duration * 1000);
            }
          }, 150);
        };

        gsap.ticker.add(render);
        window.addEventListener("scroll", onScroll, { passive: true });
        const onResize = () => { measure(); render(); };
        window.addEventListener("resize", onResize);
        document.fonts?.ready.then(onResize);

        return () => {
          gsap.ticker.remove(render);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
          if (idle) clearTimeout(idle);
        };
      });
    }, root);

    return () => ctx.revert();
  }, []);

  /* Warm every layer before the section can be reached ---------------------- */
  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(min-width: 1024px)").matches) return;
    let done = false;
    const warm = () => {
      if (done) return;
      done = true;
      for (const p of team) {
        for (const src of [duotoneSrc(p), archivalSrc(p)]) {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
        }
      }
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && warm(), {
      rootMargin: "150% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onRosterKeyDown = useCallback((e: React.KeyboardEvent<HTMLOListElement>) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const from = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (from === -1) return;
    e.preventDefault();
    const to =
      e.key === "Home" ? 0
      : e.key === "End" ? buttons.length - 1
      : e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (from + 1) % buttons.length
        : (from - 1 + buttons.length) % buttons.length;
    buttons[to].focus();
  }, []);

  const hold = (i: number) => { override.current = i; setActiveIndex(i); };
  const release = () => { override.current = null; };

  const rob = team[0];

  return (
    <div ref={root} className="desk-pinned relative">
      <div ref={stage} className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ---- Act 1: the timeline ------------------------------------- */}
        <div ref={head} className="shell absolute inset-x-0 top-[18vh] z-10">
          <Eyebrow>In reverse since 2003</Eyebrow>
          <h2 className="mt-6 max-w-measure font-display text-display-2">
            Twenty-three years on one product.
          </h2>
        </div>

        <div
          ref={rule}
          aria-hidden
          className="absolute inset-x-0 top-[46vh] z-0 h-px bg-rule"
        />

        <ol
          ref={track}
          className="absolute left-0 top-[46vh] z-0 flex w-max pl-12 will-change-transform"
        >
          {STOPS.map((s) => (
            <li key={s.year} className="w-[26rem] shrink-0 pr-16 pt-8 last:w-[22rem] last:pr-0">
              <p className="font-mono text-eyebrow-control uppercase text-stamp">
                {s.year}
              </p>
              <p className="mt-4 max-w-[34ch] text-lede leading-snug">{s.text}</p>
            </li>
          ))}
        </ol>

        {/* ---- The anchored portrait ----------------------------------- */}
        {/* Mounted print: paper matte, hairline border, sitting above the
            track so the years slide beneath it. */}
        <div
          ref={anchor}
          className="absolute right-[8vw] top-1/2 z-20 -translate-y-1/2 border border-rule bg-paper p-[10px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={anchorImg}
            src={duotoneSrc(rob)}
            alt={portraitAlt(rob)}
            loading="lazy"
            decoding="async"
            className="block border border-rule object-cover"
            style={{ width: `${44 * ANCHOR_SCALE}vw`, height: `${100 * ANCHOR_SCALE}vh` }}
          />
          {/* Captions hang off the print's right edge rather than sitting inside
              the matte: the second one is far wider than the image, and by the
              time it appears the track has landed clear of the anchor, so there
              is nothing but paper to its left. */}
          <span className="absolute right-0 top-full mt-3 block h-[1.2em] whitespace-nowrap text-right font-mono text-eyebrow-control uppercase text-muted">
            <span ref={capA} className="absolute right-0 top-0">{CAPTION_A}</span>
            <span ref={capB} className="absolute right-0 top-0 opacity-0">{CAPTION_B}</span>
          </span>
        </div>

        {/* ---- Acts 2+3: the full frame -------------------------------- */}
        <div
          ref={frame}
          data-desk-frame
          className="absolute left-0 top-0 z-30 h-full w-[44vw] origin-top-left overflow-hidden bg-ink opacity-0"
        >
          {team.map((p, i) => (
            <div
              key={p.id}
              ref={(n) => { layers.current[i] = n; }}
              className="absolute inset-0 will-change-[mask-image,opacity]"
              style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 1 : 0 }}
            >
              <div ref={(n) => { scalers.current[i] = n; }} className="absolute inset-0 will-change-transform">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={duotoneSrc(p)}
                  // Decorative here: this crossfading stack is the visual layer,
                  // and the sr-only roster <ol> already names every person.
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={(n) => { archivals.current[i] = n; }}
                  src={archivalSrc(p)}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: 0 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          ref={plate}
          aria-hidden
          className="absolute inset-y-0 left-[calc(44vw+2px)] z-30 w-px bg-rule opacity-0"
        />

        {/* ---- The ledger card ----------------------------------------- */}
        <div
          ref={card}
          data-desk-card
          className="absolute inset-y-0 left-[44vw] right-0 z-30 flex flex-col justify-between pb-[max(5vh,2.25rem)] pl-[6vw] pr-[4vw] pt-[max(9vh,5rem)]"
        >
          <div className="w-full max-w-[40rem]">
            <div data-compose className="flex items-baseline justify-between border-b border-rule pb-4 opacity-0">
              <Eyebrow as="span">The desk</Eyebrow>
              <span aria-hidden className="tabular font-mono text-eyebrow-control text-muted">
                {PAD(activeIndex)} / {COUNT}
              </span>
            </div>

            <div data-compose className="mt-6 grid opacity-0">
              {team.map((p, i) => (
                <div
                  key={p.id}
                  ref={(n) => { blocks.current[i] = n; }}
                  aria-hidden
                  className="col-start-1 row-start-1 will-change-[opacity,transform]"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  {/* Not a heading: the whole block is aria-hidden and the real
                      roster headings live in the sr-only <ol> below. A <div>
                      keeps this out of the source heading tree entirely. */}
                  <div
                    data-name-block
                    className="font-display leading-[0.92] tracking-[-0.03em] text-ink [overflow-wrap:anywhere]"
                    style={{ fontSize: "clamp(3rem, 5vw, 5.5rem)" }}
                  >
                    <span className="block">{p.first}</span>
                    <span className="block">{p.last}</span>
                  </div>
                  <div className="mt-5">
                    <p
                      className={clsx(
                        "font-mono text-eyebrow-control uppercase",
                        p.tenureAccent ? "text-stamp" : "text-muted"
                      )}
                    >
                      {p.tenureTag}
                    </p>
                    <p className="mt-3 text-[1.05rem] font-semibold text-ink">{p.title}</p>
                    <p className="mt-4 max-w-[38ch] text-[0.95rem] leading-[1.55] text-muted">{p.bio}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* The semantic roster: a complete, navigable list of the seven,
                lives once here inside the pinned layout (which CSS hides on
                mobile, where the stacked layout below carries the real
                headings). The visual name blocks above are aria-hidden, so
                this is the single heading source for a desktop screen reader —
                replacing the old aria-live region that re-announced on every
                scroll tick. */}
            <ol className="sr-only">
              {team.map((p) => (
                <li key={p.id} id={`person-${p.id}`}>
                  <h3>{fullName(p)}</h3>
                  <p>
                    {p.title}. {p.tenureTag}. {p.bio}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="w-full max-w-[40rem]">
            <ol
              data-compose
              onKeyDown={onRosterKeyDown}
              onMouseLeave={release}
              className="border-t border-rule pt-4 opacity-0"
            >
              {team.map((p, i) => {
                const on = i === activeIndex;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-current={on ? "true" : undefined}
                      aria-controls={`person-${p.id}`}
                      onMouseEnter={() => hold(i)}
                      onFocus={() => hold(i)}
                      onBlur={release}
                      onClick={() => hold(i)}
                      className="group relative flex w-full items-baseline gap-4 py-[0.22rem] pl-7 text-left leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp [@media(max-height:840px)]:py-[0.1rem]"
                    >
                      <span
                        aria-hidden
                        className={clsx(
                          "absolute left-0 top-1/2 h-px w-4 origin-left -translate-y-1/2 bg-stamp",
                          "transition-transform duration-300 ease-settle",
                          on ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                      <span
                        aria-hidden
                        className={clsx(
                          "tabular w-6 shrink-0 font-mono text-eyebrow-data transition-colors duration-300 ease-settle",
                          on ? "text-stamp" : "text-muted"
                        )}
                      >
                        {PAD(i)}
                      </span>
                      <span
                        className={clsx(
                          "text-[1rem] font-medium transition-colors duration-300 ease-settle",
                          on ? "text-ink" : "text-muted group-hover:text-ink"
                        )}
                      >
                        {fullName(p)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p data-compose className="mt-4 border-t border-rule pt-4 font-mono text-eyebrow-control uppercase leading-relaxed text-muted opacity-0">
              In reverse <span className="text-ink">since 2003</span> — same team, same product.
            </p>
          </div>
        </div>
      </div>

      {/* Scroll length, set by measurement. The fallback keeps the section
          usable before the first measure and with JS disabled. */}
      <div ref={spacer} aria-hidden style={{ height: "500vh" }} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile + reduced motion                                                     */
/* -------------------------------------------------------------------------- */

function StackedSequence() {
  const rob = team[0];
  return (
    <div className="desk-stack shell py-24">
      <Eyebrow>In reverse since 2003</Eyebrow>
      <h2 className="mt-6 max-w-measure font-display text-display-2">
        Twenty-three years on one product.
      </h2>

      <ol className="mt-12 space-y-10">
        {STOPS.map((s) => (
          <li key={s.year} className="border-l border-rule pl-6">
            <p className="font-mono text-eyebrow-control uppercase text-stamp">{s.year}</p>
            <p className="mt-3 max-w-[34ch] text-lede leading-snug">{s.text}</p>
          </li>
        ))}
      </ol>

      {/* The anchor, once, as a static mounted print between the two acts. */}
      <figure className="mt-16 border border-rule bg-paper p-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={archivalSrc(rob)}
          alt={portraitAlt(rob)}
          loading="lazy"
          decoding="async"
          className="block aspect-[4/5] w-full border border-rule object-cover"
        />
        <figcaption className="mt-3 font-mono text-eyebrow-control uppercase leading-relaxed text-muted">
          {CAPTION_A}
          <br />
          {CAPTION_B}
        </figcaption>
      </figure>

      <ol className="mt-16 space-y-16">
        {team.map((p) => (
          <li key={p.id}>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={archivalSrc(p)}
                alt={portraitAlt(p)}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mt-6 font-display text-display-3 leading-[0.95] [overflow-wrap:anywhere]">
              {p.first}
              <br />
              {p.last}
            </h3>
            <p
              className={clsx(
                "mt-4 font-mono text-eyebrow-control uppercase",
                p.tenureAccent ? "text-stamp" : "text-muted"
              )}
            >
              {p.tenureTag}
            </p>
            <p className="mt-3 font-semibold">{p.title}</p>
            <p className="mt-4 leading-relaxed text-muted">{p.bio}</p>
          </li>
        ))}
      </ol>

      <p className="mt-16 border-t border-rule pt-5 font-mono text-eyebrow-control uppercase leading-relaxed text-muted">
        In reverse <span className="text-ink">since 2003</span> — same team, same product.
      </p>
    </div>
  );
}
