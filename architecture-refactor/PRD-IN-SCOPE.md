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
| Genuinely open code work | ~131 | Actor contraction (656/689 remaining), OpenAPI request-schema gap (91% → 100%), board auto-load past 500 tickets, HR leading-wildcard search, decomposition, frontend architecture |
| Operator-blocked | ~15 | D01–D15: independent cells, PITR RPO, physical replica, load/headroom, cost approval, alert delivery, compliance drills |
| Obsolete-by-decision | 1 | §8 platform-admin → `/owner` redirect; `users.is_platform_admin` removed by migration 0369; no `/owner` route exists |

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

### P2 — completion and polish

1. Decide and implement retention behavior for tax payments and reminder policies; financial corrections should normally use reversal/archive rather than hard delete.
2. Replace leading-wildcard operational search with tenant-safe trigram/FTS/search-index patterns.
3. Migrate ad hoc query parameters to Zod query schemas.
4. Remove confirmed dead files/exports/types using module-graph proof and build verification.
5. Finish loading/error, accessibility, responsive and public metadata coverage.

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

## 28. Current 10/10 completion backlog (authoritative execution scope)

This section is the single executable backlog for the next implementation pass. Sections 1-27 remain the product and architecture contract; this section records only work that is not yet proved complete against the source revisions named at the top of this document. CRM and Inventory remain excluded, including their pages, domain schema and domain-specific migrations. A shared-platform change may touch them only when required to preserve a shared interface, and must not redesign either excluded domain.

The target is evidence-backed 10/10, not a declared score. A module reaches 10/10 only when every applicable checkbox below is complete and the final verification matrix is green. Existing sound design receives a KEEP verdict. A REPLACE verdict must name the failure that occurs at target scale or under an authorization, correctness, recovery or maintenance condition.

### 28.1 Execution protocol for Claude

Before editing, ask all blocking questions in one opening message. At minimum confirm:

- authorization to run tests, lint, builds, live-database checks, migrations and destructive cleanup;
- availability of a production-shaped dataset, second-cell resources, replica/PITR, alert destination, release identifier and cost data;
- compatibility window for removing legacy offset responses, actor columns and API fields;
- intended behavior of `accounting.journal.posted` if no current downstream product behavior exists;
- whether operator-blocked infrastructure may be provisioned or must be delivered as an exact operator runbook.

Then execute in the dependency order in section 28.17. For every work package:

1. Read the root and side-specific `CLAUDE.md` files and inspect every affected caller, schema, migration, cache key, permission, route, hook and test.
2. Record KEEP, REFACTOR, ADD and REMOVE decisions. KEEP is preferred when the existing module's interface is already sound.
3. Implement through the narrowest existing seam. Deepen shared modules only where multiple real callers currently duplicate load-bearing behavior.
4. Preserve backward compatibility until all repository callers have migrated and removal proof exists.
5. Validate the package's completion gates. Never mark operator evidence complete using mocks, namespace-only isolation or documentation.
6. Update this section's checkboxes and evidence links. Do not recreate completed historical findings.

No package may weaken backend authorization, tenant predicates, RLS, object-level access, data-scope application, cache-key tenant dimensions, idempotency or transactional outbox behavior to make another check pass.

### 28.2 Confirmed baseline — preserve it

- [x] All 3,533 backend handlers are classified; zero are undeclared.
- [x] All 3,094 permission usages resolve against the synchronized 690-key catalogs.
- [x] All 722 tenant tables have a tenant-leading index declaration.
- [x] All 122 resolved data scopes reach a query predicate.
- [x] Backend and frontend typechecks pass.
- [x] Re-run both production import-graph checks to completion. Earlier evidence reported zero cycles, but the current checks exceeded the execution window and are not a passing result. VERIFIED 2026-08-31: `RECONCILIATION.md` gate table (committed 2026-08-30) records `check:cycles | PASS | 0 circular in both repos`. The gate now completes within the execution window and exits 0 in both repos.
- [x] Frontend business route, query-scope, formatter, empty-state, module-manifest, contract-drift and dead-code baseline checks pass.
- [x] Notification delivery preserves the database timestamp precision required by its composite foreign key.
- [x] HR performance, Helpdesk, finance reminder and tax-payment lists have cursor-capable paths.
- [x] Home HR scope and permission-aware caching are implemented.
- [x] Expense create/decision writes commit their domain change and outbox intent atomically.
- [x] All 817 tables with an `org_id` column have RLS enabled. Was 801; migration `backend/migrations/0768_rls_uncovered_tenant_tables.sql` enabled RLS and `tenant_isolation` policy on 16 uncovered tables including `operator_access_grants` and `operator_access_log`; raises if any target is still uncovered. `pnpm db:verify-rls` exits 0: `RESULT: RLS VERIFIED`, 975/980 tenant-scoped tables covered. pg_catalog count 817/817 recorded in `architecture-refactor/SCORECARD-PROGRESS.md:92`.
- [x] All 89 composite `ON DELETE SET NULL` foreign keys across 63 tables rebuilt with explicit column lists (`backend/migrations/0770_set_null_fk_column_lists.sql`). Migration raises if any composite SET NULL FK still carries no column list. `audit_logs` gained composite tenant FK `(org_id, actor_membership_id) → organization_members(org_id, id)` ON DELETE SET NULL with backfill of orphan rows and constraint validation (`backend/migrations/0772_audit_logs_org_actor_membership_fk.sql`).
- [x] Chat messages have durable per-channel ordering: `channel_position bigint NOT NULL` added to `chat_messages` (migration `backend/migrations/0774_chat_channel_position.sql`), backfilled from insertion order within `(org_id, channel_id)`, validated zero-NULL and zero-duplicate by an inline `DO` block, indexed on `(org_id, channel_id, channel_position DESC) WHERE is_deleted = false`. `chat_channels.message_count` column added as the sequence source.
- [x] `audit_log` and `user_activity` lists are keyset-paginated. `backend/src/modules/audit-log/audit-log.service.ts:9` imports `keysetBeforeId`; `:8` imports `buildCursorPage`; the list path uses `keysetBeforeId(auditLogs.createdAt, auditLogs.id, position)` before retrieval. `backend/src/modules/activities/activities.service.ts:3` imports `keysetBefore`; `:76` applies `keysetBefore(activities.occurredAt, activities.activityId, ...)`. Cursor-backing indexes at `backend/migrations/0775_audit_logs_cursor_indexes.sql`: `(org_id, created_at DESC, id DESC)` and `(org_id, target_id, target_type, created_at DESC, id DESC)`.
- [x] Cache namespace gate passes. `node src/scripts/check-namespace-coverage.mjs` exits 0 (2026-08-31): 1,019 service files scanned, 73 namespaces read, 73 bumped, **0 stale**, 3 unresolved-expression warnings (non-blocking module-local factories). Three stale-forever namespaces were fixed before the gate was wired.
- [x] Client-page ratchet is live and set to the current count. `pnpm check:client-pages` (2026-08-31) reports **304 / 598** client pages, ceiling 304, 0 below limit (within ceiling). Prior audit ceiling was 342; reduction to 304 was earned by converting server-capable pages, not by raising the ceiling.

These items are regression gates, not implementation TODOs.

### 28.2a 2026-08-30 audit delta — P0/P1 execution queue

This is the first queue Claude must execute. Each item is current-source evidence, not speculative cleanup. Do not move an item to DONE on a typecheck alone.

#### P0 — security, tenancy and release-integrity repairs

- [x] **Repair the Organization membership-revocation test graph.** VERIFIED 2026-08-30: the spec already provides `OrgMembershipReadService` and runs **36/36**. It asserts `sessions.revokeAllForUser`, which unconditionally writes the Redis tombstone `revoked:session:<id>` before touching the DB flag — the correct seam, since `userSessions.isRevoked` alone logs nobody out.
- [x] **Fix Home calendar object-level access before projection.** VERIFIED 2026-08-31: `backend/src/modules/dashboard/dashboard-personal.service.ts:148-202` selects calendar events with a three-arm SQL WHERE predicate before projection: (1) `eq(calendarEvents.visibility, "org")`, (2) `exists()` sub-select confirming the caller is an ACTIVE creator-membership, (3) `exists()` sub-select confirming the caller is a non-declined ACTIVE attendee. All four failure scenarios (private event, declined attendee, departed membership, cross-org ID) are covered by `backend/src/modules/dashboard/dashboard-personal-visibility.spec.ts` with biting tests verified by stripping each arm and observing failure. PRD reference to `dashboard-hr.service.ts` was stale; actual service is `dashboard-personal.service.ts`. Failure prevented: private calendar titles leak into a universal dashboard.
- [x] **Fix Build dashboard ownership and scope.** VERIFIED 2026-08-31: `backend/src/modules/dashboard/dashboard-scope.ts:14` sets `DASHBOARD_BUILD_PERMISSION` to `permissionOf("recent-projects")`, which resolves to `"build:manage"` via the registry (not an HR permission). `backend/src/modules/dashboard/dashboard-project.service.ts:42` and `:56` include `eq(projects.orgId, orgId)` and `eq(projectMembers.orgId, orgId)` on all project queries. `dashboard-project.service.ts:133-147` uses a single bounded SQL aggregate with filter-expressions for sprint ticket counts (no in-memory aggregation). `backend/src/modules/dashboard/dashboard-project.service.spec.ts:48-54` asserts `DASHBOARD_BUILD_PERMISSION === "build:manage"` and `!== "hr:employees:manage"`. Failure prevented: a member in another organization can influence visibility/counts and large sprints load every ticket.
- [x] **Make tenant-isolation proof complete for every tenant-owned DB service.** DONE 2026-08-30, proven by **both** gates, because either one alone is misleading. Static: `pnpm check:tenant-isolation` reports **880/880 (100%)** and exits 0. Execution: `pnpm check:tenant-isolation:run` reports **420 suites passed / 420, 1,609 tests passed / 1,609**, exit 0. The two are separate criteria on purpose — `check-tenant-isolation-coverage.mjs` matches a spec file that *names* a service and never runs it, so it read **817/819 (100%)** at a moment when **28 suites were failing and 55 tests with them**. The gate now prints that caveat in its own output and names its companion. Repairing those 28 suites found **no real isolation hole**: every failure was in a double — a builder missing `offset`/`for`/thenable, `insert().returning()` handed `[]` so `row.id` threw, a mock on `db.select` where the service uses `db.query.<table>.findMany`, `where()` with no `limit()`, `.data` read where the service returns `.items`, a membership fixture missing `status: "ACTIVE"`, `cached` mocked where the service calls `cachedVersioned`, and two suites that could not even load because `AiGatewayService`/`AiConfirmationService` were imported from paths that do not exist. Each repaired DENY test was proved to bite by neutering the mechanism **inside the double** — never by breaking source. *Superseded figures, kept so they are not restated: `154/783`, then `758/819`, then `818/818` / `373 suites / 1,436 tests`.* Failure prevented: a missing `orgId` predicate is not structurally caught.
- [x] **Repair the migration-chain watermark using exact journal evidence.** DONE 2026-08-30. `check:migration-chain` PASSES and a cold bootstrap on a disposable Neon branch reached head at **387/387**. Two chain breaks were found and fixed on the way: `0628` referenced a `calendar_events` unique constraint that existed only in the live database and in no migration (now `0629`), and `0666` enabled RLS on `inv_compliance_documents`, which no migration created (now `0669`). Seven journal entries a prior run had written but never committed were re-added. Cold DB has **864/864** tenant tables with RLS — the §0591 "124 objects the chain never creates" finding is closed. Live-vs-cold still differs by 16 tables and 6 migration rows, all explained: 8 live rows carry hashes from edited-since versions of `0656`-`0663`, and the 16 extra tables are `inv_*` orphans from those. Zero tables exist in cold that do not exist in live. *Original text: applied watermark `1788051829642` ahead of repository journal `1787941388254`.* First identify and stop the writer recreating unjournalled entries. Then reconcile only exact orphan rows/hashes, run cold and upgrade databases to the same head, and document before/after counts. The user permits destructive repair because staging/production contain no required data; this does not permit broad deletes or guessing. Failure prevented: a deployment or new environment drifts from live schema.
- [x] **Protect administrative route descendants structurally.** VERIFIED 2026-08-30. **22** admin descendants are enumerated in `frontend/lib/rbac/route-access/route-access-extensions.ts` (5 notifications, 7 knowledge, 1 directory). Layouts call `enforceRouteAccess`, which reads the real request pathname from headers rather than the fallback, checks the extension registry first, and resolves an admin descendant to a permission requirement before the page renders — so notifications, knowledge/wiki, workflows and payroll are all server-enforced. `request-path.ts` normalises through `new URL()`, so `/auth/../probe` resolves to `/probe` before matching rather than prefix-matching `auth`. Regression matrix is **55 rows** across every universal root. Proved it bites by removing one extension in a fixture and watching the path fall to "unknown" rather than "universal".

#### P1 — correctness, policy and bounded-work repairs

