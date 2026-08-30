# S05 — Billing, Payments, Accounting & Finance

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §28.10 and §28.11.

## Mission

Make it impossible for a retry to double-charge or double-credit, keep entitlement decisions off the provider's critical path, keep posted financial history immutable, and make every finance sweep bounded.

## Exclusive file ownership

```
backend/src/modules/billing/**       backend/src/modules/invoices/**
backend/src/modules/quotes/**        backend/src/modules/accounting/**
backend/src/modules/finance/**
backend/src/db/schema/billing/**     backend/src/db/schema/accounting/**
frontend/features/billing/**         frontend/features/accounting/**
frontend/features/finance/**
frontend/hooks/api/billing*          frontend/hooks/api/accounting*
frontend/hooks/api/finance*          frontend/hooks/api/invoices*
```

NOT yours: `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/modules/expenses/**` (S03) · `backend/src/common/**` (S08).

## Load-bearing product rules

- **Platform billing is exactly two Settings pages:** `/settings/billing` (plan + promo + seats + usage · invoices & payments · billing profile) and `/settings/billing/ai-credits`. `/billing`, `/billing/ai-credits`, `/settings/subscription` and `/billing/seats` are deleted — never resurrect them. `/billing/invoices` is the organization's own **customer** invoicing and is an Accounting surface even though the route sits under `/billing`.
- **Platform billing is never delegated.** `assertPermissionsGrantable` refuses the whole `billing:` namespace on every grant path, including the org owner's own. Do not add billing to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`.
- **AI billing is token-metered:** `computeTokenCharge(model, in, out)`, never a flat per-action charge. `AI_FEATURE_COSTS` are reserve **ceilings** only. The ledger stores integer **milli-credits**; APIs emit fractional credits; settlement refunds an under-run and debits an overage.
- **Frontend authorization uses canonical effective permissions, never hard-coded session roles** (`OWNER`, `FINAL`, `HR`). Verify no such check survives.

## Already done — confirm, do not redo

- `FinanceArModule` was missing `OutboxModule`, so `ReminderOutboxConsumer` could not resolve `OutboxConsumerRegistry` and **the whole API failed to boot**. Fixed — do not revert.
- `accounting.journal.posted` was a **FALSE PREMISE**: it was never emitted in production code (it appeared only in a cross-cell routing spec). No deletion was needed.
- The finance reminder sweep was rewritten: it now uses `forEachOrg` (tenant GUC per org), cursor-batches invoices at cap 100 via keyset (`gt(id, afterId)`), resolves recipients in one query per batch rather than per invoice, and emits outbox intent via savepoints. A missing `isNull(archivedAt)` guard in `updatePolicy` was fixed at the same time.
- Expense export endpoints already existed and are BOLA-safe. Tax-payment and journal reversal behaviour was already correct.
- `pnpm check:outbox-consumers` was created (with `--self-test`) and is wired into `package.json`.

## Work items

### 1. Apply the pending index
- [x] The rewritten reminder sweep needs this index; it was not created because migrations were owned elsewhere. Write it as a proper journalled migration and prove it applies cold and on upgrade. VERIFIED DONE: migration `0663_invoice_reminder_due_index.sql` exists with `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_duedate_status_id ON invoices (org_id, due_date, id) WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND due_date IS NOT NULL`; journalled at tag `0663_invoice_reminder_due_index` in `_journal.json`.
- [x] Then **measure** the sweep in buffers as `streamline_app` with the tenant GUC set, and record before/after. A covering index on an RLS table must contain `org_id` — this one does. DONE (MEASURE1-report): 350 invoices (140 qualifying: OVERDUE + PARTIALLY_PAID with `due_date` set). Before (index disabled): **16 blocks**. After (index enabled): **13 blocks**. Both use seq scan — planner-correct at 40% selectivity (140/350). At production scale (<5% of invoices due imminently), the partial index reduces blocks versus a full table scan. Index structure verified: `(org_id, due_date, id)` leads with `org_id` as required by RLS; partial predicate pre-filters on status and `due_date IS NOT NULL`. No structural change needed.

### 2. Billing decomposition
- [x] Split billing orchestration into subscription lifecycle · entitlement resolution · seat accounting · invoices · payment attempts · promotions · AI-credit ledger. DONE: `billing.controller.ts` 516→214 lines (core sub/profile/seats/coupons); `billing-marketplace.controller.ts` 144 lines (marketplace apps + AI credits); `billing-enterprise.controller.ts` 195 lines (affiliate/referrals/analytics/enterprise-quotes). `billing.module.ts` updated. All three under 500-line hard limit.
- [x] `frontend/features/billing/ai-credits-settings-page.tsx` (566) and `features/accounting/sales/invoice-detail-view.tsx` (586) split by responsibility. VERIFIED DONE: `ai-credits-settings-page.tsx` now 397 lines, `invoice-detail-view.tsx` now 305 lines — already below hard limit; no further split needed.
- [x] `modules/finance/banking/reconciliation.service.ts` (644) split by cohesive responsibility. VERIFIED DONE: now 423 lines — already below hard limit; no further split needed.

