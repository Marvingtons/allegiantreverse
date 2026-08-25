# Allegiant Reverse Services — concept redesign

A pitch build. Next.js 14 (App Router) + TypeScript + Tailwind, GSAP/ScrollTrigger
for entrances, Lenis for smooth scroll. Single page, nine sections.

    npm run dev     # http://localhost:3000
    npm run build

## The idea

**The Recorded Document.** Every county recorder stamps deeds in a specific
teal-green archival ink; that stamp is the only accent in the palette. The world
is bond paper, archival ink, and recorder's stamps — not the navy-and-gold every
other title company reaches for.

The trust problem is the design problem: the page has to read as premium to a
35-year-old broker and stay calm and legible for a 70-year-old borrower. That is
why the base font size is 18px, why the motion settles instead of flying, and
why nothing scroll-jacks.

Section eyebrows use real ALTA settlement-statement line numbers (the 1100s are
the title-charge block). A broker recognises their own paperwork.

## Layout of the code

    app/layout.tsx              fonts, MotionProvider, skip link
    app/globals.css             tokens, paper grain, rule-draw links, fog hero CSS
    components/sections/        the sections, in page order
    components/sections/FogHero the cinematic opening (globe + fog + fallback)
    components/ui/              Eyebrow, CountUp, RevealLines, HairlineRow
    lib/globe.config.ts         the frozen Globe Lab tuning + hero phase table
    lib/motion.ts               easings, durations, reduced-motion gate
    lib/gsap.ts                 single ScrollTrigger registration point
    lib/states.ts               map geometry + the fee table
    scripts/gen-states.mjs      regenerates the map path data from us-atlas

## Notes worth knowing before you edit

- **Colour tokens are doubled** — `--paper-rgb: 247 245 240` plus
  `--paper: rgb(var(--paper-rgb))`. Tailwind v3 cannot apply an alpha modifier
  to a var() holding a hex, so `text-paper/60` silently compiles to nothing
  unless the token exposes bare channels.
- **`--stamp-lift` / `--stamp-bright`** are the same stamp ink at higher value,
  used only on the ink-ground coverage section. `#1e5f52` on `#1a1a17` is 2.3:1
  and fails the 3:1 bar for a graphic that carries meaning.
- **The opening is the Fog Hero** — the Globe Lab sequence, promoted from a
  mid-page coverage section to the site opening (~380vh pinned via native
  sticky, same architecture as DeskSequence). The DOM fog is the preloader:
  three blurred CSS layers paint instantly, the R3F canvas (dynamic import,
  never in the initial bundle) crossfades in under them on its first frame.
  Touch, small viewports, and reduced motion get the type-only hero via a CSS
  media query (no hydration branch); WebGL failure or a 6s stall parts the fog
  into the same fallback at runtime. Hidden-tab time does not count toward the
  stall timer. Deep links and the returning-visitor jump use
  `behavior: "instant"` — the site sets `scroll-behavior: smooth`, so a
  plain scrollTo becomes an interruptible animation that the shader-compile
  block will strand mid-fog. All tuning lives in `lib/globe.config.ts`; the
  fog's near-white opening (`openColor`/`openFar`) is a documented
  deviation from the lab, whose entry frame was tuned for a dark mid-page
  slot. The old coverage section is gone — the claim is the ignition beat, and
  the Hawaii/Iowa honesty line sits under the calculator.
- **The brand lockup is beat zero of the scroll story** (mont-fort model,
  `components/intro/SiteIntro.tsx`): the silk-pour build plays once on load
  (gold-S masked stroke draw, navy slides, divider, letter stagger — internals
  only), then the wrapper belongs to the scrub like every other beat
  (`BEATS.lockup`) — scrolling dissolves it and scrolling back always brings
  it home. There is no preloader: no scroll lock, no counter, and the lockup
  NEVER travels to the header — the nav brand is static chrome. Loading
  mid-scroll plays the build invisibly under the wrapper's scroll-driven
  opacity, so scrubbing to the top always finds the finished mark.
- **The intro draw and the globe boot must never overlap.** The lockup's
  silk pour is a cheap main-thread animation; the globe's boot is ~700ms of
  expensive one (shader compile, cloud decode + upload, the data-map bake).
  Run together they froze a frame for 922ms. `lib/introState.ts` sequences
  them: FogHero mounts the canvas when the draw finishes *or* the reader
  scrolls, whichever comes first. The build timeline also starts on
  `requestIdleCallback` so it does not begin inside hydration. Measured
  result: draw window p95 11.2ms, max 16.7ms, zero dropped frames.
  Re-measure with `introperf.mjs` before changing any of it.
- **Paper is fog-white (#E7EAEC), not cream.** The whole page sits in the
  hero's weather — `--fog-3` *is* `--paper`, so the fog ramp lands on the
  page colour instead of dissolving into a different one. A flat cool grey
  reads as wireframe where cream read as paper, so `body::before` carries a
  fixed light bloom and cards use `--surface`. Anything sitting on fog needs
  its contrast measured against the *painted* pixel, not the declared
  background — see `contrast.mjs`.
- **The globe's rotation comes from scroll, and that is deliberate.** An
  autonomous time-based spin was built twice and removed twice — the still
  frame is the intended one, and a globe turning on its own clock also
  drifts its own framing away from the ignition. The only ambient motion is
  the cloud shell's slow drift. If it ever *looks* frozen when it should not,
  measure the rotation value directly (a temporary `window.__globeDbg`),
  never infer it from pixels: the cloud shell animates the same region and
  will make a pixel-diff test pass either way.
- **The planet spins out through the top-left; it is not covered in place.**
  The cover transforms `outerGroup` from a literal keyframe array (`EXIT`)
  — up, left and scaling to 1.4 — because that group already contains
  everything that must travel with it: gold states, HQ marker, borders,
  cloud shell, haze and the atmosphere rim. A camera dolly would instead
  fly inside the rim's BackSide shell and rescale the distance-based fog.
  The scrub is linear, so the acceleration comes from where the keyframes
  sit. Two things that must be *measured* rather than derived if you retime
  it: the arc's final position (world-space geometry overshot badly — the
  sphere vanished entirely), and the deck's timing, since a deck rising
  from the bottom will cover the top-left corner and hide the arc before
  it can read. `flyover.mjs` tracks the silhouette's area and centroid.
