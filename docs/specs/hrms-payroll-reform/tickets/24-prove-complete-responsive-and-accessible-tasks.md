# 24: Prove complete responsive and accessible tasks

**What to build:** Workers and operators complete affected HRMS and Payroll tasks across access, loading, error, partial and success states at required sizes and input modes.

**Blocked by:** 09 Reconcile bank returns per row; 10 Represent payout and payroll-run states honestly; 11 Make leave-to-payroll handoff durable; 12 Make accepted-hire onboarding repairable; 13 Preserve payroll-to-accounting posting; 14 Publish privacy-safe Calendar projections; 15 Deepen governed insights and AskOS provenance; 16 Correct backend and frontend cache identity; 17 Unify employee SSR and infinite-query hydration; 18 Complete Action Center decisions and navigation; 19 Bound complete queries and deepen modules; 20 Make document publication recoverable; 21 Secure export creation and downloads; 22 Govern retention and accountless document delivery

**Status:** ready-for-agent

**Program:** AP-13

**Requirements:** FR-ARCH-035

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

**Page implementation contracts:** [self-service](../18-self-service-page-ui-backend-prd.md), [HR administration](../19-hr-administration-page-ui-backend-prd.md), [Payroll](../20-payroll-page-ui-backend-prd.md), [settings and implementation](../21-supporting-page-route-disposition-prd.md), and [current-route disposition](../22-current-route-disposition-prd.md). Enforce independent HRMS and Payroll module access on every affected route and surface.

## Acceptance criteria

- [ ] **AC-ARCH-035-01:** Every affected task resolves access-loading, disabled module, denied, initial/filtered empty, loading, error/retry, partial, stale/conflict and successful populated states through shared page/state primitives.
- [ ] **AC-ARCH-035-02:** Test complete Action Center, onboarding-to-first-pay, payroll close/correction and document retrieval at 375/768/1280, light/dark, keyboard and screen reader; small-card axe tests do not close whole-journey evidence.
- [ ] **AC-ARCH-035-03:** Use semantic tokens, labelled icon controls, focus restoration, meaningful status language and accessible table/chart equivalents. Keep numeric quantities and sensitive masking understandable.
- [ ] **AC-ARCH-035-04:** Test slow/aborted network, history/back, open dialog revocation, bulk partial result and reopened record. Record actual WCAG/task-study evidence and recovery outcome.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

