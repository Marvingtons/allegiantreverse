"use client";

import CountUp from "@/components/ui/CountUp";
import RevealLines from "@/components/ui/RevealLines";

/**
 * Type only. No image, no video, no preloader.
 *
 * Now the FALLBACK hero: FogHero renders this for touch, small viewports,
 * reduced motion, no-JS, and any WebGL failure. (`id="top"` lives on the
 * FogHero wrapper, which always contains whichever hero is showing.)
 *
 * Load sequence, under 2s end to end: the headline reveals line by line
 * (1.1s, power3.out, 0.08s stagger), then the three stats count. Nothing blocks
 * first paint — the headline and the final stat values are in the server HTML.
 */
/**
 * `as` controls the headline's element. When the cinema is present in the DOM
 * (mobile hides it with CSS, but it still carries the page's single <h1>), this
 * fallback renders its headline as a <p> so the document has exactly one h1.
 * On the WebGL-failure branch the cinema is not rendered at all, so FogHero
 * passes as="h1" to make this the page heading.
 */
export default function Hero({ as = "h1" }: { as?: "h1" | "p" }) {
  return (
    <section className="grain relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-16 pt-32 md:pb-20">
      <div className="shell">
        <RevealLines
          as={as}
          trigger="load"
          delay={0.15}
          className="font-display text-display-1 font-normal"
          lines={[
            "Reverse,",
            <>
              done <span className="text-stamp">right</span>.
            </>,
          ]}
        />

        {/* Only verified claims live here now. The closings figure and the
            "48 states" count are unsourced against allegiantreverse.com, which
            calls its own coverage "Nationwide" — so we say that, and let the
            2003 tenure (the true, stronger claim) carry the count. */}
        <ul className="mt-12 flex flex-col gap-5 border-t border-rule pt-7 font-mono text-eyebrow-control uppercase text-muted sm:flex-row sm:gap-12 md:mt-16 md:gap-16">
          <li className="flex items-baseline gap-3">
            <span className="text-[1.05rem] tracking-[0.02em] text-ink">Nationwide</span>
            coverage
          </li>
          <li className="flex items-baseline gap-3">
            <span className="text-[1.05rem] tracking-[0.02em] text-ink">One</span>
            product
          </li>
          {/* "In reverse since", not "since": ARS was founded in 2016. 2003 is
              how long this team has worked the product, which is the stronger
              claim anyway — and the only one that is true. */}
          <li className="flex items-baseline gap-3">
            in reverse since
            <span className="text-[1.05rem] tracking-[0.02em] text-ink">
              {/* A year counting from zero reads like a slot machine — roll it
                  from a nearby number instead. */}
              <CountUp to={2003} from={1975} trigger="load" delay={1.2} separator={false} />
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
