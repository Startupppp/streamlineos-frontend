# c28 · Organization-routed cells for 20M+ users

**Status: proposed target architecture.** The current StreamlineOS architecture is a sound implementation for the inside of one cell, but it is not yet evidence that the product can serve 20 million users. This PRD defines the target topology, the mistakes that must be corrected, the migration sequence, and the proof required before any scale claim is made.

## Executive verdict

Adopt a **cell-based, organization-centric SaaS architecture** with:

- a small global control plane;
- deterministic organization placement by region and cell;
- a modular NestJS monolith inside each cell;
- PostgreSQL as the transactional authority, sharded by organization placement;
- Redis for disposable acceleration and coordination, never durable business truth;
- transactional outbox delivery into bounded worker pools;
- object storage for files, an ACL-aware search/vector index, and a dedicated realtime adapter;
- hybrid authorization composed from standing, per-person capability, data scope, record ACL, entitlement, credential ceiling, and security conditions.

This is the recommended architecture for 20M+ **registered users** because capacity grows by adding cells rather than by turning one database or one deployment into a global bottleneck. It is not a promise of 20M concurrent users. Capacity is accepted only after the workload envelope and failure tests in this PRD pass.

## Product intent

StreamlineOS is one organization workspace containing Home, Knowledge Base, Chat, Mail, Calendar, Notifications, Directory, HRMS, Payroll, Timesheets, Build, CRM, Inventory, Accounting/Finance, Billing, Support, Surveys, Sign, Blog/Publishing, Workflows/Automation, Integrations, AI, portal surfaces, and future modules. A person owns one global login and may hold a separate membership in many organizations. Each organization owns its operational data, module enablement, people, access assignments, files, indexes, integrations, audit history, and billing relationship.

The architecture must make these properties structural:

1. One organization cannot read, cache, search, receive, restore, or infer another organization's data.
2. Organization growth does not require a global schema fork or per-tenant deployment.
3. A hot or failing organization cannot exhaust the whole platform.
4. Existing organizations keep working while the control plane is temporarily unavailable.
5. An organization can move between cells without changing its identifiers or user-facing URLs.
6. Authorization cannot be omitted and cannot outlive its source grant.
7. Request acknowledgement means every correctness-critical side effect is durably recoverable.
8. Scale is demonstrated through budgets and production-shaped tests, not inferred from framework choice.

## Planning workload envelope

The first capacity program must test at least the following planning envelope. These are validation inputs, not traffic predictions:

| Dimension | Minimum validation target |
|---|---:|
| Registered accounts | 20,000,000 |
| Organizations | 1,000,000 |
| Daily active users | 2,000,000 |
| Peak authenticated sessions | 250,000 |
| Concurrent realtime connections | 100,000 |
| Largest organization | 100,000 active members |
| Sustained application traffic | 50,000 requests/second platform-wide |
| Burst traffic | 100,000 requests/second for 10 minutes |
| Async event ingress | 1,000,000 events/minute platform-wide |
| Single broadcast | 100,000 recipients without request-time fanout |
| Knowledge corpus | 1 billion chunks platform-wide with ACL-safe retrieval |

Every cell receives its own measured capacity budget. Placement stops before a cell reaches 60% of its proven limiting resource so one failure, deploy, or traffic burst does not consume all headroom.

This PRD was grounded against the repository's region/tenant transaction path, organization lifecycle and switching, route classification, fixed-standing permission catalog, portal principals, Composio adapter, frontend cache rules, migrations, c10–c27 reviews, and `OPEN-FINDINGS.md`. A requirement is marked KEEP when that implementation is sound; target changes name the failure they prevent.

**Repository verdicts:** KEEP and deepen the NestJS modular monolith, `RegionRegistry`/`withTenant` routing, explicit organization lifecycle, deny-by-default route classification, six structural standings with platform capabilities, application-role RLS model, outbox/idempotency primitives, and Composio seam. REPAIR the membership integrity, temporal authorization cache, query-key tenancy, migration/RLS verification, lifecycle propagation, and worker/retention findings. REPLACE only global identity fields that hold organization employment/payroll facts, synthetic-owner machine authority, and any request-path outbound/fanout implementation that cannot be durably recovered.

## Architecture

