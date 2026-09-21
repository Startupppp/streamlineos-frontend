# Build module — final closure status

Coordinator ledger for the closure phase opened 2026-09-21. Every row is reconciled against **source**, not against the backlog document. The backlog has already been caught twice claiming pending work that was in fact finished, so an unsupported claim here is marked UNVERIFIED rather than carried forward.

## Environment as found

| Fact | Value |
|---|---|
| Root repo | `D:/projects/personal/Streamlineos` — `main` = `4b41bb510`, in sync with `origin/main`, clean |
| Backend repo | `D:/projects/personal/Streamlineos/backend` — `main` = `8b3612135`, in sync with `origin/main`, clean |
| Database | **None.** No non-production PostgreSQL exists on this machine. `backend/.env` points at **production**. |
| Build pages | 83 `page.tsx` under `app/(authenticated)/build/` |
| Build routes | 83 authenticated Build routes. `check:route-census` reports **92** because it covers the whole app — the extra 9 are public/portal routes. |

The route census snapshot (`docs/specs/build/generated/routes.snapshot.json`) carries only `path` and `file` per route. It has no access-key column, so **it cannot express "zero weak cold-load gates" without being extended**. Regenerating it without `--check` rewrites `generatedAt` and dirties the tree.

### Clean-tree baseline, measured before any closure work

Establishes which failures are pre-existing. Anything not listed here that fails later is a regression.

| Command | Result |
|---|---|
| `pnpm check:route-census` (root) | PASS — 92 Build routes, snapshot current |
| `pnpm check:build-execution-plan` (root) | passed |
| `pnpm typecheck:web` (root) | exit 0 |
| `pnpm typecheck` (backend) | exit 0 |
| `pnpm check:set-null-column-lists` (backend) | exit 2 — INCONCLUSIVE, catalog half needs a database |
| `pnpm check:composite-fk-set-null` (backend) | exit 2 — **PREREQUISITE UNMET**, see hazard below |

### Hazard discovered during baselining

`pnpm check:composite-fk-set-null` **injects `.env` and opens a live connection**:

```
◇ injected env (61) from .env
PREREQUISITE UNMET — cannot read pg_constraint: PAM authentication failed for user "streamline_admin"
```

Since `.env` points at production, this gate **attempts a production connection every time it runs**. It failed only because the app role password has been rotated. It is now on the banned list alongside `db:migrate`, `migration:proof*`, `check:migration-chain`, `check:migration-ledger`, `db:verify-rls` and `openapi:generate`. Injecting placeholder env vars does not help — `.env` is injected first.

The consequence for TASK I is specific: migration 1142's `ON DELETE SET NULL (headcount_id)` column list lives only in `pg_constraint.confdelsetcols`. **Nothing static can read it.** 1142 is verifiable by reading its SQL and by no other means until a real database exists.

## Task board

