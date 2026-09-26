# WAVE-G-09 — Workload Filters

## Session: G-09 (2026-09-26)

### Scope

`docs/build-module/10-project-workload.md` box 3 — implement the three dead URL params: `teamId`, `projectId`, `group`.

### Deliverables

**Files modified (backend):**
- `backend/src/modules/build/execution/workload-capacity.controller.ts` — added `teamId: z.coerce.number().int().positive().optional()` to `capacityQuerySchema`; passes `query.teamId` to service
- `backend/src/modules/build/execution/workload-capacity.service.ts` — added `projectTeamMembers` import and `teamId?: number` param; if provided, fetches membershipIds from `projectTeamMembers` (WHERE orgId + teamId), returns empty if team has no members, otherwise adds `inArray` predicate to the member query
- `backend/src/modules/build/execution/workload-capacity-tenant-isolation.spec.ts` — added 3 teamId filter tests (empty team, populated team positive control, WHERE clause contains both orgId and teamId)

**Files created (backend):**
- `backend/migrations/1345_project_team_members_org_team_idx.sql` — adds `idx_project_team_members_org_team` ON `build.project_team_members(org_id, team_id)` to serve the bounded sub-query under RLS (BE-44, BE-79)
- `backend/migrations/1345_project_team_members_org_team_idx_rollback.sql`

**Files modified (frontend):**
- `frontend/lib/query-keys/build-work.ts` — `workloadCapacity` key now accepts optional `teamId`; key includes it when present
- `frontend/hooks/api/build/workload-capacity.ts` — added `teamId?: number` param; included in API query string and cache key
- `frontend/features/build/views/workload-types.ts` — added `teamId: string` to `FilterState`; added to `INITIAL_FILTERS` as `"all"`; added to `hasActiveWorkloadFilters`
- `frontend/features/build/views/workload-filter-types.ts` — added `TeamOption` interface; added `teams: TeamOption[]` to `WorkloadFilterMenuProps`; added `"team"` to `WorkloadFilterCategory` union; added `"teamId"` to `StringFilterKey` union
- `frontend/features/build/views/workload-filter-bar.tsx` — added `teams: TeamOption[]` prop; `teamMap` memo; `teamChipLabel` memo; `handleClearTeam` callback; team filter chip in active-filters row; passes `teams` to `WorkloadFilterMenu`
- `frontend/features/build/views/workload-filter-menu.tsx` — added `Users` icon import; destructures `teams`; adds "Team" category (visible only when teams exist, active when teamId != all); `handleSelectTeam` callback; passes `teams` and `onSelectTeam` to `WorkloadSubmenu`
- `frontend/features/build/views/workload-filter-submenu.tsx` — added `TeamOption` import; `teams` and `onSelectTeam` to props/destructure; renders `OptionRow` for each team when category is "team"
- `frontend/features/build/workload/workload-board-page.tsx` — reads `teamId` from URL; parses to `teamIdParam: number | undefined`; calls `useProjectTeams()` for filter options; passes `teamIdParam` to `useWorkloadCapacity`; adds `teamId` to `localFilters` init and `workloadFilters` memo; handles `teamId` writes and clears in URL; passes `teams` to `WorkloadFilterBar`
- `frontend/features/build/workload/workload-board-page.test.tsx` — added `useProjectTeams` mock; updated 2 existing `useWorkloadCapacity` tests to expect `undefined` as 4th arg; added 5 new teamId tests

**Files modified (docs):**
- `docs/build-module/10-project-workload.md` — Gaps section updated

### Decisions

| Param | Decision | Rationale |
|---|---|---|
| `teamId` | Implemented end-to-end | URL → page → hook → API query string → service filter via `projectTeamMembers` sub-query |
| `projectId` | No-op (documented) | Route `/build/[projectId]/workload` already carries it as a path param; a query param would be circular |
| `group` | Not implemented (documented) | Neither the wireframe nor the product contract describes a grouping target or its options; "group by team" requires a project-teams endpoint not currently exposed; recorded in Gaps rather than invented |

### Migration note

Migration 1345 adds `idx_project_team_members_org_team ON build.project_team_members(org_id, team_id)`. The service's `teamId` sub-query (`WHERE org_id = ? AND team_id = ?`) is safe to deploy before this index is applied — it will use the existing `uniq_project_team_members_team_user (teamId, membershipId)` index for the teamId lookup. The index improves performance for large orgs but is not a deploy blocker.

### Why box 3 is NOT ticked

Three gaps remain:

| Item | Status |
|---|---|
| `teamId` | Done |
| `projectId` | Documented no-op (route param) |
| `group` | Recorded as missing target — no target in wireframe; needs project-teams endpoint |
| `allocation`, `estimate`, `variance` columns | Not in WorkloadMemberRow (spec core fields) |
| Bulk actions | Not applicable (no ticket selection surface) |
| Conflict state | Excused by CCG-1 |

C3 stays open: `group` has no target and `allocation`/`estimate`/`variance` are not in the workload table.

### Test results

```
PASS features/build/workload/workload-board-page.test.tsx
  25 passed, 0 failed

PASS backend/src/modules/build/execution/workload-capacity-tenant-isolation.spec.ts
  7 passed, 0 failed
```

---

## Orchestrator correction — migration 1345 added a redundant index, dropped by 1346

1345 is applied. So is 1346, which drops the index 1345 created.

The lane wrote `idx_project_team_members_org_team (org_id, team_id)` citing BE-44 and BE-79, and the
citation is right in spirit — an org-led composite is the correct shape for this lookup under RLS. What
the lane did not check is whether that shape already existed. It did:

```
idx_project_team_members_org_team_joined
    ON build.project_team_members USING btree (org_id, team_id, joined_at, id)
```

A btree serves any **leading prefix** of its column list, so `(org_id, team_id, joined_at, id)` already
answers `WHERE org_id = ? AND team_id = ?` with exactly the same access path. The new index was
redundant by construction — not marginally useful, not a different sort order, not covering a column the
composite lacks. This is a structural property of btrees, so it needed no measurement, and with 0 rows
in the table today an `EXPLAIN` could not have shown it either way: the planner seq-scans an empty
relation regardless. Reading `pg_indexes` first would have shown it in one query.

A redundant index is not free. Every insert and update to `project_team_members` maintains it, it
occupies pages in cache that the useful indexes want, and it misleads the next person planning an
index on this table.

### Why 1346 rather than deleting 1345

1345 was already applied when the redundancy was found, so its hash is in
`drizzle.__drizzle_migrations` on production. Deleting the file and its `_journal.json` entry would
leave a ledger row with no journal entry — the desynced-journal state that makes "0 pending" a lie and
strands later migrations. The append-only correction keeps journal and ledger in agreement by hash,
which is the invariant that actually protects this repo.

1346's precondition asserts the **covering composite still exists** before dropping anything, so it
refuses to run on a database where `(org_id, team_id)` is not otherwise served. Its rollback recreates
the dropped index. Verified after apply: `idx_project_team_members_org_team` absent,
`idx_project_team_members_org_team_joined` present.

### What the lane got right

The `teamId` filter itself is sound and stays. It resolves membership ids from
`project_team_members` bounded at 500, returns early on an empty team rather than building an
`inArray` over nothing, and carries both `org_id` and `team_id` in the predicate. Box 3 was correctly
left **unticked** — `group` has no target in `WorkloadView` and `allocation`/`estimate`/`variance` are
absent from `WorkloadMemberRow`. Declining to invent a grouping vocabulary the spec never defines was
the right call.
