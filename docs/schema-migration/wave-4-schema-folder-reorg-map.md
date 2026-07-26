# Wave 4 — schema-folder reorg map (T4.1)

> Move the ~40 flat files in `backend/src/db/schema/` root into `common/` + per-module folders,
> **without renaming any exported symbol**. Application code imports from the barrel
> (`../../db/schema`) and is unaffected; only `index.ts` paths + deep-importers change.
> Read-only analysis, verified 2026-07-26.

## BLOCKER (do this first) — R1 circular relation
`backend/src/db/schema/auth.ts` imports `departments` from `./hr` and `tickets` from `./projects`
(used only inside `usersRelations`). That makes `common/auth → hr/` and `common/auth → projects/`
circular. **Extract the cross-module relation declarations into `common/auth-relations.ts`
(or into `hr/`/`projects/`) before moving `auth.ts`.** Standard Drizzle cross-module-relations pattern.

## Target mapping (40 root files)
- **`common/`** (cross-cutting, imported by many): `enums.ts` (move FIRST — no tables, imported everywhere), `auth.ts` (after R1), `organization.ts`, `access.ts`, `shared.ts`, `feature-flags.ts`, `agent-tokens.ts`, `platform.ts`, `onboarding.ts`, `integrations.ts`, `email.ts`, `workflow.ts`, `workspace-search.ts`, `notifications-delivery.ts` (with `shared`), `user-management.ts`.
- **`accounting/`**: `accounting.ts`, `accounting-core.ts`, `finance-ar-ap.ts`, `finance-banking.ts`, `finance-tax.ts`, `finance-assets.ts`, `finance-planning.ts`, `finance-expenses.ts` (unidirectional bridges `accounting → crm/hr/projects` — keep one-way).
- **`billing/`**: `billing.ts`, `payment-providers.ts`.
- **`ai/`**: `ai-chat.ts`, `ai-feedback.ts`, `ai-jobs.ts`, `ai-confirmation.ts`, `ai-summaries.ts`.
- **`blog/`**: `blog.ts` · **`chat/`**: `chat.ts` (→crm bridge) · **`feedbucket/`**: `feedbucket.ts`.
- **`projects/`**: `project-teams.ts`, `comment-drafts.ts` (already project-scoped).
- **Sub-barrel proxies** (`crm.ts`, `hr.ts`, `projects.ts`, `surveys.ts`) already `export *` from their subfolder → collapse into the subfolder's `index.ts` or keep as-is.

## Barrel + blast radius
- `index.ts` uses `export * from "./file"` (46 lines) — update the path strings only; the ~250 files importing the barrel are unaffected.
- **Deep-importers that break (must update paths): 40 files / 55 import lines.** Heaviest: `./auth` (14 files), `./organization` (8), `./accounting` (6), `./ai-summaries` (5), finance-* (several). Recommended: migrate deep imports to the barrel so the codebase becomes move-safe.

## Execution order (typecheck after each step)
1. Fix R1 (extract `auth-relations.ts`). 2. Move `enums.ts`. 3. Move `auth.ts` + fix 14 deep-importers. 4. Rest of `common/` + 8 `organization` importers. 5. `accounting/` group (~20 importers). 6. module files (`billing`/`ai`/`blog`/`chat`/`feedbucket`/`project-teams`/`comment-drafts`, ~14 importers). 7. collapse sub-barrels. 8. add per-folder `index.ts` sub-barrels; simplify root `index.ts`. 9. `pnpm -C backend typecheck` + tests.

> Risk register (from analysis): R2 `finance-planning`→hr+projects, R3 `finance-expenses`→hr/payroll, R4 `finance-assets`/`finance-ar-ap`→crm, R5 `chat`→crm deals, R6 `billing`→crm — all acceptable **unidirectional** bridges; never let the target import back. R8: intra-file `./x` paths gain a `../` when the file moves one level deeper.
