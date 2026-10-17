# Build module bugs — build-2026-10-13
Site: https://www.streamlineos.in | Owner: qaown1012b@sharklasers.com | Member: qamem1012c (Build Member on /build/7) | Org Admin+Build Admin: qaadm1012d | Viewer (no Build): qaview1012e
Evidence: text only (URLs, steps, HTTP/console status, exact messages). NO screenshots taken (per instruction).
Prior results read first: build-2026-10-12-v3/RETEST.md, RBAC.md. Fixed items are not re-filed.
Entries are appended as found. IDs B-001...

## B-001 — Double-click on "Create issue" creates duplicate tickets (High)
**Severity:** High — silent data duplication on a common action (double-click is routine); users must find and delete extra tickets, and counts/cycles/reports are inflated. Reproduced today; prior item BUG-05 (not previously fixed) still open.
**Area / URL:** Create Issue dialog — https://www.streamlineos.in/build/7/issues?create=1 (Board view, QA Project Alpha)
**Preconditions / account:** Owner qaown1012b (Owner role). Any role with create rights reproduces (Org Admin/Build Admin qaadm1012d too).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?create=1.
2. In "Issue title" type `DBLCLICK-0913 double submit`.
3. Double-click the "Create issue" button (one physical double-click).
4. Observe network and then search `DBLCLICK` on /build/7/issues?q=DBLCLICK.
**Expected:** Exactly one ticket is created. The button is disabled while the request is in flight (or the second click is ignored).
**Actual:** Two `POST https://api.streamlineos.in/build/7/tickets` requests, both `201`. Two tickets created: **QAB-83** and **QAB-84**, both titled "DBLCLICK-0913 double submit", both Todo/Medium/Task. The dialog closes after the first response; no duplicate warning.
**Frequency:** 1/1 on this run with dblclick (reproducible; double-click timing sensitive).
**Impact:** Duplicate work items in the backlog and board; inflated counts; the user may not notice and both get assigned.
**Suggested fix:** Disable the "Create issue" button and set an in-flight guard (ref/state) synchronously on first click; use an idempotency key per dialog session so a retried POST returns the same ticket; keep the dialog open until one 201 is received.
**Test data:** QAB-83 and QAB-84 (see TEST-DATA.md).

## B-002 — Bidi-override and zero-width control characters accepted in ticket titles (Low)
**Severity:** Low — title spoofing / confusing display; not script execution. Can make a title read differently from its stored text in lists and emails (Trojan-Source style).
**Area / URL:** Create Issue dialog — https://www.streamlineos.in/build/7/issues?create=1
**Preconditions / account:** Owner qaown1012b.
**Steps:**
1. Open Create Issue; in Issue title enter `🚀 Émoji 日本語 مرحبا 👩‍👩‍👧 e\u0301 \u202Ertl-test \u200B zero` (contains U+202E RIGHT-TO-LEFT OVERRIDE and U+200B ZERO WIDTH SPACE).
2. Click "Create issue".
**Expected:** Invisible bidi overrides/zero-width characters are stripped (or rejected with "Title contains invisible characters"). Emoji, CJK, Arabic and combining marks are kept.
**Actual:** Create returns `POST https://api.streamlineos.in/build/7/tickets` `201`. Stored and rendered title keeps U+202E and U+200B (the `‮` and `​` characters are present in the board card). Emoji, CJK, Arabic and combining marks round-trip correctly (QAB-82).
**Frequency:** 1/1.
**Impact:** A title can visually appear as reversed or different text in board cards, search results and notifications.
**Suggested fix:** Strip Unicode category Cf bidi controls (U+202A–U+202E, U+2066–U+2069) and zero-width joiners not needed for emoji on save (server and client); or reject with an explicit message.
**Test data:** QAB-82 (see TEST-DATA.md).

## B-003 — Double-click on "Post comment" posts the same comment twice (Medium)
**Severity:** Medium — duplicate comments in the activity feed and notifications; easy to trigger; no data loss.
**Area / URL:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-84 (Activity section)
**Preconditions / account:** Owner qaown1012b (Owner). Any role that can comment.
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. Click the "Comment input" box and type `DBL comment 0913 🎉`.
3. Double-click the "Post comment" button.
4. Reload the page and read the Activity section (count and list).
**Expected:** One comment is posted. The button is disabled while the post is in flight, or the second click is ignored.
**Actual:** Activity count goes from (0) to (2). Two comments with identical body `DBL comment 0913 🎉` appear, both by qaown1012b, both "just now". Same result after reload (persisted, not a UI-only duplicate). The composer is cleared only after the first post completes.
**Frequency:** 1/1 (double-click). A single click posts once (verified with a separate single-click post).
**Impact:** Duplicate notifications to mentioned/watching users; cluttered thread; users may delete the duplicate manually.
**Suggested fix:** Same in-flight guard as B-001: disable "Post comment" and ignore Ctrl+Enter while a request is pending; clear the composer synchronously on the first submit (restore on failure).
**Test data:** Comments on QAB-84 (PROBE, DBL x2, LONG) — see TEST-DATA.md.

## B-004 — Ticket detail controls have no accessible names (Status, Priority, Type, Points, Epic, Workstream, Cycle, Customer) (Medium, a11y)
**Severity:** Medium — WCAG 4.1.2 / 1.3.1 failure: screen-reader users hear an unnamed combobox or a value ("0") instead of the field name; voice-control "click Priority" fails.
**Area / URL:** Ticket details side panel — https://www.streamlineos.in/build/7/tickets/QAB-84 (Details panel)
**Preconditions / account:** Owner qaown1012b; any ticket.
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. Read the accessibility tree of the "Details" complementary panel (e.g. browser_snapshot or ariaSnapshot).
**Expected:** Each control is named by its visible label: "Status", "Priority", "Type", "Points", "Epic", "Workstream", "Cycle", "Customer", "Parent", "Start date", "Due date".
**Actual:** The visible labels "Status", "Priority", "Type", "Epic", "Workstream", "Cycle" are not associated with their controls: `combobox` (Status, with value "To Do" as child text, no name), `combobox` (Priority), `combobox` (Type), `combobox "None"` (Epic, Workstream, Cycle), `spinbutton "0"` (Points — the name is the current value, not "Points"), `button "None"` (Customer). The "Set start"/"Set due" buttons do not name the field they belong to.
**Frequency:** 100% on the ticket detail page.
**Impact:** Screen-reader and voice-control users cannot identify the fields; keyboard users hear "combobox" with no context.
**Suggested fix:** Use `<label for>` or `aria-labelledby` pointing at the visible label text for each control (and for Points: aria-label="Points"); name the date buttons "Start date: Set start".
**Test data:** None.

