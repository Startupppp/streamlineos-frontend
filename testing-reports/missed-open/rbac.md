# rbac — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## RBAC-B-004 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/rbac/round-2/BUGS.md`

| ID | Round-1 result | Round-2 result | Status |
| RBAC-B-004 Members list shows old role after Change role | Row showed "Member" after Save until reload | Still open. qa1015view Member -> Org Admin, Save: the row still reads "Member" with no reload; after reload it reads "Org Admin". Restore to Member showed the same stale row (reload fixed it). | OPEN |

Write-up from `streamline-qa-reports/modules-2026-10-15/rbac/round-1/BUGS.md`:

### RBAC-B-004 Members list shows the old org role after "Change role" saves until a reload
- Severity: Low
- Route: /settings/users > qa1015mem > Actions > Change role
- Actor: owner
- Steps: 1) Actions > Change role on qa1015mem (Member). 2) Select Org Admin, click Save. 3) Read the Role column right after the dialog closes.
- Expected: the row shows "Org Admin" straight away, as the save succeeded.
- Actual: the row still shows "Member". After a reload it shows "Org Admin". The access change itself is correct after refresh (qa1015mem then reached /settings/users, /settings/organization, /settings/roles and /settings/billing).
- Impact: the owner may think the save failed and save again, or change the role twice. Same family as the stale-list issues on Build (BLD-B-047/048).
- Likely code area: members table cache after the role-change mutation (no invalidation or optimistic update).
- Fix: invalidate or update the members query on success of the role change.
- Acceptance: after Save, the Role column shows the new role without a reload.

## RBAC-B-005 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/rbac/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/rbac/round-2/BUGS.md`:

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

## RBAC-B-008 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/rbac/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/rbac/round-2/BUGS.md`:

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
