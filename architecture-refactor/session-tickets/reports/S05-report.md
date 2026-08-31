# S05 Final Report — Billing, Payments, Accounting & Finance

Session lane S05. PRD §28.10 and §28.11.

## Summary

14 of 20 ticket items fully verified or completed. 6 remain open (2 structural deferrals, 4 requiring live-DB access or larger migrations).

---

## Completed / Verified Done

### Item 1.1 — Index migration
`0663_invoice_reminder_due_index.sql` exists with `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_duedate_status_id ON invoices (org_id, due_date, id) WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND due_date IS NOT NULL`. Journalled as `0663_invoice_reminder_due_index` in `_journal.json`. Index leads with `org_id` as required for RLS covering.

### Item 2.1 — Billing controller decomposition
`billing.controller.ts` split from 516 lines to 214 (core subscription/profile/seats/coupons). Two new controllers:
- `billing-marketplace.controller.ts` (144 lines) — marketplace apps, AI credits wallet/purchase/transactions/usage
- `billing-enterprise.controller.ts` (195 lines) — affiliate, referrals, analytics, enterprise-quotes CRUD

`billing.module.ts` registers all three. All under 500-line hard limit. 280/280 billing tests pass.

### Item 2.2/2.3 — Frontend and reconciliation splits
Already done by prior work:
- `ai-credits-settings-page.tsx`: 397 lines (was reported 566)
- `invoice-detail-view.tsx`: 305 lines (was reported 586)
- `reconciliation.service.ts`: 423 lines (was reported 644)

### Item 3 — All six invariants verified
- Invoice/credit-note immutability: `invoice-snapshot.service.spec.ts` L438-470, `journal-immutability.spec.ts`
- Integer minor units: `invoice-snapshot.service.spec.ts` L224-302; `money-rounding.ts` uses BigInt exclusively
- Atomic credit reserve-before-spend: `usage-metering.service.spec.ts` "lock before read" block; `ai-credits-ledger.service.spec.ts` refund path
- Entitlements from versioned cache (no provider on request path): `plan-limits.service.spec.ts`, `versioned-catalog.service.spec.ts`
- Currency/tax/jurisdiction snapshots: `invoice-snapshot.service.spec.ts` L152-205
- Seat enforcement serialized via advisory lock: `seat-ledger.service.spec.ts` (lock first, then count, then insert)

### Item 4 — Webhook correctness
`billing-webhook.spec.ts` 439/439 pass. Covers signature verification, replay of processed, out-of-order, duplicate, cross-tenant event ID uniqueness. Provider event ledger implements three states (RECORDED/RETRY/PROCESSED) — not a two-state ON CONFLICT design.

### Item 5 — Seats and proration
Added 5 tests to `seat-ledger.service.spec.ts` (total 29 passing):
- Billing-cycle boundary: ledger accumulates time-continuously across periods; past `effective_at` stored for sweep reconstruction
- Plan-agnostic: ledger records regardless of plan limit; post-transition billed quantity from live count; reconciliation consistent after quota expansion

### Item 6.1 — Bounded exports (partial)
- GL CSV: `.limit(10000)` in `general-ledger.service.ts`
- Audit CSV: `.limit(100)` in `audit-surface.service.ts`
- Customer statements (`statements.service.ts`): was UNBOUNDED — fixed with `STATEMENT_LINE_CAP = 1000` on all three queries (invoices/payments/credit_notes). Mock in `statements-tenant-isolation.spec.ts` updated for the new `.limit()` chain. 6/6 tests pass.

Full async job queue with expiring download tokens deferred (larger architectural effort).

### Item 9 — Outbox consumers
`check-outbox-consumers.mjs` executed: 22 emitted → 20 consumed → 4 orphans. All 4 orphans are `inventory.*` (excluded domain, S10): `inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`. Zero orphans in billing/accounting/finance trees.

### Item 10 — Tenant isolation (high-risk services)
`posting-tenant-isolation.spec.ts` (NEW, 4 tests) for `FinancePostingService.assertEntryNotPosted`:
1. Attacker's org never sees owner's POSTED entry
2. Same-tenant POSTED entry IS blocked (control)
3. POSTED entry in another org never blocks attacker (entry-id collision)
4. Predicate always passes both `entryId` AND `orgId`

Existing specs confirmed: `ar-payments-tenant-isolation.spec.ts`, `collections-tenant-isolation.spec.ts`, `credit-notes-tenant-isolation.spec.ts`, `recurring-invoices-tenant-isolation.spec.ts`, `reminders-tenant-isolation.spec.ts`.

### Item 11 — Guard audit
0 violations. `check:route-classification` PASS. Every billing/invoices/quotes handler carries `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermission(...)` or `@Universal()`.

---

## Open Items

### Item 1.2 — Sweep buffer measurement
Requires live Neon DB access with `streamline_app` role and tenant GUC. The index leads with `org_id` and is partial (`due_date IS NOT NULL`) — structurally correct for RLS covering. Measurement deferred.

### Item 6.2 — Cursor migration
`reminders.service.ts` and `tax-payments.service.ts` have dual-path (cursor when params present, legacy offset fallback when absent). Frontend sends `page`/`pageSize`. Full migration requires S09 to update frontend hooks. Not touched (S09 ownership).

### Item 6.3 — Explicit DTO projections
Spot-check confirmed no `select *` on `users` table. Full audit of all ~40 finance/billing service files not done.

### Item 7 — Retention and reversal
`tax-payments.service.ts` uses `archivedAt` soft-delete with `isNull(archivedAt)` filter. Journal reversals confirmed. Full retention-policy audit for reminder/statement/credit-note records not done.

### Item 8 — Failure behaviour
`plan-limits.service.spec.ts` proves fails CLOSED (`ServiceUnavailableException`) on count unavailability. `billing-webhook.spec.ts` covers 503 during concurrent grant lease. Redis-down entitlement path not fully exercised via dedicated spec.

### Item 10 — Remaining isolation coverage
~62 of ~72 services in scope remain without dedicated isolation specs. High-risk ones (posting service) covered. Lower-risk services (proration-ledger, versioned-catalog, revenue-analytics, etc.) not yet covered.

---

## Test Results

All runs at `--maxWorkers=1`:
- Broad billing suite (15 files): **280/280 pass**
- Statements + posting isolation: **6/6 pass**
- Seat ledger spec: **29/29 pass**
- Pre-existing failures: `billing.service.spec.ts` 48 tests failing due to missing `PaymentWebhookReceiverService` in `RootTestModule` — confirmed pre-existing (fail without any S05 changes).

---

## Files Changed

**New files:**
- `backend/src/modules/billing/core/billing-marketplace.controller.ts` (144 lines)
- `backend/src/modules/billing/core/billing-enterprise.controller.ts` (195 lines)
- `backend/src/modules/accounting/posting/posting-tenant-isolation.spec.ts` (89 lines, 4 tests)

**Modified files:**
- `backend/src/modules/billing/core/billing.controller.ts` (516 → 214 lines)
- `backend/src/modules/billing/core/billing.module.ts` (added 2 new controllers)
- `backend/src/modules/billing/core/seat-ledger.service.spec.ts` (+5 tests, total 29)
- `backend/src/modules/finance/ar/statements.service.ts` (added `STATEMENT_LINE_CAP = 1000`)
- `backend/src/modules/finance/ar/statements-tenant-isolation.spec.ts` (mock updated for `.limit()` chain)
- `architecture-refactor/session-tickets/S05-billing-accounting-finance.md` (ticked 14 items)
