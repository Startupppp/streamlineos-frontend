# 30: Release gates and portable verification harness

**What to build:** Every critical gate can prove it detects a known defect, and the release harness runs from validated workspace roots across supported operating systems.

**Blocked by:** 03 — Migration baseline and catalog parity; 04 — API contracts; 22 — Security and privacy; 27–29 — cleanup and performance

**Status:** PRD-C011/C015/C104 closed; PRD-C064 PARTIAL (database-dependent half not run). Report: `reports/30-release-gates-harness.md`

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [x] **PRD-C011** — **Gate integrity:** complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness.
  15 gates could not fail CI; `check-gate-wiring` now detects that class (step- and job-level `continue-on-error`) and is itself self-tested for the first time (28 assertions). 12 of 18 flags removed; 6 remain with named owners.
- [x] **PRD-C015** — **Release harness:** complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on Windows, macOS and Linux.
  No hardcoded workstation path found in either repo. Three real depth-guess defects fixed (`production-ops-evidence.mjs`, `collect-s7-evidence.mjs`, `check-contract-vendor.mjs` — the last was silently defeating the documented `STREAMLINE_BACKEND_ROOT` override via a one-letter-different private env var). New `run-gate.mjs` is Node, not bash, so it holds on Windows runners.
- [ ] **PRD-C104** — Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.
  Two gates found that could not fail: `check:db-generate-guard` (was literally its own `--self-test`, asserting hard-coded literals; given a real `--check` half and bite-proved) and `knip` in BOTH repos (specs are entry points; 0 -> 29 backend, 2 -> 8 frontend, bite-proved on a fixture). knip config NOT landed — see BLOCKED below. A third instance of the same class recorded: `chat-send-idempotency.spec.ts` passed 5/5 against a 100%-failing chat send, because a mocked spec cannot observe a plan-time Postgres 42P10; the static remedy `check:conflict-targets` is now wired (both halves, no `continue-on-error`) and green. Two more found and fixed: `check:openapi-coverage` reported response-schema coverage 3642/3642 (100%) for a property 1 operation in 3,642 had — it counted a bare auto-generated 2xx KEY as a schema; corrected to require resolvable content, honest figure 25/3642 (0.69%), recorded as a ratchet at the true number (NOT ratcheted green) and bite-proved against the real document (restoring the old rule reproduces the false 100%). `check:envelope-consistency` blind spot fixed (unwrap the `{success,data}` envelope), 2 -> 1 violations. New `gate-corpus.mjs` (20-assertion self-test) makes a gate report the size of the corpus it scanned and refuses an empty one; adopted in both — the envelope gate now says it can read only 2 of 336 paginated GETs. Nine instances of this one class are recorded in the report. `check:baseline-integrity` resolved 1 -> 0; no baseline raised to turn a regression green (the one prior unjustified raise, over-300 392->394, was moved BACK down to 392).
- [ ] **PRD-C064** — After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.
  PARTIAL: hermetic halves measured green (migration-discipline, tenant-indexes, openapi-coverage 3,642 ops, contract-breaking-change, contract-registry, operation-ids, db-generate-guard). BLOCKED: two clean bootstraps, RLS, query plans, tenant relationships (exit 2, target mid-bootstrap at 573/672 entries), cache invalidation — all need the bootstrapped database another agent was still replaying. `check:contract-vendor` exit 1: the vendored OpenAPI copy is STALE against the backend artifact (cross-territory, ticket 04).
  BLOCKED: the knip reach fix cannot land alone — it takes the BLOCKING backend `check:dead-code` from green to 29 unclassified files across ~10 module lanes. Corrected configs and classified lists handed to the orchestrator at `reports/30-knip-reach/`.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
