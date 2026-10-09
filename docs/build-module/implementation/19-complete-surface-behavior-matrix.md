# 19 — Complete Build surface behavior matrix

Status: mandatory cross-cutting acceptance contract

## 1. Universal record behavior

Every Build record family must explicitly adopt, reject with a reason, or defer each behavior below. Silence is not a decision.

| Behavior | Required contract |
|---|---|
| Create/import/template | validated command, permission/reach, idempotency, quota, default/template version, audit, and result reference |
| List/search/filter/export | authorized bounded projection, FilterEnvelope v1, stable cursor/sort, matching counts/facets, export scope parity |
| Detail/navigation | canonical URL, split-pane/full-page rules, Back/Forward, modifier click, refresh, return location, mobile page |
| Edit/concurrency | field policy, expected revision/CAS, conflict diff, retry choice, audit |
| Status transition | explicit state machine, allowed-action projection, reason/required fields, timestamp/actor, event |
| Assignment | grantable actor query, assignment permission, reachability, workload effect, revoked/removed actor behavior |
| Comments/reactions/mentions | author/moderator rules, revision/edit history, soft delete/restore, mention identity, dedupe, current-access delivery |
| Relationships | typed link, endpoint scope validation, direction, uniqueness, cycle rule, history, unlink permission |
| Files | File identity, upload/scan state, typed relation, signed access, retention and visibility |
| Subscriptions | watcher/preferences, no access grant, delivery recheck, unsubscribe and revocation |
| Delete/archive/restore | explicit lifecycle command, dependency effect, retention, conflict handling, audit, compatibility links |
| Activity/audit | chronological typed events, stable pagination, human/system distinction, immutable privileged audit |
| Notifications/realtime | after-commit delivery, dedupe, permission recheck, unread semantics, reconnect/reconcile |
| Cache/projections | owner, key dimensions, freshness, invalidation, fallback, rebuild, no authoritative permission cache |
| Automation/AI | visible allowed action, same command/query interfaces, confirmation class, idempotency, cost/evidence, no scope widening |
| Client projection | explicit grant capability, safe fields/actions, expiry/revocation, client actor attribution, no internal leakage |
| Mobile/accessibility | complete action parity, 375/768/desktop, keyboard/focus, screen-reader labels, touch targets, reduced motion |

The owning screen specification records which rows apply and links its interface, schema, permission, cache, event, test, and evidence package.

## 2. Ticket workflow contract

Ticket behavior is one workflow, not unrelated CRUD endpoints.

| Ticket capability | Canonical target | Required implementation and acceptance |
|---|---|---|
| Creation | Ticket Command | UI, template, intake, QA, meeting, import, automation, AI, and portal adapters apply identical defaults, permission, idempotency, audit, cache, and event behavior. |
| Status and rank | Ticket Command | validate project workflow, transition, WIP, rank neighborhood, revision; optimistic UI rolls back on 403/409/network. |
| Assignment | Ticket Command plus Module Access candidate query | support canonical multi-assignee identity; enforce `build:tickets:assign`; removed/revoked actor cannot be newly assigned. |
| Comments | collaboration interface with Ticket reach | add/get/edit/delete/restore, author/moderator policy, revision, edit history/retention, audit, paginated order. |
| Mentions and reactions | collaboration delivery | resolve membership identity, prevent notification duplication, recheck reachability, add/remove reaction idempotently. |
| Ticket relations | typed relation command | validate both Tickets, tenant/project policy, direction, uniqueness, self-edge and cycle; current strict types include blocks, blocked_by, duplicate_of, relates_to. |
| Planning associations | planning graph | parent/child, goal, cycle, epic, Workstream, milestone, release, request/evidence use typed owner interfaces; distinguish association from Ticket relation. |
| Watchers/subscriptions | collaboration delivery | list/add/remove; subscription never grants access; implicit watcher policy and preferences are explicit. |
| Labels/custom fields | Ticket Command plus field engine | definition/type/required/sensitivity policy; bulk/import/automation use same validation; value revision is audited. |
| Attachments/URLs | Files relation plus typed related link | File owns uploaded bytes; related URLs are normalized/allowlisted metadata; remove trusted caller-supplied attachment URLs. |
| Checklists/subtasks | Ticket-owned checklist and Ticket Command promotion | checklist/item CRUD is revisioned; promoted item creates a Ticket idempotently; parent progress semantics are defined. |
| Activity/changelog | authorized chronological projection | merge human comments and immutable typed system events with stable pagination and no duplicate effects. |
| Archive/delete/restore | Ticket lifecycle command | preserve relations/comments/files/history; resolve key/status/parent conflicts; register restore in wire contracts. |
| Client visibility | Ticket Command and portal preview | visibility change is versioned, audited, invalidates portal projection, and shows exact client-safe preview. |
| Time/billing/capacity | Timesheets and Accounting projections | Timesheets owns actuals/approval/billability; Accounting owns invoice/payment; workload uses versioned actuals without `tickets.time_spent` authority. |

