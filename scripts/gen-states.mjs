// Build-time helper: converts us-atlas states-albers-10m topojson into the
// static path data baked into lib/states.ts. Run with `node scripts/gen-states.mjs`.
//
// The map is inlined as SVG (no runtime fetch, no client-side topojson), so the
// geometry is simplified first — at ~975px wide the 10m detail is invisible and
// only costs bundle weight.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { presimplify, simplify } from "topojson-simplify";
import { geoPath, geoIdentity } from "d3-geo";

const topo = simplify(
  presimplify(
    JSON.parse(readFileSync("node_modules/us-atlas/states-albers-10m.json", "utf8"))
  ),
  0.6 // min triangle area in projected px² — keeps coastlines readable
);
const fc = feature(topo, topo.objects.states);

// us-atlas albers files are pre-projected into a 975 x 610 frame.
const path = geoPath(geoIdentity());

// FIPS ids we don't render: DC (11) is invisible at this scale, PR (72) sits
// outside the coverage claim.
const SKIP = new Set(["11", "72"]);

const round = (d) => d.replace(/-?\d+\.?\d*/g, (n) => String(Math.round(Number(n) * 10) / 10));

const rows = fc.features
  .filter((f) => !SKIP.has(String(f.id)))
  .map((f) => {
    const [cx, cy] = path.centroid(f);
    return {
      id: String(f.id),
      name: f.properties.name,
      d: round(path(f)),
      cx: Math.round(cx * 10) / 10,
      cy: Math.round(cy * 10) / 10,
    };
  })
  // west -> east, so the fill wave in CoverageMap is just source order
  .sort((a, b) => a.cx - b.cx);

console.log(`states: ${rows.length}, path bytes: ${rows.reduce((n, r) => n + r.d.length, 0)}`);
writeFileSync("scripts/.states.json", JSON.stringify(rows));
