# StreamlineOS Product, Architecture and Final Refactor PRD (excluding CRM and Inventory)

**Target:** 10/10 architecture, implementation, security, performance, maintainability and operability  
**Status:** approved target specification; current implementation is not yet complete  
**Last grounded against source:** 2026-08-29
**Scope:** every backend, frontend, schema, migration, API, worker, realtime, test, documentation and operational file, except CRM- and Inventory-owned implementation.  
**Excluded domains:** CRM and Inventory, including their owned backend modules, schemas, APIs, workers, tests, frontend routes, features, hooks and contracts. They may adopt compatible shared primitives but must not be behaviorally redesigned by this PRD.

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
| OpenAPI freshness | Locally blocked by region DB configuration | Green in CI |
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

This section is the single executable backlog for the next implementation pass. Sections 1-27 remain the product and architecture contract; this section records only work that is not yet proved complete against the current source at commit `846d71143`. CRM and Inventory remain excluded, including their pages, domain schema and domain-specific migrations. A shared-platform change may touch them only when required to preserve a shared interface, and must not redesign either excluded domain.

The target is evidence-backed 10/10, not a declared score. A module reaches 10/10 only when every applicable checkbox below is complete and the final verification matrix is green. Existing sound design receives a KEEP verdict. A REPLACE verdict must name the failure that occurs at target scale or under an authorization, correctness, recovery or maintenance condition.

### 28.1 Execution protocol for Luna

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

- [x] All 3,528 backend handlers are classified; zero are undeclared.
- [x] All 3,091 permission usages resolve against the synchronized 690-key catalogs.
- [x] All 720 tenant tables have a tenant-leading index declaration.
- [x] All 122 resolved data scopes reach a query predicate.
- [x] Backend and frontend typechecks pass.
- [x] Backend and frontend import graphs have zero circular dependencies.
- [x] Frontend business route, query-scope, formatter, empty-state, module-manifest, contract-drift and dead-code baseline checks pass.
- [x] Notification delivery preserves the database timestamp precision required by its composite foreign key.
- [x] HR performance, Helpdesk, finance reminder and tax-payment lists have cursor-capable paths.
- [x] Home HR scope and permission-aware caching are implemented.
- [x] Expense create/decision writes commit their domain change and outbox intent atomically.

These items are regression gates, not implementation TODOs.

### 28.3 Organization — target 10/10

Failure to prevent: organization authority remains split across legacy user IDs and oversized modules, so membership removal, organization switching or future cell movement can leave stale authority and make changes unsafe to review.

- [ ] Finish communication-domain actor expansion and backfill before contracting legacy organization actor columns.
- [ ] Prove every required writer and reader uses `organization_members.id` or the canonical organization-person seam as appropriate.
- [ ] Keep historical/inactive actors renderable while ensuring they cannot receive current authority.
- [ ] Produce zero-use proof for every legacy actor column, type and compatibility adapter before removal.
- [ ] Perform contraction through additive/backfill/validate/cutover/drop migrations with cold-bootstrap and upgrade proof.
- [ ] Split `org-membership.service.ts`, `org-lifecycle.service.ts`, `invitations.service.ts` and setup flows by membership lifecycle, invitation lifecycle, authority cleanup and organization lifecycle where their current responsibilities are independently changeable.
- [ ] Preserve one public organization interface for callers; extracted implementations remain internal modules, not new pass-through layers.
- [ ] Add or retain cross-organization negative coverage for invite acceptance, switching, membership suspension/removal, owner transfer and cache invalidation.

Completion gate: one organization membership is the authoritative login relationship in an organization; removing or switching it changes authorization immediately; no required runtime path reads a contracted actor field; cold and upgrade migrations agree.

### 28.4 Organization/module RBAC — target 10/10

Failure to prevent: a route or query can be visible or executed because a broad frontend prefix, module enablement or caller-provided boolean bypasses the exact module permission.

- [ ] Change universal-route matching to exact-by-default.
- [ ] Enumerate only genuinely universal descendants such as approved `/me/*`, communication-read and knowledge-read routes.
- [ ] Explicitly protect notification administration, knowledge administration/import/analytics, chat administration/invites and every other administrative descendant of a universal root.
- [ ] Resolve navigation/extension permission requirements before returning a universal decision when a protected descendant matches.
- [ ] Add a table-driven regression matrix for every universal root: root read, allowed descendant and forbidden administration descendant.
- [ ] Apply `enforceRouteAccess` to Workflows, Payroll and any other authenticated layout that currently performs session/module checks without route permission resolution.
- [ ] Gate each sensitive query and mutation hook internally with its exact backend permission; call-site hiding remains additional UX, not the only gate.
- [ ] Preserve module owner/admin/member standing, custom roles, principal groups, direct grants, data scopes and canonical-owner-only operations.
- [ ] Split module-access group, roster, standing, ownership and direct-grant implementations behind cohesive interfaces; eliminate repeated standing/authority queries without creating shallow wrappers.
- [ ] Prove permission mutation invalidates local permission snapshots, Redis entries, user session data, navigation and affected queries across all app instances.