## B-005 — Search text over ~255 characters replaces the whole board with "Something went wrong" (Medium)
**Severity:** Medium — one paste into the board/list search breaks the entire issues view (no tickets visible, search box disappears); the only way out is to edit the URL or navigate away. Common in practice (users paste whole sentences/stack traces).
**Area / URL:** Issues search — https://www.streamlineos.in/build/7/issues (Board, List, Table all share it)
**Preconditions / account:** Owner qaown1012b; any role with view access.
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues.
2. Click the "Search..." box and type or paste 256 or more characters (for example 600 × `y`).
3. Wait for the results area.
4. Observe the result; then try to clear the search (click the box and empty it).
**Expected:** Either the input is capped (maxlength with a visible hint such as "Search is limited to 255 characters") or a search over-length gives a field-level message; the ticket columns stay visible and the input stays usable.
**Actual:** Network `GET https://api.streamlineos.in/build/7/tickets?limit=100&orderBy=rank&orderDir=asc&search=yyyy…` → **HTTP 400**, console `ApiError: Validation failed.` The whole main area shows "Something went wrong / An unexpected error occurred. Please try again. / Try Again"; the search box is gone; URL becomes `/build/7/issues?q=yyyy…`. 100 characters works (no-match state); 200 works; 256 fails. Reloading the same URL shows the same error. Clear-the-box recovery is not possible because the search input unmounts.
**Frequency:** 3/3 at 256+ characters; 2/2 at 600 characters.
**Impact:** A pasted sentence hides all work in the project; users may think tickets were deleted.
**Suggested fix:** Set `maxlength` on the search input (match server limit, e.g. 200) with a visible counter; keep the input mounted on error and show an inline message ("Search is too long"); or truncate the query client-side before the request. Server should return 400 with a field error the client maps to the search box rather than a page-level error.
**Also reproduced on All Work** (https://www.streamlineos.in/build/all-work): typing 300 × `q` into its search → `GET https://api.streamlineos.in/build/all-work?limit=50&search=qqq…` → **400**; page shows "All Work Error / Failed to load work items. / Try Again" (the search box stays on that page only after reload, and the error replaces the list).
**Test data:** none created.

## B-006 — Search treats `%` and `_` as SQL-LIKE wildcards (Low)
**Severity:** Low — wrong search results (users searching for literal punctuation get everything or unexpected matches). Not an injection (results still scoped), but a correctness bug in search.
**Area / URL:** Issues search — https://www.streamlineos.in/build/7/issues?q=%25 (encoded `%`) and `?q=_`
**Preconditions / account:** Owner qaown1012b.
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?q=%25 (search `%`).
2. Open https://www.streamlineos.in/build/7/issues?q=_ (search `_`).
3. Open https://www.streamlineos.in/build/7/issues?q=Bulk%25item (search `Bulk%item`).
4. Compare with a nonexistent term https://www.streamlineos.in/build/7/issues?q=zzqqxx.
**Expected:** `%` and `_` are literal characters. Searching `%` finds only titles containing a percent sign (none exist), so the "No tickets match your filters" empty state appears. `Bulk%item` finds nothing.
**Actual:** `q=%` shows the full board (Todo 80 cards); `q=_` also shows Todo 80; `q=Bulk%item` returns the "Bulk pag item NN" tickets (Todo 32, 13 cards). `q=zzqqxx` correctly shows "No tickets match your filters". Behaviour shows the query is passed to a LIKE pattern without escaping.
**Frequency:** 3/3.
**Impact:** Searching for literal `%`, `_` (e.g. "50%", "snake_case") returns wrong results and users can't find tickets by such text reliably.
**Suggested fix:** Escape `\`, `%` and `_` in the search term server-side before building the LIKE/ILIKE pattern (or use a full-text/`position()` match).
**Test data:** none.

## B-007 — Project name of spaces only is saved; the empty-name check is bypassed (Medium)
**Severity:** Medium — the server stores a blank project name, so the project appears nameless in the sidebar, the project list and the header; users cannot identify it. The UI already blocks the empty string, so the check is inconsistent.
**Area / URL:** Project settings > General — https://www.streamlineos.in/build/7/settings
**Preconditions / account:** Owner qaown1012b (Owner). Project Admin / Build Admin also has settings edit (build:update) and should be checked the same way.
**Steps:**
1. Open https://www.streamlineos.in/build/7/settings (General tab).
2. Clear "Project Name" and type three spaces `   `.
3. Click "Save Changes".
4. Reload https://www.streamlineos.in/build/7/settings and read the "Project Name" field.
**Expected:** The save is blocked with "Project name is required" (same as the empty string), or the value is trimmed and rejected as empty. The stored name is never blank.
**Actual:** Empty string: client shows "Project name is required" and sends no request. Three spaces: `PATCH https://api.streamlineos.in/build/7` → **200**, toast "Project settings updated". After reload the Project Name field is **empty** (`""`), i.e. the project is saved with a blank name. Restored afterwards to "QA Project Alpha" (PATCH 200).
**Frequency:** 2/2 (reproduced in two separate saves).
**Impact:** Nameless project in the sidebar, project list and switcher; Board/URL still work by key, so data is not lost, but the project is hard to find and looks broken.
**Suggested fix:** Trim the name on the client and server before the required check (`name.trim().length >= 2`), reject whitespace-only with the same message on Save, and enforce the same rule server-side (400 with field error).
**Test data:** None left (name restored to "QA Project Alpha", verified after reload).

## B-008 — Ticket timer: "Stop" discards the tracked time silently; only "Save" while running is kept (Medium)
**Severity:** Medium — time-tracking data loss with no message. Users who press Stop (the natural action) lose the time and nothing is saved.
**Area / URL:** Ticket Details > Time Tracking — https://www.streamlineos.in/build/7/tickets/QAB-84
**Preconditions / account:** Owner qaown1012b. Any role that can log time on the ticket (Member with Build Member on the project to be checked).
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. In "Time Tracking" click **Start**. Wait about 4 seconds (timer shows 00:04). Buttons now read "Stop" and "Save".
3. Click **Stop**.
4. Observe the Time Tracking block; then reload the page.
**Expected:** Stop pauses the timer and keeps the elapsed time with a visible Save/Log action (or auto-logs it), or asks "Discard 00:04?" before discarding.
**Actual:** After Stop the block shows `Log 00:04 / Start` and the **Save button disappears** (no way to save what was tracked). No network request is sent (`POST .../time-entries` not made). After reload Time Tracking shows `00:00`. The 4 seconds are lost. Only "Save" pressed while the timer is still running creates the entry (`POST https://api.streamlineos.in/build/7/tickets/95/time-entries` → 201, timer reset to 00:00).
**Frequency:** 2/2 Stop-then-reload tests lost the time; 1/1 Save-while-running succeeded.
**Impact:** Lost billable/tracked time; users may not realize it because there is no toast.
**Suggested fix:** Keep Save visible after Stop (paused state) until saved or explicitly discarded with a confirm; or make Stop call the same save path as Save; show a toast "Time entry saved (00:04)".
**Test data:** One time entry of 00:04 created on QAB-84 (ticket internal id 95) via Save-while-running — see TEST-DATA.md.

## B-009 — "Log time" button in the project header opens a dead-end "Module not enabled: Timesheets" page (Low)
**Severity:** Low — a primary action in the Build project header leads to a page that says the module is off; for Members the page offers no way to fix it. Confusing navigation.
**Area / URL:** https://www.streamlineos.in/build/7/issues (header "Log time" link) → https://www.streamlineos.in/timesheets?projectId=7
**Preconditions / account:** Owner qaown1012b; org where Timesheets module is not enabled (current org).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues.
2. Click the "Log time" link in the project header (href /timesheets?projectId=7).
3. Observe the page.
**Expected:** The "Log time" link is hidden when the Timesheets module is off, or the page offers the Build time-log form for this project.
**Actual:** Page shows heading "Module not enabled", "Timesheets is not enabled for your organisation. An administrator can turn it on in settings.", buttons "Enable Timesheets", link "Manage Modules" (/settings/modules). Build-level time logging is available only from the ticket's Time Tracking block, so the header link is misleading.
**Frequency:** 1/1 (reproducible every time).
**Impact:** Users believe time logging is broken; Members are told to ask an admin (dead end).
**Suggested fix:** Hide or disable "Log time" when Timesheets is off, or route it to the project's time-log view; show the Enable CTA only to users who can enable modules.
**Test data:** none. Did NOT click "Enable Timesheets" (org-level billing/module change, out of scope).

## B-010 — CSV import accepts story points above 100 (101 stored); dry run marks the row "ready" (Medium)
**Severity:** Medium — a validation bypass: the create dialog and the ticket detail reject points outside 0–100 (BUG-06 fixed), but bulk import stores 101 points. Corrupts velocity/capacity numbers used by Cycles and Velocity charts.
**Area / URL:** Issues > Import / Export (Import tab) — https://www.streamlineos.in/build/7/issues (dialog). Endpoints: `POST /build/7/import-export/tickets/preview` and the import request.
**Preconditions / account:** Owner qaown1012b (Owner). Any role with import permission (Org Admin/Build Admin too).
**Steps:**
1. Create a CSV `/workspace/streamline-qa/fixtures/import-edge-0913.csv` with header `title,type,priority,status,points` and rows:
   - `   ,TASK,LOW,To Do,1` (whitespace title)
   - `ab,TASK,LOW,To Do,1`
   - `Émoji 🚀 日本語 "quoted, comma",BUG,HIGH,Done,100`
   - `Good row 0913,STORY,MEDIUM,In Progress,101`
2. Open Issues > Import / Export > Import. Choose the file.
3. Click "Dry run".
4. Click "Import 2 rows".
5. Search the board/table for `row 0913`.
**Expected:** Row 5 (points 101) is listed under row errors ("Enter a whole number between 0 and 100" or "Points must be 0–100"), matching the create/detail rules. Only valid rows are imported.
**Actual:** Dry run: `2 rows ready to import, 2 skipped`; row errors list only rows 2 (`Title is required`) and 3 (`Title must be at least 3 characters`). Row 5 is "ready". Import: `POST …/import-export/tickets/preview` → 200 (dry run); import result `2 rows imported, 2 skipped`, `2 imported · 2 skipped · 0 failed · 0 rolled back`. Table shows **QAB-86 "Good row 0913" with "101 pts"**.
**Frequency:** 1/1 (deterministic: the import validator has no upper bound on points).
**Impact:** Story-point totals, cycle capacity and velocity become wrong; the same ticket can't be edited to 101 in the UI, so it looks inconsistent.
**Suggested fix:** Apply the same `points` schema (integer 0–100) in the import validator (server side, shared with create); add a dry-run error for out-of-range values.
**Test data:** QAB-85 (emoji row) and QAB-86 ("Good row 0913", 101 pts) — see TEST-DATA.md.

## B-011 — Project "Calendar" view leaves Build and shows HR/CRM/Attendance sources only; no ticket appears (Medium)
**Severity:** Medium — a primary view tab (Calendar) does not show project work at all; it navigates to the org-wide calendar module. Users looking for due dates on the project calendar see unrelated HR/CRM toggles, and the list of sources has no Build/tickets source.
**Area / URL:** Project issues view switcher — https://www.streamlineos.in/build/7/issues → "Calendar" button → https://www.streamlineos.in/calendar?source=build&projectId=7
**Preconditions / account:** Owner qaown1012b. The org has Build enabled; HR/CRM modules are not used by this org (HR was never enabled in the org setup per prior run).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues (Board is selected).
2. Click "Calendar" in the view selector.
3. Wait for "Loading calendar sources…" to finish; read the Sources row and the week grid.
4. Search the page for any QAB ticket (e.g. QAB-84 has Due date Oct 20, 2026).
**Expected:** The Build Calendar view stays in Build (URL /build/7/issues?view=calendar or similar) and shows the project's tickets on their due dates (QAB-84 on Oct 20), with a source toggle for "Build tickets" / "Due dates" and no unrelated sources for modules that are off.
**Actual:** The button changes the URL to `/calendar?source=build&projectId=7`. The page title is "Showing October 2026 Week 42", with source toggles **"Attendance events", "HR events", "CRM events"** (all pressed) and "Event sources". There is no Build/tickets source, and no QAB ticket text appears on the page. Loading `/build/7/issues?view=calendar` directly is unstable: in 1 of 3 loads it showed a page-level "Something went wrong — An unexpected error occurred" with "Try Again"; in other loads it fell back to the Board.
**Frequency:** 2/2 clicks reproduced the navigation; the direct-URL error 1/3.
**Impact:** Project planning via calendar is impossible from Build; users are sent to another module; org without HR/CRM sees toggles for modules they don't have.
**Suggested fix:** Render the Build calendar inside the project (tickets by due date, start date, cycle) and add a Build source; hide source toggles for modules that are not enabled; make `?view=calendar` a known view (or redirect to the board) and never show the page-level error for an unknown view value.
**Test data:** none.

## B-012 — Project wizard "Review & Create" (step 7) repeats step 6's copy and does not summarise the project (Low)
**Severity:** Low — wrong instructional text on the final confirmation step; the user can't check name/key/type/template/workflow before creating.
**Area / URL:** New Project wizard — https://www.streamlineos.in/build/projects → "New Project"
**Preconditions / account:** Owner qaown1012b (Owner); project creation rights (Org Admin also).
**Steps:**
1. Open https://www.streamlineos.in/build/projects and click "New Project".
2. Step 1: Name `QA Wizard 0913`, Key `QW9`, Next. Step 2: pick "Scrum Software", Next. Step 3: Next. Step 4: Next. Step 5: Next. Step 6: Next.
3. Read step 7 "Review & Create".
**Expected:** Step 7 has its own subtitle (for example "Review the details before creating the project") and a summary of name, key, type, template, features, workflow and members, so the user can confirm.
**Actual:** Step 7 subtitle reads "Choose a workflow that matches how your team works." (identical to step 6). The page shows the workflow option cards and the member list only; the chosen name "QA Wizard 0913", key "QW9" and type "Scrum Software" are not summarised anywhere on the step. Escape closed the wizard with no discard prompt (typed data lost silently).
**Frequency:** 1/1 (deterministic).
**Impact:** Users create the wrong project without a final check; confusing copy.
**Suggested fix:** Give step 7 its own heading/subtitle and a read-only summary card (name, key, type, template, features, workflow, members) with "Edit" links per section; confirm before closing with unsaved input.
**Test data:** none (wizard closed without creating).

## B-013 — Any valid image attached to a ticket makes the whole ticket page fail ("Ticket Error / Failed to load ticket details.") (Critical)
**Severity:** Critical — the ticket cannot be opened at all (no details, no comments, no Delete/Edit), and the failure is caused by a file the user just uploaded successfully. Users have no in-UI recovery path.
**Area / URL:** Ticket attachments — https://www.streamlineos.in/build/7/tickets/QAB-84 (Attach files to ticket, then reload)
**Preconditions / account:** Owner qaown1012b (Owner). Viewer/Member who can attach would hit the same path.
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. In the Activity composer use "Attach files to ticket" (the input with no accept attribute) and choose `/workspace/streamline-qa/fixtures/valid-image-0913.png` (64×64 PNG, 8.6 KB).
3. Wait for the upload. The network shows `POST https://api.streamlineos.in/build/7/files` → **201** and `POST https://api.streamlineos.in/build/7/tickets/95/attachments` → **201**. A toast/message "Failed to load ticket details." appears.
4. Reload https://www.streamlineos.in/build/7/tickets/QAB-84.
**Expected:** The ticket page loads; the new attachment appears in the "Attachments" section (thumbnail or file name). If a single attachment cannot be signed, only that item shows an error.
**Actual:** Page shows heading "Ticket Error", paragraph "Failed to load ticket details.", button "Try Again". Network: `GET https://api.streamlineos.in/storage/download?key=87496d17-…%2Fbuild%2F7%2Ffiles%2Fae98f907-72d1-4cbd-968f-fe8228e7d111-valid-image-0913.png` → **HTTP 500**. Console: `Error: ["authenticated:…", ["streamlineos","attachments","signed-url","…/build/7/files/ae98f907-…-valid-image-0913.png"]] data is undefined` (signed-url fetch returned no data), `Failed to load resource: the server responded with a status of 500`. The Attachments section listed nothing before the error. Before the upload the same ticket loaded normally.
**Frequency:** 2/2 tickets. QAB-84 (3/3 reloads) and a brand-new ticket QAB-87 ("Attach probe 0913", internal id 98): the error appeared immediately after the attach (no reload needed) with the same `storage/download` 500. Every valid PNG attach tested failed the same way; the only file-type path tested was PNG (JPEG/GIF/WebP and PDF not tested).
**Impact:** A single successful upload of a valid PNG disables the ticket for everyone who opens it. Comments, status, history and deletion are unreachable from the detail view.
**Suggested fix:** (1) Make attachment signing non-fatal: render a placeholder "Couldn't load attachment" per item and keep the ticket page up. (2) Fix the `storage/download` signed-url path for `build/<project>/files/<uuid>-<name>` keys (500 with "data is undefined" — the storage client returns no payload). (3) Check the upload→attachment linkage so the file record and signed-url key match.
**Test data:** Ticket QAB-84 now broken — see TEST-DATA.md and the cleanup note.


---
# Round 2 — same build (2026-10-13, afternoon, owner qaown1012b). Entries below were appended in one batch at the end of the run.

## Carried-over items rewritten in full format (round 2 retest)

## NEW-06 — Ticket title limit differs: create dialog vs ticket detail (detail saves 300 chars; create has no client max) (Low)
**Severity:** Low — inconsistent validation for the same field; no data loss; long titles make board cards and lists hard to scan.
**Area / URL:** Create Issue — https://www.streamlineos.in/build/7/issues?create=1 ; Ticket title — https://www.streamlineos.in/build/7/tickets/QAB-96 (Edit title)
**Preconditions / account:** Owner qaown1012b (Owner). Admin/Member not re-run.
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?create=1. Type 201 × `B` in "Issue title", press Tab.
2. Observe the field (no maxlength attribute) and the dialog text; "Create issue" stays enabled.
3. Open an existing ticket (QAB-96) → click "Edit title" → the field has maxlength="500".
4. Type 300 × `C`, press Enter. Wait for PATCH. Reload and read the heading length.
**Expected:** One rule across create and detail (for example 200 chars with "Title must be 200 characters or fewer" on both), or the same 500 cap on both.
**Actual:** Step 2: no inline message at 201 chars; no maxlength on the create field (a 201-char title was also accepted and saved in the v3 run). Step 4: `PATCH https://api.streamlineos.in/build/7/tickets/… → 200`; after reload the heading is 300 chars. Detail maxlength is 500 (600 typed → 500 kept). Earlier run (v2) showed the create dialog rejecting 201+ with "Title must be 200 characters or fewer", so the create-side rule has changed between runs.
**Frequency:** 2/2 this round (create 201 chars accepted; detail 300 saved). Prior runs: 3/3.
**Impact:** Titles of different lengths are allowed depending on the entry point; no user-facing warning.
**Suggested fix:** Put one `title` schema (max N, trimmed) in the client and the server; set maxlength on both inputs; show the same inline message on blur and on submit.
**Test data:** QAB-96 (title set to 300 × `C`, then deleted in cleanup).

## NEW-10 — Build project list scope switcher reads "Organization" instead of the org name (Low)
**Severity:** Low — wrong label in the header; the org name is shown elsewhere, so this is a consistency defect.
**Area / URL:** Build sidebar scope switcher — https://www.streamlineos.in/build/projects (compare https://www.streamlineos.in/build/7/issues)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Sign in as qaown1012b and open https://www.streamlineos.in/build/projects.
2. Read the scope switcher button at the top of the Build sidebar (aria-label and visible text).
3. Open https://www.streamlineos.in/build/7/issues and read the same switcher.
**Expected:** On /build/projects the switcher shows the org name "QA Build Org 1012b" (as the dashboard header does).
**Actual:** Step 2: aria-label `Switch Build scope — current: Organization All of Build`; visible text `AL | All of Build | Organization`. Dashboard header shows "QA Build Org 1012b". Step 3: aria-label `… current: Project QA Project Alpha` (correct).
**Frequency:** 3/3 this round on /build/projects (also seen in v2 and v3).
**Impact:** The user cannot see which org the Build scope belongs to; looks like a placeholder.
**Suggested fix:** Read the org display name from the same store as the dashboard header on the projects page; use "Organization" only as the fallback when the name is missing.
**Test data:** None.

## NEW-11 — Project Key silently rewritten ("qa-1!" becomes "QA1") with no notice (Low)
**Severity:** Low — the user does not learn that characters were removed; a different key can be created without noticing.
**Area / URL:** New Project wizard, step 1 — https://www.streamlineos.in/build/projects → "New Project" → Key field
**Preconditions / account:** Owner qaown1012b (Owner). Wizard closed without creating (Escape).
**Steps:**
1. Open https://www.streamlineos.in/build/projects → "New Project".
2. Name: `QA Name OK`. Key: type `qa-1!`, press Tab.
3. Read the Key value and the helper/error text.
**Expected:** Either a visible notice ("Lowercased and removed '-' and '!' — key is QA1") or a block with the error "Key must contain only uppercase letters (A–Z) and numbers" while the typed text stays.
**Actual:** Key value becomes `QA1`. Helper text: "Letters A–Z and digits only; auto-uppercased." No notice that `-` and `!` were removed. The earlier stale key error ("Key must contain only uppercase letters (A–Z) and numbers") is NOT shown any more (that part is fixed).
**Frequency:** 2/2 (v3 and round 2).
**Impact:** A project can be created with a key the user did not type.
**Suggested fix:** Show an inline message when characters are stripped; or reject non-alphanumeric input with the existing error and keep the typed value.
**Test data:** None (wizard closed).

## NEW-26 — Name error "Name must be at least 2 characters" stays after the name is corrected, until Next is clicked (Low)
**Severity:** Low — stale error text; the user believes the name is still invalid.
**Area / URL:** New Project wizard, step 1 — https://www.streamlineos.in/build/projects → "New Project" → Name field
**Preconditions / account:** Owner qaown1012b (Owner). Not created.
**Steps:**
1. Open https://www.streamlineos.in/build/projects → "New Project".
2. Name: `A`. Click "Next" (not Tab).
3. Read the error. Then clear Name and type `QA Name OK`, press Tab.
4. Read the error text again. Click "Next".
**Expected:** The error clears as soon as the value is valid (on change or blur).
**Actual:** Step 2: "Name must be at least 2 characters" shown under Name (Step 1 of 7). Step 4: the same error text is still shown with a valid name. Only "Next" advances (Step 2 of 7) and no other error appears. Note: typing `A` then Tab (without Next) shows no error at all.
**Frequency:** 2/2 (v3 and round 2).
**Impact:** Misleading error on the first wizard step.
**Suggested fix:** Re-run the name validator on change/blur and clear the error when it passes; keep the Next-time validation as the final check.
**Test data:** None.

## Round 2 new findings

## B-014 — Double-click on "Create Portfolio" creates two portfolios (High)
**Severity:** High — silent duplication of an org-level record on a routine action (same class as B-001); duplicates appear in every portfolio list and roll-up.
**Area / URL:** Portfolios — https://www.streamlineos.in/build/portfolios → "New portfolio" → dialog "New Portfolio" → "Create Portfolio"
**Preconditions / account:** Owner qaown1012b (Owner). Admin/Member not tested.
**Steps:**
1. Open https://www.streamlineos.in/build/portfolios (list shows "No portfolios yet").
2. Click "New portfolio" (Portfolios region). Name: `R2 DBL portfolio 0913`. Leave other fields default.
3. Double-click "Create Portfolio".
4. Wait for the dialog to close; read the Portfolios list.
**Expected:** Exactly one portfolio; the button is disabled while the request is in flight.
**Actual:** Two `POST https://api.streamlineos.in/build/portfolios` requests, both `201`. The Portfolios list shows the name twice. Dialog closes after the first response; no duplicate warning.
**Frequency:** 1/1 with double-click. (Single-click path not re-run this round.)
**Impact:** Duplicate portfolios; users must find and delete extras; roll-ups double count.
**Suggested fix:** Same as B-001: disable "Create Portfolio" and set an in-flight guard on the first click; idempotency key per dialog session; keep the dialog open until one 201.
**Test data:** Both rows deleted in cleanup (list verified empty afterwards).

## B-015 — Double-click on "Create Program" creates two programs (High)
**Severity:** High — same duplicate pattern as B-001 / B-014 on an org-level record.
**Area / URL:** Programs — https://www.streamlineos.in/build/programs → "New program" → dialog → "Create Program"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/programs (list shows "No programs yet").
2. Click "New program". Name: `R2 DBL program 0913`.
3. Double-click "Create Program".
4. Read the Programs list after the dialog closes.
**Expected:** One program; button disabled in flight.
**Actual:** Two `POST https://api.streamlineos.in/build/programs` → `201` each. The list shows "R2 DBL program 0913" twice.
**Frequency:** 1/1 (double-click).
**Impact:** Duplicate programs; governance views show extra work.
**Suggested fix:** As B-014.
**Test data:** Both rows deleted in cleanup (2× DELETE 204).

## B-016 — B-013 is not PNG-only: JPEG, GIF and WebP attachments also make the ticket page fail; only PDF attaches cleanly (Critical)
**Severity:** Critical — every image type tested breaks the ticket page for anyone who opens it; the file is accepted by the upload step, so users cannot tell why the ticket fails.
**Area / URL:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-88 (and QAB-89, QAB-90, QAB-91): "Attach files to ticket" (file input with no accept attribute)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?create=1. Title `R2 attach JPEG 0913` → "Create issue" → QAB-88 created (POST /build/7/tickets → 201).
2. Open https://www.streamlineos.in/build/7/tickets/QAB-88. Set the second file input (no accept) to /workspace/streamline-qa/fixtures/valid-image-0913.jpg (64×64 JPEG, 1.9 KB).
3. Wait up to 8 s. Repeat steps 1–3 for GIF (QAB-89, valid-image-0913.gif), WebP (QAB-90, valid-image-0913.webp) and PDF (QAB-91, valid-doc-0913.pdf).
**Expected:** The file appears under ATTACHMENTS for every type; the ticket page stays usable.
**Actual:**
- JPEG (QAB-88): `POST /build/7/files → 201`, `POST /build/7/tickets/99/attachments → 201`, `GET /storage/download?key=…valid-image-0913.jpg → 500`; page shows heading "Ticket Error" and "Failed to load ticket details.".
- GIF (QAB-89): same sequence; storage/download → 500; "Ticket Error".
- WebP (QAB-90): same sequence; storage/download → 500; "Ticket Error".
- PDF (QAB-91): `POST /build/7/files → 201`, `POST …/attachments → 201`; no storage 500; page stays; ATTACHMENTS lists "valid-doc-0913.pdf".
**Frequency:** JPEG 1/1, GIF 1/1, WebP 1/1 (all failed). PNG 4/4 across rounds (QAB-84, QAB-87, QAB-94 etc.). PDF 2/2 OK (QAB-91, QAB-93 unicode-name PDF).
**Impact:** Any image attached to a ticket disables that ticket for every viewer. The answer to "Is B-013 PNG-only?" is NO.
**Suggested fix:** As B-013. Also compare the signed-URL path for image keys with the PDF path (PDFs sign and load; images return 500 with "data is undefined"). Make a failed signed URL a per-attachment placeholder.
**Test data:** QAB-88, QAB-89, QAB-90 deleted in cleanup (their storage objects remain orphaned).

## B-017 — Zero-byte file: server rejects it with 400 and a raw schema message; the page shows nothing (Low)
**Severity:** Low — the file is correctly not attached, but the user gets no feedback and the API returns an internal validation string.
**Area / URL:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-92 (and QAB-94)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open a ticket that loads (QAB-92 PDF test ticket, or a new one).
2. Set the attach input to /workspace/streamline-qa/fixtures/empty-0byte-0913.pdf (0 bytes).
3. Wait 6 s; compare the page text before and after.
**Expected:** A message such as "empty-0byte-0913.pdf is empty" (or the same "not allowed" pattern used for .exe).
**Actual:** `POST https://api.streamlineos.in/build/7/files → 400`; the response body contains `contentBase64: Too small: expected string to have >=4 characters`. No attachment created. No new text appears on the page (text diff empty in 2 runs; only an older toast was visible).
**Frequency:** 2/2.
**Impact:** Silent failure for an empty file; the internal validator message is exposed to the client.
**Suggested fix:** Reject size 0 on the client with "File is empty"; map the server's 400 to a user-facing message; never surface schema text.
**Test data:** Nothing created (upload rejected).

## B-018 — Ten files selected at once: only two uploads start before the ticket errors; the other eight are never sent (Medium — unconfirmed)
**Severity:** Medium — a batch upload silently drops files; the cause may be B-013's crash rather than the picker, so the count is provisional.
**Area / URL:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-95 (input has a `multiple` attribute)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Create issue `R2 attach 10 files at once 0913`; open its detail page.
2. Set the attach input to 10 files: /workspace/streamline-qa/fixtures/multi-01-0913.png … multi-10-0913.png (32×32 PNG).
3. Wait 8 s; count `POST /build/7/files` and `POST …/attachments` requests.
**Expected:** All 10 uploaded (or a clear "max 10 at once / per-file result" message), each shown in ATTACHMENTS.
**Actual:** `POST /build/7/files → 201` ×2 and `POST …/attachments → 201` ×2, then no further upload requests within 8 s; "Ticket Error" appeared (B-013). ATTACHMENTS could not be read because the page errored.
**Frequency:** 1/1.
**Impact:** Users who select many files may believe all were attached.
**Suggested fix:** Queue uploads one by one with per-file status; keep the composer mounted if one file fails; show "n of 10 uploaded" at the end.
**Test data:** QAB-95 deleted in cleanup. **Retest needed:** repeat with 10 PDFs (non-image) to separate this from B-013.

## B-019 — Double-click on "Save" in Time Tracking while a timer runs sends no time entry; a single click saves once (Medium)
**Severity:** Medium — time is either not saved or lost (B-008 pattern) and the user gets no message; a double-click is a normal gesture.
**Area / URL:** Ticket Details > Time Tracking — https://www.streamlineos.in/build/7/tickets/QAB-91
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-91. In "Time Tracking" click **Start** and wait until **Stop** and **Save** show.
2. Double-click **Save** (attempt 1; attempt 2 with force; attempt 3 with the same steps).
3. Read the Time Tracking block and the network list.
**Expected:** One time entry (POST …/time-entries → 201), or the button disabled while saving.
**Actual:** 0 `time-entries` requests in the three double-click attempts. In attempt 1 the timer ended in the stopped state (`Log 00:28 | Start`, no Save), with no entry (B-008 pattern). A single click on **Save** while running sent `POST https://api.streamlineos.in/build/7/tickets/102/time-entries → 201` (one entry).
**Frequency:** 3/3 double-click attempts sent nothing; 1 ended stopped with no entry; single-click Save 1/1 OK.
**Impact:** Tracked time can be lost with no message.
**Suggested fix:** Save must be idempotent and must keep the timer running until a 201; ignore the second click while in flight; show "Time entry saved (mm:ss)".
**Test data:** One time entry from the single-click Save (duration under 1 minute) on QAB-91, removed with the ticket in cleanup.

## B-020 — Ticket heading stuck on "Loading..." for long periods after reload (intermittent) (Low — needs repro)
**Severity:** Low — the page looks broken until another reload; no data loss.
**Area / URL:** https://www.streamlineos.in/build/7/tickets/QAB-96 (two tabs open on the same ticket)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open the same ticket in tab A and tab B. Make a conflicting edit in A (see round-2 two-tab test), then reload both tabs.
2. Wait up to 15 s for the ticket heading (h1).
**Expected:** Heading renders with the title, or an error after a timeout.
**Actual:** h1 read "Loading..." for more than 15 s in 2 of about 8 loads (both tabs). On later loads the title rendered within 3 s.
**Frequency:** 2 of about 8 loads (intermittent).
**Impact:** Looks like a hung page; users reload.
**Suggested fix:** Investigate the ticket fetch that runs while another tab holds a newer version; add a skeleton with a timeout and retry message.
**Test data:** QAB-96 (deleted in cleanup).

## B-021 — Browser tab crashed ("This tab crashed") while on the board with a search that returned nine ticket cards (Medium — needs repro)
**Severity:** Medium — a crashed tab loses unsaved input in that tab; reproduction not yet clean.
**Area / URL:** https://www.streamlineos.in/build/7/issues?q=R2 (board, search results), then "Ticket actions" on a card
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?q=R2 (nine R2 tickets, five with broken image attachments).
2. Wait for the cards; click the first card's "Ticket actions" button; read the menu.
3. Read the same tab again.
**Expected:** Menu opens; tab stays usable.
**Actual:** In the first attempt the scripted call timed out ("Request timed out"); the next call reported `Target crashed` ("This tab crashed, so nothing can run in it again"). The same board opened in a new tab worked. A single-card search (`?q=R2%20attach%20JPEG`) with the menu opened and deleted correctly in later attempts (no crash, 0/3).
**Frequency:** 1 crash in about 4 board loads with the nine-card search; 0 in later runs.
**Impact:** Tab crash; unsaved input in that tab is lost.
**Suggested fix:** Capture the crash with the console and memory profile; check the board's card renderer for broken image attachments (see B-016) and the card menu's portal.
**Test data:** Tickets from the search were deleted in cleanup.

## B-022 — "Join" on the org-setup pending-invitation banner does nothing (Medium)
**Severity:** Medium — an invited member who signs in is shown a Join button that does not work and no other route to join (the alternative creates a new org); the user is stuck on /org-setup with no sign-out control on that page.
**Area / URL:** https://www.streamlineos.in/org-setup (after sign-in as an invitee)
**Preconditions / account:** Invitee qadbl1013@sharklasers.com (invited by qaown1012b as Member, Build Member preset; invite sent 201 this round). Owner qaown1012b.
**Steps:**
1. Sign in at https://www.streamlineos.in/signin with qadbl1013@sharklasers.com (POST /auth/email-otp 200; POST /auth/email-otp/verify 200).
2. Land on /org-setup: banner "You have a pending invitation — QA Build Org 1012b — MEMBER — Join — Create my own organization instead".
3. Click "Join".
**Expected:** The invitation is claimed (POST …/claim) and the user reaches the org dashboard or /post-invite, as in the v3 accept flow.
**Actual:** Normal click: Playwright waited 8 s for the button to be visible, enabled and stable, then timed out. Forced click: no network request (no POST) and the page stays on /org-setup with the same banner. The user has no sign-out control on /org-setup; /dashboard and /signin redirect back to /org-setup.
**Frequency:** 2/2 attempts.
**Impact:** Invitees cannot join from the banner; the session is trapped on /org-setup.
**Suggested fix:** Make Join claim the invitation (POST claim, then redirect); add a "Sign out" link on /org-setup; keep "Create my own organization" as a secondary action.
**Test data:** Invitee account qadbl1013 left signed in on /org-setup in the QA browser. Pending invite still open (see TEST-DATA.md).

## B-023 — Browser Back from an open Create Issue dialog closes it and discards the typed title (Low)
**Severity:** Low — typed text is lost silently; no warning on in-app history navigation.
**Area / URL:** https://www.streamlineos.in/build/7/issues → Create Issue (URL …?create=1)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues. Click "Create Issue". Type `R2 back-forward 0913` in "Issue title".
2. Press the browser Back button.
3. Press the browser Forward button.
**Expected:** The dialog is restored with the draft, or a "Discard changes?" prompt appears before leaving.
**Actual:** Step 2 returned to the previous history entry (/build/7/issues?q=R2) with no dialog and no prompt. Step 3 returned to ?q=R2 (not to the dialog) and the title was empty. (A beforeunload prompt appears only on full page navigations, which the harness auto-accepted.)
**Frequency:** 1/1.
**Impact:** Lost draft title.
**Suggested fix:** Keep create-dialog state in a draft (URL or local storage) and restore it; or confirm before closing with unsaved input.
**Test data:** None (dialog not submitted).

## Retests (round 2)

## NEW-16b — Invitee sign-in shows no pending-invite prompt and lands on /org-setup — RETEST: prompt now shown (status: FIXED for the prompt; residual issue is B-022)
**Result:** Sign-in as the pending invitee qadbl1013@sharklasers.com (invite from qaown1012b) → /org-setup showed "You have a pending invitation / QA Build Org 1012b — MEMBER / Join / Create my own organization instead". Earlier (v3) sign-in showed only "Welcome… Launch your organization" with no prompt. The landing page is still /org-setup rather than the invited org; the Join button is inert (B-022).

## NEW-27 — .exe accepted by an image-only file input with no visible error — RETEST: STILL OPEN (Low)
**Area / URL:** https://www.streamlineos.in/build/7/tickets/QAB-91 — the second hidden file input (accept="image/jpeg,image/png,image/gif,image/webp", no label in the DOM)
**Steps:** 1. Open QAB-91. 2. setInputFiles on that input with /workspace/streamline-qa/fixtures/qa-test.exe. 3. Wait for response; read new page text.
**Expected:** Rejected on the client with "qa-test.exe is not an allowed file type." (as the create-dialog path), or the message shown if sent.
**Actual:** `POST https://api.streamlineos.in/storage/upload → 400`; no visible message (new-text diff contains no alert text). The file is not attached.
**Frequency:** 1/1 this round (v3: 1/1).
**Impact:** The user gets no feedback; the input's location is not labelled in the DOM.

## Answer: is B-013 PNG-only?
No. See B-016: JPEG, GIF and WebP fail the same way; PDF attaches and renders.

## Round 2 summary (new items)
- New B-items: 10 (Critical 1: B-016; High 2: B-014, B-015; Medium 4: B-018 (unconfirmed), B-019, B-021 (needs repro), B-022; Low 3: B-017, B-020 (needs repro), B-023).
- Carried-over items rewritten in full format: NEW-06 (Low), NEW-10 (Low), NEW-11 (Low), NEW-26 (Low) — all still open.
- Retests: NEW-16b prompt FIXED (residual B-022); NEW-27 STILL OPEN (Low).
- Verified OK this round (no bug): Cycle create double-click (1 POST), Label create double-click (1 label), Project create double-click (1 POST, /build/15), Comment edit double-click (1 PATCH 200), Invite double-click new address (1 POST 201), Invite double-click existing member (2× 409 with "already a member" message, no duplicate invite), reload during ticket create (1 ticket, QAB-96), two-tab edits on priority, status, title and assignee (second writer gets 409 and a Keep/Discard dialog; no silent last-write-wins), history panel logs field changes (priority, status, title, assignee), focus trap in Create Issue (22 Tab presses stay inside), Esc closes, "c" opens Create, "g i" goes to Issues, "?" opens shortcuts overlay.

(Round 2 UI/UX suggestions U-013..U-018 are in UI-UX-SUGGESTIONS.md.)

---
# Round 3 — build-2026-10-13 (late afternoon; owner qaown1012b first, then member qamem1012c and viewer qaview1012e; no screenshots saved)
Continues from B-023 and U-018. Prior round 2 notes read first. Items retested this round are listed in "Retests (round 3)" at the end of this section.

## B-024 — PDF attachments: item click is inert and double-click requests `storage/download` → HTTP 500 (preview and download never open) (High)
**Severity:** High — no attachment type can be opened or downloaded from the ticket (PDF worked in round 2 for attach; now the open path fails). The file list renders, but the owner has no working way to read an attachment, so the attachment feature is unusable for review.
**Area / URL:** Ticket Attachments list — https://www.streamlineos.in/build/7/tickets/QAB-97 (ATTACHMENTS, items shown as buttons named `multi-pdf-NN-0913.pdf`)
**Preconditions / account:** Owner qaown1012b (Owner). Ticket QAB-97 "R3 PDF attach 10 files 1013" with 10 PDFs attached (see B-018 retest).
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-97 and reload it.
2. Single-click the attachment button `multi-pdf-01-0913.pdf` (and `multi-pdf-05-0913.pdf`); watch for a preview dialog, a new tab, or a download.
3. Double-click `multi-pdf-06-0913.pdf`; watch the network and console.
4. Read the console errors after the reloads.
**Expected:** Clicking an attachment opens a preview (or a download starts). The file is served from a valid signed URL, and a failure shows a per-item message.
**Actual:** Step 2: no preview, no new tab, no download, no request (inert). Step 3: `GET https://api.streamlineos.in/storage/download?key=87496d17-…%2Fbuild%2F7%2Ffiles%2F<uuid>-multi-pdf-06-0913.pdf` → **500** (twice for the double-click). Console: `Failed to load resource: the server responded with a status of 500` for multi-pdf-01, -02, -04, -05 and -06 on the reloads too. The ticket page itself still renders, and the 10 PDF rows stay listed. Note: round 2 recorded PDF signing as OK (QAB-91); the PDF signed-URL path now fails the same way B-013/B-016 failed for images.
**Frequency:** 5 of 10 PDFs returned 500 on reload; 1/1 double-click on -06 (500, 2 requests); single-click inert 3/3.
**Impact:** Attachments cannot be previewed or downloaded by anyone, so reviewers cannot check what was uploaded. This is the same storage signed-URL defect as B-013 and B-016, now on PDFs.
**Suggested fix:** Fix the `storage/download` signed-URL path for `build/<project>/files/<uuid>-<name>` keys (the storage client returns no payload). Make a single click open a preview or download, and show "Couldn't open attachment" per item on failure. Verify the same key shapes for PDF, PNG, JPEG, GIF and WebP.
**Test data:** QAB-97 (ticket with 10 PDFs; deleted in cleanup). Storage objects remain orphaned (no UI to remove them).

## B-025 — Display "Ordering" is ignored on the board, and "Created" on the list lists the oldest first (Medium)
**Severity:** Medium — the sort control is visible and the URL changes (`orderBy=created&orderDir=desc`), but the cards do not move. Users who sort by Created or Priority believe the view is sorted when it is not.
**Area / URL:** Issues board and list — https://www.streamlineos.in/build/7/issues (Display options > Ordering: Manual / Created / Updated / Priority / Due date)
**Preconditions / account:** Owner qaown1012b (Owner). Project has about 80 tickets; QAB-97 was created at 15:5x today.
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues (Board). Open Display options > Ordering and choose Priority, then Due date, then Created, then Updated. After each choice read the URL and the first cards of the "Todo" column.
2. Reload https://www.streamlineos.in/build/7/issues?orderBy=priority&orderDir=desc.
3. Open https://www.streamlineos.in/build/7/issues?view=list&orderBy=created&orderDir=desc and read the order of IDs (top and bottom).
4. Open https://www.streamlineos.in/build/7/issues?view=list&orderBy=created&orderDir=asc and compare.
**Expected:** Board cards re-order with the chosen Ordering. "Created" desc puts the newest ticket (QAB-97) first; asc puts it last.
**Actual:** Step 1: URL updates each time (`orderBy=priority&orderDir=desc`, `dueDate&orderDir=asc`, `created&orderDir=desc`, `updated&orderDir=desc`), but the Todo column order is identical in all five settings and after reload: QAB-1, QAB-2, QAB-4, QAB-5 … (rank order). Priority values in the first 13 cards read U,M,U,L,M,H,U,L,M,H,U,H,L (not sorted). Step 3: list with `orderBy=created&orderDir=desc` starts QAB-1, QAB-2, QAB-4 and ends `…79, 97, 3, 13`: the newest ticket is last. Step 4: `orderDir=asc` returns exactly the same order, so the direction is ignored.
**Frequency:** 5/5 Ordering choices on the board; list created desc and asc 2/2 identical.
**Impact:** Sorting by priority, due date, or newest is not available in practice; triage by "most recent" or "highest priority" fails silently.
**Suggested fix:** Apply `orderBy`/`orderDir` on the board (within each column) and the list server-side; honour `orderDir` for every key; keep Manual as the only rank-based order; add a visible asc/desc toggle that is tested in the URL and after reload.
**Test data:** QAB-97 (created for this test; deleted in cleanup).

## B-026 — Tab crashed ("Target crashed") during a rapid run of board and list loads with sort parameters (Medium — needs repro)
**Severity:** Medium — the renderer dies and every call in that tab fails until a new tab is opened; unsaved input is lost. Same symptom as B-021 but on a different route (no card menu involved).
**Area / URL:** https://www.streamlineos.in/build/7/issues?view=list&orderBy=…&orderDir=… (sequence of list/board URLs in one tab, same session)
**Preconditions / account:** Owner qaown1012b (Owner). About 80 tickets in the project, including several with broken image attachments (QAB-84 family, QAB-98..102).
**Steps:**
1. In one tab, load in order: `/build/7/issues` → `?view=list&orderBy=created&orderDir=desc` → `?view=list&orderBy=created&orderDir=asc` → `?view=list&orderBy=updated&orderDir=desc` → `?view=table&orderBy=…`, reading `main` innerText after each load (no waits beyond the list appearing).
2. Watch for the next call to fail.
**Expected:** Every page loads, or the page shows an error that can be retried. The tab stays usable.
**Actual:** On the 5th navigation (`?view=list&orderBy=manual&orderDir=asc`) the next call returned `locator.innerText: Target crashed — This tab crashed, so nothing can run in it again`. The tab showed an empty title and the crashed state. A new tab loaded the same URL normally (`6,949 chars`, IDs rendered) on the first try.
**Frequency:** 1 crash in about 12 loads with sort parameters in this session. Not reproduced in 3 later loads of the same URL.
**Impact:** Unsaved input in that tab is lost; repeated sorting or switching views may look like the app is broken.
**Suggested fix:** Capture the crash with the console and memory profile (renderer OOM or infinite re-render are both possible with 80+ rows and the list/board re-mount on each `orderBy` change); check the list and board for a render loop when `orderBy` or `orderDir` changes the URL.
**Test data:** None.

## B-027 — Board drag into an empty column is rejected: `409 CONFLICT "Board order changed; refresh and retry"` and the card snaps back (High)
**Severity:** High — cards cannot be moved into any empty column (for example "In review" or "Done" with no tickets, or "In progress" when empty). Status changes by drag are blocked for the most common case: starting a new stage. Users see a conflict message that implies a concurrent edit, though nobody else is editing.
**Area / URL:** Board drag-and-drop — https://www.streamlineos.in/build/7/issues?q=crash (search with 9 probe cards; columns Todo / In progress / In review / Done)
**Preconditions / account:** Owner qaown1012b (Owner). Board state: Todo 6, In progress 3, In review 0, Done 0. Cards QAB-101 and QAB-104 are in Todo.
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash and reload (fresh state).
2. Keyboard: focus the card "R3 crash probe 5 1013" (QAB-102), press Space, ArrowRight ×2 (to "In review"), Space.
3. Real mouse (Playwright mouse API, press → 25 steps → release): drag "R3 crash probe 4 1013" (QAB-101) from Todo to the empty "In review" column; repeat after another reload.
4. Read the network PATCH and the board counts.
**Expected:** The card moves to In review; `PATCH …/tickets/<id>/rank` → 200; counts update.
**Actual:** Step 2 and step 3 (×2): `PATCH https://api.streamlineos.in/build/7/tickets/112/rank` (and 113) → **409** `{"code":"CONFLICT","message":"Board order changed; refresh and retry"}`. The toast "Board order changed; refresh and retry" appears; the card stays in Todo. The same 409 was returned when the probe card was dropped into the empty "In progress" column earlier (first attempt). Moves into a non-empty column (In progress, which had 2–3 cards) returned 200 (see B-028).
**Frequency:** 4/4 drops into an empty column → 409; 0/0 successful drops into an empty column.
**Impact:** Users cannot start or finish work by dragging into empty columns; they must open each ticket and change Status. The message suggests a concurrent edit, so users reload and try again without success.
**Suggested fix:** Compute the target rank for an empty column (for example the column base rank) on the server and/or the client; do not require a neighbour; return 200 when the column is empty; if a real conflict occurs, return the card's current column so the client can re-sync.
**Test data:** QAB-98..106 (R3 crash probes; deleted in cleanup). QAB-98, QAB-99, QAB-100 and QAB-102 ended in In progress from moves (see B-028).

## B-028 — Board does not update after a successful drag or keyboard move; column counts and card position stay stale until reload (Medium)
**Severity:** Medium — the server saves the move (200, status changed), but the board keeps showing the card in its old column with old counts. Users who drag twice get conflicts; the wrong state looks like a failed save, so they retry and the server state diverges from what is on screen.
**Area / URL:** Board — https://www.streamlineos.in/build/7/issues?q=crash
**Preconditions / account:** Owner qaown1012b (Owner). Target column not empty (In progress with 2–3 cards).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash. Read counts: Todo 7, In progress 2.
2. Keyboard: focus "R3 crash probe 3 1013" (QAB-100), Space, ArrowRight, Space. Read the response (PATCH …/tickets/111/rank) and the counts immediately after 4 s.
3. Reload and read counts.
4. Repeat step 2 with "R3 crash probe 5 1013" (QAB-102) → PATCH …/tickets/113/rank.
**Expected:** Counts update to Todo 6, In progress 3 right after the 200 response; the card appears in In progress.
**Actual:** Step 2: `PATCH …/rank` → **200** `{"success":true,"data":{"id":111,"status":"IN_PROGRESS","version":2}}`; the UI still shows Todo 7, In progress 2 and the card in Todo. Step 3: after reload Todo 6, In progress 3 (the move had been saved). Step 4: 200 again, UI counts unchanged (Todo 6, In progress 3); after reload Todo 5, In progress 4 (not re-read; same pattern seen in B-027 results).
**Frequency:** 2/2 successful moves to a non-empty column stayed stale in-session. Reload always showed the saved state.
**Impact:** Users see a stale board and may move the same card again (409 from the version check) or report a lost move.
**Suggested fix:** Apply the moved card to the local state on drop (optimistic update) and reconcile with the 200 payload (status, rank, version); on 409 refetch the board and show the new order instead of rolling back silently.
**Test data:** QAB-100 and QAB-102 now In progress (cleanup will delete the R3 probes).

## B-029 — At 768 px the board filter bar overflows: "Add filter", "Hide done" and search sit off-screen and are reachable only by an undiscoverable horizontal scroll (Medium)
**Severity:** Medium — at tablet width the filter controls (Add filter, Hide done, search) are outside the visible area with no wrap. They can only be reached by scrolling the toolbar sideways, and there is no scrollbar or other cue, so users are unlikely to find them on a 768 px window.
**Area / URL:** Issues toolbar — https://www.streamlineos.in/build/7/issues (Board and Table) at viewport width 768 px (DevTools device toolbar, Responsive, 768 × 1026)
**Preconditions / account:** Owner qaown1012b (Owner). Desktop-class browser window narrowed to 768 px.
**Steps:**
1. Set the device width to 768 (Ctrl+Shift+M device toolbar). Open https://www.streamlineos.in/build/7/issues.
2. Read the toolbar row: Board, List, Table, Calendar, Timeline, Workload, Views, Display, and the bookmark icon. Look for "Add filter", "Hide done" and the search box.
3. Try to click "Add filter" (Playwright click, 3 s timeout).
**Expected:** The filter row wraps onto a second line or collapses into a "Filter" menu; Add filter, Hide done and search stay reachable at 768 px.
**Actual:** Step 2: "Add filter" starts at about x=1030 px and "Hide done" at x=1130 px (viewport 768), outside the viewport; the search textbox is not visible at the initial scroll position. Step 3: the Playwright click timed out, but the toolbar had scrolled sideways and the "Filter by…" menu was open on screen (Status, Priority, Type, Assignee, Label, Cycle, Due Dates); the search field appeared next to it after the scroll. "Saved views" and "Save view" are visible at the start position.
**Frequency:** 1/1 at 768 px (board). Not tested at other widths between 375 and 768. At 375 px the Add filter and Hide done buttons were in the layout at x=289 and x=327 (reachable).
**Impact:** On tablet-width windows, filtering and search are not usable; users see unfiltered boards.
**Suggested fix:** Let the filter row wrap (flex-wrap) or move Add filter / Hide done / search into a single "Filter" button at md breakpoints; if a scroll strip is kept, show a visible scrollbar or fade edge.
**Test data:** None.

## B-030 — Project "Files" page shows "Project error: Failed to load project" on every load, while its API calls return 200 (Medium) (Note: as member, /build/7/files loads normally; appears owner-specific.)
**Severity:** Medium — a sidebar section of the project is unusable (no files list, no upload area, no explanation). The error text talks about the project, but the project loads fine on Overview, Issues and Backlog, so the message is misleading.
**Area / URL:** https://www.streamlineos.in/build/7/files (sidebar "Files" under PROJECT)
**Preconditions / account:** Owner qaown1012b (Owner). Also expected for Build Admin/Member if the Files module is shown to them (not checked).
**Steps:**
1. Open https://www.streamlineos.in/build/7/files and wait 10 s.
2. Click "Try Again" once; reload the URL twice.
3. Read the network list for api.streamlineos.in GET requests and the page text.
**Expected:** The project Files view loads (list of files or an empty state with an upload action). If it fails, the error names the failing request and does not say "project" when the project loaded.
**Actual:** Step 1: heading "Project error", text "Failed to load project. Please try again or contact support.", button "Try Again". Step 2: same error after Try Again and after two reloads (3/3). Step 3: `GET /build/7` → 200, `GET /build/7/files` → 200, `GET /billing/entitlements` → 200, plus other shell calls all 200. No failing request is visible in the network list.
**Frequency:** 3/3 loads (owner).
**Impact:** Project files cannot be viewed or uploaded from Build; the error suggests the project is broken.
**Suggested fix:** Find the client error behind the Files view (the render path after `GET /build/7/files` 200); render an empty state when the response has no items; use an error message specific to the failing call and include the correlation ID.
**Test data:** None.

## B-031 — Member (Build Member) can upload a file to storage from a ticket where attaching is hidden; the upload succeeds (201) and leaves an orphan object (Medium)
**Severity:** Medium — the attach control is hidden for Members, but the hidden image-only file input still sends the file to the storage service, which accepts it. The server does not link it, so it is an orphan. Members should not be able to write storage objects for a ticket they cannot attach to; orphans accumulate and cost storage.
**Area / URL:** Ticket detail (Member view) — https://www.streamlineos.in/build/7/tickets/QAB-97
**Preconditions / account:** Member qamem1012c (Member + Build Member on QA Project Alpha). The Activity composer and "Attach files" control are not rendered for this role.
**Steps:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/tickets/QAB-97.
2. Confirm in the DOM that the only file input is `accept="image/jpeg,image/png,image/gif,image/webp"` with class "hidden", and that no "Attach" control is visible.
3. Set that hidden input to /workspace/streamline-qa/fixtures/valid-image-0913.png (setInputFiles) and watch the network.
4. Reload the ticket and read the ATTACHMENTS section.
**Expected:** The upload is refused (403) before storage, or the input is not rendered for Members.
**Actual:** Step 3: `POST https://api.streamlineos.in/storage/upload` → **201**. No `POST …/attachments` or `POST /build/7/files` follows, and no toast appears. Step 4: the ATTACHMENTS list is unchanged (10 PDFs, no PNG); the Member cannot attach through the UI, but the stored object exists.
**Frequency:** 1/1 (member). The attach/delete controls are hidden.
**Impact:** Storage objects can be created by a role that cannot attach; orphan objects accumulate with no UI to remove them (see B-013/B-016 notes). Low direct exposure, but it is a permission gap at the storage API.
**Suggested fix:** Reject `POST /storage/upload` unless the caller has Build attach permission for the target project (or drop the file input for Members); clean up unlinked uploads after a timeout.
**Test data:** One orphan storage object from this upload (valid-image-0913.png, Member test). No ticket or attachment row was created.

## B-032 — Backlog page: first load stays on "Loading results…" for 25+ s, and the renderer crashed ("Aw, Snap!", error code 9) during a run of direct navigations (Member) (Medium — needs repro)
**Severity:** Medium — the Backlog (the Build member's default project list) can hang and the tab can die, with unsaved input lost. It looks like the same renderer-crash family as B-021/B-026, now on a plain list route with no sort parameters.
**Area / URL:** https://www.streamlineos.in/build/7/backlog (sidebar "Backlog")
**Preconditions / account:** Member qamem1012c (Member + Build Member). About 90 tickets in project 7. Same browser session as the RBAC checks (direct loads of /build/portfolios, /build/programs, /build/managed-products, /build/projects, /build/7/cycles, /build/7/releases, /build/7/updates, /build/7/files, /build/7/settings).
**Steps:**
1. In one tab, load in order: /build/portfolios, /build/programs, /build/managed-products, /build/projects, /build/7/cycles, /build/7/backlog (domcontentloaded), reading body text after each.
2. Read the Backlog body 25 s after load.
3. Open /build/7/backlog in a second tab and wait for the first QAB row.
**Expected:** Rows appear within a few seconds; a failure shows a retry state. The tab does not die.
**Actual:** Step 1: the Backlog tab showed the crash page "Aw, Snap! Error code 9" (renderer died; the reload also crashed on `page.goto`). Step 2 (new tab): header and filter bar rendered, the table body showed "Loading results…" for 8 s, and rows appeared only after about 25 s. Step 3: a second Backlog load later showed 50 QAB rows; a further run of two loads in one call hit the 30 s run limit.
**Frequency:** 1 crash in about 11 navigations; slow first load 1/1 in a fresh tab (rows after ~25 s). Not reproduced on the Build Admin/owner accounts (not checked).
**Impact:** The Backlog is slow or dead on first load and loses unsaved input when the renderer dies.
**Suggested fix:** Capture the crash with the console and memory profile; show a timeout/retry state after ~10 s instead of an indefinite "Loading results…"; check the backlog list for a render loop when the project list or permissions load late.
**Test data:** None.

---
# Round 4 — build-2026-10-13 (member qamem1012c first; then viewer qaview1012e; owner qaown1012b last; no screenshots saved)
Continues from B-032 and U-021. Items are appended as found.

## B-033 — Member sees "Add ticket due date" in the calendar "Add to calendar" menu; "Create ticket" does nothing (no request, no message) (Medium)
**Severity:** Medium — a create action is offered to a Build Member, but it silently does nothing. Build Members cannot create issues on the board (no "Create issue" button), so the calendar entry point is inconsistent with the role.
**Area / URL:** https://www.streamlineos.in/calendar?source=build&projectId=7 → "Add to calendar" (header, button "Add") → menuitem "Add ticket due date" → dialog "Add ticket due date" → "Create ticket"
**Preconditions / account:** Member qamem1012c (Member + Build Member on QA Project Alpha).
**Steps:**
1. Open the calendar URL above. Click "Add to calendar" → "Add ticket due date".
2. Project: select "QA Project Alpha". Title: `R4 member cal due 1013`. Due date and Priority keep defaults.
3. Click "Create ticket". Repeat with a plain click, a forced click, and Enter in the Title field.
4. Watch the network and the dialog; then search `R4 member` on /build/7/issues?q=R4%20member.
**Expected:** Either the ticket is created (201) and the dialog closes, or the action is hidden for a role that cannot create issues, or an error is shown.
**Actual:** Before the project was chosen: inline "Select a project" alert. After choosing it: no `POST` request in any of 4 attempts, dialog stays open, no alert, no toast, no field error. Nothing created (search returns no R4 ticket). Same member account has no create control on /build/7/issues.
**Frequency:** 4/4 attempts.
**Impact:** A Member is offered a create path that silently fails; users think it is broken or retry. Also a permission-consistency gap between calendar and board.
**Suggested fix:** Hide "Add ticket due date" (and the calendar "Add" menu item) unless the caller has build create rights; otherwise show the permission error. Surface any submit failure inline.
**Test data:** None created (no request was sent).

## Round 4 notes (member qamem1012c item 1, viewer qaview1012e item 2)
- Member, empty states only (no create/edit/delete control on the page for this role): /build/portfolios ("New portfolio" absent), /build/programs ("New program" absent), /build/managed-products (no Create control; copy "Create one to see delivery in one place"), /build/7/cycles (no create control; topbar Create only), /build/7/releases (copy "Create your first release…" with no button), /build/7/updates (no create control). No edit/delete control was visible because no items exist. Labels: /build/7/settings → "Access Restricted (build:update)", so label management is not reachable for a Member. Time log: /timesheets?projectId=7 → access-denied (org-disabled); the working path is the ticket Time Tracking block (see B-008/B-019). Calendar: "Add" → "Add event" (general "New Event" dialog; not saved) and "Add ticket due date" (see B-033).
- Viewer qaview1012e, direct /build URLs: /build/projects, /build/portfolios, /build/programs, /build/managed-products, /build/all-work, /build/my-work, /build/search, /build/inbox, /build/teams, /build/7, /build/7/issues, /build/7/backlog, /build/7/cycles, /build/7/releases, /build/7/updates, /build/7/files, /build/7/settings, /build/1, /build/15, /build/7/tickets/QAB-1, /build/7/tickets/QAB-84 → all "Access Restricted" (build:view / build:tickets:view / build:<module>:view / build:update), no project or ticket data rendered. /build/products → Page Not Found (see U-016). Direct API navigation returns 401 (token-based; not a usable probe). No viewer data leak found.

## B-034 — Table and List: "Priority" and "Due date" orderings return the same sequence, and "Updated" does not change the table (Medium)
**Severity:** Medium — sort controls that are visible and change the URL (Priority) return an order that matches neither key, so triage by priority or due date is unreliable; "Updated" silently does nothing.
**Area / URL:** https://www.streamlineos.in/build/7/issues?view=table and ?view=list (Display options → Ordering)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/issues?view=table. Display options → Ordering → Priority; wait for the URL to update; read the first 10 IDs.
2. Repeat with Due date, Updated, Created, Manual (same table view, reloading each time).
3. Repeat Priority and Due date on ?view=list.
**Expected:** Each ordering changes the row order to match its key; the URL and the rows agree after reload.
**Actual:** Priority → `orderBy=priority&orderDir=desc`: rows QAB-40, 44, 48, 52, 56, 60, 64, 68, 72, 76 (all "Pag B item" tickets, Due Date column empty). Due date → `orderBy=dueDate&orderDir=asc`: the same ten rows. The Priority cell is icon-only, so the sequence cannot be checked against priority values in the UI (see U-009). Updated → the combobox shows "Updated" but the URL stays `?view=table` (no orderBy) and the rows match the default rank order (QAB-3, QAB-100, QAB-102, QAB-1 …). List view with Priority shows the same QAB-40… sequence. Created desc (table) → QAB-1, QAB-2, QAB-3… (ascending; same as B-025).
**Frequency:** Priority and Due date: 2/2 (table), 1/1 (list). Updated: 2/2 (no URL change, no order change).
**Impact:** Users who sort by due date or priority in the table/list get an order that does not follow the chosen key, and "Updated" looks applied but is not.
**Suggested fix:** Apply orderBy server-side for every option with the chosen direction; give Updated a persisted orderBy=updated; keep the combobox and URL in sync; test with a fixture of tickets with different due dates and priorities.
**Test data:** None created.

## B-035 — Board "Columns" option (Assignee, Priority, Label, Cycle, Project) is ignored; the board always shows Status columns (Medium)
**Severity:** Medium — the Display panel offers six column groupings and the URL accepts them, but the board keeps the Status columns; a Rows grouping works, so only the columns half is broken.
**Area / URL:** https://www.streamlineos.in/build/7/issues (Board) → Display options → Columns
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/issues. Display → Columns → Assignee (also try Priority, Label, Cycle, Project).
2. Read the column headers after the URL updates (`columnBy=assignee`).
3. Also open /build/7/issues?columnBy=priority&rowBy=none directly.
**Expected:** Columns are rebuilt per Assignee/Priority/Label/Cycle/Project, with counts.
**Actual:** Every value keeps the "Todo | 83 …" Status columns (first card QAB-1). The URL keeps `columnBy=<value>` after the selection. Rows → Priority and Rows → Assignee DO group correctly ("HIGH (19)", "Unassigned (89)").
**Frequency:** 5/5 Columns values tried (assignee, priority, label, cycle; plus UI selection for assignee).
**Impact:** The board cannot be laid out by owner, priority or cycle, so the Columns option looks broken and users are misled.
**Suggested fix:** Honour `columnBy` on the board (render one column per distinct value plus "None"); when a value is not supported, hide it from the Columns list.
**Test data:** None.

## B-036 — Board filter chips disappeared without user action during a filter sequence (needs repro) (Low)
**Severity:** Low — an active Priority filter was dropped silently; users may think tickets were removed or the filter never saved.
**Area / URL:** https://www.streamlineos.in/build/7/issues (filter bar: Add filter)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/issues. Add filter → Priority → Urgent (URL `?priority=URGENT`, 11 cards).
2. Reload (filter kept). Click the sidebar "Overview", then "Issues" (URL still `?priority=URGENT`).
3. Add filter → Type → Bug (the chip choice was made via the popup).
**Expected:** The Priority=Urgent chip stays; Type=Bug is added (`?priority=URGENT&type=BUG`).
**Actual:** One run: after step 3 the URL was `/build/7/issues` (no chips) and the board showed all 83 Todo cards. Three later runs kept the filter: `?type=BUG&priority=URGENT` gave 4 cards with "2" in the filter count, and reload kept both. The sidebar "Overview" click did not navigate in the same run.
**Frequency:** 1/4 runs (not reproduced in the later three).
**Impact:** A silently dropped filter gives a false "all tickets" view.
**Suggested fix:** Keep filter state in the URL only (no separate local state that can overwrite it); log a toast when filters are reset by navigation.
**Test data:** None.

## B-025 — RETEST (round 4): Ordering still ignored on the board (5/5); list/table still reverse "Created" direction
Board (/build/7/issues, Display → Ordering) with Created, Updated, Priority, Due date and Manual gives the same Todo order every time (QAB-1, QAB-2, QAB-4, QAB-5 …), also after reload. Table with Created desc returns QAB-1, QAB-2, QAB-3 (oldest first). Still open; see B-034 for the table and list.


## B-037 — Board: dragging a card to a new position inside the same column is rejected (409 CONFLICT) and the card snaps back (High)
**Severity:** High — the only way to order work on the board (Manual ordering) does not work for cards inside a column; users think they have reordered priorities, but the server keeps the old order. Cross-column drags into a non-empty column do save (see B-028), so the failure is specific to in-column reorder.
**Area / URL:** https://www.streamlineos.in/build/7/issues?q=crash (Board, Todo column, Ordering = Manual)
**Preconditions / account:** Owner qaown1012b (Owner). Todo has 4 cards (QAB-103, 104, 105, 106).
**Steps:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash.
2. Real mouse (Playwright mouse: move to card, down, 25–30 small moves, up): drag "R3 crash probe 9 1013" (QAB-106) to the top of Todo above "R3 crash probe 6 1013" (QAB-103). Repeat with the drop placed on the lower half of QAB-104. Repeat once more with the Computer tool drag (see note).
3. Watch network for PATCH `…/tickets/<id>/rank`; read Todo order immediately, then after reload.
**Expected:** The card moves above QAB-103 (PATCH `…/rank` → 200) and the new order remains after reload.
**Actual:** The Todo order is unchanged immediately and after reload (QAB-103, 104, 105, 106) in all attempts. DevTools console (device mode, later in the run) showed a `…/tickets/<id>/rank` request → **HTTP 409** after one of the in-column drops, so the drop reaches the server and is rejected with a conflict, and the card snaps back with no message. My request listener did not capture the call, so the exact PATCH count is not confirmed. Computer-tool drags on the same cards also changed nothing (3 attempts; order unchanged after reload).
**Frequency:** 3/3 Playwright mouse (order unchanged; 409 seen once in console); 3/3 Computer tool (no change).
**Impact:** Manual ordering on the board cannot be changed inside a column; priorities set by drag are silently lost.
**Suggested fix:** Ensure the within-column drop computes a rank between neighbours and sends PATCH; give cards a visible drag handle (see U-015); add a keyboard reorder option (Alt+Arrow) and state it in the card menu.
**Test data:** QAB-101 moved Todo→In progress (cross-column, saved; see note below). Cleanup deletes QAB-97..106.

**Cross-column note (retest of B-028 and B-027):** QAB-101 dragged (Playwright mouse) from Todo into the non-empty In progress column saved on the server (reload: Todo 4, In progress 5). Before the reload the board still showed Todo 5 / In progress 4 (B-028 still stale). The same mouse drag into the empty In review column was not retested this round (not in the scope of this run).
**Computer tool note:** The Computer tool's drag path (19–20 points) did not start a board drag (no drag overlay, no PATCH) on either card, so the real-mouse retest used the Playwright mouse API (CDP mouse events). Recorded as a tool limitation, not a product defect.

## B-021 — RETEST (round 4): card "Ticket actions" menu did not crash the tab (0/4 this run)
Board /build/7/issues?q=crash (9 cards): "Ticket actions" opened the menu (Open, Copy link, Copy key, Archive, Delete) on 4 cards in sequence; the tab stayed alive. Crash not reproduced; keep as "needs repro" (still no root cause).


## B-038 — At 375 px, opening a ticket from a board card shows a sheet with only the title and a spinner for 6+ s; the full page appears only after a reload (needs repro) (Low)
**Severity:** Low — the ticket looks hung on a phone-width screen; no data loss. Same family as B-020 (heading stuck on "Loading...").
**Area / URL:** https://www.streamlineos.in/build/7/issues?q=crash (Board) at 375 px (DevTools device mode, 375 × 1026) → card "R3 crash probe 6 1013" (QAB-103)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Set device width 375. Open /build/7/issues?q=crash. Tap the card title.
2. Wait 2.5 s and again at 6.5 s; read the sheet.
3. Reload /build/7/tickets/QAB-103?returnTo=… and wait.
**Expected:** The ticket sheet shows the description, subtasks and activity within a few seconds, or a retry state.
**Actual:** Step 2: "To Do" and the title are shown, with a spinner in the body (no description, subtasks, or activity) in 2 reads over ~6 s. Step 3: the full ticket page renders in about 2 s (Description, Subtasks, Checklists, Relations, Activity). Details (Status/Priority/Type/Points/Cycle) open from the top-right icon as a bottom sheet and are fully visible.
**Frequency:** 1/1 at 375 px (not retried at desktop width).
**Impact:** Looks broken on mobile until reload.
**Suggested fix:** Show the ticket body skeleton with a timeout and retry (see B-020); prefetch the ticket on card tap.
**Test data:** None.


## B-039 — Posting a project update breaks the Updates page
- **Severity:** High. After one post, no one can view the project's updates at all.
- **Area:** https://www.streamlineos.in/build/7/updates. Owner (qaown1012b).
- **Steps:** 1) Open /build/7/updates. 2) Post the update "R4 update 1013 — status probe". 3) Look at the page. 4) Reload.
- **Expected:** the update appears in the list, and it still loads after a reload.
- **Actual:** POST returns 201, then the page shows "Something went wrong". After reload it shows "Failed to load project updates". No delete control is offered.
- **Frequency:** 1/1. **Impact:** the Updates feature is unusable for the project. **Suggested fix:** check the GET updates serializer for the new record (likely a null or format crash). Add an error boundary with retry and a delete option.

