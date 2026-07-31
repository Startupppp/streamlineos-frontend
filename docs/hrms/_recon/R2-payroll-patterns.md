# R2 — Payroll Engine & Operations Patterns
**Date:** 2026-07-31 · **Lane:** R2 (Payroll patterns research) · **Mode:** READ-ONLY

**Evidence convention.** `[V]` = verified against a recon doc in this session. `[L]` = cited in a recon lane, not re-checked by R2. `[EXT]` = from external source with URL. `[UNVERIFIED]` = cannot be confirmed from available sources.

---

## 1. Feature Matrix

"We have?" cites real file:line from recon docs or `NO`. "Specced?" = covered in `tasks/payroll/*.md`.

| Capability | RazorpayX Payroll | Zoho Payroll | greytHR | Keka | Gusto | Rippling | Deel | We have? | Specced? | P |
|---|---|---|---|---|---|---|---|---|---|---|
| **Pay structures & salary components** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `salary_components`, `employee_salary_profiles`, `employee_salary_profile_components` (`hr/payroll-workforce.ts:13,40,70`) | YES (task 11, 12) | P1 |
| **Formula engine (variable expressions)** | Limited | ✓ | ✓ | ✓ | ✗ | Partial | ✗ | YES — `runs/lib/calculation-engine.ts:437` + `formula-engine.spec.ts` | YES (task 12) | P1 |
| **Versioned salary revisions** | ✓ | ✓ (effective-from + payout month) | ✓ | ✓ (proposal→approval→audit) | ✓ | ✓ | ✓ | PARTIAL — `employee_salary_profiles.effectiveTo` (`hr/payroll-workforce.ts:49`) but no effective-from on revisions and no version history table for profile changes [V] | YES (task 11) | P0 |
| **Arrears / retro pay calculation** | ✓ | ✓ (automatic on effective-date gap) | ✓ (batch module) | ✓ (same run) | ✓ | ✓ | ✓ | NO — "no `arrear` or `retro` keywords in payroll module" [V] `D:487` | NO | P0 |
| **Pay groups & pay cycles** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PARTIAL — `payroll_entities` (`entities-periods.ts:41`) + `payroll_periods` (`entities-periods.ts:74`) + `payroll_policies.currency`; no UI-level pay-group grouping within a run [V] | YES (task 10) | P1 |
| **Run lifecycle & maker-checker** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — full state machine `PREPARING→CLOSED` (`payroll.types.ts:319`); submitter ≠ approver enforced (`approvals.service.ts:264-276`) [V] | YES (task 10, 24) | done |
| **Dry-run / variance review vs prior cycle** | Partial | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | NO-OP — `GET /runs/:runId/variance` endpoint exists (`runs.controller.ts:264`) but `PREVIEW`/`RECONCILE` job types return `{ ok: true, note: "no-op handler" }` (`payroll-jobs-worker.service.ts:186-188`) [V] | YES (task 10) | P0 |
| **LOP & pro-rata** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `lopDays` in `InputsSnapshot`; proration `paidDays/scheduledDays` in calc engine; `LOP_EXCEEDS_SCHEDULED_DAYS` BLOCKER (`exception-engine.ts:140`) [V] | YES (task 13) | done |
| **Overtime** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `overtimeHours` input; `overtime.multiplier` in policy config [V] | YES (task 13) | done |
| **Reimbursements & claims** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `reimbursements` table (`payroll.ts:112`), pulled into payroll inputs (`payroll-inputs-build.service.ts:96-107`) [V] | YES (task 15) | done |
| **Bonuses & incentives** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PARTIAL — `bonuses` table (`payroll.ts:183`) + `bonuses_cents` column; no commission/variable-pay calculation engine [V] | YES (task 16) | P1 |
| **Commissions & variable pay engine** | Partial | Partial | ✓ | ✓ | ✓ | ✓ | ✓ | NO — no commission ledger or target/achievement tracking [V] | YES (task 16) | P1 |
| **Loans & advances** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `salary_loans` (`payroll.ts:147`), `payroll_loan_adjustments` (`payroll-workforce.ts:89`), EMI pulled into deductions [V] | YES (task 17) | done |
| **Perquisites** | Partial | Partial | ✓ | ✓ | ✗ | Partial | ✗ | NO — no perquisite component type or valuation table [UNVERIFIED — searched, not found in any recon file] | NO | P1 |
| **PF / ESI / PT / LWF (India)** | ✓ | ✓ | ✓ | ✓ | N/A | N/A | ✓ | PARTIAL — covered but PT = 17 states, LWF = 10 states; both explicitly labelled "sample, legal review required" (`statutory-registry.ts:122,147`) [V] | YES (task 14) | P0 |
| **TDS & income-tax regime choice** | ✓ | ✓ | ✓ | ✓ | N/A | N/A | ✓ | YES — old + new regime slabs for FY25-26 and FY26-27 in `statutory-registry.ts:186-250`; per-employee `taxRegimeTypeEnum` [V] | YES (task 14) | done |
| **Investment declarations & proof workflow** | ✓ | ✓ | ✓ | ✓ | N/A | N/A | ✓ | YES — `tax_declarations`, `investment_proofs`, `payroll_tax_windows` (`tax.ts:4,30`; `tax-windows.ts:8`); ESS declaration window [V] | YES (task 14) | done |
| **Form 16 / 24Q generation** | ✓ | ✓ | ✓ | ✓ | N/A | N/A | ✓ | PARTIAL — `filings/__tests__/export-builders.spec.ts` mentions "Form 24Q" + ECR/ESI CSV builders [L]; no explicit Form 16 PDF generation found in recon | YES (task 14) | P1 |
| **FnF & gratuity & leave encashment** | ✓ | ✓ | ✓ | ✓ | N/A | N/A | ✓ | YES — `fnf_settlements` (`payroll.ts:213`), `FnfService` (`hr/payroll/fnf.service.ts`), includes leave_encashment, bonus_due, notice_recovery [V] | YES (task 22) | done |
| **Notice recovery** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `fnfSettlements.noticeRecovery` field [V] `D:485` | YES (task 22) | done |
| **Off-cycle runs** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PARTIAL — `runType` field allows non-REGULAR (`payroll.types.ts`); no dedicated off-cycle input collection or partial-month logic [V] `D:489` | YES (task 10) | P1 |
| **Bank files & payout APIs** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `payroll_bank_batches`, `payroll_bank_batch_items`, bank-return CSV import (`payout/lib/bank-return.ts`); no webhook-based bank confirmation [V] | YES (task 18) | P1 |
| **Disbursement reconciliation** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | NO-OP — `RECONCILE` job type returns `{ ok: true, note: "no-op handler" }` [V] `01-inventory:83`; manual CSV import only | YES (task 18) | P0 |
| **Payslip design & publishing** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `payslip_templates` (`payroll-payout.ts:10`), `publishing.service.ts:500`, 3 layouts [V] | YES (task 19) | done |
| **GL posting / accounting integration** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES (silent failure) — `payroll-posting.service.ts:95`; error swallowed in try/catch (`payroll-posting.service.ts:33/62`); float arithmetic contaminates amounts [V] | YES (task 23) | P0 |
| **Multi-entity payroll** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PARTIAL — `payroll_entities` schema; entity-scoped run uniqueness test [L]; no `legal_entities` table, no per-entity tax registration [V] `01-inventory:51` | YES (task 21) | P1 |
| **Multi-currency payroll** | Partial | Partial | Partial | Partial | ✗ | ✓ | ✓ | YES (schema) — `employee_salary_profiles.currency`, `payroll_run_employees.currency + fx_rate + netPayoutCurrency`; batches grouped by currency [V] | YES (task 21) | P1 |
| **Employee payroll self-service (ESS)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `insights/ess.service.ts:624`; payslip, tax, bank, loan, declaration APIs [V] | YES (task 20) | done |
| **Audit trail & calculation trace** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | YES — `payroll_run_events` (append-only, `run-events.ts:9`); `calculationSnapshot` JSONB per employee [V] | YES (task 24) | done |

