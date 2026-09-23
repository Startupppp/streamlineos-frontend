# Build Information Architecture and Navigation

## Evidence

- Physical routes: `frontend/app/(authenticated)/build/**/page.tsx` (79 pages on 2026-09-22).
- Scope model: `frontend/lib/build/build-scope.ts`.
- Catalog/model: `frontend/lib/build/build-nav-model.ts`, `frontend/lib/build/build-nav-groups.ts`, `frontend/lib/build/nav/`.
- Canonical route list: `frontend/lib/build/build-route-manifest.ts`, snapshotted in `docs/specs/build/generated/routes.snapshot.json`.
- Production sidebar: organization scope at `/build/command-center`; project scope at `/build/1`.

## Navigation principles

1. Navigation follows user scope, not backend module layout.
2. Primary sidebar contains at most nine destinations. Everything else is searchable in More tools and the command palette.
3. Nesting is two levels maximum: scope selector, then destination. Settings may add a third level only inside the page, never in the global sidebar.
4. A destination exists once. Filters and layouts are URL state, not duplicate pages.
5. Collapsed mode retains icon labels, tooltips, badges, focus order, and scope identity.

## Final sidebar

### Global shell

1. Module switcher
2. Organization switcher
3. Search / command palette
4. Calendar, Chat, Notifications, Quick create
5. Account

### Build shell

1. Scope selector: Organization (All of Build) → Managed Product → Project. Products and Projects sit directly below the organization scope; no workspace row. Search placeholder is "Search projects and products."
2. My Work: Inbox, My work
3. Scope primary destinations
4. Create menu
5. Pinned tools, maximum three
6. More tools
7. Scope settings
8. Browse all work

### Scope primary destinations

| Scope | Ordered destinations |
|---|---|
| Organization | Home, Projects, Products, Portfolios, Programs, Teams |
| Managed Product | Overview, Feedback, Insights, Roadmap, Goals, Projects |
| Project | Overview, Issues, Backlog, Cycles, Roadmap/Timeline layout, Releases, Updates, Files, Client portal |

## Placement rules

| Surface | Belongs here when | Examples |
|---|---|---|
| Sidebar | Revisited across sessions and defines location | Projects, Issues, Cycles, Releases |
| Command palette | Known-item navigation or fast command | Open ticket, switch scope, create issue, assign to me |
| Top bar | Global context/action independent of current page | Search, notifications, calendar, chat, quick create |
| More tools | Valuable but episodic specialist workflow | QA, risks, decisions, forms, automations |
| Page tabs | Same entity, same permission family, same mental task | Report types, product insights, QA cases/runs |
| URL query | Filter, sort, grouping, layout, selected tab, time range | `layout=board`, `status=`, `group=`, `cursor=` |

## Route disposition summary

### Move or consolidate

- `/build/drafts` → `/build/inbox?view=drafts`.
- `/build/goal*` → `/build/goals*`. **EXECUTED 2026-09-22.**
- `/build/members` and `/build/access` → `/build/settings/access`.
- `/build/client-access` → `/build/settings/client-access`.
- Project My Tickets → `/build/my-work?projectId=...`.
- Project Timeline and Views → `/build/{projectId}/issues?layout=timeline` and saved-view controls.
- Project Analytics → Reports Overview.
- Project Bugs → Issues filtered to `type=BUG`, retaining QA evidence.
- Project Intake → Forms definitions plus Triage submissions.
- Project AI → contextual assistant plus Command Center run history.
- Workflow, automations, webhooks → scoped Project Settings.

### Delete

- `/build/{projectId}/sprints`; canonical route is `/cycles`.
- Duplicate Activity, Governance, project Calendar, time tracking, customer, or agent hubs.
- Any route that only renders another page and has no intentional redirect contract.
- PM Workspace, in full. **EXECUTED.** `/build/workspaces`, `/build/workspaces/[pmWorkspaceId]` and its nested `overview`, `all-work`, `goals`, `products`, `roadmap`, `teams` are deleted with no replacement page — the concept is gone, not moved. `next.config.ts` preserves every deep link as a redirect: `/build/workspaces` → `/build`; `/build/workspaces/:id` → `/build`; `/build/workspaces/:id/overview` → `/build/command-center`; `/build/workspaces/:id/all-work` → `/build/all-work`; `/build/workspaces/:id/goals` → `/build/goals`; `/build/workspaces/:id/products` → `/build/managed-products`; `/build/workspaces/:id/roadmap` → `/build/roadmap`; `/build/workspaces/:id/teams` → `/build/teams`; `/build/pm-workspaces` → `/build`.

