# Recon Lane D — Payroll Engine Audit
> Phase-1 READ-ONLY inventory. Date: 2026-07-31. Auditor: Lane D subagent.

---

## 0. File Inventory

```
backend/src/modules/payroll/
  Total .ts files:  170
  Spec files:        37

Sub-folders:
  __tests__/            (6 spec files — top-level module tests)
  entities/             (3 files — legal entity + period management)
  filings/              (4 files + 2 specs — statutory compliance filings)
  insights/             (21 files + 8 specs + 3 lib specs — analytics, ESS, FnF, journal, calendar, AI)
  jobs/                 (3 files + 1 spec — generation job controller/worker)
  lib/                  (1 file — org-membership helper)
  payout/               (9 files + 1 e2e-spec + 3 lib files + 3 lib specs — approvals, locking, bank batches, publishing, payslips)
  runs/                 (10 files + 1 e2e-spec + 8 lib files + 11 lib specs — run lifecycle, calc engine, statutory)
  setup/                (8 files + 1 e2e-spec + 3 lib files + 7 template-seed files — payroll setup, policies, templates)
  Root:                 payroll.module.ts, payroll.types.ts, payroll-posting.service.ts,
                        payroll-scope.ts, run-lock.service.ts, command-receipts.service.ts
```

---

## 1. Module Map

| File | LOC | Responsibility |
|------|-----|----------------|
| `runs/runs.service.ts` | 601 | Run CRUD, employee list, hold, adjustment, variance |
| `runs/generate.service.ts` | 680 | Orchestrates per-employee calc + batch DB upsert |
| `runs/generate-pipeline.service.ts` | 682 | Loads all batch data; runs calc engine per employee |
| `runs/lib/calculation-engine.ts` | 437 | Core per-employee snapshot computation |
| `runs/lib/statutory.ts` | 489 | PF/ESI/PT/LWF/gratuity calc (India + pack dispatch) |
| `runs/lib/statutory-packs.ts` | 412 | Non-India pack definitions |
| `runs/lib/statutory-registry.ts` | 363 | Versioned India statutory bundles (IN-2025.04, IN-2026.04) |
| `payout/payout-batches.service.ts` | 721 | Bank batch generation, mark-paid/failed, bank-return CSV |
| `payout/publishing.service.ts` | 500 | Payslip PDF generation + portal/email publish |
| `payout/approvals.service.ts` | 518 | Multi-stage approval workflow + maker-checker |
| `insights/ess.service.ts` | 624 | Employee self-service payroll/tax/bank/loan APIs |
| `insights/payroll-ai-explain.service.ts` | ~120 | AI payslip explanation endpoint |
| `payout/locking.service.ts` | 250 | Lock / reopen / close run |
| `run-lock.service.ts` | 89 | Per-run generation advisory lock (DB-backed) |
| `payroll-posting.service.ts` | 95 | Finance journal posting on lock + paid events |
| `command-receipts.service.ts` | ~150 | Idempotency-key command receipts |

**Files >300 LOC (requiring review):**
`runs.service.ts` (601), `generate.service.ts` (680), `generate-pipeline.service.ts` (682),
`payout-batches.service.ts` (721), `payout/approvals.service.ts` (518), `payout/publishing.service.ts` (500),
`insights/ess.service.ts` (624), `runs/lib/statutory.ts` (489), `runs/lib/statutory-packs.ts` (412),
`runs/lib/statutory-registry.ts` (363), `runs/lib/calculation-engine.ts` (437).

---

## 2. Endpoint Table

> **Prior audit claim REFUTED: ALL payroll controllers carry `@RequireModule("payroll")`.**
> Every controller was verified to have class-level `@RequireModule("payroll")` + `ModuleGuard` in `@UseGuards`.
> Calendar and FnF use `@UseGuards(JwtAuthGuard, ModuleGuard)` at class level with method-level
> `@UseGuards(PermissionGuard)` per handler — the PermissionGuard accumulates, not replaces. Not a gap.

| Method | Path | File:Line | @RequirePermission | Guards | @RequireModule | ModuleGuard in UseGuards | Validation | Paginated |
|--------|------|-----------|-------------------|--------|---------------|--------------------------|------------|-----------|
| POST | /payroll/runs | runs.controller.ts:53 | payroll:runs:create | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| GET | /payroll/runs | runs.controller.ts:112 | payroll:runs:view | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | ✓ |
| GET | /payroll/runs/:runId | runs.controller.ts:121 | payroll:runs:view | JWT+Module+Permission | ✓ | ✓ | ParseIntPipe | — |
| POST | /payroll/runs/:runId/generate | runs.controller.ts:133 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/runs/:runId/recalculate | runs.controller.ts:144 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| GET | /payroll/runs/:runId/employees | runs.controller.ts:201 | payroll:runs:view | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | ✓ |
| GET | /payroll/runs/:runId/employees/:id | runs.controller.ts:214 | payroll:runs:view | JWT+Module+Permission | ✓ | ✓ | ParseIntPipe | — |
| POST | /payroll/runs/:runId/employees/:id/adjustments | runs.controller.ts:227 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| POST | /payroll/runs/:runId/employees/:id/hold | runs.controller.ts:244 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| GET | /payroll/runs/:runId/variance | runs.controller.ts:264 | payroll:runs:view | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/runs/:runId/inputs/:inputId | inputs.controller.ts:50 | payroll:runs:update | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| POST | /payroll/runs/:runId/inputs/reimport | inputs.controller.ts:68 | payroll:runs:update | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/runs/:runId/submit-approval | approvals.controller.ts:41 | payroll:runs:update | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/runs/:runId/approvals/:id/approve | approvals.controller.ts:81 | payroll:runs:approve | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| POST | /payroll/runs/:runId/approvals/:id/reject | approvals.controller.ts:114 | payroll:runs:approve | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| POST | /payroll/payout/runs/:runId/lock | locking.controller.ts:35 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/payout/runs/:runId/reopen | locking.controller.ts:48 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | ZodValidationPipe | — |
| POST | /payroll/payout/runs/:runId/close | locking.controller.ts:67 | payroll:runs:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/payout/runs/:runId/batches | payout-batches.controller.ts:49 | payroll:bank:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/payout/runs/:runId/publish | publishing.controller.ts:31 | payroll:payslips:manage | JWT+Module+Permission | ✓ | ✓ | — | — |
| POST | /payroll/fnf/:settlementId/approve | fnf.controller.ts:49 | payroll:fnf:manage | JWT+Module+method-PermGuard | ✓ | class+method | ZodValidationPipe | — |
| GET | /payroll/calendar | calendar.controller.ts:37 | payroll:runs:view | JWT+Module+method-PermGuard | ✓ | class+method | — | — |
| *(+ ~60 more endpoints across filings/insights/setup/ess/jobs)* |

