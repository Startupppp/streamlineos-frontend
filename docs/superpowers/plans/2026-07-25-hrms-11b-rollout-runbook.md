# HRMS Plan 11b — Money→Cents & JSONB→Normalized Rollout Runbook

> Supersedes the scope estimate in `2026-07-25-hrms-11b-pilot.md`. The pilot (bonuses.amount_cents + one_on_one_action_items) shipped the pattern in backend commit `5db87c0`. This runbook is the **turnkey execution plan** for the rest, written so the cutover is mechanical once the stack is runnable.
>
> **Two hard gates, do not skip:**
> 1. **Money cutover is runtime-gated.** Every `*_cents` cutover must be verified end-to-end (create → payslip → FnF → report → payout file) on a running app before the old `decimal` column is dropped. tsc proves types, not paise.
> 2. **Never blast additive-only.** Each column/table goes through the full 3-phase cycle (add → backfill → cutover → drop) **one table at a time**, so no dormant, unread schema accumulates. A column that no service reads is not "done."

---

## Part A — Money `decimal` → integer cents (~60 columns)

### A.0 Why
`decimal(15,2)` in Drizzle round-trips as a JS **string**; every arithmetic site does `Number(x)` / `.toFixed()`, which invites float drift and inconsistent rounding across payslip vs FnF vs report. Integer **cents** (`bigint`, `mode:"number"`) makes money math exact and comparable. Frontend contract is unchanged — reads convert `cents / 100` at the API boundary.

### A.1 The per-column 3-phase cycle (identical for every column)

**Phase 1 — add (additive, non-breaking):**
```ts
amountCents: bigint("amount_cents", { mode: "number" }),
```
(nullable; the existing `decimal` stays the source of truth). `bigint` must be in the `pg-core` import list of the file.

**Phase 2 — generate + backfill** (`pnpm -C backend db:generate`, then append to the emitted migration, idempotent):
```sql
UPDATE <table> SET <col>_cents = ROUND(<col>::numeric * 100) WHERE <col>_cents IS NULL AND <col> IS NOT NULL;
```
Apply with `db:migrate`. Both representations now agree.

**Phase 3 — cutover (runtime-gated):** writes set `*_cents = Math.round(rupees * 100)` as source of truth; reads expose `amount = cents / 100`. Run the money paths on a live app, assert every downstream total matches to the paise.

**Phase 4 — drop (after a bake period + verification):** one migration drops the old `decimal` column; remove the field from schema + service.

### A.2 Inventory — Tier 1: paise-critical (sums into payslips / FnF / reports / payout)
Do these **first**, together, as one payroll-engine cutover so cross-table totals stay consistent within a single verification pass.

| File | Table (col) | Money columns |
|---|---|---|
| `payroll.ts` | salary_structures | basic_salary, hra, allowances, deductions, gross_salary, net_salary, overtime_amount |
| `payroll.ts` | salary_structure_config | basic_salary, allowances, deductions |
| `payroll.ts` | budgets | budget_limit |
| `payroll.ts` | payroll_components / payslip lines | amount, tax_amount, amount |
| `payroll.ts` | salary_loans | amount, emi_amount |
| `payroll.ts` | reimbursements | amount |
| `payroll.ts` | fnf_settlements | basic_dues, leave_encashment, bonus_due, deductions, loan_recovery, net_payable, reimbursements_due, asset_recovery, notice_recovery, other_deductions |
| `payroll-runs.ts` | payroll_runs | gross_total, deduction_total, employer_cost_total, net_total |
| `payroll-runs.ts` | payslips | gross, total_deductions, employer_contributions, net, net_payout_currency, amount |
| `payroll-payout.ts` | payout_batches / items | total_amount, amount |
| `payroll-workforce.ts` | comp/ctc | amount (×3), annual_ctc |
| `salary-structure-templates.ts` | salary_structure_templates | basic_salary, special_allowance, medical_allowance, travel_allowance, other_allowances, professional_tax |
| `tax.ts` | tax_declarations / proofs | hra, lta, section_80c, section_80d, section_80g, home_loan_interest, previous_employment_income, previous_employer_tds, amount |
| `payroll.ts` (bonuses) | bonuses | amount → **amount_cents already added (pilot)**; complete its cutover in this pass |

### A.3 Inventory — Tier 2: peripheral (estimates / ranges / display; not summed to the paise)
Do these **after** Tier 1, table-by-table; lower risk, so each can cut over independently.

