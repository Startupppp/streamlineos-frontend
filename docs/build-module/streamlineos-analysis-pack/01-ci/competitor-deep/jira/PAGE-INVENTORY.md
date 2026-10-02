# Jira page inventory

**Status: SIGNED-IN and UI-verified.** Site: `https://pxc-cijira2026100.atlassian.net`

| Surface | URL / result | UI-verified notes |
|---|---|---|
| Your work / For you | `/jira/your-work` redirected to `/jira/for-you?tab=workedon` | Heading **For you** loaded successfully; lighter route worked. |
| Projects | Atlassian Home Projects entry; Jira sidebar exposes **Spaces** | The Jira work area was the CI Jira space; no separate project directory was needed for the filter walk. |
| Filters / issue list | `/issues/?jql=` | Heading **All work**; Filters sidebar expanded; 13 of 13 seeded work items visible. |
| Advanced issue search | `/issues/?jql=` | **Basic** and **JQL** radio modes visible. JQL mode shows query editor, Editor, Syntax help, Search, Clear filters, Save filter. |
| Dashboards | Jira sidebar **Dashboards** | Navigation item visible in authenticated sidebar. |
| Apps | Jira sidebar **Apps** | Navigation item visible; top bar also has Apps dropdown. |
| Other visible navigation | Sidebar **Recent**, **Starred**, **Plans**, **Spaces**; bottom **Assets**, **Teams**, **Goals** | Authenticated Jira shell inventory. |
| Space/board | `/jira/software/projects/KAN/boards/2` | Space heading **CI Jira**; Kanban board loaded. |

Evidence: `evidence/filters-basic-more-options.png`, `evidence/filters-jql-operators.png`, `evidence/filters-jql-functions.png`.

## Boards, backlog, and sprints

- **Boards — UI-VERIFIED:** `/jira/software/projects/KAN/boards/2` loaded the **CI Jira** Kanban board with To Do, In Progress, In Review, and Done columns; visible cards included KAN-1 Task 1 and KAN-2 Task 2. Board controls included search, Filter, Group, share, and automation. Evidence: `evidence/board-kanban.png`.
- **Backlog — not available in this free/team-managed space:** `/jira/software/projects/KAN/boards/2/backlog` redirected to the Jira 404 view ("The view does not exist in this board").
- **Sprints — UI-VERIFIED as gated/off:** Space settings > Features showed Sprints disabled with the message **"Requires a backlog"**. Estimation was also off; Standups in Jira was on. Evidence: `evidence/features-settings.png`.

## Summary, list, and development

- **Summary — UI-VERIFIED:** `/jira/software/projects/KAN/summary` showed a reports-promotion banner, Filter, and cards for completed, updated, created, and due-soon work; status overview and Epic progress sections were present. The Reports CTA existed but its `/boards/2/reports` destination resolved to the Jira 404 view in this space. Evidence: `evidence/summary.png`.
- **List — UI-VERIFIED:** `/jira/software/projects/KAN/list` showed a project-scoped work table with Search work, Filter, Group, sortable columns, inline assignee/reporter/priority/status/due-date affordances, and 3 of 3 project items. Evidence: `evidence/list.png`.
- **Development — UI-VERIFIED:** `/jira/software/projects/KAN/development` showed Beta Key metrics (completed work, pull-request cycle time, lead time, overdue, reopened, bugs, pull requests, vulnerabilities) and Related work tabs for Pull requests, Repositories, Vulnerabilities, Deployments, and Work suggestions. All displayed metrics were zero and no development provider data was present. Evidence: `evidence/development.png`.

## Roadmaps / Plans

- **Plans — UI-VERIFIED:** `/jira/plans` loaded a Plans directory with **No plans yet**, a Create plan button, and a Get Started with Plans guide link. No plan was created. This is a free-only observation; the surface is present but empty. Evidence: `evidence/plans.png`.

## Dashboards

- **Dashboards — UI-VERIFIED:** `/jira/dashboards` showed Search dashboards, Owner/Space/Group filters, Create dashboard, and a Default dashboard row with My organization viewers, Private editors, and 0 people starred by. Evidence: `evidence/dashboards.png`.

## Forms

- No Forms surface was visible in the authenticated CI Jira space. The project settings navigation showed Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, and Apps; Forms was not listed.

## Automations

- **Automation — UI-VERIFIED:** Space settings > Automation exposed Flows, Audit log, Templates, and Usage tabs, plus Global administration and Create flow. Templates advertised three starter flows (transition -> assign, complete children -> close parent, complete parent -> close children) and searchable/category-filtered templates. Evidence: `evidence/automation.png`.

## Releases / Versions and Components

- **Releases / Versions:** No Releases or Versions navigation was present in this team-managed space. Direct `/jira/software/projects/KAN/settings/versions` redirected back to Settings > Details.
- **Components:** No Components navigation was present. Direct `/jira/software/projects/KAN/settings/components` redirected back to Settings > Details.

## Apps / Marketplace chrome

- **Apps — UI-VERIFIED:** Sidebar Apps expanded to **Explore more apps**. `/jira/marketplace/discover` showed **Explore apps for Jira**, search, Pricing, Trust signals, Categories, Use cases, More filters, and "Showing over 1,000 apps". No app was installed. Evidence: `evidence/marketplace.png`.

## Project settings

- **Project settings — UI-VERIFIED:** `/jira/software/projects/KAN/settings/details` identified the CI Jira Software space and exposed Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, and Apps. Details showed Name `CI Jira`, Space key `KAN`, Category selector, and default assignee controls. No settings were changed. Evidence: `evidence/project-settings.png`.

## Goals

- **Goals — UI-VERIFIED:** The Jira sidebar linked to Atlassian Home Goals. The Goal directory showed 23 goals, All goals/My goals/Archived/More views, search by name, filters for Tag/Status/Owner/Team/Reporting line, and a Create your first goal CTA. Evidence: `evidence/goals.png`.

## Confluence / Docs

- **Docs — UI-VERIFIED:** `/jira/software/projects/KAN/pages` showed an empty integration promotion: "Manage your project content, all in one place" with Try Confluence now and Discover Confluence. No Confluence pages were connected in this free run. Evidence: `evidence/docs.png`.

## Free-only and gating notes

- No billing, payment, or paid-upgrade action was opened.
- Gating/upsell observed: Sprints is off and requires a backlog; Plans is empty; Docs is a Try Confluence promotion; Marketplace is an app catalog with commercial add-ons; the shell repeatedly exposed See plans.
- No explicit payment wall appeared during these surfaces. The Reports destination returned a Jira 404 rather than a paywall.
