# Payroll & Compensation — Build Plan

**Source of truth**: HR Requirements Questionnaire (Payroll_Requirements_HR.docx, 22 April 2026)
**Open questions tracker**: [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md)
**Current branch**: hotfix/22-april-fixes → will move to feature/payroll-module

---

## 1 · Existing Codebase Inventory

### Database Tables (already migrated)

| Table | Relevant Columns | Payroll Gap |
|---|---|---|
| `salary_structures` | basicSalary, hraPercentage (default **40%** ← wrong, Q29 says 50%), allowances, deductions, effectiveFrom, effectiveTo, isActive | No revision history; `allowances` conflates Special Allowance + other; `deductions` conflates PT + misc; HRA default wrong |
| `payrolls` | basicSalary, hra, allowances, deductions, grossSalary, netSalary, overtimeAmount, overtimeDays, overtimeHours, status | No unique constraint on (orgId, userId, month); no separate lopDays, lopAmount, ptAmount, specialAllowance, advanceRecoveryAmount columns; cannot reconstruct payslip line items |
| `attendance` | checkIn, checkOut, workHours, breakHours, isOvertime, status | No flag for "worked on holiday" or "worked on Sunday"; no notification trigger on holiday clock-in |
| `holidays` | name, date, message, isPublic | Missing `type` (NATIONAL/PUBLIC/OPTIONAL) and `isHalfDay` flag (needed for Q13, Q21) |
| `leave_types` | name, daysPerYear, carryForward | "Compensatory Off" type auto-created on first comp-off credit — no separate comp-off tracking with expiry |
| `leave_balances` | balance, year | No per-grant expiry date; balance is a running number, not a list of grants |
| `salary_loans` | amount, emiAmount, totalEmis, paidEmis, status | Exists for advance/loan tracking — usable for advance recovery in payroll |
| `notifications` | title, message, link, metadata | Available via `createNotification` / `notifyByRoles` server actions |

### Existing API Routes (relevant)

| Route | Method | Status |
|---|---|---|
| `/api/hr/salary-structures` | GET, POST | Exists — needs HRA % fix + specialAllowance field |
| `/api/hr/payrolls/generate` | POST | Exists — partial; needs line-item breakdown, idempotency, auto-pull of LOP + advance |
| `/api/hr/payrolls/[id]/download` | GET | Exists — currently returns stub/basic data |
| `/api/hr/payrolls/[id]/approve` | POST | Exists |
| `/api/hr/payrolls/[id]/paid` | POST | Exists |
| `/api/hr/payrolls/all` | GET | Exists |
| `/api/hr/payslips` | GET | Exists — employee self-service |
| `/api/hr/leaves/comp-off` | POST | Exists — credits comp-off days, no expiry tracking |
| `/api/hr/holidays` | GET, POST | Exists — needs type + isHalfDay |
| `/api/hr/attendance/check-in` | POST | Exists — needs holiday flag + notification |
| `/api/hr/loans` | GET, POST | Exists — advance/loan CRUD |

---

## 2 · Business Rules (from questionnaire)

### CTC Structure (Q28–Q31)
```
CTC_monthly = Basic + HRA + Special Allowance
HRA         = 50% of Basic   (Q29 — "50% basic")
Spl_Allow   = CTC - Basic - HRA   (derived; same percentage for all employees, Q30)
daily_rate  = CTC_monthly / days_in_month   (Q10, Q18)
```

### Overtime (Q1–Q8)
- Paid ONLY when worked on a declared holiday with proper justification (Q1)
- Rate: per-day CTC salary (Q4, Q5 — CTC basis)
- Trigger: after 9 hours on that day (Q3 — currently not counting, field exists)
- Source: manual entry (Q8)
- Auto-calculated from attendance (Q7)
- No monthly cap active (Q6 — implement field, leave nullable)
- Shown as separate line on payslip (Q56)

