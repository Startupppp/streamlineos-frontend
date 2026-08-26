# 01 — Plans, prices and entitlements are versioned data

**Status:** in-progress — schema exists in code only; NO migration creates these tables, so nothing works at runtime

> ⚠️ **BLOCKED — the schema exists only in TypeScript.** No migration creates any of these tables: a repo-wide grep of `backend/migrations/*.sql` for `commercial_catalog`, `org_entitlement_overrides`, `billing_seat_events`, `billing_proration`, `usage_events` and `invoice_snapshot` returns **zero** matches. Drizzle will not generate DDL for them either, because nothing has run `db:generate`. Every criterion below that is ticked against a schema file is satisfied *in code only* — the table does not exist in any database, so the query fails at runtime while typecheck and the schema barrel stay green. This is the inert-code trap. A migration per table is the first unblocking step.

## Acceptance criteria

- [x] Product, plan, price-version and plan-entitlement tables exist with effective windows. — `db/schema/billing/commercial-catalog.ts:17,34,54,76` (`billingProducts`, `billingPlans`, `billingPriceVersions` with `effectiveFrom`/`effectiveUntil` at `:63-64`, `billingPlanEntitlements` with `effectiveFrom`/`effectiveUntil` at `:83-84`). Schema only — no migration applied.
- [x] Prices store integer minor units, ISO currency, interval and tax behavior. — `commercial-catalog.ts:59-62` (`amountMinor` integer, `currency` varchar(3), `billingInterval`, `taxBehavior`). Schema only.
- [x] Organisation entitlement overrides are durable and audited. — `commercial-catalog.ts:94-113` (schema with `actorId`, `reason`, `idempotencyKey`, effective window) + `versioned-catalog.service.ts:135-170` (`upsertOrgEntitlementOverride`). Schema + service, no migration.
- [x] Existing subscriptions reference an immutable price version. — `commercial-catalog.ts:116-131` (`subscriptionItems.priceVersionId` FK with `onDelete: "restrict"` so the price version cannot be deleted). Schema only, no migration.
- [x] The effective entitlement snapshot is cached locally and invalidated after commit. — `versioned-catalog.service.ts:91-98` (`this.cache.cached(cacheKey, …, ENTITLEMENT_CACHE_TTL)`) + `:131-133` (`bustOrgEntitlementCache`) called at `:169` after every write.
- [x] A provider call is never required for a feature check. — `versioned-catalog.service.ts` reads only from `orgEntitlementOverrides` and `billingPlanEntitlements`; no external SDK import or provider call is present.
- [ ] A journalled migration creates every table above, each with an RLS policy and an `org_id`-leading index. — **BLOCKED:** none of `billing_products`, `billing_plans`, `billing_price_versions`, `billing_plan_entitlements`, `org_entitlement_overrides` or `subscription_items` appears in any `migrations/*.sql`. Until this lands, every criterion above is satisfied in TypeScript only and every query against these tables fails at runtime. A tenant table shipped without a policy is also readable org-wide, so the policy is part of this criterion, not a follow-up.

**Audit note (2026-08-26):** All six criteria are satisfied at the schema + service layer. No migration for these tables exists in the Drizzle journal — the tables are not yet live in the database. Every criterion is code-only until a migration is authored and applied.

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
