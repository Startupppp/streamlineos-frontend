# c19 · A cache key cannot be unsafe, and a write invalidates what it changed

**Status: the primitive is excellent, what surrounds it is convention.** Verified at source 2026-08-25. 216 cache call sites across ~120 namespaces. `CacheService` is a genuinely deep module — in-process single-flight, a Lua-CAS distributed fill lease, O(1) namespace versioning, and no `SCAN` on the request path. **Keep it entirely.** The gaps are in what callers are free to do around it: nothing requires a tenant in a key, nothing pairs a write with an invalidation, and there is no TTL jitter anywhere.

## Problem Statement

**As a finance user, my books are wrong for five minutes after I post an entry.** Trial balance, profit and loss, balance sheet and cash flow are all cached for 300 seconds. The accounting module invalidates periods, settings and chart-of-accounts — and the journal-posting path has **no cache references at all**. Post a journal entry, then look at the balance sheet: it does not include it.

**As a finance user, the same is true of every finance report.** Creating an invoice, bill, transfer or payment invalidates none of the report keys.

**As a sales user, my KPIs never refresh.** The writer builds a key including the date range and representative; the invalidator clears a key with those segments empty. The two coincide only on the unfiltered view, so every filtered KPI view is stale until its TTL expires.

**As a developer, a cache key is safe by convention.** Nothing in the interface requires an organisation. ~120 namespaces have held the line by discipline, and the sales-KPI defect is the proof that discipline is the mechanism — not because someone was careless, but because the interface permits it.

**As an operator, a cold start stampedes.** No key carries TTL jitter, so at 50k organisations roughly a million session keys expire in the same instant. The fill lease dedupes *per key*, so it does not help here — every distinct key fires its own query simultaneously.

**As an operator, I have not budgeted Redis.** Permission sets dominate: at a million users and roughly 5 KB each, that is about 5 GB, and the realistic ceiling across dashboards, RBAC matrices, inventory and finance reports is nearer 35 GB.

## Solution

Keep the primitive. Change what the interface allows and what a write is obliged to do.

**Make an unsafe key unrepresentable.** Tenant-aware wrappers that take the organisation as a *parameter* rather than trusting the caller to include it in a string. They prepend it and add TTL jitter in the same place, so both problems are solved by adoption rather than by review.

**Pair every cached read with the write that invalidates it.** Not a blanket rule — an explicit, reviewed matrix. Financial statements must invalidate on journal post; aggregate dashboards may legitimately stay TTL-only. The requirement is that it is a **decision**, recorded, rather than an omission nobody noticed.

**Fix the sales-KPI key mismatch**, which is a live bug and the clearest evidence for the wrapper.

## User Stories

1. As a finance user, I want my balance sheet to include an entry the moment I post it, so that my books are never wrong.
2. As a finance user, I want the trial balance, profit and loss and cash flow to reflect posted entries immediately, so that reports agree with each other.
3. As a finance user, I want creating an invoice or bill to refresh the reports that include it, so that I do not have to wait or force a reload.
4. As a sales user, I want a filtered KPI view to refresh when the underlying data changes, so that filtering does not freeze the numbers.
5. As any user, I want a cached page to never show me another organisation's data, so that caching is not a tenancy risk.
6. As any user, I want a cached page to never show me data my permissions would deny, so that caching cannot widen access.
7. As a user, I want a cache miss under load to result in one query rather than thousands, so that a cold start does not take the product down.
8. As a developer, I want the organisation to be a parameter of the cache interface, so that omitting it is not possible.
9. As a developer, I want TTL jitter applied by the wrapper, so that expiry is spread without a per-caller decision.
10. As a developer, I want to know which cached reads are event-invalidated and which are TTL-only, so that staleness is a documented choice.
11. As a developer, I want a write path to declare what it invalidates, so that a new write does not silently serve stale data.
12. As a developer, I want the namespace-versioning primitive kept, so that invalidation stays O(1) rather than a key scan.
13. As a developer, I want to add scope to a key when a query becomes scope-aware, so that a today-harmless omission does not become a leak later.
14. As a security reviewer, I want every cache key to carry its tenant, so that isolation does not depend on a string literal.
15. As a security reviewer, I want permission-dimensioned data keyed by scope, so that two users with different scopes cannot share an entry.
16. As an operator, I want a Redis memory budget and an eviction policy set, so that reaching the ceiling degrades rather than fails.
17. As an operator, I want eviction to be safe everywhere, so that losing a key is never losing data.
18. As an operator, I want stale financial data to be impossible rather than unlikely, so that a cache is not a correctness risk on money.

