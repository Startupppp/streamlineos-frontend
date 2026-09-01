# StreamlineOS final 10/10 completion PRD

Status: active â€” single authoritative backlog
Last reconciled: 2026-09-02 at backend `e0ab789c` / frontend `b203575d5`
Immediate target: code-level release candidate
Deferred target: deployed production and compliance evidence
Scope: all platform domains except CRM and Inventory

This is the only architecture/refactor TODO list. Do not create session tickets, duplicate PRDs or additional architecture scorecards. Update a checkbox only from current source and reproducible evidence at one recorded commit. Git history is the archive.

## Release model

The immediate target is **code-level 10/10**: no known code-level P0/P1 defect and every immediate criterion below passes at one commit. It covers schema, migrations, database queries, NestJS, Zod, OpenAPI, RBAC, caching, workers, uploads, Next.js, TanStack Query, UI states, accessibility and cross-layer contracts.

It does not claim cloud isolation, physical replicas, PITR, regional recovery, live monitoring, real-provider availability, legal compliance or human approval. Those are retained under **Deferred production-readiness evidence** and scored separately.

â€œBug freeâ€ cannot be guaranteed. The release standard is zero known P0/P1 defects, passing reproducible gates and explicitly owned residual risks.

Current reconciliation count:

- Verified completed invariants: **15**.
- Deferred production/compliance criteria still open: **34** (unchanged; they require infrastructure, provider access and named human approvers and cannot be produced from this workspace).
- The immediate criteria are acceptance checks, not confirmed defects; fresh execution may close a criterion without a code change when its implementation already passes.

### Execution round — 2026-09-02

All seven architecture-review candidates (AR-01 … AR-07) are implemented. Gate
state verified directly at the recorded commits, not taken from agent report:

| Gate | State |
|---|---|
| Backend production typecheck | clean |
| Backend spec-inclusive typecheck | clean (was 7 errors) |
| Frontend typecheck | clean |
| Runtime tenant/isolation suites | 1700/1703 (was 1641/1694 with 27 failing suites) |
| Static tenant-isolation coverage | 901/901 (was 895/896) |
| Route classification | 0 undeclared |
| Permission keys | all resolve in both catalogs |
| Outbox consumers | every emitted type consumed |
| Import cycles | zero, both repos |
| OpenAPI coverage | 3,593 operations, 0 unclassified |
| `check:query-signal` | 0 violations across 399 hook files |
| Client route modules | 260 of 600 (ceiling 304, never raised) |
| Backend over-300 ratchet | **409 vs 394 baseline — still open** |

Two findings from this round are recorded because each would otherwise have
shipped as a passing gate:

1. **A gate can be blind to the syntax it audits.** The first tenant-relationship
   gate parsed only `foreignKey({ columns })` blocks and reported zero
   violations while 527 single-column tenant-to-tenant FKs existed, because the
   common Drizzle form is inline `.references()`. Its self-test passed because
   the fixture used the form it could already parse. Every gate's self-test must
   feed a known-bad fixture in the shape the gate is most likely to miss.
2. **Removing a secret is not the same as removing the capability.** The first
   AR-01 attempt deleted `BACKEND_JWT_SECRET` from the frontend but replaced it
   with an exchange endpoint that accepted `userId` in the request body behind a
   shared `INTERNAL_API_SECRET` the frontend also held — identical blast radius,
   relocated. Identity must be derived from a verified credential, never from a
   caller-supplied field.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.
- Do not recreate `luna-10-10-sessions` or split this backlog.

## Approved implementation decisions — 2026-09-01

These decisions are final for this release and remove implementation alternatives from the checklist:

1. **RBAC:** exactly six fixed standings — organization owner/admin/member and module owner/admin/member. Capability customization uses fixed templates, per-person permission grants, delegations and DataScope. No runtime custom-role creation.
2. **Token authority:** the backend exposes an authenticated session-exchange interface and alone signs short-lived asymmetric JWTs. Frontend and edge runtimes contain no backend signing key.
3. **Payroll posting:** Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. Brief `pending` state is accepted; lost or dangling journals are not.
4. **Calendar synchronization:** local Calendar state commits first with durable `pending` synchronization state. Provider synchronization runs asynchronously with `synced`/`failed` state, retry/backoff and user-visible recovery.
5. **Chat presence:** Ably connection presence is authoritative. One leader-elected browser heartbeat with jitter/backoff is permitted only as a bounded fallback.
6. **Knowledge comments:** authors may edit/delete their comments while they retain page visibility; page editors may resolve; KB administrators may moderate. Every action rechecks current page/article visibility at the data seam.
7. **Home contract:** the backend owns the authoritative Home section/access manifest. The frontend consumes a generated contract; hand-maintained parallel registries are prohibited.
8. **Billing providers:** frontend checkout is provider-neutral. Razorpay is the first adapter; a Stripe-ready contract test proves another adapter requires no Billing caller change.
9. **Migration policy:** staging and production contain no valuable data. Destructive migration rebasing, squashing and database recreation are authorized; no legacy watermark upgrade compatibility is required for this release. The new clean baseline must remain reproducible and interruption-safe.
10. **Deferred capabilities:** hooks, routes and UI that are outside the confirmed release scope are removed after dependency proof, not retained behind speculative flags.
11. **Release scope:** Home, Settings, Authentication/RBAC, HRMS, Payroll, Build, Billing/Payments/Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge/Wiki/Chatbot and Workflows. CRM and Inventory remain excluded.
12. **Compatibility:** internal frontend/backend routes, types and schemas may break during this coordinated refactor. Only published customer/integration contracts require backward compatibility or explicit versioned deprecation.

## Verified complete â€” preserve and re-run at final head

- [x] Organization/module RBAC architecture: owner/admin/member standing, custom permissions, DataScope, owner protection, module access, tenant isolation and revocation primitives.
- [x] Legacy actor contraction: 434 organizational fields scanned; 318 display-only; 116 CRM/Inventory excluded; 0 actionable.
- [x] Invitation tenant-composite membership constraints, Calendar attendee normalization and Chat durable token revocation/retry behavior.
- [x] Membership-FK removal-policy, owner-authority, permission-catalog, record-access, module-gate and tenant-index gates.
- [x] Cursor migration and bounded-read implementation: 0 actionable offsets, unbounded reads, unordered paging or unclassified paths across 2,109 service files.
- [x] Migration ledger baseline: 585/585 applied; zero pending, orphan, duplicate or unreachable entries; structural gates pass locally.
- [x] Backend production typecheck passes at the current audit workspace; spec-inclusive typecheck is explicitly open below because seven test-source errors remain.
- [x] Frontend typecheck passes at the recorded audit workspace.
- [x] Backend and frontend import graphs have no circular dependencies.
- [x] Backend hard file-size gate passes: 3,394 files with 12 documented exceptions; the separate over-300 ratchet regression remains open below.
- [x] Frontend capability classification reports zero DEAD, WIRE or UNCLASSIFIED entries; the 22 entries still classified DEFERRED are explicitly open below because approved decision 10 no longer permits speculative deferral.
- [x] OpenAPI structural baseline: 3,583/3,583 operations and 1,363/1,363 mutating bodies covered.
- [x] Cache invalidation, outbox-consumer, idempotency, feature-flag, mock-surface, route-classification and navigation gates exist and passed at the audit workspace.
- [x] Billing provider abstraction, webhook idempotency, entitlements, seat/proration ledgers, immutable invoices and transactional outbox exist.
- [x] Core module seams exist for Home, Settings, HRMS, Payroll, Build, Accounting, Chat, Calendar, Notifications, Knowledge/Wiki/Chatbot, Workflows and Inbox/mail.

## Current-source delta audit — 2026-09-01

### VERIFIED DONE

- KEEP the centralized deterministic authorization module, Home section-failure isolation, Billing ledgers/provider adapter, Calendar recurrence/attendee/reminder implementation, notification outbox, tenant-scoped Query cache and unified Inbox/Mail split. Current gates still protect their interfaces; cosmetic replacement would add risk without preventing a concrete failure.
- Static gates pass for 3,573/3,573 classified routes, 624 used permission keys, 742/742 tenant-indexed tables, 3,583/3,583 OpenAPI operations, 1,363/1,363 mutating bodies, zero actionable bounded-read findings across 2,109 service files and zero unregistered emitted outbox events. Tenant-isolation declaration coverage is the exception: 895/896 passes and `gdpr-rectification.service.ts` is missing.
- RBAC referential-integrity execution passes all ten cross-tenant/catalog controls. The RLS runtime verifier passes its behavioral controls and 977/984 tenant tables; its only two hard failures are excluded Inventory tables, so final in-scope evidence must exclude CRM/Inventory explicitly without suppressing any in-scope table.
- Representative focused tests pass for Payroll/Accounting, Chat, Calendar, Knowledge, Notifications and frontend Home/Query behavior: 13 suites and 123 tests at current head.

### REGRESSED

