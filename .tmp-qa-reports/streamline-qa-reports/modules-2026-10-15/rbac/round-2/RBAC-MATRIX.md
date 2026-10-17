# RBAC matrix - round 2 (2026-10-15)

Site: https://www.streamlineos.in, org "ADitay CAhala". Checks run by direct URL, deep link and UI. Result text is what the page showed (whitespace collapsed). "redirect" = final URL.

Columns: Owner (adityachalla01, Owner) | Org Admin (qa1015view set to Org Admin for the check, then restored to Member) | Member (qa1015mem, Member, defaults; Build project 21 member) | Viewer (qa1015view, Member, Viewer preset, no Build workspace membership at baseline).

Legend: PASS = behaves as the role should. FAIL = a bug (ID). N/T = not run this round. Owner column is a reference check this round (spot checks, not a full sweep).

## 1. Org settings

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /settings/organization | loads "Organization Settings" | loads | redirect /access-denied, "Settings > View" | redirect /access-denied, "Settings > View" | PASS |
| /settings/users (Members & access) | loads, Total Users 5 | loads, Total Users 5 | redirect /access-denied, "Settings > View" | redirect /access-denied, "Settings > View" | PASS |
| /settings/users?invite=1 (invite path) | loads | N/T | redirect /access-denied, no Invite button | N/T | PASS |
| /settings/roles | loads, Custom Roles 0 | loads (read) | access-denied (reason text differs between runs: settings:view and settings:rbac:manage) | redirect /access-denied, "Settings > Rbac > Manage" | PASS (denied); reason text drift noted in COVERAGE |
| /settings/billing | loads | loads | redirect /access-denied, "Billing > Subscription > View" | redirect /access-denied, "Billing > Subscription > View" | PASS |
| Change role (Actions menu) | Dialog: Member / Org Admin | N/T | no path (users page denied) | no path | PASS (no escalation) |
| Edit org settings / name | page loads | N/T | no path | no path | PASS |

## 2. HRMS

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /hr | loads HRMS (HR OVERVIEW, People, Lifecycle, Time) | N/T | redirect /employee-onboarding, no denial (RBAC-B-003) | redirect /employee-onboarding, no denial (RBAC-B-003) | FAIL (B-003) |
| /hr/leave, /hr/leaves, /hr/attendance | N/T | N/T | redirect /employee-onboarding (same gate) | N/T | FAIL (B-003, same gate) |
| /hr/people | N/T | N/T | 404 "Page Not Found" | N/T | Note (route not found, not a grant issue) |

## 3. Payroll

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /payroll | loads, Payroll settings page | loads ("Checking payroll setup", then Payroll October 2026) | redirect /access-denied, "Payroll > Runs > View" | redirect /access-denied, "Payroll > Runs > View" | PASS |
| /hr/payroll (alias) | redirect /payroll, loads | redirect /payroll, loads | redirect /access-denied, "Payroll > Runs > View" (was org-disabled in round 1) | redirect /access-denied, "Payroll > Runs > View" | PASS (RBAC-B-002 fixed) |

## 4. Calendar

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /calendar | loads | N/T | loads (round 1 also) | loads ("Showing Oct 12-18", Loading events, Create via top bar: Calendar event) | PASS (no module gate; see UX note) |

## 5. Build

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /build | loads Build home | N/T | redirect /build/command-center, loads | redirect /access-denied, "Build > View" (baseline) | PASS |
| /build/21 (project 21) | loads overview | N/T | loads overview (project member) | redirect /access-denied, "Build > View" (baseline). After a Build workspace add (Member), reload gives /build/command-center. After removal the text is "not enabled for your organisation" | PASS at baseline; FAIL after removal (RBAC-B-005) |
| /build/21/issues | loads | N/T | loads. Header has no "New issue"/"Create issue" control; top-bar Create has no issue item | N/T | PASS |
| /build/21/approvals | loads | N/T | loads (round 1 decide path not repeated) | N/T | PASS (not re-run in full) |
| /build/21/settings | N/T | N/T | redirect /access-denied, "Build > Update" | N/T (round 1: Build > View) | PASS |
| /build/settings/access (Members & Access) | loads, Add workspace member (Member / Admin) | N/T | N/T | N/T | Note: new row needs reload (RBAC-B-006) |
| Custom Build role (read-only) | cannot be created or assigned: options are Member and Admin only | - | - | - | BLOCKED (RBAC-B-007) |

