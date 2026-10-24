# 18: Complete Action Center decisions and navigation

**What to build:** Approvers can act on current items, recover partial results, see reopened work and share a reliable filtered view.

**Blocked by:** 07 Protect input-period transitions and corrections; 16 Correct backend and frontend cache identity; 17 Unify employee SSR and infinite-query hydration

**Status:** ready-for-agent

**Program:** AP-10

**Requirements:** FR-ARCH-027, FR-ARCH-028, FR-ARCH-029

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-027-01:** Each of the five actual queue sources owns read, permission, normalized item, decision and cache effect; the queue interface composes source states and payroll cutoff without duplicating domain writes.
- [ ] **AC-ARCH-027-02:** Represent partial outage, denied source, unassigned approver, reassignment/delegation and stale cutoff honestly; source denial never means the complete queue is empty.
- [ ] **AC-ARCH-027-03:** Bulk decisions return per-item success/conflict/failure and retry safely. Reopened or changed records with the same ID reappear; mounted dismissed-ID state cannot hide a new actionable version.
- [ ] **AC-ARCH-027-04:** Keep source-specific validation/self-approval rules and test stale item, rejection reason, partial bulk, reopened request and exact badge/list reconciliation. Extract adapters only when they absorb real scattered behavior.
- [ ] **AC-ARCH-028-01:** Mutation responses patch exact detail/list rows where sufficient; mark non-computable aggregates stale with targeted keys and refetchType none according to current frontend rules.
- [ ] **AC-ARCH-028-02:** Define optimistic rollback for reversible edits and server-confirmed states for financial approvals, payment, posting and filing. Pending/accepted/paid/published remain distinct.
- [ ] **AC-ARCH-028-03:** Reject stale command versions and reconcile current row/stage without broad refetch storms or false success. Remove deleted detail safely and preserve caller mutation options.
- [ ] **AC-ARCH-028-04:** Test paginated filtered caches, concurrent edits, rejected optimistic write, duplicate command, aggregate freshness and badge reconciliation across HR/Payroll views.
- [ ] **AC-ARCH-029-01:** URL state owns shareable filter/sort/view/page/cursor; change filter and reset pagination in the same URL update. Refresh/back/deep link restores the intended view.
- [ ] **AC-ARCH-029-02:** Use stable keyset ordering and explicit filtered-empty versus initial-empty states. Action Center ephemeral state cannot conceal later authoritative changes.
- [ ] **AC-ARCH-029-03:** Keep desktop/mobile/sidebar/command navigation on the same audience/permission model; owner simplification preserves specialist routes and canonical Payroll reimbursement ownership.
- [ ] **AC-ARCH-029-04:** Verify deleted duplicate pages have migrated callers and distinct remaining jobs remain discoverable; no new compatibility alias or broad page deletion without route migration evidence.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

