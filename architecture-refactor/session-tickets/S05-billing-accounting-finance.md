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
- [ ] The rewritten reminder sweep needs this index; it was not created because migrations were owned elsewhere. Write it as a proper journalled migration and prove it applies cold and on upgrade:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_duedate_status_id
  ON invoices (org_id, due_date, id)
  WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
    AND due_date IS NOT NULL;
```
- [ ] Then **measure** the sweep in buffers as `streamline_app` with the tenant GUC set, and record before/after. A covering index on an RLS table must contain `org_id` — this one does.

### 2. Billing decomposition
- [ ] Split billing orchestration into subscription lifecycle · entitlement resolution · seat accounting · invoices · payment attempts · promotions · AI-credit ledger. Report before/after line counts. A file already cohesive and under 500 lines gets a KEEP with evidence — do not manufacture refactors; this is the strongest domain in the product.
- [ ] `frontend/features/billing/ai-credits-settings-page.tsx` (566) and `features/accounting/sales/invoice-detail-view.tsx` (586) split by responsibility.
- [ ] `modules/finance/banking/reconciliation.service.ts` (644) split by cohesive responsibility.

### 3. Invariants — prove each with a test
- [ ] Invoices and credit notes are **immutable snapshots**; corrections use reversal or superseding records.
- [ ] Money is integer minor units; AI credits are integer milli-credits in the ledger.
- [ ] Credits are reserved/consumed **atomically before** the paid provider call and refunded only on provider failure — never check-then-spend. Anonymous traffic must never spend the shared LLM budget.
- [ ] Entitlements resolve locally from versioned cached snapshots; **no request path calls the payment provider**. Invalidate immediately after billing mutations and webhook settlement.
- [ ] Explicit currency, tax and jurisdiction snapshots on every monetary record.
- [ ] Seat enforcement is a serialized write invariant: take the per-org `quota:${orgId}:members` transaction advisory lock and call `PlanLimitsService.assertWithinLimit(..., tx)` immediately before every membership insert. A check outside the transaction is insufficient.

### 4. Webhook correctness — the double-charge surface
- [ ] Prove with tests: signature verification failure · replay of an already-processed event · out-of-order delivery · duplicate delivery · tenant/provider-account uniqueness. Provider event identity is persisted **before** processing, then deduplicated.
- [ ] **Known trap:** `ON CONFLICT` alone cannot distinguish a completed replay from a previously FAILED attempt. Only a `processed_at`-style column can, and the claim needs **three** states (unclaimed / in-flight / done), not two. Check the billing webhook ledger for this defect and fix it if present.
- [ ] `billing-webhook.spec.ts` was reported failing because `BillingProfileService` is missing from `RootTestModule`. Fix it and make the suite pass.

### 5. Seats and proration
- [ ] Prove behaviour across invite · activation · suspension · removal · billing-cycle boundary · plan transition. Effective timestamps and immutable ledger entries throughout.

### 6. Bounded work
- [ ] Move large invoice generation/export to bounded asynchronous jobs wherever a request budget can be exceeded, behind an authorized expiring download that re-asserts object-level access and returns 404 (never 403) for another org's job id.
- [ ] Migrate finance tax payments, reminder policies and every other growing list to the shared cursor contract, cap 100, explicit `null` cursor on exhaustion. Remove legacy offset branches and migrate every caller.
- [ ] Replace broad raw projections with explicit DTO projections.

### 7. Retention and reversal
- [ ] Define and implement retention/reversal for tax payments, reminder policies and all posted financial records. Physical deletion only where legally and product-wise correct; otherwise soft delete with every read filtering `deleted_at`.

### 8. Failure behaviour
- [ ] Exercise billing during placement change · provider outage · Redis outage · webhook redelivery. Entitlement resolution must degrade **safely** when Redis is down — it must not fail open into granting entitlements.

### 9. Outbox consumers
- [ ] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer with replay/ordering/retry/dead-letter tests, or remove the emission with zero-consumer proof.

### 10. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (bucket B05, ~72 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row.

### 11. Guard audit
- [ ] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)` — authenticated but never permission-checked. Report the count.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:idempotent-commands` · `check:tenant-isolation` · `check:outbox-consumers` · `check:migration-chain` · `check:tenant-indexes` · jest `--testPathPattern="billing|invoice|quote|payment|accounting|finance"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:formatters` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

## Definition of done

No retry can double-charge or double-credit; entitlements never require a provider call on a request path; invoice, tax and currency history is immutable; finance sweeps have bounded, measured read budgets; exports cannot exhaust request memory; every emitted event in your trees has a consumer or a recorded no-consumer decision; isolation coverage complete.

Report to `architecture-refactor/session-tickets/reports/S05-report.md`.
