# Lane B — Payroll & Billing Schema Audit
**Date:** 2026-07-31  **Auditor:** Recon Lane B (read-only)

---

## 1. Table Catalog

### Group A — Payroll Run Engine (Gen-2, `src/db/schema/hr/payroll-runs.ts`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `payroll_runs` | payroll-runs.ts:12 | Master run record per org/month/type | serial | notNull | none | createdAt+updatedAt |
| `payroll_run_employees` | payroll-runs.ts:70 | Per-employee run record, amounts | serial | notNull | none | createdAt+updatedAt |
| `payroll_line_items` | payroll-runs.ts:101 | Per-component line items per employee | serial | notNull | none | createdAt only |
| `payroll_exceptions` | payroll-runs.ts:122 | Exceptions/warnings flagged per run | serial | notNull | none | createdAt+updatedAt |
| `payroll_approvals` | payroll-runs.ts:143 | Multi-stage approval records per run | serial | notNull | none | createdAt+updatedAt |

### Group B — Payroll Config (Gen-2, `src/db/schema/hr/`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `payroll_policies` | payroll-policies.ts:6 | One policy per org (config header) | serial | notNull | none | createdAt+updatedAt |
| `payroll_policy_versions` | payroll-policies.ts:28 | Versioned snapshots of policy config | serial | notNull | none | createdAt+updatedAt |
| `payroll_template_activations` | payroll-policies.ts:48 | Records which template was activated per version | serial | notNull | none | createdAt only |
| `payroll_calendar_events` | payroll-policies.ts:61 | Payroll calendar events per org | serial | notNull | none | createdAt+updatedAt |
| `payroll_accounting_mappings` | payroll-policies.ts:77 | Component-to-ledger mapping | serial | notNull | none | createdAt+updatedAt |
| `salary_components` | payroll-workforce.ts:13 | Org salary component definitions | serial | notNull | isActive (soft) | createdAt+updatedAt |
| `employee_salary_profiles` | payroll-workforce.ts:40 | Per-employee effective-dated salary profile | serial | notNull | effectiveTo (soft) | createdAt+updatedAt |
| `employee_salary_profile_components` | payroll-workforce.ts:70 | Component overrides per profile | serial | notNull | none | createdAt+updatedAt |
| `payroll_loan_adjustments` | payroll-workforce.ts:89 | Loan adjustment/recovery records | serial | notNull | none | createdAt only |
| `payslip_templates` | payroll-payout.ts:10 | Org payslip layout templates | serial | notNull | none | createdAt+updatedAt |
| `payroll_bank_batches` | payroll-payout.ts:24 | Bank payment batch per run | serial | notNull | none | createdAt+updatedAt |
| `payroll_bank_batch_items` | payroll-payout.ts:47 | Individual bank transfer items per batch | serial | notNull | none | createdAt+updatedAt |
| `salary_structure_templates` | salary-structure-templates.ts:4 | Legacy org salary structure templates | serial | notNull | isActive (soft) | createdAt+updatedAt |
| `hr_payroll_input_periods` | payroll-inputs.ts:50 | Input period (cut-off + status) | serial | notNull | none | createdAt+updatedAt |
| `hr_payroll_input_snapshots` | payroll-inputs.ts:77 | Per-employee per-section input snapshot | serial | notNull | none | createdAt only |
| `hr_payroll_adjustments` | payroll-inputs.ts:110 | Arrears/recovery/correction adjustments | serial | notNull | none | createdAt+updatedAt |

### Group C — Statutory / Tax (Gen-2, `src/db/schema/hr/`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `tax_declarations` | tax.ts:4 | Employee IT declaration per FY | serial | notNull | none | createdAt+updatedAt |
| `investment_proofs` | tax.ts:30 | Investment proof documents per declaration | serial | notNull | none | createdAt only |

### Group D — Payout & Bank (Gen-2 utilities in `src/db/schema/hr/payroll.ts`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `expense_categories` | payroll.ts:29 | Expense category definitions | serial | notNull | isActive (soft) | createdAt only |
| `expenses` | payroll.ts:52 | Employee expense claims | serial | notNull | none | createdAt+updatedAt |
| `reimbursements` | payroll.ts:112 | Reimbursement requests | serial | notNull | none | createdAt+updatedAt |
| `salary_loans` | payroll.ts:147 | Salary advance/loan records | serial | notNull | none | createdAt+updatedAt |
| `bonuses` | payroll.ts:183 | Bonus records | serial | notNull | none | createdAt only |
| `fnf_settlements` | payroll.ts:213 | Full-and-final settlement records | serial | notNull | none | createdAt+updatedAt |
| `asset_returns` | payroll.ts:278 | Asset return records on offboarding | serial | notNull | none | createdAt only |

