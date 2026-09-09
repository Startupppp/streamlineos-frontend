# StreamlineOS complete 10/10 audit prompt

Copy and use the following prompt whenever a complete architecture and implementation recheck is required.

```text
Perform a complete, evidence-based 10/10 architecture and implementation audit of the entire StreamlineOS repository.

Repository:
D:\projects\personal\Streamlineos

Backend:
D:\projects\personal\Streamlineos\backend

Authoritative checklist:
D:\projects\personal\Streamlineos\architecture-refactor\prd\README.md

Scope:
Home, Organization, Authentication, organization-level RBAC, module-level RBAC, Settings, HRMS, Payroll, Build/PM, Billing, Payments, Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge Base, Wiki, Chatbot/AI, Workflows, shared infrastructure and integrations.

CRM and Inventory are completely excluded from ratings, findings, tickets, schema counts, API counts, performance counts and completion claims. Do not modify public landing-page visuals or animations.

## Audit rules

1. Inspect the current repository and current Git commits first.
   - Record root and backend commit SHAs.
   - Record dirty and untracked files.
   - Do not rely on old reports, stale PRD prose, previous ratings or historical evidence.
   - Every claim must match the current source tree.

2. Use parallel read-only agents for independent areas:
   - Organization, schema, tenancy and RBAC
   - Backend domains and database/query behavior
   - Frontend routes, components, TanStack Query and API contracts
   - Security, performance, caching, maintainability and release gates
   Do not run competing heavyweight builds or tests in parallel. Run heavy verification serially so the system does not hang.

3. A criterion is complete only when both conditions are true:
   - The implementation exists in the current source.
   - Relevant executable tests or gates pass against the current source.
   Historical evidence, static declarations, mocks or weak assertions alone do not count.

4. Never claim 10/10 when a required gate is stale, partial, skipped, inconclusive, mocked-only, environment-blocked or human-approval dependent.

## Audit every module at every layer

For each module inspect:

- Folder and file structure
- Controllers, handlers and services
- DTOs and Zod schemas
- Database tables, columns, keys, constraints, indexes and migrations
- REST and OpenAPI contracts
- Authorization and tenant isolation
- TanStack Query keys, parsing, invalidation and optimistic updates
- Caching and invalidation
- Pagination, filtering and sorting
- Query counts, N+1 calls and unbounded reads
- Async jobs, workers, queues, retries and idempotency
- Loading, empty, error, offline and permission states
- Accessibility and responsive behavior
- Security and privacy
- Tests and executable evidence
- Maintainability, cohesion and dependency direction

## Organization and RBAC

Verify all of the following:

- Organization owner, admin and member roles
- Module owner, admin and member roles
- Per-person permission grants
- DataScope and record-level authorization
- Owner immutability
- Administrative descendant protection
- Membership and invitation lifecycle
- Organization switching
- Membership, role, grant and module-access revocation
- Immediate session and cache invalidation after revocation
- Cross-organization reads and writes
- BOLA/IDOR behavior
- Exact 401, 403 and 404 responses
- Rejection of client-supplied orgId, userId and actorId impersonation
- Real database allow, deny and cross-tenant tests

## Billing and Payments

Verify:

- Plans, subscriptions and entitlements
- Seat counting and proration
- Usage metering and AI credits
- Idempotent payment events
- Replay-safe webhooks with real database uniqueness
- Immutable invoices and credit notes
- Tax and currency handling
- Provider failure, timeout, retry and recovery behavior
- Exact authorization assertions
- Every limited-resource creation path checks entitlement before insertion
- Frontend billing routes and failure states
- Provider-neutral adapter interfaces

## Chat

Verify:

- Channel, thread, member, message, reaction and attachment schema
- Channel and mutation authorization
- Ordering, fanout, unread state and reconnect behavior
- Attachment privacy and signed URLs
- Invite lifecycle, expiration and usage limits
- Offline and realtime behavior
- Query bounds and fanout cost
- Cross-channel and cross-tenant denial

## Calendar

Verify:

- One unified calendar
- RRULE-based recurrence
- Timezones and DST correctness
- Series-versus-instance edits
- Exceptions and conflict detection
- Durable reminders
- Local-first provider synchronization
- Idempotency, retry, cancellation, tombstones and drift reconciliation

## Inbox and Notifications

Verify:

- Incremental synchronization
- Conversation ordering and unread counts
- Idempotent send and receive
- Bounce, retry and DLQ handling
- Tenant-fair delivery
- Consent and suppression enforcement
- Offline and account-revocation behavior
- Provider response validation
- Exact cache invalidation for lists, threads, counts and dashboards

## Knowledge Base, Wiki and Chatbot/AI

Verify:

- Immutable revisions and conflict handling
- Attachments and ingestion lifecycle
- Chunk and embedding deduplication
- ACL enforcement inside search/vector retrieval, never after retrieval
- Permission revocation after indexing
- Purge, deletion and reindex behavior
- Recall, latency and corpus-size measurements
- AI gateway, streaming, cancellation, token metering and citation integrity
- Prompt, history, tool, output, concurrency and cost bounds

## Build and Project Management

Verify:

- Project, ticket, sprint, activity, backlog and report authorization
- DataScope enforcement
- Cursor pagination
- Bulk mutation atomicity
- Capacity and WIP limits
- Cache freshness and invalidation
- Realtime and optimistic concurrency behavior
- Cross-tenant 404 behavior
- Query-count and report-size bounds

## Database and query quality

Verify:

- Tenant-leading indexes
- Composite tenant foreign keys
- Referential integrity and migration safety
- Soft-delete and archive predicates
- No unbounded reads
- No N+1 or database calls inside growing loops
- Set-based or bounded bulk operations
- Minimal projections and no SELECT * on growing paths
- Production-shaped EXPLAIN plans where available
- Cursor pagination with unique tie-breakers
- Exact totals are opt-in or separately budgeted
- Empty, maximum-size and concurrent batch behavior

## API and contract quality

Verify:

- Every route has one canonical owner
- No duplicate, dead or overlapping endpoint
- Strict request validation
- Runtime response parsing
- OpenAPI exposure, request, response, error and path-parameter schemas
- Operation IDs are unique
- Frontend and backend contract documents match
- Contract drift fails closed
- No frontend business logic or database access

## Caching

Verify:

- Every key contains organization scope and all relevant subject, permission, resource and filter/version dimensions
- Permission-version or equivalent revocation safety
- List, detail, count, dashboard and search invalidation
- Cache stampede protection and single-flight behavior
- Redis outage and recovery behavior
- Safe degradation without authorization bypass or database storms
- No cross-tenant cache collision
- No stale negative authorization after revocation

## Security and privacy

Run or verify current tests for:

- BOLA/IDOR on reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and share-token routes
- Session fixation and replay
- Revoked memberships and permissions
- Invitations, password reset and MFA/recovery
- Brute-force and credential-stuffing protection
- CSRF, XSS, SSRF, SQL injection, unsafe redirects and path traversal
- CORS, CSP, security headers and payload limits
- File MIME, size, malware, quarantine and signed URL protection
- Secret and PII redaction
- GDPR export, correction, erasure, retention and legal-hold behavior

## Folder structure and maintainability

Verify:

- Authored files target 300 lines and do not exceed 500 without a documented exception
- No dependency cycles
- No forbidden new forwardRef usage
- No shallow pass-through modules
- Named handlers instead of anonymous inline handlers where required
- No unused imports, variables, functions, classes, constants, schemas, hooks, DTOs, files or dependencies
- No unsafe assertions or suppression directives
- No duplicate barrels, schemas, query keys or routes
- Dead-code deletion is proven by dependency/registration analysis, not grep alone
- Necessary migrations, runbooks, evidence, licenses, CLAUDE.md and AGENTS.md are retained
- Obsolete logs, scratch files, duplicate reports and completed session documents are removed only after dependency and evidence proof

## Performance and UX

Verify:

- Current production-build LCP <= 2.5 s
- Current production-build INP <= 200 ms
- Current production-build CLS <= 0.1
- Measurements cover every in-scope authenticated route and agreed reference devices
- No stale build ID or stale capture
- No unbounded hydration or rendering work
- Virtualized large collections
- Lazy-loaded editors, charts, calendars, media and AI surfaces
- HTTP compression for eligible text responses
- Asynchronous image/media transformations
- Loading, empty, error, retry, offline and permission states
- Keyboard, focus, screen-reader, contrast and responsive behavior at 375/768/1280 px
- Landing-page visuals and animations remain unchanged

## Verification procedure

1. Run lightweight static and self-test gates first.
2. Check current database identity and migration head.
3. Run focused module tests.
4. Run real-database allow/deny/cross-tenant tests where required.
5. Run provider sandbox tests where credentials are available.
6. Run builds and typechecks serially only when the host is quiet.
7. Run current production-build browser and Web Vitals evidence.
8. Run migration replay and catalog parity.
9. Run final architecture and release gates at one clean frontend/backend commit pair.
10. Do not count skipped, interrupted, stale, prerequisite-blocked or mocked-only results as passes.

For every command record:

- Command
- Exit code
- Duration
- Root and backend SHAs
- Database identity and fixture/data shape
- Pass, fail, skip and todo counts
- Artifact path and hash

## PRD reconciliation rules

- For every checked item in the PRD, verify current implementation and current executable proof.
- If either is missing, change it back to unchecked and explain why.
- Remove a completed TODO item only after both conditions are proven.
- Do not delete numbered traceability criteria if the fail-closed manifest requires them.
- Remove duplicate delta TODOs only when their accountable criterion is genuinely verified.
- Never mark deployed or human-approval criteria complete from local mocks.
- Keep CRM and Inventory explicitly excluded.
- Remove obsolete `.md`, `.log`, `.txt`, scratch and report artifacts only after consolidating durable evidence and proving dependency safety.

## Required final report

Return:

1. Current root/backend SHAs and worktree status.
2. Overall ratings for architecture, implementation, code-release readiness and production readiness.
3. Ratings for every in-scope module.
4. Ratings for RBAC, tenancy/RLS, database/schema, APIs/OpenAPI, query efficiency, pagination, caching, folders, maintainability, security/privacy, scalability, frontend performance, accessibility/UX and AI.
5. Completed criteria with exact current evidence.
6. Pending criteria with exact paths and failure reasons.
7. Separate code, deployed-environment and human-approval blockers.
8. Exact implementation changes required for 10/10.
9. Tests and gates not run, with reasons.
10. PRD updates made.
11. Files removed, retained or archived.
12. Final honest verdict.

Do not average away failures. Do not claim 10/10 unless every applicable code criterion has current implementation and executable proof. If production infrastructure or human approval is unavailable, state “code-level 10/10 release candidate” separately from “production-proven 10/10.”
```