### Holiday Work (Q9–Q15)
- Extra pay for working on public holiday: YES (Q9)
- Rate: per-day CTC salary (Q10)
- Employee can choose: extra pay OR comp off (Q11)
- Comp off: 1 day per full day worked (Q12)
- Holiday list maintained by HR annually (Q13)
- Payroll calculated per days in month — holiday sandwich rule not applicable (Q14)
- Attendance verified through reports (Q15) — manual/HR discretion, no system auto-check

### Sunday Work (Q16–Q21)
- Sunday = mandatory week off (Q16)
- Choice: extra pay OR comp off (Q17)
- Rate: same per-day CTC salary (Q18)
- Requires prior approval (Q19)
- No monthly cap — all Sundays compensated (Q20)
- Saturday = half day (Q21); Saturday OT pay rate → **OPEN-05**

### Comp Off (Q22–Q27)
- Optional (employee opts in) (Q22)
- Prior intimation required — must apply before taking the day off (Q23)
- Expiry: 1 month from grant date (Q24)
- No payout on expiry (Q25)
- Approved by HR (Q26)
- Tracked separately from regular leave (Q27)

### Allowances (Q28–Q31)
- HRA: 50% of Basic, part of CTC (Q28, Q29, Q31)
- Special Allowance: part of CTC, same for all (Q28, Q30, Q31)
- No travel, food, internet, mobile, or medical allowances

### Deductions (Q32–Q36)
- LOP: per day (Q33) — `daily_rate × lop_days`
- Professional Tax: standard (₹200/month assumed — **OPEN-10**)
- Advance recovery: EMI per case-by-case (Q35) — uses existing `salary_loans`
- Late arrival: warning for first 3 days, NO deduction (Q34); log only
- No other standard deductions (Q36)

### Bonus & Incentives (Q37–Q42) — ALL DEFERRED
- No performance bonus (Q37)
- No joining/referral bonus (Q41)
- Prorated bonus on resignation: N/A (Q42)

### Salary Revisions (Q43–Q47)
- Initiated by HR (Q47)
- Full history kept per employee (Q46)
- Frequency: **OPEN-02**; Increment %: **OPEN-03**; Mid-month proration: **OPEN-04**

### Reimbursements (Q48–Q52) — ALL DEFERRED (all blank)

### Payslip (Q53–Q60)
- Earnings: Basic | HRA | Special Allowance | Overtime (separate) (Q53, Q56)
- Deductions: LOP | PT | Advance Recovery (Q54)
- Show: days worked, LOP days (Q55); holidays NOT required
- Comp offs NOT shown (Q57)
- Auto-emailed on generation (Q58)
- Employee self-service download (Q59)
- Password protected (Q60) — format: **OPEN-01**

### Attendance for Holiday/Sunday Work (Q61–Q65)
- HR awareness: employee login or inform HR (Q61)
- Clock-in method: employee can inform (Q62) — web clock-in accepted
- Notification to HR/manager when clock-in on holiday: YES (Q63)
- Minimum: full day only (Q64) — **OPEN-11** for exact hour threshold
- Pre-approval request (like leave request): YES (Q65)

---

## 3 · Build Order

Features listed in dependency order. **Do not skip ahead.**

```
Feature 1  → Foundation: Salary Structure & CTC Components
Feature 2  → Holiday Master (extends existing table)
Feature 3  → Attendance Foundation (extends existing; holiday flag + notification)
Feature 4  → Holiday Work Request (new pre-approval workflow)
Feature 5  → Sunday Work (extends Feature 4; same workflow, different source type)
Feature 6  → Overtime Engine (depends on Features 3 + 4)
Feature 7  → Comp Off Module (depends on Features 4 + 5)
Feature 8  → Deductions Engine (LOP, PT, advance recovery, late-arrival warnings)
Feature 9  → Payroll Run — monthly cycle (depends on all above)
Feature 10 → Payslip Generation & Delivery (OPEN-01 / OPEN-07 resolved — see `OPEN_QUESTIONS.md`)
Feature 11 → Salary Revision Workflow (OPEN-02/03/04 resolved — ad hoc revisions; effective 1st of month; no in-month proration)
Feature 12 → Bonus & Incentives — DEFERRED
Feature 13 → Reimbursements — DEFERRED
```

