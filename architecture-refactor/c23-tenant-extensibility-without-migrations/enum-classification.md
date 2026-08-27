# Enum Classification — System State Machines vs. Tenant Taxonomy

**Produced by ticket c23-01.** This is the deliverable that unblocks c23-02.

---

## Scan methodology

Pattern used: `pgEnum\(` in `backend/src/db/schema/**/*.ts`.

**Result: 422 total occurrences across 73 files.** The PRD's figure of 415 was correct at authoring time; 7 enums were added in the interim. The count is not a round number and is close enough to confirm the scan is not broken. Every `pgEnum(` call in a schema file is a declaration — column-site usage calls the returned function by name (e.g., `statusEnum("status")`), not `pgEnum`, so no column usage appears in this count.

Concentration: `common/enums.ts` (177), `e-sign/enums.ts` (17), `timesheets/enums.ts` (17), `hr/governance.ts` (12), `hr/enterprise-ops.ts` (10), `hr/enterprise-comp.ts` (10).

---

## The split

| Classification | Count |
|---|---|
| SYSTEM STATE MACHINE — stays an enum | 362 |
| TENANT TAXONOMY — becomes a lookup table | 54 |
| UNCERTAIN — see notes | 6 |
| **Total** | **422** |

The PRD's "306 taxonomies" counts every status/stage/priority/category enum as taxonomy. After applying the branching test, the real tenant-extensible population is **54**. The remainder look like taxonomy but have code that branches on specific values — moving them to a lookup table means the code would meet a value it cannot handle.

---

## Full classification

Legend: **S** = System state machine. **T** = Tenant taxonomy. **U** = Uncertain.

### module: common (177 enums in enums.ts + 7 in other files)

