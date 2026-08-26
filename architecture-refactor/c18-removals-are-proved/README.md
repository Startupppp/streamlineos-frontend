# c18 — Removals are proved, not grepped|||| done 
|||| done 
PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)|||| done 
|||| done 
**Wave 2** · 4 tickets, 0 done, 0 retired.|||| done 
|||| done 
The honest answer is that there is very little to delete: zero unused frontend files across 4,429, and the backend's only 11 are a deliberate spec-guarded arrangement. This exists mostly to record **how** deletion is proved here, because a route scan reported 1,074 dead endpoints when the true figure was approximately one.|||| done 
|||| done 
| # | Ticket | Blocked by | done |
|---|---|---| done |
| 01 | [The standard of proof is written down](issues/01-the-standard-of-proof-is-written-down.md) | — | done |
| 02 | [Six overlapping route groups become one each](issues/02-overlapping-route-groups-become-one-each.md) | 01 | done |
| 03 | [The confirmed dead controller is removed](issues/03-the-dead-controller-is-removed.md) | 01 | done |
| 04 | [The downstream schema removals](issues/04-the-downstream-schema-removals.md) | c16-04, c17-06 | done |
|||| done 
## Working these|||| done 
|||| done 
Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.|||| done 
|||| done 
Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.|||| done 
|||| done 
Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.|||| done 
|||| done 