# StreamlineOS India Payroll Statutory Compliance PRD

**Status:** Normative child PRD  
**Owner:** Payroll Compliance  
**Priority:** P0 for India payroll general availability  
**Parent:** [India Payroll PRD](./05-india-payroll-prd.md)  
**Legal posture:** Rules and outputs require named payroll/legal sign-off

## 1. Outcome

StreamlineOS calculates, prepares, tracks, and reconciles Indian payroll
obligations from versioned rules and locked payroll results. It clearly
distinguishes calculation, artifact generation, payment, filing, acknowledgment,
rejection, and correction.

## 2. Scope

### P0

- PF/EPF eligibility, employee/employer contribution, allocations, ECR,
  challan, payment/return status, supplementary/revised handling, and reconciliation.
- ESI eligibility, employee/employer contribution, member reference, monthly
  contribution artifact, challan/payment status, and reconciliation.
- State/location-specific Professional Tax and Labour Welfare Fund calculation,
  registrations, periodic tasks, evidence, and reconciliation.
- Salary TDS under the applicable tax-year law, employee declarations/proofs,
  projection, deduction, challan, quarterly statement, correction, year-end
  certificate, and employee publication.
- Gratuity, statutory bonus, leave encashment, and wage-definition effects
  required for payroll and FnF.
- Effective-dated rule source, implementation version, test fixtures, approvals,
  rollout, rollback, and audit.
- Compliance calendar, alerts, assignments, evidence, and status dashboard.

### P1

- Direct provider/API submission where contracted.
- Advanced cross-registration consolidated filing/reporting and group orchestration;
  establishment-level calculation, artifacts, and reconciliation remain P0.
- Direct-provider supplementary/revised/correction and advanced prior-period orchestration;
  minimum artifact/status/manual-evidence correction paths remain P0.
- Contractor/non-salary withholding, Form 140, and contractor certificate workflow.
- Digital signature handoff, provider acknowledgment, rejection diagnostics,
  and filing/payment reconciliation.
- State labor registers and return outputs supported by a signed-off rule pack.

### Partner-dependent

- Government-portal filing/payment, registration services, licensed tax
  utilities, digital signature, managed payroll, and professional advice.

## 3. Compliance State Model

Obligation, artifact, payment, return, acknowledgment, and correction are
separate records with many-to-many links and independent transitions. A
country-rule pack defines valid order because filing/payment order differs.

- `CALCULATED/REVIEWED` requires locked result and rule version.
- `PAID` requires bank/provider/manual evidence; `FILED` requires submission evidence.
- `ACKNOWLEDGED` requires provider/government or approved manual acceptance.
- Rejection/correction links the affected portion and never overwrites prior evidence.
- A generated file alone advances neither payment nor filing.

## 4. Rule-Pack Contract

- **FR-STAT-001:** Every rule declares authority/source, jurisdiction, tax or
  contribution type, effective dates, version, parameters, formula, rounding,
  eligibility, outputs, tests, approver, activation, and supersession. Authority
  stores exact instrument/version, publication/effective date, accessed and
  archived evidence, interpretation, and sign-off; a mutable URL is provenance only.
- **FR-STAT-002:** Rates, ceilings, slabs, due dates, form mappings, and
  contribution allocations are versioned data, never hard-coded UI constants.
- **FR-STAT-003:** A rule update runs regression fixtures and an impact preview
  against open/upcoming periods before activation.
- **FR-STAT-004:** Retroactive rules identify affected locked/paid periods and
  create a governed adjustment plan; they never silently rewrite results.
- **FR-STAT-005:** Rule publication requires payroll owner and legal/compliance
  approval in the target environment.
- **FR-STAT-006:** Every employee calculation and artifact records the exact
  country-rule version.

## 5. PF/EPF Requirements

- **FR-STAT-007:** Determine eligibility and contribution basis from effective
  employee, establishment, wage, and rule facts.
