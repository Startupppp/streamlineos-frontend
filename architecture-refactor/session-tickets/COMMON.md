# COMMON.md — rules every session ticket obeys

Read this once at the start of your session, then read your own `S0X-*.md` ticket.

## 0. Execution protocol — how a session runs

**Ask everything up front, then do not stop.**

1. **Opening checkpoint (once).** Read your ticket, inspect the current source for every item, and ask **all** your blocking questions in **one** message, using selectable options with a marked recommendation. Typical questions: an ambiguous product decision, whether a legacy surface may be deleted now, what a domain event should do, which of two designs to take. If nothing is genuinely blocking, say so and start.
2. **Then run to completion without checking in.** After that one checkpoint you do not stop to ask "shall I continue?", you do not pause for approval between items, and you do not hand back a partial result. Decide the judgement calls yourself, record each decision in your report as `Decision: <what> — <why> — <cost if wrong>`, and keep going.
3. **The only four reasons to stop early:** an irreversible or destructive operation the ticket did not authorize; a security-sensitive action; a side effect outside this repo (a push, a publish, a deploy); or a ticket item so broken that every path forward is a guess. Everything else you decide and continue.
4. **You are done when every checkbox in your ticket is ticked** — or explicitly marked `OPEN` with a concrete reason in your report. Not before.

**Tick your todo list as you go.** Your ticket is a live checklist. The moment an item is genuinely finished and proved, edit your ticket file and change `- [ ]` to `- [x]`. If an item turns out to be already satisfied, tick it and write `VERIFIED DONE` with the quoted evidence. If it is a false premise, tick it and write `FALSE PREMISE` with the evidence. Never tick an item you did not prove. This file is how a later session — or a resumed one after a context loss — knows what is left.

**Work in small committed increments.** Finish an item, prove it, tick it, commit it, move to the next. Do not batch ten items into one giant uncommitted change: this tree is shared and uncommitted work has been destroyed here before.

## 0a. When to run typecheck and builds

**Do not run `pnpm typecheck`, `pnpm type-check`, `nest build` or `next build` after every edit.** The backend typecheck needs an 8 GB heap and takes minutes; a full frontend lint run takes 25+ minutes and gets killed. Running them per-change is the single biggest waste of a session.

Instead:
- **While working:** rely on targeted, fast feedback only — the specific jest tests covering the code you just changed (`node ./node_modules/jest/bin/jest.js --testPathPattern="<narrow>" --maxWorkers=2`), and the cheap targeted check scripts relevant to your change.
- **At the very end of the session, once:** run the full validation block in §11 — both typechecks, the builds where a build is the only proof, and the whole gate list. Fix what it surfaces, then re-run only what you broke.
- If you must sanity-check compilation mid-session, do it at most once at a natural halfway point, not per item.

## 1. Independence contract

Your session is **self-contained**. You never wait for, coordinate with, or assume the state of another session.

- You own an exclusive set of file globs. Never edit a file outside them.
- If a fix you need lives outside your ownership, **do not make it**. Record it in your report under `OUT-OF-OWNERSHIP` with the exact file, line and the one-line change required. Another session owns it and will apply it.
- Never mark your work blocked because another session has not run. If a premise depends on their work, verify the premise against current source and proceed with what is true today.
- Sessions may run in any order, and may be re-run. Every ticket item is written so that "already done" is a legitimate and expected outcome.

## 2. Verify before you change — premises here go stale

The backlog these tickets came from contains **stale and partly wrong premises**. Real examples already caught:

- it named `backend/src/modules/home/dashboard/**`; the real path is `backend/src/modules/dashboard/**`
- it called for normalising calendar attendees and chat reactions; `event_attendees` and `chat_message_reactions` **already exist** as normalised tables with composite tenant FKs
- it claimed 88 backend / 22 frontend oversized files; the real in-scope counts are **65 / 18**
- it listed `payroll/layout.tsx` as missing a route guard; it already had one

So: **confirm every file, symbol, route, API, schema and defect against current source before editing.** If an item is already done, write `VERIFIED DONE` with the quoted source that proves it and move on. If an item's premise is false, write `FALSE PREMISE` with quoted evidence. Do **not** invent work to justify a ticket item — an agent on this repo once was told to hide a filter that never existed, and it *built* the filter and then hid it.

Equally: do not shrink scope to make a rule pass. An agent here once deleted two user-visible options to satisfy a file-size rule. Review deletions of capability as carefully as additions.

## 3. Mandatory reading before your first edit

- `CLAUDE.md` (repo root) — the constitution. Cardinal rules, the frontend/backend boundary, product rules.
- `backend/CLAUDE.md` if you touch `backend/**` — NestJS, Drizzle, RBAC engine, caching, security.
- `frontend/CLAUDE.md` if you touch `frontend/**` — Next.js, Query, components, forms.

