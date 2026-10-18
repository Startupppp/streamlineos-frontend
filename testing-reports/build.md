# Build — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining build work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### B-006 — FIXED: FTS search + % and _ guard

`%` and `_` act as wildcards in search

Latest report note: PARTIAL: retest (owner): q=% and q=_ now show "No tickets match your filters". q=Bulk%item still returns 32 Todo cards ("Bulk pag item NN"), so % still acts as a wildcard mid-term.

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): q=% and q=_ now show "No tickets match your filters". q=Bulk%item still returns 32 Todo cards ("Bulk pag item NN"), so % still acts as a wildcard mid-term.

**Where:** Issues search — https://www.streamlineos.in/build/7/issues?q=%25 (encoded `%`) and `?q=_` | Role/account: Owner qaown1012b.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?q=%25 (search `%`).
2. Open https://www.streamlineos.in/build/7/issues?q=_ (search `_`).
3. Open https://www.streamlineos.in/build/7/issues?q=Bulk%25item (search `Bulk%item`).
4. Compare with a nonexistent term https://www.streamlineos.in/build/7/issues?q=zzqqxx.

**Expected:** `%` and `_` are literal characters. Searching `%` finds only titles containing a percent sign (none exist), so the "No tickets match your filters" empty state appears. `Bulk%item` finds nothing.

**Actual:** `q=%` shows the full board (Todo 80 cards); `q=_` also shows Todo 80; `q=Bulk%item` returns the "Bulk pag item NN" tickets (Todo 32, 13 cards). `q=zzqqxx` correctly shows "No tickets match your filters". Behaviour shows the query is passed to a LIKE pattern without escaping.

**Likely cause:** The search term goes into a LIKE/ILIKE pattern without escaping.

**Required fix:** Escape backslash, `%` and `_` in the term before building the pattern (with a matching ESCAPE clause or the ORM equivalent), in the tickets search and the All Work search.

**Acceptance criteria:**
- `?q=%` and `?q=_` show "No tickets match your filters" when no title contains those characters.
- A title containing "50%" is found by searching "50%".
- Normal searches are unchanged.
- A test covers `%` and `_`.

### B-011 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Project Calendar shows no Build tickets

Latest report note: FAIL: /build/7/issues > Calendar button goes to /calendar?source=build&projectId=7. No Build tickets source and no QAB ticket text found. Initial view showed "Loading calendar sources" then the source toggles (HR events, and others). Then the calendar showed "Calendar error / Failed to load the calendar" and Try Again did not recover it.

**Severity:** Medium

`BuildCalendarSource` (`backend/src/modules/build/build-calendar-source.ts`) is registered in `CalendarSourceRegistry` with `module="build"` and loads tickets with due dates as calendar events. `useCalendarSourceDeepLink` processes `?source=build` to enable the source in user preferences. Code is in place; production behaviour still needs browser verification.

**Recheck 14 Oct observed:** FAIL — /build/7/issues > Calendar button goes to /calendar?source=build&projectId=7. No Build tickets source and no QAB ticket text found. Initial view showed "Loading calendar sources" then the source toggles (HR events, and others). Then the calendar showed "Calendar error / Failed to load the calendar" and Try Again did not recover it.
**Shared root cause group:** G11 Navigation, routes and dead links

**Where:** Project issues view switcher — https://www.streamlineos.in/build/7/issues → "Calendar" button → https://www.streamlineos.in/calendar?source=build&projectId=7 | Role/account: Owner qaown1012b. The org has Build enabled; HR/CRM modules are not used by this org (HR was never enabled in the org setup per prior run).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues (Board is selected).
2. Click "Calendar" in the view selector.
3. Wait for "Loading calendar sources…" to finish; read the Sources row and the week grid.
4. Search the page for any QAB ticket (e.g. QAB-84 has Due date Oct 20, 2026).

**Expected:** The Build Calendar view stays in Build (URL /build/7/issues?view=calendar or similar) and shows the project's tickets on their due dates (QAB-84 on Oct 20), with a source toggle for "Build tickets" / "Due dates" and no unrelated sources for modules that are off.

**Actual:** The button changes the URL to `/calendar?source=build&projectId=7`. The page title is "Showing October 2026 Week 42", with source toggles **"Attendance events", "HR events", "CRM events"** (all pressed) and "Event sources". There is no Build/tickets source, and no QAB ticket text appears on the page. Loading `/build/7/issues?view=calendar` directly is unstable: in 1 of 3 loads it showed a page-level "Something went wrong — An unexpected error occurred" with "Try Again"; in other loads it fell back to the Board.

**Retest notes:** Still reproduces in round 8, with an intermittent "Calendar error".

**Likely cause:** The Build view switcher's "Calendar" button navigates to the org calendar module (`/calendar?source=build&projectId=7`), which has no Build tickets source; `?view=calendar` on the issues page is not a known view and can hit the page-level error.

**Required fix:** Smallest correct fix: add a Build tickets source to the calendar module so that `source=build&projectId=<id>` loads that project's tickets with due dates and shows them on their dates; hide source toggles for modules that are not enabled for the org. If the repo already has a Build calendar view component, route the "Calendar" button to it instead. Make an unknown `view=` value fall back to the Board instead of erroring. Search hints: "Loading calendar sources", "Event sources", "HR events", "CRM events", `source=build`, `view=calendar`.

**Acceptance criteria:**
- From /build/7/issues, clicking "Calendar" shows project 7 tickets on their due dates (a ticket due Oct 20, 2026 shows on Oct 20).
- Toggles for modules that are off for the org (HR, CRM, Attendance in the QA org) are not shown; a Build tickets source is shown.
- `/build/7/issues?view=calendar` never shows the page-level "Something went wrong".

### B-022 — OUT_OF_SCOPE

"Join" on the org-setup pending-invitation banner does nothing (Medium)

Latest report note: BLOCKED: The repro needs a sign-in as invitee qadbl1013@sharklasers.com (pending invite to QA Build Org 1012b). This run only had the owner and the member (qamem1012c) sessions authorized, so the org-setup Join banner was not tested. Needs an authorized invitee session.

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

