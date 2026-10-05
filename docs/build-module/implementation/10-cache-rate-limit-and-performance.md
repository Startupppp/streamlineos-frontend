# 10 — Cache, rate limit, and performance

Status: Current unverified infrastructure plus Planned uniform policy

## Cache layers

| Layer | Canonical source | Scope/key | Policy |
|---|---|---|---|
| Browser/TanStack | `frontend/lib/query-keys/build-work.ts` | base + org context + project/record + normalized params + actor when personal | Deduplicate in-flight reads; bounded stale times; clear/partition on org/access changes. |
| Backend application | `backend/src/common/cache/cache.service.ts` | namespace includes tenant and revision; actor when result is actor-sensitive | Cache authorized projections only; fail through to source on outage. |
| Reachability memo | `backend/src/modules/build/reachability/project-access-cache.ts` | org, user, project | Short-lived optimization; invalidate on membership/team/project/access change. |
| Report cache | `projects-reports.service.ts` | org, project, report revision, bounded params | Short/medium TTL; mutation bumps revision/invalidation. |
| Database/index | PostgreSQL | tenant-leading composite indexes | Query plan is the performance source; cache does not excuse unbounded reads. |

## Target TTL and freshness classes

| Class | Examples | Fresh/stale policy |
|---|---|---|
| Authorization critical | module/access/grant/revocation | Prefer authoritative or version-fenced read; revocation invalidates immediately; never stale-while-revalidate across denial. |
| Attention | Inbox, My Work counts, approval queue | 15 seconds target; event/invalidation refresh; stale label when offline. |
| Normal collection | projects, tickets, cycles, products | 30 seconds target; retain prior page during cursor transition; targeted mutation invalidation. |
| Reference | field/status/template catalogs | 5 minutes if revisioned; invalidate on settings change. |
| Analytics | dashboard/report widgets | 30–120 seconds by cost; response includes `computedAt`, `sourceRevision`, and freshness. |
| Signed artifact | export/file link | Never store beyond credential expiry; do not persist in general query cache. |

## Mutation invalidation

Ticket create/update/archive/restore/reorder invalidates or patches exact detail, affected collection/filter columns, My Work/Inbox when assignment/attention changes, project activity, relevant cycle/release/roadmap links, column counts, report revision, and Command Center widgets. Membership/grant change invalidates access first, then all scoped data. Settings changes invalidate registry plus views using it. Cross-module projection events invalidate only the affected project/ticket/customer/time/finance keys.

Optimistic updates are allowed for reversible, fully modeled changes such as title/assignee/status when revision and rollback snapshot are known. Client grant, permission, money, destructive, release publish, import, and external effects wait for server confirmation.

## Rate limits

Canonical tiers live in `backend/src/common/ratelimit/rate-limit.service.ts`; `RateLimitGuard` is global and unknown named tiers fail closed. Production uses declared limits; non-production currently applies a multiplier.

| Operation | Existing/required tier | Production budget | Key |
|---|---|---:|---|
| Public intake submission | `public:intake` | 5/hour | source IP plus target token/project defense |
| Public form submission | `public:form-submit` | 5/hour | source IP/token |
| Feedbucket widget submit | `feedbucket:widget-submit` | 10/minute | source IP/widget |
| Feedbucket AI analysis | `feedbucket:ai-analyze` | 20/minute | actor/org |
| Feedbucket AI assist | `feedbucket:ai-assist` and daily tier | 5/minute, 200/day | actor/org |
| Public whiteboard view/edit | existing whiteboard tiers | 60/minute view, 30/minute edit | token/IP |
| Build automation execution | `build:automation-run` | 300/minute | organization + project |
| AI command/read | shared AI tiers | 10–30/minute by capability | actor + organization |
| Global search | `search:global` | 30/minute | actor + organization |
| Import/export/provider actions | Planned named cost tier if no existing suitable tier | Decide from measured cost before release | actor + organization/project |

Authenticated low-cost CRUD uses admission, query bounds, concurrency, and plan controls; do not add arbitrary per-endpoint throttles without an abuse/cost model. A `429` includes integer `Retry-After`; the frontend respects it with bounded exponential backoff and does not auto-retry a non-idempotent command without its idempotency key.

## Performance budgets

- Collection API: p95 under 400 ms at supported page size on the target dataset; no unbounded relation hydration.
- Ticket header/detail initial projection: p95 under 500 ms; secondary sections lazy and independently retryable.
- Command Center: at most 12 widgets per batch, four internal concurrent queries, 100 rows/widget, two grouping dimensions; layout maximum 24 widgets.
- Interactive date range maximum 366 days; larger requests become asynchronous reports.
- Search input debounces and cancels obsolete work; search max 500 characters.
- Request-scoped permission facts resolve once; avoid N+1 actor/member/name lookups.

Cache outage degrades to bounded authoritative reads. Replica lag-sensitive reads after writes use the primary or revision fence. Permission revoked, conflict, stale, refreshing, offline, retrying, mutating, and optimistic states are visibly distinct.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Declare cache owner, key scope, freshness class, TTL, and invalidation event for every Build query, dashboard widget, report, export, and access-dependent projection.
- [ ] Prove ticket mutations and membership, module, project, or client-grant revocations invalidate or deny stale views within the documented bounds.
- [ ] Enforce bounded filters, pagination, dashboard layout and batch limits, date ranges, and named rate tiers; measure p95 latency and query plans on representative tenant sizes.
- [ ] Exercise cache outage, stale data, worker lag, retry storm, and provider failure; show safe fallback, admission behavior, telemetry, and no cross-tenant cache reuse.
