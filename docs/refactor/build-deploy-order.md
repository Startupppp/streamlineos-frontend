# Build — deploy order

Closes the DoD item "deploy order documented (expand-contract if live tenants)".

## Standing assumption

`DECISIONS.md` **B-05**: there are **no live production tenants**. That is evidence-backed — the
database held 5 orgs / 7 users / 0 projects / 0 tickets before this work seeded it — and it is the
one assumption that could cause loss if wrong. Two migrations are single-step because of it:

- `0142` drops `tickets."order"` in the same migration that stops using it
- `0146` drops `custom_states` in the same migration that stops using it

**If production data exists anywhere not visible from this database, both must be split
expand-contract before running there.** Everything else in this program is additive.

## Order

1. **Backend first, frontend second.** Every schema change in this program is additive or
   catalog-only, so the current frontend keeps working against the new backend. The reverse is not
   true for `0427`.
2. **`0427` (managed_products PK rename) is the one coupled pair.** It changes the API response
   field from `managedProductId` to `id`, so backend and frontend must ship together. It is a
   catalog-only `RENAME COLUMN`, so the rollback is instant if needed.
3. **`0426` (identity PKs) is safe in either order** — it changes defaults and ownership, not column
   types, so no client contract moves.
4. **`0423` / `0428` are additive** — new tables, columns and a nullable self-FK.
5. **`0424` / `0425` (search function) require the backend to deploy first**, because the service
   calls `app.search_ticket_ids`. The function is created by the migration, so migrate-then-deploy.

## Operator steps that are not migrations

- `VACUUM ANALYZE` on the four SCH-006d tables after `0160` — a table rewrite empties the visibility
  map and invalidates statistics, and `VACUUM` cannot run inside a migration's transaction.
- Nothing else. `ALTER FUNCTION … LEAKPROOF` was withdrawn: it is impossible on Neon (no superuser).

## Rollback

Every migration in this program has a `.down.sql` in `backend/migrations/rollback/`, and each has
been **executed** inside a transaction that asserts the reverted state and then discards it. Two are
partial by design and say so in their headers: `0142` cannot restore the exact original integers
where ranks were fractionally split, and `0423`'s rollback deliberately does not disable RLS.
