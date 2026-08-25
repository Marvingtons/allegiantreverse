import * as THREE from "three";
import statesGeo from "@/lib/geo/us-states.geo.json";

/**
 * Static data map for the GPU gold-foil overlay — baked exactly ONCE at
 * startup. Borders are NOT in here any more (they're Line2 geometry now, see
 * StateBorders.tsx); this map only drives the fill, its coastline glow, and
 * the outer halo.
 *
 * Channel encoding (RGBA DataTexture — raw bytes, no canvas premultiply):
 *   R = per-state wave delay. Outside the union R carries the NEAREST
 *       boundary state's delay (propagated by the distance transform) so the
 *       outer halo ignites in sync with the state it hugs.
 *   G = fill mask for the 48 served states. Polygons are filled AND stroked
 *       with the same color so the union has no hairline seams, then the
 *       non-served states are punched back out.
 *   B = signed distance field measured from the UNION boundary only
 *       (128 = boundary, >128 inside, <128 outside). Seeding at interior
 *       state lines would carve valleys along every border and fire the
 *       inner glow there — the field must be a smooth plateau inside, so the
 *       glow hugs the coastline alone.
 *   A = state ID, 23 + index*4 (unused by the shader; kept for hover picking)
 *
 * The ID raster that seeds the distance field comes from a scanline
 * rasterizer, NOT the canvas: canvas antialiasing smears borders into a 2–3
 * texel ramp of bogus intermediate ids.
 */

const W = 2048;
const H = 1024;
export const FADE = 0.12; // each state's fade-in window, in wave units
const NOT_SERVED = new Set(["Hawaii", "Iowa"]);
const SDF_RANGE_PX = 20; // distance field saturates at this many texels
const MIN_RING_AREA = 5; // px² — cull sub-texel islands (they bead the coast)

interface Feature {
  properties: { name: string; centroid: [number, number] };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
}

type Ring = Float64Array<ArrayBuffer>; // x0,y0,x1,y1,... projected

function projectRings(f: Feature): Ring[][] {
  const polys =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates as number[][][]]
      : (f.geometry.coordinates as number[][][][]);
  return polys.map((poly) =>
    poly
      .map((ring) => {
        const r = new Float64Array(ring.length * 2);
        let area = 0;
        for (let j = 0; j < ring.length; j++) {
          const [x, y] = project(ring[j][0], ring[j][1]);
          r[j * 2] = x;
          r[j * 2 + 1] = y;
        }
        for (let j = 0; j < ring.length; j++) {
          const k = (j + 1) % ring.length;
          area += r[j * 2] * r[k * 2 + 1] - r[k * 2] * r[j * 2 + 1];
        }
        return Math.abs(area / 2) < MIN_RING_AREA ? null : r;
      })
      .filter((r): r is Ring => r !== null)
  );
}

// Even-odd scanline fill of one polygon (outer ring + holes) into ids[]
function fillPolygon(ids: Uint8Array, rings: Ring[], id: number): void {
  if (!rings.length) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const r of rings) {
    for (let j = 1; j < r.length; j += 2) {
      if (r[j] < minY) minY = r[j];
      if (r[j] > maxY) maxY = r[j];
    }
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(H - 1, Math.ceil(maxY));
  const xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    xs.length = 0;
    for (const r of rings) {
      const n = r.length / 2;
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n;
        const ay = r[j * 2 + 1];
        const by = r[k * 2 + 1];
        if (ay <= yc !== by <= yc) {
          const ax = r[j * 2];
          const bx = r[k * 2];
          xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
        }
      }
    }
    xs.sort((a, b) => a - b);
    for (let s = 0; s + 1 < xs.length; s += 2) {
      const px0 = Math.max(0, Math.ceil(xs[s] - 0.5));
      const px1 = Math.min(W - 1, Math.floor(xs[s + 1] - 0.5));
      for (let x = px0; x <= px1; x++) ids[y * W + x] = id;
    }
  }
}

function toPath(rings: Ring[][]): Path2D {
  const path = new Path2D();
  for (const poly of rings) {
    for (const r of poly) {
      for (let j = 0; j < r.length; j += 2) {
        if (j === 0) path.moveTo(r[0], r[1]);
        else path.lineTo(r[j], r[j + 1]);
      }
      path.closePath();
    }
  }
  return path;
}