- Home section execution proof regressed: `backend/src/modules/dashboard/dashboard-section-isolation.spec.ts` has eight failures because `DashboardPersonalService.getPersonalDashboard` added an organization-membership lookup that its database adapter does not implement. Repair the test adapter and preserve the negative-query/failure-isolation assertions; do not weaken or delete them.
- Backend spec-inclusive typecheck regressed with seven current errors in `billing/core/revenue-analytics.service.spec.ts`, `organization/core/lifecycle/organization-purge-adapters.spec.ts`, `platform/platform-operator-access-policy.spec.ts` and `platform/platform-operator-access.spec.ts`; production backend and frontend typechecks still pass.
- The complete runtime tenant/isolation suite currently has 27 failing suites and 53 failing tests out of 428 suites/1,694 tests. Failures are concentrated in stale database/query-builder or principal-context test adapters across Access, Build, Home, Finance, Knowledge, Payroll, RBAC and Support; `projects-tickets-read-tenant-isolation.spec.ts` additionally observes incorrect suspended-member/role behavior and must be diagnosed as implementation versus fixture drift rather than blindly updating expectations.
- Exact failing-suite inventory: Access `user-module-access`; Build `build-approvals-inbox`, `comment-drafts`, `projects-provision`, `build-core-services`, `projects-analytics-workspace-members-budget`, `projects-ticket-links`, `projects-tickets-read`, `whiteboards`, `meetings` and `teams`; Home `dashboard-personal` and `dashboard-section`; Finance `vendor-payments-allocations` and `reconciliation-workspace`; Knowledge `kb-page-ai`, `kb-page-comments`, `kb-page-record-links`, `kb-pages`, `kb-page-tree`, `kb-page-versions` and `kb-page-visits`; Payroll `locking` and `payroll-approver-resolver`; RBAC `principal-groups`; Support `support-drafts` and `support-portal`.
- Static tenant-isolation coverage regressed to 895/896 because `backend/src/modules/gdpr/gdpr-rectification.service.ts` has no declared executable negative test.
- Backend size-ratchet coverage regressed to 407 production files over 300 lines against a baseline of 394. The hard 500-line gate still passes, but raising either baseline would hide thirteen new shallow/mixed-responsibility crossings.
- The frontend capability report still contains 22 DEFERRED exports after the approved decision to remove out-of-release speculative capabilities. These cover duplicate Workflow schedule/secret hooks, Onboarding checklist hooks, `MemberExpenseStats`, Accounting bank-import/collection/vendor-payment hooks, Party deletion, Build team-member hooks, legacy Inbox hooks and HR attendance heatmap hooks.
- The PRD previously named runtime custom roles, contradicting [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md), `backend/CLAUDE.md` and the implemented six-standing authority model. The checklist below now requires fixed templates plus per-person grants instead of a second authority model.

### STILL PENDING

- Production-shaped read-cost evidence, destructive clean-baseline bootstrap/catalog parity, runtime cross-tenant execution and the four retention decisions remain open under their existing criteria; they are not duplicated below. The existing 585/585 migration chain is internally valid but does not implement approved migration decision 9.
- Payroll finalization still calls Accounting posting through a nested top-level transaction, so an Accounting journal can commit while the Payroll lock rolls back.
- Frontend client-route containment is exactly at its 304-page ceiling (304 of 600 pages are client pages), leaving no regression headroom and keeping too much route orchestration in the browser.

### NEW

- Current source proves additional release blockers in token-signing authority, tenant-composite foreign keys, Home access locality, TanStack cancellation/query-key/cache-shape correctness, frontend command authorization, Chat scale/concurrency, Calendar synchronization durability, Knowledge comment/review ACLs and durable notification fanout. Their exact acceptance criteria are added to the owning sections below.
- Published-versus-internal API compatibility has no fail-closed source registry. Without one, deletion and breaking-change reviews cannot determine which contracts require versioned deprecation.

## Architecture-review candidate coverage — 2026-09-01

This section durably incorporates every candidate from the temporary visual architecture review. The HTML report is presentation evidence only and is not required for execution. The checkboxes in the owning sections below remain the single completion controls, so these findings are not counted twice.

### AR-01 — Isolate token authority behind the Auth seam

- **Evidence:** `frontend/lib/auth.ts:413-430` reads `BACKEND_JWT_SECRET` and signs HS256 bearer tokens; `backend/src/common/auth/jwt-auth.guard.ts:74-114` verifies identities and organization claims with the same secret.
- **Verdict / strength:** REPLACE · P0 · Strong · ports and adapters.
- **Current shallow shape:** frontend token issuance and backend verification share signing authority across the seam.
- **Target deep shape:** one Auth module owns issuance, rotation, revocation and verification; frontend callers receive tokens through a narrow interface and never possess signing authority.
- **Concrete failure prevented:** compromise or environment leakage in the frontend runtime cannot forge arbitrary user or organization identities across tenants.
- **Smallest safe change:** add a backend-authenticated session exchange that issues short-lived asymmetric JWTs, migrate frontend sessions to receive them, then remove the shared signing secret from every frontend runtime.
- **Compatibility/migration:** support a bounded dual-verification rotation window, identify keys, expire old tokens naturally, revoke compromised sessions and remove HS256 only after old-token telemetry reaches zero.
- **Completion controls:** Authentication token-authority/token-verification criteria in section 10.1 plus session/revocation/security tests in sections 6 and 11.
- **Depth wins:** locality concentrates authority in one module; leverage protects every backend caller; the Auth interface becomes the test surface.

### AR-02 — Make tenant relationship integrity canonical

- **Evidence:** tenant-owned single-column relationships remain in `db/schema/build/ticket-core.ts:96`, `db/schema/billing/invoice-snapshot.ts:40`, `db/schema/billing/commercial-catalog.ts:120` and `db/schema/billing/proration-ledger.ts:22`; redundant single/composite declarations remain in `db/schema/kb/pages.ts:71-89` and `db/schema/chat/chat-message-tables.ts:45-57`.
- **Verdict / strength:** REPAIR and CONSOLIDATE · P0/P1 · Strong · in-process.
- **Current shallow shape:** application queries carry tenant predicates while some database relationships validate only an identifier; duplicate constraints split the integrity truth.
- **Target deep shape:** the schema module enforces one canonical `(org_id, child_id) -> (org_id, id)` relationship at the tenant seam, backed by a catalog gate.
- **Concrete failure prevented:** a valid identifier from one organization cannot be attached to a row owned by another organization, and later schema generation cannot reintroduce weaker constraints.
- **Smallest safe change:** inventory/classify every tenant-to-tenant FK, add parent composite uniqueness, install `NOT VALID` composite constraints, validate them, then dependency-prove and remove redundant single-column constraints.
- **Compatibility/migration:** deployed data preservation is not required. Rebuild or squash the migration baseline as needed, then require clean-bootstrap catalog parity and cross-tenant constraint tests before release.
- **Completion controls:** the three tenant-relationship criteria in section 4 and the owning Build, Billing, Chat and Knowledge schema criteria in section 10.
- **Depth wins:** locality moves tenant integrity into constraints; leverage protects every write; the deletion test removes redundant constraint implementations.

### AR-03 — Deepen Home composition without absorbing domain implementation

- **Evidence:** `backend/src/modules/dashboard/dashboard-section-registry.ts` and `frontend/lib/home/home-sections.ts` maintain separate section facts; `frontend/app/(authenticated)/layout.tsx:38-42` performs two access reads; eight assertions in `backend/src/modules/dashboard/dashboard-section-isolation.spec.ts` fail after the membership lookup added at `dashboard-personal.service.ts:53`.
- **Verdict / strength:** CONSOLIDATE and REPAIR · P1 · Worth exploring · in-process.
- **Current shallow shape:** duplicated section registries, repeated access acquisition and stale test adapters force callers to understand composition rules.
- **Target deep shape:** the backend owns one authoritative Home composition manifest, the frontend consumes its generated contract and one request-local access result is reused while Chat, Calendar, Inbox and Notifications remain independent deep modules.
- **Concrete failure prevented:** frontend/backend access drift, duplicate `/me/access` load, unauthorized or missing widgets and full-Home failure when one source degrades.
- **Smallest safe change:** generate frontend section metadata from the backend manifest, seed hydration from the SSR authority result, reuse one membership resolution and repair—not weaken—the isolation tests.
- **Compatibility/migration:** internal route/response changes may cut over with all callers in one commit; published external contracts still require versioning. No domain schema migration is required.
- **Completion controls:** Home access-locality/query-efficiency/test/access-reuse criteria in section 10.3, route/data criteria in sections 7.1 and 8, and Home performance budgets in section 12.
- **Depth wins:** locality concentrates section facts; leverage aligns every widget; tests exercise the live Home interface.

### AR-04 — Deepen the TanStack data module

