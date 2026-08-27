# c25 — Authorization cannot be omitted

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, **3 done**. 01, 02 and 03 are closed; 04 is operator-gated on a live ephemeral database.

The permission resolver was already deep and the SQL scope predicates sound. The external seam was not: `PermissionGuard` is opt-in, so a new authenticated route could ship without declaring whether it was public, universal self-service or permissioned. Absence now denies, at runtime and in CI.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Every route declares its exposure](issues/01-every-route-declares-exposure.md) | — | **done** — 6/6; **0 undeclared routes** of 3,518, enforcement on by default, OpenAPI records each declaration |
| 02 | [Object access and DataScope share one query seam](issues/02-object-access-and-scope-share-one-query-seam.md) | 01 | **done** — 5/5; the seam refuses to hand back the scope, 119/119 scopes applied, 12 soft-delete holes closed, bulk writes batched |
| 03 | [The authorization matrix fails closed in CI](issues/03-authorization-matrix-fails-closed.md) | 01, 02 | **done** — 6/6; six checks green and required in CI — permission keys, route classification, navigation gates, scope application, record access, tenant indexes |
| 04 | [RLS coverage is a release invariant](issues/04-rls-coverage-is-a-release-invariant.md) | — | in-progress — 5/6 criteria; verifier asserts gaps + policy shape and runs in CI; **fixture migration blocked on a live ephemeral DB** |

## Working these

Work the frontier. Each ticket is a vertical slice and must preserve the universal employee surfaces documented in `CLAUDE.md`.
