# BLD-01A — Canonical Build Route Manifest

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This manifest is the current-to-final route authority for Build. It inventories
all 74 current Build-owned routes: 65 authenticated Build pages, five internal
or external portal pages, and four public Build pages. Detailed UX and data
contracts live in BLD-02C through BLD-02F.

The generated census at `docs/specs/build/generated/routes.snapshot.json` is
authoritative and currently reports 74 routes. The count reflects the approved
dead-surface removal and the retained `/portal`, `/portal/{projectId}`, and
public collaboration routes recorded in
`docs/build-module/DEAD-BUILD-SURFACE-INVENTORY.md`.

`KEEP` means the current path remains. `MOVE` changes the canonical path.
`CONSOLIDATE` preserves the customer job at the target and deletes the current
page after parity. `REMOVE` deletes the duplicate after migration. `ADD` means
the final route has no current physical page.

## Organization Routes

| Stable ID | Current path | Final path · disposition | Contract |
|---|---|---|---|
| `PG-ORG-001` | `/build` | same · KEEP Projects | BLD-02C |
| `PG-ORG-002` | `/build/access` | `/build/settings/access` · MOVE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02C |
| `PG-ORG-003` | `/build/all-work` | same · KEEP | BLD-02C |
| `PG-ORG-004` | `/build/approvals` | same · KEEP | BLD-02C |
| `PG-ORG-005` | `/build/client-access` | `/build/settings/client-access` · MOVE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02C |
| `PG-ORG-006` | `/build/command-center` | same · KEEP | BLD-02C |
| `PG-ORG-007` | `/build/customers` | `/crm` · DELETE — **page deleted 2026-09-23**, redirect retained in `next.config.ts` | BLD-02C |
| `PG-ORG-008` | `/build/drafts` | `/build/inbox?view=drafts` · CONSOLIDATE | BLD-02C |
| `PG-ORG-009` | `/build/goal` | `/build/goals` · MOVE — **executed 2026-09-22**, redirect in `next.config.ts` | BLD-02C |
| `PG-ORG-010` | `/build/goal/{goalId}` | `/build/goals/{goalId}` · MOVE — **executed 2026-09-22**, redirect in `next.config.ts` | BLD-02C |
| `PG-ORG-011` | `/build/inbox` | same · KEEP | BLD-02C |
| `PG-ORG-012` | `/build/managed-products` | same · KEEP | BLD-02D |
| `PG-ORG-013` | `/build/members` | `/build/settings/access` · CONSOLIDATE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02C |
| `PG-ORG-014` | `/build/my-work` | same · KEEP | BLD-02C |
| `PG-ORG-015` | `/build/pm-workspaces` | `/build` · REMOVE — PM Workspace deleted, not moved; `next.config.ts` redirects the deep link | BLD-02C |
| `PG-ORG-016` | `/build/portfolios` | same · KEEP | BLD-02C |
| `PG-ORG-017` | `/build/portfolios/{portfolioId}` | same · KEEP | BLD-02C |
| `PG-ORG-018` | `/build/programs` | same · KEEP | BLD-02C |
| `PG-ORG-019` | `/build/roadmap` | same · KEEP roll-up | BLD-02C |
| `PG-ORG-020` | `/build/settings/integrations` | same · KEEP in expanded Build settings | BLD-02C |
| `PG-ORG-021` | `/build/teams` | same · KEEP | BLD-02C |
| `PG-ORG-022` | `/build/teams/{teamId}` | same · KEEP | BLD-02C |
| `PG-ORG-023` | `/build/templates` | same · KEEP | BLD-02C |

## PM Workspace Routes — Removed

PM Workspace is removed, not renamed (BLD-00 D01). All nine routes below are
deleted with no replacement page; each job moves to an organization-scope
route and each deep link redirects via `next.config.ts`.

| Stable ID | Former path | Redirect target · disposition | Contract |
|---|---|---|---|
| `PG-WS-001` | `/build/workspaces/{pmWorkspaceId}` | `/build` · REMOVE | — |
| `PG-WS-002` | `/build/workspaces/{pmWorkspaceId}/all-work` | `/build/all-work` · REMOVE | — |
| `PG-WS-003` | `/build/workspaces/{pmWorkspaceId}/goals` | `/build/goals` · REMOVE | — |
| `PG-WS-004` | `/build/workspaces/{pmWorkspaceId}/my-work` | `/build/my-work?projectId=...` · REMOVE | — |
| `PG-WS-005` | `/build/workspaces/{pmWorkspaceId}/overview` | `/build/command-center` · REMOVE | — |
| `PG-WS-006` | `/build/workspaces/{pmWorkspaceId}/products` | `/build/managed-products` · REMOVE | — |
| `PG-WS-007` | `/build/workspaces/{pmWorkspaceId}/roadmap` | `/build/roadmap` · REMOVE | — |
| `PG-WS-008` | `/build/workspaces/{pmWorkspaceId}/teams` | `/build/teams` · REMOVE | — |
| `PG-WS-009` | `/build/workspaces` (index) | `/build` · REMOVE | — |