Completion gate: every authenticated route resolves to exact universal access or a declared module/permission requirement; every protected hook is disabled without that permission; backend allow/deny and cross-tenant tests remain authoritative and green.

### 28.5 Home — target 10/10

Failure to prevent: one failed or unauthorized cross-module section can fail the whole Home page, leak the existence of inaccessible records or cause the page to fetch data a member cannot use.

- [ ] Define the Home read-model contract section by section: identity, attendance, availability, approvals, Build work, announcements, calendar, mail and notifications.
- [ ] Mark each section as universal self-service or bind it to an exact permission and data scope.
- [ ] Ensure a denied section is omitted and does not execute its query.
- [ ] Isolate section failures so one backend timeout or disabled module does not fail the entire Home response/page.
- [ ] Return minimal projections and bounded aggregates; never fetch full module records to calculate dashboard cards.
- [ ] Include organization, membership, permission/version, locale/timezone and relevant filter dimensions in server and Query cache keys.
- [ ] Invalidate only affected section prefixes after mutations and organization switches.
- [ ] Split `dashboard-hr.service.ts` and other large dashboard implementations by stable read-model responsibility while preserving one shallow caller contract.
- [ ] Provide skeleton, independent error/retry, empty and access-denied behavior for every rendered section.

Completion gate: an ordinary member sees only universal and granted sections, each section can fail independently, and the dashboard has measured bounded query/read budgets on production-shaped data.

### 28.6 Settings — target 10/10

Failure to prevent: global administration, module configuration and operational work blur together, while very large module-access implementations make authority changes risky.

- [ ] Keep global organization/account administration under `/settings/*` and module configuration under `/<module>/settings/*`.
- [ ] Remove duplicate or legacy Settings routes only after navigation, command palette, tests and external links have migrated.
- [ ] Decompose module-access implementation into ownership, standing, roles/groups, direct grants, candidates and read-model modules with explicit transactional seams.
- [ ] Keep canonical module owner controls separate from org-admin/module-admin controls.
- [ ] Ensure ordinary members can reach personal account settings without inheriting organization administration access.
- [ ] Verify every settings mutation has exact backend permission, object/tenant check, audit record, cache invalidation and optimistic-concurrency behavior where simultaneous edits matter.
- [ ] Keep the platform billing surface exactly at `/settings/billing` and `/settings/billing/ai-credits`.

Completion gate: there is one canonical route and implementation owner for each setting; no module operational work lives in Settings; module access behavior is testable through cohesive interfaces rather than a 1,000-line orchestration module.

### 28.7 HRMS — target 10/10

Failure to prevent: broad projections and an oversized legacy schema increase privacy exposure, query cost and migration risk, while similar person/member/worker/employee concepts drift apart.

- [ ] Inventory every HR table and classify it as active, compatibility-held, superseded or removable using runtime references, raw SQL, migrations and retention obligations.
- [ ] Enforce the HR table freeze: new HR behavior uses existing lifecycle fields or the custom-field engine unless a new normalized relationship is unavoidable.
- [ ] Produce a risk-ranked key plan for active `serial()` tables; migrate only high-write/high-fanout tables whose int4 lifetime or cross-cell identity is unsafe.
- [ ] Replace unprojected user/person/employee relations with explicit minimum projections, prioritizing payroll, banking, tax, identity documents and performance data.
- [ ] Replace unbounded lists and offset-only live feeds with the shared cursor/filter/sort contract; retain compatibility branches only for named callers and remove them after migration.
- [ ] Replace leading-wildcard operational search with tenant-safe indexed FTS/trigram or the approved security-definer ID-search seam.
- [ ] Ensure every optional subject filter applies DataScope and cannot widen `own`/`team` callers.
- [ ] Split cohesive HR implementations over the hard file limit, prioritizing hiring schema, HR AI, calendar source and sensitive read/write orchestration.
- [ ] Preserve employee self-service independently of paid HR administration entitlements.

Completion gate: sensitive HR responses are projection-pinned, every list is bounded, person facets resolve through the canonical seam, and every retained table/key has a documented scale and lifecycle reason.