**Totals:** ~90 endpoints across ~20 controllers. All have `@RequireModule("payroll")`. All guarded endpoints have a `@RequirePermission`. No unguarded mutations found.

---

## 3. Run Lifecycle — Status Machine

Source: `payroll.types.ts:319-343`

```
PREPARING ─────────────→ DRAFT
DRAFT ──────────────────→ PREVIEW_READY | EXCEPTIONS_FOUND
PREVIEW_READY ──────────→ PENDING_APPROVAL | DRAFT | EXCEPTIONS_FOUND
EXCEPTIONS_FOUND ───────→ PREVIEW_READY | DRAFT | PENDING_APPROVAL
PENDING_APPROVAL ───────→ APPROVED | LOCKED | PREVIEW_READY
APPROVED ───────────────→ LOCKED
LOCKED ─────────────────→ PAID | REOPENED
PAID ───────────────────→ PAYSLIPS_PUBLISHED
PAYSLIPS_PUBLISHED ─────→ CLOSED
CLOSED ─────────────────→ (terminal)
REOPENED ───────────────→ DRAFT
```

Locked statuses (write-blocked): `APPROVED | LOCKED | PAID | PAYSLIPS_PUBLISHED | CLOSED`
(`payroll.types.ts:337-343`)

### Status Transition Code Paths

| From → To | File:Line | Permission key | Note |
|-----------|-----------|----------------|------|
| PREPARING → DRAFT | generate.service.ts (implicit) | payroll:runs:manage | Created as PREPARING; generate sets DRAFT/PREVIEW_READY |
| DRAFT/PREVIEW_READY → PREVIEW_READY/EXCEPTIONS_FOUND | generate.service.ts:383 | payroll:runs:manage | Post-calc status set |
| PREVIEW_READY → PENDING_APPROVAL | approvals.service.ts:133 | payroll:runs:update | submitApproval |
| PENDING_APPROVAL → APPROVED | approvals.service.ts:86, 320 | payroll:runs:approve | auto-approve or last stage |
| PENDING_APPROVAL → LOCKED | approvals.service.ts:302 | payroll:runs:approve | last stage + lockAfterApproval=true |
| PENDING_APPROVAL → PREVIEW_READY | approvals.service.ts:492 | payroll:runs:approve | rejectStage |
| APPROVED → LOCKED | locking.service.ts:68 | payroll:runs:manage | explicit lock call |
| LOCKED → PAID | payout-run-completion.ts:156 | payroll:bank:manage (initiates item-paid) | auto on all items terminal |
| LOCKED → REOPENED | locking.service.ts:185 | payroll:runs:manage | explicit reopen |
| PAID → PAYSLIPS_PUBLISHED | publishing.service.ts:292 | payroll:payslips:manage | auto when all published |
| PAYSLIPS_PUBLISHED → CLOSED | locking.service.ts:227 | payroll:runs:manage | explicit close |
| REOPENED → DRAFT | generate.service.ts (next generate) | payroll:runs:manage | generate after reopen |

---

## 4. Immutability of Approved/Locked Runs — FULL WRITE PATH AUDIT

This is the single most important deliverable. Every write path to `payrollRuns`, `payrollRunEmployees`, `payrollLineItems`, `payrollBankBatches`, `payrollBankBatchItems`, and `payrollTdsYtdLedger` is enumerated below.

### 4a. payrollRuns updates

