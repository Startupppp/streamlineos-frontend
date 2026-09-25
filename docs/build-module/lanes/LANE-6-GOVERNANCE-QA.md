# Lane 6 — Governance & QA

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1265–1269**. Status file: `status/LANE-6-STATUS.md`. Requests: `requests/LANE-6.md`.

## Your page specs (9 — 63 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-project-qa.md` | `/build/[projectId]/qa` |
| `docs/build-module/10-project-qa-runs-run.md` | `…/qa/runs/[runId]` |
| `docs/build-module/10-project-incidents.md` | `…/incidents` |
| `docs/build-module/10-project-incidents-incident.md` | `…/incidents/[incidentId]` |
| `docs/build-module/10-project-risks.md` | `…/risks` |
| `docs/build-module/10-project-decisions.md` | `…/decisions` |
| `docs/build-module/10-project-approvals.md` | `…/approvals` |
| `docs/build-module/10-project-reports.md` | `…/reports` |
| `docs/build-module/10-project-budget.md` | `…/budget` |

## Territory

**Frontend features:** `frontend/features/build/{qa,incidents,governance,reports,analytics}/**`, plus the budget and project-approvals surfaces reached only from your routes.

**Frontend routes:** `frontend/app/(authenticated)/build/[projectId]/{qa,incidents,risks,decisions,approvals,reports,budget}/**`

**Frontend hooks:** `frontend/hooks/api/build/{qa,qa-schema,incidents,incidents-schema,governance,governance-schema,reports,reports-schema,reports-schema.test}.*`, plus any `budget*` / `analytics*` hook file no other brief names.

**Backend:** `backend/src/modules/build/{qa,incidents,governance}/**`, and in `backend/src/modules/build/core/`: `projects-budget.*`, `projects-reports.*`, `projects-report-limits.ts`, `projects-analytics.service.ts`, `project-resources.controller.ts`, plus each file's `*.spec.ts`.

> Organization-level `/build/approvals` and `backend/src/modules/build/approvals/**` are **Lane 1's**.
> You own the *project-scoped* approvals page only. Where they share a service, file a request.

## Lane-specific hazards, measured

- **`build.bugs` and `test_run_results.linked_bug_id` are dropped.** The QA Bug contract
  verification passed all 14 checks — **over an empty table** (`build.bugs` had 0 rows), so that
  evidence is vacuous for behaviour. No non-test `from(bugs)`, `insert(bugs)`, `update(bugs)` or
  `delete(bugs)` remains and it must stay that way. A surviving Drizzle declaration for a dropped
  column is a query against nothing — that is exactly how `test-runs.service.ts` broke on
  `linked_bug_id`.
- QA Run detail with fixture ID `1` renders its recoverable state without console errors; no
  production fixture rows exist for QA runs, incidents or forms, so only parent empty states were
  exercised on 2026-09-25.
- **Reports are the quiet-failure class in your lane.** A wrong contract renders as an **empty
  state**, not an error, and a `500` in a response-contract test usually means the mock drifted.
  Every report criterion needs a positive control that actually renders rows.
- Reports have their own cache tier (2 min) distinct from lists (30 s) and live queues (0–15 s).
  Criterion 5's cache-key claim must name the tier it asserts.
- A report-revision trigger reaches specific tables; a pending migration that removes one of them
  breaks it silently. The integrity script is
  `node src/scripts/build-performance/build-report-revision-integrity.mjs` (frontend), exit 0 —
  it reads files, not a database, so you may run it. Record its exact output.
- `check:gated-reads` reports **two unrelated HR recruitment routes** and `check:named-handlers`
  **one Wiki closure**. Neither is Build-owned. Do not "fix" them and do not count them against
  your lane.
- Analytics: the org-wide executive-brief Build health summary now computes its five scalar outputs
  in **one** tenant-scoped SQL aggregate, and resource-allocation user hydration is capped to the
  cursor page (backend `121c1727e`, `bb1f175fb`; 32/32 focused tests). Production-shaped EXPLAIN
  evidence is open — and you may not open a database connection, so that stays a request.
- **`EXPLAIN` must be read as `streamline_app`.** The admin role is `BYPASSRLS`, so an owner-role
  plan is not the plan production runs. RLS defeats GIN trigram indexes, an `OR` with a semijoin
  defeats indexes, and a partial index cannot serve an `OR` with an outside branch.
- Incidents already return a validated detected-at/ID cursor page and accept the legacy array
  response during rollout. Do not remove the legacy acceptance without a deploy-ordering plan.
- Governance params have a schema self-test (`build-governance-params-schema.spec.ts`).
  `.strict()` param schemas must declare **every** route param.