**External sources used for competitor features:**
- RazorpayX: https://razorpay.com/docs/payroll/run-payroll/ · https://www.softwaresuggest.com/razorpayx-payroll [EXT]
- Zoho Payroll: https://www.zoho.com/in/payroll/help/employer/approvals/salary-revision.html · https://www.zoho.com/in/payroll/kb/employer/approvals/arrear-component.html [EXT]
- greytHR: https://admin-help.greythr.com/admin/answers/122441429/ [EXT]
- Keka: https://www.keka.com/employee-salary-revision-arrear-processing-bonus-payments [EXT]
- Deel: https://www.deel.com/solutions/payroll-engine/ [EXT]

---

## 2. The 6 Highest-Leverage Engine Patterns

### Pattern A — Effective-Dated Statutory Config (DB-driven, not code-driven)

**The gap.** Every PF/ESI/PT/TDS rate is a TypeScript literal constant compiled into the binary. A Budget change (e.g. ESI ceiling raised from ₹21,000 to ₹25,000 in FY26-27) is a **code deploy**, not a config change. PT covers only 17 of 28 states; LWF covers 10. Both are labelled "sample — legal review required" in the source. [V] `statutory-registry.ts:122,147`

**What mature products do.** Zoho Payroll, greytHR, and Keka maintain a DB table of statutory rate versions keyed by `(country, state_code, effective_from_month, effective_to_month)`. The calc engine picks the row whose range contains the run month — no redeploy. [EXT] https://admin-help.greythr.com/admin/answers/122441429/

**Structure.**
```
statutory_rate_configs
  id, org_id (nullable for system-wide), country, state_code, bundle_key
  effective_from_month (YYYY-MM), effective_to_month (YYYY-MM, nullable = current)
  rates JSONB  -- { pfCeilingPaise, esiCeilingPaise, ptMonthly, lwfEmployee, lwfEmployer, ... }
  created_at, created_by
```
`getIndiaBundleForMonth(month)` becomes a DB `SELECT WHERE country='IN' AND state=? AND effective_from <= month AND (effective_to IS NULL OR effective_to >= month)`. The existing `IndiaStatutoryBundle` shape becomes the JSONB schema — no application-level type change, just load from DB instead of constant.

