# StreamlineOS Product, Architecture and Final Refactor PRD (excluding CRM and Inventory)

**Target:** 10/10 architecture, implementation, security, performance, maintainability and operability  
**Status:** approved target specification; current implementation is not yet complete  
**Last grounded against source:** 2026-08-31 (lane P3 checkbox audit; lane Q2 gate-verification correction; wave R section audit §28.4–28.16; source revisions `frontend` `59e86ccad`; `backend` `ea4fdf53` plus session migrations 0747–0777)
**Scope:** every backend, frontend, schema, migration, API, worker, realtime, test, documentation and operational file, except CRM- and Inventory-owned implementation.  
**Excluded domains:** CRM and Inventory, including their owned backend modules, schemas, APIs, workers, tests, frontend routes, features, hooks and contracts. They may adopt compatible shared primitives but must not be behaviorally redesigned by this PRD.

**Completion snapshot — 2026-08-31 audit:**

| Category | Count | Notes |
|---|---|---|
| Done with source/gate evidence | 64 | Was 20 before lane P3; 6 ticked by P3, 6 by lane Q2, 32 by wave R (route access, Home isolation, payroll invariants, Build aggregates, billing, reminder sweep, calendar transactionality, notifications, workflows, module-access decomposition) |
| Genuinely open code work | ~131 | Actor contraction (656/689 remaining), OpenAPI request-schema gap (91% â†’ 100%), board auto-load past 500 tickets, HR leading-wildcard search, decomposition, frontend architecture |
| Operator-blocked | ~15 | D01–D15: independent cells, PITR RPO, physical replica, load/headroom, cost approval, alert delivery, compliance drills |
| Obsolete-by-decision | 1 | §8 platform-admin â†’ `/owner` redirect; `users.is_platform_admin` removed by migration 0369; no `/owner` route exists |

Evidence standard: every newly ticked box has a `file:line`, gate output, or pg_catalog query. Operator-blocked items remain unchecked until real infrastructure evidence exists. The four-category split prevents "open" from masking the infrastructure gap.

## 1. Product vision

StreamlineOS is a multi-tenant work operating system. A user signs in once, belongs to zero or more organizations, and uses one consistent Home experience for communication, knowledge, people operations, projects, finance and automation. Organization owners and admins configure modules and permissions; members see Home and Knowledge Base by default and receive additional module screens only when granted access.

## 2. Users and authority

| Actor | Authority |
|---|---|
| Platform operator | Operates infrastructure, support and compliance controls; cannot read tenant content by default |
| Organization owner | Full organization and module authority; sole organization-ownership transfer authority |
| Organization admin | Organization administration and all granted module administration; cannot transfer organization ownership |
| Organization member | Home and Knowledge Base by default; additional module access is permission-based |
| Module owner | Owns one module's configuration, membership and permissions within the organization |
| Module admin | Administers the assigned module permissions and data |
| Module member | Performs only explicitly granted module actions |
| Service/agent principal | Short-lived, scope-limited, auditable automation identity; never implicitly an owner |

The owner/admin policy must be made consistent in code, API documentation, UI labels and tests. A module permission must never grant access outside its organization or module.

## 3. Non-functional requirements

- Every tenant-owned row has `org_id`, audit timestamps, creator/updater actor and soft-delete policy where business retention requires it.
- Cross-tenant parent/child relationships use composite foreign keys beginning with `org_id`.
- Organization actors reference organization membership/person, not a global identity alone.
- All list APIs use bounded cursor pagination, a stable sort contract, explicit filters and a hard maximum page size.
- No `SELECT *`, fetch-then-filter authorization, unbounded relation loading or per-row permission database calls.
- Authorization is enforced in guards plus service/query/data-layer predicates; UI checks are presentation only.
- Writes are transactional and idempotent where retries are possible.
- P95 read latency target: 300 ms for normal lists, 800 ms for aggregate Home reads; asynchronous work must not block HTTP requests.
- WCAG 2.2 AA, keyboard navigation, reduced motion, responsive layouts and accessible error/loading states.
- Public pages have canonical metadata, structured data where applicable and zero authenticated content in crawlers.
- GDPR-ready export/deletion workflows, encryption in transit/at rest, secret rotation and immutable audit evidence.

## 4. Platform architecture

### Backend

NestJS modules own business rules and repositories. Controllers validate and translate HTTP; guards establish identity and coarse module access; services resolve permissions and call tenant-scoped repositories; repositories always require an organization context. Outbox rows drive email, push, realtime and webhook side effects. Redis is used only with tenant-, membership- and permission-version-aware keys.

### Frontend

Next.js App Router uses Server Components by default. Server layouts enforce authentication and route permissions. Client components are limited to interaction/stateful islands. TanStack Query owns server state, with a single API client, typed contracts and centralized query keys. Feature folders contain page composition, queries, mutations, schemas and presentational components.

### Required shared primitives

1. `TenantContext` and tenant-scoped query builder.
2. `OrganizationActor` resolver (membership/person based).
3. Permission decorator/guard plus data-scope predicate helper.
4. Cursor pagination/filter/sort contract.
5. Cache-key builder and invalidation events.
6. Transactional outbox and notification dispatcher.
7. Typed API client, error envelope and request correlation ID.
8. Server route-access registry shared by navigation and layouts.

