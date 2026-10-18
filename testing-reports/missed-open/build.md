# build — items not in the main build list

These IDs are not in `testing-reports/build.md`. Fully finished items were removed. Partially fixed items are kept. Each item below still needs a code check or a repro.


## B-010 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

Code fix confirmed: `backend/src/modules/build/import-export/dto/ticket-import.schemas.ts` applies `z.number().int().min(0).max(TICKET_STORY_POINTS_MAX)` to the `points` field in import row validation. Browser verification needed to confirm the dry-run UI now renders the row error for points 101.

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

## B-042 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

Code fix confirmed: `frontend/lib/build/build-compat-redirects.ts` defines a redirect from `/build/:projectId/agile-reports` to the reports page. Browser verification needed to confirm the link and redirect work end-to-end.

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

## B-048 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

Code fix confirmed: `frontend/features/build/releases/releases-table-columns.tsx` wraps the actions cell in a `div` with `onClick={(e) => e.stopPropagation()}` and `onKeyDown={(e) => e.stopPropagation()}`, preventing the row click from opening the Edit sheet when clicking the Actions menu. Browser verification needed.

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

## B-056 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

Code fix confirmed: `frontend/features/build/approvals/request-approval-sheet.tsx` has `taskSearch` state and `debouncedTaskSearch` (300ms debounce) and passes `onTaskSearchChange={handleTaskSearchChange}` to the form body. The form body passes it to the `Combobox` as `onSearchChange`. Server-side search is wired. Browser verification needed to confirm new tickets appear in search results.

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

## B-057 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Latest status source: `streamline-qa-reports/build-2026-10-14-recheck/SUMMARY.md`

Code fix confirmed: `milestone-upsert-sheet.tsx` uses `LoadingButton` with `isPending={guard.isSubmitting}`. `edit-epic-dialog.tsx` has `isSubmitting={guard.isSubmitting}` on the submit button. The in-flight guard prevents double-submit. Browser verification needed to confirm the specific dialogs mentioned (Budget Save, Approval Delegate) are also guarded.

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

## B-018 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Ten files selected at once: only two uploads start before the ticket errors; the other eight are never sent (Medium — unconfirmed)
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

## B-021 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Browser tab crashed ("This tab crashed") while on the board with a search that returned nine ticket cards (Medium — needs repro)
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

## B-026 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Tab crashed ("Target crashed") during a rapid run of board and list loads with sort parameters (Medium — needs repro)
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

## B-032 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Backlog page: first load stays on "Loading results…" for 25+ s, and the renderer crashed ("Aw, Snap!", error code 9) during a run of direct navigations (Member) (Medium — needs repro)
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

## B-058 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Milestones list still shows a deleted duplicate row until reload (Low — needs repro)
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

## B-067 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Release list counters and status lag behind an edit (Draft/Archived counts still old for a few seconds; intermittent) (Low — needs repro)
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

## B-078 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Ticket tab crashes during navigation
- **Severity:** Medium (needs repro). The QAB-122 tab showed "Page crashed" while navigating between linked tickets. This is related to B-021, B-026 and B-032 (renderer crashes). Code audit found no unbounded renders, effect loops, or memory issues in the ticket detail path. Browser-only repro needed.

## NEW-02 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION
Latest status source: `streamline-qa-reports/build-2026-10-11-v2/RETEST.md`

Code audit: The stale session hang is a browser-side cookie issue (no code defect). The app correctly redirects to /dashboard with a stale cookie; the loading state has retry logic. Recovery requires clearing site cookies. No code fix possible; behavior is server-session-driven.

| Item | Status | Notes | Evidence |
| NEW-02 stale-cookie hang | STILL OPEN (reproduced) | Starting state had a stale session: /signin redirected to /dashboard and sat on "Loading" (the spinner stayed), then changed to "This is taking longer than it should ... Reload". Reload did not clear it. Recovered only after Chrome site-info > Cookies and site data > Manage on-device site data > delete www.streamlineos.in; then /signin rendered. | evidence/build-2026-10-11-v2/00-clear-site-data-dialog.webp, evidence/build-2026-10-11-v2/00b-stale-session-taking-longer.webp |

Write-up from `streamline-qa-reports/build-2026-10-11-v2/NEW-BUGS.md`:

