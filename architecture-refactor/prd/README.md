# Active delivery backlog

Updated 2026-09-12. Start here. This index is the sole source of current pending work;
specifications, ADRs and historical evidence are not additional backlogs.

## Recovery assignments: give Claude one file path

These briefs now contain implemented repairs plus explicit remaining work. Resume
the unchecked residuals; completed evidence is not an instruction to refactor again.
This reconciliation changed documentation only. Copying a brief does not authorize
production changes, real payments/email, migrations against an unidentified DB or deployment.

| Order | Standalone assignment | Owns |
| --- | --- | --- |
| 1A | [User identity](recovery-user-identity.md) — **PARTIAL: residual repairs and verification** | Signup/proof, sessions, logout, switch truthfulness |
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

## Session plan and blocker answers

This section owns execution decisions for all indexed lanes. Read it before asking
the user a question already answered here. It does not mark any acceptance test
passed or grant production/provider authority. Existing task IDs remain in their
lanes; this is a routing policy, not another checklist.

### Six reusable sessions, two implementation workers at a time

| Session | Assignment, in order | Start condition and boundaries |
| --- | --- | --- |
| S0 — Coordinator | This index + `overall-release.md` | Keep this session throughout. Own cross-lane decisions, shared-file reservations, build/environment schedule and final integration. Prepare environment preflight early; no application-wide rewrite. |
| S1 — Foundation | `recovery-user-identity.md` → `recovery-org-setup.md` → `recovery-people-invitations.md` | Start now. Own auth/setup/people verticals sequentially; finish safe independent work while a particular provider/DB check waits. Coordinate shared authority and quota contracts with S2 through S0. |
| S2 — Money and access | `recovery-access-billing.md` + `rbac.md` | Start now: AB-03/07 correctness first, then catalog/access and remaining acceptance. Same owner for billing/RBAC; do not start competing role or payment rewrites. |
| S3 — Communications | `recovery-inbox.md` → `recovery-calendar.md` → `recovery-chat.md` | Next available worker slot after foundation contracts stabilize. Own communication correctness and domain hooks/screens. S2 retains shared permission/quota ownership; S0 coordinates schema. |
| S4 — Frontend performance and Build | `recovery-frontend-data.md` → `build.md`; ARCH-002/003 in `release-completion.md` | Next available slot alongside S3, after shared identity/data contracts stabilize. Reserve actual FD7 screen files; avoid S3-owned hooks/screens. Own measurement, build/harness and existing Build acceptance, not unapproved product deletion. |
| S5 — Documents and release operations | DOC-002/004 in `release-completion.md` → `production-and-approvals.md` | After local repairs are integrated and an identified test environment is available. Own Documents acceptance and cross-lane drill execution; domain owners fix resulting defects. S0 retains REL-001/002 and final build ownership. |

Recommended waves: S0 + S1/S2 → S0 + S3/S4 → S0 + S5 and a returning domain
worker for defects. These are reusable roles, not six concurrent writers or a
promise of six turns. If S2 still has safe work, keep it running and delay a later
session rather than exceeding the worker limit. S0 may assign bounded environment
preparation to S5 earlier by freeing a slot. Stop concurrent builds/captures in the
same checkout; one session owns `.next`, generated contracts and each migration journal.

For each new session paste this, replacing `S1` with its assigned ID:

```text
Read D:/projects/personal/Streamlineos/architecture-refactor/prd/README.md.
You are session S1 from the session plan. Read your assigned PRDs and applicable
CLAUDE.md files. Execute their remaining work, preserving completed repairs.
Use the blocker answers in the index; resolve technical questions from source and
tests. Coordinate shared edits through S0. Keep only the affected acceptance item
waiting and continue safe independent work. Record exact evidence and the next
action in the owning PRD. No production actions or live provider transactions
without an explicitly authorized target. Do not claim completion with open gates.
```

### Standing answers to recurring blockers

These are conservative implementation directions within the existing product;
they preserve contracts rather than silently deciding a new commercial policy.

