# UX patterns — extract for Build (ADOPT / ADAPT / AVOID)
**Lane:** PM (+ Design consult) · **Updated:** 2026-10-01 (IST) — **UI-VERIFIED filters fold** (ClickUp · Linear · Jira)
**Sources:** UX Completeness notes, `FILTERS-BUILD-CRAFT.md`, CI `clickup|linear|jira/FEATURES.md`, Freeze PRDs, public Direct help centres (monday/Asana/Zoho).
**Method:** Build Completeness + CI walk-confirmed ADOPT/ADAPT/AVOID for filters. **Do not invent signed-in UI** beyond FEATURES dumps. monday/Asana remain PUBLIC Hypothesis.

---

## Extraction template (use on every CI walk note)

```
### Pattern: <name>
- Direct(s): Linear | ClickUp | Jira | monday | Asana | Zoho
- Surface: <nav / dialog / empty / filter / create / report>
- What works: <1–3 bullets, evidence-backed>
- Failure mode if copied blindly: <sprawl / honesty / activation>
- Build today: <ledger / UX-ID / BEHIND|PARITY|…>
- Tag: ADOPT | ADAPT | AVOID
- ICP: F / PM / PjM
- Reason link: PM-OWNED-REASONS #n when framed
```

---

## 1. Navigation density

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Progressive disclosure for 20+ tools | More-tools inventory D-230…251; CW-006; Design UX-010 | **AVOID** mega-menu growth | Search + pin favourites; do not add tools to close ClickUp feature count |
| Org vs project scoped More-tools | Forms/Automations project-only; org lists Approvals/Templates/Client access | **ADAPT** | Make scope obvious in chrome; avoid “tool missing” false bugs |
| Suite seam Calendar → `/calendar` | D-204; CW-005 | **ADAPT** | Either embed calendar in Build or label “Opens suite Calendar” — don’t surprise PMs |
| Command Center widgets | D-100; Member T02 counts 0 | **ADOPT** membership-scoped counts | Widget truth > widget count |
| Home ↔ Build switcher | CI Cut v2 suite wedge | **ADOPT** | Keep; unique vs pure Linear |

**Competitive note (public CI, pre-walk):** Linear stays sparse; ClickUp/monday denser. Build should **ADAPT Linear quiet chrome** for core delivery and **AVOID ClickUp sprawl** until activation/wedge green.

---

