# RBAC round 2 - coverage (2026-10-15)

## Roles covered

| Role | Covered | How |
|---|---|---|
| Owner | Reference checks on settings, roles, members, Build access, HR, KB, calendar | Owner tab (normal window) |
| Org Admin | Settings (users, organization, roles, billing), payroll alias | Temporary Org Admin on qa1015view, then restored |
| Member | All module routes below, escalation attempts | qa1015mem (incognito) |
| Viewer | All module routes below, Build add/remove, org role change, KB manage links | qa1015view (incognito) |
| Custom role | NOT covered: could not create or assign (RBAC-B-007) | Create paths checked (see BUGS.md RBAC-B-007) |

## Modules covered

| Module | Covered | Not covered / gaps |
|---|---|---|
| Org settings | Organization, Members & access, Roles, Billing (all roles); invite and change-role paths | Org Admin for /settings/roles write actions (read only checked); Viewer invite path (no UI path) |
| HRMS | /hr, /hr/leave, /hr/leaves, /hr/attendance (Member); /hr (Viewer) | Owner's HR sub-pages not re-run this round; Org Admin HR not run; /hr/people 404 not analysed |
| Payroll | /payroll and /hr/payroll alias (all roles listed) | Payroll write actions not tested (no run/approve attempted) |
| Calendar | /calendar (Member, Viewer, Owner) | Calendar create/edit by Viewer not run (Create menu only) |
| Build | Home, project 21 overview, issues, approvals, project settings, workspace access (add/remove) | Milestones/releases read-only not re-run this round (round-1 PASS); ticket detail not re-run; Build Admin role not tested |
| KB | /knowledge, /knowledge/chat, /knowledge/wiki, /knowledge/wiki/import | Ask KB answers were not tested for cross-user content; Research Briefs not opened; Templates not opened |
| Members | Invite, change role, edit org, suspend/remove (no UI path for Member/Viewer; owner paths viewed only) | Owner suspend/archive/remove not run (no real members touched) |

## Escalation attempts (step 4)

Invite (PASS), change role (PASS), edit org settings (PASS), approve leave (PARTIAL: /hr/leaves gated to onboarding; /me/time-off not run).

## Environment problems that affected coverage

- Memory on the box was very low during the run (often under 500 MB free). The incognito renderer crashed three times ("Target crashed"); each time the user session was re-signed. Some page loads were slow and needed longer waits. Re-runs were done for every affected check.
- Denial reason text changed between runs for /settings/roles (settings:view and settings:rbac:manage). Recorded as a note, not a bug.
- Tab limit: the work kept to 2 browser tabs (owner + incognito) except for about 10-20 seconds during each email-code read (3 sign-ins: mem x2, view x1). During those seconds a third tab (guerrillamail) was open in the incognito window, then closed. Reported here, not hidden.
- Mistake: twice, a browser script ran against the owner's tab instead of the incognito tab. Those calls only navigated the owner tab (settings pages, read-only) and changed nothing. The owner tab was left on about:blank at the end, the owner session is intact.
- The owner's module switcher, Create menu and "Access" list were read at each step; no owner write happened by mistake.

## Not run in round 2 (carry to round 3)

- Owner-side check of qa1015view with custom role (blocked, see above).
- Full Org Admin sweep of HR, KB and Build.
- Member: /me/time-off and /me/team approval paths (leave approval).
- Viewer: Build project 21 with Build Member role (after the add) was only loaded at project-home level.
- Re-verify the Viewer's /build denial text after the Build toggle was restored to ON (expected build:view, not verified).
- Mobile viewport: not run.

## Summary

- Round-1 bugs rechecked: 4 (B-002 fixed; B-001, B-003, B-004 still open).
- New bugs: 4 (RBAC-B-005 Medium, RBAC-B-006 Low, RBAC-B-007 Medium (confirm), RBAC-B-008 Low).
- Custom role run: BLOCKED.
