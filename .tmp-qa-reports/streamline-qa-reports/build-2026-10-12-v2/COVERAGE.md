# Coverage — build-2026-10-12-v2 (Build module QA, owner-authorized)

## Accounts (addresses)
- OWNER: qaown1012b@sharklasers.com (org "QA Build Org 1012b", Build enabled)
- MEMBER: qamem1012c@sharklasers.com (invited as "Build Member" preset; invite email received 08:02:12 UTC; acceptance NOT completed — see Blocked)

Site: https://www.streamlineos.in | Date: Mon Oct 12 2026, 07:57–09:2x UTC | Tabs used: 2 (Guerrilla + StreamlineOS)
Evidence: text only (URLs, steps, HTTP/console status codes, exact messages). No screenshots were kept. Step log: RUNLOG.md.
Tool note: browser_run_code was rejected ("invalid_input") for the whole run; all steps used browser tools. Separate incognito context was NOT available with these tools, so the member session was done sequentially in the same browser profile (owner was signed out before member sign-in; owner was not re-signed in afterwards).

## Tested (this run)
- Owner sign-in via email OTP (/signin -> "Verification code / Sent to qaown1012b@sharklasers.com" -> code accepted -> /org-setup). PASS.
- Org setup wizard: empty-field inline messages; Build enabled (aria-pressed); People step skipped; "Build my organization" -> /dashboard. PASS (with NEW-10 note).
- Members & access: Invite User validation ("Enter a valid email address"); invite sent ("Invitation sent!"). PASS.
- Projects: wizard step-1 validation ("Name must be at least 2 characters", "Key must contain only uppercase letters (A–Z) and numbers"); create QA Project Alpha (QAB) PASS; duplicate key QAB -> 409 (BUG-04 reconfirmed).
- Issues (project /build/7/issues): empty state; Create Issue dialog: title limit (201 chars -> "Title must be 200 characters or fewer"); story points -5 and 1000000000 -> "Enter a whole number between 0 and 100" but ticket still created with Points 0 (BUG-06 reconfirmed); XSS payload title rendered as literal text.
- Ticket QAB-1 detail: Points edit (-5 -> 0 after reload; 8 -> 8 after reload); History shows "estimate changed 8"; Type/Priority/Labels/Reporter/Schedule (Set due) visible; Title edit commit.
- Comments: add with `<svg onload=alert(1)>` + markdown (bold/italic rendered, javascript: link stripped); Edit then Esc altered the stored body (NEW-13, needs repro).
- Attachments: qa-test.exe via comment "Attach files to ticket" -> toast "Failed to attach qa-test.exe. Try again." (POST /build/7/files -> 400).
- Sign-out (Account menu > Sign out) and signed-out access: /build/7/issues -> 302-equivalent redirect to /signin?callbackUrl=%2Fbuild%2F7%2Fissues. PASS.
- Member invite email: read (Guerrilla), invite link https://www.streamlineos.in/invitation/<token> opened as member -> redirected to /org-setup (NOT accepted).
- Member OTP sign-in: code arrived in ~1 min; signing in lands on /org-setup "Welcome, qamem1012c" (no org joined).

## Partially tested / could not verify
- Board drag-and-drop: browser drag (QAB-1 Todo -> In progress) did not move the card in 2 attempts (tool limitation or bug; not conclusive). Column reorder handle "Drag to reorder column" present.
- Board WIP limits / swimlanes: not seen in UI yet; not tested.
- BUG-09 (unsaved edits lost on reload): not re-run this run (ref churn). Last run: still open.
- NEW-06 (title 200 vs 500): not re-run this run.
- NEW-04 (new project missing in list until reload): not reproduced: after Create the app navigated to /build/7 and the list showed the new project on return. In-place list refresh not isolated.
- NEW-08 (companion overlay over Next/date picker): wizard Next clicks needed retries in this run; no clean repro with error text captured.
- NEW-02 (stale cookie /signin hang): not tested (no stale cookie set up).
- BUG-08 create-dialog .exe path: not re-run this run (the detail/comment path was tested).

## Not tested (blocked or out of time)
- Projects: edit, archive, delete, settings tab, members/roles per project, project-level permissions.
- Tickets: type/status/priority/assignee/reporter/due date/labels/sprint/parent-subtask/links fields (only partly visible); attachments size and many-files; comment delete and long-text; history beyond basic entries; ticket delete.
- Board: filters, sort, combined filters, search with no results, filter persistence after reload (only Board view reached; List/Table/Calendar/Timeline/Workload not opened).
- Sprints/backlog: create, start, complete, overlapping dates, empty sprint, past due dates.
- Sidebar Build pages (Overview, Products, Portfolios, Programs, Teams, My Work, Inbox, Search, All work, Settings): not walked in this run beyond Projects/Issues.
- Pagination with 30+ items: not reached.
- Permissions as member (edit/delete owner items, direct URLs, IDs): NOT tested — member did not get into the org (see NEW-16).
- Concurrency (two tabs, double-click submit, back button): not tested.
- XSS in every field (org name, project name/description, labels, search, comment edit): only title/comment/project-name paths touched.

## Blocked
- Member acceptance: invite link opened while member signed in -> redirected to /org-setup; invite not applied. Next step for owner/parent: re-send invite or confirm the expected acceptance path for a user who has no org (see NEW-16).
