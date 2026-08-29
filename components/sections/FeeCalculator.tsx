"use client";

import { useId, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import Eyebrow from "@/components/ui/Eyebrow";
import { DUR, EASE, useIsomorphicLayoutEffect, useReducedMotion } from "@/lib/motion";
import {
  HOME_VALUE_BOUNDS,
  SERVED_STATES,
  coverageStatus,
  quoteFor,
  usd,
  type Quote,
} from "@/lib/states";

const ORDERS_EMAIL = "orders@allegiantreverse.com";

const parseValue = (s: string) => Number(s.replace(/[^\d]/g, ""));

const groupDigits = (s: string) => {
  const digits = s.replace(/[^\d]/g, "").slice(0, 9);
  return digits ? Number(digits).toLocaleString("en-US") : "";
};

/**
 * On the current site the fee calculator is three clicks deep. Here it is a
 * first-class section: a broker can price a file without leaving the page,
 * without an account, and without a phone call.
 *
 * Accessibility notes, since this is the one section with real inputs:
 * - Labels are always visible. No placeholder-as-label — it disappears exactly
 *   when a 70-year-old borrower needs it most.
 * - Controls are 56px tall, well past the 44px target minimum.
 * - Focus rings are the brand navy from globals.css, never removed.
 * - The result region is aria-live="polite", so a screen-reader user hears the
 *   quote land instead of discovering it by chance.
 */
export default function FeeCalculator() {
  const stateId = useId();
  const valueId = useId();
  const [abbr, setAbbr] = useState("");
  const [display, setDisplay] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Non-priced states (NY separate schedule, partner states) show a routing
      note instead of a quote — coverage is honest, pricing is not guessed. */
  const [note, setNote] = useState<"ny" | "partner" | "unserved" | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Ledger rows lay in one after another whenever a new quote is produced.
  useIsomorphicLayoutEffect(() => {
    if (reduced || !quote) return;
    const el = resultRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-fee-line]", {
        y: 12,
        opacity: 0,
        duration: DUR.row,
        ease: EASE.lay,
        stagger: 0.06,
      });
      gsap.from("[data-fee-total]", {
        opacity: 0,
        duration: DUR.quick,
        ease: EASE.settle,
        delay: 0.35,
      });
    }, el);

    return () => ctx.revert();
  }, [quote, reduced]);

  // Bring the result into view once it lands — the total row otherwise sits
  // below the fold at desktop heights, and a screen-reader user already hears
  // it via the aria-live region.
  useIsomorphicLayoutEffect(() => {
    if (!quote && !note) return;
    resultRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [quote, note, reduced]);

  const [copied, setCopied] = useState(false);

  /** Copy the quote as a plain itemised block — the shape a closer pastes into
      an email or an order. */
  function copyQuote() {
    if (!quote) return;
    const rows = quote.lines.map((l) => `${l.line}  ${l.label.padEnd(34)} ${usd(l.amount)}`);
    const body = [
      `Estimate — ${quote.state.name} — ${usd(quote.homeValue)}`,
      "",
      ...rows,
      "",
      `TOTAL  Estimated title & settlement charges  ${usd(quote.total)}`,
      "",
      "Concept build — illustrative figures, not a rate quote.",
    ].join("\n");
    // Optional chain through .then too: a browser without navigator.clipboard
    // returns undefined here rather than throwing on .then.
    navigator.clipboard?.writeText(body)?.then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    setQuote(null);

    if (!abbr) return setError("Choose a state to price the file.");

    // Coverage first: NY and partner states are served but not priced here, so
    // they never fall through to a guessed number.
    const status = coverageStatus(abbr);
    if (status !== "priced") return setNote(status);

    const value = parseValue(display);
    if (!value) return setError("Enter the home value.");
    if (value < HOME_VALUE_BOUNDS.min || value > HOME_VALUE_BOUNDS.max) {
      return setError(
        `Home value should be between ${usd(HOME_VALUE_BOUNDS.min)} and ${usd(HOME_VALUE_BOUNDS.max)}.`
      );
    }

    setQuote(quoteFor(abbr, value));
  }

  return (
    <section id="calculator" className="scroll-mt-24 border-t border-rule py-24 md:py-32">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Eyebrow>Line 1100 — Title charges</Eyebrow>
          <h2 className="mt-6 max-w-measure font-display text-display-sm">
            Price the file in ten seconds.
          </h2>
          <p className="mt-6 max-w-measure text-muted">
            Two fields, no login, no callback. The same numbers your closer would read
            back to you on the phone, itemised the way they appear on the settlement
            statement.
          </p>
          <p className="mt-8 font-mono text-eyebrow uppercase text-steel">
            Nationwide coverage. Select a state for an instant quote.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-rule bg-surface p-6 md:p-10">
            {/* The instant quote needs JS; with it off the form is inert, so
                offer the human routes instead of a dead box. */}
            <noscript>
              <p className="mb-6 border-l-2 border-stamp pl-4 text-[0.95rem] leading-relaxed">
                Instant quotes need JavaScript. Call{" "}
                <a href="tel:+18448088299" className="rule-link text-stamp">
                  844.808.8299
                </a>{" "}
                or email{" "}
                <a href={`mailto:${ORDERS_EMAIL}`} className="rule-link text-stamp">
                  {ORDERS_EMAIL}
                </a>{" "}
                and we&rsquo;ll price your file.
              </p>
            </noscript>
            <form onSubmit={onSubmit} noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={stateId}
                    className="mb-2 block font-mono text-eyebrow uppercase text-steel"
                  >
                    Property state
                  </label>
                  <select
                    id={stateId}
                    value={abbr}
                    onChange={(e) => {
                      setAbbr(e.target.value);
                      setQuote(null);
                      setNote(null);
                    }}
                    className="h-14 w-full appearance-none border border-rule bg-surface px-4 text-base text-ink"
                  >
                    <option value="">Select a state</option>
                    {SERVED_STATES.map((s) => (
                      <option key={s.abbr} value={s.abbr}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={valueId}
                    className="mb-2 block font-mono text-eyebrow uppercase text-steel"
                  >
                    Home value
                  </label>
                  <div className="flex h-14 items-center border border-rule bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-stamp">
                    <span aria-hidden className="pl-4 pr-1 text-muted">
                      $
                    </span>
                    <input
                      id={valueId}
                      /* Not type="number": commas are grouped as you type, and the
                         spinner arrows are a hazard on a figure this large. */
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={display}
                      onChange={(e) => {
                        setDisplay(groupDigits(e.target.value));
                        setQuote(null);
                        setNote(null);
                      }}
                      className="tabular h-full w-full bg-transparent pr-4 text-base text-ink outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="mt-7 h-14 w-full bg-navy px-8 font-mono text-eyebrow uppercase tracking-[0.14em] text-paper transition-colors duration-300 ease-settle hover:bg-navy-2 sm:w-auto"
              >
                Get instant quote
              </button>

              <p className="mt-4 text-[0.9rem] text-muted">
                Quotes any time, day or night. No login.
              </p>

              {error && (
                <p role="alert" className="mt-4 border-l-2 border-stamp pl-3 text-[0.95rem]">
                  {error}
                </p>
              )}
            </form>

            <div ref={resultRef} aria-live="polite">
              {quote && (
                <div className="mt-10 border-t border-rule pt-8">
                  <Eyebrow className="mb-6">
                    Estimate — {quote.state.name} — {usd(quote.homeValue)}
                  </Eyebrow>

                  {quote.lines.map((l) => (
                    <div
                      key={l.line}
                      data-fee-line
                      className="flex items-baseline gap-4 border-b border-rule py-3.5"
                    >
                      <span className="w-16 shrink-0 font-mono text-eyebrow tracking-[0.1em] text-muted">
                        {l.line}
                      </span>
                      <span className="flex-1">{l.label}</span>
                      <span className="tabular w-28 shrink-0 text-right font-mono text-[0.95rem]">
                        {usd(l.amount)}
                      </span>
                    </div>
                  ))}

                  {/* Double rule under the total — the settlement-statement tell. */}
                  <div
                    data-fee-total
                    className="mt-4 flex items-baseline gap-4 border-y-[3px] border-double border-ink py-4"
                  >
                    <span className="w-16 shrink-0 font-mono text-eyebrow tracking-[0.1em] text-stamp">
                      Total
                    </span>
                    <span className="flex-1 font-display text-[1.35rem]">
                      Estimated title &amp; settlement charges
                    </span>
                    <span className="tabular shrink-0 text-right font-display text-[1.6rem] text-stamp">
                      {usd(quote.total)}
                    </span>
                  </div>

                  {/* The quote is a step in a workflow, not a dead end: price,
                      then open the order or take the numbers with you. */}
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <a
                      href={`mailto:${ORDERS_EMAIL}?subject=${encodeURIComponent(
                        `New order — ${quote.state.name}`
                      )}`}
                      className="inline-flex h-12 items-center justify-center bg-navy px-6 font-mono text-eyebrow uppercase tracking-[0.14em] text-paper transition-colors duration-300 ease-settle hover:bg-navy-2"
                    >
                      Open an order&nbsp;→
                    </a>
                    <button
                      type="button"
                      onClick={copyQuote}
                      className="inline-flex h-12 items-center justify-center border border-rule px-6 font-mono text-eyebrow uppercase tracking-[0.14em] text-ink transition-colors duration-300 ease-settle hover:bg-stamp-soft"
                    >
                      {copied ? "Copied ✓" : "Copy quote"}
                    </button>
                  </div>

                  <p className="mt-5 text-[0.85rem] leading-relaxed text-muted">
                    Concept build — figures are illustrative and regionally tiered, not a
                    rate quote. Recording fees and transfer taxes vary by county and are
                    confirmed at commitment.
                  </p>
                </div>
              )}

              {note && (
                <div className="mt-10 border-t border-rule pt-8">
                  <p className="border-l-2 border-stamp pl-4 text-[0.98rem] leading-relaxed">
                    {note === "ny" ? (
                      <>
                        New York is priced on a separate schedule. Send the file to{" "}
                        <a href={`mailto:${ORDERS_EMAIL}`} className="rule-link text-stamp">
                          {ORDERS_EMAIL}
                        </a>{" "}
                        and we&rsquo;ll return it same day.
                      </>
                    ) : (
                      <>
                        {SERVED_STATES.find((s) => s.abbr === abbr)?.name ?? "This state"} is
                        served through a licensed partner, so it&rsquo;s quoted per file rather
                        than from the standard schedule. Send the file to{" "}
                        <a href={`mailto:${ORDERS_EMAIL}`} className="rule-link text-stamp">
                          {ORDERS_EMAIL}
                        </a>{" "}
                        and we&rsquo;ll confirm same day.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