| Method | File:Line | Lock guard | orgId on UPDATE WHERE | Verdict |
|--------|-----------|------------|----------------------|---------|
| generateRun | generate.service.ts:61 | ✓ PAYROLL_LOCKED_STATUSES check | ✓ and(runId, orgId) | SAFE |
| createRun INSERT | runs.service.ts:248 | n/a (new row) | n/a | SAFE |
| submitApproval (auto-approve) | approvals.service.ts:84-88 | ✓ status check (PREVIEW_READY/EXCEPTIONS_FOUND only) | ✗ `.where(eq(payrollRuns.id, runId))` | **MISSING orgId on UPDATE** |
| submitApproval (manual chain) | approvals.service.ts:132-135 | ✓ status check | ✗ `.where(eq(payrollRuns.id, runId))` | **MISSING orgId on UPDATE** |
| approveStage → LOCKED | approvals.service.ts:302-310 | ✓ PENDING_APPROVAL check | ✓ and(runId, orgId) | SAFE |
| approveStage → APPROVED | approvals.service.ts:320-323 | ✓ PENDING_APPROVAL check | ✓ and(runId, orgId) | SAFE |
| rejectStage | approvals.service.ts:492 | ✓ PENDING only check | ✓ and(runId, orgId) | SAFE |
| lock | locking.service.ts:68 | ✓ canTransitionRun(LOCKED) | ✗ `.where(eq(payrollRuns.id, runId))` | **MISSING orgId on UPDATE** |
| reopen | locking.service.ts:185 | ✓ canTransitionRun(REOPENED) — only LOCKED allowed | ✓ and(runId, orgId) | SAFE |
| close | locking.service.ts:227 | ✓ canTransitionRun(CLOSED) — only PAYSLIPS_PUBLISHED | ✓ and(runId, orgId) | SAFE |
| checkRunCompletion | payout-run-completion.ts:155-158 | ✓ skips PAID/PAYSLIPS_PUBLISHED/CLOSED | ✓ and(runId, orgId) | SAFE |
| publish → PAYSLIPS_PUBLISHED | publishing.service.ts:292 | ✓ requires PAID | ✓ where(runId) (in tx, prior findFirst scoped by orgId) | SAFE* |
| run-lock acquire | run-lock.service.ts:23 | Lock TTL guard only — conditional on nullable token | ✓ and(runId, orgId) | SAFE |
| run-lock release | run-lock.service.ts:51 | Token match | ✓ and(runId, orgId) | SAFE |
| exceptions.service resolvable | runs/exceptions.service.ts:154 | Status check before resolve | varies | SAFE |
| generate.service post-lock totals | generate.service.ts:386 | ✓ locked status blocks entry | ✓ and(runId, orgId) | SAFE |

**FINDING: Three UPDATE statements on `payrollRuns` are missing `orgId` in the WHERE clause:**
- `approvals.service.ts:86` (auto-approve path)
- `approvals.service.ts:133` (submit-to-pending path)
- `locking.service.ts:68` (explicit lock)

In all three cases, the prior `findFirst` validated org ownership, so no cross-tenant mutation is possible during normal operation. However, this is a defense-in-depth gap (TOCTOU window between check and write in the same service call; no DB-level org isolation on the write itself).

### 4b. payrollRunEmployees updates

| Method | File:Line | Lock guard | Verdict |
|--------|-----------|------------|---------|
| generate bulk upsert (INSERT ON CONFLICT UPDATE) | generate.service.ts:223-247 | ✓ PAYROLL_LOCKED_STATUSES blocks entry | SAFE |
| addRunAdjustment (UPDATE gross/net/deductions) | runs.service.ts:86,129-134 | ✓ PAYROLL_LOCKED_STATUSES.includes check at :86 | SAFE |
| **setEmployeeHold (UPDATE holdReason)** | **runs.service.ts:56-58** | **✗ NO STATUS CHECK** | **BUG — MUTABLE ON LOCKED RUN** |
| checkRunCompletion (UPDATE status→PAID on paidUserIds) | payout-run-completion.ts:162-171 | ✓ run already in LOCKED state (prerequisite) | SAFE |
| generate-pipeline single-employee update | generate-pipeline.service.ts:580 | Inside generateRun (lock protected) | SAFE |

**FINDING P1: `setEmployeeHold` (`runs.service.ts:35-70`) has NO run-status guard.**
The method checks only that the `runEmployeeId` exists in the org. It then executes `UPDATE payrollRunEmployees SET holdReason = ... WHERE id = ? AND orgId = ?` on ANY run regardless of status (APPROVED, LOCKED, PAID, CLOSED).

Consequence: A user with `payroll:runs:manage` can mark an employee as held or un-held after the run is locked. For LOCKED runs, this can affect whether a new `createBatch` call includes that employee. `createBatch` only runs on APPROVED/LOCKED, so the risk window closes after PAID — but the integrity of the locked payroll record is still breached.

### 4c. payrollLineItems

| Method | File:Line | Lock guard | Verdict |
|--------|-----------|------------|---------|
| DELETE all lines for emp (in generate) | generate.service.ts:256 | ✓ locked status blocks generateRun | SAFE |
| DELETE single emp lines (in pipeline) | generate-pipeline.service.ts:633 | Inside generateRun (lock protected) | SAFE |
| INSERT via addRunAdjustment | runs.service.ts:106-118 | ✓ PAYROLL_LOCKED_STATUSES checked at :86 | SAFE |

### 4d. payrollTdsYtdLedger

| Method | File:Line | Lock guard | Verdict |
|--------|-----------|------------|---------|
| writeTdsYtdLedger INSERT ON CONFLICT UPDATE | locking.service.ts:109-165 | Called only from `lock()`, which has canTransitionRun guard | SAFE |

Note: upsert target is `(orgId, userId, fiscalYear, periodKey)` — idempotent, safe to retry.

### 4e. Payslip Publications

| Method | File:Line | Lock guard | Verdict |
|--------|-----------|------------|---------|
| publish INSERT ON CONFLICT UPDATE | publishing.service.ts:200-232 | ✓ requires run.status === "PAID" | SAFE |
| retryFailed | publishing.service.ts:348+ | Requires PUBLISHED or FAILED publication status | SAFE |

---

## 5. Segregation of Duties