```text
                           Global control plane
        ┌────────────────────────────────────────────────────┐
        │ Identity · org directory · placement · plan catalog│
        │ domains · feature rollout · cell health · migration│
        └──────────────────────────┬─────────────────────────┘
                                   │ resolve org placement
                         Edge and routing tier
        ┌────────────────────────────────────────────────────┐
        │ WAF · auth · rate limits · request id · cell route │
        └───────────────┬──────────────────────┬─────────────┘
                        │                      │
                 India cell A             EU cell B
        ┌────────────────────────┐  ┌────────────────────────┐
        │ NestJS stateless nodes │  │ NestJS stateless nodes │
        │ PostgreSQL primary     │  │ PostgreSQL primary     │
        │ read replicas          │  │ read replicas          │
        │ Redis                  │  │ Redis                  │
        │ worker pools           │  │ worker pools           │
        │ search/vector adapter  │  │ search/vector adapter  │
        │ object storage adapter │  │ object storage adapter │
        │ realtime adapter       │  │ realtime adapter       │
        └──────────────┬─────────┘  └──────────────┬─────────┘
             isolated cell queues; sanitized control events only cross cells
```

### Control plane

The control plane owns only global coordination:

- authentication account and credential identity;
- organization directory and verified domains;
- a derived account-to-organization discovery index for organization switching;
- organization placement and placement version;
- region/cell inventory and health;
- global plan, meter, feature, and permission catalogs;
- rollout configuration;
- organization migration state;
- platform administration and global audit events.

It does not own membership authority, HR, CRM, chat, knowledge, payroll, project, inventory, or organization audit records. The discovery index is a projection, never authorization truth: a switch is revalidated against the target cell before a session is issued. The control plane is multi-region and strongly consistent only where global serialization is required: placement, slug/domain reservations, and migration fences. Invite, event, and provider-receipt IDs are globally unique by construction and remain cell-owned. Existing sessions cache a signed, expiring placement result so an outage does not stop traffic for already placed organizations.

The placement record is explicit:

```text
organization_placement
  organization_id
  region
  cell_id
  database_shard
  object_storage_region
  search_cluster
  placement_version
  write_fence_token
  lease_expires_at
  status              ACTIVE | MOVING | READ_ONLY | FAILED
  updated_at
```

### Cell

A cell is the unit of capacity, deployment, isolation, recovery, and blast radius. It contains all organization-owned data and the runtime needed to serve it. An organization is writable in exactly one cell at a time.

Small organizations share a cell. Large or regulated organizations may receive a dedicated database shard or dedicated cell without changing domain code. No domain may perform a synchronous cross-cell join or transaction.

### Modular application inside a cell

Keep the NestJS modular monolith. The deployable may be shared while the modules remain deep and locally owned:

```text
src/
  platform/
    authorization/
    tenancy/
    placement/
    audit/
    events/
    jobs/
    files/
    search/
    realtime/
    pagination/
  domains/
    organization/
    knowledge/
    chat/
    mail/
    calendar/
    notifications/
    hr/
    payroll/
    build/
    crm/
    inventory/
    accounting/
    billing/
```

Each domain owns its schema, permission namespace, queries, mutations, events, background work, cache invalidation, retention, and operational budgets. A domain exposes a small interface; its storage and orchestration remain implementation details. Synchronous calls cross an in-process interface only when the caller needs the answer to commit. Everything else uses durable events.

Every module is registered through one versioned manifest: module ID, product route, standing ladder, permission namespaces, entitlement, schema owner, data classification, events, cache namespaces, retention, search ACL strategy, SLO/budget, migrations, navigation, and public/portal exposure. A future module cannot ship until tenant isolation, permission catalog, route classification, navigation visibility, cold migration, restore, and removal checks pass. This deep manifest replaces parallel registries; it does not become a generic runtime framework.

Microservices are not the default. Extract a deployment only when measurements show an independent scaling, reliability, security, or release requirement. Chat fanout, notification delivery, search ingestion, and billing webhooks are likely first candidates; HR, CRM, settings, and inventory may remain in the modular monolith much longer.

## Organization and identity model

`users` owns global authentication identity only. Organization facts never live there.

