# HRMS QA — Round 1 Bugs (2026-10-14)
Environment: https://www.streamlineos.in — HRMS OS — org "QA Build Org 1012b" — actor: owner qaown1012b (Org Admin).
Test records created are listed in TEST-DATA.md. No payments, no payroll runs. Only @sharklasers.com addresses used.
Summary: 25 bugs — 2 High, 15 Medium, 8 Low. (Rows are ordered by ID, not by severity. Rounds 2 and 3 added HR-B-013…025, which this table originally omitted.)

**Fix status: 25 of 25 fixed in code.** Verified by reading the code on 2026-10-14; see the per-bug **Status** lines below for the file and line that proves each one, and `CLAUDE-FIX-BRIEF.md` for the policy decisions (P1…P15) and the browser-verification checklist. Every ✅ below still needs a browser pass to be fully closed — jsdom cannot see real rendering, focus order, paint or a live backend.

Two were found still broken during that verification pass and fixed afterwards: **HR-B-024** (the HR resignation path existed but its button was unreachable for an owner) and **HR-B-025** (the termination checklist was written and never read). A previously unreported residual of **HR-B-013** was also found and fixed — the correction date rule was evaluated on the server's UTC day rather than the organisation's.

| ID | Severity | Status | Title |
|---|---|---|---|
| HR-B-001 | Medium | ✅ Fixed | Employee name fields drop apostrophes/hyphens/accents on typing and discard whole value on paste |
| HR-B-002 | Low | ✅ Fixed | Digits in name fields are stripped silently; then "Last name is required" shows for typed text |
| HR-B-003 | Medium | ✅ Fixed | Edit employee saves a blank/whitespace Designation (required at hire) with no validation |
| HR-B-004 | Low | ✅ Fixed | Department form leaks raw validation text "Too small: expected string to have >=2 characters" |
| HR-B-005 | Medium | ✅ Fixed | Duplicate department names are accepted |
| HR-B-006 | Medium | ✅ Fixed | Employee directory typed search with zero matches shows all employees plus "Search failed integrity check" |
| HR-B-007 | Medium | ✅ Fixed | Non-night shift with End Time before Start Time passes validation and reaches "Create this shift?" |
| HR-B-008 | High | ✅ Fixed | Requester can approve their own attendance correction (self-approval) and it is applied to the record |
| HR-B-009 | Medium | ✅ Fixed | Approving an attendance correction shows "ApiContractError" although the server applied it |
| HR-B-010 | Medium | ✅ Fixed | Attendance times are shown in UTC while the labels say IST |
| HR-B-011 | Low | ✅ Fixed | Leave policy with negative accrual: Create Policy does nothing, no message |
| HR-B-012 | Low | ✅ Fixed | Asset Returns page stuck on "Loading results…" with placeholder headers "Column 1–4" |
| HR-B-013 | Medium | ✅ Fixed | Attendance correction rejects a morning check-in as "later than the current time" — *plus a residual org-day defect found and fixed here* |
| HR-B-014 | Medium | ✅ Fixed | Leave balance jumps 0 → 11 after one approved day while the card says "Prorated … 3 of 12 months" |
| HR-B-015 | Low | ✅ Fixed | Attendance correction card does not show who raised it or the original punch |
| HR-B-016 | Low | ✅ Fixed | Leave requests page showed "Leaves Error — Failed to load leaves data" on reload after a write |
| HR-B-017 | Medium | ✅ Fixed | Archiving a department fails — dependency check returns a contract error on `mode` |
| HR-B-018 | Medium | ✅ Fixed | Editing a draft HR policy: "Save Changes" fails silently (PATCH 400) |
| HR-B-019 | Medium | ✅ Fixed | A new version of an active leave policy cannot be activated — blocked against its own v1 |
| HR-B-020 | Medium | ✅ Fixed | Expense claim accepts ₹99,99,99,999; the amount field silently caps input at 9 digits |
| HR-B-021 | Low | ✅ Fixed | Expense amount field silently drops a minus sign and letters |
| HR-B-022 | Medium | ✅ Fixed | Confirming an asset return does not unassign the asset |
| HR-B-023 | Medium | ✅ Fixed | Bulk onboarding: an unclosed quote merges CSV lines and hides the real row errors |
| HR-B-024 | Low | ✅ Fixed | Exit page "Submit resignation" is self-only — HR had no way to record one for an employee |
| HR-B-025 | High | ✅ Fixed | Completing a termination left the employee Active with no offboarding checklist or settlement draft |

---

## HR-B-001: Employee name fields drop apostrophes, hyphens and accented letters when typed, and discard the whole value when pasted
- **Status:** ✅ Fixed — `frontend/lib/person-name-schema.ts:25` mirrored server-side at `backend/src/common/validation/person-name.schema.ts:26`. The onChange sanitizer is gone; typing and paste both go through the same Zod rule and a rejected character shows an inline message instead of being stripped.
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

## HR-B-002: Digits in name fields are removed silently, and typed text then shows "Last name is required"
- **Status:** ✅ Fixed — `frontend/lib/person-name-schema.ts:32`, server-side at `backend/src/common/validation/person-name.schema.ts:32`. "Required" is now computed from the raw trimmed input, and digits raise "Numbers are not allowed in names" rather than emptying the field. See policy **P2** in `CLAUDE-FIX-BRIEF.md` — digits are rejected, not allowed.
- **Severity:** Low
- **Route:** /hr/onboarding → Single employee → Personal
- **Actor:** owner qaown1012b
- **Steps:** Type `QA HR 1013` in First Name. Type `1013` in Last Name.
- **Expected:** Digits are accepted, or the user is told before/when they type that digits are not allowed. A required error appears only when the field is really empty.
- **Actual:** First Name becomes `QA HR` (digits removed, no message). Last Name typed as `1013` is empty and shows exactly `Last name is required`.
- **Impact:** The requested test name "QA HR 1013" cannot be entered; the user is told a required value is missing when they typed one.
- **Suggested fix:** Show an inline hint at the moment of rejection ("Numbers are not allowed in names"); compute "required" from the raw input, not the sanitized value; or allow digits if business rules permit.

