#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source_image="$repo_root/assets/game/avatar-atlas.png"
output_dir="$repo_root/assets/game/avatars/v2"

mkdir -p "$output_dir"

# The atlas is a regular 4 x 3 grid. Each crop is an equal 300 px square
# centered on the original illustrated medallion, then normalized to 512 px.
x_offsets=(120 501 882 1263)
y_offsets=(30 320 610)
index=1

for y in "${y_offsets[@]}"; do
  for x in "${x_offsets[@]}"; do
    printf -v filename 'avatar-%02d.png' "$index"
    magick "$source_image" \
      -crop "300x300+${x}+${y}" +repage \
      -filter Lanczos -resize 512x512 \
      -strip "$output_dir/$filename"
    index=$((index + 1))
  done
done

for row in 0 1 2; do
  first=$((row * 4 + 1))
  printf -v a '%s/avatar-%02d.png' "$output_dir" "$first"
  printf -v b '%s/avatar-%02d.png' "$output_dir" "$((first + 1))"
  printf -v c '%s/avatar-%02d.png' "$output_dir" "$((first + 2))"
  printf -v d '%s/avatar-%02d.png' "$output_dir" "$((first + 3))"
  magick "$a" "$b" "$c" "$d" +append "$output_dir/.row-$row.png"
done
magick "$output_dir/.row-0.png" "$output_dir/.row-1.png" "$output_dir/.row-2.png" -append "$output_dir/contact-sheet.png"
rm "$output_dir"/.row-*.png