### Implemented HR policy snapshot (May 2026)

Source: resolved items in [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md).

- **Payslip PDF**: Password = employee **DOB in DDMMYYYY** (onboarding `date_of_birth`). Layout matches approved HR sample (earnings/deductions table; no PF/ESI/TDS lines unless amounts are non-zero in data).
- **Salary revision**: **Ad hoc** (no fixed cadence); **no suggested increment %**; new salary applies from the **first day of a calendar month** only (`effective_from` snapped; superseded row gets `effective_to` = last day before the new start).
- **Saturday**: **No** EXTRA_PAY from Saturday holiday-work requests; Saturday remains visible in attendance/requests only.
- **Holiday / Sunday pay threshold**: **≥ 9 hours** logged work for “full day” eligibility.
- **PT**: Flat **₹200**/month unless structure overrides.
- **Appraisal / PIP**: **No scheduled purge**; retain until manual deletion if ever supported.

---

## 4 · Feature Specifications

---

### Feature 1 · Foundation — Salary Structure & CTC Components
**Questionnaire**: Q4, Q5, Q10, Q18, Q28–Q31, Q46

**Business rules**:
- HRA = 50% of Basic (fix existing default of 40%)
- Special Allowance = stored explicitly (not lumped in generic `allowances`)
- PT = stored explicitly (not lumped in generic `deductions`)
- Daily rate = CTC_monthly / days_in_month (pure function, no new table)
- Every salary change produces a `salary_revision_history` row

**Models touched**:
- `salary_structures` — migrate: fix `hra_percentage` default (40→50), add `special_allowance` decimal column, add `professional_tax` decimal column (default 200), add `created_by` text FK
- `salary_revision_history` (**new table**):
  ```
  id, org_id, user_id, salary_structure_id(FK),
  previous_basic, previous_hra_pct, previous_special_allowance, previous_pt,
  new_basic, new_hra_pct, new_special_allowance, new_pt,
  effective_from (date), reason (text),
  changed_by (FK → users), created_at
  ```

**API routes**:
- `GET /api/hr/salary-structures` — existing, extend response with `specialAllowance`, `professionalTax`
- `POST /api/hr/salary-structures` — existing, add fields + write revision history row on update
- `GET /api/hr/salary-structures/[userId]/history` — **new** — list revision history

**Service functions** (in `server/queries/hr/payroll.ts`):
- `computeDailyRate(ctcMonthly: number, month: string): number` — `ctcMonthly / daysInMonth(month)`
- `getActiveSalaryStructure(orgId, userId)` — existing pattern, return with new fields
- `createSalaryRevision(...)` — insert into `salary_revision_history` + update `salary_structures`

**UI**: Extend existing `/hr/payroll` salary-structure form with `specialAllowance` field. Add revision history tab per employee.

**Migration**: `0104_payroll_foundation.sql`

---

### Feature 2 · Holiday Master
**Questionnaire**: Q13, Q21

**Business rules**:
- HR maintains an annual list of holidays
- Each holiday is typed: NATIONAL | PUBLIC | OPTIONAL
- Saturday is a half-day — flag `is_half_day` marks holidays that only cover half-day work

**Models touched**:
- `holidays` — migrate: add `type` text ("NATIONAL" | "PUBLIC" | "OPTIONAL"), add `is_half_day` boolean (default false)

**API routes**:
- `GET /api/hr/holidays` — existing, extend response with `type`, `isHalfDay`
- `POST /api/hr/holidays` — existing, accept + validate `type`, `isHalfDay`
- `PATCH /api/hr/holidays/[holidayId]` — existing, accept updates

**UI**: Extend existing holiday form with Type dropdown + "Half day" checkbox.

**Migration**: `0105_holiday_type_halfday.sql`

---

### Feature 3 · Attendance Foundation — Holiday Flag & Notification
**Questionnaire**: Q2, Q3, Q7, Q8, Q61–Q63

