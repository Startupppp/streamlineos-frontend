# Claude Code fix brief: StreamlineOS HRMS module (QA run hrms-2026-10-14)

Paste this whole file into Claude Code at the root of the StreamlineOS repository.

## 1. Role and instructions

You are fixing confirmed bugs in the **HRMS** module of StreamlineOS. The frontend is a React app (`frontend/`) served at https://www.streamlineos.in. The API (`backend/`, NestJS-style) is served at https://api.streamlineos.in. File paths were not known when this brief was written. Find code with the search hints given: UI routes under `/hr/...` (employees, onboarding, attendance, shifts, leaves, settings/policies, expenses, assets, asset-returns, exit, termination, fnf, cases), `/me/...` (attendance, time-off, expenses), `/directory`, and `/settings/organization/departments`; API endpoints such as `/hr/attendance/regularizations/:id/apply`, `/org-hierarchy/dependencies/:type/:id`, `PATCH /hr/policies/:id`, `POST /hr/policies/:id/versions`, `/me/expenses`, `/hr/asset-returns`, `/hr/termination/:id/complete`; and the exact UI strings in quotes. Use `rg` for the exact strings first.

The bug list below is final (HR-B-001 to HR-B-025, 25 bugs). Note: the summary line at the top of the QA's HR-BUGS.md ("12 bugs") is from Round 1 only; this brief is the complete list. Fix only these bugs. Do not fix, refactor or restyle anything else, even if you notice it.

Rules:

1. **Work in priority order:** High, then Medium, then Low. Within a severity, follow the order in this file. Fix each shared root cause (section 2) once, when you reach the first bug that needs it, and then confirm the other bugs in that group.
2. **Verify in code first.** Before changing anything for a bug, find the code path and confirm the cause described under "Likely cause". Causes are inferred from browser behaviour, console and network logs, not from source. If the code shows a different cause, fix the real one and say so in your summary.
3. **Make the smallest correct change.** Fix the root cause, not the symptom. Do not redesign components, rename APIs, change response shapes other callers rely on, or add libraries unless a bug cannot be fixed otherwise (say why if you do).
4. **Fix shared root causes once, in one shared place** (section 2): one maker-checker guard; one person-name validator; one amount/number input pattern; one error-to-message mapper; one org-timezone time helper; one transactional lifecycle step per transition.
5. **Server is the source of truth.** Every validation rule added to a form must also be enforced in the API DTO/zod schema. Client checks are for UX only.
6. **Tests:** where the repo has tests for the touched area (API unit/e2e, contract tests, component tests, Playwright), add or update tests that cover the acceptance criteria. Do not create a new test framework. Run the existing test, lint and type-check commands and keep them passing. Time-related tests must run under both `TZ=UTC` and `TZ=Asia/Kolkata`.
7. **Do not change unrelated behaviour.** Everything in section 5 (regression checklist) must keep working, including all role checks.
8. **Policy defaults** (section 1a) are the behaviours chosen for this brief where the QA report left a choice open. Implement them and list them in your summary under "Policy decisions to confirm".
9. **HR-B-010 is confirm-in-IST-browser:** the QA browser ran in UTC. Confirm in code whether times are formatted with the browser zone or the org zone, and verify the fix with the browser/OS set to Asia/Kolkata *and* to UTC. Report the result as `fixed` / `not reproduced in IST browser` with evidence. HR-B-013 shares the cause but was reproduced (08:45 rejected, 02:00 accepted).
10. **HR-B-014 and HR-B-016 need care:** HR-B-014 — read the Casual Leave policy accrual/proration config before changing the balance calculation; if the 11 is correct per config, fix only the label. HR-B-016 was seen once; do not write a speculative fix — look for a cache/ordering issue after a leave write, fix only if found, else report `not reproduced`.
11. **No secrets.** Do not put passwords, OTP codes, invite tokens, correlation ids, or keys in code, tests, fixtures, logs or your summary. QA account names below are for reference only.
12. If you cannot reproduce or fix a bug with a reasonable change, stop on that bug, write what you found, and continue with the next one.
13. **Final output:** end with a table with one row per bug ID:

    | ID | Severity | Fixed (yes / partial / no / needs-recheck) | Root cause confirmed in code? | Files changed | How verified (test name, manual steps, or reason not verified) |
    |---|---|---|---|---|---|

    After the table add: "Policy decisions to confirm", "Follow-ups" (anything deliberately left out), and the commands you ran with their results.

