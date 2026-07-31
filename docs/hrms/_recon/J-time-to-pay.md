# Lane J — Time-to-Pay Chain Audit
**Scope:** `src/modules/timesheets/**`, `src/modules/expenses/**`, `src/db/schema/timesheets/**`, and the attendance/overtime/LOP services under `src/modules/hr/time/**` as they feed payroll.
**Mode:** READ-ONLY. No edits.

---

## 1. The Time→Pay Chain, End to End

There are **two entirely separate chains** that both produce "payroll inputs":

### Chain A — Timesheets Module (Freelance/Billable-Hours Export)

```
1. RAW CAPTURE
   - Timer start: POST timesheets/timer/start → timerSessions INSERT
     timer.service.ts:155-168 | timerSessions row, status=RUNNING, accumulatedSeconds=0
   - Manual entry: POST timesheets/entries → timesheets INSERT
     entries.service.ts:162-179 | status=PENDING, payrollStatus=UNPROCESSED
   - Timer → entry: POST timesheets/timer/:id/convert
     timer.service.ts:253-299 | calls entries.createEntry() → timesheets INSERT, source=TIMER

2. PERIOD GROUPING (computed incrementally, not on read)
   - getOrCreatePeriod() fired on every entry create/update
     entries-period.service.ts:26-78 | inserts timesheet_periods row for the ISO week
   - recomputePeriodTotals() fired on every create/update/void
     entries-period.service.ts:80-113 | SUM(hours) written back to timesheet_periods

3. SUBMISSION
   - POST timesheets/periods/:periodId/submit → periods.service.ts:251-318
     status=SUBMITTED, approver resolved from project.managerId (periods.service.ts:320-338)

4. APPROVAL (rate resolution stamp)
   - POST timesheets/approvals/:periodId/approve → approvals.service.ts:200-324
     DB transaction:
       a. timesheetPeriods → status=APPROVED, lockAfterApproval stamps lockedAt
       b. timesheets rows → status=APPROVED, approvedAt
       c. rateResolver.resolveMany() → resolves billRate per billable entry
          rate-resolver.service.ts:48-129 | RATE_CARD or PROJECT_MEMBER fallback
       d. timesheets rows → billRate, currency, rateSource stamped

5. PAYROLL SUMMARY (computed on demand, cached SHORT TTL)
   - GET timesheets/payroll/period-summary → payroll-summary.service.ts:107-231
     Reads timesheets + holidays + leaveRequests in one query block
     computeOvertime() + computeLeaveDays() in payroll-calc.ts:13-68
     Output: regularHours, overtimeHours, holidayHours, weekendHours, leaveDays per user
     ⚠ CHAIN BREAK: summary is cached and NOT invalidated when entries are approved
       (only invalidated at export time) → cache can be stale after an approval

6. EXPORT (marks payrollStatus=EXPORTED, immutable record)
   - POST timesheets/payroll/export → payroll-export.service.ts:71-222
     Single db.transaction(..) with SELECT ... FOR UPDATE on eligible entries
     Snapshot written to timesheetExports.snapshot (JSONB)
     timesheets rows → payrollStatus=EXPORTED, payrollExportId stamped
     ⚠ CHAIN TERMINAL: after this step entries cannot be edited or voided
     Output: CSV/XLSX download + timesheetExports row (with ackStatus lifecycle)

CHAIN BREAK: The timesheets payroll export does NOT call the HR payroll engine.
It produces a flat hours table for import into Zoho Payroll / ADP / Gusto / Razorpay.
The HR payroll computation is Chain B (separate system).
```

### Chain B — HR Attendance → Internal Payroll Inputs

