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
- [x] Operator-management routes read `INTERNAL_API_SECRET` through validated `APP_CONFIG`; the controller test supplies configuration explicitly and passes without ambient environment mutation.
- [x] Expired pending grants are conditionally transitioned out of the approval queue by the protected `operator-grant-expiry` cron sweep; concurrent approval/sweep races use a conditional update.
- [x] Grant creation and its immutable `grant.requested` audit event commit in one tenant transaction; an audit insertion failure cannot leave a visible unaudited grant.
- [x] The pending-grant expiry endpoint is protected by the cron secret and a distributed lease, with both HTTP verbs included in the cron authentication contract tests.

### 2. Data inventory, subject rights, and lawful purpose

- [ ] Obtain named Privacy/DPO approval for identity/authentication, employment/payroll, communication, time/attendance, documents, recruitment, financial, audit/operator, AI, and integration data.
- [ ] Record purpose, lawful basis, special-category basis where applicable, subjects, processor, retention period, accountable owner, and deletion/archival behavior for every category.
- [ ] Decide whether PII in `audit_logs.metadata` is permitted; prefer stable references or irreversible hashes for new events unless the approved inventory explicitly justifies the PII.
- [ ] Define and deploy correction/rectification behavior; the request model must not claim correction coverage when it only supports export, delete, or anonymize.
- [ ] Run access/export, correction, portability, erasure, legal-hold blocking, ownership-transfer, cross-tenant denial, and repeated-request idempotency drills against disposable deployed data.
- [ ] Make export exhaustive and resumable, or document every excluded source with an accountable approval. A truncated or capped export is a failure.

Existing GDPR workers and legal-hold self-tests are implementation evidence only. The export worker now enumerates the repository's subject-owned sources and is resumable, but blob contents remain metadata-only and the synchronous legacy export path is minimal. The purge path does not prove physical deletion of every eligible record in deployment.

Implementation subitems verified in this session:

- [x] Subject export pagination is resumable by stable cursor and tenant-isolation tests pass.
- [x] Multi-organization legal-hold checks are covered by focused tests.
- [x] Storage purge adapter failure handling and idempotency are covered by focused tests.
- [x] Rectification requests are represented by a tenant-scoped `correction` workflow type, require actionable details, and are covered by schema tests and migration `0929_gdpr_correction_request`; processing now refuses to mark them complete until verified field-level correction exists.
- [x] The asynchronous export worker includes tenant-scoped, resumable `hr_reporting_lines` history in its declared source coverage and focused coverage tests.
- [x] The asynchronous export worker enumerates subject file keys through the catalog with active legal-hold protection; object bytes remain explicitly outside the repository-only export claim until provider-backed export behavior is verified.
- [x] The asynchronous export worker includes tenant-scoped, resumable `ai_chat_conversations` and `ai_chat_messages` sections with row-count and cursor/isolation coverage tests.
- [x] The asynchronous export worker includes tenant-scoped, resumable `ai_feedback`, `ai_action_proposals`, `ai_jobs`, and `ai_usage_logs` sections with cursor/isolation coverage tests.

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
- [x] An executable application-role verifier checks that `UPDATE` and `DELETE` on `audit_logs` are revoked and an enabled immutability trigger exists; its contract self-test passes, while deployed query output remains required.
- [x] Migration `0930_audit_logs_append_only_trigger` adds the database trigger and safely replaces the detachment function in a new migration, without modifying the already-journaled `0928` migration.

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
- [x] The retention coverage verifier classifies `hr_reporting_lines` as KEEP-FOREVER, with the decision documented in [RETENTION-POLICY.md](../RETENTION-POLICY.md), so the measured high-growth inventory has no unclassified source.
- [x] A read-only run against the configured database at the 1 MB threshold reported 10/10 high-growth tables covered or KEEP-FOREVER with zero uncovered tables; this is inventory evidence only and is not treated as a deployed retention drill.
- [x] The retention-coverage gate fails closed for invalid thresholds, validates matrix entries in self-test, and scans ordinary plus partitioned table relations; this is repository coverage evidence only.
- [x] Partition children resolve to their parent retention policy and the verifier emits the policy table used for each measured relation; this remains repository classification evidence only.

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