### Group E — Gen-3 Payroll Extensions (`src/db/schema/payroll/**`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `payroll_entities` | entities-periods.ts:41 | Legal entity / establishment | serial | notNull | status:ARCHIVED | createdAt+updatedAt |
| `payroll_periods` | entities-periods.ts:74 | Pay period (cut-off, payDate, calendar snapshot) | serial | notNull | none | createdAt+updatedAt |
| `payroll_filings` | entities-periods.ts:113 | Filing artifacts / challan / acknowledgement | serial | notNull | none | createdAt+updatedAt |
| `payroll_jobs` | entities-periods.ts:161 | Durable async jobs (preview/calc/PDF/export) | serial | notNull | none | createdAt+updatedAt |
| `payroll_run_allocations` | entities-periods.ts:200 | Run-scoped source allocation deduplication | serial | notNull | none | createdAt only |
| `payroll_tds_ytd_ledger` | entities-periods.ts:229 | Per-employee TDS YTD ledger (integer paise) | serial | notNull | none | createdAt only |
| `payroll_inputs` | inputs.ts:9 | Per-employee per-run attendance/LOP inputs | serial | notNull | none | createdAt+updatedAt |
| `payroll_templates` | templates.ts:8 | System + org payroll templates (JSONB config) | serial | orgId nullable | none | createdAt+updatedAt |
| `payroll_tax_windows` | tax-windows.ts:8 | Org IT declaration window per FY | serial | notNull | none | createdAt+updatedAt |
| `payroll_run_events` | run-events.ts:9 | Append-only event/audit log per run | serial | notNull | none | createdAt only |
| `payroll_journal_batches` | journal-batches.ts:44 | Versioned accounting outbox batches | serial | notNull | none | createdAt+updatedAt |
| `payroll_journal_batch_lines` | journal-batches.ts:103 | Journal debit/credit lines | serial | notNull | none | createdAt only |
| `payroll_command_receipts` | command-receipts.ts:26 | Idempotency + operator history for mutations | serial | notNull | none | createdAt+updatedAt |
| `payroll_scheduler_state` | command-receipts.ts:65 | Scheduler heartbeat state (no orgId) | serial | NONE | none | updatedAt only |

**Group E count: 14 tables** (from 10 payroll/ files).

### Group F — Compliance / Global (`src/db/schema/hr/global-compliance.ts`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `hr_work_authorizations` | global-compliance.ts:73 | Work permit/visa tracking | serial | notNull | deletedAt | createdAt+updatedAt |
| `hr_compliance_requirements` | global-compliance.ts:96 | Org compliance requirement definitions | serial | notNull | active col | createdAt+updatedAt |
| `hr_compliance_events` | global-compliance.ts:117 | Compliance calendar events | serial | notNull | none | createdAt+updatedAt |
| `hr_contracts` | global-compliance.ts:135 | Contractor/temp contracts | serial | notNull | deletedAt | createdAt+updatedAt |

### Group G — Billing & Subscription (`src/db/schema/billing/**` + `common/shared.ts` + `common/platform.ts`)
| Table | File:Line | Purpose | PK | orgId | soft-delete | timestamps |
|-------|-----------|---------|-----|-------|-------------|------------|
| `billing_profiles` | billing.ts:31 | Org billing address / GST / PAN | serial | notNull.unique | none | createdAt+updatedAt |
| `marketplace_apps` | billing.ts:57 | App catalog (global, no orgId) | serial | NONE | isActive | createdAt+updatedAt |
| `app_installations` | billing.ts:84 | Org's installed apps | serial | notNull | cancelledAt | installedAt |
| `ai_credit_packs` | billing.ts:103 | AI credit top-up pack catalog (global) | serial | NONE | isActive | createdAt only |
| `org_ai_credits` | billing.ts:118 | Single balance row per org (mutable integer) | serial | notNull.unique | none | updatedAt only |
| `ai_credit_transactions` | billing.ts:137 | Append-only credit ledger | serial | notNull | none | createdAt only |
| `ai_credit_reservations` | billing.ts:165 | In-flight credit reservations | serial | notNull | none | createdAt+updatedAt |
| `affiliates` | billing.ts:191 | Affiliate program records | serial | notNull | none | createdAt+updatedAt |
| `affiliate_commissions` | billing.ts:216 | Commission records per referral | serial | referredOrgId | paidAt | createdAt only |
| `referrals` | billing.ts:235 | Referral tracking | serial | referrerOrgId | none | createdAt only |
| `revenue_events` | billing.ts:259 | Subscription MRR event log | serial | notNull | none | createdAt only |
| `enterprise_quotes` | billing.ts:302 | Enterprise custom pricing quotes | serial | notNull | none | createdAt+updatedAt |
| `payment_providers` | payment-providers.ts:19 | Tenant payment gateway config | serial | notNull | none | createdAt+updatedAt |
| `payment_provider_accounts` | payment-providers.ts:37 | Payment provider account metadata | serial | notNull | none | createdAt+updatedAt |
| `payment_provider_credentials` | payment-providers.ts:60 | Encrypted payment credentials | serial | notNull | none | createdAt+updatedAt |
| `payment_webhook_endpoints` | payment-providers.ts:79 | Registered webhook endpoints | serial | notNull | none | createdAt+updatedAt |
| `payment_webhook_events` | payment-providers.ts:97 | Received + processed webhook events | serial | notNull | none | receivedAt+processedAt |
| `payment_test_transactions` | payment-providers.ts:119 | Payment integration test transactions | serial | notNull | none | createdAt only |
| `payment_audit_events` | payment-providers.ts:139 | Credential change audit trail | serial | notNull | none | createdAt only |
| `payment_manual_methods` | payment-providers.ts:156 | Manual bank/UPI payment method config | serial | notNull | none | createdAt+updatedAt |
| `offer_fulfillment_components` | offer-fulfillment.ts:23 | CRM offer → inventory SKU bridge | `bigint GENERATED ALWAYS AS IDENTITY` | notNull | status:inactive | createdAt+updatedAt |
| `subscriptions` | shared.ts:308 | Org SaaS subscription (Razorpay-backed) | serial | notNull | cancelledAt | createdAt+updatedAt |
| `subscription_payments` | shared.ts:330 | Payments for subscriptions | serial | notNull | none | createdAt only |
| `coupons` | shared.ts:358 | Promo codes (global + org-scoped) | serial | orgId nullable | isActive+expiresAt | createdAt+updatedAt |
| `coupon_redemptions` | shared.ts:378 | Per-org coupon redemption record | serial | notNull | none | redeemedAt |
| `ai_usage_logs` | shared.ts:403 | Per-request AI usage log | serial | notNull | none | createdAt only |
| `platform_payments` | platform.ts:64 | Platform-level Razorpay payment records | serial | orgId nullable | none | createdAt only |
| `platform_subscriptions` | platform.ts:92 | Second subscription table (platform-level) | serial | notNull | cancelledAt | createdAt+updatedAt |
| `modules_catalog` | modules.ts:4 | Module registry (global, no orgId) | text PK (moduleKey) | NONE | status col | none |