**Test context.** Org "QA Build Org 1012b" (timezone IST / Asia/Kolkata). Accounts: owner qaown1012b (Org Admin, HR approver), qahr1014a (employee "QA HR Thirteen", EMP-ZH6QY8, org Member, no HR role; now terminated by QA), qamem1012c and qaview1012e (org Members, non-HR), qaout1012g (outsider, second org with HR module disabled). Test records: department "QA Dept 1013" (codes QAD1013 and duplicate QAD1013B), leave policy "QA Leave 1013" (active v1, draft v2), shift "QA Shift 1013", asset "QA Asset 1013 Laptop", expense claims #EXP-2026-003/004. Record ids come from the QA run; create your own local data. A malformed CSV used for HR-B-023 is at `streamline-qa/reports/hrms-2026-10-14/uploads/malformed-bulk-1013.csv` (outside the app repo; copy its shape into a fixture). Strings like `<b>x</b>` / `<script>` in test data are intentional; they are rendered as text (correct, keep it that way).

### 1a. Policy defaults chosen for this brief

| # | Topic | Default chosen | Bugs |
|---|---|---|---|
| P1 | Maker-checker on attendance corrections | Approver must differ from the requester (server 403 + UI hides Approve/Reject on own requests, showing "Needs another approver" exactly like leave). Org Owner/Admin is **not** exempt. Applies to every approval in the HR module that changes the approver's own record (corrections, leave, expenses). | HR-B-008 |
| P2 | Allowed person-name characters | Unicode letters and marks (`\p{L}\p{M}`), spaces, apostrophe (`'` and `’`), hyphen, period. **Digits not allowed** (current intent), but rejection is shown inline, never silent. Max length 100. Trim; required = non-empty after trim of the raw value. | HR-B-001, HR-B-002, HR-U-013 |
| P3 | Department name uniqueness | Name unique per org, case-insensitive, trimmed, among active (non-archived) departments; code also unique per org. Server 409 with field error. Existing duplicates are left as-is (no migration). | HR-B-005 |
| P4 | Shift end before start | Blocked unless Night Shift is on: "End time must be after start time, or turn on Night Shift". Equal start/end is blocked. | HR-B-007 |
| P5 | `payrollInputRebuild` contract | Server keeps sending the object (it carries more information); client schema accepts the object (and boolean, for backward compatibility). Confirm the backend owner agrees. | HR-B-009 |
| P6 | Department dependency `mode` | Client schema accepts whatever enum the server actually defines (align both to one shared enum); unknown modes are not a contract crash if the dependency list itself is valid. | HR-B-017 |
| P7 | Timezone for display and "now" validation | All attendance/leave/correction/dashboard times are formatted in the **organisation timezone** (IST), not the browser zone; "cannot be later than the current time" is evaluated on the server in org timezone. Store UTC. | HR-B-010, HR-B-013 |
| P8 | Leave balance | Available = prorated entitlement (months remaining in leave year from joining date / 12 × annual) − approved − pending (per existing "pending" rule). Rounding: per existing policy setting, else round down to 0.5. If config says otherwise, keep config and fix the label only. | HR-B-014 |
| P9 | Leave accrual amount | min 0 (0 allowed), max 365, up to 2 decimals. | HR-B-011 |
| P10 | Policy version activation | Activating vN of a policy supersedes the active earlier version of the **same lineage** (excluded from the overlap check); other policies are still checked. No force option for self-conflict. | HR-B-019 |
| P11 | Expense amount bounds | Amount > 0 and ≤ ₹10,00,000 per claim (server constant; org/category limits override if already modelled), max 2 decimals. No silent truncation or sign stripping; typed text kept and errored inline. | HR-B-020, HR-B-021 |
| P12 | Asset return confirmed | Confirming a return ("Received"/"Mark returned") unassigns the asset and sets it Available (or "Damaged"/"Under repair" if condition says so, if that status exists) in the same transaction. | HR-B-022 |
| P13 | Bulk CSV parse error | A structural parse error (unclosed quote) rejects the whole file with "Line N: unclosed quote" — no partial preview. Blank rows are skipped silently. Extra columns: row warning. All field errors per row listed. | HR-B-023 |
| P14 | HR records resignation | Add "Record resignation" on /hr/exit with an employee picker (requires `hr:exit:manage`); self form stays on /me. If this is too big, reword the step copy only and list as follow-up. | HR-B-024 |
| P15 | Termination completion | Completing a termination, in one transaction: employee status → terminated/inactive (effective date today or past; future dates → scheduled), sign-in disabled / sessions revoked, offboarding checklist created, FnF **draft** created (never paid), asset-return records for currently assigned assets. Idempotent on retry. | HR-B-025 |
| P16 | Directory visibility of work email to members | Out of scope (question in HR-U-016). Do not change. | — |

---

# 2. Shared root causes

Fix each group once. A bug may appear in more than one group.

