# {{APP_NAME}}

<!-- app-factory shared router. Keep under 150 lines; load detailed docs JIT. -->

## 0. Verify instructions

Before code changes, read `PRODUCT.md` and `docs/stack.md`, then state
`Instructions verified.` If either is missing/unfilled, use `/new-app` for a blank
product or `/continue-app` for an established repository.

**Kit-root exception:** when `install.sh`, `docs/stack/swiftui.md`, and
`docs/stack/expo-rn.md` exist, read template `PRODUCT.md` plus both stack documents.
Placeholders are expected; never run `/new-app` in the kit root. Here `README.md`
owns current capabilities, `FUTURE-DASHBOARD.md` deferred product work, and git plus
`KIT_VERSION` release history.

## 1. Snapshot

| | |
|---|---|
| App | {{APP_NAME}} — {{ONE_LINE_PITCH}} |
| Target user | {{TARGET_USER}} |
| Core feature | {{CORE_FEATURE}} |
| Stack | {{STACK}} |
| Monetization | {{MONETIZATION_MODEL}} via RevenueCat (`pro`) |
| Firebase | {{APP_SLUG}}-dev / {{APP_SLUG}}-prod |
| Bundle ID / locales | {{BUNDLE_ID}} / {{LOCALES}} |

## 2. Scope and approvals

1. Work only in the current `docs/mvp-plan.md` milestone; put new ideas in
   `docs/backlog.md`.
2. New dependency, screen, or Firestore collection needs explicit approval.
3. Update the canonical owner immediately; do not copy facts across memory docs.
4. An approved `/factory-run` blueprint authorizes only its stated scope/dependencies/
   external writes. Unexpected or destructive diffs still stop.
5. Never ask users to choose a skill. Ask only for a product-direction, protected-file,
   cost, or external-write decision that changes authority.

## 3. Context router

For nontrivial work run `factoryctl context route --intent-stdin` first. It projects the
smallest matching capability using stack, stage, health, availability, and lexical score;
load that capability's playbook, tools, and skill only after selection. High confidence
selects automatically; low confidence gives the lead the three compact candidates for a
semantic choice. Do not load the full catalog or installed-extras list into agent context.

Then use `factoryctl context prepare` before handoff/checkpoint and `context audit` before
continuation. Read `docs/playbooks/context-engineering.md` for the capsule/receipt contract.
Use goal + relevant context + constraints + evidence + success criteria; increase reasoning
only when measured work needs it. Harness-injected tool schemas are opaque overhead: report
them when measurable, never claim they were removed. Do not add embedding, vector DB, or RAG.
For agent switches or malformed/stale packets use `factoryctl harness inspect|render|validate`
and the `harness-health` capability. Unknown fields fail closed; regenerate a malformed or
stale contract with a fresh capsule. Never retry a protected or external mutation.

If routing confidence is low, use the `external-skill-discovery` fallback and
`docs/playbooks/skill-discovery.md`; show at most three inspected candidates and install only
after exact source/skill/destination approval. When the user asks what the kit can do, what
comes next, or to open Factory Status, refresh compact recommendations and open
`scripts/open-factory-status.command --background --capabilities` without requiring a
command or skill name.

