---
wave: 8
type: execution plan
status: DRAFT
date: 2026-07-26
author: AI-assisted planning pass
depends_on: Wave 7 backend contracts (pm_workspaces, pm_workspace_memberships, portal_memberships, project_client_grants) stable; Wave 5 RBAC correctness releases merged; Wave 3 Directory/Workforce seams merged
---

# Wave 8 — Administration + Portal UX: Execution Plan

> **Scope:** Frontend IA contract implementation (§7 of `docs/schema-change-plan.md`). Backend schema stays in previous waves. This wave touches only frontend files plus minimal backend permission-key additions where absent.
>
> **Hard constraint:** this is pure UI migration — no business logic moves to the frontend, no new backend routes beyond what §7.13 requires for portal isolation.
>
> **Collision warning (read first):** the user is actively editing frontend nav on the `refactoring-hrms` branch. The most recent commits are "fix(sidebar): rename duplicate 'Organization' nav group to 'Structure'" and "feat(access): per-module Access UI (§7.3)". This means the `sidebar-nav-items.ts` and `product-switcher-menu.tsx` files are hot. Steps 2, 3, 4, and 6 all touch those files and are at direct collision risk. **Do not start those steps while the user is mid-session on nav.**

---

## Pre-flight gate (must pass before any step begins)

| Gate | Check | Status |
|------|-------|--------|
| Wave 7 `pm_workspaces` table + API exists | `GET /product-management/workspaces` returns 200 for a PM-enabled org | verify |
| Wave 7 `portal_memberships` + `project_client_grants` backend stable | Portal audience guard exists + rejects internal JWT on `GET /portal/**` | verify |
| Wave 5 RBAC `settings:members:*` (or successor org-membership permission) defined in backend catalog | `backend/src/modules/rbac/permissions.constants.ts` contains `settings:members:view` | **LIKELY ABSENT** — check before Step 4 |
| `createOrganization` backend endpoint allows any authenticated user | `POST /organizations` has NO isOrgOwner guard | verify — current `workspace-switcher.tsx` already removed the isOrgOwner UI gate; backend must match |
| Existing build passes | `pnpm -C frontend build` green on current branch | verify |

---

## Step 1 — Organization switcher: open "Create organization" to all authenticated users

**Estimated effort:** 30 min
**Collision risk:** LOW — `workspace-switcher.tsx` not touched by recent nav commits

### What the current state is

`workspace-switcher.tsx` lines 102–113 and 141–150: the "Create organization" button in both dropdown and drawer layouts is gated on `isOrgOwner`. The component symbol is `WorkspaceSwitcher`; the dialog is `CreateWorkspaceDialog` (file: `features/workspace/create-workspace-dialog.tsx`).

The copy already reads "Create organization" (correct). The section header already reads "Organizations" (correct). `DrawerTitle` is "Organizations" (correct). No visible "Workspace" leak in copy.

### What changes

**File: `frontend/components/layout/header/workspace-switcher.tsx`**

- Remove the `isOrgOwner` check that gates the "Create organization" button in `WorkspaceSwitcherPanel` (both `layout === "dropdown"` block and the drawer block). The button must appear for every authenticated user.
- Keep the `isOrgOwner` prop on `WorkspaceSwitcherPanel` in place for now (it may be needed downstream for Owner-only actions added later); just stop using it as the gate for create.
- Add a `COLLISION NOTE` in-code comment explaining this was intentionally de-gated (remove the comment in Wave 9 cleanup).

**File: `frontend/components/layout/header/workspace-switcher.tsx` (symbol rename — deferred)**

- The exported symbol is `WorkspaceSwitcher`. Per §7.13 a "temporary `WorkspaceSwitcher` compatibility export is fine while imports migrate." Do NOT rename the symbol in this step — a symbol rename would touch every import site and collides with active nav work. Schedule for Step 9 (terminology pass).

**Backend pre-condition:** verify `POST /organizations` has no `isOrgOwner` guard. If it does, flag to the user before shipping this step — the UI and backend must match. The plan (§4) explicitly states "any authenticated User Account may create an Organization."

### Gate

- Dropdown + Drawer both show "Create organization" regardless of `isOrgOwner`.
- Submitting creates a new org and switches to it.
- No visible "Workspace" string in any user-facing copy or aria label.

