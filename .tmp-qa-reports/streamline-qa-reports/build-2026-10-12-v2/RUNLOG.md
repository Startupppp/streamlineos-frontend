# Run log (build-2026-10-12-v2) — text evidence only (no screenshots taken)
Owner: qaown1012b@sharklasers.com | Org: QA Build Org 1012b | Site: https://www.streamlineos.in
Tool note: browser_run_code was rejected (invalid_input) for the whole run, so all steps used browser tools; status codes taken from the navigate tool's "HTTP status" line and console "Failed to load resource ... status of NNN" messages.

## 08:0x UTC — Owner account + org setup
1. guerrillamail.com: username set to qaown1012b (Set). Address then shown as qaown1012b@sharklasers.com (Scramble Address unchecked/ignored).
2. /signin: entered address -> Continue -> "Verification code / Sent to qaown1012b@sharklasers.com". "We've emailed you a 6-digit sign-in code." No error.
3. Guerrilla inbox: noreply@streamlineos.in "Your StreamlineOS sign-in code is ... expires in 10 minutes" arrived 07:58:17 (code used, not recorded here).
4. Code entered -> /org-setup ("Welcome, qaown1012b"). No error.
5. Org wizard, wrong input first: Continue with empty fields -> "Enter a workspace name." / "Select a team size." / "Select an industry." (inline, no request).
6. Correct: name "QA Build Org 1012b", team 11–50, industry IT Services -> Continue. Modules: Build pressed (aria-pressed), others off. Continue. People: Skip for now -> "Build my organization" -> /dashboard. Toast "Welcome to your organization!".
7. Dashboard header switcher = "QA Build Org 1012b"; /build/projects header switcher = "Organization" (see NEW-10).
8. Console 404 on https://api.streamlineos.in/public/feedbucket/.../config on every page load (feedback widget config) — noted in UX.

## 08:0x UTC — Second member address + invite (owner side)
9. Guerrilla name switched to qamem1012c (Set) -> qamem1012c@sharklasers.com.
10. /settings/users (Members & access) > Invite User. Wrong first: "not-an-email" -> alert "Enter a valid email address" (no request, dialog stays).
11. Correct: qamem1012c@sharklasers.com, preset "Build Member" -> Send invitation -> "Invitation sent!" (console: no error for this call).
12. Note: /settings/members returns HTTP 404 (real route is /settings/users).

## 08:1x UTC — Build > Projects
13. Projects list initially showed only "My First Project" (MYF-6FC, auto-created).
14. New Project wizard, step 1 empty + Next -> "Name must be at least 2 characters" and "Key must contain only uppercase letters (A–Z) and numbers".
15. Name "A", key typed "qa-1!" -> key field auto-became "QA1" (lowercase upper-cased, "-" and "!" silently stripped), but the Key alert text stayed "Key must contain only uppercase letters (A–Z) and numbers" although the value was now valid (stale error).
16. Correct: name "QA Project Alpha", key "QAB", Scrum type, Blank template, Features default, Workflow "Simple", Team (owner), Review -> Create Project. Page navigated to /build/7 "QA Project Alpha" (key QAB, overview with 0 issues). Projects list then showed QA Project Alpha (QAB) on return.
17. BUG-04 reconfirm: second wizard "QA Project Beta", key QAB, all steps, Create Project -> console: "Failed to load resource: ... status of 409 () @ https://api.streamlineos.in/build:0". Wizard jumped to Step 1 "Basics" with inline alert: "A project with key "QAB" already exists in this organization." (Step reset confirmed; no toast.)
18. Companion overlay: Next clicks on wizard step 1 needed repeated clicks/time before the step advanced (see NEW-08; overlay "Meet Companion" dialog present at bottom-right of page).

