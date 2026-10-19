# 36: Support aged offline Calendar access

**What to build:** Provide a clearly aged, permission-conscious read cache while offline and safely revalidate every attempted action after reconnecting.

**Blocked by:** 12: Complete projection-contract migration and core verification; 17: Publish versioned Calendar lifecycle events.

**Status:** in-progress

- [ ] Offline views show cache age, last successful coverage, and source-specific staleness.
- [ ] Sensitive offline detail follows organization policy and cannot be exposed after known membership revocation.
- [ ] Booking, availability confirmation, provider writes, and source-owner actions cannot claim success offline.
- [ ] Reconnection rechecks tenant, membership, object permission, source version, availability, and current policy before asking the user to confirm.
- [x] Tests cover revoked access, organization switch, queued intent conflict, expired booking rule, stale occurrence, and partial reconnect.

