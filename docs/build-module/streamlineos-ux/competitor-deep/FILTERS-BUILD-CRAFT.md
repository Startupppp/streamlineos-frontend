# Build filter craft — Design census (handoff for PM FILTERS.md)

**Owner:** Principal Product Designer
**Source of truth:** `../FILTERS-PORTFOLIOS-OWNER.md` (Account A `/build/47`)
**Updated:** 2026-10-01
**Purpose:** Exact Build grammar so PM/CI compare Directs without inventing Build capabilities.

## Issues FilterBar — VERIFIED present

| Field | Operators / UI | URL param | Empty / chips |
|-------|----------------|-----------|---------------|
| Status | chooser | (standard) | chips + removable; URL reflects |
| Priority | = Medium/High… | `?priority=MEDIUM` | High → global “No tickets match your filters” |
| Type | = Task / Epic (issue type) | `?type=TASK` | Epic type ≠ Epic *relation* |
| Assignee | = Unassigned / person | `?assigneeId=__unassigned__` | non-empty for unassigned on PXA-1 |
| Cycle | = named cycle | `?cycle=55` | non-empty for PXC-Cycle-1 |
| Due Dates | From / To range | (range controls) | VERIFIED in chooser |

**Also VERIFIED craft:** per-column “No matches here”; active filters as removable chips; shareable URL state.

## Issues FilterBar — VERIFIED missing (BEHIND)

| Field | Chooser result | Design ID | Notes |
|-------|----------------|-----------|-------|
| Labels | “No matching filters” | **UX-026** | Labels exist as concept elsewhere; not on Issues FilterBar |
| Epic *relation* | Only Type→Epic | **UX-027** | issue↔epic link VERIFIED; no “in epic X” filter |
| Release membership | not in chooser | ties UX-025 | Release membership depth also BEHIND |
| Saved / named filter | not observed | Hypothesis | Confirm vs Linear/ClickUp on walks |
| Share filter as named view | URL share yes; named view unknown | Hypothesis | URL PARITY-seeking |

## Cross-object FilterBar (Themes #2)

Projects / Products / Portfolios / Programs / Goals / Roadmap repeat Status / Owner / Health / search / Display — **ADAPT** token consolidation; Issues grammar above is the delivery-critical set for PM ICP.

## Design ADOPT targets (for PM sellable framing)

1. **Labels** filter (UX-026) — Freelancer tags + PM feature slices
2. **Epic relation** filter (UX-027) — PM “work in this epic”
3. **Release** filter once membership works (UX-025) — PM/PjM ship set
4. Keep chip + URL shareability (PARITY strength)
5. Saved views / Set as default — Linear Display docs Hypothesis until walk

## Evidence
`/workspace/streamlineos-ux/evidence/` — `issues-*-filter*.webp` / labels-missing (see FILTERS-PORTFOLIOS-OWNER.md list)

## CI / PM sync
- CI: put Direct filter grammar in FEATURES Filters section (ClickUp next; Linear blocked anti-bot)
- PM: `FILTERS.md` matrix should cite this file for Build column
- Design: fold walk-confirmed Direct operators into `patterns/FILTER-GRAMMAR.md` as dumps land

---

## Direct fold (2026-10-01) — UI-VERIFIED

See `patterns/FILTER-GRAMMAR.md`. ClickUp · Linear · Jira filter dumps folded from CI FEATURES. Highest Design ADOPT: **Labels (UX-026)**, **Epic/Relations (UX-027)**, **saved views**, **Me defaults**, **date presets**, **AND/OR progressive**.
