# SEC4 — Security Audit Report

**Territory:** `src/modules/inventory/**`, `src/modules/kb/**`, `src/modules/support/**`, `src/modules/workflows/**`, `src/modules/integrations/**`, `src/modules/notifications/**`  
**Sign module (`src/modules/sign/**`):** does not exist — confirmed no such directory.

---

## Findings Table

| # | File:Line | Pattern | Exploit Path | Fixed |
|---|-----------|---------|--------------|-------|
| F1 | `workflows/workflows-crud.service.ts:208` | #2 TOCTOU | `publishWorkflow` read is orgId-scoped; the `UPDATE` was bare `eq(workflows.id, workflowId)` — an attacker with a valid workflowId from any org could overwrite its status/version | YES |
| F2 | `inventory/webhooks/webhooks.service.ts:273` | #2 TOCTOU | `retryEvent` event-status `UPDATE` was `eq(invWebhookEvents.id, eventId)` — no orgId predicate; attacker could retry any org's webhook event | YES |
| F3 | `inventory/webhooks/webhooks.service.ts:279` | #2 TOCTOU | Same `retryEvent`: the `invWebhooks` lastDeliveryAt `UPDATE` was `eq(invWebhooks.id, webhook.id)` — no orgId | YES |
| F4 | `support/core/support-ai.service.ts:searchKbForTicket` | #7 AI/RAG ACL | `searchKbForTicket` fetched KB chunks with only `eq(kbArticleChunks.orgId, orgId)` — no space membership check and wrong restriction logic. Any support agent could trigger AI replies that included chunks from spaces the caller cannot read. | YES |

---

## Fixes Applied

### F1 — `publishWorkflow` TOCTOU

`publishWorkflow` called `db.query.workflows.findFirst` with an orgId predicate but the subsequent `UPDATE` inside the transaction omitted it.

**Before:**
```typescript
.where(eq(workflows.id, workflowId))
```
**After:**
```typescript
.where(and(eq(workflows.id, workflowId), eq(workflows.orgId, orgId)))
```

### F2 + F3 — `retryEvent` TOCTOU (two writes)

`retryEvent` read the event and webhook rows correctly (orgId-scoped), but both `UPDATE` writes lacked the orgId rebinding.

**Event update before:**
```typescript
.where(eq(invWebhookEvents.id, eventId))
```
**After:**
```typescript
.where(and(eq(invWebhookEvents.id, eventId), eq(invWebhookEvents.orgId, orgId)))
```

**Webhook update before:**
```typescript
.where(eq(invWebhooks.id, webhook.id))
```
**After:**
```typescript
.where(and(eq(invWebhooks.id, webhook.id), eq(invWebhooks.orgId, orgId)))
```

### F4 — `searchKbForTicket` RAG ACL

`searchKbForTicket` previously queried KB chunks with only an orgId filter and a blanket `NOT EXISTS (restrictions)` clause. This exposed chunks from:
- Spaces the caller has no membership in
- Articles with per-user/per-role view restrictions that exclude the caller

Fix: injected `KbAccessService` (already exported from `KbModule`, imported by `SupportModule`). The method now:
1. Calls `kbAccess.getAccessibleSpaceIds(user)` — returns space IDs the caller can read
2. Short-circuits with `return []` when the list is empty (no spaces accessible → no RAG context)
3. Adds `inArray(kbArticles.spaceId, accessibleSpaceIds)` to the WHERE predicate
4. Adds the same user-aware restriction filter used by `KbSearchService.retrieveTopArticles` (NOT EXISTS check OR EXISTS with userId/role match)

The `userId` was propagated through: `suggestReply` → `searchKbForTicket`, `suggestKbArticles` → `searchKbForTicket`, `generateHandoffSummary` → `searchKbForTicket`, and through the full call chain `createTicket` → `runFullAnalysis` → `suggestKbArticles`.

---

## Tests Written

### New spec: `workflows-crud-tenant-isolation.spec.ts` (2 new tests added to existing file)

| Test | Assertion |
|------|-----------|
| DENY: `publishWorkflow` different org | `findFirst → null` → NotFoundException |
| CONTROL: `publishWorkflow` owning org | `sqlValues(updateWhere arg)` contains OWNER_ORG and WORKFLOW_ID |

### New spec: `inventory/webhooks/webhooks-tenant-isolation.spec.ts` (new file, 2 tests)

| Test | Assertion |
|------|-----------|
| DENY: `retryEvent` different org | `select → []` → NotFoundException |
| CONTROL: `retryEvent` owning org | All update where args contain OWNER_ORG |

### New spec: `support/core/support-ai-tenant-isolation.spec.ts` (new file, 2 tests)

| Test | Assertion |
|------|-----------|
| DENY: `suggestKbArticles` no accessible spaces | `getAccessibleSpaceIds → []` → early return; `selectWhere` NOT called |
| CONTROL: `suggestKbArticles` with accessible spaces | `selectWhere` called; `sqlValues(whereArg)` contains space IDs and orgId |

### New spec: `kb/wiki/kb-page-status-tenant-isolation.spec.ts` (new file, 2 tests — covers isolation gate gap)

| Test | Assertion |
|------|-----------|
| DENY: `lock` different org | `findFirst → null` → NotFoundException |
| CONTROL: `lock` owning org | `sqlValues(updateWhere arg)` contains OWNER_ORG and PAGE_ID |

---

## Bite Proof

