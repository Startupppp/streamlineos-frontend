# 100 Wow Reasons — StreamlineOS Build (Aditya bar)
**Lane:** CI competitor-deep · **Updated:** 2026-10-01 ~18:30 IST
**ICP:** Freelancers (F) · Product managers (PM) · Project managers (PjM)
**Freeze:** unchanged (PM-011 → PM-002 → PM-001). **No eng.** This file reframes competitive reasons only.

## Bar (reject / accept)

| REJECT as invalid | VALID only if |
| --- | --- |
| “all-in-one”, “cheaper”, “modern UI”, “suite platform”, generic marketing | **HAVE** — Build/suite already has something Directs (Linear / ClickUp / Jira / monday / Asana) **largely lack**, with VERIFIED/REPORTED evidence |
| Table-stakes parity restated as wow (Status/Priority/Assignee already present, multi-view already PARITY, etc.) | **SHIP** — concrete feature Build must implement; F/PM/PjM desperately need it; clear win vs named Direct(s) once shipped |
| Invented signed-in Direct UI | Evidence from Build ledger / BUG / UX / CI FEATURES dumps / PUBLIC docs only |
| Client portal as UNIQUE HAVE today | **SHIP** or **HAVE-conditional** until grant→guest VERIFIED |
| Filters Completeness Next top-8 as HAVE | Those are **SHIP** (Build lacks them) |

## Confidence legend

| Tag | Meaning |
| --- | --- |
| **VERIFIED** | Build craft observed (Owner/Member ledger, Design census) |
| **UI-VERIFIED** | Signed-in Direct walk in CI `FEATURES.md` / evidence PNGs |
| **REPORTED** | Official public Help/Docs/Pricing cited (no invented UI) |
| **Hypothesis** | Public-doc or inferred; not walk-confirmed — keep provisional |

## Completeness Next — Filters top-8 (all SHIP, not HAVE)

| Rank | Feature | Evidence |
| --- | --- | --- |
| 1 | Labels / Tags on Issues FilterBar | UX-026 · FILTERS-BUILD-CRAFT · Linear Labels + ClickUp Tags **UI-VERIFIED** |
| 2 | Epic *relation* filter (“in epic X”) | UX-027 · Linear Relations→Parent **UI-VERIFIED** |
| 3 | Release / version membership filter | UX-025 tie · Jira Affects versions **UI-VERIFIED** |
| 4 | Named saved filters / Custom Views | ClickUp Saved filters · Linear Custom Views · Jira Save filter **UI-VERIFIED** |
| 5 | Operators beyond equality (is / is not / empty) | ClickUp Is/Is not/Is set **UI-VERIFIED** |
| 6 | AND / OR + nested filter groups | ClickUp + Linear Advanced nest **UI-VERIFIED** |
| 7 | Relative due presets (Today / This week / …) | Linear Due presets **UI-VERIFIED**; Build absolute From–To only |
| 8 | Me / Me Mode / Assigned-to-me quick filter | ClickUp Me + Me Mode · Linear Current user · Jira `currentUser()` **UI-VERIFIED** |

---

## Master table (HAVE + SHIP)

