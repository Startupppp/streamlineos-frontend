# ROUTE1 — Route Ownership Violations Report

**Date:** 2026-08-30
**Lane:** ROUTE1
**Violations addressed:** 5 (4 resolved, 1 intentionally deferred with justification)

---

## Violation 1: `/crm/calendar`

**What it was:** `app/(authenticated)/crm/calendar/page.tsx` — a CRM-specific calendar page, violating the single unified calendar rule (root CLAUDE.md §8). Found to already be a redirect to `/calendar` (`redirect("/calendar")`).

**What was done:** Deleted the file and its directory. No legacy redirect left. Since it was already a redirect, the canonical `/calendar` already served the content. Grep confirmed no `href`, `push`, or `replace` references to `/crm/calendar` in any nav config, sidebar, or component.

**Files deleted:**
- `frontend/app/(authenticated)/crm/calendar/page.tsx`

**Link updates:** None required — no nav config or component referenced `/crm/calendar`.

**Grep proof (zero remaining references in `.ts/.tsx`):**
```
Pattern: /crm/calendar  →  No matches found
```

---

## Violation 2: `/payroll/me`

**What it was:** `app/(authenticated)/payroll/me/page.tsx` (plus `loading.tsx`, `error.tsx`) — employee self-service pay inside the payroll admin route tree. The canonical surface `/me/pay/page.tsx` already existed and imported the same `MyPayrollPageContent` from `@/features/payroll/me`. The duplicate used only `requireSession()` (weaker) while the canonical uses `requirePermission(["self:payroll", "self:payslips"])` (correct). Duplicate was the less-secure copy.

**What was done:** Deleted all three route files. Updated all three inbound route links from `/payroll/me` to `/me/pay`.

**Files deleted:**
- `frontend/app/(authenticated)/payroll/me/page.tsx`
- `frontend/app/(authenticated)/payroll/me/loading.tsx`
- `frontend/app/(authenticated)/payroll/me/error.tsx`

**Link updates:**
- `frontend/components/layout/sidebar/sidebar-nav-groups-payroll.ts` line 18: `href: "/payroll/me"` → `href: "/me/pay"`
- `frontend/features/dashboard/payroll-widget.tsx` line 28: `link={{ href: "/payroll/me", label: "View" }}` → `link={{ href: "/me/pay", label: "View" }}`
- `frontend/features/payroll/team/team-page.tsx` line 236: `href: "/payroll/me"` → `href: "/me/pay"`

**Note:** `/payroll/me/...` strings remaining in `hooks/api/payroll/ess.ts` and `contracts/openapi.json` are BACKEND API paths (e.g., `GET /payroll/me/overview`) — not frontend route links. Correct, untouched.

**Grep proof (zero remaining route href/push/replace references in `.ts/.tsx`):**
```
Pattern: href.*['"]/payroll/me['""]|push.*['"]/payroll/me['""]|replace.*['"]/payroll/me['""]  →  No matches found
```

---

## Violation 3: `/knowledge-base`

**What it was:** `app/(authenticated)/knowledge-base/page.tsx` — a legacy orphan redirecting to `/knowledge/chat`. The canonical KB is at `/knowledge/wiki/**`. Three config files kept the route alive (proxy protected-routes list, universal-routes access config, robots.txt disallow list).

**What was done:** Deleted the route file and cleaned up all three config references.

**Files deleted:**
- `frontend/app/(authenticated)/knowledge-base/page.tsx`

**Config updates:**
- `frontend/proxy.ts`: Removed `"/knowledge-base"` from `PROTECTED_ROUTES` array
- `frontend/lib/rbac/route-access/universal-routes.ts`: Removed the `/knowledge-base` entry (path + subtree + reason)
- `frontend/app/robots.ts`: Removed `"/knowledge-base/"` from the disallow list

**Grep proof (zero remaining route references in `.ts/.tsx`, excluding component file names):**
```
Pattern: /knowledge-base (in .ts/.tsx files)
Remaining: frontend/app/(authenticated)/knowledge/chat/page.tsx:3:
  import KnowledgeBasePage from "@/features/wiki/components/knowledge-base-page";
  → This is a component FILENAME import, not a route path string. Correct.
```

---

## Violation 4: `(portal)/projects` and `(portal)/projects/[projectId]`

