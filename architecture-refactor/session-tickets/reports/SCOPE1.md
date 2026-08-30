# SCOPE1 Lane Report — `scope === "all"` / scope-none audit

**Date:** 2026-08-31
**Lane:** SCOPE1
**Verdict:** ZERO confirmed defects. No fixes applied. No new specs written.

---

## 1. Methodology

For each `scope === "all"` site in the territory:

1. Trace the call chain back to the controller handler.
2. Record the `@RequirePermission` key (gate key) and the key passed to `scopeFor`/`resolveXxxScope` (scoped key).
3. If gate key == scoped key: PermissionGuard already prevents `scope === "none"` from reaching the service — **NO DEFECT**.
4. If keys differ (or route is `@Universal`/`@AuthorizedInService`): "none" CAN reach. Evaluate whether the else-branch returns other people's rows.
5. Cross-reference `apply-scope.ts` behaviour: `applyScope("none", ...) → sql\`false\`` (verified at `src/modules/access/apply-scope.ts:29`).

---

## 2. Site-by-site analysis

### `src/common/cache/org-hierarchy-cache.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `viewerKey` | 48 | N/A | N/A | N/A | NO DEFECT — cache key builder only, no query issued |

`viewerKey` returns a string discriminator for the cache namespace. "none" produces `scope:none:actor:<id>` which is a distinct cache slot. No data access occurs here.

---

### `src/modules/autonomy/autonomy-review.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `scopePredicate` | 121 | `crm:autonomy:view` | `crm:autonomy:view` | NO | NO DEFECT |

`autonomy-review.controller.ts` resolves scope in `readScope(u)` (line 193–198) using the same `crm:autonomy:view` constant as the route `@RequirePermission`. Scope is passed to `listDecisions` as a parameter — it never re-calls `scopeFor`. Since gate key == scoped key, PermissionGuard has already blocked "none" before the handler runs. Additionally, `applyScope("none", ...) = sql\`false\`` as a second layer.

---

### `src/modules/build/entity/build-entity-reads.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `resolveWith` early-exit | 66 | varies (call-site) | per-type `READ_KEY[type]` | guarded | NO DEFECT |
| `keepReachable` | 221 | varies | per-type `READ_KEY[type]` | NO | NO DEFECT |
| `readTickets` (`scope !== "all"`) | 241 | varies | per-type key | guarded | NO DEFECT |
| `readProjects` (`scope !== "all"`) | 297 | varies | per-type key | guarded | NO DEFECT |

`resolveWith` (line 65–66) calls `scopeFor(actor, permissions, readKey)` and immediately `return`s (skipping that reference) when `scope === "none"`. `keepReachable`, `readTickets`, and `readProjects` are only reachable for items that passed the `scope !== "none"` gate in `resolveWith`. No other-people's rows can leak.

---

### `src/modules/build/execution/timesheets.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listTimeEntries` userId filter | 81 | `timesheets:entries:view` (build controller) | `build:timesheets:view` via `resolveTimesheetsScope` | YES | NO DEFECT — safe pattern |
| `teamTimesheets` explicit deny | 268 | varies | same | YES | NO DEFECT — explicit ForbiddenException |
| `teamTimesheets` userId filter | 280 | same | same | blocked by line 268 | NO DEFECT |

`listTimeEntries`: keys differ (gate: `timesheets:entries:view`, scoped: `build:timesheets:view`). But the pattern is `applyScope(scope, ..., { ownerColumn: timesheets.userId })` + `if (query.userId && scope === "all")`. For "none": `applyScope("none") = sql\`false\`` → no rows. The widening filter never runs for "none". No other-people's rows returned.

`teamTimesheets`: `if (scope === "none") throw new ForbiddenException(...)` at line 268 — explicit deny before any query.

---

### `src/modules/dashboard/dashboard-leave.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `getLeavesToday` "none"→"own" | 45 | dashboard controller (universal) | `hr:leaves:view` via `resolveLeavesViewScope` | YES | NO DEFECT — self-service degradation |
| `getPendingApprovals` explicit deny | 103 | dashboard controller | `hr:leaves:approve` via `resolveLeavesDashboardScope` | YES | NO DEFECT — explicit deny |
| `getPendingApprovals` audience | 108 | same | same | blocked by line 103 | NO DEFECT |

`getLeavesToday`: `const scope = approvalScope === "none" ? "own" : approvalScope`. For "none", degrades to "own" → `applyScope("own", ...) = eq(leaveRequests.userId, userId)`. Shows only the actor's own leaves. This is a self-service dashboard widget; self-degradation is correct. No other people's data shown.

`getPendingApprovals`: `if (scope === "none") return { error: "forbidden" }` — explicit deny, no DB query.

---

### `src/modules/hr/performance/documents.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listDocuments` userId filter | 90 | `hr:documents:view` | same scope passed as param | depends on caller | NO DEFECT — safe pattern |