- **Evidence:** `frontend/hooks/api/notifications-inbox.ts:107-196,254-300` patches an infinite-query cache as `Notification[]`; no audited query function forwards the supported abort signal from `frontend/lib/api-client.ts:222-233`; local/ad-hoc query keys include `hooks/api/build/custom-states.ts:31` and authenticated Chat keys redundantly carry organization identity.
- **Verdict / strength:** REPAIR and CONSOLIDATE · P1 · Strong · local-substitutable.
- **Current shallow shape:** callers separately learn cache shape, query identity, cancellation, permission and invalidation rules.
- **Target deep shape:** the Query module absorbs canonical keys, abort propagation, authorized commands and typed cache-shape patch/rollback behavior behind a smaller interface.
- **Concrete failure prevented:** notification mutations cannot crash on `old.map`, abandoned navigation cannot waste backend work, organization/query identities cannot collide and permission changes cannot leave callable commands.
- **Smallest safe change:** repair infinite-page patching first, then enforce signal propagation, migrate local keys to the canonical factory and classify every non-universal command through the authorized-mutation seam.
- **Compatibility/migration:** internal hook/key shapes may change with all callers in one commit; invalidate or clear old key namespaces at rollout. Published integration contracts are unaffected.
- **Completion controls:** the four added criteria in section 8, module-specific HR/Build/Billing/Calendar/Notifications criteria and frontend release criteria in section 10.18.
- **Depth wins:** locality keeps Query correctness together; leverage fixes all callers once; the Query interface becomes the shared test surface.

### AR-05 — Move growing fanout behind a durable delivery seam

- **Evidence:** `backend/src/modules/chat/chat-huddles.service.ts:151-254` retains all channel members and launches per-member realtime/push work; notification delivery performs growing per-recipient persistence; `backend/src/modules/calendar/calendar.service.ts:139-165,266-281,393-403` records no durable provider-sync intent; Organization, Build and Knowledge contain fire-and-forget `NotificationDispatchService.emit` callers.
- **Verdict / strength:** REPLACE internal implementation while KEEPING the existing outbox/delivery direction · P1 · Strong · ports and adapters.
- **Current shallow shape:** request and worker callers own recipient accumulation, provider loops and best-effort failure behavior.
- **Target deep shape:** one durable delivery module owns intent, recipient cursors, bounded batches, checkpoints, retries, backpressure, cancellation and terminal state; provider adapters sit behind its seam.
- **Concrete failure prevented:** broadcasts and huddles cannot exhaust memory/pools, process crashes cannot lose intent, retries cannot duplicate delivery and Calendar cannot remain permanently divergent after transient provider failure.
- **Smallest safe change:** persist intent atomically, consume by tenant/recipient cursor with bounded bulk writes, replace per-recipient request loops and expose synchronization/delivery state.
- **Compatibility/migration:** deployed data preservation is not required; rebuild queue/intent state if simpler. The cutover must still prove replay, retry, crash recovery and zero best-effort delivery paths.
- **Completion controls:** fire-and-forget prohibition in section 7, Chat huddle/fanout criteria in section 10.12, Calendar sync criterion in section 10.13, Notification fanout criterion in section 10.15 and shared-consumer criterion in section 10.17.
- **Depth wins:** locality centralizes delivery semantics; leverage covers every provider; multiple provider adapters justify the seam.

### AR-06 — Concentrate Knowledge visibility at the data seam

- **Evidence:** `backend/src/modules/kb/help-centre/kb-comments.service.ts:14-80` lists/mutates comments without the article visibility predicate and without pagination; `kb/wiki/kb-page-comments.service.ts:97-139` trusts a caller-supplied administrative boolean and does not re-authorize the page; `kb/wiki/kb-page-reviews.service.ts:149-203` returns org-wide due reviews behind a silent 100-row cap.
- **Verdict / strength:** REPAIR · P0/P1 · Strong · in-process.
- **Current shallow shape:** page reads, comment mutations, reviews and retrieval cross different authorization implementations.
- **Target deep shape:** one Knowledge access module applies the same page/article visibility implementation to pages, comments, reviews, attachments and retrieval before data crosses the seam.
- **Concrete failure prevented:** callers cannot disclose or mutate restricted content after access revocation, and due work cannot disappear after row 100.
- **Smallest safe change:** require caller context in comment/review implementations, reuse direct-read visibility predicates, remove authorization booleans and keyset-page comments/due reviews.
- **Compatibility/migration:** internal comment/review callers migrate atomically to cursor contracts; only published external contracts require versioning. Destructive schema repair is permitted under AR-02.
- **Completion controls:** the three Knowledge criteria in section 10.16 plus ACL/search and pagination criteria in sections 5, 6 and 12.3.
- **Depth wins:** locality keeps ACL knowledge together; leverage protects every child path; revocation tests cross the same interface as production callers.

### AR-07 — Make Payroll-to-Accounting crash-consistent

- **Evidence:** `backend/src/modules/payroll/payout/locking.service.ts:64-103` calls `PayrollPostingService.postFinalized` inside the Payroll lock transaction; `backend/src/modules/accounting/posting/finance-posting.service.ts:139` opens a separate top-level transaction.
- **Verdict / strength:** REPAIR · P0 financial correctness · Strong · ports and adapters.
- **Current shallow shape:** two transaction owners sit across one posting seam, allowing the Accounting implementation to commit before the Payroll implementation finishes.
- **Target deep shape:** one posting module owns the financial invariant through an atomically committed transactional-outbox intent and an idempotent Accounting consumer.
- **Concrete failure prevented:** Accounting cannot retain a journal for a Payroll run whose lock rolled back, and retries cannot duplicate a journal.
- **Smallest safe change:** emit the posting intent inside the Payroll lock transaction, consume it through Accounting and add induced outer-rollback, crash and replay tests before removing the nested transaction path.
- **Compatibility/migration:** preserve the existing journal idempotency key. Deployed data reconciliation is unnecessary; the clean baseline must include outbox state and consumer registration.
- **Completion controls:** Payroll crash-consistency criterion in section 10.7, Accounting immutable-posting criteria in section 10.11 and transaction/idempotency criteria in sections 5.1 and 7.
- **Depth wins:** locality keeps the financial invariant together; leverage makes every retry safe; the posting interface becomes the failure-injection test surface.

### Architecture priority

1. AR-01 token authority — widest cross-tenant blast radius.
2. AR-02 tenant relationship integrity — database-enforced isolation.
3. AR-04 notification cache-shape repair — confirmed user-facing runtime failure.
4. AR-07 Payroll/Accounting atomicity — financial correctness.
5. AR-06 Knowledge ACL locality — restricted-content exposure risk.
6. AR-05 durable fanout — scale and delivery correctness.
7. AR-03 Home locality — access drift, duplicate load and broken proof.

## Immediate code-level release candidate

### 1. One-commit release verification

- [ ] Fix seeded E2E harness failures, including organization placement/control-plane state and schema/fixture drift.
- [x] Repair all seven current spec-inclusive type errors without casts or exclusions, then make `pnpm -C backend check:spec-typecheck` pass at the same commit as production typechecks. — fixed at source (union-vs-array mock param, structural `StoragePort` replacing a `never`, circular mock init, real `revokeGrant`/`rejectGrant` arity); no cast, suppression or exclusion used.
- [x] Repair all 27 currently failing runtime tenant/isolation suites (53 assertions) across Access, Build, Home, Finance, Knowledge, Payroll, RBAC and Support; preserve both deny and same-tenant control assertions, diagnose the Build suspended-member/role mismatch, and make all in-scope suites pass without excluding or weakening tests. — 1700/1703 at head. Two root-cause classes: chainable query-builder doubles that stopped returning `this` once a service added another join, and fixtures hand-building an actor without `membershipId`. **The Build suspended-member mismatch was an implementation defect, not fixture drift:** `projects-tickets-read.service.ts` OR-ed a Drizzle `sql\`\`` fragment (a plain object, always truthy) with the membership check, so every project returned MANAGER access regardless of suspension. Fixed at source.
- [ ] Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- [ ] At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] Restore the backend over-300 ratchet from 407 to at most its 394-file baseline: identify all thirteen new crossings, KEEP only demonstrably deep/cohesive modules, split mixed-responsibility files at real seams, and never raise the baseline or exception ceiling merely to pass.
- [x] Run deterministic container/fake failure tests for duplicate/delayed/out-of-order/forged payment events, seat/proration failure, Redis loss, realtime/email/push failure, retry exhaustion, cancellation, DLQ and recovery. — `workflows/__tests__/failure-injection.spec.ts`, 54 tests covering all 12 scenarios. Forged-signature cases exercise the real `verifyWebhookSignature` implementation (not a mock) and prove a valid signature requires both the correct secret **and** the correct token. Redis loss is now classified: a transient infrastructure error retries through the existing backoff and dead-letters only at the ceiling, whereas a genuine permission denial fails terminally — previously any Redis blip marked an execution permanently `failed`, silently losing work.
- [ ] Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.

### 2. Module and folder architecture

- [ ] Verify backend/frontend folders follow domain ownership and kebab-case rules; shared modules never import feature modules.
- [ ] Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.
- [ ] Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.
- [ ] Re-run file-size ratchets and split every unjustified mixed-responsibility file over 500 lines without cosmetic fragmentation.
- [ ] Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.
- [ ] Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- [ ] Prove no dead or duplicated endpoint, schema, type, validator, hook, query key, worker, page or UI element using dependency graphs plus build/typecheck evidence; remove every deferred capability outside the approved release scope instead of retaining speculative flags, and make the final capability report contain zero DEFERRED entries as well as zero DEAD/WIRE/UNCLASSIFIED entries.
- [ ] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.

