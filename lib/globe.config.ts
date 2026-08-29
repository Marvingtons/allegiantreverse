/**
 * Globe Lab tuning, frozen for production. This file IS the design —
 * every value here was set by dragging Leva sliders in the lab; Leva
 * itself does not ship.
 *
 * Repurposed for the FOG HERO: the sequence is now the site opening
 * (one pinned scroll, ~380vh), not a mid-page coverage section. The
 * phase table below is the single source of truth for the camera,
 * the shader wave, AND the DOM text beats — no second timeline.
 */

/** Scroll runway in viewport heights for the globe choreography itself. */
export const GLOBE_PIN_VH = 380;

/**
 * "Into the fog" cover transition — the FINAL phase of the same sticky stage
 * (the globe lives here; a separate pinned section could not cover it, and
 * this site never uses ScrollTrigger pins). Extra runway appended after the
 * landing: three cloud banks rise over the settled globe, an atmosphere tint
 * turns the frame pale, the canvas dims to 0.35 and the cloud rotation eases
 * to ~30% — then the stage releases into the Who We Are fog section.
 */
export const COVER_VH = 170;

/**
 * The globe's rotation comes from SCROLL — the yaw keyframes below — and
 * nothing else. An autonomous time-based spin was built and removed on
 * purpose: a globe that turns on its own clock also drifts its own framing,
 * so the ignition could meet a reader with the states off-centre. The only
 * ambient motion in the scene is the cloud shell's slow drift.
 */
/**
 * Ambient weather. The CLOUD SHELL is a separate mesh from the earth, so
 * drifting it moves the sky without moving the ground — the land and the
 * gold states stay exactly where the scroll put them. This is the motion in
 * the background of the opening frame.
 *
 * Rate falls off with distance because that is how it reads: standing inside
 * the cloud layer you see weather move, from orbit you do not. Racing clouds
 * over a motionless earth at the wide shot looks like a time-lapse.
 */
export const AMBIENT = {
  /**
   * The movement in the opening frame is a slow CAMERA DRIFT, not rotation.
   *
   * Rotating the globe is what the earlier builds did, and it is what has to
   * be avoided: it drifts the surface away from the ignition framing, and it
   * accumulates without bound while a reader sits still. Sliding the camera
   * a few centimetres instead produces the same parallax across the fogged
   * surface — which at this range reads purely as weather moving — while the
   * globe's orientation stays exactly where the scroll put it.
   *
   * Two sine terms on incommensurate periods so the path never visibly
   * repeats, and it oscillates rather than accumulates: idle for an hour and
   * the framing is still correct. Tapers to nothing by the reveal, where the
   * camera is far enough that surface parallax would read as a wobble.
   */
  driftX: 0.05, // world units of lateral camera sway
  driftY: 0.028, // and vertical
  driftFreqX: 0.22, // rad/s → ~29s period
  driftFreqY: 0.17, // rad/s → ~37s period
  /** The cloud shell also turns, but it is a minor contributor at this
      range — measured, raising it 1.7x barely changed the frame. */
  cloudsNear: 0.085,
  cloudsFar: 0.006,
} as const;

/**
 * THE FLYOVER EXIT. A static subject being covered by a moving layer reads
 * as a curtain however soft the curtain is, so the planet now leaves under
 * its own power: it grows, sinks, banks and spins out through the bottom of
 * the frame while the deck takes over.
 *
 * TRANSFORM ROUTE, not a camera dolly. Everything that has to travel with
 * the planet — gold states, HQ marker, border lines, cloud shell, inner haze
 * AND the atmosphere rim — already lives inside `outerGroup`, so one group
 * transform carries the lot and the screen-space result is exact. Dollying
 * the camera instead would fly it inside the rim's BackSide shell (whose
 * shader is written for viewing from outside) and would rescale the
 * distance-based scene fog on the way past.
 *
 * Literal keyframes rather than an eased curve: the scrub is linear, so the
 * gravity comes from where these sit — small early, accelerating hard after
 * 0.42. Values are world units; the frame is ~1.95 world units tall at the
 * globe's depth, so y=-2.45 with radius 1.5 puts the limb well clear.
 */
