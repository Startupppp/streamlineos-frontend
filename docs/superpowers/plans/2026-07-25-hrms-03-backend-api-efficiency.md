# HRMS Plan 03 — Backend API Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the confirmed unbounded/inefficient reads in the HRMS backend so every list/detail endpoint is bounded, projected, and paginated (CLAUDE.md §11, §19, §23).

**Architecture:** Three surgical service fixes, each covered by a unit test against a mocked Drizzle `db`. No schema changes, no permission changes, no product decisions. Parent-detail endpoints stop embedding full child collections; list endpoints return a bounded `{ data, pagination }` envelope; count-only stats use SQL aggregates instead of fetching rows into JS.

**Tech Stack:** NestJS · Drizzle ORM (Neon/Postgres) · Jest. Verify commands: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json` · `npx eslint <files>` · `npx jest <pattern>` — all run from `backend/`.

**Preconditions:** Plan 01 merged. Run every command from the `backend/` directory.

---

### Task 1: `getCycle` must not embed the full reviews collection

A review cycle detail (`GET /hr/performance/cycles/:cycleId`) currently does `with: { reviews: true }`, hydrating **every** review row (incl. heavy `ratings` JSONB, `comments`, `strengths`, `improvements` text) for the cycle on every call and every mutation invalidation — CLAUDE.md §11 ("never hydrate a collection through a parent-detail endpoint"). Fix: keep the `reviews` key for backward compatibility, but bound it (limit 100) and project only summary columns via a second query.

**Files:**
- Modify: `backend/src/modules/hr-performance/performance-reviews.service.ts` (method `getCycle`, currently ~line 431)
- Test: `backend/src/modules/hr-performance/performance-reviews.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe(...)` block in `performance-reviews.service.spec.ts`:

```typescript
describe("PerformanceReviewsService.getCycle — bounded, projected reviews", () => {
  function buildCycleService() {
    const findManyMock = jest.fn().mockResolvedValue([{ id: 10, userId: "u1", status: "DRAFT" }]);
    const db = {
      query: {
        reviewCycles: { findFirst: jest.fn().mockResolvedValue({ id: 1, orgId: "org-1", name: "H1" }) },
        performanceReviews: { findMany: findManyMock },
      },
    };
    const service = new PerformanceReviewsService(db as never, undefined as never, undefined as never);
    return { service, findManyMock };
  }

  it("returns the cycle with a bounded (limit 100) reviews array", async () => {
    const { service, findManyMock } = buildCycleService();
    const result = await service.getCycle("org-1", 1);
    expect(result).toMatchObject({ id: 1, name: "H1", reviews: [{ id: 10 }] });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest performance-reviews.service.spec --silent`
Expected: FAIL — current `getCycle` calls `reviewCycles.findFirst` with `with: { reviews: true }` and never calls `performanceReviews.findMany`, so `findManyMock` assertion fails.

- [ ] **Step 3: Replace `getCycle` with the bounded, projected implementation**

Replace the whole `getCycle` method:

```typescript
  async getCycle(orgId: string, cycleId: number) {
    const cycle = await this.db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, orgId)),
    });
    if (!cycle) throw new NotFoundException("Review cycle not found.");

    const reviews = await this.db.query.performanceReviews.findMany({
      where: and(eq(performanceReviews.orgId, orgId), eq(performanceReviews.cycleId, cycleId)),
      columns: {
        id: true,
        userId: true,
        reviewerId: true,
        status: true,
        overallRating: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      with: {
        user: { columns: { id: true, name: true, image: true } },
        reviewer: { columns: { id: true, name: true } },
      },
      orderBy: [desc(performanceReviews.createdAt)],
      limit: 100,
    });

    return { ...cycle, reviews };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest performance-reviews.service.spec --silent`
Expected: PASS (all prior tests + the 2 new ones).

- [ ] **Step 5: Verify the frontend consumer still renders**

Run: `cd ../frontend && npx grep -rn "cycles/" hooks/api/hr/performance.ts` (or search `features/hr/performance` for `.reviews`). The projected fields (`id, userId, reviewerId, status, overallRating, period*, createdAt` + `user`/`reviewer` names) must cover what the cycle-detail UI reads. If the UI reads a dropped heavy field (`ratings`/`comments`), it should fetch that via `GET /hr/performance/reviews/:reviewId` on drill-in — note it in the PR if so.
Expected: consumer reads only summary fields → no change needed.

- [ ] **Step 6: Commit**

```bash
git add src/modules/hr-performance/performance-reviews.service.ts src/modules/hr-performance/performance-reviews.service.spec.ts
git commit -m "perf(hr-performance): bound + project getCycle reviews (stop full-collection embed)"
```

---

### Task 2: `TerminationService.list` — paginate instead of a silent 500-row cap

`GET /hr/termination` calls `list(orgId)` which returns `.limit(500)` with no page/limit params and no envelope — large orgs are silently truncated and the UI can't page (§19). Convert to a bounded `{ data, pagination }` envelope with an optional status filter and a parallel count.

**Files:**
- Modify: `backend/src/modules/hr-lifecycle/termination.service.ts` (method `list`, ~lines 45-79)
- Modify: `backend/src/modules/hr-lifecycle/dto/hr-lifecycle.schemas.ts` (add query schema)
- Modify: `backend/src/modules/hr-lifecycle/termination.controller.ts` (the `GET` handler — read to find it)
- Modify (frontend): the hook that calls `GET /hr/termination` (read `frontend/hooks/api/hr` to find it) — consume `.data`/`.pagination`
- Test: `backend/src/modules/hr-lifecycle/termination.service.spec.ts` (create if absent)

- [ ] **Step 1: Add the query schema**

In `dto/hr-lifecycle.schemas.ts` add (near the other resignation/termination schemas):

```typescript
export const listTerminationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["DRAFT", "PENDING_CEO", "APPROVED", "REJECTED", "SENT", "COMPLETED"])
    .optional(),
});
export type ListTerminationsQueryInput = z.infer<typeof listTerminationsQuerySchema>;
```

(If the file already imports `z`, reuse it; do not re-import.)

- [ ] **Step 2: Write the failing test**

Create `backend/src/modules/hr-lifecycle/termination.service.spec.ts`:

```typescript
process.env.APP_URL ??= "http://localhost:1000";
import { TerminationService } from "./termination.service";

