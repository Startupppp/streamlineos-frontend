# HRM-15 — Recheck Gap Matrix (2026-09-19)

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Verdict

**Program rules (HRM-01–13) were not sufficient alone.** They covered domains,
policies, and todos, but **did not specify per-page filters, views, overlays,
and backend contracts for every route.**

**After this recheck:** HRM-14 catalogs account for **162 authenticated** page
files plus the `/employee-onboarding` gate (**163 total accounted page files**).
The generated route census becomes authoritative when approved source changes.
In-scope pages have full anatomy; Recruitment has explicit BOUNDARY accounting
so nothing is silently missing.

**Implementation is not complete** — checkboxes remain unchecked. This matrix
is documentation completeness, not ship completeness.

## Documentation completeness

| Area | Before recheck | After recheck |
|------|----------------|---------------|
| Route existence / 404 / back | HRM-01 | Still HRM-01 + 14 row backHref |
| Keep/merge/remove | HRM-02 tables | HRM-02 + **14a–14f detailed rows** |
| Sidebar | HRM-03 | OK; Setup payroll nav in 14f |
| Filters/views/pagination rules | HRM-04 domain-level | **Per-page in 14*** |
| Cards/bulk | HRM-05 catalogs | Cross-linked per page |
| Forms/Zod | HRM-06 matrices | Per-page sheets/dialogs listed |
| API/cache/DB | HRM-07 P0 list | **Per-page backend + scale notes** |
| Architecture | HRM-08 locked DRs | Unchanged + workLocation |
| Visual | HRM-09 | Applies globally |
| Competitor | HRM-10 | Unchanged |
| Release | HRM-11 | Must evidence 14 rows |
| Payroll | HRM-12 | **14f every payroll page** |
| WFH/WFO | HRM-13 | **14b + 13** |
| Per-page encyclopedia | **Missing** | **HRM-14a–g** |

## Pages previously thin or easy to miss (now explicit)

| Page | Issue | Catalog |
|------|-------|---------|
| `/hr/settings/company` | Redirect, not a page | 14e |
| `/payroll/setup` | Orphan nav | 14f |
| `/hr/service-delivery` | Inline; MERGE unclear | 14d |
| `/hr/simulator` | Should not be customer nav | 14d |
| `/hr/performance/analytics` | Inline | 14c |
| Location holidays | Incomplete | 14b |
| `/me/team` | Missing ADD | 14a |
| All governance ops | KEEP name only | 14d |
| All payroll lists | HRM-12 high-level | 14f |
| All recruitment | Boundary handwave | 14g full list |

## Backend themes reinforced in catalogs

1. **Cap ≤100 + cursor** everywhere (directory 1000 / team leaves 500 called out).
2. **Shared cache invalidator** including WFH approve and payroll input rebuild.
3. **Zod on list queries** — not only mutations.
4. **EmploymentFacts / Directory SoR** on people reads (DR-HRM-01).
5. **Payroll run employee contract** wiring + Query key collision fix.
6. **Dynamic custom-field filters** authorized + indexed.
7. **Maintainability:** extract inline pages; one sheet pattern; settings versioning.
8. **Scalability:** org-chart neighborhood; matrix/skill batching; async export jobs.

## Still open Phase 0 (product)

**None.** Remaining gates locked in
[00-product-decisions-prd.md](./00-product-decisions-prd.md) when the user
proceeded (2026-09-19): D05–D12 cover service-delivery, biometric/devices,
aliases, `/me/team`, reimbursements/FnF, org compat, simulator, company
settings.

Implementation acceptance checkboxes inside HRM-00 remain open until evidenced.

## How to use

1. Implement against **HRM-14 row** for the page you touch.
2. Obey domain PRDs (01–13) and **HRM-00** decisions for cross-cutting rules.
3. Check evidence in HRM-11.
4. Do not mark README parent done until matching 14 rows are evidenced.

- [ ] **HRM-15-001** spot-check: pick 10 random in-scope routes — each has a
  14a–14f section heading.
- [ ] **HRM-15-002** count recruitment routes in 14g vs glob of
  `hr/recruitment/**/page.tsx` — must match.
- [ ] **HRM-15-003** count payroll routes in 14f vs glob — must match (+ setup
  nav task).
