# PM-owned sellable reasons — StreamlineOS Build
**Lane:** PM · **Updated:** 2026-10-01 (IST)  
**ICP:** F = Freelancer · PM = Product Manager · PjM = Project Manager  
**Rule:** Sellable only **when shipped**; until then = gap. en-GB in sellable copy.  
**Freeze v1:** PM-011 → PM-002 → PM-001 unchanged.  
**Seed:** CI `100-REASONS.md` rows 1–25 rewritten; rows 26–55 Completeness/Freeze/UX/QA; **rows 56–100** provisional from public Direct help centres (`PUBLIC:<product>:<page>`); **rows 101–115** filter-capability wave (`FILTERS.md` + `FILTERS-BUILD-CRAFT.md` + CI UI-VERIFIED dumps for ClickUp/Linear/Jira). No invented signed-in competitor UI beyond FEATURES dumps.

**Count:** **115** framed reasons (55 Completeness/Freeze + 45 public-doc provisional + **15** filter wave)

| Today status legend |
| --- |
| BEHIND = gap vs Directs · BEHIND craft = shell/partial · PARITY / PARITY-seeking = keep/protect · Not Now = niche later · UNIQUE-potential = wedge if guest VERIFIED |

---

## Reason table

| # | ICP | Theme | Sellable reason (when shipped) | JTBD link | Beats / matches | Evidence ID | Today status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | F, PM, PjM | Activation | Cold invite accept lands you reliably in Build — no blank marketing shell or OTP roulette | All: invite teammate → useful workspace | Linear, ClickUp, Jira invite accept | BUG-001 · PM-011 | BEHIND |
| 2 | F, PM, PjM | Activation | Invites grant Build module access automatically — no manual Roles chase after accept | All: teammate can open `/build` | Linear, ClickUp workspace access | BUG-002 · PM-002 | BEHIND |
| 3 | F, PjM | Client wedge | Granting a client creates a real guest magic-link entry — never a false-success toast | F/PjM: trusted client share | Zoho Clients, JSM portal, ClickUp guests | PM-001 · BUG-005/006 | BEHIND |
| 4 | F, PjM | Client wedge | Members can request Client Access with a clear CTA when they lack grant rights | F/PjM: ask for client visibility | Zoho, ClickUp request patterns | BUG-004 · CW-003 | BEHIND |
| 5 | F, PjM | Client wedge | Publishing the client portal asks for confirm (same care as unpublish) | F/PjM: don’t expose clients by accident | JSM / Zoho portal publish care | UX-031 · CLIENT-PORTAL-CHROME | BEHIND craft |
| 6 | F, PjM | Client wedge | Grant Access loads projects reliably so owners can finish the grant | F/PjM: complete client grant | Zoho, JSM grant pickers | BUG-006 | BEHIND |
| 7 | PM | Delivery | Active/Current cycle chrome on overview and board matches how teams work “this cycle” | PM: plan & track the current cycle | Linear Cycles | UX-024 · CW-004 | BEHIND |
| 8 | PM | Delivery | Triage goes from empty panel to usable rules/intelligence — backlog intake you can run | PM: process new work | Linear Triage | UX-029 · DUE-TRIAGE-TEMPLATES | BEHIND |
| 9 | PM, PjM | Delivery | Release membership and ship tracking so “what’s in the release” is unambiguous | PM/PjM: ship with a named release | Jira Releases | UX-025 · EPIC-RELEASE-LINK-DEPTH | BEHIND |
| 10 | PjM | Hierarchy | Programs hold real project membership — not nest-only shells | PjM: programme rollup | Jira Plans, ClickUp hierarchy | UX-028 · PROGRAM-PROJECT-LINK | BEHIND |
| 11 | F, PM, PjM | Delivery | Milestones link to issues so commitments stay attached to work | All: track commitments | Linear, ClickUp, Zoho milestones | MILESTONES census | BEHIND |
| 12 | PM, PjM | Delivery | Filter issues by Labels and by Epic relation (not only Epic issue type) | PM/PjM: find work in a feature slice | Linear Labels + Relations Parent; ClickUp Tags (UI-VERIFIED) | UX-026 · UX-027 · CI `linear/FEATURES.md` · `clickup/FEATURES.md` · #101–102 | BEHIND |
| 13 | F, PM | Activation | Template gallery / Quick Start packs — not only one custom template | F/PM: bootstrap faster | ClickUp template gallery | Templates · D-123 | BEHIND gallery |
| 14 | PM, PjM | Insights | Create and run named reports — snapshots are history, not the whole story | PM/PjM: report up | Jira Generate report | UX-030 · REPORTS-CRAFT | BEHIND |
| 15 | PjM, PM | Insights | Organisation-level Reports across projects — not project-only Agile pages | PjM: leadership rollup | Jira / ClickUp dashboards | REPORTS-CRAFT org search | BEHIND |
| 16 | F, PjM | Finance | Organisation Budget that resolves (not 404) alongside project budget | F/PjM: planned vs actual at org | Zoho Projects | APPROVALS-BUDGET | BEHIND |
| 17 | F, PM | Extensibility | New Form does not silently spawn an untitled draft — cancel means cancel | F/PM: safe create | ClickUp Forms cancel norms | UX-032 · FORMS-AUTOMATIONS | BEHIND safety |
| 18 | F, PM, PjM | Extensibility | Automation rules you create actually fire on ticket events | All: remove repetitive handoffs | ClickUp, Jira, monday automations | Automations · CI gap | BEHIND filled |
| 19 | PM, PjM | Extensibility | Webhooks deliver live to your payload URL after save | PM/PjM: integrate the toolchain | Linear, ClickUp webhooks | Webhooks census · CI gap | BEHIND filled |
| 20 | F, PM, PjM | Auth | Sign-in with password and SSO options — not OTP-only fragility | All: return tomorrow without ritual pain | Linear, Atlassian, ClickUp auth | CI-060 · PM-004 class | BEHIND |
| 21 | PM, PjM | Collab roles | Viewer vs Member labels tell the truth about create power | PM/PjM: know who can contribute | Linear, ClickUp role honesty | CW-001/002 · UX-023 | BEHIND honesty |
| 22 | PM, PjM | Collab roles | Default Member can create issues in projects they can access | PM/PjM: ICs contribute day one | Linear, ClickUp, Jira members | Member T24 · CW-002 | BEHIND |
| 23 | PjM | Hierarchy | Portfolio depth beyond link — roadmaps and dependencies for multi-project rollup | PjM: portfolio ritual | Jira Plans, monday Portfolio | Portfolio · CW-007 | BEHIND depth |
| 24 | PjM | Ops niche | QA test runs with filled craft when you need embedded QA (Later) | PjM niche: test runs in delivery OS | Xray, Zephyr | OPS-PACK | Not Now |
| 25 | PjM | Ops niche | Incidents with live SLA lifecycle when you need light ITSM (Later) | PjM niche: incident SLA | JSM, Opsgenie | OPS-PACK | Not Now |
| 26 | PM, PjM | Collab roles | Projects list shows every project you’re a member of — never “No projects” while you’re on one | PM/PjM: find my work | Linear, ClickUp, Jira project lists | CW-001 · UX-022 · T01 | BEHIND |
| 27 | PM, PjM | Collab roles | Command Center project counts match membership reality | PM/PjM: trust the home dashboard | ClickUp / monday home widgets | T02 · D-100 | BEHIND |
| 28 | PM | Collab roles | Create menu is permission-aware — Issue appears when you can create | PM: contribute without hunting Roles | Linear, ClickUp create menus | UX-023 Diff | BEHIND |
| 29 | F, PM, PjM | Trust craft | Denied actions show human guidance — not raw permission code dumps | All: recover from deny | Directs’ locked/disabled patterns | Design AVOID perm dump · UX-017b | BEHIND craft |
| 30 | F, PjM | Client wedge | Client portal preview stays honest when nothing is toggled visible | F/PjM: preview before publish | Zoho / JSM preview norms | CLIENT-PORTAL-CHROME Preview | PARITY-seeking |
| 31 | F, PjM | Client wedge | Per-ticket and per-milestone visibility toggles for what clients see | F/PjM: control client surface | JSM / Zoho selective share | CLIENT-PORTAL-CHROME Visibility | PARITY-seeking |
| 32 | F, PM | Activation | Guided blank → template → first issue checklist shortens time-to-value | F/PM: first useful project | ClickUp / Asana onboarding | PM-005 | BEHIND |
| 33 | F, PM, PjM | Activation | Session persistence with clear expiry return URL so refresh doesn’t orphan work | All: stay signed in | Linear, Atlassian, ClickUp sessions | PM-004 (session survived hard refresh VERIFIED; polish Later) | PARITY-seeking |
| 34 | PM | Delivery | First-cycle empty state teaches how to start a cycle without nagging after one exists | PM: adopt cycles | Linear first-cycle guides | PM-008 · CW-004 patch | BEHIND craft |
| 35 | PM, PjM | Delivery | Epic↔issue linking stays first-class on the issue and epic surfaces | PM/PjM: structure delivery | Jira Epics, Linear projects/initiatives | EPIC-RELEASE-LINK-DEPTH | PARITY |
| 36 | PM, PjM | Delivery | Multi-view Issues (Board, List, Table, Timeline, Workload) for every viewing role | PM/PjM: pick the right lens | ClickUp, Jira multi-view | D-201…206 · T18a | PARITY |
| 37 | F, PM, PjM | Delivery | Filter chips and shareable filter URLs (priority, type, assignee, cycle, due range) | All: resume a filtered board | Jira / ClickUp filter URLs | FILTERS · DUE-TRIAGE | PARITY |
| 38 | PjM | Hierarchy | Portfolio ↔ project linking for real multi-project containers | PjM: portfolio contains projects | ClickUp Portfolios, monday Portfolio | PORTFOLIO-PROJECT-LINK | PARITY-seeking |
| 39 | F, PM | Activation | Create project wizard (basics → workflow → review) gets you to a live board fast | F/PM: stand up a project | Linear, ClickUp, Asana create | CI Cut create-project VERIFIED | PARITY |
| 40 | F, PM | Activation | Single-template create and apply seeds a usable project structure | F/PM: reuse a structure | Linear basic templates | TEMPLATE-CREATE · TEMPLATE-APPLY | PARITY |
| 41 | F, PM | Extensibility | Project Forms with typed templates (bug, feature, client approval, …) for structured intake | F/PM: collect requests | ClickUp Forms | FORMS-AUTOMATIONS | PARITY-seeking |
| 42 | PM, PjM | Extensibility | Automations wizard with explicit Cancel and clear trigger/action choices | PM/PjM: design a rule safely | ClickUp / monday automation builders | FORMS-AUTOMATIONS | PARITY-seeking |
| 43 | PjM | Delivery | Workload view with unassigned gap and member load so planning stays honest | PjM: balance the team | Jira, ClickUp, monday workload | WORKLOAD-WORKFLOW-WEBHOOKS | PARITY-seeking |
| 44 | PjM, PM | Delivery | Workflow transitions with optional approval, required fields, and allowed roles | PjM/PM: govern status changes | Jira workflows | WORKLOAD-WORKFLOW-WEBHOOKS | PARITY-seeking |
| 45 | PjM | Delivery | Approvals for tasks, milestones, and releases — request and decide in Build | PjM: get sign-off before ship | Jira / monday approvals | APPROVALS-BUDGET | PARITY-seeking |
| 46 | PjM | Insights | Organisation Approvals inbox with pending/overdue counters across projects | PjM: clear my approval queue | Jira / suite approval centres | Org Approvals VERIFIED | PARITY-seeking |
| 47 | F, PjM | Finance | Project Budget planned vs billable actuals in rupees | F/PjM: watch cost on a client project | Zoho Projects budget | APPROVALS-BUDGET project Budget | PARITY-seeking |
| 48 | PM, PjM | Insights | Reports Overview defaults (volume, priority, assignee, velocity) without a blank start | PM/PjM: glance health | Jira dashboards / ClickUp | REPORTS-CRAFT Overview | PARITY-seeking |
| 49 | PM | Insights | Agile empty modules explain prerequisites instead of showing fake charts | PM: trust empty metrics | Honest empty vs vanity BI | REPORTS-CRAFT Agile | PARITY-seeking |
| 50 | F, PM, PjM | Activation | Import issues via CSV/JSON with dry-run before commit | All: bring existing work | Linear / ClickUp importers (foundation match) | CI Cut import VERIFIED | PARITY-seeking |
| 51 | PM, PjM | Delivery | Calendar either stays in Build or clearly labels the suite Calendar hand-off | PM/PjM: no surprise navigation | Linear / Jira in-module calendar | CW-005 · D-204 | BEHIND craft |
| 52 | F, PM, PjM | Trust craft | More-tools search and progressive disclosure — depth without mega-menu overwhelm | All: find a tool without drowning | Prefer Linear quiet + ClickUp search; **avoid** unbounded sprawl | CW-006 · UX-010 · PM-010 | Not Now (sprawl) / ADAPT chrome |
| 53 | PjM | Delivery | Intake with shareable form URL and pending/accepted/declined tabs for client requests | PjM: structured inbound | ClickUp Forms / JSM intake-ish | OPS-PACK Intake | PARITY-seeking craft · eng Later |
| 54 | PjM | Delivery | Change requests with client-visible vs internal filter for agency change control | PjM: govern client changes | JSM / agency CR tools | OPS-PACK Change requests | PARITY-seeking craft · eng Later |
| 55 | PM, PjM | Hierarchy | Roadmap and Goals surfaces fill with real planning craft (not empty tabs forever) | PM/PjM: plan beyond the board | Linear Roadmap, ClickUp Goals, Jira Timeline | D-120 · D-121 · CI gap | BEHIND craft |

