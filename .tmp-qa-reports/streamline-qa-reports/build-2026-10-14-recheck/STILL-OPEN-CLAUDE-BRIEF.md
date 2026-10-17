# Claude Code fix brief: StreamlineOS Build module — STILL OPEN after 14 Oct 2026 recheck

Paste this whole file into Claude Code at the root of the StreamlineOS repository.

This brief contains **only bugs that are still FAIL or PARTIAL** after the 14 Oct 2026 recheck (plus new bugs found in that recheck). Bugs that passed are omitted. Each bug section is copied from the original 13 Oct brief, with a **Recheck 14 Oct observed** line added from the recheck run.

## 1. Role and instructions

You are fixing confirmed bugs in the **Build** module of StreamlineOS. The frontend is a Next.js app served at https://www.streamlineos.in. The API is served at https://api.streamlineos.in (probably NestJS). You have the repository. This brief does not give file paths, because they were not known when it was written. Find code with the search hints given (routes such as `/build/:id/tickets`, endpoints such as `PATCH /build/:projectId/tickets/:id/rank` or `GET /storage/download`, and the exact UI strings in quotes). Use `rg` for the exact strings first.

The bug list below is final for this recheck. Fix only these bugs. Do not fix, refactor or restyle anything else, even if you notice it.

Rules:

1. **Work in priority order:** Critical, then High, then Medium, then Low. Within a severity, follow the order in this file. Fix each shared root cause (section 2) once, when you reach the first bug that needs it, and then confirm the other bugs in that group.
2. **Make the smallest correct change.** Fix the root cause, not the symptom, but do not redesign components, rename APIs, change response shapes that other callers use, or add libraries unless a bug cannot be fixed otherwise. If you must add one, say why in the summary.
3. **Fix shared root causes once, in one shared place:**
   - One reusable submit in-flight guard (a hook or helper) for every double-click duplicate (group G1). Do not patch each button separately.
   - One trim-then-validate rule per field (name, title, points, budget, version, notes length, due date), used by the client form **and** the server DTO/validation (group G4). The server must reject invalid input with 400 and a field error even when the client is bypassed.
   - After every create, update, delete or decision, invalidate or update the list queries that show that record (group G5). Use the data-fetching library the repo already uses (for example TanStack Query `invalidateQueries`).
   - Server-side permission checks must match what the UI shows (group G6). Never rely only on hiding a button, and never show a control that the server will refuse.
   - Server errors (400/403/409) must show as a short plain-language message next to the field or in the dialog, never as raw schema text, raw permission keys or a page-level crash (group G8).
4. **Tests:** where the repo has tests for the touched area (API unit/e2e tests, component tests, Playwright), add or update tests that cover the acceptance criteria. Do not create a new test framework. Run the existing test, lint and type-check commands and keep them passing.
5. **Do not change unrelated behavior.** Everything listed in section 4 (regression checklist) must keep working.
6. **"Confirm intended" items** still open (B-061, B-073): implement the recommended behavior described in each section, and list these items separately in your final summary as "Policy decisions to confirm", with one sentence on what you chose.
7. **No secrets.** Do not put passwords, tokens, invite tokens or keys in code, tests, fixtures, logs or your summary. QA account emails/usernames named below are for reference only.
8. If you cannot reproduce or fix a bug with a reasonable change, stop on that bug, write what you found, and continue with the next one. Do not guess at large rewrites.
9. **PARTIAL** means the recheck saw some acceptance criteria met and some not. Finish the remaining criteria; do not regress the parts that already pass.
10. **Final output:** end with a table with one row per bug ID in this file:

   | ID | Fixed (yes / partial / no) | Files changed | How verified (test name, manual steps, or reason not verified) |
   |---|---|---|---|

   After the table add: "Policy decisions to confirm" (the confirm-intended items), "Follow-ups" (anything you deliberately left out), and the commands you ran with their results.

**Test context.** QA project: id 7, key QAB, name "QA Project Alpha", org "QA Build Org 1012b". QA accounts: owner qaown1012b@sharklasers.com (Owner), member qamem1012c (Member with Build Member on project 7), org admin and Build admin qaadm1012d, viewer qaview1012e (no Build access). Ticket keys and internal ids quoted below come from the QA runs; create your own local data. File paths under /workspace/streamline-qa/fixtures/ are the QA machine's test files; use any equivalent small files.

**Recheck context (14 Oct 2026).** After user fixes, QA retested. This brief keeps FAIL and PARTIAL only. Counts from recheck: PASS 36, FAIL 12, PARTIAL 18, BLOCKED 17 (blocked items are out of scope here — they need viewport control, invitee session, or safe test data).

---

# 2. Shared root causes

Fix each group's root cause once. The bug sections in part 3 refer back to these groups. A bug may appear in more than one group.

