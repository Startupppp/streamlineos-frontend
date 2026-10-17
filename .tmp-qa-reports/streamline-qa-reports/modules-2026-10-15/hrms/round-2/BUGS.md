# HRMS QA Round 2 — BUGS (2026-10-15)

Environment: https://www.streamlineos.in — org "ADitay CAhala" — actor: owner adityachalla01 (signed-in owner session, ONE tab).
Test prefix: QA1015R2. Test mail: @sharklasers.com only. No payments, no payroll runs, no real employee terminated.
Source: round-1 BUGS.md (HRM-B-001..008) + HR-B recheck list from hrms-2026-10-14/HR-BUGS.md.
Severity scale: Blocker / Critical / High / Medium / Low / Low-Medium.

## Recheck table (round-1 HRM-B-001..008)

| ID | Round-1 title | Round-2 status | Evidence (15 Oct, this round) |
|---|---|---|---|
| HRM-B-001 | Positions Status dropdown has no options | STILL OPEN | Create position → Status dropdown opens with zero options (3 attempts; third attempt with title filled shows "Status is required"). |
| HRM-B-002 | Onboarding Pay: blank → -5 advances to Review | FIXED | Blank → -5 → Next: stays on Pay step with "Salary cannot be negative". 50000 → select-all → -5 → Next: blocked with same message. Positive 50000 → Next advances to Review. |
| HRM-B-003 | Second attendance correction for same date fails silently | FIXED | Second correction for 15 Oct with a pending one: POST /me/attendance/regularizations 400 and toast "A pending regularization already exists for this date."; sheet stays open with the reason. |
| HRM-B-004 | Leave form says owner approves own leave vs Approvals "Needs another approver" | CHANGED — now a new High bug (see HRM-B-010) | Form copy still reads "adityachalla01 approves their own leave request as the organisation owner". Approvals now shows Approve/Reject on the owner's own leave (no "Needs another approver"). Copy and action now agree, but self-approval succeeded (see HRM-B-010). |
| HRM-B-005 | Leave list "No leave requests" after submit until reload | FIXED | After "Leave requested successfully!" (POST /me/time-off 201) the new row appeared in Leave Requests and My leaves with no reload. |
| HRM-B-006 | Half Day Allowed OFF→ON on reopen | STILL OPEN (reproduced twice) | Created two drafts (QA1015R2 Half Day Probe, and Probe B) with all four switches OFF; reopening shows HALF DAY ALLOWED = ON both times. Toggling it OFF on a draft and Save Changes then reopening shows OFF (persists). So the bug is on create / first save. |
| HRM-B-007 | Holidays October empty after "Holiday added" | FIXED | Added "QA1015R2 Holiday" 22 Oct: October list and calendar dot update at once; "No holidays in October" gone with no reload. |
| HRM-B-008 | Department 1-char name not blocked; 15–20 s save | PARTIAL — still open | Name "A" passes client validation with no message and is saved (row "A / QA1015R2A"). Save busy state lasted about 5 s this time (was 15–20 s), dialog closes on success. Test row archived afterwards. |


### Other round-1 / HR-B rechecks in this pass

