"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DUR, EASE, TRIGGER, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/motion";
import { clsx } from "@/lib/clsx";

type Props = {
  /** One entry per typographic line. Line breaks are authored, not measured. */
  lines: React.ReactNode[];
  as?: "h1" | "h2" | "p" | "div";
  className?: string;
  lineClassName?: string;
  trigger?: "load" | "scroll";
  delay?: number;
};

/**
 * Line-mask reveal: each line sits in an `overflow: hidden` clip and slides up
 * from 100%. The classic display-type entrance, at document speed — 1.1s,
 * power3.out, 0.08s stagger.
 *
 * Lines are authored rather than split at runtime: no text-splitting library,
 * no re-split on resize, and the markup a screen reader gets is the real
 * sentence in the right order.
 */
export default function RevealLines({
  lines,
  as: Tag = "div",
  className,
  lineClassName,
  trigger = "scroll",
  delay = 0,
}: Props) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-line-inner]", el);
      gsap.set(targets, { yPercent: 100 });

      const tween = gsap.to(targets, {
        yPercent: 0,
        duration: DUR.reveal,
        delay,
        ease: EASE.settle,
        stagger: 0.08,
        paused: trigger === "scroll",
      });

      if (trigger === "scroll") {
        ScrollTrigger.create({ trigger: el, ...TRIGGER, onEnter: () => tween.play() });
      }
    }, el);

    return () => ctx.revert();
  }, [reduced, trigger, delay]);

  return (
    // @ts-expect-error — ref type varies by tag, all are HTMLElement at runtime
    <Tag ref={root} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <span data-line-inner className={clsx("block", lineClassName)}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
