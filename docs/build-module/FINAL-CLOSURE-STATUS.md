> **HISTORICAL — point-in-time record, 2026-09-21**
> The environment facts inside this document — including `main = 4b41bb510, in sync with origin/main` and all commit SHAs, route counts, and migration states — are point-in-time and no longer current. For current release status see [RELEASE-STATUS.md](./RELEASE-STATUS.md).

---

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
| J — authz fixes: 15 ticket handlers | **DONE** — merged to backend `main` | agent + coordinator, `build/closure-j-tickets` | 33 files incl. 2 new specs (44 tests) | build/core 111 suites / 589 tests (from 109/545); 255 suites / 1992 across the blast radius; `typecheck` 0, `typecheck:test` 0 | — |
| K — authz fixes: 9 execution handlers | **DONE** — merged to backend `main` | agent + coordinator, `build/closure-k-execution` | 11 files incl. 1 new spec | 191 suites / 1367 tests; `typecheck` 0, `typecheck:test` 0 | — |
| L — authz fixes: 6 remaining handlers | **DONE** — merged to backend `main` | agent + coordinator, `build/closure-l-misc` | 12 files incl. 2 new specs | 192 suites / 1366 tests; `typecheck` 0, `typecheck:test` 0 | — |
| A — Release nested-resource authorization | **DONE** — merged to backend `main` as `d714ae8ff` | agent + coordinator, `build/closure-a-releases` | `projects-releases.service.ts` (7 lines), `projects-releases-cross-project-binding.spec.ts` (new, 388 lines) | 13/13 new; 109 suites / 545 tests green in `src/modules/build/core`; `typecheck` 0, `typecheck:test` 0 | — |
| B — N-11 cold-load route gates | **DONE** — merged to root `main` | agent + coordinator, `build/closure-b-n11` | 52 files: 49 `page.tsx`, 1 new feature module, 1 new census spec, `scripts/build-route-census.mjs` | census PASS **0 weak cold-load gates**; self-test 9 PASS; `lib/rbac/route-access` 9 suites / 223 tests; `typecheck:web` 0; `check:build-execution-plan` 0 | — |
| C — P0 #6 Sprint/Cycle | **BLOCKED** — not dispatched | scoped, read-only | none | none | Consolidates **two live database identities** (`sprints` and `cycles` tables, both live; tickets carry both `sprintId` and `cycleId` with separate composite FKs). Needs a schema migration **and** a row-level data backfill. No non-production database exists. |
| D — P0 #7 QA Bug lifecycle | **BLOCKED** — not dispatched | scoped, read-only | none | none | `build.bugs` is a separate table with 10 columns the canonical ticket lacks and a 9-value status enum that maps onto nothing. Needs a schema migration **and** a row-level backfill. No non-production database exists. |
| E — P0 #8 residual | **DONE (fixture half)** — merged to backend `main` as `a684fed0f`. Item P0 #8 itself remains **BLOCKED** | agent + coordinator, `build/closure-e-p08` | `build-project-scoped-lists-404.spec.ts` (+24, spec only) | 18/18; `project-access-404` 4/4; `typecheck` 0, `typecheck:test` 0; both set-null self-tests green | The 286 composite SET NULL constraints need a real database |
| F — P1 #11 Issues explorer residual | IN_PROGRESS | agent, `build/closure-f-issues` | — | — | — |
| G — P1 #13 command palette residual | **DONE** — merged to root `main` as `cf7df1e07` | agent + coordinator, `build/closure-g-palette` | 9 files (`command-palette-dialog.tsx`, `use-global-search.ts`, `sidebar-nav-items.ts`, `build-nav-groups.ts`, 3 new specs, 2 mock updates) | 339 passed / 343; the 4 failures are pre-existing `shell-keyboard.test.tsx`, confirmed identical on main; `typecheck:web` 0 | — |
| H — Controller census | **DONE** — merged, re-cut twice as fixes landed (`5400534df`) | agent + coordinator, `build/closure-h-census` | `scripts/build-authorization-census.mjs` (new, 1958 lines), `docs/build-module/authorization-census.{md,json}`, `package.json` | self-test 29/29; `--check` green; **VULNERABLE 30 → 0** | — |
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

---

## Authorization closure — all 30 findings closed

