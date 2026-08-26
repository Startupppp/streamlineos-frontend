# CRM Phase 3 — taking money, in three regions

Source: `streamlineos-frontend/docs/specs/2026-08-24-crm-phase-3-commercial-prd.md`

After Phase 2 the product is good and nobody outside the building can buy it.
There is no marketing site, no signup that does not involve a human, and no way
to pay. This phase makes the product buyable, in the customer's currency, in
their jurisdiction, without talking to us.

| Track | Tickets | Shape |
|---|---|---|
| A — payments and pricing | 01-05 | interface → second provider → per-currency prices → tax → reproducible invoices |
| B — enforcement | 06-07 | seats and usage at the write path, including autonomous writers |
| C — regions | 08-11 | stand up three, region at signup, cross-region enumerated, per-region migrations |
| D — funnel | 12-15 | marketing site, signup, onboarding to first value, self-serve plan change |
| E — compliance | 16-18 | subprocessor register, erasure, export and consent evidence |

## Measured on this branch, not taken from the PRD

- **Razorpay is the only payment adapter, and there is no interface in front of
  it.** Twenty files reference it: `billing/core` (8), `billing/payments` (8
  including adapters and DTOs), `db/schema` (5), and — the part the PRD missed —
  **`modules/platform` (1) and `modules/accounting` (2)**. The blast radius is
  wider than the billing module.
- **Four plan tiers exist:** FREE, STARTER, PROFESSIONAL, ENTERPRISE.
- **Prices are already integer minor units** — monthly price in paise, INR × 100.
  The money-representation work Phase 1 did for deals does not need repeating
  here; what is missing is a second currency, not a second representation.
- **One region is configured.** `region.config.ts` knows only `primary`.
- **The consent schema already exists** at `db/schema/crm/consent.ts`, with a
  `crm/consent` module including unsubscribe tokens and outbound email. Track E
  wires what exists rather than building it.

## Order

**01 first, always.** It extracts the interface with no behaviour change.
Everything in track A depends on it, and doing it after the second provider means
branching on provider at twenty call sites — which is how the currency problem
happened in the first place.

**06, 08, 12 and 16 have no blockers** and can start immediately.

**Run track C early.** Ticket 08 is where Phase 1's region seam is tested, and if
that seam was placed wrongly you want to know before track D builds signup on it.

## The acceptance test for ticket 08 is negative

Standing up region two must require **no change** to `withTenant`,
`resolveRegionalDb`, or any caller. Phase 1 paid the cost of a region-aware
resolver when there was one region, which looked like over-engineering at the
time. If you find yourself changing those, stop and record it as a finding about
Phase 1's placement — that is worth more than the workaround, and finding it with
three regions is far cheaper than with thirty tenants in each.

## Testing bar

Money and compliance both fail silently and expensively, so the bar differs from
a feature phase: **assert the consequence, not the call.** A test that a charge
was requested is worth little. A test that the ledger balances under concurrent
spend, that the invoice regenerates byte-identically, and that the cap refused
the fifty-first seat is worth a lot.

Payment providers are driven from **fixtures**, never mocked SDKs — the same rule
the ingress seam follows. Webhooks are exercised by posting the provider's
documented payload shapes, including the out-of-order and duplicate deliveries
that actually happen.
