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
        navy: "rgb(var(--navy-rgb) / <alpha-value>)",
        "navy-2": "rgb(var(--navy2-rgb) / <alpha-value>)",
        steel: "rgb(var(--steel-rgb) / <alpha-value>)",
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
        "gold-2": "rgb(var(--gold2-rgb) / <alpha-value>)",
        stamp: "rgb(var(--stamp-rgb) / <alpha-value>)",
        "stamp-soft": "rgb(var(--stamp-soft-rgb) / <alpha-value>)",
        "stamp-lift": "rgb(var(--stamp-lift-rgb) / <alpha-value>)",
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
        // Every step below is set against that baseline, not Tailwind's.
        // ONE eyebrow spec site-wide: mono 11px, 0.34em tracking, steel.
        // (Controls — nav links, buttons — override tracking back to 0.14em;
        // they are labels on interactive elements, not eyebrows.)
        eyebrow: ["11px", { lineHeight: "1.2", letterSpacing: "0.34em" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lede: ["1.22rem", { lineHeight: "1.55" }],
        display: ["clamp(3.5rem, 9vw, 8.5rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        "display-sm": ["clamp(2.5rem, 5.5vw, 4.5rem)", { lineHeight: "1", letterSpacing: "-0.025em" }],
        numeral: ["clamp(4.5rem, 12vw, 11rem)", { lineHeight: "0.85", letterSpacing: "-0.04em" }],
        statement: ["clamp(1.5rem, 3vw, 2.25rem)", { lineHeight: "1.35", letterSpacing: "-0.015em" }],
      },
      maxWidth: {
        shell: "88rem",
        measure: "34ch",
        statement: "28ch",
      },
      transitionTimingFunction: {
        settle: "cubic-bezier(0.22, 1, 0.36, 1)", // power3.out, matched to lib/motion.ts
      },
    },
  },
  plugins: [],
};
export default config;