| Enum | Classification | Reason |
|---|---|---|
| `ticketTypeEnum` (EPIC, STORY, TASK, BUG) | **S** | Template fields, backlog hierarchy, and reporting differ per type |
| `ticketStatusEnum` (TODO, IN_PROGRESS, IN_REVIEW, DONE) | **T** | Build already replaced this with text FK into per-project status table; the enum in common is the legacy pattern the migration propagates away from |
| `ticketPriorityEnum` (LOW, MEDIUM, HIGH, URGENT) | **T** | Priority is a label. SLA rules JOIN against it but no branch runs different logic per value |
| `projectStatusEnum` (ACTIVE, COMPLETED, ARCHIVED) | **S** | Code filters active projects and blocks mutation of archived ones |
| `managedProductStatusEnum` (active, archived) | **S** | Soft-delete pattern — code filters `active` |
| `workerEngagementStatusEnum` (PLANNED, ACTIVE, COMPLETED, TERMINATED, CANCELLED) | **S** | Code filters `ACTIVE` engagements; TERMINATED triggers different cleanup |
| `stateGroupEnum` (backlog, unstarted, started, completed, cancelled) | **S** | Maps a tenant status to a canonical group for done/not-done calculation; code reads the group, never the raw status |
| `cycleStatusEnum` (draft, active, completed) | **S** | Sprint lifecycle — only one active sprint permitted; state gate enforced |
| `moduleStatusEnum` (backlog, planned, in-progress, completed, paused, cancelled) | **S** | Build module feature lifecycle state machine |
| `intakeStatusEnum` (pending, accepted, declined, duplicate) | **S** | Intake processing state — accepted triggers project creation |
| `intakeSourceEnum` (manual, web_form, email) | **S** | Different parsing + routing per source |
| `workItemRelationTypeEnum` (blocks, blocked_by, duplicate_of, relates_to) | **S** | Blocking logic and cycle detection branch on type |
| `viewLayoutEnum` (board, list, table, calendar, gantt) | **S** | Each value renders a fundamentally different UI component; adding a value needs frontend code |
| `leaveStatusEnum` (PENDING, APPROVED, REJECTED, CANCELLED) | **S** | Approval workflow state machine |
| `expenseStatusEnum` (DRAFT, SUBMITTED, PENDING, APPROVED, REJECTED, REIMBURSEMENT_PENDING, REIMBURSED, PAID) | **S** | Complex approval + reimbursement state machine |
| `assetStatusEnum` (AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED) | **T** | Label — no code branches on specific value. Tenants want IN_REPAIR, LOST, DONATED, etc. |
| `documentTypeEnum` (CONTRACT, CERTIFICATE, ID_PROOF, PAYSLIP, POLICY, OFFER_LETTER, RESUME, OTHER) | **T** | Classification label only; tenants want NDA, VISA_COPY, BANK_STATEMENT, etc. |
| `reviewStatusEnum` (DRAFT, IN_PROGRESS, COMPLETED, ARCHIVED) | **S** | Performance review cycle state machine |
| `onboardingStatusEnum` (PENDING, IN_PROGRESS, COMPLETED, REJECTED) | **S** | Employee onboarding workflow state |
| `genderEnum` (MALE, FEMALE, OTHER) | **U** | See uncertain notes |
| `wfhRequestStatusEnum` (PENDING, APPROVED, REJECTED) | **S** | Approval workflow state |
| `deviceStatusEnum` (ACTIVE, INACTIVE, LOST, RETURNED) | **T** | Label; tenants want STOLEN, IN_REPAIR, DECOMMISSIONED |
| `reviewCycleStatusEnum` (DRAFT, ACTIVE, COMPLETED, CANCELLED) | **S** | Cycle state machine — only one active cycle can run |
| `meetingStatusEnum` (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW) | **S** | Meeting lifecycle; NO_SHOW triggers different reporting |
| `resignationStatusEnum` (SUBMITTED, PENDING_HR, HR_APPROVED, FINAL_APPROVED, IN_PROGRESS, APPROVED, WITHDRAWN, COMPLETED, REJECTED) | **S** | Complex multi-stage HR approval workflow |
| `exitChecklistStatusEnum` (PENDING, DONE) | **S** | Binary checklist item completion |
| `ackStatusEnum` (PENDING, ACKNOWLEDGED, DECLINED) | **S** | Acknowledgment lifecycle — DECLINED triggers escalation |
| `reimbursementStatusEnum` (PENDING, APPROVED, REJECTED, PAID) | **S** | Approval + payment flow |
| `loanStatusEnum` (PENDING, APPROVED, ACTIVE, REPAID, REJECTED) | **S** | Loan lifecycle with payment schedule |
| `pipStatusEnum` (ACTIVE, EXTENDED, COMPLETED, TERMINATED) | **S** | Performance improvement plan state machine |
| `surveyStatusEnum` (DRAFT, ACTIVE, CLOSED) | **S** | Survey lifecycle — responses only accepted while ACTIVE |
| `feedbackTypeEnum` (SELF, PEER, MANAGER, SKIP_LEVEL) | **S** | `documents.service.ts` has `switch(category)` branching on feedback direction to determine what content is visible to whom |
| `bonusTypeEnum` (PERFORMANCE, FESTIVAL, REFERRAL, SPOT, ANNUAL, JOINING, RETENTION, COMMISSION, ADJUSTMENT) | **T** | Classification label; tenants want SIGN_ON, RETENTION_EXTENDED, PROJECT, SPOT_RECOGNITION, etc. |
| `fnfStatusEnum` (DRAFT, PENDING_APPROVAL, APPROVED, PAID, HR_REVIEW, FINANCE_REVIEW) | **S** | Full and final settlement multi-step approval workflow |
| `terminationStatusEnum` (DRAFT, PENDING_FINAL, APPROVED, REJECTED, SENT, COMPLETED) | **S** | Termination workflow state |
| `onboardingDocStatusEnum` (PENDING, IN_PROGRESS, SUBMITTED, APPROVED) | **S** | Document collection workflow |
| `onboardingDocumentStatusEnum` (PENDING, SUBMITTED, APPROVED, REJECTED, RE_UPLOAD_REQUESTED) | **S** | Document review cycle; RE_UPLOAD_REQUESTED triggers a prompt to the employee |
| `docAuditActionEnum` (UPLOADED, APPROVED, REJECTED, RE_UPLOAD_REQUESTED, RE_UPLOADED) | **S** | Audit log event type |
| `leadEmailDirectionEnum` (sent, received) | **S** | Different rendering and threading logic per direction |
| `leadTaskStatusEnum` (open, done) | **S** | Task completion state |
| `clientAccountStatusEnum` (ACCOUNT_OPENING, QUERIES, PLAN_SELECTED, INVESTED) | **T** | CRM pipeline stage label; a broker/financial org would want completely different stage names |
| `incentiveStatusEnum` (PENDING, APPROVED, REJECTED, ADDED_TO_PAYROLL) | **S** | ADDED_TO_PAYROLL triggers actual payroll integration |
| `scoringOperatorEnum` (eq, gt, lt, contains, in) | **S** | Rule evaluation logic; each operator runs different comparison code |
| `assignmentRuleTypeEnum` (assign_user, round_robin, weighted_round_robin, least_loaded, territory) | **S** | Each value invokes a different assignment algorithm |
| `slaAppliesToEnum` (lead, deal, both) | **S** | Determines which entities the SLA policy covers |
| `slaPriorityEnum` (low, medium, high, urgent) | **T** | Priority label mirroring ticket priority; same argument applies |
| `orgSizeEnum` (1-10, 11-50, 51-200, 201-1000, 1000+) | **U** | See uncertain notes |
| `membershipStatusEnum` (INVITED, ACTIVE, SUSPENDED, LEFT) | **S** | Access control gate — SUSPENDED blocks login, LEFT removes access |
| `crmPersonRoleEnum` (sales_rep, csm) | **S** | Determines dashboard, commission and goal assignment |
| `crmHealthEnum` (healthy, at_risk, critical) | **T** | Calculated health score label; tenants want custom thresholds and names |
| `crmDealStageEnum` (Discovery, Qualified, Proposal, Negotiation, Closed Won) | **T** | CRM already has a pipeline/stages table. This enum is the legacy pattern being replaced; CRM stage names are the canonical customer demand case |
| `crmCampaignStatusEnum` (active, paused, completed) | **S** | Campaign state machine — paused stops outreach |
| `crmLeadStatusEnum` (visitor, lead, mql, sql, opportunity) | **T** | Marketing funnel stage labels; what constitutes MQL/SQL differs completely per organization |
| `crmSupportTicketStatusEnum` (new, in_progress, resolved, closed) | **T** | Support pipeline stage; tenants want WAITING_ON_CUSTOMER, ESCALATED, etc. |
| `crmSupportTicketPriorityEnum` (critical, high, medium, low) | **T** | Priority label |
| `crmActivityTypeEnum` (deal_won, meeting, proposal, call, email, ticket, escalation, task_completed) | **S** | Different rendering, notification and reporting per activity type |
| `crmConsentChannelEnum` (EMAIL, SMS, WHATSAPP, PHONE, POST) | **S** | Maps to a specific delivery provider |
| `crmConsentStatusEnum` (OPTED_IN, OPTED_OUT, UNKNOWN) | **S** | Determines whether a communication may be sent |
| `crmConsentSourceEnum` (USER_ENTRY, IMPORT, WEB_FORM, UNSUBSCRIBE_LINK, API, ENRICHMENT) | **S** | Provenance record for compliance audit |
| `crmLegalBasisEnum` (CONSENT, CONTRACT, LEGITIMATE_INTEREST, LEGAL_OBLIGATION) | **S** | GDPR legal basis; each value has different retention, suppression and deletion rules |
| `jobPostingStatusEnum` (DRAFT, OPEN, PAUSED, CLOSED, FILLED) | **S** | Application intake only open when status = OPEN; FILLED triggers offer/close flow |
| `candidateStatusEnum` (NEW, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED) | **T** | `recruitment-candidates.service.ts` has a hardcoded transition table (`NEW: ["SCREENING", "REJECTED"]`) — but this IS the configuration that moves into the Build-style transitions table. The transitions are data, not logic; no branch computes different business rules per stage. Tenants want PHONE_SCREEN, CODING_TEST, CULTURE_FIT, REFERENCE_CHECK |
| `interviewTypeEnum` (PHONE, VIDEO, ONSITE, TECHNICAL, HR, FINAL) | **T** | Category label; tenants want CASE_STUDY, PANEL, PAIR_PROGRAMMING, TAKE_HOME |
| `interviewResultEnum` (PENDING, PASSED, FAILED, NO_SHOW) | **S** | PASSED/FAILED drives candidate advancement; NO_SHOW triggers reschedule logic |
| `applicationStatusEnum` (APPLIED, SHORTLISTED, INTERVIEWING, OFFERED, ACCEPTED, REJECTED, WITHDRAWN) | **T** | Job application pipeline stages; same pattern as candidateStatus |
| `chatMessageTypeEnum` (text, lead_submission, system) | **S** | Different rendering, parsing and handling per type |
| `notificationTypeEnum` (INFO, SUCCESS, WARNING, ERROR) | **S** | Visual rendering and severity routing differ per type |
| `notificationPriorityEnum` (LOW, NORMAL, HIGH, CRITICAL) | **S** | CRITICAL bypasses quiet hours; HIGH can bypass depending on policy |
| `notificationCategoryEnum` (SECURITY, CRM, HRMS, ...) | **S** | Routes to preference filtering and module-scoped delivery rules |
| `broadcastStatusEnum` (DRAFT, SCHEDULED, QUEUED, SENDING, SENT, CANCELLED, FAILED) | **S** | Broadcast queue state machine |
| `notificationChannelEnum` (IN_APP, EMAIL, PUSH, SMS, WHATSAPP, WEBHOOK) | **S** | Each value maps to a different provider implementation |
| `notificationDeliveryStatusEnum` (PENDING, QUEUED, SENDING, SENT, DELIVERED, READ, CLICKED, FAILED, BOUNCED, SUPPRESSED, CANCELLED, DEAD) | **S** | Complex delivery retry and dead-letter state machine |
| `notificationQueueStatusEnum` (PENDING, LOCKED, DONE, FAILED, DEAD) | **S** | Queue worker processing state |
| `notificationPolicyScopeEnum` (ORG, ROLE, DEPARTMENT, TEAM, PROJECT) | **S** | Determines audience expansion query |
| `notificationProviderEnum` (SMTP, TWILIO, META_WHATSAPP, WEBHOOK, WEB_PUSH, INTERNAL, SANDBOX) | **S** | Selects provider implementation class |
| `notificationQuietHoursBehaviorEnum` (respect, bypass_if_high, always_bypass) | **S** | Determines send vs. hold decision |
| `notificationSuppressionReasonEnum` (DEDUPE, MUTE, UNSUBSCRIBE, INVALID_RECIPIENT, RATE_LIMIT, QUIET_HOURS, NO_PROVIDER, CONSENT_MISSING, CHANNEL_DISABLED, COST_LIMIT, NO_ACCESS) | **S** | Suppression reason logged for debuggability and compliance |
| `invoiceStatusEnum` (DRAFT, ISSUED, SENT, PARTIALLY_PAID, OVERDUE, PAID, FAILED, VOIDED) | **S** | Payment processing state machine; VOIDED and PAID are terminal, PARTIALLY_PAID changes displayed balance |
| `supportTicketStatusEnum` (OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED) | **T** | Support ticket pipeline; tenants want WAITING_ON_VENDOR, ESCALATED, PENDING_CUSTOMER_APPROVAL |
| `supportTicketPriorityEnum` (LOW, MEDIUM, HIGH, URGENT) | **T** | Priority label |
| `kbAudienceEnum` (internal, public, mixed) | **S** | Access control for KB spaces — public bypasses member check |
| `kbSpaceRoleEnum` (viewer, commenter, editor, publisher, admin) | **S** | Permission level; each value unlocks different actions |
| `kbTranslationStatusEnum` (draft, in_progress, translated, published, outdated) | **S** | Editorial workflow state |
| `quoteStatusEnum` (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED) | **S** | Quote lifecycle; ACCEPTED triggers order creation |
| `subscriptionStatusEnum` (TRIAL, ACTIVE, PAST_DUE, CANCELLED, SUSPENDED, EXPIRED) | **S** | Billing and feature access gating |
| `subscriptionPlanEnum` (STARTER, PROFESSIONAL, ENTERPRISE) | **S** | Plan gates feature availability |
| `taskEntityTypeEnum` (LEAD, DEAL, CONTACT, PROJECT) | **S** | Polymorphic link resolution; each value queries a different table |
| `taskStatusEnum` (pending, completed, cancelled) | **S** | Task completion state |
| `blogPostStatusEnum` (draft, published, archived) | **S** | Content publication state |
| `accountTypeEnum` (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE) | **S** | Accounting normal balance (DEBIT vs CREDIT) and P&L vs balance sheet placement differ per type |
| `journalEntryStatusEnum` (DRAFT, PENDING_APPROVAL, POSTED, VOID) | **S** | POSTED entries are immutable; VOID requires a reversal entry |
| `invProductStatusEnum` (ACTIVE, INACTIVE, DISCONTINUED) | **S** | DISCONTINUED blocks new sales orders |
| `invAdjReasonEnum` (PURCHASE, SALE, RETURN, DAMAGE, EXPIRY, THEFT, RECOUNT, OTHER) | **T** | Adjustment reason label; tenants want SAMPLE, PROMOTIONAL_GIVEAWAY, RECALL, PRODUCTION_USE |
| `invTxnTypeEnum` (PURCHASE, SALE, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, ...) | **S** | Each type maps to different stock ledger entries and accounting postings |
| `invPoStatusEnum` (DRAFT, SENT, PARTIAL, RECEIVED, CLOSED, CANCELLED) | **S** | Purchase order state machine; RECEIVED triggers GRN creation |
| `invSoStatusEnum` (DRAFT, CONFIRMED, PARTIALLY_RESERVED, RESERVED, PICKED, PACKED, SHIPPED, PARTIALLY_SHIPPED, INVOICED, CANCELLED, CLOSED) | **S** | Complex sales order fulfillment state machine |
| `invTransferStatusEnum` (PENDING, RESERVED, IN_TRANSIT, COMPLETED, CANCELLED) | **S** | Inventory transfer lifecycle |
| `invLocationTypeEnum` (ZONE, AISLE, RACK, BIN, RECEIVING, SHIPPING, QUARANTINE, SCRAP, TRANSIT, RETURNS) | **S** | Location type determines valid operations (e.g., QUARANTINE blocks picks) |
| `invGrnQualityEnum` (ACCEPTED, REJECTED) | **S** | Quality check outcome — REJECTED routes to returns processing |
| `invAdjustmentStatusEnum` (DRAFT, PENDING_APPROVAL, APPROVED, PENDING_POST, POSTED, CANCELLED) | **S** | Adjustment approval and GL posting state machine |
| `invReturnStatusEnum` (DRAFT, POSTED, CANCELLED) | **S** | Return posting state |
| `appInstallStatusEnum` (TRIALING, ACTIVE, CANCELLED) | **S** | App marketplace subscription state |
| `aiCreditTxnTypeEnum` (PURCHASE, USAGE, REFUND, PLAN_GRANT, EXPIRY) | **S** | Credit ledger transaction type; each has different sign convention and accounting |
| `aiCreditReservationStatusEnum` (RESERVED, SETTLED, RELEASED) | **S** | Credit reservation lifecycle for atomic reserve-then-consume |
| `affiliateStatusEnum` (PENDING, ACTIVE, SUSPENDED) | **S** | Affiliate account state |
| `commissionStatusEnum` (PENDING, APPROVED, PAID, CANCELLED) | **S** | Commission payment flow |
| `referralStatusEnum` (PENDING, SIGNED_UP, ACTIVATED, REWARDED, EXPIRED) | **S** | Referral lifecycle with reward trigger |
| `revenueEventTypeEnum` (new_subscription, upgrade, downgrade, churn, reactivation, addon_purchase, refund) | **S** | Revenue recognition and MRR calculation differ per event type |
| `enterpriseQuoteStatusEnum` (DRAFT, PENDING_APPROVAL, APPROVED, SENT, ACCEPTED, REJECTED, EXPIRED) | **S** | Enterprise quote approval workflow |
| `payrollRunStatusEnum` (PREPARING, DRAFT, PREVIEW_READY, EXCEPTIONS_FOUND, PENDING_APPROVAL, APPROVED, LOCKED, PAID, PAYSLIPS_PUBLISHED, CLOSED, REOPENED) | **S** | Payroll run is the strictest state machine in the system; LOCKED prevents any modification |
| `payrollWorkerTypeEnum` (EMPLOYEE, CONTRACTOR, CONSULTANT, INTERN, EOR) | **U** | See uncertain notes |
| `salaryComponentTypeEnum` (EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION, REIMBURSEMENT, TAX, ADJUSTMENT) | **S** | Each type has different sign convention, GL account and payslip section |
| `salaryComponentCalcMethodEnum` (FIXED, PERCENT_OF_BASIC, PERCENT_OF_GROSS, FORMULA, ATTENDANCE_BASED, TIMESHEET_BASED, MANUAL) | **S** | Each value runs a different calculation algorithm |
| `payrollExceptionSeverityEnum` (BLOCKER, WARNING, INFO) | **S** | BLOCKER prevents the payroll run from proceeding |
| `payrollExceptionStatusEnum` (OPEN, RESOLVED, OVERRIDDEN) | **S** | Exception handling state |
| `payrollApprovalStatusEnum` (PENDING, APPROVED, REJECTED) | **S** | Payroll approval flow |
| `payrollBankBatchStatusEnum` (DRAFT, GENERATED, SENT, PARTIALLY_PAID, PAID, FAILED) | **S** | Bank batch state machine |
| `payrollBankItemStatusEnum` (PENDING, SENT, PAID, FAILED, HELD) | **S** | Individual payment item state |
| `payrollPolicyStatusEnum` (DRAFT, ACTIVE, SUPERSEDED, ARCHIVED) | **S** | Policy versioning — SUPERSEDED means a newer version is active |
| `salaryProfileStatusEnum` (UPCOMING, ACTIVE, SUPERSEDED) | **S** | Salary profile versioning |
| `payFrequencyEnum` (MONTHLY, SEMI_MONTHLY, BI_WEEKLY, WEEKLY) | **S** | Determines pay period calculation and calendar |
| `taxRegimeTypeEnum` (OLD, NEW) | **S** | Indian tax regime selection; OLD and NEW use entirely different deduction rules and slabs |
| `payslipLayoutEnum` (CLASSIC, MODERN, COMPLIANCE) | **U** | See uncertain notes |
| `payslipPublishChannelEnum` (PORTAL, EMAIL) | **S** | Delivery mechanism |
| `payrollCalendarEventTypeEnum` (ATTENDANCE_CUTOFF, REIMBURSEMENT_CUTOFF, DECLARATION_CUTOFF, PREVIEW_DUE, APPROVAL_DEADLINE, PAY_DATE, PUBLISH_DATE) | **S** | Each event type triggers different downstream processing |
| `payrollLoanAdjustmentTypeEnum` (SKIP_EMI, EXTRA_RECOVERY, FORECLOSURE, MANUAL_ADJUST) | **S** | Different loan adjustment computations |
| `onboardingFlowTypeEnum` (org_setup, member_setup, employee_onboarding, module_setup, guided_tour, payment_setup) | **S** | Different onboarding sequences with different steps |
| `onboardingFlowSessionStatusEnum` (not_started, in_progress, completed, skipped, abandoned) | **S** | Session lifecycle |
| `onboardingFlowStepStatusEnum` (todo, in_progress, done, skipped, blocked) | **S** | Step state |
| `moduleSetupChecklistStatusEnum` (not_started, in_progress, completed) | **S** | Checklist state |
| `guidedTourProgressStatusEnum` (not_started, in_progress, completed, dismissed) | **S** | Tour state |
| `paymentEnvironmentEnum` (test, live) | **S** | Selects provider credentials and API base URL |
| `paymentProviderStatusEnum` (not_configured, test_mode_ready, needs_credentials, needs_business_details, needs_kyc, kyc_pending, kyc_rejected, needs_webhook, webhook_failing, test_payment_required, ready_for_live, live, degraded, disabled) | **S** | Complex payment onboarding wizard state machine |
| `paymentWebhookEndpointStatusEnum` (not_verified, verified, failing) | **S** | Webhook health state |
| `paymentWebhookProcessingStatusEnum` (received, processed, failed, ignored_duplicate) | **S** | Webhook processing state |
| `paymentTestTransactionStatusEnum` (created, pending, succeeded, failed) | **S** | Test transaction lifecycle |
| `paymentManualMethodStatusEnum` (enabled, missing_instructions, disabled) | **S** | Payment method configuration state |
| `invProductTypeEnum` (STOCKABLE, CONSUMABLE, SERVICE) | **S** | SERVICE products skip stock tracking entirely |
| `invTrackingMethodEnum` (NONE, LOT, SERIAL) | **S** | Determines which tracking tables are populated |
| `invCostingMethodEnum` (STANDARD, WEIGHTED_AVERAGE, FIFO) | **S** | `valuation.service.ts` has `switch(input.costingMethod)` with different math per value |
| `invReservationStatusEnum` (ACTIVE, CONSUMED, RELEASED, EXPIRED) | **S** | Reservation state machine |
| `invLotStatusEnum` (ACTIVE, EXPIRED, BLOCKED, CONSUMED, RECALLED) | **S** | RECALLED triggers customer notification and return processing |
| `invSerialStatusEnum` (IN_STOCK, RESERVED, SHIPPED, RETURNED, SCRAPPED, QUARANTINE) | **S** | Serial number lifecycle state machine |
| `invBarcodeTypeEnum` (GTIN, EAN13, UPC, CODE128, QR, OTHER) | **T** | Format label; scanner hardware handles all formats, code does not branch per type |
| `invReasonCategoryEnum` (ADJUSTMENT, COUNT, SCRAP, RETURN, TRANSFER, OTHER) | **T** | Reason grouping label for reporting |
| `invVendorReturnReasonEnum` (DAMAGED, WRONG_ITEM, EXCESS, EXPIRED, QUALITY_REJECTED) | **T** | Return reason label; tenants want RECALL, SPEC_MISMATCH, SUBSTITUTION |
| `invCustomerReturnDispositionEnum` (RESTOCK, QUARANTINE, SCRAP) | **S** | Each value triggers a different stock movement — RESTOCK returns to available, QUARANTINE creates a hold, SCRAP writes off the quantity |
| `invPickListStatusEnum` (PENDING, IN_PROGRESS, COMPLETED, CANCELLED) | **S** | Pick list workflow state |
| `invCycleCountStatusEnum` (PLANNED, COUNTING, REVIEW, POSTED, CANCELLED) | **S** | Cycle count workflow state |
| `invQualityInspectionStatusEnum` (PENDING, IN_PROGRESS, PASSED, FAILED, DISPOSITION_REQUIRED, COMPLETED, CANCELLED) | **S** | QA state machine; DISPOSITION_REQUIRED suspends stock until reviewed |
| `invQualityHoldStatusEnum` (ACTIVE, RELEASED) | **S** | Quality hold state |
| `invQualityDispositionEnum` (RELEASE_TO_AVAILABLE, QUARANTINE, RETURN_TO_VENDOR, SCRAP) | **S** | Each value routes stock to a different location — same argument as invCustomerReturnDispositionEnum |
| `invRecallStatusEnum` (OPEN, IN_PROGRESS, CLOSED) | **S** | Recall campaign state machine |
| `invShipmentStatusEnum` (DRAFT, PACKED, LABEL_CREATED, SHIPPED, DELIVERED, CANCELLED) | **S** | Shipment lifecycle |
| `invPackageStatusEnum` (OPEN, CLOSED, SHIPPED) | **S** | Package state |
| `invLoadStatusEnum` (DRAFT, DISPATCHED, ARRIVED, CLOSED, CANCELLED) | **S** | Load/truck state machine |
| `invChannelTypeEnum` (INTERNAL, SHOPIFY, WOOCOMMERCE, MARKETPLACE, B2B, THREE_PL) | **S** | Each value selects a different sync adapter |
| `invChannelStatusEnum` (ACTIVE, PAUSED) | **S** | Channel sync state |
| `invChannelPubStatusEnum` (PENDING, PUBLISHED, FAILED) | **S** | Publication state |
| `inv3plStatusEnum` (DISCONNECTED, CONNECTED, ERROR) | **S** | 3PL connection health state |
| `invIdempotencyStatusEnum` (IN_FLIGHT, COMPLETED, FAILED) | **S** | Idempotency control state |
| `invJobStatusEnum` (PENDING, VALIDATING, RUNNING, COMPLETED, FAILED) | **S** | Async job state machine |
| `invWebhookEventStatusEnum` (PENDING, DELIVERED, FAILED) | **S** | Webhook delivery state |
| `invReservationStrategyEnum` (MANUAL, AUTO_ON_CONFIRM, FEFO, FIFO) | **S** | Each value selects a different reservation algorithm |
| `invExpiryPolicyEnum` (BLOCK, WARN, ALLOW) | **S** | BLOCK refuses the operation, WARN allows it with a warning, ALLOW silently permits — fundamentally different code paths |
| `invAiInsightStatusEnum` (NEW, ACKNOWLEDGED, DISMISSED) | **S** | AI insight lifecycle |
| `partyTypeEnum` (CUSTOMER, VENDOR, PARTNER, BOTH) | **S** | Determines available features and default account assignments |
| `portalAudienceEnum` (CLIENT_PORTAL) | **S** | Portal type; single-value today, extensible by system not tenant |
| `portalMembershipStatusEnum` (PENDING, ACTIVE, SUSPENDED, REVOKED) | **S** | Portal access state |
| `portalInvitationStatusEnum` (PENDING, ACCEPTED, REVOKED, EXPIRED) | **S** | Invitation lifecycle |
| `portalGrantStatusEnum` (ACTIVE, SUSPENDED, REVOKED, EXPIRED) | **S** | Portal access grant state |
| `commandFenceStatusEnum` (IN_FLIGHT, COMPLETED, FAILED) | **S** | Idempotency fence state |
| `organizationStatusEnum` (ACTIVE, ARCHIVED, PURGE_SCHEDULED, PURGED) | **S** | Org lifecycle; PURGED means data is gone |
| `invitationStatusEnum` (PENDING, ACCEPTED, DECLINED, EXPIRED, REVOKED) | **S** | Invitation state |
| `broadcastAudienceTypeEnum` (all, roles, departments, users) | **S** | Determines audience expansion query path |
| `templateApprovalStatusEnum` (NOT_REQUIRED, PENDING, APPROVED, REJECTED) | **S** | Template approval workflow |
| `emailOutboxScopeEnum` (PLATFORM, TENANT) | **S** | Routes email to platform SMTP vs tenant SMTP config |
| `emailSuppressionReasonEnum` (bounce, spam_complaint, unsubscribe, admin_suppressed) | **S** | Determines re-engagement eligibility rules |
| `emailSuppressionSourceEnum` (smtp_feedback, user_action, admin, import) | **S** | Provenance for compliance |
| `notificationConsentStateEnum` (GRANTED, WITHDRAWN) | **S** | Consent state |
| `notificationConsentSourceEnum` (USER, ADMIN, IMPORT, SIGNUP, API) | **S** | Provenance tracking |
| `notificationLegalBasisEnum` (CONSENT, CONTRACT, LEGITIMATE_INTEREST, LEGAL_OBLIGATION) | **S** | GDPR legal basis — determines retention and deletion rules |
| `broadcastAudienceKindEnum` (ROLE, DEPARTMENT, USER) | **S** | Determines audience expansion JOIN path |
| `dataScopeEnum` (all, team, own, none) | **S** | Applied as a SQL predicate; `none` denies access entirely |
| `outboxDeliveryStateEnum` (PENDING, LOCKED, DONE, FAILED, DEAD) | **S** | Transactional outbox state machine |