`VULNERABLE 30 → 0`. Final census: **CLOSED 34 · NEEDS-REVIEW 111 · VERIFIED 176 · total 321**, self-test 29/29, `--check` green.

| Batch | Handlers | Merge |
|---|---|---|
| K — execution | 9 (sprints, modules, milestones, intake, views) | `build/closure-k-execution` |
| L — misc | 6 (custom states, custom fields, webhooks, time entries) | `build/closure-l-misc` |
| J — tickets | 15 (associations, checklists, comments, tickets) | `build/closure-j-tickets` |

The three batches were split so no two agents shared a service file — four ticket controllers share `ProjectsTicketSubresourcesService`, so they had to be fixed atomically. That held: when K and L merged, **exactly 15 anchors went stale and no others**, which independently confirms neither agent strayed.

### Findings sharper than the census recorded

- **`updateCustomState`/`deleteCustomState` were a genuine cross-project WRITE, not a broken 404.** The route carries `@RequirePermission("build:manage")` and `assertCanManageProject` returns early at `projects-members.service.ts:77` on exactly that permission — so the re-derived project check was **unreachable for every caller who passed the guard**. The discarded `projectId` was the only thing that should have stopped the write.
- **`logTicketTime`** blocks a plain project-A member, but org-wide `build:manage` short-circuits the membership check: such a holder could log time onto any ticket in the org via any project's URL, with the entry landing under the *ticket's* project.
- **`deleteModule` had a tenth, unlisted gate.** Its ticket detach ran before the delete bound only to `(moduleId, orgId)`, staging `moduleId = NULL` across another project's tickets before the 404 threw. Statement-level rather than observable, but now bound.
- **`removeLabel` is under-called** in the census as NEEDS-REVIEW; it has the identical defect and was fixed as a consequence of the shared helper.

### Schema constraint that shaped the fix

`ticket_checklists`, `ticket_checklist_items`, `ticket_watchers`, `ticket_attachments` and `ticket_label_mappings` have **no `project_id` column** (`db/schema/build/ticket-collaboration.ts`). Those are bound through the parent join, not by inventing a column — coordinator-verified. `tickets.projectId` is nullable, so a project-less ticket fails the match: fail-closed, which is correct.

### Gates that do not bite — reported, not counted

Both J and L disclosed weaknesses rather than inflating coverage:

- **L's first test pass was worthless for four gates** (two defence-in-depth write bindings, two `assertProjectInOrg` calls). It rebuilt them with real bites — TOCTOU fixtures moving the row between lookup and write, and soft-deleted-project cases a `projectId` predicate alone cannot see. All 12 then bit.
- **J: 10 of 12 bite independently.** The item→checklist binding exists on both the pre-read and the write and each masks the other — 0 failures individually, **2 as a pair**. The `ticketId` predicate on the checklist write is fully redundant with `requireChecklistInTicket` — **0 failures; it is belt-and-braces, not coverage.**
- **K deliberately avoided defence-in-depth** on `updateSprint`/`updateIntake`: binding the follow-on write as well would make the primary gate un-mutatable, so the proof would be worthless.

### Coordinator re-proofs

Each batch was independently re-proved rather than accepted:

| Gate | Result |
|---|---|
| `updateMilestone` (`workspace.service.ts:68`) | 1 of 151 fails; restored 151/151 |
| `updateCustomState` (`projects-custom-states.service.ts:171`) | 1 of 25 fails; restored 25/25 |
| `requireTicket` (`projects-ticket-subresources.service.ts:271`) | **5 of 589 fail**; restored 589/589 |

**Two of my own mutations proved nothing and had to be redone** — one silently failed to apply, and another hit `createCustomState` (a duplicate-name pre-check, an explicitly declared false-positive class) instead of `updateCustomState`. A mutation that does not apply is indistinguishable from a gate that does not bite; always assert the edit landed.

### One false VULNERABLE corrected

`deleteChecklist` was already gated via `requireChecklistInTicket` at `projects-ticket-checklists.service.ts:185`, but its anchor — `/eq\(ticketChecklists\.id, checklistId\),/` — was broad enough to keep matching the DELETE's own where-clause. It never went stale, so it was never re-cut and sat as VULNERABLE while being fixed. **An over-broad anchor fails silently in the safe-looking direction.**

### Arity blind spot worth remembering