`backend/CLAUDE.md` §5 (RBAC) and §4 (Security) contain non-obvious, load-bearing rules. Read them properly; several are counter-intuitive and "simplifying" them reintroduces vulnerabilities.

## 4. Repo layout

- **`backend/` is a SEPARATE git repository** (`streamlineos-api`). `frontend/`, `docs/`, `architecture-refactor/` and `scripts/` are in the ROOT repository. Two repos, two `git status`, two commits.
- Backend owns **all** business logic, APIs and schema. The frontend has **no** database access and no business `app/api/**` routes — the only frontend `route.ts` is the NextAuth/auth bridge.
- Schema source of truth is `backend/src/db/schema/**`; migrations live in `backend/migrations/` and run only from there.

## 5. Non-negotiable code rules

- **Strict TypeScript.** No `any` (use `unknown` + narrowing). No `as X` / `as unknown as X`. No `@ts-ignore` / `@ts-expect-error`. No `!` abuse. Raw `db.execute(sql\`…\`)` rows are `Record<string, unknown>` — convert at the use site (`Number(row.count)`, `row?.field ?? fallback`).
- **No comments in code.** Delete stray comments, commented-out code and `console.log`. At most one comment, only where something genuinely cannot be expressed in code.
- **kebab-case** for every file and folder; PascalCase for the symbol inside.
- **File size:** ≤300 lines target, 500 hard. Over 500 → split by responsibility, or record a named cohesive exception with interface, reason and owner. A **forwarding wrapper is not a refactor** — splitting must reduce responsibility, render surface or test complexity.
- **Zod at every untrusted boundary.** Schemas live in the module's `dto/` (backend) or `*-schema.ts` beside the feature (frontend) — never inline in a controller, route, component or hook. Types via `z.infer`, never a parallel `interface` (a parallel interface is the usual root cause of contract drift).
- Named event handlers. Single-statement `if`/`for` bodies omit braces.
- **Leave less code than you found.** Delete dead code and its files — but see §9 on what counts as proof.

## 6. Security rules that are easy to get wrong

- **Authorize at the data layer**, on every read AND write, tenant-scoped. Guards and UI checks are advisory; the query predicate is the gate.
- **BOLA is the top risk.** Every endpoint taking a resource id re-asserts the caller's access to *that object*. Cross-tenant misses return **404, never 403** — a 403 confirms the record exists and turns a probe into an existence oracle.
- **`PermissionGuard` is NOT a global guard.** A handler carrying `@RequirePermission` but **not** `@UseGuards(JwtAuthGuard, PermissionGuard)` is authenticated and module-gated but **never permission-checked**. Audit for this explicitly; it is a silent hole that reads as correct.
- **Every handler must declare its exposure** — one of `@Public()`, `@Universal()`, `@RequirePermission(...)`, `@AuthorizedInService("<what checks it>")`. `RouteClassifierGuard` denies an undeclared handler at boot and at request time.
- **Making a route universal means moving the guard, not deleting the key.** `PermissionGuard` denies a route it covers that has no `@RequirePermission`, so stripping the decorator under a class-level guard locks everyone out. Put `@UseGuards(JwtAuthGuard)` on the class and `@UseGuards(PermissionGuard)` on each gated handler.
- **Identity comes from the token.** `@CurrentUser()` gives `userId`/`orgId`. The client never sends its own actor id or active org id. Self reads use `/me` routes.
- **An optional `userId` filter that widens scope must be authorized, and the gate must bite.** Confirm the widening permission is not one the ordinary read role already holds — gating on a key that sits beside the read key in the same role is a no-op. Gate on the scopable key's DataScope.
- **A permission key must exist verbatim in BOTH catalogs** (`backend/src/modules/rbac/permissions/**` and `frontend/lib/rbac/permissions/**`). A frontend-only key makes `useCan` false forever; a backend-only key cannot be gated. **Never invent or guess a key** — grep for it and quote where you found it. Subagents on this repo previously guessed 6 of 13 keys wrong.
- **`@UseRateLimit("key")` needs a matching `TIERS` entry** in `backend/src/common/ratelimit/rate-limit.service.ts`, **and** `RateLimitGuard` in `@UseGuards`. Missing any of the three silently disables the limit while looking protected.
- **Session revocation needs the Redis tombstone** `revoked:session:<id>`. A database `isRevoked` flag alone logs nobody out — `JwtAuthGuard` reads only the tombstone.
- **SSRF:** reuse `backend/src/common/security/ssrf-guard.ts`. Never write a second guard — a fresh one misses the packed `::ffff:7f00:1` form `new URL()` actually produces.
- **AI retrieval filters by the asker's access in the SQL predicate, never in the prompt.** A chunk is disclosed the moment it enters the context window.

## 7. Database, RLS and query rules

