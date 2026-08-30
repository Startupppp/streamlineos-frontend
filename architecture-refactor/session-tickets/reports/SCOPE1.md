# SCOPE1 — apply-scope team fallback: no-op predicate removed

## Finding

Reading **(A) is correct.** Tenant scoping for attendance and leaves reads lives elsewhere; `applyScope` is not the tenant boundary.

## Evidence

| Source | Fact |
|---|---|
| `apply-scope.ts:19` | `all` returns bare `sql\`true\`` — a gaping cross-tenant hole if `applyScope` were the tenant boundary; it is not. |
| `apply-scope-team.spec.ts:32-39` | Explicitly documents "no caller supplies teamIds yet — team scope falls back to own, not a subquery." |
| `attendance-summary.service.ts:102` | `eq(organizationMembers.orgId, orgId)` is already in the query before `attendanceMemberScope` is added. |
| `attendance.service.ts:408` | `eq(attendance.orgId, u.orgId)` already in `where` clause before `attendanceMemberScope` is called. |
| `dashboard-home-scope.spec.ts:63,76` | **Already RED before this fix** — asserts team fallback SQL equals own SQL, and that there are exactly 3 distinct predicates. The no-op `AND $2::text IS NOT NULL` made team produce a 4th distinct form. |

RLS via `current_org_id()` provides the actual second layer of tenant isolation.

## Root cause

`apply-scope.ts` team fallback line 27 was:

```ts
return and(eq(cols.ownerColumn, userId), sql`${orgId}::text IS NOT NULL`)!;
```

`'o1'::text IS NOT NULL` is always true. It constrains nothing. It existed only to bind `orgId` as a SQL parameter, which made `attendance-scope.spec.ts` and `leaves-scope.spec.ts` tests pass while testing the no-op rather than the real mechanism. Meanwhile, `dashboard-home-scope.spec.ts` was already failing because it correctly asserted the team fallback should produce the same SQL as `own`.

## Fix

**`backend/src/modules/access/apply-scope.ts`**
- Renamed `orgId` → `_orgId` (genuinely unused; tenant scoping is the caller's responsibility)
- Removed the no-op `sql\`${orgId}::text IS NOT NULL\`` from the team fallback
- Removed unused `and` import
- Team fallback now: `return eq(cols.ownerColumn, userId)` — identical to `own`, as `apply-scope-team.spec.ts` and `dashboard-home-scope.spec.ts` already required

**`backend/src/modules/hr/time/attendance-scope.spec.ts`**
- Rewrote test "binds team summary reads to the actor's tenant teams"
- New name: "falls back to owner-only when no team members are resolved"
- New assertion: `expect(compiled.params).toEqual(["manager-1"])` — only the actor userId bound, not orgId

**`backend/src/modules/hr/time/leaves-scope.spec.ts`**
- Rewrote test "requires both assignment and team visibility for team scope"
- New name: "requires approver assignment and falls back to own when no team members are resolved"
- New assertion: `expect(compiled.params).toEqual(["approver-1", "approver-1"])` — both the approverId predicate and the owner fallback bind the actor's id

## Red/green proof

**Neuter:** temporarily changed team fallback to `return sql\`true\`` (widens to all rows).

**RED observed:** attendance test expected `["manager-1"]`, received 3 params (with orgId included by no-op); leaves test expected `["approver-1","approver-1"]`, received 1 param; `apply-scope.spec.ts` "never widens to every row" failed; `dashboard-home-scope.spec.ts` "not true" check failed.

**Restore:** reverted fallback to `eq(cols.ownerColumn, userId)`.

**GREEN:** all 47 tests across 5 suites pass.

## Validation

- 5 test suites, 47 tests — all GREEN after fix
- `dashboard-home-scope.spec.ts` 2 previously-failing tests now pass
- `apply-scope-team.spec.ts` "no caller supplies teamIds yet" continues to pass, confirming the team fallback path is always taken in production
- Lint/build not run (per CLAUDE.md: not run unless explicitly asked)
