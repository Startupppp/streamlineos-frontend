# Core Module QA Program

## Purpose

Establish a repeatable, evidence-based QA program for the Projects, workspace administration, Chat, Inbox, and Calendar surfaces. The program verifies user value, UI behavior, API correctness, authorization, tenant isolation, and competitive gaps before a module is considered release-ready.

This is a test-program specification. It does not certify any existing page, route, API, or prior audit finding as verified.

## Scope and sequencing

The program is intentionally phased so that defects in shared access, organization, and notification behavior are discovered before later modules depend on them.

1. QA foundation and controlled test data.
2. Projects and client-facing delivery workflows.
3. Workspace administration: Organization, People, Access Control, Subscription, Platform, Security, and Developer.
4. Chat, Inbox, Calendar, and cross-module notification workflows.
5. Automated regression, performance, security, and release readiness.

Each module follows `testing/AUDIT_FRAMEWORK.md` phases 0 through 6. Page-level UI audit completion is recorded separately from workflow, RBAC, API, and tenant-isolation verification.

## Test environments and data

Run destructive and permission-negative tests only against a local or dedicated staging environment. Production may be used for read-only smoke checks only after an explicit decision.

Create two isolated organizations:

- Org Alpha: the main test tenant with test records.
- Org Beta: a second tenant used exclusively for cross-tenant denial tests.

Create identities representing:

- Platform administrator.
- Organization owner.
- Workspace administrator.
- Project manager.
- Contributor.
- Approver.
- Client or external portal user.
- Denied user with neither role nor project membership.

Seed named, disposable records for projects, portfolios, goals, milestones, cycles, tickets, approvals, client portal access, messages, notifications, and calendar events. The seed process must support reset so tests are repeatable and cannot depend on manually created state.

## RBAC and tenant-isolation contract

For every tested action, record:

- Required permission and module gate.
- UI behavior for an authorized user and a denied user.
- Backend result for an authorized request and a denied request.
- Data scope behavior for `all`, `team`, `own`, and `none`, where the resource supports it.
- Cross-tenant behavior using an Org Beta object identifier while authenticated as an Org Alpha user.

An action passes only when both the UI avoids offering inaccessible behavior and the backend rejects unauthorized or cross-tenant requests. Client-side hiding, route redirects, and proxy behavior are convenience controls; `PermissionGuard`, `AccessService`, and tenant-scoped service queries are the authorization evidence.

## Page and component procedure

For each route:

1. Inventory its page file, principal components, TanStack Query hooks, and backend endpoints.
2. Exercise default, loading, empty, error, unauthorized, and populated states.
3. Exercise every actionable component: buttons, menus, forms, dialogs, sheets, filters, search, pagination, sort, inline edits, uploads, navigation, and destructive actions.
4. Verify persistence after refresh and duplicate-submit resistance for mutations.
5. Check light mode, dark mode, one non-default theme accent, keyboard navigation, and 375/768/1280px layouts.
6. Capture browser evidence: route, test identity, requests, response codes, console state, and before/after screenshots for defects.
7. Trace each endpoint through controller, permission/module guards, service, and tenant-scoped database query where a defect or high-risk workflow warrants it.

No route is marked verified until the failed checks are re-run in the browser and the appropriate build, lint, and type checks pass after a fix.

## Milestone 0: QA foundation

Deliverables:

- Environment health record, including frontend, backend, database migration state, and background/realtime dependencies.
- Repeatable seed/reset mechanism for Org Alpha and Org Beta.
- Test identities and an access matrix.
- Defect taxonomy and evidence template.
- Test tracker that distinguishes `inventory`, `manual pass`, `RBAC pass`, `API pass`, `automation added`, `blocked`, and `deferred`.

Severity:

- P0: tenant leak, authorization bypass, data loss, duplicate financial/approval mutation, or a core release blocker.
- P1: core workflow blocked, missing error/recovery state, sensitive overexposure, or a key role cannot complete its job.
- P2: material UX, consistency, performance, or feature-completeness defect.
- P3: validated product enhancement or polish opportunity.

## Milestone 1: Projects

Validate full outcomes, not isolated screens:

