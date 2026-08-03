# C2 — Payroll, Time-to-Pay & GL Posting Change Map

**Date:** 2026-07-31 · **Lane:** C2 (Payroll engine, GL, time-to-pay) · **Mode:** PLANNING ONLY — no code written.

**Evidence convention.** Every `file:line` was opened and read in this session. `[V]` = verified by direct read. `[CA]` = CA/payroll-professional sign-off required before live data change. `[OPS]` = operator decision (product/commercial).

**Scope note.** This plan covers:
1. Statutory config as data (P-02)
2. Partial state coverage (PT/LWF)
3. Money arithmetic end-to-end (P-04)
4. GL integrity
5. Run immutability
6. Fake-success jobs / outbox stub
7. Compliance data loss (previous-employer TDS)
8. Arrears/retro engine (new feature)
9. Time-to-pay disconnected chains
10. Queue/chunking
11. Test gaps

---

## 1. Change Map Rows

> Column order: `ID | Layer | Target file:line | Category | Severity | Current | Problem (+rule ref) | Fix | Breaking?+migration | Blast radius | Depends on | Batch`

### Batch 1 — Statutory Config as Data (P-02) · CA-gated before data load

---

**C2-01** | Backend-schema | `backend/src/db/schema/payroll/` (new files) | Architecture | P0 | No effective-dated statutory DB table exists; all PF/ESI/PT/LWF/TDS rates are TypeScript literals compiled into the binary | A Budget change (e.g. ESI ceiling ₹21k→₹25k) requires a code deploy. Partial state coverage admitted in source. Direct H12 violation, §19. | Create `payroll_statutory_rate_params` table (`id uuid`, `org_id uuid nullable`, `country char(2)`, `state_code varchar(8)`, `param_key varchar(64)`, `value_type`, `value_numeric numeric(18,6)`, `effective_from date NOT NULL`, `effective_to date`, `source_url text`, `source_type`, `notes`) + `payroll_statutory_rate_slabs` table for slab schedules (income tax, PT slabs). Seed system rows from existing `IN_STATUTORY_2025_04` and `IN_STATUTORY_2026_04` bundles at correct effective dates **after CA sign-off** (see C2-03). | New migration; non-breaking additive; existing TypeScript bundles stay live until `StatutoryConfigService.loadBundle()` is wired. | All payroll engine callers | None | 1

---

**C2-02** | Backend-service | `backend/src/modules/payroll/runs/lib/statutory-registry.ts:101-210` | New-service | P0 | Statutory bundles are TypeScript `const` objects; engine resolves via `getIndiaBundleForMonth()` which compares a hard-coded date string | As above — no ops path for rate updates. R2 Pattern A. | Replace `getIndiaBundleForMonth()` implementation with a DB lookup via new `StatutoryConfigService.loadBundle(orgId, country, state, month)`. The existing `IndiaStatutoryBundle` TypeScript shape becomes the deserialized form of DB rows. Keep the existing TS constants as the seeder source (no values changed here). | Non-breaking at API level; bundle resolution switches from compile-time to DB query. Add integration test for bundle resolution. | Engine callers of `getIndiaBundleForMonth` (4 call sites in `runs/lib/`) | C2-01 (table must exist) | 1

---

**C2-03** | Backend-data | `backend/src/modules/payroll/runs/lib/statutory-registry.ts:101-253` | Data-integrity | P0-CA | **Bundle-dating anomaly — `[UNVERIFIED — CA sign-off required]`.** `IN_STATUTORY_2025_04.effectiveFrom = "2025-04-01"` (line 103) carries **6-band TDS slabs** (₹3L/7L/10L/12L/15L, rebate ₹25k, limit ₹7L) — pre-Budget 2025 values. `IN_STATUTORY_2026_04.effectiveFrom = "2026-04-01"` (line 221) carries **7-band slabs** (₹4L/8L/12L/16L/20L/24L, rebate ₹60k, limit ₹12L). According to R4 research (secondary sources), Budget 2025 raised the zero band to ₹4L, added the 25% slab, and doubled the rebate, **effective 1 April 2025 (FY2025-26)**, not 1 April 2026. If correct, every FY2025-26 payroll run computed TDS on the wrong slab structure. | **Do not change TDS slabs or effective dates without CA verification.** The code change is: (a) once CA confirms the correct effective date, update the DB seed row so the 7-band slab set has `effective_from = '2025-04-01'` instead of `'2026-04-01'`; (b) add a `notes` column entry recording the CA sign-off date and reference. The TypeScript source constants are read-only documentation after C2-01/C2-02 land. | **[CA sign-off required before any data change.]** DB row update only; no code change to engine. | All historical FY2025-26 runs would retroactively use different slabs if re-locked — **flag this to the operator for each affected org before enabling recalculation** | C2-01, C2-02 | 1

---

**C2-04** | Backend-data | `backend/src/modules/payroll/runs/lib/statutory-registry.ts:120-140` | Compliance | P0-CA | PT `byState` map covers 17 states; comments at `:120` read "Sample state map — not full India matrix; legal review required for production PT." [V] | Orgs in ~11 uncovered states silently receive the default ₹200/month PT regardless of actual PT obligation. States wrongly charged ₹200 (no PT): HR `:131`, PB `:131`, RJ `:132`, UP `:134`. States wrongly at ₹0 (levy PT): KL `:138`, BR `:136`, AS `:139`. States with slab structure simplified to flat: MH, KA, WB, GJ, AP, TS, TN. **All values [UNVERIFIED — CA sign-off required].** | For each state entry in the DB slab table (C2-01), populate: (i) correct `state_code` per ISO 3166-2:IN; (ii) `effective_from`; (iii) `source_url` to the state commercial-tax portal; (iv) `source_type = 'SECONDARY'` with CA review note. Wire engine to resolve PT via `getStatutoryParam('IN', state, 'pt.*', runMonth)`. Zero-deduction states get an explicit ₹0 row. Remove invalid `TL` key (line 127 — no state with code TL; Telangana = `TS`). | DB seed rows only; no schema change beyond C2-01. | All IN payroll orgs deducting PT. Affects net pay visible to employees. | C2-01, C2-02; [CA sign-off] | 1

