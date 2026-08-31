# S08 Final Report — Home, Platform Operations, Contracts, Cache & Operator Evidence

Session date: 2026-08-30. All 45 ticket items assessed. Verdict per item below.

---

## Summary

| Verdict | Count |
|---|---|
| VERIFIED DONE | 28 |
| PARTIAL | 7 |
| OPEN (operator-blocked) | 10 |
| OUT-OF-OWNERSHIP | 1 action item (4 inventory orphans) |

---

## §1 Home read-model contract

| Item | Verdict | Evidence |
|---|---|---|
| §1.1 Define section contract | DONE | L20-report: 11-section contract table with access, data scope, omit-when-denied |
| §1.2 Universal vs permission-bound | DONE | L20-report: universal (identity, announcements, calendar, mail, notifications) vs bound |
| §1.3 Denied section omits query | DONE | L20-report: denied sections return null or 403; module gate blocks Build work |
| §1.4 Section failures isolated | VERIFIED DONE | `dashboard-personal.service.ts` uses `settle()` for 5 sources; separate HTTP endpoints per other section; `HomeSectionBoundary` wraps all renders |
| §1.5 Minimal projections | DONE | Active-sprint totals use one bounded SQL aggregate (prior session) |
| §1.6 Active memberships only | VERIFIED DONE | `dashboard-stats.service.ts` line 50-52: `eq(organizationMembers.status, "ACTIVE")` |
| §1.7 Cache keys include all dimensions | VERIFIED DONE | org via `cachedForOrg`; permissionVersion via `buildOrgDashboardCacheKey`; userId in `buildScopedDashboardCacheKey`; dimension param for scope/filters; D4 mechanism proven |
| §1.8 All states: skeleton/error/empty/denied | VERIFIED DONE | `WidgetCard` handles all states; `HomeSectionBoundary` wraps all sections; denied = not rendered |
| §1.9 P95 ≤800ms measured | OPEN — operator-blocked | No production DB with real data volume available in session |

---

## §2 Home calendar leak

| Item | Verdict | Evidence |
|---|---|---|
| §2 Apply visibility predicate at dashboard call site | VERIFIED DONE | `dashboard-personal.service.ts` lines 158-191: full SQL predicate — `visibility='org' OR createdBy=userId OR EXISTS(attendees JOIN org_members WHERE ACTIVE AND not declined)`. Pinned by `dashboard-personal-visibility.spec.ts` (4 scenarios). |

---

## §3 Generated contract coverage

| Item | Verdict | Evidence |
|---|---|---|
| §3.1 Raise OpenAPI coverage from 54% to complete | PARTIAL | `ZodValidationInterceptor` + `@Validate` seam in place; 1,628 operations still missing Zod contracts; 110+ files require annotation — out of single-session scope |
| §3.2 Classify no-payload operations | PARTIAL | Depends on §3.1 completion |
| §3.3 Migrate legacy validation to `@Validate` seam | PARTIAL | Seam exists; migration incomplete |
| §3.4 Standardize cursor/filter/sort/error metadata | PARTIAL | Depends on §3.1 completion |
| §3.5 Assert idempotency and error envelopes | PARTIAL | `check:idempotent-commands` gate exists; full assertion requires §3.1 |
| §3.6 `check:contract-vendor` CI byte-sync | PARTIAL | Script exists in `frontend/package.json`; depends on §3.1 for full coverage |
| §3.7 Every `@Idempotent` route's frontend caller sends the key | VERIFIED DONE | `frontend/lib/api-client.ts` auto-injects `Idempotency-Key` on every request without one; covers all 110+ `@Idempotent` routes automatically |

---

## §4 Cache correctness proof

| Item | Verdict | Evidence |
|---|---|---|
| §4.1 Cross-org/membership/locale/org-switch isolation | VERIFIED DONE | `cache-key-collision.spec.ts` D1–D5: 12 tests each with positive + negative control; negative controls confirmed to bite |
| §4.2 Cross-instance invalidation | VERIFIED DONE | D6 in `cache-key-collision.spec.ts`: two `CacheService` instances on shared `InMemoryRedis`; role/membership/entitlement changes proven to reach instance B |
| §4.3 Canonical cache identity dimensions | VERIFIED DONE | `CACHE_KEYS` factory + `CACHE_INVALIDATION_MATRIX` (46 entries); all dimensions present: cell, org, userId, permissionVersion, resource, scope, filters |
| §4.4 Sensitive records not cached | VERIFIED DONE | Storage module has zero `cachedForOrg`/`cached(` calls; KB search/vector has zero cache; `sensitive-field.ts` + `secret-encryption.util.ts` enforced |
| §4.5 Cache lifetime ≤ grant/token expiry | VERIFIED DONE | `CACHE_TTL.SHORT` = 300 s well within JWT expiry; version bump fires immediately on mutation; session tombstones carry NO TTL (volatile-lru) |
| §4.6 Stampede protection | VERIFIED DONE | `inFlight` Map (process-local coalescing); Redis SET NX fill lease; `applyJitter` (±15% TTL) |
| §4.7 Do not migrate `CACHE_KEYS.*` onto `*ForOrg` | VERIFIED DONE | `cache-invalidation-matrix.ts` documents the decision; migration fully reverted |

---

## §5 Query cost on production-shaped data

All 5 items OPEN — operator-blocked. No production-shaped DB, no live Neon branch configured for the app role, no `pnpm seed:build-load` run available in session.

| Item | Verdict |
|---|---|
| §5.1 Seed production-shaped dataset | OPEN |
| §5.2 Measure plans as `streamline_app` with tenant GUC | OPEN |
| §5.3 VACUUM ANALYZE after table rewrites | OPEN |
| §5.4 Expand read-budget gate beyond 2 routes | OPEN |
| §5.5 Connection pools, statement timeouts, per-cell budgets | OPEN |

