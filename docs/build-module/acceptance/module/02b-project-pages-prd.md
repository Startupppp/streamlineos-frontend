# BLD-02B — Project Page Disposition and Anatomy PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

A project has a small, coherent delivery surface. Frequently used planning and
execution pages stay prominent; enterprise controls remain available through
More tools or Settings; duplicate views and configuration routes are removed.

All dispositions follow the normative BLD-00 decisions. BLD-00-001 requires
cross-document reconciliation before route deletion.

BLD-02E and BLD-02F are the exhaustive current-route inventories and detailed
page contracts. A route described here as `ADD` has no current page; a
`CONSOLIDATE`, `MOVE`, or `REMOVE` route may be current, retired, or a
previously proposed duplicate, as stated in those matrices.

## Core Delivery Pages

| Route | Decision | Required job, actions, and views |
|---|---|---|
| `/build/{projectId}` | KEEP | Overview with health, current iteration, issue buckets, milestone/release, recent update, risks, and client progress. Primary action is `Post update`; metrics deep-link to exact sources. |
| `/build/{projectId}/issues` | KEEP | Canonical issue explorer. Create, edit, assign, relate, bulk update, save view, export where allowed. Board, list, table, and timeline layouts follow BLD-03. |
| `/build/{projectId}/tickets/{ticketKey}` | KEEP | Canonical ticket detail with fields, description, relations, subtasks, activity, comments, files, time, links, client visibility, and audit-safe actions. |
| `/build/{projectId}/my-tickets` | CONSOLIDATE | Preserve project-scoped personal work in `/build/my-work` with a visible project filter; remove first-page client filtering and delete the duplicate route after parity. |
| `/build/{projectId}/backlog` | KEEP | Prioritize unscheduled work, estimate, split, relate, and plan into the next iteration. |
| `/build/{projectId}/triage` | KEEP | Intake queue for incomplete/unowned work. Assign, classify, merge duplicate, reject, or promote without losing source provenance. |
| `/build/{projectId}/epics` | KEEP | Hierarchical planning and epic progress. Epic remains a ticket type; this page is a saved planning projection, not a second record model. |
| `/build/{projectId}/modules` | KEEP | Delivery components/modules with owner, dates, health, progress, and issue drill-down. |
| `/build/{projectId}/cycles` | KEEP | Canonical iteration planning, active execution, completion, retrospective metrics, and detail. Display label may be `Sprint`. |
| `/build/{projectId}/cycles/{cycleId}` | KEEP | Iteration goal, scope, progress, carry-over, events, metrics, and complete action. |
| `/build/{projectId}/sprints` | REMOVE | Migrate to the canonical cycle entity and delete duplicate storage, APIs, permissions, filters, analytics, and route. |
| `/build/{projectId}/milestones` | KEEP | Internal checkpoints and dependency status. |
| `/build/{projectId}/releases` | KEEP | Customer-facing delivery packages, notes, approvals, deployment state, and portal visibility. |
| `/build/{projectId}/goals` | ADD | Show Goals-owned goals linked to this project without creating a parallel goal model. |

## Collaboration and Evidence Pages

| Route | Decision | Required job, actions, and views |
|---|---|---|
| `/build/{projectId}/updates` | KEEP | Structured status updates, health, accomplishments, blockers, next steps, cadence, owner, reminders, subscriptions, freshness, stale state, audience, approval, and client visibility. |
| `/build/{projectId}/activity` | DO NOT ADD | Overview owns bounded recent activity and each record owns complete activity; no duplicate project feed route. |
| `/build/{projectId}/files` | KEEP | Project-linked files and folders; Documents/Files owns binary lifecycle and sharing. |
| `/build/{projectId}/chat` | KEEP | Contextual project channel backed by Chat ACLs and realtime ownership. |
| `/build/{projectId}/meetings` | KEEP | Project meeting index with agenda, linked issues, decisions, and action items; Meetings owns canonical event/minutes. |
| `/build/{projectId}/meetings/{meetingId}` | KEEP | Meeting detail and linked delivery evidence. |
| `/build/{projectId}/wiki` | KEEP | Project-scoped Knowledge tree and recent work backed by KB ACLs. |
| `/build/{projectId}/wiki/{pageId}` | KEEP | Canonical Knowledge document with project relation, autosave, history, and sharing. |
| `/build/{projectId}/whiteboard` | KEEP | Collaborative project board with autosave, linked work, and explicit sharing. |
| `/build/{projectId}/forms` | KEEP | Intake form definitions and response workflow. |
| `/build/{projectId}/forms/{formId}` | KEEP | Form builder, publishing, submissions, automation, and archive. |
| `/build/{projectId}/intake` | CONSOLIDATE | Move definitions and publishing to `/build/{projectId}/forms`; move the submission queue and decisions to `/build/{projectId}/triage`; retain provenance and history before deleting the duplicate route. |
| `/build/{projectId}/feedbucket` | KEEP | Project feedback/submission inbox and widget management. |
| `/build/{projectId}/feedbucket/{submissionId}` | KEEP | Submission evidence, merge/link/create issue, customer/source, and history. |
| `/build/{projectId}/customers` | CONSOLIDATE | No current standalone route is required: show linked customer context on Overview/Settings and open the CRM source. |
| `/build/{projectId}/client-portal` | KEEP_ROUTE_MOVE_CONFIG | Keep operational preview, publishing status, and client-visible progress here; move grants and defaults to `/build/{projectId}/settings/portal`. |

