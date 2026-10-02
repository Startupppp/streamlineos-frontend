# Design-framed reasons (contribute to 100+)

**Status:** SEED aligned to CI `100-REASONS.md` rows 1–25 + Design depth adds  
**ICP voice:** freelancers · product managers · project managers  
**Rule:** Customer-facing copy only after ship; until then = gap to close  
**Updated:** 2026-10-01

## Mapped from CI seed (Design craft angle)

| # | Design reason (gap→future sell) | ICP | UX pattern | Build ID |
|---|--------------------------------|-----|------------|----------|
| 1 | Cold invite lands you in Build every time | All | Activation honesty | BUG-001 / PM-011 |
| 2 | Invite already includes Build access | All | Activation | PM-002 |
| 3 | Client grant opens a real guest link | Freelancer / PjM | Client wedge | PM-001 |
| 4 | Members can request Client Access | PjM | Client wedge | BUG-004 |
| 5 | Publish client portal asks for confirm | All | Destructive honesty | UX-031 |
| 6 | Grant Access project list loads | Freelancer / PjM | Client wedge | BUG-006 |
| 7 | Active cycle feels like Linear Cycles | PM | Delivery chrome | UX-024 |
| 8 | Triage goes empty → rules that work | PM | Triage | UX-029 |
| 9 | Issues belong to Releases for real | PM / PjM | Release depth | UX-025 |
| 10 | Programs actually contain projects | PjM | Hierarchy | UX-028 |
| 11 | Milestones link to issues | PjM | Milestone depth | Milestones |
| 12 | Filter issues by Labels + Epic | PM | Filters | UX-026/027 |
| 13 | Template gallery for ICP Quick Starts | Freelancer / PjM | Activation packs | Templates |
| 14 | Create & run named reports | PM / PjM | Insights | UX-030 |
| 15 | Org-wide reports, not only project | PjM / PM | Insights | Reports |
| 16 | Org Budget page that isn’t 404 | PjM | Finance | Budget |
| 17 | New Form doesn’t trap an untitled draft | All | Safety | UX-032 |
| 18 | Automations fire after you create them | All | Extensibility | Automations |
| 19 | Webhooks deliver | All | Extensibility | Webhooks |
| 20 | Password/SSO alongside OTP | All | Auth trust | CI-060 |
| 21 | Viewer vs Member labels match power | All | Role honesty | CW-001/002 |
| 22 | Default Member can create issues | PM / Freelancer | Role honesty | Member T24 |
| 23 | Portfolio depth beyond a link | PjM | Hierarchy | Portfolio |
| 24 | QA runs usable if you need test mgmt | Niche | Ops | Ops pack |
| 25 | Incidents with live SLA if you need ITSM | Niche | Ops | Ops pack |

## Design depth adds (26–45) — craft/system reasons

| # | Design reason (gap→future sell) | ICP | Pattern | Notes |
|---|--------------------------------|-----|---------|-------|
| 26 | Empty states never look like access denied | All | Empty vs deny | Themes; Account B OTP will prove |
| 27 | Projects list shows memberships you’re on | All | Role honesty | UX-022 S1 |
| 28 | Create menu is permission-aware | All | Role honesty | UX-023 |
| 29 | More-tools searchable / progressive | Freelancer / PM | Density | UX-010 |
| 30 | FilterBar tokens consistent across objects | PM / PjM | Filter system | Themes #2 |
| 31 | Loading resolves to skeleton→empty fast | All | Perceived quality | Themes #5 |
| 32 | Issue↔cycle link + active-cycle chrome | PM | Delivery | CW-004 / UX-024 |
| 33 | Issue↔epic verified + epic filter | PM | Delivery | Epic depth |
| 34 | Due Dates filter usable on issues | Freelancer / PjM | Delivery | Due Dates census |
| 35 | Workload view readable for capacity | PjM | Capacity | Workload census — score vs monday/Asana |
| 36 | Risks + Decisions feel like decision log | PjM | Governance | RISKS-DECISIONS — score vs Directs |
| 37 | Workflow editor understandable | PM | Process | Workflow census |
| 38 | Approvals queue clear empty→action | PjM | Governance | Approvals craft |
| 39 | Client portal unpublished chrome honest | Freelancer | Client | CLIENT-PORTAL-CHROME |
| 40 | Module Admin craft matches create power | Admin ICP adjacent | Roles | MA promote 80/80 |
| 41 | Modules shell not mistaken for full suite | All | IA honesty | MODULES empty+create PARITY-seeking |
| 42 | Danger Zone type-to-confirm | All | Destructive | Themes #7 UNTESTED |
| 43 | Board/List/Table/Timeline kept as strength | PM / Freelancer | Views | Themes #3 LEAD candidate |
| 44 | Calendar suite seam labeled | All | IA honesty | Themes #3 |
| 45 | Template apply seeds a real project | Freelancer | Activation | TEMPLATE-APPLY verified |

