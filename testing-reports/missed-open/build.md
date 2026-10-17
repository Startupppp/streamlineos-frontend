# build — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## B-007 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-007 | FAIL | Project settings (/build/7/settings), owner: Project Name set to three spaces and Save Changes clicked. After reload the Project Name field was empty (saved as a blank name). Restored to "QA Project Alpha" (verified exact on reload). The save toast was not captured because the tab crashed twice during the test (memory). |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-010 — partial

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-010 | PARTIAL | Issues > Import / Export > Import with rc1014-import-points.csv (rows: points 101 and 100). Dry run POST /build/7/import-export/tickets/preview returned 200, but the dialog never rendered the dry-run summary or row errors (Import stayed disabled). A one-row file with points 100 also rendered no result, so the points-101 rule could not be checked. Nothing imported; no records created. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-017 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-017 | FAIL | retest (owner): 0-byte fixtures/empty-0byte-0913.pdf set on the Activity file input of QAB-135, wait 6 s: no request sent and no "is empty" message shown. Still silent. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-018 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-021 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-026 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-028 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-028 | FAIL | retest (owner): keyboard move of "RC1014 attach types" (QAB-135) Todo to In progress, PATCH rank 200. Counts stayed stale right after the move (Todo 1, In progress 1, card already in In progress). After reload Todo 0, In progress 2. Still stale until reload. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-032 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-036 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-036 | FAIL | retest (owner): /build/7/issues?priority=URGENT, sidebar Overview then sidebar Issues: URL is /build/7/issues with no query, so the Priority filter is dropped. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-042 — partial

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-042 | PARTIAL | /build/7/agile-reports now redirects to /build/7/reports, which shows the Agile Reports content (no 404). The "Agile reports" link on the project was not found in More tools, so the link click itself was not confirmed. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-048 — partial

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-048 | PARTIAL | Owner, /build/7/releases, "RC1014 release dbl": Actions > Delete opened only the "Delete release?" alert (no Edit Release dialog seen). Clicking its Delete removed the release (confirmed after reload; RC1014 release dbl is now deleted). The list still showed the deleted row until reload (stale list, see G5). The DELETE request was not captured. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-056 — partial

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-056 | PARTIAL | Owner, Approvals > Request approval > Task (Request Approval dialog): the "Search tasks…" picker opens with a default list of 50 tickets (QAB-3, QAB-1, QAB-2, QAB-4 ...). Typing QAB-135 into the picker did not filter the list (no matching option, no "No items found"), so the search for new tickets could not be confirmed. No approval was submitted; the dialog was cancelled. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-057 — partial

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-057 | PARTIAL | Epic edit (owner, "RC1014 epic dbl"): double-click on Save changes sent one PATCH (200) and the dialog closed. Save/Delegate on the ticket-level dialogs (the Delegate path in the B-057 report) not tested. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-058 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-061 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-061 | FAIL | Owner, /build/7/approvals: the row "R11 milestone approval 1013 run3" (approver qamem1012c, status Escalated) has a Decide item in the owner row menu (Decide, Delegate, Cancel, Delete) even though the owner is not the approver. Decision not submitted (to avoid changing the member approval). Server 403 not tested. Confirm-intended item: UI still offers Decide to a non-approver. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-067 — intermittent

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

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

## B-076 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| B-076 | FAIL | retest: after the member's Decide (Approve) on "R11 milestone approval 1013 run3", the approvals row still read "Escalated" until a reload, then "Approved". |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## B-078 — still open

Latest status source: `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-13/BUILD-BUGS.md`:

## B-078 — Ticket tab crashes during navigation
- **Severity:** Medium (needs repro). The QAB-122 tab showed "Page crashed" while navigating between linked tickets. This is related to B-021, B-026 and B-032 (renderer crashes).

## NEW-02 — still open

Latest status source: `streamline-qa-reports/build-2026-10-11-v2/RETEST.md`

| Item | Status | Notes | Evidence |
| NEW-02 stale-cookie hang | STILL OPEN (reproduced) | Starting state had a stale session: /signin redirected to /dashboard and sat on "Loading" (the spinner stayed), then changed to "This is taking longer than it should ... Reload". Reload did not clear it. Recovered only after Chrome site-info > Cookies and site data > Manage on-device site data > delete www.streamlineos.in; then /signin rendered. | evidence/build-2026-10-11-v2/00-clear-site-data-dialog.webp, evidence/build-2026-10-11-v2/00b-stale-session-taking-longer.webp |

Write-up from `streamline-qa-reports/build-2026-10-11-v2/NEW-BUGS.md`:

## NEW-02 (reproduced, see RETEST.md) — stale session hangs /signin and /dashboard
- Steps: have an old session cookie for www.streamlineos.in, open /signin.
- Actual: redirected to /dashboard, stuck on "Loading"; then "This is taking longer than it should" with Reload that does not clear it. Only clearing site data for the site recovers.
- Evidence: evidence/build-2026-10-11-v2/00b-stale-session-taking-longer.webp

## NEW-03 — still open

Latest status source: `streamline-qa-reports/build-2026-10-11-v2/NEW-BUGS.md`

| Item | Status | Notes | Evidence |
| NEW-03 OTP send error returns to email step with no message | COULD NOT TEST | No 503/429 was returned, so the error path was not exercised. | - |

