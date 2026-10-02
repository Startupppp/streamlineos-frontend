# Jira Cloud — Design UX notes

**Updated:** 2026-10-01  
**Status:** Auth chrome (prior) · **Filters UI-VERIFIED** · **Non-filter surfaces UI-VERIFIED** (signed-in `pxc-cijira2026100.atlassian.net`, team-managed free Kanban space **CI Jira** / `KAN`, free-only, no mutations, no payment opened)  
**CI SoT:** `/workspace/streamlineos-ci/competitor-deep/jira/` — `PAGE-INVENTORY.md` · `FEATURES.md` · `BUILD-GAPS.md` · `WALK-NOTES.json` · `evidence/`

## Filters — UI-VERIFIED (CI FEATURES)

| Pattern | Jira | Build | Design |
|---------|------|-------|--------|
| Basic: Space/Assignee/Type/Status + More (41) | Rich More picker (visible slice incl. **Affects versions**, Components, Due…) | 6 fields | **ADOPT** Labels/versions via More-class |
| Save filter + default pack | My open, Reported by me, … | URL only | **ADOPT** named + defaults |
| JQL | EMPTY, currentUser(), WAS, CHANGED, AND/OR | ❌ | **ADAPT** — power user; not F day-1 |
| Clear filters | VERIFIED | chips | PARITY |
| Result columns configurable | VERIFIED | Issues views | ADAPT |

**AVOID for Freelancer Now:** leading with JQL. **ADOPT for PM/PjM:** saved filters + currentUser defaults.

Evidence: `evidence/filters-basic-more-options.png`, `filters-jql-functions.png`, `filters-jql-operators.png`.

### Filter honesty — Affects versions ≠ Releases module

**Affects versions** appears in the Filters **More** picker on this free walk. That does **not** prove a Releases/Versions project surface. Direct `/settings/versions` and `/settings/components` **redirected to Settings → Details**; no Releases/Versions or Components nav in this team-managed space.

**UX-025 (Completeness Next):** ship Build **release membership + filter honesty** so “what’s in the ship?” is clear — **not** “we match Jira Releases module.” Do not market full Releases/Versions/Components chrome from company-managed depth as free-tier / freelancer day-1 table-stakes.

## Deeper surfaces — UI-VERIFIED (2026-10-01 CI pack)

Mirror Linear/ClickUp deep pattern: surface → what Jira free walk shows → Design take. Cite CI evidence paths; no invented UI.

