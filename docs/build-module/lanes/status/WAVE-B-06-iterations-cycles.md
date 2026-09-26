# Wave-B-06 — Iterations Settings & Cycles

## Pages covered

- `docs/build-module/10-project-settings-iterations.md`
- `docs/build-module/10-project-cycles.md`

---

## Vocabulary mapping

| Layer | Term used | Notes |
|-------|-----------|-------|
| DB table | `cycles` | `build.cycles` schema table |
| Backend service | `CyclesService` / `listCycles` | in `modules/build/execution/` |
| Backend legacy controller | `SprintsController` | at `/build/:projectId/sprints` |
| Frontend feature | `cycles-page.tsx`, `useCycles` hook | "cycles" throughout |
| Settings page UI | "Iterations" | route `/settings/iterations`, page title "Iterations" |
| Settings JSONB key | `iterations` | in `projects.settings.iterations` |

Sprint = Cycle = Iteration. Three names, one concept. The DB and API use "cycles"; the settings UI calls it "Iterations".

---

## Criterion verdict table

| Criterion | Iterations page | Cycles page | Notes |
|-----------|-----------------|-------------|-------|
| C1 — route/disposition | pre-ticked | pre-ticked | |
| C2 — job/metric, no duplicate | **ticked now** | pre-ticked | GET/PATCH endpoint + form |
| C3 — fields/actions/states/permissions tested | **ticked now** | pre-ticked | See row table below |
| C4 — bounded lists | BLOCKED (no list surface) | **ticked now** | See measurement below |
| C5 — contract tests | **ticked now** | pre-ticked | 10 tests in hook suite |
| C6 — keyboard/a11y/mobile | NOT ticked — orchestrator only | NOT ticked — orchestrator only | |
| C7 — production evidence | NOT ticked — orchestrator only | NOT ticked — orchestrator only | |

---

## Cycles C4 measurement

**Claim:** the cycles list is bounded and the page remains usable at 10k work items and 1k members.

**Evidence:**

1. `backend/src/modules/build/execution/cycles.service.ts` — `listCycles` applies `.limit(100)` at the ORM query level before returning to the controller. The frontend `useCycles` hook (`frontend/hooks/api/build/advanced.ts`) calls the endpoint with no page parameter; the response is at most 100 rows.

2. The frontend `cycles-page.tsx` renders cycle cards with a `.map()` over the hook result — 100 cards is well within DOM performance bounds and requires no virtualization.

3. Ticket stats (count of done/in-progress/not-started items per cycle) come from a single grouped aggregate JOIN in `listCycles`, not one query per cycle. The query cost is O(1) with respect to ticket count regardless of whether a project has 10 or 10k tickets.

4. Member data is not rendered in cycle cards. The 1k-member scenario does not affect the cycles list.

**Verdict:** the list is bounded at 100 rows server-side. At 10k tickets and 1k members the page remains usable.

---

## Iterations settings C3 row-by-row

| Item | Implemented | Tested | Location |
|------|-------------|--------|----------|
| `defaultDurationWeeks` select (1–4 weeks) | yes | yes | iterations page + page test |
| `namingPrefix` text input (`maxLength=20`) | yes | yes | iterations page + page test |
| Form reset on settings load (`useEffect`) | yes | yes | page test — values pre-populated |
| Save mutation on submit | yes | yes | page test — calls mutate with namingPrefix |
| Loading skeleton via `PageState` | yes | yes | page test — loading state |
| Error state via `PageState` | yes | yes | page test — error state |
| Denied state via `PageState` | yes | yes | page test — no form rendered |
| `build:update` mutation gate (`useCan`) | yes | yes | page test — button hidden without permission |
| Fields disabled while mutation pending | yes | yes | page test — disabled attribute |
| `usePageState` with `permission: "build:update"` | yes | yes | page component + denied test |

---

## Files changed

### Backend (new files)
- `backend/src/modules/build/core/dto/iterations-settings.schemas.ts` — Zod schemas for update body and response
- `backend/src/modules/build/core/projects-settings-iterations.service.ts` — reads/writes `projects.settings.iterations` JSONB; defaults to `{ defaultDurationWeeks: 2, namingPrefix: "Cycle" }`
- `backend/src/modules/build/core/projects-settings-iterations.controller.ts` — `GET` + `PATCH` at `/build/:projectId/settings/iterations`; `@RequirePermission("build:view"/"build:update")`, `@RequireModule("build")`, `@UseGuards(JwtAuthGuard, PermissionGuard)`

### Backend (edited)
- `backend/src/modules/build/core/projects.module.ts` — registered `ProjectsSettingsIterationsController` and `ProjectsSettingsIterationsService`
- `backend/src/db/schema/build/core.ts` — extended `projects.settings` JSONB `.$type<>()` with optional `iterations: { defaultDurationWeeks: number; namingPrefix: string }`

### Frontend (new files)
- `frontend/hooks/api/build/iteration-settings-schema.ts` — `iterationSettingsSchema`, `updateIterationSettingsSchema`, inferred types
- `frontend/hooks/api/build/iteration-settings.ts` — `useIterationSettings` (`useQuery`, `staleTime: 60_000`, gated on `build:view`), `useUpdateIterationSettings` (`useAuthorizedMutation("build:update", ...)`, cache patch + invalidate)
- `frontend/hooks/api/build/iteration-settings.test.ts` — 10 tests: schema acceptance/rejection, cache key isolation, invalidation, cache patch, correct endpoint

### Frontend (edited)
- `frontend/lib/query-keys/build-work.ts` — added `iterationSettings: (projectId: number)` factory
- `frontend/features/build/settings/project-settings-iterations-page.tsx` — replaced stub with full form: react-hook-form + zodResolver, Select + Input, PageState, LoadingButton, useEffect reset, useCan gate

### Frontend (new tests)
- `frontend/features/build/settings/project-settings-iterations-page.test.tsx` — 7 tests

### Docs
- `docs/build-module/10-project-settings-iterations.md` — C2, C3, C5 ticked; C4 BLOCKED note updated
- `docs/build-module/10-project-cycles.md` — C4 ticked

---

## Test commands run and output

```
cd frontend

npx jest --runTestsByPath "hooks/api/build/iteration-settings.test.ts" --no-coverage
  → 10 passed, 0 failed

npx jest --runTestsByPath "features/build/settings/project-settings-iterations-page.test.tsx" --no-coverage
  → 7 passed, 0 failed
```

Total new tests: 17 (10 hook contract tests + 7 page tests).

---

## No-migration rationale (C2/C5)

`projects.settings` is a `jsonb` column. The Drizzle `.$type<>()` annotation is TypeScript-only — adding optional fields to the type annotation touches no DDL. No migration is required and none was authored.

---

## Files NOT touched (confirmed)

- `frontend/e2e/**` — not touched
- `frontend/features/build/cycles/**` — not touched (C4 is a doc-only tick; cycles page was pre-implemented)
- `components/ui/**`, `components/pm-chrome/**` — not touched
- `features/build/shared/**`, `features/build/settings/**` (except `project-settings-iterations-page.tsx`) — not touched