## G1 Self-approval / maker-checker missing on attendance corrections
- **IDs:** HR-B-008 (also informs HR-B-015)
- **Root cause:** Leave approvals check approver ≠ requester ("Needs another approver"), attendance regularization approval does not — neither in UI nor API.
- **Fix once:** A shared server guard (e.g. `assertNotSelfApproval(actorEmployeeId, requesterEmployeeId)`) used by the regularization approve/reject/apply endpoints (reuse the leave one if it exists). UI uses the same "can act" flag the leave cards use. Audit log both actor ids.

## G2 API contract schema mismatch (200 responses rejected by the client)
- **IDs:** HR-B-009 (`payrollInputRebuild`: object vs boolean), HR-B-017 (`mode`: value outside `"archive"|"retire"`)
- **Root cause:** Client zod response schemas drifted from server DTOs; a successful write/read surfaces as `ApiContractError CONTRACT_VIOLATION` ("The server sent data this screen does not understand…").
- **Fix once:** Align each schema to the server (prefer one shared type/enum if the repo has a shared package). Add contract tests that run the real server response through the client schema for both endpoints. Do not loosen the global contract checker.

## G3 Name / number input sanitizing (silent strip, revert, truncate)
- **IDs:** HR-B-001, HR-B-002, HR-B-020, HR-B-021 (also HR-U-001, HR-U-004, HR-U-013)
- **Root cause:** `onChange` sanitizers drop disallowed characters (and Unicode letters via an ASCII-only regex), reject pasted/filled values wholesale, cap digits by `maxLength`, and strip `-`; "required" is computed on the sanitized value.
- **Fix once:** One `personName` validator (P2) shared by client and server, reused by onboarding and employee edit (Holiday Name already has a good helper text pattern — reuse its copy style). One amount input pattern: `inputmode="decimal"`, keep raw text, validate on change/submit with inline messages, same path for typing and paste. Server enforces the same bounds.

## G4 Silent 4xx / raw zod messages / whitespace not trimmed
- **IDs:** HR-B-003, HR-B-004, HR-B-011, HR-B-018 (also HR-U-020)
- **Root cause:** Forms swallow non-2xx (PATCH policy 400) or client validation failures with no UI; schema library messages ("Too small: expected string to have >=2 characters") leak; whitespace is not trimmed before `min()` checks on edit.
- **Fix once:** One error mapper: `VALIDATION_FAILED` details → inline field errors with friendly labels, one message per field; otherwise a toast with a plain message. Trim strings in the shared schemas (`z.string().trim().min(…)`) on client and server. Every submit shows success or an error — never nothing.

## G5 Search integrity fallback shows unfiltered data
- **IDs:** HR-B-006
- **Root cause:** In-session typed search with zero results is treated as an integrity failure (likely stale response / cache keyed on the previous query), and the failure path shows the unfiltered list.
- **Fix once:** Empty result is a valid state. On a real filter failure show an error and **no rows**, never the unfiltered list. Key results by query; cancel/ignore stale responses.

## G6 Timezone: browser zone used instead of org zone
- **IDs:** HR-B-010 (confirm-in-IST-browser), HR-B-013
- **Root cause:** Times formatted with the browser's local zone (and "now" taken from the client) while labels say IST.
- **Fix once:** One helper `formatInOrgTz(utc, orgTz, pattern)` and `nowInOrgTz(orgTz)`; use for all attendance, correction, leave and dashboard clock displays; future-time validation on the server in org tz (P7).

## G7 Lifecycle state transitions not propagated
- **IDs:** HR-B-025 (termination complete → employee status, access, checklist, FnF draft), HR-B-022 (asset return confirmed → asset unassigned), HR-B-019 (new policy version → supersede old), HR-B-014 (approval → balance recompute)
- **Root cause:** The parent record's status changes, but dependent records are not updated in the same transaction.
- **Fix once (pattern):** Each transition runs in one DB transaction with all side effects listed in the policy defaults; idempotent; the UI invalidates the dependent queries (directory, profile, assets, exit, fnf) after success.

## G8 CSV parsing
- **IDs:** HR-B-023
- **Root cause:** Naive or lenient CSV parsing merges lines after an unclosed quote; row validation stops at the first error.
- **Fix once:** Use the CSV library already in the repo in strict mode (report line/column errors); validate each physical row independently; collect all field errors; check emails against existing employees in the preview (P13).

## G9 Placeholder table headers while loading
- **IDs:** HR-B-012 (/hr/asset-returns; also /directory and /hr/cases)
- **Fix once:** The shared table/list component renders real column definitions during loading (skeleton rows), and a real empty state when the query resolves empty.

## Stand-alone bugs
HR-B-005 (department uniqueness), HR-B-007 (shift time validation), HR-B-015 (requester on correction card), HR-B-016 (intermittent leaves load error), HR-B-024 (HR records resignation).

---