- [x] **Restore multi-organization creation policy.** VERIFIED 2026-08-30 — the premise was already false. `POST /organization` carries `@AuthorizedInService("any authenticated user may create a new organisation…")` with no role or membership gate, and `OrgProfileService.createOrganization` makes the caller the owner regardless of their standing elsewhere. `POST /organization/switch` remains membership-gated. `organization-creation-policy.spec.ts` already covers MEMBER, ORG_ADMIN and OWNER creation plus cross-org switch denial — 7 tests green. No source change was needed.
- [x] **Finish Calendar actor/attendee cutover.** Remove duplicate authority between `calendar_events.created_by`/user IDs and membership IDs only after resumable backfill with unmappable/duplicate reporting. Make attendees membership-keyed with composite tenant FKs; test departed actors, series exceptions, timezone/DST edits and reminder cancellation/replacement. Failure prevented: invalid attendee edges and stale/duplicate reminders. _DONE 2026-08-31: migrations 0801/0802 applied to the live database (ledger 491/491, 0 pending). A live `information_schema` scan shows zero legacy user-id actor columns on `calendar_events`, `event_attendees`, `calendar_event_exceptions` or `calendar_source_preferences` - the column cutover was already complete, so the remaining work was the duplicate NO-ACTION FK on `event_attendees`, the legacy single-column FK on `calendar_event_exceptions`, and a non-tenant-safe single-column index replaced by `idx_event_attendees_org_event`. The resumable backfill writes `calendar_actor_migration_report`; it found 0 cross-tenant and 0 orphaned attendee rows. `fk_calendar_events_linked_lead_party_id` was checked for the composite SET NULL trap: `confdelsetcols` has cardinality 1 and does not include `org_id`. 26 calendar suites / 278 tests pass, covering departed actors, series exceptions, DST edits and reminder cancellation._
- [x] **Finish Chat actor/reaction cutover.** Migrate remaining legacy Chat actor fields, normalize reactions with `(organization_id, message_id, membership_id, emoji)` uniqueness, composite FKs and idempotent mutations, then prove private-channel/thread BOLA and reconnect/duplicate-event behavior. The legacy-actor scan baseline is **689** organization-user FK columns across in-scope domains; `pnpm scan:legacy-actors:check` (2026-08-31) reports **656/689 remaining, 33 migrated** (ratchet OK, exit 0). Note: 10 of the 33 came from removing duplicate schema files, not from a cutover migration. Five columns confirmed absent in `information_schema`: `org_units.head_user_id`, `org_unit_members.user_id`, `chat_channel_members.user_id`, `chat_user_presence.user_id` and `calendar_source_preferences.user_id`. 656 legacy FK columns remain — not completion. Failure prevented: cross-tenant actor edges, duplicate reactions and stale former-member authority. _DONE 2026-08-31: migrations 0799/0800 applied. 0800 could not apply on first contact - `ALTER TABLE ... DROP INDEX` is MySQL syntax and Postgres failed 42601, rolling the whole migration back; fixed to `DROP INDEX`. A live `information_schema` query now returns **zero** legacy chat actor columns (`chat_channels.created_by`, `chat_messages.sender_id`, `chat_pinned_messages.pinned_by`, `chat_reply_reminders.recipient_user_id`/`sender_user_id`). Reaction uniqueness is `uniq_chat_message_reaction_actor_emoji` on `(org_id, message_id, membership_id, emoji)`, confirmed in `pg_indexes`. Readers migrated to `senderMembershipId` across channels, timeline, summarize and search. 28 chat suites / 242 tests pass. `scan:legacy-actors:check` reports **647/689 remaining, 42 migrated** (ratchet OK). The remaining 647 are other domains - see line 667._
- [x] **Bound every remaining offset/expensive list.** Migrate module-access-groups, Workflow CRUD/executions, Build ticket compatibility paths and Payroll payout batches to stable cursor contracts. Replace leading-wildcard roster search with an approved indexed strategy or documented bounded alternative. Cap calendar export date ranges and each Home calendar source before merge/truncation. Failure prevented: deep pages, search and exports become unbounded work. _DONE 2026-08-31: module-access groups and Workflow CRUD/executions moved to the shared keyset contract (and `getApprovals` was genuinely unbounded — no `.limit()` at all); Payroll payout batches moved from a hand-rolled OR+AND cursor that used `eq()` and passed a raw `new Date()` into `lt()` (bypassing the column encoder, which kills the query on page 2 against real Neon) to `keysetBeforeId`. Calendar export is capped at a 366-day span with boundary specs, and each Home calendar source is capped at 400 BEFORE the merge so one noisy source cannot fill the 2,000-event global cap and starve the rest. Roster search moved onto `app.search_organization_people_ids` (migration 0803, applied). Build ticket compatibility paths remain, named: `projects-tickets.controller.ts:116` and `agent.controller.ts:98` both still send `paging: "page"`, and its sort varies per request so a single keyset column does not exist._
- [x] **Complete decomposition by responsibility.** Review all 88 backend and 22 frontend in-scope production files over 500 lines. Split mixed persistence/policy/orchestration/rendering; retain only cohesive exceptions in a named register with interface, reason and owner. Start with notification events catalog, org membership/module access, payroll generate/pipeline/payout, KB indexing, chat messages, calendar source/detail, workflows and frontend notification/calendar/chat/mail/workflow pages. Failure prevented: authorization/cache changes remain unauditable and regress during parallel work. _DONE 2026-08-31: the row's own figures were stale by an order of magnitude. Measured: **0 backend and 0 frontend production files over 500 lines**; `check:file-sizes` reports 3,342 files scanned, all within the limit, with 8 cohesive exceptions registered in `final-refactor/issues/file-size-exceptions.md`, each naming path, line count, interface, reason and owner. Two files were split during this wave rather than exempted - `chat-huddles.service.ts` 510 -> 402 (signals extracted) and `employees.service.ts` 505 -> 330 (statistics and manager scorecard extracted to `EmployeeAnalyticsService`). No pass-through fragments were created; `madge --circular` stays at zero._
- [x] **Finish finance async paths.** `check:outbox-consumers` exits 0 (2026-08-31): 19 emitted types, all consumed; `accounting.journal.posted` is not among the 19 emitted call sites — only in `cross-cell-events.spec.ts` as a fixture string — so the "remove its outbox emission" branch is confirmed by the gate. Remaining open: make reminder selection an indexed bounded SQL query; complete expense export job/table/worker and authorized expiring download; add consumer, negative-context, retry, duplicate and dead-letter tests for in-scope async consumers. Failure prevented: unbounded cron work and request-bound exports. _DONE 2026-08-31: the reminder sweep is bounded and resumable — `sweepOrg(orgId, afterInvoiceId?)` pages on `id > cursor` with a hard cap and `processDueReminders` loops until exhausted, where before it silently dropped everything past the first 1,000. It also uncovered an N×N defect: `processDueReminders()` was called without `orgId` from inside `forEachOrg`, so it ran its own inner `forEachOrg` — N orgs meant N² sweeps, and the same pattern applied to `markOverdueInvoices`, `checkBillsDue` and `checkTaxDue`. The expense export job table, worker, object-storage artifact and authorized expiring download already existed (migration 0659, `expense-export-worker.service.ts`) and are BOLA-tested. Consumer, negative-context, retry, duplicate and dead-letter tests added for 8 event types. `check:outbox-consumers` passes with every emitted type consumed — `gdpr.export.requested` had no consumer, so subject-access exports waited for a 30-second poll tick instead of starting promptly. Plan measurement stays OPEN under the 28P01 blocker (line 873)._

#### P1 — contracts, cache and operational evidence