---

## Step 2 — Module switcher: tile renames + section label

**Estimated effort:** 1 hour
**Collision risk:** HIGH — `sidebar-nav-items.ts` and `product-switcher-menu.tsx` were both touched in the two most recent commits. Check `git diff HEAD` before starting.

### What the current state is (verified from source)

`sidebar-nav-items.ts` line 2506:
```ts
{ key: "projects", label: "Product Management", href: "/projects", icon: Briefcase },
```
The "Projects → Product Management" tile rename is **already done**.

`sidebar-nav-items.ts` line 2519:
```ts
{ key: "administration", label: "Administration", href: "/organization", icon: Building2 },
```
The "Settings → Administration" tile rename is **already done**.

`product-switcher-menu.tsx` line 258:
```tsx
<p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-1">
  Modules
</p>
```
The section label **"Modules"** is already correct (not "Products").

`DrawerTitle` in `product-switcher-menu.tsx` line 458: `<DrawerTitle className="sr-only">Modules</DrawerTitle>` — correct.

Trigger aria-label line 417: `aria-label="Switch module"` — correct.

### What changes

All three visible renames from the §7 requirement are already in the codebase. This step is therefore:

1. **Audit only:** diff-check that no other place in the module switcher or sidebar still renders "Products" (the old section label) or "Settings" (the old tile label) or "Projects" (the old tile label) in visible/aria copy.
2. **Fix the HRMS description:** `PRODUCT_DESCRIPTIONS.hrms` at line 2536 reads `"People & payroll"`. Per §7.13 HRMS should drop "payroll" from its description since Payroll is a separate module tile. Change to `"People & workforce"`.
3. **Accent color for `projects` key:** `MODULE_ACCENTS.projects` at lines 2576–2581 is `violet-*`. Per CLAUDE.md living rule 2026-07-11 ("Blue replaces purple") this should be `blue-500`/`blue-600`. Change to blue family. But note this is a design-system change, not a terminology change — confirm with user before making it, as §14 says "Blue replaces purple" but the violet accent may be intentional for differentiation.
4. No structural changes to `ProductGrid` or the tile component.

### Gate

- Module switcher section label is "Modules" everywhere (visible + aria).
- Tile for `projects` key reads "Product Management"; tile for `administration` key reads "Administration".
- No tile reads "Settings" or "Projects" in visible copy.
- Build + types pass.

---

## Step 3 — Administration sidebar IA: consolidate nav groups under `administration` product key

**Estimated effort:** 2–3 hours
**Collision risk:** HIGH — `sidebar-nav-items.ts` is actively edited. The recent commit "fix(sidebar): rename duplicate 'Organization' nav group to 'Structure'" directly changed this file.

### What the current state is (verified)

`PRODUCT_NAV_GROUP_LABELS["administration"]` at lines 2648–2658 maps to:
```
"Organization", "People", "Directory", "Access Control", "Structure", "Subscription", "Platform", "Security", "Developer"
```

The nav groups themselves:
- `"Organization"` (line 2140): one route `/settings/organization`, gated `settings:manage`
- `"Structure"` (line 2152): `module: "hrms"` — **incorrectly HRMS-gated** per §7.2 ("Structure available when Workforce/Payroll/structure is used, not gated on HRMS alone")
- `"People"` (line 2208): all routes gated `hr:employees:view` — **wrong permission** per §7.2 (must use org-membership permission, not HR permission)
- `"Directory"` (line 2239): uses `directory:people:view`, `workforce:workers:view`, `party:parties:view`, `projects:portal:view` — correct domain permissions, but Client Access (`/client-access`) will move to PM module in a later step
- `"Access Control"` (line 2275): maps to `/settings/roles`, `/settings/permissions`, `/settings/rbac`, `/settings/delegations` — correct; gated `settings:rbac:manage`
- `"Subscription"`, `"Platform"`, `"Security"`, `"Developer"` — correctly placed

### What changes

**File: `frontend/components/layout/sidebar/sidebar-nav-items.ts`**