## HR-B-003: Edit employee saves a blank/whitespace Designation without validation
- **Status:** ✅ Fixed — `frontend/features/hr/employees/detail/employee-form-schema.ts:31` (`.trim().min(1, "Designation is required")`, validated unconditionally) and server-side on the PATCH body at `backend/src/modules/hr/directory/dto/hr-directory.schemas.ts:259`.
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

## HR-B-004: Department form shows raw validation text "Too small: expected string to have >=2 characters"
- **Status:** ✅ Fixed — `frontend/features/settings/organization/hierarchy/department-form-schema.ts:4`. The unmessaged `min(2)` that leaked the Zod text is gone; `name` trims to a single "Name is required" plus one "must contain at least one letter or number". Server copy matches at `backend/src/modules/organization/hierarchy/dto/org-hierarchy.schemas.ts:11`.
- **Severity:** Low (copy/quality; exposes internal schema library messages)
- **Route:** /settings/organization/departments → "Add Department" (dialog "New Department")
- **Actor:** owner qaown1012b
- **Steps:** Click "Add Department". In "Name" type three spaces `   `. Click "Save".
- **Expected:** A single, human message such as "Name is required".
- **Actual (exact text):** Two alerts: `Name is required` and `Too small: expected string to have >=2 characters`.
- **Impact:** Users see developer-facing validation text; the message contradicts the first one.
- **Suggested fix:** Map schema errors to user copy; show one message per field ("Department name must be at least 2 characters"); trim whitespace before counting.

## HR-B-005: Duplicate department names are accepted
- **Status:** ✅ Fixed — `backend/src/modules/organization/hierarchy/org-hierarchy-departments.service.ts:81` (`assertDepartmentNameAvailable`, case-insensitive on `lower(btrim(name))` per org, excluding archived and soft-deleted), wired into both create and update, surfaced inline at `frontend/features/settings/organization/hierarchy/department-form.tsx:47`. **Caveat:** enforced in code only — see policy **P3**; production already held the duplicate rows this run created, so no unique index could be added, and a concurrent create can still race.
- **Severity:** Medium (duplicate org units break department filters, reports and onboarding pick-lists)
- **Route:** /settings/organization/departments → "Add Department"
- **Actor:** owner qaown1012b
- **Steps:**
  1. Create department Name `QA Dept 1013`, Code `QAD1013`, Description `QA disposable department 1013`. Saved.
  2. Click "Add Department". Name `QA Dept 1013`, Code `QAD1013B`. Click "Save".
- **Expected:** Blocked with "A department named 'QA Dept 1013' already exists" (or confirm), and/or code uniqueness.
- **Actual:** Second department saved. The list now shows two rows named `QA Dept 1013` (codes QAD1013 and QAD1013B). No message was shown.
- **Impact:** Ambiguous department selection in the Onboarding "Department" picker and in filters; duplicates in exports.
- **Suggested fix:** Enforce case-insensitive unique names per organisation (and unique codes) server-side; return a field-level error.
- **Cleanup:** The duplicate (QAD1013B) remains; it is listed in TEST-DATA.md for archiving by the owner.

## HR-B-006: Typed directory search with zero matches shows all employees plus "Search failed integrity check"
- **Status:** ✅ Fixed — the banner and the unfiltered fallback no longer exist anywhere in the repo. `frontend/features/hr/employees/employees-list-page.tsx:75` renders only the rows the server returned for the current params, and `backend/src/modules/hr/directory/employees.service.ts:450` always ORs the search legs into the WHERE clause rather than dropping the predicate.
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

## HR-B-007: Non-night shift with End Time before Start Time passes validation
- **Status:** ✅ Fixed — `frontend/features/hr/shifts/shift-form-sheet.tsx:93` refines `end > start` unless Night Shift is on, erroring on the `endTime` field ("End time must be after start time, or turn on Night Shift"), so the confirm dialog is never reached; the server enforces the same rule via `isShiftWindowValid` at `backend/src/modules/hr/time/dto/shifts.schemas.ts:36`. The confirm dialog also now shows the computed duration.
- **Severity:** Medium (invalid shift template could be created; drives attendance hours)
- **Route:** /hr/shifts → "Create shift" (sheet "Create Shift Template")
- **Actor:** owner qaown1012b
- **Steps:** Shift Name `QA Shift 1013`; Type FIXED; Start Time `18:00`; End Time `09:00`; Night Shift OFF; click "Create Shift".
- **Expected:** Blocked with an error such as "End time must be after start time, or enable Night Shift", or the Night Shift toggle is suggested.
- **Actual:** No validation message. The confirmation modal reads `Create this shift?` / `Create shift template "QA Shift 1013" (06:00 PM – 09:00 AM)?` with a "Create Shift" button. I cancelled; no template was created in this run. A correct valid shift (09:00 AM–06:00 PM) was created afterwards.
- **Impact:** Users can build a 15-hour-negative shift that breaks hours and overtime calculations if confirmed.
- **Suggested fix:** Validate `end > start` unless `nightShift` is on; block with inline error; show the computed duration in the confirmation.