export interface ExitKey {
  t: number;
  scale: number;
  x: number;
  y: number;
}
/**
 * SPIN-OUT to the top-left. The planet climbs out through the upper-left
 * corner while the rig scales up — the camera closing on its lower-right
 * shoulder — until only a thin lower-right arc crosses the corner. No roll:
 * the diagonal travel plus the constant spin already carry the motion, and
 * a bank on top of a diagonal exit just muddies the read.
 *
 * World units. The frame is ~1.95 units tall and ~3.12 wide at the globe's
 * depth, so its upper-left corner sits near (-1.51, 1.27); the final centre
 * is placed just over 1.25 units up-left of that, leaving the corner barely
 * inside a radius-1.4 sphere — i.e. a sliver, not a cap.
 */
export const EXIT: ExitKey[] = [
  // Rotation is the primary mover now (see K_RAD_PER_VH): -24.5 deg of roll
  // carries the US up-left on the surface all by itself. These keys only
  // amplify it — through 0.45 the rig has barely moved, which is what keeps
  // the US inside the central third while the roll does the work. Past 0.62
  // translation takes over and pushes the limb out of frame entirely.
  { t: 0, scale: 1, x: 0, y: 0 },
  { t: 0.45, scale: 1.06, x: -0.1, y: 0.09 },
  { t: 0.62, scale: 1.16, x: -0.48, y: 0.44 },
  { t: 0.8, scale: 1.34, x: -1.4, y: 1.28 },
];
// MEASURED, not derived: the first pass put the final centre at (-2.4, 2.15)
// from the world-space geometry and the sphere was gone by 0.65 (silhouette
// area 1 of a resting 34400). Tracking the silhouette showed the arc state
// actually lands near (-1.5, 1.3). The last keyframe then HOLDS while the
// canvas fades, so the arc dissolves in place instead of being chased off.

/** The lower-right limb is the last hero element on screen — let it glow as
    it goes, but modestly; it is leaving, not arriving. */
export const RIM_BOOST = { to: 1.5, by: 0.35 } as const;

/**
 * Rotation during the FLYOVER ONLY. Gated by `gate` so it is zero at the
 * landing frame — the globe still never turns while the reader is parked on
 * the hero (that stays settled) — and the accumulated offset unwinds with
 * the same gate, so scrolling back up restores the exact ignition framing.
 */
/**
 * K — the scroll-to-rotation constant for the EXIT roll.
 *
 *   K = (0.14 - 1.05) / 380vh = -0.002395 rad/vh = -0.1372 deg/vh
 *
 * Derived from the beats' own endpoints: yaw runs 1.05 rad at the top of the
 * pin to 0.14 rad at the landing over GLOBE_PIN_VH. Over the 170vh cover that
 * is -0.4072 rad = -23.3 deg of continued roll.
 *
 * WHAT THIS IS NOT: it is not a flat rate imposed on the whole journey. That
 * was tried and it was wrong. Forcing yaw to be linear in scroll does make
 * the boundary undetectable, but it destroys the choreography the beats are
 * built on — the planet rolling in through the descent, easing out across the
 * arrival, and coming to REST for "48 states". A constant rate has no arrival
 * and no settle; the globe just turns, evenly, forever.
 *
 * So the beats keep their keyframed, eased, damped yaw exactly as they were,
 * and this constant governs only the additional roll during the cover — eased
 * in by ROLL_EASE so it grows out of the settle rather than starting on top of
 * it. Rotation RATE is therefore still continuous across the boundary (both
 * sides are ~0 there); what is not constant is the rate itself, deliberately.
 */
export const K_RAD_PER_VH = -0.002395;

/** Exponent on the cover's roll. >1 means zero rate at cp=0 — the exit roll
    grows out of the landing's stillness instead of snapping into it, so the
    boundary has no velocity step even though the planet is at rest there. */