| # | Bucket | Customer desperate need (one line) | Feature | Why Directs fail / miss | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | SHIP | Teammate invite must land in Build, not blank/OTP roulette | Cold invite accept → reliable Build entry | Linear/ClickUp/Jira invite→workspace is table-stakes trust; Build cold path broken | BUG-001 · PM-011 · `100-REASONS` #1 | VERIFIED |
| 2 | SHIP | Invited collaborator can open `/build` without a Roles chase | Invite grants Build module access automatically | Linear/ClickUp workspace access on accept; Build needs manual Roles (BUG-002) | BUG-002 · PM-002 | VERIFIED |
| 3 | SHIP | Client share must yield a real guest entry, never a false-success toast | Atomic client grant → guest magic-link | Zoho Client Users / monday+ClickUp guests / JSM portals work; Build grant path dead | PM-001 · BUG-005/006 · CLIENT-PORTAL-CHROME | VERIFIED |
| 4 | SHIP | Member who cannot grant can still *request* Client Access | Member Client Access request CTA | Permission-gated admin is fine; empty dead-end without request is BEHIND Zoho/ClickUp request patterns | BUG-004 · CW-003 | VERIFIED |
| 5 | SHIP | Publishing a client portal must not be one accidental flip | Publish client portal requires confirm (match Unpublish care) | Asymmetric danger vs Direct portal publish norms; Unpublish already confirms | UX-031 · CLIENT-PORTAL-CHROME | VERIFIED |
| 6 | SHIP | Owner must finish a grant without Projects Error | Grant Access projects loader works | Grant dialog fails to load projects (BUG-006) — blocks wedge before guest even starts | BUG-006 · CLIENT-PORTAL-CHROME | VERIFIED |
| 7 | SHIP | Team must see what “this cycle” means on overview + board | Active / Current cycle chrome | Linear Cycles are category-defining; Build has issue↔cycle link but lacks Active chrome | UX-024 · CW-004 · Linear PUBLIC use-cycles | VERIFIED + REPORTED |
| 8 | SHIP | Intake must be a ritual (accept / decline / duplicate / snooze), not a dead panel | Triage empty → usable ritual + rules CTA | Linear Triage **AVAILABLE** (public docs); Build Triage empty, no rules CTA | UX-029 · Linear PUBLIC triage · DUE-TRIAGE-TEMPLATES | VERIFIED + REPORTED |
| 9 | SHIP | “What’s in the ship set?” must be unambiguous | Release ↔ issue membership + ship tracking | Jira Releases / Affects versions **UI-VERIFIED**; Build Release create exists, membership depth BEHIND | UX-025 · EPIC-RELEASE-LINK-DEPTH · jira/FEATURES.md | VERIFIED + UI-VERIFIED |
| 10 | SHIP | Programme rollup must contain real projects, not nest-only shells | Program ↔ project membership | Jira Plans / ClickUp hierarchy contain work; Build Program create links Portfolio but Projects=0 membership | UX-028 · PROGRAM-PROJECT-LINK | VERIFIED |
| 11 | SHIP | Commitments must stay attached to work items | Milestone ↔ issue linking | Linear/ClickUp/Asana/monday milestones attach work; Build Milestone create PARITY-seeking, issue-link missing | MILESTONES census · CI gap | VERIFIED |
| 12 | SHIP | Find client/feature slices without leaving Issues | Labels / Tags filter on Issues FilterBar | Linear Labels + ClickUp Tags **UI-VERIFIED**; Build chooser “No matching filters” | UX-026 · FILTERS.md · linear+clickup FEATURES | UI-VERIFIED + VERIFIED |
| 13 | SHIP | Slice “everything in epic X” without Type=Epic only | Epic *relation* filter | Linear Relations→Parent **UI-VERIFIED**; Build has issue↔epic link but no relation filter | UX-027 · FILTERS.md · linear/FEATURES | UI-VERIFIED + VERIFIED |
| 14 | SHIP | Bootstrap client/project structure without rebuilding every time | Template gallery / Quick Start packs | ClickUp template gallery depth; Build create+apply PARITY vs Linear basic only | D-123 · TEMPLATE-CREATE/APPLY · ClickUp PUBLIC templates | VERIFIED + REPORTED |
| 15 | SHIP | Report up with a named report I can re-run, not snapshot-only history | Named report Create / Run | Jira Generate report / ClickUp dashboards; Build Overview snapshot only (UX-030) | UX-030 · REPORTS-CRAFT | VERIFIED |
| 16 | SHIP | Leadership needs org rollup, not project-only Agile pages | Organisation-level Reports | Jira/ClickUp workspace dashboards; Build org More-tools search “Reports” = no match | REPORTS-CRAFT · CI gap org Reports | VERIFIED |
| 17 | SHIP | Org planned-vs-actual must resolve (not 404) | Organisation Budget route | Zoho Projects budgets AVAILABLE; Build `/build/budget` **404** | APPROVALS-BUDGET · CI gap | VERIFIED |
| 18 | SHIP | Cancel on New Form must mean cancel — no silent untitled draft | Form create safety (no auto-draft without cancel) | ClickUp Forms cancel norms; Build UX-032 auto-creates untitled draft | UX-032 · FORMS-AUTOMATIONS | VERIFIED |
| 19 | SHIP | Automations I save must actually fire on ticket events | Live automation rules (create + fire verified) | ClickUp/Jira/monday Automations AVAILABLE; Build wizard PARITY-seeking, live fire BEHIND | Automations · CI gap · ClickUp PUBLIC | VERIFIED + REPORTED |
| 20 | SHIP | Integrations must deliver payloads after save | Live webhooks deliver | Linear/ClickUp webhooks AVAILABLE; Build create craft soft-up, live BEHIND | Webhooks census · CI gap | VERIFIED |
| 21 | SHIP | Return tomorrow without OTP ritual pain | Password + SSO options alongside OTP | Linear/Atlassian/ClickUp password/SSO; Build OTP-only fragile (CI-060) | CI-060 · CI Cut auth | VERIFIED + REPORTED |
| 22 | SHIP | Role labels must tell the truth about create power | Honest Viewer vs Member labels | Linear/ClickUp role honesty; Build “Member” can be view-only 26/80 | CW-001/002 · UX-023 · Member T24 | VERIFIED |
| 23 | SHIP | ICs contribute day one in projects they can access | Default Member can create issues | Linear/ClickUp/Jira members create in accessible projects; Build Module Member no Create issue | CW-002 · Member T24 · UX-023 | VERIFIED |
| 24 | SHIP | Never show “No projects” while I’m on a project | Membership-scoped Projects list + CC counts | Directs list projects you’re on; Build Member list/CC = 0 on `/build/47` | CW-001 · UX-022 · T01/T02 | VERIFIED |
| 25 | SHIP | Create menu must show Issue when I can create | Permission-aware Create menu | Linear/ClickUp permission-aware create; Build Create = mail/calendar/chat only for Member | UX-023 Diff · Member T24 | VERIFIED |
| 26 | SHIP | Multi-project rollup needs depth beyond a link | Portfolio roadmaps / deps / health (beyond link) | Jira Plans / monday Portfolio / Asana Portfolios deep craft; Build Portfolio↔project link PARITY-seeking, depth BEHIND | CW-007 · Portfolio · PUBLIC Plans/Portfolios | VERIFIED + REPORTED |
| 27 | SHIP | Filter ship set once release membership exists | Release / Fix-version filter on Issues | Jira Affects versions in More filters **UI-VERIFIED**; Build no Release facet | UX-025 · FILTERS.md · jira/FEATURES | UI-VERIFIED |
| 28 | SHIP | Exclude noise and find unset work | Filter operators is / is not / empty / is set | ClickUp operators **UI-VERIFIED**; Build equality/pick-value only | FILTERS.md · clickup/FEATURES · FILTERS-BUILD-CRAFT | UI-VERIFIED |
| 29 | SHIP | Precise planning lenses without leaving FilterBar | AND / OR + nested filter groups | ClickUp AND/OR nest + Linear Advanced nest **UI-VERIFIED**; Build flat | FILTERS.md · clickup+linear FEATURES | UI-VERIFIED |
| 30 | SHIP | Plan the week without picking absolute calendars | Relative due presets (Today / This week / Overdue / N days) | Linear Due presets + custom timeframe **UI-VERIFIED**; Build From–To absolute only | FILTERS.md · linear/FEATURES · FILTERS-BUILD-CRAFT | UI-VERIFIED |
| 31 | SHIP | Reopen the same team lens tomorrow | Durable named saved filters (personal + shared) | ClickUp Saved filters · Linear Custom Views · Jira Save + defaults **UI-VERIFIED**; Build URL chips only, named not observed | FILTERS.md · clickup+linear+jira FEATURES | UI-VERIFIED |
| 32 | SHIP | “My work” in one click on Issues / My Work | Me / Me Mode / Assigned-to-me quick filter | ClickUp Me + Me Mode · Linear Current user · Jira `currentUser()` + My open **UI-VERIFIED** | FILTERS.md · CI FEATURES dumps | UI-VERIFIED |
| 33 | SHIP | Clear blockers from the FilterBar | Dependency / blocked / blocking filter | Linear Relations Blocked/Blocking + ClickUp Dependency **UI-VERIFIED**; Build missing | FILTERS.md · linear+clickup FEATURES | UI-VERIFIED |
| 34 | SHIP | Follow delegated / authored work | Created-by / reporter filter (≠ assignee) | ClickUp Created by · Linear Creator · Jira reporter **UI-VERIFIED** | FILTERS.md · CI FEATURES | UI-VERIFIED |
| 35 | SHIP | Find watched work | Follower / subscriber / watcher filter | ClickUp Follower · Linear Subscribers **UI-VERIFIED** | FILTERS.md · CI FEATURES | UI-VERIFIED |
| 36 | SHIP | Hide closed noise intentionally | Archived / status-is-closed dedicated toggles | ClickUp Archived + Status is closed **UI-VERIFIED** | clickup/FEATURES · FILTERS.md | UI-VERIFIED |
| 37 | SHIP | Share an ad-hoc query as a durable team view (not URL hope alone) | Share saved views with team/workspace scope | Linear share scopes · ClickUp Workspace filters · Jira filter share (PUBLIC + Save **UI-VERIFIED**) | FILTERS PUBLIC + jira Save UI-VERIFIED | UI-VERIFIED + REPORTED |
| 38 | SHIP | Star the lenses I live in | Favorite / star saved views for sidebar defaults | Linear Favorite views · Asana starred search (PUBLIC) | PUBLIC Linear Custom Views · Asana search | REPORTED |
| 39 | SHIP | Process fields must filter like core fields | Custom-field facets in FilterBar (typed operators) | ClickUp CF filters / Jira CF / Asana CF (PUBLIC); richer WS needed for ClickUp walk | FILTERS.md · reason #92 | Hypothesis / REPORTED |
| 40 | SHIP | Title/description search in the same grammar | Text contains on title+description | Jira `~` · ClickUp Task Name/Description fields **UI-VERIFIED** · Linear Content input **UI-VERIFIED** | CI FEATURES dumps | UI-VERIFIED |
| 41 | SHIP | Cycles must auto-repeat so cadence isn’t manual recreation | Auto-repeating Cycles (duration, rollover, cooldown) | Linear Cycles PUBLIC (1–8 weeks, rollover, capacity); Build create VERIFIED, autopilot BEHIND | PUBLIC linear use-cycles · CW-004 | REPORTED + VERIFIED |
| 42 | SHIP | Triage must auto-route at scale | Triage Rules (label/assign/priority/team on enter) | Linear Triage Rules PUBLIC; Build no rules CTA | PUBLIC linear triage · UX-029 | REPORTED |
| 43 | SHIP | Issue chrome must show blockers | blocked-by / blocks / related / duplicate relations | Linear issue relations PUBLIC + Relations filter **UI-VERIFIED**; Build depth BEHIND | PUBLIC linear issue-relations · linear/FEATURES | UI-VERIFIED + REPORTED |
| 44 | SHIP | Large work breaks down without losing the parent | Parent / sub-issues nesting | Linear sub-issues · Jira sub-tasks PUBLIC; Build Epic link PARITY, sub-issue depth BEHIND | PUBLIC linear parent-and-sub-issues | REPORTED |
| 45 | SHIP | Stakeholders see On track / At risk without a PDF chase | Project / initiative status updates | Linear project updates · Asana status updates PUBLIC | PUBLIC linear initiative-and-project-updates · Asana | REPORTED |
| 46 | SHIP | Client intake without forcing a full seat | Shareable public Form URL (+ optional embed) | Asana Forms anyone-can-submit · ClickUp Form share · JSM forms PUBLIC; Build Forms surface, public link unproven | PUBLIC forms · FORMS-AUTOMATIONS | REPORTED + VERIFIED craft |
| 47 | SHIP | Intake lands structured | Form submission applies a task template | ClickUp Form settings PUBLIC | PUBLIC clickup form-settings | REPORTED |
| 48 | SHIP | First automation in minutes | Automation recipe / template gallery | Jira automation templates · ClickUp Automations · monday recipes PUBLIC | PUBLIC automation docs | REPORTED |
| 49 | SHIP | Guests see only invited projects — never whole account | Guest scope = invited boards/projects only | monday/ClickUp/Zoho guest scopes PUBLIC; Build guest NF UNTESTED | PUBLIC guest docs · PM-001 | REPORTED |
| 50 | SHIP | External profile ≠ full seat | Client User / guest profile with project-scoped modules | Zoho Client Users PUBLIC; Build Client portal chrome exists, guest BEHIND | PUBLIC zoho client-user · CLIENT-PORTAL-CHROME | REPORTED + VERIFIED chrome |
| 51 | SHIP | IC daily ritual across projects | Personal My Work / My Tasks inbox that stays true | Asana My Tasks PUBLIC; Build My Work surface PARITY-seeking, membership honesty BEHIND (CW-001) | PUBLIC asana My Tasks · D-108 | REPORTED + VERIFIED |
| 52 | SHIP | Stay on top of @mentions and followed work | Inbox / notification centre for projects + mentions | Asana Inbox · Linear inbox patterns PUBLIC | PUBLIC asana · Linear | REPORTED |
| 53 | SHIP | Balance the team before promising dates | Workload capacity limits + availability / PTO-aware load | ClickUp Workload · Asana Portfolio Workload · monday Workload PUBLIC; Build Workload filled PARITY-seeking, capacity depth BEHIND | WORKLOAD-WORKFLOW-WEBHOOKS · PUBLIC workload | VERIFIED + REPORTED |
| 54 | SHIP | Cross-project capacity, not single-project only | Portfolio / universal workload | Asana Universal workload · ClickUp Workspace Workload PUBLIC | PUBLIC workload docs | REPORTED |
| 55 | SHIP | Sign-off before ship on tasks / milestones / releases | Approvals lifecycle (request → decide → record) filled | ClickUp/Jira/monday approvals AVAILABLE; Build create-path VERIFIED, filled approve/reject UNKNOWN | APPROVALS-BUDGET · CI gap | VERIFIED (create) / Hypothesis (lifecycle) |
| 56 | SHIP | Clear my approval queue across projects | Org Approvals inbox with pending/overdue that populate | Build org Approvals empty VERIFIED; needs live queue truth vs Jira/suite centres | APPROVALS-BUDGET org | VERIFIED surface |
| 57 | SHIP | Govern status changes | Workflow transitions with optional approval / required fields / roles | Jira workflows AVAILABLE; Build Workflow create soft-up, live BEHIND | WORKLOAD-WORKFLOW-WEBHOOKS | VERIFIED + REPORTED |
| 58 | SHIP | Freelancer billing without a second timesheet product | Native time log (estimate + remaining + work log) on issues | Jira Log time · ClickUp time tracking · Asana/monday plan-gated PUBLIC | PUBLIC time-tracking docs | REPORTED |
| 59 | SHIP | Billable vs non-billable for client invoices | Timesheets + billable defaults (+ guest TT permission) | ClickUp timesheets / billable PUBLIC | PUBLIC clickup time-tracking | REPORTED |
| 60 | SHIP | Dependency dates move when blockers move | Auto-reschedule dependent tasks | ClickUp Reschedule Dependencies ClickApp PUBLIC | PUBLIC clickup dependencies | REPORTED |
| 61 | SHIP | See violated schedule lines on Timeline | Project-level end→start dependencies on Timeline | Linear Project dependencies PUBLIC | PUBLIC linear project-dependencies | REPORTED |
| 62 | SHIP | Zero-duration checkpoints on schedule views | First-class milestone markers on Timeline/Gantt + progress in updates | Asana/monday/ClickUp/Linear milestones PUBLIC; Build create without issue-link / timeline depth | PUBLIC milestones · MILESTONES | REPORTED + VERIFIED |
| 63 | SHIP | Conditional client/bug intake forms | Branching forms + validation + embed | JSM conditional forms · Asana branching · ClickUp Form view PUBLIC | PUBLIC forms docs | REPORTED |
| 64 | SHIP | Form fields stay in sync with issue fields | Link form fields → issue fields for automations/reporting | JSM link form fields PUBLIC | PUBLIC JSM forms | REPORTED |
| 65 | SHIP | N-of-M approve / decline transitions | Workflow approval steps | Jira approval steps · Asana Approvals (Advanced+) PUBLIC | PUBLIC approvals | REPORTED |
| 66 | SHIP | Client-facing status without email chasing | Client Dashboard / simplified List for external status | ClickUp client services · monday guest dashboards PUBLIC; needs guest path | PUBLIC client services · PM-001 | REPORTED |
| 67 | SHIP | Strategic layer above projects | Initiatives / Goals with progress rollup from work | Linear Initiatives · ClickUp/Asana Goals PUBLIC; Build Goals empty widgets | PUBLIC initiatives/goals · D-121 | REPORTED + VERIFIED empty |
| 68 | SHIP | Nested portfolio of portfolios for agencies | Nested portfolios + bird’s-eye health | Asana nested portfolios PUBLIC | PUBLIC asana portfolios | REPORTED |
| 69 | SHIP | Cross-team schedule with capacity/velocity | Plan-level capacity + auto-scheduler warnings | Jira Plans planning tools PUBLIC | PUBLIC jira advanced-roadmaps | REPORTED |
| 70 | SHIP | Interactive cycle/lead/effort insights | Insights measure × slice + CSV share | Linear Insights PUBLIC; Build Overview defaults only | PUBLIC linear insights · REPORTS-CRAFT | REPORTED + VERIFIED |
| 71 | SHIP | Drag-and-drop multi-project dashboards | Dashboard cards + scheduled PDF/email | ClickUp/Asana/monday dashboards PUBLIC | PUBLIC dashboards | REPORTED |
| 72 | SHIP | Docs attached to delivery work | Native Docs/wiki on projects/issues with comments/history | Linear Documents · ClickUp Docs PUBLIC; Build Wiki empty / Not Now sprawl — ship *linked* docs, not mega-wiki | PUBLIC docs · D-241 | REPORTED |
| 73 | SHIP | Docs → Issues bridge | Create tasks from Doc text / sticky notes | ClickUp Docs + Whiteboard PUBLIC | PUBLIC clickup docs/views | REPORTED |
| 74 | SHIP | Remap dates when applying templates | Remap start/due on Space/List/task template apply | ClickUp Remap dates PUBLIC | PUBLIC clickup task templates | REPORTED |
| 75 | SHIP | Rich task templates (checklists, deps, CF, subtasks) | Task template center beyond single custom template | ClickUp task templates PUBLIC; Build single-template PARITY | PUBLIC clickup templates · D-123 | REPORTED + VERIFIED |
| 76 | SHIP | Board swimlanes (status × assignee/cycle) | 2D Board group columns × rows | Linear Board layout PUBLIC | PUBLIC linear board-layout | REPORTED |
| 77 | SHIP | Deadline planning at project level | Calendar view that stays in Build (or honest suite label) | ClickUp/Asana Calendar PUBLIC; Build Calendar → suite `/calendar` (CW-005) | CW-005 · D-204 · PUBLIC calendars | VERIFIED + REPORTED |
| 78 | SHIP | PM scheduling with critical path | Gantt with deps, milestones, baselines | monday/ClickUp Gantt PUBLIC | PUBLIC gantt features | REPORTED |
| 79 | SHIP | Timeline with milestones + project dependency lines | Project Timeline week/month/quarter | Linear Timeline · monday Timeline PUBLIC; Build Timeline craft thin | PUBLIC timeline · D-205 | REPORTED + VERIFIED |
| 80 | SHIP | Denied actions must teach recovery, not dump perm codes | Human deny guidance | Design AVOID perm dump; Directs use locked/disabled patterns | UX-017b · Design AVOID | VERIFIED craft gap |
| 81 | SHIP | First-cycle empty teaches without nagging forever | First-cycle guide → quiet after one cycle exists | Linear first-cycle guides PUBLIC | PM-008 · CW-004 | Hypothesis / REPORTED |
| 82 | SHIP | Guided blank → template → first issue | Activation checklist to first useful project | ClickUp/Asana onboarding PUBLIC | PM-005 | Hypothesis |
| 83 | SHIP | Session expiry returns you to the work you left | Clear expiry return URL / session persistence polish | Linear/Atlassian/ClickUp sessions; Build hard-refresh survived VERIFIED, polish Later | PM-004 | VERIFIED partial |
| 84 | SHIP | Selective client surface control | Per-ticket + per-milestone visibility toggles that *drive* guest view | Chrome VERIFIED; guest path must make toggles real vs Zoho/JSM selective share | CLIENT-PORTAL-CHROME Visibility · PM-001 | VERIFIED chrome / SHIP guest |
| 85 | SHIP | Preview stays honest when nothing toggled | Client portal Preview empty honesty | Preview empty VERIFIED; must stay true after guest ships | CLIENT-PORTAL-CHROME Preview | VERIFIED chrome |
| 86 | SHIP | Changelog / ship notes with a release | Publish what went out | Jira Releases / Linear releases adjacency; Build Changelog tab empty | CI Changelog · PUBLIC jira releases | VERIFIED empty + REPORTED |
| 87 | SHIP | Structured external requests → Triage/backlog | Feedback tab accepts external requests | Linear Asks/Triage adjacent; Build Feedback empty — UNIQUE-potential if guest works | CI Feedback · PUBLIC triage | VERIFIED empty + REPORTED |
| 88 | SHIP | Teams own workflow + cycle cadence with clear roster | Teams roster + inheritance | Linear Teams PUBLIC; Build Teams shell | D-105 · PUBLIC linear conceptual-model | VERIFIED + REPORTED |
| 89 | SHIP | Process-specific data on issues | Custom fields (select/date/number/text) | ClickUp/Jira/monday/Asana CF PUBLIC | PUBLIC custom fields | REPORTED |
| 90 | SHIP | Safe integration without shared passwords | API tokens scoped + revoke | Linear/Atlassian/ClickUp API tokens; Build token settings empty/maturity BEHIND | CI API tokens · Direct developer docs | VERIFIED surface + REPORTED |
| 91 | SHIP | Recurring client/ops rituals | Recurring tasks / issues | ClickUp/Asana recurring PUBLIC | PUBLIC recurring | REPORTED |
| 92 | SHIP | Filter by “work I delegated” | Assigned-by filter | Asana Assigned by PUBLIC | PUBLIC asana tips | REPORTED |
| 93 | SHIP | History audit lists | WAS / CHANGED status or assignee operators | Jira JQL WAS/CHANGED **UI-VERIFIED** — prefer chip equivalents, not full JQL chase | jira/FEATURES · FILTERS.md | UI-VERIFIED |
| 94 | SHIP | Default personal lenses | Default filters (My open, Reported by me, Recently updated, …) | Jira Default filters sidebar **UI-VERIFIED** | jira/FEATURES | UI-VERIFIED |
| 95 | SHIP | Basic + advanced without enterprise query debt | Approachable Basic pickers + saved views (AVOID full JQL language chase) | Jira Basic/JQL **UI-VERIFIED**; PM rule = chips + saved views win | jira/FEATURES · FILTERS.md AVOID | UI-VERIFIED |
| 96 | SHIP | SLA risk clocks for client-facing SLAs (light) | Configurable SLAs + breach notifications | Linear SLAs PUBLIC — after wedge; not JSM feature-count | PUBLIC linear sla | REPORTED |
| 97 | SHIP | Portfolio creates project from template on approval | Portfolio automation: request approved → project from template | monday Portfolio automations PUBLIC | PUBLIC monday portfolio-automations | REPORTED |
| 98 | SHIP | All-projects dashboard auto-connects boards | Portfolio “all projects” dashboard | monday All Projects Dashboard PUBLIC | PUBLIC monday all-projects-dashboard | REPORTED |
| 99 | SHIP | WBS-class phases for delivery planning | Phases / task lists / milestones structure | Zoho WBS PUBLIC; Build hierarchy shells | PUBLIC zoho wbs · CI gap | REPORTED |
| 100 | SHIP | Filter URL remains honest after new facets ship | Protect chips + shareable URL + filtered-empty (extend to Labels/Epic/Release) | Build URL/chips **VERIFIED** PARITY-seeking — must not regress when shipping Filters top-8 | FILTERS-BUILD-CRAFT · FILTERS.md | VERIFIED |
| 101 | HAVE | Freelancer watches planned ₹ vs billable without a separate finance tool | Project Budget cards (Planned / Actual / Remaining) + Set Budget | Linear has no native budget; Jira needs marketplace/Tempo; Asana Timesheets&Budgets is add-on; monday/ClickUp skew time-not-budget — Directs **largely lack** first-class project budget in ₹ | APPROVALS-BUDGET.md · CI gap Budget AHEAD vs Linear | VERIFIED |
| 102 | HAVE | PjM keeps architecture/product calls attached to the project | Dedicated Decisions log (create + status filters) | Linear has no dedicated Decisions surface; peers bury decisions in Docs/comments — soft Directs miss | RISKS-DECISIONS.md · CI gap soft AHEAD vs Linear | VERIFIED |
| 103 | HAVE | PjM links a project into a Portfolio container today | Portfolio create + Portfolio↔project membership | Linear has no Products/Portfolios entities (conceptual model); ClickUp/monday/Asana *do* have portfolios — **HAVE vs Linear**, not vs all Directs | PORTFOLIO-PROJECT-LINK.md · CI gap AHEAD vs Linear | VERIFIED |
| 104 | HAVE | Suite buyer jumps from Issues Calendar into org Calendar without a second product login | Issues Calendar → suite `/calendar` seam | Pure PM Directs embed calendar in-module; they **lack** a suite Calendar handoff (also IA risk / in-module BEHIND — honest dual score) | D-204 · CW-005 · CI gap UNIQUE seam | VERIFIED |
| 105 | HAVE-conditional | Agency/freelancer needs a *named* Client Portal with per-ticket/milestone visibility + Preview (not only board guests) | Client Portal chrome: Publish state, Visibility toggles, Preview | Linear weak on portals; ClickUp/monday guests ≠ project portal with ticket toggles — **UNIQUE-potential vs Linear** only; guest path still BEHIND → not sellable HAVE until PM-001 | CLIENT-PORTAL-CHROME · CI UNIQUE-vs-Linear rule | VERIFIED chrome · guest UNTESTED |
| 106 | SHIP | Approvals include Client Approval that reaches a real client | Client Approval type end-to-end with guest | Type exists in Approvals filters VERIFIED; NF blocked on guest | APPROVALS-BUDGET Type=Client Approval · PM-001 | VERIFIED type / SHIP NF |
| 107 | SHIP | Risks register usable for programme ritual | Risks with owners + severity (filled craft) | monday Portfolio Risk Insights class; Build Risks create PARITY-seeking | RISKS-DECISIONS · D-245 | VERIFIED create |
| 108 | SHIP | Protect private views; comment-only / view-only project scopes for guests | Guest invite permissions + view protection | ClickUp Protect view · Asana comment-only · monday private boards PUBLIC | PUBLIC permissions / guests | REPORTED |
| 109 | SHIP | Subtask-aware advanced filters | Subitem / subtask filter semantics | monday subitem filters · ClickUp subtasks-as-separate PUBLIC | PUBLIC monday/ClickUp filters | Hypothesis |
| 110 | SHIP | Creating inside a filtered view seeds filter values | Auto-apply filter values on create (“Bring it back”) | monday automatic filtering · ClickUp filter-seeded create PUBLIC | PUBLIC filter docs | Hypothesis |
| 111 | SHIP | Cross-project Advanced Search → durable sidebar report | Saved cross-project search as light reporting | Asana Advanced Search → saved report PUBLIC | PUBLIC asana search | REPORTED |
| 112 | SHIP | Label operators include-any / include-all / include-none | Labels multi-semantics | Linear label operators PUBLIC | PUBLIC linear filters | REPORTED |
| 113 | SHIP | Cycle timing “added to cycle” planned vs after-start | Added-to-cycle filter | Linear Added to cycle PUBLIC | PUBLIC linear filters | REPORTED |
| 114 | SHIP | Effort filters for planning | Time-estimate / time-tracked numeric comparisons | ClickUp Time estimate/tracked fields **UI-VERIFIED** in picker | clickup/FEATURES | UI-VERIFIED |
| 115 | SHIP | Temporal hygiene filters | Last-status-change / date-done / date-closed | ClickUp date filter set **UI-VERIFIED** | clickup/FEATURES | UI-VERIFIED |
| 116 | SHIP | Milestone boolean in FilterBar | Is / is not milestone filter | ClickUp Milestone filter PUBLIC | PUBLIC clickup list filters | REPORTED |
| 117 | SHIP | Task-type filter beyond Build’s Type chip depth | Task type facet parity with Direct types | ClickUp Task Type **UI-VERIFIED**; Jira Type Basic **UI-VERIFIED**; Build Type VERIFIED — deepen custom types | CI FEATURES · FILTERS-BUILD-CRAFT | UI-VERIFIED |
| 118 | SHIP | Dashboard/gadget powered by same saved filter as issue list | Saved filter → report widget | Jira filter→gadget · Linear advanced→dashboards PUBLIC | PUBLIC reporting | REPORTED |
| 119 | SHIP | Sprint open/closed/future without hardcoding names | Sprint functions / open-sprint facet | Jira `openSprints()` PUBLIC; Build Cycle facet VERIFIED — deepen open/upcoming semantics | PUBLIC JQL functions · FILTERS Cycle VERIFIED | REPORTED + VERIFIED |
| 120 | SHIP | Version release helpers on filters | releasedVersions / latestReleasedVersion class helpers (chip form) | Jira version functions PUBLIC — ship chip helpers not JQL | PUBLIC JQL version functions | REPORTED |

