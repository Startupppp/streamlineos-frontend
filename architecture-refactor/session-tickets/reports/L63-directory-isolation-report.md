# L63 — Directory Tenant Isolation Report

**File fixed:** `src/modules/hr/directory/directory-tenant-isolation.spec.ts`

---

## Root cause per test

### 1. `EmployeeMutationsService — cross-tenant isolation › returns detail for a member of the owning org (CONTROL)`

**Root cause: broken double — `getFacts` mock returned `null`.**

`EmploymentFactsService.getFacts` returns `Promise<EmploymentFacts>` (never `null`; the real implementation falls back to `emptyEmploymentFacts(userId)`). The test's `makeEmploymentFactsMock()` set `getFacts: jest.fn().mockResolvedValue(null)`. After the member lookup succeeds, `getEmployeeDetail` accesses `facts.managerUserId` unconditionally (line 133), throwing `TypeError: Cannot read properties of null`.

The DENY sibling passed only because the service short-circuits at `if (!member?.user) return null` — it never reaches `facts.managerUserId` when no member row is found.

**Fix:** Added `employment.getFacts.mockResolvedValue({ userId: "target-1", employmentId: null, ... managerUserId: null })` in the CONTROL test, matching `emptyEmploymentFacts` shape.

No change to the shared `makeEmploymentFactsMock()` — only the CONTROL test needed a non-null facts object.

---

### 2 & 3. `OrgStructureService — cross-tenant isolation` — both DENY and CONTROL

**Root cause: broken double — tests asserted on `where` but the org predicate lives in `innerJoin`.**

`buildDirectory` structures its query as:

```ts
db.select({...})
  .from(users)
  .innerJoin(organizationMembers,
    and(eq(organizationMembers.userId, users.id),
        eq(organizationMembers.orgId, orgId)))   // ← org predicate here
  .where(and(
    eq(users.isActive, true),
    applyScope(scope, orgId, actorUserId, {...})  // returns sql`true` for scope="all"
  ))
```

With `scope = "all"`, `applyScope` returns `sql\`true\``, so the `where` argument is `and(eq(users.isActive, true), sql\`true\`)`. The `sqlValues` walker extracted `["(", "", " = ", true, "", " and ", "true", ")"]` — no orgId. Both tests asserted `where.mock.calls[0]?.[0]` contains `"org-attacker"` / `"org-owner"`, which failed.

The service has **no real cross-tenant isolation hole**. The `innerJoin` condition `eq(organizationMembers.orgId, orgId)` correctly restricts results to the caller's org.

**Fix:** Changed both tests to destructure `innerJoin` from `makeDb(...)` and assert on `innerJoin.mock.calls[0]?.[1]` (the join condition argument), which does contain the orgId.

---

## No real isolation holes

All three failures were broken test doubles, not service bugs. The services scope correctly:
- `EmployeeMutationsService.getEmployeeDetail`: `findFirst` with `and(eq(orgId), eq(userId))` — both predicates present.
- `OrgStructureService.buildDirectory`: `innerJoin(organizationMembers, and(..., eq(organizationMembers.orgId, orgId)))` — org-scoped join.

---

## DENY test bites — proven

After fixing the OrgStructureService DENY test, I temporarily neutered the isolation check in the double by changing `innerJoin.mock.calls[0]?.[1]` to `innerJoin.mock.calls[99]?.[1]` (wrong call index → `undefined`). Result: `expect([undefined]).toContain("org-attacker")` failed with:

```
Expected value: "org-attacker"
Received array: [undefined]
```

Restored to `[0]?.[1]` immediately.

---

## Verification counts

| Command | Result |
|---|---|
| `jest --testPathPattern="directory-tenant-isolation" --maxWorkers=1` | **20 passed, 0 failed** |
| `jest --testPathPattern="directory" --maxWorkers=2` | **234 passed, 30 suites** |
| `pnpm check:tenant-isolation` | 61 missing (93% covered) — **pre-existing, unchanged** |

`pnpm typecheck` not run (requires 8 GB heap; spec-only changes are type-safe: `mockResolvedValue` accepts `unknown`, `innerJoin` is already in `makeDb` return type).
