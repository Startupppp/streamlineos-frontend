# Current-product gap routing map

**Status:** Navigation and evidence note. Open tasks remain in the linked PRDs.
**Authority:** The target-state PRDs in this folder control product behavior; the former HRM acceptance files retain unfinished implementation and verification tasks.

The earlier execution pack has been moved here intact because its files still contain open TODOs. This map points to those tasks once, without copying their checkboxes into a second queue. In a conflict, resolve the item against the current domain PRD and record the migration decision; do not mark it complete merely because a page or code path exists.

| Current work | Open acceptance source | Target contract |
|---|---|---|
| Ownership, canonical routes, page inventory, sidebar and access | [Decisions](./00-product-decisions-prd.md), [routes](./01-route-navigation-prd.md), [pages](./02-page-inventory-prd.md), [sidebar](./03-sidebar-ia-prd.md) | [Domain contracts](./00a-suite-domain-contracts-prd.md), [page manifest](./07a-page-permission-manifest-prd.md) |
| Search, views, bulk actions and form parity | [Discovery](./04-discovery-filters-views-prd.md), [bulk actions](./05-cards-bulk-actions-prd.md), [forms](./06-forms-validation-prd.md) | [Experience](./07b-experience-content-quality-prd.md) |
| Data, architecture and visual quality | [Data](./07-data-performance-prd.md), [architecture](./08-architecture-prd.md), [visual](./09-visual-hierarchy-prd.md) | [Platform](./06-platform-intelligence-compliance-prd.md), [experience](./07b-experience-content-quality-prd.md) |
| Parity and release proof | [Competitive acceptance](./10-competitor-parity-prd.md), [release verification](./11-release-verification-prd.md) | [Competitive priorities](./08-competitive-coverage-release-prd.md), [release evidence](./06a-operations-release-evidence-prd.md) |
| Payroll and work location | [Payroll acceptance](./12-payroll-prd.md), [WFH/WFO acceptance](./13-wfh-wfo-prd.md) | [India Payroll](./05-india-payroll-prd.md), [Workforce](./02-workforce-management-prd.md) |
| Per-page coverage | [Catalog index](./14-page-catalog-readme.md) and its linked page files | [Page and permission manifest](./07a-page-permission-manifest-prd.md) |
| Reporting managers | [Manager onboarding and review](./15-reporting-manager-onboarding-prd.md) | [Core HR](./01-core-hr-lifecycle-prd.md) |

## Code-present items previously left unchecked

These page-level source findings remove the need for another TODO that merely says to create the page. Their behavior and release gates remain in the linked acceptance PRDs.

| Former request | Source evidence |
|---|---|
| Manager team page | frontend/app/(authenticated)/me/team/page.tsx |
| Payroll setup page and loading/error routes | frontend/app/(authenticated)/payroll/setup/ |
| Reporting-manager policy, correction, bulk change and onboarding surfaces | backend/src/modules/directory/reporting-manager-policy.service.ts and frontend/features/hr/reporting-managers/ |

No checked status is inferred for a larger journey from these source findings.


## Architecture review execution routing (2026-10-24)

The preserved [architecture HTML](./architecture-review/2026-10-24-architecture-review.html)
is fully mapped into [PRD 16](./16-architecture-hardening-prd.md): 40 additive
requirements and 158 atomic acceptance criteria. Use [guide 17](./17-claude-architecture-execution.md)
for implementation/resume and the [ledger](./architecture-review/execution-ledger.json)
for status. Its programs are planning groups; dispatch exact outcome children,
not a whole domain/folder. Existing legacy snapshot counts and open criteria
remain historical acceptance sources and are not silently replaced or marked complete.
The [coverage map](./architecture-review/html-prd-coverage.json) preserves all
268 semantic report points, including source evidence and caveats. A passing
document validator is not implementation or release evidence.
