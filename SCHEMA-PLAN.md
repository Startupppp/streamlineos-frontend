# HRMS core schema plan

Updated: 2026-08-18

The reviewed schema design and expand-contract migration plan are:

- `docs/hrms/hrms-core-phase-1-schema-proposal-2026-08-10.md`
- `docs/hrms/hrms-core-phase-1-expand-contract-plan-2026-08-10.md`
- `backend/migrations/pending/hrms-phase1/README.md`

## Recorded decisions

- Canonical tenant workforce: `organization_people -> workers ->
  worker_engagements`; global `users` remains authentication identity and
  `organization_members` remains access membership.
- Assignment/reporting history is effective-dated; current engagement fields
  are compatibility projections.
- Leave authority is an append-only ledger with deterministic legacy opening
  entries; mutable balances are projections.
- Attendance authority is append-only events with separated, minimized and
  retention-controlled evidence.
- Hierarchy adjacency remains write truth and tenant closure is a rebuildable
  read projection.
- Sensitive storage uses a public/private/sensitive split. Managed-KMS
  activation remains externally gated; no application-key fallback is allowed.
- Reconciliation requires zero unresolved identities and two distinct reviewers
  for every manual PII classification.
- Tenant migration uses a sticky profile state machine and cannot enter a
  canonical mode before API, security, cache and UI canary gates pass.

## Authored migration batches

The SQL-managed `0000..0004` forward and rollback files cover workforce/profile,
effective history, leave ledger, attendance events and hierarchy/audit. Their
strict runner, catalog verifier, partition planner and signed leave-opening
verifier are outside the ordinary Drizzle journal because the current snapshot
chain cannot represent partition parents, deferred reciprocal constraints,
exclusions and per-leaf triggers truthfully.

The review-only `backend/migrations/pending/hrms-relational-normalization/`
bundle closes `SCH-006` additively. It normalizes the filtered/ordered legacy
relationships into six tenant-scoped child tables:

- `hr_employee_sensitive_disciplinary_records`
- `hr_employee_sensitive_grievance_records`
- `onboarding_task_dependencies`
- `hr_document_tags`
- `termination_reasons`
- `termination_supporting_documents`

The forward migration, deterministic backfill, verifier and guarded rollback
retain the legacy arrays/JSON during expand-contract. Compatibility reads use a
child projection only when its ordered values exactly reconcile to the retained
legacy contract; otherwise they fail safe to the legacy value. Document tags
and termination reasons dual-write in one tenant transaction. Contract removal
waits for clone rehearsal, canary mismatch evidence and zero-reference proof.

The review-only `backend/migrations/pending/hr-export/` bundle supports
`COST-060` with one additive `hr_export_jobs` relation. The table is
tenant-owned, forced-RLS, idempotency-keyed, bounded by retry/status checks, and
indexed for worker claims plus requester history. It ships with a data-neutral
backfill guard, exact catalog verifier, and rollback that refuses to drop a
nonempty job table. The API and worker remain compatible while
`HR_EXPORT_WORKER_ENABLED` is off; private object-storage readiness and clone
authorization are required before activation. Its README records the exact
deploy and rollback order.

## Deploy order

1. Restore a production-size point-in-time copy to a disposable clone.
2. Bind exact forward, rollback, partition and leave-opening manifests to that
   clone's database, roles, server/root identity, hashes, approvals and expiry.
3. Rehearse forward application and deep catalog/RLS/privilege verification.
4. Create exact hash/range leaves and verify routing and leaf security.
5. Run signed deterministic backfills and zero-error reconciliation.
6. Rehearse contiguous rollback, refusal, resume, reapply and full restore.
7. Present evidence and obtain a separate target-bound production execution
   decision before any live mutation.
8. Deploy compatible writers/readers and canary profile transitions before any
   legacy contract/removal.

No production schema or data mutation is authorized by this plan alone.
