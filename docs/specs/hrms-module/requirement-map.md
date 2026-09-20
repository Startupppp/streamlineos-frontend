# HRMS Requirement Routing Map

## Purpose

This file routes the acceptance library into packet families. It prevents the
347 open boxes from becoming a competing work queue. Counts are the 2026-09-20
snapshot and are checked by the plan validator; generated inventories determine
implementation coverage after source changes.

The previous README contributed 34 duplicate parent/phase boxes. They are no
longer counted because this scheduler tracks packets, while the numbered files
remain the only acceptance library. Four current competitive criteria were
added, producing 347 canonical open items rather than the old all-file count.

| Acceptance source | Open | Primary implementation owners | Aggregation/evidence owner |
|---|---:|---|---|
| `00-product-decisions-prd.md` | 17 | seams, named cutovers, domain children | DEC + REL |
| `01-route-navigation-prd.md` | 23 | ROUTE seam, FE-ROUTE, nav cutovers | GATE-ROUTE + PW-ROUTE |
| `02-page-inventory-prd.md` | 20 | one FE/BE child per disposition/page job | route/page censuses + REL |
| `03-sidebar-ia-prd.md` | 12 | NAV census, ROUTE/PERM seam, sidebar children | GATE-ROUTE + PW-ROUTE/A11Y |
| `04-discovery-filters-views-prd.md` | 18 | CONTRACT/QUERY seams; BE list and FE list/view children | GATE-FILTER + DB-QUERY/PW |
| `05-cards-bulk-actions-prd.md` | 15 | action-registry UI seam; bulk/preflight/execute/job children | GATE-PERM/CACHE + PW journey |
| `06-forms-validation-prd.md` | 30 | form census, one form + API mutation child per surface | GATE-FORM + PW lifecycle |
| `07-data-performance-prd.md` | 26 | BE operations, QUERY/EVENT seams, migration children | GATE-CACHE + DB-QUERY/ISOLATION |
| `08-architecture-prd.md` | 21 | people/permission/org cutovers, EVENT/DB seams | GATE-ARCH + DB-MIG |
| `09-visual-hierarchy-prd.md` | 17 | UI seam and per-page FE-VISUAL children | GATE-UI + PW-A11Y |
| `10-competitor-parity-prd.md` | 18 | named P0 feature children; non-goals create no code | product sign-off + REL |
| `11-release-verification-prd.md` | 25 | no direct feature work | DB/PW/provider/deploy/sign-off + REL |
| `12-payroll-prd.md` | 37 | one payroll FE/BE/form/bulk/provider child per row | payroll journey/provider/DB + REL |
| `13-wfh-wfo-prd.md` | 32 | attendance/leave/WFH children and event/cache consumers | DB/PW time journey + REL |
| `14-page-catalog-readme.md` | 5 | catalog/census reconciliation only | route/page census + REL |
| `14a-catalog-core-people.md` | 4 | People/Directory/Org/SELF children per page row | page PW + REL |
| `14b-catalog-time-leave.md` | 5 | Attendance/Leave/WFH/Clock children per row | page PW/DB + REL |
| `14c-catalog-experience.md` | 7 | lifecycle/performance/engagement/rewards children | page PW + REL |
| `14d-catalog-ops-governance.md` | 3 | ops/governance/analytics and named cutovers | page PW/DB + REL |
| `14e-catalog-hr-settings.md` | 2 | settings children + company-settings cutover | page PW + REL |
| `14f-catalog-payroll.md` | 3 | payroll children per page row | payroll PW/provider/DB + REL |
| `14g-catalog-recruitment-boundary.md` | 4 | boundary/link/handoff only; no ATS feature child | recruitment owner + REL accounting |
| `15-recheck-gap-matrix.md` | 3 | generated census reconciliation | REL |

The new `product-blueprint-prd.md` is a cross-cutting product contract. Its
criteria route to the same packet families; it must not be dispatched as one
task or counted as implementation duplication.

## Requirement-to-Packet Rules

| Requirement shape | Child pattern |
|---|---|
| “Every route/page…” | one generated route/page row per child; aggregate gate later |
| “Every read/write…” | one controller operation/transaction child; DB isolation batch later |
| “Every form…” | one mutation surface child from form census; parity gate later |
| “All filters/caches…” | one resource operation/page child using published seam |
| Page catalog section | one observable outcome, not necessarily whole page |
| Shared vocabulary/catalog/token | one serialized seam child then parallel adopters |
| Data-model change | one schema/migration child plus separate adopters/reconciliation |
| Browser/database/deployed proof | separate fixed-revision evidence packet |
| Product/legal/accessibility judgment | named human sign-off packet |

## Roll-up Algorithm

1. Generate current route, nav destination, mutation form, controller-operation,
   and schema/table inventories.
2. Require every generated row to name a product owner, disposition, packet
   child, and applicable acceptance IDs.
3. Reject nonexistent IDs, duplicate owners, overlapping active write sets, and
   packets broader than the split gate.
4. Integrate code evidence by its real tier and run shared gates once per batch.
5. Attach DB/browser/provider/deployed/human results to the same fixed revision
   pair; do not inherit proof from an older revision without impact analysis.
6. Close an old criterion only when every applicable row and its highest
   required tier pass. A parent/phase box is arithmetic, not narration.

Historical checked boxes are clues for revalidation, not automatic evidence.