Do not create generic abstractions for unrelated business workflows.

## 5. File and module ownership

The following table is the PRD boundary for all existing files. A module is complete only when its controller, service, repository, schema, DTO/contract, UI, authorization, telemetry and tests satisfy the requirements below.

| Area | Backend ownership | Frontend ownership | Product responsibility |
|---|---|---|---|
| Identity and auth | `auth`, `sessions`, `mfa`, `users`, `api-tokens`, `agent-access`, `delegations` | authenticated layouts, sign-in, MFA, session and org switcher | Authentication, session lifecycle and principal identity |
| Organization and RBAC | `organization`, `access`, `rbac`, `module-access`, `ownership`, `directory` | settings access, member/role/ownership screens | Organizations, memberships, standing, permissions and transfers |
| Home | `dashboard` (rename/reframe as Home read model) | dashboard/home features | Bounded cross-module read projection; no domain writes |
| Settings | `settings`, `platform`, `record-layouts` | settings pages and preferences | Org configuration, preferences and feature visibility |
| HRMS | `hr`, `payroll`, `expenses`, `timesheets`, `directory`, `careers`, `offer-fulfillment`, `e-sign` | `features/hr`, `features/payroll`, `features/timesheets` | Employee lifecycle, attendance, leave, payroll and documents |
| Build/PM | `build`, `issues`, `tasks`, `goals`, `reports`, `workflows`, `automation` | `features/build`, project and task routes | Projects, tickets, workflows, planning and reporting |
| Chat | `chat`, `realtime` | `features/chat` | Channels, threads, messages, reactions, presence and huddles |
| Calendar | `calendar` | `features/calendar` | Events, recurrence, attendees, free/busy and reminders |
| Inbox and mail | `mail`, `email`, `inbox`-related adapters | `features/mail`, inbox routes | Provider sync, threads, messages, drafts and triage |
| Notifications | `notifications`, `push`, `webhooks` | `features/notifications` | In-app, email, push, realtime delivery and read state |
| Knowledge and wiki | `kb`, `search`, `ai`, `support`, `blog` | `features/wiki`, knowledge routes | Documents, revisions, ACL search, ingestion and chatbot |
| Billing and payments | `billing`, `accounting`, `finance`, `invoices`, `quotes`, `payments`-related adapters | billing/accounting/finance routes | Plans, subscriptions, entitlements, invoices, usage and provider events |
| Platform operations | `audit-log`, `cron`, `ingress`, `storage`, `feedbucket`, `data-quality`, `activities`, `csat`, `surveys`, `public`, `portal` | corresponding public/portal/admin features | Auditing, jobs, storage, public portals, quality and support |

CRM and Inventory files must not be changed by this PRD except for compatible shared platform primitives and foreign-key migrations explicitly coordinated with their owners.

## 6. Domain requirements

### Home

Expose a bounded aggregate with independent sections: tasks, calendar, unread notifications, chat, mail, HR summary, payroll/time-off summary, Knowledge Base and announcements. Each section has its own permission and failure state. Queries must use actor data scope and active membership. Cache keys include `org_id`, membership, scope, permission version and date/filter.

### HRMS and payroll

Use organization employment/person records for employees, managers and approvers. Attendance, leave, payroll and document reads require explicit data scope. Payroll runs are immutable after approval, calculations are versioned, and payment exports are idempotent. Sensitive documents use signed, short-lived URLs and audit every access.

### Build/PM

Projects, tickets, teams, sprints, goals and reports are organization-scoped. Project membership queries include `org_id` and active status. Ticket comments, attachments and relations use composite tenant FKs. Bulk operations are bounded and idempotent.

### Chat

Use channel/thread authorization, membership-based participants, cursor message history and at-least-once outbox delivery with deduplication. Normalize reactions into a table. Enforce composite tenant FKs for channels, messages, attachments, pins, huddles and participants. Unread counts use per-membership watermarks and indexed counts, never a full message scan.

### Calendar

Use an RFC 5545/RRULE library. Store timezone IDs, UTC instants and recurrence exceptions explicitly. Replace attendee JSONB with tenant-owned attendee rows keyed to membership and unique per event/member. Free/busy and conflict queries must be indexed by organization, principal and time range.

### Inbox/mail

Provider adapters normalize external IDs. Sync jobs are resumable and idempotent. Thread/message access is authorized before retrieval. Attachments use signed URLs and malware scanning. Cursor APIs must never load an entire mailbox.

### Notifications

Persist notification intent in an outbox, deliver at least once, deduplicate by event key and provider message ID, and track per-membership read watermarks. Email, push, in-app and realtime channels have retry/dead-letter policies. Event streams require cancellation, jittered reconnect and cleanup on organization switch or logout.

### Knowledge Base/wiki/chatbot

Documents have immutable revisions, author membership, publication state and audit history. Search/vector indexes store organization, ACL snapshot/version and document revision; authorization is applied inside retrieval, never after top-k results. Ingestion is asynchronous, resumable and virus-scanned. Chatbot citations must point to authorized revisions.

