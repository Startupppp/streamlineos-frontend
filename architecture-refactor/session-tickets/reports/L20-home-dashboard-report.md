# L20 Home Dashboard Report

**Status:** DONE (items 1, 2, 8, 11) · OPEN (items 5/10 — P95 measurement, no live DB in this session)

## Section contract table

| Section | Access | Data scope | Query omitted when denied? |
|---|---|---|---|
| identity (orgName, orgSlug) | Universal | org | n/a — always shown |
| stats.totalEmployees | `hr:employees:view` ≠ none | org | YES — returns null |
| stats.presentToday | `hr:attendance:manage` == all | org | YES — returns null |
| stats.activeProjects | `build:tickets:view` ≠ none | org | YES — returns null |
| attendance / availability | `hr:attendance:view` + HR module | scoped (own/team/all) | YES — 403 at controller |
| approvals (pending-approvals) | `hr:leaves:approve` + HR module | scoped per leaveApprovalScope | YES — 403 at controller |
| Build work (my-issues, active-sprint) | `build:manage` + Build module | DataScope | YES — module gate blocks |
| announcements | Universal | org | n/a — empty list if none |
| calendar (upcoming events) | Universal (settle fallback) | org + visibility predicate | n/a — fallback [] |
| mail (unread notifications) | Universal (settle fallback) | own (userId+orgId) | n/a — fallback 0 |
| notifications | Universal (settle fallback) | own (userId+orgId) | n/a — fallback 0 |

## Calendar leak fix (item 9)

**FALSE PREMISE on P0 description:** `calendar_events.visibility` already existed (default `'org'`). No new column needed.

Dashboard `getPersonalDashboard` upcoming-events query was unguarded. Fixed in `dashboard-personal.service.ts` — SQL predicate now:

    visibility = 'org' OR created_by = $userId
    OR EXISTS (event_attendees JOIN organization_members WHERE userId=$userId AND status=ACTIVE AND attendee.status <> 'declined')

Tests in `dashboard-hr-events.spec.ts` (15 tests): stale assertions that `visibility` column was absent replaced with assertions it exists; new tests cover org-visible arm, creator arm, attendee arm, declined exclusion, departed-membership exclusion, cross-org DENY + same-org CONTROL.

OUT-OF-OWNERSHIP: migration adding `visibility` column to `calendar_events` must be applied by the migrations lane (backend/migrations/**).

## File split (item 8)

`dashboard-hr.service.ts` (635 lines) → deleted. Split into:

| File | Lines | Responsibility |
|---|---|---|
| `dashboard-stats.service.ts` | 89 | getDashboardStats |
| `dashboard-availability.service.ts` | 230 | getTeamAvailability + getTeamAttendance |
| `dashboard-birthdays.service.ts` | 165 | getBirthdays |
| `dashboard-personal.service.ts` | 244 | getPersonalDashboard (calendar-leak fix inside) |

Controller updated to inject all 4 services directly. Module updated. No forwarding wrappers.

## P95 measurement (item 10)

OPEN — no live DB available in this session. Requires `streamline_app` role + tenant GUC + production-shaped data. `pnpm seed:build-load && pnpm baseline:build` are the gates; run `EXPLAIN (ANALYZE, BUFFERS)` on the personal-dashboard query as the app role.

## Validation

- `pnpm typecheck`: 0 dashboard errors; pre-existing errors in `modules/finance/tax/`, `modules/organization/`, `modules/payroll/`, `modules/users/`, `scripts/` (outside ownership)
- `pnpm check:route-classification`: PASS — 0 undeclared handlers
- `pnpm check:scope-application`: PASS — 122/122 resolved DataScopes reach a predicate
- `pnpm check:tenant-isolation`: FAIL 60% (322 missing) — pre-existing; dashboard services not in the list
- Tests: 55 pass, 4 pre-existing failures in `dashboard-home-scope.spec.ts` (scope_teammate — applyScope changed, owned by S01/common/rbac) and `resignation-approval-scope.spec.ts`; 15 new calendar-visibility tests all pass
