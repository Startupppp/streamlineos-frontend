# V7b — Independent Verification Report

**Date:** 2026-08-30  
**Verifier:** V7b (independent lane, no source edits)  
**Method:** source inspection + test runs + script execution  
**DB probes:** not run (no connection available)

---

## Claim 1 — SSRF fixes (SECFIX1)

### 1a. CRM `crm-automation-runner.service.ts` — CONFIRMED

`checkWebhookUrl` is imported at line 22 and called at line 231 inside `case "call_webhook"`, before `fetch(url, ...)` at line 234. The call is `const urlCheck = await checkWebhookUrl(url); if (!urlCheck.allowed) throw new Error(...)`. The throw exits the try block and is caught by the catch at line 343, which returns `{ status: "error", message: "SSRF: ..." }`. The fetch at line 234 is unreachable after the throw. No silent suppression — the error message is logged and returned in the run log.

`checkWebhookUrl` in `common/security/ssrf-guard.ts` returns `{ allowed: boolean, reason? }` — it does not throw, so the caller's `!urlCheck.allowed` branch is the sole gate. Confirmed.

### 1b. HR `hr-webhooks.service.ts` — CONFIRMED

`checkWebhookUrl` imported at line 21. No `PRIVATE_IP_PATTERN` constant or `assertSsrfSafe` method in the file — both deleted, not merely unused. `createSubscription` calls `checkWebhookUrl(input.url)` at line 67 and throws `BadRequestException` at line 68, before the DB `insert` at line 71. `updateSubscription` checks `if (input.url)` at line 93 then calls `checkWebhookUrl` at line 94 and throws at line 95, before the `update` at line 98. Both checks are BEFORE the write.

### 1c. Test count — CONFIRMED: 22 across 3 suites

Actual run:

| Suite | Tests |
|---|---|
| `crm/automation-studio/__tests__/webhook-ssrf.spec.ts` | 4 passed |
| `hr/automations/__tests__/hr-webhooks-ssrf.spec.ts` | 6 passed |
| `ai/confirmation/ai-confirmation.service.spec.ts` | 12 passed (9 pre-existing + 3 new) |

Total: **22 tests**, matching the report.

### Would the tests fail if reverted?

**CRM test 1** ("blocks a request to an internal IP"): YES. Without the guard call, `fetch` would be attempted (Node 24 has global fetch). The result status might be "error" due to a network failure, but `expect(result.message).toContain("SSRF")` would fail — the message would be a network error string, not the SSRF message. Also `expect(mockCheckWebhookUrl).toHaveBeenCalledWith(...)` would fail. This test bites.

**HR create test 1** ("throws BadRequestException for an internal URL"): YES. Without the guard, `mockDb.insert` would be called and no exception thrown. `expect(...).rejects.toBeInstanceOf(BadRequestException)` fails. `expect(mockDb.insert).not.toHaveBeenCalled()` fails. Bites.

**Proof tests** (both repos): These tests mock `checkWebhookUrl` to return `{ allowed: true }` and assert the normal path proceeds. They would pass with or without the fix, because they test the allow path, not the block path. They document the attack scenario but are not regression tests.

---

## Claim 2 — 403 existence oracle (`ai-confirmation.service.ts`) — CONFIRMED (source); test bite: NOT CONFIRMED

### Source fix: CONFIRMED

Line 162: `where(and(eq(aiActionProposals.id, proposalId), eq(aiActionProposals.orgId, input.actor.orgId)))`. The `orgId` predicate is present. Line 167: `if (!row) throw new NotFoundException("Proposal not found")`. Both halves of the fix are in place.

The `ForbiddenException` at line 188 (`if (row.orgId !== input.actor.orgId || row.userId !== input.actor.userId)`) is defense-in-depth. With the WHERE clause correctly filtering by `orgId`, a cross-tenant probe returns no row at line 166 and hits `NotFoundException` at line 167 before reaching line 188. The 404 message "Proposal not found" is identical for genuine misses and cross-tenant probes. No oracle.

### Test bite: NOT CONFIRMED

All three oracle-specific tests use mock DB instances that do not evaluate WHERE predicates. They return rows (or empty) unconditionally, so none of them would fail if the `eq(aiActionProposals.orgId, input.actor.orgId)` predicate were removed from the production code. The tests prove the correct exception types are thrown given mocked DB behavior, but do not prove the SQL predicate is present. The fix is correct — the test evidence is not regression-safe for the WHERE clause.

The `resetAllMocks` concern does not apply here — the spec uses fresh `buildEmptySelectConfirmDb()` / `buildConfirmDb()` factories per test, not shared mocks with `resetAllMocks`.

---

## Claim 3 — Cache identity fixes (CACHE1) — CONFIRMED