| Task | Status | Agent/session | Files changed | Tests | Blocker |
|---|---|---|---|---|---|
| J — authz fixes: 15 ticket handlers | IN_PROGRESS | agent, `build/closure-j-tickets` | — | — | — |
| K — authz fixes: 9 execution handlers | IN_PROGRESS | agent, `build/closure-k-execution` | — | — | — |
| L — authz fixes: 6 remaining handlers | IN_PROGRESS | agent, `build/closure-l-misc` | — | — | — |
| A — Release nested-resource authorization | **DONE** — merged to backend `main` as `d714ae8ff` | agent + coordinator, `build/closure-a-releases` | `projects-releases.service.ts` (7 lines), `projects-releases-cross-project-binding.spec.ts` (new, 388 lines) | 13/13 new; 109 suites / 545 tests green in `src/modules/build/core`; `typecheck` 0, `typecheck:test` 0 | — |
| B — N-11 cold-load route gates | **DONE** — merged to root `main` | agent + coordinator, `build/closure-b-n11` | 52 files: 49 `page.tsx`, 1 new feature module, 1 new census spec, `scripts/build-route-census.mjs` | census PASS **0 weak cold-load gates**; self-test 9 PASS; `lib/rbac/route-access` 9 suites / 223 tests; `typecheck:web` 0; `check:build-execution-plan` 0 | — |
| C — P0 #6 Sprint/Cycle | **BLOCKED** — not dispatched | scoped, read-only | none | none | Consolidates **two live database identities** (`sprints` and `cycles` tables, both live; tickets carry both `sprintId` and `cycleId` with separate composite FKs). Needs a schema migration **and** a row-level data backfill. No non-production database exists. |
| D — P0 #7 QA Bug lifecycle | **BLOCKED** — not dispatched | scoped, read-only | none | none | `build.bugs` is a separate table with 10 columns the canonical ticket lacks and a 9-value status enum that maps onto nothing. Needs a schema migration **and** a row-level backfill. No non-production database exists. |
| E — P0 #8 residual | **DONE (fixture half)** — merged to backend `main` as `a684fed0f`. Item P0 #8 itself remains **BLOCKED** | agent + coordinator, `build/closure-e-p08` | `build-project-scoped-lists-404.spec.ts` (+24, spec only) | 18/18; `project-access-404` 4/4; `typecheck` 0, `typecheck:test` 0; both set-null self-tests green | The 286 composite SET NULL constraints need a real database |
| F — P1 #11 Issues explorer residual | IN_PROGRESS | agent, `build/closure-f-issues` | — | — | — |
| G — P1 #13 command palette residual | **DONE** — merged to root `main` as `cf7df1e07` | agent + coordinator, `build/closure-g-palette` | 9 files (`command-palette-dialog.tsx`, `use-global-search.ts`, `sidebar-nav-items.ts`, `build-nav-groups.ts`, 3 new specs, 2 mock updates) | 339 passed / 343; the 4 failures are pre-existing `shell-keyboard.test.tsx`, confirmed identical on main; `typecheck:web` 0 | — |
| H — Controller census | **DONE** — merged to backend `main` as `a7c4b3b84` | agent + coordinator, `build/closure-h-census` | `scripts/build-authorization-census.mjs` (new, 1958 lines), `docs/build-module/authorization-census.{md,json}`, `package.json` | self-test 29/29; `--check` green; `typecheck` 0 | — |
| I — Migration readiness | **DONE (static)** — merged to backend `main` as `40abe03fc`. DB application **BLOCKED** | agent + coordinator, `build/closure-i-migrations` | `docs/migration-static-verification-2026-09-21.md` (new). **No migration, journal or seal file touched.** | 8 gate self-tests then 7 gates, all exit 0; `typecheck` 0 | No non-production PostgreSQL. `check:set-null-column-lists` needs `SET_NULL_GATE_DATABASE_URL`; `check:composite-fk-set-null` is production-touching and was not run |

## Reconciliation of the inherited pending list

| Claim inherited | Verdict | Evidence |
|---|---|---|
| TASK A "releases authorization closed by N-10" | **FALSE — the defect is real and open** | N-10 added `assertProjectAccess(…, projectId)` to all five methods, which gates the caller against the **URL** project. But every nested lookup then omits the project binding: `projects-releases.service.ts:77` (`updateRelease`), `:115` (`deleteRelease`), `:125` and `:131` (`addTicketToRelease`), `:144` and `:150` (`removeTicketFromRelease`). A member of Project A can still mutate a release in Project B in the same org. `:150` additionally omits `orgId` from the delete. |
| "2 VULNERABLE + 14 NEEDS-REVIEW controllers" | **UNVERIFIED** | Produced by a manual pass with no committed artefact. TASK H must prove or replace it. |
| N-11 "63 of 83 routes weakly gated" | **denominator CONFIRMED, numerator UNVERIFIED** | The 83 is right. `check:route-census` reports 92 because it covers the whole app: 83 routes under `app/(authenticated)/build/` plus 9 public/portal routes (`/accept-invitation`, `/board/{shareToken}`, `/client-portal`, `/client-portal/{projectId}`, `/forms/{formToken}`, `/intake/{projectId}`, `/portal`, `/portal/{projectId}`, `/roadmap/{orgId}`). The count of 63 weak routes is still unproven and TASK B must re-measure it. |
| Migrations 1141 / 1142 committed but unapplied | **CONFIRMED** | Both present, both journalled, neither applied. No database exists to apply them to. |

