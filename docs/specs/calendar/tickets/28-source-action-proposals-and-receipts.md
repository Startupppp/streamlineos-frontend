# 28: Propose source-owner actions with receipts

**What to build:** Turn Calendar interactions with Build, CRM, HR, Inventory, Finance, and Tasks commitments into reviewable proposals executed by the owning module.

**Blocked by:** 04: Enforce source-owner access and scoped identity; 09: Refresh projections after source changes; 12: Complete projection-contract migration and core verification; 17: Publish versioned Calendar lifecycle events.

**Status:** ready-for-agent

- [ ] A proposal records actor, source identity, expected version, intended effect, safe impact preview, and expiry without mutating the source.
- [ ] The user confirms each source-owned change before its owner reauthorizes and applies it.
- [ ] Multi-record application reports committed, failed, declined, and uncertain outcomes per source.
- [ ] Partial completion offers repair or compensation without claiming cross-module atomicity.
- [ ] Tests cover stale version, permission loss, deleted source, owner rejection, timeout, retry, and duplicate confirmation.

