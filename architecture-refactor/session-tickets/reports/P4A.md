# P4A — Unbounded DB Read Audit & Cap Enforcement

**Lane:** P4A — Backend unbounded reads  
**Date:** 2026-08-31  
**Territory:** All backend except storage, chat, build/core, cron, ai, dashboard, timesheets, hr/time, support, autonomy, accounting, invoices, leads, access

---

## Summary

Enumerated every `findMany(` and `.select(` in-territory with no `.limit()`. Found 8 real defects (category a), 0 spec-fixing regressions, all 8 fixed. 8 new spec files written; every spec proved to bite. All existing suites in touched modules remain green.

---

## Site Table

| File (rel. to `src/`) | Table | Category | Cap applied | Evidence |
|---|---|---|---|---|
| `modules/surveys/survey-export.service.ts:25` | `surveyResponseSessions` | **a — REAL** | `SURVEY_EXPORT_CAP = 5_000` | Survey with 100k respondents would return all rows in one query; now capped and response carries `{csv, truncated, rowCount}` |
| `modules/surveys/survey-analytics.service.ts:56` | `surveyAnswers` | **a — REAL** | `SURVEY_ANALYTICS_ANSWERS_CAP = 50_000` | Answers table grows unboundedly per survey; analytics endpoint could scan millions of rows for a large survey |
| `modules/blog/blog.service.ts:33` | `blogPosts` | **a — REAL** | `BLOG_ADMIN_LIST_CAP = 100` | Global (not tenant-scoped) table; admin list had no cap — a high-volume blog could return tens of thousands of posts |
| `modules/users/user-operations.reporter.ts:19` | `organizationMembers JOIN users` | **a — REAL** | `EXPORT_USERS_CAP = 5_000` | Export for a large org (1000+ members) was fully unbounded; now returns `{csv, truncated, rowCount}` with header signaling |
| `modules/payroll/payout/publishing.service.ts:345` | `payslipPublications` | **a — REAL** | `PUBLICATION_LIST_CAP = 1_000` | A payroll run for 1000+ employees creates 1000+ publication rows; `listPublications` returned all with no cap |
| `modules/hr/recruitment/recruitment-automation.service.ts:42` | `pipelineAutomations` | **a — REAL** | `PIPELINE_AUTOMATION_CAP = 100` | All automations for an org with no cap; recruitment orgs can accumulate hundreds |
| `modules/hr/recruitment/recruitment-automation.service.ts:193` | `emailSequences` | **a — REAL** | `EMAIL_SEQUENCE_CAP = 100` | All email sequences for an org with no cap; same growth pattern |
| `modules/crm/core/crm-sales-dashboard.service.ts:71` | `crmMonthlyMetrics` | **a — REAL** | `CRM_METRICS_LOOKBACK = 36` | 1 row/month × org count; a 3-year-old org has 36 rows; older orgs were unrestricted |
| `modules/crm/core/crm-ce-dashboard.service.ts:99` | `crmMonthlyMetrics` | **a — REAL** | `CRM_CE_METRICS_LOOKBACK = 36` | Same table, same growth pattern, duplicate dashboards |

### Category b — bounded config/lookup (NOT defects)

| Site | Table | Reason |
|---|---|---|
| `modules/hr/hr-policy.service.ts` | `hrExpensePolicies` | Already had `limit: 200`; org-level config table |
| `modules/inventory/reorder-rules.service.ts` | `inventoryReorderRules` | Loaded into a Map for business-logic lookup; bounded per org by product count |
| `modules/webhooks/webhook-endpoints.service.ts` | `webhookEndpoints` | Config table; org subscription count is naturally bounded |
| `modules/notifications/policy/notification-policy.service.ts` | `notificationPolicyDefaults` | Already had `limit: 100`; platform-managed defaults |
| `modules/notifications/suppression.service.ts` | `notificationSuppressions` | Scoped by `orgId + userId + eventType`; triple equality near-unique |
| `modules/calendar/export.service.ts` | `calendarEvents` | Already had `limit: 100` per the existing export cap pattern |
| `modules/surveys/feedbucket.service.ts` | `feedbucketWidgets` | Config-like; one widget per installed integration slot |
| `modules/crm/core/crm-options.service.ts` | `crmOptions` | Filtered by `orgId + type`; per-type lookup config |

### Category c — bounded by unique/near-unique key equality (NOT defects)

| Site | Table | Reason |
|---|---|---|
| Various `findFirst` by session/token | `sessions` | Single-row by unique key |
| `modules/build/goals/key-results.service.ts` | `keyResults` | Filtered by `goalId`; bounded by the goal |
| `modules/hr/recruitment/candidate-documents.service.ts` | `candidateDocuments` | Filtered by `candidateId`; bounded per candidate |
| `modules/hr/recruitment/offers.service.ts` | offer versions/negotiations | Filtered by `offerId`; bounded per offer |
| `modules/hr/recruitment/interviews.service.ts` | interview records | Filtered by `candidateId`; bounded per candidate |
| `modules/hr/recruitment/sla-tracking.service.ts` | SLA tracking | Filtered by `candidateId + stageId`; bounded |

