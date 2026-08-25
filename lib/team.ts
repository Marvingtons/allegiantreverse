/**
 * Leadership roster — real names, titles, and tenure from the ARS leadership
 * page. Titles are load-bearing: brokers know these people, so they are
 * transcribed exactly rather than shortened to fit the layout.
 *
 * Array order is display order, and it is deliberate — order of importance,
 * not alphabetical. Do not sort it.
 *
 * Note on dates: ARS was founded in 2016. "Since 2003" anywhere on this site
 * refers to how long the team has worked in reverse, which predates the
 * company. The two are easy to conflate and the copy is careful not to.
 */

export type TeamMember = {
  /** matches /public/team/team-{id}-{treatment}.webp */
  id: string;
  first: string;
  last: string;
  title: string;
  /** mono tag under the role — the hook stat */
  tenureTag: string;
  /**
   * Renders the tag in --stamp. Stored rather than derived: it marks entry into
   * the industry before 2003, which no single numeric field on this type
   * expresses (one member's tag is "30+ YEARS", not a year at all).
   */
  tenureAccent: boolean;
  /** one sentence, spoken register */
  bio: string;
};

export const team: TeamMember[] = [
  {
    id: "2726",
    first: "Rob",
    last: "Awalt",
    title: "Founder & President",
    tenureTag: "IN REVERSE SINCE 2003",
    tenureAccent: true,
    bio: "Founded ARS in 2016 after two decades in title — and an NFL career before that. NRMLA board member since 2020.",
  },
  {
    id: "2684",
    first: "Tina",
    last: "Meilinger",
    title: "Senior Vice President, Risk & Escalations",
    tenureTag: "IN TITLE SINCE 1981",
    tenureAccent: true,
    bio: "Forty-five years in title and settlement. Chairs the Risk & Compliance Committee and sits on the NRMLA Board of Directors.",
  },
  {
    id: "2712",
    first: "Megan",
    last: "Awalt",
    title: "Senior Vice President, Client Strategy",
    tenureTag: "IN REVERSE SINCE 2007",
    tenureAccent: false,
    bio: "Runs client strategy and partnerships — the person lenders call, and a regular speaker at national conferences.",
  },
  {
    id: "2791",
    first: "Adan",
    last: "Gutierrez",
    title: "Assistant Vice President, Director of Operations",
    tenureTag: "IN REVERSE SINCE 2009",
    tenureAccent: false,
    bio: "Leads Client Solutions and daily operations, and has trained closers across the industry on reverse title complexity.",
  },
  {
    id: "2768",
    first: "Carrie",
    last: "Martinez",
    title: "Director of Production",
    tenureTag: "IN TITLE SINCE 1993",
    tenureAccent: true,
    bio: "Oversees production operations — three decades of title, escrow, and vendor management behind every workflow.",
  },
  {
    id: "2785",
    first: "Jake",
    last: "Poindexter",
    title: "Funding & Audit Department Manager",
    tenureTag: "IN REVERSE SINCE 2007",
    tenureAccent: false,
    bio: "Helped launch ARS in 2016. His team audits every executed document and disburses lender proceeds — he also authored a CRMP-certified webinar on wire fraud prevention.",
  },
  {
    id: "2761",
    first: "Nicole",
    last: "Sheldon",
    title: "Support Services Group Manager",
    tenureTag: "30+ YEARS IN TITLE",
    tenureAccent: true,
    bio: "Thirty years across title and escrow, bridging IT systems and financial operations for the whole desk.",
  },
];

export const fullName = (p: TeamMember) => `${p.first} ${p.last}`;

/** Portrait alt text. Same string for both layers and both layouts. */
export const portraitAlt = (p: TeamMember) => `${fullName(p)}, ${p.title}`;

/** Resting layer: luma on an ink -> warm-grey ramp. See scripts/build-portraits.sh. */
export const duotoneSrc = (p: TeamMember) => `/team/team-${p.id}-duotone.webp`;

/** Active layer: the colour photograph, faded in as the person "arrives". */
export const archivalSrc = (p: TeamMember) => `/team/team-${p.id}-archival.webp`;