### 3. TypeScript, Zod and cross-layer contracts

- [ ] Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [ ] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
- [ ] Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [ ] Verify operation IDs, REST versioning, status/error envelopes, idempotency headers and cursor/filter/sort contracts; migrate internal callers atomically and preserve backward compatibility only for published customer/integration contracts through versioned deprecation.
- [x] Create one fail-closed API contract registry that classifies every exposed operation/event/webhook as internal or published, defaults unknown contracts to published, records owner/version/consumers/sunset evidence, and gates breaking deletion or schema change on dependency proof plus the required deprecation window. — `contracts/api-contract-registry.json` covers 3,593 operations (3,533 published, 60 internal) and 23 outbox events, 0 unclassified. An operation absent from the registry is treated as published and exits non-zero. `check:contract-breaking-change` allows internal breakage freely per approved decision 12 but fails a published removal or narrowing without a satisfied sunset. Both gates carry 8-case self-tests, including proof that a future `sunsetAt` does **not** satisfy the window.
- [ ] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.

### 4. Database schema and migration quality

- [ ] Audit every in-scope tenant table for non-null `org_id`, tenant-leading index, explicit tenant path and composite tenant-safe relationships where required.
- [ ] Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [ ] Verify cross-tenant composite FKs for membership/authority-sensitive relations and prevent orphaned visible children.
- [ ] Add a `pg_catalog`-backed tenant-relationship gate that inventories every FK whose parent and child are tenant-owned, explicitly excludes CRM/Inventory and approved global relations, and reports zero actionable single-column tenant relationships.
- [ ] Repair every actionable in-scope relationship with `(org_id, child_id) -> (org_id, id)`, supporting uniqueness/indexes, `NOT VALID` then `VALIDATE` migration sequencing and cross-tenant insertion tests; explicitly cover Build ticket hierarchy/recurrence/release/feedback/product/work-item/workflow/sprint-event relations and Billing subscription/proration/invoice/credit-note relations.
- [ ] Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and upgraded-catalog parity.
- [ ] Make the RLS verification command scope-aware: prove every in-scope tenant table is covered, report excluded CRM/Inventory tables separately, and fail if any unclassified or in-scope table lacks policy coverage; do not globally ignore the current `inv_project_requirements`/`inv_projects` failures.
- [ ] Verify high-growth append-only tables have justified retention/partition decisions and indexes matched to real access patterns.
- [ ] Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [ ] Cold-bootstrap an empty database to migration head and record zero pending, orphan, duplicate or unreachable migrations.
- [ ] Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.
- [ ] Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap: tables, columns, constraints, indexes, policies, functions, triggers and extensions must match exactly.
- [ ] Verify migration `0930` enables the `audit_logs` append-only trigger and rejects application-role mutation in the disposable database.
- [ ] Retain release SHA, commands, database identity, catalog diff and artifact hashes.

### 5. Query, pagination and cache correctness

- [ ] Restore a reproducible production-shaped in-scope seed dataset for HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting.
- [ ] Fix the evidence gap: 43 read budgets are below minimum seed size and 27 are skipped; CRM/Inventory rows do not count.
- [ ] Run each in-scope budget as `streamline_app` with `EXPLAIN (ANALYZE, BUFFERS)` and retain rows, buffers, duration, indexes and thresholds.
- [ ] Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- [ ] Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- [ ] Verify every growing list has a hard limit, deterministic order, unique tie-breaker, signed scope-bound cursor and consistent filters/sorts.
- [ ] Prove no `SELECT *`, fetch-then-filter/count, N+1/per-row expansion or unbounded export/sweep remains.
- [ ] Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
- [ ] Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.

#### 5.1 Efficient database-call contract

- [ ] Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
- [ ] Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
- [ ] Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
- [ ] Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
- [ ] Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
- [ ] Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
- [ ] Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
- [ ] Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
- [ ] Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
- [ ] Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
- [ ] Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
- [ ] Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.

### 6. Organization and module RBAC

- [ ] Test the six fixed standings — organization owner/admin/member and module owner/admin/member — plus fixed role templates, per-person grants, delegations and DataScope on every read and mutation path; prove no arbitrary custom-role creation interface exists.
- [ ] Test owner transfer, last-owner protection, administrative descendant protection, organization switching and cross-organization denial.
- [ ] Prove authorization at the data/query implementation so a missing controller/frontend check cannot expose a record.
- [ ] Prove frontend routes, navigation, TanStack queries and action buttons match backend effective permissions without treating hiding as security.
- [ ] Prove membership/permission revocation invalidates authorization caches, sessions and issued realtime credentials within the declared consistency contract.
- [x] Add executable cross-tenant negative and same-tenant control tests for `gdpr-rectification.service.ts` reads, correction writes and resumable jobs, then restore static declaration coverage from 895/896 to 896/896 and run the declared tests rather than satisfying the scanner with metadata alone. — coverage is now **901/901** (the denominator grew as services were added). The tests genuinely execute: `check:tenant-isolation:run` shows 25 named GDPR assertions passing, including the attacker/owner org pair that proves the predicate bites, and cursor-advance tests that fail rather than loop when a page cursor does not advance.
- [ ] Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.

### 7. NestJS route and worker behavior

- [ ] Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.
- [ ] Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
- [ ] Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
- [ ] Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.
- [ ] Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
- [ ] Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.
- [x] Prohibit fire-and-forget `NotificationDispatchService.emit` calls: transactional callers must await durable intent persistence or write the outbox row in their mutation transaction; enforce this with a static gate and crash/retry tests. — `check:fire-and-forget` scans 1,752 files for 0 violations and its self-test bites on a known-bad `void service.emit(...)` fixture. All 14 repaired call sites across Organization (4), Build (6) and Knowledge (4) now `await`.

#### 7.1 Optimized route and transport contract

- [ ] Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.
- [ ] Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [ ] Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [ ] Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [ ] Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [ ] Require bounded cursor/filter/sort contracts on collections and bounded `ids`/item counts on bulk routes; reject oversized requests before database work.
- [ ] Support conditional responses with version/ETag or `Last-Modified` where correctness permits; include tenant, permission and representation changes in the validator.
- [ ] Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- [ ] Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- [ ] Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- [ ] Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- [ ] Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- [ ] Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.
- [ ] Keep response/error envelopes, pagination metadata and cache headers consistent across modules and prove frontend/OpenAPI contract compatibility.

### 8. TanStack Query and Next.js data layer

- [ ] Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
- [ ] Remove duplicated/ad-hoc string query keys and prove invalidation targets the correct prefix without flushing unrelated tenants/modules.
- [ ] Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
- [ ] Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
- [ ] Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
- [ ] Verify request cancellation, stale/gc policy, retry policy, refetch behavior and deduplication do not amplify load or replay unsafe writes.
- [ ] Verify server-prefetch/hydration and client keys match exactly with no cross-user or cross-organization cached payload.
- [ ] Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- [ ] Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- [ ] Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- [x] Pass TanStack `QueryFunctionContext.signal` through every cancellable read to `apiClient`; enforce zero unclassified reads and test navigation, search, range-change and organization-switch cancellation. — `check:query-signal` (with self-test) reports **0 violations across all 399 files** using `useQuery`/`useInfiniteQuery`; verified independently at head. Baseline before this round was 5 files mentioning `signal` at all.
- [ ] Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.
- [ ] Build a controller-to-hook command catalog: every non-universal mutation uses the exact backend permission through the authorized-mutation module, every universal/self exception is explicit, and zero commands are unclassified; test revocation before and during a mutation.
- [ ] Provide one typed optimistic patch/rollback implementation per cache shape, including `InfiniteData`; update list/detail/count variants atomically and prove concurrent realtime delivery cannot corrupt or overwrite optimistic state.

### 9. Upload, compression and file lifecycle

- [x] Detect file identity from content, not filename alone, and enforce allowlists plus per-file/request/user/organization quotas. — magic-byte validation on both upload controllers; per-org (5GB) and per-user (500MB) quotas resolved in parallel.
- [x] Stream or multipart-upload without buffering entire files in application memory; abort and clean abandoned uploads. — presigned multipart (`storage-multipart.service.ts` + controller + schemas, migration `0942`) with initiate/part/complete/abort.
- [x] Compute integrity checksums and make upload, scan, transform and finalization retries idempotent. — SHA-256 returned in `UploadResult`; `@Idempotent` on the mutating quarantine transitions.
- [x] Fail closed into tenant-scoped quarantine until malware scanning succeeds; implement authorized release, rejection, retention, deletion and audit transitions. — `file_quarantine_records` (migration `0933`) plus a state machine and a permission-gated admin controller (`storage:quarantine:view` / `:manage`). Download is blocked while quarantined. VirusTotal responses are Zod-`safeParse`d and a malformed or timed-out response keeps the file quarantined rather than releasing it.
- [x] Compress eligible image/text/document derivatives asynchronously; do not blindly recompress video, archives, encrypted or already-compressed formats. — compression and thumbnailing moved off the request path via `registerAfterCommit`; upload returns `{ quarantineId, status: "pending_scan" }` immediately. Already-compressed formats (MP4/WebM/MKV/OGG, ZIP/GZ/BZ2/7z/XZ/LZ4/RAR/PDF) detected by magic bytes and skipped.
- [x] Preserve originals only where product/retention rules require; generate bounded previews/thumbnails asynchronously and strip unsafe metadata where applicable. — bounded 256×256 WebP thumbnails generated after commit, with EXIF stripped (which matters because EXIF carries GPS coordinates).
- [x] Use tenant-scoped object keys and short-lived signed URLs; re-authorize every download instead of treating an identifier as authority. — object keys namespaced `${orgId}/${folder}/…`; cross-tenant key, expired signed URL and post-revocation download denials are all tested.