- **FR-STAT-008:** Calculate and expose employee/employer contribution and
  required EPF, EPS, EDLI, and applicable administration/inspection allocations
  without merging employer cost into net pay. Rules cover age/member category,
  ceiling/higher-wage election, international worker, exempt establishment, and rounding.
- **FR-STAT-009:** Validate required member/UAN and establishment references
  without exposing them outside payroll scope.
- **FR-STAT-010:** Generate ECR using the applicable official format and
  reconcile employee totals to the locked run.
- **FR-STAT-011:** Support regular, supplementary, and revised return workflow
  according to the active official process.
- **FR-STAT-012:** Record return ID, challan/TRRN or successor reference,
  payment, acknowledgment, errors, correction, and evidence.

## 6. ESI Requirements

- **FR-STAT-013:** Evaluate employee eligibility and contribution from
  effective wages, rule version, applicable contribution period, and continuing
  member rules. Eligibility must not stop merely because wages first exceed the
  coverage ceiling during a contribution period.
- **FR-STAT-014:** Rules cover join/exit and establishment transfer inside the
  period, benefit-period linkage, daily-average-wage employee-share exemption,
  disability threshold where applicable, wage inclusions, and separate rounding.
- **FR-STAT-015:** Validate insurance/member and establishment references with
  field-level protection.
- **FR-STAT-016:** Produce the monthly contribution artifact and reconcile
  employee/employer totals to payroll.
- **FR-STAT-017:** Track challan, payment, acknowledgment, rejection, and
  corrected submission without treating report generation as filing.

## 7. PT and LWF Requirements

- **FR-STAT-018:** Select rule from effective employee work location,
  establishment/registration, period, and signed jurisdiction precedence for
  remote/multiple locations; prevent double deduction across overlapping registrations.
- **FR-STAT-019:** Support monthly, half-yearly, annual, or rule-defined
  periodicity without a global hard-coded schedule.
- **FR-STAT-020:** Store registration, return/payment task, amount, due date,
  evidence, acknowledgment, and correction by state/entity.
- **FR-STAT-021:** A location change applies the correct effective rule and
  exposes the resulting payroll delta; mid-period relocation uses the pack's
  split/no-split rule and records registration selection.

## 8. Salary TDS Requirements

- **FR-STAT-022:** Support the applicable employee tax regime/elections,
  projected annual income, prior employment, declarations, proof review,
  exemptions/deductions/perquisites, and monthly deduction.
- **FR-STAT-023:** Employee projections show assumptions, rule version, and
  estimate status; they are not a guarantee or tax advice.
- **FR-STAT-024:** Review workflow records accepted, rejected, and adjusted
  proof values and reviewer reason.
- **FR-STAT-025:** Calculate TDS from locked payroll facts and reconcile monthly,
  quarterly, and annual values.
- **FR-STAT-026:** Maintain an immutable employee tax-year ledger ordered by
  payroll/off-cycle/prior-employer/proof/perquisite/regime events, with
  recomputation reason, excess/shortfall treatment, and certificate reconciliation.
- **FR-STAT-027:** Track challan/payment, quarterly statement, validation,
  filing, processing, acknowledgment, correction, and certificate publication.
  For Form 130, prepare and reconcile Form 138 statement data, record official
  processing, retrieve the certificate from TRACES, sign and issue it, and
  retain retrieval/issue evidence. An employer-created offline PDF or internal
  preview is not a valid Form 130.
- **FR-STAT-028:** Select Act, Form 24Q/138, Form 16/130, schema, and correction
  process from the governing tax year, obligation period, artifact type, and
  notified transition. Salary TDS law across the 1 April 2026 boundary also
  uses the salary **payment date**; the statement/certificate form does not
  switch merely because filing or issuance occurs after that date. Corrections
  for legacy periods retain their legacy forms and process. For example, FY
  2025–26 salary uses Form 24Q/Form 16 even when filed/issued after 1 April
  2026, while TY 2026–27 uses Form 138/Form 130. These examples are transition
  fixtures, not hard-coded rules for later tax years.
