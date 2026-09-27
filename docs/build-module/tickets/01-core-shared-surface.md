# 01 — Publish the Build core shared surface

**What to build:** A reader (or agent) can answer "what is Build core's public surface?" from the directory itself. Core currently holds 227 files at one level with no published interface, so every sibling submodule reaches in by file path and nothing distinguishes a shared utility from an internal. Declare the surface explicitly and point sibling imports at it.

**Blocked by:** None — can start immediately.

**Status:** done except fenced-territory callers (see box 2 below)

**Architecture constraint (2026-09-27):** This is a backend module interface, not permission to
create another frontend hooks barrel. Export only intentionally shared contracts/helpers, keep
type-only imports type-only, and do not have internal files import their own outward-facing
barrel. A directory move or barrel by itself does not make private symbols inaccessible; ticket
28 must enforce the import boundary. Preserve dependency direction and Nest provider identity.

- [x] Core exports exactly the symbols legitimately shared across sibling Build submodules, and nothing else
- [x] Every sibling submodule imports those symbols from the core surface rather than by deep file path
  - **Earned 2026-09-27.** Zero deep core imports remain anywhere outside `core/` itself. Measured:
    `grep -rn 'from "\.\./core/' src/modules/build --include=*.ts | grep -v "^src/modules/build/core/" | grep -v 'from "\.\./core/tickets"' | wc -l` → **0**. The surviving `"../core/tickets"` imports are the second published barrel, not a deep path.
  - 34 of these edits sat in territory the implementing lane was fenced from and were applied by the orchestrator: `client-portal` (4), `entity` (4), `execution` (12 across 9 files), `forms` (3), `governance` (2), `incidents` (4), `meetings` (3), `updates` (1), plus `build-execution.module.ts`.
  - **The risk here was a cycle, not a compile error, and it was checked rather than assumed.** A barrel widens every importer's graph — `build-execution.module.ts` now imports `../core`, which exports `projects.module`. `pnpm check:cycles` (madge, 9051 files) reports exactly **1** circular dependency and it is the pre-existing `kb/linked-documents → kb/retrieval` pair; no Build cycle was introduced. There is also no internal-to-public-barrel back edge: nothing inside `core/` imports `./index` or `../core`.
  - Three files acquired duplicate `"../core"` specifiers from the mechanical rewrite (`execution/epics.service.ts`, `execution/workspace.service.ts`, `forms/submissions.service.ts`) and were merged to one import each — worth noting because a mass import rewrite in this repo has previously injected an import inside another import statement.
  - `meetings-cycle-bridge.spec.ts` was the one case needing judgement: it keeps its leaf `jest.mock("../core/project-access")` while importing the barrel. The mock propagates through the re-export, so the seam still works — verified by running it, **11/11**, rather than by reasoning about it.
  - `pnpm typecheck`: **38 errors, all in peer-owned `src/modules/kb`** and none in Build. `check:module-registration`: 260 of 260 modules reachable.
- [x] Symbols that remain internal are not reachable from outside core
- [x] No behaviour change: module registration and every route are untouched
- [x] A focused dependency-cycle/boundary check and module-wiring tests pass after the moves; no internal-to-public-barrel back edge is introduced

## What landed

Created `backend/src/modules/build/core/index.ts` — the core shared surface — exporting 32 symbols
across 12 source files: all five `project-access` functions, all eight `build-app-paths` functions,
`allocateTicketNumbers`, `DEFAULT_PROJECT_STATUSES`, `escapeLike`, `createTicketSchema`,
`refineDueOnOrAfterStart`, `PROJECTS_MANAGE_PERMISSION`, and the four NestJS module/service
classes (`ProjectsModule`, `ProjectsByIdModule`, `ProjectsRetentionSettingsModule`,
`ProjectsWebhooksDispatchService`) plus six more services/controllers consumed by build-root
test files (`ProjectResourcesController`, `BuildMembersService`, `ProjectsReleasesService`,
`ProjectsWebhooksService`, `ProjectsCustomFieldsService`, `ProjectsAnalyticsService`,
`listReleasesQuerySchema`).