| Operation | Permission key | File:Line |
|-----------|---------------|-----------|
| Create run | payroll:runs:create | runs.controller.ts:55 |
| Generate / Recalculate | payroll:runs:manage | runs.controller.ts:133,144 |
| Submit for approval | payroll:runs:update | approvals.controller.ts:41 |
| Approve / Reject stage | payroll:runs:approve (and per-stage `requiredPermission` from policy) | approvals.controller.ts:81,114 |
| Lock | payroll:runs:manage | locking.controller.ts:35 |
| Generate bank batch | payroll:bank:manage | payout-batches.controller.ts:49 |
| Mark item paid | payroll:bank:manage | payout-batches.controller.ts:105 |
| Publish payslips | payroll:payslips:manage | publishing.controller.ts:31 |

**Maker-checker: submitter ≠ approver is enforced.**
`approvals.service.ts:264-276` checks that `submittedEvent?.actorId !== userId` before allowing `approveStage` or `rejectStage`. Throws `ForbiddenException("Maker-checker violation: the submitter cannot approve their own payroll run")`.

**FINDING: No check that approver ≠ generator (calculator).**
Only the SUBMISSION actor is checked against the approver. A user who runs `generate` and then submits a different user's name as submitter, or who holds both `payroll:runs:manage` and `payroll:runs:approve` permissions (e.g. an owner), can calculate AND approve the same run. This is an intentional trade-off (owners bypass all checks) but no audit note exists.

---

## 6. Determinism & Idempotency

### Ambient calls in the calculation path

| Call | File:Line | In financial calc? | Impact |
|------|-----------|-------------------|--------|
| `new Date().toISOString()` | calculation-engine.ts:419 | YES — in snapshot | `computedAt` metadata field; does not affect any monetary value. Non-deterministic but not a bug. |
| `new Date(year!, mon!, 0).getDate()` | generate-pipeline.service.ts:108-109 | YES — determines `daysInMonth` | Deterministic from the `month` string. SAFE. |
| `new Date(Date.now() - LOCK_TTL_MS)` | run-lock.service.ts:20, 67 | NO — lock TTL | SAFE. |
| `randomUUID()` | run-lock.service.ts:3 | NO — lock token | SAFE. |
| `new Date()` | generate.service.ts:360 | NO — marks reimbursements.paidAt | SAFE. |
| `new Date()` | generate.service.ts:514 | NO — event timestamp | SAFE. |

### What is snapshotted (reproducible from stored inputs)

- `policyVersionId` is stamped on the run at creation and on the snapshot.
- `statutoryRuleVersion` (e.g. `"IN-2026.04"`) is stamped on the run at creation — the bundle is month-keyed via `getIndiaBundleForMonth(month)`, NOT time-keyed at calc time. The calculation will read the SAME bundle regardless of when `generateRun` is called.
- `calculationSnapshot` (JSON) stored per employee in `payrollRunEmployees` — full line-by-line breakdown.
- `inputsSnapshot` (JSON) stored per employee — attendance/LOP/OT inputs used.

**Verdict: Financially deterministic.** Given the same `policyVersionId`, `statutoryRuleVersion`, and stored `inputsSnapshot`, re-running the calc engine produces identical monetary output. The `computedAt` field in the snapshot is metadata-only and does not affect monetary values.

Replay test exists: `runs/lib/__tests__/snapshot-replay.spec.ts` with golden-file fixture `fixtures/replay-expected.json`.

---

## 7. Money Arithmetic — Float/Integer Split

### `money.ts` helpers (ground truth)

```typescript
// money.ts:6-8
export function toPaise(s: string): number {
  return Math.round(parseFloat(s) * 100);  // parseFloat only at boundary; Math.round ensures integer
}

// money.ts:10-12
export function fromPaise(n: number): string {
  return (n / 100).toFixed(2);  // integer paise → string
}

// money.ts:26-28
export function pctOf(basePaise: number, percentStr: string): number {
  return Math.round(basePaise * parseFloat(percentStr) / 100);  // integer result
}
```

### Per-employee calculation — INTEGER PAISE (correct)

All arithmetic in `calculation-engine.ts`, `calc-earnings-phase.ts`, and `statutory.ts` uses integer paise throughout:
- `pctOf()` → integer
- `applyRounding()` → integer
- Intermediate totals are paise integers
- Lines and snapshot totals written via `fromPaise()` → string

### Run-level totals — FLOAT ACCUMULATOR (BUG CONFIRMED)

`generate.service.ts:191-194`:
```typescript
grossTotal += parseFloat(snapshot.totals.gross);   // float
deductionTotal += parseFloat(snapshot.totals.deductions);
employerCostTotal += parseFloat(snapshot.totals.employerContributions);
netTotal += parseFloat(snapshot.totals.net);
```
Then at :389-392: `grossTotal.toFixed(2)` is stored in `payrollRuns`.

**IEEE-754 floating-point drift accumulates across employees.** For a run with 200 employees each earning fractional-paise amounts (e.g. ₹37,333.33), the stored `netTotal` in `payrollRuns` may differ from the sum of individual `payrollRunEmployees.net` strings by ±1 paisa.

The per-employee figures ARE correct (integer paise). Only the aggregate run totals are float-accumulated.

### Payroll posting — FLOAT (BUG CONFIRMED)

`payroll-posting.service.ts:21-29`:
```typescript
const grossNum = parseFloat(gross ?? "0");
const deductionsNum = parseFloat(deductions ?? "0");
const netNum = parseFloat(net ?? "0");
const employerCostNum = parseFloat(employerCost ?? "0");
const totalExpense = (grossNum + employerCostNum).toFixed(4);
```
Journal entries use floats with `toFixed(4)`. These feed into the double-entry accounting system. The `gross` and `net` passed in come from `payrollRuns.grossTotal` and `payrollRuns.netTotal` — already float-accumulated.

### Bank file and batch total — FLOAT

