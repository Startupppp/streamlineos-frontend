# Build implementation contract

Status: Current source snapshot plus Planned target behavior
Snapshot date: 2026-10-02 (Asia/Calcutta)
Audience: implementation agents, reviewers, QA, security, product, and operations

## Purpose

This directory translates the canonical Build product specification into a source-aware implementation contract. It does not redefine product behavior already owned by `product/`, `onboarding/`, `experience/`, `architecture/`, `integrations/`, `governance/`, or `delivery/`. Each numbered document either records current source evidence or points to the one canonical decision document and adds the implementation details that were previously missing.

Truth vocabulary is fixed across this pack:

- **Current verified**: demonstrated on the current revision with the stated runtime evidence.
- **Current unverified**: present in current source or prior evidence but not demonstrated end to end on the current revision.
- **Planned**: accepted target behavior still requiring implementation and verification.
- **Conditional**: available only under an explicit plan, permission, module, integration, or flag condition.
- **Deferred**: intentionally excluded from the current delivery sequence.

Source presence is **Current unverified** until browser, database, role, tenant, deployment, and operational evidence closes the relevant requirement.

## Reading order

Product behavior is not repeated in this directory. Read the existing authorities first:

1. [Product vision and decisions](../product/00-product-vision-and-decisions.md)
2. [Signup and multi-module onboarding](../onboarding/01-signup-and-multi-module-onboarding.md)
3. [Personas, navigation, and sidebars](../experience/02-personas-navigation-and-sidebars.md)
4. [Route decisions](../experience/routes-and-screen-decisions.md) and [detailed screens](../experience/screens/README.md)
5. [Work surfaces and ticket detail](../experience/04-work-surfaces-and-ticket-detail.md)

Then use the source-aware implementation contracts:

1. [Current-state audit](./00-current-state-audit.md)
2. [Domain model and database schema](./06-domain-model-and-database-schema.md)
3. [API and backend contracts](./07-api-and-backend-contracts.md)
4. [Frontend architecture and files](./08-frontend-architecture-and-file-structure.md)
5. [Component and design-system contract](./09-component-and-design-system-contract.md)
6. [Cache, rate limit, and performance](./10-cache-rate-limit-and-performance.md)
7. [Events, jobs, notifications, and integrations](./11-events-jobs-notifications-and-integrations.md)
8. [Security, tenant isolation, and RBAC](./12-security-tenant-isolation-and-rbac.md)
9. [Validation, errors, and failure states](./13-validation-errors-and-failure-states.md)
10. [Testing and browser verification](./14-testing-browser-verification-and-acceptance.md)
11. [Migration, cleanup, and reuse](./15-migration-cleanup-and-reuse-plan.md)
12. [Vertical implementation roadmap](./16-implementation-roadmap.md)
13. [Agent coordination and work ownership](./17-agent-coordination-and-work-ownership.md)
14. [Architecture work-package registry](./18-architecture-work-package-registry.md)
15. [Complete surface behavior matrix](./19-complete-surface-behavior-matrix.md)
16. [Active and completed work claims](./WORK-CLAIMS.md)
17. [Requirement ledger](./REQUIREMENT-LEDGER.md)

## Canonical registry

| Concept | Canonical location | Rule |
|---|---|---|
| Domain vocabulary | `CONTEXT.md` | Use Ticket, Cycle, Project, Build member, Portal grant, Automation, Webhook delivery, Change request, and Intake exactly as defined. |
| Product decisions | `docs/build-module/product/00-product-vision-and-decisions.md` | Product scope and priorities are changed here first. |
| Signup/onboarding | `docs/build-module/onboarding/01-signup-and-multi-module-onboarding.md` | One durable activation session and three visible steps. |
| Routes | `frontend/lib/build/build-route-manifest.ts` plus `experience/routes-and-screen-decisions.md` | Source lists current pages; decision catalog owns keep/consolidate/move behavior. |
| Navigation | `frontend/lib/build/build-nav-model.ts` and `frontend/lib/build/nav/*` | One permission-filtered navigation model. |
| Permissions | backend access catalog and `governance/rbac/01-role-model-and-open-risks.md` | Never parse or invent permission keys in a feature. |
| Query keys | `frontend/lib/query-keys/build-work.ts` | Hooks consume the central factory; no literal feature-local keys. |
| Filter schema | `experience/06-ui-component-and-filter-system.md` | `FilterEnvelope` version 1 is the sole wire grammar. |
| Ticket mutation | `backend/src/modules/build/core/tickets/apply-ticket-change.ts` | UI, bulk, import, AI, and automation converge here. |
| Project reachability | `backend/src/modules/build/core/project-crud/project-access.ts` | Capability does not imply record reachability. |
| Build composition | `backend/src/modules/build/build.module.ts` | Existing submodules are registered here. |
| Build schema | `backend/src/db/schema/build/index.ts` and sibling schema files | Reuse existing tables; migrations are the only production schema mutation path. |
| Cache | `backend/src/common/cache/cache.service.ts`, `frontend/lib/query-keys/build-work.ts` | Every key carries tenant and relevant actor/record scope. |
| Rate limits | `backend/src/common/ratelimit/rate-limit.service.ts` | Unknown tiers fail closed; public writes and expensive/provider actions require named tiers. |
| Events/outbox | `backend/src/common/outbox/*` | Transactional event write, idempotent consumer, observable retry. |
| Components | `frontend/UI-KIT.md` and `experience/06-ui-component-and-filter-system.md` | Reuse the UI kit; feature wrappers own Build semantics only. |
| Screens | `experience/screens/*.md` | Exact fields, filters, actions, states, mobile behavior, and acceptance live here. |
| Architecture ownership | `architecture/08-deep-module-reconciliation.md` | One accepted owner per behavior and a mandatory dependency order. |
| Work packages | `implementation/18-architecture-work-package-registry.md` | Agents claim one package and do not redesign another package's primary seam. |
| Work claims | `implementation/WORK-CLAIMS.md` | Active ownership, branch/worktree, base revision, paths, dependencies, status, and handoff. |
| Cross-cutting record behavior | `implementation/19-complete-surface-behavior-matrix.md` | Every record family must adopt, reject, or explicitly defer every universal behavior. |

## Conflict order

Current source wins for claims about what exists. Accepted ADRs and repository instructions win for architectural invariants. Canonical Build product documents win for intended behavior. Historical research is evidence and input, never implementation authority. A conflict is recorded in the requirement ledger instead of silently choosing a third behavior.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Publish the canonical reading order, truth vocabulary, authority registry, and conflict order for this implementation pack; compare the dated document census in the [validation report](../audit/validation-report.md).
- [ ] Refresh current-source claims and link targets when routes, schemas, or accepted ADRs change; resolve conflicts through the [requirement ledger](REQUIREMENT-LEDGER.md).
- [ ] Confirm each implementation slice uses the listed canonical owner for routes, permissions, filters, components, events, and screen behavior.
- [ ] Keep runtime claims open until current browser, role/tenant, persistence, deployment, and operations evidence is attached.
