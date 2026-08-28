# 10: Migrate Billing, Accounting, Finance and Support actors

**What to build:** Financial approvers, recipients and support actors use organization membership/person identity with immutable attribution where required.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** implemented

- [x] New financial/support actor writes use the canonical organization actor.
- [x] Immutable historical records preserve display/audit identity after membership removal.
- [x] Backfill is resumable and surfaces ambiguous rows.
- [x] Cross-organization approval and support-access tests pass.

Evidence: financial approval, payment-run, tax-payment and provider test/setup writes resolve active organization actors and fail closed for inactive or cross-organization users. Audit records now retain the resolved membership identity while legacy user IDs remain available. `backfill:financial-actors` scans bounded source batches with a checkpoint and reports unresolved identities without guessing; the canonical actor seam tests cover multi-organization, inactive and ambiguous membership cases. Migration `0641_financial_actor_audit_identity` adds the audit membership identity column and index.
