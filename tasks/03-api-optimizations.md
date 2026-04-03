# Task 03: API Optimizations

## Priority: 🟠 HIGH

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

**Acceptance Criteria**:
- All list endpoints support pagination
- Dashboard loads in <500ms with caching
- Bulk operations don't block requests
- Rate limiting persists across deployments
