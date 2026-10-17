# Build Requirement Routing Map

## Purpose

This map prevents the acceptance catalog from becoming a second work queue and
prevents packet gaps. It routes each source PRD to implementation, shared-gate,
and external-evidence packet families. A runnable packet still lists the exact
criterion IDs it advances; a file-level mapping is not completion evidence.

The baseline contains 564 open Build-module boxes and 92 open Build-sidebar
boxes. Parent, phase, census, and release boxes remain aggregation criteria.

## Build Module

| Acceptance source | Open boxes | Primary implementation packets | Aggregation/evidence owner |
|---|---:|---|---|
| `README.md` | 46 | All packet families | `BLD-X-REL-001` |
| `00-product-decisions-prd.md` | 15 | DEC, contract, migrations, cutovers | DEC and release |
| `01-route-navigation-prd.md` | 40 | ROUTE, sidebar lifecycle, route cutovers | GATE-ROUTE and PW-ROUTE/LIFECYCLE |
| `01a-canonical-route-manifest-prd.md` | 6 | CENSUS, ROUTE, route cutovers | GATE-ROUTE and release |
| `01b-route-access-persona-matrix-prd.md` | 7 | ROUTE, shared permission broker, backend slices | GATE-PERM and DB/PW denial packets |
| `02a-cross-scope-pages-prd.md` | 23 | project/workspace/product backend and frontend packets | page-family PW and release |
| `02b-project-pages-prd.md` | 13 | delivery, collaboration, quality, report, portal, settings children | page-family PW and cutovers |
| `02c-organization-page-contracts-prd.md` | 5 | FE organization packets and matching backend owners | page-family PW and release |
| `02d-scope-public-page-contracts-prd.md` | 5 | FE workspace/product/portal plus matching backend owners | PW route/a11y and provider packets |
| `02e-project-delivery-page-contracts-prd.md` | 5 | FE delivery/collaboration/issues/ticket plus matching backend owners | PW route/a11y and release |
| `02f-project-control-page-contracts-prd.md` | 6 | FE quality/report/intake/portal/settings plus matching backend owners | PW route/a11y and release |
| `03-discovery-views-pagination-prd.md` | 38 | CONTRACT, ticket/project list, FE collection children | GATE-FILTER and DB-QUERY |
| `04-ticket-workflow-prd.md` | 44 | ticket list/detail/write, bulk, workflow, issues/ticket UI | GATE-FILTER/CACHE and PW lifecycle |
| `05-forms-validation-prd.md` | 42 | CONTRACT and one FE-FORM child per mutation surface | GATE-FORM and PW lifecycle |
| `05a-form-surface-matrix-prd.md` | 10 | CENSUS and one FE-FORM child per matrix row | GATE-FORM and release |
| `06-data-performance-prd.md` | 49 | all backend resource packets, migration children | GATE-PERM/CACHE and DB-QUERY/MIG |
| `06a-backend-resource-matrix-prd.md` | 7 | CENSUS and one backend endpoint/resource child per row | backend gates and DB-QUERY |
| `06b-database-schema-matrix-prd.md` | 10 | one migration child per schema invariant/change | DB-MIG/QUERY and release |
| `07-architecture-integrations-prd.md` | 44 | shared broker, source-owned backend/frontend slices, provider children | GATE-ARCH, PROVIDER, DEPLOY |
| `08-visual-accessibility-prd.md` | 36 | shared UI owner and one FE-VISUAL child per applicable page | PW-A11Y |
| `09-competitor-parity-prd.md` | 30 | DEC and relevant feature packets; deliberate non-goals create no code packet | named product sign-off |
| `10-release-verification-prd.md` | 83 | no direct implementation; consumes all integrated packet evidence | DB/PW/PROVIDER/DEPLOY/SIGNOFF and `BLD-X-REL-001` |

## Build Sidebar

| Acceptance source | Open boxes | Primary implementation packets | Aggregation/evidence owner |
|---|---:|---|---|
| `README.md` | 5 | all SB packets | `BLD-X-REL-001` |
| `01-scope-navigation-prd.md` | 9 | SB-NAV plus matching route/page/backend packets | GATE-ROUTE and PW-ROUTE |
| `02-scope-directory-prd.md` | 15 | BE-SCOPE-DIR and SB-DIR; index changes use migration children | DB-QUERY/MIG and PW-A11Y |
| `03-contextual-actions-prd.md` | 3 | SB-ACTIONS, SB-SIGNALS, BE-PULSE/DRAFT | GATE-PERM/CACHE and PW route |
| `04-access-lifecycle-prd.md` | 5 | SB-LIFECYCLE/OFFLINE and shared permission/cache owners | PW-LIFECYCLE and DB denial |
| `05-release-verification-prd.md` | 55 | no direct implementation; sidebar-specific evidence references Build packets | DB/PW/SIGNOFF and `BLD-X-REL-001` |

## Roll-up Algorithm

1. Generate the current route, mutation, controller-operation, schema/table,
   and applicable page-state inventories.
2. Require every generated row to name at least one runnable packet and every
   runnable packet to name exact acceptance IDs.
3. Reject overlapping active write sets and packet references to a nonexistent
   acceptance ID.
4. Aggregate evidence by its real tier. Leave any criterion requiring a higher
   unrun tier open.
5. Close a source PRD only when all applicable generated rows and explicit
   non-census criteria are satisfied at their required tier.

Historical checked boxes and evidence logs are inputs to reconciliation, not
automatic proof for the reviewed revision pair.