### B-023 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Browser Back drops the Create dialog's typed title

Latest report note: FAIL: retest (owner): Create Issue dialog, typed "RC1014 back-forward probe", Back then Forward: dialog reopened (?create=1) but the title was empty. Draft not kept.

**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest (owner): Create Issue dialog, typed "RC1014 back-forward probe", Back then Forward: dialog reopened (?create=1) but the title was empty. Draft not kept.

**Where:** https://www.streamlineos.in/build/7/issues → Create Issue (URL …?create=1) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues. Click "Create Issue". Type `R2 back-forward 0913` in "Issue title".
2. Press the browser Back button.
3. Press the browser Forward button.

**Expected:** The dialog is restored with the draft, or a "Discard changes?" prompt appears before leaving.

**Actual:** Step 2 returned to the previous history entry (/build/7/issues?q=R2) with no dialog and no prompt. Step 3 returned to ?q=R2 (not to the dialog) and the title was empty. (A beforeunload prompt appears only on full page navigations, which the harness auto-accepted.)

**Likely cause:** The dialog is tied to `?create=1`; Back removes the param and unmounts the dialog with its local state.

**Required fix:** Keep a Create Issue draft (at least title and description) in session storage per project, restore it when the dialog reopens, and clear it on successful create or Cancel.

`use-create-ticket-dialog-state.ts` saves the draft title to `sessionStorage` keyed by project id (`ticket-draft-title-${projectId}`), restores it on dialog open, and clears it on successful create or cancel. Implementation matches the acceptance criteria.

**Acceptance criteria:**
- Type a title, press Back, then reopen Create Issue (or press Forward): the title is restored.
- After a successful create or Cancel, the draft is cleared.

### B-025 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Board ignores "Ordering", and list "Created" ignores direction (newest is last)

Latest report note: FAIL: Board (/build/7/issues?orderBy=created&orderDir=desc, and priority desc): the first cards are QAB-2, 4, 5, 6 ... (rank order), identical for both orderings; the newest To Do ticket QAB-137 is not first, so Board Ordering is still ignored. List view: created desc starts QAB-137, 135, 134 and created asc starts QAB-2, 4, 5, so the list direction now works.

**Severity:** Medium

**Recheck 14 Oct observed:** FAIL — Board (/build/7/issues?orderBy=created&orderDir=desc, and priority desc): the first cards are QAB-2, 4, 5, 6 ... (rank order), identical for both orderings; the newest To Do ticket QAB-137 is not first, so Board Ordering is still ignored. List view: created desc starts QAB-137, 135, 134 and created asc starts QAB-2, 4, 5, so the list direction now works.
**Shared root cause group:** G7 List/board query options (sort, columns, sub-issues, filters)

**Where:** Issues board and list — https://www.streamlineos.in/build/7/issues (Display options > Ordering: Manual / Created / Updated / Priority / Due date) | Role/account: Owner qaown1012b (Owner). Project has about 80 tickets; QAB-97 was created at 15:5x today.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues (Board). Open Display options > Ordering and choose Priority, then Due date, then Created, then Updated. After each choice read the URL and the first cards of the "Todo" column.
2. Reload https://www.streamlineos.in/build/7/issues?orderBy=priority&orderDir=desc.
3. Open https://www.streamlineos.in/build/7/issues?view=list&orderBy=created&orderDir=desc and read the order of IDs (top and bottom).
4. Open https://www.streamlineos.in/build/7/issues?view=list&orderBy=created&orderDir=asc and compare.

**Expected:** Board cards re-order with the chosen Ordering. "Created" desc puts the newest ticket (QAB-97) first; asc puts it last.

**Actual:** Step 1: URL updates each time (`orderBy=priority&orderDir=desc`, `dueDate&orderDir=asc`, `created&orderDir=desc`, `updated&orderDir=desc`), but the Todo column order is identical in all five settings and after reload: QAB-1, QAB-2, QAB-4, QAB-5 … (rank order). Priority values in the first 13 cards read U,M,U,L,M,H,U,L,M,H,U,H,L (not sorted). Step 3: list with `orderBy=created&orderDir=desc` starts QAB-1, QAB-2, QAB-4 and ends `…79, 97, 3, 13`: the newest ticket is last. Step 4: `orderDir=asc` returns exactly the same order, so the direction is ignored.

**Likely cause:** The board always sorts by rank and ignores `orderBy`/`orderDir`; for list/table the server (or the client mapping) ignores `orderDir` and maps "created" to rank or the wrong column.

**Required fix:** Pass `orderBy` and `orderDir` from Display options to `GET /build/:projectId/tickets` for board, list and table, and apply them server-side for every supported key: manual (rank), created, updated, priority (a defined priority order), dueDate (nulls last). On the board, sort cards within each column by the chosen order; Manual keeps rank. Search hints: "Ordering", "Display options", `orderBy=`, `orderDir=`, `orderBy=rank`.

**Acceptance criteria:**
- Board with Ordering Created desc shows the newest ticket first in each column; asc shows it last.
- Board with Priority shows Urgent, High, Medium, Low, None in that order within each column.
- List with `orderBy=created&orderDir=desc` and with `asc` return opposite orders.
- Ordering survives a reload (URL and rows agree).
- An API test asserts the order for each orderBy in both directions.

### B-029 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

At 768 px the board filter bar overflows: "Add filter", "Hide done" and search sit off-screen and are reachable only by an undiscoverable horizontal scroll (Medium)

Latest report note: BLOCKED: Needs a 768 px viewport; the browser tool cannot set the viewport size and no zoom check was done. Not confirmed.

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

### B-030 — FIXED: INLINE_READ_ERROR prevents files query from reaching project error boundary

The project Files page shows "Project error" for the owner

Latest report note: FAIL: Owner, /build/7/files: still shows "Project error / Failed to load project. Please try again or contact support." with Try Again (checked after load).

**Severity:** Medium

**Recheck 14 Oct observed:** FAIL — Owner, /build/7/files: still shows "Project error / Failed to load project. Please try again or contact support." with Try Again (checked after load).