| # | Surface | Jira (free team-managed walk) | Design take for Build | Gate / evidence |
|---|---------|-------------------------------|----------------------|-----------------|
| 1 | **Boards** | Kanban To Do / In Progress / In Review / Done; cards; search, Filter, Group, share, Automation | **ADOPT** opinionated board + fast triage, grouping, safe status transitions | Free · `evidence/board-kanban.png` · BG Boards |
| 2 | **Summary** | KPI cards (completed/updated/created/due-soon); status overview; Epic progress; Filter; **Reports** promotion | **ADOPT** project cockpit KPIs + deep links; **AVOID** promoting Reports that 404 | Free · `evidence/summary.png` |
| 3 | **List** | Project-scoped table; Search/Filter/Group; sortable cols; inline edits; 3 of 3 | **ADOPT** list/board parity + inline affordances | Free · `evidence/list.png` |
| 4 | **Development** | Beta delivery metrics (cycle/lead time, overdue, PRs, vulns…) + Related work tabs; all zeros, no provider | **ADAPT** optional integrations useful at zero data; transparent missing-provider empty | Free · `evidence/development.png` |
| 5 | **Plans** | Directory **“No plans yet”** + Create plan + getting-started guide — **no plan created** | **ADOPT** honest empty plan/roadmap shell + Create; **AVOID** claiming filled Plans / capacity craft as VERIFIED | Free empty shell · `evidence/plans.png` · UX-028 adjacent |
| 6 | **Dashboards** | Search; Owner/Space/Group filters; Create; Default dashboard sharing metadata | **ADOPT** composable free dashboards + permission-safe share | Free · `evidence/dashboards.png` |
| 7 | **Automation** | Flows / Audit log / Templates / Usage; starter recipes; Create flow; Global admin | **ADOPT** no-code trigger/action + templates + audit + usage limits | Free · `evidence/automation.png` |
| 8 | **Marketplace / Apps** | Explore apps; 1000+ catalog; Pricing/Trust/Categories/Use cases filters — nothing installed | **ADAPT** curated small catalog with clear free/paid labels; don’t clone Atlassian breadth | Free chrome · `evidence/marketplace.png` |
| 9 | **Project settings** | Details, Access, Notifications, Automation, Fields, Work types, Features, Custom filters, Timeline, Toolchain, Apps | **ADOPT** centralized governance; make capability gates discoverable **before** setup | Free · `evidence/project-settings.png`, `features-settings.png` |
| 10 | **Goals** | Atlassian Home Goals: 23 goals; All/My/Archived; Tag/Status/Owner/Team filters; Create first goal | **ADAPT** small free goal directory linked to work/KPIs — not day-1 Atlassian Home clone | Free via Home · `evidence/goals.png` |
| 11 | **Docs / Confluence** | Empty promotion: Try Confluence / Discover Confluence; no connected pages | **AVOID** Freeze Docs hub sprawl; **SHIP** linked project brief (same AVOID as ClickUp/Linear Docs) | Upsell empty · `evidence/docs.png` |
| 12 | **Filters** (already) | Basic + JQL + More + Save + defaults — see table above | Keep Filters ADOPT/ADAPT; version filter after membership | Free · filters evidence |

**Non-filter UI-verified count = 11 surfaces** (+ Filters already counted). Route probes / absences below are honesty locks — **not** inventable ship-sets.

## Route probes / absences — honesty locks (MUST preserve)

| Probe | UI result | Design note | Evidence |
|-------|-----------|-------------|----------|
| **Backlog** | `/boards/2/backlog` → **404** (“view does not exist”) | Do not claim backlog on this free team-managed Kanban | PAGE-INVENTORY |
| **Sprints** | Features: Sprints **disabled** — **“Requires a backlog”**; Estimation off; Standups on | **AVOID** dead-end sprint nav; make gating explicit if Build offers backlog→sprint | `evidence/features-settings.png` |
| **Releases / Versions** | No nav; `/settings/versions` → Details | **UX-025 ≠ match Jira Releases module.** Affects versions in Filters More only. Completeness Next = membership + filter honesty | PAGE-INVENTORY · FEATURES |
| **Components** | No nav; `/settings/components` → Details | Optional lightweight components = differentiator Later — **not** free-tier table-stakes from this walk | PAGE-INVENTORY |
| **Forms** | **Not** in project settings nav on this walk | Do not invent Jira Forms UI here; Build public Form Completeness Next still SHIP from ClickUp/Linear Asks framing | FEATURES Forms § |
| **Reports** | Summary promotes Reports → `/boards/2/reports` **404** | **AVOID** promote-then-404; **ADOPT** named report Create/Run that works (UX-030) | `evidence/summary.png` |
| **Plans filled** | Directory empty only | Program/roadmap craft = **shell**, not filled Plans. UX-028 = Build program↔project membership — **not** “we have Jira Plans filled” | `evidence/plans.png` |
| **Confluence payment** | Upsell empty; **no payment opened** | Don’t treat Confluence as day-1 Build Docs prerequisite | `evidence/docs.png` |

## Free-tier / team-managed gates — Design packaging rules

