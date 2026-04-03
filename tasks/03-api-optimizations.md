# Task 03: API Optimizations

## Priority: HIGH | Effort: 4-5 days | Dependencies: Task 02 (DB), Task 06 (Redis) | Status: NOT STARTED

---

## PRD

### Problem Statement
1. Large router files: `leads.ts` (1450 lines/57KB), `crm.ts` (26KB) are hard to maintain
2. No caching: every request hits the database
3. Offset pagination degrades on large datasets
4. Bulk operations run synchronously (email, CSV import, report generation)
5. Inconsistent error shapes across endpoints
6. Many tRPC procedures lack Zod input validation
7. Some routers do in-memory filtering instead of DB aggregation (e.g., crm.ts getSalesDashboard fetches all deals then filters in JS)

### Goals
- Split large router files into focused modules
- Add Redis caching for frequently-read data
- Migrate to cursor-based pagination
- Move heavy operations to background jobs
- Standardize error response shape
- Fix in-memory filtering anti-patterns with proper DB queries

### Non-Goals
- Removing tRPC (separate task 01b)
- Adding GraphQL
- Building a public API

### Success Criteria
- No router file exceeds 500 lines
- Dashboard loads 2x faster (cached stats)
- List endpoints handle 100K+ records without degradation
- All errors follow standard shape

## Rules to Follow

1. **Cache-aside pattern**: Read cache first, fallback to DB, write to cache on miss
2. **Cache Invalidation**: Invalidate on mutation using cache tags
3. **Pagination**: Use cursor (createdAt + id composite) instead of offset
4. **Background Jobs**: Any operation >5s should be a background job
5. **Transaction**: Use DB transactions for multi-step writes
6. **DB Aggregation**: Never fetch all rows and filter in JS — use SQL aggregation

---

## Implementation Steps

### 3.1 Break Up Large Router Files

**Targets**:
- `server/api/routers/leads.ts` (57KB) → split into `leads-queries.ts` + `leads-mutations.ts`
- `server/api/routers/crm.ts` (26KB) → split by subdomain
- `server/api/routers/dashboard.ts` (14KB) → OK but add caching

---

### 3.2 Add Redis Caching Layer

**New files**:
- `lib/redis.ts` — Upstash Redis client
- `lib/cache.ts` — `cached<T>(key, ttl, fetcher): Promise<T>` utility

**Cache targets** (key → TTL):
- `dashboard:stats:{orgId}` → 60s
- `user:profile:{userId}` → 300s
- `leads:count:{orgId}` → 30s
- `org:settings:{orgId}` → 600s
- `notifications:unread:{userId}` → 30s

**Invalidation**:
- On mutation → delete relevant cache key
- Use `revalidateCache(pattern)` helper

---

### 3.3 Add Cursor-Based Pagination to All List Endpoints

**Pattern**:
```typescript
const paginatedList = protectedProcedure
  .input(z.object({
    cursor: z.number().optional(),
    limit: z.number().min(1).max(100).default(25),
    // ...filters
  }))
  .query(async ({ ctx, input }) => {
    const items = await ctx.db.query.leads.findMany({
      where: and(
        eq(leads.orgId, ctx.session.orgId),
        input.cursor ? gt(leads.id, input.cursor) : undefined,
      ),
      limit: input.limit + 1,
      orderBy: [desc(leads.createdAt)],
    });
    
    const hasMore = items.length > input.limit;
    const data = hasMore ? items.slice(0, -1) : items;
    
    return {
      items: data,
      nextCursor: hasMore ? data[data.length - 1].id : undefined,
    };
  });
```

**Endpoints needing pagination**:
- notifications.getAll
- contacts.list
- leads.list (add cursor option alongside existing offset)
- deals.list
- expenses.list  
- attendance.list
- documents.list

---

### 3.4 Move Bulk Email to Background Jobs

**Current**: `sendBulkHolidayAnnouncement` sends emails synchronously.

**Fix**: Queue via Inngest:
```typescript
inngest.send({
  name: "email/bulk-send",
  data: { emails, templateId, context },
});
```

---

### 3.5 Add Proper Error Shapes to All API Responses

**Pattern**:
```typescript
type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

Wrap all tRPC outputs consistently.

---

### 3.6 Rate Limiting — Move to Redis

**Current**: In-memory `Map` in `lib/rate-limit.ts`.

**Problem**: Resets on server restart. Doesn't share across serverless instances.

**Fix**: Replace with Upstash Rate Limit:
```
pnpm add @upstash/ratelimit
```

### 3.7 Fix In-Memory Filtering Anti-Patterns

**Current**: `server/api/routers/crm.ts` `getSalesDashboard` fetches ALL deals then filters/calculates in JavaScript.

**Fix**: Use SQL `COUNT()`, `SUM()`, `GROUP BY` aggregations:
```ts
// Instead of: const allDeals = await db.query.deals.findMany(); const wonDeals = allDeals.filter(d => d.stage === 'WON');
// Use: SELECT stage, COUNT(*), SUM(value) FROM deals WHERE org_id = ? GROUP BY stage
```

### 3.8 Add Input Validation to All Procedures

Many tRPC procedures execute without `.input()` validation. Audit all procedures and add Zod schemas:
- `branches.getAll` — no input validation
- `dashboard.*` queries — minimal validation
- `notifications.*` queries — no filters validated

---

## Checklist

- [ ] Create `lib/api-utils.ts` with standard response shapes
- [ ] Create cursor pagination utility
- [ ] Split `leads.ts` (1450 lines) into queries/mutations/scoring/assignment/sla
- [ ] Split `crm.ts` (26KB) into queries/mutations submodules
- [ ] Add Redis caching to dashboard endpoints (requires Task 06)
- [ ] Add Redis caching to RBAC/auth endpoints (requires Task 06)
- [ ] Migrate leads.getAll to cursor pagination
- [ ] Migrate all other list endpoints to cursor pagination
- [ ] Move bulk operations to Inngest background jobs (requires Task 06)
- [ ] Add error handler middleware to tRPC
- [ ] Fix in-memory filtering in crm.ts getSalesDashboard
- [ ] Add Zod input validation to ALL procedures missing it
- [ ] Update client-side hooks for cursor pagination
- [ ] `pnpm build` passes

## Acceptance Criteria

1. No router file exceeds 500 lines
2. Dashboard loads in <500ms with caching
3. All list endpoints support cursor pagination
4. Bulk operations return immediately with job ID
5. All errors follow standard shape
6. All tRPC procedures have Zod input validation
7. No in-memory filtering for DB queries

## Testing Plan

1. Load 1000+ leads, paginate through all using cursor, verify no duplicates/gaps
2. Hit dashboard endpoint, verify Redis cache populated, hit again verify cache served
3. Create a lead, verify dashboard stats cache invalidated
4. Bulk update 100 leads, verify job completes and notification sent
5. Trigger validation error, verify consistent error shape returned
6. Verify DB aggregation queries with EXPLAIN ANALYZE