---

**C2-05** | Backend-data | `backend/src/modules/payroll/runs/lib/statutory-registry.ts:146-158` | Compliance | P0-CA | LWF `byState` map covers 10 states (labelled "Sample state map — not full India matrix" at `:146`). Known wrong values [V from R4, secondary sources]: KA `empFixed:"20.00", erFixed:"40.00"` (revised to ₹50/₹100 annually in 2025); WB `erFixed:"15.00"` (revised to ₹30 in Jan 2024); DL `empFixed:"0.75", erFixed:"2.25"` (should be ₹2/₹5). Missing states: AP, TS, GA, CG, OR, CH. **All values [UNVERIFIED — CA sign-off required].** | Populate correct LWF amounts per state in the `payroll_statutory_rate_params` DB table (C2-01) with `effective_from` dates. Engine resolves `lwf.employee_fixed_rupees` / `lwf.employer_fixed_rupees` from DB. Add `frequency` (`MONTHLY | HALF_YEARLY | ANNUAL`) to support states with annual-only deduction (KA). | DB seed rows only. Affects employer cost lines on payslip and payroll journal. | All IN payroll orgs with LWF deductions | C2-01, C2-02; [CA sign-off] | 1

---

**C2-06** | Backend-schema | `backend/src/db/schema/hr/salary-structure-templates.ts:14-15` | Schema | P1 | Column defaults `pf_deduction_percent = "12"` and `professional_tax = "200"` baked into the Gen-1 template schema default values [V B-schema:272-276] | A statutory rate change (PF ceiling increase, PT rate change) requires a schema migration to fix these defaults. Violates §19 (no hardcoded statutory rates). | Remove hardcoded `default("12")` and `default("200")` from Drizzle column definitions. Update template-seeder service to read from `StatutoryConfigService` instead. | Migration to drop column defaults (additive — columns remain, just no default). | Gen-1 salary structure template creation; existing rows unaffected. | C2-01 | 1

---

**C2-07** | Backend-service | `backend/src/modules/payroll/setup/dto/setup.schemas.ts:77,80` | Config | P1 | Zod schema defaults `pfWageCeiling = "15000.00"` and `esiWageCeiling = "21000.00"` hardcoded at lines 77 and 80 [V B-schema:261-270] | Stale defaults ship in the binary; a ceiling change requires a code deploy to update policy wizard defaults. | Remove hardcoded defaults from Zod schema. Populate wizard initial values from `StatutoryConfigService.loadBundle()` at policy setup time. | Non-breaking Zod schema change; no migration required. | Policy setup wizard; existing policy rows unaffected. | C2-01, C2-02 | 1

---

**C2-08** | Backend-service | `backend/src/modules/payroll/runs/lib/statutory.ts:202-222` | Architecture | P2 | Country dispatch is conditional branching: `if (config.statutoryPack && config.statutoryPack.country !== "IN") → calcStatutoryFromPack()` else India default. Adding a new country requires modifying `statutory.ts`. [V D:403-412] | Rigid dispatch; violates open-closed principle. P-03 / R2 Pattern B. | Replace `if/else` dispatch with a `Map<string, StatutoryPack>` registry. Extract `calcStatutoryIndiaFromRegistry` into `india.pack.ts` implementing a `StatutoryPack` interface with `calc()` and `validateInputs()`. The dispatch becomes `PackRegistry.getOrThrow(country).calc(inputs, bundle)`. Existing non-IN packs (`statutory-packs.ts`) register themselves in the map. | No API or schema change; pure internal refactor. | `statutory.ts` callers (3 call sites in `runs/lib/`); all existing packs must implement interface. | C2-02 | 2

---

### Batch 2 — Money Arithmetic (P-04)

---

**C2-09** | Backend-service | `backend/src/modules/payroll/runs/generate.service.ts:191-194` | Bug | P0 | Run-level totals accumulate via `parseFloat()` across employees: `grossTotal += parseFloat(snapshot.totals.gross)` [V direct read] | IEEE-754 float drift accumulates across N employees. Stored `payrollRuns.netTotal` can disagree from sum of per-employee `net` strings by ±1 paise at scale (verified in D-payroll-engine §7). Violates §19 (money as integer minor units). | Replace float accumulator with integer paise: add `totals.grossPaise` (integer) to `CalculationSnapshot`; use `BigInt` accumulation (`grossTotalPaise += BigInt(emp.snapshot.totals.grossPaise)`); convert back to string via `fromPaise()` only at the final `payrollRuns` upsert. | Non-breaking (snapshot shape gains new integer field; existing float fields deprecated alongside). Affects no DB schema (existing `decimal(15,2)` columns store the same string value). | `generate.service.ts`, `generate-pipeline.service.ts`, `calculation-engine.ts`; downstream: `payroll-posting.service.ts` (passes amounts to GL) | None | 2

---