`payout-csv.ts:35`: `const amt = parseFloat(amount).toFixed(2)` — bank file amounts are float-formatted.

`payout-batches.service.ts:203`: 
```typescript
const totalAmount = itemsData.reduce((s, i) => s + parseFloat(i.amount), 0).toFixed(2);
```
Batch total is a float reduction.

### Prior audit claim verdict: CONFIRMED

> "calc engine uses integer paise, but run totals + bank files go through parseFloat/toFixed(2)"
> "`payroll-posting.service.ts` uses float math not paise"

Both claims are confirmed with exact file:line evidence above.

---

## 8. Rounding

Source: `money.ts:14-24`

```typescript
export function applyRounding(paise: number, cfg: RoundingConfig): number {
  const rupees = paise / 100;
  if (cfg.precision === 0) {
    if (cfg.mode === "NEAREST") return Math.round(rupees) * 100;
    if (cfg.mode === "UP") return Math.ceil(rupees) * 100;
    return Math.floor(rupees) * 100;
  }
  if (cfg.mode === "NEAREST") return Math.round(paise);
  if (cfg.mode === "UP") return Math.ceil(paise);
  return Math.floor(paise);
}
```

- **Precision 0** = round to whole rupee. **Precision 2** = round to paise (default).
- **Mode** = NEAREST / UP / DOWN.
- Config comes from `PayrollPolicyConfig.rounding` stored in policy version JSON — **policy-configurable**, not hardcoded.
- **No residual redistribution.** If PF rounds down and PT rounds up, the component sums may not perfectly balance to net due to rounding across 8+ statutory components. No "largest-remainder" or redistribution logic exists.

---

## 9. Statutory Logic

### Hardcoded literals in `statutory-registry.ts`

All statutory values are in versioned `IndiaStatutoryBundle` structs (`IN_STATUTORY_2025_04` and `IN_STATUTORY_2026_04`). These are literal constants compiled into the binary.

| Item | Literal | File:Line |
|------|---------|-----------|
| PF employee % | `"12"` | statutory-registry.ts:107 |
| PF employer % | `"12"` | statutory-registry.ts:108 |
| PF monthly wage ceiling | `"15000.00"` | statutory-registry.ts:109 |
| ESI employee % | `"0.75"` | statutory-registry.ts:114 |
| ESI employer % | `"3.25"` | statutory-registry.ts:115 |
| ESI monthly eligibility ceiling | `"21000.00"` | statutory-registry.ts:116 |
| PT default monthly | `"200.00"` | statutory-registry.ts:120 |
| PT state MH | `"200.00"` | statutory-registry.ts:123 |
| PT state KA | `"200.00"` | statutory-registry.ts:124 |
| PT state TN | `"208.33"` | statutory-registry.ts:125 |
| PT state WB | `"150.00"` | statutory-registry.ts:126 |
| PT state GJ | `"200.00"` | statutory-registry.ts:127 |
| PT state DL | `"0.00"` (exempt) | statutory-registry.ts:132 |
| PT state BR | `"0.00"` (exempt) | statutory-registry.ts:134 |
| PT state KL | `"0.00"` (exempt) | statutory-registry.ts:135 |
| PT state AS | `"0.00"` (exempt) | statutory-registry.ts:136 |
| *(PT covers 17 states only — partial coverage)* | | statutory-registry.ts:121-139 |
| LWF employee default | `"25.00"` | statutory-registry.ts:144 |
| LWF employer default | `"25.00"` | statutory-registry.ts:145 |
| LWF state MH employee | `"25.00"` | statutory-registry.ts:148 |
| LWF state MH employer | `"75.00"` | statutory-registry.ts:148 |
| LWF state KA employee/employer | `"20.00"/"40.00"` | statutory-registry.ts:149 |
| LWF state TN, WB, GJ, DL, HR, PB, KL, MP | various | statutory-registry.ts:150-158 |
| *(LWF covers 10 states only — partial coverage)* | | |
| Gratuity provision % | `"4.81"` (of basic) | statutory-registry.ts:162 |
| Gratuity eligibility years | `5` | statutory-registry.ts:163 |
| HRA metro cities | `["Mumbai","Delhi","Kolkata","Chennai"]` | statutory-registry.ts:169 |
| HRA metro % | `"50"` | statutory-registry.ts:170 |
| HRA non-metro % | `"40"` | statutory-registry.ts:171 |
| Min wage Basic+DA % of gross | `"50"` | statutory-registry.ts:175 |
| TDS standard deduction (new regime, FY25-26) | `7_500_000` paise (₹75,000) | statutory-registry.ts:186 |
| TDS standard deduction (old regime, FY25-26) | `5_000_000` paise (₹50,000) | statutory-registry.ts:202 |
| TDS new-regime slabs FY25-26 | 0%→₹3L, 5%→₹7L, 10%→₹10L, 15%→₹12L, 20%→₹15L, 30% | statutory-registry.ts:187-194 |
| TDS old-regime slabs FY25-26 | 0%→₹2.5L, 5%→₹5L, 20%→₹10L, 30% | statutory-registry.ts:200-207 |
| TDS cess | `"4"` % | statutory-registry.ts:209 |
| TDS rebate max (new regime FY25-26) | `2_500_000` paise (₹25,000) | statutory-registry.ts:194 |
| TDS rebate income limit (new) | `70_000_000` paise (₹7,00,000) | statutory-registry.ts:196 |
| TDS new-regime slabs FY26-27 (Income Tax Act 2025) | 7 slabs | statutory-registry.ts:239-248 |
| TDS rebate max (new regime FY26-27) | `6_000_000` paise (₹60,000) | statutory-registry.ts:249 |
| TDS rebate income limit (new FY26-27) | `120_000_000` paise (₹12,00,000) | statutory-registry.ts:250 |

