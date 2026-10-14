# Claude Code fix brief: StreamlineOS Build module (QA run build-2026-10-13)

Paste this whole file into Claude Code at the root of the StreamlineOS repository.

## 1. Role and instructions

You are fixing confirmed bugs in the **Build** module of StreamlineOS. The frontend is a Next.js app served at https://www.streamlineos.in. The API is served at https://api.streamlineos.in (probably NestJS). You have the repository. This brief does not give file paths, because they were not known when it was written. Find code with the search hints given (routes such as `/build/:id/tickets`, endpoints such as `PATCH /build/:projectId/tickets/:id/rank` or `GET /storage/download`, and the exact UI strings in quotes). Use `rg` for the exact strings first.

The bug list below is final. Fix only these bugs. Do not fix, refactor or restyle anything else, even if you notice it.

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
6. **"Confirm intended" items** (B-061, B-063, B-069, B-073, and the permission policy part of B-084): implement the recommended behavior described in each section, and list these items separately in your final summary as "Policy decisions to confirm", with one sentence on what you chose.
7. **No secrets.** Do not put passwords, tokens, invite tokens or keys in code, tests, fixtures, logs or your summary. QA account emails/usernames named below are for reference only.
8. If you cannot reproduce or fix a bug with a reasonable change, stop on that bug, write what you found, and continue with the next one. Do not guess at large rewrites.
9. **Final output:** end with a table with one row per bug ID in this file:

   | ID | Fixed (yes / partial / no) | Files changed | How verified (test name, manual steps, or reason not verified) |
   |---|---|---|---|

   After the table add: "Policy decisions to confirm" (the confirm-intended items), "Follow-ups" (anything you deliberately left out), and the commands you ran with their results.

**Test context.** QA project: id 7, key QAB, name "QA Project Alpha", org "QA Build Org 1012b". QA accounts: owner qaown1012b@sharklasers.com (Owner), member qamem1012c (Member with Build Member on project 7), org admin and Build admin qaadm1012d, viewer qaview1012e (no Build access). Ticket keys (QAB-84 and so on) and internal ids (95 and so on) quoted below come from the QA run; most of those test records were deleted afterwards, so create your own local data. File paths under /workspace/streamline-qa/fixtures/ are the QA machine's test files; use any equivalent small files.


---

# 2. Shared root causes

Fix each group's root cause once. The bug sections in part 3 refer back to these groups. A bug may appear in more than one group.

## G1 Submit in-flight guard
- **IDs:** B-001, B-014, B-015, B-043, B-044, B-045, B-003, B-019, B-057
- **Root cause:** Submit buttons have no synchronous in-flight guard, so a double-click sends two requests.
- **Fix once:** Build one reusable guard (hook/helper: set a ref on the first call, disable the button, ignore calls until the promise settles, re-enable on error). Apply it to every create/save/post/delegate button listed. Optionally send an idempotency key per dialog session if the API can honour it cheaply.

## G2 Attachment storage/download signing
- **IDs:** B-013, B-016, B-024
- **Root cause:** `GET /storage/download?key=...` returns 500 for Build file keys (`<org>/build/<projectId>/files/<uuid>-<name>`), and the ticket page treats one failed attachment signed URL as a fatal page error. Storage upload also lacks permission and input checks.
- **Fix once:** Fix the server signing/download path once (B-013) and make attachment loading non-fatal per item; then verify every file type and the open/download click.

## G3 Board rank/move endpoint and board state
- **IDs:** B-027, B-037, B-028
- **Root cause:** The rank endpoint `PATCH /build/:projectId/tickets/:id/rank` returns 409 "Board order changed; refresh and retry" whenever there is no valid neighbour (empty column) or the move is inside one column; the board does not apply successful moves locally.
- **Fix once:** Fix the rank calculation on the server (empty column and same-column cases), then make the client apply the 200 payload and refetch on 409.

## G4 Shared field validation (client AND server)
- **IDs:** B-007, B-074, B-010, B-046, B-049, B-066, B-002, NEW-06, B-050, B-051, B-053, B-077
- **Root cause:** Fields are validated differently on the client and the server (or only on one side), without trimming, and with different limits per entry point.
- **Fix once:** Define each rule once (trim, required, min/max, format) and use it in the client form and the server DTO. Server returns 400 with a field error.

## G5 Query invalidation after mutations
- **IDs:** B-028, B-048, B-062, B-075, B-076
- **Root cause:** Mutations succeed, but the list/card queries that show the record are not invalidated or updated, so the UI is stale until reload.
- **Fix once:** After every create, update, delete, move or decision, invalidate (or update from the response) every list query that shows that record.

## G6 Permission checks: UI must match server
- **IDs:** B-084, B-031, B-033, B-061, B-085
- **Root cause:** The UI shows controls by one permission while the server (or the client save handler) checks another, or the server checks too little.
- **Fix once:** For each action, use one permission rule: the server enforces it (403), and the UI shows the control only when that rule passes. Never show raw permission keys.

## G7 List/board query options (sort, columns, sub-issues, filters)
- **IDs:** B-025, B-034, B-035, B-036, B-081
- **Root cause:** Display options (Ordering, Columns, Sub-issues) and filters are written to the URL but not applied to the query or the rendering, or are lost on navigation.
- **Fix once:** Pass each option to the tickets query and apply it server-side (sorting both directions, sub-issue filter) or in the board grouping; keep URL, controls and data in sync.

## G8 Server errors mapped to visible, plain-language messages
- **IDs:** B-039, B-005, B-022, B-033, B-046, B-047, B-049, B-066, B-017, NEW-27, B-050, B-054, B-072
- **Root cause:** Server errors are swallowed (no message), shown as raw schema/field keys, or bubble up to a page-level error boundary that unmounts the page.
- **Fix once:** Map 400/403/409 responses to short messages next to the field or in the dialog; add item-level error boundaries where one bad record can break a page.

## G9 Narrow-viewport layout (375/768 px) and long text
- **IDs:** B-029, B-059, B-060, B-040, B-041, B-083
- **Root cause:** Fixed widths, non-wrapping flex rows and missing `min-width:0` cause overflow at 375/768 px and with long unbroken text.
- **Fix once:** Use wrapping, `min-width:0`, `max-width:100%`, `overflow-wrap:anywhere` and truncation with tooltips. Do not change desktop layouts beyond the fix.

## G10 Ticket relations, parents and history
- **IDs:** B-070, B-071, B-072, B-073, B-079, B-082
- **Root cause:** Relation direction is not inverted for the target ticket, parent/relation changes are not written to history, and pickers/dialogs ignore the tree structure.
- **Fix once:** Invert directional relation types on read, write history for parent and relation changes, and use the parent/child tree in pickers and the delete confirmation.

## G11 Navigation, routes and dead links
- **IDs:** B-011, B-042, B-009
- **Root cause:** Links and view buttons point to wrong or disabled routes.
- **Fix once:** Point links at the correct routes, add a redirect for the old route, and hide links to disabled modules.

## Stand-alone bugs (no shared cause)
- **IDs:** B-065, B-004, B-008, B-022, B-030, B-047, B-048, B-056, B-006, B-012, B-020, B-023, NEW-10, NEW-11, NEW-26, B-038, B-052, B-055, B-063, B-064, B-068, B-069, B-080

## Confirm-intended items
- **IDs:** B-061, B-063, B-069, B-073, B-084 (permission policy). Implement the recommended behavior and list them under "Policy decisions to confirm".

---

# 3. Bugs, in severity order

Each section gives: where, steps, expected, actual (from the QA run), likely cause, required fix and acceptance criteria. The "likely cause" is an informed guess from the observed behavior; confirm it in the code before changing anything.

---

# Critical

## B-013: Attaching any image (PNG) breaks the whole ticket page ("Ticket Error / Failed to load ticket details.")
**Severity:** Critical
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G2 Attachment storage/download signing

**Where:** Ticket attachments — https://www.streamlineos.in/build/7/tickets/QAB-84 (Attach files to ticket, then reload) | Role/account: Owner qaown1012b (Owner). Viewer/Member who can attach would hit the same path.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. In the Activity composer use "Attach files to ticket" (the input with no accept attribute) and choose `/workspace/streamline-qa/fixtures/valid-image-0913.png` (64×64 PNG, 8.6 KB).
3. Wait for the upload. The network shows `POST https://api.streamlineos.in/build/7/files` → **201** and `POST https://api.streamlineos.in/build/7/tickets/95/attachments` → **201**. A toast/message "Failed to load ticket details." appears.
4. Reload https://www.streamlineos.in/build/7/tickets/QAB-84.

**Expected:** The ticket page loads; the new attachment appears in the "Attachments" section (thumbnail or file name). If a single attachment cannot be signed, only that item shows an error.

**Actual:** Page shows heading "Ticket Error", paragraph "Failed to load ticket details.", button "Try Again". Network: `GET https://api.streamlineos.in/storage/download?key=<orgId>…%2Fbuild%2F7%2Ffiles%2Fae98f907-72d1-4cbd-968f-fe8228e7d111-valid-image-0913.png` → **HTTP 500**. Console: `Error: ["authenticated:…", ["streamlineos","attachments","signed-url","…/build/7/files/ae98f907-…-valid-image-0913.png"]] data is undefined` (signed-url fetch returned no data), `Failed to load resource: the server responded with a status of 500`. The Attachments section listed nothing before the error. Before the upload the same ticket loaded normally.

**Likely cause:** The `GET /storage/download?key=...` handler returns 500 for keys shaped `<org>/build/<projectId>/files/<uuid>-<name>.<ext>` (console: the signed-url query reports "data is undefined", so the storage client returned no payload). Separately, the ticket page treats one failed attachment signed-URL query (query key `["streamlineos","attachments","signed-url", ...]`) as a fatal error for the whole page.

**Required fix:** (1) Server: fix the storage download/signed-URL path for Build file keys so it returns 200 with a signed URL (or streams the file) for every key that `POST /build/:projectId/files` produced. Check that the key stored on the attachment row matches the key used to sign, including URL encoding of `/`. (2) Client: make the attachment thumbnail/signed-URL fetch non-fatal: on failure render a per-item placeholder "Couldn't load attachment" with a retry, and never unmount the ticket page. (3) Return 404 (not 500) when the object does not exist. Search hints: `storage/download`, `signed-url`, "Failed to load ticket details.", "Ticket Error", `attachments`, the storage controller/service in the API.

**Acceptance criteria:**
- Attach a valid PNG to a ticket: `POST /build/7/files` 201, `POST /build/7/tickets/:id/attachments` 201, then the ticket page stays loaded and the image appears under ATTACHMENTS (thumbnail or name).
- Reloading that ticket loads normally; `GET /storage/download?key=...` for the image returns 200 (or a redirect to a working signed URL).
- If signing one attachment fails (simulate by forcing the endpoint to error), only that item shows "Couldn't load attachment"; title, details, comments, history and Delete remain usable.
- The download endpoint returns 404 with a JSON error for a missing key, never 500.
- An API test covers signing a key of the form `<org>/build/<projectId>/files/<uuid>-<name>.png`.

## B-016: JPEG, GIF and WebP attachments also break the ticket page (B-013 is not PNG-only)
**Severity:** Critical
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G2 Attachment storage/download signing

