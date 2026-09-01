# S03 — Repository quality and release verification

## Objective

Remove only proven dead or duplicated surface, resolve mixed-responsibility size violations, reconcile API/UI contracts, and produce one reproducible release verification record. This ticket excludes CRM and Inventory and must not change the public landing page.

## Work

- [ ] Run the full dead-code/dependency analysis in a quiescent checkout. For each candidate API, hook, component, schema, type, validator or file, prove no runtime, side-effect, dynamic-import, route, migration, worker or external consumer before deletion.
- [ ] Re-scan backend capability versus frontend routes. Implement, explicitly defer with product ownership, or remove each still-live gap, including workflow schedules/secrets/version UI, accounting bank imports/AR collections/AP vendor payments, checklist/tours, party deletion, Build team members, legacy `/me/inbox`, attendance heatmap, and recruitment SLA/availability.
- [ ] Remove dead cache-key factories and duplicated helpers only after call-graph proof; retain tenant and permission dimensions in every live key.
- [x] Run the hard file-size gate. `pnpm -C backend check:file-sizes` passes at the current workspace: 3,380 files scanned, all within 500 lines, with 7 registered exceptions. The previously oversized Build, Support, HR, and Payroll services were decomposed with targeted lint/tests where available.
- [ ] Run backend build typecheck, backend spec typecheck, frontend typecheck, import-cycle, file-size, dead-code, migration, tenant-isolation, RLS, route classification, permission catalog, module gate/DI, cache invalidation, outbox consumer, feature-flag, idempotency and mock-surface gates.
- [ ] Regenerate and validate OpenAPI at the same commit: operation exposure, request, response, 4xx error, and path-parameter coverage must be exact. Ensure CI fails on drift.
- [ ] Run representative disposable-database E2E for organization/RBAC, HRMS, Payroll, Build, Billing, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail. Security-critical behavior may not be replaced by contradictory stubs.
- [ ] Run provider/cache outage and replay scenarios: duplicate, delayed, out-of-order and forged payment webhooks; proration/seat placement failure; Ably/email/push outage; Redis loss; retry, cancellation, DLQ and recovery.
- [ ] Run authenticated accessibility/SEO tests and visual checks at 375/768/1280 px in light, dark and system themes. Keep the design-token lint gate.
- [ ] Preserve landing visuals and animations. Record the mobile landing INP result under the agreed throttle and obtain a dated product acceptance if the frozen animation budget prevents the target.
- [ ] Verify upload malware scanning/quarantine, retention and authorized release behavior.

## Exit criteria

- [ ] All listed static, type, contract and architecture gates pass at one commit.
- [ ] Full representative E2E and outage/replay matrices pass with environment identity and command output.
- [ ] No unowned API/UI capability or proven dead surface remains.
- [ ] No unjustified hard-size violation remains.
- [ ] No unresolved code-level P0/P1 finding remains.

## Audit evidence — 2026-09-01

Completed gates:

- [x] Frontend type-check, cycle, query-scope, route-access contract, contract drift, module-manifest, dead-code classification, SEO metadata, color-token and icon-label gates pass.
- [x] Backend file-size, migration chain/ledger/discipline/rollback, OpenAPI coverage, operation-ID, permission-key, owner-authority, scope-application, record-access, module-gate/DI, route-classification, navigation-permission, tenant-index, cache-invalidation, outbox-consumer, idempotency, feature-flag, mock-surface and drop-column gates pass.
- [x] OpenAPI structural coverage is exact at 3,579/3,579 operations and 1,363/1,363 mutating request bodies.
- [x] Frontend dependency analysis finds 0 dead files, 0 dead exports and 0 unclassified candidates.

Failing or incomplete gates:

- [ ] Fix 177 backend build errors across 61 production files and 260 spec-inclusive errors across 98 files; rerun both type-checks at one commit.
- [ ] Remove the Payroll import cycle `reports.service.ts -> reports-read.service.ts`.
- [ ] Restore the backend tenant-isolation coverage gate by adding a biting cross-tenant test for `recruitment-vendor-sourcing.service.ts`.
- [ ] Resolve the 28 unrated HR membership FKs so `check:restrict-fks` passes.
- [ ] Split `frontend/app/(authenticated)/hr/benefits/page.tsx` (563 lines) and return the >300-line ratchet from 520 to at most 519; continue lowering the baseline rather than accepting growth.
- [ ] Reconcile all 35 `WIRE` entries reported by `frontend check:dead-code`. Highest-risk groups are Workflow schedules/secrets/version/filter UI; Accounting bank imports, collections and vendor payments; onboarding checklists; Build team members; legacy `/me/inbox`; attendance heatmap; and recruitment SLA/availability.
- [ ] Produce `.browser-driver-results.json` and pass the web-vitals budget without changing the frozen landing visuals or animations.
- [ ] Regenerate OpenAPI and run freshness, E2E, outage/replay, accessibility/theme/viewport and malware/quarantine verification at the same recorded commit.