**Where:** https://www.streamlineos.in/build/7/files (sidebar "Files" under PROJECT) | Role/account: Owner qaown1012b (Owner). Also expected for Build Admin/Member if the Files module is shown to them (not checked).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/files and wait 10 s.
2. Click "Try Again" once; reload the URL twice.
3. Read the network list for api.streamlineos.in GET requests and the page text.

**Expected:** The project Files view loads (list of files or an empty state with an upload action). If it fails, the error names the failing request and does not say "project" when the project loaded.

**Actual:** Step 1: heading "Project error", text "Failed to load project. Please try again or contact support.", button "Try Again". Step 2: same error after Try Again and after two reloads (3/3). Step 3: `GET /build/7` → 200, `GET /build/7/files` → 200, `GET /billing/entitlements` → 200, plus other shell calls all 200. No failing request is visible in the network list.

**Retest notes:** Still reproduces in round 8 (about 9 s, then "Failed to load project"). As the member, /build/7/files loads normally, so the failure looks owner-specific.

**Likely cause:** A client-side exception in the Files view, after all API calls return 200, is caught by the project-level error boundary, which shows the generic "Project error / Failed to load project" text. Because the member view works, the crash is likely in an owner/admin-only part (upload area, manage actions, entitlement/quota display) or in handling a response field only present for the owner.

**Required fix:** Reproduce as the owner locally, read the console stack, and fix the failing render (null-safe access, correct response shape). Show an empty state when there are no files. Make this view's error message name the failing area ("Couldn't load files") instead of "project". Search hints: "Project error", "Failed to load project. Please try again or contact support.", `/build/:id/files`, `billing/entitlements`.

**Acceptance criteria:**
- As owner, /build/7/files loads within a few seconds and shows the file list or an empty state with the upload action.
- As member, it still loads.
- An error in this view says "Couldn't load files", not "Failed to load project".

### B-031 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

A member can upload to storage through a hidden file input

Latest report note: BLOCKED: Needs a member session (qamem1012c) on QAB-97 and a hidden-input upload; member sign-in was authorized only for B-084, so not run in this pass.

**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — retest (member qamem1012c): QAB-97 now returns "Page Not Found" for the member, so QAB-97 was not used. On QAB-135 (RC1014, member view) the ticket page has no file input at all (no hidden image input in DOM) and no Attach control, so the upload path is not exposed. Server 403 for POST /storage/upload not tested (no browser-side way to send it).
**Shared root cause group:** G6 Permission checks: UI must match server

**Where:** Ticket detail (Member view) — https://www.streamlineos.in/build/7/tickets/QAB-97 | Role/account: Member qamem1012c (Member + Build Member on QA Project Alpha). The Activity composer and "Attach files" control are not rendered for this role.

**Steps to reproduce:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/tickets/QAB-97.
2. Confirm in the DOM that the only file input is `accept="image/jpeg,image/png,image/gif,image/webp"` with class "hidden", and that no "Attach" control is visible.
3. Set that hidden input to /workspace/streamline-qa/fixtures/valid-image-0913.png (setInputFiles) and watch the network.
4. Reload the ticket and read the ATTACHMENTS section.

**Expected:** The upload is refused (403) before storage, or the input is not rendered for Members.

**Actual:** Step 3: `POST https://api.streamlineos.in/storage/upload` → **201**. No `POST …/attachments` or `POST /build/7/files` follows, and no toast appears. Step 4: the ATTACHMENTS list is unchanged (10 PDFs, no PNG); the Member cannot attach through the UI, but the stored object exists.

**Likely cause:** `POST /storage/upload` only checks authentication, not Build attach permission on the target project/ticket. The image-only file input is still rendered (hidden) for members.

**Required fix:** Server: require attach/edit permission on the target Build project before accepting `POST /storage/upload` for Build content (derive the project from the upload context or require a project/ticket id), and return 403 otherwise. Client: do not render the attach file inputs for users who cannot attach. Do not build orphan cleanup in this change; mention it in the summary as a follow-up.

**Acceptance criteria:**
- As the QA member qamem1012c on a ticket in project 7, there is no attachment file input in the DOM.
- A `POST /storage/upload` for Build ticket content from that member returns 403 and stores nothing.
- Owner/admin uploads still work (201).
- An API test covers the 403.

### B-034 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Table/List: Priority and Due date orderings return the same sequence, and "Updated" does nothing

Latest report note: PARTIAL: Table view: orderBy=priority desc starts QAB-39, 43, 47, 51 (Pag B items); orderBy=dueDate asc starts QAB-137, 136, 135 with the Due Date cells empty, so priority and due date now differ, but tickets without a due date sort first (acceptance says last). orderBy=updated desc gives a different order (QAB-136, 137, 135, 134) and the URL keeps it. List view not separately checked.

**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Table view: orderBy=priority desc starts QAB-39, 43, 47, 51 (Pag B items); orderBy=dueDate asc starts QAB-137, 136, 135 with the Due Date cells empty, so priority and due date now differ, but tickets without a due date sort first (acceptance says last). orderBy=updated desc gives a different order (QAB-136, 137, 135, 134) and the URL keeps it. List view not separately checked.
**Shared root cause group:** G7 List/board query options (sort, columns, sub-issues, filters)

**Where:** https://www.streamlineos.in/build/7/issues?view=table and ?view=list (Display options → Ordering) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/issues?view=table. Display options → Ordering → Priority; wait for the URL to update; read the first 10 IDs.
2. Repeat with Due date, Updated, Created, Manual (same table view, reloading each time).
3. Repeat Priority and Due date on ?view=list.

**Expected:** Each ordering changes the row order to match its key; the URL and the rows agree after reload.

**Actual:** Priority → `orderBy=priority&orderDir=desc`: rows QAB-40, 44, 48, 52, 56, 60, 64, 68, 72, 76 (all "Pag B item" tickets, Due Date column empty). Due date → `orderBy=dueDate&orderDir=asc`: the same ten rows. The Priority cell is icon-only, so the sequence cannot be checked against priority values in the UI (see U-009). Updated → the combobox shows "Updated" but the URL stays `?view=table` (no orderBy) and the rows match the default rank order (QAB-3, QAB-100, QAB-102, QAB-1 …). List view with Priority shows the same QAB-40… sequence. Created desc (table) → QAB-1, QAB-2, QAB-3… (ascending; same as B-025).

