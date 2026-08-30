# 14: Normalize Chat reactions

**What to build:** Message reactions are independent membership rows, so popular messages avoid whole-row JSONB contention and reaction counts remain indexable.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] Reaction storage enforces organization/message/membership/emoji uniqueness.
- [ ] Existing reactions are backfilled deterministically with duplicate handling recorded.
- [ ] Add/remove/count APIs and realtime events use normalized rows idempotently.
- [ ] Legacy reaction JSONB is removed after compatibility and load verification.