- **RLS is live.** `this.db` is ALS-routed; a write with no tenant GUC dies `42501`. Background sweeps have no ambient context — iterate with `forEachOrg`.
- **A side effect fired after the request must not borrow the request's transaction.** `void something(...)` after the handler returns runs against a committed transaction with no GUC and dies `42501`. Use `registerAfterCommit`, or `OutboxWriter.emit(tx, …)` for work whose loss is a correctness bug, or do it inside the request transaction if it is itself a DB write that must be atomic. Never swallow a deferred failure.
- **A covering index on an RLS table must contain `org_id`**, or the planner refuses an index-only scan entirely and it reads as "the index didn't help".
- **Measure in BUFFERS as the `streamline_app` role with the tenant GUC set** — never as the DB owner, which has `BYPASSRLS` and hides every problem. `VACUUM ANALYZE` after any table rewrite: stale stats and an empty visibility map cost 53 → 201,875 blocks on one list.
- **Text search is unusable under RLS** and `ALTER FUNCTION … LEAKPROOF` is impossible on Neon. The only escape is a `SECURITY DEFINER` function owned by the BYPASSRLS owner — see `app.search_ticket_ids` (migrations `0424`/`0425`) for the canonical five-condition shape.
- **An `OR` between an indexed predicate and a semi-join defeats both.** Split into a `UNION` of independently-indexed branches with `count(*) OVER ()`. The winner flips once the outer set is narrowed to one project — **measure both**.
- **`prepare: false`** on the Neon driver, so `sql.placeholder` prepared statements are inert. Optimize via indexes, projection and N+1 removal.
- **Soft delete is the default and every read must filter `deleted_at`.** A `deleted_at` column that reads ignore silently resurrects deleted rows.
- **No `SELECT *`**, no unbounded relation loading, and **never an unprojected relation to global `users`** — those rows still hold authentication secrets and legacy payroll/HR fields.
- **All lists cursor-paginated, hard cap 100**, with a stable sort and a unique id tie-breaker. A cursor must never serialize as `undefined`: "exhausted" and "not started" must not share a value, or the client replays the whole list forever. Use explicit `null`.

## 8. Migration rules

- Never hand-edit generated SQL — regenerate. Additive: add nullable → backfill in batches → add NOT NULL. One purpose per migration. Name constraints and indexes explicitly.
- **A `.sql` file absent from `migrations/meta/_journal.json` NEVER applies — and `db:migrate` reports success anyway.**
- **Drizzle skips by TIMESTAMP, not hash.** A future-dated row in `__drizzle_migrations` silently disables `db:migrate` for everyone.
- **`--> statement-breakpoint` inside a `DO $$ … $$` block tears it into invalid fragments.** Drizzle splits on that marker.
- **`generate --custom` copies the previous snapshot instead of diffing** — reconcile `migrations/meta` after, or the next `db:generate` re-proposes applied work.
- **Adding an FK or NOT NULL takes ACCESS EXCLUSIVE — split it.** `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT`. Set `lock_timeout` (~5s) so it fails fast instead of blocking the table.
- **A migration filename is not the table name.** To decide whether a migration's work is applied, grep the `.sql` for `CREATE TABLE`/`ALTER TABLE` and check `pg_catalog` for those exact objects.
- If you add migrations, append your own journal entries last. If `_journal.json` conflicts because another session also added entries, run `pnpm db:reconcile-journal` rather than hand-merging.
- **A tenant table with no RLS policy is readable org-wide** — grants arrive via `ALTER DEFAULT PRIVILEGES`, so a missing policy is silent.

## 9. Deleting code

Delete only when **all** hold:
1. A module-graph tool proves no static, dynamic, side-effect or barrel dependency. **grep is not proof** — a bare `import "./x";` is invisible to from-based scanners.
2. Public/extension contracts are checked.
3. Schema symbols, raw table names, migrations and foreign keys are checked.
4. Typecheck **plus a real `nest build` / `next build`** succeeds after (`tsc --noEmit` misses a missing side-effect import).

Use `pnpm exec knip --no-progress` (installed in both repos). **Knip alone NEVER authorizes deleting a schema file.** `db/schema/hrms-phase1-sql-managed.ts` is a deliberate holding barrel asserted by `migration-integrity.spec.ts`; being unimported *is* the design. **Emptiness is not deadness** — a table with zero rows is usually unseeded, not abandoned.

## 10. Testing traps that have silently voided real tests here

