# Build Prioritized Backlog

Effort uses engineering days for one experienced engineer with existing repository context. It excludes migration observation windows and security review.

## P0: correctness and product coherence

| Order | Work | Dependency | Effort |
|---|---|---|---|
| 1 | Fix Cycles navigation `/sprints` → `/cycles`; add redirect and caller census | none | 1–2 d |
| 2 | Establish route manifest tests for all keep/move/consolidate/delete decisions | 1 | 2–3 d |
| 3 | Make project workspace optional across schema, DTOs, forms, services, and permissions | migration design | 5–8 d |
| 4 | Repair pages that render another surface: My Work, Templates, Backlog, Intake, Files, Analytics | 2 | 5–10 d |
| 5 | Normalize loading/empty/error/denied states and resolve prolonged skeletons | API observability | 3–5 d |
| 6 | Consolidate Sprint/Cycle identities and migrate references | 1, schema backup | 10–15 d |
| 7 | Consolidate QA Bug into canonical BUG work item | work-item contract | 8–12 d |
| 8 | Enforce tenant-safe composite FKs and parent-child 404 behavior | schema inventory | 8–12 d |
| 9 | Establish shared URL-state/filter/sort/cursor contract | route manifest | 4–6 d |
| 10 | Close authorization gaps for every list, detail, projection, and mutation | route/access matrix | 8–15 d |

## P1: competitive daily workflow

| Order | Work | Dependency | Effort |
|---|---|---|---|
| 11 | Canonical Issues explorer: board/list/table/timeline, saved views, bulk action | P0 APIs/components | 12–20 d |
| 12 | My Work and Inbox consolidation, drafts tab, cross-project actionability | 9, permission matrix | 8–12 d |
| 13 | Command palette for navigation, search, create, and record commands | route catalog | 5–8 d |
| 14 | Scope-aware navigation and settings moves | route migrations | 8–12 d |
| 15 | Reports consolidation, metric definitions, drill-down, exports | Cycle migration | 10–15 d |
| 16 | Workload with HR leave/capacity and Timesheets actuals | cross-module contracts | 10–15 d |
| 17 | Product discovery loop: feedback → insight → roadmap → project → release | canonical links | 15–25 d |
| 18 | Client portal grants/publication/change requests | access foundation | 12–20 d |
| 19 | Offline drafts, optimistic reconciliation, realtime version gaps | canonical mutations | 8–12 d |
| 20 | Import/export/templates with validation preview and rollback report | schemas | 8–12 d |

## P2: differentiation and scale

| Order | Work | Dependency | Effort |
|---|---|---|---|
| 21 | Durable AI proposals with citations, diffs, approvals, budgets, and run history | stable deterministic workflows | 12–20 d |
| 22 | Automation builder, run history, loop/rate guards | event/outbox foundation | 12–20 d |
| 23 | Advanced portfolio/program scenario planning | reliable project/report data | 12–20 d |
| 24 | Incident/postmortem automation and service/release correlation | incidents + integrations | 8–15 d |
| 25 | Enterprise retention, legal hold, export, and evidence packs | audit/files foundation | 10–18 d |

## Acceptance criteria

- [ ] Every backlog item links to one or more page acceptance checklists.
- [ ] P0 contains all known broken routes, authorization risks, and data-model contradictions.
- [ ] No P1/P2 feature bypasses canonical work item, cycle, scope, permission, or pagination foundations.
- [ ] Effort is recalibrated after the first implementation slice and migration dry run.
