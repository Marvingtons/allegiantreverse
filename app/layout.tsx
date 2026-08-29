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

// The link is the pitch's first impression — it gets forwarded and pasted into
// Outlook/Teams, so the unfurl has to carry the brand. 2003 is the team's time
// in reverse, not the company's age (ARS was founded 2016); keep the two apart
// in anything quotable. Coverage is ARS's own word, "Nationwide", not a count.
export const metadata: Metadata = {
  metadataBase: new URL("https://allegiant-reverse-services.vercel.app"),
  title: "Allegiant Reverse Services — Reverse, done right.",
  description:
    "Title & settlement for reverse mortgages. One product since 2003. Nationwide coverage, instant fee quotes, and a team lenders know by name.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Allegiant Reverse Services",
    title: "Allegiant Reverse Services — Reverse, done right.",
    description:
      "Title & settlement for reverse mortgages. One product since 2003.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Allegiant Reverse Services" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Allegiant Reverse Services — Reverse, done right.",
    description: "Title & settlement for reverse mortgages. One product since 2003.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
          arrives, or ReadyGate throws, the page must not stay locked. This is
          the catastrophic-failure backstop (JS never ran), independent of and
          well above ReadyGate's own HARD_MS ceiling in lib/siteReady.ts.
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
        {/* Organization structured data — the address, line and profiles ARS
            publishes, so search and social know who this is. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Allegiant Reverse Services",
              url: "https://allegiantreverse.com",
              logo: "https://allegiant-reverse-services.vercel.app/apple-icon.png",
              address: {
                "@type": "PostalAddress",
                streetAddress: "905 Highland Pointe Dr., Suite 150",
                addressLocality: "Roseville",
                addressRegion: "CA",
                postalCode: "95678",
                addressCountry: "US",
              },
              telephone: "+1-844-808-8299",
              sameAs: [
                "https://www.linkedin.com/company/7950001",
                "https://www.facebook.com/AllegiantReverse/",
                "https://www.instagram.com/allegiantreverse/",
              ],
            }),
          }}
        />
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