## B-040 — Long "Draft awaiting review" text overflows the sidebar
- **Severity:** Low. **Area:** Build sidebar. **Actual:** about 323 characters of unbroken text overflow the nav. **Suggested fix:** truncate with an ellipsis and a tooltip, or use word-break.

## B-041 — Long unbroken ticket title overflows the Triage row
- **Severity:** Low. **Area:** Triage, QAB-2. **Suggested fix:** use overflow-wrap:anywhere and line-clamp.

## B-042 — Agile reports URL returns Page Not Found
- **Severity:** Medium. **Area:** the Agile reports link. **Actual:** Page Not Found. **Suggested fix:** fix the route, or hide the link.

## U-025 — The Client portal Visibility tab has text only, with no controls
- Add the visibility toggles, or explain why none are available.

---
# Round 5 — build-2026-10-13 (Build module QA, owner qaown1012b, project 7 "QA Project Alpha"; no screenshots saved)
Cleanup first (see TEST-DATA.md "Round 5 — CLEANUP"). New IDs start at B-043. Test data for each item is listed in TEST-DATA.md.

## B-043 — Double-click on "Create epic" creates two epics (two tickets) (High)
**Severity:** High — silent duplication of a work item on a routine action (same class as B-001, B-014, B-015). Epics are stored as tickets, so the duplicate also appears in the board, table and counts.
**Area / URL:** Epics — https://www.streamlineos.in/build/7/epics → "Create Epic" → dialog "Create new epic" → "Create epic"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open https://www.streamlineos.in/build/7/epics (Epics count 9).
2. Click "Create Epic". Epic title: `R5 epic 1013`. Leave Priority = Medium.
3. Double-click "Create epic".
4. Read the Epics count and search `R5 epic` on /build/7/issues?view=table&q=R5%20epic.
**Expected:** One epic is created; the button is disabled while the request is in flight.
**Actual:** Two `POST https://api.streamlineos.in/build/7/tickets` requests, both `201`. Tickets QAB-111 and QAB-112 both titled "R5 epic 1013" (To Do / Medium). Epics count 9 → 11.
**Frequency:** 1/1 (double-click). Single-click create of an epic was not re-run this round (validation only).
**Impact:** Duplicate epics in the backlog and epic roll-ups; users must find and delete the extra one.
**Suggested fix:** As B-001: disable "Create epic" and set an in-flight guard on the first click; idempotency key per dialog session; keep the dialog open until one 201.
**Test data:** QAB-111 (deleted via Epic menu) and QAB-112 (deleted via table row menu) — both deleted in round 5 (TEST-DATA.md).

