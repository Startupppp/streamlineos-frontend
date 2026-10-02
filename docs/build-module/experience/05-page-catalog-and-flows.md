# Page catalog and flows

Status: planned target mapped to the current route inventory

## How to read this catalog

Every page follows a common contract:

- **Header**: breadcrumb, page title, scope, freshness, contextual help, primary action.
- **Toolbar**: view/search/filter/group/sort/display where the data supports them.
- **Content**: responsive collection, canvas, editor, dashboard, or detail layout.
- **Context**: split pane for record inspection when the source page should remain visible.
- **States**: loading, true empty, filtered empty, denied, unavailable, failed, stale, and partial.
- **Persistence**: URL contains shareable scope/view/filter references; private draft state stays local/server draft.
- **Authorization**: loader and every mutation enforce tenant, enabled module, membership, permission, and record scope.

The page descriptions below add page-specific requirements to that contract.

## Organization-level pages

### Build landing and Command Center — `/build`, `/build/command-center`

**Users**: everyone with Build access.
**Purpose**: personal attention and decision workspace.
**Content**: personal/shared dashboards, attention strip, scoped widgets, quick actions, AI brief.
**Filters**: dashboard, time window, project/team/product/client scope; widget filters remain local.
**Click flow**: actionable record opens split pane; chart segment opens the source collection with filter; deep workflow opens full page.
**Primary actions**: customize, create, share authorized dashboard, ask AI.
**Detail**: see the Command Center specification.

### My Work — `/build/my-work`

**Users**: internal users.
**Purpose**: one personal execution queue across projects.
**Sections**: Focus now, Today, Upcoming, Overdue, Blocked, Waiting, Recently completed.
**Filters**: assignment role, project, client, status, priority, dates, type, blocked, billable, cycle/release, custom field.
**Actions**: start, complete, snooze, reschedule, log time, update, create.
**Click flow**: ticket opens split pane; project/client opens full page.
**Rules**: user-configured focus order is private; server priority and due date remain unchanged unless explicitly edited.

### Inbox — `/build/inbox`

**Users**: internal users.
**Purpose**: decisions and notifications requiring attention.
**Tabs**: Needs action, Mentions, Assigned, Client, Approvals, Automation failures, All.
**Filters**: unread, source, project, sender/actor, type, urgency, date.
**Actions**: mark read/unread, resolve, snooze, bulk clear, notification preference.
**Click flow**: opens target in split pane when possible; approval opens decision sheet; external message shows sanitized source context.
**Rules**: state syncs across Home unified inbox without duplicating notification ownership.

### All Work — `/build/all-work`

**Users**: users with multi-project visibility.
**Purpose**: authorized cross-project work query.
**Views**: list/table/board/calendar/timeline.
**Filters**: full shared grammar plus organization-level project/team/product/client.
**Actions**: save view, bounded bulk edit, export authorized result, create.
**Click flow**: work item opens split pane; project drill-down keeps active filters as a handoff parameter.
**Rules**: no unbounded default query; begin with recent/active scope and cursor pagination.

### Goals — `/build/goals`, `/build/goals/[goalId]`

**Users**: leaders, product/project managers, contributors with goal access.
**List content**: name, owner, period, status, confidence, progress, linked initiatives, latest update.
**Filters**: owner/team/product, period, status, confidence, progress band, stale update, parent goal.
**Detail**: outcome statement, baseline/target/current, progress method, initiatives/projects/releases, updates, risks, decisions, history.
**Actions**: create, update confidence/progress, link work, check in, close.
**Click flow**: goal opens full page; linked ticket opens split pane.
**Rules**: calculated progress shows sources and allows an authorized manual override with reason.

### Roadmap — `/build/roadmap`

**Users**: product and delivery leadership.
**Views**: Now/Next/Later, timeline, outcome, product, team.
**Filters**: product, owner/team, goal, status, horizon, confidence, client/segment, release, tag.
**Cards**: initiative, problem/outcome, owner, horizon/date, confidence, progress, linked evidence/release.
**Actions**: create initiative, prioritize, move horizon, link evidence/work, publish selected view.
**Click flow**: initiative opens pane; complex planning opens full detail.
**Rules**: public/client roadmap is a separate projection with explicit visibility, never the internal view.

### Portfolios — `/build/portfolios`, portfolio detail

**Users**: project/program managers and executives.
**List**: portfolio name, owner, health, projects/programs, budget exposure, next milestone, top risk.
**Filters**: owner, health, status, client, product, date, budget state, risk level.
**Detail tabs**: Overview, Projects, Programs, Goals, Timeline, Budget, Risks, Updates.
**Actions**: create, link/unlink authorized projects, change owner, publish update.
**Click flow**: project/program opens full page; risk/update opens pane.
**Rules**: rollups show numerator/denominator and partial-access marker; linkage must persist and be reversible.

