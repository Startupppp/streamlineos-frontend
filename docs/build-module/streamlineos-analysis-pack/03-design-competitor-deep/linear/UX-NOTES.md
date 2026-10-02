# Linear — Design UX notes

**Updated:** 2026-10-01  
**Status:** Auth chrome (prior box) · **Filters UI-VERIFIED** · **15 non-filter surfaces UI-VERIFIED** (signed-in Tarunchintakunta / TAR, free-only, no mutations)  
**CI SoT:** `/workspace/streamlineos-ci/competitor-deep/linear/` — `PAGE-INVENTORY.md` · `FEATURES.md` · `BUILD-GAPS.md` · `WALK-NOTES.json` · `evidence/`

## Filters — UI-VERIFIED (CI FEATURES)

| Pattern | Linear | Build | Design |
|---------|--------|-------|--------|
| Labels in field menu | Bug/Feature/Improvement + No labels | ❌ UX-026 | **ADOPT** |
| Relations | Parent/sub/blocked/blocking/dup | ❌ UX-027 class | **ADOPT relation filter** |
| Dates | Due presets + custom timeframe **in** | Due From/To only | **ADOPT presets** |
| Advanced and/or nested | Advanced filter builder | Flat | **ADOPT** |
| AI filter | Prompt suggestions | ❌ | Diff Later |
| Custom Views | Create view builder | URL chips | **ADOPT named views** |
| Searchable field menu | Filter… search | Chooser search | **PARITY-seeking** |

Auth chrome (prior box walk): Google/email/SAML/passkey → Build OTP TENTATIVE BEHIND.

## Deeper surfaces — 15 UI-VERIFIED (2026-10-01 CI pack)

Mirror ClickUp deep pattern: surface → what Linear does → Design take. Cite CI evidence paths; no invented UI.

