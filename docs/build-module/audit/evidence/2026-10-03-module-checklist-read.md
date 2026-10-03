# Module checklist read and command separation

Status: Current unverified for browser, persisted database, deployment, and operational behavior. Source and focused mock checks are verified only within the scope recorded below.

## Scope and ownership

Claim: `BLD-ONBOARDING-READS-02`, reserved by the session coordinator at outer commit `def782c64` in [work claims](../../implementation/WORK-CLAIMS.md). The checklist owner changes the service, seed/read helpers, and focused existing tests. The response-contract owner changes backend/frontend Zod variants separately. The session coordinator owns frontend stable keys and browser verification. No requirement is marked complete by this evidence.

Reviewed baseline: backend `65f3c084b001b66a50983150e31c00b8facf31af`, outer `5598ff15388eed89e1de66d09a46ee28e5fa6d8f`. Implemented source revision: backend `7ccb2852a`. Other agents' work remains outside the ownership boundary.

## Source changes

- `backend/src/modules/hr/onboarding/flow/module-checklist.service.ts`: GET list/detail no longer initialize durable rows, synchronize metadata by writing, recompute stored progress, or call HR write reconciliation. Enabled and accessible module keys are intersected before checklist queries and HR probes. Record and item reads retain organization predicates.
- `backend/src/modules/hr/onboarding/flow/module-checklist-read.ts`: pure projection overlays current seed metadata, includes missing current seed items, preserves unknown persisted items, and derives progress. HR signal results are projected in memory; skipped and blocked states are preserved.
- `backend/src/modules/hr/onboarding/flow/module-checklist-seeds.ts`: one retained copy of the existing module seed definitions. Stable `moduleKey` and `itemKey` identities drive view keys and commands.
- Explicit activation and complete/skip/dismiss/restart commands materialize parent/item rows using their existing composite unique conflict targets. Module keys and selected parent rows are ordered deterministically before inserts. Command item, metadata, status, and progress writes use the passed transaction. Parent row locks serialize checklist commands. Every write includes organization scope; item writes also include the checklist parent.
- Completion clears stale skip state; skipping clears stale completion state; reopening incomplete work clears stale parent completion. Dismissal preserves independently derived completion/progress and can hide an incomplete checklist.
- The previous service dependency on HR write reconciliation is removed. Existing HR probe implementation and standalone reconciliation tests remain intact.
- Repeated complete/skip commands retain existing item timestamps and emit no duplicate success analytics for the same state. Focused tests cover retry intent; real first-command races still require database verification.

## Response projection agreement

| Parent | Item | Durable timestamps |
|---|---|---|
| Existing positive parent ID | Existing positive item ID with matching positive `checklistId` | Existing dates retained when still semantically valid |
| Existing positive parent ID | New seed projection: `id: null`, `checklistId: parent.id` | Item `completedAt` and `skippedAt` are null |
| Initial projection: `id: null` | All items `id: null`, `checklistId: null` | Parent `createdAt`, `updatedAt`, `completedAt`, `dismissedAt` and item dates are null |

Initial and missing-seed HR items can have derived `done` status without claiming a completion timestamp. Partial legacy checklists include newly required steps in displayed progress instead of silently omitting them. Durable positive-ID/date contracts remain separate from initial variants. Commands materialize real IDs before mutation.

## Focused verification

No production database mutation, environment edit, server launch, or browser action was performed by this owner.

The new pure helper suite first failed because the helper did not exist. The revised service suite failed against the prior service dependency graph, then passed after the repair. The following final focused command passed:

```powershell
pnpm -C backend exec jest src/modules/hr/onboarding/flow/module-checklist.service.spec.ts src/modules/hr/onboarding/flow/module-checklist-read.spec.ts src/modules/hr/onboarding/flow/module-checklist-seed-sync.spec.ts src/modules/hr/onboarding/flow/onboarding-flow-new-tenant-isolation.spec.ts src/modules/hr/onboarding/core/onboarding.controller.spec.ts --runInBand --silent
```

Final result: five suites, 63 tests passed, including a direct assertion against the real backend response schema for initial Build, derived initial HR, partially persisted, and persisted/HR projections. A scoped dependency graph covering the seven owned source/test files also passed:

```powershell
node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit -p tsconfig.checklist-verification.json
```

The temporary config extended `tsconfig.test.json`, disabled incremental output, listed only those seven files as roots, and retained their imported dependencies. It was removed after the check. This is not a full backend test TypeScript result.

Scoped ESLint passed on the seven owned source/test files. The controller and permission keys are unchanged. Controller tests continue to check module-specific permissions and list filtering. No code comments were added.

The session coordinator independently reviewed the source after the timestamp/event retry and deterministic insertion-order fixes and reported no remaining source blocker. Commit authorization is limited to these seven owned source/test paths and this evidence document.

## Narrow target catalog evidence

The session coordinator separately queried the actual target catalog in an IAM-authenticated READ ONLY transaction as `streamline_app`, with neither superuser nor RLS-bypass privileges. No database mutation or user payload was involved. The catalog confirmed:

| Conflict target | Columns | Catalog properties |
|---|---|---|
| `uq_module_setup_checklists_org_module` | `org_id, module_key` | Unique, valid, ready, live, immediate, nonpartial B-tree |
| `uq_module_checklist_items_checklist_key` | `checklist_id, item_key` | Unique, valid, ready, live, immediate, nonpartial B-tree |
| `uniq_module_setup_checklists_org_id` | `org_id, id` | Unique, valid, ready, live, immediate, nonpartial B-tree |
| `uniq_module_checklist_items_org_id` | `org_id, id` | Unique, valid, ready, live, immediate, nonpartial B-tree |

This confirms the command's stated conflict targets exist on the actual target. It does not prove successful command writes, concurrency, rollback, persistence, or RLS semantics. Those checks remain open below.

## Recovery limitation retained from the baseline

`resolveVisibleModuleKeys` retains the existing `EntitlementsService.listModules` failure handling: an infrastructure failure becomes an empty enabled-module list. Detail requests therefore return 404 instead of a recoverable infrastructure error; list requests return an empty result. This slice preserves that existing convention rather than changing entitlement failure semantics. Recovery behavior remains Current unverified and needs a separately reviewed error-contract change.

## Remaining evidence

- Real authorized GET requests for existing and absent checklists, with before/after row counts proving no durable changes.
- Real read-only account and inaccessible-module checks, including absence of HR probes for inaccessible modules.
- Browser render/reload for wholly initial and partially initialized checklists, stable keys, errors, and mobile layout.
- Real command/activation persistence, concurrent first commands, transaction rollback, and reload after complete/skip/dismiss/restart.
- Deployment and operational verification. Full backend test TypeScript validation remains unrun after the session's previous memory failure; a focused dependency graph is used for this slice.