## Quality, Governance, and Control Pages

| Route | Decision | Required job, actions, and views |
|---|---|---|
| `/build/{projectId}/qa` | KEEP | Test cases, runs, execution, coverage, and linked issue defects. |
| `/build/{projectId}/qa/runs/{runId}` | KEEP | Focused test execution with resumable progress and evidence. |
| `/build/{projectId}/bugs` | CONSOLIDATE | Use ticket type `BUG` as the work item. QA-specific evidence is linked metadata; remove an independent defect lifecycle after migration. |
| `/build/{projectId}/approvals` | KEEP | Project approval requests, decisions, delegation, expiry, and audit. |
| `/build/{projectId}/change-requests` | KEEP | Scope/change proposals with impact, approvers, decision, and linked work. |
| `/build/{projectId}/incidents` | KEEP | Delivery incident index with severity, owner, timeline, and linked issue/release. |
| `/build/{projectId}/incidents/{incidentId}` | KEEP | Incident command, timeline, communications, actions, and postmortem. |
| `/build/{projectId}/governance` | CONSOLIDATE | No current standalone hub is required: Overview summarizes governance and links to risks, decisions, changes, approvals, and incidents. |
| `/build/{projectId}/risks` | KEEP | Risk register with probability, impact, owner, mitigation, review date, and status. |
| `/build/{projectId}/decisions` | KEEP | Decision log with context, options, decision, owner, evidence, and supersession. |
| `/build/{projectId}/reports` | KEEP | Permission-safe project reports with source drill-down and export. |
| `/build/{projectId}/analytics` | CONSOLIDATE | Move KPI and chart overview into Reports so metrics, filters, definitions, cache revision, and export have one owner. |
| `/build/{projectId}/budget` | KEEP | Project budget, actuals, forecast, and variance. Accounting owns ledger transactions. |
| `/build/{projectId}/time-tracking` | CONSOLIDATE | No current duplicate page is required: show a permission-safe time summary where useful and deep-link to Timesheets for canonical entries and approvals. |
| `/build/{projectId}/workload` | KEEP | Capacity by person/team and date, with allocation and availability sources disclosed. |

## Agent and Automation Pages

| Route | Decision | Required job, actions, and views |
|---|---|---|
| `/build/{projectId}/agents` | CONSOLIDATE | No current project page is required: durable runs and failures live in the scope-aware Command Center/Inbox unless scale proves a dedicated run index necessary. |
| `/build/{projectId}/ai` | CONSOLIDATE | Routine assistance lives in the contextual AI surface; durable runs/history use the canonical agent-run owner. Delete the standalone page if it has no unique workflow after migration. |
| `/build/{projectId}/agent-governance` | ADD under Settings | Policy, allowed tools, approval thresholds, budgets, and retention belong to `/build/{projectId}/settings/agents`; do not create an operational duplicate. |
| `/build/{projectId}/agent-tokens` | ADD under Settings | Credential issuance, rotation, revocation, and audit belong to `/build/{projectId}/settings/agents/credentials`; do not create a standalone project page. |
| `/build/{projectId}/automations` | MOVE | Move automation configuration to `/build/{projectId}/settings/automations`. |
| `/build/{projectId}/project-automations` | REMOVE | Retired duplicate automation owner; migrate any unique rule and keep zero route/API/UI callers. |
| `/build/{projectId}/webhooks` | MOVE | Move to `/build/{projectId}/settings/integrations/webhooks`. |
| `/build/{projectId}/integrations` | ADD under Settings | Connectivity belongs to `/build/{projectId}/settings/integrations`; do not add a parallel operational route. |