### 28.8 Payroll — target 10/10

Failure to prevent: module-only frontend gating allows unauthorized screens/requests, while large run-generation and payout implementations make retry, monetary and approval invariants difficult to verify.

- [ ] Add route-permission enforcement to the Payroll layout and exact internal gates to read/mutation hooks.
- [ ] Split run generation into validated input, calculation, persistence, approval/publication and integration adapters behind one idempotent command interface.
- [ ] Split payout batches, profiles, ESS and runs by independently transactional responsibility.
- [ ] Preserve integer-money/currency invariants, immutable finalized results, approval audit identity and idempotent retry behavior.
- [ ] Ensure member self-service pay reads are universal-to-self while administration stays module- and permission-gated.
- [ ] Remove broad ORM projections and cap/export large payroll datasets asynchronously.
- [ ] Complete organization-actor contraction only after audit/history semantics are preserved.
- [ ] Verify payroll-to-accounting events have registered consumers, replay safety and observable dead-letter handling.

Completion gate: an unauthorized member cannot render or fire payroll administration operations; run generation and payout retry without double effects; self-service remains available; monetary/audit invariants have focused proof.

### 28.9 Build/PM — target 10/10

Failure to prevent: large adapters and presentation modules mix project, product and workflow responsibilities, increasing render cost and causing permissions or cache invalidation to drift across views.

- [ ] Preserve `project` and `managed_product` as separate entities under the Build product namespace.
- [ ] Decompose large Build adapters/components by project identity, ticket lifecycle, collaboration, approvals, reporting and product-management responsibility.
- [ ] Keep shared behavior behind existing Build interfaces instead of importing another subdomain's schema/repository.
- [ ] Verify every board/list uses server pagination, bounded filters, stable cursor ordering and indexed tenant-leading sort paths.
- [ ] Virtualize board columns beyond the documented threshold and fetch server aggregates rather than counting full card collections in the browser.
- [ ] Enforce exact permissions on every mutation control and hook, including bulk actions, settings, approvals and exports.
- [ ] Ensure mutation invalidation covers list, detail, board, counters, dashboard and realtime caches without cross-organization keys.
- [ ] Confirm activity/comment/assignee actor relationships preserve historical identity and active membership authorization.

Completion gate: Build has separate deep modules for project delivery and product management, bounded board/list behavior, exact action authorization and no production implementation over the hard limit without an approved cohesive exception.

### 28.10 Billing/Payments — target 10/10

Failure to prevent: large billing orchestration and incomplete runtime evidence can create duplicate charges, stale entitlements or incorrect seat/credit balances during webhook replay, plan changes and cell failures.

- [ ] Decompose billing orchestration into subscription lifecycle, entitlement resolution, seat accounting, invoices, payment attempts, promotions and AI-credit ledger modules.
- [ ] Preserve immutable invoices, integer monetary storage, explicit currency/tax snapshots and provider-event idempotency.
- [ ] Prove webhook replay, out-of-order delivery, duplicate delivery, signature failure and tenant/provider-account uniqueness.
- [ ] Prove seat changes and proration across invite, activation, suspension, removal, billing-cycle and plan transitions.
- [ ] Keep entitlement checks local through versioned cached snapshots; invalidate immediately after billing mutations and webhook settlement.
- [ ] Prove AI reserve/settle/refund/overage behavior is atomic and token-metered.
- [ ] Move large invoice generation/export work to bounded asynchronous jobs where request budgets can be exceeded.
- [ ] Exercise billing/payment behavior during placement change, provider outage, Redis outage and webhook redelivery.

Completion gate: no retry can double-charge or double-credit; entitlements never require a provider call per request; invoice/tax/currency history is immutable; runtime replay and failure evidence exists.

### 28.11 Accounting/Finance — target 10/10

Failure to prevent: journal events dead-letter with no consumer, reminder processing grows as policy × invoice × offset, and physical deletion can violate accounting retention.

- [ ] Decide the product behavior for `accounting.journal.posted` at the opening checkpoint.
- [ ] If behavior is required, register an idempotent consumer with replay, ordering, retry and dead-letter tests; if no behavior is required, remove the event and its outbox write with zero-consumer proof.
- [ ] Rewrite reminder candidate selection as a tenant-scoped SQL query/read model over due date, invoice status and policy offsets instead of nested application loops.
- [ ] Add the exact tenant/status/due-date/index coverage justified by the measured plan.
- [ ] Resolve recipients in bounded sets and write durable notification intent instead of awaiting per-invoice notification delivery in the sweep.
- [ ] Convert expense email reports to asynchronous, cursor-batched exports stored behind an authorized expiring download.
- [ ] Define retention/reversal behavior for tax payments, reminder policies and all posted financial records; physical deletion is allowed only where legally and product-wise correct.
- [ ] Replace broad raw projections with explicit DTO projections and remove compatibility offset branches after all frontend callers use cursors.
- [ ] Decompose reconciliation, assets, invoice detail and accounting UI files by cohesive responsibility.

