# Active delivery backlog

Updated 2026-09-12. Start here. This directory is the single source of pending
work; specifications, ADRs and historical evidence are not additional backlogs.

## Recovery assignments: give Claude one file path

These are implementation briefs based on current source, not completed repairs.
They distinguish confirmed source defects, mocked tests and missing live evidence.
No application code was changed by this audit. Copying a brief does not authorize
production changes, real payments/email, migrations against an unidentified DB or deployment.

| Order | Standalone assignment | Owns |
| --- | --- | --- |
| 1A | [User identity](recovery-user-identity.md) — **IMPLEMENTED, VERIFICATION-PENDING** | Signup/proof, sessions, logout, switch truthfulness |
| 1B | [Access and billing](recovery-access-billing.md) | Owner cannot pay, checkout integrity, org/module RBAC, seats |
| 1B security entry | [RBAC: full-stack access verification](rbac.md) | Explicit org/module/record access assignment; same access owner, not a competing rewrite |
| 1C | [Organization setup](recovery-org-setup.md) | Creation/resume, readiness, 1–2 minute delay investigation |
| 1D | [People and invitations](recovery-people-invitations.md) | Invite lifecycle, person/member/worker/employee, onboarding |
| Shared | [Frontend data and performance](recovery-frontend-data.md) | Read ownership, caching, request cost, UI primitives, safe cleanup |
| 2A | [Inbox and notifications](recovery-inbox.md) | Universal surface, private sources, delivery/actions/counts |
| 2B | [Calendar](recovery-calendar.md) | Universal calendar, source/event ACL, sync, ranges |
| 2C | [Chat](recovery-chat.md) | Universal availability, private channels, paging/realtime |
| Later | [Build](build.md) | Existing release checks; product/UX scoping after foundation |

Each brief contains source entry points, ordered checkboxes, cache/authority
boundaries, cleanup criteria, negative tests and handoff requirements. Their flow
diagrams are architecture maps/proposals, not screenshots or runtime proof.

### How to run with two implementation agents

1. Agent A starts **identity**; Agent B starts **access/billing**. Address session
   confusion and checkout authority/binding before broad performance refactoring.
2. Once shared identity/authorization contracts are agreed, A takes **org setup**
   and B takes **people/invitations**. Serialize shared auth-hook/quota edits.
3. Coordinator assigns a bounded **frontend-data** item alongside domain fixes,
   reserving shared files first. Then assign inbox/calendar/chat one lane per agent.
4. Each returns first failing regression, smallest repair, exact changed/removed
   paths, verification/exit codes and remaining external checks in its brief.
   Coordinator reviews actual diffs and integrates one revision pair.

Architecture, code and UX are checked together inside each assigned flow, not as
three competing rewrites. Coordinator owns shared schema/migrations, global guards,
cache primitives, contract generation, cross-lane dependencies and final builds.
Shared-file reservation is recorded below; frontend-data began FD1 read-only before
it. This is agent coordination, not renewed user approval.

### Shared-file reservation — frontend-data lane, 2026-09-12

Reserved to the **coordinator** for the duration of the frontend-data lane. Other
agents may inspect and propose diffs against these files; they may not edit them.

| Reserved path | Why it is shared |
| --- | --- |
| `frontend/components/providers/query-provider.tsx` | Auth-scoped QueryClient, retry policy, MutationCache AI-wallet invalidation, build-cache-sync wiring |
| `frontend/lib/query-scope.ts` | Scope string and hash function; both server and client must compute it identically |
| `frontend/lib/prefetch/server-query-client.ts` | The only sanctioned server QueryClient factory |
| `frontend/next.config.ts` | `ignoreBuildErrors`, webpack cache, `optimizePackageImports` |
| `frontend/tsconfig.json`, `frontend/tsconfig.test.json` | Typecheck program boundaries for the application and test gates |
| `frontend/contracts/route-bundle-manifest.json` | Build-artifact provenance for the route-bundle budget gate |

Assigned exclusively to one implementation agent each, no overlap:

| Owner | Files |
| --- | --- |
| Chat lane | `frontend/hooks/api/chat-core-read.ts` and chat read hooks/screens only |
| Calendar lane | `frontend/hooks/api/calendar.ts`, `frontend/lib/query-keys/calendar*` and calendar screens only |
| UI lane (FD7) | Only the screen/component files listed in its assignment; no hook or key edits |
After two failed repair hypotheses, obtain a discriminating observation instead of
another whole-repo refactor/test loop.

## Mandatory full-stack completion contract

Every flow agent must apply this contract alongside its lane checklist. Architecture,
code and UX are one vertical assignment; a backend-only repair cannot close a flow
whose frontend, cache or deployment behavior is still broken. The RBAC entry is
`rbac.md`; new access repairs AB-05/06 remain in the access/billing brief, with one
owner and one status per task. Read the mapped requirements, not a duplicate backlog.