**Likely cause:** Same as B-025: server-side ordering for priority and dueDate falls back to one order, and the "Updated" option is not written to the URL or the request.

**Required fix:** Covered by the B-025 fix. Also make selecting "Updated" write `orderBy=updated` to the URL and the request, and keep the combobox and URL in sync.

**Acceptance criteria:**
- In Table and List, Priority and Due date give different, correct orders on tickets with mixed priorities and due dates (no due date last).
- Selecting "Updated" sets `orderBy=updated` in the URL and orders by most recently updated first.
- After reload the combobox shows the ordering from the URL.

### B-035 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Board "Columns" option is ignored (always Status columns)

Latest report note: PARTIAL: /build/7/issues?columnBy=priority&rowBy=none: columns are now Priority groups with counts (URGENT 19, HIGH 19, MEDIUM 31, LOW 18); the Todo/In progress/In review/Done status columns are gone. ?columnBy=assignee shows an Unassigned group (87). Label, Cycle and Project columns and the Display > Columns UI click path were not tested.

**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — /build/7/issues?columnBy=priority&rowBy=none: columns are now Priority groups with counts (URGENT 19, HIGH 19, MEDIUM 31, LOW 18); the Todo/In progress/In review/Done status columns are gone. ?columnBy=assignee shows an Unassigned group (87). Label, Cycle and Project columns and the Display > Columns UI click path were not tested.
**Shared root cause group:** G7 List/board query options (sort, columns, sub-issues, filters)

**Where:** https://www.streamlineos.in/build/7/issues (Board) → Display options → Columns | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/issues. Display → Columns → Assignee (also try Priority, Label, Cycle, Project).
2. Read the column headers after the URL updates (`columnBy=assignee`).
3. Also open /build/7/issues?columnBy=priority&rowBy=none directly.

**Expected:** Columns are rebuilt per Assignee/Priority/Label/Cycle/Project, with counts.

**Actual:** Every value keeps the "Todo | 83 …" Status columns (first card QAB-1). The URL keeps `columnBy=<value>` after the selection. Rows → Priority and Rows → Assignee DO group correctly ("HIGH (19)", "Unassigned (89)").

**Likely cause:** The board reads `rowBy` but not `columnBy`; columns are fixed to workflow statuses.

**Required fix:** Honour `columnBy` (assignee, priority, label, cycle, project) by grouping tickets into one column per distinct value plus a "None" column, reusing the grouping helper that already works for Rows. If dragging between non-status columns is not supported, disable drag in those layouts instead of sending a status move. If an option cannot be supported with a small change, remove it from the Columns list.

**Acceptance criteria:**
- Columns: Assignee shows one column per assignee plus "Unassigned", with counts; same for Priority, Label, Cycle and Project.
- `?columnBy=priority` loaded directly shows Priority columns.
- Columns: Status works as before, including drag-and-drop.
- No option in the Columns list silently does nothing.

### B-038 — BLOCKED

At 375 px, opening a ticket from a board card shows a sheet with only the title and a spinner for 6+ s; the full page appears only after a reload (needs repro) (Low)

Latest report note: BLOCKED: retest: needs a 375 px viewport. Browser zoom (Ctrl +) only reached 150% (about 853 CSS px) in this session, and the zoom bubble could not go further; mobile ticket sheet not tested. Zoom reset to 100%.

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

### B-040 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Long "Draft awaiting review" text overflows the sidebar

Latest report note: PARTIAL: retest (owner): sidebar "Draft awaiting review" item (323 unbroken chars) stays inside the sidebar with an ellipsis at 100% zoom. Its element has aria-label with the full text but no title attribute, so no hover tooltip was confirmed.

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): sidebar "Draft awaiting review" item (323 unbroken chars) stays inside the sidebar with an ellipsis at 100% zoom. Its element has aria-label with the full text but no title attribute, so no hover tooltip was confirmed.
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** Build sidebar, the "Draft awaiting review" item. Role: Owner.

**Steps to reproduce:**
1. Have a draft awaiting review whose text is about 323 characters with no spaces.
2. Look at the Build sidebar.

**Expected:** The text stays inside the sidebar (ellipsis or wrap).

**Actual:** The unbroken text overflows the navigation.

**Likely cause:** The sidebar item text has no truncation and its flex parent lacks `min-width:0`.

**Required fix:** Truncate with an ellipsis (`min-width:0` on the flex child, `text-overflow:ellipsis`) and put the full text in a `title` tooltip.

**Acceptance criteria:**
- A 323-character unbroken text stays inside the sidebar with an ellipsis.
- Hovering shows the full text.

### B-041 — BLOCKED

Long unbroken ticket title overflows the Triage row

Latest report note: BLOCKED: retest: /build/7/triage has no row with a long unbroken title (no 120+ character token on the page). Not created, to avoid extra triage records.

- **Severity:** Low. **Area:** Triage, QAB-2. **Suggested fix:** use overflow-wrap:anywhere and line-clamp.

### B-046 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

A 23-digit budget returns 500

Latest report note: PARTIAL: Owner, /build/7/budget, Set Budget: a 23-digit value shows the inline message "Budget must be 10,00,00,00,00,000 or less" and sends no PATCH (no 500 in this run). Editor cancelled; budget left as Not set. Server-side 400 for a direct PATCH could not be tested from the browser.

**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Owner, /build/7/budget, Set Budget: a 23-digit value shows the inline message "Budget must be 10,00,00,00,00,000 or less" and sends no PATCH (no 500 in this run). Editor cancelled; budget left as Not set. Server-side 400 for a direct PATCH could not be tested from the browser.
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Budget — https://www.streamlineos.in/build/7/budget → "Set Budget" (inline editor, number input, Save/Cancel) | Role/account: Owner qaown1012b (Owner). Budget was "Not set".

**Steps to reproduce:**
1. Open /build/7/budget. Click "Set Budget".
2. In the Planned Budget number input type `99999999999999999999999`. Click "Save".
3. Read the network and the page.