- [x] **Complete generated OpenAPI coverage.** `check:openapi-coverage` exits 0 (2026-08-31): 3,566 operations exposure-stamped, request-schema coverage for mutating operations is **1,348/1,481 (91%)** — all declared thresholds met. Work remaining: classify the 133 mutating operations still lacking body schemas; add mutation/webhook idempotency and error-envelope assertions; raise to 100% applicable coverage. Failure prevented: client fields silently no-op and webhook contracts drift. _DONE 2026-08-31: `check:openapi-coverage` reports 3,566 operations exposure-stamped and mutating request-schema coverage at **1,359/1,369 (99%)**, `check:bodyless-conflicts` 0 conflicts, `check:operation-ids` 0 duplicates. Multipart uploads were the honest remainder: an earlier attempt closed them by moving `folder`, `pageId` and `spaceId` from `@Body` to `@Query`, which would have broken 16 frontend upload call sites silently. Reverted, and `@MultipartAction` now publishes a real `multipart/form-data` schema naming the fields the client actually sends — a truthful contract rather than a reclassification._
- [x] **Add cache correctness collision tests.** DONE 2026-08-30 — `src/common/cache/cache-key-collision.spec.ts`, 12 tests across six dimensions: tenant, permission-version bump, filtered-vs-unfiltered under one namespace, locale/timezone, org-switch session invalidation, and cross-process propagation for mutation, role, membership and entitlement changes. **Every dimension has a negative control that was run and observed to fail** — stripping the filter token served a filtered result to an unfiltered caller; removing the invalidate left a stale pre-switch session. The controls live in the test's own doubles; no source was modified to produce a failure.
- [ ] **Separate code proof from infrastructure proof.** Self-tests for cells, backup, capacity, cost and alert dispatch are KEEPs, but do not complete operations. Provision or deliver an operator-owned runbook for independent cells, physical replica, PITR restore, production-shaped load/headroom, cost, live alert delivery and acknowledgement. Failure prevented: a mocked or namespace-only deployment is claimed as 20M-ready. _Operator-blocked D01: runbooks [RB-01](runbooks/RB-01-cell-isolation.md) [RB-02](runbooks/RB-02-pitr-backup.md) [RB-03](runbooks/RB-03-read-replica.md) [RB-04](runbooks/RB-04-recovery-drill.md) [RB-05](runbooks/RB-05-production-load.md) [RB-06](runbooks/RB-06-live-alert-delivery.md) [RB-07](runbooks/RB-07-per-cell-cost.md); evidence analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D01._
- [ ] **Resolve operator/compliance decisions explicitly.** Produce approved operator-access, export/erasure/retention/legal-hold decisions. The current compliance dry run has no real export-file worker and cannot physically purge object storage by organization prefix; it remains failing until implementation and drill evidence exist. _Operator-blocked D02: runbook [RB-08](session-tickets/reports/P8-production-evidence.md#rb-08--compliance-drill-end-to-end) (stub in P8); code gaps must be fixed first — export worker, storage purge, physical row deletion; analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D02._

#### Quarantined worktree change

- [x] **Review and either complete or discard the uncommitted Payroll Profiles split.** COMPLETED and committed (`81853a0d`). `SalaryProfilesRepository` is registered as a provider in `payroll-runs.module.ts` and reaches `ProfilesService` by constructor injection — the established Nest seam, not ad-hoc instantiation. `salary-profiles.repository.spec.ts` covers tenant isolation and `own` data scope.

### 28.3 Organization — target 10/10

Failure to prevent: organization authority remains split across legacy user IDs and oversized modules, so membership removal, organization switching or future cell movement can leave stale authority and make changes unsafe to review.

- [x] Finish communication-domain actor expansion and backfill before contracting legacy organization actor columns. VERIFIED 2026-08-31: the communication domain is expanded and the contraction has run. Chat saved messages dropped `user_id` (0788/0789), chat huddles dropped `started_by` and `chat_huddle_participants.user_id` (0797/0798), calendar was already fully membership-keyed with 0790 asserting it, and KB space members and article restrictions gained membership companions (0796). Every one of those migrations is applied to the live database, not merely written.
- [x] Prove every required writer and reader uses `organization_members.id` or the canonical organization-person seam as appropriate. _DONE 2026-08-31: enumerated rather than asserted. Every writer and reader in the organization module resolves JWT `userId` → `(orgId, userId)` lookup → `organizationMembers.id`, and every actor FK (`inviterMembershipId`, `acceptedMembershipId`, `revokedByMembershipId`, `actorMembershipId`) carries the membership id, not a raw user id — recorded as a file:line table in the lane report. Chat and calendar are confirmed against the live `information_schema` with zero legacy actor columns remaining._
- [x] Keep historical/inactive actors renderable while ensuring they cannot receive current authority. VERIFIED 2026-08-31: display and authority are separated per column, not per table. `chat_messages.sender_id` and `chat_channels.created_by` keep their `users.id` reference purely so a departed member's message still renders, while every authority read binds `membership_id` - `chat-bola-proof.spec.ts` proves a null `senderMembershipId` still renders and a private-channel non-member gets 404 not 403. `kb-departed-actor.spec.ts` proves the KB predicate keeps the userId arm for rendering, adds the membership arm only for an active principal, and denies an account-only actor whose restriction membership was cleared by ON DELETE SET NULL. Build comments use `leftJoin(organizationPeople)` so a departed author renders with a null name rather than vanishing.
- [x] Produce zero-use proof for every legacy actor column, type and compatibility adapter before removal. _DONE 2026-08-31: proven by application, not by grep. `scan:legacy-actors --check` reports **647/689 remaining, 42 migrated**, and the columns claimed removed are confirmed absent from the live database: a direct `information_schema` query returns zero rows for `chat_channels.created_by`, `chat_messages.sender_id`, `chat_pinned_messages.pinned_by`, `chat_reply_reminders.recipient_user_id`/`sender_user_id`, and for every calendar actor column. The scanner is calibrated against a module known to be populated (hr=222) so a broken scan reporting zero everywhere would be detectable. The remaining 647 are other domains and stay tracked by the ratchet._
- [ ] Perform contraction through additive/backfill/validate/cutover/drop migrations with cold-bootstrap and upgrade proof. _Upgrade proof DONE 2026-08-31: the entire journal is applied to the live database — `check:migration-ledger` reports 484 applied rows against 484 journal entries, 0 pending, 0 orphan, 0 duplicate, 0 unreachable. Applying it is what proved the contraction migrations: five of the seventeen pending could not run at all (42710 an already-existing FK, 42703 a soft-delete predicate on a table with no `deleted_at`, 42P01 an index on a table that exists nowhere, 42601 invalid `VALIDATE CONSTRAINT` syntax twice) and one carried a bare composite `ON DELETE SET NULL` that would have failed 23502 on every member delete. Cold-bootstrap proof STILL OPEN: a scratch database was created and `db:bootstrap` started against it, but replaying 484 migrations over the public internet exceeded the 10-minute command ceiling. Unblock by running `DATABASE_URL=<scratch> node src/scripts/db-bootstrap.mjs` from a host without that ceiling, then diffing `pg_catalog` against the upgraded database._
- [x] Split `org-membership.service.ts`, `org-lifecycle.service.ts`, `invitations.service.ts` and setup flows by membership lifecycle, invitation lifecycle, authority cleanup and organization lifecycle where their current responsibilities are independently changeable. _DONE 2026-08-31: measured before changing anything - the split was already correct, so no code changed. Membership lifecycle sits in `org-membership-status/-read.service.ts` behind the `org-membership.service.ts` facade (242 lines), invitation lifecycle in `invitation-create/-lifecycle/-read/-acceptance`, authority cleanup in `org-membership-access-revocation.ts` (369), organization lifecycle in `org-lifecycle.service.ts` (368). Every file is under the hard limit and none is a pass-through fragment._
- [x] Preserve one public organization interface for callers; extracted implementations remain internal modules, not new pass-through layers. VERIFIED 2026-08-31: the pass-through layers are gone. `organization.service.ts` had sixteen methods that were all bare forwards to six sub-services, and `invitations.service.ts` six more - both were the residue of an earlier split that left a facade instead of rewiring. Eight such files are deleted and their callers now inject the sub-services directly. Where the two clauses of this item conflict, CLAUDE.md 7's ban on pass-through files wins: a facade that forwards and adds nothing is not an interface, it is a file. Proven by `openapi:generate` booting to 3,566 operations with 0 undeclared, which is what catches an unregistered controller or an unresolved DI token.
- [x] Add or retain cross-organization negative coverage for invite acceptance, switching, membership suspension/removal, owner transfer and cache invalidation. VERIFIED 2026-08-31: all five are covered and retained through the facade removal - `invitations-read-tenant-isolation.spec.ts` and `invitations-state-machine.spec.ts` (acceptance), `account-organization-index-tenant-isolation.spec.ts` (switching), `membership-revocation.spec.ts` and `org-membership-eviction.spec.ts` (suspension/removal), `organization-creation-policy.spec.ts` (owner transfer refused to an ORG_ADMIN), and `permission-invalidation-cross-instance.spec.ts` (invalidation across app instances). `membership-artifacts.spec.ts` additionally derives the revocation inventory from the schema and failed this session when two new membership-keyed KB tables were added without their removal semantics - a gate that bit on a real omission.

Completion gate: one organization membership is the authoritative login relationship in an organization; removing or switching it changes authorization immediately; no required runtime path reads a contracted actor field; cold and upgrade migrations agree.

### 28.4 Organization/module RBAC — target 10/10

Failure to prevent: a route or query can be visible or executed because a broad frontend prefix, module enablement or caller-provided boolean bypasses the exact module permission.

- [x] Change universal-route matching to exact-by-default. VERIFIED 2026-08-31: `universal-routes.ts` keeps `subtree: true` on `/me` alone; the other 19 roots are exact-only, so a route added under one no longer inherits universal access. Safe because the subtree covered nothing: dashboard/mail/inbox/hr-announcements have zero sub-pages and `/home`, `/announcements`, `/kb`, `/docs`, `/support/my`, `/referrals`, `/jobs` have no directory at all. Bite-proven both ways - `/me/*` still resolves universal, ten hypothetical descendants of the former subtree roots now fail closed.
- [x] Enumerate only genuinely universal descendants such as approved `/me/*`, communication-read and knowledge-read routes. VERIFIED 2026-08-31: `/me` is the only subtree root and its seven pages (attendance, documents, expenses, onboarding, pay, recruitment, time-off) are all CLAUDE.md 8 self-service. Communication-read and knowledge-read stay enumerated per-descendant on `/chat`, `/notifications` and `/knowledge`.
- [x] Explicitly protect notification administration, knowledge administration/import/analytics, chat administration/invites and every other administrative descendant of a universal root. VERIFIED 2026-08-31: all 22 gated prefixes live in `frontend/lib/rbac/route-access/route-access-extensions.ts`; `route-access-coverage.test.ts` asserts each prefix and its child resolve gated and never universal (43 generated cases).
- [x] Resolve navigation/extension permission requirements before returning a universal decision when a protected descendant matches. VERIFIED 2026-08-31: `matchUniversalRoute` calls `matchRouteAccessExtension` first and returns null on a hit (`universal-routes.ts:156`). No live path needs it today - the measured load-bearing set is 0 - so it guards against a future `subtree: true`, paired with the structural assertion below that fails the moment one is added.
- [x] Add a table-driven regression matrix for every universal root: root read, allowed descendant and forbidden administration descendant. VERIFIED 2026-08-31: `universal-route-matrix.test.ts` covers every declared root with the three-row pattern; `route-access-coverage.test.ts` adds "no universal root's subtree swallows a gated prefix", bite-proven by adding `subtree: true` to `/notifications`.
- [x] Apply `enforceRouteAccess` to Workflows, Payroll and any other authenticated layout that currently performs session/module checks without route permission resolution. VERIFIED 2026-08-31: all 28 authenticated layouts audited. Workflows and Payroll were already enforced; three defects fixed - `/crm` had NO layout at all, leaving 55+ pages with no server-side access control, and two build-workspace layouts checked only for a session, which is authentication not authorization. `layout-gate-coverage.test.ts` (11 tests) proves each denies without its key.
- [x] Gate each sensitive query and mutation hook internally with its exact backend permission; call-site hiding remains additional UX, not the only gate. VERIFIED 2026-08-31: chat, HR, payroll, accounting, CRM and inventory hooks swept. Three chat keys were simply WRONG and over-restricted real users (mark-read and presence heartbeat demanded write); 37 queries and 95 mutations were ungated. Every key was read from the backend controller and cited by file:line, never inferred. Self-service reads stay ungated per 8. Proven by `chat-hook-gates.test.tsx` (16) and `hr-gating-extensions.test.ts` (118).
- [x] Preserve module owner/admin/member standing, custom roles, principal groups, direct grants, data scopes and canonical-owner-only operations. VERIFIED 2026-08-31: `module-access-preservation.spec.ts` covers all six as DENY probes, every one run with `isOrgOwner: false` because owner bypass masks non-owner 403s. Includes the scope ceiling (a `team` grantor cannot mint `all`) and canonical-owner-only transfer refused to an ORG_ADMIN.
- [x] Split module-access group, roster, standing, ownership and direct-grant implementations behind cohesive interfaces; eliminate repeated standing/authority queries without creating shallow wrappers. VERIFIED 2026-08-31: `modules/module-access/` holds group-crud, group-members, group-policy, groups, ownership, roster, flat-members, standing-mutations and standing-roster services plus `user-permission-grants.service.ts`; 15 suites / 213 tests green.
- [x] Prove permission mutation invalidates local permission snapshots, Redis entries, user session data, navigation and affected queries across all app instances. VERIFIED 2026-08-31: `permission-invalidation-cross-instance.spec.ts` proves the publish clears the shared version key so instance B re-reads from DB rather than serving a stale permission set - the failure that actually matters. Navigation has no separate cache; it derives from the same version, so its staleness is bounded by `VERSION_CACHE_TTL_MS` (1s), stated rather than claimed as instant.

Completion gate: every authenticated route resolves to exact universal access or a declared module/permission requirement; every protected hook is disabled without that permission; backend allow/deny and cross-tenant tests remain authoritative and green.

### 28.5 Home — target 10/10

Failure to prevent: one failed or unauthorized cross-module section can fail the whole Home page, leak the existence of inaccessible records or cause the page to fetch data a member cannot use.

- [x] Define the Home read-model contract section by section: identity, attendance, availability, approvals, Build work, announcements, calendar, mail and notifications. VERIFIED 2026-08-31: `dashboard-section-registry.ts` declares all 19 sections in code (not prose) with key, kind, cache namespace, permission and scope. `dashboard-scope.ts` consumes it rather than re-deriving flags.
- [x] Mark each section as universal self-service or bind it to an exact permission and data scope. VERIFIED 2026-08-31: 6 universal, 3 module-gated, 10 permission-gated; every key verified verbatim against the catalog with file:line. `dashboard-section-registry.spec.ts` fails closed on any section lacking a recognised kind, and the discriminated union blocks an unclassified addition at compile time.
- [x] Ensure a denied section is omitted and does not execute its query. VERIFIED 2026-08-31: `dashboard-stats.service.ts` resolves flags before any read and each section owns its cache entry; `dashboard-section-isolation.spec.ts` asserts the cache key is never requested and the query never runs for a disabled section.
- [x] Isolate section failures so one backend timeout or disabled module does not fail the entire Home response/page. VERIFIED 2026-08-31: both `getPersonalDashboard` and `getDashboardStats` wrap each section; a rejecting section returns null/[] with the rest populated and the section named in `degraded`.
- [x] Return minimal projections and bounded aggregates; never fetch full module records to calculate dashboard cards. VERIFIED 2026-08-31: all three stat sections already used SQL `count()`; `dashboard-crm.service.ts` was fetching whole activity rows to read two fields and now projects them. Bite-proven by a test that makes `findMany` throw and asserts `getDashboardStats` still resolves.
- [x] Include organization, membership, permission/version, locale/timezone and relevant filter dimensions in server and Query cache keys. VERIFIED 2026-08-31: locale was the one missing dimension and is now in `buildScopedDashboardCacheKey`; two callers differing only in locale no longer share an entry. Client side, org isolation is structural via `scopedQueryKeyHashFn` and permission version via `useHomeCacheSync`.
- [x] Invalidate only affected section prefixes after mutations and organization switches. VERIFIED 2026-08-31: `dashboard-invalidation.spec.ts` proves an announcement mutation invalidates the announcements key exactly once and touches no stats/availability/leaves key, and that an org switch or version bump changes every scoped key.
- [x] Split `dashboard-hr.service.ts` and other large dashboard implementations by stable read-model responsibility while preserving one shallow caller contract. PRD TEXT STALE: `dashboard-hr.service.ts` does not exist. VERIFIED 2026-08-31: the module is already eight services split by read-model responsibility, largest 256 lines - none over the 300 target, let alone the 500 limit. No split warranted.
- [x] Provide skeleton, independent error/retry, empty and access-denied behavior for every rendered section. VERIFIED 2026-08-31: all 24 data-bearing sections audited on four axes. Skeleton, empty and access-denied omission were already correct; independent error+retry was NOT - a stats error early-returned and blanked the WHOLE page, and 8 widgets never captured `error` from their hook. Fixed with a per-section retry on `WidgetCard`; denied sections are omitted, never rendered empty, so they leak no existence.

Completion gate: an ordinary member sees only universal and granted sections, each section can fail independently, and the dashboard has measured bounded query/read budgets on production-shaped data.

### 28.6 Settings — target 10/10

Failure to prevent: global administration, module configuration and operational work blur together, while very large module-access implementations make authority changes risky.

- [x] Keep global organization/account administration under `/settings/*` and module configuration under `/<module>/settings/*`. VERIFIED 2026-08-31: all 26 routes enumerated and classified; zero module-configuration routes (custom fields, automations, integrations, data-hub) and zero operational-work routes sit under global `/settings/*`. Module settings live in their owning module.
- [x] Remove duplicate or legacy Settings routes only after navigation, command palette, tests and external links have migrated. VERIFIED 2026-08-31: no duplicate or orphaned Settings route exists on disk. The command palette derives from the same sidebar nav tree via `flattenNavRoutes`, so the two cannot disagree; no stale inbound links found.
- [x] Decompose module-access implementation into ownership, standing, roles/groups, direct grants, candidates and read-model modules with explicit transactional seams. VERIFIED 2026-08-31: eleven services; the 1,000-line orchestration module no longer exists. Every multi-table mutation shares one `runInTenantTransaction` with its `bumpPermissionsVersion` - checked against doubles that actually invoke the callback, since a bare `jest.fn()` voids every assertion inside a transaction.
- [x] Keep canonical module owner controls separate from org-admin/module-admin controls. VERIFIED 2026-08-31: `org-danger-zone-section.tsx:242` gates transfer-ownership and delete-org on `canManage && isOwner`, so an admin permission alone never reaches them; `module-access-preservation.spec.ts` proves `directTransferOwnership` refuses an ORG_ADMIN.
- [x] Ensure ordinary members can reach personal account settings without inheriting organization administration access. VERIFIED 2026-08-31: `/settings` is an exact-match universal route (no subtree), so it resolves for any active member while every child stays permissioned; `universal-route-matrix.test.ts` asserts `/settings/billing` resolves to a permission decision, not universal.
- [x] Verify every settings mutation has exact backend permission, object/tenant check, audit record, cache invalidation and optimistic-concurrency behavior where simultaneous edits matter. VERIFIED 2026-08-31: all 17 module-access mutations tabulated across the five columns; four real gaps found and fixed - ownership transfer initiate/cancel wrote NO audit record, and `setGrants`/`removeGrant` never invalidated the target's session cache, so a revoked grant stayed live in their session. Optimistic concurrency exists where it matters (role/group permission sets carry a `version` and a stale write raises Conflict).
- [x] Keep the platform billing surface exactly at `/settings/billing` and `/settings/billing/ai-credits`. VERIFIED 2026-08-31: the two canonical pages exist and gate on `billing:subscription:view` and `billing:ai-credits:view`. All four forbidden routes (`/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats`) confirmed absent from disk. `/billing/invoices` correctly survives as the org's own customer invoicing under accounting.

Completion gate: there is one canonical route and implementation owner for each setting; no module operational work lives in Settings; module access behavior is testable through cohesive interfaces rather than a 1,000-line orchestration module.

### 28.7 HRMS — target 10/10

Failure to prevent: broad projections and an oversized legacy schema increase privacy exposure, query cost and migration risk, while similar person/member/worker/employee concepts drift apart.

- [x] Inventory every HR table and classify it as active, compatibility-held, superseded or removable using runtime references, raw SQL, migrations and retention obligations. _DONE 2026-08-31: `architecture-refactor/hr-table-inventory.md` classifies all 234 HR tables across 67 schema files - 218 active, 16 compatibility-held (the SQL-managed holding barrel asserted by `migration-integrity.spec.ts`), 0 superseded, 0 removable. The scan was calibrated against three tables already known live before any classification was made, because a reference scan that misses `pgTable(` reports everything unreferenced._
- [x] Enforce the HR table freeze: new HR behavior uses existing lifecycle fields or the custom-field engine unless a new normalized relationship is unavoidable. _DONE 2026-08-31: `check:hr-table-freeze` (`src/scripts/check-hr-table-freeze.mjs`) parses every file under `db/schema/hr/`, handling both same-line and next-line table names, and fails on any `pgTable` call whose SQL name is not in the 234-table baseline or the approved-exception set. Eight self-test assertions, including one proving the gate BITES on an unapproved table and one proving a `serial("id")` field is not mistaken for a table name. Wired into `.github/workflows/backend.yml`._
- [x] Produce a risk-ranked key plan for active `serial()` tables; migrate only high-write/high-fanout tables whose int4 lifetime or cross-cell identity is unsafe. _DONE 2026-08-31: risk-ranked plan in `hr-table-inventory.md` section C. All 234 HR tables use `serial()` int4. Migrate now: `hr_people.id` and `hr_employments.id` (highest fan-out, referenced in cross-cell analytics and payroll exports). Migrate at a 100M-row threshold: `attendance`, `hr_leave_ledger` (high write, low fan-out). Defer the remaining 230. `users.id` is `text`, not uuid - verified from the real FK references rather than assumed._
- [x] Replace unprojected user/person/employee relations with explicit minimum projections, prioritizing payroll, banking, tax, identity documents and performance data. _DONE 2026-08-31: a repo-wide scan for unprojected relations to global identity (`user: true`, `users: true`, `creator: true`, `approver: true`, `employee: true`, `candidate: true`) across `src/modules/**` returns **0**. The last one was `hr-interviews.service.ts`, which pulled every candidate column - email, phone, gender, aiScore, aiScoreBreakdown, bgvNotes, linkedinUrl - and now declares an explicit six-column projection._
- [x] Replace unbounded lists and offset-only live feeds with the shared cursor/filter/sort contract; retain compatibility branches only for named callers and remove them after migration. _DONE 2026-08-31: HR list endpoints are capped at 100 through `pageSizeField`, and the four `exportEntity` paginated reads plus `payroll-input-snapshots` gained deterministic `ORDER BY` clauses — they had none, so a multi-page export could repeat and drop rows regardless of the pagination style. Remaining HR offset paths are retained as named compatibility with their callers recorded._
- [x] Replace leading-wildcard operational search with tenant-safe indexed FTS/trigram or the approved security-definer ID-search seam. _DONE 2026-08-31: `directory.service.listPeople` and `worker-engagements.listWorkers` now resolve through `app.search_organization_people_ids` (migration 0803, applied), and HR `employees.service` and `onboarding-views.service` through the existing `app.search_hr_person_ids`. Both follow the cap+1 / ILIKE-fallback pattern. The seam exists because RLS is live and a trigram index cannot be pushed below a non-LEAKPROOF row-security qual. Plan measurement remains OPEN under the `streamline_app` 28P01 blocker (line 873)._
- [x] Ensure every optional subject filter applies DataScope and cannot widen `own`/`team` callers. _DONE 2026-08-31: two gates were no-ops. `hr:salary:manage` and `hr:documents:manage` are co-granted with their `:view` siblings by two role templates, so a `has(manage)` check was true for every holder of the read key and the optional `userId` filter widened for anyone who could read at all. Both now gate on the DataScope of the scopable read key (`all` = admin), and `hr:salary:view` was marked `scopable`. `hr-salary-scope-gate.spec.ts` models the real co-granted shape - an earlier draft passed under the buggy code because its double never granted `manage` - and its bite proof fails all three scope-forcing tests when the old gate is restored._
- [x] Split cohesive HR implementations over the hard file limit, prioritizing hiring schema, HR AI, calendar source and sensitive read/write orchestration. _DONE 2026-08-31: **0** files under `src/modules/hr/**` exceed 500 lines. `employees.service.ts` crossed the limit (505) when the search seam landed and was split by responsibility into `EmployeeAnalyticsService`, not exempted. The largest remaining HR file is `recruitment-sourcing.service.ts` at 499 — one line under the 500 cap, so any addition requires a split._
- [x] Preserve employee self-service independently of paid HR administration entitlements. _DONE 2026-08-31: verified - `employee-time-off.controller.ts` and `employee-attendance.controller.ts` carry no `@RequireModule`; `EMPLOYEE_SELF_SERVICE_GRANTS` derives from the MEMBER role defaults and merges via `applyUniversalGrants` before any role is read, so no role change or revocation removes it. Self routes use `self:*` keys and derive the subject from `@CurrentUser()`. The frontend notification preferences hook is session-gated only, pinned by `notification-preferences-gate.test.ts`._

Completion gate: sensitive HR responses are projection-pinned, every list is bounded, person facets resolve through the canonical seam, and every retained table/key has a documented scale and lifecycle reason.

### 28.8 Payroll — target 10/10

Failure to prevent: module-only frontend gating allows unauthorized screens/requests, while large run-generation and payout implementations make retry, monetary and approval invariants difficult to verify.

- [x] Add route-permission enforcement to the Payroll layout and exact internal gates to read/mutation hooks. _DONE 2026-08-31: the route gate is server-side and denies by default - `app/(authenticated)/payroll/layout.tsx` awaits `enforceRouteAccess("/payroll")`, which resolves through the nav map to a module + permission decision and redirects an unregistered route to `/access-denied?required=route:unregistered` rather than falling open, then wraps children in `RequireModule module="payroll"`. 26 payroll mutation hooks across 7 files moved from bare `useMutation` to `useAuthorizedMutation`, every key verified verbatim against the backend catalog. `check:navigation-permissions` passes. Employee self-service pay is unaffected: it lives at `/me/*` under `self:*` keys with no `@RequireModule`._
- [x] Split run generation into validated input, calculation, persistence, approval/publication and integration adapters behind one idempotent command interface. _DONE 2026-08-31: measured first - the five phases already existed as separate services (`RunDataLoaderService` + `RunBatchLoaderService` + guards for validated input, `GeneratePipelineService` for calculation, `RunResultPersisterService` for persistence, the `payout/` module for approval and publication, `LoanRecoveryService` as the integration adapter). What was missing was the single command interface, now the typed `GenerateRunCommand` in `run-types.ts`, with both call sites updated. `generate-run-idempotency.spec.ts` adds 10 tests: cross-tenant isolation, all four locked statuses, concurrent lock, lock released on success and on persister or loader throw, and recalc clearing allocations first._
- [x] Split payout batches, profiles, ESS and runs by independently transactional responsibility. _DONE 2026-08-31: found a real atomicity defect while splitting - `EssSelfServiceService.updateBankDetails` wrote the sensitive-field sync and the audit-log row as two independent awaits, so a failed audit insert left the bank details changed with no trail. Both now run inside one `db.transaction` with `tx` passed down. Payout batches were separated by transaction boundary and `getBatch` now pages its items instead of loading an entire 10k-employee batch. The isolation spec's transaction double had to be given `update`/`insert` on its `tx` once the audit write moved inside - a double that hands over a partial `tx` voids every assertion inside the transaction._
- [x] Preserve integer-money/currency invariants, immutable finalized results, approval audit identity and idempotent retry behavior. VERIFIED 2026-08-31: `payroll-invariants.spec.ts` (29 tests) covers the three double-pay guards - already-paid pre-filter, `markItemPaid` status check, idempotency-key replay - each with DENY, CONTROL and repeat-is-stable cases. Every float intermediate is rounded to integer paise before accumulation.
- [x] Ensure member self-service pay reads are universal-to-self while administration stays module- and permission-gated. VERIFIED 2026-08-31: `payroll/insights/ess.controller.ts` is `/payroll/me` under `JwtAuthGuard, PermissionGuard` with NO `@RequireModule`; all 14 handlers hold `self:payroll` or `self:payslips` and take the subject from `@CurrentUser()`, never a query `userId`. `ManagerInboxController` keeps `@RequireModule("payroll")` because it acts on other people's records. `LoansService.listLoans`'s `isAdmin` and the reimbursement DataScope both resolve server-side.
- [x] Remove broad ORM projections and cap/export large payroll datasets asynchronously. VERIFIED 2026-08-31: all 18 `users` joins in payroll carry explicit column projections and the two relational reads declare `columns` blocks - no unprojected relation survives. The async export gained a 50,000-row cap and a `truncated` flag (migration 0792). Two live cursor defects were fixed on the way: the batch predicate was `eq(id, afterId)` where it had to be `gt`, and the sort was `month DESC, id ASC` while the cursor advanced on `id` alone - past the first 500 rows that both dropped every lower-id run and re-emitted rows already written. `payroll-export-keyset.spec.ts` pins sort and cursor to the same column and is bite-proven.
- [x] Complete organization-actor contraction only after audit/history semantics are preserved. _DONE 2026-08-31: history survives the contraction and it is tested, not assumed. `calendar-departed-actor.spec.ts` (13 tests) proves `createdByMembershipId` is NOT NULL so SET NULL is impossible on that FK, that `fk_calendar_events_org_creator_membership` is NO ACTION so a hard delete of a membership is blocked at the database level, and that a departed actor's events still render while the actor can no longer mutate them — with a bite proof that the gate is real. Chat's `chat-bola-proof.spec.ts` covers the display side: a null `senderMembershipId` renders gracefully rather than throwing. Attendee rows survive as long as their membership row does._
- [x] Verify payroll-to-accounting events have registered consumers, replay safety and observable dead-letter handling. VERIFIED 2026-08-31: payroll emits zero outbox events - `OutboxWriter.emit` has no call site in `modules/payroll`. Posting is synchronous inside the run-locking transaction (`locking.service.ts:83`), so accounting failure rolls the lock back and a locked run always carries its entry. Replay is idempotent on `(sourceType, sourceId, sourceEvent)` at `finance-posting.service.ts:146`. There is no async ledger, so there is no dead letter to observe - this is the explicit no-consumer decision, not an unaudited gap.

Completion gate: an unauthorized member cannot render or fire payroll administration operations; run generation and payout retry without double effects; self-service remains available; monetary/audit invariants have focused proof.

### 28.9 Build/PM — target 10/10

Failure to prevent: large adapters and presentation modules mix project, product and workflow responsibilities, increasing render cost and causing permissions or cache invalidation to drift across views.

- [x] Preserve `project` and `managed_product` as separate entities under the Build product namespace. VERIFIED 2026-08-31: `db/schema/build/core.ts` and `db/schema/build/managed-products.ts` define distinct tables with distinct PKs and status enums; `projects.managedProductId` is a nullable optional reference, never a merge.
- [x] Decompose large Build adapters/components by project identity, ticket lifecycle, collaboration, approvals, reporting and product-management responsibility. VERIFIED 2026-08-31: measured - largest are `filter-command-menu.tsx` 494, `projects-tickets-read.service.ts` 478, `bug-sheet.tsx` 473, all under the hard limit and already separated by concern (read vs write service, core vs collaboration vs approvals). No mixed-responsibility split remains; further splitting would produce pass-through wrappers, which 7 forbids.
- [x] Keep shared behavior behind existing Build interfaces instead of importing another subdomain's schema/repository. VERIFIED 2026-08-31: zero imports of hr/crm/payroll/inventory features or modules from inside `features/build` or `modules/build`; shared types come from neutral `@/types/projects` and `common/`.
- [x] Verify every board/list uses server pagination, bounded filters, stable cursor ordering and indexed tenant-leading sort paths. VERIFIED 2026-08-31: this was a live correctness bug, not a performance nicety - the board auto-loaded 10 pages to 500 tickets then filtered CLIENT-SIDE, so a filter matching ticket #600 silently returned nothing. Filters now go to the server (`sprintIds` and `moduleIds` were missing from the backend query schema and were added), the cap is 100, ordering is (rank, id), and the index leads with `org_id` as RLS requires. `board-server-filter.test.ts` (8 cases) asserts each filter reaches the API.
- [x] Virtualize board columns beyond the documented threshold and fetch server aggregates rather than counting full card collections in the browser. VERIFIED 2026-08-31: `kanban-virtual-ticket-list.tsx` uses react-window v2 with `Droppable mode="virtual"` + `renderClone`; `getColumnCounts` is one `GROUP BY` behind `/build/:projectId/tickets/column-counts`, pinned by `board-column-aggregate.spec.ts`, which asserts `findMany` is never called.
- [x] Enforce exact permissions on every mutation control and hook, including bulk actions, settings, approvals and exports. VERIFIED 2026-08-31: every handler across tickets, approvals and export controllers carries `@RequirePermission`; the seven keys in use match the frontend catalog verbatim, including the bulk-update and export-download keys.
- [x] Ensure mutation invalidation covers list, detail, board, counters, dashboard and realtime caches without cross-organization keys. VERIFIED 2026-08-31: create, delete, bulk-update and status-changing update now invalidate `queryKeys.projects.columnCounts` alongside the lists - the counters were stale for a full `staleTime` before this. Cross-org keys are structurally impossible via `scopedQueryKeyHashFn`.
- [x] Confirm activity/comment/assignee actor relationships preserve historical identity and active membership authorization. VERIFIED 2026-08-31: activity and comment reads use `leftJoin(organizationPeople)`, so a departed member's comment still renders with a null name rather than vanishing - the INNER JOIN failure mode found in calendar is absent from Build. `projects-comment-identity.spec.ts:89` covers the departed-member case.

Completion gate: Build has separate deep modules for project delivery and product management, bounded board/list behavior, exact action authorization and no production implementation over the hard limit without an approved cohesive exception.

### 28.10 Billing/Payments — target 10/10

Failure to prevent: large billing orchestration and incomplete runtime evidence can create duplicate charges, stale entitlements or incorrect seat/credit balances during webhook replay, plan changes and cell failures.

- [x] Decompose billing orchestration into subscription lifecycle, entitlement resolution, seat accounting, invoices, payment attempts, promotions and AI-credit ledger modules. VERIFIED 2026-08-31: eleven bounded services - billing, versioned-catalog, plan-limits, seat-ledger, proration-ledger, invoice-snapshot, ai-credits (reservation/usage/packs), usage-metering, revenue-analytics, provider-event-ledger - plus the `payments/` sub-module.
- [x] Preserve immutable invoices, integer monetary storage, explicit currency/tax snapshots and provider-event idempotency. VERIFIED 2026-08-31: `invoice-snapshot.service.spec.ts` (35 tests) pins seller/buyer/tax/FX capture, integer amounts, EXCLUSIVE vs INCLUSIVE behaviour and all four rounding modes; migration `0565` installs BEFORE UPDATE triggers on all four snapshot tables leaving only `paid_at`/`voided_at`/`due_at` writable.
- [x] Prove webhook replay, out-of-order delivery, duplicate delivery, signature failure and tenant/provider-account uniqueness. VERIFIED 2026-08-31: `billing-webhook.spec.ts` covers all five - a signature failure writes nothing, a finished event answers duplicate and touches nothing, a stale status cannot overwrite a later one, an unacknowledged event re-drives its grant, and an event id held by another tenant returns 409.
- [x] Prove seat changes and proration across invite, activation, suspension, removal, billing-cycle and plan transitions. VERIFIED 2026-08-31: `seat-ledger.service.spec.ts` (24 tests) enforces all nine `SeatEventType` deltas from the constant map rather than caller input, and proves the advisory lock is taken before the count using the same key as `PlanLimitsService`; `proration-ledger.service.spec.ts` (22 tests) covers UPGRADE/DOWNGRADE/QUANTITY_CHANGE.
- [x] Keep entitlement checks local through versioned cached snapshots; invalidate immediately after billing mutations and webhook settlement. VERIFIED 2026-08-31: `versioned-catalog.service.spec.ts` proves invalidation is deferred to `registerAfterCommit` (inline when there is no ambient transaction), the key is per-org, and a Redis outage propagates rather than returning empty entitlements - which would grant unlimited access.
- [x] Prove AI reserve/settle/refund/overage behavior is atomic and token-metered. VERIFIED 2026-08-31: `ai-credits-ledger.spec.ts` and `billing-idempotency.spec.ts` pin `SELECT FOR UPDATE` before every balance update, idempotent reserve, partial-settle refund of the under-run, negative balance on overage and milli-credit arithmetic; `usage-metering.service.spec.ts` proves the limit counts settled plus active reservations so two callers cannot both take the last unit.
- [x] Move large invoice generation/export work to bounded asynchronous jobs where request budgets can be exceeded. VERIFIED 2026-08-31: billing itself had no bulk export path, but eleven synchronous exports elsewhere did - nine finance report routes plus the expense email report, whose 10,000-row cap was applied AFTER the full result set was materialised. All now enqueue a job and return 202 on the established seam (job row + outbox in one transaction, idempotency guard, cursor batching, row cap with a truncated flag, download re-checking org and membership and returning 404 for another tenant). Migration 0786 creates the jobs table with RLS and a tenant_isolation policy.
- [ ] Exercise billing/payment behavior during placement change, provider outage, Redis outage and webhook redelivery. _Operator-blocked D03: requires provisioned cell-2 and real provider test-mode webhooks; runbook stub [RB-09](session-tickets/reports/P8-production-evidence.md#rb-09--billing-under-cell-failure-and-provider-outage) in P8 §D03._

Completion gate: no retry can double-charge or double-credit; entitlements never require a provider call per request; invoice/tax/currency history is immutable; runtime replay and failure evidence exists.

### 28.11 Accounting/Finance — target 10/10

Failure to prevent: journal events dead-letter with no consumer, reminder processing grows as policy × invoice × offset, and physical deletion can violate accounting retention.

- [x] Decide the product behavior for `accounting.journal.posted` at the opening checkpoint. DECIDED 2026-08-31: no behavior. The string existed only as a fixture in `cross-cell-events.spec.ts`; no `OutboxWriter.emit` or `dispatch.emit` call anywhere names it. Payroll-to-accounting posting is synchronous and transactional, so no event is warranted.
- [x] If behavior is required, register an idempotent consumer with replay, ordering, retry and dead-letter tests; if no behavior is required, remove the event and its outbox write with zero-consumer proof. VERIFIED 2026-08-31: zero-emission proof - there was no outbox write to remove, only the misleading fixture, which is deleted. The three remaining strings in that fixture are real emitted types. Coverage for the consumers that DO exist was completed at the same time: `accounting-bill-paid-consumer.service.spec.ts` (14 new tests) pins claim-fence no-op on duplicate and on replay, payload-validation FAILED with no dispatch, and error propagation so the relay can mark RETRY or DEAD after `OUTBOX_MAX_RETRIES=8`.
- [x] Rewrite reminder candidate selection as a tenant-scoped SQL query/read model over due date, invoice status and policy offsets instead of nested application loops. VERIFIED 2026-08-31: `sweepOrg` issues one `CROSS JOIN LATERAL unnest(p.offsets)` query per org inside `forEachOrg`; the invoice x policy x offset loop and its per-triple transaction are deleted. `reminders-sweep.spec.ts` bites on `db.execute` call count - the old path never called it.
- [ ] Add the exact tenant/status/due-date/index coverage justified by the measured plan. _Operator-blocked: the justifying plan must be measured as `streamline_app` with the tenant GUC set, and `APP_DATABASE_URL` fails `28P01`, reproduced 2026-08-31. A plan measured as the owner is worthless because the owner holds BYPASSRLS and its plans omit the `org_id = app.current_org_id()` qual that decides whether an index is usable at all. Migration 0777 added `idx_invoices_org_due_status`; confirming it is the right shape needs `EXPLAIN (ANALYZE, BUFFERS)` as the app role._
- [x] Resolve recipients in bounded sets and write durable notification intent instead of awaiting per-invoice notification delivery in the sweep. VERIFIED 2026-08-31: recipients resolve in at most two batched member reads capped at `RECIPIENT_CAP`; every log row and its `OutboxWriter.emit` commit in one transaction, so a crash cannot leave a PENDING log with no event.
- [x] Convert expense email reports to asynchronous, cursor-batched exports stored behind an authorized expiring download. VERIFIED 2026-08-31: `expense-export.service.ts` + `expense-export-worker.service.ts` enqueue a job row and its outbox event in one transaction, batch by cursor, cap the rows and expire the artifact; `download` scopes on `(orgId, requestedByMembershipId, id)` so another tenant's job id is a 404, never a 403. The table carries RLS with a `tenant_isolation` policy, confirmed in the live catalog.
- [x] Define retention/reversal behavior for tax payments, reminder policies and all posted financial records; physical deletion is allowed only where legally and product-wise correct. VERIFIED 2026-08-31: migration 0793 installs BEFORE UPDATE triggers on `journal_entries` and `journal_lines`, matching what 0492 did for invoices and 0565 for billing snapshots. A POSTED entry may only move to VOID and cannot have its number, dates, currency, source or amounts rewritten; a VOID entry is fully locked. Reversal is a new entry pointing back through `reversed_entry_id`, never an overwrite. The service-level `assertEntryNotPosted` guard remains but is no longer the only thing standing between a raw UPDATE and posted history. Legal hold is checked before any purge and returns `"legal-hold"` ahead of the adapter loop.
- [x] Replace broad raw projections with explicit DTO projections and remove compatibility offset branches after all frontend callers use cursors. VERIFIED 2026-08-31: no `user: true` / `creator: true` / `approver: true` relation expansion survives anywhere in accounting or finance - every read is an explicit `select({...})`. On the offset branches: a search for conditional offset-vs-cursor response shapes found none. `OffsetPage` and `CursorPage` are both live schemas chosen per endpoint, not a legacy fallback pair - there is no zero-caller branch to delete, which is why this reads as done rather than removed.
- [x] Decompose reconciliation, assets, invoice detail and accounting UI files by cohesive responsibility. VERIFIED 2026-08-31: measured rather than assumed - zero files in accounting or finance exceed the 500-line hard limit. The largest is `analytics-reports.service.ts` at 484, then `statement-reports.service.ts` 467, `accounting-ledger.service.ts` 465, `finance-posting.service.ts` 464, budgets 461, assets 434, reconciliation 431. Each is one responsibility; a size-driven split here would produce the pass-through wrappers 7 forbids.

Completion gate: zero emitted event types lack a consumer or explicit no-consumer decision; finance sweeps have bounded SQL/read budgets; posted financial history cannot be destructively rewritten; exports cannot exhaust request memory.

### 28.12 Chat — target 10/10

Failure to prevent: mixed actor identity, JSONB reactions, incomplete tenant foreign keys and oversized frontend modules can produce cross-tenant edges, duplicate reactions, unread/order drift and fragile rendering.

- [x] Complete membership-keyed actor migration for channels, participants, messages, reactions, mentions, reads and invites. VERIFIED 2026-08-31: every authority read is membership-keyed. The last holdouts were huddles - `kickParticipant` gated on `startedBy === userId`, `leaveHuddle` transferred host on the same comparison, and all eight participant operations keyed on `user_id`, including the upsert arbiter. All now key on `membership_id`, both gates bite-proven by inverting them, and 0797/0798 make the companions NOT NULL, rebuild `uniq_huddle_participant` on `(huddle_id, membership_id)` and drop the user columns. What remains user-keyed is classified display-only, not authority: `chat_channels.created_by` and `chat_pinned_messages.pinned_by` back live Drizzle relations that render who created or pinned something, and dropping them without a denormalised name would erase a departed member's identity. `chat_reply_reminders.recipient_user_id` stays because notification preferences and email delivery are user-keyed, not membership-keyed.
- [x] Normalize reactions with organization/message/membership/emoji uniqueness and idempotent add/remove semantics. VERIFIED 2026-08-31: `uniq_chat_message_reaction_actor_emoji` on `(org_id, message_id, membership_id, emoji)` is created by migration 0628 and re-asserted by 0652. `chat-reactions.service.ts:113` adds with `onConflictDoNothing`, so a double-add is a driver-level no-op rather than a 23505; `chat-reactions-isolation.spec.ts` asserts calling twice raises nothing. No JSONB reaction state remains.
- [x] Add and validate composite tenant foreign keys for every Chat parent/child relationship. VERIFIED 2026-08-31: `fk_chat_channels_org_created_by_membership` and `fk_chat_messages_org_sender_membership` added by 0778 and validated by 0779; saved messages by 0788; huddles by 0797. Every composite `ON DELETE SET NULL` carries an explicit single-column list and 0778 asserts it against `pg_constraint.confdelsetcols` - a bare one would null `org_id` (NOT NULL) and fail 23502 on every member delete, which is the defect migration 0770 existed to eradicate. 0778 itself had to be repaired first: it was written un-guarded and could never re-run after a partial application left one of its two constraints behind.
- [x] Backfill in resumable batches with duplicate/unmappable-row reporting before cutover. VERIFIED 2026-08-31: `backfill-chat-saved-messages-membership.ts` is cursor-batched, dry-run by default and prints its counts. Measured against the live database before each cutover: chat huddles and huddle participants both hold 0 rows with a null companion and 0 whose companion points at another org; calendar attendees hold 0 orphans, 0 duplicate `(event, membership)` pairs and 0 cross-tenant rows. 0797 backfills first and only then makes the column NOT NULL, and it checks `information_schema` before reading a column that a later migration may already have dropped, so it is correct on a cold database as well as this one.
- [x] Preserve historical departed-member display without granting current channel access. VERIFIED 2026-08-31: `chat_messages.sender_id` keeps its FK to `users.id` while every authority read binds `membership_id`; `chat-bola-proof.spec.ts` proves a null `senderMembershipId` still renders and that a private-channel non-member gets 404 rather than 403.
- [x] Put permission gates inside all Chat query/mutation hooks and protect administrative descendants of `/chat`. VERIFIED 2026-08-31: `chat-hook-gates.test.tsx` (16 tests) asserts each gated hook stays idle and issues no request without its key. Three keys were simply wrong and over-restricted real users - mark-read and the presence heartbeat demanded a write permission - and were corrected against the backend controller by file and line rather than inferred. Administrative descendants of `/chat` are gated in `route-access-extensions.ts`, and `/chat` is not a `subtree: true` universal root, so nothing beneath it inherits universal access.
- [x] Split `message-panel.tsx`, `chat.ts`, `chat-bubble.tsx`, channel information and sidebar modules by data orchestration, message timeline, composer, thread, reactions, presence and administration. _DONE 2026-08-31: `message-panel.tsx` was sitting exactly on the 500-line hard limit; split into `use-message-panel-data.ts` (394, orchestration) and `message-panel-view.tsx` (342, render), with the panel itself a 9-line composition. `hooks/api/chat.ts` was already a barrel. The frontend now has **zero** production files over 500 lines. The last `any` in the chat feature was removed by importing the canonical `SendMessageInput`/`EditMessageInput` from `types/chat` instead of redeclaring them, so the client cannot drift from the backend contract._
- [x] Preserve stable message ordering, optimistic reconciliation, draft ownership, read cursor, unread counters and reconnect behavior. _DONE 2026-08-31: message ordering, optimistic reconciliation, draft ownership, read cursor, unread counters and reconnect are covered by 53 passing chat tests including `chat-behaviours.test.ts`, `chat-realtime-dedup.test.ts` and `chat-decomposition.test.tsx`, all preserved through the panel split. The split itself was verified not to have moved behaviour: the same suites pass before and after._
- [x] Prove channel/thread BOLA, private-channel membership, cross-org denial, reconnect replay and duplicate-event behavior. _DONE 2026-08-31: 28 backend chat suites / 242 tests pass, covering private-channel and thread BOLA (`chat-bola-proof.spec.ts`), cross-org denial (`chat-services-tenant-isolation.spec.ts`, `chat-message-timeline-isolation.spec.ts`), duplicate-event dedupe (`chat-fanout-outbox`) and reconnect replay. The huddle heartbeat cross-tenant test had silently stopped running when the method moved during the file split — it called a method that no longer existed on that class, so that isolation proof was absent until repointed. Frontend adds 5 channel/thread access-suppression tests, bite-proven by neutering the `canRead && channelId > 0` gate._

Completion gate: Chat contains no authoritative JSONB reaction/participant state, every relationship is tenant-enforced, unauthorized hooks do not execute and core production modules meet the file-size contract.

### 28.13 Calendar — target 10/10

Failure to prevent: JSONB/user-keyed attendees and non-transactional reminders produce incorrect invitations, duplicate notifications, broken recurrence exceptions and cross-tenant attendee edges.

- [x] Normalize attendees using organization membership identity with composite organization/event integrity and uniqueness. VERIFIED 2026-08-31: `event_attendees` carries `membership_id NOT NULL`, unique on `(org_id, event_id, membership_id)`, and both composite FKs `fk_event_attendees_org_membership` and `fk_event_attendees_org_event`, all validated. There is no JSONB attendee column and no legacy user-keyed column on any of the four calendar tables - checked against the live catalog by column name, not only by Drizzle symbol. Migration 0790 asserts the shape so a regression fails loudly.
- [x] Backfill attendees and responses with unmappable-row evidence before switching reads/writes. VERIFIED 2026-08-31: measured against the live database - 0 orphaned attendees, 0 duplicate `(event, membership)` pairs, 0 cross-tenant attendee rows. The three constraints above make each of those states unrepresentable rather than merely absent, so there is nothing to backfill and nothing unmappable to report.
- [x] Use a standards-compliant RRULE library and persist recurrence exceptions independently from the series definition. VERIFIED 2026-08-31: `calendar-occurrence.service.ts` expands through `rrule` v2.8.1 (`RRule.fromString` + `between`), covering BYSETPOS/BYMONTHDAY/COUNT/UNTIL/WKST; exceptions live in `calendar_event_exceptions`, unique on `(orgId, eventId, occurrenceStart)`, separate from `calendarEvents.rrule`.
- [x] Make event mutation and invitation/reminder intent one transaction through the outbox. VERIFIED 2026-08-31: create, update and delete each wrap the event write and its `notificationOutbox` write in one `db.transaction`. `calendar-outbox-atomicity.spec.ts` tracks `tx.insert` against `db.insert` separately, so moving either write outside the transaction fails the assertion.
- [x] Give scheduled work a stable occurrence + attendee idempotency key. VERIFIED 2026-08-31: reminder keys are `calendar:reminder:<eventId>:<nominalIso>:<membershipId>` - occurrence AND attendee. This exposed a real defect: `cancelOccurrence` and `upsertOccurrenceException` matched that key with `eq(...)` on the occurrence-only prefix, so the per-attendee suffix never matched and a cancelled or rescheduled occurrence left every attendee's reminder pending. Both now match on the occurrence prefix with `like`, which supersedes each attendee's row without touching other occurrences. `calendar-series-exception-scope.spec.ts` gained three per-attendee cases; 254 calendar tests pass.
- [x] Cancel or supersede stale reminder work when a series, occurrence, attendee or timezone changes. VERIFIED 2026-08-31: `updateEvent` folds `timezone` into `timeChanged` and marks every PENDING `calendar:reminder:<id>:%` row DEAD in the same transaction as the update; bite-proven by the second case in `calendar-outbox-atomicity.spec.ts`.
- [x] Prove timezone and DST behavior for creation, edits, recurrence expansion, free/busy and notifications. _DONE 2026-08-31: `calendar-dst-edge.spec.ts` and `calendar-timezone.spec.ts` cover both 2024 America/New_York transitions in each direction with explicit bite proofs, prove fall-back produces no ambiguous-hour duplicate, and check a non-DST zone (Asia/Kolkata +05:30) and UTC as controls. Creation is covered by zero/negative-duration rejection in `createEventSchema`, free/busy by `calendar-conflict.service.spec.ts` (an event spanning the DST gap is still a conflict), and notifications by the DST reminder-window cases in `calendar-reminder-sweep-recurring.spec.ts`. 26 suites / 278 tests pass._
- [x] Keep `/calendar` universal while permission-filtering module event sources inside backend queries. VERIFIED 2026-08-31: `calendar.controller.ts` carries `@UseGuards(JwtAuthGuard)` at class level with `@Universal()` on the personal handlers and `PermissionGuard` only on export and attendee-list; `calendar-source.registry.ts` calls `moduleAvailabilityFor(orgId, userId, module)` per user before loading each source.
- [x] Split remaining large event detail/form/view modules by recurrence, attendees, form state and presentation. VERIFIED 2026-08-31: `event-create-dialog.tsx` went from 502 lines to 109 along exactly those seams - `use-event-create-dialog.ts` owns form state, `use-event-series-scope.ts` owns the recurrence-scope decision, `event-create-validators.ts` holds the pure validators and payload assembly, and the component is now presentation. The public export is unchanged, so both importers needed no edit. 20 new tests, bite-proven. Zero frontend files exceed 500 lines and the over-300 ratchet passes without its baseline being raised.

Completion gate: attendee authority is membership-keyed and tenant-enforced; recurrence/DST examples pass; event writes cannot commit without reminder intent; retries cannot double-notify.

### 28.14 Notifications — target 10/10

Failure to prevent: protected administration inherits universal route access, oversized pages/hooks drift, and event-stream reconnect or organization switching can duplicate or leak updates.

- [x] Exclude providers, templates, event catalog, policies, broadcasts and analytics from universal notification route matching. VERIFIED 2026-08-31: `/notifications` declares only `/notifications/preferences` as a universal descendant and carries no `subtree: true`; the five administration prefixes are gated in the extension registry and asserted non-universal by `route-access-coverage.test.ts`.
- [x] Apply exact route and hook permissions for notification administration while retaining universal personal inbox/read-state access. VERIFIED 2026-08-31: the five admin queries gate on `notifications:{providers,events,policy,templates,broadcasts}:view`, matching the controller keys verbatim; the personal inbox, preferences and broadcast inbox/dismiss handlers stay `@Universal()`. `notification-admin-gate.test.ts` asserts each admin query stays idle and issues no request without its key.
- [x] Decompose templates, providers, events and broadcasts pages plus `hooks/api/notifications.ts` by catalog, preferences, delivery, provider, broadcast and personal inbox responsibility. _DONE 2026-08-31: preferences extracted from `notifications-inbox.ts` (406 -> 339) into `notifications-preferences.ts`; roughly 200 lines of copy-pasted dead imports removed from `broadcast-config.ts`, `template-row.tsx` and `broadcast-row.tsx`. A real gap surfaced while splitting: the templates and broadcasts pages rendered create/edit/delete controls with no permission check; both now gate on keys verified verbatim against `backend/src/modules/rbac/permissions/notifications.ts`. Personal inbox stays session-gated only._
- [x] Implement one event-stream adapter with abort, jittered reconnect, retry ceiling, heartbeat, token expiry, logout cleanup and organization-switch cleanup. VERIFIED 2026-08-31: `notification-event-stream.ts` + `use-notification-events.ts` carry all seven - one `AbortController` per effect run, `min(30s, 2^n) + jitter`, `MAX_RETRIES = 5`, a 15s server heartbeat, a fresh 120s single-use token per reconnect, abort when unauthenticated, and `orgId` in the effect deps. `org-switch-stream-teardown.test.ts` asserts the first signal aborts when the org changes.
- [x] Ensure stream credentials are short-lived, purpose-limited and redacted from telemetry. VERIFIED 2026-08-31: the `?token=` query-string path is removed from `GET /notifications/events`, so the credential never reaches an access log or a Referer header; it arrives only as a bearer header. Tokens are `crypto.randomUUID()`, single-use (deleted on read) and expire in 120s.
- [x] Preserve database-side notification timestamp handling and composite FK correctness. VERIFIED 2026-08-31: same fact as §28.2 baseline tick. The microsecond-truncation bug that 23503-rolled every delivery row is fixed; confirmed by `notification-dispatch-after-commit.spec.ts` + `notification-outbox-relay.spec.ts` (266/266 pass, RECONCILIATION.md §S06).
- [x] Prove at-least-once delivery, idempotent materialization, read/unread counters, suppression, digest, retry and dead-letter behavior. _DONE 2026-08-31: all seven behaviours implemented and tested; the only gap was an end-to-end idempotent-materialization replay, now `notification-idempotent-materialization.spec.ts` (bite-proven: neutering the dedupe double makes the duplicate row visible). The three known bug classes were re-checked against current source - the delivery FK carries the DB-stored `created_at` via subquery so no JS microsecond truncation is possible; `notification_outbox.state` is a 4-state machine with `leaseExpiresAt`, so a crashed worker's IN_FLIGHT row is reclaimed rather than stranded; and both post-commit paths open `runInNewTenantTransaction`. 28 tests pass. Durable ALERTING remains operator-blocked (line 842)._
- [ ] Configure durable alerting for queue age, pending intents, dead letters, provider failure and consumer absence. _Operator-blocked D04: requires `ALERT_WEBHOOK_URL`; runbook [RB-06](runbooks/RB-06-live-alert-delivery.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D04._

Completion gate: personal notifications remain universally reachable, administration is exactly gated, reconnect cannot cross organizations or duplicate state, and every delivery failure is observable and replayable.

### 28.15 Workflows — target 10/10

Failure to prevent: authenticated users can render workflow administration and fire queries because the layout and hooks do not structurally enforce workflow permissions.

- [x] Add shared server route enforcement to the Workflows layout. VERIFIED 2026-08-31: `app/(authenticated)/workflows/layout.tsx:5` awaits `enforceRouteAccess("/workflows")`, which resolves each sub-route through the navigation registry and redirects to `/access-denied?required=route:unregistered` for anything unmatched.
- [x] Map overview, templates, executions, approvals, scheduler, analytics, variables, secrets, access and builder routes to exact backend permissions. VERIFIED 2026-08-31: all ten nav keys match `workflows.controller.ts` `@RequirePermission` verbatim. `workflows:access:view` IS in the backend catalog - it is generated for all 14 delegable modules by `permissions/module-access.ts` rather than written in `permissions/workflows.ts`; a lane report claiming it absent was checked against the aggregated catalog (693 keys) and disproved.
- [x] Gate each workflow read and mutation hook internally; secrets, variables, schedules, approvals and execution actions use their own keys. VERIFIED 2026-08-31: every hook across definitions, executions, approvals, schedules, secrets, variables, analytics and templates carries its own resource-specific key; none uses a broad module key as a catch-all. `workflows-gates.test.tsx` (19 tests) asserts idle-and-no-request for the absent-key case on eight of them.
- [x] Ensure unknown Workflow routes fail closed rather than inheriting a broad module permission. VERIFIED 2026-08-31: an unmatched pathname with no navigation entry and no extension entry redirects to `/access-denied?required=route:unregistered`; `/workflows` is not a `subtree: true` universal root, so nothing beneath it inherits universal access.
- [x] Remove caller-provided authorization booleans where the hook can resolve permission itself. VERIFIED 2026-08-31: no workflow hook accepts an authorization boolean; every gate resolves internally through `useCan`, so there is no options object whose spread could clobber `enabled`.
- [x] Split workflow hooks and builder modules by definitions, executions, approvals, schedules, variables/secrets and builder state. VERIFIED 2026-08-31: already split - nine hook files (largest 137 lines) and five builder files (largest 158) each map to one of the named seams. The controller at 340 and execution service at 320 are single-responsibility; splitting them would fragment without reducing complexity.
- [x] Prove module disabled, permission denied, own/team/all data scope, cross-tenant resource ID and secret redaction behavior. VERIFIED 2026-08-31: four were already covered (module-disabled 402s, eight permission-denied 403s all probed with `isOrgOwner` false, cross-tenant ids returning 404 not 403, and the client-payload redaction). Secret redaction had only that one sink tested; `workflows-secret-sinks.spec.ts` adds the execution record, error message, cache and logger sinks. The module-key vocabulary trap was checked - both sides use the lowercase catalog key.

Completion gate: no Workflow route renders and no Workflow request fires without its declared permission; sensitive values never enter logs, caches or client payloads without authorization.

### 28.16 Platform-wide completion work

#### API and validation

- [x] Migrate legacy parameter-level validation to the shared metadata-driven validation seam so every operation with body/query/params publishes its contract. _DONE 2026-08-31: there is nothing left to migrate. A scan of all 530 module controllers found **zero** parameter-level `ZodValidationPipe` uses - `readPipeSchemas` in the seam is a compatibility path with no remaining callers. 433 of 434 mutation controllers that accept a body declare `@Validate(...)`; the one exception is a multipart upload, where JSON body validation does not apply. Multipart endpoints now publish a truthful `multipart/form-data` contract via the new `@MultipartAction` rather than being forced into the bodyless bucket._
- [x] Raise request-schema coverage from 1,348/1,481 (91%) to all applicable operations; explicitly classify the 133 remaining mutating operations with no declared body schema. VERIFIED 2026-08-31: all 133 classified — 87 genuinely bodyless (marked `@BodylessAction()`), 6 multipart uploads left unmarked and named, 1 genuinely missing schema written (`saveAsTemplateSchema` on `POST /sign/envelopes/:id/save-as-template`), 45 in modules another lane owns. `check:openapi-coverage` reports 1,349/1,394 (97%); the denominator moved because operations that never had a body stopped being counted as if they should. Independently audited all 357 `@BodylessAction()` marks for a body the gate cannot see: exactly 6 carry one, all pre-existing and legitimate (5 raw-body signature-verified webhooks, 1 upload whose metadata travels in the query). None of the 87 new marks is false.
- [x] Standardize cursor, filter, sort, error envelope, idempotency and deprecation metadata in generated OpenAPI. VERIFIED 2026-08-31: all 3,566 operations reference the shared error components, 226 carry the `IdempotencyKeyHeader` parameter and an `x-idempotency-command`, 77 carry cursor parameters, and `@Deprecated` is now read in `scanOperationContracts` and emitted as `deprecated: true`. Standardising it exposed that the metadata was being attached to the wrong operations: the contract map is keyed by Nest's `${ClassName}_${methodName}` operationId, and 13 controller class names were used by more than one controller, so one silently overwrote the other and 28 operations published another route's contract. `POST /accounting/approvals/{requestId}/approve` advertised a required `periodId` path parameter it does not have and an idempotency command belonging to timesheets. 24 controllers renamed; `check:operation-ids` now fails on any duplicate and is wired into CI. The coverage gate read 100% throughout - every operation HAD metadata, it was just someone else's.
- [x] Remove legacy offset response branches only after every repository caller and documented external consumer migrates. VERIFIED 2026-08-31: there is nothing to remove. A search for a conditional offset-vs-cursor response shape across every controller and service found no branch selected by a flag, a caller type or a header. `OffsetPage` and `CursorPage` in `contract-components.ts` are both live schemas chosen per endpoint, not a legacy pair kept for compatibility, so no zero-caller branch exists to retire.
- [x] Keep frontend and backend contracts byte-synchronized in CI. VERIFIED 2026-08-31: `check:contract-vendor` compares the SHA-256 of `frontend/contracts/openapi.json` against `backend/openapi.json` and is now wired into the frontend workflow together with its self-test. It was passing locally and enforcing nothing, which is why the operationId collision above could ship.

#### Query cost and caching

- [ ] Seed or obtain production-shaped data for the blocked read-budget criterion. _Operator-blocked D15: requires a seed script or operator-approved sanitized snapshot; analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D15._
- [ ] Measure plans as the application role with tenant context, warm/cold cache mix and declared row distributions. _Operator-blocked: `APP_DATABASE_URL` fails `28P01 password authentication failed for user "streamline_app"`, reproduced 2026-08-31. Every plan measured as the owner is worthless here because the owner holds BYPASSRLS and its plans omit the `org_id = app.current_org_id()` qual that decides index usability. Also blocks `pnpm db:check-build-reads`, `pnpm verify:membership-revocation` and `src/degradation/search-index.spec.ts`. Unblock: reset the `streamline_app` password in the Neon console — `ALTER ROLE ... PASSWORD` does not stick on Neon — then re-run those three plus an `EXPLAIN (ANALYZE, BUFFERS)` of the reminder sweep against `idx_invoices_org_due_status` (migration 0777)._
- [x] Eliminate unbounded selects, fetch-then-filter, per-row lookups and leading-wildcard scans on target paths. _DONE 2026-08-31: the gate that was supposed to prove this was itself the problem — `check:unbounded-reads` scanned 16 of 74 module folders and never ran its unbounded-select check on real files at all, so "no unbounded reads found" was never a statement about the codebase. Rewritten: territory is discovered from `src/modules` at run time, both checks run, and a third check flags `.offset()` with no `ORDER BY`. Detector accuracy was corrected twice more (aggregate projections excluded; `.limit()` searched to the end of the statement rather than 12 lines), each with self-tests pinning both directions. Real reductions: **offset 170 → 128, unordered pagination 24 → 7**, and leading-wildcard scans replaced by SECURITY DEFINER id-search seams in directory, workers, HR employees and onboarding. Unprojected relations to global `users` are at **0**._
- [x] Keep hard page cap 100 and stable tenant-scoped cursor indexes. _DONE 2026-08-31: the cap is structural, not a convention — `pageSizeField(defaultSize, maxSize)` computes `ceiling = Math.min(maxSize, PAGE_SIZE_CAP)` with `PAGE_SIZE_CAP = 100` and clamps through a `.transform()`, so even `pageSizeField(200)` yields 100 and no call site can raise it. Pinned by `list-query.schema.spec.ts`. Migration 0806 adds **37 keyset sort indexes**, every one leading with the tenant column because RLS injects `org_id = app.current_org_id()` and refuses an index that cannot serve it; the migration asserts all 37 exist before it commits._
- [x] Inventory cache keys and prove organization, membership/permission version, locale/timezone and filter dimensions wherever they affect the result. _DONE 2026-08-31: `architecture-refactor/cache-key-inventory.md` records every key family against the dimensions that affect its result. `CACHE_KEYS` was re-verified as tenant-safe by construction (a previous migration attempt was correctly reverted; left alone). One real correctness bug found and fixed: `dashboard-stats.service.ts` keyed the attendance cache on the **UTC** date, so an org at UTC+14 crossed its local midnight 14 hours before the key rolled; the dimension is now the org timezone plus its local date, pinned by `dashboard-stats-attendance-tz.spec.ts`._
- [x] Prove mutation, membership, role, entitlement, organization-switch and placement invalidation across application instances. _DONE 2026-08-31: all six triggers verified across instances - mutation, membership, role, entitlement, organization switch and placement. `setModuleEnabled` busts every ACTIVE member's session, not just the actor's. Session revocation relies on the Redis tombstone, not a DB flag. `check:cache-invalidation` went from 75 reported findings to 0: its matrix parser read only `cache-invalidation-matrix.ts` and missed four imported sub-files, so every one of the 75 was a parser artefact rather than a real gap._
- [x] Add stampede protection to expensive shared read models and document stale-data tolerance. _DONE 2026-08-31: already implemented in `CacheService` and verified rather than rebuilt - in-process single-flight via an `inFlight` map, a distributed Redis `SET NX` fill lease with compare-and-delete release and a 2s waiter budget before falling through, and TTL jitter against coordinated expiry. Every expensive shared read model routes through `cachedForOrg`/`cachedVersionedForOrg`, so all are covered. Stale-data tolerances are documented per read model in the inventory._

#### Schema and migrations

- [x] Create a risk register for active `serial()`/`bigserial()` keys: table growth, write rate, maximum lifetime, FK fanout, partitioning and migration cost. VERIFIED 2026-08-31: `architecture-refactor/session-tickets/reports/L22-migrations-report.md` §"Serial/bigserial risk register" (2026-08-30): 588 `int4` serial columns, 0 `bigserial`, all `.id` PKs. Eight HIGH-RISK tables identified (audit_logs, notification_events, ai_usage_logs, ai_chat_messages, support_ticket_messages, journal_lines, inv_stock_transactions, payroll_line_items) with MIGRATE decisions tied to measured write rate. Remaining bounded catalog tables documented with explicit KEEP decisions and justifications.
- [x] Migrate only keys that fail the target-scale lifetime or cross-cell requirement; record KEEP decisions for bounded catalogs. VERIFIED 2026-08-31: Same L22 report §"KEEP" table: no immediate migration triggered because all HIGH-RISK tables remain below the 500 M-row threshold; KEEP decisions recorded for roles, salary_components, leave_types, leave_policies, hr_job_levels, hr_job_roles, shift_templates and all inv_* config tables with explicit per-table justifications. Trigger condition documented: "when any high-risk table approaches 500 M rows, begin int4→bigint migration."
- [x] Resolve the contradictory 372/372, 373/373, 44-difference and zero-difference evidence with one timestamped authoritative cold/upgrade comparison. VERIFIED 2026-08-31: `architecture-refactor/session-tickets/reports/L22-migrations-report.md` §"Cold-vs-upgrade comparison" (2026-08-30): 384 journal entries processed on both paths; orphan rows above journal max = 0; `check:migration-chain PASS`. The 0591 cold-path RLS gap (122 accounting tables) is documented and tracked as OPEN in the same report. All other dimensions agree between cold and upgrade.
- [x] Require zero unjournalled/orphan/timestamp-regressed migrations, zero chain gaps and zero unexplained schema differences. VERIFIED 2026-08-31: reconciled on the live database, snapshot first - `drizzle.__drizzle_migrations` went 494 rows to 465, leaving zero orphans and zero duplicate records, with the watermark unchanged at 1798000089000 and the pending set verified identical before and after. Three journal entries carried a `when` at or below their predecessor's and were re-stamped rather than reordered, so cold-bootstrap order is untouched. `check:migration-chain` and `check:migration-discipline` both pass. The new `check:migration-ledger` gate makes this durable and is bite-proven against the live database. It joins on `created_at`, NOT on hash, and a self-test pins that choice: editing an applied migration changes its hash while the row stays valid, and a hash-keyed pass misread three live rows as orphans here (0582 notifications partitioning, 0680 kb author membership, 0714 kb hybrid search) - all three confirmed applied by inspecting the objects they create, so deleting them would have destroyed the only record that they ran.
- [x] Preserve additive, lock-bounded, resumable migration strategy with validated constraints and rollback/runbook evidence. _DONE 2026-08-31: additive/backfill/validate/cutover/drop is enforced by gates rather than convention — `check:migration-discipline` requires `lock_timeout` on every migration, `NOT VALID` FK additions validated separately, the `CHECK NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop-check sequence, no `--> statement-breakpoint` inside a `DO $$` block and no `CONCURRENTLY`; `check:migration-chain` pins numeric order to journal order; `check:migration-ledger` joins on `created_at`, never on hash. Backfills are re-runnable by construction (guarded on `information_schema` and filtered on `IS NULL`). Rollback evidence is now written: [RB-09](runbooks/RB-09-migration-rollback.md) covers what is reversible at each step, the application-only rollback before a drop, the restore path after one, and the rule that a drop never ships in the same release as its cutover. Ledger: **492 applied rows against 492 journal entries, 0 pending, 0 orphan, 0 duplicate**. A live rollback DRILL and the cold-bootstrap replay stay OPEN in RB-09 §5._

#### File structure and reuse

- [x] Review every in-scope production file over 500 lines; split mixed responsibilities and document cohesive exceptions. VERIFIED 2026-08-31: measured, and the PRD's own figure was stale by an order of magnitude - not 88 backend and 22 frontend but 7 backend and 0 frontend. Two of the seven are CLI scripts under `src/scripts/`, which are not application modules; the other five are registered as cohesive exceptions in `architecture-refactor/final-refactor/issues/file-size-exceptions.md` with path, line count, interface, reason and owner. The largest overage among real modules is 10 lines.
- [x] Target 300 lines without fragmenting a deep module into pass-through files. _DONE 2026-08-31: the 300-line figure is a target, not the 500-line hard limit, and it is enforced as a ratchet: `check:over-300` reports 394 of 3,342 production files, baseline 394, and fails at 395. The baseline moved from 392 with cause recorded in `file-size-exceptions.md`: two of the three crossings are net-new correctness work (explicit membership->user projections replacing a raw `senderId` read; four `ORDER BY` clauses fixing exports that paginated with no row-order guarantee) and the third is the multipart request-body branch. No pass-through fragments were created - every split this wave carried real behaviour, and `madge --circular` stays at zero in both repos._
- [ ] Remove dead files/exports only with module-graph proof and build validation. _Module-graph proof obtained 2026-08-31: `pnpm exec knip --no-progress` reports **zero unused files** in the frontend, with 64 unused exports and 49 unused exported types inside live files. Removals made this wave were validated by targeted jest (about 200 lines of copy-pasted dead imports in the notifications components). The remaining 113 unused exports are deliberately NOT removed: this row requires build validation, and `next build` / `tsc --noEmit` cannot be run in this environment, so removal could not be verified. knip is FRONTEND-ONLY here - the backend has neither knip nor `check:dead-code`, so no backend dead-export claim is made._
- [x] Keep controllers thin, domain implementation in backend modules, Query orchestration in hooks and rendering in feature modules. VERIFIED 2026-08-31: enforced by deletion rather than assertion. Eight backend services whose every method was a bare forward are gone and their controllers inject the real sub-services. On the frontend the same split was applied to the two largest offenders: `event-create-dialog` keeps only rendering with state in `use-event-create-dialog.ts`, and `channel-info-panel` (445 to 315) delegates presence and member administration to `channel-members-section.tsx`. `madge --circular` reports zero cycles in both repos.
- [x] Preserve one-way dependencies and zero circular imports. VERIFIED 2026-08-31: `RECONCILIATION.md` gate table (committed 2026-08-30) records `check:cycles | PASS | 0 circular in both repos`. Same gate as §28.2 import-graph check.

#### Security, compliance and operations

- [x] Complete operator-access design and audit evidence. VERIFIED 2026-08-31: `backend/migrations/0747_operator_access_two_person_approval.sql:18` adds `CHECK (approver_id IS NULL OR approver_id != granted_by)` to `operator_access_grants`; `backend/src/modules/platform/platform-operator-access.service.ts:101` asserts `eq(operatorAccessGrants.status, "active")` in `assertGrant` before any privileged access proceeds. SCORECARD row 30 confirms migration applied and constraint convalidated.
- [x] Configure and prove public-token rate limits, upload limits, SSRF controls, secret/PII redaction and security headers. _DONE 2026-08-31 for the code half; two operator items named below. All five controls are implemented and spec-proven rather than asserted: public-token rate limits (an unknown tier now DENIES rather than failing open, asserted through `effectiveRateLimit(tier)` so a multiplier cannot hide the 429; unauthenticated callers key by IP — 15 tests); upload limits (10MB enforced at both the multipart layer and in-handler, a 9-type MIME allowlist, magic-byte validation that rejects a PNG claiming to be a JPEG before any scan, AV scan failing closed at 503 — 28 tests; CORS is registered BEFORE the body parser, so a 413 carries CORS headers instead of surfacing as "Network error"); SSRF (the shared `ssrf-guard.ts` reused rather than duplicated, blocking the packed IPv4-mapped forms `::ffff:7f00:1`, `::ffff:c0a8:0101` and `::ffff:a9fe:a9fe`, DNS rebinding via checking ALL resolved addresses, and redirect-to-internal via `redirect: "error"` — 59 tests); secret/PII redaction (`check:log-secrets` clean across 2,863 files, 10 self-test assertions); security headers (CSP, HSTS 1y+includeSubDomains, X-Frame-Options, nosniff, Referrer-Policy, COOP/CORP and a custom Permissions-Policy via helmet, verified by running the middleware). CSRF is correctly absent — auth is Bearer-token only with no cookie session, so `SameSite` and CSRF tokens do not apply; recorded as a KEEP decision. Path-prefix classification normalises before matching, so `/auth/../probe` cannot borrow reserved capacity. OPEN and operator-owned: HSTS `preload` requires submission to the external preload list, and a CSP `report-uri` requires a collector endpoint._
- [ ] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and a live production log stream. _Operator-blocked D05: runbook [RB-06](runbooks/RB-06-live-alert-delivery.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D05._
- [ ] Send test alerts through every on-call destination and record acknowledgement. _Operator-blocked D06: runbook [RB-06](runbooks/RB-06-live-alert-delivery.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D06._
- [ ] Complete export, retention, legal-hold and erasure drills with disposable data and auditable cleanup. _Operator-blocked D07, but the code prerequisite is now CLOSED: the subject-access export worker, the object-storage purge and the legal-hold gate all exist and are tested (`gdpr-export.spec.ts`, `gdpr-storage-purge.spec.ts`, `financial-retention.spec.ts`), migration 0795 creates `gdpr_export_jobs`, and the erasure audit row is proven to carry a hashed subject reference and no PII. What remains is running the drill itself against disposable data with auditable cleanup. Runbook stub [RB-08](session-tickets/reports/P8-production-evidence.md#rb-08--compliance-drill-end-to-end)._

#### Cell, recovery and 20M evidence

- [ ] Provision independently isolated cell compute, cache, object storage, search, realtime, worker and monitoring resources; namespace-only separation does not pass. _Operator-blocked D08: runbook [RB-01](runbooks/RB-01-cell-isolation.md); detailed provisioning steps in [CELL-RUNBOOK.md](c28-cell-based-platform-at-20m/CELL-RUNBOOK.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D08._
- [ ] Provision PITR/backup frequency that meets the five-minute operational RPO. _Operator-blocked D09: logical backup RTO met (1175s); RPO is 6h not 5min; REGIONAL_DISASTER unverified; runbook [RB-02](runbooks/RB-02-pitr-backup.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D09._
- [ ] Provision a physical read replica and prove replica-safe versus primary-required workload behavior under real lag. _Operator-blocked D10: `DB_REPLICA_URL` absent; lag-simulation tests skipped; routing code correct; runbook [RB-03](runbooks/RB-03-read-replica.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D10._
- [ ] Re-run all 14 workload objectives with production-shaped data and declared geography/device/network/cache conditions. _Operator-blocked D11: load driver self-tests 14/14 PASS; current run is public-internet, not colocated; production-shaped data (D15) is a prerequisite; runbook [RB-05](runbooks/RB-05-production-load.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D11._
- [ ] Meet every latency objective with at least 40% sustained-resource headroom and survive the burst target. _Operator-blocked D12: headroom cannot be measured from public-internet runner; requires colocated deployment after D08 and D11 are complete; runbook [RB-05](runbooks/RB-05-production-load.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D12._
- [ ] Measure and approve per-cell cost, cost per active organization/member/message/job and saturation forecast. _Operator-blocked D13: vendor rate env vars absent; 8 dimensionless cost-history entries exist; requires invoice-derived rates and cost-owner approval; runbook [RB-07](runbooks/RB-07-per-cell-cost.md); analysis: [P8](session-tickets/reports/P8-production-evidence.md) §D13._
- [ ] Record operator-owned blockers as blockers; never convert missing infrastructure into a passing code-only claim. _D14: satisfied by [P8-production-evidence.md](session-tickets/reports/P8-production-evidence.md) which enumerates all 15 D rows with explicit evidence boundaries. No D row is ticked until its runbook evidence file is committed._

### 28.17 Dependency-ordered implementation plan

Execute packages in this order. Packages in the same wave may run in parallel only when their file ownership does not overlap.

1. **Wave A — Authorization foundation:** universal-route correction, Workflows/Payroll/Chat route and hook enforcement, regression matrix.
2. **Wave B — Organization actor expansion:** communication actors, Calendar attendees, Chat reactions, composite tenant relationships and backfills.
3. **Wave C — Domain correctness:** Calendar outbox, accounting event decision/consumer, expense export, finance reminder query, notification stream.
4. **Wave D — Deepening and frontend performance:** Organization, module-access, Payroll, Billing, Build, Chat, Calendar, Notifications and Workflow decomposition.
5. **Wave E — Contract and query completion:** validation metadata migration, OpenAPI completeness, offset retirement, read-budget dataset, query/index/cache proof.
6. **Wave F — Contraction and cleanup:** legacy actor/API/schema removal, risk-approved key migrations, dead-code removal and documented file-size exceptions.
7. **Wave G — Operational proof:** authoritative cold/upgrade comparison, independent cells, PITR, replica, alerts, load/headroom and cost approval.

Wave B must complete before actor contraction. Wave C async consumers must complete before queue-age and dead-letter evidence can pass. Wave E caller migration must complete before legacy API removal. Wave G is the only wave allowed to claim 20M-ready.

### 28.18 Final verification matrix

The final implementation report must attach command output or durable evidence for every applicable row.

| Gate | Required result |
|---|---|
| Working tree | Only intended changes; no unrelated user work modified |
| TypeScript | Backend and frontend zero errors |
| Imports | Backend and frontend zero cycles |
| Backend routes | Zero undeclared handlers |
| Permissions | Zero unknown/drifted permission keys |
| Route access | Every authenticated frontend route resolves; protected descendants are never universal |
| Hook access | Sensitive queries/mutations do not execute without exact permission |
| Tenant indexes | Every tenant table covered; changed queries meet measured budgets |
| Scope/BOLA | Every scoped path applies its predicate; cross-tenant resource IDs return 404 |
| Pagination | Every unbounded domain list/export removed; cursor contract stable and capped |
| OpenAPI | Current, frontend-synchronized and complete for every applicable operation |
| Async | Every emitted event has a consumer or explicit removal decision; replay/dead-letter proof passes |
| Cache | Tenant/permission dimensions and mutation invalidation proven across instances |
| Migrations | Cold and upgrade reach identical head with zero unexplained differences |
| Recovery | RPO/RTO, replica lag and degraded dependency behavior meet declared objectives |
| Load | All 14 objectives pass with at least 40% sustained headroom |
| Cost | Per-cell unit cost and saturation forecast measured and approved |
| Structure | Every >500-line production file split or carries an approved cohesive-exception record |
| Dead code | Zero proved dead in-scope files/exports; removals pass graph and build proof |
| UI/UX | Loading/error/empty/denied, responsive 375/768/1280 and accessibility checks pass |
| Security | Token, upload, SSRF, redaction, operator and alert-delivery evidence passes |

Tests, lint, builds, live migrations, load tests and destructive cleanup run only after the opening checkpoint grants the required authorization. A skipped validation remains OPEN and prevents 10/10.

### 28.19 Final score gate

The following modules must each reach 10/10 architecture and 10/10 implementation with evidence: Organization, Org/module RBAC, Home, Settings, HRMS, Payroll, Build/PM, Billing/Payments, Accounting/Finance, Chat, Calendar, Notifications and Workflows.

No average can hide a weak module. No P0 or P1 may remain. A P2 may remain only when it is a documented KEEP decision with no concrete target-scale, security, correctness, compliance, cost or maintenance failure. Operator-blocked infrastructure keeps production readiness below 10/10 until the real resource and evidence exist.

### 28.20 Completeness ledger — no implicit “done” claims

Completion of this PRD means every applicable row in this ledger has a linked source change, automated proof or real operational evidence. A checkbox in an implementation ticket is not proof by itself. This ledger is intentionally repetitive: it prevents a domain implementation from being called complete after only its happy-path screen or controller works.

#### A. Every in-scope domain must be checked against the same complete slice

For **Organization, RBAC, Home, Settings, HRMS, Payroll, Build, Billing/Payments, Accounting/Finance, Chat, Calendar, Notifications, Inbox/Mail, Knowledge Base/Wiki/Chatbot and Workflows**, record a KEEP, REPAIR, REPLACE, CONSOLIDATE or REMOVE verdict for each applicable item below:

- [ ] **Data:** canonical owner, normalized relationships, tenant-leading indexes, composite tenant foreign keys, unique constraints, audit fields, soft-delete/restore/retention semantics, immutable history where required, migration/backfill/cutover/rollback plan and explicit projections. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Authorization:** organization, module, record and DataScope policy; server route guard; controller/service/query enforcement; hook/query suppression; action/button visibility; BOLA and cross-tenant tests; membership removal, role change and org-switch invalidation. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **CRUD and lifecycle:** create/read/list/update/archive-or-delete/restore behavior; duplicate/retry/idempotency behavior; concurrency/version conflict behavior; actor attribution; complete error/empty/loading/denied states; import/export and bulk action policy. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Lists and search:** stable cursor, deterministic tenant-scoped sort, allowed filters, hard cap, explicit field projection, index/plan evidence, no fetch-then-filter, no N+1, no offset compatibility path left without an approved sunset, and authorized search/vector filtering before retrieval. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Cache and realtime:** tenant/actor/permission/locale/timezone/filter-safe keys, TTL/stale policy, mutation and access-change invalidation, stampede behavior, event ordering/retry/deduplication/reconnect and offline/late-event behavior where realtime applies. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Interfaces and structure:** controller/DTO/OpenAPI contract, idempotency key/error envelope/deprecation policy, thin controller, one-way imports, deep module interface, file-size review, reusable primitive only where duplicate load-bearing behavior exists, dead-code and obsolete API/component/schema removal proof. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **UX and accessibility:** responsive 375/768/1280 behavior, keyboard-only navigation, focus management, semantic labels/roles, color contrast, reduced-motion behavior, localization/timezone/currency formatting, destructive-action confirmation and permission-aware navigation. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Operations:** structured/redacted audit logs, metrics/traces, SLO and alert ownership, queue/dead-letter/replay behavior, backup/restore/retention obligations, rate/cost/resource budget and runbook evidence. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._

#### B. Cross-cutting small-but-critical checks

- [ ] **Authentication lifecycle:** validate session issuance, refresh/rotation, logout/session revocation, organization switch, disabled/suspended user, invitation acceptance/expiry/revocation, password/MFA/SSO recovery paths actually supported by the product, and service-principal expiry/scope/audit. Do not invent unsupported auth features; document a KEEP/NOT-IN-SCOPE decision. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Authorization mutation matrix:** for every owner/admin/member/module-owner/module-admin/module-member/custom-role transition, prove allowed and denied operations, cannot escalate self or peers, cannot transfer organization ownership except through the canonical owner-only flow, and cannot retain a cached grant after revocation. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Data safety:** validate upload MIME/content/size, malware/quarantine workflow where uploads are public or executable, signed-download expiry and authorization, SSRF egress allowlist, HTML/Markdown sanitization, CSP/security headers/CSRF policy, SQL parameterization, secret rotation and PII redaction in logs/traces/errors. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Privacy/compliance:** data inventory and lawful-purpose/retention owner for every personal-data class; export/erasure/legal-hold conflict handling; consent/preferences where applicable; regional residency/transfers and subprocessors; immutable audit-access controls; operator break-glass approval, time limit and review trail. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Database and connection safety:** connection pool caps/timeouts per workload, transaction timeout/lock timeout/retry policy, primary-vs-replica routing, replica-lag fallback, statement telemetry, slow-query budget, partition/archival decision for high-growth tables, and schema ownership/deployment ordering. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Async and external effects:** transactional outbox for every durable side effect; consumer idempotency key; retry/backoff/jitter/lease; poison-message/dead-letter replay; provider timeout/circuit-breaker behavior; webhook signature/replay/order handling; job cancellation and exactly what “at-least-once” means to the user. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Email, notifications and alerts:** recipient authorization at send time, preference/suppression/digest rules, template versioning/localization, bounce/complaint handling, no secret/PII leakage in delivery logs, in-app/email/realtime deduplication, and human acknowledgement for critical production alerts. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Public web/SEO:** only intentionally public pages are crawlable; authenticated/product pages use correct robots/noindex behavior; metadata/canonical URLs/sitemaps/structured data are accurate; no tenant content reaches public render/cache; Core Web Vitals budgets are measured on representative devices/networks. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Release engineering:** reproducible build artifact, dependency/license/vulnerability review, environment schema validation, feature flags with removal dates, backward/forward migration compatibility, canary/rollback plan, release notes, change owner and post-release verification. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._
- [ ] **Test quality:** unit, integration and controller/e2e tests prove allow/deny, tenant isolation, idempotency, failure/retry and regression cases; fixtures invoke transactions correctly; tests do not pass only because a mock omits an assertion; mutation/high-risk-path coverage is measured, not assumed. _Verdicts recorded 2026-08-31 in [completeness-ledger-domains.md](completeness-ledger-domains.md) (15 domains x 8 slices: 81 KEEP, 8 REPAIR, 31 OPEN) and [completeness-ledger-crosscutting.md](completeness-ledger-crosscutting.md) (49 PASS, 28 PARTIAL, 18 OPEN, 5 NOT-IN-SCOPE), every verdict citing a gate number, a file path or a named spec. The row stays OPEN because §28.20 requires each applicable item to carry a linked source change, automated proof or real operational evidence — a recorded OPEN verdict is the honest state, not a pass. Five headline findings were withdrawn on verification (see the ledger's verification-pass section); four came from memory notes describing defects that had already been fixed._

#### C. Final independent review procedure

Before assigning **any** 10/10 rating, a reviewer who did not implement the last work package must:

1. Re-run the current-source delta audit in section 27 and classify every previous item as VERIFIED DONE, REGRESSED, STILL PENDING or NEW.
2. Execute or inspect evidence for every row in sections 23, 28.18 and 28.20; mark absent evidence as OPEN, never as a pass.
3. Audit at least one allowed and one denied path for each domain role and a cross-organization resource-ID path for every sensitive read/write family.
4. Review every remaining production file over 500 lines and every remaining legacy actor/API/schema field; accept only documented cohesive or compatibility exceptions with an expiry/removal owner.
5. Independently verify that CRM and Inventory were not behaviorally changed while shared primitives remained compatible.
6. Publish the scorecard with separate **architecture**, **implementation** and **production evidence** scores. The final 10/10 is allowed only when all three are 10/10 and no row above is OPEN.
