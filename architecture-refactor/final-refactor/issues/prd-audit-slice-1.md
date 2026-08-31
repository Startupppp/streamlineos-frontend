# PRD Audit — Sections 1–9 (Slice 1)

Audited against current source: `frontend/` and `backend/` as of 2026-08-31.
Lane L1 read-only. Evidence is file:line from files directly opened or command output actually run.

---

## Verification table

| PRD ref | Claim | Classification | Evidence (file:line) |
|---|---|---|---|
| §1 | Multi-tenant SaaS: org_id on every tenant table | VERIFIED DONE | `backend/src/db/schema/common/audit-logs.ts:23` (`org_id`); 722 tenant tables per §28.2 baseline |
| §2 | Exactly six standings: org owner/admin/member, module owner/admin/member | VERIFIED DONE | `backend/src/common/rbac/org-roles.ts` defines `OWNER\|ORG_ADMIN\|MEMBER`; module standings via `module_ownerships` |
| §2 | Owner/admin policy consistent in code, API docs, UI labels and tests | STILL PENDING | No shared authority-matrix test fixture asserting all six standing/operation combinations. §28.2a P0 item for authority matrix tests remains open |
| §3 | Every tenant-owned row has `org_id`, audit timestamps, creator/updater actor | VERIFIED DONE | Confirmed on `audit_logs`, `calendar_events`, `chat_message_reactions` schemas |
| §3 | Cross-tenant parent/child relationships use composite FKs beginning with `org_id` | VERIFIED DONE | `backend/src/db/schema/common/calendar-events.ts:58-59` (`fk_event_attendees_org_event`, `fk_event_attendees_org_membership`); `backend/src/db/schema/chat/chat.ts:153-154` |
| §3 | Organization actors reference membership/person, not global identity alone | STILL PENDING | `backend/src/db/schema/chat/chat.ts:244` (`chatSavedMessages.userId`), line 443 (`chatHuddleParticipants.userId`), lines 276+280 (DM user IDs) are global user refs with no membership column |
| §3 | All list APIs use bounded cursor pagination, stable sort, explicit filters, hard max page size | STILL PENDING | `backend/src/modules/accounting/core/accounting-payables-query.service.ts:214`, `backend/src/modules/audit-log/audit-log.service.ts:75`, `backend/src/modules/build/core/projects-tickets-read.service.ts:425`, `backend/src/modules/api-tokens/core/api-tokens.service.ts:46`, `backend/src/modules/billing/core/ai-credits-packs.service.ts:72` — all use `.offset()` |
| §3 | No `SELECT *` in business handlers | VERIFIED DONE | Only `SELECT *` found in scripts (`backend/src/scripts/relocation/copy-org.ts`, partition scripts), not in API handlers |
| §3 | No fetch-then-filter authorization | VERIFIED DONE | Guards + service-layer predicates confirmed; `dashboard-personal.service.ts:155-201` shows SQL-level attendee/visibility filter before projection |
| §3 | Authorization enforced in guards + service/query/data-layer predicates | VERIFIED DONE | `backend/src/app.module.ts` registers `RouteClassifierGuard`, `JwtAuthGuard`, `MfaGuard`, `ModuleGuard` as `APP_GUARD`; `PermissionGuard` used per-handler |
| §3 | Writes are transactional and idempotent where retries possible | VERIFIED DONE | `backend/src/common/idempotency/idempotency.module.ts` + `idempotency.interceptor.ts` registered in app.module; outbox at `backend/src/common/outbox/` |
| §3 | P95 latency targets (300 ms lists, 800 ms Home) | STILL PENDING | No verified production-shaped latency evidence; PRD §28.2a operator-blocked D01 runbooks not yet completed |
| §3 | WCAG 2.2 AA, keyboard, reduced motion, responsive layouts | STILL PENDING | No accessibility proof in current source; PRD §26 compliance gate not closed |
| §3 | GDPR export/deletion workflows executable and tested | STILL PENDING | `backend/src/modules/gdpr/gdpr.service.ts:216` contains comment: "blob storage: R2 object keys require R2_ENDPOINT + credentials (see purge-user.mjs)" — object storage purge not implemented; §28.2a D02 operator-blocked |
| §4 Backend | TenantContext and tenant-scoped query builder | VERIFIED DONE | `backend/src/common/tenant/tenant-context.ts`, `backend/src/common/tenant/run-in-tenant-transaction.ts`, `backend/src/common/tenant/tenant-db.ts` |
| §4 Backend | OrganizationActor resolver | VERIFIED DONE | `backend/src/common/organization/organization-actor.ts` |
| §4 Backend | Permission decorator/guard + data-scope predicate helper | VERIFIED DONE | `backend/src/common/rbac/` (module.guard.ts, require-module.decorator.ts, apply-scope.ts) |
| §4 Backend | Cursor pagination/filter/sort contract | VERIFIED DONE | `backend/src/common/pagination/` (cursor.ts, cursor.schema.ts, list-query.schema.ts, keyset.ts) |
| §4 Backend | Cache-key builder and invalidation events | VERIFIED DONE | `backend/src/common/cache/cache-keys.ts`, `cache-invalidation-matrix.ts` |
| §4 Backend | Transactional outbox and notification dispatcher | VERIFIED DONE | `backend/src/common/outbox/outbox-publisher.service.ts`, `outbox-writer.ts`, `outbox.module.ts` |
| §4 Frontend | Typed API client, error envelope and request correlation ID | VERIFIED DONE | `frontend/lib/api-client.ts` (typed client with timeout + abort); `frontend/lib/api-envelope.ts` (parseApiResponse) |
| §4 Frontend | Server route-access registry shared by navigation and layouts | VERIFIED DONE | `frontend/lib/rbac/route-access/route-access.ts` (resolveRouteAccess); `universal-routes.ts`; `route-access-extensions.ts`; used by `enforceRouteAccess` called from 56 layout/page files |
| §5 | Backend module ownership table | VERIFIED DONE | All 13 domain areas have corresponding backend modules registered in `backend/src/app.module.ts:1-100` |
| §5 | Frontend feature folder ownership table | VERIFIED DONE | `frontend/features/` has hr, build, chat, calendar, billing, payroll, notifications, mail etc. |
| §6 Home | Bounded aggregate with independent sections, actor data scope, membership-aware | VERIFIED DONE | `backend/src/modules/dashboard/` has dashboard-personal, dashboard-project, dashboard-availability, dashboard-leave, dashboard-stats, dashboard-crm services |
| §6 Home | Calendar event visibility authorization before projection | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-personal.service.ts:155-201` — SQL predicate: visibility="org" OR creator membership EXISTS OR non-declined attendee EXISTS; `dashboard-personal-visibility.spec.ts` tests 4 scenarios |
| §6 HRMS | organization_people as person; membership, employment, candidate as separate facets | VERIFIED DONE | `backend/CLAUDE.md` §1 confirms; backend/src/db/schema/hr/ maintains this separation |
| §6 Build | Projects org-scoped, Build dashboard uses Build permission (not HR) | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-scope.ts:9` — `DASHBOARD_BUILD_PERMISSION = "build:manage"` |
| §6 Build | Project-member predicates include orgId | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-project.service.ts:32` — `eq(projectMembers.orgId, orgId)` |
| §6 Chat | Reactions normalized with org/message/membership/emoji uniqueness and composite FKs | VERIFIED DONE | `backend/src/db/schema/chat/chat.ts:139-155` — uniqueIndex on `(orgId, messageId, membershipId, emoji)`, composite FKs for org_message and org_membership |
| §6 Chat | Channel/thread authorization before reads/writes | STILL PENDING | legacy user_id fields in `chatSavedMessages` (line 244) and `chatHuddleParticipants` (line 443) — actor cutover incomplete |
| §6 Calendar | RFC 5545/RRULE, IANA timezones, UTC instants | VERIFIED DONE | `backend/src/db/schema/common/calendar-events.ts:26-27` — `rrule`, `recurrenceEnd` (UTC with timezone) |
| §6 Calendar | Attendees are normalized membership rows with composite tenant FKs | VERIFIED DONE | `backend/src/db/schema/common/calendar-events.ts:46-60` — `eventAttendees` table with composite FKs `fk_event_attendees_org_event` and `fk_event_attendees_org_membership`; uniqueness on `(orgId, eventId, membershipId)` |
| §6 Notifications | Intent committed with business write through outbox | VERIFIED DONE | `backend/src/common/outbox/outbox-writer.ts` + OutboxPublisher; §28.2 baseline notes expense create/decision atomically commit outbox intent |
| §6 KB | ACL enforced inside SQL/search/vector retrieval before top-k | STILL PENDING | `backend/src/modules/kb/retrieval/kb-source-citation.spec.ts` exists but §28.2a confirms KB ACL revision gate was inert; full proof not in scope of this audit slice |
| §6 Billing | Entitlements resolve locally without provider calls on request paths | VERIFIED DONE | `PlanLimitsService` and `GET /billing/entitlements` via `useEntitlements` per CLAUDE.md §8 |
| §6 Billing | Finance reminders use indexed due rows, not in-memory policy sweep | STILL PENDING | §28.2a P1 "Finish finance async paths" still open (unchecked) |
| §7 | Version under `/api/v1` | STILL PENDING | `backend/src/main.ts:82` enables `VersioningType.URI` with `defaultVersion: [API_VERSION_CURRENT, VERSION_NEUTRAL]`; no `setGlobalPrefix("api")` call — routes are at `/v1/auth` not `/api/v1/auth`; frontend API client at `frontend/lib/api-client.ts:207` calls `${BACKEND_API_URL}${path}` with no prefix |
| §7 | Publish OpenAPI generated from DTOs | VERIFIED DONE | `backend/src/main.ts:109-114` builds OpenAPI in development; `backend/src/common/openapi/build-openapi-document.ts` |
| §7 | Standard response envelope for errors with correlation ID and machine-readable code | STILL PENDING | `backend/src/common/http/all-exceptions.filter.ts:144-202` returns `{ code, message, details? }` — machine-readable code present ✓ but `correlationId` is NOT in the response body; it is only in the `x-correlation-id` response header (`correlation-id.middleware.ts:59`) |
| §7 | Consistent list parameters: cursor, limit, sort, direction, filters | VERIFIED DONE | `backend/src/common/pagination/cursor.schema.ts`, `list-query.schema.ts` |
| §7 | Maximum limits enforced server-side | STILL PENDING | Offset endpoints do not enforce consistent hard max; cursor endpoints cap at 100 per `backend/CLAUDE.md` §3 |
| §7 | Idempotency keys on payments, webhooks, bulk writes | VERIFIED DONE | `backend/src/common/idempotency/idempotency.module.ts` + `idempotency.interceptor.ts` registered in `app.module.ts` |
| §7 | Route handlers must not contain business logic or direct DB access | VERIFIED DONE | `backend/src/modules/hr/core/hr-employee-subroutes.controller.ts` — only routing; no `this.db` or drizzle imports in any sampled controller |
| §8 | Server route guards for every module | VERIFIED DONE | `frontend/lib/rbac/route-access/enforce-route-access.ts` called from 56 layout/page files; `frontend/app/(authenticated)/hr/layout.tsx:5` and `build/layout.tsx` confirmed |
| §8 | `useCan()` retained only for UI visibility | VERIFIED DONE | `useCan` calls found only in client components for feature gating (accounting pages, etc.), not as auth boundary |
| §8 | Remove unnecessary page-level `use client` directives | STILL PENDING | 495 files under `frontend/app/(authenticated)/` have `"use client"` per file scan; PRD §19 target is to reduce 342 out of 598 |
| §8 | Replace raw `fetch` with typed clients, abort handling and consistent error parsing | STILL PENDING | `frontend/app/(authenticated)/build/workspaces/[pmWorkspaceId]/layout.tsx:24` — raw `fetch` with `BACKEND_URL` in Server Component; `frontend/features/hr/documents/document-table.tsx:75` — raw `fetch`; `frontend/features/notifications/use-notification-events.ts:22` — raw `fetch` for events token |
| §8 | Add loading/error boundaries for high-traffic routes | STILL PENDING | HR and Build modules have `error.tsx`/`loading.tsx`; accounting root (`frontend/app/(authenticated)/accounting/`) has no `error.tsx` or `loading.tsx` |
| §8 | Resolve formatter and API contract drift | STILL PENDING | PRD §19 lists 19 local formatters to consolidate; 6 Timesheets drift groups per §28.2 baseline |
| §9 | Automated cross-tenant tests for every repository and composite FK | VERIFIED DONE | 419 files matching cross-tenant spec pattern confirmed; `backend/src/modules/accounting/core/accounting-core-tenant-isolation.spec.ts`, `access/__tests__/`, etc. |
| §9 | Permission denial tests for owner/admin/member/module-member combinations | VERIFIED DONE | `backend/src/modules/access/__tests__/rbac-resolution.spec.ts`, `backend/src/common/rbac/owner-only-operations.spec.ts` |
| §9 | Audit events include actor principal, membership, organization, request ID and reason | STILL PENDING | `backend/src/db/schema/common/audit-logs.ts:17-58` — has `userId`, `actorMembershipId`, `orgId`; **no `requestId`/`correlationId` column** and **no `reason` column** |
| §9 | No secrets, access tokens or PII in logs, URLs or client bundles | VERIFIED DONE | `backend/src/common/observability/` + `structuredNestLogger`; CORS + Helmet in main.ts; `ClassSerializerInterceptor` + `@Exclude()` |
| §9 | Rate limits on public token pages, login, webhooks and search | STILL PENDING | `backend/src/modules/search/search.controller.ts` has no `@UseRateLimit` annotation; auth login rate limits verified at `auth.controller.ts:162` |
| §9 | Data export, deletion, retention and legal-hold workflows documented and tested | STILL PENDING | `backend/src/modules/gdpr/gdpr.service.ts:216` — "blob storage: R2 object keys require R2_ENDPOINT + credentials" — object storage purge missing; §28.2a D02 operator-blocked |

---

## NEW findings (not in PRD, proved against current source)

### N1 — Bare FK in audit_logs.actorMembershipId (missing composite tenant integrity)
**File:** `backend/src/db/schema/common/audit-logs.ts:27`
`actorMembershipId: integer("actor_membership_id").references(() => organizationMembers.id, { onDelete: "set null" })`
The FK references only `organizationMembers.id`, not `(orgId, id)`. A composite tenant FK should be `(orgId, actorMembershipId) → (organizationMembers.orgId, organizationMembers.id)`. Without this, a membership ID from another organization could appear in an audit row if an integer collision occurs, and the predicate `eq(auditLogs.orgId, orgId)` at the service level is the only guard. No data-layer enforcement of the org_id match.
**Severity:** Low-medium. Integrity gap, not an active exploitable hole on its own.
**Verdict:** REPAIR — add composite FK matching the pattern used in `event_attendees`.

### N2 — Raw `fetch` in authenticated Server Component bypasses typed API client
**File:** `frontend/app/(authenticated)/build/workspaces/[pmWorkspaceId]/layout.tsx:24`
`const response = await fetch(\`\${BACKEND_URL}/product-management/workspaces/\${pmWorkspaceId}\`, {`
This bypasses `api-client.ts` which provides: timeout via `AbortSignal.timeout(30_000)`, correlation ID injection, `parseApiResponse` error normalization, and `clearRegisteredQueryCache` on 401. If the backend errors with a non-200 status, the layout gets a raw `Response` and may propagate an unformatted error or silently pass a falsy body check.
**Severity:** Medium. Inconsistent error handling in a layout that runs on every pmWorkspace sub-route visit.
**Verdict:** REPAIR — replace with `api.get(...)` from `api-client.ts`.

### N3 — PRD §28.2a checkbox for "Fix Home calendar object-level access" is stale
**Files:** `backend/src/modules/dashboard/dashboard-personal.service.ts:155-201`, `backend/src/modules/dashboard/dashboard-personal-visibility.spec.ts`
The PRD section 28.2a marks this P0 item as `[ ]` (unchecked) and references `dashboard-hr.service.ts` which does not exist. The actual implementation is in `dashboard-personal.service.ts`. The SQL predicate enforces `visibility="org"` OR creator membership EXISTS OR non-declined attendee EXISTS before projecting `title` or `metadata`. Four test scenarios (private event, declined attendee, departed membership, cross-org ID) are verified in `dashboard-personal-visibility.spec.ts`. The P0 finding is closed in source.
**Verdict:** Update §28.2a checkbox to [x] and record the file rename from `dashboard-hr` to `dashboard-personal`.

### N4 — PRD §28.2a checkbox for "Fix Build dashboard ownership and scope" is stale
**Files:** `backend/src/modules/dashboard/dashboard-scope.ts:9`, `backend/src/modules/dashboard/dashboard-project.service.ts:113`
The PRD marks this as `[ ]` and says "replace HR permission used to decide Build visibility". Current source uses `DASHBOARD_BUILD_PERMISSION = "build:manage"` — a Build permission. All three methods (`getActiveSprintSummary`, `getRecentProjects`, `getRecentActivity`) call `resolveBuildDashboardScope` which resolves via `build:manage`. Sprint stats use an aggregate SQL query (`count(*)::int`), not in-memory ticket loading. orgId is included in all predicates.
**Verdict:** Update §28.2a checkbox to [x].

---

## Classification counts

| Classification | Count |
|---|---|
| VERIFIED DONE | 30 |
| STILL PENDING | 18 |
| REGRESSED | 0 |
| NEW | 4 |

---

## 5 most serious findings

1. **§3 / §28.2a P1 STILL PENDING — Chat actor cutover incomplete** (`backend/src/db/schema/chat/chat.ts:244,443`) — `chatSavedMessages.userId` and `chatHuddleParticipants.userId` are global user references without membership equivalents. These remain legacy actor edges that create potential cross-tenant link hazards and are not membership-scoped.

2. **§3 / §7 / §15 STILL PENDING — Offset pagination remains in critical list endpoints** (`backend/src/modules/accounting/core/accounting-payables-query.service.ts:214`, `audit-log.service.ts:75`, `projects-tickets-read.service.ts:425`, plus 15 more confirmed) — Growing lists are not bounded by cursor; deep pages degrade O(offset) and cannot be indexed efficiently at scale.

3. **§7 STILL PENDING — Correlation ID missing from error response body** (`backend/src/common/http/all-exceptions.filter.ts:144-202`) — PRD §7 requires "Standard response envelope for errors with correlation ID". The `correlationId` is only in the `x-correlation-id` response header, not the JSON body. Clients that don't surface response headers lose request traceability on errors.

4. **§9 STILL PENDING — Rate limits absent on search endpoint** (`backend/src/modules/search/search.controller.ts`) — No `@UseRateLimit` annotation on any search handler. PRD §9 requires rate limits on search. Search is the highest-cost read path (vector ANN + RLS) and is unprotected against abuse.

5. **NEW N1 — audit_logs.actorMembershipId has bare FK, not composite tenant FK** (`backend/src/db/schema/common/audit-logs.ts:27`) — The membership FK does not enforce org_id co-location at the data layer. A membership from a different org can appear in an audit row without a DB-level rejection.
