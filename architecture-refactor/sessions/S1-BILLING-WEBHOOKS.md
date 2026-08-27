# S1 — Every billing write is provable: webhooks, coupons, revenue

**You are executing this session.** Read this whole file, then start. The user is not watching and
cannot answer questions — proceed on reversible decisions and record them. Read `CLAUDE.md` and
`backend/CLAUDE.md` before your first edit.

Repo: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout. **No worktree, no new
branch.** Four other sessions are running in parallel.

---

## Your 4 tickets — 34 open boxes

| # | File | Boxes |
|---|---|---|
| c17-01 | `architecture-refactor/c17-billing-writes-are-provable/issues/01-a-provider-event-is-recorded-before-it-is-acted-on.md` | 8 |
| c17-02 | `.../issues/02-a-webhook-acknowledges-only-durable-work.md` | 10 |
| c17-03 | `.../issues/03-a-coupon-can-be-used-once.md` | 9 |
| c17-05 | `.../issues/05-revenue-reporting-reads-what-is-written.md` | 7 |

Read each in full, plus `c17-billing-writes-are-provable/prd.md` and its `README.md`.
**Order:** c17-01 → c17-02 (02 depends on 01) → c17-03 → c17-05.

## Start by re-verifying, not building

These four files were **restored from pre-completion content**, so their ticks were lost while the
code may well be live — the program README states c17-02 already shipped. They carry no file
references at all, which is why they read as if nothing exists. **Grep the source for each mechanism
before writing a line.** Some may close on inspection.

The candidate's own framing: every defect here is *a mechanism that looks like enforcement and is
not*, and each fails permissively — on a billing path that means revenue loss rather than an error
someone notices.

## What is actually there

- `modules/billing/core/billing.service.ts` — carries **both** the webhook handling and coupon
  redemption. This is why these four tickets are one session.
- `modules/billing/core/razorpay-webhook.controller.ts` and
  `modules/billing/payments/payment-webhooks-public.controller.ts` — the two entry points.
- `db/schema/billing/provider-webhook-events.ts` — the table c17-01 is about.
- `modules/billing/core/revenue-analytics.service.ts` — the reader in c17-05.
- **`revenue_events` (`db/schema/billing/billing.ts:259`) has ZERO writers.** Only the schema
  definition and its indexes reference it. That is c17-05's whole subject: its first criterion is
  explicitly *"either every billing state change records a revenue event, or the reader and its
  table are removed"*. **Decide write-or-delete before building either**, and write the decision
  into the ticket and `docs/specs/`. If you choose to write, emit through the outbox so a new code
  path cannot forget, and enumerate exactly which state changes must emit.

## Known gate — do not work around it

**c17-03's unique constraint is migration `0473`, written and journalled but UNAPPLIED.** The
application-level check is already live. You can write the concurrent-redemption test, but it will
not prove the constraint until an operator applies it — the criterion says *"a unique constraint
does the actual enforcement, not an application-level check"*, so say plainly what is and is not
proven rather than ticking on the application check.

---

## Territory

**You own, exclusively:**

```
backend/src/modules/billing/core/billing.service.ts        (+ its spec)
backend/src/modules/billing/core/razorpay-webhook.controller.ts
backend/src/modules/billing/core/billing-webhook.spec.ts
backend/src/modules/billing/core/billing.controller.ts
backend/src/modules/billing/core/revenue-analytics.service.ts
backend/src/modules/billing/payments/**
backend/src/db/schema/billing/provider-webhook-events.ts
backend/src/db/schema/billing/billing.ts
backend/migrations/0560_*.sql … 0564_*.sql
```

**S2 owns `plan-limits.service.ts`, `billing.module.ts`, and every new `*-ledger` / usage service.**
If you need a provider registered in `billing.module.ts`, do **not** edit it — write the exact line
to `architecture-refactor/lane-requests/s1.md` and say so in your report.

Everything else belongs to another session. If a fix needs a file outside your list: do not edit it.
Name the file, line and change in `lane-requests/s1.md`, and leave the box unticked with that reason.

**Never edit:** `migrations/meta/_journal.json` · `db/schema/index.ts` · `app.module.ts` ·
either `permissions/index.ts` · `architecture-refactor/README.md`. Request them instead.

---

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** when the tenant GUC is absent — it does
  not return null. `this.db` outside a tenant transaction dies on any RLS table. Use
  `runInTenantTransaction` / `runInNewTenantTransaction(db, orgId, fn)` / `forEachOrg`.
- **A webhook handler has no ambient tenant until it establishes one**, and after-commit hooks,
  cron handlers and `void something(...)` have none at all. Use `registerAfterCommit` (returns
  `boolean`) and open a fresh tenant transaction inside. **Never `.catch(() => undefined)`** — that
  swallow is exactly what c17-02 exists to remove, and it once produced zero notification rows
  platform-wide across ~50 call sites.
- **A `db.transaction` mock must invoke its callback, and its tx object needs `execute()`** —
  `withTenant` calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside it.
  Five tests in one suite proved nothing for months this way. Check every mock you touch.
- **Money is integer minor units. AI credits are integer milli-credits.** Never floats.
- **Cross-tenant misses return 404, never 403.**
- **`prepare: false`** on the Neon driver makes `sql.placeholder` inert.
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — runs only under `pnpm test:e2e`. Never cite
  one as executed coverage.
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`** or it OOMs.
- **Do not rewrite a test to accommodate a change.** A test failing because behaviour changed is the
  signal, not an obstacle.
- Estimates in this program skew high in one direction: 487 → 2, "13 pages" → 0, "at least 20" → 56
  only after the right pattern. Classify, do not count.

---

## Definition of done

**Update a ticket only when the work is complete and tested.**

1. **Tick a `- [ ]` only when you can name the file and line that satisfies it**, and write that
   evidence into the box's own line. A box you cannot satisfy stays unticked with the blocker
   written in. **Never delete or reword a criterion to fit what you built.**
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — clean.
3. **Run the specs you added or changed, scoped by path.** You are authorised to run tests for this
   session; that overrides the standing "never run tests" rule in `CLAUDE.md`. Do **not** run the
   full suite — workers get killed. Report exact pass/fail counts, and never report a suite as
   passing that you did not run.
4. Only when a ticket file has **zero** `- [ ]` left: set its `**Status:**` to `done` and update its
   row in `c17-billing-writes-are-provable/README.md`. **Do not touch `architecture-refactor/README.md`.**
5. **Never delete a ticket file.** Retiring means marking it done and keeping the evidence.

## Git

You may `commit` verified work on `main`, one commit per ticket. **Never push, checkout, branch,
merge, pull, fetch, reset, stash, rebase, or create a worktree.** Subagents run no git; you commit.

The index is **shared with four sessions**. Always `git add` by explicit pathspec — never `-A` or
`.` — and prefer `git commit -- <paths>`, which takes only those paths regardless of what else is
staged. Re-check `git status --short` after staging. `git commit -- <path>` does **not** stage
untracked files; add them first. `backend/` is a separate git repo from the root.

## Report

Per ticket: Findings · Root cause · Solution · Files changed · Validation (typecheck, exact spec
counts) · anything left open with its precise blocker · the contents of `lane-requests/s1.md`.
State the write-or-delete decision for `revenue_events` explicitly.