---

## 2. Payroll Generation Map (Three-Generation Verification)

**Prior audit claim:** Gen-1 = `payrolls` + `salaryStructures` tables. **DISPROVED.**

The file `src/db/schema/hr/payroll.ts` does NOT contain `payrolls` or `salaryStructures` tables. It contains expense/loan/bonus/FnF utilities (`expense_categories`, `expenses`, `reimbursements`, `salary_loans`, `bonuses`, `fnf_settlements`, `asset_returns`).

**Actual three-generation breakdown:**

- **Gen-1 (legacy template layer):** `salary_structure_templates` (`hr/salary-structure-templates.ts:4`) — org-level fixed salary templates with hardcoded percent columns. Used by `HrSalaryStructuresService` (`hr/config/hr-salary-structures.controller.ts:32`). This is a simplified per-org template; it is NOT superseded by Gen-2 per-employee profiles (both exist). **Writers confirmed present** (`hr-salary-structures.controller.ts:58`).

- **Gen-2 (canonical run engine):** 5 files under `hr/payroll-*.ts` — `payrollRuns`, `payrollRunEmployees`, `payrollLineItems`, `payrollExceptions`, `payrollApprovals`, `payrollPolicies`, `payrollPolicyVersions`, `salaryComponents`, `employeeSalaryProfiles`, `employeeSalaryProfileComponents`, `payslipTemplates`, `payrollBankBatches`, `payrollBankBatchItems`, `hrPayrollInputPeriods`, `hrPayrollInputSnapshots`, `hrPayrollAdjustments`. **All actively written** by the payroll module services.

- **Gen-3 (extension layer):** 14 tables in `payroll/**` — all FK back into Gen-2 (`payrollRuns.id`). Purpose: multi-entity support, durable jobs, journal accounting outbox, command idempotency, TDS YTD ledger. **All actively written** by the payroll module.

**Conclusion:** No dead Gen-1 tables. The prior "Gen-1 payrolls+salaryStructures" claim was incorrect.

---

## 3. Payroll Run State Machine

**Status enum** (`src/db/schema/common/enums.ts:195`):
```
PREPARING → DRAFT → PREVIEW_READY / EXCEPTIONS_FOUND → PENDING_APPROVAL →
APPROVED → LOCKED → PAID → PAYSLIPS_PUBLISHED → CLOSED
                   ↕ REOPENED (escape hatch from LOCKED)
```
Full values: `"PREPARING", "DRAFT", "PREVIEW_READY", "EXCEPTIONS_FOUND", "PENDING_APPROVAL", "APPROVED", "LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED", "REOPENED"` — `enums.ts:196`.

**Transition matrix:** enforced in application code only via `PAYROLL_RUN_TRANSITIONS` + `canTransitionRun()` in `src/modules/payroll/payroll.types.ts:319`.

**DB-level protection: NONE.** There is NO Postgres CHECK constraint, NO trigger, and NO `GENERATED ALWAYS` guard preventing direct SQL mutation of a `LOCKED` or `APPROVED` run. Any direct DB write bypasses the application state machine entirely.

Key locked statuses in application: `PAYROLL_LOCKED_STATUSES` used in `prd-e2e-journey.spec.ts:5`.  
`LOCKED → REOPENED` is a valid application transition (`locking.service.ts:177`).

---

## 4. Money Columns

