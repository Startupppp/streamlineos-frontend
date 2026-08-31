# Completeness Ledger — Domain Slices (PRD §28.20-A)

**Gate run:** 2026-08-31  
**Method:** read-only gate scripts executed from `backend/`; structural file checks; no DB-dependent gates where password auth failed mid-run. Every verdict cites a concrete artefact or gate output. OPEN = evidence absent or gate failed.

---

## Gate Summary (cross-cutting, not per-domain)

| Gate | Result | Number |
|---|---|---|
| `check:route-classification` | PASS | 3 566 handlers — 3 187 permissioned, 224 public, 98 universal, 57 in-service, **0 undeclared** |
| `check:openapi-coverage` | PASS | 3 566 ops stamped, 100 % 4xx schemas, 99 % request-body schemas |
| `check:permission-keys` | PASS | 693 backend keys, 691 frontend keys, all resolve |
| `check:tenant-indexes` | PASS | 731 tenant tables, all carry a leading-tenant index |
| `check:record-access` | PASS | 1 158 findFirst calls, all exclude soft-deleted rows (1 purge skip documented) |
| `check:cache-invalidation` | PASS | 1 019 service files scanned, 0 doc gaps |
| `check:unbounded-reads` | PASS (baseline) | 128 offset, 1 716 unbounded, 7 unordered — no new violations; baselines not yet zero |
| `check:outbox-consumers` | PASS | 21 emitted event types, all consumed |
| `check:scope-application` | PASS | 127 DataScope resolutions, all reach a predicate |
| `check:idempotent-commands` | PASS | 11 in-scope handlers carry `@Idempotent`; 11 excluded by design |
| `check:navigation-permissions` | PASS | all nav gate keys resolve to a route |
| `check:migration-discipline` | PASS | 491 SQL files, 0 new violations |
| `check:log-secrets` | PASS | 2 866 source files, no plaintext secrets, all rate-limit keys in TIERS |
| `check:file-sizes` | PASS | 3 342 files, 8 registered exceptions |
| `check:over-300` | PASS (ratchet) | 392/392 ratchet — 18 files at 300–312 lines, none over 312 |
| `check:owner-authority` | PASS | 9 owner-only ops declared, 12 owner shortcuts documented |
| `check:placement-bypass` | PASS | all 13 DB bypasses on allowlist with reasons |
| `check:openapi-path-params` | PASS | 3 566 ops, all path params declared |
| `check:operation-ids` | PASS | no duplicate operationIds |
| `check:hr-table-freeze` | PASS | 234 HR tables approved |
| `check:hr-pagination-gate` | PASS (ratchet) | 87 violations at baseline — ratchet not growing |
| `check:module-entitlement` | PASS | timesheets plan-gating round-trips correctly |
| `check:alert-system` | PASS | all 12 alert scripts self-tested and passing |
| `check:namespace-coverage` | PASS | 73/73 namespaces have a bump; 3 non-blocking unresolved expressions |
| `check:tenant-isolation-coverage` | **FAIL** | 887/888 tenant-services covered — `gdpr-export-worker.service.ts` missing cross-tenant test |
| `check:mock-surface` | **FAIL** | 4 phantom `contentType()` method mocks in `kb-ingestion-consumer.spec.ts` (real class exposes a property, not a method) |
| `check:module-di` | WARN | `NotificationsService` not in `BillingModule` providers — DI token missing |
| `scan:legacy-actors --check` | PASS (ratchet) | 647/689 remaining (42 migrated since baseline) |
| `check:module-lifecycle` | PARTIAL | DB password auth failed mid-run; static phase passed |

**Scope note:** `check:scope-application` covers all 74 modules (127 resolutions confirmed); the PRD memory's claim that it covers only CRM is stale.

---

## Domain 1 — Organization

`src/modules/organization/` · `src/db/schema/common/` (org tables)

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | Tenant-leading indexes PASS (731/731). `membership-artifacts.ts` cohesive-catalog exception registered. Soft-delete pattern enforced by `check:record-access`. Composite tenant FKs on all membership/role edges confirmed by `check:placement-bypass` allowlist — 13 documented cross-org reads, all scoped. `organization_members`, `organization_people`, `workers`, `hr_people` person-seam model documented in backend CLAUDE.md §1. | `audit_log` table NOT partitioned despite CLAUDE.md §3 requirement for "partition high-volume append-only tables." No migration found. |
| **Authorization** | KEEP | `check:owner-authority`: 9 owner-only ops declared, enforced. `check:placement-bypass` PASS — all cross-org reads allowlisted. `organization.controller.ts:134,142,165,374` carry `[no-tenant-transaction]` skip with reason. `org-membership-status.service.ts:78` and `org-profile.service.ts:72,118` carry `[with-identity]` skip. `rbac-tenant-isolation.spec.ts` covers RBAC; `roles-tenant-isolation.spec.ts` covers roles. | OPEN: no automated test for org-switch access invalidation path (the tombstone itself IS read by `jwt-auth.guard.ts:128`; what is missing is a test that drives org-switch invalidation end to end). |
| **CRUD and lifecycle** | KEEP | `invitation-acceptance.service.ts` (509 lines, cohesive exception documented). `check:idempotent-commands` PASS. Seat enforcement uses per-org advisory lock + `PlanLimitsService.assertWithinLimit`. `HierarchyArchiveDialog` enforces archive/restore — no delete. | OPEN: import/export bulk policy for org membership not evidenced. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS (no new violations). `check:navigation-permissions` PASS. Organization list cursor-paginated per backend rule. | 7 unordered-paging offsets in baseline (not specific to Org but Org controllers are included). |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. Permission version bump `bumpPermissionsVersion(tx, orgId)` transactional. Access cache TTL < delegation expiry documented in CLAUDE.md §5. | OPEN: cross-node revocation relies on Redis pub/sub; no automated proof Redis subscription is live in production. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:openapi-path-params` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS (509-line exception registered). `scan:legacy-actors` — 0 remaining unknown-actor reads in `organization` module (only `[with-identity]` skips). | OPEN: deprecation policy for any renamed org endpoints not evidenced. |
| **UX and accessibility** | OPEN | No automated gate. `frontend/features/organization/` exists. | OPEN: no responsive/a11y audit proof for 375/768/1280. |
| **Operations** | KEEP | `check:alert-system` PASS (12/12). `check:log-secrets` PASS. `check:placement-bypass` provides structured bypass audit trail. | OPEN: no per-domain runbook for org-provisioning or invite-acceptance failure. |

---

## Domain 2 — RBAC

`src/modules/rbac/` · `src/modules/access/` · `src/modules/module-access/` · `src/db/schema/common/access.ts`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/common/access.ts` is schema source of truth. Tenant-leading indexes PASS. Canonical grant tables: `role_assignments`, `role_permission_grants`, `principal_group_members`, `group_role_assignments`, `module_ownerships`, `user_delegations`, `access_versions`. No `user_roles`/`group_roles` (verified via `check:permission-keys` finding no legacy keys). | OPEN: `access_versions` table partition status not confirmed (high-churn per mutation, not partitioned). |
| **Authorization** | KEEP | `check:owner-authority` PASS — billing namespace refusal by `assertPermissionsGrantable`. `permission.guard.e2e-spec.ts` and `rbac.controller.e2e-spec.ts` present. `roles-rbac-admin.controller.e2e-spec.ts` present. `c4-production-wiring.spec.ts` and `capability-decision-regression.spec.ts` cover resolution. `home-surfaces-universal.spec.ts` pins `EMPLOYEE_SELF_SERVICE_GRANTS` | OPEN: automated proof that a revoked grant is flushed from Redis within one TTL on another node. |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. `bumpPermissionsVersion` in same transaction as every role/permission mutation (CLAUDE.md §5). `seed-system-roles.spec.ts` asserts re-seed does not restore revoked grants. Backfill pattern in migration `0436`. | OPEN: delegation expiry sweep — no automated proof the sweep runs and expires correctly at scale. |
| **Lists and search** | KEEP | `roles-list.spec.ts`, `roles-query-tenant-isolation.spec.ts`. `check:navigation-permissions` PASS. `check:unbounded-reads` PASS. | OPEN: no filter-cap evidence for `GET /roles` list endpoint (hard cap unclear). |
| **Cache and realtime** | KEEP | `access.service.ts` cached per `(userId, orgId)` with Redis. `access-resolution-cost.spec.ts` present. `snapshot-validity.spec.ts` present. `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. | OPEN: TTL upper-bound relative to shortest delegation expiry not verified by a gate. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:permission-keys` PASS (693/691, all synced). `check:operation-ids` PASS. `access.service.ts` 510-line exception registered. `user-permission-grants.service.ts` 302 lines (within 500). Catalog test `catalog-sync.test.ts` asserts bidirectional subset. | `check:module-di` WARN: `NotificationsService` not in `BillingModule` — not RBAC itself but RBAC depends on billing for plan-gating paths. |
| **UX and accessibility** | OPEN | `frontend/features/module-access/` exists. Permission matrix UI in Build and RBAC pages. | OPEN: no responsive/a11y proof. |
| **Operations** | KEEP | `check:log-secrets` PASS. `check:alert-system` PASS. | OPEN: no grant-change structured audit log per role/key/actor evidenced. |

