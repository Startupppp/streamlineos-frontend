# Payroll Round 1 - UX (QA1015, 2026-10-15)

## Must change
1. Show field errors inline with plain words; never toast raw keys/regex ("amount: Invalid string: must match pattern…", "legalEntityName: Too big…") (PAY-B-004, B-007).
2. Make the draft run deletable or discardable; right now a test run cannot be removed from the UI.
3. Salary Structures copy says "Edit an employee's structure there" but no control exists on the employee profile (PAY-B-012).
4. Delete button on templates actually deactivates; rename the button or the dialog so they match.
5. Run page: "Submit for Approval" is the primary button while the run has blockers; disable it until blockers are cleared.
6. Negative net pay must be a blocker shown as a blocker, not a payable total (PAY-B-017).
7. Creating… spinner on components/templates can last 20+ seconds with no progress text.

## Good to have
1. Readiness/Runs show "Run created 14 Oct 2026" while the local date is 15 Oct IST - show dates in the user's timezone.
2. Salary profile list: "Annual CTC" value sits under the wrong column header.
3. Tax report and Journal show internal codes (EPF_EMPLOYEE, PROFESSIONAL_TAX, UNMAPPED:…) as labels.
4. Policy version drawer: explain what effective month means and show the affected employees by name.
5. Number inputs accept "12e3"; restrict to digits and a decimal point.
6. Ordinals/labels and component names: keep codes out of employee-facing text.