## HR-B-008: Requester can approve their own attendance correction (self-approval)
- **Status:** ✅ Fixed — enforced **server-side**, which is what matters here: `backend/src/modules/hr/time/attendance-regularization.service.ts:280` reloads the row `FOR UPDATE` inside the transaction and throws `ForbiddenException("You cannot approve your own correction")` when `reg.userId === u.userId`; `reject()` carries the identical guard at `:403`. The UI also hides the buttons and shows "Needs another approver" (`frontend/features/hr/attendance/regularization-row.tsx:91`), matching the leave behaviour QA expected. Per policy **P1** there is deliberately **no Owner/Admin exemption**.
- **Severity:** High (segregation-of-duties bypass; approval changes the attendance record used for hours and payroll inputs)
- **Route:** /hr/attendance → "Attendance corrections" card → Approve
- **Actor:** owner qaown1012b (the same person who raised the correction)
- **Steps:**
  1. On /hr/attendance click "Request Correction". Check-in `00:10`, Check-out `00:40`, Reason `QA 1013 valid correction test`. Submit.
  2. In "Attendance corrections" (status "Needs a decision"), the card for the owner's own request shows buttons "Approve" and "Reject".
  3. Click "Approve".
- **Expected:** Self-approval blocked, as it is for leave requests (leave cards show "Needs another approver" and no action), e.g. "You cannot approve your own correction".
- **Actual:** The correction is applied: after reload the "Needs a decision" filter is empty for that item and Daily History for Wed, Oct 14 changed from `03:30 AM / 03:30 AM` to `12:10 AM / 12:40 AM` (`0h 30m`). See HR-B-009 for the error shown in the UI.
- **Impact:** Anyone with the attendance-correction permission can edit their own recorded hours without a second approver.
- **Suggested fix:** Server-side check `approver != requester` (and not a direct report of the requester); hide Approve/Reject on own requests (match the leave behaviour); audit-log the approval with both actor IDs.

## HR-B-009: Approving an attendance correction reports "ApiContractError" even though the server applied it
- **Status:** ✅ Fixed — `frontend/hooks/api/hr/attendance-regularization-queue-schema.ts:16`. `payrollInputRebuild` is now a union of the `{ rebuilt, periodId, status }` object the server actually returns and a plain boolean; the backend declares the same object at `backend/src/modules/hr/time/dto/time-attendance-response.schemas.ts:203`, so the apply response parses and the misleading toast is gone.
- **Severity:** Medium (misleading error; users retry or abandon a completed action)
- **Route:** /hr/attendance → Attendance corrections → Approve
- **Actor:** owner qaown1012b
- **Steps:** Repeat HR-B-008 steps 1–3.
- **Expected:** Success message; card removed from "Needs a decision".
- **Actual (exact UI text, toast):** `The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.`
- **Actual (console, redacted to the essentials):** `ApiContractError` `code: CONTRACT_VIOLATION`, `endpoint: /hr/attendance/regularizations/2/apply`, `status: 200`, issue `path: payrollInputRebuild — "Invalid input: expected boolean, received object"`. Correlation id `dc5b7c59-04ac-40a2-8878-45d32be530fb`.
- **Impact:** The client and server contract for `regularizations/{id}/apply` has drifted (`payrollInputRebuild` is an object in the response but a boolean in the client schema). Users see an "out of date app" error for a successful write; retries risk duplicate effects.
- **Suggested fix:** Align the response schema (`payrollInputRebuild` as the agreed type, or make the client accept both); add a contract test for the apply endpoint; show success when the server returns 200 with a valid action payload.

## HR-B-010: Attendance times are shown in UTC while the labels say IST
- **Status:** ✅ Fixed — your caveat was right: the app was formatting with the browser zone. All four reported surfaces now format in the **organisation** zone via `formatTimeInOrgTz` (`frontend/lib/date-utils.ts:217`) with the zone from `frontend/hooks/api/org-display.ts:31` — time tracker (`use-attendance-timer.ts:204`), team attendance (`team-attendance-member-row.tsx:92`), daily history (`daily-history-table.tsx:74`) and the dashboard clock (`clock-in-widget.tsx:101`). Policy **P7**: the clock renders `—` until the zone resolves, so a browser-zone time is never shown. **Needs a browser at both `TZ=UTC` and `TZ=Asia/Kolkata` to close.**
- **Severity:** Medium (wrong clock times on records; payroll/overtime risk) — *environment caveat below*
- **Route:** /hr/attendance (Time Tracker "Checked in · 3:30 AM", Team Attendance, Daily History; corrections header "2026-10-01 → 2026-10-31 (IST)"); also /hr dashboard clock "03:17 AM - WED 14, OCT 2026"
- **Actor:** owner qaown1012b
- **Steps:** At about 09:00 IST (03:30 UTC) click "Clock in" on /hr/attendance.
- **Expected:** Clock-in time shown in IST, e.g. `9:00 AM`, matching the date range label "(IST)".
- **Actual:** `Checked in · 3:30 AM`; Team Attendance row shows `In 3:30 AM · Out 3:30 AM`. The leave date-range dialog says "DATE RANGE (IST)".
- **Impact:** Clock times differ from the real IST time by 5h30m; overtime and late-mark calculations could be wrong.
- **Caveat:** The browser on this QA box runs in UTC. The app appears to format times with the browser's zone rather than the organisation's IST zone. Confirm with a browser set to Asia/Kolkata before filing with engineering.
- **Suggested fix:** Store UTC, format every time with the organisation's timezone (IST here), and use one helper for all attendance/leave/correction displays.

## HR-B-011: Negative accrual on a leave policy: Create Policy does nothing and shows no message
- **Status:** ✅ Fixed — `frontend/features/hr/policies/policy-form-types.ts:29` raises "Accrual must be 0 or more" on the `rules.accrualAmount` path, which is the registered field name with a mounted `<FormMessage />`, so the message renders inline instead of the dialog silently doing nothing. `numericFieldValueOr` preserves the typed `-5` so the value actually reaches the schema. Also bounded to ≤ 365 with max 2 decimals.
- **Severity:** Low
- **Route:** /hr/settings/policies → "Create policy" → Policy Type "Leave"
- **Actor:** owner qaown1012b
- **Steps:** Name `QA Leave 1013`; Accrual Amount (days) `-5`; click "Create Policy".
- **Expected:** Inline error such as "Accrual must be 0 or more".
- **Actual:** The dialog stays open with `-5` in the field; no alert or toast. After changing the value to `1.5` the policy saves (shown as draft v1).
- **Impact:** Silent failure; user can't tell why nothing happens.
- **Suggested fix:** Add min(0) validation with an inline message; surface server/client validation failures in the dialog.