### Country dispatch shape

`statutory.ts:202-222`:
```typescript
if (workerType === "CONTRACTOR" || workerType === "CONSULTANT") → return empty (no statutory)
if (config.statutoryPack && config.statutoryPack.country !== "IN") → calcStatutoryFromPack()
else → calcStatutoryIndiaFromRegistry()
```

**This is conditional branching, NOT a strategy pattern/registry.** Adding a new country requires modifying `statutory.ts` dispatch logic. Non-IN countries go through `statutory-packs.ts` (separate country-pack files), while India is always the default.

**FINDING: PT and LWF state maps are partial** (statutory-registry.ts:122, 147).
Both contain a comment: `"Sample state map — not full India matrix; legal review required for production PT/LWF."` This means orgs in uncovered states get the default value (₹200/₹25), which may be legally incorrect for states like Jharkhand, Himachal Pradesh, Chhattisgarh, Uttarakhand, etc.

---

## 10. Bulk/Queue Behaviour

**Run generation is synchronous on the HTTP request.**

`runs.controller.ts:133` → `generateRun()` → awaited on the request. No job queue/worker is used for the main generation path. The `jobs/` sub-module (`payroll-jobs-worker.service.ts`) exists but processes scheduled jobs (not on-demand run generation).

**Not chunked/resumable.** If the DB transaction at `generate.service.ts:198` fails partway, the entire generation fails and must be retried. The `PayrollRunLockService` ensures only one generate/recalculate runs at a time (per run).

**Per-employee calc loop is in-memory (no N+1 in main loop).**
`generate.service.ts:131-195`: The `for (const profile of profiles)` loop calls only in-memory functions (`buildInputsFromBatch`, `buildCalcInputsFromBatch`, `runCalcAndDetect`). All batch data is pre-loaded before the loop. No per-iteration DB calls. Then a single batch transaction writes all results.

**N+1 confirmed in `inputs.service.ts:reimportInputs`:**
```typescript
// inputs.service.ts:139-141
for (const row of toReset) {
  const pulled = await pullAttendanceInputs(this.db, orgId, row.userId, month);  // DB call per employee
  if (pulled) pulledInputs.push({ userId: row.userId, pulled });
}
```
Sequential await per employee before the transaction. For 100 employees this is 100 serial DB round-trips.

**N+1 in `locking.service.ts:writeTdsYtdLedger` inside transaction:**
```typescript
// locking.service.ts:125-165
for (const emp of emps) {
  await tx.insert(payrollTdsYtdLedger).values({...}).onConflictDoUpdate({...});
}
```
100 employees = 100 serial INSERT/UPSERT within the lock transaction. Can cause slow lock timeouts for large orgs.

**Partial failure:** If the transaction in `generateRun` fails, no employee snapshot is committed (atomic). The run status stays PREPARING/DRAFT. The generation lock is released in the `finally` block. Safe to retry.

---

## 11. Disbursement

**"PAID" is marked on bank item confirmation, NOT on batch dispatch.**

Flow:
1. `createBatch` (POST /payout/runs/:runId/batches) → sets batch status GENERATED, items PENDING.
2. `markSent` → batch SENT, items SENT.
3. `markItemPaid(transactionRef)` → item PAID → triggers `refreshBatchPaidStatus` → triggers `checkRunCompletion`.
4. `checkRunCompletion` → if ALL items across ALL batches are PAID/FAILED/HELD → run → PAID.

Source: `payout-run-completion.ts:90-210`.

**No bank confirmation reconciliation.** Bank returns are imported via `parseBankReturnCsv` (`payout/lib/bank-return.ts`) and applied via `markItemPaid`/`markItemFailed` manually. There is no automated bank-confirmation webhook or ACH return file processing.

**Idempotency:**
- `createBatch` is idempotent via `idempotencyKey` header and upsert-on-duplicate-key.
- `markItemPaid`: throws `ConflictException("Item already marked paid")` if already PAID.
- Payslip publish: `onConflictDoUpdate` on `runEmployeeId` — idempotent.

---

## 12. Boundary Cases

| Case | Status |
|------|--------|
| Mid-month joiner | HANDLED — exception code `MID_PERIOD_JOINER` (INFO severity) at `exception-engine.ts:199`. Proration via `paidDays/scheduledDays` in calc engine. |
| Mid-month leaver | HANDLED — exception code `MID_PERIOD_EXIT` (INFO severity) at `exception-engine.ts:206`. |
| LOP (loss of pay) | HANDLED — `lopDays` input in `InputsSnapshot`; proration applied; `LOP_EXCEEDS_SCHEDULED_DAYS` is a BLOCKER exception at `exception-engine.ts:140`. |
| Negative net pay | HANDLED — `NEGATIVE_NET_PAY` BLOCKER exception at `exception-engine.ts:87`; cannot submit approval with open blockers. |
| PF/ESI wage threshold crossing | HANDLED — ESI: `grossPaise <= esiCeilingPaise` gate at `statutory.ts:333`; PF: ceiling cap at `statutory.ts:269`. |
| Previous-employer TDS income | HANDLED — `previousEmployerTds` input via `taxDeclarations` is read in `calculation-engine.ts:334` for TDS calculation. **BUT**: `writeTdsYtdLedger` at `locking.service.ts:146-147` always writes `previousEmployerIncomePaise: 0` and `previousEmployerTdsPaise: 0`. The YTD ledger doesn't carry the previous-employer data. |
| Tax regime switch (OLD/NEW) | HANDLED — `taxRegimeTypeEnum` and per-employee declaration; calc-engine dispatches on regime. |
| FnF (Full & Final settlement) | HANDLED — dedicated `FnfService` (in `hr/payroll/fnf.service.ts`), exposed via `insights/fnf.controller.ts`. Includes `noticeRecovery` field. |
| Notice recovery | HANDLED — `fnfSettlements.noticeRecovery` field exists; see `fnf.service.ts`. |
| Arrears / retro pay | NOT FOUND — no `arrear` or `retro` keywords in payroll module. |
| Off-cycle run | PARTIALLY — `runType` field allows non-REGULAR runs. No dedicated off-cycle logic found. |
| Multi-currency | HANDLED — `fxRates` in policy config; `payoutCurrency` + `netPayoutCurrency` on run-employee; `multiCurrency` toggle; batches grouped by currency. |
| Overtime | HANDLED — `overtimeHours` input; `overtime.multiplier` in policy config. |

