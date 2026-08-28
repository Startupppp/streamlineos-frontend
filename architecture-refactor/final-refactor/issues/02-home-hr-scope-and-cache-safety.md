# 02: Make Home HR sections scope-safe and cache-safe

**What to build:** Home attendance, availability and leave sections return only records allowed by the caller's DataScope and cannot reuse another member's broader cached result.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every affected Home query receives the actor and applies the owning HR scope predicate in SQL.
- [ ] Cache identity includes organization, membership, permission version, scope and relevant date/filter dimensions.
- [ ] Own/team/all and cross-organization tests prove both query and cache isolation.
- [ ] Home preserves independent loading/failure behavior without introducing domain writes.
