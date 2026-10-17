# 04 Test cases and evidence
Paths relative to /workspace/qa/hrms/. Result: PASS / FAIL / BLOCKED / UNTESTED / NOT APPLICABLE.

| TC | Area | Case | Role | Result | Bug | Evidence |
|---|---|---|---|---|---|---|
| TC-01 | Auth | Logged-out / redirects to signin with callbackUrl | - | PASS | - | 09_signin_logged_out.webp |
| TC-02 | Auth | Incognito deep link /hr/employees -> signin?callbackUrl | - | PASS | - | p2_t4_incognito_employees_redirect.webp |
| TC-03 | Auth | Signin email validation empty vs 'abc' | - | FAIL (UX) | UX-03 | 10_*, 11_* |
| TC-04 | Auth | Google sign-in | - | UNTESTED | - | - |
| TC-05 | Auth | Logout propagation across tabs | Owner | BLOCKED | - | - |
| TC-06 | Module | /hr pre-enable denied | Owner | PASS (UX-15 note) | - | 05_* |
| TC-07 | Module | Enable HR and persist | Owner | PASS | - | p1_00b_settings_modules_hr_enabled_after_refresh.png |
| TC-08 | Module | /hr/payroll with payroll off | Owner, Employee | PASS | - | p1_04_*, p3_emp_04_* |
| TC-09 | Nav | Deep links 13 routes x3 | Owner | PASS 39/39 | HRMS-019 (pass1) | p2_report |
| TC-10 | Nav | Back/forward | Owner | PASS | - | - |
| TC-11 | Hub | /hr renders | Owner | FAIL intermittent | HRMS-016 | p3_01_*, p3_39_* |
| TC-12 | Directory | /hr/employees loads | Owner | FAIL intermittent | HRMS-018 | p3_02_*, p3_03_* |
| TC-13 | Onboarding | Empty step 1 errors + ARIA | Owner | PASS (copy UX-02) | UX-02 | p2_t6_onboarding_empty_next_errors.png |
| TC-14 | Onboarding | Unicode name | Owner | FAIL | HRMS-006 | p3_08_* |
| TC-15 | Onboarding | Refresh keeps draft | Owner | FAIL | HRMS-009 | p3_13_* |
| TC-16 | Onboarding | Duplicate email | Owner | FAIL (inconsistent) | HRMS-017 | p1n_05_*, p1n_08_* |
| TC-17 | Onboarding | DOB boundaries | Owner | BLOCKED by UI cap | UX-12 | p3_09_*, p3_10_* |
| TC-18 | Onboarding | Empty department message | Owner | FAIL | UX-01 | p3_11_* |
| TC-19 | Onboarding | Reporting manager picker | Owner | FAIL | HRMS-007 | p3_12_* |
| TC-20 | Onboarding | Happy path create employee (QA Neg Test), double-click no dup | Owner | PASS | - | p1_05_* |
| TC-21 | Invite | Invite link valid | Owner/invitee | FAIL | HRMS-005 | p2r_employee_renewed_link_loading.webp |
| TC-22 | Invite | Resend email delivered | Owner | FAIL (not delivered in ~3 min) | 06 | - |
| TC-23 | Invite | Phone input focus | Invitee | FAIL | HRMS-015 | - |
| TC-24 | Invite | PIN entry | Invitee | FAIL once | HRMS-026 | p2r_employee_verify_code_step.webp |
| TC-25 | Leave | Empty submit validation | Owner | PASS | - | p1n_11_* |
| TC-26 | Leave | Past dates disabled | Owner | PASS | - | p1n_12_* |
| TC-27 | Leave | Double-click submit | Owner | FAIL (minor) | HRMS-021 | p1n_14_* |
| TC-28 | Leave | Drawer focus trap / Esc / return | Owner | PASS | - | p2_t6_leave_drawer_datepicker_focus.png |
| TC-29 | Leave | Keyboard date selection | Owner | INCONCLUSIVE | UX-05 | same |
| TC-30 | Leave | Self-approve | Owner | FAIL (P2 500) -> now message, UI still offers | HRMS-002/025 | p3_19_* |
| TC-31 | Leave | Approve employee leave | Owner | FAIL 500 | HRMS-002 | p3_21_* |
| TC-32 | Leave | Reject | Owner | UNTESTED (by instruction) | - | - |
| TC-33 | Leave | Employee request routes to HR queue | Employee | PASS | - | p2m_emp_leave_request_created.webp |
| TC-34 | Leave | Manager approves team leave | Manager | BLOCKED | HRMS-007 | - |
| TC-35 | Holiday | 300-char name error | Owner | PASS | - | p1n_16_* |
| TC-36 | Holiday | Duplicate date | Owner | FAIL | HRMS-013 | p3_16_* |
| TC-37 | Asset | Empty submit / negative cost blocked | Owner | PASS (UX-08) | UX-08 | p1n_19_*, p1n_20_* |
| TC-38 | Asset | Two-tab concurrent edit | Owner | FAIL | HRMS-003 | p3_33_* |
| TC-39 | Expense | Empty/zero amount, future days disabled | Owner | PASS | - | p1n_22_*, p1n_23_* |
| TC-40 | Expense | Huge amount | Owner | FAIL | HRMS-011 | p3_27_* |
| TC-41 | Expense | Appears in HR list/queue | Owner | FAIL | HRMS-004 | p3_23_* |
| TC-42 | Expense | Submit confirmation | Owner | FAIL | HRMS-012 | p1n_25_* |
| TC-43 | Attendance | Correction past same-day time | Owner | FAIL once, then PASS (time-dependent) | HRMS-014 | p3_30_* |
| TC-44 | Concurrency | Two-tab approve | Owner | NOT CONCLUSIVE (all 500) | HRMS-002 | p2_t1_* |
| TC-45 | Access | Employee Sensitive tab others | Employee | FAIL | HRMS-001 | p3_emp_14_*, p3_emp_15_* |
| TC-46 | Access | Employee Pay tab others | Employee | PASS (denied) | - | p3_emp_13_* |
| TC-47 | Access | Employee /hr/approvals | Employee | PASS (denied) | - | p2m_emp_hr_approvals_access_restricted.webp |
| TC-48 | Access | Employee custom field create, /settings/roles, /settings/modules | Employee | PASS (denied) | - | p3_emp_01..03 |
| TC-49 | Access | Employee asset edit | Employee | PASS (UI) / server UNTESTED | - | p3_emp_07_*, p3_emp_08_* |
| TC-50 | Access | Employee expense scope | Employee | PASS | - | p3_emp_05_* |
| TC-51 | Access | Member sidebar / /hr/access | Employee | FAIL | HRMS-008 | p2r_employee_hr_menu.webp, p3_emp_10_* |
| TC-52 | Access | Manager edit non-report | Manager | PASS server / FAIL UI | HRMS-024 | - |
| TC-53 | Access | HR Admin matrix | HR Admin | BLOCKED | - | - |
| TC-54 | Responsive | 375 hr/employees/leaves/onboarding | Owner | PASS with UX-09 | UX-09 | p2_r5_375_* |
| TC-55 | Responsive | 768 navigation | Owner | FAIL | HRMS-010 | p2_r5_768_hr.png |
| TC-56 | Responsive | 768 employees/leaves/onboarding | Owner | PASS | - | p2_r5_768_* |
| TC-57 | A11y | Phone country button name | Owner | FAIL | UX-04 | - |
| TC-58 | A11y | Skip link order | Owner | FAIL | UX-06 | - |
| TC-59 | A11y | Screen reader | - | UNTESTED | - | - |
| TC-60 | Console | Errors on /hr | Owner | FAIL intermittent | HRMS-022/023 | - |
| TC-61 | Me | Payslip card with payroll off | Owner | PASS (P3) | - | p3_06_*, p3_07_* |

## Screenshot index
All files in /workspace/qa/hrms/: discovery 01_-11_; pass1 p1_*; negative pass p1n_01-27; P2 p2_r5_* (responsive), p2_t1/t4/t6_*; role p2m_*, p2r_*; P3 p3_01-39, p3_emp_01-16. Raw notes: p3_notes_raw.txt.