### Billing/payments/accounting

Model products, prices, subscriptions, entitlements, seats, usage meters, invoices, credit notes, tax, currency and provider events separately. Invoice records are immutable snapshots. Webhooks verify signatures, persist provider event IDs, support replay and are idempotent. Entitlement decisions are cached locally with event-driven invalidation; requests must not call a payment provider. Seat changes and proration require effective timestamps and ledger entries.

## 7. API requirements

- Version under `/api/v1`; publish OpenAPI generated from DTOs.
- Standard response envelope for errors with correlation ID and machine-readable code.
- Consistent list parameters: `cursor`, `limit`, `sort`, `direction`, filters and `include`.
- Maximum limits enforced server-side.
- Idempotency keys on payments, webhooks, bulk writes and external sync.
- Remove duplicate/legacy endpoints only after usage telemetry and a deprecation window.
- Route handlers must not contain business logic or direct database access.

## 8. Frontend requirements

- Add server route guards for every module; retain `useCan()` only for UI visibility.
- Remove unnecessary page-level `use client` directives.
- Split oversized Chat, Calendar, Notifications, Billing and HR components by state, data, form and presentation.
- Scope browser storage keys by organization and user where preferences are tenant-sensitive.
- Replace raw `fetch` with typed clients, abort handling and consistent error parsing.
- Add loading/error boundaries for high-traffic routes.
- Resolve formatter and API contract drift; remove unused files/exports after confirming no extension contract.

## 9. Security and compliance acceptance criteria

- Automated cross-tenant tests for every repository and composite FK.
- Permission denial tests for owner/admin/member/module-member combinations.
- Audit events include actor principal, membership, organization, request ID and reason.
- No secrets, access tokens or PII in logs, URLs or client bundles.
- Rate limits on public token pages, login, webhooks and search.
- Data export, deletion, retention and legal-hold workflows documented and tested.

## 10. Delivery phases

1. **Blocker repair:** stale user writes, Home data-scope/cache leak, admin policy decision.
2. **Tenant integrity:** composite FKs, organization actor migration, calendar attendees, chat reactions.
3. **Authorization and API:** shared route registry, cursor contract completion, endpoint deprecation.
4. **Performance:** remove client directives, split large components, projection/read models, cache and replica validation.
5. **Scale and operations:** cell isolation, recovery drills, audit-chain closure, load headroom and deployment evidence.
6. **Release hardening:** contract drift, dead code, formatting, accessibility, SEO, security and compliance sign-off.

## 11. Definition of done for this PRD

The PRD is complete when every in-scope file belongs to an owned module, every module has documented APIs and data ownership, all tenant and permission tests pass, no known P0/P1 findings remain, migration journals are complete, frontend checks are green, and the c28 scale/recovery evidence meets the stated targets. CRM and Inventory are excluded from this completion decision.

## 12. Authority contract that must be implemented

The following matrix is authoritative. Backend rules, permission templates, API documentation, frontend visibility and tests must agree with it.

| Capability | Org owner | Org admin | Org member | Module owner | Module admin | Module member |
|---|---:|---:|---:|---:|---:|---:|
| Transfer organization ownership | Yes | No | No | No | No | No |
| Archive/delete organization | Yes | No | No | No | No | No |
| Manage organization membership | Yes | Yes | No | No | No | No |
| Enable entitled modules | Yes | Yes | No | No | No | No |
| Transfer module ownership | Yes | Yes | No | Own module | No | No |
| Manage module membership | Yes | Yes | No | Own module | Own module | No |
| Manage module permissions | Yes | Yes | No | Own module | Own module | No |
| Read/write module records | Permission-based | Permission-based | Permission-based | Permission-based | Permission-based | Permission-based |

There are exactly six standings: organization owner/admin/member and module owner/admin/member. Runtime custom role creation is out of scope unless a later approved PRD explicitly replaces the fixed-standing model. Organization-owner-only exceptions must be enumerated and tested.

Every active member retains Home, Chat, Mail, Notifications, unified Calendar, people directory, Knowledge Base reading, announcements, referrals/internal jobs and their own attendance, leave, expenses, pay and employment documents. Administrative actions remain permission-gated.

## 13. Mandatory current-source repairs

### P0 — repair before any release

1. Remove stale writes of `orgDepartmentId`, `branchId` and `reportingTo` from the global `users` update path. Write organization employment and hierarchy data only to organization person/employment/unit-assignment tables. Replace the dynamic update object with a typed contract and add migration-regression coverage.
2. Fix Home attendance, availability and leave queries so they receive the actor, resolve DataScope and filter in SQL. Organization-wide Home cache keys are forbidden. Keys must include organization, membership, permission version, resolved scope, date and filters.
3. Replace Accounting frontend authorization based on hard-coded session roles (`OWNER`, `FINAL`, `HR`) with canonical effective permissions.
4. Lock the authority matrix above in backend and frontend tests.

### P1 — architecture and correctness

