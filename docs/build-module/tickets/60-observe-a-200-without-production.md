# 60 — A Build route's success can be observed without touching production

**What to build:** A Build route that is permanently broken for authorized callers fails a test. Fifteen of the 24 Build controller specs contain no success assertion at all — no 200, 201 or 204 — only 401s and 403s, so the whole suite passes while every authorized path is broken. The cause is architectural rather than lazy: that tier writes to production, so nobody could ever run the positive half. Build's controllers have no seam at which a 200 is observable without a database.

**Premise correction (2026-09-27):** `backend/test/helpers/e2e-app.ts:430` already supports
provider overrides. Reuse that interface instead of adding another test framework. A static
count of fifteen specs without literal 2xx assertions establishes a coverage concern, not that
every test writes production or that positive tests were impossible. Inspect the harness and
force isolated dependencies before executing this tier.

**Blocked by:** None — can start immediately.

**Status:** partial (2026-09-27) — corrected after actually running the tier. Three boxes
were ticked without the suite having been executed. The tier did not boot at all, and now
boots but cannot authenticate. See the correction note at the foot of this ticket.

- [ ] A Build controller can be exercised with its data layer behind a seam, with no database connection opened
  — Half earned. **No connection is opened:** proved by running the tier with `DATABASE_URL`
  pointed at an unroutable host and observing `TypeError: this.db.execute is not a function`
  rather than `ECONNREFUSED` — the override is reached before any client is constructed.
  **But the controller cannot be exercised:** every authenticated request returns 401, because
  `JwtAuthGuard` resolves the session through `DRIZZLE` and the double cannot answer it.
  The seam the ticket asks for does not exist yet. What is missing: a `DRIZZLE` double that
  satisfies the guard's session lookup, or a `JwtKeyringService`/session stub in
  `HARNESS_STUBS` alongside the existing membership, entitlements and access stubs.

- [ ] The fifteen specs missing a success assertion gain one, paired with their existing denial assertion per BE-141
  — The assertions were added but **they do not pass.** Ran
  `build-workflow.controller.e2e-spec.ts`: 13 tests, 6 pass, 7 fail. The 6 that pass are the
  unauthenticated `401 without a token` cases, which pass trivially. Every case asserting 200
  or 403 receives 401. A spec whose success assertion cannot pass is not coverage.

- [ ] A deliberately broken handler fails the new assertions — proved by breaking one and watching it go red
  — Ran it. It fails, but **for the wrong reason**: `Expected: 200, Received: 401`, not the
  500 the ticket predicted. The request never reaches the broken handler, so the case proves
  nothing about whether a broken handler is detected. The `it.skip` has been replaced with an
  enabled constructed bite (`does not reach 200 when the handler always throws`) asserting the
  handler is called and the status is 500 rather than 200; it will earn this box once
  authentication works in the tier.

- [x] No spec in the tier writes to production, and none sends a real webhook, message or email
  — Earned, and now proved rather than reasoned. A connection is structurally impossible:
  `DrizzleModule.onApplicationBootstrap` throws `TypeError: this.db.execute is not a function`
  on a bare `{}` double, and `createE2eApp` skips seeding unless the double answers both
  `transaction` and `insert`. Worker services are stubbed by `createE2eApp` built-ins.

- [x] The tier's own documentation states what it can and cannot prove
  — `backend/src/modules/build/BUILD-CONTROLLER-E2E-TIER.md` documents: what the guard-chain, module-gate, fence, and Zod-validation assertions prove; what is NOT proved (RLS, business logic, side effects); why SprintsService is excluded; the broken-handler command; and the structural DRIZZLE override guarantee.

## Correction — 2026-09-27, after running the tier

The three boxes above were ticked from reading the code. Running it changed the answer.

**What was found.** All 15 specs failed at `app.init()`, not at an assertion:
`DrizzleModule.onApplicationBootstrap` calls `db.execute` to assert RLS is enforced, and
`onApplicationShutdown` calls `db.__client.end`. A bare `{}` double answers neither, so every
suite died before its first request with `TypeError: this.db.execute is not a function`. The
tier had never run.

**What was fixed.** `test/helpers/e2e-app.ts` now fills in `execute` and `__client.end` on a
doubled `DRIZZLE` when the double omits them, using the double as the prototype so a double
carrying its own methods keeps them. Pinned by
`src/test/e2e-drizzle-double-boot-sweep.spec.ts` (5 tests). The 15 suites now boot and their
tests run.

**What is still broken.** Authentication. `JwtAuthGuard` reads the session through `DRIZZLE`,
so with the double every authenticated request is 401 and the whole authorized half of the
tier — every 200 and every 403 — cannot pass. This is the ticket's actual remaining work, and
it is the same gap the ticket's own opening paragraph describes: Build's controllers still have
no seam at which a 200 is observable without a database. Adding the success assertions did not
create that seam.

**Method note.** A runbook instruction is not evidence it ran. `it.skip` with "remove skip to
see failure" cannot earn a box that says "proved by breaking one and watching it go red".

## Files modified

**Spec files (all 15):**
- `backend/src/modules/build/managed-products/managed-products.controller.e2e-spec.ts`
- `backend/src/modules/build/governance/risks.controller.e2e-spec.ts`
- `backend/src/modules/build/incidents/incidents.controller.e2e-spec.ts`
- `backend/src/modules/build/meetings/meetings.controller.e2e-spec.ts`
- `backend/src/modules/build/portfolios/build-portfolios.controller.e2e-spec.ts`
- `backend/src/modules/build/workflow/build-workflow.controller.e2e-spec.ts` (also has broken-handler `it.skip`)
- `backend/src/modules/build/updates/updates.controller.e2e-spec.ts`
- `backend/src/modules/build/updates/updates-cross-tenant.e2e-spec.ts`
- `backend/src/modules/build/forms/build-forms.controller.e2e-spec.ts`
- `backend/src/modules/build/qa/bugs.controller.e2e-spec.ts`
- `backend/src/modules/build/client-portal/client-portal.controller.e2e-spec.ts`
- `backend/src/modules/build/approvals/approvals.controller.e2e-spec.ts`
- `backend/src/modules/build/core/projects.controller.e2e-spec.ts`
- `backend/src/modules/build/execution/build-execution.controller.e2e-spec.ts`
- `backend/src/modules/build/build-uncovered.controller.e2e-spec.ts`

**New documentation:**
- `backend/src/modules/build/BUILD-CONTROLLER-E2E-TIER.md`

## Notes

- SprintsService is excluded from success assertions because `listSprints`/`getSprint` both return `Promise<never>` — the real service always throws. `CyclesService` is used in `build-execution.controller.e2e-spec.ts` for the 200 assertion instead.
- The 400 tests in `forms` and `approvals` are preserved as-is. They fire at Zod validation or idempotency-fence level, before any service call. Stubbing the service does not affect them.
- The `updates-cross-tenant` spec's existing `MembershipStateService` override is preserved; DRIZZLE is added to its overrides to prevent the seeding path.