## B-044 — Double-click on "Create Milestone" creates two milestones (High)
**Severity:** High — duplicate checkpoint records on a routine action; target dates and owner rolls up twice.
**Area / URL:** Milestones — https://www.streamlineos.in/build/7/milestones → "New Milestone" → dialog "New Milestone" → "Create Milestone"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/milestones (list empty: "No milestones yet").
2. Click "New Milestone". Name `R5 milestone 1013`; Target Date: Oct 30, 2026 (picker); Status Pending.
3. Double-click "Create Milestone". Read the list.
**Expected:** One milestone; button disabled in flight.
**Actual:** Two `POST https://api.streamlineos.in/build/7/milestones` requests. The list shows "R5 milestone 1013 Pending Oct 30, 2026" twice ("2 Pending").
**Frequency:** 1/1 (double-click); single-click create worked (1 row) in the same session.
**Impact:** Duplicate milestones show as two deadlines; approvals and roll-ups can attach to the wrong copy.
**Suggested fix:** As B-001.
**Test data:** Both rows deleted in round 5 (one via Actions > Delete, one later via Actions > Delete).

## B-045 — Double-click on "Create Release" creates two releases (High)
**Severity:** High — duplicate release records on a routine action; release lists and version history are polluted.
**Area / URL:** Releases — https://www.streamlineos.in/build/7/releases → "New Release" → dialog "New Release" → "Create Release"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/releases. Click "New Release". Name `R5 release dbl 1013`; Version `2.0.0-beta`.
2. Double-click "Create Release". Read the list.
**Expected:** One release; button disabled in flight.
**Actual:** Two `POST https://api.streamlineos.in/build/7/releases` requests. Two rows "R5 release dbl 1013 2.0.0-beta Draft".
**Frequency:** 1/1 (double-click).
**Impact:** Duplicate release entries; users may publish one copy and leave the other as a draft.
**Suggested fix:** As B-001.
**Test data:** Both rows deleted in round 5 (DELETE 204 ×2 across the cleanup loop).

