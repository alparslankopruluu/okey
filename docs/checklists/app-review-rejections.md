# App Review Rejection Rulebook

*Read this when: creating a blueprint, preparing TestFlight/store metadata, or running release readiness.*

This is a living prevention system, not a claim that approval is guaranteed. Verify
the current Apple App Review Guidelines before every submission. Each new real rejection
must be anonymized and converted into a reproducible rule with evidence.

## Rule format

Add a row with: guideline, trigger, automated check, manual evidence, last verified
date, and status. Do not add anecdotes, app/user identifiers, reviewer names, or secret
screenshots. A waiver belongs in `docs/decisions.md` and requires explicit user approval.

## Factory gates

| Guideline/risk | Trigger | Automated check | Manual evidence | Last verified | Status |
|---|---|---|---|---|---|
| 2.1 completeness | crash, placeholder, dead endpoint, gated reviewer path | clean build/tests; IPv6-safe network behavior; links and backend health; no TODO/sample data | current TestFlight smoke on target devices; review path/account | 2026-07-10 | baseline |
| 2.3 accurate metadata | screenshot/copy claims absent behavior or prohibited creative | metadata-feature matrix; real UI; no prices/discounts/URLs/other-platform marks/Apple recognition/unverifiable claims/real-person data; 4+ creative gate | first-three screenshot and exact-build truth check | 2026-08-09 | baseline |
| 3.1.1 digital goods | external purchase/payment routing | scan purchase URLs/copy; products mapped through StoreKit/RevenueCat | every package sandbox purchase | 2026-07-10 | baseline |
| 3.1.2 subscriptions | terms, price/period, renewal, trial, restore absent | paywall disclosure/link/restore assertions; ASC vs RC product/price audit | purchase and restore on fresh install | 2026-07-10 | baseline |
| 4.2 minimum functionality | thin wrapper/static/template | core action quality tests; offline/loading/error states | reviewer can complete valuable core loop | 2026-07-10 | baseline |
| 4.3 spam/copying | cloned name, icon, flow, store copy, template look | name collision/basic trademark check; asset originality; duplicate copy scan | approved original wedge/design artifact | 2026-07-10 | baseline |
| 5.1.1 privacy/account | unnecessary login, no deletion, broken policies | anonymous-first decision; deletion path/rules tests; live privacy/support URLs | delete account end-to-end; policy matches data use | 2026-07-10 | baseline |
| 5.1.2 data use | labels/SDK behavior mismatch | SDK and permission inventory; privacy manifest/label diff | ASC App Privacy review | 2026-07-10 | baseline |
| ATT mismatch | tracking behavior and prompt/labels disagree | SDK/config/endpoint scan; ATT branch tests | device prompt/label confirmation | 2026-07-10 | baseline |
| Sign in with Apple | third-party login offered without Apple | provider inventory test | login/link/re-auth/delete flow | 2026-07-10 | baseline |
| Health 1.4.1 | unsupported sensor diagnosis/measurement claim | blocked-claim scan in UI/metadata | validated methodology or claim removed | 2026-07-10 | baseline |
| Kids/safety | children, UGC, sensitive advice | audience/content/SDK/ads moderation checklist | age rating and safeguards reviewed | 2026-07-10 | baseline |
| Export compliance | encryption declaration inconsistent | plist/build/ASC declaration diff | owner confirms actual cryptography use | 2026-07-10 | baseline |
| IAP readiness | missing localization, availability, price, review media | `asc validate iap`; `asc validate subscriptions`; catalog readback | products visible and purchasable in sandbox | 2026-07-10 | baseline |
| Store completeness | missing privacy, age, screenshots, content rights, review info | `asc validate --strict`; `asc review doctor`; metadata and screenshot validation | web-only App Privacy/age fields confirmed | 2026-07-10 | baseline |
| Accessibility | inaccessible core/reviewer flow | automated accessibility tests and checklist | VoiceOver/Dynamic Type/contrast device pass | 2026-07-10 | baseline |

## Blueprint category-risk routing

Record flags in `docs/security-model.md`; every active flag adds its checks before build
and release. `none` is valid only after the data, claims, audience, and SDK inventory is reviewed.

| Flag | Trigger | Required extra evidence |
|---|---|---|
| health | diagnosis, treatment, measurement, HealthKit, wellness claims | claim/source matrix, safety disclaimer, methodology/device capability, HealthKit purpose/data use |
| kids | child audience/content/account/data | age band, parental gate, SDK/ads/data minimization and content safeguards |
| UGC | users publish/share content or contact others | report/block/moderation, abuse response, contact/privacy controls |
| AI | user data leaves app or generated advice/content is shown | provider/data disclosure, consent, safety limits, failure/low-confidence behavior |
| finance | financial guidance, accounts, trading, lending, or money movement | authorization/region limits, claim review, risk disclosure, no misleading outcome promise |
| sensitive-data | precise location, biometrics, contacts, photos, health, identity | necessity, least privilege, retention/deletion, permission and privacy-label parity |

The category pass also produces four artifacts: metadata-feature matrix, complete
permission inventory, SDK/data-to-privacy-label diff, and a reviewer journey with any
demo account/setup. A critical unresolved legal/safety/review risk makes the opportunity
decision `no_go`; the factory cannot waive it by lowering the score.

## Mandatory pre-TestFlight checks

- No secrets, debug menus, test endpoints, sample credentials, placeholder/legal URLs,
  or development Firebase/R2 target in the production build.
- App launches after fresh install, survives offline/slow/failure states, and exposes
  a useful core path without unnecessary registration.
- All selected locale strings, permission reasons, paywall copy, metadata, IAP names,
  and screenshots exist; Arabic RTL and truncation are visually checked.
- Weekly/annual product IDs equal RevenueCat store identifiers; `pro`, offerings,
  packages, price, availability, and trial terms reconcile by readback.
- Privacy/terms/support URLs return 200 over HTTPS and describe actual data, account
  deletion, subscription terms, and contact route.
- Screenshot features exist in the uploaded build; icon/name/metadata are original.
- Icon Composer, when used, has verified macOS/Xcode/tool versions, Default/Dark/Mono,
  small-size legibility, and Xcode integration; otherwise the opaque 1024x1024 sRGB
  fallback is used.
- Metadata-feature matrix, permission inventory, privacy-label diff, reviewer journey,
  and category-specific evidence match the exact uploaded build.

## Mandatory pre-review checks

Internal TestFlight is not review submission. Before a separately approved submission:

1. Complete a 24–48 hour internal soak and the device-only purchase/restore/delete tests.
2. Run `/ship`, `asc validate --strict`, `asc review doctor`, digital-goods validation,
   security, performance, accessibility, and metadata/assets checks.
3. Confirm Agreements, Tax, Banking, age rating, App Privacy, content rights, export
   compliance, review contact, demo path/account, and notes in App Store Connect.
4. Ensure no approved blueprint assumption changed after the TestFlight build.
5. Obtain explicit user approval for the exact version/build review submission.

## Learning loop

After a rejection, save only anonymized facts: guideline/message summary, build/version,
trigger, root cause, fix, regression check, and verification date. Add or strengthen one
automated check; link its evidence. Never encode a workaround that misleads review or
weakens privacy, security, payment, or product quality.

Primary sources: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app).