**Expected:** Blocked with a field message such as "Budget must be 10,000,000,000 or less", or stored with a documented maximum.

**Actual:** `PATCH https://api.streamlineos.in/build/7/budget` → **500** `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred","correlationId":"29c7c8db-b8a2-4712-a162-024dcc792755"}`. The editor stays open ("Save"/"Cancel") with the value kept; no field error. A reload shows the old value (₹0 / Not set).

**Likely cause:** The budget DTO has no maximum, so a huge number reaches the database (numeric overflow) and throws an unhandled error.

**Required fix:** Add one shared budget rule: minimum 0, a maximum that fits the DB column (one constant, e.g. 1e12), at most 2 decimal places; enforce it in the client form and the server DTO, and return 400 with a field error. Show the message under the Planned Budget input. Search hints: "Set Budget", "Planned Budget", `PATCH /build/:id/budget`.

**Acceptance criteria:**
- Entering 99999999999999999999999 shows a field message (e.g. "Budget must be <max> or less") and sends no request.
- A direct PATCH with that value returns 400 (not 500) with a field error.
- Valid values such as 9999999999 still save.

### B-047 — FIXED: null-safe findDeclineStatus

Triage "Decline" always fails: the server rejects status CANCELLED and the ticket stays in triage with no visible message (Medium)

Latest report note: BLOCKED: /build/7/triage has 41 unassigned QA tickets (none are RC1014). Decline would change an existing shared QA record, so it was not clicked. Triage search "R5" returned no results. Needs a RC1014 triage item to test safely.

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

### B-052 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Large budgets show an unclear "₹1KCr" label

Latest report note: PARTIAL: retest (owner): 9999999999 saved (PATCH seen as the page updated). Labels now read "₹999.9Cr" (no "KCr"), but the full value is not shown on hover (Planned Budget has only the section title as tooltip).

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): 9999999999 saved (PATCH seen as the page updated). Labels now read "₹999.9Cr" (no "KCr"), but the full value is not shown on hover (Planned Budget has only the section title as tooltip).

**Where:** Budget — https://www.streamlineos.in/build/7/budget | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Click "Set Budget" / edit. Enter `9999999999` (9,999,999,999). Click "Save".
2. Read the "Planned Budget" and "Remaining" values.

**Expected:** Shows ₹999.9 Cr (or ₹9,999,999,999 in full) with the correct unit.

**Actual:** `PATCH` → 200 `budget: 9999999999`. Page shows "Planned Budget ₹1KCr" and "Remaining ₹1KCr" (the label reads as 1,000 Cr, not 999.9 Cr, and "KCr" is not a standard abbreviation).

**Likely cause:** The compact formatter rounds 999.99 Cr up to 1000 Cr and labels it "1KCr".

**Required fix:** Use an INR compact format that never combines K and Cr (e.g. ₹999.99 Cr, ₹1,000 Cr) and does not round up across a unit; show the full value in a tooltip.

**Acceptance criteria:**
- 9999999999 shows as ₹999.99 Cr (or the full value), never "KCr".
- The full value shows on hover.
- A unit test covers the formatter around unit boundaries.

### B-053 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

The release version rule is inconsistent

Latest report note: PARTIAL: retest (owner): New Release Version "abc", "1.0.0.0", "-1.0.0" and "v1..0" each show "Enter a valid version..." on Save, with no POST. Valid "1.0" acceptance and the new hint text not confirmed (a valid save would create a release). Cancelled; nothing created.

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): New Release Version "abc", "1.0.0.0", "-1.0.0" and "v1..0" each show "Enter a valid version..." on Save, with no POST. Valid "1.0" acceptance and the new hint text not confirmed (a valid save would create a release). Cancelled; nothing created.
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Releases — https://www.streamlineos.in/build/7/releases → "New Release" / "Edit" → Version | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Create release with Version `abc` → "Enter a valid version, e.g. 1.4.0 or v2.0.0-beta" (no request). Correct.
2. Create with `1.0` → accepted (201).
3. Edit a release, Version `1.0.0.0` → Save → accepted (PATCH 200).
4. Edit, Version `-1.0.0` and `v1..0` → rejected with the same message.

**Expected:** One rule (for example semantic version, optional "v" and pre-release suffix). If "1.0" is allowed, say so in the hint.

**Actual:** As above. The trailing-space value `1.0.1013 ` is accepted and saved as `1.0.1013` (trimmed; fine).

**Likely cause:** Create and edit use a loose check that accepts "1.0" and "1.0.0.0", while the hint says "e.g. 1.4.0 or v2.0.0-beta".

**Required fix:** Use one version validator for create, edit and the server: optional "v", MAJOR.MINOR or MAJOR.MINOR.PATCH, optional pre-release/build suffix; reject 4-part versions. Update the hint to "e.g. 1.0, 1.4.0 or v2.0.0-beta".

**Acceptance criteria:**
- "1.0", "1.4.0" and "v2.0.0-beta" are accepted on create and edit.
- "1.0.0.0", "abc", "-1.0.0" and "v1..0" are rejected with the hint message on create and edit, and by the server with 400.

### B-054 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Approval "Delegate" to the requester fails with 400 and the dialog shows no error (Low)

Latest report note: BLOCKED: retest (owner): needs a pending approval assigned to another user to Delegate to the requester. The approvals list read showed no pending rows to use, so not run.

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

### B-055 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Approval "Escalate" changes status to Escalated but the Level stays "1" (Low — needs repro)

Latest report note: BLOCKED: retest (owner): needs a pending Level 1 approval to Escalate. None available in this run, so not run (round 11 showed level still 1 after escalate).

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

### B-059 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Release Notes editor is a fixed 639 px wide box: at 375 px it runs off the New Release dialog, and at desktop long lines are clipped (Medium)

Latest report note: BLOCKED: Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured.

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

### B-060 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

At 375 px the ticket Activity action row is wider than the screen; the whole ticket page scrolls sideways and "Draft comment" is cut off (Medium)

Latest report note: BLOCKED: Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured.

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

### B-063 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

