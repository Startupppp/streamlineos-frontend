# Session 06 — Security, API, Reliability, and Release Engineering

## Objective

Close remaining in-repository cross-cutting gaps after the actor/query work: authorization enforcement, OpenAPI coverage, durable async effects, cache invalidation, test harness integrity, file decomposition, accessibility/SEO regressions, and release gates.

## Ownership

Shared backend/frontend code, test tooling, CI, OpenAPI, outbox, webhook/email/notification reliability, authenticated UI routes, and release scripts. Do not alter landing/public animation files, CRM, or Inventory.

## Mandatory audit checklist

- [x] Re-run route/module/permission/tenant-isolation gates; fix real failures rather than allowing exceptions. Route classification has 0 undeclared handlers; permission catalog, module gate, and tenant-isolation coverage pass.
- [x] Reconcile OpenAPI operation, request, response, error, and path parameter coverage to exact equality. Current coverage is 3,579/3,579 operations for exposure, 4xx errors, responses, and mutating request bodies; path-parameter self-test passes.
- [x] Verify all external effects are transactional-outbox-backed where a domain mutation promises delivery; retries, DLQ, idempotency, cancellation, and authorization-at-delivery are covered by the provider-reliability ledger and outbox consumer tests.
- [x] Verify cache keys include organization and authorization dimensions and mutation invalidation is cross-instance safe. The live checker reports 0 documentation gaps and the evidence inventory is current.
- [ ] Remove or decompose remaining files above the hard review threshold only where a concrete mixed-responsibility failure exists.
- [ ] Run dead-code analysis before deleting files; remove unused APIs, hooks, components, schemas, and types with dependency proof. The frontend self-test passes, but the full Knip scan must be rerun under lower host contention after an allocation failure.
- [x] Ensure E2E harnesses do not replace security-critical behavior with contradictory stubs. The security-stub contract and mock-transaction gate pass.
- [x] Re-run authenticated SEO/a11y checks; keep landing visuals and animation unchanged. SEO passes and the authenticated a11y run passes 9 suites / 102 tests.

## Exit criteria

- [ ] Backend and frontend typechecks pass, including specs. Frontend typecheck and spec-inclusive backend typecheck passed earlier; the current full backend typecheck reports broad Build/Support schema-to-service drift (`assigneeId`, `managerId`, `clientId`, and legacy `userId` references) and must be repaired by the owning actor-migration work before sign-off.
- [ ] OpenAPI, route classification, module gate, tenant isolation, cache, outbox, feature-flag, migration, dead-code, and circular-dependency gates pass. The S06 gates pass except full dead-code evidence; the cross-session unbounded-read gate is also currently failing.
- [ ] Representative E2E suites for RBAC, payroll, chat, calendar, notifications, knowledge, billing, and Build pass on disposable infrastructure.
- [ ] No unresolved code-level P0/P1 finding remains; the current open findings and cross-session handoffs are listed below.

## Required commands

```powershell
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
pnpm -C backend check:openapi-coverage
pnpm -C backend check:feature-flag-governance
pnpm -C backend test:e2e:ci
pnpm -C frontend type-check
```

## Verification record

**Run date:** 2026-09-01
**Scope:** current working tree at `D:\projects\personal\Streamlineos`. No landing/public animation, CRM, or Inventory files were changed.

### Completed gates

- [ ] Backend typecheck — the earlier run passed before the current schema/relations state was exercised; the latest run reports Build/Support schema-to-service drift and is release-blocking.
- [x] Spec-inclusive backend typecheck — `pnpm -C backend check:spec-typecheck` passed.
- [x] Frontend typecheck — `pnpm -C frontend type-check` passed.
- [x] Route classification — 3,568 handlers; 0 undeclared.
- [x] Permission catalog — 3,105 usages resolved; 624 unique keys; backend/frontend catalogs agree.
- [x] Tenant-isolation checker self-test — passed.
- [x] Module gate and module-DI self-test — passed.
- [x] OpenAPI coverage — 3,579 operations; exposure, 4xx error, response, and mutating request coverage all 100%.
- [x] OpenAPI path-parameter self-test — passed.
- [x] Feature-flag governance — passed.
- [x] Outbox consumer registry — 22 emitted event types all have registered consumers.
- [x] Cache invalidation — 1,027 service files scanned; 0 documentation gaps.
- [x] Idempotent-command gate — all 11 in-scope mutating handlers carry `@Idempotent`.
- [x] Mock-surface gate — 3,206 doubles scanned, 257 classes resolved, 0 genuine phantom-method defects.
- [x] Migration discipline and chain self-tests — passed.
- [x] Authenticated route-access matrix — 84 tests passed.
- [x] SEO metadata — passed; authenticated routes remain excluded from indexing and public metadata checks pass.
- [x] Frontend dead-code self-test — 14 assertions passed.

