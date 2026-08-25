"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point.
 *
 * Registering inside a provider's useEffect is too late: React runs child
 * layout effects before any parent passive effect, so a section would try to
 * create a ScrollTrigger before the plugin existed. Module scope runs at import
 * time, ahead of every effect, and registerPlugin is idempotent.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

