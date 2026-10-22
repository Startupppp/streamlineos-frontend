# HRM-11 — Release Verification and Rollout PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

HRMS ships only when customer journeys are proven with named evidence at one
reviewed frontend/backend revision pair — not when types alone pass.

## Ownership Boundary

Owns the release checklist, evidence log format, rollout gates, and rollback
notes. Child PRDs own their acceptance items.

## Revision Pair

- [ ] **HRM-11-001** record frontend git SHA and backend git SHA under test.
- [ ] **HRM-11-002** record disposable environment name for DB proofs.
- [ ] **HRM-11-003** record entitlement/plan used (FREE vs PAID module flags).

## Journey Matrix

Prove for each actor:

| Actor | Journeys |
|-------|----------|
| Self-service member | `/me` time-off (**leave + WFH**), attendance (**WFO/WFH**), expenses, documents, onboarding tasks |
| Manager | Team attendance visibility (**filter WFO/WFH**), leave + **WFH** approve, approvals inbox, team home when shipped |
| HR admin | Employees CRUD/onboard, leave policies, holidays location, documents, cases, exit initiate |
| Exec analytics | Dashboard metrics scoped correctly |
| Denied actor | Cannot read out-of-scope employees; identical not-found cross-tenant |

- [ ] **HRM-11-004** browser proof each journey row.
- [ ] **HRM-11-005** API proof tenant isolation on employees, leave, documents,
  cases.

## Automated Gates

- [ ] **HRM-11-006** focused unit/contract tests for changed HR modules (named
  paths only).
- [ ] **HRM-11-007** frontend typecheck / build for touched routes.
- [ ] **HRM-11-008** backend build + relevant e2e specs (`pnpm test:e2e` filtered).
- [ ] **HRM-11-009** `pnpm check:cycles` (and frontend feature-cycles if touched).
- [ ] **HRM-11-010** unbounded-read suite green for HRMS endpoints in scope.
- [ ] **HRM-11-011** permission catalog FE/BE drift check for touched keys.

## Data and Cache

- [ ] **HRM-11-012** migrations applied in disposable env; rollback notes
  written.
- [ ] **HRM-11-013** cache invalidation proof: onboard → list miss; terminate →
  dashboard refresh.
- [ ] **HRM-11-014** bulk partial failure proof for leave and employees.

## Navigation and Visual

- [ ] **HRM-11-015** no primary nav 404s; backHref sampling on 10 detail pages.
- [ ] **HRM-11-016** sheet vs page surface distinguishable (HRM-09 screenshots).
- [ ] **HRM-11-017** `PAGES.md` updated for MOVE/REMOVE/ADD.

## Rollout

- [ ] **HRM-11-018** feature flags for bulk actions and dual-write people model
  if risk warrants.
- [ ] **HRM-11-019** monitoring: error rate on `/hr/employees`, leave decide,
  attendance check-in.
- [ ] **HRM-11-020** rollback plan: revert flag / deploy previous revision pair;
  no partial schema left undocumented.

## Evidence Log Template

Copy per closed parent item:

```text
Item: HRM-XX-YYY
Evidence level: source | unit | database | browser | deployed
Revision pair: fe=… be=…
Proof: <command, test name, URL, or query>
Result: pass | fail | blocked
Residual risk: …
```

- [ ] **HRM-11-021** Evidence Log attached or linked for every checked parent
  workstream in README.
- [ ] **HRM-11-022** open external checks listed explicitly (providers, prod
  perf) — never silently closed.

## Program Exit

- [ ] **HRM-11-023** all README workstreams checked with evidence.
- [ ] **HRM-11-024** Phase 0 decisions closed or explicitly deferred with owner.
- [ ] **HRM-11-025** Recruitment follow-ons filed as a separate program; Payroll
  evidence closed under HRM-12 (not deferred).