Write-up from `streamline-qa-reports/build-2026-10-11-v2/NEW-BUGS.md`:

## NEW-03 — OTP send 503 gives no user-facing error (observed run 3)
- Steps: /signin, enter email, click Continue.
- Expected: after a failed send, show an error (e.g. "Couldn't send code, try again").
- Actual: button shows "Sending code...", then returns to the plain email form. No error text, no code step. Only the console shows 503 on POST api.streamlineos.in/auth/email-otp (3 of 3 tries).
- Evidence: evidence/build-2026-10-11-v2/02-otp-attempt3-503-signin.png

## NEW-04 — still open

Latest status source: `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`:

## NEW-04 — Project list does not show a newly created project until reload (Medium, needs one more repro)
- Steps: Build > Projects (All Projects list). Click New Project, fill name "QA Project Alpha", key QAB, click Next through the wizard, then Create Project.
- Expected: toast "Project created" and the new row appears in the list.
- Actual: toast "Project created" shows, the wizard closes, but the list still shows only "My First Project" for at least 3 s. After a reload the new row is there. (Contrast: the team list refreshes within ~3 s; and creating "QA Project Gamma" navigated to /build/5 instead of staying on the list, so the post-create behaviour is inconsistent.)
- Evidence: evidence/build-2026-10-12/02b-project-created-toast-list-stale.png, evidence/build-2026-10-12/18-projects-list-after-reload-shows-new-project.png

## NEW-08 — blocked, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`:

## NEW-08 — AI Companion bubble covers primary controls (Medium, UX; blocked test steps)
- Steps: open New Project wizard (step 1 "Next →"), or open a ticket and click "Set due" in the Schedule section (right panel).
- Expected: the companion bubble does not sit over Next / date controls, or can be dismissed without a settings change.
- Actual: the companion overlay intercepts clicks on "Next →" (Playwright reports "subtree intercepts pointer events"), and its chat panel opens over the Due date control. Workaround used: keyboard focus + Enter, and "Minimize chat".
- Evidence: evidence/build-2026-10-12/17-companion-overlay-covers-due-date-control.png

## NEW-09 — still open

Latest status source: `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`

Write-up from `streamline-qa-reports/build-2026-10-12/NEW-BUGS.md`:

## NEW-09 — Ticket detail Points edit did not persist in 2 attempts (Medium, NEEDS CONFIRMATION)
- Steps: open QAB-1 (points 0) > click Points > enter 1000000000 (or 5) > press Enter or Tab > reload.
- Expected: the value is saved, or a validation message is shown.
- Actual: after reload the Points field is blank (not 1000000000 and not 5). The create dialog path does save a valid value (QAB-3 saved 8 and shows 8). Request capture was unreliable in this session, so this is recorded as needing confirmation with a clean repro.

## NEW-15 — still open

Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

STILL OPEN: NEW-06, NEW-10, NEW-11, NEW-16b, NEW-15 (intermittent)

## NEW-23 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

NOT REPRODUCED: NEW-23, NEW-25

## NEW-25 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

NOT REPRODUCED: NEW-23, NEW-25

## NEW-26 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| NEW-26 | FAIL | retest (owner): Name "A" + Next shows "Name must be at least 2 characters". Name changed to "QA Name OK" and Tab: the same error is still visible. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## NEW-27 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

| ID | Status | Recheck note (latest) |
| NEW-27 | FAIL | retest (owner): fixtures/qa-test.exe set on the image-only file input (accept image/jpeg,png,gif,webp) of QAB-135. No request sent and no "not an allowed file type" message appeared within 6 s. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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

## NEW-R1 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/NEW-BUGS.md`

| ID | Severity | Where | Observed | Steps / evidence |
| NEW-R1 | Low | /build/7/milestones, Actions menu (member qamem1012c) | The Actions menu opens empty for a member: no Edit, no Delete, no message. This is the B-085 fix (Edit hidden), but it leaves an empty menu. | Open "Actions for RC1014 milestone edit" as the member: menu has no items. |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

## NEW-R1: The Actions menu opens empty for a member: no Edit, no Delete, no message. This …
**Severity:** Low
**Recheck 14 Oct observed:** NEW — The Actions menu opens empty for a member: no Edit, no Delete, no message. This is the B-085 fix (Edit hidden), but it leaves an empty menu.

**Where:** /build/7/milestones, Actions menu (member qamem1012c)

**Steps / evidence:** Open "Actions for RC1014 milestone edit" as the member: menu has no items.

**Required fix:** Address the observed behavior so the UI matches the intended product behavior; keep related fixes (for example B-085 empty menu, B-076 stale status, B-028 stale counts) consistent.

**Acceptance:** The issue described under Observed no longer occurs; no regression to related PASS items.

## NEW-R4 — still open

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`

| ID | Result on round 1 | Where checked |
| NEW-R4 (keyboard move leaves counts stale, owner) | REPRODUCED on project 21: Todo 4 / In progress 1 stay after the move until reload (BLD-B-049) | /build/21/issues |

Write-up from `streamline-qa-reports/build-2026-10-14-recheck/STILL-OPEN-CLAUDE-BRIEF.md`:

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
