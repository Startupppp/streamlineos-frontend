# Build Feature — Component Recon (06-build-components.md)

> Read-only reconnaissance. No files modified. All claims cite file:line.
> Scope: `frontend/features/build/**` component files.
> Date: 2026-07-31

---

## 1. Component Inventory by Sub-feature

Total: **290 TSX** + **53 TS** files, ~65k LOC (TSX only). 75 files exceed 300 LOC; 20 exceed the 500-line hard cap.

### ai/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| AiAssistantPage | ai/ai-assistant-page.tsx:1 | ~180 | AI assistant landing page |
| AiChatPanel | ai/ai-chat-panel.tsx:1 | 389 | Inline AI chat side panel |
| AiToolsRail | ai/ai-tools-rail.tsx:1 | ~120 | Toolbar icons for AI actions |
| TicketDetailAi | ai/ticket-detail-ai.tsx:1 | 701 | AI actions on ticket detail (popover-driven) |
| CreateTicketAiMenu | ai/create-ticket-ai-menu.tsx:1 | ~170 | AI-assisted ticket creation |
| ProjectAiMenu | ai/project-ai-menu.tsx:1 | ~100 | AI menu for project context |
| Various AI result cards | ai/{summary,plan,risks,etc.}-card.tsx | 30–90 each | Draft-result cards for AI suggestions |

### shared/
| Component | File:line | LOC | Purpose | Importers |
|---|---|---|---|---|
| FilterCommandMenu | shared/filter-command-menu.tsx:201 | 658 | Ticket filter command palette (popover+drawer) | ticket-filter-bar only |
| TicketFilterBar | shared/ticket-filter-bar.tsx:1 | 648 | Main filter bar for ticket views | ~4 pages |
| FilterCategorySubmenu | shared/filter-category-submenu.tsx:1 | 642 | Category submenu inside filter command | filter-command-menu |
| FilterFlatSearch | shared/filter-flat-search.tsx:1 | 430 | Alternative flat filter search (no popover) | ~3 pages |
| StatusBadge | shared/status-badge.tsx:79 | 106 | Ticket status badge with dot | ~8 ticket views |
| PriorityBadge | shared/priority-badge.tsx:47 | 90 | Priority icon+label badge | ~8 views |
| TicketTypeIcon | shared/ticket-type-icon.tsx:1 | ~40 | Type icon for ticket types | many |
| FilterCategoryRow | shared/filter-category-row.tsx:104 | 160 | Row item in filter command menu | filter-command-menu |
| DisplayToggleRow | shared/display-toggle-row.tsx:14 | ~30 | Toggle row for display prefs | 3 popovers |
| FilterOptionLeading | shared/filter-option-leading.tsx:1 | ~60 | Leading icons for filter options | filter components |
| LabelsSearchCommand | shared/labels-search-command.tsx:1 | ~160 | Command palette for label selection | ticket forms |
| ModuleDisabledState | shared/module-disabled-state.tsx:10 | ~30 | Disabled module placeholder | 2 pages |
| PmChrome | shared/pm-chrome.tsx:1 | ~60 | Layout shell tokens (PmPageShell, PmPanel, etc.) | many |

