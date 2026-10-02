# Linear — Features / UX (evidence-backed)

**Scope:** Signed-in Tarunchintakunta workspace, team TAR, UI walked on 2026-10-01 IST. Free-only; UI inspection only.

## Active issues — UI-VERIFIED

- Active issues page exposes **Active**, **Backlog**, and **All issues** tabs.
- The filter funnel opens a searchable field menu.
- Four starter issues were visible: TAR-1, TAR-4, TAR-2, TAR-3.

## Filters — UI-VERIFIED

### Field menu

The Add filter menu visibly exposes:

`AI filter`, `Advanced filter`, `Status`, `Assignee`, `Agent`, `Agent Session`, `Creator`, `Priority`, `Labels`, `Relations`, `Suggested label`, `Dates`, `Project`, `Project properties`, `Subscribers`, `Auto-closed`, `Content`, `Links`, and `Template`.

AI filter opens a searchable prompt menu with suggestions `assigned to me`, `completed in the last month`, and `due in the next 2 weeks`; no paid action was taken.

Evidence: `evidence/filters-field-menu.png`, `evidence/filters-ai-suggestions.png`.

### Field values and visible operators

| Field | UI-verified values / next step | Operator behavior visible in UI |
| --- | --- | --- |
| Status | Backlog; Todo; In Progress; Done; Canceled; Duplicate | Checklist/value selector; no separate operator label shown |
| Assignee | No assignee; Current user; Application; SK; Soul King | Checklist/value selector |
| Agent | No agent; Any agent | Checklist/value selector |
| Agent Session | Active; Error; Dismissed; Merged | Checklist/value selector |
| Creator | Current user; Application; SK; Soul King; Linear; Agent | Checklist/value selector |
| Priority | No priority; Urgent; High; Medium; Low | Checklist/value selector |
| Labels | No labels; Bug; Feature; Improvement | Checklist/value selector |
| Suggested label | Bug; Feature; Improvement | Checklist/value selector |
| Relations | Parent issues; Sub-issues; Blocked issues; Blocking issues; Recurring issues; Issues with relations; Duplicates | Relation predicates; Recurring issues has a further submenu indicator |
| Dates | Due date; Created date; Updated date; Started date; Completed date; Auto-closed date; Triaged date; Time in current status | Date subfield then preset/custom predicate |
| Project | No project (no project records existed in this free workspace) | Checklist/value selector |
| Project properties | Project status; Project priority; Project labels; Project lead; Milestone name | Each opens a further property/value submenu |
| Subscribers | Current user; SK; Soul King; Linear; Agent | Checklist/value selector |
| Auto-closed | Direct leaf filter; no submenu/operator picker was shown | Direct boolean/date predicate; selecting it immediately adds a filter |
| Content | `Filter by content…` | Text search input |
| Links | `No matching options` in this workspace | Empty value state observed |
| Template | No template | Checklist/value selector |

Counts such as `4 issues` appear beside some empty/default values and are result counts, not separate fields.

### Dates

The Dates submenu exposes: Due date, Created date, Updated date, Started date, Completed date, Auto-closed date, Triaged date, and Time in current status. Due date quick choices visibly include Overdue, 1 day from now, 3 days from now, 1 week from now, 1 month from now, 3 months from now, Custom date or timeframe…, and No due date.

Custom date/timeframe visibly uses operator **in**, a free-form input (example placeholder `Try: May 2027, Q4, 05/20/2027`), unit choices Day / Month / Quarter / Half-year / Year, year-quarter choices, and Cancel / Apply.

Evidence: `evidence/filters-date-custom.png`.

### Advanced AND/OR and nested groups

- Selecting **Advanced filter** opens a builder with **+ Filter**.
- The builder offers **Add filter group** plus the same field menu.
- A group operator is a toggle; the UI visibly switches between **or** and **and**.
- Adding a filter group creates another clause joined by the selected operator.
- Adding a filter group from inside a clause creates a nested group; nested groups have their own independent `and`/`or` toggle and delete control.
- Empty advanced builder and both flat AND and nested group states were visibly verified.

Evidence: `evidence/filters-advanced-empty.png`, `evidence/filters-advanced-and.png`, `evidence/filters-advanced-nested.png`.

### Filter UX

- Searchable menus show `Filter…` / `Add Filter…` search boxes.
- Multi-value fields use checkboxes/value rows.
- Active filters expose an add-another-filter control and a clear-all control.

Evidence: `evidence/filters-active.png`, `evidence/filters-field-menu.png`.

## Custom Views — UI-VERIFIED

- Team Views is reachable at `/tarunchintakunta/team/TAR/views/issues`.
- The list was empty in this workspace and showed Issues / Projects tabs, a **Create new view** action, and a Documentation link.
- The new-view builder exposes name, optional description, Save to Tarunchintakunta, Cancel, and Create view.
- The builder was opened for inspection and cancelled; no view was created or shared.

Evidence: `evidence/custom-views-empty.png`, `evidence/custom-view-builder.png`.

## Projects — UI-VERIFIED