1. Add leading tenant indexes to `candidate_resumes`, `credit_note_items`, `fin_payment_run_items` and `vendor_credit_items`.
2. Add missing tenant composite foreign keys for Chat, Calendar, KB/Wiki, HR, Build, Notifications, Accounting and Finance descendants.
3. Add foreign keys for RBAC assigning/granting memberships and validate every stored module key against the module catalog.
4. Migrate organization-specific actors from global user references to organization membership/person references.
5. Normalize Calendar attendees and remove attendee relationship JSONB after expand/backfill/verify/cutover.
6. Normalize Chat reactions into a unique organization/message/membership/emoji relation.
7. Replace offset pagination in HR performance, HR Helpdesk, Finance tax payments, reminder policies and every other growing list.
8. Rewrite Finance reminders from an in-memory policy x invoice sweep to indexed due-row cursor batches with batched recipient resolution.
9. Replace broad ORM projections with explicit DTO projections, particularly for HR, payroll, expenses and finance.
10. Move Expenses, Accounting payables, Calendar and HR Helpdesk fire-and-forget work to approved after-commit or transactional-outbox flows.
11. Resolve all frontend/backend Timesheets contract drift for billing type, source, exception resolution and approval mode.
12. Make OpenAPI freshness a runnable CI gate with region/cell configuration supplied securely.
13. Finish the billing provider-neutral seam on the frontend. The backend half now exists (`PaymentProviderAdapter` interface, `razorpay.adapter.ts`, `payment-provider-catalog.ts`, a `razorpay-service-import-boundary.spec.ts` boundary test, and a provider-neutral `POST/PATCH /billing/checkout`), but the frontend still hardcodes the Razorpay SDK and field names: `frontend/features/billing/components/plan-tab.tsx:87,163-165` loads `https://checkout.razorpay.com/v1/checkout.js` and reads `response.razorpay_order_id`/`razorpay_payment_id`/`razorpay_signature` directly; `frontend/features/billing/ai-credits-settings-page.tsx:102,163-165` repeats the same pattern; `frontend/hooks/api/subscription-schema.ts:40-41,55-57` types response history fields as `razorpayPaymentId`/`razorpayOrderId`/`razorpaySubscriptionId`/`razorpayCustomerId`/`razorpayPlanId`. Adding a second payment provider still requires frontend script and contract changes. (Source: `architecture-refactor/lanes/audit-10-10-to-10-13.md` NF-1, 2026-09-02; re-verified against current source 2026-09-07 — the backend seam was built after the audit, the frontend was not.)

### P2 — completion and polish

1. Decide and implement retention behavior for tax payments and reminder policies; financial corrections should normally use reversal/archive rather than hard delete.
2. Replace leading-wildcard operational search with tenant-safe trigram/FTS/search-index patterns.
3. Migrate ad hoc query parameters to Zod query schemas.
4. Remove confirmed dead files/exports/types using module-graph proof and build verification.
5. Finish loading/error, accessibility, responsive and public metadata coverage.
6. `settings-automations.service.ts` is still exposed through the global `SettingsController` (`backend/src/modules/settings/settings.controller.ts:21-22,62,110-177` — routes `GET/POST/PATCH/DELETE /settings/automations*`), which violates root CLAUDE.md §8's module-owned-surfaces rule ("custom fields, automations, integrations, data-hub import/export live in each module's settings, never global `/settings/*`"). The paired finding's other half is resolved: `settings-custom-fields.service.ts` no longer exists anywhere under `backend/src/modules/settings/` and is not wired into `SettingsController`. (Source: `architecture-refactor/lanes/audit-10-1-to-10-5.md` NF-2 / bullet 10.4-1, 2026-09-02; re-verified against current source 2026-09-07.)
7. Payroll financial columns still use `decimal(15,2)` rather than integer cents, against backend CLAUDE.md §3 ("Money as integer cents") — `backend/src/db/schema/payroll/runs.ts:30-33` (`grossTotal`/`deductionTotal`/`employerCostTotal`/`netTotal`), `:142-151` (`gross`/`totalDeductions`/`employerContributions`/`net`/`netPayoutCurrency`), `:193` (`amount`). Not a precision bug (`NUMERIC` is exact), but an inconsistency with the rest of the platform's integer-cents convention that forces an explicit conversion layer wherever payroll amounts meet accounting amounts. (Source: `architecture-refactor/lanes/audit-10-6-to-10-9.md` NF-1, 2026-09-02; re-verified against current source 2026-09-07.)