## Next Design adds (46+) — wait for CI walks

- Linear: **deep UI-VERIFIED** folded (`linear/UX-NOTES.md`) — remaining: Triage ritual UI (redirect on free), keyboard density, issue peek  
- ClickUp: Everything view, Docs/Whiteboards sprawl AVOID notes, Forms, Dashboards, guest  
- Jira: **deep UI-VERIFIED** folded (`jira/UX-NOTES.md`) — Filters + Boards/Summary/List/Development/Plans empty/Dashboards/Automation/Marketplace/Settings/Goals/Docs; honesty locks on Releases/Backlog/Sprints/Forms/Reports  
- monday: Board columns, dashboards, guest/client — **still open**  
- Asana: Portfolios, Workload, Rules, guest — **NEED SIGNED-IN** (onboarding blocked)  

Target: push Design-framed rows until CI+PM+Design shared list ≥100 evidence-backed gaps.

## Phase-3 craft adds (46–70) — Build UX-IDs as future sell reasons

| # | Design reason (gap→future sell) | ICP | Pattern | Build ID |
|---|--------------------------------|-----|---------|----------|
| 46 | Stay signed in / restore callback after OTP | All | Auth trust | UX-001 |
| 47 | Org setup defaults goal=Build; skip to first project | Freelancer | Activation | UX-002 |
| 48 | Dashboard prioritises Set up Build over suite noise | All | Home honesty | UX-003 |
| 49 | Strong All Projects empty state preserved | Freelancer | EmptyState LEAD | UX-004 |
| 50 | Project wizard: Blank+Simple smart defaults | Freelancer | Activation | UX-005 |
| 51 | Project home: Create issue above fold when 0 | Freelancer / PM | First value | UX-006 |
| 52 | Issues Board multi-view kept + keyboard DnD | PM | Views LEAD | UX-007 |
| 53 | Cycles empty teaches “timeboxes for planning” | PM | Empty education | UX-008 |
| 54 | Client portal publish checklist + guest preview | Freelancer / PjM | Client wedge | UX-009 |
| 55 | More-tools grouped Plan/Build/Quality/Connect + search | All | Density | UX-010 |
| 56 | Build role presets (not 44 roles day-1) | PjM / Admin | Roles | UX-011 |
| 57 | Org settings vs Build settings labeled | All | IA | UX-012 |
| 58 | Human entitlement states (no silent 402) | All | Billing trust | UX-013 |
| 59 | Import surfaced from empty Issues | Freelancer / PjM | Activation | UX-014 |
| 60 | Utility rail never obscures primary CTA | All | Chrome | UX-015 |
| 61 | Invite accept form always renders (not white pane) | All | Activation | UX-016 |
| 62 | Already-active Member invite has clear next step | All | Activation | UX-016b |
| 63 | Invite → Build access, not permission dead-end | All | Activation | UX-017 |
| 64 | Member Client Access empty has Request CTA | PjM | Client | UX-018 |
| 65 | Invite Client never silent-closes | Freelancer | Client | UX-019 |
| 66 | Grant Access recovers when projects fail to load | Freelancer | Client | UX-020 |
| 67 | Dual host invite (apex+www) behaves one way | All | Activation | Tester open |
| 68 | FilterBar chips feel like one system | PM / PjM | Filters | Themes #2 |
| 69 | Reports Overview filled path stays honest | PM | Insights | REPORTS-CRAFT |
| 70 | Modules empty+create never oversells suite apps | All | IA honesty | MODULES |

