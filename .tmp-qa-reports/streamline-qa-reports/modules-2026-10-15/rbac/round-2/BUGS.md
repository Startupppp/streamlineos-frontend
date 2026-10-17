# RBAC round 2 - bugs (2026-10-15)

Site: https://www.streamlineos.in, org "ADitay CAhala". Actors: owner (Aditya Challa, normal window), qa1015mem (Member, defaults), qa1015view (Viewer preset). Org Admin was checked by temporarily setting qa1015view to Org Admin (restored to Member). Matrix in RBAC-MATRIX.md, coverage in COVERAGE.md. Test data and changes in TEST-DATA.md. Build approval/list findings stay in build/round-1 and build/round-2 BUGS (BLD-B-NNN).

Summary: 4 round-1 bugs rechecked (1 fixed, 3 still open). 4 new bugs (RBAC-B-005..008): 2 Medium, 2 Low. Custom role creation could not be run (no UI path, see RBAC-B-007).

## Recheck of round-1 bugs

| ID | Round-1 result | Round-2 result | Status |
|---|---|---|---|
| RBAC-B-001 Knowledge Base opens for "No access" | /knowledge and /knowledge/chat open for Member and Viewer | Still open. qa1015mem and qa1015view both load /knowledge -> /knowledge/chat ("Ask KB, Wiki, Research Briefs"). qa1015view also opens /knowledge/wiki and sees the page list ("1 page: QA1015R2-import-xss", Draft, Unverified). | OPEN |
| RBAC-B-002 Payroll "org-disabled" text for a Member | /hr/payroll and /payroll for Member and Viewer showed "Module not enabled. Payroll is not enabled for your organisation" | Fixed for Payroll. /hr/payroll and /payroll now go to /access-denied?required=payroll:runs:view and show "Access Restricted. You need the Payroll > Runs > View permission." (checked as qa1015mem and qa1015view). Note: the same wrong "not enabled for your organisation" wording now appears for Build, see RBAC-B-005. | FIXED (Payroll). Regression on Build: RBAC-B-005 |
| RBAC-B-003 /hr redirects to onboarding without an HR grant | /hr -> /employee-onboarding for Member and Viewer | Still open. /hr -> /employee-onboarding for qa1015mem and qa1015view. The same gate also catches /hr/leave, /hr/leaves and /hr/attendance (all -> /employee-onboarding for qa1015mem). | OPEN (extended to all /hr deep links for Member) |
| RBAC-B-004 Members list shows old role after Change role | Row showed "Member" after Save until reload | Still open. qa1015view Member -> Org Admin, Save: the row still reads "Member" with no reload; after reload it reads "Org Admin". Restore to Member showed the same stale row (reload fixed it). | OPEN |

## Page: Access denied - Build (/build, /build/21)

### RBAC-B-005 Build denial says "Build is not enabled for your organisation" while Build is enabled for the org
- Severity: Medium
- Route: /build, /build/21 (redirect to /access-denied?required=module:build&reason=org-disabled&from=/build)
- Actor: qa1015view (Member, Viewer preset). Owner used as comparison.
- Steps:
  1. Owner, Members & access > qa1015view > Module access: the Build toggle is off (in this run it turned off when the user was removed from the Build workspace, see TEST-DATA.md). Owner's /settings/modules page lists "Build - Projects, issues & delivery" as enabled (no "Disabled" tag), and owner opens Build normally.
  2. As qa1015view open https://www.streamlineos.in/build.
- Expected: either "Access Restricted. You need the Build > View permission" (the round-1 text for this user), or a message that says Build is turned off for this person. The "not enabled for your organisation" text only when the org module is off.
- Actual: "Module not enabled. Build (Project Management) is not enabled for your organisation. An administrator can turn it on in settings. Manage Modules." URL reason=org-disabled. In round 1 and at the start of this round, the same user saw "Access Restricted. You need the Build > View permission" on /build and /build/21, so the reason flips with the per-person toggle, not with the org setting.
- Impact: wrong instruction. An admin who opens Modules sees Build enabled and cannot tell why the user is blocked. Same family as RBAC-B-002 (the org-disabled reason is used for a non-org cause).
- Likely code area: access-denied reason mapping (module guard). The per-person module toggle is treated as org-level "disabled".
- Fix: map the per-person toggle off to reason=module-off-for-user and show "Build is turned off for your account. Ask an admin to turn it on." Map org-disabled only when the org module flag is off. Also keep build:view for "toggle on, no workspace membership".
- Acceptance: with org Build on and the person toggle off, /build shows the per-person text, not the org text. With org Build off, the org text appears. With toggle on and no membership, build:view text appears (as in round 1).

## Page: Build Access & Members (/build/settings/access)

### RBAC-B-006 Added workspace member does not appear until reload; Added time is wrong
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

## Page: Roles & Permissions (/settings/roles)

### RBAC-B-007 No UI path to create a custom role or assign one (custom roles = 0)
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

## Page: Wiki (/knowledge/wiki)

### RBAC-B-008 Viewer (Knowledge = No access) sees KB "Manage" links that lead to a denied page
- Severity: Low
- Route: /knowledge/wiki (sidebar MANAGE > Templates, Import & Export), /knowledge/wiki/import
- Actor: qa1015view (Viewer preset)
- Steps: 1) As qa1015view open /knowledge/wiki. 2) Read the sidebar. 3) Click "Import & Export".
- Expected: MANAGE links hidden when the user lacks kb:pages:import / export, or hidden with the Knowledge grant.
- Actual: sidebar shows MANAGE > Templates and Import & Export. Clicking Import & Export opens /knowledge/wiki/import with "Access Restricted. You don't have permission to import or export pages. Ask an admin to grant kb:pages:import or kb:pages:export." The page is denied correctly, but the link is shown. The wiki list itself is also visible (see RBAC-B-001).
- Impact: low. Confusing and invites probing; if the wiki list is exposed by B-001, the "Manage" entries add to the surface.
- Likely code area: KB sidebar builder (shows entries by route, not by permission).
- Fix: filter sidebar entries by the same permission as the page guard. Re-check B-001 at the same time.
- Acceptance: a user without kb:pages:import sees no Import & Export link. The page still returns the denial text.