Four related findings from the same 2026-09-02 lane audits (`architecture-refactor/lanes/audit-10-1-to-10-5.md`, `audit-10-6-to-10-9.md`, `audit-10-10-to-10-13.md`, `audit-10-14-to-10-18.md`) were re-verified against current source on 2026-09-07 and are VERIFIED DONE — not carried forward per §27: (a) the dashboard section registry drift (`dashboard-section-registry.ts` NF-1) is fixed — `active-sprint`, `my-issues`, `upcoming-holidays` and `leave-balance` are now typed `kind: "module"` instead of being misclassified as permission-gated, and every remaining `kind: "permission"` entry's `permission` value now matches its `dashboard.controller.ts` handler exactly, including the `recent-projects`/`recent-activity` entries that previously read `build:manage` against an actual `build:tickets:view` guard; (b) the four local Build query-key factories (`customers.ts`, `roster.ts`, `teams.ts`, `workspace-members.ts`) now all key off the canonical `buildWorkQueryKeys` factory in `frontend/lib/query-keys/build-work.ts`; (c) the Chat presence 15-second per-tab HTTP heartbeat is replaced — `frontend/features/chat/use-chat-presence.ts` uses Ably connection-presence `enter`/`leave` as the authoritative signal, with a Web-Locks-elected single leader running the HTTP heartbeat only as a disconnected fallback, with exponential backoff and jitter; (d) all three mail/notifications findings are fixed — `frontend/hooks/api/mail.ts:39,61` gates `useMailMessages` on `enabled: useCan("mail:inbox:view")`, `frontend/features/notifications/unified-inbox/inbox-virtual-list.tsx` virtualizes the notification list with `react-window`, and `backend/src/modules/mail/mail.service.ts:249-251` now `await`s the sync checkpoint save with a logged error on failure instead of a bare `void`.

The four `architecture-refactor/lanes/audit-10-*.md` files cited above were **deleted on 2026-09-07**, once the migration in this section was complete. They were the artifact class §28 prohibits — dated session status files, unreferenced by any gate, whose point-in-time counts had already drifted from the executable ones. Deleting them before this migration would have destroyed the only record of the three findings now tracked here, which is why the order mattered. The citations are retained as provenance; the files themselves remain in git history.

## 14. Data architecture acceptance contract

### Keys and relationships

- New distributed/external entities use UUIDs. No new `serial` primary keys.
- Existing integer identities require an ADR if retained long term.
- Every tenant table has non-null `org_id` unless it is an explicitly documented global catalog.
- Every tenant parent/child edge uses `(org_id, parent_id) -> (org_id, id)`.
- Every organization actor uses membership/person semantics.
- Every tenant access pattern has an index beginning with `org_id` and continuing through filters, sort fields and unique tie-breaker.

### Audit, retention and deletion

- Mutable business records carry created/updated timestamps and actor membership where meaningful.
- Hierarchy and recoverable business entities archive/restore.
- Invoices, payroll approvals, stock movements, usage ledgers, payments and audit evidence are immutable; corrections use reversals or superseding records.
- Hard purge requires retention expiry, legal-hold checks, dependency checks, audit evidence and idempotency.

### JSONB, EAV and extensibility

- JSONB is allowed for sparse provider payloads, immutable versioned snapshots and custom-field values.
- JSONB is forbidden for authorization edges and queryable relationships such as attendees and reactions.
- Core domain data must not use EAV.
- Optional features with lifecycle, constraints or indexing use sidecar tables.
- Schema changes follow expand -> backfill -> verify -> cutover -> contract.
- Destructive contraction waits for runtime telemetry and compatibility proof.

## 15. Query, pagination and cost contract

- No `SELECT *` or unbounded relation loading.
- No fetch-then-filter authorization.
- No per-row authorization or recipient lookup.
- Every response uses an explicit projection and stable DTO.
- Growing lists use cursor pagination with all sort fields plus a unique ID tie-breaker.
- Page size is capped at 100 unless an ADR proves a different bounded limit.
- Filter and sort fields are allowlisted and Zod-validated.
- Search is debounced on the client and indexed on the server.
- Read replicas serve only declared replica-tolerant reads; authorization-critical and read-after-write paths use primary.
- Connection pools, statement timeouts and per-cell budgets are measured and alerted.
- Query-plan/read-budget checks use production-shaped datasets, not empty tables.

## 16. Cache correctness contract

Canonical authenticated cache identity:

```text
environment:cell:version:org:membership:permissionVersion:resource:scope:filters
```

- Permission, entitlement, module configuration, bounded projections and stable catalogs may be cached.
- Sensitive record collections, download tokens and search results without ACL revision must not be cached.
- Permission/configuration/entitlement mutations invalidate by event; TTL is only a safety bound.
- Cache lifetime may not exceed grant, delegation, membership or token expiry.
- Request coalescing, jitter and safe stale-while-revalidate prevent stampedes.
- Automated tests must prove cache entries cannot cross organization, membership, role, scope or permission version.

## 17. API and contract acceptance

- Business APIs live in NestJS under `/api/v1`; Next.js route handlers remain auth bridges only.
- OpenAPI is generated from the actual application and checked for freshness in CI.
- Errors contain status, stable code, safe message, correlation ID and structured validation details.
- Clients never send their own acting user or active organization ID.
- Self-service endpoints use `/me` and derive the subject from the principal.
- Retried mutations, webhooks, imports, exports, billing, stock posting and bulk actions use idempotency keys.
- Webhooks verify signatures, persist event identity before processing, deduplicate and support replay.
- Deprecation requires usage telemetry, owner, replacement, announcement date and removal date.
- Platform subscription billing remains under `/settings/billing`; organization customer invoices remain an Accounting surface even when the route is `/billing/invoices`.

## 18. Domain completion gates

