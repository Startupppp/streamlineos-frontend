# S4 — One contract for every list

**You are executing this session.** Read this whole file, then start. The user is not watching and
cannot answer questions — proceed on reversible decisions and record them. Read `CLAUDE.md`,
`backend/CLAUDE.md` and `frontend/CLAUDE.md` before your first edit.

Repo: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout. **No worktree, no new
branch.** Four other sessions are running in parallel.

---

## Your 6 tickets — 14 open boxes

| # | File | Boxes | Shape |
|---|---|---|---|
| c13-03 | `architecture-refactor/c13-one-list-contract/issues/03-a-list-total-costs-no-extra-round-trip.md` | 2 | convert the remaining offset-only list modules |
| c13-05 | `.../issues/05-scrolled-lists-page-by-cursor.md` | 2 | the keyset work is largely done; finish it |
| c13-06 | `.../issues/06-every-list-speaks-one-filter-vocabulary.md` | 3 | delete the duplicated local pagination schemas |
| c13-01 | `.../issues/01-a-ticket-opens-by-its-key.md` | 2 | 1 needs a booted app |
| c13-04 | `.../issues/04-the-receivables-total-is-computed-once.md` | 4 | 3 need real data; the real one is a read budget |
| c12-02 | `architecture-refactor/c12-text-search-id-probe/issues/02-global-search-uses-the-probes.md` | 1 | needs a booted app |

**Order:** c13-06 → c13-03 → c13-05 → c13-01 → c13-04 → c12-02.

## Your biggest unlock: tests are authorised

Several boxes across c13 and c12 read **"not run per instructions — BLOCKED: requires the test suite
(explicitly excluded by project instructions)"**. That standing rule is lifted for this session, so
those boxes become ordinary work. Run them and tick on the result.

Boxes that say **"requires a booted app against real data"** stay genuinely blocked — nothing in
this program has been applied to a database. Leave those, and say so.

## What is genuinely open

**c13-06 is the most mechanical and the highest value:** the shared pagination vocabulary exists;
the criterion is that the duplicated local copies are deleted as their last caller migrates.
**Verify the count before acting on it** — a stated figure in this program has been wrong by an
order of magnitude repeatedly (487 → 2, "13 pages" → 0, "at least 20" → 56). Also confirm sorting
composes with the tenant-led indexes rather than falling off them.

**c13-05 has a live design decision — resolve it, do not route around it.**
`backend/src/modules/chat/dto/chat.schemas.ts:98` uses `z.coerce.number().int().positive()`, so a
**stale or malformed cursor returns 400** where the criterion requires the first page. Decide it,
implement it, and write the reasoning into the ticket.

**c13-04's premise was disproved** in the 2026-08-26 audit: `accounting-receivables.service.ts:84`
already uses `count(*) OVER ()` on a single query. Its one genuinely open item is the read budget.

---

## Territory

**You own, exclusively:**

```
backend/src/common/pagination/**
backend/src/modules/build/**
backend/src/modules/accounting/**
backend/src/modules/invoices/**
backend/src/modules/quotes/**
backend/src/modules/crm/**
backend/src/modules/chat/**
backend/src/modules/mail/**
backend/src/modules/search/**
backend/src/scripts/run-read-cost-budgets.mjs, check-build-read-cost.mjs
backend/migrations/0575_*.sql … 0579_*.sql
frontend/  — only list/table/pagination components these tickets reach
```

`backend/src/common/**` is shared: **S3 owns `common/auth`, `common/rbac`.** Do not touch those.

**c13-03 and c13-06 will want to reach modules outside this list** — that is expected, and it is
where this session stops. Record each remaining offset-only module and each remaining local schema
copy **by path** in the ticket, tick nothing for them, and list them in `lane-requests/s4.md`.

**Never edit:** `migrations/meta/_journal.json` · `db/schema/index.ts` · `app.module.ts` ·
either `permissions/index.ts` · `architecture-refactor/README.md`. Request via `lane-requests/s4.md`.
**A migration absent from `_journal.json` never runs and `db:migrate` reports success anyway.**

---

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** with no tenant GUC — it does not return
  null. `this.db` outside a tenant transaction dies on any RLS table.
- **RLS forces `org_id` into covering indexes.** There is no Index Only Scan unless `org_id` is *in*
  the index — the planner refuses it outright, which reads as "the index didn't help".
- **An `OR` between an indexed predicate and a semi-join defeats both.**
  `assignee = me OR EXISTS(...)` scans the whole organisation; split into a `UNION` of
  independently-indexed branches carrying `count(*) OVER ()`. **The winner flips once the outer set
  is narrowed to one project — measure both.**
- **An org-led composite is not always enough:** an inequality plus `ORDER BY` on another column
  needs `(tenant, eq cols, sort col) WHERE <ineq>` — one case went 11,477 → 53 blocks.
- **RLS defeats GIN/trigram indexes**; the escape is a `SECURITY DEFINER` probe owned by the
  BYPASSRLS owner. **Never propose `ALTER FUNCTION … LEAKPROOF`** — impossible on Neon.
- **Measure in buffers as `streamline_app` with the tenant GUC, never as the owner** — the owner has
  BYPASSRLS and its plans hide every problem.
- **`prepare: false`** makes `sql.placeholder` inert. Optimise via indexes, projection and N+1.
- **`CACHE_KEYS.*` factories already interpolate `orgId`.** Do **not** migrate call sites onto
  `*ForOrg` wrappers — tried at ~50 sites and fully reverted; c19-02's criterion was withdrawn.
- **An `undefined` cursor value vanishes in JSON**, so "exhausted" and "not started" collapsed into
  one value and an inbox replayed a whole mailbox every page. Encode the distinction explicitly.
- **A `db.transaction` mock must invoke its callback, and its tx needs `execute()`.**
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — runs only under `pnpm test:e2e`.
- **All list endpoints are capped at 100/page**, public included.
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`.**
- **Do not rewrite a test to accommodate a change.**

---

## Definition of done

**Update a ticket only when the work is complete and tested.**

1. **Tick a `- [ ]` only when you can name the file and line that satisfies it**, written into the
   box's own line. Unsatisfied boxes stay unticked with the blocker written in. **Never delete or
   reword a criterion.**
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — clean. For frontend
   changes also `pnpm -C frontend exec tsc --noEmit` (note: the frontend tsconfig **excludes tests**,
   so a clean run does not prove its tests compile).
3. **Run the specs you added or changed, scoped by path.** Authorised for this session, overriding
   the standing "never run tests" rule — this is what unblocks the "not run per instructions" boxes.
   Not the full suite. Report exact pass/fail counts; never report a suite as passing that you did
   not run.
4. Only at **zero** `- [ ]`: set `**Status:**` to `done` and update the row in the candidate
   `README.md`. **Do not touch `architecture-refactor/README.md`.**
5. **Never delete a ticket file.**

## Git

You may `commit` verified work on `main`, one commit per ticket. **Never push, checkout, branch,
merge, pull, fetch, reset, stash, rebase, or create a worktree.** Subagents run no git.

The index is **shared with four sessions**. `git add` by explicit pathspec — never `-A` or `.` — and
prefer `git commit -- <paths>`, which takes only those paths regardless of what else is staged.
Re-check `git status --short` after staging. `backend/` is a separate git repo from the root.

## Report

Per ticket: Findings · Root cause · Solution · Files changed · Validation (typecheck, exact spec
counts) · anything left open with its blocker · the contents of `lane-requests/s4.md`. State the
stale-cursor decision for chat explicitly, and the verified count of duplicated pagination schemas.
