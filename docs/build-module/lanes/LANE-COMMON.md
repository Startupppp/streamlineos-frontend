# Build Module — Common Lane Rules

Read this **before** your `LANE-N-*.md` brief. Everything here is binding.

Session baseline commit (root repo): `6ea4f0c6d`. Backend repo is separate; do not assume its SHA.

## 0. Git — banned by name

> You must NEVER run any git command that changes repository or working-tree state. BANNED by
> name: `git stash`, `git checkout`, `git restore`, `git reset`, `git clean`, `git commit`,
> `git revert`, `git merge`, `git rebase`, `git pull`, `git push`, `git worktree`,
> `git branch`, `git add`. Do not check whether a test passes on `main`. Read-only inspection
> (`git status`, `git diff`, `git log`) is fine. If you believe a failure is pre-existing, say so
> in your report and move on.

Seven other lanes have uncommitted work in this same checkout. One `git restore` destroys all of
it. The orchestrator owns every commit.

## 1. Repository layout

- Root repo: `D:/projects/personal/Streamlineos` — contains `frontend/`, `docs/`, `scripts/`.
- `backend/` is a **separate git repository**, listed in the root `.gitignore`. Ripgrep from the
  root returns **0 hits for backend code** — zero hits is not absence. Always pass an explicit
  path: `rg <pattern> backend/src`.
- `frontend/` and `backend/` each have their own `package.json`, lockfile and `node_modules`.
  There is no workspace root. The `check:*` gates live in `frontend/package.json`.

## 1b. The house rule files are binding — read them before your first edit

These are not background reading. They are the repo's own rules and they outrank anything in this
document except the git ban.

| File | Read before touching |
|---|---|
| `frontend/CLAUDE.md` | any frontend file (257 lines: routing, data layer, page state, structure, forms, URL state, design system, performance, testing, non-negotiables, definition of done, anti-patterns) |
| `frontend/UI-KIT.md` | any component work — this is the **import index** you check *first* |
| `backend/CLAUDE.md` | any backend file (259 lines: modules & layering, validation & contracts, routes & guards, schema, migrations, tenancy & RLS, side effects, security, RBAC, caching, performance, testing) |

Do not skim them. Each ends with a **Non-negotiables** list that blocks a PR and a
**Definition of Done** you are expected to satisfy per task.

## 1c. Create nothing you can extend — and put it where it belongs

The default is **use the existing file**. A new file is the exception and needs a reason you can
state in one line. The repo's own rules on this, quoted:

- **FE-58** — *"Check the inventory before writing anything: `UI-KIT.md` → the feature barrel →
  `components/shared` → `components/ui`."* Walk all four, in that order, before you write a
  component. Record in your status file that you walked it.
- **FE-59** — *"Extend the existing primitive. A component duplicating one is a defect — there is
  exactly one `DataTable`, one `TablePagination`, one `LoadingButton`, one `AiActionsMenu`, one
  editor per class of surface."*
- **FE-60** — promote to `components/shared` (or `components/ui` for a primitive) **on the second
  consumer**, and update every importer. Not on the first, not speculatively. Promotion touches
  shared territory, so it is a **request**, not an edit.
- **FE-126 / BE-143** — *"Delete pass-through wrappers; never write one."* If a function's whole
  body forwards the same arguments to one other exported function, it has no reason to exist —
  delete it and point callers at the callee. If it is a file's only export, the file goes too. The
  one exemption: a function wrapping a **module-private** `Set`/`Map`/regex/array is encapsulation
  and stays.
- **BE-24 / anti-pattern table** — a private constant duplicating an exported one is a defect.
  Import the export.

**Placement.** If a file is already in the wrong place, move it to the right one rather than
working around it — and update every importer in the same change.

- **FE-64** — feature code lives in `features/<feature>/{components,lib,hooks}/`. `app/` holds
  route files **only**; `_components/` and `_lib/` inside `app/` are **banned**.
- **FE-56** — pages compose, they don't implement. A route `page.tsx` fetches and composes; UI
  lives in the feature. (gate: `check:route-thinness`)
