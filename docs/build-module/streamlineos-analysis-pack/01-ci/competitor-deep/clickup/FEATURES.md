# ClickUp — Features / UX (evidence-backed)

**Scope:** Signed-in Vaivammcapital workspace, Project 1. Free-only; no upgrade used.

## Filters — UI-VERIFIED

**Entry point:** Project 1 → List → funnel/Filter control. The same panel was opened on Board and Table.

### Field picker (all fields surfaced by the UI)
The picker showed these fields (the picker is scrollable/virtualized; the complete observed set is listed):

- Status
- Tags
- Due date
- Priority
- Assignee
- Archived
- Assigned comment
- Created by
- Date closed
- Date created
- Date updated
- Date done
- Dependency
- Duration
- Location/List
- Recurring
- Start date
- Status is closed
- Time estimate
- Time tracked
- Sprint points
- Follower
- Task Type
- Last status change
- Task Name
- Task Description

No custom-field entry was visible in this small workspace.

### Operators / value controls
Operator menus were UI-opened, not inferred from documentation:

| Field/control family | UI-verified operator/value affordances |
| --- | --- |
| Status | `Is`, `Is not`; value is `Select option` |
| Tags | `Is`, `Is not`, `Is set`, `Is not set`; value is `Select tags` |
| Due date | `Is`, `Is not`, `Is set`, `Is not set`; value is `Select option` |
| Priority | default operator `Is`; value control `Select an option` / `Change priority` |
| Assignee | default operator `Is`; value control `Select assignee` |
| Assigned comment | direct predicate `Has assigned comments` (comment-specific, no value picker) |
| Other surfaced fields | use the same per-field operator/value row; their picker entry was verified. No value was applied or persisted during the free-only walk. |

The common operator family visible in the expanded menus is `Is` / `Is not` plus `Is set` / `Is not set` where the field supports presence testing. Dates, people, tags, priority and status expose a separate value picker after the operator.

### Assignee / Me Mode
Opening `Assignee → Select assignee` showed: `Unassigned`, `Me`, `Me Mode`, the signed-in user, `Agents`, `Onboarding Assistant`, and `Create Agent`. `Me` is a selectable person shortcut; `Me Mode` is a distinct menu entry. Evidence: `filters-assignee-me-mode.png`.

### AND / OR and nesting
- Multiple clauses render under `Where`.
- A visible `AND / OR` control joins sibling clauses; the captured List and Board states defaulted to `AND`.
- Each clause has `Add nested filter`, enabling nested groups.
- `Add filter` creates another sibling clause.
- Each clause has `Clear filter`; `Clear all` removes the current set.

Evidence: `filters-list-and-or-tags-operators.png` and `filters-board.png`.

### Saved filters
`Saved filters` opened a menu stating **No saved filters yet**, with explanatory copy and `Save new filter`. No saved filter was created or changed. Evidence: `filters-saved-none.png`.

### List vs Board vs Table
- **List:** Group Status, Subtasks Collapsed, Columns control; filter panel overlays task rows.
- **Board:** Group Status, Subtasks control, Sort control; same filter field/operator panel overlays status columns/cards.
- **Table:** Group None, Subtasks Shown, grid rows and Add a Column; same filter field picker/panel overlays the grid.

Evidence: `filters-list-field-menu.png`, `filters-board.png`, `filters-table-field-menu.png`.

## Views — UI-VERIFIED

**Entry point:** Project 1 → current List header → `View / Add View` chooser. No view was created, pinned, or made private.

- Popular view choices: List, Gantt Chart, Calendar, Doc Wiki, Board Kanban, Create with AI, Artifact, and Dashboard Report.
- Additional choices: Table, Whiteboard, Timeline, Activity Report, Workload Capacity, Mind Map, Team, and Map.
- Embed/integration choices were also visible: Any website, Google Sheets, Google Docs, Google Calendar, Google Maps, YouTube, and Figma.
- The chooser exposes `Private view` and `Pin view` checkboxes. The current view remained List.

Evidence: `evidence/views.png`.

## Workload/Planner — UI-VERIFIED

**Entry point:** Left rail → Planner (`/90161684021/calendar`).

- Planner landing state says “You, but better organized” and offers Google Calendar and Microsoft Outlook connection buttons.
- The visible feature cards describe joining the next meeting, automatic meeting-note transcription/summaries/action items, dragging tasks into the calendar to block time, team schedules/shared free time, and AI-suggested automatic time blocking.
- `Workload Capacity` was also visibly offered in the Project 1 view chooser. It was not opened or added, so no capacity chart is claimed UI-verified.
- No calendar was connected and no task was time-blocked.

Evidence: `evidence/planner.png`, `evidence/views.png`.

## Automations — UI-VERIFIED

**Entry point:** Project 1 → `Automate` menu.

