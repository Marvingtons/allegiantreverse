"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DUR, EASE, TRIGGER, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/motion";
import { clsx } from "@/lib/clsx";

type Props = {
  to: number;
  /** Start value. Years roll from a nearby number rather than from zero. */
  from?: number;
  /** Text before/after the numeral — kept outside the animated node. */
  prefix?: string;
  suffix?: string;
  /** Thousands separators. Off for years. */
  separator?: boolean;
  /** `load` fires immediately (hero); `scroll` waits for the section. */
  trigger?: "load" | "scroll";
  delay?: number;
  className?: string;
};

/**
 * Counts to `to` over DUR.count with power3.out — fast start, long settle.
 *
 * The final value is in the markup from the first render, so it is what a
 * screen reader announces, what search engines index, and what reduced-motion
 * users see. The animation only ever rewrites the textContent of a node that
 * already reads correctly.
 */
export default function CountUp({
  to,
  from = 0,
  prefix = "",
  suffix = "",
  separator = true,
  trigger = "scroll",
  delay = 0,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const format = (n: number) =>
    separator ? Math.round(n).toLocaleString("en-US") : String(Math.round(n));

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const state = { v: from };
    el.textContent = format(from);

    const ctx = gsap.context(() => {
      const tween = gsap.to(state, {
        v: to,
        duration: DUR.count,
        delay,
        ease: EASE.settle,
        paused: trigger === "scroll",
        onUpdate: () => {
          el.textContent = format(state.v);
        },
      });

      if (trigger === "scroll") {
        ScrollTrigger.create({ trigger: el, ...TRIGGER, onEnter: () => tween.play() });
      }
    });

    return () => {
      ctx.revert();
      // Leave the node reading the true value if we unmount mid-count.
      el.textContent = format(to);
    };
  }, [to, from, delay, trigger, reduced, separator]);

  return (
    <span className={clsx("tabular", className)}>
      {prefix}
      <span ref={ref}>{format(to)}</span>
      {suffix}
    </span>
  );
}
