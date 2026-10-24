# Startup and SMB HRMS + Payroll: product offer and competitive PRD

**Date:** 24 October 2026  
**Confirmed scope:** HRMS and payroll; startups and SMBs; India-first payroll, global-ready HR.  
**Status:** Consolidated product proposal and reading guide. Requirements describe target behavior, not shipped functionality.  
**Accountable owner:** People Product Management; domain owners remain those in the existing suite.  
**Companion evidence:** [Current competitor review](./2026-10-24-competitor-evidence.md).

## 1. Product decision

Offer a complete employee lifecycle and reliable India payroll through a small set of job-oriented workspaces. Preserve the full capability inventory behind these workspaces. Add AI where it reduces verified effort, errors, or uncertainty.

The ambition is broad coverage and excellent execution for our buyer. “Every feature of every competitor” cannot be certified from public websites: vendors have private functionality, country-specific services, different packages, and changing roadmaps. This PRD therefore defines a broad coverage envelope, explicit extension paths, and a process that makes newly discovered gaps visible. An unverified competitor cell means unknown, never absent. Product superiority must be demonstrated in buyer tasks.

This document consolidates what to offer, how to organize it, and how to sequence it. It does not replace the [suite contract](./00-suite-product-prd.md), [domain ownership](./00a-suite-domain-contracts-prd.md), [tier register](./00c-requirement-tier-traceability-prd.md), or open acceptance tasks. Proposed sidebar labels and grouping below are a presentation refinement; existing canonical route and domain contracts still govern implementation. Record any approved route/priority changes in their owner documents before coding them.

### Buyer and launch focus

- **Confirmed:** startups and SMBs. **Proposed first wedge:** 10–250 employees, including founder-operated companies and lean HR/finance teams; extend validation to 250–500. This is a go-to-market recommendation, not a user-confirmed headcount limit or a change to the suite's broader 5–2,000-worker scope.
- **Proposed initial workforce:** technology, professional services, and mixed office/remote teams; provide frontline basics and test retail/manufacturing depth before making vertical claims.
- HR records support country, currency, timezone, legal entity, language, worker type, and multiple employments without assuming Indian identity fields apply globally. Native payroll is explicitly limited to validated India country-pack coverage.
- Employees, managers, HR operators, payroll operators, finance approvers, owners, auditors, and external payroll/accounting advisers have separate scopes. A manager does not automatically see salary; an owner is not automatically an employee.

### Outcomes

1. An employer enters each worker fact once and sees its effective history.
2. A new hire becomes ready for work and payroll without duplicate entry.
3. Employees complete leave, documents, claims, and pay questions without routine HR intervention.
4. Payroll closes with explained differences, approved inputs, confirmed payouts, and reconciled obligations.
5. HR can find and complete a routine task without knowing the internal module structure.
6. Buyers understand exactly which capabilities are native, connected, customer-operated, managed, partner-delivered, beta, or unavailable.

## 2. What we should offer in the sidebar first

Use the product switcher for **Home, HRMS, Payroll, Recruitment**, plus the other existing StreamlineOS products. The user sees one active product sidebar. Recruitment remains separate; HR owns the accepted hire handoff, not a second ATS. Employee self-service remains in Home.

### HRMS: recommended workspace entry points

These are persistent destination rows. Descriptions are the contents of each workspace, not more default sidebar rows. Section headings may group the rows but must not add redundant destinations. Hide empty/unavailable groups and show advanced content only when entitled, configured, and authorized.

| Sidebar entry | Contents and primary job | Default treatment |
|---|---|---|
| Overview | Readiness, exceptions, deadlines, assigned work, quick actions | Always for authorized HR users; rename the current Hub label |
| Approvals | Assigned approvals, overdue work, delegation, batch review | One authoritative inbox; contextual links elsewhere |
| People | Directory, worker profiles, org chart, positions, reporting lines, job architecture | Standard; sensitive fields remain scoped |
| Lifecycle | Onboarding, probation, changes/transfers, exits, rehire, asset handover | Standard; operational views before the advanced journey designer |
| Time & Leave | Attendance, leave, WFH/WFO, holidays, shifts, overtime, comp-off; rosters and clock devices when enabled | Standard; configuration lives inside the workspace/settings |
| Performance & Growth | Goals, reviews, feedback, 1:1s; skills, learning, careers, succession as enabled | Standard basic views; advanced programs progressively exposed |
| Compensation & Benefits | Salary bands/review decisions; benefits, total rewards, equity when enabled | Permission/entitlement dependent; payroll executes approved pay changes |
| Employee Experience | Surveys, recognition, engagement actions, employee journeys | Enabled programs only |
| HR Services | Requests, SLAs, letters, knowledge links; restricted employee-relations case workspace | Standard; cases are independently authorized |
| Documents & Policies | Worker document operations, acknowledgments, policy versions, signatures, verification status | Standard; reuse Documents/Sign capabilities |
| Reports & Planning | Standard reports, workforce metrics; custom reports, positions/headcount/cost scenarios as enabled | Standard reports first, advanced planning later |
| Settings | Fields, forms, workflows, templates, integrations, imports, permissions, retention, audit links | Authorized operators only; advanced governance nested here |

Twelve rows is a design ceiling to validate, not a requirement to show twelve to every HR user. Smaller companies should see approximately 7–9 relevant rows after program and permission filtering. Do not create dead links to reach an item count.

### Payroll: recommended workspace entry points