### Decimal / numeric / float columns (returned as STRING by postgres.js)
| Table | Column | Declared Type | File:Line |
|-------|--------|---------------|-----------|
| `expense_categories` | `budget_limit` | decimal(15,2) | payroll.ts:38 |
| `expenses` | `amount` | decimal(15,2) | payroll.ts:66 |
| `expenses` | `tax_amount` | decimal(12,2) | payroll.ts:74 |
| `reimbursements` | `amount` | decimal(15,2) | payroll.ts:123 |
| `salary_loans` | `amount`, `emi_amount` | decimal(15,2) | payroll.ts:157,159 |
| `bonuses` | `amount` | decimal(15,2) | payroll.ts:195 |
| `fnf_settlements` | `basic_dues`, `leave_encashment`, `bonus_due`, `deductions`, `loan_recovery`, `net_payable`, `reimbursements_due`, `asset_recovery`, `notice_recovery`, `other_deductions` | decimal(15,2) | payroll.ts:226-261 |
| `payroll_runs` | `gross_total`, `deduction_total`, `employer_cost_total`, `net_total` | decimal(15,2) | payroll-runs.ts:29-32 |
| `payroll_run_employees` | `gross`, `total_deductions`, `employer_contributions`, `net`, `net_payout_currency`, `fx_rate` | decimal(15,2) / decimal(12,6) | payroll-runs.ts:84-88 |
| `payroll_run_employees` | `scheduled_days`, `paid_days`, `lop_days`, `overtime_hours` | decimal(5,1) / decimal(6,2) | payroll-runs.ts:80-83 |
| `payroll_line_items` | `amount` | decimal(15,2) | payroll-runs.ts:110 |
| `payroll_accounting_mappings` | (none, amount-free) | — | — |
| `salary_components` | `amount`, `percent` | decimal(15,2), decimal(7,4) | payroll-workforce.ts:20,21 |
| `employee_salary_profiles` | `annual_ctc`, `basic_salary`, `hra_percentage`, `allowances`, `deductions` | decimal(15,2) / decimal(5,2) | payroll-workforce.ts:51-55 |
| `employee_salary_profile_components` | `amount`, `percent` | decimal(15,2), decimal(7,4) | payroll-workforce.ts:77,78 |
| `payroll_loan_adjustments` | `amount` | decimal(15,2) | payroll-workforce.ts:95 |
| `payroll_bank_batches` | `total_amount` | decimal(15,2) | payroll-payout.ts:31 |
| `payroll_bank_batch_items` | `amount` | decimal(15,2) | payroll-payout.ts:53 |
| `salary_structure_templates` | `basic_salary`, `hra_percent`, `special_allowance`, `medical_allowance`, `travel_allowance`, `other_allowances`, `pf_deduction_percent`, `professional_tax` | decimal(15,2) / decimal(5,2) / decimal(10,2) | salary-structure-templates.ts:8-16 |
| `tax_declarations` | `hra`, `lta`, `section80c`, `section80d`, `section80g`, `home_loan_interest`, `previous_employment_income`, `previous_employer_tds` | decimal(15,2) | tax.ts:10-17 |
| `investment_proofs` | `amount` | decimal(15,2) | tax.ts:35 |
| `payroll_inputs` | `scheduled_days`, `paid_days`, `lop_days`, `half_days`, `overtime_hours`, `shift_allowance_units`, `holiday_work_days`, `billable_hours` | decimal(6,2) / decimal(8,2) | inputs.ts:15-22 |
| `payroll_run_allocations` | `amount` | decimal(15,2) | entities-periods.ts:213 |
| `payroll_periods` | `working_days` | decimal(5,1) | entities-periods.ts:90 |
| `payroll_journal_batches` | `total_debits`, `total_credits` | decimal(15,2) | journal-batches.ts:68,69 |
| `payroll_journal_batch_lines` | `debit`, `credit` | decimal(15,2) | journal-batches.ts:116,117 |
| `subscription_payments` | `amount` | numeric(15,2) | shared.ts:337 |
| `coupons` | `value`, `min_purchase` | numeric(15,2) | shared.ts:362,363 |
| `coupon_redemptions` | `amount` | numeric(15,2) | shared.ts:383 |
| `ai_usage_logs` | `estimated_cost_usd` | numeric(12,6) | shared.ts:413 |
| `ai_credit_transactions` | `cost_usd` | numeric(12,6) | billing.ts:153 |
| `payment_test_transactions` | `amount` | numeric(12,2) | payment-providers.ts:124 |
| `offer_fulfillment_components` | `quantity_per_unit` | decimal(10,4) | offer-fulfillment.ts:41 |

**Decimal count (approximate): 60+ columns across payroll + billing tables.**

