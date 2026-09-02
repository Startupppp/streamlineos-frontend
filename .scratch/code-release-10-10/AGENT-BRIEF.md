# Agent brief — code-release 10/10 orchestration

Read this fully before touching a file. It replaces the Windows-path kickoff prompt in `SESSIONS.md`.

## Paths on THIS machine

| Thing | Path |
|---|---|
| Repo root | `/Users/tarunchintakunta/Personal/streamline` |
| Backend repo (own git repo) | `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` |
| Frontend repo (own git repo) | `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend` |
| Frontend package (pnpm root) | `streamlineos-frontend/frontend` |
| Tickets | `streamlineos-frontend/.scratch/code-release-10-10/issues/` |
| Reports you write | `streamlineos-frontend/.scratch/code-release-10-10/reports/` |
| PRD | `streamlineos-frontend/architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` |

`SESSIONS.md` says the backend is at `backend/`. **It is not.** It is a sibling directory
`streamlineos-backend/`, and it is a **separate git repository**. A change spanning both
needs two commits.

Constitution files to obey: `streamlineos-frontend/CLAUDE.md` (shared),
`streamlineos-frontend/frontend/CLAUDE.md` (frontend side),
`streamlineos-backend/CLAUDE.md` (backend side). Load the ones for the side you touch.

## The nine rules that have already cost work here

1. **Stay inside your territory.** Your prompt names the paths you own. Do not edit a path
   another agent owns. If your fix requires one, write the finding into your report and say
   so in your final message — the orchestrator will route it.
2. **Commit by explicit pathspec — `git add` alone is NOT enough.**
   ```
   git commit -m "<message>" -- path/one path/two      # correct
   git add -- path/one && git commit -m "..."          # WRONG: see below
   ```
   All agents share one working tree AND ONE INDEX per repo. `git add -- <paths>` only
   controls what *you* add; a bare `git commit` then commits **the whole index**, including
   every file another agent staged seconds earlier. This actually happened at 19:0x: a
   commit staged with a careful 8-path `git add` swallowed 17 files from a second agent
   plus a stray README, and landed them under a message describing none of it. Nothing was
   lost, but authorship and history were wrong.
   Passing the pathspec to `git commit` itself commits those paths from the working tree and
   ignores the rest of the index entirely. Do that. And never `git add -A` / `git add .`.
   For a NEW file, `git commit -- <path>` alone fails ("did not match any files"): run
   `git add -- <your paths>` first and then still pass the pathspec to `git commit`, which
   keeps the commit limited to your paths regardless of what else is staged. Verify with
   `git show --stat HEAD` that the file count is yours before moving on.
3. **Never `git stash`, `reset`, `checkout`, `pull`, `rebase`, `push`, `branch` or `merge`.**
   `git add <explicit paths>` and `git commit` are the only git verbs you may use.
   A stash takes every agent's uncommitted work and the loss is silent.
4. **A red typecheck may not be yours.** The baseline was green when you started. Before
   debugging a failure, check whether the failing path is in your territory. If it is not,
   report it and move on.
5. **Report gates honestly.** *Not run* is not *passing*. Never write "passes" for something
   you did not execute and read. Lint and e2e are claimed only if you actually ran them.
6. **Scratch databases only.** `psql` against a database whose name starts with `scratch_`.
   Never touch `DATABASE_URL` (it is a shared remote Neon instance), never touch any
   `cornerstone_*` database, and never print a connection string.
   **A production-shaped seeded database already exists — use it before concluding "no
   database is provisioned".** `scratch_perf_seed`: local Postgres, head 649/649, 1,695 MB,
   88 non-empty tables, 8 organizations, four application tenants at 89.93 / 9.0 / 0.90 /
   0.18 percent, plus a working non-owner `streamline_app` role (`rolbypassrls=false`) with
   RLS live. Rebuild commands, org ids and row shape are in
   `reports/00-seeded-perf-database.md`. Make your own `scratch_<ticket>` copy if you intend
   to write to it. Do NOT use `scratch_boot_b/c/d` — they are cited bootstrap-parity evidence
   and destroying them destroys the evidence bundle.
   **Benchmark as `streamline_app` with the tenant GUC set, never as the owner** — the owner
   has BYPASSRLS, so its plans omit the RLS predicate that costs the most. Measure in
   **buffers, not milliseconds**; wall clock lies on a warm cache. `VACUUM ANALYZE` after any
   table rewrite. And measure across MULTIPLE tenants in the skew: the same query picks
   different indexes per tenant here — the 0.18% tenant used an org-leading index for 6
   buffers while the 89.9% tenant declined it and walked an org-less index for 1,237. On a
   single-tenant seed only one of those plans is reachable and the org-leading index reads
   as redundant.
7. **Verify against artifacts, not reports.** A delegated fix can land inert and a report can
   narrate a tick that was never written. Count what is on disk.
8. **Never delete code or schema from text search alone.** Dead-code claims need a module
   graph tool (`pnpm exec knip --no-progress`) plus a real build. A `pgTable(` scan that
   reports "everything is dead" is a broken scan, not a discovery.
