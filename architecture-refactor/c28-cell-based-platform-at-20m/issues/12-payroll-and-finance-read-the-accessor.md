# 12 — Payroll, finance and compensation read the accessor, and the sensitive fields are encrypted

**What to build:** A payroll run pays what the organization's compensation record says, not what a column on a global login says. Bank and tax details are readable only through the organization's encrypted profile, and a person employed by two organizations has two independent pay records.

Second migrate batch. It is separate from batch 1 because it is the batch where being wrong costs money, and because it carries an encryption gap that batch 1 does not.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `hr_employee_sensitive_fields` (`db/schema/hr/core-people.ts:204`) holds `salaryAmountCents`, `bankDetails` and `taxId` — but `bankDetails` is a plain `jsonb` and `taxId` a plain `text`. **The destination is not encrypted today**, and the PRD requires application-level envelope encryption with per-region/cell KMS keys for exactly these fields. `users.bankDetails` (19 backend files) and `users.taxId` (14) are still the live source. `employee_salary_profiles` and `employee_salary_profile_components` (`db/schema/payroll/workforce.ts:41,85`) are the compensation destination; `modules/payroll/lib/payroll-run-payee.ts` and `modules/payroll/filings/filings.service.ts` already reach `hrPeople`/`hrEmployments`.

## Acceptance criteria

- [ ] Every payroll, filing, compensation and finance read of salary, bank details or tax id goes through the accessor and its organization-scoped record.
- [ ] `bankDetails` and `taxId` are stored under application-level envelope encryption with an auditable key reference, and the encryption **fails closed** — an unavailable key refuses the read rather than returning ciphertext or plaintext.
- [ ] A payroll run for a person with two memberships computes each organization's pay from that organization's record, with no possibility of reading across.
- [ ] Posting and payout ledgers stay immutable and their existing approval/segregation controls are untouched by this migration.
- [ ] Sensitive reads are audited with the acting membership, and the audit row survives deletion of the record it describes.
- [ ] A payroll run computed before and after the migration produces identical figures for a fixture organization; a difference is a defect, not a rounding note.

## Todo

- [ ] Do the encryption before the reader migration, not after — migrating readers onto a plaintext destination makes the plaintext load-bearing and much harder to remove.
- [ ] Check whether an envelope-encryption helper already exists in the repo before writing one; a second implementation of a security primitive is the defect this program keeps closing.
- [ ] Diff a real run rather than asserting equivalence; the money path is where a mocked test proves the least.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