| 56 | PM | Delivery | Cycles repeat on a set start weekday and duration so planning cadence does not need manual recreation | PM: plan & track the current cycle | Linear Cycles | PUBLIC:linear:use-cycles | BEHIND (pending walk) |
| 57 | PM | Delivery | Triage supports accept / decline / mark-duplicate / snooze so intake is a ritual, not a dead panel | PM: process new work | Linear Triage | PUBLIC:linear:triage | BEHIND (pending walk) |
| 58 | PM | Delivery | Triage Rules auto-route, label, assign, or move issues when they enter Triage | PM: process new work at scale | Linear Triage Rules | PUBLIC:linear:triage | BEHIND (pending walk) · Later depth |
| 59 | PM | Delivery | Triage responsibility shows who owns the inbox (optional rotation) | PM: know who watches intake | Linear Triage responsibility | PUBLIC:linear:triage | BEHIND (pending walk) · Later |
| 60 | PM, PjM | Delivery | Issues carry blocked-by / blocks / related / duplicate relations in the issue chrome | PM/PjM: remove blockers | Linear issue relations | PUBLIC:linear:issue-relations | BEHIND (pending walk) |
| 61 | PM, PjM | Delivery | Parent and sub-issues nest so large work breaks down without losing the parent | PM/PjM: structure delivery | Linear sub-issues, Jira sub-tasks | PUBLIC:linear:parent-and-sub-issues | BEHIND (pending walk) |
| 62 | PM, PjM | Hierarchy | Initiatives (or equivalent) group projects under strategic objectives with progress rollup | PM/PjM: plan beyond the board | Linear Initiatives | PUBLIC:linear:initiatives · PUBLIC:linear:conceptual-model | BEHIND (pending walk) |
| 63 | PM, PjM | Delivery | Project health / status updates so stakeholders see At risk / On track without a PDF | PM/PjM: report up | Linear project updates, Asana status updates | PUBLIC:linear:conceptual-model · PUBLIC:asana:all-features | BEHIND (pending walk) |
| 64 | F, PjM | Extensibility | Shareable public Form URL (and optional embed) for structured intake outside the workspace | F/PjM: collect requests | ClickUp Forms | PUBLIC:clickup:form-settings · PUBLIC:clickup:form-view | BEHIND (pending walk) |
| 65 | F, PM | Extensibility | Form submissions can apply a task template so intake lands structured | F/PM: bootstrap from intake | ClickUp Form settings | PUBLIC:clickup:form-settings | BEHIND (pending walk) |
| 66 | PM, PjM | Extensibility | Automation gallery / suggested recipes shorten time-to-first-rule | PM/PjM: remove repetitive handoffs | ClickUp Automations, monday recipes | PUBLIC:clickup:create-automation · PUBLIC:monday:portfolio-automations | BEHIND (pending walk) |
| 67 | F, PM | Activation | Docs (or specs) link to the delivery work they support — searchable hub, not orphan files | F/PM: keep context with work | ClickUp Docs | PUBLIC:clickup:docs | BEHIND craft · Later (avoid sprawl) |
| 68 | PjM | Hierarchy | Clear multi-level workspace hierarchy (Space→Folder→List class) with real containment | PjM: programme rollup | ClickUp hierarchy | PUBLIC:clickup:hierarchy-guide · CI gap register | BEHIND (pending walk) |
| 69 | PM, PjM | Delivery | Releases / Fix Versions are first-class containers you enable and assign work into | PM/PjM: ship with a named release | Jira Releases | PUBLIC:jira:enable-releases-and-versions | BEHIND (pending walk) |
| 70 | PjM | Hierarchy | Cross-project Plans with capacity and multi-project timeline for programme coordination | PjM: portfolio ritual | Jira Plans | PUBLIC:jira:advanced-planning-overview | BEHIND (pending walk) · Later premium depth |
| 71 | PjM, PM | Delivery | Dependency arrows / filters on plan or timeline so blockers are visible across projects | PjM/PM: spot bottlenecks | Jira Plans dependencies | PUBLIC:jira:advanced-planning-overview · PUBLIC:jira:filter-plan | BEHIND (pending walk) |
| 72 | PM, PjM | Insights | Saved filters (named, shareable searches) so teams reopen the same lens | PM/PjM: resume a filtered board | Jira Save filter + defaults (UI-VERIFIED); also ClickUp/Linear saved/views | CI `jira/FEATURES.md` · `clickup/FEATURES.md` · `linear/FEATURES.md` · #107 | BEHIND |
| 73 | PjM | Hierarchy | Custom hierarchy levels above Epic when programme work needs more than Epic→Story | PjM: programme rollup | Jira Plans custom hierarchy | PUBLIC:jira:configure-custom-hierarchy | BEHIND (pending walk) · Later |
| 74 | PjM | Insights | Portfolio “all projects” dashboard that auto-connects boards when projects join/leave | PjM: leadership rollup | monday Portfolio All Projects Dashboard | PUBLIC:monday:all-projects-dashboard | BEHIND (pending walk) |
| 75 | PjM | Hierarchy | Portfolio automation creates a project from a template when a request is approved | PjM: stand up client projects fast | monday Portfolio automations | PUBLIC:monday:portfolio-automations | BEHIND (pending walk) · Completeness Next candidate |
| 76 | F, PjM | Client wedge | Guests see only shareable boards/projects they’re invited to — never the whole account | F/PjM: trusted client share | monday guests, ClickUp guests, Zoho Client Users | PUBLIC:monday:guest-start · PUBLIC:zoho:client-user-intro | BEHIND (pending walk) · wedge trust |
| 77 | PjM, PM | Insights | Dashboards that connect multiple boards/projects into one widget view | PjM/PM: glance health | monday Dashboards, ClickUp Dashboards | PUBLIC:monday:dashboards | BEHIND (pending walk) |
| 78 | F, PM | Activation | Personal My Work / My Tasks inbox across projects so ICs plan their day | F/PM: find my work | Asana My Tasks | PUBLIC:asana:views-in-my-tasks · PUBLIC:asana:all-features | BEHIND (pending walk) |
| 79 | PM, PjM | Hierarchy | Goals with measurable progress auto-linked from projects or tasks | PM/PjM: connect work to objectives | Asana Goals, ClickUp Goals | PUBLIC:asana:goals · PUBLIC:clickup:goals-okrs | BEHIND craft (D-121) · pending walk |
| 80 | PjM | Hierarchy | Portfolios list project health and accept status updates from project owners | PjM: monitor multi-project health | Asana Portfolios | PUBLIC:asana:portfolios-overview · PUBLIC:asana:all-features | BEHIND (pending walk) |
| 81 | PjM, PM | Delivery | Timeline / Gantt view with schedule, sections, and dependency-aware planning | PjM/PM: plan dates | Asana Timeline, ClickUp Gantt | PUBLIC:asana:timeline | PARITY-seeking craft · deepen pending walk |
| 82 | F, PM, PjM | Collab roles | Inbox / notification centre for followed projects, @mentions, and status changes | All: stay on top of work | Asana Inbox, Linear inbox patterns | PUBLIC:asana:all-features | BEHIND (pending walk) |
| 83 | F, PjM | Client wedge | Client Users (external profile) with project-scoped module access — not a full seat | F/PjM: trusted client share | Zoho Projects Client Users | PUBLIC:zoho:client-user-intro · PUBLIC:zoho:client-users-kb | BEHIND (pending walk) · wedge parity-of-trust |
| 84 | PjM | Hierarchy | Work-breakdown structure (phases / task lists / milestones) for delivery planning | PjM: track commitments | Zoho Projects WBS | PUBLIC:zoho:wbs · CI gap register | BEHIND (pending walk) |
| 85 | PM, PjM | Hierarchy | Goals & OKRs widgets fill with real progress — not permanent 0% shells | PM/PjM: plan beyond the board | ClickUp / Asana / monday Goals | PUBLIC:clickup:goals-okrs · D-121 | BEHIND craft |
| 86 | F, PM | Client wedge | Feedback tab accepts structured external requests that land in Triage/backlog | F/PM: capture client asks | Linear Asks/Triage adjacent | PUBLIC:linear:triage · CI Feedback tab | BEHIND craft · UNIQUE-potential if guest works |
| 87 | PM, PjM | Delivery | Changelog / ship notes surface publishes what went out with a release | PM/PjM: communicate ship | Linear Releases adjacent · peers | CI Changelog tab · PUBLIC:jira:enable-releases | BEHIND craft |
| 88 | PjM | Ops niche | Risks register with owners and severity for programme risk ritual | PjM: surface delivery risk | monday Portfolio Risk Insights class | D-245 · PUBLIC:monday:portfolio-solution | Later · Not Now vs Freeze |
| 89 | PjM, PM | Ops niche | Decisions log so architecture/product calls stay attached to the project | PjM/PM: remember why | Suite decision patterns | D-246 | Later |
| 90 | PM, PjM | Collab roles | Teams own workflow, triage, and cycle cadence — with clear roster membership | PM/PjM: organise delivery units | Linear Teams | PUBLIC:linear:conceptual-model · D-105 | BEHIND craft (pending walk) |
| 91 | PjM, F | Delivery | One-click project status update (On track / At risk / Off track) sharable to portfolio | PjM/F: report to stakeholders | Asana status updates | PUBLIC:asana:all-features · PUBLIC:asana:portfolios-overview | BEHIND (pending walk) |
| 92 | F, PM, PjM | Delivery | Custom fields on issues (select, date, number, text) for process-specific data | All: fit local process | ClickUp, Jira, monday custom fields | PUBLIC:jira:filter-plan (custom filters) · Direct feature pages | BEHIND (pending walk) |
| 93 | F, PM, PjM | Trust craft | Activity / comment thread on issues with @mention and clear history | All: collaborate on work | Linear / Jira / Asana comments | PUBLIC:linear:issue-relations (comment refs) · Direct norms | PARITY-seeking · deepen pending walk |
| 94 | PM, PjM | Extensibility | API tokens with scoped permissions and revoke — safe integration without shared passwords | PM/PjM: integrate the toolchain | Linear / Atlassian / ClickUp API tokens | CI API tokens gap · Direct developer docs | BEHIND maturity (pending walk) |
| 95 | F, PM | Delivery | Recurring tasks / issues for repeating client or ops work | F/PM: don’t re-create rituals | ClickUp recurring, Asana recurring | PUBLIC:clickup:create-automation (recurring trigger class) | Later |
| 96 | PM, PjM | Delivery | Components (or equivalent) to group work by area of the product/system | PM/PjM: find work in a feature slice | Jira Components | PUBLIC:jira:filter-plan · Jira components docs | Later |
| 97 | PjM | Hierarchy | Scenario / what-if planning on multi-project plans (premium Direct depth) | PjM: model plan changes | Jira Plans scenarios | PUBLIC:jira:advanced-planning-overview | Not Now · don’t chase Premium feature count |
| 98 | PM | Delivery | External Asks / Slack-class intake lands in Triage with optional required fields | PM: process new work from channels | Linear Asks + Triage | PUBLIC:linear:triage | Later · Completeness after Triage core |
| 99 | F, PM, PjM | Trust craft | Whiteboard / canvas for planning stays optional — never blocks core delivery activation | All: avoid tool sprawl | ClickUp Whiteboards, monday WorkCanvas | PUBLIC:clickup:docs (Whiteboards) · CI D-242 | Not Now (sprawl) |
| 100 | F, PM, PjM | Trust craft | Wiki depth is suite-adjacent or linked docs — not a second Confluence to maintain first | All: prefer quiet delivery OS | ClickUp Docs/Wiki, Confluence+Jira | PUBLIC:clickup:docs · CI D-241 | Not Now / Later · ADAPT Linear quiet |