| Fact | Owning record |
|---|---|
| Login identity and account state | global user |
| Membership status and org standing | organization membership |
| Organization person/profile | organization person |
| Employee number and employment lifecycle | HR employment |
| Department, branch, manager and team | effective-dated assignment |
| Salary and compensation | compensation revision ledger |
| Bank and tax data | encrypted payroll profile |
| Customer/contact identity | organization party/contact |

Every organization relationship references the membership or organization person, not the global account. Removing a membership cannot leave a live organization credential, delegation, module override, group edge, record grant, provider connection, or realtime capability behind.

Organization creation is an idempotent saga: reserve global ID/slug/domain and placement, bootstrap the cell organization and owner membership, then activate the directory projection. Each step records state and can resume or compensate. Archive, restore, export, ownership transfer, scheduled purge, purge cancellation, legal hold, and terminal deletion use equally explicit state machines. Purge completion includes database rows, objects, cache, search/vector documents, analytics copies, provider mirrors, backups after expiry, and auditable evidence.

## Authorization model

There are exactly six structural standings:

- organization owner;
- organization admin;
- organization member;
- module owner;
- module admin;
- module member.

There are no tenant-authored executable roles and no tenant-authored permission keys. The platform catalog defines capabilities. An authorized owner or admin can attach specific catalog capabilities and scopes to a person within the grantor's own authority.

Effective access is the intersection/union required by these inputs:

```text
active membership
  + structural org standing
  + structural module standing
  + permission-group grants
  + per-person capability grants
  + unexpired delegation
  + data scope
  + record relationship/ACL
  + module entitlement and enablement
  + credential capability ceiling
  + MFA/device/risk conditions
```

Organization owner and active organization admin receive the normal product capabilities in every enabled and entitled module. Organization ownership transfer, organization deletion, and explicitly owner-only lifecycle operations still require the owner. Module owners manage their module. Module admins administer their module but cannot transfer ownership. Module members receive only attached capabilities.

All organization-scoped authorization edges use `(org_id, membership_id)` composite integrity. Permission snapshots are keyed by `(org_id, membership_id, access_version)` and carry `valid_until`, capped at the nearest role or delegation start/expiry. A shared cache can never extend authority beyond `valid_until`.

Human membership, personal token, agent token, integration, portal member, external signer/support guest, public-link token, and system job are separate principal variants. Only a human membership can be an organization owner. Machine and external principals have an explicit audience, organization/project/record scope, capability ceiling, expiry/rotation policy, and audit identity; no implementation may manufacture `isOrgOwner: true`. Platform support access is not organization ownership: it requires MFA, reason, approval, a short lease, immutable audit, and customer-visible evidence where policy allows.

Frontend visibility derives from the same resolved snapshot used by backend authorization. Hiding navigation or a button is user experience, never enforcement. Tenant, lifecycle, scope, and record ACL enter the SQL/search predicate before retrieval.

## Universal surfaces versus assignable capability

Home is the universal employee surface defined by the constitution: dashboard, communication, self-service, announcements, directory, and Knowledge Base reading. Universal surface availability does not imply universal administration.

- Reading one's own data derives the subject from the authenticated membership.
- KB reads still enforce space, audience, project, page, and record ACLs.
- Chat, mail, calendar, and notification administration remain capability-gated.
- HR, payroll, finance, CRM, Build, inventory, and knowledge authoring remain module/capability-gated; inaccessible module navigation, routes, and actions are absent from the UI and denied by the backend.
- A module deny cannot remove constitutionally universal self-service, but it can remove non-universal module work.

## Data architecture

### Transactional data

PostgreSQL remains authoritative. Every tenant-owned table has an explicit organization path, tenant-correlated foreign keys, and indexes beginning with `org_id` where the access pattern is organization-scoped. RLS is applied according to the verified matrix and tested as the non-bypass application role.

Mutable records carry `created_at`, `updated_at`, actor attribution, and optimistic version where concurrent edits matter. Soft delete is used only when undo, retention, or referential continuity is a product requirement; immutable ledgers append corrections, ephemeral rows hard-delete, and legal hold overrides purge. Partial unique constraints exclude lifecycle-terminal rows only where reuse is explicitly allowed.

Do not rewrite all identifiers. Preserve stable existing keys. New externally exposed/event identifiers should be globally unique and time-sortable where useful; local bigint keys remain appropriate for high-volume rows when every external reference also carries organization/cell context.

Hot append-only families are partitioned by time with organization-leading local indexes:

- chat messages and delivery/read state;
- notifications and delivery attempts;
- inbox synchronization events;
- audit and activity events;
- webhook receipts and processing attempts;
- usage-meter events;
- search ingestion events.

Partition creation, retention, archival, legal hold, and restore are one lifecycle interface. A partitioning change without a read-budget measurement is incomplete.

### Files

Files live in region-matched object storage. Database rows own metadata, organization, encryption key reference, lifecycle, retention, malware status, and immutable content hash. Clients receive short-lived scoped upload/download capabilities; object keys are never authorization.

### Search and vectors

PostgreSQL is authoritative; a transactional outbox drives indexing. Every indexed document/chunk carries organization, lifecycle, source revision, ACL revision, visibility, and allowed principal/group identifiers. Search and vector candidate generation apply those restrictions inside the index. Fetching globally and filtering afterward is prohibited.

Tenant-defined fields use platform-owned typed definitions plus bounded JSONB values or domain sidecar value tables according to queryability; never EAV for core fields and never per-tenant schemas. Indexed custom values receive explicit generated/sidecar indexes, validation, limits, and migration/version semantics.

### Analytics

Operational dashboards use bounded transactional projections. Historical and cross-domain analytics flow asynchronously into a warehouse/lakehouse. Product requests never synchronously join across cells or scan event history to calculate a dashboard.

## Event and worker architecture

Every correctness-critical side effect leaving the process begins with an outbox row written in the same transaction as the domain change:

```text
domain transaction
  ├─ authoritative rows
  └─ outbox event
       → relay claim
       → durable broker/queue
       → bounded idempotent consumer
       → success, retry, or dead letter
```

Delivery is at least once. Consumers deduplicate with stable event/source keys. Exactly-once marketing claims are rejected; correctness comes from idempotent state transitions and database constraints.

An event contains `event_id`, `org_id`, `cell_id`, `type`, `schema_version`, aggregate identity, occurrence time, correlation ID, causation ID, and trace context. Sensitive payloads carry references rather than unnecessary PII. Each cell has isolated broker namespaces, queues, quotas, and dead letters; only allow-listed, minimized control-plane events cross cells, so a global broker cannot recreate a platform-wide blast radius.

Separate worker pools and budgets exist for chat fanout, notification/email, search/indexing, imports/exports, billing, calendar sync, AI ingestion, and maintenance. One 100,000-recipient broadcast creates one logical job and bounded batches; it never performs recipient writes sequentially inside the request.

## Caching

Redis is disposable acceleration and coordination:

- authorization snapshots;
- entitlement/module projections;
- bounded list/detail caches;
- rate limits and abuse controls;
- distributed leases;
- presence and ephemeral counters;
- single-flight/stampede protection.

Keys include environment, cell, organization, subject/permission discriminator, filters, sort, cursor version, and namespace/access version as applicable. Permission-sensitive results never share a key across memberships or effective-access revisions. Mutations invalidate explicitly; broad request-path scans are prohibited.

The correctness argument is simple: deleting all caches may reduce performance but may not corrupt durable state, resurrect access, lose revocation, double-charge, or leak another organization's result.

## Query and list contract

- Explicit projections only; no unbounded `SELECT *`.
- Filtering and authorization happen in the database/index, never after fetching.
- Cursor pagination is default for unbounded/high-churn lists.
- Offset pagination is allowed only for small bounded administration lists.
- Every list has a hard cap and deterministic tie-breaker.
- Tenant and sort/filter fields match a measured composite index.
- Count is omitted, estimated, windowed, or separately cached according to product need; it is not automatically executed for every page.
- Read replicas serve stale-tolerant projections only. Authorization, ownership, billing, quotas, writes, and read-after-write use the primary.
- Every critical query has a production-role buffer/read budget and a representative largest-tenant fixture.

## Client and public interface delivery

NestJS exposes a versioned REST interface with Zod validation, generated OpenAPI in CI, stable error envelopes, idempotency keys for retryable commands, cursor/filter/sort contracts, deprecation dates, usage telemetry, and a compatibility window for deployed web/mobile clients. Breaking changes use a new declared version; compatibility adapters are removed only after consumer evidence. Webhooks and events are independently versioned.