An epic can be set to "Done" while linked items are still open (1 of 3 done) with no warning (Low — needs confirmation of intended rule)

Latest report note: BLOCKED: retest (owner): inconclusive. Linked "RC1014 DBLCLICK issue" (open) to "RC1014 epic dbl" (0 of 1 items). Edit > Status Done > Save changes closed the dialog with no confirmation shown, and the card still read In progress, so the Done change was not confirmed. Not re-run.

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

### B-064 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

The epic Link picker lists only stories

Latest report note: PARTIAL: retest (owner): epic "Link" picker on RC1014 epic dbl lists Task items (e.g. "RC1014 DBLCLICK issue", "RC1014 B-002 ...") as well as stories, and linking one worked. Option rows show no type label.

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): epic "Link" picker on RC1014 epic dbl lists Task items (e.g. "RC1014 DBLCLICK issue", "RC1014 B-002 ...") as well as stories, and linking one worked. Option rows show no type label.

**Where:** Epics → epic card "Link" (https://www.streamlineos.in/build/7/epics); ticket Details → Epic (https://www.streamlineos.in/build/7/tickets/QAB-115) | Role/account: Owner qaown1012b (Owner). QAB-115 "R6 epic child 1013" is type Task and unlinked (and QAB-116 / QAB-117 are Tasks too).

**Steps to reproduce:**
1. Open /build/7/epics. On "R6 epic 1013" click "Link".
2. Read the list (search "R6").
3. Open QAB-115 and set Details → Epic to "R6 epic 1013".

**Expected:** Tasks are offered by "Link" as well (the page copy says stories and tasks), or the copy and the picker say "Stories only".

**Actual:** The Link list shows 23 stories ("Bulk pag item 02", "Pag B item 02" …, "BUG06 valid points 8") and no Task; "R6 epic child 1013" is not listed. Step 3 works: the Epic dropdown lists "R6 epic 1013" and the PATCH (tickets/126) saves (200). Reload shows "Epic: R6 epic 1013".

**Likely cause:** The Link picker query filters to stories only.

**Required fix:** Offer the same ticket types in the epic Link picker that the ticket Epic dropdown accepts (at least stories and tasks), and show the type on each option.

**Acceptance criteria:**
- An unlinked Task appears in the epic Link picker and can be linked.
- Stories still appear.

### B-069 — BLOCKED

Dragging timeline bars does not reschedule tickets

Latest report note: BLOCKED: retest: timeline bars have no accessible name in this view, so a bar could not be located for the drag; no drag done. Not tested.

- **Severity:** Low. Needs confirmation, because drag-to-reschedule may not be a feature.
- **Area:** /build/7 Timeline. Owner.
- **Steps:** 1) Open Timeline with a ticket that has start Oct 19 and due Oct 22 (QAB-113). 2) Drag the bar left or right, or drag its edges.
- **Expected:** the dates update, or the bars are clearly not draggable (no grab cursor).
- **Actual:** the bar never moves (6 attempts), and a mouse-up on a bar sometimes opens the ticket.
- **Impact:** users expect Gantt-style rescheduling and get no feedback. **Suggested fix:** add drag-to-reschedule with a PATCH of the dates, or make the bars click-only and say so.

# Round 7 — build-2026-10-13 (Build module QA, owner qaown1012b, project 7 "QA Project Alpha"; no screenshots saved)
Continues from B-069. New IDs start at B-070. Test data for each item is listed in TEST-DATA.md ("Round 7"). Item 1 = subtasks and links on QAB-113 to QAB-117 (QAB-113 "R6 workload A 1013", QAB-114 "R6 workload B 1013", QAB-115 "R6 epic child 1013", QAB-116 "R6 parent 1013", QAB-117 "R6 link target 1013"; QAB-119 "R7 subtask probe 1013" created during the test).

### B-071 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Deleting a parent that has children gives no warning and silently clears the children's parent (Low)

`deleteTicketWarning()` in `frontend/features/build/ticket-details/ticket-detail-actions.tsx:29-33` shows "This ticket has N subtask(s). They will be kept without a parent." when `subtaskCount > 0`. Backend at `projects-tickets-delete.service.ts:177-180` fires `parent_removed` activity log for each child.

Latest report note: BLOCKED: retest (owner): needs a ticket with a subtask. "Link existing" on QAB-135 did not attach QAB-136 (see B-073), so no parent with a child was set up. Delete not run.

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

### B-072 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Parent picker offers the ticket's own child, and the server rejects it with a 400 that leaves the picker open (Low)

`ticket-parent-control.tsx:67-82` builds `descendantIds` from `useSubtasks` and filters them out of results. `onError` calls `setOpen(false)` closing the picker on any 400. Direct children are excluded client-side; deeper descendants are rejected server-side with a clear message and the picker closes.

Latest report note: BLOCKED: retest (owner): needs a ticket with a child to test the Parent picker. Not set up. The subtask picker on QAB-135 excluded QAB-135 itself.

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

### B-073 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

"Add subtask" cannot attach an existing ticket

`ExistingTicketLinker` in `ticket-subtasks.tsx` is fully implemented: debounced search, cycle prevention via `descendantIds`, sets `parentTicketId` via PATCH, patches the subtasks cache on success. The retest observation ("not under Subtasks after reload") may be stale cache; the code patches correctly.

Latest report note: PARTIAL: retest (owner): Subtasks header has "Link existing", which opens a project ticket search. Results listed QAB-136, QAB-137, QAB-138 and excluded QAB-135 (itself). Choosing QAB-136 did not attach it: it is not under Subtasks after reload. Not conclusive.

**Severity:** Low (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)

**Recheck 14 Oct observed:** PARTIAL — retest (owner): Subtasks header has "Link existing", which opens a project ticket search. Results listed QAB-136, QAB-137, QAB-138 and excluded QAB-135 (itself). Choosing QAB-136 did not attach it: it is not under Subtasks after reload. Not conclusive.
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Ticket Subtasks section — https://www.streamlineos.in/build/7/tickets/QAB-113 | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open QAB-113. In "Add subtask…" type "R7 subtask probe 1013" and press Enter.
2. Look for a way to pick an existing ticket as a subtask of QAB-113.

