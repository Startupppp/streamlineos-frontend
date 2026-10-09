# Personas, navigation, and sidebars

Status: planned target

## Navigation model

The navigation is permission-aware, module-aware, project-aware, and personalized. It has four layers:

1. **Global rail**: organization switcher, Home, module switcher, global search, create, notifications, help, and profile.
2. **Build sidebar**: the user's cross-project Build destinations.
3. **Project sidebar**: destinations inside the selected project.
4. **Context panel**: a split pane for record details without losing the originating list, board, dashboard, or relationship graph.

The server returns allowed destinations from entitlements and effective access. The client applies persona defaults and user ordering only to destinations the server allows.

## Global rail

| Item | Behavior |
|---|---|
| Organization switcher | Switches tenant; clears tenant-scoped caches, closes record panels, restores that tenant's last safe route |
| Home | Opens cross-module Home; mail and calendar remain Home-owned |
| Module switcher | Shows selected/enabled modules and an `Add modules` action for authorized admins |
| Search | Searches authorized records across enabled modules; results identify module and open in the owning surface |
| Create | Opens a command palette with contextual create actions; remembers recent safe actions |
| Notifications | Opens unified inbox with module and urgency filters |
| Help | Search help, shortcuts, onboarding checklist, support, status, and feedback |
| Profile | Personal settings, appearance, language/timezone, notification defaults, sessions, and sign out |

## Build sidebar structure

### Always visible

- Command Center
- My Work
- Inbox
- Projects

### Pinned by persona when relevant

- All Work

- Intake
- Goals
- Roadmap
- Portfolios
- Programs
- Approvals
- Managed Products
- Teams

### More

- Templates
- Forms
- Reports
- Releases
- Workload
- Clients
- Automations
- Integrations
- Access and settings

`More` is searchable, categorized, and shows recent tools. A user can pin an allowed destination. The initial sidebar contains at most eight destinations plus `More`.

## Persona defaults

Persona is a starting configuration, never a permission grant. Users may choose multiple work styles during onboarding; one is the primary default.

### Freelancer: software, design, video, consulting

**Primary sidebar**

1. Command Center
2. My Work
3. Inbox
4. Clients
5. Projects
6. Calendar shortcut to Home
7. Approvals
8. Files
9. More

**Default project sidebar**

- Overview
- Work
- Milestones
- Files
- Client Portal
- Approvals
- Time and Budget
- Updates
- More

**Why**: the freelancer must move from client request to deliverable, feedback, approval, time, and payment context with little setup.

### Product manager

**Primary sidebar**

1. Command Center
2. Inbox
3. My Work
4. Intake
5. Managed Products
6. Goals
7. Roadmap
8. Releases
9. More

**Default project sidebar**

- Overview
- Intake/Triage
- Issues
- Backlog
- Cycles
- Epics
- Releases
- Insights
- More

**Why**: evidence, prioritization, goals, delivery, and outcome measurement form one traceable path.

### Project manager

**Primary sidebar**

1. Command Center
2. Inbox
3. All Work
4. Projects
5. Portfolios
6. Programs
7. Approvals
8. Workload
9. More

**Default project sidebar**

- Overview
- Plan
- Issues
- Milestones
- Risks
- Change Requests
- Approvals
- Reports
- More

**Why**: commitments, dependencies, capacity, risks, changes, and stakeholder reporting remain visible.

### Engineer or delivery member

**Primary sidebar**

1. My Work
2. Inbox
3. Current Cycle
4. Projects
5. Releases
6. More

**Default project sidebar**

- Overview
- Issues
- Current Cycle
- Backlog
- Releases
- Wiki
- QA
- More

**Why**: the user reaches assigned work and technical context with minimal navigation.

### Content person

**Primary sidebar**

1. Command Center
2. My Work
3. Inbox
4. Content Calendar
5. Campaigns or Projects
6. Intake
7. Approvals
8. Assets
9. More

**Default project sidebar**

