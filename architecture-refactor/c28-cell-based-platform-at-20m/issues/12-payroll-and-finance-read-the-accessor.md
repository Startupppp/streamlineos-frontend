# 12 — Payroll, finance and compensation read the accessor, and the sensitive fields are encrypted

**What to build:** A payroll run pays what the organization's compensation record says, not what a column on a global login says. Bank and tax details are readable only through the organization's encrypted profile, and a person employed by two organizations has two independent pay records.

Second migrate batch. It is separate from batch 1 because it is the batch where being wrong costs money, and because it carries an encryption gap that batch 1 does not.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** done (one criterion open — the sensitive-read audit membership, which lives in ticket 11 territory)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `hr_employee_sensitive_fields` (`db/schema/hr/core-people.ts:204`) holds `salaryAmountCents`, `bankDetails` and `taxId` — but `bankDetails` is a plain `jsonb` and `taxId` a plain `text`. **The destination is not encrypted today**, and the PRD requires application-level envelope encryption with per-region/cell KMS keys for exactly these fields. `users.bankDetails` (19 backend files) and `users.taxId` (14) are still the live source. `employee_salary_profiles` and `employee_salary_profile_components` (`db/schema/payroll/workforce.ts:41,85`) are the compensation destination; `modules/payroll/lib/payroll-run-payee.ts` and `modules/payroll/filings/filings.service.ts` already reach `hrPeople`/`hrEmployments`.

## Acceptance criteria

- [x] Every payroll, filing, compensation and finance read of salary, bank details or tax id goes through the accessor and its organization-scoped record.

  ```
  $ rg -n "users\.(bankDetails|taxId|monthlySalary|designation|employeeId|joiningDate|branchId|orgDepartmentId|reportingTo)" src/modules/payroll/
  (no matches)
  ```

  Migrated: `lib/payroll-run-payee.ts`, `filings/filings.service.ts`, `runs/generate.service.ts`, `payout/payout-batches.service.ts`, `payout/publishing.service.ts`, `payout/payout-validation.service.ts`, `insights/ess.service.ts`, `insights/manager-inbox.service.ts`, `insights/team-rewards.service.ts`, `insights/reports.service.ts`, `insights/lib/report-builders.ts`.

  **The preference order was reversed, which is the substance of this ticket.** `pickBank` used to try `users.bankDetails` *first* and fall back to the canonical record; it is deleted. The accessor is now the only source and owns the fallback.

  Two defects were found reviewing this batch rather than accepted as reported:

  - **Worker-only payees lost their bank details.** The first cut keyed everything on `userId`, so a payee with `userId = null` (a payable worker with no login) resolved to `bankDetails: null` — silently dropping a real payee's account number from a payout file. The accessor gained `getSensitiveFactsByPersonBatch(orgId, organizationPersonIds)` and the loader now resolves those payees by `organizationPersonId`. Removing capability is not migration.
  - **Five readers were left behind, not one.** `ess.service.ts`, `manager-inbox.service.ts`, `team-rewards.service.ts`, `reports.service.ts` and `lib/report-builders.ts` all still read legacy columns. All five are migrated.

  `team-rewards.loadDirectReports` also carried a **pre-existing cross-tenant read** — it selected by `users.reportingTo` with no `orgId` at all, so a manager in one organization matched direct reports in every other. The accessor's `getDirectReportUserIds(orgId, managerUserId)` is org-scoped, so migrating it closes that hole; `assertDirectReport` is now org-scoped for the same reason.

- [x] `bankDetails` and `taxId` are stored under application-level envelope encryption with an auditable key reference, and the encryption **fails closed**.

  `common/security/envelope-encryption.ts` — a per-record AES-256-GCM data key, wrapped by a KEK behind a `KeyProvider` interface; the key id travels inside the ciphertext (`enc:v2:<keyId>:<wrappedDek>:<body>`) and is also denormalised onto `hr_employee_sensitive_fields.encryption_key_ref` for rotation audits. `EnvKeyProvider` reads `ENCRYPTION_KEY` as `kek:v1` and `ENCRYPTION_KEY_V<n>` as `kek:v<n>`; the highest configured version encrypts and every configured version still decrypts, so rotation is additive. A KMS provider drops in behind the same interface without touching a call site or a stored ciphertext.

  No second primitive was written: three duplicate `enc:v1:` implementations already existed, and `common/security/sensitive-field.ts` reads both schemes and re-seals legacy values onto the envelope form.

  Fails closed, proved rather than asserted — missing key, wrong key id, tampered ciphertext and never-encrypted input all throw:

  ```
  $ node ./node_modules/jest/bin/jest.js src/common/security
  PASS src/common/security/envelope-encryption.spec.ts
    √ fails closed when the key is unavailable — never returns ciphertext or plaintext (30 ms)
    √ fails closed when the referenced key id is not configured (5 ms)
    √ rejects a tampered ciphertext rather than returning partial plaintext (37 ms)
    √ refuses to decrypt a value that is not envelope ciphertext (4 ms)
  PASS src/common/security/sensitive-field.spec.ts
    √ fails closed on both schemes when the key is gone (6 ms)
    √ refuses a value that was never encrypted (7 ms)
  Tests:       15 passed, 15 total
  ```

  Schema change applied and verified in `pg_catalog`, not by the runner's exit code:

  ```
  $ node scripts/db-query.mjs "select column_name, data_type from information_schema.columns where table_name='hr_employee_sensitive_fields' ..."
  { "obj": "sensitive.bank_details",      "data_type": "text" }     (was jsonb)
  { "obj": "sensitive.encryption_key_ref","data_type": "text" }
  ```

  Migration `0609` refuses to convert the column if any row still holds unencrypted `bank_details`, so plaintext can never be stranded in a column that is meant to hold ciphertext.