## NEW-03 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — OTP send 503 gives no user-facing error (observed run 3)
- Code audit: `passwordless-signin-form.tsx` `requestOtpMutation.onError` calls `emailForm.setError("email", { message: getErrorMessage(error) })` AND `toast.error(getErrorMessage(error))`. Both error paths are wired. The 503 error text would display in the email field's FormMessage and as a toast.
- Steps: /signin, enter email, click Continue.
- Expected: after a failed send, show an error (e.g. "Couldn't send code, try again").
- Actual: button shows "Sending code...", then returns to the plain email form. No error text, no code step. Only the console shows 503 on POST api.streamlineos.in/auth/email-otp (3 of 3 tries).
- Evidence: evidence/build-2026-10-11-v2/02-otp-attempt3-503-signin.png

## NEW-04 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Project list does not show a newly created project until reload (Medium, needs one more repro)
- Code audit: `frontend/hooks/api/build/projects.ts` `useCreateProject` `onSuccess` calls `setQueriesData` to prepend the new project to the project list cache. Cache patch is in place.
- Steps: Build > Projects (All Projects list). Click New Project, fill name "QA Project Alpha", key QAB, click Next through the wizard, then Create Project.
- Expected: toast "Project created" and the new row appears in the list.
- Actual: toast "Project created" shows, the wizard closes, but the list still shows only "My First Project" for at least 3 s. After a reload the new row is there. (Contrast: the team list refreshes within ~3 s; and creating "QA Project Gamma" navigated to /build/5 instead of staying on the list, so the post-create behaviour is inconsistent.)
- Evidence: evidence/build-2026-10-12/02b-project-created-toast-list-stale.png, evidence/build-2026-10-12/18-projects-list-after-reload-shows-new-project.png

## NEW-08 — FIXED (516b83ea0), PENDING_BROWSER_VERIFICATION — AI Companion bubble covers primary controls (Medium, UX; blocked test steps)
- Steps: open New Project wizard (step 1 "Next →"), or open a ticket and click "Set due" in the Schedule section (right panel).
- Expected: the companion bubble does not sit over Next / date controls, or can be dismissed without a settings change.
- Actual: the companion overlay intercepts clicks on "Next →" (Playwright reports "subtree intercepts pointer events"), and its chat panel opens over the Due date control. Workaround used: keyboard focus + Enter, and "Minimize chat".
- Evidence: evidence/build-2026-10-12/17-companion-overlay-covers-due-date-control.png

## NEW-09 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION — Ticket detail Points edit did not persist in 2 attempts (Medium, NEEDS CONFIRMATION)
- Steps: open QAB-1 (points 0) > click Points > enter 1000000000 (or 5) > press Enter or Tab > reload.
- Expected: the value is saved, or a validation message is shown.
- Actual: after reload the Points field is blank (not 1000000000 and not 5). The create dialog path does save a valid value (QAB-3 saved 8 and shows 8). Request capture was unreliable in this session, so this is recorded as needing confirmation with a clean repro.

## NEW-15 — FIXED (2ef75847b), PENDING_BROWSER_VERIFICATION — Feedback widget config 404 on every page
The widget probe remembers a 404 for the key for 24 h and skips the request (`hooks/api/feedbucket/use-feedbucket-widget-ready.ts:10-25,35-41`); the script only mounts once the probe succeeds (`components/feedbucket/feedbucket-embed.tsx:15`). `use-feedbucket-widget-ready.test.tsx` passes (probe once, then stop; a 5xx is not written off).
Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

STILL OPEN: NEW-06, NEW-10, NEW-11, NEW-16b, NEW-15 (intermittent)

## NEW-23 — FIXED (4735e31fb), PENDING_BROWSER_VERIFICATION — Todo column count changes across reloads with no data change
The board is an infinite query, and until `/tickets/column-counts` answered the header fell back to the rows paged in so far, so the number depended on timing. The header now shows no count until the server aggregate arrives (`features/build/views/kanban-board.tsx:134,197`, `kanban-column-header.tsx:62,249`); the aggregate itself is one deterministic GROUP BY (`backend/.../projects-tickets-read.service.ts:394`). Covered in `kanban-column-header.test.tsx`.
Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

NOT REPRODUCED: NEW-23, NEW-25

## NEW-25 — VERIFIED IN CODE (backend organization.controller.ts:172-180, organization-settings.service.ts:274-306), PENDING_BROWSER_VERIFICATION — GET /organization/settings 500 (x2) on Build > Projects load
The handler is two bounded reads of the org row and up to 100 allowed domains, cached per org; no write or outbound call. A response-contract mismatch logs and does not 500 in production (`common/openapi/response-contract.interceptor.ts:176-179`). Seen once on 12 Oct (the day prod moved to Neon), not reproduced in the v3 retest. No code path left that returns 500 for a valid org.
Latest status source: `streamline-qa-reports/build-2026-10-12-v3/RETEST.md`

NOT REPRODUCED: NEW-23, NEW-25