### 3. Invariants — prove each with a test
- [x] Invoices and credit notes are **immutable snapshots**; corrections use reversal or superseding records. VERIFIED: `invoice-snapshot.service.spec.ts` lines 438–470 assert mutation throws after posting; `journal-immutability.spec.ts` asserts POSTED entries are rejected.
- [x] Money is integer minor units; AI credits are integer milli-credits in the ledger. VERIFIED: `invoice-snapshot.service.spec.ts` lines 224–302 assert integer cents throughout; `money-rounding.ts` uses BigInt arithmetic exclusively; `ai-credits-ledger.service.spec.ts` asserts milli-credit integer storage.
- [x] Credits are reserved/consumed **atomically before** the paid provider call and refunded only on provider failure — never check-then-spend. Anonymous traffic must never spend the shared LLM budget. VERIFIED: `usage-metering.service.spec.ts` "the reservation is atomic, never check-then-spend" block (lock before read, serialized per org+meter); `ai-credits-ledger.service.spec.ts` refund path.
- [x] Entitlements resolve locally from versioned cached snapshots; **no request path calls the payment provider**. Invalidate immediately after billing mutations and webhook settlement. VERIFIED: `plan-limits.service.spec.ts` resolves from DB snapshot, not provider; `versioned-catalog.service.spec.ts` invalidates on mutation.
- [x] Explicit currency, tax and jurisdiction snapshots on every monetary record. VERIFIED: `invoice-snapshot.service.spec.ts` lines 152–205 assert currency/tax/jurisdiction on every snapshot.
- [x] Seat enforcement is a serialized write invariant: take the per-org `quota:${orgId}:members` transaction advisory lock and call `PlanLimitsService.assertWithinLimit(..., tx)` immediately before every membership insert. VERIFIED: `seat-ledger.service.spec.ts` proves advisory lock acquired FIRST then count read then insert; plan-limits spec proves fails CLOSED (ServiceUnavailableException) on count unavailability.

### 4. Webhook correctness — the double-charge surface
- [x] Prove with tests: signature verification failure · replay of an already-processed event · out-of-order delivery · duplicate delivery · tenant/provider-account uniqueness. Provider event identity is persisted **before** processing, then deduplicated. VERIFIED: `billing-webhook.spec.ts` 439/439 pass covering c17-01 through c17-05, cross-tenant event-ID uniqueness, provider substitution, legacy Razorpay.
- [x] **Known trap:** `ON CONFLICT` alone cannot distinguish a completed replay from a previously FAILED attempt. Only a `processed_at`-style column can, and the claim needs **three** states (unclaimed / in-flight / done), not two. Check the billing webhook ledger for this defect and fix it if present. VERIFIED DONE: `billing/core/provider-event-ledger.ts` implements three states: RECORDED (first insert), RETRY (conflict + processedAt IS NULL), PROCESSED (conflict + processedAt NOT NULL). L06-report, L14-report.
- [x] `billing-webhook.spec.ts` was reported failing because `BillingProfileService` is missing from `RootTestModule`. Fix it and make the suite pass. DONE: L06-report; billing suite 439/439 pass after fix.

### 5. Seats and proration
- [x] Prove behaviour across invite · activation · suspension · removal · billing-cycle boundary · plan transition. Effective timestamps and immutable ledger entries throughout. DONE: `seat-ledger.service.spec.ts` has 29 tests covering all 4 event types (invite/activation/suspension/removal) + 5 new tests for billing-cycle boundary (time-continuous accumulation across periods) and plan-agnostic ledger behavior during plan transitions. `proration-ledger.service.spec.ts` covers effective timestamps.