## 3. Intake, Forms, Triage, and Feedbucket flow

1. A published Form or Feedbucket widget captures immutable response/evidence, consent, files, source, browser/context metadata, and technical details allowed by policy.
2. Intake presents one authorized projection over incoming records without changing their source identity.
3. Triage assigns owner, priority, request type, duplicate, SLA, and processing state.
4. `Accept` invokes Ticket Command or Project Provision with a durable idempotency key.
5. `Decline` records reason, actor, time, client-safe response policy, and audit.
6. `Duplicate` validates the target endpoint and project, stores the typed link, and preserves the original submission.
7. Conversion records source type/ID, destination type/ID, command result, and replay result.
8. Old Feedbucket/submission links use the identity map and land on the same Intake detail.
9. Files remain File identities; capture sources cannot bypass scanning or signed access.
10. Notifications and automations begin after commit through the effect runtime.

## 4. Onboarding and activation flow

1. Signup authenticates without revealing account existence.
2. Destination priority is valid invitation, unfinished setup, required module onboarding, authorized callback, then personal landing.
3. Workspace collects the smallest organization/work-style/country input set.
4. Products supports single or multiple modules, server preview, dependencies, quotas, template version, optional adaptive questions, and custom-field drafts.
5. People is optional and separates internal invitation/module/project assignment from client portal grants.
6. Activation stores the immutable requested plan, starts an idempotent run, and calls owner modules step by step.
7. Failure records a safe retryable step; resume never creates a second organization, project, field, role, invitation, or client grant.
8. Launch resolves the authorized landing and exposes an adjustment checklist for nonblocking setup.

Required journeys are new owner, existing user creating another organization, invited new user, invited existing user, returning unfinished user, and external client.

## 5. Client portal flow

1. Admin selects client, project, grant capabilities, expiry, and invitation channel.
2. Server validates grantability, project reach, client identity, plan/quota, and current grant revision.
3. Activation and invitation delivery are atomic in intent and idempotent in execution.
4. Secure magic link resolves the client actor and active grant without creating internal membership.
5. Portal Projection returns only allowed project, ticket, milestone, file, approval, form, wiki, update, comment, change-request, and feedback fields/actions.
6. Client mutations call the same domain command through portal actor context and a smaller action policy.
7. File access checks grant plus record/File relation and returns a short-lived signed URL.
8. Expiry/revocation denies new requests and bounds live/cache access immediately according to the access contract.
9. Portal activity attributes the external actor without exposing internal membership, private comments, budgets, time rates, hidden fields, or unrelated customers.

## 6. Per-record-family adoption register

(BT-6e2089ec46d5, added 2026-10-04)

For each record family, every universal behavior in section 1 must be ADOPTED (with owning spec/API link), REJECTED (with justification), or DEFERRED (with WORK-CLAIMS reference). A blank cell is an unresolved gap.

Abbreviations: A = ADOPTED, R = REJECTED (reason given), D = DEFERRED (reason given). Ticket is covered fully in section 2.