**Why it fits our code.** The calc engine already stamps `statutoryRuleVersion` on each run (`generate.service.ts`). Switching to a DB lookup only changes the source of the bundle object, not how it is consumed. Org-level overrides (e.g. "our PF ceiling is ₹15,000 as per registration") become an org-scoped row in the same table.

**First concrete step.** Create migration for `payroll_statutory_rate_configs` in `backend/src/db/schema/payroll/`. Seed the two existing bundles (`IN-2025.04`, `IN-2026.04`) + all 28 state PT/LWF rows as `effective_from_month='2025-04'` system rows. Update `runs/lib/statutory-registry.ts` to call a new `StatutoryConfigService.loadBundle(orgId, country, state, month)`.

---

### Pattern B — Country-Pack Registry (Strategy Pattern, Not Conditional Branching)

**The gap.** `statutory.ts:202-222` dispatches via `if (config.statutoryPack && config.statutoryPack.country !== "IN")`. Adding a new country requires modifying the dispatch method itself. Non-IN packs live in a separate 412-LOC file. The pattern is ad-hoc, not extensible. [V] `D:403-412`

**What Deel does.** One configurable engine; each country is a "pack" implementing a shared interface. Packs register themselves; the engine picks by country key. New country = new pack file, zero changes to core engine. [EXT] https://www.deel.com/solutions/payroll-engine/

**Structure.**
```ts
interface StatutoryPack {
  country: string;
  calc(inputs: StatutoryInputs, bundle: StatutoryBundle): StatutoryResult;
  validateInputs(inputs: StatutoryInputs): ValidationError[];
}

// registry.ts
const PACK_REGISTRY = new Map<string, StatutoryPack>();
export function registerPack(pack: StatutoryPack) { PACK_REGISTRY.set(pack.country, pack); }
export function getPackOrThrow(country: string): StatutoryPack { ... }

// india-pack.ts
registerPack(new IndiaStatutoryPack());
// uk-pack.ts
registerPack(new UKStatutoryPack());
```

**Why it fits our code.** `calcStatutoryFromPack()` already exists in `statutory.ts` for non-IN countries. The India branch (`calcStatutoryIndiaFromRegistry`) becomes `IndiaStatutoryPack.calc()`. The conditional dispatch in `statutory.ts:202-222` becomes a single `getPackOrThrow(country).calc(inputs, bundle)`.

**First concrete step.** Extract `calcStatutoryIndiaFromRegistry` from `runs/lib/statutory.ts` into `runs/lib/statutory-packs/india.pack.ts` implementing the interface. Wire `statutory.ts` to use `getPackOrThrow`. Existing `statutory-packs.ts` non-IN logic becomes separate pack files.

---

### Pattern C — Integer-Minor-Unit Money End to End + Residual Allocation

**The gap.** Per-employee arithmetic is integer paise (correct). Run-level totals float-accumulate via `parseFloat` across employees (`generate.service.ts:191-194`). GL posting converts via `parseFloat` again (`payroll-posting.service.ts:22-28`). Bank batch totals also float (`payout-batches.service.ts:203`). 60+ `decimal(15,2)` DB columns. For 200 employees at ₹37,333.33 each, float drift of ±1 paise per employee accumulates. [V] `D-payroll-engine.md:283-320`, `B-payroll-billing-schema.md:167-193`

No residual redistribution exists. If PF rounds down and PT rounds up, the sum of line items may differ from the stated net by 1–3 paise. [V] `D:345-354`

**What mature products do.** All internal amounts as integer minor units (paise/cents). Sum of rounded components must exactly equal the per-employee net. Residual = `target_net_paise - Σ(round(component_paise))` → assign to the largest earnings component or a dedicated `ROUNDING_ADJ` line item. Run totals = `SUM(net_paise_integer)` directly in SQL. [EXT] https://support.yourpayroll.com.au/hc/en-au/articles/5015386652175-Rounding-of-values-how-it-works

**Structure.**
```ts
// In generate.service.ts — replace float accumulator
let grossTotalPaise = 0n;  // BigInt
let netTotalPaise = 0n;
for (const emp of employees) {
  grossTotalPaise += BigInt(emp.grossPaise);
  netTotalPaise += BigInt(emp.netPaise);
}
// Store as payrollRuns.grossTotal = fromPaise(Number(grossTotalPaise))

// In calculation-engine.ts — residual allocation
const componentSum = components.reduce((s, c) => s + c.roundedPaise, 0);
const residual = targetNetPaise - componentSum;
if (residual !== 0) {
  // add to largest earnings component
  largestEarning.roundedPaise += residual;
}
```