Before editing, enumerate every in-scope screen/action, route/method, asynchronous
consumer, persistence model and cache. Trace screen → hook → API contract → guard →
service → transaction/query → event/cache → visible result, including alternative
entry points. Mark each KEEP / REPAIR / CONSOLIDATE / REMOVE / DEFER with evidence.
An uninspected route is an open coverage gap, not an implicit pass.

| Gate | Required evidence before the flow is complete |
| --- | --- |
| 1. Product flow | Every supported entry, happy path, retry, cancellation, resume and lifecycle transition has expected behavior and a verified result |
| 2. Architecture | One responsible owner per invariant; caller/transaction/event boundaries mapped; shared changes integrated without duplicate engines or speculative layers |
| 3. Code and types | Behavior repairs reproduce the defect before/after where feasible; otherwise record the missing discriminator and keep behavior proof open. Nonbehavioral changes use applicable structural/contract checks. Affected types, lint and dependency checks pass without new suppressions |
| 4. Schema and data | Tenant/uniqueness/FK/lifecycle invariants tested; changed migration replay and recovery demonstrated on disposable DB; existing data preserved |
| 5. APIs | Request/response/envelope/pagination/error contracts match consumers; direct HTTP negatives, idempotency, concurrency and compatibility checked |
| 6. Security and RBAC | Org + module + action + record + entitlement boundaries tested; cross-tenant, suspended, revoked and nonhuman principals covered where supported |
| 7. Cache and performance | Complete writer/key/TTL/invalidation matrix; cold/warm and failed-cache tests; measured request/SQL/latency/bundle budgets under documented load |
| 8. UI/UX and accessibility | Actual screenshots and browser interaction for loading/empty/error/denied/pending/success; keyboard, mobile, zoom, readable consistent tokens and recovery |
| 9. Cleanup and maintenance | Each removed symbol/file has caller/registration/migration proof; relevant build passes; obsolete tasks consolidated while durable evidence remains |
| 10. Operations and release | Same-revision combined journey, real provider sandbox where relevant, monitoring, worker/retry recovery, deployment smoke checks and rollback owner |

Use PASS / FAIL / BLOCKED / NOT-APPLICABLE for each gate. NOT-APPLICABLE needs a
specific reason and reviewer agreement; no migration change, for example, does not
waive testing the existing constraints used by the repair. Record revision, environment,
command, expected/actual outcome and evidence location. Missing evidence is BLOCKED,
not PASS. Averages are forbidden: nine passes never cancel a billing/security failure.

The target is **all ten gates satisfied for the explicitly inspected release scope**,
not a universal “10/10” score. A checklist cannot guarantee absence of undiscovered
defects, customer satisfaction or revenue. Do not mark a lane complete with blocked
acceptance; report IMPLEMENTED—VERIFICATION-PENDING when that is the actual state.
After implementation, one independent reviewer challenges behavior/security and
another checks integration/cache/UX and reruns the original failures. The earlier
two document-review rounds do not satisfy these implementation-review gates.

## Review evidence and limits (historical audit)

Source baseline: root/frontend `510205f4b`, backend `ed6c7bef2`, plus preserved
working-tree changes. Revalidate source before implementing; line anchors can move.

Two independent review rounds completed, with a different reviewer in round 2
for every brief. Corrections were incorporated by the coordinator/authors.

| Round | Reviewer | Other authors' briefs | Material corrections |
| --- | --- | --- | --- |
| 1 | Identity | People, org setup | Response contracts, delivery modes, checked login, orphan/RLS distinction, required roles |
| 1 | People | Billing, inbox, calendar, chat | Ambient transaction qualification, quota handoff, broadcast-vs-approval reachability |
| 1 | Access | Identity, frontend data | Late session fencing, no assumed coalescing, existing query-isolation gates |
| 2 | Identity | Billing, inbox, frontend data | Explicit shared-file reservation; partial-source cursor recovery |
| 2 | People | Identity, org setup | Existing manual recovery paths and all auth-result callers |
| 2 | Access | People, calendar, chat | Existing cursor response schema; expiry recheck under lock; entity-channel creation/quota |

Reviews validate source claims and handoff safety, not deployed correctness.
Round 2 did not rerun test suites. Focused checks executed during this audit:

| Area | Result | Interpretation |
| --- | --- | --- |
| Identity | 5 suites, 38 tests passed | Existing auth checks; new defects still need regressions |
| Access/billing | 3 suites, 15 tests passed | Resolver/authority/cache checks, not payment sandbox proof |
| People | 21 passed, 1 failed | Decline notification assertion fails; passing locks include swallowed email-mock errors |
| Org setup | 23 passed, 3 failed | Durability mock returns undefined to tuple-destructuring resolver; not identical live-error proof |
| Verification race | Actual-method mock harness: two successes instead of one, exit 1 | Modeled interleaving reproduced; real DB concurrency pending |