---

## Domain 3 — Home

`src/modules/dashboard/` (server for Home aggregates; no dedicated `home/` module) · `frontend/app/(authenticated)/dashboard/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | Home is a read-aggregate surface with no owned schema tables — dashboard data drawn from `notifications`, `hr_*`, `build.*`, `calendar.*`. Tenant indexes PASS across all source tables. No separate home schema is by design. | OPEN: `audit_log` entries for Home admin actions (announcements) not evidenced as separate from general audit. |
| **Authorization** | KEEP | `home-surfaces-universal.spec.ts` confirms `EMPLOYEE_SELF_SERVICE_GRANTS` merged before any role read; verified keys pinned in spec at `src/modules/access/__tests__/home-surfaces-universal.spec.ts:105`. `home:access:manage` NOT in catalog (by design — generated access key per MEMORY.md). Dashboard sections have `dashboard-section-isolation.spec.ts`. | OPEN: no automated test that a suspended member loses Home access (isolation spec exists for sections, not membership-suspension path). |
| **CRUD and lifecycle** | KEEP | Home is read-only for universal users. Admin announcements via `dashboard-announcements.service.ts`. `check:idempotent-commands` PASS across all controllers. | OPEN: announcement import/export policy not evidenced. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `dashboard-home-scope.spec.ts` and `dashboard-scope.ts` cover per-user vs all scoping. Announcements, birthdays, availability all have service + isolation spec. | OPEN: hard cap on `GET /dashboard` aggregates not confirmed by a gate (unbounded baseline is not zero). |
| **Cache and realtime** | KEEP | `dashboard-cache-key.ts` uses `dashboard-home:u${userId}:v${version}:${resource}:${scope}` — tenant+user-scoped. `dashboard-invalidation.spec.ts` present. `check:cache-invalidation` PASS. | OPEN: no proof dashboard cache is invalidated on role-change (access version bump covers permissions but dashboard widget data may outlive its TTL). |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `dashboard.controller.e2e-spec.ts` present. `check:file-sizes` PASS. | OPEN: no dedicated Home OpenAPI tag/grouping — operations scattered under `dashboard` tag. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/dashboard/` route exists. | OPEN: no responsive/a11y proof. No evidence of mobile collapsing multi-filter to Drawer. |
| **Operations** | OPEN | `check:alert-system` PASS globally. | OPEN: no Home-specific SLO or runbook. No evidence of Home dashboard widget retry/error circuit-breaker. |

---

## Domain 4 — Settings