## Worktree allocation

No two agents share a file. Each works in its own worktree cut from `main`.

| Branch | Worktree | Owns |
|---|---|---|
| `build/closure-a-releases` | `slos-be-a-releases` | `backend/src/modules/build/core/projects-releases.*` |
| `build/closure-h-census` | `slos-be-h-census` | `backend/scripts/` census generator + report |
| `build/closure-i-migrations` | `slos-be-i-migrations` | `backend/migrations/`, migration report |
| `build/closure-b-n11` | `slos-fe-b-n11` | `frontend/app/(authenticated)/build/**`, `frontend/lib/rbac/route-access/` |

This file is owned by the coordinator. No agent may edit it.

---

## TASK A — closed, merged as `d714ae8ff`

The inherited claim that N-10 closed this was wrong. N-10 gated the **caller** against the URL project; every nested lookup then matched on `releaseId + orgId` alone. Six bindings were missing:

| Method | Added |
|---|---|
| `updateRelease` | `projectReleases.projectId` |
| `deleteRelease` | `projectReleases.projectId` |
| `addTicketToRelease` | `projectReleases.projectId`, `tickets.projectId` |
| `removeTicketFromRelease` | `projectReleases.projectId` |
| `releaseTickets` count + delete | `releaseTickets.orgId` — both **spanned organizations** |

The two `releaseTickets.orgId` omissions were not in the original finding. The ticket-count subquery counted rows from every tenant, and the unlink deleted them.

`tickets.projectId` is **nullable** (`ticket-core.ts:38`), so a project-less ticket now fails the match — fail-closed, which is correct.

### Mutation proof

The spec interprets real Drizzle where-clause predicates against an in-memory store instead of asserting on a mock, so removing a gate genuinely changes the outcome rather than passing vacuously. Each class was removed independently:

| Mutation | Result |
|---|---|
| 4 release `projectId` bindings removed | **5 of 13 fail** |
| ticket `projectId` binding removed | **1 of 13 fails** |
| `releaseTickets` `orgId` bindings removed | **2 of 13 fail** |
| all restored | **13 of 13 pass** |

The transaction mock invokes its callback (BE-136), so the assertions inside it are live.

### Prior weakness resolved (TASK A)

The earlier N-10 spec had a positive control (`updateRelease`) that failed when its gate was removed, because the transaction mock was consumed by the membership probe — it could not distinguish a working gate from a broken fixture. The new store-backed fixture does not have that defect.

---

## TASK I — static verification only, merged as `40abe03fc`

**Database application is BLOCKED. Migrations 1141 and 1142 remain UNAPPLIED.** No database was contacted and none of the banned commands ran.

### Gates that ran (no DB I/O, proven by reading source first)

`check-migration-immutability`, `check-migration-rollback`, `check-drop-column-safety`, `check-migration-discipline`, `check-watermark-free-appliers` and `migration-plan` import only `node:fs`/`path`/`url`/`os`/`crypto`. `guard-db-generate` does import `node:child_process`, but `--check` routes through `runCheck()`, which `process.exit()`s at both exits before reaching the `spawnSync("drizzle-kit")`.

Self-tests first in every case (discipline 27, immutability 13, rollback 9, drop-column, db-generate-guard 6, watermark-free 10, set-null 14, composite-fk 7/7), then the gates: discipline PASSED 903 files / 0 new violations, immutability OK, rollback PASSED, drop-column OK, watermark-free OK, `typecheck` 0.

### Blocked, with the exact missing requirement