- Overview
- Briefs
- Content Pipeline
- Calendar
- Assets
- Review and Approval
- Performance
- More

These labels are a content template over Build entities: brief = intake/work item, content pipeline = configured workflow, assets = files, calendar = date view, review = approval.

### Executive or stakeholder

**Primary sidebar**

1. Command Center
2. Goals
3. Portfolios
4. Approvals
5. Reports
6. More

Default screens emphasize exceptions, confidence, decisions, spend, outcomes, and drill-down evidence.

### Client or external collaborator

External users do not receive the internal Build sidebar. The portal navigation is:

- Overview
- Deliverables
- Requests
- Approvals
- Files
- Updates
- Invoices and payments, when granted
- Help/contact

Each item is derived from an explicit client grant. Internal links are never rendered into portal HTML or notification payloads.

## Project sidebar groups

The sidebar uses collapsible semantic groups rather than a flat tool list.

| Group | Destinations |
|---|---|
| Summary | Overview, Updates, Feed |
| Plan | Roadmap, Backlog, Cycles, Epics, Modules, Milestones |
| Execute | Issues, Board/List/Table/Calendar/Timeline, My project work |
| Collaborate | Chat, Meetings, Wiki, Whiteboard, Files, Forms |
| Govern | Intake, Triage, Approvals, Decisions, Risks, Change Requests |
| Deliver | Releases, QA, Incidents, Client Portal |
| Measure | Reports, Workload, Time and Budget |
| Configure | Project settings |

The default persona pins from these groups. `More` exposes every allowed destination and supports keyboard search.

## Navigation customization

Users may:

- pin/unpin, reorder, and collapse destinations;
- choose compact or comfortable density;
- set a default Build landing page;
- hide allowed but unused tools from their own sidebar;
- reset to a persona template;
- keep separate preferences per organization;
- sync preferences across devices.

Users may not expose a denied destination, change module entitlements, or grant themselves access. Administrators may define organization defaults without overwriting personal choices unless a policy explicitly locks a required destination.

## Click behavior

| Origin | Target | Default behavior |
|---|---|---|
| Direct URL, search result, notification, email | Ticket or other primary record | Full page with stable URL |
| Board/list/table/calendar/timeline | Ticket | Right split pane; URL updates and is shareable |
| Ticket relationship | Related ticket | Nested replacement in the same split pane with back stack |
| Command Center widget | Record | Split pane if the widget needs retained context; full page for deep workflows |
| Mobile | Any record | Full-screen sheet/page with native back behavior |
| External portal | Granted record | Portal detail page; never internal page chrome |

Modifier-click opens a new browser tab. `Esc` closes the top panel. Browser Back moves through panel history before leaving the source page.

## Responsive rules

- Under 768 px, global and Build sidebars become one drawer; record panes become full screen.
- From 768–1199 px, use a compact global rail and collapsible Build sidebar.
- At 1200 px and above, allow persistent Build sidebar and a resizable detail pane.
- Preserve selected view, filters, scroll, and focused card when the detail pane closes.
- Every action remains keyboard accessible and has a 44 px minimum touch target on mobile.

## Navigation state contract

```ts
type BuildNavigationPreference = {
  organizationId: string;
  userId: string;
  personaTemplateId: string | null;
  landingRoute: string;
  pinnedItemIds: string[];
  hiddenItemIds: string[];
  collapsedGroupIds: string[];
  density: "compact" | "comfortable";
  version: number;
};
```

Updates require optimistic concurrency through `version`. Invalid or newly denied items are removed server-side. Preferences may be cached privately by `organizationId:userId:version` and invalidated on preference write, module entitlement change, membership change, or permission-version change.

## Navigation acceptance criteria

- A new user sees no more than nine Build destinations after onboarding.
- A user reaches assigned work in one click from the Build landing page.
- Every route in the Build manifest is reachable through permission-aware navigation or contextual action.
- Denied destinations do not appear and direct URLs fail closed.
- Switching organizations cannot reuse prior-tenant content, filters, counts, or record panels.
- Refresh, deep link, Back, forward, new tab, and mobile behavior preserve understandable navigation state.
- Reset restores the persona default without changing any permission.