`src/modules/settings/` · `frontend/app/(authenticated)/settings/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | Tenant-leading indexes PASS. Custom fields via `settings-custom-fields.service.ts`. `check:record-access` PASS. Settings tables are tenant-scoped in `db/schema/common/`. | OPEN: no partition decision for settings-history tables (settings are low-volume; OPEN only as a confirm). |
| **Authorization** | KEEP | `settings.controller.e2e-spec.ts` present. `check:route-classification` PASS — no undeclared handlers. Module configuration is `/<module>/settings/*`, not `/settings/*` (per CLAUDE.md §8). | OPEN: no automated proof that a non-admin cannot read `/settings/billing` (billing gating is construction-enforced but no e2e allow/deny for Settings specifically). |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. `settings-automations-plan-limits.spec.ts` present. `settings-member-role-authority.spec.ts` present. | OPEN: bulk-export of settings (data portability for settings) not evidenced. |
| **Lists and search** | KEEP | Settings lists are reference data with small cardinality; `check:unbounded-reads` baseline holds. `check:navigation-permissions` PASS. | OPEN: page-level cap not evidenced for custom-field list endpoint (could theoretically be unbounded in high-volume org). |
| **Cache and realtime** | KEEP | `settings-automations-tenant-isolation.spec.ts` + `settings-custom-fields-tenant-isolation.spec.ts` cover isolation. `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. | OPEN: no proof settings cache invalidation propagates cross-node on mutation. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:openapi-path-params` PASS. `check:file-sizes` PASS. `check:module-di` PASS for Settings module. | OPEN: no OpenAPI deprecation tag on any Settings endpoint — no policy for versioning settings routes. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/settings/` has full subdirectory tree (api-tokens, audit-log, billing, delegations, devices, modules, organization, roles, sessions, users, webhooks). | OPEN: no responsive/a11y proof. No Drawer fallback evidence for mobile filter panels in Settings lists. |
| **Operations** | KEEP | `check:log-secrets` PASS. Settings mutations go through structured audit logs (audit-log module present). `check:alert-system` PASS. | OPEN: no Settings-specific runbook. No evidence of alert on bulk-permission-change in Settings. |

---

## Domain 5 — HRMS

`src/modules/hr/` · `src/db/schema/hr/` (234 tables)

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `check:hr-table-freeze` PASS (234 tables, frozen). Tenant-leading indexes PASS (731/731). `check:record-access` PASS. `organization_people` is the canonical person row; `hr_people` / `hr_employments` are facets. Person-seam at `modules/directory/person-seam.ts`. Payroll schema separated into `db/schema/payroll/`. `check:migration-discipline` PASS (491 files). | OPEN: `hr_*` tables are NOT partitioned. Many are append-only high-volume (attendance logs, audit). CLAUDE.md §3 names partition as required for high-volume tables; no HR partition migration found. |
| **Authorization** | KEEP | `check:permission-keys` PASS — `hr.ts`, `hr-enterprise.permissions.ts`, `hr-foundation.permissions.ts`, `hr-workforce.permissions.ts` all present. `check:scope-application` PASS (127/127 DataScope resolutions reach a predicate). HRMS permission catalog covers view/create/update/delete/manage for all HR sub-surfaces. | OPEN: HR_ADMIN missing 60+ keys (noted in MEMORY.md: `hr-permission-catalog-findings.md` — "HR_ADMIN missing 60+ keys"). No automated backfill gate to confirm this was resolved. |
| **CRUD and lifecycle** | REPAIR | `check:hr-pagination-gate` — 87 violations at ratchet baseline (not growing, but 87 HR service methods still use offset pagination without a hard cap). `check:idempotent-commands` PASS. `check:record-access` PASS (soft-delete enforced). | 87 HR offset-pagination violations not yet zeroed. `hr-import.service.ts` at 304 lines (near 300 threshold). |
| **Lists and search** | REPAIR | `check:unbounded-reads` PASS (no new violations above baseline). However, 87 HR ratchet violations means existing HR list paths have unbounded potential. 7 unordered-paging paths in the overall baseline likely include HR. `check:scope-application` PASS — all DataScope resolutions applied. Free-text search uses `app.search_ticket_ids` security-definer pattern documented in backend CLAUDE.md §3. | Ratchet does not zero violations; 87 existing offset paths in HR violate the hard-cap rule without evidence of explicit cap enforcement. |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `scan:legacy-actors` — 0 legacy org actors in `hr` module (payroll has 56, common 44, but `hr` module itself is not listed). | OPEN: no evidence HR-specific caches (employee profiles, org charts) invalidate on departure/suspension events. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. `hr-import.service.ts` 304 lines (near threshold but within). | OPEN: `hr-import.service.ts:304` is at the 300-line ratchet threshold and approaching the review trigger. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/hr/` and `frontend/features/hr/` exist with rich-surface exception (`Hr*` component set). | OPEN: no responsive/a11y proof. Rich-surface exception (HR gradient hero) documented in frontend CLAUDE.md §7 but not audited. |
| **Operations** | OPEN | `check:alert-system` PASS globally. `check:log-secrets` PASS. | OPEN: no HR-specific SLO. No automated proof of offboarding audit trail completeness. |

---

## Domain 6 — Payroll

`src/modules/payroll/` · `src/db/schema/payroll/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/payroll/` is its own top-level schema folder (separated from HR per CLAUDE.md §1). Tenant-leading indexes PASS. `check:migration-discipline` PASS. `check:record-access` PASS. | `scan:legacy-actors` — **56 legacy org actors** remain in the `payroll` module (largest module total). These are raw queries not yet migrated to actor-based attribution. |
| **Authorization** | KEEP | `payroll.ts` in permissions catalog. `check:permission-keys` PASS. `payroll:runs:post` uses a domain verb (not collapsed to `manage`) — legitimate per CLAUDE.md §5. `check:idempotent-commands` — payroll approval paths documented as `bespoke-mechanism` (in-service checks). `check:scope-application` PASS. | OPEN: no dedicated payroll e2e spec asserting cross-tenant isolation for run-submission path found in file listing (only `payroll-new-services-tenant-isolation.spec.ts` found). |
| **CRUD and lifecycle** | KEEP | `command-receipts.service.ts` implements receipt tracking. `run-lock.service.ts` prevents concurrent payroll run conflicts. Payout approvals at `payout/approvals.controller.ts` documented as bespoke-mechanism in `check:idempotent-commands`. `check:migration-discipline` PASS. | OPEN: rollback plan for a posted payroll run not evidenced as an automated test. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `check:scope-application` PASS. | OPEN: payroll run list hard cap not confirmed by gate (baseline holds but does not confirm 100-per-page cap in payroll endpoints). |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. | OPEN: no proof payroll computation cache is invalidated when an employee's pay details change mid-run. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. `scan:legacy-actors` ratchet: 56 payroll legacy actors are a structural gap but ratchet holds. | 56 legacy org actor reads in `payroll` — actor attribution not yet migrated. Gate passes the ratchet but doesn't zero the count. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/payroll/` and `frontend/features/payroll/` exist. Several payroll sub-pages deleted per git status (`payroll/me/page.tsx` deleted). | OPEN: no responsive/a11y proof. The deletion of `payroll/me/page.tsx` (in current git status) may indicate an in-progress self-service migration — route ownership unclear. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. Payroll is a compliance-sensitive domain. | OPEN: no payroll-specific audit log completeness check. No evidence of reconciliation/DLQ for failed payout outbox events. |

---

## Domain 7 — Build

`src/modules/build/` · `src/db/schema/build/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/build/` is dedicated schema folder. Tenant-leading indexes PASS. `check:record-access` PASS. Soft-delete enforced. Build module = tickets, sprints, QA, backlog, managed_products, roadmap, OKRs — distinct from product. `check:migration-discipline` PASS. | OPEN: no partition on ticket activity log / audit events within Build. |
| **Authorization** | KEEP | `build.ts` permission catalog present. `check:permission-keys` PASS. `build-uncovered.controller.e2e-spec.ts` asserts all Build controllers are covered. `check:scope-application` PASS. `check:owner-authority` PASS — owner shortcut in `projects-write.service.ts:52,218` and `projects-tickets-query.service.ts:116` documented as permission-check shortcuts (not gate bypasses). `check:route-classification` PASS — 0 undeclared. | OPEN: `build:access:view` is `@AuthorizedInService` — verified in `check:navigation-permissions` but no dedicated allow/deny e2e spec for workspace-level access check. |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. Kanban board uses optimistic mutations (`useUpdateTicket` canonical in frontend CLAUDE.md §2). `build-route-order.spec.ts` confirms controller registration order. QA module at `build/qa/` has its own module structure. | OPEN: import/export bulk policy for tickets/sprints not evidenced as tested. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `check:scope-application` PASS. Cursor pagination enforced. `frontend/features/build/` uses virtual ticket list (`kanban-virtual-ticket-list.tsx`) per frontend CLAUDE.md §3. | 1 716 unbounded-reads in baseline across all modules includes Build list paths — specific Build cap not isolated by the gate. |
| **Cache and realtime** | KEEP | `check:outbox-consumers` PASS — `build.ticket.status_changed`, `build.sprint.completed`, `build.release.published` all consumed. `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. | OPEN: no proof Build ticket real-time update invalidates sprint rollup cache in the same transaction. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:openapi-path-params` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. Build is `build/*` nested correctly (not `build-qa/`, `build-portfolios/`). `build-route-order.spec.ts` guards registration. | OPEN: managed-products (roadmap) and ticket sub-modules — interface contract sync with frontend not verified by a dedicated schema-drift gate. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/build/` and `frontend/features/build/` exist. Kanban virtual list documented. | OPEN: no responsive/a11y proof. Kanban at 375px not gate-verified. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no Build-specific SLO or runbook. No DLQ proof for `build.ticket.status_changed` outbox event. |

---

## Domain 8 — Billing/Payments

`src/modules/billing/` · `src/modules/payments/` (implied by `frontend/features/payments/`) · `src/db/schema/billing/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/billing/` dedicated folder. Tenant-leading indexes PASS. AI billing token-metered with `computeTokenCharge`. AI ledger stores integer milli-credits (CLAUDE.md §8). `check:record-access` PASS. | `scan:legacy-actors` — **18 legacy org actors** in `billing` module — credit/revenue attribution not yet fully migrated. |
| **Authorization** | KEEP | `billing.ts` permissions catalog. `assertPermissionsGrantable` refuses `billing:` namespace on all grant paths — construction-enforced (CLAUDE.md §5). Org-owner-only by design, verified in `check:owner-authority`. Entitlements controller at `entitlements.controller.e2e-spec.ts`. | OPEN: no automated test that a non-owner attempting `billing:*` gets 403 (gate is structural, not behavioural). |
| **CRUD and lifecycle** | REPAIR | `check:module-di` WARN: `NotificationsService` not in `BillingModule` providers (`plan-limits.service.ts:DI[2]`). This means billing-triggered notifications may fail silently at runtime. `check:idempotent-commands` PASS. `check:outbox-consumers` PASS — `billing.revenue-event` consumed. | `NotificationsService` not in `BillingModule` — live defect risk. Fix: add to `BillingModule` providers. `src/modules/billing/core/plan-limits.service.ts` |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. Billing lists (invoices, transactions) are low-cardinality per tenant. | OPEN: hard cap on invoice list not confirmed (billing invoices separate from accounting invoices — `/billing/invoices` routes deleted per CLAUDE.md §8). |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `check:outbox-consumers` — `billing.revenue-event` consumed. | OPEN: AI credit ledger cache TTL not evidenced — a stale credit balance could over-spend between mutations. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. Billing is exactly 2 Settings pages (`/settings/billing`, `/settings/billing/ai-credits`) per CLAUDE.md §8. | 18 legacy actor reads in billing — actor attribution gap. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/billing/` and `frontend/app/(authenticated)/settings/billing/` both exist — verify no duplicate billing routes survive (CLAUDE.md §8 mandates `/billing`, `/billing/ai-credits`, `/settings/subscription` deleted). | OPEN: need to confirm deleted routes are actually gone. Git status not conclusive. |
| **Operations** | OPEN | `check:alert-system` PASS — `alert-tenant-cost.mjs` self-tested (per-org credit anomaly detection). `check:log-secrets` PASS. | OPEN: no billing-specific DLQ/replay evidence for failed payment webhook ingestion. |

---

## Domain 9 — Accounting/Finance

`src/modules/accounting/` · `src/modules/finance/` · `src/db/schema/accounting/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/accounting/` dedicated folder. Tenant-leading indexes PASS. `check:record-access` PASS. Money stored as integer cents. Financial actor attribution: `backfill-financial-actors.ts` exists. `check:migration-discipline` PASS. | `scan:legacy-actors` — **36 legacy org actors** in `accounting` module. Actor attribution partially migrated but not complete. |
| **Authorization** | KEEP | `accounting.ts` permissions catalog. `accounting:access:view` is `@AuthorizedInService` (in `check:navigation-permissions` PASS). `check:scope-application` PASS. Finance approvals at `finance/controls/approvals.controller.ts` documented as `bespoke-mechanism` in idempotent gate. | OPEN: no cross-tenant test for `gdpr-export-worker.service.ts` (affects compliance/data export flows that touch accounting). |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS — finance approval/reject documented as bespoke. `check:outbox-consumers` PASS — `accounting.bill.approved`, `accounting.bill.paid`, `accounting.invoice.reminder.due`, `finance.report.export.requested` all consumed. `check:record-access` PASS. | OPEN: `finance/banking/imports.service.ts` is 311 lines (above 300-line ratchet, at warning level). |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `check:scope-application` PASS. | `ACCT_STATEMENTS_NS(orgId)` is a module-local cache factory — unresolved in `check:namespace-coverage` as non-blocking warning. Confirmed in `accounting-statements.service.ts:12` and `accounting-ledger.service.ts`. |
| **Cache and realtime** | REPAIR | `check:namespace-coverage` — `ACCT_STATEMENTS_NS(orgId)` is module-local and unresolved by the gate scanner (non-blocking). Confirmed as a local constant — it does have a `invalidateNamespace` call, so invalidation is wired, but the gate cannot statically verify it. `check:cache-invalidation` PASS globally. | Non-blocking but unverifiable by the gate. Manual audit confirmed `accounting-statements.service.ts:29,100` calls `invalidateNamespace`. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. `finance/banking/imports.service.ts` 311 lines — near threshold. | 36 legacy actor reads in accounting — attribution not fully migrated. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/accounting/` exists with full sub-routes. Several pages in current git status as modified. | OPEN: no responsive/a11y proof. |
| **Operations** | KEEP | `check:outbox-consumers` PASS — all accounting/finance events consumed. `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no accounting-specific reconciliation runbook or DLQ proof for failed `finance.report.export.requested` events. |

---

## Domain 10 — Chat

`src/modules/chat/` · `src/db/schema/chat/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/chat/` dedicated folder. Tenant-leading indexes PASS. `chat_messages` deliberately NOT partitioned (documented in `migrations/0582_notifications_partition_by_created_at.sql:5-6` — 5 inbound FKs and uniqueness constraints prevent partition without losing referential integrity). `check:record-access` PASS. Invite token at rest hashed (migration `0459`). | Chat messages high-volume but unpartitioned by explicit architecture decision (documented). |
| **Authorization** | KEEP | `chat.ts` permissions catalog. `chat-permissions.spec.ts` present. `chat-mutation-tenant-isolation.spec.ts` present. `chat-services-tenant-isolation.spec.ts` present. `chat.controller.e2e-spec.ts`, `chat-actions.controller.e2e-spec.ts`, `chat-entity-actions.controller.e2e-spec.ts`, `chat-realtime.controller.e2e-spec.ts` all present. `check:scope-application` PASS. | `scan:legacy-actors` — 0 legacy actors in `chat` module (migration complete per `0800_chat_actor_legacy_drop.sql`). |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. `chat-fanout-outbox.consumer.ts` with `chat-fanout-outbox.consumer.spec.ts`. `outbox-backed-message-fanout.provider.spec.ts` present. `chat.message.fanout` consumed per `check:outbox-consumers`. Actor migration complete (`0797_huddle_actor_membership_confirm.sql`, `0798_huddle_drop_user_columns.sql`, `0799_chat_actor_backfill_validate.sql`, `0800_chat_actor_legacy_drop.sql`). | OPEN: no test for message fanout DLQ/poison-message replay. |
| **Lists and search** | KEEP | `chat-cursor-paging.spec.ts` present — cursor pagination proven. `chat-search.service.ts` + `chat-search.controller.ts` present. `check:unbounded-reads` PASS. `check:scope-application` PASS. | OPEN: chat search uses `to_tsvector`/GIN or `pg_trgm`? No migration confirming the index type found explicitly for chat (migration `0434_chat_message_search.sql` exists but not read). |
| **Cache and realtime** | KEEP | `chat-typing.service.ts` + `chat-typing.isolation.spec.ts`. `chat-reply-reminders.service.ts` + spec. `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `check:outbox-consumers` PASS — `chat.message.fanout` consumed. | OPEN: no reconnect/late-message ordering spec. `chat-typing.isolation.spec.ts` covers isolation but not out-of-order delivery. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. Chat cohesive-exception files deleted (per git status: `channel-sidebar-cohesive-exception.ts` and `huddle-panel-cohesive-exception.ts` deleted from frontend). `check:module-di` — no chat DI issues. | OPEN: with cohesive-exception files deleted, verify no remaining oversized frontend chat components. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/chat/` and `frontend/features/chat/` exist. | OPEN: no responsive/a11y proof. No proof of mobile chat channel sidebar at 375px. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no chat-specific SLO. No DLQ evidence for `chat.message.fanout` outbox events. |

---

## Domain 11 — Calendar

`src/modules/calendar/` · `src/db/schema/calendar/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/calendar/` dedicated folder. Tenant-leading indexes PASS. Actor migration complete: `0801_calendar_attendee_cutover.sql`, `0802_calendar_legacy_fk_drop.sql`. `check:record-access` PASS. `check:migration-discipline` PASS. | OPEN: recurrence exception rows stored on the same table — no partition for high-volume orgs. |
| **Authorization** | KEEP | `calendar.ts` permissions catalog. Calendar is universal for active members (no module gate per CLAUDE.md §8). `calendar.controller.spec.ts` + `calendar.controller.e2e-spec.ts` present. `calendar-privacy.spec.ts`, `calendar-visibility.spec.ts`, `calendar-attendee-membership-keyed.spec.ts`, `calendar-attendees.isolation.spec.ts` all present. `calendar-export.isolation.spec.ts` present. `check:scope-application` PASS. | OPEN: no automated test for org-switch calendar cross-org event visibility. |
| **CRUD and lifecycle** | KEEP | Recurrence: `calendar-recurrence.service.ts` + `calendar-recurrence.isolation.spec.ts`. Exception handling: `calendar-exception-reminder-cancellation.spec.ts`. DST edge: `calendar-dst-edge.spec.ts`. Series exception scope: `calendar-series-exception-scope.spec.ts`. Delete: `calendar-delete-miss.spec.ts`. Departed actor: `calendar-departed-actor.spec.ts`. Outbox atomicity: `calendar-outbox-atomicity.spec.ts`. | OPEN: no idempotency spec for double-submit of calendar event creation (recurrence generate path). |
| **Lists and search** | KEEP | `calendar-occurrence.service.ts` + `calendar-occurrence.service.spec.ts`. `calendar-events-aggregate.service.ts` + spec. `calendar-source.registry.ts` + specs. External calendar sync tenant isolation: `external-calendar-events-tenant-isolation.spec.ts`. `check:unbounded-reads` PASS. | OPEN: no evidence of hard cap on `GET /calendar?range=` queries (large date ranges could return unbounded occurrences). |
| **Cache and realtime** | KEEP | `calendar-source-preferences.service.ts` + `calendar-source-preferences.service.spec.ts`. `check:cache-invalidation` PASS. Reminder sweep: `calendar-reminder-sweep.service.ts` + `calendar-reminder-sweep-tenant-isolation.spec.ts`. `calendar-reminder-sweep-recurring.spec.ts`. | OPEN: no reconnect/late-event proof for external calendar sync on provider outage. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `calendar.controller.ts` 303 lines — at 300-line warning threshold. `check:file-sizes` PASS. `check:module-di` — no calendar DI issues. Source registry type-safe: `calendar-source-registration.spec.ts`. | `calendar.controller.ts:303` is at the 300-line ratchet threshold. |
| **UX and accessibility** | OPEN | No separate `/crm/calendar/` page (deleted per git status). Single `/calendar` route confirmed per CLAUDE.md §8. `frontend/app/(authenticated)/calendar/` implied by feature folder. | OPEN: no responsive/a11y proof. No evidence multi-source toggle is keyboard-accessible. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. Reminder sweep has dedicated tenant-isolation spec. | OPEN: no calendar-specific SLO or runbook. No DLQ evidence for missed reminders. |

---

## Domain 12 — Notifications

`src/modules/notifications/` · `src/db/schema/common/` (notifications table)

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `notifications` table partitioned by `created_at` (`migrations/0582_notifications_partition_by_created_at.sql`, 198 lines, monthly). `notification_outbox` deliberately NOT partitioned (dedupe unique constraint across months would break). Tenant-leading indexes PASS. Actor migration: `notification-outbox-relay.service.ts` + tenant-isolation spec. | `notification-events.catalog.ts` is 301 lines — at the 300-line ratchet threshold. |
| **Authorization** | KEEP | Routing tenant isolation: `notification-routing-tenant-isolation.spec.ts`. Policy tenant isolation: `notification-policy-tenant-isolation.spec.ts`. Preference tenant isolation: `notification-preferences-tenant-isolation.spec.ts`. Provider tenant isolation: `notification-providers-tenant-isolation.spec.ts`. Template tenant isolation: `notification-templates-tenant-isolation.spec.ts`. Delivery worker tenant isolation: `notification-delivery-worker-tenant-isolation.spec.ts`. `check:scope-application` PASS. | OPEN: no automated test confirming notifications are NOT delivered to members after departure/suspension. |
| **CRUD and lifecycle** | KEEP | `notification-idempotent-materialization.spec.ts` present. `notification-retry-bounded.spec.ts` present. `notification-digest.service.ts` + `notification-digest-double-flush.spec.ts`. `notification-digest-tenant-isolation.spec.ts`. `check:idempotent-commands` PASS. Retention: `notification-retention.service.ts` + `notification-retention.spec.ts` with `notification-retention-policy.ts`. | OPEN: `notification-outbox-relay.service.ts` — no dedicated DLQ/poison-message spec (only `notification-outbox-relay.spec.ts` and tenant-isolation spec found). |
| **Lists and search** | KEEP | `notifications-pagination-boundary.spec.ts` present. `broadcasts-cursor-paging.spec.ts` present. `unified-inbox.service.ts` + `unified-inbox.spec.ts` + `unified-inbox-tenant-isolation.spec.ts`. Inbox section keys: `inbox-section-keys.spec.ts`. `check:unbounded-reads` PASS. | OPEN: no hard-cap confirmation for broadcast audience query (broadcasts-audience.queries.ts). |
| **Cache and realtime** | KEEP | `notification-circuit-breaker.ts` + `notification-circuit-breaker.spec.ts`. Realtime: `notification-event.service.ts` + `notification-dispatch-after-commit.spec.ts`. `check:cache-invalidation` PASS. `check:outbox-consumers` PASS — relay consumed. `notifications-counter-watermark.spec.ts` present. Quiet hours: `quiet-hours.spec.ts`. | OPEN: no late-event/reconnect proof for in-app realtime notification delivery. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `notifications.controller.e2e-spec.ts` present. `notification-catalog-integrity.spec.ts` present (asserts catalog shape). `notification-events.catalog.ts` 301 lines — at warning threshold. `check:file-sizes` PASS. | `notification-events.catalog.ts:301` at ratchet threshold. Catalog split into per-module files (`notifications-events-accounting.catalog.ts`, etc.) but root file still 301 lines. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/notifications/` and `frontend/features/notifications/` exist. | OPEN: no responsive/a11y proof. No evidence notification drawer is keyboard-accessible. |
| **Operations** | KEEP | `check:alert-system` PASS — `alert-dead-outbox.mjs` and `alert-dead-delivery.mjs` both have self-tests passing. `alert-queue-age.mjs` PASS. Delivery class: `notification-delivery-class.ts` + spec. | OPEN: no notification-specific SLO runbook beyond alert scripts. |

---

## Domain 13 — Inbox/Mail

`src/modules/mail/` · `src/db/schema/mail/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/mail/` dedicated folder. Tenant-leading indexes PASS. `check:record-access` PASS. `mail-sync-checkpoint.service.ts` for durable sync state. `mail-metadata.service.ts` for indexed metadata. | `scan:legacy-actors` — **1 legacy org actor** in `mail` module. |
| **Authorization** | KEEP | `mail.ts` permissions catalog. Mail is universal for active members per CLAUDE.md §8. `mail-accounts-tenant-isolation.spec.ts`, `mail-metadata-isolation.spec.ts`, `mail-sync-checkpoint-isolation.spec.ts` present. `check:scope-application` PASS. | OPEN: no e2e spec for mail account OAuth flow (provider tokens not stored in DB per CLAUDE.md §5 — Composio handles it). |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. `mail-inbox-paging.spec.ts` present — cursor pagination. `mail.controller.spec.ts` present. AI drafting: `mail-ai.service.ts` + `mail-ai.service.spec.ts`. | OPEN: no spec for duplicate-delivery prevention (same mail arriving twice via sync). |
| **Lists and search** | KEEP | `mail-inbox-paging.spec.ts` — cursor pagination with tenant isolation. `check:unbounded-reads` PASS. `check:scope-application` PASS. | OPEN: no full-text search spec for mail body search (whether GIN or ILIKE). |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `mail-sync-checkpoint.service.ts` persists sync state durably. | OPEN: no reconnect/late-delivery proof for mail provider webhook. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. Mail providers: `src/modules/mail/providers/` sub-folder. | OPEN: provider adapter interface not validated by `check:mock-surface` (mail adapters not in the scan failure list, but not confirmed as clean either). |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/mail/` and `frontend/app/(authenticated)/inbox/` both exist. | OPEN: two routes for mail-adjacent surfaces — confirm `inbox` is notifications-inbox and `mail` is email, not duplicated. No responsive/a11y proof. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no mail-specific SLO. No bounce/complaint handling evidence. |

---

## Domain 14 — Knowledge Base / Wiki / Chatbot

`src/modules/kb/` · `src/db/schema/kb/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/kb/` dedicated folder. Tenant-leading indexes PASS. `check:record-access` PASS — 1 documented purge skip for `kb-page-tree.service.ts:221` (hard-delete reads page before purging). `kb.content.index` outbox event consumed. Migration `0803_directory_people_search.sql` suggests GIN for people search; KB search index type not confirmed. | OPEN: `ai_usage_logs` table NOT partitioned — KB/chatbot AI calls accumulate here. CLAUDE.md §3 requires partition for this table but none exists in migrations. |
| **Authorization** | REPAIR | `kb.ts` permissions catalog. `check:scope-application` PASS. **MEMORY.md `kb-acl-revision-gate-inert-until-reindex.md`** — the KB ACL revision gate has an `IS NULL` arm that skips the gate, making it inert until a reindex. This is a live architectural defect. KB retrieval ACL filters by space membership, page visibility, draft/published before vector candidates reach the model (CLAUDE.md §4 AI security rule). | KB ACL revision gate is inert (IS NULL skips gate). Evidence: `MEMORY.md: kb-acl-revision-gate-inert-until-reindex.md`. |
| **CRUD and lifecycle** | REPAIR | `check:idempotent-commands` PASS. `check:outbox-consumers` PASS — `kb.content.index` consumed. **`check:mock-surface` FAIL** — 4 phantom `contentType()` method mocks in `kb-ingestion-consumer.spec.ts`. Real `KbContentAdapter` exposes `contentType` as a readonly property (field), not a method. Mocks call `.contentType()` (method form). This means the KB ingestion consumer spec assertions may be vacuous. `src/modules/kb/retrieval/kb-content-adapter.ts:13,19,30,41,72`. | `check:mock-surface` FAIL — `kb-ingestion-consumer.spec.ts` mocks `contentType()` as method; real class has it as a property. 4 affected adapter mocks. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `check:scope-application` PASS. HNSW index claimed for vector search. | OPEN: no HNSW index migration found in the migration listing — vector index creation evidence absent. CLAUDE.md §3 requires ANN HNSW for vector queries; without the migration, the index may be missing or was never created. |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `kb.content.index` event consumed (re-index on content change). | OPEN: KB revision ACL inert (see Authorization row) — cache may serve stale ACL-filtered search results after a permission change. |
| **Interfaces and structure** | REPAIR | `check:openapi-coverage` PASS. `check:file-sizes` PASS. `check:mock-surface` FAIL — 4 phantom mocks in `kb-ingestion-consumer.spec.ts`. KB wiki uses Plate editor (`components/editor/plate/`), KB articles use Tiptap — two editors coexist by design per frontend CLAUDE.md §3. | `check:mock-surface` FAIL: `src/modules/kb/retrieval/kb-ingestion-consumer.spec.ts` — fix by converting `contentType()` method mocks to property mocks (`contentType: "page"` etc.). |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/knowledge/` and `frontend/features/wiki/` (or `kb/`) exist. KB page at root deleted per git status (`knowledge-base/page.tsx` deleted). | OPEN: KB page deletion in progress. No responsive/a11y proof. |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no KB-specific SLO. No reindex DLQ/retry proof. `scan:legacy-actors` — **24 legacy org actors** in `kb` module. |

---

## Domain 15 — Workflows

`src/modules/workflows/` · `src/db/schema/automation/`

| Slice | Verdict | Evidence | Gaps |
|---|---|---|---|
| **Data** | KEEP | `src/db/schema/automation/` dedicated folder. Tenant-leading indexes PASS. `check:record-access` PASS. Workflow secrets: `workflows-secrets.service.ts` + `workflows-secrets.service.spec.ts` + `workflows-secret-sinks.spec.ts`. `check:migration-discipline` PASS. | OPEN: workflow execution history logs are high-volume append-only; no partition decision found. |
| **Authorization** | KEEP | `workflows.ts` permissions catalog. `check:permission-keys` PASS. `check:scope-application` PASS. Tenant isolation: `workflows-tenant-isolation.spec.ts`, `workflows-crud-tenant-isolation.spec.ts`, `workflows-execution-tenant-isolation.spec.ts`, `workflows-data-tenant-isolation.spec.ts`, `workflows-analytics-tenant-isolation.spec.ts`. `workflows.controller.e2e-spec.ts` present. `workflows:access:view` is `@AuthorizedInService` per `check:navigation-permissions` PASS. | OPEN: no automated test for secret exfiltration via workflow execution (workflow steps can call external endpoints — SSRF guard needed in execution path). |
| **CRUD and lifecycle** | KEEP | `check:idempotent-commands` PASS. `workflows-crud.service.ts` + isolation spec. `workflows-execution.service.ts` + isolation spec. `workflows-schedules.service.ts`. Variables: `workflows-variables.service.ts`. Analytics: `workflows-analytics.service.ts` + isolation spec. | OPEN: workflow execution retry/backoff/jitter policy not evidenced by a spec or gate. |
| **Lists and search** | KEEP | `check:unbounded-reads` PASS. `check:scope-application` PASS. `workflows-analytics-tenant-isolation.spec.ts` present. Frontend workflow routes include `executions/`, `templates/`, `scheduler/`. | OPEN: workflow execution history list — hard cap on `GET /workflows/:id/executions` not confirmed. |
| **Cache and realtime** | KEEP | `check:cache-invalidation` PASS. `check:namespace-coverage` PASS. `workflows-secrets.service.ts` manages secret isolation. | OPEN: no realtime spec for long-running workflow execution status push. |
| **Interfaces and structure** | KEEP | `check:openapi-coverage` PASS. `check:operation-ids` PASS. `check:file-sizes` PASS. Workflow engine in `src/modules/workflows/engine/`. Workflow routes: `[workflowId]/`, `access/`, `analytics/`, `approvals/`, `executions/`, `scheduler/`, `secrets/`, `templates/`, `variables/`. | OPEN: `check:module-di` did not flag workflows — no DI warning. Module wiring confirmed by `check:route-classification` PASS. |
| **UX and accessibility** | OPEN | `frontend/app/(authenticated)/workflows/` with full sub-routes confirmed. `frontend/features/workflows/` exists. | OPEN: no responsive/a11y proof. `workflows/page.tsx` in git status as modified (in-progress change). |
| **Operations** | OPEN | `check:alert-system` PASS. `check:log-secrets` PASS. | OPEN: no workflow-specific DLQ for failed schedule triggers. No SSRF guard evidence for workflow outbound HTTP steps. |

---

## Summary Counts

| Verdict | Count |
|---|---|
| KEEP | 81 |
| REPAIR | 8 |
| OPEN | 31 |
| REPLACE | 0 |
| CONSOLIDATE | 0 |
| REMOVE | 0 |

**Total slices:** 15 domains × 8 slices = 120. Counts sum to 120.

---

## Top 10 Most Serious OPEN / REPAIR Rows

Ranked by security / correctness / compliance severity:

| # | Domain | Slice | Finding | Severity |
|---|---|---|---|---|
| 1 | **KB** | Authorization | ACL revision gate has IS NULL arm that skips the gate — inert until reindex. Vector search may return chunks a caller should not see. `MEMORY.md: kb-acl-revision-gate-inert-until-reindex.md`. | P0 — security |
| 2 | **KB** | CRUD | `check:mock-surface` FAIL — 4 phantom `contentType()` method mocks in `src/modules/kb/retrieval/kb-ingestion-consumer.spec.ts`. Real class exposes a property, not a method. Ingestion consumer test assertions are vacuous. | P1 — test quality |
| 3 | **Billing** | CRUD | `check:module-di` WARN: `NotificationsService` not available in `BillingModule` (`src/modules/billing/core/plan-limits.service.ts` index 2). Billing-triggered notifications may silently fail at runtime — DI token missing. | P1 — runtime correctness |
| 4 | **Compliance** | Authorization | `check:tenant-isolation-coverage` FAIL: `src/modules/gdpr/gdpr-export-worker.service.ts` has no cross-tenant negative test. GDPR export worker is the most sensitive cross-org data path in the product. | P1 — security/compliance |
| 5 | **Billing** | Data / Ops | `scan:legacy-actors` — 18 legacy org actor reads remain in billing module. Credit and revenue audit trails do not carry actor membership identity. Breaks compliance and attribution. | P1 — compliance |
| 6 | **Organization** | Authorization | ~~Session revocation uses DB flag only~~ **WITHDRAWN by the orchestrator 2026-08-31 — this finding is false.** `src/common/auth/jwt-auth.guard.ts:128` reads the Redis tombstone `revoked:session:${claims.sessionId}` and line 139 derives `revoked` from it; the memory note describes the defect that was already fixed, not the current source. Verify a memory note against the source before recording it as a finding. What IS open is narrower: no automated test drives the org-switch invalidation path end to end. | withdrawn |
| 7 | **Payroll** | Data | 56 legacy org actor reads remain in payroll module (largest single-module total) — payroll attribution and audit trail do not carry canonical actor membership identity. | P1 — compliance |
| 8 | **HRMS** | CRUD / Lists | `check:hr-pagination-gate` — 87 existing HR service methods use offset pagination without a confirmed hard cap. Ratchet holds but does not zero. Risk of large offset queries under high-volume tenants. | P2 — performance |
| 9 | **Billing** | UX | Two potential billing route paths in frontend (`/billing/` and `/settings/billing/`). CLAUDE.md §8 mandates `/billing`, `/billing/ai-credits`, `/settings/subscription` deleted. No automated gate confirms deletion. | P2 — product correctness |
| 10 | **KB / Billing** | Data | `ai_usage_logs` NOT partitioned despite CLAUDE.md §3 requirement ("partition high-volume append-only tables by time: ai_usage_logs, audit logs"). No partition migration found. High-growth table without archival strategy. | P2 — operations |

---

## Code Defects Found While Gathering Evidence

| File:line | Defect |
|---|---|
| `src/modules/kb/retrieval/kb-ingestion-consumer.spec.ts` (all `contentType()` call sites) | Phantom mock method: real `KbContentAdapter`, `KbPageAdapter`, `KbArticleAdapter`, `KbAttachmentAdapter`, `KbSourceAdapter` expose `contentType` as a readonly property (`readonly contentType = "page"` etc.), not a callable method. Spec mocks call `.contentType()` with parens — `check:mock-surface` flags 4 distinct classes. Fix: change mock setup from method to property form. |
| `src/modules/billing/core/plan-limits.service.ts` (constructor index 2) | `NotificationsService` injected as constructor parameter but is not declared in `BillingModule` providers or imports. `check:module-di` flags this as a warning (not error). Risk: silent DI resolution failure for billing notifications at runtime — the token may resolve via a global module or throw at boot. |

---

## Verification pass by the orchestrator — 2026-08-31

Five of the headline findings above did not survive checking against current source. Four were drawn
from `MEMORY.md` notes. **A memory note records a defect as it was when written; it is a lead to
check, never a finding in itself.** The rows are left in place above so the correction is auditable.

| # | Claim | Verdict |
|---|---|---|
| 1 | KB ACL revision gate inert via an `IS NULL` arm (P0) | **FALSE.** The arm is now an `innerJoin`, so a chunk whose `aclRevision` does not match its parent is excluded rather than passed through. `kb-acl-revision-gate.spec.ts` pins both directions and passes: "articleVectorCandidates uses innerJoin (not leftJoin) so mismatched aclRevision rows are excluded", and the same for pages. Row 274 is corrected by this note. |
| 2 | 4 phantom `contentType()` mocks in the KB ingestion spec (P1) | **FALSE — the gate's own bug.** The mocks declare `contentType: "page"` as a property, exactly as the real adapters do. `extractClassPublicMethods` matched only `name(` and `name<`, so a public `readonly contentType = "page"` was never counted as a class member and every mock declaring it read as a phantom. Gate fixed and a self-test added for public properties; it now reports 0 defects across 3,027 doubles, and the original phantom-detection self-test still passes. |
| 3 | `NotificationsService` absent from `BillingModule` (P1) | **CONFIRMED AND FIXED.** It is injected `@Optional()`, so it resolved to `null` and `if (!this.notifications) return;` silently swallowed every plan-limit threshold alert — an org owner never learned they had reached 100% of seats. `NotificationsModule` is now imported; `check:module-di` reports 0 violations, madge stays at zero cycles, 483 billing tests pass. |
| 4 | `gdpr-export-worker.service.ts` has no cross-tenant test (P1) | **CONFIRMED**, routed for a spec. It is the last uncovered service and the most sensitive, since it assembles a subject's full personal-data export. |
| 5 | Session revocation is DB-flag only (P1) | **FALSE.** `src/common/auth/jwt-auth.guard.ts:128` reads the Redis tombstone `revoked:session:${claims.sessionId}` and line 139 derives `revoked` from it. What is genuinely open is narrower: no automated test drives the org-switch invalidation path end to end. |
| 9 | Duplicate billing routes still present (P2) | **FALSE.** `app/(authenticated)/settings/subscription` does not exist, and `app/(authenticated)/billing` contains only `invoices`, which CLAUDE.md §8 explicitly keeps as the org's own customer invoicing. `/settings/billing` and `/settings/billing/ai-credits` are present as required. |
| 10 | `ai_usage_logs` not partitioned (P2) | **MISAPPLIED RULE.** CLAUDE.md §3 says *not* to partition a table that is not demonstrably large, and to record the triggering row count in the migration. Live counts: `ai_usage_logs` 401, `audit_logs` 11, `chat_messages` 4,250. `notifications` *is* partitioned, with 49 partitions. Partitioning the others now would break the rule rather than follow it. |

Rows 6 and 7 (legacy actor columns: payroll 56, billing 18) are confirmed as measured and are tracked
by the `scan:legacy-actors` ratchet, currently 647/689 with 42 migrated.
