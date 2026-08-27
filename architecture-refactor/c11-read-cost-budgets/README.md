# c11 — Make "this query is fast" a thing CI proves

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 3 tickets, 3 done. Fully closed.

`check-build-read-cost.mjs` is the best performance engineering in either repo — it connects as the non-BYPASSRLS app role, sets the tenant GUC, runs `EXPLAIN (ANALYZE, BUFFERS)`, and asserts both a block ceiling and an Index Only Scan. It guarded two queries out of 3,385 routes. These three tickets made it general.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | A read budget is data, not a script | — | done |
| 02 | Budgets cover the paths users wait on | 01 | done |
| 03 | A breach fails the build | 01 | done |

## Closed ticket digests

**01 — A read budget is data, not a script.** Budget entries (id, query text, fixture requirements, block ceiling, plan assertions) replaced hard-coded script logic. Assertions can require an Index Only Scan or forbid a sequential scan on a named relation; a missing relation is a hard failure rather than a vacuous pass. The two pre-existing checks were promoted to budget entries with no behaviour change. Unit tests exercise the plan walker against recorded EXPLAIN fixtures (no live database required).

**02 — Budgets cover the paths users wait on.** 43 budgets were declared across Build (tickets, board, my-work), notifications, chat, KB, HR (leave, attendance, ledger, balances), CRM (contacts, leads, deals, clients), finance (invoices, purchase bills, GL journals), payroll (runs, employees, line items), inventory (products, stock levels, stock transactions, purchase orders, vendors), people directory, and SECURITY DEFINER global search. Seed adequacy is asserted — runs on under-seeded data exit with "seed too small". Ceilings are sized to catch plan regression off an index, not ordinary variance. Excluded: write paths, background jobs, AI endpoints, settings/config reads, one-off admin queries.

**03 — A breach fails the build.** The budget runner is wired into CI after the seed step, against a database rebuilt from empty. A breach exits non-zero naming the query, measured cost and ceiling. A deliberately-impossible ceiling is part of the CI suite, proving the guard can fail at all. The same command runs locally. Ceiling changes are visible as a diff in review.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
