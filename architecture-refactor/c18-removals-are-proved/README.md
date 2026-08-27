# c18 — Removals are proved, not grepped

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 4 tickets, 1 done.

The honest answer is that there is very little to delete: zero unused frontend files across 4,429, and the backend's only 11 are a deliberate spec-guarded arrangement. This exists mostly to record **how** deletion is proved here, because a route scan reported 1,074 dead endpoints when the true figure was approximately one.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [The standard of proof is written down](issues/01-the-standard-of-proof-is-written-down.md) | — | done |
| 02 | [Six overlapping route groups become one each](issues/02-overlapping-route-groups-become-one-each.md) | — | in-progress — 1 collision found and consolidated; the PRD's other five never named |
| 03 | [The confirmed dead controller is removed](issues/03-the-dead-controller-is-removed.md) | — | BLOCKED on the operator — no access log exists |
| 04 | [The downstream schema removals](issues/04-the-downstream-schema-removals.md) | c16-04, c17-06 | done |

**02 and 03 were unblocked from c18-01 on 2026-08-26**, whose two remaining criteria — the retention marker on `hrms-phase1-sql-managed.ts` and the frontend cycle CI step — both landed and were verified at source. 02 then proceeded; **03 turned out to be blocked by something the old text hid**: this candidate's own standard forbids deleting an endpoint without access logs, and no deployment has ever produced one.

**"Six overlapping route groups" measured one.** Enumerating 3,523 routes across 538 controller classes found a single exact method+path collision — `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`, where module registration order silently decided which of two disagreeing permission contracts applied. It is consolidated and guarded by `backend/src/app-route-uniqueness.spec.ts`. A first version of that scan reported eleven, because it read one `@Controller` prefix per file when a file may declare four. **The scan that is wrong by an order of magnitude, in the permissive direction, is this candidate's recurring subject.**

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