**C2-10** | Backend-service | `backend/src/modules/payroll/runs/lib/calculation-engine.ts` | Bug | P0 | No residual allocation after per-component rounding [V D:345-354]. Per-employee calc is integer paise, but `Σ(rounded components) ≠ target net` by up to `(N_components − 1)` paise per employee due to rounding | Component sums on the payslip do not equal displayed net — violates the basic payslip invariant. R2 Pattern C; §19. | After computing all components: `residualPaise = targetNetPaise − Σ(roundedComponentPaise)`. If non-zero, add to the component with the highest `roundedPaise` (typically Basic). Persist `residualPaise` on `payrollRunEmployees` for audit. | Non-breaking (new field on snapshot; display same to user). | `calculation-engine.ts`; golden-file test `snapshot-replay.spec.ts` **must be regenerated** after this change. | C2-09 (integer totals) | 2

---

**C2-11** | Backend-service | `backend/src/modules/payroll/payroll-posting.service.ts:22-28` | Bug | P0 | Amounts arrive as strings; converted via `parseFloat()` before float arithmetic: `const totalExpense = (grossNum + employerCostNum).toFixed(4)` [V direct read] | Float contamination enters the GL before reaching the BigInt-based `FinancePostingService`. Amounts in journal lines may differ from paise-accurate per-employee figures. §19. | Pass paise integers directly: change signature of `postFinalized()`/`postPaid()` to accept `grossPaise: number, deductionsPaise: number, netPaise: number, employerCostPaise: number`. Construct journal line amounts via `fromPaise()` immediately before the `postJournal` call. | Signature change propagates to call sites in `run-lock.service.ts` / `generate.service.ts` (2 callers). Non-breaking API. | `payroll-posting.service.ts`, `payout-run-completion.ts` callers | C2-09 | 2

---

**C2-12** | Backend-service | `backend/src/modules/payroll/payout/payout-batches.service.ts:203` | Bug | P0 | Bank batch total: `const totalAmount = itemsData.reduce((s, i) => s + parseFloat(i.amount), 0).toFixed(2)` [V direct read] | Stored `payrollBankBatches.totalAmount` may not exactly equal sum of individual item amounts due to float reduction. Affects bank reconciliation matching. §19. | Change to: `const totalAmountPaise = itemsData.reduce((s, i) => s + Math.round(parseFloat(i.amount) * 100), 0)` then `fromPaise(totalAmountPaise)`. Or use BigInt accumulation if items carry paise fields (preferred after C2-09). | Non-breaking. | `payout-batches.service.ts` | C2-09 | 2

---

**C2-13** | Backend-service | `backend/src/modules/payroll/payout/lib/payout-csv.ts:35` | Bug | P1 | Bank file line amounts: `const amt = parseFloat(amount).toFixed(2)` [V direct read] | Float formatting of money in the actual bank disbursement file. Amount in file may differ from stored integer by floating-point rounding artefact. | Change to: accept `amountPaise: number`, compute `amt = (amountPaise / 100).toFixed(2)`. Update callers to pass paise. | Non-breaking; change propagated to `payout-batches.service.ts` formatPayoutLine calls. | `payout-csv.ts`, `payout-batches.service.ts` | C2-09 | 2

---

### Batch 3 — GL Integrity

---

**C2-14** | Backend-service | `backend/src/modules/payroll/payroll-posting.service.ts:33-65` | Bug | P0 | `try { await this.posting.postJournal(...) } catch (err) { this.logger.error(...) }` — all GL posting errors swallowed. [V direct read at :62] | Payroll run finalizes successfully but has no GL entry. Missing entries are invisible until a trial balance is run. Finance statements are wrong. F-09. | Remove the `try/catch` swallow. Let `postJournal` errors propagate. Options: (a) propagate to caller so the lock transaction fails and the run stays `APPROVED` (not `LOCKED`) — safest; (b) use a transactional outbox (requires C2-26 / outbox fix). Recommended: propagate and retry. If the GL period is closed, surface a domain error that the operator can act on. | Non-breaking at DB level; changes run-lock failure semantics (lock fails → run stays `APPROVED` instead of silently succeeding). Add operator alert mechanism. | `payroll-posting.service.ts`, `run-lock.service.ts` (caller of `postFinalized`) | C2-11 | 3

---

**C2-15** | Backend-service | `backend/src/modules/accounting/core/journal-posting.service.ts:188-203` | Bug | P0 | `assertBalanced()` uses `reduce((acc, l) => acc + l.debit, 0)` — pure float accumulation. Tolerance is `diff > 0.009` [V direct read] | Real imbalances up to ±0.008 pass validation. All invoice/bill GL postings go through this path. F-10. | Change `DraftLine.debit` and `DraftLine.credit` from `number` to `string` (rupee string from DB). Inside `assertBalanced()`, convert via `Math.round(parseFloat(d) * 10000)` → integer (0.0001 precision) before reducing. Remove the `> 0.009` tolerance — use exact integer equality. | Changes `DraftLine` interface — impacts all callers of `JournalPostingService.persistJournalEntry()` (~6 invoice/bill services). Requires coordinated update. | `journal-posting.service.ts`, `invoices-write.service.ts`, `purchase-bills`, `accounting-ledger.service.ts` | None (independent of payroll money fixes) | 3

---

**C2-16** | Backend-schema | `backend/src/db/schema/accounting/accounting.ts:69-100` | Schema | P0 | No DB-level constraint enforcing Σdebit=Σcredit per journal entry [V from K recon §3]. `journal_lines` has no CHECK constraint or trigger. | A service bug bypassing `assertBalanced()` or a direct DB write silently corrupts the ledger. §19, §20. | Add a Postgres deferrable CONSTRAINT (using a trigger or a CHECK on a computed column). Preferred: a `BEFORE INSERT` trigger on `journal_entries` that validates `SUM(debit) = SUM(credit)` across `journal_lines` for the same `entry_id`. Or add `total_debit decimal(18,4)` and `total_credit decimal(18,4)` columns with a `CHECK (total_debit = total_credit)` updated atomically during line insert. | New migration; non-breaking addition. | All journal-entry writers | None | 3

