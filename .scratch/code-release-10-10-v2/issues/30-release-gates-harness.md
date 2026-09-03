# 30: Release gates and portable verification harness

**What to build:** Every critical gate can prove it detects a known defect, and the release harness runs from validated workspace roots across supported operating systems.

**Blocked by:** 03 — Migration baseline and catalog parity; 04 — API contracts; 22 — Security and privacy; 27–29 — cleanup and performance

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C011** — **Gate integrity:** complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness.
- [ ] **PRD-C015** — **Release harness:** complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on Windows, macOS and Linux.
- [ ] **PRD-C104** — Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.
- [ ] **PRD-C064** — After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
