# SEC2 — Second Cross-Tenant Security Sweep

**Scope:** hr (all sub-modules), recruitment/interviews, onboarding, performance, surveys, csat, blog, careers, ingress, activities, data-quality, audit-log, agent-access, sessions, mfa, auth, organization lifecycle, invitations, module-access, user-permission-grants, delegations, offer-fulfillment, realtime, push, email, search, tasks, goals.

**Excluded (live lanes):** chat, storage, e-sign, kb, cron, inventory, finance, accounting, billing, timesheets, build, workflows, calendar, party, directory, users, ownership, autonomy.

---

## Findings and Fixes

### F1 — Push unsubscribe: any user can delete any user's subscription

**File:** `backend/src/modules/push/push.service.ts:28`

**Hole:** `DELETE /push/subscribe` was `@Universal()` (any authenticated user). The service called `unsubscribe(endpoint: string)` and deleted by endpoint URL alone — no userId check. Any user who knows (or guesses) another user's push endpoint URL can remove that user's push subscription (cross-user DoS on notifications).

**Fix:** Added `userId: string` parameter to `unsubscribe`. WHERE clause is now `and(eq(endpoint), eq(userId))`. Controller (`push.controller.ts:48`) passes `@CurrentUser() u` and calls `push.unsubscribe(query.endpoint, u.userId)`.

**Biting test:** `push-tenant-isolation.spec.ts` — `PushService.unsubscribe — cross-user ownership`. Removing userId from WHERE turns the `toContain(ATTACKER_USER)` assertion red. Verified: test failed with reverted code, passes with fix.

---

### F2 — CSAT deleteSurvey: TOCTOU write missing orgId

**File:** `backend/src/modules/csat/csat.service.ts:102`

**Hole:** `deleteSurvey` reads with `and(id, orgId)` (correct) but deletes with only `eq(id)`. A concurrent cross-org request that obtains a valid `surveyId` from a separate information source can complete the delete against a different org's survey between the read and write.

**Fix:** Delete WHERE is now `and(eq(csatSurveys.id, surveyId), eq(csatSurveys.orgId, orgId))`.

**Biting test:** `csat-tenant-isolation.spec.ts` — `CsatService.deleteSurvey — cross-tenant DENY`. Mocks `findFirst` to return a row (simulates the check passing), then asserts the delete WHERE contains orgId. Removing orgId from the delete WHERE fails the assertion.

---

### F3 — Interview updateInterview: TOCTOU write missing orgId

**File:** `backend/src/modules/hr/interviews/hr-interview-results.service.ts:40`

**Hole:** `updateInterview` reads the interview with `and(id, orgId)` (correct), builds update fields, then updates with only `eq(interviews.id, interviewId)`. A race condition allows a cross-org write if an attacker can supply a valid numeric `interviewId` from another org.

**Fix:** Update WHERE is now `and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId))`.

**Biting test:** `hr-interview-new-services-tenant-isolation.spec.ts` — `HrInterviewResultsService — TOCTOU write fix — cross-tenant DENY`. Mocks `findFirst` to return a row (check passes), captures the update WHERE argument via a jest mock, asserts it contains the attacker's orgId and not the owner's. Removing orgId from the update WHERE fails the assertion.

---

### F4 — Survey assessment completeAttempt: TOCTOU write missing orgId

**File:** `backend/src/modules/surveys/survey-assessment.service.ts:83`

**Hole:** `completeAttempt` reads the attempt with `and(orgId, sessionId)` (correct) but updates with only `eq(surveyAssessmentAttempts.id, attempt.id)`. A race condition allows a cross-org status mutation.

**Fix:** Update WHERE is now `and(eq(surveyAssessmentAttempts.id, attempt.id), eq(surveyAssessmentAttempts.orgId, orgId))`.

**Biting test:** `survey-assessment-tenant-isolation.spec.ts` — `completeAttempt — TOCTOU write fix — cross-tenant DENY`. Mocks both findFirst calls to return rows (checks pass), captures update WHERE, asserts it contains orgId. Removing orgId from the update WHERE fails the assertion.

---

## Ruled Out (Clean)

| Module | Verdict |
|---|---|
| `delegations` | All queries include orgId |
| `sessions` | User-scoped globally by design (no orgId column) |
| `tasks` | All reads and writes include orgId |
| `goals` | All reads and writes include orgId |
| `agent-access` | All queries include both userId and orgId |
| `audit-log` | All queries include orgId |
| `search` | SECURITY DEFINER SQL functions with org from GUC |
| `auth/membership-resolver` | Checks `status = 'ACTIVE'` on membership |
| `mfa` | User-scoped by design; no cross-org risk |
| `offer-fulfillment` | Proper orgId scoping |
| `module-access/user-permission-grants` | Has explicit `resolveActiveTargetMembership` |
| `blog` | Intentionally global (no orgId column in schema) |
| `careers` | Intentionally global public job board |
| `hr/performance PIPs, 1:1s, goals` | JwtAuthGuard enforces active membership at session level; `assertOrgMember` helpers are advisory |

---

## Test Results

```
PASS src/modules/push/push-tenant-isolation.spec.ts
PASS src/modules/csat/csat-tenant-isolation.spec.ts
PASS src/modules/hr/interviews/hr-interview-new-services-tenant-isolation.spec.ts
PASS src/modules/surveys/survey-assessment-tenant-isolation.spec.ts

Tests: 34 passed, 34 total
```

Bite-verified: push unsubscribe test turned red with reverted production code; restored fix makes it green.

---

## Files Changed

| File | Change |
|---|---|
| `src/modules/push/push.service.ts` | Added `and` import; `unsubscribe` now takes `userId`, WHERE narrows to `and(endpoint, userId)` |
| `src/modules/push/push.controller.ts` | `unsubscribe` passes `@CurrentUser() u` and calls `push.unsubscribe(query.endpoint, u.userId)` |
| `src/modules/csat/csat.service.ts` | `deleteSurvey` delete WHERE adds `eq(csatSurveys.orgId, orgId)` |
| `src/modules/hr/interviews/hr-interview-results.service.ts` | `updateInterview` update WHERE adds `eq(interviews.orgId, orgId)` |
| `src/modules/surveys/survey-assessment.service.ts` | `completeAttempt` update WHERE adds `eq(surveyAssessmentAttempts.orgId, orgId)` |
| `src/modules/push/push-tenant-isolation.spec.ts` | New describe block: unsubscribe cross-user DENY + CONTROL; added `sqlValues` helper |
| `src/modules/csat/csat-tenant-isolation.spec.ts` | New `deleteSurvey` describe block: cross-tenant DENY + CONTROL |
| `src/modules/hr/interviews/hr-interview-new-services-tenant-isolation.spec.ts` | Two new tests: TOCTOU write DENY + CONTROL for `updateInterview` |
| `src/modules/surveys/survey-assessment-tenant-isolation.spec.ts` | New `completeAttempt` describe block: TOCTOU write DENY + CONTROL |