---

**C2-17** | Backend-service | `backend/src/modules/accounting/core/accounting-ledger.service.ts:329-407` | Bug | P1 | `reverseJournalEntry()` creates a reversing entry but never sets the original entry's `status` to `VOID` [V direct read :382-405]. Original stays `POSTED`. | Trial balance and audit trail show both POSTED entries economically canceling but neither flagged as reversed. `reversedEntryId` is not linked on the original. F-23. | Inside `reverseJournalEntry()`, after `persistJournalEntry()` succeeds: (1) `UPDATE journal_entries SET status = 'VOID', reversedBy = persisted.id WHERE id = entryId AND orgId = orgId`; (2) set `reversalEntryId` on the original. Wrap the `persistJournalEntry` + status update in a single transaction. | Non-breaking for well-formed entries. Requires the same transaction used by `FinancePostingService.reverseJournal()` already does this correctly (line 512) — make the manual path match. | `accounting-ledger.service.ts` | None | 3

---

### Batch 4 — Run Immutability

---

**C2-18** | Backend-service | `backend/src/modules/payroll/runs/runs.service.ts:35-58` | Bug | P0 | `setEmployeeHold()` has no run-status guard. It checks only that the `runEmployeeId` belongs to the org, then updates `holdReason` unconditionally. [V direct read at :55-58] | A user with `payroll:runs:manage` can mark/clear hold on `APPROVED`, `LOCKED`, `PAID`, or `CLOSED` runs — mutating an immutable payroll record. F-22, §0.5 (run immutability). | Before the UPDATE at `:55`, add: `const run = await db.select({status}).from(payrollRuns).where(and(eq(payrollRuns.id, runId), eq(payrollRuns.orgId, orgId))); if (PAYROLL_LOCKED_STATUSES.includes(run[0]?.status)) throw new ConflictException("Cannot modify a locked run")`. | Non-breaking for callers in valid states; new `ConflictException` for locked-run callers. | `runs.service.ts`; `runs.controller.ts` (POST `/hold`) | None | 4

---

**C2-19** | Backend-service | `backend/src/modules/payroll/payout/publishing.service.ts:284-286` | Bug | P1 | `totalEmployees = employees.length` uses the **filtered** subset when `userIds` is passed, but `allPublications.length >= totalEmployees` compares against the count of ALL run publications. [V direct read at :280-286] | Publishing 3 of 10 employees can trigger `allPublished = true` → run advances to `PAYSLIPS_PUBLISHED`, locking out the other 7 employees. D:557. | Fix the comparison: use the actual count of all run employees (query `payrollRunEmployees WHERE runId = ? AND orgId = ?`) as the denominator regardless of whether a `userIds` filter was applied. | Non-breaking fix. | `publishing.service.ts` | None | 4

---

**C2-20** | Backend-service | `backend/src/modules/payroll/payout/approvals.service.ts:86,133` | Security | P1 | Two `UPDATE payrollRuns` statements use `.where(eq(payrollRuns.id, runId))` without `orgId`: auto-approve path (line 86) and submit-to-pending path (line 133). [V direct read] | TOCTOU gap: prior `findFirst` checked org ownership, but the write itself is unscoped. Defense-in-depth failure per §20. In normal operation unexploitable; a future race or service bypass could cause cross-tenant run mutation. | Add `and(eq(payrollRuns.id, runId), eq(payrollRuns.orgId, orgId))` to both UPDATE WHERE clauses. | Non-breaking. | `approvals.service.ts` | None | 4

---

**C2-21** | Backend-service | `backend/src/modules/payroll/payout/locking.service.ts:68` | Security | P1 | `lock()` UPDATE uses `.where(eq(payrollRuns.id, runId))` without `orgId`. [V direct read at :67-70] | Same TOCTOU pattern as C2-20. D:556. | Add `and(eq(payrollRuns.id, runId), eq(payrollRuns.orgId, orgId))` to the WHERE clause. | Non-breaking. | `locking.service.ts` | None | 4

---

### Batch 5 — Fake-Success Jobs / Outbox Stub

---

**C2-22** | Backend-service | `backend/src/modules/payroll/jobs/payroll-jobs-worker.service.ts:186-189` | Bug | P0 | `case "PREVIEW": case "EXPORT": case "RECONCILE": return { ok: true, note: "… no-op handler" }` [V direct read] | Reconciliation reports success without reconciling. Preview (dry-run variance) and Export no-ops mean operators cannot detect bank return failures automatically. F-12, R2 Pattern F. | (a) **RECONCILE**: implement `ReconciliationService.reconcileBankReturn(jobPayload)` — parse bank return CSV (reuse existing `bank-return.ts` parser), match each row to `payrollBankBatchItem` by `transactionRef`, batch-update matched items `PAID`, unmatched items `RETURNED`, write `payroll_disbursement_recon` rows. (b) **PREVIEW**: implement variance diff per employee vs prior run (C2-37 depends on this for arrears). (c) **EXPORT**: implement filing export. Each must be a proper implementation, not a stub. | Requires new `payroll_disbursement_recon` table (new migration). | `payroll-jobs-worker.service.ts`; new `reconciliation.service.ts`; `payroll_disbursement_recon` schema | None | 5

---

