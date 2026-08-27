# 01 — Plans, prices and entitlements are versioned data

**Status:** done

> **Applied?** No. `0520_commercial_billing_catalog.sql` exists and **is journalled** (`idx` 293, confirmed by `pnpm db:reconcile-journal`). Nothing in this program has been applied to any database, so these tables are not yet live anywhere — that is the standing condition for the whole candidate, not a defect in this ticket. The earlier note here ("NO migration creates these tables", "a repo-wide grep returns zero matches") was wrong and is withdrawn.

## Acceptance criteria

- [x] Product, plan, price-version and plan-entitlement tables exist with effective windows. — `db/schema/billing/commercial-catalog.ts:17,34,54,76` (`billingProducts`, `billingPlans`, `billingPriceVersions` with `effectiveFrom`/`effectiveUntil` at `:63-64`, `billingPlanEntitlements` with `effectiveFrom`/`effectiveUntil` at `:83-84`).
- [x] Prices store integer minor units, ISO currency, interval and tax behavior. — `commercial-catalog.ts:59-62` (`amountMinor` integer, `currency` varchar(3), `billingInterval`, `taxBehavior`).
- [x] Organisation entitlement overrides are durable and audited. — `commercial-catalog.ts:94-113` (schema with `actorId`, `reason`, `idempotencyKey`, effective window) + `versioned-catalog.service.ts:136-172` (`upsertOrgEntitlementOverride`), **now reachable**: the service is registered at `billing.module.ts:23` and resolved through the Nest container in `versioned-catalog.service.spec.ts:28-51`.
- [x] Existing subscriptions reference an immutable price version. — `commercial-catalog.ts:116-131` (`subscriptionItems.priceVersionId` FK with `onDelete: "restrict"` so the price version cannot be deleted).
- [x] The effective entitlement snapshot is cached locally and invalidated after commit. — `versioned-catalog.service.ts:92-99` (`this.cache.cached(cacheKey, …, ENTITLEMENT_CACHE_TTL)`) + `:132-134` (`bustOrgEntitlementCache`), deferred through `registerAfterCommit` at `:170-171` so a bust never lands before the row does, with an inline fallback when there is no ambient transaction. Both paths asserted in `versioned-catalog.service.spec.ts:54-101`.
- [x] A provider call is never required for a feature check. — `versioned-catalog.service.ts` reads only from `orgEntitlementOverrides` and `billingPlanEntitlements`; no external SDK import or provider call is present.
- [x] A journalled migration creates every table above, each with an RLS policy and an `org_id`-leading index. — `backend/migrations/0520_commercial_billing_catalog.sql`, journal `idx` 293. Global catalog tables (`billing_products`, `billing_plans`, `billing_price_versions`, `billing_plan_entitlements`) carry no `org_id` and therefore have no RLS policy; they are protected with REVOKE/GRANT. Tenant tables (`org_entitlement_overrides` at `:259-265`, `subscription_items` at `:328-334`) have `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "tenant_isolation" … USING (org_id = app.current_org_id())`.

**Re-verification (2026-08-27, S2):** two things were false when this was marked `done`.

1. **`VersionedCatalogService` was in no module's `providers`.** It appeared exactly once in the whole backend — its own declaration — so Nest could never instantiate it and criteria 3 and 5 cited line numbers inside code nothing could reach, while `tsc`, `nest build`, `madge` and the suite all stayed green. Registered at `billing.module.ts:23` and exported at `:24`; `scripts/unregistered-injectables.mjs src` now reports `injectables=941 unreferencedOutsideOwnFile=0`. The DI proof is `versioned-catalog.service.spec.ts:37-51`, which builds its provider list *from `BillingModule`'s own reflected metadata* — de-register the service and the test fails with "Nest could not find VersionedCatalogService". It did fail that way before the fix.
2. **Criterion 5's "invalidated after commit" was not what the code did.** `bustOrgEntitlementCache` ran immediately after the insert, so with a caller-supplied `tx` a concurrent read could refill the cache from pre-commit state and then go stale for the full TTL when the write landed. It now defers through `registerAfterCommit`.

**Audit note (2026-08-26):** All six criteria are satisfied at the schema + service layer. No migration for these tables exists in the Drizzle journal — the tables are not yet live in the database. Every criterion is code-only until a migration is authored and applied. *(Superseded: the migration is journalled — see the note above.)*

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
