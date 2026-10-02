# HAVE today — StreamlineOS Build (strict Aditya bar)
**Updated:** 2026-10-01 ~18:30 IST  
**Rule:** Only capabilities Build/suite **already has** that Directs (Linear / ClickUp / Jira / monday / Asana) **largely lack**, with VERIFIED evidence.  
**Expect few.** Empty shells, table-stakes parity, and broken guest path are **not** HAVE.

| # | Feature | Why Directs largely miss | Evidence | Confidence | Caveat |
| --- | --- | --- | --- | --- | --- |
| H1 | **Project Budget** — Planned / Actual / Remaining cards in ₹ + Set Budget editor | Linear: no native budget. Jira: needs Tempo/marketplace. Asana: Timesheets & Budgets add-on. monday/ClickUp: time-tracking skew, not first-class project budget-in-currency | `APPROVALS-BUDGET.md` · CI gap Budget **AHEAD vs Linear** | VERIFIED (surface) | Empty craft — no billable hours logged in census; org Budget **404** (that part is SHIP) |
| H2 | **Decisions log** — dedicated create + status filters on project | Linear: no dedicated Decisions surface (comments/Docs only). Soft miss vs peers who bury decisions in Docs | `RISKS-DECISIONS.md` · CI soft **AHEAD vs Linear** | VERIFIED (create) | Depth vs ClickUp Docs narrative UNKNOWN — do not claim suite-wide UNIQUE |
| H3 | **Portfolio ↔ project membership** | Linear conceptual model has **no** Portfolios/Products entities | `PORTFOLIO-PROJECT-LINK.md` · CI **AHEAD vs Linear** | VERIFIED | ClickUp/monday/Asana **have** portfolios — this is HAVE **vs Linear**, not vs all Directs |
| H4 | **Issues Calendar → suite `/calendar` seam** | Pure PM Directs keep calendar in-module; they lack a suite Calendar handoff | D-204 · CW-005 · CI **UNIQUE seam** | VERIFIED | Also scored **IA risk / in-module BEHIND** — HAVE of seam, not of calendar depth |

## Explicitly NOT HAVE today

| Claim | Why excluded |
| --- | --- |
| Client Portal UNIQUE | Chrome VERIFIED; **grant→guest BEHIND** (BUG-005/006). UNIQUE-vs-Linear only after guest NF — see SHIP #3 / HAVE-conditional #105 in `100-WOW-REASONS.md` |
| Approvals / Client Approval type | **AHEAD vs Linear** create-path only; ClickUp/Jira/monday have approvals — Directs as a set do **not** largely lack |
| Products / Programs / hierarchy shells | AHEAD naming vs Linear; craft empty / Program membership BEHIND → not sellable HAVE |
| Roles 44/764 density | AHEAD–PARITY surface; Design AVOID overload — not a customer-desperate wow |
| Filter chips + shareable URL | **PARITY-seeking** vs Directs — table-stakes protect, not HAVE |
| Multi-view Board/List/Table/Timeline/Workload | **PARITY** already — not wow |
| Filters Completeness Next top-8 (Labels, Epic relation, Release filter, saved views, operators, AND/OR, relative due, Me Mode) | Build **missing** → **SHIP** |
| “Suite platform” / all-in-one / cheaper / modern UI | Rejected marketing |

## HAVE count

| Metric | Value |
| --- | --- |
| Strict HAVE rows | **4** |
| HAVE-conditional (portal chrome) | **0 in this file** (listed only in `100-WOW-REASONS.md` #105) |

**Parent summary:** HAVE=4 · expect few · do not pad.