export function buildStatesDataMap(): THREE.DataTexture {
  const t0 = performance.now();
  const features = (statesGeo as unknown as { features: Feature[] }).features;

  const lonList = features
    .filter((f) => f.properties.name !== "Hawaii")
    .map((f) => f.properties.centroid[0]);
  const minLon = Math.min(...lonList);
  const maxLon = Math.max(...lonList);

  const delay8: number[] = [];
  const served: boolean[] = [];
  const allRings: Ring[][][] = [];
  features.forEach((f, i) => {
    const t = THREE.MathUtils.clamp(
      (f.properties.centroid[0] - minLon) / (maxLon - minLon),
      0,
      1
    );
    delay8[i] = Math.round(t * (1 - FADE) * 255);
    served[i] = !NOT_SERVED.has(f.properties.name);
    allRings[i] = projectRings(f);
  });

  // 1) Canvas raster for R (delay) and G (mask — its AA coast ramp is wanted,
  //    the shader smoothsteps it). Fill, then stroke with the SAME color so
  //    adjacent polygons share no hairline gap, then punch out non-served.
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  const paths = features.map((_, i) => toPath(allRings[i]));
  features.forEach((_, i) => {
    const col = `rgb(${delay8[i]},${served[i] ? 255 : 0},0)`;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.fill(paths[i]);
    ctx.stroke(paths[i]); // closes seams between neighbours
  });
  // Non-served states get their mask back to 0 (their neighbours' seam
  // strokes bled 2px in). Delay channel is redrawn with mask 0.
  features.forEach((_, i) => {
    if (served[i]) return;
    ctx.fillStyle = `rgb(${delay8[i]},0,0)`;
    ctx.fill(paths[i]);
  });
  const src = ctx.getImageData(0, 0, W, H).data;

  // 2) Crisp ID raster (scanline, no AA). 0 = background.
  const N = W * H;
  const ids = new Uint8Array(N);
  features.forEach((_, i) => {
    for (const poly of allRings[i]) fillPolygon(ids, poly, 23 + i * 4);
  });

  // 3) Seed the SDF at the UNION boundary only — in-union vs background.
  //    Interior state lines are deliberately NOT seeded.
  const CH = 3; // chamfer orthogonal step (3-4 chamfer)
  const CD = 4;
  const dist = new Float32Array(N).fill(1e9);
  const delayLbl = new Uint8Array(N);
  const stateIndexOfId = (id: number) => (id - 23) / 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const aIn = ids[i] !== 0;
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        const bIn = ids[n] !== 0;
        if (aIn === bIn) continue;
        const stateId = aIn ? ids[i] : ids[n];
        const delay = delay8[stateIndexOfId(stateId)] ?? 0;
        for (const p of [i, n]) {
          if (dist[p] > CH / 2) {
            // border sits BETWEEN the two pixels — half a texel from each
            dist[p] = CH / 2;
            delayLbl[p] = delay;
          }
        }
      }
    }
  }

  // 4) Two-pass chamfer distance transform, propagating the delay label
  const relax = (i: number, n: number, w: number) => {
    if (dist[n] + w < dist[i]) {
      dist[i] = dist[n] + w;
      delayLbl[i] = delayLbl[n];
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x > 0) relax(i, i - 1, CH);
      if (y > 0) {
        relax(i, i - W, CH);
        if (x > 0) relax(i, i - W - 1, CD);
        if (x < W - 1) relax(i, i - W + 1, CD);
      }
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (x < W - 1) relax(i, i + 1, CH);
      if (y < H - 1) {
        relax(i, i + W, CH);
        if (x < W - 1) relax(i, i + W + 1, CD);
        if (x > 0) relax(i, i + W - 1, CD);
      }
    }
  }

  // 5) Compose RGBA (rows flipped: DataTexture v=0 is the bottom row)
  const out = new Uint8Array(N * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const si = y * W + x;
      const oi = ((H - 1 - y) * W + x) * 4;
      const inside = ids[si] !== 0;
      const dPx = Math.min(dist[si] / CH / SDF_RANGE_PX, 1) * 127;
      out[oi + 0] = inside ? src[si * 4] : delayLbl[si];
      out[oi + 1] = src[si * 4 + 1];
      out[oi + 2] = Math.round(inside ? 128 + dPx : 128 - dPx);
      out[oi + 3] = ids[si];
    }
  }

  const texture = new THREE.DataTexture(out, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace; // data, not color
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping; // no antimeridian seam
  texture.needsUpdate = true; // the one and only upload

  const probe = (name: string) => {
    const f = features.find((x) => x.properties.name === name);
    if (!f) return null;
    const [px, py] = project(f.properties.centroid[0], f.properties.centroid[1]);
    const oi = ((H - 1 - Math.round(py)) * W + Math.round(px)) * 4;
    return Array.from(out.slice(oi, oi + 4));
  };
  // Kansas/Nebraska share a border: their SDF (index 2) must both be a high
  // plateau — a dip there would mean the field is still seeded interior.
  console.log(
    `[globe-lab] states data map baked once: ${features.length} states, ${W}x${H}, ` +
      `${Math.round(performance.now() - t0)}ms`,
    { kansas: probe("Kansas"), nebraska: probe("Nebraska"), iowa: probe("Iowa") }
  );
  return texture;
}
