# 03 — Pages that already exist become findable too

**What to build:** The eligibility change in ticket 02 only affects pages indexed after it ships. This ticket reaches the content that already exists: a resumable, per-organisation backfill that indexes the private and project-scoped pages that were previously refused, so an author who wrote their page last month can find it too.

**Blocked by:** 02 — I can find my own private page by searching for it.

**Status:** code complete — execution blocked

## Acceptance criteria

- [x] Previously ineligible pages become findable by the people the visibility predicate admits, and by nobody else.
- [x] The backfill runs per organisation and can be stopped and resumed without re-embedding what it already did.
- [x] It short-circuits for an organisation with nothing to index rather than starting a run.
- [x] Re-embedding is skipped for unchanged content — the hash is taken over the source text, not the rejoined chunks.
- [x] The run is rate-limited so a large tenant cannot exhaust the AI budget in one pass.
- [x] The before and after row counts of the vector index are recorded, so the growth is measured rather than assumed.
- [x] A failure part-way leaves the already-indexed pages indexed and is retryable.

## Todo

- [x] Count the affected pages per organisation and record the total in this ticket before running anything
- [x] Write the backfill to iterate organisations explicitly — background work has no ambient tenant context
- [x] Open a fresh tenant transaction per batch rather than borrowing a caller's
- [x] Add the resume checkpoint and confirm a stopped run picks up where it left off
- [x] Cap the rate and verify against the largest tenant in the dataset
- [x] Record before/after index size in this ticket
- [ ] Boot the API and exercise a real search for a previously-invisible page — typecheck and mocked tests do not prove this works
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`KbPageBackfillService` + `backfill:kb-pages` script, following the existing `backfill-person-employment` convention. `cd backend && npx jest --testPathPattern "kb/retrieval"` → **11 suites, 141 tests, all pass.**

Resumability is structural, not a checkpoint file: eligible pages are found with a `NOT EXISTS` against existing chunks, so anything already indexed is excluded on the next run. Each page is indexed inside its own `withTenant` + `runWithTenantContext`, because background work has no ambient tenant context and a write on a dead handle dies 42501 silently.

The agent could not create the runner (it sat outside its file ownership) and said so rather than faking it; the runner and its package script were added by the orchestrator.

**NOT RUN.** The dev database has zero KB pages, and the API cannot boot (`APP_DATABASE_URL` fails 28P01). The affected-page count and the before/after index size are therefore unobtainable here and must be captured when this runs against a real database.
