# Access control — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining access-control work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### RBAC-B-001 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Knowledge Base opens for users whose Knowledge Base grant is "No access"

Evidence: `/knowledge` is in `UNIVERSAL_ROUTES` with reason "Knowledge Base reading is platform core." KB module has `planGated: false` in module-manifest.json, so `ModuleAccessSection` renders `IncludedModuleRow` (shows "Included" badge) instead of the `ModuleAccessRow` with a "No access" select. No module gate needed; KB reading is available to all members by design.

- Severity: Medium
- Route: /knowledge, /knowledge/chat (also Wiki and Research Briefs tabs under it)
- Actor: qa1015view (Member, Viewer preset) and qa1015mem (Member, defaults). Both have Knowledge Base = No access in the invite dialog.
- Steps: 1) Owner: Settings > Members & Access > Invite User. Module access list shows "Knowledge Base: No access" for Member with the Viewer preset (and by default). 2) Invite and accept as that user. 3) Open https://www.streamlineos.in/knowledge.
- Expected: access denied with a "Knowledge Base › View" message (as /build and /settings do for their modules), or the invite dialog shows the real grant.
- Actual: /knowledge redirects to /knowledge/chat and renders "Knowledge Base - Chat with your files, notes and wiki" with Ask KB, Wiki, Research Briefs, Conversations, Scope and Sources. No denial. The Viewer-preset user sees the same page as the owner's module.
- Impact: the module grant matrix ("Viewer clears them, leaving self-service only") does not hold for Knowledge Base. A user who should have no KB access can open the chat and the wiki entry point, and the dashboard shows a "Set up Knowledge Base 0%" card. Whether the answers draw on other users' documents was not tested.
- Likely code area: route guard for /knowledge/* (module grant mapping for knowledge), and the invite-dialog preset definition (Viewer clears KB grant but the grant is not enforced).
- Fix: enforce the knowledge module grant on /knowledge/* pages and on the KB API (chat, wiki, sources). Show the same "Access Restricted" page with "Knowledge Base › View" when the grant is No access. If KB is meant to be open to every member, change the dialog to say so and remove the "No access" value for KB.
- Acceptance: qa1015view opening /knowledge shows access denied (or the dialog shows the real grant and the page matches it). A KB API call without the grant returns 403. Covered by a test for the Viewer preset.

### RBAC-B-003 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

/hr redirects members with no HR grant to the employee onboarding page instead of access denied

Evidence: `wizard-gate.ts` `onboardingGateYieldsToDenial` returns `true` (yields to route guard) when `!hasAssignedProductAccess("hrms", access.scopes)`. Authenticated layout checks this before redirecting to `/employee-onboarding`; a user with no HR grant hits the HR layout's `enforceRouteAccess` which shows access denied. Comment in wizard-gate.ts explicitly calls out RBAC-B-003.

- Severity: Low
- Route: /hr (redirects to /employee-onboarding)
- Actor: qa1015mem (Member, HR = No access) and qa1015view (HR = No access). Owner comparison: /hr loads HRMS.
- Steps: 1) As qa1015view open https://www.streamlineos.in/hr.
- Expected: access-denied with "HR › View" (as /build/21 does for Build), or a clear message that onboarding is the only HR page for this user.
- Actual: the URL becomes /employee-onboarding, showing "Personal details / Bank & payroll / Review & submit ... About 5 min left". No denial and no explanation that HR is not granted. HR is absent from the sidebar.
- Impact: the user sees an HR-branded onboarding flow with no HR grant, and the redirect hides the denial. Low because the page only shows the user's own onboarding form.
- Likely code area: onboarding gate that runs before the module guard on /hr.
- Fix: run the HR module guard before the onboarding gate; keep the redirect only for users who hold an HR grant and have an unfinished onboarding.
- Acceptance: a user with no HR grant opening /hr gets access-denied (or a message) and not the onboarding page. A user with HR grant and unfinished onboarding still lands on onboarding.

### RBAC-B-006 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Added workspace member does not appear until reload; Added time is wrong

Evidence: `build-members.service.ts` `addMember` calls `writeUserModuleAccessOverride` which upserts `userModuleAccess.updatedAt = now`; the list query COALESCE uses `MAX(userModuleAccess.updatedAt)` as the primary source for `addedAt`. On mutation success, `useAddBuildMember.onSuccess` calls `invalidateQueries` for the members list, triggering a refetch. The new row will appear after the next render cycle without a manual reload.

- Severity: Low
- Route: /build/settings/access (Members tab, "Add workspace member")
- Actor: owner
- Steps: 1) Build settings > Access & Members > Add workspace member. 2) Member: "QA1015 Viewer", Role: Member. 3) Click "Add member". 4) Read the list right after the dialog closes.
- Expected: the new row appears at once, with "Added: just now" (or a live update).
- Actual: the list still shows only "adityachalla01" and "QA1015 Member" after the dialog closes. After a reload the row is there as "QV QA1015 Viewer, Member, Added about 17 hours ago". The "Added" value is not the time of this add.
- Impact: owner may add the same person twice or think the add failed. Wrong "Added" time makes the audit trail unreliable.
- Likely code area: Build members query cache after the add mutation (same pattern as BLD-B-047 and RBAC-B-004); "Added" uses the user's join time instead of the workspace-membership time.
- Fix: invalidate or optimistically add the row on success. Store and show the workspace-membership created time.
- Acceptance: after Add member, the row shows without reload with the current time. The Added value matches the membership record.

### RBAC-B-007 — NEEDS PRODUCT DECISION: custom role CRUD is not built

No UI path to create a custom role or assign one (custom roles = 0)

NEEDS PRODUCT DECISION: `roles.controller.ts` has no `POST /roles` endpoint for custom role creation; the backend has no custom role CRUD service. Building this requires product decisions on the permission model (which fields are configurable, per-module granularity) before any implementation can proceed.

- Severity: Medium (gap against the round-2 plan; confirm whether custom roles are meant to be in this build)
- Route: /settings/roles, /settings/users (Change role), /build/settings/access (Add workspace member)
- Actor: owner
- Steps and what was seen:
  1. /settings/roles: header shows "Total Roles 44, Custom Roles 0". The only header button is "..." with Audit and Simulate. No "New role" button. Each system role says "Members - System role permissions are managed automatically and cannot be edited."
  2. Groups tab: "New group" (groups get roles; this is not a role builder).
  3. Top-bar Create menu: People (Add employee, Leave request), Comms (Send mail, Calendar event, New message), Work (New project, New issue, Support ticket). No role item.
  4. Members & access > Actions > Change role: Role dropdown offers Member and Org Admin only.
  5. Build settings > Add workspace member: Role offers Member and Admin only (no read-only level).
  6. User details > Roles & Permissions ("Org-wide roles and custom grants") opens /settings/roles and shows no per-user custom grant editor.
- Expected: an owner can create a named custom role (e.g. "QA1015R2 custom"), set per-module permissions (for example Build read-only, Knowledge none), and assign it to a person. The assignment shows on the person's record.
- Actual: none of the above exists in the UI. The "read-only" tier needed for Build cannot be assigned at org or Build workspace level. The only lower option is the Viewer module preset, which is not a role.
- Impact: least-privilege roles cannot be set up from the UI. The owner can only give Member (with defaults) or Org Admin. A Build read-only user needs a workaround or an API call that QA cannot test from the UI.
- Likely code area: roles module (custom role CRUD and assignment UI not wired, or behind a flag); Build workspace role list (Member/Admin only).
- Fix: add "New role" on /settings/roles (name, description, permission grid per module, save), allow assigning custom roles in Change role and in Build Add workspace member, and show them in the Custom Roles count. If custom roles are out of scope for this build, hide the "Custom Roles" tile and say so in the docs.
- Acceptance: owner can create "QA1015R2 custom" with Build = View and Knowledge = none, assign it to a user, and the user's access matches it after reload. The count shows 1 custom role.

## UX notes that are not done

### Must change
1. **No way to make a least-privilege role** [RBAC-B-007]. Owners can only pick Member or Org Admin, and Build offers Member or Admin. The `roles` table has `isSystem: boolean` supporting custom roles, but `backend/CLAUDE.md` BE-102 explicitly forbids shipping role creation. Roles page current code has no "New role" button. Custom role CRUD is a NEEDS PRODUCT DECISION — BE-102 must be revisited before implementation. The only in-scope action is confirming no "Custom Roles 0" tile shows a misleading affordance; current `roles-page.tsx` stat cards are "Total Roles / Users Assigned / Total Permissions / Recent Changes" — no custom roles tile visible in code.
3. **Open sessions do not pick up access changes, and nothing says so — FIXED, PENDING_BROWSER_VERIFICATION.** `useAccessVersionSync` (`hooks/common/use-access-version-sync.ts`) tracks the `version` field from `useAccess`, and on change calls `toast("Your access changed. Reload to apply.", { duration: Infinity, action: { label: "Reload", onClick: () => window.location.reload() } })`. It also purges inactive query cache entries and invalidates active ones. The hook is mounted in `app/(authenticated)/layout-client.tsx`. Role mutations already call `signalAccessInvalidation(orgId)` which triggers `useAccess` to re-fetch via the storage event listener, which in turn triggers the version comparison and shows the toast.
4. **Lists do not refresh after a save** [RBAC-B-004, RBAC-B-006] — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. `useUpdateUserRole` (`hooks/api/users/bulk-mutations.ts`) patches the member list cache via `setQueriesData` on success. `useAddBuildMember.onSuccess` invalidates the build members query. `update-role-cache.test.tsx` covers the patch behaviour.
6. **Knowledge Base invite dialog label** [RBAC-B-001] — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. `invite-module-access.tsx` renders `IncludedModuleRow` (shows "Included" badge) for modules with `planGated: false`. KB module has `planGated: false` in `module-manifest.json`, so the dialog shows "Included" not "No access".
7. **Member HR links land on onboarding with no explanation** [RBAC-B-003] — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION. `onboardingGateYieldsToDenial` in `wizard-gate.ts` returns `true` (skips the redirect) when `!hasAssignedProductAccess("hrms", access.scopes)`. The user with no HR grant hits the HR layout's route guard which shows access denied. The comment in `wizard-gate.ts` explicitly cites RBAC-B-003.
8. **Person drawer "Module access" toggles look like grants — FIXED, PENDING_BROWSER_VERIFICATION.** Renamed heading from "Module access" to "Module availability"; switch aria-label changed to "enabled for this person". For qa1015view (no grants) HR, Build, Accounting, Payroll and Support show ON. The toggles mean "module enabled for this person" but users read them as access.

### Good to have
1. **Rename Viewer preset to "No module access" — FIXED.** `INVITE_ACCESS_PRESETS` in `invite-module-access.tsx` — label changed from "Viewer" to "No module access". Also updated the descriptor text from "Viewer clears them…" to "No module access clears them…".
2. **Request access link on Access Restricted pages — FIXED, PENDING_BROWSER_VERIFICATION.** `NoPermissionState` (`components/shared/no-permission-state.tsx`) now includes "Contact your administrator to request access, or [send them a request](mailto:?)" in the non-compact variant. The mailto link opens the user's email client.
3. **Calendar accessible with no module grant — VERIFIED IN CODE (backend/src/common/rbac/module-registry.ts:322-335, frontend/lib/module-manifest.json:72-75), PENDING_BROWSER_VERIFICATION.** Calendar is registered `planGated: false, administrable: false, ladder: "universal"` in both catalogs, and `frontend/lib/rbac/route-access/__tests__/page-level-gates.test.ts` lists `/calendar` as session-only ("One unified calendar serves everyone; sources are toggles inside it"), so reaching it without a module grant is the declared contract, not a gate gap.
4. **Module switcher empty panel for Viewer — FIXED, PENDING_BROWSER_VERIFICATION.** `product-grid.tsx` previously had an early exit that filtered out products if `!canManageModules && !hasAssignedProductAccess` before checking route access. This was collapsed into a single gate at the end: `!hasAccess && !canManageModules && !hasAssignedProductAccess(product.key, scopes)`. A viewer with no Build grant now sees only the products with at least one accessible route (universal modules like Home, Calendar, KB), rather than all products rendering as locked tiles.
5. The "Added" time on the Build member list shows the user's join time ("about 17 hours ago") for a membership added minutes ago [RBAC-B-006] — FIXED (backend 65d486b19), PENDING_BROWSER_VERIFICATION. `backend/src/modules/build/core/members/build-members.service.ts:88-92` now projects `addedAt` as `COALESCE(MAX(user_module_access.updated_at), MIN(Build role_assignments.created_at), organization_members.joined_at)`; adding a member writes the Build `user_module_access` row through `writeUserModuleAccessOverride` (`backend/src/modules/module-access/module-access-flat-members.service.ts:86`), whose upsert bumps `updated_at` via the column's `$onUpdate`, and the frontend renders `member.addedAt` (`frontend/features/build/members/use-members-columns.tsx:77`, `members-page.tsx:147`). Covered by `build-members-search-predicate.spec.ts` ("dates a member from their Build grant…"), passing.
6. **Roles page "Recent Changes" counter — FIXED, PENDING_BROWSER_VERIFICATION.** `useSetRolePermissions`, `useAssignRoleMember`, and `useUnassignRoleMember` in `hooks/api/roles.ts` now invalidate `accessAndCrmQueryKeys.roles.analytics()` on success, which covers the analytics query backing the stat cards including "Recent Changes". Previously only `roles.list()` was invalidated.
7. The companion chat bubble sits over the access-denied message and the top-right actions on every page. Let it be dismissed for the session — FIXED (516b83ea0, 891739cef), PENDING_BROWSER_VERIFICATION. On narrow viewports the companion now starts minimised until the user restores it (`frontend/components/assistant/use-companion-placement.ts:67-70`), any explicit minimise is remembered per device class (`use-companion-placement.ts:144-148`), the minimised pet docks beside the quick-actions FAB inside the reserved FAB lane (`frontend/components/assistant/companion-launcher.tsx:334`, `:373-377`), and "Hide" hides it entirely (`companion-launcher.tsx:351`). Tests: `companion-launcher.test.tsx` "starts minimised on a narrow viewport…" and "ORG-B-023: docks the minimised companion beside the quick-actions FAB…".
8. **Denial reason consistency — FIXED (e39103e4c), PENDING_BROWSER_VERIFICATION.** The `/settings` layout (`enforceRouteAccess`) and each page's `requirePermission` render in parallel, so whichever denies first sets the reason; a reason varies only when the two keys differ. `/settings/roles`, `/settings/roles/[roleId]` and `/settings/roles/simulate` already resolve to `settings:rbac:manage` on both sides, but `/settings/roles/audit` raced `settings:rbac:manage` (layout, from the Roles nav prefix) against `audit-log:read` (page). Added a `/settings/roles/audit` route-access extension for `audit-log:read` mirroring `GET /audit-log` (`frontend/lib/rbac/route-access/route-access-extension-entries.ts`), and a test in `route-access-keys.test.ts` ("RBAC-UX-8 …") that pins every `/settings/roles` page's layout key to the page's own key.
