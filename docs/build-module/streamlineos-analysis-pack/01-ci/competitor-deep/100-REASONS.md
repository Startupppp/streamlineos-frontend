# 100+ Reasons Roadmap — StreamlineOS Build vs Directs
**Status:** SEED from Completeness/Freeze evidence — expanding via signed-in competitor walks
**ICP:** Freelancers · Product managers · Project managers
**Updated:** 2026-10-01

| # | Theme | Reason (customer-facing when shipped) | Beats / matches | Evidence | Today |
| --- | --- | --- | --- | --- | --- |
| 1 | Activation | Cold invite accept lands reliably into Build (not blank/OTP roulette) | Linear/ClickUp/Jira | Freeze BUG-001 | BEHIND |
| 2 | Activation | Invite grants Build module access automatically (no manual Roles step) | Linear/ClickUp | Freeze BUG-002 / PM-002 | BEHIND |
| 3 | Client wedge | Atomic client grant → guest magic-link entry (no false-success toast) | Zoho/JSM/ClickUp guests | PM-001 BUG-005/006 | BEHIND |
| 4 | Client wedge | Member can request Client Access (CTA) | Zoho/ClickUp | BUG-004 | BEHIND |
| 5 | Client wedge | Publish client portal requires confirm (asymmetry fix UX-031) | JSM/Zoho | UX-031 | BEHIND craft |
| 6 | Client wedge | Grant Access projects loader works | Zoho/JSM | BUG-006 | BEHIND |
| 7 | Delivery | Active-cycle chrome matches Linear Cycles depth | Linear | UX-024 | BEHIND |
| 8 | Delivery | Triage rules / intelligence empty→usable | Linear Triage | UX-029 | BEHIND |
| 9 | Delivery | Release membership / ship tracking depth | Jira Releases | UX-025 | BEHIND |
| 10 | Delivery | Program↔project membership (not shell-only) | Jira Plans/ClickUp | UX-028 | BEHIND |
| 11 | Delivery | Milestone↔issue linking | Linear/ClickUp/Zoho | Milestones census | BEHIND |
| 12 | Delivery | Labels + Epic-as-relation filters on issues | Jira/ClickUp | UX-026/027 | BEHIND |
| 13 | Activation | Template gallery / Quick Start packs (not one custom template) | ClickUp | Templates | BEHIND gallery |
| 14 | Insights | Named report Create/Run (not snapshot-only) | Jira Generate report | UX-030 | BEHIND |
| 15 | Insights | Org-level Reports (not project-only) | Jira/ClickUp dashboards | Reports craft | BEHIND |
| 16 | Finance | Org Budget (not 404) | Zoho Projects | Approvals-Budget | BEHIND |
| 17 | Extensibility | New Form does not auto-create untitled draft without cancel | ClickUp Forms | UX-032 | BEHIND safety |
| 18 | Extensibility | Live automation rules fire (create verified) | ClickUp/Jira/monday | Automations | BEHIND filled |
| 19 | Extensibility | Live webhooks deliver | Linear/ClickUp | Webhooks | BEHIND filled |
| 20 | Auth | Password + SSO options (not OTP-only fragile) | Linear/Atlassian/ClickUp | CI-060 | BEHIND |
| 21 | Collab roles | Honest Viewer vs Member labels (create power clear) | Linear/ClickUp | CW-001/002 | BEHIND honesty |
| 22 | Collab roles | Default Member can create issues in accessible projects | Linear/ClickUp/Jira | Member T24 | BEHIND |
| 23 | Hierarchy | Portfolio depth beyond link (roadmaps/deps) | Jira Plans/monday | Portfolio | BEHIND depth |
| 24 | Ops niche | QA test runs filled craft vs marketplace QA tools | Xray/Zephyr | Ops pack | BEHIND niche |
| 25 | Ops niche | Incidents SLA lifecycle live | JSM/Opsgenie | Ops pack | BEHIND niche |

**Seed count:** 25 — target ≥100 after Linear/ClickUp/Jira/monday/Asana walks.

## In flight
- Linear signed-in page walk (executor)
- ClickUp next
- Then Jira Cloud, monday, Asana

