# 14 — Testing, browser verification, and acceptance

Status: Planned evidence contract

## Evidence levels

| Level | Proves | Does not prove |
|---|---|---|
| Static/source | file, route, type, decorator, migration text exists | runtime wiring or behavior |
| Unit/module interface | deterministic behavior behind one seam | real database, transport, deployment |
| Component/hook | rendering, interaction, query contract in test environment | backend authorization/persistence |
| Integration/API | DTO, policy, transaction, DB adapter interaction | real browser or production topology |
| Target database | migration, constraints, RLS, query plan on target-like data | browser UX or provider effect |
| Browser | user action, URL, UI states, network/console in deployed/local environment | unseen role/tenant or production load |
| Deployment/operations | packaged revision, workers, cache, queues, observability, rollback | long-term production outcome |
| Production | monitored real behavior under approved conditions | future behavior after change |

A ledger item reaches `VERIFIED` only when its required levels are attached. Source and focused tests usually support `IMPLEMENTED`, not `VERIFIED`.

## Required page matrix

Every page family tests populated, first-use empty, filtered empty, loading/skeleton, partial data where supported, safe error, retry, permission denied, missing/foreign record, offline/stale, mobile width, keyboard traversal, focus restore, screen-reader names/status, direct deep link, refresh, Back, modifier click, and organization/project switch.

Every collection additionally tests cursor stability, deterministic sort, filter round-trip, maximum bounds, bulk selection across pages policy, split-pane/full-page behavior, and no hidden count/facet leakage.

## Required mutation matrix

Valid submission; invalid fields; server-only validation; double click; same-key retry; mismatched-key payload; revision conflict; lifecycle conflict; permission revoked between load and submit; cross-tenant/cross-project binding; dependency failure; partial asynchronous result; cache invalidation; audit row; outbox emission; consumer idempotency; notification eligibility; browser success/failure state.

## Test surfaces

| Surface | Required tests |
|---|---|
| Ticket command seam | create/change/archive/restore, every adapter parity, CAS, WIP, hierarchy, effects, rollback |
| Project reachability | owner/admin/member/team/client/service, foreign tenant/project, archive/revoke |
| Filters | parser/property tests, depth/count/operator bounds, SQL scope outside OR, UI/report/export/AI equivalence |
| Onboarding | six journeys, resume/retry, multi-module adaptation, five-input default, invite batch, activation idempotency |
| Client grants | activate/revoke/expire, wrong project/contact, cached read, file URL, internal preview parity |
| Dashboard | layout versions, conflict/fork/restore, widget permission, batch limits, partial errors, freshness/drill-down |
| Cross-module | owner handoff/return, source revision, unavailable dependency, no duplicated source write |
| Jobs/events | atomic outbox, lease/reclaim, retry/backoff, dead letter/replay, ordering, dedupe |
| Security | negative matrix from document 12 plus log/token/SSRF/export/search/AI checks |
| Performance | query count and plan, p95 budget, high-cardinality tenant, cache outage, rate-limit behavior |

## Browser capture

For each release-critical flow record revision/environment, actor role and tenant, starting data, actions, viewport, final URL, screenshots/video when useful, network request/status, console errors/warnings, persisted reload result, and cleanup. Client and internal role tests use different accounts and organizations. A route smoke does not close a persistence or authorization criterion.

## Migration/deployment acceptance

Run migration on an empty database and a production-shaped restored/sanitized snapshot; prove forward time/locks, constraints/indexes, backfill counts, application compatibility during rollout, rollback or forward-fix, worker compatibility, and post-deploy query plans. Confirm the deployed commit/schema version and health of API, worker, Redis, outbox lag, dead letter, and alarms.

## Current evidence boundary

The current repository snapshot contains hundreds of Build-focused tests, but this document run did not execute the full suites, browser, target database, migrations, load, deployment, or production checks. All implementation requirements remain open until their ledger evidence is supplied.

