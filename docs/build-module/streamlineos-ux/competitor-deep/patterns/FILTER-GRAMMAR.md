# Pattern card — Filter grammar (cross-Direct)

**Updated:** 2026-10-01 · **ClickUp / Linear / Jira = UI-VERIFIED** (CI FEATURES dumps)
**Build VERIFIED:** `../FILTERS-BUILD-CRAFT.md`

## Matrix

| Capability | Build | ClickUp | Linear | Jira |
|------------|-------|---------|--------|------|
| Status / Priority / Assignee | ✅ | ✅ UI | ✅ UI | ✅ Basic |
| Due / date family | ✅ Due range | ✅ Due + start + closed/created/updated/done | ✅ Due/Created/Updated/Started/Completed/… + presets + custom | ✅ Due + More filters dates |
| Cycle / sprint-like | ✅ Cycle | Sprint points field | — (Cycles elsewhere) | Sprint via More/JQL |
| Labels / tags | ❌ **UX-026** | ✅ **Tags** Is/Is not/Is set | ✅ **Labels** (+ Suggested label) | ✅ via More/JQL (Labels among 41) |
| Epic / parent / relations | ❌ **UX-027** | Dependency field | ✅ **Relations** (parent/sub/blocked/blocking/dup) | Parent/Epic via More/JQL |
| Release / fixVersion | ❌ | — | — | Affects versions in More |
| Custom fields | Unknown | None in sample WS | — | Via More (41 options) |
| Me / current user | Assignee only | ✅ **Me** + **Me Mode** | ✅ Current user | ✅ `currentUser()` / My open… |
| AND / OR | Implicit AND chips | ✅ AND/OR + **nested** | ✅ Advanced and/or + **nested groups** | ✅ JQL AND/OR |
| Nested groups | ❌ | ✅ Add nested filter | ✅ Add filter group nested | JQL parentheses |
| Saved named filter/view | URL chips only | ✅ Saved filters (empty UI + Save new) | ✅ **Custom Views** Create view | ✅ Save filter + default filter pack |
| AI / natural language filter | ❌ | — | ✅ **AI filter** suggestions | — |
| Query language | ❌ | — | Advanced builder (not JQL) | ✅ **JQL** WAS/CHANGED/EMPTY… |
| Clear chips | ✅ removable chips | ✅ Clear filter / Clear all | ✅ clear-all | ✅ Clear filters |
| Multi-view same grammar | Issues views | List/Board/Table same panel | Active issues | Issues search |

## Design ADOPT (now evidence-backed vs Directs)

1. **Labels/Tags filter** (UX-026) — ClickUp Tags + Linear Labels UI-VERIFIED
2. **Epic/relation filter** (UX-027) — Linear Relations + Jira parent/Epic class
3. **Is set / Is not set** operators — ClickUp Tags/Due
4. **AND/OR + nested** progressive — Coherent after Min labels
5. **Saved named filter / Custom view** — Linear Views + Jira Save filter + ClickUp Saved filters
6. **Me / currentUser quick** — ClickUp Me Mode · Jira My open · Linear Current user
7. **Date presets** (Overdue, this week…) — Linear Due presets UI-VERIFIED

## ADAPT

- Jira JQL power behind progressive disclosure — **not** freelancer day-1 primary UI
- ClickUp field sprawl (Time tracked, Sprint points…) — don’t dump 30 fields day-1; progressive picker OK

## AVOID

- Claiming monday/Asana filter UI until CI walks them
- Matching JQL complexity as Build Now for Freelancer ICP

## Sources
- `../../../streamlineos-analysis-pack/01-ci/competitor-deep/clickup/FEATURES.md`
- `../../../streamlineos-analysis-pack/01-ci/competitor-deep/linear/FEATURES.md`
- `../../../streamlineos-analysis-pack/01-ci/competitor-deep/jira/FEATURES.md`