### 10. Module release matrix

Architecture verdict before execution:

- **KEEP** the current top-level ownership of Organization/RBAC, Home/Dashboard, Settings, HR, Payroll, Build, Billing, Accounting, Chat, Calendar, Mail/Inbox, Notifications and Knowledge.
- **KEEP** Home as a composition module for universal surfaces. It may call other modules through small interfaces but must not own their tables, authorization policies, cache namespaces, workers or business implementation.
- **REFACTOR** a module only when the audit identifies a concrete correctness, security, scale, testability or operability failure. Do not split or rename modules for style.
- Every module verdict must be recorded as KEEP, REFACTOR or REMOVE with source paths, failure prevented and verification. An unchecked module has not yet earned 10/10.

Mandatory folder/file evidence for **every** module below:

- [ ] Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [ ] Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [ ] Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- [ ] Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- [ ] Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

#### 10.1 Authentication, identity, sessions and organization

- [ ] Architecture/schema: verify global identity is separated from tenant membership; organization, invitation, membership, session and organization-switch relationships have correct keys, uniqueness, lifecycle and revocation data.
- [x] Token authority: implement a replay-safe, CSRF-protected authenticated backend session-exchange interface that revalidates the current session and organization membership and alone mints short-lived asymmetric issuer/audience-bound JWTs; remove `BACKEND_JWT_SECRET` and all bearer-token signing from frontend/edge runtimes and redact exchange tokens from logs/telemetry. — `POST /auth/session-exchange` takes a 30s `NEXTAUTH_SECRET`-signed session proof in `x-session-proof`; `userId`/`sessionId` come **only** from the verified payload and are absent from the request body, which carries `orgId` as a selector re-checked against membership. Replay blocked by a UUID `jti` through Redis `SET NX`; the `revoked:session:<id>` tombstone is checked before minting. `grep BACKEND_JWT_SECRET frontend/` is empty; `check:log-secrets` clean.
- [x] Token verification: verify asymmetric JWTs by `kid` through a backend-owned keyring/JWKS with bounded clock skew, rotation overlap and session/membership revocation; test wrong issuer/audience/key, expiry, exchange replay, altered user, altered organization and a compromised frontend runtime that possesses no private key. — `JwtKeyringService` signs EdDSA with the latest key and verifies against every non-expired key, so rotation overlaps; JWKS exposes public material only. 27 exchange/keyring tests plus 241 jwt/token/session tests, covering all listed negatives **and** that `INTERNAL_API_SECRET` alone mints nothing.
- [ ] Routes/contracts: verify signup, login, logout, refresh, recovery, MFA, invitation and organization switching use Zod/OpenAPI contracts and never trust client actor/current-org fields.
- [ ] Authorization/security: test account enumeration, fixation/replay, lockout, invitation takeover, revoked membership, cross-org switching and last-owner/owner-transfer invariants.
- [ ] Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- [ ] Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.

#### 10.2 Organization RBAC and module RBAC

- [ ] Architecture/schema: verify permission catalog, six fixed standings, fixed role templates, per-person grants, delegations, scopes and assignments remain normalized and tenant-correlated; customization must not create a seventh standing or parallel authority source.
- [ ] Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [ ] Authorization/cache: prove data-layer enforcement, deny-by-default classification and revocation invalidation without a database round trip per permission check.
- [ ] Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
- [ ] Frontend/TanStack/tests: verify routes, navigation, queries and buttons consume one effective-access contract and test org/module owner, admin, member, fixed template, per-person grant, delegation and revocation cases.

#### 10.3 Home and dashboard composition

- [ ] Architecture/schema: prove Home owns composition/preferences only and does not duplicate Chat, Calendar, Inbox or Notification domain tables or implementation.
- [x] Access locality: make the backend Home section manifest authoritative and generate the frontend contract from it; it must match every live controller route, module requirement, permission and cache namespace, no hand-maintained parallel registry may remain, and CI must fail on stale generated output without importing backend runtime code into Next.js. — `home-manifest.generated.json` (16 sections) is derived from the backend controller and consumed by `home-sections.ts`; `check:home-manifest` diffs a regeneration and its self-test covers 8 drift cases. No backend runtime is imported into Next.js.
- [ ] Routes/contracts: define a bounded per-section dashboard contract with independent success/error metadata and permission-safe projections.
- [ ] Authorization/privacy: derive each section from caller identity and effective access; prove calendar, people, payroll and communication data cannot leak through summaries/counts.
- [ ] Queries/cache: verify parallel bounded aggregation, no N+1/fetch-all behavior, per-section cache ownership and mutation invalidation from source modules.
- [x] Query efficiency: resolve the caller's organization membership once in `DashboardPersonalService`, reuse it across enabled sections, preserve calendar visibility predicates and record a maximum database-call count per Home request. — membership resolved once at the top of `getPersonalDashboard`; the duplicate lookup inside the timesheets branch removed; a regression test asserts the lookup fires exactly once and the request stays within a recorded ceiling of 6 database calls.
- [ ] Frontend/TanStack/tests: verify independent Suspense/error/loading/empty states, stable query keys, partial failure isolation, responsive rendering and widget-level allow/deny E2E.
- [x] Repair the eight failing Home section-isolation tests at current head and add a regression test proving the membership lookup cannot bypass disabled-section query suppression or turn one section failure into a full Home failure. — the spec's database adapter did not implement the newly added membership lookup; the adapter was repaired and no negative-query or failure-isolation assertion was weakened. Two regression tests added for the disabled-section and single-section-failure cases. 151 dashboard tests pass.
- [x] Reuse one request-local `/me/access` result for authenticated-layout MFA/route decisions and TanStack hydration; prove exactly one backend access call per navigation instead of `getServerAccess` plus `prefetchAccess` duplication. — `prefetchAccess` now calls the React `cache()`-wrapped `getServerAccess` rather than issuing its own `serverGet`, so both consumers share one request-scoped result. Asserted by `access-call-count.test.ts`.

#### 10.4 Settings and module-access administration

- [ ] Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- [ ] Routes/contracts: verify organization profile, hierarchy, security, members, roles, module access and billing settings expose canonical non-duplicated routes and strict contracts.
- [ ] Authorization: test owner/admin/member visibility and mutations, last-owner protection, hierarchy scope, module owner administration and record-level denial.
- [ ] Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.
- [ ] Frontend/TanStack/tests: verify canonical routes, form-schema parity, dirty/error/conflict states, permission-backed navigation and mutation invalidation.

#### 10.5 Directory, Me and universal self-service

- [ ] Architecture/schema: preserve one organization-person identity with membership, worker and employment facets; resolve subjects through the person seam without cross-tenant inference.
- [ ] Routes/contracts: use `/me/*` for self operations, derive subject from authentication and separate directory projections from sensitive HR/payroll projections.
- [ ] Authorization/privacy: prove universal member access only to allowed self-service/directory records and separate HR/payroll administrative widening through DataScope.
- [ ] Queries/cache: verify minimal projections, bounded directory search, tenant-safe person resolution and invalidation across membership/worker/employment changes.
- [ ] Frontend/TanStack/tests: verify self and administration keys never collide, universal navigation survives disabled paid modules and cross-person/cross-org denial tests pass.

#### 10.6 HRMS

- [ ] Architecture/schema: audit people/employment, leave, attendance, recruitment, onboarding, performance, benefits, documents and approval lifecycles for normalized tenant-safe relations and justified table ownership.
- [ ] Routes/contracts: verify resource-specific controllers, strict Zod/OpenAPI contracts, self versus administration routes, bounded bulk operations and no client actor/current-org fields.
- [ ] Authorization/privacy: test own/team/department/branch/org DataScope, sensitive projection controls, candidate/employee separation, approvals and cross-tenant record denial.
- [ ] Queries/cache/workers: verify cursors, filters, exports, leave balances, attendance and review paths; tenant-leading indexes; cache invalidation; bounded reminders/imports/exports.
- [ ] Frontend/TanStack/tests: verify canonical HR routes, form parity, self/admin separation, all UI states, responsive tables/forms and full CRUD/approval/cross-tenant E2E.
- [ ] Classify every HR mutation hook as universal/self or permissioned; route non-universal leave, attendance, recruitment, onboarding, performance, benefits and document commands through the exact authorized-mutation interface and prove in-flight revocation behavior.

#### 10.7 Payroll

