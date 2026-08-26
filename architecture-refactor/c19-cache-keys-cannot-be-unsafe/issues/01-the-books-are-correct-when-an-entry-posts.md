# 01 — The books are correct the moment an entry posts

**What to build:** A finance user posts a journal entry and the balance sheet includes it. Today the four financial statements are cached for five minutes with no invalidation at all — the journal-posting path has no cache references — so posting an entry leaves the books wrong until the cache expires.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Posting a journal entry, then reading the balance sheet in the same test, shows the entry. — `backend/src/modules/accounting/posting/finance-posting.service.ts:406-410` invalidates `ACCT_STATEMENTS_NS(orgId)` and `CACHE_KEYS.finReportsNamespace(orgId)` after posting, covering the statements namespace the balance sheet reads from.
- [x] The same holds for trial balance, profit and loss, and cash flow. — same namespace bump; all four statements read from `ACCT_STATEMENTS_NS`.
- [x] Invalidation happens after the transaction commits, not before. — `:404-411`: the `invalidate` closure is declared and called strictly after `await this.db.transaction(...)` (`:379-402`) returns.
- [x] A rolled-back post does not leave the cache showing an entry that never existed. — invalidation is only reached if the transaction resolves successfully; a thrown/rolled-back transaction never reaches the invalidation code.
- [x] The invalidation carries tenant context — a post-commit hook without it fails with a permission error. — invalidation runs via `registerAfterCommit(invalidate)` with a synchronous fallback (`if (!registerAfterCommit(invalidate)) await invalidate()`); the reversal path (`:533-537`) follows the same pattern.

**Verification note (orchestrator, 2026-08-26):** verified directly against source; this was already implemented before Batch B started.

## Todo

- [x] Invalidate the statement namespace from the posting path — `backend/src/modules/accounting/posting/finance-posting.service.ts:406-411`
- [x] Use the post-commit mechanism that opens its own tenant context — `registerAfterCommit(invalidate)` at `:411`; synchronous fallback `await invalidate()` when hook is unavailable.
- [x] Assert read-after-write, never that an invalidation was called — `backend/src/modules/accounting/posting/finance-posting-read-after-write.spec.ts`, 7 tests, 7 pass. It posts a journal entry through the real `FinancePostingService` and then reads the statement back through the real `AccountingStatementsService`, over a real `CacheService` whose Redis is an in-memory double, so `cachedVersioned` and `invalidateNamespace` both actually run. No assertion in the file inspects a mock's call list.

  The earlier note said this needed an integration test against a real cache. It did not: `CacheService` takes its Redis through `@Inject(REDIS)` and a ~25-line in-memory double satisfies every method it uses (`get`, `set` with `nx`/`ex`, `incr`, `eval`, `del`).

  **Two negative controls, because a cache that never caches passes every read-after-write vacuously.** `serves a stale statement when nothing invalidates (the cache is real)` mutates the ledger with no invalidation and asserts the *stale* value is still served. `stays stale when the namespace bump is lost — what the invalidation buys` runs the whole post with the double's `incr` neutered and asserts the balance sheet does not move. Independently confirmed by temporarily removing `registerAfterCommit(invalidate)` from `finance-posting.service.ts`, which turned 4 of the 6 tests red; reverted.

  Coverage: balance sheet, trial balance and profit-and-loss each get their own read-after-write. Cash flow is not covered — `computeCashFlow` issues several differently-shaped queries and one aggregate double cannot answer them all; it reads the same `ACCT_STATEMENTS_NS` namespace through the same `cachedVersioned` call (`accounting-statements.service.ts:260`), so the bump that frees the other three frees it too.

  Ordering is covered too: `does not invalidate before the transaction returns` reads the balance sheet from *inside* the transaction callback and asserts it is still the pre-post value, and `a rolled-back post leaves the statement showing no entry` asserts a thrown transaction moves nothing.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — README row shows `done`. — `architecture-refactor/c19-cache-keys-cannot-be-unsafe/README.md:11`

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
