# Payroll Round 2 - TEST DATA (QA1015R2, 2026-10-15)

Org "ADitay CAhala", owner session. Prefix QA1015R2 for everything I created. Round-1 (QA1015) items that I touched are listed too.
No codes, passwords or tokens are recorded here.

## Cleanup status (end of round 2)
| Item | Round | Action | State now |
|---|---|---|---|
| Template "QA1015 DblClick Test" (active copy) | R1 | Deactivated (as requested) | Inactive. The inactive copy from round 1 was already inactive. |
| Template "QA1015R2 DblClick Recheck" x2 | R2 | Deactivated | Inactive (both) |
| Template "QA1015R2 Guard Test" | R2 | Deactivated | Inactive |
| Template "QA1015 Structure A" (duplicate created in R2, identical to the round-1 card) | R2 | Deactivated (the first card in the list, which by creation order is mine; both were identical) | Inactive. Round-1 original "QA1015 Structure A" kept Active for assignment. |
| Template "QA1015 Structure A" (round-1 original) | R1 | Kept | Active |
| Template "QA1015 Structure HRA150" (round-1 duplicate, one copy left) | R1 | Already inactive | Inactive |
| Template "QA1015 Huge Test" | R1 | Already inactive (PAY-B-009 evidence) | Inactive; no hard delete offered |
| Template "QA1015 Structure HRA150" (x1 remaining) | R1 | Already inactive | Inactive |
| Component "QA1015R2 Big" (999999999) | R2 | Deleted | Deleted |
| Component "QA1015R2 Pct 150" | R2 | Deleted | Deleted |
| Component "QA1015R2 Pct 0" | R2 | Deleted | Deleted |
| Component "<script>alert(1)</script>QA1015R2" (QA1015R2XSS) | R2 | Deleted | Deleted |
| Component "QA1015 Refresh Test" (QA1015RFR, R1 "unverified" row) | R1 | Delete clicked; the app deactivated it because a profile uses it | Inactive (kept: in use by QA Probe Pay's profile) |
| Components QA1015 Basic (QA1015BASIC), QA1015 HRA (QA1015HRA), QA1015 PF Employee (QA1015PF), QA1015 Prof Tax (QA1015PT) | R1 | Kept | Active; used by the QA Probe Pay profile and run 2. Not deleted to avoid changing that profile. |
| Component QA1015R2 Pct Neg | R2 | Never created (blocked inline) | n/a |
| Component QA1015R2 Neg Amount (-500) and duplicate code QA1015BASIC | R2 | Never created (400 / 409) | n/a |
| Policy legal entity "QA1015 Legal Entity" | R1 | Saved again with the same value (PATCH 200) | Same as before |
| Policy PF / ESI | R2 | Toggles opened and cancelled | PF on, ESI off (unchanged) |
| Policy version | R2 | Not created | none |
| Salary profile QA Emp (profile 5) | R1 | Edit attempts failed (400); nothing saved | Unchanged: CTC ₹6,00,000, no components |
| Salary profile QA Probe Pay | pre-existing | Not edited | Unchanged |
| Create Salary Profile dialog | R2 | Typed -5 / 999999999999 / abc, cancelled | Nothing created |
| Payroll run 2 (October 2026, draft) | R1 | Recalculated twice in R2 | Still DRAFT; cannot be deleted in the UI. Left as is. |
| Run 2 adjustment "QA1015 Test Allowance" (₹5,000 earning, QA Emp) | R1 | Left in place | Still on run 2 (no remove control) |
| Run 2 adjustment "QA1015R2 Adj Earn" (₹5,000 earning, QA Emp, note "QA1015R2 test adjustment") | R2 | Added (201) | Still on run 2 (no remove control). Not applied by the engine (B-023). |
| Run 2 negative adjustment "QA1015R2 Neg Adj" | R2 | Blocked inline ("Positive decimal required"); not added | n/a |
| Journal | R2 | Exported CSV only (no post) | Nothing posted |
| Downloads | R2 | Two files in /home/box/Downloads: payroll-journal-2026-10.csv, payroll-register-2026-10.csv (JSON envelope; see PAY-B-034) | Kept as evidence |
| Payslips | R2 | Preview only; no publish, no email | No change |

## Evidence files
- Downloads: /home/box/Downloads/payroll-journal-2026-10.csv and /home/box/Downloads/payroll-register-2026-10.csv
- Screenshots: saved by the browser tool under /home/box/agent-data/agents/def50a8e-897b-4b47-a35d-ab51bc9f1b27/assets/ (not copied here)

## Not done (intentionally)
- No finalize, approve, lock, publish, pay, bank file, journal post, tax filing, or payslip email.
- No input period opened (Open Period changes period state).
- No new salary profile created.
