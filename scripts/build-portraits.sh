#!/usr/bin/env bash
# Builds the two portrait layers the leadership section stacks, from the
# original square studio JPEGs in .assets-src/.
#
#   team-<id>-duotone.webp   resting state: luma mapped onto an ink -> warm-grey
#                            ramp, so the frame reads as archival and holds a
#                            defined edge against --paper
#   team-<id>-archival.webp  active state: the colour photograph, lightly graded
#
# Both are cropped 3:4 from the square source (sides trimmed, full height) to
# match the 46vw x 100vh desktop frame.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=.assets-src
OUT=public/team
mkdir -p "$OUT"

# Duotone ramp endpoints, sampled from the palette: near-black warm shadow,
# warm mid-grey highlight. Kept below paper so paper-white type reads over it.
SH_R=20; SH_G=20; SH_B=15
HI_R=168; HI_G=163; HI_B=151

W=1400
H=1867

for f in "$SRC"/*.jpeg; do
  id=$(basename "$f" | grep -oE '2684|2712|2726|2761|2768|2785|2791')
  [ -n "$id" ] || continue

  ffmpeg -v error -y -i "$f" \
    -vf "crop=ih*3/4:ih,scale=${W}:${H}:flags=lanczos,eq=saturation=1.06:contrast=1.03" \
    -c:v libwebp -quality 82 -compression_level 6 "$OUT/team-${id}-archival.webp"

  ffmpeg -v error -y -i "$f" \
    -vf "crop=ih*3/4:ih,scale=${W}:${H}:flags=lanczos,format=gray,format=rgb24,lut=r='${SH_R}+(${HI_R}-${SH_R})*val/255':g='${SH_G}+(${HI_G}-${SH_G})*val/255':b='${SH_B}+(${HI_B}-${SH_B})*val/255'" \
    -c:v libwebp -quality 82 -compression_level 6 "$OUT/team-${id}-duotone.webp"

  echo "built $id"
done