### Home

- A read-only bounded projection with independent section success/failure.
- Uses owning-domain read interfaces rather than direct schema coupling where practical.
- Every section declares universal/permissioned status and applies DataScope.
- Counts active memberships, not merely globally active users.
- P95 aggregate <=800 ms; slow sections load independently.

### HRMS, payroll, expenses and timesheets

- `organization_people` is the organization person; membership, employment and candidate are separate facets.
- Employees/managers/approvers are organization-aware actors.
- Every list/detail read enforces scope before retrieval.
- Sensitive fields use field-level permission and explicit DTOs.
- Payroll calculation is versioned/reproducible; approved runs are immutable.
- Expense/payroll side effects use the outbox.
- Timesheets has one shared enum/contract definition or generated equivalent.
- Protected downloads use the typed download client, signed URLs, malware scanning and audit.

### Build/PM

- Projects and managed products remain separate under the Build namespace.
- Project memberships include organization and active status.
- Project/ticket/sprint/QA/roadmap/workflow relations use tenant composite constraints.
- Board/list/backlog queries are bounded, indexed and scope-aware.
- Bulk writes are transactional and idempotent.
- Keep the current nested Build module structure.

### Chat

- Channel/thread authorization occurs before reads and writes.
- Participants are active organization memberships.
- Reactions are normalized.
- At-least-once delivery with idempotent consumers; exactly-once is not claimed.
- Per-channel ordering uses an explicit durable sequence/equivalent.
- Read state uses membership watermarks and indexed counters.
- Messages, attachments, pins, huddles and participants use tenant composite constraints.

### Calendar

- Uses an established RFC 5545/RRULE implementation and IANA timezones.
- Recurrence, exceptions and UTC instants are explicit.
- Attendees are normalized membership rows.
- Free/busy and conflict checks use tenant/principal/time indexes.
- Reminder delivery is durable and idempotent.

### Inbox and mail

- Provider sync is checkpointed, resumable and idempotent.
- Thread/message authorization occurs before content retrieval.
- Attachments are scanned and served with signed access.
- Unread counts use watermarks, never mailbox scans.

### Notifications

- Intent is committed with the business write through the outbox.
- Delivery is at least once and deduplicated by event/provider identity.
- Email, push, in-app and realtime have retry/dead-letter policies.
- Read state is membership-scoped.
- Event streaming has abort, jittered reconnect, retry ceiling and organization/logout cleanup.

### Knowledge Base, Wiki, search and chatbot

- Immutable revisions, author membership, publication lifecycle and audit history.
- ACL is enforced inside SQL/search/vector retrieval before top-k selection.
- Index entries carry organization, ACL revision and content revision.
- Ingestion is resumable, deduplicated, observable and malware-scanned.
- Conversations are membership-scoped and citations resolve to authorized immutable revisions.

### Billing, payments, accounting and finance

- Separate plans, prices, subscriptions, entitlements, seats, meters, invoices and provider events.
- Seats and proration use effective timestamps and immutable ledger entries.
- Usage and payment events are replay-safe and idempotent.
- Invoices/credit notes are immutable snapshots.
- Money uses integer minor units; AI uses integer milli-credits.
- Tax/currency/jurisdiction behavior is explicit.
- Entitlements resolve locally without provider calls on request paths.
- Finance reminders use indexed due rows and batched recipients.
- Frontend authorization uses effective permissions, never legacy session roles.

### Settings

- `/settings/*` owns platform/organization administration.
- `/<module>/settings/*` owns module configuration.
- Operational work remains in its product.
- Mutations invalidate configuration, entitlement and access caches.
- Module Access UI follows the authority matrix exactly.
- Tenant-sensitive browser preferences are organization/user scoped.

## 19. Frontend 10/10 contract

- Route files are Server Components by default; client code stays at interactive leaves.
- One route-access registry drives server layouts, desktop/mobile navigation, product switcher and command palette.
- Universal routes are an explicit tested allowlist.
- Query hooks use canonical tenant-aware keys and exact permission gating.
- Mutations have mutation keys and precise invalidation.
- Protected requests use typed API/download/event clients, never ad hoc `fetch`.
- Every page handles loading, refresh, error, denied, empty and filtered-empty states.
- Money/date/time formatting is organization-aware and centralized.
- Files target <=300 lines and require refactor/review above 500, except generated or approved primitives.
- Responsive proof covers 375, 768 and 1280 widths.
- WCAG 2.2 AA, keyboard order, focus, labels, contrast and reduced motion are mandatory.
- Public pages have unique metadata, canonical URL and robots policy.

Current cleanup targets:

- Classify and reduce 342 client route pages out of 598.
- Consolidate 19 local formatters.
- Replace 4 `useEffect`-driven public reads.
- Review/migrate 26 hand-written empty states.
- Confirm/remove 4 unused files, 49 unused exports and 21 unused exported types.
- Resolve six Timesheets drift groups/seven field-level disagreements.
- Split oversized Chat, Calendar, Notifications, Billing, Mail, HR and Accounting files by responsibility.

## 20. Reliability, security and operations