---

## Export Truncation Signaling

All export paths use HTTP response headers (not CSV body change):
- `X-Export-Truncated: true` — present only when result was capped
- `X-Export-Row-Count: N` — count of rows actually returned

Controllers updated: `survey-analytics.controller.ts` (survey export), `users.controller.ts` (user export). Both switched from `@Header()` decorator to `@Res()` pattern to enable conditional header setting.

`publishing.service.ts:listPublications` returns `{items, truncated}` directly; the controller was already reading the full object shape.

---

## Files Changed

**Service fixes:**
- `src/modules/surveys/survey-export.service.ts` — limit + return type change
- `src/modules/surveys/survey-analytics.service.ts` — limit added
- `src/modules/blog/blog.service.ts` — limit added
- `src/modules/users/user-operations.reporter.ts` — limit + return type change
- `src/modules/payroll/payout/publishing.service.ts` — limit + return type change
- `src/modules/hr/recruitment/recruitment-automation.service.ts` — 2 limits added
- `src/modules/crm/core/crm-sales-dashboard.service.ts` — limit added
- `src/modules/crm/core/crm-ce-dashboard.service.ts` — limit added

**Controllers (return type wire-up):**
- `src/modules/surveys/survey-analytics.controller.ts` — use `@Res()`, set truncation headers
- `src/modules/users/users.controller.ts` — use `@Res()`, set truncation headers

**Existing specs updated (return type drift):**
- `src/modules/surveys/survey-export-tenant-isolation.spec.ts` — `result.csv` instead of bare string
- `src/modules/payroll/payout/publishing-tenant-isolation.spec.ts` — `result.items` / `result.truncated`
- `src/modules/payroll/payout/payroll-payout.controller.e2e-spec.ts` — mock updated to `{items, truncated}`

**New spec files (8):**
- `src/modules/surveys/survey-export-limit.spec.ts`
- `src/modules/surveys/survey-analytics-limit.spec.ts`
- `src/modules/blog/blog-admin-list-limit.spec.ts`
- `src/modules/users/user-export-limit.spec.ts`
- `src/modules/payroll/payout/publishing-list-cap.spec.ts`
- `src/modules/hr/recruitment/recruitment-automation-limit.spec.ts`
- `src/modules/crm/core/crm-sales-dashboard-limit.spec.ts`
- `src/modules/crm/core/crm-ce-dashboard-limit.spec.ts`

---

## Bite Proof

Each spec was proved to bite by temporarily removing the `.limit()` call, running the spec, confirming failure, then restoring and re-running to green:

| Spec file | Neutered failure count | Failure mode |
|---|---|---|
| `survey-export-limit.spec.ts` | 1 | `typeof args?.limit` was `"undefined"`, not `"number"` |
| `survey-analytics-limit.spec.ts` | 1 | `typeof args?.limit` was `"undefined"`, not `"number"` |
| `blog-admin-list-limit.spec.ts` | 1 | `typeof args?.limit` was `"undefined"`, not `"number"` |
| `user-export-limit.spec.ts` | 3 | `limitMock` never called; chain resolved as non-array, `.map` threw |
| `publishing-list-cap.spec.ts` | 1 | `typeof args?.limit` was `"undefined"`, not `"number"` |
| `recruitment-automation-limit.spec.ts` (automations) | 1 | `typeof args?.limit` was `"undefined"` |
| `recruitment-automation-limit.spec.ts` (sequences) | 1 | `typeof args?.limit` was `"undefined"` |
| `crm-sales-dashboard-limit.spec.ts` | 1 | `typeof args?.limit` was `"undefined"` |
| `crm-ce-dashboard-limit.spec.ts` | 1 | `typeof args?.limit` was `"undefined"` |

**Total neutered-run failures: 11 across 9 runs**

---

## Test Suite Results (full modules, post-fix)

| Module path | Suites | Tests | Status |
|---|---|---|---|
| `src/modules/surveys/` | 19 | 90 | PASS |
| `src/modules/blog/` | 1 | 2 | PASS |
| `src/modules/users/` | 8 | 62 | PASS |
| `src/modules/payroll/payout/` | 10 | 147 | PASS |
| `src/modules/hr/recruitment/` | 6 | 55 | PASS |
| `src/modules/crm/core/` | 14 | 91 (1 todo) | PASS |

**Grand total: 58 suites, 447 tests, 0 failures.**

---

## Notes

- `tsc --noEmit`, `nest build`, lint — NOT run (would hang per lane rules).
- No git commands run.
- All constants are module-top named constants (not inline literals).
- `blog.service.ts` blog table is global (no `org_id`); the cap is on total admin-visible posts, not per-tenant. 100 is consistent with the `pageSizeField()` hard cap for list endpoints.
- The three other internal `findMany` calls on `payslipPublications` (lines 140, 298, 367) are bounded by a specific `runId` used for PDF generation — not list endpoints, not defects.
- No page-size clamping defects found for `page`/`offset` endpoints: all used `pageSizeField()` from `src/common/pagination/list-query.schema.ts` which enforces `PAGE_SIZE_CAP = 100`.