### Integer minor-unit (paise / credits) columns
| Table | Column | Unit | File:Line |
|-------|--------|------|-----------|
| `bonuses` | `amount_cents` | bigint (paise?) | payroll.ts:195 |
| `hr_payroll_adjustments` | `amount_cents` | bigint | payroll-inputs.ts:125 |
| `payroll_tds_ytd_ledger` | `taxable_income_paise`, `tds_paise`, `previous_employer_income_paise`, `previous_employer_tds_paise`, `perquisites_paise`, `surcharge_paise`, `rebate_paise` | integer paise | entities-periods.ts:244-250 |
| `hr_contracts` | `stipend_cents` | integer (cents) | global-compliance.ts:146 |
| `org_ai_credits` | `balance`, `lifetime_granted`, `lifetime_consumed` | integer (credits) | billing.ts:123-125 |
| `ai_credit_transactions` | `amount`, `balance_after` | integer (credits) | billing.ts:144,145 |
| `ai_credit_reservations` | `credits` | integer (credits) | billing.ts:172 |
| `affiliates` | `total_earned`, `total_paid`, `pending_payout`, `commission_rate` | integer (paise?) | billing.ts:201-203 |
| `affiliate_commissions` | `amount_in_paise` | integer paise | billing.ts:224 |
| `enterprise_quotes` | `price_per_seat_in_paise` | integer paise | billing.ts:312 |
| `ai_credit_packs` | `price_in_paise`, `credits`, `bonus_credits` | integer | billing.ts:110-112 |
| `platform_payments` | `amount` | integer (paise inferred) | platform.ts:75 |
| `revenue_events` | `mrr`, `amount` | integer | billing.ts:267,268 |
| `marketplace_apps` | `monthly_price`, `annual_price` | integer | billing.ts:69,70 |
| `ai_usage_logs` | `credits_milli`, `prompt_tokens`, `completion_tokens`, `total_tokens` | integer | shared.ts:414-417 |

**Integer-minor-unit count: ~30 columns.**

### Currency-code columns without companion currency-code
- `bonuses.amount_cents` (`payroll.ts:195`) — no accompanying currency column. **FLAG.**
- `hr_payroll_adjustments.amount_cents` (`payroll-inputs.ts:125`) — no currency column. **FLAG.**
- `platform_payments.amount` (`platform.ts:75`) — HAS `currency` col (line 76). OK.
- `affiliates.total_earned / total_paid / pending_payout` (`billing.ts:201`) — no currency. All commissions implicitly INR/USD? **FLAG.**
- `revenue_events.mrr` / `amount` (`billing.ts:267`) — no currency column. **FLAG.**
- `payroll_journal_batch_lines.debit` / `credit` (`journal-batches.ts:116`) — no currency column. Journal lines inherit entity currency implicitly. **Minor FLAG.**

---

## 5. Statutory Config

### Effective-dated DB tables for statutory rates
**NONE EXISTS.** There is no `statutory_rates`, `pf_config`, `esi_config`, `tax_slabs`, or any DB table that stores statutory rate history. All rates are hardcoded in TypeScript constants.

### Hardcoded statutory constants (exact file:line)

**`src/modules/payroll/runs/lib/statutory-registry.ts`** — canonical registry:
| Line | Constant | Context |
|------|----------|---------|
| 108 | `"15000.00"` | PF monthly wage ceiling (`monthlyWageCeiling`) |
| 109 | `"21600"` | Legacy PF annual misnamed field |
| 115 | `"21000.00"` | ESI monthly eligibility ceiling |
| 119 | `"200.00"` | PT default monthly (most states) |
| 124 | `"208.33"` | PT Tamil Nadu |
| 125 | `"150.00"` | PT West Bengal |
| 185 | `7_500_000` | New regime standard deduction (paise) = ₹75,000 |
| 186-192 | slab array | FY2025-26 new regime income tax slabs (0%/5%/10%/15%/20%/30%) |
| 194 | `2_500_000` | New regime §87A rebate max paise |
| 195 | `70_000_000` | New regime rebate income limit paise |
| 198-203 | old regime slab array | Old regime slabs (0%/5%/20%/30%) |
| 208 | `"4"` | Health + Education cess percent |
| 163 | `"4.81"` | Gratuity provision % of basic |
| 164 | `5` | Gratuity eligibility years |

**`src/modules/payroll/runs/lib/statutory-packs.ts`** — country pack registry:
| Line | Constant | Context |
|------|----------|---------|
| 41 | `"12"`, `"15000.00"` | PF_EMP: 12% up to ₹15,000 ceiling |
| 49 | `"12"`, `"15000.00"` | PF_ER: 12% up to ₹15,000 ceiling |
| 57 | `"0.75"`, `"21000.00"` | ESI_EMP: 0.75% gross, ceiling ₹21,000 |
| 66 | `"3.25"`, `"21000.00"` | ESI_ER: 3.25% gross, ceiling ₹21,000 |
| 75 | `"200.00"` | PT default fixed amount |

**`src/modules/payroll/setup/payroll-policy-defaults.constants.ts`**:
| Line | Constant | Context |
|------|----------|---------|
| 20 | `"15000.00"` | `pfWageCeiling` default in policy wizard |
| 23 | `"21000.00"` | `esiWageCeiling` default in policy wizard |

**`src/modules/payroll/setup/dto/setup.schemas.ts`**:
| Line | Constant | Context |
|------|----------|---------|
| 77 | `"15000.00"` | Zod schema default for `pfWageCeiling` |
| 80 | `"21000.00"` | Zod schema default for `esiWageCeiling` |

**`src/db/schema/hr/salary-structure-templates.ts`**:
| Line | Constant | Context |
|------|----------|---------|
| 14 | `"12"` | `pf_deduction_percent` column default |
| 15 | `"200"` | `professional_tax` column default |
| 9 | `"40"` | `hra_percent` column default |

