# StreamlineOS final 10/10 completion PRD

Status: active â€” single authoritative backlog
Last reconciled: 2026-09-02 at backend `e0ab789c` / frontend `b203575d5`
Immediate target: code-level release candidate
Deferred target: deployed production and compliance evidence
Scope: all platform domains except CRM and Inventory

This is the only authoritative architecture/refactor TODO list. The independent implementation tickets under [code-release-sessions](code-release-sessions/README.md) are execution views of this backlog, not competing PRDs or scorecards. Update a checkbox only from current source and reproducible evidence at one recorded commit. Git history is the archive.

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

### Independent code sessions — 2026-09-02

These sessions can run concurrently. Each begins from current source, owns its own audit and implementation, and must not assume another session has run. Completing a session requires updating both its ticket and this ledger with evidence. A module checkbox below is marked only when its complete criterion is proven; shared criteria remain open until every named session contributes evidence.

- [x] [S01 — Authentication, organization, RBAC and Settings](code-release-sessions/S01-AUTH-ORG-RBAC-SETTINGS.md) — complete. Backend S01 modules 191 suites / 1797 tests green (the one failure is S04's stale dashboard assertion, not an S01 edit); S01 e2e 15/16 suites / 338 tests green after clearing the jest cache, which also serves as the full `AppModule` boot proof; frontend 66 suites / 647 tests green; 19 targeted gates exit 0; backend production typecheck 0 errors, frontend typecheck 0 errors, spec-inclusive typecheck carries **zero** errors in any S01 file. One P0 fixed (cross-tenant MFA reset), plus a duplicate organization-security write surface collapsed onto its canonical route, an unbounded delegation window capped at 90 days, MFA brute-force limits added, a silently-swallowed cross-instance revocation failure made observable, six non-cancellable reads repaired, and 62 request schemas strictened with four growing arrays bounded. Nine findings outside S01's boundary are handed on with named owners and reasons — see the session ticket's **Handed to other sessions**.
- [ ] [S02 — Schema, migrations, tenant integrity and retention](code-release-sessions/S02-SCHEMA-MIGRATIONS-TENANT-INTEGRITY.md)
- [ ] [S03 — API, query, pagination, caching and contracts](code-release-sessions/S03-API-QUERY-CACHE-CONTRACTS.md)
- [ ] [S04 — Home, Directory and HRMS](code-release-sessions/S04-HOME-DIRECTORY-HRMS.md) — 10.3, 10.5 and 10.6 are fully checked; seven of eight session criteria are proven. The ledger box stays open on one clause only: production-shaped query-plan evidence, which needs the seeded scratch database tracked below and cannot be closed from a session.
- [ ] [S05 — Payroll, Accounting and Finance](code-release-sessions/S05-PAYROLL-ACCOUNTING-FINANCE.md)
- [ ] [S06 — Build and Workflows](code-release-sessions/S06-BUILD-WORKFLOWS.md)
- [x] [S07 — Billing and Payments](code-release-sessions/S07-BILLING-PAYMENTS.md) — all 8 session criteria closed. The load-bearing find was a coupon subsystem with no tenant scoping on any read or write; also closed: no re-drive for webhooks the provider stopped retrying, a quota count that escaped the caller's advisory lock, a swallowed finance-bridge failure that returned 200, a stale entitlement cache after an enterprise quote, four ungated frontend billing surfaces, and a `country` field that was never persisted. 12 DTOs bounded and made strict, each checked against its real frontend payload. Eight schema findings handed to S02. An earlier audit claim that `PAST_DUE` collapses a paid org to FREE was re-checked and is **false** — a PAST_DUE row with a real plan falls through to the plan branch and stays PAID; the D+14 dunning sweep sets `CANCELLED`, which is the branch that returns FREE. Both are now pinned by tests, so nothing is left open for a decision.
- [x] [S08 — Chat, Notifications and realtime delivery](code-release-sessions/S08-CHAT-NOTIFICATIONS-REALTIME.md) — backend 88 suites / 661 tests green, e2e 7 passed + 1 db-gated skip, frontend 15 suites / 105 tests green, boot proof 3,600 operations. Eight open items are named in the ticket and below; the P0 was a preference upsert whose `ON CONFLICT` target had no matching index since migration `0918`.
- [ ] [S09 — Calendar, Inbox and Mail](code-release-sessions/S09-CALENDAR-INBOX-MAIL.md) — 7 of 8 session criteria closed. Three P0/P1 defects found and fixed with bite-proven tests: the calendar list never expanded recurrences (a weekly series showed one instance then vanished while reminders kept firing), every Gmail reply was addressed to a message id, and `useMailAction`'s optimistic update was dead code because of a trailing-`undefined` query key. Also fixed: an unbounded external-events date range, a silently truncating reminder-recipient read, a vacuous mail tenant-isolation spec, and non-idempotent mail send/reply plus the gate that was blind to them. Backend 41 suites / 376 tests green (from 35 / 342), frontend 21 / 167 green (from 16 / 142), all targeted gates green. Criterion 2 remains open on provider-sync drift reconciliation plus user-visible status/retry, and on index-plan measurement, which needs a seeded database.
- [ ] [S10 — Knowledge, Wiki, Chatbot and AI](code-release-sessions/S10-KNOWLEDGE-WIKI-CHATBOT-AI.md)
- [ ] [S11 — Frontend platform, TanStack and perceived performance](code-release-sessions/S11-FRONTEND-TANSTACK-PERFORMANCE.md)
- [ ] [S12 — Shared adapters, security, privacy and repository quality](code-release-sessions/S12-SHARED-SECURITY-QUALITY.md)

Session-level commands intentionally exclude full backend/frontend typechecks, ESLint and full builds because those commands contend for memory and can hang parallel work. Sessions use focused tests and targeted architecture gates. The orchestrator runs the full build/typecheck and other one-commit release gates once, after sessions reconcile; this changes execution placement, not the final release standard.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.
- Keep the master backlog here; execution tickets may exist only under `architecture-refactor/code-release-sessions/` and must follow its two-way reconciliation protocol.

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
- [x] Prove no dead or duplicated endpoint, schema, type, validator, hook, query key, worker, page or UI element using dependency graphs plus build/typecheck evidence; remove every deferred capability outside the approved release scope instead of retaining speculative flags, and make the final capability report contain zero DEFERRED entries as well as zero DEAD/WIRE/UNCLASSIFIED entries. — the capability report is now **0 DEFERRED / 0 DEAD / 0 WIRE / 0 UNCLASSIFIED** (was 22 DEFERRED and 2 DEAD files). All 22 exports were removed under the four-part evidence standard: zero symbol references, zero barrel re-exports, knip confirmation, and no dynamic import — text search alone was not accepted for any of them. Also removed: 8 orphaned types, 2 orphaned helpers and 2 dead schema files. **The gate itself was diffed rather than trusted**, since editing a gate to pass it is the obvious failure mode: only the verdict entries for exports that no longer exist were removed, and `BASELINE`/`SCAN_FLOOR` are byte-identical. **One breakage this caused, found and fixed:** `hr-core-query-access-matrix.test.ts` still asserted a row for the deleted `useAttendanceHeatmap`. The backend `/me/attendance/heatmap` endpoint still exists and is legitimate self-service under CLAUDE.md §8; only the unconsumed frontend hook went, so the stale matrix row was removed (80/80 pass). Worth recording that this endpoint now has **no frontend consumer** — a candidate the next backend dead-code audit should examine on its own evidence.
- [ ] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.

### 3. TypeScript, Zod and cross-layer contracts

- [ ] Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [ ] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
- [ ] Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [x] Verify operation IDs, REST versioning, status/error envelopes, idempotency headers and cursor/filter/sort contracts; migrate internal callers atomically and preserve backward compatibility only for published customer/integration contracts through versioned deprecation. — S03: `check:operation-ids`, `check:envelope-consistency`, `check:idempotent-commands`, `check:openapi-path-params`, `check:bodyless-conflicts` and `check:bounded-contracts` all green at 3,599 operations. The "published" half is now real rather than nominal: the registry classifies **100** operations as published, each naming the external consumer that justifies it, instead of the 3,539 that made every app route a customer contract. `check:contract-breaking-change` was proven load-bearing under the new rule — flipping a tombstone back to published exits 1, reverting exits 0.
- [x] Create one fail-closed API contract registry that classifies every exposed operation/event/webhook as internal or published, defaults unknown contracts to published, records owner/version/consumers/sunset evidence, and gates breaking deletion or schema change on dependency proof plus the required deprecation window. — `contracts/api-contract-registry.json` covers **3,602 operations (100 published, 3,502 internal)** and 24 outbox events, 0 unclassified. An operation absent from the registry is treated as published and exits non-zero. `check:contract-breaking-change` allows internal breakage freely per approved decision 12 but fails a published removal or narrowing without a satisfied sunset. Both gates carry self-tests, including proof that a future `sunsetAt` does **not** satisfy the window. **Superseded count:** the earlier 3,533-published figure came from mapping `x-exposure: permissioned` to published; that is now closed (see the classification entry under Known-open).
- [ ] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.

### 4. Database schema and migration quality

- [x] Audit every in-scope tenant table for non-null `org_id`, tenant-leading index, explicit tenant path and composite tenant-safe relationships where required. — 902 tenant tables inventoried from `pg_catalog`; 893 declare the tenant column `NOT NULL` and the 9 nullable ones are named dual-scope tables where `NULL` means a platform-global row, not oversights. `check:tenant-indexes` 745/745. 351 canonical composites installed and catalog-verified. Evidence: [s02-tenant-integrity.md](final-refactor/evidence/s02-tenant-integrity.md).
- [ ] Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [x] Verify cross-tenant composite FKs for membership/authority-sensitive relations and prevent orphaned visible children. — proved live on `scratch_boot_a` with rolled-back probes: a `chat_messages` row in org B referencing an org A channel is denied `23503 fk_chat_messages_org_channel`, while the same-tenant control on the identical statement is allowed, so the denial is not vacuous. Membership-sensitive relations are covered by the same composites (`fk_portal_invitations_inviter_membership_id_org`, `fk_worker_engagements_*`, the AI actor constraints).
- [x] Add a `pg_catalog`-backed tenant-relationship gate that inventories every FK whose parent and child are tenant-owned, explicitly excludes CRM/Inventory and approved global relations, and reports zero actionable single-column tenant relationships. — `check:tenant-relationships` EXIT=0, `Actionable 0`, with named buckets for CRM (99), Inventory (136) and platform-global (1). **Two blind spots in the gate itself were found and closed:** it matched only `attname = 'org_id'`, hiding 81 tables that scope tenancy with `organization_id` and 4 real single-column violations among them; and its `EXCL: In-migration` bucket excluded 17 constraints as "covered by 0934–0937" when **0935, 0936 and 0937 were never written**. Both modes now classify identically and the 16-fixture self-test includes a genuine tenant→tenant violation that must still be reported.
- [x] Repair every actionable in-scope relationship with `(org_id, child_id) -> (org_id, id)`, supporting uniqueness/indexes, `NOT VALID` then `VALIDATE` migration sequencing and cross-tenant insertion tests; explicitly cover Build ticket hierarchy/recurrence/release/feedback/product/work-item/workflow/sprint-event relations and Billing subscription/proration/invoice/credit-note relations. — 353 actionable → 0 across migrations `0962`–`0979`, covering Build, Billing, Workflows, Accounting, Support, Knowledge, Chat, HR and Payroll. All 351 constraints diffed against `pg_catalog` for columns, parent, referential action, `SET NULL` column list and `convalidated`: 0 problems, 0 survivors of the 393 superseded constraints. **The weaker constraint could not simply be dropped:** 145 composites were `NO ACTION` beside a single-column FK carrying `CASCADE`/`SET NULL`/`RESTRICT`, so dropping first would have silently converted 145 cascades into `NO ACTION`. A further 209 duplicate composite pairs were reduced to one canonical constraint each.
- [ ] Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and upgraded-catalog parity.
- [x] Make the RLS verification command scope-aware: prove every in-scope tenant table is covered, report excluded CRM/Inventory tables separately, and fail if any unclassified or in-scope table lacks policy coverage; do not globally ignore the current `inv_project_requirements`/`inv_projects` failures. — `db:verify-rls` EXIT=0, "RLS VERIFIED". 984 tenant tables in five named buckets: 792 in-scope covered, **0 in-scope missing**, 6 platform-global, 85 excluded CRM, 101 excluded Inventory. The two `inv_*` tables appear under EXCLUDED: INVENTORY by name, not through a global ignore, and an unrecognised table classifies as in-scope and fails — deny by default. The 12-fixture self-test includes RLS-enabled-with-zero-policies (a classic false green) and a CRM table whose name does not start with `crm_`. The `FORCE ROW LEVEL SECURITY` advisory was re-confirmed against `pg_roles`: `streamline_app` has `rolbypassrls=false` and `neondb_owner` has `rolbypassrls=true`, so FORCE would change nothing under the current topology.
- [x] Verify high-growth append-only tables have justified retention/partition decisions and indexes matched to real access patterns. — `check:retention-coverage` EXIT=0 (was EXIT=1 with `helpdesk_tickets`, `performance_reviews`, `mail_message_metadata` and `announcements` uncovered). The gate's matrix contradicted shipped code: the workers and the recorded decisions existed while the matrix still read `PENDING-DECISION` and its self-test asserted they stay pending. `notification_outbox` and `outbox_events` remain `PENDING-DECISION` and are below the 1 MB threshold, so they are reported rather than silently covered.
- [ ] Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [ ] Resolve the 100 Drizzle-declared columns that exist in no database. Almost all are `*_membership_id` actor columns across HR, hiring, payroll and performance, plus `payroll_runs.posting_state` which migration `0933` adds and is still pending. No journalled or pending migration creates the other 99. This is a live failure, not cosmetic drift: `db.select().from(interviewPanelMembers)` renders SQL naming `user_membership_id` (confirmed with `PgDialect.sqlToQuery`) and returns `42703 column "user_membership_id" does not exist` against the live database, so any `select()` or `findMany()` without an explicit column list on those ~85 tables fails. Four additionally declare a `uniqueIndex` or `foreignKey` over the absent column. Decide per table whether the column is added or the declaration withdrawn; found by S02, owned by the domain sessions.
- [ ] Give `0941`, `0948`, `0955` and `0957` reconstructable rollbacks. 244 of the 297 constraints they drop can be rebuilt from the declaration each column carried at `HEAD`, but 53 columns no longer carry an inline `.references()`, so an exact inverse is not derivable from the repository. `-- @irreversible` is not an acceptable substitute: that marker is for data-destructive DDL and dropping a constraint is not. `check:migration-rollback` is at 4 missing, down from 39.
- [ ] Decide the Drizzle snapshot strategy. The newest snapshot is `meta/0464_snapshot.json` against 626 journal entries because every recent migration is hand-written, so `drizzle-kit generate` would emit a catastrophic diff and is unsafe to run. Either regenerate the snapshot chain from the current catalog or record generation as prohibited.
- [ ] Cold-bootstrap an empty database to migration head and record zero pending, orphan, duplicate or unreachable migrations.
- [ ] Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.
- [ ] Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap: tables, columns, constraints, indexes, policies, functions, triggers and extensions must match exactly.
- [ ] Verify migration `0930` enables the `audit_logs` append-only trigger and rejects application-role mutation in the disposable database.
- [ ] Retain release SHA, commands, database identity, catalog diff and artifact hashes.

### 5. Query, pagination and cache correctness

- [x] Restore a reproducible production-shaped in-scope seed dataset for HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting. — S03: `scratch_e2e` at 1,023 tables / 573 applied migrations, seeded by `seed-scratch-e2e.mjs` with 18,500 build tickets, 5,100 `hr_employments`, 671 members, 300 chat messages, 300 KB pages, 150 notifications, 200 timesheets, 6 payroll runs, plus a **minority-size second org** so ANN and text-search plans are not measured only against the largest tenant. Idempotent, `VACUUM ANALYZE` at the end, and now guarded: the seeder refuses a database whose name lacks `scratch` or that equals `DATABASE_URL`/`APP_DATABASE_URL`.
- [x] Fix the evidence gap: 43 read budgets are below minimum seed size and 27 are skipped; CRM/Inventory rows do not count. — S03: **0 below minimum seed size, 4 skipped** (three CRM party-search fixtures and `mail-inbox-cached`). The 43/27 figures are superseded.
- [x] Run each in-scope budget as `streamline_app` with `EXPLAIN (ANALYZE, BUFFERS)` and retain rows, buffers, duration, indexes and thresholds. — S03: **55 PASS / 0 FAIL / 11 EXCL / 4 SKIP over 70 budgets**, exit 0, run as `streamline_app` (non-`BYPASSRLS`) with `set_config('app.organization_id', …, true)` inside the transaction, so RLS predicates are in every plan. Each budget runs twice and records shared hit/read blocks, table rows, scan rows and selectivity per run; 24 of 55 show a cold read on run 1 and warm on run 2. Excluded: CRM (5), Inventory (5), `gl-journals-list` (needs `accounting_books`).
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

- [x] Test the six fixed standings — organization owner/admin/member and module owner/admin/member — plus fixed role templates, per-person grants, delegations and DataScope on every read and mutation path; prove no arbitrary custom-role creation interface exists. — S01. The only role-creation path is `POST /roles/templates` → `roles.service.ts:385`, whose `templateId` must be an exact member of the compile-time `ROLE_TEMPLATES`; `materializeTemplateSchema` is `.strict()`, so a body carrying `name`/`slug`/`permissions` is rejected rather than stripped, and `seedFromTemplate` always uses `ROLE_RANK.FUNCTIONAL`. The six standings derive only from structural columns, never from holding a key (`is-structural-org-admin.ts:46`, `module-standing.ts:155`). Asserted by `prd-s6-10-2-invariants.spec.ts:54-100`. **Delegations were the one unbounded axis:** `assertDelegationPolicy` checked ordering but had no duration ceiling, so a delegation to 2126 was accepted — a permanent shadow role, which is exactly what the six-standing decision exists to prevent. Now capped at 90 days on both sides.
- [x] Test owner transfer, last-owner protection, administrative descendant protection, organization switching and cross-organization denial. — S01. Last-owner protection bites at `org-member-departure.service.ts:80/211`, `org-membership-status.service.ts:166` and `org-membership.service.ts:169` (inside a `.for("update")` lock, so not TOCTOU-able); `assert-invitable-role.ts:17` unconditionally refuses an OWNER grant, so a second owner can only arise through the transfer flow, itself `assertOwnerOnly`-gated at `ownership.controller.ts:98`. `switchOrg` (`org-profile.service.ts:119-184`) re-reads `organizationMembers` for the requested org and requires `status === "ACTIVE"` before any state change, so the client-supplied `orgId` is a selector only. `restoreOrg` returns 404, not 403, on a cross-tenant miss.
- [x] Prove authorization at the data/query implementation so a missing controller/frontend check cannot expose a record. — S01. Every exit from `apply-scope.ts:11-36` is a SQL predicate and both `case "none"` and the exhaustive `default` emit `sql\`false\``; `ScopedRead` (`object-access.ts:21-66`) holds the scope in a `#private` field whose only public exit is `.predicate(cols)`. `check:scope-application` reports 129 resolutions / 129 applied, `check:record-access` 0 unexcluded soft-deleted reads.
- [x] Prove frontend routes, navigation, TanStack queries and action buttons match backend effective permissions without treating hiding as security. — S01. `check:route-access-contract` maps 201 route-access keys onto real endpoints in the generated contract; `check:navigation-permissions` proves every nav gate names a key some route enforces; `check:permission-keys` resolves all 627 distinct `@RequirePermission` keys in both catalogs. `action-visibility-invariants.test.tsx` and `permission-denial-is-not-emptiness.test.tsx` assert the hiding is a UI affordance, not the control.
- [x] Prove membership/permission revocation invalidates authorization caches, sessions and issued realtime credentials within the declared consistency contract. — S01. `org-membership-access-revocation.ts:92-343` invalidates the session and membership caches, revokes agent tokens, delegations, transfers and integration connections inside the tenant transaction, calls `ably.revokeUserTokens` after commit, and revokes every session once the last membership goes. **The cross-instance half was silently unreliable:** `access-version-channel.ts:42` swallowed a Redis failure with a bare `catch { return }`, so a revocation that failed to clear the shared version left other nodes serving the old permissions for up to the 300 s TTL with nothing reporting it. It now logs at `error`; the declared contract is only provable if its failure is observable.
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
- [x] Require bounded cursor/filter/sort contracts on collections and bounded `ids`/item counts on bulk routes; reject oversized requests before database work. — S03: `check:bounded-contracts` reports **0 in-scope violations** (was 14) and `check:bulk-id-limits` is green. Four endpoints were bounded in the service but unbounded in the published contract — `/chat/channels`, `/chat/channels/archived`, `/chat/search/messages`, `/support/knowledge-gaps` — and each now declares `pageSizeField(...)` *and passes it through to the service*, rather than declaring a parameter the service ignores. The gate is scope-aware: the 10 remaining CRM/Inventory violations are printed under "OUT OF SCOPE" rather than filtered away, with self-test cases proving the partition and its prefix anchoring.
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
- [ ] Pass TanStack `QueryFunctionContext.signal` through every cancellable read to `apiClient`; enforce zero unclassified reads and test navigation, search, range-change and organization-switch cancellation. — **Re-opened by S01 (2026-09-02): this box was checked on a gate that cannot see the defect.** `check:query-signal` still reports 0 violations across 399 files, and that number is true of what it measures — it asks whether a read *mentions* `signal`. But `apiClient.get` is `(url, params?: object, signal?: AbortSignal)` and `AbortSignal` is an `object`, so `apiClient.get<T>(url, signal)` typechecks, satisfies the gate, and never cancels anything. A positional parse of every `apiClient.get`/`apiClient.delete` call found **26** reads passing `signal` in the `params` slot. S01 fixed its two (`hooks/api/module-access/groups.ts:127`, `members.ts:163`); the other 24 are listed under Known-open and belong to S04–S10. Closing this box needs three things: the 24 call sites repaired, `check:query-signal` extended to assert argument **position** with a known-bad fixture in that exact shape, and `params` narrowed so an `AbortSignal` cannot occupy it. This is the third recorded instance of "a gate can be blind to the syntax it audits".
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

- [x] Architecture/schema: verify global identity is separated from tenant membership; organization, invitation, membership, session and organization-switch relationships have correct keys, uniqueness, lifecycle and revocation data. — S01. `users`/`mfa_backup_codes`/`magic_link_tokens` are global identity with no `org_id`; tenancy lives entirely in `organization_members`, which carries the one deliberate RLS carve-out (`0383_rls_org_members_identity_read.sql`: `org_id = app.current_org_id_or_null() OR user_id = app.current_user_id_or_null()`) so a signing-in user can read their own memberships before an org is chosen, with a tenant-only `WITH CHECK`. Invitations are single-use (`invitation-acceptance.service.ts:121-153` updates `WHERE status = PENDING AND acceptedAt IS NULL` and checks the affected count), expiring, tenant-composite, and bind identity to the stored `invitation.email` rather than anything the caller sends. Session revocation is durable through a TTL-less Redis tombstone plus the `userSessions.isRevoked` fallback (`sessions.service.ts:212-222`, `jwt-auth.guard.ts:100-139`).
- [x] Token authority: implement a replay-safe, CSRF-protected authenticated backend session-exchange interface that revalidates the current session and organization membership and alone mints short-lived asymmetric issuer/audience-bound JWTs; remove `BACKEND_JWT_SECRET` and all bearer-token signing from frontend/edge runtimes and redact exchange tokens from logs/telemetry. — `POST /auth/session-exchange` takes a 30s `NEXTAUTH_SECRET`-signed session proof in `x-session-proof`; `userId`/`sessionId` come **only** from the verified payload and are absent from the request body, which carries `orgId` as a selector re-checked against membership. Replay blocked by a UUID `jti` through Redis `SET NX`; the `revoked:session:<id>` tombstone is checked before minting. `grep BACKEND_JWT_SECRET frontend/` is empty; `check:log-secrets` clean.
- [x] Token verification: verify asymmetric JWTs by `kid` through a backend-owned keyring/JWKS with bounded clock skew, rotation overlap and session/membership revocation; test wrong issuer/audience/key, expiry, exchange replay, altered user, altered organization and a compromised frontend runtime that possesses no private key. — `JwtKeyringService` signs EdDSA with the latest key and verifies against every non-expired key, so rotation overlaps; JWKS exposes public material only. 27 exchange/keyring tests plus 241 jwt/token/session tests, covering all listed negatives **and** that `INTERNAL_API_SECRET` alone mints nothing.
- [x] Routes/contracts: verify signup, login, logout, refresh, recovery, MFA, invitation and organization switching use Zod/OpenAPI contracts and never trust client actor/current-org fields. — S01. **One route did trust a client actor field, and it was a P0.** `POST /auth/mfa/reset` took `userId` from the body and `MfaService.reset` resolved it against the **global** `users` table with no organization predicate — so any holder of `settings:mfa` in any tenant could disable MFA and delete the backup codes of any user on the platform. The handler now takes `@CurrentUser()` and the service resolves the target through `organizationMembers` scoped to that org, 404 on a cross-tenant miss. Every other listed route derives identity from the verified token: `logout` (`auth.controller.ts:134`), `session-exchange` (`auth.controller.ts:276-295`, `userId`/`sessionId` only from the verified proof JWT), `switchOrg`, and the invitation flow. `registerSchema` and all three MFA schemas gained `.strict()`, so an undeclared field is now refused rather than stripped.
- [x] Authorization/security: test account enumeration, fixation/replay, lockout, invitation takeover, revoked membership, cross-org switching and last-owner/owner-transfer invariants. — S01. Enumeration: `register` returns `{ success: true }` regardless (`auth.service.ts:69-77`), `resendVerification` returns one fixed string (`auth.controller.ts:159`), and `verifyEmailOtp` returns the identical `"Invalid or expired code"` for an unknown user and a wrong code with a `timingSafeEqual` comparison (`auth-passwordless.service.ts:393-425`). Replay: a UUID `jti` through Redis `SET NX` (`auth.controller.ts:300-303`). Revoked membership: `jwt-auth.guard.ts:171-190` throws `ORG_MEMBERSHIP_INACTIVE`. **Lockout had a real hole:** `POST /auth/mfa/verify` and `/disable` had no rate limit of any kind, so a caller holding a pre-MFA token could grind TOTP codes unbounded — a 30 s step with ±1 tolerance keeps three codes live at a time. Added `auth:mfa-verify` and `auth:mfa-disable` tiers keyed per user; `mfa-attempt-limits.spec.ts` proves the service is never reached once the limit trips.
- [ ] Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches. — S01: bounded reads and invalidation are proven (member list capped at 100 with a `(coalesce(name,email), id)` keyset, `getUserSessions` at `.limit(50)`, login history keyset; `check:cache-invalidation` clean). **Held open on "required indexes":** member search and four hierarchy list services use leading-wildcard `ILIKE` (`org-membership-read.service.ts:73` and siblings), which no B-tree can serve. **A trigram index is not the answer here and must not be proposed as one** — under RLS every search operator (`textlike`, `texticlike`, `similarity_op`, …) is `proleakproof = false`, so the user qual is demoted to a post-filter and the GIN index is unusable by `streamline_app`; measured previously at 0.34 ms as `neondb_owner` versus 134.8 ms seq-scanning as the app role on the same index and data. `ALTER FUNCTION … LEAKPROOF` needs a true superuser, which Neon grants to nobody. The only remedy that works on this platform is a targeted `SECURITY DEFINER` id-probe function owned by a `BYPASSRLS` role, bounded with `cap+1` and falling back to plain `ILIKE` at the cap — and the standing decision (2026-08-12) is to add those **only where a scan is measured**, never by rule across the ~213 `ilike()` sites, because each wrapper is a place a wrong `WHERE` leaks across tenants. So this box closes on a measurement against the production-shaped seed, not on a migration. Not an S02 task.
- [ ] Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.

#### 10.2 Organization RBAC and module RBAC

- [x] Architecture/schema: verify permission catalog, six fixed standings, fixed role templates, per-person grants, delegations, scopes and assignments remain normalized and tenant-correlated; customization must not create a seventh standing or parallel authority source. — S01. Six grant tables (`role_assignments`, `role_permission_grants`, `principal_group_members`, `group_role_assignments`, `module_ownerships`, `user_delegations` + `user_delegation_permissions`) are the only sources folded into `computeUserPermissions` (`access-permission.resolver.ts:95-390`), each scoped to `orgId`; `user_permission_grants` is the sole per-person grant table with no parallel `user_roles`. `safeAccessTableRead` catches only `42P01` and returns empty, so any other database failure propagates rather than defaulting open.
- [ ] Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [x] Authorization/cache: prove data-layer enforcement, deny-by-default classification and revocation invalidation without a database round trip per permission check. — S01. Resolution is cached per `(orgId, userId, version)` in a process-local map (30 s) and in Redis via `cachedForOrgWith`, with the Redis TTL clamped to `validUntil` so a delegation or role expiry caps the cache lifetime (`snapshot-validity.ts:38-47`, asserted by `delegation-ttl-ceiling.spec.ts:100-133`). Every authority mutation calls `bumpPermissionsVersion`, which publishes through `accessVersionChannel` and synchronously clears the local version, membership, permission and denied-module caches. Deny-by-default is enumerated above under §6. `permission-invalidation-cross-instance.spec.ts` covers the cross-node path.
- [ ] Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths. — S01: batching and caching proven (five parallel queries in one `Promise.all` at `access-permission.resolver.ts:127-201`, plus single-flight fills). **Held open on index coverage**, which needs `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` against the production-shaped seed — that seed is a master-level dependency, not an S01 artifact.
- [x] Frontend/TanStack/tests: verify routes, navigation, queries and buttons consume one effective-access contract and test org/module owner, admin, member, fixed template, per-person grant, delegation and revocation cases. — S01. 59 frontend suites / 612 tests green across `features/{auth,organization,settings,module-access,org-setup,security}`, `lib/rbac` and `hooks/api`, including `authority-matrix.test.ts`, `catalog-sync.test.ts`, `owner-only-catalog-sync.test.ts`, `universal-route-matrix.test.ts`, `roles-tab.test.tsx`, `member-grants-sheet.test.tsx` and `delegation-permissions.test.ts`. **Two module-access reads were not actually cancellable:** `groups.ts:127` and `members.ts:163` passed `signal` in `apiClient.get`'s `params` slot, which typechecks because `params` is `object` and which `check:query-signal` scores as compliant. Fixed; the gate's blindness is recorded under Known-open.

#### 10.3 Home and dashboard composition

- [x] Architecture/schema: prove Home owns composition/preferences only and does not duplicate Chat, Calendar, Inbox or Notification domain tables or implementation. — `modules/dashboard/**` contains no schema file and defines no table; every table it reads is imported from the module that owns it (announcements/attendance/leave → HR, calendar events → common/calendar, notifications → common, timesheets → Timesheets, deals/activities → CRM, projects/tickets/sprints → Build). Home composes; it does not re-implement.
- [x] Access locality: make the backend Home section manifest authoritative and generate the frontend contract from it; it must match every live controller route, module requirement, permission and cache namespace, no hand-maintained parallel registry may remain, and CI must fail on stale generated output without importing backend runtime code into Next.js. — `home-manifest.generated.json` (16 sections) is derived from the backend controller and consumed by `home-sections.ts`; `check:home-manifest` diffs a regeneration and its self-test covers 8 drift cases. No backend runtime is imported into Next.js.
- [x] Routes/contracts: define a bounded per-section dashboard contract with independent success/error metadata and permission-safe projections. — Sections resolve through `settle` with a per-section `degraded[]`, so one failure never fails the response. Every list read is now capped: `leaves-today` returns `{ data, total, hasMore }` from its own count rather than truncating silently, `team-attendance` takes `present`/`clockedIn` from a dedicated aggregate so the row cap cannot corrupt them, and the project-id list feeding `IN (...)` is bounded. `dashboard-read-limits.spec.ts` + `dashboard-home-scope.spec.ts`.
- [x] Authorization/privacy: derive each section from caller identity and effective access; prove calendar, people, payroll and communication data cannot leak through summaries/counts. — Every handler reads `@CurrentUser()`; every gate is applied before its query. **A real leak was found and closed here:** `GET /dashboard/executive` was gated only on `hr:analytics:read` with no module gate and returned CRM MRR, pipeline value, new-lead count and lead conversion rate — the frontend merely hid them behind `useCan("crm:leads:view")`, which CLAUDE.md §1.5 makes advisory. The CRM half of the projection is now resolved before any deal or lead is read, the fields are omitted rather than hidden, and the two shapes are cached under distinct keys so a CRM-less answer can never be served to a CRM caller. `dashboard-executive-projection.spec.ts` (4 tests) asserts no CRM table is even touched when the gate denies.
- [x] Queries/cache: verify parallel bounded aggregation, no N+1/fetch-all behavior, per-section cache ownership and mutation invalidation from source modules. — Aggregation is parallel and bounded; no query is issued inside a loop anywhere in the module. Cache keys carry org, actor, scope and permissions version. Three unbounded org-wide reads (`getLeavesToday`, `getTeamAvailability`, `buildTeamAttendance`) were capped, and `resolvePersonalDashboardModules` no longer issues 7 module-availability calls for 3 distinct modules.
- [x] Query efficiency: resolve the caller's organization membership once in `DashboardPersonalService`, reuse it across enabled sections, preserve calendar visibility predicates and record a maximum database-call count per Home request. — membership resolved once at the top of `getPersonalDashboard`; the duplicate lookup inside the timesheets branch removed; a regression test asserts the lookup fires exactly once and the request stays within a recorded ceiling of 6 database calls.
- [x] Frontend/TanStack/tests: verify independent Suspense/error/loading/empty states, stable query keys, partial failure isolation, responsive rendering and widget-level allow/deny E2E. — Each widget is wrapped in `HomeSectionBoundary` with its own loading/error/empty state and keys come from the shared factory. **One real coupling was removed:** `shouldRenderDashboardLoading` included `useDashboardStats.isLoading`, so a slow `/dashboard/stats` blanked the entire page — quick actions, setup banners and every other widget included — while access had already resolved. Stats now render their own skeleton in place. The `public-documents` section no longer hand-writes its access block: the manifest generator was extended to cover declared external Home endpoints, so backend drift on `GET /hr/documents` is now caught by CI instead of being invisible. Frontend Home tests 8 suites / 47 green; `check:home-manifest` self-test extended 8 → 14 checks including the class-level-module shape it previously could not parse.
- [x] Repair the eight failing Home section-isolation tests at current head and add a regression test proving the membership lookup cannot bypass disabled-section query suppression or turn one section failure into a full Home failure. — the spec's database adapter did not implement the newly added membership lookup; the adapter was repaired and no negative-query or failure-isolation assertion was weakened. Two regression tests added for the disabled-section and single-section-failure cases. 151 dashboard tests pass.
- [x] Reuse one request-local `/me/access` result for authenticated-layout MFA/route decisions and TanStack hydration; prove exactly one backend access call per navigation instead of `getServerAccess` plus `prefetchAccess` duplication. — `prefetchAccess` now calls the React `cache()`-wrapped `getServerAccess` rather than issuing its own `serverGet`, so both consumers share one request-scoped result. Asserted by `access-call-count.test.ts`.

#### 10.4 Settings and module-access administration

- [ ] Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules. — S01: **disproven, three surfaces.** `/settings/automations` (a cross-module trigger catalog spanning lead/deal/ticket/invoice/leave/onboarding events), `/settings/custom-fields` (whose `entityType` enum is CRM-only: `lead`/`deal`/`contact`) and `/settings/integrations/git` are module-owned surfaces sitting in global settings, contrary to root §8. A holder of `settings:automations:manage` mutates cross-module automations with no module membership. S01 did not move them because the destinations are Build and CRM controllers — S06 and excluded CRM respectively. Everything else under `/settings/*` is genuine organization configuration or access governance.
- [x] Routes/contracts: verify organization profile, hierarchy, security, members, roles, module access and billing settings expose canonical non-duplicated routes and strict contracts. — S01 closed its portion; **S07 has now closed billing settings**: exactly the two canonical pages exist with no resurrected `/billing`, `/billing/ai-credits`, `/settings/subscription` or `/billing/seats`; all 17 `billing:*` and 9 `payments:*` frontend keys match the backend catalog verbatim; 12 billing/payment DTOs gained `.strict()` and real bounds, each checked against its actual frontend payload; and `check:contract-registry`, `check:contract-breaking-change`, `check:route-classification` and `check:operation-ids` all pass. The one duplicate found (`/payments/providers/:providerKey/credentials/rotate`, behaviourally identical to `/credentials` with no caller) is classified `published`, so it is retained for a real deprecation window rather than deleted. S01's finding: `mfaEnforced`, `allowedEmailDomains` and `ipAllowlist` were writable through **both** `PATCH /organization/settings` and `PATCH /organization/security` under the same `settings:manage` key. The two paths had diverged — `ipAllowlist` was `.max(100)` with `.max(128)` entries on the security route and completely unbounded on the settings route, so the bound was one request away from being bypassed; and the settings route wrote the Redis allowlist **before** the database, so a failed update left Redis serving a policy Postgres never stored, for a 3600 s TTL. The security route is now the sole writer, its two writes run in one `runInTenantTransaction`, and the cache is written after the transaction. 20 request schemas across `organization`, `settings`, `access` and `mfa` gained `.strict()`; `allowedEmailDomains` gained a 100-entry / 253-char bound and API-key scopes and automation actions/conditions gained caps.
- [x] Authorization: test owner/admin/member visibility and mutations, last-owner protection, hierarchy scope, module owner administration and record-level denial. — S01. `JwtAuthGuard + PermissionGuard` are class-level on `settings.controller.ts:58`, `entitlements.controller.ts:22` and `user-module-access.controller.ts:19`, every handler carries `@RequirePermission`, and owner-only operations call `assertOwnerOnly` (`organization.controller.ts:363/401/414/446`). The settings role route cannot change the owner's role (`settings.service.ts:315-319`); core modules cannot be disabled and plan-locked modules cannot be enabled on FREE (`entitlements.service.ts:216-229`). `check:owner-authority` confirms nothing fabricates ownership and every owner gate reads the catalog.
- [ ] Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches. — S01: invalidation proven (`invalidateSettingsCache` fans out to `org:settings`, `org:profile` and the MFA policy; module toggle invalidates the module map and every active member's session cache). **Held open on tenant-leading indexes** for the same reason as §10.1 — it requires measured plans against the production-shaped seed.
- [x] Frontend/TanStack/tests: verify canonical routes, form-schema parity, dirty/error/conflict states, permission-backed navigation and mutation invalidation. — S01. Form-schema parity was **not** in place: the security form allowed a 5000-character IP textarea against a backend cap of 100 entries, so an over-long list failed as an API 400 instead of in the form. Both lists now carry matching entry-count and per-entry bounds, covered by `org-security-schema.test.ts`. The sessions panel gained the missing error state — it previously rendered a failed `GET /sessions` as "No active sessions found", a false all-clear on a security surface. `useUpdateMyProfile` now invalidates `queryKeys.organization.members()`, which it changes and previously left stale.

#### 10.5 Directory, Me and universal self-service

- [x] Architecture/schema: preserve one organization-person identity with membership, worker and employment facets; resolve subjects through the person seam without cross-tenant inference. — `organization_people` is the single per-org person row and `resolvePerson` (`person-seam.ts:264`) dispatches three isolated paths, each asserting the org on every read; a cross-tenant subject resolves to `unresolved` rather than leaking. No competing resolver exists.
- [x] Routes/contracts: use `/me/*` for self operations, derive subject from authentication and separate directory projections from sensitive HR/payroll projections. — All 26 `/me/*` routes repo-wide take `@CurrentUser()` and accept no client-supplied subject; none carries `@RequireModule`. **The projections were not separated and are now:** `GET /directory/people` and `/people/:id` are `@Universal()` and returned the full row, so every member could read every colleague's date of birth, gender, nationality, home address and emergency contact. `DIRECTORY_PERSON_COLUMNS` now backs both reads and `toDirectoryPerson` narrows written rows; `directory-person-projection.spec.ts` renders the real select list and asserts each restricted column is absent. None of the removed fields was rendered by any directory surface.
- [x] Authorization/privacy: prove universal member access only to allowed self-service/directory records and separate HR/payroll administrative widening through DataScope. — Universal self-service survives a per-user module denial because `self` has no module-registry entry, so `isCoreModuleKey` keeps its grants out of `stripDeniedModules`; the `hr:*`/`timesheets:*` entries that *are* strippable back only module surfaces, never a `/me/*` route. **One widening filter did not bite:** `GET /directory/employment` was `@Universal()` and batch-resolved employment facts for up to 100 arbitrary user ids; it now requires `settings:view` — the same gate as the member list it decorates, and a key no plain MEMBER holds.
- [x] Queries/cache: verify minimal projections, bounded directory search, tenant-safe person resolution and invalidation across membership/worker/employment changes. — Directory search is capped and keyset-paginated. **`getFactsBatch` and `getSensitiveFactsBatch` were rooted at the global `users` table with no tenant re-entry**; both now inner-join `organization_members` on `(org_id, user_id)`, asserted by two rendered-SQL tests. `getDirectReportUserIds` is bounded before feeding an `IN (...)` clause.
- [x] Frontend/TanStack/tests: verify self and administration keys never collide, universal navigation survives disabled paid modules and cross-person/cross-org denial tests pass. — Self and administration keys are distinct factories; the 8 directory mutation hooks now carry their exact backend key and a new test proves the guard refuses to issue the command without it, rather than merely disabling a button. Directory suites 14/153 green.

#### 10.6 HRMS

- [x] Architecture/schema: audit people/employment, leave, attendance, recruitment, onboarding, performance, benefits, documents and approval lifecycles for normalized tenant-safe relations and justified table ownership. — Audited across 123 HR controller files and their services. Relations are normalized and org-scoped; no table ownership was found misplaced. One schema-adjacent regression from S02's composite-FK conversion was caught by an HR spec whose scan only knew the inline `.references()` form, and is recorded against S02.
- [x] Routes/contracts: verify resource-specific controllers, strict Zod/OpenAPI contracts, self versus administration routes, bounded bulk operations and no client actor/current-org fields. — Controllers are resource-specific with body schemas in `dto/`. Every one of the 566 S04 mutation routes carries `@RequirePermission` or an explicit `@Universal()` — zero undeclared, confirmed by `check:route-classification`. Bulk id arrays are bounded (`check:bulk-id-limits`, 3,187 files). Client-supplied id fields were classified individually; every one acts on a *different* person, never on the caller or the active org.
- [x] Authorization/privacy: test own/team/department/branch/org DataScope, sensitive projection controls, candidate/employee separation, approvals and cross-tenant record denial. — DataScope is enforced at the data layer, not in a guard. **Two approval defects fixed:** `leaveApprovalScope("team")` additionally required the approver to be the requester, which the self-approval guard then always denied — a team-scope approver could see pending requests on the roster and never approve one; and `LeaveCalendarController` was the only HR administration controller missing `@RequireModule("hr")`, so a stale `hr:leaves:read` grant survived the module being disabled. `hr-module-gate.spec.ts` reads real decorator metadata rather than scanning text. Candidate/employee separation holds at the self-service seam, though the pipeline is gated on `hr:employees:*` for want of an `hr:candidates:*` key — recorded against S01/S02 because it needs catalog, role-template and migration work.
- [x] Queries/cache/workers: verify cursors, filters, exports, leave balances, attendance and review paths; tenant-leading indexes; cache invalidation; bounded reminders/imports/exports. — All 7 HR keyset cursors agree with their ORDER BY. Exports stream through a keyset cursor to a temp file. **Two fixes:** the employee list cached under `hr:employees:cursor:*` was never invalidated by any mutation and now uses a versioned namespace bumped on update and onboarding; `HrDashboardReportsService.exportRows` — a routeless query materialising up to 10,000 rows including a decrypted `taxId`, with zero callers — was deleted rather than capped. Two missing indexes are recorded against S02, which owns schema.
- [x] Frontend/TanStack/tests: verify canonical HR routes, form parity, self/admin separation, all UI states, responsive tables/forms and full CRUD/approval/cross-tenant E2E. — Routes are canonical, self surfaces call `/me/*` and administration surfaces call admin hooks. Form/schema parity was checked field-for-field against the backend `dto/`: the WFH form's combined `reason` + `notes` could exceed the backend's 1,000-character cap with no field-level message, and now cannot. **A stale-view defect fixed:** rejecting a leave did not refresh the this-week roster and cancelling one refreshed neither the team view nor the roster, so a rejected or cancelled leave kept showing the person away; `leave-decision-invalidation.test.tsx` covers all three decisions and asserts the read and invalidate key shapes match, so no invalidation is inert.
- [x] Classify every HR mutation hook as universal/self or permissioned; route non-universal leave, attendance, recruitment, onboarding, performance, benefits and document commands through the exact authorized-mutation interface and prove in-flight revocation behavior. — 219 unclassified HR/Directory mutation hooks were routed through `useAuthorizedMutation`, each using the key read from the backend handler that serves it rather than inferred from the hook's name or folder; two `@Universal()` hooks were classified SELF with their route recorded. Repo-wide unclassified fell 895 → 677 and the gate baseline was ratcheted to match. `check:permission-keys` independently confirms every key resolves in both catalogs, and the frontend typecheck is the second proof since `PermissionKey` is a closed union. In-flight revocation is proven by `hr-mutation-revocation.spec.ts`: SUSPENDED, REMOVED and INVITED memberships are all refused at command time on a still-valid token, because the acting membership is re-resolved from the database inside the command.

#### 10.7 Payroll

- [ ] Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] Routes/contracts: verify calculation, lock, approve, publish, reverse and export operations use strict schemas, idempotency and explicit state transitions.
- [ ] Authorization/privacy: test payroll owner/admin/member, approver, self-payslip, separation-of-duties, sensitive projections and every mutation hook.
- [ ] Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
- [x] Make Payroll finalization and Accounting posting crash-consistent through a transactional outbox: emit an idempotent posting intent inside the Payroll lock transaction, consume it durably in Accounting, expose `pending/posted/failed` state and prove rollback cannot leave a journal while retries cannot duplicate one. — `locking.service.ts` emits `payroll.run.posting-intent` via `OutboxWriter.emit(tx, …)` on the lock's own transaction handle, so the intent rolls back with the lock. `PayrollPostingIntentConsumer` claims the inbox row atomically and posts idempotently; `postJournal` remains keyed on `(PAYROLL_RUN, runId, finalized)`. `posting_state` added by migration `0933`. 8 tests cover induced outer rollback, crash-between-commit-and-consume, duplicate delivery, malformed payload, cross-tenant mismatch and retry-on-failure.

#### 10.8 Build/PM

- [x] Architecture/schema: keep project and product entities distinct inside Build; verify workspaces, projects, products, tickets, boards, sprints, roadmaps, OKRs, feedback and QA relations. — S06. `projects` (`db/schema/build/core.ts:28`) and `managed_products` (`build/managed-products.ts:19`) are distinct tables joined only by the nullable `projects.managed_product_id`; nothing merges them. Full chain re-verified against source, every table `org_id NOT NULL` with `org_id` leading its composite indexes. Two shape gaps recorded for S02, not changed here: there is no `boards` table (a board is derived from `project_statuses` at query time, so board-level settings have nowhere to live), and `roadmap_items`/`feedback_posts`/`okr_goals` reach a managed product only through nullable `project_id` hops, so a product-scoped rollup silently drops rows with a null `project_id`.
- [x] Routes/contracts: verify canonical `/build` resources, strict schemas, stable cursors/filter/sort contracts, idempotent mutations and bounded bulk operations. — S06. Two prefixes broke §8 and were moved: `product-management/workspaces` → `build/workspaces` (9 operations, 2 frontend callers, 6 e2e route literals) and the whiteboard hub `whiteboards` → `build/whiteboards`; both were `internal permissioned`, so no published contract broke, and `check:route-duplicates` stays at 0 ambiguous routes. **Zero `.offset(`** in Build or Workflows — every list uses the `limit + 1` keyset probe, backed by 7 cursor/keyset specs. `check:bounded-contracts` reports 0 violations under `/build` or `/workflows`; `check:bulk-id-limits`, `check:idempotent-commands` and `check:envelope-consistency` all clean. Indexed board/backlog/search **plans** remain unproven pending the seeded scratch database.
- [x] Authorization: test workspace/project/product membership, module roles, record scope, private resources, watchers/assignees and cross-tenant identifiers. — S06. Build carried **two** project gates and most sub-modules used the weaker one: `assertProject(orgId, projectId)` proves only that the project exists in the caller's org, never membership. Any org member holding the module's `:view` key could pass an arbitrary `projectId` and read that project's risks, incidents, decisions, forms, QA, meetings, milestones, change requests and client-visibility settings, while `GET /build/:projectId` returned 403 to the same caller. The canonical policy is now `build/core/project-access.ts` and 12 services use it, each with a bite test proving a non-member is refused and a member admitted. Whiteboards deliberately keeps its own share/visibility ACL. Cross-tenant identifiers: 6 Build write paths accepted client-supplied foreign keys (`projectId`, `epicTicketId`, `linkedRoadmapItemId`) without confirming org ownership and now validate through `roadmap-references.ts`.
- [x] Queries/cache/events: verify board/backlog/search plans, ordering tie-breakers, counters, cache invalidation and duplicate-safe activity/notification events. — S06. **Three Build queries were runtime-fatal and every gate was green on them**: `checkProjectAccess`'s team branch and `searchOrgTickets` referenced `organization_members` with no FROM entry (42P01), and `bulkUpdate`'s relational membership check was rewritten onto the root alias into `"projectMembers"."user_id"`, a column that does not exist (42703). Rendered SQL proved each. A fourth defect, `getColumnCounts`, had no access check at all and leaked any project's ticket-status distribution. All four fixed; ordering tie-breakers and counters re-verified. Events: `check:outbox-consumers` confirms all 5 `build.*` types have a registered consumer deduping on `outboxEffectIdempotencyKey`. New gate `check:unjoined-table-refs` makes the SQL class detectable.
- [x] Frontend/TanStack/tests: verify drag/reorder concurrency, optimistic rollback, filter/cursor reset, route/action parity, responsive boards and CRUD/cross-scope E2E. — S06. Kanban drag, column reorder, list-view drag and ticket update all already used one bulk call with full-snapshot `onError` rollback and `onSettled` invalidation; filters are inside the query key so a filter change resets the cursor. The gap was `/build/[projectId]/sprints`: three `Promise.all` loops issued one PATCH per ticket with no atomicity, and the sprint-completion handler sent `sprintId: undefined`, which `JSON.stringify` drops — so "move to backlog" silently left unfinished tickets attached to the completed sprint. All three now use the bounded transactional bulk endpoint, chunked at its cap of 100, and send `null`. 5 new tests. Frontend `tsc --noEmit` 0 errors. Cross-scope E2E against a seeded database remains master-only.
- [x] Replace `Promise.all` per-row custom-state reorder calls with one bounded bulk command whose backend update is transactional, idempotent and expected-version protected; return stable conflict semantics and roll back the complete optimistic order on failure. — verified already implemented at head and re-proved rather than rewritten: one `PUT /build/:projectId/custom-states` carrying `{ items: [{ stateId, order, expectedOrder? }] }`, bounded `.max(50)`, all updates in one `db.transaction`, the conflict check running *before* the transaction opens so a 409 cannot leave a partial write. Omitting `expectedOrder` makes a retry idempotent. 6 frontend + 6 backend tests, including that rollback restores the complete prior order rather than only the conflicting rows.
- [x] Remove local Build query-key factories such as `stateKeys`; all Build reads/mutations must use the canonical factory and exact invalidation prefixes. — `stateKeys` no longer exists anywhere. Four local factories were found and migrated to `queryKeys.projects.*`: `projectCustomersQueryKeys`, `rosterQueryKeys`, `teamQueryKeys` and `projectWorkspaceMembersQueryKeys` (the last also cross-imported by `projects.ts`). Two latent bugs were fixed in passing: `workspace-members.ts` used unscoped mutation keys `["projects", "workspaceMembers", …]` that missed the canonical prefix, and several `invalidateQueries` calls were un-`void`ed floating promises. Verified by a repo-wide scan returning zero references to all five names.

#### 10.9 Workflows and automation

- [x] Architecture/schema: verify definitions, immutable versions, triggers, schedules, secrets references, runs, steps, approvals and execution attempts are normalized and tenant-safe. — S06. `workflowVersions` has no UPDATE path anywhere: `publishWorkflow` only INSERTs, so a published definition is immutable by construction. Runs, steps, schedules, secrets and approvals are each `org_id`-scoped. Two execution systems coexist by design — the module-specific `workflowExecutions` and the shared `common/workflow` `workflowRuns`; both were audited.
- [x] Routes/contracts: verify create/version/publish/pause/run/cancel/retry/approve operations have strict schemas, idempotency and explicit state transitions. — S06. State transitions are CAS-enforced rather than free-form: `claimExecution` moves only from `pending`/`waiting`, so a cancelled run cannot be resumed, and `finishExecution` is scoped to `status = 'running'`, so it cannot overwrite a cancelled row. Schedule ticks dedupe by a compare-and-set on `nextRunAt`, so two workers cannot fire the same tick.
- [x] Authorization/security: test authoring versus execution/approval permissions, secret non-disclosure, module/record scope and cross-tenant trigger targets. — S06. **The publish permission was bypassable.** `UpdateWorkflowSchema` accepted `status: "published"` and `updateWorkflow` applied `{...dto}` verbatim, so a holder of `workflows:workflows:update` alone could re-publish a disabled workflow via `PATCH /workflows/:id` — re-enabling execution of the last published version without `workflows:workflows:publish`. `"published"` is now unreachable from that schema (`disable`/`archive` keep their own gated routes) and the frontend type was narrowed to match. **Four writes did not re-assert the tenant:** `updateSchedule`, `deleteSchedule`, `deleteSecret` and `deleteGlobalSecret` checked `orgId` in a separate `findFirst` then wrote on `eq(id)` alone; each is now a single statement carrying the `orgId` predicate, using `.returning()` for the 404. Secret non-disclosure re-verified: values are projected out by `SECRET_COLUMNS`, absent from run state, and the service has no Logger. Also corrected: the module-disabled e2e asserted a 402 that cannot occur, because Workflows is registered `planGated: false` and is therefore always available — the tests now assert the real contract (free module, still permission-gated).
- [x] Queries/cache/workers: verify leases, concurrency limits, retries/backoff, cancellation, DLQ, schedule deduplication, bounded histories and consumer registration. — S06. The **shared** runner is sound: `FOR UPDATE SKIP LOCKED` with `lease_expires_at` reclaim covers a crashed worker, and `decideAfterFailure` backs off with full jitter before dead-lettering on exhausted attempts. The **module-specific** runner is weaker and is recorded as open rather than rewritten: a stuck run is marked `timed_out` with no path back and no retry or DLQ, cancellation is not polled between steps so in-flight external calls still complete, and run/step/version history is unbounded. `listAllSchedules`/`listGlobalSecrets` cap at 200 rows with no cursor, so a large org's list truncates silently. These are engine feature work, not release-blocking defects.
- [ ] Frontend/TanStack/tests: verify editor/run-history state, version conflicts, permission gates, polling/subscription cleanup and deterministic execution/recovery tests. — S06 partial: permission gates verified (every `useCan` key in the workflow hooks exists verbatim in `lib/rbac/permissions/workflows.ts`) and the publish-bypass contract narrowed on both sides. Editor/run-history state, polling teardown and deterministic recovery tests are **not** done — the workflow builder has no test coverage and the engine gaps above must land first.

#### 10.10 Billing, subscriptions and payments

- [x] Architecture/schema: verify plans, subscriptions, entitlements, placements/seats, usage, payment events, invoices, adjustments, tax/currency and outbox ledgers with immutable financial history. — every ledger carries `org_id NOT NULL` with a composite tenant FK, money is integer minor units through `money-rounding.ts` bigint arithmetic with currency per row, and invoice/proration amounts are never mutated after creation. **The coupon subsystem had no tenant scoping at all** — `list()` returned every org's coupons with their redemptions, `create()` never set `org_id`, and `update`/`remove`/`evaluate` matched on `id` alone, so an org admin could read, deactivate and redeem another tenant's codes. Reads now match `org_id = caller OR org_id IS NULL`, writes re-assert `org_id` and 404 otherwise; three UPDATEs that re-asserted only the primary key gained their tenant predicate. `coupon-tenant-isolation.spec.ts` renders each WHERE with `PgDialect`; removing the two `org_id` predicates fails exactly 2 of 7. Eight schema-only findings (non-org-scoped `subscriptions`/affiliate uniques, dual money columns, free-text financial enums, residual single-column tenant FKs) are recorded in S07 for S02.
- [x] Routes/contracts: verify checkout/change/cancel, billing profile, invoices, usage and AI-credit routes are canonical, strictly validated, idempotent and provider-neutral. — every route inventoried with its validation, idempotency and neutrality. 12 schemas gained `.strict()` and real bounds; the auto-top-up `threshold` accepted `MAX_SAFE_INTEGER`, which above every purchasable pack re-triggers the top-up it just settled. Each strict schema was checked against its actual frontend payload first. `country` was accepted by the form, dropped by the backend schema and never persisted — now in the contract as the 2-character code the `varchar(2)` column holds. `POST /payments/providers/:providerKey/credentials/rotate` is byte-identical to `/credentials` with no caller; removing it failed `check:contract-breaking-change` because the committed registry classifies it `published`, so it is restored and left for a real deprecation window.
- [x] Authorization/security: test billing owner/admin/member access, provider signature verification, replay/forgery, tenant ownership, entitlement gates and sensitive redaction. — `billing-permission-fence.e2e-spec.ts` covers owner/grant-holder/member across 7 billing and 13 payment mutations plus revocation during checkout confirmation, bite-proven by neutering `AccessService.holds`. Signature verification precedes every write on both webhook paths, is timing-safe and fails closed on a missing secret or unknown provider; replay is an atomic composite `onConflictDoNothing`, not a SELECT-then-INSERT. Tenant ownership was the real gap and is covered by the coupon fix above. Credentials stay ref-pointers and webhook payloads are redacted before storage.
- [x] Queries/cache/workers: verify local entitlement resolution, seat/proration concurrency, usage aggregation, webhook dedupe, retries/DLQ and invalidation without provider calls per request. — entitlements resolve from cache/DB with no provider call, `assertWithinLimit` refuses the write when usage is unverifiable, seats serialize on `pg_advisory_xact_lock` before the count, and the `forwardOnlyStatusGuard` is applied in the upsert `setWhere` so a late `authorized` cannot overwrite `captured`. **Three gaps closed:** nothing ever re-drove a webhook the provider stopped retrying, so a paid-for credit grant recorded but unapplied stayed stuck forever — `redriveUnprocessed` re-applies it through the same settle path behind the existing effect-ledger lease, driven by a leased `GET|POST /cron/provider-webhook-redrive` whose claim window is bounded at both ends so an event past 24h dead-letters to an operator; `PlanLimitsService.fetchCount` honoured the caller's `executor` for `members` only, so every other quota read left the caller's advisory lock; and an empty `catch {}` swallowed a finance-bridge failure and returned 200, so the payment existed in billing but not in accounting. Accepting an enterprise quote now busts the entitlement cache it invalidates.
- [x] Frontend/TanStack/tests: verify the two canonical Settings billing pages, plan/seat/usage/invoice states, mutation invalidation and deterministic outage/replay/proration E2E. — exactly `/settings/billing` and `/settings/billing/ai-credits` exist, with no resurrected `/billing`, `/billing/ai-credits`, `/settings/subscription` or `/billing/seats`; duplication was tested by reading both candidates rather than by name. All 17 `billing:*` and 9 `payments:*` frontend keys match the backend catalog verbatim. Four ungated surfaces fixed: `useValidateCoupon` fired without `billing:subscription:manage` (403 per keystroke for a view-only holder), the auto-top-up switch was interactive without `billing:ai-credits:purchase`, the profile tab rendered an empty *editable* form to a user without `billing:profile:view`, and clearing the billing email sent `""` into an `.email()` check so the field could never be blanked. `billing-hook-gates.test.tsx` proves each gate bites — reverting one turns the assertion red. Backend billing 42 suites / 510 tests, billing e2e 3 / 113, cron 21 / 158, frontend 224 / 2135.
- [x] Keep provider-specific identifiers, verification fields, route names and SDK behavior behind the Billing adapter seam; frontend callers consume provider-neutral checkout-session/confirmation contracts, Razorpay is the first adapter and a Stripe-ready contract test requires no Billing caller change. — eleven leaks crossed the seam: three provider-named routes (`GET|POST|PATCH /billing/razorpay`), `razorpay_order_id/payment_id/signature` in the verify schema, `razorpayKeyId` in the subscription response, and a `handleRazorpayWebhook` alias. Callers now use `/billing` + `/billing/checkout` with `{ orderId, paymentId, signature }` and `publicKeyId`; DB column names keep their provider spelling because a column is internal, not a contract. `billing-provider-contract.spec.ts` drives a `FakeProviderAdapter("stripe")` through the same caller path and asserts the neutral schema **rejects** the `razorpay_*` names, so it fails if a caller regains a provider dependency. **Two defects the agent report missed, both found by checking rather than trusting:** the frontend was left calling all three deleted routes (`hooks/api/subscription.ts`), so subscription reads and checkout confirmation were dead end-to-end — typecheck cannot see it because the routes are string literals; and removing the webhook alias broke 30 tests in `billing-webhook.spec.ts`, the spec proving a signature is verified *before* any side effect or ledger write. The live webhook path was never broken (the controller already called the neutral `handlePaymentProviderWebhook`), so the alias was genuinely dead and the spec was repointed with every security assertion intact.
- [x] Route every non-universal subscription/payment mutation through the exact billing/payment permission interface; billing remains non-delegable and tests cover owner/admin/member denial plus revocation during checkout confirmation. — every billing and payments mutation inventoried with its key, and all 20+ keys confirmed **verbatim** against `rbac/permissions/{billing,payments}.ts` rather than assumed. `billing-permission-fence.e2e-spec.ts`: 69 tests covering owner-allowed, grant-holder-allowed and member-denied (403) across 7 billing and 13 payment mutations, plus revocation *during* checkout confirmation. Non-delegability was already enforced and is unchanged — `assertPermissionsGrantable` refuses the whole `billing:` namespace even for an org owner. Bite proof: neutering `AccessService.holds` to `() => true` turns the 403 into a 200, so the denial is not vacuous. Billing suites: 40 files / 496 tests pass.

#### 10.11 Accounting and finance

- [ ] Architecture/schema: verify accounts, journals/entries, expenses, reimbursements, invoices, payments, reconciliation and immutable reversal relationships balance and preserve tenant scope.
- [ ] Routes/contracts: verify posting, approval, reimbursement, reconciliation, reversal, export and reminder operations use strict schemas, idempotency and valid financial state transitions.
- [ ] Authorization: test finance roles, approver separation, record/DataScope, employee self-expense access, immutable posted records and cross-tenant denial.
- [ ] Queries/cache/workers: verify ledger/report/export plans, bounded reminder sweeps, asynchronous resumable exports, retries/cancellation/DLQ and derived-balance invalidation.
- [ ] Frontend/TanStack/tests: verify monetary precision, approval/reversal conflicts, report cursors, export job state and balanced-journal/cross-tenant E2E.

#### 10.12 Chat

- [x] Architecture/schema: verify channels, memberships, messages, threads, reactions, attachments, receipts/read cursors and durable events are normalized with tenant/channel composite integrity. — every chat table has a non-nullable `org_id` and org-composite FKs, including the self-referential `fk_chat_messages_org_reply`. Read state is `last_read_at` on `chat_channel_members`, not a second table. `chat_channels` keeping both `is_private` and `type='PRIVATE'` with no invariant is recorded as open for S02 (S08).
- [ ] Routes/contracts: verify channel/message/thread/reaction/read/history/export routes use strict schemas, bounded cursors, server-derived actors and idempotent client message keys. — schemas, bounded cursors and server-derived actors verified (S08); **stays open** because message send still has no client idempotency key, which needs a unique index from S02.
- [x] Authorization: test channel membership, private/direct conversations, thread inheritance, every mutation hook, attachment access and immediate issued-token revocation. — every mutating chat route asserts channel membership at the data layer with an org predicate. Three defects fixed: `sendThreadReply` and `ChatReactionsService.assertMessage` looked their target up without `orgId`, so a cross-tenant id collision produced a 23503 500 instead of a 404; and pins, reactions and summarize answered 403 to a non-member of a *private* channel, confirming the channel exists. Evidence `chat-private-channel-denial.spec.ts`, each DENY paired with a public-channel 403 control. Attachment URL durability is recorded as an open item, not claimed (S08).
- [x] Queries/cache/realtime: verify stable message ordering, indexed history/thread/reaction/unread paths, no unread scans, duplicate-safe fanout, reconnect/offline recovery and safe cache invalidation. — history and threads keyset on `channelPosition` (ordered by a channel row lock, served by `idx_chat_messages_channel_position`). Two defects fixed: the unread count omitted `org_id`, the leading column of `idx_chat_messages_unread`, so that index could never be used; and `markRead` assigned `last_read_at` instead of `GREATEST(...)`, letting the older of two concurrent marks rewind the cursor. `listMembers` also paged 100 rows with no `ORDER BY`. Offline backfill past one 100-row poll page is recorded as open (S08).
- [x] Frontend/TanStack/tests: verify infinite-query cursor merge, optimistic send/reaction rollback, dedupe, unread state, reconnect, permission removal, responsive/a11y behavior and concurrency E2E. — cursor merge uses the server `nextCursor`, realtime dedupes by message id at both the Ably handler and render, and every read hook is gated on effective access with `signal` forwarded. Two defects fixed: `GET /chat/channels` answers `{ channels, nextCursor }` while the hooks declared `Channel[]` and the sidebar hid it with `as Channel[]`, so the sidebar read `.filter` off an object — **no channel rendered and channel search threw**; and five Ably payloads were cast from `unknown` with no validation, now `safeParse`d. Browser concurrency E2E is not claimed — no seeded database in this workspace (S08).
- [x] Replace `ChatChannelsService.listMemberChannels`' unbounded membership read and fixed 100-channel truncation with stable tenant/member-scoped keyset pagination and a continuation cursor; add a scanner regression fixture for a user in more than 100 channels. — keyset ordered `(lastMessageAt DESC NULLS LAST, id DESC)` with a base64url cursor returning `{ channels, nextCursor }`.
- [x] Make huddle attendee creation and notification fanout bounded, resumable and queue-backed with recipient checkpoints and tenant concurrency limits; the start request must not retain all members or launch per-member provider calls. — the member-notify loop is keyset-paged at 500 per batch with a `membershipId` cursor; the attendee loop was already batched at 500. `check:unbounded-reads` no longer reports the file.
- [x] Enforce one active huddle per `(org_id, channel_id)` and serialize participant-cap admission atomically; prove concurrent start/join requests cannot create duplicate huddles or exceed plan/settings caps. — `pg_advisory_xact_lock` on `(orgId, channelId)` taken before the existence check and insert, so a concurrent second caller finds the existing huddle and joins. An `isNewHuddle` flag gates realtime publish, audit and fanout so only the first caller fires side effects.
- [x] Require active channel-membership assertion before mark-read, mark-unread, mute and unmute read or mutate channel state; inaccessible private channels return 404 and denial tests exercise revoked/non-member callers. — `assertMember` validates active org membership, channel membership and non-archived channel across the huddle read/mutate paths; the cross-tenant probe returns `NotFoundException`, never 403.
- [x] Replace per-visible-tab 15-second presence heartbeats with authoritative Ably connection presence; permit only one leader-elected browser heartbeat fallback with jitter, backoff and offline/visibility handling, and prove multitab/reconnect load budgets. — the 15s `setInterval` in `chat/page.tsx` fired `POST /chat/presence/heartbeat` from **every visible tab**, so five tabs meant five heartbeats per 15s. Presence is now Ably channel presence on `chat:{orgId}:presence`, entered on connect and re-entered once per reconnect; a dropped connection removes the member with no timer. The fallback heartbeat runs only when Ably is unavailable, in one tab elected through the Web Locks API (`navigator.locks`, exclusive) — chosen over BroadcastChannel because the platform releases the lock automatically on tab close, whereas a BroadcastChannel election needs leader-liveness heartbeats, which is the anti-pattern being removed. Backoff doubles to 120s with 5s jitter; it does not run while hidden or offline. Budgets are asserted as counts, not adjectives: 0 heartbeats while Ably is connected, 1 per interval across 5 tabs, 0 when hidden, 0 when offline. 14 new tests; 71/71 chat tests pass.

#### 10.13 Calendar

- [x] Architecture/schema: verify calendars/sources, events, attendees, recurrence rules, exceptions, reminders and synchronization state are normalized with tenant-safe attendee relations. — S09. `event_attendees` is keyed `(org_id, event_id, membership_id)` with composite tenant FKs to both `calendar_events` and `organization_members`, so an attendee cannot straddle tenants; exceptions live in their own `calendar_event_exceptions` table rather than a JSONB array; sync state is the normalized `calendar_provider_sync_queue`. Tenant isolation is covered by passing specs for attendees, export, recurrence, external events and both sweeps.
- [x] Routes/contracts: verify event/series/occurrence, RSVP, free-busy, conflict, reminder and export routes use strict schemas, bounded ranges/cursors and a standard RRULE library. — S09. RRULE is the `rrule` library via `RRule.fromString`/`between`, never hand-rolled. Ranges: `listEventsSchema` 120 days, `exportSchema` 366 days — and `externalEventsQuerySchema` was **unbounded**, letting any member drive Composio calls over an arbitrary span; it now enforces `end > start` and `CALENDAR_MAX_SPAN_DAYS`, verified end-to-end (121-day, reversed and 99-year ranges all rejected; 90 days accepted). `check:bounded-contracts` and `check:bulk-id-limits` report 0 in-scope violations.
- [x] Authorization/privacy: test calendar/source visibility, attendee privacy, own/shared/admin operations, private events, cross-tenant IDs and every mutation hook. — S09. The `visibility = 'org' OR creator OR attendee` clause is applied on every read path — list, export and attendee/RSVP — so a private event never leaks its title or attendees; `calendar-privacy.spec.ts` and `calendar-visibility.spec.ts` pass. Own-calendar routes are deliberately `@Universal()` (`calendar:read` is an unconditional employee-self-service grant), while `listAttendees` and `export` keep `PermissionGuard`; the frontend was firing `GET /calendar/events/:id/rsvp` with **no** gate and now matches the route's `calendar:read`.
- [ ] Queries/cache/workers: verify timezone/DST, recurrence expansion limits, free-busy/conflict indexes, reminder replacement/deduplication, sync retries and range/source cache invalidation. — S09: everything except **indexes** is proven. DST round-trips through `toZonedTime`/`fromZonedTime` with BITE PROOF cases in `calendar-dst-edge.spec.ts`; expansion is capped at 500 occurrences per event and `CALENDAR_EVENTS_CAP` per source; reminder dedupe is `onConflictDoNothing` on `(orgId, dedupeKey)` with move/cancel tombstoning in the same transaction; sync retries are 5 attempts with `[0, 30s, 120s, 600s, 1800s]` backoff under `FOR UPDATE SKIP LOCKED`. **A silent truncation was fixed:** the reminder sweep read attendees with one `.limit(10_000)`, no `ORDER BY` and no continuation, so beyond that count a nondeterministic subset of people were never reminded — now keyset-paged with chunked inserts, bite-proven. STILL PENDING: index plans are unmeasured. The missing `recurrence_end` index is now authored as migration `0982` — `(org_id, start_date, recurrence_end) WHERE rrule IS NOT NULL`, ordered equality then range-and-sort then residual so the `ORDER BY start_date` comes from the same index pass — with a journal entry at `when = 1803000010067`, above the live watermark `1803000010025`, so it cannot be silently skipped. It is **authored and deliberately NOT applied**: 41 other sessions' migrations are pending on the same journal, and one `db:migrate` would apply all of them to the shared database. It is also **unmeasured** — the dev database holds 100 calendar events and 0 recurring ones, so `EXPLAIN` as `streamline_app` would compare nothing. Applying and measuring are the orchestrator's, once the batch is ready.
- [ ] Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E. — S09: everything except **browser E2E** is verified. There is exactly one `/calendar` route (`features/build/views/calendar-view.tsx` is an in-page board tab, not a page); series-versus-instance editing routes through `EventSeriesScopeDialog` to distinct occurrence and series endpoints; range bounds are in the query key so a range change refetches while invalidation still matches by prefix; event detail now states the viewer's timezone. `CalendarEventsPanel` was an unbounded `.map()` over up to 2,000 rows and is now windowed with `react-window`. The HR calendar source 403-spammed every user without `hr:helpdesk:view` on every mount (it fired first and caught the 403 in an effect, and that state resets on remount) — now gated proactively on the real key plus `@RequireModule("hr")`. An occurrence that an exception reschedules **into** the window now renders on both the list and export paths (previously it was generated by neither, so a meeting moved from Monday to Saturday vanished for anyone viewing that week), and the end anchor bug that surfaced with it — an exception setting `modifiedStart` without `modifiedEnd` produced an end before the start — is fixed in `expandToOccurrences` and pinned. STILL PENDING: the browser E2E run, which needs a booted app against a seeded database.
- [ ] Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence. — `calendarProviderSyncQueue` (migration `0934`) is written inside the same request transaction as the event, so no inline network call happens on the request path. `CalendarProviderSyncSweepService` claims rows with `FOR UPDATE SKIP LOCKED` under `forEachOrg`, retrying up to 5 attempts with `[0, 30s, 120s, 600s, 1800s]` backoff. **S09 re-audit — unchecked, because this was checked while three of its clauses were unmet.** VERIFIED DONE: atomic intent, `pending` state, asynchronous processing, idempotent lease, retry/backoff, per-event monotonic ordering (`order by id`) and delete tombstones; the queue payload is now Zod-parsed instead of `as`-cast, so a malformed row enters the retry path rather than silently pushing wrong data. **Update:** user-visible status and manual retry now SHIP — `GET /calendar/events/:eventId/sync-status` and `POST /calendar/events/:eventId/sync-retry`, `@Universal()` like the rest of own-calendar, authorized at the data layer by the same visibility predicate as attendee reads with retry restricted to the event creator, plus a frontend surface that renders a failed sync with its attempt count and a Retry control and polls only while unsettled. STILL PENDING: **drift reconciliation**, which is blocked on a product decision rather than effort — a reconciler must define who wins when a provider edit and a local edit disagree (local wins, provider wins, or surface the conflict), and that rule has not been set. NOT APPLICABLE: discarding stale webhooks — there is no inbound calendar webhook receiver at all; sync is push-only.
- [x] Consolidate Calendar member list/search behind one permission-gated lookup interface; both paths require `directory:people:view` and test missing, granted and revoked access. — **the premise was wrong in a way that mattered.** There were no two backend implementations; the calendar module has no member-lookup endpoint at all. Both paths were in `frontend/hooks/api/calendar.ts`, calling the same `GET /org/members`, and `useCalendarMemberSearch` carried **no `useCan` gate whatsoever** while `useCalendarOrgMembers` did. Consolidated into `useCalendarMemberLookup`, which ANDs `useCan("directory:people:view")` into `enabled` on every call; four call sites migrated. The key was confirmed verbatim at `rbac/permissions/directory.ts:5` rather than assumed. Backend `OrgController.listMembers` was already correctly gated and takes `orgId` from the JWT. The e2e bite proof builds two apps — one real, one with `holds` forced true — and shows 403 versus 200, so the denial is not vacuous.

- [x] Render an occurrence that an exception reschedules **into** the visible window. `expandToOccurrences` generates nominal occurrences inside the window and matches exceptions by `occurrenceStart`, so an exception whose `modifiedStart` moves an instance in from outside is never emitted on the list or export paths — the meeting is simply missing from the calendar. `CalendarReminderSweepService` already handles this with a second pass over exceptions; list and export do not. Pre-existing, surfaced by S09 while making those two paths exception-aware. **DONE:** the exception fetch now ORs on `modifiedStart` within the window (still keyset-paged and org-scoped) and both paths run the second pass, deduplicated against the first so an in-window move is emitted exactly once. Owner: S09.

#### 10.14 Inbox and mail

- [x] Architecture/schema: verify accounts/conversations/messages/participants/labels, metadata, delivery/sync cursors and attachments have normalized tenant/account ownership. — S09. `mail_message_metadata` is keyed by `(org_id, user_membership_id, account_id, message_id)` and `mail_sync_checkpoints` by `(account_id, folder)`, both org-scoped; message bodies and attachments are never mirrored into our database — they are read through the user's own provider connection, so there is no second copy to keep tenant-safe. `mail-metadata-isolation.spec.ts` **was vacuous** (it built the whole service from `jest.fn()`s and asserted a mock called with X was called with X) and is rewritten against the real service with `PgDialect.sqlToQuery`, proven to fail when the `org_id` predicate is removed.
- [x] Routes/contracts: define one bounded Inbox contract for list/thread/search/read/label/archive/send/reply/attachment operations with strict schemas and provider-neutral adapters. — S09. 15 routes across `MailController` (11) and `InboxController` (4); every one carries a classification decorator, every one with parameters carries `@Validate`, and both list contracts cap at 50 per page. `mail-normalizers.ts` translates Gmail and Outlook into `MailMessageSummary`/`MailMessageDetail`, and no provider field name (`labelIds`, `conversationId`, `isFlagged`) reaches a response. The service dispatches on `acc.provider` rather than through a formal `IMailProvider` interface — recorded as a design observation, not a contract defect, since the published shape is already neutral.
- [x] Authorization/security: test account ownership/delegation, recipient/attachment access, HTML sanitization, unsafe links/content and cross-tenant conversation/message IDs. — S09. Every read and write calls `assertOwnedConnection(orgId, userId, accountId)` — a three-column predicate — before any provider call, and list narrows to the caller's own pre-scoped accounts, so no account, message, thread or attachment id from the client is trusted. Sanitization is at the render boundary: DOMPurify with a tag/attribute allowlist, `ALLOW_UNKNOWN_PROTOCOLS: false`, remote-image blocking and `rel="noopener noreferrer"` hardening, covered by a bite-proof XSS test; a new `mail-html-render-boundary.test.ts` fails if any second component in `features/mail/**` ever renders raw HTML, proven by injecting one. A DOMPurify hook leak on a sanitizer throw was closed with `try/finally`.
- [ ] Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys. — S09: idempotency and invalidation are proven, indexes are not. **Found and fixed a P0:** every Gmail reply was addressed to a message id — `mail.service.ts` passed `messageId` into `replyToThread`'s `recipientEmail` parameter and both are `string`, so the compiler could not see it and no reply reached its recipient; the provider now takes a named options object so the swap cannot compile, and the recipient is resolved from the original message. **`POST /mail/send` and `/mail/reply` were not idempotent**, so a retry duplicated an email to an external recipient; both now carry `@Idempotent`, and `check:idempotent-commands` was blind to them (its `CRITICAL_ROUTE_RE` listed `send-signin` and `test-send` but not a bare `send`), so the gate was widened and proven load-bearing. Incremental sync is idempotent by `onConflictDoUpdate` on `(accountId, folder)` and `(accountId, messageId)`. On bounce/DLQ: this surface sends through the **user's own** mailbox via Composio, so bounces return there and we own no sending domain — synchronous failure plus a now-safe user retry is the correct design; platform-sent transactional email, which does need suppression and DLQ, is 10.15's `modules/email`. STILL PENDING: ordering/search/unread index plans are unmeasured; there is no `GET /mail/unread-count` and no partial index for it, and `mail-metadata.service.ts` search uses leading-wildcard `ILIKE` (currently off the hot path, which skips the cache when a query is set).
- [ ] Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E. — S09: everything except **browser E2E** is verified. **Found and fixed a P1: `useMailAction`'s entire optimistic update was dead code.** It matched with `queryKeys.mail.messages()`, whose trailing `undefined` fourth element TanStack's partial matcher never matches, so `getQueriesData` returned zero entries, every `setQueryData` was a no-op and `onError` restored nothing — archive, trash, mark-read and star were never optimistic. Proven empirically against a real `QueryClient`: the old key matched **0** entries, the true 3-element prefix matched **1**. Fixed, extended to co-patch the unified-inbox cache, and pinned by a test asserting the old key still finds zero. Inbox lifecycle mutations (archive, delete, pin, snooze, approve, reject) failed **silently** with no toast and no rollback; every S09 call site now surfaces `getErrorMessage`, and the hook-level gap is reported to 10.15. Both lists are windowed with `react-window`; thread hydration reads a dedicated endpoint; revocation renders a Connect / Reconnect path rather than broken data. **Legacy Inbox hooks: nothing to remove** — `knip` reports zero unused exports under `features/inbox`, `features/mail`, `hooks/api/inbox.ts` and `hooks/api/mail.ts`. STILL PENDING: the browser E2E run.

#### 10.15 Notifications, email and push

- [x] Architecture/schema: verify notifications, recipients, preferences, templates, delivery attempts, provider events, read state and dedupe keys are normalized and tenant-safe. — every table carries `org_id` with an org-composite actor FK; the global event catalog's nullable `org_id` is covered by a partial unique. Dedupe is the durable unique `notification_deliveries.idempotency_key` (S08).
- [x] Routes/contracts: verify list/read/read-all/preferences and administrative template/test routes are strictly validated, bounded and idempotent. — **P0 fixed**: the preference upsert targeted `ON CONFLICT (user_id)`, but `0415` dropped that unique and `0918` replaced `(org_id, user_id)` with `(org_id, membership_id)`, so Postgres raised 42P10 and **every preference save returned 500**. Unit tests mock the Drizzle chain and never resolve a target against a real index, which is why it survived. Now targets `(org_id, membership_id)` with the membership requirement hoisted ahead of the write; `notification-preference-upsert-target.spec.ts` asserts the target against the table's actual unique indexes via `getTableConfig`, so code or schema drift fails it (S08).
- [x] Authorization/privacy: test recipient-only reads/mutations, administrative template scope, sensitive payload minimization, tenant-safe realtime channels and unsubscribe/consent rules. — recipient scope derives from `@CurrentUser()` on every read and mutation and a cross-recipient miss returns 404, not 403; administrative routes resolve verbatim catalog keys. Two fixes: `removeSuppression` verified ownership then deleted on `id` alone, and `WebPushService` selected push subscriptions by `user_id` with no org predicate, so a person in two organizations received one tenant's push on the other tenant's device registration — `org_id` is now bound on the read, the fan-out and the expired-endpoint delete (`web-push-tenant-isolation.spec.ts`). Consent-withdrawal enforcement at dispatch remains untested (S08).
- [x] Queries/cache/workers: verify indexed unread counts without scans, at-least-once duplicate-safe dispatch, outbox consumers, retry/backoff/DLQ, bounce/complaint/suppression and provider adapter failure. — unread counts are served by the partial `idx_notifications_unread_count (org_id, membership_id, id)`; claims use `FOR UPDATE SKIP LOCKED` with lease reclaim; retry is bounded with backoff/jitter into a terminal `DEAD`; suppression is consulted on two layers before any provider call and no transaction is held across a provider HTTP call. **One defect fixed**: broadcast recipient resolution read the whole organization membership with no limit or cursor before chunking, and its spec built the 50,000-member list in-process so the query was never exercised — it is now a 500-per-page keyset generator dispatching per page. Provider responses are still not schema-validated; recorded as open (S08).
- [x] Frontend/TanStack/tests: verify notification/count key consistency, optimistic read rollback, realtime dedupe, preference forms, accessibility and replay/revocation/cross-tenant E2E. — mark-read, mark-all and bulk-read patch `InfiniteData<Notification[]>` page by page behind type guards with zero casts, snapshot and restore list and unread count together, and survive concurrent realtime delivery. Fixed: the bell had no live region, so an arriving notification was announced to no screen reader; a `role="status" aria-live="polite"` region now carries the count. The notifications page still has no offline state, and cross-tenant browser E2E is not claimed without a seeded database (S08).
- [x] Repair mark-read, mark-all and bulk-read optimistic updates to patch `InfiniteData<Notification[]>` page-by-page rather than treating the cache as `Notification[]`; atomically preserve rollback snapshots and unread counts under concurrent realtime events. — two type guards (`isInfiniteData` narrowing on `"pages" in data && "pageParams" in data`, and `isNotificationList`) with **zero casts**, plus shape-aware snapshot/patch/restore helpers. All three mutations handle both the infinite and flat shapes. 13 tests including a 2-page patch, rollback, and a concurrent-realtime-vs-optimistic case.
- [x] Replace growing per-recipient transactions and in-memory recipient maps with cursor-resumable bulk persistence, checkpoints, tenant concurrency/backpressure and duplicate-safe provider delivery; no worker invocation may retain or dispatch the complete recipient set. — `NotificationDispatchService.emit()` splits recipients into 500-id chunks, each written as an independent outbox row with a `:c<N>` dedupe-key suffix, so a crash mid-fanout loses only unprocessed chunks and processed chunks stay idempotent.

- [ ] Give the notification lifecycle mutations an `onError` and a rollback. `frontend/hooks/api/notifications-inbox.ts` — `useArchiveNotification`, `useUnarchiveNotification`, `useDeleteNotification`, `usePinNotification`, `useUnpinNotification`, `useSnoozeNotification`, `useApproveNotification`, `useRejectNotification`, `useBulkArchive`, `useBulkDelete` — carry only `onSuccess: invalidateInbox`, so a failed archive or delete is silent: no toast, no rollback, and the row keeps its stale state. S09 fixed this at its own `features/inbox` call sites; the hook-level gap is owned here because the hooks are Notifications implementation. Owner: S08.

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

- **S08 closed with eight named open items, and the P0 it found argues for a
  gate.** The notification-preference upsert named `ON CONFLICT (user_id)` on a
  table whose only remaining unique index is `(org_id, membership_id)` — every
  preference save had been returning 500. Nothing caught it: the service specs
  mock the Drizzle chain, so a conflict target is never resolved against a real
  index, and no gate compares upsert targets to the schema. The repair asserts
  the target against `getTableConfig` output, which is a pattern worth
  generalising into a scanner across all `onConflictDoUpdate` call sites.
  Two more defects of the same family — invisible to every green gate — were a
  chat unread count that omitted `org_id`, the leading column of the very index
  meant to serve it, and `WebPushService` selecting subscriptions by `user_id`
  with no org predicate, so a person in two organizations received one tenant's
  push through the other tenant's device registration. A third was pure contract
  drift: `GET /chat/channels` answers `{ channels, nextCursor }` while the hook
  declared `Channel[]` and the sidebar silenced it with `as Channel[]`, so the
  channel list rendered nothing and channel search threw — a live break that a
  clean typecheck actively concealed, since the cast is what made it compile.
  Still open and owned: chat message send has no client idempotency key (needs a
  unique index from S02); `messages/poll` truncates at 100 with no cursor and no
  truncation signal; chat attachment URL durability is unestablished pending a
  storage decision with S12; provider responses are not schema-validated;
  the delivery worker has no per-organization fairness limit; `listMembers`
  pages 100 with no cursor; the notifications page has no offline state; and
  `chat_channels` carries both `is_private` and `type='PRIVATE'` with no
  invariant tying them together.

- **S01 found a checked box that a blind gate had certified, and the same
  lesson lands for the third time.** `check:query-signal` asks whether a read
  *mentions* `signal`. `apiClient.get` is `(url, params?: object, signal?)`, and
  an `AbortSignal` is an `object`, so `apiClient.get<T>(url, signal)` typechecks,
  scores as compliant, and cancels nothing. A positional parse of every
  `apiClient.get`/`delete` call found **26** reads with `signal` in the `params`
  slot. S01 fixed its two (`hooks/api/module-access/groups.ts:127`,
  `members.ts:163`). The remaining 24 belong to other sessions and are listed
  here so no one has to re-derive them: `accounting/banking.ts:258`,
  `accounting/dimensions.ts:94`, `build/checklists.ts:17`,
  `build/comment-permalink.ts:41`, `build/custom-fields.ts:66`,
  `build/ticket-activity.ts:39`, `build/ticket-queries.ts:138`,
  `crm/activity-timeline.ts:93`, `git-integration.ts:106`, `hr/policies.ts:110`,
  `hr/termination.ts:113`, `hr/workforce.ts:93`,
  `inventory/sales-orders-queries.ts:72`, `inventory/transfers.ts:229`,
  `mail.ts:68`, `mail.ts:81`, `payroll/ess.ts:48`,
  `payroll/payout-batches.ts:22`, `payroll/payout-batches.ts:231`,
  `renderer/layouts.ts:64`, `renderer/layouts.ts:144`, `subscription.ts:143`,
  `support/kb-attachments.ts:35`, `surveys/analytics.ts:94`. Two of those are
  CRM/Inventory and out of release scope. The durable fix is not the 24 edits:
  it is narrowing `params` so an `AbortSignal` cannot occupy it, which makes the
  whole class a compile error instead of a gate's blind spot (S11).

  **The same gate has a second, larger blind spot.** It reads only a
  **150-character window** after each `queryFn:` (`WINDOW = 150` in
  `check-query-signal.mjs`) and skips the queryFn entirely if no
  `apiClient.get`/`post` appears inside it. Any multi-line body — the common
  `queryFn: ({ pageParam }) => { const params = new URLSearchParams(…); … return
  apiClient.get(…) }` shape — puts the call past the window and out of scope. A
  full-body parse of all 1,038 queryFns that call `apiClient` finds **48**
  invisible to the gate, of which **47** destructured no `signal` at all. S01
  fixed its four (`module-access/catalog.ts`, `groups.ts`, `members.ts` ×2);
  **43 remain across 36 files** and belong to other sessions. Between the two
  blind spots the gate's "0 violations across 399 files" was concealing ~69
  non-cancellable reads. Fixing the window is not enough on its own — a body
  parse plus a positional argument check are both required, each with a
  known-bad fixture in the shape it currently misses.

- **A stale jest transform cache is indistinguishable from a boot failure until
  you clear it.** The first S01 e2e run reported 7 suites dead with
  `ReferenceError: channelListQuerySchema is not defined` at
  `chat-channels.controller.ts:65` — a decorator evaluating an identifier that
  both exists and is imported, which reads exactly like a circular-import boot
  break. `--no-cache` on the same suite passed; after `jest --clearCache` the
  full set ran 15/16 green (338 tests, 1 skipped). Nothing was wrong with the
  source. Before diagnosing a load-time `ReferenceError`, clear the cache.

- **S01 P0, fixed: MFA reset was cross-tenant.** `POST /auth/mfa/reset` took
  `userId` from the request body and `MfaService.reset` resolved it against the
  **global** `users` table with no organization predicate and no membership
  assertion. Any holder of `settings:mfa` in any tenant could disable MFA and
  delete the backup codes of any user on the platform, including another org's
  owner. Fixed at source; `mfa-tenant-isolation.spec.ts` was proved load-bearing
  by deleting the `org_id` predicate and watching 2 of its 4 tests go red. Two
  neighbouring gaps closed with it: `/auth/mfa/verify` and `/disable` had no
  rate limit at all, and the file's existing "cross-tenant isolation" spec
  tested a non-existent user id rather than a foreign tenant — it was named for
  a boundary it never crossed.

- **Three module-owned surfaces still sit in global `/settings/*`**, contrary to
  root §8: `/settings/automations` (a cross-module trigger catalog covering
  lead, deal, ticket, invoice, leave and onboarding events),
  `/settings/custom-fields` (whose `entityType` enum is CRM-only) and
  `/settings/integrations/git`. S01 did not move them because the destinations
  are Build and CRM controllers. Related: `updateCustomFieldSchema` is the one
  settings schema left un-`.strict()`, because its only caller
  (`hooks/api/crm/custom-fields.ts:72`) spreads an undeclared `entityType` the
  backend currently strips — strictening without fixing the caller returns 400.

- **`GET/POST/DELETE /settings/api-keys` has no frontend caller.** Recorded as a
  deletion candidate, not deleted: §10 requires knip plus a real `nest build`,
  and the shared tree currently carries several sessions' uncommitted work, so
  neither proof would be attributable.

- **A correction to an earlier S01 disposition: the leading-wildcard `ILIKE`
  finding is not a migration task, and calling it one would have sent S02 to
  build something that cannot work.** Under RLS every search operator on this
  platform is `proleakproof = false`, so a trigram qual is demoted to a
  post-filter and the GIN index is never used by `streamline_app` — measured
  0.34 ms as `neondb_owner` against 134.8 ms seq-scanning as the app role, same
  index, same data. `ALTER FUNCTION … LEAKPROOF` requires a true superuser and
  Neon grants that to nobody, including the database owner. The only remedy that
  works here is a targeted `SECURITY DEFINER` id-probe owned by a `BYPASSRLS`
  role, returning ids only, bounded `cap+1` with an `ILIKE` fallback at the cap;
  five such functions exist today, each with exactly one caller. The standing
  decision is to add them only where a scan is measured, never by rule across
  the ~213 `ilike()` call sites, because each wrapper is a place a wrong `WHERE`
  leaks across tenants. Recorded because the wrong remedy is the intuitive one.

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
- **Bulk-`ids` bounding is closed, and closing it exposed a blind gate.**
  `check:bulk-id-limits` reported zero violations across 292 `*.schemas.ts`
  files — true, and misleading, because it only ever looked at that one filename
  pattern. A scan of every non-spec source found three more it could not see,
  one of them a real defect: `POST /chat/huddles/:id/invite` accepted an
  unbounded `userIds` array declared **inline in the controller**, alongside a
  hand-written `{ userIds: string[] }` — an unbounded body plus two CLAUDE.md §6
  violations. Moved to `huddle.schemas.ts`, typed via `z.infer`, bounded at
  `HUDDLE_MESH_MAX_PARTICIPANTS` (10) since a longer list can never be admitted.
  The gate now scans all 3,174 sources and its self-test carries a fixture in the
  controller-inline shape it used to miss. Two allowlist entries record why an
  outbox payload and a Gmail response shape must NOT be capped: a cap there
  truncates legitimate work rather than limiting attacker-controlled work.
  This is the second instance of the same lesson already recorded above — a gate
  can be blind to the syntax, or the file, it audits.

- ~~**22 bulk-`ids` request bodies still lack an upper bound**~~, not 32 — the
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
- **The backend jest suite is RED: 51 failing suites, 156 failing tests, of
  1,627.** Down from 53/169. Six were confirmed lane-introduced and fixed,
  including a genuine production race in the KB ingestion consumer where the
  per-org concurrency counter was incremented AFTER the first `await`, so all 20
  concurrent calls read `current = 0` and the limit never limited anything.
  **The "pre-existing" classification has now been disproved by repair, which is
  a better method than the archaeology it replaces.** Settling provenance was
  said to require a checkout of `d054dab9`; fixing the suites needed no checkout
  at all, and the causes were legible from the failures themselves. Two of the
  ten "modules this programme never touched" were caused by this programme:
  - `common/slo` failed because `payroll-posting-intent.consumer.ts` -- the queue
    consumer **AR-07 added** -- had no SLO objective, so a durable financial
    posting queue shipped with no alert coverage.
  - `common/pagination` failed because three payroll keyset comparisons
    interpolated raw values into a Drizzle `sql` template instead of binding
    through `sql.param`.
  The remainder are dominated by two shapes, both consequences of this
  programme's own work: the `.offset()` to `.limit(n + 1)` cursor migration left
  doubles whose terminal resolving step was `.offset()`, so `await chain` yielded
  the chain object rather than rows; and service splits changed constructor
  arity, which **typecheck is the only gate that sees**.
  Repaired so far and verified by independent re-run, not from agent report:
  payroll + workflows + finance/banking at **147 suites / 1,199 tests green**,
  plus `common/pagination`, `common/slo` and `billing` (40 suites / 496 tests).
  Build, organization, support, AI, outbox and upload-controls are in progress.
  Two traps to carry forward: piping a jest run into `tail` and reading `$?`
  returns tail's status and hides the failure -- that produced a false "exit 0"
  in this session -- and a path-filtered run that looks green proves nothing
  about the other 1,500 suites.

- **The frontend jest suite was RED and nobody had measured it: 23 failing
  suites, 79 failing tests of 2,072.** No prior reconciliation recorded frontend
  test state at all, so this was invisible rather than accepted. The dominant
  cause is the signal-propagation lane: forwarding
  `QueryFunctionContext.signal` changed every read from
  `apiClient.get(url, params)` to `apiClient.get(url, params, signal)`, and 23
  suites still assert the two-argument call. **That PRD item is checked complete
  and reports "0 violations across 399 files" -- which was true of the gate it
  ran, and false of the suite it broke.** A gate proving the source is right is
  not evidence the tests still pass. Repair is in progress; the standing rule for
  it is that a precise `toHaveBeenCalledWith(url, params)` may gain an explicit
  signal argument but must never be relaxed to `toHaveBeenCalled()` or blanket
  `expect.anything()`, which would delete the contract rather than update it.

- **`check-contract-breaking-change` had a bypass built into its own
  remediation, and it is now closed.** The gate detects a removal by finding a
  registry entry with no matching operation in `openapi.json` -- but
  `generate-api-contract-registry` rebuilt `operations` solely from current
  OpenAPI paths, silently dropping removed entries. The full loop was: delete a
  published route, watch the gate fail, run `pnpm registry:generate` exactly as
  the failure message instructs, and both the entry and the finding disappear.
  The generator now retains entries whose operation is gone, and the checker no
  longer advises deleting them. Proved load-bearing by flipping a tombstone back
  to `published` and re-running a full regeneration cycle: the gate still exits 1.
  Related finding, **now resolved (S03)**: the generator mapped every
  `x-exposure: permissioned` route to `published`, so all 3,539 ordinary app
  routes counted as customer contracts and the deprecation rule fired on routine
  internal refactoring. `x-exposure` answers *how a route is authorized*, not
  *who committed to it*. The rule is now: `permissioned`/`universal` → internal;
  `public`/`in-service` → internal unless the path is on `PUBLISHED_PATHS`;
  anything unrecognised → published, fail-closed. That yields **100 published
  operations**, each recording the external consumer that justifies it — the
  agent-token API (9), portal clients (4), inbound provider webhooks (4),
  `/public/*` widgets and emailed forms (58), external support chat/CSAT (8),
  emailed link redemption (5), JWKS, the API-key lead ingest, and marketing
  content. `/cron` (120), `/health` (4) and the session-establishment `/auth`
  routes are externally reachable but consumed by our own infrastructure and
  frontend, so they are internal. `registry:generate:self-test` pins the rule
  with 15 cases including both fail-closed defaults.

  **Closing it exposed a second bypass in the same gate — the third instance of
  this pattern.** The generator copied retained (removed-operation) entries
  verbatim, so `classificationOverride` was ignored on exactly the entries
  `check-contract-breaking-change` reads. The published-removal proof the earlier
  round describes therefore could not have been reproduced by that route.
  Fixed and re-proven end to end: flipping `GET /billing/razorpay` back to
  published makes the gate exit **1**; reverting makes it exit **0**.

- **The vendored frontend contract was three commits stale, and
  `check:contract-drift` was green anyway.** `frontend/contracts/openapi.json`
  still advertised the pre-AR-01 `POST /auth/session-exchange` body carrying
  caller-supplied `userId` and `sessionId`, plus 32 bulk-id bodies without
  `maxItems`. A drift gate that compares the frontend to a stale vendored spec
  proves the frontend agrees with a document, not with the backend — only
  `check:contract-vendor`, which was RED, could see it. Re-vendored: 9 operations
  added, 3 removed, 33 changed, all 33 `requestBody`-only. The removed
  `/billing/razorpay` routes have zero frontend callers.

- **`GET /auth/session-data/{userId}` still carries the AR-01 shape this PRD
  records as rejected (owner: S01).** It is `@Public()`, takes the subject as a
  path parameter, and is gated only by a shared `INTERNAL_API_SECRET` that
  `frontend/lib/auth.ts` also holds (`auth.controller.ts:169-182`,
  `frontend/lib/auth.ts:12,135`). `POST /auth/session-exchange` beside it was
  hardened to derive identity from a signed proof JWT; this route was not, so a
  holder of the shared secret reads any user's org id, org role, owner flag,
  enabled modules, plan and onboarding state for any `userId`. It is not
  remotely exploitable without that secret, so this is blast radius rather than
  an open hole — but AR-01 is not finished while it stands.

- **The read-budget self-test proved nothing, and reported "INCONCLUSIVE"
  rather than failing (fixed, S03).** Its three breach fixtures inherited
  `minRows: 10` from `org-members-list`, so on any database smaller than that
  the seed-size check fired first and short-circuited all three guards it
  exists to test. Fixtures now set `minRows: 1`, and the seed-size check — a
  guard that was standing in front of the others — has its own fourth fixture.
  All four breach types now fire. Separately, `seed-scratch-e2e.mjs` only
  *advised* pointing `SCRATCH_DATABASE_URL` at a scratch database; set to the
  live URL it writes ~25,000 rows into production and `--purge` deletes there.
  It now refuses a database whose name lacks `scratch` or that equals
  `DATABASE_URL`/`APP_DATABASE_URL`. And the seed's `mail_message_metadata`
  insert named a `user_id` column that does not exist on that table inside a
  `.catch(warn)`, so every mail row was silently skipped while the budget
  filtered on `user_membership_id`.

- **Cache invalidation was dropped on the first Redis error (fixed, S03).** A
  failed cache *read* degrades to the database and is correct; a failed
  *invalidation* leaves a stale entry serving, so it is the one operation that
  must not be swallowed. All four invalidation paths now retry with backoff and,
  on final failure, log at error with the stable marker
  `cache.invalidation.dropped` and increment a counter. Related and **still
  open (owner: S01)**: `AccessVersionChannel.publish` swallows a failed
  `store.clear`, so a Redis outage during a permission mutation leaves the old
  shared version in Redis; after recovery other instances read it and serve
  revoked permissions until that key's TTL expires. The durable row remains the
  authority, so this is a bounded staleness window, not a lost revocation — but
  the bound is a TTL nobody has declared as the revocation consistency contract.

- **Spec-inclusive typecheck is now 0 errors**, closing the 10-error baseline
  recorded above. Every fix taught a double what the source already does; none
  removed a dependency, weakened an assertion or excluded a file. Notably, four
  of the ten were caused by this programme adding `sha256`/`url` to
  `UploadResult` and new constructor dependencies to KB, storage and workflow
  services -- further evidence against the "pre-existing" reading.

- **Read budgets now have their reproducible seed, and the budgets are green
  (closed, S03).** An earlier run measured against a shared development database
  and was rightly rejected. The evidence now comes from `scratch_e2e` — 1,023
  tables, 573 applied migrations, seeded deterministically and idempotently with
  a minority-size second org, `VACUUM ANALYZE`d at the end — measured as
  `streamline_app` with the tenant GUC set by `set_config(…, true)` inside the
  transaction: **55 PASS / 0 FAIL / 11 EXCL / 4 SKIP over 70 budgets**, exit 0.
  That supersedes "43 below minimum seed size and 27 skipped": **0** are below
  minimum seed size.

  Two things this round is worth recording for. First, **the blocker was
  asserted, not checked** — an earlier reconciliation in this session wrote
  "no `scratch_e2e` database exists" on an agent's word; one `pg_database` query
  showed it had existed all along, fully migrated and seeded. Second, the
  seeder's `mail_message_metadata` insert named a `user_id` column that does not
  exist on that table (it is `user_membership_id`), inside a `.catch(warn)`, so
  every mail row was silently skipped for as long as the seed has existed —
  which is why `mail-inbox-cached` is one of the four skips. Fixed; the other
  three skips are CRM party-search fixtures, outside scope.

- **Four privilege and privacy defects shipped behind a client-side check, and
  the pattern is worth naming.** All four came out of S04 and all four had the
  same shape: the frontend hid the data, so the surface looked gated. The
  universal `GET /directory/people` returned every colleague's date of birth,
  gender, nationality, home address and emergency contact — none of which any
  directory screen renders, so nothing looked wrong. `GET /dashboard/executive`
  returned CRM revenue, pipeline value and lead conversion to any
  `hr:analytics:read` holder while the widget hid those cards behind
  `useCan("crm:leads:view")`. `GET /directory/employment` was `@Universal()` and
  batch-resolved employment facts for 100 arbitrary user ids, rooted at the
  global `users` table with no tenant re-entry. And `HrDashboardReportsService.
  exportRows` materialised 10,000 rows including a decrypted `taxId` from a
  method no route ever called. The lesson to carry: **a projection is the gate.**
  Hiding a field in the client leaves it on the wire, and an unrouted query is
  still a query someone will route later.
- **A scoped approver could see work they could never do.** `leaveApprovalScope`
  narrowed `team` to `approverMembershipId = me AND userMembershipId = me`, which
  the self-approval guard then denied unconditionally — so `GET /hr/leaves/team`
  listed pending requests that `PUT /hr/leaves/:id/approve` answered with a 404
  for every team-scope holder. Its spec asserted the bound *parameters*
  (`[7, 7]`) and so documented the defect as intended behaviour. A scope test
  that only checks which values are bound cannot see that the predicate is
  unsatisfiable.
- **S04 findings owned elsewhere, recorded once here.** S02: `leave_balances`
  needs an `(org_id, user_membership_id, year)` index that three hot paths
  filter on, and the employee list and org chart sort on
  `lower(coalesce(users.name,''))` with no functional index; separately, the
  composite-FK conversion in `hiring-candidates.ts` tripped an HR spec whose
  scan knew only the inline `.references()` form — the FK rule was intact, the
  scan was blind, and it now reads both forms. S01/S02: the recruitment
  candidate pipeline is gated on `hr:employees:view`/`:manage` because no
  `hr:candidates:*` key exists in either catalog, so a grant meant for the
  employee directory also opens the pipeline. S01: a platform admin holding an
  org membership is routed into the employee onboarding wizard because the
  session type cannot express platform-admin status. S01/S12: the four
  `/me/api-tokens` routes are the only `/me/*` routes not gated on a `self:*`
  key.

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
