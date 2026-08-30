# SPLIT1b — CRM schema + import service decomposition

## Before / after line counts

### Schema splits (deals.ts → 3 files)
| File | Lines |
|---|---|
| `db/schema/crm/deals.ts` (before) | 1016 |
| `db/schema/crm/deals.ts` (after — stub) | 2 |
| `db/schema/crm/deal-pipeline.ts` | 520 |
| `db/schema/crm/deal-sales.ts` | 338 |
| `db/schema/crm/deal-tasks.ts` | 137 |

Barrel `db/schema/crm/index.ts` exports from all three new files; the stub correctly redirects in a comment only. No consumer import changed — all go through the root barrel `db/schema`.

### Import service splits (crm-import.service.ts → 4 files)
| File | Lines |
|---|---|
| `crm-import.service.ts` (before) | 1234 |
| `crm-import.service.ts` (after — facade) | 183 |
| `crm-import-preview.service.ts` | 219 |
| `crm-import-commit.service.ts` | 291 |
| `crm-import-revert.service.ts` | 231 |
| `crm-import-internals.ts` | 200 |

### Connector service splits (crm-connector.service.ts → 3 files + internals)

The previous lane created the split files but left the 757-line original intact (abandoned split). This lane completed it.

| File | Lines |
|---|---|
| `crm-connector.service.ts` (before) | 757 |
| `crm-connector.service.ts` (after — facade) | 61 |
| `crm-connector-walk.service.ts` | 284 |
| `crm-connector-lifecycle.service.ts` | 210 |
| `crm-connector-internals.ts` | 73 |

### Additional splits for files over 500 lines

**crm-support-dashboard.service.ts** — two distinct dashboard responsibilities:
| File | Lines |
|---|---|
| `crm-support-dashboard.service.ts` (before) | 549 |
| `crm-support-dashboard.service.ts` (after — support dashboard only) | 312 |
| `crm-ce-dashboard.service.ts` (CE dashboard) | 231 |

**crm-organizations.service.ts** — merge/reparent extracted:
| File | Lines |
|---|---|
| `crm-organizations.service.ts` (before) | 570 |
| `crm-organizations.service.ts` (after — CRUD + list + duplicates) | 440 |
| `crm-organizations-merge.service.ts` (merge + reparent subsidiaries) | 113 |

## Responsibility of each new file

| File | Owns |
|---|---|
| `deal-pipeline.ts` | Pipeline stages, deal-stage membership, stage transition history |
| `deal-sales.ts` | Core deal entity, deal contacts, deal revenue |
| `deal-tasks.ts` | Deal-specific task schema |
| `crm-import-preview.service.ts` | File parse + column map + row preview |
| `crm-import-commit.service.ts` | Batch commit lifecycle (begin/batch/finish) |
| `crm-import-revert.service.ts` | Batch revert lifecycle (begin/batch/finish) |
| `crm-import-internals.ts` | Shared types (PhaseExtent, BatchOutcome, ImportContext, ImportProgress) and helpers (getImport, contextFor) |
| `crm-connector-walk.service.ts` | Per-walk: beginWalk, fetchPage, isFull, finishWalk, staging |
| `crm-connector-lifecycle.service.ts` | Sync lifecycle: startSync, recordFailure, progress, ensureSync, claimRun |
| `crm-connector-internals.ts` | Shared types (WalkExtent, PageOutcome, WalkResult), constants (FAILURE_LIMIT, MAX_PAGES_PER_WALK), helpers (getSync, getConnection, settled) |
| `crm-ce-dashboard.service.ts` | Customer executive dashboard: health, renewals, key accounts, CSAT |
| `crm-organizations-merge.service.ts` | Organization merge + subsidiary reparenting |

## Circular dependency fix

The split introduced a cycle:
```
crm-connector-walk.service.ts → crm-connector.service.ts (FAILURE_LIMIT)
crm-connector.service.ts → crm-connector-walk.service.ts (injection)
```

Fix: moved `FAILURE_LIMIT` and `MAX_PAGES_PER_WALK` to `crm-connector-internals.ts`. Both the walk service and the facade re-export from internals. No `forwardRef` anywhere.

## Wiring confirmed

All new services registered as providers in their module:

**`crm-import.module.ts`** providers:
- CrmImportPreviewService ✓
- CrmImportCommitService ✓
- CrmImportRevertService ✓
- CrmImportService (facade) ✓
- CrmConnectorWalkService ✓
- CrmConnectorLifecycleService ✓
- CrmConnectorService (facade) ✓

**`crm.module.ts`** providers added:
- CrmCeDashboardService ✓
- CrmOrganizationsMergeService ✓

No `import type` used on any injected Nest service. All service injections use concrete class imports.

## Madge result

```
Processed 4646 files (81.6s) (30 warnings)
✔ No circular dependency found!
```

Zero circular dependencies before and after.

## Test results

```
Test Suites: 2 skipped, 54 passed, 54 of 56 total
Tests:       26 skipped, 1 todo, 547 passed, 574 total
Time:        40.892 s
```

The 2 previously failing tests in `crm-connector-tenant-isolation.spec.ts` were testing `CrmConnectorService` with the old 4-arg constructor. After the split, the isolation logic lives in `CrmConnectorLifecycleService.progress`; the spec was updated to test that service directly with a 2-arg constructor (db + workflows). The security property (NotFoundException on cross-tenant sync id) is still asserted and bites.

No other spec changes were required.