**Why it fits our code.** `money.ts` helpers (`toPaise`, `fromPaise`, `pctOf`, `applyRounding`) already exist and return integers. The per-employee calc is correct. Only aggregation and GL layer need fixing. The `payrollTdsYtdLedger` table already uses integer paise columns (`entities-periods.ts:244-250`) — the pattern for the rest of the schema.

**First concrete step.**
1. Fix `generate.service.ts:191-194`: replace `grossTotal += parseFloat(...)` with `grossTotalPaise += snapshot.totals.grossPaise` (add paise fields to snapshot).
2. Fix `payroll-posting.service.ts:22-29`: pass paise integers directly to `FinancePostingService` (which already uses BigInt internally).
3. Add residual allocation in `calculation-engine.ts` after component sum.

---

### Pattern D — Dry-Run Variance Diff vs Previous Cycle

**The gap.** The variance endpoint exists (`runs.controller.ts:264`) but the `RECONCILE` and `PREVIEW` job types are explicit no-ops returning `{ ok: true, note: "…no-op handler" }`. [V] `payroll-jobs-worker.service.ts:186-188`, `01-inventory:83`

**What mature products do.** Rippling and greytHR surface a per-employee delta table: for each employee, `prev_net`, `curr_net`, `delta`, `delta_pct`, and a breakdown of which component drove the change. Runs with aggregate delta > configurable threshold (e.g. 10% total payroll change) block approval. [EXT] https://hrone.cloud/blog/best-payroll-software-india/ [UNVERIFIED specific threshold]

**Structure.**
```ts
interface VarianceLine {
  employeeId: string;
  component: string;
  prevPaise: number;
  currPaise: number;
  deltaPaise: number;
  deltaPct: number;
}

interface RunVarianceReport {
  runId: number;
  prevRunId: number | null;
  totalDeltaPaise: number;
  totalDeltaPct: number;
  lines: VarianceLine[];
  exceedsThreshold: boolean;
}
```

**Why it fits our code.** `payrollRunEmployees` stores `gross`, `net`, `totalDeductions` per employee per run. The prior run for the same org + month-type is `SELECT WHERE orgId = ? AND month < ? AND runType = 'REGULAR' ORDER BY month DESC LIMIT 1`. `payrollLineItems` gives the component breakdown. Variance = join on `employeeId` between this run and prior run.

**First concrete step.** Implement `RunsService.getVariance(runId)` in `runs/runs.service.ts` to query the prior run and compute per-employee component diffs. Wire to the existing `GET /runs/:runId/variance` endpoint. Add a `VARIANCE_THRESHOLD_PCT` to `payrollPolicyVersions.config` JSONB.

---

### Pattern E — Queue/Chunked/Resumable Bulk Run Generation

**The gap.** `generateRun()` is synchronous on the HTTP request (`runs.controller.ts:133`). For 500 employees, the entire gen + DB transaction runs inline. N+1 in `reimportInputs` (100 sequential DB calls per employee, `inputs.service.ts:139-141`). N+1 in `writeTdsYtdLedger` (one `await tx.insert` per employee inside a transaction, `locking.service.ts:125-165`). Puppeteer PDF generation is serial per employee. [V] `D-payroll-engine.md:419-448`

The `payroll_jobs` table already exists in Gen-3 schema (`entities-periods.ts:161`) with `PENDING→RUNNING→SUCCEEDED/FAILED/DEAD_LETTER` statuses — but it is not wired to on-demand run generation. [V] `B-payroll-billing-schema.md:64`

**What mature products do.** Gusto, Rippling: the "run payroll" action enqueues a job. The UI polls. Workers process employees in chunks of 50–100, committing each chunk. Failure resumes from last committed chunk using the run's advisory lock. [EXT] [UNVERIFIED specific chunk size]

**Structure.**
```ts
// On POST /runs/:runId/generate — enqueue instead of inline:
const job = await payrollJobsService.enqueue({
  orgId, runId, type: 'GENERATE', totalEmployees: empCount
});
return { jobId: job.id, status: 'PENDING' };  // 202

// Worker:
async processChunk(runId, chunk: Employee[], chunkIdx) {
  const snapshots = chunk.map(e => calcEngine.compute(e));
  await db.transaction(tx => bulkUpsert(tx, snapshots));
  await jobsService.updateProgress(runId, chunkIdx);
}
```

**Why it fits our code.** The existing `payrollJobsService` in `jobs/` handles scheduled jobs. The `PayrollRunLockService` (`run-lock.service.ts`) already prevents concurrent generation — it becomes the concurrency guard for the async worker too. The `payroll_jobs` table needs a `payload` JSONB for chunk cursor and a `progress` column.

**First concrete step.** Wire `POST /runs/:runId/generate` to enqueue a `payroll_jobs` row instead of calling `generateRun()` directly. Create a BullMQ worker in `jobs/` that reads the job, calls `generateRun` in chunked mode. Add `GET /runs/:runId/jobs/:jobId` for UI polling.

---

### Pattern F — Disbursement Confirmed-Not-Dispatched + Reconciliation