---

## 13. Test Coverage

| Spec File | Subject |
|-----------|---------|
| `__tests__/command-receipts.service.spec.ts` | Idempotency key / replay logic |
| `__tests__/entity-scoped-runs-filings.spec.ts` | Entity-scoped run uniqueness and filing scoping |
| `__tests__/payroll-ai-guardrails.spec.ts` | AI explain guardrail logic |
| `__tests__/payroll-db-integration.e2e-spec.ts` | E2e DB integration (create run, generate, lock) |
| `__tests__/prd-acceptance.spec.ts` | PRD acceptance criteria |
| `__tests__/prd-e2e-journey.spec.ts` | Full payroll journey e2e |
| `filings/__tests__/export-builders.spec.ts` | Export builder (PF/ESI CSV, Form 24Q) |
| `filings/__tests__/filings-capability.spec.ts` | Filing capability detection |
| `insights/__tests__/calendar-reminder-claim.spec.ts` | Calendar reminder scheduler |
| `insights/__tests__/ess-bank-lock.spec.ts` | ESS bank update lock (window closed after payroll) |
| `insights/__tests__/ess-tax-proof-window.spec.ts` | Tax proof submission window |
| `insights/__tests__/fnf-net-payable.spec.ts` | FnF net payable calculation |
| `insights/__tests__/insights-unit.spec.ts` | Pay analytics / insights unit |
| `insights/__tests__/journal-outbox.service.spec.ts` | Journal outbox batch creation |
| `insights/__tests__/manager-approve-guards.spec.ts` | Manager inbox approval guards |
| `insights/__tests__/manager-inbox.logic.spec.ts` | Manager inbox logic |
| `insights/lib/__tests__/pay-compression.spec.ts` | Pay compression analytics |
| `insights/lib/__tests__/period-reconciliation.spec.ts` | Period reconciliation |
| `insights/lib/__tests__/total-rewards.spec.ts` | Total rewards calc |
| `insights/payroll-ai-explain.spec.ts` | AI explain service |
| `jobs/__tests__/payroll-jobs-worker.spec.ts` | Jobs worker |
| `payout/__tests__/payout-batches-currency.spec.ts` | Multi-currency batch grouping |
| `payout/__tests__/publishing-single-render.spec.ts` | Payslip single-employee publish |
| `payout/lib/__tests__/amount-in-words.spec.ts` | Amount-in-words formatter |
| `payout/lib/__tests__/bank-return.spec.ts` | Bank return CSV parser |
| `payout/lib/__tests__/bank-validation.spec.ts` | Bank account validation |
| `runs/__tests__/generate-batch.spec.ts` | Batch generation |
| `runs/lib/__tests__/calculation-engine.spec.ts` | Core calc engine unit |
| `runs/lib/__tests__/checklist-inputs-locked.spec.ts` | Checklist locked-input requirement |
| `runs/lib/__tests__/exception-engine.spec.ts` | Exception detection |
| `runs/lib/__tests__/fixtures/replay-fixture.ts` | Golden-file replay fixture |
| `runs/lib/__tests__/formula-engine.spec.ts` | Formula engine (custom expressions) |
| `runs/lib/__tests__/input-puller-locked.spec.ts` | Input puller with locked period |
| `runs/lib/__tests__/money.spec.ts` | Money helpers (toPaise, fromPaise, rounding) |
| `runs/lib/__tests__/payroll-engine-extended.spec.ts` | Extended calc engine scenarios |
| `runs/lib/__tests__/payroll-transitions.spec.ts` | State machine transitions |
| `runs/lib/__tests__/snapshot-replay.spec.ts` | **Golden-file determinism test** — re-runs calc from fixture → compares to `replay-expected.json` |
| `runs/lib/__tests__/statutory-packs.spec.ts` | Non-India statutory pack calc |
| `runs/lib/__tests__/statutory-registry.spec.ts` | India statutory bundle (PF/ESI/PT/LWF/TDS) |

**Golden-file / determinism test:** `snapshot-replay.spec.ts` with `fixtures/replay-expected.json`. This is the closest to a determinism test — it verifies that the calc engine produces the same output for a fixed input.

**No parallel-run test** (running the same employee twice in the same month).

**Coverage gaps:** No cross-tenant isolation test in payroll-specific specs. No test for `setEmployeeHold` on a locked run. No test for float drift in run-level totals.

---

## 14. Top Findings

Ranked by severity. P0 = wrong pay / double pay / mutable approved run / cross-tenant. P1 = data integrity / missing guard. P2 = minor / design.

