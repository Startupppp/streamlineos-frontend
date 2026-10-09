# Build acceptance criteria

The unchecked boxes in [module](module/README.md) and [sidebar](sidebar/README.md) are the remaining Build acceptance criteria. They were moved here from `docs/specs/build` so Build has one documentation home. Checked historical task rows were removed; source and test work already done remains in Git history and the current [requirement ledger](../implementation/REQUIREMENT-LEDGER.md).

Use the [Build overview](../README.md) for product context, the [implementation contract](../implementation/README.md) for owners and code seams, and the [work packet catalog](work-packets.md) for scoped delivery. The catalog is a planning aid; recheck every pending criterion against the current revision before implementing it.

A criterion remains open until its exact behavior and required evidence are demonstrated. Source review, focused tests, browser behavior, persisted database state, authorization, provider effects, deployment, and human sign-off are distinct evidence tiers. Never close a full criterion from a narrower tier.

The current route-census snapshot is [audit/generated/routes.snapshot.json](../audit/generated/routes.snapshot.json).