| # | Surface | Linear (free walk) | Design take for Build | Gate / evidence |
|---|---------|--------------------|----------------------|-----------------|
| 1 | **Inbox** | Unread badge + list/detail split; empty detail until select | **ADOPT** first-class notification inbox with unread + deep links | Free · `evidence/inbox.png` · BG-08 |
| 2 | **My issues** | Assigned / Created / Subscribed / Activity tabs; empty Assigned + Create CTA | **ADOPT** personal work tabs beyond single assignee list | Free · `evidence/my-issues.png` · BG-09 |
| 3 | **Projects** | Workspace All projects empty; New project + Documentation | **ADOPT** project shell + list + docs entry (parity check) | Free · `evidence/projects.png` · BG-10 |
| 4 | **Views / Custom Views** | WS + team Views; Issues/Projects tabs; New view builder (name/desc/scope) — opened & cancelled | **ADOPT** named saved views (personal/shared lifecycle) | Free · `evidence/views.png`, `custom-view-builder.png` · BG-11 · Completeness Next #31 |
| 5 | **Agent** | New chat · Ask Linear · Skills · example prompts; Agent Enabled; Usage $0.00 | **ADAPT** safe auditable assistant Later; **AVOID** day-1 “Agent = Code Intelligence” | Agent free-ish · Code Intelligence **Business** · `evidence/agent.png`, `ai-agents.png` · BG-14/22 |
| 6 | **Team overview** | Overview / Documents / Members; resources + links to Issues/Projects/Views | **ADOPT** lightweight team home + resource links | Free · `evidence/team-overview.png` |
| 7 | **Team Documents** | Empty team docs; New/Create document | **AVOID** Freeze Docs hub sprawl; **SHIP** linked project brief instead (same AVOID as ClickUp Docs) | Free · `evidence/team-documents.png` · BG-13 |
| 8 | **Cycles** | Dedicated Cycles route; “This team has no cycles.” — no paywall on page | **ADOPT** cycle nav + honest no-cycles empty **before** create/edit; deepen active-cycle chrome (UX-024) Completeness Next | Free · `evidence/cycles.png` · BG-12 |
| 9 | **Integrations / GitHub** | GitHub detail: PR workflows, review, sync, Agent codebase; Enable visible (not clicked) | **ADAPT** GitHub issue/PR linking + small discoverable catalog | Free surface · `evidence/github-settings.png` · BG-15 |
| 10 | **Integrations catalog** | Searchable catalog: Essentials, Agents, AI clients, Engineering, Automations, Analytics… | **ADAPT** small free catalog; don’t clone Linear breadth | Free · `evidence/integrations-catalog.png` · BG-15/21 |
| 11 | **Issue Templates** | “No issue templates” + New template (Project Templates in nav) | **ADOPT** reusable issue templates with **no paid prerequisite** | Free · `evidence/issue-templates.png` · BG-16 |
| 12 | **SLAs** | Copy + “available on Business and Enterprise”; Start free trial; Add rule **disabled** | **AVOID** treating Business SLA as day-1 table-stakes / freelancer desperation; **SHIP** transparent free deadline/risk badges with limits (BUILD ADVANTAGE framing) | **Business+** · `evidence/slas.png` · BG-20 |
| 13 | **Initiatives** | Enable Initiatives **off**; update controls inactive while disabled | **AVOID** day-1 Initiatives clone; product decision — free strategy layer or explicit defer (BG-17) | Disabled on walk · `evidence/initiatives.png` |
| 14 | **Asks** | Structured Slack/email intake; “available on Business or Enterprise”; Start free trial only | **AVOID** Business Asks as day-1 desperation; **SHIP** free structured intake / public Form (Completeness Next #46) as BUILD ADVANTAGE | **Business+** · `evidence/asks.png` · BG-19 |
| 15 | **AI & Agents** | Linear Agent Enabled; Coding sessions “Available on Basic”; Code Intelligence “Available on Business”; Loops Business banner | **ADAPT** packaging honesty: basic agent free-ok; reserve heavy code intelligence for deliberate paid boundary — **not** freelancer day-1 | Code Intelligence **Business** · `evidence/ai-agents.png` · BG-22 |

**Non-filter UI-verified count = 15** (CI PAGE-INVENTORY). Excludes route probes below.

## Route probes — not counted as surfaces

| Probe | UI result | Design note | Evidence |
|-------|-----------|-------------|----------|
| **Triage** `/team/TAR/triage` | Redirect → All issues; no separate Triage queue/controls | Availability observation only — **not** proof Linear lacks triage. Completeness Next still **SHIP** Triage ritual (UX-029) from docs + product need; walk did **not** UI-verify Accept/Decline/Snooze on free WS | `evidence/triage-redirect-all-issues.png` |
| **Roadmap** team + WS | Team Roadmap **Not found**; WS `/roadmap` → Projects | Do not market “Linear has no roadmap” universally; free WS had no roadmap artifact | `evidence/not-found-insights-roadmap.png` |
| **Insights** | `/insights` **Not found**; analytics via Integrations add-ons | Native free insights/dashboard = BUILD ADVANTAGE opportunity (BG-18) — not HAVE | `evidence/not-found-insights-roadmap.png` |

## Free-tier / Business+ gates — Design packaging rules

| Gate | Linear free walk | Design must |
|------|------------------|-------------|
| SLAs / SLA rules | Business + Enterprise; Add rule disabled | **NOT** day-1 table-stakes · **NOT** freelancer desperation |
| Asks intake | Business or Enterprise | **NOT** day-1 · Prefer free public Form / structured intake SHIP |
| Initiatives | Toggle off / inactive | **NOT** day-1 strategy clone |
| Code Intelligence (+ Loops banner) | Business (+ Enterprise) | **NOT** day-1 AI table-stakes |
| Cycles / Templates / Inbox / My issues / Views / Docs / Projects | Present on free | Fair parity targets without paywall cosplay |
| Triage / Roadmap / Insights | Redirect / Not found on this free WS | Cite as route outcome; don’t invent paid UI |

**Rule:** Design does **not** treat Business+ Linear features as Build day-1 table-stakes or freelancer desperation. Sell free structured intake, free deadline honesty, and free cycle chrome — not “we match Linear Business.”

## Completeness Next alignment (PM eng path — craft only)

Post-Freeze eng path (PM `ICP-ROADMAP-TOP15.md`): Labels · Active cycle · Member honesty · Release · Epic filter · saved views · Triage · Program membership · public Form.

| Completeness Next item | Linear deep relevance | Design status |
|------------------------|----------------------|---------------|
| Labels (UX-026) | Labels in filter menu UI-VERIFIED | Craft ADOPT — **not** eng-done |
| Active cycle (UX-024) | Cycles page + no-cycles empty UI-VERIFIED | Craft ADOPT chrome — **not** eng-done |
| Member honesty | Guest/Member norms (prior); not re-walked here | Standing Completeness craft |
| Release (UX-025) | Releases in settings nav only — **not** membership walk | **Jira deep folded:** Affects versions in More **yes**; Releases surface **no** on free team-managed — UX-025 = membership+filter honesty, not module parity |
| Epic filter (UX-027) | Relations→Parent UI-VERIFIED (Filters) | Craft ADOPT — **not** eng-done |
| Saved views | Custom Views builder UI-VERIFIED | Craft ADOPT — **not** eng-done |
| Triage (UX-029) | Route redirected on free WS | SHIP ritual still; surface **not** UI-verified here |
| Program membership (UX-028) | n/a Linear | **Jira Plans** directory empty (“No plans yet”) — Build UX-028 membership craft; not filled Plans |
| Public Form | Asks = Business+ → free Form = advantage | Completeness Next #46 craft — **not** eng-done |

Freeze (PM-011 → PM-002 → PM-001) unchanged — Design does **not** claim Freeze items design-done or invent eng work.

## Deltas vs Filters-only Design notes

| Was (Filters-only) | Now (deep fold) |
|--------------------|-----------------|
| Custom Views ADOPT from builder peek | Confirmed workspace + team Views empty + builder; Completeness Next named views |
| Cycles Hypothesis from public docs | **Walk-confirmed** dedicated free Cycles route + no-cycles empty |
| Triage Hypothesis from docs | Free WS **redirect** — keep SHIP Triage for Completeness Next; don’t claim Linear Triage UI-VERIFIED |
| No packaging stance on SLA/Asks/AI | Explicit **AVOID** Business+ as day-1 / freelancer desperation |
| Docs not scored | Team Documents free → **AVOID** Freeze Docs hub; SHIP linked brief |
| Insights/Roadmap unknown | Not found on free WS → free native insights = opportunity, not HAVE |

CI: `FEATURES.md` + `BUILD-GAPS.md` beyond-Filters BG-08…BG-22 · `PAGE-INVENTORY.md` § Beyond Filters.
