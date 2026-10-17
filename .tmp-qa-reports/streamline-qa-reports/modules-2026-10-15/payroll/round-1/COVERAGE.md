# Payroll Round 1 - COVERAGE (QA1015, 2026-10-15)

| Area | Route | Result |
|---|---|---|
| Existing data check | /payroll/* | Found QA profile + legal entity (see TEST-DATA) |
| Setup step 4/5 | /payroll/setup | Activation reachable; contradictory messages (PAY-B-011, B-015) |
| Settings validation | /payroll/settings | Blank legal name: false success (B-006); 307 chars: raw error (B-007); PF toggle opens version drawer with past date (B-008). Version not submitted |
| Components validation | /payroll/components | Negative/letters/code: toast-only raw errors (B-004); duplicate code OK; percent 150 accepted (B-003); edit fails (B-005); create/delete work; "Creating…" slow |
| Salary template create | /payroll/salary-structures | Blank: Create disabled, OK; negative: inline OK; HRA 150: inline OK; PF 150: no inline (B-025); huge 20 digits: server 500 (B-009); duplicate name accepted (B-010); double-click duplicates (B-020); letters blocked natively; "12e3" accepted |
| Template edit / deactivate | same | Edit works; "Delete" actually deactivates ("Deactivate Template?") - UX |
| Assign structure to QA Emp | /payroll/employees | No UI to attach components/template (B-012); profile edit fails (B-014) |
| Draft run | /payroll/readiness, /payroll/runs/2 | Created; gross 0 vs profile ₹50,000 (B-016); negative net (B-017); counts (B-018); inputs/variance tab (B-019) |
| Recalculate | run page | Confirm dialog OK; calc unchanged; adjustment not applied (B-023) |
| Gross − deductions = net | run row, breakdown | Holds on the row (0 − 200 = −200), but net negative |
| Breakup preview | template dialog | Works after activation; double counting (B-024) |
| Edit and re-run | adjustment | Done; not reflected (B-023) |
| Delete the draft | run / runs list | No delete control found |
| Payslip download | /payroll/payslips | No eligible runs; template preview blank (B-021); no download |
| Reports | /payroll/reports | Summary, Register, Earnings, Deductions, Tax, Bank Payout, Variance, Journal viewed; Journal balanced 0/0 with lines (B-022); Export CSV not clicked |
| Double-click | template create | Duplicates (B-020) |
| Refresh | run creation, template list | Persisted; component refresh test submitted, result NOT verified |
| Not tested | Bank Transfers, Final settlement, Taxes, Access, Payroll posting, approval, publish | Out of scope (no payouts/approvals) |
