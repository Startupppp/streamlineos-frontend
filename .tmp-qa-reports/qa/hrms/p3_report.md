# P3 independent regression: StreamlineOS HRMS, TEST org "QA Build Org 1012b" (HR module on)

Run: 2026-10-14 (box clock 00:35 IST = 19:05 UTC, Oct 13). Synthetic data only. Owner session = main browser (qaown1012b). Employee session = Chrome profile p2r-employee (QA Employee, HR Module Member). Manager session (p2r-manager) not re-used in this pass.
Screenshots: /workspace/qa/hrms/p3_*.png|webp (owner/retest, 37 files) and p3_emp_*.webp (Employee session, 16 files).
Prior reports: p1n_report.md, p2_report.md, p2m_role_matrix.md.

## Summary
- Still reproducing: onboarding (name stripping, refresh loss, DOB limit, raw department error, empty-email message), duplicate holiday, expense sync gap, asset last-write-wins, 768px nav, manager picker, owner-approve-of-employee 500, Employee Sensitive-tab access. Intermittent: /hr hub blank, /hr/employees skeleton, audit drawer (slow ~20 s). Not reproduced or changed: /me payslip, expense "-> 0", self-approve 500, attendance 18:00 (time-dependent).
- Not reproduced / changed: /me payslip (graceful empty state), huge expense amount -> 0 (now accepted, silently truncated), owner self-approve 500 (now a clear 400-style message), attendance 18:00 "later than current time" (accepted now; time-dependent).
- New observations: (1) Employee can open the Sensitive tab (salary/bank/PAN/passport/national ID form) on the owner and QA Neg Test profiles, while the same person's Pay tab is denied (payroll:salaries:view). Inconsistent gating. (2) Expense amount field silently truncates 20 digits to 999999999 and accepts a Rs 99,99,99,999 Travel claim with no max-limit message. (3) Action Center still offers Approve on the owner's own Casual Leave (Nov 18) even though approval is rejected.
- Owner approve of Employee's Nov 16 leave -> generic 500 toast; the leave stays Pending. Reject was NOT tried (per instructions).

## Retest table
Attempts counts are from this run's scripts and screenshots (approximate where noted).