| Sidebar entry | Contents and primary job |
|---|---|
| Overview | Next pay date, cutoff, readiness, funding needs, blockers and outstanding obligations |
| Run Payroll | Regular/off-cycle runs; readiness, input snapshot, calculation, differences, approval, close |
| Employees & Pay | Payroll profiles, salary assignments, salary history; structures/components/templates as secondary configuration |
| Pay Inputs | Approved time/LOP, reimbursements, bonuses, recoveries, loans, one-time adjustments and source changes |
| Payments | Bank/provider batches, funding, partial results, failures, returns, reconciliation |
| Tax & Compliance | Declarations/proofs, tax projections, PF/ESI/PT/LWF/TDS obligations, filings, receipts, corrections |
| Payslips & Documents | Preview, controlled publication, corrected versions, annual certificate retrieval and issue |
| Settlements | Leavers, recovery/encashment/gratuity applicability, final calculation, approvals and settlement status |
| Reports & Accounting | Payroll register, variance, liability reports, journals, cost allocation, reconciliation |
| Settings | Setup, entities/registrations, pay groups/calendar, bank/accounting mappings, access, imports, audit |

Payroll Team access must remain a separate authorized manager/self-service view. Do not repoint a user with only `self:payroll` to an operator page. Payments and compliance deserve their own clear destinations; they must not be buried in a generic “Payslips & reports” group.

### Employee and manager experience

Preserve the current Home hubs: **Attendance & Time Off**, **Documents & Onboarding**, **Expenses & Pay**, **Hiring & Referrals**, **Support**, and **My Team** for eligible managers. Keep announcements in Home → Company. Add future learning/reviews/benefits as contextual hub sections when enabled; do not duplicate an HR administration sidebar for employees. Keep the current owner audience rules unless an explicit employee-membership model changes them. Resignation placement can be tested inside the records/profile journey later; phase one preserves its existing access and URL.

AI is a shared contextual action and assistant entry. A dedicated AI destination is justified only for durable work such as saved analyses and reviewed automation runs. Do not add a sidebar item for every AI action.

## 3. Competition: what to match and where to learn

The [dated evidence file](./2026-10-24-competitor-evidence.md) supplies vendor-level links and qualifications. These cohorts determine what to investigate, not a ranking or an assertion that every vendor has all listed functions.

| Competitive lens | Vendors in review | Capabilities to examine and transfer into our requirements |
|---|---|---|
| India startup/SMB HR and payroll | Keka, greytHR, Zoho People + Payroll, factoHR, Pocket HRMS, HROne, RazorpayX Payroll, sumHR, ZingHR | Local payroll detail, attendance/leave, ESS, claims, corrections, implementation, support, mobile usability |
| India enterprise ceiling | Darwinbox | Configurable lifecycle, mobile HCM, talent, analytics, service, localization; use selectively for SMB simplicity |
| Connected SMB and mid-market suites | Rippling, BambooHR, HiBob, Personio | Single worker record, workflows, employee experience, performance, compensation, planning, integrations |
| Payroll and global employment | Gusto, Deel, ADP | Payroll review, correction/reconciliation, employee service, adviser workflow, country/service boundaries |
| Enterprise and frontline ceiling | Workday, SAP SuccessFactors, Oracle HCM, UKG, Paylocity, Paycom | Skills/talent, workforce scheduling, employee-driven payroll checks, service, complex controls and planning |

The shortlist is intentionally broad but not the entire market. Additional regional/vertical vendors and Paychex, Remote, Oyster, OrangeHRM, HRMantra, Wallet HR, and specialist ATS/LMS/benefits providers belong in subsequent discovery where buyer demand justifies them. They are not represented as fully researched in this review.

