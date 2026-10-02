# Jira Cloud feature notes

## Filters

**UI-VERIFIED** at `https://pxc-cijira2026100.atlassian.net/issues/?jql=`. No sample issues were needed because Jira provisioned 13 seeded work items.

### Basic search controls

Visible controls in Basic mode:

- `Search work` text search.
- `Space` filter.
- `Assignee` filter.
- `Type` filter.
- `Status` filter.
- `More filters` picker, plus `Clear filters` and `Save filter`.

The opened **More filters** picker visibly reported `10 of 41` and showed: **Affects versions, Agent Sessions, Attachment, Comment, Components, Created, Creator, Description, Development, Due date**. This is the visible slice; the UI indicates 41 total options.

### Advanced / JQL mode

- Toggle: `Basic` / `JQL`.
- Editable `JQL query` combobox with `Editor` button.
- `Syntax help` link opens Atlassian JQL help in a new tab.
- `Search`, `Clear filters`, and `Save filter` actions.
- Editor hint: **Enter to search**; **Shift+Enter to add a new line**.

Autocomplete was UI-verified:

- After `assignee = `: `EMPTY` and `currentUser()` were offered (along with user/team values).
- After `assignee = currentUser() `: `AND`, `OR`, and `ORDER BY` were offered.
- After `status `: `=`, `!=`, `IS`, `IS NOT`, `IN`, `NOT IN`, `WAS`, `WAS NOT`, `WAS IN`, `WAS NOT IN`, and `CHANGED` were offered.

### Saved/default filters

The Filters sidebar showed **Search work items** and an expanded **Default filters** group containing: **My open work items, Reported by me, All work items, Open work items, Done work items, Viewed recently, Created recently, Resolved recently, Updated recently**. A **View all filters** entry was also present. The search toolbar exposed **Save filter**.

### Result table

The work list showed sortable columns: Work, Assignee, Reporter, Priority, Status, Resolution, Created, Updated, Due date, plus **Configure columns**. The loaded result count was **13 of 13**.

Evidence: `evidence/filters-basic-more-options.png` (Basic picker), `evidence/filters-jql-functions.png` (EMPTY/currentUser autocomplete), `evidence/filters-jql-operators.png` (WAS/CHANGED and other operators).

## Boards

**UI-VERIFIED** at `/jira/software/projects/KAN/boards/2`. CI Jira provided a Kanban board with To Do, In Progress, In Review, and Done columns, visible work cards, search, Filter, Group, share, and Automation controls. Backlog was not available for this board. Evidence: `evidence/board-kanban.png`.

## Backlog and Sprints

Backlog was not available: `/jira/software/projects/KAN/boards/2/backlog` redirected to a 404 view. Space settings > Features showed Sprints disabled and explicitly **Requires a backlog**; Estimation was off and Standups in Jira was enabled. Evidence: `evidence/features-settings.png`.

## Summary, List, and Development

- **Summary — UI-VERIFIED:** KPI cards for completed/updated/created/due-soon work, status overview, Epic progress, Filter, and a Reports promotion. The Reports target returned 404 in this space. Evidence: `evidence/summary.png`.
- **List — UI-VERIFIED:** Project-scoped list with Search work, Filter, Group, sortable work columns, inline edits, and 3 of 3 results. Evidence: `evidence/list.png`.
- **Development — UI-VERIFIED:** Beta delivery metrics for cycle time/lead time/overdue/reopened/bugs/PRs/vulnerabilities plus Related work tabs for PRs, repositories, vulnerabilities, deployments, and work suggestions. Values were zero with no provider data. Evidence: `evidence/development.png`.

## Roadmaps / Plans

**UI-VERIFIED** at `/jira/plans`: Plans directory said **No plans yet** and offered Create plan plus a getting-started guide. No plan was created. Evidence: `evidence/plans.png`.

## Dashboards

**UI-VERIFIED** at `/jira/dashboards`: Search dashboards, Owner/Space/Group filters, Create dashboard, and a Default dashboard row (My organization viewers, Private editors) were visible. Evidence: `evidence/dashboards.png`.

## Forms

No Forms surface was present in the observed project settings navigation; the visible list was Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, and Apps.

## Automations

**UI-VERIFIED** in Space settings > Automation. Flows, Audit log, Templates, Usage, Global administration, and Create flow were visible. The Templates view included three starter flows and searchable/category-filtered templates. Evidence: `evidence/automation.png`.

## Releases / Versions and Components

No Releases/Versions or Components navigation was available in this team-managed space. Direct `/settings/versions` and `/settings/components` routes redirected to Settings > Details.

## Apps / Marketplace

**UI-VERIFIED** via Apps > Explore more apps. Marketplace showed over 1,000 apps with search and Pricing, Trust signals, Categories, Use cases, and More filters; no app was installed. Evidence: `evidence/marketplace.png`.

## Project settings

**UI-VERIFIED** at `/jira/software/projects/KAN/settings/details`. Space settings covered Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, and Apps. Details showed Name `CI Jira`, key `KAN`, Category, and Default assignee controls; nothing was changed. Evidence: `evidence/project-settings.png`.

## Goals

**UI-VERIFIED** through the Jira sidebar's Atlassian Home link. Goal directory showed 23 goals, All goals/My goals/Archived/More views, name search, Tag/Status/Owner/Team/Reporting line filters, and Create your first goal. Evidence: `evidence/goals.png`.

## Confluence / Docs

**UI-VERIFIED** at `/jira/software/projects/KAN/pages`. The empty state promoted Try Confluence now and Discover Confluence; no connected pages were available. Evidence: `evidence/docs.png`.

## Free-only notes

No payment or upgrade action was opened. Sprints was gated by a required backlog, Plans had no plan, Docs presented a Confluence upsell/promotion, and Marketplace exposed add-on catalog chrome. No explicit payment wall appeared.
