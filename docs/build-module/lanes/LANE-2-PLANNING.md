# Lane 2 — Planning: goals, roadmap, portfolios, programs, milestones, releases

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1245–1249**. Status file: `status/LANE-2-STATUS.md`. Requests: `requests/LANE-2.md`.

## Your page specs (8 — 56 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-goals.md` | `/build/goals` |
| `docs/build-module/10-goals-goal.md` | `/build/goals/[goalId]` |
| `docs/build-module/10-roadmap.md` | `/build/roadmap` |
| `docs/build-module/10-portfolios.md` | `/build/portfolios` |
| `docs/build-module/10-portfolios-portfolio.md` | `/build/portfolios/[portfolioId]` |
| `docs/build-module/10-programs.md` | `/build/programs` |
| `docs/build-module/10-project-milestones.md` | `/build/[projectId]/milestones` |
| `docs/build-module/10-project-releases.md` | `/build/[projectId]/releases` |

## Territory

**Frontend features:** `frontend/features/build/{goals,roadmap,portfolios,programs,milestones,releases}/**`

**Frontend routes:** `frontend/app/(authenticated)/build/{goals,roadmap,portfolios,programs}/**`, `frontend/app/(authenticated)/build/[projectId]/{milestones,releases}/**`

**Frontend hooks:** `frontend/hooks/api/build/{roadmap,roadmap-schema,roadmap-schema.test,roadmap-cache-scope.test,portfolios,portfolios-schema,portfolios-list-contract.test,programs,programs-list-contract.test,milestones,releases}.*` plus any `goal*` hook file you locate that no other brief names.

**Backend:** `backend/src/modules/build/portfolios/**`, and in `backend/src/modules/build/core/`: `projects-roadmap.*`, `roadmap-accounts.ts`, `roadmap-delivery.ts`, `roadmap-prioritization.ts`, `roadmap-references.ts`, `projects-releases.*`, `projects-burnup.util.ts`, `projects-velocity-report.ts`, `projects-critical-path.util.ts`, `build-release-published-consumer.service.ts`, plus each file's `*.spec.ts`, plus the goals controller/service wherever it lives inside `modules/build` (locate by grep; if another brief names it, file a request instead).

## Lane-specific hazards, measured

- **Roadmap search migrations are already applied and verified in production:**
  `1185_roadmap_search_id_probe` and `1186_project_programs_list_indexes` (historically recorded as
  `1177`/`1178`; hashes match). Both search functions are `SECURITY DEFINER`, executable by
  `streamline_app`, scoped through `app.current_org_id()`, and the cross-tenant probe returned 0.
  Do not re-apply, re-create, or "fix" these. Cite them.
- **Burnup is the quiet-failure surface.** `sprint_scope_events` was renamed to
  `build_events.cycle_scope_events`, but **every constraint and index on it still carries a
  `sprint_scope_events_*` name** — `ALTER TABLE … RENAME TO` does not rename them and the Drizzle
  declarations match the live names exactly. That is correct, not drift. A real mismatch here
  surfaces as `42P01`, not as a wrong number.
- `cycles.legacy_sprint_id` still exists as a column and nothing reads it. Left deliberately. Do
  not read it, do not drop it.
- Roadmap RICE scoring and CRM tier/revenue weighting already exist in
  `core/projects-roadmap.service.ts` and `core/roadmap-accounts.ts`; `1204_build_feedback_account_snapshots.sql`
  is applied to production. P1-8's only open gap is browser evidence with a managed-product fixture —
  which is Lane 3's spec set, not yours.
- Portfolio and managed-product list services reject malformed cursors with a bounded `400`, but the
  **currently deployed** older API still treats that input as page one. Your contract tests assert
  the repo, not production.
- Goal list and detail responses resolve owner membership IDs to tenant-scoped user projections in
  one batch. A hand-built actor omits `membershipId` — do not construct one in a test double.
- Roadmap tab pagination writes the shared `cursor` parameter through the **request-only**
  `frontend/features/build/shared/use-build-list-filters.ts`.
- `selectDistinct` requires every `ORDER BY` column to be projected. Portfolio and program rollups
  are where that bites.
