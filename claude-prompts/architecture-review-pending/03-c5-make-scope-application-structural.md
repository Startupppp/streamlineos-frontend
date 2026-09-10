# Complete C5 safely: make DataScope application structural

Work directly in the StreamlineOS repository and carry this task through design, implementation, migration, and verification. Read the applicable `CLAUDE.md` files first, preserve unrelated working-tree changes, and do not commit or push unless explicitly requested.

## Source and objective

The source requirement is candidate C5 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

Its intended outcome is that a resolved DataScope cannot accidentally be left unapplied. The HTML's suggested branded value is not by itself sufficient in TypeScript: TypeScript cannot prove a local value was consumed. The application also legitimately compares a scope with `"none"` for denial and serializes scope into cache keys to prevent data leakage. Preserve those controls while moving the invariant into a deeper executable interface.

Start with:

- `backend/src/common/rbac/data-scope.ts`
- `backend/src/modules/access/apply-scope.ts`
- `backend/src/modules/access/access.types.ts`
- `backend/src/modules/access/object-access.ts`
- `backend/src/scripts/check-scope-application.mjs`
- every production `applyScope(` and `rbacScope` occurrence
- scoped cache-key builders and background/export consumers

## Phase 1: decision record

Before production edits, write a concise ADR in the repository's established ADR location. Compare at least:

1. branded scope/predicate values;
2. an authorization result exposing an explicit deny decision plus an executable predicate;
3. scoped repository/query-builder operations that accept scope and execute only after tenant and scope predicates are installed.

Choose the smallest design that makes an unscoped database execution structurally unavailable at the owning query interface. The ADR must explain how `none`, tenant predicates, cache-key variation, raw SQL escape points, detached workers, and incremental migration are handled.

## Required implementation

1. Inventory all current scope resolvers and consumers. Classify each use as:
   - deny decision;
   - query predicate application;
   - cache-key discrimination;
   - propagation to another policy owner;
   - invalid or unused resolution.
2. Introduce one canonical scoped-query interface. It must install tenant and DataScope constraints before executing a scoped read.
3. Retain an explicit, typed deny state so `none` terminates before database execution.
4. Retain a canonical cache-key representation so differently scoped results cannot collide.
5. Migrate every production path that spends a DataScope, including representative list, aggregate, dashboard, export, object-access, client/contact, support/ticket, and background-worker paths.
6. Keep domain-specific join predicates distinct from DataScope predicates when they answer different questions.
7. Remove manual two-step call sites where a caller can resolve scope and execute a query without passing through the scoped interface.
8. Add an architecture boundary preventing new scoped queries from bypassing the canonical interface.
9. Reduce or delete `check-scope-application.mjs` only after its covered failure classes are structurally impossible. Retain a smaller explicit gate for unavoidable raw-query escape points if needed.
10. Avoid cosmetic brands backed by casts. Any escape hatch must be named, narrowly scoped, searchable, and justified by a test.

## Tests that must bite

Prove with executable tests:

- `own`, `team`, `all`, and `none` produce the expected behavior.
- `none` performs no protected data query.
- Omitting the tenant predicate is impossible or causes a failing boundary test.
- Omitting scope application is impossible or causes a failing test/architecture gate.
- Differently scoped cache entries never collide.
- Cross-tenant rows remain inaccessible for each scope.
- Workers and exports use the same policy semantics as request paths.
- Removing the scoped-interface call from representative services makes the suite red for the intended reason.

## Verification and completion

Migrate in bounded batches and run focused tests after each batch. At the end run backend typecheck, scope/static checks, security and tenant-isolation tests, relevant service suites, dependency-cycle checks, and the full repository-prescribed backend gate if feasible. Inspect every remaining raw DataScope consumer and account for it in the ADR.

The task is complete only when every production DataScope resolution is classified, protected queries execute through a structural scope boundary, legitimate deny/cache operations remain correct, and the old scanner is deleted or reduced to only documented unavoidable escape points. Report counts before/after, migrated files, residual raw paths, and exact verification results.