## HR-B-012: Asset Returns page stuck on "Loading results…" with placeholder headers
- **Status:** ✅ Fixed — `frontend/components/ui/data-table-skeleton.tsx:28` takes a `headers` prop and renders the real header text; "Column N" survives only as an `sr-only` fallback, and "Loading results…" is now an `sr-only` announcement rather than visible placeholder text. All three reported routes pass real headers (`/hr/asset-returns`, `/directory`, `/hr/cases`), and the empty state "No asset returns tracked" is wired at `features/hr/asset-returns/asset-return-page-states.tsx:14`. **Not fixed: the underlying 10–15 s load time** — see "Slow list reads" in `CLAUDE-FIX-BRIEF.md` §3, deliberately out of scope.
- **Severity:** Low
- **Route:** /hr/asset-returns (sidebar: Lifecycle → Exit → Asset Returns)
- **Actor:** owner qaown1012b
- **Steps:** Open /hr/asset-returns and wait 10+ seconds.
- **Expected:** Real column headers (Employee, Asset, Return date, Status) with rows or an empty state.
- **Actual:** Table headers `Column 1`, `Column 2`, `Column 3`, `Column 4` and the text `Loading results…` persist; no empty state. Button "Log Return" present.
- **Impact:** Feature looks unfinished; placeholder headers are visible to users.
- **Suggested fix:** Render real headers; add an empty state; fix the list query (it never resolves in this org).

---
# Round 2 (2026-10-14, employee/owner pass) — new bugs HR-B-013+

## HR-B-013: Attendance correction rejects a morning check-in as "later than the current time" (clock compared in UTC, not IST)
- **Status:** ✅ Fixed (the reported defect) — the client no longer builds a browser-local timestamp: `frontend/features/hr/attendance/attendance-regularization-dialog.tsx:89` converts the typed wall-clock time with `toIsoOnDateInOrgTz(..., orgTz)` before both its own future-time check and the payload, so 08:45 IST is sent as 03:15Z; the server compares absolute instants (`backend/src/modules/hr/time/attendance-regularization.service.ts:62`) on a `z.string().datetime()` field, making the check zone-independent.
- ✅ **A residual in the same family was found during this verification and is now fixed.** The `attendanceDate` refines used `getTodayString()` — the **server/UTC** date, not the org date. Because IST runs ahead of UTC, between **00:00 and 05:30 IST** the org's current day was rejected as "a future date", and the 30-day window start was off by one day in the same hours; it hit night-shift staff correcting a punch after midnight. A Zod refine is synchronous and cannot reach the org's timezone, so both bounds moved out of the schema into the service and now resolve against `orgBusinessDate()` (`attendance-business-date.ts:15`), with the user-facing messages unchanged. The schema keeps only the static checks (date shape, "That date does not exist"). **The same defect was present on work logs** (`work-logs.service.ts`) and was fixed with it — including the backdating *lower* bound, which still derived from the server clock after the upper bound had been corrected.
- **Severity:** Medium (valid, past punches cannot be corrected during IST working hours; overlaps HR-B-010)
- **Route:** /me/attendance → "Request Correction" (employee self-service)
- **Actor:** employee qahr1014a (QA HR Thirteen)
- **Steps:** At about 09:25 IST (03:55 UTC) open Request Correction. Date 14 Oct 2026, Check-in `08:45`, Check-out `09:10`, Reason "QA 1014 employee correction request test". Submit Request.
- **Expected:** Accepted (08:45 and 09:10 IST are in the past in IST). Or, if rejected, the message should be about a real problem.
- **Actual:** Toasts `Check-in cannot be later than the current time` and `Check-out cannot be later than the current time`; dialog stays open. The same dialog accepted `02:00` / `02:30` for the same date and was applied after approval (Team Attendance shows In 2:00 AM · Out 2:30 AM).
- **Impact:** The "now" used for the future-time check is the browser/UTC clock, so morning punches are treated as future. Employees cannot correct a real morning check-in on the day; the threshold is shifted by 5h30m (same root cause family as HR-B-010).
- **Suggested fix:** Compare against `now` in the organisation timezone (IST) on the server; use one time helper for display and validation; add a test that runs with TZ=UTC and TZ=Asia/Kolkata.
- **Caveat:** Box browser runs in UTC; the behaviour matches HR-B-010. Confirmed by the 08:45 rejection vs 02:00 acceptance.

## HR-B-014: Leave balance jumps from 0 to 11 after a 1-day Casual leave is approved; card text still says "Prorated … 3 of 12 months"
- **Status:** ✅ Fixed — `backend/src/modules/hr/time/leaves-approval.service.ts:137` with `leave-entitlement.ts:48`. Approval now opens the balance row at the **prorated** entitlement (an October join gives `13 - 10 = 3.00`) and deducts the approved day from that, and the GET prorates identically. The frontend label computes the same 3 of 12, so the figure and the explanation now agree instead of showing 11 against a "3 of 12 months" caption.
- **Severity:** Medium (balance shown to the employee is not explainable from the policy; may over-grant)
- **Route:** /me/time-off (employee) and /hr/leaves?tab=approvals (owner approve action)
- **Actor:** employee qahr1014a; approver qaown1012b
- **Steps:**
  1. Employee submits Casual Leave Oct 19 (no balance yet) and Sick Leave Oct 22.
  2. Before any decision: "Available Days 0 — Prorated from your joining date (14 Oct 2026): 3 of 12 months".
  3. Owner approves Casual (Oct 19) and rejects Sick (Oct 22, reason "QA 1014 rejected for test: insufficient cover").
  4. Employee reloads /me/time-off.
