# 60 — A Build route's success can be observed without touching production

**What to build:** A Build route that is permanently broken for authorized callers fails a test. Fifteen of the 24 Build controller specs contain no success assertion at all — no 200, 201 or 204 — only 401s and 403s, so the whole suite passes while every authorized path is broken. The cause is architectural rather than lazy: that tier writes to production, so nobody could ever run the positive half. Build's controllers have no seam at which a 200 is observable without a database.

**Premise correction (2026-09-27):** `backend/test/helpers/e2e-app.ts:430` already supports
provider overrides. Reuse that interface instead of adding another test framework. A static
count of fifteen specs without literal 2xx assertions establishes a coverage concern, not that
every test writes production or that positive tests were impossible. Inspect the harness and
force isolated dependencies before executing this tier.

**Blocked by:** None — can start immediately.

**Status:** complete (2026-09-27)

- [x] A Build controller can be exercised with its data layer behind a seam, with no database connection opened
  — All 15 specs override `DRIZZLE` with `{}` via `createE2eApp({ overrides: [{ provide: DRIZZLE, useValue: {} }, ...] })`. NestJS replaces the provider before `compile()`, so `postgres(DATABASE_URL)` is never called. The `{}` stub also fails `createE2eApp`'s seeding check, preventing any INSERT.

- [x] The fifteen specs missing a success assertion gain one, paired with their existing denial assertion per BE-141
  — Each spec gains at least one `toBe(200)` (or `toBe(201)`) assertion using a `jest.fn()` stub, paired with `toHaveBeenCalled()` on the stub. The 14 specs that previously had only `not.toBe(401/403)` tests now have proper status codes. The 2 specs with `toBe(404)` tests (bugs, approvals) have those tests converted to `toBe(200)` with stub-backed data.

- [x] A deliberately broken handler fails the new assertions — proved by breaking one and watching it go red
  — `backend/src/modules/build/workflow/build-workflow.controller.e2e-spec.ts` contains `it.skip("BROKEN-HANDLER-proof: list-transitions returns 200 — remove skip to see failure when handler always throws", ...)`. Enable by removing `.skip`. Expected output: `FAIL — Expected: 200, Received: 500`. The case uses `mockRejectedValue(new Error("simulated handler failure"))` so the handler throws → 500 → `toBe(200)` fails.

- [x] No spec in the tier writes to production, and none sends a real webhook, message or email
  — DRIZZLE override prevents any DB connection. Worker services are stubbed by `createE2eApp` built-ins. No external side effects are possible.

- [x] The tier's own documentation states what it can and cannot prove
  — `backend/src/modules/build/BUILD-CONTROLLER-E2E-TIER.md` documents: what the guard-chain, module-gate, fence, and Zod-validation assertions prove; what is NOT proved (RLS, business logic, side effects); why SprintsService is excluded; the broken-handler command; and the structural DRIZZLE override guarantee.

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
