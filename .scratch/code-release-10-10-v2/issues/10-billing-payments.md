# 10: Billing and Payments

**What to build:** Plans, entitlements, seats, usage, invoices, proration, and provider events behave correctly through success, retry, replay, and outage paths.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human gate:** H12 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [x] **PRD-C125** — Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices, tax/currency, idempotent provider events, replay-safe webhooks, cached feature gates, authorization, frontend states and sandbox failure tests.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
