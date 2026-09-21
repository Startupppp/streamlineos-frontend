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
| A — Release nested-resource authorization | IN_PROGRESS | agent, `build/closure-a-releases` | — | — | — |
| B — N-11 cold-load route gates | IN_PROGRESS | agent, `build/closure-b-n11` | — | — | — |
| C — P0 #6 Sprint/Cycle | TODO | scoping in flight | — | — | awaiting scope |
| D — P0 #7 QA Bug lifecycle | TODO | scoping in flight | — | — | awaiting scope |
| E — P0 #8 residual | TODO | scoping in flight | — | — | awaiting scope |
| F — P1 #11 Issues explorer residual | TODO | scoping in flight | — | — | awaiting scope |
| G — P1 #13 command palette residual | TODO | scoping in flight | — | — | awaiting scope |
| H — Controller census | IN_PROGRESS | agent, `build/closure-h-census` | — | — | — |
| I — Migration readiness | IN_PROGRESS | agent, `build/closure-i-migrations` | — | — | no database |

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