### views/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| ListView | views/list-view.tsx:1 | **886** | List view with drag-drop, inline fields, grouping |
| KanbanBoard | views/kanban-board.tsx:1 | 571 | Kanban board with swimlanes, virtual list |
| CardInlineFields | views/card-inline-fields.tsx:1 | 550 | InlineAssignee, InlineStatus, InlinePriority, InlineEstimate |
| GanttView | views/gantt-view.tsx:1 | 457 | Gantt chart view |
| WorkloadView | views/workload-view.tsx:1 | 357 | Workload view per member |
| WorkloadFilterMenu | views/workload-filter-menu.tsx:1 | 508 | Filter menu for workload (uses ResponsivePopover) |
| DisplayOptionsPanel | views/display-options-panel.tsx:1 | 436 | View display options panel |
| KanbanColumnHeader | views/kanban-column-header.tsx:1 | 343 | Kanban column header with collapse/expand |
| ViewSwitcher | views/view-switcher.tsx:1 | ~100 | Board/list/table/calendar/gantt/workload switcher |
| ProjectViewsToolbar | views/project-views-toolbar.tsx:1 | ~180 | Top toolbar for project views |
| SaveViewDialog | views/save-view-dialog.tsx:35 | ~80 | Dialog to save a custom view |
| TableView | views/table-view.tsx:1 | ~220 | Spreadsheet-like table view |
| KanbanTicketCard | views/kanban-ticket-card.tsx:1 | ~195 | Individual kanban card |
| KanbanBoardColumn | views/kanban-board-column.tsx:1 | ~130 | Single kanban column with virtual list |
| KanbanAddColumn | views/kanban-add-column.tsx:1 | ~50 | Add new column (status) button |
| KanbanSwimlane | views/kanban-swimlane.tsx:1 | ~80 | Swimlane header row |
| KanbanQuickAdd | views/kanban-quick-add.tsx:1 | ~60 | Quick-add input at bottom of kanban column |
| CardInlineExtraFields | views/card-inline-extra-fields.tsx:1 | 325 | InlineType, InlineLabels |
| CardInlineDateFields | views/card-inline-date-fields.tsx:1 | ~100 | InlineDueDate, InlineStartDate |
| WorkloadFilterBar | views/workload-filter-bar.tsx:1 | 197 | Filter bar for workload view |
| WorkloadMemberRow | views/workload-member-row.tsx:1 | ~220 | Member row in workload view |

### ticket-details/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| TicketSidebar | ticket-details/ticket-sidebar.tsx:1 | 517 | Right sidebar with all ticket metadata fields |
| ActivityFeed | ticket-details/activity-feed.tsx:1 | 431 | Comment + activity log merged feed |
| TicketChecklists | ticket-details/ticket-checklists.tsx:1 | 450 | Checklist management UI |
| CommentItem | ticket-details/comment-item.tsx:1 | 386 | Single comment with TipTap editor |
| SidebarAssigneeSection | ticket-details/sidebar-assignee-section.tsx:1 | ~80 | Multi-assignee list+picker in sidebar |
| SidebarSelectFields | ticket-details/sidebar-select-fields.tsx:1 | ~180 | Status/priority/type/sprint/epic/cycle selects |
| TicketDetailPage | ticket-details/ticket-detail-page.tsx:1 | 331 | Detail page orchestrator |
| TicketDetailMainSection | ticket-details/ticket-detail-main-section.tsx:1 | ~240 | Main content area with description+editor |
| TicketDetailRightPanel | ticket-details/ticket-detail-right-panel.tsx:1 | ~150 | Right panel wrapper |
| TicketDetailActions | ticket-details/ticket-detail-actions.tsx:1 | ~160 | Action buttons (delete, duplicate, etc.) |
| TicketRelations | ticket-details/ticket-relations.tsx:1 | ~150 | Related/blocked-by ticket links |
| TicketSubtasks | ticket-details/ticket-subtasks.tsx:1 | ~80 | Subtask list section |
| SubtaskRow | ticket-details/subtask-row.tsx:1 | ~130 | Individual subtask row |
| SubtaskComposer | ticket-details/subtask-composer.tsx:1 | ~120 | New subtask creation form |
| WatcherList | ticket-details/watcher-list.tsx:1 | ~80 | Watcher list + add watcher |
| AttachmentImage | ticket-details/attachment-image.tsx:1 | ~60 | Image attachment preview |
| TicketCustomFields | ticket-details/ticket-custom-fields.tsx:1 | ~130 | Custom field display/edit |
| TicketGitLinks | ticket-details/ticket-git-links.tsx:1 | ~80 | Git branch/PR links |
| TicketParentControl | ticket-details/ticket-parent-control.tsx:1 | ~120 | Parent ticket selector |
| TicketTimeTracker | ticket-details/ticket-time-tracker.tsx:1 | ~100 | Time tracking widget |

### tickets/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| CreateTicketDialog | tickets/create-ticket-dialog.tsx:1 | **743** | Full ticket creation dialog with AI, attachments |
| TicketCreateProperties | tickets/ticket-create-properties.tsx:1 | 408 | Property fields for ticket creation (status/priority/etc.) |
| LabelPicker | tickets/label-picker.tsx:1 | ~140 | Label multi-select popover |
| RecurrencePicker | tickets/recurrence-picker.tsx:1 | ~200 | Recurrence rule picker |
| TicketRelatedLinksEditor | tickets/ticket-related-links-editor.tsx:1 | ~120 | Editor for related links |
| TicketActivityLog | tickets/ticket-activity-log.tsx:96 | 128 | Activity log renderer (simple feed) |