| Blocker/question | Answer and next action | Owner |
| --- | --- | --- |
| Failing tests, casts, duplicate code, API/schema mismatch | This is executable work, not a question for the user. Reproduce against the actual caller, repair the smallest responsible boundary, verify; remove only proven dead code. | Assigned domain session |
| Who owns shared files or a cross-lane decision? | S0 assigns one editor and records the reservation here before edits. Other sessions send a bounded proposal and continue nonoverlapping work. | S0 |
| Setup waits for invitations/templates/welcome work | Readiness means the authorized member can actually use the intended organization. Keep required membership/access/entitlement invariants; optional enrichment must not delay entry. Preserve durable retry and truthful partial status. Projection failure is not success; hidden/wrong-cell membership is not an orphan. | S1 with S2 |
| What setup latency should we target? | Use p95 ≤10 seconds to first usable organization as the working engineering target, not a customer SLA or claimed measurement. Measure no-invite and representative-batch cases separately; record hardware/load/sample size. S0 may refine methodology, not quietly waive a failed target. | S1/S4 |
| May archived worker numbers be reused? | Preserve the existing unconditional reservation for this stabilization release. Reject reuse with clear copy; use the existing record's supported restoration flow. Do not contract uniqueness merely to satisfy an active-only index name. Archive/recreate/restore tests and schema reconciliation remain required. Reuse is a later explicit product change. | S1, P9 |
| Which salary currency? | Trace the existing persisted employment/org currency and supported payroll contract. Never silently substitute INR. Use the existing supported currency; reject an unsupported monetary write explicitly. Adding multi-currency payroll is outside stabilization. An unresolved domain precedence goes to S0 with the actual consumer trace. | S1, P13 |
| Do entity chat channels bypass quota? | Reuse the authoritative existing channel resource/counting contract and atomic admission path; apply it consistently to explicit entity-channel creation. Do not invent a free exemption or charge existing-channel reads. If the product genuinely distinguishes channel classes, S2 supplies that existing rule. | S3 with S2, CH6 |
| Cache everything / where should reads live? | Preserve the existing scoped Query/service owners. Lightweight shared identity/access/badges belong in the shell; filtered lists/ranges and drafts do not. Add caching only after measuring and writing invalidation/failure rules. Build-only cross-tab sync is not app-wide sync. | S4 and domain owners |
| What revocation window is acceptable? | The recorded 30-second recovery window is a behavior to verify, not permission to weaken authorization or an accepted release risk. Preserve existing stricter guarantees; test direct HTTP/writes/streams and cache-hit/miss separately. Any remaining exposure requires an explicit security release decision. | S2; S0 records unresolved risk |
| Can calendar caps be raised to close the task? | No: preserve bounded work and correct cancelled/moved occurrences. Implement complete bounded continuation or explicit incompleteness/recovery semantics; verify legal dense windows. Keep schema drift owned even when generation is blocked. | S3 |
| Delete old inbox endpoints? | Keep authenticated legacy endpoints for this release unless consumer/compatibility evidence proves safe removal. Remove proven-dead internal keys only. Endpoint retirement is not a prerequisite for inbox correctness. | S3 |
| Missing browser / stale build evidence | Use the existing Windows Chrome launcher and capture harness. First inspect safe launch configuration and identify the test API; reserve a build. Old missing-browser reports do not establish a current blocker. Refresh artifact provenance before interpreting budgets. | S4; S0 schedules |
| Missing DB / representative fixtures | First inspect the existing disposable-stack setup without loading production defaults. Verify target identity, nonproduction credentials, tenant role, migration state and synthetic fixtures. Never infer current availability from old localstack evidence. If unavailable, report the exact resource missing; continue isolated source/mocked work. | S0 prepares; domain/S5 executes authorized checks |
| Customer tax exemption / late captured payment policy | Trace existing policy and consumers first. A customer flag is not automatically verified exemption. Do not invent tax rules, auto-refunds, discounts or expiry policy. Preserve the payment and reconciliation history; isolate unresolved cases for operator review using existing machinery. Ask Finance/product only for the missing rule; other billing repairs continue. | S2; accountable human for a genuinely missing policy |
| Remove Build screens / redesign entire product? | Finish existing correctness/accessibility/performance acceptance first; retain live screens. Broader deletion/repositioning waits for the user's buyer/workflow choice and is not a blocker for repairs. | S4; user for new product scope |
| Real provider drills, deployment, Finance/security/privacy signoff | Agents prepare and validate safe test procedures; actual calls require identified authorized test targets. A human approval cannot be fabricated by an agent. Keep only these gates waiting, not the entire lane. | S5, domain owner, accountable approver |

