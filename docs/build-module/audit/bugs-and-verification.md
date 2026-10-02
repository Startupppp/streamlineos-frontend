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
| BUG-005 / PM-001 | false-success client invite without grant/entry | PortalGrants create transaction/outbox | persisted row, usable entry, client real artifact, no false toast |
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
| BLD-INVITE-ATOMIC-02 | `InvitationCreateService.bulkInvite` calls the email outbox inside its invitation transaction, but `EmailOutboxService.enqueueManyOnly` writes through its injected database rather than the invitation transaction | Give invitation enqueue a shared transaction boundary or a transactional outbox command so no queued email can refer to a rolled-back invitation | Forced rollback and concurrent worker tests prove no orphan email, valid token, duplicate send, or lost invitation across retries |
| BLD-INVITE-REPLAY-03 | A setup consumer retry after invitation commit treats its own pending invitation as a resend, rotates the token hash, and can queue another email that invalidates the first link | Persist a setup invitation correlation/idempotency key and distinguish same-attempt replay from an intentional resend without repeating email or grants | Crash at each commit/inbox boundary, replay, recipient status, email count, first-link validity, and intentional resend tests agree |
| BLD-INVITE-RESEND-04 | Manual resend can report success for a suppressed recipient because the send method returns without exposing queue refusal; later worker failure is not projected to invitation status | Surface resend queue outcome and durable delivery failure, then reconcile later worker outcomes with the invitation record | Suppressed/resolved recipient, provider failure, fresh idempotency key, worker retry, and owner status/browser tests agree |
| BLD-MODULE-REVOKE-01 | Before backend `f3d962afe`, direct standing removal left group, personal, or delegated permission active; source now writes a per-user deny and filters historical structural admin denials | Prove the override and cache/session revocation at runtime; preserve Org Owner/Admin access and clear denial on every authorized regrant path | Focused source checks passed at `f3d962afe`; target database, cache revocation, live session, job/export/file/AI, and role negatives remain open |
| BLD-MODULE-REGRANT-02 | Direct RBAC role assignment and accepted ownership transfer can grant positive standing while an earlier per-user deny remains, causing false-success access | Use the Access-owned override writer in those transaction paths and define consistent reactivation for other positive group grants | Existing revoked member can regain only intended module access through each authorized path; audit, access version, cache, browser, and negative roles agree |

These findings are source-level and remain Current unverified as deployed behavior until the named runtime evidence is collected.

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
- [x] Record the enqueue-time delivery correction at backend `9046fc768` and focused 8-suite/170-test evidence; cross-table transaction, replay, manual resend, worker failure, and runtime closure stay open.
- [x] Record the revocation source correction at backend `f3d962afe` with 343 module-access tests plus focused access/snapshot checks; direct regrant and runtime proof stay open.
- [ ] Reproduce each open high-priority finding on a named current frontend/backend/worker revision, actor, tenant, and initial state; keep contested BUG-007 unattributed until its original condition is reviewed.
- [ ] Verify invite acceptance, Build standing, and client grant activation in that order with actual membership/grant rows, usable entry, retry, and wrong-identity/project negatives.
- [ ] Close BLD-INVITE-DELIVERY-01, BLD-INVITE-ATOMIC-02, BLD-INVITE-REPLAY-03, BLD-INVITE-RESEND-04, BLD-MODULE-REVOKE-01, and BLD-MODULE-REGRANT-02 with exact source corrections, focused negatives, persisted event/access state, cache behavior, and owner/member browser paths.
- [ ] Attach network/console, audit/outbox/cache, target DB, responsive, and unauthorized-role evidence before marking an individual bug closed.
