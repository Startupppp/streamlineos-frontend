# 01 — Plans, prices and entitlements are versioned data

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Product, plan, price-version and plan-entitlement tables exist with effective windows.
- [ ] Prices store integer minor units, ISO currency, interval and tax behavior.
- [ ] Organisation entitlement overrides are durable and audited.
- [ ] Existing subscriptions reference an immutable price version.
- [ ] The effective entitlement snapshot is cached locally and invalidated after commit.
- [ ] A provider call is never required for a feature check.
