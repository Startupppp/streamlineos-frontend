# Streamline Build: product context and remaining work

Build is StreamlineOS's permission-aware work and delivery module. It connects a request or customer signal to triage, scoped work, planning, execution, quality, release, client review, and the commercial handoff. Build owns projects, work items, delivery records, and their links. CRM owns customer records; Timesheets owns time; Accounting owns invoices and payments. Build opens those owners with context instead of duplicating their records.

This is the entry point for anyone implementing or verifying Build. The detailed contracts and all still-open acceptance criteria live below this folder. A checked source task in an older report never proves a browser journey, a database migration, a permission boundary, or a deployment.

## What the module covers

| Area | Purpose | Detailed contract |
|---|---|---|
| Activation and access | Signup, organization and module setup, invitations, Build standing, roles, client grants | [Onboarding](onboarding/01-signup-and-multi-module-onboarding.md), [RBAC](governance/rbac/README.md) |
| Scope and navigation | Organization, managed product, project, sidebar, search, pins, recent scopes, My Work and Inbox | [Navigation](experience/02-personas-navigation-and-sidebars.md), [route decisions](experience/routes-and-screen-decisions.md), [sidebar acceptance](acceptance/sidebar/README.md) |
| Project delivery | Project setup, tickets and bugs, boards, lists, detail, bulk actions, workflows, cycles, epics, milestones, releases and dependencies | [Work surfaces](experience/04-work-surfaces-and-ticket-detail.md), [ticket acceptance](acceptance/module/04-ticket-workflow-prd.md) |
| Intake and discovery | Forms, submissions, triage, feedback, search, filters, saved views, sorting and pagination | [Page catalog](experience/05-page-catalog-and-flows.md), [discovery acceptance](acceptance/module/03-discovery-views-pagination-prd.md), [forms acceptance](acceptance/module/05-forms-validation-prd.md) |
| Coordination and governance | Comments, files, updates, goals, risks, decisions, approvals, budgets, client portal, notifications and automation | [Screen catalog](experience/screens/README.md), [integration ownership](integrations/08-cross-module-client-content-commercial.md) |
| Reporting and operations | Dashboards, workload, quality, analytics, reports, exports, audit, jobs, cache and performance | [Screen catalog](experience/screens/README.md), [data acceptance](acceptance/module/06-data-performance-prd.md) |
| Experience | Responsive web, empty/loading/error/denied states, keyboard behavior, accessibility and consistent UI components | [Shared screen contract](experience/screens/shared-screen-contract.md), [visual acceptance](acceptance/module/08-visual-accessibility-prd.md) |

The product supports solo users, agencies, and larger organizations. Software delivery is the primary workflow; templates and custom fields adapt it to other work. Desktop and responsive mobile web are in scope. External client access is granted per authorized relationship and publication state. Server-side permission and tenant checks govern every read and write.

## What is implemented and what remains

The repository contains a broad Build implementation: frontend routes and feature surfaces, backend controllers and services, a Build schema, navigation and permission catalogs, and focused tests. The [current-state audit](implementation/00-current-state-audit.md) and [requirement ledger](implementation/REQUIREMENT-LEDGER.md) map these source surfaces. Their source and test results are bounded evidence; the detailed acceptance documents retain unchecked criteria wherever the complete behavior or required proof is still open.

The main remaining work is grouped here so a new implementer can find it without reading historical handoff reports:

1. **Exact behavior and contract gaps:** complete the unchecked route, page, form, ticket, sidebar, permission, API, schema, cache, event, and cross-module criteria in the [Build acceptance catalog](acceptance/module/README.md) and [sidebar catalog](acceptance/sidebar/README.md). Recheck each finding against current code before changing it.
2. **Browser and responsive journeys:** test real navigation, create/edit flows, drafts and Inbox, ticket detail, filters, empty/error states, client portal, keyboard use, and mobile layouts using the roles and data required by each criterion.
3. **Authorization and persistence:** demonstrate allowed and denied actors, cross-tenant and cross-project negatives, invitation and grant lifecycle, transaction/replay behavior, cache invalidation, migration application and recovery on an appropriate test database.
4. **Release evidence:** verify deployed revision parity, provider/worker effects, monitoring, performance, accessibility, rollback and operational behavior. The [release acceptance](acceptance/module/10-release-verification-prd.md) and [sidebar release acceptance](acceptance/sidebar/05-release-verification-prd.md) stay open until their named evidence exists.

An unchecked box means that its *whole stated criterion* is pending. It does not necessarily mean its UI or service is absent. Implement only the missing part, then attach evidence at the required tier. Do not turn route presence, screenshots, source review, mocks, or focused tests into a claim of deployed or end-to-end completion.

## Where to start

- [Product decisions](product/00-product-vision-and-decisions.md) and [architecture ownership](architecture/08-deep-module-reconciliation.md) define the accepted model and seams.
- [Detailed screens](experience/screens/README.md), [route decisions](experience/routes-and-screen-decisions.md), and [screen data contracts](architecture/screen-data-contracts.md) define user behavior.
- [Implementation contract](implementation/README.md), [requirement ledger](implementation/REQUIREMENT-LEDGER.md), and [work claims](implementation/WORK-CLAIMS.md) identify code owners, dependencies, and evidence boundaries.
- [Build acceptance catalog](acceptance/module/README.md) and [sidebar acceptance catalog](acceptance/sidebar/README.md) contain the pending criteria relocated from the former `docs/specs/build` folder.
- [Browser and acceptance method](implementation/14-testing-browser-verification-and-acceptance.md) describes what counts as verification. Historical audit material remains under `audit/` only where it supports an open criterion.

## Evidence rule

Close a criterion only against its exact wording and a named frontend/backend revision, actor and tenant, initial state, observed action, persisted or external effect when applicable, and relevant negative case. Keep source, focused test, browser, database, provider, deployment, and human evidence distinct. Product decisions and historic research describe intended behavior; current code and observed runtime establish current state.
## Delivery checklist

- [ ] Every open Build and sidebar acceptance criterion is satisfied at its stated evidence tier.
- [ ] Browser, database, role, tenant, provider, deployment, and operational release evidence is recorded for the sellable scope.