Change 3a — Remove `module: "hrms"` from the "Structure" group (line 2153). Structure must be available when Payroll or workforce structure is used without HRMS. Gate it on `settings:view` only (already the route-level permission). Update `isModuleEnabled` logic accordingly if the Structure group checks `module: "hrms"`.

Change 3b — Regate the "People" group and all its routes from `hr:employees:view` to the org-membership permission. Per the plan this is `settings:members:view` (or the successor key — verify the key exists in `permissions.constants.ts` first; if absent, add it in a backend step before this frontend step). The routes affected:
- `"Users"` at `/users` — change `requiredPermission: "hr:employees:view"` → `"settings:members:view"`
- `"Invitations"` at `/users/invitations` — same change
- `"Suspended Users"` — same change
- `"Archived Users"` — same change
- Group-level `requiredPermission` — same change

Change 3c — Rename the "People" group label to **"People"** (already correct label). Add a note that the group's routes must be updated to reflect the four journeys (Directory, Membership, Worker, Portal Contact) — full journey split is Step 5. This step only fixes the RBAC gate.

Change 3d — The "Access Control" group is correctly named. Per §7.2 the canonical Administration IA calls it **"Access"** (not "Access Control"). Rename the group `label` from `"Access Control"` → `"Access"` and update `PRODUCT_NAV_GROUP_LABELS["administration"]` to match.

Change 3e — Update `PRODUCT_NAV_GROUP_LABELS["administration"]` to reflect the renamed group label: replace `"Access Control"` with `"Access"`.

**File: `frontend/app/(authenticated)/users/page.tsx`**

Change the server-side `requirePermission` call at line 11 from `"hr:employees:view"` to `"settings:members:view"`. Same change in `users/invitations/page.tsx`, `users/suspended/page.tsx`, `users/archived/page.tsx`.

### Gate

- Structure nav group appears for a Payroll-only org (no HRMS) — requires `settings:view`.
- People nav group appears for a user with `settings:members:view` but no `hr:employees:*` permission.
- Access group appears in Administration sidebar for Owner/OrgAdmin; absent for functional roles without `settings:rbac:manage`.
- Build + lint + types pass.

---

## Step 4 — People vs Membership split: four-journey UI

**Estimated effort:** 3–4 hours
**Collision risk:** MEDIUM — touches `/users/**` pages and features, not the nav item file directly after Step 3 lands

### What the current state is

`/users` page: renders `UsersPage` from `features/users/users-page` (not read in full, but gated on `hr:employees:view`).
`/users/invitations`, `/users/suspended`, `/users/archived` exist as separate pages.

There is no separate `/directory`, `/directory/workers`, or Person-detail surface under Administration. The "Directory" nav group lives separately and points to `/directory` (separate from `/users`).

### What changes

This step does NOT create all four journey surfaces from scratch — that is a multi-week feature build. This step:

4a — Fixes the RBAC gate (done in Step 3; Step 4 focuses on UI).