| # | Bug (prior ID / pass) | Attempts | Reproduced now? | Notes | Evidence |
|---|---|---|---|---|---|
| 1 | /hr hub blank body (DEF-7, P2) | 3 loads on owner (1st blank, later renders), plus 768 emulation | INTERMITTENT (reproduced on 1st load and at 768; rendered on 3rd load) | Header only on first load; sidebar/cards rendered later. | p3_01_hr_hub_owner_blank.png, p3_36_768px_hr_no_sidebar_no_bottom_nav.webp, p3_39_hr_hub_desktop_3rd_load_rendered.png |
| 2 | /hr/employees slow skeleton (DEF-6 area, P1) | 2 owner loads + 1 Employee load (~4 s skeleton on Employee) | YES, slow / intermittent | Skeleton visible on first load and for ~4 s on Employee; resolves to 8 records. No error boundary this run. | p3_02_employees_skeleton_first_load.png, p3_03_employees_resolved_8_records.png, p3_emp_12_people_directory_8_records.webp |
| 3 | /hr/access audit log drawer stuck (P1) | 2 loop iterations in script + 1 long wait | INTERMITTENT: loaded after ~20 s, not permanently stuck | Drawer showed skeleton at 0 s and loaded at ~20 s. Not a permanent hang in this run. | p3_04_audit_drawer_skeleton_at_0s.png, p3_05_audit_drawer_loaded_after_20s.png |
| 4 | /me payslip card with payroll off (P1) | 1 load (owner) | NOT REPRODUCED | Card renders a graceful "not set up / no payslips" state; no error text. Payroll module is off for the org. | p3_06_me_home_payslip_card_owner.png, p3_07_me_pay_owner_not_set_up.png |
| 5 | Onboarding: Unicode name stripping (D3, P1) | 1 typing run ("Zoë 李 😀 Ann") | YES | Stored first name is "Zo  Ann": ë, 李, emoji stripped silently. No message. | p3_08_onb_unicode_name_stripped_empty_email.png |
| 6 | Onboarding: data lost on refresh (D2, P1) | 1 reload after partial entry (+ P1 2 runs) | YES | Refresh returns empty wizard (John/Doe placeholders, no values). | p3_13_onb_refresh_data_lost.png |
| 7 | Onboarding: DOB calendar limit (D6, P1) | 2 (Dec 2010 view, year list) | YES | Calendar opens on Dec 2010, days after ~Oct 2010 disabled; year list ends at 2010 (1940-2010). Future DOB / age < 14 untestable via UI. | p3_09_onb_dob_calendar_dec2010_all_disabled.png, p3_10_onb_dob_year_list_1940_2010.png |
| 8 | Onboarding: raw "Invalid input: expected string" on empty Department (D1, P1) | 2 (P1) + 1 (P3) | YES | Raw text "Invalid input: expected string, received undefined" under Department. | p3_11_onb_department_invalid_input.png, p3_12_onb_manager_picker_only_owner.png |
| 9 | Onboarding: empty email message (D5, P1) | 2 (P1) + 1 (P3) | YES | Empty email shows "Invalid email address" (should say required). | p3_08 (above), P2 Test 6 |
| 10 | Duplicate holiday on same date (D8, P1) | 1 add (3rd entry on Dec 25 2026) | YES | Holiday list (List view) now has 3 entries on Dec 25 2026: QA Test Holiday, QA Dup Holiday, QA P3 Dup Retest. No duplicate warning. | p3_15_holiday_dup_saving_then_added.png, p3_16_holiday_dec25_three_entries.png |
| 11 | Huge expense amount -> 0 (D9, P1) | 1 (typed 99999999999999999999) | NOT REPRODUCED as "-> 0"; behavior CHANGED | Input silently truncated to 999999999 and saved as EXP-2026-003, Travel, Rs 99,99,99,999, Pending, no description. No upper-limit message. Silent truncation is the new defect. | p3_26_expense_form_huge_amount_before_submit.png, p3_27_expense_submitting_amount_truncated_999999999.png, p3_28_me_expenses_EXP003_99cr_created_by_test.png |
| 12 | /me/expenses claims missing in /hr/expenses + approvals (D10, P1) | 1 check after 3 claims exist | YES, still missing | /hr/expenses: "0-0 of 0 total", "No expenses found". Action Center Expense tab = 0. EXP-2026-001/002 (and 003) show only in owner /me/expenses as Pending. | p3_23_hr_expenses_empty_EXP_missing.png, p3_18_action_center_2_pending_expense_0.png, p3_24_me_expenses_EXP001_002_pending.png |
| 13 | Attendance correction 18:00 rejected "later than current time" (D11, P1) | 1 (13 Oct 18:00 check-in) | NOT REPRODUCED now (time-dependent) | Accepted at IST 00:20 on 14 Oct ("Regularization request submitted"; Action Center item Oct 13, pending). Original reject happened at 22:53 IST = 17:23 UTC. Pattern fits a server comparing IST wall time to UTC now (18:00 > 17:23 UTC rejected; 18:00 < 18:50 UTC accepted). Not fully verified: needs a 13 Oct 18:00 entry tested at a UTC time before 18:00 (i.e., IST 05:30-23:59 on that date). | p3_29_attendance_correction_form_default_13oct.png, p3_30_attendance_correction_13oct_1800_accepted.png |
| 14 | Owner approve own Nov 18 Casual Leave -> 500 (DEF-2, P2) | 2 (approve, then retry) | CHANGED: no 500; explicit message "You cannot approve your own leave request" | Leave stays Pending. Action Center still shows Approve/Reject for it (UI affordance mismatch). | p3_19_owner_approve_own_nov18_now_400_message.png, p3_20_owner_approve_own_nov18_retry_same_message.png, p3_22_owner_leaves_final_nov18_pending.png |
| 15 | Owner approve Employee's Nov 16 Earned Leave (QA Employee) | 1 (Approve) | YES, 500 | Toast "Something went wrong on our end. Please try again shortly." Final state: still Pending in Action Center (Leave 2 pending incl. this one). Reject NOT tried. | p3_21_owner_approve_emp_nov16_500.png |
| 16 | Asset two-tab last-write-wins (DEF-1, P2) | 1 two-tab race (quick retest) | YES | Tab A saved LOC-A, tab B (stale drawer) saved LOC-B, no conflict warning; final location = QA-P3-LOC-B, A's value lost. | p3_31_asset_two_tabs_both_drawers_loc_B1.png, p3_32_asset_both_tabs_saved_asset_updated.png, p3_33_asset_after_reload_location_LOC_B_last_write_wins.png |
| 17 | 768px no navigation (DEF-3, P2) | 1 devtools iPad Mini run (768x1024) | YES | No sidebar, no bottom bar, no menu toggle on /hr at 768. Hub body also blank in that capture. | p3_36_768px_hr_no_sidebar_no_bottom_nav.webp, p3_37_devtools_ipad_mini_768_emulation.webp |
| 18 | Reporting-manager picker missing QA Manager | 1 (onboarding Job Details picker) | YES, still missing | Picker lists only "Unassigned" and qaown1012b. QA Manager, QA Employee and QA Neg Test are absent. Cause NOT confirmed. QA Manager is an Active directory card with no EMP ID and no job details (owner has EMP-FFF40156; QA Neg Test has EMP-N0MCHV but is in onboarding). Hypothesis: picker needs a completed Employment/job record; not proven. | p3_12_onb_manager_picker_only_owner.png, p3_emp_12_people_directory_8_records.webp |
| 19 | Employee: Sensitive tab on owner profile | 1 (Employee session) | YES, ALLOWED (High) | Employee sees the full Sensitive form (salary amount/currency/frequency, bank account, IFSC, PF/UAN, ESI, PAN, tax ID, passport, national ID) on owner's profile; banner "Opening this tab is recorded against your account". Values "Not set" (no data exposed). The same person's Pay tab in the directory drawer is DENIED ("payroll:salaries:view"). Inconsistent gating. | p3_emp_14_owner_profile_sensitive_tab_allowed.webp, p3_emp_13_owner_drawer_pay_tab_denied.webp, p2m_emp_owner_profile_sensitive_tab.webp |
| 20 | Employee: Sensitive tab on QA Neg Test (and QA Manager) | 1 (QA Neg Test, Employee session); QA Manager not re-checked this pass | YES, ALLOWED | Same full Sensitive form on QA Neg Test profile ("Not set"). P2 matrix recorded the same for the Manager session. | p3_emp_15_qa_neg_test_sensitive_tab_allowed.webp, p3_emp_16_qa_neg_test_profile_reporting_line.webp |

