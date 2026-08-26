# LANE 4 — A tenant extends the product without a deploy, and HR stops growing

**You are executing this lane.** Read this whole file, then start. Do not ask the user what to do
next — the user is not watching. Read `CLAUDE.md` and `backend/CLAUDE.md` before your first edit.

Repository root: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout.
**No worktree, no new branch.** Three other lanes are running in parallel right now.

---

## Your 8 tickets

This lane has fewer tickets than the others because it carries the most open criteria — c23-02 and
c23-03 have eleven each. Read each file in full before working it, plus `prd.md` and `README.md`
in its candidate folder.

| # | File | Shape |
|---|---|---|
| c16-09 | `architecture-refactor/c16-schema-says-what-it-means/issues/09-a-leave-policy-that-says-it-restricts-does.md` | 4 product decisions + a test matrix — start here |
| c23-04 | `architecture-refactor/c23-tenant-extensibility-without-migrations/issues/04-hr-stops-growing-and-payroll-is-one-folder.md` | consolidate the two payroll folders |
| c23-03 | `.../issues/03-custom-field-values-are-indexed.md` | move values to a JSON column with a containment index |
| c23-02 | `.../issues/02-one-modules-taxonomy-moves-to-lookup-tables.md` | tenant-editable status taxonomy on one module |
| c19-03 | `architecture-refactor/c19-cache-keys-cannot-be-unsafe/issues/03-filtered-views-refresh.md` | 1 box — a filtered read-after-write test in `hr/time` |
| c16-01 | `.../issues/01-one-table-owns-a-persons-identity.md` | fully blocked on 0486–0488 |
| c16-05 | `.../issues/05-every-audit-row-names-its-tenant.md` | fully blocked on 0479 |
| c16-06 | `.../issues/06-candidate-resume-text-leaves-the-row.md` | 4 boxes, all need a live database |

**Suggested order:** c19-03 → c16-09 → c23-04 → c23-03 → c23-02. Then confirm c16-01, c16-05 and
c16-06 are still blocked and leave them open with that recorded.

## Your biggest unlock: tests are authorised

`c19-03`'s remaining box is a filtered read-after-write test in `backend/src/modules/hr/time/`,
marked open because tests were excluded by project instruction. That exclusion is lifted for this
lane. Write it, run it, tick it.

## What is genuinely open here

**c16-09 is four product decisions before it is any code.** The probation-restriction flag saves,
the UI offers it, the seed sets it `true` — and `leaves-write.service.ts:80-103` already reads it
and throws a user-facing message, so **five of nine criteria were already met** and the ticket's
"nothing anywhere consults it" premise is false. What is genuinely undecided:

- Does a restricted type still **accrue** during probation and merely become unbookable, or not
  accrue at all? Current code accrues regardless. Decide this first — it changes what you build.
- What does **unknown or unset** probation status mean? It currently silently allows. Decide
  explicitly; do not let "unknown" quietly mean either thing.
- Is there an **override permission** for an administrator? Decide either way and state it.
- Is a request evaluated against the **dates requested** or the date of the request?

Write each decision into the ticket, then build the allow/deny matrix: within probation, past
probation, boundary date, flag off, status unknown.

**c23-04 is a folder move, not a refactor.** The two payroll schema folders are disjoint with zero
overlapping table names — confirm that yourself against `db/schema/hr/payroll-*.ts` versus
`db/schema/payroll/*.ts` before touching anything. No table is refactored away in this ticket.

**c23-02 must copy the Build status-and-transition shape exactly**, seed the lookup table from the
existing enum before switching any read, and prove no existing row changed value. `c23-01`'s
classification deliverable at `architecture-refactor/c23-tenant-extensibility-without-migrations/enum-classification.md`
names the 54 tenant-taxonomy enums that are the candidate set.

## Known gates — do not work around these

**c16-01, c16-05 and c16-06 are entirely migration- or database-blocked.** Every open box on all
three names an unapplied migration (0486–0488, 0479) or live data. Confirm the blocks are still
real, leave every box open, and do not build against them. Do not narrow a criterion to match what
can be done without a database.

---

## Territory

**You own, exclusively:**

```
backend/src/modules/hr/**
backend/src/modules/payroll/**
backend/src/modules/careers/**
backend/src/modules/settings/**       (custom-field definitions)
backend/src/modules/record-layouts/**
backend/src/db/schema/hr/**
backend/src/db/schema/payroll/**
backend/src/db/schema/  — custom-field and taxonomy files only
backend/migrations/0540_*.sql … 0549_*.sql   (your reserved numbers)
frontend/  — ONLY the HR/custom-field screens reached by these tickets
```

**Everything else is another lane's.** If a fix needs a file outside your territory: do not edit
it. Name the exact file, line and change in `architecture-refactor/lane-requests/lane-4.md` and in
your final report, and leave the affected box unticked with that reason written into it.

