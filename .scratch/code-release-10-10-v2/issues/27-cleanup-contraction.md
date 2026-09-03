# 27: Cleanup contraction and dependency proof

**What to build:** Compatibility seams, cycles, unused dependencies, exports, scripts, and files are removed only after all runtime and build-time consumers are disproven.

**Blocked by:** 25 — Backend cleanup and decomposition; 26 — Frontend cleanup and decomposition

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C012** — **Repository hygiene/types:** complete the v2 tickets 24–27 expand–migrate–contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency proof.
- [ ] **PRD-C025** — Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position.
- [ ] **PRD-C027** — Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that duplicate an authoritative enum/config/schema. Retain a compatibility path only with a named consumer, removal date and contract test.
- [ ] **PRD-C029** — Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references; update lockfiles, deployment manifests, validation schemas and documentation in the same change.
- [ ] **PRD-C032** — Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant; do not create generic dumping-ground helpers or speculative seams. Apply the deletion test to pass-through wrappers and retain modules that provide real depth, policy or adaptation.
- [ ] **PRD-C033** — Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
- [ ] **PRD-C034** — Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw SQL/table names, migrations, reflection, queues/events, cron registration, package scripts and side-effect imports. Text search or a successful editor rename alone is insufficient evidence.
- [ ] **PRD-C036** — Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero unclassified findings, zero unexplained suppressions and no increase in an approved framework/generated exception baseline.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