**`src/modules/payroll/payout/payslip-templates.service.ts`**:
| Line | Constant | Context |
|------|----------|---------|
| 169, 173, 189, 193, 199 | `"1800.00"` | Hardcoded EPF amount in sample payslip template data |

**CRITICAL: The PT state matrix (`byState` in statutory-registry.ts:121-140) is explicitly labelled "Sample state map — not full India matrix; legal review required for production PT."** Only 18 states; ~10 states with zero PT; others at flat ₹200. Similarly LWF byState map is labelled "not full India matrix" at line 146.

---

## 6. Multi-Currency

- **Per-employee:** `employee_salary_profiles.currency` (default INR) + `payoutCurrency` — `payroll-workforce.ts:46,47`.
- **Per-run-employee:** `payroll_run_employees.currency` (default INR) + `payoutCurrency` + `fx_rate` (decimal 12,6) — `payroll-runs.ts:77-79`.
- **Policy-level:** `payroll_policies.currency` (default INR) — `payroll-policies.ts:14`.
- **Entity-level:** `payroll_entities.base_currency` (default INR) — `entities-periods.ts:50`.
- **FX rate storage:** `fx_rate decimal(12,6)` stored per `payroll_run_employees` row — `payroll-runs.ts:79`.  The converted amount `net_payout_currency` is also stored (`payroll-runs.ts:88`).
- **Multi-currency verdict:** Schema supports it per-employee. No centralized FX rates table — rate is stored on the employee row at run time.

---

## 7. Billing Schema Analysis

### Feature checklist
| Feature | Exists? | Table / File:Line |
|---------|---------|-------------------|
| Products/catalog | PARTIAL | `marketplace_apps` (billing.ts:57) — apps only, no plan products |
| Plans/tiers | PARTIAL | `subscriptionPlanEnum` enum only (enums.ts:119) — no versioned plan table |
| Versioned prices | NO | No `prices` or `plan_prices` table |
| Plan↔feature mapping | NO | No table — features are JSONB array in `marketplace_apps.features` |
| Subscriptions | YES (×2) | `subscriptions` (shared.ts:308) + `platformSubscriptions` (platform.ts:92) |
| Subscription items (seats/modules) | NO | No line-item table — seat count only on `platformSubscriptions.seat_count` |
| Entitlement overrides | NO | No table — entitlements are code-only (`plan-limits.service.ts`) |
| Usage records | PARTIAL | `ai_usage_logs` (shared.ts:403) — AI only, no general metered usage |
| Credit ledger (AI) | YES | `ai_credit_transactions` (billing.ts:137) — append-only (createdAt only) |
| Credit balance row | YES | `org_ai_credits` (billing.ts:118) — single mutable row per org |
| `CHECK (balance >= 0)` on credit balance | NO | No such constraint — `balance integer default 0` (billing.ts:123) |
| Invoices (platform) | NO | No `invoices` table for platform billing |
| Payments (platform) | YES | `platform_payments` (platform.ts:64) + `subscription_payments` (shared.ts:330) — two tables |
| Webhook events | YES | `payment_webhook_events` (payment-providers.ts:97) — tenant provider webhooks |
| Coupons/promos | YES | `coupons` + `coupon_redemptions` (shared.ts:358,378) |
| Affiliate commissions | YES | `affiliates` + `affiliate_commissions` + `referrals` (billing.ts:191-256) |
| Enterprise quotes | YES | `enterprise_quotes` (billing.ts:302) |

### Credit ledger details
- `ai_credit_transactions` (billing.ts:137): append-only (no `updatedAt`), stores `amount` (signed integer, positive = credit, negative = debit), `balance_after`, `type` (PURCHASE/USAGE/REFUND/PLAN_GRANT/EXPIRY). **Append-only: YES.**
- `org_ai_credits` (billing.ts:118): single mutable balance row per org, `balance integer default 0`. **No `CHECK (balance >= 0)`** — balance can theoretically go negative in application code. Per CLAUDE.md §20 intent this is accepted ("may go slightly negative").
- `ai_credit_reservations` (billing.ts:165): in-flight reservations with expiry — correct pre-reserve pattern.

### Dual subscription table problem
`subscriptions` (`shared.ts:308`) references `razorpay_subscription_id` and holds `subscriptionPlanEnum` (STARTER/PROFESSIONAL/ENTERPRISE).  
`platformSubscriptions` (`platform.ts:92`) also has `razorpay_subscription_id` and `plan text`. Two parallel tables serve the same concern. **Drift risk.**

---

## 8. Enums in Scope

### From `src/db/schema/payroll/enums.ts` (6 enums)
| Enum | Values | File:Line |
|------|--------|-----------|
| `payroll_template_category` | 11 values (INDIAN_STANDARD…COUNTRY_STANDARD) | enums.ts:3 |
| `payroll_input_source` | ATTENDANCE, LEAVE, TIMESHEET, UPLOAD, MANUAL | enums.ts:9 |
| `payroll_run_event_type` | 15 values (GENERATED…CLOSED) | enums.ts:13 |
| `payslip_publication_status` | PENDING, PUBLISHED, FAILED | enums.ts:20 |
| `payroll_tax_window_status` | DRAFT, OPEN, CLOSED, LOCKED | enums.ts:24 |