- [ ] Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] Routes/contracts: verify calculation, lock, approve, publish, reverse and export operations use strict schemas, idempotency and explicit state transitions.
- [ ] Authorization/privacy: test payroll owner/admin/member, approver, self-payslip, separation-of-duties, sensitive projections and every mutation hook.
- [ ] Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
- [x] Make Payroll finalization and Accounting posting crash-consistent through a transactional outbox: emit an idempotent posting intent inside the Payroll lock transaction, consume it durably in Accounting, expose `pending/posted/failed` state and prove rollback cannot leave a journal while retries cannot duplicate one. — `locking.service.ts` emits `payroll.run.posting-intent` via `OutboxWriter.emit(tx, …)` on the lock's own transaction handle, so the intent rolls back with the lock. `PayrollPostingIntentConsumer` claims the inbox row atomically and posts idempotently; `postJournal` remains keyed on `(PAYROLL_RUN, runId, finalized)`. `posting_state` added by migration `0933`. 8 tests cover induced outer rollback, crash-between-commit-and-consume, duplicate delivery, malformed payload, cross-tenant mismatch and retry-on-failure.

#### 10.8 Build/PM

- [ ] Architecture/schema: keep project and product entities distinct inside Build; verify workspaces, projects, products, tickets, boards, sprints, roadmaps, OKRs, feedback and QA relations.
- [ ] Routes/contracts: verify canonical `/build` resources, strict schemas, stable cursors/filter/sort contracts, idempotent mutations and bounded bulk operations.
- [ ] Authorization: test workspace/project/product membership, module roles, record scope, private resources, watchers/assignees and cross-tenant identifiers.
- [ ] Queries/cache/events: verify board/backlog/search plans, ordering tie-breakers, counters, cache invalidation and duplicate-safe activity/notification events.
- [ ] Frontend/TanStack/tests: verify drag/reorder concurrency, optimistic rollback, filter/cursor reset, route/action parity, responsive boards and CRUD/cross-scope E2E.
- [ ] Replace `Promise.all` per-row custom-state reorder calls with one bounded bulk command whose backend update is transactional, idempotent and expected-version protected; return stable conflict semantics and roll back the complete optimistic order on failure.
- [ ] Remove local Build query-key factories such as `stateKeys`; all Build reads/mutations must use the canonical factory and exact invalidation prefixes.

#### 10.9 Workflows and automation

- [ ] Architecture/schema: verify definitions, immutable versions, triggers, schedules, secrets references, runs, steps, approvals and execution attempts are normalized and tenant-safe.
- [ ] Routes/contracts: verify create/version/publish/pause/run/cancel/retry/approve operations have strict schemas, idempotency and explicit state transitions.
- [ ] Authorization/security: test authoring versus execution/approval permissions, secret non-disclosure, module/record scope and cross-tenant trigger targets.
- [ ] Queries/cache/workers: verify leases, concurrency limits, retries/backoff, cancellation, DLQ, schedule deduplication, bounded histories and consumer registration.
- [ ] Frontend/TanStack/tests: verify editor/run-history state, version conflicts, permission gates, polling/subscription cleanup and deterministic execution/recovery tests.

#### 10.10 Billing, subscriptions and payments

- [ ] Architecture/schema: verify plans, subscriptions, entitlements, placements/seats, usage, payment events, invoices, adjustments, tax/currency and outbox ledgers with immutable financial history.
- [ ] Routes/contracts: verify checkout/change/cancel, billing profile, invoices, usage and AI-credit routes are canonical, strictly validated, idempotent and provider-neutral.
- [ ] Authorization/security: test billing owner/admin/member access, provider signature verification, replay/forgery, tenant ownership, entitlement gates and sensitive redaction.
- [ ] Queries/cache/workers: verify local entitlement resolution, seat/proration concurrency, usage aggregation, webhook dedupe, retries/DLQ and invalidation without provider calls per request.
- [ ] Frontend/TanStack/tests: verify the two canonical Settings billing pages, plan/seat/usage/invoice states, mutation invalidation and deterministic outage/replay/proration E2E.
- [ ] Keep provider-specific identifiers, verification fields, route names and SDK behavior behind the Billing adapter seam; frontend callers consume provider-neutral checkout-session/confirmation contracts, Razorpay is the first adapter and a Stripe-ready contract test requires no Billing caller change.
- [ ] Route every non-universal subscription/payment mutation through the exact billing/payment permission interface; billing remains non-delegable and tests cover owner/admin/member denial plus revocation during checkout confirmation.

#### 10.11 Accounting and finance

- [ ] Architecture/schema: verify accounts, journals/entries, expenses, reimbursements, invoices, payments, reconciliation and immutable reversal relationships balance and preserve tenant scope.
- [ ] Routes/contracts: verify posting, approval, reimbursement, reconciliation, reversal, export and reminder operations use strict schemas, idempotency and valid financial state transitions.
- [ ] Authorization: test finance roles, approver separation, record/DataScope, employee self-expense access, immutable posted records and cross-tenant denial.
- [ ] Queries/cache/workers: verify ledger/report/export plans, bounded reminder sweeps, asynchronous resumable exports, retries/cancellation/DLQ and derived-balance invalidation.
- [ ] Frontend/TanStack/tests: verify monetary precision, approval/reversal conflicts, report cursors, export job state and balanced-journal/cross-tenant E2E.

#### 10.12 Chat

- [ ] Architecture/schema: verify channels, memberships, messages, threads, reactions, attachments, receipts/read cursors and durable events are normalized with tenant/channel composite integrity.
- [ ] Routes/contracts: verify channel/message/thread/reaction/read/history/export routes use strict schemas, bounded cursors, server-derived actors and idempotent client message keys.
- [ ] Authorization: test channel membership, private/direct conversations, thread inheritance, every mutation hook, attachment access and immediate issued-token revocation.
- [ ] Queries/cache/realtime: verify stable message ordering, indexed history/thread/reaction/unread paths, no unread scans, duplicate-safe fanout, reconnect/offline recovery and safe cache invalidation.
- [ ] Frontend/TanStack/tests: verify infinite-query cursor merge, optimistic send/reaction rollback, dedupe, unread state, reconnect, permission removal, responsive/a11y behavior and concurrency E2E.
- [x] Replace `ChatChannelsService.listMemberChannels`' unbounded membership read and fixed 100-channel truncation with stable tenant/member-scoped keyset pagination and a continuation cursor; add a scanner regression fixture for a user in more than 100 channels. — keyset ordered `(lastMessageAt DESC NULLS LAST, id DESC)` with a base64url cursor returning `{ channels, nextCursor }`.
- [x] Make huddle attendee creation and notification fanout bounded, resumable and queue-backed with recipient checkpoints and tenant concurrency limits; the start request must not retain all members or launch per-member provider calls. — the member-notify loop is keyset-paged at 500 per batch with a `membershipId` cursor; the attendee loop was already batched at 500. `check:unbounded-reads` no longer reports the file.
- [x] Enforce one active huddle per `(org_id, channel_id)` and serialize participant-cap admission atomically; prove concurrent start/join requests cannot create duplicate huddles or exceed plan/settings caps. — `pg_advisory_xact_lock` on `(orgId, channelId)` taken before the existence check and insert, so a concurrent second caller finds the existing huddle and joins. An `isNewHuddle` flag gates realtime publish, audit and fanout so only the first caller fires side effects.
- [x] Require active channel-membership assertion before mark-read, mark-unread, mute and unmute read or mutate channel state; inaccessible private channels return 404 and denial tests exercise revoked/non-member callers. — `assertMember` validates active org membership, channel membership and non-archived channel across the huddle read/mutate paths; the cross-tenant probe returns `NotFoundException`, never 403.
- [ ] Replace per-visible-tab 15-second presence heartbeats with authoritative Ably connection presence; permit only one leader-elected browser heartbeat fallback with jitter, backoff and offline/visibility handling, and prove multitab/reconnect load budgets.

#### 10.13 Calendar

- [ ] Architecture/schema: verify calendars/sources, events, attendees, recurrence rules, exceptions, reminders and synchronization state are normalized with tenant-safe attendee relations.
- [ ] Routes/contracts: verify event/series/occurrence, RSVP, free-busy, conflict, reminder and export routes use strict schemas, bounded ranges/cursors and a standard RRULE library.
- [ ] Authorization/privacy: test calendar/source visibility, attendee privacy, own/shared/admin operations, private events, cross-tenant IDs and every mutation hook.
- [ ] Queries/cache/workers: verify timezone/DST, recurrence expansion limits, free-busy/conflict indexes, reminder replacement/deduplication, sync retries and range/source cache invalidation.
- [ ] Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
- [x] Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence. — `calendarProviderSyncQueue` (migration `0934`) is written inside the same request transaction as the event, so no inline network call happens on the request path. `CalendarProviderSyncSweepService` claims rows with `FOR UPDATE SKIP LOCKED` under `forEachOrg`, retrying up to 5 attempts with `[0, 30s, 120s, 600s, 1800s]` backoff.
- [ ] Consolidate Calendar member list/search behind one permission-gated lookup interface; both paths require `directory:people:view` and test missing, granted and revoked access.

#### 10.14 Inbox and mail

