# 22: Govern retention and accountless document delivery

**What to build:** Pay and tax documents reach worker-only payees through an auditable path and respect approved retention, hold and deletion rules.

**Blocked by:** 03 Enforce sensitive reads and rapid revocation; 04 Unify identity, Employment Facts and payroll eligibility; 05 Publish strict versioned wire contracts

**Status:** ready-for-agent

**Program:** AP-12

**Requirements:** FR-ARCH-033

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-033-01:** Inventory every governed HR/payroll document class, version, retention policy, legal hold and privacy/export/deletion obligation; assess tax-document coverage explicitly rather than assuming the generic HR sweep covers it. Payroll owns pay/tax-document versions and delivery; Core HR owns HR-record retention execution, and Privacy governs approved retention/hold rules. Record one mutable owner per document class, with no second writer.
- [ ] **AC-ARCH-033-02:** Worker-only payees receive audited assisted document delivery or a clear supported/unsupported repair state; membership-only self-service does not silently strand their documents.
- [ ] **AC-ARCH-033-03:** Legal holds prevent premature object/record purge; deletion and backup/restore references reconcile. Audit omits full secrets and unnecessary sensitive values.
- [ ] **AC-ARCH-033-04:** Require named privacy/payroll/legal review for retention and delivery rules; source gaps are not themselves a finding of legal noncompliance.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