### project-list/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| ProjectCardInlineFields | project-list/project-card-inline-fields.tsx:1 | **644** | Inline date/assignee/status edits on project cards |
| ProjectTable | project-list/project-table.tsx:1 | 595 | Project table list view |
| EditProjectSheet | project-list/edit-project-sheet.tsx:1 | 413 | Edit project form sheet |
| ProjectCard | project-list/project-card.tsx:1 | 342 | Project card for grid view |
| ProjectFilterBar | project-list/project-filter-bar.tsx:1 | 120 | Filter bar for project list |
| GroupingSidebar | project-list/grouping-sidebar.tsx:1 | 353 | Grouping sidebar for project list view |

### members/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| MembersPage | members/members-page.tsx:1 | **629** | Member list + role management + invite |

### settings/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| AgentTokensSection | settings/agent-tokens-section.tsx:1 | **575** | API tokens management |
| ProjectMembersSection | settings/project-members-section.tsx:1 | 506 | Project member management in settings |
| StatusRow | settings/status-row.tsx:1 | 372 | Individual status row (drag/edit/delete) |
| CustomFieldsSettings | settings/custom-fields-settings.tsx:1 | 367 | Custom field CRUD settings |
| LabelsSettings | settings/labels-settings.tsx:1 | 341 | Labels CRUD settings |
| GitIntegrationSettings | settings/git-integration-settings.tsx:1 | 393 | Git integration settings |
| StatusesSettings | settings/statuses-settings.tsx:1 | ~260 | Statuses CRUD settings |

### sprints/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| SprintPlanningPanel | sprints/sprint-planning-panel.tsx:1 | **627** | Sprint planning UI with drag-drop |

### command-center/
| Component | File:line | LOC | Purpose |
|---|---|---|---|
| CommandCenterPage | command-center/command-center-page.tsx:1 | **612** | Command center overview with quick actions |
| CommandCenterActions | command-center/command-center-actions.tsx:1 | 406 | Action list in command center |

### goals, governance, incidents, bugs, meetings, milestones, portfolios, managed-products, teams, etc.
Each has 1-5 components averaging 100-400 LOC, mostly Sheet-based forms following the same pattern.

---

## 2. DUPLICATION LIST (HIGHEST PRIORITY)

### A. Status Badge — 5 separate implementations
**This is the most widespread duplication in the feature.**

| Implementation | File:line | LOC | What it renders |
|---|---|---|---|
| `StatusBadge` (shared) | `shared/status-badge.tsx:79` | 106 | Dot + label for ticket statuses (TODO/IN_PROGRESS/DONE/etc.) |
| `ApprovalStatusBadge` | `approvals/approval-status-badge.tsx:45` | 77 | Badge with outline border for approval statuses |
| `ManagedProductStatusBadge` | `managed-products/managed-product-status-badge.tsx:17` | 33 | Badge with outline border for active/archived |
| `PmWorkspaceStatusBadge` | `pm-workspaces/pm-workspace-status-badge.tsx:17` | 31 | **Identical to ManagedProductStatusBadge** — same STATUS_STYLE/STATUS_LABEL pattern for active/archived |
| `PortfolioStatusBadge` | `portfolios/portfolio-status-badge.tsx:38` | 68 | Badge with outline border for portfolio statuses |
| `MeetingStatusBadge` | `meetings/meeting-badges.tsx:~60` | ~15 | Inline Badge for meeting statuses |
| `ActionItemStatusBadge` | `meetings/meeting-badges.tsx:~70` | ~15 | Inline Badge for action item statuses |

**Existing shared component:** `components/ui/semantic-badge.tsx` (SemanticBadge with `BadgeTone`) AND `components/ui/status-badge.tsx` (StatusBadge with variant map). Both exist and cover success/warning/danger/neutral tones. Neither is used by any build-feature badge.

**Recommendation:** `ManagedProductStatusBadge` and `PmWorkspaceStatusBadge` are **byte-for-byte identical** (same STATUS_STYLE/STATUS_LABEL shape, only the type differs). Consolidate all 5 into a single `<EntityStatusBadge status={string} statusStyleMap={...} statusLabelMap={...}>` component in `shared/`, or extend `SemanticBadge` with a `statusMap` prop. Priority: HIGH.

---

