# G-03 — Teams Capacity (WAVE)

## Box 3 status

Box 3 is **not yet ticked** pending migration 1315 being applied to production.

**DEPLOY ORDERING RISK:** code selecting `capacity` from `build.project_teams` ships before migration 1315 adds that column. Railway deploys every backend push. Until migration 1315 is applied, the `GET /build/teams` and `GET /build/teams/:teamId` endpoints will raise `42703` (column does not exist) and 500 on every response. **Migration 1315 must be applied before the backend code that reads `capacity` is deployed.**

---

## Capacity — decision and justification

**`capacity` is a per-team nullable integer stored on `build.project_teams`.** It represents the team's configured maximum headcount (e.g., "this team is sized for 10 people"). Semantics: `NULL` = no limit configured.

This is distinct from the workload capacity model in `backend/src/modules/build/execution/capacity.lib.ts`, which computes dynamic per-member utilisation within a date window from timesheets and leave data. That model is per-project, per-member, per-date-window — it requires time parameters and cannot be stored as a static team field. Using it here would require the team detail endpoint to accept date range parameters, which the spec does not call for. The two models do not conflict because they describe different things: execution utilisation vs. team headcount limit.

---

## What was done

### 1. Migration 1315

`backend/migrations/1315_build_project_teams_capacity.sql` — adds `capacity INTEGER` (nullable) to `build.project_teams`.

`backend/migrations/1315_build_project_teams_capacity_rollback.sql` — drops the column.

Both follow the house template: `SET lock_timeout = '5s'`, DO-block precondition check, idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, DO-block `ASSERT` post-check.

**The migration is NOT registered in `_journal.json` — that is the orchestrator's responsibility per standing rules.**

### 2. Backend schema changes

- `backend/src/db/schema/build/teams.ts`: added `capacity: integer("capacity")` (nullable) to `projectTeams`.
- `backend/src/modules/build/teams/dto/teams-response.schemas.ts`: added `capacity: z.number().int().nullable()` to `teamRowSchema`. Propagates to `teamDetailSchema` (extends) and `teamListItemSchema` (omits only `deletedAt`).
- `backend/src/modules/build/teams/dto/teams.schemas.ts`:
  - `createTeamSchema`: added `capacity: z.number().int().positive().optional()`
  - `updateTeamSchema`: added `capacity: z.number().int().positive().nullable().optional()`
  - `listTeamMembersQuerySchema`: added `q`, `leadId: z.string().uuid()`, `memberId: z.string().uuid()` — all optional, schema remains `.strict()`
- `backend/src/modules/build/teams/teams.service.ts`:
  - `listTeams`: added `capacity: projectTeams.capacity` to explicit projection
  - `createTeam`: passes `capacity: input.capacity ?? null` on insert
  - `updateTeam`: applies `patch.capacity = input.capacity` when present
- `backend/src/modules/build/teams/team-members.service.ts`: server-side filtering in `listTeamMembers`:
  - `q` → `OR ilike` on `users.email`, `users.firstName`, `users.lastName`
  - `leadId` → `eq(organizationMembers.userId, leadId) AND eq(role, "lead")`
  - `memberId` → `eq(organizationMembers.userId, memberId)`
  - Keyset cursor (`joinedAt, id`) is unchanged — filters narrow the set but do not change sort order, so pagination remains correct.

### 3. Frontend contract and type changes

- `frontend/hooks/api/build/teams-schema.ts`: added `capacity: z.number().int().nullable()` to `teamRowContract`. Propagates to `teamDetailContract` and `teamListItemContract`.
- `frontend/types/projects/teams.ts`: added `capacity: number | null` to `ProjectTeam` and `capacity?: number | null` to `UpdateTeamInput`.
- `frontend/hooks/api/build/teams.ts`: `useTeamMembers` now accepts `filters?: { q?: string; leadId?: string; memberId?: string }` and forwards them into the query params and cache key.
- `frontend/features/build/teams/team-home-page.tsx`:
  - `useTeamMembers` now called with `filters` derived from `debouncedSearch`, `leadIdFilter`, `memberIdFilter`.
  - Client-side `filteredMembers` derived computation removed; `pageMembers` used directly throughout.
  - Renders `<span data-testid="team-capacity">Capacity {data.capacity}</span>` in the header strip when `data.capacity` is non-null.

### 4. Bulk actions

The spec's bulk clause is conditional: "selection only when a real repeated operation exists". Removing multiple members at once is a real repeated operation, but the current member list has no selection state (no checkboxes, no bulk action bar). Adding bulk member removal would require a new backend endpoint, frontend selection state, bulk action bar, and tests — scope that exceeds this lane's boundary. Recorded as a remaining gap.

### 5. Tests

`frontend/features/build/teams/team-home-page.test.tsx`: **50 tests pass** (4 new tests added, 46 pre-existing retained and green).

New tests:
| Test | BLD code |
|------|----------|
| q search term is forwarded to useTeamMembers — reaches the server query, not filtered client-side | BLD-X-FE-TEAMS-DETAIL-014 |
| q search is absent from useTeamMembers call when search is empty — paired | BLD-X-FE-TEAMS-DETAIL-014 |
| leadId filter is forwarded to useTeamMembers — reaches the server query, not filtered client-side | BLD-X-FE-TEAMS-DETAIL-014 |
| memberId filter is forwarded to useTeamMembers — reaches the server query, not filtered client-side | BLD-X-FE-TEAMS-DETAIL-014 |
| no filter params forwarded when all filters are at their default state — paired | BLD-X-FE-TEAMS-DETAIL-014 |
| renders capacity value when team has a capacity set — paired with null test below | BLD-X-FE-TEAMS-DETAIL-015 |
| does not render capacity element when capacity is null — paired with set test above | BLD-X-FE-TEAMS-DETAIL-015 |

Three 014 tests from the previous wave that verified client-side rendering (alice appears, bob does not) were replaced by forwarding assertions. The replacement tests verify the same *intent* (filter reaches the query) at the correct level (the hook call rather than the rendered list).

---

## Remaining gaps for box 3

| Gap | Blocker |
|-----|---------|
| Bulk member removal | No selection UI; new endpoint + selection bar + tests needed; spec clause is conditional |
| C6 keyboard check in `teams-team-a11y.spec.ts` | CCG-3 — gallery combobox focus times out (drain result recorded in CCG-3) |
| C7 production browser evidence | CCG-2 — orchestrator-only |

Box 3 closes when: (a) migration 1315 is applied, (b) the bulk gap is resolved or formally excused, and (c) C6's keyboard item passes in the gallery re-drain.

The `capacity` field itself is now end-to-end: column → Drizzle schema → backend Zod schema → response → frontend contract → render → test. The deploy ordering risk is the only outstanding blocker on capacity specifically.
