# 03 — The authorization matrix fails closed in CI

**Status:** in-progress

## Acceptance criteria

- [x] CI enumerates every route and fails on missing exposure metadata. (Handled by `RouteClassifierGuard` — see ticket 01. The guard's boot-time enumeration + `REQUIRE_ROUTE_CLASSIFICATION=true` in CI satisfies this once wired in `app.module.ts`.)
- [ ] Permission keys on routes exist in the backend and frontend catalogs. (Pending — a CI script that cross-checks `REQUIRE_PERMISSION` values against the catalog is needed; not yet implemented.)
- [ ] Every non-universal navigation destination names the exact route permission. (Pending — requires a frontend-side cross-check, outside this agent's scope.)
- [ ] Every tenant table approved for RLS has a policy and a leading tenant index. (Covered by ticket 04's verifier additions.)
- [ ] Permission mutations bump the access version in the same transaction. (Pre-existing invariant, tested in existing specs; not regressed by this batch.)
- [ ] The report names intentional exceptions rather than hiding them in a broad allowlist. (The `PLATFORM_GLOBAL_TABLES` allowlist in `db-verify-rls.mjs` requires a named rationale per entry — satisfied for the RLS dimension. The route classifier does not have an allowlist; every route must be classified.)

## Unknown-key closes

`authorize()` fails closed on an unknown key without any special handling: `scopeFor` returns `"none"` for any key not in the resolved map, which maps to `{ allow: false, scope: "none", reason: "FORBIDDEN" }`. For a key whose module is not in `MODULE_CATALOG` (and therefore not `core`), the check in `moduleAvailability` returns `available: false` → `NO_MODULE` before `scopeFor` is even called. Two new tests in `authorize.spec.ts` prove this:

- `"fails closed on a completely unknown key that appears in no module catalog"` — org owner gets `NO_MODULE`.
- `"fails closed on a malformed key with no module segment"` — `moduleOf("bare-key")` returns `"bare-key"` as a module name; that module is not enabled → denied.

## Todo

- [x] Join route, catalog, navigation and RLS checks into one report — partial (RLS + route classifier done; catalog cross-check deferred)
- [ ] Make each missing classification actionable by file and route — route classifier names `ClassName#methodName`; file path mapping deferred
- [ ] Wire the report as a required CI check — deferred on `app.module.ts` wiring (ticket 01)