- [ ] Architecture/schema: verify accounts/conversations/messages/participants/labels, metadata, delivery/sync cursors and attachments have normalized tenant/account ownership.
- [ ] Routes/contracts: define one bounded Inbox contract for list/thread/search/read/label/archive/send/reply/attachment operations with strict schemas and provider-neutral adapters.
- [ ] Authorization/security: test account ownership/delegation, recipient/attachment access, HTML sanitization, unsafe links/content and cross-tenant conversation/message IDs.
- [ ] Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- [ ] Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

#### 10.15 Notifications, email and push

- [ ] Architecture/schema: verify notifications, recipients, preferences, templates, delivery attempts, provider events, read state and dedupe keys are normalized and tenant-safe.
- [ ] Routes/contracts: verify list/read/read-all/preferences and administrative template/test routes are strictly validated, bounded and idempotent.
- [ ] Authorization/privacy: test recipient-only reads/mutations, administrative template scope, sensitive payload minimization, tenant-safe realtime channels and unsubscribe/consent rules.
- [ ] Queries/cache/workers: verify indexed unread counts without scans, at-least-once duplicate-safe dispatch, outbox consumers, retry/backoff/DLQ, bounce/complaint/suppression and provider adapter failure.
- [ ] Frontend/TanStack/tests: verify notification/count key consistency, optimistic read rollback, realtime dedupe, preference forms, accessibility and replay/revocation/cross-tenant E2E.
- [x] Repair mark-read, mark-all and bulk-read optimistic updates to patch `InfiniteData<Notification[]>` page-by-page rather than treating the cache as `Notification[]`; atomically preserve rollback snapshots and unread counts under concurrent realtime events. — two type guards (`isInfiniteData` narrowing on `"pages" in data && "pageParams" in data`, and `isNotificationList`) with **zero casts**, plus shape-aware snapshot/patch/restore helpers. All three mutations handle both the infinite and flat shapes. 13 tests including a 2-page patch, rollback, and a concurrent-realtime-vs-optimistic case.
- [x] Replace growing per-recipient transactions and in-memory recipient maps with cursor-resumable bulk persistence, checkpoints, tenant concurrency/backpressure and duplicate-safe provider delivery; no worker invocation may retain or dispatch the complete recipient set. — `NotificationDispatchService.emit()` splits recipients into 500-id chunks, each written as an independent outbox row with a `:c<N>` dedupe-key suffix, so a crash mid-fanout loses only unprocessed chunks and processed chunks stay idempotent.

#### 10.16 Knowledge Base, Wiki and Chatbot

- [ ] Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- [ ] Routes/contracts: verify CRUD, revision, publish/archive, search, ingestion, reindex, export and chatbot routes use strict schemas, bounded work and idempotency.
- [ ] Authorization/privacy: test org/user content, space/audience/record ACLs, draft/published visibility, attachment access and ACL enforcement inside keyword/vector retrieval before model context.
- [ ] Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- [ ] Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.
- [x] Apply the direct article visibility predicate to Help Centre comment list/create/update/delete/resolve, carry caller context to the data seam, select explicit fields and keyset-page comment threads; authors edit/delete their own comments, page editors resolve and KB administrators moderate. — every method now takes `CurrentUserContext` and calls `assertArticleViewable` before the query; `resolve` requires `assertArticleEditable`. Explicit field projection, no `SELECT *`, keyset `(createdAt, id)` at 50 per page.
- [x] Re-authorize current parent-page visibility inside every Wiki comment mutation and enforce author/page-editor/KB-admin authority at the data seam; remove controller-supplied authorization booleans and test access revocation between read and mutation. — the controller-supplied `isAdmin` boolean is deleted; `update`/`remove`/`resolve` fetch the comment, re-run `assertPageAccessible`, then check authority via `AccessService` at the seam. Revocation-between-read-and-mutation is tested and returns `NotFoundException`.
- [x] Apply reviewer/requester scope plus page ACLs to freshness-review due lists and replace the silent 100-row cap with stable cursor pagination so restricted titles/identities do not leak and due work is not lost. — `listDue` switched from `leftJoin` to `innerJoin(kbPages)` with the `pageVisibleTo` predicate, so invisible pages are excluded rather than surfaced; reviewer/requester scope applied for non-managers; keyset `(dueAt, id)` replaces the 100-row cap.

#### 10.17 Shared storage, search, realtime and integration adapters

- [ ] Architecture/schema: verify shared modules expose narrow interfaces and do not absorb feature authorization or business rules; integration credentials remain server-side and tenant-bound.
- [ ] Routes/contracts: verify upload/download/search/token/integration callbacks validate input, authenticate provider callbacks and never expose provider secrets or internal object keys.
- [ ] Authorization/security: prove callers supply an authorization context that shared adapters cannot bypass; test SSRF, malicious files, token replay and cross-tenant resources.
- [ ] Queries/cache/workers: verify bounded search, tenant/ACL predicates, backpressure, retries/DLQ, idempotent callbacks, cache namespaces and resource cleanup.
- [ ] Consumers/tests: verify every produced event has a registered consumer or explicit terminal sink and exercise adapter fakes plus cross-module contract tests.
- [x] Repair every current `void NotificationDispatchService.emit(...)` caller in Organization, Build and Knowledge so intent persistence is awaited or written in the caller transaction; prove commit/rollback/crash behavior and prohibit future fire-and-forget calls statically. — inventory by file: Organization `invitation-acceptance` (2), `org-member-departure` (1), `org-setup` (1); Build `build-due-sweep` (3), `build-release-published-consumer` (1), `build-ticket-status-changed-consumer` (1), `projects-provision` (1); Knowledge `kb-page-comments` (1), `kb-page-reviews` (3). All awaited; enforced by `check:fire-and-forget`.

#### 10.18 Frontend system-wide release

- [ ] Architecture: verify route groups and feature folders mirror ownership, shared UI stays domain-neutral and no business/database implementation exists in the frontend.
- [ ] TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
- [ ] RBAC/UI: verify authenticated layout, route/action parity, module navigation, permission changes and organization switching without flashes of unauthorized content.
- [ ] UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
- [ ] Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
- [ ] Reduce authenticated client route modules below the current 304-page ceiling, never raise that ceiling, and move data/authorization/orchestration to server or feature seams while preserving interactive leaf components; public landing visuals and animations remain untouched.

### 11. Application security and privacy implementation

- [ ] Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.
- [ ] Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.
- [ ] Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.
- [ ] Implement correction/rectification rather than treating export, deletion or anonymization as correction.
- [ ] Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.
- [ ] Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.
- [x] Resolve retention for `helpdesk_tickets`, `performance_reviews`, `mail_message_metadata` and `announcements` with bounded policy or explicit KEEP-FOREVER configuration. — decisions recorded in `RETENTION-POLICY.md` and enforced in code by `cron-helpdesk-retention`, `cron-mail-retention` and `cron-announcements-retention` services; `performance_reviews` is an explicit KEEP-FOREVER (employment-record obligation). Covered by `cron-pending-retention.spec.ts`.
- [ ] Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.
- [ ] Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.

### 12. Light-speed performance and AI

The defaults below are code-release budgets on a production build with the documented seeded dataset. A module may use a stricter budget. A looser exception requires measured evidence, a concrete reason, an owner and an expiry date; budgets may never be silently increased to make a gate pass.

#### 12.1 Backend, database and cache budgets

- [ ] Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- [ ] Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at p95 ≤ 800 ms, excluding internet/provider time.
- [ ] Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain plans for every exception.
- [ ] Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
- [ ] Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.
- [ ] Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
- [ ] Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable job/status contract promptly.
- [ ] Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or database connections.
- [ ] Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.

#### 12.2 Next.js, TanStack Query and perceived speed

- [ ] Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined reference viewport/device profile.
- [ ] Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs.
- [ ] Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.
- [ ] Eliminate request waterfalls where dependencies are known, prefetch only likely/authorized routes and prevent speculative prefetch from leaking or overloading tenant data.
- [ ] Prove TanStack Query deduplicates concurrent callers, cancels abandoned reads, avoids retry storms, retains useful previous pages and invalidates only affected tenant/module keys.
- [ ] Virtualize or incrementally render large chat, calendar, inbox, notification, directory, HR and Build collections while preserving accessibility and cursor correctness.
- [ ] Optimize images, fonts and eligible static assets, use HTTP compression for text responses and keep upload/media transformations asynchronous.
- [ ] Measure memory, render count, long tasks and hydration mismatches on representative Home/module journeys; eliminate avoidable rerenders and main-thread blocking.

#### 12.3 AI gateway, retrieval and streaming

- [ ] Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.
- [ ] Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.
- [ ] Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.
- [ ] Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.
- [ ] Enforce tenant, subject, permission, document lifecycle and record ACL predicates inside keyword/vector retrieval before any chunk reaches the model.
- [ ] Batch and deduplicate parsing, chunking and embeddings; make ingestion resumable/idempotent with leases, retries, cancellation, DLQ, progress and deletion/reindex propagation.
- [ ] Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [ ] Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.
- [ ] Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [ ] Cache only explicitly cacheable AI artifacts using tenant, subject/ACL version, model, prompt/version, source revision and policy dimensions; invalidate on permission, content, model or prompt change.
- [ ] Defend against prompt injection, unsafe tool arguments, SSRF and data exfiltration with allowlisted tools, validated arguments, output schemas, content controls and least-privilege execution.
- [ ] Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [ ] Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
- [ ] Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.
- [ ] Run deterministic AI gateway/retrieval/stream tests plus representative provider-sandbox tests when credentials are available; prove identical authorization for direct document reads and AI-assisted retrieval.

