# LANE 3 — One contract for every list

**You are executing this lane.** Read this whole file, then start. Do not ask the user what to do
next — the user is not watching. Read `CLAUDE.md` and `backend/CLAUDE.md` before your first edit.

Repository root: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout.
**No worktree, no new branch.** Three other lanes are running in parallel right now.

---

## Your 10 tickets

Read each file in full before working it, plus `prd.md` and `README.md` in its candidate folder.

| # | File | Shape |
|---|---|---|
| c13-01 | `architecture-refactor/c13-one-list-contract/issues/01-a-ticket-opens-by-its-key.md` | 1 real box + 1 booted-app box |
| c13-02 | `.../issues/02-the-board-does-not-ship-descriptions.md` | a field-presence regression assertion |
| c13-03 | `.../issues/03-a-list-total-costs-no-extra-round-trip.md` | convert the remaining offset-only list modules |
| c13-04 | `.../issues/04-the-receivables-total-is-computed-once.md` | read budget; 2 boxes need real data |
| c13-05 | `.../issues/05-scrolled-lists-page-by-cursor.md` | 9 boxes — the largest item in this lane |
| c13-06 | `.../issues/06-every-list-speaks-one-filter-vocabulary.md` | delete the 16 duplicated pagination schemas |
| c12-02 | `architecture-refactor/c12-text-search-id-probe/issues/02-global-search-uses-the-probes.md` | 2 boxes, both were "not run per instructions" |
| c16-04 | `architecture-refactor/c16-schema-says-what-it-means/issues/04-invoice-line-items-are-queryable.md` | fully blocked on 0477/0478 |
| c19-01 | `architecture-refactor/c19-cache-keys-cannot-be-unsafe/issues/01-the-books-are-correct-when-an-entry-posts.md` | 1 box — a read-after-write test |
| c19-04 | `.../issues/04-every-namespace-declares-its-invalidation.md` | 1 box — read-after-write test per namespace |

**Suggested order:** c12-02 → c19-01 → c19-04 → c13-02 → c13-06 → c13-03 → c13-05 → c13-01 → c13-04.
c16-04 last; expect to leave it entirely open.

## Your biggest unlock: tests are authorised

Several boxes in this lane are marked **"not run per instructions — BLOCKED: requires the test
suite (explicitly excluded by project instructions)"**. That exclusion is lifted for this lane.
`c12-02`'s equivalence test and all three `c19` read-after-write tests become runnable work
immediately. Run them and tick on the result.

Boxes that say **"requires a booted app against real data"** remain genuinely blocked — no
database has been touched this entire program.

## What is genuinely open here

**c13-05 is the substance.** The chat cursor is verified fixed and the multi-account inbox now
advances only over rows it returned; what remains is the equivalence test, the boundary matrix
(tied timestamps, a full `limit + 1` page, concurrent inserts, alternating providers) and the
proof that the same test fails against the offset implementation.

**c13-05 also contains a live design decision you should resolve, not route around:**
`backend/src/modules/chat/dto/chat.schemas.ts:98` uses `z.coerce.number().int().positive()`, so a
stale or malformed cursor returns **400** where the criterion requires the first page. Decide it,
implement it, and write the reasoning into the ticket.

**c13-04's premise was disproved** — `accounting-receivables.service.ts:84` already uses
`count(*) OVER ()` on a single query. Its remaining real box is the read budget.

**c16-04 is fully migration-blocked.** Every one of its eight boxes names 0477 or 0478. Confirm
they are still unapplied, leave it open, and do not build against it.

---

## Territory

**You own, exclusively:**

```
backend/src/common/pagination/**
backend/src/common/cache/**
backend/src/modules/build/**
backend/src/modules/accounting/**
backend/src/modules/invoices/**
backend/src/modules/quotes/**
backend/src/modules/crm/**
backend/src/modules/chat/**
backend/src/modules/mail/**
backend/src/modules/search/**
backend/migrations/0535_*.sql … 0539_*.sql   (your reserved numbers)
frontend/  — ONLY list/table/pagination components reached by these tickets
```

`backend/src/common/**` is shared: **Lane 2 owns `common/{auth,tenant,security,observability,interceptors}`.**
Do not touch those. This is the one pair of lanes worth watching.

**c13-03 and c13-06 will want to reach into modules outside this list** — that is expected, and it
is exactly where this lane must stop. Do not edit them. Record each remaining offset-only module
and each remaining local pagination schema copy by path in the ticket itself, tick nothing for
them, and list them in `architecture-refactor/lane-requests/lane-3.md`.

**Never edit these — single files four lanes would collide on:**
`backend/migrations/meta/_journal.json` · `backend/src/db/schema/index.ts` ·
`backend/src/app.module.ts` · `backend/src/modules/rbac/permissions/index.ts` ·
`frontend/lib/rbac/permissions/index.ts`.

Write what you need into `architecture-refactor/lane-requests/lane-3.md` — the exact journal entry
JSON, the exact export line. The orchestrator applies them. **A migration absent from
`_journal.json` never runs and `db:migrate` still reports success.**

---

## Re-verify every premise before building against it

This program's most repeated finding is that tickets describe defects the codebase has already
left. Seven were disproved in the 2026-08-26 audit recorded in `architecture-refactor/README.md`,
**including `c13-04` in your own set** — and one disproved ticket was "fixed" before anyone checked
and had to be reverted. **A ticket's premise is evidence, not instruction.**

Estimates in these tickets skew high in a consistent direction — 487 → 2, "13 pages" → 0,
"at least 20" → 29. "The 16 duplicated pagination schemas" in c13-06 is a count of exactly this
kind: verify it before acting on it.

Do not re-raise, they are recorded decisions: the frontend permission-key subset, wrapping every
text-match call site, migrating all naive timestamps, table splitting by width.

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** when the GUC is absent — it does not
  return null. `this.db` outside a tenant transaction dies on any RLS table.
- **RLS forces `org_id` into covering indexes.** There is no Index Only Scan unless `org_id` is
  *in* the index; a covering index without it is silently ignored.
- **`OR` with a semi-join defeats indexes.** `assignee = me OR EXISTS(...)` scans the whole org —
  split it into a `UNION` plus `count(*) OVER ()`. The winner flips at around one project, so
  measure rather than assume.
- **An org-led composite is not always enough.** An inequality plus `ORDER BY` on another column
  needs `(tenant, eq cols, sort col) WHERE <ineq>` — that change went 11,477 → 53 blocks.
- **RLS defeats GIN/trigram indexes** — policy quals are not leakproof, so text search
  sequential-scans as the app role. The escape is a `SECURITY DEFINER` probe function; five exist.
  **Never propose `ALTER FUNCTION … LEAKPROOF`** — impossible on Neon.
- **`prepare: false` on the Neon driver** makes `sql.placeholder` inert. Optimise via indexes,
  projection and N+1 removal instead.
- **`CACHE_KEYS.*` factories already interpolate `orgId`.** Do **not** migrate call sites onto
  `*ForOrg` wrappers — that was tried at ~50 sites and fully reverted. c19-02 and c19-04's
  migration criterion were withdrawn for this reason.
- **A `db.transaction` mock must invoke its callback, and its tx object needs `execute()`** —
  `withTenant` calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside.
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — runs only under `pnpm test:e2e`.
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
Plus the contents of `lane-requests/lane-3.md` if you wrote any.