```
1. RAW PUNCH CAPTURE
   - POST hr/attendance/check-in → attendance-clock.service.ts:37-170
     Inserts attendance row: checkIn=NOW(), status=PRESENT, locationData
     ⚠ Server wall-clock new Date() used — no timezone context from client except localDate param

2. CHECKOUT / WORKDAYS COMPUTED
   - POST hr/attendance/check-out → attendance-clock.service.ts:172-254
     db.transaction:
       a. SELECT open attendance row FOR UPDATE (prevents double checkout)
       b. Computes sessionWorkHours = (now - checkIn - breakHours)
       c. Updates attendance: checkOut, workHours=sessionWorkHours.toFixed(2), isOvertime flag

3. REGULARIZATION (edits raw punch IN PLACE)
   - POST hr/attendance/regularize → attendance-regularization.service.ts:133-200
     apply() UPDATES the existing attendance row's checkIn/checkOut directly
     NOT an adjustment row — the original fact is overwritten
     After apply: payrollInputs.rebuildOpenPeriodForMonth() called
     attendance-regularization.service.ts:199-214

4. ATTENDANCE SUMMARY (on demand)
   - AttendanceSummaryService.buildAttendanceSummary()
     attendance-summary.service.ts:47-278
     Computes: payableDays, presentDays, absentDays, lateCount, latePenaltyDays,
               overtimeMinutes, weekendWorkDays, holidayWorkDays
     ⚠ Policy rules fetched for userIds[0] only and applied to ALL users
       attendance-summary.service.ts:187-196

5. LEAVE SUMMARY (ledger-based)
   - LeaveLedgerService.buildLeaveSummary() feeds:
     paidLeaveDays, unpaidLeaveDays, halfDayCount (LOP denominator)

6. PAYROLL INPUT SNAPSHOT (HR payroll engine input)
   - PayrollInputsBuildService.buildSnapshots()
     payroll-inputs-build.service.ts:43-403
     Aggregates per employee: employee_master, compensation, attendance,
     leave, overtime (approved overtimeRequests), reimbursement (approved reimbursements
     + benefits claims), deduction (salary loans + scheduled repayments), lifecycle
     Writes to hrPayrollInputSnapshots (DELETE + INSERT in one transaction)
     payroll-inputs-build.service.ts:394-402
     ⚠ Full delete+re-insert means no audit trail of snapshot changes

CHAIN BREAK: Chain B does NOT read from Chain A (timesheets).
LOP is derived from absentDays (workingDays - presentDays - latePenaltyDays)
and unpaidLeaveDays from the leave ledger — not from timesheet hours.
```

---

## 2. Append-Only?

### Raw punches (attendance table)
**NOT append-only.** `attendance-clock.service.ts:242-248` — checkout UPDATES the existing attendance row in place (sets checkOut, workHours, breaks, isOvertime). `attendance-regularization.service.ts:149-163` — regularization approval directly UPDATEs `attendance.checkIn/checkOut`. There is no immutable raw event table.

### Timer sessions (timerSessions table)
**NOT append-only** — each state transition (RUNNING→PAUSED→STOPPED→CONVERTED) UPDATEs `timerSessions` in place. `accumulatedSeconds` is accumulated via UPDATE on each pause/stop. No audit trail of individual state changes.

### Timesheet entries (timesheets table)
**NOT append-only.** Entries in PENDING/REJECTED state can be edited (`entries.service.ts:212-303`). Void stamps `voidedAt` on the row rather than inserting a compensating entry. The status lifecycle (PENDING → APPROVED → EXPORTED) and lock columns prevent edits after approval/export.

### Derived period totals (timesheet_periods)
**Written incrementally, NOT computed on read.** `recomputePeriodTotals()` is called on every create/update/void and writes totalHours/billableHours/nonBillableHours back to the period row. `entries-period.service.ts:80-113`.

### Regularisations
**Adjustment records that edit the raw row.** A `hrAttendanceRegularizations` row captures the request and approval. On apply, it UPDATES `attendance.checkIn/checkOut` directly — not a separate adjustment fact. `attendance-regularization.service.ts:149-169`.

---

## 3. Timesheets vs Payroll Boundary

### `timesheets/payroll.controller.ts` — what it does
```
Path:   /timesheets/payroll/*
Class:  @RequireModule("build") @UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)
```