# 3. Bugs, in severity order

---

# High

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

## HR-B-025: Completing a termination leaves the employee Active; no offboarding checklist or FnF draft
**Severity:** High | **Groups:** G7 | **Policy:** P15

**Where:** /hr/employees/{id} → "Terminate" → /hr/termination?employeeId=… → "Create & Approve" → "Send Email" → "Complete" → "Complete Termination". Actor: owner.

**Steps:**
1. Terminate employee (reason "End of Contract", effective today) → Create & Approve (201).
2. Send Email (200). 3. Complete → "Complete Termination" (PATCH /hr/termination/:id/complete → 200). List shows "Completed".
4. Reload /hr/employees, the profile, /hr/exit, /hr/fnf, /hr/asset-returns.

**Expected:** Per the dialog ("This will deactivate the employee's account, initiate the final settlement, and create asset return records"): employee status terminated/inactive in directory and profile, sign-in disabled, offboarding checklist visible on /hr/exit, FnF draft on /hr/fnf, asset-return records for assigned assets; Terminate button no longer offered.

**Actual:** Employee still **Active** (Active count unchanged), profile shows Active + Terminate button; /hr/exit "No resignations on record"; no FnF draft; no new asset-return record.

**Likely cause:** `complete` only updates the termination row status; side effects (employee status, user deactivation, checklist, FnF draft, asset returns) are missing, failing silently, or queued in a job that never runs.

**Fix:** In the complete handler, in one transaction (P15): set employment status, deactivate the linked user/revoke sessions, create offboarding checklist, create FnF draft (not paid), create asset-return rows for assigned assets; idempotent. Return what was done; UI shows "Account deactivated · checklist created · settlement draft created" and invalidates directory/profile/exit/fnf queries. Search: "Complete Termination", "initiate the final settlement", `termination`, `complete`, `fnf`, `offboarding`.

**Acceptance criteria:**
- After complete: directory/profile show the terminated/inactive status; Active count drops by 1; Terminate action hidden.
- The terminated user cannot sign in / API calls with their session are rejected (test at service level).
- /hr/exit shows the checklist; /hr/fnf shows a draft (status draft, no payment); assigned assets get return rows.
- Calling complete twice does not duplicate checklist/FnF/returns.
- API e2e test covers all side effects.

---

# Medium

## HR-B-001: Name fields drop apostrophes/hyphens/accents on typing and discard the whole value on paste
**Severity:** Medium | **Groups:** G3 | **Policy:** P2

**Where:** /hr/onboarding → "Single employee" → step "Personal" (First Name / Last Name). Also employee Edit tab name fields.

**Steps:** Type `O'Brien-Smith` key by key; then paste it in one go. Repeat with `Ñúñez`.

**Expected:** Values kept as typed/pasted; disallowed characters produce an inline message, never silent change.

**Actual:** Typed → `OBrienSmith`; `Ñúñez` → `ez`. Pasted `O'Brien-Smith`, `Ñúñez`, `Ab1`, `<b>x</b>` → field keeps the previous value, no message.

**Likely cause:** ASCII-only `[A-Za-z ]` sanitizer in `onChange`; paste path rejects the whole value if any character fails.

**Fix:** Shared `personName` rule (P2) on client and server; keep raw input; show "Names can contain letters, spaces, apostrophes, periods and hyphens"; same path for typing and paste; max 100. Search: "First Name", "Last name is required", name sanitizer regex.

**Acceptance criteria:**
- `O'Brien-Smith`, `D'Souza`, `Kumar-Singh`, `Ñúñez`, `José`, `Nguyễn` save and display exactly (typed and pasted).
- `<b>x</b>` / `Ab1` show an inline error, are not saved, and the field keeps the typed text.
- Server rejects disallowed names with 400 field error; unit tests for the validator.

## HR-B-003: Edit employee saves a blank/whitespace Designation
**Severity:** Medium | **Groups:** G4

**Where:** /hr/employees/{id} → "Edit" → Professional Information → Designation → "Save Changes".

**Steps:** Set Designation to three spaces; Save; reload.

**Expected:** "Designation is required" inline; save blocked.

**Actual:** Saved silently; designation empty after reload; profile header loses the designation line. (300 chars correctly rejected: "Designation must be at most 200 characters".)

**Likely cause:** Edit schema lacks the `trim().min(1)` used at hire (client and server PATCH DTO).

**Fix:** Shared designation schema `trim().min(1).max(200)` for create and update, client and server.

**Acceptance criteria:** Whitespace/empty → inline "Designation is required", no request or 400 from server; valid edit saves; API test for PATCH with `"   "` → 400.

## HR-B-005: Duplicate department names are accepted
**Severity:** Medium | **Groups:** stand-alone (uses G4 mapper) | **Policy:** P3

