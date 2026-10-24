# 21: Secure export creation and downloads

**What to build:** An authorized requester can create and retrieve exports while expiry, scope changes and revoked access are enforced at download.

**Blocked by:** 03 Enforce sensitive reads and rapid revocation; 05 Publish strict versioned wire contracts

**Status:** ready-for-agent

**Program:** AP-12

**Requirements:** FR-ARCH-032

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-032-01:** One document-download module owns safe filename, expected type/signature, nonempty valid content and object-URL disposal. Reject 200 HTML, empty/truncated PDF and mismatched content rather than saving it as a payslip/tax PDF.
- [ ] **AC-ARCH-032-02:** Preserve CSV job content guards; apply appropriate CSV formula escaping and encoding rules for exported untrusted cells.
- [ ] **AC-ARCH-032-03:** Export creation, background execution and download recheck job owner/current tenant/scope/permission, signed-link expiry and audit. A revoked requester cannot download an earlier authorized job.
- [ ] **AC-ARCH-032-04:** Test denied/expired/error blob, cross-org stored job, scope downgrade, interrupted/resumed export, filename and cleanup behavior through the download/export interface.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

