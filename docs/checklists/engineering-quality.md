# Engineering Quality

*Read before changing architecture or a core flow, and at every `/ship`. Apply SOLID at change/test boundaries; do not manufacture abstractions.*

## Structure and dependencies

- Feature modules depend inward on domain/service contracts; provider SDKs stay behind one façade.
- SwiftUI services that cross a network/provider boundary are protocol-backed and injected. Expo services expose strict typed functions/hooks; screens never call provider SDKs directly.
- Views/components render state and send intents. Business rules, purchases, persistence, retries, and analytics orchestration live outside the view.
- Reuse before adding. Promote a helper only when a second consumer proves the shared abstraction.
- A one-implementation leaf helper does not need an interface merely to look “SOLID.”

## Resilience contract

- Define typed errors users and telemetry can distinguish; never expose raw provider errors or secrets.
- Every network operation has cancellation and a documented timeout. Retry only idempotent/transient operations with a cap and backoff.
- External mutations use stable idempotency keys or audit/readback protection where supported.
- Core screens have loading, empty, offline, permission-denied, partial-data, and recoverable error behavior in `docs/product-map.md`.
- Firestore/model schema changes include backward compatibility, migration/read repair, and rollback notes in `docs/data-model.md`/`docs/decisions.md`.

## Verification and operations

- Unit-test domain rules and ViewModels/hooks with mocked boundaries; integration-test rules/functions/adapters; E2E-test onboarding → paywall → purchase/restore and the core loop.
- CI runs build, lint/format check, typecheck/compile, tests, locale parity, secret scan, and applicable Firebase rules tests.
- Crashlytics and performance traces identify release/build and sanitized operation names; no PII, tokens, request bodies, or raw provider output.
- Verify dependency audit, pinned lockfiles/resolved packages, privacy manifests, permission inventory, and unused dependency/permission removal.
- Verify dependency vulnerability output and permission/privacy-manifest drift against
  the exact release lockfile/build, not only package declarations.
- Exercise slow/offline/provider-failure paths and confirm a useful degraded state before release.

## Release gate

Any failure above blocks `/ship` unless the user records a scoped, dated waiver in
`docs/decisions.md` with impact, mitigation, owner, and expiry.