**Expected:** Either the subtask box offers existing tickets (search) or there is an explicit "Add existing" action; the created subtask is clearly new.

**Actual:** Enter → `POST https://api.streamlineos.in/build/7/tickets` → **201**; new ticket QAB-119 (internal 130) "R7 subtask probe 1013" appears under QAB-113 with parent QAB-113 (status To Do). No picker for existing tickets exists in the Subtasks section; the only way to attach an existing ticket is the child's Parent field (QAB-114 attached that way).

**Likely cause:** The Subtasks section only has a create-by-title input.

**Required fix:** Recommended behavior (implement, then flag): add an "Add existing" action in the Subtasks header that reuses the parent picker search and sets the chosen ticket's parent to the current ticket (same PATCH the child-side Parent field uses). Exclude the ticket itself and its ancestors. Keep the create-by-title input.

**Acceptance criteria:**
- From a parent ticket, "Add existing" attaches an existing ticket as a child; it shows under Subtasks without reload.
- The ticket itself and its ancestors are not offered.
- Creating a new subtask by title still works.

### B-074 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Portfolio and Program accept a whitespace-only name

Frontend uses `portfolioOrProgramNameSchema` with `.trim().min(1)`. Backend DTOs (`portfolios.schemas.ts`, `programs.schemas.ts`) also apply `.trim().min(1)`. Both layers reject whitespace-only names.

Latest report note: PARTIAL: Create Portfolio and Create Program (owner): a name of three spaces shows "Required" under Name and sends no POST (no record created). Client side fixed. Server-side 400 for a direct POST/PATCH with a whitespace name could not be tested from the browser, so not confirmed.

**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Create Portfolio and Create Program (owner): a name of three spaces shows "Required" under Name and sends no POST (no record created). Client side fixed. Server-side 400 for a direct POST/PATCH with a whitespace name could not be tested from the browser, so not confirmed.
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** https://www.streamlineos.in/build/portfolios ("New portfolio") and https://www.streamlineos.in/build/programs ("New program"), Create dialog. Role: Owner (QA account qaown1012b).

**Steps to reproduce:**
1. Open the Create Portfolio (or Create Program) dialog.
2. Enter only spaces as the name.
3. Submit.

**Expected:** The same "Required" error that the empty name already shows; no request.

**Actual:** `POST /build/portfolios` (or `POST /build/programs`) returns 201 and the record is saved with a blank name.

**Likely cause:** Same as B-007: the name is validated without trimming, on the client and on the server.

**Required fix:** Apply the shared G4 trim-then-validate name rule to the portfolio and program create and edit forms and their server DTOs.

**Acceptance criteria:**
- A whitespace-only name shows the existing required error and sends no request, for Portfolio and Program, on create and edit.
- A direct POST/PATCH with a whitespace-only name returns 400.
- Padded names are saved trimmed.

### B-075 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Product, portfolio and program lists do not refresh after create or delete

`useCreatePortfolio`, `useDeletePortfolio`, `useCreateProgram`, `useDeleteProgram` all patch the cache via `setQueriesData` on success. Managed products list likewise. No broad invalidation; row is added/removed immediately.

Latest report note: PARTIAL: Portfolios (owner): creating "RC1014 refresh pf" showed it in the list immediately, no reload. Deleting it: the row was still listed right after the confirm closed, and gone on a later read (the refresh looked delayed). Programs and product lists not checked. Test portfolio deleted (cleanup).

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — Portfolios (owner): creating "RC1014 refresh pf" showed it in the list immediately, no reload. Deleting it: the row was still listed right after the confirm closed, and gone on a later read (the refresh looked delayed). Programs and product lists not checked. Test portfolio deleted (cleanup).
**Shared root cause group:** G5 Query invalidation after mutations

**Where:** https://www.streamlineos.in/build/managed-products, /build/portfolios and /build/programs. Role: Owner.

**Steps to reproduce:**
1. Create a product, portfolio or program.
2. Look at the list without reloading.
3. Delete a row and look at the list without reloading.

**Expected:** The new row shows right after create, and a deleted row disappears right after delete.

**Actual:** After create the list keeps its empty state or stale rows; after delete the row stays until reload.

**Likely cause:** The create and delete mutations do not invalidate the list queries.

**Required fix:** Invalidate (or update) the list query on success of create, update and delete for products, portfolios and programs (shared G5 pattern).

**Acceptance criteria:**
- Create and delete on each of the three lists update the list at once, without reload.

### B-077 — FIXED: past approval due date and date format consistency

An approval due date in the past is accepted, and the date format is inconsistent

Fixed: (1) `request-approval-form-body.tsx` already passes `disablePast` to `DatePicker`, which sets `effectiveFromDate = today` and disables past days in the calendar. (2) `approvals-inbox-columns.tsx` was using `row.dueAt.slice(0, 10)` (raw ISO string) instead of `formatShortDate(row.dueAt)` — fixed to use `formatShortDate` for consistency with `use-approvals-columns.tsx`.

Latest report note: BLOCKED: retest (owner): the Request approval dialog did not open in this run and the approvals table read empty, so the past-date check was not run.

- **Severity:** Low. A due date of 2026-10-01 is saved with 201. The milestone picker disables past days, so the two pickers disagree. The list shows the raw ISO date, while other rows show "—".
- **Suggested fix:** use the same past-date rule for both, and format dates consistently.

### B-079 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

A link added in the Create dialog has no edit or remove control

Fixed: `ticket-related-links.tsx` renders an `AnimatedIconButton` with X icon for each link when `canUpdate` is true. The button calls `removeLink.mutate({ projectId, ticketId, linkId: link.id })`. The control was already present. Could not be repro'd in browser (no related links on test ticket).

- **Severity:** Low (needs confirmation). The link shows under the sidebar "LINKS" section, not under Relations, and there is no remove control.

### B-081 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

The Sub-issues display toggle has no effect