**Business rules**:
- When employee clocks in on a declared holiday → notify HR/manager (Q63)
- When employee clocks in on a Sunday → notify HR/manager
- `is_holiday_work` flag stored on attendance row for downstream overtime/comp-off logic
- `is_sunday_work` flag stored similarly
- Work hours auto-computed on clock-out (existing behaviour preserved)
- Standard shift = 9 hours including breaks — existing `work_hours` field covers this

**Models touched**:
- `attendance` — migrate: add `is_holiday_work` boolean (default false), `is_sunday_work` boolean (default false), `holiday_id` integer nullable FK → `holidays`

**API routes**:
- `POST /api/hr/attendance/check-in` — existing, extend: on clock-in check if date is in `holidays` table for org → set `isHolidayWork=true`, `holidayId` → fire `notifyByRoles(["HR","BRANCH_HR"], ...)` async
- Existing clock-out unchanged

**Service**: `server/actions/attendance-holiday-check.ts` — `checkHolidayAndNotify(orgId, date, userId, attendanceId)`

**Migration**: `0106_attendance_holiday_flags.sql`

---

### Feature 4 · Holiday Work Request (Pre-Approval Workflow)
**Questionnaire**: Q65, Q19, Q64, OPEN-11

**Business rules**:
- Employee applies in advance — like a leave request — before working on a holiday or Sunday
- HR approves or rejects
- Approved request is the prerequisite for overtime pay or comp-off grant
- Minimum: full day worked (≥ 8 hours — pending OPEN-11 confirmation)
- Request type: HOLIDAY | SUNDAY

**Models touched**:
- `holiday_work_requests` (**new table**):
  ```
  id, org_id, user_id, request_date (date), type ("HOLIDAY"|"SUNDAY"),
  holiday_id (FK → holidays, nullable — null for Sunday requests),
  reason (text), compensation_preference ("EXTRA_PAY"|"COMP_OFF"),
  status ("PENDING"|"APPROVED"|"REJECTED"),
  approved_by (FK → users, nullable), approved_at (timestamp),
  rejection_reason (text), created_at, updated_at
  ```
  Unique: `(org_id, user_id, request_date)`

**API routes**:
- `POST /api/hr/holiday-work-requests` — employee submits request; validates date is holiday/Sunday; notifies HR
- `GET /api/hr/holiday-work-requests` — list (HR: all; employee: own; manager: team)
- `PATCH /api/hr/holiday-work-requests/[id]/approve` — HR approves; notifies employee
- `PATCH /api/hr/holiday-work-requests/[id]/reject` — HR rejects; notifies employee

**Service**: `server/queries/hr/holiday-work-requests.ts`

**UI**: New sheet/form in `/hr/attendance` or `/hr/leaves` — "Request Holiday Work"

**Migration**: `0107_holiday_work_requests.sql`

---

### Feature 5 · Sunday Work
**Questionnaire**: Q16–Q20

**Business rules**:
- Sunday = mandatory week off; same pre-approval flow as Feature 4 (`type = "SUNDAY"`)
- Same per-day CTC rate as holiday (Q18)
- Employee chooses: extra pay OR comp off (Q17) — stored in `holiday_work_requests.compensation_preference`
- All Sundays compensated, no monthly cap (Q20)
- Prior approval required (Q19)

**Models touched**: Same `holiday_work_requests` table from Feature 4 — no additional migration needed.

**API routes**: Same as Feature 4 — `type` field differentiates HOLIDAY vs SUNDAY.

**Service**: Extend `holiday-work-requests` service with Sunday validation (check `dayOfWeek(date) === 0`).

**UI**: Same request form — auto-detects whether selected date is a Sunday or a holiday.

**Migration**: None (covered by Feature 4 migration).

---

### Feature 6 · Overtime Engine
**Questionnaire**: Q1, Q3, Q4, Q5, Q6, Q7, Q8, Q56

**Business rules**:
- Overtime only on approved holiday work (NOT on regular workdays)
- Rate = `daily_rate(CTC_monthly, month)` — 1 day's pay per holiday worked
- Source: manual entry at payroll generation time (Q8); or auto-computed from approved `holiday_work_requests` + attendance
- Cap: nullable field (currently inactive — Q6)
- Shown as separate line on payslip (Q56)

