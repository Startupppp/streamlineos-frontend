# hr — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## HR-B-001 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-001 | Medium | Employee name fields drop apostrophes/hyphens/accents on typing and discard whole value on paste |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-001: Employee name fields drop apostrophes, hyphens and accented letters when typed, and discard the whole value when pasted
- **Severity:** Medium (corrupts legal names on the employee master record)
- **Route:** /hr/onboarding → tab "Single employee" → step 1 "Personal" (First Name / Last Name)
- **Actor:** owner qaown1012b
- **Steps:**
  1. Open /hr/onboarding, click "Single employee".
  2. In "Last Name", type `O'Brien-Smith` one key at a time.
  3. Clear it; then set the whole value `O'Brien-Smith` in one go (paste/`fill`). Repeat with `Ñúñez`.
- **Expected:** Legitimate name characters (apostrophe, hyphen, Unicode letters) are kept, or an inline message says which characters are not allowed. A value is never silently altered or reverted. Paste and typing behave the same.
- **Actual (observed):**
  - Typed `O'Brien-Smith` → field value `OBrienSmith` (no message).
  - Typed `Ñúñez` → field value `ez` (no message).
  - Set/pasted `O'Brien-Smith`, `Ñúñez`, `Ab1`, `<b>x</b>`, `alert(1)` → field keeps the PREVIOUS value unchanged (no message).
  - The same rule is inconsistent in the module: the Holiday Name field explicitly allows "letters, numbers, spaces, apostrophes, periods, and hyphens" (see HR-B-001 note in UI-UX-SUGGESTIONS HR-U-004).
- **Impact:** Names such as O'Brien, D'Souza, Kumar-Singh, or non-ASCII names are stored wrong or not at all. Pasting from an offer letter silently discards the name, so the record can differ from what the user pasted. Downstream exports, documents and statutory name matching (PAN/PF/ESI) inherit the wrong name. (Other free-text name fields in the module were not tested.)
- **Suggested fix:** Allow `'`, `-`, `.` and Unicode letters (`\p{L}\p{M}`), spaces, in person-name fields; validate the same rule on the server; on a rejected character show an inline error ("Names can contain letters, spaces, apostrophes and hyphens") instead of stripping or reverting; make paste and typing go through the same sanitizer.

## HR-B-002 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-002 | Low | Digits in name fields are stripped silently; then "Last name is required" shows for typed text |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-002: Digits in name fields are removed silently, and typed text then shows "Last name is required"
- **Severity:** Low
- **Route:** /hr/onboarding → Single employee → Personal
- **Actor:** owner qaown1012b
- **Steps:** Type `QA HR 1013` in First Name. Type `1013` in Last Name.
- **Expected:** Digits are accepted, or the user is told before/when they type that digits are not allowed. A required error appears only when the field is really empty.
- **Actual:** First Name becomes `QA HR` (digits removed, no message). Last Name typed as `1013` is empty and shows exactly `Last name is required`.
- **Impact:** The requested test name "QA HR 1013" cannot be entered; the user is told a required value is missing when they typed one.
- **Suggested fix:** Show an inline hint at the moment of rejection ("Numbers are not allowed in names"); compute "required" from the raw input, not the sanitized value; or allow digits if business rules permit.

## HR-B-003 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-003 | Medium | Edit employee saves a blank/whitespace Designation (required at hire) with no validation |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-003: Edit employee saves a blank/whitespace Designation without validation
- **Severity:** Medium (required field at hire is cleared; visible on the profile and in lists)
- **Route:** /hr/employees/{id} → tab "Edit" → Professional Information → Designation → "Save Changes"
- **Actor:** owner qaown1012b
- **Record:** EMP-ZH6QY8 (QA HR Thirteen) — see TEST-DATA.md
- **Steps:**
  1. Open the employee profile, click tab "Edit".
  2. Set Designation to three spaces `   `.
  3. Click "Save Changes". No alert is shown.
  4. Reload the page; click tab "Edit".
- **Expected:** Save blocked with "Designation is required" (the create flow marks Designation with *, and onboarding Job Details requires it), or the value is trimmed and rejected.
- **Actual:** Save succeeds with no message. After reload the Designation input is empty (`""`), and the profile header no longer shows a designation line (the line under the name is missing). The sibling rule works: a 300-character designation is rejected with `Designation must be at most 200 characters`.
- **Impact:** Required job data can be erased silently; reports and org chart show a blank job title.
- **Suggested fix:** Trim on the client and server, then apply the same `min(1)` rule used at hire; show "Designation is required" inline on Save.
- **Note:** I restored the designation to "QA Analyst" afterward (verified on the Edit tab before the restore; see TEST-DATA.md).

## HR-B-004 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-004 (dept) | Raw Zod message on department name | PARTIAL (see HRM-B-008) | No raw "Too small" text seen; the 1-char name is accepted instead (HRM-B-008). |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-004: Department form shows raw validation text "Too small: expected string to have >=2 characters"
- **Severity:** Low (copy/quality; exposes internal schema library messages)
- **Route:** /settings/organization/departments → "Add Department" (dialog "New Department")
- **Actor:** owner qaown1012b
- **Steps:** Click "Add Department". In "Name" type three spaces `   `. Click "Save".
- **Expected:** A single, human message such as "Name is required".
- **Actual (exact text):** Two alerts: `Name is required` and `Too small: expected string to have >=2 characters`.
- **Impact:** Users see developer-facing validation text; the message contradicts the first one.
- **Suggested fix:** Map schema errors to user copy; show one message per field ("Department name must be at least 2 characters"); trim whitespace before counting.

## HR-B-006 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-006 | Medium | Employee directory typed search with zero matches shows all employees plus "Search failed integrity check" |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-006: Typed directory search with zero matches shows all employees plus "Search failed integrity check"
- **Severity:** Medium (wrong result set displayed; misleading error)
- **Route:** /hr/employees (search box "Search name, email, or ID…")
- **Actor:** owner qaown1012b
- **Steps:**
  1. Open /hr/employees (9 employees).
  2. Type `qaown` in the search box → result 1 of 1 (works).
  3. Select all in the search box and type `zzzznomatch` (or `zz-nomatch`).