### B. Confirm-Delete Dialog — 1 shared, 38 inline (AlertDialog used directly)

| Pattern | Files | LOC per use |
|---|---|---|
| `ConfirmDialog` (shared) | `components/ui/confirm-dialog.tsx` — used in `members/members-page.tsx:612` | wrapper only |
| Raw `AlertDialog` inline | 38 files across build feature | 10–20 lines each |

**Existing shared component:** `components/ui/confirm-dialog.tsx:27` — wraps AlertDialog with `title`, `description`, `confirmLabel`, `destructive`, `isPending` props. `components/ui/confirm-sheet.tsx` and `components/ui/confirm-with-reason-sheet.tsx` also exist.

**Recommendation:** The shared `ConfirmDialog` covers all the inline uses. Replace 38 inline AlertDialog patterns with it. Priority: HIGH (every modal delete is ~15 lines that collapse to ~5).

---

### C. User Avatar + Display Name — inline everywhere, 1 shared util exists

| Pattern | Example files | Notes |
|---|---|---|
| `Avatar` + `getUserDisplayName` + `getUserInitials` inline | `ticket-details/sidebar-assignee-section.tsx:42`, `views/card-inline-fields.tsx:140`, `project-list/project-card-inline-fields.tsx:200`, `teams/workspace-member-picker.tsx:65`, `members/members-page.tsx:~400` | Every popover member list hand-rolls Avatar+fallback+display name |
| `WorkspaceMemberPicker` (build-local) | `teams/workspace-member-picker.tsx:34` | 145 LOC — own Command+Popover picker with avatar |
| `MemberPicker` (shared) | `components/members/member-picker.tsx:1` | 403 LOC — the canonical implementation with search, avatar, multi/single, workspace/project scopes |

**Existing shared component:** `components/members/member-picker.tsx` covers all use cases (project scope, org scope, workspace scope, single, multi). `project-member-select.tsx` wraps it for project-scoped single/multi.

`WorkspaceMemberPicker` at `teams/workspace-member-picker.tsx:34` (145 LOC) reimplements the same Command+Popover+Avatar+search pattern that `MemberPicker` already handles via `scope="workspace"`. **This is a dead-code candidate** — it only has 1 importer (`team-home-page.tsx:50`).

**Recommendation:** Replace `WorkspaceMemberPicker` with `<MemberPicker scope="workspace" mode="single" ...>`. Priority: MEDIUM.

---

### D. View Switcher — 2 implementations

| Implementation | File:line | LOC | Views it covers |
|---|---|---|---|
| `ViewSwitcher` (project views) | `views/view-switcher.tsx:1` | ~100 | board/list/table/calendar/gantt/workload (6 types) |
| `AllWorkViewSwitcher` | `all-work/all-work-view-switcher.tsx:1` | ~80 | list/table/board (3 types) |

**Analysis:** Both use a `Select` dropdown with icon + label. `AllWorkViewSwitcher` is a simplified subset. Not unreasonable given different view sets, but the underlying pattern (Select with icon options) could be shared.

**Recommendation:** Low priority — both are small and cover different view sets. Document as intentional or extract a generic `<ViewSelect options={...}>` helper. Priority: LOW.

---

### E. Grouping Sidebar — 2 similar implementations

| Implementation | File:line | LOC | Entity |
|---|---|---|---|
| `GroupingSidebar` (project list) | `project-list/grouping-sidebar.tsx:1` | 353 | Projects grouped by status/health/lead |
| `GroupingSidebar` (my-work) | `my-work/grouping-sidebar.tsx:1` | 357 | Tickets grouped by priority/status/assignee |

**Analysis:** Both implement a Drawer (mobile) + sticky panel (desktop) with Tabs for group categories and a list of rows with counts. The shape is the same, the entity data differs. These likely could share a `<GroupingSidebarShell tabs={...} rows={...}>` abstraction.

**Recommendation:** MEDIUM — both are large files; abstracting the Drawer/Tab/row shell would reduce each by ~150 LOC.

---

### F. Filter Bar — 3 implementations with overlapping logic

| Implementation | File:line | LOC | Used by |
|---|---|---|---|
| `TicketFilterBar` | `shared/ticket-filter-bar.tsx:1` | 648 | All ticket views (kanban/list/table/calendar) |
| `ProjectFilterBar` | `project-list/project-filter-bar.tsx:36` | 120 | Project list page |
| `WorkloadFilterBar` | `views/workload-filter-bar.tsx:1` | 197 | Workload view |

