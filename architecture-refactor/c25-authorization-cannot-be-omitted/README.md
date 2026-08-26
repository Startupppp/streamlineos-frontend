# c25 — Authorization cannot be omitted

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, 0 done — all four advanced; none can close without work outside this candidate.

The permission resolver is deep and the SQL scope predicates are sound. The external seam is not: `PermissionGuard` is opt-in, so a new authenticated route can ship without declaring whether it is public, universal self-service or permissioned. These tickets make absence deny at runtime and in CI.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Every route declares its exposure](issues/01-every-route-declares-exposure.md) | — | in-progress — 4/6 criteria; 141 undeclared routes found and classified, 34 applied, **107 blocked on other lanes** |
| 02 | [Object access and DataScope share one query seam](issues/02-object-access-and-scope-share-one-query-seam.md) | 01 | in-progress — 0/5 criteria; the chat defect is disproved, the seam is still a type with no importers, one application attempt was reverted for removing a security check |
| 03 | [The authorization matrix fails closed in CI](issues/03-authorization-matrix-fails-closed.md) | 01, 02 | in-progress — 5/6 criteria; ghost-key check built and wired to CI (`ci.yml:61`); navigation cross-check is frontend-side |
| 04 | [RLS coverage is a release invariant](issues/04-rls-coverage-is-a-release-invariant.md) | — | in-progress — 5/6 criteria; verifier asserts gaps + policy shape and runs in CI; **fixture migration blocked on a live ephemeral DB** |

## Working these

Work the frontier. Each ticket is a vertical slice and must preserve the universal employee surfaces documented in `CLAUDE.md`.
