# RBAC round 1 - bugs (2026-10-15)

Site: https://www.streamlineos.in, org "ADitay CAhala". Actors: owner, qa1015mem (Member), qa1015view (Member + Viewer preset). Test data in TEST-DATA.md. IDs are RBAC-B-NNN; Build approval findings are in build/round-1/BUGS.md (BLD-B-047+).

Summary: 5 bugs (1 Medium access-control gap, 2 Medium message/redirect issues, 1 Low deep-link redirect, 1 Low stale list). Passing checks are in RBAC-MATRIX.md.

## Page: Knowledge Base (/knowledge)

### RBAC-B-001 Knowledge Base opens for users whose Knowledge Base grant is "No access"
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

## Page: Payroll module deep link (/hr/payroll)

### RBAC-B-002 Member gets "Payroll is not enabled for your organisation" while the owner can open Payroll
- Severity: Medium
- Route: /hr/payroll (redirects to /access-denied?required=module:payroll&reason=org-disabled&from=/payroll)
- Actor: qa1015mem and qa1015view (Member, no Payroll grant). Owner used as the comparison.
- Steps: 1) As the owner open /hr/payroll: redirects to /payroll and "Payroll OS" loads ("Opening this section"). 2) As qa1015mem open /hr/payroll.
- Expected: "Access Restricted. You need the Payroll permission" (reason = no grant), because the module is enabled for the org.
- Actual: "Module not enabled. Payroll is not enabled for your organisation. An administrator can turn it on in settings. Manage Modules." The reason code is org-disabled, but the owner reaches Payroll, so the org has the module on.
- Impact: a wrong instruction. The user is told an administrator must enable Payroll, and an admin who looks at settings may think the module is off. The real cause (no Payroll grant for this member) is hidden.
- Likely code area: access-denied reason mapping (org-disabled vs. missing module grant) for the /hr/payroll alias to /payroll.
- Fix: map "no Payroll grant for this user" to reason=module-not-granted with text "You need the Payroll permission. Contact your administrator." Keep org-disabled only when the org module is off.
- Acceptance: a Member with no Payroll grant sees the Access Restricted text naming Payroll; the org-disabled text appears only when the org module is off.

## Page: HR deep link (/hr)

### RBAC-B-003 /hr redirects members with no HR grant to the employee onboarding page instead of access denied
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

## Page: Members & Access (/settings/users)

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

## Page: Member-level access results (summary of the access-denied pages)

No further bugs. The following behaved as expected and are kept as regression checks: /settings/organization, /settings/users, /settings/roles, /settings/billing, /build/21/settings (qa1015mem: "Build › Update permission"), /build/21 and /build (qa1015view: "Build › View permission"), and the Build create/edit paths for qa1015mem (no create issue control, read-only ticket, milestone and release rows).