### module: e-sign (17 enums)

| Enum | Classification | Reason |
|---|---|---|
| `signEnvelopeStatusEnum` | **S** | Complex e-sign state machine with legal implications; `voided` and `completed` are terminal |
| `signRoutingModeEnum` (parallel, sequential, mixed) | **S** | Determines signing order algorithm |
| `signCcTimingEnum` (on_send, on_complete) | **S** | Different dispatch trigger |
| `signRecipientStatusEnum` | **S** | Signing lifecycle state machine |
| `signRecipientTypeEnum` (signer, approver, cc, viewer, in_person_host, internal_reviewer) | **S** | Determines what actions and fields the recipient sees |
| `signAuthMethodEnum` (email_link, access_code, otp_email, otp_sms, sso, passkey, kba, id_verification) | **S** | Each value uses a different authentication implementation |
| `signConversionStatusEnum` | **S** | Document conversion job state |
| `signFieldTypeEnum` (signature, initials, date_signed, text, multiline, email, ...) | **S** | Each field type has different rendering, input capture and validation logic |
| `signTemplateStatusEnum` | **S** | Template lifecycle |
| `signSignatureAssetTypeEnum` (signature, initials, stamp) | **S** | Different rendering per type |
| `signSignatureMethodEnum` (drawn, typed, uploaded, saved) | **S** | Different capture paths |
| `signActorTypeEnum` (internal_user, external_signer, system) | **S** | Determines auth path — external signers use tokenized links |
| `signAuditEventTypeEnum` | **S** | Audit log event type; each maps to a specific action |
| `signBulkJobStatusEnum` | **S** | Bulk send job state machine |
| `signBulkRowStatusEnum` | **S** | Row processing state |
| `signWatermarkScopeEnum` (tenant, template, envelope) | **S** | Scope resolution hierarchy for watermark application |
| `signPublicFormStatusEnum` | **S** | Form publication lifecycle |