**One specific collision to avoid:** `backend/src/db/schema/shared.ts` is being split by domain in
the orchestrator lane (c23-05). Do not restructure it. c16-05's audit-column change is blocked
anyway, so this should not arise.

**Never edit these — single files four lanes would collide on:**
`backend/migrations/meta/_journal.json` · `backend/src/db/schema/index.ts` ·
`backend/src/app.module.ts` · `backend/src/modules/rbac/permissions/index.ts` ·
`frontend/lib/rbac/permissions/index.ts`.

**Also orchestrator-owned: `architecture-refactor/README.md`** — the program index. Update your candidate README only.

Write what you need into `architecture-refactor/lane-requests/lane-4.md` — the exact journal entry
JSON, the exact export line, the exact permission key. The orchestrator applies them.
**A migration absent from `_journal.json` never runs and `db:migrate` still reports success**, so a
missing request is a migration that silently does nothing.

---

## Re-verify every premise before building against it

This program's most repeated finding is that tickets describe defects the codebase has already
left. Seven were disproved in the 2026-08-26 audit recorded in `architecture-refactor/README.md`,
**including `c16-09` in your own set**, and one disproved ticket was "fixed" before anyone checked
and had to be reverted. **A ticket's premise is evidence, not instruction.**

Two HR-specific scanning traps, both of which have produced false conclusions here:

- **Emptiness is not deadness.** A table with zero rows is usually an unseeded feature. All 95
  empty `hr_*` tables are referenced by live services.
- **If a scan says "everything is dead", the scan is broken.** A symbol pattern that misses
  `pgTable(` maps nothing and reports every table unreferenced, and the table name often sits on
  the line *after* the `pgTable(` call, so single-line patterns find none.

`backend/src/db/schema/hrms-phase1-sql-managed.ts` is a **deliberate** holding barrel for tables
managed by raw SQL migrations, kept out of the runtime barrel on purpose and asserted by
`migration-integrity.spec.ts`. knip reports all 11 of its files as unused — that is the design.
**Do not delete them.**

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** when the GUC is absent — it does not
  return null. `this.db` outside a tenant transaction dies on any RLS table. Use
  `runInTenantTransaction` / `runInNewTenantTransaction(db, orgId, fn)` / `forEachOrg`.
- **A new tenant table with no RLS policy is readable org-wide** — grants arrive via
  `ALTER DEFAULT PRIVILEGES`. Policy goes in the same migration as the table. c23-02's row-level
  isolation criterion is exactly this.
- **Never JSONB arrays for lifecycle entities.** c23-03 moves custom-field *values* to JSON with a
  containment index, which is the sanctioned case; a status or a line item is not.
- **Validate on write at the boundary — the column type guarantees nothing.** Without it, moving
  values into JSON is a net loss of the type system. Test the absent and null cases; that is
  where containment queries go wrong.
- **Composite indexes lead with `org_id`; tenant-scoped uniqueness is composite.**
- **`CREATE INDEX CONCURRENTLY` cannot run inside a migration transaction.** House pattern is
  plain `CREATE INDEX IF NOT EXISTS` plus an operator note — precedent `0374_build_partial_indexes.sql`.
- **After a table rewrite, `VACUUM ANALYZE`.** A rewrite kills statistics and empties the
  visibility map — one case went 53 → 201,875 blocks until analysed.
- **A `db.transaction` mock must invoke its callback, and its tx object needs `execute()`** —
  `withTenant` calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside.
- **`import type` on an injected Nest service erases the DI token** — boot failure, or a silent
  `null` under `@Optional`. Never use it to break a DI cycle, and `forwardRef` is banned in new code.
- **The import graph stays acyclic, proven by `madge --circular`** — both repos are at zero. Run
  it before claiming done; c23-04's folder move is exactly the kind of change that breaks it.
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
   For c23-04, also run `pnpm -C backend exec madge --circular` and a real `nest build`; a folder
   move is the one change `tsc` alone does not prove.
3. **Run the specs you added or changed, scoped by path.** You are authorised to run tests for
   this lane; that overrides the standing "never run tests" rule in `CLAUDE.md`. Do not run the
   full suite — workers get killed. Report exact pass/fail counts. **Never report a suite as
   passing that you did not run.**
4. Only when the ticket file has **zero** `- [ ]` left: set its `**Status:**` line to `done` and
   update its row in the candidate `README.md` — `c23-…/README.md`, `c16-…/README.md` or
   `c19-…/README.md`. **Do NOT touch `architecture-refactor/README.md`.** Four lanes closing
   tickets at once would each Read-then-Edit that one file and silently lose each other's counts;
   the orchestrator reconciles it from the ticket files at the end.
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
(typecheck result, exact spec counts, madge result for c23-04) · and for anything left open, the
precise blocker. Plus the contents of `lane-requests/lane-4.md` if you wrote any.