**Models touched**:
- `payrolls` — existing `overtime_amount`, `overtime_days`, `overtime_hours` columns already exist
- No new table needed

**Service**: `computeOvertimeForMonth(orgId, userId, month)` in `server/queries/hr/payroll.ts`
  - Fetches approved `holiday_work_requests` for the month where `compensation_preference = "EXTRA_PAY"`
  - For each: confirms attendance row exists with `is_holiday_work = true` for that date and `work_hours ≥ 8`
  - Returns total days + total amount

**API routes**:
- `GET /api/hr/payrolls/overtime-preview?userId=&month=` — **new** — returns auto-computed OT before payroll generation, HR can override

**Migration**: None (existing payroll columns cover it).

---

### Feature 7 · Comp Off Module
**Questionnaire**: Q11, Q12, Q17, Q22–Q27, Q57

**Business rules**:
- 1 comp off per full day worked on a holiday/Sunday (Q12)
- Prior intimation required (Q23)
- Expires in 1 month from grant date (Q24)
- No payout on expiry (Q25)
- Approved by HR (Q26)
- Tracked separately from regular leave (Q27)
- NOT shown on payslip (Q57)

**Existing gap**: Current `/api/hr/leaves/comp-off` POST just adds to `leave_balances` — no per-grant record, no expiry, no source tracking.

**Models touched**:
- `comp_off_grants` (**new table**):
  ```
  id, org_id, user_id,
  holiday_work_request_id (FK → holiday_work_requests),
  granted_days (decimal, default 1),
  used_days (decimal, default 0),
  expiry_date (date),          -- grant date + 30 days
  status ("ACTIVE"|"EXPIRED"|"FULLY_USED"),
  granted_by (FK → users),
  created_at, updated_at
  ```
  Index: `(user_id, status, expiry_date)`

**API routes**:
- `POST /api/hr/comp-off-grants` — HR grants comp off (after approved holiday work request + valid attendance); writes `comp_off_grants` row; also credits `leave_balances` for "Compensatory Off" leave type
- `GET /api/hr/comp-off-grants` — list grants per user (HR: all; employee: own)
- `POST /api/hr/comp-off-grants/expire` — called by a scheduled job; marks grants past `expiry_date` as EXPIRED; deducts remaining balance from `leave_balances` (no payout)

**Service**: `server/queries/hr/comp-off.ts`
- `grantCompOff(orgId, userId, holidayWorkRequestId, grantedBy)` — creates grant row + credits leave balance
- `expireStaleGrants(orgId)` — finds `status=ACTIVE` grants where `expiry_date < today`, marks EXPIRED, deducts remaining days from `leave_balances`

**Migration**: `0108_comp_off_grants.sql`

---

### Feature 8 · Deductions Engine
**Questionnaire**: Q32–Q36, OPEN-09, OPEN-10

**Business rules**:
- **LOP**: `daily_rate(ctcMonthly, month) × lop_days` (Q33)
- **PT**: ₹200/month flat (Q32, OPEN-10 — confirm slab)
- **Advance recovery**: EMI amount from `salary_loans.emiAmount` for active loans (Q35)
- **Late arrival**: warning only for first 3 occurrences; log it, no deduction (Q34)

**Models touched**:
- `payrolls` — migrate: add `lop_days` decimal, `lop_amount` decimal, `pt_amount` decimal, `advance_recovery_amount` decimal, `special_allowance` decimal. Add unique index on `(org_id, user_id, month)` for idempotency.
- `late_arrival_warnings` (**new table**):
  ```
  id, org_id, user_id, date (date), warning_number (int),
  attendance_id (FK → attendance), noted_by (FK → users, nullable),
  created_at
  ```

**API routes**:
- `POST /api/hr/late-arrival-warnings` — HR logs a late arrival warning for an employee (checks warning_number auto-increments)
- `GET /api/hr/late-arrival-warnings?userId=` — list warnings

