# 42: Repair and enforce the migration chain

**What to build:** A cold database and upgraded database reach the same declared schema with zero chain gaps, and CI prevents unjournalled migration work.

**Blocked by:** 11, 13, 14, 15 and 16.

**Status:** ready-for-agent

- [ ] Every migration is journaled in dependency order and the reported chain-gap count is zero.
- [ ] Cold bootstrap and upgrade schema comparison report no differences.
- [ ] Repair/backfill work is resumable, lock-bounded and catalog-verified.
- [ ] CI rejects unjournalled SQL, chain gaps and cold/runtime schema drift.