export const ROLL_EASE = 1.7;

/** Sign flip for the roll direction, isolated so the exit's up-left travel
    is one character to change rather than a re-derivation. */
export const K_SIGN = 1;

/**
 * The always-alive drift: a bounded BREATH, not an accumulator.
 *
 * This was `spinAcc += rate * dt`, unbounded — so leaving the page open just
 * kept winding the planet. At 0.39 deg/s that is 23 deg a minute: after a few
 * minutes the US had walked off the right-hand limb and the frame was mostly
 * empty Pacific. The composition is the whole point of this shot, and no
 * amount of "small" per-frame rate survives unbounded integration.
 *
 * A slow sine keeps the planet alive without ever leaving its framing: it is
 * still additive, still never a tween toward a target, and it is bounded at
 * +/-1.1 deg — below the threshold where it reads as motion in a single
 * glance, and it returns to zero every cycle.
 */
export const IDLE = { amp: 0.02, periodSec: 42 } as const;

export const SPIN_COVER = {
  base: 0.045, // rad/s at the start of the exit
  floor: 0.5, // multiplier at full cover — the travel supplies the drama
  /** Ramps the RATE in as the cover begins, so a reader parked on the hero
      still sees a settled globe. It is deliberately NOT applied to the
      accumulator: the spin must never reverse, including on the way back
      up, so the offset is kept rather than unwound. */
  gate: 0.2,
  /** Ceiling on the kept offset. Because it never unwinds, this is the
      lifetime bound on how far the surface can drift from the composed
      framing — ~23°, reached only by parking inside the cover, and it
      saturates rather than accumulating over repeated round trips. */
  cap: 0.4,
} as const;

export const COVER = {
  /** Cloud decks, in vh. Two depth cues, not one: different travel per deck,
      and different ACCELERATION (`ease` is the exponent on the deck's own
      progress). Travelling linearly, the lead deck had swallowed the whole
      frame by 65% — the globe with its gold states is the hero image of the
      section and has to survive into the sixties, so the decks climb slowly
      through the middle and commit late. */
  /** Retimed to interlock with the exit: the deck holds off until the
      approach is clearly underway (0.15), crosses the exiting limb around
      0.45–0.55 — the overlap frame, planet visibly behind and below the
      cloud — and completes its travel by ~0.72 rather than running to 1. */
  /** Later than the flyover timing. The arc now exits through the TOP-LEFT,
      and the deck rises from the bottom — so a deck that completes early
      simply covers the corner and the arc never reads. These are set so the
      leading edge meets the receding arc around 0.55–0.65 with the corner
      still clear, and closes over it afterwards. */
  banks: [
    { start: 0.45, end: 0.9, from: 110, to: -52, ease: 1.2 }, // front puffs
    { start: 0.48, end: 0.95, from: 116, to: -6, ease: 1.12 }, // back, ~0.7x
  ],
  /** The solid mass under the puffs, 8vh below the front group. Deeper than
      that and nothing commits: the bottom of the frame stays half-transparent
      over black space, which is precisely how grey murk is made. The puff
      crowns (tops staggered 1–13vh inside the group) still stand proud of
      this line, and the sky between them is the silhouette. */
  fill: { start: 0.47, end: 0.92, from: 118, to: -44, ease: 1.2 },
  /** The flat wash comes LAST: it is what made the rise read as one curtain,
      so the layered decks do the work and this only closes the final gap. */
  /** Later and slower than before. This flat wash was reaching ~65% while
      the decks were still the only thing on screen, ironing their structure
      into the featureless pale frame the audit flagged. It no longer has to
      close the gap on its own either — Who We Are now sits behind the stage
      and provides the ground — so it is only a finishing veil. */
  tint: { from: 0.72, to: 0.95 },
  /** The arc DISSOLVES rather than being chased off screen: the canvas is
      already fading before the sphere reaches the corner, so no frame shows
      it hard-clipped by the viewport edge at full opacity. */
  dim: { from: 0.7, to: 0.92 },
  textOut: { from: 0, to: 0.2 }, // the landing lockup clears before the banks peak
  /** THE DEAD-ZONE FIX. The sticky stage used to hold a completed, motionless
      cover for its whole 100vh scroll-away before Who We Are could appear —
      measured at 70vh of frames with nothing in them. Who We Are now sits
      BEHIND the stage (margin-top: -100vh) and the stage dissolves into it
      over this window. Both grounds are --fog-1 at the seam, so the fade
      itself is invisible: what the eye sees is the statement arriving in the
      fog, on the same scroll that finishes the cover. */
  stageOut: { from: 0.7, to: 0.88 },
  canvasDim: 0, // the globe dissolves out entirely — it does not linger dimmed
  spinFloor: 0.2, // rotation rate multiplier at full cover — slowed, never stopped
} as const;

