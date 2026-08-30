# Session 5 — Client contracts and the module registry

Three tickets, no blockers, nothing waiting on you. Two of them are about making a convention checkable;
the third replaces the parallel registries that keep producing drift defects.

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `frontend/CLAUDE.md`, then `backend/CLAUDE.md`.
3. Your three tickets in full: [`../issues/`](../issues/) files `17`, `18`, `19`.
4. The PRD's *Client and public interface delivery* and *Modular application inside a cell* sections
   ([`../prd.md`](../prd.md)).

## Your tickets

| # | Ticket | Blocked by |
|---|---|---|
| 17 | The query key carries the tenant | — |
| 18 | The API surface is versioned and its contract is generated in CI | — |
| 19 | Every module is registered through one versioned manifest | — |

**Suggested order:** `17` first — it is bounded, frontend-only, and `frontend/CLAUDE.md` §2 already
documents the exact defect and the guard to keep. Then `18`, then `19`, which is the largest and benefits
from `18`'s generated contract existing.

## Ask these first — plus anything else you find

1. **API versioning scheme for ticket 18: URI prefix (`/v1/...`), a header, or a media type?**
   *Recommend: URI prefix* — least disruptive to the existing Nest routing and to `frontend/lib/api-client.ts`.
2. **Ticket 19 extends an existing registry — confirm the field set to add.** `MODULE_REGISTRY`
   (`common/rbac/module-registry.ts:27`) already covers all 20 modules with `id`, `displayName`,
   `planGated`, `administrable`, `ladder`, `administersNamespaces`, is spec-covered, and `ModuleId` and
   `MODULE_CATALOG` derive from it. **Do not build a second registry.** The missing fields are route,
   entitlement, schema owner, data classification, events, cache namespaces, retention, search ACL
   strategy, SLO, budget, migrations, navigation and public exposure. Ask which of those have a real
   consumer today — *the PRD forbids the manifest becoming a generic runtime framework, and a field with
   no consumer is how that starts.* Rollout: *recommend one module end-to-end first*, old paths
   authoritative until it passes.
3. **Which commands opt into idempotency?** Not *whether* — `common/idempotency/idempotency.interceptor.ts`
   already exists, claims against a `commandFences` table with `IN_FLIGHT` / `COMPLETED` / `FAILED`, and
   handles replay, 409-while-in-flight and parameter mismatch. Schema at `db/schema/common/idempotency.ts`.
   Read it, list the retryable commands that are not yet opted in, and ask for a ruling on the list.
   *Do not build a second mechanism.*
4. **Once the org id is in `queryKeyBase`, does `queryClient.clear()` on organization switch stay
   permanently as defence in depth, or come out?** *Recommend: it stays.* It costs a refetch on an action
   users take rarely, and it is the last line against a factory someone adds without the segment.

## Territory

**Yours, exclusively:**

- `frontend/lib/query-keys.ts` and `frontend/lib/query-keys/**` — **17 factory files** plus `base.ts`.
  Six already thread `orgId` by hand and are duplicates to collapse, not a second pattern to keep:
  `collaboration.ts:61`, `platform-core.ts:17`, `human-resources.ts:6`, `knowledge-and-surveys.ts:87`,
  `support-and-workflows.ts:50`, `accounting-and-support.ts:118`.
- `frontend/lib/query-keys-registry.test.ts`
- `frontend/lib/api-client.ts`; `useSwitchOrg` at `frontend/hooks/common/auth-hooks.ts:137`; the eight
  `queryClient.clear()` call sites (`auth-hooks.ts:105,157`, `providers/query-provider.tsx:62`,
  `org-danger-zone-section.tsx:181,202,229`, `leave-organization-control.tsx:89`,
  `archived-orgs-restore.tsx:40`); the server-prefetch helpers
- The Swagger block in `backend/src/main.ts:97-110` — **that block only.** S4 owns the telemetry wiring
  at `:76` in the same file. Note the block is inside `if (isDevelopment)` and also carries the
  `recordRouteClassification` call that stamps `x-exposure` — keep that stamping when you move generation.
- `common/idempotency/**` and `db/schema/common/idempotency.ts` (adoption, not rewrite)
- `common/rbac/module-registry.ts` and `module-vocabulary.ts`, and repointing the three CI checks:
  `src/scripts/route-classification-report.mjs`, `check-permission-keys.mjs`,
  `check-navigation-permissions.mjs` (invoked at `backend/.github/workflows/ci.yml:62,65,70`)
- `frontend/components/layout/sidebar/sidebar-permission-coverage.test.ts`

**Not yours:** `modules/access`, `common/rbac`, the permission catalogs themselves (S1 edits those for
ticket 07 — you **read** them), `modules/hr`, `modules/payroll`, `common/region`, `common/tenant`,
`db/schema/common/auth.ts`. Report, do not edit.

## Traps in this territory

- **The frontend `PERMISSIONS` array is a subset by design.** The 206-key "gap" is intentional and
  tested. It is **not** a drift defect. Do not re-raise it, and do not let ticket 19's catalog-agreement
  check flag it.
- **Do not touch the backend `CACHE_KEYS` factories.** They already interpolate `orgId` and are tenant-safe;
  a migration onto `*ForOrg` wrappers was attempted at ~50 call sites and **fully reverted** as a no-op.
- **Check the server-render path in the same change as ticket 17.** Server prefetch here was dead
  because five factories did not scope-prefix their keys, so every prefetch hydrated an entry the client
  could never read and every authenticated route rendered a spinner. Changing `base` without checking SSR
  recreates exactly that.
- **A clean `frontend/ tsc --noEmit` does not prove the tests compile** — the tsconfig excludes them, and
  ts-jest is transpile-only. Run the frontend tests explicitly.
- **The two-vocabularies defect is already half-fixed — do not "fix" it again.** `organizations.enabled_modules`
  was dropped in migration `0335_org_arrays_and_invites.sql:22` and replaced by the `org_modules` table,
  and the case conversion is centralised in `storedModuleKey` / `moduleIdFromStored`
  (`module-registry.ts:134,138`). Verify it holds; do not reintroduce a second conversion.
- **A duplicate route silently shadows a handler**, and module registration order decides which
  permission contract applies. `app-route-uniqueness.spec.ts` guards it — the manifest must not weaken it.
  A first version of that scan reported eleven collisions; the truth was one.
- **Contracts match exactly.** A field dropped from a response but left in the client type is stripped
  into a silent no-op, not a compile error. That is the whole reason ticket 18 exists.
- **Start ticket 18's drift check on one module**, not on 3,518 handlers. A check that fails on
  everything on its first run gets disabled.
- **Do not re-raise recorded decisions**: downgrade not revoking an enabled module, table splitting by
  width, key-type unification, migrating all naive timestamps, wrapping every text-match call site, full
  APM/tracing.

## Definition of done for this session

- All three tickets' criteria ticked with pasted evidence, or open with a written reason.
- `pnpm -C frontend exec tsc --noEmit` clean **and** the frontend test suite run explicitly.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- A two-organization switch test asserts no Org A entry is readable under Org B **without** relying on
  `queryClient.clear()`.
- The OpenAPI artifact is generated in CI and the build fails when it is stale — proved by committing a
  stale one and watching it fail.
- `pnpm exec madge --circular` still zero in both repos.
- A commit per closed ticket, pathspec-scoped.