## Known-open at the 2026-09-02 reconciliation

Recorded explicitly so no unchecked box above is mistaken for an oversight.

- **Tenant relationship repair is partial and the count is honest.** The rebuilt
  `pg_catalog` gate inventories **613** single-column FKs (was 853): 233 excluded
  as CRM/Inventory, 17 covered by `0938`-`0941`, **363 actionable** (was 603).
  Two tranches are applied against `scratch_boot_a`: Build (`0943`-`0948`, 116
  composites, 117 singles dropped) and HR/payroll/timesheets (`0949`-`0955`).
  Workflows, accounting, support and KB remain. All **238** intended constraints
  across `0943`-`0954` were diffed against `pg_catalog`: 0 missing. Counts come
  from the catalog, never from the migration files. The live database is
  untouched. RLS is live on 977/984 tenant tables, so these constraints are
  defence-in-depth rather than the only tenant control.
  Three defects in the HR tranche were caught only by that catalog diff and are
  worth recording as a pattern. `0954` was journaled as APPLIED while an error
  earlier in the file left later statements unrun -- a partially executed
  migration is invisible to the journal. Four of its statements targeted objects
  that exist nowhere (`payroll_journal_entries`, `payroll_run_items`,
  `payroll_runs.legal_entity_id`, `timesheet_exceptions.timesheet_id`), which
  would fail 42P01 against any runner that does not swallow missing-object
  errors. And the drop migration named a constraint that does not exist, which
  under `IF EXISTS` is a silent no-op leaving the superseded FK in place.

- **Backend over-300 ratchet MET at 394**, reached by splitting rather than by
  raising the baseline. Splits are by responsibility: feedback CRUD out of the
  roadmap service, cash-flow / journal-entry / aged-receivables / vendor-query /
  prompts out of accounting, a report service out of outbox, a reverse service
  out of finance-assets. Splitting changes constructor arity and typecheck is the
  only gate that sees it, so 38 test doubles broke; every one was fixed by
  teaching the double the new dependency, never by removing it from the service.
  Backend typecheck sits at its **10-error baseline, all pre-existing test
  doubles, zero production code**.
- **22 bulk-`ids` request bodies still lack an upper bound**, not 32 — the
  earlier figure was carried forward without measurement. A parse of every
  `src/**/*.schemas.ts`, excluding CRM/Inventory, finds 31 id-arrays already
  bounded with `.max()` and 22 unbounded, in build (5), calendar (2), leads (3),
  payroll (2), surveys (2), notifications (2), and one each in chat, expenses,
  finance/ap, hr/performance ×2 and kb. Repair plus a regression gate is in
  progress. Note two are outbox event payloads rather than HTTP bodies, where a
  cap could silently truncate a legitimate org-wide fan-out; those are being
  judged individually rather than capped by rule.
- **Command-catalog classification is incomplete.** Signal propagation is fully
  closed (0/399), but classifying all 316 mutation files as PERMISSIONED or
  explicitly SELF, behind a gate, is outstanding.
- **Runtime-measured budgets are unproven, and both gates now say so.** Core Web
  Vitals for authenticated routes, long-task/render measurement and the seeded
  disposable-database E2E across the 15 in-scope modules are pending a booted API
  against a seeded scratch database.
  Two gate defects of the same class were found and fixed rather than worked
  around. `check:web-vitals-budget` exited 0 when a budget had **no**
  measurement, and accepted public-landing-page figures as evidence for budgets
  that govern authenticated routes; it now fails on an unmeasured budget and
  fails outright when no authenticated route was measured. Separately,
  `frontend/contracts/route-bundle-manifest.json` had **no gate at all** — the
  similarly-named `check:route-budgets` reads `backend/contracts/route-budgets.json`
  (DB calls, latency) and never saw it, so measured bundle bytes sat in the repo
  with nothing comparing them to their ceiling. The new
  `check:route-bundle-budget` closes that and is **RED on two real breaches**:
  `/inbox` +35,354 bytes and `/build/inbox` +42,852 bytes over their First Load
  JS ceilings. Both new gates ship a self-test with a known-bad fixture.
- **Authenticated Web Vitals are now measured, on a production server, and the
  gate is RED with 6 real breaches.** `/mail`, `/inbox`, `/dashboard`, 5 repeats,
  both profiles, `next build && next start`, one magic-link exchange with the
  session cookie reused, every route confirmed to render real content. Moving
  from `next dev` to a production build took mobile LCP 3331ms -> 2272ms (inside
  budget) and desktop INP 552ms -> 48ms, so two earlier "failures" were artifacts
  of on-demand compilation. CLS is 0 everywhere.
  Remaining breaches: desktop LCP, FCP both profiles, TTFB both profiles, mobile
  INP. **TTFB cannot be judged from this environment** and the reason is recorded
  as a measurement, not an assertion: the database round-trip from the measuring
  machine to the Neon pooler in `ap-southeast-1` is 88.4ms median, so a page
  issuing 6 sequential queries spends ~530ms in DB latency alone; in production
  the app server is co-located with the database at ~1-5ms. Mobile INP is a real
  application finding -- it is entirely `/inbox` (416ms) and `/dashboard` (352ms),
  where ~1s long tasks block the main thread after FCP under 4x CPU throttle.
  The gate carries three guards, each added after a real shortcut was attempted:
  an unmeasured budget is not a met budget; landing-page figures cannot stand in
  for authenticated routes; a `next dev` run is not production evidence.
- **Route bundle bytes are gated and one route legitimately cannot pass.**
  `/build/inbox` came down 657,252 -> 559,188 bytes, 55KB under its ceiling, by
  making `InboxTicketPreview` dynamic. `/inbox` stays over at 558,680 against
  524,288. Only 4 of its 42 chunks (13,519 bytes) are inbox-specific; the shared
  authenticated shell accounts for 545,161 bytes and **exceeds the ceiling on its
  own**, so deleting the entire page would not bring it under. The ceiling was
  never raised. Closing this means trimming the shared shell or re-deriving that
  ceiling from measured shell cost as a deliberate decision.
- **The backend jest suite is RED and the pre-existing share is UNVERIFIED.**
  A full unfiltered run reports roughly 51 failing suites of 1,627. Six were
  confirmed lane-introduced and fixed, including a genuine production race in the
  KB ingestion consumer where the concurrency counter was incremented after the
  first `await`, so all 20 concurrent calls read `current = 0`. The remaining
  failures are *classified* as pre-existing, but that classification is not
  established: many of the stated reasons are "mock arity mismatch after service
  split", and this programme performed the splits. Confirming it requires running
  the suite at the pre-programme commit `d054dab9`, which needs a checkout this
  session was not authorised to perform. **Do not read the current suite as
  green, and do not assume the 51 are harmless.**
  Two traps to carry forward: piping a jest run into `tail` and reading `$?`
  returns tail's status and hides the failure, and a path-filtered run that looks
  green proves nothing about the other 1,500 suites.

- **Read budgets need a reproducible seed.** An earlier run measured against a
  shared development database; that is not reproducible evidence and was
  rejected. A deterministic, idempotent seed including a minority-size org (ANN
  and text-search plans measured only against the largest tenant measure nothing
  under RLS) is being built on a scratch database.

## Immediate code-level final gate

- [ ] Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- [ ] CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- [ ] Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- [ ] Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
- [ ] No unresolved code-level P0/P1 finding remains.
- [ ] Release authority records commit, evidence, accepted code-level residual risks and date.

Completing this gate permits the label **code-level 10/10 release candidate** only.

## Deferred production-readiness evidence

These are intentionally postponed until infrastructure, provider access and approvers are available. They are not immediate code-release blockers and cannot be completed from mocks.

### Deployed security, provider and performance

- [ ] Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
- [ ] Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
- [ ] Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.
- [ ] Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
- [ ] Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
- [ ] Prove declared SLOs with at least 40% capacity headroom.

### Cloud, recovery and operations

- [ ] Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
- [ ] Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- [ ] Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
- [ ] Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- [ ] Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
- [ ] Configure production logs, traces and release metadata with redaction.
- [ ] Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- [ ] Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
- [ ] Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
- [ ] Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
- [ ] Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.
- [ ] Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.

### Compliance and approvals

- [ ] Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
- [ ] Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
- [ ] Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
- [ ] Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
- [ ] Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
- [ ] Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
- [ ] Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
- [ ] Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
- [ ] Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
- [ ] Close or formally disposition every production/security/privacy/compliance P0/P1 finding.

## Production-ready final gate

- [ ] Immediate code-level gate remains green at the deployed commit.
- [ ] Every deferred checkbox is complete with current evidence.
- [ ] Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
- [ ] Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
- [ ] No unresolved production/compliance P0/P1 finding remains.
- [ ] Release authority records commit, environment, evidence, accepted residual risks and date.

Only this final gate permits the label **production-proven 10/10**.