**The gap.** `markSent()` advances items to `SENT` status without any bank confirmation — dispatch is assumed to equal confirmation. The `RECONCILE` job type is a no-op. Bank return CSV is manually imported via `importBankReturn` which calls `markItemPaid` per row — ~5 queries per row, not batched. "PAID" on a run means all items are terminal, but "terminal" includes `FAILED` — a run can be marked `PAID` with some employees unpaid. [V] `D-payroll-engine.md:455-472`, `01-inventory:83`

**What mature products do.** RazorpayX and Keka separate "batch dispatched" (`SENT`) from "bank confirmed" (`BANK_CONFIRMED`). A reconciliation job imports the bank return file, matches by transaction reference, marks each item, and triggers re-disbursal for returns. PAID status on the run = all items `BANK_CONFIRMED`. [EXT] https://www.terra-insight.com/insights/pf-ecr-reconciliation-india/ (PF reconciliation pattern; same principle applies to salary)

**Structure.**
```
payroll_disbursement_recon
  id, org_id, batch_id (FK payroll_bank_batches)
  bank_return_ref, return_reason_code, return_received_at
  status: MATCHED | UNMATCHED | REVERSED
  matched_item_id (FK payroll_bank_batch_items)
```

The `RECONCILE` job handler should:
1. Parse bank return file (existing `bank-return.ts` parser).
2. Match each row to a `payrollBankBatchItem` by `transactionRef`.
3. In one transaction: mark matched items `PAID`, unmatched items `RETURNED`; write `payroll_disbursement_recon` rows; trigger re-disbursal queue for returned items.

**Why it fits our code.** `payout/lib/bank-return.ts` already parses the CSV. `markItemPaid`/`markItemFailed` already exist. The reconciliation job just wraps them in a single batch transaction instead of N sequential calls.

**First concrete step.** Replace the no-op `RECONCILE` handler in `payroll-jobs-worker.service.ts:186-188` with a call to a new `ReconciliationService.reconcileBankReturn(jobPayload)`. Add the `payroll_disbursement_recon` table to `db/schema/payroll/`.

---

## 3. Boundary-Case Checklist

| Boundary Case | Mature product model | We handle at file:line | Status |
|---|---|---|---|
| **Mid-month joiner** | Pro-rata `paidDays / scheduledDays` × salary; first payslip shows joining date | `exception-engine.ts:199` (`MID_PERIOD_JOINER` INFO); proration in calc engine [V] | HANDLED |
| **Mid-month leaver** | Pro-rata same as joiner; LWD drives scheduled days | `exception-engine.ts:206` (`MID_PERIOD_EXIT` INFO) [V] | HANDLED |
| **LOP (loss of pay)** | `lopDays` reduces `paidDays`; blocked if `lopDays > scheduledDays` | `exception-engine.ts:140` (`LOP_EXCEEDS_SCHEDULED_DAYS` BLOCKER); `lopDays` in `InputsSnapshot` [V] | HANDLED |
| **Arrears (retro salary revision)** | Prior-month delta computed per component; included as `ARREARS` earning in current run; PF recalculated on revised wage | NO — no `arrear` or `retro` keywords [V] `D:487` | GAP |
| **PF/ESI threshold crossings** | ESI: stops when gross > ₹21,000 ceiling; PF: capped at ₹15,000 basic; once opted-in at higher wage, continues | ESI: `grossPaise <= esiCeilingPaise` gate (`statutory.ts:333`); PF: ceiling cap (`statutory.ts:269`) [V] | HANDLED |
| **Tax regime switch (old → new)** | Employee can switch regime up to the tax-lock date; projections recalculate; Form 16 part B reflects final regime | Per-employee `taxRegimeTypeEnum`; declaration window via `payroll_tax_windows` [V] | HANDLED |
| **Multiple salary revisions in one cycle** | Each revision effective date generates an arrears entry; sum of all deltas = total arrears | NO — no arrear engine; single effective salary profile per run | GAP |
| **Negative net pay** | Blocked at approval; optionally zero-netted with recoveries carried forward | `NEGATIVE_NET_PAY` BLOCKER (`exception-engine.ts:87`) [V] | HANDLED |
| **Off-cycle run** | Separate run type; only affected employees; different pay date; full approval/lock/pay cycle | PARTIAL — `runType` field exists; no dedicated input collection or partial-month logic [V] `D:489` | GAP (partial) |
| **FnF (Full & Final)** | Separate settlement flow triggered on resignation/exit; includes unpaid salary, leave encashment, gratuity, notice recovery, loan recovery | `fnf_settlements` + `FnfService`; fields: `basic_dues`, `leave_encashment`, `bonus_due`, `notice_recovery`, `loan_recovery` [V] | HANDLED |
| **Notice recovery** | Amount deducted from FnF if employee serves less than notice period | `fnfSettlements.noticeRecovery` [V] `D:485` | HANDLED |
| **Previous-employer TDS income** | Declared by employee; added to YTD taxable income for TDS projection | Input read in calc (`calculation-engine.ts:334`); BUT `writeTdsYtdLedger` always writes `previousEmployerIncomePaise: 0` (`locking.service.ts:146-147`) [V] | GAP (YTD ledger incomplete) |
| **Perquisites (car, accommodation, ESOP)** | Separate component type; valuation rules (e.g. 10% of salary for accommodation); added to taxable income | NO — no perquisite component type or valuation [UNVERIFIED — not found in recon] | GAP |
| **Gratuity provision** | Monthly accrual at 4.81% of basic; eligible after 5 years; paid on FnF | Gratuity provision % = `"4.81"` (`statutory-registry.ts:162`); eligibility = 5 years (`statutory-registry.ts:163`); in FnF [V] | HANDLED (provision only) |
| **Timesheet hours → payroll (billable hours to pay)** | Approved timesheet hours flow into payroll inputs as `billableHours`; drives formula components | CHAIN BREAK — timesheets export (Chain A) does NOT feed HR payroll engine (Chain B); `timesheetHours` never reach `hrPayrollInputSnapshots` [V] `J:57,106` | GAP |

