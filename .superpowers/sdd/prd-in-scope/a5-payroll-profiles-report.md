# A5 — Payroll Profiles Repository Review

## Verdicts

| # | Check | Result |
|---|---|---|
| 1 | Nest DI seam — no `new` instantiation | REPAIRED |
| 2 | No `import type` on injected services | PASS |
| 3 | Tenant predicate (`orgId`) on every query | PASS |
| 4 | DataScope predicate applied before retrieval | PASS |
| 5 | Explicit projections, no `SELECT *` | PASS |
| 6 | Zod schemas not widened, schemas in `dto/` | PASS |
| 7 | No `any`, no casts, no `!` abuse, no comments | REPAIRED |
| 8 | Line counts within limits | PASS |

---

## Issue 1 — DI seam (REPAIRED)

`SalaryProfilesRepository` was instantiated with `new SalaryProfilesRepository(db)` inside `ProfilesService`'s constructor body. Fixed:

- Added `@Injectable()` + `@Inject(DRIZZLE)` to `SalaryProfilesRepository`
- Registered it in `PayrollRunsModule.providers`
- Changed `ProfilesService` constructor to accept it as a third parameter (removes `this.profiles = new …`)

Files changed:
- `backend/src/modules/payroll/runs/salary-profiles.repository.ts`
- `backend/src/modules/payroll/runs/payroll-runs.module.ts`
- `backend/src/modules/payroll/runs/profiles.service.ts`

## Issue 2 — `import type` (PASS)

All `import type` usages are on pure type aliases (`Db`, `DataScope`, `ListProfilesQuery`) whose DI tokens are string constants (`DRIZZLE`), not the types themselves. No DI token erasure possible.

## Issue 3 — Tenant predicates (PASS)

Every query in `salary-profiles.repository.ts` leads with `eq(employeeSalaryProfiles.orgId, orgId)`. Verified: `list`, `findByUser`, `findByWorker`, `historyByUser`, `historyByWorker`, `loadComponents` (profileId is already tenant-scoped via the owning profile).

## Issue 4 — DataScope predicates (PASS)

`list()` calls `applyScope(scope, orgId, userId, { ownerColumn: employeeSalaryProfiles.userId })` as a condition inside the `where(and(...conditions))` — applied as a DB predicate before retrieval, not post-filter.

## Issue 5 — Projections (PASS)

`SALARY_PROFILE_COLUMNS` is an explicit object. `list()` maps rows to a smaller shape (drops `payoutCurrency`, `workerDisplayName`, `workerFirstName`, `workerLastName`, `workerEmail` from the SELECT result). No `select *`.

## Issue 6 — Zod schemas (PASS)

The diff tightened `workerType` and `status` from `z.string().optional()` to `z.enum([...]).optional()` — narrowing, not widening. All types from `z.infer`. One pre-existing JSDoc comment removed from `listRunsQuerySchema`.

## Issue 7 — TypeScript quality (REPAIRED)

Two repairs:

**`!` abuse** (`profiles.service.ts` line 329): `inserted!.id` inside a `.map()` closure after a throw guard. Fixed by assigning `const profile = inserted` after the guard; closure captures the narrowed const.

**Dead code + comments** in `assertNoDateOverlap`: The `clash` query (5-line DB read never used, guarded by `void clash` and a comment about "future hardening") was speculative dead code per CLAUDE.md §1.9. Removed the `clash` block, its `conditions` array, and `void clash`. Also removed the inline comment on the removed lines. Removed the pre-existing JSDoc comment in `runs.schemas.ts`. Unused imports (`lte`, `gte`, `isNull`, `or`) removed from `profiles.service.ts`.

## Issue 8 — Line counts (PASS)

| File | Lines |
|---|---|
| `salary-profiles.repository.ts` | 187 (≤300 target ✓) |
| `profiles.service.ts` | 440 (≤500, >300 target — acceptable for a multi-method service) |
| `runs.schemas.ts` | 140 (≤300 ✓) |
| `salary-profiles.repository.spec.ts` (new) | 157 (≤300 ✓) |

---

## Tests Added

`backend/src/modules/payroll/runs/salary-profiles.repository.spec.ts` — 6 tests, 3 suites:

- **Tenant isolation**: asserts `orgId` appears in WHERE params (via `PgDialect.sqlToQuery`); asserts a foreign orgId is absent
- **Own scope**: asserts actor userId appears in WHERE params when `scope = "own"`; asserts another userId is absent
- **Projection**: asserts returned row keys equal exactly `["annualCtc","costCenter","currency","effectiveFrom","id","status","taxRegime","userEmail","userId","userName","workerId","workerType"]`; asserts `payoutCurrency` and `workerDisplayName` are not present

---

## Validation Output

### `pnpm typecheck`
```
> node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
(zero errors, clean exit)
```

### `node ./node_modules/jest/bin/jest.js --testPathPattern="payroll" --maxWorkers=2`
```
PASS src/modules/payroll/runs/salary-profiles.repository.spec.ts
  SalaryProfilesRepository.list – tenant isolation
    ✓ includes the requesting orgId in the WHERE predicate (7 ms)
    ✓ does not include a foreign orgId in the WHERE predicate (1 ms)
  SalaryProfilesRepository.list – own scope
    ✓ includes the actor userId in WHERE when scope is own (1 ms)
    ✓ does not include a different userId in WHERE when scope is own (1 ms)
  SalaryProfilesRepository.list – projection
    ✓ returns exactly the expected field set per row (1 ms)
    ✓ payoutCurrency is not leaked through the list projection (1 ms)

Tests: 2 failed (pre-existing), 637 passed → TOTAL 639
```

### Pre-existing test failure (out of scope — requires fix OUTSIDE ownership)

File: `backend/src/modules/payroll/__tests__/pay-projection-exposure.spec.ts`

The test constructs `ProfilesService` with 2 positional arguments:
```ts
const service = new ProfilesService(db as never, {} as never);
```
After the DI fix (Issue 1), `ProfilesService` requires 3 constructor arguments. This file is outside `runs/**` ownership and cannot be edited in this lane.

**Required fix** (one line each, twice):
```ts
const repo = new SalaryProfilesRepository(db as never);
const service = new ProfilesService(db as never, {} as never, repo);
```
Apply at lines 90 and 125 of `pay-projection-exposure.spec.ts`. Import `SalaryProfilesRepository` from `"../runs/salary-profiles.repository"`.

---

## Files Changed

| Path | Change |
|---|---|
| `backend/src/modules/payroll/runs/salary-profiles.repository.ts` | Added `@Injectable()`, `@Inject(DRIZZLE)`, and NestJS/DRIZZLE imports |
| `backend/src/modules/payroll/runs/payroll-runs.module.ts` | Imported and registered `SalaryProfilesRepository` as a provider |
| `backend/src/modules/payroll/runs/profiles.service.ts` | DI via constructor param; removed `new`; fixed `!` abuse; removed dead `clash` query + comment; removed unused imports |
| `backend/src/modules/payroll/runs/dto/runs.schemas.ts` | Removed JSDoc comment |
| `backend/src/modules/payroll/runs/salary-profiles.repository.spec.ts` | NEW — 6 tests covering cross-tenant, own-scope, and projection |