4b — Adds a tab structure to the People section (or a sub-nav within `/users`) that makes the four journeys **visually distinct** per §7.4:
- Tab/segment "Members" → existing `/users` list (Organization Memberships / login-capable members)
- Tab/segment "Invitations" → `/users/invitations`
- Tab/segment "Suspended / Archived" → `/users/suspended` + `/users/archived` (may collapse into one filtered view)
- Link out to "Organization People" (Directory) → `/directory` (separate nav entry; don't embed)
- Link out to "Workers" → `/directory/workers`
- Note in empty state: "Portal contacts are managed under Product Management → Client Access" (once portal isolation lands in Step 7)

4c — Remove any `hr:employees:*` language from copy in `/users/**` pages. Labels: "Member" not "Employee"; "Organization member" not "HR employee"; "People" not "Employees" in headings.

4d — The Person detail tabs (Profile | Membership | Worker/Engagements | Module assignments) as described in §7.2 are a new component. Scaffold the shell with `[personId]` dynamic route at `/users/[personId]` with four named tabs. Tab content may be stub/placeholder in Wave 8 — the goal is the structural layout and correct RBAC gates per tab (Membership tab = `settings:members:view`; Worker/Engagements tab = `workforce:workers:view` if module exists; Module assignments tab = `settings:manage`).

**Files touched:**
- `frontend/app/(authenticated)/users/page.tsx` — update `requirePermission`
- `frontend/app/(authenticated)/users/[personId]/page.tsx` — NEW stub (minimal, correct gates)
- `frontend/features/users/users-page.tsx` — add tab shell
- `frontend/features/users/components/` — membership-tab, invitations-tab stubs
- `frontend/lib/rbac/permissions/types.ts` — add `"settings:members:view"` to `PermissionKey` union if backend lands it

### Gate

- `/users` renders for a user with `settings:members:view` and no `hr:*` permissions.
- "Create a person" does not create a membership; invite creates a membership and may link/create a person.
- No visible "Employee" label in the People/Members surface (except inside HRMS module where it is correct).
- Person detail page exists with four tab shells.
- Build + types pass.

---

## Step 5 — Product Management routes + alias matrix

**Estimated effort:** 2–3 hours
**Collision risk:** MEDIUM — touches App Router route structure under `/projects`; no recent commit to those files

### What the current state is

All PM routes are under `frontend/app/(authenticated)/projects/**`. The sidebar maps `projects` ProductKey to `/projects`. `getProductFromPathname` maps `/projects/**` to `"projects"` ProductKey.

`sidebar-nav-items.ts`: the `projects` nav group has routes starting with `/projects/**`. The `"More"` group uses `projects:workspaces:view` and references `/projects/pm-workspaces`. `PRODUCT_DEFINITIONS` for `projects` key points `href` to `/projects`.

### What changes

5a — **Route aliases (App Router):** create redirect files at the canonical PM paths pointing to the compatibility `/projects` paths. Do NOT move actual page files yet — the alias matrix requires both to work simultaneously:
- `frontend/app/(authenticated)/product-management/page.tsx` → redirect to `/projects`
- `frontend/app/(authenticated)/product-management/workspaces/[pmWorkspaceId]/page.tsx` → redirect to `/projects` (PM workspace context is not yet surfaced as a route segment; stub redirect)
- All nested redirects per the route alias matrix from §7.11

5b — **`getProductFromPathname` update:** add `/product-management/**` as a match for `"projects"` ProductKey (so the module switcher tile highlights correctly when navigating via canonical routes).
```ts
if (pathname.startsWith("/product-management") || pathname.startsWith("/projects")) return "projects";
```

5c — **PM Workspace context chip:** when the `projects` product is active and Wave 7 `pm_workspaces` API is stable, render a context chip in the PM sidebar showing the active PM Workspace name. For orgs with exactly one workspace: static chip with the workspace name. For multiple: a PM-local switcher (dropdown, not the global module switcher). Gate the chip on `projects:workspaces:view` + module enabled. This is the "PM Workspace context" element from §7.3.

5d — **PRODUCT_DEFINITIONS `href` update:** change `href` for `projects` key from `/projects` to `/product-management` once the redirect chain is confirmed working. This makes the tile navigate to the canonical URL. Keep `/projects` working via redirect.

5e — **Sidebar nav groups for PM:** the `"Projects"` nav group label at line 1838 should be renamed to `"Product Management"` in the sidebar (within the PM module). The `"Teams"` route at line 1881 should be renamed `"Delivery Teams"` per §7.3 and §7.9 ("Ban bare 'Teams' in Projects"). The `"More"` group's `"PM Workspaces"` label is already correct.

**Files touched:**
- `frontend/app/(authenticated)/product-management/` — NEW directory with redirect stubs
- `frontend/app/(authenticated)/product-management/workspaces/[pmWorkspaceId]/` — NEW directory with redirect stubs
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` — `getProductFromPathname`, group label rename, "Teams" → "Delivery Teams"
- `frontend/features/product-management/components/pm-workspace-chip.tsx` — NEW component

### Route alias matrix (for reference)

| Legacy route | Canonical route | Preservation | Audience guard |
|---|---|---|---|
| `/projects` | `/product-management` | redirect | INTERNAL only |
| `/projects/[projectId]` | `/product-management/workspaces/[pmWorkspaceId]/projects/[projectId]` | redirect with pmWorkspaceId from session | INTERNAL only |
| `/projects/portal` | `/portal` | isolation — NOT a redirect (Step 7) | PORTAL audience only |
| `/projects/portal/[projectId]` | `/portal/projects/[projectId]` | isolation | PORTAL audience only |
| `/projects/pm-workspaces` | `/product-management/workspaces` | redirect | INTERNAL only |
| `/projects/managed-products` | `/product-management/managed-products` | redirect | INTERNAL only |

Portal routes are NOT simple redirects — they require a layout swap (Step 7). Do not add a redirect from `/projects/portal` to `/portal` until the portal layout is built and the portal audience guard is in place.

### Gate

- Navigating to `/product-management` works and shows the PM sidebar.
- Navigating to `/projects` still works (no regression).
- The module switcher tile highlights correctly on both paths.
- "Delivery Teams" appears instead of "Teams" in the PM sidebar.
- PM Workspace chip renders for an org with a default workspace.
- Build + types pass.

---

## Step 6 — Terminology pass: strip "Workspace" from org-setup / onboarding copy

**Estimated effort:** 1–2 hours
**Collision risk:** LOW for the files named; MEDIUM for `sidebar-nav-items.ts` if touched (do after Steps 2–3 settle)

### What to audit

Search for "workspace" (case-insensitive) in:
- `frontend/app/(unauthenticated)/org-setup/**` — onboarding wizard copy
- `frontend/features/workspace/**` — `CreateWorkspaceDialog` dialog title currently reads "Create organization" (correct); check for any other workspace references
- `frontend/app/(authenticated)/(onboarding)/**` — any onboarding loading/welcome copy
- Toast messages from `useSwitchOrg` and `useCreateOrganization` hooks
- `frontend/components/layout/header/workspace-switcher.tsx` — aria labels, DrawerTitle (already verified correct)
- Empty state strings in Administration pages

Per §7.9 edge case "Org-setup: 'Birth your organization' / Organization preview — never Workspace."

### What changes

6a — Any visible string "Create workspace", "Your workspace", "workspace name", "workspace settings", "workspace setup" outside of PM context → replace with the Organization equivalent.

6b — Any aria label containing "workspace" on the Organization switcher → verify already replaced (check `aria-label` on the trigger button at line 229 of `workspace-switcher.tsx` — currently reads `workspaceName` which may display the org name, not the word "workspace"; confirm).

6c — The component file `features/workspace/create-workspace-dialog.tsx`: the file and component name say "Workspace" (legacy code symbol). Per §7.13 the compatibility symbol is acceptable in code; do NOT rename the file/component in this step (would cause widespread import churn colliding with active nav work). Add a `// TODO(Wave9): rename to CreateOrganizationDialog` comment.

6d — The variable `workspaceName` in `workspace-switcher.tsx` at line 213 (`const workspaceName = activeOrg?.name ?? "Organization"`) — this is a code variable, not visible copy. Leave as-is per compatibility symbol policy.

6e — Qualify all bare "Team" occurrences in copy/aria strings to either "Delivery Team" (PM context) or "Organization Team" / "Organization Unit" (Administration/Workforce context). In sidebar nav labels this was started in Step 5 (Teams → Delivery Teams).

**Files touched:**
- `frontend/app/(unauthenticated)/org-setup/**/*.tsx` (copy strings only)
- `frontend/features/workspace/create-workspace-dialog.tsx` (TODO comment only)
- Any onboarding copy files identified by the grep

### Gate

- `grep -ri "workspace" frontend/app/(unauthenticated)/org-setup` returns zero user-visible strings (code symbols OK).
- `grep -ri "workspace" frontend/app/(authenticated)/(onboarding)` returns zero user-visible strings.
- Bare "Team" does not appear as a nav label or heading outside HRMS (which has its own context).
- Build passes.

---

## Step 7 — Client portal isolation: new `/portal/**` route tree with audience layout

**This is the biggest item. Estimated effort: 1.5–2 weeks. 0% done today.**
**Collision risk:** LOW for route creation (new files); HIGH for anything that touches `app/(authenticated)/projects/portal/**` (which currently lives under DashboardShell)

### Why this is the P0 security item

Currently `frontend/app/(authenticated)/projects/portal/page.tsx` renders `PortalListPage` inside the `DashboardShell`. Portal clients navigating there see the internal module switcher, Administration nav, Organization switcher, and the full internal chrome. This is both a UX failure and a security posture failure — the portal audience is never separated from the internal audience at the layout level.

The backend currently has no portal-scoped JWT audience guard. `project_client_grants` exist in the schema but the portal session is just a regular internal session viewing filtered data, not a separate audience. This step must coordinate with a backend task.

### Substeps

**7a — Backend pre-condition (block on this before any frontend work)**

The backend must implement:
- Portal auth: a separate `/portal/auth/**` endpoint that issues a JWT with `audience: "CLIENT_PORTAL"` (distinct from `audience: "INTERNAL"`).
- A `PortalGuard` that rejects any token with `audience !== "CLIENT_PORTAL"` on `/portal/**` backend routes.
- An `InternalGuard` addition: reject any token with `audience === "CLIENT_PORTAL"` on all `/product-management/**` and `/projects/**` internal backend routes.
- `GET /portal/grants` — returns the authenticated portal membership's `project_client_grants` (field-allowlist applied).
- `GET /portal/projects/:projectId` — returns portal-scoped project data per the grant's field allowlist.

Until 7a is done, Steps 7b–7f may be built behind a feature flag but must not be shipped.

**7b — New route group + audience layout**

Create `frontend/app/(portal)/` route group with its own `layout.tsx` that:
- Does NOT render `DashboardShell`, module switcher, organization switcher, or Administration.
- Renders a minimal portal chrome: org/client branding, granted projects list, portal account/security, sign out.
- Validates `audience === "CLIENT_PORTAL"` from the session at layout level; redirects to `/portal/login` if not.

Routes:
```
frontend/app/(portal)/
  layout.tsx           — portal audience shell (no DashboardShell)
  login/page.tsx       — portal sign-in (separate from internal auth)
  projects/page.tsx    — list of granted projects
  projects/[projectId]/page.tsx — portal project detail (field allowlist)
```

**7c — Portal navigation**

`frontend/components/layout/portal/portal-shell.tsx` — NEW: org logo/name + "My Projects" nav + portal account dropdown + sign out. No module switcher, no Administration link, no internal PM nav.

Mobile: separate bottom nav showing granted projects only. No staff FAB. No module grid.

**7d — Retire `/projects/portal` from DashboardShell**

Once 7b is shipped and confirmed:
- `frontend/app/(authenticated)/projects/portal/page.tsx` → replace with a redirect to `/portal` for portal principals (detect by session audience) or a 403 for internal users who hit the URL.
- `frontend/app/(authenticated)/projects/portal/[projectId]/page.tsx` → same redirect/deny.
- Remove portal routes from the `administration` `PRODUCT_NAV_GROUP_LABELS` or any Administration nav entry that points into `/projects/portal`.
- Remove `"projects:portal:view"` from the "Directory" nav group's `Client Access` route (that internal management route stays in PM; the portal UI itself moves out).

**7e — Query key isolation**

Portal TanStack Query hooks must use a separate `audience: "PORTAL"` dimension in their keys so internal and portal caches never share. See Step 8 for the full query-key plan.

**7f — Portal invite flow**

`POST /portal/invitations` → send portal invite (backend Wave 2+ already has portal_invitations table). Accept link lands on `/portal/accept?token=...` in the portal shell (not the internal shell). Frontend: `frontend/app/(portal)/accept/page.tsx`.

**Files touched:**
- `frontend/app/(portal)/` — entirely NEW route group
- `frontend/app/(portal)/layout.tsx` — NEW portal audience shell
- `frontend/app/(portal)/login/page.tsx` — NEW
- `frontend/app/(portal)/projects/page.tsx` — NEW
- `frontend/app/(portal)/projects/[projectId]/page.tsx` — NEW
- `frontend/app/(portal)/accept/page.tsx` — NEW
- `frontend/components/layout/portal/portal-shell.tsx` — NEW
- `frontend/app/(authenticated)/projects/portal/page.tsx` — RETIRE (redirect/deny)
- `frontend/app/(authenticated)/projects/portal/[projectId]/page.tsx` — RETIRE (redirect/deny)
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` — remove portal routes from internal nav after retirement

### Gate (audience isolation acceptance test)

- Navigating to `/portal/**` as an internal-only session → 403/redirect to portal login.
- Navigating to `/product-management/**` with a portal JWT → backend 403 (audience guard).
- Portal client sees: granted projects list, project detail (field allowlist only), portal account, sign out.
- Portal client does NOT see: module switcher, organization switcher, Administration nav, or any internal PM sidebar.
- `getProductFromPathname("/portal/projects/abc")` returns `undefined` or a new `"portal"` key — the portal shell must not highlight any internal module tile.
- Build + types pass.

---

## Step 8 — Query keys: add organizationId + audience + pmWorkspaceId dimensions

**Estimated effort:** 2–3 hours
**Collision risk:** LOW — `query-keys.ts` not touched by recent commits; but every hook that uses these keys needs an update

### What the current state is

`frontend/lib/query-keys.ts` uses `["streamlineos", domain, ...]` as the base. No `organizationId`, `audience`, or `pmWorkspaceId` dimension exists. The plan (§7.13) requires: "every query/mutation key includes `organizationId` + active membership/access version + audience (+ `pmWorkspaceId` for PM)."

### What changes

8a — Add a `sessionDimensions` helper that returns `{ organizationId, audience, accessVersion }` from the active session. Wire it into the query base.

```ts
// lib/query-keys.ts
export function sessionSlot(orgId: string, audience: "INTERNAL" | "PORTAL", accessVersion?: number) {
  return [orgId, audience, accessVersion ?? 0] as const;
}
```

8b — Update all Administration-related query keys to include `organizationId`:
```ts
members: (orgId: string, params?: Record<string, unknown>) =>
  [...base, "org", orgId, "members", params] as const,
invitations: (orgId: string) =>
  [...base, "org", orgId, "invitations"] as const,
```

8c — Add PM-scoped keys with `pmWorkspaceId`:
```ts
pmWorkspaces: (orgId: string) => [...base, "pm", orgId, "workspaces"] as const,
pmWorkspace: (orgId: string, pmWorkspaceId: string) =>
  [...base, "pm", orgId, "workspaces", pmWorkspaceId] as const,
pmProjects: (orgId: string, pmWorkspaceId: string, params?: Record<string, unknown>) =>
  [...base, "pm", orgId, "workspaces", pmWorkspaceId, "projects", params] as const,
```

8d — Add portal-scoped keys with `audience: "PORTAL"`:
```ts
portalGrants: (orgId: string, portalMembershipId: string) =>
  [...base, "portal", orgId, portalMembershipId, "grants"] as const,
portalProject: (orgId: string, portalMembershipId: string, projectId: string) =>
  [...base, "portal", orgId, portalMembershipId, "project", projectId] as const,
```

8e — On org/workspace/audience/access-version switch, call `queryClient.removeQueries({ queryKey: [oldOrgId] })` (or the appropriate stale prefix) before the new context activates, so stale data never leaks across orgs or audiences.

**Files touched:**
- `frontend/lib/query-keys.ts`
- Hooks that consume the changed keys (grep for callers of the specific key factories being changed)

### Gate

- Two orgs' data never share a cache key (verified by switching orgs in devtools and checking no stale data appears).
- Internal and portal caches have distinct `audience` slots; clearing one never clears the other.
- `pmWorkspaceId` dimension present in all PM query keys.
- Build + types pass.

---

## Step 9 — Terminology pass: code symbol deferred renames

**Estimated effort:** 2–3 hours
**Collision risk:** LOW if scheduled AFTER the active nav editing session closes; HIGH if done concurrently

This step schedules the compatibility symbol renames that were deferred to avoid collisions during active development:

9a — Rename `WorkspaceSwitcher` symbol to `OrganizationSwitcher`. Update all import sites. Keep a `WorkspaceSwitcher` re-export alias in the same file, marked `@deprecated`, until Wave 9 contract removal.

9b — Rename `CreateWorkspaceDialog` to `CreateOrganizationDialog`. Update import sites.

9c — Rename file `features/workspace/create-workspace-dialog.tsx` to `features/organization/create-organization-dialog.tsx`. Update imports.

9d — Rename the `workspaceName` local variable in `WorkspaceSwitcher` to `organizationName`.

9e — The `WorkspaceSwitcherPanel` inner component → `OrganizationSwitcherPanel`.

9f — Verify `grep -ri "workspace" frontend/` after renames: any remaining hits must be either (a) PM Workspace context (correct) or (b) code comments documenting the compatibility migration.

**Files touched:**
- `frontend/components/layout/header/workspace-switcher.tsx` (symbol renames, deprecation export)
- All files that import `WorkspaceSwitcher` — grep to find all callers
- `frontend/features/workspace/create-workspace-dialog.tsx` → rename + move
- All files importing `CreateWorkspaceDialog`

### Gate

- `grep -n "WorkspaceSwitcher" frontend/` returns only the deprecated re-export and the comment.
- `grep -n "CreateWorkspaceDialog" frontend/` returns only the deprecated re-export and the comment.
- No user-visible copy reads "workspace" outside PM context.
- Build + lint + types pass.

---

## Step 10 — Acceptance test sweep

**Estimated effort:** half a day
**Collision risk:** NONE (read-only verification)

Run through every acceptance test from §7.13, against a local dev environment with backend from the current branch. Record pass/fail for each:

| Acceptance test | Status |
|---|---|
| Multi-Organization member switches Organization | |
| Member vs Owner/Org Admin opens Modules switcher | |
| Administration nav for non-HRMS Organization | |
| Person / membership / worker / portal contact mgmt | |
| Access visibility & escalation resistance | |
| Product Management hierarchy | |
| Module lifecycle & empty states | |
| Internal-to-portal boundary | |
| Alias preservation | |
| Accessibility & mobile smoke | |

Any failing test blocks the wave from being marked done.

---

## Dependency graph and execution order

```
Step 1 (Organization switcher gate) — independent, start anytime
Step 2 (Module switcher renames) — verify already done; minimal code change; wait for nav session quiet
Step 3 (Administration IA / nav groups) — depends on: permission key confirmed in backend; wait for nav session quiet
Step 4 (People vs Membership) — depends on: Step 3 landed
Step 5 (PM routes + alias matrix) — depends on: Wave 7 pm_workspaces API stable; can start concurrently with Step 3 if on a separate worktree
Step 6 (Terminology pass) — independent of others; safe to do anytime
Step 7 (Portal isolation) — depends on: backend portal audience guard (7a); is the longest item; should start in parallel with Steps 3–5 in a separate worktree
Step 8 (Query keys) — depends on: Step 7 portal audience defined (for portal keys); can do org/PM dimensions earlier
Step 9 (Symbol renames) — depends on: all import-touching steps settled; schedule LAST before this wave closes
Step 10 (Acceptance tests) — depends on: all steps done
```

---

## Collision risk summary

| Step | File(s) at risk | Risk level | Mitigation |
|---|---|---|---|
| 2 | `sidebar-nav-items.ts`, `product-switcher-menu.tsx` | HIGH | Check `git status` before starting; verify renames already done (they are) |
| 3 | `sidebar-nav-items.ts` | HIGH | Merge recent nav commits first; start this step on a clean pull |
| 4 | `features/users/users-page.tsx` | MEDIUM | Not recently edited; lower risk |
| 5 | `sidebar-nav-items.ts` (Teams rename) | MEDIUM | Bundle with Step 3 if on same file-editing session |
| 6 | `features/workspace/create-workspace-dialog.tsx` | LOW | Comment-only change; safe |
| 7 | `app/(authenticated)/projects/portal/**` | LOW (new files) / HIGH (retirement of existing portal files) | Do retirement of existing files only after portal layout is live and tested |
| 9 | `workspace-switcher.tsx` + all import sites | HIGH (widespread) | Do this last; use a search-replace with types check |

---

## What is NOT in Wave 8

The following are Wave 9 (contract/retirement) items, not Wave 8:

- Removing the `WorkspaceSwitcher` compatibility export after import migration.
- Removing `/projects` route group (keep as alias indefinitely until telemetry zero).
- Removing `hr:employees:*` from `PermissionKey` union (backend first).
- Forcing `ENABLE ROW LEVEL SECURITY` on portal tables (Wave 9/10).
- Native UUID conversion of any ID column.
- Dropping `users.role` global role column.
- Production deployment of the portal audience JWT (Wave 9 hardens the security surface).