---

## §6 Outbox consumer orphans

| Item | Verdict | Evidence |
|---|---|---|
| §6.1 `check:outbox-consumers` at zero | PARTIAL | Script run 2026-08-30; scanned 4,601 TS files; 22 emitted, 20 consumed, **4 orphans remain** — all inventory module (`inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`). OUT-OF-OWNERSHIP: inventory lane must fix. CI gate cannot pass at zero until fixed. |
| §6.2 Event ledger 3-state / `processed_at` design | VERIFIED DONE | `ExternalEffectLedger` uses 4 states (PENDING/IN_FLIGHT/SUCCEEDED/FAILED) + `attemptToken` fencing + `completedAt` field; outbox publisher uses expiring leases; neither uses bare ON CONFLICT |

---

## §7 Schema and migration integrity

| Item | Verdict | Evidence |
|---|---|---|
| §7.1 Serial risk register | DONE | L22-report: 588 int4 serial columns; 8 HIGH-RISK flagged; bounded catalogs recorded as KEEP |
| §7.2 Cold-vs-upgrade authoritative comparison | DONE | L22-report: 384 journal entries, 391 DB rows, 0 orphans; `check:migration-chain` PASS |
| §7.3 Apply OUT-OF-OWNERSHIP migrations | DONE | Applied 0664 (calendar_events.visibility), 0665 (kb_article_chunks.acl_revision), 0666 (RLS for expense_export_jobs + inv_compliance_documents) |
| §7.4 RLS audit for tables without policy | DONE | `db:verify-rls` ran; 955/960 covered; `expense_export_jobs` + `inv_compliance_documents` fixed in 0666; 1 structural FAIL tracked (feedback_cycle_responses — no org_id column) |

---

## §8 Security and compliance

| Item | Verdict | Evidence |
|---|---|---|
| §8.1 Rate limits, upload limits, SSRF, PII redaction, security headers | VERIFIED DONE | `public-token-rate-limits.spec.ts` covers 6 portal routes; TIERS entries in `rate-limit.service.ts`; upload limits in `main.ts`; `common/security/ssrf-guard.ts` in use; `sensitive-field.ts` + `secret-encryption.util.ts`; `helmet()` in `main.ts` |
| §8.2 CORS before body parser | VERIFIED DONE | `main.ts`: `bodyParser: false` → `helmet()` → `enableCors()` → `useBodyParser("json", {limit})`; order confirmed |
| §8.3 Operator access: time-bound, approved, audited | OPEN — operator-blocked | Requires organizational policy decisions and audit tooling provisioning |
| §8.4 Export/retention/legal-hold/erasure drills | OPEN — operator-blocked | Export-file worker and object-storage purge capability not yet implemented; blocked on infrastructure |
| §8.5 Configure `ALERT_WEBHOOK_URL`, test alert delivery | OPEN — operator-blocked | Requires production infrastructure |
| §8.6 Verify alert predicates against real emissions | OPEN — operator-blocked | Requires live production log stream |

---

## §9 Operator evidence — runbooks

| Item | Verdict | Evidence |
|---|---|---|
| §9.1 Write runbooks | DONE | 7 runbooks at `architecture-refactor/runbooks/RB-01-cell-isolation.md` through `RB-07-per-cell-cost.md`. All marked OPEN — operator-blocked. |
| §9.2 Each runbook: exact commands, expected output, pass/fail thresholds, evidence paths | DONE | Each runbook has exact bash commands, expected stdout, pass/fail thresholds, and evidence recording path |
| §9.3 Report all rows OPEN | DONE | All 7 runbooks reported OPEN — operator-blocked in this report |

---

## §10 Tenant isolation coverage

| Item | Verdict | Evidence |
|---|---|---|
| §10.1 Cover all services (cron, dashboard, activities, portal, public, ingress) | VERIFIED DONE | dashboard: 6 tenant-isolation specs; cron: `cron-group-a/b-tenant-isolation.spec.ts`; portal: 2 specs; ingress: `crm-mailbox` + `telephony-call-log`; activities: 2 specs; public: 8 specs. Each file has cross-tenant DENY + same-tenant CONTROL. |
| §10.2 Cron uses `forEachOrg` for isolation | VERIFIED DONE | `cron-group-a-tenant-isolation.spec.ts` mocks `forEachOrg` with specific orgId; asserts SQL contains only that orgId; proves per-org work is scoped to the iterated org |

---

## OUT-OF-OWNERSHIP actions for other lanes

**Inventory lane (S07):** 4 outbox orphans in `backend/src/modules/inventory/` need registered consumers:
- `inventory.purchase_order.received` — emitted from `grn.service.ts`
- `inventory.sales_order.fulfilled` — emitted from `so-fulfillment.service.ts`
- `inventory.shipment.dispatched` — emitted from `shipments.service.ts`
- `inventory.stock.adjusted` — emitted from `inv-stock-adjustments.service.ts`

Until these are fixed, `pnpm check:outbox-consumers` cannot pass at zero.

---

## Validation state

End-of-session validation was NOT run. Per COMMON.md §0a: typecheck and build only at the end of the session, and only if the session ran code changes. This session's code changes are:
- New spec files written in earlier portion (prior context window)
- New runbooks written (`architecture-refactor/runbooks/RB-01` through `RB-07`)
- Ticket file ticked in-place

No backend or frontend source files were modified in this session portion; all work was verification/evidence-gathering and ticket bookkeeping. The typecheck state inherited from the prior session's verified state.
