# Linear — Page inventory (UI-VERIFIED)

**Walk date:** 2026-10-01 IST  
**Workspace/team:** Tarunchintakunta / TAR  
**Signed-in:** yes  
**Scope:** free-only UI inspection; no mutations

| # | URL / nav path | Surface | Notes |
| --- | --- | --- | --- |
| 1 | `/tarunchintakunta/team/TAR/active` | Active issues | Active tab, Backlog tab, All issues tab; four starter issues visible |
| 2 | Active → **Add filter** | Filter field menu | AI filter, Advanced filter, Status, Assignee, Agent, Agent Session, Creator, Priority, Labels, Relations, Suggested label, Dates, Project, Project properties, Subscribers, Auto-closed, Content, Links, Template |
| 2a | Add filter → AI filter | AI prompt menu | Suggestions: assigned to me; completed in the last month; due in the next 2 weeks |
| 3 | Active → Add filter → Status | Status selector | Checklist/value selector: Backlog, Todo, In Progress, Done, Canceled, Duplicate |
| 4 | Active → Add filter → Relations | Relations selector | Parent, Sub-issues, Blocked, Blocking, Recurring, Issues with relations, Duplicates |
| 5 | Active → Add filter → Dates → Due date → Custom date or timeframe | Date predicate picker | Visible operator `in`; Day/Month/Quarter/Half-year/Year; year/quarter choices; Cancel/Apply |
| 6 | Active → Add filter → Advanced filter | Advanced builder | Add filter group; filter clauses; group operator toggles between `or` and `and`; groups can be nested |
| 7 | `/tarunchintakunta/team/TAR/views/issues` | Team custom Views | Empty custom-view list; Issues/Projects tabs; Create new view; Documentation link |
| 8 | Team Views → Create new view | New view builder | Name (`All issues`), optional description, Save to Tarunchintakunta, Cancel, Create view; opened then cancelled |

## Not opened

No paid/upgrade flow, issue edit, or view save/share mutation was performed.

## Beyond Filters — signed-in surfaces (UI-VERIFIED)

The following read-only surfaces were opened after the existing Filters walk. No create, enable, invite, connect, save, or paid action was taken.

| # | URL / nav path | Surface | UI result |
| --- | --- | --- | --- |
| 9 | `/tarunchintakunta/inbox` | Inbox | One unread notification; split inbox/list and empty detail state |
| 10 | `/tarunchintakunta/my-issues/assigned` | My issues | Assigned / Created / Subscribed / Activity tabs; no assigned issues; Create new issue affordance |
| 11 | `/tarunchintakunta/projects/all` | Projects | All projects empty state; New project, Create new project, Documentation |
| 12 | `/tarunchintakunta/views` | Workspace Views / Custom Views | Issues / Projects tabs; New view; empty custom-view state and documentation |
| 13 | `/tarunchintakunta/agent` | Agent | New chat; Ask Linear composer; Skills selector; example prompts |
| 14 | `/tarunchintakunta/team/TAR/overview` | Team overview | Overview / Documents / Members tabs; team resources and links to Issues / Projects / Views |
| 15 | `/tarunchintakunta/team/TAR/documents` | Team Documents | Empty team-documents state; New document and Create document |
| 16 | `/tarunchintakunta/team/TAR/cycles` | Cycles | Dedicated Cycles page; message: “This team has no cycles.” |
| 17 | `/tarunchintakunta/settings/integrations/github` | Integrations / GitHub | GitHub integration detail; overview and Enable action visible (not used) |
| 18 | `/tarunchintakunta/settings/integrations` | Integrations catalog | Searchable catalog with Essentials, Agents, AI clients, Engineering, Automations, Analytics, and other categories |
| 19 | `/tarunchintakunta/settings/issue-templates` | Issue Templates | “No issue templates”; New template |
| 20 | `/tarunchintakunta/settings/sla` | SLAs | SLA description; explicitly available on Business and Enterprise; Start free trial; Add rule disabled |
| 21 | `/tarunchintakunta/settings/initiatives` | Initiatives | Enable Initiatives toggle is off; initiative update controls are shown but inactive |
| 22 | `/tarunchintakunta/settings/asks` | Asks | Structured Slack/email intake description; explicitly available on Business or Enterprise; Start free trial |
| 23 | `/tarunchintakunta/settings/ai` | AI & Agents | Linear Agent is Enabled; usage shows $0.00 remaining; Code Intelligence is Business-only; Coding sessions marked Available on Basic |
| 24 | `/tarunchintakunta/team/TAR/triage` | Triage route probe | Redirected to `/team/TAR/all` (All issues); no separate Triage surface was exposed |
| 25 | `/tarunchintakunta/team/TAR/roadmap` and `/tarunchintakunta/insights` | Roadmap / Insights | Team Roadmap and workspace Insights rendered Not found; workspace `/roadmap` redirected to Projects |

**Non-filter UI-verified count:** 15 surfaces (Inbox, My issues, Projects, Views, Agent, Team overview, Team Documents, Cycles, GitHub, Integrations catalog, Templates, SLAs, Initiatives, Asks, AI & Agents). This count excludes the route probes for Triage, Roadmap, and Insights.
