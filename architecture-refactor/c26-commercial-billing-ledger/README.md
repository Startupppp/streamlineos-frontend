# c26 — Commercial billing is a versioned ledger

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 6 tickets, 6 done.

c17 makes individual writes provable. This candidate supplies the commercial model c17 deliberately left out: versioned prices and entitlements, seat accounting, proration, usage meters, and immutable tax/currency snapshots.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Plans, prices and entitlements are versioned data | — | done |
| 02 | Seats have one auditable ledger | 01 | done |
| 03 | Proration is stored, not recomputed | 01, 02 | done |
| 04 | Usage metering is idempotent and aggregatable | 01 | done |
| 05 | Invoices snapshot tax and currency immutably | 01, 03, 04 | done |
| 06 | One subscription table feeds billing and platform administration | 01 | done |

---

**01 — Plans, prices and entitlements are versioned data.** `billingProducts`, `billingPlans`, `billingPriceVersions` (with `effectiveFrom`/`effectiveUntil`) and `billingPlanEntitlements` in `db/schema/billing/commercial-catalog.ts`; global catalog tables protected via REVOKE/GRANT, tenant tables (`org_entitlement_overrides`, `subscription_items`) with RLS `tenant_isolation` policy. `VersionedCatalogService` (`modules/billing/core/versioned-catalog.service.ts`) handles durable audited overrides and caches with bust deferred through `registerAfterCommit` to prevent pre-commit cache refill; registered/exported at `billing.module.ts:23-24`. Migration `0520_commercial_billing_catalog.sql`, journal idx 293. Fix (S2): service was entirely absent from Nest DI; cache bust ran immediately on insert rather than after commit.

**02 — Seats have one auditable ledger.** `SeatLedgerService` (`modules/billing/core/seat-ledger.service.ts`) registered at `billing.module.ts:24`; `seat-definition.ts` holds the single `seatCount()` expression and `SEAT_EVENT_DELTAS` lookup shared by `plan-limits.service.ts` enforcement and the ledger write so the two cannot drift. Advisory lock (`quota:${orgId}:members`) acquired first on every write; idempotency via partial unique index `uq_billing_seat_events_idem`; all five membership write sites (`invitations.service.ts`, `invitation-acceptance.service.ts`, `users.service.ts` ×2, `employee-onboarding.service.ts` ×2) call `recordSeatEvent` inside the same transaction. Migration `0521_billing_seat_ledger.sql`, journal idx 294.

**03 — Proration is stored, not recomputed.** `ProrationLedgerService` (`modules/billing/core/proration-ledger.service.ts`) inserts immutable lines on plan/quantity changes; line type is derived from money sign via `classify` so callers cannot mislabel; `proration-math.ts` computes in `bigint` with four deterministic rounding rules. Provider-calculated amount stored beside computed amount without overwriting it; replay returns the stored line without re-reading the catalog so a price-version edit cannot alter recorded money. `billing.service.ts:263` calls `recordProrationForPlanChange` inside the subscription update transaction. Migration `0522_billing_proration_ledger.sql`, journal idx 295.

**04 — Usage metering is idempotent and aggregatable.** `UsageMeteringService` (`modules/billing/core/usage-metering.service.ts`): `ingestEvent` is append-only with `(orgId, meterKey, sourceKey)` dedup; `acquireReservation` takes an advisory lock before every count read (never check-then-spend); `settleReservation`/`releaseReservation` refuse to unwind spent money; `rebuildRollup` upserts idempotently from raw events. Rollup rows are the `usageRollupId` FK target on `billing_invoice_line_snapshots`, so raw events can be pruned while invoice evidence remains. Fix (S2): JS `Date` inside a raw drizzle `sql` template threw at runtime while all mocked tests stayed green; replaced with column-aware Drizzle operators. Migration `0523_billing_usage_events.sql`, journal idx 296.

**05 — Invoices snapshot tax and currency immutably.** `InvoiceSnapshotService` (`modules/billing/core/invoice-snapshot.service.ts`): issues invoices, status-only updates, credit notes that point at `originalSnapshotId` (`ON DELETE RESTRICT`) without touching the original; `invoice-numbering.ts` serializes numbering via advisory lock on `billing_invoice_number_sequences` per org/prefix/year. `invoice-pricing.ts` computes in `bigint`; `INCLUSIVE` tax extracted from gross rather than added on top; document totals are sum of line totals. Immutability enforced by `BEFORE UPDATE` triggers on four tables in `0565_billing_invoice_snapshot_immutability.sql` (journal idx 304); `DELETE` guarded by the FK, not the trigger, to allow tenant-erasure CASCADE. Migrations `0524_billing_invoice_snapshots.sql` (idx 297) and `0565` (idx 304). Fix (S2): `INCLUSIVE` tax was added on top of a gross amount that already contained it, overcharging by tax-on-tax.

**06 — One subscription table feeds billing and platform administration.** `platform.service.ts` `listCustomers()`/`getCustomerBySlug()` cut over to canonical `subscriptions` (zero writers to `platform_subscriptions` confirmed by grep); keyset cursor `{ afterCreatedAt, afterId }` hard-capped at 100 rows with index `idx_organizations_created_cursor` added by migration `0502_platform_subscription_cursor_index.sql`. Member count and lifetime revenue computed via batch `inArray`+`groupBy` queries, not correlated subqueries per row. `DROP` of `platform_subscriptions` and contract tests (AC-6) deferred pending zero-read monitoring in production and a `createE2eApp` harness for platform-admin specs.