- No unobserved fire-and-forget business side effect and no swallowed promise failure.
- In-process post-commit work uses the approved after-commit facility; durable work uses the transactional outbox.
- Consumers are idempotent with bounded backoff, retry and dead-letter behavior.
- Events carry version, organization, event ID, correlation and causation.
- Realtime accelerates delivery but never replaces durable truth.
- TLS, managed secrets, secure cookies, CSP, sanitization and parameterized SQL are mandatory.
- Public tokens are hashed, expiring, scoped and rate-limited.
- Uploads enforce type/size, quarantine, malware scan and signed retrieval.
- Logs contain release/cell/org/principal/request context without PII, secrets or tokens.
- Metrics cover latency, errors, throughput, queue age, dead letters, cache hit rate, pool saturation and per-tenant cost.
- GDPR export/deletion, retention and legal-hold workflows are executable and tested.
- Operator/support access is time-bound, approved, reasoned and audited.

## 21. Cell architecture and 20M gate

Keep the implemented placement records, placement-aware writes, control-plane outage behavior, organization lifecycle saga, cold second-cell schema parity, organization relocation/rollback and canary rollback.

The platform may be called 20M-ready only when:

- At least two cells are independently resourced, not namespace-only isolated.
- Recovery is drilled with measured RPO/RTO.
- All 14 workload objectives are driven or removed by approved product decision.
- A colocated driver publishes passing latency and headroom.
- Read-replica behavior is measured.
- Migration `chain_gaps = 0`, no migration is unjournalled and CI enforces it.
- Capacity and unit cost are trended daily across releases.
- Active-organization landing derives from membership/index truth.
- Per-cell capacity and cost forecasts are approved.

## 22. Removal and consolidation rules

Delete code, APIs, schemas, files, types or components only when:

1. Module-graph tooling proves no static, dynamic, side-effect or barrel dependency.
2. Public/extension contracts are checked.
3. API telemetry proves no consumer or the deprecation window is complete.
4. Schema symbols, raw table names, migrations and foreign keys are checked.
5. Typecheck plus appropriate build/runtime proof succeeds afterward.

Knip alone never authorizes schema deletion. Splitting files must reduce responsibility, render surface or test complexity; forwarding wrappers are not a refactor.

## 23. Verification matrix

| Gate | Current audit result | 10/10 requirement |
|---|---|---|
| Backend typecheck | Pass | Pass in CI |
| Frontend typecheck | Pass | Pass in CI |
| Backend cycles | Zero | Zero in CI |
| Frontend cycles | Zero | Zero in CI |
| Permission catalog | 690 keys aligned | Zero drift |
| DataScope application | 119/119 detected | Complete plus allow/deny tests |
| Tenant leading indexes | 4 of 718 missing | Zero missing |
| Frontend business routes | None | None |
| Query scope/module manifest | Pass | Pass in CI |
| Formatter check | 19 findings | Zero unjustified findings |
| Effect-fetch check | 4 findings | Zero |
| Empty-state check | 26 findings | Zero or documented specialized exceptions |
| Dead code | 4 files, 49 exports, 21 types reported | Zero confirmed dead code |
| Contract drift | Known Timesheets drift baselined | Zero unapproved drift |
| OpenAPI freshness | `check:openapi-coverage` exits 0: 3,566 operations stamped; 1,349/1,394 mutating (97%); all thresholds met; wired in CI | 100% applicable coverage in CI |
| Migration chain | 124 gaps and unjournalled work documented in c28 | Zero gaps |
| Recovery/headroom | Not proved | Published passing evidence |

## 24. Delivery order

1. **Release safety:** stale user writes, Home scope/cache, Accounting authorization and authority matrix.
2. **Tenant integrity:** indexes, composite FKs, organization actors, attendee/reaction normalization and RBAC constraints.
3. **Query/API reliability:** cursor migration, Finance reminder redesign, explicit projections, outbox conversion, Timesheets/OpenAPI drift.
4. **Frontend architecture:** shared route registry, server-first routes, oversized-file decomposition, shared clients/formatters/states and dead-code cleanup.
5. **Scale proof:** independent resources, migration chain, recovery, replica, workload headroom and cost/capacity trends.

## 25. 10/10 scorecard

An area receives 10/10 only with current source, test and operational evidence. Documentation alone is insufficient.

| Area | Mandatory evidence |
|---|---|
| Architecture | Clear ownership, justified seams, zero cycles and no forbidden cross-domain access |
| Data model | Tenant composite integrity, organization actors, normalized relations and safe migrations |
| RBAC | Complete matrix, data-layer scope, revocation/cache proof and cross-tenant tests |
| APIs | Versioned, documented, drift-free, validated, bounded and idempotent where retryable |
| Queries | Explicit projections, no N+1/unbounded work and read budgets passing at target volume |
| Caching | Tenant/actor/scope-safe keys, event invalidation, expiry bounds and leak tests |
| Backend | Thin controllers, cohesive modules, durable side effects and bounded files |
| Frontend | Server-first routes, shared access registry, typed seams and manageable components |
| UX | Complete states, responsive behavior and WCAG 2.2 AA proof |
| Security | Threat model, secret/PII controls, immutable audit and compliance workflows |
| Reliability | Idempotency, outbox, retries/dead letters, failure tests and recovery evidence |
| Scale/cost | Independently isolated cells, full workload pass, headroom and approved forecasts |