| ID | Title | Round-2 status | Evidence |
|---|---|---|---|
| HR-B-014 | Leave balance jumps 0 → 11 after 1-day Casual approved | STILL OPEN | Before approval: Available Days 0. After approving a 1-day Casual leave (Oct 21): Available Days 11, card "Casual 11/12 days available", no proration label. Approved (YTD) 1. |
| HR-B-009 | Approve shows ApiContractError though applied (attendance) | NOT TESTABLE THIS PASS | Needs an approvable correction raised by another person; the only pending corrections are the owner's own (see HRM-B-010 / HR-B-008). | Not re-approved an attendance correction this pass (pending items are owner's own and cannot be approved by owner — see HR-B-008 row). |
| HR-B-008 | Requester can approve own attendance correction | UI VERIFIED (attendance); leave self-approval still possible (HRM-B-010) | On own attendance corrections (14 Oct and 15 Oct, pending) the card shows "Needs another approver" with no Approve/Reject. Server-side enforcement cannot be tested from the browser without direct API calls. Note: leave self-approval is NOT blocked (HRM-B-010). |
| HR-B-013 | Correction rejects morning check-in as future (UTC vs IST) | LIKELY FIXED (partial evidence) | 15 Oct correction 09:00–18:00 IST was accepted by time validation; the only rejection was "A pending regularization already exists for this date." (400). Future-time check still to be run with a late-evening time. |
| HR-B-004 (dept) | Raw Zod message on department name | PARTIAL (see HRM-B-008) | No raw "Too small" text seen; the 1-char name is accepted instead (HRM-B-008). |
| HR-B-016 | Leaves Error intermittent after write | NOT SEEN | Leave tabs reloaded many times, no error banner. Leave tabs reloaded several times this pass without error. |
| HR-B-024 | Exit: Submit resignation only for signed-in user | NOT RE-RUN (see Page: Exit) | |
| HR-B-017 | Department archive dependency contract error | FIXED | Unused dept "A (QA1015R2A)": dependency check passed, Archive confirmed, moved to archived. Used dept "QA1015 Dept": dialog now says "Cannot archive department — still in use" listing 2 direct people, 2 member profiles, 2 employee assignments. Nothing archived (Close). |
| HR-B-020 / HR-B-021 | Expense max amount / minus sign | FIXED (client; server max not verified) | Amount field (Add expense, not submitted): "-5" → "Amount must be a positive number"; "abc" → same; "0" → "Amount must be greater than 0"; 14 nines kept and → "Amount must be ₹10,00,000 or less" (no silent truncation). Server-side max not verifiable without submitting a huge claim. |
| HR-B-022 | Asset return does not unassign | FIXED | Assigned QA1015 Laptop to QA1015 Member → Log return (POST 201, Pending) → Received → Confirm. Asset list then Available / Unassigned, Assigned 0. |

---

## Page: Leaves (/hr/leaves)

### HRM-B-009: Overlapping leave request fails with HTTP 400 and no visible message
- **Severity:** Medium
- **Route:** /hr/leaves → Request leave (owner, "Casual Leave")
- **Actor:** owner adityachalla01
- **Setup:** A pending Casual Leave for 28–30 Oct 2026 exists (QA1015R2 over-balance probe / "Oct 28 – Oct 30", 3 days, Pending).
- **Steps:**
  1. Click Request leave. Leave type Casual Leave. From 29 Oct, To 29 Oct. Reason "QA1015R2 overlap probe".
  2. Click Submit leave request.
  3. Read the sheet and the page within 2 s (toasts included).
- **Expected:** Request blocked with a visible message such as "You already have a leave request for 28–30 Oct 2026" (inline or toast), sheet open with the message.
- **Actual:** `POST /me/time-off` → **400**. Sheet stays open, no inline error, no toast; the Submit button spinner ends and nothing else changes. Same silent pattern as HRM-B-003 before its fix.
- **Impact:** User cannot tell whether the request was saved; they retry or give up. Overlap rules are invisible.
- **Likely code area:** Leave request create handler (`/me/time-off` overlap validation returns 400 with a message body) and the client mapper for leave create (only success / balance errors are shown). Same mapper family as the attendance fix for HRM-B-003.
- **Suggested fix:** Map 400 bodies to a toast and an inline field error for the date range; add a specific overlap message naming the conflicting dates; keep the sheet open. Add an API test for overlap and a UI test asserting the message.
- **Acceptance check:** Overlapping 29 Oct request → visible "overlaps" message naming 28–30 Oct; sheet remains open; no new row created; non-overlapping 1 Nov request still submits.

### HRM-B-010: Owner can approve their own leave request (self-approval) and it is applied
- **Severity:** High (segregation-of-duties bypass; the approval changes leave balance and LOP inputs)
- **Route:** /hr/leaves?tab=approvals → Leave Requests → Approve (own request)
- **Actor:** owner adityachalla01 (requester and approver)
- **Steps:**
  1. Submit a Casual Leave for 21 Oct 2026 (1 day) as the owner. Reason "QA1015R2 leave approve probe".
  2. Open Approvals. The card shows **Approve** and **Reject** on the owner's own request.
  3. Click Approve → confirm Approve.
