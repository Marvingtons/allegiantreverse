"use client";

import RevealLines from "@/components/ui/RevealLines";
import Eyebrow from "@/components/ui/Eyebrow";

/* The footer is the last conversion point AND the site's one clear place to
   speak the settlement-statement concept: a four-column ledger of contacts, a
   recorded-instrument endorsement block, and a form number in the legal bar. */

const ORDERS_EMAIL = "orders@allegiantreverse.com";

/** Label/value rows for the two contact columns. Emails are mailto:, numbers
    are tel:. Every value link carries a py hit area (24px+). */
const ORDERS = [
  { label: "New orders", value: "orders@allegiantreverse.com", href: `mailto:${ORDERS_EMAIL}` },
  { label: "Orders fax", value: "916.545.8173", href: "tel:+19165458173" },
  { label: "Toll free", value: "844.808.8299", href: "tel:+18448088299" },
];
const CONTACT = [
  { label: "Solutions", value: "solutions@allegiantreverse.com", href: "mailto:solutions@allegiantreverse.com" },
  { label: "General", value: "info@allegiantreverse.com", href: "mailto:info@allegiantreverse.com" },
];

const SOCIAL = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/7950001" },
  { label: "Facebook", href: "https://www.facebook.com/AllegiantReverse/" },
  { label: "Instagram", href: "https://www.instagram.com/allegiantreverse/" },
];

const PRIVACY_URL =
  "https://allegiantreverse.com/wp-content/uploads/2024/09/10DLC-Privacy-Policy.pdf";

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("905 Highland Pointe Dr., Suite 150, Roseville, CA 95678");

/** One ledger row: a mono label over a body-sans value link. Consistent
    leading and py so every column shares the same baseline rhythm. */
function Row({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="leading-[1.4]">
      <div className="font-mono text-eyebrow uppercase text-paper/60">{label}</div>
      <a href={href} className="rule-link -my-1.5 inline-block py-1.5 text-[0.95rem] tabular text-paper">
        {value}
      </a>
    </div>
  );
}

export default function Footer() {
  return (
    <footer id="contact" className="on-ink scroll-mt-24 bg-ink pb-10 pt-32 text-paper">
      <div className="shell">
        {/* ---- Block A — Close ------------------------------------------- */}
        <RevealLines
          as="h2"
          className="font-display text-display-1"
          lines={[
            <>
              Let&apos;s <span className="text-stamp-bright">close</span>.
            </>,
          ]}
        />
        <p className="mt-6 max-w-measure text-lede text-paper/70">
          Send the file. We&rsquo;ll return the fee sheet same day.
        </p>
        <a
          href={`mailto:${ORDERS_EMAIL}?subject=New%20order`}
          className="mt-8 inline-flex h-12 items-center justify-center bg-stamp px-6 font-mono text-eyebrow-control uppercase text-paper transition-colors duration-300 ease-settle hover:bg-stamp-dark"
        >
          Open an order&nbsp;&rarr;
        </a>

        {/* ---- Block B — Ledger ------------------------------------------ */}
        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-10 border-t border-paper/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Eyebrow>Orders</Eyebrow>
            <div className="mt-6 space-y-4">
              {ORDERS.map((r) => (
                <Row key={r.label} {...r} />
              ))}
            </div>
          </div>

          <div>
            <Eyebrow>Contact</Eyebrow>
            <div className="mt-6 space-y-4">
              {CONTACT.map((r) => (
                <Row key={r.label} {...r} />
              ))}
            </div>
          </div>

          <div>
            <Eyebrow>Office</Eyebrow>
            <address className="mt-6 space-y-4 not-italic leading-[1.4]">
              <div className="text-[0.95rem] text-paper/85">905 Highland Pointe Dr., Suite 150</div>
              <div className="text-[0.95rem] text-paper/85">Roseville, CA 95678</div>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rule-link -my-1.5 inline-block py-1.5 text-[0.95rem] text-paper"
              >
                Directions&nbsp;&#8599;
              </a>
            </address>
          </div>

          <div>
            <Eyebrow>Memberships</Eyebrow>
            <div className="mt-6 space-y-4 leading-[1.4]">
              <p className="text-[0.95rem] text-paper/85">Member, NRMLA</p>
              {/* Stewart line left exactly as written — a human is verifying it. */}
              <p className="text-[0.95rem] text-paper/85">A Stewart Title company.</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-eyebrow uppercase text-paper/60">
                {SOCIAL.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rule-link -my-2 inline-block py-2"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ---- Block C — Endorsements ------------------------------------ */}
        {/* Fine print, set the way a recorded instrument carries its
            endorsements: a hairline box that landed a half-degree off-square. */}
        <div className="mt-12 border-t border-paper/15 pt-10">
          <div className="max-w-prose rotate-0 border border-paper/30 p-6 font-mono text-[10px] uppercase leading-[1.6] tracking-[0.14em] text-paper/60 lg:-rotate-[0.5deg]">
            <p>
              Wire fraud advisory — Allegiant Reverse Services will never change wiring
              instructions by email. Confirm all wire details by phone using a number you
              have independently verified before sending funds.
            </p>
            <p className="mt-4">
              Title insurance is issued through licensed agencies in each state. Licensing
              and DBA disclosures: [placeholder — populate from the Coverage Areas page].
            </p>
          </div>
        </div>

        {/* ---- Block D — Legal bar --------------------------------------- */}
        <div className="mt-10 flex flex-col gap-4 border-t border-paper/15 py-6 font-mono text-eyebrow-control uppercase text-paper/60 md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>&copy; 2026 Allegiant Reverse Services</span>
            {/* The smallest mark that makes the page read as a document. */}
            <span className="text-[9px] tracking-[0.14em] text-paper/40">ARS-1100 (Rev. 08/26)</span>
          </p>
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
          </ul>
        </div>
      </div>
    </footer>
  );
}