| Work | Read JIT |
|---|---|
| Start, continue, or run factory | `docs/playbooks/product-strategy.md` + `docs/playbooks/factory-run.md` + `docs/playbooks/context-engineering.md` |
| Delegate remote work | `docs/playbooks/remote-execution.md` + `docs/playbooks/context-engineering.md` |
| Agent handoff / malformed receipt | `docs/playbooks/context-engineering.md` + `.claude/commands/harness-health.md` |
| Explicit large fan-out / adversarial workflow | `docs/playbooks/dynamic-workflows.md` + `docs/playbooks/remote-execution.md` |
| Screens / design / motion | `docs/product-map.md` + `docs/playbooks/design.md` + `docs/checklists/motion-quality.md` |
| Auth, networking, storage, secrets | `docs/security-model.md` + `docs/checklists/security.md` |
| Firebase / analytics | `docs/data-model.md` + `docs/playbooks/firebase.md` + `docs/playbooks/analytics.md` |
| Paywall / pricing / purchases | `docs/playbooks/paywall.md` + `docs/playbooks/monetization.md` |
| Localization | `docs/playbooks/localization.md` |
| Lists, images, startup / interactive UI | `docs/checklists/performance.md` + `docs/checklists/accessibility.md` |
| Release / store / growth | `docs/checklists/release.md` + `docs/playbooks/store-listing.md` + `docs/playbooks/app-store-growth.md` |
| Creators / meme pages / paid distribution | `docs/playbooks/distribution.md` + `docs/growth-plan.md` |
| Play / Android port | `docs/playbooks/play-store.md` or `docs/android-parity.md` + Android playbooks |
| ASC / signing / TestFlight | `docs/playbooks/app-store-connect.md` |
| Expo tools / MCP / EAS | `docs/playbooks/expo-agent-tools.md` + `docs/stack/expo-rn.md` |
| R2 / App Review risk | `docs/playbooks/cloudflare-r2.md` + `docs/checklists/app-review-rejections.md` |
| Web 3D / three.js / browser game | `docs/playbooks/web-3d.md` + `docs/playbooks/skill-discovery.md` |
| Architecture / core flow | `docs/architecture.md` + `docs/stack.md` + `docs/checklists/engineering-quality.md` |
| Missing capability / external skill | `docs/playbooks/skill-discovery.md` |

## 4. Non-negotiable safety

No hardcoded UI strings; secrets/logged keys/committed `.env*`; world-writable Firestore;
callables without App Check; purchase logic outside the RevenueCat wrapper; UI-thread I/O;
unvirtualized long lists; committed `console.log`/`print`; unsafe unwraps; raw screen colors/
spacing; duplicate helpers; `--dangerously-skip-permissions`; blind create retries; automatic
deletion, DerivedData cleanup, bare `firebase deploy`, review submission, deceptive promotion,
fake reviews, planted/seeded comments, incentivized reviews, purchased
engagement/followers, spam, or engagement manipulation.

Protected files require explicit approval: security rules, RevenueCat wrapper, app entry/root
layout, `.env*`/credentials/config, the Scope Fence, production deletion, billing links, and
App Store review submission.

These rules are mechanically backed by `.claude/settings.json` deny/ask lists and the
`scripts/hooks/` guards — see "Deterministic guards" in `docs/security-model.md`.

## 5. State, evidence, and handoff

`.factory/context/` is local, ignored, secret-free, atomically written `0600` state. A capsule
binds task, repo fingerprint, allowed paths, acceptance, approvals, canonical references, and
exact next action. Stale HEAD/working tree, a missing heading, or mismatched hash blocks resume.
Clipboard and remote handoff carry only the short redacted bootstrap, never `.factory`,
absolute local paths, or private context. The android lane is an evidence-light convenience
lane: `android task done` requires at least one recorded evidence entry, not a receipt.

Use `frontier_high` for diagnosis/architecture/security/synthesis/review,
`bounded_implementation` for scoped code, and `mechanical` for fixtures/contract scans. A
worker never completes a task: lead reviews diff, receipt, validations, evidence, and scope.
Ordinary delegation uses at most three independent workers. An explicitly requested dynamic
workflow may use the provider-adaptive 8-concurrent/20-total policy only after reading
`dynamic-workflows.md`; parallel writers require isolated worktrees. Never delegate protected
files, secrets, external writes, spend, acceptance, or serial semantic decisions.

For v2 tasks: `task submit TASK_ID --receipt PATH`, `receipt validate PATH`, then lead
`task accept TASK_ID` or `task reject TASK_ID --reason "..."`. `task done` cannot claim
success without accepted evidence. Blueprint approval is separately digested and is invalid
when identifier, price, environment, or mutation scope changes.

## 6. Gates and canonical docs

Pre-change: current milestone, minimal files, i18n, relevant JIT docs. Post-change: targeted
lint/build/typecheck/tests, no forbidden pattern, analytics for new screens, canonical-doc
update, applicable performance review, then `factoryctl recommend refresh` at checkpoints.

`PRODUCT.md` owns what/why; `mvp-plan.md` current work; `features.md` shipped work;
`backlog.md` later; `product-map.md` journeys; `growth-plan.md` experiments;
`security-model.md` threats; `stack.md` toolchain; `architecture.md` structure;
`decisions.md` rationale; `README.md` entry point. Resolve ambiguity in that order, then an
existing similar implementation, matching playbook, or ask the user.
