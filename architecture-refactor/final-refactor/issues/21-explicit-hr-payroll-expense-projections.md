# 21: Replace broad HR, Payroll and Expense projections

**What to build:** Sensitive people and pay endpoints return minimal explicit DTOs rather than raw ORM rows.

**Blocked by:** 07 — Migrate HR, Payroll, Expenses and Timesheets actors. **Closed.**

**Status:** done

- [x] Broad selects in the audited sensitive paths are replaced by explicit projections.
- [x] Field-level permission and DataScope are applied before retrieval.
- [x] Response contracts remain backward compatible or are versioned deliberately.
- [x] Exposure regression and representative endpoint tests pass.

## How "the audited sensitive paths" were defined

Not by reading the word "sensitive" in a file name. The catalog was queried for every `public` table holding a column matching identity, pay or bank data (`pan_number`, `aadhaar`, `passport`, `tax_id`, `bank_account`, `ifsc`, `salary`, `ctc`, `net_pay`, `date_of_birth`), and the in-scope set is every read of one of those tables through a bare `.select()` — no column list, so every column ships, including ones the endpoint never renders and ones added later.

That produced **18 call sites in 9 files**, all of which are fixed:

| file | table | call sites |
|---|---|---|
| `hr/core/hr-sensitive.service.ts` | `hr_employee_sensitive_fields` | 1 select + 2 `returning()` |
| `hr/benefits/hr-benefits-enrollment.service.ts` | `hr_dependents` | 4 |
| `hr/enterprise-comp/comp-planning.service.ts` | `hr_comp_recommendations` | 2 |
| `hr/payroll-inputs/payroll-inputs-build.service.ts` | overtime, reimbursements, loans, salary profiles | 4 |
| `hr/interviews/hr-recruitment-reports.service.ts` | `candidate_offers` | 1 |
| `payroll/runs/profiles.service.ts` | `employee_salary_profiles` | 6 |
| `payroll/hr-payroll/fnf.service.ts` | `fnf_settlements` | 1 |
| `payroll/hr-payroll/salary-structure-templates.service.ts` | `salary_structure_templates` | 1 |
| `payroll/insights/ess.service.ts` | `fnf_settlements` (self-service) | 1 |

## Findings

Two of these were live disclosures, not just style:

1. **`candidate_offers.acceptanceToken` was being returned** by the recruitment report. It is the token that accepts a job offer. It is now excluded by name.
2. **`hr_employee_sensitive_fields.encryptionKeyRef` was being returned** by both `GET` and `PUT` on the sensitive-fields endpoint. It is written by `sync-canonical-sensitive-fields.ts` and read by nothing — a grep across both repositories finds no consumer, and the frontend never mentions it. Decryption does not need it either: `decrypt(value)` takes only the ciphertext and reads its key version out of the value itself. It is now absent from both responses.

Closing the second one required two type changes, because the row type was doing the work the projection should have done. `decryptRow(row: SensitiveRow)` and `resolveSensitiveRecordCollections(orgId, row: SensitiveRow)` both demanded the **whole table row**, so narrowing the query broke the compile — the code could not express "a row with fewer columns". Both are now generic over exactly the fields they touch (`decryptRow` over the five encrypted fields, the resolver over the four it reads), which is what let the projection shrink without a cast. The three read paths — the select and both `returning()` calls — now share one `SENSITIVE_COLUMNS` constant, so the allowlist has a single place to change.

`ess.service.ts` was checked for BOLA since it is self-service: its subject comes from `@CurrentUser()` (the JWT `sub`), never from a client-supplied id, and the `WHERE` binds that value. No finding.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/hr/__tests__/sensitive-projection-exposure.spec.ts src/modules/payroll/__tests__/pay-projection-exposure.spec.ts --runInBand`:

```
Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
```

Each suite has two kinds of test, and both kinds are needed. The **behavioural** tests capture the projection object the service hands Drizzle and assert its keys are exactly the intended allowlist, so an accidentally re-added column fails. The **structural** tests read each service file and assert it contains no bare `.select()` against those tables, which is what stops the change being quietly reverted.

**Both structural suites were proved to bite before being trusted.** A bare select was temporarily reintroduced in `listDependents` and in `listHistory`; the structural assertion failed (`Expected pattern: not /\.select\s*\(\s*\)/`) and the matching behavioural test failed alongside it because the captured projection was `undefined`. Both files were restored and both suites returned green.

Whole-territory regression run — `src/modules/hr`, `payroll`, `timesheets`, `expenses`, `build/core`:

```
Test Suites: 202 passed, 202 total
Tests:       1473 passed, 1473 total
```

That run initially failed six tests in `leaves-write-probation.spec.ts`, all with `That membership is not active in this organization`. The cause was the same shape as ticket 07's: a pre-existing mock returning a fixed sequence of `db.select` chains, into which the actor resolution inserted two new queries at the front, so the seam read the policy row, found no `status` field and refused. The mock now answers by position within each `create()` call rather than by a one-shot sequence, which is also why it survives the test that calls `create()` twice.

Backend `tsc --noEmit -p tsconfig.build.json` and frontend `tsc --noEmit`: both clean. `madge --circular`: no circular dependency found across 4,117 files.

## Not done

Field-level permission was **checked, not extended**. Every one of these endpoints already carries an object-level gate (`hr:sensitive:view`, `hr:exit:manage`, `hr:salary:view`) and, where it is a list, a DataScope predicate applied in SQL before retrieval — those were verified and left alone. Splitting `hr:sensitive:view` into per-field keys (salary separate from passport, say) would be a new permission model and a product decision, not a projection fix, so it is not in this ticket.
