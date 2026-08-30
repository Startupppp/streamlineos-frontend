# L29 Common Infrastructure Report

**Status: DONE (with out-of-ownership gaps reported)**

## Blockers serviced for other lanes

1. **AV scanning seam** (`common/security/av-scan.ts`, `av-scan.spec.ts`): `NoopAvScanner` + `AvScanner` abstract class; `assertUploadAllowed` (type + size guard); `signDownloadToken`/`verifyDownloadToken` (HMAC-signed, expiring, nonce-randomized, orgId-bearing download tokens). 13 tests pass. Mail and storage lanes can now import the seam; the storage controller must call `verifyDownloadToken` + re-assert object-level access before streaming (reported OUT-OF-OWNERSHIP).

2. **Rate-limit TIERS audit**: All 30 unique `@UseRateLimit("key")` keys in the codebase have matching `TIERS` entries — `check:log-secrets` confirms "73 entries — OK". `timesheets-ai.controller.ts` has `@UseRateLimit("ai:invoke")` on 5 handlers but the class-level `@UseGuards` omits `RateLimitGuard` — rate limit is a no-op on those handlers. Reported OUT-OF-OWNERSHIP.

## Rate-limit gaps closed
- All TIERS entries verified present; zero new missing entries.

## Cache collision proof
- `cache.service.spec.ts` — 2 new cross-instance tests prove: (a) `invalidateNamespace` by instance A is visible to instance B sharing the same Redis (version counter bumped in shared store); (b) `invalidateForOrg("org-a")` does not evict instance B's `org-b` entries. All 13 cache.service tests pass.
- `cache-invalidation-matrix.spec.ts` — existing 36 write-entries proven with negative control (deaf-incr confirms the suite bites). 46 entries, 36 write, 10 ttl-only.

## Other verified-done items
- **SSRF**: `ssrf-guard.spec.ts` has `["IPv4-mapped, packed spelling", "http://[::ffff:7f00:1]/x"]` in `BLOCKED_ADDRESS_FORMS` and passes (56 tests). No second guard exists.
- **CORS before body parser**: `main.ts` line ~91 `enableCors()` precedes `useBodyParser("json")` at line ~102. Correct order. VERIFIED DONE.
- **Pagination contract**: `IdCursorPage.nextCursor: number | null` (not undefined); `CursorPage.pagination.nextCursor: string | null`. Hard cap 100 via `PAGE_SIZE_CAP` in `list-query.schema.ts`. Fixed stale `toBeUndefined()` → `toBeNull()` assertions in `cursor.spec.ts`.
- **After-commit hooks**: `TenantContextInterceptor.runInTenantTransaction` wraps every hook in `runInNewTenantTransaction` with proper tenant GUC. `registerAfterCommit` returns `false` on no context; most callers handle it. Two module callers do not (OUT-OF-OWNERSHIP below).
- **File sizes**: Largest non-spec file in `common/**` (excl. `rbac/`) is `cache-invalidation-matrix.ts` at 438 lines. No files exceed 500 lines.

## Files split
None required — all in-scope files under 500 lines.

## Test summary
`node ./node_modules/jest/bin/jest.js --testPathPattern="av-scan|ssrf-guard|cache.service.spec|cache-invalidation-matrix|rate-limit.service|rate-limit.guard|cursor.spec" --maxWorkers=1`: **174 passed, 0 failed** across 13 suites. Pre-existing failures: `list-query.schema.spec.ts` (22 failures — schemas in `modules/**` missing `pageNumberField`); `org-hierarchy-cache.service.spec.ts` (schema import error in `db/schema/hr/offboarding.ts` — `./hiring` not found, pre-existing). Neither introduced by this lane.

## OUT-OF-OWNERSHIP

1. **`backend/src/modules/timesheets/core/timesheets-ai.controller.ts` line 24**: Class-level `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)` omits `RateLimitGuard`. Five handlers carry `@UseRateLimit("ai:invoke")` but it is never enforced. Add `RateLimitGuard` to the class-level guard list.

2. **`backend/src/modules/build/approvals/approvals.service.ts` line 211**: `registerAfterCommit(...)` return value is ignored — if no ambient context, the notification hook is silently dropped. Add: `if (!registerAfterCommit(...)) await runInNewTenantTransaction(...)`.

3. **`backend/src/modules/build/core/projects-tickets-rank-utils.ts` line 200**: Same pattern — rank rebalance is dropped on no-context. Add fallback inline call.

4. **`backend/src/modules/storage/**`**: Storage retrieval endpoints must call `verifyDownloadToken(token, secret)` from `common/security/av-scan.ts` and re-assert object-level access before streaming. The signing utility is available; the retrieval endpoint wiring is not in my ownership.

5. **`backend/src/common/pagination/list-query.schema.spec.ts`** imports schemas from `modules/build/**` and `modules/accounting/**` that do not use `pageNumberField`. Failing schemas: `listProjectCustomersSchema`, `roadmapListQuerySchema`, `feedbackListQuerySchema`, `changelogListQuerySchema`, `timeEntriesListQuerySchema`, `teamTimesheetsQuerySchema`, `listManagedProductsQuerySchema`, `listWorkspacesQuerySchema`, `listMembersQuerySchema`, `listPortfoliosQuerySchema`, `listAccountsQuerySchema`, `listCustomersOutstandingQuerySchema`, `listPurchaseBillsQuerySchema`, `listJournalQuerySchema`. Each needs `page: pageNumberField` added to its schema.

## New findings
- `check:log-secrets` also verifies all `@UseRateLimit` keys are in TIERS — 73 entries confirmed.
- `madge@8 --circular`: zero circular dependencies.
- Typecheck errors: pre-existing in `modules/hr/recruitment/**`, `modules/payroll/runs/**`, `modules/accounting/**`, `modules/support/core/support.module.ts`. None introduced by this lane.
