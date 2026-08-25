# 03 — Invoice numbering is race-free

**What to build:** Two people issuing invoices at the same moment cannot take the same number. An invoice number is a compliance artifact, so this needs to be known rather than assumed — it is race-free if it comes from a database sequence, and not if it is a maximum plus one without a lock.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] The current mechanism is read and recorded before anything changes.
- [x] Two concurrent issues produce distinct numbers.
- [x] The numbering rule — unique, and gapless or not — is stated.
- [x] If it needed changing, the fix follows the ticket-number pattern already used across nine services.

## Findings

**Already safe — no code change.** `invoices-write.service.ts` lines 95–103 take
`pg_advisory_xact_lock(hashtext(orgId || 'invoice'))` inside the transaction before counting
and assigning. Two concurrent creates for the same org serialize at that lock.

**Numbering rule: GAPLESS.** The count query has no status filter and no `deleted_at` filter.
Voided invoices change `status` to `VOIDED` but are never physically deleted, so the count
always equals the true row cardinality. `count(*) + 1` therefore never skips a number.
The format `INV-{year}-{padded-count}` embeds the current year but the counter is cumulative
across the org's lifetime — it does not restart per year.

**Test added:** `src/modules/invoices/__tests__/invoice-numbering.db.spec.ts` (guarded by
`INV_DB_TESTS=1`). Two genuine concurrent Postgres transactions with the advisory lock
produce distinct numbers (1 and 2). The same test without the lock produces a collision
(both assign 1), proving the test discriminates.

## Todo

- [x] Verify first; this may be a no-op
- [x] If changing, reuse the existing advisory-lock or sequence pattern rather than inventing one
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