- **FE-65** — import a feature through its barrel `index.ts`, max ~3–4 folders deep.
- **FE-66** — kebab-case filenames with a PascalCase symbol inside; hooks `use-*.ts` → `useX`;
  server fetch helpers `get-*`; Zod schemas `*-schema.ts`.
- **FE-57** — keep files under 500 lines; 300+ is ratcheted and **both counts may only shrink**.
  If your change would push a file over, that is the signal to split it properly — not to append.
- **FE-62** — adding or extending a shared component requires a `UI-KIT.md` row **in the same
  change**. `UI-KIT.md` is shared: that row is a request.
- A move is not a delete-and-recreate. Preserve the file's content and history; do not drop tests,
  and do not delete a ticket or spec file for any reason.

## 1d. The import graph must stay acyclic

- **FE-61** — *never* import feature → feature. If Lane N's feature needs Lane M's code, that is
  the shared layer or a request — never a direct cross-feature import. This is also how two lanes
  create a cycle without either one seeing it.
- **FE-72 / BE-10** — keep the import graph acyclic; never hide a cycle behind `forwardRef`.
- Gates: `check:cycles`, `check:feature-cycles`, `check:import-direction`. The current baseline is
  clean — `check:feature-cycles` passes across 46 features and 5,700 resolved imports, so **any**
  cycle the orchestrator finds at drain is yours or another lane's, introduced today.
- You may not run the gates (§5). So prevent cycles structurally instead: before adding an import,
  ask whether the target already imports your module, directly or through its barrel. A barrel
  `index.ts` re-export is the usual hiding place — check the barrel, not just the leaf.
- Extracting shared code **upward** into a layer both sides already depend on is the fix. Adding a
  back-import is never the fix.

## 2. Exclusive territory

Your brief lists the files and directories you own. **Edit nothing outside them.**

If you need a change in a file you do not own, do not edit it. Append the exact
`path:line` + intended change to `docs/build-module/lanes/requests/LANE-N.md` (create it) and
continue with what you can do without it. The orchestrator applies requests.

**Request-only shared files — never edit these, any lane:**

| File | Why |
|---|---|
| `backend/src/common/constants/permissions.constants.ts` (and any permission barrel) | every lane needs it; last writer wins |
| `backend/src/modules/build/build.module.ts`, `backend/src/app.module.ts` | wiring collisions |
| `backend/migrations/meta/_journal.json`, `meta/_chain.sha256.json` | orchestrator-only, always |
| `frontend/lib/build/nav/build-project-catalog.ts`, `frontend/lib/build/build-route-manifest.ts` | route census source of truth |
| `frontend/components/layout/sidebar-nav-items.ts`, `frontend/features/build/sidebar/**`, `frontend/features/build/navigation/**` | shared nav |
| `frontend/features/build/shared/**` | shared list/filter/URL-state primitives |
| `frontend/hooks/api/build/index.ts` | barrel |
| `frontend/next.config.ts` | redirect shadowing |
| `docs/build-module/00-*.md` … `06-*.md`, `99-*.md`, `RELEASE-STATUS.md`, `MIGRATION-RUNBOOK.md` | orchestrator-owned |

A new frontend route file is **unreachable until it is registered** in the nav catalog and route
manifest — and every static gate still passes. If your work needs a new route, it is a request,
not an edit.

## 3. Ticking a box

Your deliverable is your set of `docs/build-module/10-*.md` acceptance checkboxes, plus a lane
status file.

Rules, in order of importance:

1. **Never reword a criterion to fit what you built.** The text stays byte-identical; only
   `- [ ]` becomes `- [x]`.
2. **Tick only with evidence you produced in this session**, recorded as `path:line` (source) and
   a command + result (tests). Put the evidence in your lane status file under the criterion's
   exact text. A tick with no written evidence line is a defect, not progress.
3. If a criterion cannot be met, leave it `- [ ]` and record it in your status file as
   `BLOCKED — <measured reason>`. Do not invent an environmental blocker; measure it and quote
   the command output. Do not narrow the criterion.
