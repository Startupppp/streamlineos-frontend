# 04 — Every namespace declares its invalidation

**What to build:** For every cached read it is written down which writes invalidate it, or that it is deliberately time-based. Staleness becomes a decision rather than an omission nobody noticed.

**Blocked by:** 02 — A cache key cannot omit its tenant

**Status:** done — matrix written covering all 46 namespaces; the call-site migration criterion is **withdrawn on evidence**, see below

## Acceptance criteria

- [x] Each namespace has either a list of invalidating writes or an express statement that it is TTL-only. — `backend/src/common/cache/cache-invalidation-matrix.ts`, `CACHE_INVALIDATION_MATRIX`: 46 entries, each `{ kind: "write", events: [...] }` or `{ kind: "ttl-only", reason: "..." }`.
- [x] Finance reports invalidate on invoice, bill, transfer and payment writes. — covered by the `acc:statements`/finance-reports namespace entries in the matrix, consistent with ticket 01's verified invalidation call sites.
- [x] Aggregate dashboards may remain TTL-only where the matrix records that choice. — matrix supports and uses the `ttl-only` variant with a required `reason` field.
- [~] ~~The 216 call sites are migrated to the tenant-aware wrappers.~~ — **WITHDRAWN 2026-08-26. This criterion was wrong, and acting on it made the codebase worse.** The migration was performed across 16 files / ~50 call sites, then **reverted in full**.

  **Why it was wrong.** A `CACHE_KEYS.*` factory already takes `orgId` as a required, typed parameter — `CACHE_KEYS.invProductsNamespace(orgId)` cannot be called without the tenant, so it is a compile error to omit it. That *is* the safety property ticket 02 asks for; these call sites were never unsafe. Replacing the factory with `cachedVersionedForOrg(orgId, "inv:products:list", …)` swapped one typed, named, greppable factory for a magic string literal repeated at every call site — six times in `inv-product-crud.service.ts` alone. A reader and its invalidator then had to independently agree on that literal, which is **precisely the writer/invalidator key-divergence bug ticket 03 exists to fix**. It also deleted two entries (`dashboardStats`, `executiveDashboard`) from a central registry that ~143 other keys still use.

  **Net effect of the migration:** zero tenant-safety gain, one central registry weakened, ~50 new opportunities for a typo to silently split a cache key. The only thing genuinely gained was TTL jitter — a stampede control for hot *shared* keys, which per-org list keys are not, and which can be added to the primitive later without abandoning the registry.

  **The corrected rule** (now recorded in the matrix file header so it is not re-attempted): use `CACHE_KEYS` for anything that has a factory; reach for a `*ForOrg` wrapper only for a genuinely new key with no registry entry. The `migrated` flag and `CACHE_MIGRATION_STATUS` export have been deleted from `cache-invalidation-matrix.ts` — they measured the wrong thing and made 15 non-defects look like pending work.
- [x] A new cached read without a matrix entry is caught in review. — enforced socially (the matrix is the reference reviewers check against), not by an automated CI gate — no lint rule or test enforces "new cache call ⇒ new matrix entry" yet.

**Verification note (orchestrator, 2026-08-26):** the reversal was prompted by the user questioning a single `search.service.ts` migration. The objection generalised: the same mistake had been made at ~50 sites across 16 files. Reverted in `modules/{inventory,finance,expenses,crm,support,timesheets,dashboard}`, with the two deleted registry factories restored. The lesson is in the ticket text rather than only in the diff, because the criterion as written would otherwise invite the same work again.

**Audit note (2026-08-26):** Verified matrix at source: `backend/src/common/cache/cache-invalidation-matrix.ts` — 46 entries confirmed. `migrated` flag and `CACHE_MIGRATION_STATUS` export were deleted as part of the revert (no longer present in file). All acceptance criteria are resolved; status "done" is correct. README row for 04 still says "in-progress" — corrected separately.

## Todo

- [x] Write the matrix before changing code — `backend/src/common/cache/cache-invalidation-matrix.ts:57-482`
- [~] ~~Migrate module by module~~ — withdrawn, see above
- [x] Read-after-write test per event-invalidated entry — `backend/src/common/cache/cache-invalidation-matrix.spec.ts`, 41 tests, 41 pass. The table is driven from `CACHE_INVALIDATION_MATRIX` itself rather than a hand-copied list, so a new entry is covered the moment it is added; a coverage guard asserts the split is exactly **36 `write` / 10 `ttl-only`** and fails if an entry appears without being reviewed.

  Per write entry the spec primes the namespace through the real `CacheService`, confirms the second read is a cache hit (the fetcher does not run again), invalidates, and confirms the third read refetches. It also primes a second tenant's namespace and asserts invalidating the first leaves the second warm.

  **The cache is real, not a mock:** `CacheService` over an in-memory Redis double, so `cachedVersioned` and `invalidateNamespace` both execute. The permanent negative control is `deafToInvalidation`, a flag that makes the double's `incr` a no-op — with it the version counter stays at 0 and the stale value keeps being served, which is what makes the 36 positive assertions mean something.

  Structure is checked too: no duplicate namespace keys, every entry's shape matching its discriminant, and every `ttl-only` entry carrying a non-empty `reason`.

  The matrix file itself needed no change — its `<orgId>`/`<userId>` placeholder templates were already machine-substitutable.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — NOTE: README still shows "in-progress" (stale from before the revert); corrected in the README separately.

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
