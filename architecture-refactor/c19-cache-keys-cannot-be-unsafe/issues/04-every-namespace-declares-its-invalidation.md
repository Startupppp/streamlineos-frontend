# 04 — Every namespace declares its invalidation

**What to build:** For every cached read it is written down which writes invalidate it, or that it is deliberately time-based. Staleness becomes a decision rather than an omission nobody noticed.

**Blocked by:** 02 — A cache key cannot omit its tenant

**Status:** in-progress — matrix written covering all 46 namespaces found across the backend; call-site migration completed only within this lane's territory (`common/cache/**`, `modules/accounting/**`)

## Acceptance criteria

- [x] Each namespace has either a list of invalidating writes or an express statement that it is TTL-only. — `backend/src/common/cache/cache-invalidation-matrix.ts`, `CACHE_INVALIDATION_MATRIX`: 46 entries, each `{ kind: "write", events: [...] }` or `{ kind: "ttl-only", reason: "..." }`.
- [x] Finance reports invalidate on invoice, bill, transfer and payment writes. — covered by the `acc:statements`/finance-reports namespace entries in the matrix, consistent with ticket 01's verified invalidation call sites.
- [x] Aggregate dashboards may remain TTL-only where the matrix records that choice. — matrix supports and uses the `ttl-only` variant with a required `reason` field.
- [ ] **The 216 call sites are migrated to the tenant-aware wrappers.** — **NOT fully done; scope was necessarily bounded by lane territory.** 18 call sites were migrated within `common/cache/**` + `modules/accounting/**` (`accounting-settings.service.ts`, `coa.service.ts`, `dimensions.service.ts`, `periods.service.ts`, `system-accounts.service.ts`, `opening-balances.service.ts`). Three sites were deliberately left unmigrated because an existing test (`finance-posting.service.spec.ts:316-325`) asserts the current `invalidateNamespace("acc:statements:org1")` key format verbatim, and rewriting a test to accommodate a change is forbidden by standing instruction — `accounting-statements.service.ts`, `finance-posting.service.ts`, `accounting-ledger.service.ts` are recorded `migrated: false` in the matrix with that rationale. The remaining ~195 call sites live in other modules outside this lane's file ownership and were **not touched** — the matrix documents their namespace/invalidation shape from a read-only survey, but migrating their code is separate follow-up work, not something this batch could safely do without violating exclusive lane ownership.
- [x] A new cached read without a matrix entry is caught in review. — enforced socially (the matrix is the reference reviewers check against), not by an automated CI gate — no lint rule or test enforces "new cache call ⇒ new matrix entry" yet.

**Verification note (orchestrator, 2026-08-26):** the agent's report was honest about the scope boundary — it explicitly reported 18 migrated vs. ~198 remaining rather than claiming full completion. Treat the "216 call sites migrated" criterion as a program-level follow-up, not closed by this batch.

## Todo

- [ ] Write the matrix before changing code
- [ ] Migrate module by module
- [ ] Read-after-write test per event-invalidated entry
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