- `check:set-null-column-lists` — needs a **non-production bootstrapped PostgreSQL 15+ via `SET_NULL_GATE_DATABASE_URL`**. None exists here. The worktree has no `.env` at all, so the blocker is the absent database, not credentials.
- `check:composite-fk-set-null` — production-touching; self-test only.

### Journal integrity — independently re-verified by the coordinator

903 files ↔ 903 entries, sets identical, 0 unjournalled, 0 fileless, 0 duplicate `idx`, 0 duplicate `when`, and **exactly one** `when` non-increase, at array position 342 (`0271a_waitlist_admission` → `0619_chain_creates_what_production_has`).

### Both alleged defects: REAL, already adjudicated — document, do not touch

**Duplicate prefix 1090.** Distinct tags, idx, when and files. Nothing resolves a migration by prefix: the runner reads `migrations/${tag}.sql`, the seal keys on tag, and the ledger has no tag column. It is one of **80** duplicated prefixes (`0379` is 4-way). Already in `BASELINE_JOURNAL_INTEGRITY`; the gate passes with 0 new violations.

> **The baseline's written rationale is false.** It claims the collision was with "the already-sealed `1090_subscription_purchases`". Coordinator-verified: **neither 1090 is sealed.** The conclusion survives only on the independent ground that the ledger stores no tag. Do not rely on the seal argument if this is revisited.

**0619 / 0271 timestamp regression.** Named verbatim by `check:migration-discipline` as a `NOTE [journal-order]`. Ordering is by **array position** — `run-pending-migrations.mjs:128` queues the whole array and guards by file hash; `migration-plan.mjs` uses set membership, not a watermark. `check:watermark-free` is what keeps it harmless: if any applier reverted to watermark selection, position 341 would silently strand hundreds of later entries.

Two reasons not to touch it: **`0619` is sealed** (coordinator-verified — changing its `when` is a `RENUMBERED` failure, since `when` is the ledger join key), and `0271a` is baselined against the databases it is recorded applied on. With no database, the ledger half of that repair is impossible.

*Coordinator note on method:* the seal file keys entries by array index, and each entry carries its own `tag`. Two of my own membership tests were malformed before I got this right — first comparing tags against index keys, then comparing by journal position, which has drifted because `0464a` and `0271a` were spliced in after sealing. The authoritative test is the `tag` recorded inside each seal entry.

### PostgreSQL version — UNDECLARED

**No file in either repository declares a minimum.** `engines` is Node-only; there is no docker-compose, devcontainer, `.tool-versions`, IaC or `server_version_num` assertion. PG 15+ holds only in practice: CI pins `pgvector/pgvector:pg16`, production Aurora is 18.4 (`db/pool.config.ts:207`), local scratch 18.6.

**1142 introduces no new requirement** — the PG15 column-list form appears in ~100 migration files, earliest `0265`, with `0770` and `0992` dedicated to it, all three sealed. Declaring the floor explicitly is worth doing, but it does not gate this deployment.

### Deployment hazard found in 1141 — coordinator-verified

`src/db/schema/build/core.ts:46` declares `pmWorkspaceId: text("pm_workspace_id")` with **no `.notNull()`**, and OpenAPI publishes it nullable — but the database still carries the NOT NULL from `0333`. **Until 1141 is applied, the published contract says optional while a write that omits the field raises `23502`.** This makes applying 1141 a correctness fix, not a nicety.

1142's column list is unverifiable statically for a second reason beyond `confdelsetcols`: `src/db/schema/hr/requisitions.ts:37` declares the same FK as `.onDelete("set null")`, and **Drizzle's API has no parameter for a column list at all** — the schema is silent on the very thing 1142 changes. The unblock path exists: `.github/workflows/db-gates.yml:157` already runs this gate with `SET_NULL_GATE_DATABASE_URL` against its own `pgvector/pgvector:pg16` service.

---

## TASK E — fixture half closed, merged as `a684fed0f`

The residual of P0 #8 turned out to be a **test-fixture** defect, not a production authorization defect — but a consequential one.

