# 41: Make OpenAPI freshness reproducible in CI

**What to build:** CI can boot the application contract generator with secure region configuration and fail on unapproved backend/frontend API drift.

**Blocked by:** 26 and 28.

**Status:** three criteria closed; criterion 3's route-access half is blocked on ticket 28

- [x] Contract generation has a documented non-production topology/configuration seam.
- [x] OpenAPI freshness runs deterministically without undocumented local credentials.
- [ ] Timesheets and route-access changes appear in generated contracts.
      **Timesheets half proved; route-access half blocked on ticket 28.** `frontend/lib/rbac/route-access*`
      does not exist yet — the barrel S5 has started is still unimported. The exposure-stamping
      machinery is live and correct, so ticket 28's adoption will surface with no further work here,
      but the criterion names route-access and cannot be ticked before it exists.
- [x] CI fails on stale or breaking unversioned contracts and passes on the current source.

Full evidence: `architecture-refactor/final-refactor/evidence/41-openapi/OPENAPI-CI.md`.

## Criterion 1 — the seam was an accident, now it is a contract

Generation boots the whole Nest application, so it inherits every boot-time requirement:
`DrizzleModule` opens a pool at factory time and `assertRlsIsEnforced()` issues a live `SELECT`;
`RegionModule` throws `[region] region "<key>" has no database` without a per-region URL and
`[region] no placement signing key` without one. It only worked in CI because `NODE_ENV=test`
downgrades the RLS assertion to a log and `abortOnError: false` swallows the lifecycle failure —
an undocumented coincidence of three separate behaviours.

`backend/src/scripts/openapi-env.ts` makes that explicit. It runs before `NestFactory.create` and
fails with a named error listing **every** missing variable at once, instead of dying inside
`RegionModule` on whichever one it happened to reach first:

```
OpenApiEnvError: [openapi-env] Contract generation requires the following variables to be set:
  DATABASE_URL
  BACKEND_JWT_SECRET
  PORTAL_JWT_SECRET
  CORS_ORIGINS
  APP_URL
  ENCRYPTION_KEY
```

Why a placeholder database URL is safe here, and what would make it unsafe, is written down in
`OPENAPI-CI.md` rather than left to be rediscovered.

## Criterion 2 — determinism, measured

Two consecutive generations, hashed:

```
run-1 sha256: e5f2a462a714f000d39aabc033c6c1961701412eca684e62ff63015dc01d18e8
run-2 sha256: e5f2a462a714f000d39aabc033c6c1961701412eca684e62ff63015dc01d18e8
```

Byte-identical. The `sortRecord()` calls in `build-openapi-document.ts` are what make this hold for
paths, schemas, parameters and responses. Without it the whole gate would be noise.

## Criterion 3 — the Timesheets half, proved reversibly

Adding `"PROBE"` to the `billingType` enum in `modules/timesheets/core/dto/entries.schemas.ts` and
regenerating produced `changed POST /timesheets/entries`, so a DTO change does reach the document.
That file belongs to session S2, so the probe was reverted and the revert verified — re-checked
independently by the orchestrator afterwards: `grep -rn "PROBE" src/modules/timesheets/` is empty
and `git diff HEAD` on the file is empty. The enum reads `["BILLABLE","NON_BILLABLE","FIXED"]`, as it did before.

Exposure counts across 3,540 operations: **3,183 permissioned · 215 public · 95 universal · 47
in-service · 0 undeclared.**

## Criterion 4 — the gate bites, and the artifact was stale

```
$ pnpm openapi:check
openapi.json is current — 3540 operations, 1916 carrying a zod contract     (exit 0)

  on a deliberately mutated artifact:
openapi.json is STALE. Run: pnpm openapi:generate                           (exit 1)

$ pnpm check:contract-vendor:self-test    identical → match, different → mismatch   (exit 0)
$ pnpm check:contract-vendor              frontend copy matches backend, sha256 e5f2a462…  (exit 0)
```

The committed artifact was **7 operations stale** (6 changed, 1 added) and has been regenerated.
`frontend/contracts/openapi.json` was vendored by hand with no gate, so the frontend drift check
could silently run against a stale copy; `frontend/scripts/check-contract-vendor.mjs` closes that,
and fails explicitly rather than passing when the backend file is absent (a frontend-only checkout).

`check-openapi-fresh.ts` classifies `added` / `removed` / `changed` and exits 1 on all three. It does
**not** semantically separate breaking from additive change — recorded as a limitation, not claimed
as coverage.

## What regenerating the artifact exposed

Refreshing a stale 4.3 MB contract surfaced a drift the stale copy was hiding.
`pnpm check:contract-drift` now fails:

```
✖  1 contract drift violation(s) not covered by KNOWN_DRIFT baseline:
  extra body fields on POST /timesheets/exceptions/{exceptionId}/resolve not in contract schema: reason
```

**The frontend is not wrong and neither is the backend.** `resolveExceptionSchema`
(`modules/timesheets/core/dto/exceptions.schemas.ts:14`) declares `reason: z.string().min(3).max(500)`,
and the route validates it — but through a **per-parameter pipe**,
`@Body(new ZodValidationPipe(resolveExceptionSchema))` at `exceptions.controller.ts:57`, not through
the `@Validate({ body })` decorator that `scanOperationContracts` reads. The request is validated at
runtime; the contract simply cannot see the schema.

Measured across the codebase:

| Form | Handlers | Controllers |
|---|---:|---:|
| `new ZodValidationPipe(...)` — invisible to the generator | **1,844** | 456 |
| `@Validate({ body, query, params })` — read by the generator | **16** | — |

`backend/CLAUDE.md` §2 documents `@Validate` as the standard; 1,844 call sites predate it. That is
why only 1,916 of 3,540 operations carry a Zod contract. **The freshness gate is real and works; the
body coverage of the contract it guards is partial, and this is the number.**

Not fixed here: converting 1,844 handlers across 456 controllers spanning every session's territory
is not a verification task, and doing it mid-programme would collide with five concurrent sessions.
Raised in `CROSS-SESSION.md` as a programme-level item with the measurement attached.

## Blocker note

Ticket 26 (Timesheets drift, S5) and ticket 28 (route-access adoption, S5) are both still in flight.
Neither blocked building the gate: 26's outcome is what the gate measures, and 28's adoption is
surfaced automatically by exposure stamping that already works. Only criterion 3's route-access half
genuinely waits, and it is left unticked.

## Files

- `backend/src/scripts/openapi-env.ts` (new) · `generate-openapi.ts` (calls the seam)
- `frontend/scripts/check-contract-vendor.mjs` (new) · `frontend/contracts/README.md`
- `backend/openapi.json` and `frontend/contracts/openapi.json` regenerated, identical sha256
- `frontend/package.json` — `check:contract-vendor` (+ self-test)
- `architecture-refactor/final-refactor/evidence/41-openapi/OPENAPI-CI.md`
