# 06: Home and self-service

**What to build:** Home and self-service experiences load independently and quickly while preserving privacy, authorization, and module ownership.

**Blocked by:** 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C115** — Reconstruct current-head Home evidence across folder ownership, universal-versus-module composition, section-level authorization/privacy, bounded parallel queries, independent loading/error states, cache/query keys, responsive accessibility and representative E2E; classify every Home file KEEP, REFACTOR or REMOVE without changing public landing-page visuals or animations.
- [ ] **PRD-C144** — Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