**Service**: `server/queries/hr/deductions.ts`
- `computeLOP(ctcMonthly, month, lopDays)` → `daily_rate × lopDays`
- `computePT()` → 200 (or slab when OPEN-10 resolved)
- `getActiveAdvanceRecovery(orgId, userId)` → current month EMI from `salary_loans`
- `recordLateWarning(orgId, userId, date, attendanceId)` — inserts, returns warning number (stops at logging; no deduction regardless of count)

**Migration**: `0109_payroll_line_items_and_warnings.sql`

---

### Feature 9 · Payroll Run — Monthly Cycle
**Questionnaire**: Q5, Q7, Q10, Q14, Q32–Q36, Q53–Q56

**Business rules**:
- Inputs: salary master + attendance + approved holiday work + LOP days + advance recovery EMI
- Computation:
  ```
  Earnings:
    basic_salary    = salary_structures.basic_salary
    hra             = basic_salary × 0.50
    special_allow   = salary_structures.special_allowance
    overtime_amount = sum of approved EXTRA_PAY holiday/sunday work days × daily_rate
    gross_salary    = basic + hra + special_allow + overtime

  Deductions:
    lop_amount           = daily_rate × lop_days
    pt_amount            = 200  (or slab)
    advance_recovery     = salary_loans.emi_amount (active loans)
    total_deductions     = lop + pt + advance_recovery

  net_salary = gross_salary - total_deductions
  ```
- Proration on days worked: if employee joined mid-month → prorate based on days worked (Q14)
- Re-runnable (idempotent): unique constraint on `(org_id, user_id, month)` → upsert pattern
- Payroll status: DRAFT → PENDING_APPROVAL → APPROVED → PAID

**Models touched**:
- `payrolls` — uses new columns from Feature 8 migration; unique constraint enforces idempotency

**API routes**:
- `POST /api/hr/payrolls/generate` — existing; **rewrite internals** to use Feature 6 OT engine + Feature 8 deductions engine; use upsert on unique key; populate all line-item columns
- `GET /api/hr/payrolls/[payrollId]` — return full breakdown including all new line-item columns

**Migration**: None (all columns added in Feature 8 migration).

---

### Feature 10 · Payslip Generation & Delivery
**Questionnaire**: Q53–Q60 | **BLOCKED on OPEN-01, OPEN-07**

**Business rules**:
- PDF with earnings table + deductions table + summary
- Password protected (password rule: **OPEN-01**)
- Auto-emailed to employee on payroll approval/generation (Q58)
- Employee can download from `/hr/my-payslips` (Q59)
- Raw salary NOT in email body — only in password-protected PDF attachment (security rule)

**Models touched**:
- `payrolls` — `payslip_url` column already exists for storing PDF path

**API routes**:
- `GET /api/hr/payrolls/[payrollId]/download` — existing stub; **implement** PDF generation (using `pdf-lib` or `pdfkit`), apply password, store to S3/storage, return signed URL
- `POST /api/hr/payrolls/[payrollId]/email-payslip` — **new** — trigger email with PDF attachment

**Service**: `server/actions/payslip-generator.ts`
- `generatePayslipPDF(payrollId)` — builds PDF, applies password, uploads, updates `payslipUrl`
- `emailPayslip(payrollId)` — fetches employee email, sends via existing email infra with PDF attachment

**Migration**: None.

**Note**: Will be implemented only after OPEN-01 (password rule) is confirmed.

---

### Feature 11 · Salary Revision Workflow
**Questionnaire**: Q43, Q44, Q45, Q46, Q47 | **Partially blocked on OPEN-02/03/04**

**Business rules**:
- Initiated by HR (Q47)
- History always preserved (Q46) — covered by `salary_revision_history` from Feature 1
- Mid-month proration rule: **OPEN-04** (default: new salary from 1st of next month)
- Cadence: **OPEN-02**
- Increment %: **OPEN-03**

**What is buildable now**: The revision workflow (HR selects employee → enters new salary → system saves revision history → marks old structure inactive → creates new active structure)

