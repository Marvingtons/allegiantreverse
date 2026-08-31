import type { MetadataRoute } from "next";

/** Web app manifest. theme/background = brand ink, so the mobile browser
    chrome matches the footer; icons are the monogram-on-ink renders. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Allegiant Reverse Services",
    short_name: "ARS",
    description: "Title & settlement for reverse mortgages. One product since 2003.",
    start_url: "/",
    display: "standalone",
    theme_color: "#1F2124",
    background_color: "#1F2124",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