### module: timesheets (17 enums)

| Enum | Classification | Reason |
|---|---|---|
| `timesheetEntryStatusEnum` (PENDING, APPROVED, REJECTED) | **S** | Approval workflow |
| `timesheetPayrollStatusEnum` (UNPROCESSED, EXPORTED) | **S** | Payroll integration state |
| `timesheetBillingTypeEnum` (BILLABLE, NON_BILLABLE, FIXED) | **S** | BILLABLE time is invoiced; NON_BILLABLE is not; FIXED uses a different rate structure. Each has different invoicing logic |
| `timesheetInvoicingStatusEnum` | **S** | Invoicing state machine |
| `timesheetRateSourceEnum` (RATE_CARD, PROJECT_MEMBER) | **S** | Determines which rate table is queried |
| `timesheetEntrySourceEnum` (MANUAL, TIMER, API, IMPORT) | **S** | Determines audit and processing path |
| `timesheetPeriodStatusEnum` (OPEN, DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED) | **S** | Period state machine; LOCKED prevents new entries |
| `timerSessionStatusEnum` (RUNNING, PAUSED, STOPPED, CONVERTED, DISCARDED) | **S** | Timer state machine |
| `timerSessionSourceEnum` (WEB, MOBILE, DESKTOP, API) | **S** | Platform tracking |
| `timesheetBudgetTypeEnum` (HOURS, AMOUNT) | **S** | Determines budget tracking unit and comparison logic |
| `timesheetBudgetStatusEnum` | **S** | Budget lifecycle |
| `timesheetExportTypeEnum` (PAYROLL, BILLING, INVOICE_DRAFT) | **S** | Different export pipelines with different schemas |
| `timesheetExportStatusEnum` | **S** | Export job state |
| `timesheetExportFormatEnum` (CSV, XLSX, JSON, PDF) | **S** | Different serializers per format |
| `timesheetRoundingRuleEnum` (NONE, NEAREST_5, NEAREST_6, NEAREST_10, NEAREST_15, ROUND_UP, ROUND_DOWN) | **S** | Each applies different rounding math |
| `timesheetApprovalModeEnum` (MANAGER, AUTO, MULTI_LEVEL) | **S** | Determines approval workflow structure |
| `timesheetPayPeriodEnum` (WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY) | **S** | Determines period boundary calculation |

### module: hr (various files)