## Views and Configuration Pages

| Route | Decision | Required replacement |
|---|---|---|
| `/build/{projectId}/calendar` | REMOVE | `/calendar?source=build&projectId=...`; Issues may link to this filtered unified calendar. |
| `/build/{projectId}/gantt` | CONSOLIDATE | Issues `Timeline` layout with the same filters, dependencies, and saved-view contract. |
| `/build/{projectId}/timeline` | CONSOLIDATE | Same canonical Issues `Timeline`; no second implementation. |
| `/build/{projectId}/views` | CONSOLIDATE | Manage saved views in the Issues view menu and a settings subpage only when administration is required. |
| `/build/{projectId}/roadmap` | CONSOLIDATE | Product roadmap owns outcomes; project releases, milestones, and issue timeline own delivery planning. |
| `/build/{projectId}/workflow` | MOVE | `/build/{projectId}/settings/workflow`. |
| `/build/{projectId}/members` | ADD under Settings | Membership administration belongs to `/build/{projectId}/settings/access`; do not add a parallel operational route. |
| `/build/{projectId}/settings` | KEEP | Settings landing; route sections below replace unrelated operational routes. |

## Required Settings Information Architecture

- **General** — name, key, description, owner, dates, status, workspace,
  managed products, customer links, archive.
- **Access** — members, teams, scoped roles, guests, client grants, reviews.
- **Workflow** — statuses, categories, allowed transitions, initial/completed
  states, WIP limits, resolution requirements, and reopen rules.
- **Views** — default layout, default group/sort, card fields, completed-item
  visibility, saved-view administration, and density.
- **Fields and labels** — custom fields, labels, issue types, required fields,
  option lifecycle, and defaults.
- **Iterations** — terminology, cadence, start day, duration, auto-create,
  carry-over, and completion behavior.
- **Automations** — triggers, conditions, actions, dry run, enablement, run
  history, rate limits, and failure owner.
- **Integrations** — provider connections, repositories, webhooks, event
  subscriptions, health, and least-privilege scopes.
- **Client portal** — branding, published sections, field visibility, update
  approval, release visibility, and grant defaults.
- **Agents** — allowed tools, proposal/confirmation policy, budgets,
  credentials, retention, and audit.
- **Archive and retention** — archived issues/views/forms and project archive
  or restore. Destructive purge is platform-governed.

- [ ] **BLD-02B-001** every settings section has one route and one data owner.
- [ ] **BLD-02B-002** moving a capability preserves unique requirements,
  permissions, records, and inbound links before the old route is deleted.
- [ ] **BLD-02B-003** operational actions never move into Settings.
- [ ] **BLD-02B-004** archived records are discoverable and restorable by
  authorized actors.

## Page-Level Action Contract

Every retained page provides:

- a primary action only when the page's customer job requires one;
- row/card actions in a visible keyboard-operable menu;
- bulk selection only where a true batch API exists;
- filter, sort, view, column, density, and saved-view controls appropriate to
  its data shape;
- direct links to source records behind every aggregate;
- loading, empty, no-results, denied, offline, conflict, and error states;
- bounded pagination or an explicitly bounded configuration list; and
- responsive behavior that keeps primary and destructive actions available.

- [ ] **BLD-02B-005** every retained route has a page contract naming its
  primary action, secondary actions, views, filters, and collection strategy.
- [ ] **BLD-02B-006** no read-only, aggregate, or settings page gains CRUD
  merely for consistency.
- [ ] **BLD-02B-007** external-client preview is available before publication.
- [ ] **BLD-02B-008** project updates and releases can produce a polished,
  explicitly approved client progress view.

## Acceptance

- [ ] **BLD-02B-A01** all current project routes appear exactly once across the
  exhaustive BLD-02E and BLD-02F inventories and match this disposition.
- [ ] **BLD-02B-A02** retained routes have matching frontend access, backend
  permission, scope, and module contracts.
- [ ] **BLD-02B-A03** removed and moved routes have zero physical page,
  navigation, command, notification, email, or test callers.
- [ ] **BLD-02B-A04** a freelancer can run a project using Overview, Issues,
  Backlog, Iterations, Updates, Files, and Client Portal without enterprise
  setup.
- [ ] **BLD-02B-A05** an enterprise can use governance, QA, approvals, budget,
  workload, agents, and access controls without exposing them to unauthorized
  users.
