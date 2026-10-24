# 15: Deepen governed insights and AskOS provenance

**What to build:** Charts, reports and AskOS agree on authorized facts, coverage, period, source version and explanation.

**Blocked by:** 02 Secure and align People insights; 03 Enforce sensitive reads and rapid revocation; 04 Unify identity, Employment Facts and payroll eligibility; 11 Make leave-to-payroll handoff durable

**Status:** ready-for-agent

**Program:** AP-08

**Requirements:** FR-ARCH-022, FR-ARCH-023

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-022-01:** One owner module defines each metric and exposes typed period/scope/unit/coverage/source-version projection. Charts render that meaning; client code and AskOS do not rederive financial or headcount policy.
- [ ] **AC-ARCH-022-02:** Use metric-specific drill-through schemas rather than unbounded generic records. Drill/export use the same cohort predicate, field sensitivity, grain and source snapshot as the summary.
- [ ] **AC-ARCH-022-03:** Test stale/unavailable versus zero, small cohort privacy, inconsistent periods, selected department and changed source status. Preserve signed metric definitions and totals.
- [ ] **AC-ARCH-022-04:** Prefer existing authorized read modules; introduce an adapter seam only for real caller/transport variation and retain the interface as the test surface.
- [ ] **AC-ARCH-023-01:** AskOS tools call actor-scoped owner read interfaces instead of duplicating HR/payroll SQL semantics. Apply tenant/object/field access in retrieval before provider use; AI does not decide authorization.
- [ ] **AC-ARCH-023-02:** Use only effective applicable policy versions; disclose incomplete/top-N retrieval and cite the specific sources used for each supported claim. A newest-ten policy list and citations to every supplied item do not establish completeness.
- [ ] **AC-ARCH-023-03:** Preserve bounded prompts, gateway-failure/no-fabrication behavior, atomic credit reserve/refund and read-only draft tools. High-impact actions use explicit human approval through the owning command.
- [ ] **AC-ARCH-023-04:** Treat attrition scope inconsistency as conditional while analytics is non-scopable; verify catalog/legacy grants before changing severity. Test denied content, revoked actor, empty corpus, stale policy, incorrect ID, uncertain answer and provenance.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