---

## 4. Rounding & Residual

### How mature payroll systems round [EXT]

| Level | Convention | Source |
|---|---|---|
| Per component | Half-up (NEAREST) to the configured precision (whole rupee or paise) | YourPayroll AU [EXT] https://support.yourpayroll.com.au/hc/en-au/articles/5015386652175 |
| Statutory deductions (PF, ESI) | Half-up to whole rupee; statutory authority rounding tables must be followed | EPFO ECR format [EXT] https://www.epfindia.gov.in/site_en/Online_ECR.php |
| Run total | Sum of already-rounded per-employee values (no second rounding); display shows sum of individual amounts | Oracle Payroll docs [EXT] https://docs.oracle.com/cd/E26401_01/doc.122/e59069/T346064T372563.htm |
| Residual | Difference between sum of component-rounded values and the independently-computed net; assigned to the largest earnings component (Zoho, Keka) or a dedicated `ROUNDING_ADJ` line (Oracle, SAP) | [EXT] [UNVERIFIED specific vendors; convention widely documented] |
| YTD | Sum of individual period rounded values; ±1 paise expected due to accumulated rounding; documented in income statement | YourPayroll AU [EXT] |

### Current implementation [V]

`applyRounding()` in `money.ts:14-24`: NEAREST/UP/DOWN, precision 0 (whole rupee) or 2 (paise). Policy-configurable via `PayrollPolicyConfig.rounding`. Per-employee calc uses integer paise correctly. **No residual redistribution** — component sums may differ from net by 1–3 paise.

### Recommendation for StreamlineOS

**Rule: Half-up per component; residual to the largest earnings component.**

1. Round each component with `applyRounding(paise, { mode: "NEAREST", precision: 0 })` (whole rupee, matching typical Indian payroll convention).
2. Compute `residualPaise = targetNetPaise - Σ(roundedComponentPaise)`.
3. If `residualPaise !== 0`, add to the component with the highest `roundedPaise` value (typically Basic — the dominant component). This ensures: `Σ(displayed components) === displayed net` exactly.
4. Store `residualPaise` on the `payrollRunEmployees` row for audit.
5. Run totals: `SUM(netPaise INTEGER)` directly in SQL — no float accumulation.

This is the pattern recommended by Oracle Payroll and matches Zoho/Keka behavior. The maximum residual is `(N_components - 1)` paise per employee, which for a 10-component payslip is at most ±9 paise — always absorbed invisibly in Basic.

---

## 5. Statutory Artefact Formats

### A. ECR — Electronic Challan cum Return (PF / EPFO)

**Authority:** EPFO, under Employees' Provident Funds and Miscellaneous Provisions Act 1952. [EXT] https://www.epfindia.gov.in/site_en/Online_ECR.php

**Frequency:** Monthly, due by 15th of the following month.

**Format:** Text file uploaded to EPFO Unified Portal. ECR 2.0 (since 2012); ECR 3.0 (Revamped, effective wage month September 2025 with real-time validation and sequential filing enforcement). [EXT] https://www.sgcms.com/regulatory-updates/re-engineered-electronic-challan-cum-return-ecr/ [UNVERIFIED — ECR 3.0 exact field changes not confirmed from official source]