| 101 | F, PM, PjM | Delivery | Filter issues by Labels from the Issues FilterBar (not only settings Labels) | PM/PjM: find work in a feature slice · F: tag client work | Linear Labels, ClickUp Tags (UI-VERIFIED); Jira Labels not in observed More-filters slice | UX-026 · FILTERS-BUILD-CRAFT · CI `linear/FEATURES.md` · `clickup/FEATURES.md` · FILTERS.md | BEHIND |
| 102 | PM, PjM | Delivery | Filter issues by Epic *relation* (“in epic X”) — not only Type = Epic | PM/PjM: slice a feature epic | Linear Relations→Parent (UI-VERIFIED); ClickUp no Epic/parent field in picker; Jira Parent not in observed slice | UX-027 · FILTERS-BUILD-CRAFT · CI `linear/FEATURES.md` · FILTERS.md | BEHIND |
| 103 | F, PM, PjM | Delivery | Filter operators beyond equality — is / is not / empty / includes — on core facets | All: exclude noise and find unset work | ClickUp Is/Is not/Is set/Is not set (UI-VERIFIED); Linear checklist/leaf; Jira JQL ops (UI-VERIFIED) | FILTERS.md · CI `clickup/FEATURES.md` · `linear/FEATURES.md` · `jira/FEATURES.md` | BEHIND |
| 104 | PM, PjM | Delivery | Combine filters with AND/OR (and nested groups) without leaving the FilterBar | PM/PjM: precise planning lenses | ClickUp AND/OR + nested (UI-VERIFIED); Linear Advanced and/or nest (UI-VERIFIED); Jira JQL AND/OR | FILTERS.md · CI `clickup/FEATURES.md` · `linear/FEATURES.md` · `jira/FEATURES.md` | BEHIND |
| 105 | F, PM, PjM | Delivery | Relative due-date presets (Today / This week / Next week) alongside From–To ranges | F/PM: plan the week without picking calendars | Linear Due presets + custom timeframe (UI-VERIFIED); ClickUp/Jira relative not confirmed this walk | FILTERS.md · FILTERS-BUILD-CRAFT (absolute only) · CI `linear/FEATURES.md` | BEHIND |
| 106 | F, PM, PjM | Delivery | Filter Issues by custom-field facets once fields exist on the project | All: fit local process in the same FilterBar | ClickUp: no custom-field entry in small free WS (UI); Linear Project properties; monday/Asana PUBLIC | FILTERS.md · reason #92 · FILTERS-BUILD-CRAFT · CI `clickup/FEATURES.md` | BEHIND (pending richer WS) |
| 107 | PM, PjM | Insights | Durable named saved filters — personal and team/shared — beyond shareable URL chips | PM/PjM: reopen the same lens | ClickUp Saved filters menu (UI-VERIFIED); Linear Custom Views builder (UI-VERIFIED); Jira Save filter + defaults (UI-VERIFIED) | FILTERS.md · FILTERS-BUILD-CRAFT (not observed) · CI `clickup|linear|jira/FEATURES.md` · #72 | BEHIND |
| 108 | F, PM | Delivery | One-click “Assigned to me” / Me Mode quick filter on Issues and My Work | F/PM: find my work instantly | ClickUp Me + distinct Me Mode (UI-VERIFIED); Linear Current user; Jira `currentUser()` + My open default | FILTERS.md · CI `clickup/FEATURES.md` · `linear/FEATURES.md` · `jira/FEATURES.md` | BEHIND |
| 109 | PM, PjM | Delivery | Filter by Release membership once release↔issue depth ships | PM/PjM: what’s in the ship set | Jira Affects versions in More filters (UI-VERIFIED); Linear/ClickUp Release not observed this walk | UX-025 · FILTERS-BUILD-CRAFT · CI `jira/FEATURES.md` · FILTERS.md | BEHIND |
| 110 | F, PM, PjM | Delivery | Keyboard focus for filters (Linear-class `F`) after facet parity — not before | All: power-user speed without chrome sprawl | Linear `F` not observed on 2026-10-01 walk; ClickUp Cmd/Ctrl+F = PUBLIC | FILTERS.md · CI `linear/FEATURES.md` (keyboard not walked) · PUBLIC:linear:filters | BEHIND (pending walk) |
| 111 | PM, PjM | Delivery | Filter by blocked-by / blocking / Dependency on the Issues FilterBar | PM/PjM: clear blockers | Linear Relations Blocked/Blocking (UI-VERIFIED); ClickUp Dependency field (UI-VERIFIED) | FILTERS.md · reason #60 · CI `linear/FEATURES.md` · `clickup/FEATURES.md` | BEHIND |
| 112 | F, PM, PjM | Trust craft | Keep filter chips + shareable URLs + filtered-empty honesty — PARITY strength to protect | All: resume a filtered board | Build craft VERIFIED; Direct URL share not scored this walk — protect Build strength | FILTERS-BUILD-CRAFT · reason #37 · FILTERS.md | PARITY-seeking |
| 113 | PM, PjM | Delivery | Natural-language AI → filter only after facet parity — never as Now table-stakes | PM/PjM: faster lens without blocking Labels/Epic | Linear AI filter suggestions (UI-VERIFIED); monday AI PUBLIC | CI `linear/FEATURES.md` · FILTERS.md · UX-PATTERNS §7 | Not Now / Later · AVOID as Now |
| 114 | PM, PjM | Delivery | Prefer chips + named saved views over a JQL-class query language | PM/PjM: precise search without enterprise query debt | Jira Basic + JQL autocomplete EMPTY/currentUser/WAS/CHANGED (UI-VERIFIED) | CI `jira/FEATURES.md` · FILTERS.md · UX-PATTERNS §7 | Not Now · AVOID chase |
| 115 | F, PM | Delivery | When shipping Labels, ADAPT ClickUp **Tags** naming so Freelancers recognise tag-style slices | F: tag client work · PM: label feature slices | ClickUp Tags (UI-VERIFIED) vs Linear Labels (UI-VERIFIED) | CI `clickup/FEATURES.md` · `linear/FEATURES.md` · UX-026 · FILTERS.md | PARITY-seeking (naming) |