- **Expected:** Self-approval blocked, as attendance corrections are (own correction shows "Needs another approver" with no action, see HR-B-008 row), e.g. "You cannot approve your own leave request". Or, if the owner exception is intended, the policy must be explicit and audited.
- **Actual:** Toast "Request approved successfully". Row shows **Approved** / "Approved by adityachalla01". Available Days goes 0 → 11 (see HR-B-014 row). My leaves shows "Approved".
- **Impact:** The owner can approve their own leave with no second approver; approval drives balance and payroll LOP inputs. The form copy says the owner approves their own leave, while attendance SoD blocks the same actor. Product must confirm the rule; right now the two modules disagree.
- **Likely code area:** Leave approve endpoint (server requester≠approver check missing or bypassed for org owners) and the Approvals card action gating (`isOwner` shortcut). Leave form helper text.
- **Suggested fix:** Decide the rule. Recommended: server rejects approve/reject where approver == requester (403 with message) unless an explicit "owner may self-approve" setting is on; hide Approve/Reject on own requests (match attendance); audit both actor IDs. Update the form copy to match.
- **Acceptance check:** Owner's own pending leave shows no Approve/Reject (or a disabled state with "Needs another approver"); a direct approve call returns 403; a leave by another employee can still be approved by owner.

### HRM-B-011: Leave request form promises a balance overrun can be submitted, but the server blocks it with a different message
- **Severity:** Low-Medium
- **Route:** /hr/leaves → Request leave → dates beyond balance
- **Actor:** owner adityachalla01 (Casual Leave, 11 days remaining)
- **Steps:**
  1. Set From 27 Oct, To 11 Nov 2026 (12 days). Reason "QA1015R2 over-balance probe 17 days".
  2. Read the inline note. Click Submit leave request.
- **Expected:** Either blocked up-front with a clear message, or allowed with the note's promise. One rule only.
- **Actual:** The note reads "This will consume 12 days of your 11 remaining Casual Leave days. This exceeds your balance by 1 day." and the hint says "You can still submit ... may affect LOP". On submit the server returns a toast "Insufficient leave balance. Available: 11.00, Requested: 12" and nothing is created. For 13 days the client says "Casual Leave cannot exceed 12 days. You selected 13 days." instead, so the rule text changes with the number of days.
- **Impact:** Users read contradictory guidance; the "may affect LOP" hint suggests overspend is allowed, yet it is refused. Three different messages for one rule.
- **Likely code area:** Leave request form validation (client balance hint vs per-request max 12 vs server balance check).
- **Suggested fix:** Use one message source from the server: block with "Requested 12 days exceeds available 11" inline, and drop the "You can still submit" text when the policy blocks overspend. Keep the hint only where overspend is actually allowed.
- **Acceptance check:** Same request gives the same message in the note, the field error and the submit result; the "may affect LOP" hint shows only when overspend is permitted.

## Page: Onboarding (/hr/onboarding)

### HRM-B-012: Joining date defaults to 14 Oct 2026 (yesterday) on the Job Details step
- **Severity:** Low-Medium (wrong default joining date; feeds proration, see HR-B-014)
- **Route:** /hr/onboarding → Single employee → Job Details → Joining Date
- **Actor:** owner adityachalla01
- **Steps:** Open Single employee, complete Personal, open Job Details. Read Joining Date. (Review step on this run also shows "Joining: October 14th, 2026".)
- **Expected:** Default is today (15 Oct 2026, IST), per the calendar's "today" marker on 15 Oct.
- **Actual:** Default "October 14th, 2026". The leave calendar on the same day marks 15 Oct as today.
- **Impact:** New hires get joining date one day early by default. Affects tenure, proration and the first-day attendance/leave checks.
- **Likely code area:** Onboarding form default (`new Date()` in UTC or date-minus-one helper). Compare with the leave calendar "today" helper.
- **Suggested fix:** Use the org timezone (Asia/Kolkata) "today" for the default; test with TZ=Asia/Kolkata at 00:30 and 23:30 IST.
- **Acceptance check:** On 15 Oct 2026 IST, the Joining Date default reads 15 Oct 2026 and the review step matches.

