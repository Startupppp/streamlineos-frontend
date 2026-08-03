# Payroll Module — Master Audit & Change Map (2026-07-26)

> Read-only audit of the entire Payroll domain (schema · API · frontend), produced by 6 parallel
> expert reviews, then **hand-verified** for false positives. Every claim below is tagged
> **CONFIRMED** (verified against real code) or **DISPROVEN** (audited claim that is a false positive).
> This is the "what needs to change" map. Execution is sliced, security-first, audit→fix→verify→commit,
> one slice at a time with confirmation (CLAUDE.md §0.3, §3).

---

## 0. Architecture reality (the big picture)

Payroll is **not** "legacy vs modern duplicate systems". It is **one live engine spread across three
schema generations that depend on each other**, plus one genuinely separate export feature.

| Layer | Schema location | Role | Verdict |
|---|---|---|---|
| **Gen-1** | `db/schema/hr/payroll.ts` | `payrolls`, `salaryStructures` (simple payslip/structure) + co-located `expenses`/`reimbursements`/`salaryLoans`/`bonuses`/`fnfSettlements`/`assetReturns` | Mixed: `payrolls`/`salaryStructures` = deprecate-after-migration; the rest = **LIVE-KEEP** |
| **Gen-2** | `db/schema/hr/payroll-runs·policies·payout·workforce·inputs.ts` | The run engine core (runs, run-employees, line items, exceptions, approvals, policies, salary profiles, bank batches, input staging) | **LIVE-CORE** (misnamed folder; these are canonical) |
| **Gen-3** | `db/schema/payroll/**` | Extension layer: entities, periods, TDS ledger, statutory rules, journal outbox, command receipts, tax windows, payslip publications, jobs — **FK into Gen-2** | **LIVE-CORE** |
| **Separate** | `db/schema/projects/timesheet-payroll.ts` | Export timesheet hours → external payroll providers (Zoho/RazorpayX/ADP) | **KEEP SEPARATE** (own RBAC ns `timesheets:payroll:*`; not a duplicate) |

**Consequence:** the "remove unnecessary schema" goal is *small*. Almost nothing is dead. The schema
work is quality (normalize the JSONB bomb, FKs, tenant-scoped uniques, enums, indexes), not deletion.

### Confirmed dead code (safe to remove)
1. **`frontend/types/hr/payroll.ts`** — 237 lines, **zero import sites** anywhere in the frontend. Delete. Also carries a duplicate/conflicting `Incentive` type.
2. **`bank_transfers` table + `BankTransfersService` + controller** — write path already throws `GoneException`; the `/payroll/bank-transfers` page already reads `payrollBankBatches`. Remove controller → service → table (after confirming no org needs the legacy read).
3. Deprecate-after-migration (NOT delete now — cross-module, 5–7 callers): `payrolls`, `salaryStructures` tables + the old `/hr/payroll/salary-structures` endpoint. Out of scope for a payroll-only pass.

---

## 1. Security & correctness — CONFIRMED vs DISPROVEN

### DISPROVEN (false positives — do NOT "fix")
- **Guard override on Fnf/Calendar/TaxAdmin controllers.** NestJS *accumulates* controller-level + method-level `@UseGuards`; `JwtAuthGuard` at the class is not dropped when a method adds `PermissionGuard`. Verified in `fnf.controller.ts`. → at most a P2 style tidy (put both guards on the class).
- **`filings.attachAcknowledgement` cross-tenant write.** Verified `filings.service.ts:347` reads scoped by `and(id, orgId)` and throws `NotFound` before the update. Not exploitable. Adding `orgId` to the UPDATE is defense-in-depth only (P2).
- **Payslip `downloadPdf` read-before-authorize.** Verified `publishing.service.ts:379` projects only metadata columns and rejects cross-org non-owners before loading any financial data. Already correct.

### CONFIRMED — P0/P1 (fix)
| ID | Finding | Location | Rule |
|---|---|---|---|
| SEC-1 | `loans` + `reimbursements` pages gate on `requireSession()` only, not `requirePermission()` | `payroll/loans/page.tsx:9`, `payroll/reimbursements/page.tsx:9` | §0.5, §20 A01 |
| SEC-2 | **Zero `enabled: useCan(...)` RBAC gates** on ~50 `useQuery` across all payroll hooks → 403-spam + wasted Neon CPU for any role lacking `payroll:*`; especially globally-mounted surfaces | all `hooks/api/payroll/*.ts` | §11 |
| SEC-3 | **`@RequireModule("payroll")` absent on every payroll endpoint.** Decorator is real (`common/rbac/require-module.decorator.ts`, used by 20+ modules). Payroll is paid-only (§16) → FREE-tier module-gating gap | all payroll controllers | §16, §21 |
| SEC-4 | `useReimbursements()` fires with no `enabled` gate (pairs with SEC-1) | `features/payroll/reimbursements/reimbursements-page.tsx:75` | §11 |
| SEC-5 | AI explain line-item fetch not org-scoped (`where: eq(runEmployeeId)` only) — low sev (needs cross-contamination) but should scope | `payroll-ai-explain.service.ts:89` | §20 A01 |
| SEC-6 | `PayoutEmployeeBankController.getBankDetails` returns fully **decrypted** account number (not masked) to any `payroll:bank:view` holder | `payout-batches.service.ts:881` | §20 A03 |