Scope is passed as a `DataScope` parameter from the controller, which resolves it with the gate key. All paths use `applyScope(scope, orgId, userId, { ownerColumn: documents.userId })` before the userId widening check. For "none": `applyScope("none") = false` → empty result. The `if (filters.userId && scope === "all")` block never executes for "none". No other-people's rows.

Same analysis applies to `getFileReference`, `createDocument`, `updateDocument`, `deleteDocument`, `stats`, `expiry` — all use `applyScope(scope, ...)` directly.

---

### `src/modules/hr/performance/performance-goals.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listGoals` userId filter | 43 | `hr:goals:view` | same scope passed as param | depends on caller | NO DEFECT — safe pattern |

Pattern: `applyScope(scope, orgId, userId, { ownerColumn: goals.userId })` + `if (filterUserId && scope === "all")`. For "none": `applyScope("none") = false` → empty. Safe.

---

### `src/modules/hr/time/leave-approver.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `includesSubject` | 102 | internal utility | `hr:leaves:approve` | YES | NO DEFECT — explicit handle |

Line 103: `if (scope === "none" || scope === "own") return false;` — explicit early return for "none", no query issued.

---

### `src/modules/hr/time/leaves.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `team` explicit deny | 103 | `hr:leaves:manage` | `hr:leaves:view` via `resolveLeavesViewScope` | YES | NO DEFECT — explicit ForbiddenException |
| `team` isAll branch | 109 | same | same | blocked by line 103 | NO DEFECT |
| `analytics` explicit deny | 214 | `hr:leaves:manage` | `hr:leaves:view` | YES | NO DEFECT — explicit ForbiddenException |

Both `team` and `analytics` have `if (scope === "none") throw new ForbiddenException(...)` before any `scope === "all"` branch.

---

### `src/modules/support/core/support-realtime.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `createTokenRequest` | 38 | `support:tickets:view` (realtime controller) | `support:tickets:view` via `resolveSupportTicketsViewScope` | NO | NO DEFECT — same key |

Gate key == scoped key (both `support:tickets:view`). PermissionGuard blocks "none" before handler runs. For completeness: if "none" reached, line 41–44 explicitly handles it with `ticketIds: []` (empty capability).

---

### `src/modules/support/core/support-reports.controller.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `getAgentPerformance` | 41 | `support:reports:view` | `support:tickets:view` via `resolveSupportTicketsViewScope` | YES | NO DEFECT — self-scoped only |

Keys differ: gate `support:reports:view`, scoped `support:tickets:view`. "none" on the scoped key → `scopeToUserId = u.userId`. Agent performance is filtered to the actor's own records only. By the stated criteria: "only flag it if the surface is administrative, where self-degradation silently shows an unauthorized user **someone's data**." The result here is the actor's **own** performance data, not another person's. No other-people's rows.

---

### `src/modules/timesheets/core/approvals.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listApprovals` userId filter | 152 | `timesheets:approvals:view` | `timesheets:approvals:view` via `resolveApprovalScope` | NO | NO DEFECT — same key |

Gate key == scoped key. `resolveApprovalScope` uses `TS_APPROVALS_VIEW_PERMISSION = "timesheets:approvals:view"` (verified in `timesheets-core-scope.ts`). PermissionGuard already blocked "none".

---

### `src/modules/timesheets/core/entries-read.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listEntries` userId filter | 32 | `timesheets:entries:view` | `timesheets:team:view` via `resolveEntriesScope` | YES | NO DEFECT — applyScope handles "none" |

Keys differ: gate `timesheets:entries:view`, scoped `timesheets:team:view`. "none" CAN reach. Pattern: `applyScope("none", ...) = sql\`false\`` → empty result. `if (query.userId && scope === "all")` never runs for "none". No other-people's rows.

**Note (not a security defect, reported as observation):** A regular user with `timesheets:entries:view` but "none" on `timesheets:team:view` will receive an empty list for their own entries. This is a UX gap — `resolveEntriesScope` using the team-view key to gate own-entry visibility — but not a data leak.

---

### `src/modules/timesheets/core/exceptions.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listExceptions` userId filter | 40 | `timesheets:exceptions:view` | `timesheets:team:view` via `resolveEntriesScope` | YES | NO DEFECT — applyScope handles "none" |

Keys differ. "none" CAN reach. Pattern: `applyScope("none", ...) = sql\`false\`` → empty. Safe.

---

### `src/modules/timesheets/core/periods.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `listPeriods` userId filter | 133 | `timesheets:entries:view` | `timesheets:team:view` via `resolveEntriesScope` | YES | NO DEFECT — applyScope handles "none" |
| `getPeriod` canSeeOthers check | 234 | `timesheets:entries:view` | `timesheets:team:view` | YES | NO DEFECT |

`listPeriods` for "none": `applyScope("none") = false` → empty. Safe.

`getPeriod` for "none": `canSeeOthers = u.isOrgOwner || false || false`. If the period belongs to another user and actor is not org owner → `throw new ForbiddenException(...)`. If it belongs to the actor → proceeds (own data). No other-people's rows.

---