**Analysis:** `TicketFilterBar` is the canonical filter bar (used by the main views). `ProjectFilterBar` and `WorkloadFilterBar` are thinner adapters for their specific filter types. Duplication is the search input + view toggle pattern, which each re-implements. These are not strong duplicates given different filter schemas.

**Recommendation:** The `SearchInput + ViewToggle + filter chips` layout pattern repeats in all three. Could extract a `<FilterBarShell>` shell and pass filter-specific controls as children. LOW priority.

---

### G. Inline Priority Color Map — inlined in 3+ places

| Location | File:line | Notes |
|---|---|---|
| `PriorityBadge` (canonical) | `shared/priority-badge.tsx:13` | URGENT/HIGH/MEDIUM/LOW → icon + color |
| `my-work/grouping-sidebar.tsx:25` | PRIORITY_COLORS inline | dot color map only |
| `project-list/project-card-inline-fields.tsx:306` | inline priority dot colors | different hex than canonical |
| `tickets/ticket-create-properties.tsx:36` | PRIORITY_COLORS inline | text color only |

**Existing shared:** `shared/priority-badge.tsx` has the canonical config. The divergent maps use different shades (`bg-orange-400` vs `text-orange-500`).

**Recommendation:** Export `PRIORITY_CONFIG` from `shared/priority-badge.tsx` and consume it in the three inlined maps. Priority: LOW.

---

### H. Severity Badge — inlined in bugs-page, not using SemanticBadge

| Location | File:line | Notes |
|---|---|---|
| `SEVERITY_STYLES` + inline Badge | `bugs/bugs-page.tsx:46` | 8 inline style strings, rendered as `<Badge variant="outline" className={SEVERITY_STYLES[row.severity]}>` |

**Existing shared:** `components/ui/semantic-badge.tsx:44` (`SemanticBadge` with `tone` prop) covers success/warning/danger/neutral. Severity maps cleanly to those tones.

**Recommendation:** Replace inline severity badge with `SemanticBadge`. Priority: LOW.

---

## 3. LOC Cap Violations (>500 = hard cap violation, >300 = target exceeded)

### Hard Violations (>500 LOC) — 20 files

| File | LOC | Notes |
|---|---|---|
| `views/list-view.tsx` | **886** | Renders grouped/draggable ticket rows; extract `ListViewItem`, `ListViewGroup`, drag context into sub-files |
| `tickets/create-ticket-dialog.tsx` | **743** | Full creation dialog; could split attachment section, AI section, properties section |
| `ai/ticket-detail-ai.tsx` | **701** | AI actions on ticket detail; split AI result cards already done, but the orchestrator is still large |
| `shared/filter-command-menu.tsx` | **658** | Filter command palette; the category-submenu was already split into `filter-category-submenu.tsx` — split date + assignee panels further |
| `shared/ticket-filter-bar.tsx` | **648** | Filter bar with mobile/desktop layouts; the mobile drawer could be its own component |
| `project-list/project-card-inline-fields.tsx` | **644** | Inline field popovers for project cards; has own Calendar import (bypassing shared DatePicker) |
| `shared/filter-category-submenu.tsx` | **642** | Category-specific submenu panels; each panel (status/priority/assignee/dates) could be its own file |
| `members/members-page.tsx` | **629** | Members list + invite + role management + remove — 3 distinct concerns |
| `sprints/sprint-planning-panel.tsx` | **627** | Sprint planning; the backlog section vs sprint section are distinct concerns |
| `command-center/command-center-page.tsx` | **612** | Command center with multiple sections; at least 3 extractable sub-panels |
| `project-list/project-table.tsx` | **595** | Project table list; column definitions + row component + sort could be split |
| `settings/agent-tokens-section.tsx` | **575** | API token management; create/list/revoke could each be a component |
| `views/kanban-board.tsx` | **571** | Kanban board orchestrator; drag context + swimlane grouping + column render logic |
| `views/card-inline-fields.tsx` | **550** | InlineAssignee/Status/Priority/Estimate all in one file; could be split by field type |
| `meetings/meeting-form-sheet.tsx` | **546** | Meeting form; attendees section + agenda section are distinct |
| `goals/goal-form-sheet.tsx` | **527** | Goal form; KRs section + date section + owner section |
| `approvals/project-approvals-page.tsx` | **522** | Approvals list + request sheet inline |
| `ticket-details/ticket-sidebar.tsx` | **517** | Sidebar orchestrator; already delegates to `sidebar-assignee-section`, `sidebar-select-fields`, etc. — further extraction possible |
| `views/workload-filter-menu.tsx` | **508** | Filter menu for workload view |
| `settings/project-members-section.tsx` | **506** | Project member CRUD in settings |