Commands/caveats live in the briefs. Prior application typecheck passed; test types,
build and live journeys are separate gates. No current browser, measured setup
latency, real OTP delivery or payment sandbox flow was exercised. Those need a
named disposable/staging environment and realistic data; local repairs can start.

## Additional pruning review — 2026-09-12

The requested six-agent run hit the tool's thread limit. Three independent
reviewers completed six bounded assignments; this is not six distinct agents.

| Assignment | Reviewer | Scope and incorporated changes |
| --- | --- | --- |
| 1 | verify_identity_docs | Identity/setup: body-read deadlines, safe setup errors, recheck vs replay, suppressed/failed delivery cases |
| 2 | verify_people_docs | People: policy changes after invitation, account-create conflict recovery, employee input/currency, reduced setup overlap |
| 3 | verify_billing_docs | Billing/RBAC: platform webhook boundary, missing callback recovery, unrelated payment failure, late capture policy, compact completed evidence |
| 4 | verify_identity_docs | Inbox/calendar: numeric-vs-lexical cursor ordering, durable snooze, existing source caps/isolation, narrowed CSV cases |
| 5 | verify_people_docs | Chat/frontend: catch-up cursor and offline edit/delete recovery, entity revocation, preserve cross-tab mechanism, domain ownership |
| 6 | verify_billing_docs | Index/rules/release links: endpoint-aware gates, Query vs server caching, migration workflow, replay-safe effects, real acceptance prerequisites |

Removed repeated implementation-review checkboxes in favor of the mandatory
contract, machine-specific temporary-harness instructions, a nonactionable build-log
bullet and completed RBAC task instructions (dated proof retained). Moved marketplace
cleanup after payment blockers; kept unique pending release checks. No application
repairs, provider calls or new runtime test passes are claimed by this review.

## Earlier release evidence and remaining tasks

Retain these for unique pending release work. New recovery briefs own new source
repairs and supersede blanket completion claims, not historical measurements.

| Lane | Remaining ownership |
| --- | --- |
| [Architecture](architecture.md) | Existing budgets, mobile measurement and architecture acceptance |
| [Billing proof](billing-payments.md) | Deployed provider failure/recovery and approval after repairs |
| [Chat proof](chat.md) | Database probe and final evidence reconciliation after repairs |
| [Build](build.md) | Browser/performance acceptance and later product/UX decisions |
| [RBAC](rbac.md) | Existing isolation/support automation tasks and deployed revocation proof |
| [Documents](documents.md) | Unique documents/KB/e-sign release checks |
| [Production and approvals](production-and-approvals.md) | Deployment, recovery, monitoring and accountable signoff |
| [Overall release](overall-release.md) | Final integration, revision and evidence reconciliation |

The [criterion registry](../PRD-10-10-CODE-RELEASE-TODO.md) preserves stable
PRD-C001–PRD-C195 identifiers without task status. Do not recreate completed work
from historical unchecked boxes. Completed items leave the action list after
evidence is recorded; retain unique audit/security/migration history.

## Consolidation and deletion record

- Preliminary `foundation-recovery.md` was superseded by the eight owned briefs
  and this index: FR01/02/06/marketplace → access/billing; FR03 → identity; FR04 →
  setup; FR05 → people; build/cache → frontend-data; communication waves → their
  briefs; Build product hypothesis → existing Build lane. Reproduction/limitations
  were retained, not marked repaired. The untracked draft was consolidated, not
  deleted from committed history.
- Redundant `architecture-refactor/adr/README.md` conventions were merged into
  `architecture-refactor/README.md`; the tracked deleted file is Git-recoverable.
- Mixed active/completed lanes, operational evidence, migrations, tool-specific skill
  copies and active CRM specs remain. Completion labels do not make entire files
  disposable. User changes in `frontend/PAGES.md` and `frontend/buildwp.log` remain.

## Product and release boundary

Stabilize one end-to-end paid customer workflow before expanding the release.
Before Build redesign, confirm first buyer, recurring job, launch deadline and
budget. The all-in-one vision can remain the direction; it does not justify
unproved billing/access or deletion of live features. Revenue cannot be guaranteed.

Release requires combined identity→org→invite→employee→access→payment acceptance,
negative tenant tests, migration/recovery, provider reconciliation and monitoring
at one root/backend revision pair. Record residual risk and rollback owner.
Rules guide agents; executable gates and review enforce results, not a zero-bug promise.