Implementation subitems verified in this session:

- [x] The repository evidence collector runs the ten reproducible compliance/migration checks, records commit/environment metadata and artifact hashes, redacts tested secret formats, and never upgrades repository self-tests into deployed evidence; `--deployed` only records an operator-declared environment for future real drills.
- [x] S05 migration changes pass the migration-discipline and migration-rollback gates; intentionally irreversible changes are explicitly declared and `0930` has a documented rollback artifact.

## Exit criteria

- [ ] Every required subject-rights, retention, and legal-hold drill passes in a deployed disposable environment with safely redacted reproducible evidence.
- [ ] Export is exhaustive/resumable, or every excluded source has an approved documented basis.
- [ ] Physical database, object-storage, derived-data, cache, backup/PITR, and downstream-provider behavior is proven or explicitly approved as not applicable.
- [ ] Operator access is enforced on every data-plane route and independently audited; notification, emergency handling, and periodic review are evidenced.
- [ ] Every required policy has a named accountable approver and review date.
- [ ] No unresolved P0/P1 privacy, security, or compliance finding remains.

## Current status - 2026-09-01

Implementation evidence is present for operator grant primitives (including stale pending-grant
expiry), customer/billing data-plane
guards, GDPR request jobs (including AI chat export sections), legal-hold checks, storage-key purge, and selected retention workers.

S05 is **INCOMPLETE**. The remaining blockers are deployed drill evidence, exhaustive export,
physical and downstream purge proof, complete deployed document/payroll retention execution, and named
Product/Security/Privacy-DPO/Operations/Legal/Finance approvals. The read-only verifier reached
the configured `streamline_app` role and confirmed `UPDATE`/`DELETE` are denied, but reported no
enabled `audit_logs` trigger in that environment; migration `0930` remains unapplied there.
CRM and Inventory remain intentionally excluded.

Verified in this session: the current focused run passed 18 suites and 169/169 tests across operator access,
operator data-plane routes, GDPR export/purge, legal holds, organization purge, audit
immutability, rectification validation, and HR retention. Migration and compliance self-tests
also pass. The S05 evidence collector self-test passes and its ten checks pass; the generated
bundle is repository-only and explicitly refuses an unmarked deployed claim. These results are
repository evidence only and do not satisfy the deployed-environment or approval gates above.

The authoritative cross-program checklist remains [PRD-10-10-TODO.md](../PRD-10-10-TODO.md);
its S05 and final release gates must remain unchecked until the evidence above exists.

## External evidence handoff

These commands require authorized disposable/deployed infrastructure and must be run by the
responsible operator; local self-tests do not satisfy them:

| Gate | Command / evidence | Accountable owner |
|---|---|---|
| Application-role audit immutability | `APP_DATABASE_URL=... pnpm check:audit-log-privileges`; retain redacted JSON output showing the actual role, denied `UPDATE`/`DELETE`, and enabled trigger. The current configured role reported denied mutations but no enabled trigger, so this gate remains open until `0930` is deployed and rechecked. | Operations + Security |
| Subject-rights and legal-hold drills | `pnpm compliance:drill`, `pnpm drill:export`, `pnpm drill:erasure`, and the correction/ownership-transfer cases; retain disposable-environment output | Privacy/DPO + Operations |
| Storage and downstream purge | Run the configured storage/provider adapters and retain object-list-before/after, retry, absence, mirror, analytics, and cache evidence | Operations |
| Retention scheduling and PITR | `pnpm check:retention-coverage`, deployed retention sweep logs, and `pnpm drill:pitr`; retain scheduler identity, timestamps, and restore/delete results | Operations + Finance |
| Policy approval | Copy `../decisions/README.md` to a dated signed record and complete all accountable approver rows and residual-risk dispositions | Product, Security, Privacy/DPO, Legal, Finance |