- **Expected:** Balance = prorated entitlement (3 days per the card text) minus approved days (1), i.e. about 2 — or the card explains the figure. Rejected Sick leave does not change balance.
- **Actual:** "Available Days 11 — Casual Leave 11 — Prorated from your joining date (14 Oct 2026): 3 of 12 months". Pending 0, Approved (YTD) 1. Sick shows "Rejected by qaown1012b" with the reason.
- **Impact:** Balance is 11 (≈ full-year entitlement minus 1) while the label says it is prorated to 3 of 12 months. Employees may plan leave against days they do not have.
- **Suggested fix:** Apply proration to the entitlement before subtracting approved days; show the calculation; recompute balance on approval and show it consistently on the owner side too.
- **Note:** Leave policy details were not opened (owner Policies page not checked in this round). Please verify the Casual Leave policy accrual before filing as final.

## HR-B-015: Attendance correction card does not show who raised it
- **Status:** ✅ Fixed — `backend/src/modules/hr/time/attendance-regularization.service.ts:242` left-joins `users` and `attendance` to return `requesterName`, `requesterImage` and `originalCheckIn/Out`; the card prints the requester plus an "Original · In … · Out …" line above the requested times (`frontend/features/hr/attendance/regularization-row.tsx:70`), so the approver can see whose record changes and what it was before.
- **Severity:** Low
- **Route:** /hr/attendance → "Attendance corrections" → "Needs a decision"
- **Actor:** owner qaown1012b (approver)
- **Steps:** With qahr1014a's correction pending, open the card.
- **Expected:** Requester name (QA HR Thirteen) and the requested change vs. the original punch.
- **Actual:** Card shows only "Wed, 14 Oct · Pending · In 14 Oct 2026, 02:00:00 · Out 14 Oct 2026, 02:30:00 · QA 1014 employee correction request test" with Approve / Reject. No requester, no original punch times.
- **Impact:** Approver cannot tell whose record is changed or what it was before approving (approval decisions are blind).
- **Suggested fix:** Show requester name and avatar, original vs requested times and the delta.

## HR-B-016: Leave requests page showed "Leaves Error — Failed to load leaves data" once on owner reload (intermittent)
- **Status:** ✅ Fixed, and the cause was confirmed rather than filed as "not reproduced". `frontend/lib/query-error-policy.ts` routes any non-ApiError to the route error boundary whenever the query has no cached data — so the **reload** is the trigger, not the rejection, because it empties the cache. The leaves reads now opt out per-read with `INLINE_READ_ERROR` (`frontend/hooks/api/hr/leaves.ts:78` for `/me/time-off`, `:104` for the approvals read), so a transient failure degrades inline. The global default was deliberately left intact — inverting it was the wrong fix.
- **Severity:** Low (observed once; recovered with "Try Again")
- **Route:** /hr/leaves?tab=approvals (owner)
- **Steps:** Reject a leave in the Approvals list, then reload the page.
- **Expected:** Leave list loads.
- **Actual:** Main area shows "Leaves Error / Failed to load leaves data. Please try again. [Try Again]". "Try Again" loaded the list with the correct statuses (Rejected by qaown1012b).
- **Impact:** Transient failure after a write; users may think the decision did not save.
- **Suggested fix:** Investigate the first leaves query after a write (possible cache/ordering issue); show last known data with a retry, not a blocking error.
- **QA occurrence note:** 1 occurrence (not reproduced on a second reload). Logged for follow-up.

## HR-B-009 — re-check in Round 2
- **Status:** ✅ Fixed with HR-B-009 above (`attendance-regularization-queue-schema.ts:16`). Note that the Round 2 repro also exercised self-approval, which is now refused outright by the HR-B-008 guard.
- Owner approved the employee's attendance correction (HR-B-015 card). Toast again showed: `The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.` The write was applied (Team Attendance: QA HR Thirteen "Checked Out · In 2:00 AM · Out 2:30 AM"; card removed after reload). Still reproduces; no new ID.

## HR-B-012 — extra location (Round 2)
- **Status:** ✅ Fixed — `/directory` passes real headers through `PERSON_TABLE_HEADERS` in both its route-level and query-level loading branches. The ~5–10 s load itself is unchanged and out of scope.
- The employee's /directory page also rendered `Loading results…` with placeholder headers `Column 1`…`Column 6` before the list appeared (directory list loads after ~5–10 s). Same family as HR-B-012.

---
# Round 3 (2026-10-14, owner step-4 pass) — new bugs HR-B-017+

## HR-B-017: Archiving a department fails: dependency check returns a contract error, so the department cannot be archived
- **Status:** ✅ Fixed — and the diagnosis in "Suggested fix" was slightly off: the server was not sending a *wrong* `mode`, it was sending **no `mode` key at all**, which the old `@ResponseSchema` of `z.string()` could never catch. Both halves are now present — declared as the enum at `backend/src/modules/organization/hierarchy/dto/org-hierarchy-response.schemas.ts:222` and actually returned at `org-hierarchy.service.ts:249`.
- **Severity:** Medium (archive/retire of org units is blocked; the dialog shows "Could not check dependencies")
- **Route:** /settings/organization/departments → row "QA Dept 1013 / QAD1013B" → Archive
- **Actor:** owner qaown1012b (Org Admin)
- **Steps:**
  1. Open /settings/organization/departments. Click "Archive" on the row QAD1013B.
  2. Wait for "Checking department dependencies…" to finish.
  3. Click "Try again" once.