## Implementation Decisions

**Already shipped — keep all of it**

- **`CacheService` stays as designed.** In-process single-flight, Lua-CAS distributed fill lease, O(1) namespace versioning via `cachedVersioned`/`invalidateNamespace`, and no `SCAN` on the request path. This is one of the better modules in the codebase and nothing here replaces it.
- **Cross-tenant and cross-role safety is currently sound.** The three riskiest surfaces already put scope in the key — search by organisation and user, the project list by user, scope and filters, and expenses by user, admin flag and filters. **No permission-dimension leak was found.** This spec makes that structural rather than lucky.
- **Eviction is already safe.** The one place Redis is a source of truth — the session-revocation tombstone — has a verified database fallback in the auth guard.

**To build**

- **Tenant-aware wrappers** taking the organisation as a parameter, prepending it to the key and applying ±15% TTL jitter. Both existing shapes get one: the plain cached read and the namespace-versioned read. Jitter belongs in the wrapper precisely because no caller will remember it.
- **Migrate the 216 call sites to the wrappers.** Mechanical, module by module, and the migration is what closes both the tenancy and the stampede problems.
- **An explicit invalidation matrix.** For each cached namespace: the writes that must invalidate it, or an express statement that it is TTL-only. Financial statements and finance reports move to event invalidation. Leave analytics, support reports and HR dashboards may stay TTL-only — but as a recorded decision.
- **Journal posting invalidates the statement namespace.** This is the single highest-value line in the spec.
- **Fix the sales-KPI key.** Writer and invalidator must derive the key from one function; the defect is that two places construct it.
- **Add scope to the leave-analytics key.** Harmless today because the query is organisation-wide, and a leak the moment it becomes scope-aware. Fixing it now costs nothing.
- **Set the Redis memory budget and `volatile-lru` eviction**, sized against the stated arithmetic.
- **Invalidation happens after commit, not before.** A write that invalidates and then rolls back leaves the cache correct but cold; a write that invalidates before committing can repopulate from a snapshot that never became real. Use the post-commit mechanism, and note it must carry tenant context.

## Testing Decisions

**What makes a good test here.** Assert what a reader sees after a writer commits — never that a particular key was deleted. A test asserting an invalidation call passes while the read still serves stale data, because the key it deleted was not the key the reader built. That is exactly the sales-KPI defect, and it is why the read-after-write assertion is the only one that counts.

- **Read-after-write, per invalidation-matrix entry.** Post a journal entry, then read the balance sheet in the same test and assert the entry is included. Repeat for each statement, each finance report, and the filtered KPI view. This is the test the current defect would fail.
- **Filtered read-after-write.** The KPI case specifically: write, then read a *filtered* view. An unfiltered-only test passes today while the bug is live.
- **Key construction is single-sourced** — writer and invalidator produce identical keys for the same inputs, across a matrix of filter combinations including empty ones.
- **Tenant prefixing is unavoidable** — a type-level assertion that the wrapper cannot be called without an organisation.
- **Cross-tenant isolation** — two organisations with identical local keys never read each other's entries. Extend to the scope dimension: two users with different scopes on the same query do not share an entry.
- **Jitter is applied** — TTLs across many keys are distributed rather than identical. Assert the spread, not an exact value.
- **Stampede** — many concurrent misses on one key produce one fetch; many concurrent misses on *distinct* keys are spread by jitter. The second is the case the fill lease does not cover.
- **Prior art**: the existing cache service specs, and the search and expenses key-construction tests that already assert scope inclusion.

## Out of Scope

- Replacing `CacheService` or the Redis provider.
- Adding a second cache tier.
- Caching anything not already cached.
- Converting TTL-only aggregates to event invalidation where the matrix records that as a deliberate choice.

## Further Notes

This is the clearest **deep module with a shallow contract** in the codebase. The implementation is excellent; the interface lets a caller do the wrong thing and gives no signal when they do. Every defect listed here is downstream of that one property.

Worth separating two things that read alike: the financial-statement gap is a **correctness** bug on money and belongs in an early wave, while the missing jitter is a **capacity** bug that only appears at scale. They share a fix because the same wrapper solves both, not because they are the same severity.

The audit also produced a genuine clean bill worth recording: no permission-dimension leak exists anywhere in 216 call sites. The discipline has held. This spec exists so that it keeps holding without depending on everyone remembering.
