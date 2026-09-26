# Lane 7 — Requests for orchestrator

## 1. Route manifest registrations (build-route-manifest.ts)

File: `frontend/lib/build/build-route-manifest.ts` (request-only)

Add the following 9 new project-settings sub-routes to the manifest. Each route uses `enforceRouteAccess` in its route file (path listed below). The permission key each enforces matches the `/build/[projectId]/settings` prefix entry already in `route-access-extension-entries.ts` (`build:update`) **except** access and credentials which have their own keys.

| Manifest key | Route path | Route file | Permission |
|---|---|---|---|
| `build-project-settings-access` | `/build/[projectId]/settings/access` | `app/(authenticated)/build/[projectId]/settings/access/page.tsx` | `build:members:view` |
| `build-project-settings-agents` | `/build/[projectId]/settings/agents` | `app/(authenticated)/build/[projectId]/settings/agents/page.tsx` | `build:update` |
| `build-project-settings-agents-credentials` | `/build/[projectId]/settings/agents/credentials` | `app/(authenticated)/build/[projectId]/settings/agents/credentials/page.tsx` | `settings:api-tokens:read` |
| `build-project-settings-fields` | `/build/[projectId]/settings/fields` | `app/(authenticated)/build/[projectId]/settings/fields/page.tsx` | `build:update` |
| `build-project-settings-integrations` | `/build/[projectId]/settings/integrations` | `app/(authenticated)/build/[projectId]/settings/integrations/page.tsx` | `build:update` |
| `build-project-settings-iterations` | `/build/[projectId]/settings/iterations` | `app/(authenticated)/build/[projectId]/settings/iterations/page.tsx` | `build:update` |
| `build-project-settings-portal` | `/build/[projectId]/settings/portal` | `app/(authenticated)/build/[projectId]/settings/portal/page.tsx` | `build:clientvisibility:manage` |
| `build-project-settings-retention` | `/build/[projectId]/settings/retention` | `app/(authenticated)/build/[projectId]/settings/retention/page.tsx` | `build:update` |
| `build-project-settings-views` | `/build/[projectId]/settings/views` | `app/(authenticated)/build/[projectId]/settings/views/page.tsx` | `build:update` |

## 2. Nav catalog entries (build-project-catalog.ts)

File: `frontend/lib/build/nav/build-project-catalog.ts` (request-only)

Add nav entries for the following new settings sub-routes under the existing "Settings" group in the project nav. Each entry should mirror the existing `settings` entry pattern (icon from lucide-react, `requiredPermission` matching the permission above).

Routes to add: access, agents, agents/credentials, fields, integrations (project-level), iterations, portal, retention, views.

Note: automations, workflow, and integrations/webhooks routes already existed; verify they already have nav entries before adding duplicates.

## 3. route-access-extension-entries.ts

File: `frontend/lib/rbac/route-access/route-access-extension-entries.ts` (shared)

Add prefix-match entries for:
- `/build/[projectId]/settings/access` → `build:members:view`
- `/build/[projectId]/settings/agents/credentials` → `settings:api-tokens:read`
- `/build/[projectId]/settings/portal` → `build:clientvisibility:manage`

The existing `/build/[projectId]/settings` wildcard entry with `build:update` already covers agents, fields, integrations, iterations, retention, views, automations, and workflow.
