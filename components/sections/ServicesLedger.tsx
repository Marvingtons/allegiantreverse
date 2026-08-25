"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import Eyebrow from "@/components/ui/Eyebrow";
import HairlineRow from "@/components/ui/HairlineRow";
import { DUR, EASE, SHIFT, TRIGGER, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/motion";

/**
 * The 1100s are the title-charge block of an ALTA settlement statement. Naming
 * the services by their real line numbers is the whole conceit of this section:
 * a broker reads the column and recognises their own paperwork.
 */
const SERVICES = [
  {
    line: "1101",
    title: "Title & Settlement",
    note: "Search, examination, commitment, and closing — the full file, handled by one team from order to recording.",
  },
  {
    line: "1102",
    title: "Property Reports & Demographics",
    note: "Ownership, encumbrance, and neighbourhood reports sized for reverse underwriting, not retail refi.",
  },
  {
    line: "1103",
    title: "24-Month Tax History",
    note: "Delinquency, installments, and assessed value across two years, delivered with the commitment.",
  },
  {
    line: "1104",
    title: "HECM for Purchase",
    note: "Purchase-specific settlement for borrowers 62+, including seller coordination and concession review.",
  },
  {
    line: "1105",
    title: "Education Center",
    note: "Reverse-specific training for your closers and signing agents. Free, and kept current with HUD.",
  },
];

export default function ServicesLedger() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]", el);
      gsap.set(rows, { y: SHIFT, opacity: 0 });

      gsap.to(rows, {
        y: 0,
        opacity: 1,
        // Heavy, no bounce: paper laid down, not a card dealt.
        duration: DUR.row,
        ease: EASE.lay,
        stagger: 0.06,
        scrollTrigger: { trigger: el, ...TRIGGER },
      });
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  // No border-t on this section: the fog above dissolves into this paper —
  // a full-width rule at that exact line would re-cut the removed seam.
  return (
    <section id="services" className="scroll-mt-24 py-24 md:py-32">
      <div className="shell grid gap-14 md:grid-cols-12 md:gap-12">
        {/* Sticky left column — the header stays with the ledger as it scrolls. */}
        <div className="md:col-span-4">
          <div className="md:sticky md:top-32">
            <Eyebrow>Services</Eyebrow>
            <h2 className="mt-6 max-w-measure font-display text-display-sm">
              Every line of the title block.
            </h2>
            <p className="mt-6 max-w-measure text-muted">
              Reverse files fail on the details — a missed tax installment, an unreleased
              lien, a signing agent who has never seen a HECM package. We do the whole
              block, so no one has to chase the gaps.
            </p>
          </div>
        </div>

        <div ref={root} className="md:col-span-8 md:col-start-5">
          {SERVICES.map((s) => (
            <HairlineRow key={s.line} {...s} />
          ))}
          <div className="border-t border-rule" />
        </div>
      </div>
    </section>
  );
}