**AI is already part of the comparison baseline.** Rippling publicly describes source-linked, permission-aware answers and approved actions; its page also labels some automation as waitlist. Keka publicly describes AI-assisted performance workflows. Our hypotheses need outcome evidence rather than a claim of unique AI. Sources: [Rippling AI](https://www.rippling.com/platform/ai), [Keka performance](https://www.keka.com/performance-management-software).

### Competitive gap discipline

For each sub-capability, keep: vendor; exact source and review date; country; plan/add-on; native/integrated/partner/managed; generally available/beta/unknown; claim summary; scenario and limitation; StreamlineOS domain requirement; implementation state; evidence; owner; next review. Use **documented**, **partial/conditional**, **explicitly unsupported**, or **unknown**. A blank cell is an evidence task, not permission to announce a competitor gap.

For StreamlineOS use **planned, source-present, behavior-verified, pilot-verified, release-ready**. Each comparison must distinguish feature presence, functional depth, usability, reliability, service quality, total cost, and implementation effort. Monthly review and review before sales comparisons keep the ledger current; this is a proposed product process, not a scheduled automation.

## 4. Basic features: P0 foundation

The tables below are product review bundles that roll up to existing domain requirement IDs; they are not a duplicate task queue. Each bundle needs its individual scenarios from the owner PRD. “Basic” means reliable business completion, including recovery, and does not mean a landing page exists.

### HR foundation

| Review bundle | Required scope | Acceptance example |
|---|---|---|
| B01 Company and employment model | Legal entities, offices, departments, teams, cost centers, working calendars, managers, jobs, levels, positions; employees, contractors, interns; separate worker and employment records | Transfer preserves history and changes only the intended entity/employment; contractor does not accidentally enter employee payroll |
| B02 Employee master | Unique identity, duplicate detection, profile, emergency contacts, dependents, restricted identity/bank/tax records, custom fields, attachments, effective dates, employee-number rules | A salary/bank read denied in UI is also denied by API/export/search; imports do not silently duplicate workers |
| B03 Directory and reporting | Search, filters, org chart with accessible table, reporting manager requests/approval, dotted-line visibility, manager coverage | Manager departure/reassignment cannot leave an approval silently stuck or expose a former team's records |
| B04 Onboarding | Accepted-hire import, preboarding portal, task owners/dates, documents, acknowledgments, manager and IT tasks, payroll readiness | Missing bank or required registration blocks payroll readiness with a named owner; accepted hire is imported exactly once |
| B05 Employee changes | Probation, confirmation, promotion, salary revision, transfer, manager change, contract expiry, notice, rehire | Future-dated change previews impact; backdated change identifies affected payroll and requires correction workflow |
| B06 Offboarding | Resignation, exit approvals, notice/recovery, handover, assets, exit interview, access-removal handoff, service documents, FnF handoff | Exit completion reports separately whether handover, access, and final payment are done |
| B07 Documents and policies | Templates, letters, controlled uploads, versioned policies, targeted acknowledgments, expiry reminders, signature evidence | Policy acknowledged last month remains tied to that version after a replacement is published |
| B08 Attendance | Web/mobile capture, event history, work location/WFH/WFO, missing punches, regularization, approved adjustments, shift crossing midnight, timezone handling | Duplicate/imported events cannot double-pay hours; correction retains original event and reason |
| B09 Leave | Types, eligibility, accrual, balances, holidays/weekends, half days, carry-forward/encashment, cancellation, team calendar, attachments, approval | Concurrent requests cannot overspend a balance; revoked/corrected leave updates the approved pay input safely |
| B10 Shifts and overtime | Shift patterns, employee assignment, breaks, grace rules, overtime authorization, late/early/absence exceptions, holiday treatment | An overnight shift and approved overtime produce traceable hours under the applicable policy version |
| B11 Employee self-service | Profile requests, time/leave, documents, onboarding, claims status, pay/tax information, help, notification preferences, mobile access | Employee completes a leave request and finds its approver/status without HR assistance |
| B12 Manager work | Scoped team view, availability, onboarding tasks, probation, leave/time approvals, performance tasks, delegation | Delegation expires correctly and does not grant the delegate access to unrelated sensitive cases |
| B13 Unified approvals | Assigned inbox, approval history, reasons, SLAs, reminders, delegation, safe bulk actions and concurrency | Reviewer cannot approve a record edited after their preview without reviewing the updated version |
| B14 HR service | Request categories, routing, owners, attachments, response history, SLA, knowledge links; separately restricted cases | Service agent can answer a payslip question without gaining access to confidential grievance records |
| B15 Basic talent and pay decisions | Goals/OKRs, review cycles, self/manager reviews, feedback, 1:1 notes with visibility rules, basic salary bands/history, compensation budget/approval | Approved revision reaches payroll with amount, effective date, approver and provenance; private coaching notes remain private |
| B16 Connected claims/assets | Expense/travel approval handoff, duplicate reimbursement checks, custody and return checks | The same approved claim cannot be paid in both payroll and an expense payment batch |

Owners: [Core HR](./01-core-hr-lifecycle-prd.md), [Workforce](./02-workforce-management-prd.md), [Talent and rewards](./03-talent-experience-rewards-prd.md), [Employee/manager service](./04-employee-manager-service-prd.md). Existing P0/P1 subsets in the tier register remain authoritative.

### India payroll foundation

| Review bundle | Required scope | Acceptance example |
|---|---|---|
| B17 Payroll setup | Employer/statutory registrations, establishment/state coverage, pay groups, calendars/cutoffs, bank and ledger mappings, approval responsibilities, opening/YTD migration | Unsupported establishment/rule coverage is identified before the first run; migration has reconciled opening totals |
| B18 Salary design | Versioned structures, fixed/variable pay, earnings, deductions, employer contributions, taxable treatment, proration, rounding, CTC/gross/net breakdown | Approved structure produces reproducible employee and employer totals with an identifiable rule version |
| B19 Inputs and lock | New joiners/leavers, attendance/LOP, overtime, approved claims/bonuses, arrears, loan EMI/recovery, adjustments, missing-data checks, snapshots | A post-lock source change appears as a delta and cannot silently change an approved run |
| B20 Gross-to-net | Period calculation, joiner/leaver proration, arrears/retroactive revisions, leave encashment, applicable contribution/tax rules, prior employment/YTD | Same frozen inputs and rule pack produce exactly the same results; negative/zero pay has an explicit disposition |
| B21 Review and approval | Employee-level and aggregate differences, statutory exceptions, headcount changes, funding summary, maker/checker, reasoned overrides | An unexplained variance cannot disappear when dismissed; approval is invalidated by material input/result changes |
| B22 Payout | Bank file/provider batch, validation, funding, employee payment status, partial failures/returns, duplicate prevention, reconciliation | Provider timeout produces unknown status and a status enquiry before retry; a retry cannot debit employees twice |
| B23 Payslips | Preview, release schedule, employee delivery/access, pay component detail, YTD, correction/version history | Published and paid remain separate statuses; a corrected slip does not erase the prior issued version |
| B24 Statutory obligations | PF/EPS/EDLI, ESI, PT, LWF, salary TDS, applicable bonus/gratuity/other employer obligations, registration/state applicability, calendars and evidence | Generated artifact, submitted return, acknowledgment, payment, rejection and reconciliation are independently tracked |
| B25 Employee tax | Regime choice under applicable law, declarations, proofs, review, exemptions/deductions, prior employment inputs, projections and year-end/correction workflows | Rejected or late proof shows the reason, payroll impact and next available correction path |
| B26 FnF and corrections | Final salary, leave encashment, applicable gratuity/bonus, notice/loan/asset recoveries, off-cycle payouts, cancellation before payment, adjustments after close | Closed results remain immutable; corrections create linked adjustments and reconcile the revised liability |
| B27 Finance and reporting | Payroll register, employer cost, deductions/contributions, bank advice, journals, department/project allocation, statutory liabilities and reconciliation | Net pay matches payment ledger; journals balance; source totals tie to reports and statutory allocations |

Owners: [Payroll](./05-india-payroll-prd.md), [Statutory](./05a-india-payroll-statutory-prd.md), [Controls](./05b-india-payroll-controls-edge-cases-prd.md), [Transitions](./05c-payroll-statutory-transition-tables-prd.md). This inventory intentionally does not hardcode tax rates, thresholds, deadlines, or state formulas outside the versioned rule pack.

**Current India design implications:** Use governing periods and payment-date rules for the 2026 transition rather than relabeling every historical document. Official guidance identifies Form 138 as the successor to salary Form 24Q and requires Form 130 to be downloaded from TRACES after statement processing, signed and issued. Internal PDF creation alone is insufficient. Sources: [transition FAQ](https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf), [Form 138 FAQ](https://www.incometaxindia.gov.in/documents/d/guest/form-138-faqs), [Form 130 FAQ](https://www.incometaxindia.gov.in/documents/d/guest/form-130-faqs). EPFO's revamped ECR explicitly separates return submission and payment generation: [official FAQ](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/ComplianceLetter_08102025.pdf). These are product-design inputs; the complete launch rule pack still needs specialist validation for each supported scope.

### Trust, implementation and usability

| Review bundle | Required scope | Acceptance example |
|---|---|---|
| B28 Access/privacy | Tenant/entity/manager/self/field scope, sensitive-field masking, least privilege, MFA/SSO as supported, access review, adviser delegation, session changes | Scope changes revoke access in open pages, exports, saved reports, notifications, search and AI retrieval |
| B29 Audit and data lifecycle | Who/what/when/why, before/after, immutable events, export evidence, retention/deletion workflows, legal holds, privacy requests | Deletion honors an active legal hold; audit does not leak full secrets or unrestricted bank/identity data |
| B30 Migration and support | Guided setup, field mapping, dry-run imports, validation errors, opening/YTD reconciliation, parallel runs, rollback rehearsal, implementation checklist, support ownership | Customer reconciles a representative run before cutover; import retry cannot silently create duplicates |
| B31 Platform reliability | Idempotent commands, concurrency/version checks, durable events, integration retries/dead letters, backup/restore, incident communication, bounded queries | Interrupted calculation resumes safely; failed connector is visible with last successful sync and an owner |
| B32 Usability/accessibility | Search, saved filters, pagination, meaningful empty/error/denied/loading states, keyboard/mobile, localization, accessible charts/tables and forms | Core tasks pass 375/768/1280 widths, light/dark and keyboard/screen-reader review; denial never looks like an empty collection |
| B33 Commercial transparency | Feature-by-plan/country/delivery matrix, AI usage limits/cost visibility, export/exit path, onboarding and support commitments | Buyer can see supported payroll scope and service model before purchase; export has meaningful schemas and access controls |

Owner references: [Platform](./06-platform-intelligence-compliance-prd.md), [Release evidence](./06a-operations-release-evidence-prd.md), [Experience](./07b-experience-content-quality-prd.md), [Implementation](./09-implementation-migration-cockpit-prd.md). B33 is a proposed commercial acceptance addition to reconcile into the suite before implementation.

## 5. Competitive completeness: P1 advanced suite

These should not all be postponed indefinitely as “future.” They close meaningful competitive gaps once the basic journeys work. Enable them selectively for the buyer. Existing owner requirements determine exact tier splits.

| Bundle | What to offer | Surface and completion criteria |
|---|---|---|
| C01 Advanced workforce | Rosters, availability, shift swaps, skill/coverage constraints, multiple clock sources, device health, comp-off depth, consent-aware location capture, offline capture/reconciliation where supported | Time & Leave; concurrent swaps cannot break coverage; device event replay cannot duplicate hours |
| C02 Flexible lifecycle | Journey designer, conditional tasks, bulk changes, probation programs, advanced job architecture, multi-entity moves, alumni/rehire | Lifecycle; preview affected employees and preserve per-person failure/recovery |
| C03 Performance depth | Competency/KPI libraries, weighted objectives, continuous feedback, 360 programs, calibration, appeals, development actions | Performance & Growth; show reviewer visibility, bias controls, revision history and outcome ownership |
| C04 Skills and careers | Skills taxonomy/matrix, evidence/freshness, career paths, internal opportunities, mentors, mobility and recruitment handoff | Performance & Growth; worker can correct skills; opportunity handoff does not duplicate candidate ownership |
| C05 Learning | Courses, paths, assessments, certifications/renewals, required learning, completion evidence, external LMS/content connectors | Performance & Growth; imported completion names its provider and cannot silently satisfy an unrelated requirement |
| C06 Talent/succession | Critical roles, talent reviews, readiness, successors, development plans and access-controlled succession views | Performance & Growth; distinguish proposed successor from appointment; restricted data excluded from ordinary manager search |
| C07 Engagement/recognition | Pulse/lifecycle surveys, anonymous thresholds, themes, action plans, recognition/awards, moderation, budgets, company milestones | Employee Experience; suppressed small cohorts cannot be reconstructed through filters or AI |
| C08 Compensation/total rewards | Cycle worksheets, budgets, bands, calibration/pay-equity review, benefit eligibility/elections, dependent changes, benefit-provider status, grants/vesting views | Compensation & Benefits; approved decision traces to payroll; carrier enrollment remains pending until confirmed |
| C09 Payroll depth | Consolidated multi-entity operations, advanced corrections/off-cycle, flexible benefits treatment, contractor payment/withholding, loan administration, advanced variable/incentive programs | Payroll workspaces; employee vs contractor treatment stays explicit; group dashboards retain entity-level controls |
| C10 Planning/analytics | Positions/headcount approvals, scenario versions, plan vs actual cost, workforce cohorts, retention metrics, custom report builder, scheduled scoped reports | Reports & Planning; scenario does not mutate live payroll; small-cohort and salary permissions apply to aggregates |
| C11 Service/governance depth | Omnichannel intake, service catalog, SLAs/macros/CSAT, specialist cases, accommodations, safety, emergency, labor relations where applicable | HR Services and scoped governance; ordinary agents cannot access restricted cases through shared search |
| C12 Builders/ecosystem | Forms, validation, workflow/approval builder, automation dry runs, webhooks/APIs, custom reports, sandbox, reusable setup/import templates | Settings and owning workspace; versioning, loop prevention, permissions, retry and rollback are visible |
| C13 Spend/asset connection depth | Travel policy/advances/settlements, mileage/per diem where supported, receipt capture, duplicate detection, asset repair/warranty/stock handoff | Expenses/Inventory own execution; HR links custody and approved pay inputs without duplicating ledgers |
| C14 Adviser operations | External accountant/payroll adviser access, named client scope, controlled bulk status, deadline oversight, evidence export and revocation | Separate scoped adviser experience; switching clients clears cached tenant data; no shared employee visibility |
| C15 Recruitment product coverage | Requisitions/position approval, careers/jobs, application forms, candidate pipeline, sourcing/referrals, interview scheduling/scorecards, offers, signatures, verification-provider handoff, hiring analytics | Owned by Recruitment, linked from HR and manager work; approved hire carries versioned worker/position/offer data exactly once into onboarding |

C14 is a discovery proposal for SMB distribution, to reconcile with platform/domain owners before committing a new adviser workspace. Advanced capabilities use P1 only where the existing register agrees; specialist/partner-dependent extensions retain their current delivery labels.

## 6. Wow features: P2 hypotheses with measurable acceptance

AI assistance and approved automation are competitive expectations. The following are differentiation hypotheses based on StreamlineOS's connected work products; none is asserted to be absent from all competitors. Proposed numerical targets below are experiment gates, not measured results.

| Feature | User experience | Dependencies and proposed success measure |
|---|---|---|
| W01 Explain my pay | “Why is this month's net pay different?” returns component deltas, approved leave/bonus/revision facts and deep links | Frozen payroll facts and permissions; at least 95% factual accuracy on reviewed answer set, 100% cited monetary claims, no cross-worker disclosure |
| W02 Payroll preflight investigator | Rank unusual changes; explain source, expected effect, owner, corrective action and rerun impact | Historical/control baseline, no generative arithmetic; payroll team accepts at least 70% of top alerts and spends 30% less time reviewing exceptions in pilot |
| W03 Lifecycle impact preview | Before a transfer, exit or salary revision, preview pay, benefits, access, handover and work impact | Effective dates and integration contracts; 100% known material dependencies visible or marked unknown; no live changes during simulation |
| W04 People + work staffing | Match approved demand to skills, capacity, availability and permitted cost, with alternative staffing scenarios | Build/Timesheets/Calendar read models and salary scope; reduce staffing preparation time 30% in pilot without increasing overload |
| W05 Contextual HR assistant | Answer policy questions with the applicable policy version; prepare leave/profile requests; route unsupported queries to HR | Permission-filtered retrieval, citations, abstention, explicit confirmation for submission; 30% reduction in eligible routine tickets with monitored reopen rate |
| W06 Migration copilot | Suggest field mappings, flag duplicates, compare source/target balances and explain every import rejection | Dry-run importer and reconciled totals; reduce mapping/reconciliation effort 30%; no unreviewed overwrite or activation |
| W07 Compliance change workbench | Summarize an official change, identify possibly affected rules/workers, prepare validation tasks and a proposed rule-pack diff | Dated official sources and payroll/legal reviewer; every production rule change requires approved fixtures and sign-off |
| W08 Natural-language reporting | “Show approved overtime cost by project” becomes a preview of filters, measure definitions, table/chart and source links | Scoped semantic layer, deterministic aggregation, freshness; every value ties to authorized rows; export enforces the same scope |
| W09 Manager preparation | Prepare a 1:1 agenda from permitted goals, agreed feedback and work commitments; propose development actions | Explicitly shared evidence only; no private-chat surveillance, personality/health inference or automatic ratings; measure saved preparation time and manager edits |
| W10 Policy/workflow simulator | Preview who a policy affects, sample outcomes, conflicts and downstream pay impacts before publication | Versioned policy engine and sandbox; simulation never sends employee messages or changes live balances |
| W11 Exit handover assistant | Identify assigned work, approved owners and unresolved handover tasks; draft a checklist | Authorized work records, no unrestricted message scraping; reduce overdue handover tasks in a measured pilot |
| W12 Multilingual task assistance | Help a worker understand a policy or complete a supported form in their selected language; preserve original policy and controlled vocabulary | Language-specific evaluation and accessibility; supported-language task completion must match baseline quality before launch |
| W13 Employee pre-pay verification | Invite employees to flag missing time, claims or personal-data errors before cutoff, with a resolution owner and a visible status | Deterministic preview, supported privacy-safe delivery and cutoff rules; measure fewer post-pay corrections; employee review cannot change salary authority or delay the entire company's pay |

### AI product contract

Retrieve only facts the actor can read; apply tenant, worker, field and cohort permissions before model context is assembled. Use deterministic engines for pay/tax arithmetic. Answers name sources, dates and uncertainty; missing facts produce clarification or abstention. User-uploaded documents are data, not instructions to bypass access. Proposals show a structured diff, destination and impact before confirmation, then call the normal authorized API with idempotency/version controls. Pay release, employment changes, disciplinary decisions, ratings and legal conclusions require the accountable human workflow. Log evidence and outcomes with redaction, evaluate cost/latency, and provide an AI-off path for every essential task. Test retrieval leakage, malicious documents, stale policy, unsupported language, hallucinated pay facts, confirmation bypass, and duplicate retries.

## 7. Future features: P3 expansion and partner paths

| Future opportunity | What it entails | Commitment trigger |
|---|---|---|
| Additional native payroll countries | Country rules, calendars, registrations, forms, local corrections, support and legal operations | Validated demand plus named country owner, maintained rule pack and signed end-to-end fixtures |
| EOR/PEO/contractor-of-record | Employment/service contracts, partner responsibilities, funding, onboarding and termination evidence | Contracted country coverage and clear regulated-service/provider ownership |
| Managed payroll/BPO | Operator service console, SLAs, delegated access, exception handling, continuity and audit | Sustainable delivery economics and named service-accountability model |
| Benefits marketplace | Insurance/carrier connections, enrollment/claims, renewal and brokerage responsibility | Licensed/contracted partners, eligibility/confirmation/reconciliation evidence |
| Financial wellbeing | Earned-wage access, salary-linked credit, pensions, savings or insurance connections | Buyer demand, appropriate licensed partners, consent and recovery/failure model |
| Equity execution | Cap-table/brokerage integrations, exercise, tax events, settlements | Named provider and legal/tax sign-off; grant visibility stays an earlier capability |
| Vertical workforce packs | Retail/hospitality staffing, manufacturing clocks, field teams, contractor-heavy operations, agreements | Customer pilots prove the specific vertical's scheduling/pay/operating rules |
| Global mobility | Visa/work authorization, relocation, international-worker payroll issues | Specialist partners and country-specific applicability review |
| Deeper IT lifecycle | Device provisioning/retrieval and app access automation | Integrate dedicated IT providers; custody tracking already belongs in basic HR |
| Advanced labor/enterprise packs | Collective agreements, works councils, enterprise safety/legal case depth | Confirmed enterprise demand; preserve the existing P1 specialist scope rather than moving it wholesale to P3 |
| Market intelligence | Licensed salary benchmarks, skills-market signals and external workforce comparisons | Licensed data, representative cohorts, privacy and explainable provenance |
| Retirement trust administration | Specialized PF trust, pension or superannuation administration beyond ordinary contribution calculations | Confirmed buyer demand, domain expertise, applicable operating authority and reconciled specialist records |

These are opportunities, not a promise to implement every country or regulated service. Extension contracts should exist earlier so expansion does not require replacing the worker/payroll model.

## 8. A sidebar refactor that preserves existing work

### Source findings from this review

Reviewed the current HR group assembly, HR foundation/experience/governance/settings route modules, Payroll group module, Home hubs, product definitions, navigation types and path-to-product resolution. This was a source inspection; no live application or backend completion audit was performed.

- HR currently assembles five broad groups. People Ops combines cases, expenses, rewards, analytics, workforce and performance, which obscures the user's job.
- Payroll currently assembles four groups, with components/templates/structures as prominent rows and bank transfers/taxes under Payslips & reports.
- Home already consolidates employee jobs into the current self-service hubs; do not recreate a retired My Day or another employee dashboard.
- Reimbursements are still linked from current HR navigation although the owner contract places their execution in Payroll. Current `/hr/fnf` and `/payroll/fnf` also require explicit handoff preservation.
- `getProductFromPathname` derives its prefix index from navigation plus exceptions. Removing a sidebar row can therefore change the active product of a still-valid deep route. Any destination moved to a hub needs explicit ownership preserved independently of whether it remains a sidebar row.
- Parent group permission lists can hide otherwise valid children. Review group filtering as well as row permissions, module entitlements, and owner audience metadata.

### Phase-one destination mapping

This table preserves **current observed hrefs** for a reversible navigation pass. It does not assert that every linked workflow works. Where newer suite contracts name a future canonical route, migrate that later with an explicit route map and tests.

| Current destination(s) | Proposed presentation | Preservation rule |
|---|---|---|
| `/hr`, `/hr/approvals` | Overview; Approvals | Preserve hrefs, exact active state and approval permissions |
| `/hr/employees`, `/hr/org-chart`, `/hr/positions`, `/hr/org`, manager coverage/requests/changes | People and its scoped tabs/links | Preserve all deep links, query state and reporting-manager access |
| `/hr/onboarding`, `/hr/exit`, `/hr/termination`, `/hr/asset-returns`, `/hr/assets` | Lifecycle; custody/returns within employee/exit context | Preserve independent asset access for asset operators; no route deletion |
| `/hr/attendance`, `/hr/leaves`, `/hr/shifts`, `/hr/rosters`, `/hr/overtime`, `/hr/comp-off`, `/hr/holidays`, `/hr/geofencing`, `/hr/devices`, `/hr/biometric`, `/hr/work-logs` | Time & Leave; operational tabs and contextual configuration | Preserve existing views first; future `/hr/scheduling` or `/hr/time-clocks` requires a separate route migration |
| `/hr/performance`, `/hr/goals`, `/hr/kpis`, `/hr/feedback`, performance analytics, skills/expert views | Performance & Growth | Skills/expert links may also appear contextually in People; one mutable skills owner |
| `/hr/benefits`, `/hr/compensation-planning`, `/hr/equity` | Compensation & Benefits | Preserve scoped child access when parent benefit access is denied |
| `/hr/engagement` | Employee Experience | Hide until relevant program/permission exists; no fake new recognition route |
| `/hr/cases`, `/hr/helpdesk`, `/hr/service-delivery`, `/hr/accommodations` | HR Services with separately restricted cases | Do not share case content with ordinary support agents |
| `/hr/documents`, document types/review, handbook, email templates, background verification | Documents & Policies and its configuration | Background verification still requires sensitive-data permission and provider status |
| `/hr/analytics`, `/hr/workforce`, `/hr/workforce-cost`, `/hr/contingent` | Reports & Planning; contingent-worker operational links stay contextual | Preserve product ownership for every hidden-from-sidebar deep route |
| `/hr/expenses`, `/hr/travel`, `/hr/fnf` | Contextual links to the owning Expenses/Payroll job | Preserve distinct operational jobs and permissions until each is migrated |
| `/hr/reimbursements` | Removed duplicate HR page; `/payroll/reimbursements` is the canonical operations page | Payroll route retains the same `hr:payroll:view` gate and reimbursement API; no legacy redirect |
| `/hr/settings/*`, governance specialist routes | Settings and authorized governance workspaces | Restricted operations cannot be made accessible merely by nesting them |
| `/payroll`, `/payroll/readiness`, `/payroll/runs` | Overview; Run Payroll with readiness inside | Keep `/payroll/readiness` deep-linkable; run readiness isn't a second payroll process |
| `/payroll/employees`, `/payroll/salary-structures`, `/payroll/templates`, `/payroll/components` | Employees & Pay; configuration links inside | Preserve actual current salary-structures path; do not silently substitute target `/payroll/structures` |
| `/payroll/inputs`, `/payroll/reimbursements`, `/payroll/bonuses`, `/payroll/loans` | Pay Inputs and scoped subviews | Preserve business ownership, export access and input-source identity |
| `/payroll/bank-transfers`, `/payroll/taxes`, `/payroll/payslips`, `/payroll/fnf`, `/payroll/reports` | Payments; Tax & Compliance; Payslips & Documents; Settlements; Reports & Accounting | Use current hrefs first; future payout/statutory route names are separate decisions |
| `/payroll/access`, `/payroll/settings`, `/payroll/setup`, `/payroll/team` | Settings/setup; independent scoped team view | Preserve existing deep routes and manager/self-service scopes; verify route inventory before moving setup |

### Delivery and acceptance

1. Freeze a full route/page/API and navigation inventory at a named revision; include `page.tsx` and any route handlers, hub links, notifications, search, command palette and exports. Record source-present versus behavior-verified.
2. Produce a destination manifest: stable ID, owner/product, current/canonical href, aliases if any, search terms, entitlement, permissions, self/team/entity scope, audience rule, parent, badge owner and visibility. Reuse the existing navigation model rather than maintaining independent mobile/command lists.
3. Change labels/order/grouping first. Use the existing underlying pages and URLs. Add necessary secondary links before removing a primary row. Keep configuration and advanced programs discoverable through contextual links/search.
4. Preserve path-to-product resolution explicitly for every displaced route. Search synonyms such as Hub, FnF, Bank Transfers, biometric and payslips must continue finding the right authorized destination.
5. Run denied cases first: employee, manager, HR-only, payroll-only, finance approver, asset-only operator, owner without employee membership, adviser, revoked access, disabled module, parent-denied/child-allowed, cross-entity and cross-tenant requests. Verify API and field access separately from link visibility.
6. Test refresh/back/forward, bookmarked URLs, query filters, active item, tab state, notices/deep links, unsaved edits, collapsed nav, badges, keyboard, small screens and light/dark. Verify a contextual HR→Payroll handoff does not create an access-denied dead end.
7. Release behind a reversible navigation configuration to a pilot cohort. Retain the old layout configuration for rollback; do not duplicate business data or leave two competing canonical routes. Route/data migrations are separate reviewed changes with their own recovery.
8. Graduate only when every previously reachable authorized destination is reachable, there are no new predictable denial/dead links, and representative users find common tasks faster. Reverting layout cannot undo already performed business actions; keep navigation changes free of business-state mutations.

No implementation changes are included with this planning deliverable. Existing unfinished acceptance items remain open until their required evidence passes.

## 9. End-to-end journeys and release gates

| Journey | Required completion and recovery |
|---|---|
| Setup → first payroll | Establishment applicability, import dry run, YTD/opening reconciliation, mapped ledger/bank, parallel calculation, approved cutover; stop on unresolved material difference |
| Accepted hire → first pay | Exactly-once handoff, effective employment/manager, required documents, payroll readiness, correct joiner proration, payslip and payment status |
| Leave/attendance → payroll | Approved event/policy, reconciled balance/hours, frozen input version, LOP/overtime treatment, visible late correction |
| Review → pay revision | Budget and approval, effective salary change, arrears if applicable, next-run variance and employee explanation; no AI-generated compensation decision |
| Run → payment → accounting | Snapshot, calculate, review, maker/checker, immutable lock, payout with unknown/partial failure recovery, payslip issue and balanced journals |
| Tax obligation → accepted evidence | Applicability/rule version, validated artifact, filed/processed status, authority evidence, payment and reconciliation; reject and correct without false completion |
| Exit → final closure | Notice/handover/assets/access tasks, final calculation, approval/payment, certificates and separately tracked unfinished obligations |
| Access change → continued use | Immediate scope enforcement in open tabs, cached data, search, export, reports, notifications and AI; manager reassignment updates approval ownership safely |

All journeys need tenant/object/field authorization, concurrency, repeated-command, stale-input, partial-provider and recovery cases. Test an intentionally denied or invalid action before its successful equivalent. Release gates include source/API/database behavior, browser tasks, provider evidence where relevant, payroll/legal fixtures, accessibility, operations and customer pilot sign-off. A document check or route render proves none of these by itself.

## 10. Sequence and proposed commercial offer

Do not confuse the complete portfolio with one release. Preserve the existing priority register: P0 foundation → P1 suite depth → P2 measured differentiation; P3 requires separate market/provider evidence. P2 experiments may start earlier in a sandbox once their specific underlying facts are reliable, but cannot weaken payroll launch gates.

| Wave | Deliverable | Exit condition |
|---|---|---|
| 0: Decide and simplify | Confirm buyer/workforce slice, validate 10 representative buyer/operator interviews, current feature evidence audit, clickable sidebar prototype and migration manifest | Product/design/payroll agree target jobs and scope; no unsupported shipped-feature claims |
| 1: Reliable foundation | Complete existing P0 HR, workforce, self-service, basic talent/compensation, platform and India payroll journeys; migrate navigation incrementally | All applicable existing P0 gates and parallel-run controls pass; pilots complete setup-to-paid-payroll and exit-to-settlement |
| 2: Competitive suite | Prioritize P1 by buyer demand: rosters/clocks, richer performance, engagement, learning, benefits, workflow/report builders and planning | Each enabled module passes its owner contract and customer task tests; unused modules remain hidden |
| 3: Demonstrated advantage | W01/W02/W03/W06 first; W04 as connected work adoption supports it; expand other AI hypotheses by evidence | Measured pilot improvement with no control, accuracy, privacy or support regression |
| 4: Expansion | Countries, verticals and regulated/managed partners | Country/service business case, operations, contracts and compliance evidence complete |

**Proposed packaging:** Core People; India Payroll add-on (can connect to an external HR source); Growth & Experience add-on; advanced AI allowance/add-on; partner services separately disclosed. Do not gate essential audit, secure access, payroll correctness, correction paths, basic export or recovery behind a premium tier. Base features must be complete in the package that claims them. Validate actual pricing and packaging in buyer interviews; this PRD does not assert a market price.

### Targets to validate in pilots

| Measure | Proposed acceptance target | Measurement boundary |
|---|---|---|
| Find common tasks | At least 90% of representative users find the intended destination within 15 seconds | Defined employee/manager/HR/payroll task set; compare current vs proposed nav |
| Complete common tasks | At least 95% successful completion without facilitator intervention | Request leave, approve, retrieve payslip, onboard, resolve payroll exception; report per persona |
| Payroll correctness | 100% of signed deterministic fixtures pass; no unexplained material parallel-run differences | Supported establishment/state/worker types only; zero tolerance for duplicate disbursement |
| Operational payroll | Two consecutive representative parallel cycles reconciled before live cutover | Payroll and finance sign-off; every remaining difference documented and resolved |
| AI improvement | At least 30% median task-time reduction for the selected eligible workflow | Predefined baseline and participant mix; measure rework/errors and cost alongside time |
| Reliability | Proposed 99.9% monthly service availability; p95 common list/search response within 2 seconds at agreed representative tenant load | Instrument service vs page metrics separately; exclude no failures merely because the provider caused them |
| Recovery | Proposed RPO no more than 15 minutes and RTO no more than 4 hours, with restore drill evidence | Reconcile any provider-side actions after restore; final operations contract controls production promises |
| Customer outcomes | Track activation, payroll on-time completion, correction rate, support contacts per 100 workers, onboarding hours and retention | Establish baselines first; don't publish invented customer results |

Numbers here are proposed discovery/service targets and must be reconciled with the existing operations PRD and infrastructure cost before customer commitments. They are not current measured performance or a silent relaxation of a stronger existing gate. No delivery date is promised without an implementation audit and capacity estimate.

## 11. Definition of done and remaining discovery

The offer is complete for a declared release when every in-scope capability has an owning domain requirement, actor, country/plan/delivery label, working end-to-end journey, failure/recovery contract and release evidence. The sidebar is complete when these jobs remain discoverable under the correct actor/product, including hidden-from-sidebar secondary pages. Competitive review is complete for a declared comparison only when the vendor cells supporting that comparison have current evidence and qualifications.

The next product questions are workforce mix (knowledge work versus shift/field/manufacturing), first company-size slice, initial India establishments/states, languages, bank/accounting/device/signature partners, desired self-service versus managed implementation, and buyer budget/support expectations. They affect rollout order and supported claims, not whether we can document the inventory now. Validate them through interviews and implementation discovery before final estimation.

For detailed business rules follow the [existing suite index](./README.md); for current market evidence follow the [competitor review](./2026-10-24-competitor-evidence.md); for unfinished implementation use the [gap routing map](./10-current-product-gaps-prd.md). Do not infer missing or completed StreamlineOS functionality from this proposal or from competitor marketing.


## Architecture review execution routing (2026-10-24)

The preserved [architecture HTML](./architecture-review/2026-10-24-architecture-review.html)
is fully mapped into [PRD 16](./16-architecture-hardening-prd.md): 40 additive
requirements and 158 atomic acceptance criteria. Use [guide 17](./17-claude-architecture-execution.md)
for implementation/resume and the [ledger](./architecture-review/execution-ledger.json)
for status. Its programs are planning groups; dispatch exact outcome children,
not a whole domain/folder. Existing legacy snapshot counts and open criteria
remain historical acceptance sources and are not silently replaced or marked complete.
The [coverage map](./architecture-review/html-prd-coverage.json) preserves all
268 semantic report points, including source evidence and caveats. A passing
document validator is not implementation or release evidence.