The `timesheets/payroll` sub-module is a **timesheet-hours export tool for external payroll systems** (Zoho Payroll, ADP, Gusto, Razorpay). It does NOT touch salaries, deductions, or net pay. Its outputs are:

| Endpoint | What it does |
|----------|--------------|
| GET period-summary | Aggregates approved entries into regularHours/overtimeHours/leaveDays per user — a preview |
| POST export | Takes approved UNPROCESSED entries, computes hour buckets, writes snapshot to `timesheetExports`, stamps entries EXPORTED |
| GET exports / GET exports/:id/rows | Lists export records and retrieves snapshot |
| PATCH exports/:id/ack | Marks an export as RECEIVED/ACCEPTED/REJECTED by the external system |
| GET/PATCH settings | payPeriod, overtimeDailyHours, overtimeWeeklyHours, payrollMapping (column/header mapping for external format) |

**Who it "bills":** Nobody. It produces hours data for an external payroll processor to compute gross/net pay. StreamlineOS does not compute the dollar amount of payroll.

**Does it duplicate the payroll module's work?** No. The HR payroll module (`hr/payroll-inputs`) is an entirely separate system that builds structured JSONB snapshots (compensation profile, attendance, leave, overtime, reimbursements, loan deductions, lifecycle status) for an HR payroll engine. `timesheets/payroll` is a simple hours-time export. They share NO code and read from different source tables:
- `timesheets/payroll` reads: `timesheets`, `leaveRequests`, `holidays`
- `hr/payroll-inputs` reads: `attendance`, `hrLeaveLedger`, `overtimeRequests`, `reimbursements`, `salaryLoans`, `employeeSalaryProfiles`, `hrEmployments`

---

## 4. Endpoint Table

### Timesheets Core Module (`@RequireModule("build")` on all)

