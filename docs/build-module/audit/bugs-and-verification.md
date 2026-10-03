# Bugs and verification ledger

Status: Current unverified historical findings; Planned remediation

## Problem Statement

Planning a fix is not evidence that a historical browser failure is resolved. Pack observations also change over time: PM-001 first described no CTA, then Owner verification showed CTAs existed with failed persistence/loader. Preserve chronology and current uncertainty.

## Solution

Retain source evidence, map findings to canonical interfaces, and close only on current actor-specific persisted behavior. Refer to [research traceability](./research-traceability.md) for all source IDs and screenshots.

## User Stories

1. As an owner, I want an invitation to yield real access, so that collaborators start without support.
2. As a client, I want a successful grant to open my project, so that success messages are trustworthy.
3. As a Member, I want assigned projects visible, so that a blank list does not resemble data loss.
4. As an administrator, I want revocation to stop reads and jobs, so that stale grants do not leak data.
5. As a tester, I want the exact actor/environment/version, so that a screenshot cannot hide an incomplete lifecycle.

## Implementation Decisions

| Finding | Historical evidence | Planned seam | Closure evidence |
|---|---|---|---|
| BUG-001 / PM-011 | cold invite acceptance intermittently blank | invitation acceptance + onboarding destination resolver | cold session, wrong-email/expired/revoked/retry, actual membership and landing |
| BUG-002 / PM-002 | org invite without intended Build access | atomic membership + module standing activation | accepted module member can create ordinary work in assigned project |
| BUG-003 | tester project membership gate | canonical project access | assigned vs unrelated project positive/negative; consistent discovery |
| BUG-004 | Member client access no CTA/denial | capability projection and access request | safe human explanation; no inappropriate grant management |
| BUG-005 / PM-001 | false-success client invite without grant/entry; see [source audit](./client-portal-activation-gap.md) | `ARCH-17-CLIENT-PORTAL-ACCESS` activation command, invitation, publication gate, and outbox | persisted grant/invitation, usable guest entry, published client-visible artifact, no false toast |
| BUG-006 | Grant Access project loader failure | scoped project queries | authorized projects list loads; empty/denied/network states differ |
| BUG-007 | contested/scrubbed observation in CI log | original evidence review before attribution | reproduce exact original condition; do not invent a fix from identifier |
| UX-022/023 | membership discovery and productive role mismatch | scoped projects + ticket commands | correct count/list; Member create/update; deny elsewhere |
| UX-024–032 | cycle/release/filter/program/triage/report/portal/form depth gaps | corresponding domain/query interfaces | filled lifecycle and negative cases, recorded in source-linked acceptance |
| RBAC/cache/DB deployment gaps | source design cannot prove target runtime | AuthContext + ScopedRead + project access + client policy | runtime-role DB isolation, cache revocation, job/export/file/AI negatives |

Do not expand a historical severity into a new release blocker without attribution. Do not call RBAC broken because a UI preset is restricted. Compare current catalog, intended role and observed behavior; findings remain verification work until reproduced.

## Current source findings (2026-10-03)