## G1 Submit in-flight guard
- **IDs (still open):** B-057
- **Root cause:** Submit buttons have no synchronous in-flight guard, so a double-click sends two requests.
- **Fix once:** Build one reusable guard (hook/helper: set a ref on the first call, disable the button, ignore calls until the promise settles, re-enable on error). Apply it to every create/save/post/delegate button listed. Optionally send an idempotency key per dialog session if the API can honour it cheaply.

## G3 Board rank/move endpoint and board state
- **IDs (still open):** B-028
- **Root cause:** The rank endpoint `PATCH /build/:projectId/tickets/:id/rank` returns 409 "Board order changed; refresh and retry" whenever there is no valid neighbour (empty column) or the move is inside one column; the board does not apply successful moves locally.
- **Fix once:** Fix the rank calculation on the server (empty column and same-column cases), then make the client apply the 200 payload and refetch on 409.

## G4 Shared field validation (client AND server)
- **IDs (still open):** B-007, B-074, B-010, B-046, B-053
- **Root cause:** Fields are validated differently on the client and the server (or only on one side), without trimming, and with different limits per entry point.
- **Fix once:** Define each rule once (trim, required, min/max, format) and use it in the client form and the server DTO. Server returns 400 with a field error.

## G5 Query invalidation after mutations
- **IDs (still open):** B-028, B-048, B-075, B-076
- **Root cause:** Mutations succeed, but the list/card queries that show the record are not invalidated or updated, so the UI is stale until reload.
- **Fix once:** After every create, update, delete, move or decision, invalidate (or update from the response) every list query that shows that record.

## G6 Permission checks: UI must match server
- **IDs (still open):** B-031, B-061
- **Root cause:** The UI shows controls by one permission while the server (or the client save handler) checks another, or the server checks too little.
- **Fix once:** For each action, use one permission rule: the server enforces it (403), and the UI shows the control only when that rule passes. Never show raw permission keys.

## G7 List/board query options (sort, columns, sub-issues, filters)
- **IDs (still open):** B-025, B-034, B-035, B-036
- **Root cause:** Display options (Ordering, Columns, Sub-issues) and filters are written to the URL but not applied to the query or the rendering, or are lost on navigation.
- **Fix once:** Pass each option to the tickets query and apply it server-side (sorting both directions, sub-issue filter) or in the board grouping; keep URL, controls and data in sync.

## G8 Server errors mapped to visible, plain-language messages
- **IDs (still open):** B-046, B-017, NEW-27
- **Root cause:** Server errors are swallowed (no message), shown as raw schema/field keys, or bubble up to a page-level error boundary that unmounts the page.
- **Fix once:** Map 400/403/409 responses to short messages next to the field or in the dialog; add item-level error boundaries where one bad record can break a page.

## G9 Narrow-viewport layout (375/768 px) and long text
- **IDs (still open):** B-040
- **Root cause:** Fixed widths, non-wrapping flex rows and missing `min-width:0` cause overflow at 375/768 px and with long unbroken text.
- **Fix once:** Use wrapping, `min-width:0`, `max-width:100%`, `overflow-wrap:anywhere` and truncation with tooltips. Do not change desktop layouts beyond the fix.

## G10 Ticket relations, parents and history
- **IDs (still open):** B-073, B-082
- **Root cause:** Relation direction is not inverted for the target ticket, parent/relation changes are not written to history, and pickers/dialogs ignore the tree structure.
- **Fix once:** Invert directional relation types on read, write history for parent and relation changes, and use the parent/child tree in pickers and the delete confirmation.

## G11 Navigation, routes and dead links
- **IDs (still open):** B-011, B-042
- **Root cause:** Links and view buttons point to wrong or disabled routes.
- **Fix once:** Point links at the correct routes, add a redirect for the old route, and hide links to disabled modules.

## Stand-alone bugs (no shared cause)
- **IDs (still open):** B-030, B-048, B-056, B-006, B-023, NEW-26, B-052, B-064

## Confirm-intended items
- **IDs (still open):** B-061, B-073

---

---

# 3. Bugs still open, in severity order

Each section is from the original 13 Oct brief, plus **Recheck 14 Oct observed**. Fix to the original acceptance criteria unless the recheck note shows part already done (PARTIAL).

**IDs in this brief by severity:**
- **Critical:** (none)
- **High:** (none)
- **Medium:** B-007 (FAIL), B-074 (PARTIAL), B-010 (PARTIAL), B-011 (FAIL), B-025 (FAIL), B-034 (PARTIAL), B-035 (PARTIAL), B-028 (FAIL), B-030 (FAIL), B-031 (PARTIAL), B-042 (PARTIAL), B-046 (PARTIAL), B-048 (PARTIAL), B-056 (PARTIAL), B-061 (FAIL)
- **Low:** B-006 (PARTIAL), B-017 (FAIL), B-023 (FAIL), NEW-26 (FAIL), NEW-27 (FAIL), B-036 (FAIL), B-040 (PARTIAL), B-052 (PARTIAL), B-053 (PARTIAL), B-057 (PARTIAL), B-064 (PARTIAL), B-073 (PARTIAL), B-075 (PARTIAL), B-076 (FAIL), B-082 (PARTIAL)
- **Medium (new from recheck):** NEW-R3
- **Low (new from recheck):** NEW-R1, NEW-R2, NEW-R4