| Method | Path | File:Line | @RequirePermission | Guards (class+method) | ModuleGuard in @UseGuards | Validation | Paginated? |
|--------|------|-----------|-------------------|----------------------|--------------------------|-----------|-----------|
| GET | /timesheets/entries | entries.controller.ts:39 | timesheets:entries:view | Jwt+Module+Permission | Yes | ZodPipe(entriesQuerySchema) | No |
| POST | /timesheets/entries | entries.controller.ts:48 | timesheets:entries:create | Jwt+Module+Permission | Yes | ZodPipe(createEntrySchema) | No |
| PATCH | /timesheets/entries/:entryId | entries.controller.ts:58 | timesheets:entries:update | Jwt+Module+Permission | Yes | ZodPipe(updateEntrySchema) | No |
| POST | /timesheets/entries/:entryId/void | entries.controller.ts:67 | timesheets:entries:void | Jwt+Module+Permission | Yes | ZodPipe(voidEntrySchema) | No |
| GET | /timesheets/timer/active | timer.controller.ts:34 | timesheets:entries:view | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/timer/start | timer.controller.ts:40 | timesheets:entries:create | Jwt+Module+Permission | Yes | ZodPipe(startTimerSchema) | No |
| POST | /timesheets/timer/:timerId/pause | timer.controller.ts:49 | timesheets:entries:create | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/timer/:timerId/resume | timer.controller.ts:57 | timesheets:entries:create | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/timer/:timerId/stop | timer.controller.ts:68 | timesheets:entries:create | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/timer/:timerId/discard | timer.controller.ts:78 | timesheets:entries:create | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/timer/:timerId/convert | timer.controller.ts:87 | timesheets:entries:create | Jwt+Module+Permission | Yes | ZodPipe(convertTimerSchema) | No |
| GET | /timesheets/periods | periods.controller.ts:29 | timesheets:entries:view | Jwt+Module+Permission | Yes | ZodPipe(periodsQuerySchema) | Soft (limit capped 100) |
| GET | /timesheets/periods/current | periods.controller.ts:38 | timesheets:entries:view | Jwt+Module+Permission | Yes | none | No |
| GET | /timesheets/periods/:periodId | periods.controller.ts:43 | timesheets:entries:view | Jwt+Module+Permission | Yes | ParseIntPipe | No |
| POST | /timesheets/periods/:periodId/submit | periods.controller.ts:52 | timesheets:entries:create | Jwt+Module+Permission | Yes | Idempotent | No |
| POST | /timesheets/periods/:periodId/recall | periods.controller.ts:63 | timesheets:entries:create | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/periods/:periodId/reopen | periods.controller.ts:70 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/periods/:periodId/lock | periods.controller.ts:78 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | none | No |
| POST | /timesheets/periods/:periodId/unlock | periods.controller.ts:86 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | none | No |
| GET | /timesheets/approvals | approvals.controller.ts:39 | timesheets:approvals:view | Jwt+Module+Permission | Yes | ZodPipe(approvalsQuerySchema) | Yes (limit 100) |
| POST | /timesheets/approvals/bulk-approve | approvals.controller.ts:48 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | ZodPipe(bulkApproveSchema)+Idempotent | No |
| POST | /timesheets/approvals/bulk-reject | approvals.controller.ts:57 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | ZodPipe(bulkRejectSchema)+Idempotent | No |
| POST | /timesheets/approvals/:periodId/approve | approvals.controller.ts:70 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | Idempotent | No |
| POST | /timesheets/approvals/:periodId/reject | approvals.controller.ts:79 | timesheets:approvals:manage | Jwt+Module+Permission | Yes | ZodPipe(rejectPeriodSchema)+Idempotent | No |
| GET | /timesheets/billing/* | billing.controller.ts:30+ | timesheets:billing:view/export | Jwt+Module+Permission | Yes | Various | Partial |
| GET | /timesheets/reports/* | reports.controller.ts:18+ | timesheets:reports:view | Jwt+Module+Permission | Yes | Various | No |
| GET/PATCH | /timesheets/settings | settings.controller.ts:13+ | timesheets:settings:view/manage | Jwt+Module+Permission | Yes | ZodPipe | No |
| CRUD | /timesheets/rates/* | rates.controller.ts:29+ | timesheets:rates:* | Jwt+Module+Permission | Yes | ZodPipe | Yes |
| CRUD | /timesheets/budgets/* | budgets.controller.ts:29+ | timesheets:budgets:* | Jwt+Module+Permission | Yes | ZodPipe | Yes |
| GET | /timesheets/audit | audit.controller.ts:13+ | timesheets:audit:view | Jwt+Module+Permission | Yes | ZodPipe | Yes |
| GET | /timesheets/team | team.controller.ts:13+ | timesheets:entries:view | Jwt+Module+Permission | Yes | ZodPipe | Yes |
| GET | /timesheets/exceptions | exceptions.controller.ts:37 | timesheets:exceptions:view | Jwt+Permission (**NO ModuleGuard**) | **NO** | ZodPipe | Yes |
| GET | /timesheets/exceptions/summary | exceptions.controller.ts:46 | timesheets:exceptions:view | Jwt+Permission (**NO ModuleGuard**) | **NO** | none | No |
| POST | /timesheets/exceptions/:id/resolve | exceptions.controller.ts:52 | timesheets:exceptions:manage | Jwt+Permission (**NO ModuleGuard**) | **NO** | ZodPipe | No |
| POST | /timesheets/exceptions/:id/dismiss | exceptions.controller.ts:63 | timesheets:exceptions:manage | Jwt+Permission (**NO ModuleGuard**) | **NO** | ZodPipe | No |
| POST | /timesheets/exceptions/run-detection | exceptions.controller.ts:74 | timesheets:exceptions:manage | Jwt+Permission (**NO ModuleGuard**) | **NO** | none | No |
| GET | /timesheets/payroll/period-summary | payroll.controller.ts:49 | timesheets:payroll:view | Jwt+Module+Permission | Yes | ZodPipe | No |
| POST | /timesheets/payroll/export | payroll.controller.ts:57 | timesheets:payroll:export | Jwt+Module+Permission | Yes | ZodPipe+Idempotent | No |
| GET | /timesheets/payroll/exports | payroll.controller.ts:67 | timesheets:payroll:view | Jwt+Module+Permission | Yes | ZodPipe | Yes |
| PATCH | /timesheets/payroll/exports/:exportId/ack | payroll.controller.ts:77 | timesheets:payroll:export | Jwt+Module+Permission | Yes | ZodPipe | No |
| GET | /timesheets/payroll/exports/:exportId/rows | payroll.controller.ts:86 | timesheets:payroll:view | Jwt+Module+Permission | Yes | ParseIntPipe | No |
| GET | /timesheets/payroll/settings | payroll.controller.ts:96 | timesheets:payroll:view | Jwt+Module+Permission | Yes | none | No |
| PATCH | /timesheets/payroll/settings | payroll.controller.ts:102 | timesheets:payroll:export | Jwt+Module+Permission | Yes | ZodPipe | No |
| POST | /timesheets/ai/* | timesheets-ai.controller.ts:22+ | timesheets:ai:* | Jwt+Module+Permission | Yes | ZodPipe | No |

**Totals:** ~45 endpoints in timesheets scope; all validated with ZodValidationPipe; all permission-gated; 13 of 14 controllers module-gated on `"build"`; ExceptionsController has NO ModuleGuard.

---

## 5. Money + Hours Arithmetic

### Hours columns
Schema: `decimal("hours", { precision: 6, scale: 2 })` in `timesheets` (entries.ts:35)
Schema: `decimal("total_hours", { precision: 8, scale: 2 })` in `timesheet_periods` (periods.ts:21-23)

**All decimal columns return STRING from postgres.js.** Every computation path converts via `parseFloat()`:

| File:Line | Operation |
|-----------|-----------|
| payroll-summary.service.ts:54 | `parseFloat(e.hours)` — iterative sum over period entries |
| payroll-summary.service.ts:63,66 | `parseFloat(e.hours)` — exported/pending hours |
| payroll-summary.service.ts:124-125 | `parseFloat(settings?.overtimeDailyHours ?? "8")` — threshold |
| payroll-export.service.ts:137 | `parseFloat(e.hours)` — per-user otEntries |
| payroll-export.service.ts:142 | `parseFloat(e.hours)` — totalPayableHours accumulation |
| payroll-export.service.ts:53 | `parseFloat(row.totalHours)` — export DTO |
| billing.service.ts:102 | `parseFloat(entry.hours) * resolved.billRate` — billable amount |
| billing.service.ts:247 | `parseFloat(e.hours)` |
| rate-resolver.service.ts:42,63 | `parseFloat(best.billRate)` |
| entries.service.ts:130 | `parseFloat(dailyHours?.total ?? "0")` — daily hours check |
| attendance-clock.service.ts:203,217 | `Number(log.breakHours)`, `/1000/60/60` — float duration |
| attendance-clock.service.ts:245 | `.toFixed(2)` — workHours stored as string of float |
| payroll-inputs-build.service.ts:300 | `parseFloat(r.hours ?? "0")` — overtime hours sum |
| payroll-inputs-build.service.ts:326 | `parseFloat(r.amount ?? "0")` — reimbursement sum |
| payroll-inputs-build.service.ts:340 | `parseFloat(l.emiAmount ?? "0")` — loan EMI sum |

**Money representation:** No integer minor-unit money anywhere in the timesheets flow. Hours are `decimal` strings, bill rates are `decimal` strings, amounts are floated. `round2()` (payroll-calc.ts:3-5: `Math.round(n * 100) / 100`) is consistently applied at the output boundary. For N entries summed iteratively, IEEE 754 drift is possible but small for realistic hours values.

### Rate resolution
`rate-resolver.service.ts:42` — `parseFloat(best.billRate)` converts Drizzle decimal string to float.
`billing.service.ts:102` — `parseFloat(entry.hours) * resolved.billRate` — both floats multiplied.
`billing.service.ts:131` — `round2(parseFloat(r.ratedAmount) + extraAmount)` — rounded at display time only.

---

## 6. Tenant Scoping

All primary query paths are tenant-scoped. Verified:

| Service | Query | Scope check |
|---------|-------|-------------|
| payroll-summary.service.ts:129 | `eq(timesheets.orgId, orgId)` | ✓ |
| payroll-export.service.ts:89 | `eq(timesheets.orgId, orgId)` | ✓ |
| payroll-export.service.ts:264 | `eq(timesheetExports.id, exportId), eq(timesheetExports.orgId, orgId)` | ✓ |
| payroll-export.service.ts:284-288 | Both `exportId` AND `orgId` | ✓ |
| entries-period.service.ts:84-97 | `eq(timesheets.timesheetPeriodId, ...), eq(timesheets.orgId, orgId)` | ✓ |
| approvals.service.ts:205-208 | `eq(timesheetPeriods.id), eq(timesheetPeriods.orgId)` | ✓ |
| periods.service.ts:72 | `eq(timesheetPeriods.id, ...), eq(timesheetPeriods.orgId, orgId)` | ✓ |

**Unscoped inner queries (safe by prior scope):**
- `payroll-export.service.ts:108-113` — `users` fetched by `inArray(users.id, userIdSet)` with no orgId. Safe because `userIdSet` was derived from `eligible` entries already scoped to `orgId`. No cross-tenant leak.
- `payroll-summary.service.ts:165-173` — `leaveRequests` where clause includes `eq(leaveRequests.orgId, orgId)`. ✓

**Attendance queries:**
- `attendance-clock.service.ts:97-128` — transaction uses `eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)`. ✓
- `attendance-summary.service.ts:83-99` — `eq(attendance.orgId, orgId), inArray(attendance.userId, userIds)`. ✓

No unscoped leaks found in the chain.

---

## 7. Transactions & N+1

### Missing atomicity (split writes)

| SEV | File:Line | Description |
|-----|-----------|-------------|
| HIGH | timer.service.ts:271 + timer.service.ts:282 | `createEntry()` opens its own internal transaction (entries.service.ts:152). Then a SECOND separate transaction at timer.service.ts:282 marks the timer CONVERTED. If the server crashes between these two steps the entry exists but the timer remains OPEN — allowing double-conversion |
| MED | attendance-regularization.service.ts:96-101 | workflowEngine.startWorkflow() runs AFTER the regularization INSERT returns. The workflow ID is stored by a second UPDATE. workflowEngine failure leaves regularization with no workflow link |

### Correct transactions

| File:Line | Pattern |
|-----------|---------|
| payroll-export.service.ts:87-197 | Full export in one db.transaction with FOR UPDATE locking |
| approvals.service.ts:224-323 | Single transaction: period update + entry bulk update + rate stamping + audit |
| entries.service.ts:152-207 | Single transaction: INSERT entry + syncTicketTimeSpent + recomputePeriodTotals + audit |
| attendance-clock.service.ts:96-150 | Single transaction: SELECT FOR UPDATE + INSERT |
| attendance-clock.service.ts:182-254 | Single transaction: SELECT FOR UPDATE + UPDATE checkout |
| payroll-inputs-build.service.ts:394-402 | Single transaction: DELETE old snapshots + INSERT new |

### N+1 patterns

| File:Line | Pattern | Risk |
|-----------|---------|------|
| approvals.service.ts:298-313 | `for (const group of rateGroups.values()) { await tx.update(...) }` — one UPDATE per unique rate group inside transaction | Low (bounded by distinct rate combos) |
| approvals.service.ts:442-461 | `bulkApprove`: for each periodId calls `approveSinglePeriod()` which opens a full transaction | Medium: N × (SELECT + 3 UPDATE + N_rate_groups + audit_insert) sequential roundtrips |
| payroll-inputs-build.service.ts:76-157 | All 9 aggregate queries fired with Promise.all — correct, no N+1 | ✓ |

---

## 8. Date / Timezone

### Where server wall-clock `new Date()` drives date boundaries

| File:Line | Usage | Risk |
|-----------|-------|------|
| entries.service.ts:79 | `formatDateOnly(new Date())` → "today" for future/backdate checks | formatDateOnly uses local getFullYear/getMonth/getDate — server-timezone-sensitive |
| period.helpers.ts:14-19 | `weekRange(new Date(), workWeekStart)` — uses d.getDay() (local) | Server timezone shifts which week a date falls into |
| entries-period.service.ts:33 | `weekRange(new Date(date + "T12:00:00"), workWeekStart)` | Midday hack minimises day-boundary shift but still uses local getDay() |
| timer.service.ts:27 | `Date.now() - session.lastResumedAt.getTime()` — elapsed time in ms | Safe: both UTC timestamps, no date boundary |
| timer.service.ts:269 | `formatDateOnly(new Date())` — default date for timer→entry conversion | Server-local date; user converting timer at local midnight could get wrong day |
| attendance-clock.service.ts:37-38 | `body.localDate ?? getTodayString()` — client-supplied date used for checkIn | Good: client sends local date |
| attendance-clock.service.ts:172 | `localDate ?? getTodayString()` for checkOut | Same — getTodayString() is server-local fallback |
| attendance-summary.service.ts:245 | `new Date(row.date + "T00:00:00Z")` — parses attendance date as UTC | ✓ consistent since attendance.date is `date` type (no time part) |
| payroll-calc.ts:30 | `new Date(date + "T00:00:00Z")` — isWeekend uses UTC | ✓ consistent |
| payroll-calc.ts:37 | `new Date(date + "T00:00:00Z")` — isoWeekMonday uses UTC | ✓ consistent but period boundaries are computed local (period.helpers.ts) → mismatch |

### Date stored in wrong column type
Schema does not show obvious timestamp vs date misuse: `date` columns used for date-only values throughout (`timesheets.date`, `timesheet_periods.periodStart/End`, `attendance.date`). Timer columns (`startedAt`, `lastResumedAt`) are correctly `timestamp`.

### LOP day cut-offs
`computeLeaveDays()` in payroll-calc.ts:13-27: uses `new Date(end/start).getTime()` on ISO date strings. No `T00:00:00` suffix — `new Date("2026-07-31")` is parsed as UTC midnight by JS, which is correct for date-only values. Consistent with rest of payroll-calc.ts.

### Attendance late-arrival check
`attendance-summary.service.ts:227-228`:
```ts
const ci = new Date(row.checkIn);  // checkIn is a full timestamp
const ciMinutes = ci.getUTCHours() * 60 + ci.getUTCMinutes();
```
Shift start is in local HH:MM format (e.g. "09:00"), parsed as:
`const [h, m] = shiftDef.startTime.split(":")` → `shiftStartMinutes = h*60+m`
This treats shiftStartTime as bare minutes with no timezone.
`ci.getUTCHours()` gives UTC time, but shift start is interpreted as local time → **off-by-TZ offset hours** when server is not in the employee's timezone. A 09:00 local shift in UTC+5:30 would have `ciMinutes` = UTC hours = 3*60+30=210, not 540. Shift looks as if it starts at 03:30 UTC → every employee is late.

---

## 9. Top Findings

| # | SEV | File:Line | Finding |
|---|-----|-----------|---------|
| 1 | HIGH | exceptions.controller.ts:29-30 | ExceptionsController has NO `@RequireModule` and NO `ModuleGuard` — module not gated. Any org member with `timesheets:exceptions:*` permission can access regardless of module enablement |
| 2 | HIGH | timer.service.ts:271 + 282 | Split-write atomicity: `createEntry()` (own tx) + timer CONVERTED mark (second tx). Crash between them leaves entry in DB + timer still OPEN → double-conversion possible |
| 3 | HIGH | attendance-summary.service.ts:187-196 | orgAttendanceRules and orgOvertimeRules fetched for `userIds[0]` only and applied to ALL employees in the batch. Every user after the first gets the first user's policy for late-count, overtime, and penalty calculations |
| 4 | HIGH | attendance-summary.service.ts:225-228 | Late-arrival check: `ci.getUTCHours()` vs shift startTime (local HH:MM) — UTC vs local mismatch. All late-count metrics and latePenaltyDays in payroll inputs are wrong whenever server timezone ≠ employee timezone |
| 5 | MED | ALL timesheets controllers (14 controllers) | `@RequireModule("build")` on every controller. Timesheets is gated on Build module enablement. Org with Timesheets enabled but Build disabled = 403 for all non-owners. Known from memory as intentional ride-on-Build but never formally decided |
| 6 | MED | payroll-summary.service.ts:109-110 | Payroll summary cached at SHORT TTL (CACHE_KEYS.payrollSummary). Approval of individual periods (`approveSinglePeriod`) does NOT invalidate this cache. Between approval and export, the summary can show stale pending/unprocessed counts |
| 7 | MED | attendance-regularization.service.ts:149-169 | Regularization applies by editing raw `attendance.checkIn/checkOut` in place. The original punch fact is destroyed with no compensating row or audit of the pre-edit value. Only the `hrAttendanceRegularizations` row documents what was requested |
| 8 | MED | payroll-inputs-build.service.ts:394-402 | Snapshot rebuild is DELETE+INSERT in a transaction — no version history. Every rebuild discards the prior snapshot. No audit trail of why a snapshot changed between payroll runs |
| 9 | MED | approvals.service.ts:442-461 | `bulkApprove` loops with `await approveSinglePeriod()` — N sequential transactions. Each includes rate resolution. For 50 periods this is O(50) DB roundtrips with no batching |
| 10 | MED | period.helpers.ts:14-19 + payroll-calc.ts:30 | Week boundaries for period grouping use server local time (getDay()); weekend/holiday classification uses UTC (getUTCDay()). These two interpretations diverge by timezone offset. An entry logged at Sunday 11pm local in UTC+5:30 is Saturday 5:30pm UTC → classified as Saturday, not Sunday |
| 11 | LOW | timer.service.ts:269 | Timer→entry default date uses `formatDateOnly(new Date())` (server local). A user converting at local midnight in a timezone ahead of server gets previous day as entry date |
| 12 | LOW | payroll-summary.service.ts:196-208 | `pendingApprovalCount` computed by filtering `entries` in-memory using a second scan after buildRows() already iterated. O(n²) over entries array for the "pending approvals" exception list |
| 13 | LOW | payroll-export.service.ts:108-113 | `users` fetched inside the export transaction with `inArray(users.id, [...userIdSet])`. No `limit` guard. For orgs with many members this is unbounded but bounded by the eligible entry set |
| 14 | INFO | Chain A ↔ Chain B | Timesheets hours export (Chain A) and HR payroll inputs (Chain B) are completely separate. An org could approve 40h in timesheets but HR payroll inputs shows 0 payableDays (if employee never punched attendance). Payroll engine would see inconsistent data if both chains are active |
| 15 | INFO | payroll-inputs-build.service.ts:258-266 | Employee with no salary profile gets `annualCtc: null, currency: "INR"` default. Silent fallback — no warning to the payroll operator |

---

## Coverage Gaps

- **Expenses → Payroll link:** Approved `reimbursements` are pulled into `payroll-inputs-build.service.ts:96-107` during snapshot builds but the `expenses.service.ts` approval flow (`ExpensesService`) does NOT trigger a payroll input rebuild. The link is "pull at period close", meaning reimbursements approved after the last snapshot build are silently excluded.
- **Biometric device feed:** `biometric.service.ts` exists in `hr/time/` but was not in direct scope. It may produce attendance events; its relationship to the raw `attendance` table was not fully traced.
- **FX conversion:** `fx.service.ts` and `lib/fx-convert.ts` exist for multi-currency billing. Their interaction with the payroll export (which outputs plain hours, not amounts) was not found to be wired in — `payrollMapping` in the export has no currency conversion. Not a bug in the pay chain but noted.
- **AI controller:** `timesheets-ai.controller.ts` with `@RequireModule("build")` not fully audited for its payroll relevance.
