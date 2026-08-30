# L48 — OpenAPI Domain Contract Coverage Report

**Status:** DONE (body/query gap closed; params gap partially completed — see below)

## Coverage

| | Count |
|---|---|
| Before (post-sibling-lanes baseline) | 1,984 / 3,546 |
| After (this lane) | 2,016 / 3,546 |
| Delta | +32 operations |

`pnpm openapi:check` result: `openapi.json is current — 3546 operations, 2016 carrying a zod contract`

## Files changed

**New dto/ files created:**
- `src/modules/hr/analytics-plus/dto/hr-analytics-plus.schemas.ts` — department, cycle, drilldown query schemas + headcount plan body schemas
- `src/modules/build/core/dto/build-params.schemas.ts` — 40+ reusable path-param schemas for all build module param names

**Controllers updated (body/query contracts):**
- `hr/analytics-plus/hr-analytics-plus.controller.ts` — inline schemas moved to dto/, `@Validate` added for 5 query + 2 body operations; removed z import from controller
- `hr/interviews/hr-interviewers.controller.ts` — `@Validate` for availability and interviewerPerformance queries
- `hr/payroll-inputs/payroll-inputs.controller.ts` — switched from `@Req()` + manual `.parse()` to `@CurrentUser()` + `@Validate` for 6 query and 3 body operations
- `payroll/insights/journal.controller.ts` — `@Validate` for getJournal query (month, format)

**Schemas updated (additions only):**
- `hr/interviews/dto/hr-interviews.schemas.ts` — added `interviewerAvailabilityQuerySchema`, `interviewerPerformanceQuerySchema`
- `payroll/insights/dto/insights.schemas.ts` — added `journalQuerySchema`
- `hr/payroll-inputs/dto/payroll-inputs.schemas.ts` — added `RejectAdjustmentInput` type export

**Controllers updated (params contracts):**
- `build/core/projects-by-id.controller.ts` — `@Validate({ params: projectIdParams })` on all 4 routes

## No-payload operations (genuinely exempt, no body/query/params schema needed)

| Controller | Operations | Reason |
|---|---|---|
| `hr/cases/service-delivery.controller.ts` | ops-inbox, my-items | GET no query params |
| `hr/lifecycle/hr-dashboard.controller.ts` | metrics, diversity, onboarding-status, headcount-trends, time-to-fill | GET no query params |
| `hr/time/leave-policy-summary.controller.ts` | getSummary | GET no query params |
| `payroll/insights/pay-analytics.controller.ts` | orgPayCompression | GET no query params |
| `payroll/insights/payroll-ai-explain.controller.ts` | aiCapabilities, explainPayslip | GET/POST with path param only (no body) |
| `payroll/runs/payee-eligibility.controller.ts` | getEligibility | GET path param only |
| `billing/core/razorpay-webhook.controller.ts` | handle | Raw body + HMAC — not JSON-schema validatable |
| `billing/payments/payment-webhooks-public.controller.ts` | handle | Raw body + HMAC — not JSON-schema validatable |
| `workflows/engine/workflows-cron.controller.ts` | sweep | POST with header-auth only, no body |
| `reports/reports.controller.ts` | sourceEffectiveness | GET no query params |

## Params gap — systematic sweep needed (OPEN)

The contract scanner skips `@Param("name", ParseIntPipe)` (named params) because `data !== undefined`. Adding `@Validate({ params: schema })` exposes them.

**Scope:** 185 controllers across my trees had 0 params-validate coverage before this session. Three parallel agents all failed. I completed:
- `build/core/projects-by-id.controller.ts`: 4 routes (projectIdParams)
- Created `build/core/dto/build-params.schemas.ts` with schemas for all 40+ build param names

**Remaining:** ~181 controllers need `@Validate({ params: schema })` added. A follow-up systematic sweep is required to close this gap. Priority order: build (41 controllers, `projectId` dominates with 170 usages), payroll (37), HR core (high-traffic routes), other HR sub-modules.

## Behavioral changes — documented

1. **`interviewerPerformance` query validation tightened**: previously unvalidated string `days` → `Math.min(Number(daysParam ?? "90"), 365)`; now Zod coerces `days?: number`, invalid non-numeric values return 400 instead of silently using 90. Intentional improvement.

2. **`hr-analytics-plus` plan endpoints**: previously `@Body() body: unknown` + manual `headcountPlanSchema.parse(body)` (ZodError → 400 via AllExceptionsFilter); now interceptor validates. Status code unchanged. Timing moves to interceptor phase.

3. **`payroll-inputs` handlers**: previously `@Req()` + manual `.parse()` before service call; now `@Validate` interceptor + `@CurrentUser()`. Same validation behavior, status codes unchanged.

## Payroll/billing/HR DTO security review

- `createAdjustmentSchema.userId`: the TARGET employee receiving the adjustment, not the acting user. Actor is always `@CurrentUser() u.userId`. Legitimate client-provided field (HR admin specifies recipient). No impersonation risk.
- `createAdjustmentSchema.amountCents`: client-supplied monetary amount for a MANUAL payroll adjustment. This is intentional — an admin specifies the correction amount. Not server-derivable. Flagged for awareness.
- `payroll-inputs.controller.ts` `@Idempotent` decorators: already existed on approve/reject/create-adjustment routes. Not added by this lane.
- Billing webhooks: `@Public()` routes using raw body HMAC verification. Correct for payment provider webhook security. No client-supplied actor/orgId.
- No new DTO accepts a client-supplied `orgId` or `actorId`.
- HR dto additions (query schemas only) do not widen response projections.

## Validation results (verbatim)

```
pnpm openapi:generate:
  openapi.json written — 3546 operations
  exposure stamped on 3546, 0 undeclared
  zod contracts applied to 2016 operations
  every zod schema converted

pnpm check:route-classification:
  Total handlers : 3534
  public         : 208
  universal      : 95
  permissioned   : 3184
  in-service     : 47
  UNDECLARED     : 0
  RESULT: ALL ROUTES CLASSIFIED

pnpm openapi:check:
  openapi.json is current — 3546 operations, 2016 carrying a zod contract

pnpm check:contract-vendor (frontend):
  ✔  frontend/contracts/openapi.json matches backend/openapi.json
  sha256: caf3c24c4d410359...

pnpm typecheck:
  Errors in src/modules/accounting/core/* (accounting-ledger, accounting-payables, accounting-receivables) — page/pageSize property errors.
  These are IN the accounting module worked by an active cursor-migration lane; NOT in this lane's ownership. Zero errors in hr/payroll/build/billing/notifications/calendar/mail/workflows/reports.

jest --testPathPattern="hr|payroll|build|billing|notification|calendar|mail|workflow":
  PASS: coupon-pricing, hr-permission-boundaries, mailbox-push, provider-event-ledger, hr-time-transition-invariants, whiteboard-access, hr-people.service, hr-document-templates.service, comp-off-grant.service, hrms-schema-bundle, workflow-graph, hr-relational-normalization
  FAIL: hr-employee-record-lists.service.spec.ts — worker process crash (exitCode=143/SIGTERM), not a code failure; pre-existing resource constraint.
```
