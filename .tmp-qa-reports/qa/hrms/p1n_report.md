# P1N HRMS negative + happy-path QA — QA Build Org 1012b (synthetic data only)
Date: 2026-10-13 (IST). Browser clock: 17:23 UTC.
Screenshots: /workspace/qa/hrms/p1n_*.png

## Records created (cleanup list)
1. Department "QA Test Dept" (created via onboarding Department typeahead)
2. Employee "QA Neg Test", qa.happy1@example.com, EMP-N0MCHV, role QA Tester, dept QA Test Dept, id 43827043-ac67-4e9b-911f-b33ebc7b04eb (1 record; double-click gave no duplicate)
3. Leave request: Casual Leave, Nov 18 2026 (1 day), reason "QA synthetic test leave request, please ignore.", Pending, approver qaown1012b
4. Holiday "QA Test Holiday", Dec 25 2026
5. Holiday "QA Dup Holiday", Dec 25 2026 (duplicate date, accepted by app)
6. Asset "QA Laptop", Laptop, SN-QA-LAPTOP-0001, QA Brand / QA Model, cost 50000
7. Expense #EXP-2026-001, Software, Rs 500, 13 Oct 2026, Pending, "QA synthetic expense claim"
8. Expense #EXP-2026-002, same as 7 (second submit, see defect E2)
Not submitted (no record): onboarding wizard left at Job Details with sharklasers email; attendance correction (cancelled).

## Defects
D1 Onboarding Job Details, Next with no department: raw validation text "Invalid input: expected string, received undefined" shown under Department (2 of 2 runs).
D2 Onboarding wizard loses all data on F5 refresh and on browser Back/Forward (Back goes to /hr/employees, Forward returns to empty wizard). No draft save. (2 of 2)
D3 Onboarding name field silently strips characters while typing (e, a Unicode, emoji, <, >, /, digits, parens removed; "Zoë 李 😀" typed -> "Zo  "); fill() of the same text clears the whole field to "". No message. (3 repro)
D4 Onboarding duplicate email inconsistent: qa.happy1@example.com (created employee) blocked at Step 1 with "This email already belongs to an employee in your organization." but qaadm1012d@sharklasers.com (listed in /hr/employees) passed Step 1 both times (2 of 2). Needs confirmation whether directory accounts count as employees.
D5 Onboarding empty email error says "Invalid email address" instead of "required".
D6 Onboarding DOB calendar: all days after ~Oct 2010 are disabled (Nov/Dec 2010 greyed, year list stops at 2010). Future DOB and age<14 cannot be entered via UI -> untestable (repro 3).
D7 Leave double-click submit: first click creates request; second click returns "You already have a leave request for overlapping dates." while the drawer stays open after success with the filled form (1 repro).
D8 Holiday: duplicate date accepted, "Holiday added" toast, two holidays on Dec 25 2026 (1 repro).
D9 Expenses huge amount (99999999999999999999) silently replaced with 0 and then error "Amount must be greater than 0" (misleading) (1 repro).
D10 Expenses: claim submitted (POST /me/expenses 201, visible on /me/expenses as Pending) does not appear on /hr/expenses ("0-0 OF 0 TOTAL") nor Action Center Expense tab (0) (2 of 2 claims). Also first submit gave no visible confirmation to me; I re-submitted and created a duplicate.
D11 Attendance correction: check-in 18:00 rejected "Check-in cannot be later than the current time" at 22:53 IST (17:23 UTC) -> probable timezone mismatch (1 repro, verify).
D12 Assets empty submit shows only "Asset name is required"; Serial/Brand/Model messages appear only after name is filled (sequential validation, minor).

## Workflow results: see console summary in final report.