## Exact destination authority

Every listed persona destination uses [routes and screen decisions](./routes-and-screen-decisions.md). Clients is the Planned /build/clients delivery index. Reports, Forms, Intake, Releases, Workload, Files and Automations without project context are registered All Work record-kind views; with project context they use the scoped route. Content aliases use configured work/file views. No alias introduces a duplicate record model or permission grant.

The four core items are Command Center, My Work, Inbox and Projects. Persona templates may order them; All Work is a pin or More item. Contextual Current Cycle resolves the selected team/project; no current cycle opens Cycles. Calendar work views remain inside Build; Home Calendar is the explicit meeting/event action. [Screen contracts](./screens/README.md) govern actual clicks and return behavior.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Persist per-user pinned, reordered, and collapsed navigation with a versioned actor/org scope; reject unavailable targets and restore a safe default on revocation.
- [ ] Implement click, modifier-click, refresh, Back/Forward, split-pane, and mobile drawer behavior without losing origin query, scroll anchor, or focus.
- [ ] Verify freelancer, product manager, project manager, engineer, content, executive, and external-client navigation with real role/module/project grants across two tenants; record denied deep-link and mobile evidence.

## Persona journey to requirement register

(BT-0bcfcffe79e2, added 2026-10-04)

Maps each primary persona to their critical Build journeys and the BLD requirement that covers each journey.

| Persona | Primary journey | BLD requirement |
|---|---|---|
| Freelancer / Sole trader | Personal task focus: open My Work, pick up highest-priority ticket, log time | BLD-008 (My Work), BLD-010 (Ticket detail), BLD-017 (Timesheets) |
| Freelancer / Sole trader | Client handoff: submit deliverables through portal, get client approval | BLD-005 (Portal grant), BLD-020 (Portal access) |
| Agency PM / Coordinator | Project overview: review project health, assign intake, track cycle progress | BLD-007 (Projects), BLD-009 (Inbox), BLD-014 (Command Center) |
| Agency PM / Coordinator | Client intake: review submitted requests, triage into backlog | BLD-015 (Triage), BLD-021 (Intake/public form) |
| Product manager | Discovery: capture evidence, create opportunity, score and prioritize | BLD-016 (Product chain) |
| Product manager | Roadmap planning: create roadmap items, link to goals, publish to stakeholders | BLD-019 (Roadmap) |
| Product manager | Outcome tracking: review release outcomes, close or reopen against goals | BLD-018 (Reports) |
| Project manager / Delivery lead | Cross-project view: All Work filtered by owner, cycle, or status | BLD-011 (All Work), BLD-012 (Cross-project filter) |
| Project manager / Delivery lead | Weekly planning: Command Center health overview, blocked items, capacity | BLD-014 (Command Center) |
| Software engineer | Daily work: inbox for assigned items, open ticket, work with sub-tasks and PR links | BLD-009 (Inbox), BLD-010 (Ticket detail) |
| Software engineer | Code review: check linked PR status, mark ticket ready for QA | BLD-010 (Ticket detail) |
| Content creator / Writer | Brief management: open assigned brief-type ticket, update status, attach asset | BLD-010 (Ticket detail), BLD-022 (Files) |
| Content creator / Writer | Review flow: submit for review, respond to comments, mark approved | BLD-010 (Ticket detail) |
| Executive / Stakeholder | Overview: Command Center summary, report drill-down | BLD-014 (Command Center), BLD-018 (Reports) |
| External client | Portal access: receive invite, view shared project status and milestones | BLD-005 (Portal grant), BLD-020 (Portal access) |
| External client | Feedback: submit intake request, track status of submitted items | BLD-021 (Intake/public form) |

Each journey row must have shipped feature evidence and a persona-journey test before any differentiation claim referencing that journey is promoted from "Planned" to "Current verified."