## Library and Wiki scoping

`frontend/features/wiki/components/wiki-sidebar-nav.tsx` proves Library is a Knowledge navigation group containing Private, Shared, and Spaces. It is not a Build page.

- Organization scope owns library navigation, search, private/shared/spaces, templates, review, analytics, import/export, and Knowledge permissions.
- Project scope owns a filtered Wiki projection and record links. A project cannot broaden Knowledge access.
- Project Wiki search calls organization Knowledge APIs with an explicit project predicate and rechecks the source page ACL.
- Removing a project link never deletes the organization page. Deleting a Knowledge page invalidates project projections.
- Sidebar: Wiki appears as a project tool; Library remains in the Knowledge module sidebar. Command palette may search both with scope labels.

## Collapse and responsive behavior

- Expanded rail: 240 px target; collapsed rail: 48–56 px target; labels become tooltips, not hidden semantics.
- Mobile: sidebar becomes a sheet; current scope appears in the sheet header; primary create remains reachable without horizontal scrolling.
- Scope changes preserve compatible query state and drop incompatible IDs. Dirty forms invoke `frontend/components/shared/dirty-state-context.tsx`.
- Pinned tools are per user and per scope type, not per project ID unless explicitly needed.

## Complete existing-page inventory

This census is the 2026-09-21 baseline: all 92 physical Build-owned page routes found in the repository at that date — 83 authenticated `/build/**` pages plus nine authenticated portal, external portal, and public collaboration pages. Rows marked **EXECUTED** have since been removed or renamed on disk and no longer describe a live route; the PM Workspace removal further deletes the eight `/build/workspaces*` rows below with no renamed replacement. The canonical live count is `frontend/lib/build/build-route-manifest.ts`, not this baseline. Each linked page spec contains the full interaction, state, permission, component, API, gap, and acceptance contract.