### HRM-B-013: Personal step shows "Numbers are not allowed in names" for a name containing <script> tags
- **Severity:** Low
- **Route:** /hr/onboarding → Personal → First Name
- **Steps:** Type `<script>alert(1)</script>` into First Name; click Next.
- **Expected:** A message that matches the problem (e.g. "Angle brackets and script tags are not allowed in names"), or the characters rejected as typed.
- **Actual:** The field keeps the raw text; the message is "Numbers are not allowed in names", which describes a different rule. Next is blocked (no stored record).
- **Impact:** Wrong guidance; users remove digits they did not type. Rendering was not exposed (no record created), so no XSS observed here.
- **Likely code area:** Name field validation (one regex fails with a generic message; sanitiser not mapped to a message).
- **Suggested fix:** Separate messages per rule (letters only / no markup); reject `<`, `>` at input with a specific message.
- **Acceptance check:** `<script>` name → "Angle brackets are not allowed in names"; digits name → digits message.

### Passed checks on this page (no bug)
- Duplicate Employee ID `QA1015-EMP` (existing employee) → POST /hr/employees/onboard 409 with toast "Employee ID "QA1015-EMP" is already in use in your organization." PASS.
- Name of 300 characters → "First name must be at most 100 characters" PASS (but the field accepts 300 chars with no maxLength; see UX).
- Bad email `qa1015r2-bad-email` and `qa1015r2@sharklasers` → "Enter a valid email" PASS.
- Date of birth picker only offers years 1940–2010 (age 16+ enforced by range); future DOB not selectable. PASS.
- Salary negative: blocked (HRM-B-002 fixed).
- Employee created: QA Probe Pay, Employee ID QA1015R2-P01, email qa1015r2pay@sharklasers.com, status Active, invite sent. Test record kept (see TEST-DATA.md).


## Page: Documents (/hr/documents)