**Design-framed count this file:** 100 (seed + depth + phase-3 + Linear docs + ClickUp docs). Shared CI seed still 25 until CI merges; PM framed 55.

## Ownership note vs PM pack
PM owns ICP/JTBD + customer copy (`/workspace/streamlineos-pm/competitor-deep/`). Design owns pattern cards, surface craft, and Design-framed reason rows here. Both fold CI walks; neither invents signed-in page facts.

## Linear public-docs adds (71–80) — Hypothesis until CI walk

| # | Design reason (gap→future sell) | ICP | Pattern | Source |
|---|--------------------------------|-----|---------|--------|
| 71 | Triage inbox with Accept / Decline / Snooze | PM | Triage ritual | linear.app/docs/triage |
| 72 | Triage excluded from normal boards until accepted | PM | Workflow honesty | docs/triage |
| 73 | Triage rules auto-route team/label/priority | PM | Automation | docs/triage |
| 74 | Optional require priority before leaving Triage | PM | Quality gate | docs/triage |
| 75 | Display options: Set as default for workspace | PM / PjM | Views | docs/display-options |
| 76 | Group issues by cycle / label / release | PM | Filters/group | docs/display-options + UX-026 |
| 77 | Board sub-grouping / swimlanes | PjM / PM | Density | docs/display-options |
| 78 | Toggle show empty groups | PM | Board honesty | docs/display-options |
| 79 | Card property visibility toggles | All | Density | docs/display-options |
| 80 | Issue relations blocked/blocking/related/duplicate | PM | Delivery graph | docs index |

**Running Design-framed count:** 80. Still folding ClickUp/Jira/monday/Asana + CI walks to clear 100+.

## Linear Cycles public-docs adds (81–90) — Hypothesis (use-cycles / cycle-graph)

| # | Design reason (gap→future sell) | ICP | Pattern | Source |
|---|--------------------------------|-----|---------|--------|
| 81 | Auto-created upcoming cycles (1–8 week cadence) | PM | Cycles | linear.app/docs/use-cycles |
| 82 | Cooldown between cycles (no assign) | PM | Cadence health | use-cycles |
| 83 | Current vs upcoming vs past Cycles list in nav | PM | Active-cycle chrome | update-cycles · UX-024 |
| 84 | Cycle scope + progress graph (target vs complete) | PM | Delivery signal | cycle-graph |
| 85 | Issues roll forward unfinished automatically | PM | Cadence honesty | use-cycles / method |
| 86 | Edit cycle name/description for focus | PM | Ritual | update-cycles |
| 87 | Estimates feed cycle scope (or issue count fallback) | PM | Planning | cycle-graph |
| 88 | Cycle success % (completed + started weighting) | PM | Insights | cycle-graph FAQ |
| 89 | Keyboard open cycle sidebar graph (`Cmd/Ctrl` `I`) | PM | Speed | cycle-graph |
| 90 | Cycles independent of Releases (don’t conflate) | PM / PjM | IA honesty | use-cycles |

**Running Design-framed count:** 90.

## ClickUp public-docs adds (91–100) — Hypothesis until CI walk

