# 02 — Budgets cover the paths users wait on

**What to build:** The forty or so reads that carry the product — the ones a user waits for, over tables that grow with the tenant — each have a declared ceiling. Slowness on any of them becomes a build failure rather than a support ticket.

**Blocked by:** 01 — A read budget is data, not a script

**Status:** done

## Acceptance criteria

- [x] Every budgeted query is a read on a path a user waits for, over a tenant-growing table.
- [x] The budgeted set is named explicitly rather than described as a category.
- [x] Seed adequacy is asserted — below a stated row count the run fails with 'seed too small' rather than reporting success.
- [x] Global search, the ticket board, notifications, chat history and the busiest finance lists are all covered.
- [x] Ceilings are set to catch a plan falling off an index, not ordinary variance.

## Unbudgeted — and why

43 budgets cover Build (tickets, board, my-work), notifications, chat, KB, HR (leave, attendance, ledger, balances), CRM (contacts, leads, deals, clients), finance (invoices, purchase bills, GL journals), payroll (runs, employees, line items), inventory (products, stock levels, stock transactions, purchase orders, vendors), people directory, and SECURITY DEFINER global search (tickets, lead parties, deals, contact parties, client parties). Routes not budgeted: write paths (cost check belongs to `check-request-transaction-cost.mjs`), background jobs (no waiting user), AI endpoints (cost is token-metered not block-measured), settings/config reads (tiny tenantless tables), and one-off administrative queries not on a hot path.

## Todo

- [x] List the candidate reads and cut to the ones with a waiting user
- [x] Seed to scale before measuring
- [x] VACUUM ANALYZE after seeding — a rewrite empties the visibility map and an Index Only Scan silently degrades
- [x] Record what was left unbudgeted and why
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c11 — Make "this query is fast" a thing CI proves`](../prd.md) · Candidate index: [`../README.md`](../README.md)