**C2-23** | Backend-service | `backend/src/modules/payroll/jobs/payroll-jobs-worker.service.ts` (job polling loop) | Bug | P0 | The `tick()` poll every `POLL_MS` reclaims `PENDING` jobs, but there is no stale-lock timeout for `RUNNING` jobs. If a worker process crashes mid-job the job stays `RUNNING` forever. [V: `payroll_job_status` enum `PENDING|RUNNING|SUCCEEDED|FAILED|DEAD_LETTER` exists; no `claimStale()` method found] | Crashed jobs hold the advisory lock indefinitely. The run stays `PREPARING` or `IN_PROGRESS` and can never be retried without manual DB update. P-10. | Add `jobs.claimStale(staleLimitMs = 10 * 60 * 1000)` that UPDATEs `payroll_jobs SET status = 'FAILED', errorMessage = 'stale-timeout'` WHERE `status = 'RUNNING' AND updatedAt < NOW() - staleLimitMs`. Call from `tick()` before `claimPending()`. | Non-breaking addition to job poller. | `payroll-jobs-worker.service.ts`, `payroll-jobs.service.ts` | None | 5

---

**C2-24** | Backend-service | `backend/src/common/outbox/outbox-publisher.service.ts:111-115` | Bug | P0 | `deliver()` method is a `logger.debug` stub — marks events `DELIVERED` without dispatching [V direct read at :111-114] | Every event inserted into the outbox is claimed and marked delivered without being sent. F-11. Any future event-driven bridge (C2-29 timesheet→payroll) built on this outbox will silently never fire. | Implement `deliver()` to actually dispatch the event: (a) read `event.eventType` + `event.payload`; (b) publish to the appropriate transport (HTTP webhook, internal NestJS `EventEmitter2`, or Redis pub/sub depending on the subscription registered); (c) return on success; (d) throw on failure so the retry loop marks the event `FAILED` (not `DELIVERED`). | Breaking change to semantics only — no new API. The set of event types currently emitted is small; audit all `outbox.insert()` call sites to confirm expected consumers. | All outbox event emitters across all modules; `payroll_run_events` (append-only audit log) is separate and not affected | None | 5

---

### Batch 6 — Compliance Data Loss

---

**C2-25** | Backend-service | `backend/src/modules/payroll/payout/locking.service.ts:146-147` | Bug | P0 | `writeTdsYtdLedger()` always writes `previousEmployerIncomePaise: 0` and `previousEmployerTdsPaise: 0` [V direct read at :146-147] | The per-employee `taxDeclarations.previousEmploymentIncome` and `previousEmployerTds` are read correctly by `calculation-engine.ts:334` for TDS projection, but the YTD ledger stores zeros, making the ledger permanently wrong for mid-year joiners. Form 16 Part B shows incorrect taxable income. D:558. R2 Gap #5. | In `writeTdsYtdLedger()`, join `payrollRunEmployees` with `taxDeclarations` to read `previousEmploymentIncome` and `previousEmployerTds`. Convert via `toPaise()`. Write these values into the upsert. Add to the `onConflictDoUpdate` SET clause so retroactive re-locks correct the ledger. | Non-breaking; only affects NEW locks after the fix lands (existing ledger rows remain wrong — add a backfill migration for affected fiscal years). | `locking.service.ts`, `payrollTdsYtdLedger` schema (no change), `tax_declarations` join | None | 6

---

### Batch 7 — Time-to-Pay

---

**C2-26** | Architecture | (both chains — no single file) | Design | P1 | Two entirely disconnected time capture chains: **Chain A** (timesheets → hours export → external payroll systems); **Chain B** (HR attendance punch → payroll inputs → internal payroll engine). Chain A never feeds Chain B. [V J:57,106] | An employee with 40h in timesheets shows 0 payable days in internal payroll. F-20. | **Decision required [OPS]:** (a) keep chains separate and document clearly that Chain A is for external payroll only; (b) wire Chain A into Chain B via an `hr.timesheets.period.approved` outbox event consumed by `PayrollInputsBuildService` to populate `billableHours` in `hrPayrollInputSnapshots`. Option (b) requires C2-24 (real outbox). If (b): add event handler in `payroll-inputs` module listening for the approved event; map hours to `payroll_inputs.billable_hours`. | Architecture decision gating. | `timesheets/` module, `hr/payroll-inputs/`, outbox | C2-24 (outbox) | 7

---

**C2-27** | Backend-service | `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts:394-402` | Design | P1 | Snapshot rebuild is `DELETE + INSERT` in one transaction [V direct read]. No version history; prior snapshot is discarded on every rebuild. | No audit trail of why a snapshot changed between payroll runs. Operator cannot investigate a changed payroll input figure. §19 (append-only). | Change to: (a) keep the `hrPayrollInputSnapshots` current snapshot insert/overwrite (efficiency), AND (b) append a row to `hr_payroll_input_snapshot_history` (new table: same schema + `replacedAt timestamptz`, FK to the period + `version integer`) before each rebuild. Alternatively, stamp a `version` column on the existing table and use soft-delete (set `supersededAt`). | New table or new column; migration required. | `payroll-inputs-build.service.ts`, `hr_payroll_input_snapshots` schema | None | 7

---

**C2-28** | Backend-service | `backend/src/modules/timesheets/core/timer.service.ts:271+282` | Bug | P1 | `createEntry()` at line 271 opens its own internal transaction. A separate transaction at line 282 marks the timer `CONVERTED`. [V direct read at :271-287] | Crash between the two transactions leaves the entry in DB + timer still `OPEN` → double-conversion is possible on next timer stop/convert. J:280. | Merge both operations into a single `db.transaction()`: (1) inside that transaction call `entries.createEntry()` passing the open `tx`; (2) inside the same transaction, update `timerSessions` to `CONVERTED`. `createEntry` must accept an optional `tx` parameter. | Minor refactor; non-breaking. | `timer.service.ts`, `entries.service.ts` (add `tx?` param) | None | 7

