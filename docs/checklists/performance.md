# Performance Checklist

*Read this when: writing lists, images, animations, or startup code — and at every `/ship` run.*

## Budgets (hard numbers, measured before release)

| Budget | Target |
|---|---|
| Cold start → first interactive frame | < 2.0s on oldest supported device |
| Onboarding first screen after launch screen | < 1s |
| Dropped frames on the money path (onboarding + paywall) | zero — no jank, no layout shift |
| Paywall render | instant — offerings prefetched at onboarding start |
| App download size | < 100MB target; investigate anything > 150MB |
| Crash-free sessions | ≥ 99.5% before widening phased release |
| Memory | no leaks on the 5 most-used screens |

## Expo RN rules

- New Architecture only (legacy removed in SDK 55; templates target SDK 56+). Run `npx expo-doctor` before ADDING any dependency — incompatible libs are a scope question, not a workaround question.
- Lists >20 items: **FlashList v2** (New-Arch only; no `estimatedItemSize` — removed in v2; masonry via the `masonry` prop). Never `.map()` long arrays inside a ScrollView.
- Images: `expo-image` everywhere — disk/memory cache, `placeholder` (blurhash), `priority`. Serve correctly-sized sources (no 4K originals into thumbnails); prefer WebP assets.
- Animations: `react-native-reanimated` on the UI thread. No JS-driven `Animated` on the money path.
- Startup: root layout stays light; defer heavy init behind first paint — EXCEPT `Purchases.configure` + Remote Config bundled defaults (must be ready pre-paywall).
- Release builds strip `console.log` (babel plugin) — committed logs are a forbidden pattern anyway.
- Measure: Firebase Performance custom traces (`app_start_to_onboarding`), React DevTools profiler for re-render storms.

## SwiftUI rules

- No synchronous network/disk in `App.init` or the first `body`. Non-critical SDK init defers to `.task` after first frame.
- Long content: `List` / `LazyVStack` in `ScrollView`; stable `Identifiable` IDs; no `AnyView` in hot paths; decompose bodies >~50 lines.
- Images: `AsyncImage` only for low volume; feeds use a caching loader and ImageIO downsampling (`kCGImageSourceThumbnailMaxPixelSize`) — never full-res `UIImage` into thumbnails.
- Watch `@Observable` / `ObservableObject` over-invalidation (view redraw storms) — scope observation narrowly.
- Timeline/looping animations on paywall backgrounds burn CPU — budget them.
- App size: SF Symbols over bundled icons, asset catalog compression, audit large SPM deps.
- Measure: Xcode Organizer launch metrics, MetricKit (`MXAppLaunchMetric`), Instruments for leaks.

## Firestore listeners

- Detach every snapshot listener when its screen disappears — **SwiftUI:** remove the `ListenerRegistration` in `.onDisappear`; **Expo RN:** call the `onSnapshot` unsubscribe function. An undetached listener leaks memory and keeps billing reads.
- Prefer a one-shot fetch (`getDocument`/`getDocs`) over a live listener for any screen that doesn't need real-time updates.

## Pre-release procedure (record results in the `/ship` report)

1. Cold start ×3 on the oldest supported simulator + one physical device — record median.
2. Scroll the main list 30s with FPS overlay/Instruments — record drops.
3. Fresh install → onboarding → paywall: verify zero spinner on paywall (prefetch working).
4. Record download size from the size report / EAS artifact.
5. Compare all numbers to the budget table; any breach blocks release until waived by the user.
