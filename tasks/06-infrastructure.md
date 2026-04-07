# Task 06: Infrastructure — Redis, Background Jobs, Feature Flags

## Priority: CRITICAL (Unblocks Tasks 01, 03, 04, 05) | Effort: 2-3 days | Dependencies: None | Status: NOT STARTED

---

## PRD

### Problem Statement
1. No Redis — no caching, in-memory rate limiting, no session store
2. No background job system — cron jobs are HTTP-triggered with no retry/queue/progress
3. No feature flags — can't gradually roll out features
4. In-memory state (rate limits, idempotency keys) lost on restart/deploy
5. JWT callback queries DB on EVERY request (~70% of all DB queries)

### Goals
- Set up Upstash Redis with caching, rate limiting, session utilities
- Set up Inngest for background jobs and cron migration
- Create simple Redis-based feature flags
- Migrate existing cron jobs from HTTP-triggered to Inngest

### Non-Goals
- Full feature flag service (LaunchDarkly)
- Queue systems (RabbitMQ, SQS) — Inngest handles this
- Kubernetes

### Success Criteria
- Redis connected with health check
- At least 3 cron jobs migrated to Inngest
- Rate limiting survives restarts
- Cache utility available for all endpoints

## Rules to Follow

1. **Upstash Redis**: Use `@upstash/redis` (serverless, edge-compatible)
2. **Upstash Ratelimit**: Use `@upstash/ratelimit` for rate limiting
3. **Inngest**: Use `inngest` for background jobs and cron
4. **Environment Variables**: All credentials in env vars
5. **Graceful Fallback**: If Redis is down, app still works (no cache, direct DB)
6. **Health Checks**: Each service must have a health check

---

## Implementation Steps

### 6.1 Add Upstash Redis

**Install**: `pnpm add @upstash/redis @upstash/ratelimit`

**New file**: `lib/redis.ts`
```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**New file**: `lib/cache.ts`
```typescript
import { redis } from "./redis";

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;
  const data = await fetcher();
  await redis.set(key, data, { ex: ttlSeconds });
  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Env vars needed**:
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

### 6.2 Add Inngest for Background Jobs

**Install**: `pnpm add inngest`

**New files**:
- `lib/inngest.ts` — Client initialization
- `app/api/inngest/route.ts` — Inngest webhook handler

**Migrate existing cron jobs** from Vercel cron API routes to Inngest functions:
- `api/cron/daily-notifications` → `inngest.createFunction("daily-notifications", ...)`
- `api/cron/auto-checkout` → `inngest.createFunction("auto-checkout", ...)`
- `api/cron/weekly-attendance-report` → Inngest scheduled function
- `api/cron/weekly-ceo-recap` → Inngest scheduled function
- `api/cron/monthly-expense-report` → Inngest scheduled function
- `api/cron/monthly-leave-reset` → Inngest scheduled function
- `api/cron/holiday-notifications` → Inngest scheduled function
- `api/cron/scheduled-reports` → Inngest scheduled function

**New Inngest functions**:
- `email/send-bulk` — Queue-based bulk email
- `leads/sla-check` — Every 15 min, check SLA breaches
- `appraisal/send-reminders` — Quarterly appraisal cycle reminders
- `reports/generate` — Heavy report generation

---

### 6.3 Migrate Rate Limiting to Redis

**Current**: In-memory Map in `lib/rate-limit.ts`

**Fix**: Replace with Upstash Rate Limit:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "rl:auth",
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  prefix: "rl:api",
});
```

---

### 6.4 Feature Flags (Simple)

**New file**: `lib/feature-flags.ts`
```typescript
import { redis } from "./redis";

const FLAGS = {
  ENABLE_AI_CHAT: "ff:ai_chat",
  ENABLE_PUSH_NOTIFICATIONS: "ff:push",
  ENABLE_CALENDAR: "ff:calendar",
  ENABLE_COMPLIANCE: "ff:compliance",
} as const;

export async function isFeatureEnabled(flag: keyof typeof FLAGS): Promise<boolean> {
  const value = await redis.get(FLAGS[flag]);
  return value === "true";
}
```

---

## Checklist

- [ ] Install `@upstash/redis`, `@upstash/ratelimit`, `inngest`
- [ ] Create Upstash Redis account, get credentials
- [ ] Create `lib/redis.ts` with Redis client + cache utilities
- [ ] Rewrite `lib/rate-limit.ts` using Upstash Ratelimit
- [ ] Create `lib/inngest/client.ts` (Inngest client)
- [ ] Create `app/api/inngest/route.ts` (Inngest serve endpoint)
- [ ] Migrate `auto-checkout` cron to Inngest function
- [ ] Migrate `daily-notifications` cron to Inngest function
- [ ] Migrate `weekly-attendance-report` cron to Inngest function
- [ ] Migrate `weekly-ceo-recap` cron to Inngest function
- [ ] Migrate `monthly-expense-report` cron to Inngest function
- [ ] Migrate `monthly-leave-reset` cron to Inngest function
- [ ] Migrate `holiday-notifications` cron to Inngest function
- [ ] Migrate `scheduled-reports` cron to Inngest function (fix empty TODOs)
- [ ] Create `lib/feature-flags.ts` with Redis-based flags
- [ ] Update `app/api/health/route.ts` with Redis status
- [ ] Update middleware.ts to use Redis rate limiting
- [ ] Update `.env.example` with UPSTASH_* and INNGEST_* vars
- [ ] Update `vercel.json` cron config (keep as backup or remove)
- [ ] Add JWT session caching in `lib/auth.ts` (Redis, 300s TTL)
- [ ] Test Redis connection and caching
- [ ] Test Inngest function execution
- [ ] `pnpm build` passes

## Acceptance Criteria

1. `redis.ping()` returns "PONG" in health check
2. Rate limits persist across server restarts
3. At least 3 Inngest functions execute on schedule
4. Cache utility correctly caches and invalidates
5. Feature flags toggleable via Redis CLI
6. JWT callback <10ms for cached users (vs ~50ms uncached)
7. Health check returns status of all services

## Testing Plan

1. Set a Redis key, restart server, get the key, verify it persists
2. Hit endpoint 100+ times in 1 minute, verify 429 after limit
3. Trigger Inngest function manually via dev server, verify execution
4. Wait for scheduled time, verify Inngest cron fires
5. Set feature flag to false, verify feature disabled
6. Stop Redis, verify health check reports unhealthy but app still works