---

### Batch 8 — Queue / Chunking (N+1 / Async Generation)

---

**C2-29** | Backend-service | `backend/src/modules/payroll/runs/inputs.service.ts:139-141` | Performance | P2 | `reimportInputs()` has N+1: `for (const row of toReset) { const pulled = await pullAttendanceInputs(this.db, orgId, row.userId, month) }` — 100 employees = 100 serial DB round-trips [V direct read at :139-142] | Sequential awaits for large orgs cause slow response and risk Neon statement timeout. D:562. | Batch all `userId` values and call `pullAttendanceInputs` in parallel: `await Promise.all(toReset.map(row => pullAttendanceInputs(this.db, orgId, row.userId, month)))`. Or rewrite `pullAttendanceInputs` to accept `userIds[]` and do a single query. | Non-breaking; behavior identical. | `inputs.service.ts`, `pullAttendanceInputs` helper | None | 8

---

**C2-30** | Backend-service | `backend/src/modules/payroll/payout/locking.service.ts:125-165` | Performance | P2 | `writeTdsYtdLedger()` does N+1 inside a DB transaction: `for (const emp of emps) { await tx.insert(payrollTdsYtdLedger).values(...).onConflictDoUpdate(...) }` [V direct read at :125-165] | 100 employees = 100 sequential inserts inside a single transaction, risking Neon statement timeout for large orgs. D:562. | Batch the upsert: use a single `tx.insert(payrollTdsYtdLedger).values(rows).onConflictDoUpdate(...)` where `rows` is the entire employee array pre-mapped to value objects. Drizzle's `.values([...])` accepts an array. | Non-breaking; semantically identical. | `locking.service.ts` | C2-25 (add previousEmployer fields to batch upsert at the same time) | 8

---

**C2-31** | Backend-service | `backend/src/modules/payroll/runs/runs.controller.ts:133` | Performance | P2 | `generateRun()` is synchronous on the HTTP request. For 500 employees, the entire generation + DB transaction runs inline on a single HTTP handler. [V D:421-428] | Neon statement timeout ceiling for large orgs; no progress visibility; no resumption after crash. The `payroll_jobs` table already exists (Gen-3, `entities-periods.ts:161`) but is not wired to on-demand generation. P-10, R2 Pattern E. | Change `POST /runs/:runId/generate` to: (1) enqueue a `payroll_jobs` row of type `GENERATE` with chunk cursor in `payload` JSONB; (2) return `202 { jobId, status: 'PENDING' }`. Worker processes employees in chunks of ~50, committing each chunk. Add `GET /runs/:runId/jobs/:jobId` for UI polling. The existing `PayrollRunLockService` remains the concurrency guard for the async worker. | **API change**: endpoint now returns 202 instead of 200+result. Frontend hook must poll. Coordinate with FE team. | `runs.controller.ts`, `runs.service.ts`, `payroll-jobs-worker.service.ts`, `payroll-jobs.service.ts`, `payroll_jobs` schema (add `progress` + chunk cursor) | C2-23 (stale lock cleanup) | 8

---

### Batch 9 — Test Gaps

---

**C2-32** | Tests | `backend/src/modules/payroll/runs/lib/__tests__/` | Testing | P0 | No parallel-run/known-good comparison test exists. `snapshot-replay.spec.ts` replays a frozen fixture but only verifies determinism against itself — not against an independent computation. [V O:246-253] | Phantom non-determinism (e.g. ambient `new Date()` contamination) would not be caught. | Add `parallel-run.spec.ts`: given identical `InputsSnapshot` and bundle, call `calcEngine.compute()` twice concurrently → assert `JSON.stringify(result1) === JSON.stringify(result2)` (excluding `computedAt`). | No code change; test only. | `runs/lib/__tests__/` | None | 9

---

**C2-33** | Tests | `backend/src/modules/payroll/runs/lib/__tests__/money.spec.ts` | Testing | P1 | No rounding-accumulation test: sum of per-line rounded amounts is never verified to equal stated totals across a multi-employee run. [V O:253] | Float drift in run totals (C2-09) would not be caught by existing tests. | Add test: generate N synthetic employees each with a known fractional salary; call `calcEngine.compute()` for each; sum `netPaise` as BigInt; compare to run-level total. Assert zero difference. | No code change; test only. | `money.spec.ts` or new `run-total-integrity.spec.ts` | C2-09 (adds paise fields to snapshot; test must use them) | 9

---

**C2-34** | Tests | `backend/src/modules/payroll/` | Testing | P1 | No cross-tenant payroll isolation test: no spec verifies that org A's payroll data cannot be read or written by org B's credentials. [V O:242, §7] | Cross-org payroll data access is untested. | Add `cross-tenant-payroll.spec.ts`: create two orgs; generate a run for org A; assert that org B cannot `getRunEmployees`, `getRun`, `getVariance`, or `setEmployeeHold` for org A's runId. Assert `NotFoundException` (not `ForbiddenException`) to confirm opaque IDs. | No code change; test only. | New spec file | None | 9

---

### Batch 10 — Arrears / Retro Engine (New Feature)

---

