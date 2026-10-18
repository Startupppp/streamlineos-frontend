# hr — UX items not in the main HR list

These notes are not headings in `testing-reports/hr.md`. Fully finished items were removed. Partially fixed items are kept.


## HR-B-004 — VERIFIED IN CODE (department-form-schema.ts uses .min(1, "Name is required") + .refine(n.length !== 1, "Name must be at least 2 characters"); raw Zod "Too small" message gone; 1-char name blocked by refine; HRM-B-008 fixed the combobox case)

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

## HR-B-012 — PARTIAL (column-placeholder issue fixed; 15-20s slow load is Neon cold-start latency outside frontend scope, not a code defect)

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Title | Round-2 status | Evidence |
| HR-B-012 | Asset Returns "Loading results…" / Column 1–4 placeholders | PARTIAL | Headers now real (Asset, Employee, Status, Condition, Date) and the empty state works, but the table takes about 15–20 s to resolve with "Loading results…" shown first. Documents page shows the same loading placeholder for several seconds (HRM-B-015 section). |

Write-up from `streamline-qa-reports/hrms-2026-10-14/CLAUDE-FIX-BRIEF.md`:

## HR-B-012: List pages show "Loading results…" with placeholder headers "Column 1–N"
**Severity:** Low | **Groups:** G9

**Where:** /hr/asset-returns ("Column 1–4"), /hr/cases, /directory ("Column 1–6"). **Steps:** Open the page and watch while loading (10–15 s). **Expected:** Real headers (e.g. Asset / Employee / Status / Condition / Date) with skeleton rows, then rows or empty state. **Actual:** Placeholder headers until data arrives (Round 3: now resolves to "No asset returns tracked" after ~10–15 s; it was stuck in Round 1). **Likely cause:** Shared table builds headers from data/columns that load with the query. **Fix:** G9; also look at why these queries take 10–15 s only if it is an obvious issue (e.g. waterfall), else follow-up. **Acceptance criteria:** Real headers render immediately on all three pages; empty state shows when empty.

## HR-B-013 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

attendance-regularization-timezone.spec.ts FROZEN_UTC=2026-10-13T17:23:00Z (=22:53 IST) matches QA scenario; code uses org timezone fromWallClockUtc comparison.

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

## HR-B-021 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Server max validated: EXPENSE_AMOUNT_MAX in expense-amount.spec.ts; client-side input behavior is frontend-only.

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

## HRM-B-008 — VERIFIED IN CODE (f9910f300: department-form-schema uses .refine(n.length !== 1) blocking single-char names; fix committed 2026-10-16 after round-2 QA run)

Latest status source: `streamline-qa-reports/modules-2026-10-15/hrms/round-2/BUGS.md`

| ID | Round-1 title | Round-2 status | Evidence (15 Oct, this round) |
| HRM-B-008 | Department 1-char name not blocked; 15–20 s save | PARTIAL — still open | Name "A" passes client validation with no message and is saved (row "A / QA1015R2A"). Save busy state lasted about 5 s this time (was 15–20 s), dialog closes on success. Test row archived afterwards. |

Write-up from `streamline-qa-reports/modules-2026-10-15/hrms/round-1/BUGS.md`:

### HRM-B-008 — FIXED (8e70ac0e1: combobox quick-create blocked at < 2 chars; Settings form refine already correct)
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

## HRMS-025 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

leave-inbox-reads.ts ne(leaveRequests.userMembershipId, approverMembershipId) excludes own leaves from approval queue (commits 0442a0791, ba9ef9981).

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

## HR-U-001 — VERIFIED IN CODE (NAME_RULE_HINT FormDescription shown on firstName and lastName in step-personal-info.tsx; commit 491b4448f)

Show the reason a field was ignored
- **Where:** Onboarding Personal step (names), HR Policies (accrual), Departments.
- **Observed:** Keystrokes are dropped or values reverted with no message (see HR-B-001, HR-B-011).
- **Suggestion:** Inline hint on the field the moment a character is rejected ("Numbers are not allowed in names"); keep the typed text visible so users can correct it.