| Family | Create/import | List/search | Detail/nav | Edit/concurrency | Status | Assignment | Comments | Relations | Files | Subscriptions | Delete/archive | Activity | Notifications | Cache | Automation/AI | Client projection | Mobile/a11y |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Project** | A — ProjectProvisionCommand | A — authorized list, RBAC-filtered | A — full page; pane for quick overview | A — name/settings CAS | A — active/archived/deleted state machine | A — project member assignment | A — updates feed | A — portfolio, program, goal, release links | A — Files module, project-scoped | A — project watchers | A — archive/restore/delete lifecycle | A — append audit log | A — create/archive/assign events | A — project keys, invalidated on mutations | D — automation rules (DEFERRED: ARCH-05) | A — portal project view, client-safe fields | D — DEFERRED: browser matrix BT-545bf1185755 |
| **Cycle** | A — CycleCommand | A — project-scoped list | A — full page | A — date/title CAS | A — open/closed/archived | A — inherits project assignment | R — no comment thread on Cycle (ticket threads used) | A — ticket membership | R — no file attachment on Cycle | R — no Cycle watcher (ticket subscriptions used) | A — archive/close | A — state-change audit | A — cycle close/open event | A — cycle keys invalidated | D — DEFERRED: automation on cycles | R — no client projection for Cycle | D — DEFERRED: browser verification |
| **Release** | A — ReleaseCommand | A — project-scoped list | A — pane; full page on promote | A — title/notes CAS | A — draft/published state machine | R — no individual assignee on Release (linked ticket assignees used) | A — release notes body | A — ticket membership | A — artifact/file attachment | R — no Release watcher | A — archive/unpublish | A — publish event append | A — publish emits durable event | A — release key invalidated on publish | D — DEFERRED: AI release notes | R — no client Release projection | D — DEFERRED: browser verification |
| **Approval** | A — ApprovalCommand with artifact capture | A — organization approval queue | A — pane with artifact | A — CAS on approval revision | A — pending/approved/rejected/withdrawn | A — approver routing at creation | R — no general comment thread (structured decision fields used) | A — links to source artifact and ticket | A — immutable artifact snapshot | R — no watcher (requester/approver are explicit) | R — no delete (immutable record); withdraw state used | A — decision audit with actor/timestamp | A — approval events via outbox | A — approval keys invalidated | R — no automation on Approval itself | R — client cannot see internal Approvals | D — DEFERRED: browser matrix |
| **Intake/Form submission** | A — IntakeCommand, conversion idempotency | A — project intake list, type-filtered | A — request pane | R — immutable after capture; triage fields only | A — new/triaged/accepted/declined | A — triage owner assignment | R — no public comment; internal notes via triage | A — link to created ticket on accept | A — capture retains file identities | R — no watcher on intake submission | A — decline records reason; purge on org delete | A — append triage log | A — conversion/decline events | A — intake key invalidated | D — DEFERRED: AI triage suggestion | A — client-safe submission read | D — DEFERRED: mobile verification |
| **Build Member / Team** | A — member assignment to Build | A — org Build member list | A — member profile pane | A — role/standing change CAS | A — active/removed | A — project/team assignment | R — no direct comment on membership | A — team membership links | R — no file on team | R — no subscription on member | A — remove member/revoke access | A — assignment/removal audit | A — member added/removed event | A — membership key invalidated on standing change | R — no AI on team management | R — no client projection for team | D — DEFERRED: browser matrix |
| **Module / Workstream** | A — module assignment to project | A — project-scoped list | A — pane detail | A — name/settings CAS | A — active/inactive | A — ticket membership | R — no thread on Workstream | A — ticket membership association | R — no file on Workstream | R — no subscription | A — archive/remove | A — rename/archive audit | R — no module-level notification | A — module key invalidated | D — DEFERRED: automation on workstreams | R — no client Workstream projection | D — DEFERRED: BT-e29595c47907 label rename pending |
| **Change Request** | A — ChangeRequestCommand | A — project-scoped list | A — pane | A — DRAFT→SUBMITTED CAS | A — DRAFT/SUBMITTED/APPROVED/REJECTED | A — assigned approver | R — decision notes only; no open thread | A — affected ticket links | R — no file on change request | R — no watcher | R — immutable after decision; new CR required | A — decision audit | A — decision event | A — CR key invalidated | D — DEFERRED | R — no client CR projection | D — DEFERRED |
| **Risk / Decision** | A — governance create | A — project register list | A — pane detail | A — CAS on owner/status | A — open/closed/mitigated | A — risk owner assignment | R — no open thread on risk | A — mitigation ticket link | R — no file on risk | R — no subscription | A — archive | A — status change audit | R — no risk notification | A — governance key invalidated | D — DEFERRED | R — no client risk projection | D — DEFERRED |
| **QA suite/run** | A — QACommand | A — project QA list | A — run full execution page | A — test case CAS | A — pending/in-progress/passed/failed | A — test runner assignment | R — no QA comment thread | A — defect ticket link | A — run evidence attachment | R — no subscription | A — archive completed run | A — append result log | A — run completion event | A — QA key invalidated | D — DEFERRED: AI test suggestion | R — no client QA projection | D — DEFERRED |
| **Portal grant** | A — grant creation command | A — admin grant list per project | A — grant detail pane | A — capability/expiry edit CAS | A — active/expired/revoked | R — no assignee (grant is for an identity) | R — no thread | R — no direct relation | R — no file on grant | R — no subscription | A — revocation records actor/time | A — activation/revocation audit | A — grant events via outbox | A — portal projection cache, immediate revoke bust | R — no AI on grants | A — IS the client projection | D — DEFERRED: browser matrix |
| **Comment draft** | A — draft create/replace | R — private to actor; no list projection | R — no direct navigation | A — replace semantics (actor-private) | R — no status | R — no assignment | R — IS a draft; no comments on draft | R — no relation | R — no file | R — no subscription | A — delete on submit; retention policy | R — no audit of draft content | R — no notification | R — no caching (private) | A — AI draft generation | R — no client projection | D — DEFERRED |
| **Product / roadmap** | A — ProductCommand | A — org-level product list | A — full page | A — CAS on metadata | A — active/archived | A — PM assignment | A — feedback thread | A — project/goal/evidence links | R — no file on product | A — product watcher | A — archive | A — score/link audit | A — roadmap update event | A — product keys invalidated | A — AI opportunity scoring | R — no client product projection | D — DEFERRED |
| **Portfolio / Program** | A — PortfolioCommand | A — org-level list | A — full page | A — CAS | A — active/archived | A — owner assignment | R — no thread | A — project membership | R — no file | R — no subscription | A — archive | A — membership audit | R — no notification | A — portfolio key invalidated | D — DEFERRED | R — no client projection | D — DEFERRED |
| **Meeting / action item** | A — MeetingCommand | A — project meeting list | A — full page | A — agenda CAS | A — scheduled/completed/cancelled | A — attendee/facilitator | A — meeting notes thread | A — action item → ticket promotion | A — attached documents | R — no subscription | A — cancel/archive | A — completed audit | R — no meeting notification | A — meeting key invalidated | D — DEFERRED | R — no client meeting projection | D — DEFERRED |
| **Automation rule / run** | A — AutomationCommand | A — project automation list | A — rule detail | A — rule CAS | A — active/paused/archived | A — rule owner | R — no comment thread | R — no relation | R — no file | R — no subscription | A — archive rule | A — run attempt append log | R — no user notification for runs | A — rule key invalidated | R — Automation IS the AI surface; no AI on automation | R — no client automation projection | D — DEFERRED |
| **Webhook** | A — WebhookCommand | A — project webhook list | A — attempt history pane | A — endpoint/secret rotate CAS | A — active/paused | R — no assignee | R — no thread | R — no relation | R — no file | R — no subscription | A — delete/deactivate | A — delivery attempt append log | R — no notification | A — webhook key invalidated | R — no AI | R — no client webhook projection | D — DEFERRED |

Ticket is fully covered in section 2; Intake conversion rules are in section 3; onboarding is in section 4; portal is in section 5.

All DEFERRED entries without a WORK-CLAIMS reference require browser-matrix verification; record the evidence claim in the requirement ledger once verified.

## 7. Completeness rule for all 26 areas

An area is implementation complete only when its screen spec names audience, entry, layout, fields, filters/operators, actions, pane/page/dialog behavior, return navigation, loading/empty/error/offline/stale/denied states, permissions, query/command interface, schema, cache invalidation, events/jobs, mobile/accessibility, and acceptance evidence. The product-surface ownership register in document 18 assigns the architecture package; `experience/screens/` owns the visual and interaction detail.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Verify intake conversion and portal actions preserve identity, idempotency, permissions, visibility, and record return navigation.
- [ ] Close each of the 26 product areas only after screen, schema, query/command, permission, cache/event, mobile, negative, and browser evidence exists.