## 2. Issue lifecycle chrome

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Multi-view Issues (Board/List/Table/Calendar/Timeline/Workload) | Owner D-201…206; Member T18a | **ADOPT** | Preserve for all roles that can view — PARITY strength vs Linear (no full Table) |
| Filter chips + URL params | FILTERS-PORTFOLIOS-OWNER; due-date filter | **ADOPT** | Keep removable chips + shareable URLs |
| Labels filter | UX-026 missing | **ADOPT** when shipped | Table stakes — Linear Labels + ClickUp Tags **UI-VERIFIED** (#101/#115) |
| Epic *relation* filter (not only Type=Epic) | UX-027; epic↔issue link VERIFIED | **ADOPT** when shipped | Relation ≠ type — Linear Relations→Parent **UI-VERIFIED** (#102) |
| Permission-aware Create | CW-002 / UX-023; Member no Create issue | **ADAPT** | Grant create on Member **or** rename Viewer; never silent view-only labelled Member |
| Workload create modal | WORKLOAD-WORKFLOW-WEBHOOKS | **ADAPT** | Broad craft OK; cancel/close required |
| Import CSV/JSON + dry-run | CI Cut v2 | **ADOPT** | Foundation present; deepen importers Later |

---

## 3. Cycles / sprints

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Issue↔cycle link + board filter | CW-004 VERIFIED | **ADOPT** | Keep; PARITY-seeking membership |
| Active / Current cycle on overview + board | UX-024; overview still “Active cycle: None” | **ADOPT** (ship) | Highest PM-job BEHIND vs Linear Cycles |
| First-cycle empty guide | PM-008; softened empty after create VERIFIED | **ADAPT** | Guide when zero cycles; don’t nag when Draft cycle exists |
| Cycle prerequisites in Agile reports | REPORTS-CRAFT empty copy | **ADOPT** | Honest empty > fake charts |

---

## 4. Permissions honesty

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Membership-scoped Projects list | CW-001 / UX-022; T01 empty while on `/build/47` | **ADOPT** (ship) | Never empty-all when ≥1 membership |
| Honest Viewer vs Member labels | CW-002; MEMBER2 invite shows Member; 26/80 view-ish | **ADOPT** (ship) | Label must match create power |
| Raw permission codes on deny | Design AVOID perm dump; UX-017b class | **AVOID** | Human deny + request path |
| Roles surface richness (44/764) | CI Cut / D-125 | **ADAPT** | Power user depth OK; default paths stay simple |
| Build role at invite | PM-002 / BUG-002 | **ADOPT** (Freeze) | Default Build Module Member ON |
| Client Access CTA gated by role | Owner CTAs vs Member BUG-004 | **ADAPT** | Gate OK; Member needs request CTA |

---

## 5. Client / guest portals

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Unpublished warning + visibility toggles | CLIENT-PORTAL-CHROME | **ADOPT** | Clear “Portal not published” |
| Per-ticket / milestone client visibility | Visibility section VERIFIED | **ADOPT** | Keep granular toggles |
| Preview empty “Nothing visible to clients yet” | CLIENT-PORTAL-CHROME | **ADOPT** | Honest preview |
| Publish without confirm; Unpublish with confirm | UX-031 | **ADAPT** | Symmetric confirm on publish |
| Grant Access must not false-succeed | BUG-005/006; Projects Error on Grant | **ADOPT** (Freeze PM-001) | Atomic grant → magic-link |
| Invite Client dialog fields | Inspected, not submitted | **ADAPT** | Email required for real invite when shipped |
| Compare guest to Zoho/JSM/ClickUp/monday — not Linear-guest | NOW-FREEZE / CI | **ADAPT** | Wedge vs Linear; parity-of-trust vs suite portals |

---

## 6. Empty states

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| EmptyState contract (illustration optional + one primary CTA) | COMPLETENESS-UX-THEMES #1; Templates dual CTA | **ADOPT** | Standardise across More-tools |
| Informational empty without CTA | Triage UX-029 | **AVOID** for actionable surfaces | Triage needs rules / “configure triage” |
| Filtered empty vs true empty | Forms filtered empty; Issues filter empty | **ADOPT** | Distinct copy (“No matches” vs “No X yet”) |
| Loading → empty >1s feels broken | Themes #5 | **ADAPT** | Skeleton → empty ≤1s |
| Ops empties with domain filters | OPS-PACK QA/Incidents | **ADOPT** craft | Good empty; don’t staff eng Now |
| Intake “No all items” copy | OPS-PACK | **ADAPT** | Fix awkward All-tab copy |

---

## 7. Filters

**Build SoT:** `../../streamlineos-ux/competitor-deep/FILTERS-BUILD-CRAFT.md` · PM matrix: `FILTERS.md`
**CI walks (2026-10-01 IST):** ClickUp / Linear / Jira Filters = **UI-VERIFIED** (`FEATURES.md` + `BUILD-GAPS.md`).

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Shared FilterBar (Status/Owner/Health/search) | Themes #2; Projects D-101 | **ADAPT** | Consolidate tokens/chips; Health is monday-like — keep |
| Issues facets Status/Priority/Type/Assignee/Cycle/Due | FILTERS-BUILD-CRAFT VERIFIED | **ADOPT** protect | Delivery-critical set for PM ICP — Present vs all three Directs |
| Filter chips + shareable URL | FILTERS-BUILD-CRAFT · #37/#112 | **ADOPT** | PARITY-seeking — do not regress |
| Filtered empty + Clear all | FILTERS-BUILD-CRAFT · DUE-TRIAGE · Direct Clear all UI-VERIFIED | **ADOPT** | Distinct from true empty |
| Due date From/To | DUE-TRIAGE-TEMPLATES | **ADOPT** | Range chips clear; add relative presets (#105) |
| Labels filter | UX-026 missing | **ADOPT** when shipped | **UI-VERIFIED:** Linear **Labels**; ClickUp **Tags** (#101/#115). Jira Labels not in observed More-filters slice |
| Tags vs Labels naming | UX-026 · ClickUp Tags walk | **ADAPT** | Freelancer ICP recognises Tags; ship Labels with Tags synonym awareness (#115) |
| Epic *relation* filter (not Type=Epic) | UX-027 | **ADOPT** when shipped | **UI-VERIFIED:** Linear Relations→Parent (#102). ClickUp had no Epic/parent field |
| Release membership filter | UX-025 tie | **ADOPT** after membership | **UI-VERIFIED:** Jira Affects versions in More filters (#109) |
| Named personal + team saved filters | not observed on Build | **ADOPT** when shipping | **UI-VERIFIED:** ClickUp Saved filters; Linear Custom Views builder; Jira Save + defaults (#107) |
| is/is not / empty / AND–OR nested groups | not observed on Build | **ADAPT** | **UI-VERIFIED:** ClickUp Is/Is not/Is set + AND/OR nest; Linear Advanced and/or nest (#103/#104). Ship after Labels+Epic |
| Relative date presets | absolute only | **ADAPT** | **UI-VERIFIED:** Linear Due presets + custom timeframe (#105) |
| Custom-field facets on Issues | not in chooser | **ADAPT** | ClickUp: none in small free WS; after #92/#106 |
| Me Mode / Assigned-to-me quick | My Work tabs only | **ADAPT** | **UI-VERIFIED:** ClickUp Me + Me Mode; Linear Current user; Jira `currentUser()` (#108) |
| Dependency / Blocked-Blocking filter | absent | **ADAPT** | **UI-VERIFIED:** ClickUp Dependency; Linear Blocked/Blocking (#111) |
| Keyboard `F` | absent | **ADAPT** after facet parity | Linear `F` **not observed** this walk — keep pending (#110) |
| AI NL → filter | absent | **AVOID** as Now table-stakes | **UI-VERIFIED:** Linear AI filter suggestions (#113). Completeness Later — don’t block UX-026/027 |
| JQL-class query language | absent | **AVOID** chase | **UI-VERIFIED:** Jira JQL autocomplete EMPTY/currentUser/WAS/CHANGED (#114). Prefer chips + saved views |
| Org Approvals date range + counters | APPROVALS-BUDGET | **ADOPT** | Pending/Overdue counters |

---

## 8. Create flows

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Project wizard Basics → Blank → features → workflow → Review | CI Cut VERIFIED | **ADOPT** | Strong activation path |
| Automations wizard with Cancel | FORMS-AUTOMATIONS | **ADOPT** | Explicit cancel |
| New Form auto-creates untitled draft (no cancel) | UX-032 | **AVOID** | Match Automations: draft only on Save or confirm |
| Template New + Apply → seeded project | TEMPLATE-CREATE / TEMPLATE-APPLY | **ADOPT** | Single-template path OK; gallery Next |
| Approval request form cancellable | APPROVALS-BUDGET | **ADOPT** | Inspect-cancel safe |
| Milestone required Name + Target Date | MILESTONES | **ADOPT** | Clear required markers |
| Cold invite accept → Build (not blank/OTP roulette) | BUG-001; PM-011; Member2 form OK / OTP stop | **ADOPT** (Freeze) | Lifecycle reliability |

---

## 9. Reports / insights

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Overview default metrics dashboard | REPORTS-CRAFT filled | **ADOPT** | Good filled craft — protect |
| Agile modules with prerequisite copy | Velocity/Burnup/CFD empty explainers | **ADOPT** | Honesty over vanity charts |
| Named Create/Run report | UX-030 BLOCKED | **ADOPT** when shipped | Snapshot ≠ report builder |
| Org-level Reports | Org More-tools “No matching tools” for Reports | **ADOPT** when shipped | PjM rollup job |
| Export disabled when empty | Export velocity CSV disabled | **ADAPT** | OK; enable when data exists |
| Capture today’s snapshot | Agile tab | **ADAPT** | Keep as history capture; don’t brand as “report create” |

---

## 10. Extensibility / workflow

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Workflow statuses + WIP + transitions empty explain | WORKLOAD-WORKFLOW-WEBHOOKS | **ADOPT** | “Unrestricted until transition added” honesty |
| Transition governance (approval, required fields, roles) | Workflow craft inspected | **ADAPT** | Powerful; default simple |
| Webhooks filters + Compact + Payload URL caution | Webhooks census | **ADAPT** | External side-effect — confirm on save |
| Live automation fire / live webhook deliver | Seed #18–19; create only inspected | **ADOPT** when VERIFIED | Surface ≠ live |

---

## 11. Hierarchy

| Pattern | Build evidence | Tag | Guidance |
| --- | --- | --- | --- |
| Portfolio create + project link | PORTFOLIO-PROJECT-LINK VERIFIED | **ADOPT** | Continue depth (deps/roadmap) Later |
| Program create without project membership | UX-028 | **ADOPT** when shipped | Nest-only is BEHIND Directs |
| Products / Teams shells | D-102/D-105; CW-007 | **ADAPT** | Fill craft before marketing hierarchy breadth |
| Roadmap / Goals empty | D-120/D-121 | **ADAPT** | Completeness Next craft; don’t claim AHEAD |

---



---

## 12. Public-doc patterns (provisional — pending CI walks)

> Cite URL in Guidance. Tag **pending walk** — CI may correct plan-tier gating and exact chrome.

| Pattern | Direct + public source | Tag | Guidance | ICP | Reason # |
| --- | --- | --- | --- | --- | --- |
| Repeating Cycles (start weekday + duration) | Linear [Use Cycles](https://linear.app/docs/use-cycles) | **ADOPT** when shipping cadence | Auto-repeat beats manual cycle recreate; pair with Active chrome (#7) | PM | 56 |
| Triage accept / decline / duplicate / snooze | Linear [Triage](https://linear.app/docs/triage) | **ADOPT** ritual | Empty Triage without actions = dead panel (UX-029); shortcuts pending walk | PM | 57 |
| Triage Rules then Intelligence | Linear [Triage](https://linear.app/docs/triage) (Business+) | **ADAPT** | Ship Rules CTA before AI Intelligence; don’t market Intelligence first | PM | 58 |
| Issue blocked-by / blocks / related | Linear [Issue relations](https://linear.app/docs/issue-relations) | **ADOPT** | Sidebar flags for blockers; duplicate→canonical pattern | PM, PjM | 60 |
| Parent / sub-issues | Linear [Parent and sub-issues](https://linear.app/docs/parent-and-sub-issues) | **ADOPT** | Nest without losing parent progress | PM, PjM | 61 |
| Initiatives above projects | Linear [Initiatives](https://linear.app/docs/initiatives) · [Conceptual model](https://linear.app/docs/conceptual-model) | **ADAPT** | Map to Build Goals/Roadmap honesty; don’t rename-chase | PM, PjM | 62 |
| Form share URL + template on submit | ClickUp [Form settings](https://help.clickup.com/hc/en-us/articles/30750021046167-Form-settings) | **ADOPT** | Public intake URL; apply template after submit; fix UX-032 cancel first | F, PjM | 64–65 |
| Automation suggested recipes | ClickUp [Create an Automation](https://help.clickup.com/hc/en-us/articles/30241682127127-Create-an-Automation) | **ADAPT** | Gallery OK; keep wizard Cancel; live fire VERIFIED later | PM, PjM | 66 |
| Docs linked to work | ClickUp [Docs](https://clickup.com/features/docs) | **ADAPT** / **AVOID** sprawl | Link specs to issues; defer Docs Hub mega-feature | F, PM | 67 |
| Releases / Fix Versions | Jira [Enable releases and versions](https://support.atlassian.com/jira-software-cloud/docs/enable-releases-and-versions/) | **ADOPT** | Named ship container + membership (#9) | PM, PjM | 69 |
| Saved shareable filters | Jira [Save your search as a filter](https://support.atlassian.com/jira-software-cloud/docs/save-your-search-as-a-filter/) | **ADOPT** | Named lens beyond URL chips (#37) | PM, PjM | 72 |
| Cross-project Plans + dependencies | Atlassian [Plans overview](https://www.atlassian.com/software/jira/guides/advanced-roadmaps/overview) | **ADAPT** | Membership + deps before Premium scenarios (**AVOID** #97 chase) | PjM | 70–71, 97 |
| Portfolio All Projects Dashboard | monday [All Projects Dashboard](https://support.monday.com/hc/en-us/articles/23921675672466-Portfolio-management-All-Projects-Dashboard) | **ADAPT** | Auto-connect on portfolio membership; honest empty if none | PjM | 74 |
| Portfolio create-from-template automation | monday [Portfolio automations](https://support.monday.com/hc/en-us/articles/19335820533266-Portfolio-solution-automations) | **ADAPT** | Agency stand-up speed; after program membership truth | PjM | 75 |
| Guests on shareable boards only | monday [Guest start](https://support.monday.com/hc/en-us/articles/115005340405-How-to-get-started-as-a-guest) | **ADOPT** trust | Scope guests tightly; pair with PM-001 grant truth | F, PjM | 76 |
| My Tasks personal inbox | Asana [My Tasks views](https://help.asana.com/s/article/views-in-my-tasks) | **ADAPT** | Cross-project personal queue; keep quieter than ClickUp Home sprawl | F, PM | 78 |
| Goals progress from work | Asana [Goals](https://help.asana.com/s/article/setting-and-tracking-progress-towards-goals) | **ADAPT** | Fill D-121 widgets; auto-progress > vanity % | PM, PjM | 79, 85 |
| Portfolio + status updates | Asana [Portfolios](https://help.asana.com/s/article/portfolios-overview) · [All features](https://help.asana.com/s/article/all-asana-features) | **ADAPT** | Health + owner status update ritual | PjM | 80, 91 |
| Timeline schedule view | Asana [Timeline](https://help.asana.com/s/article/timeline) | **ADOPT** protect | Build Timeline exists — deepen deps/sections; don’t regress | PjM, PM | 81 |
| Client Users project-scoped | Zoho [Client user intro](https://help.zoho.com/portal/en/kb/projects/users/client-users/articles/client-user-intro) | **ADAPT** wedge | External profile ≠ full seat; parity-of-trust — not JSM depth | F, PjM | 83 |

| Filter chips + URL + Labels/Epic targets | Build craft + CI Linear/ClickUp **UI-VERIFIED** | **ADOPT** | SoT FILTERS-BUILD-CRAFT; see §7 walk notes (`FILTERS.md`) | F, PM, PjM | 101–102, 112, 115 |
| Saved personal/team filters | CI ClickUp Saved filters · Linear Custom Views · Jira Save/defaults **UI-VERIFIED** | **ADOPT** | Beyond URL chips; public docs secondary | PM, PjM | 107, 72 |
| AND/OR + operators + relative dates | CI ClickUp operators/nest · Linear Advanced + Due presets **UI-VERIFIED** | **ADAPT** | After Labels/Epic; monday/Asana still PUBLIC | F, PM, PjM | 103–105 |
| AI text-to-filter | Linear AI filter **UI-VERIFIED** · monday [Advanced board filters](https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters) PUBLIC | **AVOID** as Now table-stakes | Completeness Later; don’t block UX-026/027 | PM, PjM | 113 |
| JQL advanced search | Jira JQL autocomplete **UI-VERIFIED** · [JQL fields](https://support.atlassian.com/jira-software-cloud/docs/jql-fields/) | **AVOID** feature-count chase | ADAPT via saved filters + chips first | PM, PjM | 114, 72, 107 |

**Count this wave:** 20 public-doc (non-filter) + §7 walk-confirmed filter rows (replaces prior Hypothesis filter-wave). Trim in council if needed.

## Append rule for CI walks

ClickUp / Linear / Jira Filters are folded into §7 above (2026-10-01 IST). When monday/Asana `FEATURES.md` Filters land, append rows with evidence paths. Until then cite PUBLIC URLs and tag Hypothesis — **do not** invent signed-in UI details.