Each fix was neutered (vulnerable state restored), the relevant test suite re-run, failure confirmed, then the fix was restored and the suite verified green.

| Fix | Neuter | Test Result (neutered) | After restore |
|-----|--------|------------------------|---------------|
| F1: workflows publishWorkflow | Removed `eq(workflows.orgId, orgId)` from update | 1 FAIL: OWNER_ORG missing from sqlValues | All 10 PASS |
| F2+F3: webhooks retryEvent | Removed orgId from both updates | 1 FAIL: OWNER_ORG missing from allWhereArgs | All 6 PASS |
| F4: support-ai searchKbForTicket | Removed `if (accessibleSpaceIds.length === 0) return []` | 1 FAIL: DENY test — selectWhere WAS called (db queried despite no accessible spaces) | All 2 PASS |

---

## Disproved Candidates

**Pattern #1 (BOLA) — inventory:** `WebhooksService.listEvents`, `WebhooksService.get`, `WebhooksService.update`, `WebhooksService.remove` all apply orgId on both the read guard and the write predicate. No BOLA found in these paths.

**Pattern #1 (BOLA) — kb:** `KbPageStatusService.lock/publish/archive/unarchive/verify/markStale` all call `assertPageAccessible(db, user, pageId)` which includes `eq(kbPages.orgId, user.orgId)` in its findFirst predicate, plus the update writes include `eq(kbPages.orgId, orgId)`. Correctly guarded.

**Pattern #1 (BOLA) — notifications:** `NotificationsService` always scopes by userId from `@CurrentUser()`. No cross-tenant gap found.

**Pattern #3 (404-not-403) — workflows:** All cross-tenant probes via the read guard return NotFoundException (404), not ForbiddenException. Correct.

**Pattern #4 (route exposure) — integrations:** All integration routes carry `@RequirePermission` or `@AuthorizedInService`. No unguarded route found in territory.

**Pattern #5 (Universal identity check):** No `@Universal()` route in my territory reads or writes tenant data without an explicit orgId predicate. No gap found.

**Pattern #6 (widening userId filter):** No endpoint in my territory accepts an optional `userId` param that widens result scope without an explicit permission gate. `workflows/listWorkflows` scopes by orgId only, not by a user-supplied filter. No gap found.

**Pattern #8 (SSRF) — integrations:** `WebhooksService.retryEvent` calls the webhook URL. The code path routes through `fetch(webhook.url)` — the SSRF guard `common/security/ssrf-guard.ts` is applied at `InventoryWebhookEmitter`, not inline in `retryEvent`. The retry path calls `InventoryWebhookEmitter.emit()` which does apply the guard. No new SSRF surface found.

**Pattern #9 (unbounded resource consumption):** All list endpoints in territory paginate with hard caps. AI/KB search has `.limit(12)` cap applied. No unbounded scan found.

---

## Tenant Isolation Ratio

| Before session | After session |
|----------------|---------------|
| 841 / 843 (99.8%) | 843 / 843 (100%) |

Added `webhooks-tenant-isolation.spec.ts` (WebhooksService, previously uncovered) and `kb-page-status-tenant-isolation.spec.ts` (KbPageStatusService, previously uncovered). The gate now exits 0.

---

## Module Suite Results

**All territory modules — final run (after all fixes and spec repairs):**

| Metric | Count |
|--------|-------|
| Test suites run | 171 |
| Suites passed | 170 |
| Suites skipped | 1 (`.skip` in source, not in my territory) |
| Tests passed | 1303 |
| Tests skipped | 7 |
| Tests failed | 0 |

**Pre-existing spec regressions introduced by F4 fix (and repaired in this session):**

- `support-ai-kb-filter.spec.ts` — 3 tests: called `new SupportAiService(...)` without the new `kbAccess` arg and `suggestKbArticles` without `userId`. Fixed by adding `makeKbAccess()` as 8th constructor arg and adding `userId` to call sites.

Both regressions were repaired in this session; the final run above reflects the repaired state.

---

## Files Changed

| File | Change |
|------|--------|
| `src/modules/workflows/workflows-crud.service.ts` | F1 fix: add `eq(workflows.orgId, orgId)` to `publishWorkflow` update |
| `src/modules/inventory/webhooks/webhooks.service.ts` | F2+F3 fix: add orgId to both update clauses in `retryEvent` |
| `src/modules/support/core/support-ai.service.ts` | F4 fix: inject `KbAccessService`, add space ACL + restriction filter to `searchKbForTicket`, propagate `userId` |
| `src/modules/support/core/support-ai.controller.ts` | Pass `u.userId` to `suggestKbArticles` |
| `src/modules/support/core/support-tickets.service.ts` | Pass `userId` to `runFullAnalysis` in `createTicket` |
| `src/modules/support/core/support-ai-kb-filter.spec.ts` | Repair: add `kbAccess` mock, add `userId` arg |
| `src/modules/workflows/workflows-crud-tenant-isolation.spec.ts` | New tests: `publishWorkflow` DENY + CONTROL |
| `src/modules/inventory/webhooks/webhooks-tenant-isolation.spec.ts` | New file: `retryEvent` DENY + CONTROL |
| `src/modules/support/core/support-ai-tenant-isolation.spec.ts` | New file: `searchKbForTicket` ACL DENY + CONTROL |
| `src/modules/kb/wiki/kb-page-status-tenant-isolation.spec.ts` | New file: `lock` DENY + CONTROL (closes isolation gate gap) |
