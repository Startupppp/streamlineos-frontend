# StreamlineOS final 10/10 completion PRD

Status: active
Last reconciled: 2026-09-01
Scope: all platform domains except CRM and Inventory

This is the only authoritative remaining-work checklist. Completing every unchecked acceptance criterion in the five linked tickets, with current reproducible evidence, is the condition for a truthful 10/10 result. Old reports, scores, and completed tickets are not evidence.

## Product constraints

- Preserve the architecture in [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security, or operability failure requires change.
- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations, tickets, and product decisions are excluded.
- Never mark an environment or approval gate complete from local mocks.
- Never mark a deletion complete from text search alone; require dependency evidence plus build/typecheck.
- Never solve an unbounded workflow with a silent truncation cap. Use a cursor, resumable batch, stream, or queue.
- All tenant-owned relationships and cache keys must preserve organization scope.
- No ticket depends on another ticket. Each session must rebase/re-read current source and own its verification.

## Current measured baseline

These values describe the working tree at reconciliation time and must be re-measured before sign-off:

- Legacy organization actors: 434 total; 116 CRM/Inventory excluded; 318 classified historical/display-only; 0 actionable according to the scanner.
- Offset pagination: 0 actionable; unordered offset paging: 0.
- Unbounded reads: 223 actionable instances across 105 files, 0 unclassified paths, 0 actionable offsets, and 0 unordered paging in the latest run. The gate is structurally green, but the zero-actionable target is not complete.
- Migration ledger: 579 applied rows against 579 journal entries; 0 pending and no orphan, duplicate, or unreachable entries. Migration chain, discipline, rollback, and drop-column gates pass locally; clean-bootstrap and deployed-environment proof remain open.
- OpenAPI: the last verified release gate covered 3,579/3,579 operations for exposure, responses, 4xx errors, and mutating request bodies. Re-run at final head.
- Tenant-isolation, route classification, permission-catalog, module-gate, cache-invalidation, outbox-consumer, and feature-flag gates previously passed. Re-run at final head.
- Production cells, physical replica/PITR drills, production-shaped load/cost proof, live alert acknowledgement, and compliance approvals are not proven by repository code.

The actor scanner reaching zero closes the broad legacy-actor migration count, but it does not close the specific tenant-FK and realtime-revocation defects in Ticket 01.

## Remaining independent tickets

| Ticket | Concrete failure prevented | Completion result |
|---|---|---|
| [S01 — Authority and tenant integrity](luna-10-10-sessions/S01-AUTHORITY-TENANT-INTEGRITY.md) | Cross-tenant membership references and revoked chat access remaining usable | Authority cutover is structurally tenant-safe |
| [S02 — Query bounds and read cost](luna-10-10-sessions/S02-QUERY-READ-COST.md) | Memory/DB saturation, skipped rows, N+1 cost and tenant-wide scans | Every growing read has a bounded, stable contract |
| [S03 — Repository quality and release verification](luna-10-10-sessions/S03-QUALITY-RELEASE.md) | Dead surface, contract drift, oversized mixed services and untested release behavior | Code and API gates are reproducibly green |
| [S04 — Migration and production operations](luna-10-10-sessions/S04-MIGRATION-PRODUCTION-OPS.md) | Non-rebuildable databases, shared-cell blast radius and unrecoverable incidents | The deployed platform is resilient and measured |
| [S05 — Compliance and approvals](luna-10-10-sessions/S05-COMPLIANCE-APPROVALS.md) | Uncontrolled operator access and unexercised privacy obligations | Human decisions and privacy drills are auditable |

## Verified architecture areas to preserve

The following are KEEP verdicts, not invitations for cosmetic rewrites. Their executable gates must still be rerun by Ticket 03:

- Organization and module RBAC: owner/admin/member hierarchy, module standing, permission catalog, tenant isolation, revocation cache invalidation, and owner-protection primitives exist.
- Settings and module access: access contracts and authorization-backed navigation exist.
- Billing/payments: provider abstraction, event ledger, webhook idempotency, entitlements, seat/proration ledgers, immutable invoice behavior, and transactional outbox exist.
- Home, HRMS, Payroll, Build/PM, Chat, Calendar, Notifications, Knowledge/Wiki/Chatbot, Accounting, Workflows, Inbox/mail: core module seams exist. Remaining defects are named only in the five tickets.
- Cursor pagination conversion is complete for in-scope active callers; the live gate reports zero actionable offsets.
- Legacy actor scanner reports zero actionable in-scope fields.
- Calendar attendee normalization, durable reminders, chat reaction normalization, knowledge composite tenant relations, and prior frontend decomposition tickets are implemented.
- OpenAPI generation/coverage, RLS/tenant-isolation checks, cache invalidation governance, outbox consumer registry, and route/module permission checks exist as CI gates.

## Current verification snapshot — 2026-09-01

Verified complete at the audited working tree:

- [x] Legacy actor scanner: 0 actionable, 318 display-only classifications, 116 excluded CRM/Inventory fields.
- [x] Migration ledger/chain/discipline/rollback: 579/579 applied and all four gates pass.
- [x] OpenAPI coverage: 3,579/3,579 operations have exposure, response and 4xx schemas; 1,363/1,363 mutating operations have request schemas.
- [x] Backend hard file-size gate: 3,382 files scanned, all within 500 lines with 7 registered exceptions.
- [x] Frontend type-check, route-access contract, contract drift, module manifest, dead-code classification, cycle, query-scope, SEO metadata, color-token and icon-label gates pass.
- [x] Backend permission-key, owner-authority, scope-application, record-access, module-gate/DI, route-classification, navigation, tenant-index, cache-invalidation, outbox-consumer, idempotency, feature-flag, mock-surface and drop-column gates pass.

Verified pending or failing at the same working tree:

- [ ] Backend build type-check: 177 errors across 61 production files; spec-inclusive type-check: 260 errors across 98 files.
- [ ] Backend import graph: one Payroll cycle between `reports.service.ts` and `reports-read.service.ts`.
- [ ] Tenant-isolation coverage: `recruitment-vendor-sourcing.service.ts` lacks a cross-tenant negative test.
- [ ] Membership removal policy: 28 new HR `RESTRICT` foreign keys have no ruling in `MEMBERSHIP_ARTIFACTS`.
- [ ] Frontend size ratchet: 520 files exceed 300 lines versus a baseline of 519; `hr/benefits/page.tsx` is 563 lines and breaches the 500-line hard review limit.
- [ ] Frontend capability reconciliation: 35 live hooks/types are classified `WIRE` and require a UI consumer or an explicit product-backed retirement.
- [ ] Web-vitals evidence is absent; `.browser-driver-results.json` has not been produced.
- [ ] Production cells, replica, recovery, load/headroom, live alerts, invoice-derived cost, privacy drills and named compliance approvals remain unproven.

## Final 10/10 gate

All of the following are mandatory:

- [ ] Every checkbox in Tickets S01–S05 is complete with current evidence.
- [ ] CRM and Inventory remain excluded rather than silently counted as complete.
- [ ] Backend build typecheck, spec typecheck, frontend typecheck, focused tests, representative E2E, and all architecture gates pass at one recorded commit.
- [ ] A clean database bootstraps to the current migration head and its catalog matches the expected schema.
- [ ] Production evidence proves isolated cells, replica/PITR recovery, workload SLOs with at least 40% headroom, approved unit cost, live alert delivery, and human acknowledgement.
- [ ] Security, privacy/DPO, operations, product, and finance approvals required by Ticket 05 are recorded.
- [ ] No unresolved P0/P1 finding remains.
- [ ] The release authority records the final commit, environment, evidence locations, residual accepted risks, and approval date.

Until every box above is complete, report architecture, implementation, and production readiness separately; do not average them into a misleading 10/10.
