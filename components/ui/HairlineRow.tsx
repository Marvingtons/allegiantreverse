"use client";

import { clsx } from "@/lib/clsx";

type Props = {
  /** ALTA line number, e.g. "1101" */
  line: string;
  title: string;
  note: string;
  href?: string;
};

/**
 * One line item in the services ledger.
 *
 * Hover/focus fills the row with `--stamp-soft`, turns the line number
 * `--stamp`, and slides a small arrow in from the left. All three are CSS
 * transitions rather than GSAP: they are interaction feedback, not entrance
 * choreography, and they need to be interruptible.
 *
 * Rendered as an anchor so the whole row is one keyboard stop with one focus
 * ring — not a div with a nested link.
 */
export default function HairlineRow({ line, title, note, href = "#calculator" }: Props) {
  return (
    <a
      href={href}
      data-row
      className={clsx(
        "group flex items-baseline gap-5 border-t border-rule py-7 md:gap-8 md:py-9",
        // Negative margin plus matching padding: the fill bleeds a little past
        // the text column so the row reads as a full-width band, without a
        // stacking-context-dependent pseudo-element behind it.
        "-mx-4 px-4 md:-mx-6 md:px-6",
        "transition-colors duration-300 ease-settle hover:bg-stamp-soft focus-visible:bg-stamp-soft"
      )}
    >
      <span
        aria-hidden
        className="w-[6.5rem] shrink-0 font-mono text-eyebrow uppercase text-[color:var(--eyebrow-fg)] transition-colors duration-300 ease-settle group-hover:text-stamp group-focus-visible:text-stamp md:w-[8rem]"
      >
        Line {line}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          {/* Arrow slides in from the left and pushes nothing — it occupies a
              fixed-width slot that is empty at rest. */}
          <span
            aria-hidden
            className="inline-block w-0 shrink-0 -translate-x-2 overflow-hidden text-stamp opacity-0 transition-all duration-300 ease-settle group-hover:w-6 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:w-6 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
          >
            &#8594;
          </span>
          <span className="font-display text-[1.6rem] leading-tight tracking-[-0.015em] md:text-[2.1rem]">
            {title}
          </span>
        </span>
        <span className="mt-2 block max-w-[46ch] text-[0.95rem] leading-relaxed text-muted">
          {note}
        </span>
      </span>
    </a>
  );
}
