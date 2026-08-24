# PRD — Phase 3: taking money, in three regions

**Status:** ready-for-agent
**Date:** 2026-08-24
**Phase:** 3 of 5
**Blocked by:** Phase 2 (widening the skeleton) complete and deployed
**Origin:** grilling session, 2026-08-23 — decisions `D01`–`D28`; this phase carries `D13`, `D19`, `D20` and the GDPR operational work

---

## Problem Statement

After Phase 2 the product is good and nobody outside the building can buy it.

There is no marketing site, no signup that does not involve a human, and no way to pay. `PlanLimitsService` and `plan-entitlements.constants.ts` already model FREE / STARTER / PROFESSIONAL / ENTERPRISE — **priced in INR, charged through Razorpay, which is the only payment adapter in the codebase**. A prospect in Berlin or Chicago cannot give us money at all, and if they could, they would be quoted in rupees.

The same India-first assumption runs deeper than billing. Currency display became tenant-aware in Phase 1, but tax handling, invoice format, date and number conventions, and the compliance surface are all built around one jurisdiction. The product was designed for a market it now needs to leave.

And the data lives in one place. Phase 1 made region a tenant attribute from the first migration and routed every storage access through a region-aware resolver, precisely so this phase would be a deployment exercise rather than a rewrite. That claim is untested: there is one region, so the resolver has never resolved to anything else.

Three consequences, all commercial:

1. **No self-serve funnel.** Every customer costs a sales conversation, which caps growth at the size of the sales team and makes the product uneconomic below enterprise price points.
2. **No European customer can be signed.** Not for want of features — for want of a lawful basis to hold their data in the region they require, a subprocessor register they can review, and erasure tooling that works.
3. **Usage is unpriced.** The AI credits ledger meters accurately (`D20` chose per-seat tiers plus real usage caps), but nothing enforces a cap at the plan boundary or converts overage into revenue.

## Solution

Make the product buyable, in the customer's currency, in their jurisdiction, without talking to us.

**A funnel that ends in a working workspace.** A marketing site, a signup that provisions a tenant, an onboarding that reaches first value without a call, and a plan the customer can change themselves.

**Money, properly.** A second payment provider for the markets Razorpay does not serve, with the provider behind an adapter so a third is additive. Prices in the customer's currency, tax applied by jurisdiction, invoices in the local format. Seats and usage both enforced at the plan boundary — a cap that is not enforced is a marketing claim, not a limit.

**Three regions on the Phase 1 seam.** EU, US and India, each with its own database, each tenant pinned to one, with the resolver already in the code path. This phase stands up the infrastructure and proves the seam holds; it does not redesign it.

**Compliance as operable tooling, not a policy document.** A subprocessor register the customer can read, an erasure path that actually deletes across every region and every backup generation, an export a data subject can be given, and a consent model that already exists in the schema wired to the surfaces that need it.

## Goals

- A stranger can go from the marketing site to a working, populated workspace without a human involved.
- A customer in the EU, the US or India is billed in their currency, taxed correctly, and their data rests in their region.
- Seat and usage limits are enforced at the write path, not merely displayed.
- A data subject's erasure request completes across all regions, verifiably, within the statutory window.
- Adding a fourth region is a configuration change and a deployment, not a code change.

## Non-Goals

- Cold outbound, marketing automation or lifecycle email beyond transactional messages. Phase 4 and 5.
- The autonomy loops at full strength. Phase 4.
- Renderer migration outside CRM. Phase 4 (`D28`).
- Enterprise procurement machinery — SOC 2 audit, penetration test reports, security questionnaires. Real work, but a business process rather than a build, and it runs in parallel to this phase rather than inside it.
- Replacing Razorpay. It stays and serves India, which is the largest existing market.

## Seams

**Existing — controller end-to-end.** Signup, plan change, checkout, entitlement enforcement and every compliance endpoint. The `createE2eApp` harness boots the real guard stack, so a signup test exercises tenancy provisioning for real.

**Existing — AI evaluation.** Unchanged in this phase; no new model-mediated decisions are introduced. Recorded explicitly so its absence is a decision rather than an oversight.

**Existing — region resolution.** `common/region/region-registry.ts` and the `resolveRegionalDb` path inside `withTenant`. Phase 1 put resolution at the seam rather than at the callers precisely so a second region would not need three call sites changed. This phase is where a second region exists.

**New — payment provider adapter.** One interface, two implementations. The existing Razorpay integration is refactored behind it rather than a second parallel payment path being added beside it. This is the only new seam, and it is proposed because the alternative — branching on provider at every call site — is how the currency problem happened in the first place.

## User Stories

**Prospect — buying without being sold to**