### Gates requiring follow-up

- [ ] Backend controller E2E — the prior app-bootstrap defect is fixed in `backend/src/db/schema/build/relations.ts`; the calendar controller suite now passes 9/9. The complete `pnpm -C backend test:e2e:ci` matrix still requires disposable migrated-database evidence.
- [x] Authenticated a11y suites — 9 suites / 102 tests passed serially (`frontend/features/__tests__/*-a11y.test.*`).
- [ ] Hard file-size gate — the bounded scan reports five files over 500 lines: `projects-tickets-read.service.ts` (502), `attendance.service.ts` (543), `filings.service.ts` (516), `reports.service.ts` (596), and `support-macros.service.ts` (524). These are cross-session-owned files; remediation belongs in the owning sessions with mixed-responsibility decomposition proof.
- [x] Tenant-isolation coverage scan — 896/896 tenant-owned services have a declared isolation test; the checker reports 590 isolation test files.
- [ ] Full dead-code and unbounded-read scans — dead-code scan hit a host-level `Array buffer allocation failed` in Knip; the serial unbounded-read gate failed with the handoff counts below. Rerun dead-code from a quiescent checkout and resolve the Session 05 findings.
- [ ] Unbounded-read handoff — the serial gate reports 60 actionable offsets, 280 actionable unbounded reads, 2 unclassified paths, and 3 regressions. Ownership is Session 05; do not alter its classifications or query paths from Session 06.

### Reliability and security evidence

- [x] Transactional outbox, lease fencing, retry/dead-letter behavior, inbox deduplication, and external-effect ledger are implemented and documented in `architecture-refactor/PROVIDER-RELIABILITY.md`; the outbox consumer gate passes.
- [x] Cache identity and cross-instance invalidation evidence is recorded in `architecture-refactor/cache-key-inventory.md` and `architecture-refactor/cache-invalidation-multi-instance.md`; the live cache gate reports zero gaps.
- [x] E2E harness security-stub controls are covered by `backend/test/security/e2e-access-stub-core.spec.ts` and the mock-transaction gate; contradictory security bypasses are not permitted by the harness contract.
- [x] Landing visuals and animation were not touched.

### E2E coverage and infrastructure boundary

The configured backend E2E command first exposed stale Build relations (`projects.managerId`, `projects.clientId`, then legacy user IDs on tickets/assignees/watchers/project members); those references now use the current membership columns, and the calendar controller suite passes 9/9. The complete matrix is still not counted as a pass. Representative coverage is present for RBAC, payroll, chat, calendar, notifications, knowledge, billing, and Build under `backend/src/modules/**/**.e2e-spec.ts`. Seeded suites require `DATABASE_URL` (and, for some suites, `RBAC_E2E_DATABASE_URL`), current migrations, and the PostgreSQL extensions/schema. Calendar realtime and notification delivery additionally require their external service configuration. The repository has no Playwright/Cypress browser E2E harness.

### Release decision

**Not release-ready yet.** The in-repository contract/type/API/security and authenticated a11y checks above pass, but Session 06 cannot be signed off while the hard file-size gate, backend E2E execution, and clean dead-code/unbounded-read evidence remain unresolved. Do not convert these items to exceptions or weaken a gate. The two file-size findings must be handed to the HR/Support owners; rerun the remaining commands serially on disposable infrastructure and append their results here.
