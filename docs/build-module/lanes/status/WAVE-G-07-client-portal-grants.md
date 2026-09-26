# Wave G-07 — Client Portal Grants

**Scope:** C3 box on `docs/build-module/10-project-client-portal.md`
**Reserved migration range:** 1335–1339 (1335 used)

## What was done

### Investigation finding
F-09 reported the grant entity as absent. It exists in full at `backend/src/db/schema/portal-access/project-client-grants.ts` with complete CRUD at `backend/src/modules/portal/access/portal-access.controller.ts` and frontend hooks at `frontend/hooks/api/portal-access/grants.ts`. No grant-table migration was needed.

### Migration 1335
- Forward: `backend/migrations/1335_build_portal_publication_state.sql` — adds `portal_published_at timestamptz` to `build.projects` (nullable, matching `intake_published_at` convention). Includes precondition and post-check DO blocks. `lock_timeout = '5s'`.
- Rollback: `backend/migrations/1335_build_portal_publication_state_rollback.sql`
- Schema: `backend/src/db/schema/build/core.ts` updated with `portalPublishedAt` column.

**DEPLOY ORDERING RISK:** Migration 1335 adds `portal_published_at`. The management service reads and writes this column. Railway ships every backend push; Vercel deploys the frontend independently. Code referencing `portal_published_at` is **unsafe to deploy until migration 1335 is applied**. Apply the migration first, then deploy the backend, then the frontend.

### Backend
- `backend/src/modules/build/client-portal/dto/client-portal-management.schemas.ts` — publish/unpublish body schemas
- `backend/src/modules/build/client-portal/dto/client-portal-management-response.schemas.ts` — `portalSettingsSchema` and `portalPreviewSchema`
- `backend/src/modules/build/client-portal/client-portal-management.service.ts` — `getSettings`, `publishPortal`, `unpublishPortal`
- `backend/src/modules/build/client-portal/client-portal-management.controller.ts` — `GET /build/:projectId/client-portal/settings`, `POST /build/:projectId/client-portal/publish`, `POST /build/:projectId/client-portal/unpublish`, `GET /build/:projectId/client-portal/preview`; all guarded with `JwtAuthGuard + PermissionGuard + RequirePermission("build:clientvisibility:manage")`
- `backend/src/modules/build/client-portal/client-portal.service.ts` — added `getPortalPreview(u, projectId)` that fetches all `clientVisible=true` content without a grant lookup (management preview shows everything flagged visible)
- `backend/src/modules/build/client-portal/build-client-portal.module.ts` — registered `ClientPortalManagementController` and `ClientPortalManagementService`

### Frontend
- `frontend/hooks/api/build/client-portal-management-schema.ts` — `portalSettingsContract`, `portalPreviewContract`
- `frontend/hooks/api/build/client-portal-management.ts` — `usePortalSettings`, `usePublishPortal`, `useUnpublishPortal`, `usePortalPreview`; publish/unpublish use `useAuthorizedMutation("build:clientvisibility:manage")`, no optimistic mutations
- `frontend/lib/query-keys/build-work.ts` — added `clientPortal.settings` and `clientPortal.preview` key factories
- `frontend/features/build/client-portal/client-portal-management-page.tsx` — `ClientPortalManagementPage` with publication state banner (Switch + ConfirmDialog destructive for unpublish), grants tab (list from `useProjectClientGrants`), visibility tab, preview tab
- `frontend/app/(authenticated)/build/[projectId]/client-portal/page.tsx` — updated to render `ClientPortalManagementPage` instead of `ClientVisibilityPage`

### Tests
All pass:
- `frontend/features/build/client-portal/client-portal-management-page.test.tsx` — 17 tests (publication state, Switch checked/disabled states, publish flow, unpublish confirm path, grants empty/populated, error/loading state)
- `backend/src/modules/build/client-portal/client-portal-management.service.spec.ts` — 9 tests (getSettings null/published/not-found, publishPortal sets timestamp/not-found, unpublishPortal clears/not-found)
- `backend/src/modules/build/client-portal/client-portal-preview.spec.ts` — 3 tests (milestones predicate contains client_visible, tasks predicate contains client_visible, deleted_at in project predicate, NotFoundException when project missing, NEGATIVE: no grant lookup)

### Remaining items (not C3 scope)
- `_journal.json` entry for migration 1335 — orchestrator must add this (never hand-edit generated registry)
- `openapi.json` regeneration — new routes added; `pnpm openapi:gen` needed after migration applied
- `build:clientvisibility:manage` permission key presence in both catalogs — verify with `pnpm check:permission-keys`
- Keyboard shortcuts, screen-reader pass, 375px mobile check, production browser evidence — P1 gaps stated in the spec doc, out of C3 scope
