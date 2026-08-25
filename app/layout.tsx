import type { Metadata } from "next";
import localFont from "next/font/local";
import { Spline_Sans_Mono } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import ReadyGate from "@/components/intro/ReadyGate";
import "./globals.css";

/** Display: editorial serif with sharp contrast. Headlines and numerals only. */
const zodiak = localFont({
  src: [
    { path: "./fonts/Zodiak-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Zodiak-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-zodiak",
  display: "swap",
});

/** Body/UI. Set at an 18px base — see globals.css. */
const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-Semibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-switzer",
  display: "swap",
});

/** Data/labels: eyebrows, ALTA line numbers, stat labels, tabular figures. */
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Allegiant Reverse Services — Reverse, done right.",
  // 2003 is the team's time in reverse, not the company's age — ARS was founded
  // in 2016. Keep the two apart in anything quotable, search results included.
  description:
    "Reverse mortgage title and settlement services in 48 states. 130,000+ closings, by a team that has done nothing but reverse since 2003. Backed by Stewart Title.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${zodiak.variable} ${switzer.variable} ${splineMono.variable}`}>
      <head>
        {/*
          The scroll lock has to exist BEFORE React does. Measured on Slow 4G:
          the page paints and is fully scrollable for several seconds while
          the bundle is still downloading, so a lock applied in a client
          effect arrives long after a reader could already have wheeled into
          the copy beats — the exact bug the gate exists to close.

          This must be a raw <script> inside an explicit <head>. next/script
          with beforeInteractive is NOT inline in the App Router: it is queued
          into self.__next_s and replayed by the framework, which is after
          hydration and therefore useless here.

          The safety timer is the important half — if the bundle never
          arrives, or ReadyGate throws, the page must not stay locked. It
          matches HARD_MS in lib/siteReady.ts with headroom.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('scroll-locked');" +
              "setTimeout(function(){document.documentElement.classList.remove('scroll-locked')},25000);",
          }}
        />
      </head>
      <body className="bg-paper font-sans text-base text-ink antialiased">
        {/* Keyboard users land here first — the nav is four links deep. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[100] focus:bg-ink focus:px-5 focus:py-3 focus:font-mono focus:text-eyebrow focus:uppercase focus:tracking-[0.14em] focus:text-paper"
        >
          Skip to content
        </a>
        <MotionProvider>
          {/* Holds scroll until the globe can be drawn. Lives here rather
              than inside FogHero so it also covers the WebGL-failure branch
              and the session-skip path, where FogHero renders no sequence. */}
          <ReadyGate />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