### Target Exceeded (301–500 LOC) — 55 additional files
Key examples:
- `bugs/bug-sheet.tsx` 473, `views/gantt-view.tsx` 457, `incidents/incident-sheet.tsx` 455, `ticket-details/ticket-checklists.tsx` 450, `project-create/steps/step-basics.tsx` 444, `my-work/my-work-page.tsx` 437, `views/display-options-panel.tsx` 436, `ticket-details/activity-feed.tsx` 431, `shared/filter-flat-search.tsx` 430.

---

## 4. Responsive Gaps

### DataTable — OK
`components/ui/data-table.tsx:277` uses `overflow-auto overscroll-x-contain` with `min-w-max` for tables, so horizontal scrolling is handled within the table container. Tables using `DataTable` (bugs-page, change-requests-page, incidents-page, etc.) are covered.

### ticket-filter-bar — OK
`shared/ticket-filter-bar.tsx:492` has extensive responsive handling: `flex-col` → `sm:flex-row`, search fills `flex-1` on mobile, extra filters collapse into a mobile Drawer, breakpoints at sm/md throughout.

### bugs-page filter selects — GAP
`bugs/bugs-page.tsx:261-279` uses `SelectTrigger className="w-32"` and `w-28` for status/severity/assignee filter selects — these are fixed-width triggers that may clip on smaller screens. No `sm:` responsive override. The filter row has no wrapping/stacking on mobile.

### list-view — GAP
`views/list-view.tsx` has no `hidden sm:` / `md:` responsive classes on list row columns (priority icon, estimate, label chips, cycle badge). On 375px all columns render inline with `overflow-hidden` truncation — this is workable but priority/estimate columns will crowd the title. No responsive column hiding.

### project-card-inline-fields — NOTE
`project-list/project-card-inline-fields.tsx:15` directly imports `Calendar` component (bypassing `components/ui/date-picker.tsx`) and builds its own Popover date picker inline at line ~300. This duplicates the shared `DatePicker` component and also does not use `ResponsivePopover` — on mobile this Popover will render as a Popover, not a Drawer.

### grid-cols-2/3 inside Sheets — ACCEPTABLE
Many Sheets use `grid grid-cols-2 gap-3` and `grid grid-cols-3 gap-3` (e.g. `bugs/bug-sheet.tsx:216`, `incidents/incident-sheet.tsx:266`). These are inside Sheet scrollable content where the Sheet itself is full-width on mobile, so the 2-col grid is ~160px columns — acceptable but tight on 375px. Not a critical gap.

---

## 5. Dialog/Sheet/Popover on Mobile — Raw Popovers Not Wrapped in ResponsivePopover

`components/ui/responsive-popover.tsx` exists (ResponsivePopover, ResponsivePopoverTrigger, ResponsivePopoverContent) and renders a Drawer below `md`, Popover on desktop.

### Files using raw `Popover` directly that should use `ResponsivePopover`:

| File | Line | What it opens |
|---|---|---|
| `all-work/all-work-views-menu.tsx` | ~1 | Views filter menu popover |
| `backlog/bulk-action-bar.tsx` | ~1 | Bulk action popover |
| `epics/epic-card.tsx` | ~1 | Epic options popover |
| `project-create/steps/step-basics.tsx` | 306 | Date picker popover (`PopoverContent className="w-[var(--radix-popover-trigger-width)]"` — also a width violation) |
| `project-list/project-card-inline-fields.tsx` | ~300 | Inline date picker popover (own Calendar) |
| `project-list/settings/project-members-section.tsx` | 204 | Member picker popover (`w-[var(--radix-popover-trigger-width)]` — width violation) |
| `sidebar/project-more-menu.tsx` | ~1 | Project more options |
| `sidebar/project-switcher.tsx` | ~1 | Project switcher |
| `teams/team-form-sheet.tsx` | ~1 | Color/emoji picker |
| `teams/team-projects-section.tsx` | ~1 | Add project popover |
| `teams/workspace-member-picker.tsx` | ~18 | Member picker popover |
| `ticket-details/subtask-composer.tsx` | ~1 | Type/priority picker |
| `ticket-details/ticket-detail-actions.tsx` | ~1 | More actions popover |
| `ticket-details/ticket-parent-control.tsx` | ~1 | Parent ticket search |
| `ticket-details/ticket-relations.tsx` | ~1 | Related ticket search |
| `ticket-details/ticket-sidebar.tsx` | ~1 | Sprint/cycle/epic pickers |
| `tickets/label-picker.tsx` | ~1 | Label picker |
| `tickets/ticket-create-properties.tsx` | ~1 | All property pickers |
| `shared/filter-command-menu.tsx` | ~224 | Main filter menu (already handles Drawer internally but manually, not via ResponsivePopover) |

