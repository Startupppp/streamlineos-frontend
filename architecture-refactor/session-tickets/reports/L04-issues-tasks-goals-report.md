# L04 — Issues / Tasks / Goals / Reports / Autonomy

**Status:** COMPLETE

## Guard audit
0 handlers with `@RequirePermission` missing `@UseGuards(JwtAuthGuard, PermissionGuard)`. All 5 module controllers carry the guard at class level.

## Lists migrated to cursor pagination
- `issues.service.ts` — already cursor-paginated (no change)
- `tasks.service.ts` / `goals.service.ts` — remain offset (page/limit ≤ 100); frontend hook migration is OUT-OF-OWNERSHIP (must update `useInfiniteQuery` in `frontend/src/hooks/use-tasks.ts` and `use-goals.ts` to switch to cursor query params)

## Files split (line counts before → after)
- `goals.service.ts` 618 → 327 lines; extracted: `goal-links.service.ts` (134), `goal-key-results.service.ts` (116), `goals-progress.ts` (57), `goals-scope.ts` (unchanged)
- `tasks.service.ts` 547 → 319 lines; extracted: `task-analytics.service.ts` (90), `task-sequences.service.ts` (103), `task-date-utils.ts` (20)
- `autonomy-review.service.ts` 548 → 270 lines; extracted: `autonomy-reversal.service.ts` (213)

## Isolation tests written (8 specs, all passing)
`issues-tenant-isolation`, `tasks-tenant-isolation`, `goals-tenant-isolation`, `autonomy-review-tenant-isolation`, `autonomy-actions-tenant-isolation`, `autonomy-hold-tenant-isolation`, `autonomy-scoring-tenant-isolation`, `autonomy-reversal-tenant-isolation`

## Validation
- `pnpm typecheck`: 7 pre-existing errors in `payroll/runs/` and `scripts/` — 0 errors in owned trees
- `pnpm check:route-classification`: ALL ROUTES CLASSIFIED (0 undeclared)
- `pnpm check:tenant-isolation`: `autonomy-reversal.service.ts` now covered; remaining 311 missing are outside L04 ownership
- Jest (40 suites, 421/423 tests pass): PASS