/** The cinema (and the silk-draw intro riding on it) runs only here —
    everyone else gets the type hero. Shared by FogHero and SiteIntro. */
export const CINEMA_MQ =
  "(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/**
 * Phase boundaries (progress 0→1):
 *   0.00–0.12 fog       — inside the cloud layer
 *   0.12–0.30 descent   — clouds thinning, ocean hints
 *   0.30–0.55 reveal    — full pull-back, curvature, the money shot
 *   0.55–0.72 arrival   — US rolls into final framing, day-lit
 *   0.72–0.90 ignition  — gold wave west→east, gilt coastline
 *   0.90–1.00 landing   — globe settles, final line composes
 */
export const PHASES = {
  fog: 0.12,
  descent: 0.3,
  reveal: 0.55,
  arrival: 0.72,
  ignition: 0.9,
} as const;

export const WAVE_START = PHASES.arrival; // ignition wave window
export const WAVE_END = PHASES.ignition;

/** Sun travel window — US arrives day-lit, glint slides during ignition. */
export const LIGHT_TRAVEL = { from: 0.38, to: 0.9 } as const;

/** Landing beat: the final line composes here; foil + shader sweep fire together. */
export const LANDING_AT = 0.93;

/**
 * Text beats — [inStart, inEnd, outStart, outEnd] in progress. Reveals are
 * mask-up, exits dissolve (opacity + 6px blur, no movement). One at a time.
 *
 * Beat ZERO is the brand lockup (mont-fort model): it builds once on load,
 * its "in" window is already open, and the scrub owns it from there —
 * scrolling dissolves it, scrolling back always brings it home. The copy
 * beats follow in the zones whose legibility was screenshot-verified.
 */
export const BEATS = {
  lockup: [0, 0, 0.06, 0.11],
  since: [0.15, 0.19, 0.26, 0.3],
  closings: [0.31, 0.35, 0.5, 0.55],
  product: [0.57, 0.61, 0.66, 0.7],
  states: [0.78, 0.84, 0.9, 0.93],
} as const;

/** Ink→paper type interpolation window. Sits in the beat-1→beat-2 gap, so the
    flip happens while no line is on screen; a scrub-driven text halo (same k)
    carries legibility over the mid-tone descent. */
export const TYPE_SWAP = { from: 0.12, to: 0.16 } as const;

