import type { Config } from "tailwindcss";

/**
 * One system across fog and paper (cohesion pass): brand navy is the accent
 * everywhere; gold is the logo's foil, reserved for one highlight word per
 * screen at most. The legacy `stamp` token name now resolves to navy — see
 * globals.css.
 */
const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        steel: "rgb(var(--steel-rgb) / <alpha-value>)",
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
        stamp: "rgb(var(--stamp-rgb) / <alpha-value>)",
        "stamp-dark": "rgb(var(--stamp-dark-rgb) / <alpha-value>)",
        "stamp-soft": "rgb(var(--stamp-soft-rgb) / <alpha-value>)",
        "stamp-bright": "rgb(var(--stamp-bright-rgb) / <alpha-value>)",
        rule: "rgb(var(--rule-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-zodiak)", "Georgia", "serif"],
        sans: ["var(--font-switzer)", "system-ui", "sans-serif"],
        mono: ["var(--font-spline-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Base is 18px, not 16px — the borrower half of this audience is 62+.
        // ONE eyebrow spec site-wide: mono 11px, 0.34em tracking, steel.
        // Controls (nav links, buttons) use eyebrow-control; aligned data
        // (line numbers, roster indices) uses eyebrow-data — same 11px, tighter
        // tracking, so no interactive/data label drifts to a one-off value.
        eyebrow: ["11px", { lineHeight: "1.2", letterSpacing: "0.34em" }],
        "eyebrow-control": ["11px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        "eyebrow-data": ["11px", { lineHeight: "1.2", letterSpacing: "0.1em" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lede: ["1.22rem", { lineHeight: "1.55" }],
        // Display scale — a ~1.27 ratio in absolute px, so the crowded 34-38px
        // band collapses to one step (display-5). Every heading uses one of
        // these six; bespoke feature type (the desk name, the fog beats, the
        // brand lockup) keeps its own size by intent.
        "display-1": ["clamp(56px, 9vw, 130px)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-2": ["clamp(44px, 5.5vw, 79px)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-3": ["clamp(36px, 4.4vw, 63px)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "display-4": ["clamp(30px, 3.5vw, 50px)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-5": ["clamp(26px, 2.8vw, 40px)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-6": ["clamp(22px, 2.2vw, 32px)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      maxWidth: {
        shell: "88rem",
        measure: "34ch",
      },
      transitionTimingFunction: {
        settle: "var(--ease-settle)", // power3.out; single source is --ease-settle in globals.css
      },
    },
  },
  plugins: [],
};
export default config;