- **Expected:** `Showing 0 of 0 matching` and "No results match your filters" (this is what happens when the same URL `/hr/employees?q=zzzznomatch` is loaded fresh, and what happens for `q=` on first load).
- **Actual (exact text):** `Search failed integrity check — showing unfiltered. Report ref HRMS-SEARCH-001.` The list shows `Showing 9 of 9 matching` and all employees are displayed. The URL still reads `?q=zzzznomatch`.
- **Reproduced:** 3 of 3 in-session typed no-match searches (`zzzz-nomatch` after `qaown`; `zzzznomatch` after `qaown`; `zzz-x` as first query in a fresh page). Fresh loads of the same URLs correctly show 0 results.
- **Impact:** A search that finds nothing shows the entire directory with an error banner — users may act on the wrong person or believe the directory is broken. The "integrity check" message is not actionable.
- **Suggested fix:** Treat empty result as a valid state, not a failure; never fall back to the unfiltered list on a filter error; if the integrity check truly fails, show an error and no rows. Investigate the search-result cache keyed on the previous query (stale-response race).

## HR-B-007 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-007 | Medium | Non-night shift with End Time before Start Time passes validation and reaches "Create this shift?" |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-007: Non-night shift with End Time before Start Time passes validation
- **Severity:** Medium (invalid shift template could be created; drives attendance hours)
- **Route:** /hr/shifts → "Create shift" (sheet "Create Shift Template")
- **Actor:** owner qaown1012b
- **Steps:** Shift Name `QA Shift 1013`; Type FIXED; Start Time `18:00`; End Time `09:00`; Night Shift OFF; click "Create Shift".
- **Expected:** Blocked with an error such as "End time must be after start time, or enable Night Shift", or the Night Shift toggle is suggested.
- **Actual:** No validation message. The confirmation modal reads `Create this shift?` / `Create shift template "QA Shift 1013" (06:00 PM – 09:00 AM)?` with a "Create Shift" button. I cancelled; no template was created in this run. A correct valid shift (09:00 AM–06:00 PM) was created afterwards.
- **Impact:** Users can build a 15-hour-negative shift that breaks hours and overtime calculations if confirmed.
- **Suggested fix:** Validate `end > start` unless `nightShift` is on; block with inline error; show the computed duration in the confirmation.

## HR-B-008 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-008 | High | Requester can approve their own attendance correction (self-approval) and it is applied to the record |

Write-up from `streamline-qa-reports/hrms-2026-10-14/CLAUDE-FIX-BRIEF.md`:

## HR-B-008: Requester can approve their own attendance correction (self-approval), and it is applied
**Severity:** High | **Groups:** G1 | **Policy:** P1

**Where:** /hr/attendance → "Attendance corrections" card → Approve. Actor: owner (also the requester).

**Steps:**
1. On /hr/attendance click "Request Correction". Check-in 00:10, Check-out 00:40, reason. Submit.
2. In "Attendance corrections" ("Needs a decision") the owner's own request shows "Approve" and "Reject".
3. Click "Approve".

**Expected:** Self-approval blocked (as for leave: "Needs another approver", no action buttons); API rejects with 403 "You cannot approve your own correction".

**Actual:** Correction applied; Daily History changed to 12:10 AM / 12:40 AM (0h 30m). (Also shows the HR-B-009 error toast.)

**Likely cause:** Regularization approve/apply endpoint and card lack the requester ≠ approver check that leave has.

**Fix:** G1 guard on approve, reject and apply endpoints; card hides actions for own requests with "Needs another approver"; audit-log actor + requester. Search: "Attendance corrections", "Needs a decision", "Needs another approver", `regularizations`, `/apply`.

**Acceptance criteria:**
- Own correction: no Approve/Reject buttons; "Needs another approver" shown.
- Direct API approve/apply of own correction → 403, record unchanged.
- Another HR approver can still approve an employee's correction and it applies.
- API test covers self (403) and other (200).

## HR-B-009 — blocked, not confirmed fixed

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| HR-B-009 | Approve shows ApiContractError though applied (attendance) | NOT TESTABLE THIS PASS | Needs an approvable correction raised by another person; the only pending corrections are the owner's own (see HRM-B-010 / HR-B-008). | Not re-approved an attendance correction this pass (pending items are owner's own and cannot be approved by owner — see HR-B-008 row). |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-009: Approving an attendance correction reports "ApiContractError" even though the server applied it
- **Severity:** Medium (misleading error; users retry or abandon a completed action)
- **Route:** /hr/attendance → Attendance corrections → Approve
- **Actor:** owner qaown1012b
- **Steps:** Repeat HR-B-008 steps 1–3.
- **Expected:** Success message; card removed from "Needs a decision".
- **Actual (exact UI text, toast):** `The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.`
- **Actual (console, redacted to the essentials):** `ApiContractError` `code: CONTRACT_VIOLATION`, `endpoint: /hr/attendance/regularizations/2/apply`, `status: 200`, issue `path: payrollInputRebuild — "Invalid input: expected boolean, received object"`. Correlation id `dc5b7c59-04ac-40a2-8878-45d32be530fb`.
- **Impact:** The client and server contract for `regularizations/{id}/apply` has drifted (`payrollInputRebuild` is an object in the response but a boolean in the client schema). Users see an "out of date app" error for a successful write; retries risk duplicate effects.
- **Suggested fix:** Align the response schema (`payrollInputRebuild` as the agreed type, or make the client accept both); add a contract test for the apply endpoint; show success when the server returns 200 with a valid action payload.

## HR-B-010 — not reproduced, not confirmed fixed

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-010 | Attendance UTC vs IST | NOT REPRODUCED THIS PASS | Owner's clock-in still shows 3:51 am (IST clock-in from round 1); no new clock punches made. Not re-tested. |

Write-up from `streamline-qa-reports/hrms-2026-10-14/CLAUDE-FIX-BRIEF.md`:

## HR-B-010: Attendance times are shown in UTC while labels say IST — CONFIRM IN IST BROWSER
**Severity:** Medium (confirm-in-IST-browser) | **Groups:** G6 | **Policy:** P7

**Where:** /hr/attendance (Time Tracker "Checked in · 3:30 AM", Team Attendance, Daily History; corrections header "(IST)"), /hr dashboard clock ("03:17 AM - WED 14, OCT 2026").

**Steps:** At ~09:00 IST click "Clock in".

**Expected:** "Checked in · 9:00 AM" (IST, matching the "(IST)" labels).

**Actual (in a UTC browser):** "Checked in · 3:30 AM"; Team Attendance "In 3:30 AM".

**Likely cause:** Formatting with browser local time (`toLocaleTimeString`/`date-fns format` without tz) instead of org timezone.

**Fix:** **First confirm**: read the formatting code and run the screen with the browser/OS in Asia/Kolkata and in UTC. If formatting uses the browser zone, apply G6 (org tz everywhere). If it already uses org tz, report `not reproduced in IST browser` with the code reference and change nothing.