1. As a prospect, I want to understand what the product does from a page rather than a demo, so that I can evaluate it on my own time.
2. As a prospect, I want to start a trial with an email address, so that evaluation costs me nothing but attention.
3. As a prospect, I want my workspace to have something in it when I arrive, so that I can judge the product rather than an empty grid.
4. As a prospect, I want to import my existing data during onboarding, so that the trial reflects my business and not a sample.
5. As a prospect, I want to see the price in my currency before I enter a card, so that I am not converting rupees in my head.
6. As a prospect, I want to know where my data will be stored before I sign up, so that I do not discover a compliance problem after migrating.

**Customer — paying and changing**

7. As a customer, I want to pay by the method normal in my country, so that payment is not the reason I do not buy.
8. As a customer, I want to add and remove seats myself, so that headcount changes do not require a support ticket.
9. As a customer, I want to upgrade mid-cycle and be charged the difference, so that growing is not punished by timing.
10. As a customer, I want to downgrade and understand what I lose before it happens, so that a cheaper plan is not a surprise outage.
11. As a customer, I want an invoice that satisfies my accountant, with the right tax treatment for my jurisdiction, so that expensing it is routine.
12. As a customer, I want to see my usage against my cap during the period, so that an overage bill is never a surprise.
13. As a customer, I want to cancel without a phone call, so that the exit is as honest as the entrance.

**Administrator — limits that mean something**

14. As an administrator, I want an action that would exceed our seat count to be refused at the moment it happens, so that our bill matches our plan.
15. As an administrator, I want AI usage beyond our included allowance to be either blocked or billed according to what we chose, so that the cap is real.
16. As an administrator, I want the enforcement to be the same whether the action came from a person, an import or an autonomous decision, so that automation cannot spend past a limit a human could not.

**European customer — lawful basis**

17. As a European customer, I want my tenant's data to rest in the EU, so that our transfer assessment is short.
18. As a European customer, I want a subprocessor register I can read and be notified about when it changes, so that our own obligations are meetable.
19. As a European customer, I want a data-processing agreement available without a negotiation, so that legal review is a day rather than a quarter.
20. As a data subject, I want my erasure request to actually delete my data everywhere, so that the right is real.
21. As a data subject, I want an export of what is held about me in a portable format, so that portability is real.
22. As a compliance officer, I want to see when consent was captured and on what basis, so that I can evidence lawfulness rather than assert it.

**Operator — running three regions**

23. As an operator, I want a new tenant assigned to a region at creation and never silently moved, so that residency is a property rather than a hope.
24. As an operator, I want a tenant's region to be visible in support tooling, so that I know which database to look in before I look.
25. As an operator, I want migrations to run across every region with one command and a per-region result, so that a partial rollout is visible.
26. As an operator, I want an outage in one region not to affect the others, so that blast radius is bounded by design.
27. As an operator, I want cross-region operations — erasure, platform administration, aggregate reporting — to be explicit and few, so that the isolation is not quietly undone by a convenience query.

**Engineer — the seam holds**

28. As an engineer, I want standing up region two to require no change to `withTenant` or its callers, so that Phase 1's placement decision is verified.
29. As an engineer, I want a second payment provider to require no change to billing call sites, so that a third is additive.
30. As an engineer, I want a test that fails when a query bypasses region resolution, so that a direct database handle cannot leak across regions.

## Implementation Decisions

### Payments and pricing

`D20`. Per-seat tiers plus real usage caps, which the existing `plan-entitlements.constants.ts` already models — the tier structure does not change, its reach does.

**Provider behind an adapter.** `billing/payments/adapters` already contains exactly one adapter and no interface, because one provider needs no abstraction. This phase extracts the interface from the Razorpay implementation and adds a second — Stripe or equivalent — for the markets Razorpay does not serve. Routing is by the tenant's billing country, decided once at subscription creation and stored, not re-derived per charge.

**Prices are per currency, not converted.** A converted price moves with the exchange rate and makes an invoice unreproducible. Each plan carries an explicit price per supported currency; an unsupported currency falls back to USD with the currency stated, rather than silently charging rupees.

**Tax by jurisdiction, computed server-side.** GST for India, VAT with reverse charge for the EU, sales tax where applicable for the US. The determination and its inputs are stored on the invoice, because "why was I charged this" is a question that arrives eighteen months later.

**Enforcement at the write path.** Every creation endpoint for a limited resource already calls `assertWithinLimit` before insert; this phase extends the same call to seats and AI credits and — critically — to the autonomous writers, which are a new spending actor Phase 1 introduced and no limit currently sees.

### The funnel

Marketing site and self-serve signup (`D19`). Signup provisions a tenant, assigns a region, seeds a demo dataset, and drops the user into onboarding. First value is the target: the funnel's measure is not signups but workspaces with real data in them, so the Phase 2 importer is part of onboarding rather than a settings page.