## Rules
- A row becomes a *sellable reason* only after Build ships it; until then it is a *gap to close*.
- Prefer Direct evidence + Build ledger IDs over marketing claims.

---

## Hypothesis / PUBLIC-DOC candidates (Filters deep-dive) — 2026-10-01

**Source:** `FILTERS-PUBLIC-DOCS.md` (official Help/Docs only). **Not UI-VERIFIED.** PM may frame roadmap without inventing signed-in walks. Upgrade to sellable only after Build ships + optional UI confirm.

| # | Theme | Reason (customer-facing when shipped) | Beats / matches | Evidence | Today |
| --- | --- | --- | --- | --- | --- |
| 26 | Filters | Issue list filters cover Status + Priority + Type + Assignee + Due as first-class chips | Linear/ClickUp/Jira | PUBLIC-DOC Filters inventory · PARITY-seeking | Hypothesis / BEHIND |
| 27 | Filters | Cycle / Sprint membership filter (active / upcoming / open sprint) | Linear Cycle · Jira `sprint`/`openSprints()` | PUBLIC-DOC Linear filters + Jira JQL | Hypothesis / BEHIND |
| 28 | Filters | Labels/Tags filter with include-any / exclude-none style operators (**UX-026**) | Linear labels · ClickUp Tags · Jira `labels` · monday Label | PUBLIC-DOC · UX-026 | Hypothesis / BEHIND |
| 29 | Filters | Parent / Epic-as-relation filter on issues (**UX-027**) | Jira `parent` · ClickUp Custom Relationships · Linear Relations | PUBLIC-DOC · UX-027 | Hypothesis / BEHIND |
| 30 | Filters | Release / Fix-version / milestone filter on issues | Jira `fixVersion` · Linear Milestone (post-project) | PUBLIC-DOC | Hypothesis / BEHIND |
| 31 | Filters | AND + OR combinators across filter clauses | Linear Advanced · ClickUp And/Or · Jira AND/OR · monday AND/OR | PUBLIC-DOC | Hypothesis / BEHIND |
| 32 | Filters | Nested filter groups (group of ANDs inside ORs) | Linear nested groups · ClickUp Nested filter · monday New group | PUBLIC-DOC | Hypothesis / BEHIND |
| 33 | Filters | Relative due windows (today, next week, last N days) without rewriting absolute dates | ClickUp date presets · Jira `"-5d"`/`endOfWeek()` · Linear “N days” / AI “due next week” · monday next/last week | PUBLIC-DOC | Hypothesis / BEHIND |
| 34 | Filters | Named saved views from any filtered list/board | Linear Custom Views · ClickUp Save view · monday Save as new view | PUBLIC-DOC | Hypothesis / BEHIND |
| 35 | Filters | Share saved views with team/workspace scope (not URL-only hope) | Linear share scopes · ClickUp Workspace filters · Jira filter share | PUBLIC-DOC | Hypothesis / BEHIND |
| 36 | Filters | Star / favorite saved views for sidebar defaults | Linear Favorite views · Asana starred search | PUBLIC-DOC | Hypothesis / BEHIND |
| 37 | Filters | Custom fields appear as filter dimensions (typed operators) | ClickUp CF filters · Jira CF/JQL · Asana Add Custom Field · monday columns | PUBLIC-DOC | Hypothesis / BEHIND |
| 38 | Filters | Multi-select dropdown custom field filter | ClickUp Dropdown CF multi-select | PUBLIC-DOC ClickUp CF article | Hypothesis / BEHIND |
| 39 | Filters | Filter URL encodes active filters for one-click share of ad-hoc query | Linear filters-in-URL | PUBLIC-DOC Linear Filters | Hypothesis / BEHIND |
| 40 | Filters | Subscribe / notify when issues enter a saved view | Linear view subscriptions (+ Slack) | PUBLIC-DOC Custom Views | Hypothesis / BEHIND |
| 41 | Filters | History operators (WAS / CHANGED status or assignee) for audit lists | Jira JQL WAS/CHANGED | PUBLIC-DOC JQL operators | Hypothesis / BEHIND |
| 42 | Filters | Text contains / does-not-contain on title+description (+ comments where supported) | Jira `~`/`!~` · ClickUp search bar scopes | PUBLIC-DOC | Hypothesis / BEHIND |
| 43 | Filters | Dependency / blocking / waiting-on filter | ClickUp Dependency filter | PUBLIC-DOC ClickUp List filters | Hypothesis / BEHIND |
| 44 | Filters | Created-by / reporter filter distinct from assignee | ClickUp Created by · Jira reporter · Linear Created by | PUBLIC-DOC | Hypothesis / BEHIND |
| 45 | Filters | Follower / watcher / subscriber filter | ClickUp Follower · Linear Subscriber · Jira watcher | PUBLIC-DOC | Hypothesis / BEHIND |
| 46 | Filters | Archived / closed-status dedicated toggles | ClickUp Archived + Status is closed | PUBLIC-DOC | Hypothesis / BEHIND |
| 47 | Filters | Personal “Me mode” / dynamic assignee = current viewer | ClickUp Me Mode · monday dynamic People · Jira `currentUser()` | PUBLIC-DOC | Hypothesis / BEHIND |
| 48 | Filters | AI / NL → structured filter builder | Linear AI filter · monday Filter with AI | PUBLIC-DOC | Hypothesis / BEHIND |
| 49 | Filters | Save filter recipe separately from full view layout (personal + workspace libraries) | ClickUp Personal vs Workspace saved filters | PUBLIC-DOC Saving view filters | Hypothesis / BEHIND |
| 50 | Filters | View templates that carry filters/grouping/sort across spaces | ClickUp View templates | PUBLIC-DOC | Hypothesis / BEHIND |
| 51 | Filters | Board search scoped to selected columns (avoid noise) | monday Search options (≤50 columns) | PUBLIC-DOC Board Filters | Hypothesis / BEHIND |
| 52 | Filters | Quick suggested filters with live counts | monday quick suggested filters | PUBLIC-DOC | Hypothesis / BEHIND |
| 53 | Filters | Subitem / subtask aware advanced filters | monday subitem column filters · ClickUp subtasks-as-separate | PUBLIC-DOC | Hypothesis / BEHIND |
| 54 | Filters | Auto-apply filter values when creating issues inside a filtered view (“Bring it back”) | monday automatic filtering · ClickUp filter-seeded create | PUBLIC-DOC | Hypothesis / BEHIND |
| 55 | Filters | Cross-project Advanced Search → durable report in sidebar | Asana Advanced Search → saved report | PUBLIC-DOC Asana resource/Help | Hypothesis / BEHIND |
| 56 | Filters | Org field-library custom fields searchable across projects | Asana CF library requirement in Advanced Search | PUBLIC-DOC Help (indexed) | Hypothesis / BEHIND |
| 57 | Filters | Assigned-by filter for “work I delegated” follow-ups | Asana Assigned by | PUBLIC-DOC Asana tips resource | Hypothesis / BEHIND |
| 58 | Filters | Match-all / Match-any custom views for issues & tasks | Zoho Projects Custom Views | PUBLIC-DOC Help (indexed; SPA thin) | Hypothesis / BEHIND |
| 59 | Filters | Shareable named custom views with accessibility controls | Zoho Custom View sharing | PUBLIC-DOC Help (indexed) | Hypothesis / BEHIND |
| 60 | Filters | JQL-class power users: save + nest filters by ID | Jira `filter = id` composition | PUBLIC-DOC JQL fields | Hypothesis / BEHIND |
| 61 | Filters | Sprint open/closed/future functions without hardcoding sprint names | Jira `openSprints()`/`closedSprints()`/`futureSprints()` | PUBLIC-DOC JQL functions | Hypothesis / BEHIND |
| 62 | Filters | Version release helpers (`releasedVersions`, `latestReleasedVersion`) | Jira version functions | PUBLIC-DOC | Hypothesis / BEHIND |
| 63 | Filters | Label include-any / include-all / include-none semantics | Linear label operators | PUBLIC-DOC Linear Filters | Hypothesis / BEHIND |
| 64 | Filters | Cycle timing filter (“Added to cycle” planned vs after-start) | Linear Added to cycle | PUBLIC-DOC | Hypothesis / BEHIND |
| 65 | Filters | Time-estimate / time-tracked numeric comparisons in filters | ClickUp Time estimate/tracked | PUBLIC-DOC | Hypothesis / BEHIND |
| 66 | Filters | Last-status-change / date-done / date-closed temporal filters | ClickUp date filters set | PUBLIC-DOC | Hypothesis / BEHIND |
| 67 | Filters | Milestone boolean filter (is / is not milestone) | ClickUp Milestone filter | PUBLIC-DOC | Hypothesis / BEHIND |
| 68 | Filters | Task-type filter (bug/story/custom types) | ClickUp Task type · Jira `type` | PUBLIC-DOC | Hypothesis / BEHIND · PARITY Type |
| 69 | Filters | Empty-field filters (unassigned, no due, no labels) | Jira IS EMPTY · Linear no-labels workaround documented · ClickUp “do not contain tags” | PUBLIC-DOC | Hypothesis / BEHIND |
| 70 | Filters | Dashboard/gadget powered by the same saved filter as the issue list | Jira filter → gadget · Linear advanced filters → dashboards (changelog) | PUBLIC-DOC | Hypothesis / BEHIND |

