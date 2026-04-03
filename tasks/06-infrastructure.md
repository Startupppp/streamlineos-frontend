# Task 06: Infrastructure — Redis, Background Jobs, Feature Flags

## Priority: 🔴 CRITICAL (Unblocks Tasks 03, 04, 05)

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

**Acceptance Criteria**:
- Redis client connects to Upstash
- Cache utility works with TTL
- Inngest functions registered and running
- Rate limiting persists across deployments
- Feature flags toggle features
