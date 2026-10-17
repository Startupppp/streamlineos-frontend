# HR — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining HR work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### HR-B-005 — UNKNOWN

Duplicate department names are accepted

Latest report note: Medium: Duplicate department names are accepted

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

### HR-B-014 — UNKNOWN

Leave balance jumps from 0 to 11 after a 1-day Casual leave is approved; card text still says "Prorated … 3 of 12 months"

Latest report note: Leave balance jumps 0 → 11 after 1-day Casual approved: STILL OPEN | Before approval: Available Days 0. After approving a 1-day Casual leave (Oct 21): Available Days 11, card "Casual 11/12 days available", no proration label. Approved (YTD) 1.

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

### HR-B-016 — UNKNOWN

Leave requests page showed "Leaves Error — Failed to load leaves data" once on owner reload (intermittent)

Latest report note: Leaves Error intermittent after write: NOT SEEN | Leave tabs reloaded many times, no error banner. Leave tabs reloaded several times this pass without error.

- **Severity:** Low (observed once; recovered with "Try Again")
- **Route:** /hr/leaves?tab=approvals (owner)
- **Steps:** Reject a leave in the Approvals list, then reload the page.
- **Expected:** Leave list loads.
- **Actual:** Main area shows "Leaves Error / Failed to load leaves data. Please try again. [Try Again]". "Try Again" loaded the list with the correct statuses (Rejected by qaown1012b).
- **Impact:** Transient failure after a write; users may think the decision did not save.
- **Suggested fix:** Investigate the first leaves query after a write (possible cache/ordering issue); show last known data with a retry, not a blocking error.
- **Status:** 1 occurrence (not reproduced on a second reload). Logged for follow-up.

### HR-B-019 — UNKNOWN

A new version of an active leave policy cannot be activated: "Cannot activate — resolve policy conflicts" blocks it against its own v1

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

### HR-B-020 — PARTIAL

Expense claim accepts a huge amount (₹999,999,999); the amount field silently caps input at 9 digits

Latest report note: Expense claim accepts huge amount (₹999,999,999); silent 9-digit cap: UI behaviour improved this pass; **server max not verified**.

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

### HR-B-022 — UNKNOWN

Confirming an asset return does not unassign the asset; it stays "Assigned" to the employee

Latest report note: Asset return does not unassign: FIXED | Assigned QA1015 Laptop to QA1015 Member → Log return (POST 201, Pending) → Received → Confirm. Asset list then Available / Unassigned, Assigned 0.

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

### HR-B-025 — UNKNOWN

Completing a termination says the account will be deactivated and a settlement started, but the employee stays Active and no offboarding checklist or settlement draft appears

Latest report note: Termination completion leaves employee Active: NOT RE-RUN | Not run: would terminate a real or test employee; out of scope (no real employee may be terminated). The existing completed termination (QA HR Thirteen, round 1 owner run) is unchanged.

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

### HRM-B-001 — PARTIAL

Status dropdown has no options — a position cannot be created

Latest report note: Positions Status dropdown has no options: STILL OPEN | Create position → Status dropdown opens with zero options (3 attempts; third attempt with title filled shows "Status is required").

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

### HRM-B-009 — OPEN

Overlapping leave request fails with HTTP 400 and no visible message

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

### HRM-B-010 — OPEN

Owner can approve their own leave request (self-approval) and it is applied

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

### HRM-B-012 — OPEN

Joining date defaults to 14 Oct 2026 (yesterday) on the Job Details step

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

### HRM-B-021 — PARTIAL

Same person shows different status labels

- **Severity:** Low. **Route:** /hr/employees vs profile.
- **Actual:** directory card and side sheet say "Pending invite"; profile header says "Active" with "Invite sent". **Expected:** one employment status and one invite status, labelled separately. **Fix:** split the badges. **Acceptance:** same labels on all three views.

### HRM-B-022 — PARTIAL

Unknown employee deep link gives generic 404; unknown employeeId on termination is silent

- **Severity:** Low. **Routes:** /hr/employees/00000000-0000-4000-8000-000000000000 and /hr/employees/not-a-real-id → app-level "Page Not Found". /hr/termination?employeeId=00000000-… → list loads with no notice that the employee does not exist.
- **Expected:** "Employee not found" with Back to directory; termination form not pre-filled silently. **Fix:** a not-found state inside the shell. **Acceptance:** bogus ID shows that message.

### HRMS-002 — UNKNOWN

Approving an employee's leave returns HTTP 500 and leave stays Pending

Latest report note: Approving employee leave returns HTTP 500: High | BLOCKED (no test record) | 2 | rt_HRMS-002_employee_leaves_after_submit_crash.webp | Employee's leave submit crashed the renderer. Reloaded list shows no new request; only the old Nov 16 Earned Leave, now Rejected by qaown1012b (cleanup). No pending employee leave exists to approve. Last verified: OPEN. | FIXED - QA Employee Earned Leave (Oct 21) created, approved by owner; no HTTP 500. Leave left Approved (see leftovers).

- Severity: High
- Priority: P1
- Status: VERIFIED
- URL: /hr/approvals and Action Center (POST api.streamlineos.in/hr/leaves/{id}/approve)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner (qaown1012b)
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2 (self-approve), P3 (employee leave)
- Preconditions: QA Employee Earned Leave 16 Nov 2026 Pending; no reporting manager on record, routed to HR approvals queue.
- Steps:
  1. Sign in as owner.
  2. Open Action Center / /hr/approvals.
  3. Click Approve on QA Employee's Earned Leave (Nov 16).
- Expected: Leave becomes Approved, or a clear 4xx reason is shown.
- Actual: Toast 'Something went wrong on our end. Please try again shortly.'; leave remains Pending. History: in P2 the owner's self-approval also returned 500 (3 of 3, two tabs); in P3 self-approval now returns a clear message 'You cannot approve your own leave request' (2 of 2), so that part changed.
- Evidence: /workspace/qa/hrms/p3_21_owner_approve_emp_nov16_500.png, /workspace/qa/hrms/p2_t1_approvals_pending_500.png, /workspace/qa/hrms/p3_19_owner_approve_own_nov18_now_400_message.png
- Repro rate: Employee leave: 1 of 1 (P3). Self-approve: 3 of 3 (P2) then not reproduced (P3, changed to message).
- Impact: No leave in the org can currently be approved by the owner through the HR queue as observed; core HR workflow blocked.
- Likely layer: Server (HTTP 500 on approve endpoint, VERIFIED from network/console). Root cause not known.
- Acceptance criterion: Approving a valid pending leave by an eligible approver returns 2xx and status Approved; ineligible approver gets a 4xx with reason; no 500.
- Safe retest: Approve Nov 16 leave once as owner; check status and network. Reject was NOT tested (would change records).

