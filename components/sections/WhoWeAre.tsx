"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/motion";

/**
 * "Who We Are" — the pale-fog statement section (mont-fort model). Continues
 * the into-the-fog cover's atmosphere: big statement top-right, WHO WE ARE
 * label + paragraph lower-left, six cloud plates split around the text in
 * z-order (two behind, two mid, two in FRONT so wisps pass over the words).
 *
 * Motion rules, the part that makes or breaks the feel:
 * - Text is NEVER scroll-scrubbed. Masked line reveals fire once; after
 *   entering, the text is completely stationary. No blur on text, ever.
 * - Clouds are the only scroll-linked motion: vertical parallax by depth
 *   across the section's travel, transform-only.
 * - Front layers alone get autonomous sine drift, independent of scroll.
 *
 * Absorbs the old Positioning statement (that section is deleted); the
 * bottom carries a 34vh gradient into the site's real paper token, so the
 * fog dissolves into the cream with no seam.
 *
 * NOTE for the client pass: "built exclusively for reverse" matches the
 * site's established claim ("done nothing but reverse since 2003") — confirm
 * with ARS that no non-reverse work exists before this ships beyond concept.
 */

const STATEMENT_LINES = [
  "Allegiant Reverse Services",
  "is a national title and",
  "settlement company built",
  "exclusively for reverse.",
];
const STATEMENT = STATEMENT_LINES.join(" ");

export default function WhoWeAre() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = el.querySelectorAll<HTMLElement>("[data-wwa-line]");
        const sidebar = el.querySelector<HTMLElement>("[data-wwa-sidebar]");
        const clouds = el.querySelectorAll<HTMLElement>("[data-wwa-cloud]");
        const front = el.querySelectorAll<HTMLElement>("[data-wwa-front]");
        const small = window.innerWidth < 640;

        // Text: masked line reveals, once. Stationary forever after.
        // fromTo, not set+to: the set+to pair left the tween inert while its
        // trigger fired (verified in-page); fromTo owns both ends atomically.
        gsap.fromTo(
          lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.05,
            ease: "power3.out",
            stagger: 0.09,
            immediateRender: true,
            scrollTrigger: { trigger: el.querySelector("h2"), start: "top 96%", once: true },
          }
        );
        if (sidebar) {
          gsap.fromTo(
            sidebar,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: "power2.out",
              scrollTrigger: { trigger: sidebar, start: "top 96%", once: true },
            }
          );
        }

        // The text container rides up slightly faster than the page — rising
        // through the fog. ±5vh only: more starts to feel scrubbed. The text
        // itself still travels with the document (no pin anywhere here).
        // ANCHOR. These windows used to be "top bottom" -> "bottom top" on
        // the SECTION, which quietly coupled the parallax to the section's
        // box height. When the box grew to 215vh (and moved 170vh up, so it
        // could sit behind the dissolving globe stage) the window went from
        // 245vh to 315vh AND began 170vh earlier — by the time the statement
        // was readable the scrub had already spent half its travel, and the
        // measured lift over 400px of scroll fell from 13px to 0.
        // The statement is the thing the motion is FOR, so it is the anchor,
        // and the window is stated in viewport heights rather than inherited
        // from a box that is free to change again.
        const anchor = el.querySelector<HTMLElement>("h2") ?? el;
        const window245 = {
          trigger: anchor,
          start: "top bottom",
          end: () => "+=" + window.innerHeight * 2.45,
          scrub: true,
          invalidateOnRefresh: true,
        } as const;

        const shell = el.querySelector<HTMLElement>(".wwa-shell");
        if (shell) {
          gsap.fromTo(
            shell,
            { y: () => window.innerHeight * 0.05 },
            {
              y: () => -window.innerHeight * 0.05,
              ease: "none",
              scrollTrigger: { ...window245 },
            }
          );
        }

        // Clouds: the ONLY other scroll-linked motion — parallax by depth.
        clouds.forEach((cloud) => {
          const depth = parseFloat(cloud.dataset.wwaCloud || "0");
          gsap.to(cloud, {
            y: () => -window.innerHeight * depth,
            ease: "none",
            scrollTrigger: { ...window245 },
          });
        });

        // Front layers alone drift — slow sine loops, independent of scroll.
        front.forEach((cloud, i) => {
          const amp = (small ? 9 : i === 0 ? 18 : 22) * (i === 0 ? 1 : -1);
          gsap.to(cloud, {
            xPercent: amp,
            duration: i === 0 ? 31 : 36,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      });
      // Reduced motion: no tweens are created — clouds sit at their authored
      // mid positions and the text is simply visible.
    }, el);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section ref={root} aria-label="Who we are" className="wwa relative overflow-hidden">
      {/* Back pair — behind the text */}
      <div data-wwa-cloud="0.06" className="wwa-cloud wwa-cloud-b1" aria-hidden />
      <div data-wwa-cloud="0.09" className="wwa-cloud wwa-cloud-b2" aria-hidden />
      <div data-wwa-cloud="0.16" className="wwa-cloud wwa-cloud-m1" aria-hidden />
      <div data-wwa-cloud="0.19" className="wwa-cloud wwa-cloud-m2" aria-hidden />

      <div className="wwa-shell">
        {/* Big statement, top-right. Real text for readers; the masked lines
            are presentation only. */}
        <h2 className="wwa-statement">
          <span className="sr-only">{STATEMENT}</span>
          <span aria-hidden>
            {STATEMENT_LINES.map((line) => (
              <span key={line} className="wwa-line-mask">
                <span data-wwa-line className="wwa-line">
                  {line}
                </span>
              </span>
            ))}
          </span>
        </h2>

        {/* Sidebar cluster, lower-left */}
        <div data-wwa-sidebar className="wwa-sidebar">
          <div className="wwa-label">
            <span className="wwa-rule" aria-hidden />
            <span>Who we are</span>
          </div>
          <p className="wwa-copy">
            We handle title, settlement, and curative work for reverse mortgage
            lenders across the country — the team lenders rely on to close
            transactions accurately, on time, every time. Since 2003.
          </p>
        </div>
      </div>

      {/* Front pair — wisps pass OVER the words */}
      <div data-wwa-cloud="0.30" data-wwa-front className="wwa-cloud wwa-cloud-f1" aria-hidden />
      <div data-wwa-cloud="0.34" data-wwa-front className="wwa-cloud wwa-cloud-f2" aria-hidden />

      {/* Dissolve into the paper — no seam, no white-out sheet. */}
      <div className="wwa-to-paper" aria-hidden />
    </section>
  );
}