| SEV | File:Line | Finding |
|-----|-----------|---------|
| P0 | generate.service.ts:191-194 | Float accumulator for run-level totals (`grossTotal`, `netTotal`): `parseFloat(snapshot.totals.gross)` floats summed across N employees → stored `payrollRuns.netTotal` may drift from per-employee sum by ±1 paise at scale. |
| P0 | payroll-posting.service.ts:21-29 | Accounting journal entries use `parseFloat` not integer paise; journal debits/credits may differ from the actual paise-accurate per-employee figures. Prior audit claim CONFIRMED. |
| P0 | runs.service.ts:56-58 | `setEmployeeHold` has NO run-status check. Can set/clear `holdReason` on LOCKED, PAID, PAYSLIPS_PUBLISHED, CLOSED runs. Mutable field on immutable-run record. |
| P1 | locking.service.ts:68 | UPDATE `payrollRuns` in `lock()` uses `.where(eq(payrollRuns.id, runId))` without `orgId` — prior findFirst scoped by orgId, but the write itself is unscoped. TOCTOU gap. |
| P1 | approvals.service.ts:86,133 | UPDATE `payrollRuns` in `submitApproval` auto-approve path (line 86) and pending-chain path (line 133) both use `.where(eq(payrollRuns.id, runId))` without `orgId`. |
| P1 | publishing.service.ts:284-286 | Partial-publish premature PAYSLIPS_PUBLISHED: `totalEmployees = employees.length` uses the FILTERED subset (when `userIds` param is passed), but `allPublications` counts ALL run publications. Publishing 3/10 employees can trigger run → PAYSLIPS_PUBLISHED, locking out the other 7. |
| P1 | locking.service.ts:146-147 | `writeTdsYtdLedger` always writes `previousEmployerIncomePaise: 0` and `previousEmployerTdsPaise: 0`. Previous-employer TDS declared in employee tax declaration is used in the calc (calculation-engine.ts:334) but NOT persisted to the YTD ledger. Ledger is incomplete for new joiners. |
| P1 | statutory-registry.ts:122-139 | PT state map is explicitly marked partial: `"Sample state map — not full India matrix; legal review required"`. Orgs in ~11 uncovered states (JH, HP, CG, UK, etc.) get the default ₹200/mo regardless of actual PT obligation. |
| P1 | statutory-registry.ts:147-158 | LWF state map is likewise partial (10 states covered). Same legal risk as PT. |
| P2 | inputs.service.ts:139-141 | N+1 in `reimportInputs`: sequential `await pullAttendanceInputs(...)` per employee before transaction — 100 employees = 100 DB round-trips. |
| P2 | locking.service.ts:125-165 | N+1 in `writeTdsYtdLedger` inside transaction: one `await tx.insert().onConflictDoUpdate()` per employee — 100 employees = 100 sequential DB ops inside a transaction, risking Neon statement timeout. |
| P2 | payout-batches.service.ts:203 | Bank batch total uses float reduction: `itemsData.reduce((s, i) => s + parseFloat(i.amount), 0).toFixed(2)`. The batch `totalAmount` stored in `payrollBankBatches` may not exactly match the sum of individual item amounts. |
| P2 | payout-csv.ts:35 | Bank file amounts: `parseFloat(amount).toFixed(2)` — float formatting of money in the actual bank disbursement file. |
| P2 | approvals.service.ts (no line — design) | No check that approver ≠ generator/calculator. Only submitter ≠ approver is enforced (maker-checker). A user holding both `payroll:runs:manage` and `payroll:runs:approve` can run and approve the same payroll. |
| P2 | statutory.ts:202-222 | Country dispatch is conditional branching (not a strategy/registry pattern). Adding country support requires modifying `statutory.ts`. |
| P2 | statutory-registry.ts:11-12 | Only two India bundles exist (FY2025-26, FY2026-27). No historical bundles before April 2025. A retroactive payroll run for 2024 would use `IN_STATUTORY_2025_04` (the oldest available). |
| P2 | payout-batches.service.ts:136-139 | `baseSeq` for batch number generation uses `count(payrollBankBatches.id)` — this counts ALL batches for the run, including any that may have been recreated or failed. If batches were re-created, sequence numbers will be non-contiguous. Minor but could cause confusion in bank files. |
| P3 | calculation-engine.ts:419 | `computedAt: new Date().toISOString()` in snapshot — non-deterministic timestamp in the immutable snapshot record. Cosmetic only; does not affect money. |
| P3 | run-lock.service.ts:65-88 | `assertNoOtherActiveGeneration` is explicitly marked "best-effort" and "advisory". It checks OTHER runs in the same month but the real lock is per-run (token on `payrollRuns.generationLockToken`). Two runs for different entities in the same org+month CAN be generated concurrently. This is intentional but undocumented. |
| P3 | payroll.types.ts:337 | `PAYROLL_LOCKED_STATUSES` includes `"APPROVED"` — this means no manual adjustments can be added to a run that is APPROVED but not yet LOCKED. However, the `createBatch` endpoint accepts APPROVED runs. This means you can create the bank file before locking, but cannot adjust employees after approval. Potentially confusing UX. |

---

## 15. Prior Audit Claims — Verification

| Claim | Verdict |
|-------|---------|
| "payroll controllers carry NO `@RequireModule` at all" | **REFUTED.** All controllers have `@RequireModule("payroll")` at class level. 100% coverage confirmed. |
| "calc engine uses integer paise, but run totals + bank files go through parseFloat/toFixed(2)" | **CONFIRMED.** generate.service.ts:191-194 (run totals), payout-csv.ts:35 (bank file). |
| "`payroll-posting.service.ts` uses float math not paise" | **CONFIRMED.** payroll-posting.service.ts:21-29. |