**C2-35** | Architecture | (new module) | Feature | P0 (gap) | Arrears/retro pay calculation is entirely absent. No `arrear` or `retro` keywords exist in the payroll module. [V D:487] | Backdated salary revisions are routine in India. A revision effective from an earlier month cannot be paid correctly at all. PF ECR for arrear months is missing. R2 Gap #4. | **This is NEW FEATURE work, not a bug fix. Scope separately.** Design: (a) `payroll_arrear_runs` table linking to the triggering salary-profile revision and the affected period(s); (b) compute per-employee delta: `revised_component_paise − original_component_paise` for each effective period; (c) include arrear totals as `ARREAR_EARNINGS` line items in the current run's payroll; (d) recalculate PF/ESI on the arrear wage; (e) generate a separate arrear ECR file for EPFO. | Requires effective-dated salary-revision tracking (employee_salary_profiles must gain `effectiveFrom` + revision-audit history). New tables + new migration. | New sub-module `payroll/arrears/`; `employee_salary_profiles` schema; `payroll_line_items` type enum; ECR filing service | C2-01 (statutory DB), C2-08 (pack registry), C2-09 (integer paise), effective-dated salary design (separate track) | 10

---

## 2. Risk Register

| Risk | Likelihood | Impact | Mitigation | Early-warning signal |
|---|---|---|---|---|
| **Wrong pay reaches an employee** (float drift, wrong PT state, wrong TDS slab) | MEDIUM — confirmed float bug; PT/TDS discrepancies verified | CRITICAL — legal, financial, reputational | C2-09/C2-10 fix float; C2-04/C2-05 fix PT; C2-03 CA confirmation for TDS | Trial-balance variance alert (C2-14); `payrollRuns.netTotal ≠ SUM(payrollRunEmployees.net)` monitoring query |
| **A statutory filing is wrong** (24Q/Form 138, ECR, PT challan) | HIGH — confirmed: previous-employer TDS zeroed (C2-25), PT states wrong (C2-04), FY2025-26 slabs possibly wrong (C2-03) | CRITICAL — CBDT/EPFO penalties, prosecution risk | C2-25 fix previous-employer YTD; C2-03/C2-04 CA sign-off + data correction | Quarterly reconcile: `payrollTdsYtdLedger.previousEmployerIncomePaise = 0` for non-zero `taxDeclarations.previousEmploymentIncome` rows |
| **GL silently missing after payroll lock** | MEDIUM — the swallow at `:62` is confirmed live | HIGH — financial statements wrong | C2-14 (propagate error) | Alert when `payrollRuns.status = 'LOCKED'` and no `journal_entries` row with `sourceType='PAYROLL_RUN' AND sourceId=runId` exists within 60s |
| **Crashed generation job leaves run stuck `PREPARING` forever** | MEDIUM — no stale-lock timeout confirmed | MEDIUM — payroll operators blocked; must DBA-fix | C2-23 (stale-job timeout) | Alert on `payroll_jobs WHERE status='RUNNING' AND updatedAt < NOW() - interval '15 minutes'` |
| **Reconciliation reports success without reconciling** | CONFIRMED — C2-22 no-op handler | HIGH — bank returns silently unprocessed; employees stay unpaid | C2-22 (implement RECONCILE handler) | Alert on `payrollBankBatchItems WHERE status='SENT' AND updatedAt < NOW() - interval '3 days'` |
| **Outbox events delivered to nobody** | CONFIRMED — C2-24 stub | LOW immediate (no consumers wired); HIGH once bridge is built | C2-24 implement delivery | Unit test asserting deliver() calls downstream transport |
| **CA sign-off never obtained; TDS slabs changed prematurely** | MEDIUM | CRITICAL — incorrect TDS deducted | Block C2-03 DB data change behind a feature flag; require dual-approval | Separate tracking ticket with CA name and sign-off date required before merge |
| **Arrears not computed; incorrect TDS YTD after salary revision** | HIGH (common Indian HR scenario) | HIGH — employee tax underpaid; Form 16 wrong | C2-35 arrears engine (Batch 10) | Alert when `employee_salary_profiles.effectiveTo` is set mid-fiscal-year with no arrear run created |
| **Previous-employer income zeroed — TDS under-deducted for joiners** | CONFIRMED — C2-25 | HIGH — employee owes TDS at ITR filing; employer liable | C2-25 fix + backfill | Query: `payrollTdsYtdLedger WHERE previousEmployerIncomePaise=0 JOIN taxDeclarations WHERE previousEmploymentIncome > 0` |
| **Float GL balance tolerance ±0.008 allows ledger corruption** | CONFIRMED — C2-15 | HIGH — trial balance fails silently | C2-15 (exact integer check), C2-16 (DB constraint) | Alert when `ABS(SUM(debit) - SUM(credit)) > 0` per `journal_entries` group |

---

## 3. Sequencing Constraints

