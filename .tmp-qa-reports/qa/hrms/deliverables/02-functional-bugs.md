# 02 Functional bugs - StreamlineOS HRMS

Environment for all: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off. Browser: Chrome on Linux. Tester time IST. Evidence paths relative to /workspace/qa/hrms/.

Status labels: VERIFIED / INFERRED / BLOCKED / UNTESTED / NOT APPLICABLE. Severity and priority are QA judgement.

Counts: High 5, Medium-High 2, Medium 10, Low 10 (total 27). UX/a11y-only findings are in 03.

| ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| HRMS-001 | Member/Manager can open the Sensitive tab (salary, bank, PAN, passport, national ID form) on other employees' profiles | High | P1 | VERIFIED (data exposure UNCONFIRMED: all values 'Not set') |
| HRMS-002 | Approving an employee's leave returns HTTP 500 and leave stays Pending | High | P1 | VERIFIED |
| HRMS-003 | Asset edit is last-write-wins: a stale tab silently overwrites another tab's save | High | P2 | VERIFIED |
| HRMS-004 | Submitted expense claims never reach HR expenses list or Action Center | High | P1 | VERIFIED |
| HRMS-005 | Invite flow: link reports 'expired' immediately and after verification, while invite is Pending and account works | High | P1 | VERIFIED (counts not recorded; observed during P2R invite sign-up) |
| HRMS-006 | Onboarding name field silently strips Unicode, accented letters and other characters | Medium-High | P1 | VERIFIED |
| HRMS-007 | Reporting-manager picker lists only the owner; QA Manager cannot be set as manager | Medium-High | P1 | VERIFIED (cause UNCONFIRMED) |
| HRMS-008 | Member sees full admin-like HR sidebar and can read role/permission configuration | Medium | P2 | VERIFIED |
| HRMS-009 | Onboarding wizard loses all entered data on refresh or Back/Forward | Medium | P2 | VERIFIED |
| HRMS-010 | No navigation at 768px width (no sidebar, bottom bar, or menu toggle) | Medium | P2 | VERIFIED |
| HRMS-011 | Expense amount input silently alters very large values (now truncates to 999999999 and saves Rs 99,99,99,999) | Medium | P2 | VERIFIED |
| HRMS-012 | Expense submit gives no visible confirmation, leading to duplicate claims | Medium | P2 | VERIFIED |
| HRMS-013 | Duplicate holidays on the same date accepted without warning | Medium | P3 | VERIFIED |
| HRMS-014 | Attendance correction check-in rejected as 'later than current time' (likely timezone comparison) | Medium | P2 | VERIFIED rejection once; timezone cause INFERRED |
| HRMS-015 | Invite onboarding phone field loses focus after first digit; digits go into emergency contact name | Medium | P2 | VERIFIED (count not recorded) |
| HRMS-016 | /hr HR overview (Hub) body intermittently blank | Medium | P2 | VERIFIED, intermittent |
| HRMS-017 | Onboarding: duplicate-email check inconsistent | Medium | P3 | VERIFIED behaviour; expected rule UNCONFIRMED |
| HRMS-018 | Intermittent error boundary on /hr/employees hard load (React #441) | Low | P3 | VERIFIED, intermittent |
| HRMS-019 | Settings sub-pages intermittently showed wrong content on direct load | Low | P3 | VERIFIED in pass1; NOT REPRODUCED in pass2 (39/39 correct) -> intermittent |
| HRMS-020 | Access audit log drawer takes ~20 s to load | Low | P3 | VERIFIED |
| HRMS-021 | Leave double-click: drawer stays open with filled form after success | Low | P3 | VERIFIED |
| HRMS-022 | Intermittent CORS failures on api.streamlineos.in from /hr | Low | P3 | VERIFIED once; not reproduced in 3 reloads |
| HRMS-023 | Notifications event stream drops (ERR_HTTP2_PROTOCOL_ERROR) | Low | P4 | VERIFIED (console) |
| HRMS-024 | Manager sees editable Edit tab on non-report; save rejected only by server toast | Low | P3 | VERIFIED (session note, no screenshot) |
| HRMS-025 | Action Center offers Approve on user's own leave that the server rejects | Low | P3 | VERIFIED |
| HRMS-026 | Invite verification PIN dropped a digit | Low | P4 | VERIFIED once |
| HRMS-027 | Keyboard sequence unexpectedly navigated to /settings/billing?tab=plan | Low | P4 | VERIFIED once; triggering element UNKNOWN |

## HRMS-001 Member/Manager can open the Sensitive tab (salary, bank, PAN, passport, national ID form) on other employees' profiles
- Severity: High
- Priority: P1
- Status: VERIFIED (data exposure UNCONFIRMED: all values 'Not set')
- URL: /hr/employees/fff40156-7da6-451a-931a-4cdf47849f85 (Sensitive tab); also QA Neg Test profile
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: QA Employee (HR Module Member); Manager per P2M session note
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2M, P3
- Preconditions: Signed in as QA Employee (HR Module Member).
- Steps:
  1. Open /hr/employees/fff40156-7da6-451a-931a-4cdf47849f85 (owner).
  2. Click the Sensitive tab.
  3. Compare: open the owner in the directory drawer and click Pay.
- Expected: Sensitive tab hidden or denied for a Member viewing someone else's profile, consistent with Pay tab denial (payroll:salaries:view).
- Actual: Full Sensitive form renders (salary amount/currency/frequency, bank account, IFSC, PF/UAN, ESI, PAN, tax ID, passport, national ID) with banner 'Opening this tab is recorded against your account'. Values 'Not set'. The Pay tab for the same person is DENIED.
- Evidence: /workspace/qa/hrms/p3_emp_14_owner_profile_sensitive_tab_allowed.webp, /workspace/qa/hrms/p3_emp_15_qa_neg_test_sensitive_tab_allowed.webp, /workspace/qa/hrms/p2m_emp_owner_profile_sensitive_tab.webp, /workspace/qa/hrms/p3_emp_13_owner_drawer_pay_tab_denied.webp
- Repro rate: Employee: 2 of 2 profiles (P2M owner, P3 owner + QA Neg Test). Manager: 1 (P2M session note, no screenshot).
- Impact: If real values exist, any Member could read PII and bank/salary data of colleagues. Treated as High even though no value was exposed in the test org, because the access check itself is missing in the UI.
- Likely layer: Not evidenced. Whether the API returns values to a Member is UNTESTED (no populated values, no API capture).
- Acceptance criterion: A Member/Manager without the sensitive-data permission cannot see the Sensitive tab and receives 403 from the sensitive-data API for others' profiles; own profile behaviour per spec.
- Safe retest: As Employee, open owner profile; confirm tab absent/denied. Ask devs to populate a dummy value on a test profile and confirm the API response is 403 for Member.

## HRMS-002 Approving an employee's leave returns HTTP 500 and leave stays Pending
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

## HRMS-003 Asset edit is last-write-wins: a stale tab silently overwrites another tab's save
- Severity: High
- Priority: P2
- Status: VERIFIED
- URL: /hr/assets (Edit Asset drawer, QA Laptop)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2, P3
- Preconditions: Asset 'QA Laptop' exists; two tabs in the same session.
- Steps:
  1. Tab A and Tab B open Edit on QA Laptop.
  2. Tab A sets Location = X, Save ('Asset updated').
  3. Tab B (stale form) sets Location = Y, Save.
  4. Reload, reopen drawer.
- Expected: Tab B's save is rejected or warned as stale (version/ETag conflict), or only changed fields are applied.
- Actual: Both saves show 'Asset updated'; final Location = Y; Tab A's change lost with no warning. Location only shows in the drawer, so loss is hard to notice.
- Evidence: /workspace/qa/hrms/p2_t1_asset_edit_tabA_drawer.png, /workspace/qa/hrms/p3_31_asset_two_tabs_both_drawers_loc_B1.png, /workspace/qa/hrms/p3_32_asset_both_tabs_saved_asset_updated.png, /workspace/qa/hrms/p3_33_asset_after_reload_location_LOC_B_last_write_wins.png
- Repro rate: 2 of 2 (P2, P3).
- Impact: Silent data loss when two HR users edit the same record. Likely affects other full-form edits (INFERRED, only assets tested).
- Likely layer: Not evidenced (full-form save observed; no request payload captured).
- Acceptance criterion: Concurrent stale save returns a conflict (e.g. 409) with a 'This record changed since you opened it' prompt; no silent overwrite.
- Safe retest: Repeat two-tab edit on QA Laptop; then reset Location to blank.

## HRMS-004 Submitted expense claims never reach HR expenses list or Action Center
- Severity: High
- Priority: P1
- Status: VERIFIED
- URL: /me/expenses -> /hr/expenses, Action Center Expense tab
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner (submitter and HR viewer)
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: Owner submits claim on /me/expenses.
- Steps:
  1. Submit expense (e.g. Software, Rs 500, 13 Oct 2026).
  2. Confirm Pending on /me/expenses (POST /me/expenses 201).
  3. Open /hr/expenses and Action Center Expense tab.
- Expected: Claim appears in HR expenses list and approval queue.
- Actual: /hr/expenses '0-0 of 0 total', 'No expenses found'; Action Center Expense = 0. EXP-2026-001/002/003 visible only on /me/expenses as Pending.
- Evidence: /workspace/qa/hrms/p1n_24_expense_hr_list_empty_after_submit.png, /workspace/qa/hrms/p1n_25_expense_me_list_two_claims.png, /workspace/qa/hrms/p3_23_hr_expenses_empty_EXP_missing.png, /workspace/qa/hrms/p3_18_action_center_2_pending_expense_0.png, /workspace/qa/hrms/p3_24_me_expenses_EXP001_002_pending.png
- Repro rate: 3 of 3 claims (P1: 2, P3: 3 present, still missing).
- Impact: Expenses cannot be approved or reimbursed; employees see Pending forever.
- Likely layer: Not evidenced (could be list query, routing, or scoping; unknown).
- Acceptance criterion: Every submitted claim appears in /hr/expenses and the approver's queue within one refresh.
- Safe retest: Check existing EXP-2026-001..003 in /hr/expenses; do not create new claims.

## HRMS-005 Invite flow: link reports 'expired' immediately and after verification, while invite is Pending and account works
- Severity: High
- Priority: P1
- Status: VERIFIED (counts not recorded; observed during P2R invite sign-up)
- URL: Invite acceptance link / post-verify onboarding
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Invited employee/manager
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2R (role setup)
- Preconditions: Owner sends invite to temp-mail address.
- Steps:
  1. Open invite link from email.
  2. Observe 'expired' message; list still shows Pending.
  3. Use renewed link / verify code.
  4. After verification observe skeleton then 'expired'.
- Expected: Valid invite opens sign-up; after verification user lands in app.
- Actual: Link shows 'expired' immediately while member list shows Pending; after verify, skeleton then 'expired', although the account was then usable.
- Evidence: /workspace/qa/hrms/p2r_employee_renewed_link_loading.webp, /workspace/qa/hrms/p2r_employee_verify_code_step.webp
- Repro rate: Observed during invite setup; exact count not recorded in sources (approx. once per invited user).
- Impact: New hires are told their invite is invalid; likely support tickets and abandoned onboarding. High because it is the entry point for every employee.
- Likely layer: Not evidenced.
- Acceptance criterion: Fresh invite link opens sign-up; status and link validity agree; post-verify lands on the app without an 'expired' message.
- Safe retest: Send one new invite to a temp inbox (needs approval: it sends email) and follow it end-to-end.

## HRMS-006 Onboarding name field silently strips Unicode, accented letters and other characters
- Severity: Medium-High
- Priority: P1
- Status: VERIFIED
- URL: /hr/onboarding (step 1, First/Last name)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: Owner on Add employee wizard.
- Steps:
  1. Type 'Zoë 李 😀 Ann' in First name.
  2. Continue / observe stored value.
- Expected: International names (ë, CJK) accepted; disallowed characters (if any) rejected with a message.
- Actual: 'Zoë 李 😀' -> 'Zo  '; P3 stored 'Zo  Ann'. Also removed in P1: some letters, <, >, /, digits, parens. Programmatic fill of same text clears field to ''. No message.
- Evidence: /workspace/qa/hrms/p1n_03_onb_script_name_next.png, /workspace/qa/hrms/p3_08_onb_unicode_name_stripped_empty_email.png
- Repro rate: 4 (P1: 3, P3: 1).
- Impact: Employees with non-ASCII names are recorded incorrectly; payroll/legal documents get wrong names. Rated Medium-High: data corruption without warning, but workaround (ASCII spelling) exists.
- Likely layer: Client-side input filtering (observed while typing); server behaviour UNTESTED.
- Acceptance criterion: Unicode letters (incl. accents, CJK, Devanagari) are preserved end-to-end; rejected characters produce an inline message.
- Safe retest: Type 'Zoë 李 Ann' and 'आदित्य' in a draft; do not submit (or submit only on an agreed test record).

## HRMS-007 Reporting-manager picker lists only the owner; QA Manager cannot be set as manager
- Severity: Medium-High
- Priority: P1
- Status: VERIFIED (cause UNCONFIRMED)
- URL: /hr/onboarding Job Details > Reporting manager; profile reporting line
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2M, P3
- Preconditions: QA Manager is Active in directory (no EMP ID / job details).
- Steps:
  1. Open onboarding Job Details or profile reporting line.
  2. Open Reporting manager picker.
- Expected: Active people in the org (or a documented eligible subset) are selectable.
- Actual: Only 'Unassigned' and qaown1012b. QA Manager, QA Employee, QA Neg Test absent. No explanation shown.
- Evidence: /workspace/qa/hrms/p3_12_onb_manager_picker_only_owner.png, /workspace/qa/hrms/p3_emp_12_people_directory_8_records.webp, /workspace/qa/hrms/p2m_emp_leave_drawer_no_manager_routing.webp
- Repro rate: 2 of 2 (P2M, P3).
- Impact: Manager approval flow cannot be configured or tested; all leaves fall to HR queue.
- Likely layer: Not evidenced. Hypothesis (INFERRED, unproven): picker requires a completed employment record.
- Acceptance criterion: Eligible managers appear; if someone is ineligible, the UI says why (e.g. 'Complete job details to make this person selectable').
- Safe retest: Open picker as owner; confirm QA Manager appears; set it and file a test leave as QA Employee.

## HRMS-008 Member sees full admin-like HR sidebar and can read role/permission configuration
- Severity: Medium
- Priority: P2
- Status: VERIFIED
- URL: /hr (sidebar), /hr/access
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: QA Employee (HR Module Member)
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P2R, P3
- Preconditions: Signed in as QA Employee.
- Steps:
  1. Open /hr; inspect sidebar.
  2. Open items such as HR configuration, Access & governance, HR access.
  3. Open /hr/access Roles tab.
- Expected: Sidebar shows only permitted items; role configuration hidden from Members.
- Actual: Sidebar shows Hub ... HR configuration, Access & governance, HR access; many items redirect to Access Restricted on open (e.g. custom-fields, approvals). /hr/access shows groups and full permission lists (Owner 144/144), read-only.
- Evidence: /workspace/qa/hrms/p2r_employee_hr_menu.webp, /workspace/qa/hrms/p3_emp_09_hr_access_roles_readonly_list.webp, /workspace/qa/hrms/p3_emp_10_hr_access_owner_group_permissions_visible.webp, /workspace/qa/hrms/p3_emp_01_settings_custom_fields_access_restricted.webp, /workspace/qa/hrms/p2m_emp_hr_approvals_access_restricted.webp
- Repro rate: 1 of 1 session (P3) plus P2R observation.
- Impact: Confusing dead-end navigation; exposes permission model to every Member (information disclosure, low sensitivity).
- Likely layer: UI gating (navigation not filtered by permission) - VERIFIED from UI; server enforcement of denied pages observed via access-denied redirects only.
- Acceptance criterion: Sidebar items render only when user holds the route's required permission; /hr/access hidden or denied for Members.
- Safe retest: As Employee, compare sidebar items against routes that open without denial.

## HRMS-009 Onboarding wizard loses all entered data on refresh or Back/Forward
- Severity: Medium
- Priority: P2
- Status: VERIFIED
- URL: /hr/onboarding
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: Partially filled wizard.
- Steps:
  1. Fill step 1 fields.
  2. Press F5 (or Back then Forward).
- Expected: Draft preserved, or a 'Leave page? Unsaved changes' prompt.
- Actual: Empty wizard; Back goes to /hr/employees, Forward returns empty wizard. No warning.
- Evidence: /workspace/qa/hrms/p1n_10_onb_after_reload_wizard_state_lost.png, /workspace/qa/hrms/p3_13_onb_refresh_data_lost.png
- Repro rate: 3 of 3 (P1: 2, P3: 1).
- Impact: HR re-types multi-step data after any accidental navigation.
- Likely layer: Client state only (INFERRED from behaviour).
- Acceptance criterion: Draft persists across refresh, or beforeunload prompt appears when data is dirty.
- Safe retest: Fill step 1, refresh.

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

## HRMS-013 Duplicate holidays on the same date accepted without warning
- Severity: Medium
- Priority: P3
- Status: VERIFIED
- URL: /hr/holidays (Add holiday)
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: 'QA Test Holiday' exists on Dec 25 2026.
- Steps:
  1. Add another holiday dated Dec 25 2026.
- Expected: Warning or block for duplicate date in the same calendar.
- Actual: 'Holiday added'; Dec 25 2026 now has 3 entries.
- Evidence: /workspace/qa/hrms/p1n_18_holiday_duplicate_date_saving.png, /workspace/qa/hrms/p3_15_holiday_dup_saving_then_added.png, /workspace/qa/hrms/p3_16_holiday_dec25_three_entries.png
- Repro rate: 2 of 2.
- Impact: Confusing calendars; possible double counting in leave calculations (INFERRED, untested).
- Likely layer: Not evidenced.
- Acceptance criterion: Duplicate date prompts 'A holiday already exists on 25 Dec 2026 (QA Test Holiday)'.
- Safe retest: Try adding Dec 25 again; cancel at warning.

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

## HRMS-015 Invite onboarding phone field loses focus after first digit; digits go into emergency contact name
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

## HRMS-016 /hr HR overview (Hub) body intermittently blank
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

## HRMS-017 Onboarding: duplicate-email check inconsistent
- Severity: Medium
- Priority: P3
- Status: VERIFIED behaviour; expected rule UNCONFIRMED
- URL: /hr/onboarding step 1
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1
- Preconditions: Signed in as stated role.
- Steps:
  1. Enter qa.happy1@example.com (existing employee) -> Next.
  2. Enter qaadm1012d@sharklasers.com (listed on /hr/employees) -> Next.
- Expected: Consistent duplicate rule for anyone listed as an employee.
- Actual: First is blocked ('This email already belongs to an employee...'); second passes Step 1.
- Evidence: /workspace/qa/hrms/p1n_08_onb_email_duplicate_of_created_employee_blocked.png, /workspace/qa/hrms/p1n_05_onb_dup_email_advanced_to_jobdetails.png, /workspace/qa/hrms/p1n_09_onb_sharklasers_dup_email_checking.png
- Repro rate: 2 of 2 for the passing case.
- Impact: Possible duplicate employee records.
- Likely layer: Not evidenced.
- Acceptance criterion: Any email already on an active person record is blocked or explicitly linked.
- Safe retest: Enter the sharklasers email at step 1; do not submit.

## HRMS-018 Intermittent error boundary on /hr/employees hard load (React #441)
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

## HRMS-019 Settings sub-pages intermittently showed wrong content on direct load
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

## HRMS-020 Access audit log drawer takes ~20 s to load
- Severity: Low
- Priority: P3
- Status: VERIFIED
- URL: /hr/access > Audit log
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Owner
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: P1, P3
- Preconditions: Signed in as stated role.
- Steps:
  1. Open Audit log.
- Expected: Loads in a few seconds.
- Actual: Skeleton at 0 s; loaded ~20 s (P1 looked stuck).
- Evidence: /workspace/qa/hrms/p1_11_access_audit_log_drawer_loading.png, /workspace/qa/hrms/p3_04_audit_drawer_skeleton_at_0s.png, /workspace/qa/hrms/p3_05_audit_drawer_loaded_after_20s.png
- Repro rate: Approx. 3 observations.
- Impact: Slow governance review.
- Likely layer: Not evidenced.
- Acceptance criterion: Drawer content in <3 s or progress message.
- Safe retest: Time 3 opens.

## HRMS-021 Leave double-click: drawer stays open with filled form after success
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

## HRMS-022 Intermittent CORS failures on api.streamlineos.in from /hr
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

## HRMS-023 Notifications event stream drops (ERR_HTTP2_PROTOCOL_ERROR)
- Severity: Low
- Priority: P4
- Status: VERIFIED (console)
- URL: api.streamlineos.in/notifications/events
- Environment: Production https://www.streamlineos.in, TEST org 'QA Build Org 1012b', HR module enabled, Payroll off
- Role: Any
- Browser: Chrome (Linux)
- Viewport: 1280x800
- Pass: Discovery, P2
- Preconditions: Signed in as stated role.
- Steps:
  1. Keep app open; watch console.
- Expected: Stable stream.
- Actual: ERR_HTTP2_PROTOCOL_ERROR / ERR_CONNECTION_CLOSED.
- Evidence: Console/session notes only (no screenshot)
- Repro rate: Repeated in session; count not recorded.
- Impact: Real-time notifications may be missed (INFERRED).
- Likely layer: Network/SSE (console).
- Acceptance criterion: No protocol errors over 10 minutes.
- Safe retest: Watch console 10 min.

## HRMS-024 Manager sees editable Edit tab on non-report; save rejected only by server toast
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

## HRMS-026 Invite verification PIN dropped a digit
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

## HRMS-027 Keyboard sequence unexpectedly navigated to /settings/billing?tab=plan
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
