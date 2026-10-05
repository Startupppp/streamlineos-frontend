# Competitor deep — Filters comparison (StreamlineOS Build)
**Lane:** PM · **Updated:** 2026-10-01 (IST) — **UI-VERIFIED fold-in** (ClickUp · Linear · Jira CI dumps)
**Ask:** What filter capabilities do Directs offer vs Build today?
**Directs (primary):** Linear · ClickUp · Jira Cloud · monday.com · Asana
**Secondary:** Zoho Projects (suite useful notes only)

### Evidence rules
| Tier | Meaning |
| --- | --- |
| **Build VERIFIED** | Cite `../../streamlineos-ux/competitor-deep/FILTERS-BUILD-CRAFT.md` (+ Owner evidence) |
| **CI walk-confirmed / UI-VERIFIED** | Per-product `FEATURES.md` / `BUILD-GAPS.md` / `ACCOUNT.md` signed-in dumps |
| **PUBLIC / Hypothesis** | Help-centre URL · Confidence = Hypothesis pending walk |
| **NEED SIGNED-IN** | CI attempted; surface not reached — do **not** invent grammar |

**Never invent signed-in UI.** Concrete fields/operators below for ClickUp / Linear / Jira are taken only from CI FEATURES dumps.

---

## CI fold-in (walk-confirmed first)

| Product | Walk status | Filter inventory |
| --- | --- | --- |
| **ClickUp** | **SIGNED IN — UI-VERIFIED** (2026-10-01 IST) | `FEATURES.md` §Filters; `BUILD-GAPS.md`; `ACCOUNT.md`; evidence `filters-*.png` |
| **Linear** | **SIGNED IN — UI-VERIFIED** (2026-10-01 IST) | `FEATURES.md` §Filters + §Custom Views; `BUILD-GAPS.md` F-01…F-07 / V-01…V-02; evidence `filters-*.png` / `custom-view*.png` |
| **Jira Cloud** | **SIGNED IN — UI-VERIFIED** (2026-10-01 IST) | `FEATURES.md` §Filters (Basic + JQL); `BUILD-GAPS.md`; evidence `filters-basic-more-options.png` / `filters-jql-*.png` |
| monday / Asana | No CI walk MDs | **PUBLIC / Hypothesis** |
| Zoho | Secondary · no CI walk | **PUBLIC / Hypothesis** |

**CI seed still holds:** `100-REASONS.md` #12 Labels + Epic-as-relation BEHIND (UX-026/027) — Build-side; now also walk-confirmed on Linear Labels + Relations Parent, ClickUp Tags.

---

## StreamlineOS Build today

**Source of truth:** [`FILTERS-BUILD-CRAFT.md`](../../streamlineos-ux/competitor-deep/FILTERS-BUILD-CRAFT.md) (Design census; backed by `FILTERS-PORTFOLIOS-OWNER.md` Account A `/build/47`).

### Issues FilterBar — VERIFIED present

| Field | Operators / UI | URL | Empty / chips |
| --- | --- | --- | --- |
| Status | chooser | standard | removable chips + URL |
| Priority | = Medium/High… | `?priority=MEDIUM` | High → “No tickets match your filters” |
| Type | = Task / Epic (**issue type**) | `?type=TASK` | Epic type ≠ Epic *relation* |
| Assignee | = Unassigned / person | `?assigneeId=__unassigned__` | VERIFIED |
| Cycle | = named cycle | `?cycle=55` | VERIFIED |
| Due Dates | From / To range | range controls | VERIFIED |

**Also VERIFIED:** per-column “No matches here”; active filters as removable chips; **shareable URL state** → **PARITY-seeking** vs Direct URL filters.

### Issues FilterBar — VERIFIED missing (BEHIND)

| Field | Chooser | Design ID |
| --- | --- | --- |
| Labels | “No matching filters” | **UX-026** |
| Epic *relation* | Only Type→Epic | **UX-027** |
| Release membership | not in chooser | ties UX-025 |
| Saved / named filter | **not observed** | BEHIND vs ClickUp/Linear/Jira walks |
| Named shared view | URL share yes; named view unknown | BEHIND · URL PARITY-seeking |

### Where else filters live (ledger)