9. **`.strict()` matters at the boundary.** A bare `z.object({})` strips a dropped field
   silently rather than rejecting it, which turns a removed field into a wrong-subject
   write instead of an error.

## Running heavy commands — MANDATORY

Fifteen CPUs and 24 GB are shared by every concurrent agent. A backend typecheck alone asks
for an 8 GB heap. **Every typecheck, build, jest run or bootstrap MUST go through the mutex**,
which holds at most 2 repo-wide and `nice`s the child:

```
HEAVY=/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/heavy.sh

# backend typecheck  (~3 min)
$HEAVY 2 -- pnpm -C /Users/tarunchintakunta/Personal/streamline/streamlineos-backend typecheck

# frontend typecheck (~2 min)
$HEAVY 2 -- pnpm -C /Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend type-check

# a FOCUSED jest run — always cap workers, never a bare `pnpm test`
$HEAVY 2 -- pnpm -C .../streamlineos-backend exec jest --runInBand --testPathPattern="<your pattern>"
```

Gate scripts (`pnpm check:*`) are cheap and need no mutex — run them freely.

**Never run a bare `pnpm test` / `pnpm jest` with default workers.** It forks one worker per
core and will hang the machine for every other agent. Always `--runInBand` or
`--maxWorkers=2`, always a `--testPathPattern`.

**`next build` — CORRECTED 2026-09-02. It DOES work, and the previously-recorded cause was
wrong.** It does not die at `/billing/ai-credits` (that route does not exist). It fails at
`frontend/lib/env.ts:40`, reached via `app/layout.tsx:6`: the repo `.env` carries a 36-character
`NEXTAUTH_SECRET` and the schema requires 44 in production. Supply a longer LOCAL PLACEHOLDER
(never a real secret, never a real connection string) and the build completes — measured:
**exit 0, 601 routes**. Prefer `type-check` + the `check:*` gates + focused jest for ordinary
work, but a production build IS available when you genuinely need one (bundle budgets, Web
Vitals, hydration).

## Traps specific to this repository

- **A crashed `tsc` greps as "0 errors."** Check the exit code, not just the output.
- **Specs do not typecheck.** ts-jest runs `isolatedModules`, so a green spec never enforces
  a signature — only `tsc` does. Backend spec compilation is its own gate:
  `pnpm check:spec-typecheck`.
- **A blank jest failure with an empty assertion message is a stale cache.** Run
  `jest --clearCache` before believing it.
- **A migration `.sql` not listed in `migrations/meta/_journal.json` never runs.**
  `db:migrate` skips it and still prints success.
- **CORRECTED 2026-09-02 — journal `idx` does NOT have to equal array position.** An earlier
  version of this brief said it did. Measured at head: 646 entries, last `idx` 777, **316**
  entries where `idx !== position`, all pre-existing, and every migration gate green. The
  rules the gate actually enforces are: `idx` **unique**, and `when` **strictly increasing**
  (0 inversions today). **Do not renumber the journal to position** — it is not required and
  it would rewrite 316 entries under other agents.
- **A new journal entry's `when` must be stamped above 2027-02-19**, or it lands below the
  applied watermark and is silently skipped forever while `db:migrate` prints success. The
  237 future-dated entries are deliberate and gated by `check:migration-discipline` rule 8.
- **`drizzle-kit generate` is unusable here** — migrations are hand-authored. Verify what you
  wrote against `pg_tables` / `pg_catalog`, not against the generator.
- **The live DB drifts ahead of the migrations.** A repo-wide e2e failure is usually
  declared-vs-live column drift, not your feature.
- **`@Idempotent` routes 400 without an `Idempotency-Key` header**, and the error reads like
  a body validation failure.

## Definition of done for your ticket

A box is ticked **only** when you ran the proof yourself and read its output.

1. Audit the current source first. **The PRD text and the ticket notes are stale — verify
   before treating any claim as true in either direction.** A box already ticked may have
   regressed; a box left open may already be satisfied.
2. Implement.
3. Prove. Name the exact command, the exit code and the number it produced.
4. Edit your ticket file in `issues/`: tick the boxes you proved, and under each box you
   could not close write one indented line starting `BLOCKED:` or `PARTIAL:` saying exactly
   what remains and why. Update the `**Status:**` line.
5. Write or update your report at `reports/<nn>-<slug>.md`.
6. Commit, in the right repo, staging **only your own paths** by explicit pathspec.
   Message: `<type>(<scope>): <what changed>` then a blank line, then
   `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## Your final message to the orchestrator

Keep it under 40 lines. Include, in this order:

- **Boxes**: `n closed / m still open` for your ticket.
- **Per open box**: one line — what blocks it, and whether it is blocked on another
  territory, on infrastructure, or on a product decision.
- **Commands run**: the literal command, exit code, and the number it produced.
- **Files changed**: paths only.
- **Commit**: the SHA and which repo.
- **Cross-territory findings**: anything you found that you were not allowed to fix.
- **Honest gaps**: anything you could not verify. Say "not run" where you did not run it.

Do not narrate your process. Do not claim a gate passed that you did not execute.
