# Wave-B-07 — Project Settings: Retention

## What the route rendered before

`frontend/app/(authenticated)/build/[projectId]/settings/retention/page.tsx` rendered only a `RetentionPlaceholder` EmptyState component with the message "Retention policy configuration is awaiting open question 9 resolution." No real UI, no backend, no schema.

## Criterion table

| # | Description | Status |
|---|---|---|
| C1 | Canonical route and disposition | pre-ticked |
| C2 | Page satisfies user job without duplicating another module | **TICKED** |
| C3 | Every core field, action, overlay, URL param, shortcut, state, and permission implemented and tested | **TICKED** |
| C4 | Lists bounded/virtualized | **BLOCKED** — page is a settings form; no list exists |
| C5 | Server/client schemas, cache keys, contract tests | **TICKED** |
| C6 | Keyboard/screen-reader/mobile checks | orchestrator-only — not ticked |
| C7 | Production browser evidence | orchestrator-only — not ticked |

## C3 row-by-row

| Requirement | Delivered |
|---|---|
| Section URL state (`section` param: `policy` / `holds`) | `parseRetentionSection` + `router.replace` |
| Search URL state | `useBuildListFilters` wired; `search` param reflected |
| Keyboard `/` and `Esc` | `useBuildListKeyboard` |
| Policy section form | `inheritOrgPolicy` Switch + three `RetentionFieldRow` Selects + Save button |
| Legal-hold section | hold status display + Apply/Remove via `ConfirmDialog` |
| `usePageState` denied / loading / error / ready | all branches wired via `<PageState>` |
| Skeleton loading state | `SKELETON_LOADING` constant |
| `useCan("build:update")` on mutation controls | `canEdit` gates Save + Apply/Remove |
| `staleTime: 60_000` on GET | hook `project-retention-settings.ts` |
| Cache patch on policy save | `setQueryData` in `useUpdateRetentionPolicy` |
| Full invalidation on legal-hold toggle | `invalidateQueries` in `useSetLegalHold` |

## Test results

```
PASS features/build/settings/project-settings-retention-schema.test.ts   37/37
PASS features/build/settings/project-settings-retention-page.test.tsx    18/18
Total: 55/55
```

## Files created

- `frontend/features/build/settings/project-settings-retention-schema.ts`
- `frontend/features/build/settings/project-settings-retention-page.tsx`
- `frontend/features/build/settings/project-settings-retention-page.test.tsx`
- `frontend/features/build/settings/project-settings-retention-schema.test.ts`
- `frontend/hooks/api/build/project-retention-settings.ts`
- `backend/src/modules/build/core/projects-retention-settings.controller.ts`
- `backend/src/modules/build/core/projects-retention-settings.service.ts`
- `backend/src/modules/build/core/projects-retention-settings.module.ts`
- `backend/src/modules/build/core/dto/project-retention-settings.schemas.ts`
- `backend/migrations/1295_build_project_retention_settings.sql`
- `backend/migrations/1295_build_project_retention_settings_rollback.sql`

## Files modified

- `frontend/app/(authenticated)/build/[projectId]/settings/retention/page.tsx` — replaced placeholder with `ProjectSettingsRetentionPage`
- `frontend/lib/query-keys/build-work.ts` — added `retentionSettings` factory
- `backend/src/db/schema/build/core.ts` — added `projectRetentionSettings` Drizzle table
- `backend/src/modules/build/build.module.ts` — added `ProjectsRetentionSettingsModule`
- `docs/build-module/10-project-settings-retention.md` — ticked C2, C3, C5; updated C4 blocked note

## Migration details

File: `backend/migrations/1295_build_project_retention_settings.sql`
Range used: 1295 (single migration; 1296–1299 remain free)
Table: `build.project_retention_settings`
Columns: `id`, `org_id`, `project_id`, `inherit_org_policy`, `closed_ticket_retention_days`, `attachment_retention_days`, `audit_log_retention_days`, `legal_hold`, `legal_hold_reason`, `legal_hold_set_at`, `version`, `updated_at`
Guards: CHECK constraints on day values `IN (30, 60, 90, 180, 365)`, RLS tenant_isolation policy, GRANT to streamline_app
Rollback: `backend/migrations/1295_build_project_retention_settings_rollback.sql`

NOTE: migration is journalled but unapplied — the backend service returns 404 until it is applied. The frontend handles this gracefully via `usePageState` error state.

## Test commands

```sh
cd frontend
npx jest --testPathPattern="features/build/settings/project-settings-retention" --no-coverage
```