Added `TICKETS_PERMISSION` to `backend/src/modules/build/core/tickets/index.ts` (it was missing;
ticket 25 noted the barrel re-exported it from the wrong source file — it is now re-exported from
`./tickets-scope` where it actually lives).

Removed the two unused pass-through re-exports (`resolveProjectAccess`, `assertProjectAccess`)
from `backend/src/modules/build/reachability/project-reachability.ts` — both had zero external
callers and merely forwarded to the same symbols now in the core surface (BE-143).

Updated every non-fenced sibling Build submodule and build-root file to use the surface:
- `build/approvals/approvals.service.ts` — `../core/project-access` → `../core`
- `build/approvals/approvals-read.service.ts` — `../core/project-access` → `../core`
- `build/approvals/approvals-by-id-project-access.spec.ts` — `../core/project-access` → `../core`
  (jest.mock at `"../core/project-access"` retained; it mocks the leaf the barrel re-exports from)
- `build/consolidation-guards/qa-bug-consolidation.spec.ts` — `../core/lib/default-statuses` → `../core`
- `build/files/files.service.ts` — `../core/project-access` → `../core`
- `build/import-export/build-import-export-registration.spec.ts` — `../core/projects-by-id.module` → `../core`
- `build/import-export/dto/ticket-import.schemas.ts` — `../../core/dto/project-core.schemas` → `../../core`
- `build/import-export/ticket-export.service.ts` — `../core/project-access` → `../core`
- `build/import-export/ticket-import.service.ts` — `../core/project-access` → `../core`
- `build/import-export/ticket-import-export.controller.spec.ts` — `../core/tickets/tickets-scope` → `../core/tickets`
- `build/import-export/ticket-import-row-rules.spec.ts` — `../core/dto/ticket.schemas` → `../core`
- `build/qa/bugs.service.ts` — `../core/project-access` → `../core`
- `build/qa/test-management.service.ts` — `../core/project-access` → `../core`
- `build/qa/test-runs.service.ts` — `../core/project-access` → `../core`
- `build/workflow/workflow.service.ts` — `../core/project-access` → `../core`
- `build/build.module.ts` — three separate deep imports merged into one `"./core"` barrel import
- `build/build-cross-tenant-404.spec.ts` — `./core/build-members.service` → `./core`
- `build/build-project-scoped-lists-404.spec.ts` — four deep imports merged into two `"./core"` barrel imports
- `build/build-route-order.spec.ts` — two deep imports merged into one `"./core"` barrel import
- `build/build-scopable-keys-have-a-resolver.spec.ts` — `./core/projects-scope` → `./core`, `./core/tickets/tickets-scope` → `./core/tickets`
- `build/build-ticket-comment-write-gates.spec.ts` — `./core/tickets/projects-ticket-comments.controller` → `./core/tickets`

## Why box 2 is not fully ticked

34 deep imports remain in **fenced directories** that lane-X cannot write. All resolve to the same pattern: change `"../core/project-access"` → `"../core"` (or the equivalent for lib, dto, modules):

**`build/client-portal/` (fenced):**
- `change-requests.service.ts:22` — `"../core/project-access"` → `"../core"`
- `client-portal-management.service.ts:8` — `"../core/project-access"` → `"../core"`
- `client-portal.service.ts:21` — `"../core/project-access"` → `"../core"`
- `client-visibility.service.ts:9` — `"../core/project-access"` → `"../core"`

**`build/entity/` (fenced):**
- `build-entity-activity-project-id.spec.ts:8` — `"../core/tickets/ticket-status.util"` → `"../core/tickets"`
- `build-entity.actions.spec.ts:8` — `"../core/tickets/ticket-status.util"` → `"../core/tickets"`
- `build-entity-reads.service.ts:32` — `"../core/build-app-paths"` → `"../core"`
- `build-entity-ticket-create.ts:11` — `"../core/lib/allocate-ticket-number"` → `"../core"`

