# S08 — Home, Platform Operations, Contracts, Cache & Operator Evidence

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §28.5, §28.16 and §21.

## Mission

Make Home a bounded read projection whose sections fail independently, raise generated contract coverage from 54% to complete, prove cache correctness across organizations and instances, and deliver honest operator evidence — runbooks where infrastructure is not ours to provision.

## Exclusive file ownership

```
backend/src/modules/dashboard/**      backend/src/modules/cron/**
backend/src/modules/audit-log/**      backend/src/modules/storage/**
backend/src/modules/ingress/**        backend/src/modules/activities/**
backend/src/modules/data-quality/**   backend/src/modules/public/**
backend/src/modules/portal/**         backend/src/modules/integrations/**
backend/src/common/**                 (EXCEPT common/rbac/** — S01 owns that)
backend/src/scripts/**                backend/migrations/**
frontend/features/dashboard/**        frontend/features/home/**
frontend/hooks/api/dashboard*
architecture-refactor/runbooks/**     architecture-refactor/docs/**
```

NOT yours: `frontend/app/**` (S09) · permission catalogs and `common/rbac/**` (S01) · domain modules (S02–S07).

## Already done — confirm, do not redo

- Home Build visibility now uses `build:manage` (verified at `modules/rbac/permissions/shared.ts:60`) with DataScope, `orgId` was added to both project-member predicates, and active-sprint totals moved from a JS reduce over every ticket to one bounded SQL aggregate. 51/51 dashboard tests pass.
- `CacheService.orgScopedKey` was extracted so org-scoped key composition is publicly assertable. `dashboard-home-scope.spec.ts` had been patching `CacheService.cached`, which `cachedForOrg` never calls, so both captured keys were `""` and the isolation assertion could not bite. Fixed.
- Home HR scope and permission-aware caching are implemented.
- Migration chain is repaired and `check:migration-chain` PASSES: 119 orphan future-dated `__drizzle_migrations` rows were deleted, `0661`/`0662` applied, `0659` recorded. 387 rows, watermark == journal head.
- `IdCursorPage.nextCursor` changed from `number | undefined` to `number | null` — `undefined` vanishes in JSON, collapsing "exhausted" and "not started".
- Zero circular imports in both repos, proven by `madge@8` to completion.

## Work items

### 1. Home read-model contract (§28.5)
- [x] Define the contract section by section: identity · attendance · availability · approvals · Build work · announcements · calendar · mail · notifications. DONE: L20-report provides full section contract table with Access, Data scope, and "Query omitted when denied?" for all 11 sections.
- [x] Mark each section universal self-service **or** bind it to an exact permission and data scope. DONE: L20-report; universal sections (identity, announcements, calendar, mail, notifications) vs permission-bound (stats, attendance, approvals, Build work).
- [x] A denied section is **omitted and does not execute its query** — not rendered empty. DONE: L20-report confirms denied sections return null (stats) or 403 at controller (attendance, approvals); module gate blocks Build work.
- [ ] Section failures are isolated: one backend timeout or disabled module must not fail the whole Home response or page.
- [x] Minimal projections and bounded aggregates only — never fetch full module records to compute a card. DONE per S08 "Already done": active-sprint totals moved from JS reduce over every ticket to one bounded SQL aggregate.
- [ ] Counts count **active memberships**, not globally active users.
- [ ] Server and Query cache keys include organization, membership, permission version, locale/timezone and relevant filters. Invalidate only affected section prefixes after mutations and organization switches.
- [x] Split `dashboard-hr.service.ts` (635) by stable read-model responsibility, keeping one shallow caller contract. DONE: extracted `dashboard-stats.service.ts` (89), `dashboard-availability.service.ts` (230), `dashboard-birthdays.service.ts` (165), `dashboard-personal.service.ts` (244). Controller uses split services directly. L20-report; wc -l verified. NOTE: original file still exists at 635 lines as dead code — not yet deleted.
- [ ] Every rendered section has skeleton, independent error/retry, empty and access-denied behaviour.
- [ ] P95 aggregate ≤800 ms on production-shaped data, measured — not asserted. OPEN: no live DB available in sessions to measure.

