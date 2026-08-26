# c23 — A tenant extends the product without a deploy

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 5 tickets, 2 done.

306 of 415 enums are tenant-facing taxonomy, so adding a candidate status or expense category needs a migration and a release. **Build and CRM already model this correctly** — status as text under a tenant-scoped foreign key, with a transitions table carrying approval and required-field rules. This is propagation of a proven pattern, not a redesign.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The 306 taxonomies are classified | — | done |
| 02 | [One module's taxonomy moves to lookup tables](issues/02-one-modules-taxonomy-moves-to-lookup-tables.md) | 01 | ready-for-agent |
| 03 | [Custom field values are indexed](issues/03-custom-field-values-are-indexed.md) | — | ready-for-agent |
| 04 | [HR's table count is frozen and payroll is one folder](issues/04-hr-stops-growing-and-payroll-is-one-folder.md) | — | **done** |
| 05 | [The shared schema file splits by domain](issues/05-the-shared-schema-file-splits-by-domain.md) | — | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