---

## Rollup by ICP (approx.)

| ICP | Reason #s (primary emphasis) |
| --- | --- |
| **F** | 1–6, 11, 13, 16–18, 20, 30–33, 37, 39–41, 47, 50–52, 64–67, 76, 78, 82–83, 86, 91–93, 95, 99–115 |
| **PM** | 1–2, 7–9, 12–15, 17–22, 26–29, 32–37, 42, 44, 48–52, 55–63, 65–66, 69, 71–72, 77–79, 81–82, 85–87, 90, 92–94, 96, 98–115 |
| **PjM** | 1–6, 9–12, 14–16, 18–23, 24–25 (Later), 26–27, 30–31, 36–38, 43–47, 51–55, 60–64, 66, 68–77, 79–85, 87–94, 96–97, 99–115 |

## Rollup by theme

| Theme | Count (approx.) | Freeze vs Next |
| --- | --- | --- |
| Activation | 10 | Freeze #1–2; Next templates/checklist/My Work |
| Client wedge | 9 | Freeze #3–6; Next guest scope + Zoho-class Client Users |
| Delivery | 40 | Completeness Next (cycles, triage, relations, releases, **filters wave** + UI-VERIFIED fold) |
| Collab roles | 7 | Completeness P0/P1 candidates + Teams |
| Insights | 9 | Completeness Next (reports, filters, dashboards) |
| Hierarchy | 14 | Completeness Next membership; Later Plans/scenarios |
| Extensibility | 8 | Next craft; live fire + Form URL Later/Next |
| Finance | 2 | Next |
| Auth | 1 | Later (PM-004 polish / SSO) |
| Trust craft | 5 | Next honesty; Not Now sprawl (#52, #99–100) |
| Ops niche | 5 | Not Now / Later — do not swell Freeze |

## Evidence mix (2026-10-01 IST)

| Bucket | Rows | Notes |
| --- | --- | --- |
| Build Completeness / Freeze / UX / QA | **1–55** | Ledger, BUG/UX/CW/PM IDs — competitor beats from CI Cut + gap register, not signed-in walks |
| Public-doc provisional | **56–100** | `PUBLIC:<product>:<page>` — **BEHIND (pending walk)** until CI files FEATURES.md (non-filter themes) |
| Filter wave (Build craft + CI UI-VERIFIED) | **101–115** | `FILTERS.md` · `FILTERS-BUILD-CRAFT.md` · CI `clickup|linear|jira/FEATURES.md` |
| Competitor signed-in filter grammar | **ClickUp · Linear · Jira** | ACCOUNT SIGNED IN; Filters **UI-VERIFIED** 2026-10-01 IST. monday/Asana still empty |

## CI walk status (filters)

- **ClickUp / Linear / Jira:** Filters folded as **UI-VERIFIED** into `FILTERS.md` and reasons **#101–115**. Cite CI FEATURES paths — do not invent beyond dumps.
- **monday / Asana:** still no walk MDs — PUBLIC Hypothesis only.
- Residual: Linear keyboard `F` not observed; Jira Labels/Parent not in opened More-filters slice; ClickUp custom fields absent in small WS.
- Non-filter public-doc rows **56–100** stay **BEHIND (pending walk)** until their CI FEATURES land. Do not market beats that lack walk or public-doc evidence.

## Explicit non-claims

- Build does **not** yet ship cold-invite reliability, auto Build role, or client grant→guest.
- Active cycle chrome, named reports, **labels/epic filters (UX-026/027 · #101–102)**, program membership, org budget, password/SSO remain **BEHIND** or craft-short.
- Filter chips + URL shareability (#37, #112) are **PARITY-seeking** — protect; do not claim UNIQUE.
- Linear **AI filter** (#113) and Jira **JQL** (#114) are walk-confirmed on Directs — still **AVOID as Now / AVOID chase**; ship Labels+Epic+saved views first.
- Tags vs Labels (#115) is naming ADAPT — does **not** claim Build ships Labels today.
- PARITY rows are **protect/keep** strengths — still not permission to claim UNIQUE.
- Ops niche (#24–25, #53–54 eng depth, #88–89, #97, #99–100) must not swell Freeze without Aditya.
- Public-doc rows do **not** claim Build has the feature; they name Direct table stakes to close.
- Do not chase JSM / Premium Plans scenario feature count; protect client-portal wedge.