### 2. Home calendar leak — OPEN P0, shared with S06
- [ ] `calendar_events` has no `visibility`/`is_private` column, so the Home upcoming-events card shows every organization event, titles included, to every member. S06 owns the calendar module and is adding a `visibility` column plus a creator/attendee/org-visible SQL predicate. **You own the dashboard call site**: apply the same predicate here so visibility is filtered in SQL before any title or metadata projection. If S06 has not run yet, implement the predicate against `event_attendees` (which already exists with composite tenant FKs) and organizer identity, and record the column dependency.

### 3. Generated contract coverage (§28.16) — the headline number
- [ ] OpenAPI is current at **3,545 operations, 1,917 carrying a Zod contract (54%)**. Raise it to cover every applicable operation.
- [ ] Classify genuine no-payload operations explicitly (a GET with no query parameters is legitimately contract-free) so the residual is a decision, not a gap.
- [ ] Migrate legacy parameter-level validation to the shared metadata-driven `@Validate({ body, query, params })` seam so every operation with a payload publishes its contract.
- [ ] Standardize cursor, filter, sort, error-envelope, idempotency and deprecation metadata in the generated document.
- [ ] Assert mutation/webhook idempotency and error envelopes.
- [ ] Keep frontend and backend contracts byte-synchronized in CI (`check:contract-vendor`).
- [ ] **`@Idempotent` is a breaking change** — it makes the header mandatory and returns 400 without it. The CI check only tests the backend side, so a route can ship uncallable from the client. Verify every `@Idempotent` route's frontend caller sends the key.

### 4. Cache correctness proof (§28.16)
- [ ] Exercise one resource + filter across two organizations, two memberships/permission versions, locale/timezone variants and an organization switch. Prove no entry crosses.
- [ ] Prove mutation, membership, role, entitlement, organization-switch and placement invalidation reaches **another application instance**, not just in-process.
- [ ] The canonical authenticated cache identity is `environment:cell:version:org:membership:permissionVersion:resource:scope:filters`. Inventory the cache keys and prove every dimension that changes the result is present.
- [ ] Sensitive record collections, download tokens and search results without an ACL revision must **not** be cached.
- [ ] Cache lifetime may not exceed grant, delegation, membership or token expiry.
- [ ] Add stampede protection (request coalescing, TTL jitter, safe stale-while-revalidate) to expensive shared read models and document stale-data tolerance.
- [ ] **Do not migrate `CACHE_KEYS.*` onto `*ForOrg`** — that was tried at ~50 sites and fully reverted; the `CACHE_KEYS` factory is already tenant-safe.

### 5. Query cost on production-shaped data
- [ ] Seed or obtain a production-shaped dataset — the read-budget criterion is currently blocked on empty tables, and `db:check-build-reads` covers only 2 of 3,385 routes. `pnpm seed:build-load` and `pnpm baseline:build` exist.
- [ ] Measure plans as the **application role with the tenant GUC set**, warm/cold cache mix, declared row distributions. Never as the DB owner (BYPASSRLS hides everything).
- [ ] `VACUUM ANALYZE` after any table rewrite — stale stats and an empty visibility map cost 53 → 201,875 blocks on one list.
- [ ] Expand the read-budget gate beyond 2 routes to the real hot paths.
- [ ] Connection pools, statement timeouts and per-cell budgets are measured and alerted.

### 6. Outbox consumer orphans
- [ ] `pnpm check:outbox-consumers` (created in a prior pass, with `--self-test`) reports **22 orphan event types repo-wide** — emitted with no registered consumer. Own the cross-cutting ones, coordinate the domain-owned ones via `OUT-OF-OWNERSHIP`, and make the check a CI gate at zero.
- [ ] **Event ledger trap:** `ON CONFLICT` cannot distinguish a completed replay from a failed attempt; only a `processed_at`-style column can, and the claim needs three states, not two.

