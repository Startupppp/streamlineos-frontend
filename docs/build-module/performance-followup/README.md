# Build performance and caching follow-up

Independent audit of the Build list and detail endpoints for unbounded reads, N+1 queries, missing tenant and project predicates, missing indexes, incorrect cache keys and unsafe invalidation.

| Document | Contents |
|---|---|
| [findings.md](./findings.md) | Every finding, P0–P2, with file and line evidence |
| [cache-policy.md](./cache-policy.md) | Cache key, stale time, invalidation and optimistic-update recommendations |
| [tooling.md](./tooling.md) | The two analysers added by this pass, how to run them, and what they cannot see |

## Scope and method

Static source inspection plus the repository's own gates. No production credentials were used, so no query plan, buffer count or latency figure appears anywhere in this pass. Where a claim needs measurement, it is stated as needing measurement.

Two analysers were added under `backend/src/scripts/build-performance/`. Both are read-only static analysers with no import path into application code, so neither can change runtime behaviour.

## What this pass did not touch

Sprint/Cycle cutover files, QA Bug files, invoice files, Feedbucket files, route manifests, permission catalogs, the migration journal, generated OpenAPI, shared frontend components and `IMPLEMENTATION-STATUS.md` are all owned by the Build completion coordinator. Findings that land in those files are recorded here and handed over; none were edited.

P0-1 in particular is a Sprint/Cycle finding surfaced by a caching audit. It needs the Sprint/Cycle lane to act on it.