`makeDb` built a chainable `select` but never stubbed `execute`. `ProjectsAnalyticsService.computeProjectAnalytics` calls `this.db.execute(sql\`…\`)` (`projects-analytics.service.ts:42`) for the assignee-completion aggregate, so the positive control died with `TypeError` before reaching any analytics logic.

**Why a red control matters more than its size suggests.** All 8 negatives ("answers 404 for a foreign project") were passing — but with the control dead, nothing established they were passing *for the right reason*. Under BE-141 a status-only negative passes on a 500. Repairing the control is what makes the other 8 assertions trustworthy.

`execute` is now stubbed faithfully, returning string-typed `total`/`completed` as postgres does for `COUNT(...)`, so the service's `Number(row[…])` coercion (`:63-76`) does real work instead of a no-op over an empty array. The control was repaired, **not narrowed or deleted**. Two analytics-specific assertions were added, because `resolves.toBeDefined()` cannot distinguish "the gate let it through" from "the gate was never reached": the control now asserts the mapped `assigneeCompletion` payload and that `execute` ran once, paired with a negative asserting `execute` was **not** called for a foreign project.

### Mutation proof — all 8 gates, not the 2 required

Each of the eight is an independent service, so all were removed at once and observed individually: `assertProjectAccess` (`projects-releases.service.ts:31`) and `assertProjectInOrg` in `projects-webhooks`, `sprints`, `epics`, `cycles`, `modules`, `projects-custom-fields`, `projects-analytics`.

| State | Result |
|---|---|
| before fix | 15 passed, **1 failed** (analytics control) |
| after fix | 18 passed, 0 failed |
| all 8 gates removed | **9 failed**, 9 passed |
| restored | 18 passed, 0 failed |

**8 of 8 negatives bit; none failed to bite.** All 8 controls stayed green under mutation — the expected asymmetry, since removing a gate does not break the happy path.

*Coordinator spot-check:* I independently removed only the `cycles.service.ts` gate — exactly **1 of 18** failed, and restore returned 18/18 with a clean tree. The negatives are individually load-bearing, not collectively coincidental.

**No production defect was found.** All eight services gate on the first line of the method, before any query. Parent-child 404 behaviour is correct.

### Scope

This closes the fixture defect. It does **not** close backlog item P0 #8, whose database half — the 286 composite SET NULL constraints readable only from `pg_constraint.confdelsetcols` — remains blocked.

---

## TASKS C and D — BLOCKED, deliberately not dispatched

Both are consolidations of **two live database identities**, not missing features. Each requires a schema migration plus a row-level data backfill, and no non-production database exists on this machine. Writing an unappliable, unverifiable migration would be worse than leaving them clearly blocked.

**P0 #6 — Sprint/Cycle.** Two live tables: `sprints` (`db/schema/build/core.ts:98-129`, text status `PLANNED/ACTIVE/COMPLETED`, `goal`, timestamp dates) and `cycles` (`:154-183`, pg enum defaulting `draft`, `description`, `date` columns, `createdBy` NOT NULL). Tickets carry **both** pointers (`ticket-core.ts:40` `sprintId`, `:59` `cycleId`) with separate composite FKs and indexes. A third sprint-only surface exists (`build_events.sprint_scope_events`) with no cycle equivalent. Both controllers are live in one file (`execution/iterations.controller.ts:60-124` and `:127-183`). The frontend `/cycles` route is wired to the cycles API, but ~40 frontend files still use `sprintId`/`useSprints`, and the board reads **both** `?cycle=` and `?sprint=`. Consolidation needs a status-vocabulary reconciliation, a `created_by` fallback, a `tickets.cycleId` backfill, then a column/FK/index drop.