export const TEXTURES = {
  map: "/textures/earth_atmos_2048.webp",
  // normal + specular are halved to 1024x512 (invisible at this camera
  // distance) — ~295KB off the gated texture set. Filenames keep the "2048"
  // suffix so this config and any bookmarks stay stable.
  normalMap: "/textures/earth_normal_2048.webp",
  specularMap: "/textures/earth_specular_2048.webp",
  // Clouds at 4K WebP, not 8K and not 4K JPEG. Two rounds of measurement:
  //
  // 8K -> 4K: the lab needed 8K because its camera opened INSIDE a thin
  // cloud layer with the sphere in clear view; the hero opens in dense scene
  // fog that whites the sphere out, and by the time the fog thins the camera
  // is already pulling back — so the texel density 8K bought is never on
  // screen. Cost of the 8K plate: 11.1MB, 266ms of main-thread decode, 134MB
  // of GPU memory before mipmaps, an ~860ms long task at boot.
  //
  // JPEG -> WebP at the SAME resolution: forced by the readiness gate.
  // Scroll is now held until the globe can be drawn, and the gated payload
  // was 3.39MB — about 17s on Slow 4G, which blew through the gate's 20s
  // ceiling on every cold load and opened it with nothing drawn.
  //
  // Downscaling was tried first and rejected on measurement. Detail energy
  // through the descent (the one stretch where the camera is close to the
  // cloud shell) against the 4K plate:
  //     2K   -4.6% .. -27.7%   (worst at p=0.16)
  //     3K   -3.1% .. -18.1%
  // Both are plainly visible; the metric's own noise floor is 0.3%, measured
  // by re-running it against an unchanged build. Note that a pixel DIFF
  // cannot answer this question at all — the cloud shell drifts with elapsed
  // time, so a diff measures where the clouds happen to be sitting.
  //
  // So the resolution stays and the bytes come out of the encoder instead:
  // 1.98MB -> 1.44MB at q0.72, with the whole texture set at 2.07MB.
  //
  // If a future full-res pass ever puts the camera back inside clear cloud,
  // re-fetch the source 8K cloud map from the three.js examples set
  // (examples/textures/planets/earth_clouds_*.jpg) and re-encode; the heavy
  // JPEG originals are no longer carried in the repo.
  clouds: "/textures/earth_clouds_4k.webp",
} as const;

export const ROSEVILLE_LAT = 38.75;
export const ROSEVILLE_LNG = -121.29;

// Grade: exposure & tint (cools the raw texture toward slate)
/**
 * THE DAWN GRADE. Light fog compositing over near-black is not weather, it
 * is dirt — that is what made the rise read as grey murk. The sky is graded
 * instead, so the deck always rises into an already-lit frame:
 *   cp 0.00–0.30  space black holds, the rim brightens on the approach
 *   cp 0.30–0.60  the rim's atmosphere floods the frame: black -> atmoBlue
 *   cp 0.55–0.85  atmoBlue -> fog-1, and only now do the decks rise
 * The two windows overlap so the ramp is continuous and monotonic in
 * luminance (10 -> 82 -> 206). ONE function drives both the WebGL clear
 * colour and the DOM stage behind it, so that boundary cannot separate.
 */
export const DAWN = {
  space: "#0b0b09",
  /** Deepened from the rim's own #87a2c0 — the frame becomes the glow. */
  atmo: "#33526f",
  sky: "#ced2d6", // = --fog-1, exactly what Who We Are opens on
  atmoFrom: 0.3,
  atmoTo: 0.6,
  skyFrom: 0.55,
  skyTo: 0.85,
} as const;

export const GRADE = {
  exposure: 0.9,
  tint: "#d8e0e8",
} as const;

// Gold Foil shader uniforms — TWO-METAL SYSTEM: navy is the working ink,
// gold is FOIL, reserved for completion moments. This sequence and the
// landing line's one word are the only gold on the site.
export const WAVE_SHADER = {
  centerAlpha: 0.05,
  edgeAlpha: 0.18,
  fallRange: 0.3,
  glowRange: 0.028,
  glowIntensity: 0.14,
  haloRange: 0.14,
  haloIntensity: 0.08,
  specStrength: 0.5,
  specPower: 110,
  sweepIntensity: 0.3,
  sweepWidth: 0.016,
  goldDeep: "#8c6a2f",
  goldMid: "#c9a45c",
  goldHigh: "#efd9a7",
  maskLo: 0.35,
  maskHi: 0.65,
  // Glint axis travels west→east; must not park on Iowa (the unfilled hole).
  glintFrom: { x: -0.35, y: 0.22, z: 0.91 },
  glintTo: { x: 0.24, y: -0.09, z: 0.97 },
  fade: 0.15,
} as const;

