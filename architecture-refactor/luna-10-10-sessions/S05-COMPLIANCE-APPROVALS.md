# S05 - Compliance and approvals

## Objective

Close the human-governance, privacy, retention, and deployed-environment gates required by
the final architecture contract. CRM and Inventory policy decisions remain excluded unless
their owners explicitly opt in.

This checklist keeps three kinds of evidence separate:

- implementation evidence: source, migrations, and executable tests;
- deployment evidence: redacted drills against disposable deployed infrastructure;
- approval evidence: named accountable decisions with scope, rationale, date, and review date.

No local self-test, mock, or code inspection can substitute for deployed evidence or human approval.

## Session todo list

### 1. Break-glass operator access

- [ ] Approve eligible operator roles, mandatory reason and incident/ticket reference, two-person approval, no self-approval, maximum duration, pending-grant expiry, organization/scope binding, tenant notification, per-request immutable audit, revocation, expiry, emergency exception handling, and periodic review.
- [ ] Verify deployed customer-data and billing data-plane routes reject expired, revoked, wrong-organization, wrong-scope, unauthorized-role, concurrent-approval, and audit-failure cases.
- [ ] Record Product and Security decisions, including the selected review cadence; reconcile the current monthly/quarterly alternatives in [RB-10](../runbooks/RB-10-privacy-compliance-decisions.md).

Implementation evidence exists for scoped grants, four-hour expiry, dual control, revocation, guard-level request logging, and two JWT-backed operator data-plane routes. This does not close the checklist: deployed enforcement, notification, emergency handling, review evidence, and approval records are still required.

Implementation subitems verified in this session:

- [x] Grant creation rejects expired grants and enforces the configured maximum duration.
- [x] Approval, rejection, and revocation use conditional transitions that prevent concurrent state races.
- [x] Eligible operator roles and authenticated customer/billing data-plane guard paths are covered by focused tests.
- [x] Repository routes apply `OperatorSessionGuard` and separate `read_customer_data` / `read_payments` grants to customer and billing reads.

### 2. Data inventory, subject rights, and lawful purpose

- [ ] Obtain named Privacy/DPO approval for identity/authentication, employment/payroll, communication, time/attendance, documents, recruitment, financial, audit/operator, AI, and integration data.
- [ ] Record purpose, lawful basis, special-category basis where applicable, subjects, processor, retention period, accountable owner, and deletion/archival behavior for every category.
- [ ] Decide whether PII in `audit_logs.metadata` is permitted; prefer stable references or irreversible hashes for new events unless the approved inventory explicitly justifies the PII.
- [ ] Define and deploy correction/rectification behavior; the request model must not claim correction coverage when it only supports export, delete, or anonymize.
- [ ] Run access/export, correction, portability, erasure, legal-hold blocking, ownership-transfer, cross-tenant denial, and repeated-request idempotency drills against disposable deployed data.
- [ ] Make export exhaustive and resumable, or document every excluded source with an accountable approval. A truncated or capped export is a failure.

Existing GDPR workers and legal-hold self-tests are implementation evidence only. The current export is bounded/truncatable and the current purge path does not prove physical deletion of every eligible record.

Implementation subitems verified in this session:

- [x] Subject export pagination is resumable by stable cursor and tenant-isolation tests pass.
- [x] Multi-organization legal-hold checks are covered by focused tests.
- [x] Storage purge adapter failure handling and idempotency are covered by focused tests.
- [x] Rectification requests are represented by a tenant-scoped `correction` workflow type, require actionable details, and are covered by schema tests and migration `0929_gdpr_correction_request`.

### 3. Physical and downstream deletion

- [ ] Prove physical deletion or approved immutable retention for organization-owned database rows; a `PURGED`/anonymized status flag alone is insufficient.
- [ ] Prove object-storage enumeration, deletion, retry of failed keys, provider-version behavior, and post-delete absence.
- [ ] Prove deletion or documented non-applicability for search/vector indexes, derived projections, caches, analytics, email, AI, integration, and other downstream providers.
- [ ] Prove backup/PITR aging and restore-time deletion behavior under the approved retention policy.
- [x] Fix and verify legal-hold checks for every organization in a multi-organization purge request in repository tests; deployed verification remains part of the drill gate.
- [ ] Revoke `DELETE` and `UPDATE` on `audit_logs` from the application role, verify deployed privileges, rerun immutability tests, and attach query output. The finding recorded in RB-10 is P1 and release-blocking until resolved or formally accepted by the release authority.

Implementation subitems verified in this session:

- [x] Organization purge physically deletes the organization row only after all configured adapters confirm, while retaining detached platform audit evidence.
- [x] Migration `0928_organization_purge_audit_hardening` restricts the application role and protects the audit detachment function with tenant context.

### 4. Retention and legal holds

- [ ] Complete retention coverage for documents, payroll, communication, financial, audit, search/vector, and all other in-scope high-growth data in [RETENTION-POLICY.md](../RETENTION-POLICY.md).
- [ ] Verify scheduled retention workers consume the configured policies in deployment, use bounded/resumable batches, emit an audit record, retry safely, and expose failures.
- [ ] Run retention-sweep and legal-hold conflict drills in disposable deployed infrastructure for every applicable organization and record that immutable financial, payroll, and audit obligations are retained or reversed rather than deleted.
- [ ] Ensure no worker silently skips a document/payroll policy and no workflow silently truncates an export or purge.

The repository contains selected retention workers, but complete coverage and deployed execution are not yet proven. Keep this item open until both are evidenced.

Implementation subitems verified in this session:

- [x] Document policies no longer silently skip configured document tables; eligible records are deleted or redacted with legal-hold protection.
- [x] Payroll policies preserve immutable financial records and emit an auditable protected outcome.
- [x] HR retention processing remains tenant-scoped, bounded, and covered by focused tests.
- [x] `CronHrRetentionService` reads active `hr_retention_policies`, applies document/payroll outcomes, and emits retention audit rows; scheduled deployed execution remains open.

### 5. Residency, transfers, subprocessors, and incident obligations

- [ ] Record the selected residency policy and customer-facing commitment.
- [ ] For every processor, record data categories, processing location, transfer mechanism, DPA/SCC/adequacy status, deletion behavior, subprocessors, and accountable owner.
- [ ] Obtain Legal/DPO decisions for international transfers, subprocessors/DPAs, breach notification, retention, tax/payroll jurisdictions, and controller/processor responsibilities.
- [ ] Record the AI and integration policy: approved provider/region, PII minimization, retention, deletion, and customer disclosure.
- [ ] Verify consent, purpose limitation, minimization, audit access, security incident response, and subject-request procedures with accountable owners.
- [ ] Reconcile unresolved decisions in [DATA-CATALOGUE.md](../DATA-CATALOGUE.md) before approving this section.

### 6. Evidence and risk register

- [ ] Record Product, Security, Privacy/DPO, Operations, Legal, and Finance approver identity, role, decision, scope, rationale, date, expiry/review date, linked evidence, and residual-risk disposition.
- [ ] Track every rejected or conditional risk with owner, mitigation, deadline, and release-authority approval. P0/P1 risks cannot be waived by a ticket author.
- [ ] Store signed policy decisions using the [approval/evidence record template](../decisions/README.md); do not mark a policy done without that record.
- [ ] Store one redacted evidence bundle for the deployed drills containing commit, environment identity, dataset shape, command/result output, timestamps, and artifact hashes.

## Exit criteria

- [ ] Every required subject-rights, retention, and legal-hold drill passes in a deployed disposable environment with safely redacted reproducible evidence.
- [ ] Export is exhaustive/resumable, or every excluded source has an approved documented basis.
- [ ] Physical database, object-storage, derived-data, cache, backup/PITR, and downstream-provider behavior is proven or explicitly approved as not applicable.
- [ ] Operator access is enforced on every data-plane route and independently audited; notification, emergency handling, and periodic review are evidenced.
- [ ] Every required policy has a named accountable approver and review date.
- [ ] No unresolved P0/P1 privacy, security, or compliance finding remains.

## Current status - 2026-09-01

Implementation evidence is present for operator grant primitives, customer/billing data-plane
guards, GDPR request jobs, legal-hold checks, storage-key purge, and selected retention workers.

S05 is **INCOMPLETE**. The remaining blockers are deployed drill evidence, exhaustive export,
physical and downstream purge proof, complete document/payroll retention coverage, the
audit-log privilege finding, and named Product/Security/
Privacy-DPO/Operations/Legal/Finance approvals. CRM and Inventory remain intentionally excluded.

Verified in this session: 19 focused suites and 173/173 tests passed across operator access,
operator data-plane routes, GDPR export/purge, legal holds, organization purge, audit
immutability, rectification validation, and HR retention. Migration and compliance self-tests
also pass. These results are repository evidence only and do not satisfy the deployed-environment
or approval gates above.

The authoritative cross-program checklist remains [PRD-10-10-TODO.md](../PRD-10-10-TODO.md);
its S05 and final release gates must remain unchecked until the evidence above exists.