**P0 #7 — QA Bug.** `build.bugs` (`db/schema/build/qa.ts:138-185`) is a separate table with its own `bugNumber`, three dedicated enums, and ten columns the canonical ticket lacks (`stepsToReproduce`, `expectedResult`, `actualResult`, `environment`, `browserDevice`, `reopenCount`, `affectedReleaseId`, `fixedReleaseId`, `qaOwnerMembershipId`, `linkedTestCaseId`). The canonical identity is `ticketTypeEnum` BUG (`db/schema/common/enums.ts:17`). The two are **linked, not unified** (`bugs.linkedTicketId`). Consolidation requires deciding where the 10 QA-only fields live (BE-42/BE-43 favour an extension table over JSONB), mapping a 9-value `bug_status` onto project statuses and a 5-value severity onto a 4-value priority, then a per-row backfill with `bugNumber`/`ticketNumber` renumbering.

### Stale estimates corrected in both directions

The backlog's figures were wrong on four of five items scoped:

| Item | Backlog | Measured |
|---|---|---|
| P0 #6 | 10–15 d | credible, but **blocked** on a database |
| P0 #7 | 8–12 d | credible, but **blocked** on a database |
| P0 #8 | 8–12 d | ~15 min for the completable half; rest blocked |
| P1 #11 | 12–20 d | **~2–3 d** — bulk selection already exists, contrary to the backlog |
| P1 #13 | 5–8 d | **~1 d** — permission filtering, shortcuts and the unsaved guard all already exist |

### Unrelated finding, logged not acted on

`modules/build/core/dto/ticket.schemas.ts:62,108,158` accepts `"SUBTASK"` as a ticket type, but `ticketTypeEnum` (`common/enums.ts:17`) has no `SUBTASK` member. Whether `normalizeTicketType` folds it to `TASK` before the write is **UNVERIFIED**. Out of scope for #7; worth a look.

---

## TASK H — the census refutes the inherited claim, and it undercounted badly

**"2 VULNERABLE + 14 NEEDS-REVIEW" is wrong.** Across **321 handlers in 47 controller files**:

| Verdict | Handlers |
|---|---|
| **VULNERABLE** | **30** |
| CLOSED | 4 (the releases fix, re-cut on merge) |
| NEEDS-REVIEW | 111 |
| VERIFIED | 176 |

All 30 are nested `:projectId/:childId` routes whose service resolves the child by `(id, orgId)` with **no `projectId` predicate**. `orgId` is bound in all 30, so **none is cross-tenant** — the blast radius is cross-**project** within the caller's own organization, plus a broken 404 (a foreign-project id answers 200 instead of 404). Same class as the release defect closed in `d714ae8ff`.

### Coordinator verification

I did not accept the escalation on trust. Three read at source, from three different controllers, all unambiguous:

- `updateCustomState` (`project-resources.controller.ts:173`) declares `@Param("projectId", ParseIntPipe) _: number` — it **parses the route param and discards it**, then calls `this.members.updateCustomState(u, stateId, body)`.
- `updateMilestone` (`workspace.controller.ts:96`) calls `this.milestones.updateMilestone(u.orgId, milestoneId, body)`.
- `updateView` (`workspace.controller.ts:195`) calls `this.views.updateView(u.orgId, u.userId, viewId, body)`.

All three validate `:projectId` in their params schema, then ignore it.

### Clean results worth stating

- **All 321 handlers carry `JwtAuthGuard + PermissionGuard`** — zero BE-29 gaps.
- **No params schema omits a route param** — zero BE-14 violations.
- A vacuity hole was closed: `@Public` routes had been auto-VERIFIED without a read. All three were then read — hashed token, expiry and view-only enforcement, predicates re-asserted inside the UPDATE (TOCTOU-safe), RLS GUC, rate limiting — and are genuinely sound, now VERIFIED *by evidence*.

### Anti-vacuity

47 = 47 files and 321 = 321 handlers, each cross-checked against an independent grep. Self-test **29/29**, including anchor re-validation of every reviewed entry against source. A latent reproducibility bug was also fixed: `core.autocrlf=true` with no `.gitattributes` means a fresh checkout returns CRLF, so `--check` would have reported drift on an untouched tree.

### The anchors worked exactly as designed

