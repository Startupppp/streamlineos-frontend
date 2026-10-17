# Payroll Round 2 - COVERAGE (QA1015R2, 2026-10-15)

Scope: owner session, org "ADitay CAhala", one tab. No finalize, approve, lock, pay, publish, post or file. Draft runs and previews only.
Incident: the tab crashed once ("Page crashed") on navigating to /payroll/employees. Recovered by opening one new tab and closing the old one. Likely memory pressure; no data loss seen.

| Area | Route | What I did | Result |
|---|---|---|---|
| Round-1 recheck (25 bugs) | all | see BUGS.md table | 0 fixed, 3 partial, 21 still open, 1 blocked |
| Components: negative fixed amount | /payroll/components | Fixed "-500" submitted | 400, toast with regex text (B-004) |
| Components: percent edge values | /payroll/components | -5 (inline message, no request), 0 (201), 150 (201, formula) | Negative blocked inline; 0 and 150 accepted (B-003, B-027, B-028) |
| Components: fixed 999999999 | /payroll/components | created QA1015R2BIG (201) | Accepted, flows into breakup (B-026) |
| Components: duplicate code | /payroll/components | code QA1015BASIC | 409 + toast; no inline (B-004 note) |
| Components: <script> name | /payroll/components | name with script tag | Stored; rendered as text; no script ran (B-029) |
| Components: edit | /payroll/components | Edit QA1015R2 Big sort order | PATCH 400 "Unrecognized key: code" (B-005) |
| Components: delete | /payroll/components | deleted my QA1015R2 test rows and QA1015R2XSS; QA1015RFR deactivated (in use) | Done |
| Policy: Pay Day list | /payroll/settings (edit) | option list | 21th/22th/23th still (B-001) |
| Policy: legal entity blank | /payroll/settings | blank, Save | 200, unchanged (B-006) |
| Policy: legal entity 307 chars | /payroll/settings | 307 chars, Save | 400 raw key (B-007) |
| Policy: statutory toggles | /payroll/settings | PF (on) → disable confirm, cancelled; ESI (off) → version drawer, cancelled | Effective From 2026-08 prefilled (B-008); no change saved |
| Policy: start month | /payroll/settings | listed options | Past months selectable (B-037) |
| Setup wizard | /payroll/setup | route | Redirects to settings (policy ACTIVE); steps 1-5 not reachable (B-002 blocked, B-015 state only) |
| Templates: basic 20 digits | /payroll/salary-structures | submit | 500, no inline (B-009) |
| Templates: duplicate name | /payroll/salary-structures | "QA1015 Structure A" (201) | Duplicate accepted (B-010) |
| Templates: double-click | /payroll/salary-structures | real dblclick on Create | Two POSTs, two templates (B-020); single click = one (checked) |
| Templates: PF % 150 / 120 | /payroll/salary-structures | fields, no submit | No % message; gross rule blocks 150 only (B-025) |
| Templates: breakup preview | /payroll/salary-structures | Sample CTC 12,00,000 | Earnings ₹1,00,02,03,599/mo with duplicates (B-024, B-011 partial) |
| Templates: deactivate | /payroll/salary-structures | deactivated my 3 DblClick/Guard copies, 1 duplicate Structure A, and round-1 "QA1015 DblClick Test" | Done; only "QA1015 Structure A" (round-1 original) left active |
| Employees: list | /payroll/employees | open both profiles | Two test employees listed |
| Profile: QA Emp | /payroll/employees/32613221-… | Edit profile unchanged Update | PATCH 400 "Unrecognized key: effectiveFrom" (B-014); no component/structure picker (B-012); UUID heading (B-013) |
| Profile: QA Probe Pay | /payroll/employees/a32a5b84-… | read components and estimate | Components present; Basic shows Percent 150% (B-030); estimate ₹46,000 vs run ₹96,000 (B-033) |
| Salary profile: Add salary | /payroll/employees | open, type -5 / 999999999999 / abc, no submit | No inline message (B-036) |
| Run 2 | /payroll/runs/2 | Recalculate (2 calls, 200) | Draft; QA Emp gross 0 (B-016); QA Probe Pay gross 96,000 on 50,000/mo CTC (B-031); HRA/PF base mismatch (B-032) |
| Run 2 math | breakdown | QA Probe Pay: 25,000+20,000+1,000+20,000+10,000+20,000 = 96,000; deductions 2,400+200+1,800+200 = 4,600; net 91,400 | Arithmetic correct; inputs wrong |
| Run 2 totals | run header | Gross 96,000, Deductions 4,800, Net Payable 91,200 | Totals consistent; negative netted (B-017) |
| Run 2 exceptions | Exceptions tab | list read | Header 1 vs list 3 blockers (B-018) |
| Run 2 adjustments | Add Adjustment | QA1015R2 Adj Earn 5000 (201) → Recalculate → breakdown | Not applied (B-023); negative amount -100 blocked inline (good) |
| Run 2 inputs | /payroll/runs/2?tab=inputs | direct load | "Payroll run error" page (B-019) |
| Run 2 variance | Variance tab | read | Negative QA Emp in Top Earners (B-017) |
| Journal | /payroll/reports (Journal) | read footer and lines | Balanced 97,800 = 97,800; codes still UNMAPPED (B-022 partial) |
| Export: journal and register | Reports header; settings/import-export | downloaded both CSVs | JSON envelope in .csv (B-034); paidDays 31 (B-035) |
| Payslip templates preview | /payroll/payslips?tab=templates | Classic Table Preview | Empty drawer (B-021) |
| Deep links | /payroll/runs/999999, /payroll/employees/<zero-uuid>, /payroll/runs/not-a-uuid | load | "Not found" pages, no crash; no link back (UX) |
| LOP / attendance | /payroll/inputs | read | "No input period found for October 2026" (Open Period not clicked, to avoid changing period state); paidDays 31 in export (B-035) |
| Legal entity restore | /payroll/settings | restored "QA1015 Legal Entity" | Same value; no change |
| Not tested | Finalize, approve, lock, pay, publish, post, file, bank transfer, final settlement, attendance import, Open Period, payslip download | Out of scope or would change state | Not done |
| Not tested | Setup step 4 review (B-002) and activation (B-015) | Policy already ACTIVE; redirected | Blocked/state only |
