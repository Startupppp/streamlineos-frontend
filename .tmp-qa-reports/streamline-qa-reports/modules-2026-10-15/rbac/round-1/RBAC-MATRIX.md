# RBAC matrix - round 1 (2026-10-15)

Site: https://www.streamlineos.in, org "ADitay CAhala". Actors:
- **owner** = Aditya Challa's account (org Owner), main window.
- **qa1015mem** = org Member, module defaults (Build = Member, other modules No access). Project 21 team member added by owner in phase 2. Org role temporarily set to Org Admin in phase 3 and set back to Member.
- **qa1015view** = org Member with the "Viewer" module preset (every module grant cleared = No access). Only signed in during phase 1.

Result text is quoted as shown on screen (whitespace collapsed). "redirect" = final URL after the navigation.

## 1. Org level - direct URLs (phase 1)

| Route | owner | qa1015mem (Member, defaults) | qa1015view (Member, Viewer preset) |
|---|---|---|---|
| /hr | loads HRMS: "HR OVERVIEW Hub Action Center HR PEOPLE People Org Chart Positions LIFECYCLE Onboarding Exit Assets TIME Attendance Shifts Leave Time clocks" | redirect to /employee-onboarding: "Personal details / Bank & payroll / Review & submit ... About 5 min left". No denial shown | redirect to /employee-onboarding (same page). No denial shown |
| /hr/payroll | redirect to /payroll; "Payroll OS" loads | redirect to /access-denied?required=module:payroll&reason=org-disabled. Text: "Module not enabled. Payroll is not enabled for your organisation. An administrator can turn it on in settings. Manage Modules" | same redirect and same text |
| /build | Build home loads (project board, approvals, settings all reachable) | loads Build OS home (Build sidebar: Overview, Projects, Products, Portfolios, Programs, Teams, More tools, All Work) | redirect to /access-denied?required=build:view&from=/build. "Access Restricted. You need the Build › View permission. Permission details. Contact your administrator to request access." |
| /build/21 | project overview loads (QA1015 Build R1 / QA1015R1) | before project membership: redirect to /build/command-center (no message). After membership: project overview loads | redirect to /access-denied?required=build:view&from=/build/21. "Access Restricted. You need the Build › View permission." |
| /knowledge | loads /knowledge/chat (Documents OS: Ask KB, Wiki, Research Briefs) | loads /knowledge/chat, same as owner. KB grant in invite dialog = "No access" (see RBAC-B-001) | loads /knowledge/chat, same. KB grant = "No access" (see RBAC-B-001) |
| /calendar | loads (Calendar, "Oct 12–18, 2026", Add Capacity, My time insights) | loads | loads (sidebar: Communication > Calendar) |
| /settings/organization | loads Organization Settings (Administration sidebar) | redirect to /access-denied?required=settings:view. "Access Restricted. You need the Settings › View permission." | same, settings:view |
| /settings/users (Members & Access) | loads (Invite User, Members, Invitations) | redirect to /access-denied?required=settings:view&from=/settings/users. "Settings › View" text as above | same, settings:view |
| /settings/roles | loads | redirect to /access-denied?required=settings:rbac:manage. "Access Restricted. You need the Settings › Rbac › Manage permission." | redirect to /access-denied?required=settings:rbac:manage (same text) |
| /settings/billing | loads (Your trial ends in 12 days banner, Billing & Plan) | redirect to /access-denied?required=billing:subscription:view. "Access Restricted. You need the Billing › Subscription › View permission." | same, billing:subscription:view |

qa1015view sidebar (Home OS), full list of entries: OVERVIEW Home; COMMUNICATION Inbox, Mail, Calendar, Chat; FOR ME My Day, My Team, Time Off, Attendance, Expenses, My Documents, Onboarding Tasks, Recruitment, Job Openings, My Referrals, Support; COMPANY Announcements, People. No Build, HR, Payroll, Knowledge or Settings entry. Dashboard shows "Set up Knowledge Base 0%" and "Set up Chat 0%" cards.
qa1015mem sidebar was not captured in full (Build reached by URL; the Build project sidebar is in section 2).

### Mutation attempts (phase 1)
| Actor | Attempt | Result |
|---|---|---|
| owner | Invite qa1015mem (Member, Build = Member default) and qa1015view (Member, Viewer preset) | "Invitation sent!" for both. Pending Invites 2 after reload. PASS |
| owner | Change qa1015mem org role (phase 3) | see section 3 |
| qa1015mem | Settings > Members invite / org name / roles / billing | no UI path: the settings pages are access-denied (no Invite User, no name field). Not sent |
| qa1015view | Settings invite | no UI path: /settings/users access-denied. Not sent |
| qa1015view | Create or any write in Build/HR | no create path: Build not granted; /build access-denied |

## 2. Module level - Build, qa1015mem (project 21 "QA1015 Build R1")

