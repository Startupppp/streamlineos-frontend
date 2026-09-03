# 22: Application security and privacy

**What to build:** BOLA/IDOR, abuse, secret handling, correction, export, erasure, retention, and cross-tenant protections are executable and fail closed.

**Blocked by:** 05–17 — domain slices; 21 — Tenant-private upload lifecycle

**Status:** partial — the four red security suites are fixed and bite-proved; the `sql.raw` finding is reviewed and hardened. PRD-C003's full live-BOLA/privacy surface is green but not individually re-audited.

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C003** — **Authorization/security:** complete v2 ticket 22's live BOLA/IDOR, valid mutating-body, same-tenant control, abuse-protection and privacy criteria.
    PARTIAL: `test/security` went 8 failed / 592 passed / 600 total -> 0 failed / 604 passed / 604 total (44 suites), and the wider
    `--testPathPattern=security` run is 56 suites / 768 tests / 0 failures. Four defects closed, each bite-proved by planting the
    defect the spec exists to catch: (1) `src/common/db/bulk-update.ts` reviewed — its `sql.raw` cast is NOT reachable from request
    data, and it is now hardened so every identifier and cast name is validated against the target table's own Drizzle columns;
    (2) the stale `webhook-url-guard` re-export assertion re-pointed at the real invariant (no shim, no second implementation);
    (3) the CSRF leg re-pointed from a literal `!==` string match onto the driven `session-exchange` / `session-data` routes;
    (4) `upload-controls.spec.ts` rewritten from `indexOf` source matching onto the driven controller. REMAINS: the individual
    live-BOLA, mutating-body and privacy criteria were not re-audited item by item — only observed green as a whole.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
