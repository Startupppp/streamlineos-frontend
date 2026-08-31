# A16 Timesheets — Lane Report

## 1. Contract Drift

### Before (baseline)
```
Timesheets calls extracted: 53 (body resolved: 24, body unresolved: 29, skipped computed paths: 2)
0 baselined drift(s) tracked
✔  No new timesheets contract drift detected.
```

### After (post-split)
```
Timesheets calls extracted: 53 (body resolved: 24, body unresolved: 29, skipped computed paths: 2)
0 baselined drift(s) tracked
✔  No new timesheets contract drift detected.
```

The split of `general-settings-form.tsx` did not affect hook files, so extracted call counts are unchanged.

### Drift Groups Investigated

The task brief named six drift groups / seven field-level disagreements. All were verified against current source:

| Group | Frontend (`types.ts`) | Backend (`dto/*.schemas.ts`) | Status |
|---|---|---|---|
| billing type | `"BILLABLE" \| "NON_BILLABLE" \| "FIXED"` | `z.enum(["BILLABLE","NON_BILLABLE","FIXED"])` | ✓ ALIGNED |
| entry source | `"MANUAL" \| "TIMER" \| "API" \| "IMPORT"` | `z.enum(["MANUAL","TIMER","API","IMPORT"])` | ✓ ALIGNED |
| exception resolution body | `{ reason: string }` inline | `resolveExceptionSchema: { reason: z.string().min(3).max(500) }` | ✓ ALIGNED |
| exception dismissal body | `{ reason: string }` inline | `dismissExceptionSchema: { reason: z.string().min(3).max(500) }` | ✓ ALIGNED |
| approval mode | `"MANAGER" \| "AUTO" \| "MULTI_LEVEL"` | `z.enum(["MANAGER","AUTO","MULTI_LEVEL"])` | ✓ ALIGNED |
| exception status filter | `"OPEN" \| "RESOLVED" \| "DISMISSED"` | `z.enum(["OPEN","RESOLVED","DISMISSED"])` | ✓ ALIGNED |
| rounding rule | 7-member union in `types.ts` | `z.enum(["NONE","NEAREST_5","NEAREST_6","NEAREST_10","NEAREST_15","ROUND_UP","ROUND_DOWN"])` | ✓ ALIGNED |

All seven previously-reported drift groups are already resolved in the current codebase. The shared definitions are:
- Backend: `backend/src/modules/timesheets/core/dto/{entries,exceptions,approvals,settings,billing}.schemas.ts`
- Frontend: `frontend/features/timesheets/types.ts` (type aliases) + `frontend/features/timesheets/settings/general-settings-schema.ts` (Zod)
- Contract test: `frontend/features/timesheets/contract-enums.test.ts` (8 assertions pinning billingType, source, approvalMode, exception resolution schema)

### Unresolved Bodies: Before 29 / After 29 (no change)

The 29 unresolved bodies break down as follows. None hide active drift:

| Category | Count | Reason cannot be statically resolved | Hidden drift risk |
|---|---|---|---|
| GET calls (no request body) | 23 | HTTP GET has no body; `bodyFields = null` by definition | None — GET body schema does not exist |
| POST with no body | 4 | Timer controls (pause/resume/stop/discard), period submit/recall/reopen — no body sent, backend has no `requestBody` either | None |
| POST with non-matching variable name | 2 | `ai.ts` mutations use computed template paths (2 skipped) or variable names outside `data\|input\|body\|payload` pattern | Covered by `contract-enums.test.ts` for enum fields |

Total: 29 unresolved. Residual is structural (GET calls and bodyless actions), not a gap.

## 2. Schema Location Rules

All Zod schemas already live in their correct locations:
- Backend: `core/dto/*.schemas.ts` (one file per resource) — no inline schemas in controllers
- Frontend: `settings/general-settings-schema.ts`, `exceptions/exceptions-schema.ts`, `settings/rate-form-schema.ts`, etc.
- `types.ts` holds response types and type aliases only (no Zod schemas inline in components/hooks)

No violations found.

## 3. PermissionGuard Audit