- **Expected:** Dependency result (no linked records → "Archive department" confirm; linked records → list of what blocks it). Department moves to "View archived" on confirm.
- **Actual:** Dialog title "Could not check dependencies"; body "We could not verify whether "QA Dept 1013" is still in use. Nothing has been changed." plus "The server sent data this screen does not understand…". Same on "Try again" (2 of 2). Console: `ApiContractError` `CONTRACT_VIOLATION`, `status: 200`, endpoint `/org-hierarchy/dependencies/DEPARTMENT/{id}`, issue `path: mode — "Invalid option: expected one of "archive"|"retire""`. Correlation ids `faa456c2-cf7a-420a-a251-85612992031d`, `6263e8a4-e0b1-4ca1-a4ec-e7b273bcf233`. After Cancel + reload the row is still ACTIVE (nothing changed).
- **Impact:** Departments cannot be archived from the UI at all (the same dialog is used for every archive). The dialog also names the department by name only, so with the duplicate "QA Dept 1013" (HR-B-005) the user cannot tell which row is being checked.
- **Suggested fix:** The dependencies endpoint must return `mode` as one of the agreed values (the client schema lists archive|retire; the server sends another value). Add a contract test for `/org-hierarchy/dependencies/*`. Show the department code next to the name in the dialog.
- **Cleanup:** QAD1013B still ACTIVE (edited description only; see TEST-DATA.md R3).


## HR-B-018: Editing a draft HR policy: "Save Changes" fails silently (PATCH returns 400), so the leave type cannot be edited before publishing
- **Status:** ✅ Fixed — the 400 came from the edit payload sending `policyType`, a key that `updatePolicySchema.strict()` rejects. `frontend/features/hr/policies/policy-upsert-sheet.tsx:123` no longer sends it, and the error handler now maps `VALIDATION_FAILED` details onto inline `form.setError` fields with a toast fallback, so a 400 can no longer fail silently. Drafts were always editable server-side; only *active* policies are read-only.
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