## Employee access checks (Employee session, QA Employee, HR Module Member)
| Route | Result | How | Evidence |
|---|---|---|---|
| /hr/settings | ALLOWED (overview only) | HR configuration overview renders (Simple view). Advanced views not opened. | p3_emp_11_hr_configuration_overview.webp |
| /hr/settings/custom-fields (create "QA Field") | DENIED | Redirect to /access-denied?required=hr:custom-fields:manage ("Access Restricted"). No create form reachable, so no request sent. Server response not captured (not crafted). | p3_emp_01_settings_custom_fields_access_restricted.webp |
| /hr/assets (edit QA Laptop) | VIEW ALLOWED; EDIT DENIED (UI) | List shows QA Laptop read-only. No Edit/row action rendered, and row click opens no drawer. Server-side edit not tested (no crafted request). | p3_emp_07_hr_assets_list_no_edit_control.webp, p3_emp_08_assets_row_click_no_drawer.webp |
| /hr/expenses | ALLOWED, own scope | "My expenses": "No expenses found". Owner claims (EXP-2026-001/002/003) NOT visible to Employee (correct scope). | p3_emp_05_hr_expenses_own_scope_empty.webp |
| /hr/cases | ALLOWED | "No cases found" (Cases and Disciplinary Actions tabs). | p3_emp_06_hr_cases_visible_empty.webp |
| /hr/payroll | DENIED (module off) | "Module not enabled: Payroll is not enabled for your organisation" (reason org-disabled). Role denial not separately testable. | p3_emp_04_hr_payroll_module_not_enabled.webp |
| /settings/roles | DENIED | "Access Restricted", required settings:rbac:manage. | p3_emp_02_settings_roles_access_restricted.webp |
| /settings/modules | DENIED | "Access Restricted", required settings:manage. | p3_emp_03_settings_modules_access_restricted.webp |
| /hr/access (roles and members) | VIEW ALLOWED (read-only) | Roles tab lists groups (Admin 1, Member 2, Owner 1 members) and full permission lists (Owner 144/144). Audit log button visible. No edit control seen. Exposes role configuration to a Member. | p3_emp_09_hr_access_roles_readonly_list.webp, p3_emp_10_hr_access_owner_group_permissions_visible.webp |
| /hr/employees (directory) | ALLOWED | 8 records visible incl. owner and QA Neg Test. | p3_emp_12_people_directory_8_records.webp |
| Owner profile, Pay tab | DENIED | "Pay details restricted ... payroll:salaries:view". | p3_emp_13_owner_drawer_pay_tab_denied.webp |
| Owner profile, Sensitive tab | ALLOWED (inconsistent) | See row 19. | p3_emp_14 |