### `hr/time/leaves.service.ts` key — CONFIRMED

Line 218: `\`${scope}:${u.userId}:${year}\`` inside `cachedVersioned`. The actor's `userId` is in the sub-key. Before the fix this was `\`${scope}:${year}\`` (two callers with the same scope and year shared a key). Correct.

### `deals-approvals.service.ts` — CONFIRMED

Line 133: `cachedVersioned` call with `CACHE_KEYS.approvalsList(orgId)` as namespace and `` `${query.status ?? "all"}:${query.limit ?? 20}` `` as sub-key. Lines 92 and 128: both writers call `this.cache.invalidateNamespace(CACHE_KEYS.approvalsList(orgId))`.

### Invalidation wire in `cache-invalidation-matrix.ts` — CONFIRMED

Entry `"deals:approvals:<orgId>"` is present at line 260.

All three parts (versioned read key, namespace invalidation from both writers, matrix entry) are wired. The fix is complete.

---

## Claim 4 — Outbox deletions (OBX1) — CONFIRMED

Grep for `OutboxWriter` or `randomUUID` in all four files:

| File | OutboxWriter | randomUUID |
|---|---|---|
| `grn.service.ts` | not found | not found |
| `so-fulfillment.service.ts` | not found | not found |
| `shipments.service.ts` | not found | not found |
| `inv-stock-adjustments.service.ts` | not found | not found |

The four emit calls and their import companions are deleted.

**`check:outbox-consumers` exit code: 0** — confirmed by running `npm run check:outbox-consumers` directly:

```
Scanned 4628 TypeScript files
Emitted event types  (18): ...
OK — every emitted outbox event type has a registered consumer
EXIT: 0
```

The 18 emitted types all have consumers. The previous 4 orphaned types (`inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`) are absent from the emitted list.

---

## Claim 5 — KB citation ACL (`kb-ask.service.ts`) — CONFIRMED (source); test bite: NOT CONFIRMED

### Source fix: CONFIRMED

`kbArticleRestrictions` is imported at line 8. `type SQL` imported at line 2. Private `articleRestrictionFilter` method at lines 232–256 builds a SQL sub-select that checks `NOT EXISTS (restriction) OR EXISTS (restriction WHERE userId OR role matches)`.

`resolveVisibleArticles` at lines 258–280:
1. Gets accessible space IDs.
2. Calls `this.access.isAdmin(user)` at line 262.
3. For non-admin users (line 270): calls `this.access.getPrincipalIds(user)` and pushes `this.articleRestrictionFilter(user.orgId, principal)` to the conditions array.
4. Executes `db.select().from(kbArticles).where(and(...conditions))` at lines 275–278.

The restriction filter is in the SQL WHERE predicate, not in post-processing. Admin users skip it, matching the retrieval path (`KbSearchService.articleRestrictionFilter`). Citation and retrieval paths enforce the same gate. Correct.

### Test bite: NOT CONFIRMED

The `mockDb` in `kb-ask.service.spec.ts` returns `[{ id: articleResult.id }]` unconditionally from its `select().from().where()` chain, without evaluating predicates. If the restriction filter lines (269–273) were removed from `resolveVisibleArticles`, the mock would still return the article id and all 7 tests would still pass. No test specifically asserts the restriction filter is applied. The citation ACL fix is correct in source but has no regression-catching test.

**Test counts confirmed:** `kb-ask.service.spec.ts` 7 tests, `kb-ask-tenant-isolation.spec.ts` 2 tests, 9 total. Matches report.

---

## Claim 6 — Legacy-actor scanner (ACTOR1) — CONFIRMED (scanner output); pg_catalog cross-check not independently verified

Running `node src/scripts/scan-legacy-org-actors.mjs`:

```
Organizational (to migrate):   679
Bridge (person↔account links): 3
Authentication (identity):     5
Unknown (manual review):       0
Total user_id FKs scanned:     687
```

Self-test: `Self-test passed (687 total FKs found, all known examples verified)`.

The claim of 679 organizational FKs is confirmed. The build module now shows 77 (was 0 before the regex fix). The honest count of 679 is confirmed.

**pg_catalog cross-check** (`--catalog` mode requires `DATABASE_URL`): not independently run — no DB connection available. The report's `--catalog` output showing 0 invisible FKs cannot be independently verified. The static `KNOWN_RAW_SQL_ACTOR_FKS` list is present in the script but its correctness against the live DB cannot be confirmed without a connection.

---

## Claim 7 — RLS repairs (RLSFIX1) — CONFIRMED (files + journal); applied state not independently verified

### Migration files and journal entries — CONFIRMED

