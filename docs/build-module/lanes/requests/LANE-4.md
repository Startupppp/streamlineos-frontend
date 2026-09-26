# Lane 4 — Cross-Territory Requests

Requests for files outside Lane 4 territory. The orchestrator applies these.

---

## ORCHESTRATOR RULING on Request 1 (2026-09-26): NOT APPLICABLE — nothing to remove

`"features/build/modules/modules-page.tsx"` is **not in** `frontend/lib/rbac/denial-is-not-emptiness.known.json`.
The only `modules-page.tsx` entry in that file is line 192, `"features/settings/modules/modules-page.tsx"` —
a different file in a different feature, which Lane 4 does not own and which this session has not
changed. `grep -n "build/" lib/rbac/denial-is-not-emptiness.known.json` returns zero hits: the whole
239-entry list contains no build-module file.

Your fix to `frontend/features/build/modules/modules-page.tsx` stands and is real —
`usePageState` at line 89 with `permission: "build:view"`, `PageState` at line 196 with the house
`loading={null}`. It just never needed a suppression entry removed, because it never had one. No edit
applied. Do not re-file this.

---

## Request 5: Analytics endpoint — add query schema to stop silent filter drop

**File:** `backend/src/modules/build/core/projects-reports.controller.ts`
**Affected:** `GET /build/:projectId/analytics` — currently line 72–83

**Problem:** `GET /build/:projectId/analytics` accepts NO query schema. The controller calls
`@Validate({ params: projectIdParams })` with nothing in the `query` slot. The service method
`getProjectAnalytics(orgId: string, projectId: number)` accepts no filter arguments.
The frontend hook `useProjectAnalytics` (`hooks/api/build/advanced.ts:409`) builds a query string with
`range`, `teamId`, `ownerId` — but all three are silently dropped at the controller boundary (the Zod
`.strict()` on an absent schema accepts everything and passes nothing). The caller receives full
unfiltered data with a 200, so there is no signal the filter was not applied.

**Change 1 — add schema in `backend/src/modules/build/core/dto/analytics.schemas.ts` (after line 36):**
```typescript
export const projectAnalyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "180d", "365d"]).optional(),
  teamId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
}).strict();

export type ProjectAnalyticsQuery = z.infer<typeof projectAnalyticsQuerySchema>;
```
(Use the same enum values the `useProjectAnalytics` hook already sends; verify those against the
frontend `advanced.ts:409` call. If the enum set differs from what the frontend sends, align them in
the same change.)

**Change 2 — wire the schema in the controller (at the `@Validate` decorator on the analytics route):**
```typescript
@Validate({ params: projectIdParams, query: projectAnalyticsQuerySchema })
```

**Change 3 — thread filters into the service signature:**
- `projects-analytics.service.ts` line 22: change
  `async getProjectAnalytics(orgId: string, projectId: number)`
  to
  `async getProjectAnalytics(orgId: string, projectId: number, filters?: ProjectAnalyticsQuery)`
- Thread `filters` into the query logic inside that method. The exact SQL change is inside the service
  and within Lane 4's territory; what is blocked only by the controller schema.
- Controller call site: pass `q.query` (the validated query object) through to the service.

**Why `.strict()` is required:** BE-13 — all query schemas use `.strict()`. Without it, an unknown
`foo=bar` silently passes, defeating the "filter not applied" signal.

**Frontend hook update (in Lane 4 territory):** Once the backend schema is wired, update
`hooks/api/build/advanced.ts:409–422` (`useProjectAnalytics`) to actually pass the filter params
in the query string. Currently the hook takes no params at all.

---

## Request 2: Register execution-core gallery route in the design-system registry

**File:** `frontend/app/(public)/design-system/page.tsx` (or equivalent design-system index file)

**Change:** Add an entry or link for `/design-system/execution-core` so the gallery route is discoverable in the dev design-system index page.

**Reason:** The Playwright C6 spec at `frontend/e2e/execution-core-a11y.spec.ts` navigates to `/design-system/execution-core`. The gallery page exists at `frontend/app/(public)/design-system/execution-core/page.tsx` and the `ExecutionCoreGallery` component is at `frontend/features/build/views/execution-core-gallery.tsx`. The route works but is unreachable from the design-system index. Adding a link to the design-system listing lets maintainers find it and keeps it consistent with the existing `build-list` gallery entry pattern.

---

---

## Request 3: Issues C3 — wire usePageState and add test to project-board-page.tsx

**File to change:** `frontend/features/build/project-detail/project-board-page.tsx` (321 lines)

**Reason this is a request:** file is orchestrator request-only territory (serves both the Issues and Workload routes). Note: this file is NOT in `frontend/lib/rbac/denial-is-not-emptiness.known.json` — previous status entry was incorrect.

**Specific defects to fix** (each with source location):

1. **Line 37 — wrong access check pattern (FE-40/42):**
   ```tsx
   const accessState = useCanState("build:view");
   ```
   Replace with `usePageState({ permission: "build:view", isLoading, isError, error })` and wrap the render in `<PageState resolution={pageState}>`. The manual branch at **line 188** (`if (accessState === "denied" || accessState === "loading") return null`) must be removed.

