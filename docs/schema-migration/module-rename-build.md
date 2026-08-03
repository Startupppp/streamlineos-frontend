---
type: module rename map — projects → Build (authoritative execution spec)
status: LIVING
date: 2026-07-27
decision: user (Aditya), 2026-07-27 — big-bang rename, module named "Build" (one word, covers both product + project management)
---

# Module rename: `projects` → **Build**

> **Why "Build":** the module handles BOTH project management (delivery: projects, tickets,
> sprints, QA, backlog) AND product management (strategy: managed products, roadmap, OKRs,
> feedback, changelog). "Build" is the single umbrella word for both. This OVERRIDES the
> earlier redesign-doc label "Product Management" (`schema-change-plan.md` §1) per the user's
> explicit 2026-07-27 decision.
>
> **Entities stay distinct + correctly named.** `projects` is a delivery record; `managed_products`
> is a strategic product — they are DIFFERENT tables and both keep their names. Only the MODULE
> namespace (folders, route prefix, RBAC key segment, module-enablement key, `ProductKey`) is renamed.

## Identifier mapping (the whole rename in one table)

| Kind | From | To |
|---|---|---|
| Sidebar/module label | "Product Management" / "Projects" | **"Build"** |
| `ProductKey` literal | `"projects"` | `"build"` |
| Module-enablement key | `PROJECTS` / `projects` | `BUILD` / `build` |
| Route namespace | `/projects` (+ `/projects/:projectId/...`) | `/build` (+ `/build/:projectId/...`); keep `/projects`→`/build` redirect alias |
| RBAC key segment (71 keys) | `projects:*` | `build:*` |
| Backend schema folder | `src/db/schema/projects/` | `src/db/schema/build/` |
| Backend schema barrel | `src/db/schema/projects.ts` | `src/db/schema/build.ts` |
| Backend flat file | `src/db/schema/project-teams.ts` | `src/db/schema/build/teams.ts` |
| Backend module folders | `src/modules/projects`, `src/modules/projects-*` | `src/modules/build`, `src/modules/build-*` |
| Frontend routes | `app/(authenticated)/projects/` | `app/(authenticated)/build/` |
| Frontend hooks | `hooks/api/projects/`, `hooks/api/projects.ts` | `hooks/api/build/`, `hooks/api/build.ts` |
| Frontend features | `features/projects/` | `features/build/` |
| Frontend API paths (apiClient) | `"/projects..."` / `` `/projects...` `` | `"/build..."` / `` `/build...` `` |

**Physical DB TABLE names are NOT renamed** (`projects`, `tickets`, `sprints`, `cycles`, `bugs`,
`managed_products`, `project_teams`, `project_members`, `project_portfolios`, `project_client_grants`,
etc. all stay — they are entity names, not the module name). Enum `project_status` etc. stay.

## Scoped, safe transformations (deterministic — never blanket-replace the word "project")

**Backend (`streamlineos-api`):**
1. `mv src/db/schema/projects src/db/schema/build`; `mv src/db/schema/projects.ts src/db/schema/build.ts`; move `project-teams.ts` content into `build/teams.ts`.
2. `mv src/modules/projects src/modules/build`; each `src/modules/projects-<x>` → `src/modules/build-<x>`.
3. Import path segments only: `db/schema/projects` → `db/schema/build`; `modules/projects` → `modules/build` (and `projects-` → `build-` in module paths).
4. RBAC keys: replace quoted prefix `"projects:` → `"build:` and `'projects:` → `'build:` (quote-anchored — a `projects:` inside quotes is an RBAC key). Update `permissions.constants.ts` catalog + `ROLE_DEFAULT_PERMISSIONS` + every `@RequirePermission("projects:…")`.
5. Controllers: `@Controller("projects…` → `@Controller("build…`. Register `/projects` as an additional path (alias) on the same controllers so old clients keep working.
6. Module-enablement key `PROJECTS`→`BUILD` in the module registry/entitlements + `MODULE_KEY_MAP`.
7. Keep every exported Drizzle symbol name IDENTICAL (only file/folder paths + the barrel move).

**Frontend:**
1. `mv app/(authenticated)/projects app/(authenticated)/build`; add `app/(authenticated)/projects/[[...rest]]` (or a `/projects` redirect in `proxy.ts`) → `/build`.
2. `mv hooks/api/projects hooks/api/build`; `mv hooks/api/projects.ts hooks/api/build.ts`; `mv features/projects features/build`.
3. Import path segments: `hooks/api/projects` → `hooks/api/build`; `features/projects` → `features/build`.
4. apiClient path strings: `"/projects` → `"/build` and `` `/projects `` → `` `/build `` (URL-anchored).
5. RBAC gates: `useCan("projects:` → `useCan("build:`; `<Can permission="projects:` → `"build:`; quote-anchored `"projects:`→`"build:`.
6. Nav registry (`components/layout/sidebar/sidebar-nav-items.ts`): `ProductKey` `"projects"`→`"build"`, `PRODUCT_DEFINITIONS` key + href, `MODULE_KEY_MAP`, `getProductFromPathname` (`/projects`→`/build`), nav-group `module` + hrefs, label → "Build".
7. Hardcoded refs: `command-palette.tsx`, `quick-create-groups.ts`, `dashboard use-dashboard-stat-cards.ts`, `org-setup/lib/constants.ts`, `landing/data/apps.ts` — `/projects`→`/build`, key `"projects"`→`"build"`.

## Operator data migrations (author now; operator runs — DB objects change, not just code)
1. `UPDATE role_permission_grants SET permission = 'build:' || substr(permission, 9) WHERE permission LIKE 'projects:%';`
2. `UPDATE org_modules SET module_key = 'build' WHERE module_key = 'projects';` (match actual column/format).
3. Any other stored module-key references (`user_module_access`, module-setup checklists) `projects`→`build`.
4. `bumpPermissionsVersion` for all orgs after (1)/(3).

## Other misnamed modules (same pass, folder/symbol level)
| From | To | Notes |
|---|---|---|
| `schema/signos/` | `schema/e-sign/` + backend `modules/signos`→`modules/e-sign`, frontend `features/sign` ok, hooks `sign` ok | tables stay `sign_*`; route `/sign` stays |
| `feedbucket.ts` (schema) | `build/feedback.ts` | in-app feedback = Build sub-feature; tables stay `feedbucket_*` |
| `crm/billing.ts` | `crm/invoicing.ts` | avoid collision with platform `billing.ts` |
| flat schema files | `common/` + domain folders | per `wave-4-schema-folder-reorg-map.md` (enums/auth/organization/access/shared/…) |

## Verification (Definition of Done)
- Backend: `pnpm -C backend typecheck` + `lint` green; `grep -r "projects:" src` finds no RBAC keys; no `db/schema/projects` or `modules/projects` import paths remain.
- Frontend: `pnpm -C frontend typecheck` + `lint` + `build` green; no `hooks/api/projects` / `features/projects` import paths; no `useCan("projects:` gates; `/projects` only as the redirect alias.
- Both repos: exported Drizzle symbols unchanged; physical table names unchanged.