| Gate | Jira free team-managed walk | Design must |
|------|----------------------------|-------------|
| Plans | Present, **empty** (“No plans yet”) | Honest empty + Create; **not** filled capacity/roadmap claims |
| Releases / Versions / Components | **Absent** (routes → Details) | UX-025 = filter/membership honesty — **not** “match Releases module” |
| Backlog / Sprints | Backlog 404; Sprints requires backlog | Explicit gates; coherent backlog→sprint if offered |
| Forms | Not in settings nav | Don’t invent; SHIP free public Form from Completeness Next |
| Reports | Promoted → 404 | Don’t ship promote-then-404; UX-030 named reports |
| Docs | Confluence upsell empty | **AVOID** Freeze Docs hub; SHIP linked brief |
| Marketplace / See plans | Catalog + shell “See plans”; no payment wall opened | Explicit free boundary; curated integrations |
| Company-managed depth | **Not observed** on this walk | **AVOID** treating company-managed Jira depth as free-tier / freelancer day-1 table-stakes |

**Rule:** Design does **not** treat company-managed Releases/Components/Reports/Forms depth, or filled Plans, as Build day-1 table-stakes or freelancer desperation. Sell free board/list/summary/automation loop, honest empty Plans shell, release **membership + filter**, and free Form — not “we match Jira Software enterprise.”

## Completeness Next alignment (PM eng path — craft only)

Post-Freeze eng path (PM `ICP-ROADMAP-TOP15.md`): Labels · Active cycle · Member honesty · **Release** · Epic filter · saved views · Triage · **Program membership** · public Form.

| Completeness Next item | Jira deep relevance | Design status |
|------------------------|---------------------|---------------|
| Labels (UX-026) | More picker depth; Labels not the walk focus | Standing craft ADOPT |
| Active cycle (UX-024) | Sprints gated off (requires backlog) — Linear Cycles remains primary chrome reference | Craft ADOPT Linear; Jira sprint gate = honesty note |
| Member honesty | Settings Access present; not role-walked | Standing Completeness craft |
| **Release (UX-025)** | Affects versions in Filters More **UI-VERIFIED**; **no** Releases module on free team-managed | Craft = **membership + filter honesty** — **not** eng-done; **not** “match Releases module” |
| Epic filter (UX-027) | Summary Epic progress; JQL/More class | Craft ADOPT — **not** eng-done |
| Saved views | Save filter + default pack **UI-VERIFIED** | Craft ADOPT — **not** eng-done |
| Triage (UX-029) | n/a this walk | Completeness Next from Linear framing |
| **Program membership (UX-028)** | Plans directory empty shell only | Craft = real membership vs nest-only shell — **do not** claim filled Plans |
| Public Form | Forms **absent** from settings nav | Completeness Next #46 — free Form advantage vs missing Jira Forms here |

Freeze (PM-011 → PM-002 → PM-001) unchanged — Design does **not** claim Freeze items design-done or invent eng work.

## Deltas vs Filters-only Design notes

| Was (Filters-only) | Now (deep fold) |
|--------------------|-----------------|
| Filters ADOPT only | + Boards, Summary, List, Development, Plans empty, Dashboards, Automation, Marketplace, Settings, Goals, Docs |
| UX-025 “from Jira versions” vague | **Honesty:** Affects versions in More picker **yes**; Releases/Versions/Components surface **no** on free team-managed → UX-025 = membership + filter, not module parity |
| Plans unknown | Directory **UI-VERIFIED empty** — shell only; UX-028 stays Build membership craft |
| Reports as Jira strength | Summary promotes Reports → **404** here — promote-then-404 = AVOID |
| Docs unscored | Confluence upsell empty → **AVOID** Freeze Docs hub |
| No packaging stance on company-managed | Explicit **AVOID** company-managed depth as free/F day-1 table-stakes |
| Backlog/Sprints assumed | Backlog 404; Sprints “Requires a backlog” |

CI: `FEATURES.md` + `BUILD-GAPS.md` non-filter surfaces · `PAGE-INVENTORY.md` § Boards…Docs.