---

## 2. Backend API — CONFIRMED findings

### Correctness / data-integrity (P0)
| ID | Finding | Location |
|---|---|---|
| API-1 | `generateRunLocked` runs a **per-employee sequential loop inside one transaction** (upsert + line items + exceptions + 4 updates each) → ~2.5k–5k serial round-trips for 500 emps; will time out on Neon. Needs batched bulk upserts | `runs/generate.service.ts:124-267` |
| API-2 | `reimportInputs` calls `pullAttendanceInputs` **per employee in a sequential loop inside a txn** | `runs/inputs.service.ts:138-147` |
| API-3 | `publish()` renders payslip PDFs **serially per employee** (Puppeteer) + N+1 `findFirst` for existing pub; unbounded employee fetch → OOM/timeout at scale | `payout/publishing.service.ts:100-270` |
| API-4 | `importBankReturn` calls `markItemPaid/Failed`+`checkRunCompletion` per CSV row (~5 queries each) instead of one txn | `payout/payout-batches.service.ts:766-810` |
| API-5 | Loan-adjustment create triggers a **synchronous full-run recalc inside the HTTP request**, unguarded, response says `ok` even on failure | `runs/loan-adjustments.service.ts:60` |
| API-6 | `PayslipTemplatesService.list` and `PayrollTemplatesService.list` **INSERT (seed) inside a GET handler** (unsafe GET + race on empty table) | `payout/payslip-templates.service.ts:14`, `setup/templates.service.ts:86` |
| API-7 | Non-transactional delete-then-insert of profile components (corrupts on partial failure); non-transactional read-modify-write of `fxRates` (TOCTOU) | `runs/profiles.service.ts:328`, `setup/policies.service.ts:378` |
| API-8 | `payroll-posting.service.ts` uses `parseFloat`/`toFixed(4)` float math for ledger money instead of integer paise (`money.ts` exists) | `payroll-posting.service.ts:22-30` |

### Efficiency (P1)
- Reports `getLineItemsForRun` fetches **all** line items then filters dept/cost-center **in JS**; every report endpoint re-fetches independently; no Redis cache (`insights/lib/report-builders.ts:59`, `insights/reports.service.ts`).
- Unbounded lists (no pagination): `inputs`, `policy versions`, `entities`, `filings`, `profile history`, `exceptions` (hard `limit(1000)`), `listPublications`, `getBatch` items, `ManagerInbox` payslips.
- Count via full-ID fetch instead of `COUNT(*)` (`setup/templates.service.ts:115`).
- `select()` with no column projection on hot paths (`generate`, `filings.loadStatutorySources`, `profiles.getProfile`, `ess.getBankDetails`).
- No Redis caching on the frequently-polled `command-center` aggregate.

### Quality (P1/P2)
- **Inline Zod schemas in controllers** (must move to `dto/*-schema.ts` per §7): `entities.controller.ts:20`, `filings.controller.ts:23-38`, `runs/exceptions.controller.ts:28`, `tax-admin.controller.ts:28`, `manager-inbox.controller.ts:11`.
- **`reports.controller.ts` hand-rolls `parsePagination`** (no Zod on query params) — should use `ZodValidationPipe` like the other controllers.
- **`TaxAdminController` issues DB queries directly** (fat controller, no service) — §18 violation.
- **AI explain uses `invokeText`, not `invokeTextWithUsage`** → no `aiUsage` meta returned; `AiUsageChip` has no data (§16 contract). Fix required.
- **FnF statement download returns unsanitized raw HTML as `text/html`** (wrong content type + XSS surface) — should render like payslips (`fnf.service.ts:105`).
- Many `as PayrollToggles/PayrollPolicyConfig/CalculationSnapshot` JSONB casts (§7 "never force types") — read via a shared validated accessor.
- `runs.controller.ts:52` `POST /runs` uses `payroll:runs:update` not `:create` (semantic; verify catalog).
- Dead param `targetUserId` in `reimportInputs`.

