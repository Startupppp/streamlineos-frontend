# Claude master implementation prompt — Streamline Build

Use this prompt with an implementation agent working in this repository.

## Objective

Implement one approved vertical slice from `docs/build-module/implementation/16-implementation-roadmap.md`. Do not implement the whole Build program in one change. The selected slice must be complete from user interaction through authorization, persistence, cache/events, tests, browser evidence, and requirement-ledger update.

## Required reading

1. Repository `CONTEXT.md`, applicable `CLAUDE.md`, `PAGES.md`, and `frontend/UI-KIT.md`.
2. `docs/build-module/README.md` and `docs/build-module/implementation/README.md`.
3. The selected slice’s product, screen, architecture, RBAC, error, testing, migration, and ledger sections.
4. Current source files named by those documents and all call sites of the seam being changed.

## Working rules

- Reinspect the current branch; documentation counts and paths are a snapshot.
- Preserve unrelated changes. Do not recreate deleted routes or duplicate current sources of truth.
- Use the repository vocabulary: Ticket, Cycle, Project, Build member, Portal grant, Automation, Webhook delivery, Change request, Intake.
- Keep one deep module per behavior. Ticket transitions use `apply-ticket-change.ts`; project reachability uses `project-access.ts`; query keys use `frontend/lib/query-keys/build-work.ts`; route/nav behavior uses the Build registries.
- Frontend visibility is not authorization. Scope every query, cache entry, event, job, search result, export, file, and AI action.
- Cross-module concepts stay owned by CRM, Timesheets, Accounting, Home, Files, Notifications, or Integrations as specified.
- Use version/CAS and idempotency for retryable collaborative writes. External effects begin after commit through the outbox.
- Prefer additive, recoverable migrations and compatibility adapters with removal conditions.
- Treat source, unit, integration, browser, database, deployment, and production evidence as different levels.

## Before editing

Produce a short slice inventory: current routes, files, symbols, tables/migrations, endpoints/DTOs, permission keys, query keys, cache/events/jobs, tests, gaps, and authoritative sources. Map the work to `BLD-*` ledger IDs. If source contradicts the planned contract, stop that part, record the conflict, and propose the smallest decision needed; do not invent a third behavior.

## Implementation output

Deliver the user-visible slice, exact changed files, migration/recovery notes, API/wire changes, permission and reachability decisions, cache invalidation, events/jobs, tests, browser results, remaining risks, and updated ledger status/evidence. `VERIFIED` requires the evidence named in document 14; otherwise use `IMPLEMENTED` or the honest lower status.

## Mandatory negative cases

At minimum test unauthorized capability, foreign tenant, unreachable project/record, revoked access during edit, invalid input, duplicate/double submit, revision conflict, retry/idempotency, cache invalidation, dependency failure, mobile interaction, and refresh/Back/deep-link behavior. Add domain-specific negatives from the selected screen and security matrix.

## Completion gate

Do not call the slice done until the relevant route exists and is authorized, the command/query interface owns the behavior, persistence survives reload, cache/events are correct, tests pass at the required levels, browser console/network are clean for the exercised flow, tenant/role negatives pass, and the ledger links the evidence.