**Where:** /settings/organization/departments → "Add Department".

**Steps:** Create "QA Dept 1013" / QAD1013; create "QA Dept 1013" / QAD1013B.

**Expected:** "A department named 'QA Dept 1013' already exists."

**Actual:** Both saved; two rows with the same name.

**Likely cause:** No uniqueness check on (org, lower(trim(name))).

**Fix:** Server check (and a unique partial index on active rows if migrations are used in the repo) for name (case-insensitive, trimmed) and code per org → 409 with field error; UI shows inline. Also check on rename.

**Acceptance criteria:** Duplicate name (any case/extra spaces) or duplicate code → inline error, nothing saved; archived duplicate names do not block; API test.

## HR-B-006: Typed directory search with zero matches shows all employees + "Search failed integrity check"
**Severity:** Medium | **Groups:** G5

**Where:** /hr/employees search "Search name, email, or ID…".

**Steps:** Type `qaown` (1 result), then replace with `zzzznomatch`. Also a fresh page with `zzz-x` typed first.

**Expected:** "Showing 0 of 0 matching" + "No results match your filters" (what a fresh load of `?q=zzzznomatch` shows).

**Actual:** Banner "Search failed integrity check — showing unfiltered. Report ref HRMS-SEARCH-001."; "Showing 9 of 9 matching"; all rows shown; URL keeps `?q=`. 3/3 reproductions.

**Likely cause:** An integrity check comparing the response to the current query (or a cached previous result) treats empty results / stale responses as failure, and the fallback renders unfiltered data.

**Fix:** G5. Search: "Search failed integrity check", "HRMS-SEARCH-001", "showing unfiltered".

**Acceptance criteria:** Typed no-match → 0 rows + empty state, no banner; rapid typing never shows stale results; the unfiltered fallback no longer exists; component test for typed no-match after a match.

## HR-B-007: Non-night shift with End Time before Start Time passes validation
**Severity:** Medium | **Groups:** stand-alone | **Policy:** P4

**Where:** /hr/shifts → "Create shift" ("Create Shift Template"); same rule for Edit.

**Steps:** Name, Type FIXED, Start 18:00, End 09:00, Night Shift off → "Create Shift".

**Expected:** Inline "End time must be after start time, or turn on Night Shift".

**Actual:** Confirm modal "Create this shift? … (06:00 PM – 09:00 AM)".

**Likely cause:** No cross-field check in the shift schema (client and server).

**Fix:** `refine(end > start || nightShift)` on client and server; show duration in the confirm.

**Acceptance criteria:** Inverted/equal times without Night Shift blocked inline and by API (400); with Night Shift allowed; normal 09:00–18:00 still works.

## HR-B-009: Approving an attendance correction shows "ApiContractError" although the server applied it
**Severity:** Medium | **Groups:** G2 | **Policy:** P5