`confirmable-actions.spec.ts:432` asserted the `addComment` call shape with `toHaveBeenCalledWith` (untyped varargs), so an arity change **slipped past `typecheck:test`** and only jest caught it. BE-138 says typecheck is the only gate that sees arity — that is true of signatures, not of varargs matchers.

### Review note carried forward

`updateField` and `logTicketTime` now take adjacent same-typed `number` params, which typecheck cannot protect against a caller swap. The specs use distinct values per role so a swap fails loudly, but the call sites deserve a second pair of eyes.

---

# Final closure phase — 2026-09-22

## Task board

| Task | Status | Files changed | Tests | Blocker |
|---|---|---|---|---|
| 1. P0 #6 Sprint/Cycle | **BLOCKED** (design DONE) | `docs/build-module/sprint-cycle-consolidation-design.md` | typecheck 0; 18 suites / 157 tests | A non-production **PostgreSQL 18** |
| 2. P0 #7 QA Bug | **BLOCKED** (design DONE) | `docs/build-module/qa-bug-consolidation-design.md` | typecheck 0; 6 suites / 77 tests | A non-production PostgreSQL |
| 3. P0 #8 residual | **DONE (static)** · DB half BLOCKED | new gate `check:set-null-migration-text` + `docs/build-module/p08-composite-fk-status.md` | 10 self-tests; 195 suites / 1442 tests | `SET_NULL_GATE_DATABASE_URL` |
| 4. Migration chain | **DONE** — CI gate repaired and green | `1090a_*` rename, journal, rollback, `verify-migration-chain.mjs` | `check:migration-chain` **PASS** | 1141/1142 stay unapplied |
| 5. Controller census | **DONE** | none (verification only) | self-test 29/29; `--check` green | — |
| 6. Documentation | **DONE** | this file + `IMPLEMENTATION-STATUS.md` | — | — |

## The finding that mattered most: CI was red

`check:migration-chain` **failed with exit 1 on `main`**, and `ci.yml:643` runs it on every push and PR. It had been red on both known defects. Direct evidence, no database, no `.env`:

```
FAIL  migration chain has 2 issue(s):
  (b) DUPLICATE PREFIX  1090: 1090_inv_quality_hold_stock_grain, 1090_subscription_purchases
  (c) TIMESTAMP REGRESSION  0619_... (when=1787895425277) <= 0271a_waitlist_admission (when=1803000010178)
```

Its self-test passes 24/24, so the gate was not vacuous — it was correctly reporting real defects that nobody could clear.

**1090 was repaired, not suppressed.** Renamed to `1090a_` with its journal tag and rollback file. The preconditions were each verified rather than assumed: the ledger stores only `(hash, created_at)` with **no tag column** (`run-pending-migrations.mjs:86,91`), so no rename can orphan a row; **neither 1090 is sealed**, checked via the `tag` recorded *inside* each seal entry; a rename changes neither bytes nor `when`; and insert-order holds because `...299` sits between `...168` and `1091`'s `...300`. The baseline's written rationale for keeping both names turned on 1090 being sealed — it is not, and it was the only un-baselined collision of **15** (not the 80 previously recorded).

**The 0271a to 0619 regression was baselined**, because it genuinely cannot be repaired from a checkout: restamping requires a matching `UPDATE drizzle.__drizzle_migrations` on every database where `0271a` is applied, and half of one atomic repair must not be performed. It is inert because ordering is by **array position**, not `when`. Quantified blast radius if an applier ever reverted to watermark selection: **385 of the 561 later entries would be stranded**. `check:watermark-free` is the only guard, and it is in CI (`ci.yml:649-651`).

**Renaming broke the rollback pairing** — rollback files are keyed by tag. Caught by `check:migration-rollback`, fixed by renaming the `.down.sql` to match. Worth remembering before the next rename.

## P0 #8: from blocked to 246 of 286 verified

Drizzle's `UpdateDeleteAction` is a five-member string union with **no column-list parameter**, so the schema cannot express what migration 1142 changes. But the migration *text* can, and 285 of 286 constraint names appear in it. A new hermetic gate, `check:set-null-migration-text`, now verifies **246 of the 286** with no database at all — including 1142's own correctness, despite it being unapplied.

