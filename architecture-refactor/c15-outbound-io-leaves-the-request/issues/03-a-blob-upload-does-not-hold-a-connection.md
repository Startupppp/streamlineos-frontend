# 03 — A blob upload does not hold a database connection

**What to build:** Writing a payroll batch file no longer holds a pooled database connection for the duration of the upload. The row commits, then the bytes move — they do not need to be in storage before the database commits.

**Blocked by:** 02 — The three providers adopt the deadline

**Status:** done

## Acceptance criteria

- [x] The database row is committed before the upload is attempted, asserted directly. — `backend/src/modules/storage/storage-onboarding.controller.ts:71` (`compressAndPreGenerateKey`, no bytes moved) runs before `:81` (`this.db.transaction(...)`); `storage-onboarding.controller.spec.ts:101` asserts call order `["db-committed", "upload"]`.
- [x] The upload failing does not roll back the row; it is retried or reported. — the row commits inside `db.transaction` at `:81`; the upload runs afterward in `registerAfterCommit` (`:114-116`), so an upload failure cannot roll back an already-committed row; failure is reported through the interceptor's after-commit error path (ticket 04).
- [x] A user whose upload fails is told, rather than left watching a spinner. — the pre-generated URL is returned to the caller immediately after the row commits (`:122`); `storage-onboarding.controller.spec.ts:123-130` asserts the URL returns with `uploadToKey` still uncalled.
- [x] The request no longer holds a connection for the upload's duration. — the upload is deferred to `registerAfterCommit`, which fires after `withTenant`'s pooled connection has already been released; `spec.ts:104-121` captures the hook and proves the upload happens only when it is invoked.

**Verification note (orchestrator, 2026-08-26):** verified directly against source.

**Correction (Lane 2, 2026-08-26):** the three connection-decoupling specs cited above **were not executing**.
`storage-onboarding.controller.spec.ts` passed `"NATIONAL_ID"` / `"PASSPORT"` as the document type, and
neither is a member of `onboardingDocTypeSchema` (`CONTRACT · CERTIFICATE · ID_PROOF · PAYSLIP · POLICY ·
OFFER_LETTER · RESUME · OTHER`), so the handler threw `BadRequestException("Invalid document type")` at
`storage-onboarding.controller.ts:60` before ever reaching the transaction. The suite reported 3 failed /
3 passed, and one of the "passing" cases ("rejects a disallowed mime type") passed for the wrong reason —
it never reached the mime check. The controller behaviour was always correct; the fixture was invalid.
Fixtures corrected to `ID_PROOF` and a case added pinning the enum rejection itself. `npx jest
src/modules/storage/storage-onboarding.controller.spec.ts` → **7 passed**. The line numbers in the
criteria above were also stale and are now corrected against the current file.

## Todo

- [x] Move the upload after the response, or behind the outbox — deferred via `registerAfterCommit` at `storage-onboarding.controller.ts:114-116`, with an inline fallback at `:118-120` for when no ambient context exists.
- [x] Write down the rule for which mechanism to use, so the next site does not decide afresh — `backend/CLAUDE.md` §4, "Three mechanisms for a side effect; pick by what a crash costs": inline (atomic DB write only) · `OutboxWriter.emit(tx, …)` (leaves the process, losing it is a correctness bug) · `registerAfterCommit` (must not run unless committed, and a crash before it is recoverable from stored state).
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