### 7. Schema and migration integrity
- [x] Create a risk register for active `serial()`/`bigserial()` keys: growth, write rate, maximum lifetime, FK fanout, partitioning and migration cost. Migrate only keys that fail the target-scale lifetime or cross-cell requirement; record KEEP decisions for bounded catalogs. DONE: L22-report: 588 int4 serial columns analyzed; 8 HIGH-RISK (audit_logs, notification_events, ai_usage_logs, etc.) flagged for future migration; bounded catalogs recorded as KEEP.
- [x] Produce **one timestamped authoritative cold-vs-upgrade comparison** resolving the historical contradictory evidence. DONE: L22-report cold-vs-upgrade table: 384 journal entries, DB rows = 391, orphan rows = 0; 0629 prerequisite fixed cold bootstrap. gate: check:migration-chain PASS.
- [x] Apply migrations other sessions filed under `OUT-OF-OWNERSHIP`. DONE: applied 0664 (calendar_events.visibility), 0665 (kb_article_chunks.acl_revision NOT NULL), 0666 (RLS for expense_export_jobs + inv_compliance_documents). L22-report.
- [x] **A tenant table with no RLS policy is readable org-wide** — grants arrive via `ALTER DEFAULT PRIVILEGES`, so a missing policy is silent. Audit for tables without a policy. DONE: db:verify-rls ran; `expense_export_jobs` and `inv_compliance_documents` found and fixed in migration 0666. L22-report: 955/960 covered; 1 structural FAIL (feedback_cycle_responses — no org_id column, tracked separately).

### 8. Security and compliance
- [ ] Configure and prove public-token rate limits, upload limits, SSRF controls, secret/PII redaction and security headers. Reuse `common/security/ssrf-guard.ts` — never write a second guard.
- [ ] **CORS must be registered before the body parser** — parser rejections that return before `enableCors` lose the ACAO header and read to the client as "Network error" rather than 413.
- [ ] Complete operator-access design and audit evidence: time-bound, approved, reasoned, audited.
- [ ] Complete export, retention, legal-hold and erasure drills with disposable data and auditable cleanup. The current compliance dry run has **no real export-file worker and cannot physically purge object storage by organization prefix** — it stays failing until both exist. Build them.
- [ ] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and a live production log stream; send a test alert through every on-call destination and record acknowledgement.
- [ ] Verify each alert's predicate against a **real emission**, not a hand-written fixture.

### 9. Operator evidence — deliver as runbooks, report as OPEN
The repo owner's decision: **exact operator-owned runbooks, with each infrastructure row reported OPEN**. Never convert missing infrastructure into a passing code-only claim. Self-tests for cells, backup, capacity, cost and alert dispatch are KEEPs — they prove the guards fail correctly, not that production exists.
- [ ] Write `architecture-refactor/runbooks/` covering: independently isolated cell compute/cache/object-storage/search/realtime/worker/monitoring (namespace-only separation does not pass) · PITR/backup frequency meeting the five-minute RPO · a physical read replica with replica-safe vs primary-required workload behaviour under real lag · re-running all 14 workload objectives on production-shaped data with declared geography/device/network/cache conditions · meeting every latency objective with ≥40% sustained-resource headroom and surviving the burst target · per-cell cost, cost per active organization/member/message/job, and a saturation forecast.
- [ ] Each runbook: exact commands, expected output, pass/fail thresholds, and where the evidence is recorded.
- [ ] Report every one of these rows as **OPEN — operator-blocked** in your report. Production readiness stays below 10/10 until the owner executes them.

### 10. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (cron from B06, dashboard/activities/search/portal/public/integrations/ingress from B09, audit-log/platform from B10 — roughly 45 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL.
- [ ] Cron services have no ambient tenant context — they iterate with `forEachOrg`. The isolation assertion is that per-org work is scoped to the org being iterated.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `pnpm build` · `check:migration-chain` · `check:tenant-indexes` · `check:tenant-isolation` · `check:outbox-consumers` · `check:log-secrets` · `check:placement-bypass` · `openapi:check` · `db:check-read-budgets` · `db:verify-rls` · `check:cycles` · jest `--testPathPattern="dashboard|cron|audit|storage|ingress|public|portal"`.
Frontend: `pnpm type-check` · `check:contract-vendor`.
Cell/ops self-tests: `cell:isolation:self-test` · `cell:backup:self-test` · `cell:capacity:self-test` · `cell:unit-cost:self-test` · `alert:dispatch:self-test` · `failure-drill:self-test` · `compliance:drill`.

## Definition of done

An ordinary member sees only universal and granted Home sections, each failing independently, with measured bounded read budgets on production-shaped data; generated contracts cover every applicable operation; cache entries provably cannot cross organization, membership, role, scope or permission version, and invalidation reaches other instances; migrations reach an identical head cold and on upgrade; every emitted event has a consumer or a recorded decision; compliance drills execute for real; and every operator-blocked infrastructure row has a runbook and is reported OPEN.

Report to `architecture-refactor/session-tickets/reports/S08-report.md`.