## Managed Product Routes

| Stable ID | Current path | Final path · disposition | Contract |
|---|---|---|---|
| `PG-PROD-001` | `/build/managed-products/{managedProductId}` | same · KEEP Overview | BLD-02D |
| `PG-PROD-002` | `/build/managed-products/{managedProductId}/feedback` | same · KEEP | BLD-02D |
| `PG-PROD-003` | `/build/managed-products/{managedProductId}/goals` | same · KEEP | BLD-02D |
| `PG-PROD-004` | `/build/managed-products/{managedProductId}/insights` | same · KEEP | BLD-02D |
| `PG-PROD-005` | `/build/managed-products/{managedProductId}/projects` | same · KEEP | BLD-02D |
| `PG-PROD-006` | `/build/managed-products/{managedProductId}/roadmap` | same · KEEP | BLD-02D |

## Project Routes

| Stable ID | Current path | Final path · disposition | Contract |
|---|---|---|---|
| `PG-PRJ-001` | `/build/{projectId}` | same · KEEP Overview | BLD-02E |
| `PG-PRJ-002` | `/build/{projectId}/ai` | `/build/command-center?projectId=...` · CONSOLIDATE — **page deleted 2026-09-23**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-003` | `/build/{projectId}/analytics` | `/build/{projectId}/reports?tab=overview` · CONSOLIDATE — **page deleted 2026-09-23**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-004` | `/build/{projectId}/approvals` | same · KEEP | BLD-02F |
| `PG-PRJ-005` | `/build/{projectId}/automations` | `/build/{projectId}/settings/automations` · MOVE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-006` | `/build/{projectId}/backlog` | same · KEEP | BLD-02E |
| `PG-PRJ-007` | `/build/{projectId}/budget` | same · KEEP | BLD-02F |
| `PG-PRJ-008` | `/build/{projectId}/bugs` | `/build/{projectId}/issues?type=BUG` · CONSOLIDATE — **page deleted 2026-09-23**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-009` | `/build/{projectId}/change-requests` | same · KEEP | BLD-02F |
| `PG-PRJ-010` | `/build/{projectId}/chat` | same · KEEP Chat projection | BLD-02E |
| `PG-PRJ-011` | `/build/{projectId}/client-portal` | same · KEEP_ROUTE_MOVE_CONFIG; operational editor/preview remains, configuration moves to Settings | BLD-02F |
| `PG-PRJ-012` | `/build/{projectId}/cycles` | same · KEEP canonical iteration | BLD-02E |
| `PG-PRJ-013` | `/build/{projectId}/cycles/{cycleId}` | same · KEEP | BLD-02E |
| `PG-PRJ-014` | `/build/{projectId}/decisions` | same · KEEP | BLD-02F |
| `PG-PRJ-015` | `/build/{projectId}/epics` | same · KEEP ticket projection | BLD-02E |
| `PG-PRJ-016` | `/build/{projectId}/feedbucket` | same · KEEP | BLD-02F |
| `PG-PRJ-017` | `/build/{projectId}/feedbucket/{submissionId}` | same · KEEP | BLD-02F |
| `PG-PRJ-018` | `/build/{projectId}/files` | same · KEEP Files projection | BLD-02E |
| `PG-PRJ-019` | `/build/{projectId}/forms` | same · KEEP | BLD-02F |
| `PG-PRJ-020` | `/build/{projectId}/forms/{formId}` | same · KEEP builder | BLD-02F |
| `PG-PRJ-021` | `/build/{projectId}/incidents` | same · KEEP | BLD-02F |
| `PG-PRJ-022` | `/build/{projectId}/incidents/{incidentId}` | same · KEEP execution | BLD-02F |
| `PG-PRJ-023` | `/build/{projectId}/intake` | `/build/{projectId}/forms` definitions + `/build/{projectId}/triage` submissions · CONSOLIDATE | BLD-02F |
| `PG-PRJ-024` | `/build/{projectId}/issues` | same · KEEP canonical explorer | BLD-02E |
| `PG-PRJ-025` | `/build/{projectId}/meetings` | same · KEEP Meetings projection | BLD-02E |
| `PG-PRJ-026` | `/build/{projectId}/meetings/{meetingId}` | same · KEEP | BLD-02E |
| `PG-PRJ-027` | `/build/{projectId}/milestones` | same · KEEP | BLD-02E |
| `PG-PRJ-028` | `/build/{projectId}/modules` | same · KEEP | BLD-02E |
| `PG-PRJ-029` | `/build/{projectId}/my-tickets` | `/build/my-work?projectId=...` · CONSOLIDATE | BLD-02E |
| `PG-PRJ-030` | `/build/{projectId}/qa` | same · KEEP QA evidence | BLD-02F |
| `PG-PRJ-031` | `/build/{projectId}/qa/runs/{runId}` | same · KEEP execution | BLD-02F |
| `PG-PRJ-032` | `/build/{projectId}/releases` | same · KEEP | BLD-02E |
| `PG-PRJ-033` | `/build/{projectId}/reports` | same · KEEP analytics owner | BLD-02F |
| `PG-PRJ-034` | `/build/{projectId}/risks` | same · KEEP | BLD-02F |
| `PG-PRJ-035` | `/build/{projectId}/settings` | same · KEEP landing/general | BLD-02F |
| `PG-PRJ-036` | `/build/{projectId}/sprints` | `/build/{projectId}/cycles` · REMOVE duplicate | BLD-02E |
| `PG-PRJ-037` | `/build/{projectId}/tickets/{ticketKey}` | same · KEEP | BLD-02E |
| `PG-PRJ-038` | `/build/{projectId}/timeline` | `/build/{projectId}/issues?view=timeline` · CONSOLIDATE — **page deleted 2026-09-23**, redirect retained in `next.config.ts`. No `layout` param ever existed; the shipped `?view=` value `gantt` was renamed to `timeline` and still resolves | BLD-02E |
| `PG-PRJ-039` | `/build/{projectId}/triage` | same · KEEP | BLD-02E |
| `PG-PRJ-040` | `/build/{projectId}/updates` | same · KEEP | BLD-02E |
| `PG-PRJ-041` | `/build/{projectId}/views` | `/build/{projectId}/issues` saved-view menu · CONSOLIDATE — **page deleted 2026-09-23**, redirect retained in `next.config.ts` | BLD-02E |
| `PG-PRJ-042` | `/build/{projectId}/webhooks` | `/build/{projectId}/settings/integrations/webhooks` · MOVE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-043` | `/build/{projectId}/whiteboard` | same · KEEP single project canvas | BLD-02E |
| `PG-PRJ-044` | `/build/{projectId}/wiki` | same · KEEP Knowledge projection | BLD-02E |
| `PG-PRJ-045` | `/build/{projectId}/wiki/{pageId}` | same · KEEP | BLD-02E |
| `PG-PRJ-046` | `/build/{projectId}/workflow` | `/build/{projectId}/settings/workflow` · MOVE — **page deleted 2026-09-22**, redirect retained in `next.config.ts` | BLD-02F |
| `PG-PRJ-047` | `/build/{projectId}/workload` | same · KEEP | BLD-02E |

## Internal and External Portal Routes

| Stable ID | Current path | Final path · disposition | Contract |
|---|---|---|---|
| `PG-PORTAL-001` | `/portal` | same · KEEP employee preview directory | BLD-02D |
| `PG-PORTAL-002` | `/portal/{projectId}` | same · KEEP employee preview detail | BLD-02D |
| `PG-PORTAL-003` | `/client-portal` | same · KEEP external directory | BLD-02D |
| `PG-PORTAL-004` | `/client-portal/{projectId}` | same · KEEP external detail | BLD-02D |
| `PG-PORTAL-005` | `/accept-invitation` | same · KEEP external session exchange | BLD-02D |

## Public Build Routes

| Stable ID | Current path | Final path · disposition | Contract |
|---|---|---|---|
| `PG-PUBLIC-001` | `/board/{shareToken}` | same · KEEP deny-by-default share | BLD-02D |
| `PG-PUBLIC-002` | `/forms/{formToken}` | same · KEEP published form | BLD-02D |
| `PG-PUBLIC-003` | `/intake/{projectId}` | `/forms/{formToken}` · CONSOLIDATE | BLD-02D |
| `PG-PUBLIC-004` | `/roadmap/{orgId}` | `/roadmap/{shareToken}` · MOVE authority | BLD-02D |

## Required Final Routes Without a Current Page

| Stable ID | Final path · disposition | Customer job | Contract |
|---|---|---|---|
| `PG-ADD-001` | `/build/settings` · ADD | Build configuration directory | BLD-02C |
| `PG-ADD-002` | `/build/settings/access` · ADD | Build membership/access administration | BLD-02C |
| `PG-ADD-003` | `/build/settings/client-access` · ADD | External grant administration | BLD-02C |
| `PG-ADD-005` | `/build/managed-products/{managedProductId}/settings` · ADD | Product configuration | BLD-02D |
| `PG-ADD-006` | `/build/{projectId}/goals` · ADD | Goals-owned project projection | BLD-02E |
| `PG-ADD-007` | `/build/{projectId}/settings/access` · ADD | Project membership administration | BLD-02F |
| `PG-ADD-008` | `/build/{projectId}/settings/workflow` · ADD | Workflow/status configuration | BLD-02F |
| `PG-ADD-009` | `/build/{projectId}/settings/views` · ADD | Shared view administration only | BLD-02F |
| `PG-ADD-010` | `/build/{projectId}/settings/fields` · ADD | Custom fields and labels | BLD-02F |
| `PG-ADD-011` | `/build/{projectId}/settings/iterations` · ADD | Cycle policy and display terminology | BLD-02F |
| `PG-ADD-012` | `/build/{projectId}/settings/automations` · ADD | Automation configuration | BLD-02F |
| `PG-ADD-013` | `/build/{projectId}/settings/integrations` · ADD | Project connection mappings | BLD-02F |
| `PG-ADD-014` | `/build/{projectId}/settings/integrations/webhooks` · ADD | Webhook configuration and delivery access | BLD-02F |
| `PG-ADD-015` | `/build/{projectId}/settings/portal` · ADD | Portal publication defaults and grants | BLD-02F |
| `PG-ADD-016` | `/build/{projectId}/settings/agents` · ADD | Agent policy, budget, approvals, retention | BLD-02F |
| `PG-ADD-017` | `/build/{projectId}/settings/agents/credentials` · ADD | Credential issue/rotate/revoke | BLD-02F |
| `PG-ADD-018` | `/build/{projectId}/settings/retention` · ADD | Archive, retention, transfer, recovery | BLD-02F |

`/build/goals` and `/build/goals/{goalId}` are final MOVE targets already
represented by `PG-ORG-009` and `PG-ORG-010`; they are not double-counted as
ADD routes. `PG-ORG-015` (`/build/pm-workspaces`) is REMOVE, not MOVE — PM
Workspace has no final path, so it is not represented as an ADD route either.

The generated final-route set contains retained routes, MOVE targets, and ADD
routes. It excludes REMOVE rows and CONSOLIDATE source routes. The PM Workspace
removal drops 9 routes (`PG-WS-001` through `PG-WS-009`) and 1 ADD route
(former `PG-ADD-004`, workspace settings). The generated census at
`docs/specs/build/generated/routes.snapshot.json` is
authoritative after those decisions and currently reports 74 live Build routes.

## Explicit Non-Pages

- No organization Whiteboards hub while the product owns one project canvas.
- No project Activity hub; Overview shows a bounded recent feed and each record
  owns its complete activity.
- No Governance hub; Overview links directly to risks, decisions, approvals,
  changes, and incidents.
- No project Customers page; CRM and contextual customer relations own it.
- No project Time Tracking page; Timesheets owns entries and approvals.
- No project Agents page; Command Center owns durable runs and failures.
- No project Calendar, Gantt, Roadmap, or separate saved-views page.

## Manifest Acceptance

- [ ] **BLD-01M-001** filesystem census contains exactly the 74 current
  Build-owned pages above and zero unclassified Build pages.
- [ ] **BLD-01M-002** every stable ID links to one detailed BLD-02C through
  BLD-02F row and one route disposition.
- [ ] **BLD-01M-003** every retained/final route identifies physical page,
  feature owner, route-access rule, permission, data scope, navigation
  surfaces, API owner, and applicable state/boundary evidence.
- [ ] **BLD-01M-004** every MOVE, CONSOLIDATE, and REMOVE row has zero inbound
  links, bookmarks generated by the app, notification/email targets, nav
  entries, API clients, and route files before deletion.
- [ ] **BLD-01M-005** `frontend/PAGES.md`, navigation catalogs, command palette,
  mobile navigation, route-access entries, sitemaps/share builders, and this
  manifest have zero path drift.
- [ ] **BLD-01M-006** a generated route check fails on an unregistered page,
  missing retained page, bare dynamic segment, stale destination, or duplicate
  canonical path.
