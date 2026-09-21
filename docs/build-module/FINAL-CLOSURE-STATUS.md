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
| A — Release nested-resource authorization | **DONE** — merged to backend `main` as `d714ae8ff` | agent + coordinator, `build/closure-a-releases` | `projects-releases.service.ts` (7 lines), `projects-releases-cross-project-binding.spec.ts` (new, 388 lines) | 13/13 new; 109 suites / 545 tests green in `src/modules/build/core`; `typecheck` 0, `typecheck:test` 0 | — |
| B — N-11 cold-load route gates | IN_PROGRESS | agent, `build/closure-b-n11` | — | — | — |
| C — P0 #6 Sprint/Cycle | TODO | scoping in flight | — | — | awaiting scope |
| D — P0 #7 QA Bug lifecycle | TODO | scoping in flight | — | — | awaiting scope |
| E — P0 #8 residual | TODO | scoping in flight | — | — | awaiting scope |
| F — P1 #11 Issues explorer residual | TODO | scoping in flight | — | — | awaiting scope |
| G — P1 #13 command palette residual | TODO | scoping in flight | — | — | awaiting scope |
| H — Controller census | IN_PROGRESS | agent, `build/closure-h-census` | — | — | — |
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
