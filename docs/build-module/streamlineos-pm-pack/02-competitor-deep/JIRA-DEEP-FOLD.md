# Jira deep fold — PM lane
**Walk:** 2026-10-01 (IST) · signed-in Jira Cloud free-signup path
**Scope:** Free-only, read-only UI inspection; no issue creation, plan creation, app installation, settings change, payment, or upgrade action.
**CI source:** `../../streamlineos-analysis-pack/01-ci/competitor-deep/jira/FEATURES.md`, `BUILD-GAPS.md`, `PAGE-INVENTORY.md`, `ACCOUNT.md`, `WALK-NOTES.json`
**Site:** `https://pxc-cijira2026100.atlassian.net` · space/project: **CI Jira**

## Surfaces UI-VERIFIED

| Surface | Walk result | Evidence / route |
| --- | --- | --- |
| Filters / work search | Basic + JQL modes; More filters showed 10 of 41; Affects versions was visible; JQL autocomplete, defaults, Save filter, sortable result table, and Configure columns | `/issues/?jql=` · `filters-basic-more-options.png`, `filters-jql-functions.png`, `filters-jql-operators.png` |
| Board | Kanban with To Do, In Progress, In Review, Done; Search, Filter, Group, share, Automation | `/jira/software/projects/KAN/boards/2` · `board-kanban.png` |
| Summary | KPI cards, status overview, Epic progress, Filter, and Reports promotion | `/jira/software/projects/KAN/summary` · `summary.png` |
| List | Project-scoped searchable/filterable list, grouping, sortable columns, inline edits; 3 of 3 results | `/jira/software/projects/KAN/list` · `list.png` |
| Development | Beta delivery metrics and related-work tabs; values were zero with no provider data | `/jira/software/projects/KAN/development` · `development.png` |
| Plans / Roadmaps | Directory loaded with **No plans yet**, Create plan, and a getting-started guide; no plan was created | `/jira/plans` · `plans.png` |
| Dashboards | Search, Owner/Space/Group filters, Create dashboard, Default dashboard row with sharing metadata | `/jira/dashboards` · `dashboards.png` |
| Automation | Flows, Audit log, Templates, Usage, Create flow, and starter templates | Space settings > Automation · `automation.png` |
| Apps / Marketplace | Explore apps, search, pricing/trust/category/use-case filters, over 1,000 apps; no app installed | `/jira/marketplace/discover` · `marketplace.png` |
| Project settings | Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, Apps | `/jira/software/projects/KAN/settings/details` · `project-settings.png` |
| Goals | External Atlassian Goals directory with 23 goals, search, ownership/status/team filters | Atlassian Home Goals · `goals.png` |
| For you / personal work | `/jira/your-work` redirected to a working For you view | `PAGE-INVENTORY.md` |

## Honesty locks — do not flatten route outcomes into feature claims

- **Plans is an empty shell:** `/jira/plans` exposed a directory and Create plan, but showed **No plans yet**. This verifies navigation chrome and an empty state, not substantive planning, capacity, or programme semantics.
- **Releases/Versions + Components are not present in this free team-managed space:** no navigation was exposed and direct Versions/Components routes bounced to Settings > Details. Do not claim Jira free showed a full Releases surface.
- **Affects versions is still UI-VERIFIED:** it appeared in the visible More filters slice (10 of 41). This is proof of a release-adjacent **filter**, not proof of a Releases/Versions management page.
- **Backlog / Sprints are constrained:** the Backlog route returned Jira 404 (“The view does not exist in this board”); Sprints was disabled in Features with **Requires a backlog**. Estimation was off; Standups in Jira was on.
- **Forms were not in settings:** the observed project-settings navigation had no Forms item. Do not infer Forms parity or absence across every Jira plan from this single space.
- **Reports did not resolve:** the Summary Reports promotion linked to a 404 in this space. Treat the promotion as chrome plus a failed route, not a verified Reports surface.
- **Confluence Docs was an empty upsell/promotion:** the Docs page offered Try Confluence now and Discover Confluence; no connected pages were available. It was not native Jira documentation.
- **No payment was opened:** no billing, upgrade, app installation, plan creation, or paid action occurred. The onboarding confirmation carried an `edition=premium` parameter, but that is not evidence that a paid plan was selected.

## Implications for Build Completeness Next

| Build item | Jira evidence boundary | PM implication |
| --- | --- | --- |
| **UX-025 Release membership** | Releases/Versions management was unavailable, while **Affects versions** was visible in Filters More | Compete on **membership truth**: make it unambiguous which issues belong to a release and what ships. Keep Affects versions as UI-VERIFIED competitor proof for the **Release filter** only. Do not frame the work as matching a Releases surface that Jira free/team-managed did not show. |
| **UX-028 Program ↔ project membership** | Jira Plans was only an empty directory shell | Keep the Program target about real project membership and rollup truth. Do not over-desperation-rank it because Jira appears to have Plans; the observed Plans shell is not proof of a substantive programme surface. |
| Filter completeness | Jira Basic search was approachable; JQL exposed a much larger language surface and defaults/save affordances | Adopt clear Basic controls, release filtering, saved/default lenses, and honest empty states. Avoid chasing full JQL as a Completeness prerequisite. |
| Delivery loop | Board/List/Summary were usable; Backlog/Sprints and Reports had route/gating limits | Build a coherent board/list/summary loop with explicit gates and no dead-end navigation; do not count Jira's broken or gated routes as parity requirements. |
| Docs / intake | Docs promoted Confluence; Forms was not present in settings | Native project docs and structured intake remain differentiated Build opportunities, but keep competitor wording tiered: promotion/route observation, not universal absence or paid-plan claim. |

### Filter proof to retain

The Jira walk remains useful competitor proof for the filter wave: Basic `Search work`, Space, Assignee, Type, Status, More filters; the visible **Affects versions** option; JQL `EMPTY`, `currentUser()`, `AND`, `OR`, `ORDER BY`, and status operators including `WAS` and `CHANGED`; default personal filters; Save filter; and a sortable results table. These observations do not require a claim that Build should reproduce Jira's full JQL language or a Releases page.

## Freeze guardrail

This Jira fold changes no Freeze ordering and adds no Freeze work. Keep the implementation order exactly:

**PM-011 → PM-002 → PM-001**

Jira's empty Plans, unavailable Releases/Versions, 404 Reports/Backlog, and gated Sprints are Completeness/positioning evidence only. Do not swell Freeze or chase JSM/JQL feature count.

## Evidence and confidence

This is a signed-in UI walk, not a universal Jira product survey. Free/team-managed scope and route outcomes matter. Cite the CI Jira pack for concrete UI claims; use **UI-VERIFIED** only for the surfaces and controls actually observed above.