---

## Counts

| Bucket | Count | Notes |
| --- | --- | --- |
| **SHIP** | **115** | Includes Filters top-8 as SHIP; Freeze #1–6; Completeness Next craft; UI-VERIFIED filter gaps; PUBLIC-doc SHIP with named Direct + pain |
| **HAVE** | **4** | Strict: Directs *largely* lack (or AHEAD-vs-Linear called out) |
| **HAVE-conditional** | **1** | Client Portal chrome — not sellable UNIQUE until guest VERIFIED |
| **SHIP + HAVE (+conditional)** | **120** | Passes ≥100 target without “all-in-one / cheaper / modern UI / suite platform” fluff |

## Top 15 SHIP (desperation × win vs Directs for F / PM / PjM)

| Rank | # | Feature | Why this rank |
| --- | --- | --- | --- |
| 1 | 3 | Client grant → guest magic-link | Wedge dead; UNIQUE-vs-Linear blocked; F/PjM desperate |
| 2 | 1 | Cold invite accept → Build | No teammate = no product; all ICPs |
| 3 | 2 | Invite grants Build module access | Accept without `/build` is false activation |
| 4 | 6 | Grant Access projects loader | Blocks grant before guest even starts |
| 5 | 12 | Labels / Tags filter (UX-026) | Highest Completeness Next filter; F tags + PM slices; UI-VERIFIED Direct miss |
| 6 | 7 | Active / Current cycle chrome (UX-024) | Highest PM-job BEHIND vs Linear Cycles |
| 7 | 23 | Default Member can create issues | Collaborator dead-end vs Linear/ClickUp/Jira |
| 8 | 24 | Membership-scoped Projects list (UX-022) | Looks like data loss; S1 trust |
| 9 | 9 | Release ↔ issue membership (UX-025) | PM/PjM ship-set ambiguity vs Jira |
| 10 | 13 | Epic relation filter (UX-027) | PM feature-slice findability; Linear Parent UI-VERIFIED |
| 11 | 31 | Named saved filters / Custom Views | Team ritual lenses; UI-VERIFIED on ClickUp/Linear/Jira |
| 12 | 8 | Triage empty → usable ritual (UX-029) | Linear category-defining intake |
| 13 | 10 | Program ↔ project membership (UX-028) | PjM programme rollup truth |
| 14 | 46 | Public Form URL for client intake | F/PjM structured inbound without seats |
| 15 | 21 | Password + SSO alongside OTP | Auth trust table-stakes vs all Directs |

