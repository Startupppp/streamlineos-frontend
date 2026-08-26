# LANE 1 — Billing writes are provable, and the ledger has writers

**You are executing this lane.** Read this whole file, then start. Do not ask the user what to do
next — the user is not watching. Read `CLAUDE.md` and `backend/CLAUDE.md` before your first edit.

Repository root: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout.
**No worktree, no new branch.** Three other lanes are running in parallel right now.

---

## Your 10 tickets

Read each file in full before working it, plus `prd.md` and `README.md` in its candidate folder.

| # | File | Index status |
|---|---|---|
| c17-01 | `architecture-refactor/c17-billing-writes-are-provable/issues/01-a-provider-event-is-recorded-before-it-is-acted-on.md` | needs re-verification |
| c17-02 | `.../issues/02-a-webhook-acknowledges-only-durable-work.md` | needs re-verification |
| c17-03 | `.../issues/03-a-coupon-can-be-used-once.md` | needs re-verification |
| c17-04 | `.../issues/04-a-quota-that-cannot-be-computed-refuses.md` | needs re-verification |
| c17-05 | `.../issues/05-revenue-reporting-reads-what-is-written.md` | needs re-verification |
| c17-06 | `.../issues/06-dunning-history-is-queryable.md` | blocked on migration 0491 |
| c26-02 | `architecture-refactor/c26-commercial-billing-ledger/issues/02-seat-ledger.md` | ready |
| c26-03 | `.../issues/03-proration-ledger.md` | ready |
| c26-04 | `.../issues/04-usage-metering.md` | ready |
| c26-05 | `.../issues/05-tax-currency-invoice-snapshot.md` | ready |

**Suggested order:** c17-01 → c17-02 → c17-03/04/05 (independent) → c26-02 → c26-03 → c26-04 → c26-05.
c17-06 last; expect to leave it open.

## What these two halves actually are

**c17-01 through c17-05 are re-verification, not construction.** Their files were restored from
*pre-completion* content, so every tick was lost while the code may well be live — the program
README states c17-02 already shipped. Grep the source for the mechanism before writing a line.
Several may close on inspection alone.

**c26-02 through c26-05 are the real build.** Each has a schema file in
`backend/src/db/schema/billing/` (`seat-ledger.ts`, `proration-ledger.ts`, `usage-events.ts`,
`invoice-snapshot.ts`) created by migrations 0520–0524 — and **no service writes to any of them.**
The work is the writer: the seat event under the per-organisation quota advisory lock, the
proration line inserted on plan change, the idempotent usage reservation with settle-on-completion,
the invoice snapshot frozen at issue.

## Known gates — do not work around these

- **c17-03's unique constraint is migration `0473`, written and journalled but unapplied.** The
  application-level check is already live. Write the concurrent test; it will not prove the
  constraint until an operator applies it. Say so rather than claiming enforcement.
- **c17-06's two open boxes are both gated on `0491`.** If it is still unapplied, leave them open
  and record why. Do not narrow the criterion to match what you can do.
- **c26's tables do not exist in any database.** Unit tests against mocks are the available proof.
  Do not claim a query was executed.

---

## Territory

**You own, exclusively:**

```
backend/src/modules/billing/**
backend/src/modules/platform/**
backend/src/db/schema/billing/**
backend/migrations/0525_*.sql … 0529_*.sql   (your reserved numbers)
```

**Everything else is another lane's.** If a fix needs a file outside your territory:
do not edit it. Name the exact file, line and change in `architecture-refactor/lane-requests/lane-1.md`
and in your final report, and leave the affected box unticked with that reason written into it.

**Never edit these — they are single files four lanes would collide on:**
`backend/migrations/meta/_journal.json` · `backend/src/db/schema/index.ts` ·
`backend/src/app.module.ts` · `backend/src/modules/rbac/permissions/index.ts` ·
`frontend/lib/rbac/permissions/index.ts`.

Write what you need into `architecture-refactor/lane-requests/lane-1.md` — the exact journal entry
JSON, the exact export line, the exact provider registration. The orchestrator applies them.
**A migration absent from `_journal.json` never runs and `db:migrate` still reports success**, so a
missing request is a migration that silently does nothing.

