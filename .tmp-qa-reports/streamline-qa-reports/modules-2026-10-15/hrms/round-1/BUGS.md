# HRMS QA Round 1 — BUGS (2026-10-15)

Environment: https://www.streamlineos.in — HRMS OS — org "ADitay CAhala" — actor: owner **adityachalla01** (organisation owner).
Account timezone: Asia/Calcutta (IST). Test prefix: QA1015. See TEST-DATA.md for records created this round.
Severity scale: Blocker / Critical / High / Medium / Low / Low-Medium.
No payments, no payroll runs. Test addresses: @sharklasers.com only.

Summary (new this round): 8 bugs — 1 High, 2 Medium, 1 Low-Medium, 4 Low.
Index: HRM-B-001 Positions Status empty; HRM-B-002 Onboarding negative salary after blank; HRM-B-003 Second attendance correction silent fail; HRM-B-004 Leave copy vs approvals; HRM-B-005 Leave list stale empty; HRM-B-006 Half Day Allowed OFF→ON; HRM-B-007 Holidays list stale; HRM-B-008 Departments slow create + 1-char name.

---

## Page: Positions (/hr/positions)

### HRM-B-001: Status dropdown has no options — a position cannot be created
- **Severity:** High
- **Route:** /hr/positions → Create / New Position (Status field)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Steps:**
  1. Open /hr/positions.
  2. Start creating a new position (fill required fields such as title/code as needed).
  3. Open the **Status** dropdown.
  4. Attempt to complete and save the position.
  5. Repeat the Status dropdown open (confirmed twice in this round).
- **Expected:** Status lists usable values (e.g. Active / Inactive / Draft) so the form can be completed and the position saved.
- **Actual:** Status dropdown opens with **no options**. Position creation cannot be completed. Reproduced twice in session.
- **Impact:** Positions master data cannot be created from the UI. Blocks hiring/position-linked flows that depend on an active position.
- **Likely code area:** Positions create/edit form — Status select options source (enum not wired, empty options array, or failed options fetch with no fallback). Check the Select/Combobox that binds Status and any `/hr/positions` or lookup endpoint that should return status values.
- **Suggested fix:** Bind Status to a fixed enum (or load options from the API) and render them in the dropdown; fail the form open with a clear error if options cannot load; keep a sensible default (e.g. Active) so create can proceed. Add a UI test that opens Create Position and asserts Status has at least one selectable option.
- **Acceptance check:** Open Create Position → Status shows selectable options → choose one → save succeeds → new position appears in the list without reload tricks.

---

## Page: Employee onboarding — Pay setup (/hr/onboarding)

### HRM-B-002: Blank Monthly Salary then type −5 still advances to Review; negative error only after typing −5 without blanking first
- **Severity:** Medium
- **Route:** /hr/onboarding → Single employee → Pay setup step → Next → Review
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Steps:**
  1. Open /hr/onboarding → Single employee; proceed to the **Pay** / Monthly Salary step with other required fields valid.
  2. Clear Monthly Salary to blank, then type `-5`, click **Next**.
  3. Separately: with a non-blank starting value, type `-5` (without blanking first) and observe validation.
- **Expected:** Salary cannot be negative. Next is blocked with an inline error such as "Salary cannot be negative" (and blank required salary is also blocked). Validation behaviour does not depend on whether the field was blanked first.
- **Actual:** After blank → type `-5` → **Next advances to Review** with no block. The message **"Salary cannot be negative"** only appears when `-5` is typed without blanking the field first.
- **Impact:** A negative monthly salary can reach Review (and potentially be submitted), corrupting compensation on the employee record / payroll inputs. Validation is path-dependent and easy to miss.
- **Likely code area:** Onboarding Pay step — Monthly Salary client validation (likely validates on change from a prior numeric value, or skips min check when the previous value was empty / coerced). Same rule should exist on the create/submit API.
- **Suggested fix:** Validate the current field value on Next and on submit: reject `< 0` (and empty if required) regardless of prior state; show "Salary cannot be negative" inline; block Next until fixed. Mirror the check server-side on onboarding create/update. Add a test: blank → `-5` → Next stays on Pay with the error.
- **Acceptance check:** Blank then `-5` → Next blocked with "Salary cannot be negative"; typing `-5` over a positive value also blocked; valid positive salary advances to Review once.