- [x] A payroll run for a person with two memberships computes each organization's pay from that organization's record, with no possibility of reading across.

  `lib/payroll-multi-org.spec.ts` — the same `userId` resolves different `bankDetails.accountNumber` and `taxId` per organization, and asserts the accessor was called with each run's own `orgId`. Every accessor method takes `orgId` as its first argument and scopes `hrPeople`/`hrEmployments`/`hrEmployeeSensitiveFields` by it, so there is no signature by which a caller can read a bank account without naming the organization.

- [x] Posting and payout ledgers stay immutable and their existing approval/segregation controls are untouched by this migration.

  The payout diff is bank-details resolution only — no approval, locking or ledger-write logic changed:

  ```
  $ git diff --stat -- src/modules/payroll/payout/
   payout-batches.service.ts     | 18 +++++++++-------
   payout-validation.service.ts  |  8 ++++++--
   payroll-payout.module.ts      |  4 +++-
   publishing.service.ts         |  6 ++++--
  ```

  `payout/payout-run-completion.ts` and `payout/locking.service.ts` are another session's territory and were not touched.

- [ ] Sensitive reads are audited with the acting membership, and the audit row survives deletion of the record it describes.

  Half done. `hr_audit_logs.actor_membership_id` exists (migration `0609`, verified in `pg_catalog`) and deliberately carries **no foreign key** — an audit row must outlive the membership it records, and both `restrict` and `set null` defeat that. Payroll has no sensitive-read audit call site to populate: the only one in the codebase is `HrSensitiveService.get`'s `sensitive.viewed`, which is ticket 11's territory and is still writing `actorId` alone. Left open rather than ticked; see the note in ticket 11.

- [x] A payroll run computed before and after the migration produces identical figures for a fixture organization; a difference is a defect, not a rounding note.

  `pnpm verify:payroll-payee-parity` seeds a fixture payee into a real placed organization with real encrypted bank details, records what the legacy columns yield, runs the backfill, then loads the payee through the migrated loader and diffs.

  ```
  $ pnpm verify:payroll-payee-parity
  {
    "fixtureOrg": "b680eca0-226f-4114-aa14-5b3516c8d633",
    "before": { "employeeId": "EMP-PARITY-26192", "designation": "Senior Engineer",
                "joiningDate": "2024-04-01",
                "bankDetails": { "accountNumber": "000123456789", "ifsc": "FIXT0000123",
                                 "pfUanNumber": "100200300400", "esiIpNumber": "3300123456", … },
                "taxId": "ABCDE1234F" },
    "after":  { … byte-identical … },
    "identical": true,
    "diffs": [],
    "fallbacksDuringLoad": { "total": 0, "byField": {} }
  }
  EXIT=0
  ```

  **`fallbacksDuringLoad: 0` is what stops this being a tautology.** Without it, `identical: true` could mean both sides read `users`. Zero fallbacks means every value came from `hr_employments` and the envelope-encrypted `hr_employee_sensitive_fields`, decrypted, and matched the legacy value exactly. The fixture is cleaned up on exit.

## Todo

- [x] Encryption landed **before** the reader migration — migration `0609` and the envelope primitive were built first, so no reader was ever pointed at a plaintext destination.
- [x] Checked first. Three duplicate `enc:v1:` AES-GCM implementations already existed (`common/security/secret-encryption.util.ts`, `hr/onboarding/core/crypto.helpers.ts`, `payroll/hr-payroll/lib/encryption.ts`). No fourth was written: the envelope scheme extends the shared one and `sensitive-field.ts` reads the legacy form.
- [x] Diffed a real run against a real database with a seeded fixture, and reported the fallback counter alongside so the diff cannot be satisfied by both sides reading the same legacy column.
- [x] Set **Status** and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