- The menu is scoped to tasks in Project 1 and offers AI Fields: `Create AI Field`, `Summary`, and `Progress Updates`; additional AI-field cards were present but disabled/blank.
- Other Automations offers `Create Automation`, `Auto assign`, `Auto follow`, additional disabled/blank cards, and `Manage automations`.
- No automation, AI field, trigger, or action was created or enabled.

Evidence: `evidence/automations.png`.

## Templates — UI-VERIFIED

**Entry point:** Project 1 → Create task (draft) → `Templates` → `Use Template`. The empty draft was closed without creating a task.

- The task Templates menu offered `Use Template`, `Create instantly from template`, `Save as template`, and `Update existing template`.
- Template Center exposed Featured, Workspace Templates, and ClickUp Templates; search; Use Cases, Tags, and Created by filters; and complexity filters Beginner, Intermediate, Advanced.
- Template types were shown, with Task selected and the other types disabled in this task context: Super Agent, Space, Folder, List, Doc, View, and Whiteboard.
- The workspace template area showed no named template during this walk. No template was applied or saved.

Evidence: `evidence/templates.png`.

## Docs/Whiteboards — UI-VERIFIED

**Docs entry point:** More → Docs (`/90161684021/docs`). **Whiteboards entry point:** left rail → Whiteboards (`/90161684021/hubs/whiteboards`).

- Docs sidebar: All Docs, My Docs, Shared with me, Private, Meeting Notes, and Archived. The landing page offers Import, New Doc, an AI-style “Describe what you want to create…” prompt, starter cards (UI Guidelines, Review Checklist, Product Decisions, Project Brief), search, filters, and sort. A Team Docs row was present.
- Whiteboards sidebar: All Whiteboards and My Whiteboards, with Favorites and Recents. The landing page offers New Whiteboard, Organizational Chart, Action Plan, and Customer Journey Map templates, plus Search, Sort, List view, and Gallery view. An existing recent board was visible.
- No document or whiteboard was created or edited.

Evidence: `evidence/docs.png`, `evidence/whiteboards.png`.

## Inbox — UI-VERIFIED

**Entry point:** Home rail → Inbox (`/90161684021/inbox?tab=primary`).

- Tabs: Primary, Other, Later, and Cleared.
- Controls: Filter, Customize Inbox, and Clear all (disabled in the empty state).
- Home sidebar sections visible: Inbox, Replies, Assigned Comments, Skills, Artifacts, Meetings, My Tasks, and More, followed by Spaces, AI Chats, Super Agents, Channels, and Direct Messages.
- Empty state says “Looking to collaborate?” and offers Invite people. No inbox item was changed.

Evidence: `evidence/inbox-home.png`.

## Home — UI-VERIFIED

- The left rail’s Home entry resolves to the Inbox surface in this workspace; the main heading is Home while the selected content is Inbox.
- The Home shell exposes the workspace switcher, global Search, Create task, Record a Clip, Talk to Text, and the Home sidebar taxonomy listed above.
- No separate Home dashboard beyond the Inbox surface was exposed in this walk.

Evidence: `evidence/inbox-home.png`.

## Dashboards — UI-VERIFIED

**Entry point:** More → Dashboards (`/90161684021/hubs/dashboards`).

- Sidebar: All Dashboards, My Dashboards, Shared with me, and Private; New Dashboard and Favorites were visible.
- Template choices: Simple Dashboard (manage/prioritize tasks), AI Team Center (team activity with AI), Time Tracking (marked Business), Project Management (marked Business), AI Personal Center, and Start from scratch.
- No dashboard was created. Business badges were observed only; no upgrade or paid action was used.

Evidence: `evidence/dashboards.png`.

## Forms — UI-VERIFIED

**Entry point:** More → Forms (`/90161684021/forms`).

- Sidebar: All Forms and My Forms, with Favorites.
- Landing page offers New Form, an AI-style creation prompt, Sort, and Search; the table is empty with “No Forms found”.
- No form was created or edited.

Evidence: `evidence/forms.png`.

## Time tracking — UI-VERIFIED

**Entry point:** More → Timesheets (`/90161684021/time`).

- Tabs: My timesheet, All timesheets, and Approvals; Settings was visible.
- The week selector showed Sep 27–Oct 3, with Timesheet and Time entries modes.
- Empty state offers adding entries from All assigned tasks, Last week’s tasks, Individual tasks, or Track time. Settings exposes Default Work Schedule and Edit.
- No time entry was created or tracked.

Evidence: `evidence/time-tracking.png`.

## Goals — UI-VERIFIED

**Entry point:** More → Goals (`/90161684021/goals`).

- Empty state says “Make your goals a reality” and describes creating Goals, breaking them into measurable targets, and tracking progress in real time.
- `Set a Goal` and `Learn more` were visible. No goal or target was created.

Evidence: `evidence/goals.png`.
