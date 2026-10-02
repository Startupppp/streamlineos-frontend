# Build gaps / validation targets

Based on the signed-in Jira walk and the UI-verified Filters surface:

- Provide a fast Basic/JQL toggle on the work list.
- Match the approachable Basic controls: text search, space/project, assignee, type, status, and an expandable More filters picker.
- Offer advanced-query autocomplete with boolean/order tokens (`AND`, `OR`, `ORDER BY`), null/current-user functions (`EMPTY`, `currentUser()`), and history/status operators including `WAS`, `WAS NOT`, `WAS IN`, `WAS NOT IN`, and `CHANGED`.
- Make syntax help, search execution, clear, and save-filter actions explicit in the query toolbar.
- Provide default personal filters (open, reported, recently viewed/created/updated/resolved) plus a View all filters destination.
- Include a sortable result table and configurable columns for work triage.
- Preserve a lightweight `/your-work` fallback that resolves to a usable personal work view.
- Make plan state transparent: this free-signup run had no payment or upgrade action, but the onboarding confirmation URL included a premium-edition parameter; StreamlineOS should clearly distinguish free availability from any trial/upgrade state.

## Non-filter surfaces — sellable BEHIND vs Build

Use these as productizable gaps only where StreamlineOS does not already match the observed Jira surface.

| Surface | Jira Cloud free UI-verified baseline | StreamlineOS sellable build / BEHIND signal |
|---|---|---|
| Boards | Kanban columns, cards, search, Filter, Group, share, Automation | **BEHIND if absent:** ship an opinionated board with fast triage, saved views, grouping, and safe status transitions. |
| Backlog / Sprints | This free/team-managed space had no backlog and Sprints was disabled with “Requires a backlog”. | **Build opportunity:** offer a coherent backlog-to-sprint flow without dead-end navigation; make gating explicit. |
| Summary / List | KPI cards plus a sortable project list with inline edits and 3-of-3 count. | **BEHIND if absent:** sell a single project cockpit with actionable KPIs, deep links, and list/board parity. |
| Plans / Roadmaps | Plans directory existed but was empty (“No plans yet”) with Create plan. | **Build opportunity:** lightweight free roadmap with clear empty state; reserve advanced capacity planning for paid tiers. |
| Dashboards | Search, Owner/Space/Group filters, Create dashboard, default-dashboard sharing metadata. | **BEHIND if absent:** provide composable dashboards with permission-safe sharing and template widgets. |
| Automation | Flows/Audit log/Templates/Usage, starter recipes, Create flow. | **BEHIND if absent:** add no-code trigger/action rules, templates, auditability, and usage limits. |
| Development | Beta delivery metrics and related-work tabs for PRs/repos/vulnerabilities/deployments. | **Build opportunity:** make integrations optional, useful at zero data, and transparent about missing providers. |
| Docs / Confluence | Docs tab was an empty Confluence connection promotion, not native content. | **Sellable wedge:** native project docs/decision log without requiring a second product; make external sync optional. |
| Goals | External Goals directory with 23 goals, search, ownership/status/team filters. | **BEHIND if absent:** connect goals to work/KPIs with traceability; keep a small free goal directory. |
| Apps / Marketplace | Marketplace chrome exposed over 1,000 apps and filters for pricing, trust, category, use case. | **Build opportunity:** curated integrations catalog with clear free/paid labels and install governance. |
| Settings / governance | Space settings covered access, fields, work types, features, filters, timeline, toolchain, apps. | **BEHIND if absent:** centralize project governance and make capability gates discoverable before setup. |
| Versions / Components / Forms | Not present in this team-managed free space; direct routes returned to Details. | **Differentiator:** provide optional lightweight releases, components, and intake forms without forcing an enterprise plan. |

### Free-tier and paywall positioning

No payment wall was opened in this walk. Visible monetization/gating signals were See plans, Confluence promotion, commercial Marketplace inventory, empty Plans, and Sprints requiring a backlog. StreamlineOS can win by making the free boundary explicit and keeping the core board/list/summary/automation loop usable without upgrade surprises.
