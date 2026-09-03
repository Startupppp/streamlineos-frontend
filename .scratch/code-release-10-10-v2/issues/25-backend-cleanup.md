# 25: Backend cleanup and decomposition

**What to build:** Backend dead surface, unsafe typing, mixed services, and unnecessary public interfaces are safely contracted without breaking DI, authorization, or workers.

**Blocked by:** 24 — Repository-cleanup detection foundation

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C030** — Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing casts or broad index signatures used to bypass a contract. Narrow `unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter; use `satisfies` where only conformance is needed.
- [ ] **PRD-C031** — Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each exception must be local, narrow, documented with the invariant and covered by a negative/runtime contract test; maintain a zero-growth, named exception ledger.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

