# S2 — Quotas that refuse, and a commercial ledger with writers

**You are executing this session.** Read this whole file, then start. The user is not watching and
cannot answer questions — proceed on reversible decisions and record them. Read `CLAUDE.md` and
`backend/CLAUDE.md` before your first edit.

Repo: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout. **No worktree, no new
branch.** Four other sessions are running in parallel.

---

## Your 5 tickets — 13 open boxes

| # | File | Boxes | Shape |
|---|---|---|---|
| c17-04 | `architecture-refactor/c17-billing-writes-are-provable/issues/04-a-quota-that-cannot-be-computed-refuses.md` | 7 | a catch returns zeroed counts, so an uncomputable quota *allows* the write |
| c26-02 | `architecture-refactor/c26-commercial-billing-ledger/issues/02-seat-ledger.md` | 3 | schema exists, no service writes it |
| c26-03 | `.../issues/03-proration-ledger.md` | 1 | same |
| c26-04 | `.../issues/04-usage-metering.md` | 1 | same |
| c26-05 | `.../issues/05-tax-currency-invoice-snapshot.md` | 1 | same |

**Order:** c17-04 first — it is the smallest complete change and it establishes the quota path that
c26-02's seat serialisation reuses. Then c26-02 → 03 → 04 → 05.

## Why these five are one session

`plan-limits.service.ts` owns `assertWithinLimit`, and c26-02's criterion is that **seat changes
serialize under the existing per-organisation quota lock** — `quota:${orgId}:members`, the same
advisory lock plan limits already takes. Splitting them would put two sessions in one lock path.

## c17-04 — the defect is the inverse of what a test usually checks

The criterion is *"a count that cannot be computed refuses the limited write and says why"*. Today a
catch swallows the failure and returns zeroed counts, so a database hiccup silently grants unlimited
quota. **Remove the catch that returns zeroed counts**, and write the failure-path test explicitly —
a normal happy-path test passes while the bug is live. The customer-facing half ("a customer can
still see what they have consumed against their plan") must keep working when the count *is*
computable.

## c26 — the work is the writer, not the schema

All four tables exist in `db/schema/billing/` and are created by migrations `0520`–`0524`, which
**are journalled** (idx 293–297 — an earlier note in `APPLY-MIGRATIONS.md` wrongly said they were
not; do not re-journal them). What is missing is any service that writes them:

- **c26-02** — a seat event written under the `quota:${orgId}:members` advisory lock, plus a
  reconciliation query that explains billed quantity from ledger facts.
- **c26-03** — an immutable proration line inserted on upgrade, downgrade and seat-quantity change.
- **c26-04** — an **atomic** usage reservation: acquire before the action spends money, settle
  afterwards, keyed by `idempotencyKey`, honouring `expiresAt`. Never check-then-spend.
- **c26-05** — invoice header and line snapshots frozen at issue, with tax and currency captured.

**Their tables do not exist in any database.** Nothing in this program has been applied. Unit tests
against mocks are the available proof — do not claim a query was executed.

**Before designing consent/limit storage, check what exists.** This program's repeated finding is
that tickets describe defects the codebase has already left; seven were disproved in the 2026-08-26
audit and one was "fixed" before anyone checked and had to be reverted.

---

## Territory

**You own, exclusively:**

```
backend/src/modules/billing/core/plan-limits.service.ts     (+ its spec)
backend/src/modules/billing/core/versioned-catalog.service.ts
backend/src/modules/billing/core/billing.module.ts          ← you own this; S1 requests lines from you
backend/src/modules/billing/core/<new ledger services you create>
backend/src/db/schema/billing/seat-ledger.ts
backend/src/db/schema/billing/proration-ledger.ts
backend/src/db/schema/billing/usage-events.ts
backend/src/db/schema/billing/invoice-snapshot.ts
backend/src/db/schema/billing/commercial-catalog.ts
backend/migrations/0565_*.sql … 0569_*.sql
```

**S1 owns `billing.service.ts`, the webhook controllers, `revenue-analytics.service.ts`,
`payments/**` and `db/schema/billing/billing.ts`.** Do not touch them.

**First thing to fix, and it is yours:** `VersionedCatalogService` is c26-01's deliverable and
appears **exactly once in the whole backend — its own declaration**. It is in no module's
`providers`, so Nest cannot instantiate it and it is dead at runtime, while c26-01's row reads
`done` and three of its criteria cite line numbers inside it. Register it in `billing.module.ts`,
prove it with a Nest testing-module spec (an import-and-construct unit test proves nothing about
DI), then re-verify c26-01 and make its file and index row agree. Details in
`architecture-refactor/lane-requests/lane-1.md`.

**Never edit:** `migrations/meta/_journal.json` · `db/schema/index.ts` · `app.module.ts` ·
either `permissions/index.ts` · `architecture-refactor/README.md`. Write what you need to
`architecture-refactor/lane-requests/s2.md`; the orchestrator applies it. **A migration absent from
`_journal.json` never runs and `db:migrate` reports success anyway.**

---

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** with no tenant GUC — it does not return
  null. `this.db` outside a tenant transaction dies on any RLS table.
- **A new tenant table with no RLS policy is readable org-wide** — grants arrive via
  `ALTER DEFAULT PRIVILEGES`. Any policy you add goes in the same migration as the table.
- **A `db.transaction` mock must invoke its callback, and its tx needs `execute()`** — `withTenant`
  calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside it.
- **Money is integer minor units; the AI credit ledger is integer milli-credits.** Never floats.
- **Reserve/consume atomically BEFORE the paid call, refund on failure** — never check-then-spend.
  That is the house rule c26-04 is an instance of.
- **`CREATE INDEX CONCURRENTLY` cannot run inside a migration transaction.** Use
  `CREATE INDEX IF NOT EXISTS` plus an operator note — precedent `0374_build_partial_indexes.sql`.
- **`import type` on an injected Nest service erases the DI token** — boot failure or a silent
  `null` under `@Optional`. `forwardRef` is banned in new code.
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`.**
- **Do not rewrite a test to accommodate a change.**

---

## Definition of done

**Update a ticket only when the work is complete and tested.**

1. **Tick a `- [ ]` only when you can name the file and line that satisfies it**, written into the
   box's own line. Unsatisfied boxes stay unticked with the blocker written in. **Never delete or
   reword a criterion.**
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — clean.
3. **Run the specs you added or changed, scoped by path.** Authorised for this session, overriding
   the standing "never run tests" rule. Not the full suite — workers get killed. Report exact
   pass/fail counts; never report a suite as passing that you did not run.
4. Only at **zero** `- [ ]`: set `**Status:**` to `done` and update the row in the candidate
   `README.md`. **Do not touch `architecture-refactor/README.md`.**
5. **Never delete a ticket file.**

## Git

You may `commit` verified work on `main`, one commit per ticket. **Never push, checkout, branch,
merge, pull, fetch, reset, stash, rebase, or create a worktree.** Subagents run no git.

The index is **shared with four sessions**. `git add` by explicit pathspec — never `-A` or `.` — and
prefer `git commit -- <paths>`, which takes only those paths regardless of what else is staged.
Re-check `git status --short` after staging. `git commit -- <path>` does not stage untracked files.
`backend/` is a separate git repo from the root.

## Report

Per ticket: Findings · Root cause · Solution · Files changed · Validation (typecheck, exact spec
counts) · anything left open with its blocker · the contents of `lane-requests/s2.md`. State
explicitly whether `VersionedCatalogService` is now reachable and how you proved it.