4. Update the box the moment the criterion is met — not in a batch at the end. If you are killed
   mid-flight, the ticked boxes must already be true.
5. Do not delete or rewrite any spec file. Do not delete another lane's file.

Lane status file: `docs/build-module/lanes/status/LANE-N-STATUS.md`. **That exact path, yours
alone.** Do not create `PHASE-N-STATUS.md` or any bare shared filename — those collide.

## 4. Criterion 7 — production browser evidence

Every page spec ends with:

> Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict
> behavior without modifying real data.

**Read this before attempting it.** The disposable authenticated capture stack is gone:
`D:\agent-work\disposable.env`, `D:\pgtools`, `D:\localstack` are deleted and nothing listens on
5432. `backend/.env` and `backend/.env.production` both point at **Aurora production**. There is
no non-prod backend. The e2e suite reports this as a **skip, not a failure** — a green
`pnpm test:e2e` proves nothing about authenticated pages.

Therefore:

- Do **not** stand up a capture stack. Do not seed, mint sessions, or point anything at production.
- Do **not** tick criterion 7 from a skipped e2e run or from a jsdom test.
- What does work with no backend: the dev-only public gallery under
  `frontend/app/(public)/design-system/**` driven by Playwright (`e2e/build-list-responsive.spec.ts`
  is the working example, `next dev` on its own port, `NEXT_DIST_DIR=.next-e2e`). Use it for
  real-browser layout facts jsdom cannot see: horizontal overflow, computed control height, focus
  order, fixed-nav clearance. If you add a gallery case, it lives in **your** feature directory and
  the gallery registry is a **request**.
- Otherwise record criterion 7 as `BLOCKED — no authenticated non-prod browser target; capture
  stack absent (nothing on :5432, backend/.env points at production)`.

Criterion 6 (keyboard, screen-reader, reduced-motion, 375 px, high-density) is partly reachable:
jsdom cannot see mobile overflow, real focus behaviour, or vaul drawer focus. Split it honestly —
what you proved in jsdom, and what remains browser-only.

## 5. Tests you may run, and how

**Authorised:** focused Jest runs scoped to your own paths.

Eight lanes sharing one `node_modules` poison each other's Jest transform cache — it surfaces as a
bogus "cannot find module". Always pass your own cache directory:

```bash
mkdir -p /d/agent-work/jest-lane-N
cd D:/projects/personal/Streamlineos/frontend && npx jest <your-path-pattern> --cacheDirectory=D:/agent-work/jest-lane-N
cd D:/projects/personal/Streamlineos/backend  && npx jest <your-path-pattern> --cacheDirectory=D:/agent-work/jest-lane-N-be
```

**Forbidden — orchestrator-only, do not run:**

- `pnpm build`, `pnpm type-check`, `pnpm type-check:specs` (full-tree; with 8 lanes editing, a
  failure tells you nothing about your lane — and two concurrent builds have exhausted Windows
  commit charge and killed Postgres)
- any `pnpm check:*` gate (several plant fixtures on disk and corrupt each other when run in
  parallel)
- `pnpm test` / `npx jest` with no path pattern (1,367 suites)
- `pnpm test:e2e`

Verify your own lane with targeted greps and focused suites. Report what you ran verbatim; do not
report a gate you did not run, and do not report "green" for a suite you did not see pass.

Windows notes: this shell is Git Bash. An argument that starts with `/` gets path-mangled — prefix
the command with `MSYS_NO_PATHCONV=1`. `execSync` with a quoted glob returns nothing on Windows.
Typecheck needs an 8 GB heap (`NODE_OPTIONS=--max-old-space-size=8192`) — but see "Forbidden".

## 6. Migrations

You may write migration SQL. You may **not** journal it and may **not** apply it.

- Your brief gives you a **reserved migration number range**. Use only numbers inside it.
- Write `backend/migrations/<NNNN>_<name>.sql` and a matching `<NNNN>_<name>-rollback.sql`.
  A migration with no rollback file leaves a snapshot as the only reversal.