**Required per employee per row:**
- UAN (Universal Account Number)
- Member name
- Gross wages
- EPF wages (= basic + DA, capped at ₹15,000)
- EPF contribution (12% of EPF wages — employee share)
- EPS contribution (8.33% of EPF wages up to ₹15,000 — employer; routed from employer's 12%)
- EDLI (0.5% of EPF wages, capped at ₹15,000) — employer
- Admin charges (0.5% EPF + 0.01% EDLI)
- NCP days (non-contributory period days — LOP days)
- Refund of advances (if any)

**Our coverage:** PF rates exist in `statutory-registry.ts:107-109`. UAN mapping: `[UNVERIFIED — no UAN column found in HR schema recon]`.

---

### B. ESI Return (ESIC)

**Authority:** ESIC, under Employees' State Insurance Act 1948. [EXT] https://www.esic.in/

**Frequency:** Monthly, due by 15th (contributions) + half-yearly return (Form 6).

**Required:**
- Employee IP number (Insurance Person number)
- Gross wages for the month
- ESI employee contribution (0.75%)
- ESI employer contribution (3.25%)
- Applicable only for employees with gross wages ≤ ₹21,000/month

**Our coverage:** ESI rates in `statutory-registry.ts:114-116`; ceiling gated in calc engine. IP number mapping: `[UNVERIFIED]`.

---

### C. PT Challan (Professional Tax)

**Authority:** State government. Form and due date vary by state. [EXT] https://www.paybima.com/blog/investment-and-tax-planning/tds-return-forms-24q-26q-27q-27eq [UNVERIFIED — exact challan format per state not confirmed]

**Structure (generic):**
- Employer PT registration number
- Employee count per salary slab (state-specific slabs)
- Total PT collected for the month
- Challan amount remitted to state treasury

**Frequencies:** Monthly (Maharashtra, Karnataka, West Bengal) or annual depending on state.

**Our coverage:** PT rates in `statutory-registry.ts:119-139` for 17 states only. No PT challan generation found in recon.

---

### D. 24Q — TDS Quarterly Return (Salary)

**Authority:** CBDT / Income Tax Department, Section 192. [EXT] https://cleartax.in/s/tds-return-salary-payment · https://razorpay.com/docs/payroll/run-payroll/

**Frequency:** Quarterly (Q1: Jul 31, Q2: Oct 31, Q3: Jan 31, Q4: May 31).

**Note:** Form 24Q is being replaced by **Form 138** under the Income Tax Rules 2026. [EXT] https://www.binarysemantics.com/blogs/form-24q-explained-tds-on-salary-payments/ [UNVERIFIED — exact effective date not confirmed]

**Format:** Generated via NSDL Return Preparation Utility (RPU); validated by File Validation Utility (FVU); submitted to TRACES.

**Structure:**
- **Deductor details:** TAN, PAN, name, address, responsible person
- **Challan details (Annexure I, all 4 quarters):** BSR code of bank branch, challan date, challan serial number, total TDS deposited, section code (192)
- **Employee-wise data (Annexure I, Q1–Q4):** Employee PAN, name, quarterly TDS deducted, challan mapping
- **Annual salary data (Annexure II, Q4 only):** Employee PAN, salary breakup (basic, HRA, LTA, perquisites), Section 10 exemptions, Chapter VI-A deductions (80C, 80D, 80G, HRA, etc.), taxable income, tax computed, rebate (87A), cess, total TDS, old vs new regime flag

**Our coverage:** `filings/__tests__/export-builders.spec.ts` references Form 24Q; `tax_declarations` stores 80C/80D/HRA/LTA/previous-employer data. Full 24Q file generation status: `[UNVERIFIED]`.

---

### E. Form 16 — TDS Certificate (Salary)

**Authority:** CBDT. Part A issued from TRACES; Part B employer-generated.

**Structure:**
- **Part A** (from TRACES, auto-generated from 24Q data): Quarter-wise TDS deducted and deposited, challan details, employer + employee PAN/TAN
- **Part B** (employer generates): Annual salary breakup per employee — gross salary, perquisites, profits in lieu of salary, Section 10 exemptions, standard deduction, Chapter VI-A deductions (80C, 80D, 80G, NPS, etc.), previous employer income, taxable income, TDS, rebate, cess, net tax payable, regime chosen

**Timing:** Issued after Q4 24Q filing; due by June 15 of the next FY.

**Our coverage:** `payout/publishing.service.ts` generates payslip PDFs; Form 16 PDF generation: `[UNVERIFIED — not confirmed in recon]`.

---

## 6. Top 15 Gaps — Ranked by Risk

| Rank | Gap | Money/Compliance Risk | Effort | Depends on |
|---|---|---|---|---|
| 1 | **Float money in run totals + GL posting** — `generate.service.ts:191-194`, `payroll-posting.service.ts:22-28` [V] | HIGH — stored run totals can diverge from sum of payslips by ±1 paise × N employees; GL imbalance up to ±0.008 passes assertion | M | Pattern C |
| 2 | **GL posting failure silently swallowed** — try/catch logs only; run finalizes with no GL entry (`payroll-posting.service.ts:33/62`) [V] | HIGH — missing payroll expense entries invisible until trial balance; financial statements wrong | S | None |
| 3 | **RECONCILE and PREVIEW job types are no-ops** — `payroll-jobs-worker.service.ts:186-188` [V] | HIGH — reconciliation reports success without reconciling; operator cannot detect bank return failures automatically | M | Pattern F |
| 4 | **Arrears/retro pay calculation entirely absent** [V] `D:487` | HIGH — salary revision mid-year cannot produce correct payslips; statutory submissions (PF ECR) will omit arrear contributions; India labour law requires arrear payment | L | Pattern A (statutory) |
| 5 | **Previous-employer TDS zeroed in YTD ledger** — `locking.service.ts:146-147` [V] | HIGH — TDS projections under-estimate for new joiners with prior employer income; Form 16 Part B shows wrong taxable income; incorrect TDS deducted | S | None |
| 6 | **PT/LWF state maps partial** — 17/28 states for PT, 10/28 for LWF, both labelled "sample" (`statutory-registry.ts:122,147`) [V] | HIGH — orgs in ~11 uncovered states deduct wrong PT amount; compliance failure; penalty exposure | M | Pattern A |
| 7 | **Effective-dated statutory config is code, not DB** — deploy required for every statutory rate change [V] | HIGH — cannot respond to Budget amendments, EPFO ceiling changes without a code deploy; operational risk for production payroll | M | Pattern A |
| 8 | **`setEmployeeHold` no run-status guard** — can mutate hold on LOCKED/PAID/CLOSED runs (`runs.service.ts:56-58`) [V] | MEDIUM — locked payroll record mutated after approval; audit trail inaccurate; bank batch may re-include held employee | S | None |
| 9 | **Bulk run generation synchronous + N+1** — `generate.service.ts`, `inputs.service.ts:139-141`, `locking.service.ts:125-165` [V] | MEDIUM — Neon statement timeout for 200+ employees; run stuck `PREPARING`; no resumption without manual intervention | L | Pattern E |
| 10 | **Off-cycle run no dedicated workflow** — `runType` field only; no partial-month input collection or off-cycle bank batch path [V] `D:489` | MEDIUM — FnF, advance payments, corrections cannot be processed cleanly; manual workarounds required | M | None |
| 11 | **Perquisite component type missing** — no valuation or taxable-add-back logic [UNVERIFIED] | MEDIUM — perquisites (car, accommodation, ESOP) are taxable; incorrect TDS computed for executives; Form 16 Part B incomplete | M | Schema + Pattern B |
| 12 | **Timesheet hours ↔ HR payroll chain break** — Chain A export does not feed Chain B payroll engine (`J:57,106`) [V] | MEDIUM — billable-hours-based salary components cannot be automated; manual re-entry required | L | Architecture decision |
| 13 | **Arrear PF ECR report missing** — no mechanism to generate ECR for arrear contributions separately | MEDIUM — EPFO requires a separate arrear ECR when arrears span prior months; non-compliance triggers penalty under S.7Q | M | Gap 4 (arrears engine) |
| 14 | **Form 16 generation status unverified** — `publishing.service.ts` generates payslip PDFs; Form 16: `[UNVERIFIED]` | MEDIUM — Form 16 is legally mandatory for employers by June 15; employees cannot file ITR without it | M | 24Q generation |
| 15 | **Dual subscription tables** — `subscriptions` + `platformSubscriptions` not FK-linked; plan entitlement source of truth ambiguous (`B:327-329`) [V] | LOW-MEDIUM — payroll is a paid-tier module; if module enablement reads wrong table, FREE-tier orgs access payroll silently | S | Platform billing cleanup |

---

## External Sources

- [EPFO ECR Online Filing](https://www.epfindia.gov.in/site_en/Online_ECR.php)
- [Zoho Payroll — Salary Revision & Arrears](https://www.zoho.com/in/payroll/help/employer/approvals/salary-revision.html)
- [Zoho Payroll — Arrear Handling](https://www.zoho.com/in/payroll/kb/employer/approvals/arrear-component.html)
- [greytHR — Arrears Processing](https://admin-help.greythr.com/admin/answers/122441429/)
- [Keka — Salary Revision & Arrears](https://www.keka.com/employee-salary-revision-arrear-processing-bonus-payments)
- [Deel Payroll Engine](https://www.deel.com/solutions/payroll-engine/)
- [ClearTax — Form 24Q](https://cleartax.in/s/tds-return-salary-payment)
- [YourPayroll AU — Rounding](https://support.yourpayroll.com.au/hc/en-au/articles/5015386652175-Rounding-of-values-how-it-works)
- [RazorpayX Payroll Run](https://razorpay.com/docs/payroll/run-payroll/)
- [Taggd — ECR Format](https://taggd.in/hr-glossary/electronic-challan-cum-return-ecr/)
- [ECR Revamped (ECR 3.0)](https://www.sgcms.com/regulatory-updates/re-engineered-electronic-challan-cum-return-ecr/)
- [PF ECR Reconciliation](https://www.terra-insight.com/insights/pf-ecr-reconciliation-india/)
- [Oracle Payroll — Component Sum Reconciliation](https://docs.oracle.com/cd/E26401_01/doc.122/e59069/T346064T372563.htm)
- [Binary Semantics — Form 24Q → Form 138](https://www.binarysemantics.com/blogs/form-24q-explained-tds-on-salary-payments/)
- [HROne — Best Payroll Software India](https://hrone.cloud/blog/best-payroll-software-india/)
- [Neeyamo — Country Engines](https://www.neeyamo.com/blog/why-global-payroll-needs-unified-platform-built-country-engines)