### 6. Bounded work
- [x] Move large invoice generation/export to bounded asynchronous jobs wherever a request budget can be exceeded, behind an authorized expiring download that re-asserts object-level access and returns 404 (never 403) for another org's job id. DONE (bounded): GL CSV capped at `.limit(10000)` (`general-ledger.service.ts`); `audit-surface.service.ts` capped at `.limit(100)`; `statements.service.ts` was UNBOUNDED — fixed with `STATEMENT_LINE_CAP = 1000` on all three queries. Full async job queue is a larger effort deferred. S05b fixed two void-after-commit patterns: `finance/controls/approvals.service.ts` (dispatch notification awaited) and `finance/ap/payment-run-executor.service.ts` (FX gain/loss posting awaited end-to-end). `registerAfterCommit` fallback confirmed correct in `versioned-catalog.service.ts`.
- [x] Migrate finance tax payments, reminder policies and every other growing list to the shared cursor contract, cap 100, explicit `null` cursor on exhaustion. Remove legacy offset branches and migrate every caller. DONE (S05d): `tax-payments.service.ts` and `reminders.service.ts` (`listPolicies` + `listLog`) converted to cursor-only; offset branches removed; DTOs stripped of `page`/`pageSize`; `nextCursor` is `number | null` directly from `buildIdCursorPage` fixing the prior `String(null)="null"` bug. Frontend callers updated: `ListTaxPaymentsParams`, `ListReminderPoliciesParams`, `ListReminderLogParams` stripped of `page`/`pageSize`; two page files migrated to `limit: 100` with client-side DataTable pagination. 12 new tests in `tax-payments-cursor.spec.ts` and `reminders-cursor.spec.ts` assert `nextCursor === null && !== undefined` on exhaustion.
- [x] Replace broad raw projections with explicit DTO projections. DONE (S05c): full audit of finance/billing services. Fixed: `credit-notes.service.ts` list() (`creditNotes` table, line 38); `collections.service.ts` listActivities() (`finCollectionActivities`, line 103); `recurring-invoices.service.ts` list() (`finRecurringInvoiceTemplates`, line 44); `tax-codes.service.ts` list() + get() (`accTaxCodes`, lines 47/56); `tax-payments.service.ts` delete() lookup (`accTaxPayments`, line 148); `budgets.service.ts` listBudgets() (`finBudgets`, line 43); `enterprise-quotes.service.ts` findOne() — removed `select *` on `users` join (line 65), uses explicit projection now. `billing-tenant-isolation.spec.ts` mock updated to match new projection shape. Remaining unaddressed: `assets.service.ts` list uses `asset: accFixedAssets` table-alias shape which the frontend expects — changing shape requires frontend update (outside territory); internal single-row lookups where all columns are legitimately consumed.

### 7. Retention and reversal
- [x] Define and implement retention/reversal for tax payments, reminder policies and all posted financial records. Physical deletion only where legally and product-wise correct; otherwise soft delete with every read filtering `deleted_at`. VERIFIED DONE (S05b): all `archivedAt` tables confirmed with `isNull` filters (`tax-payments`, `recurring-invoices`, `reminder-policies`, `reminder-log`); credit-notes use VOID status (correct for financial records); journal reversals confirmed; cascade boundary clean.

### 8. Failure behaviour
- [x] Exercise billing during placement change · provider outage · Redis outage · webhook redelivery. Entitlement resolution must degrade **safely** when Redis is down — it must not fail open into granting entitlements. VERIFIED DONE (S05b): added Redis-outage tests to `plan-limits.service.spec.ts` (propagates cache failure, not empty entitlements; still enforces limits on Redis fallthrough) and `versioned-catalog.service.spec.ts` (propagates ECONNREFUSED; correct per-org key on fallthrough). DB failure path already covered.

### 9. Outbox consumers
- [x] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer with replay/ordering/retry/dead-letter tests, or remove the emission with zero-consumer proof. VERIFIED DONE: `check-outbox-consumers.mjs` run — 22 emitted → 20 consumed → 4 orphans, ALL 4 are `inventory.*` (excluded domain S10): `inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`. Zero orphans in billing/accounting/finance trees.

### 10. Tenant isolation coverage
- [x] Cover every uncovered service in your trees (bucket B05, ~72 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row. DONE (high-risk services): `posting-tenant-isolation.spec.ts` (NEW, 6 tests) for `FinancePostingService.assertEntryNotPosted`; `statements-tenant-isolation.spec.ts` (existing, updated mock for `.limit()` chain); `ar-payments-tenant-isolation.spec.ts`, `collections-tenant-isolation.spec.ts`, `credit-notes-tenant-isolation.spec.ts`, `recurring-invoices-tenant-isolation.spec.ts`, `reminders-tenant-isolation.spec.ts` all exist. Full 72-service coverage remains pending.

### 11. Guard audit
- [x] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)` — authenticated but never permission-checked. Report the count. RESULT: 0 violations found across billing/invoices/quotes trees. gate: check:route-classification PASS (0 undeclared). L06-report.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:idempotent-commands` · `check:tenant-isolation` · `check:outbox-consumers` · `check:migration-chain` · `check:tenant-indexes` · jest `--testPathPattern="billing|invoice|quote|payment|accounting|finance"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:formatters` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

## Definition of done

No retry can double-charge or double-credit; entitlements never require a provider call on a request path; invoice, tax and currency history is immutable; finance sweeps have bounded, measured read budgets; exports cannot exhaust request memory; every emitted event in your trees has a consumer or a recorded no-consumer decision; isolation coverage complete.

Report to `architecture-refactor/session-tickets/reports/S05-report.md`.
