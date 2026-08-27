# c16 — The schema says what it means

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 9 tickets, 7 done.

809+ tables, 1,210 tenant-led indexes, 654 composite tenant foreign keys, 79 org triggers and broad RLS coverage. **The schema is in good shape and this is not a redesign.** Eight tickets fix places where the schema or read/write implementation states something other than the truth. RLS enforcement itself is tracked by c25-04 because the current verifier reports coverage without gating it.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [One table owns a person's identity](issues/01-one-table-owns-a-persons-identity.md) | — | done — 0488 applied; identity lives on organization_people |
| 02 | A calendar event carries its timezone | — | done |
| 03 | A recurring event recurs, or the columns go | 02 | done |
| 04 | [Invoice line items are queryable](issues/04-invoice-line-items-are-queryable.md) | — | done — 0477/0478 applied in order with the reconciliation gate between |
| 05 | [Every audit row names its tenant](issues/05-every-audit-row-names-its-tenant.md) | — | done — platform events use NULL `org_id` plus an exact consistency CHECK |
| 06 | [Candidate résumé text leaves the row](issues/06-candidate-resume-text-leaves-the-row.md) | — | in-progress — budget blocked on seed data |
| 07 | Free/busy and conflict checks expand the same calendar series | 02, 03 | done |
| 08 | Calendar sources obey one bounded overlap contract | 02, 03, 07 | done |
| 09 | [A leave policy that says it restricts, does](issues/09-a-leave-policy-that-says-it-restricts-does.md) | — | done |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
