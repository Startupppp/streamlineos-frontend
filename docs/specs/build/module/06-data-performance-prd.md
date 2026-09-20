# BLD-06 — API, Authorization, Database, Cache, and Performance PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Build APIs are tenant-safe, bounded, observable, and fast at realistic scale.
The database enforces durable invariants, retries are safe, and caches never
substitute for authoritative writes or return stale access.

## Current Source Findings

- ticket detail, update, and delete routes contain `projectId`, but their
  service calls identify the record by `ticketId` and do not consistently prove
  that the path project matches the ticket project.
- one ticket path schema validates `projectId` as a nonempty string rather than
  the positive integer used by the route.
- ticket detail eagerly includes up to 50 comments, all attachments, labels,
  assignees, and watchers, then issues a separate epic lookup.
- board rows and column counts do not share one filter/count contract.
- ticket filter parsing can silently remove malformed values.
- ticket schema has several legacy single-column indexes that do not lead with
  `org_id`, alongside newer tenant-leading indexes.
- ticket numeric/date fields do not yet expose a complete database-check
  contract for points, estimates, progress, and date order.
- Build uses client query caching, report and timesheet server caches, and
  targeted analytics invalidation; their complete writer matrices still need
  proof, and no evidence justifies adding Redis to every mutable list.
- comment, reaction, watcher, label, attachment, and checklist mutations can
  identify the ticket by `orgId + ticketId` and ignore route `projectId`.
- ticket create/update accept sprint, cycle, parent, customer, and some QA
  relation IDs without proving the same project; several FKs are org-only.
- timesheet billing summary fails open when membership lookup returns no row.
- ticket and project deletion hard-delete time entries and bypass Timesheets
  retention for payroll-exported rows.
- only 14 of 203 Build mutations are marked idempotent; automation and webhook
  fan-out are unbounded; billing-summary cache has no writer invalidation.
- the source census is 59 controllers and 313 operations, not the earlier 47
  controller sample used in the first BLD-06A draft.
- ticket-by-id, ticket-by-key, comment permalink, and chat preview fail
  `check:contract-parity` because backend `ticketDetailSchema` omits the
  nested `assignees` shape the query already returns.
- Git lives in Integrations, not the 59 Build controllers; current ingress
  still stores a webhook secret in `db/schema/build/git.ts`, advertises
  unimplemented Bitbucket, and can lose auto-transition or link writes after
  acknowledging the provider.

## Authorization Pipeline

Every handler must pass:

1. authenticated identity;
2. active organization from the token;
3. enabled Build module where applicable;
4. exact permission;
5. data-scope resolution;
6. route-parent/record-parent match;
7. relation-target authorization; and
8. client-portal grant projection where external.

Controllers do not trust `orgId`, current `userId`, author, creator, reporter,
subscriber, or acting actor from the client.

- [ ] **BLD-06-001** every Build controller handler is classified by auth,
  module, permission, scope, validation, response contract, and idempotency.
- [ ] **BLD-06-002** every read and write applies tenant and record scope in the
  data-layer query or transaction.
- [ ] **BLD-06-003** nested routes prove parent-child identity, including
  project/ticket, project/file, project/form, project/approval, and all detail
  subresources.
- [ ] **BLD-06-004** wrong-parent and wrong-tenant IDs fail without leaking
  record existence.
- [ ] **BLD-06-005** optional actor/project/workspace/product filters cannot
  widen the caller's data scope.
- [ ] **BLD-06-006** portal APIs use portal identity and explicit grants, not
  employee permissions or client-supplied scope.
- [ ] **BLD-06-040** every comment, reaction, watcher, label, attachment,
  checklist, relation, and other ticket-subresource mutation proves
  `CurrentUserContext`, route `projectId`, and ticket identity together.
- [ ] **BLD-06-041** sprint, cycle, module, parent, customer, custom-field,
  release, QA, and meeting relations prove same-organization and same-project
  identity in both the service and a tenant-composite FK.
- [ ] **BLD-06-042** timesheet billing summaries deny or return empty when
  membership is absent; they never fail open to organization-wide data.