### Blocker handling at every handoff

Classify each remaining item as ACTIONABLE, WAITING-DEPENDENCY, EXTERNAL-INPUT or
VERIFICATION-PENDING. A missing test is work, not automatically an external blocker.
Historical `BLOCKED` text below is evidence; current status belongs in the owning
lane next to its task. A request for a source trace must never become a user question.

For a genuine blocker record once, in that lane: task ID; exact observed failure;
what was safely tried; the smallest missing input; who supplies it; next executable
step after it arrives; independent work being continued. Send S0 that bounded record.
S0 resolves technical/dependency questions, batches only genuine human questions in
ordinary chat, and records answers here so later sessions reuse them. Do not repeat
an answered question or require a special follow-up-question UI. Recheck a blocker
when its dependency/input changes, not by repeatedly rerunning an unchanged failure.

Only the affected acceptance item waits. If all remaining authorized work truly
depends on external input, hand off honestly; do not poll indefinitely, assume
credentials/approval, silently waive the requirement, or report the product complete.

### How to run with two implementation agents

1. Agent A takes a bounded identity/setup residual; Agent B takes AB-03/AB-07
   billing correctness. Preserve already-landed session, readiness and checkout repairs.
2. Agree shared authority/readiness/transaction contracts before people and module-RBAC
   changes. Catalog-sync currently has four failing tests; access owner resolves them.
3. Coordinator reserves shared files and assigns frontend-data or one communication
   lane independently. Keep at most one owner per file and one production-build writer.
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

## Current completion reconciliation — 2026-09-12

Source baseline: root `85dc726e9` / backend `d3bf57982`, plus existing working
changes. Three independent reviewers audited domain lanes; the coordinator checked
calendar/frontend/release evidence. A second rotated review checked the pruned briefs and preserved task mappings;
its corrections are incorporated. Fourteen top-level PRDs and 56 relative links/anchors
passed the final structural check. Earlier rounds preceded substantial implementation.
This is documentation reconciliation, not a clean-revision release certification.

| Lane | Verified implementation / evidence | Remaining work to assign |
| --- | --- | --- |
| Identity | Session-key isolation, transactional verification claim, bounded auth transport | Boundary validation, meaningful race test, logout wiring/bridge/provider and final scope proof |
| Org setup | Readiness/status, wake and UI recovery changes | Placement-safe cleanup, truthful projection, readiness invariant, optional-work transaction recovery and measured journey |
| People | Pagination/dedup and decline seat-ledger repair; recorded migration 1091 replay | Member/employee distinctions, missing-employment bank save, sensitive drafts/currency, lifecycle/concurrency and browser proof |
| Access/billing + RBAC | Platform merchant, durable purchase, callback validation, profile upsert, access pagination | Webhook binding/credit replay, activation dates/delayed failure, catalog failures, revocation/performance/tax and approvals |
| Inbox | Kind dispatch, tie-ordering, partial availability and stream work | Full-scroll continuation loss and unified snooze/count mismatch; remaining real flow acceptance |
| Calendar | Visibility/export/keys/timezone/sync repairs; recorded migration 1092 measured apply/rollback | Exception/occurrence truncation, schema drift, browser/provider acceptance |
| Chat | GET read / POST create entity seam exists | Quota, discovery paging, catch-up/offline edits, ACL/cache/UX, DB and integrated release proof |
| Frontend data | Key/hydration/gated reads, strict-build bypass removal, test gate | Actual request/SQL measurements, cross-tab/revocation matrix, cache-failure/UI and current-build budgets |
| Build | Recorded cross-tab and responsive browser passes | Loading/error/a11y, harness reachability, performance-matched acceptance and later product scope |

