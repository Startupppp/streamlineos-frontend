# c25 — Authorization cannot be omitted

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, 0 done.

The permission resolver is deep and the SQL scope predicates are sound. The external seam is not: `PermissionGuard` is opt-in, so a new authenticated route can ship without declaring whether it is public, universal self-service or permissioned. These tickets make absence deny at runtime and in CI.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Every route declares its exposure](issues/01-every-route-declares-exposure.md) | — | in-progress — guard + decorator created; `app.module.ts` wiring + controller classification pending |
| 02 | [Object access and DataScope share one query seam](issues/02-object-access-and-scope-share-one-query-seam.md) | 01 | in-progress — precise plan written; chat resolver defect identified |
| 03 | [The authorization matrix fails closed in CI](issues/03-authorization-matrix-fails-closed.md) | 01, 02 | in-progress — unknown-key tests added; CI check deferred on 01 wiring |
| 04 | [RLS coverage is a release invariant](issues/04-rls-coverage-is-a-release-invariant.md) | — | in-progress — verifier asserts gaps + policy shape; CI wired; fixture migration deferred |

## Working these

Work the frontier. Each ticket is a vertical slice and must preserve the universal employee surfaces documented in `CLAUDE.md`.
