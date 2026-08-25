# 03 — The event stream gets partitioned before it becomes large

**What to build:** `outbox_events` is an append-only event stream, which is precisely the class of table the constitution says to partition by time. It has not been partitioned, deliberately: the trigger is demonstrable size and the dev table holds **7 rows**, which proves nothing. This ticket exists so the decision is made on evidence rather than forgotten until the table is painful.

**The ordering constraint is the whole reason this is its own ticket.** The partition key must be in every PK and UNIQUE constraint, so the PK becomes `(outbox_event_id, created_at)` and a bare id stops being globally unique. That is much cheaper to do before the table is large and before other code starts joining on the bare id.

**Blocked by:** None, but do not execute until the row count justifies it.

**Status:** ready-for-agent — hold until the trigger fires

## Acceptance criteria

- [ ] The production row count and growth rate are measured and recorded here. The dev figure (7 rows, 2026-08-25) is explicitly not evidence.
- [ ] A written trigger: the row count or growth rate at which partitioning proceeds.
- [ ] If the trigger is not met: this ticket is closed as "not yet", with the number, and nothing is changed.
- [ ] If it is met: RANGE partition on `created_at`, monthly, partitions pre-created ahead of need.
- [ ] The PK becomes `(outbox_event_id, created_at)`, and the tenant key `(org_id, outbox_event_id)` is preserved.
- [ ] Nothing joins on a bare `outbox_event_id` expecting global uniqueness — checked, not assumed.
- [ ] Retirement is `DETACH PARTITION CONCURRENTLY` then `DROP TABLE`, never a bulk `DELETE`.
- [ ] The migration records the triggering row count, as the constitution requires.
- [ ] RLS policies survive on every partition — a partition without a policy is a silent cross-tenant hole.

## Todo

- [ ] Measure production rows and growth; record both here
- [ ] Decide and record whether the trigger is met
- [ ] If not met, close as "not yet" and stop — do not partition speculatively
- [ ] If met: check for bare-id joins first, then write the migration
- [ ] Verify RLS on each partition and that the relay's claim still works after partitioning
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