Fresh isolated backend checks (mocked, no DB/provider calls):

| Selection | Result | Limit |
| --- | --- | --- |
| Identity + setup | 2 suites / 41 passed, exit 0 | One weak race assertion identified; green does not certify concurrency |
| People + inbox | 4 suites / 59 passed, exit 0 | Pagination page-two and unified snooze counterexamples remain uncovered |
| Billing/access/catalog | 3 suites passed / 1 failed; 33 passed / 4 failed, exit 1 | Four catalog administering-module assertions fail |
| Purchase binding + lifecycle | 2 suites / 39 passed, exit 0 | Webhook binding/replay and actual activation-date gaps remain |

Fresh frontend checks: query-scope exit 0; request-params, file-sizes, over-300 and
route-bundle provenance exit 1. Commands/findings live in frontend-data and the
combined release PRD. Historical live DB/provider/browser records are retained,
not described as absent and not claimed as rerun here. No lane is wholly complete.

Prior review history: two rotated source-review rounds, followed by six bounded
pruning assignments using three reviewers because of the thread cap. They established
the shared completion contract and corrected ownership, transaction, quota, cursor,
cache and evidence boundaries. Current residuals supersede their pre-implementation
statuses; do not resurrect their closed repair instructions.

## Earlier release evidence and remaining tasks

Retain these for unique pending release work. New recovery briefs own new source
repairs and supersede blanket completion claims, not historical measurements.

| Lane | Remaining ownership |
| --- | --- |
| [Combined release checks](release-completion.md) | ARCH-002/003 budgets/mobile measurement and DOC-002/004 documents/KB/e-sign acceptance |
| [Billing proof](recovery-access-billing.md#bill-001--prove-deployed-payment-failure-and-recovery-paths) | Deployed provider failure/recovery and approval after repairs |
| [Chat proof](recovery-chat.md#chat-002--make-the-read-path-index-assertion-fixture-safe) | Database probe and final evidence reconciliation after repairs |
| [Build](build.md) | Browser/performance acceptance and later product/UX decisions |
| [RBAC](rbac.md) | Existing isolation/support automation tasks and deployed revocation proof |
| [Production and approvals](production-and-approvals.md) | Deployment, recovery, monitoring and accountable signoff |
| [Overall release](overall-release.md) | Final integration, revision and evidence reconciliation |

The [criterion registry](../PRD-10-10-CODE-RELEASE-TODO.md) preserves stable
PRD-C001–PRD-C195 identifiers without task status. Do not recreate completed work
from historical unchecked boxes. Completed items leave the action list after
evidence is recorded; retain unique audit/security/migration history.

## Consolidation and deletion record

This pass removed four superseded PRDs, **not four completed product lanes**:

| Removed file | Canonical destination | Preserved work/evidence |
| --- | --- | --- |
| `architecture.md` | [Combined release checks](release-completion.md) | ARCH IDs, remaining mobile/growth gates and unique historical proof |
| `documents.md` | [Combined release checks](release-completion.md) | DOC IDs, browser/DB/provider/privacy criteria and certification links |
| `billing-payments.md` | [Access/billing](recovery-access-billing.md) | BILL-001/002, operator/Finance ownership and prior repair proof |
| `chat.md` | [Chat recovery](recovery-chat.md) | CHAT-002/003 and completed CHAT-001/004 evidence |

Content was preserved before deletion. Existing tracked versions are recoverable
from Git; current unique requirements/evidence are in the destinations above.
No application files, schema/migrations, runtime logs or unrelated MDs were removed.


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