- Never touch `meta/_journal.json` or `meta/_chain.sha256.json`.
- Never run a migration runner, `drizzle-kit`, or any `psql`/`node` script that writes to a
  database. **Every configured connection string in this repo points at production**, including
  the ones that look local: `DATABASE_URL`, `.env.production`, and the migration gate aliases all
  resolve to production, and production is the **default**.
- Read-only inspection of production is also orchestrator-only. Do not open a connection.
- Record the migration in your status file under `MIGRATION HANDOFF` with: purpose, exact file
  names, the tables/columns touched, whether any **live call site** reads what it changes, and the
  rollback story. A journalled-but-unapplied migration with a live caller is a deploy outage and
  no gate detects it.

If a change you own requires a schema change, ship the code behind it only if the code is inert
without the migration. Say so explicitly in the handoff.

## 7. House defect patterns — check these before you claim a contract is correct

These are the failures this codebase actually ships. Each one passes typecheck.

**Contracts**
- `z.string()` over a PostgreSQL enum is the single most common contract defect here. If the
  column is a `pgEnum`, the Zod schema must be the enum.
- `apiClient.get<T>(...)` without a runtime contract is a **cast**, not validation. Same for a
  `postgres-js` row generic.
- `z.object()` silently **strips** unknown keys on decode — a missing field reads as "absent",
  not as an error.
- The response envelope wraps successes, not errors. A wrong contract renders as an **empty
  state**, not an error.
- `.strict()` param schemas must declare **every** route param.
- Declaring an array where the server returns a cursor envelope yields `200` +
  `CONTRACT_VIOLATION`, and the parity gate is blind to it.
- A list projection that omits `deletedAt` breaks every page after the first row.
- Keyset cursors must match their `ORDER BY`. An undefined cursor value vanishes in JSON.
- A query-key factory called with no args matches nothing.

**Data access**
- Missing RLS is a silent cross-tenant hole; RLS needs the live tenant GUC. The Drizzle token is a
  tenant-aware proxy, and its nested transactions are savepoints.
- `@Public()` webhook routes raise `42501` on RLS lookup — they need `SECURITY DEFINER`.
- Tables created without grants fail `42501`, which reads exactly like an RLS denial.
- RLS defeats GIN trigram indexes; a non-leakproof function in an index expression is dead under
  RLS. `EXPLAIN` as `streamline_app`, never as the admin role (it is `BYPASSRLS`).
- The whole request runs in one tenant transaction, so `DB_POOL_MAX` is the max concurrent
  request count. Do not add a write inside a `GET`.
- After-commit hooks have **no tenant context**.

**Frontend**
- `cn()` deletes custom font-size classes. `flex-1` does not give buttons equal width.
- `setListParams` inside an effect loops forever.
- `loading={null}` on `PageState` is the house pattern.
- Authenticated routes SSR a spinner.

**Tests**
- A negative-only status assertion passes on a `500`. Pair every negative with a positive control,
  and make sure the control can actually render.
- An arity change makes negative assertions vacuous; only `tsc` sees arity, and you may not run it
  — so grep call sites yourself when you change a signature.
- A response-contract test failing with `500` usually means the mock drifted, not the code.
- A bare transaction mock disables coverage; a `withIdentity` mock needs `query` on the tx.
- Jest `roots` exclude `test/` — specs live under `src/**`.

**House style**
- **Never add code comments.** If a line needs a reason, the reason goes in a test name.
- Never hand-edit a generated registry.
- Match the surrounding file's naming and idiom.

## 8. What "done" means for you

You are done when **every** checkbox in **every** page spec in your set is either:

- `- [x]` with a written evidence line in your status file, or
- `- [ ]` with a `BLOCKED — <measured reason, with the command output that measured it>` line.

Not before. If you run low on room, keep going on the highest-value unfinished criterion rather
than writing a summary. Your final report should be short: counts ticked / blocked, the three most
significant code changes, every request you filed, and every migration you handed off.