## 6. Knowledge Base

| Route | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| /knowledge | loads /knowledge/chat | N/T | loads /knowledge/chat (Ask KB, Wiki, Research Briefs) | loads /knowledge/chat (same) | FAIL (B-001) |
| /knowledge/wiki | loads | N/T | N/T | loads, lists 1 page "QA1015R2-import-xss" | FAIL (B-001 list exposure) |
| /knowledge/wiki/import | loads | N/T | N/T | "Access Restricted. You don't have permission to import or export pages (kb:pages:import / kb:pages:export)". Sidebar still shows the link | PASS (page denies); link shown (RBAC-B-008) |

## 7. Members (module-level actions)

| Action | Owner | Org Admin | Member | Viewer | Result |
|---|---|---|---|---|---|
| Create menu (top bar) | full list | N/T | Comms (Send mail, Calendar event, New message), People (Leave request). No invite, no Build, no HR, no Payroll | Comms (Send mail, Calendar event, New message), Leave request. No project, issue or invite | PASS |
| Invite user | Invite User button | N/T | no UI path (users page denied) | no UI path | PASS |
| Change a role | Actions > Change role | N/T | no UI path | no UI path | PASS |
| Remove/suspend a user | Actions menu | N/T | no UI path | no UI path | PASS (not tested on real members) |

## 8. Privilege-escalation attempts (step 4)

| Attempt (as Member unless noted) | Result | Verdict |
|---|---|---|
| Invite a member | /settings/users and /settings/users?invite=1 are access-denied; no Invite button | PASS |
| Change a role | no path (users page denied); no Change role action reachable | PASS |
| Edit org settings | /settings/organization access-denied; no edit control | PASS |
| Approve leave | /hr/leaves redirects to /employee-onboarding (RBAC-B-003). No approval queue reached. /me/time-off not run | PARTIAL (not reached; B-003 blocks the path) |
| Viewer: open KB import/export | page denies with kb:pages:import text | PASS (link visible: B-008) |

## 9. Custom role run (step 3)

| Step | Result |
|---|---|
| Create custom role "QA1015R2 custom" (Build read-only, KB no access) | BLOCKED. No create control anywhere (Roles page, Groups tab, Create menu). See RBAC-B-007 |
| Assign custom role to qa1015view | BLOCKED (no custom role exists; Change role offers Member / Org Admin only) |
| Verify from the user's side, with and without reload | Done with the nearest real change: org role Member -> Org Admin (see section 10) and Build workspace add (see section 11) |
| Restore Viewer | DONE: org role Member (verified after reload), Build workspace membership removed, Build toggle back on |

## 10. Org role change seen from the user (qa1015view)

| Check | Result |
|---|---|
| Owner row after Save, no reload | still "Member" (RBAC-B-004) |
| Owner row after reload | "Org Admin" |
| User session, no reload | sidebar unchanged (no Administration/Settings entries). Change not visible until the user reloads |
| User session, after reload | /settings/users, /settings/organization, /settings/roles load; /settings/billing loads; /hr/payroll -> /payroll loads (Org Admin behaviour) |
| Restore to Member, owner | row shows "Member" after reload |
| User session after restore, reload | /settings/users -> access-denied "Settings > View" |

## 11. Build workspace add and remove (qa1015view)

| Check | Result |
|---|---|
| Owner add (Member role), no reload | row not shown (RBAC-B-006); shown after reload |
| User session, no reload | no Build item in sidebar, module switcher (Documents OS) shows an empty panel. Change not visible without reload |
| User session, after reload | /build -> /build/command-center loads (Build Member level) |
| Owner remove from workspace | confirm "Remove member? QA1015 Viewer will lose access to Build. They stay a member of your organization." Removed |
| User session after removal | /build -> "Module not enabled ... not enabled for your organisation" (RBAC-B-005). Build toggle in person drawer had turned off |
| Build toggle restored on | aria-checked true (owner drawer). Re-check of the user's /build page after this toggle restore not run |

## Summary counts

- Module/route checks this round: 50+ (see sections 1-8).
- PASS: org settings (all denials), Payroll gate (fixed), Create menus, Build project denials, escalation attempts (except leave).
- FAIL: /hr and all /hr deep links for Member and Viewer (B-003), /knowledge and /knowledge/wiki for Member and Viewer (B-001), Build denial text after toggle off (B-005).
- BLOCKED: custom role creation and assignment (B-007).