**Acceptance criteria:** With browser TZ=UTC and TZ=Asia/Kolkata, a 03:30Z clock-in renders "9:00 AM" everywhere it appears (tracker, team, daily history, dashboard clock); unit test for the helper under both TZs; report the IST-browser result explicitly.

## HR-B-011 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Severity | Title |
| HR-B-011 | Low | Leave policy with negative accrual: Create Policy does nothing, no message |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-011: Negative accrual on a leave policy: Create Policy does nothing and shows no message
- **Severity:** Low
- **Route:** /hr/settings/policies → "Create policy" → Policy Type "Leave"
- **Actor:** owner qaown1012b
- **Steps:** Name `QA Leave 1013`; Accrual Amount (days) `-5`; click "Create Policy".
- **Expected:** Inline error such as "Accrual must be 0 or more".
- **Actual:** The dialog stays open with `-5` in the field; no alert or toast. After changing the value to `1.5` the policy saves (shown as draft v1).
- **Impact:** Silent failure; user can't tell why nothing happens.
- **Suggested fix:** Add min(0) validation with an inline message; surface server/client validation failures in the dialog.

## HR-B-012 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-012 | Asset Returns "Loading results…" / Column 1–4 placeholders | PARTIAL | Headers now real (Asset, Employee, Status, Condition, Date) and the empty state works, but the table takes about 15–20 s to resolve with "Loading results…" shown first. Documents page shows the same loading placeholder for several seconds (HRM-B-015 section). |

Write-up from `streamline-qa-reports/hrms-2026-10-14/CLAUDE-FIX-BRIEF.md`:

## HR-B-012: List pages show "Loading results…" with placeholder headers "Column 1–N"
**Severity:** Low | **Groups:** G9

**Where:** /hr/asset-returns ("Column 1–4"), /hr/cases, /directory ("Column 1–6"). **Steps:** Open the page and watch while loading (10–15 s). **Expected:** Real headers (e.g. Asset / Employee / Status / Condition / Date) with skeleton rows, then rows or empty state. **Actual:** Placeholder headers until data arrives (Round 3: now resolves to "No asset returns tracked" after ~10–15 s; it was stuck in Round 1). **Likely cause:** Shared table builds headers from data/columns that load with the query. **Fix:** G9; also look at why these queries take 10–15 s only if it is an obvious issue (e.g. waterfall), else follow-up. **Acceptance criteria:** Real headers render immediately on all three pages; empty state shows when empty.

## HR-B-013 — likely fixed, not confirmed

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-013 | Correction rejects morning check-in as future (UTC vs IST) | LIKELY FIXED (partial evidence) | 15 Oct correction 09:00–18:00 IST was accepted by time validation; the only rejection was "A pending regularization already exists for this date." (400). Future-time check still to be run with a late-evening time. |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-013: Attendance correction rejects a morning check-in as "later than the current time" (clock compared in UTC, not IST)
- **Severity:** Medium (valid, past punches cannot be corrected during IST working hours; overlaps HR-B-010)
- **Route:** /me/attendance → "Request Correction" (employee self-service)
- **Actor:** employee qahr1014a (QA HR Thirteen)
- **Steps:** At about 09:25 IST (03:55 UTC) open Request Correction. Date 14 Oct 2026, Check-in `08:45`, Check-out `09:10`, Reason "QA 1014 employee correction request test". Submit Request.
- **Expected:** Accepted (08:45 and 09:10 IST are in the past in IST). Or, if rejected, the message should be about a real problem.
- **Actual:** Toasts `Check-in cannot be later than the current time` and `Check-out cannot be later than the current time`; dialog stays open. The same dialog accepted `02:00` / `02:30` for the same date and was applied after approval (Team Attendance shows In 2:00 AM · Out 2:30 AM).
- **Impact:** The "now" used for the future-time check is the browser/UTC clock, so morning punches are treated as future. Employees cannot correct a real morning check-in on the day; the threshold is shifted by 5h30m (same root cause family as HR-B-010).
- **Suggested fix:** Compare against `now` in the organisation timezone (IST) on the server; use one time helper for display and validation; add a test that runs with TZ=UTC and TZ=Asia/Kolkata.
- **Caveat:** Box browser runs in UTC; the behaviour matches HR-B-010. Confirmed by the 08:45 rejection vs 02:00 acceptance.

## HR-B-015 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Title (short) |
| HR-B-015 | Attendance correction card missing requester |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-015: Attendance correction card does not show who raised it
- **Severity:** Low
- **Route:** /hr/attendance → "Attendance corrections" → "Needs a decision"
- **Actor:** owner qaown1012b (approver)
- **Steps:** With qahr1014a's correction pending, open the card.
- **Expected:** Requester name (QA HR Thirteen) and the requested change vs. the original punch.
- **Actual:** Card shows only "Wed, 14 Oct · Pending · In 14 Oct 2026, 02:00:00 · Out 14 Oct 2026, 02:30:00 · QA 1014 employee correction request test" with Approve / Reject. No requester, no original punch times.
- **Impact:** Approver cannot tell whose record is changed or what it was before approving (approval decisions are blind).
- **Suggested fix:** Show requester name and avatar, original vs requested times and the delta.

## HR-B-018 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Title (short) |
| HR-B-018 | Editing draft HR policy: Save Changes fails silently (PATCH 400) |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-018: Editing a draft HR policy: "Save Changes" fails silently (PATCH returns 400), so the leave type cannot be edited before publishing
- **Severity:** Medium (a draft leave type cannot be corrected; no message tells the user why)
- **Route:** /hr/settings/policies → row "QA Leave 1013" (draft v1) → pencil "Edit" → change Description → "Save Changes"
- **Actor:** owner qaown1012b
- **Steps:**
  1. Open the draft policy's Edit sheet. Change Description to `QA disposable leave policy 1013 (edited round 3)`.
  2. Click "Save Changes". Wait for the request to finish.
  3. Close and reopen after a reload.
- **Expected:** Saved with a toast ("Policy updated"), or an inline error naming the invalid field.
- **Actual:** Sheet stays open; no toast, no inline message, no field error. Network: `PATCH https://api.streamlineos.in/hr/policies/3` → **400**. Console: `Failed to load resource: 400 /hr/policies/3`. After reload the description is unchanged. Retrying with a different field (Max balance 0 → 10) also returns 400 silently. The same failure occurs on the second draft version (v2, `PATCH /hr/policies/4` → 400), even with only Priority changed 0 → 1.
- **Impact:** A draft leave policy cannot be edited; the user cannot tell whether the save worked. Combined with HR-B-019 the owner cannot publish a corrected leave type through the UI.
- **Suggested fix:** Return the 400 body's field messages and show them inline; add a toast on failure; investigate why PATCH on a draft policy is rejected (request schema vs. server validation). Add an API test for PATCH /hr/policies/{id} on draft.