---

# Medium

## B-007: A project name made only of spaces is saved (project settings)
**Severity:** Medium

**Recheck 14 Oct observed:** FAIL — Project settings (/build/7/settings), owner: Project Name set to three spaces and Save Changes clicked. After reload the Project Name field was empty (saved as a blank name). Restored to "QA Project Alpha" (verified exact on reload). The save toast was not captured because the tab crashed twice during the test (memory).
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Project settings > General — https://www.streamlineos.in/build/7/settings | Role/account: Owner qaown1012b (Owner). Project Admin / Build Admin also has settings edit (build:update) and should be checked the same way.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/settings (General tab).
2. Clear "Project Name" and type three spaces `   `.
3. Click "Save Changes".
4. Reload https://www.streamlineos.in/build/7/settings and read the "Project Name" field.

**Expected:** The save is blocked with "Project name is required" (same as the empty string), or the value is trimmed and rejected as empty. The stored name is never blank.

**Actual:** Empty string: client shows "Project name is required" and sends no request. Three spaces: `PATCH https://api.streamlineos.in/build/7` → **200**, toast "Project settings updated". After reload the Project Name field is **empty** (`""`), i.e. the project is saved with a blank name. Restored afterwards to "QA Project Alpha" (PATCH 200).

**Likely cause:** The client required-check runs on the raw value (so "" fails but "   " passes) and the server DTO does not trim before validating.

**Required fix:** Use one shared name rule (trim, then required/min length with the existing messages such as "Project name is required") in the client form and in the server DTO. Save the trimmed value. Search hints: "Project name is required", "Project settings updated", `PATCH /build/:id`.

**Acceptance criteria:**
- Saving "   " as Project Name shows "Project name is required" and sends no request.
- A direct `PATCH /build/7` with name "   " returns 400 with a field error; the stored name is unchanged.
- "  QA Project Alpha  " is saved as "QA Project Alpha".
- A server test covers whitespace-only and padded names.

## B-074: Portfolio and Program accept a whitespace-only name
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

## B-010: CSV import accepts story points above 100
**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Issues > Import / Export > Import with rc1014-import-points.csv (rows: points 101 and 100). Dry run POST /build/7/import-export/tickets/preview returned 200, but the dialog never rendered the dry-run summary or row errors (Import stayed disabled). A one-row file with points 100 also rendered no result, so the points-101 rule could not be checked. Nothing imported; no records created.
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Issues > Import / Export (Import tab) — https://www.streamlineos.in/build/7/issues (dialog). Endpoints: `POST /build/7/import-export/tickets/preview` and the import request. | Role/account: Owner qaown1012b (Owner). Any role with import permission (Org Admin/Build Admin too).

**Steps to reproduce:**
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

**Likely cause:** The import row validator (`POST /build/:projectId/import-export/tickets/preview` and the import endpoint) has its own schema without the integer 0 to 100 bound used by ticket create/update.

**Required fix:** Reuse the ticket points rule (integer 0 to 100) in the import row validation for both the dry run and the real import, so out-of-range rows are listed as row errors with the same message used elsewhere. Search hints: `import-export/tickets/preview`, "rows ready to import", "Dry run".

**Acceptance criteria:**
- A CSV row with points 101 (or -1, or 2.5) is listed under row errors in the dry run and skipped on import.
- Points 0 and 100 import fine.
- A test covers the import validator bounds.

## B-011: Project Calendar shows no Build tickets
**Severity:** Medium

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

## B-025: Board ignores "Ordering", and list "Created" ignores direction (newest is last)
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

## B-034: Table/List: Priority and Due date orderings return the same sequence, and "Updated" does nothing
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

## B-035: Board "Columns" option is ignored (always Status columns)
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

## B-028: Board stays stale after a successful move
**Severity:** Medium

**Recheck 14 Oct observed:** FAIL — retest (owner): keyboard move of "RC1014 attach types" (QAB-135) Todo to In progress, PATCH rank 200. Counts stayed stale right after the move (Todo 1, In progress 1, card already in In progress). After reload Todo 0, In progress 2. Still stale until reload.
**Shared root cause group:** G5 Query invalidation after mutations

**Where:** Board — https://www.streamlineos.in/build/7/issues?q=crash | Role/account: Owner qaown1012b (Owner). Target column not empty (In progress with 2–3 cards).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash. Read counts: Todo 7, In progress 2.
2. Keyboard: focus "R3 crash probe 3 1013" (QAB-100), Space, ArrowRight, Space. Read the response (PATCH …/tickets/111/rank) and the counts immediately after 4 s.
3. Reload and read counts.
4. Repeat step 2 with "R3 crash probe 5 1013" (QAB-102) → PATCH …/tickets/113/rank.