**What needs OPEN resolution**: Proration logic within a payroll month; revision due-date reminders

**API routes**:
- `POST /api/hr/salary-structures/[userId]/revise` — **new** — HR submits new salary; writes `salary_revision_history`; deactivates current structure; inserts new active structure; audit log
- `GET /api/hr/salary-structures/[userId]/history` — **new** — list revision history

**Migration**: None (tables already created in Feature 1).

---

### Feature 12 · Bonus & Incentives — DEFERRED
Q37–Q42: Performance bonus = No; joining/referral bonus = No; sales incentive = "will discuss" (OPEN-06).
Build only after explicit confirmation.

---

### Feature 13 · Reimbursements — DEFERRED
Q48–Q52: All blank/dash — reimbursements not applicable.
Existing `reimbursements` table in schema is already there for potential future use.

---

## 5 · Migration Sequence

| Migration file | What it does |
|---|---|
| `0104_payroll_foundation.sql` | Fix `salary_structures.hra_percentage` default 40→50; add `special_allowance` decimal; add `professional_tax` decimal default 200; add `created_by` FK; create `salary_revision_history` table |
| `0105_holiday_type_halfday.sql` | Add `type` text and `is_half_day` boolean to `holidays` |
| `0106_attendance_holiday_flags.sql` | Add `is_holiday_work` boolean, `is_sunday_work` boolean, `holiday_id` integer FK to `attendance` |
| `0107_holiday_work_requests.sql` | Create `holiday_work_requests` table with unique `(org_id, user_id, request_date)` |
| `0108_comp_off_grants.sql` | Create `comp_off_grants` table |
| `0109_payroll_line_items_and_warnings.sql` | Add `lop_days`, `lop_amount`, `pt_amount`, `advance_recovery_amount`, `special_allowance` to `payrolls`; add unique index on `(org_id, user_id, month)`; create `late_arrival_warnings` table |

All migrations are reversible (use `DROP COLUMN IF EXISTS`, `DROP TABLE IF EXISTS`, `DROP INDEX IF EXISTS`).

---

## 6 · Permission Matrix

| Action | Employee | Manager | HR / Branch HR | CEO / Admin |
|---|---|---|---|---|
| View own salary structure | ✓ | ✓ | ✓ | ✓ |
| View any employee's salary | ✗ | ✗ | ✓ | ✓ |
| Create/update salary structure | ✗ | ✗ | ✓ | ✓ |
| Submit holiday work request | ✓ | ✓ | ✓ | ✓ |
| Approve holiday work request | ✗ | ✗ | ✓ | ✓ |
| Generate payroll | ✗ | ✗ | ✓ | ✓ |
| Approve payroll | ✗ | ✗ | ✓ | ✓ |
| Download own payslip | ✓ | ✓ | ✓ | ✓ |
| Download any payslip | ✗ | ✗ | ✓ | ✓ |
| Grant comp off | ✗ | ✗ | ✓ | ✓ |
| Log late arrival warning | ✗ | ✗ | ✓ | ✓ |
| Initiate salary revision | ✗ | ✗ | ✓ | ✓ |

---

## 7 · Open Items Summary

| ID | Question | Blocks |
|---|---|---|
| OPEN-01 | Payslip PDF password format | Feature 10 |
| OPEN-02 | Salary revision frequency | Feature 11 (reminders) |
| OPEN-03 | Increment % standard | Feature 11 (UI suggestion) |
| OPEN-04 | Mid-month revision proration | Feature 11 + Feature 9 |
| OPEN-05 | Saturday overtime pay rate | Feature 3 + Feature 6 |
| OPEN-06 | Sales incentive structure | Feature 12 (deferred) |
| OPEN-07 | Payslip PDF layout sample | Feature 10 |
| OPEN-08 | Advance recovery automation | Non-blocking (EMI pattern works) |
| OPEN-09 | PF / ESI / TDS applicability | Feature 8 |
| OPEN-10 | PT slab vs ₹200 flat | Feature 8 |
| OPEN-11 | "Full day" hour threshold for holiday work | Features 4 + 7 |
