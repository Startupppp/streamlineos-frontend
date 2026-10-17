# Coverage — build-2026-10-12

## Tested (and where)
- Auth: fresh Guerrilla address; OTP send (200 on first try, and 200 again on re-send after sign-out); OTP verify; sign-out; sign-in again; invited second member accepted (invitation -> OTP -> /post-invite -> dashboard -> Build projects visible); sign-out of invitee.
- Stale-cookie / clear site data: /signin rendered normally at start, so the clear-site-data path was NOT exercised (NEW-02 COULD NOT TEST).
- Org setup: empty Team size + Industry inline validation (no network request); fill + Enable Build (HR left off); "Build my organization" -> 201 on /org/setup/complete; /dashboard and /build reloaded twice each (no loop to /org-setup).
- Dashboard: "HR is not enabled" text not present (HR never selected).
- Build pages loaded without crash: Command Center (/build/command-center), Projects list, Teams, All Work, project overview (/build/2 and /build/5), Issues board, Issues list, Issues table/list view, ticket detail (QAB-1, QAB-2, QAB-3, QAB-5), Members & access (/settings/users).
- Projects: create via 7-step wizard (QAB, QAG), duplicate key QAB (inline error + 409 on Create), date picker End-before-Start.
- Issues: create (with story points -5, 1e9, 8), create-dialog double-click, 3000-char title (create dialog), .exe attach (create dialog and ticket detail), status/priority change, list filter by status, title edit (Enter vs no-commit), description edit (blur vs no-commit).
- Teams: create two teams (QTA, QTB), list refresh timing, XSS payload in team name and search.
- Members: invite second temp email (Build Member preset), acceptance.
- XSS: `"><img src=x onerror=alert(1)>` in team name (rendered as text) and in team and issue search boxes (no dialog).

## Skipped / not tested
- NEW-02 (stale cookie hang) — no stale session occurred at the start of this run.
- NEW-03 (OTP send error message) and the 503/429 retry loop — no 503/429 occurred; the 2-minute retry plan was not needed.
- Board drag-and-drop between columns; priority filter; assignee/labels/cycle filters; due-date (ticket level) end-before-start; Calendar, Timeline, Workload, Inbox, My Work, Products, Portfolios, Programs, Build settings.
- Attachment of a valid image (positive path) — not tested.
- Duplicate project/team key via the Teams dialog (Teams key uniqueness) — not tested.
- Browser crash ("Aw, Snap") — no crash seen on any page above; no crash-specific reproduction attempted (e.g. rapid navigation).
- Unsaved-changes warning on navigation: beforeunload prompts were not observed on the edit paths tested (only on leaving the Create-issue dialog in one case, which the harness auto-accepted).

## Environment notes
- Guerrilla Mail sign-in address used: zcgb2t+fj92io62eo1os@sharklasers.com (owner). Guerrilla's inbox header later displayed a different alias in one reload, but the OTP mails kept arriving in the same inbox.
- Second invitee address: zcgn6k+gjd19sbhusf15ntfx8ptg@sharklasers.com (Guerrilla; its session is still the open temp-mail tab).
- Test data left in org "QA Build Org 1012": projects QAB (QA Project Alpha, 6 issues incl. QAB-2 with 500-char title), QAG (QA Project Gamma), QDT attempt not created; teams QTA, QTB, XSS1; invitee account (accepted).
- Only one StreamlineOS tab and one Guerrilla Mail tab are open.
- The invitation link token was used once for the test and is not stored in these reports.