- Workspace Projects is reachable at `/tarunchintakunta/projects/all`.
- The workspace was empty and showed **All projects**, **New project**, **Create new project**, and **Documentation**.
- No project was created. A team Overview also links to Projects.

Evidence: `evidence/projects.png`, `evidence/team-overview.png`.

## Cycles — UI-VERIFIED

- `/tarunchintakunta/team/TAR/cycles` is a dedicated team Cycles route.
- The UI explicitly states: **This team has no cycles.**
- No cycle creation or settings mutation was attempted.

Evidence: `evidence/cycles.png`.

## Initiatives — UI-VERIFIED

- Workspace settings exposes an Initiatives feature page.
- **Enable Initiatives** is visibly off and described as visible to all non-guest workspace members.
- Initiative updates and schedules are presented but inactive while the feature is disabled.
- This is a feature-availability state, not an enabled initiative record.

Evidence: `evidence/initiatives.png`.

## Triage — UI-VERIFIED route outcome

- The direct team Triage route probe (`/team/TAR/triage`) redirected to All issues (`/team/TAR/all`).
- All issues showed Active / Backlog / All issues tabs and the four starter issues; no separate Triage queue or triage controls were exposed in this walk.

Evidence: `evidence/triage-redirect-all-issues.png`.

## Inbox — UI-VERIFIED

- Workspace Inbox is reachable at `/tarunchintakunta/inbox`.
- It showed one unread notification, a notification list/detail split, and an empty detail illustration until a notification is selected.

Evidence: `evidence/inbox.png`.

## My Issues — UI-VERIFIED

- `/tarunchintakunta/my-issues/assigned` exposes Assigned, Created, Subscribed, and Activity tabs.
- Assigned was empty in this workspace and offered Create new issue.

Evidence: `evidence/my-issues.png`.

## Views / Custom Views — UI-VERIFIED

- Workspace Views (`/tarunchintakunta/views`) exposes Issues and Projects tabs, New view, and an empty-state explanation for custom views.
- Team Views and the new-view builder remain documented in the earlier Filters walk; no view was saved or shared.

Evidence: `evidence/views.png`, `evidence/custom-views-empty.png`, `evidence/custom-view-builder.png`.

## Roadmap — UI-VERIFIED route outcome

- `/tarunchintakunta/team/TAR/roadmap` rendered Not found.
- `/tarunchintakunta/roadmap` redirected to workspace Projects rather than exposing a dedicated roadmap page.
- No roadmap artifact or roadmap-specific controls were visible in this workspace.

Evidence: `evidence/not-found-insights-roadmap.png`, `evidence/projects.png`.

## Insights / Dashboards — UI-VERIFIED route outcome

- `/tarunchintakunta/insights` rendered Not found.
- No native Insights or Dashboards surface was exposed in the signed-in navigation.
- The Integrations catalog does list analytics integrations, including Google Sheets and other dashboard/reporting tools; these are add-ons, not a native Insights page.

Evidence: `evidence/not-found-insights-roadmap.png`, `evidence/integrations-catalog.png`.

## Docs / Asks — UI-VERIFIED

- Team Documents (`/team/TAR/documents`) is a free, empty document space with New document and Create document.
- Team Overview provides Team resources with add documents/links and section affordances.
- Asks settings describes structured intake from Slack or email but explicitly states availability on Business or Enterprise plans; only the Start free trial CTA was visible.

Evidence: `evidence/team-documents.png`, `evidence/team-overview.png`, `evidence/asks.png`.

## Automations / SLA — UI-VERIFIED

- Integrations catalog includes an **Automations** category with entries such as Zapier, Create issues via email (Pre-installed), Jira, Raycast, Fivetran, Fillout, and Jotform.
- SLA settings describes automatic deadlines and automation rules, but explicitly says SLAs are available on Business and Enterprise; Add rule was disabled and only Start free trial was offered.
- No paid CTA was activated.

Evidence: `evidence/integrations-catalog.png`, `evidence/slas.png`.

## Integrations / GitHub — UI-VERIFIED

- The settings catalog is searchable and categorized across Essentials, Agents, AI clients, Engineering, Automations, Analytics, and more.
- GitHub has a dedicated integration detail page describing PR workflows, review in Linear, issue sync, and codebase understanding with Linear Agent.
- An Enable button is visible; it was not clicked.

Evidence: `evidence/integrations-catalog.png`, `evidence/github-settings.png`.

## Templates — UI-VERIFIED

- Issue Templates settings is reachable and shows **No issue templates** plus New template.
- Project Templates is also exposed in the settings navigation; no template was created.

Evidence: `evidence/issue-templates.png`.

## Agent — UI-VERIFIED

- `/tarunchintakunta/agent` opens a New chat surface with Ask Linear, a Skills selector, and examples for creating a project, researching a topic, and setting up a team.
- AI & Agents settings shows Linear Agent as Enabled and Usage at `$0.00 remaining`.
- Coding sessions are labeled Available on Basic; Code Intelligence is labeled Available on Business; no paid action was taken.

Evidence: `evidence/agent.png`, `evidence/ai-agents.png`.
