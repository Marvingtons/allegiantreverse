"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

// No Coverage link any more: the coverage claim is the hero sequence itself,
// and the state specifics sit under the fee calculator.
//
// `mobile: true` links survive below sm. All four fit at sm+, but four links
// plus the wordmark overflow a 390px row, so the phone keeps the two that are
// ACTIONS — price a file, open an order — which is exactly the daily-user
// workflow. Services and Contact are a scroll away and reappear at sm.
const ORDERS_EMAIL = "orders@allegiantreverse.com";
const LINKS = [
  { href: "#services", label: "Services", mobile: false },
  { href: "#calculator", label: "Fee quote", mobile: true },
  { href: "#contact", label: "Contact", mobile: false },
  { href: `mailto:${ORDERS_EMAIL}`, label: "Open an order", mobile: true },
];

/** Below this, the nav is always shown — no hiding at the top of the page. */
const HIDE_AFTER = 120;
/** A direction has to hold this long before the nav acts on it. */
const DIRECTION_DEBOUNCE = 80;

/**
 * Solid ink on paper — no blend modes, no transparency games. The nav gains a
 * blur backdrop and a hairline rule after 80px so it separates from the page
 * without ever changing its type colour.
 *
 * It also gets out of the way: scrolling down slides it off, scrolling up
 * brings it back. That is site-wide, but The Desk is what forced it — a 100vh
 * portrait cannot own the viewport with a bar sitting on top of it.
 *
 * The debounce is a commit timer rather than a throttle, so it fires even if
 * the wheel stops mid-gesture: flick up and stop, and the nav still returns.
 * Movement is transform-only, so none of this costs a layout shift.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pending = useRef<{ dir: number; timer: number } | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    const commit = (dir: number) => {
      pending.current = null;
      setHidden(dir > 0 && window.scrollY > HIDE_AFTER);
    };

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);

      const delta = y - lastY.current;
      lastY.current = y;
      if (Math.abs(delta) < 1) return;

      // Near the top the nav is always visible, no debounce.
      if (y <= HIDE_AFTER) {
        if (pending.current) clearTimeout(pending.current.timer);
        pending.current = null;
        setHidden(false);
        return;
      }

      const dir = delta > 0 ? 1 : -1;
      if (pending.current?.dir === dir) return; // already waiting on this one
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = {
        dir,
        timer: window.setTimeout(() => commit(dir), DIRECTION_DEBOUNCE),
      };
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (pending.current) clearTimeout(pending.current.timer);
    };
  }, []);

  return (
    <header
      onFocus={() => setHidden(false)}
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,transform] duration-500 ease-settle",
        "motion-safe:duration-[350ms]",
        hidden ? "-translate-y-full" : "translate-y-0",
        scrolled
          ? "border-b border-rule bg-paper/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="shell flex h-[4.5rem] items-center justify-between" aria-label="Primary">
        <a
          href="#top"
          data-brand
          className="-my-2 py-2 font-display text-[1.15rem] leading-none tracking-[-0.02em]"
          aria-label="Allegiant Reverse Services — home"
        >
          Allegiant<span className="hidden text-muted sm:inline"> Reverse Services</span>
        </a>

        {/* Four links do not all fit beside the wordmark on a phone, and a
            single-page concept does not earn a hamburger. Below sm the nav
            keeps the two action links; every link carries a py-3 hit area
            (with matching -my-3 so the bar height is unchanged) so no target
            is under 24px for the 45-65 audience. */}
        <ul className="flex items-center gap-5 sm:gap-6 md:gap-9">
          {LINKS.map((l) => (
            <li key={l.href} className={l.mobile ? "" : "hidden sm:block"}>
              <a
                href={l.href}
                className="rule-link -my-3 py-3 font-mono text-eyebrow uppercase tracking-[0.14em] text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