- **Rotation is gated to the flyover.** `SPIN_COVER.gate` multiplies both
  the spin rate and the accumulated offset, so the hero still never turns
  while a reader is parked on it, and scrolling back up unwinds the offset
  and restores the exact ignition framing. Do not ungate it.
- **The cover fog is a density ramp, not a shaped edge.** Eleven soft puff
  divs (blurred 44–70px, fading to a transparent version of their own
  colour) in two depth groups over a solid fill 8vh below — the gaps between
  puff tops are the silhouette; there is no mask. Two earlier attempts
  shaped a single edge and both read as a paper cutout. The fill offset is
  the sensitive number: too far below and the half-transparent deck over
  black space *is* the grey murk. Measured feather is 47–60px for the 25–75%
  band alone. Verify with `globefog.mjs`, which measures the silhouette by
  column (row means cannot tell a straight edge from a lumpy one) and only
  counts murk where a row is also flat across the width.
- **Nothing on this site uses a ScrollTrigger pin.** Every entrance is a
  `once: true` trigger; the one long sequence (DeskSequence) holds itself with
  native `position: sticky` over a real spacer. A JS pin writes a transform
  every frame, one frame behind Lenis, and that mismatch is what made the
  section feel unsmooth. It also cost CLS 6.0 across the two sections that used
  to pin; it is 0.004 now. Do not reintroduce one.
- **DeskSequence is one sticky stage running three acts** — horizontal timeline,
  Rob growing out of a mounted print, then the seven-person desk — off a single
  scroll-derived progress value. Phase boundaries are computed from the real
  pixel budget, not fixed fractions, so each act is paid for in scroll distance.
  Snapping past the timeline act is done through Lenis (`lib/lenis.ts`), since
  there is no ScrollTrigger to provide `snapTo`.
- **The portrait handoff is paced off the reference, and the number matters.**
  Aventura runs its reveal linearly across its whole ~660px cycle — the photo is
  in motion the entire time, back to back, no dwell. `HANDOFF_VH` is set so ours
  is 660px too. An earlier build put the wipe in 45% of a 502px segment and
  padded the rest with dwell; that is three times faster than the reference and
  is what "too fast" meant. The photograph and the text run on separate curves
  (`photoCurve` is linear across the whole handoff, `textOut`/`textIn` hand over
  in ~12% each) because a name smeared across 660px is unreadable.
- **Reduced motion** removes every entrance and Lenis. It works because all
  from-states are applied by JS in a layout effect — the server HTML is already
  the final state, so doing nothing is correct by construction. The Desk goes
  further and swaps to its stacked layout, by CSS media query rather than a
  client-side check, so there is no hydration mismatch.
- **Portraits are generated**, not hand-committed. `scripts/build-portraits.sh`
  turns the square studio JPEGs into the two layers The Desk stacks: a duotone
  resting state and the colour "archival" layer. The source JPEGs are not in the
  repo — put them in `.assets-src/` and re-run the script.
- **The Desk is a clean split: no type on the photograph.** An earlier draft
  straddled the name across the photo edge, which needed a paper scrim to stay
  legible — a haze over people's faces. Type now lives on paper (16:1 rather
  than 7.8:1) and the photo is a silent block with a hard edge and a hairline
  plate rule 2px clear of it. Do not put anything back on top of the portrait.
- **The nav auto-hides on scroll down**, site-wide, transform-only. Its
  direction debounce is a commit timer, not a throttle, so a short upward flick
  that stops still brings the nav back.
- **Fee figures are invented**, tiered by region. `lib/states.ts` is where a real
  rate engine would go.

## Two dates, and why the copy is fussy about them

**ARS was founded in 2016.** The team has worked in reverse **since 2003**. An
earlier draft of this build conflated the two and had the company founded in
2003, which was wrong.

Every surviving "2003" on the site is phrased as *in reverse since 2003* — hero
stat, timeline eyebrow, meta description, tenure tags. The founding year is
stated once, in the 2016 timeline stop, so the two cannot be read as one. If you
add copy that dates the company, date it from 2016.

Stewart is credited without a year, matching what ARS publishes. Anything that
put a date on that relationship has been removed.

## Real vs. placeholder

Real: the leadership roster in `lib/team.ts` — names, titles, tenure, and bios
from the ARS leadership page, in deliberate order of importance (don't sort it).
The photographs. The Roseville address, the toll-free number, closing counts,
state coverage, and the Stewart relationship.

Placeholder: the fee table, the marketing copy in the hero, positioning,
services, and footer, and the Stewart wordmark (a text stand-in for the licensed
lockup).

Titles are load-bearing — brokers know these people — so they are transcribed in
full rather than trimmed to fit. `tenureAccent` is stored per person rather than
derived: it marks entry into the industry before 2003, and one member's tag is
"30+ YEARS IN TITLE" with no year in it at all.