export const BORDER_LINES = {
  extColor: "#efd9a7",
  extWidth: 1.6,
  extOpacity: 0.95,
  intColor: "#c9a45c",
  intWidth: 1.0,
  intOpacity: 0.5,
} as const;

export const SWEEP = {
  intensity: 0.3,
  width: 0.016,
  duration: 1.1,
} as const;

export const ATMOSPHERE_RIM = {
  color: "#87a2c0", // slate-blue, NOT saturated cyan
  intensity: 1.6,
  falloff: 5.2,
  radius: 1.12,
} as const;

export const INNER_HAZE = {
  color: "#7fa3c4",
  intensity: 0.38,
  falloff: 2.6,
} as const;

export interface Keyframe {
  t: number;
  dist: number;
  camX: number;
  camY: number;
  tgtX: number;
  tgtY: number;
  yaw: number;
  pitch: number;
  tilt: number;
  clouds: number;
}

// Camera path, remapped from the lab's 0/.18/.55/.75 stops onto the hero
// phases. The .55 keyframe keeps its ease-out arrival tail (see GlobeScene).
export const KEYFRAMES: Keyframe[] = [
  // in the fog
  { t: 0.0, dist: 1.35, camX: -0.03, camY: 0, tgtX: -0.12, tgtY: 0.05, yaw: 1.05, pitch: 0.96, tilt: 0, clouds: 1 },
  // descent begins
  { t: PHASES.fog, dist: 1.6, camX: 0.04, camY: 0.01, tgtX: -0.04, tgtY: 0.07, yaw: 0.98, pitch: 0.9, tilt: -0.04, clouds: 1 },
  // curvature revealed
  { t: PHASES.reveal, dist: 3.15, camX: 0, camY: 0.05, tgtX: 0.1, tgtY: 0.15, yaw: 0.42, pitch: 0.6, tilt: -0.25, clouds: 0.55 },
  // US final framing. tgtY was 0.3, which put the gold landmass low-right
  // in the frame (measured centroid y = 0.705) with empty ocean holding the
  // optical centre. The US is the hero image of this section and the thing
  // the exit follows off the world, so the framing is raised to sit it near
  // frame centre; the reveal keyframe moves with it so the descent does not
  // swing.
  { t: PHASES.arrival, dist: 2.35, camX: 0, camY: 0.02, tgtX: 0.05, tgtY: -0.1, yaw: 0.14, pitch: 0.68, tilt: -0.44, clouds: 0.45 },
  // hold through ignition + landing
  { t: 1.0, dist: 2.35, camX: 0, camY: 0.02, tgtX: 0.05, tgtY: -0.1, yaw: 0.14, pitch: 0.68, tilt: -0.44, clouds: 0.45 },
];

export const MOTION = {
  damping: 4.5,
} as const;

// Camera starts fog-immersed; the fog radius expands with scroll so the
// world emerges out of it. HERO DEVIATION from the lab tuning: the lab's
// opening was a mid-tone cloudscape (fine for a dark mid-page section); the
// hero's first frame must match the near-white DOM fog it crossfades under,
// so phase 1 is a denser, paper-tinted immersion (openColor/openFar) that
// hands off to the lab's blue-grey as the descent starts.
export const FOG = {
  openColor: "#e2e5e2", // near-white, paper-tinted — the DOM fog's tone
  openFar: 0.45, // deep immersion: the whole frame is fog at p=0
  cloudColor: "#93a7bb",
  bgColor: "#0b0b09",
  denseFar: 0.75,
  clearFar: 18,
  clearFrom: 0.12, // fog holds through phase 1, thins through the descent
  clearBy: 0.55, // fully clear as the reveal completes
  fogNear: 0.02,
  fogFar: 0.5,
} as const;

export const LIGHTING = {
  x: -3,
  y: 1.2,
  z: 3.2,
  endX: 1.6,
  endY: 1.1,
  endZ: 3.4,
  sunIntensity: 2.6,
  ambientIntensity: 0.25,
} as const;