### Programs — `/build/programs`, program detail

**Users**: program managers and executives.
**Content**: outcome, owner, health, linked projects/milestones, cross-project dependencies, budget projection, risks, decisions, updates.
**Filters**: owner, health, portfolio, project, client/product, date, dependency risk.
**Actions**: create, link project/milestone, add dependency/risk/update.
**Click flow**: linked records open pane/full page according to depth.
**Rules**: program membership is explicit; project visibility is not inferred from program visibility.

### Approvals — `/build/approvals`

**Users**: approvers, requesters, managers.
**Tabs**: My decisions, Requested by me, Client, Completed.
**Filters**: decision state, due/SLA, project/client, requester, approver, object type, date.
**Rows/cards**: subject, version, requester, required approvers, due, state, change summary.
**Actions**: approve, reject/request changes, delegate if policy allows, remind, withdraw.
**Click flow**: opens approval sheet with artifact preview, diff, comments, policy, and decision controls.
**Rules**: decisions are immutable events; a changed artifact creates a new version/reapproval according to policy.

### Managed Products — `/build/managed-products`

**Users**: product managers and leadership.
**List**: product, owner, lifecycle, goals, active work, feedback trend, release health.
**Filters**: owner, team, lifecycle, health, segment, tag.
**Actions**: create product, open overview, archive.
**Click flow**: product opens product detail.
**Product detail tabs**: Overview, Feedback, Insights, Goals, Roadmap, Projects, Releases. Each tab uses the shared filters and opens evidence/work in pane.

### Teams — `/build/teams`, team detail

**Users**: organization admins and team members.
**List**: team, lead, member count, active projects/cycle, workload signal.
**Filters**: member, lead, project, status.
**Detail**: overview, members, work, cycles, workload, goals, settings.
**Actions**: create/manage team under permission, link projects, set default workflow.
**Rules**: team membership does not automatically grant project data; effective scope is the intersection of grants.

### Templates — `/build/templates`

**Users**: creators; admins manage organization templates.
**Categories**: software, agency/client delivery, freelance, video, content, consulting, legal, custom.
**Cards**: preview, intended outcome, entities created, fields/workflow installed, estimated setup time, author/version.
**Filters**: category, role, industry, entities, built-in/custom, updated.
**Actions**: preview, use template, duplicate, edit, publish internally, archive.
**Apply flow**: choose destination → preview changes/conflicts → map people/status/fields → apply idempotent job → result report/rollback window.
**Rules**: template application never overwrites existing configuration silently.

### Organization Build settings

#### Access — `/build/settings/access`

Members, pending invites, module roles, groups, access requests, and effective-access inspector. Filters: status, org role, Build role, group, project, last active. Actions: invite, resend/revoke, assign/change Build role, inspect, remove. Role changes preview gained/lost capabilities and create audit records.

#### Client access — `/build/settings/client-access`

Client organizations, contacts, active/expired/revoked grants, projects, allowed surfaces, last access. Actions: grant, copy/send magic link, change scope/expiry, revoke, inspect portal. Never display raw tokens after creation.

#### Integrations — `/build/settings/integrations`

Connected providers, status, scope, owner, last sync, failures, rate limit, and data mapping. Actions: connect/reconnect, configure, test, pause, disconnect, view logs. Secrets remain server-side and masked.

## Project-level pages

### Project overview

**Purpose**: project control page.
**Header**: client/product, owner, health, dates, workflow, portal state.
**Sections**: attention, current milestone/cycle, work progress, recent update, risks, approvals, workload, time/budget, activity.
**Filters**: date, team, milestone/cycle, client-visible.
**Actions**: create work, post update, request approval, edit health.
**Click flow**: cards open relevant pane or page.

### Issues / Work

Full view and ticket behavior are defined in the work-surface specification. Project scope is fixed; filters refine it. `Create` defaults project and current workflow start state.

### Backlog

**Content**: ordered unplanned/planned work, upcoming cycles/releases, estimation gaps.
**Filters**: type, priority, assignee, label, epic/module, estimate, readiness, age.
**Actions**: rank, estimate, assign, move into cycle/release, split, archive.
**Click flow**: ticket pane; cycle/release target drawer.
**Rules**: large reorder uses rank tokens; planning preview shows capacity and dependency conflicts.

### Cycles — list and detail

**List**: name, dates, state, team, commitment, completion, scope change, carryover.
**Filters**: state, team, dates, project.
**Detail**: goal, work, burn/flow, capacity, scope changes, blockers, retrospective.
**Actions**: create, plan, start, complete, move unfinished work with preview.
**Rules**: one clearly identified current cycle per configured team/project scope; issue-cycle links appear consistently everywhere.

### Epics

