# 09 — Region chosen at signup, immutable after

**Status:** not started
**Track:** C — regions
**Blocked by:** 08

## Why

Residency has to be a property of the tenant rather than a hope. A prospect who
discovers a compliance problem after migrating does not stay.

## Acceptance criteria

- [ ] Region is chosen at signup, defaulted from billing country, and shown **before** the tenant is created.
- [ ] A prospect can see where their data will rest before signing up.
- [ ] Region is **immutable** after creation. Moving a tenant is a supported but explicit offline operation, never a setting.
- [ ] A tenant's region is visible in support tooling, so an operator knows which database to look in before looking.