## Side effects and current state (owner view, 14 Oct 00:35 IST)
- People: 8 records (7 Active, 1 Pending invite, 0 Inactive). QA Neg Test is in Onboarding with an invite sent. Owner profile: no reporting manager on record, 1 direct report (QA Neg Test).
- Action Center: Pending 3 = Leave 2 (owner Casual Leave Nov 18; QA Employee Earned Leave Nov 16) + Attendance 1 (owner Oct 13 regularization). Expense 0.
- Owner "My leaves": Casual Leave Oct 13 request for Nov 18, Pending.
- Expenses: HR expense list 0. Owner /me/expenses: 3 Pending claims.
- Holidays Dec 25 2026: 3 entries.

## Test records present now (all synthetic, from P1 through P3)
1. Department "QA Test Dept" (P1).
2. Employee "QA Neg Test", qa.happy1@example.com, EMP-N0MCHV, id 43827043-ac67-4e9b-911f-b33ebc7b04eb, Onboarding/invite sent, reports to qaown1012b (P1).
3. Leave: Casual Leave, Nov 18 2026, Pending, approver = owner (self-approval blocked, P1/P2).
4. Leave: QA Employee Earned Leave, Nov 16 2026, Pending (P2m, P3 approve attempt failed).
5. Holidays Dec 25 2026: "QA Test Holiday", "QA Dup Holiday", "QA P3 Dup Retest" (P1 + P3).
6. Asset "QA Laptop" (SN-QA-LAPTOP-0001, QA Brand/QA Model, Rs 50,000), location = QA-P3-LOC-B (P1/P2/P3 edits).
7. Expense EXP-2026-001 (Software, Rs 500, Oct 13, Pending) (P1).
8. Expense EXP-2026-002 (Software, Rs 500, Oct 13, Pending, duplicate of 001) (P1).
9. Expense EXP-2026-003 (Travel, Rs 99,99,99,999, Oct 13, Pending) (P3, huge-amount retest).
10. Attendance regularization, Oct 13 2026 check-in 18:00, Pending, reason "QA P3 synthetic correction retest, please ignore." (P3).
Not created: no onboarding submission (wizard left unsaved), no new employee beyond QA Neg Test, no payment/billing/payroll actions. Billing/payroll not used.

## Items not completed / caveats
- Employee-side server response for custom-field create was not captured; route is denied client-side before the form renders.
- QA Manager sensitive tab not re-checked in this pass (P2 matrix recorded it allowed).
- Reject on any leave was NOT attempted (per instruction).
- Attendance 18:00 negative case (future time must be rejected) not run to avoid creating extra records.
- Picker root cause for QA Manager not determined.
- Attempt counts for items 1-3 are approximate (taken from run scripts and screenshot series).
