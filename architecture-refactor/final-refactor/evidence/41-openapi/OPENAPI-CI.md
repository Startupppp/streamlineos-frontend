# OpenAPI CI — non-production topology seam

Ticket 41: make OpenAPI freshness reproducible in CI.

## What the seam is

`backend/src/scripts/openapi-env.ts` exports `applyOpenApiEnv()`, called at the top of `generateOpenApiJson()` in `generate-openapi.ts`. Every entry point that boots the Nest application for contract purposes (`openapi:generate`, `openapi:check`) reaches it via that shared function.

The seam does two things:

1. Forces `NODE_ENV` to `"test"` when the caller did not set a non-production value. `"production"` mode activates extra required variables (`CRON_SECRET`, `INTERNAL_API_SECRET`, `CONTACT_NOTIFICATION_EMAIL`, `APP_DATABASE_URL`) in `validateEnv()` and makes the RLS lifecycle check throw instead of log. Neither is needed or safe for contract generation.

2. Validates the six minimum variables (see table below) and throws `OpenApiEnvError` synchronously — before `NestFactory.create` is called — when any are absent or too short. This gives the developer a named, readable error instead of an opaque DI initialisation failure from `RegionModule` or `ConfigModule`.

## Minimum variables

| Variable | Minimum | Why required | Safe placeholder? |
|---|---|---|---|
| `DATABASE_URL` | any non-empty value | `resolveRegionTopology()` reads this to set the primary region's connection URL. A non-reachable placeholder is fine — see below. | Yes: `postgres://openapi-ci:placeholder@localhost:5432/openapi` |
| `BACKEND_JWT_SECRET` | ≥ 44 chars | `resolvePlacementKeyring()` in the `REGION_REGISTRY` provider factory uses this as the signing secret when `PLACEMENT_SIGNING_KEY` is absent. This runs in a provider factory, not a lifecycle hook — it cannot be swallowed by `abortOnError:false`. | Yes: any 44+ char string you never actually sign with |
| `PORTAL_JWT_SECRET` | ≥ 44 chars | Required by `validateEnv()` in the `APP_CONFIG` provider factory — same reasoning as above. | Yes |
| `CORS_ORIGINS` | any non-empty value | Required by `validateEnv()`. | Yes: `http://localhost:1000` |
| `APP_URL` | valid URL | Required by `validateEnv()`. | Yes: `http://localhost:1000` |
| `ENCRYPTION_KEY` | ≥ 32 chars | Required by `validateEnv()`. | Yes: any 32+ char string |

## Why a non-reachable DATABASE_URL is safe

The generation flow with `NestFactory.create(AppModule, { ..., abortOnError: false })`:

1. DI container creates providers (factories run): `validateEnv()` succeeds → `DrizzleModule` creates a lazy postgres-js pool (no connection yet) → `RegionModule` resolves topology from env → `RegionModule` creates placement keyring.
2. Lifecycle hooks run (`onApplicationBootstrap`): `DrizzleModule.assertRlsIsEnforced()` executes a `SELECT` against the pool. If `DATABASE_URL` points to an unreachable host, this throws a connection error. `abortOnError: false` catches all lifecycle-hook errors and resolves the `NestFactory.create` promise anyway.
3. `buildOpenApiDocument(app)` reads NestJS route metadata (decorators, guards, Zod schemas). None of this touches the database. The route registry was fully populated in step 1.

What would make it unsafe: using a real production `DATABASE_URL` in CI risks leaking credentials in logs and connecting to live tenant data during route scanning. Use a placeholder that will refuse the connection.

## Proof — missing variable error

Running with all vars present except `DATABASE_URL`:

```
$ DATABASE_URL="" BACKEND_JWT_SECRET=... node -r ts-node/register/transpile-only -e "require('./src/scripts/openapi-env').applyOpenApiEnv()"
[openapi-env] Contract generation requires the following variables to be set:
  DATABASE_URL

See architecture-refactor/final-refactor/evidence/41-openapi/OPENAPI-CI.md for the minimum values and the reason each variable is required.
exit: 1
```

Running with NO vars set:

```
$ node -r ts-node/register/transpile-only -e "require('./src/scripts/openapi-env').applyOpenApiEnv()"
OpenApiEnvError: [openapi-env] Contract generation requires the following variables to be set:
  DATABASE_URL
  BACKEND_JWT_SECRET
  PORTAL_JWT_SECRET
  CORS_ORIGINS
  APP_URL
  ENCRYPTION_KEY

See architecture-refactor/final-refactor/evidence/41-openapi/OPENAPI-CI.md for the minimum values and the reason each variable is required.
```

## Proof — determinism (Criterion 2)

Two consecutive `openapi:generate` runs against the same source produce byte-identical output:

```
run-1 sha256: e5f2a462a714f000d39aabc033c6c1961701412eca684e62ff63015dc01d18e8
run-2 sha256: e5f2a462a714f000d39aabc033c6c1961701412eca684e62ff63015dc01d18e8
```

