# Payroll Round 1 - TEST DATA (QA1015, 2026-10-15)

Org "ADitay CAhala", owner session. No payouts, bank transfers, gateways, filings, approvals, locks or publishes. Test employee: QA Emp (QA1015-EMP, qa1015emp@sharklasers.com).

## Found already existing before this round (not created by me)
- Policy legal entity "QA1015 Legal Entity" (restored after blank/long-name tests).
- Salary profile for QA Emp: CTC ₹6,00,000, Effective 2026-10-14, profile id 32613221-… (profile 5), no components.

## Created / changed this round
| Item | Detail | State now |
|---|---|---|
| Component QA1015 Basic | QA1015BASIC, Earning, Fixed ₹25,000 | Active |
| Component QA1015 HRA | QA1015HRA, Earning, 40% of Basic (first created at 150%, edited to 40 failed - PAY-B-005; deleted and recreated) | Active |
| Component QA1015 PF Employee | QA1015PF, Deduction, 12% of Basic | Active |
| Component QA1015 Prof Tax | QA1015PT, Deduction, Fixed ₹200 | Active |
| Component refresh test | QA1015RFR "QA1015 Refresh Test" ₹1000 - submitted and page reloaded immediately; result NOT verified. If it exists, delete it. | UNVERIFIED |
| Salary template QA1015 Structure A | Basic 50000, HRA 40%, PF 12%, PT 200, from 2026-10-15 (renamed from "QA1015 Structure HRA150") | Active - keep for assignment |
| Template QA1015 Structure HRA150 (x2 dup, PAY-B-010) | identical | 1 Inactive (deactivated), 1 Inactive - both deactivated |
| Template QA1015 Huge Test | basic 999999999999 (PAY-B-009) | Inactive (deactivated; no hard delete offered) |
| Template QA1015 DblClick Test (x2, PAY-B-020) | identical | 1 Active, 1 Inactive - clean up the Active one |
| Policy settings | Legal entity re-saved as "QA1015 Legal Entity"; no other values changed | Restored |
| Policy version | Not created (drawer cancelled) | none |
| Policy activation | Setup step 4/5 "Looks good, activate" and "Activate Payroll" clicked: policy now ACTIVE; 8 default components auto-added | ACTIVE |
| Payroll run | October 2026 draft run id 2 (created via Readiness "Create run") | EXCEPTIONS, draft; cannot be deleted in UI |
| Manual adjustment | "QA1015 Test Allowance" earning ₹5000 on QA Emp in run 2 (PAY-B-023) | remains; no remove control found |
| Salary profile edits | All failed with 400 (PAY-B-014); no change saved | unchanged |

## Not done
- Draft run delete: no delete control in UI. Left as draft.
- Payslip download: not possible (Publications "No eligible runs - lock a run"; template preview blank).
- Salary profile duplicate test (not submitted to avoid an unremovable second profile).
