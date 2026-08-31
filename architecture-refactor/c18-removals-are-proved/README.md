# c18 — Removals are proved, not grepped

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 4 tickets, 3 closed, 1 blocked on the operator.

The honest answer is that there is very little to delete: zero unused frontend files across 4,429, and the backend's only 11 are a deliberate spec-guarded arrangement. This exists mostly to record **how** deletion is proved here, because a route scan reported 1,074 dead endpoints when the true figure was approximately one.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The standard of proof is written down | — | done |
| 02 | Six overlapping route groups become one each | — | done — 1 collision fixed; PRD count corrected from six |
| 03 | [The confirmed dead controller is removed](issues/03-the-dead-controller-is-removed.md) | — | BLOCKED on the operator — no access log exists |
| 04 | The downstream schema removals | c16-04, c17-06 | done |

**02 and 03 were unblocked from c18-01 on 2026-08-26**, whose two remaining criteria — the retention marker on `hrms-phase1-sql-managed.ts` and the frontend cycle CI step — both landed and were verified at source. 02 then proceeded; **03 turned out to be blocked by something the old text hid**: this candidate's own standard forbids deleting an endpoint without access logs, and no deployment has ever produced one.

**"Six overlapping route groups" measured one.** Enumerating 3,523 routes across 538 controller classes found a single exact method+path collision — `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`, where module registration order silently decided which of two disagreeing permission contracts applied. It is consolidated and guarded by `backend/src/app-route-uniqueness.spec.ts`. A first version of that scan reported eleven, because it read one `@Controller` prefix per file when a file may declare four. **The scan that is wrong by an order of magnitude, in the permissive direction, is this candidate's recurring subject.**

## Closed tickets

**01 — The standard of proof is written down.** The deletion standard is recorded in `architecture-refactor/c18-removals-are-proved/prd.md` (Implementation Decisions) and root `CLAUDE.md §10`: module-graph tool + real build for files; access logs for endpoints; symbol, raw-name, FK, and spec checks for tables. `backend/src/db/schema/hrms-phase1-sql-managed.ts:1-10` now leads with a DO-NOT-DELETE block comment explaining that knip will report all 11 files as unused and that `migration-integrity.spec.ts` asserts the arrangement. Dead-code knip runs reporting-only in backend CI (`ci.yml:61-63`, `continue-on-error: true`); zero-cycle assertion gates both repos (`backend ci.yml:58-59`; `frontend ci.yml:40-42`).

**02 — Six overlapping route groups become one each.** One collision found and removed (not six): `StorageVaultController.remove` was unreachable because `HrModule` registration (`app.module.ts:153`) shadowed `StorageModule` (`:173`); the dead handler was deleted in backend commit `9d45d2a8`, leaving the recruitment handler as the canonical and stricter contract. Regression guard at `backend/src/app-route-uniqueness.spec.ts` verified red when the collision was reintroduced. **Finding handed to `architecture-refactor/OPEN-FINDINGS.md`:** `vault_access_logs.vaultDocumentId` cascades on delete, so the audit trail for vault deletions is permanently unrecoverable — adding an insert that the cascade immediately destroys is not a fix.

**04 — The downstream schema removals.** `invoices.line_items` JSONB array dropped via migration `0478` after `0477` reconciled to zero unmigrated rows; `subscriptions` dunning JSONB dropped after `0491` backfilled the `dunning_attempts` table. Zero symbol and raw-name references confirmed before each drop (only `quoteLineItems`/`payrollLineItems` hits, different tables); `migration-integrity.spec.ts` 35/35 after both.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
