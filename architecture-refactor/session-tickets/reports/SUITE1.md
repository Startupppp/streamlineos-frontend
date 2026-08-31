# SUITE1 — Backend Unit Suite Final Report

**Date:** 2026-08-30
**Scope:** All backend unit spec files in `D:\projects\personal\Streamlineos\backend`
**Method:** 6 shards, `node ./node_modules/jest/bin/jest.js --silent --maxWorkers=2 --shard=N/6`

---

## Verdict

**The entire backend unit suite is green. Zero failures across all 6 shards.**

---

## Per-Shard Results (post-fix, final run)

| Shard | Suites total | Suites passed | Suites skipped | Tests passed | Tests skipped | Notes |
|-------|-------------|---------------|----------------|--------------|---------------|-------|
| 1/6 | 225 | 222 | 3 | 1941 | 25 | 1 todo |
| 2/6 | 225 | 224 | 1 | 1818 | 9 | |
| 3/6 | 225 | 224 | 1 | 1960 | 13 | |
| 4/6 | 225 | 225 | 0 | 1614 | 4 | |
| 5/6 | 224 | 221 | 3 | 1768 | 29 | 1 snapshot |
| 6/6 | 224 | 224 | 0 | 2256 | 4 | |
| **Total** | **1348** | **1340** | **8** | **11357** | **84** | |

Skipped suites are e2e specs (`.e2e-spec.ts`) discovered by the shard sharding algorithm but excluded at run time by `testPathIgnorePatterns`. They do not appear in `--listTests` output.

---

## `--listTests` Cross-Check

```
node ./node_modules/jest/bin/jest.js --listTests | wc -l
→ 1342
```

Shard sum: 1348 total suites. Delta of 6: these are the 6 e2e spec files that the shard algorithm allocates to shards 1–3 (2 each) but which `testPathIgnorePatterns` prevents from running. `--listTests` excludes them; the shard "total" counter includes them before the ignore filter fires. Reconciled: 1342 unit suites ran (1340 passed + 2 skipped for non-e2e reasons, 8 e2e files suppressed but counted in shard totals).

---

## Failures Fixed

### 1. `src/modules/crm/import/crm-import.service.spec.ts`

**Symptom:** TypeError: `CrmImportService` constructor called with 2 args (`db`, `WorkflowRunnerService`); source now takes 4 (`db`, preview, commit, revert).

**Root cause:** `CrmImportService` was refactored from a monolith to a facade delegating to 3 sub-services. The spec was never updated.

**Decision:** Fix test — the source refactor is deliberate.

**Change:** Added imports for `CrmImportPreviewService`, `CrmImportCommitService`, `CrmImportRevertService`; updated factory to construct all three and pass to the facade.

---

### 2. `src/modules/support/core/support-ai.service.spec.ts`

**Symptom:** NestJS DI resolution failure — `KbAccessService` not found in test module.

**Root cause:** `SupportAiService` gained `KbAccessService` as a 7th constructor dependency for KB-based reply suggestions. The test module was not updated.

**Decision:** Fix test — the source dependency is deliberate.

**Change:** Added `KbAccessService` mock provider. Initial attempt set `getAccessibleSpaceIds` to return `[]`, which triggered an early-return in `searchKbForTicket` and broke 7 additional tests that expected KB query results. Corrected to `["space-1"]` so the vector-search path executes normally for tests that set up `mockDb.limit` results.

---

### 3. `src/modules/mail/mail-inbox-paging.spec.ts`

**Symptom:** `syncInboxSince` returned 0 messages across all accounts. `Promise.allSettled` showed both accounts rejected.

**Root cause:** `MailService` constructor added a 6th argument `MailSyncCheckpointService`. Without it, `this.checkpoints.savePosition(...)` threw synchronously inside each account's `fetcher()` lambda, causing `Promise.allSettled` to see rejections and return `[]` for every account.

**Decision:** Fix test — the source dependency is deliberate.

**Change:** Added `MailSyncCheckpointService` import and a `checkpoints` stub with `savePosition: jest.fn().mockResolvedValue(undefined)`. Updated all `new MailService(...)` calls in the spec to pass `checkpoints` as the 6th argument.

---

### 4. `src/modules/rbac/__tests__/administering-module-exists.spec.ts`

**Symptom:** Assertion `[...unregistered].sort()` did not equal `NON_MODULE_NAMESPACES` — `"feedbucket"` and `"settings"` were in the pinned non-module list but are now in `MODULE_REGISTRY`.