Completion gate: zero emitted event types lack a consumer or explicit no-consumer decision; finance sweeps have bounded SQL/read budgets; posted financial history cannot be destructively rewritten; exports cannot exhaust request memory.

### 28.12 Chat — target 10/10

Failure to prevent: mixed actor identity, JSONB reactions, incomplete tenant foreign keys and oversized frontend modules can produce cross-tenant edges, duplicate reactions, unread/order drift and fragile rendering.

- [ ] Complete membership-keyed actor migration for channels, participants, messages, reactions, mentions, reads and invites.
- [ ] Normalize reactions with organization/message/membership/emoji uniqueness and idempotent add/remove semantics.
- [ ] Add and validate composite tenant foreign keys for every Chat parent/child relationship.
- [ ] Backfill in resumable batches with duplicate/unmappable-row reporting before cutover.
- [ ] Preserve historical departed-member display without granting current channel access.
- [ ] Put permission gates inside all Chat query/mutation hooks and protect administrative descendants of `/chat`.
- [ ] Split `message-panel.tsx`, `chat.ts`, `chat-bubble.tsx`, channel information and sidebar modules by data orchestration, message timeline, composer, thread, reactions, presence and administration.
- [ ] Preserve stable message ordering, optimistic reconciliation, draft ownership, read cursor, unread counters and reconnect behavior.
- [ ] Prove channel/thread BOLA, private-channel membership, cross-org denial, reconnect replay and duplicate-event behavior.

Completion gate: Chat contains no authoritative JSONB reaction/participant state, every relationship is tenant-enforced, unauthorized hooks do not execute and core production modules meet the file-size contract.

### 28.13 Calendar — target 10/10

Failure to prevent: JSONB/user-keyed attendees and non-transactional reminders produce incorrect invitations, duplicate notifications, broken recurrence exceptions and cross-tenant attendee edges.

- [ ] Normalize attendees using organization membership identity with composite organization/event integrity and uniqueness.
- [ ] Backfill attendees and responses with unmappable-row evidence before switching reads/writes.
- [ ] Use a standards-compliant RRULE library and persist recurrence exceptions independently from the series definition.
- [ ] Make event mutation and invitation/reminder intent one transaction through the outbox.
- [ ] Give scheduled work a stable occurrence + attendee idempotency key.
- [ ] Cancel or supersede stale reminder work when a series, occurrence, attendee or timezone changes.
- [ ] Prove timezone and DST behavior for creation, edits, recurrence expansion, free/busy and notifications.
- [ ] Keep `/calendar` universal while permission-filtering module event sources inside backend queries.
- [ ] Split remaining large event detail/form/view modules by recurrence, attendees, form state and presentation.

Completion gate: attendee authority is membership-keyed and tenant-enforced; recurrence/DST examples pass; event writes cannot commit without reminder intent; retries cannot double-notify.

### 28.14 Notifications — target 10/10

Failure to prevent: protected administration inherits universal route access, oversized pages/hooks drift, and event-stream reconnect or organization switching can duplicate or leak updates.

- [ ] Exclude providers, templates, event catalog, policies, broadcasts and analytics from universal notification route matching.
- [ ] Apply exact route and hook permissions for notification administration while retaining universal personal inbox/read-state access.
- [ ] Decompose templates, providers, events and broadcasts pages plus `hooks/api/notifications.ts` by catalog, preferences, delivery, provider, broadcast and personal inbox responsibility.
- [ ] Implement one event-stream adapter with abort, jittered reconnect, retry ceiling, heartbeat, token expiry, logout cleanup and organization-switch cleanup.
- [ ] Ensure stream credentials are short-lived, purpose-limited and redacted from telemetry.
- [ ] Preserve database-side notification timestamp handling and composite FK correctness.
- [ ] Prove at-least-once delivery, idempotent materialization, read/unread counters, suppression, digest, retry and dead-letter behavior.
- [ ] Configure durable alerting for queue age, pending intents, dead letters, provider failure and consumer absence.

Completion gate: personal notifications remain universally reachable, administration is exactly gated, reconnect cannot cross organizations or duplicate state, and every delivery failure is observable and replayable.

### 28.15 Workflows — target 10/10