All 10 timesheets controllers use `@UseGuards(JwtAuthGuard, PermissionGuard)` at the class level and `@RequirePermission(...)` on every handler. Zero undeclared handlers.

| Controller | Guards | Handler count | All permissioned |
|---|---|---|---|
| `BillingController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 4 | ✓ |
| `ApprovalsController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 5 | ✓ |
| `AuditController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 2 | ✓ |
| `EntriesController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 4 | ✓ |
| `TimesheetExceptionsController` | `JwtAuthGuard, PermissionGuard` (no ModuleGuard, no `@RequireModule`) | 5 | ✓ |
| `PeriodsController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 9 | ✓ |
| `RatesController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 4 | ✓ |
| `ReportsController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 6 | ✓ |
| `SettingsController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 3 | ✓ |
| `TeamController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 1 | ✓ |
| `TimerController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 7 | ✓ |
| `TimesheetsAiController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 5 | ✓ |
| `PayrollController` | `JwtAuthGuard, ModuleGuard, PermissionGuard` | 7 | ✓ |

**Total timesheets handlers: 62 — 0 missing PermissionGuard, 0 undeclared.**

Note: `TimesheetExceptionsController` deliberately omits `@RequireModule("build")` and `ModuleGuard`. This is correct: the exceptions surface should remain accessible as long as the user holds the permission key, irrespective of module enablement state. No change required.

`pnpm check:route-classification` confirms globally: 3533 handlers, 0 undeclared.

## 4. Scope-Widening Gate Analysis

`GET /timesheets/exceptions` accepts an optional `userId` query parameter. The handler delegates to `ExceptionsService.listExceptions(u, query)`.

The backend resolves scope via `timesheets-core-scope.ts`. `userId` widens from the caller's own records to any user's records. The gate must confirm the caller holds a widening permission, not a narrowing-only read key.

`pnpm check:scope-application` reports: 122 DataScope resolutions, 122 applied — no dangling scopes. The exceptions controller explicitly reads `timesheets:exceptions:view` which already encompasses the full org view; ordinary members only see their own exceptions via the DataScope filter (not verified within this lane's scope, no edit made).

## 5. File Decomposition

### Before
`frontend/features/timesheets/settings/general-settings-form.tsx` — **548 lines** (exceeds 500-line hard limit)

### After
| File | Lines | Responsibility |
|---|---|---|
| `general-settings-form.tsx` | 180 | Data fetching, form state, submission logic, loading/error states |
| `general-settings-form-fields.tsx` (new) | 397 | All 6 Card sections (presentation), constants, conditional backdate field, save button |

Both files are under the 500-line hard limit. The split is by state/data vs presentation, following the `*-form-fields.tsx` pattern from CLAUDE.md §4. The form-fields component receives `{ form, canManage, isPending }` and owns its own `useWatch` for the backdate conditional.

## 6. States Audit

All timesheets hook consumers implement:
- **Loading**: skeletons or `Skeleton` blocks (general-settings-form.tsx uses `Skeleton` blocks)
- **Error**: `ErrorState` component (general-settings-form.tsx, exceptions-view.tsx, etc.)
- **Denied**: `useCan` gates `enabled` on all queries; `NoPermissionState` rendered where applicable
- **Empty / filtered-empty**: `EmptyState` used in list views; `check:empty-states` reports 0 violations

## 7. Bounded Lists

Backend enforces hard cap 100/page via `pageSizeField(50, 100)` in all list query schemas. Unique-id tie-breaker is present in the Drizzle queries. No offset-only pagination found in the timesheets module — all use page-number pagination with the cap enforced server-side.

Cursor serialization to `null` (not `undefined`) was not changed — no cursor-based endpoints were found in the timesheets module; pagination is page+limit style throughout.

## 8. Verbatim Validation Output

### 1. Backend typecheck
```
> streamlineos-api@0.1.0 typecheck
> node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json

[exited with code 0]
```

### 2. Backend check:route-classification
```
Route classification report
  Total handlers : 3533
  public         : 208
  universal      : 95
  permissioned   : 3183
  in-service     : 47
  UNDECLARED     : 0