**Expected:** Counts update to Todo 6, In progress 3 right after the 200 response; the card appears in In progress.

**Actual:** Step 2: `PATCH …/rank` → **200** `{"success":true,"data":{"id":111,"status":"IN_PROGRESS","version":2}}`; the UI still shows Todo 7, In progress 2 and the card in Todo. Step 3: after reload Todo 6, In progress 3 (the move had been saved). Step 4: 200 again, UI counts unchanged (Todo 6, In progress 3); after reload Todo 5, In progress 4 (not re-read; same pattern seen in B-027 results).

**Likely cause:** After `PATCH .../rank` returns 200 the client neither updates the cached board data nor invalidates the tickets query.

**Required fix:** On drop, update the card optimistically in the board cache, then reconcile with the 200 payload (status, rank, version). On error (including 409), roll back and refetch the board. Use the shared G5 pattern.

**Acceptance criteria:**
- After a successful drag or keyboard move, the card is in the new column and both column counts update immediately, without reload.
- Moving the same card again right away works (no 409 caused by a stale version).
- On a forced 409 the board refetches and shows the server order with a toast.

## B-030: The project Files page shows "Project error" for the owner
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

## B-031: A member can upload to storage through a hidden file input
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

## B-042: The Agile reports link is a 404
**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — /build/7/agile-reports now redirects to /build/7/reports, which shows the Agile Reports content (no 404). The "Agile reports" link on the project was not found in More tools, so the link click itself was not confirmed.
**Shared root cause group:** G11 Navigation, routes and dead links

**Where:** The "Agile reports" link in the Build project (project 7). Role: Owner.

**Steps to reproduce:**
1. Open project 7.
2. Click the "Agile reports" link (it goes to /build/7/agile-reports).

**Expected:** The reports page opens.

**Actual:** /build/7/agile-reports returns "Page Not Found". The working page is /build/7/reports, but nothing links to it (round 8 note).

**Likely cause:** The link (or a route constant) points to `/build/:id/agile-reports`, while the page route is `/build/:id/reports`.

**Required fix:** Point the link at `/build/:id/reports`. Add a redirect from `/build/:id/agile-reports` to `/build/:id/reports` so old links work. Search hints: "Agile reports", `agile-reports`.

**Acceptance criteria:**
- Clicking "Agile reports" opens /build/7/reports with its content.
- /build/7/agile-reports redirects to /build/7/reports instead of showing 404.

## B-046: A 23-digit budget returns 500
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

## B-048: Release "Delete" opens "Edit Release" underneath it
**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Owner, /build/7/releases, "RC1014 release dbl": Actions > Delete opened only the "Delete release?" alert (no Edit Release dialog seen). Clicking its Delete removed the release (confirmed after reload; RC1014 release dbl is now deleted). The list still showed the deleted row until reload (stale list, see G5). The DELETE request was not captured.

**Where:** Releases — https://www.streamlineos.in/build/7/releases → row "Actions" menu → "Delete" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/releases with a release row (e.g. "R4 release 1013", "R5 release 1013").
2. Click the row "Actions" button → "Delete".
3. Read open dialogs; click "Delete" in "Delete release?".

**Expected:** Only the "Delete release?" confirmation opens; its Delete button is clickable.

**Actual:** Step 2 opens the "Delete release?" alert AND the "Edit Release" dialog (both present; reproduced 3/3). Clicking the alert's "Delete" times out ("…<div data-slot="alert-dialog-overlay"> intercepts pointer events"). In one attempt focus was in the Edit form, and Enter sent `PATCH https://api.streamlineos.in/build/7/releases/1` → **200** (an unintended save of "R4 release 1013" with the form's values; the release was deleted afterwards). Pressing Escape closes the Edit dialog, after which the alert's Delete works (`DELETE /build/7/releases/<id>` → 204).

**Retest notes:** Still reproduces in rounds 7 and 8.

**Likely cause:** The row click handler opens Edit, and the Actions menu item click (Delete) bubbles up to the row, so both dialogs open.

**Required fix:** Stop propagation on the Actions menu trigger and its items (or ignore clicks from inside the menu in the row handler) so Delete opens only "Delete release?". Make sure the confirmation gets focus and its Delete button is clickable.

**Acceptance criteria:**
- Actions, then Delete, opens only "Delete release?"; no Edit Release sheet appears.
- The confirmation's Delete sends `DELETE /build/7/releases/:id` (204) and the row disappears without reload.
- Pressing Enter while the confirmation is open never sends a release PATCH.
- Clicking the row itself still opens Edit for users who can edit.

## B-056: The approval task picker cannot find new tickets
**Severity:** Medium

**Recheck 14 Oct observed:** PARTIAL — Owner, Approvals > Request approval > Task (Request Approval dialog): the "Search tasks…" picker opens with a default list of 50 tickets (QAB-3, QAB-1, QAB-2, QAB-4 ...). Typing QAB-135 into the picker did not filter the list (no matching option, no "No items found"), so the search for new tickets could not be confirmed. No approval was submitted; the dialog was cancelled.