| Actor | Action | Result |
|---|---|---|
| qa1015mem | open /build/21 before being added to the project | redirect to /build/command-center. No denial text |
| qa1015mem | open /build/21 after being added (owner set Team Members, see BUGS/TEST-DATA) | overview loads. Project sidebar: Overview, Issues, Backlog, Cycles, Releases, Updates, Files, More tools (no "Project settings") |
| qa1015mem | Issues board /build/21/issues | board loads. Header: Log time, Export, Board / List / Table / Calendar / Timeline / Workload, Views, Display, Add filter. No "New issue"/"Create issue" control |
| qa1015mem | global "Create" menu (top bar) | items: Send mail, Calendar event, New message, Leave request. No issue/ticket item. PASS (no ticket create) |
| qa1015mem | /build/21/issues?create=1 | no create dialog |
| qa1015mem | create ticket by direct route/POST | no UI path; not sent |
| qa1015mem | open QA1015R1-1 (/build/21/tickets/QA1015R1-1) | detail loads read-only: Status "To Do", Priority "Low", Type "Task", Epic, Workstream, Cycle comboboxes disabled (click shows no options). No Edit button, no comment box, no subtask add. PASS (no edit) |
| qa1015mem | Milestones /build/21/milestones | list loads ("QA1015 MS achieved", Achieved). No "New milestone" button. No row actions. Row click opens nothing. PASS (read-only) |
| qa1015mem | Releases /build/21/releases | list loads ("QA1015 release 1.0.0 <b>ready</b>", Released). No "New Release" button. Row click opens no Edit sheet. PASS (read-only; B-085 fix holds, no Save path) |
| qa1015mem | /build/21/settings (Project settings) | redirect to /access-denied?required=build:update. "Access Restricted. You need the Build › Update permission." |

## 3. Approvals (B-061 / B-084 / B-076 path), project 21

| Actor | Action | Result |
|---|---|---|
| owner | Approvals > Request approval > Request milestone approval; Milestone "QA1015 MS achieved", Title "RBAC R1 approval for qa1015mem", Approver "QA1015 Member", Level 1 | "Approval requested" toast. Row list still says "No approvals yet" until reload (BLD-B-047) |
| owner | reload /build/21/approvals | row: Milestone, "RBAC R1 approval for qa1015mem", Approver "QA1015 Member", Level 1, Pending |
| qa1015mem | Approvals list (first view) | row present; no Actions cell visible; approver row click opens nothing. Actions "..." menu offers "Decide" (B-084 path PASS) |
| qa1015mem | Decide > Decision Approve > Submit (one submit) | row shows "Approved" immediately (no reload needed). Approver column "QA1015 Member" (NEW-R3 "Unknown" NOT reproduced). After reload still Approved. Menu after decision: empty (no actions). PASS |
| owner | same approval, row "..." menu | menu: Delete only. No Decide (approval already decided) |
| owner | second approval "RBAC R1 pending for B-061 check" (Pending, approver qa1015mem) row "..." menu | menu: Delegate, Escalate, Cancel, Delete. **No Decide** offered to the owner. Row click opens nothing. (B-061 UI: owner cannot decide another person's approval in the UI. Server PATCH not testable from the browser) |
| qa1015mem | Decide on "RBAC R1 pending for B-061 check" > Decision Reject, comment "RBAC R1 reject probe" > Submit | row shows "Rejected" immediately |
| owner | same list WITHOUT reload (approval 2 still shown as Pending) | stale "Pending" until reload (BLD-B-048). After reload: "Rejected", row menu Delete only |

## 4. Org role change - qa1015mem (phase 3)

| Step | Actor | Result |
|---|---|---|
| 1 | owner, /settings/users > qa1015mem > Actions > Change role | menu: View details, Change role, Suspend, Archive, Send sign-in link, Remove from organization, Delete user. Dialog: Role = Member, options Member / Org Admin |
| 2 | owner selects Org Admin, Save | dialog closes; list still shows "Member" until reload (RBAC-B-005). After reload: "QA1015 Member qa1015mem@sharklasers.com Org Admin Active" |
| 3 | qa1015mem, reload /settings/users | loads ("Total Users 3 / Active 3 / Owner adityachalla01 / Org Admin qa1015mem / Member qa1015view"). PASS |
| 4 | qa1015mem, /settings/organization | loads, no denial. PASS |
| 5 | qa1015mem, /settings/roles | loads, no denial. PASS |
| 6 | qa1015mem, /settings/billing | loads, no denial. PASS |
| 7 | owner selects Member, Save, reload | row shows "Member". PASS |
| 8 | qa1015mem, reload /settings/users | redirect /access-denied?required=settings:view&from=/settings/users ("Settings › View"). PASS (access removed again after refresh) |

## Not run / gaps
- qa1015view mutation attempt beyond "no UI path": not run (no second sign-in cycle to a Build or Calendar write; judged not needed for round 1).
- Server-side (direct API) RBAC checks (e.g. PATCH /approvals/:id/decide as owner): not run. Browser-only.
- Mobile/375 px: not run.

## Carry-over checks from build-2026-10-14-recheck/NEW-BUGS.md

| ID | Result on round 1 | Where checked |
|---|---|---|
| NEW-R1 (empty Actions menu for a member on milestones) | NOT reproduced on project 21. The member's milestone row has no Actions control at all (nothing to open, no empty menu). Project 7 was not used (not in this org) | /build/21/milestones as qa1015mem |
| NEW-R2 (first Continue on sign-in only returns to the email step) | NOT reproduced: the first Continue went to "Verification code" in 3 of 3 sign-ins (qa1015mem invite, qa1015view invite, qa1015mem sign-in). Note: one later sign-in needed a Resend because the code had expired, not because of Continue | /signin and /invitation/<token> |
| NEW-R3 (member Decide row does not refresh; approver "Unknown") | Row refresh PASS for the approver (Approved / Rejected shown at once). Approver shows "QA1015 Member", not "Unknown". Owner's list needs a reload to show the decision (BLD-B-048) | /build/21/approvals |
| NEW-R4 (keyboard move leaves counts stale, owner) | REPRODUCED on project 21: Todo 4 / In progress 1 stay after the move until reload (BLD-B-049) | /build/21/issues |
