# LANE 2 — Authorization cannot be omitted, and a failure is visible

**You are executing this lane.** Read this whole file, then start. Do not ask the user what to do
next — the user is not watching. Read `CLAUDE.md` and `backend/CLAUDE.md` before your first edit.

Repository root: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout.
**No worktree, no new branch.** Three other lanes are running in parallel right now.

---

## Your 10 tickets

Read each file in full before working it, plus `prd.md` and `README.md` in its candidate folder.

| # | File | Shape |
|---|---|---|
| c15-04 | `architecture-refactor/c15-outbound-io-leaves-the-request/issues/04-post-commit-work-carries-tenant-context.md` | 1 box left, blocked on a booted app |
| c15-06 | `.../issues/06-one-ssrf-guard-not-two.md` | enumerate the local guard's cases, diff against the shared one |
| c15-03 | `.../issues/03-a-blob-upload-does-not-hold-a-connection.md` | move the upload off the request transaction |
| c20-01 | `architecture-refactor/c20-failures-are-visible/issues/01-errors-reach-a-person.md` | needs re-verification — README says this shipped |
| c20-02 | `.../issues/02-the-browser-reports-its-own-errors.md` | frontend error boundaries + scrubbing |
| c20-05 | `.../issues/05-four-alerts-reach-someone.md` | 2 boxes, p95 on the health surface |
| c25-01 | `architecture-refactor/c25-authorization-cannot-be-omitted/issues/01-every-route-declares-exposure.md` | classify 93 JWT-only controllers |
| c25-02 | `.../issues/02-object-access-and-scope-share-one-query-seam.md` | apply the seam; 2 of its sites are outside your territory |
| c25-03 | `.../issues/03-authorization-matrix-fails-closed.md` | CI cross-check of permission keys |
| c25-04 | `.../issues/04-rls-coverage-is-a-release-invariant.md` | 2 boxes, both need a live ephemeral DB |

**Suggested order:** c15-06 → c15-03 → c20-01 → c20-02 → c20-05 → c25-03 → c25-01 → c25-02.
c15-04 and c25-04 last; expect to leave one box each open.

## What is genuinely open here

**c20-01 is marked ✅ done in the program README but its file shows twelve open boxes** — the file
was restored from pre-completion content and lost its ticks. The reporter port had no adapter and
two call sites (`workflow-runner`, `import-pump`) report without also logging, so those failures
reached nobody. Verify what landed before rebuilding any of it.

**c25-01's guard is built and wired but enforcement is deliberately off.** 93 controllers sit on a
class-level `JwtAuthGuard` and some handlers are universal by design, so deny-by-absence would 403
platform core. The ticket's order is right: boot report first, classify with evidence, flip after.
Boot with `REQUIRE_ROUTE_CLASSIFICATION=true` to get the report.

**c25-03's genuinely-open part is a CI script** that cross-checks every `@RequirePermission` key
against both catalogs. Note before you start: the frontend `PERMISSIONS` array being a subset of
the backend catalog is **intentional and already tested** — the 206-key difference is not drift and
must not be raised as a defect.

## Known gates — do not work around these

- **c25-04's fixture-migration criterion needs a live ephemeral database wired into CI.** No
  database has been touched this entire program. Leave it open with that dependency named.
- **c15-04's last box says "verify by running the app and watching a real delivery."** There is no
  live environment. Leave it open.
- **c25-02 names two application sites outside your territory** — `modules/kb/**` and
  `modules/module-access/**`. `kb` belongs to the orchestrator lane. Do the seam itself and the
  in-territory sites; write the exact kb change into `lane-requests/lane-2.md` and leave that box
  unticked.

---

## Territory

**You own, exclusively:**

```
backend/src/common/auth/**
backend/src/common/tenant/**
backend/src/common/security/**
backend/src/common/observability/**
backend/src/common/interceptors/**
backend/src/modules/storage/**
backend/src/modules/module-access/**
backend/src/scripts/**
backend/.github/workflows/**  and  .github/workflows/**
backend/migrations/0530_*.sql … 0534_*.sql   (your reserved numbers)
frontend/  — ONLY the error boundaries and the client error-report path, for c20-02
```

`backend/src/common/**` is shared: **Lane 3 owns `common/cache/**` and `common/pagination/**`.**
Do not touch those two subdirectories. This is the one pair of lanes worth watching.

**Everything else is another lane's.** If a fix needs a file outside your territory: do not edit
it. Name the exact file, line and change in `architecture-refactor/lane-requests/lane-2.md` and in
your final report, and leave the affected box unticked with that reason written into it.

**Never edit these — single files four lanes would collide on:**
`backend/migrations/meta/_journal.json` · `backend/src/db/schema/index.ts` ·
`backend/src/app.module.ts` · `backend/src/modules/rbac/permissions/index.ts` ·
`frontend/lib/rbac/permissions/index.ts`.

Write what you need into `architecture-refactor/lane-requests/lane-2.md` — the exact journal entry
JSON, the exact export line, the exact provider or guard registration. The orchestrator applies
them. **A migration absent from `_journal.json` never runs and `db:migrate` still reports success**,
and an `APP_GUARD` you cannot register is a guard that never executes.

---

## Re-verify every premise before building against it

This program's most repeated finding is that tickets describe defects the codebase has already
left. Seven were disproved in the 2026-08-26 audit recorded in `architecture-refactor/README.md` —
including two in your set: `c20-05`'s `setSpanExporter(new LogSpanExporter())` was claimed unwired
and is present at `main.ts:69`, and `c15-06`'s local `blockedIpReason` helper was already gone.
**A ticket's premise is evidence, not instruction.**

Estimates in these tickets skew high in a consistent direction — 487 → 2, "13 pages" → 0,
"at least 20" → 29. Classify, do not count.

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** when the GUC is absent — it does not
  return null. `this.db` outside a tenant transaction dies on any RLS table. Use
  `runInTenantTransaction` / `runInNewTenantTransaction(db, orgId, fn)` / `forEachOrg`.
- **After-commit hooks, cron handlers and `void something(...)` have no ambient tenant.** Use
  `registerAfterCommit` (returns `boolean`) and open a fresh tenant transaction inside it.
  Never `.catch(() => undefined)`. This is the whole subject of c15-04.
- **`PermissionGuard` is NOT a global `APP_GUARD`.** The globals are `RouteClassifierGuard`,
  `JwtAuthGuard`, `MfaGuard`, `ModuleGuard`. Assuming otherwise produces a fix that lands inert.
- **A cross-tenant miss returns 404, never 403.** A 403 confirms the row exists.
- **Reuse `common/security/ssrf-guard.ts`. Never write a second guard.** A previous duplicate
  missed the packed `::ffff:7f00:1` form the existing one already handled — `ls` the shared
  directory before writing any helper.
- **Never propose `ALTER FUNCTION … LEAKPROOF`** — impossible on Neon, there is no true superuser.
- **A `db.transaction` mock must invoke its callback, and its tx object needs `execute()`** —
  `withTenant` calls it to set the GUC. A bare `jest.fn()` silently voids every assertion inside.
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — it runs only under `pnpm test:e2e`, so
  those RBAC route tables are **not** executed coverage. Do not cite them as passing.
- **The frontend `tsconfig` excludes tests** — a clean `tsc --noEmit` in `frontend/` does not
  prove its tests compile.
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
   For c20-02, also `pnpm -C frontend exec tsc --noEmit`.
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
Plus the contents of `lane-requests/lane-2.md` if you wrote any.