**Where:** Approvals → "Request approval" → "Request task approval" → "Search tasks…" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Create three tickets "R5 drag probe A/B/C 1013" (QAB-108..110, minutes earlier).
2. Open the task picker; search `QAB-108`, `R5`, `R5 drag probe`.
3. Search `QAB-8`, `QAB-10`, `Bulk pag item 02` for comparison.

**Expected:** The new tickets appear.

**Actual:** QAB-108 / R5 / R5 drag probe → "No items found." (0 options). QAB-8 → QAB-8; QAB-10 → QAB-10; "Bulk pag item 02" → QAB-3. With an empty query the picker lists 50 tickets (QAB-3, QAB-1, QAB-2, QAB-4 …) and none of the new ones are in view.

**Retest notes:** Re-confirmed in rounds 10 and 11: new tickets are not found by title or key; older tickets are.

**Likely cause:** The picker loads a fixed first page (about 50 tickets in rank/oldest order) and filters on the client, so newer tickets outside that page are never found.

**Required fix:** Make "Search tasks…" query the server with the typed text (debounced) using the tickets search (`GET /build/:projectId/tickets?search=...&limit=...`), matching title and key (e.g. "QAB-130"). With an empty query, show the most recent tickets first. Search hints: "Request task approval", "Search tasks…", "No items found.".

**Acceptance criteria:**
- A ticket created a minute ago is found by its title and by its key.
- Older tickets are still found.
- Search requests are debounced.

## B-061: The owner can decide another person's approval
**Severity:** Medium (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)

**Recheck 14 Oct observed:** FAIL — Owner, /build/7/approvals: the row "R11 milestone approval 1013 run3" (approver qamem1012c, status Escalated) has a Decide item in the owner row menu (Decide, Delegate, Cancel, Delete) even though the owner is not the approver. Decision not submitted (to avoid changing the member approval). Server 403 not tested. Confirm-intended item: UI still offers Decide to a non-approver.
**Shared root cause group:** G6 Permission checks: UI must match server

**Where:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Decide" | Role/account: Owner qaown1012b (Owner, project 7). Approver set to qamem1012c (Build Member). The signed-in user is NOT the approver.

**Steps to reproduce:**
1. Open /build/7/approvals. Click "Request approval" → "Request milestone approval". Entity: milestone "R6 milestone 1013"; Title "R6 approval milestone 1013"; Approver qamem1012c; Submit (1 POST 201, row Pending).
2. Row "Approval actions" → "Decide". The dialog "Make Decision" opens (Decision: Approve / Reject / Request Changes; Comment optional).
3. Keep "Approve", comment "R6 probe: owner decides as non-approver", click "Submit".

**Expected:** The server refuses the decision (403/“Only the approver can decide”), or the owner override is documented and visible on the row (decided by, on behalf of).

**Actual:** `PATCH https://api.streamlineos.in/build/7/approvals/2/decide` → **200**. Toast "Decision submitted". The row changes to **Approved**. The row shows only the approver name (qamem1012c); nothing shows that the owner made the decision. The Decide dialog did not warn that the signed-in user is not the approver.

**Likely cause:** `PATCH /build/:projectId/approvals/:id/decide` checks a general manage permission, not that the caller is the assigned approver or an active delegate; nothing records who actually decided.

**Required fix:** Recommended behavior (implement, then flag in the summary): only the assigned approver or an active delegate can decide; anyone else gets 403 "Only the assigned approver can decide this request". In the UI, hide Decide (or disable it with "You are not the approver") for non-approvers. If the codebase already has an explicit admin-override concept, keep it only with a required reason and a recorded "decided by"; otherwise do not add an override. Coordinate with B-084 so the real approver can decide.

**Acceptance criteria:**
- As owner (not the approver), Decide is not offered or is disabled with "You are not the approver", and a direct `PATCH .../decide` returns 403.
- As the assigned approver, Decide works (200).
- An API test covers approver allowed and non-approver owner forbidden.

# Low

## B-006: `%` and `_` act as wildcards in search
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

## B-017: A 0-byte file gives no message
**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest (owner): 0-byte fixtures/empty-0byte-0913.pdf set on the Activity file input of QAB-135, wait 6 s: no request sent and no "is empty" message shown. Still silent.
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-92 (and QAB-94) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open a ticket that loads (QAB-92 PDF test ticket, or a new one).
2. Set the attach input to /workspace/streamline-qa/fixtures/empty-0byte-0913.pdf (0 bytes).
3. Wait 6 s; compare the page text before and after.

**Expected:** A message such as "empty-0byte-0913.pdf is empty" (or the same "not allowed" pattern used for .exe).

**Actual:** `POST https://api.streamlineos.in/build/7/files → 400`; the response body contains `contentBase64: Too small: expected string to have >=4 characters`. No attachment created. No new text appears on the page (text diff empty in 2 runs; only an older toast was visible).