**Content**: epic, owner, status, progress, dates, goal/release, linked tickets.
**Filters**: status, owner, release, goal, dates, progress, stale.
**Actions**: create, link/unlink issues, reorder, update.
**Click flow**: epic pane/full detail; issue opens nested pane.
**Rules**: linked issue count and progress use access-aware denominators.

### Modules

Project modules are delivery groupings within Build and must not be confused with platform product modules. Show name, lead, status, progress, tickets, release links, and dates. Filters: lead/status/release/date. The UI label is `Workstreams`; `/modules` remains a compatible route.

### Milestones

**Content**: milestone, owner, date, state, confidence, deliverables, dependencies, approvals.
**Views**: list and timeline.
**Filters**: owner, state, date, confidence, client-visible, dependency.
**Actions**: create, link work, change date with impact preview, mark achieved, publish update.
**Click flow**: milestone pane; linked records nested.

### Releases

**List**: version/name, owner, target, state, confidence, tickets, QA, blockers, deployment environments.
**Detail**: scope, changes, readiness checklist, tickets, QA, incidents, approvals, notes, deployments, rollback reference.
**Filters**: state, owner, date, environment, product, confidence.
**Actions**: create, link/unlink tickets, freeze scope, request approval, publish notes, mark released.
**Rules**: release↔ticket relationship is visible and editable from both sides; deployment facts come from integration, not manual implication.

### Intake

**Sources**: internal form, client portal, email/import/integration when enabled.
**Columns**: New, Reviewing, Needs information, Accepted, Declined, Duplicate.
**Filters**: source, client/requester, type, product/project, owner, age/SLA, state, tag.
**Actions**: request info, deduplicate/merge, score, accept into ticket, decline with response, assign.
**Click flow**: request opens pane with source content, attachments, identity confidence, related records, conversation, and triage actions.
**Rules**: accepted conversion is idempotent and links request↔ticket; client receives a sanitized status update.

### Triage

**Purpose**: rapid decision queue for untriaged or incomplete work.
**Content**: one focused record plus duplicate suggestions, required fields, routing, scoring, and next/previous.
**Filters**: queue/team/product/type/source/age.
**Actions**: assign, classify, prioritize, estimate, link duplicate, accept/decline, create ticket.
**Rules**: keyboard-first; an empty queue clearly differs from denied access or failed load.

### Forms — list and builder/detail

**List**: form name, state, audience, destination, submissions, conversion, updated.
**Builder**: fields, conditional logic, branding, consent, success message, routing, spam controls, preview.
**Filters**: status, audience, owner, destination.
**Actions**: create, duplicate, publish/unpublish, copy URL, embed, inspect submissions.
**Rules**: public URL is revocable/versioned, rate limited, abuse monitored, and never exposes internal field metadata.

### Approvals

Project-scoped projection of the organization approvals queue. Create flow selects artifact/version, approvers, due date, sequence or parallel rule, client visibility, and reminder policy.

### Decisions

**Content**: decision statement, status, owner, decision date, options, rationale, evidence, affected records.
**Filters**: status, owner, date, tag, linked type.
**Actions**: propose, record, supersede, link, export.
**Rules**: decided records are append-only/superseded, not silently rewritten.

### Risks

**Content**: risk, owner, probability, impact, exposure, response, due, state, linked work.
**Views**: register and matrix.
**Filters**: owner, exposure, state, category, due, project area.
**Actions**: create, mitigate, accept, close, escalate.
**Rules**: exposure calculation and overrides are visible; stale risks surface in attention.

### Change Requests

**Content**: requested change, requester/client, affected baseline, schedule/cost/scope impact, decision, resulting work.
**Filters**: state, client, owner, due, impact, billable.
**Actions**: assess, request info, approve/reject, create linked work, open invoice action.
**Rules**: approved change preserves before/after baseline and commercial approval evidence.

### Updates / Feed

**Content**: structured status updates with period, health, accomplishments, next, blockers, decisions, client visibility.
**Filters**: author, audience, date, health, type.
**Actions**: draft, generate from cited records, review, publish, acknowledge.
**Rules**: AI draft never publishes automatically; audience preview shows exactly what recipients see.

### Chat

Project-scoped discussion, threads, mentions, linked records, attachments, search, and convert-message-to-ticket. Chat is contextual coordination, not the audit source for decisions; important outcomes link to a ticket/decision/update.

### Meetings — list and detail

**List**: title, date, participants, linked project/tickets, notes/action-item state.
**Detail**: agenda, notes/transcript reference, decisions, action items, attachments.
**Actions**: schedule in Home Calendar, capture notes, turn action into ticket, link decision.
**Rules**: calendar and recording ownership remain in their modules/providers; consent policy applies.

### Wiki — list, detail, history

Tree/list navigation, search, page editor, backlinks, linked tickets, comments, version history, restore, permission-aware sharing. Page click opens full editor; link previews open pane. Client publishing creates an explicit sanitized projection/version.