## HR-B-021 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-020 / HR-B-021 | Expense max amount / minus sign | FIXED (client; server max not verified) | Amount field (Add expense, not submitted): "-5" → "Amount must be a positive number"; "abc" → same; "0" → "Amount must be greater than 0"; 14 nines kept and → "Amount must be ₹10,00,000 or less" (no silent truncation). Server-side max not verifiable without submitting a huge claim. |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-021: Expense amount field silently drops a minus sign and letters; the only message is "Amount must be greater than 0" on the reverted value
- **Severity:** Low
- **Route:** /hr/expenses → "Add expense" → Amount (₹)
- **Actor:** owner qaown1012b
- **Steps:**
  1. Click the Amount field (value `0`). Select all, Backspace, type `-` then `5`.
  2. Select all, Backspace, type `a`, `b`, `c`.
  3. Type `0`, then fill `-5` and `abc` via fill, then click "Submit Expense" (without a valid amount).
- **Expected:** Negative and non-numeric input is rejected with a message at the moment of typing ("Enter a positive amount") or the field keeps the typed characters and shows the error on submit.
- **Actual:**
  - Typing `-5` → field shows `5` (minus silently dropped; a valid-looking value).
  - Typing `abc` → field becomes empty with no message.
  - Fill `-5`, `99999999999999` and `abc` → field keeps `0` and the message "Amount must be greater than 0" appears, even for the huge value (the message is about the reverted value, not what was typed).
  - Entering `0` gives "Amount must be greater than 0" (correct).
- **Impact:** Users cannot see why their value was rejected; a typed `-5` becomes `5` and would be submitted as a positive claim.
- **Suggested fix:** Use a numeric input (`inputmode=decimal`) with validation on the typed value; show "Amount must be a positive number" for minus; keep the typed text so the user can correct it; apply the same rule on paste.

## HR-B-023 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`

| ID | Title (short) |
| HR-B-023 | Bulk onboarding: unclosed quote merges CSV lines; preview shows raw CSV as name |

Write-up from `streamline-qa-reports/hrms-2026-10-14/HR-BUGS.md`:

## HR-B-023: Bulk onboarding: an unclosed quote merges the following CSV lines into one row, and the preview shows raw CSV text as an employee name
- **Severity:** Medium (the preview hides the real row errors; a user fixing the file is told the wrong problem; a duplicate email and a bad date on later lines are never reported)
- **Route:** /hr/onboarding → "Bulk upload" → Upload file
- **Actor:** owner qaown1012b
- **File:** `uploads/malformed-bulk-1013.csv` (box path `/workspace/streamline-qa/reports/hrms-2026-10-14/uploads/malformed-bulk-1013.csv`), header `firstName,lastName,email,designation,department,joiningDate,phone`, rows:
  1. `QA Bulk,One,qabulk1013a@sharklasers.com,QA Analyst,QA Test Dept,2026-10-20,+919000010101` (valid)
  2. `QA Bulk,Two,not-an-email,QA Analyst,QA Test Dept,2026/10/20,+91abc` (bad email, bad date, bad phone)
  3. `"QA Bulk,Three,qabulk1013c@sharklasers.com,...` (quote never closed)
  4. `QA Bulk,Four,qahr1014a@sharklasers.com,QA Analyst,QA Test Dept,2026-13-45,+919000010104,EXTRA,COLUMNS` (existing employee's email, impossible date, extra columns)
  5. `,,,,,,` (blank row)
- **Steps:** Click the file input (or drop the file). Wait for "Checking file…" to finish. Read the preview. Do NOT click "Create 1 employee" (preview only; "Clear" used).
- **Expected:** Parse error on line 3 ("Unclosed quote on line 3"). Rows 3–4 reported separately. Row 4 flagged as "email already belongs to an employee" and the date flagged. Blank row ignored or reported. Row 2 lists every invalid field (email, joiningDate, phone), not only the first.
- **Actual:** Preview "3 rows · 1 ready to create · 2 held back · 1 seat free". Row 1 "Warning FALLBACK_ASSIGNED". Row 2 "Error: invalid email" only (date and phone not listed). Row 3 shows the raw text `QA Bulk,Three,qabulk1013c@sharklasers.com,QA Analyst,QA Test Dept,2026-10-20,+919000010103 QA Bulk,Four,qahr1014a@sharklasers.com,...,,,,,,` as the Employee name, with "Error: lastName is required / email is required / designation is required / department is required". Row 4 (duplicate of the existing employee QA HR Thirteen's email, and 2026-13-45) is not shown on its own. Nothing was created (Clear used; no confirm).
- **Impact:** A quoting mistake in a 100-employee file is reported as a missing-field problem in one huge cell; a duplicate email or bad date further down is not reported, so the user may fix the wrong thing and only find the duplicate at confirm time. Uploader is also silently assigned as fallback manager (shown as a warning, which is correct).
- **Suggested fix:** Use a CSV parser that reports the line and column of unclosed quotes; validate each physical row independently; show all field errors per row; reject the file (with a clear message) when a parse error occurs instead of creating a merged row.

## HR-B-024 — not re-run

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-024 | Exit: Submit resignation only for signed-in user | NOT RE-RUN (see Page: Exit) | |

Write-up from `streamline-qa-reports/hrms-2026-10-14/CLAUDE-FIX-BRIEF.md`:

## HR-B-024: /hr/exit "Submit resignation" only works for the signed-in user
**Severity:** Low | **Groups:** stand-alone | **Policy:** P14

**Where:** /hr/exit → "Submit resignation". **Steps:** Read step 1 copy ("from the employee or HR"); open the dialog. **Expected:** HR can pick an employee and record a resignation. **Actual:** Self form ("Your last working date will be 13 Dec 2026"), no employee picker; risk HR resigns themselves by mistake. **Likely cause:** HR page reuses the self-service component. **Fix:** P14: "Record resignation" with employee picker (gated by `hr:exit:manage`, server checks the actor may act for that employee); keep self form at /me. If too large, reword the button/copy and list as follow-up. **Acceptance criteria:** HR can record a resignation for another employee and it appears on /hr/exit with its checklist; employees without the permission cannot record for others (API 403); self flow unchanged.

---

# 4. UX suggestions (do only if trivial and inside files you already touch; otherwise list as follow-ups)

- HR-U-001/004/013: inline reason when a character is rejected; one name validator and helper text everywhere; name max 100 (covered by G3).
- HR-U-002/031: explain "Needs another approver" and own expense claims not in the HR queue.
- HR-U-003: one definition of "pending for me" (Leaves tab 2 vs Action Center 0).
- HR-U-005: same leave type labels in form and list ("Casual Leave").
- HR-U-006: shift confirm shows warnings and duration (with HR-B-007).
- HR-U-007/023: duplicate errors name the existing record; archive dialog shows name + code.
- HR-U-008/011/017: search empty state + stale-response cancel; real empty states and headers (G5/G9).
- HR-U-009: explain clock-in cooldown.
- HR-U-010: success toast after a correction decision; keep item under "Approved".
- HR-U-014/015: onboarding gate only for users allowed to onboard; reword "activates your access to the HR module" banner.
- HR-U-018/019: show leave balance calculation; correction card requester + original vs requested.
- HR-U-020/021/022: policy sheet save feedback; group versions; self-conflict copy.
- HR-U-024/025: icon-only row controls; keep shift sheet open behind its confirm.
- HR-U-026..029: termination final-commit clarity; "Record resignation" label; asset return action "Mark returned".
- HR-U-030: single "Other" category field and message. HR-U-032: "New request" on /hr/helpdesk.
- HR-U-016: directory membership/email visibility — product question, do not change.

---

# 5. Final regression checklist

Run these after all fixes (owner unless noted):

- [ ] Onboarding single employee: names with `'`, `-`, `.`, accents save (typed and pasted); digits/HTML rejected inline; duplicate email still blocked at Next; double-click Submit still creates one record; future DOB still impossible.
- [ ] Employee Edit: designation required/trimmed, 200-char max still enforced; unsaved-changes prompt still works; `<img onerror>` text still rendered as text.
- [ ] Departments: create, duplicate name/code blocked, blank → one message, archive (unused → archived; used → blockers), view archived.
- [ ] Employee directory search: match, no-match (typed and fresh URL), clear; status filter + URL sync + "Clear filters".
- [ ] Shifts: create/edit valid shift; inverted without Night Shift blocked; night shift allowed; confirm dialogs unchanged.
- [ ] Attendance: clock in/out and cooldown; times correct in org tz with browser TZ=UTC and Asia/Kolkata (HR-B-010 result reported); correction request validation ("Provide at least a check-in or check-out time", "Check-out must be after check-in", future-time in org tz); approve another's correction → success toast, applied; own correction → no actions, API 403.
- [ ] Leave: request (10-char reason, weekend/To-before-From pickers), own request "Needs another approver", approve/reject by another approver (reject reason required), balance correct before/after, leaves list loads after a write.
- [ ] Policies: create (accrual ≥0), edit draft saves, activate v1, new version → edit → activate v2 supersedes v1, real cross-policy conflicts still blocked.
- [ ] Holidays: create; `<script>` name still rejected with the clear helper text.
- [ ] Expenses: valid claim; 0 / negative / letters / over-limit blocked inline and by API; edit claim respects the same rules.
- [ ] Assets: register, assign, log return, confirm → Available/unassigned; counts correct.
- [ ] Bulk upload: malformed fixture rejected with line number; fixed file shows all row errors; valid file still creates employees on confirm.
- [ ] Exit/termination: HR records resignation for an employee; self resignation on /me unchanged; termination create → email → complete → employee inactive, sign-in disabled, checklist on /hr/exit, FnF draft (not paid), asset returns; repeat complete is idempotent.
- [ ] List pages (/hr/asset-returns, /hr/cases, /directory): real headers while loading; empty states.
- [ ] **Role checks (must be unchanged):**
  - Employee qahr1014a-style Member (no HR role): all `/hr/*` admin routes in RBAC.md still DENIED with the same permission (`hr:employees:view`, `hr:attendance:view`, `hr:exit:manage`, `hr:payroll:approve`, `hr:cases:view`, …); `/hr/employees/{other id}` still denied (no IDOR); allowed routes still work: /me/attendance, /me/time-off, /hr/leaves (own rows only, no Approvals tab), /hr/expenses (own claims only), /hr/holidays, /hr/announcements, /hr/travel, /directory.
  - Members qamem1012c / qaview1012e: same denials; directory shows name/work email only (no salary/phone/address).
  - Outsider (other org): `/hr` → `module:hr` org-disabled; `/directory/{id}` of another org → "Not found"; no cross-org data.
  - New endpoints/actions (record resignation, complete termination side effects, self-approval guard) enforce permissions server-side; a Member calling them directly gets 403.
  - Org Owner/Admin cannot self-approve corrections (P1).
- [ ] No raw error text anywhere (no zod messages, no "ApiContractError" toast on successful writes, no JS exception text).
- [ ] Existing test, lint and type-check commands pass.

## HR-U-001 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-001: Show the reason a field was ignored
- **Where:** Onboarding Personal step (names), HR Policies (accrual), Departments.
- **Observed:** Keystrokes are dropped or values reverted with no message (see HR-B-001, HR-B-011).
- **Suggestion:** Inline hint on the field the moment a character is rejected ("Numbers are not allowed in names"); keep the typed text visible so users can correct it.

## HR-U-004 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-004: Consistent name rules across HR forms
- **Where:** Employee names (/hr/onboarding Personal) vs Holiday Name (/hr/holidays).
- **Observed:** Holiday Name's helper text lists allowed characters ("letters, numbers, spaces, apostrophes, periods, and hyphens"); employee name fields accept none of the apostrophe/hyphen characters.
- **Suggestion:** Reuse one name-validator with the same helper text everywhere (see HR-B-001).

## HR-U-006 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-006: Confirmation modal should show warnings, not just times
- **Where:** /hr/shifts → Create shift → "Create this shift?"
- **Observed:** The modal shows `(06:00 PM – 09:00 AM)` with no warning for a non-night shift (see HR-B-007).
- **Suggestion:** Show "Ends before it starts — enable Night Shift?" in the modal and disable the confirm button.

## HR-U-008 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-008: Employee-list search needs a visible "searching…" state and an empty state
- **Where:** /hr/employees search box.
- **Observed:** On a typed no-match search the list shows everyone with an error banner (HR-B-006); the URL keeps `?q=`.
- **Suggestion:** Show "No employees match 'zzzznomatch'. Clear search" as the empty state; debounce and cancel stale responses.

## HR-U-010 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-010: Attendance corrections list needs a clear empty/filter state
- **Where:** /hr/attendance "Attendance corrections" with filter "Needs a decision" after an action.
- **Observed:** Shows "No results match your filters. Corrections employees raise for this date range appear here." — good copy, but the item just actioned disappears without a success message (see HR-B-009).
- **Suggestion:** Toast "Correction approved for Wed, 14 Oct" and keep the item visible under "Approved".

## HR-U-011 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-011: Asset Returns and similar lists — use real empty states
- **Where:** /hr/asset-returns (HR-B-012), /hr/shifts (good empty state "Create your first shift template"), /hr/devices ("No time clock devices").
- **Suggestion:** Copy the Shifts empty-state pattern to every list.

## HR-U-012 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-012: Positive notes (keep)
- Duplicate-email check happens on Next, before Job Details.
- Future Date of Birth is impossible: the picker disables months after the current month.
- Leave date picker prevents "To" before "From" (earlier dates greyed out) and disables weekends.
- Leave reason needs at least 10 characters; attendance correction reports "Provide at least a check-in or check-out time" and "Check-out must be after check-in".
- Reject reason is required (the Reject button stays disabled until text is entered).
- Status filter syncs to the URL (`/hr/employees?status=inactive`) and "No results match your filters" with "Clear filters" works.
- Designation is HTML-escaped on display (`<img onerror>` text shown as text).
- Holiday name rejects `<script>` with a clear helper message.
- Unsaved Edit form prompts before navigating away (browser `beforeunload`).

## HR-U-017 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-017: Directory placeholder headers while loading
- **Where:** /directory, and /hr/asset-returns (same family as HR-B-012).
- **Observed:** "Loading results…" with placeholder headers "Column 1…6" shown for 5–10 s before the list appears.
- **Suggestion:** Render the real column headers immediately and a skeleton for the rows.

## HR-U-019 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-019: Approver card needs requester and original vs requested times
- **Where:** /hr/attendance → "Attendance corrections" → "Needs a decision".
- **Observed:** The card shows only the requested times and reason (see HR-B-015).
- **Suggestion:** Show requester name/avatar, original punch, requested punch, and the delta.

---
# Round 3 (owner step-4 pass) — UX suggestions HR-U-020+

## HR-U-020 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-020: Policy edit sheet gives no feedback on save and no field-level reason
- **Where:** /hr/settings/policies → Edit (draft) → "Save Changes"
- **Observed:** Save on a draft policy (HR-B-018) closes nothing, shows no toast and no inline error. The only trace is a console 400.
- **Suggestion:** Show "Couldn't save: <reason>" inside the sheet, keep the sheet open with the typed values, and add a success toast ("Policy saved as draft v1").

## HR-U-028 — still open

Latest status source: `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`

Write-up from `streamline-qa-reports/hrms-2026-10-14/UI-UX-SUGGESTIONS.md`:

## HR-U-028: Exit page reads like an HR tool but its primary button is self-service
- **Where:** /hr/exit → "Submit resignation" (top right and empty state).
- **Observed:** Step copy says "from the employee or HR", but the dialog is "Submit Resignation" for the signed-in user ("Your last working date will be 13 Dec 2026").
- **Suggestion:** On the HR exit page, label the button "Record resignation" with an employee picker; keep "Submit resignation" for /me (see HR-B-024).

## HRM-B-004 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Round-1 title | Round-2 status | Evidence (15 Oct, this round) |
| HRM-B-004 | Leave form says owner approves own leave vs Approvals "Needs another approver" | CHANGED — now a new High bug (see HRM-B-010) | Form copy still reads "adityachalla01 approves their own leave request as the organisation owner". Approvals now shows Approve/Reject on the owner's own leave (no "Needs another approver"). Copy and action now agree, but self-approval succeeded (see HRM-B-010). |

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-1/BUGS.md`:

### HRM-B-004: Leave request form says the owner approves their own leave, but Approvals say "Needs another approver"
- **Severity:** Low
- **Route:** Leave request form (owner flow) vs Approvals list on /hr/leaves (or equivalent Approvals tab)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Steps:**
  1. As organisation owner, open the leave request form and read the helper/copy about approval.
  2. Submit a leave request (e.g. owner leave 19 Oct — see TEST-DATA.md).
  3. Open Approvals / the pending request card and read the status/action copy.
- **Expected:** Form copy and Approvals behaviour match. If self-approval is blocked for the owner, the form should say another approver is required (or that the owner cannot self-approve). If the owner can self-approve, Approvals should offer Approve/Reject.
- **Actual:** Form text: **"adityachalla01 approves their own leave request as the organisation owner"**. Approvals side: **"Needs another approver"** (no self-approve action), consistent with segregation of duties but contradicting the form.
- **Impact:** Misleading guidance; owner expects to approve their own request and then finds they cannot. Wastes time and erodes trust in approval copy.
- **Likely code area:** Leave request form helper text (hard-coded or derived from "is org owner" without checking the real approval policy); Approvals card correctly applies "requester ≠ approver".
- **Suggested fix:** Align copy with the real rule: if self-approval is forbidden, change the form helper to "Needs another approver" / "You cannot approve your own leave"; if product intends owner self-approve, enable Approve on the owner's own card (server-side too) and keep the form text. Prefer matching leave to attendance SoD (see 14 Oct HR-B-008 family).
- **Acceptance check:** Owner leave request form and Approvals card show the same rule; either Approve is available and works, or both sides clearly say another approver is required.

## HRM-B-006 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Round-1 title | Round-2 status | Evidence (15 Oct, this round) |
| HRM-B-006 | Half Day Allowed OFF→ON on reopen | STILL OPEN (reproduced twice) | Created two drafts (QA1015R2 Half Day Probe, and Probe B) with all four switches OFF; reopening shows HALF DAY ALLOWED = ON both times. Toggling it OFF on a draft and Save Changes then reopening shows OFF (persists). So the bug is on create / first save. |

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-1/BUGS.md`:

### HRM-B-006: Half Day Allowed was OFF on create but shows ON when the policy is reopened (needs verification)
- **Severity:** Low-Medium
- **Route:** /hr/settings/policies → Create / Edit leave policy (Half Day Allowed toggle)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Record:** QA1015 Casual Leave (v2 active / related versions — see TEST-DATA.md)
- **Steps:**
  1. Create (or new-version) a leave policy with **Half Day Allowed = OFF**.
  2. Save / activate as applicable.
  3. Reopen the same policy in Edit / view.
  4. Read the Half Day Allowed toggle state. (Flagged for verification — confirm persistence vs display-only.)
- **Expected:** Toggle state after reopen matches what was saved (OFF stays OFF).
- **Actual:** Half Day Allowed was set **OFF** on create but shows **ON** when reopened. **Needs verification** whether the server stored ON, the client defaults ON on open, or a version/lineage bug is flipping the flag.
- **Impact:** Policy rules shown to admins may not match intent; half-day leave may be allowed or denied incorrectly for employees.
- **Likely code area:** Leave policy form default for `halfDayAllowed` on edit load; PATCH/POST payload omitting the field; or response mapping inverting boolean. Check create vs get-by-id serializers.
- **Suggested fix:** Persist and round-trip `halfDayAllowed` exactly; bind edit form from server response (no hard-coded default ON on edit); add API + UI test OFF→save→reload→OFF.
- **Acceptance check:** Create with Half Day Allowed OFF → reopen shows OFF; create with ON → reopen shows ON; employee half-day request behaviour matches the stored flag.

---

## HRM-B-008 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Round-1 title | Round-2 status | Evidence (15 Oct, this round) |
| HRM-B-008 | Department 1-char name not blocked; 15–20 s save | PARTIAL — still open | Name "A" passes client validation with no message and is saved (row "A / QA1015R2A"). Save busy state lasted about 5 s this time (was 15–20 s), dialog closes on success. Test row archived afterwards. |

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-1/BUGS.md`:

### HRM-B-008: Create takes 15–20 s on "Saving…"; 1-character name "A" is not blocked client-side
- **Severity:** Low
- **Route:** /settings/organization/departments → Add Department / New Department
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Related:** Recheck of **HR-B-004** (14 Oct) — raw "Too small: expected string to have >=2 characters" / min length. This round: **1-character name "A" is not blocked client-side** (PARTIAL); also slow save.
- **Steps:**
  1. Click Add Department. Name `A` (1 character), fill any other required fields, Save.
  2. Observe client validation before/during Save.
  3. Separately: create a valid department (e.g. QA1015 Dept) and time how long the UI stays on **"Saving…"**.
- **Expected:** Client blocks names shorter than the server minimum (e.g. 2 characters) with a human message such as "Department name must be at least 2 characters" before submit. Save completes in a few seconds under normal conditions, with a clear busy state.
- **Actual:**
  - **1-character name `A` is not blocked client-side** (can proceed to submit / hit server validation or accept depending on path — client should stop it first). Continues the HR-B-004 min-length family with poor client pre-check.
  - Create stays on **"Saving…"** for **~15–20 seconds** before completing (observed on this round's creates).
- **Impact:** Slow create feels broken; short names rely on server/raw messages (HR-B-004) instead of clear client validation; users may double-click Save.
- **Likely code area:** Department create form validation (min length not applied on client before submit); departments create API latency or missing loading/timeout UX; Save button not disabled for invalid length.
- **Suggested fix:** Client min length ≥ 2 (trim first) with one human message; disable Save while invalid or in-flight; investigate 15–20 s create (network waterfall, dependency checks, missing index). Keep server min length as backstop with mapped copy (not Zod raw text — see HR-B-004).
- **Acceptance check:** Name `A` → inline "at least 2 characters", no request (or immediate field error); name `QA` or longer saves; Save shows busy and finishes without a 15–20 s unexplained hang on a warm session.

---

## HRM-B-011 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-013 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-015 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-016 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-017 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-018 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-019 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

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

## HRM-B-020 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`:

### HRM-B-020: Person side sheet shows the manager as a raw UUID
- **Severity:** Low. **Route:** /hr/employees → click QA Probe Pay card → side sheet "Reports to d7190b52-c9e6-43ec-ac3c-ad2e9cbb60b5".
- **Expected:** Manager name "adityachalla01". **Actual:** raw UUID (the full profile page shows the name). **Impact:** unreadable. **Likely area:** side-sheet subtitle uses managerId not name. **Fix:** map to display name. **Acceptance:** sheet shows the name.

## HRMS-010 — blocked, not confirmed fixed

Latest status source: `qa/hrms/retest_2026-10-14.md`

| ID | Title | Severity | Status now | Attempts | Evidence | Notes | Retest 2 |
| HRMS-010 | No navigation at 768px | Medium | BLOCKED (not retested) | 1 | none | Browser width can't be resized with the tools; a zoom attempt only reached 125% and did not give a real 768 view. | BLOCKED - cannot resize browser to 768px with the tools. |

Write-up from `qa/hrms/deliverables/02-functional-bugs.md`:

## HRMS-010 No navigation at 768px width (no sidebar, bottom bar, or menu toggle)
- Severity: Medium
- Priority: P2
- Status: VERIFIED
- URL: /hr at 768x1024 (iPad Mini emulation)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 768x1024
- Pass: P2, P3
- Preconditions: DevTools device toolbar iPad Mini.
- Steps:
  1. Open /hr at 768 width.
- Expected: Sidebar, collapsed rail, bottom bar, or hamburger is available.
- Actual: Only header icons (search, +, bell, avatar). 375 shows bottom bar; desktop shows sidebar; 768 shows neither.
- Evidence: /workspace/qa/hrms/p2_r5_768_hr.png, /workspace/qa/hrms/p3_36_768px_hr_no_sidebar_no_bottom_nav.webp, /workspace/qa/hrms/p3_37_devtools_ipad_mini_768_emulation.webp
- Repro rate: 2 of 2.
- Impact: Tablet users cannot move between HR sections except by URL/search.
- Likely layer: CSS breakpoint gap (INFERRED).
- Acceptance criterion: At every width 320-1440 one navigation pattern is visible.
- Safe retest: Resize 700-1023 px and confirm nav present.

## HRMS-011 — still open

Latest status source: `qa/hrms/retest_2026-10-14.md`

| ID | Title | Severity | Status now | Attempts | Evidence | Notes | Retest 2 |
| HRMS-011 | Expense amount silently truncated, saves Rs 99,99,99,999 | Medium | STILL OPEN | 1 (read-only) | rt_HRMS-025_action_center_pending6.webp | The Rs 99,99,99,999 Travel claim (Oct 13) is still Pending in the owner's Action Center. Did not re-enter the form. | STILL OPEN (carry-over; Rs 99,99,99,999 Travel claim still Pending; not re-entered). |

Write-up from `qa/hrms/deliverables/02-functional-bugs.md`:

## HRMS-011 Expense amount input silently alters very large values (now truncates to 999999999 and saves Rs 99,99,99,999)
- Severity: Medium
- Priority: P2
- Status: VERIFIED
- URL: /me/expenses (New claim)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: New claim form.
- Steps:
  1. Type 99999999999999999999 in Amount.
  2. Submit.
- Expected: Validation message with the allowed maximum; no silent change.
- Actual: P1: value replaced with 0 then 'Amount must be greater than 0'. P3: truncated to 999999999 and saved as EXP-2026-003 Travel Rs 99,99,99,999, no message.
- Evidence: /workspace/qa/hrms/p1n_22_expense_empty_and_zero_amount.png, /workspace/qa/hrms/p3_26_expense_form_huge_amount_before_submit.png, /workspace/qa/hrms/p3_27_expense_submitting_amount_truncated_999999999.png, /workspace/qa/hrms/p3_28_me_expenses_EXP003_99cr_created_by_test.png
- Repro rate: 1 of 1 per pass (behaviour changed between passes).
- Impact: Absurd claims can be created; users are not told their entry changed.
- Likely layer: Not evidenced.
- Acceptance criterion: Amount above a defined max shows 'Amount cannot exceed Rs X'; displayed value never changes silently.
- Safe retest: Type the value, check message; do not submit.

## HRMS-012 — blocked, not confirmed fixed

Latest status source: `qa/hrms/retest_2026-10-14.md`

| ID | Title | Severity | Status now | Attempts | Evidence | Notes | Retest 2 |
| HRMS-012 | Expense submit no confirmation, duplicate claims | Medium | BLOCKED | 0 | rt_HRMS-025_action_center_pending6.webp | Would require creating a claim; not done. Queue shows two identical Rs 500 'QA synthetic expense claim' items (Oct 13), consistent with the duplicate-submit symptom. | BLOCKED - reproducing needs a new expense claim (not created to avoid records). |

Write-up from `qa/hrms/deliverables/02-functional-bugs.md`:

## HRMS-012 Expense submit gives no visible confirmation, leading to duplicate claims
- Severity: Medium
- Priority: P2
- Status: VERIFIED
- URL: /me/expenses
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1
- Preconditions: New claim form.
- Steps:
  1. Submit a valid claim.
  2. Observe screen.
- Expected: Success toast and form closes/reset; duplicate submit prevented.
- Actual: No visible confirmation; re-submit created duplicate EXP-2026-002.
- Evidence: /workspace/qa/hrms/p1n_25_expense_me_list_two_claims.png
- Repro rate: 1 of 1.
- Impact: Duplicate reimbursement requests.
- Likely layer: Not evidenced.
- Acceptance criterion: Success toast + form closed; submit disabled while in flight.
- Safe retest: Observe on next legitimately needed claim, or in a disposable org.

## HRMS-014 — blocked, not confirmed fixed

Latest status source: `qa/hrms/retest_2026-10-14.md`

| ID | Title | Severity | Status now | Attempts | Evidence | Notes | Retest 2 |
| HRMS-014 | Attendance correction 'later than current time' rejects past IST time | Medium | BLOCKED | 0 | none | Creates a record needing approval; not in minimal-record scope. Last verified: OPEN (rejected at 22:53 IST, accepted 00:20 IST). | BLOCKED - needs an attendance correction that creates an approval record. |

Write-up from `qa/hrms/deliverables/02-functional-bugs.md`:

## HRMS-014 Attendance correction check-in rejected as 'later than current time' (likely timezone comparison)
- Severity: Medium
- Priority: P2
- Status: VERIFIED rejection once; timezone cause INFERRED
- URL: /me attendance correction
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: Correction for 13 Oct 2026.
- Steps:
  1. At 22:53 IST, enter check-in 18:00 for 13 Oct.
  2. Submit.
- Expected: 18:00 IST earlier than 22:53 IST is accepted.
- Actual: 'Check-in cannot be later than the current time' at 22:53 IST (17:23 UTC). P3 at 00:20 IST (18:50 UTC) the same entry was accepted.
- Evidence: /workspace/qa/hrms/p1n_26_attendance_correction_empty_and_bad_times.png, /workspace/qa/hrms/p3_29_attendance_correction_form_default_13oct.png, /workspace/qa/hrms/p3_30_attendance_correction_13oct_1800_accepted.png
- Repro rate: 1 reject (P1), 1 accept (P3); time-dependent.
- Impact: IST users cannot correct evening entries for part of the day.
- Likely layer: INFERRED only: pattern matches comparing IST wall time to UTC now. Not proven.
- Acceptance criterion: Times are compared in the org/user timezone; any past IST time on the same day is accepted.
- Safe retest: On a given day before 23:30 IST, submit a past same-day evening time (creates a record; needs approval).

## HRMS-025 — partial

Latest status source: `qa/hrms/retest_2026-10-14.md`

| ID | Title | Severity | Status now | Attempts | Evidence | Notes | Retest 2 |
| HRMS-025 | Action Center offers Approve on own leave | Low | PARTIALLY FIXED | 1 | rt_HRMS-025_action_center_pending6.webp | Action Center list shows no inline Approve/Reject buttons on rows (earlier they were shown). But owner's own leaves (Casual Leave Oct 27-28, Sick Leave Oct 29-30, by qaown1012b) are still in the owner's Pending queue; the row detail was not opened. | PARTIALLY FIXED (carry-over) - owner's own Sick (Oct 29-30) and Casual (Oct 27-28) leaves still in Approvals queue (Approvals 2). |

Write-up from `qa/hrms/deliverables/02-functional-bugs.md`:

## HRMS-025 Action Center offers Approve on user's own leave that the server rejects
- Severity: Low
- Priority: P3
- Status: VERIFIED
- URL: Action Center
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P3
- Preconditions: Own Nov 18 leave Pending.
- Steps:
  1. Click Approve on own leave.
- Expected: Approve hidden for own requests.
- Actual: Message 'You cannot approve your own leave request'; buttons still shown.
- Evidence: /workspace/qa/hrms/p3_19_owner_approve_own_nov18_now_400_message.png, /workspace/qa/hrms/p3_20_owner_approve_own_nov18_retry_same_message.png, /workspace/qa/hrms/p2_t1_leaves_self_approver_note.webp
- Repro rate: 2 of 2.
- Impact: Dead-end action; /hr/leaves also says 'You are the approver'.
- Likely layer: UI/server mismatch.
- Acceptance criterion: No Approve/Reject on own requests; leave note names the real approver.
- Safe retest: Open Action Center as owner.
