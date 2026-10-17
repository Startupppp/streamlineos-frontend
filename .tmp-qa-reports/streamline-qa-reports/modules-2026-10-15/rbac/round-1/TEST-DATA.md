# RBAC round 1 - test data (2026-10-15)

Site: https://www.streamlineos.in. Org "ADitay CAhala" (owner = Aditya Challa's account, signed in in the main window).
Project under test: "QA1015 Build R1" (key QA1015R1, project id 21), created by the owner in the Build module.
Test users (only @sharklasers.com; never real members). OTP codes and invite tokens are deliberately NOT recorded here.

| User | Email | Org role | Module access at invite | Accepted | Notes |
|---|---|---|---|---|---|
| owner | (Aditya Challa account) | Owner | n/a | n/a | main window |
| qa1015mem | qa1015mem@sharklasers.com | Member | defaults (Build = Member, all others No access) | 2026-10-14 21:38 (IST-ish, server clock) via private window, email OTP | Project member of project 21 added by owner (see below) |
| qa1015view | qa1015view@sharklasers.com | Member | preset "Viewer" (all grants cleared = No access) | 21:40 via private window, email OTP | "lowest/viewer" = Viewer preset (no org-level viewer role exists; Role dropdown offers only Member / Org Admin) |

Mailboxes: https://www.guerrillamail.com, usernames set to qa1015mem and qa1015view (sharklasers.com). Invites arrived from noreply@streamlineos.in; sign-in OTP mails from noreply@streamlineos.in ("Your sign-in code").
Seats: 9 of 10 free before invites (2 used by invites).

Invitation rows at start of round: Pending Invites 0. After sends: 2.
Private window: Chrome incognito window (second window holds the invitee sessions; both invitees share the incognito profile, so the session is switched by signing in again).
Module access at invite time for qa1015mem: default presets. Org role change test (phase 3) sets qa1015mem to Org Admin and back to Member.

## Records created or changed in round 1 (for cleanup and round 2)

| Where | Record | State at end of round 1 | Note |
|---|---|---|---|
| Org members | qa1015mem (Member, Build = Member) | Active, org role Member (restored after the Org Admin test) | keep for round 2 |
| Org members | qa1015view (Member, Viewer preset) | Active | keep for round 2 |
| Project 21 team | qa1015mem added as team member | 2 members selected (owner + qa1015mem) | keep |
| Build approvals | "RBAC R1 approval for qa1015mem" (Milestone, approver qa1015mem) | Approved | do not delete yet (round 2 may use it) |
| Build approvals | "RBAC R1 pending for B-061 check" (Milestone, approver qa1015mem) | Rejected, comment "RBAC R1 reject probe" | do not delete yet |
| Build ticket | QA1015R1-1 "QA1015 Ticket alpha" | To Do (moved to In progress and back for NEW-R4 check; restored) | ok |
| Org role | qa1015mem changed Member -> Org Admin -> Member | Member | audit log has both changes |
| Invitations | 2 invitations accepted | Pending Invites 0 | none pending |

Not recorded here: OTP codes, invitation tokens, guerrillamail passwords (none used). Owner (Aditya Challa) account: no profile or setting changed except the project team member add and the test approvals/status above.
Private window: the invitee sessions were in a Chrome incognito window; it was closed once (qa1015view session ended) and reopened for qa1015mem. The owner session stayed in the main window.