**Where:** /hr/attendance → Attendance corrections → Approve (reproduced again in Round 2 approving an employee's correction).

**Steps:** Approve a correction raised by another employee.

**Expected:** Success toast; card leaves "Needs a decision".

**Actual:** Toast "The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API." Console: `ApiContractError CONTRACT_VIOLATION`, endpoint `/hr/attendance/regularizations/:id/apply`, status 200, `payrollInputRebuild — expected boolean, received object`. Write applied.

**Likely cause:** Client response schema types `payrollInputRebuild` as boolean; server returns an object.

**Fix:** G2 / P5. Search: `payrollInputRebuild`, `regularizations`, `apply`.

**Acceptance criteria:** Approve shows success toast and the item moves to Approved; contract test passes with the real response shape; no contract error in console.

## HR-B-010: Attendance times are shown in UTC while labels say IST — CONFIRM IN IST BROWSER
**Severity:** Medium (confirm-in-IST-browser) | **Groups:** G6 | **Policy:** P7

**Where:** /hr/attendance (Time Tracker "Checked in · 3:30 AM", Team Attendance, Daily History; corrections header "(IST)"), /hr dashboard clock ("03:17 AM - WED 14, OCT 2026").

**Steps:** At ~09:00 IST click "Clock in".

**Expected:** "Checked in · 9:00 AM" (IST, matching the "(IST)" labels).

**Actual (in a UTC browser):** "Checked in · 3:30 AM"; Team Attendance "In 3:30 AM".

**Likely cause:** Formatting with browser local time (`toLocaleTimeString`/`date-fns format` without tz) instead of org timezone.

**Fix:** **First confirm**: read the formatting code and run the screen with the browser/OS in Asia/Kolkata and in UTC. If formatting uses the browser zone, apply G6 (org tz everywhere). If it already uses org tz, report `not reproduced in IST browser` with the code reference and change nothing.

**Acceptance criteria:** With browser TZ=UTC and TZ=Asia/Kolkata, a 03:30Z clock-in renders "9:00 AM" everywhere it appears (tracker, team, daily history, dashboard clock); unit test for the helper under both TZs; report the IST-browser result explicitly.

## HR-B-013: Attendance correction rejects a morning check-in as "later than the current time"
**Severity:** Medium | **Groups:** G6 | **Policy:** P7

**Where:** /me/attendance → "Request Correction". Actor: employee qahr1014a.

**Steps:** At ~09:25 IST, date today, Check-in 08:45, Check-out 09:10, reason → Submit.

**Expected:** Accepted (both times are in the past in IST).

**Actual:** "Check-in cannot be later than the current time" / "Check-out cannot be later than the current time". 02:00/02:30 accepted for the same date.

**Likely cause:** Entered local IST times compared with a UTC "now" (or entered times interpreted as UTC).

**Fix:** Interpret entered times in org tz; compare with `nowInOrgTz` on the server (client mirrors it). Search: "cannot be later than the current time".

**Acceptance criteria:** At 09:25 IST, 08:45/09:10 accepted and 09:40 rejected; same under browser TZ=UTC and Asia/Kolkata; stored as correct UTC instants; test under both TZs.

## HR-B-014: Leave balance jumps 0 → 11 after a 1-day Casual leave approval; card says "Prorated … 3 of 12 months"
**Severity:** Medium | **Groups:** G7 | **Policy:** P8

**Where:** /me/time-off (employee); approval at /hr/leaves?tab=approvals (owner).

**Steps:** Employee (joined 14 Oct 2026) requests Casual Oct 19 and Sick Oct 22 (balance shows 0). Owner approves Casual, rejects Sick. Employee reloads.

**Expected:** ≈ prorated entitlement (3/12 of annual) − 1 approved, with the calculation explained.

**Actual:** "Available Days 11 — Casual Leave 11 — Prorated from your joining date (14 Oct 2026): 3 of 12 months"; Approved (YTD) 1.

**Likely cause:** Proration applied to the label but not the entitlement (annual 12 − 1 = 11); or balance before approval was "not yet initialised" and approval initialised it with the full year. QA did not open the policy config.

**Fix:** First read the Casual Leave policy config. Compute balance via one function used on both employee and owner screens (P8). Show the calculation (HR-U-018) if trivial.

**Acceptance criteria:** For a 12-day annual policy and joining 14 Oct (3 of 12 months): available = 3 − approved − pending (per rule) both before and after approvals; rejected leave never changes balance; unit tests for proration and approval.

## HR-B-017: Archiving a department fails: dependency check returns a contract error
**Severity:** Medium | **Groups:** G2 | **Policy:** P6

**Where:** /settings/organization/departments → row → "Archive".

**Steps:** Archive any department; wait for "Checking department dependencies…"; "Try again".

**Expected:** Dependency result → "Archive department" confirm (or list of blockers); department moves to "View archived".

**Actual:** "Could not check dependencies … Nothing has been changed." + contract toast; console `CONTRACT_VIOLATION`, status 200, `/org-hierarchy/dependencies/DEPARTMENT/:id`, `mode — Invalid option: expected one of "archive"|"retire"`. 2/2.

**Likely cause:** Server returns a `mode` value not in the client enum.

**Fix:** G2 — one shared enum; contract test. Also show the department code in the dialog title/body (HR-U-023): "QA Dept 1013 (QAD1013B)".

**Acceptance criteria:** Archive of an unused department succeeds and it appears under "View archived"; a department with dependents shows the blocker list; contract test for the endpoint; dialog shows name + code.

## HR-B-018: Editing a draft HR policy: "Save Changes" fails silently (PATCH 400)
**Severity:** Medium | **Groups:** G4

**Where:** /hr/settings/policies → draft "QA Leave 1013" → Edit → "Save Changes".

**Steps:** Change Description (or Max balance 0→10, or Priority 0→1 on draft v2) → Save.

**Expected:** "Policy updated" toast and saved; or inline field error.

**Actual:** `PATCH /hr/policies/:id` → 400 every time; no toast/inline error; nothing saved.

**Likely cause:** Edit form sends the full policy object including read-only/derived fields (id, version, status, timestamps, type-specific fields in the wrong shape) that the update DTO rejects; and the error is swallowed.

**Fix:** Inspect the 400 body first. Send only editable fields matching the update DTO (or relax the DTO to ignore read-only fields — pick the minimal); map errors via G4.

**Acceptance criteria:** Editing description, max balance, priority on a draft saves (200) and persists after reload with a success toast; an invalid value shows an inline error; active policies remain read-only; API test for PATCH on draft.

## HR-B-019: New version of an active leave policy cannot be activated (conflicts with its own v1)
**Severity:** Medium | **Groups:** G7 | **Policy:** P10

**Where:** /hr/settings/policies → active "QA Leave 1013" v1 → Edit → "New Version" → v2 "VERSIONS & ACTIVATION".

**Steps:** Activate v1; create New Version (201); try to Activate v2.

**Expected:** v2 activates and supersedes v1.

**Actual:** "Cannot activate — resolve policy conflicts. Blocking: overlaps with "QA Leave 1013" … Equal-priority overlaps are blocked. Raise priority, narrow scopes, or force-activate only if intentional." Activate fails. List shows two rows with the same name.

**Likely cause:** Overlap check compares against all active policies including the same lineage (`policyGroupId`/`parentId`).

**Fix:** Exclude same-lineage versions from the conflict check; on activation, mark the previous active version superseded in the same transaction; no force option for self-conflict; show version in list names ("v2 (draft)").

**Acceptance criteria:** v2 activates; v1 becomes superseded/inactive; only one active version per lineage; a genuinely overlapping *different* policy still blocks; API test.

## HR-B-020: Expense claim accepts ₹999,999,999; amount field silently caps at 9 digits
**Severity:** Medium | **Groups:** G3 | **Policy:** P11

**Where:** /me/expenses (Submit Claim) and /hr/expenses ("Add expense" → "New Expense Claim").

**Steps:** Type fourteen 9s in "Amount (₹)"; Submit.

**Expected:** Inline "Amount must be ₹10,00,000 or less" (or org limit); no silent truncation; server rejects too.

**Actual:** Field shows `999999999` (digits dropped silently); POST /me/expenses → 201, claim ₹99,99,99,999 Pending.

**Likely cause:** `maxLength=9` on input, no max in client or server schema.

**Fix:** G3 amount pattern; server `max(1_000_000)` (P11) and 2 decimals; same for edit (PATCH).

**Acceptance criteria:** Over-limit amount → inline error, no request; direct API POST/PATCH → 400; ₹250.50 still works.

## HR-B-022: Confirming an asset return does not unassign the asset
**Severity:** Medium | **Groups:** G7 | **Policy:** P12

**Where:** /hr/asset-returns → "Log Return" → row "Received" → "Confirm Return"; compare /hr/assets.

**Steps:** Assign an asset; Log return (201, Pending); Received → Confirm (PATCH → 200, Returned); reload /hr/assets.

**Expected:** Asset Available, unassigned; counts Available +1 / Assigned −1.

**Actual:** Asset still "Assigned" to the employee until a separate "Unassign Employee".

**Likely cause:** Return PATCH updates only the return row.

**Fix:** In the same transaction clear the asset assignment and set status per P12; invalidate the assets query; toast "Asset returned and unassigned". Optionally rename action "Mark returned" (HR-U-029) if trivial.

**Acceptance criteria:** After confirm, /hr/assets shows Available and no assignee; counts correct; assignment history keeps the record; API test.

## HR-B-023: Bulk onboarding: unclosed quote merges lines; preview shows raw CSV as a name; later errors not reported
**Severity:** Medium | **Groups:** G8 | **Policy:** P13

**Where:** /hr/onboarding → "Bulk upload" → Upload file (preview only).

**Steps:** Upload a CSV (header `firstName,lastName,email,designation,department,joiningDate,phone`) with: a valid row; a row with bad email + `2026/10/20` + `+91abc`; a row starting with an unclosed `"`; a row with an existing employee's email, `2026-13-45` and extra columns; a blank `,,,,,,` row.

**Expected:** "Line 3: unclosed quote" and file rejected (P13); after fixing the quote, each row validated separately with all field errors (row 2: email, joiningDate, phone; row 4: email already belongs to an employee, invalid date, extra columns warning); blank row skipped.

**Actual:** "3 rows · 1 ready · 2 held back"; row 2 only "invalid email"; row 3 name = raw text of lines 3–5 with "lastName is required…"; row 4 never reported.

**Likely cause:** Lenient parser; first-error-only validation; no existing-email check in preview.

**Fix:** G8. Search: "Checking file…", "held back", "FALLBACK_ASSIGNED", CSV parse call.

**Acceptance criteria:** The QA file is rejected with the line number; the same file with the quote fixed shows per-row complete errors including duplicate email and invalid date; valid row still creatable; no employee created from preview; parser unit tests with the fixture.

---

# Low

## HR-B-002: Digits in name fields removed silently; typed digits then show "Last name is required"
**Severity:** Low | **Groups:** G3 | **Policy:** P2

**Where:** /hr/onboarding → Single employee → Personal. **Steps:** Type `QA HR 1013` in First Name, `1013` in Last Name. **Expected:** Inline "Numbers are not allowed in names"; "required" only if really empty. **Actual:** First Name → `QA HR` silently; Last Name empty with "Last name is required". **Likely cause:** Digit-stripping sanitizer; required computed on sanitized value. **Fix:** Covered by the HR-B-001 validator; keep raw text, show the digit message. **Acceptance criteria:** Typing digits shows "Numbers are not allowed in names" and keeps the text; submit blocked with that message, not "required".

## HR-B-004: Department form shows raw "Too small: expected string to have >=2 characters"
**Severity:** Low | **Groups:** G4

**Where:** /settings/organization/departments → "Add Department". **Steps:** Name = three spaces → Save. **Expected:** One message. **Actual:** "Name is required" and "Too small: expected string to have >=2 characters". **Likely cause:** Two schemas (form + zod default message) both rendered; no trim. **Fix:** `trim().min(2, "Department name must be at least 2 characters")`, one message per field via G4. **Acceptance criteria:** Blank → "Name is required" only; 1 char → the custom min message only; no schema-library text anywhere in the form.

## HR-B-011: Leave policy with negative accrual: Create Policy does nothing, no message
**Severity:** Low | **Groups:** G4 | **Policy:** P9

**Where:** /hr/settings/policies → "Create policy" → Type Leave. **Steps:** Accrual Amount `-5` → "Create Policy". **Expected:** "Accrual must be 0 or more". **Actual:** Dialog stays open, nothing shown. **Likely cause:** Validation error on a field not rendered (or hidden tab) / swallowed. **Fix:** min(0) max(365) with inline message on the field; server same. **Acceptance criteria:** `-5` → inline error on the field; `1.5` saves; API 400 for negative.

## HR-B-012: List pages show "Loading results…" with placeholder headers "Column 1–N"
**Severity:** Low | **Groups:** G9

**Where:** /hr/asset-returns ("Column 1–4"), /hr/cases, /directory ("Column 1–6"). **Steps:** Open the page and watch while loading (10–15 s). **Expected:** Real headers (e.g. Asset / Employee / Status / Condition / Date) with skeleton rows, then rows or empty state. **Actual:** Placeholder headers until data arrives (Round 3: now resolves to "No asset returns tracked" after ~10–15 s; it was stuck in Round 1). **Likely cause:** Shared table builds headers from data/columns that load with the query. **Fix:** G9; also look at why these queries take 10–15 s only if it is an obvious issue (e.g. waterfall), else follow-up. **Acceptance criteria:** Real headers render immediately on all three pages; empty state shows when empty.

## HR-B-015: Attendance correction card does not show who raised it
**Severity:** Low | **Groups:** stand-alone (related G1)

**Where:** /hr/attendance → "Attendance corrections" → "Needs a decision". **Steps:** Open a pending employee correction. **Expected:** Requester name/avatar, original vs requested times. **Actual:** Only date, requested times, reason, Approve/Reject. **Likely cause:** Card does not render requester/original fields (or the list endpoint omits them). **Fix:** Include requester and original punch in the list response if missing; render "QA HR Thirteen · In 03:30 → 02:00 · Out — → 02:30". **Acceptance criteria:** Card shows requester name and original vs requested in-/out-times (in org tz).

## HR-B-016: "Leaves Error — Failed to load leaves data" once after a reject + reload (intermittent)
**Severity:** Low (observed once) | **Groups:** none confirmed

**Where:** /hr/leaves?tab=approvals (owner). **Steps:** Reject a leave; reload. **Expected:** List loads. **Actual:** Once: "Leaves Error / Failed to load leaves data. Please try again." Try Again worked; not reproduced. **Likely cause:** Unknown; possibly a cache/ordering issue right after a write. **Fix:** **No speculative fix.** Inspect the leaves query/handler for a race after write; fix only a confirmed cause. Report `not reproduced` otherwise. **Acceptance criteria:** Report result; if fixed, a test covers it.

## HR-B-021: Expense amount drops a minus sign and letters silently
**Severity:** Low | **Groups:** G3 | **Policy:** P11

**Where:** /hr/expenses → "Add expense" → Amount (₹) (also /me/expenses). **Steps:** Type `-5`; type `abc`; paste `-5`/`abc` and Submit. **Expected:** Inline "Amount must be a positive number" with the typed text kept. **Actual:** `-5` → `5`; `abc` → empty; paste keeps `0` and shows "Amount must be greater than 0" about the reverted value. **Likely cause:** Sanitizing `onChange` strips non-digits; paste rejected wholesale. **Fix:** G3 amount pattern. **Acceptance criteria:** `-5` never becomes `5`; `-5`, `abc` show the correct message; paste and typing behave the same; `0` still → "Amount must be greater than 0".

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
