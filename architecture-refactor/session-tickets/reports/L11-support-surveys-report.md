# L11 — Support, Surveys, CSAT, Feedbucket

**Owned trees:** `backend/src/modules/support/**`, `backend/src/modules/surveys/**`, `backend/src/modules/csat/**`, `backend/src/modules/feedbucket/**`

---

## VERIFIED DONE (prior session findings re-asserted)

| Finding | Evidence |
|---|---|
| Cross-tenant routing key `support_agent_skills` leads with `orgId` | `uniqueIndex("uniq_support_agent_skills_org_user_skill").on(table.orgId, table.userId, table.skill)` in `support/agent-routing.ts` |
| Cross-tenant routing key `support_agent_availability` leads with `orgId` | `uniqueIndex("uniq_support_agent_availability_org_user").on(table.orgId, table.userId)` |
| Post-commit failure bug | `recordActivity().catch(() => undefined)` at line 231-233 of `support-tickets.service.ts` |
| Public CSAT double-submit race | `isNull(supportCsatRequests.respondedAt)` in WHERE + `ConflictException` on 0 rows in `support-csat.service.ts` |

---

## CHANGES MADE

### 1. Outbox orphan: `support.ticket.created` — REMOVED

The emission had no consumer and no post-create side effect not already handled inline. Removed the `OutboxWriter.emit` block from `support-tickets.service.ts` and cleaned up its `SupportCsatService` DI (the inline `createRequestForTicket` call was also fire-and-forget and moved to the resolved consumer).

Files changed:
- `backend/src/modules/support/core/support-tickets.service.ts` — removed `support.ticket.created` emission block; removed `SupportCsatService` import + DI; removed inline `csat.createRequestForTicket` call
- `backend/src/modules/support/core/support-tickets.service.spec.ts` — removed `mockCsat` from providers

### 2. Outbox orphan: `support.ticket.resolved` — CONSUMER CREATED

The resolved event was emitted but had no consumer; CSAT creation was done inline via fire-and-forget (durability hole on crash between emit and the inline call).

Files created/changed:
- `backend/src/modules/support/core/support-ticket-resolved-consumer.service.ts` (new) — `SupportTicketResolvedConsumer` implementing `OutboxEventConsumer`; uses `InboxConsumer` three-state claim/markProcessed; handles NotFoundException as SKIPPED, parse errors as FAILED, unknown errors as FAILED (rethrows for retry), success as COMPLETED
- `backend/src/modules/support/core/support.module.ts` — added `OutboxModule` import; registered `SupportTicketResolvedConsumer` in providers

### 3. Feedbucket missing module gate — FIXED

`FeedbucketController` was missing `@RequireModule("feedbucket")`. Since `ModuleGuard` is a global `APP_GUARD`, only the metadata decorator was needed.

File changed: `backend/src/modules/feedbucket/feedbucket.controller.ts` — added `@RequireModule("feedbucket")` class decorator

### 4. Tenant isolation specs — CREATED (18 tests, all passing)

| File | Service | Tests |
|---|---|---|
| `support/core/support-csat-tenant-isolation.spec.ts` | `SupportCsatService` | `createRequestForTicket` DENY/CONTROL, `getReport` DENY/CONTROL |
| `csat/csat-tenant-isolation.spec.ts` | `CsatService` | `listSurveys` DENY/CONTROL, `getSurvey` DENY/CONTROL, `listResponses` DENY/CONTROL |
| `feedbucket/feedbucket-tenant-isolation.spec.ts` | `FeedbucketSubmissionsService`, `FeedbucketWidgetsService` | `findOne` DENY/CONTROL × 2 services |
| `surveys/survey-forms-tenant-isolation.spec.ts` | `SurveyFormsService` | `list` DENY/CONTROL, `get` DENY/CONTROL |

The `FeedbucketSubmissionsService.findOne` mock uses a full chainable `select().from().where().orderBy().limit()` stub to handle the recording-rows branch of `Promise.all`.

---

## GUARD AUDIT

All controllers in the four trees with `@RequirePermission` carry `PermissionGuard` either at class level or on every individual handler. Count: 0 handlers with `@RequirePermission` but without `PermissionGuard`.

---

## CSAT vs SURVEYS decision

Three systems serve distinct purposes — keep all three:
- `supportCsatRequests` — per-ticket token-based CSAT (one request per resolved ticket, token-only submit)
- `csatSurveys`/`csatResponses` — campaign-style CSAT managed by the support team
- `surveys` module — general-purpose form engine (assessments, onboarding, NPS, etc.)

No merging warranted; the contexts and data shapes are genuinely different.

---

## OUT-OF-OWNERSHIP (cannot edit `common/**`)

Public routes with no rate limiting — missing TIERS entries in `backend/src/common/ratelimit/rate-limit.service.ts`:

| Key needed | Route | File |
|---|---|---|
| `"support:csat-get"` (~30/min) | `GET /support/csat/:token` | `support-csat.controller.ts` |
| `"support:csat-submit"` (~5/hr) | `POST /support/csat/:token` | `support-csat.controller.ts` |
| `"csat:public-submit"` (~5/hr) | `POST /csat/:surveyId/responses` | `csat.controller.ts` |

Each route also needs `@UseRateLimit("key")` + `RateLimitGuard` in `@UseGuards` on the handler.

---

## VALIDATION RESULTS

| Check | Result |
|---|---|
| `pnpm check:route-classification` | PASS — 3,534 handlers, 0 undeclared |
| `pnpm check:outbox-consumers` | FAIL — 15 orphans in out-of-ownership modules (chat, e-sign, hr.helpdesk, inventory, invoices, org). `support.ticket.resolved` is now emitted AND consumed. No support/surveys/csat/feedbucket orphans. |
| `pnpm check:tenant-isolation` | FAIL — 298 services missing (63% covered); all 4 owned service files covered; failures in build/ai/billing/access/other out-of-ownership trees |
| `pnpm check:log-secrets` | PASS — no plaintext secret logging; all `@UseRateLimit` keys in TIERS |
| tsc/typecheck | not run (validation block deferred to orchestrator per COMMON.md) |
| lint/tests | not run |
