# S10 — Excluded-domain isolation coverage, dead code & final verification

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §22, §23 and §28.18.

## Mission

Close the tenant-isolation gate for the two excluded domains without changing their behaviour, remove genuinely dead code with real proof, and produce the single authoritative verification matrix for the whole programme.

## Exclusive file ownership

```
backend/src/modules/crm/**/*.spec.ts        backend/src/modules/inventory/**/*.spec.ts
backend/src/modules/leads/**/*.spec.ts      backend/src/modules/deals/**/*.spec.ts
backend/src/modules/clients/**/*.spec.ts    backend/src/modules/contacts/**/*.spec.ts
backend/src/modules/sales/**/*.spec.ts      backend/src/modules/party/**/*.spec.ts
backend/src/modules/careers/**/*.spec.ts    backend/src/modules/customer-executive/**/*.spec.ts
architecture-refactor/session-tickets/reports/**
architecture-refactor/FINAL-VERIFICATION.md
```

Plus, for the dead-code sweep only, you may delete files anywhere **once every deletion condition in §COMMON 9 is met and you have recorded the proof**. Deleting a file another session is actively editing is the one real hazard here — if a session's report is not yet present, treat its trees as live and defer.

## Hard scope rule

**CRM and Inventory are EXCLUDED domains.** They must not be behaviourally redesigned. Adding tests is explicitly permitted and is most of this ticket. You must not change a single line of production source in those trees.

If a test reveals a real tenant-isolation defect there: **do not fix it.** Record it under `REAL DEFECTS FOUND` with file, line and the failing assertion, and write the test with `it.failing(...)` so the suite stays green while the defect stays visible for its owners. These findings are the most valuable output of this ticket.

## Work items

### 1. Excluded-domain isolation coverage
The tenant-isolation gate counts **all** tenant-owned services, including CRM and Inventory, so the gate cannot reach zero without them. Baseline: 154/783 covered, 629 uncovered.

- [ ] Bucket B06 — Inventory (45) + Cron (19; cron belongs to S08, skip it here). Inventory: 45 services.
- [ ] Bucket B07 — CRM (33), Leads (11), Deals (9), Clients (4), Contacts (1), Sales (3), Party (4), Careers (1), Customer-Executive (1). 66 services. *Careers is HRMS-owned in the PRD but its specs live in this bucket — coordinate with S02 if it has already covered them; duplicate coverage is harmless, a duplicate filename is not.*
- [ ] Use the canonical template at `.superpowers/sdd/prd-in-scope/isolation-test-template.md` (derived from real passing specs in this repo). Do not invent a different pattern.
- [ ] The gate counts a spec as covering a service when it (a) references the service class name as a word-boundary match **or** its relative path as a string literal, **and** (b) contains one of: `cross-tenant`, `tenant isolation`, `different org`, `other org`, `org isolation`, `bola`, `cross-org`, `isolation`, `inaccessible`, `forbidden.*org`, `wrong.*org` (case-insensitive).
- [ ] **Do not game that rule.** Every test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row. The control is what proves the test can fail — without it, a service that returns nothing for every input passes vacuously.
- [ ] Inventory stock posting is transaction-heavy: a `db.transaction` mock **must invoke its callback** or every assertion inside it is silently void. This will bite repeatedly.
- [ ] For import/connector services (`crm-import.service.ts` 1,234 lines, `crm-connector.service.ts` 757), the assertion is that the org predicate reaches every query and that an external-id lookup cannot resolve another org's row.
- [ ] Name files `*.spec.ts` — never `*.e2e-spec.ts`, which are excluded from the default run and would be coverage that never executes.
- [ ] Work in batches of ~10 services, run jest on just those, fix, continue.

### 2. Dead-code sweep (§22)
- [x] Run `pnpm exec knip --no-progress` in both repos. Baseline was backend 0 / frontend 5. DONE: L52-report ran knip in both repos. Backend: 20 unused files (12 schema KEEP, 4 untracked new WIP, 1 admission barrel false-positive, 1 notification-catalog DEFER, 1 dashboard-hr DEFER, 1 email-calendar REMOVED, 1 payroll-encryption DEFER). Frontend: 4→0 unused files (removed by earlier lanes). gate: check:dead-code PASS (L33-report, L24-report).
- [x] Confirm or remove the reported frontend **4 unused files, 49 unused exports, 21 unused exported types** — coordinate with S09, which owns most of that tree. DONE: all 4 frontend files removed by earlier lanes (confirmed 0 unused files); exports/types retained with recorded justifications. L52-report.
- [x] **grep is not proof.** A bare `import "./x";` side-effect import is invisible to from-based scanners, as are dynamic `import()` and re-export chains. ACKNOWLEDGED in L52-report; knip used with module-graph analysis.
- [x] **Knip alone NEVER authorizes deleting a schema file.** APPLIED: all 12 backend schema files flagged by knip retained with recorded reasons (hrms-phase1-sql-managed design, hiring split WIP). L52-report.
- [x] **Emptiness is not deadness.** A table with zero rows is usually unseeded. APPLIED: no tables deleted on emptiness grounds. L52-report.
- [x] Every deletion needs: module-graph proof · public/extension contract check · schema symbol + raw table name + migration + FK check · and a passing `nest build` / `next build` afterwards. APPLIED for 1 deletion: `email/templates/calendar.ts` — zero importers confirmed by grep and knip module graph, last touched 8 weeks ago. L52-report.
- [x] **Never prune the `build` directory** — that is the Build module, not an output folder. APPLIED: no files deleted from `build/**`. L52-report.
- [x] Record every deletion with its proof in your report. DONE: L52-report records 1 deletion with full proof.

