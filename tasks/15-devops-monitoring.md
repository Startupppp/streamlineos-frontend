# Task 15: DevOps & Monitoring

## Priority: MEDIUM | Effort: 2-3 days | Dependencies: None | Status: NOT STARTED

---

## PRD

### Problem Statement
The application lacks production observability:
1. **No error tracking**: Errors are logged to console, not aggregated or alerted
2. **No performance monitoring**: No APM, no p95/p99 response time tracking
3. **No structured logging**: Console.log scattered throughout, no centralized log aggregation
4. **No uptime monitoring**: No alerts when the application goes down
5. **No deployment previews**: No preview environments for PRs
6. **CI pipeline gaps**: No test step, no bundle size check, no type check step
7. **No database monitoring**: No query performance tracking, no connection pool monitoring

### Goals
- Integrate Sentry for error tracking and performance monitoring
- Add structured logging with context (user ID, org ID, request ID)
- Add uptime monitoring with alerting
- Enhance CI pipeline with tests, type checking, bundle analysis
- Add database query monitoring
- Create operational dashboard for system health

### Non-Goals
- Custom monitoring infrastructure (use SaaS tools)
- Log storage/analysis (use Sentry/Vercel built-in)
- Complex deployment strategies (blue-green, canary)

### Success Criteria
- All unhandled errors reported to Sentry with full context
- Response time p95 tracked and alerted if >2s
- CI pipeline catches type errors, lint errors, test failures, and bundle bloat
- Uptime alerts sent within 1 minute of outage
- Database slow queries identified and alerted

---

## Rules to Follow

1. **No Console.log in Production**: Use structured logger
2. **Context in Every Log**: Include userId, orgId, requestId, action
3. **Alert on Anomalies**: Don't just log - alert on error spikes, slow queries, downtime
4. **Minimize Overhead**: Monitoring should add <5ms latency per request
5. **Privacy-Aware Logging**: Never log passwords, tokens, PII in plain text
6. **Environment Awareness**: Different log levels per environment (debug in dev, error in prod)

---

## Implementation Steps

### Step 1: Sentry Integration

**Install**: `pnpm add @sentry/nextjs`

**Setup**: `npx @sentry/wizard@latest -i nextjs`

**Files created**:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/global-error.tsx` - Global error boundary with Sentry reporting

**Configuration**:
```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions for performance
  profilesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Scrub PII: email, name, IP
    return event;
  },
});
```

**Integration points**:
- tRPC error handler middleware → report to Sentry
- API route catch blocks → report to Sentry
- Server action catch blocks → report to Sentry
- Client error boundaries → report to Sentry
- Cron job failures → report to Sentry

### Step 2: Structured Logging

**Update**: `lib/logger.ts` (enhance existing)
```ts
type LogContext = {
  userId?: string;
  orgId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
};

function info(message: string, context?: LogContext): void
function warn(message: string, context?: LogContext): void
function error(message: string, error: unknown, context?: LogContext): void
```

**Replace all `console.log`** with structured logger calls throughout codebase.

### Step 3: Enhance CI Pipeline

**Update**: `.github/workflows/ci.yml`
```yaml
jobs:
  quality:
    steps:
      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Type Check
        run: pnpm tsc --noEmit

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test --coverage

      - name: Build
        run: pnpm build

      - name: Bundle Analysis
        run: npx @next/bundle-analyzer
        # Comment on PR with bundle size changes
```

### Step 4: Health Check Enhancement

**Update**: `app/api/health/route.ts`
Add comprehensive checks:
```ts
{
  status: "healthy" | "degraded" | "unhealthy",
  checks: {
    database: { status, latency_ms },
    redis: { status, latency_ms },
    email: { status },
    storage: { status },
  },
  uptime_seconds: number,
  version: string,
  timestamp: string,
}
```

### Step 5: Database Query Monitoring

**Add to Drizzle logger**:
```ts
const db = drizzle(client, {
  logger: {
    logQuery(query, params) {
      const duration = /* measure */;
      if (duration > 1000) {
        logger.warn("Slow query detected", {
          query: query.substring(0, 200),
          duration,
        });
        Sentry.captureMessage("Slow DB query", { extra: { query, duration } });
      }
    },
  },
});
```

### Step 6: Uptime Monitoring

**Options** (pick one):
- **Vercel**: Built-in monitoring (if deployed on Vercel)
- **BetterUptime**: Free tier, monitors `/api/health`, alerts via Slack/email
- **UptimeRobot**: Free tier, 5-minute checks

**Configure**:
- Monitor: `https://your-domain.com/api/health`
- Check interval: 1 minute
- Alert channels: Email + Slack
- Escalation: If down >5 minutes, alert on-call

---

## Checklist

- [ ] Install and configure `@sentry/nextjs`
- [ ] Create `sentry.client.config.ts`, `sentry.server.config.ts`
- [ ] Create `app/global-error.tsx` with Sentry reporting
- [ ] Add Sentry to tRPC error middleware
- [ ] Add Sentry to all API route error handlers
- [ ] Enhance `lib/logger.ts` with structured logging
- [ ] Replace all `console.log` with structured logger
- [ ] Add type check step to CI (`pnpm tsc --noEmit`)
- [ ] Add test step to CI (`pnpm test --coverage`)
- [ ] Add bundle analysis to CI
- [ ] Enhance health check endpoint with latency metrics
- [ ] Add Drizzle query logging with slow query detection
- [ ] Set up uptime monitoring service
- [ ] Configure alert channels (email, Slack)
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to env
- [ ] `pnpm build` passes with Sentry
- [ ] Verify errors appear in Sentry dashboard
- [ ] Verify slow queries are logged

---

## Acceptance Criteria

1. Unhandled errors appear in Sentry within 30 seconds
2. Performance transactions tracked with p95/p99
3. CI pipeline runs: type check, lint, test, build (in that order)
4. Health check returns latency for each service
5. Slow queries (>1s) are logged and alerted
6. Uptime monitoring alerts within 1 minute of outage
7. Zero `console.log` statements in production code

---

## Testing Plan

1. **Sentry**: Throw an error in a component, verify it appears in Sentry dashboard
2. **CI**: Push a PR with type error, verify CI fails
3. **Health Check**: Stop Redis, verify health check reports "degraded"
4. **Slow Query**: Add artificial delay to a query, verify slow query alert
5. **Uptime**: Temporarily return 500 from health check, verify uptime alert fires