Failure to prevent: authenticated users can render workflow administration and fire queries because the layout and hooks do not structurally enforce workflow permissions.

- [ ] Add shared server route enforcement to the Workflows layout.
- [ ] Map overview, templates, executions, approvals, scheduler, analytics, variables, secrets, access and builder routes to exact backend permissions.
- [ ] Gate each workflow read and mutation hook internally; secrets, variables, schedules, approvals and execution actions use their own keys.
- [ ] Ensure unknown Workflow routes fail closed rather than inheriting a broad module permission.
- [ ] Remove caller-provided authorization booleans where the hook can resolve permission itself.
- [ ] Split workflow hooks and builder modules by definitions, executions, approvals, schedules, variables/secrets and builder state.
- [ ] Prove module disabled, permission denied, own/team/all data scope, cross-tenant resource ID and secret redaction behavior.

Completion gate: no Workflow route renders and no Workflow request fires without its declared permission; sensitive values never enter logs, caches or client payloads without authorization.

### 28.16 Platform-wide completion work

#### API and validation

- [ ] Migrate legacy parameter-level validation to the shared metadata-driven validation seam so every operation with body/query/params publishes its contract.
- [ ] Raise generated contract coverage from 1,916/3,540 to all applicable operations; explicitly classify operations with no request payload.
- [ ] Standardize cursor, filter, sort, error envelope, idempotency and deprecation metadata in generated OpenAPI.
- [ ] Remove legacy offset response branches only after every repository caller and documented external consumer migrates.
- [ ] Keep frontend and backend contracts byte-synchronized in CI.

#### Query cost and caching

- [ ] Seed or obtain production-shaped data for the blocked read-budget criterion.
- [ ] Measure plans as the application role with tenant context, warm/cold cache mix and declared row distributions.
- [ ] Eliminate unbounded selects, fetch-then-filter, per-row lookups and leading-wildcard scans on target paths.
- [ ] Keep hard page cap 100 and stable tenant-scoped cursor indexes.
- [ ] Inventory cache keys and prove organization, membership/permission version, locale/timezone and filter dimensions wherever they affect the result.
- [ ] Prove mutation, membership, role, entitlement, organization-switch and placement invalidation across application instances.
- [ ] Add stampede protection to expensive shared read models and document stale-data tolerance.

#### Schema and migrations

- [ ] Create a risk register for active `serial()`/`bigserial()` keys: table growth, write rate, maximum lifetime, FK fanout, partitioning and migration cost.
- [ ] Migrate only keys that fail the target-scale lifetime or cross-cell requirement; record KEEP decisions for bounded catalogs.
- [ ] Resolve the contradictory 372/372, 373/373, 44-difference and zero-difference evidence with one timestamped authoritative cold/upgrade comparison.
- [ ] Require zero unjournalled/orphan/timestamp-regressed migrations, zero chain gaps and zero unexplained schema differences.
- [ ] Preserve additive, lock-bounded, resumable migration strategy with validated constraints and rollback/runbook evidence.

#### File structure and reuse

- [ ] Review every in-scope production file over 500 lines; split mixed responsibilities and document cohesive exceptions.
- [ ] Target 300 lines without fragmenting a deep module into pass-through files.
- [ ] Remove dead files/exports only with module-graph proof and build validation.
- [ ] Keep controllers thin, domain implementation in backend modules, Query orchestration in hooks and rendering in feature modules.
- [ ] Preserve one-way dependencies and zero circular imports.

#### Security, compliance and operations

- [ ] Complete operator-access design and audit evidence.
- [ ] Configure and prove public-token rate limits, upload limits, SSRF controls, secret/PII redaction and security headers.
- [ ] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and a live production log stream.
- [ ] Send test alerts through every on-call destination and record acknowledgement.
- [ ] Complete export, retention, legal-hold and erasure drills with disposable data and auditable cleanup.

#### Cell, recovery and 20M evidence

- [ ] Provision independently isolated cell compute, cache, object storage, search, realtime, worker and monitoring resources; namespace-only separation does not pass.
- [ ] Provision PITR/backup frequency that meets the five-minute operational RPO.
- [ ] Provision a physical read replica and prove replica-safe versus primary-required workload behavior under real lag.
- [ ] Re-run all 14 workload objectives with production-shaped data and declared geography/device/network/cache conditions.
- [ ] Meet every latency objective with at least 40% sustained-resource headroom and survive the burst target.
- [ ] Measure and approve per-cell cost, cost per active organization/member/message/job and saturation forecast.
- [ ] Record operator-owned blockers as blockers; never convert missing infrastructure into a passing code-only claim.

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