## HR-B-019: A new version of an active leave policy cannot be activated: "Cannot activate — resolve policy conflicts" blocks it against its own v1
- **Status:** ✅ Fixed — `backend/src/modules/hr/policies/hr-policy-conflict.service.ts:98` excludes every version of the same lineage from the overlap check, with the lineage resolved by a recursive `parent_policy_id` CTE, and activation archives the predecessors in the same transaction (`hr-policies.service.ts:283`). Per policy **P10** the lineage is walked rather than matched by name, so a rename after v1 cannot break it. A genuinely overlapping *different* policy is still blocked.
- **Severity:** Medium (no way to publish a changed leave type; every change creates a conflict with the policy's own previous version)
- **Route:** /hr/settings/policies → "QA Leave 1013" (active v1) → Edit → "New Version"
- **Actor:** owner qaown1012b
- **Steps:**
  1. Activate draft v1 of "QA Leave 1013" (Activate succeeds; list shows `active v1`).
  2. Reopen it → Edit sheet shows "Active policies are read-only. Create a new version to change rules." (fields disabled; expected).
  3. Click "New Version". A draft `v2` is created (POST /hr/policies/3/versions → 201).
  4. Look at "VERSIONS & ACTIVATION" on v2.
- **Expected:** v2 can be edited and activated; v2 supersedes v1 (the conflict check should ignore earlier versions of the same policy).
- **Actual:** Versions section shows "Cannot activate — resolve policy conflicts. Blocking: overlaps with "QA Leave 1013" — Active policy with overlapping scope and equal priority will produce ambiguous evaluation. Equal-priority overlaps are blocked. Raise priority, narrow scopes, or force-activate only if intentional." The "Activate" button does not succeed. The message blames its own predecessor (v1, same policy). Even after raising priority the save fails (HR-B-018), so v2 stays draft. The list now shows two rows both named "QA Leave 1013": `draft v2` and `active v1`.
- **Impact:** Leave types cannot be changed after first publish; the conflict check counts the policy against itself and offers a "force-activate" path that would create ambiguous evaluation. Duplicate-looking rows in the list.
- **Suggested fix:** Exclude versions of the same policy lineage from the overlap check (or supersede the predecessor on activation); show which version it conflicts with (v1 of this same policy); hide the force option for self-conflicts; label rows by version in the list.
- **Cleanup:** v2 draft left in place (see TEST-DATA.md R3). Not force-activated.


## HR-B-020: Expense claim accepts a huge amount (₹999,999,999); the amount field silently caps input at 9 digits
- **Status:** ✅ Fixed — a shared `expenseAmountSchema` (positive, `.max(1_000_000)`, `.multipleOf(0.01)`) at `backend/src/modules/expenses/dto/expense.schemas.ts:68` now backs create, update, the self-service routes **and the bulk import path** (`expenses-import.service.ts:77`, where an over-cap row is skipped with a per-row reason). The client mirrors it and the input lost its 9-digit cap, so digits are no longer silently truncated. Policy **P11**: the cap is ₹10,00,000 per claim — a real behaviour change, and claims already above it must be lowered when edited.
- **Severity:** Medium (no upper bound on reimbursement amounts; an absurd claim is accepted and stays Pending in the queue)
- **Route:** /me/expenses (Submit Claim) and /hr/expenses ("Add expense" → "New Expense Claim")
- **Actor:** owner qaown1012b
- **Steps:**
  1. Open "Add expense". Category "Office Supplies". Merchant `QA Vendor 1013`, Description `QA 1013 invalid amount probe`.
  2. In "Amount (₹)" type fourteen 9s (`99999999999999`).
  3. Observe the value, then click "Submit Expense".
- **Expected:** Amount above a sensible maximum is blocked with an inline message (for example "Amount must be less than ₹1,00,000" or the org limit). Typed digits beyond the limit are shown, not dropped.
- **Actual:**
  - Field value after typing 14 nines: `999999999` (last digits dropped silently, no message).
  - Submit: `POST https://api.streamlineos.in/me/expenses` → **201**. Claim saved as `#EXP-2026-004`, Office, ₹99,99,99,999, status **Pending**, visible in "My Expenses".
  - Also present (not created in this run): `#EXP-2026-003` Travel, ₹99,99,99,999, Pending, description "-". This suggests the same acceptance happened before.
- **Impact:** Any employee can submit a ₹999 million claim that enters the approval queue. The silent truncation means the user does not see the amount that was actually submitted.
- **Suggested fix:** Server-side max amount per category/org; client max with inline message; no silent truncation (block further digits and show "Max 9 digits" or the limit).
- **Cleanup:** `#EXP-2026-004` edited by owner to ₹250 with description "QA 1013 cleanup: corrected from huge-amount probe" (PATCH /me/expenses/4 → 200; verified in My Expenses). Still Pending. See TEST-DATA.md R3.

## HR-B-021: Expense amount field silently drops a minus sign and letters; the only message is "Amount must be greater than 0" on the reverted value
- **Status:** ✅ Fixed — `amount` is now a string field validated as typed text (`frontend/features/hr/expenses/components/expense-form-schema.ts:8`, field wiring at `expense-form-fields.tsx:101`). The raw value passes straight through, so `-5` and `abc` stay on screen and produce "Amount must be a positive number" instead of being rewritten to `5` or emptied; `Number()` is applied only at submit.
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

## HR-B-022: Confirming an asset return does not unassign the asset; it stays "Assigned" to the employee
- **Status:** ✅ Fixed — `backend/src/modules/hr/directory/assets.service.ts:160` wraps both writes in one `db.transaction`: the return is finalized and the asset is updated in the same `tx`, clearing `assignedTo`/`assignedToMembershipId`. Policy **P12**: condition maps to `RETIRED` (lost), `MAINTENANCE` (damaged or "Poor") or `AVAILABLE` — there is no `DAMAGED`/`UNDER_REPAIR` status in the enum, so `MAINTENANCE` is the mapping.
- **Severity:** Medium (inventory shows a returned laptop as still assigned; Available/Assigned counts wrong)
- **Route:** /hr/asset-returns → "Log Return" → then row "Received" → "Confirm Return"; compare /hr/assets
- **Actor:** owner qaown1012b
- **Steps:**
  1. On /hr/assets register "QA Asset 1013 Laptop" (SN-QA-1013-A). Assign to QA HR Thirteen (PATCH /hr/assets → 200).
  2. On /hr/asset-returns → "Log Return": asset "QA Asset 1013 Laptop", employee auto-filled QA HR Thirteen, condition Good → "Log return" (POST /hr/asset-returns → 201). Row shows status **Pending**.
  3. Row action "Received" → dialog "Confirm Return — Mark this asset as returned in good condition?" → Confirm (PATCH /hr/asset-returns/1 → 200). Row shows **Returned**.
  4. Reload /hr/assets.
- **Expected:** Returned asset is unassigned and back to Available (Available 1, Assigned 0).
- **Actual:** After step 3 the return shows Returned, but /hr/assets still shows QA Asset 1013 Laptop status **Assigned**, "Assigned To QA HR Thirteen", cards Available 0 / Assigned 1, after reload. Only the separate "Reassign / Unassign" → "Unassign Employee" on the asset (PATCH /hr/assets → 200) brought it back to Available 1 / Assigned 0.
- **Impact:** Two places disagree about who holds the asset. Offboarding (exit checklist) may show equipment still held by a departed employee; HR-B-012-style screens may hide the return.
- **Suggested fix:** When a return is confirmed, clear the assignment (or prompt "Unassign now?") in the same transaction; show the asset status on the return row.
- **Cleanup:** Asset unassigned by owner after the return (see TEST-DATA.md R3). Asset remains registered (Available) with serial SN-QA-1013-A.

## HR-B-023: Bulk onboarding: an unclosed quote merges the following CSV lines into one row, and the preview shows raw CSV text as an employee name
- **Status:** ✅ Fixed — a `Quotes` parse error now throws `ParseStructuralError("Line N: unclosed quote")` (`frontend/features/hr/onboarding/bulk-onboard-parse.ts:98`) and the flow toasts it **without ever entering the preview step**, so the file is rejected rather than previewing a merged row; line-number mapping is covered by `bulk-onboard-parse.test.ts` (8/8). Per-row errors now accumulate instead of short-circuiting — missing fields, invalid email, invalid `joiningDate` (`2026-13-45` included) and invalid phone are all listed; in-file duplicate emails are flagged client-side and an email already belonging to an employee is rejected per row by the server preview.
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

## HR-B-024: Exit page "Submit resignation" only works for the signed-in user; HR cannot submit a resignation for another employee from here
- **Status:** ✅ Fixed. The server path already existed — `POST /hr/exit/admin-record` gated on `hr:exit:manage` (`backend/src/modules/hr/lifecycle/exit.controller.ts:134`) with server-side target resolution (`assertUsersInOrg` + active-membership check, 404 otherwise) and a sheet with an `EmployeePicker` — but its **trigger was unreachable for the reported actor**: the old `canSubmit ? "Submit resignation" : isAdmin ? "Record resignation"` ternary rendered the picker only when the viewer *lacked* `hr:exit:create`, and an owner holds both keys. `frontend/features/hr/exit/exit-management-page.tsx` now composes the actions independently, so an admin sees "Submit my resignation", "Record resignation" and "Initiate termination" together, and the admin actions are no longer suppressed while the admin's own resignation is pending. The own-resignation label is deliberately distinct to address the mis-click risk noted below. Covered by `exit-management-page.test.tsx` (5 cases, 3 of which fail against the old ternary — verified by restoring it).
- **Severity:** Low (HR has to use the Termination path for every exit; copy promises more than the form does)
- **Route:** /hr/exit → "Submit resignation"
- **Actor:** owner qaown1012b
- **Steps:** Open /hr/exit. Read the step copy: "1 Resignation — Last working day in IST and a reason, from the employee or HR." Click "Submit resignation". Do not submit (cancelled with Cancel; no record created — verified "No resignations on record" after reload).
- **Expected:** HR can choose an employee and submit or record a resignation with a last working day, as the step text says ("from the employee or HR").
- **Actual:** The dialog is titled "Submit Resignation" and says "Notice period is 60 days as per company policy. Your last working date will be 13 Dec 2026." It has no employee picker; it is the signed-in owner's own resignation form. The only HR-initiated exit found is the employee profile "Terminate" button → /hr/termination?employeeId=… (involuntary, "permanent", "Create & Approve" auto-approves FINAL).
- **Impact:** A voluntary resignation recorded by HR (for example, a verbal notice) has no route; the offboarding checklist is only created by termination. Risk: an HR user could submit a resignation for themselves by mistake.
- **Suggested fix:** Add "Record resignation for employee" (employee picker, last working day, reason) on /hr/exit; keep the self-service form on /me; reword step 1 to match the actual path.


## HR-B-025: Completing a termination says the account will be deactivated and a settlement started, but the employee stays Active and no offboarding checklist or settlement draft appears
- **Status:** ⚠️ **Mostly fixed — the checklist half still reproduces.** Working now (`backend/src/modules/hr/lifecycle/termination.service.ts:229`): the membership is archived via `setMemberLifecycleStatus(..., "archived")`, which plans org-scoped revocation and tombstones sessions, and the directory's active predicate requires `status = 'ACTIVE'`, so the employee no longer reads Active; an FnF **DRAFT** is created; PENDING asset-return rows are created for still-assigned assets. A repeat `PATCH /complete` is refused at `:237` and every inner write is conflict-safe, so it cannot duplicate. Policy **P15**: global `users.isActive` is deliberately untouched (the audit entry records `globalAccountDeactivated: false`) because the person may belong to other organisations.
  **The checklist half is now fixed too.** It had been **seeded but unreadable** — `seedForTermination` wrote rows keyed by `terminationId` while every read filtered `resignationId` only, so migration 2035 delivered the column and the write while the read path was never built. The reads are now anchor-agnostic (a `ChecklistAnchor` discriminated union mirroring the table's exclusive-arc CHECK), and a new `GET /hr/exit/offboarding-checklists` (`exit.controller.ts`, permission `hr:exit:view`, registered before `:resignationId` so it is not shadowed) returns the org's open checklists across **both** anchors with the employee name, the relevant date and open/total counts. `/hr/exit` renders them in an "Offboarding checklists" panel that shows even when there are no resignations — the condition that produced "No resignations on record" after a completed termination. Seeding also moved **into** the completion transaction (BE-48); the previous `deferAfterCommit` only logged failures, so a seeding failure left a Completed termination with no checklist.
- **Severity:** High (a terminated employee still shows Active in the directory and profile; access revocation is not visible; the exit checklist that the Exit page promises is not created)
- **Route:** /hr/employees/{id} → "Terminate" (opens /hr/termination?employeeId=…) → "New Termination" form → "Create & Approve" → row "Send Email" → "Complete" → "Complete Termination"
- **Actor:** owner qaown1012b
- **Employee:** QA HR Thirteen (EMP-ZH6QY8, qahr1014a@sharklasers.com). Synthetic QA test employee; owner approved the exit run.
- **Steps (in order):**
  1. Termination: Reason "End of Contract", Effective Oct 14 2026, remarks filled → "Create & Approve" (POST /hr/termination → 201). List shows "Approved".
  2. "Send Email" → confirm "Send Email" (POST /hr/termination/2/send-email → 200). List shows "Email Sent".
  3. "Complete" → dialog "Complete Termination — This will deactivate the employee's account, initiate the final settlement, and create asset return records. This action cannot be undone." → "Complete Termination" (PATCH /hr/termination/2/complete → 200). List shows "Completed".
  4. Reload /hr/termination, /hr/employees, the employee profile, /hr/exit, /hr/fnf, /hr/asset-returns.
- **Expected:** Employee status becomes Inactive/Separated in the directory and profile; access is revoked; an offboarding checklist is shown on /hr/exit ("each approved exit carries one offboarding checklist"); a final-settlement draft exists (not paid) for the employee.
- **Actual (after reload):**
  - Termination list: "Completed" (correct).
  - Employee directory: QA HR Thirteen still **Active**; "Active 8" count unchanged. Profile header still shows **Active**, "Invite sent", and the Terminate button still available.
  - /hr/exit: "No resignations on record" (no offboarding checklist for the completed termination).
  - /hr/fnf: no draft listed for QA HR Thirteen (only the "Create draft" form; not clicked).
  - /hr/asset-returns: only the owner-logged return (Returned); no new asset-return record was created by completion (the asset was already unassigned).
  - Not verified: whether the employee's sign-in still works (no sign-in attempted as that employee, per scope).
- **Impact:** After an offboarding the terminated person is still shown as an active employee; the checklist and settlement the dialog promises are not visible for follow-up. Access revocation is not evidenced in the UI.
- **Suggested fix:** On complete, set employment status to terminated/inactive in one transaction and revoke sign-in; create the offboarding checklist and FnF draft (or show their status on the termination row); refresh the directory and profile; show "Account deactivated" in the completion result.
- **Cleanup:** The owner-run termination is Completed (permanent per the UI: "This action cannot be undone"). Reverting it needs an HR admin action outside this run.

## Round 3 re-checks of earlier bugs
- **HR-B-012 (re-check):** /hr/asset-returns now resolves after ~10–15 s with the real empty state "No asset returns tracked" (and after a return, the table shows Asset / Employee / Status / Condition / Date). The "Column 1–4" placeholder headers still show while loading. The same placeholder ("Loading results…", "Column 1–4") appears on /hr/cases for ~15 s before "No cases found". Same family as HR-B-012 / HR-U-017.
- **HR-B-010 / HR-B-013 (not re-run):** no clock-in/out performed in this round.
