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
1. **No way to make a least-privilege role** [RBAC-B-007]. Owners can only pick Member or Org Admin, and Build offers Member or Admin. A read-only tier needs a custom role builder on /settings/roles, and a place to assign it on the person and in Build.
3. **Open sessions do not pick up access changes, and nothing says so.** After an org role change (Member -> Org Admin) or a Build workspace add, the user's open session kept the old sidebar and module switcher. Changes only showed after a reload. Show a banner ("Your access changed. Reload to apply.") or push a refresh.
4. **Lists do not refresh after a save** [RBAC-B-004, RBAC-B-006]. Role change and Build add-member both show stale rows until reload. The owner will save twice or think the save failed.
6. **Knowledge Base shows content to users with "No access"** [RBAC-B-001]. The Viewer sees the wiki list. The invite dialog says "No access" for Knowledge, which is not what the user gets.
7. **Member HR links land on onboarding with no explanation** [RBAC-B-003]. Show "HR is not available for your account" instead of redirecting to the onboarding form.
8. **Person drawer "Module access" toggles look like grants.** For qa1015view (no grants) HR, Build, Accounting, Payroll and Support show ON. The toggles mean "module enabled for this person" but users read them as access. Label them "Enabled for this person" and show the granted roles next to each one (none for the Viewer).

### Good to have
1. Rename the Viewer preset to "No module access" in the invite dialog. It is a preset, not an org role, and the word "Viewer" suggests a role.
2. Access Restricted pages could offer "Request access" (it is currently just text: "Contact your administrator to request access").
3. Calendar opens for every role with no module grant. If that is intended, say so in the Calendar help; if not, gate it.
4. Module switcher (Documents OS, Build OS) opens an empty panel for the Viewer. Show the modules the user can open, or nothing.
5. The "Added" time on the Build member list shows the user's join time ("about 17 hours ago") for a membership added minutes ago [RBAC-B-006].
6. Roles page header "Recent Changes 0" after a role change: confirm the audit feed is wired, or show the last change there.
7. The companion chat bubble sits over the access-denied message and the top-right actions on every page. Let it be dismissed for the session.
8. Denial reason text varies between runs for the same route (/settings/roles showed settings:view once and settings:rbac:manage another time). Pick one reason per route.