## B-046 — Budget: amount with 23 digits is sent unvalidated and the server returns 500 "An unexpected error occurred" (Medium)
**Severity:** Medium — no client or server range check on the Planned Budget. Any out-of-range entry produces a server error with no field message; the editor stays open with no explanation.
**Area / URL:** Budget — https://www.streamlineos.in/build/7/budget → "Set Budget" (inline editor, number input, Save/Cancel)
**Preconditions / account:** Owner qaown1012b (Owner). Budget was "Not set".
**Steps:**
1. Open /build/7/budget. Click "Set Budget".
2. In the Planned Budget number input type `99999999999999999999999`. Click "Save".
3. Read the network and the page.
**Expected:** Blocked with a field message such as "Budget must be 10,000,000,000 or less", or stored with a documented maximum.
**Actual:** `PATCH https://api.streamlineos.in/build/7/budget` → **500** `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred","correlationId":"29c7c8db-b8a2-4712-a162-024dcc792755"}`. The editor stays open ("Save"/"Cancel") with the value kept; no field error. A reload shows the old value (₹0 / Not set).
**Frequency:** 1/1 (repeated 9999999999 succeeds, so the failure is at a numeric limit between 1e10 and 1e23 — not tested further).
**Impact:** A single typo produces an error that looks like a server outage; no way to know why.
**Suggested fix:** Validate numeric range (e.g. 0 ≤ budget ≤ 1e12, or the DB column limit) on the client and server; return 400 with a field error mapped to the input.
**Test data:** None stored (budget restored to "Not set" after the tests).

## B-047 — Triage "Decline" always fails: the server rejects status CANCELLED and the ticket stays in triage with no visible message (Medium)
**Severity:** Medium — one of the two triage decisions does nothing; users cannot reject an incoming issue from triage.
**Area / URL:** Triage — https://www.streamlineos.in/build/7/triage → "Decline" on any row
**Preconditions / account:** Owner qaown1012b (Owner). Triage had unassigned tickets (QAB-109, QAB-110 in this run).
**Steps:**
1. Open /build/7/triage; search `R5` and press Enter (3 rows).
2. Click "Decline" on QAB-110 "R5 drag probe C 1013". Watch the network and the page.
3. Reload the triage page.
**Expected:** The ticket is declined (removed from triage, a status or reason is saved), or a clear message explains why not.
**Actual:** `PATCH https://api.streamlineos.in/build/7/tickets/121` → **400** `{"code":"PROJECTS_INVALID_TICKET_STATUS","message":"\"CANCELLED\" is not a valid status for this project"}`. The row stays in triage; no message appears in the page's main area (toast not confirmed). "Accept" on QAB-108 works (PATCH 200, one request on double-click, row removed).
**Frequency:** 2/2 Decline attempts (QAB-110 once from the row, and once from the position-based click that did not send a request).
**Impact:** Triage cannot reject items; the project's status list does not include CANCELLED, so the front end sends a value the project does not accept.
**Suggested fix:** Map "Decline" to a status the project allows (or add CANCELLED to the project's workflow), and show the 400 message inline; never send a status the project does not define.
**Test data:** QAB-108, QAB-109, QAB-110 deleted in round 5 (DELETE 204 each).

## B-048 — Release "Delete" also opens the "Edit Release" dialog underneath; the Delete confirmation is covered by the overlay, and Enter in the edit form saves the release (Medium)
**Severity:** Medium — a destructive action opens a second dialog with a live Save form; a keypress can save an unintended edit, and the confirmation button can't be clicked until the stray dialog is closed.
**Area / URL:** Releases — https://www.streamlineos.in/build/7/releases → row "Actions" menu → "Delete"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open /build/7/releases with a release row (e.g. "R4 release 1013", "R5 release 1013").
2. Click the row "Actions" button → "Delete".
3. Read open dialogs; click "Delete" in "Delete release?".
**Expected:** Only the "Delete release?" confirmation opens; its Delete button is clickable.
**Actual:** Step 2 opens the "Delete release?" alert AND the "Edit Release" dialog (both present; reproduced 3/3). Clicking the alert's "Delete" times out ("…<div data-slot="alert-dialog-overlay"> intercepts pointer events"). In one attempt focus was in the Edit form, and Enter sent `PATCH https://api.streamlineos.in/build/7/releases/1` → **200** (an unintended save of "R4 release 1013" with the form's values; the release was deleted afterwards). Pressing Escape closes the Edit dialog, after which the alert's Delete works (`DELETE /build/7/releases/<id>` → 204).
**Frequency:** 3/3 on the first Delete click per release; also seen on a second release.
**Impact:** Wrong-target saves via keyboard; users are stuck in a stacked dialog state; likely the same row-click handler opens Edit.
**Suggested fix:** Stop propagation of the menu item click (the row click opens Edit); render only one dialog; keep the Delete confirmation on top and focus it on open.
**Test data:** "R4 release 1013" (PATCH side effect), "R5 release 1013" and "R5 release dup 1013" — all deleted in round 5.

## B-049 — Duplicate release version accepted: two releases in the same project can both be "1.0" (Medium)
**Severity:** Medium — versions are the identity users rely on for release notes and deployments; duplicates make it unclear which release is which.
**Area / URL:** Releases — https://www.streamlineos.in/build/7/releases → "New Release"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Create "R5 release 1013" with version `1.0` (accepted, 201).
2. Click "New Release". Name `R5 release dup 1013`; Version `1.0`. Click "Create Release".
**Expected:** Rejected with "Version 1.0 already exists in this project" (409 or field error).
**Actual:** `POST https://api.streamlineos.in/build/7/releases` → **201** (id 3, version "1.0"). The list shows two rows with version 1.0.
**Frequency:** 1/1.
**Impact:** Ambiguous release history; release notes and tickets may attach to the wrong copy.
**Suggested fix:** Enforce unique version per project (server unique index + 409 with a field message).
**Test data:** Both deleted in round 5.