Next.js public pages use server rendering/static generation, CDN caching, canonical metadata, sitemaps, structured data, and measured Core Web Vitals. The authenticated application uses server components where useful, route-level code splitting, virtualized large views, tenant-aware query/cache keys, and cache clearing during organization switch until every key is fixed. Shared design tokens and interaction patterns must meet WCAG 2.2 AA, keyboard/screen-reader use, responsive layouts, localization, timezone, currency, and reduced-motion requirements.

## Domain scale rules

- **Chat:** channel authorization before message retrieval; partitioned messages; per-member/channel read watermark; bounded fanout; ordering guaranteed within a conversation, not globally.
- **Mail/inbox:** provider cursors and sync state are durable; exhausted accounts stay exhausted; merging is cursor-based and bounded; provider calls leave requests.
- **Notifications:** event catalog and preference routing are centralized; mandatory security/legal events cannot be suppressed; unread counts use projections/watermarks; delivery is asynchronous and retryable.
- **Calendar:** a standards-tested RRULE library, never hand-rolled recurrence; IANA event timezone and DST-safe expansion; explicit moved/cancelled exceptions; bounded occurrence windows; free/busy and conflict reads share exactly the same recurrence semantics.
- **Knowledge/Wiki/Chatbot:** immutable revisions, asynchronous idempotent ingestion, source-hash deduplication, ACL revision on every chunk, restricted candidate generation, and deletion/tombstone propagation.
- **Billing:** versioned plan/price/entitlement catalog; effective-dated seats and usage meters; proration previews plus immutable invoice/ledger/tax/currency snapshots; webhook receipt before idempotent out-of-order processing and replay; local entitlement projection so ordinary requests never call a provider.
- **HR/Payroll:** organization-scoped employment truth, effective-dated assignments and compensation, encrypted sensitive profiles, approval/segregation controls, immutable posting/payout ledgers.
- **CRM/Build/Inventory:** organization-leading indexes, bounded list projections, domain events rather than direct cross-domain writes, and record/team ACLs composed in queries.
- **Directory/Party/Portal/Sign:** one organization-person/party identity seam; portal and signer principals are record/project scoped; public tokens are hashed, expiring, revocable, rate-limited, and never imply employee membership.
- **Support/Surveys/Workflows:** bounded rule evaluation and recipient selection; immutable submission/execution history; idempotent resumable runs; automation executes under the initiator's captured capability ceiling, not owner authority.
- **Integrations/Webhooks:** Composio is the provider adapter; StreamlineOS stores only its scoped connection mirror. Inbound receipts are persisted before processing, uniquely deduplicated, signature/timestamp verified, replayable, and converted to cell-local outbox work.
- **AI:** retrieval is tenant/ACL constrained before model input; resist prompt injection and tool exfiltration; mutations require policy and human confirmation; model allowlists, redaction, retention, token budgets, provenance, and evaluation gates are mandatory.

## Reliability, security, and compliance

Required objectives at the accepted workload, measured under representative cold/warm cache mix, payload sizes, pool pressure, tenant sizes, geography, device, and network. Microseconds apply only inside one process; networked data is a millisecond budget:

| Objective | Target |
|---|---:|
| Authenticated interactive availability | 99.95% monthly per cell |
| Cross-organization data exposure | zero tolerated |
| p99 in-process hot authorization/cache decision | ≤ 100 µs CPU time without I/O; route budget still includes event-loop delay |
| p95 same-region Redis operation | ≤ 2 ms including network |
| p95 simple tenant PostgreSQL round trip | ≤ 20 ms including pool wait, network, GUC setup, and execution; bounded complex read ≤ 50 ms |
| p95 browser-visible cached read | ≤ 150 ms on the declared same-region reference device/network |
| p75 first useful authenticated view | ≤ 1 second on the declared reference device/network |
| p95 transactional write | ≤ 500 ms excluding declared async work |
| Permission revocation | ≤ 5 seconds explicit; never past `valid_until` temporal |
| Durable event loss after acknowledged commit | zero |
| Ordinary node/process failure | acknowledged commits survive through synchronous database durability |
| Regional-disaster recovery point | ≤ 5 minutes, proven by restore exercise |
| Cell recovery time | ≤ 60 minutes, validated by exercise |

