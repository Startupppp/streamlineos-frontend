# c10 — Make module-level standing answerable

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 3** · 5 tickets, 0 retired.

The engine is built — `MODULE_REGISTRY`, a real `ROLE_RANK` ladder, a `SCOPE_RANK` grant ceiling. What is missing is the read: nothing can answer *who holds standing in this module, and who may I grant to?* without assembling it from three places. These five tickets add that read and the one operation it enables.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A module's roster is readable](issues/01-a-modules-roster-is-readable.md) | — | ready-for-agent |
| 02 | [An actor knows what they may grant, before they try](issues/02-an-actor-knows-what-they-may-grant.md) | 01 | ready-for-agent |
| 03 | [The read and the write share one predicate](issues/03-the-read-and-the-write-share-one-predicate.md) | 02 | ready-for-agent |
| 04 | [Standing can be granted and revoked](issues/04-standing-can-be-granted-and-revoked.md) | 03 | ready-for-agent |
| 05 | [Module ownership transfers in one operation](issues/05-module-ownership-transfers-in-one-operation.md) | 04 | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