## B-050 — Budget: a negative amount is blocked with no visible message (Low)
**Severity:** Low — silent rejection; the user does not learn why nothing was saved.
**Area / URL:** Budget — https://www.streamlineos.in/build/7/budget → "Set Budget" → Planned Budget
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Click "Set Budget". Type `-500` in Planned Budget. Click "Save".
**Expected:** A message such as "Budget must be 0 or more" under the input, or the minus sign is not accepted.
**Actual:** No request is sent (no PATCH). The editor stays open with -500 in the field and no message appears in the page text (the number input has min="0", so the browser's native validation probably blocks submit silently).
**Frequency:** 1/1.
**Impact:** Users retry or assume the save is broken.
**Suggested fix:** Show an inline message on Save ("Budget must be 0 or more") and keep the value.
**Test data:** None.

## B-051 — Budget: decimal input is rounded to 2 places on the server and displayed with 1 place and a different total (Low)
**Severity:** Low — displayed figures disagree with each other; currency is not stored.
**Area / URL:** Budget — https://www.streamlineos.in/build/7/budget
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Click "Set Budget". Enter `12.345`. Click "Save".
2. Read the "Planned Budget" and "Remaining" values.
**Expected:** The input is limited to the currency precision (2 places rejected or shown), and all figures use the same rounding.
**Actual:** `PATCH https://api.streamlineos.in/build/7/budget` → 200 `{"budget":12.35,"currency":null}`. Page shows "Planned Budget ₹12.4" and "Remaining ₹12" (three different roundings of the same value). The response has `currency: null` while the UI always shows ₹.
**Frequency:** 1/1.
**Impact:** Budget totals look wrong by a few paise; reports and the UI can disagree.
**Suggested fix:** Validate to 2 decimal places on input; store the currency with the budget; use one formatter for all budget figures.
**Test data:** Budget restored to "Not set" afterwards.

## B-052 — Budget: large amounts are shortened to an unclear "₹1KCr" label (Low)
**Severity:** Low — the formatted value does not show what was entered; users can misread the budget by a factor of ten.
**Area / URL:** Budget — https://www.streamlineos.in/build/7/budget
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Click "Set Budget" / edit. Enter `9999999999` (9,999,999,999). Click "Save".
2. Read the "Planned Budget" and "Remaining" values.
**Expected:** Shows ₹999.9 Cr (or ₹9,999,999,999 in full) with the correct unit.
**Actual:** `PATCH` → 200 `budget: 9999999999`. Page shows "Planned Budget ₹1KCr" and "Remaining ₹1KCr" (the label reads as 1,000 Cr, not 999.9 Cr, and "KCr" is not a standard abbreviation).
**Frequency:** 1/1.
**Impact:** Overstated budget display; utilisation percentages use the stored value so the two disagree.
**Suggested fix:** Use one compact formatter (Lakh/Crore style for INR, e.g. ₹999.99 Cr) with correct rounding; show the full value in a tooltip.
**Test data:** Budget restored to "Not set".

## B-053 — Release version check accepts "1.0" and "1.0.0.0" but rejects "abc", "-1.0.0" and "v1..0" (Low)
**Severity:** Low — inconsistent version rule; the message says "e.g. 1.4.0 or v2.0.0-beta" but other forms pass.
**Area / URL:** Releases — https://www.streamlineos.in/build/7/releases → "New Release" / "Edit" → Version
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Create release with Version `abc` → "Enter a valid version, e.g. 1.4.0 or v2.0.0-beta" (no request). Correct.
2. Create with `1.0` → accepted (201).
3. Edit a release, Version `1.0.0.0` → Save → accepted (PATCH 200).
4. Edit, Version `-1.0.0` and `v1..0` → rejected with the same message.
**Expected:** One rule (for example semantic version, optional "v" and pre-release suffix). If "1.0" is allowed, say so in the hint.
**Actual:** As above. The trailing-space value `1.0.1013 ` is accepted and saved as `1.0.1013` (trimmed; fine).
**Frequency:** 1/1 each.
**Impact:** Inconsistent release labels (1.0 vs 1.0.0 vs 1.0.0.0).
**Suggested fix:** Use one validator shared by create and edit; normalise (e.g. 1.0 → 1.0.0) or document the accepted forms.
**Test data:** Versions deleted in round 5.

## B-054 — Approval "Delegate" to the requester fails with 400 and the dialog shows no error (Low)
**Severity:** Low — the server rule is right; the user gets no feedback, so the dialog looks stuck.
**Area / URL:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Delegate" → "New Approver"
**Preconditions / account:** Owner qaown1012b (Owner, also the requester).
**Steps:**
1. Open a request requested by qaown1012b. Click "Delegate". Choose "qaown1012b" as New Approver. Click "Delegate" (double-click tested).
**Expected:** Field error "The requester cannot approve their own request" or the option is hidden.
**Actual:** `PATCH https://api.streamlineos.in/build/7/approvals/1` → **400** `{"code":"BAD_REQUEST","message":"Approver cannot be the requester"}` (two requests on double-click). The dialog stays open with the same text; no message appears in its text.
**Frequency:** 1/1 (double-click: 2 PATCH, both 400).
**Impact:** Users retry without knowing the reason.
**Suggested fix:** Exclude the requester from the New Approver list, or map the 400 to a field error under the select.
**Test data:** Approval deleted in round 5.

## B-055 — Approval "Escalate" changes status to Escalated but the Level stays "1" (Low — needs repro)
**Severity:** Low — escalation may not route to the next level; the list says "Escalated" at Level 1.
**Area / URL:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Escalate"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Create a milestone approval (Level 1 — Standard) on a milestone.
2. Open "Approval actions" → "Escalate" (no confirmation; runs on click).
3. Reload and read the Level column.
**Expected:** Level becomes 2 ("Escalated (department manager)") and the approver changes or is notified.
**Actual:** Status "Escalated"; Level column still "1". The menu then drops "Escalate".
**Frequency:** 1/1 (needs repro with a second approval to confirm the level field and the response body).
**Impact:** Escalation may not reach the next approver.
**Suggested fix:** Set level = level + 1 on escalate and show the new level; add a confirm step.
**Test data:** Approval deleted in round 5.

## B-056 — Approval task picker cannot find tickets created recently (QAB-108..110): search returns "No items found" (Medium — needs repro)
**Severity:** Medium — a task that exists cannot be requested for approval; the picker only finds older tickets.
**Area / URL:** Approvals → "Request approval" → "Request task approval" → "Search tasks…"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Create three tickets "R5 drag probe A/B/C 1013" (QAB-108..110, minutes earlier).
2. Open the task picker; search `QAB-108`, `R5`, `R5 drag probe`.
3. Search `QAB-8`, `QAB-10`, `Bulk pag item 02` for comparison.
**Expected:** The new tickets appear.
**Actual:** QAB-108 / R5 / R5 drag probe → "No items found." (0 options). QAB-8 → QAB-8; QAB-10 → QAB-10; "Bulk pag item 02" → QAB-3. With an empty query the picker lists 50 tickets (QAB-3, QAB-1, QAB-2, QAB-4 …) and none of the new ones are in view.
**Frequency:** 3/3 queries for the new tickets; 4/4 for older ones (found).
**Impact:** Approvals for new work cannot be requested; the picker looks broken for recent items.
**Suggested fix:** Search the server (full query on the tickets endpoint with limit and pagination) instead of a fixed first-50 list; include recently created items.
**Test data:** QAB-108..110 deleted in round 5.

## B-057 — Save and Delegate buttons send a second PATCH on double-click (no in-flight guard) (Low)
**Severity:** Low — the second request overwrites the same values, so no data is duplicated; it is the same missing guard as B-001/B-003, and a slow network could let an older response overwrite a newer one.
**Area / URL:** Budget (Save), Epic edit (Save changes), Milestone edit (Save Changes), Approval Delegate (Delegate)
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:** Double-click the Save button of each dialog after changing one field.
**Expected:** One request; the button is disabled in flight.
**Actual:** Budget Save → 2 × PATCH /build/7/budget (200); Epic Save changes → 2 × PATCH /build/7/tickets/122 (200); Milestone Save Changes → 2 × PATCH /build/7/milestones/2 (200); Delegate → 2 × PATCH /build/7/approvals/1 (400 in the self-delegate case). Triage Accept (double-click) sent one PATCH.
**Frequency:** 4/4 dialogs.
**Impact:** Duplicate requests; out-of-order responses could leave stale values on a slow network.
**Suggested fix:** Disable the submit button and ignore further clicks while a request is in flight (as in B-001).
**Test data:** None left (records restored or deleted).

## B-058 — Milestones list still shows a deleted duplicate row until reload (Low — needs repro)
**Severity:** Low — the list looks unchanged after a delete; users may delete the same row again.
**Area / URL:** Milestones — https://www.streamlineos.in/build/7/milestones → row "Actions" → "Delete" → "Delete milestone?" → "Delete"
**Preconditions / account:** Owner qaown1012b (Owner). Two milestones named "R5 milestone 1013" (from B-044).
**Steps:**
1. Click "Actions for R5 milestone 1013" on the last row → "Delete" → "Delete" in the confirm.
2. Read the list immediately (no reload).
**Expected:** The deleted row disappears and the count drops to 1.
**Actual:** The list still shows two rows and "2 Pending" in the header until a reload; after reload it shows one row. (Deleting a single milestone did refresh the list in the same session.)
**Frequency:** 1/1 (needs repro).
**Impact:** Confusing state; users may repeat the delete.
**Suggested fix:** Invalidate and refetch the milestone list after DELETE (or remove the row from local state on 204).
**Test data:** Both rows deleted in round 5.

## B-037 — RETEST (round 5): in-column drag of a card is sent as PATCH …/rank and rejected with 409; cards can only be dragged from the title text (confirmed)
**Result:** Still open — reproduced with the Playwright mouse on the title text.
**Steps:** Board /build/7/issues?q=R5%20drag (Manual order, Todo column with QAB-108, 109, 110). Mouse down on the title text of "R5 drag probe B 1013" (QAB-109), 30 moves up to the top half of "R5 drag probe A 1013" (QAB-108), mouse up.
**Network:** `PATCH https://api.streamlineos.in/build/7/tickets/120/rank`; request `content-type: application/json`, `content-length: 55`. Request body: not readable through the tool (postData() is null), so the exact payload is not captured; the length is recorded.
**Status:** **409** `{"code":"CONFLICT","message":"Board order changed; refresh and retry","correlationId":"d8584a69-c916-4a5c-abd8-f5bbc672328d"}`. The card snaps back; Todo order unchanged after reload (QAB-108, 109, 110).
**Also:** QAB-110 dragged above QAB-108 (PATCH /tickets/121/rank) → 409 (correlationId 86e6dae5-…). Keyboard move of QAB-109 up one slot (Space, ArrowUp, Space) → PATCH /tickets/120/rank → 409 (correlationId ec49578c-…).
**Extra observation:** Mouse down on the card body (not the title text) started no drag and sent no request in 4 tries; the drag handle appears to be the title row only.
**Frequency:** 0/3 successful in-column moves; 3/3 409 when a request was sent.
**Impact:** Manual ordering inside a column is not saved (see B-037 original).
**Suggested fix:** Compute and return the rank for an in-column move (see B-027 fix); make the whole card a drag surface.
**Test data:** QAB-108..110 deleted in round 5.

---

# Round 6 — build-2026-10-13 (Build module QA, owner qaown1012b, project 7 "QA Project Alpha"; no screenshots saved)
Continues from B-058 and U-025. New IDs start at B-059 and U-026. Test data for each item is listed in TEST-DATA.md ("Round 6").

## B-059 — Release Notes editor is a fixed 639 px wide box: at 375 px it runs off the New Release dialog, and at desktop long lines are clipped (Medium)
**Severity:** Medium — the main text field of a release cannot be seen or used in full on a phone-width screen; the right part of the editor is cut off by the dialog edge.
**Area / URL:** Releases → "New Release" dialog (https://www.streamlineos.in/build/7/releases, dialog open), Release Notes rich-text editor, viewport 375 px (DevTools device mode, width 375).
**Preconditions / account:** Owner qaown1012b (Owner). No record is saved (dialog cancelled).
**Steps:**
1. Open https://www.streamlineos.in/build/7/releases at 375 px width.
2. Click "New Release".
3. Look at the Release Notes area and the Name / Version fields.
**Expected:** The editor fits the dialog width (same right edge as Name, Version and the other fields), or its text area wraps inside the dialog.
**Actual:** Name and Version fields end at about x=351 px. The Release Notes toolbar (Undo … Heading 3) and the editable area start at about x=27 px and are 639 px wide, so the editable area ends about 290 px past the right edge of the 375 px screen. The dialog's right border is not visible around the editor, and the "Heading 3" button sits at the edge.
**Frequency:** 1/1 at 375 px (measured with element boxes; not typed into).
**Also at desktop (1280 px, checked later in round 6):** the same editor box is 639 px wide at every width (contenteditable at x=1409 while the sheet starts at about x=940). Long lines run past the sheet edge and are clipped, with no wrap, so the root cause is a fixed width, not only the phone layout.
**Impact:** Release notes cannot be fully read or written on a phone; text typed at the right side is off-screen. Affects the release owners who review notes on mobile.
**Suggested fix:** Constrain the editor to the dialog width (`max-width:100%`, `min-width:0` on the flex/grid child), and wrap the toolbar. Check the same editor in the release detail (edit) dialog.
**Test data:** None (dialog cancelled, nothing saved).

## B-060 — At 375 px the ticket Activity action row is wider than the screen; the whole ticket page scrolls sideways and "Draft comment" is cut off (Medium)
**Severity:** Medium — on a phone-width screen the ticket page itself scrolls horizontally, and one of the three AI/assist buttons is clipped at the right edge with no visible scroll cue.
**Area / URL:** Ticket detail → ACTIVITY section header row ("Summarize comments", "Handoff", "Draft comment"), e.g. https://www.streamlineos.in/build/7/tickets/QAB-3, viewport 375 px.
**Preconditions / account:** Owner qaown1012b (Owner). Read-only check; nothing was posted.
**Steps:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-3 at 375 px width.
2. Scroll down to ACTIVITY (the composer with "Write a comment... (Ctrl+Enter to send)").
3. Look at the row above the composer. Try to scroll the ticket page sideways.
**Expected:** The action buttons wrap or collapse, and the page does not scroll sideways.
**Actual:** "Summarize comments" and "Handoff" fit; "Draft comment" starts at about x=280 px and is cut at the right edge of the screen. A horizontal scroll on that row moves the whole ticket page (title header, Relations "Add" button, comment composer and History) about 90 px to the left, so the page is wider than the 375 px viewport. The composer's "Write a comment" box is also cut at the left when the page is scrolled.
**Frequency:** 1/1 at 375 px (repeated on the scroll test).
**Impact:** Phone users cannot reach "Draft comment" without an accidental sideways scroll, and the ticket page shifts out of place. Other ticket content is not affected.
**Suggested fix:** Let the action row wrap (`flex-wrap`) or move the three buttons into one menu under 640 px; ensure the activity container has `min-width:0` and `overflow-x:hidden` only on the row, not on the page.
**Test data:** None (no comment posted; nothing saved).


## B-061 — Owner (not the named approver) can Approve a milestone approval: PATCH /approvals/<id>/decide → 200, status Approved (Medium — needs confirmation of intended policy)
**Severity:** Medium — an approval is meant to sign off a named approver; if any Owner/Admin account can decide for another approver, sign-off has no approver check and the audit trail shows the wrong person. Confirm whether an owner override is intended; if it is, the Decide dialog and the approval row should say so.
**Area / URL:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Decide"
**Preconditions / account:** Owner qaown1012b (Owner, project 7). Approver set to qamem1012c (Build Member). The signed-in user is NOT the approver.
**Steps:**
1. Open /build/7/approvals. Click "Request approval" → "Request milestone approval". Entity: milestone "R6 milestone 1013"; Title "R6 approval milestone 1013"; Approver qamem1012c; Submit (1 POST 201, row Pending).
2. Row "Approval actions" → "Decide". The dialog "Make Decision" opens (Decision: Approve / Reject / Request Changes; Comment optional).
3. Keep "Approve", comment "R6 probe: owner decides as non-approver", click "Submit".
**Expected:** The server refuses the decision (403/“Only the approver can decide”), or the owner override is documented and visible on the row (decided by, on behalf of).
**Actual:** `PATCH https://api.streamlineos.in/build/7/approvals/2/decide` → **200**. Toast "Decision submitted". The row changes to **Approved**. The row shows only the approver name (qamem1012c); nothing shows that the owner made the decision. The Decide dialog did not warn that the signed-in user is not the approver.
**Frequency:** 1/1. (Member qamem1012c's own decide was not run; the member sign-in was not attempted this round.)
**Impact:** Sign-off on a milestone can be recorded by someone other than the approver without any trace in the row. Release and milestone gates may then look approved by the wrong person.
**Suggested fix:** Server: check that the caller is the approver (or an active delegate) before accepting decide; allow an explicit admin override only with a reason and a visible "decided by" field. UI: show "You are not the approver" and disable Submit for non-approvers.
**Test data:** Approvals 2, 3, 4 deleted at the end of item 2 (DELETE 204 ×3). Milestone "R6 milestone 1013" remains for item 4 (see TEST-DATA.md).

## Round 6 approvals — checks with no new bug
- Decide Reject (no comment) on a pending approval: PATCH …/decide → 200, status Rejected (accepted with no comment; no bug).
- Cancel (confirm "Cancel approval" in "Cancel this approval?"): PATCH …/approvals/4 → 200, status Cancelled; the Keep button leaves it pending.
- Row menus after the decision: Approved, Rejected and Cancelled rows show only "Delete" (Decide is not offered again).
- Decide dialog options: Approve, Reject, Request Changes.
- Request milestone approval: picker shows "R6 milestone 1013" only after it loads; approver search lists qamem1012c.
- Not run: Request Changes (not requested); member qamem1012c's own Decide (sign-in not done); Delegate/Escalate covered in round 5.

## B-062 — Epic "Save changes" does not refresh the epic card: priority and status show the previous values until a reload (Medium)
**Severity:** Medium — the saved change is correct on the server, but the screen shows the old state, so users repeat the edit or think it did not save. The same stale-list pattern as B-058, but on the epic card; milestone edits do refresh at once (see Round 6 checks).
**Area / URL:** Epics — https://www.streamlineos.in/build/7/epics → epic card "More actions" → "Edit" → "Save changes" (epic "R6 epic 1013")
**Preconditions / account:** Owner qaown1012b (Owner). Epic with 3 linked items (1 Done, 2 To Do).
**Steps:**
1. Open /build/7/epics. On "R6 epic 1013" (card shows "Todo | Medium") click "More actions" → "Edit".
2. Priority → High; Status → In Progress. Click "Save changes".
3. Read the card immediately (no reload). Then repeat with Priority → Urgent and Status → Done, Save, read the card.
4. Reload /build/7/epics and read the card again.
**Expected:** The card updates to "In progress | High" right after the save (as the milestone card does).
**Actual:** After the first save the sheet closes and the card still reads "Todo | Medium". After the second save the card reads "In progress | High" (one save behind). After a reload it reads "Done | Urgent" (the last save). Both saves returned `PATCH https://api.streamlineos.in/build/7/tickets/129` → **200**.
**Frequency:** 2/2 saves.
**Impact:** Users think the epic was not saved and re-edit it; the board/epic status reports can show stale values in the same session.
**Suggested fix:** Refetch the epic list (or patch the card in local state) after the PATCH resolves; invalidate the same query the card reads. Compare with the milestone list, which updates on save.
**Test data:** Epic "R6 epic 1013" (ticket 129). Deleted at the end of round 6.

## B-063 — An epic can be set to "Done" while linked items are still open (1 of 3 done) with no warning (Low — needs confirmation of intended rule)
**Severity:** Low — the epic shows "Done" with a progress bar at 1 of 3 items and 3 of 10 points, so the status contradicts the roll-up. No warning or confirmation is shown.
**Area / URL:** Epics → "Edit" → Status → Done → "Save changes" (https://www.streamlineos.in/build/7/epics)
**Preconditions / account:** Owner qaown1012b (Owner). Epic "R6 epic 1013" with linked items: "R6 epic child 1013" (Done, 3 pts), "R6 parent 1013" (To Do, 5 pts), "R6 link target 1013" (To Do, 2 pts).
**Steps:**
1. Edit the epic, Status → Done, Save changes.
2. Reload /build/7/epics.
**Expected:** Either blocked ("2 linked items are still open") or a confirmation that says the open items stay open; or the status is derived from the items.
**Actual:** Save returns `PATCH …/tickets/129` → **200**, no warning. After reload the card reads "Done | Urgent | 1 of 3 items | 3 / 10 pts" with "To Do (2)".
**Frequency:** 1/1.
**Impact:** Epic status can say "Done" while most of the work is open; completed-epic counts and reports are then wrong.
**Suggested fix:** Confirm the intended rule. If manual status is allowed, show a warning listing open items; if not, derive "Done" from the linked items or block the change.
**Test data:** Epic "R6 epic 1013" (deleted at end of round 6).

## B-064 — Epic "Link" picker lists only stories, so tasks cannot be linked from the epic card, while the ticket Epic dropdown accepts tasks (Low)
**Severity:** Low — the epic page says "Organize related stories and tasks", but the Link picker hides every Task. Tasks can only be linked from the ticket's Epic dropdown, so the two entry points disagree.
**Area / URL:** Epics → epic card "Link" (https://www.streamlineos.in/build/7/epics); ticket Details → Epic (https://www.streamlineos.in/build/7/tickets/QAB-115)
**Preconditions / account:** Owner qaown1012b (Owner). QAB-115 "R6 epic child 1013" is type Task and unlinked (and QAB-116 / QAB-117 are Tasks too).
**Steps:**
1. Open /build/7/epics. On "R6 epic 1013" click "Link".
2. Read the list (search "R6").
3. Open QAB-115 and set Details → Epic to "R6 epic 1013".
**Expected:** Tasks are offered by "Link" as well (the page copy says stories and tasks), or the copy and the picker say "Stories only".
**Actual:** The Link list shows 23 stories ("Bulk pag item 02", "Pag B item 02" …, "BUG06 valid points 8") and no Task; "R6 epic child 1013" is not listed. Step 3 works: the Epic dropdown lists "R6 epic 1013" and the PATCH (tickets/126) saves (200). Reload shows "Epic: R6 epic 1013".
**Frequency:** 1/1 each path.
**Impact:** Tasks linked to epics only through the ticket page; bulk linking from the epic card misses them.
**Suggested fix:** Use one rule for both: list tasks and stories in the Link picker (with a type label), or change the epic copy to "stories".
**Test data:** QAB-115 / QAB-116 / QAB-117 (deleted at end of round 6).

## Round 6 checks with no new bug (items 3 and 4)
- Workload: Total/Assigned/Unassigned counts update after a single assignment (QAB-113 → qamem1012c: Assigned 0→1, Unassigned 79→… consistent after reload). Reassign from the workload row avatar (qamem1012c → qaown1012b, one PATCH) moves the count to qaown1012b 1 / qamem1012c 0 (verified after reload).
- Ticket Assignee (single-select picker): QAB-114 → qamem1012c, PATCH tickets/125 → 200.
- Cycle capacity: 100000 accepted and shown "100000 capacity" (UPCOMING, Draft); 100001 blocked client-side with "Capacity must be 100000 or fewer" (no request); 20-digit value blocked client-side (same message); "-1" → "Capacity must be a whole number of points". Overlap with an existing cycle: 409 with toast "Cycle dates overlap with …" (both the Completed and Upcoming cycles).
- Epic progress math: 0 items → "0 of 0 items / 0 pts". After linking QAB-115 (3 pts, Done), QAB-116 (5 pts, To Do), QAB-117 (2 pts, To Do): "1 of 3 items", "3 / 10 pts" (correct). Progress bar is item-based (about 33%).
- Epic Link: a story picked from the Link list attaches (not re-run).
- Milestone "R6 milestone 1013": Pending → Achieved (PATCH milestones/5 → 200; card updates at once), Achieved → Missed (200; card "Missed").

## B-065 — Release "Readiness" and "Risk Level" are not saved: values chosen on create and on edit ("Release updated") come back as "Not set" / "—" (High)
**Severity:** High — two release-gating fields are silently dropped. The UI reports success, so readiness and risk look signed off when they are not recorded at all.
**Area / URL:** Releases → "New Release" (https://www.streamlineos.in/build/7/releases) and release "Edit" → Readiness / Risk Level → "Create Release" / "Save Changes"
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Click "New Release". Name "R6 release 1013", Version "6.0.1013", Readiness "Blocked", Risk Level "High". Click "Create Release" once.
2. Reload /build/7/releases. Open the row's "Actions" → "Edit" and read Readiness and Risk Level.
3. Edit the same release: Readiness "Ready", Risk Level "Critical". Click "Save Changes". Reload and open Edit again.
**Expected:** Readiness and Risk Level are stored and shown in the list columns "Readiness" and "Risk" and in the Edit form.
**Actual:** Create: `POST https://api.streamlineos.in/build/7/releases → 201`. The list shows "—" under Readiness and Risk; Edit shows "Not set" for both. Edit: `PATCH https://api.streamlineos.in/build/7/releases/6` → toast "Release updated"; after reload Readiness and Risk still show "Not set" / "—".
**Frequency:** 2/2 (create and edit).
**Impact:** Risk and readiness cannot be recorded. Any report or gate that reads these fields shows nothing, and no error is shown.
**Suggested fix:** Check the release create/update payload mapping for `readiness` and `riskLevel` (the fields are sent but not saved, or not read back in the GET list/detail). Add a round-trip test (create, reload, edit) to the release tests.
**Test data:** Release "R6 release 1013" (id 6). Deleted at end of round 6.

## B-066 — Release notes: 10,000 characters pass the editor counter but the server rejects them with 400; the error shows the raw field name "description:" (Medium)
**Severity:** Medium — the counter says "10,000 / 10,000" (valid), but Save does nothing visible except a top toast; the user cannot tell that the limit is lower for the saved text.
**Area / URL:** Releases → release "Edit" → Release Notes → "Save Changes" (https://www.streamlineos.in/build/7/releases)
**Preconditions / account:** Owner qaown1012b (Owner). Release "R6 release 1013".
**Steps:**
1. Edit the release. Select all in Release Notes and enter exactly 10,000 characters (e.g. "LONG0913 R6 lorem ipsum … " repeated, cut to 10,000).
2. Read the counter ("10,000 / 10,000"). Click "Save Changes".
3. Read the toast/alert and the network response.
4. Replace the text with 9,000 characters and save again.
**Expected:** Either the editor's counter counts what the server counts (so 10,000 is blocked before submit with a clear note), or the server accepts 10,000 characters.
**Actual:** Step 2: `PATCH https://api.streamlineos.in/build/7/releases/6` → **400**. The top toast reads "description: Release notes must be 10,000 characters or fewer" (raw field key "description:"); the dialog stays open and nothing is saved. Step 4: 9,000 characters → **200**. Earlier, a 10,050-character paste was blocked client-side with "Release notes must be 10,000 characters or fewer" (no request), and that message stayed on screen after the text was cut to 10,000, so the first Save click at 10,000 sent nothing and only the second click sent the PATCH.
**Frequency:** 2/2 at 10,000 characters; 9,000 characters saved 1/1.
**Impact:** Users who write the maximum length lose their save with a confusing message. The limit appears to be counted on the stored HTML (the `<p>` wrapper adds characters) while the editor counts plain text.
**Suggested fix:** Count the same value on both sides (the stored HTML length or plain text), show the limit against that count, and clear the old length error when the text is valid. Map server validation to the field, without the raw key "description:".
**Test data:** Release "R6 release 1013" (notes set to 9,000 characters; release deleted at end of round 6).

## B-067 — Release list counters and status lag behind an edit (Draft/Archived counts still old for a few seconds; intermittent) (Low — needs repro)
**Severity:** Low — the saved status is correct after a reload or a few seconds, but counters can show the old state right after Save, so users repeat the change.
**Area / URL:** Releases → release "Edit" → Status → "Save Changes" (https://www.streamlineos.in/build/7/releases)
**Preconditions / account:** Owner qaown1012b (Owner). Release "R6 release 1013" (Draft).
**Steps:**
1. Edit the release, Status → Archived, "Save Changes". Read the counters and row status at about 2 s.
2. Edit again, Status → Draft, "Save Changes". Read at about 2 s, then reload.
**Expected:** The row status and the Draft / Archived counters update at once.
**Actual:** Step 1: PATCH → 200; at 2 s the counters still read "Draft 1 / Archived 0" and the row was "Draft" until a reload showed "Archived 1 / Draft 0". Step 2: PATCH → 200; at 2 s the counters still read "Archived 1 / Draft 0"; the reload shows "Draft 1 / Archived 0". Two other saves (Released, then Archived) updated the list at once with the "Release updated" toast.
**Frequency:** 2 of 4 saves lagged. Needs repro with the Network panel.
**Impact:** Confusing status after a change; no data loss.
**Suggested fix:** Refetch the release list (or update the row and counters from the PATCH response) on every save, not only on some status changes. Same family as B-062 (epic card) and B-058 (milestone list).
**Test data:** Release "R6 release 1013" (deleted at end of round 6).

## B-068 — Release list preview shows the release notes as escaped HTML ("&gt;&lt;img src=x onerror=…") (Low)
**Severity:** Low — the payload is not executed (see round 6 XSS check), but the list preview shows HTML entities as literal text, so the notes look corrupted.
**Area / URL:** Releases list → row preview under the version (https://www.streamlineos.in/build/7/releases)
**Preconditions / account:** Owner qaown1012b (Owner). Release "R6 release 1013" with notes typed as `"><img src=x onerror=alert(1)> R6 XSS probe`.
**Steps:**
1. Create the release with the notes above (or edit the notes). Look at the row preview.
2. Open Edit and read the Release Notes editor.
**Expected:** The preview shows `"><img src=x onerror=alert(1)> R6 XSS probe` as plain text (no entities), the same as the editor.
**Actual:** The editor shows `"><img src=x onerror=alert(1)> R6 XSS probe` (correct, no element created, no dialog). The list preview shows `"&gt;&lt;img src=x onerror=alert(1)&gt; R6 XSS probe` — the stored HTML (`<p>&quot;&gt;&lt;img …</p>`) is printed as text with its entities.
**Frequency:** 1/1.
**Impact:** Notes look garbled in the list; a note written with `<`, `>` or `&` shows entity codes.
**Suggested fix:** Decode the entities (or strip tags with an HTML-to-text function that decodes) in the preview, or store plain text for the preview.
**Test data:** Release "R6 release 1013" (deleted at end of round 6).

## Round 6 checks with no new bug (item 5)
- XSS payloads: `"><img src=x onerror=alert(1)> R6 XSS probe` typed into Release Notes: no `img` element created in the editor, no dialog (alert) observed; the saved note is escaped text. The label list (project settings) shows the existing `"><img…` label as text. PASS for execution (see B-068 for the preview display).
- Release Notes counter: 52 / 10,000 on a new release; over-limit paste blocked client-side with "Release notes must be 10,000 characters or fewer" (no request).
- Status: Draft → Released opens "Publish 'R6 release 1013'?" (Cancel / Publish); Publish → PATCH 200, "Release updated", Published "Oct 13, 2026". Released → Archived: PATCH 200, Published cleared to "—". Archived → Draft: PATCH 200 (B-067 lag on the list). "Archived" filter (?status=archived) shows the archived release; "Draft" filter with none matching shows "No releases match your filters" with "Clear filters".
- Release Date: Oct 20, 2026 saved and shown in the list (Release Date column).
- Date filter ("Filter by release date…"): picking one day sets from=2026-10-20 in the URL; a release with no release date is correctly excluded.
- Release version: "6.0.1013" accepted (round 5 rule check unchanged).
- Not run: Risk / Readiness filters (no such filter exists on the page); release Delete (done in cleanup).

## B-069 — Dragging timeline bars does not reschedule tickets
- **Severity:** Low. Needs confirmation, because drag-to-reschedule may not be a feature.
- **Area:** /build/7 Timeline. Owner.
- **Steps:** 1) Open Timeline with a ticket that has start Oct 19 and due Oct 22 (QAB-113). 2) Drag the bar left or right, or drag its edges.
- **Expected:** the dates update, or the bars are clearly not draggable (no grab cursor).
- **Actual:** the bar never moves (6 attempts), and a mouse-up on a bar sometimes opens the ticket.
- **Impact:** users expect Gantt-style rescheduling and get no feedback. **Suggested fix:** add drag-to-reschedule with a PATCH of the dates, or make the bars click-only and say so.

# Round 7 — build-2026-10-13 (Build module QA, owner qaown1012b, project 7 "QA Project Alpha"; no screenshots saved)
Continues from B-069. New IDs start at B-070. Test data for each item is listed in TEST-DATA.md ("Round 7"). Item 1 = subtasks and links on QAB-113 to QAB-117 (QAB-113 "R6 workload A 1013", QAB-114 "R6 workload B 1013", QAB-115 "R6 epic child 1013", QAB-116 "R6 parent 1013", QAB-117 "R6 link target 1013"; QAB-119 "R7 subtask probe 1013" created during the test).

## B-070 — Relation direction is not inverted on the other ticket: "Blocks" shows as "Blocks" on the blocked ticket and "Blocked by" shows as "Blocked by" on the blocker (Medium)
**Severity:** Medium — the dependency direction is shown backwards on one of the two tickets, so a reader of the blocked ticket sees it as the blocker (and the reverse). Planning and "what is blocking me" views are wrong, with no error shown.
**Area / URL:** Ticket Relations section — https://www.streamlineos.in/build/7/tickets/QAB-113, /QAB-114, /QAB-115, /QAB-117
**Preconditions / account:** Owner qaown1012b (Owner, project 7).
**Steps:**
1. Open QAB-113. Relations → Add → type "Blocks" → search "R6 workload B" → select → "Add Relation". (Relation 1: QAB-113 blocks QAB-114.)
2. Open QAB-114 (no reload needed; reload to be sure). Read Relations.
3. Open QAB-115. Relations → Add → type "Blocked by" → search "R6 link target" → "Add Relation" (POST /build/7/tickets/126/relations → 201). Open QAB-117 and read Relations.
4. Open QAB-115 → Relations → Add → "Blocks" → "R6 workload B" → "Add Relation" (POST /build/7/tickets/126/relations → 201). Open QAB-114 and read Relations.
**Expected:** On the blocked ticket the relation reads "Blocked by <blocker>"; on the blocker it reads "Blocks <blocked>". Each side shows the inverse of the type chosen on the other side.
**Actual:** QAB-113 shows "Blocks — R6 workload B 1013 (QAB-114)" (correct). QAB-114 shows "Blocks — R6 workload A 1013 (QAB-113)" (should be "Blocked by"). QAB-115 shows "Blocked by — R6 link target 1013 (QAB-117)" (correct). QAB-117 shows "Blocked by — R6 epic child 1013 (QAB-115)" (should be "Blocks"). After step 4, QAB-114 shows "Blocks — R6 workload A 1013 (QAB-113)" and "Blocks — R6 epic child 1013 (QAB-115)". Reloads give the same result. "Relates to" is symmetric and shows correctly on both sides.
**Frequency:** 3/3 blocks or blocked-by links created (QAB-113 Blocks QAB-114; QAB-115 Blocked by QAB-117; QAB-115 Blocks QAB-114): the other ticket showed the wrong label each time; reproduced after reload.
**Impact:** Dependencies read backwards on the blocked ticket, so the blocked ticket looks like the blocker. Anyone using the Relations list to decide what to start next gets the wrong answer.
**Suggested fix:** Store one link row per direction, or derive the label on read by inverting the type when the ticket is the target (Blocks ↔ Blocked by; Duplicate of is inverted to "Duplicated by"). Add a test that creates Blocks on A and checks B shows Blocked by A.
**Test data:** QAB-113, QAB-114, QAB-115, QAB-117 (QAB-117 deleted in item 1; others deleted in cleanup).

## B-071 — Deleting a parent that has children gives no warning and silently clears the children's parent (Low)
**Severity:** Low — the delete does not lose child tickets, but the children lose their parent link with no notice, and the confirmation says only "This cannot be undone".
**Area / URL:** Ticket page → "Delete ticket" (trash icon) → "Delete Ticket" popover (https://www.streamlineos.in/build/7/tickets/QAB-117)
**Preconditions / account:** Owner qaown1012b (Owner). QAB-117 "R6 link target 1013" had one child, QAB-115 "R6 epic child 1013" (1/1 Done in the Subtasks header), plus a Blocks/Relates-to link set.
**Steps:**
1. Open QAB-117. Confirm the Subtasks header shows "1/1" with QAB-115.
2. Click the trash icon ("Delete ticket"). Read the confirmation.
3. Click "Delete".
4. Open QAB-115 and QAB-113 and read the Parent field and Relations.
**Expected:** The confirmation names the child count and says what happens to children (kept without parent, or blocked until they are moved). The child keeps a visible notice or history entry.
**Actual:** Confirmation: "Delete Ticket — This cannot be undone." (no mention of the child). `DELETE https://api.streamlineos.in/build/7/tickets/128` → **204**, toast "Ticket deleted", redirect to /build/7/issues. QAB-115 still exists, Done, Parent field now "Add parent" (empty). The "Relates to" and "Blocked by" links to QAB-117 were removed from QAB-113 and QAB-115 too. No history entry about the parent change was seen on QAB-115.
**Frequency:** 1/1.
**Impact:** A parent can be deleted with children and no one is told; epics/parents can disappear from planning views while their children stay unparented.
**Suggested fix:** Show "This ticket has N subtasks. They will be left without a parent." in the confirmation (or block the delete until children are moved). Record a history entry on each child when its parent is cleared.
**Test data:** QAB-117 deleted (item 1); QAB-115 kept for the move test.

## B-072 — Parent picker offers the ticket's own child, and the server rejects it with a 400 that leaves the picker open (Low)
**Severity:** Low — the cycle is correctly refused (see round 7 checks), but the UI offers an invalid choice and then gives a single toast while the picker stays open with the item still listed.
**Area / URL:** Ticket Details → Parent picker (https://www.streamlineos.in/build/7/tickets/QAB-113 and /QAB-116)
**Preconditions / account:** Owner qaown1012b (Owner). QAB-114 is a child of QAB-113 (set from QAB-114 → Parent). QAB-115 is a child of QAB-116.
**Steps:**
1. Open QAB-113 → Parent → "Add parent" → search "R6 workload" (the list shows QAB-114 "R6 workload B 1013"). Select QAB-114.
2. Read the toast and the picker.
3. On QAB-116 (child QAB-115 "R6 epic child 1013"), Parent → search "R6 epic child" → select QAB-115.
**Expected:** The child-tickets of the current ticket are not offered as parents (as self is not offered), or the choice is refused with a message that names the reason and the picker closes.
**Actual:** Step 1: the list offers QAB-114. Selecting it sends `PATCH https://api.streamlineos.in/build/7/tickets/124` → **400** `{"code":"BAD_REQUEST","message":"Cannot set parent: this would create a cycle"}`; toast "Cannot set parent: this would create a cycle"; the Parent field stays "Add parent". The picker stays open with the same item listed. Step 3: the same toast appeared again (the response was not captured on that run; the toast was seen), and the picker stayed open. Self (QAB-113 on its own picker) is not offered (PASS).
**Frequency:** 2/2 (both directions).
**Impact:** Users try an invalid parent, get a generic message, and must reopen the picker. It is clear the cycle rule exists only on the server.
**Suggested fix:** Exclude descendants of the current ticket from the parent picker (as self is already excluded). Close the picker on the 400 and show the message next to the Parent field.
**Test data:** None saved (both PATCHes refused; QAB-113 and QAB-116 parents unchanged).

## B-073 — A subtask can only be added from the parent by creating a new ticket; an existing ticket cannot be attached as a child from the parent side (Low — needs confirmation)
**Severity:** Low — the "Add subtask…" box on a parent creates a new ticket each time. Attaching an existing ticket works only from the child's Parent field, so "set a child from the parent" is not possible for existing work.
**Area / URL:** Ticket Subtasks section — https://www.streamlineos.in/build/7/tickets/QAB-113
**Preconditions / account:** Owner qaown1012b (Owner).
**Steps:**
1. Open QAB-113. In "Add subtask…" type "R7 subtask probe 1013" and press Enter.
2. Look for a way to pick an existing ticket as a subtask of QAB-113.
**Expected:** Either the subtask box offers existing tickets (search) or there is an explicit "Add existing" action; the created subtask is clearly new.
**Actual:** Enter → `POST https://api.streamlineos.in/build/7/tickets` → **201**; new ticket QAB-119 (internal 130) "R7 subtask probe 1013" appears under QAB-113 with parent QAB-113 (status To Do). No picker for existing tickets exists in the Subtasks section; the only way to attach an existing ticket is the child's Parent field (QAB-114 attached that way).
**Frequency:** 1/1 create; 0 attach paths from the parent side.
**Impact:** Users who meant to attach existing work end up with duplicate tickets. Confirm whether the parent-side attach is intended.
**Suggested fix:** Add a search-to-attach control in the Subtasks header (reuse the parent picker) and keep "type a title" for new subtasks with a clear label.
**Test data:** QAB-119 "R7 subtask probe 1013" (deleted in cleanup).

## Round 7 checks with no new bug (item 1: links and subtasks)
- Set parent from the child (QAB-114 → QAB-113): PATCH /build/7/tickets/125 → **200**, toast "Parent set"; parent QAB-113 shows Subtasks 0/1 with QAB-114.
- Set parent from the child (QAB-115 → QAB-116): PATCH /build/7/tickets/126 → **200**; parent QAB-116 shows Subtasks 1/1 with QAB-115 (Done, struck through).
- Parent-side child list: QAB-116, QAB-113 and QAB-117 each show their children in the Subtasks section (after a short skeleton load; the section filled within about 1 s on a later load).
- Circular parent, both ways: QAB-113 parent = QAB-114 (QAB-114 is its child) → PATCH /build/7/tickets/124 → **400** "Cannot set parent: this would create a cycle" (PASS: refused, parent unchanged). QAB-116 parent = QAB-115 → refused with the same message (PASS; the response was not captured on that run).
- Self-parent: QAB-113 not offered in its own parent picker (PASS, no request).
- Self-link: QAB-113 not offered in its own Relations picker ("No tickets found.") (PASS, no request).
- Duplicate link: a ticket already linked is removed from the Relations picker on both sides (QAB-113 → QAB-114 Blocks; QAB-114 Blocked by QAB-113 shows "No tickets found."; QAB-114 Relates to QAB-116 after QAB-116 Relates to QAB-114 shows "No tickets found.") (PASS for prevention; no duplicate row created). Observation: the message "No tickets found." is misleading for a ticket that exists but is already linked.
- Relation create status: POST /build/7/tickets/126/relations → **201** (Blocked by QAB-117; Blocks QAB-114), POST /build/7/tickets/127/relations → **201** (Relates to QAB-114). The first two relation creates in this round (QAB-113 Blocks QAB-114, QAB-113 Relates to QAB-117) showed the link at once but the network listener did not capture their status.
- Move child to another parent: QAB-115 parent QAB-116 → QAB-113 (PATCH /tickets/126 → 200) → QAB-117 (PATCH /tickets/126 → 200, toast "Parent set"). QAB-116 and QAB-113 no longer list QAB-115; QAB-117 lists it (1/1). PASS.
- Delete parent with child: see B-071 (DELETE /tickets/128 → 204).

## B-048 — RETEST (round 7): Release "Delete" still opens "Edit Release" underneath, and its confirm "Delete" button was not clickable by automation (overlay) (Medium — still open)
**Result:** Still reproduces. Actions → Delete on "R6 release 1013" opened the "Delete release?" alert and the full "Edit Release" side sheet at the same time (Name, Version, Status, Readiness "Not set", Risk Level "Not set", Release Notes). A browser click on the alert's "Delete" was intercepted by the alert overlay (`alert-dialog-overlay intercepts pointer events`) for 5 s and failed; a mouse click on the same button at the right position then deleted the release. No Enter key was pressed in the edit form and nothing was saved from it.
**Test data:** Release "R6 release 1013" (deleted in round 7 cleanup; see TEST-DATA.md).

## Round 7 cleanup (item 2) — result
- Tickets: QAB-113 "R6 workload A 1013", QAB-114 "R6 workload B 1013", QAB-115 "R6 epic child 1013", QAB-116 "R6 parent 1013", QAB-119 "R7 subtask probe 1013" (created in item 1): deleted via ticket page → "Delete ticket" → "Delete". Verified: QAB-114 DELETE /tickets/125 → 204; QAB-116 DELETE /tickets/127 → 204; QAB-119 DELETE /tickets/130 → 204; QAB-113 and QAB-115 were deleted in the same batch (the batch hit the 30 s limit; their status codes were not captured, but both are absent from the table search). QAB-117 was deleted in item 1 (DELETE /tickets/128 → 204).
- Epic "R6 epic 1013" (ticket QAB-118, internal 129; Epic type, Done/Urgent, 0 items): confirmed in Epics before delete; Epics → card "More actions" → "Delete" → "Delete epic?" → Delete: DELETE /build/7/tickets/129 → 204. Epics count 10 → 9; no "R6 epic 1013" in the list after reload.
- Milestone "R6 milestone 1013" (id 5, Missed): Actions → Delete → Delete: DELETE /build/7/milestones/5 → 204. The list still showed the row until a reload (B-058 pattern); after reload "No milestones yet".
- Release "R6 release 1013" (id 6, Draft): Actions → Delete → Delete (see B-048 retest). Row gone after reload; the status code was not captured.
- Verification after cleanup: table search "1013" → "No tickets match your filters"; table search "R6" → "No tickets match your filters"; "R7" → none; Epics count 9; Milestones "No milestones yet"; Releases list has no R6 row.
- Items not deleted: none of the test records remain. Fixtures export-roundtrip-0913.csv and export-roundtrip-retitled-0913.csv are intentional test fixtures and were not touched.

## Round 7 summary
- New bugs B-070 to B-073 (4 items): Medium 1 (B-070 blocks/blocked-by direction not inverted on the other ticket), Low 3 (B-071 parent delete with children gives no warning and silently clears child parents; B-072 parent picker offers the ticket's own child and the 400 leaves the picker open; B-073 parent-side subtask only creates new tickets — needs confirmation).
- Retest: B-048 still open (Edit sheet under Delete confirm). B-058 milestone list stale after delete reproduced again (row shown until reload).

## B-074 — Portfolio and Program accept a whitespace-only name
- **Severity:** Medium. It creates nameless records that can't be identified in lists.
- **Area:** /build portfolios and programs, Create dialog. Owner.
- **Steps:** 1) Create Portfolio (or Program). 2) Enter only spaces as the name. 3) Submit.
- **Expected:** the "Required" error (the empty name already shows it).
- **Actual:** POST 201. The record is saved with a blank name (portfolio id 3, program id 3; both deleted).
- **Frequency:** 1/1 each. **Suggested fix:** trim the name on the client and the server before validating (same root cause as B-007).

## B-075 — Product, portfolio and program lists don't refresh after create or delete
- **Severity:** Low/Medium. After create, the list keeps its empty state or stale rows. After delete, the row stays until reload (same pattern as B-058).
- **Suggested fix:** invalidate or refetch the list query on a mutation's success.

## B-076 — The approvals list keeps the old status after Decide or Escalate
- **Severity:** Low. The row shows "Pending" until reload. **Suggested fix:** use an optimistic update or refetch.

## B-077 — An approval due date in the past is accepted, and the date format is inconsistent
- **Severity:** Low. A due date of 2026-10-01 is saved with 201. The milestone picker disables past days, so the two pickers disagree. The list shows the raw ISO date, while other rows show "—".
- **Suggested fix:** use the same past-date rule for both, and format dates consistently.

## B-078 — Ticket tab crashes during navigation
- **Severity:** Medium (needs repro). The QAB-122 tab showed "Page crashed" while navigating between linked tickets. This is related to B-021, B-026 and B-032 (renderer crashes).

## B-079 — A link added in the Create dialog has no edit or remove control
- **Severity:** Low (needs confirmation). The link shows under the sidebar "LINKS" section, not under Relations, and there is no remove control.

## B-080 — The Timeline month dropdown shows the previous month
- **Severity:** Low. Selecting November shows "October", and selecting December shows "November". The grid itself is correct.

## B-081 — The Sub-issues display toggle has no effect
- **Severity:** Low (needs repro). With Sub-issues off, child tickets still appear in table results.

### Retest notes (round 8)
- B-070 also affects "Duplicate of".
- These still reproduce: B-055, B-056, B-011 (with an intermittent "Calendar error"), B-030 (about 9 s, then "Failed to load project"), B-039.
- B-042: /build/7/agile-reports returns 404. The working page is /build/7/reports, but nothing links to it.

## B-082 — Remove parent and removing a "Duplicate of" link leave no entry in the ticket history (Low — needs repro)
**Severity:** Low — the audit trail misses relation and parent changes, so nobody can tell who unlinked a ticket or when.
**Area / URL:** Ticket page history/activity — https://www.streamlineos.in/build/7/tickets/QAB-120, /QAB-121, /QAB-122 (round 8, owner qaown1012b).
**Preconditions / account:** Owner qaown1012b (Owner, project 7).
**Steps:**
1. On QAB-122 (parent QAB-121), click "Remove parent".
2. On QAB-120, remove the "Duplicate of" relation to QAB-121 (the other side of the earlier "Duplicate of" link).
3. Read the ticket activity/history on both tickets after each change.
**Expected:** Each change adds a history entry (who removed what, when), the same as parent set and relation add.
**Actual:** The parent and relation changes update the Relations/Parent fields, but no matching entry appears in the history. (Run-note observation; exact request statuses were not saved in this context — re-verify.)
**Frequency:** Observed on the round 8 removals; re-check to confirm 2/2.
**Impact:** Unlinking is invisible in the audit trail; disputes about parent/dependency changes cannot be traced.
**Suggested fix:** Write an activity entry for parent set/removed and relation added/removed, and show it in the ticket history.
**Test data:** QAB-120, QAB-121, QAB-122 (deleted in round 8 cleanup).

## B-083 — At 375 px the Settings "Statuses" tab truncates text (Low — needs re-check)
**Severity:** Low — cosmetic clipping on a mobile settings tab.
**Area / URL:** Build settings — https://www.streamlineos.in/build/7/settings (tab "Statuses"), Chrome device mode 375 px.
**Preconditions / account:** Owner qaown1012b.
**Steps:** 1) Open /build/7/settings at 375 px width. 2) Open the "Statuses" tab. 3) Read the status rows.
**Expected:** Status names and their controls fit the 375 px width, or wrap.
**Actual:** Some status row text is cut at the right edge (run-note observation). The General, Labels, Custom Fields, Teams & Roster and Danger Zone tabs looked fine.
**Frequency:** Seen once in the round 8 pass; re-check.
**Impact:** Minor; a status name may be unreadable on a phone.
**Suggested fix:** Let the status row text wrap or truncate with a title tooltip; check the other settings tab rows at 375 px.
**Test data:** None.

### Retest notes (round 8 / round 9)
- B-078 (ticket tab "Page crashed") — retested in round 8 on QAB-122: the tab crashed again; the crashed tab was closed before continuing. Still open.
- B-048 (release Delete opens "Edit Release" under the confirm; confirm button covered by overlay) — still reproduces in round 8 (release id 7 deleted via coordinate click). Still open.
- B-058 / B-075 / B-076 (lists stale after delete or decision until reload) — still reproduce for approvals and releases in round 8; a reload shows the correct list.
- Round 9 (375 px): Create Issue sheet, Create Cycle dialog, New Release dialog and Request Approval dialog all fit at 375 px (no clipping of the Create/Submit buttons). B-059 (Release Notes fixed width at 375 px) and B-060 (ticket Activity row width at 375 px) were not re-checked in round 9.

# Round 10 — build-2026-10-13 (Build module RBAC run, project 7 "QA Project Alpha"; no screenshots saved)
Continues from B-083. New IDs start at B-084. Test data in TEST-DATA.md ("Round 10"). RBAC lines in RBAC-ROUND10.md.

## B-084 — Assigned approver (Member, Build Member) has no Decide control: the approval row's Actions cell is empty and row click opens nothing (High — needs confirmation of intended permission)
**Severity:** High — the designated approver cannot record a decision in the UI, so a milestone/task approval assigned to a member stays Pending with no way to act on it except via someone else (Owner/Admin). Gate approvals stall silently.
**Area / URL:** Approvals — https://www.streamlineos.in/build/7/approvals (list) and the Inbox item "Approval requested" — https://www.streamlineos.in/build/inbox
**Preconditions / account:** Member qamem1012c (Member + Build Member, project 7). Approvals assigned to qamem1012c created by owner qaown1012b: "R10 milestone approval" (approval id 9, entity milestone 7) and "R10 task approval" (approval id 10, entity task QAB-4).
**Steps:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/approvals.
2. Read the Actions cell of the row "R10 milestone approval" (Approver qamem1012c, Pending). Click the row title.
3. Repeat for "R10 task approval". Reload and repeat once.
4. Open Inbox (https://www.streamlineos.in/build/inbox), click the "Approval requested" item.
**Expected:** The approver sees "Approval actions" with "Decide" (Approve / Reject / Request Changes) on rows assigned to them, or the item opens a detail sheet with a Decide action. The Inbox item links to the approval.
**Actual:** The list shows the two rows (Approver qamem1012c, Level 1, Pending). The Actions cell is empty (the only button in the row is the disabled-looking select checkbox "Owner — transfer ownership first"); there is no "Approval actions" button and no Decide item. Clicking the row title does nothing (no sheet, no URL change; /build/7/approvals/9 → Page Not Found). The Inbox "Approval requested" item opens an empty panel that shows only the text "Approval requested" with no link to the approval. The owner's view of the same rows does show "Approval actions" (Decide, Delegate, Escalate, Cancel, Delete). The "Request approval" button is hidden for the member (correct).
**Frequency:** 3/3 (two rows, after reload).
**Impact:** Assigned approvals cannot be completed by a Member approver; the owner may not realise the approval is stuck; notification has no route to the decision.
**Suggested fix:** Show "Approval actions" with Decide (and Escalate/Delegate if allowed) to the assigned approver's membership regardless of Build Admin role, or state "Only Build Admins can decide" on the row. Make the Inbox "Approval requested" item link to /build/7/approvals (or open a detail sheet with the decision controls).
**Test data:** Approval 9 and approval 10 (see TEST-DATA.md Round 10).

## B-085 — Member sees "Edit" on a milestone (and an Edit sheet on a release row), but Save is blocked by a client-side permission check ("Missing permission: build:workspace:manage" / "build:manage") with no server request (Medium)
**Severity:** Medium — the control is offered to a role that cannot use it, and the Save failure is a toast-only error with an internal permission key. Members cannot edit milestones; the UI suggests they can.
**Area / URL:** Milestones — https://www.streamlineos.in/build/7/milestones → row "Actions for R10 milestone" → "Edit" → dialog "Edit Milestone" → "Save Changes"
**Preconditions / account:** Member qamem1012c (Member + Build Member, project 7). Milestone "R10 milestone" (id 7) created by owner qaown1012b.
**Steps:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/milestones.
2. Click "Actions for R10 milestone" (menu shows "Edit" only).
3. Click "Edit". Change Name to `R10 milestone edited`.
4. Click "Save Changes". Watch the network.
**Expected:** Either "Edit" is hidden for a member who cannot manage milestones, or Save sends the PATCH and the change is saved, or a plain-language message ("You don't have permission to edit milestones") is shown next to the form.
**Actual:** The Edit dialog opens with editable fields. "Save Changes" sends **no request** (0 api.streamlineos.in requests). A toast reads "Missing permission: build:workspace:manage". The dialog stays open with the typed name; the milestone stays "R10 milestone" after reload.
**Frequency:** 2/2 (two Save clicks).
**Also (same member session, /build/7/releases):** the Releases table has no Actions column for the member, but clicking the row "R10 release" opens the "Edit Release" sheet (Name, Version, Status, Release Date, Readiness, Risk, Release Notes). Changing Name to `R10 release edited` and clicking "Save Changes" sends **no request** and shows the toast "Missing permission: build:manage"; the sheet stays open. The release name is unchanged on reload.
**Impact:** A member is offered an edit path that can never succeed; the error exposes an internal permission key and does not say what the user can do. Users may think the save is broken.
**Suggested fix:** Hide "Edit" in the milestone actions menu unless the caller has build:workspace:manage (or the milestone-edit right); if kept, show the form read-only with a "You can view but not edit milestones" note and no Save button.
**Test data:** Milestone "R10 milestone" (name unchanged; deleted in owner cleanup).

### Retest notes (round 10)
- **B-082 RE-CHECKED as owner (round 10): still reproduces, 2/2 + one extra case.**
  - QAB-125 "R10 B" (parent QAB-124): Parent → "Remove parent" → `PATCH https://api.streamlineos.in/build/7/tickets/136` → **200**. After reload: Parent "Add parent"; HISTORY shows only "qaown1012b created this ticket" (no entry for the parent change).
  - QAB-124 "R10 A" ↔ QAB-125: Relations → "Remove relation" on the Blocks link → `DELETE /build/7/tickets/135/relations?relatedId=136` → **204**. After reload: Relations "No relations yet" on both tickets; HISTORY on QAB-124 and QAB-125 shows only "created this ticket".
  - Extra: the earlier **parent set** (QAB-125 → QAB-124, `PATCH /tickets/136` → 200, toast "Parent set") also left no HISTORY entry on QAB-125. So B-082 covers set as well as remove for parent, and relation add/remove. (Duplicate-of removal not re-tested: the picker hides R10 B because it is already linked, so no second pair was made.)
- **B-070 re-confirmed (round 10):** on QAB-125 the Blocks relation from QAB-124 reads "Blocks — R10 A" (should be "Blocked by"); on QAB-124 it reads "Blocks — R10 B" (correct).
- **B-054 re-confirmed (round 10):** Approval "Delegate" → New Approver list offers the requester (qaown1012b) → PATCH /approvals/10 → **400** "Approver cannot be the requester"; the dialog shows no field error.
- **B-056 re-confirmed (round 10):** the approval task picker returns no items for "R10", "R10 A", "QAB-125" (new tickets) on a fresh page load; it does return older tickets (QAB-3, QAB-4 ...).
- **B-048 / B-058 / B-076 not re-checked** (no release or approval delete/decide step was done in round 10 as owner, apart from cleanup).

### Round 11 repro results
- B-026 — NOT REPRODUCED (0/3): owner qaown1012b, same tab, 6 loads per run in order /build/7/issues → ?view=list&orderBy=created&orderDir=desc → ?view=list&orderBy=created&orderDir=asc → ?view=list&orderBy=updated&orderDir=desc → ?view=table&orderBy=manual&orderDir=asc → ?view=list&orderBy=manual&orderDir=asc. All 6 rendered in each of 3 runs (QAB ids present: 13 / 79 / 79 / 79 / 50 / 79 cards per load; 2.6–8.8 s per load); no "Target crashed" and no renderer death. Note: the table-view load with orderBy=manual took 8.6–8.8 s in every run.
- B-021 — NOT REPRODUCED (0/3): the original search q=R2 no longer returns any cards (the R2 tickets were deleted in round 2 cleanup, so "No tickets match your filters"). Substitute used, 8-card search (?q=Bulk%20pag%20item%200, 8 "Ticket actions" buttons): run 1, 2, 3 each opened "Ticket actions" on the first card (menu: Open | Copy link | Copy key | Archive | Delete), pressed Escape, and the tab stayed usable (body text 1348 chars afterwards). No "This tab crashed" / "Target crashed". Deviation: the nine-card R2 precondition could not be rebuilt without creating data; the 8-card search was used instead.
- B-018 — NOT REPRODUCED (0/3, retest variant: 10 non-image PDFs, the variant the B-018 entry asks for): on QAB-127 (run 1), QAB-128 (run 2), QAB-129 (run 3), set 10 files (multi-pdf-01..10-0913.pdf) on the ticket Activity file input (multiple). Each run: 10 × POST /build/7/files and 10 × POST /build/7/tickets/<id>/attachments were sent within 8 s (run 1 showed 6 pairs at 8 s, then 10 pairs when re-read; runs 2 and 3: 20 POSTs sent by 8 s). At 14 s all 10 file names were listed under ATTACHMENTS in each run; no "Ticket Error" and no error text. The original PNG variant (multi-01..10-0913.png) was not re-run because the B-013 image crash makes it unusable on this build.
- B-036 — CONFIRMED (3/3): owner qaown1012b, each run: /build/7/issues → Add filter → Priority → Urgent (URL ?priority=URGENT) → reload (kept) → sidebar "Overview" (URL /build/7) → sidebar "Issues" (URL /build/7/issues, no query: Priority chip dropped) → Add filter → Type → Bug (URL ?type=BUG; chip bar shows "1 | Bug | Clear" only; Priority=Urgent gone; Todo count 24 instead of the Urgent-only set). Same result in runs 1, 2 and 3. Caveat: the drop happens on the sidebar Overview → Issues navigation, not on the Type step.
- B-032 — NOT REPRODUCED (0/3) for the owner account only: owner qaown1012b (the member qamem1012c account was not signed in; the task authorised only the owner session). Direct loads of https://www.streamlineos.in/build/7/backlog, 3 runs: "Loading results" was visible at start and was gone after 2.96 s in run 3 (50 QAB rows listed); runs 1 and 2 had 50 QAB ids and no "Loading results" text when read (~13 s, my row-locator wait timed out before the read, so exact timing for runs 1–2 was not captured). No "Aw, Snap" / crash page in any run. The renderer-crash sequence (direct member RBAC navigations) was not repeated.
- B-081 — CONFIRMED (3/3): owner qaown1012b. Setup: QAB-130 "R11 parent 1013" with child QAB-131 "R11 child 1013" (Parent set to QAB-130 via QAB-131 → Parent → Add parent; toast "Parent set"). Table view ?view=table&q=R11 with Display options → SHOW → "Sub-issues" switch (aria-checked=false = off): QAB-131 row listed ("QAB-131 | R11 child 1013 | To Do | Add pts | No cycle") in all 3 runs, along with QAB-127..130. Switching Sub-issues to on (aria-checked=true) listed the same five rows (no change). Result: the toggle has no visible effect on child rows.
- B-079 — CONFIRMED (3/3): owner qaown1012b. Create Issue → Links → related link (URL https://example.com/r11-link-N, label "R11 link N") added in the dialog → Create issue (201); link POST /build/7/tickets/<id>/related-links → 201. Ticket page (QAB-132, QAB-133, QAB-134): the link shows only in the right-hand "Links" list (link "R11 link N" → https://example.com/r11-link-N); "Relations" reads "No relations yet" in all 3; the link list item has no edit or remove control in the accessibility snapshot (the only buttons on the page are Edit title, Delete ticket, and the panel controls).
- B-055 — CONFIRMED (3/3): owner qaown1012b, project 7. Milestone "R11 milestone 1013" (id 8) with a Milestone approval (Level 1 — Standard, approver qamem1012c; approvals 11, 12, 13). Approval actions → Escalate on each: PATCH /build/7/approvals/<id> → 200 with status "escalated", level 1 (in the response body), revision 2. After reload the row reads Level "1", Status "Escalated" in all 3 runs; the Escalate item then disappears from the menu. (Approval 11 was deleted after attempt 1 and 12 after attempt 2 to allow the next request; a pending/escalated approval on the same milestone blocks a new one with 409.)
- B-056 — CONFIRMED (3/3): owner qaown1012b. Approvals → Request approval → Request task approval → "Search tasks…" picker, fresh page load each run. Queries "R11 parent" (QAB-130, created minutes earlier) and "QAB-130": "No items found" in all 3 runs. Query "QAB-3": returned QAB-3 · Bulk pag item 02 (and QAB-30, QAB-31 …) in all 3 runs. No submit: the request dialog was closed without sending.
- B-058 — NOT REPRODUCED as written (0/3 stayed stale until reload); transient staleness seen in 2/3: Milestones list with two "R11 dup 1013" rows (plus "R11 milestone 1013"). Run 1: deleted "R11 dup 1013 b" (DELETE /build/7/milestones/10 → 204); a screenshot taken a few seconds later showed "R11 milestone 1013" + "R11 dup 1013" with "Pending 2" and "This page 2" (my text-read right after the 204 was ambiguous, so the immediate state for run 1 is not recorded). Run 2: DELETE /build/7/milestones/12 → 204; at the response the list still showed 3 "Actions for" cards (deleted row still listed), at 3 s it showed 2 — refreshed with no reload. Run 3: DELETE /build/7/milestones/13 → 204; at the response 3 cards, at 1 s 2 cards — refreshed with no reload. So the row lingers for about 1 s after the 204 in runs 2–3, and clears without reload.
- B-067 — NOT REPRODUCED as written (0/3 still stale at 2 s or after reload); transient counter lag right after Save seen in 2/3 runs. Release "R11 release 1013" (id 9). Run 1 (Draft → Archived, Save Changes): PATCH /build/7/releases/9 → 200; counters read later showed Draft 0 / Archived 1 and the row Archived (the 2-s counter read was not captured correctly). Run 2 (Draft → Archived): PATCH → 200; at the save the counters still read Draft 1 / Archived 0 while the row read "Archived"; at 2 s the counters read Draft 0 / Archived 1. Run 3 (Archived → Draft): PATCH → 200; at the response counters read Draft 0 / Archived 1 (stale) with the row "Draft"; at +1.0 s counters read Draft 1 / Archived 0 (correct). No reload was needed in any run; the stale window was under about 2 s.
- B-078 — NOT REPRODUCED (0/3): the original QAB-122 chain no longer exists (deleted in round 8), so a substitute parent/child pair was used: QAB-131 "R11 child 1013" (Parent = QAB-130 "R11 parent 1013"). Run 1: 2 cycles of [Back → QAB-131, click parent link QAB-130]; run 2: 4 cycles; run 3: 4 cycles. Each step read the page body: no "crashed"/"Page crashed" text, and each page rendered (1580–1586 chars). Total 20 ticket-to-ticket navigations, no tab crash. Note: the ticket-link path is the parent link only (QAB-130 shows no link to QAB-131).
- B-038 — CONFIRMED (3/3, with one wording caveat): owner qaown1012b, Chrome DevTools device mode at 375 × 1026 (Responsive). Board /build/7/issues?q=R11 (the original q=crash card QAB-103 no longer exists; tapped "R11 parent 1013" QAB-130 instead). Tap on the card title opens the ticket sheet with URL /build/7/tickets/QAB-130?returnTo=…: the sheet shows only the title "R11 parent 1013", "To Do" and the title again; no description, subtasks or activity. Read at ~0 s, 2.5 s and 6.5 s in each run: identical. A grey loading dot is visible in the sheet area in run 3 (the original "spinner" wording is only partly matched: it is a dot, not a labelled spinner). Reload of /build/7/tickets/QAB-130?returnTo=… rendered Description, Subtasks, Activity and History. Runs 1–3 identical.
- B-083 — CONFIRMED (3/3, with one wording caveat): owner qaown1012b, 375 px (DevTools device mode 375 × 1026), /build/7/settings?section=statuses → "Workflow Statuses" card. Each run (click into Statuses, reload, reload): the DONE row's category select shows "Complet..." (the value "Completed" is cut at the right edge with an ellipsis). TODO (Unstarted), IN_PROGRESS (Started) and IN_REVIEW (Started) fit. The status names themselves are not cut; the category control is.