All three migrations exist on disk:
- `0676_fix_kb_acl_revision_notnull_order.sql`
- `0677_rls_fix_guc_key.sql`
- `0678_rls_fix_feedback_cycle_responses.sql`

All three tags appear in `migrations/meta/_journal.json`.

### 0677 content — CONFIRMED

`0677_rls_fix_guc_key.sql` uses `current_org_id()` (the function alias), not the literal `app.current_org_id` string that never gets set. Both policies (`expense_export_jobs`, `inv_compliance_documents`) include `WITH CHECK`. The GUC key bug is fixed.

### 0678 content — CONFIRMED

`0678_rls_fix_feedback_cycle_responses.sql` adds `org_id` column, backfills from `feedback_cycle_requests`, adds CHECK NOT VALID → VALIDATE → SET NOT NULL → DROP CHECK, adds FK NOT VALID → VALIDATE, adds composite index `(org_id, request_id)`, enables RLS, creates `tenant_isolation` policy with `current_org_id()`.

`src/db/schema/hr/feedback.ts` has `orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull()` and the index at line 44.

`src/modules/hr/performance/feedback.service.ts`:
- Line 120: `submitResponse` inserts with `orgId` in values.
- Line 150: `getResults` filters with `eq(feedbackCycleResponses.orgId, orgId)`.

### 0676 rename — CONFIRMED

The journal entry tag is `0676_fix_kb_acl_revision_notnull_order` and the file on disk is named `0676_fix_kb_acl_revision_notnull_order.sql`. Journal entry and file name match.

### Applied state — NOT INDEPENDENTLY VERIFIED

No DB connection; cannot confirm `db:migrate` applied these migrations. The report claims "RECORDED 0677 ... RECORDED 0678 ..." but this cannot be cross-checked from source alone.

---

## Summary

| Claim | Verdict | Key finding |
|---|---|---|
| 1. SSRF — CRM webhook guard | CONFIRMED | Guard is before fetch; throw prevents fetch; 4 CRM tests pass; key tests bite on revert |
| 1. SSRF — HR local guard deleted | CONFIRMED | `assertSsrfSafe`/`PRIVATE_IP_PATTERN` absent; 6 HR tests pass; key tests bite on revert |
| 1. Test count 22 | CONFIRMED | Actual: 4+6+12=22 |
| 2. Oracle fix — source | CONFIRMED | orgId in WHERE; absent row → 404 not 403; no message disclosure |
| 2. Oracle fix — tests bite | NOT CONFIRMED | Mock ignores WHERE predicates; all 3 oracle tests pass regardless of WHERE clause |
| 3. Cache key — leaves userId | CONFIRMED | `${scope}:${u.userId}:${year}` in key |
| 3. Cache key — deals-approvals | CONFIRMED | `cachedVersioned`, `invalidateNamespace` on both writers, matrix entry |
| 4. Outbox deletes | CONFIRMED | 4 imports absent; script exits 0 |
| 5. KB citation ACL — source | CONFIRMED | Restriction filter in SQL predicate; admin bypass correct; same gate as retrieval |
| 5. KB citation ACL — tests bite | NOT CONFIRMED | Mock returns IDs unconditionally; removing filter lines would not fail any test |
| 6. Scanner count 679 | CONFIRMED | Actual scanner output: 679 organizational |
| 6. Scanner invisible → 0 | NOT INDEPENDENTLY VERIFIED | Requires DB connection for `--catalog` mode |
| 7. Migration files + journal | CONFIRMED | All 3 files on disk, all 3 tags in journal |
| 7. 0677 GUC key | CONFIRMED | Uses `current_org_id()` not literal `app.current_org_id` |
| 7. 0678 feedback_cycle_responses | CONFIRMED | org_id, FK, index, RLS, policy; schema and service both updated |
| 7. Applied to DB | NOT INDEPENDENTLY VERIFIED | No DB connection |

### Residual risk notes

1. **Oracle test gap** (Claim 2): The WHERE predicate fix is correct in source but would survive intact even if a bad future refactor removed the orgId filter — no test catches that. An e2e test with two real org accounts is the only proof that bites.

2. **KB citation test gap** (Claim 5): Same pattern — source is correct, no unit test catches a revert of the restriction filter. The risk is asymmetric: a content disclosure requires the retrieval path to leak a restricted article into `top` *and* the citation path to not re-filter. The retrieval path is still the primary gate; the citation fix is defense-in-depth. Its test should be similarly defense-in-depth.

3. **Scanner pg_catalog gap** (Claim 6): The "0 invisible FKs" claim rests on the `KNOWN_RAW_SQL_ACTOR_FKS` static list being correct. The list was validated against the live DB when the report was written, but that cannot be re-confirmed without a DB connection.