| Enum | File | Classification | Reason |
|---|---|---|---|
| `hrLegalHoldStatusEnum` | governance | **S** | Legal hold state; RELEASED lifts data restrictions |
| `hrLegalHoldItemTypeEnum` | governance | **S** | Determines which data tables are covered by the hold |
| `hrRetentionRecordTypeEnum` | governance | **S** | Determines which tables are included in retention sweep |
| `hrRetentionActionEnum` (delete, anonymize) | governance | **S** | Different execution paths — anonymize masks fields, delete removes rows |
| `hrDataRequestTypeEnum` (export, delete, anonymize) | governance | **S** | Different DPDP/GDPR request handling |
| `hrDataRequestStatusEnum` | governance | **S** | GDPR request workflow state |
| `hrProxyScopeEnum` (approvals, hr_admin, manager_tasks) | governance | **S** | Determines which actions the proxy can take on behalf of the grantor |
| `hrPositionStatusEnum` (open, filled, frozen, future) | governance | **T** | Headcount planning label; tenants want BACKFILL, APPROVED_UNFILLED, ON_HOLD |
| `hrReorgScenarioStatusEnum` (draft, proposed, applied) | governance | **S** | Scenario state machine; `applied` triggers org chart changes |
| `hrUnionMembershipStatusEnum` | governance | **S** | Binary membership state |
| `hrCollectiveAgreementStatusEnum` | governance | **S** | Agreement lifecycle |
| `hrLaborCaseStatusEnum` | governance | **S** | Case workflow state |
| `hrAccommodationTypeEnum` | enterprise-ops | **T** | Accommodation category; tenants want REMOTE_WORK, FLEXIBLE_HOURS, ERGONOMIC_EQUIPMENT |
| `hrAccommodationStatusEnum` | enterprise-ops | **S** | Request workflow state |
| `hrAccommodationTaskStatusEnum` | enterprise-ops | **S** | Task state |
| `hrEmergencyEventTypeEnum` | enterprise-ops | **T** | Emergency classification label; tenants want FIRE_DRILL, POWER_OUTAGE, MEDICAL, SECURITY |
| `hrEmergencyEventStatusEnum` | enterprise-ops | **S** | Emergency state |
| `hrEmergencyResponseStatusEnum` (safe, need_help, no_response) | enterprise-ops | **S** | Triggers different escalation actions |
| `hrAccessProvisioningActionEnum` (grant, revoke, review) | enterprise-ops | **S** | Different provisioning operations against the IAM system |
| `hrAccessProvisioningStatusEnum` | enterprise-ops | **S** | Provisioning workflow state |
| `hrAccessProvisioningTriggerEnum` (joiner, mover, leaver, manual) | enterprise-ops | **S** | Selects which provisioning template applies |
| `hrSimulationTypeEnum` (policy, leave, attendance, approval, payroll) | enterprise-ops | **S** | Each type runs a different simulation engine |
| `hrTimeDeviceTypeEnum` | enterprise-comp | **S** | Determines integration adapter for biometric vs RFID vs mobile |
| `hrTimeDeviceStatusEnum` | enterprise-comp | **S** | Device operational state |
| `hrDeviceSyncStatusEnum` | enterprise-comp | **S** | Sync outcome state |
| `hrVarianceApprovalStatusEnum` | enterprise-comp | **S** | Approval workflow state |
| `hrArrearsStatusEnum` | enterprise-comp | **S** | Arrears processing state |
| `hrComplianceTaskStatusEnum` | enterprise-comp | **S** | Compliance task tracking state |
| `hrCompCycleStatusEnum` | enterprise-comp | **S** | Compensation cycle state machine |
| `hrCompRecommendationStatusEnum` | enterprise-comp | **S** | Recommendation workflow state |
| `hrEquityGrantTypeEnum` (ISO, NSO, RSU, other) | enterprise-comp | **S** | ISO/NSO/RSU have different tax treatments and legal rules |
| `hrEquityGrantStatusEnum` | enterprise-comp | **S** | Grant lifecycle |
| `hrBenefitCategoryEnum` (health, life, accident, retirement, wellness, perk, other) | benefits | **T** | Category label; tenants want DENTAL, VISION, MENTAL_HEALTH, COMMUTER, CHILDCARE |
| `hrBenefitStatusEnum` | benefits | **S** | Benefit plan lifecycle |
| `hrEnrollmentStatusEnum` | benefits | **S** | Enrollment state machine |
| `hrEnrollmentWindowStatusEnum` | benefits | **S** | Window state — only `open` accepts new enrollments |
| `hrDependentRelationshipEnum` (spouse, child, parent, other) | benefits | **U** | See uncertain notes |
| `hrClaimStatusEnum` | benefits | **S** | Claims workflow state |
| `hrClaimPayoutRouteEnum` (payroll_payable, finance_payable, already_paid) | benefits | **S** | Determines which system handles payment disbursement |
| `hrLoanRepaymentStatusEnum` | benefits | **S** | Repayment tracking state |
| `hrWorkAuthTypeEnum` | global-compliance | **T** | Work authorization document type; tenants want SPONSORSHIP, STUDENT_VISA, DEPENDENT_VISA |
| `hrWorkAuthStatusEnum` | global-compliance | **S** | Expiry tracking — `expiring` triggers renewal reminder |
| `hrComplianceCategoryEnum` | global-compliance | **T** | Compliance requirement category; varies enormously by jurisdiction |
| `hrComplianceFrequencyEnum` | global-compliance | **S** | Determines scheduling cadence for reminders |
| `hrComplianceEventStatusEnum` | global-compliance | **S** | `overdue` triggers escalation |
| `hrContractTypeEnum` | global-compliance | **T** | Contract classification; tenants want STATEMENT_OF_WORK, FIXED_TERM, ZERO_HOURS |
| `hrContractStatusEnum` | global-compliance | **S** | Contract lifecycle; `expiring` triggers renewal prompt |
| `hrWorkflowObjectTypeEnum` | workflow-engine | **S** | `hr-workflow-instances.service.ts` and `hr-workflow-engine.service.ts` have `switch(step.approverType)` — the object type also determines workflow matching |
| `hrWorkflowStatusEnum` | workflow-engine | **S** | Workflow definition state |
| `hrWorkflowApproverTypeEnum` | workflow-engine | **S** | `switch(step.approverType)` in `hr-workflow-instances.service.ts` with cases for named_user, direct_manager, managers_manager, department_head, hr_role, finance_role, location_hr |
| `hrWorkflowStepModeEnum` (serial, parallel_all, parallel_any) | workflow-engine | **S** | Determines step execution logic — serial waits for each, parallel_any requires one, parallel_all requires all |
| `hrWorkflowInstanceStatusEnum` | workflow-engine | **S** | Workflow instance state machine |
| `hrWorkflowActionEnum` | workflow-engine | **S** | Audit event type |
| `attendanceEventKindEnum` (CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END, AUTO_CHECKOUT, CORRECTION) | attendance-event-store | **S** | Each kind computes a different effect on the attendance projection |
| `attendanceEventSourceEnum` | attendance-event-store | **S** | Determines audit trail and override rules |
| `attendanceCorrectionActionEnum` (VOID, REPLACE) | attendance-event-store | **S** | VOID nullifies the event, REPLACE substitutes a new one |
| `attendanceCorrectionReplacementKindEnum` | attendance-event-store | **S** | Mirrors event kind for replacement context |
| `attendanceAccuracyBucketEnum` | attendance-event-store | **S** | GPS accuracy classification for geofence analytics |
| `attendanceDistanceBucketEnum` | attendance-event-store | **S** | Geofence compliance classification |
| `attendanceSessionStateEnum` | attendance-projections | **S** | Real-time attendance state — only `no_punch` and `checked_in` permit a new CHECK_IN event |
| `hrEmploymentLifecycleStatusEnum` (onboarding, probation, active, notice_period, offboarding, separated, suspended) | core-people | **S** | Employment lifecycle state machine; each status gates different self-service features |
| `hrWorkerTypeEnum` | core-people | **U** | See uncertain notes |
| `hrEffectiveDateChangeTypeEnum` (promotion, transfer, salary_revision, ...) | core-people | **S** | Determines which fields are modified in the effective-dated change |
| `hrEffectiveDateChangeStatusEnum` | core-people | **S** | Change record state |
| `hrReportingLineTypeEnum` (direct_manager, dotted_line) | core-people | **S** | Determines approval path and org chart rendering |
| `hrCaseCategoryEnum` | cases | **T** | Case classification; tenants want ACCOMMODATION_REQUEST, PAY_DISPUTE, BENEFITS_QUERY |
| `hrCaseSeverityEnum` | cases | **T** | Severity label; no code branches on specific value |
| `hrCaseStatusEnum` | cases | **S** | Case workflow state |
| `hrDisciplinaryActionTypeEnum` | cases | **T** | Action type label; tenants want COACHING, COUNSELLING, DEMOTION, PERFORMANCE_PLAN |
| `hrFormStatusEnum` | forms | **S** | Form lifecycle |
| `hrFormAudienceEnum` (internal, public) | forms | **S** | Determines access control — public allows unauthenticated submissions |
| `hrFormSubmissionStatusEnum` | forms | **S** | Submission state |
| `hrLeaveTxnTypeEnum` | leave-ledger | **S** | `leave-ledger.service.ts` has `switch(row.txnType)` — consumption, comp_off_use, and encashment run different balance calculations |
| `hrLeaveLedgerSourceEnum` | leave-ledger | **S** | Determines processing path and audit trail |
| `hrLeavePayrollStatusEnum` | leave-ledger | **S** | Payroll export state |
| `hrPayrollInputStatusEnum` (locked, unlocked, overridden, excluded) | payroll-inputs | **S** | EXCLUDED skips the input entirely; LOCKED prevents changes |
| `hrPayrollInputSectionEnum` | payroll-inputs | **S** | Determines which payroll section the input feeds into |
| `hrPayrollAdjustmentTypeEnum` (adhoc_earning, adhoc_deduction, recovery, incentive, bonus) | payroll-inputs | **T** | Adjustment category label; tenants want ADVANCE_RECOVERY, NOTICE_PERIOD_DEDUCTION, CLAWBACK |
| `hrPayrollAdjustmentStatusEnum` | payroll-inputs | **S** | Approval workflow state |
| `hrPolicyTypeEnum` | policy-engine | **S** | Determines which policy rules and fields apply |
| `hrPolicyStatusEnum` | policy-engine | **S** | Policy versioning — SUPERSEDED means a newer version is active |
| `hrPolicyScopeTypeEnum` (org, branch, department, job_level, custom) | policy-engine | **S** | Determines applicability query |
| `hrImportEntityEnum` | import-jobs | **S** | Determines import schema validation and target tables |
| `hrImportStatusEnum` | import-jobs | **S** | Import job state machine |
| `hrImportRowStatusEnum` | import-jobs | **S** | Row processing state |
| `hrSafetyIncidentTypeEnum` (near_miss, first_aid, medical_treatment, lost_time, fatality) | safety | **T** | Incident classification; tenants want PROPERTY_DAMAGE, ENVIRONMENTAL, CHEMICAL_EXPOSURE |
| `hrSafetyIncidentStatusEnum` | safety | **S** | Incident workflow state |
| `hrSafetyIncidentSeverityEnum` (minor, moderate, major, critical) | safety | **T** | Severity label |
| `hrVarianceApprovalStatusEnum` | enterprise-comp | **S** | Approval state |
| `hrTemplateKindEnum` | template-engine | **T** | Template category label; tenants want PROBATION_EXTENSION, EXIT_INTERVIEW_INVITE, WARNING_LETTER |
| `hrTemplateStatusEnum` | template-engine | **S** | Template lifecycle |
| `hrLetterTypeEnum` | template-engine | **T** | Letter classification label; same argument as templateKind |
| `hrWebhookDeliveryStatusEnum` | webhooks | **S** | Webhook delivery state |
| `rewardPointSourceEnum` | engagement-extras | **T** | Reward source label; tenants want ANNIVERSARY, LEARNING_COMPLETION, CUSTOMER_RECOGNITION |
| `pollStatusEnum` | engagement-extras | **S** | Poll lifecycle |
| `communityMemberRoleEnum` (member, moderator) | engagement-extras | **S** | Permission level |
| `campaignStatusEnum` | engagement-extras | **S** | Campaign state machine |
| `successionReadinessEnum` (ready_now, 1_2_years, 3_plus) | performance | **T** | Readiness classification label; tenants want READY_NOW, READY_1_YEAR, STRETCH, CONTINGENCY |

