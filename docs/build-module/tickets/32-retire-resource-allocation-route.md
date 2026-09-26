# 32 — Retire the resource-allocation endpoint

**What to build:** A route that nothing calls stops existing. The resource-allocation report endpoint is live, permission-gated and module-gated, and an exhaustive search across both repositories found only the controller, its service, three specs and the authorization census — no client, no agent tool, no internal caller. It pays the full cost of the module gate and authorization stack on every probe and returns nothing anyone reads.

Retiring a Build route touches three disk-bound gates, so this is not a one-line deletion: the route manifest, the authorization census and module-access invariants all record it and each must be updated in step. The manifest is the authority for kept routes and must match the tree in both directions.

Decision already taken: retire rather than wire a caller.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The endpoint, its service path and its schemas are removed
- [ ] The route manifest no longer lists it, and the manifest still matches the tree in both directions
- [ ] The authorization census and module-access invariants are updated
- [ ] Its specs are removed or retargeted, not left asserting a route that no longer exists
- [ ] No ticket or decision record is deleted as part of this
