# Build gaps vs ClickUp — Filters walk

| # | Topic | ClickUp UI-verified | Build implication | Label |
| --- | --- | --- | --- | --- |
| 1 | Filter field breadth | 26 fields surfaced, including status, tags, dates, people, dependency, duration, location/list, recurring, effort/time, sprint points, task text and description | Provide a broad typed filter registry, not only status/tags | UI-VERIFIED |
| 2 | Operator grammar | `Is`, `Is not`, `Is set`, `Is not set`; status and comment-specific predicates also visible | Model operators separately from value pickers | UI-VERIFIED |
| 3 | Assignee shortcuts | `Me`, distinct `Me Mode`, Unassigned, users and Agents | Support current-user and current-user-mode semantics | UI-VERIFIED |
| 4 | Boolean composition | Sibling `AND` / `OR`, nested groups, per-clause clear, global clear | Add a filter expression tree with nested groups | UI-VERIFIED |
| 5 | Saved filters | Empty-state menu says No saved filters yet; Save new filter is available | Add saved-filter persistence and apply-to-view affordance | UI-VERIFIED |
| 6 | Cross-view consistency | List, Board and Table share filter grammar; each keeps view-specific grouping/grid chrome | Keep filter state portable while preserving view settings | UI-VERIFIED |

No paid feature was opened. No tasks were edited, no filter was saved, and no upgrade action was used.

## Build gaps vs StreamlineOS Build — beyond Filters

These are concrete opportunities for a freelancer/PM-first product, grounded in the free-only UI walk.

| # | ClickUp observation (UI-VERIFIED) | BEHIND gap / sellable StreamlineOS Build opportunity |
|---:|---|---|
| 1 | Core work is spread across Home/Inbox, Planner, Teams, Whiteboards, Docs, Dashboards, Forms, Time, Goals and a More menu. | **Unified freelancer cockpit:** show client, project, next actions, schedule, docs, time and outcomes on one compact home; fewer hub switches and less navigation tax for solo operators. |
| 2 | Planner asks the user to connect Google Calendar or Outlook before calendar management; automatic time blocking and meeting notes are presented as feature cards. | **Self-contained planning:** provide a useful task calendar, time blocks and meeting-note capture without requiring external calendar OAuth; add optional sync later. |
| 3 | Workload Capacity is only a choice in the Project view chooser and was not visible as a ready-to-use solo capacity view. | **Freelancer capacity and profitability:** ship a default weekly capacity view with client/project lanes, billable vs non-billable time, deadlines and overload warnings. |
| 4 | Automations are split between AI Fields and Other Automations; several cards were disabled/blank and creation is a separate flow. | **Predictable no-code automation:** one trigger → condition → action builder with plain-language previews, undo, run history and a generous free quota for routine freelancer workflows. |
| 5 | Template Center is a separate search/filter experience; workspace templates were empty during the walk and only Task type was enabled in the task context. | **Ready-to-sell starter kits:** include immediately usable freelancer templates (client onboarding, proposal, sprint, retainer, invoice follow-up) with editable defaults and one-click instantiation. |
| 6 | Docs and Whiteboards are separate hubs with their own empty/favorites/recents states. | **Linked project brief:** let a brief, whiteboard, decisions, tasks and deliverables live in one project context with backlinks and automatic action-item extraction. |
| 7 | Forms opened to “No Forms found” with New Form as the next step; no intake-to-project mapping was visible in the empty state. | **Client intake that works on day one:** public free form mapped directly to a client/project template, with consent, file capture and automatic triage. |
| 8 | Dashboards offer strong templates, but Time Tracking and Project Management were marked Business. | **Free-plan analytics:** keep core freelancer metrics—pipeline, due work, hours, margin and utilization—available without a Business badge or upgrade pressure. |
| 9 | Time tracking opens an empty weekly timesheet with separate entry sources and approvals. | **Low-friction billing clock:** start/stop or manual time directly from a task, tag client and billable status, and produce a client-ready weekly summary without navigating a separate hub. |
| 10 | Goals are an empty “Set a Goal” landing state with generic measurable-target copy. | **Outcome-to-delivery linkage:** tie a goal to revenue, client outcomes and project milestones, then show progress from existing tasks and tracked time rather than requiring separate target setup. |
| 11 | Inbox has useful tabs but the empty state is primarily collaboration/invite oriented. | **Actionable client inbox:** consolidate mentions, approvals, client replies, overdue risks and follow-ups with due dates and one-click snooze/convert-to-task actions. |
| 12 | View chooser is broad (List, Gantt, Calendar, Board, Table, Workload, embeds, etc.) but many options are one menu away. | **Opinionated defaults:** ship a small freelancer view set pinned by default—Today, Client pipeline, Delivery board, Calendar/capacity and Time/margin—while preserving advanced views for power users. |

No paid upgrade, task creation, form creation, goal creation, automation creation, time logging, calendar connection, or persistent view mutation was performed.