Encryption is required in transit and at rest; sensitive payroll/identity fields use application-level envelope encryption with per-region/cell KMS keys and auditable rotation. Secrets never enter source, events, logs, or analytics; integration credentials remain in Composio. Logs, traces, analytics, events, and search documents minimize or redact PII. GDPR deletion, legal hold, retention, export, residency, consent, and audit requirements operate per organization and propagate to every adapter. Malware scanning, content limits, spam controls, and organization/user/IP/device rate limits protect uploads, chat, invitations, portals, and public links.

Rate limits combine principal, organization, route cost, and provider limits. Large tenants receive quotas and workload isolation, not globally larger unbounded queries. Every critical alert must have an owner, threshold, runbook, paging destination, deduplication, and a test event that proves a human receives it.

## Fencing, overload, and dependency failure

Placement is a lease, not merely a routing lookup. Every write carries the resolved `placement_version`; the cell accepts it only while it holds the matching write fence. During relocation, loss of the fence stops source writes before target writes begin. A stale router can therefore fail a request but cannot create split-brain data.

Every ingress has bounded concurrency, queue depth, body size, execution time, and per-organization cost. When saturated, the platform sheds optional work in this order: prefetch and analytics refresh, AI enrichment, search freshness, non-mandatory notifications, then ordinary writes. Authentication, authorization revocation, ownership, billing ledger, payroll posting, audit, and mandatory security delivery retain reserved capacity. Overload returns explicit retry information; it never accepts work that cannot be recovered.

Dependency behavior is declared rather than improvised:

| Dependency unavailable | Required behavior |
|---|---|
| Control plane | Serve valid signed placement cache; refuse unknown or stale placement |
| Redis | Fall back only where correctness is database-backed; rate-limit conservatively |
| Search/vector index | Direct reads continue; search reports degraded, never bypasses ACL |
| Realtime adapter | Durable events remain; clients reconnect and catch up from watermarks |
| Email/SMS provider | Outbox retries/dead-letters; request transaction remains committed |
| Read replica | Route correctness-sensitive reads to primary; shed stale-tolerant projections if needed |
| Object storage | Preserve metadata state and retry; never mark upload/scan complete prematurely |
| AI provider | Core product continues; metering reservation is released or reconciled idempotently |

## Cost, ownership, and change governance

Capacity is constrained by unit economics as well as throughput. Track cost per active organization, active user, 1,000 requests, 1,000 realtime minutes, GB stored, million indexed chunks, million events, notification delivery, and AI token. Each cell has monthly cost and saturation forecasts; anomalous tenant cost triggers throttling review or placement change, never silent cross-subsidy through unbounded work.

Every deep platform module has one accountable owner, an interface contract, SLO, capacity budget, data classification, retention rule, runbook, dashboard, alert destination, and restore test. Architecture decisions that alter tenancy, authorization, placement, event semantics, encryption, or cell topology require an ADR and backward-compatible rollout plan.

Observability uses request, correlation, causation, event, cell, and sampled organization identifiers in logs/traces. Organization and user IDs are prohibited as unbounded metric labels. SLOs are measured per cell and user journey, and platform rollups cannot hide one unhealthy cell.

Schema, event, and interface changes are additive first. A control-plane cell-schema registry records desired/current version and health. Readers tolerate old and new versions during rollout; writers emit one declared version; backfills are resumable and measured; destructive contraction waits until usage proves the old form is absent. A cell deploy uses canary cells/traffic, automatic SLO rollback, compatibility checks against the oldest supported schema/event version, and no all-cell simultaneous release.

## Mistakes in the current or earlier design

These are stated without blame; each is a concrete lesson the target architecture must preserve.

