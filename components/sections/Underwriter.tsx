"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { DUR, EASE, TRIGGER, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/motion";

/**
 * The quiet section. One line, one wordmark, one sentence, a fade — nothing
 * else. Being owned by Stewart is the single largest trust signal on the page,
 * and the surest way to make it read as marketing is to animate it.
 */
export default function Underwriter() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        duration: DUR.reveal,
        ease: EASE.settle,
        scrollTrigger: { trigger: el, ...TRIGGER },
      });
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section className="border-t border-rule bg-stamp-soft/40 py-20" aria-label="Underwriter">
      <div ref={root} className="shell flex flex-col gap-8 md:flex-row md:items-baseline md:gap-16">
        <p className="font-display text-[2rem] leading-none tracking-[-0.02em]">
          Backed by Stewart.
        </p>
        {/* Wordmark stands in for the licensed Stewart lockup in a concept build. */}
        <p className="font-mono text-[1.05rem] uppercase tracking-[0.3em] text-ink">
          Stewart
          <span className="ml-2 align-middle text-eyebrow tracking-[0.14em] text-muted">
            Title
          </span>
        </p>
        {/* No year on the Stewart relationship — ARS does not publish one, and
            the 2016 that used to sit here is the company's founding year, which
            is a different fact entirely. */}
        <p className="max-w-[42ch] text-muted md:ml-auto">
          A Stewart Title company — national underwriting capacity behind a desk that
          only does reverse.
        </p>
      </div>
    </section>
  );
}