**Where:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-88 (and QAB-89, QAB-90, QAB-91): "Attach files to ticket" (file input with no accept attribute) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?create=1. Title `R2 attach JPEG 0913` → "Create issue" → QAB-88 created (POST /build/7/tickets → 201).
2. Open https://www.streamlineos.in/build/7/tickets/QAB-88. Set the second file input (no accept) to /workspace/streamline-qa/fixtures/valid-image-0913.jpg (64×64 JPEG, 1.9 KB).
3. Wait up to 8 s. Repeat steps 1–3 for GIF (QAB-89, valid-image-0913.gif), WebP (QAB-90, valid-image-0913.webp) and PDF (QAB-91, valid-doc-0913.pdf).

**Expected:** The file appears under ATTACHMENTS for every type; the ticket page stays usable.

**Actual:** - JPEG (QAB-88): `POST /build/7/files → 201`, `POST /build/7/tickets/99/attachments → 201`, `GET /storage/download?key=…valid-image-0913.jpg → 500`; page shows heading "Ticket Error" and "Failed to load ticket details.".
- GIF (QAB-89): same sequence; storage/download → 500; "Ticket Error".
- WebP (QAB-90): same sequence; storage/download → 500; "Ticket Error".
- PDF (QAB-91): `POST /build/7/files → 201`, `POST …/attachments → 201`; no storage 500; page stays; ATTACHMENTS lists "valid-doc-0913.pdf".

**Likely cause:** Same defect as B-013: the storage signed-URL/download path fails (500) for these keys, and the page treats the failure as fatal. Images are probably fetched eagerly for thumbnails, which is why they broke the page on load while PDFs (round 2) did not.

**Required fix:** Covered by the B-013 fix. Verify with every allowed image type and make sure there is no content-type or extension branch in the storage code that handles some types differently.

**Acceptance criteria:**
- Attaching a valid JPEG, GIF and WebP each leaves the ticket page loaded and lists the file under ATTACHMENTS, with no `storage/download` 500.
- Reload of each ticket works.
- A test (API or unit) iterates over png, jpg, gif, webp and pdf keys and asserts signing succeeds.

---

# High

## B-024: PDF attachments cannot be opened or downloaded (`storage/download` 500; single click is inert)
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G2 Attachment storage/download signing

**Where:** Ticket Attachments list — https://www.streamlineos.in/build/7/tickets/QAB-97 (ATTACHMENTS, items shown as buttons named `multi-pdf-NN-0913.pdf`) | Role/account: Owner qaown1012b (Owner). Ticket QAB-97 "R3 PDF attach 10 files 1013" with 10 PDFs attached (see B-018 retest).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-97 and reload it.
2. Single-click the attachment button `multi-pdf-01-0913.pdf` (and `multi-pdf-05-0913.pdf`); watch for a preview dialog, a new tab, or a download.
3. Double-click `multi-pdf-06-0913.pdf`; watch the network and console.
4. Read the console errors after the reloads.

**Expected:** Clicking an attachment opens a preview (or a download starts). The file is served from a valid signed URL, and a failure shows a per-item message.

**Actual:** Step 2: no preview, no new tab, no download, no request (inert). Step 3: `GET https://api.streamlineos.in/storage/download?key=<orgId>…%2Fbuild%2F7%2Ffiles%2F<uuid>-multi-pdf-06-0913.pdf` → **500** (twice for the double-click). Console: `Failed to load resource: the server responded with a status of 500` for multi-pdf-01, -02, -04, -05 and -06 on the reloads too. The ticket page itself still renders, and the 10 PDF rows stay listed. Note: round 2 recorded PDF signing as OK (QAB-91); the PDF signed-URL path now fails the same way B-013/B-016 failed for images.

**Likely cause:** Same storage signing/download defect as B-013 (now also failing for PDFs). Also, the attachment list item has no single-click handler (the click is inert) and double-click triggers the download fetch twice.

**Required fix:** After the B-013 server fix, wire a single click on an attachment item to open a preview (or open the signed URL in a new tab / start the download). Guard against duplicate requests on double-click. On failure show "Couldn't open attachment" on that item.

**Acceptance criteria:**
- Single-clicking a PDF attachment opens a preview or starts a download; `GET /storage/download?key=...` returns 200.
- Double-click sends at most one download request (or opens once).
- Reloading a ticket with 10 PDFs shows all 10 with no 500 in the console.
- If the download fails, a visible per-item message appears; the page stays usable.

## B-001: Double-click on "Create issue" creates duplicate tickets
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Create Issue dialog — https://www.streamlineos.in/build/7/issues?create=1 (Board view, QA Project Alpha) | Role/account: Owner qaown1012b (Owner role). Any role with create rights reproduces (Org Admin/Build Admin qaadm1012d too).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?create=1.
2. In "Issue title" type `DBLCLICK-0913 double submit`.
3. Double-click the "Create issue" button (one physical double-click).
4. Observe network and then search `DBLCLICK` on /build/7/issues?q=DBLCLICK.

**Expected:** Exactly one ticket is created. The button is disabled while the request is in flight (or the second click is ignored).

**Actual:** Two `POST https://api.streamlineos.in/build/7/tickets` requests, both `201`. Two tickets created: **QAB-83** and **QAB-84**, both titled "DBLCLICK-0913 double submit", both Todo/Medium/Task. The dialog closes after the first response; no duplicate warning.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create issue" (and pressing Enter twice quickly) sends exactly one `POST /build/7/tickets` request and creates exactly one record.
- "Create issue" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-014: Double-click on "Create Portfolio" creates two portfolios
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Portfolios — https://www.streamlineos.in/build/portfolios → "New portfolio" → dialog "New Portfolio" → "Create Portfolio" | Role/account: Owner qaown1012b (Owner). Admin/Member not tested.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/portfolios (list shows "No portfolios yet").
2. Click "New portfolio" (Portfolios region). Name: `R2 DBL portfolio 0913`. Leave other fields default.
3. Double-click "Create Portfolio".
4. Wait for the dialog to close; read the Portfolios list.

**Expected:** Exactly one portfolio; the button is disabled while the request is in flight.

**Actual:** Two `POST https://api.streamlineos.in/build/portfolios` requests, both `201`. The Portfolios list shows the name twice. Dialog closes after the first response; no duplicate warning.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create Portfolio" (and pressing Enter twice quickly) sends exactly one `POST /build/portfolios` request and creates exactly one record.
- "Create Portfolio" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-015: Double-click on "Create Program" creates two programs
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Programs — https://www.streamlineos.in/build/programs → "New program" → dialog → "Create Program" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/programs (list shows "No programs yet").
2. Click "New program". Name: `R2 DBL program 0913`.
3. Double-click "Create Program".
4. Read the Programs list after the dialog closes.

**Expected:** One program; button disabled in flight.

**Actual:** Two `POST https://api.streamlineos.in/build/programs` → `201` each. The list shows "R2 DBL program 0913" twice.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create Program" (and pressing Enter twice quickly) sends exactly one `POST /build/programs` request and creates exactly one record.
- "Create Program" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-043: Double-click on "Create epic" creates two epics
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Epics — https://www.streamlineos.in/build/7/epics → "Create Epic" → dialog "Create new epic" → "Create epic" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/epics (Epics count 9).
2. Click "Create Epic". Epic title: `R5 epic 1013`. Leave Priority = Medium.
3. Double-click "Create epic".
4. Read the Epics count and search `R5 epic` on /build/7/issues?view=table&q=R5%20epic.

**Expected:** One epic is created; the button is disabled while the request is in flight.

**Actual:** Two `POST https://api.streamlineos.in/build/7/tickets` requests, both `201`. Tickets QAB-111 and QAB-112 both titled "R5 epic 1013" (To Do / Medium). Epics count 9 → 11.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create epic" (and pressing Enter twice quickly) sends exactly one `POST /build/7/tickets` request and creates exactly one record.
- "Create epic" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-044: Double-click on "Create Milestone" creates two milestones
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Milestones — https://www.streamlineos.in/build/7/milestones → "New Milestone" → dialog "New Milestone" → "Create Milestone" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/milestones (list empty: "No milestones yet").
2. Click "New Milestone". Name `R5 milestone 1013`; Target Date: Oct 30, 2026 (picker); Status Pending.
3. Double-click "Create Milestone". Read the list.

**Expected:** One milestone; button disabled in flight.

**Actual:** Two `POST https://api.streamlineos.in/build/7/milestones` requests. The list shows "R5 milestone 1013 Pending Oct 30, 2026" twice ("2 Pending").

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create Milestone" (and pressing Enter twice quickly) sends exactly one `POST /build/7/milestones` request and creates exactly one record.
- "Create Milestone" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-045: Double-click on "Create Release" creates two releases
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Releases — https://www.streamlineos.in/build/7/releases → "New Release" → dialog "New Release" → "Create Release" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open /build/7/releases. Click "New Release". Name `R5 release dbl 1013`; Version `2.0.0-beta`.
2. Double-click "Create Release". Read the list.

**Expected:** One release; button disabled in flight.

**Actual:** Two `POST https://api.streamlineos.in/build/7/releases` requests. Two rows "R5 release dbl 1013 2.0.0-beta Draft".

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST.

**Required fix:** Apply the shared G1 in-flight guard to this dialog. Set the guard synchronously on the first click (a ref, not only React state), disable the button, and ignore further submits until the request settles. If the API supports or can cheaply support an idempotency key (header generated once per dialog session), send it, and make the server return the original record for a repeated key.

**Acceptance criteria:**
- Double-clicking "Create Release" (and pressing Enter twice quickly) sends exactly one `POST /build/7/releases` request and creates exactly one record.
- "Create Release" is disabled and shows a pending state from the first click until the response arrives; it re-enables if the request fails, and the dialog keeps the typed values on failure.
- The guard uses the shared submit-guard mechanism from G1, not a one-off fix.
- A test (unit or component) proves that two rapid submits produce one request.

## B-027: Dragging a card into an empty column returns 409 "Board order changed; refresh and retry"
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G3 Board rank/move endpoint and board state

**Where:** Board drag-and-drop — https://www.streamlineos.in/build/7/issues?q=crash (search with 9 probe cards; columns Todo / In progress / In review / Done) | Role/account: Owner qaown1012b (Owner). Board state: Todo 6, In progress 3, In review 0, Done 0. Cards QAB-101 and QAB-104 are in Todo.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash and reload (fresh state).
2. Keyboard: focus the card "R3 crash probe 5 1013" (QAB-102), press Space, ArrowRight ×2 (to "In review"), Space.
3. Real mouse (Playwright mouse API, press → 25 steps → release): drag "R3 crash probe 4 1013" (QAB-101) from Todo to the empty "In review" column; repeat after another reload.
4. Read the network PATCH and the board counts.

**Expected:** The card moves to In review; `PATCH …/tickets/<id>/rank` → 200; counts update.

**Actual:** Step 2 and step 3 (×2): `PATCH https://api.streamlineos.in/build/7/tickets/112/rank` (and 113) → **409** `{"code":"CONFLICT","message":"Board order changed; refresh and retry"}`. The toast "Board order changed; refresh and retry" appears; the card stays in Todo. The same 409 was returned when the probe card was dropped into the empty "In progress" column earlier (first attempt). Moves into a non-empty column (In progress, which had 2–3 cards) returned 200 (see B-028).