| # | Design reason (gap→future sell) | ICP | Pattern | Source |
|---|--------------------------------|-----|---------|--------|
| 91 | Template Center with Featured + filters (type/use case/tags) | Freelancer / PjM | Gallery | ClickUp Intro to templates |
| 92 | Template preview images before apply | Freelancer | Trust | Intro to templates |
| 93 | Default template auto-applies to new issues in a list | PM / Freelancer | Activation | Intro to templates |
| 94 | Remap start/due dates when applying a template | Freelancer / PjM | Speed | Intro to templates |
| 95 | Guest “Shared with me” only — never full workspace tree | Freelancer / PjM | Client honesty | ClickUp guest help |
| 96 | Explicit View-only vs editable guest types | Freelancer | Role honesty | guest help |
| 97 | Forms pinned as a View (not only More-tools bury) | Freelancer / PM | Intake IA | Customizable features |
| 98 | Optional ClickApps — enable only what ICP needs | All | Density / UX-010 | Customizable features |
| 99 | My Work / My Tasks hub for day’s priorities | Freelancer / PM | Focus | guest/My Tasks |
| 100 | Don’t ship Docs/Chat/Whiteboard hubs to win Build wedge | All | AVOID sprawl | guest hubs · council Not Now |

**Design-framed count: 100** (public-docs era). Filters 101–112 + Linear deep 113–124 + Jira deep 125–136 = walk-confirmed extensions. Next: monday/Asana signed-in.

## Filter walk-confirmed upgrades (101–112 → UI-VERIFIED craft) — 2026-10-01