### Whiteboard

Infinite canvas with shapes, notes, connectors, frames, comments, cursors, links to Build records, templates, export, and version snapshots. Complex collaborative sync is separately release-gated; linked record access is resolved per viewer.

### Files

List/grid with name, type, version, uploader, linked records, client visibility, scan state, updated. Filters: type/uploader/date/link/visibility. Actions: upload, new version, preview, download, link, share to portal, archive. Signed access is short-lived and reauthorized.

### Workload

People/team rows by time period with capacity, allocated/estimated work, leave projection, overload/gap, and unassigned work. Filters: team/person/skill/project/date/work type. Reassign/reschedule opens impact preview. Access-aware results must not reveal hidden assignments.

### Time and Budget — project budget route

Summary: contracted/baseline budget, approved changes, time/cost projection, consumed/remaining, forecast, variance, billable/nonbillable. Filters: date/person/work type/milestone/billable. Actions: log time, open Timesheets, request budget change, open Accounting. Monetary truth comes from Accounting; time truth from Timesheets.

### Reports

Catalog plus saved reports. Standard reports: delivery flow, aging, cycle, milestone/release, quality, workload, time/budget, client response, intake/feedback, outcome. Builder uses governed dimensions/measures and shared filters. Every chart drills down. Scheduled delivery reauthorizes both at generation and access.

### QA — list and run detail

Test plans/runs/cases, environment, release, owner, status, pass/fail/block counts, defects. Run detail supports execution, evidence, comments, linked tickets, retest, sign-off. QA status informs release readiness but cannot imply deployment success.

### Incidents — list and detail

Severity, status, owner, service/project, start, customer impact, linked release/tickets. Detail: timeline, roles, updates, mitigations, evidence, postmortem/actions. External status publication requires review and confirmation.

### Client Portal configuration

Admin preview of granted client experience. Sections: branding, enabled surfaces, visible milestones/releases/files/updates, request form, approval rules, invoice projection, domains, grant list. `Preview as client` uses the actual projection policy and is audited; it does not impersonate an unrestricted internal user.

### Project settings

| Page | Required content and flow |
|---|---|
| General | Name/key, client/product refs, owner, dates, timezone, archive; key changes preview link impact |
| Access | members/groups/roles/grants, pending invites, effective access; add/remove/change with impact preview |
| Workflow | statuses, transitions, required fields, WIP/approval rules; draft → validate → publish version → migrate items |
| Fields | field catalog, contexts, options, validation, usage; deletion checks dependencies and uses soft retirement |
| Views | default/shared views, visibility, owner, usage; configure and restore versions |
| Iterations | cycle cadence, naming, capacity defaults, rollover behavior |
| Automations | triggers/conditions/actions, actor, scope, limits, runs, failures; test with dry run before enable |
| Agents | allowed AI capabilities, scopes, confirmation policy, allowance, history, kill switch |
| Integrations | project mappings and sync controls within org-connected providers |
| Webhooks | endpoint, events, signing secret rotation, status, attempts, replay with bounded retention |
| Credentials | references to secure secret store, owners, expiry/rotation; never plaintext after creation |
| Portal | portal branding/surfaces/grants/request and approval policy |
| Retention | record/file/activity retention, legal hold where offered, deletion/export job preview |

## Search behavior

Global search returns authorized results grouped by type with key, title, context, matched fragment, and last update. Quick search prioritizes recent and exact key matches. Advanced search uses the shared filter builder. Search indexes receive visibility fields and are filtered server-side; index lag is shown for newly created content when relevant.

## Cross-page acceptance criteria

- Every current route is mapped to a stated purpose and entry point.
- Every list has bounded pagination, stable sorting, filter/search, clear states, and a primary action.
- Every count and chart drills into supporting authorized records.
- Every create/edit/delete/share/approve flow states validation, confirmation, audit, and recovery behavior.
- No page invents a separate ticket mutation path or duplicates another module's source of truth.
- Client projections are independently authorized and tested.
- All pages have responsive, keyboard, screen reader, deep-link, refresh, and failure-state coverage.



## Detailed contracts and precedence

This document is an overview. [All screen specifications](./screens/README.md) supply exact route sections, fields, actions and data policies. [Route decisions](./routes-and-screen-decisions.md) override generic opening language: Projects now has its own destination; /build resolves personal landing; Feedbucket becomes Intake Bug reports with legacy-ID mapping; Workstreams keeps /modules URL; content aliases are configured views.

[Projects](./screens/projects.md) fills the missing project list/create context. [Client delivery](./screens/client-delivery.md) fills bug feedback and request detail. [Product discovery](./screens/product-discovery.md) expands Feedback/Insights/Goals/Projects/Roadmap into evidence, scoring and measured outcomes. Chat and Knowledge are owning-module projections with Build associations. No duplicate suite source of truth is created.

