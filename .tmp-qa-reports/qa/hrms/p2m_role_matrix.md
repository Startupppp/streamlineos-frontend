# P2M role matrix — QA Build Org 1012b (HR module on)

Legend: Expected-inferred = what the role model implies (not from a spec). Actual = what was observed. Evidence = file in /workspace/qa/hrms/ or session note.
Status of run: PARTIAL. Task 1 (set reporting manager) and Task 2 (HR Admin sign-in) are BLOCKED, so Manager and HR Admin rows are incomplete.

| Role | Page / URL | Action | Expected-inferred | Actual | Evidence |
|---|---|---|---|---|---|
| Employee | /hr/leaves | Open Request leave drawer, submit Earned Leave 16 Nov 2026 | Allowed (self-service) | Allowed. Created Pending request. Drawer says approver = "HR approvals queue (2 approvers) because no reporting manager is on record" | p2m_emp_leave_drawer_no_manager_routing.webp, p2m_emp_leave_request_created.webp |
| Employee | /hr/approvals | Open approvals page directly | Denied | Denied. Redirects to /access-denied?required=hr:workflows:approve:hr:leaves:approve ("Access Restricted") | p2m_emp_hr_approvals_access_restricted.webp |
| Employee | /hr/employees (list) | View list | Unclear (Manager-level list visible?) | List visible; same as Manager view in earlier check | session note |
| Employee | /hr/employees/fff40156… (Owner) — Sensitive tab | Open Sensitive | Denied or masked (PII/bank/salary is sensitive) | ALLOWED. Tab renders full form: salary amount/currency/frequency, bank account, IFSC, PF/UAN, ESI, PAN, passport, national ID (values shown as "Not set" for owner) | p2m_emp_owner_profile_sensitive_tab.webp |
| Employee | /hr/access | Members tab | Read-only or denied | Read-only member list, no role-change controls seen. Did NOT attempt role change (control not present) | session note |
| Employee | /settings/roles, /settings/modules, Account Settings > Members & Access | Open | Denied | Denied / silently not loaded (spinner) — not fully verified | session note |
| Employee | /hr/settings (+ custom field create) | Open / create "QA Field" | Denied | Not completed in this run | — |
| Employee | /hr/assets (edit QA Laptop), /hr/expenses, /hr/cases, /hr/payroll | Open | Expected per role | Not fully recorded in this run | — |
| Employee | Own role → HR Module Admin | Change own role | Denied | Control NOT observed on /hr/access for Employee; no submission made | session note |
| Manager | /hr/employees/0471e591… (QA Employee) → Edit designation | Edit & save | Denied for non-report (hr:employees:update) | UI shows Edit tab and editable field; save shows toast "Missing permission: hr:employees:update" (server denies) | session note |
| Manager | /hr/employees/fff40156… (Owner, non-report) Sensitive tab | Open | Denied/masked | Tab opens with sensitive form (same as Employee) | session note |
| Manager | /hr/settings | Open | Denied | Visible in session note; create "QA Field" not completed | session note |
| Manager | /hr/approvals, /hr/payroll, /hr/assets, /settings/* | Open | Expected per role | Partially checked; not recorded in full | session note |
| HR Admin | all | all | — | NOT TESTED — sign-in OTP never arrived | — |

## Defects / findings (candidate)
1. **Sensitive tab readable by non-HR roles (High, guess)**: QA Employee and QA Manager can open /hr/employees/<owner>?tab=sensitive and see the full salary/bank/PAN/passport/national-ID form. Repro: sign in as Employee, open /hr/employees/fff40156-7da6-451a-931a-4cdf47849f85, click "Sensitive". Values shown were "Not set" for owner, so data exposure was not confirmed; the form itself and the "Opening this tab is recorded" notice are shown to a non-HR user.
2. **Reporting line not settable / manager picker empty for QA Manager (Medium, guess)**: Employee leave drawer routes to HR queue "no reporting manager is on record". Owner could not find QA Manager in the reporting-manager picker (only owner appeared). Blocks Manager approval flow.
3. **Manager sees edit affordance on non-report profile**: Edit tab and field editable, save blocked only server-side with toast. UI/backend mismatch (Low).

## Blockers
- Task 1: QA Manager not selectable as reporting manager in the picker (only qaown1012b shown). Needs investigation of picker eligibility rules.
- Task 2: HR Admin OTP to zdehdf+ly377dxs8ksr3ek240xw0@sharklasers.com never arrived (multiple resends, inbox refreshed). Needs a new HR Admin email or manual code.
- Manager leave approval and HR Admin matrix rows depend on the above.