### module: build (various files)

| Enum | File | Classification | Reason |
|---|---|---|---|
| `testCasePriorityEnum` (low, medium, high) | qa | **T** | Priority label; same argument as ticket priority |
| `testCaseAutomationStatusEnum` | qa | **S** | Determines whether test runs manually or via CI |
| `testRunStatusEnum` | qa | **S** | Test run state machine |
| `testResultStatusEnum` (not_run, passed, failed, blocked, skipped) | qa | **S** | Test result — passed/failed drives pass-rate calculation |
| `bugSeverityEnum` (blocker, critical, major, minor, trivial) | qa | **T** | Severity label; tenants want SEV1/SEV2/SEV3 or P0/P1/P2. Note: if blocker gating is ever added, this becomes S |
| `bugPriorityEnum` | qa | **T** | Priority label |
| `bugStatusEnum` (new, triaged, assigned, in_progress, fixed, ready_for_qa, verified, reopened, closed) | qa | **T** | Bug workflow stages; same pattern as ticket status — hardcoded transitions would move to transitions table |
| `riskProbabilityEnum` | governance | **T** | Risk assessment label; risk score = probability × impact, both are labels not code logic |
| `riskImpactEnum` | governance | **T** | Risk impact label |
| `riskStatusEnum` | governance | **S** | Risk workflow state |
| `decisionStatusEnum` | governance | **S** | Decision record state |
| `goalLevelEnum` (company, team, individual) | goals | **S** | Determines OKR hierarchy and roll-up calculation |
| `goalStatusEnum` (not_started, on_track, at_risk, off_track, completed) | goals | **S** | Calculated goal health state |
| `keyResultMetricEnum` (number, percentage, currency, boolean) | goals | **S** | Determines how progress is measured and displayed |
| `gitProviderEnum` (github, gitlab, bitbucket) | git | **S** | Each value uses a different API client and webhook format |
| `gitRefTypeEnum` (commit, pull_request, branch) | git | **S** | Determines link rendering and metadata fields |
| `approvalEntityTypeEnum` | approvals | **S** | Polymorphic entity type — determines which table is joined |
| `approvalStatusEnum` | approvals | **S** | Approval lifecycle state |
| `changeRequestStatusEnum` | change-requests | **S** | Change request state machine |
| `formTypeEnum` (intake, feedback, survey, checklist) | forms | **S** | Determines form behavior and available field types |
| `formSubmissionStatusEnum` | forms | **S** | Submission state |
| `feedbucketSubmissionTypeEnum` (bug, feature_request, general, idea, concern) | feedback | **T** | Feedback category label; tenants want INTEGRATION_REQUEST, COMPLIANCE_REQUIREMENT |
| `feedbucketSubmissionStatusEnum` | feedback | **T** | Product feedback pipeline stages |
| `feedbucketSubmissionPriorityEnum` | feedback | **T** | Priority label |
| `meetingTypeEnum` (meeting, standup, retro, planning, review) | meetings | **T** | Meeting category label; tenants want ONE_ON_ONE, ALL_HANDS, DESIGN_REVIEW |
| `projectMeetingStatusEnum` | meetings | **S** | Meeting lifecycle state |
| `actionItemStatusEnum` | meetings | **S** | Action item state machine |
| `incidentSeverityEnum` | incidents | **T** | Severity label; tenants want P0/P1/P2/P3 or SEV1/SEV2/SEV3 |
| `incidentStatusEnum` | incidents | **S** | Incident management state machine |
| `portfolioStatusEnum` | portfolios | **S** | Portfolio lifecycle |
| `portfolioHealthEnum` (on_track, at_risk, off_track) | portfolios | **S** | Calculated portfolio health |
| `roadmapStatusEnum` | roadmap | **S** | Roadmap item state |
| `feedbackStatusEnum` | roadmap | **T** | Product feedback status (duplicate of feedbucket pattern) |
| `changelogTypeEnum` (feature, improvement, fix) | roadmap | **T** | Release note category; tenants want SECURITY, DEPRECATION, BREAKING_CHANGE |
| `whiteboardVisibilityEnum` (private, workspace, public) | whiteboards | **S** | Determines access control |
| `whiteboardShareRoleEnum` (viewer, editor) | whiteboards | **S** | Permission level |
| `sprintScopeEventTypeEnum` (added, removed) | sprint-events | **S** | Audit event type |
| `ticketActivityActionEnum` | activity | **S** | Audit event type |

### module: surveys (7 enums)

| Enum | Classification | Reason |
|---|---|---|
| `surveyQuestionTypeEnum` (rating, matrix, single_choice, ...) | **S** | Different rendering and scoring logic per question type |
| `surveyResponseSessionStatusEnum` | **S** | Response session state |
| `surveyLiveSessionStatusEnum` | **S** | Live session state machine |
| `surveyFormModeEnum` (survey, assessment, live_session, lead_qualification, custom) | **S** | Determines available features and routing |
| `surveyFormStatusEnum` | **S** | Form lifecycle |
| `surveyCollectorTypeEnum` (email, link, qr_code, manual, sms) | **S** | Determines delivery mechanism |
| `surveyCollectorStatusEnum` | **S** | Collector state |
| `surveyParticipantStatusEnum` | **S** | Participant state machine |
| `surveyAutomationEventStatusEnum` | **S** | Automation event processing state |
| `surveyAssessmentAttemptStatusEnum` | **S** | Assessment attempt lifecycle |

### module: support (7 enums)