---

## 3. Schema — CONFIRMED findings

### The #1 scale risk (needs a decision — see §6)
- **`payrollRunEmployees.inputsSnapshot` + `calculationSnapshot` JSONB blobs** (`hr/payroll-runs.ts:89-90`). At enterprise employee counts these become the dominant row payload and can't be queried/indexed/aggregated. Normalized equivalents already exist (`payrollInputs`, `payrollLineItems`).
  - **Recommendation:** KEEP `calculationSnapshot` as an *immutable reproducibility snapshot* (payslip regeneration must reproduce historical numbers even after components change — same rationale as `payrollPolicyVersions.config`); **investigate dropping `inputsSnapshot`** if it fully duplicates `payrollInputs`. Not a blind "delete".

### Referential integrity (P0, safe additive fixes)
- **Missing FKs (bare integers):** `payrollRunAllocations.runId`, `payrollTdsYtdLedger.runId`, `payrollRuns.entityId`, `payrollRuns.periodId`. Add `.references(...)`.

### Tenant isolation / uniqueness (P0/P1, safe additive fixes)
- **Bare global `.unique()`** → make composite `uniqueIndex(orgId, …)`: `timesheetSettings.orgId` (column-level `.unique()`), `payrollBankBatches.idempotencyKey`.
- **Cross-tenant unique** `uniq_payrolls_user_month(userId,month)` → add `orgId`.
- **`hrPayrollInputSnapshots`** unique + index should lead with `orgId`.
- **Nullable `orgId` without CHECK:** `payrollStatutoryRuleSets.orgId`, `payrollTemplates.orgId` → add `CHECK (is_system OR org_id IS NOT NULL)`.

### Indexes / types (P1)
- Missing/`orgId`-leading composite indexes: `salaryStructures`, `payrolls (orgId,userId)`, `reimbursements (orgId,status)`/`(orgId,userId)`, `payrollBankBatchItems (orgId,userId)`.
- **Raw-text `status`** should be pg enums: `payrollRunEmployees`, `bonuses`, `assetReturns`, `payrollFilings`, `timesheetExports`.
- **`bonuses` dual money columns** (`amount decimal` + `amountCents bigint`) with no constraint they agree.
- **`payrollPeriods.calendarSnapshot`** JSONB working-day data → normalizable child table (P1, defer).

### Platform-wide (NOT payroll-local — see §6 decision)
- **Money as `decimal(15,2)` across 40+ columns** vs integer paise (§19). Only TDS ledger + `hrPayrollAdjustments.amountCents` comply.
- **All 47 tables use `serial` PK** vs `generatedAlwaysAsIdentity()`.
- No `deleted_at` soft-delete on lifecycle tables (`salaryLoans`, `reimbursements`).

---

## 4. Frontend — CONFIRMED findings

### Structure / states (§9, §15)
- **`payroll/team/page.tsx`** — 439-line `"use client"` in `app/`, **missing `loading.tsx` AND `error.tsx`**. Extract to `features/payroll/team/team-page.tsx`; add skeleton + error boundary. (Biggest single cleanup.)
- **`payroll/me/page.tsx`** (176 ln) and **`settings/import-export/page.tsx`** — business JSX inline in `app/`; extract to feature components; import-export also missing `loading.tsx`/`error.tsx`.
- `payroll/page.tsx` (349 ln) — dashboard, acceptable as route entry but monitor.

### PageWrapper / design (§14, §15)
- **`backHref` on top-level nav pages** `/payroll/runs`, `/payroll/employees` (+ their loading skeletons) → remove.
- **Bare row-count subtitles** on Employees ("N profiles") + Templates ("N templates") → descriptive subtitle.
- **Raw numeric ID in UI**: settings page subtitle `Policy #${id}` → name.
- **`StatCardGrid cols={4}` with a conditionally-rendered card** on `/payroll/me` → compute cols from real child count.
- `salary-structures/loading.tsx` subtitle ≠ real page subtitle (text shift).

### Responsiveness (§14)
- **Reports (4 filters) + Reimbursements (3 filters) don't collapse to a mobile Drawer** → use `ResponsivePopover`/Drawer `< md`.

