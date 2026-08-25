# 03 — A blob upload does not hold a database connection

**What to build:** Writing a payroll batch file no longer holds a pooled database connection for the duration of the upload. The row commits, then the bytes move — they do not need to be in storage before the database commits.

**Blocked by:** 02 — The three providers adopt the deadline

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The database row is committed before the upload is attempted, asserted directly.
- [ ] The upload failing does not roll back the row; it is retried or reported.
- [ ] A user whose upload fails is told, rather than left watching a spinner.
- [ ] The request no longer holds a connection for the upload's duration.

## Todo

- [ ] Move the upload after the response, or behind the outbox
- [ ] Write down the rule for which mechanism to use, so the next site does not decide afresh
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