**Likely cause:** No client-side size check, and the server 400 (`contentBase64: Too small...`) is not turned into a message.

**Required fix:** Reject 0-byte files before upload with "<file name> is empty". Map upload 400s to a plain message; never show schema text.

**Acceptance criteria:**
- Attaching a 0-byte file shows "<name> is empty" and sends no request.
- No UI text shows "contentBase64".

## B-023: Browser Back drops the Create dialog's typed title
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

**Acceptance criteria:**
- Type a title, press Back, then reopen Create Issue (or press Forward): the title is restored.
- After a successful create or Cancel, the draft is cleared.

## NEW-26: The wizard name error stays after the name is fixed
**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest (owner): Name "A" + Next shows "Name must be at least 2 characters". Name changed to "QA Name OK" and Tab: the same error is still visible.

**Where:** New Project wizard, step 1 — https://www.streamlineos.in/build/projects → "New Project" → Name field | Role/account: Owner qaown1012b (Owner). Not created.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/projects → "New Project".
2. Name: `A`. Click "Next" (not Tab).
3. Read the error. Then clear Name and type `QA Name OK`, press Tab.
4. Read the error text again. Click "Next".

**Expected:** The error clears as soon as the value is valid (on change or blur).

**Actual:** Step 2: "Name must be at least 2 characters" shown under Name (Step 1 of 7). Step 4: the same error text is still shown with a valid name. Only "Next" advances (Step 2 of 7) and no other error appears. Note: typing `A` then Tab (without Next) shows no error at all.

**Likely cause:** The step 1 name error is set on Next and only re-checked on Next.

**Required fix:** Once an error is shown, re-validate the name on change (or blur) and clear the error when it becomes valid.

**Acceptance criteria:**
- After "Name must be at least 2 characters" appears, typing a valid name clears it at once (or on blur).
- Next still validates.

## NEW-27: .exe in the image-only input gives no message
**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest (owner): fixtures/qa-test.exe set on the image-only file input (accept image/jpeg,png,gif,webp) of QAB-135. No request sent and no "not an allowed file type" message appeared within 6 s.
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** https://www.streamlineos.in/build/7/tickets/<key>, the hidden image-only file input (`accept="image/jpeg,image/png,image/gif,image/webp"`). Role: Owner (QA account qaown1012b).

**Steps to reproduce:**
1. Open a ticket that loads (QAB-91 in the run).
2. Put a .exe file (qa-test.exe) into the image-only file input.
3. Wait for the response and read the page.

**Expected:** Rejected on the client with "qa-test.exe is not an allowed file type." (as the create-dialog path), or the message shown if sent.

**Actual:** `POST https://api.streamlineos.in/storage/upload → 400`; no visible message (new-text diff contains no alert text). The file is not attached.

**Likely cause:** The image input does not check the file type before upload, and the `POST /storage/upload` 400 is not shown.

**Required fix:** Check the file type against the allowed image types before upload and show "<name> is not an allowed file type." (same text as the create-dialog path). Show any upload 400 as a visible message. Give the input an accessible label.

**Acceptance criteria:**
- Choosing qa-test.exe in the image input shows "qa-test.exe is not an allowed file type." and sends no request.
- If the server still returns 400 for a file, a visible message appears.

## B-036: The Priority filter is dropped after navigating away and back
**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest (owner): /build/7/issues?priority=URGENT, sidebar Overview then sidebar Issues: URL is /build/7/issues with no query, so the Priority filter is dropped.
**Shared root cause group:** G7 List/board query options (sort, columns, sub-issues, filters)

**Where:** https://www.streamlineos.in/build/7/issues (filter bar: Add filter) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/issues. Add filter → Priority → Urgent (URL `?priority=URGENT`, 11 cards).
2. Reload (filter kept). Click the sidebar "Overview", then "Issues" (URL still `?priority=URGENT`).
3. Add filter → Type → Bug (the chip choice was made via the popup).

**Expected:** The Priority=Urgent chip stays; Type=Bug is added (`?priority=URGENT&type=BUG`).

**Actual:** One run: after step 3 the URL was `/build/7/issues` (no chips) and the board showed all 83 Todo cards. Three later runs kept the filter: `?type=BUG&priority=URGENT` gave 4 cards with "2" in the filter count, and reload kept both. The sidebar "Overview" click did not navigate in the same run.

**Retest notes:** Round 11 confirmed 3/3 with a caveat: the filter is lost on the sidebar navigation Overview then Issues (the sidebar "Issues" link opens /build/7/issues with no query), not on the Type step. Confirmed steps: /build/7/issues, Add filter, Priority, Urgent (URL ?priority=URGENT), reload (kept), sidebar "Overview" (/build/7), sidebar "Issues" (/build/7/issues, no query; Priority chip gone), Add filter, Type, Bug (URL ?type=BUG only).

**Likely cause:** Filters live only in the URL, and the sidebar "Issues" link goes to the bare path, so active filters are lost.

