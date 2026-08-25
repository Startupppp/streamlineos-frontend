# 03 — Pages that already exist become findable too

**What to build:** The eligibility change in ticket 02 only affects pages indexed after it ships. This ticket reaches the content that already exists: a resumable, per-organisation backfill that indexes the private and project-scoped pages that were previously refused, so an author who wrote their page last month can find it too.

**Blocked by:** 02 — I can find my own private page by searching for it.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Previously ineligible pages become findable by the people the visibility predicate admits, and by nobody else.
- [ ] The backfill runs per organisation and can be stopped and resumed without re-embedding what it already did.
- [ ] It short-circuits for an organisation with nothing to index rather than starting a run.
- [ ] Re-embedding is skipped for unchanged content — the hash is taken over the source text, not the rejoined chunks.
- [ ] The run is rate-limited so a large tenant cannot exhaust the AI budget in one pass.
- [ ] The before and after row counts of the vector index are recorded, so the growth is measured rather than assumed.
- [ ] A failure part-way leaves the already-indexed pages indexed and is retryable.

## Todo

- [ ] Count the affected pages per organisation and record the total in this ticket before running anything
- [ ] Write the backfill to iterate organisations explicitly — background work has no ambient tenant context
- [ ] Open a fresh tenant transaction per batch rather than borrowing a caller's
- [ ] Add the resume checkpoint and confirm a stopped run picks up where it left off
- [ ] Cap the rate and verify against the largest tenant in the dataset
- [ ] Record before/after index size in this ticket
- [ ] Boot the API and exercise a real search for a previously-invisible page — typecheck and mocked tests do not prove this works
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