describe("TerminationService.list — paginated envelope", () => {
  function buildService(rows: unknown[], total: number) {
    const rowsChain = {
      from: () => rowsChain,
      leftJoin: () => rowsChain,
      where: () => rowsChain,
      orderBy: () => rowsChain,
      limit: () => rowsChain,
      offset: () => Promise.resolve(rows),
    };
    const countChain = { from: () => countChain, where: () => Promise.resolve([{ total }]) };
    let call = 0;
    const db = { select: jest.fn(() => (call++ === 0 ? rowsChain : countChain)) };
    return new TerminationService(
      db as never, undefined as never, undefined as never, undefined as never,
      undefined as never, undefined as never, undefined as never, undefined as never,
    );
  }

  it("returns { data, pagination } with a hard cap of 100", async () => {
    const service = buildService([{ id: 1 }], 137);
    const result = await service.list("org-1", { page: 2, limit: 500 });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.pagination).toEqual({ page: 2, limit: 100, total: 137, totalPages: 2 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest termination.service.spec --silent`
Expected: FAIL — current `list` takes only `orgId` and returns a query builder, not `{ data, pagination }`.

- [ ] **Step 4: Replace the `list` method**

Replace `list(orgId)` in `termination.service.ts` with (keep the same projection columns already present):

```typescript
  async list(orgId: string, params: ListTerminationsQueryInput) {
    const limit = Math.min(params.limit, 100);
    const offset = (params.page - 1) * limit;
    const conditions = [eq(terminations.orgId, orgId)];
    if (params.status) conditions.push(eq(terminations.status, params.status));
    const where = and(...conditions);

    const [data, countRows] = await Promise.all([
      this.db
        .select({
          id: terminations.id,
          orgId: terminations.orgId,
          userId: terminations.userId,
          status: terminations.status,
          reasons: terminations.reasons,
          detailedExplanation: terminations.detailedExplanation,
          effectiveDate: terminations.effectiveDate,
          severanceAmount: terminations.severanceAmount,
          noticePeriodWaived: terminations.noticePeriodWaived,
          internalNotes: terminations.internalNotes,
          createdAt: terminations.createdAt,
          updatedAt: terminations.updatedAt,
          ceoRemarks: terminations.ceoRemarks,
          ceoReviewedBy: terminations.ceoReviewedBy,
          ceoReviewedAt: terminations.ceoReviewedAt,
          emailSentAt: terminations.emailSentAt,
          emailStatus: terminations.emailStatus,
          initiatedBy: terminations.initiatedBy,
          employee: {
            id: users.id,
            name: users.name,
            email: users.email,
            designation: users.designation,
            employeeId: users.employeeId,
          },
        })
        .from(terminations)
        .leftJoin(users, eq(terminations.userId, users.id))
        .where(where)
        .orderBy(desc(terminations.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: sql<number>`count(*)` }).from(terminations).where(where),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return { data, pagination: { page: params.page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
```

Add `sql` to the drizzle import at the top of the file: `import { and, desc, eq, notInArray, sql } from "drizzle-orm";`. Import the type: `import type { TerminationCreateInput, TerminationReviewInput, ListTerminationsQueryInput } from "./dto/hr-lifecycle.schemas";`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest termination.service.spec --silent`
Expected: PASS.

- [ ] **Step 6: Update the controller**

Read `termination.controller.ts`, find the `GET` handler that calls `this.<svc>.list(...)`, and change it to validate + pass the query:

```typescript
  @Get()
  @RequirePermission("hr:exit:view")
  list(
    @Query(new ZodValidationPipe(listTerminationsQuerySchema)) query: ListTerminationsQueryInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.terminations.list(u.orgId, query);
  }
```

Add the imports (`Query`, `ZodValidationPipe`, `listTerminationsQuerySchema`, `ListTerminationsQueryInput`) if missing.

- [ ] **Step 7: Update the frontend consumer**

Find the hook (search `frontend/hooks/api/hr` for `/hr/termination`). Change its response type + any `.map` from the bare array to `{ data, pagination }`, and thread `page`/`limit` params (mirror an existing paginated HR hook, e.g. the delegations `listOrg` consumer). Wire the list page to render `pagination` (reuse the shared `DataTable` `pagination` prop). Run `cd frontend && npx tsc --noEmit` — expect 0 new errors.

- [ ] **Step 8: Backend typecheck + lint + commit**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
npx eslint src/modules/hr-lifecycle/termination.service.ts src/modules/hr-lifecycle/termination.controller.ts src/modules/hr-lifecycle/dto/hr-lifecycle.schemas.ts
git add src/modules/hr-lifecycle/ ../frontend/hooks/api/hr
git commit -m "perf(hr-lifecycle): paginate termination list (envelope + status filter, ≤100 cap)"
```
Expected: tsc exit 0, eslint exit 0.

---

### Task 3: `employees.getStats` — aggregate in SQL, don't fetch rows to count; cap `getSkillsMatrix`

`GET /hr/employees/stats` fetches **all** of a user's `leaveRequests` + `attendance` rows for the year and counts them in JS (§19 N+1/scan). `getSkillsMatrix` does an unbounded `employeeSkills.findMany`. Fix both: SQL `COUNT(*) FILTER (...)` for stats (model: `incentives.getIncentiveStats`), and a hard `limit` on the skills matrix.

**Files:**
- Modify: `backend/src/modules/hr-directory/employees.service.ts` (`getStats` ~lines 189-209)
- Modify: `backend/src/modules/hr-directory/employee-skills.service.ts` (`getSkillsMatrix` ~line 194)
- Test: `backend/src/modules/hr-directory/employees.service.spec.ts` (create if absent)

- [ ] **Step 1: Read the current code to lock the return shape**

Run: `sed -n '180,300p' src/modules/hr-directory/employees.service.ts` and note the exact object keys `getStats` returns (e.g. `approvedLeaves`, `pendingLeaves`, `presentDays`…). The replacement MUST return the identical keys so the frontend is untouched. Do the same for `getSkillsMatrix` (`sed -n '185,230p' src/modules/hr-directory/employee-skills.service.ts`).

- [ ] **Step 2: Write the failing test**

Create `employees.service.spec.ts` asserting `getStats` issues aggregate queries (no `findMany` of raw rows). Mock `db.select().from().where()` to resolve one aggregate row `{ approved: 3, pending: 1, rejected: 0, presentDays: 20 }` and assert the returned object maps those to the exact keys captured in Step 1, and that `db.query.leaveRequests.findMany` / `db.query.attendance.findMany` are **not** called.

```typescript
process.env.APP_URL ??= "http://localhost:1000";
import { EmployeesService } from "./employees.service";
// Build a db mock whose select-chain resolves the aggregate row; assert findMany is never used.
// (Fill the constructor args with `undefined as never` to match the real DI list captured in Step 1.)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest employees.service.spec --silent`
Expected: FAIL — current impl calls `findMany` and counts in JS.

- [ ] **Step 4: Replace the row-fetch counting with a single aggregate query**

Model on `incentives.getIncentiveStats` (`hr-payroll/incentives.service.ts:80`). Example shape (adapt column/key names to Step 1):

```typescript
    const [agg] = await this.db
      .select({
        approvedLeaves: sql<string>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'APPROVED')`,
        pendingLeaves: sql<string>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'PENDING')`,
        rejectedLeaves: sql<string>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'REJECTED')`,
      })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.userId, userId)));
    // attendance present-days in a second aggregate (Promise.all with the above), then map to the exact keys from Step 1.
```

Wrap the two independent aggregates in `Promise.all`. Return the **same object keys** captured in Step 1 (`Number(agg?.approvedLeaves ?? 0)` per §7 no-force-cast rule).

- [ ] **Step 5: Cap `getSkillsMatrix`**

In `employee-skills.service.ts`, add `limit: 5000` to the `employeeSkills.findMany({ where: eq(employeeSkills.orgId, orgId) })` call and `log()`-note the ceiling, OR (preferred) restructure to a projected aggregate if the matrix only needs `(userId, skillId, level)` — pick per Step-1 read. Minimum acceptable: a bounded `limit`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest employees.service.spec --silent`
Expected: PASS.

- [ ] **Step 7: Typecheck + lint + commit**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
npx eslint src/modules/hr-directory/employees.service.ts src/modules/hr-directory/employee-skills.service.ts src/modules/hr-directory/employees.service.spec.ts
git add src/modules/hr-directory/
git commit -m "perf(hr-directory): SQL-aggregate employee stats + cap skills matrix"
```
Expected: tsc exit 0, eslint exit 0.

---

### Task 4: Sweep-verify remaining HR list endpoints are hard-capped ≤100

**Files:** read-only sweep across `backend/src/modules/hr-*` services.

- [ ] **Step 1: Find unbounded `findMany`/`select` without a limit**

Run: `grep -rn "findMany(" src/modules/hr-* | grep -v "limit" | head -60` and `grep -rn "\.limit(" src/modules/hr-* | grep -vE "limit\((100|Math\.min|[0-9]{1,2})\)"`.
Expected: a shortlist of list reads. For each that can grow unbounded, add `limit: Math.min(params.limit ?? 50, 100)` + envelope (repeat the Task-2 pattern). Anything already ≤100 or a genuine bounded lookup (single-parent children) needs no change — record which in the PR so nothing is silently skipped.

- [ ] **Step 2: Commit any fixes**

```bash
git add src/modules/hr-*
git commit -m "perf(hr): enforce ≤100 cap on remaining HR list reads"
```

---

## Definition of Done (this plan)
- `getCycle` no longer embeds the full reviews collection; bounded + projected.
- `GET /hr/termination` returns `{ data, pagination }`, ≤100/page, status filter, parallel count.
- `getStats` uses SQL aggregates (no row-fetch-to-count); `getSkillsMatrix` bounded.
- No HR list read returns an unbounded collection (Task 4 sweep clean or explained).
- `tsc --noEmit -p tsconfig.build.json` ✓ · `eslint` ✓ · `jest hr-performance hr-lifecycle hr-directory` ✓.
- `PAGES.md` entry added; frontend `tsc` ✓ for the termination-consumer change.

## Self-review notes
- **Spec coverage:** covers §11 (parent-detail embed), §19 (pagination cap), §23 (no unbounded DOM/rows) for the confirmed HR hotspots. Cache-invalidation + transaction fixes are intentionally deferred to Plan 04 (different risk profile).
- **Type consistency:** `list(orgId, params)` signature is used identically in service, controller, and test; `ListTerminationsQueryInput` is the single source (z.infer). `getCycle` return keeps the `reviews` key (superset-safe).
- **No forced types:** aggregate rows read via `Number(row?.field ?? 0)`, never `as { count: string }` (§7).
