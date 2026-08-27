# c25 — Authorization cannot be omitted

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, 0 done — all four advanced; none can close without work outside this candidate.

The permission resolver is deep and the SQL scope predicates are sound. The external seam is not: `PermissionGuard` is opt-in, so a new authenticated route can ship without declaring whether it is public, universal self-service or permissioned. These tickets make absence deny at runtime and in CI.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Every route declares its exposure](issues/01-every-route-declares-exposure.md) | — | in-progress — 5/6 criteria; **107 undeclared routes down to 50**, 57 applied, the rest in other sessions' modules. OpenAPI now records each declaration |
| 02 | [Object access and DataScope share one query seam](issues/02-object-access-and-scope-share-one-query-seam.md) | 01 | in-progress — 2/5 criteria; the seam refuses to hand back the scope, `check:scope-application` finds the 2 handlers that resolve one and never spend it, bulk writes batched |
| 03 | [The authorization matrix fails closed in CI](issues/03-authorization-matrix-fails-closed.md) | 01, 02 | in-progress — 5/6 criteria; navigation cross-check built and names 4 real drifts, tenant-index check green at 703/703 and wired to CI. Only the frontend-side fixes remain |
| 04 | [RLS coverage is a release invariant](issues/04-rls-coverage-is-a-release-invariant.md) | — | in-progress — 5/6 criteria; verifier asserts gaps + policy shape and runs in CI; **fixture migration blocked on a live ephemeral DB** |

## Working these

Work the frontier. Each ticket is a vertical slice and must preserve the universal employee surfaces documented in `CLAUDE.md`.