Determinism holds because `build-openapi-document.ts` sorts all top-level collections (`document.paths`, `components.schemas`, `components.parameters`, `components.responses`) via `sortRecord()`, and the underlying route registry is populated in the same DI registration order on every run.

## Proof — Timesheets operations appear in the contract (Criterion 3)

`POST /timesheets/entries` in the generated contract:

```json
"billingType": { "enum": ["BILLABLE", "NON_BILLABLE", "FIXED"], ... }
"source":      { "enum": ["MANUAL", "TIMER", "API", "IMPORT"], ... }
```

Temporary probe (restored byte-for-byte, sha256 verified): adding `"PROBE"` to `billingType` in `entries.schemas.ts` line 26 (`createEntrySchema`) caused `openapi:check` to exit 1 with:

```
openapi.json is STALE. Run: pnpm openapi:generate
  changed POST /timesheets/entries
```

After restoring `entries.schemas.ts` (sha256 `73167fb57ea1df0faf6a23c0258fc6d4cf8c938d78fdbe7b9f82c957ffd79962`) and regenerating, the artifact matches.

### Route-access exposure counts (as of 2026-08-29)

| x-exposure | Count |
|---|---|
| `permissioned` | 3183 |
| `public` | 215 |
| `universal` | 95 |
| `in-service` | 47 |
| undeclared | 0 |
| **TOTAL** | **3540** |

`x-exposure` and `x-permission` are stamped on every operation by `recordRouteClassification()` from the same four metadata keys `RouteClassifierGuard` reads. A route-access adoption in ticket 28 will update these keys; the next `openapi:generate` will surface the change in the document, and `openapi:check` will detect it.

**Route-access gate (ticket 28) is BLOCKED** until `frontend/lib/rbac/route-access*` exists. The exact unblock condition is: `check:route-classification` passes on the ticket-28 branch. This ticket's gate machinery is complete and ready.

## Proof — staleness check (Criterion 4)

`openapi:check:self-test` proves the diff function detects a changed operation, a removed route, and an added route, and reports nothing for an identical artifact:

```
self-test passed — the staleness check detects a changed operation, a removed route and an added route, and reports nothing for an identical artifact
```

`openapi:check` against current source:

```
openapi.json is current — 3540 operations, 1916 carrying a zod contract
```

`openapi:check` against a stale artifact (one operation corrupted):

```
openapi.json is STALE. Run: pnpm openapi:generate
  changed DELETE /access/delegations/{delegationId}
  ... and 3490 more
exit code: 1
```

### Breakage classification

`check-openapi-fresh.ts` compares each operation as a JSON string. Any change to an operation — added enum member, removed field, narrowed type, renamed operationId — produces a `changed` classification. Removing an operation produces `removed`. Adding produces `added`. All three kinds exit 1. The check does NOT distinguish "breaking" from "additive" at the semantic level; it classifies by presence and identity. This is sufficient for CI because:
- The committed contract is the approved state.
- Any deviation from it — additive or breaking — requires regenerating and reviewing the diff before commit.
- Semantic breakage classification (e.g. "this enum narrowing is a breaking change for callers") is out of scope for this ticket.

## Vendor-copy gate (Criterion 4 — frontend)

`frontend/scripts/check-contract-vendor.mjs` compares SHA-256 hashes of `frontend/contracts/openapi.json` and `backend/openapi.json`. It exits 1 when they differ, with a clear actionable message listing both hashes and the copy command. In a frontend-only CI checkout (no `backend/` directory), it exits 1 with a message explaining why it cannot run, rather than passing silently.

```
✔  frontend/contracts/openapi.json matches backend/openapi.json
   sha256: e5f2a462a714f000...
```

Stale-copy proof:
```
✖  frontend/contracts/openapi.json is STALE — it does not match backend/openapi.json.
   frontend hash: f477947118e1bdff...
   backend  hash: e5f2a462a714f000...
exit code: 1
```

## CI wiring (backend)

The existing CI step in `backend/.github/workflows/ci.yml` at "OpenAPI contract is current" already sets the minimum variables:

```yaml
- name: OpenAPI contract is current
  run: pnpm openapi:check:self-test && pnpm openapi:check
  env:
    NODE_ENV: test
    DATABASE_URL: postgres://ci:ci@127.0.0.1:5432/ci
    REGION_PRIMARY_APP_DATABASE_URL: postgres://ci:ci@127.0.0.1:5432/ci
    BACKEND_JWT_SECRET: ci-openapi-generation-secret-not-used-for-signing
    PORTAL_JWT_SECRET: ci-openapi-generation-portal-secret-not-used-here
    ENCRYPTION_KEY: ci-openapi-generation-encryption-key-unused
    CORS_ORIGINS: http://localhost:1000
    APP_URL: http://localhost:1000
```

`NODE_ENV: test` is now enforced by the seam rather than assumed from the step env. `REGION_PRIMARY_APP_DATABASE_URL` is redundant — the primary region inherits `DATABASE_URL` — but harmless. The seam validates only the six minimum variables listed above.

## CI wiring still needed (frontend)

The frontend CI needs two new steps. See WIRING REQUIRED in the ticket-41 report.