1. **Global identity and organization employment were mixed.** Department, manager, employee ID, designation, salary, bank, and tax facts appeared on the global user, which cannot represent one person in multiple organizations.
2. **Some authorization facts were keyed to users rather than memberships.** Module overrides, delegations, and agent credentials could survive removal/re-invitation or lack structural membership integrity.
3. **Universal surface and universal authority were conflated.** Making Home communication available to every member was allowed to imply broad manage/write capabilities. Availability and action capability must remain separate.
4. **Role vocabulary was allowed to drift.** Earlier descriptions mixed fixed standings, custom roles, and person-specific permissions. The correction is exactly six standings plus platform-defined per-person capabilities; tenants do not create executable authorization vocabulary.
5. **Org-admin equivalence was underspecified.** “Same as owner except owner change” did not enumerate organization deletion, ownership lifecycle, module transfer, security controls, and billing. Owner-only operations must be explicit.
6. **Module transfer initiator and current owner were conflated.** An org owner could initiate a transfer whose acceptance expected the initiator to be the module owner. Store initiator and expected current owner separately.
7. **Temporal grants were put behind fixed cache TTLs.** A role or delegation could remain effective after expiry or activate late. Cache validity must end at the next access transition.
8. **Human and machine authority were conflated.** Some jobs/integrations manufactured an owner context, while agent tokens could inherit a person's broad access. Machine principals require explicit least privilege.
9. **Application validation carried invariants the database could express.** Free-text module keys, membership attribution, and grant/module relationships permit drift through imports, scripts, or future mutations.
10. **Request handlers performed or launched outbound work.** Network I/O, notification delivery, indexing, and fanout could outlive or borrow the request transaction, fail invisibly, or hold connections.
11. **Fanout and polling were treated as ordinary loops.** Sequential recipient work and frequent polling become platform outages far below 20M users. They require bounded jobs, realtime invalidation, watermarks, and retention.
12. **One global deployment was treated as scale architecture.** Stateless instances help compute scaling but do not limit database, cache, queue, provider, or blast-radius failures. Cells provide the missing unit of isolation.
13. **Schema source and migration truth were allowed to diverge.** A type-safe table or constraint that is absent from the cold migration chain does not exist in production.
14. **Logging was confused with operational delivery.** A predicate or log line is not an alert until scheduling, routing, paging, ownership, and receipt are verified.
15. **Scale was discussed without a workload envelope.** “Millions of users” is not measurable until account, DAU, concurrency, request, realtime, largest-tenant, storage, and event targets exist.
16. **Deletion evidence relied too much on text search.** A route, file, schema, or module is removable only after graph, runtime, migration, analytics, external consumer, and build evidence.
17. **Domain breadth encouraged shallow proliferation.** Particularly in HR, many routes/tables/modules increase omission and migration risk. New implementation must deepen existing modules before adding parallel concepts.
18. **Infrastructure extraction was considered before a measured seam.** A network deployment is justified only when independent scaling or reliability creates a real second adapter; otherwise it adds failure modes without leverage.
19. **A sound region seam risked being redesigned twice.** The existing `RegionRegistry` and tenant transaction routing already provide leverage; replacing them would create competing placement truth instead of preventing a failure.
20. **Recovery objectives conflated failure classes.** WAL durability protects ordinary committed writes, but a five-minute regional RPO cannot simultaneously promise zero regional data loss; each failure class needs an honest tested objective.
21. **Client contracts and caches were not fully tenant/version structural.** Development-only OpenAPI and a base frontend query key without organization identity make compatibility and cross-org cache safety depend on convention.

## Migration plan

### Phase 0 — prove and repair the current cell

- Remove organization employment/payroll facts from global users through expand/backfill/dual-read/cutover/contract migrations.
- Re-key module overrides, delegations, agent tokens, and related authorization artifacts to membership.
- Add time-aware permission snapshot validity.
- Introduce discriminated human/machine principals and remove synthetic owner contexts.
- Resolve organization-admin and module-transfer policy/implementation.
- Complete fanout, retention, route-classification, RLS, migration-chain, and operational-alert findings already tracked in c10–c27.
- Resolve every still-open item in `architecture-refactor/OPEN-FINDINGS.md`, including vault audit attribution, durable production app-role credentials, the FORCE-RLS policy/verifier contradiction, pagination duplication, and the missing invitation-expiry ledger event.
- Make frontend query keys tenant-aware; retain full cache clearing on organization switch until that migration is complete.
- Inventory routes, schemas, queries, validators, UI files, and exports with graph/runtime/build/migration/analytics/consumer evidence; delete duplicates or dead artifacts only through a reviewed migration/deprecation and rollback plan.
- Make ownership/authorization tests and live application verification green; instrument every latency seam and set pool/query/cache/route alerts below their SLO budgets rather than the current 250 ms slow-acquire default.

### Phase 1 — introduce placement without moving data