| Finding | Current source evidence | Required correction | Closure evidence |
|---|---|---|---|
| BLD-INVITE-DELIVERY-01 | Before backend `9046fc768`, `bulkInvite` ignored `queued: false` for suppressed recipients or no provider; the source now returns queue outcome, records `DELIVERY_FAILED`, and marks setup partial | Prove the persisted invitation, failure event, and owner-visible recipient state agree; close the separate manual resend and worker-failure paths | Focused source checks passed at `9046fc768`; target database event and outbox rows, owner status after refresh, recovered delivery, and a real recipient link remain open |
| BLD-INVITE-ATOMIC-02 | The earlier source concern was incorrect: `DRIZZLE` is tenant aware and redirects the injected email outbox database to the ambient invitation transaction. The focused `invitation-outbox-transaction.spec.ts` exercises the real services and proxy with a transactional fake: four commit/rollback cases pass for pending, failed, and suppressed email rows. | Preserve this shared transaction behavior and verify it against the target database and a concurrent worker; explicit executor plumbing is not justified by current source evidence. | A real database rollback leaves neither invitation nor email row, and a concurrent worker cannot dispatch before commit; retry and first-link checks remain separate under BLD-INVITE-REPLAY-03 |
| BLD-INVITE-REPLAY-03 | The earlier replay claim omitted the outer outbox consumer transaction. The publisher wraps the setup consumer in one tenant transaction, the invite runs in a nested savepoint, and the inbox has a unique producer-event/consumer fence. Source therefore indicates a pre-commit crash rolls back invite, email, and inbox together; post-commit replay sees `COMPLETED` and skips. | Preserve the transactional inbox fence. Do not add a setup correlation schema solely to fix this unproven duplicate-send claim. | Target database crash tests before commit and after commit/before publisher acknowledgment show one invitation, one token hash, one email row, and a completed inbox fence; intentional manual resend remains separate |
| BLD-INVITE-STATUS-PROVENANCE-05 | Before backend `e1001a934`, setup status matched an organization invitation by recipient email, so an older pending invitation could mask the current attempt. The source now writes event-scoped receipts and reads only the exact outbox/inbox event and invitation ID. | Apply and verify migration `1728`, tenant RLS/FKs, legacy null, replay, rollback, and owner/member refresh on a disposable target database and browser; see the [onboarding source gap](./onboarding-current-state-gap.md#setup-invitation-outcome-provenance). | Backend `e1001a934` passes production typecheck, 104 setup tests, 38 migration-integrity tests, and scoped lint; database application and deployed behavior remain open. |
| BLD-ONBOARDING-PLAN-01 | Before backend `9fd0b94d2`, `OrgSetupService.completeSetup` enabled selected modules without the normal plan lock; source now reads a fresh tier inside setup and rejects locked choices before provision | Align preview and server error states; prove target database rollback and coordinate concurrent subscription transitions if needed | Five focused suites/109 tests, production typecheck, and lint pass at `9fd0b94d2`; target database, preview/browser, and subscription race proof remain open |
| BLD-INVITE-RESEND-04 | Before backend `9dc80badb`, manual resend rotated the token and returned success without separating email queue refusal. The backend now reports `deliveryQueued` and a controlled reason from the idempotent response while persisting the queue outcome; later worker failure is still a separate state. | Reconcile later worker outcomes with the invitation record and prove target database/recipient behavior | Backend `9dc80badb`, OpenAPI `d6bf011f5`, frontend response contracts `a48b731cb`/`306b0a636`, and owner presentation `1f608bc96` pass focused source/contract/UI checks; worker failure, provider retry, browser, and actual mail remain open |
| BLD-MODULE-REVOKE-01 | Before backend `f3d962afe`, direct standing removal left group, personal, or delegated permission active; source now writes a per-user deny and filters historical structural admin denials | Prove the override and cache/session revocation at runtime; preserve Org Owner/Admin access and verify regrant through every authorized path | Focused source checks passed at `f3d962afe` and direct/transfer regrant at `876b6f1e1`; target database, cache revocation, live session, job/export/file/AI, and role negatives remain open |
| BLD-MODULE-REGRANT-02 | Before backend `876b6f1e1`, direct RBAC role assignment and accepted ownership transfer could grant positive standing while an earlier per-user deny remained; those paths now clear the deny through the Access-owned writer in the same transaction | Define consistent reactivation for other positive group-grant paths and prove the committed state at runtime | Seven suites/84 tests, production typecheck, and scoped lint pass; existing revoked member regains only intended module access after target database, audit/version/cache, browser, and negative-role proof |
| BLD-MIGRATION-CHAIN-01 | Historical migration `0965_ar02_canonical_tenant_fks_3.sql` adds a composite foreign key to `invitations(org_id,id)`, while a source search of earlier SQL found only the `id` primary key and no composite unique prerequisite. The new `1728` index runs later and cannot repair a cold migration chain. | Follow the [migration chain gap](./migration-chain-gap.md): add a safe, reviewed prerequisite before `0965` without rewriting an applied migration; prove cold and upgrade paths. | Disposable database applies the complete journal from empty state and an upgraded snapshot; catalog shows the intended composite key/FK, rollback is rehearsed, and no deployed checksum is invalidated. |

These findings are source-level and remain Current unverified as deployed behavior until the named runtime evidence is collected.

## Intake processing reconciliation — 2026-10-03

`BLD-INTAKE-TRANSITION-08` is a source and bounded runtime correction under `ARCH-04-REQUEST-CONVERGENCE`, supporting BLD-011 and BLD-035. The previous `IntakeService.updateIntake` read pending state before its transaction. Competing decisions could both create a Ticket or overwrite the processed state. Its focused regression first produced two successful accepts where only one should succeed.

Backend `53a369619` moves the independent Intake owner from `execution/workspace.service.ts` to `execution/intake.service.ts`, with direct DI/import consumers and no forwarding facade. It locks the exact organization/project/request row in the tenant transaction, checks the locked state, and creates the canonical Ticket plus the pending-qualified request transition atomically. A missing result or failed write rolls back; processed requests retain the existing 409 contract. Publication runs after the owned transaction commits or through the ambient transaction's after-commit hooks; missing ambient hooks fail rather than publish early. List/create contracts, permissions and the canonical ticket creation interface remain unchanged. The unused controller schema import was removed without changing its response decorators.

Five focused suites passed 98 tests, including concurrent decisions, current locked state, tenant/project misses, creator/request rollback and ambient commit/rollback behavior. Independent review passed. Production TypeScript and scoped test TypeScript passed; the latter includes every changed spec and both RBAC scenario/adaptor imports, not the entire repository test suite. Exact eleven-path ESLint passed with zero warnings. Module-registration self-tests passed 13 cases and the real gate found all 260 modules reachable. `workspace.service.ts` shrank from 589 to 440 lines and the new owner is 136 lines; the unchanged file-size rules now report 38 existing violations instead of 39. The repository-wide size and other previously reported release gates remain open.

The coordinator restarted only the verified local synthetic runner at that revision. The normal synthetic owner session created Intake 2 and 3 through the real API in Flow02 project 54, then exercised competing commands. Before the races, a separate application-role read found both PENDING with null links and zero matching Tickets. The [saved request outcomes and persisted markers](evidence/2026-10-03-intake-transition.json) contain no authentication credentials.

| Real API action | Observed result | Persisted result |
|---|---|---|
| Two concurrent accepts for Intake 2 | 409 and 200 | One accepted request linked to Ticket 359, number 3; exactly one matching live Ticket. |
| Concurrent decline and accept for Intake 3 | Decline 200; accept 409 | Request declined with its submitted reason and no link; zero matching Tickets. |
| Repeat Intake 2 acceptance | 409 | Existing link remains Ticket 359; no additional Ticket. |
| Read accepted Intake collection | 200 with one matching row | Collection agrees with stored accepted state. |
| Read creation activity | One `created` row for Ticket 359 | No live ticket comment was posted. |

An independent fresh IAM read at 10:22:10 UTC used `streamline_app`, verified no superuser/BYPASSRLS, enforced read-only mode and selected REPEATABLE READ. It rechecked the exact synthetic organization, active owner and project before querying. All six stored-state checks passed: accepted and declined decisions, exact accepted link, one matching accepted Ticket, zero declined-title Tickets and one creation activity. This separately confirms the saved persistence markers; it does not establish browser behavior or every possible concurrent ordering.

These observations use real application guards and PostgreSQL; request concurrency is an observed schedule, not exhaustive controlled interleaving proof. Database failure injection, deployed effects/workers, cache/browser refresh and the full role/tenant matrix remain Current unverified. The generic duplicate transition still accepts a same-organization ticket ID without canonical target record authorization, and its existing numeric schema is not positive/integer constrained. That requires a separately claimed correction and tests for hidden/foreign/deleted targets and the allowed cross-project policy. This slice does not claim complete Intake, Feedbucket mapping, conversion-to-project or duplicate-link acceptance.

## Testing Decisions

For every closure record: frontend/backend/worker revisions; environment and synthetic tenants; actor/principal and exact role/grant; initial state; action; persisted DB/API result; console/network; audit/outbox/job/cache evidence; unauthorized/cross-tenant negative; responsive path. Existing focused tests support closure but cannot substitute browser/persistence/deployment evidence.

Gate sequence: invite acceptance → module assignment → client grant. Then membership discovery/Member contribution → filters/current cycle → release/program links → usable triage/forms/reports. Advanced whiteboard/ops breadth stays Deferred.

## Out of Scope

Claiming any bug fixed by documentation or running destructive production tests. Missing target-environment proof stays open.

## Further Notes

Detailed authorization risks remain separately documented in [RBAC review](../governance/rbac/README.md). Evidence cleanup removes duplicate copies only, never the sole report supporting an open finding.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Preserve the historical BUG/PM/UX chronology and map each named finding to a planned seam and closure evidence in [Implementation Decisions](#implementation-decisions) and [research traceability](./research-traceability.md#adopted-decisions-and-bug-hooks).
- [x] Record the enqueue-time delivery correction at backend `9046fc768` and focused 8-suite/170-test evidence; replay, manual resend, worker failure, and runtime closure stay open.
- [x] Correct BLD-INVITE-ATOMIC-02 after tracing the tenant-aware database proxy and passing four focused commit/rollback service tests; target database and worker concurrency proof remain open.
- [x] Correct the BLD-INVITE-REPLAY-03 source hypothesis after tracing the outer consumer transaction, nested savepoint, and unique inbox completion fence; target database crash proof remains open.
- [x] Trace PM-001 from internal invite through grant, guest acceptance, and external reads in the [client portal activation source audit](./client-portal-activation-gap.md); deployed behavior remains unverified.
- [x] Record the setup plan-eligibility source gap and backend `9fd0b94d2` correction with five suites/109 focused tests, typecheck, and lint; target plan/browser proof remains open.
- [x] Record the revocation source correction at backend `f3d962afe` with 343 module-access tests plus focused access/snapshot checks; group-grant and runtime proof stay open.
- [x] Record the direct role and accepted ownership-transfer regrant correction at backend `876b6f1e1` with 7 suites/84 focused tests, typecheck, and lint; group-grant and runtime proof stay open.
- [x] Record backend `9dc80badb` manual resend queue-truth source slice: 31 focused and 44 related tests, typecheck, and lint pass; owner status, worker, and target database proof remain open.
- [x] Publish the resend queue-outcome OpenAPI at backend `d6bf011f5` and validate the frontend contract at `a48b731cb` with two suites/eight tests, scoped lint, and vendor diff checks; delivery proof remains open.
- [x] Require an exact resend response at frontend `306b0a636` and present queue acceptance, provider/suppression failure, and confirmed join-link recovery at `1f608bc96`; focused contract/UI tests and scoped lint pass, browser and worker proof remain open.
- [x] Add event-scoped setup recipient receipts at backend `e1001a934` with a journalled, reversible migration and same-org references; 104 setup tests, 38 migration-integrity tests, production typecheck, and lint pass. Database and browser proof remain open.
- [ ] Reproduce each open high-priority finding on a named current frontend/backend/worker revision, actor, tenant, and initial state; keep contested BUG-007 unattributed until its original condition is reviewed.
- [ ] Verify invite acceptance, Build standing, and client grant activation in that order with actual membership/grant rows, usable entry, retry, and wrong-identity/project negatives.
- [ ] Close BLD-INVITE-DELIVERY-01, BLD-INVITE-ATOMIC-02, BLD-INVITE-REPLAY-03, BLD-INVITE-RESEND-04, BLD-INVITE-STATUS-PROVENANCE-05, BLD-MODULE-REVOKE-01, and BLD-MODULE-REGRANT-02 with exact source corrections or disproval, focused negatives, persisted event/access state, cache behavior, and owner/member browser paths.
- [ ] Resolve BLD-MIGRATION-CHAIN-01 before claiming cold database reliability; verify the `0965` prerequisite against a disposable database and preserve migration history.
- [ ] Attach network/console, audit/outbox/cache, target DB, responsive, and unauthorized-role evidence before marking an individual bug closed.