**What it was:** `app/(portal)/projects/page.tsx` and `app/(portal)/projects/[projectId]/page.tsx` — the client-facing portal route group `(portal)` used `projects/` as its folder name, making the actual URL `/projects` (route groups don't add to the URL path). This collides with the `/projects` → `/build` redirect contract.

**Judgment call:** The `(portal)` group is a completely separate routing context for external clients (portal JWT, not session JWT). The internal Build module redirect `/projects` → `/build` operates in the `(authenticated)` routing context. However, the violation is real: having `/projects` as a root-level URL conflicts with the Build module naming contract. Additionally, the code ALREADY contained broken links — every inbound link in components (`portal-project-card.tsx`, `portal-header.tsx`, `accept-invitation/page.tsx`) used `/portal/projects` rather than `/projects`, proving the developer intended this to be at `/portal/projects` but the route group placement was wrong.

Since `/portal` is occupied by the authenticated internal portal admin (`app/(authenticated)/portal/`), and since the `[projectId]` dynamic segment there would shadow any `app/(portal)/portal/projects/` folder, the correct fix is to rename the segment to `client-portal` — giving unambiguous URLs `/client-portal` and `/client-portal/[projectId]`. This is clearly client-scoped and fixes the broken links simultaneously.

**What was done:** Created new route files at `client-portal/` with all internal links updated from `/portal/projects` to `/client-portal`. Deleted old `projects/` route files. Updated all six inbound link locations.

**Files created:**
- `frontend/app/(portal)/client-portal/page.tsx`
- `frontend/app/(portal)/client-portal/[projectId]/page.tsx`

**Files deleted:**
- `frontend/app/(portal)/projects/page.tsx`
- `frontend/app/(portal)/projects/[projectId]/page.tsx`

**Link updates (all `/portal/projects` → `/client-portal`):**
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` line 60: prefix `/portal/projects` → `/client-portal`
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` line 254: `pathname.startsWith("/portal/projects")` → `pathname.startsWith("/client-portal")`
- `frontend/app/(portal)/accept-invitation/page.tsx` line 116: `router.replace("/portal/projects")` → `router.replace("/client-portal")`
- `frontend/features/portal/components/portal-project-card.tsx` line 44: `` href={`/portal/projects/${project.id}`} `` → `` href={`/client-portal/${project.id}`} ``
- `frontend/features/portal/components/portal-header.tsx` line 14: `href="/portal/projects"` → `href="/client-portal"`
- `frontend/app/(portal)/client-portal/[projectId]/page.tsx`: all four back-links updated to `/client-portal`

**Note:** `frontend/hooks/api/build/client-portal.ts` references `/build/portal/projects` — these are BACKEND API paths, not frontend route strings. Untouched.

**Grep proof (zero remaining `/portal/projects` frontend route references in `.ts/.tsx`):**
```
Pattern: portal/projects (in .ts/.tsx files)
Remaining matches (all backend API paths, not frontend routes):
  frontend/hooks/api/build/client-portal.ts:19:  apiClient.get<...>("/build/portal/projects")
  frontend/hooks/api/build/client-portal.ts:30:  apiClient.get<...>(`/build/portal/projects/${projectId}/overview`)
  frontend/hooks/api/build/client-portal.ts:41:  apiClient.get<...>(`/build/portal/projects/${projectId}/change-requests`)
  frontend/hooks/api/build/client-portal.ts:53:  `/build/portal/projects/${projectId}/change-requests`
All four are apiClient.get/post calls against the backend API at /build/portal/projects.
Zero frontend href/push/replace references remain.
```

---

## Violation 5: `/settings/directory` and `/settings/directory/[personId]`

**Status: NOT RESOLVED — intentional cross-product surface, explicitly documented**

**What it was flagged as:** Module-settings rule violation — directory module configuration sitting in global `/settings/*` instead of `/<module>/settings/*`.

**Why it was not resolved:** `frontend/CLAUDE.md §16` explicitly documents and endorses this pattern:

> "A workflow intentionally in two products renders ONE shared `features/` component through thin adapters with the route's base path passed in (`/directory/*` in Home vs `/settings/directory/*` in Administration) — never duplicate the page or import one `app/**/page.tsx` from another."

This is not a misconfiguration. The people directory is intentionally a cross-product surface mounted at two routes with a shared feature component and a `basePath` prop. The Administration product uses `/settings/directory` as its entry point to the directory, while the Home/People product uses `/directory`. The `settings/directory` pages pass `basePath="/settings/directory"` to `PeopleDirectoryPage` and `PersonDetailPage`, which is exactly the documented pattern.

Existing tests confirm the intent:
- `sidebar-product-path.test.ts:27`: `expect(getProductFromPathname("/settings/directory")).toBe("administration")`
- `sidebar-nav-items.test.ts:100/113/118/121/160/174`: tests asserting `/settings/directory` is a valid nav entry under the Administration product

Deleting `/settings/directory` would remove the Administration product's people directory view with no canonical replacement. The PAGES.md violation note was incorrect — it applied the module-settings rule to a cross-product surface that the frontend CLAUDE.md explicitly carves out as a legitimate exception using the `basePath` adapter pattern.

**Resolution:** No action taken. The two routes (`/directory` and `/settings/directory`) are both correct and intentional.

---

## Summary

| Violation | Resolution |
|---|---|
| `/crm/calendar` | RESOLVED — redirect file deleted, no links existed |
| `/payroll/me` | RESOLVED — duplicate deleted, 3 nav links updated to `/me/pay` |
| `/knowledge-base` | RESOLVED — redirect file deleted, 3 config entries cleaned up |
| `(portal)/projects` | RESOLVED — renamed to `/client-portal`, 6 link locations updated, old files deleted |
| `/settings/directory` | NOT RESOLVED — `frontend/CLAUDE.md §16` explicitly endorses this two-product cross-route pattern; tests assert it; deleting removes working Administration capability |