---

## Page: Attendance — corrections (/hr/attendance)

### HRM-B-003: Second correction for the same date (15 Oct) while one is pending fails silently; sheet stays open
- **Severity:** Medium
- **Route:** /hr/attendance → Request Correction (Attendance corrections)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Related:** Recheck of **HR-B-013** (14 Oct brief) — past-time submit was OK on 14 Oct; on 15 Oct a *second* submit for the same date fails silently (see Rechecks).
- **Steps:**
  1. Ensure one attendance correction for **15 Oct 2026** is already **Pending** (see TEST-DATA.md).
  2. Open Request Correction again for the same date (15 Oct), fill check-in/out and reason, submit.
  3. Observe toasts, inline errors, and whether the sheet closes.
- **Expected:** Either the second request is accepted, or it is rejected with a clear toast/inline error such as "A correction for this date is already pending" and the sheet stays open only while the error is visible. Never a silent no-op.
- **Actual:** Submit fails **silently** — no toast, no inline error. The correction sheet **stays open**. User cannot tell whether anything was saved.
- **Impact:** Users retry blindly or abandon a needed correction; pending-duplicate / conflict rules (if any) are invisible. Approvers may miss that a second attempt was blocked.
- **Likely code area:** Attendance correction create handler (client mutation + `/hr/attendance/regularizations` or equivalent POST). Error body from a 4xx (duplicate date / pending exists) is not surfaced to toast/inline UI; sheet close is gated on success but failure path shows nothing.
- **Suggested fix:** On non-2xx (or business-rule reject), show the server message as a toast and/or field error; keep the sheet open with the message visible. If duplicates are forbidden, say so explicitly. Disable Submit while in-flight. Add a test: two pending corrections for one date → second shows a visible error.
- **Acceptance check:** With a pending correction for 15 Oct, a second submit shows a clear error (toast or inline), sheet remains open with the message, and no duplicate pending row is created unless product allows it.

---

## Page: Leave requests (/hr/leaves or leave request form)

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

### HRM-B-005: Leave list shows "No leave requests" after submit until reload
- **Severity:** Low
- **Route:** /hr/leaves (list / My requests after submit)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Steps:**
  1. Open leave list (empty or without the new row).
  2. Submit a new leave request successfully.
  3. Return to / look at the leave list **without** a full page reload.
  4. Reload the page.
- **Expected:** After a successful submit, the new request appears in the list immediately (or the list refetches and shows it). Empty state disappears when at least one request exists.
- **Actual:** List shows **"No leave requests"** after submit until a **manual reload**, after which the new request appears (e.g. owner leave 19 Oct pending).
- **Impact:** Users think the submit failed and may create duplicates; empty-state flicker after a successful write.
- **Likely code area:** Leave list query cache / invalidation after create mutation (React Query or equivalent); create success path does not invalidate or optimistically update the list query.
- **Suggested fix:** On successful create, invalidate/refetch the leave list queries (and Approvals counts); or optimistically prepend the new row. Do not show the empty state when a just-created item exists in client state.
- **Acceptance check:** Submit leave → list shows the new pending row without reload; empty state only when there are truly zero requests.

---

## Page: Leave policy (/hr/settings/policies)

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

## Page: Holidays (/hr/holidays)

### HRM-B-007: After "Holiday added" toast, calendar still shows "No holidays in October" until reload (recheck)
- **Severity:** Low
- **Route:** /hr/holidays (month calendar / list for October)
- **Actor:** owner adityachalla01, org "ADitay CAhala"
- **Record:** QA1015 Holiday on 20 Oct (see TEST-DATA.md)
- **Steps:**
  1. Open /hr/holidays for October 2026 (empty or without the new holiday).
  2. Add a holiday (e.g. QA1015 Holiday, 20 Oct); wait for the **"Holiday added"** toast.
  3. Without reloading, read the October calendar / list empty state.
  4. Reload and recheck. (**Recheck** this round — confirm still stale.)