**Likely cause:** The rank endpoint `PATCH /build/:projectId/tickets/:id/rank` computes the new rank from neighbour cards (before/after IDs or ranks). When the target column is empty there is no neighbour, and the server (or the client payload) treats the missing neighbour as a stale board and returns 409 CONFLICT.

**Required fix:** Server: when the target column has no tickets (no before/after neighbour), assign a default rank for that column and update the status; return 200 with `{id, status, rank, version}`. Only return 409 when the supplied neighbours or version really are stale, and include the card's current column/rank in the 409 body. Client: send an explicit "empty column" payload (null neighbours) rather than a made-up neighbour. Search hints: `rank`, "Board order changed; refresh and retry", `CONFLICT`, the board drag-and-drop component.

**Acceptance criteria:**
- Dragging (mouse) or keyboard-moving (Space, Arrow, Space) a card into an empty column sends one `PATCH /build/7/tickets/:id/rank` that returns 200, and the card shows in the new column without reload.
- After reload the card is still in the new column with the new status.
- A real stale-version move still returns 409 and the client refetches the board (see B-028).
- An API test covers a move into an empty column.

## B-037: Reordering a card within the same column returns 409 and the card snaps back
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G3 Board rank/move endpoint and board state

**Where:** https://www.streamlineos.in/build/7/issues?q=crash (Board, Todo column, Ordering = Manual) | Role/account: Owner qaown1012b (Owner). Todo has 4 cards (QAB-103, 104, 105, 106).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?q=crash.
2. Real mouse (Playwright mouse: move to card, down, 25–30 small moves, up): drag "R3 crash probe 9 1013" (QAB-106) to the top of Todo above "R3 crash probe 6 1013" (QAB-103). Repeat with the drop placed on the lower half of QAB-104. Repeat once more with the Computer tool drag (see note).
3. Watch network for PATCH `…/tickets/<id>/rank`; read Todo order immediately, then after reload.

**Expected:** The card moves above QAB-103 (PATCH `…/rank` → 200) and the new order remains after reload.

**Actual:** The Todo order is unchanged immediately and after reload (QAB-103, 104, 105, 106) in all attempts. DevTools console (device mode, later in the run) showed a `…/tickets/<id>/rank` request → **HTTP 409** after one of the in-column drops, so the drop reaches the server and is rejected with a conflict, and the card snaps back with no message. My request listener did not capture the call, so the exact PATCH count is not confirmed. Computer-tool drags on the same cards also changed nothing (3 attempts; order unchanged after reload).

**Likely cause:** Same rank computation as B-027: for an in-column move the neighbour/version check is wrong (for example, the moved card itself is used as a neighbour, or the pre-move rank/version is compared), so every in-column move fails with 409 CONFLICT "Board order changed; refresh and retry".

**Required fix:** Fix the rank calculation for same-column moves: exclude the moving card when resolving neighbours, compute a rank strictly between the new neighbours, and accept the move when the neighbours are consistent. Make the whole card a drag surface (not only the title text) if that is a small change in the drag component; do not redesign the board.

**Acceptance criteria:**
- Dragging a card above another card in the same column (Manual ordering) sends `PATCH .../rank` that returns 200; the new order shows at once and remains after reload.
- Keyboard move up one slot (Space, ArrowUp, Space) returns 200 and persists.
- Moves to the top, middle and bottom of a column all work.
- An API test covers in-column moves to top, middle and bottom.

## B-039: Posting one project update breaks the Updates page
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** https://www.streamlineos.in/build/7/updates. Role: Owner (QA account qaown1012b).

**Steps to reproduce:**
1. Open /build/7/updates.
2. Post an update with the text "R4 update 1013 — status probe".
3. Look at the page.
4. Reload.

**Expected:** The update appears in the list and still loads after a reload.

**Actual:** The create POST returns 201, then the page shows "Something went wrong". After reload the page shows "Failed to load project updates". No delete control is offered, so the project's Updates page stays broken.

**Retest notes:** Still reproduces in round 8.

**Likely cause:** The updates list (server serializer for GET, or the client list item) crashes on the newly created record: likely a null or unexpected field (author, health/status enum, date, rich-text body).

**Required fix:** Post an update locally and read the server log and the browser console to find the failing piece. Fix the serializer or renderer to handle the record's shape (null-safe fields, correct enum mapping). Add an error boundary around each update item so one bad record cannot break the page. Search hints: "Failed to load project updates", the `updates` controller/route, the project updates list component.

**Acceptance criteria:**
- Posting an update shows it in the list at once; reload still shows it, and the GET for the updates list returns 200.
- Posting several updates (with and without optional fields) keeps the page working.
- If one update cannot render, only that item shows an error; the rest of the list and the composer stay usable.
- An API test creates an update and then lists updates successfully.