```
Batch 1 (Statutory DB tables + service wiring)
  └─ must land before Batch 1 data loads (C2-03/C2-04/C2-05) — CA sign-off gates the data rows
  └─ must land before Batch 10 (arrears engine reads statutory params)

Batch 2 (Integer paise — C2-09 first, then C2-10, C2-11, C2-12, C2-13)
  └─ C2-09 must land before C2-10 (residual needs paise fields in snapshot)
  └─ C2-09 must land before C2-11 (GL posting takes paise integers)
  └─ C2-09 must land before C2-33 (rounding accumulation test uses paise fields)
  └─ Batch 2 must land before Batch 3 (GL float fix makes most sense after money fix)

Batch 3 (GL integrity) — can be done in parallel with Batch 4
  └─ C2-14 (propagate posting error) should land AFTER C2-11 (so amounts are correct before we stop swallowing errors)
  └─ C2-15 (balance check) can land independently
  └─ C2-16 (DB constraint) must land after all existing imbalanced rows are fixed (run audit first)

Batch 4 (Run immutability) — independent, can land first or concurrently with Batch 2
  └─ No hard dependencies; C2-20/C2-21/C2-22/C2-23 are all standalone

Batch 5 (Fake jobs/outbox)
  └─ C2-24 (real outbox) must land before C2-26 (time-to-pay bridge) can use it
  └─ C2-22 (RECONCILE handler) should land after C2-09 (so reconciled amounts are paise-accurate)
  └─ C2-23 (stale lock) should land before C2-31 (async generation relies on correct stale-lock cleanup)

Batch 6 (Compliance data loss — C2-25) — independent, land early
  └─ Add the backfill migration for historical YTD rows at the same time

Batch 7 (Time-to-pay) — depends on C2-24 for bridge option
  └─ C2-26 (chain decision) requires OPS decision before any code
  └─ C2-28 (timer split-write) is independent — land early in Batch 7

Batch 8 (Queue/chunking)
  └─ C2-31 (async generation) must land after C2-23 (stale lock cleanup) — async gen needs stale cleanup to be safe
  └─ C2-29/C2-30 (N+1 fixes) are independent

Batch 9 (Tests) — can be written against any batch once the code changes are in place
  └─ C2-33 test must wait for C2-09 paise fields to exist in snapshot

Batch 10 (Arrears — new feature) — gated behind: Batch 1, C2-09, effective-dated salary design
```

---

## 4. Parallel-Run Plan

### Goal
Prove the refactored engine produces **zero numeric variance** from the current engine before any payroll operator trusts it.

### Fixture population
1. Take the existing golden-file fixture `runs/lib/__tests__/fixtures/replay-fixture.ts` + `replay-expected.json`.
2. Expand with 3 additional synthetic fixtures (generated deterministically — no `new Date()` in amounts):
   - **Fixture-A**: 200-employee run with mixed PF/ESI/PT states (includes MH, KA, DL, HR, KL, UP). Covers the PT partial-coverage states.
   - **Fixture-B**: 5 employees with previous-employer income declared (tests C2-25).
   - **Fixture-C**: 1 employee on new-regime TDS; 1 on old-regime TDS. Tests both slab sets.

### Comparison method
1. Run the **current engine** (unmodified) against each fixture → save output as `expected-{A,B,C}.json`.
2. Apply changes **one batch at a time**. After each batch, run the same fixtures and compare:
   - `grossPaise`, `netPaise`, `deductionsPaise` per employee must be **exactly equal** (BigInt comparison).
   - `totals.grossTotal` as string must match after `fromPaise(BigInt sum)` conversion.
3. Any diff triggers a code review — not a bypass.

### Bundle-dating anomaly handling
- Fixture-A uses the `IN-2025.04` bundle (current engine path).
- After C2-03 (CA-confirmed), re-run Fixture-A using the corrected `IN-2025.04` bundle (Budget 2025 slabs).
- **This will legitimately produce a diff** in TDS amounts for employees earning ₹3L–₹12L.
- The diff is expected, documented, and signed off by CA — it represents real TDS corrections for affected orgs.
- Before deploying C2-03 to production, run per-org impact reports: how many employees were affected and by how much.

### Tolerance
- **Monetary: zero tolerance.** `netPaise` must be bit-identical between current and refactored engine for all non-statutory-rate changes.
- **Residual (C2-10)**: the residual allocation changes the distribution of paise among components but must not change `netPaise`. Assert `Σ(component_paise) === netPaise` in the new output; also assert that the current engine's `Σ(component_paise) ≠ netPaise` (proving the bug was real) while the new engine's matches.
- **Audit metadata** (`computedAt`, `bundleVersion`): allowed to differ; excluded from comparison.

---

## 5. Items Requiring USER / CA / OPERATOR Decisions

| ID | Item | Who decides | Blocker for |
|---|---|---|---|
| [CA-01] | Are the `IN_STATUTORY_2026_04` TDS slabs (7-band) correctly dated — do they apply from 1 April 2025 or 1 April 2026? | Indian CA / payroll professional | C2-03 data change |
| [CA-02] | PT exact slabs for states: KL (half-yearly), AS, BR (annual), JH, SK, MN, MZ, ML, TR | Indian CA | C2-04 data load |
| [CA-03] | LWF: DL revised amounts (₹2/₹5 vs ₹0.75/₹2.25); HR CPI-indexed current figure; AP/TS/GA/CG/OR amounts | Indian CA | C2-05 data load |
| [CA-04] | Whether FY2025-26 payroll runs that used the wrong slab must be corrected (re-lock) or can be grandfathered | CA + product owner | C2-03 retroactive scope |
| [CA-05] | Gratuity ₹20L ceiling enforcement: does existing FnF code need to cap the provision or only the settlement? | Indian CA | C2-06 (gratuity ceiling — not tracked as a separate row but follows from data design) |
| [OPS-01] | **Time-to-pay bridge decision**: keep Chain A (timesheets) separate from Chain B (HR payroll) or wire via outbox events | Product owner | C2-26 |
| [OPS-02] | After C2-25 fix: should historical YTD ledger rows for mid-year joiners be retroactively corrected via a backfill migration? | Engineering + tax advisor | C2-25 migration scope |
| [OPS-03] | **Async generation (C2-31)**: what chunk size (50 vs 100 employees per commit) and poll TTL are acceptable for the frontend UX? | Product owner | C2-31 |
| [OPS-04] | **Arrears engine (C2-35)**: should arrears be included in the same run or as a separate off-cycle arrear run? Keka/Zoho use same run; greytHR uses separate batch. | Product owner | C2-35 |

---

*End of C2 — Payroll, Time-to-Pay & GL Posting Change Map.*