| Surface | Chrome | Evidence |
| --- | --- | --- |
| Issues Board/List/… | Add filter · chips · URL · Hide done · search · “Saved views” chrome (depth unverified) | FILTERS-BUILD-CRAFT · D-201 · QA T18/T27 |
| Backlog / My Work / All Work | Add filter (thinner facet sets) | D-207/108/109 |
| Org Projects / Portfolios / Programs / Goals | Status/Owner/Health/search (Themes #2) | FILTERS-BUILD-CRAFT cross-object · D-101… |
| Command Center / Cycles / Releases / Approvals | domain filters | D-100 · QA T20/T21 |

### Operators / saved / clear (Build)

| Capability | Status |
| --- | --- |
| Operators | Equality / pick-value; Due = absolute From–To. No is/is not / empty / AND–OR groups |
| URL share | **Present** — PARITY-seeking |
| Saved / shared named views | **Not observed** (chrome “Saved views” on board only — depth unverified) |
| Filtered empty + Clear all | **Present** VERIFIED |

---

## Direct product sheets

### 1. ClickUp — **UI-VERIFIED**

**Evidence:** `../../streamlineos-analysis-pack/01-ci/competitor-deep/clickup/FEATURES.md` · `BUILD-GAPS.md` · `ACCOUNT.md` · `evidence/filters-*.png`
**Scope:** Signed-in Vaivammcapital · Project 1 · List/Board/Table · Free-only.

| Dimension | UI-VERIFIED | Notes |
| --- | --- | --- |
| Where | Funnel/Filter on List; same panel on Board and Table | Cross-view grammar shared |
| Fields (observed picker) | Status; **Tags**; Due date; Priority; Assignee; Archived; Assigned comment; Created by; Date closed / created / updated / done; **Dependency**; Duration; Location/List; Recurring; Start date; Status is closed; Time estimate; Time tracked; Sprint points; Follower; Task Type; Last status change; Task Name; Task Description | ~26 fields; **no custom-field entry** in this small workspace; naming is **Tags** (not Labels) |
| Operators | Status: `Is` / `Is not`; Tags/Due: `Is` / `Is not` / `Is set` / `Is not set`; Priority/Assignee default `Is` + value picker; Assigned comment: `Has assigned comments` | Operator menus UI-opened |
| Assignee / Me | `Unassigned`, **`Me`**, distinct **`Me Mode`**, signed-in user, Agents… | Evidence `filters-assignee-me-mode.png` |
| AND / OR / nest | Sibling clauses under `Where`; visible **AND / OR**; **Add nested filter**; Add filter; Clear filter / Clear all | Evidence `filters-list-and-or-tags-operators.png` |
| Saved filters | Menu: **No saved filters yet** + **Save new filter** | Empty-state affordance verified; none created |
| Special | List/Board/Table share filter grammar | No AI filter observed on this walk |

**Build gap implication (CI BUILD-GAPS):** broad typed registry; operators ≠ values; Me/Me Mode; expression tree + nest; saved-filter persistence; portable filter state.

---

### 2. Linear — **UI-VERIFIED**

**Evidence:** `../../streamlineos-analysis-pack/01-ci/competitor-deep/linear/FEATURES.md` · `BUILD-GAPS.md` (F-01…F-07, V-01…V-02) · `ACCOUNT.md` · `evidence/filters-*.png` / `custom-view*.png`
**Scope:** Signed-in Tarunchintakunta / team TAR · 2026-10-01 IST · Free-only UI inspection.

| Dimension | UI-VERIFIED | Notes |
| --- | --- | --- |
| Where | Active issues → filter funnel → searchable Add filter menu | Active / Backlog / All issues tabs |
| Field menu | **AI filter**; **Advanced filter**; Status; Assignee; Agent; Agent Session; Creator; Priority; **Labels**; **Relations**; Suggested label; Dates; Project; Project properties; Subscribers; Auto-closed; Content; Links; Template | 18 visible entries (F-01) |
| Labels | Checklist: No labels; Bug; Feature; Improvement | **Labels** naming (≠ ClickUp Tags) |
| Relations | Parent issues; Sub-issues; **Blocked** / **Blocking**; Recurring; Issues with relations; Duplicates | Epic-*class* = Parent; dependency-class = Blocked/Blocking (F-03) |
| Dates | Due / Created / Updated / Started / Completed / Auto-closed / Triaged / Time in current status; Due presets Overdue, 1d/3d/1w/1m/3m, Custom, No due date; custom operator **in** + Day/Month/Quarter/Half-year/Year | Relative + custom timeframe (F-04) |
| Values / operators | Multi-value checklist pickers for Status, Assignee (`No assignee` / **Current user** / …), Priority, Labels, etc.; Auto-closed = direct leaf; Content = text input | No separate Is/Is not label on checklist fields |
| AND / OR / nest | **Advanced filter** → + Filter · Add filter group · toggle **or** / **and** · nested groups with own operator + delete | Evidence `filters-advanced-*.png` (F-05) |
| AI filter | Prompt menu suggestions: `assigned to me`, `completed in the last month`, `due in the next 2 weeks` | Free-only inspect; no paid action |
| Custom Views | Team Views empty + **Create new view**; builder: name, optional description, Save to workspace, Cancel, Create view | Save/share/favorite **not** exercised (V-03 Not scored) |
| Keyboard `F` | **Not observed** on this walk | Do not claim walk-verified |

**Build gap implication:** Labels + Relations Parent/Blocked; relative dates; Advanced AND/OR nest; Custom Views; AI filter = Later / AVOID as Now table-stakes.

---

### 3. Jira Cloud — **UI-VERIFIED**

**Evidence:** `../../streamlineos-analysis-pack/01-ci/competitor-deep/jira/FEATURES.md` · `BUILD-GAPS.md` · `ACCOUNT.md` · `evidence/filters-basic-more-options.png` / `filters-jql-*.png`
**Scope:** `https://pxc-cijira2026100.atlassian.net/issues/?jql=` · 13 seeded work items · Free signup path.

| Dimension | UI-VERIFIED | Notes |
| --- | --- | --- |
| Where | Issues search (Basic / JQL toggle); Filters sidebar | `/issues/?jql=` |
| Basic controls | `Search work`; **Space**; **Assignee**; **Type**; **Status**; **More filters** (UI showed **10 of 41**); Clear filters; **Save filter** | Approachable Basic layer |
| More filters (observed slice) | Affects versions; Agent Sessions; Attachment; Comment; Components; Created; Creator; Description; Development; Due date | **Labels / Parent / Fix Version not in the opened 10-of-41 slice** — do not invent; **Affects versions** = Release-adjacent UI-VERIFIED |
| JQL | Editable query + Editor; Syntax help; Enter search / Shift+Enter newline | Autocomplete UI-VERIFIED |
| JQL autocomplete | After `assignee = `: `EMPTY`, `currentUser()`; after that: `AND` / `OR` / `ORDER BY`; after `status `: `=` `!=` `IS` `IS NOT` `IN` `NOT IN` `WAS` `WAS NOT` `WAS IN` `WAS NOT IN` `CHANGED` | JQL-class power confirmed |
| Saved / defaults | Sidebar **Default filters**: My open work items; Reported by me; All; Open; Done; Viewed / Created / Resolved / Updated recently; **View all filters**; toolbar **Save filter** | Personal defaults + save |
| Result table | Sortable: Work, Assignee, Reporter, Priority, Status, Resolution, Created, Updated, Due date; Configure columns; 13 of 13 | Triage table |

**Build gap implication:** Basic pickers + Save/defaults = ADOPT targets; **JQL-class language = AVOID chase** (prefer chips + named saved views). Labels/Parent/Epic not walk-claimed from this dump.

---

### 4. monday.com — PUBLIC / Hypothesis

| Dimension | Public-doc claim | Evidence |
| --- | --- | --- |
| Where | Board Filter (quick + advanced); column settings | [Board Filters](https://support.monday.com/hc/en-us/articles/360003624660-The-Board-Filters) · [Advanced](https://support.monday.com/hc/en-us/articles/25722908508946-Advanced-board-filters) |
| Fields | Any board column; subitem columns; search column scope | Advanced board filters |
| Operators | Column + condition + value; AND/OR groups; relative dates | Advanced board filters |
| Saved | Save as new view; dynamic personal People filter | Advanced board filters |
| Special | **Filter with AI**; subitem vs parent semantics | Advanced board filters |

**Confidence:** Hypothesis pending walk.

---

### 5. Asana — PUBLIC / Hypothesis

| Dimension | Public-doc claim | Evidence |
| --- | --- | --- |
| Where | Project filters; **Advanced Search** / Search views | [Search views](https://help.asana.com/s/article/search-and-search-views) · [Find work and save searches](https://help.asana.com/hc/en-us/articles/14253671218331-Find-work-and-save-searches) |
| Fields | Assignee, project/section, tags, dates, custom fields, assigned by, no project/tags | Search views (indexed help) |
| Operators | Add Filter; date Between/On; tag inclusion modes | Search views |
| Saved | Star → saved Search view (auto-updates) | Find work and save searches |
| Special | Cross-project Advanced Search as light reporting | Advanced search tip |

**Confidence:** Hypothesis pending walk.

---

### 6. Zoho Projects (secondary) — PUBLIC / Hypothesis

| Dimension | Public-doc claim | Evidence |
| --- | --- | --- |
| Where / saved | Tasks custom views; Issue Tracker custom views; share + columns | [Task List View](https://help.zoho.com/portal/en/kb/projects/tasks/tasks/tasks-introduction/articles/task-list-view) · [Issue Custom Views](https://help.zoho.com/portal/en/kb/projects/issue-tracker/issue-tracker-operations/articles/create-custom-view) |
| Fields | Status, Owner, Milestone, custom fields; AND/OR criteria | Task List View (indexed) |
| Special | Suite Client Users / WBS context — not a filter feature-count chase | — |

---

## Cross-Direct comparison matrix

**Build column** = FILTERS-BUILD-CRAFT. ClickUp / Linear / Jira = **UI-VERIFIED**. monday / Asana / Zoho = PUBLIC Hypothesis.
Legend: **Y** present · **P** partial · **N** missing/not observed · **?** not in walk dump / pending walk.

| Capability | Linear | ClickUp | Jira | monday | Asana | Zoho | **Build** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Evidence tier | **UI-VERIFIED** | **UI-VERIFIED** | **UI-VERIFIED** | PUBLIC Hyp. | PUBLIC Hyp. | PUBLIC Hyp. | **VERIFIED craft** |
| Status / Priority / Type / Assignee | Y | Y (Task Type) | Y Basic | Hyp Y | Hyp Y | Hyp Y | **Y** VERIFIED |
| Cycle / sprint facet | ? (Project props) | Y Sprint points | ? | — | — | — | **Y** Cycle VERIFIED |
| Due range / dates | Y + relative presets | Y Due + many dates | Y Due + Created… | Hyp Y | Hyp Y | ? | **Y** From/To absolute |
| Labels / tags | **Y Labels** | **Y Tags** | ? (not in 10/41 slice) | Hyp | Hyp Y | ? | **N** UX-026 BEHIND |
| Epic / parent *relation* | **Y Relations→Parent** | N (not in picker) | ? (Type Y; Parent not in slice) | Hyp | ? | Milestone-ish | **N** UX-027 BEHIND |
| Release / versions | N not observed | N not observed | **Y Affects versions** | — | — | — | **N** UX-025 tie |
| Dependency / blocked | **Y Blocked/Blocking** | **Y Dependency** | ? | Hyp | ? | — | **N** |
| Chips + shareable URL | ? | ? | ? | Hyp | Hyp | ? | **Y** PARITY-seeking |
| Relative date presets | **Y** | ? (Select option) | ? | Hyp Y | Hyp | ? | **N** (absolute only) |
| is/is not / empty / AND–OR | Advanced and/or nest | **Y** Is/Is not/Is set + AND/OR nest | **Y** JQL + Basic | Hyp Y | Hyp | Hyp | **N** / equality-ish |
| Named personal + saved filters | **Y** Custom Views builder | **Y** Saved filters menu | **Y** Save + defaults | Hyp | Hyp | Hyp | **N** not observed |
| Filtered empty + Clear all | Y clear-all | Y Clear all | Y Clear filters | ? | ? | ? | **Y** VERIFIED |
| Me / current-user quick | **Y** Current user | **Y Me + Me Mode** | **Y** `currentUser()` (+ My open default) | Hyp | Hyp | ? | **P** Assignee person only |
| AI NL → filter | **Y** AI filter suggestions | N not observed | N not observed | Hyp Y | ? | — | **N** · AVOID Now |
| JQL-class language | — | — | **Y** UI-VERIFIED | — | — | — | **N** AVOID chase |
| Keyboard `F` | ? not observed | Cmd/Ctrl+F search (PUBLIC) | ? | ? | ? | — | **N** observed |

---

## Build gap matrix vs UI-VERIFIED Directs

Legend vs each Direct: **Present** (Build has it) · **Partial** · **Missing** (Build lacks; Direct walk-confirmed) · **n/a** (Direct walk did not show it).

| Gap theme | vs ClickUp | vs Linear | vs Jira | Build today |
| --- | --- | --- | --- | --- |
| **Labels / Tags (UX-026)** | **Missing** (ClickUp **Tags**) | **Missing** (Linear **Labels**) | **?** Labels not in observed More-filters slice | **Missing** UX-026 |
| **Tags vs Labels naming** | Direct uses **Tags** | Direct uses **Labels** | — | Ship **Labels**; ADAPT Tags synonym for F ICP |
| **Epic / parent relation (UX-027)** | **n/a** (no Epic/parent field in picker) | **Missing** (Relations→Parent) | **?** Parent not in observed slice; Type picker Present on both | **Missing** UX-027 |
| **Release / versions** | **n/a** | **n/a** | **Missing** (Affects versions in More filters) | **Missing** (ties UX-025) |
| **Operators** (is/is not / empty) | **Missing** | **Partial** (checklist / leaf predicates) | **Missing** vs JQL op set; Basic pickers closer | Equality-ish only |
| **AND / OR + nested groups** | **Missing** | **Missing** (Advanced nest) | **Missing** vs JQL AND/OR (Basic = flat pickers) | **Missing** |
| **Saved / named views** | **Missing** (Saved filters menu) | **Missing** (Custom Views builder) | **Missing** (Save filter + default filters) | **Missing** / not observed |
| **JQL-class power** | n/a | n/a | **Missing** on Build — **AVOID chase** | Prefer chips + saved views |
| **AI filter** | n/a | **Missing** on Build — **AVOID as Now** | n/a | Later |
| **Me Mode / current-user** | **Missing** (Me + distinct Me Mode) | **Partial** (Current user checklist; no Me Mode name) | **Partial** (`currentUser()` + My open default) | Assignee person; no Me Mode |
| **Dependency / blocked** | **Missing** (Dependency field) | **Missing** (Blocked/Blocking relations) | **?** | **Missing** |
| Status/Priority/Type/Assignee/Cycle/Due | **Present** (parity-class core) | **Present** | **Present** (Basic) | **Present** VERIFIED |
| Chips + URL + filtered empty + Clear | **Present** (protect) | **Present** (protect) | **Present** (protect) | **Present** PARITY-seeking |
| Relative date presets | **?** | **Missing** on Build | **?** | Absolute From–To only |
| Custom-field facets | **n/a** (none in small WS) | Project properties only | More filters 41 (slice only) | **Missing** |

---

## PM implications (ICP)

| ICP | Filter jobs | Priority close |
| --- | --- | --- |
| **F** | My due / unassigned / tagged client work | Labels (ADAPT Tags naming) · Me Mode · relative due · keep URL chips |
| **PM** | Label / epic / cycle / priority planning slices | UX-026/027 · keep Cycle · saved team views · operators / AND–OR |
| **PjM** | Shared lenses + Release ship set + dependency blockers | Named shared filters · Release filter after UX-025 · Dependency/Blocked — **not** JQL/AI feature-count |

**Wedge:** Ship **Labels + Epic relation + durable saved views** before Jira JQL or Linear AI filters. Protect chip+URL honesty (PARITY-seeking). ADAPT ClickUp **Tags** naming awareness when selling Labels to Freelancer ICP.

---

## Blockers / next CI (residual)

1. monday / Asana — first signed-in walks (still PUBLIC Hypothesis).
2. Jira — open remaining More-filters pages to confirm Labels / Parent / Fix Version if needed (Affects versions already UI-VERIFIED).
3. Linear — keyboard `F` not observed this walk; do not market as walk-verified.
4. ClickUp — custom-field filters not visible in small free workspace; re-check on richer workspace Later.

---

## Linked artifacts

- Build craft: `../../streamlineos-ux/competitor-deep/FILTERS-BUILD-CRAFT.md`
- Reasons: `PM-OWNED-REASONS.md` #12, #37, #72 + **#101–115** (filter wave + walk adds)
- Patterns: `UX-PATTERNS.md` §2, §6, §7 + walk-confirmed filter rows
- CI: `clickup|linear|jira` → `FEATURES.md` · `BUILD-GAPS.md` · `ACCOUNT.md`
