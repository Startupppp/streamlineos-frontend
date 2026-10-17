# CI Gap Register — Completeness Wave (live)
**Updated:** 2026-09-30 · Access/research date for competitor claims: 2026-09-30
**Method:** Score Build surfaces as `D-`/`T-` ledger IDs land. Labels: BEHIND | PARITY | AHEAD | UNIQUE | UNKNOWN. Competitor status: AVAILABLE | BETA | ANNOUNCED | …
**Directs for job:** Linear · Jira · ClickUp · (suite) Zoho Projects/One · Odoo

## Seed scores (pre-census, from Freeze evidence)

| Area | Build status | Gap vs Directs | Evidence | Ledger IDs |
| --- | --- | --- | --- | --- |
| Cold invite accept | Broken blank / false paths | **BEHIND** | BUG-001 | pending D/T |
| Invite → Build module access | Manual Roles step | **BEHIND** | BUG-002 | pending |
| Project membership gate | Explicit add | **PARITY** (Linear-style) | BUG-003 intentional | pending |
| Client Access CTA (Owner) | Exists | **PARITY-seeking** | Designer Owner | pending |
| Client grant → guest entry | False-success toast; no link | **BEHIND** | BUG-005/006 | pending |
| Member Client Access empty | No request CTA | **BEHIND** | BUG-004 | pending |
| Kanban columns | Todo→Done | **PARITY** (view) | R1 | pending |
| Issue create (view-only Member) | Missing | UNKNOWN if preset-only | R1 | pending |
| Cycles / Epics / Releases | Routes exist; empty | **BEHIND** craft | Owner | pending |
| Roles (44/764) | Surface rich | **AHEAD–PARITY** surface; UX risk overload | Owner | pending |
| API tokens / webhooks | Shells | Surface PARITY / maturity BEHIND | Owner | pending |
| Auth OTP-only | Fragile sessions | **BEHIND** | Session protocol | pending |
| More tools depth | Inventoried | **UNKNOWN** depth | — | awaiting census |
| Products / Portfolios / Programs | Empty shells | **UNKNOWN** | — | awaiting census |
| Filters / cards / views | Partial | **UNKNOWN** | — | awaiting census |
| Org Admin / Module Admin / Client-guest / Account B | Untested | **UNKNOWN** | — | awaiting roles |
| H-Builder | Closed for Now | N/A Not Now | Owner | — |

## Live append log
_(CI appends one row per new ledger batch from Designer/Tester)_

| When | Ledger batch | CI action |
| --- | --- | --- |
| 2026-09-30 | Wave open | Seed table above; standing by for `D-`/`T-` dumps |

## Done for CI lane
Gap register covers every ledger ID in final Surface Ledger with a competitive label or explicit UNKNOWN + what Direct evidence would resolve it.


## Owner batch D-100…D-251 (2026-09-30) — scored

Source: `../../streamlineos-ux/SURFACE_LEDGER_COMPLETENESS_OWNER.md` · Role: Owner · Empty-state heavy (new org).
Directs: Linear · Jira Cloud · ClickUp · Zoho Projects (suite) · monday.com. Labels from public competitor posture (CI cut v2) + Owner VERIFIED surfaces.

### Build chrome / org IA

| Ledger | Surface | Gap | Rationale vs Directs |
| --- | --- | --- | --- |
| D-100 | Command center | **PARITY-seeking** | Dashboard widgets exist (projects/issues/approvals/releases) ≈ ClickUp/monday home; denser than Linear. Depth of widget truth UNKNOWN (1 project). |
| D-101 | Projects list + filters Status/Lead/Health + Grid/List | **PARITY** | Filter grammar matches ClickUp/Jira project lists; Health is monday-like. |
| D-102…105 | Products / Portfolios / Programs / Teams | **AHEAD vs Linear** · **PARITY-seeking vs Jira/ClickUp hierarchy** | Surfaces exist (empty). Linear weak here; Jira Advanced Roadmaps / ClickUp hierarchy are AVAILABLE — Build has shells only → craft **BEHIND** until populated workflows VERIFIED. |
| D-106…107 | Inbox / Drafts | **PARITY-seeking** | Linear Inbox AVAILABLE; Build empty shell VERIFIED. |
| D-108…109 | My Work / All-work | **PARITY** | Standard work OS pattern (Asana/ClickUp My Work; Jira filters). |
| D-110 | Integrations + Agent access | **PARITY surface / maturity UNKNOWN** | Connections empty; Agent access is differentiating claim → UNIQUE-potential if real, else marketing. |

### Org More tools

| Ledger | Surface | Gap | Rationale |
| --- | --- | --- | --- |
| D-120 | Roadmap | **PARITY-seeking** | ClickUp/Jira/Productboard-class; empty → craft BEHIND. |
| D-121 | Goals | **PARITY-seeking** | ClickUp Goals / Jira Align-ish; empty. |
| D-122 | Approvals | Create path **PARITY-seeking** · filled cycle **UNKNOWN** | Project+org Approvals VERIFIED; Request form inspected (cancelled). Still BEHIND JSM depth. |
| D-123 | Templates | Create+apply **PARITY** vs Linear basic · gallery **BEHIND ClickUp** | Apply VERIFIED → `PXC-From-Template-1` + seeded task; multi-task packs / public gallery still BEHIND. |
| D-124 | Client access | **BEHIND** | CTA paint OK; grant→guest broken (BUG-005/006). Zoho/JSM/monday guests AVAILABLE. |
| D-125 | Members / Roles / Access | **AHEAD–PARITY surface** | 44 roles / 764 perms (earlier) — richness AHEAD Linear; UX overload risk vs Linear simplicity (Design AVOID perm dump). |

### Project `/build/47` core delivery

| Ledger | Surface | Gap | Rationale |
| --- | --- | --- | --- |
| D-200 | Project home | **PARITY** | Status/health/activity cards ≈ peers. |
| D-201…203 | Issues Board / List / Table | **PARITY** | Multi-view is ClickUp/Jira table-stakes; Linear Board+List (no full Table) — Build matches broader work OS. |
| D-204 | Calendar → suite `/calendar` | **UNIQUE seam / IA risk** | Leave-Build redirect — not how Linear/Jira embed; suite coupling. Score: integration UNIQUE potential, in-module calendar **BEHIND** pure PM tools. |
| D-205…206 | Timeline / Workload | Workload **PARITY-seeking** filled | Workload metrics/filters VERIFIED (`WORKLOAD-WORKFLOW-WEBHOOKS.md`); Timeline craft still prior. |
| D-207 | Backlog | **PARITY surface** | Jira backlog AVAILABLE deep; Build settled empty. |
| D-208 | Cycles | **BEHIND** | Linear Cycles are category-defining AVAILABLE; Build route empty. |
| D-209 | Releases | **BEHIND / PARITY-seeking** | Jira Releases AVAILABLE; Build empty widgets. |
| D-210…211 | Updates / Files | **PARITY-seeking** | Status updates ≈ Basecamp/monday; files table-stakes. |
| D-212 | Client portal | **BEHIND** (guest UNKNOWN) | Chrome VERIFIED unpublished + visibility/preview; grant→guest still broken. Potential **AHEAD vs Linear** only if grant path ships. |