**Appended count:** 45 Hypothesis/PUBLIC-DOC rows (#26–#70).  
**Seed + hypothesis total:** 25 seed + 45 = **70** (target still ≥100 after UI walks).  
**UI-VERIFIED from this pass:** 0.

### Framing rules (PM)
- Mark every pitch drawn from this block as **Hypothesis / PUBLIC-DOC** until Build ships and preferably until a signed-in Direct walk confirms.
- Prefer citing `FILTERS-PUBLIC-DOCS.md` URLs over memory.
- Zoho/Asana Help SPA gaps: treat as thinner evidence; re-fetch Help bodies when ungated.

---

## Hypothesis / PUBLIC-DOC candidates (non-filter feature gaps) — 2026-10-01

**Source:** Official Help / Docs / Pricing / first-party feature pages only (WebSearch + WebFetch). **Not UI-VERIFIED.** Signed-in walks remain blocked (captcha / Chromium Error 9). Do not invent UI claims. Filter/search/view-grammar gaps stay in `#26–#70` / `FILTERS-PUBLIC-DOCS.md` — this block expands **other** sellable craft gaps.

| # | Theme | Reason (customer-facing when shipped) | Beats / matches | Evidence | Today |
| --- | --- | --- | --- | --- | --- |
| 71 | Views | Project Timeline view (week/month/quarter/year) with milestones + project dependency lines | Linear Timeline · monday Timeline/Gantt | https://linear.app/docs/timeline · https://monday.com/features/gantt | Hypothesis / PUBLIC-DOC / BEHIND |
| 72 | Views | Board swimlanes (2D group: columns × rows e.g. status × assignee/cycle/initiative) | Linear Board layout | https://linear.app/docs/board-layout | Hypothesis / PUBLIC-DOC / BEHIND |
| 73 | Views | Multi-view bar: List + Board + Calendar + Gantt + Timeline + Table as first-class project views | ClickUp Intro to views · Asana Timeline/Gantt (Starter+) | https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views · https://asana.com/pricing | Hypothesis / PUBLIC-DOC / BEHIND |
| 74 | Views | Gantt with task dependencies, milestones, critical path / baselines (PM scheduling) | monday Gantt · ClickUp Gantt | https://monday.com/features/gantt · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views | Hypothesis / PUBLIC-DOC / BEHIND |
| 75 | Views | Calendar view for deadline / schedule planning at Space/List/project level | ClickUp Calendar · Asana Calendar | https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views · https://asana.com/pricing | Hypothesis / PUBLIC-DOC / BEHIND |
| 76 | Workload | Workload / capacity view: group by assignee, measure tasks / estimates / points, day–week–month | ClickUp Workload · Asana Portfolio Workload · monday Workload (Pro+) | https://help.clickup.com/hc/en-us/articles/6310449699735-Use-Workload-view · https://asana.com/features/goals-reporting/portfolios · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Workload |
| 77 | Workload | Per-person capacity limits + availability vs capacity display + PTO / work-schedule aware | ClickUp Workload capacity · Asana OOO on workload | https://help.clickup.com/hc/en-us/articles/6310449699735-Use-Workload-view · https://help.asana.com/s/article/portfolio-workload-and-universal-workload | Hypothesis / PUBLIC-DOC / BEHIND · maps Workload |
| 78 | Workload | Cross-project / portfolio / universal workload (not single-project only) | Asana Portfolio + Universal workload · ClickUp Workspace Workload | https://asana.com/features/goals-reporting/portfolios · https://help.clickup.com/hc/en-us/articles/6310449699735-Use-Workload-view | Hypothesis / PUBLIC-DOC / BEHIND · maps Workload |
| 79 | Workload | Plan-level capacity + velocity for cross-team scheduling | Jira Plans capacity/velocity | https://support.atlassian.com/jira-software-cloud/docs/planning-tools-in-advanced-roadmaps/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Workload / Programs |
| 80 | Automations | Trigger + condition + action automation builder that actually fires (status/assignee/dates/templates) | ClickUp Automations · Jira Automation flows | https://help.clickup.com/hc/en-us/articles/6312102752791-Intro-to-Automations · https://support.atlassian.com/cloud-automation/docs/create-and-edit-jira-automation-rules/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Automations |
| 81 | Automations | Automation templates / recipe library + usage metering (actions/month) | Jira Use a template · ClickUp Manage Automations usage · monday plan action caps | https://support.atlassian.com/cloud-automation/docs/create-and-edit-jira-automation-rules/ · https://help.clickup.com/hc/en-us/articles/6312102752791-Intro-to-Automations · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Automations |
| 82 | Automations | Automations that create dependency relationships / apply templates on task create | ClickUp Automations + dependency article · task templates Apply via Automation | https://help.clickup.com/hc/en-us/articles/6312102752791-Intro-to-Automations · https://help.clickup.com/hc/en-us/articles/6309918176535-Use-task-templates | Hypothesis / PUBLIC-DOC / BEHIND · maps Automations / Templates |
| 83 | Automations | Triage Rules + Triage Intelligence for intake routing (team/assignee/label/priority) | Linear Triage | https://linear.app/docs/triage | Hypothesis / PUBLIC-DOC / BEHIND · maps Automations / Issues |
| 84 | Templates | Rich task template center: import assignees, checklists, deps, CF, dates, subtasks; default List template | ClickUp task templates | https://help.clickup.com/hc/en-us/articles/6309918176535-Use-task-templates | Hypothesis / PUBLIC-DOC / BEHIND · maps Templates |
| 85 | Templates | Remap start/due dates when applying Space/Folder/List or task templates | ClickUp Remap dates when applying templates | https://help.clickup.com/hc/en-us/articles/6309918176535-Use-task-templates | Hypothesis / PUBLIC-DOC / BEHIND · maps Templates / Projects |
| 86 | Templates | Document / wiki templates selectable on create | Linear Document templates · ClickUp Doc templates | https://linear.app/docs/documents · https://help.clickup.com/hc/en-us/articles/6328174371351-Intro-to-Docs | Hypothesis / PUBLIC-DOC / BEHIND · maps Templates / Docs |
| 87 | Goals / Portfolios | Initiatives (or Goals) grouping projects under company objectives with status/priority/health | Linear Initiatives · ClickUp Goals/OKRs · Asana Goals | https://linear.app/docs/initiatives · https://help.clickup.com/hc/en-us/articles/6327987972119-Use-ClickUp-to-track-goals-and-OKRs · https://asana.com/pricing | Hypothesis / PUBLIC-DOC / BEHIND · maps Portfolio / Goals |
| 88 | Goals / Portfolios | Nested portfolios (portfolio-of-portfolios) + bird's-eye project health | Asana nested portfolios | https://asana.com/features/goals-reporting/portfolios | Hypothesis / PUBLIC-DOC / BEHIND · maps Portfolio |
| 89 | Goals / Portfolios | Structured project/initiative updates: On track / At risk / Off track + Slack + reminders | Linear Initiative and Project updates · Asana portfolio status updates | https://linear.app/docs/initiative-and-project-updates · https://asana.com/features/goals-reporting/portfolios | Hypothesis / PUBLIC-DOC / BEHIND · maps Projects / Collaboration |
| 90 | Goals / Portfolios | Jira Plans: roll-up dates/estimates, warnings, auto-scheduler across spaces | Jira Plans planning tools | https://support.atlassian.com/jira-software-cloud/docs/planning-tools-in-advanced-roadmaps/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Portfolio / Programs |
| 91 | Reporting | Interactive Insights: measure × slice (cycle/lead/triage time, effort) + CSV share | Linear Insights | https://linear.app/docs/insights | Hypothesis / PUBLIC-DOC / BEHIND · maps Reports |
| 92 | Reporting | Drag-and-drop Dashboards with cards (charts, time tracked, portfolio) + scheduled PDF/email reports | ClickUp Dashboards · Asana reporting dashboards | https://help.clickup.com/hc/en-us/articles/6312197753239-Intro-to-Dashboards · https://asana.com/features/goals-reporting/reporting-dashboards | Hypothesis / PUBLIC-DOC / BEHIND · maps Reports |
| 93 | Reporting | Dashboard view living next to work (not only a separate Reports area) | ClickUp Dashboard view | https://help.clickup.com/hc/en-us/articles/6312197753239-Intro-to-Dashboards · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views | Hypothesis / PUBLIC-DOC / BEHIND · maps Reports |
| 94 | Reporting | Multi-board / multi-project dashboards + chart drill-down to underlying work | monday Pro multi-board dashboards · Asana interactive charts · ClickUp drill-down | https://monday.com/blog/product/how-much-does-monday-com-cost/ · https://asana.com/features/goals-reporting/reporting-dashboards · https://help.clickup.com/hc/en-us/articles/6312197753239-Intro-to-Dashboards | Hypothesis / PUBLIC-DOC / BEHIND · maps Reports |
| 95 | Client / Guest | Freelancer-friendly guest seats: edit on shared boards/lists without full member seat | monday Guest (Standard+) · Asana unlimited free guests (Starter+) · ClickUp guests | https://monday.com/blog/product/how-much-does-monday-com-cost/ · https://asana.com/pricing · https://help.clickup.com/hc/en-us/articles/36816939416983-Deliver-client-services-in-ClickUp | Hypothesis / PUBLIC-DOC / BEHIND · maps Client portal |
| 96 | Client / Guest | Client-facing Dashboard / simplified List for external status without email chasing | ClickUp client services guide · monday guest dashboards (plan-dependent) | https://help.clickup.com/hc/en-us/articles/36816939416983-Deliver-client-services-in-ClickUp · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Client portal / Reports |
| 97 | Client / Guest | Public Form intake → task/issue without requiring submitter account | Asana Forms (anyone can submit) · ClickUp Form view share/embed · JSM forms | https://asana.com/resources/asana-tips-intake-request-deliverable · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views · https://support.atlassian.com/jira-service-management-cloud/docs/what-are-forms/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Forms / Client portal |
| 98 | Collaboration | Native Docs/wikis attached to projects/issues with realtime collab, version history, inline comments | Linear Documents · ClickUp Docs | https://linear.app/docs/documents · https://help.clickup.com/hc/en-us/articles/6328174371351-Intro-to-Docs | Hypothesis / PUBLIC-DOC / BEHIND · maps Docs |
| 99 | Collaboration | Docs Hub / wiki as source-of-truth + public Doc share link for clients | ClickUp Docs Hub / public Doc view · monday unlimited workdocs (pricing) | https://help.clickup.com/hc/en-us/articles/6328174371351-Intro-to-Docs · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Docs / Client portal |
| 100 | Collaboration | Create tasks from Doc text / Whiteboard sticky notes (docs → Issues bridge) | ClickUp Docs + Whiteboard views | https://help.clickup.com/hc/en-us/articles/6328174371351-Intro-to-Docs · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views | Hypothesis / PUBLIC-DOC / BEHIND · maps Docs / Issues |
| 101 | Notifications | Document / project-update subscriptions + SLA breach Inbox/Slack alerts | Linear Documents subscriptions · SLA notifications · Project update Slack | https://linear.app/docs/documents · https://linear.app/docs/sla · https://linear.app/docs/initiative-and-project-updates | Hypothesis / PUBLIC-DOC / BEHIND · maps Notifications |
| 102 | Notifications | Dependency add/unlink/unblock notifications + close-with-incomplete-deps warning | ClickUp Dependency notifications / Dependency Warning | https://help.clickup.com/hc/en-us/articles/6309155073303-Intro-to-Dependency-Relationships | Hypothesis / PUBLIC-DOC / BEHIND · maps Notifications / Dependencies |
| 103 | Time tracking | Native time log on issues/tasks (estimate + remaining + work log) for freelancers/billing | Jira Log time · ClickUp time tracking · Asana Time tracking (Advanced+) · monday Time Tracking column (Pro+) | https://support.atlassian.com/jira-software-cloud/docs/log-time-on-an-issue/ · https://help.clickup.com/hc/en-us/articles/6304291811479-Intro-to-time-tracking · https://asana.com/pricing · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND |
| 104 | Time tracking | Timesheets + billable vs non-billable defaults + guest time-tracking permission | ClickUp timesheets / billable defaults / guest TT permissions | https://help.clickup.com/hc/en-us/articles/6304291811479-Intro-to-time-tracking | Hypothesis / PUBLIC-DOC / BEHIND |
| 105 | Time tracking | Time Tracked cards on Dashboards for billing / sprint planning | ClickUp Time Tracked in Dashboards | https://help.clickup.com/hc/en-us/articles/6312197753239-Intro-to-Dashboards | Hypothesis / PUBLIC-DOC / BEHIND · maps Reports |
| 106 | Dependencies | Issue blocking / blocked-by / related / duplicate relations in sidebar | Linear Issue relations · ClickUp Dependency Relationships · Asana task dependencies (Starter+) | https://linear.app/docs/issue-relations · https://help.clickup.com/hc/en-us/articles/6309155073303-Intro-to-Dependency-Relationships · https://asana.com/pricing | Hypothesis / PUBLIC-DOC / BEHIND · maps Issues |
| 107 | Dependencies | Project-level end→start dependencies on Timeline with violated (red) lines | Linear Project dependencies | https://linear.app/docs/project-dependencies · https://linear.app/docs/timeline | Hypothesis / PUBLIC-DOC / BEHIND · maps Projects / Milestones |
| 108 | Dependencies | Auto-reschedule dependent tasks when blocker dates move | ClickUp Reschedule Dependencies ClickApp | https://help.clickup.com/hc/en-us/articles/6309155073303-Intro-to-Dependency-Relationships | Hypothesis / PUBLIC-DOC / BEHIND |
| 109 | Milestones | First-class milestone markers (zero-duration checkpoints) on Timeline/Gantt + reports | Asana Milestones · monday Gantt milestones · ClickUp Milestone task type/Gantt | https://asana.com/resources/project-milestones · https://asana.com/pricing · https://monday.com/features/gantt · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views | Hypothesis / PUBLIC-DOC / BEHIND · maps Milestones |
| 110 | Milestones | Project milestones with progress toward milestone in project updates | Linear Timeline milestones · Project update progress toward milestones | https://linear.app/docs/timeline · https://linear.app/docs/initiative-and-project-updates | Hypothesis / PUBLIC-DOC / BEHIND · maps Milestones / Projects |
| 111 | Forms | Conditional / branching forms + field validation + embed/share link | JSM forms conditional logic · Asana Forms branching (Advanced+) · ClickUp Form view | https://support.atlassian.com/jira-service-management-cloud/docs/what-are-forms/ · https://asana.com/pricing · https://asana.com/resources/asana-tips-intake-request-deliverable · https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views | Hypothesis / PUBLIC-DOC / BEHIND · maps Forms |
| 112 | Forms | Link form fields to issue fields so automations/reporting stay in sync | JSM link form fields to Jira fields | https://support.atlassian.com/jira-service-management-cloud/docs/what-are-forms/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Forms / Automations |
| 113 | Approvals | Workflow approval steps (N-of-M approvers, approve/decline transitions) | Jira approval steps · Asana Approvals (Advanced+) | https://support.atlassian.com/jira-software-cloud/docs/set-up-approval-steps/ · https://asana.com/pricing · https://asana.com/resources/asana-tips-intake-request-deliverable | Hypothesis / PUBLIC-DOC / BEHIND · maps Approvals |
| 114 | Approvals | Approval task type with Approve / Request changes / Reject + proofing on attachments | Asana Approvals + proofing | https://asana.com/resources/asana-tips-intake-request-deliverable · https://asana.com/pricing | Hypothesis / PUBLIC-DOC / BEHIND · maps Approvals |
| 115 | Budgets | Project budgets / timesheets & budgets module (rate cards, budget vs actual) — careful pricing wedge | Asana Timesheets & Budgets add-on · Zoho Projects budget settings (indexed Help) | https://asana.com/pricing · https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/portal-configuration/articles/project-and-budget | Hypothesis / PUBLIC-DOC / BEHIND · maps Budget · *SPA/index thin for Zoho* |
| 116 | Delivery | Auto-repeating Cycles (1–8 weeks) with rollover, cooldown, capacity dial, calendar subscribe | Linear Cycles | https://linear.app/docs/use-cycles | Hypothesis / PUBLIC-DOC / BEHIND · maps Issues / Projects (cycles) |
| 117 | Delivery | Configurable SLAs with risk statuses, business-day clocks, breach notifications | Linear SLAs | https://linear.app/docs/sla | Hypothesis / PUBLIC-DOC / BEHIND · maps Issues / Ops |
| 118 | Delivery | Dedicated Triage inbox (accept/decline/duplicate/snooze) for integration + cross-team intake | Linear Triage | https://linear.app/docs/triage | Hypothesis / PUBLIC-DOC / BEHIND · maps Issues |
| 119 | Integrations | Hierarchy-scoped webhooks (task/Chat) + integration actions inside Automations | ClickUp task/Chat webhook Automations · Automations Integrations | https://help.clickup.com/hc/en-us/articles/6312102752791-Intro-to-Automations | Hypothesis / PUBLIC-DOC / BEHIND · maps Automations / Integrations |
| 120 | Permissions | Protect / private views; guest invite permissions; comment-only / view-only project scopes | ClickUp Protect view / private view · Asana guest invite permissions / comment-only · monday private boards (Pro+) | https://help.clickup.com/hc/en-us/articles/6329880717719-Intro-to-views · https://asana.com/pricing · https://monday.com/blog/product/how-much-does-monday-com-cost/ | Hypothesis / PUBLIC-DOC / BEHIND · maps Permissions / Client portal |

**Appended count (this pass):** 50 Hypothesis/PUBLIC-DOC rows (#71–#120).  
**Running total:** 25 seed + 45 filter-hypothesis (#26–#70) + 50 non-filter (#71–#120) = **120**.  
**UI-VERIFIED from this pass:** 0 (signed-in walks blocked).

### Appendix — coverage & caveats (PUBLIC-DOC expand, 2026-10-01 IST)

| Item | Notes |
| --- | --- |
| Final numbered count | **120** reasons in `100-REASONS.md` |
| Categories covered (#71+) | Views, Workload, Automations, Templates, Goals/Portfolios, Reporting, Client/Guest, Collaboration/Docs, Notifications, Time tracking, Dependencies, Milestones, Forms, Approvals, Budgets (careful), Delivery (Cycles/SLA/Triage), Integrations, Permissions |
| Filter rows | **Not duplicated** — `#26–#70` remain the filter inventory; see `FILTERS-PUBLIC-DOCS.md` |
| Evidence class | Every new row tagged **Hypothesis / PUBLIC-DOC**; cite Help/Docs/Pricing/feature pages only |
| monday.com Help | `support.monday.com` WebFetch blocked by Cloudflare bot check this pass — used first-party **pricing blog** + **features/gantt** pages instead |
| Asana Help Center | Several `help.asana.com` articles returned SPA/CSS shells — used **asana.com/features**, **asana.com/pricing**, **asana.com/resources** first-party pages |
| Zoho | Secondary Direct; Help SPA still thin — budget row cites indexed Help URL with caveat |
| Build craft map | Workload, Automations, Templates, Reports, Approvals, Budget, Client portal, Forms, Milestones, Docs, Permissions, Projects/Portfolio, Issues (deps/SLA/triage/cycles) |
| Upgrade path | Re-tag to sellable only after Build ships; optionally upgrade Evidence to UI-VERIFIED after ungated signed-in Direct walks |

