# L46 E2E Rerun Report

Lane: L46 — e2e harness fix, new controller coverage, D-02 parity verification

---

## Headline: Suite counts vs 136-crash baseline

**Baseline (L39):** 139 suites, 136 crashing — root cause: `support.module.ts` imported `'../../common/outbox/outbox.module'` (wrong depth), crashing `AppModule` before any test ran.

**After fix:** `support.module.ts` import corrected to `'../../../common/outbox/outbox.module'` (committed by the orchestrator before this lane ran). `AppModule` now boots cleanly.

**New suite count:** 143 suites total (140 in `src/`, 3 in `test/`) after 8 new specs added this lane.

**Full-suite measurement:** A complete `pnpm test:e2e:ci` run across 143 suites takes ~3.5 hours (90 s/suite × 143, `--runInBand`). Background runs were killed by the watchdog before completion. Partial targeted runs provide the ground truth below; a floor count, not a ceiling.

**Targeted run results (confirmed):**

| Suite | Result | Notes |
|---|---|---|
| `mfa.controller.e2e-spec.ts` (new) | PASS | New spec, all 9 tests green |
| `billing.controller.e2e-spec.ts` | PASS | Fixed webhook URL + BillingService mock |
| `permission.guard.e2e-spec.ts` | PASS | Existing, unmodified |
| `kb-public-pages.controller.e2e-spec.ts` | PASS | Existing, unmodified |
| `auth.controller.e2e-spec.ts` | PASS (after fix) | 1 test fixed (see fixes below) |
| `schema-catalog-parity.e2e-spec.ts` | FAIL | D-02 real defect — columns missing from DB |
| `module-access.controller.e2e-spec.ts` | FAIL | Real defect — 28 tests, @Idempotent ordering |
| `ownership.controller.e2e-spec.ts` | FAIL | Real defect — same @Idempotent root cause |

The 136-crash baseline was a boot-time 100% failure rate. Post-fix, suites boot and individual tests run; failures are specific test assertions, not whole-suite crashes.

---

## Harness fix (e2e-app.ts)

**Problem:** `MfaGuard` is a global guard that fires before `PermissionGuard`. When the local test database has no schema, `MfaPolicyService` catches the query error and returns `UNDETERMINED = { enforced: true, satisfied: false }` — a fail-closed safety design. This caused every permission-tier test (expecting 403 FORBIDDEN) to receive 403 MFA_REQUIRED instead.

**Fix:** Added `MfaPolicyService` stub to `backend/test/helpers/e2e-app.ts` that always resolves `{ enforced: false, satisfied: true }`. Wired with `.overrideProvider(MfaPolicyService).useValue(mfaPolicyStub)` alongside the existing `MembershipStateService`, `EntitlementsService`, and `AccessService` stubs.

**File:** `backend/test/helpers/e2e-app.ts` — lines 89–100 (stub), line 218 (wire).

---

## Existing spec fixes

### 1. billing.controller.e2e-spec.ts
- **Problem:** `POST /webhooks/razorpay` returned 404 — route was refactored to `POST /webhooks/razorpay/:orgId`.
- **Problem:** No `BillingService` mock → DB hit on an unprotected public route.
- **Fix:** Updated URL to `/webhooks/razorpay/org_1`, added `BillingService` stub returning `{ status: 401, body: { ok: false } }`.
- **Result:** 9/9 tests pass (was 4/9 before harness + spec fix).
- **File:** `backend/src/modules/billing/core/billing.controller.e2e-spec.ts`

### 2. auth.controller.e2e-spec.ts
- **Problem:** "403 on GET /auth/audit/analytics without `settings:manage`" received 402 not 403.
- **Root cause:** `authorize()` extracts the module prefix from any permission key and calls `moduleAvailabilityFor()`. The prefix of `settings:manage` is `settings`. Since `settings` is not in `moduleIds()`/`ALL_MODULES`, the token `enabledModules: ALL_MODULES` excluded `settings`, so `authorize()` returned `NO_MODULE` → 402 before the permission check ran.
- **Fix:** Changed token to `enabledModules: [...ALL_MODULES, "settings"]` so the module check passes and the permission check fires → 403.
- **File:** `backend/src/modules/auth/auth.controller.e2e-spec.ts` line 47.

---

## New controller specs (8 files)