## 08:4x–09:1x UTC — Project QA Project Alpha (/build/7, key QAB), Issues
19. /build/7/issues: empty state "No tickets yet" / "Create your first ticket to get started tracking work." Views: Board (pressed), List, Table, Calendar, Timeline, Workload. Controls: Search..., Add filter, Hide done (pressed), Saved views, Display options, Save view, Summarize, Import / Export, Log time, Create Issue.
20. Create Issue dialog fields seen: Issue title (max 200), Suggest title (disabled until text), Improve description, Set status (To Do), Set priority, Set assignee, Story points (pts), Set labels, Set cycle, Attach (up to 10 files, 2.0MB each), Add related links, Create more switch, Create issue. NO visible Type / Reporter / Due date / Parent fields in the create dialog (set later on ticket detail).
21. Empty title + Create issue -> no visible message, nothing created.
22. Title 201 chars -> inline "Title must be 200 characters or fewer" (blocked, no POST).
23. Story points -5 -> inline "Enter a whole number between 0 and 100". Story points 1000000000 -> same inline message.
24. BUG-06 reconfirm (the important bit): with 1000000000 still in the field and the inline message visible, Create issue submitted anyway (dialog closed, ticket QAB-1 created). Ticket detail shows Points spinbutton value "0". => inline validation is not enforced on submit and value is coerced to 0 silently.
25. Ticket QAB-1 created with title `"><img src=x onerror=alert(1)> XSS-title`. Rendered as literal text in board card, ticket heading and "Edit title" (no <img> element, no alert observed).
26. NEW-09 (Points persist) NOT reproduced: on QAB-1 Points typed -5 + Tab -> field showed -5 but after reload Points = 0 (rejected/coerced). Then typed 8 + Tab -> reload -> Points = 8 and History shows "qaown1012b estimate changed 8 just now". So Points persists when a valid value is committed on the detail page in this run.
27. NEW-06 reconfirm: earlier runs showed 500-char title saved on detail; this run: Edit title -> Ctrl+A + Enter kept title unchanged (the 250-char attempt was not typed due to ref lag; NOT re-verified in this run).
28. Comment XSS/markdown: posted `<svg onload=alert(1)> **bold** _it_ [x](javascript:alert(1))`. Rendered: "<svg onload=alert(1)>" as literal text, bold + italic rendered, link "x" with empty href (javascript: URL stripped). Good.
29. Comment Edit (icon "Edit comment") then Escape: after reload the stored/displayed comment body is "**bold** _it_ [x](javascript:alert(1))" — the leading "<svg onload=alert(1)>" text is gone and markdown no longer renders. Edit path altered the body without an explicit save (needs one clean repro; flagged).
30. Dashboard showed "Recent Activity" entries; History panel shows "created this ticket" and "estimate changed".

=== CONTINUATION (owner only), started ~09:2x UTC ===
Plan: owner sign-in again via Guerrilla name qaown1012b; sprints/backlog; filters; bulk tickets via CSV import (if available) for pagination; archive/delete; ticket fields; board DnD with Computer tool; concurrency; BUG-09/NEW-06 retest; NEW-13 repro; XSS in labels/project name/description/sprint/comments.

## C1. Owner re-sign-in (~08:17 UTC)
- Member session could not be signed out via UI (/api/auth/signout and /signin both kept member session -> /org-setup). Cleared streamlineos.in site data via chrome://settings/content/all (Delete), as authorised for clearing site data. Re-signed in as qaown1012b via OTP (code arrived 08:17:47). Landed on /dashboard, org QA Build Org 1012b.

