import { useEffect, useMemo, type MutableRefObject } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import borders from "@/lib/geo/us-borders.geo.json";
import { latLngToVec3 } from "./latLng";

/**
 * Real line GEOMETRY for state borders — resolution-independent, so the
 * hairlines stay 1px-crisp at any camera distance. (Texture-derived edges
 * cannot: past the data map's texel density they blur into bands.)
 *
 * Polylines come from `topojson.mesh` at build time, which dedupes shared
 * arcs — every border is drawn exactly once, so no segment renders doubled
 * or darker where two states meet:
 *   exterior = (a === b) → coastline + Canada/Mexico border
 *   interior = (a !== b) → shared state lines only
 *
 * Iowa and Hawaii need no special batch: Iowa's rings are all shared arcs
 * (already in `interior`) and Hawaii's islands are unshared (already in
 * `exterior`). Adding a third batch for them would double-draw those arcs.
 */

const RADIUS = 1.0042; // just above the fill overlay (1.0028) — never z-fights

type Lines = [number, number][][];

function toSegments(lines: Lines): Float32Array {
  // LineSegmentsGeometry consumes consecutive PAIRS as independent segments
  let n = 0;
  for (const l of lines) n += Math.max(0, l.length - 1);
  const out = new Float32Array(n * 6);
  let o = 0;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = latLngToVec3(line[i][1], line[i][0], RADIUS);
      const b = latLngToVec3(line[i + 1][1], line[i + 1][0], RADIUS);
      out[o++] = a.x; out[o++] = a.y; out[o++] = a.z;
      out[o++] = b.x; out[o++] = b.y; out[o++] = b.z;
    }
  }
  return out;
}

export interface BorderHandles {
  exterior: LineMaterial;
  interior: LineMaterial;
}

export function useStateBorders(matsRef: MutableRefObject<BorderHandles | null>) {
  const size = useThree((s) => s.size);

  const { extLine, intLine, mats } = useMemo(() => {
    const data = borders as unknown as { exterior: Lines; interior: Lines };

    const make = (lines: Lines, color: string, linewidth: number, opacity: number) => {
      const geo = new LineSegmentsGeometry();
      geo.setPositions(toSegments(lines));
      const mat = new LineMaterial({
        color: new THREE.Color(color),
        linewidth, // in screen pixels (worldUnits: false)
        worldUnits: false,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: true,
      });
      const line = new LineSegments2(geo, mat);
      line.computeLineDistances();
      line.frustumCulled = false;
      return { line, mat };
    };

    const ext = make(data.exterior, "#efd9a7", 1.6, 0.95);
    const int = make(data.interior, "#c9a45c", 1.0, 0.5);
    return {
      extLine: ext.line,
      intLine: int.line,
      mats: { exterior: ext.mat, interior: int.mat } as BorderHandles,
    };
  }, []);

  // LineMaterial REQUIRES an up-to-date resolution or screen-space widths break
  useEffect(() => {
    mats.exterior.resolution.set(size.width, size.height);
    mats.interior.resolution.set(size.width, size.height);
  }, [mats, size.width, size.height]);

  useEffect(() => {
    matsRef.current = mats;
    return () => {
      matsRef.current = null;
    };
  }, [mats, matsRef]);

  useEffect(
    () => () => {
      for (const l of [extLine, intLine]) {
        l.geometry.dispose();
        (l.material as LineMaterial).dispose();
      }
    },
    [extLine, intLine]
  );

  return (
    <>
      <primitive object={extLine} />
      <primitive object={intLine} />
    </>
  );
}