**Required fix:** Remember the last issues query (filters and view options) per project, in session storage or the existing view-state store, and restore it when the sidebar "Issues" link is used (or include it in that link). "Clear" must still clear everything.

**Acceptance criteria:**
- With ?priority=URGENT active, going to Overview and back via the sidebar keeps Priority = Urgent.
- Then adding Type = Bug gives ?priority=URGENT&type=BUG with both chips.
- "Clear" removes all filters and they are not restored afterwards.

## B-040: Long "Draft awaiting review" text overflows the sidebar
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

## B-052: Large budgets show an unclear "₹1KCr" label
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

## B-053: The release version rule is inconsistent
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

## B-057: Double-click on Save/Delegate sends a second PATCH
**Severity:** Low

**Recheck 14 Oct observed:** PARTIAL — Epic edit (owner, "RC1014 epic dbl"): double-click on Save changes sent one PATCH (200) and the dialog closed. Save/Delegate on the ticket-level dialogs (the Delegate path in the B-057 report) not tested.
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Budget (Save), Epic edit (Save changes), Milestone edit (Save Changes), Approval Delegate (Delegate) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
Double-click the Save button of each dialog after changing one field.

**Expected:** One request; the button is disabled in flight.

**Actual:** Budget Save → 2 × PATCH /build/7/budget (200); Epic Save changes → 2 × PATCH /build/7/tickets/122 (200); Milestone Save Changes → 2 × PATCH /build/7/milestones/2 (200); Delegate → 2 × PATCH /build/7/approvals/1 (400 in the self-delegate case). Triage Accept (double-click) sent one PATCH.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 guard to Budget "Save", Epic "Save changes", Milestone "Save Changes" and Approval "Delegate".

**Acceptance criteria:**
- Double-clicking each of those buttons sends exactly one PATCH.
- Each button is disabled while its request is in flight.

## B-064: The epic Link picker lists only stories
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

## B-073: "Add subtask" cannot attach an existing ticket
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

## B-075: Product, portfolio and program lists do not refresh after create or delete
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

## B-076: The approvals list keeps the old status after Decide or Escalate
**Severity:** Low

**Recheck 14 Oct observed:** FAIL — retest: after the member's Decide (Approve) on "R11 milestone approval 1013 run3", the approvals row still read "Escalated" until a reload, then "Approved".
**Shared root cause group:** G5 Query invalidation after mutations

**Where:** https://www.streamlineos.in/build/7/approvals. Role: Owner (and the approver once B-084 is fixed).

**Steps to reproduce:**
1. Decide or Escalate an approval.
2. Look at the row without reloading.

**Expected:** The row shows the new status (and level) at once.

**Actual:** The row shows "Pending" until reload.

**Likely cause:** The decide and escalate mutations do not invalidate the approvals list query.

**Required fix:** Invalidate the approvals list (and related inbox/milestone queries if they show approval state) on success of decide, escalate, delegate, cancel and delete.

**Acceptance criteria:**
- After Decide, the row shows the new status without reload.
- After Escalate, the row shows Escalated and the new level without reload.

## B-082: Parent and relation changes leave no history entry
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

## NEW-R3: Row status does not update after Decide (see B-076). Also the Approver column re…
**Severity:** Medium
**Recheck 14 Oct observed:** NEW — Row status does not update after Decide (see B-076). Also the Approver column reads "Unknown" for the member's own approval row.

**Where:** /build/7/approvals (member Decide)

**Steps / evidence:** Member Decide (Approve): row still "Escalated" until reload; after reload "Approved", approver shown "Unknown".

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

## NEW-R1: The Actions menu opens empty for a member: no Edit, no Delete, no message. This …
**Severity:** Low
**Recheck 14 Oct observed:** NEW — The Actions menu opens empty for a member: no Edit, no Delete, no message. This is the B-085 fix (Edit hidden), but it leaves an empty menu.

**Where:** /build/7/milestones, Actions menu (member qamem1012c)

**Steps / evidence:** Open "Actions for RC1014 milestone edit" as the member: menu has no items.

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

## NEW-R2: First Continue after typing the email returned to the email step with ?email= in…
**Severity:** Low
**Recheck 14 Oct observed:** NEW — First Continue after typing the email returned to the email step with ?email= in the URL and no code sent. Second Continue sent the code.

**Where:** Sign-in, email step (qamem1012c)

**Steps / evidence:** Fill email, click Continue (exact). Page shows email step again; repeat once and the "Verification code" step appears.

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

## NEW-R4: Counts stay stale after a keyboard move (B-028 still present). Listed here becau…
**Severity:** Low
**Recheck 14 Oct observed:** NEW — Counts stay stale after a keyboard move (B-028 still present). Listed here because the B-028 fix was reported as done.

**Where:** Board, keyboard drag (owner)

**Steps / evidence:** Space, ArrowRight, Space on QAB-135: counts Todo 1 / In progress 1 until reload.

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