The most impactful missing wrappers are the inline field popovers in `card-inline-fields.tsx` (InlineAssignee, InlineStatus, InlinePriority, InlineEstimate — all fired from kanban cards and list rows on mobile).

**Note:** `views/workload-filter-menu.tsx:7` already correctly uses `ResponsivePopover`.

---

## 6. Select/Popover Width Violations

Project rule: `SelectContent className="min-w-[var(--radix-select-trigger-width)]"` (min-w, NOT w-).

### Violations found:

| File | Line | Offending class | Impact |
|---|---|---|---|
| `project-create/steps/step-basics.tsx` | 306 | `PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"` | Date range picker clipped to narrow trigger width |
| `project-list/settings/project-members-section.tsx` | 204 | `PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2"` | Member picker popover clipped |

**Correct usages (for reference):** `goal-filters-popover.tsx:54,78`, `members/members-page.tsx:254`, `settings/project-members-section.tsx:399`, `teams/team-home-page.tsx:145,340`, `views/view-switcher.tsx:97` all use `min-w-[var(--radix-select-trigger-width)]` correctly.

---

## 7. Skeletons

Only **2 dedicated skeleton files** exist in the entire build feature:

| Skeleton | File:line | Quality |
|---|---|---|
| `GoalDetailSkeleton` | `goals/goal-detail-skeleton.tsx:7` | GENERIC — renders a flat `h-5 rounded-full` + `h-4 w-full` + 12× `h-20 w-full rounded-xl`. Does NOT mirror the two-column layout of the goal detail page (KR list + metadata sidebar). |
| `MyTicketsSkeleton` | `my-tickets/my-tickets-skeleton.tsx:8` | GOOD — dispatches to `KanbanBoardSkeleton` (board view), a list of `h-9`/`h-10` rows (list view), or `DataTableSkeleton` (table view). Layout-aware. |

All other pages that load asynchronously (bugs, incidents, sprints, governance, etc.) use generic `DataTableSkeleton` from `components/ui/data-table.tsx` (just rows/columns with Skeleton) or show a spinner. No layout-matching skeletons exist for:
- `views/list-view.tsx` (grouped list skeleton would need group headers + items)
- `views/kanban-board.tsx` (uses `KanbanBoardSkeleton` from shared — `components/ui/kanban-skeleton.tsx` — this is good)
- `sprints/sprint-planning-panel.tsx` (no skeleton)
- `ticket-details/ticket-detail-page.tsx` (no layout skeleton)

**Summary:** Most skeletons are generic. `GoalDetailSkeleton` is the worst offender — 12× uniform blocks for a two-column layout.

---

## 8. Icon Rule — Interactive Lucide Icons Without Animation

Project rule: interactive/hoverable surfaces must use `@animateicons/react` via `useAnimatedIcon()` / `AnimatedIconButton`. Static `lucide-react` is only for non-interactive icons or icons absent from the animated set.

### Violations (interactive elements using plain lucide-react):

