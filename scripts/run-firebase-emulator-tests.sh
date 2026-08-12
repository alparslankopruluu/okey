#!/usr/bin/env bash
set -euo pipefail

if [[ -x /usr/libexec/java_home ]]; then
  firebase_java_home="$(/usr/libexec/java_home -v 21+ 2>/dev/null || true)"
else
  firebase_java_home=""
fi

if [[ -z "$firebase_java_home" ]]; then
  for candidate in /Library/Java/JavaVirtualMachines/temurin-23.jdk/Contents/Home /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home; do
    if [[ -x "$candidate/bin/java" ]]; then firebase_java_home="$candidate"; break; fi
  done
fi

if [[ -z "$firebase_java_home" ]]; then
  echo "Firebase CLI requires JDK 21 or newer for emulator tests." >&2
  exit 1
fi

export JAVA_HOME="$firebase_java_home"
export PATH="$JAVA_HOME/bin:$PATH"

firebase emulators:exec \
  --project demo-luma-okey \
  --config firebase/firebase.json \
  --only firestore \
  "vitest run --config firebase/vitest.config.mts"
