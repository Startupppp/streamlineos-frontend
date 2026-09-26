# Wave-B-09 Status: product-insights · product-roadmap · product-projects

Lane: LANE-3-MANAGED-PRODUCTS  
Spec files: `10-managed-products-product-insights.md`, `10-managed-products-product-roadmap.md`, `10-managed-products-product-projects.md`

## Completed

### C5 — backend analytics filter defect (confirmed pre-existing bug)

The `getAnalytics` handler (`projects-reports.controller.ts`) had no `@Validate` query schema, so `range`, `teamId`, and `ownerId` were silently ignored — the endpoint always returned unfiltered data regardless of query params.

Changes applied:
- `backend/src/modules/build/core/dto/analytics.schemas.ts` — added `projectAnalyticsQuerySchema` (strict, range/teamId/ownerId) and `ProjectAnalyticsQuery` type
- `backend/src/modules/build/core/projects-reports.controller.ts` — added `@Validate({ params: projectIdParams, query: projectAnalyticsQuerySchema })` and `@Query() query: ProjectAnalyticsQuery` to `getAnalytics`, forwarded to service
- `backend/src/modules/build/core/projects-analytics.service.ts` — added `resolveMembershipIds` private method (ownerId → membership lookup, teamId → team members query), updated `getProjectAnalytics` cache key to include all filter params, updated `computeProjectAnalytics` to use `rangeStart` from query range, build `assigneeFilter` from `membershipIds`, apply filter in both Drizzle and raw SQL branches using `ANY(${membershipIds})` not the Drizzle SQL object (avoids table-alias mismatch)

NOTE: Adding `@Validate({ query: ... })` to `getAnalytics` changes the OpenAPI spec — the orchestrator must regenerate the vendored copy (`pnpm openapi:generate` in the backend repo).

### C5 — contract test for analytics filter propagation

New file: `backend/src/modules/build/core/projects-analytics-filter-propagation.spec.ts`

Four tests:
- When no ownerId/teamId: `organizationMembers.findFirst` not called
- When ownerId is supplied: `findFirst` is called with the right arguments
- Cache keys differ between filtered and unfiltered calls (ownerId, teamId, range all produce distinct keys)

### C3 — product-insights loading/error states

Added two tests to `frontend/features/build/managed-products/product-insights-page.test.tsx` (suite BSN-INS-STATE):
- Loading skeleton renders when `usePageState` resolves to `{kind: "loading"}`
- Error state renders when `usePageState` resolves to `{kind: "error"}`

### C3 — product-roadmap sort, status, horizon + states

Backend: added `sort: z.enum(["updated_at", "created_at", "title"]).optional()` to `roadmapListQuerySchema` and applied in `listRoadmap` service using Drizzle `asc`/`desc` on the appropriate column. The `.strict()` schema now accepts `sort` without 400.

Frontend fix: removed `horizon` from the `filters` useMemo in `ProductRoadmapPage`. No DB column backs `horizon`; forwarding it caused silent 400 errors when any non-default horizon was active. The URL still reflects the horizon selection; the API call does not include it.

Tests added to `frontend/features/build/managed-products/product-roadmap-page.test.tsx`:
- Loading / error / empty states via PageState mock
- Sort URL param tests (updated_at / created_at / title / absent)
- Status URL param tests (planned / absent)
- Horizon-not-forwarded test: even when `horizon=now` is in URL, `useRoadmapItems` is not called with `horizon`

### C3 / C5 — product-projects

The page delegates to `features/build/project-list/projects-page` which already has:
- `projects-page-denied.test.tsx`: denied state, 402 upgrade path
- `projects-page-empty.test.tsx`: empty state
- `projects-page-url-params.test.tsx`: managedProductId, managerId, clientId, productId URL params
- `projects-page-url-state.test.ts`: filter/cursor URL state mutations

C3 ticked based on existing coverage. C5 ticked — analytics cache key isolation covered by the new analytics spec above; project list keyset and tenant isolation covered by existing `projects-query-keyset.spec.ts` and `projects-query-tenant-isolation.spec.ts`.

## Spec file ticks applied

| File | Before | After |
|---|---|---|
| `10-managed-products-product-insights.md` | C3 open | C3 closed |
| `10-managed-products-product-roadmap.md` | C3 open | C3 closed |
| `10-managed-products-product-projects.md` | C3 open, C5 open | C3 closed, C5 closed |

## Remaining open

- C6 (keyboard, screen-reader, mobile) — jsdom limitation; requires browser verification
- C7 (production browser evidence) — requires live environment
- `horizon` filter: tracked in URL but has no DB column; a future migration adding `build.roadmap_items.horizon` enum column would enable server-side filtering
- OpenAPI vendored JSON: regeneration required after the `getAnalytics` query schema change