### HRM-B-015: Uploading a .exe is accepted into the picker, then the server returns 400 and the sheet shows nothing
- **Severity:** Medium
- **Route:** /hr/documents → Upload → Upload Document sheet
- **Actor:** owner adityachalla01
- **Fixture:** /workspace/streamline-qa/fixtures/qa-test.exe (14 bytes, plain text)
- **Steps:**
  1. Click Upload. In the file picker choose qa-test.exe (the input's accept list is .pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp).
  2. Read the selection area and the sheet.
  3. Fill Document Name "QA1015R2 exe probe", Type Contract. Click Upload Document.
- **Expected:** Rejected at selection with a message such as "EXE files are not allowed. Use PDF, DOC, XLS, PNG, JPG." Or, if accepted, saved. Never silently dropped.
- **Actual:** The file is listed as "qa-test.exe, 0 KB" with no warning. On submit `POST /storage/upload` → **400**. No toast, no inline error; the sheet stays open with the file still listed and the button back to "Upload Document".
- **Impact:** Users believe the upload worked or retry blindly; the file type rule is not stated at the point of choice. The 0 KB label for a 14-byte file is also wrong.
- **Likely code area:** Upload sheet file-type check (accept list not enforced in the drop/choose handler) and storage upload error mapping (400 body not shown).
- **Suggested fix:** Validate type and size on selection against the same list the server uses; show a row-level error on the file; map the 400 body to a toast and keep the message visible. Show sizes in KB with one decimal (or "< 1 KB").
- **Acceptance check:** Choosing qa-test.exe shows "Not allowed: .exe" on that row and disables Upload; no POST is sent; a PDF still uploads (201).

### HRM-B-016: Uploading a 0-byte file is accepted into the picker, then fails silently with 400
- **Severity:** Medium
- **Route:** /hr/documents → Upload → Upload Document sheet
- **Fixture:** /workspace/streamline-qa/fixtures/empty-0byte-0913.pdf (0 bytes)
- **Steps:** Choose the 0-byte PDF; Document Name "QA1015R2 empty probe", Type Contract; click Upload Document.
- **Expected:** Rejected on selection: "File is empty. Choose a file with content." No request sent.
- **Actual:** File listed as "empty-0byte-0913.pdf PDF 0 KB". Submit shows "Uploading 1 of 1: empty-0byte-0913.pdf" for about 2 s, then the button returns to "Upload Document". `POST /storage/upload` → **400**. No message; sheet stays open with the file still listed.
- **Impact:** Silent failure; users may think the document is stored, or retry several times. Empty files may also pollute the library if the server later accepts them.
- **Likely code area:** Same upload handler as HRM-B-015 (no size > 0 check; error path not surfaced).
- **Suggested fix:** Client check size > 0 with message; server returns a typed error body that the sheet displays; keep the file row with the error.
- **Acceptance check:** 0-byte file → inline "File is empty" on the row, no POST; a non-empty PDF uploads with 201 and appears in the list.

### HRM-B-017: Document Name entered in the upload sheet is not what the library lists (list shows the file name)
- **Severity:** Low
- **Route:** /hr/documents → Upload → then the Documents table
- **Steps:** Upload valid-doc-0913.pdf (valid PDF fixture, 310 B) with Document Name "QA1015R2 valid doc". Reload.
- **Expected:** Row shows "QA1015R2 valid doc" (the name typed) with the file as a secondary detail.
- **Actual:** `POST /storage/upload` 201. The table row shows "valid-doc-0913.pdf" in the name column. Opening Edit shows DOCUMENT NAME = "QA1015R2 valid doc", so the name was stored but not displayed in the list.
- **Impact:** Users cannot find documents by the name they gave; the list and edit dialog disagree.
- **Likely code area:** Documents table name column (binds file name, not `title`/`name`).
- **Suggested fix:** Display the document name in the name column, file name in a secondary line.
- **Acceptance check:** After upload, the row name equals the Document Name typed; the file name appears beneath it.

### Recheck HR-B-012 on Documents
- The Letters section and the main table show "Loading results…" with placeholder headers (Template / Type / Generated By / Date) for 3+ s after load. Same family as HR-B-012. Status: STILL SEEN (see recheck table).


## Page: Onboarding — Bulk upload (/hr/onboarding → Bulk upload)

### HRM-B-018: A bulk file with one row of extra columns (or an unclosed quote) shows no preview and no error
- **Severity:** Medium (silent; a 100-person file can look "stuck" with no reason)
- **Route:** /hr/onboarding → Bulk upload → Upload file
- **Fixtures:** `generated-qa1015r2/QA1015R2-bulk-employees.csv` (unclosed quote on line 3, extra columns on line 4); `generated-qa1015r2/QA1015R2-bulk-noquote.csv` (extra-column row on line 4, no quote problem)
- **Steps:** Reload /hr/onboarding, choose Bulk upload, upload the file. Wait 7 s.
- **Expected:** Either a preview with the row errors, or a file-level message such as "Row 4 has 9 columns; expected 7" / "Unclosed quote on line 3". Never nothing.
- **Actual:** No preview, no error, no toast. The drop zone stays as it was before the upload. The same file with the extra-column row removed (`QA1015R2-bulk-clean.csv`) produces a preview straight away, so the extra-column row is the trigger.
- **Impact:** Users cannot tell whether the upload was read; they retry or give up. Related to HR-B-023 (unclosed quote merges lines).
- **Likely code area:** Bulk onboarding CSV parser (row-width check throws and the error is swallowed) and the upload handler (no catch → UI)
- **Suggested fix:** Parse with a CSV library that reports row number and column count; show a file-level error banner naming the first bad line; never leave the state blank.
- **Acceptance check:** Upload the two fixtures above → each shows a banner naming line 3 / line 4 and the expected column count; the clean file still previews.

### HRM-B-019: A file with the wrong template (task-tracker CSV) previews 13 identical "firstName is required" errors
- **Severity:** Low-Medium
- **Route:** /hr/onboarding → Bulk upload
- **Fixture:** `generated-qa1015r2/QA1015R2-import-edge.csv` (headers `title,type,priority,status,points`)
- **Steps:** Upload the file.
- **Expected:** One file-level error: "Header mismatch: missing firstName, lastName, email, designation, department. Download the template." No row list.
- **Actual:** "13 rows · 0 ready to create · 13 held back". Every row says "firstName is required / lastName is required / email is required / designation is required / department is required" with empty Employee cells. Button shows "Create 0 employees". Nothing was created.
- **Impact:** The real problem (wrong file) is hidden behind 13 repeated row errors.
- **Likely code area:** Bulk onboarding header validation (headers not compared with the template before row validation).
- **Suggested fix:** Validate headers first and show the missing and unexpected column names in one banner; disable Create until the header is valid.
- **Acceptance check:** Wrong-header file → single banner with the missing column list; no per-row errors.

### Recheck HR-B-023 (bulk onboarding: merged lines and preview errors)
- PARTIAL. Row-level errors are now listed in full: row 2 of `QA1015R2-bulk-clean.csv` shows "invalid email", "invalid joiningDate format (use YYYY-MM-DD)" and "invalid phone number" together (fixed for the multi-error part). Blank row is dropped. Unknown department is flagged ("unknown department \"NoSuchDept\""). The unclosed-quote case still gives no preview at all (see HRM-B-018), so the "merged row" problem cannot be seen; treated as PARTIAL.
- Preview of the clean file: row 1 warns FALLBACK_ASSIGNED to adityachalla01 (correct). Nothing created (Clear used).


### Other HR-B rechecks
| ID | Title | Round-2 status | Evidence |
|---|---|---|---|
| HR-B-012 | Asset Returns "Loading results…" / Column 1–4 placeholders | PARTIAL | Headers now real (Asset, Employee, Status, Condition, Date) and the empty state works, but the table takes about 15–20 s to resolve with "Loading results…" shown first. Documents page shows the same loading placeholder for several seconds (HRM-B-015 section). |
| HR-B-025 | Termination completion leaves employee Active | NOT RE-RUN | Not run: would terminate a real or test employee; out of scope (no real employee may be terminated). The existing completed termination (QA HR Thirteen, round 1 owner run) is unchanged. |
| HR-B-010 | Attendance UTC vs IST | NOT REPRODUCED THIS PASS | Owner's clock-in still shows 3:51 am (IST clock-in from round 1); no new clock punches made. Not re-tested. |

## Page: Asset returns (/hr/asset-returns) — HR-B-012 / HR-B-022

No new bug. Rechecks above. Note: Assign picker on /hr/assets omits pending-invite employees (UX Good-to-have #1 from round 1 still applies).

## Page: Documents / Assets / Expenses / Holidays — passes

- Holidays: add, duplicate-name rejected ("A holiday with this name already exists on this date."), double-click submit created exactly one entry (PASS), delete works.
- Expenses amount field: validation messages correct (see HR-B-020/021 row).

## Page: Employee directory / profile (/hr/employees)

### HRM-B-020: Person side sheet shows the manager as a raw UUID
- **Severity:** Low. **Route:** /hr/employees → click QA Probe Pay card → side sheet "Reports to d7190b52-c9e6-43ec-ac3c-ad2e9cbb60b5".
- **Expected:** Manager name "adityachalla01". **Actual:** raw UUID (the full profile page shows the name). **Impact:** unreadable. **Likely area:** side-sheet subtitle uses managerId not name. **Fix:** map to display name. **Acceptance:** sheet shows the name.

### HRM-B-021: Same person shows different status labels
- **Severity:** Low. **Route:** /hr/employees vs profile.
- **Actual:** directory card and side sheet say "Pending invite"; profile header says "Active" with "Invite sent". **Expected:** one employment status and one invite status, labelled separately. **Fix:** split the badges. **Acceptance:** same labels on all three views.

### HRM-B-022: Unknown employee deep link gives generic 404; unknown employeeId on termination is silent
- **Severity:** Low. **Routes:** /hr/employees/00000000-0000-4000-8000-000000000000 and /hr/employees/not-a-real-id → app-level "Page Not Found". /hr/termination?employeeId=00000000-… → list loads with no notice that the employee does not exist.
- **Expected:** "Employee not found" with Back to directory; termination form not pre-filled silently. **Fix:** a not-found state inside the shell. **Acceptance:** bogus ID shows that message.

### Search latency (directory)
- Typed search results take about 2.5–3.8 s to update with no loading state. Tracked in UX.md. Results themselves were correct (QA1015R2, email, full ID, '<script>' → 0 results).

### Export (directory)
- Export click shows "Export queued"; no file in /home/box/Downloads after 20 s. Not verified end-to-end.

## Page: Leaves — pass notes
- Leave list refreshes after submit (HRM-B-005 fixed). Reject with reason works (Oct 26 test). Approve works (and self-approval, see HRM-B-010).