| File | Line | Icon | Context |
|---|---|---|---|
| `views/workload-filter-menu.tsx` | ~30 | `ListFilter, ChevronRight, CircleDot, AlertTriangle, Layers, User, Zap, RefreshCw, Check` from lucide | Filter menu trigger button is interactive |
| `ticket-details/watcher-list.tsx` | 7 | `Eye` from lucide | Eye icon on "watch" toggle button |
| `views/list-view.tsx` | 15 | `User, GripVertical` from lucide | User icon in assignee slot (interactive popover trigger) |
| `command-center/command-center-page.tsx` | 21 | `Loader2` from lucide | Loader is non-interactive — OK |
| `ticket-details/attachment-image.tsx` | 5 | `Loader2` from lucide | Loader — non-interactive — OK |
| `ticket-details/ticket-detail-right-panel.tsx` | 5 | `Loader2` from lucide | Loader — OK |
| `shared/labels-search-command.tsx` | 4 | `Check, Loader2, Plus` from lucide | `Plus` used in an add-label button (interactive) |
| `teams/workspace-member-picker.tsx` | 5 | `Check, User` from lucide | User icon in picker trigger (interactive) |
| `all-work/all-work-view-switcher.tsx` | 4 | `List, Table2, LayoutGrid` from lucide | View switcher options (interactive Select items) |
| `project-list/project-card-inline-fields.tsx` | 5 | `Check, Calendar, User` from lucide | Calendar/User on inline trigger buttons |
| `settings/project-members-section.tsx` | ~8 | `Check, User` from lucide | User in member picker trigger |

**Note:** `views/list-view.tsx:16-17` correctly uses `useAnimatedIcon()` for ChevronRight and PlusIcon from `@animateicons/react/lucide`, showing awareness of the rule. The `User` and `GripVertical` icons are non-animated because they're absent from the animated set — this is acceptable per the rule.

**True violations** (animated icon exists, interactive surface, using static lucide):
- `shared/labels-search-command.tsx`: `Plus` in add-label button — `PlusIcon` exists in `@animateicons/react/lucide` (confirmed by `create-ticket-dialog.tsx:36` import)
- `teams/workspace-member-picker.tsx`: trigger button — but `UserIcon` does exist in animated set

---

## 9. Dead Components (zero importers in whole frontend)

Grep results across the full frontend (TSX + TS files):

| File | Symbol | Importers | Notes |
|---|---|---|---|
| `views/kanban-add-column.tsx` | `AddColumn` | `views/kanban-board.tsx:15` | **NOT dead** — imported by kanban-board |
| `views/kanban-swimlane.tsx` | `SwimlaneRowHeader, getTicketRowKey` | `views/kanban-board.tsx:23` | **NOT dead** |
| `views/kanban-quick-add.tsx` | `QuickAddInput` | `views/kanban-board-column.tsx:11` | **NOT dead** |
| `shared/module-disabled-state.tsx` | `ModuleDisabledState` | 2 page files | **NOT dead** |
| `views/save-view-dialog.tsx` | `SaveViewDialog` | `app/build/[projectId]/page.tsx:37`, `all-work/all-work-views-menu.tsx:22` | **NOT dead** |
| `analytics/project-stats.tsx` | constants only | `analytics/project-charts.tsx:22` | **NOT dead** — exports constants |
| `teams/workspace-member-picker.tsx` | `WorkspaceMemberPicker` | `teams/team-home-page.tsx:50` | 1 importer — very low usage; candidate for replacement with shared MemberPicker |
| `shared/filter-category-row.tsx` | `FilterCategoryRow` | `shared/filter-command-menu.tsx:42` | **NOT dead** |

**Genuinely dead components:** None confirmed with zero importers. The bash loop earlier showed 0 for `module-disabled-state` through the file-path grep (which was too narrow); symbol grep shows all the candidates are imported. No dead component files confirmed.

---

## Summary Table: Sub-feature File Counts

| Sub-feature | TSX files | Key oversized files |
|---|---|---|
| shared/ | 22 | filter-command-menu (658), ticket-filter-bar (648), filter-category-submenu (642) |
| views/ | 22 | list-view (886), kanban-board (571), card-inline-fields (550) |
| ticket-details/ | 25 | ticket-sidebar (517), activity-feed (431), ticket-checklists (450) |
| tickets/ | 8 | create-ticket-dialog (743), ticket-create-properties (408) |
| project-list/ | 14 | project-card-inline-fields (644), project-table (595) |
| settings/ | 13 | agent-tokens-section (575), project-members-section (506) |
| ai/ | 16 | ticket-detail-ai (701) |
| sprints/ | 6 | sprint-planning-panel (627) |
| command-center/ | 5 | command-center-page (612) |
| members/ | 3 | members-page (629) |
| Other 40 sub-features | ~156 | Various 200-470 LOC sheets/pages |
| **Total** | **290 TSX + 53 TS** | **~65k LOC** |