- **FR-STAT-029:** Contractor/non-salary withholding is a separate contract and
  must not use the salary statement. It supports payee tax-year/entity
  aggregation, section/rule, cumulative threshold, PAN/status change, lower/
  nil certificate validity, reversal, and Form 26Q/140 reconciliation by tax year.

The dated transition basis is the Income Tax Department's
[2025 Act commencement notice](https://www.incometaxindia.gov.in/w/income-tax-act-2025-comes-into-force-from-1st-april-2026),
[interplay and transition FAQ](https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf),
and [Form 130 FAQ](https://www.incometaxindia.gov.in/documents/d/guest/form-130-faqs),
reviewed 2026-10-22. The signed rule pack archives the exact applicable
instrument, schema, authority evidence, and legal interpretation before use.

## 9. Gratuity, Bonus, Wage, and FnF

- **FR-STAT-030:** Gratuity calculation exposes eligibility, service basis,
  wage basis, rule version, rounding, deadline trigger, and payable result,
  including signed-off fixed-term, death/disablement, and prior-service cases.
- **FR-STAT-031:** Statutory bonus rules expose eligibility, period, wage basis,
  minimum/maximum treatment, adjustment, and audit.
- **FR-STAT-032:** Leave encashment and FnF show quantity, rate basis, tax/
  statutory treatment, effective policy/rule version, and a due date for each
  settlement component. Official exit-wage and gratuity periods from the
  labour-code pack are versioned rule data. One generic FnF due date must not
  hide the applicable wage, gratuity, or other component deadline.
- **FR-STAT-033:** Each FnF component supports undisputed/disputed/partial/
  paid/overdue status, exception approval, employee communication, and payment evidence.
- **FR-STAT-034:** Wage-definition and minimum-wage effects are modeled as
  effective rules with impact preview on salary structure and employer cost.

## 10. Artifacts, Providers, and Reconciliation

- **FR-STAT-035:** Every artifact records source run, obligation, rule version,
  generator version, control totals, hash, actor, timestamp, and status.
- **FR-STAT-036:** File generation validates schema and control totals before
  an operator can download or submit it.
- **FR-STAT-037:** Provider calls use durable intent, idempotency, signed
  callbacks where supported, retry classes, dead letter, and reconciliation.
- **FR-STAT-038:** Manual evidence means manually captured official bank,
  provider, or government evidence with permission, reference, date, amount,
  attachment where required, reason, and reviewer. Internal review alone cannot
  create `PAID`, `FILED`, or `ACKNOWLEDGED`.
- **FR-STAT-039:** The dashboard identifies upcoming, due, overdue, rejected,
  unmatched, and corrected obligations and their accountable owner.
- **FR-STAT-040:** Product and marketing copy never describe an obligation as
  compliant, paid, filed, or accepted beyond recorded evidence.
- **FR-STAT-041:** One challan/payment/return may cover multiple runs or
  obligations and one obligation may use multiple corrections/payments; control
  totals reconcile the allocation in both directions.

## 11. Rule and Fixture Inventory

Before each capability's applicable tier release, payroll/legal owns a versioned inventory by obligation, jurisdiction,
registration, effective period, scenario, input, expected result/artifact,
source instrument, reviewer, test ID, and sign-off. It includes:

- EPF/EPS/EDLI/member-category/ceiling/exempt-establishment and ECR cases;
- ESI contribution-period, exemption, join/exit/transfer, wage, and rounding cases;
- every launched state PT/LWF slab, frequency, location/registration transition;
- salary TDS annual-ledger, prior employer, regime, proof, arrear/perquisite,
  cessation, short/excess deduction, form transition, and correction cases;
- contractor threshold/certificate/reversal and Form 140 cases;
- bonus, gratuity, wage-definition, leave-encashment, death, and FnF deadlines.

## 12. Pages

- `/payroll/statutory` — obligations, calendar, exceptions, and reconciliation.
- `/payroll/statutory/pf` — ECR, returns, challans, payments, corrections.
- `/payroll/statutory/esi` — contribution, challans, payments, corrections.
- `/payroll/statutory/pt-lwf` — state/entity obligations and evidence.
- `/payroll/statutory/tds` — declarations, deductions, challans, statements,
  corrections, and certificates.
- `/payroll/statutory/bonus-gratuity` — calculation and settlement evidence.
- `/payroll/tax-declarations` — campaigns, proof review, projections.
- `/me/pay/tax` — employee elections, declaration/proof, projection, and forms.

These may be tabs/secondary routes under the canonical pages in PRD 07.

## 13. Security and Operations

- Statutory IDs, PAN-like values, UAN/member references, proofs, and certificates
  are encrypted/tokenized and excluded from logs, general search, analytics,
  and AI prompts.
- Downloads use short-lived signed access and actor/subject authorization.
- Changes to rule pack, registration, bank/payment configuration, filing, and
  correction require separation of duties and step-up where available.
- Compliance update monitoring has a named owner, source list, triage SLA,
  impact assessment, test suite, sign-off, deployment, and customer notice.

## 14. Acceptance Criteria

- [ ] Every India statutory result cites the active rule and source version.
- [ ] PF ECR reconciles to employee and employer locked-run totals.
- [ ] EPF/EPS/EDLI allocations and member/establishment exceptions pass signed fixtures.
- [ ] ESI eligibility persists correctly through the applicable contribution
      period and monthly contribution reconciles to eligible payroll results.
- [ ] PT and LWF select the correct effective state/location rule.
- [ ] Salary TDS monthly, quarterly, and annual totals reconcile.
- [ ] Form 138 and Form 130 mappings apply to the correct tax year while legacy
      Form 24Q and Form 16 remain available for applicable periods.
- [ ] Salary paid on either side of 1 April 2026 selects the applicable TDS
      law by payment date; old-period corrections keep legacy forms. An
      employee-visible Form 130 is retrieved from TRACES after processed Form
      138, signed, issued, and evidenced, rather than created offline.
- [ ] P1 contractor enablement maps Form 140 from non-salary Form 26Q only for
      the applicable tax year.
- [ ] Gratuity, bonus, leave encashment, and FnF fixtures pass payroll/legal review.
- [ ] FnF tracks component-specific deadlines, including exit wages and gratuity,
      instead of treating settlement as one undifferentiated due date.
- [ ] Generated, paid, filed, acknowledged, rejected, and corrected are distinct states.
- [ ] Provider retry cannot duplicate payment or filing.
- [ ] A rejected obligation retains evidence and supports a traceable correction.
- [ ] A rule change cannot silently rewrite a locked or paid payroll result.
- [ ] Obligation, payment, return, acknowledgment, and correction records
      represent many-to-many allocations without false completion.
- [ ] The signed rule/fixture inventory covers every launched registration and period.
- [ ] No statutory production claim ships without named payroll/legal sign-off.

## 15. Authoritative Sources

- Income Tax Department:
  [Tax Payments FAQ](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments-faq)
  and [ITA 2025 form mapping](https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-06/Navigator%201.pdf).
- EPFO:
  [Contribution rates](https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf)
  and [Revamped ECR](https://www.epfindia.gov.in/site_en/revamped_ecr.php).
- ESIC:
  [Contribution rates](https://esic.gov.in/contribution),
  [coverage](http://esic.gov.in/coverage), and
  [Employer portal](https://portal.esic.gov.in/ESICInsurance1/ESICInsurancePortal/portallogin.aspx).
- Ministry of Labour and Employment:
  [Labour Codes](https://www.labour.gov.in/offerings/schemes-and-services/details/labour-codes-gzNzQzMtQWa)
  (codes effective 2025-11-21) and [Employer compliance handbook](https://www.labour.gov.in/static/uploads/2026/02/83978455025732b99b0165def80ab171.pdf).

Sources establish requirements and change monitoring; they do not replace
professional payroll/legal interpretation.