- Project creation, templates, teams, memberships, roles, and project settings.
- Goals, portfolios, roadmaps, milestones, cycles, sprints, backlog, board, list, views, timeline, workload, analytics, reports, and budgets.
- Ticket creation and lifecycle, status transitions, assignments, inline edits, dependencies, comments, attachments, labels, forms, intake, and automations.
- QA runs, bugs, incidents, risks, decisions, releases, and change requests.
- Client portal invitations, expiry/revocation, allowed project visibility, safe file/comment/change-request exchange, and absence of internal-only data.
- Approvals for task, milestone, budget, release, change request, client approval, document, and timesheet.

Approval testing covers requester-equals-approver, inactive approver, sequential/multi-level routing, conditional routing, delegation, escalation, reminders, cancellation, rejection, changes requested, and a resource changed after approval was requested.

Competitive gap review uses Linear, Jira, Asana, ClickUp, and agency client-portal patterns as references. A gap becomes a ticket only after it names the target user, current failed outcome, proposed behavior, measurable acceptance criteria, and expected business value.

## Milestone 2: Workspace administration

Organization:

- Create, rename, transfer, archive, leave, and hard-delete safeguards.
- Member ownership changes, active-organization switching, session/cache refresh, and cross-organization navigation.

People:

- Invite, accept, import, profile update, role assignment, deactivate/reactivate, and session/device visibility.

Access Control:

- Role creation and edit, permission grants, module enablement, per-user module deny overrides, scope rules, cache invalidation, and owner/platform-admin bypass behavior.

Subscription:

- Free, paid, and enterprise creation limits; seats; billing profile; invoices; AI credits; upgrades/downgrades; feature and module gates.

Platform, Security, and Developer:

- Platform-admin separation from organization administration.
- Sessions, MFA, login history, token revocation, audit logs, rate limits, API tokens, and security policy enforcement.
- API keys/tokens, webhooks, automation delivery, retry and failure visibility, idempotency, and permission changes.

## Milestone 3: Chat, Inbox, and Calendar

Chat:

- Direct and group conversations, membership changes, messages, edit/delete, reactions, threads, attachments, search, reconnect handling, and huddles.
- Realtime updates must be tested with at least two identities; a removed or denied member must no longer read, publish, or receive events.

Inbox:

- Notification creation, deduplication, read/unread state, filtering, deep links, preview access control, and state after the linked entity is deleted or becomes inaccessible.

Calendar:

- Unified source visibility, time zones, recurrence if supported, event create/update/delete permissions, project/CRM/HR event sources, and disconnected integration states.
- Calendar events must never reveal fields the current user cannot access through their originating module.

## Milestone 4: automation and release readiness

Automate P0/P1 and revenue-critical journeys only after manual acceptance:

- API/controller tests for authentication, RBAC allow/deny, scope, input validation, and Org Alpha-to-Org Beta isolation.
- Browser tests for the highest-value role journeys and destructive confirmation flows.
- Realtime tests for Chat and Inbox where applicable.
- Regression tests for previously fixed defects.

Release readiness requires:

- No open P0 defects.
- No unapproved P1 defects.
- Critical role journeys pass with evidence.
- Cross-tenant and denied-access cases pass at API level.
- Build, lint, type checks, and relevant test suites pass.
- Responsive, accessibility, and console checks pass for audited pages.
- Every deferred item has an owner, priority, rationale, and target milestone.

## Ticket workflow

Maintain one ticket per independently testable defect or feature gap. A ticket contains:

- Module, route, component, test identity, and preconditions.
- Reproduction steps and expected versus actual result.
- Endpoint, permission key, module gate, and tenant involved when applicable.
- Evidence links or attachments.
- Severity, acceptance criteria, and regression target.

When the StreamlineOS MCP is configured with a local token, use it only to inspect, comment on, and move tickets within the permissions of the configured user. Never place the token in source control, specifications, prompts, or ticket comments.

## First execution slice

Begin Projects with the workflow that best exercises the platform boundary:

1. Org owner creates a project from a template and adds a project manager and contributor.
2. Project manager creates a milestone, sprint, and ticket with a client-visible change request.
3. Contributor updates the ticket and submits an approval.
4. Approver approves, requests changes, delegates, and handles an expired/inactive-approver path.
5. Client views only allowed portal content and approves or rejects the change request.
6. Verify Inbox notification and Calendar/Chat side effects where the product exposes them.
7. Repeat key accesses as a denied user and from Org Beta identifiers.

This slice should generate the initial route inventory, RBAC matrix entries, defect tickets, and candidates for the first automated regression suite.
