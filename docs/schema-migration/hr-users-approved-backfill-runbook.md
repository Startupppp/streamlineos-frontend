# R-11 approved HR backfill runbook

1. Take a restorable database backup/branch and run `hr-users-canonical-parity-preflight.sql`.
2. Run `hr-users-approved-backfill.sql` without variables. It executes the exact writes and rolls them back, while printing readiness and changed-ID manifests.
3. Resolve duplicate-person/primary-employment failures. Missing canonical rows, invalid departments, out-of-range salaries, conflicts, bank details, tax ID, reporting, branch, emergency-contact, and lifecycle/onboarding values are intentionally skipped.
4. Capture the dry-run output, rehearse rollback on the branch, then apply with `psql -v apply=true`.
5. Re-run parity preflight and compare mismatch counts by organization before switching reads.

Rollback is manifest-driven because the script never overwrites a non-null canonical business value:

- For `employment_fill` IDs, restore the fields that were null before the run to null using the captured IDs and backup comparison.
- Delete only `sensitive_insert` IDs printed by this run.
- For `sensitive_fill` IDs, restore `salary_amount_cents` to null using the captured IDs.
- If manifests or backup comparison are unavailable, restore the database branch/backup; do not infer rollback rows from timestamps.

Tax ID is excluded even though the canonical column exists: encryption and key-version policy belongs to the application service, not SQL. Bank details and other ambiguous mappings remain blocked by the field-map ADR requirements.

