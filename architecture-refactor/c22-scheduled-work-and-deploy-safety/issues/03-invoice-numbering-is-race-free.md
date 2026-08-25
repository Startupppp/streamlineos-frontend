# 03 — Invoice numbering is race-free

**What to build:** Two people issuing invoices at the same moment cannot take the same number. An invoice number is a compliance artifact, so this needs to be known rather than assumed — it is race-free if it comes from a database sequence, and not if it is a maximum plus one without a lock.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The current mechanism is read and recorded before anything changes.
- [ ] Two concurrent issues produce distinct numbers.
- [ ] The numbering rule — unique, and gapless or not — is stated.
- [ ] If it needed changing, the fix follows the ticket-number pattern already used across nine services.

## Todo

- [ ] Verify first; this may be a no-op
- [ ] If changing, reuse the existing advisory-lock or sequence pattern rather than inventing one
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