## HR-U-004: Consistent name rules across HR forms
- **Where:** Employee names (/hr/onboarding Personal) vs Holiday Name (/hr/holidays).
- **Observed:** Holiday Name's helper text lists allowed characters ("letters, numbers, spaces, apostrophes, periods, and hyphens"); employee name fields accept none of the apostrophe/hyphen characters.
- **Suggestion:** Reuse one name-validator with the same helper text everywhere (see HR-B-001).

## HR-U-006 — VERIFIED IN CODE (schema refine blocks inverted shift windows before the confirm dialog; shift-form-sheet.test.tsx verifies)

Confirmation modal should show warnings, not just times
- **Where:** /hr/shifts → Create shift → "Create this shift?"
- **Observed:** The modal shows `(06:00 PM – 09:00 AM)` with no warning for a non-night shift (see HR-B-007).
- **Suggestion:** Show "Ends before it starts — enable Night Shift?" in the modal and disable the confirm button.

## HR-U-008: Employee-list search needs a visible "searching…" state and an empty state
- **Where:** /hr/employees search box.
- **Observed:** On a typed no-match search the list shows everyone with an error banner (HR-B-006); the URL keeps `?q=`.
- **Suggestion:** Show "No employees match 'zzzznomatch'. Clear search" as the empty state; debounce and cancel stale responses.

## HR-U-010 — FIXED (3c3b22932), PENDING_BROWSER_VERIFICATION

Approve/reject toasts name the person and day and offer "View approved/rejected", which switches the status filter to where the item now lives (regularization-queue-card.tsx).

Attendance corrections list needs a clear empty/filter state
- **Where:** /hr/attendance "Attendance corrections" with filter "Needs a decision" after an action.
- **Observed:** Shows "No results match your filters. Corrections employees raise for this date range appear here." — good copy, but the item just actioned disappears without a success message (see HR-B-009).
- **Suggestion:** Toast "Correction approved for Wed, 14 Oct" and keep the item visible under "Approved".

## HR-U-011: Asset Returns and similar lists — use real empty states
- **Where:** /hr/asset-returns (HR-B-012), /hr/shifts (good empty state "Create your first shift template"), /hr/devices ("No time clock devices").
- **Suggestion:** Copy the Shifts empty-state pattern to every list.

## HR-U-017: Directory placeholder headers while loading
- **Where:** /directory, and /hr/asset-returns (same family as HR-B-012).
- **Observed:** "Loading results…" with placeholder headers "Column 1…6" shown for 5–10 s before the list appears.
- **Suggestion:** Render the real column headers immediately and a skeleton for the rows.

## HR-U-019 — FIXED (3c3b22932), PENDING_BROWSER_VERIFICATION

Approver row shows the requester, the original punch (or "No punch recorded"), the requested punch and the change (regularization-row.tsx, regularization-row.test.tsx).

Approver card needs requester and original vs requested times
- **Where:** /hr/attendance → "Attendance corrections" → "Needs a decision".
- **Observed:** The card shows only the requested times and reason (see HR-B-015).
- **Suggestion:** Show requester name/avatar, original punch, requested punch, and the delta.

---
# Round 3 (owner step-4 pass) — UX suggestions HR-U-020+

## HR-U-020: Policy edit sheet gives no feedback on save and no field-level reason
- **Where:** /hr/settings/policies → Edit (draft) → "Save Changes"
- **Observed:** Save on a draft policy (HR-B-018) closes nothing, shows no toast and no inline error. The only trace is a console 400.
- **Suggestion:** Show "Couldn't save: <reason>" inside the sheet, keep the sheet open with the typed values, and add a success toast ("Policy saved as draft v1").

## HR-U-028: Exit page reads like an HR tool but its primary button is self-service
- **Where:** /hr/exit → "Submit resignation" (top right and empty state).
- **Observed:** Step copy says "from the employee or HR", but the dialog is "Submit Resignation" for the signed-in user ("Your last working date will be 13 Dec 2026").
- **Suggestion:** On the HR exit page, label the button "Record resignation" with an employee picker; keep "Submit resignation" for /me (see HR-B-024).
