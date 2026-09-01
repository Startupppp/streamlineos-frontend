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