### Project settings D-220…225

| Area | Gap | Note |
| --- | --- | --- |
| Labels / Statuses / Custom fields / Teams | **PARITY** | Standard Jira/ClickUp project config. |
| Danger delete | UNTESTED (not clicked) | — |

### Project More tools D-230…251 (sprawl)

| Cluster | IDs | Gap | Note |
| --- | --- | --- | --- |
| Delivery extras | Epics D-231, Milestones D-232, Triage D-230 | Milestones create **PARITY-seeking** · issue-link **BEHIND**; Triage/Epics as prior | Milestone create VERIFIED; no issue-link control. |
| Collab | Meetings D-234, Chat D-240, Wiki D-241, Whiteboard D-242 | **PARITY ClickUp** · **sprawl vs Linear** | Many empty shells → feature-count trap (Design UX-010 / Not Now sprawl). |
| Quality/ITSM-ish | QA D-236, Incidents D-237, Change requests D-238, Intake D-239 | Empty craft **PARITY-seeking** · eng **Not Now** | `OPS-PACK.md` wizards cancelled; don’t chase until client wedge. |
| Insights | Reports D-243, Budget D-244, Risks D-245, Decisions D-246 | Reports: Overview **PARITY-seeking** · Agile **BEHIND** builder (UX-030) | Overview filled defaults VERIFIED; named Create/Run **BLOCKED**; Export velocity disabled empty. |
| Extensibility | Forms D-247, Workflow D-248, Modules D-249, Automations D-250, Webhooks D-251 | Forms/Auto/Workflow/Webhooks create **PARITY-seeking** · live **BEHIND** | UX-032; Workload filled separate. |

### Strategic CI calls from this batch

1. **Table stakes Now still correct:** invite/access/client grant (Freeze) — not More-tools depth.
2. **Whitespace / wedge:** Client portal remains the only clear **UNIQUE vs Linear** bet; hierarchy (Products/Portfolios/Programs) is **suite + Jira/ClickUp parity play**, not Linear.
3. **Intentional avoid:** copying ClickUp mega-menu / Jira SM suite via More-tools sprawl before activation works.
4. **Cycles = highest PM-job BEHIND** among empty core delivery routes vs Linear.
5. **FilterBar system** (shared Status/Owner/Health/search) = ADOPT/ADAPT opportunity for Design — competitive hygiene, not differentiation.

### Still UNKNOWN (need Member/Client/Account B + filled data)

- Permission-differentiated filters/cards per role
- Create-issue for non-Owner presets
- Guest portal NF
- Whether Agent access / AI widgets are AVAILABLE vs vapor
- Mobile / a11y

### Append log

| When | Ledger batch | CI action |
| --- | --- | --- |
| 2026-09-30 | Wave open | Seed Freeze table |
| 2026-09-30 | D-100…D-251 Owner | Scored above |


## Member batch T01…T24 (2026-09-30) — scored

Source: `/workspace/streamlineos-build-qa/SURFACE_LEDGER_COMPLETENESS.md` + `ROLE_MATRIX.md`
Role: Build Module Member + project Member · 30 VERIFIED surfaces.

### Role-differential gaps (Owner D- vs Member T-)

| Topic | Owner | Member (T-) | Competitive gap |
| --- | --- | --- | --- |
| Reach same nav shells | Yes | Yes T01–T14, T17–T23 | **PARITY** shell reachability vs Linear/ClickUp workspace members |
| Create project / issue / upload / post update | Yes | **No Build create CTAs** (T24 Create = mail/calendar/chat only; T22/T23 no post/upload) | **BEHIND** default collaborator power — Linear/ClickUp/Jira members typically create issues in projects they can access. View-only preset without obvious upgrade path = activation dead-end for IC users |
| Projects list | Shows Alpha | **Empty “No projects yet”** while Member is on `/build/47` (T01) | **BEHIND** discoverability — peers list projects you’re a member of; empty list + working deep link = trust/IA bug class |
| Client Access | Invite/Grant CTAs (broken) | Page readable, **no CTA** (T15 / BUG-004) | **PARITY** with permission-gated admin (good) · request-access empty **BEHIND** (UX-017b still needed) |
| Build Access Roles | Full admin | Readable 26/80 (T16a) | **AHEAD–PARITY** transparency; still AVOID dumping raw perm codes on deny |
| Project settings | Full | Link **not discoverable** (U) | UNKNOWN if intentional hide vs missing — Linear project settings often role-gated but discoverable as disabled/locked |
| Multi-view Issues | Yes | Board/List/Table/Cal/Timeline/Workload switcher VERIFIED (T18a) | **PARITY** preserved for viewers — keep |
| Cycles / Releases empty | Empty | Empty + Member sees New Release (T21) but no issue create | Inconsistent CTA surface — **BEHIND** coherence vs Directs’ permission-aware actions |
| Command center counts | 1 project | Projects **0** (T02) while on project 47 | Same visibility bug class as T01 — **BEHIND** vs Directs’ membership-scoped counts |

### Competitive implications for PM delta

1. **Do not amend Freeze Now** for More-tools — Member confirms shells without create power; Freeze invite→Build→client still the bar.
2. **Candidate Completeness P0/P1 (new):** membership-scoped **Projects list + Command Center counts** (T01/T02) — table stakes vs every Direct.
3. **Candidate Completeness P1:** default Build Module Member should include **create issue** in projects they’re on (or a clearly named Viewer preset) — today “Member” ≠ industry Member.
4. **BUG-004** remains BEHIND for request-access; permission-gated CTA absence is correct pattern if paired with human empty state.
5. Hierarchy/Roadmap/Goals still empty for Member — craft BEHIND unchanged; no new UNIQUE claim.

### Append log

| When | Ledger batch | CI action |
| --- | --- | --- |
| 2026-09-30 | T01…T24 Member | Scored role differentials above |


## BUG-007 scrubbed verdict (2026-09-30)

| Item | Status |
| --- | --- |
| Cross-tenant leak (no OTP → Account A `/build/47`) | **NOT CONFIRMED** — CONTAMINATION / test artifact |
| CI gap | Do **not** score as BEHIND; isolation remains **UNKNOWN** until Account B completes OTP → own org → deny/404 on `/build/47` |
| Freeze amendment | **None** from BUG-007 |

Append log: BUG-007 closed as method artifact pending real Account B isolation pass.


## More-tools & hierarchy competitive bars (public sources, 2026-09-30)

**Method:** Official competitor docs/features/help only (WebSearch/WebFetch). Build evidence = Owner D-102…D-251 + Member T12–T23 empty-state VERIFIED (new org / light project). Access date for all competitor URLs below: **2026-09-30**.
**Confidence:** HIGH where official docs/features pages fetched; MEDIUM where help-center SEO or vendor feature pages only; LOW if inferred from marketing without feature doc.
**Gap rule:** Empty shell + Direct AVAILABLE & deep craft = **BEHIND** (craft). Surface named with no Direct equivalent = potential **UNIQUE** only after populated workflow VERIFIED — else do not claim AHEAD.