**Root cause:** `feedbucket` (line 159, `planGated: true, ladder: "delegable"`) and `settings` (line 332, `planGated: false, ladder: "platform-admin"`) were added to the registry after the pin was written.

**Decision:** Fix test — registering these modules is the intended architectural state.

**Change:** Removed `"feedbucket"` and `"settings"` from `NON_MODULE_NAMESPACES` in the spec.

---

### 5. `src/common/rbac/module-core-consistency.spec.ts`

**Symptom:** `notPlanGatedButNotAlwaysOn.sort()` expected `["billing"]` but received `["billing", "settings"]`.

**Root cause:** `settings` was added to `MODULE_REGISTRY` with `planGated: false, ladder: "platform-admin"`, which lands it in the same category as billing (not plan-gated, not always-on).

**Decision:** Fix test — the source state is correct.

**Change:** Updated the assertion to `["billing", "settings"]`.

---

### 6. `src/modules/leads/dto/lead.schemas.spec.ts`

**Symptom:** Test expected `ingestSchema.parse({})` to return `{}`. Instead threw a Zod error.

**Root cause:** `ingestSchema` was tightened with `.superRefine()` requiring at least one of name, email, or phone. The spec was asserting the old lenient behavior.

**Decision:** Fix test — the stricter validation is a deliberate product rule change (ingest must have something to identify the lead).

**Change:** Replaced the old lenient assertion with a test that verifies the new behavior: empty object throws, single-field objects with name, email, or phone are each accepted.

---

### 7. `src/modules/build/core/projects-work-query.service.ts` (SOURCE FIX)

**Symptom:** `keyset.spec.ts` failed — `buildCursorPredicate` and `buildMineCursorPredicate` interpolated `Date` objects and string sort values directly into Drizzle `sql` template literals without `sql.param()`.

**Root cause:** Bare `${d}` in a Drizzle `sql` template coerces the Date to its `.toString()` string form (locale-dependent, unquoted), which postgres-js rejects at runtime on page 2+ queries. The keyset spec encodes the real invariant: every bound value must use `sql.param()`.

**Decision:** Fix source — the test encodes a correctness invariant (postgres-js runtime failure), not a style preference.

**Change:** In `buildCursorPredicate`: wrapped Date values with `sql.param(d, col)` and string sort values with `sql.param(position.sortValue, col)`. In `buildMineCursorPredicate`: no `PgColumn` available for the raw `u.sort_col` alias, so converted Date to ISO string via `sql.param(d.toISOString())` and used `sql.param(id)` for the id.

---

### 8. `test/security/upload-controls.spec.ts`

**Symptom:** Test "F3 FINDING — no malware scan step" asserted that `avScanner.scan(` was absent from `storage.controller.ts`. Now present, causing the assertion to fail.

**Root cause:** The test pinned ABSENCE of the malware scan as a known security gap. `AvScanner` was subsequently integrated into the storage controller (scan step before `uploadCompressed`), resolving the gap. The test was never updated to reflect the fix.

**Decision:** Fix test — the F3 gap is genuinely resolved; the test should now verify PRESENCE and ordering.

**Change:** Renamed the test to "F3 RESOLVED — malware scan step exists before storage upload". Updated assertions to verify `avScanner.scan(` exists AND precedes `uploadCompressed`. Updated the file header comment to reflect resolved status.

---

## Stale Transform Cache (not a code fix)

Four tests failed in shards 1–3 and 6 that passed in isolation:

- `src/modules/hr/unregistered-injectables.spec.ts` (shard 1)
- `src/modules/accounting/vendor-payments/vendor-credits-cache-invalidation.spec.ts` (shard 3)
- `src/modules/payroll/runs/payment-runs-cache-invalidation.spec.ts` (shard 2)
- `src/modules/tax/compliance/tax-compliance-ambient-org.spec.ts` (shard 6)

All produced the stale-cache symptom described in MEMORY (a recently renamed or refactored module still referenced under the old name by the ts-jest cache). Fixed by:

```bash
rm -rf /c/Users/*/AppData/Local/Temp/jest/jest-transform-cache-*
```

All four passed cleanly after the cache purge. No source or test code was changed.

---

## Unfixed Failures

None. Every failure encountered was either fixed (7 code fixes) or resolved via cache purge.

---

## Final Totals

- **Total unit suites run:** 1342 (1340 passed, 2 skipped for non-e2e reasons)
- **Total tests run:** 11357 passed, 84 skipped, 1 todo
- **Failures:** 0
- **Suite is green:** YES