No module can be rated 10/10 while it has an open P0/P1, failing mandatory gate, unresolved tenant boundary, unapproved contract drift or missing operational evidence.

## 26. Final definition of done

- Every in-scope file has one documented owner.
- CRM and Inventory remain behaviorally unchanged except compatible shared-platform adoption.
- Every P0/P1 is closed with source and automated proof.
- Tenant relationships and organization actors are structurally safe.
- Every growing list is bounded and index-backed.
- Authorization executes before retrieval/mutation.
- Durable side effects use idempotent outbox/worker paths.
- Backend/frontend contracts and OpenAPI have zero unapproved drift.
- Type, test, accessibility, migration, contract, performance and dead-code gates are green.
- Recovery, cell isolation, workload headroom and cost evidence satisfy the c28 release rule.
- Every row in the 10/10 scorecard has attached evidence.

Until all conditions pass, the honest status is: **strong modular foundation with substantial implementation completed, but not final and not yet proven for 20 million users.**

## 27. Architecture re-review protocol

Every future architecture review is a current-source delta audit against this PRD and the preceding review. The reviewer must not copy the backlog forward blindly.

### Required process

1. Read the current repository rules, this PRD, c28 release evidence and the previous architecture review.
2. Inspect the current source, schema, migrations, API contracts, scripts and module graph before forming a verdict.
3. Reproduce or statically prove every previous finding at its current path. When code moved, follow the symbol and behavior rather than relying on an old line number.
4. Classify every previous item:
   - **VERIFIED DONE:** implementation and proportional proof exist. Record it once in the completed summary.
   - **REGRESSED:** the defect returned or the fix no longer protects the required path. Cite new current evidence.
   - **STILL PENDING:** the defect remains reproducible in current source. Cite current evidence and its concrete failure.
   - **NEW:** not present in the preceding review and proved against current source.
5. Remove stale findings from the active backlog. A completed point may not be restated as a recommendation merely because it is architecturally important.
6. Distinguish implementation evidence from documentation claims. Source/runtime evidence wins when they disagree.
7. Rate only the current implementation. A good target design does not raise the implementation score; an unproved scale claim does not raise production readiness.

### Mandatory review angles

Every review must explicitly inspect and rate all applicable angles, including small structural details:

- Product/domain boundaries and module ownership.
- Folder structure, naming, file size and dependency direction.
- Readability, cohesion, complexity and duplication.
- Reusability and whether shared abstractions are justified by real repetition.
- Dead/duplicate APIs, schemas, migrations, components, functions, types, hooks and validations.
- Organization and module RBAC, ownership, membership lifecycle, DataScope and BOLA protection.
- Tenant schema integrity, keys, foreign keys, indexes, audit columns, deletion/retention and migration safety.
- API versioning, DTO validation, contract drift, idempotency, error envelopes and deprecation/removal safety.
- Query projections, N+1 behavior, pagination, filters, sorts, read budgets, connection pooling and replica suitability.
- Cache eligibility, tenant/actor/permission dimensions, invalidation, expiry and stampede behavior.
- Transactions, concurrency, outbox, retries, dead letters, realtime ordering and delivery semantics.
- Authentication, secrets, encryption, uploads, public tokens, vulnerability controls, privacy and compliance.
- Billing, payments, entitlements, seats, proration, usage, invoices, tax, currency and webhook replay.
- Frontend server/client boundaries, API hooks, query keys, rendering, bundle cost and page responsiveness.
- UI consistency, complete states, accessibility, navigation, permission-aware actions and public SEO.
- Tests, type/build/static gates, observability, alerts, runbooks, recovery and incident readiness.
- Horizontal scalability, cell isolation, workload headroom, noisy-neighbor protection and unit cost.

### Finding quality bar

Every active finding must include:

- Current file/symbol/API/schema evidence.
- Severity and affected organizations/users/data.
- The concrete failure it prevents at target scale.
- KEEP, REPAIR, REPLACE, CONSOLIDATE or REMOVE verdict.
- Smallest safe change.
- Migration/backward-compatibility consequences.
- Verification and acceptance criteria.

The final report must contain separate sections for VERIFIED DONE, REGRESSED, STILL PENDING and NEW, followed by current module/architecture ratings. This keeps completed work closed while ensuring the review still covers architecture, folder structure, scalability, security, billing, readability, reusability and every other angle required by this PRD.

## 28. Current completion execution

The architecture contract above is stable. The sole active execution backlog is [prd/completion-plan.md](prd/completion-plan.md), which assigns bounded work within one file. Do not create ad hoc session status files. Completed implementation facts live in durable evidence and executable gates; superseded module PRDs have been consolidated into that single plan.

Historical session reports and completed ticket trees were removed because their point-in-time counts contradicted executable gates. Git history remains the archive. CRM and Inventory remain excluded, and public landing-page visuals and animations must not change.