| Enum | Classification | Reason |
|---|---|---|
| `kbArticleStatusEnum` | **S** | Editorial state machine |
| `kbArticleVisibilityEnum` (public, internal) | **S** | Access control |
| `supportChannelTypeEnum` (email, chat, web_widget, api, phone) | **S** | Message routing to different channel handlers |
| `supportActivityActionEnum` | **S** | Audit event type |
| `supportSuggestionTypeEnum` | **S** | `support-ai.service.ts` has `switch(suggestion.type)` — each type routes to different AI handling |
| `supportSuggestionStatusEnum` | **S** | AI suggestion lifecycle |
| `supportExternalEntityTypeEnum` (github_issue, jira_issue, linear_issue) | **S** | Determines which integration client handles the sync |
| `supportSavedViewVisibilityEnum` (personal, team) | **S** | Access control |
| `supportTicketLinkRelationEnum` (blocks, blocked_by, duplicate_of, related_to) | **S** | Relation semantics; blocking relation affects status propagation |

### module: crm

| Enum | File | Classification | Reason |
|---|---|---|---|
| `clientHealthStatusEnum` (healthy, at_risk, critical) | customer-success | **T** | Health score label; tenants define their own thresholds and tier names |
| `npsSurveyStatusEnum` | nps | **S** | Survey lifecycle |
| `npsCategoryEnum` (promoter, passive, detractor) | nps | **S** | Standard NPS classification (Bain method: 0–6 = detractor, 7–8 = passive, 9–10 = promoter); code uses buckets for score calculation |

### module: payroll (separate folder)

| Enum | File | Classification | Reason |
|---|---|---|---|
| `payrollTemplateCategoryEnum` (INDIAN_STANDARD, INDIAN_STARTUP, CONTRACTOR, ...) | enums | **T** | Template category label for the template library; tenants pick a starting template but can customize freely |
| `payrollInputSourceEnum` (ATTENDANCE, LEAVE, TIMESHEET, UPLOAD, MANUAL) | enums | **S** | Determines which data source is queried for the input |
| `payrollRunEventTypeEnum` | enums | **S** | Payroll run audit event type |
| `payslipPublicationStatusEnum` | enums | **S** | Publication job state |
| `payrollTaxWindowStatusEnum` | enums | **S** | Tax declaration window state |
| `payrollEntityStatusEnum` | entities-periods | **S** | Payroll entity lifecycle |
| `payrollPeriodStatusEnum` | entities-periods | **S** | Pay period state machine |
| `payrollJobStatusEnum` | entities-periods | **S** | Async payroll job state |
| `payrollJournalBatchStatusEnum` | journal-batches | **S** | GL posting batch state |
| `payrollJournalReconStatusEnum` | journal-batches | **S** | Reconciliation state |
| `payrollCommandStatusEnum` | command-receipts | **S** | Command receipt state |

### module: accounting

| Enum | File | Classification | Reason |
|---|---|---|---|
| `accPeriodStatusEnum` (OPEN, CLOSING, CLOSED, LOCKED) | accounting-core | **S** | LOCKED prevents any new entries; period closure is a regulated operation |
| `accBasisEnum` (ACCRUAL, CASH) | accounting-core | **S** | Fundamentally different accounting calculations for revenue and expense recognition |
| `accSystemPurposeEnum` | accounting-core | **S** | System-reserved account slots; determines which account is used for each transaction type |
| `finRecurFrequencyEnum` | accounting-core | **S** | `recurring-journals.service.ts` and `recurring-invoices.service.ts` have `switch(frequency)` with different next-date calculations per value |
| `finApprovalRecordTypeEnum` | accounting-core | **S** | Determines which approval workflow applies |
| `finApprovalStatusEnum` | accounting-core | **S** | Approval state |
| `accNormalBalanceEnum` (DEBIT, CREDIT) | accounting | **S** | Accounting normal balance — determines sign conventions throughout |
| `finCreditNoteStatusEnum` | finance-ar-ap | **S** | Credit note state |
| `finReminderChannelEnum` | finance-ar-ap | **S** | Delivery mechanism |
| `finCollectionActivityTypeEnum` (NOTE, PROMISE_TO_PAY, CALL, EMAIL) | finance-ar-ap | **T** | Collection activity label; tenants want VISIT, LEGAL_NOTICE, SETTLEMENT_OFFER |
| `finPaymentRunStatusEnum` | finance-ar-ap | **S** | Payment run state machine |
| `finPaymentRunItemStatusEnum` | finance-ar-ap | **S** | Individual payment item state |
| `finBankAccountTypeEnum` (BANK, CASH, CARD, WALLET) | finance-banking | **S** | Different clearing and reconciliation logic per type |
| `finBankImportFormatEnum` (CSV, OFX, MANUAL) | finance-banking | **S** | Different parsers per format |
| `finBankImportStatusEnum` | finance-banking | **S** | Import job state |
| `finBankTxnStatusEnum` (UNMATCHED, SUGGESTED, MATCHED, RECONCILED, IGNORED) | finance-banking | **S** | Bank reconciliation state machine |
| `finReconMatchTypeEnum` | finance-banking | **S** | Determines which GL entries are generated for the match |
| `accDepreciationMethodEnum` (STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION) | finance-assets | **S** | Each method uses a different depreciation math formula |
| `accAssetStatusEnum` | finance-assets | **S** | Asset lifecycle |
| `accDepreciationLineStatusEnum` | finance-assets | **S** | Depreciation line state |
| `accDepreciationRunStatusEnum` | finance-assets | **S** | Run state |
| `finBudgetPeriodEnum` (MONTHLY, QUARTERLY, YEARLY) | finance-planning | **S** | Determines period boundary calculation |
| `finBudgetDimensionEnum` (NONE, DEPARTMENT, PROJECT) | finance-planning | **S** | Determines which dimension JOIN is added to the query |
| `finBudgetStatusEnum` | finance-planning | **S** | Budget approval state machine |
| `finScenarioKindEnum` (CONSERVATIVE, EXPECTED, AGGRESSIVE, CUSTOM) | finance-planning | **T** | Scenario category label; tenants want WORST_CASE, BOARD_APPROVED, STRETCH |
| `finReimbursementBatchStatusEnum` | finance-expenses | **S** | Batch state machine |
| `accTaxTypeEnum` (GST, CGST_SGST, IGST, VAT, TDS, TCS, EXEMPT, ZERO_RATED) | finance-tax | **S** | Each tax type has different calculation rules, GL accounts and filing requirements |

### module: ai

| Enum | Classification | Reason |
|---|---|---|
| `aiJobStatusEnum` | **S** | AI job state machine |
| `aiFeedbackRatingEnum` (UP, DOWN) | **S** | Binary training data label |
| `aiProposalStatusEnum` | **S** | AI proposal lifecycle |

### module: workflow (common)

| Enum | Classification | Reason |
|---|---|---|
| `workflowStatusEnum` | **S** | Workflow lifecycle |
| `workflowExecutionStatusEnum` | **S** | Execution state machine with retry and timeout handling |
| `workflowTriggerTypeEnum` (event, schedule, webhook, api, manual) | **S** | Each value uses a different trigger handler |
| `workflowApprovalStatusEnum` | **S** | Approval state |
| `workflowNodeTypeEnum` | **S** | `node-dispatcher.service.ts` has `switch(node.data.nodeType)` dispatching to action, ai_action, integration, loop, script handlers |

---

## Uncertain calls

These six require additional evidence before classifying. If in doubt, leave as enum.

| Enum | Why uncertain | What would settle it |
|---|---|---|
| `genderEnum` (MALE, FEMALE, OTHER) | Legally sensitive. Most compliance reporting buckets by these values. But some jurisdictions require additional options. | Check whether payroll and compliance reports hardcode the values in grouping logic. If yes: S. If they just display the label: T. |
| `orgSizeEnum` (1-10, 11-50, 51-200, 201-1000, 1000+) | Used during org signup for segmentation. Could be plan-gating input or just analytics. | Grep for the values in plan-limits or feature-flag service. If they drive any gate: S. |
| `payrollWorkerTypeEnum` (EMPLOYEE, CONTRACTOR, CONSULTANT, INTERN, EOR) | Worker type could determine tax treatment and compliance rules (e.g., EOR has no direct payroll). | Check if payroll calculation service switches on this value. If yes: S. |
| `hrDependentRelationshipEnum` (spouse, child, parent, other) | In some countries (India), the relationship type determines tax exemption on health coverage. | Check if benefits or tax calculation code branches on spouse vs child. If yes: S. |
| `payslipLayoutEnum` (CLASSIC, MODERN, COMPLIANCE) | Looks like a tenant customization (choose your payslip look), but COMPLIANCE might have regulatory requirements on the fields shown. | Check if COMPLIANCE layout has mandatory fields that CLASSIC omits. If yes: S. |
| `invBarcodeTypeEnum` (GTIN, EAN13, UPC, CODE128, QR, OTHER) | Classified as T based on scanner hardware handling all formats, but if the inventory system validates barcode length/format per type (GTIN-14 vs EAN-13 vs UPC-A digit counts), it becomes S. | Check if barcode validation or generation code branches per type. |

---

## Top 20 tenant taxonomies — propagation order

Ranked by customer demand. These are the ones tenants ask for in sales calls. Start with the module being next touched per the PRD's "a module at a time" rule.