### Hierarchy shells — Products / Portfolios / Programs / Teams

| Build surface | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Products (`/build/managed-products`) | D-102 · T03 empty | Linear | **NOT a first-class Product entity** — hierarchy is Teams → Projects → Initiatives ([conceptual model](https://linear.app/docs/conceptual-model)) | https://linear.app/docs/conceptual-model | 2026-09-30 | **AHEAD vs Linear (surface)** · craft **UNKNOWN** until products hold real linkage |
| same | | Jira Cloud Plans | **AVAILABLE** custom hierarchy above Epics (Premium+) | https://support.atlassian.com/jira-software-cloud/docs/configure-custom-hierarchy-levels-in-advanced-roadmaps/ | 2026-09-30 | **BEHIND** craft vs Plans |
| same | | ClickUp | **AVAILABLE** Workspace→Space→Folder→List hierarchy + Portfolios | https://clickup.com/hierarchy-guide · https://clickup.com/features/portfolios | 2026-09-30 | **BEHIND** craft |
| same | | monday.com | **AVAILABLE** Portfolio solution (Enterprise) | https://support.monday.com/hc/en-us/articles/13337066797202-The-portfolio-solution | 2026-09-30 | **BEHIND** craft |
| same | | Zoho Projects | **AVAILABLE** WBS (phases/milestones/task lists) — not “Products” named same way | https://help.zoho.com/portal/en/kb/projects/zoho-projects-overview/articles/work-breakdown-structure-in-zoho-projects | 2026-09-30 | **PARITY-seeking** naming · **BEHIND** populated WBS |
| Portfolios | D-103 · T04 empty | ClickUp / monday / Jira Plans | **AVAILABLE** (see URLs above) | (same cluster) | 2026-09-30 | **BEHIND** |
| Programs | D-104 · T05 empty | Jira Plans / ClickUp hierarchy patterns | **AVAILABLE** as Plan/Folder program patterns (not always labeled “Programs”) | Jira Plans docs · ClickUp hierarchy help | 2026-09-30 | **BEHIND** craft · **AHEAD vs Linear** naming surface only |
| Teams | D-105 | Linear Teams (+ parent/sub-teams) | **AVAILABLE** | https://linear.app/docs/conceptual-model | 2026-09-30 | **PARITY-seeking** shell · craft **BEHIND** until roster/workflow inheritance VERIFIED |
| Teams | | ClickUp Teams Hub · monday teams · Zoho user hierarchy | **AVAILABLE** | clickup.com/features · Zoho what’s-new (user hierarchy) | 2026-09-30 | **PARITY-seeking** |

**Cluster call:** Hierarchy IA paints suite/PMO parity vs ClickUp/Jira/monday; vs Linear Build is **AHEAD on named Products/Portfolios/Programs shells** but **BEHIND on craft** until empty states fill. Confidence: **HIGH** (official conceptual + Plans + ClickUp features).

### Roadmap / Feedback / Changelog

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Roadmap tab | D-120 · T12 empty | Linear Roadmap | **AVAILABLE** workspace project timeline | https://linear.app/docs/roadmap-doc | 2026-09-30 | **BEHIND** |
| same | | Jira Timeline / Plans | **AVAILABLE** | Atlassian Plans / Timeline support | 2026-09-30 | **BEHIND** |
| same | | ClickUp (Gantt/timeline + Portfolio) | **AVAILABLE** | https://clickup.com/features | 2026-09-30 | **BEHIND** |
| Feedback tab | T12a empty | Linear | Customer requests / Asks adjacent; not a public Feedback tab in core docs | https://linear.app/docs/triage (Asks) | 2026-09-30 | **PARITY-seeking surface** · craft **BEHIND** · Confidence **MEDIUM** |
| Changelog tab | T12b empty | Linear / peers | Ship/changelog often via Releases or third-party; Linear Releases exist separately | linear.app/docs (releases cited in search) | 2026-09-30 | **UNKNOWN** depth vs Directs · empty → treat craft **BEHIND** until populated |

**Cluster call:** Roadmap **BEHIND** all Directs with live roadmaps. Feedback/Changelog tabs are **UNIQUE-potential IA** vs Linear’s eng-internal model only if external submit/publish works — today empty → no AHEAD claim. Confidence: **HIGH** Roadmap; **MEDIUM** Feedback/Changelog.

### Goals / OKRs

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Goals & OKRs | D-121 · T13 empty (0% widgets) | ClickUp Goals | **AVAILABLE** (linked to tasks) | https://clickup.com/features · https://help.clickup.com/hc/en-us/articles/30806266190103-Organize-your-Hierarchy-for-goals-and-OKRs | 2026-09-30 | **BEHIND** |
| same | | monday Goals & OKRs | **AVAILABLE** (Work OS / support OKR boards) | monday support OKR + product Goals claims | 2026-09-30 | **BEHIND** · Confidence **MEDIUM–HIGH** |
| same | | Linear Initiatives | **AVAILABLE** (strategic layer; not branded OKRs) | https://linear.app/docs/conceptual-model | 2026-09-30 | **BEHIND** vs Initiatives craft · surface naming **PARITY-seeking** |
| same | | Jira Software native OKRs | **NOT native** — Plans custom hierarchy / Align / Goals by Atlassian / Marketplace | https://support.atlassian.com/jira-software-cloud/docs/generate-a-report/ (execution reports only) | 2026-09-30 | vs Jira Software alone: shell **PARITY-seeking** · vs Align/Goals: **BEHIND** · Confidence **MEDIUM** |
| same | | Zoho | Goals via milestones/WBS patterns | Zoho WBS help | 2026-09-30 | **BEHIND** populated |

**Cluster call:** **BEHIND** ClickUp/monday Goals; empty widgets make any AHEAD claim invalid. Confidence: **HIGH** ClickUp; **MEDIUM** monday/Jira OKR split.

### Approvals

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Project + org Approvals | D-122 · D-235 · `APPROVALS-BUDGET.md` | ClickUp Approvals | **AVAILABLE** | https://clickup.com/features | 2026-09-30 | Request CTA + type/status filters **PARITY-seeking**; submit→decide cycle **UNKNOWN** (cancelled) |
| same | | monday Portfolio approvals | **AVAILABLE** | monday portfolio solution | 2026-09-30 | Empty inbox craft OK; automation depth **BEHIND** |
| same | | Jira / JSM | **AVAILABLE** workflow / request approvals | JSM portal docs | 2026-09-30 | Surface **PARITY-seeking** vs Software; depth **BEHIND JSM** |
| same | | Linear | No first-class Approvals surface | conceptual-model | 2026-09-30 | **AHEAD vs Linear** (project+org inbox + Client Approval type) |
| same | | Zoho client approvals | Portal-tied patterns | Zoho client users KB | 2026-09-30 | Type includes Client Approval — still **BEHIND** until guest/portal works |

**Cluster call:** Empty-only retired. Create-path **PARITY-seeking** vs ClickUp; **AHEAD vs Linear** holds. Filled approve/reject + Client Approval NF **UNKNOWN**. Confidence: **HIGH** empty/create UX; **MEDIUM** lifecycle.

### Templates

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Create + Use Template → project | D-123 · `TEMPLATE-CREATE.md` · `TEMPLATE-APPLY.md` | ClickUp | **AVAILABLE** 1000+ / Quick Start | https://clickup.com/features · Quick Start gallery | 2026-09-30 | Core loop soft-up; **gallery / multi-task packs still BEHIND** |
| same | | Linear Issue templates | **AVAILABLE** | https://linear.app/docs/issue-templates | 2026-09-30 | Create+apply+seed task **PARITY** for basic single-task template → new project |
| same | | monday / Zoho / Jira | **AVAILABLE** (templates / blueprints) | vendor feature/help | 2026-09-30 | **BEHIND** blueprint gallery depth |

**Cluster call:** Apply VERIFIED (`PXC-Template-1` → `PXC-From-Template-1` / `PXC-901` + `Default task`). vs Linear basic: **PARITY**. vs ClickUp activation gallery: still **BEHIND**. Multi-task packs / apply-into-existing / public gallery **UNKNOWN**. Confidence: **HIGH** create+apply; **HIGH** ClickUp gallery BEHIND.

### Triage · Epics · Milestones

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Triage | D-230 empty | Linear Triage | **AVAILABLE** (+ Rules/Intelligence on Business+) | https://linear.app/docs/triage | 2026-09-30 | **BEHIND** (highest craft gap in this trio) |
| Epics | D-231 empty | Jira Epics · ClickUp Epics | **AVAILABLE** | Jira reports/epics · clickup.com/features | 2026-09-30 | **BEHIND** |
| same | | Linear | Uses Projects/parent issues more than “Epic” brand | conceptual-model | 2026-09-30 | **PARITY-seeking** naming vs Jira · craft **BEHIND** |
| Milestones | D-232 · `MILESTONES.md` | Linear Project Milestones · ClickUp Milestones · Zoho Milestones | **AVAILABLE** | linear conceptual-model · clickup features · Zoho what’s-new | 2026-09-30 | Create+filled list **PARITY-seeking**; issue↔milestone link **BEHIND** (no control) |

**Cluster call:** Triage **BEHIND** Linear (category-defining). Epics craft still **BEHIND** until filled. Milestones create **PARITY-seeking**; membership/link to issues still **BEHIND** Directs. Confidence: **HIGH**.

### Meetings · Chat · Wiki · Whiteboard

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Meetings | D-234 | ClickUp SyncUps / AI Notetaker · monday | **AVAILABLE** | https://clickup.com/features | 2026-09-30 | **BEHIND** / sprawl risk |
| Chat | D-240 empty channel | ClickUp Chat · monday updates | **AVAILABLE** | clickup.com/features | 2026-09-30 | **BEHIND** vs ClickUp · **sprawl vs Linear** (Linear stays issue-comments + Slack) |
| Wiki | D-241 empty | ClickUp Docs/Wikis · Confluence+Jira · Zoho | **AVAILABLE** | clickup.com/features | 2026-09-30 | **BEHIND** content · **PARITY surface** vs ClickUp |
| Whiteboard | D-242 empty CTA | ClickUp Whiteboards · monday WorkCanvas | **AVAILABLE** | clickup.com/features · support.monday.com WorkCanvas | 2026-09-30 | **BEHIND** |
| Collab cluster vs Linear | | Linear | Intentionally thin (issues/projects; Slack/GitHub) | conceptual-model | 2026-09-30 | Shell count **AHEAD vs Linear** · craft empty = **feature-count trap** (Design Not Now) |

**Cluster call:** **PARITY surface vs ClickUp** mega-collab; **BEHIND** craft; **do not chase** before Freeze activation. Confidence: **HIGH** ClickUp; **MEDIUM–HIGH** monday WorkCanvas.

### QA · Incidents · Change requests · Intake

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| QA / Tests | D-236 · `OPS-PACK.md` | Jira + Xray/Zephyr marketplace | **AVAILABLE** via ecosystem | Atlassian Marketplace | 2026-09-30 | Empty+wizard **PARITY-seeking** niche; filled suites/runs **BEHIND** specialist QA |
| Incidents | D-237 · same | Jira SM / Opsgenie-adjacent | **AVAILABLE** | linear triage / JSM | 2026-09-30 | Empty+SLA cards **PARITY-seeking** surface; live incident ops **BEHIND** specialists |
| Change requests | D-238 · same | Jira SM Change · ITIL | **AVAILABLE** | JSM docs | 2026-09-30 | Empty+wizard **PARITY-seeking**; approval lifecycle **BEHIND** JSM |
| Intake | D-239 · same | Linear Triage/Asks · monday WorkForms · JSM portal | **AVAILABLE** | triage · WorkForms · JSM | 2026-09-30 | Copy Form URL empty craft **PARITY-seeking**; share→submit NF **UNKNOWN** · soft **BEHIND** |

**Cluster call:** Empty craft soft-up for Completeness census. Still **Not Now** for eng — niche ITSM vs client wedge. Confidence: **HIGH** empty craft; **MEDIUM** vs specialist depth.

### Reports (Velocity/Burnup/CFD/Cycle/Lead) · Budget · Risks · Decisions

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Project Reports `/build/47/reports` | D-243 · `REPORTS-CRAFT.md` | Jira Velocity/Burnup/CFD/Control (cycle) + Generate a report | **AVAILABLE** | https://support.atlassian.com/jira-software-cloud/docs/generate-a-report/ | 2026-09-30 | Overview defaults **PARITY-seeking**; Agile modules empty-with-prereqs **PARITY empty craft**; named Create/Run **BEHIND** (UX-030) |
| same | | ClickUp Sprint Velocity / Burnup cards | **AVAILABLE** | https://help.clickup.com/hc/en-us/articles/13326819256983-Sprint-Velocity-cards | 2026-09-30 | Snapshot capture ≠ card/dashboard builder → **BEHIND** |
| same | | Linear cycle graphs | **AVAILABLE** | linear cycles docs | 2026-09-30 | Overview charts **PARITY-seeking**; no cycle-scoped report run yet → soft **BEHIND** until cycles filled + export |
| Org More tools Reports | — | Jira/ClickUp dashboards often workspace-scoped | **AVAILABLE** | vendor docs | 2026-09-30 | Org search “Reports” = no match → project-only IA (**UNIQUE seam / risk** vs suite dashboards) |
| Budget | D-244 · `APPROVALS-BUDGET.md` | Zoho Projects budgets (cost/hours/revenue) | **AVAILABLE** | https://www.zoho.com/projects/whats-new.html | 2026-09-30 | Project Set Budget **PARITY-seeking** empty craft; org Budget **404 / BEHIND** Zoho; **AHEAD vs Linear** project surface |
| Risks | D-245 · `RISKS-DECISIONS.md` | monday Portfolio Risk Insights · Jira risk via apps | **AVAILABLE** (monday Enterprise) | monday portfolio solution support | 2026-09-30 | Create+matrix **PARITY-seeking**; portfolio-rollups **BEHIND** monday Enterprise · Confidence **MEDIUM–HIGH** |
| Decisions | D-246 · `RISKS-DECISIONS.md` | ClickUp Docs/decisions narrative · audit logs | Soft **AVAILABLE** | clickup.com/features | 2026-09-30 | Create+log **PARITY-seeking** / soft **AHEAD vs Linear** (dedicated log); depth vs Docs narrative **UNKNOWN** |

**Cluster call:** Reports Create/Run still **BEHIND** (UX-030). Risks/Decisions create softs empty-only → **PARITY-seeking** registers (Linked Ticket field present). Budget as prior. Confidence: **HIGH** Risks/Decisions create; **HIGH** UX-030.

### Forms · Workflow · Modules · Automations · Webhooks

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Forms builder | D-247 · `FORMS-AUTOMATIONS.md` | ClickUp Forms · monday WorkForms · JSM | **AVAILABLE** | clickup.com/features · monday WorkForms | 2026-09-30 | Builder craft **PARITY-seeking**; publish/share/submit NF **UNKNOWN**; UX-032 auto-create **BEHIND** safer Draft patterns |
| Automations wizard | D-250 · same | ClickUp / monday / Jira Automation | **AVAILABLE** | clickup.com/features | 2026-09-30 | Wizard Cancel **PARITY-seeking** empty craft; rule depth / live fire **BEHIND** until create VERIFIED |
| Org More tools Forms/Automations | — | Often workspace-scoped in ClickUp/monday | **AVAILABLE** | vendor docs | 2026-09-30 | Project-only — org IA gap (same pattern as Reports/Budget) |
| Workflow | D-248 · `WORKLOAD-WORKFLOW-WEBHOOKS.md` | Linear/Jira/ClickUp workflows | **AVAILABLE** | conceptual-model · Jira · ClickUp | 2026-09-30 | Statuses + empty transitions **PARITY-seeking**; filled transition governance UNTESTED (cancelled) → soft **BEHIND** Jira Automation depth |
| Modules | D-249 · `MODULES.md` | Zoho modules customization · ClickUp hierarchy “modules” soft | Soft **AVAILABLE** | Zoho customization | 2026-09-30 | Empty+create craft **PARITY-seeking** (feature-group IA); filled progress/toggles **UNKNOWN**; vs Zoho true modules customization still **BEHIND**/category mismatch |
| Webhooks | D-251 · same | Linear API/Webhooks · ClickUp Webhooks | **AVAILABLE** | https://linear.app/docs/api-and-webhooks · clickup.com/features | 2026-09-30 | Empty+create craft **PARITY-seeking** (Payload URL required); live delivery **BEHIND** (cancelled, no URL) |

**Cluster call:** Forms/Automations empty-only retired at project scope. Builder/wizard **PARITY-seeking**; filled publish + live automation still **BEHIND** Directs. UX-032 = Completeness Next (safety). Confidence: **HIGH** empty/create UX; **MEDIUM** filled NF.

### Client portal / guest — **reaffirm BEHIND**

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Client Access + Client portal | D-124 · D-212 · T15 · `CLIENT-PORTAL-CHROME.md` | Zoho Projects Client Users | **AVAILABLE** | https://help.zoho.com/portal/en/kb/projects/users/client-users | 2026-09-30 | **BEHIND** unchanged (BUG-005/006; Grant Access Projects Error; 0 grants; guest UNTESTED) |
| same | | Jira Service Management Customer/Help Center portal | **AVAILABLE** | https://support.atlassian.com/jira-service-management-cloud/docs/set-up-and-manage-portal-access/ | 2026-09-30 | **BEHIND** |
| same | | ClickUp Guests | **AVAILABLE** | https://clickup.com/features (Guests) | 2026-09-30 | **BEHIND** |
| same | | monday Guests (Shareable boards) | **AVAILABLE** | https://support.monday.com/hc/en-us/articles/115005340405-How-to-get-started-as-a-guest | 2026-09-30 | **BEHIND** |
| same | | Linear Guests | **AVAILABLE** (team-scoped; paid; weak agency portal) | https://linear.app/docs/members-roles | 2026-09-30 | Still **BEHIND** usable guest/portal path · potential **UNIQUE vs Linear** *only after* grant→guest NF ships |

**Reaffirm:** Client portal remains the only clear **UNIQUE-vs-Linear wedge** in the strategy set — but present evidence forces **BEHIND** all Directs with working guests/portals. Guest NF = **UNKNOWN** until Client-guest role evidence. Confidence: **HIGH**.

### Cycles · Releases — **reaffirm**

| Build | Ledger | Competitor | Status | URL | Access | Build gap |
| --- | --- | --- | --- | --- | --- | --- |
| Cycles | D-208 · T20 empty | Linear Cycles | **AVAILABLE** (category-defining) | https://linear.app/docs/conceptual-model | 2026-09-30 | **BEHIND** (highest PM-job craft gap among core delivery) |
| same | | ClickUp Sprints · Jira Sprints | **AVAILABLE** | clickup.com/features · Jira reports | 2026-09-30 | **BEHIND** |
| Releases | D-209 · T21 empty (Member sees New Release) | Jira Versions/Releases (+ Plans releases) | **AVAILABLE** | https://support.atlassian.com/jira-software-cloud/docs/what-are-releases-in-advanced-roadmaps/ | 2026-09-30 | **BEHIND** |
| same | | Linear Releases | **AVAILABLE** (CI/CD-linked ship tracking) | linear.app/docs (releases) | 2026-09-30 | **BEHIND** · Confidence **MEDIUM–HIGH** |
| same | | Zoho / ClickUp release patterns | **AVAILABLE** / Portfolio release org | vendor docs | 2026-09-30 | **BEHIND** |

**Reaffirm:** Cycles = top empty-core **BEHIND** vs Linear; Releases **BEHIND** Jira. Confidence: **HIGH** Cycles; **HIGH** Jira Releases.

### Summary matrix (Build empty-state → Direct AVAILABLE)

| Cluster | vs Linear | vs Jira | vs ClickUp | vs monday | vs Zoho Projects |
| --- | --- | --- | --- | --- | --- |
| Hierarchy Products/Portfolios/Programs | AHEAD surface / BEHIND craft | BEHIND Plans | BEHIND | BEHIND Portfolio | BEHIND WBS |
| Teams | PARITY-seeking | PARITY-seeking | PARITY-seeking | PARITY-seeking | PARITY-seeking |
| Roadmap | BEHIND | BEHIND | BEHIND | BEHIND | BEHIND |
| Feedback/Changelog | UNIQUE-potential IA | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Goals/OKRs | BEHIND Initiatives | PARITY-seeking native / BEHIND Align | BEHIND | BEHIND | BEHIND |
| Approvals | AHEAD vs Linear · create PARITY-seeking | BEHIND JSM depth | PARITY-seeking create | BEHIND automation | BEHIND until portal |
| Templates | BEHIND | BEHIND | BEHIND | BEHIND | BEHIND |
| Triage | BEHIND | PARITY-seeking | PARITY-seeking | PARITY-seeking | PARITY-seeking |
| Epics/Milestones | PARITY-seeking / BEHIND | BEHIND | BEHIND | BEHIND | BEHIND |
| Collab (Meetings/Chat/Wiki/Whiteboard) | AHEAD shell count (trap) | PARITY-seeking | BEHIND craft | BEHIND | BEHIND |
| QA/Incidents/CR/Intake | PARITY-seeking niche | BEHIND SM | BEHIND | BEHIND | BEHIND |
| Reports/Budget/Risks/Decisions | Overview PARITY-seeking · Create/Run BEHIND (UX-030); Budget project PARITY-seeking · org 404 | BEHIND named reports | BEHIND create | BEHIND risks | Project soft-up · org BEHIND Zoho |
| Forms/Workflow/Automations/Webhooks | PARITY surface webhooks | BEHIND Automation | BEHIND | BEHIND | PARITY-seeking |
| Client portal/guest | BEHIND (UNIQUE *if* fixed) | BEHIND JSM | BEHIND Guests | BEHIND Guests | BEHIND Client Users |
| Cycles | BEHIND | BEHIND sprints | BEHIND sprints | BEHIND | BEHIND |
| Releases | BEHIND | BEHIND | BEHIND | BEHIND | BEHIND |

### CI implications (this section)

1. Do **not** amend Freeze Now for More-tools depth — empty shells vs AVAILABLE Directs confirm craft BEHIND is expected, not a new wedge.
2. Only **AHEAD surfaces** worth protecting later: hierarchy naming vs Linear; Approvals vs Linear; Budget vs Linear; collab shell count (but Design AVOID sprawl).
3. Only **UNIQUE bet** still Client portal — reaffirmed **BEHIND** until grant→guest works.
4. Highest craft BEHIND among empty cores: **Cycles (Linear)**, **Triage (Linear)**, **Templates gallery (ClickUp)**, **Reports Create/Run (Jira/ClickUp — UX-030)**, **Client guest (all)**.

### Append log

| When | Ledger batch | CI action |
| --- | --- | --- |
| 2026-09-30 | Wave open | Seed Freeze table |
| 2026-09-30 | D-100…D-251 Owner | Scored Owner batch |
| 2026-09-30 | T01…T24 Member | Scored role differentials |
| 2026-09-30 | BUG-007 | Scrubbed NOT CONFIRMED |
| 2026-09-30 | D-120…D-251 + T12–T23 + hierarchy | Competitive bars section above (public Direct docs) |


## Owner filled-data Cycle/Epic/Release (2026-09-30) — scored

Source: `../../streamlineos-ux/FILLED-DATA-OWNER-NOTES.md` · Owner VERIFIED creates.

| Artifact | Was (empty census) | Now | Gap vs Directs |
| --- | --- | --- | --- |
| Cycle `PXC-Cycle-1` (dates required) | BEHIND empty | Create path **VERIFIED**; date gate noted | **PARITY-seeking** on create; still **BEHIND Linear Cycles** for workflow depth (auto-scope issues, burnout, cycle autopilot) until issue↔cycle linking + active cycle UX VERIFIED |
| Epic `PXC-Epic-1` | Empty shell | Create **VERIFIED** | **PARITY-seeking** vs Jira Epics / ClickUp; depth UNKNOWN |
| Release `PXC-Release-1` v1.0.0 Draft | Empty shell | Create **VERIFIED** | **PARITY-seeking** vs Jira Releases; publish/changelog UNKNOWN |
| Issues `?status=TODO` Board+List | Filter unknown | Non-empty filter **VERIFIED** | **PARITY** filter hygiene vs Directs (partial — other filters UNTESTED) |

**Freeze:** unchanged (Cycles craft depth stays Next).
**Watchlist:** CW Cycles craft softens from “route empty” to “exists but not Linear-class.”

Append log: Owner filled-data scored.


## Build Module Admin promote (2026-09-30) — scored

Source: Designer Owner VERIFIED (room) · `pxctestera…` → Build Module Admin 80/80 · Org Admin system role exists, not assigned · Access UI checkbox + Save/Cancel, reversible.

| Claim | Gap | vs Directs |
| --- | --- | --- |
| Named module role presets (Member → Module Admin) | **PARITY–AHEAD surface** | ClickUp/Jira have granular roles; Linear is simpler (Admin/Member/Guest). Build’s Module Admin + 80/80 is closer to Jira/ClickUp richness |
| Org Admin system non-editable | **PARITY** | Common pattern (Atlassian org admin / workspace owner) |
| Promote UX: checkbox groups + Save, no scary confirm | **PARITY** | Matches Linear/ClickUp lightweight role edits; OK if paired with audit (T16a Audit exists) |
| Admin shell create CTAs / deny vs Owner | **UNKNOWN** | Awaiting Tester Module Admin census — do not assume create-issue fixed by 80/80 until T- VERIFIED |

**CW-002 implication:** If Module Admin gets create CTAs but Member (26/80) does not, industry “Member” naming remains BEHIND — prefer Viewer vs Member rename or default create on project membership.

**Freeze:** unchanged.


## CW-004 cycle depth (2026-09-30) — rescore

Source: `../../streamlineos-ux/CW-004-CYCLE-DEPTH.md` · Owner VERIFIED.

| Capability | Status | Gap |
| --- | --- | --- |
| Issue → assign cycle · cycle lists issue | VERIFIED | **PARITY-seeking** vs Linear cycle membership |
| Cycle filter on Board | VERIFIED | **PARITY** |
| Active/Current cycle chrome on overview + Board | Missing (Active cycle: None) | **BEHIND Linear** discoverability (UX-024) — Linear makes current cycle first-class in nav/board |
| Cycle dates / Draft / progress 0/1 | VERIFIED | **PARITY-seeking** |
| Autopilot / cycle planning rituals | UNKNOWN | Still BEHIND Linear depth if expected |

**Updated call:** Cycles create+link = **PARITY-seeking**; **Active-cycle discoverability = BEHIND Linear** (not empty-shell anymore). Freeze unchanged; CW-004 stays Next (depth/chrome), not Now.


## Module Admin MA01–MA10 (2026-09-30) — scored

Source: Tester Module Admin census · 80/80 Build Module Admin.

| Topic | Module Member 26/80 | Module Admin 80/80 | Gap |
| --- | --- | --- | --- |
| Projects list + New Project | Empty / no create | Non-empty + wizard | Admin **PARITY**; Member **BEHIND** industry Member |
| Create Issue | Absent | Present | Admin **PARITY**; Member **BEHIND** |
| Project settings | Not discoverable | Discoverable | Admin **PARITY** |
| Client Access CTAs | No CTA | Invite+Grant enabled | Admin **PARITY** surface (grant still broken BUG-005/006) |
| Client portal manage | Denied | Reachable | Admin **PARITY** permission |
| `/settings/users` | Deny settings:view | Deny settings:view | **PARITY** org-settings gate vs Owner |

**CI vote implication:** Elevate create into Freeze Now = wrong layer (product preset choice). Label honesty (Viewer vs Member) = competitive table-stakes naming vs Linear/ClickUp/Jira. Keep CW-001/002 as Completeness Next; optional PM-002 label clause only.


## Epic/release link depth (2026-09-30) — scored

Source: Designer Owner · `EPIC-RELEASE-LINK-DEPTH.md`

| Capability | Status | Gap |
| --- | --- | --- |
| Issue ↔ Epic link (picker, no Save) | VERIFIED | **PARITY** vs Jira Epic link / ClickUp hierarchy; smoother than some Jira flows |
| Issue ↔ Release membership | BLOCKED — no picker; release Tickets=0; Delete-only | **BEHIND Jira Releases** (issue↔version is table stakes) and ClickUp targets; **BEHIND** even draft-release usefulness → UX-025 Next |

Freeze unchanged. Releases create alone ≠ competitive release management.


## BUG-001 status update (2026-09-30)

Member2 cold invite reached OTP (not blank) — treat BUG-001 as **intermittent / host-specific**, not always-blank. Competitive gap remains **BEHIND until Freeze DoD** (dual apex+www ×2 fresh profiles). Do not claim FIXED.


## Filters + Portfolios/Programs Owner (2026-09-30) — scored

Source: Designer · `FILTERS-PORTFOLIOS-OWNER.md`

| Capability | Status | Gap |
| --- | --- | --- |
| Issue filters Priority/Assignee/Cycle/Type (+ empty High) | VERIFIED | **PARITY-seeking** vs Jira/ClickUp/Linear filter bars |
| No Labels filter · no Epic-as-relation filter (Epic type only) | VERIFIED gaps UX-026/027 | **BEHIND Jira/ClickUp** (label + epic parent filters are table stakes) · Linear weaker on labels but strong on cycle/project |
| Create Portfolio + Program (linked; Projects 0) | VERIFIED shells | Surface **AHEAD vs Linear**; craft still **BEHIND Jira Plans / ClickUp / monday Portfolio** until project membership works |

Freeze unchanged. Hierarchy watchlist: next evidence = project-into-portfolio link.


## Portfolio↔project link (2026-09-30) — scored

Source: Designer · `PORTFOLIO-PROJECT-LINK.md` · `PXC-Project-Alpha` → `PXC-Portfolio-1` (Projects=1) VERIFIED. Program↔project UNTESTED.

| Capability | Gap |
| --- | --- |
| Portfolio create + link project | Soft-up to **PARITY-seeking** vs ClickUp/monday portfolio membership; still **BEHIND Jira Plans** depth (roadmapping, dependency, capacity) until those exist |
| vs Linear | Still **AHEAD surface** (Linear has no Products/Portfolios) |
| Program↔project | **UNKNOWN** until tested |

Freeze unchanged.


## Program↔project BLOCKED (2026-09-30) — scored

Source: Designer · `PROGRAM-PROJECT-LINK.md` · UX-028

| Capability | Gap |
| --- | --- |
| Program create + nest under portfolio | Shell exists |
| Program↔project membership | **BEHIND** ClickUp/Jira/monday hierarchy — no detail/link UI; Edit/Delete only (UX-028 Next) |
| Portfolio vs Program | Portfolio **PARITY-seeking**; Program **BEHIND** as a real container |

Freeze unchanged. Hierarchy wedge incomplete until Program membership works or Programs are demoted in IA.


## Due Dates + Triage + Templates (2026-09-30) — scored

Source: Designer Owner · `DUE-TRIAGE-TEMPLATES.md`

| Capability | Status | Gap |
| --- | --- | --- |
| Due Dates filter range + clear chips | VERIFIED | **PARITY** vs Linear/Jira/ClickUp date filters |
| Triage empty + search only, no rule CTA | VERIFIED UX-029 | **BEHIND Linear Triage** (rules/intelligence AVAILABLE) — Next |
| Templates create | VERIFIED `PXC-Template-1` | Create **PARITY-seeking** vs Linear issue templates; filled library still **BEHIND ClickUp** gallery (apply path UNTESTED) |

Freeze unchanged.


## Template create (2026-09-30) — rescored

Source: Designer · `TEMPLATE-CREATE.md` · evidence `evidence/template-create/` · `PXC-Template-1` (GENERAL · 1 task · toast “Template created”).

| Capability | Gap |
| --- | --- |
| New Template → list row | Softens empty-only; create path **PARITY-seeking** vs Linear Issue templates |
| vs ClickUp Quick Start / 1000+ gallery | Still **BEHIND** — one custom template ≠ activation gallery |
| Apply template → new project + seed task | **VERIFIED** — see Template apply rescore below |

Freeze unchanged. Not a Next eng item; Completeness craft only.


## Reports craft (2026-09-30) — scored

Source: Designer · `REPORTS-CRAFT.md` · evidence `evidence/reports/` · UX-030

| Capability | Status | Gap |
| --- | --- | --- |
| Project `/build/47/reports` Agile + Overview tabs | VERIFIED | Overview filled defaults (2 tickets, charts) **PARITY-seeking** vs Jira/ClickUp dashboards |
| Agile empty modules + prerequisite copy | VERIFIED | Empty craft **PARITY-seeking** (honest blockers); Export velocity CSV disabled |
| Capture today's snapshot | VERIFIED | Data-history only — **not** named report create |
| Create / Run named report | **BLOCKED** UX-030 | **BEHIND** Jira Generate-a-report · ClickUp Sprint Velocity cards |
| Org More tools → Reports | No match | Project-only IA — suite dashboard parity incomplete |

Freeze unchanged. Completeness Next: UX-030 (with UX-029 Triage). Not Freeze elevate.


## Approvals + Budget (2026-09-30) — scored

Source: Designer · `APPROVALS-BUDGET.md` · evidence `evidence/approvals-budget/`

| Capability | Status | Gap |
| --- | --- | --- |
| Project Approvals + Request form (task/release/milestone) | VERIFIED (cancelled) | Create-path **PARITY-seeking** vs ClickUp; **AHEAD vs Linear** |
| Org Approvals inbox | VERIFIED empty | Cross-project inbox **PARITY-seeking** |
| Submit → approve/reject / Client Approval NF | UNTESTED | Lifecycle still **UNKNOWN** → soft **BEHIND** JSM |
| Project Budget Set Budget (₹) | VERIFIED (cancelled) | Empty craft **PARITY-seeking** vs Zoho project budgets; timesheet actuals **UNKNOWN** until hours logged |
| Org Budget | **BLOCKED** (More-tools miss + `/build/budget` 404) | **BEHIND Zoho** org/portfolio cost views |

Freeze unchanged. Not elevate Approvals/Budget over UX-029/030 or Freeze client grant. Client portal chrome next = Freeze-relevant — CI will reaffirm BEHIND until grant→guest.


## Client portal chrome (2026-09-30) — logged, gap **unchanged**

Source: Designer · `CLIENT-PORTAL-CHROME.md` · inspect-only · final state unpublished · 0 grants

| Capability | Status | Competitive note |
| --- | --- | --- |
| Unpublished chrome + Manage grants | VERIFIED | Surface paint OK; does **not** move gap |
| Visibility tickets/milestones + Preview empty | VERIFIED | Craft **PARITY-seeking** vs Zoho/JSM portal config chrome alone |
| Publish immediate / Unpublish confirm | VERIFIED UX-031 | Safety asymmetry — Completeness Next / Freeze-adjacent chrome; **not** PM-001 DoD |
| Grant Access → Projects Error | VERIFIED without submit (BUG-006) | Reaffirms Freeze **BEHIND** |
| Invite Client dialog | Opened + cancelled | CTA paint only |
| Grant → guest entry | **Not run** | PM-001 / portal guest stays **BEHIND** all Directs; UNIQUE-vs-Linear **not claimed** |

**Explicit:** Chrome-only pass does **not** soften D-124 / D-212 / PM-001 from **BEHIND**. Freeze DoD still atomic grant + guest entry.


## Template apply (2026-09-30) — rescored

Source: Designer · `TEMPLATE-APPLY.md` · `PXC-Template-1` → `PXC-From-Template-1` (key `PXC-901`) · seeded `PXC-901-1` Default task

| Capability | Gap |
| --- | --- |
| Use Template → new project + 1 seeded task | **PARITY** vs Linear basic issue/project template apply |
| vs ClickUp Quick Start / 1000+ gallery | Still **BEHIND** — custom 1-task pack ≠ marketplace activation |
| Multi-task packs · apply into existing project · public gallery | **UNKNOWN** / UNTESTED |

Freeze unchanged. Templates no longer create-only craft gap.


## Forms + Automations (2026-09-30) — scored

Source: Designer · `FORMS-AUTOMATIONS.md` · evidence `evidence/forms-automations/` · UX-032

| Capability | Status | Gap |
| --- | --- | --- |
| Project Forms list + builder (types/filters/Public toggle) | VERIFIED | Builder **PARITY-seeking** vs ClickUp/monday/JSM forms |
| New Form auto-creates inactive Untitled (no cancel) | VERIFIED UX-032 | Safety **BEHIND** peers with draft-cancel / Automations Cancel pattern in-product |
| Automations empty + wizard Cancel | VERIFIED (no create) | Empty craft **PARITY-seeking**; live rules **BEHIND** ClickUp/Jira/monday |
| Org More tools Forms/Automations | Not listed | Project-only IA |

Freeze unchanged. Not Now for eng over Freeze / UX-029–031. Completeness Next: UX-032.


## Milestones (2026-09-30) — scored

Source: Designer · `MILESTONES.md` · `PXC-Milestone-1` (target Oct 1, 2026 · Pending) at `/build/47/milestones`

| Capability | Status | Gap |
| --- | --- | --- |
| Empty → New Milestone → filled list + summary cards | VERIFIED | Create craft **PARITY-seeking** vs Linear/ClickUp/Zoho milestones |
| Filters status/owner/target date | VERIFIED | **PARITY-seeking** hygiene |
| Issue/work-item link on create or list | **Absent** | **BEHIND** Directs where milestones track linked scope |

Freeze unchanged. Completeness note only — not Freeze elevate.


## Risks + Decisions (2026-09-30) — scored

Source: Designer · `RISKS-DECISIONS.md` · `PXC-Risk-1` / `PXC-Decision-1`

| Capability | Status | Gap |
| --- | --- | --- |
| Risk Register create + matrix + P/I filters | VERIFIED | **PARITY-seeking** vs monday/Jira-app risk registers; portfolio Insights **BEHIND** monday Enterprise |
| Decisions Log create + status filters | VERIFIED | Dedicated log **PARITY-seeking** / soft **AHEAD vs Linear**; vs ClickUp Docs narrative depth **UNKNOWN** |
| Linked Ticket on Risk/Decision dialogs | Present (optional) | Better than Milestones (no link) — hygiene **PARITY-seeking** |

Freeze unchanged. Agree skip Meetings/Chat/Wiki/Whiteboard (ClickUp sprawl trap). Prefer Workload + Workflow + Webhooks next.


## Workload + Workflow + Webhooks (2026-09-30) — scored

Source: Designer · `WORKLOAD-WORKFLOW-WEBHOOKS.md`

| Capability | Status | Gap |
| --- | --- | --- |
| Workload metrics, member table, filters (unassigned=2) | VERIFIED filled | **PARITY-seeking** vs ClickUp Workload / Jira capacity views |
| Workflow statuses + empty transitions; Add transition inspected/cancelled | VERIFIED | Empty craft **PARITY-seeking**; saved transition rules **UNKNOWN** → soft **BEHIND** Jira |
| Webhooks empty + create requires Payload URL (cancelled) | VERIFIED | Create craft **PARITY-seeking**; live fire **BEHIND** Linear/ClickUp until delivery VERIFIED |

Freeze unchanged. Ops pack (QA/Incidents/CR/Intake) OK for Completeness census only — **Not Now** for eng (ITSM sprawl before client wedge).


## Ops pack (2026-09-30) — Completeness census only

Source: Designer · `OPS-PACK.md` · wizards inspected/cancelled · no creates

| Surface | Gap (census) | Eng priority |
| --- | --- | --- |
| QA / Tests | Empty+wizard **PARITY-seeking** niche vs Xray/Zephyr | **Not Now** |
| Incidents | Empty+SLA counters **PARITY-seeking** vs JSM/Ops | **Not Now** |
| Change requests | Empty+wizard **PARITY-seeking** vs JSM Change | **Not Now** |
| Intake | Copy Form URL **PARITY-seeking**; submit NF UNKNOWN | **Not Now** |

Freeze unchanged. Modules = last optional Owner More-tools; then CI stands by on Member2/Account B/Client-guest OTPs for role 100%.


## Modules (2026-09-30) — scored

Source: Designer · `MODULES.md` · `/build/47/modules` · create dialog cancelled

| Capability | Status | Gap |
| --- | --- | --- |
| Empty craft + New Module dialog (status/dates/lead) | VERIFIED | **PARITY-seeking** feature-group shell |
| Filled list / toggles / progress | Not inspected (no create) | **UNKNOWN** |
| vs Zoho module customization | Soft AVAILABLE competitor | Category mismatch risk — Build “modules” ≠ Zoho customization depth → soft **BEHIND** if buyer expects Zoho-class |

**Owner More-tools census (CI):** scored through Modules. Meetings/Chat/Wiki/Whiteboard remain **Not Now** (unscored beyond prior empty BEHIND / sprawl). CI stands by on Member2 / Account B / Client-guest for role 100%. Freeze unchanged.