| File | Table (col) | Money columns |
|---|---|---|
| `hiring.ts` | job_postings | salary_min, salary_max |
| `hiring.ts` | offers / approvals | bonus_amount, offered_salary (×2), proposed_salary |
| `hiring.ts` | agency invoices | invoice_amount, bill_rate, pay_rate |
| `requisitions.ts` | requisitions | budget_min, budget_max |
| `offboarding.ts` | fnf/severance | severance_amount |
| `travel.ts` | travel_requests | advance_amount, estimated_cost, per_diem |
| `assets.ts` | assets | purchase_cost |
| `job-boards.ts` | job_board_postings | spend |
| `staffing.ts` | referrals | reward_amount |

### A.4 Explicitly EXCLUDED (not money — leave as-is)
`work_hours`, `break_hours`, `accrual_rate`, `max_balance`, `carry_forward_days`, `fx_rate`, `scheduled_days`, `paid_days`, `lop_days`, `overtime_hours`/`overtime_days`, `days` (leave-ledger, payroll-inputs), `duration_hours`, `progress_pct`, `score`, `hours`, `earned_days`, `used_days`, `experience_years`, `fee_percent`, `balance`, `lat`/`lng`, `overall_rating`, `pre_rating`/`post_rating`, `target`/`weight` (kpis), `hra_percentage`/`hra_percent`/`pf_deduction_percent`, `percent`, `variance_pct`/`threshold_pct`/`recommended_pct`, `target_value`/`current_value` (generic metric values — could be counts/%; not currency).
- `allowances.value` (`decimal(10,4)`) — **ambiguous** (rate vs amount); confirm intent before touching. `allowances.cap` IS money.
- `bank-transfers.ts total_amount` — **skip**, table is disabled/slated for deletion (superseded by normalized `payroll_bank_batches`).

---

## Part B — JSONB arrays (corrected scope)

Inspecting all ~30 array-typed JSONB columns against §19's test ("is this a **lifecycle entity** needing individual index / pagination / atomic update / soft-delete?"):

### B.1 KEEP as JSONB (correct as-is — do NOT normalize)
These are config / definition / snapshot / attachment blobs, read+written as a whole:
`forms.schema`, `forms.form_schema_snapshot`, `hiring.screening_questions`, `hiring.rubric`, `hiring.available_slots`, `performance.questions`/`answers` (survey + quiz), `performance.ratings`/`goals`/`objectives` (review snapshots), `feedback.questions`/`responses`, `travel.itinerary`, `learning.tags`/`prerequisites`, `offboarding.variables`, `engagement.options`, `safety.flags`, `kpis.levels`, `*.attachments`/`documents`/`attachment_urls`, `attendance.breaks`, `automation.action_results`, `bank_transfers.entries` (table being deleted).

### B.2 NORMALIZE (genuine lifecycle entities)
| Source | Verdict |
|---|---|
| `performance.one_on_one_meetings.action_items` | **DONE (pilot)** → `one_on_one_action_items`. Complete its cutover with Part A. |
| `offboarding.exit_checklist_tasks.depends_on_task_ids` | **Optional/low-value.** A dependency-edge junction table (`onboarding_task_dependencies(task_id, depends_on_task_id)`) is cleaner if dependencies are ever queried/validated server-side. If they're only rendered client-side, JSONB is acceptable — decide when that surface is next touched. |

There is **no bulk JSONB normalization job.** The pilot covered the one clear case; everything else is either correctly JSONB or a single optional edge-list.

---

## Part C — Execution order (when the stack is runnable)

1. **Tier-1 money cutover** as ONE reviewed change: add all Tier-1 `*_cents` (Phase 1), backfill (Phase 2), cut services over (Phase 3), run the full payroll cycle on a live org, assert paise-exact across payslip/FnF/report/payout, then drop old columns (Phase 4). Ship with unit tests on every rupee↔cents converter.
2. **Tier-2 money**, table-by-table, each its own 3-phase cycle + commit.
3. **`one_on_one_action_items` cutover** (write/replace rows in the same tx; map back to `{text,done}[]` at the read boundary) + drop `action_items` JSONB.
4. **(Optional)** `depends_on_task_ids` → junction, only if server-side dependency logic is added.

Each step: additive migration first (verifiable alone), then code cutover, then drop — never the reverse, never additive-only left dangling.

## Verification gates (per money table before Phase 4 drop)
- [ ] Every write path stores `Math.round(rupees * 100)`; no residual `decimal` writer.
- [ ] Every read/DTO exposes `cents / 100`; frontend contract byte-identical.
- [ ] Unit test per converter (round-half-up, negative FnF recoveries, null handling).
- [ ] Live run: create → run payroll → payslip → FnF → report → bank/payout file all reconcile to the paise.
- [ ] Grep confirms zero remaining readers of the old column before the drop migration.