**The 286 are not a list but a rule:** all are arity-2 `(tenant_col NOT NULL, single nullable pointer)`; the tenant column is member 0 in 286/286. That bounds the risk sharply — a bare list raises **23502 and aborts the parent DELETE loudly**; the silent-corruption case requires a *second* nullable member, which is structurally impossible here. Tenant isolation is never at stake; the defect *prevents* `org_id` being nulled.

### Two genuine live defects found, coordinator-verified at source

| Constraint | Migration | Shape |
|---|---|---|
| `fk_inv_sales_orders_channel_id_org` | `0580a:129` | `("org_id","channel_id")` with bare `ON DELETE set null` |
| `fk_inv_stock_adjustments_scrap_location_id_org` | `0545a:73` | `("org_id","scrap_location_id")` with bare `ON DELETE SET NULL` |

Both are the exact class 1142 repairs. They are **not yet fixed** — a repair migration is the natural next step.

Also found: the existing catalog gate has a **live blind spot** — it keys on an untruncated 77-character constraint name, but Postgres truncates at 63, so `check-set-null-column-lists.ts:304` silently skips it *even with a database*.

## Unresolved conflict: the PostgreSQL floor

The two design agents disagreed, and this decides what database to provision.

- **PG18** — `0619_chain_creates_what_production_has.sql` contains **648** occurrences of `ALTER TABLE ... ADD CONSTRAINT "<name>" NOT NULL <column>`, which is PG18-only named-NOT-NULL syntax. A prior session recorded a PG17 cold build dying at **`crm_org_party_map`**, which matches line 3333 exactly — same table.
- **PG15** — the newest *feature* is `ON DELETE SET NULL (column_list)`, and CI's only Postgres service is `pgvector/pgvector:pg16`.

These reconcile only partly: the `db-gates.yml` header records it was measured green at **journal head 672/672**, and head is now **903**, so cold-replay-to-head on pg16 is **unestablished**. **Provision PG18** — it is what production runs (Aurora 18.4) and is safe under either reading. The floor remains formally undeclared; recommended: `engines.postgresql: ">=18"`, a boot assertion in `pool.config.ts`, and a README line.

## Corrections to earlier claims in this ledger

- **The `23502` hazard recorded for migration 1141 is NOT reachable.** All three `insert(projects)` sites take `pmWorkspaceId` from `resolveWorkspaceIdForWrite`, typed `Promise<string>`, which returns a default workspace or throws (`projects-provision.service.ts:74`). No write path can produce a NULL. The real consequence of dropping `.notNull()` is narrower: it removed the only **compile-time** guard, so a future insert omitting the field would no longer be caught by `typecheck`. Latent, not live. **1141 is therefore not urgent**, and it unblocks the standalone-project feature without delivering it — no write path can yet produce a NULL.
- **"One of 80 duplicated prefixes" was wrong.** Both gates define a prefix as the first underscore-delimited segment, so `0540` is distinct from `0540a`. Under that definition there are **15**, of which 14 were baselined.
- **`check:migration-discipline` cannot fail on the regression** — line 752 downgrades every `journal-order` finding to a NOTE before the baseline is consulted, so its ~60 entries suppress printing only.
- **`sprint_scope_events` has no application writer at all** — its only writer is the one-shot backfill inside `0156_sprint_scope_events.sql:105-135`. Consequently burnup silently degrades to `burnupFromCurrentMembership` for every sprint created since. Filed as P1, not fixed here.
- **`bugs.qa_owner_membership_id` is written by nobody** (`bugs.service.ts:94,161` write only `qaOwnerId`); populated once by `0908` and NULL ever since, while `idx_bugs_org_qa_owner_membership` indexes a mostly-NULL column.
- **BE-65 CONCURRENTLY guidance contradicts its own enforcing gate** — `check-migration-discipline.mjs:569-574` rejects `CREATE INDEX CONCURRENTLY` outright, and `BASELINE_CONCURRENTLY` is empty. `CLAUDE.md:90` should be reconciled.
- **`SUBTASK` is not a live defect** — `normalizeTicketType` folds it to `TASK`. But the read path survives only on an undocumented `::text` cast (`projects-tickets-read.service.ts:264`), nothing pins it, and `createTicketSchema:158` still publishes `SUBTASK` in the OpenAPI enum, so clients get a silent downgrade rather than a 400.
