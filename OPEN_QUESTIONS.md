# OPEN Questions — Payroll Module

Questions from the HR Questionnaire that were answered with "can discuss", "-", "yes" (without specifics), or not answered at all.
Each one is a **build blocker** for the feature listed. Do not implement the corresponding logic until the answer is confirmed here.

---

## OPEN-01 · Payslip Password Rule
**Questionnaire**: Q60 — "Should payslips be password protected? If yes — what should the password be?"
**HR's Answer**: "yes" — no format specified.
**Why blocked**: The PDF generation code must encode a password. Without the rule, we cannot generate or email payslips. Common options: DOB (DDMMYYYY), last 4 digits of phone, PAN suffix, employee ID.
**Blocks**: Feature 10 (Payslip Generation & Delivery)

---

## OPEN-02 · Salary Revision Frequency
**Questionnaire**: Q43 — "How often are salary revisions done?"
**HR's Answer**: "can discuss"
**Why blocked**: Affects whether the UI shows annual/half-yearly cadence, reminder schedules, and due-date calculations.
**Blocks**: Feature 11 (Salary Revision Workflow) — UI only; the data model can be built now.

---

## OPEN-03 · Salary Increment Percentage
**Questionnaire**: Q44 — "Is there a standard increment % or is it purely performance-based?"
**HR's Answer**: "can discuss"
**Why blocked**: If standard %, the revision form can pre-fill a suggested amount. If purely ad hoc, no suggestion logic is needed.
**Blocks**: Feature 11 — suggestion logic only.

---

## OPEN-04 · Mid-Month Revision Proration
**Questionnaire**: Q45 — "When a salary is revised mid-month, how is that month's salary calculated?"
**HR's Answer**: "can discuss"
**Why blocked**: Two approaches: (a) apply new salary from revision date and prorate both old + new rates within the month; (b) apply new salary from the 1st of the next month only.
**Default assumption (flagged here, not coded)**: Apply new salary from 1st of next full month until HR confirms otherwise.
**Blocks**: Feature 11 proration logic; Feature 9 (Payroll Run) when revision falls mid-month.

---

## OPEN-05 · Saturday Overtime Pay Rate
**Questionnaire**: Q21 — "Is Saturday a working day or off? If it is a half day — how is pay calculated for Saturday overtime?"
**HR's Answer**: "its half day" — pay calculation for extra hours on Saturday not answered.
**Why blocked**: Q21 only confirms Saturday is half-day. It does not say whether working beyond the half-day shift qualifies as holiday-level pay (per-day CTC rate) or regular overtime at a different rate, or whether it is not compensated.
**Default assumption**: Saturday OT is not currently tracked (consistent with Q3 "for now we are not counting"). Add Saturday flag to attendance but do not generate pay until confirmed.
**Blocks**: Feature 3 (Attendance Foundation) — Saturday flag; Feature 6 (Overtime) — Saturday OT rate.

---

## OPEN-06 · Sales Incentive Structure
**Questionnaire**: Q40 — "Is there a sales incentive structure for the Sales team?"
**HR's Answer**: "will discuss"
**Why blocked**: A dedicated incentive engine (targets, tiers, payout %) is separate from standard payroll.
**Blocks**: Feature 12 (Bonus & Incentives) — already deferred per build order.

---

## OPEN-07 · Payslip Earnings/Deductions Format
**Questionnaire**: Q53/Q54 — "What should be shown on the payslip earnings side? / deductions side?"
**HR's Answer**: "will share payslip"
**Why blocked**: HR promised to share a sample payslip template. The PDF layout depends on column names, grouping, and ordering of line items.
**Current assumption (documented, not finalised)**:
- Earnings: Basic Salary | HRA | Special Allowance | Overtime
- Deductions: Loss of Pay (LOP) | Professional Tax (PT) | Advance Recovery
- Summary rows: Days Worked | LOP Days | Gross Salary | Net Salary
**Blocks**: Feature 10 (Payslip PDF layout) — awaiting sample from HR.

---

## OPEN-08 · Salary Advance Recovery Spread
**Questionnaire**: Q35 — "If an employee has taken a salary advance, how is the recovery spread across months?"
**HR's Answer**: "it depends can discuss"
**Why blocked**: No fixed EMI formula. Recovery amount per month is ad hoc.
**Current approach**: Reuse the existing `salary_loans` table which already stores `emiAmount` + `totalEmis` + `paidEmis`. HR sets the EMI manually per loan case. This is implementable now — flagged OPEN only for any future automation rule.
**Blocks**: Nothing immediately — `salaryLoans` EMI pattern is sufficient.

---

## OPEN-09 · Statutory Deductions (PF / ESI / TDS)
**Questionnaire**: Not asked; not in questionnaire scope.
**Why flagged**: The questionnaire covers PT only (Q32). No mention of PF, ESI, or TDS. These are statutory for most Indian companies. If applicable, they affect payroll computations significantly.
**Action required**: Confirm with HR/founder whether PF, ESI, or TDS applies. Do NOT build until confirmed.
**Blocks**: Feature 8 (Deductions Engine) — PT is confirmed; PF/ESI/TDS pending.

---

## OPEN-10 · Professional Tax Slab
**Questionnaire**: PT is listed as a deduction in Q32 but no slab/amount specified.
**HR's Answer**: Not specified; answer only confirms PT exists.
**Current assumption (hard-coded in existing generate route)**: ₹200/month flat.
**Action required**: Confirm whether ₹200/month flat is correct or whether a slab table (by state, by salary band) applies.
**Blocks**: Feature 8 (Deductions Engine) — current hardcoded ₹200 may need a slab table.

---

## OPEN-11 · Minimum Hours for Holiday Work — Partial Day
**Questionnaire**: Q64 — "Should there be a minimum number of hours worked on a holiday to qualify for holiday pay?"
**HR's Answer**: "only full day"
**Follow-up gap**: What does "full day" mean in hours? Standard shift = 9 hours (Q2). If employee works 7 hours on a holiday, does it qualify? The answer says full day, implying the full 9-hour standard shift must be logged, but this is not explicitly stated.
**Current assumption**: ≥ 8 hours work logged on holiday/Sunday = qualifies for holiday pay or comp off.
**Action required**: Confirm the hour threshold for "full day" (likely = standard shift duration = 9 hours or ≥ 8 hours).
**Blocks**: Feature 4 (Holiday Work Request eligibility check) and Feature 7 (Comp Off grant logic).

---

## Appraisal & PIP module (performance)

### OPEN-12 · Appraisal / PIP record retention duration (Q36)
**Questionnaire**: Q36 — automatic archival / purge duration not finalized (red).
**Why blocked**: No scheduled purge or archive job until HR defines retention.
**Current approach**: **No automatic purge**; all `appraisals` and `performance_improvement_plans` rows are retained until product rules exist.
**Blocks**: Automated retention / compliance purge only.

### OPEN-13 · Exited employees — appraisal & PIP access (Q37 / Q38)
**Questionnaire**: Q37/Q38 — records for exited staff must remain available to HR.
**HR direction**: Soft deactivation (`users.is_active = false`) is used instead of hard delete; appraisal and PIP rows are **not** cascaded away.
**Current approach**: HR and authorized roles can still open appraisals/PIPs by id / employee filter; list endpoints do **not** filter out inactive users for these tables.
**Blocks**: Nothing — policy is “retain and allow HR access”; any future `deleted_at` on users must keep FK rows visible to HR (no hard delete of appraisal/PIP history).