### HRMS-005 — UNKNOWN

BE-09: Invite link "expired" immediately or after verification; resend email not delivered (HRMS-005, NOT REPRODUCED from 1 invite; HRMS-026, BLOCKED; resend delivery, NEW/open)

Latest report note: Invite link 'expired' while invite Pending: High | BLOCKED | 0 | none | Needs a real invite email to a temp inbox; restricted to @example.com. Not sent. Last verified: OPEN. | NOT REPRODUCED - 1 temp-mail invite (QA Retest Invite); magic link valid immediately, no "expired". PIN step not covered (see HRMS-026).

**Evidence:** the link showed "expired" immediately while the member list showed Pending. After verification it showed a skeleton, then "expired", even though the account worked. Retest 2: one fresh magic link was valid. The PIN step wasn't covered (one PIN digit was dropped once). The resend email was not delivered (also the HR Admin OTP per QA open questions).
**Hypotheses:** H1: the token expiry comparison uses mixed timezones or units (seconds vs ms, local vs UTC). H2: the token is consumed or invalidated at verification, so the post-verify redirect re-checks a consumed token and shows "expired". H3: resend rotates the token but the email holds the old one, or resend never enqueues mail (check queue/provider logs and error handling). H4: link prefetchers (email scanners) consume single-use tokens on GET.
**Required behaviour:** token validity = `status=PENDING AND now_utc < expires_at_utc AND not revoked`. Invite status and link validity must always agree. Verify consumes the token **once**, inside a transaction, and redirects into the app. A re-visit by the same now-member shows "already accepted, sign in", not "expired". GET of the link must not consume it; consume on POST/verify. Resend: creates or rotates the token, invalidates the old one, enqueues the email, returns `202`, and surfaces provider failure as `502 {code:"EMAIL_DELIVERY_FAILED"}` or a retriable job with status visible to the admin. Rate-limit resend (e.g. 5/hour per invite → `429`). Errors: `410 {code:"INVITE_EXPIRED"}`, `409 {code:"INVITE_ALREADY_ACCEPTED"}`, `404 {code:"INVITE_NOT_FOUND"}` (also used for revoked or other-org tokens, to avoid enumeration). PIN: verification accepts exactly N digits (strip whitespace), with constant-time compare and attempt limiting.
**Edge cases:** expired token, token reused after acceptance, token forwarded to and opened by a different signed-in user (must not attach the invite to the wrong account; require email match or explicit confirmation), the old token after resend, invite email case or whitespace differences, plus-addressing, the invitee already a member of another org, an invite revoked after send, clock skew, expiry exactly at the boundary, an email-scanner GET.
**Tests:** unit tests for the token validity function (boundaries, timezone). Integration tests for the full flow (create → GET doesn't consume → verify → redirect → re-visit), expired, reused, resend invalidates the old token and enqueues mail (mock provider asserts send called, and a failure path), and the rate limit.

### HRMS-007 — PARTIAL

BE-12: Reporting-manager eligibility rule (HRMS-007, PARTIALLY FIXED)

Latest report note: Reporting-manager picker lists only owner: Medium-High | BLOCKED (not retested) | 0 | none | Would require editing a real employee's manager; not done. Last verified: PARTIAL (explanation shown, QA Manager still not selectable). | PARTIALLY FIXED - picker now explains "6 people cannot be selected - complete their job details"; QA Manager still not selectable.

**Evidence:** the picker now says "6 people cannot be selected - complete their job details". QA Manager is still not selectable, and earlier only the owner was listed.
**Hypotheses:** eligibility requires a complete employment record (department, title, start date…), and QA Manager's record is missing a field. Or eligibility wrongly also requires a manager role.
**Required behaviour:** define and document the rule server-side, e.g. eligible = same org, active (not terminated or deleted), has a worker record, not the employee themself, and not creating a cycle. **DECIDE** whether "complete job details" is truly required (recommend requiring only an active worker record). Provide an endpoint (or extend the existing one) that returns candidates with `eligible:boolean` and `ineligibleReasons:["MISSING_JOB_DETAILS:department", ...]` per person. Setting an ineligible manager returns `422 {code:"MANAGER_NOT_ELIGIBLE", message:"QA Manager can't be a reporting manager: missing department.", details:{reasons}}`. Cycles return `422 {code:"MANAGER_CYCLE"}`.
**Edge cases:** self as manager, A→B→A cycle (and deeper), a terminated manager, a manager in another org (404), a manager deleted after assignment (reports reassigned or flagged), many candidates (paginate or search).
**Tests:** unit tests for the eligibility and cycle detection. Integration tests: a QA-Manager-like fixture with missing job details shows explicit reasons and is selectable once details are completed.

### HRMS-008 — OPEN

BE-01: Server must expose effective permissions; all HR admin endpoints must enforce them (HRMS-008, STILL OPEN; HRMS-024, BLOCKED; UX-15, BLOCKED)

Latest report note: Member sees admin-like HR sidebar / role config: Medium | STILL OPEN | 1 | rt_HRMS-002_employee_leaves_after_submit_crash.webp (employee sidebar) | Employee sidebar shows HR configuration, Access & governance, People analytics, Cases, Expenses, Compensation & Benefits etc. | STILL OPEN (carry-over; employee sidebar still shows HR configuration, Access & governance, Compensation, etc.).

**Evidence (observed):**
- An HR Module **Member** (QA Employee) sees the full admin sidebar: HR configuration, Access & governance, HR access, People analytics, Cases, Expenses, Compensation & Benefits. Many items redirect to Access Restricted when opened (e.g. custom-fields, approvals).
- `/hr/access` is readable by the Member: role groups and full permission lists (e.g. "Owner 144/144"), read-only.
- A Manager saw an editable Edit tab on a non-report's profile. Saving was rejected by the server with toast `Missing permission: hr:employees:update`. Server enforcement worked for that write.
- The access-denied page puts raw permission keys in the URL and body: `/access-denied?required=module:hr, hr:custom-fields:manage`.

**Root-cause hypotheses (verify):**
- H1: the UI builds navigation from a static list because no API returns the caller's effective permissions.
- H2: read endpoints behind admin pages (roles/permission groups, audit log, analytics, custom fields, compensation) check only `module:hr`, not the specific permission.
- H3: manager scope ("direct/indirect reports") isn't computed server-side for profile reads/edits, or is computed but not exposed.

**Required behaviour:**
- Add or extend an endpoint such as `GET /me/permissions` (reuse an existing session/me endpoint if there is one). It returns `{ orgId, roles: [...], permissions: ["hr:employees:read", ...], scopes: { "hr:employees:update": "all" | "reports" | "self" | "none", ... }, version }`. Compute it per request from current role assignments. Give it a short TTL at most, and invalidate it on role change.
- Add a per-resource capability hint where cheap. Example: the employee detail response includes `capabilities: { canEdit, canViewSensitive, canApprove... }` evaluated server-side for that caller and that record.
- **Every** HR admin endpoint, read and write, enforces its specific permission. Write a route-to-permission matrix test covering every HR route. Members get `403 {code:"FORBIDDEN"}` on `/hr/access` role/permission data and on audit log, unless product decides Members may read role definitions. **DECIDE**: recommend deny.
- Manager editing a non-report: `403 {code:"FORBIDDEN", message:"You don't have permission to edit this employee."}`. Reports-scope applies only to actual current reports.
- 403 response bodies must **not** list internal permission keys to end users. Use a generic message plus an optional `requiredCapability` that is a human label (e.g. "Custom fields"). If the API currently returns keys that the UI then puts in the URL, remove or replace them in the API response. Note the contract change.

**Edge cases:** role downgraded mid-session (next request must reflect it), user deactivated or terminated mid-session (401/403), cross-org IDs (404), a manager whose report moves to another manager mid-session, an owner with every permission, a custom role with partial permissions, the HR module disabled for the org (every HR endpoint returns `403 {code:"MODULE_DISABLED"}`), a stale cached permission list.

**Acceptance criteria:** the permission API reflects role changes on the very next request. The route-matrix test passes for Owner, HR Admin, Manager, and Member. No 403 body contains raw `module:`/`hr:` keys. Manager edits of a non-report are denied, and `capabilities.canEdit=false` is returned for that profile.

**Tests:** unit tests for permission resolution (role → permissions → scopes). API integration tests: a table-driven role × route matrix (200/403/404), `GET /me/permissions` per role, downgrade-mid-session, cross-org IDOR, and a 403 body snapshot with no raw keys.

### HRMS-013 — PARTIAL

BE-14: Duplicate holiday on the same date (and location) must be rejected (HRMS-013, BLOCKED)

Latest report note: Duplicate holidays on same date accepted: Medium | BLOCKED (inconclusive) | 2 | rt_HRMS-013_add_holiday_drawer.webp, rt_HRMS-013_date_picker_dec2026.webp, rt_HRMS-013_date_required_no_save.webp | Date picker in Add holiday drawer flaky; on attempt 2 it would not open. Nothing saved ('Date is required'). Last verified: OPEN. | BLOCKED - Add-holiday date picker flaky again; no duplicate saved.

**Evidence:** Dec 25 2026 had 3 holidays ("QA Test Holiday", "QA Dup Holiday", "QA P3 Dup Retest"), all saved with "Holiday added". QA deleted them afterwards.
**Required behaviour:** reject creating or updating a holiday when a non-deleted holiday exists with the same (org, calendar/location, date): `409 {code:"HOLIDAY_DATE_CONFLICT", message:"A holiday already exists on 25 Dec 2026 (QA Test Holiday).", details:{existingId}}`. "All locations" conflicts with any location-specific holiday on that date, and vice versa. **DECIDE** (recommend conflict). Back this with a unique partial index. The migration must first report existing duplicates without deleting them. Leave-day calculation must count a date only once even if legacy duplicates exist.
**Edge cases:** soft-deleted holiday on the same date (allowed), an update moving onto a taken date, two concurrent creates, a leap-day holiday, name with Unicode or injection characters, name max length (QA saw a 300-char name error; keep the existing max).
**Tests:** integration tests for conflict (409), soft-deleted allowed, the concurrent race, location vs all-locations, and a leave calculation with legacy duplicates.

### HRMS-015 — UNKNOWN

Invite onboarding phone field loses focus after first digit; digits go into emergency contact name

Latest report note: Invite onboarding phone field loses focus: Medium | BLOCKED | 0 | none | Needs invited-employee onboarding. | BLOCKED - needs invited-employee onboarding phone field; not reached.

- Severity: Medium
- Priority: P2
- Status: VERIFIED (count not recorded)
- URL: Invited-employee onboarding form
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Invited employee
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2R
- Preconditions: Invited user on self-onboarding.
- Steps:
  1. Type a phone number.
- Expected: All digits go into phone field.
- Actual: Focus jumps after first digit; remaining digits entered into emergency contact name.
- Evidence: /workspace/qa/hrms/p2r_employee_onboarding_bank_step.webp
- Repro rate: Observed during setup; count not in sources.
- Impact: Corrupted contact data on self-onboarding.
- Likely layer: Not evidenced.
- Acceptance criterion: Typing a 10-digit number keeps focus and stores all digits in phone.
- Safe retest: Next invited user: type phone, verify fields.

### HRMS-016 — UNKNOWN

/hr HR overview (Hub) body intermittently blank

Latest report note: /hr Hub intermittently blank: Medium | INTERMITTENT (not cleared) | 4 | rt_HRMS-016_hub_loading_skeleton.png | 4 loads: one showed header + skeletons for 15+ s; later loads rendered cards and 'Start here' content. Still intermittent. | INTERMITTENT - /hr hub rendered on 2 loads this pass (3.2 s). New "Leaves Error" state seen on /hr/leaves (see new bugs).

- Severity: Medium
- Priority: P2
- Status: VERIFIED, intermittent
- URL: /hr
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800, 768, 375
- Pass: P1, P2, P3
- Preconditions: Signed in owner.
- Steps:
  1. Hard load /hr.
- Expected: Overview cards or an empty state.
- Actual: Header and subtitle only. P2: blank on all loads at 3 widths; P3: blank on 1st load and at 768, rendered on 3rd load. One P2 load had CORS failures (HRMS-022).
- Evidence: /workspace/qa/hrms/p1_03_hr_hub_blank.png, /workspace/qa/hrms/p3_01_hr_hub_owner_blank.png, /workspace/qa/hrms/p3_39_hr_hub_desktop_3rd_load_rendered.png
- Repro rate: Intermittent (P3: 1 of 3 desktop loads blank).
- Impact: Landing page of the module looks broken.
- Likely layer: Not evidenced; possible link to CORS failures is INFERRED.
- Acceptance criterion: Hub renders content or an explicit empty state on every load (10/10).
- Safe retest: Load /hr 10 times; count blanks.

### HRMS-017 — PARTIAL

BE-10: Duplicate-email check inconsistent: member vs invitee vs employee (HRMS-017, PARTIALLY FIXED)

Latest report note: Onboarding duplicate-email check inconsistent: Medium | BLOCKED | 0 | none | Onboarding wizard unstable. Last verified: inconsistent. | PARTIALLY FIXED - qaadm1012d@ (existing member) blocked inline: "belongs to a member of your organization", Next stayed on Personal. But ggbdpvlg@ (new invitee) showed "already belongs to an employee" and still advanced to Job Details. Inconsistent.

**Evidence:** existing member `qaadm1012d@…` was blocked: "belongs to a member of your organization". New invitee `ggbdpvlg@…` showed "already belongs to an employee" **but still advanced** to Job Details. Earlier, `qa.happy1@example.com` was blocked while a listed employee's email passed.
**Hypotheses:** H1: there are two different lookups (users/members table vs worker/employee table vs pending invites) with different blocking semantics. H2: the duplicate check is advisory (warning), not enforced on the final create. H3: missing normalization.
**Required behaviour:** one server-side rule, enforced on the check endpoint **and** on final employee create/invite. Normalize: trim, lowercase the whole address (**DECIDE**: recommend lowercase full address; do **not** strip plus-tags, so `a+1@x.com` ≠ `a@x.com`, but document this). Conflict when the normalized email matches, within the same org, an active employee/worker, an active member, or a pending invite → `409 {code:"EMAIL_ALREADY_EXISTS", details:{kind:"employee"|"member"|"invite", id}}` with one consistent message per kind. Soft-deleted or archived records: **DECIDE** between block-with-restore-option and allow (recommend returning `409` with `kind:"archived_employee"` and a restore hint). Back this with a unique partial index on (org_id, normalized_email) for active records.
**Edge cases:** case or whitespace variants, Unicode/IDN domains, plus-addressing, the same email in another org (allowed), two concurrent creates with the same email (one wins), an email belonging to a terminated employee.
**Tests:** unit tests for normalization. Integration tests: each kind returns 409 on both check and create, the concurrent create race, and cross-org allowed.

### HRMS-018 — UNKNOWN

Intermittent error boundary on /hr/employees hard load (React #441)

Latest report note: Error boundary on /hr/employees hard load (React #441): Low | NOT REPRODUCED (intermittent) | 2 | none | 2 deep loads of /hr/employees, no error boundary; 'Employee directory' rendered. Needs ~50 loads to clear. | NOT REPRODUCED - /hr/employees loaded (6.6 s), "Employee directory", no error boundary (3rd clean load).

- Severity: Low
- Priority: P3
- Status: VERIFIED, intermittent
- URL: /hr/employees
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2
- Preconditions: Signed in as stated role.
- Steps:
  1. Hard load /hr/employees right after /hr.
- Expected: Directory renders.
- Actual: 'Something went wrong / An unexpected error occurred'; console Minified React error #441, digest 605193880.
- Evidence: Console/session notes only (no screenshot)
- Repro rate: 1 of ~45 deep loads (approximate). Slow skeleton (~4 s) also seen in P1/P3.
- Impact: Occasional broken page.
- Likely layer: Client render error (console).
- Acceptance criterion: 0 error boundaries in 50 hard loads.
- Safe retest: Loop hard loads with console capture.

### HRMS-019 — UNKNOWN

Settings sub-pages intermittently showed wrong content on direct load

Latest report note: Settings sub-pages show wrong content on direct load: Low | NOT REPRODUCED | 2 | none | templates (HR Templates), automations (HR Automations), versions (Version History), import-export (Import / Export) all rendered the right heading. /hr/settings/versions crashed in one earlier tab. | NOT REPRODUCED - templates, automations, import-export load with correct headings (versions not re-run).

- Severity: Low
- Priority: P3
- Status: VERIFIED in pass1; NOT REPRODUCED in pass2 (39/39 correct) -> intermittent
- URL: /hr/settings/templates, /automations, /versions, /import-export
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: Pass1, P2
- Preconditions: Signed in as stated role.
- Steps:
  1. Hard load each route.
- Expected: Route's own page.
- Actual: Pass1: wrong content intermittently; P2: 39/39 correct.
- Evidence: Console/session notes only (no screenshot)
- Repro rate: Intermittent; pass1 counts not recorded.
- Impact: Users may land on wrong page.
- Likely layer: Not evidenced.
- Acceptance criterion: 50/50 correct.
- Safe retest: Repeat deep-load loop.

### HRMS-020 — UNKNOWN

BE-18: Slow list/load endpoints: pagination and indexes (HRMS-020 audit log ~20 s, NOT REPRODUCED in Retest 2 (~1 s); HRMS-016 hub blank, INTERMITTENT; /hr/employees 4-10 s skeleton)

Latest report note: Access audit log drawer takes ~20 s: Low | NOT REPRODUCED | 1 | rt_HRMS-020_access_audit_log_button.png | 'Audit log' button on /hr/access opened the drawer immediately (Audit Log, org.module_enabled entry visible within ~6 s). | NOT REPRODUCED - Audit log drawer opened and showed org.module_enabled entry in ~1.0 s.

**Evidence:** the access audit log drawer took about 20 s (P1/P3) and about 1 s in Retest 2. /hr hub showed header plus skeletons for 15+ s on one load and rendered in 3.2 s on others. The employee directory took 4-10 s. /hr/employees once took 6.6 s.
**Hypotheses:** unpaginated queries, N+1 queries (per-employee permission or relation lookups), missing indexes on (org_id, created_at) / (org_id, status), a hub endpoint aggregating many queries serially, or a hub endpoint failing (CORS/500) and the UI rendering blank.
**Required behaviour:** all HR list endpoints (employees, audit log, leaves, expenses, approvals, holidays) use cursor or limit/offset pagination (default 25, max 100, `limit>100` → clamp or 400 per convention), stable ordering, and org-scoped indexes. Remove N+1 queries. Hub: aggregate in parallel and return partial data with per-widget error flags instead of failing as a whole. Target p95 < 500 ms server time on seeded data (e.g. 5k employees, 50k audit rows). Add indexes in reversible migrations (concurrently, if Postgres).
**Edge cases:** `limit=0`, negative, huge, or non-numeric; invalid cursor (400); a page past the end (empty); an org with zero records; ordering ties.
**Tests:** integration tests for pagination contracts and a query-count assertion (no N+1) where the stack supports it. Optionally a perf smoke test on seeded data (report numbers; don't make CI flaky).

### HRMS-021 — UNKNOWN

Leave double-click: drawer stays open with filled form after success

Latest report note: Leave double-click: drawer stays open: Low | BLOCKED | 0 | none | Needs an agreed test leave; none exists. | BLOCKED - needs an agreed pending leave to double-click; none created.

- Severity: Low
- Priority: P3
- Status: VERIFIED
- URL: /hr/leaves Request leave
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1
- Preconditions: Signed in as stated role.
- Steps:
  1. Fill valid leave, double-click Submit.
- Expected: One request, drawer closes with success toast.
- Actual: First click created request; second showed 'overlapping dates' error; drawer stayed open with form.
- Evidence: /workspace/qa/hrms/p1n_14_leave_valid_after_dblclick_dialog_open.png, /workspace/qa/hrms/p1n_15_leave_visible_in_action_center.png
- Repro rate: 1 of 1.
- Impact: User may think submit failed.
- Likely layer: Not evidenced.
- Acceptance criterion: Submit disabled during request; drawer closes on success.
- Safe retest: Only with an agreed test leave.

### HRMS-022 — UNKNOWN

Intermittent CORS failures on api.streamlineos.in from /hr

Latest report note: Intermittent CORS failures on api.streamlineos.in: Low | NOT REPRODUCED | 2 | none | Console listener on /hr and /hr/leaves (2 loads): no CORS, ERR_ or Access-Control messages. | NOT REPRODUCED - console 0 errors on /hr/assets; no CORS/ERR_ messages on this pass.

- Severity: Low
- Priority: P3
- Status: VERIFIED once; not reproduced in 3 reloads
- URL: /hr
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2
- Preconditions: Signed in as stated role.
- Steps:
  1. Load /hr after in-app navigation; watch console.
- Expected: No CORS errors.
- Actual: ~16 endpoints blocked 'No Access-Control-Allow-Origin' (hr/hub, billing, organization ...).
- Evidence: Console/session notes only (no screenshot)
- Repro rate: 1 of 4 loads.
- Impact: May explain blank hub (INFERRED).
- Likely layer: API/edge response headers (console evidence only).
- Acceptance criterion: No CORS errors over 20 loads.
- Safe retest: Console capture loop.

### HRMS-023 — UNKNOWN

BE-17: Notifications event stream drops (ERR_HTTP2_PROTOCOL_ERROR) and intermittent CORS failures (HRMS-023, BLOCKED; HRMS-022, NOT REPRODUCED but unproven)

Latest report note: Notifications event stream drops (ERR_HTTP2_PROTOCOL_ERROR): Low | BLOCKED | 0 | none | 10-minute console watch not run. | BLOCKED - 10-minute event-stream console watch not run.

**Evidence:** console showed `ERR_HTTP2_PROTOCOL_ERROR` / `ERR_CONNECTION_CLOSED` on the notifications stream. Once, about 16 endpoints on `api.streamlineos.in` failed with "No 'Access-Control-Allow-Origin'" (hr/hub, billing, organization…), coinciding with a blank /hr hub (HRMS-016). Not reproduced on later passes.
**Hypotheses:** H1: no SSE keepalive, so the proxy/LB idle timeout kills the stream mid-HTTP/2. H2: the response is buffered or compressed by the proxy. H3: CORS headers are missing on error responses (5xx/502 from the edge, or on preflight), so failures look like CORS. H4: the allowlist includes only `www.streamlineos.in` or only the apex, not both. H5: the `Vary: Origin` header is missing, so a CDN caches one origin's headers.
**Required behaviour (server/infra config in repo only):** SSE sends `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` (if nginx), no compression, a heartbeat comment (`: ping`) every 15-25 s (below the smallest proxy idle timeout), `retry:` hint, and `id:` plus `Last-Event-ID` resume if supported. Clean shutdown on client disconnect (no leaked listeners). The SSE endpoint is authorized per org. CORS: an explicit allowlist covering `https://www.streamlineos.in` and `https://streamlineos.in` (and configured dev/staging origins from env), never `*` with credentials, CORS headers on **all** responses including 4xx/5xx and preflight, and `Vary: Origin`. Document any proxy/LB timeout changes needed outside the repo.
**Edge cases:** an origin not in the allowlist (no ACAO header), `null` origin, the origin with a trailing slash or different case, a long-lived stream past 10 minutes, a token expiring mid-stream, the user's org switch mid-stream.
**Tests:** integration tests: SSE emits a heartbeat within N s with a fake clock, the correct headers, and cleanup on disconnect. CORS tests per origin (allowed apex and www, disallowed evil.com) on 200, 404, 500, and OPTIONS.

### HRMS-024 — UNKNOWN

Manager sees editable Edit tab on non-report; save rejected only by server toast

Latest report note: Manager sees editable Edit tab on non-report: Low | BLOCKED | 0 | none | Needs a QA Manager session; not used this pass. | BLOCKED - needs QA Manager check of Edit tab on a non-report; not run this pass.

- Severity: Low
- Priority: P3
- Status: VERIFIED (session note, no screenshot)
- URL: /hr/employees/0471e591-3512-4197-9fdd-3e16b6f11c1b
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: QA Manager
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2M
- Preconditions: Signed in as stated role.
- Steps:
  1. As Manager, open QA Employee, Edit designation, Save.
- Expected: No Edit affordance without permission.
- Actual: Edit shown; toast 'Missing permission: hr:employees:update'. Server correctly denies.
- Evidence: Console/session notes only (no screenshot)
- Repro rate: 1 of 1.
- Impact: Confusing; wasted input.
- Likely layer: UI gating (server enforces).
- Acceptance criterion: Edit hidden/disabled without hr:employees:update.
- Safe retest: Repeat as Manager.

### HRMS-026 — UNKNOWN

Invite verification PIN dropped a digit

Latest report note: Invite verification PIN dropped a digit: Low | BLOCKED | 0 | none | Needs invite verification flow. | BLOCKED - needs invite verification PIN step; only one invite sent (permitted scope).

- Severity: Low
- Priority: P4
- Status: VERIFIED once
- URL: Invite verify-code step
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Invited user
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2R
- Preconditions: Signed in as stated role.
- Steps:
  1. Type the 6-digit code.
- Expected: All digits kept.
- Actual: One digit dropped once.
- Evidence: /workspace/qa/hrms/p2r_employee_verify_code_step.webp
- Repro rate: 1 (count of attempts not recorded).
- Impact: Failed verification, retries.
- Likely layer: Not evidenced.
- Acceptance criterion: Typing/pasting the code keeps every digit.
- Safe retest: Next invite verification.

### HRMS-027 — UNKNOWN

Keyboard sequence unexpectedly navigated to /settings/billing?tab=plan

Latest report note: Keyboard sequence navigated to /settings/billing: Low | BLOCKED (not retested) | 0 | none | Keyboard pass with focus logging not run. Billing is out of scope for this QA. | BLOCKED - out of scope (Billing); keyboard sequence not run.

- Severity: Low
- Priority: P4
- Status: VERIFIED once; triggering element UNKNOWN
- URL: /hr/leaves area
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2
- Preconditions: Signed in as stated role.
- Steps:
  1. Keyboard navigation with Shift+Tab/Enter.
- Expected: No unexpected navigation.
- Actual: Landed on billing plan page; no action taken.
- Evidence: /workspace/qa/hrms/p2_t6_accidental_billing_nav_from_keyboard.png
- Repro rate: 1.
- Impact: Accidental navigation to billing.
- Likely layer: Not evidenced.
- Acceptance criterion: Identify element; focus order visible.
- Safe retest: Keyboard pass with focus logging.

## UX notes that are not done

### UX-01 Raw validation text on Department
- User tries: Next on Job Details without department.
- Observed: "Invalid input: expected string, received undefined" (3 of 3). Evidence: p1n_02_onb_jobdetails_empty_next.png, p3_11_onb_department_invalid_input.png
- Recommendation: "Select a department" inline, focus moves to the field.
- Why: raw schema text is meaningless to HR users.
- Verify: empty Next shows the new copy; aria-describedby links it.

### UX-02 Empty onboarding email
- Tries: Next with empty email. Observed: "Invalid email address" (P1 2, P3 1, P2). Evidence: p1n_01_onb_all_empty_next.png, p2_t6_onboarding_empty_next_errors.png
- Recommendation: empty -> "Email is required"; malformed -> "Enter a valid email, e.g. name@company.com".
- Why: tells the user what to fix. Verify: both cases show distinct copy.

### UX-03 Sign-in email validation
- Tries: submit empty, then 'abc'. Observed: same message both times. Evidence: 10_signin_empty_submit_validation.webp, 11_signin_abc_validation.webp
- Recommendation: same split as UX-02. Verify: two distinct messages.

### UX-04 Phone country selector unnamed
- Tries: screen-reader/keyboard user tabs to flag button. Observed: no accessible name (aria-expanded=false only). Evidence: p2_t6_onboarding_focus_ring_phone.png
- Recommendation: aria-label="Country code, India (+91)" updated on change.
- Why: WCAG 4.1.2. Verify: accessibility tree shows the name.

### UX-05 Leave date picker keyboard
- Tries: pick a date via keyboard. Observed: focus lands on "Previous month"; arrows did nothing; day cell never reached. Evidence: p2_t6_leave_drawer_datepicker_focus.png
- Recommendation: focus the selected/today cell on open; arrows move days, PageUp/Down months, Enter selects; or allow typed date entry (DD/MM/YYYY).
- Why: WCAG 2.1.1. Verify: complete a date selection with keyboard only.

### UX-06 Tab order / skip link
- Observed: ~45 sidebar stops; First Name ~54th stop; "Skip to content" reached only after the last control.
- Recommendation: make "Skip to main content" the first focusable element, targeting <main>.
- Verify: first Tab shows the skip link; Enter moves focus to page heading.

### UX-07 Dialog descriptions
- Observed: console "Missing Description or aria-describedby={undefined} for DialogContent" (several, incl. leave drawer).
- Recommendation: add DialogDescription (visually hidden if needed), e.g. "Request time off. Fields marked * are required."
- Verify: no warning in console.

### UX-08 Asset sequential validation
- Observed: empty submit shows only "Asset name is required"; Serial/Brand/Model errors only after name. Evidence: p1n_19_asset_empty_submit.png
- Recommendation: show all required-field errors at once with a summary "3 fields need attention".
- Verify: one submit lists all errors.

### UX-09 375px layout
- Observed: /hr/leaves module tabs clipped ("Approvals 1"), Status column and "Cancel request" off-screen; onboarding tabs clipped. Evidence: p2_r5_375_leaves.png, p2_r5_375_onboarding.png
- Recommendation: card layout per leave on mobile with actions visible; scroll fade indicator on tab row.
- Verify: at 375 every row action visible without horizontal scroll.

### UX-10 Contrast (INFERRED)
- Placeholder/helper text looks light; not measured. Recommendation: verify >=4.5:1 for helper text; placeholders not used as labels. Verify: axe/contrast tool.

### UX-11 /hrms 404
- Observed: plain 404 outside app shell. Evidence: 06_hrms_404.png. Recommendation: redirect /hrms to /hr, or in-shell 404 with "Go to HR". Verify: /hrms lands on /hr.

### UX-12 DOB limit
- Observed: calendar opens Dec 2010, days after ~Oct 2010 disabled, year list 1940-2010, no explanation. Evidence: p3_09_*, p3_10_*. Recommendation: helper text "Employee must be at least 16 (or policy value)"; allow typed entry; validate with message. Verify: helper shown; typed underage date shows message.

### UX-13 Bank step skip
- Observed: "Skip for now" leaves a profile-incomplete banner. Evidence: p2r_employee_onboarding_bank_step.webp. Recommendation: banner copy "Add bank details to receive salary - Add now" with dismiss/remind; if expected behaviour, state on skip "You can add this later from Profile > Bank". Verify: copy present.

### UX-14 Self-approver note
- Observed: /hr/leaves "You are the approver - decide in Action Center" on own leave, which cannot be self-approved. Evidence: p2_t1_leaves_self_approver_note.webp. Recommendation: "Awaiting approval from HR approvals queue" naming the actual approver. Verify: own leave shows correct approver.

### UX-15 Permission keys in access-denied
- Observed: /access-denied?required=module:hr, hr:custom-fields:manage etc. Recommendation: human copy "You don't have access to Custom fields. Ask your HR admin." Keep keys out of the URL/body or behind a details toggle. Verify: no raw keys displayed. (Low risk: keys are not secrets.)

### UX-16 Long skeletons
- Observed: directory ~4 s skeleton; audit drawer ~20 s. Recommendation: after 5 s show "Still loading..." and after 15 s a Retry. Verify: messages appear on throttled network.

### HR-U-002: Explain "Needs another approver" on own leave requests
- **Where:** /hr/leaves?tab=approvals (Leave Requests cards) and /hr/leaves "My leaves".
- **Observed:** Own leave requests show "Needs another approver" with no explanation or next step; the owner (HR admin) cannot act on them.
- **Suggestion:** Add a tooltip or line: "You cannot approve your own request. The HR approvals queue will review it." Link to the approver list.

### HR-U-003: Two different counts for "pending approvals"
- **Where:** /hr/leaves tab "Approvals 2" vs /hr/approvals (Action Center) Leave count `0`, same user.
- **Observed:** Leaves tab counts 2 (own requests, which cannot be actioned) while Action Center counts 0 for Leave.
- **Suggestion:** Use one definition of "pending for me" across tabs, or label the leaves count "Pending across org".

### HR-U-005: Leave type names differ between the request form and the list
- **Where:** /hr/leaves "Request leave" → Leave Type options "Casual Leave", "Sick Leave", "Earned Leave"; the My leaves table shows "Casual", "Sick", "Earned".
- **Suggestion:** Use the same label in both places (e.g. "Casual Leave").

### HR-U-007: Duplicate name checks should name the existing record
- **Where:** Onboarding email duplicate (works well: "This email already belongs to an employee in your organization.") vs Departments (no check, HR-B-005).
- **Suggestion:** Same pattern everywhere; link to the existing record ("View QA HR Thirteen").

### HR-U-009: Clock-in cooldown lacks an explanation
- **Where:** /hr/attendance after "Clock out": button reads "Wait 1:46" with "Cooldown · 1:46".
- **Suggestion:** Explain why ("You can clock in again in 1:46 to prevent accidental double entries") and show the time it becomes available.

### HR-U-013: No maximum length on person-name fields
- **Where:** /hr/onboarding Personal step — First Name accepted a 300-character value with no message (Last Name accepted 120 characters).
- **Suggestion:** Enforce a max length (e.g. 100) with a visible counter or inline message, matching the 200-character designation rule.

### HR-U-014: Onboarding gate hides the real access result for some members
- **Where:** /hr for qaview1012e redirects to /employee-onboarding ("Personal details … Skip for now") before the access-denied page. qamem1012c and qahr1014a went straight to /access-denied (or to HR after onboarding).
- **Observed:** Same org, same non-HR role; behaviour differs. A member who has not finished the wizard is shown a profile form when they tried to open HR, which looks like HR is available to them.
- **Suggestion:** Send only users who are allowed to onboard to the wizard; everyone else should see the Access Restricted page with the required permission.

### HR-U-015: "Finish your details" banner copy promises HR access that does not come
- **Where:** employee QA HR Thirteen after "Skip for now" (banner "Your own employee profile is still incomplete" / "Completing your employee profile activates your access to the HR module").
- **Observed:** Completing or skipping the wizard did not grant any hr:* permission; all HR routes stayed on access-denied (see RBAC.md Round 2).
- **Suggestion:** Reword to what completing the profile really does (e.g. "Complete your profile so HR can find your details"), or grant the promised access.

### HR-U-016: Directory is a "People" list with no explanation of who is in it
- **Where:** /directory for every non-HR member.
- **Observed:** The list shows 2 people (QA HR Thirteen and the owner). The viewing member is not listed, and there is no note explaining why. Work emails of all listed people are visible to every org member.
- **Suggestion:** Either explain the filter ("Showing people with a linked account") or list all active members. Confirm the intended visibility of work email to non-HR members.

### HR-U-018: Leave balance card should show the calculation
- **Where:** /me/time-off "Available Days" card.
- **Observed:** "Available Days 11 · Prorated from your joining date (14 Oct 2026): 3 of 12 months" — the number does not match the text (see HR-B-014).
- **Suggestion:** Show "Entitlement X (prorated 3/12) − approved Y − pending Z = available W" so employees can check it.

### HR-U-021: Two rows with the same policy name in the list once a new version exists
- **Where:** /hr/settings/policies after "New Version" (HR-B-019) → "QA Leave 1013" appears twice (draft v2, active v1).
- **Suggestion:** Group versions under one policy row (expandable), or show "v2 (draft) of QA Leave 1013" in the name column.

### HR-U-022: Conflict message should not blame the same policy
- **Where:** Policy version "Cannot activate — resolve policy conflicts" (HR-B-019).
- **Observed:** The blocker is named as "QA Leave 1013" — the policy itself. "Raise priority, narrow scopes, or force-activate" is misleading advice for a self-conflict.
- **Suggestion:** Say "Overlaps with the active version of this policy (v1). Activating v2 will replace v1." and offer that action directly.

### HR-U-023: Department archive dialog names the department but not its code
- **Observed:** Two departments share the name "QA Dept 1013" (HR-B-005). The dialog cannot say which one is being archived.
- **Suggestion:** Show "QA Dept 1013 (QAD1013B)" in the title and the body text.

### HR-U-024: Holiday and shift row controls are icon-only with no visible hint
- **Where:** /hr/holidays List view (Edit / Delete icons) and /hr/shifts (pencil / trash icons).
- **Observed:** Both rows have edit and delete icons next to each other; a mis-click opens "Delete this holiday?" (a safe confirm, which is good). Holiday List view shows the icons only on hover.
- **Suggestion:** Keep the confirm dialogs (they work well). Show the icons always, or add a row menu ("…") so Edit and Delete are not adjacent.

### HR-U-025: Shift edit reads as a save but goes through a second confirm
- **Where:** /hr/shifts → Edit → Save Changes → "Save shift changes? Update "QA Shift 1013"? Existing assignments keep using this template."
- **Observed:** Confirm text is clear (good). But the edit sheet closes with no visible state while the confirm is open, which is confusing if the confirm is missed.
- **Suggestion:** Keep the sheet open behind the confirm, and show the changed fields (e.g. "Break 60 → 45 min") in the confirm body.

### HR-U-026: Termination "Create & Approve" is the only commit and it is final
- **Where:** /hr/termination → New Termination (also from the profile "Terminate" button).
- **Observed:** The form says "As FINAL, this will be automatically approved" and "Termination records are permanent". There is no Draft save, so the first click starts the offboarding (HR-B-025).
- **Suggestion:** Add "Save as draft" next to "Create & Approve", and a second confirmation that repeats the employee name, reason and effective date.

### HR-U-027: Complete Termination dialog should list its effects and show their result
- **Where:** /hr/termination → "Complete" → "Complete Termination".
- **Observed:** The text says it will "deactivate the employee's account, initiate the final settlement, and create asset return records" but does not list them, and the result screen does not confirm any of them (HR-B-025).
- **Suggestion:** List each effect with a checkbox or status ("Account: deactivated on save", "Settlement draft: created", "Asset returns: 0 open") and show the outcome after completion.

### HR-U-029: Asset return needs two confirmations and the "Received" label reads as a status
- **Where:** /hr/asset-returns: after "Log return" the row shows status "Pending" and an action labelled "Received"; the confirm reads "Mark this asset as returned in good condition?".
- **Observed:** The action name "Received" does not say it completes the return; the list does not say the asset is still assigned (HR-B-022).
- **Suggestion:** Label the action "Mark returned", and when confirmed, unassign the asset and say so in the toast.

### HR-U-030: Expense amount and "Other" category messages duplicate each other
- **Where:** /hr/expenses → New Expense Claim → Category "Other".
- **Observed:** Choosing "Other" shows two required fields: "What is the other category?" (with the hint "Letters, numbers, spaces, apostrophes, periods, and hyphens only.") and a second line "Please describe what the other category is" that is the same request.
- **Suggestion:** One field, one message.

### HR-U-031: HR expense queue does not show the owner's own pending claims and says nothing about it
- **Where:** /hr/expenses ("Expense Claims 0–0 of 0 total", "No expenses found") vs /me/expenses (4 Pending claims, including the owner's own).
- **Observed:** Own claims are not in the HR approvals list, and there is no note. Same pattern as own leave ("Needs another approver", HR-U-002).
- **Suggestion:** Show "Your own claims are approved by another approver" in the HR list, or show the owner's claims with the same note.

### HR-U-032: Helpdesk page has no way to raise a ticket from the HR side
- **Where:** /hr/helpdesk ("Employee support"): queue tabs HR / IT / Finance / Admin / Legal, "Queue settings", search. Create menu has People, Comms, Work, Docs items but no helpdesk request.
- **Observed:** "No HR requests — Requests routed to this queue appear here as employees raise them." No "New request" button. The owner could not create a helpdesk ticket (case created instead, see TEST-DATA R3-9).
- **Suggestion:** Add "New request" for HR staff (on behalf of an employee) or state where tickets are raised.

### Must change
1. **Owner's own expense shows no action and no explanation.** On the expenses Approvals / queue view, the owner's own pending expense (e.g. EXP-2026-006) has **no Approve/Reject (or other) action** and **no helper text** explaining why. Leave already says "Needs another approver" in a similar SoD case — expenses should do the same (or offer a clear "You cannot approve your own claim" state) so the owner is not left with a dead card.

2. **"Retire asset" sits right next to "Edit asset".** On the asset detail / row actions, **Retire** is adjacent to **Edit**, which makes a destructive/lifecycle action easy to hit by mistake while intending a routine edit. Separate destructive actions (Retire / Archive) from Edit — e.g. overflow menu, confirm step, or visual danger styling with spacing — so Edit cannot be fat-fingered into Retire.

### Good to have
1. **Assign-asset and resignation pickers omit employees with pending invites (product question).** When assigning an asset or recording/picking someone for resignation-related flows, employees whose invite is still **pending** (e.g. QA Emp, invite pending) do not appear in the picker. Confirm product intent: if pending invitees should be assignable/selectable, include them (with a "Invite pending" badge); if not, say in the empty/search state that only active (accepted-invite) employees can be chosen.

2. **Names reject digits (e.g. "QA1015") — clarify the rule in the hint.** Person/department-style name fields reject digits (test name patterns like QA1015). The rule may be intentional, but the field should show a **hint at rest or on reject** ("Letters, spaces, apostrophes and hyphens only — numbers are not allowed") instead of silent strip or a generic required error. Align with holiday-name copy where the allowed set is already spelled out.

3. **Linking an employee to an existing member email is blocked without a how-to.** Creating/linking an employee with an email that already belongs to an org member fails with **"This email belongs to a member of your organization"**. The message is correct as a block, but it should briefly explain **how to link an existing member** (e.g. choose from members, or use "Link existing member" on the profile) so HR is not stuck recreating people who already have accounts.

### Must change
1. Leave form copy contradicts the rest: form says "adityachalla01 approves their own leave as the organisation owner", and the pending card says "You are the approver — decide in Action Center" on the same owner's own request. Pick one rule (see HRM-B-010).
3. Silent failures on overlap and file uploads (HRM-B-009, HRM-B-015, HRM-B-016, HRM-B-018): a visible message is required for every rejected submit.
4. Asset row: "Retire asset" still sits directly next to "Edit asset" and "Assign Employee" (round-1 UX #2 still open).
5. Joining date default is yesterday (HRM-B-012).
