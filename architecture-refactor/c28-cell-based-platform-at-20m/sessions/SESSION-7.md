# Session 7 — The migration chain rebuilds the database

One ticket, no blockers, and it is the single highest-value piece of work left in c28. Everything about
building a second cell, restoring from backup, or trusting CI's "rebuilds from empty" rests on it.

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §0 (do not stop), §1 (ask everything now), §2 (a
   checkbox is evidence) and §4 (migrations).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`.
3. Your ticket in full: [`../issues/33-the-chain-rebuilds-the-database.md`](../issues/33-the-chain-rebuilds-the-database.md).
4. Ticket [`26`](../issues/26-a-second-cell-is-proved-cold.md) — its cold-bootstrap criterion is what this
   session exists to close, and its write-up is where the numbers came from.

## Your ticket

| # | Ticket | Blocked by |
|---|---|---|
| 33 | The migration chain rebuilds the database it claims to describe | — |

One ticket, but it is large. Session 6 measured the gap; you close it.

## The situation in one paragraph

`cell:bootstrap` is fully scripted and reaches head — 334/334 journal entries, no manual step. But 130
statements reference objects no earlier migration creates, and comparing the result against the control
from `pg_catalog` finds **3,243 differences**: 65 missing tables (the whole accounting/AP/AR/GL/tax
model, which `0591`'s own header admits the baseline never created), 1,013 columns, 346 indexes, 1,139
constraints, 281 enums, 62 policies, 34 triggers. Three objects exist **only** in the fresh build —
production dropped them out of band and the chain still creates them.

## Ask these first — plus anything else you find

1. **The three cell-only objects — which direction is correct?** `credit_note_items`,
   `fin_payment_run_items`, `vendor_credit_items` exist in a fresh build and not in production. Either
   the chain should stop creating them, or production is missing them. Find out whether anything reads or
   writes them before asking, then ask for the product ruling. *Do not pick the easier direction.*
2. **How much of the 65 is deliberate?** `db/schema/hrms-phase1-sql-managed.ts` is a spec-guarded holding
   barrel for tables intentionally managed by raw SQL outside the Drizzle chain. Check how many of the 65
   belong to that pattern before treating them all as oversights, and ask for a ruling on any that are
   ambiguous.
3. **Is the control database the right control?** Confirm what `cell:compare-schema` compares against and
   whether that instance is itself the intended shape — 9 extra columns, 60 extra indexes, 158 extra
   constraints and 3 extra policies exist on the control side too. Some of those may be the drift rather
   than the truth.
4. **Batch size and review appetite.** 65 tables is a lot of DDL. Confirm whether you should land it as
   one migration per domain (ap, ar, gl, tax, accounting-core) or one per table.

## Territory

**Yours, exclusively:** `backend/migrations/**` (new `.sql` files and their journal entries),
`backend/src/db/schema/**` where a schema file and the catalog genuinely disagree, and the
`cell:compare-schema` / `cell:bootstrap` scripts under `backend/src/scripts/`.

**`backend/migrations/meta/_journal.json` is append-only.** Re-read it immediately before writing, never
reorder, and commit it in the same commit as its `.sql`.

**Not yours:** application code. If closing a gap appears to need a service change, that is a finding —
report it in [`CROSS-SESSION.md`](CROSS-SESSION.md) rather than making it.

## Traps in this territory

- **Derive the DDL from `pg_catalog`, not from the Drizzle schema files.** The schema files are what
  should be true; the catalog is what is. Where they disagree, the disagreement is the finding.
- **`generate --custom` copies the snapshot instead of diffing it**, so the next `db:generate`
  re-proposes work already applied. This is the fastest way to make the problem worse.
- **A `.sql` absent from `meta/_journal.json` never applies and `db:migrate` reports success anyway.**
  Drizzle skips by TIMESTAMP, not by hash.
- **A migration can be recorded as applied with half its statements unrun** — that has happened here.
  Only a `pg_catalog` diff finds it, which is why this ticket's evidence is the comparison and not an
  exit code.
- **A migration's filename is not its table name.** Grep `CREATE TABLE` inside it.
- **RLS parity is a security criterion, not a tidiness one.** Grants arrive via
  `ALTER DEFAULT PRIVILEGES`, so a table created without its policy is readable org-wide. Never let the
  62 tables land ahead of the 62 policies.
- **`VACUUM ANALYZE` after any rewrite**; a rewrite kills the statistics and empties the visibility map.
- **`SET lock_timeout = '5s'` as the first statement of every migration.**
- **Re-run from genuinely empty after each batch.** A chain error is cheap to find in a batch of five and
  expensive in a batch of sixty-five.

## Definition of done

- `cell:compare-schema` reports `differences=0`, or every remainder is listed with a reason and a decision.
- `chain_gaps` is **0** from a genuinely empty database.
- A CI step fails the build when the chain and the schema diverge, self-tested against a deliberate
  divergence — a check that has never failed proves nothing.
- Ticket 26's cold-bootstrap criterion is ticked with this run as its evidence, and you say so in
  `CROSS-SESSION.md` since ticket 26 is Session 6's.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- A commit per batch, pathspec-scoped, journal included.
