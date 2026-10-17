# RBAC round 2 - test data (2026-10-15)

Site: https://www.streamlineos.in. Org "ADitay CAhala". Owner = Aditya Challa's account (normal window). Test users are @sharklasers.com only. OTP codes and invite tokens are not recorded anywhere in this folder.

## Accounts used

| Account | Email | Org role at start | Org role at end | Module/workspace state at start | State at end |
|---|---|---|---|---|---|
| owner | (Aditya Challa account) | Owner | Owner | n/a | n/a (no profile or setting changed) |
| qa1015mem | qa1015mem@sharklasers.com | Member | Member | Build = Member (project 21 member), other modules No access | Unchanged |
| qa1015view | qa1015view@sharklasers.com | Member | Member | Viewer preset: Build toggle ON but no Build workspace membership; no other grants | Build workspace membership removed (was not a member at start). Build module toggle back to ON (as at start). Org role Member (restored) |

Mailboxes used: guerrillamail inbox names qa1015mem and qa1015view (sharklasers.com). Sign-in codes read from the inbox and typed; not written down.

## Changes made in round 2 (all for the RBAC checks)

| Time (IST, approx.) | Where | Change | Restored |
|---|---|---|---|
| ~20:10 | Members & access > qa1015view | Org role Member -> Org Admin (Save) | Yes, Org Admin -> Member (Save, verified after reload) |
| ~20:15 | Build settings > Access & Members | qa1015view added as workspace member, role Member | Removed via "Remove from workspace" (confirmed) |
| ~20:20 | Members & access > qa1015view > Module access | Build toggle went off as a side effect of the workspace removal | Turned back on (aria-checked true) |

## Not created, not sent, not removed

- No custom role created (not possible in the UI, see RBAC-B-007). Custom roles = 0 before and after.
- No invitations sent. Pending invites = 0 before and after.
- No real member removed or suspended. No member was archived or deleted.
- No approvals created, decided or deleted in round 2. Round-1 approvals ("RBAC R1 approval for qa1015mem", "RBAC R1 pending for B-061 check") were not touched.
- No tickets, issues, releases, milestones or leave requests created.
- The wiki page "QA1015R2-import-xss" (from another test) was only listed, not opened.

## Records found during round 2 (not created by this run)

- Build project 21 "QA1015 Build R1" (key QA1015R1) still exists; members: owner and qa1015mem.
- Other QA data present in the org: qa1015r2pay (Member, "QA Probe Pay"), qa1015emp (Member, "QA Emp"). Not used in this round; not changed.
- Owner's "Important Alerts" for qa1015mem included "Your role or permissions were updated: Your organisation role is now MEMBER" (from round 1 changes).
