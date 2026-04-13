# CEO Branch Management Panel — PRD

## Problem
The CEO has no centralized view to monitor branch-level performance, manage branch operations, or compare branches. Branch data (tasks, work logs, targets, employees, expenses) exists but is scattered across different modules. The CEO needs a single panel to see everything at a glance and take action.

## Goal
Build a CEO-only "Branch Command Center" that provides:
1. At-a-glance KPIs per branch (employees, tasks completed, work log hours, pending expenses, target progress)
2. Branch comparison view (side-by-side metrics)
3. Drill-down into any branch for detailed management
4. All admin actions (create/edit branches, reassign managers, activate/deactivate)

## User Stories

### P0 — Must Have
- **As a CEO**, I can see all branches in a card grid with key metrics (headcount, tasks done, hours logged, targets achieved)
- **As a CEO**, I can click into a branch to see its employees, recent work logs, and task breakdown
- **As a CEO**, I can compare branch performance in a table view

### P1 — Should Have
- **As a CEO**, I can edit branch details (manager, HR, status) inline
- **As a CEO**, I can see pending actions per branch (unassigned leads, pending expenses, pending leaves)

### P2 — Nice to Have
- **As a CEO**, I can export branch performance as CSV
- **As a CEO**, I can see branch performance trends over time

## Architecture

### API Route
`GET /api/dashboard/branch-overview` — returns all branches with aggregated KPIs:
- Employee count per branch
- Tasks completed this month per branch (via assignee.branchId)
- Work log hours this month per branch (via user.branchId)
- Pending expenses per branch (via user.branchId)
- Target achievement per branch (targets table has branchId)

### UI Page
`/dashboard/branches` — CEO-only page:
- Summary cards (total branches, total employees, avg target %)
- Branch cards grid with sparkline KPIs
- Expandable branch detail panel
- Branch comparison table

### Existing Infrastructure Used
- `lib/db/branch-filter.ts` — branch scoping
- `lib/api/hooks/branches.ts` — useBranches, useBranch
- `server/queries/branches.ts` — getBranches, getBranch
- Branch schema has branchManagerId, branchHrId, status
- Targets, clientAccounts, incentives all have branchId