| Route | Purpose | Primary persona | Decision | Rationale |
|---|---|---|---|---|
| `/accept-invitation` | Exchange a single-use invitation for a bounded portal session. | Invited client | [KEEP](./10-external-client-invitation.md) | Keep; use a single-use, short-lived token exchange and replace the URL immediately. |
| `/board/[shareToken]` | View or edit one explicitly shared whiteboard within token capabilities. | External collaborator | [KEEP](./10-public-whiteboard.md) | Keep; capability scope must be encoded server-side, revocable, and independently rotatable. |
| `/build` | Browse and manage projects in the active organization or workspace scope. | Project manager. | [KEEP](./10-org-projects.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]` | Summarize health and next actions for the active scope. | Project or product manager. | [KEEP](./10-project.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/ai` | Propose cited project analysis and actions. | Project manager. | [CONSOLIDATE](./10-project-ai.md) | Migrate the user job to `/build/command-center?projectId=...`, preserve deep links temporarily, then remove this physical route. |
| `/build/[projectId]/analytics` | Provide one trustworthy analytics owner. | Project/program manager. | [CONSOLIDATE](./10-project-analytics.md) | Migrate the user job to `/build/[projectId]/reports?tab=overview`, preserve deep links temporarily, then remove this physical route. |
| `/build/[projectId]/approvals` | Review approval requests in scope. | Approver. | [KEEP](./10-project-approvals.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/automations` | Configure event-driven project rules. | Project administrator. | [MOVE — EXECUTED 2026-09-22](./10-project-automations.md) | Job lives at `/build/[projectId]/settings/automations`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/[projectId]/backlog` | Prioritize unscheduled work and prepare cycles. | Product owner. | [KEEP](./10-project-backlog.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/budget` | Compare approved plan, forecast, and actual cost. | Project manager or finance partner. | [KEEP](./10-project-budget.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/bugs` | Operate the canonical work-item collection. | Contributor and project manager. | [CONSOLIDATE](./10-project-bugs.md) | Migrate the user job to `/build/[projectId]/issues?type=BUG`, preserve deep links temporarily, then remove this physical route. |
| `/build/[projectId]/change-requests` | Control proposed scope changes. | Project manager or client. | [KEEP](./10-project-change-requests.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/chat` | Open the Chat-owned project conversation. | Contributor. | [KEEP](./10-project-chat.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/client-portal` | Control and preview the external client projection. | Client project manager. | [KEEP](./10-project-client-portal.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/cycles` | Plan and execute one canonical iteration model. | Team lead. | [KEEP](./10-project-cycles.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/cycles/[cycleId]` | Plan and execute one canonical iteration model. | Team lead. | [KEEP](./10-project-cycles-cycle.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/decisions` | Preserve consequential decisions and their evidence. | Project/product manager. | [KEEP](./10-project-decisions.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/epics` | Group related work toward a larger outcome. | Product manager. | [KEEP](./10-project-epics.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/feedbucket` | Collect screenshot and recording evidence from a project widget. | Product or support manager. | [KEEP](./10-project-feedbucket.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/feedbucket/[submissionId]` | Collect screenshot and recording evidence from a project widget. | Product or support manager. | [KEEP](./10-project-feedbucket-submission.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/files` | Expose project-linked files from the Files owner. | Contributor. | [KEEP](./10-project-files.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/forms` | Design and publish structured intake. | Project manager. | [KEEP](./10-project-forms.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/forms/[formId]` | Design and publish structured intake. | Project manager. | [KEEP](./10-project-forms-form.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/incidents` | Coordinate service-impacting incidents and postmortems. | Incident commander. | [KEEP](./10-project-incidents.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/incidents/[incidentId]` | Coordinate service-impacting incidents and postmortems. | Incident commander. | [KEEP](./10-project-incidents-incident.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/intake` | Classify and convert incoming evidence into canonical work. | Product/project manager. | [CONSOLIDATE](./10-project-intake.md) | Migrate the user job to `/build/[projectId]/forms and /build/[projectId]/triage`, preserve deep links temporarily, then remove this physical route. **Note (2026-09-23): This removal is NOT in scope for the current release. All three routes — `/intake`, `/forms`, and `/triage` — exist as live product routes. Verified: `frontend/app/(authenticated)/build/[projectId]/intake/page.tsx`, `forms/page.tsx`, and `triage/page.tsx` all exist.** |
| `/build/[projectId]/issues` | Operate the canonical work-item collection. | Contributor and project manager. | [KEEP](./10-project-issues.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/meetings` | Connect meetings, decisions, and action items to delivery. | Project manager. | [KEEP](./10-project-meetings.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/meetings/[meetingId]` | Connect meetings, decisions, and action items to delivery. | Project manager. | [KEEP](./10-project-meetings-meeting.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/milestones` | Track meaningful project checkpoints. | Project manager. | [KEEP](./10-project-milestones.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/modules` | Group work by durable product or system area. | Engineering/product lead. | [KEEP](./10-project-modules.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/my-tickets` | Unify work assigned to, reported by, or watched by the current actor. | Contributor. | [CONSOLIDATE — EXECUTED 2026-09-22](./10-project-my-tickets.md) | Job lives at `/build/my-work?projectId=...`. Page deleted; the redirect moved into `next.config.ts`. |
| `/build/[projectId]/qa` | Manage test evidence and execution. | QA lead. | [KEEP](./10-project-qa.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/qa/runs/[runId]` | Manage test evidence and execution. | QA lead. | [KEEP](./10-project-qa-runs-run.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/releases` | Plan and publish shipped versions. | Release manager. | [KEEP](./10-project-releases.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/reports` | Provide one trustworthy analytics owner. | Project/program manager. | [KEEP](./10-project-reports.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/risks` | Maintain a reviewable project risk register. | Project manager. | [KEEP](./10-project-risks.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/settings` | Administer configuration owned by the active scope. | Scope administrator. | [KEEP](./10-project-settings.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/tickets/[ticketKey]` | Operate the canonical work-item collection. | Contributor and project manager. | [KEEP](./10-project-tickets-issue.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/timeline` | Visualize dated issues and dependencies. | Project manager. | [CONSOLIDATE](./10-project-timeline.md) | Migrate the user job to `/build/[projectId]/issues?layout=timeline`, preserve deep links temporarily, then remove this physical route. |
| `/build/[projectId]/triage` | Classify and convert incoming evidence into canonical work. | Product/project manager. | [KEEP](./10-project-triage.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/updates` | Publish evidence-backed project status. | Project manager. | [KEEP](./10-project-updates.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/views` | Summarize health and next actions for the active scope. | Project or product manager. | [CONSOLIDATE](./10-project-views.md) | Migrate the user job to `/build/[projectId]/issues and /settings/views`, preserve deep links temporarily, then remove this physical route. |
| `/build/[projectId]/webhooks` | Configure outbound project event delivery. | Project administrator. | [MOVE — EXECUTED 2026-09-22](./10-project-webhooks.md) | Job lives at `/build/[projectId]/settings/integrations/webhooks`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/[projectId]/whiteboard` | Collaborate on one project canvas. | Product/project team. | [KEEP](./10-project-whiteboard.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/wiki` | Expose project-related Knowledge pages without duplicating Library. | Contributor. | [KEEP](./10-project-wiki.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/wiki/[pageId]` | Expose project-related Knowledge pages without duplicating Library. | Contributor. | [KEEP](./10-project-wiki-page.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/[projectId]/workflow` | Configure statuses, transitions, WIP, and required fields. | Project administrator. | [MOVE — EXECUTED 2026-09-22](./10-project-workflow.md) | Job lives at `/build/[projectId]/settings/workflow`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/[projectId]/workload` | Compare demand with team capacity. | Team/project manager. | [KEEP](./10-project-workload.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/access` | Administer Build access at organization scope. | Organization administrator. | [MOVE — EXECUTED 2026-09-22](./10-access.md) | Job lives at `/build/settings/access`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/all-work` | Search and operate across every authorized work item. | Project manager. | [KEEP](./10-all-work.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/approvals` | Review approval requests in scope. | Approver. | [KEEP](./10-approvals.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/client-access` | Administer Build access at organization scope. | Organization administrator. | [MOVE — EXECUTED 2026-09-22](./10-client-access.md) | Job lives at `/build/settings/client-access`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/command-center` | Provide a prioritized operating home across Build. | Product or project manager. | [KEEP](./10-command-center.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/customers` | Show CRM customers linked to Build delivery. | Client project manager. | [KEEP](./10-customers.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/drafts` | Collect actionable Build notifications and recover drafts. | Contributor. | [CONSOLIDATE — EXECUTED 2026-09-22](./10-drafts.md) | Job lives at `/build/inbox?view=drafts`. Page deleted; the redirect moved into `next.config.ts` and the sidebar Drafts entry now links straight to the canonical URL. |
| `/build/goal` | Define measurable outcomes and connect delivery evidence. | Product manager. | [MOVE — EXECUTED 2026-09-22](./10-goals.md) | Job lives at `/build/goals`. Directory renamed; the `next.config.ts` redirect preserves the deep link. |
| `/build/goal/[goalId]` | Define measurable outcomes and connect delivery evidence. | Product manager. | [MOVE — EXECUTED 2026-09-22](./10-goals-goal.md) | Job lives at `/build/goals/[goalId]`. Directory renamed; the `next.config.ts` redirect preserves the deep link. |
| `/build/inbox` | Collect actionable Build notifications and recover drafts. | Contributor. | [KEEP](./10-inbox.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products` | Manage products independently from delivery projects. | Product manager. | [KEEP](./10-managed-products.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]` | Manage products independently from delivery projects. | Product manager. | [KEEP](./10-managed-products-product.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]/feedback` | Collect rich customer evidence. | Product manager. | [KEEP](./10-managed-products-product-feedback.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]/goals` | Define measurable outcomes and connect delivery evidence. | Product manager. | [KEEP](./10-managed-products-product-goals.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]/insights` | Summarize health and next actions for the active scope. | Project or product manager. | [KEEP](./10-managed-products-product-insights.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]/projects` | Browse and manage projects in the active scope. | Project manager. | [KEEP](./10-managed-products-product-projects.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/managed-products/[managedProductId]/roadmap` | Connect outcomes and releases to planned product work. | Product manager. | [KEEP](./10-managed-products-product-roadmap.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/members` | Administer Build access at organization scope. | Organization administrator. | [MOVE — EXECUTED 2026-09-22](./10-members.md) | Job lives at `/build/settings/access`. Page deleted; the `next.config.ts` redirect preserves the deep link. |
| `/build/my-work` | Unify work assigned to, reported by, or watched by the current actor. | Contributor. | [KEEP](./10-my-work.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/pm-workspaces` | Optionally group projects, products, and teams. | Program administrator. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed, not renamed. The route and the concept it named are both gone; the `next.config.ts` redirect sends the deep link to `/build`. |
| `/build/portfolios` | Group investments across projects and programs. | Portfolio manager. | [KEEP](./10-portfolios.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/portfolios/[portfolioId]` | Group investments across projects and programs. | Portfolio manager. | [KEEP](./10-portfolios-portfolio.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/programs` | Coordinate related projects toward one delivery outcome. | Program manager. | [KEEP](./10-programs.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/roadmap` | Connect outcomes and releases to planned product work. | Product manager. | [KEEP](./10-roadmap.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/settings/integrations` | Administer configuration owned by the active scope. | Scope administrator. | [KEEP](./10-settings-integrations.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/teams` | Define delivery teams and their project relationships. | Team lead. | [KEEP](./10-teams.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/teams/[teamId]` | Define delivery teams and their project relationships. | Team lead. | [KEEP](./10-teams-team.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/templates` | Create repeatable project and work structures. | Project manager. | [KEEP](./10-templates.md) | Retain as a canonical page, subject to the gaps and acceptance criteria below. |
| `/build/workspaces/[pmWorkspaceId]` | Browse and manage projects in the active scope. | Project manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build`; the `next.config.ts` redirect sends the deep link to `/build`. |
| `/build/workspaces/[pmWorkspaceId]/all-work` | Search and operate across every authorized work item. | Project manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/all-work`; the `next.config.ts` redirect sends the deep link to `/build/all-work`. |
| `/build/workspaces/[pmWorkspaceId]/goals` | Define measurable outcomes and connect delivery evidence. | Product manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/goals`; the `next.config.ts` redirect sends the deep link to `/build/goals`. |
| `/build/workspaces/[pmWorkspaceId]/my-work` | Unify work assigned to, reported by, or watched by the current actor. | Contributor. | [DELETE — EXECUTED 2026-09-22](./99-kill-list.md) | Job lives at `/build/my-work?projectId=...`. Page deleted; the redirect moved into `next.config.ts` and now targets `/build` per the full PM Workspace removal. |
| `/build/workspaces/[pmWorkspaceId]/overview` | Summarize health and next actions for the active scope. | Project or product manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/command-center`; the `next.config.ts` redirect sends the deep link to `/build/command-center`. |
| `/build/workspaces/[pmWorkspaceId]/products` | Summarize health and next actions for the active scope. | Project or product manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/managed-products`; the `next.config.ts` redirect sends the deep link to `/build/managed-products`. |
| `/build/workspaces/[pmWorkspaceId]/roadmap` | Connect outcomes and releases to planned product work. | Product manager. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/roadmap`; the `next.config.ts` redirect sends the deep link to `/build/roadmap`. |
| `/build/workspaces/[pmWorkspaceId]/teams` | Define delivery teams and their project relationships. | Team lead. | [DELETE — EXECUTED](./99-kill-list.md) | PM Workspace is removed. Job lives at `/build/teams`; the `next.config.ts` redirect sends the deep link to `/build/teams`. |
| `/client-portal` | List only projects explicitly shared with the current portal identity. | External client | [KEEP](./10-external-client-portal.md) | Keep as the canonical external portal home. |
| `/client-portal/[projectId]` | Review the bounded project projection and submit a change request. | External client | [KEEP](./10-external-client-portal-project.md) | Keep as the canonical external project view. |
| `/forms/[formToken]` | Render a published Build form and create one validated submission. | External requester | [KEEP](./10-public-form.md) | Keep as the canonical public form; forms own intake definitions and submissions. |
| `/intake/[projectId]` | Submit a lightweight request into one project's triage flow. | External requester | [MERGE](./10-public-intake.md) | Deprecate after migration to a project-owned published Form; preserve a compatibility redirect or server adapter. |
| `/portal` | Find projects that have a configured client-facing projection. | Client project manager | [MOVE](./10-internal-portal-projects.md) | Move to `/build/client-portal`; retain `/portal` as an authenticated redirect during migration. |
| `/portal/[projectId]` | Preview and operate the internal view of a project's client portal. | Client project manager | [MOVE](./10-internal-portal-project.md) | Move to `/build/[projectId]/client-portal?mode=preview`; redirect the old route. |
| `/roadmap/[orgId]` | View published plans and changelog, vote, and submit feedback. | Customer or prospect | [KEEP](./10-public-roadmap.md) | Keep, but replace public numeric organization identity with a stable public slug or publication token. |

Dynamic detail pages require valid parent IDs and must return indistinguishable 404s for missing, deleted, cross-tenant, or unauthorized parents. The 17 proposed target pages have separate `10-*.md` specifications but are excluded from this existing-page table because no physical route file exists today.
## Acceptance criteria

- [ ] No sidebar scope has more than nine primary destinations.
- [ ] Every destination has one canonical route and a command-palette entry where useful.
- [ ] Collapsed, mobile, keyboard, and screen-reader navigation expose equivalent names and badges.
- [ ] Route moves preserve deep links through intentional redirects and remove old callers.
- [ ] Library remains Knowledge-owned while project Wiki remains an access-filtered projection.
- [ ] Filters, sort, group, layout, and tab state are shareable URL parameters.