## B-065: Release "Readiness" and "Risk Level" are not saved on create or edit
**Severity:** High
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Releases → "New Release" (https://www.streamlineos.in/build/7/releases) and release "Edit" → Readiness / Risk Level → "Create Release" / "Save Changes" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Click "New Release". Name "R6 release 1013", Version "6.0.1013", Readiness "Blocked", Risk Level "High". Click "Create Release" once.
2. Reload /build/7/releases. Open the row's "Actions" → "Edit" and read Readiness and Risk Level.
3. Edit the same release: Readiness "Ready", Risk Level "Critical". Click "Save Changes". Reload and open Edit again.

**Expected:** Readiness and Risk Level are stored and shown in the list columns "Readiness" and "Risk" and in the Edit form.

**Actual:** Create: `POST https://api.streamlineos.in/build/7/releases → 201`. The list shows "—" under Readiness and Risk; Edit shows "Not set" for both. Edit: `PATCH https://api.streamlineos.in/build/7/releases/6` → toast "Release updated"; after reload Readiness and Risk still show "Not set" / "—".

**Likely cause:** The release create/update DTO or service drops `readiness` and `riskLevel` (field-name mismatch between client and server, fields missing from the DTO so a whitelist validation pipe strips them, or missing from the ORM mapping), or the GET list/detail does not return them.

**Required fix:** Trace the two fields from the New Release / Edit Release form payload through the API DTO, validation pipe, service, persistence and the GET response, and fix the mismatch so they round-trip. Search hints: "Readiness", "Risk Level", `readiness`, `riskLevel`, `/build/:projectId/releases`.

**Acceptance criteria:**
- Create a release with Readiness "Blocked" and Risk Level "High": after reload the list shows them in the Readiness and Risk columns, and Edit shows them.
- Edit to Readiness "Ready" and Risk Level "Critical" and Save: after reload both values show.
- Setting a value back to "Not set" also persists.
- An API test does create, read, update, read for both fields.

## B-084: The assigned approver (Member with Build Member) has no Decide control
**Severity:** High (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G6 Permission checks: UI must match server

**Where:** Approvals — https://www.streamlineos.in/build/7/approvals (list) and the Inbox item "Approval requested" — https://www.streamlineos.in/build/inbox | Role/account: Member qamem1012c (Member + Build Member, project 7). Approvals assigned to qamem1012c created by owner qaown1012b: "R10 milestone approval" (approval id 9, entity milestone 7) and "R10 task approval" (approval id 10, entity task QAB-4).

**Steps to reproduce:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/approvals.
2. Read the Actions cell of the row "R10 milestone approval" (Approver qamem1012c, Pending). Click the row title.
3. Repeat for "R10 task approval". Reload and repeat once.
4. Open Inbox (https://www.streamlineos.in/build/inbox), click the "Approval requested" item.

**Expected:** The approver sees "Approval actions" with "Decide" (Approve / Reject / Request Changes) on rows assigned to them, or the item opens a detail sheet with a Decide action. The Inbox item links to the approval.

**Actual:** The list shows the two rows (Approver qamem1012c, Level 1, Pending). The Actions cell is empty (the only button in the row is the disabled-looking select checkbox "Owner — transfer ownership first"); there is no "Approval actions" button and no Decide item. Clicking the row title does nothing (no sheet, no URL change; /build/7/approvals/9 → Page Not Found). The Inbox "Approval requested" item opens an empty panel that shows only the text "Approval requested" with no link to the approval. The owner's view of the same rows does show "Approval actions" (Decide, Delegate, Escalate, Cancel, Delete). The "Request approval" button is hidden for the member (correct).

**Likely cause:** The approval row actions are gated by a Build Admin/manage permission instead of "is the assigned approver (or an active delegate)". The Inbox "Approval requested" item has no link target.

**Required fix:** Recommended behavior (implement, then flag in the summary because it is a policy choice): show "Approval actions" with "Decide" to the assigned approver (and an active delegate) regardless of Build Admin role. Make the server `PATCH /build/:projectId/approvals/:id/decide` allow the assigned approver/delegate (see B-061 for the owner case). Make the Inbox "Approval requested" item link to /build/:projectId/approvals (opening that approval if a detail view exists). Do not show Delegate/Escalate/Cancel/Delete to the member unless the server allows them.

**Acceptance criteria:**
- Signed in as the QA member qamem1012c (the assigned approver), /build/7/approvals shows "Approval actions" with "Decide" on rows assigned to that user; deciding returns 200 and the row status changes without reload.
- The same member sees no Decide on approvals assigned to someone else, and the server returns 403 if they call decide directly.
- The Inbox "Approval requested" item navigates to the approval.
- Tests cover the decide permission: approver allowed, non-approver member forbidden.

---

# Medium

## B-003: Double-click on "Post comment" posts the comment twice
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Ticket Activity composer — https://www.streamlineos.in/build/7/tickets/QAB-84 (Activity section) | Role/account: Owner qaown1012b (Owner). Any role that can comment.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. Click the "Comment input" box and type `DBL comment 0913 🎉`.
3. Double-click the "Post comment" button.
4. Reload the page and read the Activity section (count and list).

**Expected:** One comment is posted. The button is disabled while the post is in flight, or the second click is ignored.

**Actual:** Activity count goes from (0) to (2). Two comments with identical body `DBL comment 0913 🎉` appear, both by qaown1012b, both "just now". Same result after reload (persisted, not a UI-only duplicate). The composer is cleared only after the first post completes.

**Likely cause:** The submit handler has no synchronous in-flight guard: the button stays enabled until the first response, so a second click fires a second POST. Ctrl+Enter has the same gap.

**Required fix:** Apply the shared G1 guard to the comment composer: disable "Post comment" and ignore Ctrl+Enter while a post is in flight. Restore the text if the post fails.

**Acceptance criteria:**
- Double-clicking "Post comment" posts exactly one comment (one POST), also after reload.
- "Post comment" is disabled while the post is in flight; on failure the text is kept.
- Ctrl+Enter pressed twice quickly posts one comment.
- A component test proves one request for two rapid submits.

## B-004: Ticket detail controls have no accessible names
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Ticket details side panel — https://www.streamlineos.in/build/7/tickets/QAB-84 (Details panel) | Role/account: Owner qaown1012b; any ticket.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. Read the accessibility tree of the "Details" complementary panel (e.g. browser_snapshot or ariaSnapshot).

**Expected:** Each control is named by its visible label: "Status", "Priority", "Type", "Points", "Epic", "Workstream", "Cycle", "Customer", "Parent", "Start date", "Due date".

**Actual:** The visible labels "Status", "Priority", "Type", "Epic", "Workstream", "Cycle" are not associated with their controls: `combobox` (Status, with value "To Do" as child text, no name), `combobox` (Priority), `combobox` (Type), `combobox "None"` (Epic, Workstream, Cycle), `spinbutton "0"` (Points — the name is the current value, not "Points"), `button "None"` (Customer). The "Set start"/"Set due" buttons do not name the field they belong to.

**Likely cause:** The Details panel renders visible label text next to each control without associating it (`htmlFor`/`id` or `aria-labelledby` missing); Points uses its value as its name.

**Required fix:** Associate each visible label with its control. Give Points `aria-label="Points"` if no label element exists. Name the date buttons e.g. "Start date: Set start" and "Due date: Set due", and the Customer button "Customer: None". Do not change visuals.

**Acceptance criteria:**
- In the accessibility tree of /build/7/tickets/<key>, the controls are named "Status", "Priority", "Type", "Points", "Epic", "Workstream", "Cycle", "Customer", "Parent", "Start date", "Due date".
- Values are still exposed as the control value (e.g. Status combobox value "To Do").
- If the repo has component tests, add one using getByRole with name for at least Status, Priority and Points.

## B-005: A search longer than 255 characters replaces the board with "Something went wrong"
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** Issues search — https://www.streamlineos.in/build/7/issues (Board, List, Table all share it) | Role/account: Owner qaown1012b; any role with view access.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues.
2. Click the "Search..." box and type or paste 256 or more characters (for example 600 × `y`).
3. Wait for the results area.
4. Observe the result; then try to clear the search (click the box and empty it).

**Expected:** Either the input is capped (maxlength with a visible hint such as "Search is limited to 255 characters") or a search over-length gives a field-level message; the ticket columns stay visible and the input stays usable.

**Actual:** Network `GET https://api.streamlineos.in/build/7/tickets?limit=100&orderBy=rank&orderDir=asc&search=yyyy…` → **HTTP 400**, console `ApiError: Validation failed.` The whole main area shows "Something went wrong / An unexpected error occurred. Please try again. / Try Again"; the search box is gone; URL becomes `/build/7/issues?q=yyyy…`. 100 characters works (no-match state); 200 works; 256 fails. Reloading the same URL shows the same error. Clear-the-box recovery is not possible because the search input unmounts.

**Also reproduced on All Work** (https://www.streamlineos.in/build/all-work): typing 300 × `q` into its search → `GET https://api.streamlineos.in/build/all-work?limit=50&search=qqq…` → **400**; page shows "All Work Error / Failed to load work items. / Try Again" (the search box stays on that page only after reload, and the error replaces the list).

**Likely cause:** The server rejects `search` over its limit with 400 "Validation failed", and the client lets the error reach the page-level error boundary, which unmounts the search input. The input has no maxlength.

**Required fix:** Client: set `maxLength` on the issues search input and the All Work search input to the server limit (read it from the server DTO; use one shared constant), with a short hint when the limit is reached. Keep the search input mounted when the tickets query fails and show an inline error in the results area. Server: keep the 400 but return a field error for `search`. Search hints: `search=` on `GET /build/:projectId/tickets` and `GET /build/all-work`, "Search...", "All Work Error", "Failed to load work items.".

**Acceptance criteria:**
- Pasting 600 characters into the board search keeps at most the server limit; no 400 is sent.
- If a 400 still comes back (e.g. a URL with a 600-character `?q=`), the board shows an inline message and the search box stays visible and editable; clearing it restores the board.
- Same behavior on /build/all-work.
- Searches up to the limit still work.

## B-007: A project name made only of spaces is saved (project settings)
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-008: Ticket timer "Stop" discards the tracked time
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Ticket Details > Time Tracking — https://www.streamlineos.in/build/7/tickets/QAB-84 | Role/account: Owner qaown1012b. Any role that can log time on the ticket (Member with Build Member on the project to be checked).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-84.
2. In "Time Tracking" click **Start**. Wait about 4 seconds (timer shows 00:04). Buttons now read "Stop" and "Save".
3. Click **Stop**.
4. Observe the Time Tracking block; then reload the page.

**Expected:** Stop pauses the timer and keeps the elapsed time with a visible Save/Log action (or auto-logs it), or asks "Discard 00:04?" before discarding.

**Actual:** After Stop the block shows `Log 00:04 / Start` and the **Save button disappears** (no way to save what was tracked). No network request is sent (`POST .../time-entries` not made). After reload Time Tracking shows `00:00`. The 4 seconds are lost. Only "Save" pressed while the timer is still running creates the entry (`POST https://api.streamlineos.in/build/7/tickets/95/time-entries` → 201, timer reset to 00:00).

**Likely cause:** The timer's Stop handler pauses/resets state and hides Save without creating a time entry; only Save while running calls `POST /build/:projectId/tickets/:id/time-entries`.

**Required fix:** After Stop, keep the elapsed time in a paused state with a visible "Save" action and a "Discard" action that asks for confirmation. After a successful save show a toast "Time entry saved (mm:ss)". Search hints: "Time Tracking", "Start", "Stop", "Save", "Log 00:", `time-entries`.

**Acceptance criteria:**
- Start, wait, Stop: the elapsed time stays visible with Save and Discard; nothing is lost.
- Save after Stop sends one `POST .../time-entries` (201) with the elapsed duration; reload shows the logged time.
- Discard asks for confirmation before clearing the time.
- A toast confirms the saved duration.

## B-019: Double-clicking "Save" in Time Tracking while the timer runs loses the time
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G1 Submit in-flight guard

**Where:** Ticket Details > Time Tracking — https://www.streamlineos.in/build/7/tickets/QAB-91 | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-91. In "Time Tracking" click **Start** and wait until **Stop** and **Save** show.
2. Double-click **Save** (attempt 1; attempt 2 with force; attempt 3 with the same steps).
3. Read the Time Tracking block and the network list.

**Expected:** One time entry (POST …/time-entries → 201), or the button disabled while saving.

**Actual:** 0 `time-entries` requests in the three double-click attempts. In attempt 1 the timer ended in the stopped state (`Log 00:28 | Start`, no Save), with no entry (B-008 pattern). A single click on **Save** while running sent `POST https://api.streamlineos.in/build/7/tickets/102/time-entries → 201` (one entry).

**Likely cause:** There is no in-flight guard, and the controls change under the cursor after the first click (the second click lands on the new Stop/Start state), so the save is lost or never sent.

**Required fix:** Apply the G1 guard to the timer Save: on the first click capture the elapsed time, set the guard, keep the controls stable (disable Start/Stop/Save) until the POST settles, then reset. Together with B-008, no click sequence may drop the elapsed time silently.

**Acceptance criteria:**
- Double-clicking Save while running sends exactly one `POST .../time-entries` (201) with the elapsed duration.
- The timer resets only after the 201; on failure the elapsed time is kept and an error is shown.
- A single click on Save still works.

## B-010: CSV import accepts story points above 100
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-022: The "Join" button on the org-setup invite banner does nothing
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** https://www.streamlineos.in/org-setup (after sign-in as an invitee) | Role/account: Invitee qadbl1013@sharklasers.com (invited by qaown1012b as Member, Build Member preset; invite sent 201 this round). Owner qaown1012b.

**Steps to reproduce:**
1. Sign in at https://www.streamlineos.in/signin with qadbl1013@sharklasers.com (POST /auth/email-otp 200; POST /auth/email-otp/verify 200).
2. Land on /org-setup: banner "You have a pending invitation — QA Build Org 1012b — MEMBER — Join — Create my own organization instead".
3. Click "Join".

**Expected:** The invitation is claimed (POST …/claim) and the user reaches the org dashboard or /post-invite, as in the v3 accept flow.

**Actual:** Normal click: Playwright waited 8 s for the button to be visible, enabled and stable, then timed out. Forced click: no network request (no POST) and the page stays on /org-setup with the same banner. The user has no sign-out control on /org-setup; /dashboard and /signin redirect back to /org-setup.

**Likely cause:** The banner's Join button has no working click handler (or is disabled/covered by an overlay, so it never becomes clickable), so no claim request is sent.

**Required fix:** Make "Join" call the same invite claim/accept endpoint the email accept flow uses (find that flow in the frontend and reuse it), then redirect to the org dashboard. Show an error if the claim fails. Add a "Sign out" link on /org-setup. Do not log or expose invite tokens. Search hints: "You have a pending invitation", "Join", "Create my own organization instead", `/org-setup`, `/post-invite`, `claim`.

**Acceptance criteria:**
- As an invited QA account with a pending invite, clicking "Join" sends one claim request (2xx) and lands in the invited org.
- If the claim fails, a visible error appears and the button re-enables.
- /org-setup has a working "Sign out" control.

## B-025: Board ignores "Ordering", and list "Created" ignores direction (newest is last)
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-029: At 768 px the board filter bar is off-screen
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** Issues toolbar — https://www.streamlineos.in/build/7/issues (Board and Table) at viewport width 768 px (DevTools device toolbar, Responsive, 768 × 1026) | Role/account: Owner qaown1012b (Owner). Desktop-class browser window narrowed to 768 px.

**Steps to reproduce:**
1. Set the device width to 768 (Ctrl+Shift+M device toolbar). Open https://www.streamlineos.in/build/7/issues.
2. Read the toolbar row: Board, List, Table, Calendar, Timeline, Workload, Views, Display, and the bookmark icon. Look for "Add filter", "Hide done" and the search box.
3. Try to click "Add filter" (Playwright click, 3 s timeout).

**Expected:** The filter row wraps onto a second line or collapses into a "Filter" menu; Add filter, Hide done and search stay reachable at 768 px.

**Actual:** Step 2: "Add filter" starts at about x=1030 px and "Hide done" at x=1130 px (viewport 768), outside the viewport; the search textbox is not visible at the initial scroll position. Step 3: the Playwright click timed out, but the toolbar had scrolled sideways and the "Filter by…" menu was open on screen (Status, Priority, Type, Assignee, Label, Cycle, Due Dates); the search field appeared next to it after the scroll. "Saved views" and "Save view" are visible at the start position.

**Likely cause:** The issues toolbar is one non-wrapping flex row with horizontal overflow and no visible scroll cue.

**Required fix:** Let the toolbar wrap at narrow widths (`flex-wrap`, `min-width:0` on children) so "Add filter", "Hide done" and the search box move to a second line. Keep the desktop layout unchanged.

**Acceptance criteria:**
- At 768 px width, "Add filter", "Hide done" and the search input are visible without horizontal scrolling and clickable.
- At 375 px and 1280 px the toolbar still works and looks as before.

## B-030: The project Files page shows "Project error" for the owner
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-033: The member's "Add ticket due date" calendar option does nothing
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G6 Permission checks: UI must match server

**Where:** https://www.streamlineos.in/calendar?source=build&projectId=7 → "Add to calendar" (header, button "Add") → menuitem "Add ticket due date" → dialog "Add ticket due date" → "Create ticket" | Role/account: Member qamem1012c (Member + Build Member on QA Project Alpha).

**Steps to reproduce:**
1. Open the calendar URL above. Click "Add to calendar" → "Add ticket due date".
2. Project: select "QA Project Alpha". Title: `R4 member cal due 1013`. Due date and Priority keep defaults.
3. Click "Create ticket". Repeat with a plain click, a forced click, and Enter in the Title field.
4. Watch the network and the dialog; then search `R4 member` on /build/7/issues?q=R4%20member.

**Expected:** Either the ticket is created (201) and the dialog closes, or the action is hidden for a role that cannot create issues, or an error is shown.

**Actual:** Before the project was chosen: inline "Select a project" alert. After choosing it: no `POST` request in any of 4 attempts, dialog stays open, no alert, no toast, no field error. Nothing created (search returns no R4 ticket). Same member account has no create control on /build/7/issues.

**Likely cause:** The calendar "Add to calendar" menu shows "Add ticket due date" without checking Build ticket-create permission, and the dialog's submit returns early without a message.

**Required fix:** Hide "Add ticket due date" unless the user can create tickets in at least one Build project, and limit the Project picker to those projects. For users who can create, make "Create ticket" send `POST /build/:projectId/tickets` and close on 201; show any error inline. Search hints: "Add to calendar", "Add ticket due date", "Create ticket", "Select a project".

**Acceptance criteria:**
- As the QA member (no create rights), "Add ticket due date" is not offered.
- As owner, the dialog creates the ticket (one POST, 201) with the chosen due date; it shows on the calendar and in /build/7/issues.
- If the POST fails, the dialog shows the error and stays open.

## B-042: The Agile reports link is a 404
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-047: Triage "Decline" always fails
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Triage — https://www.streamlineos.in/build/7/triage → "Decline" on any row | Role/account: Owner qaown1012b (Owner). Triage had unassigned tickets (QAB-109, QAB-110 in this run).

**Steps to reproduce:**
1. Open /build/7/triage; search `R5` and press Enter (3 rows).
2. Click "Decline" on QAB-110 "R5 drag probe C 1013". Watch the network and the page.
3. Reload the triage page.

**Expected:** The ticket is declined (removed from triage, a status or reason is saved), or a clear message explains why not.

**Actual:** `PATCH https://api.streamlineos.in/build/7/tickets/121` → **400** `{"code":"PROJECTS_INVALID_TICKET_STATUS","message":"\"CANCELLED\" is not a valid status for this project"}`. The row stays in triage; no message appears in the page's main area (toast not confirmed). "Accept" on QAB-108 works (PATCH 200, one request on double-click, row removed).

**Likely cause:** Decline sends a hard-coded status `CANCELLED`, which is not in the project's workflow, so the API returns 400 `PROJECTS_INVALID_TICKET_STATUS` ("\"CANCELLED\" is not a valid status for this project"). The error is not shown.

**Required fix:** Make Decline use a status the project defines: look up the project workflow and use its cancelled/closed-category status (if no cancelled category exists, follow any existing helper, otherwise the Done-category status). Do not hard-code `CANCELLED`. Show the server error if it still fails. Search hints: "Decline", "Accept", `triage`, `CANCELLED`, `PROJECTS_INVALID_TICKET_STATUS`.

**Acceptance criteria:**
- Clicking Decline on a triage row sends one PATCH that returns 200; the row leaves triage and the ticket has the project's cancelled/closed status.
- Accept still works.
- If the PATCH fails, a visible error appears.
- A test covers Decline for a project whose workflow has no literal CANCELLED status.

## B-048: Release "Delete" opens "Edit Release" underneath it
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

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

## B-049: Duplicate release versions are allowed in one project
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Releases — https://www.streamlineos.in/build/7/releases → "New Release" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Create "R5 release 1013" with version `1.0` (accepted, 201).
2. Click "New Release". Name `R5 release dup 1013`; Version `1.0`. Click "Create Release".

**Expected:** Rejected with "Version 1.0 already exists in this project" (409 or field error).

**Actual:** `POST https://api.streamlineos.in/build/7/releases` → **201** (id 3, version "1.0"). The list shows two rows with version 1.0.

**Likely cause:** No uniqueness check on (project, version) for releases.

**Required fix:** Server: on create and update, reject a version that already exists in the same project (trimmed, case-insensitive) with 409 and the message "Version 1.0 already exists in this project". Add a unique DB index only if the repo uses migrations and existing data allows it; otherwise keep the service check and mention the index in the summary. Client: show the 409 under the Version field.

**Acceptance criteria:**
- Creating a second release with version "1.0" in project 7 returns 409 and shows the message under Version; nothing is created.
- Editing a release to an existing version is rejected the same way.
- The same version in a different project is allowed.
- An API test covers the duplicate case.

## B-056: The approval task picker cannot find new tickets
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending

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

## B-059: At 375 px the release notes editor overflows (fixed 639 px width)
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** Releases → "New Release" dialog (https://www.streamlineos.in/build/7/releases, dialog open), Release Notes rich-text editor, viewport 375 px (DevTools device mode, width 375). | Role/account: Owner qaown1012b (Owner). No record is saved (dialog cancelled).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/releases at 375 px width.
2. Click "New Release".
3. Look at the Release Notes area and the Name / Version fields.

**Expected:** The editor fits the dialog width (same right edge as Name, Version and the other fields), or its text area wraps inside the dialog.

**Actual:** Name and Version fields end at about x=351 px. The Release Notes toolbar (Undo … Heading 3) and the editable area start at about x=27 px and are 639 px wide, so the editable area ends about 290 px past the right edge of the 375 px screen. The dialog's right border is not visible around the editor, and the "Heading 3" button sits at the edge.

**Also at desktop (1280 px, checked later in round 6):** the same editor box is 639 px wide at every width (contenteditable at x=1409 while the sheet starts at about x=940). Long lines run past the sheet edge and are clipped, with no wrap, so the root cause is a fixed width, not only the phone layout.

**Likely cause:** The rich-text editor (toolbar and editable area) has a fixed 639 px width or min-width, and its flex/grid parent lacks `min-width:0`.

**Required fix:** Remove the fixed width: editor `width:100%; max-width:100%`, parent `min-width:0`, toolbar `flex-wrap`, long words `overflow-wrap:anywhere`. Check both New Release and Edit Release.

**Acceptance criteria:**
- At 375 px, the Release Notes toolbar and editable area end inside the New Release dialog, aligned with Name and Version.
- At 1280 px, long lines wrap inside the sheet and are not clipped.
- Typing, toolbar buttons and the counter still work.

## B-060: At 375 px the ticket Activity action row overflows and the page scrolls sideways
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** Ticket detail → ACTIVITY section header row ("Summarize comments", "Handoff", "Draft comment"), e.g. https://www.streamlineos.in/build/7/tickets/QAB-3, viewport 375 px. | Role/account: Owner qaown1012b (Owner). Read-only check; nothing was posted.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/tickets/QAB-3 at 375 px width.
2. Scroll down to ACTIVITY (the composer with "Write a comment... (Ctrl+Enter to send)").
3. Look at the row above the composer. Try to scroll the ticket page sideways.

**Expected:** The action buttons wrap or collapse, and the page does not scroll sideways.

**Actual:** "Summarize comments" and "Handoff" fit; "Draft comment" starts at about x=280 px and is cut at the right edge of the screen. A horizontal scroll on that row moves the whole ticket page (title header, Relations "Add" button, comment composer and History) about 90 px to the left, so the page is wider than the 375 px viewport. The composer's "Write a comment" box is also cut at the left when the page is scrolled.

**Likely cause:** The Activity header row ("Summarize comments", "Handoff", "Draft comment") is a non-wrapping flex row that widens the page.

**Required fix:** Let that row wrap (`flex-wrap`) and give the Activity container `min-width:0`, so the page never gets wider than the viewport. Do not hide overflow on the whole page.

**Acceptance criteria:**
- At 375 px on a ticket page, "Summarize comments", "Handoff" and "Draft comment" are fully visible (wrapping is fine).
- The ticket page does not scroll sideways at 375 px (`document.documentElement.scrollWidth` equals the viewport width).
- Desktop layout unchanged.

## B-061: The owner can decide another person's approval
**Severity:** Medium (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-062: The epic card does not refresh after "Save changes"
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G5 Query invalidation after mutations

**Where:** Epics — https://www.streamlineos.in/build/7/epics → epic card "More actions" → "Edit" → "Save changes" (epic "R6 epic 1013") | Role/account: Owner qaown1012b (Owner). Epic with 3 linked items (1 Done, 2 To Do).

**Steps to reproduce:**
1. Open /build/7/epics. On "R6 epic 1013" (card shows "Todo | Medium") click "More actions" → "Edit".
2. Priority → High; Status → In Progress. Click "Save changes".
3. Read the card immediately (no reload). Then repeat with Priority → Urgent and Status → Done, Save, read the card.
4. Reload /build/7/epics and read the card again.

**Expected:** The card updates to "In progress | High" right after the save (as the milestone card does).

**Actual:** After the first save the sheet closes and the card still reads "Todo | Medium". After the second save the card reads "In progress | High" (one save behind). After a reload it reads "Done | Urgent" (the last save). Both saves returned `PATCH https://api.streamlineos.in/build/7/tickets/129` → **200**.

**Likely cause:** The epic edit mutation does not invalidate or update the query that the Epics page cards read (probably only the ticket detail query).

**Required fix:** When the epic edit `PATCH /build/:projectId/tickets/:id` succeeds, invalidate the epics list query (and the ticket detail query), or update the card in the cache from the response. The milestone edit already refreshes correctly; follow its pattern.

**Acceptance criteria:**
- After changing an epic's priority and status and saving, the card shows the new values at once, without reload.
- A second edit right after also shows at once (not "one save behind").

## B-066: Release notes: 10,000 characters pass the counter but the server rejects them
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Releases → release "Edit" → Release Notes → "Save Changes" (https://www.streamlineos.in/build/7/releases) | Role/account: Owner qaown1012b (Owner). Release "R6 release 1013".

**Steps to reproduce:**
1. Edit the release. Select all in Release Notes and enter exactly 10,000 characters (e.g. "LONG0913 R6 lorem ipsum … " repeated, cut to 10,000).
2. Read the counter ("10,000 / 10,000"). Click "Save Changes".
3. Read the toast/alert and the network response.
4. Replace the text with 9,000 characters and save again.

**Expected:** Either the editor's counter counts what the server counts (so 10,000 is blocked before submit with a clear note), or the server accepts 10,000 characters.

**Actual:** Step 2: `PATCH https://api.streamlineos.in/build/7/releases/6` → **400**. The top toast reads "description: Release notes must be 10,000 characters or fewer" (raw field key "description:"); the dialog stays open and nothing is saved. Step 4: 9,000 characters → **200**. Earlier, a 10,050-character paste was blocked client-side with "Release notes must be 10,000 characters or fewer" (no request), and that message stayed on screen after the text was cut to 10,000, so the first Save click at 10,000 sent nothing and only the second click sent the PATCH.

**Likely cause:** The editor counts plain text while the server validates the stored HTML (`description`, including tags like `<p>`). A stale client length error also blocks the first Save after trimming, and the server error is shown with the raw key "description:".

**Required fix:** Make both sides measure the same value. Recommended: the server validates the plain-text length (tags stripped) against 10,000 and keeps a separate, larger cap on the HTML; the client keeps counting plain text. Clear the length error as soon as the text is valid. Show server field errors on the field without the "description:" prefix.

**Acceptance criteria:**
- Saving exactly 10,000 characters of plain-text notes succeeds (200).
- 10,001 characters is blocked on the client with "Release notes must be 10,000 characters or fewer".
- After cutting an over-long text to a valid length, the first Save click sends the request.
- No toast or message contains "description:".

## B-070: "Blocks" and "Duplicate of" are not inverted on the other ticket
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Ticket Relations section — https://www.streamlineos.in/build/7/tickets/QAB-113, /QAB-114, /QAB-115, /QAB-117 | Role/account: Owner qaown1012b (Owner, project 7).

**Steps to reproduce:**
1. Open QAB-113. Relations → Add → type "Blocks" → search "R6 workload B" → select → "Add Relation". (Relation 1: QAB-113 blocks QAB-114.)
2. Open QAB-114 (no reload needed; reload to be sure). Read Relations.
3. Open QAB-115. Relations → Add → type "Blocked by" → search "R6 link target" → "Add Relation" (POST /build/7/tickets/126/relations → 201). Open QAB-117 and read Relations.
4. Open QAB-115 → Relations → Add → "Blocks" → "R6 workload B" → "Add Relation" (POST /build/7/tickets/126/relations → 201). Open QAB-114 and read Relations.

**Expected:** On the blocked ticket the relation reads "Blocked by <blocker>"; on the blocker it reads "Blocks <blocked>". Each side shows the inverse of the type chosen on the other side.

**Actual:** QAB-113 shows "Blocks — R6 workload B 1013 (QAB-114)" (correct). QAB-114 shows "Blocks — R6 workload A 1013 (QAB-113)" (should be "Blocked by"). QAB-115 shows "Blocked by — R6 link target 1013 (QAB-117)" (correct). QAB-117 shows "Blocked by — R6 epic child 1013 (QAB-115)" (should be "Blocks"). After step 4, QAB-114 shows "Blocks — R6 workload A 1013 (QAB-113)" and "Blocks — R6 epic child 1013 (QAB-115)". Reloads give the same result. "Relates to" is symmetric and shows correctly on both sides.

**Retest notes:** Also affects "Duplicate of" (round 8). Re-confirmed in round 10.

**Likely cause:** Relations are stored once (source, target, type) and the read path returns the stored type to both tickets without inverting it when the current ticket is the target.

**Required fix:** In the relations read path, when the current ticket is the target of a directional relation, return the inverse: Blocks becomes "Blocked by", Blocked by becomes "Blocks", Duplicate of becomes "Duplicated by" (add that label if missing). Relates to is unchanged. Do not rewrite stored data. Keep the picker's "already linked" exclusion working.

**Acceptance criteria:**
- A Blocks B: A shows "Blocks B", B shows "Blocked by A".
- A Blocked by B: B shows "Blocks A".
- A Duplicate of B: B shows "Duplicated by A".
- Relates to shows on both sides as before.
- An API test covers each directional type from both sides.

## B-085: Members see Edit on milestones and releases, but Save fails with "Missing permission"
**Severity:** Medium
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G6 Permission checks: UI must match server

**Where:** Milestones — https://www.streamlineos.in/build/7/milestones → row "Actions for R10 milestone" → "Edit" → dialog "Edit Milestone" → "Save Changes" | Role/account: Member qamem1012c (Member + Build Member, project 7). Milestone "R10 milestone" (id 7) created by owner qaown1012b.

**Steps to reproduce:**
1. Sign in as qamem1012c. Open https://www.streamlineos.in/build/7/milestones.
2. Click "Actions for R10 milestone" (menu shows "Edit" only).
3. Click "Edit". Change Name to `R10 milestone edited`.
4. Click "Save Changes". Watch the network.

**Expected:** Either "Edit" is hidden for a member who cannot manage milestones, or Save sends the PATCH and the change is saved, or a plain-language message ("You don't have permission to edit milestones") is shown next to the form.

**Actual:** The Edit dialog opens with editable fields. "Save Changes" sends **no request** (0 api.streamlineos.in requests). A toast reads "Missing permission: build:workspace:manage". The dialog stays open with the typed name; the milestone stays "R10 milestone" after reload.

**Also (same member session, /build/7/releases):** the Releases table has no Actions column for the member, but clicking the row "R10 release" opens the "Edit Release" sheet (Name, Version, Status, Release Date, Readiness, Risk, Release Notes). Changing Name to `R10 release edited` and clicking "Save Changes" sends **no request** and shows the toast "Missing permission: build:manage"; the sheet stays open. The release name is unchanged on reload.

**Likely cause:** The milestone Actions menu and the release row click are not gated by the same permission (`build:workspace:manage` / `build:manage`) that the Save handler checks on the client.

**Required fix:** Use one permission check for showing edit controls and for saving: hide "Edit" in the milestone Actions menu, and do not open the editable Edit Release sheet on row click, for users without the manage permission (a read-only view is fine if one exists). Never show raw permission keys; if a save is refused, say "You don't have permission to edit this milestone" (or release). Verify the PATCH endpoints also return 403 for members.

**Acceptance criteria:**
- As the QA member, the milestone Actions menu has no Edit, and clicking a release row does not open an editable sheet.
- Direct `PATCH /build/7/milestones/:id` and `PATCH /build/7/releases/:id` as the member return 403.
- No UI text contains "Missing permission: build:".
- Owner/admin editing still works.

---

# Low

## B-002: Bidi-override and zero-width characters are accepted in titles
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Create Issue dialog — https://www.streamlineos.in/build/7/issues?create=1 | Role/account: Owner qaown1012b.

**Steps to reproduce:**
1. Open Create Issue; in Issue title enter `🚀 Émoji 日本語 مرحبا 👩‍👩‍👧 e\u0301 \u202Ertl-test \u200B zero` (contains U+202E RIGHT-TO-LEFT OVERRIDE and U+200B ZERO WIDTH SPACE).
2. Click "Create issue".

**Expected:** Invisible bidi overrides/zero-width characters are stripped (or rejected with "Title contains invisible characters"). Emoji, CJK, Arabic and combining marks are kept.

**Actual:** Create returns `POST https://api.streamlineos.in/build/7/tickets` `201`. Stored and rendered title keeps U+202E and U+200B (the `‮` and `​` characters are present in the board card). Emoji, CJK, Arabic and combining marks round-trip correctly (QAB-82).

**Likely cause:** The title rule does not remove invisible formatting characters.

**Required fix:** In the shared title rule (client and server), strip bidi controls U+202A to U+202E and U+2066 to U+2069, plus U+200B and U+FEFF. Keep U+200D (zero-width joiner), which emoji sequences need. Apply on create and title edit.

**Acceptance criteria:**
- A title containing U+202E and U+200B is saved without them.
- Emoji (including family ZWJ sequences), CJK, Arabic and combining marks are saved unchanged.
- A unit test covers the sanitiser.

## B-006: `%` and `_` act as wildcards in search
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

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

## B-009: The "Log time" link is a dead end when Timesheets is off
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G11 Navigation, routes and dead links

**Where:** https://www.streamlineos.in/build/7/issues (header "Log time" link) → https://www.streamlineos.in/timesheets?projectId=7 | Role/account: Owner qaown1012b; org where Timesheets module is not enabled (current org).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues.
2. Click the "Log time" link in the project header (href /timesheets?projectId=7).
3. Observe the page.

**Expected:** The "Log time" link is hidden when the Timesheets module is off, or the page offers the Build time-log form for this project.

**Actual:** Page shows heading "Module not enabled", "Timesheets is not enabled for your organisation. An administrator can turn it on in settings.", buttons "Enable Timesheets", link "Manage Modules" (/settings/modules). Build-level time logging is available only from the ticket's Time Tracking block, so the header link is misleading.

**Likely cause:** The project header always renders "Log time" linking to `/timesheets?projectId=<id>`, without checking whether the Timesheets module is enabled.

**Required fix:** Hide the "Log time" header link when Timesheets is not enabled for the org (use the existing module/entitlement check). Do not change the Timesheets page.

**Acceptance criteria:**
- With Timesheets off, /build/7/issues has no "Log time" link in the header.
- With Timesheets on, the link still shows and works.

## B-012: Wizard step 7 repeats step 6's text and has no summary
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** New Project wizard — https://www.streamlineos.in/build/projects → "New Project" | Role/account: Owner qaown1012b (Owner); project creation rights (Org Admin also).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/projects and click "New Project".
2. Step 1: Name `QA Wizard 0913`, Key `QW9`, Next. Step 2: pick "Scrum Software", Next. Step 3: Next. Step 4: Next. Step 5: Next. Step 6: Next.
3. Read step 7 "Review & Create".

**Expected:** Step 7 has its own subtitle (for example "Review the details before creating the project") and a summary of name, key, type, template, features, workflow and members, so the user can confirm.

**Actual:** Step 7 subtitle reads "Choose a workflow that matches how your team works." (identical to step 6). The page shows the workflow option cards and the member list only; the chosen name "QA Wizard 0913", key "QW9" and type "Scrum Software" are not summarised anywhere on the step. Escape closed the wizard with no discard prompt (typed data lost silently).

**Likely cause:** Step 7 reuses step 6's subtitle and content.

**Required fix:** Give step 7 its own subtitle ("Review the details before creating the project") and a read-only summary of name, key, type/template, features, workflow and members from the wizard state. Keep the Create action as is.

**Acceptance criteria:**
- Step 7 subtitle differs from step 6.
- Step 7 shows the entered name, key, type and chosen workflow.
- Creating from step 7 still works.

## B-017: A 0-byte file gives no message
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-020: The ticket heading sticks on "Loading..."
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** https://www.streamlineos.in/build/7/tickets/QAB-96 (two tabs open on the same ticket) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Open the same ticket in tab A and tab B. Make a conflicting edit in A (see round-2 two-tab test), then reload both tabs.
2. Wait up to 15 s for the ticket heading (h1).

**Expected:** Heading renders with the title, or an error after a timeout.

**Actual:** h1 read "Loading..." for more than 15 s in 2 of about 8 loads (both tabs). On later loads the title rendered within 3 s.

**Likely cause:** The ticket detail query can stay pending (no timeout/error path, or a stuck refetch after a version conflict in another tab), and the heading shows "Loading..." while pending.

**Required fix:** Show an error with "Try Again" if the ticket query fails or has not resolved after a timeout (e.g. 10 s), instead of "Loading..." forever. Look for a conditionally enabled query that can get stuck (see also B-038). Keep the change small.

**Acceptance criteria:**
- If the ticket request fails or exceeds the timeout, the page shows a retry state.
- Normal loads render the title as before.

## B-023: Browser Back drops the Create dialog's typed title
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

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

## NEW-06: Title limit differs between Create (no client max) and ticket detail (500)
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Create Issue — https://www.streamlineos.in/build/7/issues?create=1 ; Ticket title — https://www.streamlineos.in/build/7/tickets/QAB-96 (Edit title) | Role/account: Owner qaown1012b (Owner). Admin/Member not re-run.

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/7/issues?create=1. Type 201 × `B` in "Issue title", press Tab.
2. Observe the field (no maxlength attribute) and the dialog text; "Create issue" stays enabled.
3. Open an existing ticket (QAB-96) → click "Edit title" → the field has maxlength="500".
4. Type 300 × `C`, press Enter. Wait for PATCH. Reload and read the heading length.

**Expected:** One rule across create and detail (for example 200 chars with "Title must be 200 characters or fewer" on both), or the same 500 cap on both.

**Actual:** Step 2: no inline message at 201 chars; no maxlength on the create field (a 201-char title was also accepted and saved in the v3 run). Step 4: `PATCH https://api.streamlineos.in/build/7/tickets/… → 200`; after reload the heading is 300 chars. Detail maxlength is 500 (600 typed → 500 kept). Earlier run (v2) showed the create dialog rejecting 201+ with "Title must be 200 characters or fewer", so the create-side rule has changed between runs.

**Likely cause:** The create form and the title editor use different title rules, and the server limit is not shared.

**Required fix:** Use one title rule (trim plus one maximum) in the Create Issue dialog, the detail title editor and the server DTOs, with `maxLength` on both inputs. Recommended: 200 characters with "Title must be 200 characters or fewer" (this rule existed in an earlier build). If the server already allows 500 and existing data is longer than 200, use 500 everywhere instead and say which in the summary.

**Acceptance criteria:**
- Create and detail title inputs enforce the same maximum with the same message.
- The server rejects longer titles on create and update with 400.
- Existing titles still display.

## NEW-10: The scope switcher shows "Organization" instead of the org name
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Build sidebar scope switcher — https://www.streamlineos.in/build/projects (compare https://www.streamlineos.in/build/7/issues) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Sign in as qaown1012b and open https://www.streamlineos.in/build/projects.
2. Read the scope switcher button at the top of the Build sidebar (aria-label and visible text).
3. Open https://www.streamlineos.in/build/7/issues and read the same switcher.

**Expected:** On /build/projects the switcher shows the org name "QA Build Org 1012b" (as the dashboard header does).

**Actual:** Step 2: aria-label `Switch Build scope — current: Organization All of Build`; visible text `AL | All of Build | Organization`. Dashboard header shows "QA Build Org 1012b". Step 3: aria-label `… current: Project QA Project Alpha` (correct).

**Likely cause:** The switcher on /build/projects uses a fallback label instead of the org name from the store the dashboard header uses.

**Required fix:** Read the org name from the same source as the dashboard header; use "Organization" only when the name is missing. Update the aria-label too.

**Acceptance criteria:**
- On /build/projects the switcher text and aria-label show the org name ("QA Build Org 1012b" for the QA owner).
- On /build/7/issues it still shows the project.

## NEW-11: The project key is silently rewritten ("qa-1!" becomes "QA1")
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** New Project wizard, step 1 — https://www.streamlineos.in/build/projects → "New Project" → Key field | Role/account: Owner qaown1012b (Owner). Wizard closed without creating (Escape).

**Steps to reproduce:**
1. Open https://www.streamlineos.in/build/projects → "New Project".
2. Name: `QA Name OK`. Key: type `qa-1!`, press Tab.
3. Read the Key value and the helper/error text.

**Expected:** Either a visible notice ("Lowercased and removed '-' and '!' — key is QA1") or a block with the error "Key must contain only uppercase letters (A–Z) and numbers" while the typed text stays.

**Actual:** Key value becomes `QA1`. Helper text: "Letters A–Z and digits only; auto-uppercased." No notice that `-` and `!` were removed. The earlier stale key error ("Key must contain only uppercase letters (A–Z) and numbers") is NOT shown any more (that part is fixed).

**Likely cause:** The Key input sanitises on change with no feedback.

**Required fix:** Keep the auto-uppercase. When characters are removed, show an inline note under Key, e.g. "Removed characters that keys can't contain: - !".

**Acceptance criteria:**
- Typing "qa-1!" shows key "QA1" and a visible note that "-" and "!" were removed.
- Typing "qa1" shows "QA1" with no note.

## NEW-26: The wizard name error stays after the name is fixed
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

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
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-038: At 375 px the ticket sheet stays half-loaded
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** https://www.streamlineos.in/build/7/issues?q=crash (Board) at 375 px (DevTools device mode, 375 × 1026) → card "R3 crash probe 6 1013" (QAB-103) | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Set device width 375. Open /build/7/issues?q=crash. Tap the card title.
2. Wait 2.5 s and again at 6.5 s; read the sheet.
3. Reload /build/7/tickets/QAB-103?returnTo=… and wait.

**Expected:** The ticket sheet shows the description, subtasks and activity within a few seconds, or a retry state.

**Actual:** Step 2: "To Do" and the title are shown, with a spinner in the body (no description, subtasks, or activity) in 2 reads over ~6 s. Step 3: the full ticket page renders in about 2 s (Description, Subtasks, Checklists, Relations, Activity). Details (Status/Priority/Type/Points/Cycle) open from the top-right icon as a bottom sheet and are fully visible.

**Retest notes:** Round 11 confirmed 3/3 (board /build/7/issues?q=R11, tap the card title of QAB-130): the sheet shows only the title and "To Do" at 0, 2.5 and 6.5 s with a grey loading dot; a reload of /build/7/tickets/QAB-130?returnTo=… renders fully.

**Likely cause:** On mobile the card tap opens the sheet with only the card data; the full ticket query is probably not started (disabled or keyed differently) in that path.

**Required fix:** Make the mobile ticket sheet fetch the full ticket the same way the full page does (same query key and enabled condition), with a skeleton while loading and a retry state on error or timeout (see B-020).

**Acceptance criteria:**
- At 375 px, tapping a board card shows description, subtasks and activity within a few seconds, without reload.
- Desktop behavior unchanged.

## B-040: Long "Draft awaiting review" text overflows the sidebar
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-041: A long unbroken ticket title overflows the Triage row
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** https://www.streamlineos.in/build/7/triage, a row whose ticket (QAB-2 in the run) has a long unbroken title. Role: Owner.

**Steps to reproduce:**
1. Give a ticket a long title with no spaces.
2. Open /build/7/triage.

**Expected:** The title wraps or is clamped inside the row; Accept and Decline stay visible.

**Actual:** The title overflows the Triage row.

**Likely cause:** The title cell lacks `overflow-wrap:anywhere` and `min-width:0`.

**Required fix:** Apply `overflow-wrap:anywhere` and a 2-line clamp to the triage title, with `min-width:0` on its flex parent.

**Acceptance criteria:**
- A 300-character unbroken title stays inside the row, clamped to 2 lines.
- Accept and Decline stay visible and clickable.

## B-050: A negative budget is blocked with no visible message
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** Budget — https://www.streamlineos.in/build/7/budget → "Set Budget" → Planned Budget | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Click "Set Budget". Type `-500` in Planned Budget. Click "Save".

**Expected:** A message such as "Budget must be 0 or more" under the input, or the minus sign is not accepted.

**Actual:** No request is sent (no PATCH). The editor stays open with -500 in the field and no message appears in the page text (the number input has min="0", so the browser's native validation probably blocks submit silently).

**Likely cause:** The input's native `min="0"` blocks submit silently.

**Required fix:** Use the shared budget rule from B-046 and show "Budget must be 0 or more" under the input on Save.

**Acceptance criteria:**
- Entering -500 and clicking Save shows "Budget must be 0 or more" and sends no request.

## B-051: Budget decimals are rounded inconsistently
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** Budget — https://www.streamlineos.in/build/7/budget | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Click "Set Budget". Enter `12.345`. Click "Save".
2. Read the "Planned Budget" and "Remaining" values.

**Expected:** The input is limited to the currency precision (2 places rejected or shown), and all figures use the same rounding.

**Actual:** `PATCH https://api.streamlineos.in/build/7/budget` → 200 `{"budget":12.35,"currency":null}`. Page shows "Planned Budget ₹12.4" and "Remaining ₹12" (three different roundings of the same value). The response has `currency: null` while the UI always shows ₹.

**Likely cause:** The server rounds to 2 places while the page uses different compact formatters for Planned and Remaining.

**Required fix:** Allow at most 2 decimal places in the input (message "Use at most 2 decimal places"), and use one currency formatter for all budget figures on the page. Do not add a currency selector; mention `currency: null` in the summary as a follow-up.

**Acceptance criteria:**
- Entering 12.345 shows a field message and sends no request.
- 12.35 saves, and Planned and Remaining both show ₹12.35.

## B-052: Large budgets show an unclear "₹1KCr" label
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-054: Delegating to the requester gives no message
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G8 Server errors mapped to visible, plain-language messages

**Where:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Delegate" → "New Approver" | Role/account: Owner qaown1012b (Owner, also the requester).

**Steps to reproduce:**
1. Open a request requested by qaown1012b. Click "Delegate". Choose "qaown1012b" as New Approver. Click "Delegate" (double-click tested).

**Expected:** Field error "The requester cannot approve their own request" or the option is hidden.

**Actual:** `PATCH https://api.streamlineos.in/build/7/approvals/1` → **400** `{"code":"BAD_REQUEST","message":"Approver cannot be the requester"}` (two requests on double-click). The dialog stays open with the same text; no message appears in its text.

**Retest notes:** Re-confirmed in round 10.

**Likely cause:** The New Approver list includes the requester, and the 400 "Approver cannot be the requester" is not shown.

**Required fix:** Leave the requester out of the New Approver options, and show any server error in the dialog under the select.

**Acceptance criteria:**
- The requester is not offered as New Approver.
- If the server returns 400, its message appears in the dialog.

## B-055: Escalate keeps Level 1
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Approvals — https://www.streamlineos.in/build/7/approvals → row "Approval actions" → "Escalate" | Role/account: Owner qaown1012b (Owner).

**Steps to reproduce:**
1. Create a milestone approval (Level 1 — Standard) on a milestone.
2. Open "Approval actions" → "Escalate" (no confirmation; runs on click).
3. Reload and read the Level column.

**Expected:** Level becomes 2 ("Escalated (department manager)") and the approver changes or is notified.

**Actual:** Status "Escalated"; Level column still "1". The menu then drops "Escalate".

**Retest notes:** Round 11 confirmed 3/3: PATCH /build/7/approvals/<id> returns 200 with status "escalated", level 1, revision 2; after reload Level "1", Status "Escalated".

**Likely cause:** The escalate handler sets the status but does not increment the level.

**Required fix:** On escalate, set level to level + 1 (respecting any maximum defined in the code) in the same update, and return it.

**Acceptance criteria:**
- Escalating a Level 1 approval returns level 2, and the row shows Level 2.
- An API test covers the increment.

## B-057: Double-click on Save/Delegate sends a second PATCH
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-063: An epic can be set to Done while linked items are open
**Severity:** Low (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Epics → "Edit" → Status → Done → "Save changes" (https://www.streamlineos.in/build/7/epics) | Role/account: Owner qaown1012b (Owner). Epic "R6 epic 1013" with linked items: "R6 epic child 1013" (Done, 3 pts), "R6 parent 1013" (To Do, 5 pts), "R6 link target 1013" (To Do, 2 pts).

**Steps to reproduce:**
1. Edit the epic, Status → Done, Save changes.
2. Reload /build/7/epics.

**Expected:** Either blocked ("2 linked items are still open") or a confirmation that says the open items stay open; or the status is derived from the items.

**Actual:** Save returns `PATCH …/tickets/129` → **200**, no warning. After reload the card reads "Done | Urgent | 1 of 3 items | 3 / 10 pts" with "To Do (2)".

**Likely cause:** No check or warning when an epic's status changes while its linked items are open.

**Required fix:** Recommended behavior (implement, then flag): allow it, but when saving an epic as Done with open linked items, show a confirmation "N linked items are still open. Mark the epic Done anyway?" with Cancel and Mark Done. No server change.

**Acceptance criteria:**
- Saving an epic as Done with 2 open items shows the confirmation naming 2 items; Cancel keeps the old status.
- Confirming saves Done.
- No confirmation when all items are done.

## B-064: The epic Link picker lists only stories
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

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

## B-068: The release list preview shows escaped HTML entities
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** Releases list → row preview under the version (https://www.streamlineos.in/build/7/releases) | Role/account: Owner qaown1012b (Owner). Release "R6 release 1013" with notes typed as `"><img src=x onerror=alert(1)> R6 XSS probe`.

**Steps to reproduce:**
1. Create the release with the notes above (or edit the notes). Look at the row preview.
2. Open Edit and read the Release Notes editor.

**Expected:** The preview shows `"><img src=x onerror=alert(1)> R6 XSS probe` as plain text (no entities), the same as the editor.

**Actual:** The editor shows `"><img src=x onerror=alert(1)> R6 XSS probe` (correct, no element created, no dialog). The list preview shows `"&gt;&lt;img src=x onerror=alert(1)&gt; R6 XSS probe` — the stored HTML (`<p>&quot;&gt;&lt;img …</p>`) is printed as text with its entities.

**Likely cause:** The preview strips tags from the stored HTML but does not decode entities.

**Required fix:** Convert the stored HTML to plain text with a method that also decodes entities (e.g. DOMParser textContent, or an existing html-to-text helper), then truncate. Do not render the HTML.

**Acceptance criteria:**
- Notes typed as `"><img src=x onerror=alert(1)> R6 XSS probe` show exactly that text in the preview, with no "&gt;" or "&lt;".
- No image element is created and no script runs.

## B-069: Timeline bars cannot be dragged
**Severity:** Low (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** /build/7 Timeline view. Role: Owner.

**Steps to reproduce:**
1. Open the Timeline with a ticket that has start Oct 19 and due Oct 22 (QAB-113 in the run).
2. Drag the bar left or right, or drag its edges.

**Expected:** The dates update, or the bars are clearly not draggable (no grab cursor).

**Actual:** The bar never moves (6 attempts), and a mouse-up on a bar sometimes opens the ticket.

**Likely cause:** Drag-to-reschedule is not implemented; bars only have a click handler.

**Required fix:** Recommended smallest behavior (implement, then flag): make bars clearly click-only: pointer cursor (not grab), a tooltip "Click to open. Change dates in the ticket.", and open the ticket only on a click without pointer movement. Do not build drag-to-reschedule here unless the timeline component already has drag support that only needs wiring to the date PATCH.

**Acceptance criteria:**
- Bars show a pointer cursor and a tooltip explaining how to change dates.
- A drag gesture on a bar does not open the ticket; a plain click does.

## B-071: Deleting a parent gives no warning about its children
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Ticket page → "Delete ticket" (trash icon) → "Delete Ticket" popover (https://www.streamlineos.in/build/7/tickets/QAB-117) | Role/account: Owner qaown1012b (Owner). QAB-117 "R6 link target 1013" had one child, QAB-115 "R6 epic child 1013" (1/1 Done in the Subtasks header), plus a Blocks/Relates-to link set.

**Steps to reproduce:**
1. Open QAB-117. Confirm the Subtasks header shows "1/1" with QAB-115.
2. Click the trash icon ("Delete ticket"). Read the confirmation.
3. Click "Delete".
4. Open QAB-115 and QAB-113 and read the Parent field and Relations.

**Expected:** The confirmation names the child count and says what happens to children (kept without parent, or blocked until they are moved). The child keeps a visible notice or history entry.

**Actual:** Confirmation: "Delete Ticket — This cannot be undone." (no mention of the child). `DELETE https://api.streamlineos.in/build/7/tickets/128` → **204**, toast "Ticket deleted", redirect to /build/7/issues. QAB-115 still exists, Done, Parent field now "Add parent" (empty). The "Relates to" and "Blocked by" links to QAB-117 were removed from QAB-113 and QAB-115 too. No history entry about the parent change was seen on QAB-115.

**Likely cause:** The delete confirmation does not read the subtask count, and the server clears the children's parent without history.

**Required fix:** When the ticket has children, add to the Delete Ticket confirmation: "This ticket has N subtasks. They will be kept without a parent." Write a history entry on each child when its parent is cleared (reuse the B-082 history writing).

**Acceptance criteria:**
- Deleting a ticket with 1 child shows the child count in the confirmation.
- After the delete, the child's history shows that its parent was removed.

## B-072: The parent picker offers the ticket's own child
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Ticket Details → Parent picker (https://www.streamlineos.in/build/7/tickets/QAB-113 and /QAB-116) | Role/account: Owner qaown1012b (Owner). QAB-114 is a child of QAB-113 (set from QAB-114 → Parent). QAB-115 is a child of QAB-116.

**Steps to reproduce:**
1. Open QAB-113 → Parent → "Add parent" → search "R6 workload" (the list shows QAB-114 "R6 workload B 1013"). Select QAB-114.
2. Read the toast and the picker.
3. On QAB-116 (child QAB-115 "R6 epic child 1013"), Parent → search "R6 epic child" → select QAB-115.

**Expected:** The child-tickets of the current ticket are not offered as parents (as self is not offered), or the choice is refused with a message that names the reason and the picker closes.

**Actual:** Step 1: the list offers QAB-114. Selecting it sends `PATCH https://api.streamlineos.in/build/7/tickets/124` → **400** `{"code":"BAD_REQUEST","message":"Cannot set parent: this would create a cycle"}`; toast "Cannot set parent: this would create a cycle"; the Parent field stays "Add parent". The picker stays open with the same item listed. Step 3: the same toast appeared again (the response was not captured on that run; the toast was seen), and the picker stayed open. Self (QAB-113 on its own picker) is not offered (PASS).

**Likely cause:** The picker excludes the ticket itself but not its descendants; the 400 leaves the picker open.

**Required fix:** Exclude descendants of the current ticket from its Parent picker. On a 400, close the picker and show the message next to the Parent field.

**Acceptance criteria:**
- A ticket's children and grandchildren are not listed in its Parent picker.
- If the server still returns 400, the picker closes and the message shows.

## B-073: "Add subtask" cannot attach an existing ticket
**Severity:** Low (CONFIRM INTENDED: implement the recommended behavior and flag it in your summary)
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-077: A past approval due date is accepted, and the date format is inconsistent
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G4 Shared field validation (client AND server)

**Where:** https://www.streamlineos.in/build/7/approvals, "Request approval" dialog (due date) and the approvals list. Role: Owner.

**Steps to reproduce:**
1. Request an approval with due date 2026-10-01 (in the past).
2. Submit.
3. Read the due date in the list.

**Expected:** Past dates are blocked the same way the milestone date picker blocks them, and the list shows dates in the app's normal format (e.g. "Oct 1, 2026"), or "—" when empty.

**Actual:** The request is saved with 201. The list shows the raw ISO date, while other rows show "—".

**Likely cause:** The approval date picker has no minimum date (the milestone picker does), the server has no check, and the list prints the raw value.

**Required fix:** Disable past days in the approval due-date picker (same rule as milestones), reject past due dates on create with 400 on the server, and format the list date with the app's standard date formatter.

**Acceptance criteria:**
- Past days are disabled in the approval due-date picker.
- A direct create with a past due date returns 400.
- The list shows due dates like "Oct 20, 2026", and "—" when empty.

## B-079: Links added in the Create dialog cannot be removed
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G10 Ticket relations, parents and history

**Where:** Create Issue dialog (Links), then the ticket page right-hand "Links" list. Role: Owner.

**Steps to reproduce:**
1. Open Create Issue, add a related link (URL https://example.com/r11-link-1, label "R11 link 1"), click "Create issue" (201; `POST /build/7/tickets/:id/related-links` 201).
2. Open the new ticket.
3. Look for an edit or remove control on the link.

**Expected:** The link can be removed (and ideally edited) from the ticket page.

**Actual:** The link shows only in the right-hand "Links" list (not under Relations), and the item has no edit or remove control. Round 11 confirmed 3/3.

**Likely cause:** The Links list renders read-only items; no delete/update call is wired for related links.

**Required fix:** Add a remove control (and edit, if an update endpoint exists) to each item in the ticket Links list, calling the related-links delete endpoint (search `related-links` in the API; add a DELETE route only if it is missing). Show it only to users who can edit the ticket.

**Acceptance criteria:**
- Each link in the Links list has a remove control with an accessible name like "Remove link R11 link 1".
- Removing sends one request (2xx); the link disappears without reload and stays gone after reload.
- Users without edit rights do not see the control.

## B-080: The Timeline month label is off by one
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending

**Where:** /build/7 Timeline view, month dropdown. Role: Owner.

**Steps to reproduce:**
1. Open the Timeline.
2. Select November in the month dropdown, then December.

**Expected:** The dropdown shows the selected month.

**Actual:** Selecting November shows "October", and selecting December shows "November". The grid itself is correct.

**Likely cause:** An off-by-one month index (0-based vs 1-based) or a timezone shift when building the label date.

**Required fix:** Build the label from the same date the grid uses, with the correct month index, in local time.

**Acceptance criteria:**
- Selecting November shows "November"; the same holds for every month, including January and December.

## B-081: The Sub-issues toggle has no effect
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G7 List/board query options (sort, columns, sub-issues, filters)

**Where:** https://www.streamlineos.in/build/7/issues?view=table, Display options, SHOW, "Sub-issues" switch. Role: Owner.

**Steps to reproduce:**
1. Have a parent ticket with a child (round 11: QAB-130 with child QAB-131).
2. Open /build/7/issues?view=table&q=R11.
3. Turn "Sub-issues" off, then on.

**Expected:** With Sub-issues off, child tickets are not listed as separate rows.

**Actual:** The child row is listed with the switch off and on. Round 11 confirmed 3/3.

**Likely cause:** The toggle state is not passed to the tickets query or the client filter.

**Required fix:** When Sub-issues is off, exclude tickets that have a parent (use a server filter if one exists, otherwise add a small one to the tickets list query), and keep the toggle in the URL/view state like the other display options.

**Acceptance criteria:**
- With Sub-issues off, child tickets are not listed; with it on, they are.
- The setting survives a reload.

## B-082: Parent and relation changes leave no history entry
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
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

## B-083: At 375 px "Completed" is cut off in Statuses
**Severity:** Low
**Status:** FIXED — code and tests landed; browser verification pending
**Shared root cause group:** G9 Narrow-viewport layout (375/768 px) and long text

**Where:** Build settings — https://www.streamlineos.in/build/7/settings (tab "Statuses"), Chrome device mode 375 px. | Role/account: Owner qaown1012b.

**Steps to reproduce:**
1) Open /build/7/settings at 375 px width. 2) Open the "Statuses" tab. 3) Read the status rows.

**Expected:** Status names and their controls fit the 375 px width, or wrap.

**Actual:** Some status row text is cut at the right edge (run-note observation). The General, Labels, Custom Fields, Teams & Roster and Danger Zone tabs looked fine.

**Retest notes:** Round 11 confirmed 3/3: /build/7/settings?section=statuses, "Workflow Statuses" card. The DONE row's category select shows "Complet..."; status names are not cut, the category control is.

**Likely cause:** The category select has a fixed narrow width in the status row at small widths.

**Required fix:** Let the status row wrap at small widths, or give the category select enough width to fit its longest option.

**Acceptance criteria:**
- At 375 px the DONE row category reads "Completed" in full.
- Other rows and the desktop layout are unchanged.

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
