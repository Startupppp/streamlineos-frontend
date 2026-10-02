# StreamlineOS Build — CI First Cut (2026-09-30)

**Audience:** Principal Competitor Analyst  
**Product focus:** StreamlineOS Build module (`https://www.streamlineos.in/build`)  
**Scope Contract:** v1.0 (frozen)  
**Access date (all sources):** 2026-09-30  
**Research mode:** Public web only — no account creation, no ToS beyond reading public pages, no signed-in product map, no paid-feature testing  
**Cycle goal (ASSUMED):** trust + activation of Build  

**Status legend:** `AVAILABLE` | `BETA` | `ANNOUNCED` | `DEPRECATED` | `REPORTED` | `INFERRED` | `UNKNOWN`

---

## Category & JTBD

### What StreamlineOS claims publicly (VERIFIED vs INFERRED)

| Claim | Label | Evidence |
| --- | --- | --- |
| Multi-app business OS: HR, Recruitment, Attendance, Payroll, Performance, CRM, Sales, Quotes, Billing, Customer Success, **Build**, Timesheets, Accounting, Helpdesk | **VERIFIED** | Homepage app strip names these modules explicitly ([streamlineos.in](https://www.streamlineos.in), access 2026-09-30) |
| Suite promise: replace multiple tools (HR + CRM + projects + chat + analytics) in one workspace | **VERIFIED** | Homepage + pricing FAQ; LinkedIn posts 2026-06 / 2026-08 (secondary) |
| Projects/delivery: kanban, cycles, epics, time tracking; sprint planning; bug triage; release linking; approvals; risk visibility | **VERIFIED** (homepage copy for Projects) / **REPORTED** (LinkedIn “PM module” early access narrative) | Homepage “Run cycles…” section; LinkedIn PM early-access post |
| Org-priced packaging (not per-seat meter); Free ≤5 seats; Starter/Professional/Enterprise seat caps | **VERIFIED** (with note: pricing page shows USD plan cards + INR savings calculator — copy inconsistency to monitor) | [Pricing](https://www.streamlineos.in/pricing) |
| Workflows, custom roles, public API on paid tiers | **VERIFIED** (plan matrix features) | Pricing compare table |
| `/build` public marketing page content | **Auth-walled** — fetch returns sign-in shell only | [Build URL](https://www.streamlineos.in/build) → “Sign in or create an account” |
| Exact identity of **Build** (Projects/PM rename vs custom-app/page/workflow builder vs other) | **UNKNOWN** | No public Build feature page; Designer note that shell is auth-walled |
| Target customer | **INFERRED** | India/APAC SMB–midmarket teams (5–500) wanting one OS; multi-branch/org stories; India DPDP + residency messaging |

### Category call (first cut)

**Primary framing (ASSUMED per Scope Contract):** Build sits in a **work / project management OS** class *inside* a multi-app business suite.

**Important dual-hypothesis (do not collapse yet):**

1. **H-PM (leaning from public suite copy):** Build ≈ delivery/Projects (kanban, cycles, sprints, bugs, approvals) — seeds ClickUp / Linear / Jira are **adjacent–direct for the job**, while Zoho One / Odoo are **direct for Build-in-suite**.
2. **H-Builder (open until signed-in map):** Build ≈ custom apps / pages / workflows / domains / roles / APIs — then Retool / Appsmith / Budibase / Power Apps / Zoho Creator become **direct**, and pure PM tools become **adjacent**.

Until a signed-in Build ledger exists, treat **suite peers as the highest-confidence direct set** and **PM seeds as adjacent-until-proven**.

### JTBD boundaries (working)

| Job | In-boundary if… | Out-of-boundary (for this cut) |
| --- | --- | --- |
| Plan & track delivery work | Boards/lists/cycles/sprints/epics/time | Pure code hosting (GitHub alone) |
| Cross-function work in one OS | Work linked to HR/CRM/Payroll records | Point solutions requiring brittle iPaaS as the product |
| Configure who sees what | Roles, module permissions, branch/org scopes | Full IAM/IdP products |
| Automate handoffs | Workflows/approvals between modules | Enterprise RPA platforms |
| Extend / customize (IF H-Builder) | Pages, custom apps, APIs, domains | Consumer no-code website builders; FlutterFlow-class mobile app studios |
| Do-nothing substitutes | Spreadsheets + chat + email | — |

---

## Discovery method & inclusion criteria

### Method
1. **Primary:** WebFetch official StreamlineOS home, `/build`, `/pricing`, `/legal/security`, `/legal/privacy`.
2. **Seed evaluation:** ClickUp, Linear, Jira (per Scope Contract) + Monday, Asana, Notion, Height, Basecamp.
3. **Suite / modular OS search:** “StreamlineOS competitors”, “all-in-one business OS”, “modular ERP”, India SMB OS narratives → Zoho One, Odoo, Aeion OS, BizXOS, Mingrow, MOM (noted as emerging / limited CI depth).
4. **Internal-tools / builder search:** Retool, Appsmith, Budibase, FlutterFlow, Microsoft Power Apps / Dynamics, Salesforce Platform.
5. **Status-quo:** Soft UI / custom internal tools; spreadsheets.

### Inclusion criteria (comparison set)
- Publicly documented product + pricing (or clear OSS license posture).
- Clear overlap with **at least one** of: suite work module, PM/work OS, or internal-app builder.
- Represents a slot: **market leader**, **closest suite peer**, **innovator**, **low-cost/OSS**, **emerging threat**, or **do-nothing**.

### Excluded categories (with rationale)
| Excluded | Why |
| --- | --- |
| Height.app | **DEPRECATED** — service shut down ~2025-09 (secondary reports); not actionable |
| FlutterFlow | Mobile/app-studio focus; weak overlap with suite Build-in-OS until H-Builder proven for mobile |
| Pure ATS/HRIS or pure CRM | Overlap with other StreamlineOS modules, not Build specifically |
| Aeion OS / BizXOS / Mingrow / MOM | Emerging “business OS” rhetoric; thin primary CI depth for Build-comparable jobs → parked in **emerging** taxonomy, not full one-pagers |
| Salesforce Platform (full one-pager) | Enterprise-heavy; covered under substitute taxonomy + brief note |
| Soft UI agencies | Status-quo substitute — monitoring only |

### Saturation point
Stopped expanding longlist once each taxonomy cell (direct suite / adjacent PM / builder / OSS / emerging / do-nothing) had ≥1 strong public exemplar and further names added no new **job** dimension. Target comparison set size **10** (within 8–12).

---

## Market map / taxonomy

| Taxonomy | Players (this cut) | Note |
| --- | --- | --- |
| **Direct (suite peers)** | Zoho One (+ Zoho Projects), Odoo | Same buyer job: multi-app OS including projects/work |
| **Adjacent (PM / work OS seeds)** | ClickUp, Jira, Linear, monday.com, Asana | Compete for delivery/activation if Build is PM; may become Direct if Build ≡ Projects |
| **Substitute (workspace / knowledge)** | Notion | Docs+DB+light projects; often coexists |
| **Substitute (simple / org-priced PM)** | Basecamp | Flat org pricing similar *spirit* to StreamlineOS org plans |
| **OSS / low-cost builders** | Appsmith (OSS+cloud), Budibase (OSS+cloud) | Relevant **only if** H-Builder |
| **Platform / internal tools** | Retool, Microsoft Power Apps (+ Dynamics) | High threat **if** Build is custom-app layer |
| **Emerging (India / AI Business OS)** | Aeion OS, BizXOS, Mingrow, MOM | Watch list; not deep-profiled |
| **Do-nothing** | Spreadsheets + chat + email; Soft UI / custom | Default for SMB activation failure |

```
                    SUITE / ALL-IN-ONE
         Zoho One ●──────────● Odoo
                    \        /
                     \      /
                      StreamlineOS
                     /   |    \
            PM/WORK /    |     \ BUILDERS (if H-Builder)
   ClickUp·Jira·Linear   |      Retool·Appsmith·Budibase·Power Apps
   monday·Asana          |
                         ● Notion · Basecamp
                         ● Spreadsheets (do-nothing)
```

---

## Comparison set (justified)

| # | Competitor | Slot | Include rationale | Threat to Build (first cut) |
| --- | --- | --- | --- | --- |
| 1 | **Zoho One / Zoho Projects** | Closest suite peer | Same “OS for business” pitch; Projects + Creator + HR/CRM in one bill | **High** |
| 2 | **Odoo** | Modular ERP leader | Explicit cost-comparison target on StreamlineOS pricing FAQ variants; all-apps fee | **High** |
| 3 | **ClickUp** | Work OS market leader / seed | All-in-one work solution; sprints, docs, chat, automations, AI | **Med–High** |
| 4 | **Jira (Cloud)** | Issue/PM market leader / seed | Default for eng delivery; deep workflows | **Med** (High for eng-only Buyers) |
| 5 | **Linear** | Innovator / seed | Best-in-class product-dev UX; cycles/initiatives/agents | **Med** (Low for non-eng suite buyers) |
| 6 | **monday.com** | Work OS | Boards + AI “Vibe app builder”; CRM/Dev products | **Med** |
| 7 | **Asana** | Work management | Goals/portfolios/approvals; AI Studio | **Med–Low** |
| 8 | **Notion** | Workspace substitute | Databases/projects/AI agent; often lands before suite | **Med–Low** |
| 9 | **Basecamp** | Org-priced simple PM | Flat pricing analogue; anti-complexity | **Low–Med** |
| 10 | **Retool** | Internal tools innovator | If Build = apps/APIs/roles — primary peer | **High if H-Builder; else Low** |
| 11 | **Appsmith** | OSS / low-cost builder | Open-source + cheap cloud; India-friendly self-host narrative | **Med if H-Builder; else Low** |

**Parked (not in 11):** Budibase (covered via Appsmith OSS cell), Power Apps/Dynamics (matrix rows only), Salesforce Platform, Aeion/BizXOS/Mingrow, spreadsheets (implications section).

---

## Competitor one-pagers

### 1) Zoho One / Zoho Projects — Direct suite peer

| Field | Content |
| --- | --- |
| Target customer | SMBs → midmarket wanting many apps, one admin/invoice (“operating system for businesses”) |
| Core promise | 40–50+ apps unified; Essentials vs Standard editions |
| Build-relevant workflows | Zoho Projects (tasks/issues/sprints via Zoho Sprints), Zoho Creator (low-code), Zoho Flow (automation), custom modules in CRM |
| Key capabilities | Projects **AVAILABLE**; Creator low-code **AVAILABLE**; unified SSO/admin **AVAILABLE** |
| Pricing (public) | Zoho One Standard All-Employee ~**US$37/employee/mo** annual; Flexible ~**US$90/user/mo** annual (secondary confirmations cite July 2026 checks; official page partially obscures numerals in fetch). Zoho Projects Free for 5 users standalone ([zoho.com/one/pricing](https://www.zoho.com/one/pricing/), [zoho.com/projects/zohoprojects-pricing.html](https://www.zoho.com/projects/zohoprojects-pricing.html)) |
| Recent direction | Platform + AI (Zia), MCP server for Projects (mentioned on Projects pricing) — treat as **AVAILABLE** on public pages |
| UX model | Multi-app suite with shared identity; Projects as dedicated app |
| Strengths | Breadth, India/global SMB brand, Creator for extensibility, price aggression on All-Employee |
| Weaknesses | UX consistency across apps; “many apps” ≠ one coherent work surface; Creator skill curve |
| Threat | **High** — same category story StreamlineOS tells; can satisfy PM *and* builder JTBD |

### 2) Odoo — Direct modular ERP

| Field | Content |
| --- | --- |
| Target customer | Companies wanting ERP-breadth (Sales, Inventory, HR, Project, Accounting…) |
| Core promise | “Hundreds of apps for a single price” |
| Build-relevant workflows | Project app; Studio (customization) on Custom plan; External API on Custom |
| Key capabilities | Project **AVAILABLE**; Studio **AVAILABLE** (Custom); multi-company **AVAILABLE** (Custom) |
| Pricing | One App Free **$0**; Standard ~**$24.90→$31.10**/user/mo (promo then list, US); Custom ~**$49→$61**/user/mo ([odoo.com/pricing](https://www.odoo.com/pricing)) |
| Recent direction | Agentic AI called out on Custom plan marketing (2026 pricing page) |
| UX model | Backend ERP modules; Studio for no/low-code extension |
| Strengths | Module depth, community+enterprise ecosystem, transparent all-apps fee |
| Weaknesses | Implementation cost/time; UI density; not “realtime chat OS” positioning |
| Threat | **High** for buyers comparing all-in-one cost (StreamlineOS itself cites Odoo in pricing narrative variants) |

### 3) ClickUp — Adjacent work OS (seed)

| Field | Content |
| --- | --- |
| Target customer | Teams consolidating tasks/docs/chat/goals into one work hub |
| Core promise | “The best work solution, for the best price” / AI for work |
| Build-relevant workflows | Tasks, sprints, Docs, Chat, Dashboards, Automations, Custom fields, Whiteboards |
| Key capabilities | Sprints/Kanban/Docs/Automations **AVAILABLE**; Brain AI add-ons **AVAILABLE** |
| Pricing | Free Forever; Unlimited **$7**/user/mo annual; Business **$12**; Enterprise custom; AI Brain **$9** / Everything AI **$28** ([clickup.com/pricing](https://clickup.com/pricing)) |
| Recent direction | Heavy AI agents / Super Credits packaging (2026 pricing page) |
| UX model | Hierarchical Spaces → Folders → Lists; highly configurable |
| Strengths | Feature density, free tier, AI investment |
| Weaknesses | Complexity/noise; not HR/Payroll suite |
| Threat | **Med–High** for activation of delivery work; **Low** as full suite replacement |

### 4) Jira Cloud — Adjacent issue/PM leader (seed)

| Field | Content |
| --- | --- |
| Target customer | Software/IT delivery orgs; Atlassian ecosystem buyers |
| Core promise | Issue tracking + agile planning at scale |
| Build-relevant workflows | Issues, boards, backlogs, roadmaps (Premium+), workflows, automation, permissions |
| Key capabilities | Core agile **AVAILABLE**; Advanced Roadmaps Premium **AVAILABLE**; Marketplace apps **AVAILABLE** |
| Pricing | Free ≤10 users; Standard ~**$9**/user/mo class; Premium ~**$18**/user/mo class (scale-dependent; calculator on Atlassian) ([atlassian.com/software/jira/pricing](https://www.atlassian.com/software/jira/pricing)) — fetch partially CSS-blocked; prices from support/community secondary labeled **REPORTED** |
| Recent direction | Rovo AI / Atlassian Intelligence (ecosystem) — verify via official changelog for formal claims |
| UX model | Project-centric issue tracker; admin-heavy workflows |
| Strengths | Category default, ecosystem, enterprise governance |
| Weaknesses | Overhead for SMB non-eng; not a business OS |
| Threat | **Med** overall; **High** if StreamlineOS Build targets eng PM parity |

### 5) Linear — Adjacent innovator (seed)

| Field | Content |
| --- | --- |
| Target customer | Product/eng teams optimizing issue velocity |
| Core promise | “The system for product development” |
| Build-relevant workflows | Issues, projects, cycles, initiatives, triage, git-linked reviews, agents/MCP |
| Key capabilities | Cycles/initiatives **AVAILABLE**; Agent platform **AVAILABLE** (Free includes Agent platform per pricing); Insights/Asks Business+ |
| Pricing | Free (limits); Basic **$10**/user/mo annual; Business **$16**; Enterprise custom ([linear.app/pricing](https://linear.app/pricing)) |
| Recent direction | AI agents, Coding Sessions, Loops (metered credits noted in secondary reviews) |
| UX model | Keyboard-first, opinionated, fast |
| Strengths | UX quality, eng love, modern AI/agent story |
| Weaknesses | Narrow ICP; no HR/CRM suite |
| Threat | **Med** for product teams; **Low** for full StreamlineOS buyer |

### 6) monday.com — Adjacent work OS

| Field | Content |
| --- | --- |
| Target customer | Cross-functional teams; also CRM / Dev / Service product lines |
| Core promise | Work OS boards + AI agents; “Vibe app builder” to turn needs into apps |
| Build-relevant workflows | Boards, automations, dashboards, time tracking, sprints (monday dev), **Vibe app builder** |
| Key capabilities | Work management **AVAILABLE**; Vibe app builder **AVAILABLE** (AI credit–powered); monday CRM/Dev **AVAILABLE** as separate SKUs |
| Pricing | Free ≤2 seats; Basic **$9**; Standard **$12**; Pro **$19**/seat/mo annual (Work Management); Enterprise custom ([monday.com/pricing](https://monday.com/pricing)) |
| Recent direction | AI credits, agents, Vibe app builder — blurs PM vs builder |
| UX model | Colorful boards/columns; productized vertical SKUs |
| Strengths | Brand, AI builders narrative, templates |
| Weaknesses | Seat minimums/buckets; price climb; suite split across products |
| Threat | **Med** — and **rising** if Build = light app builder (Vibe is a peer narrative) |

### 7) Asana — Adjacent work management

| Field | Content |
| --- | --- |
| Target customer | Midmarket–enterprise cross-functional work |
| Core promise | Agentic work management; goals → projects |
| Build-relevant workflows | Tasks, timeline/Gantt, portfolios, goals, approvals, forms, AI Studio / Teammates |
| Key capabilities | Core PM **AVAILABLE**; AI Teammates/Dash **AVAILABLE** (metered); Enterprise governance **AVAILABLE** |
| Pricing | Personal (2 users); Starter ~**$10.99**/user/mo annual class; Advanced ~**$24.99**; Enterprise custom ([asana.com/pricing](https://asana.com/pricing) — dollar amounts partially from secondary 2026 roundups labeled **REPORTED** where page omits explicit $) |
| Recent direction | AI Teammates, Dash, AI Studio credit packs |
| UX model | Work Graph; project-centric |
| Strengths | Goals/portfolio maturity, brand trust |
| Weaknesses | Expensive Advanced tier; not multi-app OS |
| Threat | **Med–Low** |

### 8) Notion — Substitute workspace

| Field | Content |
| --- | --- |
| Target customer | Knowledge-first teams; startups; ops building wikis+DBs |
| Core promise | “One tool to run your company” / AI workspace |
| Build-relevant workflows | Databases, projects/tasks properties, forms, sites, Notion Agent, Workers (Beta) |
| Key capabilities | Databases/projects **AVAILABLE**; Notion Agent **AVAILABLE** (Business+); Workers **BETA** |
| Pricing | Free; Plus **$10**/member/mo; Business **$20**; Enterprise custom ([notion.com/pricing](https://www.notion.com/pricing)) |
| Recent direction | Agents + Workers Beta (custom code/tools) |
| UX model | Page/block canvas + databases |
| Strengths | Ubiquity, flexible schemas, AI |
| Weaknesses | Weak structured delivery at scale; not HR/Payroll |
| Threat | **Med–Low** (land-and-expand before suite) |

### 9) Basecamp — Substitute simple / org-priced

| Field | Content |
| --- | --- |
| Target customer | SMBs, agencies, anti-complexity buyers |
| Core promise | Fixed price, unlimited users (Studio+), all core tools |
| Build-relevant workflows | To-dos, Card Tables (kanban), message boards, chat, schedule, docs, check-ins |
| Key capabilities | Card Tables **AVAILABLE**; time tracking on higher plans **AVAILABLE**; AI connectors **ANNOUNCED**/partial (“coming soon” MCP on pricing) |
| Pricing | Free 1 project; Freelancer **$25**/mo; Studio **$59**; Pro **$99**; Unlimited **$299**/mo annual ([basecamp.com/pricing](https://basecamp.com/pricing)) |
| Recent direction | BYO AI agents / ChatGPT·Claude connectors |
| UX model | Opinionated project toolkit; deliberately limited |
| Strengths | Pricing predictability (similar *org* economics to StreamlineOS messaging); trust |
| Weaknesses | No deep agile/eng; no suite HR/CRM |
| Threat | **Low–Med** — pricing narrative competitor more than feature peer |

### 10) Retool — Platform builder (conditional Direct)

| Field | Content |
| --- | --- |
| Target customer | Ops/eng building internal tools on existing data |
| Core promise | Build internal apps/workflows/agents connected to your data |
| Build-relevant workflows | Web/mobile apps, workflows, RBAC, resources/APIs, embedded portals |
| Key capabilities | App builder **AVAILABLE**; Workflows **AVAILABLE**; Agents **AVAILABLE**; SSO/SCIM Enterprise **AVAILABLE** |
| Pricing | Free ≤5 users; Team Builder **$10**/mo annual + Internal user **$5**; Business Builder **$50** + Internal **$15**; Enterprise custom ([retool.com/pricing](https://retool.com/pricing)) |
| Recent direction | AI-native rebuilt app builder; agents hourly billing |
| UX model | IDE-like builder + runtime apps |
| Strengths | Depth for internal tools; governance; self-host |
| Weaknesses | Not a business OS; requires data sources; builder ≠ end-user suite |
| Threat | **High if H-Builder**; **Low if H-PM only** |

### 11) Appsmith — OSS / low-cost builder (conditional)

| Field | Content |
| --- | --- |
| Target customer | Developers/teams wanting OSS or cheap internal apps |
| Core promise | Low-code app platform; simple user-based pricing; community self-host |
| Build-relevant workflows | Apps, Git versioning, workflows (Business+), roles, embed |
| Key capabilities | Cloud Free **AVAILABLE**; self-host Community **AVAILABLE**; Business workflows **AVAILABLE** |
| Pricing | Free ≤5 cloud users; Business **$15**/user/mo; Enterprise **$2,500**/mo for 100 users ([appsmith.com/pricing](https://www.appsmith.com/pricing)) |
| Recent direction | Workflows + packages on Business; enterprise airgap add-on |
| UX model | Drag-drop + JS |
| Strengths | Cost, OSS narrative, India-friendly deploy stories |
| Weaknesses | Not a suite; needs engineering ownership |
| Threat | **Med if H-Builder**; else **Low** |

---

## CI matrix draft (CI-001…)

> StreamlineOS Build column = **UNKNOWN** until signed-in capability ledger.  
> Confidence: H = high (official page), M = medium (official but incomplete fetch / secondary confirm), L = low.

| ID | Job / capability | Competitor | Status | Source URL | Confidence | StreamlineOS Build |
| --- | --- | --- | --- | --- | --- | --- |
| CI-001 | Kanban / board delivery | ClickUp | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-002 | Kanban / board delivery | Jira | AVAILABLE | https://www.atlassian.com/software/jira/pricing | H | UNKNOWN |
| CI-003 | Kanban / board delivery | Linear | AVAILABLE | https://linear.app/pricing | H | UNKNOWN |
| CI-004 | Kanban / board delivery | monday.com | AVAILABLE | https://monday.com/pricing | H | UNKNOWN |
| CI-005 | Kanban / board delivery | Zoho Projects | AVAILABLE | https://www.zoho.com/projects/zohoprojects-pricing.html | H | UNKNOWN |
| CI-006 | Kanban / board delivery | Odoo Project | AVAILABLE | https://www.odoo.com/documentation/18.0/applications/services/project/project_management.html | H | UNKNOWN |
| CI-007 | Sprints / cycles | ClickUp | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-008 | Sprints / cycles | Linear | AVAILABLE | https://linear.app/pricing | H | UNKNOWN |
| CI-009 | Sprints / cycles | Jira | AVAILABLE | https://support.atlassian.com/jira-software-cloud/docs/ | M | UNKNOWN |
| CI-010 | Sprints / cycles | StreamlineOS *Projects* (suite marketing, not Build-proven) | AVAILABLE (suite claim) | https://www.streamlineos.in | H | UNKNOWN (Build≠Projects?) |
| CI-011 | Epics / initiatives / hierarchy | Linear | AVAILABLE | https://linear.app/pricing | H | UNKNOWN |
| CI-012 | Epics / initiatives / hierarchy | Asana (portfolios/goals) | AVAILABLE | https://asana.com/pricing | H | UNKNOWN |
| CI-013 | Time tracking | ClickUp | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-014 | Time tracking | monday Pro+ | AVAILABLE | https://monday.com/pricing | H | UNKNOWN |
| CI-015 | Time tracking | Basecamp (higher plans) | AVAILABLE | https://basecamp.com/pricing | H | UNKNOWN |
| CI-016 | Approvals / triage inbox | Linear (triage) | AVAILABLE | https://linear.app/pricing | H | UNKNOWN |
| CI-017 | Approvals | Asana Advanced+ | AVAILABLE | https://asana.com/pricing | H | UNKNOWN |
| CI-018 | Workflow automation | ClickUp | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-019 | Workflow automation | Zoho Flow / One | AVAILABLE | https://www.zoho.com/one/plan-details.html | M | UNKNOWN |
| CI-020 | Workflow automation | StreamlineOS suite paid plans | AVAILABLE (suite matrix) | https://www.streamlineos.in/pricing | H | UNKNOWN |
| CI-021 | Custom roles / RBAC | Retool Business+ | AVAILABLE | https://retool.com/pricing | H | UNKNOWN |
| CI-022 | Custom roles / RBAC | Appsmith Business+ | AVAILABLE | https://www.appsmith.com/pricing | H | UNKNOWN |
| CI-023 | Custom roles / RBAC | StreamlineOS suite paid | AVAILABLE (suite) | https://www.streamlineos.in/pricing | H | UNKNOWN |
| CI-024 | Public / external API | StreamlineOS suite paid | AVAILABLE (suite) | https://www.streamlineos.in/pricing | H | UNKNOWN |
| CI-025 | Public / external API | Odoo Custom | AVAILABLE | https://www.odoo.com/pricing | H | UNKNOWN |
| CI-026 | Public / external API | monday (API quotas by plan) | AVAILABLE | https://monday.com/pricing | H | UNKNOWN |
| CI-027 | Custom app / page builder | Retool | AVAILABLE | https://retool.com/pricing | H | UNKNOWN |
| CI-028 | Custom app / page builder | Appsmith | AVAILABLE | https://www.appsmith.com/pricing | H | UNKNOWN |
| CI-029 | Custom app / page builder | monday Vibe app builder | AVAILABLE | https://monday.com/pricing | H | UNKNOWN |
| CI-030 | Custom app / page builder | Zoho Creator (via One) | AVAILABLE | https://www.zoho.com/one/ | M | UNKNOWN |
| CI-031 | Custom app / page builder | Notion Workers | BETA | https://www.notion.com/pricing | H | UNKNOWN |
| CI-032 | Low-code ERP extension | Odoo Studio | AVAILABLE | https://www.odoo.com/pricing | H | UNKNOWN |
| CI-033 | Low-code enterprise apps | Microsoft Power Apps Premium | AVAILABLE | https://www.microsoft.com/licensing/guidance/Power-Platform | M | UNKNOWN |
| CI-034 | Docs + work in one surface | ClickUp Docs | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-035 | Docs + work in one surface | Notion | AVAILABLE | https://www.notion.com/pricing | H | UNKNOWN |
| CI-036 | Native chat beside work | ClickUp Chat | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-037 | Native chat beside work | Basecamp Campfire | AVAILABLE | https://basecamp.com/pricing | H | UNKNOWN |
| CI-038 | Native chat beside work | StreamlineOS suite (chat claimed) | AVAILABLE (suite) | https://www.streamlineos.in | H | UNKNOWN |
| CI-039 | Org / flat pricing (not per seat) | Basecamp | AVAILABLE | https://basecamp.com/pricing | H | N/A (suite pricing) |
| CI-040 | Org / flat pricing | StreamlineOS suite | AVAILABLE | https://www.streamlineos.in/pricing | H | N/A |
| CI-041 | Multi-app HR+CRM+Projects one bill | Zoho One | AVAILABLE | https://www.zoho.com/one/pricing/ | H | N/A (suite) |
| CI-042 | Multi-app HR+CRM+Projects one bill | Odoo | AVAILABLE | https://www.odoo.com/pricing | H | N/A (suite) |
| CI-043 | Multi-app HR+CRM+Projects one bill | StreamlineOS | AVAILABLE | https://www.streamlineos.in/pricing | H | N/A |
| CI-044 | AI agents on work | ClickUp Brain/Agents | AVAILABLE | https://clickup.com/pricing | H | UNKNOWN |
| CI-045 | AI agents on work | Linear Agent | AVAILABLE | https://linear.app/pricing | H | UNKNOWN |
| CI-046 | AI agents on work | Asana AI Teammates | AVAILABLE | https://asana.com/pricing | H | UNKNOWN |
| CI-047 | Data residency options | StreamlineOS | AVAILABLE (regions at signup; Enterprise controls) | https://www.streamlineos.in/pricing ; https://www.streamlineos.in/legal/security | H | UNKNOWN |
| CI-048 | SOC2 posture | StreamlineOS | ANNOUNCED/in-progress (Type I in progress; Type II scheduled) | https://www.streamlineos.in/legal/security | H | UNKNOWN |
| CI-049 | Self-host option | Odoo Custom / Appsmith / Retool Enterprise | AVAILABLE | respective pricing | H | ANNOUNCED (Enterprise self-hosting option on StreamlineOS pricing matrix) |
| CI-050 | Bug↔release linking | Linear / Jira | AVAILABLE | product docs/pricing | M | UNKNOWN (claimed in LinkedIn PM narrative for suite) |

---

## Source register

| ID | URL | Type | Pub/Update date | Access date | Used for |
| --- | --- | --- | --- | --- | --- |
| S01 | https://www.streamlineos.in | Official marketing | Unknown (live) | 2026-09-30 | Suite claims, module names incl. Build, Projects copy, pricing teasers |
| S02 | https://www.streamlineos.in/build | Official product route | — | 2026-09-30 | Auth wall VERIFIED |
| S03 | https://www.streamlineos.in/pricing | Official pricing | Unknown | 2026-09-30 | Plans, seat caps, feature matrix, residency |
| S04 | https://www.streamlineos.in/legal/security | Official trust | Effective 2026-06-09 | 2026-09-30 | Security, compliance posture, RBAC roles |
| S05 | https://www.streamlineos.in/legal/privacy | Official privacy | Effective 2026-06-09 | 2026-09-30 | Subprocessors, AI, controller/processor |
| S06 | LinkedIn Streamline OS posts (PM early access; one-tool narrative) | Secondary vendor social | ~2026-06 to 2026-08 | 2026-09-30 | PM module narrative **REPORTED** |
| S07 | https://clickup.com/pricing | Official | Live 2026 | 2026-09-30 | ClickUp profile |
| S08 | https://linear.app/pricing | Official | Live 2026 | 2026-09-30 | Linear profile |
| S09 | https://www.atlassian.com/software/jira/pricing | Official | Live 2026 | 2026-09-30 | Jira (fetch degraded — CSS heavy) |
| S10 | https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/ | Official support | Live | 2026-09-30 | Jira plan structure |
| S11 | https://monday.com/pricing | Official | Live 2026 | 2026-09-30 | monday profile + Vibe |
| S12 | https://asana.com/pricing | Official | Live 2026 | 2026-09-30 | Asana profile |
| S13 | https://www.notion.com/pricing | Official | Live 2026 | 2026-09-30 | Notion profile |
| S14 | https://basecamp.com/pricing | Official | Live 2026 | 2026-09-30 | Basecamp profile |
| S15 | https://www.zoho.com/one/pricing/ | Official | Live 2026 | 2026-09-30 | Zoho One |
| S16 | https://www.zoho.com/projects/zohoprojects-pricing.html | Official | Live 2026 | 2026-09-30 | Zoho Projects |
| S17 | https://www.odoo.com/pricing | Official | Live 2026 | 2026-09-30 | Odoo |
| S18 | https://retool.com/pricing | Official | Live 2026 | 2026-09-30 | Retool |
| S19 | https://www.appsmith.com/pricing | Official | Live 2026 | 2026-09-30 | Appsmith |
| S20 | https://budibase.com/pricing/ | Official | Live 2026 | 2026-09-30 | Budibase (OSS cell; search-backed) |
| S21 | https://www.microsoft.com/licensing/guidance/Power-Platform | Official licensing | 2026 guides | 2026-09-30 | Power Apps Premium ~$20/user/mo annual class |
| S22 | https://bizxos.com/ ; https://aeionos.com/ | Emerging vendor sites | Live | 2026-09-30 | Emerging taxonomy only |
| S23 | Secondary: Height shutdown articles | Secondary | 2025–2026 | 2026-09-30 | Height **DEPRECATED** |

**Fetch notes:** Jira marketing pricing page returned mostly CSS (**BLOCKED**/degraded). Zoho One pricing numerals partially occluded in fetch — corroborated via secondary 2026 pricing explainers (label **REPORTED** for exact $). Asana dollar stickers mixed official feature table + secondary price points.

---

## Implications for StreamlineOS Build (parity hypotheses marked UNKNOWN)

1. **Category storytelling risk:** Public site sells a **suite OS**; `/build` reveals nothing. Trust/activation for Build needs a public “what Build is” narrative or the module remains invisible vs Zoho Projects / ClickUp. **UNKNOWN:** Build definition.
2. **Direct competitive set is suite-first:** Zoho One and Odoo already win the “one bill, many apps including projects” evaluation StreamlineOS invites. Build activation likely rides suite attach — parity hypotheses vs Zoho Projects / Odoo Project are **UNKNOWN**.
3. **If H-PM:** Must clear a high bar vs ClickUp/Jira/Linear on boards, cycles, triage, releases — Linear sets UX expectation; Jira sets workflow depth; ClickUp sets “work OS” bundling. StreamlineOS homepage already claims kanban/cycles/time — map whether those live *in Build* or a separate Projects app (**UNKNOWN**).
4. **If H-Builder:** monday Vibe + Retool + Zoho Creator + Power Apps become the real battlefield; current public StreamlineOS “Build” name alone is not evidence of builder depth (**UNKNOWN**).
5. **Pricing wedge is real:** Org-priced Free→Enterprise vs per-seat ClickUp/Jira/monday/Asana/Notion is a differentiated trust story (Basecamp is the closest pricing-philosophy peer). Keep calculator honesty — homepage/pricing show some INR vs USD copy tension (**monitor**).
6. **Trust gap vs leaders:** StreamlineOS security page is unusually candid (SOC2 Type I in progress, ISO 2027 roadmap). For activation, that honesty helps — but buyers comparing Asana/Atlassian SOC2 Type II may still pause. Parity on audit/SSO is suite Enterprise **AVAILABLE**; Build-specific controls **UNKNOWN**.
7. **AI expectations:** Every PM/work OS now ships agents/credits. Suite AI (Gemini/OpenAI) is on paid StreamlineOS plans — whether Build surfaces AI for planning/scoring is **UNKNOWN**.
8. **Do-nothing is the silent #1:** Spreadsheets + WhatsApp/Slack remain default for Indian SMB delivery teams StreamlineOS targets — activation design > feature parity.

---

## Monitoring stubs

| Watch | URL / signal | Cadence | Why |
| --- | --- | --- | --- |
| StreamlineOS `/build` public un-wall or docs | https://www.streamlineos.in/build | Weekly | Category-defining |
| StreamlineOS pricing matrix / changelog | https://www.streamlineos.in/pricing | Biweekly | Seat/API/workflow gates |
| StreamlineOS security/compliance updates | https://www.streamlineos.in/legal/security | Monthly | Trust cycle |
| StreamlineOS LinkedIn / blog PM↔Build naming | LinkedIn `streamline-os` | Weekly | H-PM vs H-Builder |
| Zoho One / Projects / Creator releases | zoho.com/one ; zoho.com/creator | Monthly | Direct peer |
| Odoo major version + Studio/AI | odoo.com | Per release | Direct peer |
| ClickUp AI / Brain packaging | clickup.com/pricing | Monthly | Adjacent work OS |
| Linear agents / pricing | linear.app/changelog ; pricing | Monthly | UX innovator |
| monday Vibe app builder | monday.com/pricing ; blog | Monthly | Builder narrative bleed |
| Retool / Appsmith / Budibase | respective pricing + changelogs | Monthly | Conditional Direct |
| Power Apps Premium price changes | Microsoft licensing notes | Quarterly | Enterprise substitute |
| Emerging India Business OS (Aeion, BizXOS, Mingrow) | vendor sites | Quarterly | Local emerging |
| Height-class exits | news | Ad hoc | Market consolidation |

---

## What would change this cut

Evidence from a **signed-in Build map** (Designer/product ledger) that would flip conclusions:

1. **Build ≡ Projects/PM** → Promote ClickUp/Jira/Linear/monday/Asana to **Direct**; demote Retool/Appsmith to **Substitute**; rewrite JTBD around delivery.
2. **Build ≡ custom apps/pages/workflows/domains** → Promote Retool/Appsmith/Budibase/Power Apps/Zoho Creator/monday Vibe to **Direct**; treat PM tools as feeders/adjacent.
3. **Build ≡ thin wrapper / nav alias** with real work in another module → Shrink Build-specific CI; redirect cycle to suite attach + Projects module CI.
4. **Capabilities present:** domains, custom roles, page builder, API keys, workflow canvas, sprint entities, release objects, guest portals — each fills CI-### UNKNOWN cells and reshapes threat ranks.
5. **ICP in-product** (eng vs ops vs SMB owner) → Recalibrate Linear/Jira vs Zoho/Odoo threat.
6. **Pricing entitlements** for Build-only features (API/workflows gated) → Adjust packaging implications vs Free/Starter.
7. **Integration surface** (GitHub, Slack, WhatsApp, Razorpay, etc.) → Changes substitute set and do-nothing displacement story.

### Explicit UNKNOWN list (top)
1. What is Build, precisely, in the product information architecture?
2. Which public “Projects/kanban/cycles” claims live inside Build vs a separate Projects app?
3. Does Build include custom app/page/domain builder primitives?
4. Role/permission model depth inside Build (module roles vs org roles)?
5. API & workflow automation scope available to Build objects?
6. Guest/client portal or external collaborator model?
7. AI features scoped to Build?
8. Mobile parity for Build?
9. Import paths (Jira/ClickUp/CSV) for activation?
10. Whether Free plan includes Build at full or limited depth?

---

*End of First Cut — 2026-09-30. Not a final full CI report. All Build-specific parity = UNKNOWN pending signed-in ledger.*
