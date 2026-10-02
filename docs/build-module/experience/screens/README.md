# Detailed screen specifications

Status: Planned

These screen contracts supplement the overview catalog. The route decision table is authoritative for destinations; the shared screen contract defines common interaction, authorization, query, cache, and state behavior. Each route section supplies its exact fields, filters, actions, and lifecycle.

## Read in this order

1. [Shared screen contract](./shared-screen-contract.md)
2. [Activation journeys](./activation.md)
3. [Projects](./projects.md)
4. [Daily work](./daily-work.md)
5. [Product discovery](./product-discovery.md)
6. [Planning](./planning.md)
7. [Client delivery](./client-delivery.md)
8. [Collaboration](./collaboration.md)
9. [Quality](./quality.md)
10. [Reporting](./reporting.md)
11. [Settings](./settings.md)
12. [Routes and decisions](../routes-and-screen-decisions.md)
13. [External client portal](./external-client-portal.md)

Persona is a default configuration, not an access role. Every screen is governed by effective access. A target endpoint in these contracts is a proposed wire contract, not a claim that it is currently implemented.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Map every route section below to the authoritative route decision row, existing physical page, owning API contract, and requirement/work-package ID before coding.
- [ ] Apply the shared opening, FilterEnvelope v1, permission, cache, state, and mobile contracts to every screen; record each explicit route-specific override beside its screen.
- [ ] Keep proposed endpoint examples separate from current OpenAPI operations; reject duplicate controllers introduced solely from a browser route name.
- [ ] Verify every screen family has populated, empty, filtered-empty, denied, failed, direct-link/refresh, keyboard, mobile, persisted-action, and cross-tenant evidence before closing its checklist.
