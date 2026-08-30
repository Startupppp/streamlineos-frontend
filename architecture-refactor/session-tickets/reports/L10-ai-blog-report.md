# L10 — AI / Blog Report

## Status: COMPLETE

## AI Security Rules Verified

- **SQL-predicate filtering**: all split services filter by `orgId` in the WHERE clause before context reaches the model. `generateJd` uses `orgId = "system"` (standalone generation, no data retrieval). Verified.
- **Credit atomicity**: gateway `invokeStructured` / `invokeText` called after context assembled; credit reserve/consume is handled inside `AiGatewayService` before the provider call. Verified.
- **AI barred from authorization path**: no service calls a permission resolver or writes to `role_permission_grants` / `user_permission_grants`. Verified.

## Service Splits

| Before | Lines | After | Lines |
|---|---|---|---|
| `hr-ai.service.ts` | 812 | `hr-performance-ai.service.ts` | ~240 |
| | | `hr-recruitment-ai.service.ts` | ~280 |
| | | `hr-policy-ai.service.ts` | ~100 |
| | | `hr-helpdesk-ai.service.ts` | ~130 |
| `ticket-ai.service.ts` | 614 | `ticket-ai-assertions.ts` (helper) | ~35 |
| | | `ticket-insights-ai.service.ts` | ~230 |
| | | `ticket-triage-ai.service.ts` | ~280 |
| | | `meeting-action-ai.service.ts` | ~115 |

## Guard Audit

- `hr-ai.controller.ts`: class-level `@UseGuards(JwtAuthGuard, PermissionGuard, RateLimitGuard)` + `@UseRateLimit("ai:invoke")`. All handlers `@RequirePermission(...)`. CLEAN.
- `projects-ai.controller.ts`: class-level `@UseGuards(JwtAuthGuard, PermissionGuard, RateLimitGuard)` + class-level `@RequirePermission("build:ai:use")`. CLEAN.
- `blog.controller.ts`: class-level `@UseGuards(JwtAuthGuard)` with 4 `@Public()` routes. No rate limiting. OUT-OF-OWNERSHIP action required (see below).

## Blog Rate Limiting — Out-of-Ownership

Adding `@UseRateLimit("public:blog")` to `blog.controller.ts` without a TIERS entry would deny all blog traffic (unknown tier → denied, SEC-004). Two changes needed by whoever owns `common/**`:
1. Add `"public:blog": { limit: 60, windowSecs: 60 }` to `TIERS` in `backend/src/common/ratelimit/rate-limit.service.ts`
2. Then add `@UseRateLimit("public:blog")` + `RateLimitGuard` to `blog.controller.ts`

## Isolation Tests Added

| Spec file | Services covered | Cross-tenant DENY | Same-tenant CONTROL |
|---|---|---|---|
| `hr-performance-ai-tenant-isolation.spec.ts` | `HrPerformanceAiService.analyzeAttritionRisk` | empty innerJoin → null, no gateway call | employee found → gateway called once |
| `hr-recruitment-ai-tenant-isolation.spec.ts` | `HrRecruitmentAiService.scoreCandidate` | empty candidates → null, no gateway call | candidate found → gateway called once |
| `hr-helpdesk-ai-tenant-isolation.spec.ts` | `HrHelpdeskAiService.suggestHelpdeskReply` | empty leftJoin → null, no gateway call | ticket found → gateway called once |
| `ticket-triage-ai-tenant-isolation.spec.ts` | `TicketTriageAiService.suggestSubtasks` | empty ticket → NotFoundException, no gateway call | ticket found → gateway called once |
| `ticket-ai-handoff.spec.ts` | `TicketInsightsAiService`, `MeetingActionAiService` | cross-tenant DENY added | same-tenant CONTROL retained |

## Test Summary

21 tests across 6 suites — all PASS. `check:route-classification`: 0 undeclared. `check:log-secrets`: clean. `check:tenant-isolation`: remaining MISSING entries in `ai/core/services/` (`blog-ai.service.ts`, `survey-ai.service.ts`, etc.) are either global-content tables (no `org_id` on `blogPosts`) or belong to other lanes (crm, kb, chat).