## C2. Cycles (sprints) — /build/7/cycles (UI label "Cycles"; sidebar "Backlog" has no sprint section)
- Empty state: "No cycles yet" / "Create your first cycle to start planning work in time-boxed iterations." / button "Create First Cycle". Header button "New Cycle".
- Create Cycle dialog fields: Name, Description (0/500), Capacity, Start Date, End Date; buttons Cancel / Create Cycle.
- WRONG first: empty Name + Create Cycle -> "Name is required", "Start date is required", "End date is required" (inline, no request).
- WRONG: Capacity -3 -> "Capacity must be a whole number of points".
- Date pickers: End picker disables all days before Start (Oct 15 click with start Oct 20 = no selection). So end-before-start is blocked in the picker itself. Valid: 20 Oct -> 22 Oct 2026.
- Name XSS `<svg onload=alert(1)> "><img src=x onerror=alert(1)>` stored; rendered as literal text in list, link and actions menu label. No dialog observed.
- Capacity typed "20": field displayed "0" once (typing artifact in this run; retyped "15" OK). Not conclusively a bug.
- Valid create: toast "Cycle created"; appears in list immediately as Draft, "20 Oct 2026 — 22 Oct 2026 · 0/0 done · 15 capacity".
- Start an EMPTY cycle: row menu (Open, Copy link, Plan work, Edit, Start, Delete) -> Start -> confirm dialog "Start cycle? This cycle will become the active cycle for the project." -> Start. After click the list still showed "Draft" (no in-place update); after reload it shows "Active". => NEW-17 (Low): cycle status change not reflected in list until reload.
- Import: CSV import dialog (Issues > Import / Export > Import tab) — see below.

## C3. Bulk ticket creation via Import (for pagination + filters)
- Import dialog: File input, Format (CSV/JSON), On failure ("Import all or nothing"), Dry run, Import, Start over; Export tab exists.
- Column mapping: labels and due_date are "Not importable" (no label/due-date import). Dry run message for labels: "\"labels\" is not an importable field" (the rows still reported errors).
- WRONG input (bad-3.csv: empty title, points -5, type/priority lowercase): dry run -> "Nothing to import — 4 rows need attention"; row errors: "Title is required"; "Too small: expected number to be >=0"; raw zod text "Invalid option: expected one of "EPIC"|"STORY"|"TASK"|"BUG"; Invalid option: expected one of "LOW"|"MEDIUM"|"HIGH"|"URGENT"". Header count says 4 rows but lists 3 (minor). Raw validation text leaks to user (UX).
- Status column: "To Do", "In progress", "In review" each rejected in dry run ('"In progress" is not a status configured on this project') although the board shows these column names (NEW-18, Medium: import status names don't match board column names). Import worked when status column omitted.
- Valid 35 rows (types TASK/BUG/STORY/EPIC): dry run "35 rows ready to import" -> Import -> board/table show QAB-2..QAB-36 minus every 4th (QAB-4,8,...,36 = the 9 EPIC-type rows) are NOT visible in Board or Table. Total Todo column count 36 but only 11 cards rendered in board. (NEW-19: EPIC-type tickets silently absent from Issues Board/Table; no indication.) To confirm: check whether epics appear anywhere else.
- Second import 40 rows (TASK/BUG/STORY) -> total 76 tickets, 67 visible in Table.
- Table pagination: "Showing 1–50 of 67", page button "1", Next button -> "Showing 51–67 of 67", page "2", 17 rows, no duplicates. PASS.

## C4. BUG-09 retest (QAB-2 ticket detail, ~13:5x IST)
- Clicked title "Bulk pag item 01" (edit mode, "Done editing" appears). Typed "BUG09 unsaved edit" (no Done editing click). Reloaded the page.
- Result: no beforeunload dialog observed (dialog listener captured nothing), no warning. After reload title = "Bulk pag item 01" (edit lost). Confirms BUG-09 (still OPEN).

## C5. NEW-06 retest (ticket detail title limit)
- In title edit mode, fill 300 chars "N"x300. Input maxlength attribute = 500; accepted 300 chars; no inline error. Clicked Done editing -> "Saving" then saved. After reload the heading has 300 chars.
- Create Issue dialog enforces 200 ("Title must be 200 characters or fewer"). Confirms NEW-06 (still OPEN, Low): detail accepts up to 500 and stores 300; create caps at 200.
- Side effect: QAB-2 title is now a 300-char "N" string (test data). Done editing button not reachable after reload (edit mode not restored).
