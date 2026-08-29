"use client";

import RevealLines from "@/components/ui/RevealLines";
import Eyebrow from "@/components/ui/Eyebrow";

const CONTACT = [
  { label: "New orders", value: "orders@allegiantreverse.com", href: "mailto:orders@allegiantreverse.com" },
  { label: "Solutions", value: "solutions@allegiantreverse.com", href: "mailto:solutions@allegiantreverse.com" },
  { label: "General", value: "info@allegiantreverse.com", href: "mailto:info@allegiantreverse.com" },
  { label: "Toll free", value: "844.808.8299", href: "tel:+18448088299" },
  { label: "Orders fax", value: "916.545.8173", href: "tel:+19165458173" },
];

const SOCIAL = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/7950001" },
  { label: "Facebook", href: "https://www.facebook.com/AllegiantReverse/" },
  { label: "Instagram", href: "https://www.instagram.com/allegiantreverse/" },
];

const PRIVACY_URL =
  "https://allegiantreverse.com/wp-content/uploads/2024/09/10DLC-Privacy-Policy.pdf";

export default function Footer() {
  return (
    <footer id="contact" className="on-ink scroll-mt-24 bg-ink pb-14 pt-24 text-paper md:pt-32">
      <div className="shell">
        <RevealLines
          as="h2"
          className="font-display text-display-1"
          lines={[
            <>
              Let&apos;s <span className="text-stamp-bright">close</span>.
            </>,
          ]}
        />

        <div className="mt-20 grid gap-12 border-t border-paper/15 pt-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow>Open an order</Eyebrow>
            <ul className="mt-6 space-y-3">
              {CONTACT.map((c) => (
                <li key={c.label} className="flex flex-wrap items-baseline gap-x-4">
                  <span className="w-28 shrink-0 font-mono text-eyebrow-control uppercase text-paper/60">
                    {c.label}
                  </span>
                  <a href={c.href} className="rule-link -my-2 py-2 tabular text-lede">
                    {c.value}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <Eyebrow>Roseville</Eyebrow>
            <address className="mt-6 not-italic leading-relaxed text-paper/70">
              905 Highland Pointe Dr., Suite 150
              <br />
              Roseville, CA 95678
            </address>
          </div>

          <div className="md:col-span-3">
            <Eyebrow>Memberships</Eyebrow>
            <p className="mt-6 leading-relaxed text-paper/70">
              Member, National Reverse Mortgage Lenders Association (NRMLA).
              <br />A Stewart Title company.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-eyebrow-control uppercase text-paper/60">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rule-link -my-2 py-2"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-paper/15 pt-6 font-mono text-eyebrow-control uppercase text-paper/60 md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 Allegiant Reverse Services</p>
          {/* Concept build — the label stays on the page rather than in a deck. */}
          <p>Concept redesign — placeholder content</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rule-link -my-3 py-3"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#top" className="rule-link -my-3 py-3">
                Back to top
              </a>
            </li>
            <li>
              <a href="#calculator" className="rule-link -my-3 py-3">
                Fee quote
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