- **Expected:** After success toast, the new holiday appears in the October view; empty state "No holidays in October" is gone.
- **Actual:** Toast **"Holiday added"** appears, but the view still shows **"No holidays in October"** until a **manual reload**.
- **Impact:** Admin thinks the add failed; may create duplicates; empty state contradicts the toast.
- **Likely code area:** Holidays list/calendar query cache not invalidated after create; month view reads stale empty data.
- **Suggested fix:** Invalidate/refetch holidays-for-month (and any year list) on successful create; optimistically insert the new holiday into the month view.
- **Acceptance check:** Add holiday → toast + holiday visible in that month without reload; empty state only when the month truly has none.

---

## Page: Departments (/settings/organization/departments)

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

## Rechecks of 14 Oct HRMS brief

Source write-ups: `/workspace/streamline-qa/reports/hrms-2026-10-14/HR-BUGS.md` (HR-B-001 … HR-B-025). Statuses below are from the 15 Oct owner pass on org "ADitay CAhala" / adityachalla01.

### FIXED
| ID | Title (short) |
|---|---|
| HR-B-001 | Employee name fields drop apostrophes/hyphens/accents / discard on paste |
| HR-B-002 | Digits in name fields stripped; "Last name is required" for typed digits |
| HR-B-003 | Edit employee saves blank/whitespace Designation |
| HR-B-005 | Duplicate department names accepted |
| HR-B-006 | Typed directory search zero-match shows all + "Search failed integrity check" |
| HR-B-007 | Non-night shift End before Start reaches "Create this shift?" |
| HR-B-011 | Negative accrual on leave policy: Create does nothing, no message |
| HR-B-012 | Asset Returns stuck on "Loading results…" / Column 1–4 |
| HR-B-015 | Attendance correction card missing requester |
| HR-B-018 | Editing draft HR policy: Save Changes fails silently (PATCH 400) |
| HR-B-019 | New version of active leave policy cannot activate (self-conflict) |
| HR-B-022 | Confirming asset return does not unassign; stays Assigned |

### FIXED in UI only (server not verified)
| ID | Title (short) | Note |
|---|---|---|
| HR-B-008 | Requester can approve own attendance correction (self-approval) | UI no longer offers self-approve path in this pass; **server SoD not verified** (do not treat as fully closed until API rejects self-approve). |
| HR-B-020 | Expense claim accepts huge amount (₹999,999,999); silent 9-digit cap | UI behaviour improved this pass; **server max not verified**. |
| HR-B-021 | Expense amount silently drops minus/letters | UI behaviour improved this pass; **server/input contract not verified**. |

### FIXED only for an unused department
| ID | Title (short) | Note |
|---|---|---|
| HR-B-017 | Archiving department fails (dependencies contract error) | Archive worked for an **unused** department this round; not re-proven for a department with employees/links. |

### PARTIAL
| ID | Title (short) | 15 Oct note |
|---|---|---|
| HR-B-004 | Department form raw validation "Too small: expected string to have >=2 characters" | **1-character name still not blocked client-side** — see **HRM-B-008**. |
| HR-B-013 | Attendance correction rejects morning check-in as later than current time (UTC vs IST) | Past-time submit **OK on 14 Oct**; on **15 Oct** a **second** correction for the same date while one is pending **fails silently** — see **HRM-B-003**. |

### Not reproduced
| ID | Title (short) |
|---|---|
| HR-B-010 | Attendance times shown in UTC while labels say IST |

### Not tested
| ID | Title (short) |
|---|---|
| HR-B-009 | Approving attendance correction shows ApiContractError though server applied it |
| HR-B-014 | Leave balance jumps 0 → 11 after 1-day Casual approved; card still says prorated 3 of 12 months |
| HR-B-016 | Leaves Error — Failed to load leaves data (intermittent) |
| HR-B-023 | Bulk onboarding: unclosed quote merges CSV lines; preview shows raw CSV as name |
| HR-B-024 | Exit "Submit resignation" only for signed-in user; HR cannot resign another employee here |
| HR-B-025 | Completing termination: account stays Active; no checklist / settlement draft |

