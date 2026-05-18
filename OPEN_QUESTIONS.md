# OPEN Questions — Payroll Module

This file originally tracked **unanswered** HR questionnaire items. Items below marked **RESOLVED** are locked in for product behaviour (May 2026). Remaining items stay open for future work.

---

## RESOLVED — Payslip & compensation policy

### OPEN-01 · Payslip PDF password — **RESOLVED**

- **Policy**: Payslips are password-protected. Password = employee **date of birth in `DDMMYYYY`** format, using `users.date_of_birth` from HR onboarding.
- **Enforcement**: PDF download and payslip email require DOB; PDF must encrypt successfully (`qpdf` on the server) or the operation fails with a clear error.

### OPEN-02 · Salary revision frequency — **RESOLVED**

- **Policy**: **Ad hoc only** — no fixed annual/half-yearly cadence in software.

### OPEN-03 · Salary increment percentage — **RESOLVED**

- **Policy**: **No standard %** — no suggested increment in the UI.

### OPEN-04 · Mid-month revision proration — **RESOLVED**

- **Policy**: New salary applies only from the **1st of the next calendar month** (current pay month stays on the old salary). No in-month proration in payroll generation.
- **Implementation**: `effective_from` is snapped to the **first day of a month** (if HR picks another day, it snaps to the **first day of the following month**). The superseded `salary_structures` row receives `effective_to` = last day before the new structure starts.

### OPEN-05 · Saturday overtime pay — **RESOLVED**

- **Policy**: **Not compensated** — no EXTRA_PAY payroll accrual for **Saturday** holiday-work requests (attendance/logging unchanged). Saturday is treated as a **half working day** for attendance purposes, but **no Saturday OT pay** in payroll.
- **Note**: Monthly salary is not auto-reduced for “half Saturday”; LOP/half-day remain **HR-entered** unless separate attendance rules are added later.

### OPEN-07 · Payslip layout — **RESOLVED**

- **Policy**: PDF and HTML payslips follow the **approved HR sample** (title, two-column employee block, earnings/deductions table, net in words, system-generated disclaimer). Reference screenshot: `assets/Screenshot_2026-05-11_at_11.56.15_AM-c260ec5a-7ffc-4926-8e7f-acead411a075.png` (workspace).

### OPEN-09 · PF / ESI / TDS on payslip — **RESOLVED**

- **Policy**: **Do not show** PF, ESI, or TDS on payslip **unless** the computed amount is non-zero (company default remains non-applicable).

### OPEN-10 · Professional tax — **RESOLVED**

- **Policy**: **₹200 flat per month** (unless overridden on the employee’s salary structure row).

### OPEN-11 · Holiday / Sunday “full day” hours — **RESOLVED**

- **Policy**: **9 hours** minimum logged work for full-day holiday/Sunday EXTRA_PAY / comp-off eligibility (constant `HOLIDAY_WORK_FULL_DAY_HOURS`).

### OPEN-12 · Appraisal / PIP retention — **RESOLVED**

- **Policy**: **No automatic purge** — records kept indefinitely unless manually deleted via existing HR flows. **No scheduled compliance purge** is configured in this codebase.

---

## Still open / deferred (unchanged)

### OPEN-06 · Sales Incentive Structure

**Questionnaire**: Q40 — "Is there a sales incentive structure for the Sales team?"  
**HR's Answer**: "will discuss"  
**Blocks**: Feature 12 (Bonus & Incentives) — deferred per build order.

### OPEN-08 · Salary Advance Recovery Spread

**Current approach**: `salary_loans` EMI fields; HR sets EMI manually.  
**Blocks**: Nothing immediately — optional future automation only.

### OPEN-13 · Exited employees — appraisal & PIP access

**Status**: Policy unchanged — soft-deactivated users retain history for HR; see original PRD notes in git history if needed.