CI signed-in FEATURES for ClickUp / Linear / Jira. Design upgrades (align with PM FILTERS #101–112):

| # | Design reason | Direct evidence | Build gap |
|---|---------------|-----------------|-----------|
| 101 | Labels/Tags on Issues FilterBar | ClickUp Tags · Linear Labels | UX-026 |
| 102 | Epic/parent/relation filter | Linear Relations · Jira More/JQL | UX-027 |
| 103 | Is set / Is not set operators | ClickUp Tags/Due | Operator depth |
| 104 | AND/OR between filter clauses | ClickUp · Linear Advanced · Jira JQL | Flat chips only |
| 105 | Nested filter groups | ClickUp nested · Linear nested | Absent |
| 106 | Named saved filters / Custom views | ClickUp Saved · Linear Views · Jira Save | URL only |
| 107 | Default “My open / Me” pack | Jira defaults · ClickUp Me Mode · Linear Current user | Weak Me ritual |
| 108 | Due presets (Overdue, this week…) | Linear Due presets | From/To only |
| 109 | Multi-view same filter panel | ClickUp List/Board/Table | Keep Issues multi-view |
| 110 | Searchable filter field picker | Linear · ClickUp | Chooser OK — deepen |
| 111 | Release/version filter (after membership) | Jira Affects versions | UX-025 + filter |
| 112 | Progressive power (JQL/Advanced) behind Basic | Jira Basic↔JQL · Linear Advanced | Don’t lead with JQL for F |

**Filter craft status:** ClickUp/Linear/Jira = **UI-VERIFIED**. Asana/monday still Hypothesis/NEED SIGNED-IN. Jira Affects versions in More = filter facet only — see deep row 132 for Releases-module honesty.

## Linear deep walk-confirmed (113–124) — 2026-10-01 CI pack

CI signed-in beyond-Filters: 15 surfaces + free-tier gates. Design ADOPT/ADAPT/AVOID (cite `linear/UX-NOTES.md` + CI evidence):

| # | Design reason | Verdict | CI evidence |
|---|---------------|---------|-------------|
| 113 | Notification Inbox with unread + list/detail | **ADOPT** | `evidence/inbox.png` · BG-08 |
| 114 | My-work tabs Assigned/Created/Subscribed/Activity | **ADOPT** | `evidence/my-issues.png` · BG-09 |
| 115 | Named Custom Views builder (name/desc/scope) free | **ADOPT** Completeness Next | `custom-view-builder.png` · BG-11 |
| 116 | Cycles nav + honest “no cycles” empty (free) | **ADOPT** before create flows · UX-024 chrome Next | `evidence/cycles.png` · BG-12 |
| 117 | Free issue templates (no paid gate) | **ADOPT** | `evidence/issue-templates.png` · BG-16 |
| 118 | Business+ SLA as day-1 / freelancer desperation | **AVOID**; SHIP free deadline honesty with limits | `evidence/slas.png` · BG-20 |
| 119 | Business+ Asks as day-1 intake | **AVOID**; SHIP free public Form Completeness Next | `evidence/asks.png` · BG-19 |
| 120 | Code Intelligence / Loops as day-1 AI | **AVOID**; Agent Enabled ≠ Code Intelligence | `evidence/ai-agents.png` · BG-22 |
| 121 | Initiatives / Roadmap as day-1 strategy layer | **AVOID** / defer — Initiatives off; Roadmap Not found free WS | `initiatives.png`, `not-found-insights-roadmap.png` · BG-17 |
| 122 | Native free insights vs add-on analytics | **ADAPT** opportunity (not HAVE) | Insights Not found · BG-18 |
| 123 | Team Documents hub in Freeze | **AVOID** sprawl; SHIP linked project brief | `evidence/team-documents.png` · BG-13 |
| 124 | Triage Accept/Decline/Snooze ritual | **ADOPT** Completeness Next — free WS redirected; surface **not** UI-verified | `triage-redirect-all-issues.png` · UX-029 |

**Linear deep status:** Filters + 15 non-filter surfaces **UI-VERIFIED**. Triage/Roadmap/Insights = route outcomes only. Business+ gates documented — Design must not treat them as day-1 table-stakes.

## Jira deep walk-confirmed (125–136) — 2026-10-01 CI pack

CI signed-in beyond-Filters: Boards · Summary · List · Development · Plans (empty) · Dashboards · Automation · Marketplace · Settings · Goals · Docs + honesty locks. Design ADOPT/ADAPT/AVOID (cite `jira/UX-NOTES.md` + CI evidence):

| # | Design reason | Verdict | CI evidence |
|---|---------------|---------|-------------|
| 125 | Opinionated Kanban board + Filter/Group/Automation | **ADOPT** | `evidence/board-kanban.png` |
| 126 | Project Summary KPIs + Epic progress (no promote-then-404) | **ADOPT** KPIs; **AVOID** Reports CTA→404 | `evidence/summary.png` |
| 127 | Project List with inline edits + list/board parity | **ADOPT** | `evidence/list.png` |
| 128 | Dev metrics useful at zero provider data | **ADAPT** optional integrations + honest empty | `evidence/development.png` |
| 129 | Plans directory honest empty (“No plans yet”) — not filled Plans | **ADOPT** empty shell; **AVOID** filled Plans claim · UX-028 = membership craft | `evidence/plans.png` |
| 130 | Free dashboards Create + Owner/Space share metadata | **ADOPT** | `evidence/dashboards.png` |
| 131 | Automation Flows + Templates + Audit + Usage | **ADOPT** | `evidence/automation.png` |
| 132 | UX-025 = release membership + filter — **not** “match Releases module” | **ADAPT** honesty: Affects versions in More **yes**; Versions/Components surface **no** on free team-managed | filters-basic-more-options.png · PAGE-INVENTORY |
| 133 | Backlog/Sprints coherent gating (no 404 / “Requires a backlog” dead-end) | **ADAPT** Build opportunity; **AVOID** dead-end nav | `evidence/features-settings.png` |
| 134 | Confluence Docs hub in Freeze | **AVOID** sprawl; SHIP linked project brief | `evidence/docs.png` |
| 135 | Company-managed Jira depth as free/F day-1 table-stakes | **AVOID** | Free-only walk · ACCOUNT.md · BUILD-GAPS |
| 136 | Forms absent from settings — free public Form still Completeness Next | **ADOPT** Form SHIP; **AVOID** inventing Jira Forms UI from this walk | FEATURES Forms § |

**Jira deep status:** Filters + 11 non-filter surfaces **UI-VERIFIED**. Releases/Versions/Components/Backlog/Forms/Reports-filled = absences or 404 — honesty locks. Plans = empty directory only. Company-managed depth **not** day-1 table-stakes.

**Next fold:** monday/Asana signed-in · keep Completeness Next craft language aligned to PM eng path without claiming eng-done.