## SHORTFALL

**Numeric target:** Met (≥100 SHIP+HAVE).

**Quality shortfall (evidence, not padding avoided):**

1. **Honest HAVE is thin (4 + 1 conditional).** Almost nothing Build has today that *all five* Directs largely lack with filled craft. AHEAD-vs-Linear surfaces (hierarchy shells, Approvals create, Budget vs Linear) are mostly **parity plays vs ClickUp/Jira/monday** or empty craft — excluded from sellable HAVE.
2. **Client portal cannot be UNIQUE HAVE** until grant→guest VERIFIED (BUG-005/006). Chrome alone = HAVE-conditional / SHIP.
3. **monday + Asana signed-in walks blocked** (renderer crash / Error 9) — rows citing those products stay REPORTED/Hypothesis; do not invent UI.
4. **Filters Completeness Next top-8 are SHIP** — Status/Priority/Type/Assignee/Cycle/Due already VERIFIED on Build are **table-stakes**, not wow HAVE.
5. **Ops niche (QA/Incidents/SLA depth), AI→filter as Now, full JQL language, Whiteboard/Wiki sprawl** deliberately omitted as wow — Not Now / AVOID per REASON-FRAMING.
6. **Filled Approvals lifecycle, live Automations/Webhooks fire, billable time→Budget loop** remain UNKNOWN/BEHIND — listed as SHIP, not HAVE.

## Sources (read, not invented)

- `100-REASONS.md`
- `/workspace/streamlineos-ci/competitor-deep/{clickup,linear,jira}/FEATURES.md` + `BUILD-GAPS.md`
- `../../../streamlineos-pm-pack/02-competitor-deep/FILTERS.md` · `REASON-FRAMING.md` · `GAP-BY-ICP.md` · `PM-OWNED-REASONS.md` · `ICP-JTBD.md`
- `../CI-GAP-REGISTER-live.md` · `CI-COMPLETENESS-STATUS.md`
- `../../00-ci-cut-v2.md`
- Build craft: `FILTERS-BUILD-CRAFT.md`, `CLIENT-PORTAL-CHROME.md`, `APPROVALS-BUDGET.md`, Completeness delta watchlist

## Companion files

- `HAVE-TODAY.md` — honest HAVE only (few)
- Top 15 SHIP also inlined above