**`build/execution/` (fenced):**
- `build-execution.module.ts:2` — `"../core/projects.module"` → `"../core"`
- `cycles.service.ts:7` — `"../core/project-access"` → `"../core"`
- `epics.service.ts:7-8` — `"../core/lib/allocate-ticket-number"` → `"../core"`, `"../core/project-access"` → `"../core"`
- `modules.service.ts:17` — `"../core/project-access"` → `"../core"`
- `sibling-version-conflict.spec.ts:3` — `"../core/tickets/ticket-version-conflict.exception"` → `"../core/tickets"`
- `sprints.service.ts:5` — `"../core/projects-webhooks-dispatch.service"` → `"../core"`
- `timesheets.service.ts:38` — `"../core/project-access"` → `"../core"`
- `workload-capacity.service.ts:14` — `"../core/project-access"` → `"../core"`
- `workspace.service.ts:14,15,16,30` — `"../core/project-access"` → `"../core"`, `"../core/lib/allocate-ticket-number"` → `"../core"`, `"../core/lib/escape-like"` → `"../core"`

**`build/forms/` (fenced):**
- `forms.service.ts:10` — `"../core/project-access"` → `"../core"`
- `submissions.service.ts:9,14` — `"../core/project-access"` → `"../core"`, `"../core/lib/allocate-ticket-number"` → `"../core"`

**`build/governance/` (fenced):**
- `decisions.service.ts:9` — `"../core/project-access"` → `"../core"`
- `risks.service.ts:9` — `"../core/project-access"` → `"../core"`

**`build/incidents/` (fenced):**
- `incidents.service.spec.ts:15` — `"../core/project-access"` → `"../core"`
- `incidents.service.ts:15` — `"../core/project-access"` → `"../core"`
- `incidents-postmortem-fields.spec.ts:16` — `"../core/project-access"` → `"../core"`
- `incidents-tenant-isolation.spec.ts:15` — `"../core/project-access"` → `"../core"`

**`build/meetings/` (fenced):**
- `action-items.service.ts:12` — `"../core/lib/allocate-ticket-number"` → `"../core"`
- `meetings.service.ts:17` — `"../core/project-access"` → `"../core"`
- `meetings-cycle-bridge.spec.ts:7` — `import * as projectAccessSeam from "../core/project-access"` → `import * as projectAccessSeam from "../core"`; `jest.mock("../core/project-access", ...)` may stay as-is (leaf mock still propagates through the barrel)

**`build/updates/` (fenced):**
- `updates.service.ts:10` — `"../core/project-access"` → `"../core"`

## Verification

```
pnpm check:cycles
# 1 cycle — modules/kb/linked-documents/kb-linked-document-ask-source.ts > modules/kb/retrieval/kb-ask-context.ts
# This is a pre-existing KB cycle (peer-owned), not introduced here.

pnpm check:module-registration
# check-module-registration: 260 module class(es) declared, 260 reachable from AppModule, 0 unreachable

pnpm check:kebab-case
# check-kebab-case: scanned 10284 entries under src — 0 violation(s), 2 of 2 recorded exceptions still present

pnpm jest --testPathPattern="build-route-order" → 5/5 pass
pnpm jest --testPathPattern="build-scopable-keys" → 4/4 pass
pnpm jest --testPathPattern="approvals-by-id-project-access" → 6/6 pass
pnpm jest --testPathPattern="ticket-import-row-rules|build-import-export-registration" → 16/16 pass
pnpm jest --testPathPattern="ticket-import-export" → 23/23 pass
pnpm jest --testPathPattern="qa-bug-consolidation" → 56/56 pass
pnpm jest --testPathPattern="project-reachability" → 15/15 pass
```

`check:file-sizes` and `check:over-300` fail on pre-existing files unrelated to this ticket (users.controller.ts, check-set-null-migration-text.ts, attendance-read.service.ts, public-careers-apply.ts). Not regressions.

`check:type-assertions` fails on three stale KB ratchet entries — pre-existing, peer-owned.

`pnpm typecheck` not run — requires 10 GB (BE-139) and peers are active. Files changed: core/index.ts (new, 32 lines), core/tickets/index.ts (+1 export), reachability/project-reachability.ts (−5 lines), 21 sibling files (1-line import changes each). No logic changes, only import path changes and one re-export deletion.