- **A `db.transaction` mock MUST invoke its callback.** A bare `jest.fn()` silently voids every assertion inside the transaction.
- **Never `JSON.stringify` a captured Drizzle condition** — conditions are circular and it throws. Use `new PgDialect().sqlToQuery(cond)` or a cycle-safe walker.
- **`*.e2e-spec.ts` files run ONLY under `pnpm test:e2e`** — they are in `testPathIgnorePatterns` for the default run. A spec named `*.e2e-spec.ts` is not executed coverage.
- **Use `node ./node_modules/jest/bin/jest.js`, never `npx jest`** — npx resolves to a global v30 with a renamed `testPathPatterns` flag and babel parse errors.
- **The frontend tsconfig EXCLUDES test files**, so a clean `pnpm type-check` does **not** prove your frontend tests compile. Run jest.
- **`withTenant`/relocation tracking fires an unmocked `db.select` on the first tenant transaction** — tolerate the extra call or a scripted sequence mock desynchronizes and the symptom looks like a domain bug.
- **Inserting one query at the front of a service reassigns every mocked row** in a sequence mock; it surfaces as a plausible-looking 403, not an obviously wrong row.
- **Prove a test bites.** After making a suite green, neuter the mechanism **in the test double** (never in source) and confirm it goes red, then restore.
- **Grep by the typed `kind`/enum tag, not by a literal message string** — a literal-string scan once missed 13 of 21 handlers while the spec stayed green.
- **`pnpm x 2>&1 | tail` reports tail's exit code, not the gate's.** Redirect to a file or `echo $?` explicitly, or you will read a failing gate as green.
- **Typecheck and mocked tests are not proof the feature works.** For anything touching notifications, background sweeps, RLS or post-commit hooks, boot the API and exercise the real request — a swallowed `42501` passes every static check.
- Backend `tsc --noEmit` needs `NODE_OPTIONS=--max-old-space-size=8192` (already in the `typecheck` script).
- If jest workers get killed, shard: run with `--maxWorkers=2` or in sequential `--shard` passes.

## 11. Validation you must run

Authorization has been granted by the repo owner for **tests, lint, builds, live-database checks, migrations and destructive database repair** (staging/dev hold no required data). A skipped validation leaves the item **OPEN**; never report an unrun or failing check as passing.

Backend (`cd backend`):
```
pnpm typecheck
pnpm check:route-classification      pnpm check:permission-keys
pnpm check:tenant-indexes            pnpm check:scope-application
pnpm check:record-access             pnpm check:tenant-isolation
pnpm check:module-entitlement        pnpm check:module-lifecycle
pnpm check:idempotent-commands       pnpm check:log-secrets
pnpm check:owner-authority           pnpm check:placement-bypass
pnpm check:navigation-permissions    pnpm check:migration-chain
pnpm verify:rbac-integrity           pnpm openapi:check
pnpm scan:legacy-actors:check        pnpm check:cycles
node ./node_modules/jest/bin/jest.js --testPathPattern="<your scope>" --maxWorkers=2
```
Frontend (`cd frontend`):
```
pnpm type-check                      pnpm check:cycles
pnpm check:routes                    pnpm check:query-scope
pnpm check:formatters                pnpm check:empty-states
pnpm check:effect-fetches            pnpm check:icon-labels
pnpm check:dead-code                 pnpm check:client-pages
pnpm check:route-access-contract     pnpm check:contract-drift
pnpm check:contract-vendor           pnpm check:module-manifest
pnpm verify:server-data-seam
node ./node_modules/jest/bin/jest.js --testPathPattern="<your scope>" --maxWorkers=2
```
If you change any backend route or DTO, finish with:
```
cd backend && pnpm openapi:generate
cp backend/openapi.json frontend/contracts/openapi.json
cd frontend && pnpm check:contract-vendor
```

**Frontend lint traps:** a full `eslint` run takes 25+ minutes and gets killed. Scope by the rule's selector and batch ≤60 paths — 356 paths exits 1 with no report. `warn`-level rules never gate.

## 12. Git

- Commit **verified** work on the current branch, in the correct repo. **Never** push, checkout, branch, merge, pull, fetch, reset, stash or rebase.
- **This tree is shared by several programs.** `git add` and `--amend` take the WHOLE index. Always stage by explicit pathspec, then re-check `git diff --cached --name-only` before committing.
- Commit as you finish each work item, not once at the end — uncommitted work in this tree has been destroyed by concurrent sessions before.
- End commit messages with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## 13. Reporting

Write your report to `architecture-refactor/session-tickets/reports/S0X-report.md`:

- One section per work item with a verdict: `DONE` · `VERIFIED DONE (already correct)` · `FALSE PREMISE` · `PARTIAL` · `OPEN`.
- Evidence for every verdict: file, line, quoted source, and verbatim command output.
- `OUT-OF-OWNERSHIP` — exact file, line and one-line change for other sessions.
- `NEW FINDINGS` — anything you found that no ticket item named. This section is mandatory even when empty.
- `OPEN` — anything you could not close, with the concrete reason. An honest OPEN is worth more than a false green.

Then tick your items in your ticket file. Do not tick an item you did not prove.
