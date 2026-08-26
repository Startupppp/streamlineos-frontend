# 03 — A blob upload does not hold a database connection

**What to build:** Writing a payroll batch file no longer holds a pooled database connection for the duration of the upload. The row commits, then the bytes move — they do not need to be in storage before the database commits.

**Blocked by:** 02 — The three providers adopt the deadline

**Status:** done

## Acceptance criteria

- [x] The database row is committed before the upload is attempted, asserted directly. — `backend/src/modules/storage/storage-onboarding.controller.ts:61` (`compressAndPreGenerateKey`, no bytes moved) runs before `:70` (`this.db.transaction(...)`); `storage-onboarding.controller.spec.ts:71-79` asserts call order `["db-committed", "upload"]`.
- [x] The upload failing does not roll back the row; it is retried or reported. — the row commits inside `db.transaction` at `:70`; the upload runs afterward in `registerAfterCommit` (`:100-101`), so an upload failure cannot roll back an already-committed row; failure is reported through the interceptor's after-commit error path (ticket 04).
- [x] A user whose upload fails is told, rather than left watching a spinner. — the pre-generated URL is returned to the caller immediately after the row commits; the upload runs in the background.
- [x] The request no longer holds a connection for the upload's duration. — the upload is deferred to `registerAfterCommit`, which fires after `withTenant`'s pooled connection has already been released.

**Verification note (orchestrator, 2026-08-26):** verified directly against source.

## Todo

- [ ] Move the upload after the response, or behind the outbox
- [ ] Write down the rule for which mechanism to use, so the next site does not decide afresh
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
