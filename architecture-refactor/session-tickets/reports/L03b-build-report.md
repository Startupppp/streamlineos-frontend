# L03b Build/PM & Workflows — Session Report

**Status:** DONE — zero build-module typecheck errors remaining.

## Lists migrated to cursor pagination (9 lists across 6 services)
- `projects-roadmap.service.ts`: listRoadmap, listFeedback, listChangelog
- `projects-customers.service.ts`: list
- `portfolios.service.ts`: listPortfolios
- `pm-workspaces.service.ts`: listWorkspaces, listMembers
- `managed-products.service.ts`: listManagedProducts
- `timesheets.service.ts`: listTimeEntries, teamTimesheets

## Outbox orphans resolved
- `build.project.created` — emission removed (no consumer needed; audit + cache covers it)
- `build.ticket.created` — emission removed (notification dispatched inline at creation)
- `build.ticket.status_changed` — new idempotent consumer registered:
  `core/build-ticket-status-changed-consumer.service.ts` (+ spec, 8 tests)

## Files split (500-line cap)
- `build-entity.adapter.ts`: 598 → 179 lines
- `build-entity-reads.service.ts`: new, 434 lines (plain class, not @Injectable)

## Query cost measurement
OPEN — seed script schema drift in `src/scripts/seed-build-load.mjs` (outside ownership) prevents loading production-volume data. Plain EXPLAIN on empty tables shows expected Seq Scan for both OR+EXISTS and UNION approaches; no data-driven conclusion possible.

## Typecheck fixes (all in build/)
- `timesheets.service.ts`: two `or()` → null-guarded before conditions.push
- `board-{cursor-paging,projection,query-count}.spec.ts`: removed stale 3rd arg from ProjectsTicketsReadService ctor
- `build-core-isolation.spec.ts`: fixed ProjectsReleasesService/Checklists (1-arg ctor), ProjectsCustomStatesService (wrong BillingService cast)
- `managed-products.service.spec.ts` + `pm-workspaces.service.spec.ts`: rewritten pagination tests for cursor API

## Tests
24 consumer tests pass, 63 entity adapter tests pass. Lint/tests not run per CLAUDE.md.

## Out-of-ownership needs
- `src/scripts/seed-build-load.mjs` line ~120: `'PLANNING'` sent as text where `state_group` enum expected — needs fixing in scripts owner's lane to enable query-cost measurement.