### `src/modules/timesheets/core/reports.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `getOverview` userId filter | 33 | `timesheets:reports:view` | `timesheets:reports:view` via `resolveReportsScope` | NO | NO DEFECT — same key |
| `getUtilization` (no userId filter) | 121 | `timesheets:reports:view` | `timesheets:reports:view` | NO | NO DEFECT — same key |

Gate key == scoped key (`TS_REPORTS_VIEW_PERMISSION = "timesheets:reports:view"`). PermissionGuard blocks "none".

---

### `src/modules/timesheets/payroll/payroll-summary.service.ts`

| Site | Line | Gate key | Scoped key | "none" reachable | Verdict |
|------|------|----------|------------|------------------|---------|
| `getPeriodSummary` guard | 115 | `timesheets:payroll:view` | `timesheets:payroll:view` (resolved by controller) | NO | NO DEFECT — same key |
| `compute` entry filter | 154 | same | same | NO | NO DEFECT |
| `compute` leave filter | 185 | same | same | NO | NO DEFECT |

`payroll.controller.ts` line 61: `const scope = await resolvePayrollScope(this.access, u)` which uses `TS_PAYROLL_VIEW_PERMISSION = "timesheets:payroll:view"` — same as the route's `@RequirePermission`. Scope is passed as parameter to `getPeriodSummary`; "none" cannot reach because PermissionGuard already blocked it.

---

## 3. Fixes applied

**None.** Every `scope === "all"` site in the territory is safe by at least one of:

- Gate key == scoped key (PermissionGuard blocks "none" before handler)
- `applyScope("none", ...) = sql\`false\`` (no rows emitted)
- Explicit `if (scope === "none") throw/return` before any query
- Self-only degradation (actor's own data only, not other people's)

---

## 4. New tests written

**None.** No defects were confirmed, so no bite-proof tests are required.

---

## 5. Test suite runs

No new spec files were created. Existing specs for affected modules were not run (no changes were made; running would produce no new signal).

---

## 6. Key finding: `applyScope("none")` is already a hard deny

Verified in `src/modules/access/apply-scope.ts` line 29:

```typescript
case "none":
  return sql`false`;
```

This means any service that feeds `scope` directly to `applyScope` cannot leak other-people's rows for "none" — the DB predicate is always false. The defect class the task describes only manifests when code has a branch that bypasses `applyScope` entirely and returns other-people's rows (e.g., the original `getRecentProjects` where the else-branch queried `projectMembers` without a user constraint AND returned the results without a `applyScope` guard).

None of the services in this lane have that pattern. Every non-"all" branch either:
- Calls `applyScope(scope, ...)` (covers "none" with `false`)
- Throws/returns explicitly for "none"
- Degrades to own-user data only

---

## 7. Unresolved items

None. Every site was fully resolved against source.

---

## 8. Evidence base

All conclusions are drawn from direct source reads:

| File | Read scope |
|------|------------|
| `src/modules/access/apply-scope.ts` | Full |
| `src/common/cache/org-hierarchy-cache.service.ts` | Full |
| `src/modules/autonomy/autonomy-review.service.ts` | Full |
| `src/modules/autonomy/autonomy-review.controller.ts` | Full |
| `src/modules/build/entity/build-entity-reads.service.ts` | Full |
| `src/modules/build/execution/timesheets.service.ts` | Full |
| `src/modules/dashboard/dashboard-leave.service.ts` | Full |
| `src/modules/dashboard/dashboard-scope.ts` | Full |
| `src/modules/hr/performance/documents.service.ts` | Full |
| `src/modules/hr/performance/performance-goals.service.ts` | Full |
| `src/modules/hr/time/leave-approver.service.ts` | Full |
| `src/modules/hr/time/leaves.service.ts` | Full |
| `src/modules/support/core/support-realtime.service.ts` | Full |
| `src/modules/support/core/support-reports.controller.ts` | Full |
| `src/modules/support/core/support-tickets-scope.ts` | Full |
| `src/modules/timesheets/core/approvals.service.ts` | Full |
| `src/modules/timesheets/core/approvals.controller.ts` | Full |
| `src/modules/timesheets/core/entries-read.service.ts` | Full |
| `src/modules/timesheets/core/entries.controller.ts` | Full |
| `src/modules/timesheets/core/exceptions.service.ts` | Full |
| `src/modules/timesheets/core/exceptions.controller.ts` | Full |
| `src/modules/timesheets/core/periods.service.ts` | Full |
| `src/modules/timesheets/core/periods.controller.ts` | Full |
| `src/modules/timesheets/core/reports.service.ts` | Full |
| `src/modules/timesheets/core/reports.controller.ts` | Full |
| `src/modules/timesheets/core/timesheets-core-scope.ts` | Full |
| `src/modules/timesheets/payroll/payroll-summary.service.ts` | Full |
| `src/modules/timesheets/payroll/payroll.controller.ts` | Full |
| `src/modules/dashboard/dashboard-project.service.ts` | Full (reference) |
| `src/modules/dashboard/dashboard-project.service.spec.ts` | Full (reference) |
