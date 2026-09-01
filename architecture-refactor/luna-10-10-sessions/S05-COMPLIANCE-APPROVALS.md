# S05 — Compliance and approvals

## Objective

Close the human-governance and deployed privacy gates that code cannot approve for itself. This ticket excludes CRM and Inventory policy scope unless their owners explicitly opt in.

## Work

- [ ] Approve break-glass operator access: eligible roles, reason/ticket requirement, four-eyes approval, time limit, tenant notification, immutable audit, revocation, quarterly review and emergency exception.
- [ ] Run and evidence disposable-data GDPR access/export, correction, erasure and portability drills.
- [ ] Prove physical object-storage purge, search/vector deletion, cache invalidation, backup/PITR aging, reindex and downstream provider deletion behavior.
- [ ] Run retention sweep and legal-hold conflict drills against [RETENTION-POLICY.md](../RETENTION-POLICY.md); confirm immutable financial/audit obligations do not silently defeat erasure policy.
- [ ] Approve data residency, international transfer mechanism, subprocessors/DPAs, breach notification, retention periods, tax/payroll jurisdiction and data-controller/processor responsibilities.
- [ ] Verify consent, purpose limitation, data minimization, audit access, security incident and subject-request procedures with the accountable owners.
- [ ] Record product, security, privacy/DPO, operations, legal and finance approver identity, decision, scope, date, expiry/review date and linked evidence.
- [ ] Track every rejected or conditionally accepted risk with owner, mitigation and deadline; P0/P1 risk cannot be waived without the release authority.

## Exit criteria

- [ ] Every required drill passes in a deployed environment with safely redacted evidence.
- [ ] Every policy decision has an accountable approver and review date.
- [ ] Operator access is enforced and audited, not merely documented.
- [ ] No unresolved P0/P1 privacy, security or compliance finding remains.