### From `src/db/schema/hr/payroll-inputs.ts` (4 enums defined inline)
| Enum | Values | File:Line |
|------|--------|-----------|
| `hr_payroll_input_status` | open, building, built, locked | payroll-inputs.ts:19 |
| `hr_payroll_input_section` | 8 sections | payroll-inputs.ts:26 |
| `hr_payroll_adjustment_type` | arrears, recovery, correction | payroll-inputs.ts:37 |
| `hr_payroll_adjustment_status` | pending, approved, applied, rejected | payroll-inputs.ts:43 |

### From `src/db/schema/hr/global-compliance.ts` (8 enums)
| Enum | Values | File:Line |
|------|--------|-----------|
| `hr_work_auth_type` | 5 values | global-compliance.ts:19 |
| `hr_work_auth_status` | active, expiring, expired, pending_renewal | global-compliance.ts:27 |
| `hr_compliance_category` | 6 values | global-compliance.ts:34 |
| `hr_compliance_frequency` | once, monthly, quarterly, yearly | global-compliance.ts:43 |
| `hr_compliance_event_status` | pending, done, overdue | global-compliance.ts:50 |
| `hr_contract_type` | 6 values | global-compliance.ts:56 |
| `hr_contract_status` | active, expiring, ended, renewed, converted | global-compliance.ts:65 |

### From `src/db/schema/payroll/entities-periods.ts` (3 enums)
| Enum | Values | File:Line |
|------|--------|-----------|
| `payroll_entity_status` | ACTIVE, INACTIVE, ARCHIVED | entities-periods.ts:19 |
| `payroll_period_status` | OPEN, CUTOFF, LOCKED, CLOSED | entities-periods.ts:25 |
| `payroll_job_status` | PENDING, RUNNING, SUCCEEDED, FAILED, DEAD_LETTER | entities-periods.ts:32 |

### From `src/db/schema/payroll/journal-batches.ts` (2 enums)
| Enum | Values |
|------|--------|
| `payroll_journal_batch_status` | DRAFT, POSTED, EXPORTED, REVERSED, FAILED |
| `payroll_journal_recon_status` | UNRECONCILED, RECONCILED, DISPUTED |

### From `src/db/schema/payroll/command-receipts.ts` (1 enum)
| Enum | Values |
|------|--------|
| `payroll_command_status` | IN_FLIGHT, SUCCEEDED, FAILED |

### Key billing enums from `src/db/schema/common/enums.ts`
| Enum | Values | File:Line |
|------|--------|-----------|
| `subscription_status` | TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED | enums.ts:118 |
| `subscription_plan` | STARTER, PROFESSIONAL, ENTERPRISE | enums.ts:119 |
| `ai_credit_txn_type` | PURCHASE, USAGE, REFUND, PLAN_GRANT, EXPIRY | enums.ts:146 |
| `ai_credit_reservation_status` | RESERVED, SETTLED, CANCELLED, EXPIRED | enums.ts:152 (inferred) |
| `affiliate_status` | PENDING, ACTIVE, SUSPENDED | enums.ts:160 |
| `revenue_event_type` | new_subscription, upgrade, downgrade, churn, reactivation | enums.ts:181 |

**Total enums in scope: ~28** (6 payroll/ + 4 hr/payroll-inputs + 8 hr/global-compliance + 3 entities-periods + 2 journal-batches + 1 command-receipts + remaining billing enums from common/enums.ts).

---

## 9. Constraint Sweep

| Pattern | Count (src/db) | Representative |
|---------|----------------|----------------|
| `GENERATED ALWAYS AS IDENTITY` / `generatedAlwaysAsIdentity()` | ~9 occurrences | `offer_fulfillment_components` (offer-fulfillment.ts:30), `build/` tables, `common/idempotency.ts:25`, `common/outbox.ts:34` |
| `serial(` (legacy PK) | 656 occurrences | All payroll/billing tables |
| `ROW LEVEL SECURITY` | **0** in src/db, **0** in migrations | Not used anywhere |
| `FORCE ROW LEVEL` | **0** | Not used |
| `CREATE POLICY` | **0** | Not used |
| `EXCLUDE USING` | **0** | Not used |
| `btree_gist` | **0** | Not used |
| `check(` (Drizzle CHECK) | 1 | `modules_catalog` key format check (modules.ts:16) |

**RLS verdict: NOT IMPLEMENTED anywhere in the codebase.** CLAUDE.md §20 recommends Postgres RLS as a backstop — it is not present.

---

## 10. Dead/Suspicious Tables

### `bank_transfers` / `bankTransfers`
**NOT a payroll table.** `finBankTransfers` exists in `src/db/schema/accounting/finance-banking.ts:110` as an accounting inter-account transfer table. It is live and actively referenced. Prior audit claim of "deprecation tombstone" was **INCORRECT** — refers to the accounting module, not payroll.

### `salary_structure_templates` (`hr/salary-structure-templates.ts:4`)
**Suspicious.** This Gen-1 template table uses flat decimal columns (not components). The Gen-2 `salary_components` + `employee_salary_profiles` system is more flexible. The controller (`hr-salary-structures.controller.ts:47`) still reads from it. **Ref count: controller has 2 methods, service exists.** Not dead, but functionally overlapping with Gen-2 profiles.