- [ ] **BLD-06-043** ticket and project deletion use Timesheets archival or
  voiding; payroll-exported entries cannot be hard-deleted by Build.
- [ ] **BLD-06-044** a generated census of every current Build operation
  records auth, parent proof, schemas, bound, transaction, idempotency,
  outbox, cache, and allow/deny tests; sampling is not completion evidence.

## API Contract

- strict Zod body, params, and query schemas;
- parsed objects are the only service input;
- consistent cursor or offset response envelope;
- stable error code and field-path envelope;
- response schema matches the actual returned literal and nullability;
- list requests cap at 100;
- unknown sort/filter/include fields fail;
- expansions are allowlisted and separately authorized;
- write responses return enough canonical state to patch caches safely.

- [ ] **BLD-06-007** repair ticket route parameter validation and pass
  `projectId` through read/update/delete service contracts.
- [ ] **BLD-06-008** request/response contract tests cover every Build
  controller, including fields that would otherwise be silently stripped.
- [ ] **BLD-06-009** date, cursor, enum, ID, array, search, and sort values are
  bounded and fail closed.
- [ ] **BLD-06-010** API versioning/migration handles moved routes and renamed
  fields without parallel permanent implementations.

## Query Standards

Every DB call is:

- necessary and consumed;
- tenant scoped;
- projected to fields used;
- bounded;
- backed by a measured index plan;
- free of per-row queries;
- stable under pagination; and
- executed once per customer action unless an explicit dependency requires
  otherwise.

- [ ] **BLD-06-011** inventory endpoint-to-query counts for list, detail,
  dashboard, report, bulk, and client portal flows.
- [ ] **BLD-06-012** remove N+1 relation, count, member, customer, label, and
  permission lookups through joins, batches, or grouped queries.
- [ ] **BLD-06-013** detail responses stop embedding large independently
  paginated collections such as comments/activity when dedicated endpoints
  own them.
- [ ] **BLD-06-014** dashboard/overview metrics are calculated in bounded
  grouped queries and reconcile to source lists.
- [ ] **BLD-06-015** exports and reports run asynchronously when they exceed an
  interactive page budget.

## Database Schema and Migration

### Required Invariants

- tenant key participates in scoped foreign keys and unique identities;
- project-owned records cannot reference another project's status, iteration,
  module, field, form, member, or workflow state;
- points, estimate, duration, budget, progress, probability, impact, and WIP
  ranges are checked;
- start/end and due/start rules are checked where PostgreSQL can express the
  invariant locally;
- soft-deleted rows have intentional partial uniqueness behavior;
- stable status/field identity is separate from mutable display text;
- canonical iteration replaces duplicate Sprint/Cycle references;
- customer/client references are tenant safe;
- project nullability on tickets is either justified by a live projectless
  workflow or migrated to `NOT NULL`.

- [ ] **BLD-06-016** schema audit records column nullability, default, check,
  FK, unique, delete behavior, and live service owner for every Build table.
- [ ] **BLD-06-017** duplicate or non-tenant-leading indexes are evaluated with
  `EXPLAIN (ANALYZE, BUFFERS)` before drop/add decisions.
- [ ] **BLD-06-018** common ticket predicates have tenant-leading composite
  indexes matching filter and sort order.
- [ ] **BLD-06-019** migrations are journaled, forward-only, and tested in a
  named disposable environment with realistic row counts.
- [ ] **BLD-06-020** backfill, dual-read/write if required, cutover, recovery,
  and constraint validation are documented for model consolidation.
- [ ] **BLD-06-021** no schema file is removed from static search alone; raw SQL,
  migration assertions, barrels, FKs, and module graph are checked.

## Pagination and Board Query Design

- keyset cursor includes the stable sort tuple and query fingerprint;
- per-column board query returns rows, next cursor, and exact or declared
  approximate count for that same predicate;
- filter option queries are independently paginated;
- count is omitted when expensive and unnecessary;
- offset pagination is limited to stable admin directories where page jump and
  total are a real requirement;
- concurrent writes do not create silent duplicate/omitted traversal within
  the documented consistency model.

- [ ] **BLD-06-022** replace global board auto-loading with per-column bounded
  continuation.