- KEEP the existing `RegionRegistry`, `withTenant` region resolution, region bindings, and region tests; deepen the placement interface from region-only lookup to `(region, cell, shard, placement_version, fence)` without a parallel registry.
- Treat the existing production deployment as cell `legacy-1`.
- Route every organization request through placement resolution.
- Cache signed placement with versioning and fail closed on unknown/moving placement.
- Add the derived multi-cell membership discovery index and revalidate membership in the target cell on every organization switch.
- Run the idempotent organization-create saga and global uniqueness reservations through the control plane.
- Prove no organization-owned query bypasses placement.

### Phase 2 — create a second cell

- Provision independent database, Redis, workers, storage prefix, search index, monitoring, and secrets.
- Place internal/test organizations there first.
- Exercise cold bootstrap, backup, restore, degraded control plane, and cell isolation.
- Establish measured per-cell capacity and admission thresholds.

### Phase 3 — organization relocation

Use an explicit state machine:

```text
ACTIVE_SOURCE → SNAPSHOT → CATCH_UP → READ_ONLY_SOURCE
→ VERIFY_TARGET → FLIP_PLACEMENT → ACTIVE_TARGET → RETIRE_SOURCE
```

Writes carry placement version and are refused on stale routing. Copy is checksummed by table/partition/object/index. Outbox offsets are reconciled. Rollback remains possible until target verification and placement flip complete. No dual-writer steady state is allowed.

### Phase 4 — scale by adding cells

- Automate placement based on region, compliance, capacity, and tenant class.
- Add noisy-neighbor detection and organization relocation.
- Use dedicated shards/cells for the largest tenants.
- Roll deployments cell by cell with automatic rollback on SLO regression.

### Phase 5 — extract only measured hot implementations

- Extract chat delivery, notification delivery, search ingestion, or billing webhooks only after the modular interface and operational data prove independent deployment is valuable.
- Define a port at the existing seam, a network/queue adapter for production, and an in-memory adapter for tests.
- Replace old tests with interface-level tests; do not preserve shallow pass-through layers.

## Acceptance criteria

- [ ] Placement proves exactly one writable cell, fail-closed unknown/stale/moving routes, cached outage operation, no cross-cell transaction, race-safe fencing, and cell-bounded failure.
- [ ] The 100,000-member case and full sustained/burst envelope meet every latency budget with at least 40% headroom in every limiting cell resource.
- [ ] Application-role database, cache, object, realtime, search/vector, event, backup, restore, and organization-switch tests prove cross-organization isolation.
- [ ] Revocation converges within five seconds; temporal access ends at `valid_until`; remove/re-invite restores no old authority; machine principals stay below their ceilings.
- [ ] Acknowledged mutations commit authoritative rows and outbox atomically; duplicate, delayed, retried, and out-of-order delivery remains correct.
- [ ] Cache deletion changes only performance; search ACLs apply before candidates; every unbounded list is deterministic, cursor-paged, capped, and query-budgeted on largest-tenant data.
- [ ] Cold creation, forward migration, compatibility, rollback, PITR/cell restore, and organization relocation are exercised with checksums, offsets, audit, and rollback evidence.
- [ ] Every dependency and overload test follows declared degradation while reserved security, ownership, ledger, payroll, audit, and mandatory-delivery capacity survives.
- [ ] Scheduled tests reach every owned alert destination; module owners maintain SLO, capacity/cost budget, runbook, data lifecycle, and restore evidence.
- [ ] Unit-cost and per-cell forecasts remain approved; published workload/SLO results, not typecheck or review, are the only basis for a `20M-ready` claim.

## Non-goals

- Rewriting every domain as a microservice.
- One database or schema per small organization.
- Cross-cell distributed transactions.
- Storing permissions in JWT claims.
- Tenant-authored executable permission keys or arbitrary roles.
- Replacing PostgreSQL for transactional business data.
- Making Redis authoritative for access, financial, membership, or workflow state.
- A sweeping identifier rewrite.
- Refactoring every existing HR table before placement work can begin.
- Guaranteeing 20M concurrent users without a separate workload and cost model.

## Release decision

The architecture may be called **20M-ready** only when Phase 0 correctness work is complete, at least two cells are operating, organization relocation and recovery have been exercised, and the acceptance workload passes with published headroom. Before then, the accurate statement is: **the design has a credible horizontal path to 20M+ registered users, but the implementation has not yet proved that capacity.**