### `payroll_scheduler_state` (`command-receipts.ts:65`)
Has **no orgId column** — global per-scheduler-job. This is a singleton heartbeat table. Not a tenant-data table but not dead either.

### `platform_subscriptions` vs `subscriptions`
Two separate tables for effectively the same business concept (org plan subscription). Both reference Razorpay. Drift risk documented above.

---

## 11. Top Findings

| SEV | File:Line | Finding |
|-----|-----------|---------|
| **P0** | `statutory-registry.ts:101-210` | All PF/ESI/PT/TDS statutory rates are hardcoded TypeScript constants — no effective-dated DB table. A statutory rate change (e.g. ESI ceiling increase from ₹21,000) requires a **code deployment**, not a config change. The PT matrix is explicitly labelled "not full India matrix; legal review required." |
| **P0** | `payroll-runs.ts:12` + `payroll.types.ts:319` | No DB-level CHECK constraint or trigger prevents mutation of `LOCKED` or `APPROVED` payroll runs. Application `canTransitionRun()` is the only guard — bypassable by direct SQL or a future service that skips it. |
| **P0** | `billing.ts:118-135` | `org_ai_credits.balance` has no `CHECK (balance >= 0)` constraint. A race condition or bug could drive balance negative. The reservation pattern (`ai_credit_reservations`) mitigates but does not DB-enforce this. |
| **P1** | All payroll tables | 60+ money columns use Drizzle `decimal(15,2)` → returned as JavaScript **string** by postgres.js. The payroll engine calls `parseFloat()` 259 times across 46 files to convert. Any `parseFloat` on a null or empty string silently produces `NaN`, which propagates through arithmetic. |
| **P1** | `shared.ts:308` + `platform.ts:92` | Two parallel subscription tables (`subscriptions` + `platformSubscriptions`) for the same concern. They are not FK-linked, use different column names, and can drift independently. |
| **P1** | `salary-structure-templates.ts:14-15` | Gen-1 template table has DB-default `pf_deduction_percent = "12"` and `professional_tax = "200"` — hardcoded statutory rates baked into DB schema defaults. A rate change requires a schema migration. |
| **P1** | `statutory-registry.ts:142-156` | LWF `byState` map covers only 10 states. Missing 18+ states (including AP, TS, OR, HR, PB, RJ, MP, UP which ARE in the PT map). An org in an unlisted state silently falls back to the `employeeFixed = "25.00"` generic default — may be wrong. |
| **P1** | `entities-periods.ts:229` | `payroll_tds_ytd_ledger` uses integer paise for TDS amounts, but `payroll_line_items.amount` and `payroll_run_employees.net` use decimal(15,2) rupees. Mixed unit systems across the same run require careful conversion everywhere — no type system enforcement. |
| **P2** | `payroll-runs.ts:12` | `payroll_runs` has no soft-delete. A run can be physically deleted (if `ON DELETE CASCADE` is triggered upstream). The event log (`payroll_run_events`) would also cascade-delete. |
| **P2** | `billing.ts:137-163` | `ai_credit_transactions` stores `amount` as a signed integer but the sign convention (positive = in, negative = out?) is not documented in the schema. `type` enum exists but the application must enforce consistent sign. |
| **P2** | `payroll-payout.ts:53` | `payroll_bank_batch_items.amount` has no currency column. Bank batches are implicitly single-currency per batch. Multi-currency payroll employees in one run could be mixed into a single-currency batch. |
| **P2** | `bonuses.amount_cents` (`payroll.ts:195`) alongside `bonuses.amount decimal(15,2)` — the table has BOTH decimal and bigint amount columns. No constraint ensures consistency. |
| **P2** | `billing.ts:57` (marketplace_apps) | No orgId FK — this is a global catalog table. Plans are stored as `requiredPlan varchar(20)` (free text) referencing the plan enum by string. No referential integrity to `subscriptionPlanEnum`. |
| **P2** | `tax.ts:4` | `tax_declarations.status` is plain `text` with no enum and no CHECK constraint — values are unconstrained. |
| **P2** | `hr-salary-structures.controller.ts:32` | `HrSalaryStructuresService` operates on `salary_structure_templates` (Gen-1) which functionally overlaps with `salary_components` + `employee_salary_profiles` (Gen-2). Two systems in production simultaneously increases maintenance surface. |

---

## Coverage Gaps

1. `src/db/schema/common/enums.ts` — only relevant enums extracted; full 169-occurrence file not exhaustively cataloged.
2. `src/db/schema/timesheets/**` — only verified that timesheets has no payroll FK; full table catalog not produced (out of scope per task).
3. `backend/migrations/` — not enumerated for individual migration purpose/content; only grepped for constraint patterns.
4. `src/modules/payroll/` service layer — money handling bugs (NaN propagation from `parseFloat`) are structural risks that would require full service audit to enumerate exhaustively.
5. Billing `plan_limits.service.ts` — entitlement enforcement is entirely code-side; no DB table was found mapping plan → feature limit, confirming absence but service logic not fully audited.
