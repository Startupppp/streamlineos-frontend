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

## 6. Completeness rule for all 26 areas

An area is implementation complete only when its screen spec names audience, entry, layout, fields, filters/operators, actions, pane/page/dialog behavior, return navigation, loading/empty/error/offline/stale/denied states, permissions, query/command interface, schema, cache invalidation, events/jobs, mobile/accessibility, and acceptance evidence. The product-surface ownership register in document 18 assigns the architecture package; `experience/screens/` owns the visual and interaction detail.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Record the universal behavior contract for record families plus detailed Ticket, Intake/Forms/Triage/Feedbucket, onboarding, and client-portal flows; see the [dated cross-check](../audit/comprehensive-recheck-2026-10-02.md) at source revision `a5b8347fb`.
- [ ] For each record family, record explicit adoption, justified rejection, or deferral of all universal behaviors in its owning screen and API contract.
- [ ] Verify Ticket comments, status, assignments, links, files, history, conflicts, and effects through the same command path across UI, bulk, import, automation, and AI.
- [ ] Verify intake conversion and portal actions preserve identity, idempotency, permissions, visibility, and record return navigation.
- [ ] Close each of the 26 product areas only after screen, schema, query/command, permission, cache/event, mobile, negative, and browser evidence exists.
