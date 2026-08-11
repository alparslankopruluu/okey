# Accessibility

*Read this when: building any interactive screen or custom component, and at every `/ship` run.*

## Vision

- Support Dynamic Type up to 200% enlargement (iOS default body size 17pt, minimum 11pt) — adopt Dynamic Type directly, or scale a custom UI proportionally.
- Contrast (HIG's AA table): text/icons ≤17pt at **any weight** → ≥4.5:1. Text ≥18pt (any weight) **or bold at any size** → ≥3:1 — bold/larger text needs *less* contrast, not more. Ship a higher-contrast variant for Increase Contrast; verify in both light and dark.
- Never rely on color alone to convey state — pair with shape, icon, or text (red/green and blue/orange are the common colorblind failure pairs).
- Prefer system/semantic colors — they auto-adapt to Increase Contrast and light/dark for free.
- Every interactive element and icon-only control needs a VoiceOver label — no unlabeled tap targets.

## Hearing

- Never convey essential info through audio alone — provide on-screen captions/subtitles or a text equivalent for any narrated content.
- Pair audio cues (success chime, error sound) with haptics for anyone who can't hear them or has sound off.
- Add a visual cue alongside any audio cue that points to something off-screen or non-obvious.

## Mobility

- Control size: 44×44pt default, 28×28pt absolute minimum (iOS/iPadOS). Padding: ~12pt around bezeled controls, ~24pt around unbezeled.
- Prefer simple, standard gestures over custom multi-finger gestures for anything done frequently.
- Every swipe-only action needs a tap alternative — e.g. swipe-to-delete also needs an Edit-mode delete button; gestures alone exclude people with limited dexterity.
- Label elements properly for Voice Control and Switch Control; verify with Accessibility Inspector before release.

## Speech & interaction

- Support Full Keyboard Access for anyone navigating with an external keyboard; never override system-defined keyboard shortcuts.

## Cognitive

- Never auto-dismiss important UI on a timer alone — pair with an explicit dismiss action.
- Respect Reduce Motion (`docs/playbooks/design.md`) and Dim Flashing Lights for any video/animation content.
- **Require double confirmation for destructive, hard-to-reverse actions** (e.g. account deletion — `docs/playbooks/firebase.md` step 6) — one confirm is not enough.
- Keep flows simple and escapable; avoid locking people into a sequence they can't exit.

## ASC Accessibility Nutrition Labels

Declare the accessibility features your app actually supports (VoiceOver, Voice Control, Larger Text, Sufficient Contrast, etc.) at submission — keep in sync with what's actually true; cross-checked in `docs/checklists/release.md`'s pre-submission table.

## Automation split

| Claude automates | Human does |
|---|---|
| VoiceOver labels, Dynamic Type support, contrast checks against tokens, tap alternatives to gestures, double-confirm flows for destructive actions | Real-device testing with VoiceOver/Voice Control/Switch Control on; ASC Accessibility Nutrition Label submission |

*Source: developer.apple.com/design/human-interface-guidelines/accessibility.*