### Hooks / TanStack (§10, §11)
- **SEC-2** (RBAC gates) — see §1.
- **`useCreateLoanAdjustment` has NO cache invalidation** → stale run/employee breakdown until reload.
- **11 hook files use private query-key factories** that don't match the central `queryKeys.payroll.*` (some drop the `"streamlineos"` root) → cross-module invalidation silently no-ops. Consolidate into the factory.
- **`useActivatePolicy` invalidates the entire `queryKeys.payroll.all` namespace** → scope to a `policyAll` sub-key.
- No exported `queryOptions` per entity; inline `[...payroll.all, "runs"]` key construction; `keepPreviousData` on ungated queries.
- **Toast calls inside hook `onSuccess/onError`** (`payroll-inputs.ts`, `timesheets/payroll.ts`) → move to call sites.
- `useEffect`-driven debounced-search → URL sync (§10 anti-pattern) in `components-page`, `templates-page`.
- Duplicate/conflicting `Incentive` type (`bonuses-admin.ts:36` vs dead `types/hr/payroll.ts:120`).

### Reusable-component extraction (§8, user rule 5)
Confirmed duplication → extract to shared:
1. **`downloadBlob(blob, filename)`** — 6 copy-pasted implementations (`reports`, `tax-admin`, `filings`, `publications`, `fnf`) → `lib/download-blob.ts`.
2. **Money formatter** — reuse existing `features/payroll/shared/payroll-format.ts` everywhere (legacy inline formatters remain).
3. **Payroll status/worker-type chips** — consolidate `run-status-badge`, `period-status-chip`, inline `WORKER_TYPE_COLORS`.
4. **Run stage-action panels** (submit/approve/lock/mark-paid/publish) — 5 near-identical → one primitive.
5. **Calculation line-item table** (breakdown-sheet vs ess-salary-section).
6. **Paginated admin-list shell** (search + `DataTable` + server pagination) repeated in employees/loans/fnf/bonuses/taxes.
7. **`MonthPicker`** — exists; verify all callers use it (default `yearRange` excludes past months — bug for retro reports).

### AI inline (user rule 12, §15)
- Fix the existing AI explain endpoint to `*WithUsage` + surface `AiUsageChip`.
- Add inline `AiActionsMenu` on detail surfaces where it reduces effort (run variance narrative, payslip explain-for-employee already exists, FnF summary) — draft-first, credit-metered, `useCan`-gated. Only where genuinely useful.

---

## 5. Proposed slice plan (security-first; each slice = audit → fix → build+lint+types → commit)

- **Slice 1 — Backend security & module gating.** SEC-1 (requirePermission on loans/reimbursements), SEC-3 (`@RequireModule("payroll")` on all controllers), SEC-5/6 (org-scope AI line items; mask bank), inline-Zod→`dto/*-schema.ts`, `reports` Zod query validation, TaxAdmin → service.
- **Slice 2 — Frontend RBAC gates & hook correctness.** SEC-2/SEC-4 (`enabled: useCan(...)` + `useModuleEnabled("payroll")` on every gated query), `useCreateLoanAdjustment` invalidation, private key-factory consolidation, `useActivatePolicy` scoping.
- **Slice 3 — Backend correctness/perf.** API-1..8: batch the generate/publish/reimport/import loops, transactional profile/fxRates writes, remove GET-that-inserts (seed on setup/migration), integer-paise posting, report dept/cost-center filters into SQL + command-center cache.
- **Slice 4 — Schema hardening (payroll-local, additive).** Missing FKs, composite tenant-scoped unique indexes, `orgId`-leading indexes, enum-ify status columns, CHECK constraints, `bonuses` money dedup. One migration per concern; `generate` → `migrate`.
- **Slice 5 — Frontend structure & states.** Extract `team`/`me`/`import-export` from `app/`; add missing `loading.tsx`/`error.tsx`; remove `backHref`; fix subtitles/IDs/StatCardGrid; skeleton parity.
- **Slice 6 — Responsiveness & reusable components.** Mobile filter Drawers; `downloadBlob`; chips; stage-action primitive; admin-list shell; MonthPicker parity.
- **Slice 7 — Dead code + AI polish.** Delete `types/hr/payroll.ts`; remove `bank_transfers` surface; AI `*WithUsage` + `AiUsageChip` + selective inline `AiActionsMenu`.
- **Deferred (platform program, not this pass):** money `decimal→integer paise`, `serial→identity`, soft-delete, deprecating `payrolls`/`salaryStructures` tables + `/hr/payroll/salary-structures`, `calendarSnapshot` normalization.

---

## 6. Pending decisions (need confirmation before executing)
1. **Execution approach** — sequenced security-first program (recommended) vs a single vertical end-to-end vs frontend-first.
2. **Platform-wide schema migrations** (money→paise, serial→identity, legacy-table deprecation) — defer to the platform schema program for cross-module consistency (recommended) vs include for payroll now vs schema out of scope.
3. **JSONB snapshots** — keep `calculationSnapshot` (reproducibility), investigate `inputsSnapshot` dedup (recommended) vs normalize both vs leave as-is.