- [ ] **BLD-06-023** filtered and unfiltered boards expose identical
  completeness semantics.
- [ ] **BLD-06-024** cursor cannot be replayed with another actor, tenant,
  scope, filter, or sort.
- [ ] **BLD-06-025** count endpoints use the same authorization and filters as
  row endpoints.

## Write Reliability

- create, import, bulk, transition, rank, move, iteration completion, release,
  approval, automation, and agent execution are idempotent;
- outer transaction ownership is traced before side effects;
- activity/audit and durable outbox are written atomically with state;
- external providers run after commit through existing outbox machinery;
- optimistic concurrency prevents silent overwrite;
- partial success is an explicit result type, never inferred from Promise
  completion;
- retry is safe after network timeout at any point.

- [ ] **BLD-06-026** every write endpoint records transaction owner,
  idempotency scope, conflict rule, outbox effects, and retry response.
- [ ] **BLD-06-027** bulk and import cap record count, lock deterministically,
  and avoid one transaction per row.
- [ ] **BLD-06-028** rank updates handle concurrent drag and rebalance without
  global project locks or duplicate order.
- [ ] **BLD-06-029** provider/notification failures cannot roll back a durable
  committed write or falsely report it absent.

## Cache Policy

Caching is added only after query ownership and measured need are established.
Mutable filtered lists normally use database indexing plus TanStack Query.
Server caching is appropriate for expensive, bounded, permission-stable
aggregates only when invalidation can be proven.

Every cache has a writer matrix:

- key and tenant/actor/record scope;
- permission/access version;
- query-shaping filters;
- TTL and cardinality;
- all writers;
- post-commit invalidation;
- cache-unavailable behavior;
- organization switch, access revoke, archive, restore, and rollback behavior;
- cross-tab/client synchronization.

- [ ] **BLD-06-030** inventory every Build client and server cache and assign
  one owner.
- [ ] **BLD-06-031** mutation responses patch matching cached records before
  narrow invalidation; broad prefixes require written justification.
- [ ] **BLD-06-032** paginated invalidation does not refetch every loaded page
  when a bounded patch is possible.
- [ ] **BLD-06-033** access, client grant, approval, payment, or agent policy
  cache never authorizes an atomic write.
- [ ] **BLD-06-034** revoked access and organization switch remove stale data
  before rendering.
- [ ] **BLD-06-035** cache failure degrades to the database without returning
  cross-scope or falsely fresh data.

## Performance Budgets

Budgets are measured server time in a production-like named environment,
excluding client network latency unless stated:

- simple first-page list and detail: p95 at or below 300 ms;
- interactive mutation without provider work: p95 at or below 500 ms;
- dashboard/overview aggregate: p95 at or below 700 ms;
- filter option search: p95 at or below 250 ms;
- initial customer-visible page: usable content within 2 seconds on the agreed
  test profile;
- no request exceeds the platform timeout or performs an unbounded scan.

The release record must include dataset shape, concurrency, warm/cold state,
query plans, and p50/p95/p99; a local empty database is not evidence.

- [ ] **BLD-06-036** seed or anonymized production-like scale covers large
  tenant, many projects, skewed statuses, long history, and high-cardinality
  custom fields.
- [ ] **BLD-06-037** load tests cover board, All Work, My Work, search,
  dashboard, ticket detail, bulk, and portal.
- [ ] **BLD-06-038** slow query and endpoint telemetry include route, operation,
  tenant-safe cardinality, query count, and correlation ID.
- [ ] **BLD-06-039** performance regressions have alert thresholds and an owner.

## Acceptance

- [ ] **BLD-06-A01** controller classification reports zero unvalidated,
  unauthorized, uncontracted, or unbounded Build handlers.
- [ ] **BLD-06-A02** cross-tenant, wrong-project, scope-widening, portal-grant,
  and revocation database tests pass.
- [ ] **BLD-06-A03** query-count and plan checks pass for realistic list,
  detail, aggregate, and bulk flows.
- [ ] **BLD-06-A04** cache writer matrix and mutation invalidation regressions
  pass, including failure and rollback.
- [ ] **BLD-06-A05** performance budgets pass in the named environment and
  residual exceptions remain open with owner and evidence.