Existing platform rules hold: no `app/api/**` business routes in the frontend, the auth bridge stays the only route handler, and the wizard gate remains the single authority on where a new user lands.

### Three regions

`D13`. Region was a tenant attribute from the first migration and every storage access already resolves through the registry. This phase:

- Stands up EU, US and India databases.
- Populates the registry from configuration rather than code.
- Adds region to signup as a customer choice, defaulted from billing country, and immutable afterwards. Moving a tenant between regions is a supported operation but an explicit, offline one — not a setting.
- Makes cross-region operations an enumerated list, each individually justified: erasure, platform administration, and aggregate platform reporting. Anything not on the list may not span regions.
- Runs migrations per region with a per-region result, so a partial rollout is visible rather than assumed.

The acceptance test for the seam is negative: standing up region two must require no change to `withTenant`, `resolveRegionalDb` or any caller. A diff there means Phase 1 placed the seam wrongly, which is worth knowing.

### Compliance

The `crm/consent` module and `db/schema/crm/consent.ts` already exist. This phase wires them to the surfaces that need them and adds the operational tooling around them.

**Erasure spans regions and generations.** An erasure request enumerates every region, deletes or irreversibly anonymises, and records what it did per region with a timestamp. Backup generations are included by policy and schedule rather than by deletion, and the policy is stated on the record so the customer can be told when the last copy expires. Soft delete is the platform default; erasure is one of the enumerated exceptions.

**The subprocessor register is data.** A table, a public page, and a notification on change — not a PDF that goes stale.

**Export is the erasure query without the delete.** Same enumeration, same completeness guarantee, different terminal action. Building them as one mechanism is what makes the export trustworthy.

### What does not change

The RBAC model, the six standings, the permission catalogues, the renderer, the ingress seam and the autonomy layer are untouched. This phase is commercial and infrastructural. Recorded explicitly because a phase that touches billing and regions is exactly where unrelated changes accumulate.

## Testing Decisions

### What makes a good test here

Money and compliance both fail silently and expensively, so the bar is different from a feature phase: the test asserts the **consequence**, not the call. A test that a charge was requested is worth little; a test that the ledger balances, the invoice reproduces, and the cap refused the 51st seat is worth a lot.

### Seam one — controller end-to-end

Signup provisioning, plan change with proration, seat enforcement at the boundary, usage enforcement including from an autonomous writer, invoice generation with tax by jurisdiction, and every compliance endpoint. Cross-tenant isolation on all of it; cross-tenant misses return 404, never 403.

**Payment providers are driven from fixtures**, in keeping with the ingress rule: no provider SDK is mocked, and webhook handling is exercised by posting the provider's documented payload shapes, including the out-of-order and duplicate deliveries that actually happen.

### Region tests

- A tenant in region A cannot read region B, asserted at the resolver rather than by policy inspection.
- A query that bypasses region resolution fails a test, so a direct database handle cannot leak.
- Migrations report per region.
- Erasure enumerates every configured region, asserted against a registry with three entries rather than one.

### Billing correctness

- The credits ledger balances across reserve, settle, refund and overage, including concurrent spend.
- An invoice regenerates byte-identically from stored inputs, because reproducibility is what makes a tax position defensible.
- Proration arithmetic is unit-tested against worked examples, at period boundaries and across a plan change on the last day of a month.

### What is deliberately not tested

Provider SDK behaviour; the marketing site's copy or visual design; the correctness of tax rates themselves, which are configuration and change without us.

## Out of Scope

**Phase 4** — the inbound, forecasting and outbound loops at full strength (`D14`); cold outbound, which cannot launch before domain warming and platform approvals complete regardless of build progress; renderer migration for non-CRM modules, settings first (`D28`).

**Phase 5** — conversation intelligence, commissions, renewals, marketing automation, the report builder (`D25`); the MCP server.

**Not in this programme** — native mobile applications; a visual layout builder beyond field-level adjustment; user-defined objects beyond the Subject slot; custom roles.

## Further Notes

**This phase is larger than its feature list suggests**, and the reason is recorded so the estimate is not relitigated later: the product is India-first in more places than billing, and each one — tax, invoice format, number conventions, the compliance surface — is small on its own and collectively is most of the phase.

**The region seam is being cashed, not built.** Phase 1 paid the cost of a region-aware resolver when there was one region, which looked like over-engineering at the time. If that decision was right, this phase is a deployment exercise. If it was wrong, this is where we find out, and finding out with three regions is far cheaper than finding out with thirty tenants in each.

**Enforcement now has a new spender.** Phase 1 introduced autonomous writers, which spend AI credits and can create records without a person initiating anything. Every limit written before Phase 1 assumed a human on the other end. This phase must extend enforcement to that actor, and it is called out here because it is the kind of gap that is invisible until a tenant's automation quietly runs up a bill.