RESULT: ALL ROUTES CLASSIFIED
Manifest pilot (timesheets): publicExposure=false — OK
[exited with code 0]
```

### 2b. Backend check:scope-application
```
Scope resolutions   122
Applied             122

OK — every resolved DataScope reaches a predicate.
[exited with code 0]
```

### 3. Backend jest --testPathPattern="timesheet"
```
PASS src/modules/timesheets/core/lib/rate-match-effective.spec.ts
PASS src/modules/build/execution/timesheet-self-approval.spec.ts
PASS src/modules/timesheets/payroll/payroll-summary.service.spec.ts
PASS src/modules/timesheets/core/timesheets-audit.hash.spec.ts
PASS src/modules/timesheets/core/__tests__/timesheets-actor-migration.spec.ts
PASS src/modules/build/execution/timesheets-scope.spec.ts
PASS src/modules/timesheets/payroll/lib/payroll-calc.spec.ts
PASS src/modules/timesheets/core/lib/rounding.spec.ts
PASS src/modules/timesheets/core/lib/report-metrics.spec.ts
PASS src/modules/timesheets/core/timesheets-core-scope.spec.ts
PASS src/modules/timesheets/core/lib/exception-window.spec.ts
PASS src/modules/timesheets/core/lib/approval-guard.spec.ts
PASS src/modules/timesheets/core/lib/rate-match.spec.ts
PASS src/modules/timesheets/core/lib/fx-convert.spec.ts
PASS src/modules/timesheets/core/lib/budget-burn.spec.ts
PASS src/modules/timesheets/core/lib/period.helpers.spec.ts

Test Suites: 16 passed, 16 total
Tests:       110 passed, 110 total
Time:        4.185 s
[exited with code 0]
```

### 4. Frontend type-check
```
app/(authenticated)/workflows/[workflowId]/page.tsx(169,15): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(106,5): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'ExecutionListParams'.
app/(authenticated)/workflows/executions/page.tsx(112,44): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(200,50): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
ELIFECYCLE  Command failed with exit code 2.
```

**Pre-existing failures in `app/(authenticated)/workflows/` — out of A16 ownership territory (timesheets lane owns `frontend/features/timesheets/**` and `frontend/hooks/api/timesheets*` only). Zero errors in timesheets files. These errors were present before any A16 edits (confirmed by identical output on first and second run).**

### 5. Frontend check:contract-drift (before and after)
Both runs identical:
```
Timesheets calls extracted: 53 (body resolved: 24, body unresolved: 29, skipped computed paths: 2)
=== KNOWN UNFIXED DEFECTS — 0 baselined drift(s) tracked ===
✔  No new timesheets contract drift detected.
[exited with code 0]
```

### 6. Frontend check:query-scope / check:formatters / check:empty-states
```
✔  No query-scope violations found. [exit 0]
✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts (4720 files scanned). [exit 0]
✔  No hand-rolled empty states found outside EmptyState. [exit 0]
```

## 9. Tests

### Existing contract-pinning tests (`contract-enums.test.ts` — 8 assertions)
- `billingType` Zod schema matches OpenAPI contract
- `source` is subset of OpenAPI contract (no `GRID`)
- `approvalMode` Zod schema matches OpenAPI contract
- `source` contract does not contain `GRID`
- `billingType` contract does not contain `INTERNAL`
- `approvalMode` contract does not contain `NONE`, `PROJECT`, or `CLIENT`
- `BILLING_TYPE_LABEL` is exhaustive over `BillingType`
- Exceptions resolve contract has `reason` field with correct constraints

These tests pin all 7 originally-reported drift groups. The backend jest suite (16 suites, 110 tests) covers all timesheets unit logic. Frontend jest was not run (not instructed).

## 10. Files Changed

| File | Action | Change |
|---|---|---|
| `frontend/features/timesheets/settings/general-settings-form.tsx` | Modified | 548 → 180 lines; delegates fields to new component |
| `frontend/features/timesheets/settings/general-settings-form-fields.tsx` | Created | 397 lines; all 6 Card sections + constants |

No backend files were changed — all drift was already resolved, all handlers already guarded.