Fixed in code: `use-board-url-state.ts` computes `subIssueIds` from `boardTickets` when `!displayOptions.showSubIssues`, then passes it to `filterBoardTickets` which filters them out of `filteredTickets`. The same `filteredTickets` is passed to `TableView` through `ProjectBoardViewPane`. Both kanban and table views use the same filtered set. Could not be repro'd in browser (needed parent+child setup).

### B-082 — FIXED: parent/relation/epic changes leave no history entry

Parent and relation changes leave no history entry

Latest report note: PARTIAL: retest (owner): QAB-135 History lists Created and Updated entries only. No entry for the Blocks relation to QAB-136 was seen. Parent set/remove not tested.

**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — retest (owner): QAB-135 History lists Created and Updated entries only. No entry for the Blocks relation to QAB-136 was seen. Parent set/remove not tested.
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Ticket page history/activity — https://www.streamlineos.in/build/7/tickets/QAB-120, /QAB-121, /QAB-122 (round 8, owner qaown1012b). | Role/account: Owner qaown1012b (Owner, project 7).

**Steps to reproduce:**
1. On QAB-122 (parent QAB-121), click "Remove parent".
2. On QAB-120, remove the "Duplicate of" relation to QAB-121 (the other side of the earlier "Duplicate of" link).
3. Read the ticket activity/history on both tickets after each change.

**Expected:** Each change adds a history entry (who removed what, when), the same as parent set and relation add.

**Actual:** The parent and relation changes update the Relations/Parent fields, but no matching entry appears in the history. (Run-note observation; exact request statuses were not saved in this context — re-verify.)

**Retest notes:** Round 10 re-check: remove parent (`PATCH /build/7/tickets/136` 200), relation removal (`DELETE /build/7/tickets/135/relations?relatedId=136` 204) and parent set (`PATCH /build/7/tickets/136` 200, toast "Parent set") all left no HISTORY entry. This covers parent set and removed, and relation added and removed.

**Likely cause:** History is written for field changes (status, priority, title, assignee) but not for parent changes or relation create/delete.

**Required fix:** Write history entries for parent set, changed and removed, and for relation added and removed (on both tickets), using the existing history mechanism, and show them in HISTORY.

**Acceptance criteria:**
- Setting and removing a parent each add a HISTORY entry on the child (who, what, when).
- Adding and removing a Blocks relation adds an entry on both tickets.
- API tests cover these entries.

# New bugs from 14 Oct recheck

These were not in the original brief. Fix them with the same rules (smallest correct change, no secrets).

### B-083 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

At 375 px the Settings "Statuses" tab truncates text (Low — needs re-check)

Code check: `status-row.tsx` row uses `flex items-center gap-2.5 p-2.5`. The status name button has `flex-1 min-w-0 truncate`. The Select trigger has `w-[130px] shrink-0`. At 375px available width (~355px after padding) the name has ~159px of flex-1 space with truncate applied. Layout looks correct; needs a browser re-check at 375px to confirm no visual clipping.

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

### NEW-R2 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

First Continue after typing the email returned to the email step with ?email= in…

Code audit: The sign-in OTP flow is server-side auth. When Continue is clicked the first time, the server creates an OTP token and redirects back with ?email= param. On the second click it detects the token and advances to the verification step. This behavior is inherent to the NextAuth server-side OTP flow; no client-side bug in the code. Needs a browser re-check to confirm if this still occurs after recent auth changes.

**Severity:** Low
**Recheck 14 Oct observed:** NEW — First Continue after typing the email returned to the email step with ?email= in the URL and no code sent. Second Continue sent the code.

**Where:** Sign-in, email step (qamem1012c)

**Steps / evidence:** Fill email, click Continue (exact). Page shows email step again; repeat once and the "Verification code" step appears.

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

### NEW-R3 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Row status does not update after Decide (see B-076). Also the Approver column re…

Code audit: (1) Row status — `useDecideApproval` patches `approvals.list(pid)` via `setQueriesData` using `patchApprovalInPages` (infinite/paginated) and `patchApprovalInFlatPage` (flat). The correct patcher matches the cache shape. Status update should work without reload. (2) "Unknown" approver — `memberName` calls `getUserDisplayName` which returns "Unknown" only when `name`, `firstName`, `lastName`, and `email` are all null/empty. This is a data issue: the member (qamem1012c) has an incomplete profile. No code defect.

**Severity:** Medium
**Recheck 14 Oct observed:** NEW — Row status does not update after Decide (see B-076). Also the Approver column reads "Unknown" for the member's own approval row.

**Where:** /build/7/approvals (member Decide)

**Steps / evidence:** Member Decide (Approve): row still "Escalated" until reload; after reload "Approved", approver shown "Unknown".

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

## UX notes that are not done

### Round 3 (2026-10-13 late afternoon)

U-019 — FIXED: hover tooltips added to Resend and Cancel icon buttons | Settings > Users > Invitations row actions | Resend, Copy join link and Cancel are icon-only buttons (aria-label only; no visible text or tooltip). Cancel invitation works (DELETE 200; row shows "Revoked" with "Re-invite" after reload), but the round-2 note said no cancel control existed | Show a visible "Cancel" text button or an overflow menu with labels; refresh the row to "Revoked" right after the 200 | Low
U-020 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION | Board filters vs display settings | Filters live only in the URL: after Overview → Issues (sidebar) the Priority/Type filters are gone, while the Ordering and Completed settings persist across full loads. Users cannot tell which settings will be kept | Keep the last filter set per project (or show "Filters reset" toast), and state in the Display drawer which settings persist | Low
U-021 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION | Board at 768 px | Filter controls (Add filter, Hide done, search) overflow the toolbar and are only reachable by sideways scroll (see B-029) | Wrap the toolbar or collapse filters into one "Filter" button under 1024 px | Low (paired with B-029)

### Round 6 (2026-10-13, 375 px pass)

U-026 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION | Release Notes editor and ticket Activity action row at 375 px (B-059, B-060) | Release editor is 639 px wide inside a 375 px dialog; Activity row "Summarize comments / Handoff / Draft comment" is wider than the screen and scrolls the whole ticket page | Constrain the editor to the dialog width and wrap its toolbar; wrap or collapse the Activity buttons under 640 px | Low (paired with B-059/B-060)
