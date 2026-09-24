# Build performance and caching follow-up

Independent audit of the Build list and detail endpoints for unbounded reads, N+1 queries, missing tenant and project predicates, missing indexes, incorrect cache keys and unsafe invalidation.

| Document | Contents |
|---|---|
| [findings.md](./findings.md) | Every finding, P0–P2, with file and line evidence, and what is fixed |
| [migrations.md](./migrations.md) | The two migrations shipped, the one deleted, and the one deliberately not written |
| [cache-policy.md](./cache-policy.md) | Cache key, stale time, invalidation and optimistic-update recommendations |
| [tooling.md](./tooling.md) | The two analysers added by this pass, how to run them, and what they cannot see |

## Scope and method

115 GET handlers across 48 Build controllers, swept for all seven risk classes — see the coverage table at the top of [findings.md](./findings.md).

Static source inspection plus the repository's own gates. No production credentials were used, so no query plan, buffer count or latency figure appears anywhere in this pass. Where a claim needs measurement, it is stated as needing measurement.

Two analysers were added under `backend/src/scripts/build-performance/`. Both are read-only static analysers with no import path into application code, so neither can change runtime behaviour.

## Fixes landed

P0-1, P1-1, P1-2, P1-3, P2-3 and P2-9 are fixed: five journalled migrations with rollbacks, the analytics cache wired up, nine dead evictions repointed, one missing tenant predicate added, the velocity keyset made index-usable, and the cutover's columns and indexes reconciled into the schema.

Gates that moved: `check:cache-invalidation` failing → passing. `check:tenant-indexes` 2 failures → 1, and the survivor is not a Build table.

217 Build suites (2,036 tests) pass. Typecheck holds at the pre-existing baseline with zero new errors.

P2-1 was attempted and reverted — classifying those reads correctly requires raising a suppression ratchet, which is a decision for that ledger's owner, not a patch. The evidence is written up and ready to use either way.

## What this pass did not touch

QA Bug files, invoice files, Feedbucket files, route manifests, permission catalogs, and generated OpenAPI were not edited. Findings outside this package are recorded here for their owning module.

Two items on that list **were** edited, both deliberately and both recorded in [migrations.md](./migrations.md):

- **`migrations/meta/_journal.json`** — five entries appended. An unjournalled migration never runs while `db:migrate` still reports success (BE-58), so without them the work would have been inert.
- **Sprint/Cycle-adjacent schema and reads** — `cycles`, `ticket-core` and the scope-events schema, plus fourteen cycle reads. P0-1, P1-2 and P1-3 could not be fixed without them, and the cutover had landed on `main` by the time they were touched.

`migrations/sql/a-sprint-cycle-*.sql` itself was never edited. Where a phase file is wrong — phase 06 breaking the report-revision trigger — the fix is a separate journalled migration that works before and after that phase, so neither has to wait for the other.