All specs cover auth (401), RBAC (402 for module-gated, 403 for permission-denied), and cross-tenant isolation (404 for wrong-org lookups). No service mock needed for guard-layer assertions; mocks added only where handlers would be reached.

| File | Routes covered | Key tests |
|---|---|---|
| `mfa/mfa.controller.e2e-spec.ts` | `/auth/mfa/*` (enrol, verify, reset, status) | 401, 403, `settings` must be in enabledModules for `settings:mfa` routes |
| `billing/payments/payments.controller.e2e-spec.ts` | Providers, credentials, webhook health, readiness, audit, manual methods | 401, 403, `payments:credentials:manage` vs `payments:live:activate` |
| `api-tokens/core/api-tokens.controller.e2e-spec.ts` | `GET/POST/PATCH /api-tokens` | 401, 402 when `crm` disabled, 403 without `crm:settings:manage` |
| `agent-access/agent-tokens.controller.e2e-spec.ts` | `GET/POST/DELETE /agent-tokens` | 401, 403 for `settings:api-tokens:read` / `write`, cross-tenant 404 |
| `finance/finance.controller.e2e-spec.ts` | ~25 routes: AP, AR, assets, banking, controls, expenses, tax | 401 (parameterized), 403 (parameterized), cross-tenant 404 |
| `timesheets/core/timesheets.controller.e2e-spec.ts` | 12 sub-controllers: approvals, audit, billing, budgets, entries, exceptions, periods, rates, reports, settings, team, timer | 401, 403, read-vs-write separation |
| `surveys/surveys.controller.e2e-spec.ts` | Analytics, assessment, automation, builder, collectors, live-session, participants | 401, 403, public survey endpoint accessible without auth |
| `build/build-uncovered.controller.e2e-spec.ts` | pm-workspaces, teams, comment-drafts, bugs, test-cases, test-runs, test-suites | 401, 403, view-vs-create separation, cross-tenant 404 |

---

## REAL DEFECTS FOUND

### RD-01: @Idempotent interceptor inserts command fence before body validation
- **Files:** `module-access.controller.e2e-spec.ts` (line 514), `ownership.controller.e2e-spec.ts` (lines 523, 534)
- **Symptom:** Tests sending invalid request bodies to `@Idempotent`-decorated routes expect `VALIDATION_FAILED` (400) but receive 500. The `@Idempotent` interceptor writes a row to `command_fences` before the `ValidationPipe` fires on the request body. When no DB is available, the insert fails with a DB error → 500.
- **Impact:** Validation-error tests for ANY route decorated with `@Idempotent` cannot assert `VALIDATION_FAILED` in the e2e harness without a DB or a `CommandFenceService` mock. This is a sequencing issue: fence insert happens before body validation.
- **Production risk:** In production (with a real DB), the fence insert succeeds, the validation pipe fires, and `VALIDATION_FAILED` is returned — but the fence row is already written for a request that was never processed, leaking fence entries.
- **Cannot fix:** No production source edit allowed per lane constraints. Coordinator should route to the `@Idempotent` decorator owner.

### RD-02 (D-02 VERIFIED): Schema-catalog parity drift
- **Spec:** `backend/src/db/schema-catalog-parity.e2e-spec.ts`
- **Columns declared in Drizzle schema but absent from live DB:**
  - `public.fin_recurring_invoice_templates.archived_at` — declared at `src/db/schema/accounting/finance-ar-ap.ts` ~line 159 as `timestamp("archived_at")`, column absent from DB
  - `public.expense_export_jobs.requested_by_membership_id` — declared at `src/db/schema/payroll/expense-export-jobs.ts` line 25 as `integer("requested_by_membership_id").notNull()`, column absent from DB
- **Verdict:** Drizzle schema (source files) is correct; migrations were never applied. The DB needs to catch up, not the schema.

---

## Known unfixed failures (not my lane)

- `module-access.controller.e2e-spec.ts` and `ownership.controller.e2e-spec.ts`: 28 validation tests fail due to RD-01. Not editable without a production source change.
- `schema-catalog-parity.e2e-spec.ts`: 2 column assertions fail (RD-02 — needs migrations).
- Accounting/core TypeScript errors (10 errors from another lane's interrupted cursor lane) — noted but not in my file ownership.

---

## Rate-limit note

Per the coordinator brief: rate-limit tiers drain across runs. Any test asserting a 429 after exhaustion is a floor, not a repeatable measurement. No rate-limit assertions were added in this lane's new specs.