| Rank | Enum | Module | Why first |
|---|---|---|---|
| 1 | `supportTicketStatusEnum` | support | Every support team has custom stages: WAITING_ON_CUSTOMER, ESCALATED, PENDING_APPROVAL. Highest frequency request in SaaS support tooling. |
| 2 | `candidateStatusEnum` | hr/recruitment | ATS pipeline customization is a deal-blocker for mid-market. Current hardcoded transitions move verbatim to the transitions table. |
| 3 | `applicationStatusEnum` | hr/recruitment | Job application pipeline stages — same module, same migration, same transaction. |
| 4 | `interviewTypeEnum` | hr/recruitment | Engineering, product, finance all run different interview processes. |
| 5 | `crmDealStageEnum` | crm | CRM already has a pipeline/stages table; this enum is the residual. Migration is trivial and the pattern is already proven in CRM. |
| 6 | `crmLeadStatusEnum` | crm | What constitutes MQL/SQL is entirely company-specific. High request volume in CRM product. |
| 7 | `bugStatusEnum` | build | Engineering orgs have strong opinions: IN_QA vs READY_FOR_QA, NEEDS_SPEC_CLARIFICATION, etc. |
| 8 | `hrCaseCategoryEnum` | hr | HR case categories vary by industry: healthcare needs HIPAA_VIOLATION, finance needs AUDIT_FINDING. |
| 9 | `bonusTypeEnum` | hr/payroll | SIGN_ON, RELOCATION, SPOT_AWARD, PROJECT_COMPLETION all commonly requested. Currently all map to ADJUSTMENT. |
| 10 | `hrBenefitCategoryEnum` | hr | DENTAL, VISION, MENTAL_HEALTH, COMMUTER, CHILDCARE, GYM are all standard requests. |
| 11 | `hrContractTypeEnum` | hr | STATEMENT_OF_WORK, FIXED_TERM, ZERO_HOURS differ by jurisdiction; UK/EU tenants block on this. |
| 12 | `ticketPriorityEnum` | build | P0/P1/P2/P3 vs CRITICAL/HIGH/MEDIUM/LOW vs Urgent/Normal/Low. Teams have strong conventions. |
| 13 | `assetStatusEnum` | hr | IN_REPAIR, LOST, STOLEN, DECOMMISSIONED, DONATED all requested. |
| 14 | `documentTypeEnum` | hr | NDA, VISA_COPY, BANK_STATEMENT, PAN_CARD, AADHAAR vary by tenant and jurisdiction. |
| 15 | `hrSafetyIncidentTypeEnum` | hr | Manufacturing tenants want PROPERTY_DAMAGE, ENVIRONMENTAL_SPILL, CHEMICAL_EXPOSURE. |
| 16 | `hrDisciplinaryActionTypeEnum` | hr | COACHING, COUNSELLING, PIP_ISSUANCE, DEMOTION frequently requested. |
| 17 | `feedbucketSubmissionTypeEnum` | build | INTEGRATION_REQUEST, COMPLIANCE_REQUIREMENT, DEPENDENCY_BLOCKER often requested. |
| 18 | `rewardPointSourceEnum` | hr | ANNIVERSARY, LEARNING_COMPLETION, CUSTOMER_RECOGNITION, PEER_NOMINATION all common. |
| 19 | `incidentSeverityEnum` | build | P0/P1/P2/P3 vs SEV1/SEV2/SEV3 — incident management teams have strong conventions. |
| 20 | `hrWorkAuthTypeEnum` | hr | SPONSORSHIP, STUDENT_VISA, DEPENDENT_VISA, SKILLED_WORKER needed for international tenants. |

---

## System state machines that look like taxonomy

These are the ones most likely to be misclassified. Each has a specific branch that proves it stays as an enum.

| Enum | Branch that proves it is S |
|---|---|
| `feedbackTypeEnum` (SELF, PEER, MANAGER, SKIP_LEVEL) | `documents.service.ts` `switch(category)` determines which performance content is visible to which participant. PEER reviewers cannot see MANAGER scores until calibration. |
| `hrWorkflowApproverTypeEnum` | `hr-workflow-instances.service.ts` and `hr-workflow-engine.service.ts` both have `switch(step.approverType)` with cases for `direct_manager`, `managers_manager`, `department_head`, `hr_role`, `finance_role`, `location_hr`, `named_user` — each resolves the actual user via a different query. |
| `invCostingMethodEnum` (STANDARD, WEIGHTED_AVERAGE, FIFO) | `valuation.service.ts` has `switch(input.costingMethod)` where FIFO runs a lot-queue depletion algorithm, WEIGHTED_AVERAGE recomputes moving average, STANDARD uses a preset price. These are fundamentally different inventory accounting methods. |
| `invCustomerReturnDispositionEnum` (RESTOCK, QUARANTINE, SCRAP) | Each value triggers a different stock movement: RESTOCK → available bin, QUARANTINE → quarantine location + quality hold, SCRAP → scrap location + write-off journal entry. |
| `invQualityDispositionEnum` (RELEASE_TO_AVAILABLE, QUARANTINE, RETURN_TO_VENDOR, SCRAP) | Same: each value routes stock to a different destination with different accounting entries. |
| `workflowNodeTypeEnum` | `node-dispatcher.service.ts` `switch(node.data.nodeType)` dispatches to distinct handler classes per type. Adding a node type without a handler produces a silent no-op. |
| `crmConsentStatusEnum` (OPTED_IN, OPTED_OUT, UNKNOWN) | OPTED_OUT hard-blocks any outbound communication. Code checks `status === "OPTED_IN"` before enqueuing any message. A tenant cannot add a custom consent state because the allow/block decision is binary. |
| `npsCategoryEnum` (promoter, passive, detractor) | Score ranges 0–6, 7–8, 9–10 are industry-standard (Bain definition). Code calculates NPS = % promoters − % detractors. The math is keyed to the category names; changing them changes the formula. |
| `invCostingMethodEnum` see above | Confirmed branching |
| `accBasisEnum` (ACCRUAL, CASH) | Accrual recognizes revenue when earned; cash recognizes when received. Revenue and expense queries produce fundamentally different results. Adding a third basis would need corresponding recognition logic. |
| `hrWorkflowStepModeEnum` (serial, parallel_all, parallel_any) | `serial` advances only after each approver acts in sequence; `parallel_any` resolves on first approval; `parallel_all` waits for every approver. Three distinct completion algorithms. |
| `hrLeaveTxnTypeEnum` | `leave-ledger.service.ts` `switch(row.txnType)` runs different balance arithmetic per type — consumption debits, accrual credits, carry_forward moves across periods, encashment triggers a payroll component. |

---

## Status update

- **Status:** done
- **Enums classified:** 422 (416 definitively, 6 uncertain)
- **Tenant taxonomy found:** 54 clear + up to 6 from uncertain
- **Propagation order:** see Top 20 table above
- **Next ticket unblocked:** c23-02 (one module's taxonomy moves to lookup tables — start with the support module given rank-1 demand and the existing Build/CRM pattern to copy)

---

## The third category this classification is missing — and it is the common one

Verified at source 2026-08-26, after the classification landed.

The two-way split above (system state machine / tenant taxonomy) does not survive contact with the
highest-priority candidates. Take `candidateStatusEnum`, ranked #2 for propagation. Code branches on
it in at least four places:

- `recruitment-candidate-ops.service.ts` — bulk shortlist filters on `status === "NEW"`
- `recruitment-candidates.service.ts` — duplicate handling branches on `=== "REJECTED"` and `=== "HIRED"`
- the same file guards a rejection transition on `input.status === "REJECTED"`

By the branching test as written, that makes it a **system state machine** and it stays an enum —
which is the wrong conclusion, because a tenant adding "Phone screen" or "Take-home sent" is
obviously a feature.

**Both things are true at once, and the codebase already solved it.** `build.project_statuses`
carries a tenant-controlled `name` **and** a system `type` column (`stateGroupEnum`: unstarted /
started / completed). The tenant owns the label and the ordering; the code branches on the anchor.
`crm_pipeline_stages` does the same thing.

So the real classification has three outcomes, not two:

| Outcome | Test | Migration shape |
|---|---|---|
| **System state machine** | code branches, and every value is load-bearing | stays an enum |
| **Pure taxonomy** | nothing branches | plain org-scoped lookup table |
| **Anchored taxonomy** | code branches on *some* values, tenants want to add others | lookup table **plus a semantic anchor column**, branches rewritten to read the anchor |

**This is the one that will bite c23-02.** Moving an anchored taxonomy to a plain name list silently
breaks every `=== "REJECTED"` branch — the code compiles, the tenant adds a status, and the rejection
path stops firing for it. Anything in the Top 20 that a service branches on needs the anchor column
and needs those branches rewritten to read it, in the same change.

**Before starting c23-02 on any enum, grep for branches on its values.** If there are none it is a
plain lookup. If there are some, it is anchored, and the anchor set is exactly the values the code
branches on today. Do not infer the anchors from what sounds canonical — read them out of the
branches.

`supportTicketStatusEnum` (rank 1) should be re-checked this way before it is treated as a plain
taxonomy.
