# StreamlineOS Build — CI Cut v2 (2026-09-30)

**Audience:** Principal Competitor Analyst  
**Product focus:** StreamlineOS Build module (`https://www.streamlineos.in/build`)  
**Scope Contract:** v1.0 (frozen)  
**Access date (all sources):** 2026-09-30  
**Research mode:** Public web only (WebSearch/WebFetch official pages) + **Owner/Council signed-in ledger** labeled **VERIFIED/REPORTED** (not this agent's browser)  
**Prior cut:** `/workspace/streamlineos-build-ci-first-cut.md` (v1 intact)  
**Cycle goal (ASSUMED):** trust + activation of Build  

**Status legend:** `AVAILABLE` | `BETA` | `ANNOUNCED` | `DEPRECATED` | `REPORTED` | `INFERRED` | `UNKNOWN` | `VERIFIED` (in-product Owner/Council)

**Gap labels (StreamlineOS Build vs each Direct):** `BEHIND` | `PARITY` | `AHEAD` | `UNIQUE` | `UNKNOWN`

---

## Executive delta from v1 (top 10)

1. **H-PM LOCKED; H-Builder CLOSED** — Build IA is delivery/PM (Projects, Issues, Cycles, Releases, Portfolios, Programs) plus PM-adjacent automation (Wiki/Whiteboard/Forms/Workflow/Automations/Webhooks). Not a Retool-style app builder.
2. **Dual Direct set** — Suite Direct (Zoho One/Odoo) *plus* PM Direct-for-job (Linear, Jira, ClickUp) for activation/parity. Retool/Appsmith demoted to **Adjacent / Low threat**.
3. **Threat reweight** — Linear / Jira / ClickUp **rise** for the delivery job; Zoho / Odoo remain High as suite peers; monday/Asana Med; builders Low.
4. **Create-project activation path VERIFIED** — Wizard: Basics → Blank → features → Simple workflow → Review & Create; project `PXC-Project-Alpha` at `/build/47`; issue `PXC-Issue-1` created.
5. **Kanban + issue surface VERIFIED** — `/build/47/issues` Todo→Done board; sidebar Issues / Backlog / Cycles / Releases / Updates / Files / Client portal.
6. **Item 3 (domains/roles/API) UNBLOCKED** — Org email-domain policy; `/settings/roles` (44 roles / 764 perms); API tokens + webhooks (empty shells); Build integrations + access; project Labels/Statuses/Custom Fields/Teams — all **Owner VERIFIED**.
7. **Client portal NAMED but unpublished** — No grants; guest flow still **Tester / UNTESTED** → gap vs Linear guests / JSM portal / ClickUp / monday / Zoho Clients remains **UNKNOWN** for Build guest UX.
8. **Auth risk flagged** — Email OTP (no password) **REPORTED**; session expiry / shared-browser collision **REPORTED** — behind PM Direct table stakes (password + Google/SSO + persistent sessions).
9. **Import path VERIFIED** — Issues → Import/Export CSV/JSON + dry-run (narrower than Linear Jira/GitHub assistants or ClickUp Jira importer, but foundation present).
10. **Trial economics VERIFIED** — 14-day trial banner + `/settings/billing`; empty portfolios; billing console 401/402 noise **REPORTED**; no paywall hit in Owner map.

---

## Category & JTBD (revised)

### What StreamlineOS claims publicly (unchanged VERIFIED) + Build identity (now locked)

| Claim | Label | Evidence |
| --- | --- | --- |
| Multi-app business OS incl. **Build** | **VERIFIED** | Homepage app strip ([streamlineos.in](https://www.streamlineos.in), 2026-09-30) |
| Suite replace-many-tools promise | **VERIFIED** | Homepage + pricing FAQ |
| Projects/delivery marketing (kanban, cycles, epics, time, releases) | **VERIFIED** (suite copy) | Homepage “Run cycles…” |
| Org-priced packaging | **VERIFIED** | [Pricing](https://www.streamlineos.in/pricing) |
| `/build` public marketing | **Auth-walled** | Sign-in shell only |
| **Build ≡ PM / delivery OS module** | **VERIFIED** (Owner/Council) | Nav + project sidebar + More tools (see ledger below) |
| **Build ≢ Retool-style page/app builder** | **VERIFIED** (Owner) | Wiki/Whiteboard/Forms/Workflow/Automations/Webhooks = PM+automation depth, not IDE builder |
| Target customer | **INFERRED** | India/APAC SMB–midmarket; suite attach |

### Category call (v2 — LOCKED)

**Primary framing:** Build is a **work / project management OS** *inside* a multi-app business suite.

| Hypothesis | v1 posture | v2 posture | Rationale |
| --- | --- | --- | --- |
| **H-PM** | Leaning / open | **LOCKED — preferred comparison frame** | Owner deep-map: Overview/command-center, Projects, Products/managed-products, Portfolios, Programs, Teams, More tools, Build settings; project Issues/Backlog/Cycles/Releases; Kanban Todo→Done; Epics route; More tools Roadmap/Goals/Approvals/Templates/Client access/Triage/QA/Incidents/Modules/Automations |
| **H-Builder** | Open until signed-in map | **CLOSED — demoted / watch-only** | No Retool-class app/page/domain builder primitives observed; automation surface is PM-depth (forms/workflows/webhooks), not internal-tools IDE. Reopen only if settings later expose true builder primitives |

**Direct sets (v2):**
1. **Suite Direct** — Zoho One (+ Zoho Projects), Odoo — same “OS including projects” buyer job.
2. **PM Direct-for-job** — **Linear, Jira (Cloud), ClickUp** — compete head-to-head for delivery activation, cycles/releases UX, guest/portal norms, auth table stakes.

**Adjacent:** monday.com, Asana (work OS), Notion, Basecamp; **Retool / Appsmith / Budibase / Power Apps** (low threat unless builder primitives reappear).

### JTBD boundaries (revised)

| Job | In-boundary | Out-of-boundary |
| --- | --- | --- |
| Plan & track delivery | Boards, backlog, cycles, releases, epics, issues | Pure code hosting |
| Cross-function work in one OS | Work linked to HR/CRM/Payroll | Point iPaaS as the product |
| Configure who sees what | Org roles (44/764 VERIFIED), project teams, email-domain policy | Full IdP products |
| Automate handoffs | Workflows, automations, webhooks, approvals | Enterprise RPA |
| Extend / customize | Labels, statuses, custom fields, templates, modules — **not** full app studio | Retool/Appsmith-class builders |
| External collaboration | Client portal (named); guest (UNTESTED) | Full customer-success suites |
| Do-nothing | Spreadsheets + chat + email | — |

### Owner/Council Build ledger (VERIFIED / REPORTED) — access 2026-09-30

| Area | Status | Detail |
| --- | --- | --- |
| Build OS nav | **VERIFIED** | Overview/command-center, Projects, Products/managed-products, Portfolios, Programs, Teams, More tools, Build settings |
| Create project | **VERIFIED** | `PXC-Project-Alpha` @ `/build/47`; wizard Basics → Blank → features → Simple workflow → Review & Create |
| Project sidebar | **VERIFIED** | Issues, Backlog, Cycles, Releases, Updates, Files, Client portal |
| Kanban / issues | **VERIFIED** | `/build/47/issues` Todo→Done; `PXC-Issue-1` created |
| Cycles / Epics | **VERIFIED** (routes exist; empty) | Inside project Issues context |
| Portfolios | **VERIFIED** | Empty state |
| More tools | **VERIFIED** | Roadmap, Goals, Approvals, Templates, Client access; Triage, QA, Incidents, Modules, Automations |
| Item 3 — domains / roles / API | **VERIFIED** | Org email-domain policy; `/settings/roles` **44 roles / 764 perms**; `/settings/api-tokens` + webhooks (empty); `/build/settings/integrations` + access; project Labels/Statuses/Custom Fields/Teams |
| Client portal | **VERIFIED** (shell) / guest **UNTESTED** | Unpublished; no grants; Guest still Tester |
| Import | **VERIFIED** | Issues → Import/Export CSV/JSON + dry-run |
| Trial / billing | **VERIFIED** / noise **REPORTED** | 14-day trial banner; `/settings/billing`; console 401/402 noise; no paywall hit |
| Auth | **REPORTED** | Email OTP (no password); session expiry / shared-browser collision |

---

## Discovery method & inclusion criteria

### Method (v2 additions)
1. Primary public: StreamlineOS home, `/build`, `/pricing`, legal (unchanged from v1).
2. **Owner/Council signed-in Build ledger** treated as VERIFIED/REPORTED teammate evidence (not this agent's browser).
3. Seed PM Direct-for-job deepened: Linear, Jira, ClickUp official docs on guests/portals, cycles, auth, import/API.
4. Suite Direct held: Zoho One/Projects, Odoo.
5. Builder set retained only as Adjacent/low after H-Builder CLOSED.

### Inclusion criteria — unchanged spirit; threat slots updated

### Excluded / demoted (v2)
| Player / class | v2 treatment | Why |
| --- | --- | --- |
| Retool, Appsmith, Budibase, Power Apps | **Adjacent / Low** (was conditional High) | H-Builder CLOSED |
| Height.app | **DEPRECATED** | Shutdown ~2025-09 |
| FlutterFlow | Excluded | Mobile studio |
| Emerging India OS (Aeion, BizXOS, Mingrow, MOM) | Watch only | Thin CI depth |

### Saturation
Comparison set remains ~10–11; PM Direct-for-job elevated inside the same set rather than expanding longlist.

---

## Market map / taxonomy (v2)

| Taxonomy | Players | Note |
| --- | --- | --- |
| **Direct (suite peers)** | Zoho One (+ Zoho Projects), Odoo | Unchanged High |
| **Direct (PM / job)** | **Linear, Jira Cloud, ClickUp** | **Promoted from Adjacent** — H-PM locked |
| **Adjacent (work OS)** | monday.com, Asana | Still relevant; guest/boards patterns |
| **Substitute** | Notion, Basecamp | Docs / org-price |
| **Adjacent builders (demoted)** | Retool, Appsmith, Budibase, Power Apps | Watch only |
| **Emerging** | Aeion, BizXOS, Mingrow, MOM | Quarterly |
| **Do-nothing** | Spreadsheets + chat + email | Activation enemy #1 |

```
                    SUITE DIRECT
         Zoho One ●──────────● Odoo
                    \        /
                     StreamlineOS Build (H-PM LOCKED)
                    /    |    \
         PM DIRECT /     |     \ ADJACENT work OS
   Linear·Jira·ClickUp   |      monday·Asana
                         ● Notion · Basecamp
                         ● Retool·Appsmith (demoted Low)
                         ● Spreadsheets (do-nothing)
```

---

## Comparison set — threat reweight (v2)

| # | Competitor | Slot | Threat to Build (v2) | Δ vs v1 |
| --- | --- | --- | --- | --- |
| 1 | **Zoho One / Zoho Projects** | Suite Direct | **High** | — |
| 2 | **Odoo** | Suite Direct | **High** | — |
| 3 | **ClickUp** | **PM Direct-for-job** | **High** | ↑ from Med–High |
| 4 | **Jira (Cloud)** | **PM Direct-for-job** | **High** (esp. eng/IT) | ↑ from Med |
| 5 | **Linear** | **PM Direct-for-job** / innovator | **High** (UX bar for cycles/activation) | ↑ from Med |
| 6 | monday.com | Adjacent work OS | **Med** | — / slight ↓ builder bleed |
| 7 | Asana | Adjacent | **Med–Low** | — |
| 8 | Notion | Substitute | **Med–Low** | — |
| 9 | Basecamp | Substitute org-price | **Low–Med** | — |
| 10 | Retool | Adjacent builder | **Low** | ↓ from High-if-H-Builder |
| 11 | Appsmith | Adjacent OSS builder | **Low** | ↓ from Med-if-H-Builder |

---

## Competitor one-pagers (delta notes; full profiles in v1)

> Full field tables remain valid from v1 for pricing/core promise. Below: **v2 deltas** tied to Now themes + Direct elevation.

### Zoho One / Zoho Projects — Suite Direct (threat High)
- **Client users / clients API AVAILABLE** — portal-oriented client companies + client users ([Zoho Projects Users/Clients API](https://www.zoho.com/projects/help/rest-api/users-api.html), access 2026-09-30).
- **Webhooks AVAILABLE** (Enterprise class) for projects/tasks ([Zoho Projects webhooks help](https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/automation/project-automation/articles/webhooks-for-projects)).
- Threat unchanged: same suite story + mature client-user model StreamlineOS Client portal must eventually clear.

### Odoo — Suite Direct (threat High)
- Project + Studio + External API on Custom — unchanged from v1.
- Studio remains ERP extension, not the comparison frame now that H-Builder is closed (Studio is suite extensibility peer, not Build identity).

### ClickUp — PM Direct-for-job (threat High ↑)
- **Guests AVAILABLE** — View-only (unlimited free on paid) + permission-controlled guests with View/Comment/Edit/Full; plan seat formulas ([Guest-type user roles](https://help.clickup.com/hc/en-us/articles/6310022323991-Guest-type-user-roles), [Pricing](https://clickup.com/pricing), 2026-09-30).
- **Templates / Quick Start AVAILABLE** — public template gallery + Space templates for blank→first list ([Quick Start Template](https://clickup.com/templates/quick-start-template-t-162341376)).
- **Import AVAILABLE** — Jira importer with custom-field mapping; CSV/path peers ([Import from Jira](https://help.clickup.com/hc/en-us/articles/6310954639255-Import-from-Jira)).
- Sprints/Kanban/Docs/Automations **AVAILABLE** (pricing matrix).

### Jira Cloud (+ JSM) — PM Direct-for-job (threat High ↑)
- **Guest-Collaborator AVAILABLE** (Standard+) — free up to 5 guests per paid user; one space per site; least-privilege ([Manage guest access](https://support.atlassian.com/jira-cloud-administration/docs/manage-guest-access-in-jira/), 2026-09-30).
- **Jira Service Management customer portal AVAILABLE** — open/restricted portals; portal-only customer accounts free; anonymous browse option with email-to-request ([Set up portal access](https://support.atlassian.com/jira-service-management-cloud/docs/set-up-and-manage-portal-access/), 2026-09-30).
- Boards/backlog/sprints **AVAILABLE**; CSV import **AVAILABLE** ([CSV import](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/)).
- Auth: Atlassian account password + Google/Apple + SAML/SSO on higher org plans — table stakes vs OTP-only.

### Linear — PM Direct-for-job / UX bar (threat High ↑)
- **Cycles AVAILABLE** — 1–8 week auto-scheduled cycles, cooldowns, rollover, capacity dial ([Use cycles](https://linear.app/docs/use-cycles), 2026-09-30).
- **Guests AVAILABLE** (Business+) — team-scoped; billed as members; no dedicated branded client portal ([Members and roles](https://linear.app/docs/members-roles)). Customer Requests / Asks on Business+ for intake (pricing matrix) — **not** a full client portal.
- **Auth AVAILABLE** — Google, **email magic-link/code (OTP-like)**, passkeys; SAML/SCIM Enterprise; login method restrictions Business+ ([Login methods](https://linear.app/docs/login-methods)). Note: Linear offers OTP-style email *plus* Google/passkeys/SSO — StreamlineOS OTP-only is narrower.
- **Import AVAILABLE** — dedicated assistants (Jira, GitHub, Asana, Shortcut, Linear) + CLI ([Import guidance](https://linear.app/docs/import-issues)); **Webhooks + API AVAILABLE** ([Webhooks](https://linear.app/developers/webhooks)).
- Activation pattern (secondary teardown, label **REPORTED**): anti-tour checklist → create/resolve first issue; functional empty states.

### monday.com — Adjacent (threat Med)
- **Guests AVAILABLE** (Standard+) — Shareable boards only; domain must differ from org; Pro/Enterprise unlimited guests ([Share with guests](https://support.monday.com/hc/en-us/articles/360000292500-How-to-share-projects-with-guests), [User types](https://support.monday.com/hc/en-us/articles/360002144900-User-types-explained), 2026-09-30).
- Google SSO Pro+; SAML Enterprise ([SAML SSO](https://support.monday.com/hc/en-us/articles/360000460605-SAML-Single-Sign-on)).
- Vibe app builder narrative demoted in relevance (H-Builder closed).

### Asana / Notion / Basecamp — unchanged threat bands (see v1)

### Retool / Appsmith — Adjacent Low ↓
- No longer Direct. Profiles retained in v1 for watch; reopen only if Build exposes IDE-style app builder.

---

## Now themes — public competitor patterns (deepened)

### A) Activation: blank org → first project / issue

| Pattern | Players | Status | Source (access 2026-09-30) |
| --- | --- | --- | --- |
| Template gallery / Quick Start list | ClickUp | AVAILABLE | https://clickup.com/templates/quick-start-template-t-162341376 |
| Dedicated importers (Jira/GitHub/…) as activation path | Linear | AVAILABLE | https://linear.app/docs/import-issues |
| CSV + field-mapping import wizard | Jira | AVAILABLE | https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/ |
| Opinionated create-project wizard (Blank → workflow → Review) | StreamlineOS Build | **VERIFIED** | Owner: Basics → Blank → features → Simple workflow → Review & Create |
| Empty portfolios / empty Cycles·Epics routes | StreamlineOS Build | **VERIFIED** | Owner empty states present; content quality vs Linear empty-state craft **UNKNOWN** depth |
| First issue created in-session | StreamlineOS Build | **VERIFIED** | `PXC-Issue-1` |
| Time-to-value measurement (public) | All | UNKNOWN | No public TTV benchmarks used |

**Design implication:** Build has a real wizard + kanban path (good). Template depth, sample data, and empty-state craft vs Linear/ClickUp still need Designer teardown scores.

### B) Client portal / guest / customer asks

| Capability | Player | Status | Source (access 2026-09-30) |
| --- | --- | --- | --- |
| Team-scoped Guests (write, billed as members) | Linear | AVAILABLE (Business+) | https://linear.app/docs/members-roles ; https://linear.app/pricing |
| Branded read-only client portal (native) | Linear | **Not native** — third-party pattern | Secondary; Linear = guests + Asks/Customer requests, not portal product |
| Guest-Collaborator (free quota, 1 space) | Jira Software | AVAILABLE (Standard+) | https://support.atlassian.com/jira-cloud-administration/docs/manage-guest-access-in-jira/ |
| Customer / help-center portal (portal-only accounts) | Jira Service Management | AVAILABLE | https://support.atlassian.com/jira-service-management-cloud/docs/set-up-and-manage-portal-access/ |
| View-only + permission-controlled guests | ClickUp | AVAILABLE | https://help.clickup.com/hc/en-us/articles/6310022323991-Guest-type-user-roles ; https://clickup.com/pricing |
| Guests on Shareable boards | monday.com | AVAILABLE (Standard+) | https://support.monday.com/hc/en-us/articles/360000292500-How-to-share-projects-with-guests |
| Client users / client companies | Zoho Projects | AVAILABLE | https://www.zoho.com/projects/help/rest-api/users-api.html |
| Client portal nav item + unpublished shell | StreamlineOS Build | **VERIFIED** (named) | Owner: unpublished, no grants |
| Guest invite / external collaborator flow | StreamlineOS Build | **UNTESTED** | Guest still Tester |

### C) Auth / session norms (table stakes)

| Norm | Linear | Jira / Atlassian | ClickUp | monday | StreamlineOS Build |
| --- | --- | --- | --- | --- | --- |
| Password login | No (passwordless) | Yes (Atlassian acct) | Yes | Yes | **No — OTP-only REPORTED** |
| Email OTP / magic link | Yes (code/link) | Recovery flows | Common | Common | **Yes — primary REPORTED** |
| Google / social SSO | Yes | Yes | Yes (plan-gated depth) | Google SSO Pro+ | **UNKNOWN** / not observed |
| SAML / enterprise SSO | Enterprise | Org/Enterprise | Enterprise | Enterprise | **UNKNOWN** (suite Enterprise claims exist; Build-specific untested) |
| Passkeys | Yes | Ecosystem | Varies | Varies | **UNKNOWN** |
| Session persistence / multi-account | Switch accounts docs; logout all sessions | Standard persistent | Standard | Standard | **Session expiry + shared-browser collision REPORTED** |

**Call:** OTP-as-*only* method without Google/password fallback/SSO is **behind** PM Direct table stakes for midmarket trust, even though Linear also uses email codes (Linear pairs them with Google + passkeys + SAML).

---

## Gap labels — StreamlineOS Build vs Direct (v2)

Scoring uses Owner VERIFIED Build facts vs public Direct capabilities. `UNKNOWN` where unsigned-in / untested depth remains.

### vs Linear (PM Direct)

| Capability | Build | Linear | Gap |
| --- | --- | --- | --- |
| Cycles | Routes exist (empty) **VERIFIED** | Full auto cycles 1–8w, rollover, capacity **AVAILABLE** | **BEHIND** (entity present; UX depth unproven) |
| Releases | Sidebar item **VERIFIED** | Releases/shipping practices in product model | **UNKNOWN**→ lean **BEHIND** until release objects exercised |
| Backlog | Sidebar **VERIFIED** | First-class backlog/triage | **PARITY** (surface) / depth **UNKNOWN** |
| Client portal | Named, unpublished **VERIFIED**; guest UNTESTED | Guests + Asks; no native branded portal | Build shell could be **AHEAD** *if* guest ships as true portal; today **UNKNOWN** (guest) / shell **PARITY-potential** |
| Activation empty states | Wizard + empty portfolios/cycles **VERIFIED** | Best-in-class empty/checklist craft (**REPORTED** secondary) | **BEHIND** on craft; **PARITY** on “has a path” |
| Auth / session | OTP-only; expiry/collision **REPORTED** | Google + email code + passkeys + SAML | **BEHIND** |
| Roles / RBAC | 44 roles / 764 perms **VERIFIED** | Owner/Admin/Member/Guest (+ team owners) | **AHEAD** on raw role/perm count surface (quality UNKNOWN) |
| API tokens | Settings present (empty) **VERIFIED** | API + webhooks **AVAILABLE** | **PARITY** (surface) / maturity **UNKNOWN** |
| Webhooks | Empty shell **VERIFIED** | Webhooks **AVAILABLE** | **BEHIND** until configured events proven |
| Integrations | Build settings integrations + access **VERIFIED** | Rich native set | **BEHIND** (catalog depth UNKNOWN/likely thinner) |
| Import | CSV/JSON + dry-run **VERIFIED** | Multi-source assistants + CLI | **BEHIND** (format OK; assistant depth) |

### vs Jira Cloud (+ JSM portal where relevant)

| Capability | Build | Jira / JSM | Gap |
| --- | --- | --- | --- |
| Cycles / sprints | Routes empty **VERIFIED** | Sprints mature **AVAILABLE** | **BEHIND** |
| Releases | Named **VERIFIED** | Versions/releases mature | **BEHIND** / **UNKNOWN** depth |
| Backlog | Present **VERIFIED** | Scrum/Kanban backlog | **PARITY** surface |
| Client portal / guest | Unpublished; guest UNTESTED | Jira Guests + **JSM portal AVAILABLE** | **BEHIND** (guest untested; JSM portal is category leader for customer asks) |
| Activation | Wizard + CSV/JSON import **VERIFIED** | Templates + CSV + marketplace | **BEHIND**–**PARITY** |
| Auth / session | OTP-only **REPORTED** | Password + SSO ecosystem | **BEHIND** |
| Roles | 44/764 **VERIFIED** | Scheme-heavy permission model | **PARITY**–**AHEAD** on configurability surface |
| API / webhooks | Shells **VERIFIED** | Mature REST + webhooks | **BEHIND** maturity |
| Import | CSV/JSON dry-run **VERIFIED** | CSV + rich migrations | **BEHIND** |

### vs ClickUp

| Capability | Build | ClickUp | Gap |
| --- | --- | --- | --- |
| Cycles / sprints | Empty routes **VERIFIED** | Sprints **AVAILABLE** | **BEHIND** |
| Releases | Named **VERIFIED** | Releases/modules vary | **UNKNOWN** |
| Backlog | Present **VERIFIED** | Lists/Backlog views | **PARITY** surface |
| Client portal / guest | Unpublished; guest UNTESTED | Guests (view-only + permission-controlled) **AVAILABLE** | **BEHIND** until guest VERIFIED |
| Activation empty states | Wizard **VERIFIED** | Huge template gallery **AVAILABLE** | **BEHIND** on templates |
| Auth / session | OTP-only **REPORTED** | Password + SSO (Enterprise) | **BEHIND** |
| Roles | 44/764 **VERIFIED** | Custom roles Business+/Enterprise | **PARITY**–**AHEAD** count |
| API / webhooks | Shells **VERIFIED** | API + automations **AVAILABLE** | **BEHIND** maturity |
| Import | CSV/JSON **VERIFIED** | Jira importer + mappings | **BEHIND** |

### vs Zoho Projects (Suite Direct)

| Capability | Build | Zoho Projects | Gap |
| --- | --- | --- | --- |
| Cycles / sprints | Empty routes | Zoho Sprints / sprinting **AVAILABLE** | **BEHIND** |
| Releases / milestones | Named | Milestones/releases **AVAILABLE** | **UNKNOWN**–**BEHIND** |
| Backlog | Present | Task views | **PARITY** surface |
| Client portal | Unpublished shell | **Client users** mature **AVAILABLE** | **BEHIND** until guest/portal live |
| Activation | Wizard + import | Templates + suite onboarding | **PARITY**–**BEHIND** |
| Auth / session | OTP-only | Zoho accounts + SSO options | **BEHIND** |
| Roles | 44/764 | Portal profiles / client roles | **PARITY**–**AHEAD** density |
| API / webhooks | Shells | REST + Enterprise webhooks | **BEHIND** maturity |
| Import | CSV/JSON | Suite import paths | **PARITY**–**BEHIND** |

### Cross-Direct summary (Designer glance)

| Theme | Overall vs Direct | Notes |
| --- | --- | --- |
| Cycles | **BEHIND** | Routes exist; Linear/Jira/ClickUp have battle-tested cycle/sprint UX |
| Releases | **UNKNOWN** / lean **BEHIND** | Nav verified; objects not exercised |
| Backlog | **PARITY** (surface) | Depth/triage vs Linear triage **UNKNOWN** |
| Client portal | **UNKNOWN** (guest) / shell present | Could become **UNIQUE/AHEAD** vs Linear (no native portal) if grants + UX land |
| Activation empty states | **BEHIND** craft / **PARITY** path | Wizard good; templates/sample data thin vs ClickUp |
| Auth / session | **BEHIND** | OTP-only + session fragility |
| Roles / perms | **AHEAD**–**PARITY** | 44/764 is a trust story if usable |
| API / webhooks / integrations | **PARITY** surface / **BEHIND** depth | Empty shells ≠ competitor catalogs |
| Import | **BEHIND** assistants / **PARITY** formats | CSV/JSON + dry-run is credible v1 |

---

## CI matrix draft (v2 — moved rows)

> Only rows that can move from v1 UNKNOWN are updated. Domains-as-builder-pages concept N/A (H-Builder closed). Guest portal interaction remains UNKNOWN.

| ID | Job / capability | Competitor | Status | Source URL | Conf. | StreamlineOS Build |
| --- | --- | --- | --- | --- | --- | --- |
| CI-001 | Kanban / board delivery | ClickUp | AVAILABLE | https://clickup.com/pricing | H | **VERIFIED** (`/build/47/issues` Todo→Done) |
| CI-002 | Kanban / board delivery | Jira | AVAILABLE | https://www.atlassian.com/software/jira/pricing | H | **VERIFIED** |
| CI-003 | Kanban / board delivery | Linear | AVAILABLE | https://linear.app/pricing | H | **VERIFIED** |
| CI-007 | Sprints / cycles | ClickUp | AVAILABLE | https://clickup.com/pricing | H | **VERIFIED** route (empty) — gap **BEHIND** |
| CI-008 | Sprints / cycles | Linear | AVAILABLE | https://linear.app/docs/use-cycles | H | **VERIFIED** route (empty) — gap **BEHIND** |
| CI-009 | Sprints / cycles | Jira | AVAILABLE | support.atlassian.com Jira Software docs | M | **VERIFIED** route (empty) — gap **BEHIND** |
| CI-010 | Cycles (suite claim) | StreamlineOS marketing | AVAILABLE | https://www.streamlineos.in | H | **Maps into Build** (H-PM locked) |
| CI-011 | Epics / initiatives | Linear | AVAILABLE | https://linear.app/pricing | H | **VERIFIED** Epics route (empty) |
| CI-016 | Approvals / triage | Linear triage | AVAILABLE | https://linear.app/pricing | H | **VERIFIED** More tools: Approvals, Triage |
| CI-018 | Workflow automation | ClickUp | AVAILABLE | https://clickup.com/pricing | H | **VERIFIED** Automations / Workflow in More tools (PM-depth) |
| CI-020 | Workflow automation | StreamlineOS suite | AVAILABLE | https://www.streamlineos.in/pricing | H | **VERIFIED** in Build More tools |
| CI-021 | Custom roles / RBAC | Retool Business+ | AVAILABLE | https://retool.com/pricing | H | **VERIFIED** 44 roles / 764 perms — builders no longer primary peer |
| CI-023 | Custom roles / RBAC | StreamlineOS | AVAILABLE | pricing + Owner `/settings/roles` | H | **VERIFIED** org roles |
| CI-024 | Public / external API | StreamlineOS | AVAILABLE (suite) | pricing + Owner `/settings/api-tokens` | H | **VERIFIED** token settings (empty) |
| CI-025 | Public / external API | Odoo Custom | AVAILABLE | https://www.odoo.com/pricing | H | Build tokens **PARITY** surface |
| CI-027–CI-033 | Custom app / page builder | Retool / Appsmith / Vibe / Creator / Power Apps / Workers | AVAILABLE/BETA | respective | H | **N/A — H-Builder CLOSED** (not Build identity) |
| CI-050 | Bug↔release linking | Linear / Jira | AVAILABLE | docs/pricing | M | Releases nav **VERIFIED**; linking **UNKNOWN** |
| CI-051 *(new)* | Guest / external collaborator | Linear Guests | AVAILABLE Business+ | https://linear.app/docs/members-roles | H | **UNKNOWN** (UNTESTED) |
| CI-052 *(new)* | Guest / external collaborator | Jira Guest-Collaborator | AVAILABLE Standard+ | https://support.atlassian.com/jira-cloud-administration/docs/manage-guest-access-in-jira/ | H | **UNKNOWN** |
| CI-053 *(new)* | Customer / client portal | JSM portal | AVAILABLE | https://support.atlassian.com/jira-service-management-cloud/docs/set-up-and-manage-portal-access/ | H | Shell **VERIFIED** unpublished; guest **UNKNOWN** |
| CI-054 *(new)* | Guest sharing | ClickUp guests | AVAILABLE | https://help.clickup.com/hc/en-us/articles/6310022323991-Guest-type-user-roles | H | **UNKNOWN** |
| CI-055 *(new)* | Guest shareable boards | monday guests | AVAILABLE Standard+ | https://support.monday.com/hc/en-us/articles/360000292500-How-to-share-projects-with-guests | H | **UNKNOWN** |
| CI-056 *(new)* | Client users | Zoho Projects | AVAILABLE | https://www.zoho.com/projects/help/rest-api/users-api.html | H | Portal shell only |
| CI-057 *(new)* | Issue import CSV/JSON | Linear / Jira / ClickUp | AVAILABLE | linear import; Jira CSV; ClickUp Jira import | H | **VERIFIED** CSV/JSON + dry-run — gap **BEHIND** assistants |
| CI-058 *(new)* | Webhooks | Linear / Zoho Projects Ent. | AVAILABLE | https://linear.app/developers/webhooks ; Zoho webhooks help | H | **VERIFIED** empty settings — gap **BEHIND** |
| CI-059 *(new)* | Email-domain join policy | Linear domain claiming Ent.; monday restrict join | AVAILABLE | respective security docs | M | **VERIFIED** org email-domain policy |
| CI-060 *(new)* | Auth password + SSO options | Linear / Atlassian / ClickUp / monday | AVAILABLE | login/SSO docs | H | OTP-only **REPORTED** — gap **BEHIND** |
| CI-061 *(new)* | Project custom fields / labels / statuses | ClickUp / Jira / Linear | AVAILABLE | product docs | H | **VERIFIED** project settings |
| CI-062 *(new)* | Trial / billing gate | Competitors freemium | AVAILABLE | pricing pages | H | 14-day trial **VERIFIED**; no paywall hit |

*(Unlisted CI-004–006, 012–015, 017, 019, 022, 026, 034–049 retain v1 competitor status; Build column now generally “see H-PM ledger” rather than blanket UNKNOWN.)*

---

## ADOPT / ADAPT / AVOID — Designer stubs

| Pattern | Stance | Rationale |
| --- | --- | --- |
| **First-project activation** | **ADAPT** Linear checklist + ClickUp Quick Start | Build wizard (Blank → Simple workflow → Review) is a solid spine (**VERIFIED**). Adapt: seed sample issue/cycle, richer empty-state CTAs, optional template pack — avoid ClickUp’s overwhelming gallery dump on day 0. |
| **Cycles UX** | **ADOPT** Linear cycle semantics | Auto schedule, cooldown, rollover, capacity dial ([use-cycles](https://linear.app/docs/use-cycles)) set the bar. Build has routes but empty — adopt Linear’s “routine over date-math” model; avoid Jira’s admin-heavy sprint ceremony for SMB suite buyers. |
| **Client portal** | **ADAPT** JSM portal + Zoho client users; **AVOID** Linear-guest-as-portal | Linear guests = write access to teams, not a client portal. JSM portal-only accounts + Zoho client users match the “Client portal” nav intent. Adapt: unpublished→publish + grants with read-scoped client view; avoid exposing full member backlog. Guest still UNTESTED — validate before locking UX. |
| **Auth / session** | **ADOPT** multi-method login (Linear-like) | Keep email OTP, **add** Google (and later SAML) + durable sessions. Avoid OTP-only + fragile shared-browser sessions (**REPORTED** collisions) — trust blocker for midmarket and for CI demos. |

---

## Implications for StreamlineOS Build (v2)

1. **Category story clarified:** Build is the suite’s PM/delivery module — public `/build` still auth-walled, but internal IA matches homepage Projects claims. Marketing should say so.
2. **Compete on two boards:** win suite bake-offs vs Zoho/Odoo *and* win delivery feel vs Linear/Jira/ClickUp for the teams who live in Issues daily.
3. **Activation is the cycle bottleneck:** wizard + kanban work; empty Cycles/Epics/Portfolios and thin templates risk bounce to ClickUp/Linear.
4. **Client portal is a potential wedge vs Linear** (Linear lacks native portal) **but a deficit vs JSM/Zoho/ClickUp guests until guest VERIFIED.**
5. **Auth/session is a trust defect** relative to every Direct — fix before feature parity theater.
6. **Roles/API surface is a trust asset** (44/764, tokens, webhooks shells) if made usable and documented; empty webhooks ≠ Linear/Zoho maturity.
7. **Builders are a distraction** — stop comparing Retool feature lists; invest PM depth + portal + auth.
8. **Do-nothing still #1 silent competitor** for India SMB — CSV import + OTP friction both matter.

---

## Monitoring list (refreshed)

| Watch | URL / signal | Cadence | Why (v2) |
| --- | --- | --- | --- |
| Build public un-wall / docs | https://www.streamlineos.in/build | Weekly | Still invisible publicly |
| Owner guest + Client portal publish | Internal ledger | Per test cycle | Unlocks portal gap labels |
| Cycles/Releases object depth | Internal + changelog | Weekly until filled | BEHIND vs Linear/Jira |
| Auth methods (Google/SAML/password) | Build login + suite security | Weekly | BEHIND table stakes |
| Session persistence fixes | Internal QA | Weekly | Collision REPORTED |
| StreamlineOS pricing / trial | https://www.streamlineos.in/pricing | Biweekly | Trial VERIFIED; paywall behavior |
| Security/compliance | https://www.streamlineos.in/legal/security | Monthly | Trust |
| Linear cycles / guests / Asks / changelog | https://linear.app/changelog ; docs | Biweekly | UX bar Direct |
| Jira Guests + JSM portal changes | Atlassian support/launch notes | Biweekly | Portal/guest bar |
| ClickUp guest packaging + templates | https://clickup.com/pricing ; help | Monthly | Activation + guests |
| Zoho Projects client users / webhooks | zoho.com/projects help | Monthly | Suite Direct portal peer |
| Odoo Project + version | odoo.com | Per release | Suite Direct |
| monday guests / SSO | support.monday.com | Monthly | Adjacent guest pattern |
| Retool/Appsmith (watch only) | pricing/changelogs | Quarterly | Confirm H-Builder stays closed |
| Emerging India Business OS | vendor sites | Quarterly | Local emerging |

---

## What would change this cut

### When **guest + Client portal VERIFIED** lands
1. Fill CI-051–056 Build column; replace portal **UNKNOWN** with BEHIND/PARITY/AHEAD/UNIQUE vs Linear (likely **AHEAD** if true portal), JSM (likely **BEHIND**–**PARITY**), ClickUp/monday guests, Zoho clients.
2. Confirm or kill “portal as wedge vs Linear” hypothesis.
3. Update ADOPT/ADAPT client-portal stub from provisional to prescriptive.
4. Reassess import+guest combined activation (invite client on first project).

### When **Item 3 depth** is fully exercised (beyond empty shells) — *partially landed*
Already moved: roles, email-domain, API token settings, webhooks settings, integrations, custom fields. **Still changes if:**
1. Webhooks deliver real event catalog → move CI-058 from BEHIND-surface to scored maturity.
2. API docs public + working tokens → trust narrative vs Zoho/Linear APIs.
3. Integration catalog populated (GitHub/Slack/etc.) → substitute/do-nothing displacement story.
4. Any true page/app builder appearing in settings → **reopen H-Builder** (currently CLOSED).

### Other flip conditions
- Cycles/Releases populated with Linear-class automations → upgrade cycle gap from BEHIND.
- Google/SAML/password auth ships → auth gap closes toward PARITY.
- Public Build marketing page → category storytelling risk drops.

### Explicit UNKNOWN list (v2 top)
1. Guest invite UX and permission matrix (Tester only).
2. Client portal publish/grants and client-visible surfaces.
3. Cycles/Releases/Epics *behavior* (not just routes).
4. Webhook event types and API completeness.
5. Integration catalog contents.
6. Auth alternatives (Google/SAML/password) and session TTL policy.
7. Template library depth vs ClickUp.
8. Mobile parity for Build.
9. AI features scoped to Build.
10. Whether Free plan includes full Build depth post-trial.

---

## Source register (v2 additions; v1 S01–S23 still apply)

| ID | URL | Type | Access date | Used for |
| --- | --- | --- | --- | --- |
| S24 | Owner/Council Build deep-map ledger | Internal VERIFIED/REPORTED | 2026-09-30 | H-PM lock; H-Builder close; items 2–5; nav/sidebar/auth/trial |
| S25 | https://linear.app/docs/use-cycles | Official | 2026-09-30 | Cycles pattern |
| S26 | https://linear.app/docs/login-methods | Official | 2026-09-30 | Auth norms |
| S27 | https://linear.app/docs/members-roles | Official | 2026-09-30 | Guests |
| S28 | https://linear.app/docs/import-issues | Official | 2026-09-30 | Import/activation |
| S29 | https://linear.app/developers/webhooks | Official | 2026-09-30 | Webhooks |
| S30 | https://linear.app/pricing | Official | 2026-09-30 | Guests/Asks plan gates |
| S31 | https://support.atlassian.com/jira-cloud-administration/docs/manage-guest-access-in-jira/ | Official | 2026-09-30 | Jira Guests |
| S32 | https://support.atlassian.com/jira-service-management-cloud/docs/set-up-and-manage-portal-access/ | Official | 2026-09-30 | JSM portal |
| S33 | https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/ | Official | 2026-09-30 | Jira CSV import |
| S34 | https://help.clickup.com/hc/en-us/articles/6310022323991-Guest-type-user-roles | Official | 2026-09-30 | ClickUp guests (fetch CDN-challenged; corroborated via pricing) |
| S35 | https://clickup.com/pricing | Official | 2026-09-30 | Guest packaging |
| S36 | https://clickup.com/templates/quick-start-template-t-162341376 | Official | 2026-09-30 | Activation templates |
| S37 | https://help.clickup.com/hc/en-us/articles/6310954639255-Import-from-Jira | Official | 2026-09-30 | ClickUp import |
| S38 | https://support.monday.com/hc/en-us/articles/360000292500-How-to-share-projects-with-guests | Official | 2026-09-30 | monday guests (CDN-challenged; corroborated via user-types search) |
| S39 | https://support.monday.com/hc/en-us/articles/360002144900-User-types-explained | Official | 2026-09-30 | monday guest limits |
| S40 | https://support.monday.com/hc/en-us/articles/360000460605-SAML-Single-Sign-on | Official | 2026-09-30 | monday SSO |
| S41 | https://www.zoho.com/projects/help/rest-api/users-api.html | Official | 2026-09-30 | Zoho client users |
| S42 | https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/automation/project-automation/articles/webhooks-for-projects | Official | 2026-09-30 | Zoho webhooks |

**Fetch notes:** ClickUp Help and monday Support intermittently returned Cloudflare interstitial via WebFetch; claims triangulated with official pricing pages + search snippets from same URLs (confidence M where noted).

---

*End of CI Cut v2 — 2026-09-30. v1 preserved at `/workspace/streamlineos-build-ci-first-cut.md`. H-PM LOCKED; H-Builder CLOSED; guest/portal interaction still UNKNOWN pending Tester verification.*

## Freeze v1 CI delta (2026-09-30 council)

- **Now freeze approved:** PM-011 → PM-002 → PM-001.
- **Gap label updates from council VERIFIED evidence:**
  - Cold invite accept blank: `BUG-001` → **auth/invite BEHIND** (table stakes).
  - Org Member without `build:view`: `BUG-002` → **invite→product BEHIND** until Build is ON at invite.
  - Client Access Owner CTA exists; Invite false-success toast `BUG-005` ×2; Grant projects loader `BUG-006` → **CTA paint PARITY-seeking**; **grant→guest-entry activation BEHIND**; guest **UNKNOWN**.
  - `BUG-004` Member no CTA = **permission-gated, not absent**.
  - Kanban columns **PARITY** (view); create-issue for view-only Member may be expected.
  - **H-Builder CLOSED; Not Now.**
- **Competitive DoDs locked into PRDs** (already in freeze).
- **Still UNKNOWN until post-fix:** cold invite happy path, guest magic-link NF, Account B isolation.
- **Monitoring:** watch Directs invite/portal changelogs monthly.
