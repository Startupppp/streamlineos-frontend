# c26 · Commercial billing is a versioned ledger

**Status: payment adapters and AI credit accounting are sound; the commercial catalog is code.** Verified at source 2026-08-26. Plans, limits and INR prices are constants. Entitlements resolve locally and are cached, which is the right hot-path shape. There is no versioned price catalog, entitlement override model, seat type, subscription item ledger or immutable tax/currency snapshot. c17 explicitly leaves tax and multi-currency out of scope.

## Problem Statement

Changing a price constant rewrites the meaning of every existing subscription. An enterprise exception has nowhere durable to live. “Seat” is not a first-class billable item, so membership and billing can drift. Mid-cycle changes cannot be reconstructed from immutable proration lines. An invoice denominated only by today’s plan constants cannot prove what was sold, in which currency, under which tax rule.

## Solution

Keep provider adapters and the cached entitlement resolver. Put a versioned commercial ledger behind them:

- products and plans identify what is sold;
- price versions identify amount, ISO currency, interval, tax behavior and effective window;
- plan entitlement rows and organisation overrides resolve the effective feature/limit snapshot;
- subscription items carry quantity and the price version actually purchased;
- seat events and usage events are append-only, idempotent facts;
- proration and invoices store immutable line items and tax snapshots.

Provider state is evidence, not authority. Webhooks update the local ledger idempotently; reconciliation detects divergence. Feature checks read the cached local entitlement snapshot and never call the payment provider.

## Implementation Decisions

**KEEP**

- Payment provider ports and adapters.
- Integer minor units; AI milli-credit ledger.
- Server-side `PlanLimitsService` hot-path resolution and namespace invalidation.
- c17 webhook durability, replay and invoice immutability work.

**REPLACE**

- Plan/price/limit constants as the historical record.
- Seat counts derived independently in billing and membership.
- Recomputed proration or tax after issue.

The organisation billing currency becomes immutable after the first paid invoice; changing it creates a new subscription/price context. Each invoice stores seller/buyer tax identity, place of supply, tax rates, inclusive/exclusive behavior, rounding policy and provider references as issued facts. FX conversions store the rate source, rate and timestamp used.

## Testing Decisions

- Historical subscriptions keep their price after a catalog change.
- Concurrent invite/activate/deactivate operations produce one seat result under the organisation advisory lock.
- Upgrade, downgrade and quantity changes produce line items that reconcile to provider amounts.
- Duplicate and out-of-order usage events do not double-charge.
- An issued invoice remains byte-for-byte stable after catalog, address, tax and FX changes.
- Entitlement checks succeed with the provider unavailable.

## Out of Scope

- Revenue recognition schedules.
- Supporting every payment provider in the first migration.
- Automatic international tax registration decisions.