2. **Line 188 — denial returns null, not NoPermissionState:**
   `if (accessState === "denied" || accessState === "loading") return null;` — both states silently render nothing. After switching to `<PageState>`, the `"denied"` branch renders `<NoPermissionState>` automatically.

3. **Lines 190–196 — loading branch outside PageState:**
   The `if (isLoading)` skeleton render must become the `loading` prop of `<PageState>` (house pattern: `loading={null}` if PageState manages it, or a skeleton prop).

4. **Lines 200–208 — error branch uses ProjectLoadFallback but error is not piped through usePageState (FE-41):**
   Pass `error: projectErrorValue` to `usePageState` so 402/403 errors reach the correct branch.

**Test file to create:** `frontend/features/build/project-detail/project-board-page.test.tsx`

Tests required to close Issues C3 (`10-project-issues.md:55–60, 64–71, 102`):
- `"access denied — renders NoPermissionState, not null"` (positive of the FE-122 pair: assert `getByRole("alert")` or similar, not just absence)
- `"access loading — renders loading skeleton"` (`data-testid="kanban-skeleton"` visible)
- `"project load error — renders error state with retry"` (mock `useProject` isError=true; assert error message rendered)
- `"module disabled — renders 402 upgrade path"` (mock `usePageState` returning `"module-unavailable"`)
- `"ready state — renders ticket board"` (mock `useProject` + `useProjectBoardTickets` with data; assert board renders)
- `"empty state — renders empty when no tickets"` (mock `useProjectBoardTickets` returning empty `data.pages`)

**URL params that must be in the URL (already in `useBoardUrlState`, verify coverage)** (`10-project-issues.md:45`):
`layout`, `viewId`, `q`, `type`, `status`, `priority`, `assigneeId`, `cycleId`, `moduleId`, `labelId`, `due`, `group`, `sort`, `cursor` — verify `useBoardUrlState` reads and writes all of these from the URL.

**Bulk actions present, verify tested** (`10-project-issues.md:49`):
- `handleBulkStatus` (line 163) — status change
- `handleBulkPriority` (line 167) — priority change
- `handleBulkAssignee` (line 175) — assignee assignment
- `handleBulkCycle` (line 179) — cycle assignment
- `handleBulkParent` (line 183) — parent link

Missing bulk actions per spec: label assignment, archive, export — mark as P1 gaps.

---

## Request 4: Workload C3 — URL-back the capacity window and add test to project-board-page.tsx

**File to change:** `frontend/features/build/project-detail/project-board-page.tsx` (321 lines) and `frontend/features/build/views/workload-types.ts` (49 lines)

**Reason this is a request:** orchestrator request-only territory (same file as Request 3).

**Specific defects to fix:**

1. **Lines 100–106 — `capacityWindow` is hardcoded, not URL-backed (`10-project-workload.md:45`):**
   ```tsx
   const capacityWindow = useMemo(() => {
     const today = new Date();
     return { start: format(today, "yyyy-MM-dd"), end: format(addDays(today, 13), "yyyy-MM-dd") };
   }, []);
   ```
   The spec requires `from` and `to` as deep-linkable URL params. Replace the hardcoded window with URL-backed params read from `searchParams.get("from")` and `searchParams.get("to")`, falling back to today + 13 days when absent.

2. **`workload-types.ts:19–37` — `FilterState` has no `teamId`, `memberId`, or `group` fields (`10-project-workload.md:45`):**
   Add `teamId: string`, `memberId: string`, `group: string` to `FilterState` and `INITIAL_FILTERS` with `"all"` defaults. These must be URL-backed (read from `searchParams`, written on change) rather than local React state.

3. **`useWorkloadCapacity` call at line 108–113 — passes hardcoded window:**
   After fixing (1), pass the URL-backed `from`/`to` to `useWorkloadCapacity`.

4. **Same FE-40 fix as Request 3:** once `usePageState` is wired (Request 3), the workload view states are covered.

**Test additions for workload in `project-board-page.test.tsx`** (`10-project-workload.md:55–60, 18, 102`):
- `"workload view — renders member rows with capacity fields"` (mock `useWorkloadCapacity` returning member data; assert `capacity`, `allocation` columns present) — core fields: `member, capacity, leave, allocation, estimate, actual, variance` (`10-project-workload.md:18`)
- `"workload view — renders empty when no members"` (mock empty `useWorkloadCapacity` result)
- `"workload view — applies from/to URL params to capacity window"` (set `?from=2026-01-01&to=2026-01-14`; assert `useWorkloadCapacity` called with those dates)

---

## Request 1: Remove modules-page.tsx from denial-is-not-emptiness known list

**File:** `frontend/lib/rbac/denial-is-not-emptiness.known.json`

**Change:** Remove the entry `"features/build/modules/modules-page.tsx"` from the array.

**Reason:** `features/build/modules/modules-page.tsx` was fixed in this session to use proper `usePageState` / `<PageState>` pattern (import of `usePageState` and `PageState` added, manual `if (isLoading)` / `if (isError)` branches replaced with PageState dispatch, permission `"build:view"` wired). The file no longer renders empty-success state on denial — it renders `NoPermissionState` via PageState. The 8 new tests in `features/build/modules/modules-page.test.tsx` verify this including the `ACCESS_DENIED` → `no-permission` case.