---

## Re-verify every premise before building against it

This program's most repeated finding is that tickets describe defects the codebase has already
left. Seven were disproved in the 2026-08-26 audit recorded in `architecture-refactor/README.md`;
one was "fixed" before anyone checked and had to be reverted. **A ticket's premise is evidence,
not instruction.**

Estimates in these tickets skew high in a consistent direction — 487 → 2, "13 pages" → 0,
"at least 20" → 29. Classify, do not count.

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** when the GUC is absent — it does not
  return null. `this.db` outside a tenant transaction dies on any RLS table. Use
  `runInTenantTransaction` / `runInNewTenantTransaction(db, orgId, fn)` / `forEachOrg`.
- **After-commit hooks, cron handlers and `void something(...)` have no ambient tenant.** Use
  `registerAfterCommit` (returns `boolean`) and open a fresh tenant transaction inside it.
  Never `.catch(() => undefined)` — that is exactly the swallow c17-02 exists to remove.
- **A `db.transaction` mock must invoke its callback, and its tx object needs `execute()`** —
  `withTenant` calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside.
  Five tests in one suite proved nothing for months for this reason. Check every mock you touch.
- **`CREATE INDEX CONCURRENTLY` cannot run inside a migration transaction.** House pattern is
  plain `CREATE INDEX IF NOT EXISTS` plus an operator note — precedent `0374_build_partial_indexes.sql`.
- **A new tenant table with no RLS policy is readable org-wide** — grants arrive via
  `ALTER DEFAULT PRIVILEGES`. Policy goes in the same migration as the table.
- **Money is integer minor units. The AI credit ledger is integer milli-credits.** Never floats.
- **`prepare: false` on the Neon driver** makes `sql.placeholder` inert.
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — it runs only under `pnpm test:e2e`. Do not
  cite an e2e spec as executed coverage.
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`** or it OOMs.
- **Do not rewrite a test to accommodate a change.** A test failing because behaviour changed is
  the signal, not an obstacle.

---

## Definition of done — the part that matters

The user's instruction: **update the todo list only once a ticket is completed and tested working.**

Per ticket, in order:

1. **Tick a `- [ ]` box only when you can name the file and line that satisfies it**, and write
   that evidence into the box's own line. A box you cannot satisfy stays unticked with the
   blocker written in. Never delete a criterion. Never reword one to fit what you built.
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — must be clean.
3. **Run the specs you added or changed, scoped by path.** You are authorised to run tests for
   this lane; that overrides the standing "never run tests" rule in `CLAUDE.md`. Do not run the
   full suite — workers get killed. Report exact pass/fail counts. **Never report a suite as
   passing that you did not run.**
4. Only when the ticket file has **zero** `- [ ]` left: set its `**Status:**` line to `done`,
   update its row in the candidate `README.md`, then update the wave-table counts in
   `architecture-refactor/README.md`.
5. **Never delete a ticket file.** Retiring means marking it done and keeping the evidence.
   Deleting them cost 48 files and their proofs once already.

## Git

You may `commit` verified work on `main` — one commit per ticket or per coherent group.
**Never push, checkout, branch, merge, pull, fetch, reset, stash, rebase, or create a worktree.**
If you spawn subagents, they run no git at all; you make the commits.

The index is **shared with three concurrent sessions**. Always `git add` by explicit pathspec,
never `-A` or `.`, and re-check `git status --short` after staging to confirm you staged only your
own files. `git commit -- <path>` does **not** stage untracked files; add them first.
The `backend/` directory is a separate git repository from the root — commit in both as needed.

## Operating mode

Proceed without asking for reversible actions that follow from this file. Do not end a turn on a
plan, a question, or a promise about work you have not done. End only when the lane is complete or
you are blocked on something only an operator can do.

**Final report, per ticket:** Findings · Root cause · Solution · Files changed · Validation
(typecheck result, exact spec counts) · and for anything left open, the precise blocker.
Plus the contents of `lane-requests/lane-1.md` if you wrote any.