---

# 4. Final regression checklist

Run these after all fixes (automated where tests exist, manually otherwise). Each item worked before the fixes or was verified as a "no bug" check during QA, and must still work.

**Create, edit and duplicates**
- [ ] Single click creates exactly one ticket, epic, portfolio, program, milestone, release, comment and time entry.
- [ ] Double-click creates exactly one of each, and Enter / Ctrl+Enter twice quickly also creates one.
- [ ] Cycle create, label create, project create, comment edit and invite already sent one request on double-click; they still do.
- [ ] Inviting an existing member still returns 409 with the "already a member" message and no duplicate invite.
- [ ] When a request fails, the submit button re-enables and the typed values are kept.

**Validation (client and server)**
- [ ] Empty and whitespace-only names are rejected for project, portfolio and program; padded names are saved trimmed.
- [ ] Ticket title: same max in Create and detail; emoji, CJK, Arabic and combining marks still round-trip; bidi controls are removed.
- [ ] Points 0 to 100 work in create, detail and CSV import; 101 is rejected everywhere.
- [ ] Cycle capacity rules are unchanged (100000 accepted, 100001 rejected with "Capacity must be 100000 or fewer", overlap returns 409 with "Cycle dates overlap with …").
- [ ] Budget: valid values save; negative, too large and more than 2 decimals show field messages; no 500.
- [ ] Release version: hint matches the rule; duplicates in the same project are rejected; the same version in another project is allowed; trailing spaces are still trimmed.
- [ ] Release notes: 10,000 plain-text characters save; more is blocked; XSS payloads are still shown as text and never executed.

**Attachments and storage**
- [ ] PNG, JPEG, GIF, WebP and PDF attach, list, preview/download and reload without a page error.
- [ ] 10 PDFs selected at once still all upload and list.
- [ ] 0-byte and .exe files show a message and are not uploaded.
- [ ] Members without attach rights cannot upload (403) and see no attach input; owner/admin uploads work.

**Board, list and table**
- [ ] Drag and keyboard moves work into empty columns, into non-empty columns and within a column; the board updates without reload.
- [ ] A real stale move (edit in another tab first) still returns 409 and the board refetches.
- [ ] Two-tab edits on priority, status, title and assignee still return 409 to the second writer with the Keep/Discard dialog.
- [ ] Ordering (Manual, Created, Updated, Priority, Due date) works in both directions on board, list and table, and after reload.
- [ ] Columns grouping works for every listed option; Rows grouping (Priority, Assignee) still works.
- [ ] Filters persist across sidebar navigation; "Clear" clears them; Hide done and saved views still work.
- [ ] Search: long input is capped, `%` and `_` are literal, normal search unchanged, on Issues and All Work.
- [ ] Sub-issues toggle hides and shows child rows.
- [ ] Keyboard shortcuts still work: "c" opens Create, "g i" goes to Issues, "?" opens the shortcuts overlay; the Create dialog still traps focus and Esc closes it.

**Lists refresh after changes**
- [ ] Epic card, milestones, releases (row and counters), approvals, products, portfolios and programs update without reload after create, edit, delete, decide and escalate.

**Permissions (as QA member qamem1012c, and as owner)**
- [ ] The assigned approver can Decide; non-approvers (including the owner) cannot, in the UI and with 403 from the API.
- [ ] The member sees no milestone Edit, no editable release sheet, and no "Add ticket due date"; the API returns 403 for those writes.
- [ ] The viewer qaview1012e still sees "Access Restricted" on every /build route, with no data shown.
- [ ] Owner and admin can still do everything they could before.
- [ ] No UI text shows raw permission keys ("Missing permission: build:…") or raw field keys ("description:", "contentBase64").

**Pages and navigation**
- [ ] Ticket page, Updates page, Files page (owner and member), Calendar, Triage (Accept and Decline), Approvals, Releases, Milestones, Epics, Timeline and Reports all load.
- [ ] "Agile reports" opens /build/:id/reports; "Log time" shows only when Timesheets is enabled.
- [ ] Release Delete opens only the confirmation; deleting works; Enter never saves a hidden form.
- [ ] Invite banner "Join" claims the invite; /org-setup has Sign out.
- [ ] Relations show the correct direction on both tickets; parent and relation changes appear in HISTORY; self and descendants are not offered as parent; the cycle rule still returns 400.

**Layout**
- [ ] At 375 px: release notes editor, ticket Activity row, Statuses tab and mobile ticket sheet are correct; the Create Issue sheet, Create Cycle, New Release and Request Approval dialogs still fit.
- [ ] At 768 px: board filter bar is reachable.
- [ ] At 1280 px: no visual changes except the fixes listed.
- [ ] Long text in the sidebar and Triage stays inside its container.

**Build health**
- [ ] Type-check, lint and all existing tests pass in the frontend and the API.
- [ ] Any database migration added (for example a unique release version index) runs cleanly on existing data, or is left out and listed as a follow-up.