The four release entries deliberately pinned the **old** lines so the report would fail loudly the moment the fix merged. It did — `--check` went red on `main` immediately after `d714ae8ff`. Re-cut to CLOSED against the fixed source, `--check` green (`a7c4b3b84`). The `removeTicket` entry now records what the fix actually found: the unqualified join delete bound no `orgId` at all, making it **cross-tenant**, not merely cross-project.

### Declared limitations

Two false-positive classes are deliberately left noisy: **create endpoints** (an INSERT scopes via `.values({orgId})`, not a predicate) and **parent checks written in JavaScript** (`projects-ticket-links.service.ts` fetches by `(id, orgId)` then rejects with `if (ticket.projectId !== projectId)` — correctly bound, invisible to a SQL binder). The binder was **not** taught to accept the JS form: that heuristic would also mark genuinely unbound code as bound, and a false VERIFIED hides a vulnerability while a false NEEDS-REVIEW only costs a read. Also unmodelled: RLS, permission-key semantics, dynamically registered routes.

**Of the 111 NEEDS-REVIEW, 102 have no lead at all** — nested routes with a clean static pass, held there only by the policy that a static reader may not certify parent binding alone. They are uncertified, not suspected.

---

## TASK B — N-11 closed, zero weak cold-load gates

**The inherited figure of 63 was wrong. The true original count was 49**, of which an earlier pass had closed 24, leaving **25**. All 25 are now closed and all 83 Build pages pass their own canonical pattern.

Two distinct senses of "weak", both now enforced:

- **Structural** — 25 routes never passed their own pattern, so they inherited only the layout's `/build`.
- **Semantic** — only **6** resolved to a genuinely weaker permission key: `budget`, `cycles/[cycleId]`, `timeline` and `webhooks` (downgraded to `build:view`), plus `/build/roadmap` and `/build/templates`, which had **no server gate at all**.

### Decisions worth recording

- **Timeline** was the only real refactor: its client body moved verbatim to `features/build/timeline/project-timeline-page.tsx` so the route could become a server component. The other 24 were already server components.
- **`/build/access` keeps BOTH gates.** Replacing its `requirePermission("build:access:view")` broke `module-access-route-invariants.test.ts`, a cross-module spec pinning that exact source line across all 13 access pages. `enforceRouteAccess` was added **alongside** rather than weakening a shared policy spec; `getServerAccessResult` is `react.cache()`-wrapped, so the second call is free.
- `wiki` and `wiki/[pageId]` were on bare `requireSession()` — now strictly stronger.

### Mutation proof — two independent mutations, both bite

| Mutation | Result |
|---|---|
| `/build/[projectId]/timeline` pattern weakened to `"/build"` | census EXIT 1 (`1 of 83 … never pass their own canonical pattern`); jest names `missing=[build:tickets:view]` |
| brand-new ungated page added | census EXIT 1, names the file |
| both restored | `PASS 83 … (0 weak cold-load gates)`, jest 4/4 |

Note the division of labour: the jest census does **not** catch a brand-new ungated page, because an unregistered route resolves to the same key as `/build` and so is not *semantically* weaker. The structural census script is what blocks it.

### A worktree artefact that looked like a failure and was not

`check:build-execution-plan` failed in the worktree only. It asserts a literal containing `\n` against `docs/specs/build/sidebar/02-scope-directory-prd.md`. Coordinator-verified: the file is byte-identical to HEAD, but `git ls-files --eol` reports `w/crlf` in the worktree versus `w/lf` in the main checkout — `git worktree add` wrote CRLF. The branch touches no docs at all. **On `main` after the merge the gate passes, EXIT 0.**

### Second backend resolver found — extends a known environment trap

`frontend/test-support/backend-checkout.ts` is a **second** resolver that **ignores `STREAMLINE_BACKEND_ROOT` entirely**, probing only `<checkout>/backend`, `../streamlineos-backend`, and `<prefix>-frontend` → `<prefix>-backend`. So the documented env-var fix covers `lib/test-support/backend-path.ts` but **not** this one, and two inventory suites fail in any worktree whose name matches none of those patterns. Not caused by N-11.
