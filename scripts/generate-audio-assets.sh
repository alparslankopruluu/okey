#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
audio_dir="$repo_root/assets/audio"
mkdir -p "$audio_dir/effects" "$audio_dir/ambient" "$audio_dir/music"

ffmpeg_bin="${FFMPEG_BIN:-ffmpeg}"
common=(-hide_banner -loglevel error -y)

# Short, quiet, deterministic UI effects. No sampled or third-party recordings.
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=420:duration=0.12" -af "afade=t=out:st=0.04:d=0.08,volume=0.18" "$audio_dir/effects/tile-pickup.wav"
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=760:duration=0.035" -f lavfi -i "sine=frequency=330:duration=0.13" -filter_complex "[0:a]volume=0.12[a];[1:a]afade=t=out:st=0.03:d=0.10,volume=0.16[b];[a][b]amix=inputs=2" "$audio_dir/effects/tile-discard.wav"
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=520:duration=0.18" -af "tremolo=f=9:d=0.35,afade=t=out:st=0.08:d=0.10,volume=0.14" "$audio_dir/effects/meld-open.wav"
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=230:duration=0.24" -af "tremolo=f=7:d=0.5,afade=t=out:st=0.12:d=0.12,volume=0.12" "$audio_dir/effects/rule-warning.wav"
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=660:duration=0.28" -f lavfi -i "sine=frequency=880:duration=0.28" -filter_complex "[0:a]afade=t=out:st=0.16:d=0.12,volume=0.10[a];[1:a]adelay=70|70,afade=t=out:st=0.16:d=0.12,volume=0.08[b];[a][b]amix=inputs=2" "$audio_dir/effects/gift-arrival.wav"
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=523:duration=0.48" -f lavfi -i "sine=frequency=659:duration=0.48" -f lavfi -i "sine=frequency=784:duration=0.48" -filter_complex "[0:a]volume=0.07[a];[1:a]adelay=90|90,volume=0.06[b];[2:a]adelay=180|180,afade=t=out:st=0.30:d=0.18,volume=0.05[c];[a][b][c]amix=inputs=3" "$audio_dir/effects/win.wav"

# A two-second synthetic cafe texture: filtered noise, cup-like ping, no speech.
"$ffmpeg_bin" "${common[@]}" -f lavfi -i "anoisesrc=color=pink:seed=20260812:duration=2" -f lavfi -i "sine=frequency=1180:duration=0.12" -filter_complex "[0:a]lowpass=f=900,highpass=f=110,volume=0.018[n];[1:a]adelay=650|650,afade=t=out:st=0.02:d=0.10,volume=0.025[p];[n][p]amix=inputs=2,afade=t=in:d=0.25,afade=t=out:st=1.65:d=0.35" "$audio_dir/ambient/cafe-murmur.wav"

# Three calm development loops; final release music remains a human review TODO.
for spec in "196:294:quiet-orbit" "174:261:pearl-current" "147:220:midnight-luma"; do
  IFS=: read -r low high name <<< "$spec"
  "$ffmpeg_bin" "${common[@]}" -f lavfi -i "sine=frequency=${low}:duration=12" -f lavfi -i "sine=frequency=${high}:duration=12" -filter_complex "[0:a]tremolo=f=0.10:d=0.20,volume=0.020[a];[1:a]tremolo=f=0.10:d=0.12,volume=0.012[b];[a][b]amix=inputs=2,afade=t=in:d=1.5,afade=t=out:st=10.5:d=1.5" "$audio_dir/music/${name}.wav"
done