### 3. Final verification matrix (§28.18)
- [ ] Run every gate and attach verbatim output to `architecture-refactor/FINAL-VERIFICATION.md`, one row per line below. Run this **after** the other sessions have reported; if some have not, record their rows as OPEN with the reason rather than guessing.

| Gate | Command | Required |
|---|---|---|
| Working tree | `git status` in both repos | only intended changes |
| TypeScript | `pnpm typecheck` (backend), `pnpm type-check` (frontend) | zero errors |
| Build | `pnpm build` in both | succeeds |
| Imports | `pnpm check:cycles` in both | zero cycles |
| Backend routes | `check:route-classification` | zero undeclared |
| Permissions | `check:permission-keys` | zero drift |
| Route access | `check:route-access-contract` | every route resolves |
| Tenant indexes | `check:tenant-indexes` | zero missing |
| Scope/BOLA | `check:scope-application`, `check:record-access` | complete |
| Isolation | `check:tenant-isolation` | **zero uncovered** |
| Placement | `check:placement-bypass` | zero unallowlisted |
| RBAC integrity | `verify:rbac-integrity` | 10/10 |
| Owner authority | `check:owner-authority` | pass |
| Idempotency | `check:idempotent-commands` | pass |
| Async | `check:outbox-consumers` | zero orphans or recorded decisions |
| Migrations | `check:migration-chain` | zero gaps; cold == upgrade |
| OpenAPI | `openapi:check`, `check:contract-vendor` | current, synchronized, complete |
| Contract drift | `check:contract-drift` | zero unapproved |
| Secrets | `check:log-secrets` | pass |
| Frontend gates | `check:routes`, `check:query-scope`, `check:formatters`, `check:empty-states`, `check:effect-fetches`, `check:icon-labels`, `check:client-pages`, `check:module-manifest`, `verify:server-data-seam` | pass |
| Dead code | `check:dead-code`, knip | zero confirmed |
| Tests | full jest, both repos | green |
| Structure | files >500 lines | split or recorded exception |
| Recovery / Load / Cost | S08 runbooks | **OPEN — operator-blocked** |

- [ ] **Shard the test suite if workers get killed:** sequential `--shard` passes at `--maxWorkers=2`, and grep `^FAIL`. Note that `*e2e-spec` files run only under `pnpm test:e2e`.
- [ ] **Rate limits make the e2e suite non-repeatable** — a 5/hour tier drains across runs, so one pass/fail count is a floor, not a measurement. Note this where it applies rather than reporting a false failure.
- [ ] `DEV_LIMIT_MULTIPLIER` makes every rate-limit tier 10× outside production — use `effectiveRateLimit(tier)` when asserting.

### 4. Consolidated programme report
- [ ] Read every `reports/S0X-report.md` and produce the consolidated status: per-module architecture and implementation rating with evidence, every OPEN item with its owner and reason, and every `NEW FINDINGS` entry across all sessions.
- [ ] State the honest verdict. Per §28.19, no module reaches 10/10 while it has an open P0/P1, a failing mandatory gate, an unresolved tenant boundary, unapproved contract drift or missing operational evidence — and operator-blocked infrastructure keeps production readiness below 10/10 until the real resource and evidence exist. Do not average a weak module away.

## Validation (run once, at the end)

The matrix above **is** your validation. Attach verbatim output; never report an unrun or failing check as passing.

## Definition of done

CRM and Inventory isolation coverage is complete with tests that genuinely bite and zero production-source changes in those trees; every real defect found there is recorded for its owners; every deletion carries recorded graph + build proof; `FINAL-VERIFICATION.md` has verbatim output for every applicable row; and the consolidated report states the honest per-module verdict with operator-blocked rows recorded as OPEN.

Report to `architecture-refactor/session-tickets/reports/S10-report.md`.
