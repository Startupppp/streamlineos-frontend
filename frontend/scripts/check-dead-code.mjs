#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, resolve as pathResolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";
import { reportCorpus } from "./gate-corpus.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const NEXT_CONVENTION_STEMS = new Set([
  "page", "layout", "loading", "error", "not-found", "route", "template",
  "default", "global-error", "sitemap", "robots", "manifest", "icon",
  "apple-icon", "opengraph-image", "twitter-image",
]);

const CONTRACT_BARRELS = new Set([
  "components/shared/index.ts",
  "components/ai/index.ts",
  "components/illustrations/index.ts",
  "components/wizard-shell/index.ts",
  "components/labels/index.ts",
]);

const FEATURE_BARREL_RE = /^features\/[^/]+\/(?:[^/]+\/)?index\.ts$/;

const CRM_INVENTORY_RE =
  /^(?:hooks\/api\/crm\/|features\/crm\/|types\/crm\/|features\/inventory\/|hooks\/api\/inventory\/|hooks\/api\/leads\.)/;

const SCRIPTS_RE = /^scripts\//;

/**
 * The data-layer boundary surface. A TYPE exported from a live module here is
 * the shape of a validated API response — the `z.infer` of a contract, or a
 * fragment nested inside one. Consumers reach it through a hook's inferred
 * return type and never import it by name, so a module-graph tool reports every
 * one of them unused. That is a property of type erasure, not evidence of dead
 * code, and it was previously answered with one hand-written KEEP per type.
 *
 * The rule is deliberately limited to types. A VALUE exported here and imported
 * by nobody is a contract nothing parses with — an unvalidated boundary — and
 * must still fail the gate.
 */
const DATA_LAYER_CONTRACT_RE = /^hooks\/api\//;

const TEST_INFRA_RE = /^test-utils\//;

/*
 * 10 dead files are pre-existing and were masked while the 23 unclassified accounting
 * response contracts (ar-schema / banking-schema / core-gl-schema / core-coa-schema)
 * caused the gate to exit before reaching this check. They form a single dead import
 * chain rooted at features/accounting/overview/bank-accounts-list.tsx, which nothing
 * imports:
 *
 *   bank-accounts-list.tsx
 *     ← hooks/api/accounting/overview.ts
 *     ← features/accounting/shared/index.ts
 *         ← features/accounting/shared/finance-status.tsx
 *         ← features/accounting/shared/money.tsx
 *         ← features/accounting/shared/finance-page-icons.tsx
 *         ← features/accounting/shared/download-csv.ts
 *   types/accounting.ts                     (old monolithic types, superseded by
 *                                            types/accounting-{kernel,banking,ar}.ts)
 *   features/accounting/purchases/bill-detail-columns.tsx
 *   features/accounting/purchases/bill-detail-view.tsx
 *
 * These files are outside the scope of the accounting-response-contract wiring task
 * (which was constrained to hooks/api/accounting/** and this script). The accounting
 * rewrite owner should wire or delete them; the baseline is raised to document rather
 * than silently absorb the gap.
 */
const BASELINE = { deadFiles: 0, deadExports: 0 };

const SCAN_FLOOR = { knipTotal: 5, graphFiles: 100, graphEdges: 300 };

/**
 * Hand-written verdicts are now the exception. Every data-layer type that used
 * to need one is answered structurally by DATA_LAYER_CONTRACT_RE above; what is
 * left is the handful outside `hooks/api/`.
 *
 * TWO KEY SPACES:
 *   `<relative path>:<symbol>`  a file-scoped export or type
 *   `dep:<package name>`        a package.json finding — an unused, unlisted, unresolved
 *                               dependency or binary. Added 2026-09-03: this gate read only
 *                               knip's `files`, `exports` and `types` groups, so the frontend's
 *                               114 declared dependencies were classified by NO wired gate at
 *                               all, and knip's `binaries` finding on this very package.json
 *                               went unread. The backend twin has iterated all nine groups since
 *                               its own version of this defect was found.
 *
 * A `dep:` verdict is subject to the same staleness check as every other: when the package stops
 * being reported (someone imports it, or it is removed), the verdict goes stale and the gate bites,
 * so a suppression cannot outlive its reason. That is what makes this a ledger rather than an
 * ignore list — knip.json's `ignoreDependencies` held these three with no recorded reason and no
 * expiry, which is the unexplained-suppression shape PRD-C036 forbids.
 */
const EXPORT_VERDICTS = new Map([

  ["dep:sharp", { verdict: "KEEP", reason: "Next.js's image optimiser loads sharp itself at runtime, by name, from the server bundle — there is no import of it in this repo and there must not be one. Removing it makes next/image fall back to the slow unoptimised path in production. Stale the day next/image is no longer used or Next bundles its own encoder" }],
  ["dep:tailwindcss", { verdict: "KEEP", reason: "loaded by CSS, not by the module graph: globals.css line 1 is `@import \"tailwindcss\"`, resolved by @tailwindcss/postcss at build time. knip reads TypeScript imports and cannot see a CSS @import. Stale the day the project stops importing tailwind from CSS" }],
  ["dep:@tailwindcss/typography", { verdict: "KEEP", reason: "same shape one line further down: globals.css line 3 is `@plugin \"@tailwindcss/typography\"`, a Tailwind 4 CSS-first plugin registration with no JS import anywhere. Stale the day that @plugin line is removed" }],

  ["lib/command-catalog.ts:NotificationCommandName", { verdict: "KEEP", reason: "keyof typeof NOTIFICATION_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:ChatCommandName", { verdict: "KEEP", reason: "keyof typeof CHAT_COMMANDS — available for consumers that need a typed command-name union without importing the full catalog" }],
  ["lib/command-catalog.ts:CommandDomain", { verdict: "KEEP", reason: "keyof typeof ALL_COMMANDS — available for consumers that iterate over command domains" }],
  ["lib/expense-constants.ts:ReceiptFileKind", { verdict: "KEEP", reason: "re-exported type from lib/expense-receipts; provides stable import path for consumers that need the kind union without importing the full receipts module. Moved here on 2026-09-07 when features/hr/expenses/expense-constants.ts was deleted as a byte-identical duplicate of this file — every importer already read @/lib/expense-constants." }],
  ["hooks/api/meetings-ai.ts:useMeetingFollowUp", { verdict: "KEEP", reason: "the buffered POST /ai/meetings/follow-up client, deliberately kept beside streamMeetingFollowUp now that meeting-follow-up-panel streams; the buffered route returns a Zod-validated record this release does not stream, and a previous pass deleted a buffered hook before its surface had moved and broke the live panel" }],
  ["hooks/api/kb/page-ai.ts:useKbPageImprove", { verdict: "KEEP", reason: "the buffered POST /kb/pages/:id/ai/improve client, kept beside streamKbDocAi now that the KB page AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/page-ai.ts:useKbPageSuggestRelated", { verdict: "KEEP", reason: "the buffered POST /kb/pages/:id/ai/suggest-related client, kept beside streamKbDocAi now that the KB page AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleAsk", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/ask client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleImprove", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/improve client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],
  ["hooks/api/kb/article-ai.ts:useKbArticleSuggestRelated", { verdict: "KEEP", reason: "the buffered POST /kb/articles/:id/ai/suggest-related client, kept beside streamKbDocAi now that the KB article AI panel streams; the buffered route is still live and still published in the API contract, and this release does not delete a documented client the moment its own surface moves off it" }],

  /*
   * Boundary types outside `hooks/api/`. DATA_LAYER_CONTRACT_RE answers the ones that live beside
   * their contract; these two live in `types/leads.ts` and are the MEMBER shapes of contracts wired
   * in `hooks/api/leads.ts` — derived with `z.infer`, so they cannot drift from the wire, and they
   * sit in a file whose sibling aliases (LeadBoard, SlaAlertResponse, ConversionBySource…) are
   * imported by name all over `features/crm/`. Deleting a derived member alias would be deleting
   * the module's own idiom, not dead code. They go stale the day their parent contract is removed.
   */
  ["types/leads.ts:LeadBoardColumn", { verdict: "KEEP", reason: "z.infer<typeof leadBoardContract>[string] — the per-stage column shape of the live board contract fetched by useLeadBoard; the board is keyed by the org's own pipeline stages, so the column type is reached by indexing LeadBoard rather than by name" }],
  ["types/leads.ts:SlaAlert", { verdict: "KEEP", reason: "z.infer<typeof leadsSlaAlertsContract>[\"leads\"][number] — the row shape of the live SLA-alerts contract whose envelope SlaAlertResponse is imported by features/crm/reports/components/sla-alert-card.tsx; consumers reach the row through the envelope, so the alias is never imported by name" }],

  /*
   * knip's `duplicates` group is NOT a dead-code finding: it reports two exports of one value, and
   * says nothing about whether either is used. Every group below is the same deliberate shape — one
   * row contract plus a per-ROUTE alias, each alias passed as the `contract` argument at exactly one
   * seam call. The alias is the seam: when a create/update/activate response diverges from the row
   * (an extra field, a narrower status), the divergence is expressed by changing one line in the
   * schema file, with no call-site edit and no risk of silently re-pointing a sibling route at the
   * same shape. Collapsing them to the base name would erase the per-route seam and make the
   * route -> contract mapping check-response-contracts.mjs reads ambiguous. Verified 2026-09-07:
   * for each group, the base is consumed in-file (list contract and/or z.infer row type) and every
   * alias is consumed at a distinct apiClient call — none is unreferenced. A group goes stale the
   * day one of its members stops being an alias or its route is deleted.
   */
  ["hooks/api/payments-schema.ts:webhookEventContract|webhookEventRowContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: webhookEventContract builds webhookEventListContract and types PaymentWebhookEvent, webhookEventRowContract parses POST /payments/providers/:key/webhooks/events/:id/retry" }],
  ["hooks/api/blog-schema.ts:blogPostWithRelationsContract|blogAdminPostDetailContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: blogPostWithRelationsContract builds the two admin list contracts and types AdminBlogPost, blogAdminPostDetailContract parses GET /blog/admin/posts/:id" }],
  ["hooks/api/support/support-channel-schema.ts:supportBusinessHoursRowContract|supportBusinessHoursContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: supportBusinessHoursRowContract builds supportBusinessHoursListContract, supportBusinessHoursContract parses POST and PATCH /support/business-hours" }],
  ["hooks/api/party/party-schema.ts:partyRowContract|partyDetailContract|partyMutationContract", { verdict: "KEEP", reason: "one row contract + per-route aliases: partyRowContract builds the list contract and types BusinessParty, partyDetailContract parses GET /party/parties/:id, partyMutationContract parses POST and PATCH /party/parties" }],
  ["hooks/api/hr/engagement-schema.ts:pollContract|createPollContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: pollContract builds listPollsContract and types HrPoll, createPollContract parses the poll-create seam in hooks/api/hr/engagement.ts" }],
  ["hooks/api/hr/engagement-schema.ts:communityBaseContract|createCommunityContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: communityBaseContract is extended with members[] inside listCommunitiesContract, createCommunityContract parses the community-create seam in hooks/api/hr/engagement.ts" }],
  ["hooks/api/hr/engagement-schema.ts:campaignContract|createCampaignContract|updateCampaignContract", { verdict: "KEEP", reason: "one row contract + per-route aliases: campaignContract builds listCampaignsContract and types HrCampaign, createCampaignContract and updateCampaignContract parse the two campaign mutation seams in hooks/api/hr/engagement.ts" }],
  ["hooks/api/hr/leave-policies-schema.ts:leavePolicyRowContract|createLeavePolicyContract|updateLeavePolicyContract", { verdict: "KEEP", reason: "one row contract + per-route aliases: leavePolicyRowContract builds leavePoliciesListContract, createLeavePolicyContract and updateLeavePolicyContract parse the two mutation seams in hooks/api/hr/leave-policies.ts" }],
  ["hooks/api/hr/policies-schema.ts:hrPolicyRowContract|createHrPolicyContract|updateHrPolicyContract|createPolicyVersionContract|activatePolicyContract", { verdict: "KEEP", reason: "one row contract + four per-route aliases, each passed at a distinct seam in hooks/api/hr/policies.ts (create, update, create-version, activate); the row builds the list contract. Version and activation responses are the ones most likely to diverge from the row, which is why they hold their own names" }],
  ["hooks/api/hr/letters-schema.ts:letterRenderRowSchema|saveLetterContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: letterRenderRowSchema builds lettersListContract, saveLetterContract parses the letter-save seam in hooks/api/hr/letters.ts" }],
  ["hooks/api/hr/workforce-schema.ts:headcountPlanRowContract|updateHeadcountPlanContract", { verdict: "KEEP", reason: "one row contract + a per-route alias: headcountPlanRowContract builds createHeadcountPlanContract (an array) and types HeadcountPlanRow, updateHeadcountPlanContract parses PATCH /hr/analytics-plus/workforce/plans/:id, which returns a single row" }],
  ["hooks/api/hr/recruitment/jobs-schema.ts:jobPostingRowContract|jobPostingDetailContract|createJobPostingContract|duplicateJobPostingContract", { verdict: "KEEP", reason: "all four are live and reached through lazyContract's dynamic import() -- jobs.ts:34/40/43 and candidates-schema.ts:3 -- which knip's static graph cannot follow. This is the dynamic-import blind spot section 10 names, not dead code; each was verified by grep to have a real consumer before this verdict was written." }],

  /*
   * Recorded on the integration branch (2026-09-11) for exports the CRM/Timesheets merge left
   * unclassified. Two of those nineteen are omitted here: the hooks/api/payments.ts manual-method
   * TYPES (ManualMethodStatus, SaveManualMethodPayload) are answered structurally by
   * DATA_LAYER_CONTRACT_RE, so their verdicts would never be consulted and would read as stale.
   */

  ["components/shared/gated.tsx:GateState", { verdict: "KEEP", reason: "re-exports lib/rbac/gate's GateState beside <Gated>, the state Gated resolves; it is not part of GatedProps and nothing imports it from here (lib/rbac/gate.ts is its home). Deletion candidate for the components/shared owner" }],

  ["hooks/api/party/merges.ts:useDetectPartyDuplicates", { verdict: "WIRE", reason: "per-party 'look for duplicates' action not wired; backend POST /party/parties/:partyId/detect-duplicates exists (party-merge.controller.ts) and its results land in the /parties/duplicates queue; add the action to features/party/parties/party-detail-sheet.tsx" }],


  ["lib/accounting/money.ts:formatSignedBalance", { verdict: "WIRE", reason: "general-ledger-columns.tsx and general-ledger-client.tsx inline formatMoney(Math.abs(balance), currency) beside balanceDirection(); that expression is this function" }],
  ["lib/accounting/money.ts:MoneyValue", { verdict: "KEEP", reason: "the { minor, currency } pair this money library is written around; no rewrite type adopted it (they carry *Minor and currency as sibling fields). Deletion candidate for the accounting-rewrite owner" }],
  ["hooks/api/accounting/ledger.ts:useTrialBalance", { verdict: "KEEP", reason: "typed read of the kernel's GET /accounting/trial-balance, which the backend still serves (kernel.controller.ts); the trial balance page reads GET /accounting/reports/trial-balance through useTrialBalanceReport. Deletion candidate for the accounting-rewrite owner" }],
  ["hooks/api/accounting/banking.ts:useBankAccount", { verdict: "WIRE", reason: "no bank-account detail surface in the accounting rewrite: /accounting/banking has only the list, import and reconciliation pages; backend GET /accounting/banking/accounts/:bankAccountId exists (bank-accounts.controller.ts)" }],
  ["hooks/api/accounting/banking.ts:useUpdateBankAccount", { verdict: "WIRE", reason: "no edit action for a bank account: bank-accounts-page.tsx lists and add-bank-account-sheet.tsx creates, nothing edits; backend PATCH /accounting/banking/accounts/:bankAccountId exists (bank-accounts.controller.ts)" }],
  ["hooks/api/accounting/parties.ts:usePartyTaxRegistrations", { verdict: "KEEP", reason: "standalone read of GET /accounting/parties/:partyId/tax-registrations; customer-detail-client.tsx passes PartyDetail.taxRegistrations from useParty to PartyTaxRegistrationsCard, and the add/remove mutations invalidate the party detail. Deletion candidate for the accounting-rewrite owner" }],
  ["hooks/api/accounting/parties.ts:useDeleteParty", { verdict: "WIRE", reason: "no delete action on accounting customers or vendors (features/accounting/parties, features/accounting/purchases/vendors); backend DELETE /accounting/parties/:partyId exists (parties.controller.ts)" }],
  ["features/accounting/purchases/lib/ap-labels.ts:withholdingExplainer", { verdict: "WIRE", reason: "never rendered; bill-summary-card.tsx renders its sibling reverse-charge and blocked-input-tax explainers, but the 'Tax withheld' tile in features/accounting/purchases/payments/payment-detail-sheet.tsx only states the rate" }],
  ["features/accounting/sales/ar-labels.tsx:documentStatusLabel", { verdict: "KEEP", reason: "the only public text accessor for the module-private DOCUMENT_STATUS_LABEL map; ArStatusBadge and DOCUMENT_STATUS_OPTIONS cover every current surface, and this is the plain-text form for non-JSX contexts" }],
  ["features/accounting/setup/enable-accounting-schema.ts:EnableAccountingPayload", { verdict: "WIRE", reason: "enable-accounting-card.tsx types handleSubmit as EnableAccountingFormValues (the z.input) and re-parses with enableAccountingSchema.parse, though zodResolver already passes the parsed z.output; useForm<EnableAccountingFormValues, unknown, EnableAccountingPayload> gives the handler this type and drops the second parse" }],

  /*
   * Accounting response contracts that are not yet wired to a hook call.
   *
   * Every entry below was checked against the current hook files in
   * hooks/api/accounting/ and either (a) has no corresponding hook because the
   * feature is not yet implemented, or (b) cannot be wired because the existing
   * hook's generic disagrees structurally with the contract — a disagreement that
   * is the real finding, not dead code. Field-by-field mismatches are named in
   * each reason so the rewrite owner can reconcile rather than guess.
   *
   * Wire each contract when: for (a), the hook and its UI surface ship; for (b),
   * the hook's return type is updated to match the contract (or the contract is
   * corrected to match the real API shape), confirmed by tsc.
   */

  ["hooks/api/accounting/ar-schema.ts:recurringInvoiceTemplateListContract", { verdict: "KEEP", reason: "cursor-paginated list contract for GET /accounting/ar/recurring-templates; no hook in ar.ts calls this endpoint — the recurring-invoice scheduling feature has not been implemented in the rewritten AR module. Wire alongside the recurring-templates page when it ships." }],
  ["hooks/api/accounting/ar-schema.ts:recurringInvoiceRunNowContract", { verdict: "KEEP", reason: "mutation response contract for POST /accounting/ar/recurring-templates/:id/run-now returning { invoiceId }; no hook exists — same unimplemented recurring-invoice feature as recurringInvoiceTemplateListContract. Wire when the feature ships." }],
  ["hooks/api/accounting/ar-schema.ts:recurringTemplateDeleteContract", { verdict: "KEEP", reason: "mutation response contract for DELETE /accounting/ar/recurring-templates/:id returning { id, deleted }; no hook exists — same unimplemented recurring-invoice feature. Wire when the feature ships." }],
  ["hooks/api/accounting/ar-schema.ts:voidInvoiceContract", { verdict: "KEEP", reason: "mutation response contract for POST /accounting/ar/invoices/:id/void returning { id, status }; no hook in ar.ts calls a void endpoint — the rewritten AR module uses useDeleteArInvoiceDraft for draft removal and usePostArInvoice for posting; a standalone void action was not carried into the rewrite. Wire when a void route is confirmed on the rewritten module." }],
  ["hooks/api/accounting/ar-schema.ts:arPaymentCreatedContract", { verdict: "KEEP", reason: "type mismatch with useCreateArReceipt: arPaymentCreatedContract returns { id } but the hook returns { receipt: ArReceiptView; journal: Journal } from POST /accounting/ar/receipts — the old ar-payments API pre-dates the receipt-and-journal rewrite and is no longer called. Cannot wire without reconciling the hook's return type." }],
  ["hooks/api/accounting/ar-schema.ts:creditNoteCreatedContract", { verdict: "KEEP", reason: "type mismatch with useCreateCreditNote and useCreditNoteFromInvoice: this contract extends creditNoteContract (the old credit-note model) with cgstAmount, sgstAmount, igstAmount fields, but both hooks return ArDocumentView from the rewritten receivables API — the old create-credit-note response shape is no longer sent. Cannot wire without reconciling the hook return type." }],
  ["hooks/api/accounting/ar-schema.ts:creditNotePostContract", { verdict: "KEEP", reason: "type mismatch with usePostCreditNote: this contract is a discriminated union for the old approval-workflow response ({ needsApproval: true, creditNoteId } | { success: true, creditNoteNumber }) but usePostCreditNote returns { document: ArDocumentView; journal: Journal } from the rewritten module. Cannot wire without reconciling the hook return type." }],
  ["hooks/api/accounting/ar-schema.ts:creditNoteApplyContract", { verdict: "KEEP", reason: "type mismatch with useAllocateCreditNote: creditNoteApplyContract returns { success: true } for the old credit-note apply endpoint, but useAllocateCreditNote returns CreditNoteAllocationResult from the rewritten receivables API. Cannot wire without reconciling the hook return type." }],
  ["hooks/api/accounting/ar-schema.ts:reminderPolicyListContract", { verdict: "KEEP", reason: "list contract for GET /accounting/ar/reminder-policies returning { items, pagination }; no hook in ar.ts calls this endpoint — the invoice-reminder collections feature (scheduled outbound reminders with EMAIL/WHATSAPP channels) has not been implemented. Wire when the reminder-policy management page ships." }],
  ["hooks/api/accounting/ar-schema.ts:reminderLogListContract", { verdict: "KEEP", reason: "list contract for GET /accounting/ar/reminder-logs returning { items, pagination }; no hook exists — same unimplemented collections-reminder feature as reminderPolicyListContract. Wire together with that contract." }],
  ["hooks/api/accounting/ar-schema.ts:collectionSummaryContract", { verdict: "KEEP", reason: "read contract for GET /accounting/ar/collections/summary returning aging buckets and top-risk customers; no hook in ar.ts calls this endpoint — the collections dashboard feature (overdue-invoice risk scoring) has not been implemented. Wire when the collections summary page ships." }],
  ["hooks/api/accounting/ar-schema.ts:collectionActivityCreatedContract", { verdict: "KEEP", reason: "mutation response contract for POST /accounting/ar/collections/activities returning a created activity record; no hook exists — same unimplemented collections feature as collectionSummaryContract. Wire when the collections activity log ships." }],
  ["hooks/api/accounting/ar-schema.ts:reminderPolicyDeleteContract", { verdict: "KEEP", reason: "mutation response contract for DELETE /accounting/ar/reminder-policies/:id returning { success: true }; no hook exists — same unimplemented reminder-policy feature as reminderPolicyListContract. Wire together." }],
  ["hooks/api/accounting/ar-schema.ts:invoiceCollectionUpdateContract", { verdict: "KEEP", reason: "mutation response contract for PATCH /accounting/ar/invoices/:id/collection returning { success: true }; no hook exists — the invoice-level collection-assignment update is part of the unimplemented collections feature. Wire when that feature ships." }],

  ["hooks/api/accounting/banking-schema.ts:bankImportCreateContract", { verdict: "KEEP", reason: "type mismatch with useImportBankStatement: bankImportCreateContract returns { id, importedCount, duplicateCount, totalRows } but useImportBankStatement returns StatementImportResult (statementId, bankProfileId, currency, periodStart, periodEnd, openingMinor, closingMinor, movementMinor, lineCount, fileHash, warnings, lines) from POST /accounting/banking/statements/imports — the bank-import API was rewritten to return a full statement detail rather than a row-count summary. Cannot wire without reconciling the hook return type." }],
  ["hooks/api/accounting/banking-schema.ts:reconRuleListContract", { verdict: "KEEP", reason: "cursor-paginated list contract for GET /accounting/banking/recon-rules; no hook in banking.ts calls this endpoint — the auto-match rule manager (rules that categorise imported bank transactions by description/counterparty/amount patterns) has not been implemented in the banking module. Wire when the recon-rules page ships." }],
  ["hooks/api/accounting/banking-schema.ts:bankTransferListContract", { verdict: "KEEP", reason: "cursor-paginated list contract for GET /accounting/banking/transfers; no hook in banking.ts calls this endpoint — the bank-to-bank transfer listing feature has not been implemented. Wire when the transfers page ships." }],

  ["hooks/api/accounting/core-gl-schema.ts:ledgerAccountListContract", { verdict: "KEEP", reason: "cursor-paginated list contract for a /accounting/ledger-accounts endpoint; no hook calls it — useChartOfAccounts (ledger.ts) returns AccountNode[] from the non-paginated GET /accounting/accounts tree endpoint, which is a different route and a different response shape. Wire when a paginated ledger-accounts picker or listing hook is added." }],

  ["hooks/api/accounting/core-coa-schema.ts:coaTemplateListContract", { verdict: "KEEP", reason: "read contract for GET /accounting/coa/templates returning { items: [{key, label, country, accountCount}] }; no hook in ledger.ts or ledger-mutations.ts calls this endpoint — the COA template browser in the accounting setup wizard has not been implemented. Wire alongside coaApplyTemplateContract when the setup wizard ships the template step." }],
  ["hooks/api/accounting/core-coa-schema.ts:coaAccountStatusContract", { verdict: "KEEP", reason: "type mismatch: coaAccountStatusContract returns { id, isActive } for a PATCH account-status toggle, but useArchiveAccount (ledger-mutations.ts) calls DELETE /accounting/accounts/:id and returns { deactivatedInsteadOfDeleted: boolean; postings: number }, while useUpdateAccount returns a full AccountNode — neither hook calls the PATCH status endpoint this contract describes. Cannot wire without a dedicated hook." }],
  ["hooks/api/accounting/core-coa-schema.ts:coaApplyTemplateContract", { verdict: "KEEP", reason: "mutation response contract for POST /accounting/coa/apply-template returning { templateKey, inserted, skipped }; no hook in ledger-mutations.ts calls this endpoint — the setup wizard's apply-COA-template action is unimplemented. Wire alongside coaTemplateListContract when the setup wizard ships." }],
  ["hooks/api/accounting/core-coa-schema.ts:journalApprovalSubmitContract", { verdict: "KEEP", reason: "mutation response contract for a journal approval-submission endpoint returning { entryId, status }; no hook in ledger-mutations.ts calls a submit endpoint — the journal approval workflow (submit → approve/reject cycle) has not been implemented in the rewritten accounting module. Wire alongside journalApprovalDecisionContract when the approval workflow ships." }],
  ["hooks/api/accounting/core-coa-schema.ts:journalApprovalDecisionContract", { verdict: "KEEP", reason: "mutation response contract for a journal approval-decision endpoint returning { entryId, decision, entryStatus }; no hook exists — same unimplemented journal-approval workflow as journalApprovalSubmitContract. Wire together when the approval workflow ships." }],
]);

function checkStaleVerdicts(verdicts, processedKeys) {
  const stale = [];
  for (const key of verdicts.keys()) {
    if (!processedKeys.has(key)) stale.push(key);
  }
  return stale;
}

function toFwd(p) {
  return p.replace(/\\/g, "/");
}

function tryFile(p) {
  try {
    const s = statSync(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

function findFile(spec, fromDir, root) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = pathResolve(fromDir, spec);
  else return null;

  if (tryFile(base)) return base;
  for (const ext of [".ts", ".tsx"]) {
    const r = tryFile(base + ext);
    if (r) return r;
  }
  const idxTs = join(base, "index.ts");
  if (tryFile(idxTs)) return idxTs;
  const idxTsx = join(base, "index.tsx");
  if (tryFile(idxTsx)) return idxTsx;
  return null;
}

function* walkTs(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (isExcludedScanDir(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkTs(full);
    else if (/\.(ts|tsx)$/.test(e.name)) yield full;
  }
}

/**
 * `stats` is filled in place rather than returned, so the corpus line can report how much of the
 * tree the graph actually read without changing this function's return type (the self-test drives
 * it directly). `walked` counts every TS/TSX file offered; `read` counts the ones whose source was
 * parsed for imports — a file that fails to read contributes no edges and is silently absent from
 * the graph, which is precisely the kind of gap a gate must name rather than absorb.
 */
function buildImporterMap(root, stats = { walked: 0, read: 0 }) {
  const map = new Map();

  function record(target, importer, kind) {
    if (!target) return;
    if (!map.has(target)) {
      map.set(target, { sideEffect: new Set(), named: new Set(), reexport: new Set(), dynamic: new Set() });
    }
    map.get(target)[kind].add(importer);
  }

  for (const file of walkTs(root)) {
    stats.walked++;
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    stats.read++;
    const fromDir = dirname(file);

    for (const line of src.split("\n")) {
      const m = line.match(/^\s*import\s+["']([^"']+)["']\s*;?\s*$/);
      if (m) record(findFile(m[1], fromDir, root), file, "sideEffect");
    }

    let m;
    const namedRe = /^import\s+(?:type\s+)?(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/gm;
    while ((m = namedRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "named");
    }

    const reRe = /^export\s+(?:type\s+)?(?:\{[^}]+\}|\*[^"'\n]*)\s+from\s+["']([^"']+)["']/gm;
    while ((m = reRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "reexport");
    }

    const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = dynRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "dynamic");
    }
  }

  return map;
}

/**
 * Which symbols are actually imported THROUGH each barrel.
 *
 * PRD-C026 closes with "An exported symbol is not considered used merely because a barrel exports
 * it." The gate used to do the literal inverse: every export of a named contract barrel and every
 * export of a feature barrel was RETAINED-BY-CONTRACT by rule, so a re-export line nothing imports
 * through was indistinguishable from one twenty files depend on. This index makes the difference
 * visible, per symbol.
 *
 * `symbols` holds the names some file imported by name from that barrel path. `wildcard` is set
 * when a file reached the barrel through `import * as ns from` or `export * from`, where the
 * consumed names cannot be read off the statement; a wildcard retains the whole barrel. That is
 * deliberately conservative — the tightening must never be able to delete a line that is genuinely
 * reached — and it is why this index can only ever report FEWER retentions than the blanket rule,
 * never more.
 */
function buildBarrelUseIndex(root) {
  const map = new Map();

  function touch(abs) {
    const rel = toFwd(relative(root, abs));
    if (!map.has(rel)) map.set(rel, { symbols: new Set(), wildcard: false });
    return map.get(rel);
  }

  for (const file of walkTs(root)) {
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const fromDir = dirname(file);
    let m;

    const braceRe = /^\s*(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm;
    while ((m = braceRe.exec(src)) !== null) {
      const target = findFile(m[2], fromDir, root);
      if (!target || target === file) continue;
      const entry = touch(target);
      for (const raw of m[1].split(",")) {
        const piece = raw.trim().replace(/^type\s+/, "");
        if (!piece) continue;
        const name = piece.split(/\s+as\s+/)[0].trim();
        if (name) entry.symbols.add(name);
      }
    }

    const starRe = /^\s*(?:import\s+\*\s+as\s+\w+|export\s+\*(?:\s+as\s+\w+)?)\s+from\s*["']([^"']+)["']/gm;
    while ((m = starRe.exec(src)) !== null) {
      const target = findFile(m[1], fromDir, root);
      if (!target || target === file) continue;
      touch(target).wildcard = true;
    }
  }

  return map;
}

function classifyFile(relPath, knipDeadSet, importerMap, root) {
  const stem = basename(relPath).replace(/\.[^.]+$/, "");
  // Path-classified, anchored: a file under a generated/scratch/vendor directory
  // is not authored product source, so knip's verdict on it says nothing about
  // this codebase. Segment-wise so an authored `next-intl/` is never swallowed.
  if (relPath.split("/").some((seg) => isExcludedScanDir(seg))) {
    return { cls: "OUT-OF-SCOPE", reason: "generated, vendored or scratch path — not authored product source" };
  }
  if (NEXT_CONVENTION_STEMS.has(stem)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "Next.js filesystem entry convention" };
  }
  if (SCRIPTS_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "standalone executable script, not a module" };
  }
  if (TEST_INFRA_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; no current consumer — the path exists for future tests" };
  }

  const absPath = join(root, ...relPath.split("/"));
  const entry = importerMap.get(absPath);

  if (entry) {
    for (const [kind, importers] of Object.entries(entry)) {
      for (const imp of importers) {
        const impRel = toFwd(relative(root, imp));
        if (!knipDeadSet.has(impRel)) {
          const reason =
            kind === "sideEffect" ? `side-effect import from live file (${impRel})`
            : kind === "reexport" ? `re-exported from live barrel (${impRel})`
            : kind === "dynamic" ? `dynamic import from live file (${impRel})`
            : `named import from live file (${impRel})`;
          return { cls: "RETAINED-BY-CONTRACT", reason };
        }
      }
    }
  }

  return { cls: "DEAD", reason: "no live importers found in module graph" };
}

/**
 * The knip issue groups this gate reads, and the key space each one lands in.
 *
 * It used to read three of them. `dependencies`, `devDependencies`, `optionalPeerDependencies`,
 * `unlisted`, `unresolved` and `binaries` were never looked at, so no wired gate classified a
 * single one of the 114 declared dependencies — an unused dependency landing tomorrow would ship,
 * inflate the install and the lockfile, and nothing would object. `enumMembers`, `namespaceMembers`
 * and `duplicates` were unread for the same reason; they are empty today, which is a fact this
 * gate should be able to assert rather than a fact it cannot see.
 */
const DEPENDENCY_GROUPS = ["unlisted", "dependencies", "devDependencies", "optionalPeerDependencies", "unresolved", "binaries"];
const SYMBOL_GROUPS = ["exports", "types", "enumMembers", "namespaceMembers", "duplicates"];

/**
 * knip's `duplicates` group is an array of arrays: several exports in one file bound to the
 * same value. Those members have no `item.name`, so a bare String(item) printed
 * "[object Object],[object Object]" and the gate could not name what it had found.
 */
function symbolName(item) {
  if (item && typeof item === "object" && !Array.isArray(item) && item.name !== undefined) return item.name;
  if (Array.isArray(item)) return item.map(symbolName).join("|");
  return String(item);
}

/** The ledger key for a finding: dependencies are package-scoped, everything else file-scoped. */
function verdictKey(item) {
  return item.depKey ? `dep:${item.name}` : `${item.file}:${item.name}`;
}

/** How many packages the dependency half of this gate is answerable for. Narrative, never a gate. */
function declaredDependencyCount(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
  } catch {
    return 0;
  }
}

function classifyExport(filePath, name, verdicts = EXPORT_VERDICTS, kind = "export", knipDeadSet = new Set(), depKey = false, barrelUse = new Map()) {
  if (depKey) {
    // A package finding has no source path to classify by — package.json matches none of the
    // path rules below, and letting it fall through them would be classification by accident.
    // The ledger is the only thing that can answer it.
    const entry = verdicts.get(`dep:${name}`);
    if (entry) return { cls: entry.verdict, reason: entry.reason };
    return {
      cls: "UNCLASSIFIED",
      reason: `no verdict recorded for dep:${name}; add a WIRE/KEEP entry to EXPORT_VERDICTS with a written reason, or remove the dependency`,
    };
  }
  if (TEST_INFRA_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "test-infrastructure utility; exports are available for all test suites" };
  }
  if (SCRIPTS_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "standalone executable script, not a module — exports are available to sibling scripts" };
  }
  if (CRM_INVENTORY_RE.test(filePath)) {
    return { cls: "EXCLUDED", reason: "CRM/Inventory excluded from PRD scope; not counted in dead-code baseline" };
  }
  if (CONTRACT_BARRELS.has(filePath) || FEATURE_BARREL_RE.test(filePath)) {
    const kindLabel = CONTRACT_BARRELS.has(filePath) ? "named intentional barrel" : "feature barrel";
    const use = barrelUse.get(filePath);
    if (use && use.wildcard) {
      return { cls: "RETAINED-BY-CONTRACT", reason: `${kindLabel} reached by a star import/re-export, whose consumed names cannot be read off the statement` };
    }
    if (use && use.symbols.has(name)) {
      return { cls: "RETAINED-BY-CONTRACT", reason: `${kindLabel}: some live file imports \`${name}\` THROUGH this barrel` };
    }
    return {
      cls: "UNCLASSIFIED",
      reason: `${kindLabel} re-exports \`${name}\` but no file imports that name through it — PRD-C026: an export is not used merely because a barrel exports it. Delete the re-export line, or point a consumer at the barrel`,
    };
  }
  if (
    kind === "type" &&
    DATA_LAYER_CONTRACT_RE.test(filePath) &&
    !knipDeadSet.has(filePath)
  ) {
    return {
      cls: "RETAINED-BY-CONTRACT",
      reason: "type erased at the boundary: the inferred shape of a live data-layer contract, reached through the hook's return type rather than by name",
    };
  }
  const key = `${filePath}:${name}`;
  if (verdicts.has(key)) {
    const { verdict, reason } = verdicts.get(key);
    return { cls: verdict, reason };
  }
  return { cls: "UNCLASSIFIED", reason: "no verdict recorded in EXPORT_VERDICTS; add a WIRE/KEEP entry to resolve" };
}

/**
 * Counted, not narrated. The PASS line used to print a hard-coded "(18 assertions)" while the
 * body ran 21 — the exact shape v2 ticket 30 was asked to sweep for (a backend self-test once
 * printed 27 while its own list named 30). A number that cannot move is not a measurement.
 */
let assertionsRun = 0;
function assert(cond, msg) {
  assertionsRun++;
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthRoot = join(sep === "\\" ? "C:\\synthetic" : "/synthetic");
  const knipDeadSet = new Set(["dead.ts", "side-effect-dep.ts", "reexport-source.ts"]);

  const sideEffectDepAbs = join(synthRoot, "side-effect-dep.ts");
  const reexportSourceAbs = join(synthRoot, "reexport-source.ts");
  const liveEntryAbs = join(synthRoot, "live-entry.ts");
  const liveBarrelAbs = join(synthRoot, "live-barrel.ts");

  const synthMap = new Map([
    [
      sideEffectDepAbs,
      { sideEffect: new Set([liveEntryAbs]), named: new Set(), reexport: new Set(), dynamic: new Set() },
    ],
    [
      reexportSourceAbs,
      { sideEffect: new Set(), named: new Set(), reexport: new Set([liveBarrelAbs]), dynamic: new Set() },
    ],
  ]);

  const r1 = classifyFile("dead.ts", knipDeadSet, synthMap, synthRoot);
  const r2 = classifyFile("side-effect-dep.ts", knipDeadSet, synthMap, synthRoot);
  const r3 = classifyFile("reexport-source.ts", knipDeadSet, synthMap, synthRoot);

  assert(r1.cls === "DEAD",
    `(a) dead.ts → expected DEAD, got ${r1.cls}`);
  assert(r2.cls === "RETAINED-BY-CONTRACT",
    `(b) side-effect-dep.ts → expected RETAINED-BY-CONTRACT, got ${r2.cls}`);
  assert(r3.cls === "RETAINED-BY-CONTRACT",
    `(c) reexport-source.ts → expected RETAINED-BY-CONTRACT, got ${r3.cls}`);

  /*
   * PRD-C026: "An exported symbol is not considered used merely because a barrel exports it."
   * (d) pins the retention to per-symbol evidence and (d1)/(d2) are its bite: the same barrel
   * export with NO consumer, and a DIFFERENT symbol's consumer, must both fail. Before this the
   * gate returned RETAINED-BY-CONTRACT for all three.
   */
  const barrelEvidence = new Map([
    ["features/some-feature/index.ts", { symbols: new Set(["SomeThing"]), wildcard: false }],
    ["components/shared/index.ts", { symbols: new Set(), wildcard: true }],
  ]);

  const r4 = classifyExport("features/some-feature/index.ts", "SomeThing", EXPORT_VERDICTS, "export", new Set(), false, barrelEvidence);
  assert(r4.cls === "RETAINED-BY-CONTRACT",
    `(d) feature barrel export imported THROUGH the barrel → expected RETAINED-BY-CONTRACT, got ${r4.cls}`);

  const r4a = classifyExport("features/some-feature/index.ts", "Unreached", EXPORT_VERDICTS, "export", new Set(), false, barrelEvidence);
  assert(r4a.cls === "UNCLASSIFIED",
    `(d1) BITE: a feature-barrel re-export no file imports through → expected UNCLASSIFIED, got ${r4a.cls}`);

  const r4b = classifyExport("components/shared/index.ts", "RichPanel", EXPORT_VERDICTS, "export", new Set(), false, new Map());
  assert(r4b.cls === "UNCLASSIFIED",
    `(d2) BITE: a named contract-barrel re-export with no consumer → expected UNCLASSIFIED, got ${r4b.cls}`);

  const r4c = classifyExport("components/shared/index.ts", "RichPanel", EXPORT_VERDICTS, "export", new Set(), false, barrelEvidence);
  assert(r4c.cls === "RETAINED-BY-CONTRACT",
    `(d3) a barrel reached by a star re-export retains every symbol → expected RETAINED-BY-CONTRACT, got ${r4c.cls}`);

  /*
   * The index itself must record what an import statement actually consumes, or (d) would pass on
   * an index that is simply always empty — and an always-empty index makes (d1)/(d2) vacuous too.
   */
  const barrelFixtureDir = join(tmpdir(), `dead-code-barrel-self-test-${Date.now()}`);
  try {
    mkdirSync(join(barrelFixtureDir, "bar"), { recursive: true });
    writeFileSync(join(barrelFixtureDir, "bar", "index.ts"), 'export { Used, Unused } from "./impl";\n');
    writeFileSync(join(barrelFixtureDir, "bar", "impl.ts"), "export const Used = 1;\nexport const Unused = 2;\n");
    writeFileSync(join(barrelFixtureDir, "consumer.ts"), 'import { Used } from "./bar";\nexport const c = Used;\n');
    writeFileSync(join(barrelFixtureDir, "star.ts"), 'export * from "./bar";\n');

    const idx = buildBarrelUseIndex(barrelFixtureDir);
    const barrelEntry = idx.get("bar/index.ts");
    assert(barrelEntry !== undefined,
      "(d4) buildBarrelUseIndex resolves a directory specifier to its index.ts");
    assert(barrelEntry !== undefined && barrelEntry.symbols.has("Used"),
      "(d5) buildBarrelUseIndex records the symbol a consumer imports through the barrel");
    assert(barrelEntry !== undefined && !barrelEntry.symbols.has("Unused"),
      "(d6) BITE: buildBarrelUseIndex does NOT record a barrel symbol nobody imports");
    assert(barrelEntry !== undefined && barrelEntry.wildcard === true,
      "(d7) buildBarrelUseIndex flags a star re-export as a wildcard consumer");
    const implEntry = idx.get("bar/impl.ts");
    assert(implEntry !== undefined && implEntry.symbols.has("Unused"),
      "(d8) the barrel's own re-export line counts as a consumer of the SOURCE module, not of itself");
  } finally {
    rmSync(barrelFixtureDir, { recursive: true, force: true });
  }

  const r5 = classifyExport("hooks/api/crm/metadata.ts", "SomeExport");
  assert(r5.cls === "EXCLUDED",
    `(e) CRM export → expected EXCLUDED, got ${r5.cls}`);

  const r6 = classifyExport("hooks/api/some-new-hook.ts", "useNewHook");
  assert(r6.cls === "UNCLASSIFIED",
    `(i) unclassified export → expected UNCLASSIFIED (gate would fail), got ${r6.cls}`);

  const synthVerdicts = new Map([
    ["hooks/api/workflows.ts:useWorkflowSchedules", { verdict: "DEFERRED", reason: "planned schedule-management UI — hook stub exists, page not yet implemented" }],
  ]);
  const r7 = classifyExport("hooks/api/workflows.ts", "useWorkflowSchedules", synthVerdicts);
  assert(r7.cls === "DEFERRED",
    `(j) DEFERRED verdict → expected DEFERRED, got ${r7.cls}`);

  const r8 = classifyExport("lib/command-catalog.ts", "CommandDomain");
  assert(r8.cls === "KEEP",
    `(k) KEEP verdict → expected KEEP, got ${r8.cls}`);

  const r8a = classifyExport("hooks/api/payroll/runs-schema.ts", "PayrollRunListItem", EXPORT_VERDICTS, "type");
  assert(r8a.cls === "RETAINED-BY-CONTRACT",
    `(o) a data-layer TYPE in a live module → expected RETAINED-BY-CONTRACT, got ${r8a.cls}`);

  const r8b = classifyExport("hooks/api/payroll/runs-schema.ts", "payrollRunListItemContract", EXPORT_VERDICTS, "export");
  assert(r8b.cls === "UNCLASSIFIED",
    `(p) BITE: a data-layer VALUE nothing imports is an unvalidated boundary → expected UNCLASSIFIED, got ${r8b.cls}`);

  const r8c = classifyExport(
    "hooks/api/ghost-schema.ts", "GhostRow", EXPORT_VERDICTS, "type",
    new Set(["hooks/api/ghost-schema.ts"]),
  );
  assert(r8c.cls === "UNCLASSIFIED",
    `(q) BITE: a type in a module NO live file imports is not retained → expected UNCLASSIFIED, got ${r8c.cls}`);

  const r8d = classifyExport("types/payroll/ess.ts", "EssSalaryComponent", EXPORT_VERDICTS, "type");
  assert(r8d.cls === "UNCLASSIFIED",
    `(r) the rule does NOT extend past hooks/api → expected UNCLASSIFIED, got ${r8d.cls}`);

  const fakeVerdicts = new Map([["hooks/api/ghost.ts:useGhost", { verdict: "WIRE", reason: "test" }]]);
  const stale = checkStaleVerdicts(fakeVerdicts, new Set());
  assert(stale.length === 1 && stale[0] === "hooks/api/ghost.ts:useGhost",
    `(l) stale verdict detection → expected [hooks/api/ghost.ts:useGhost], got [${stale.join(",")}]`);

  /*
   * THE DEPENDENCY HALF (2026-09-03).
   *
   * This gate read three of knip's issue groups and none of the six that carry package findings,
   * so 114 declared dependencies were classified by nothing. Measured before the fix: knip already
   * reported `binaries: feedbucket-widget` on this repo's own package.json and the gate printed
   * that finding nowhere. These pin both directions — a package with no verdict must bite, and a
   * package finding must NOT be answered by the path rules that classify source files.
   */
  const depUnknown = classifyExport("package.json", "left-pad", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depUnknown.cls === "UNCLASSIFIED",
    `(s) BITE: an unused dependency with no verdict → expected UNCLASSIFIED, got ${depUnknown.cls}`);
  assert(depUnknown.reason.includes("dep:left-pad"),
    `(t) the unclassified reason names the dep: key to add, got "${depUnknown.reason}"`);

  const depKnown = classifyExport("package.json", "sharp", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depKnown.cls === "KEEP",
    `(u) a dependency with a recorded verdict → expected KEEP, got ${depKnown.cls}`);
  assert(depKnown.reason.length > 40,
    `(v) a dependency verdict carries a WRITTEN reason, not a bare suppression (got ${depKnown.reason.length} chars)`);

  // (w) used `feedbucket-widget` as its fixture until 2026-09-09, when that verdict was retired:
  // knip only ever reported it because `check:cycles` shelled to `npx --yes madge@8 --exclude
  // "node_modules|\.next|feedbucket-widget"`, and knip parses a script string as shell, so the
  // regex's `|` read as a pipeline and its last alternative looked like a command. madge is now a
  // devDependency invoked as a local binary, the misparse is gone, and the verdict went stale
  // exactly as its own reason predicted. The binaries GROUP is still proven read by (ac); what is
  // asserted here is the classification path for a binaries finding that carries no verdict.
  const depBinary = classifyExport("package.json", "some-unrecorded-binary", EXPORT_VERDICTS, "binaries", new Set(), true);
  assert(depBinary.cls === "UNCLASSIFIED",
    `(w) an unrecorded binaries finding → expected UNCLASSIFIED, got ${depBinary.cls}`);
  assert(depBinary.reason.includes("dep:some-unrecorded-binary"),
    `(w2) the unclassified binaries reason names the dep: key to add, got "${depBinary.reason}"`);

  // Same name, source key space: the path rules must still answer it, and must not be reachable
  // from a package finding. `test-utils/x.ts` is RETAINED-BY-CONVENTION as a file path, but the
  // identical name under `dep:` has no verdict and must bite.
  const depNotPathClassified = classifyExport("test-utils/index.ts", "makeQueryClient", EXPORT_VERDICTS, "dependencies", new Set(), true);
  assert(depNotPathClassified.cls === "UNCLASSIFIED",
    `(x) a package finding must NOT be answered by a source-path rule → expected UNCLASSIFIED, got ${depNotPathClassified.cls}`);

  assert(verdictKey({ file: "package.json", name: "sharp", depKey: true }) === "dep:sharp",
    "(y) a dependency finding keys into the dep: space");
  assert(verdictKey({ file: "hooks/api/x.ts", name: "useX" }) === "hooks/api/x.ts:useX",
    "(z) a source finding keys into the file:symbol space");

  assert(symbolName({ name: "useX", line: 3 }) === "useX",
    "(z1) a plain knip finding is named by its own name");
  assert(symbolName([{ name: "aContract" }, { name: "bContract" }]) === "aContract|bContract",
    "(z2) a duplicates group names every member, not [object Object]");
  assert(!symbolName([{ name: "a" }, { name: "b" }]).includes("[object Object]"),
    "(z3) no finding may print [object Object] — a gate that cannot name a finding cannot be acted on");

  const staleDep = checkStaleVerdicts(new Map([["dep:sharp", { verdict: "KEEP", reason: "r" }]]), new Set());
  assert(staleDep.length === 1 && staleDep[0] === "dep:sharp",
    `(aa) BITE: a dep: verdict knip no longer reports goes stale → expected [dep:sharp], got [${staleDep.join(",")}]`);

  // Every group the gate claims to read must land somewhere. A group added to one list and not the
  // other would be silently unread again.
  assert(DEPENDENCY_GROUPS.length === 6 && SYMBOL_GROUPS.length === 5,
    `(ab) all nine knip issue groups plus files are wired (${DEPENDENCY_GROUPS.length}+${SYMBOL_GROUPS.length})`);
  for (const group of ["dependencies", "devDependencies", "optionalPeerDependencies", "unlisted", "unresolved", "binaries"])
    assert(DEPENDENCY_GROUPS.includes(group), `(ac) knip group ${group} is read by this gate`);

  // The three suppressions that used to live in knip.json with no recorded reason now live here
  // WITH one, and a suppression without a reason is not a suppression this gate accepts.
  for (const dep of ["sharp", "tailwindcss", "@tailwindcss/typography"]) {
    const entry = EXPORT_VERDICTS.get(`dep:${dep}`);
    assert(entry !== undefined, `(ad) ${dep} moved out of knip.json ignoreDependencies into the ledger`);
    assert(entry !== undefined && entry.reason.length > 40,
      `(ae) the ${dep} verdict records WHY, which ignoreDependencies could not`);
  }
  const knipConfig = JSON.parse(readFileSync(join(ROOT, "knip.json"), "utf8"));
  assert(knipConfig.ignoreDependencies === undefined,
    "(af) knip.json declares no unexplained ignoreDependencies — the ledger owns them, and a ledger entry goes stale when its reason expires");

  // The graph stats the corpus line reports must actually be filled.
  const statProbe = { walked: 0, read: 0 };
  buildImporterMap(join(ROOT, "test-utils"), statProbe);
  assert(statProbe.walked > 0 && statProbe.read === statProbe.walked,
    `(ag) the module-graph corpus counts every file walked and read (${statProbe.read}/${statProbe.walked})`);

  const rScratch = classifyFile(".scratch/mint-session.mjs", new Set([".scratch/mint-session.mjs"]), new Map(), synthRoot);
  assert(rScratch.cls === "OUT-OF-SCOPE",
    `(m0) a scratch path → expected OUT-OF-SCOPE, got ${rScratch.cls}`);

  const rGen = classifyFile(".next-custom/dev/chunk.js", new Set([".next-custom/dev/chunk.js"]), new Map(), synthRoot);
  assert(rGen.cls === "OUT-OF-SCOPE",
    `(m1) a generated build path → expected OUT-OF-SCOPE, got ${rGen.cls}`);

  const rAuthored = classifyFile("features/next-intl-shim/thing.ts", new Set(["features/next-intl-shim/thing.ts"]), new Map(), synthRoot);
  assert(rAuthored.cls === "DEAD",
    `(m2) an authored dir merely starting with "next-" must NOT be swallowed by the exclusion, got ${rAuthored.cls}`);

  const r9 = classifyFile("test-utils/render.tsx", new Set(), new Map(), synthRoot);
  assert(r9.cls === "RETAINED-BY-CONVENTION",
    `(m) test-infra file → expected RETAINED-BY-CONVENTION, got ${r9.cls}`);

  const r10 = classifyExport("test-utils/index.ts", "makeQueryClient");
  assert(r10.cls === "RETAINED-BY-CONVENTION",
    `(n) test-infra export → expected RETAINED-BY-CONVENTION, got ${r10.cls}`);

  const fixtureDir = join(tmpdir(), `dead-code-self-test-${Date.now()}`);
  try {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, "entry.ts"),
      'import x from "./a";\nimport "./b";\nexport * from "./c";\n');
    writeFileSync(join(fixtureDir, "a.ts"), "export default 1;\n");
    writeFileSync(join(fixtureDir, "b.ts"), "export {};\n");
    writeFileSync(join(fixtureDir, "c.ts"), "export const C = 1;\n");

    const fixMap = buildImporterMap(fixtureDir);
    const entryAbs = join(fixtureDir, "entry.ts");
    const aAbs = join(fixtureDir, "a.ts");
    const bAbs = join(fixtureDir, "b.ts");
    const cAbs = join(fixtureDir, "c.ts");

    assert(fixMap.has(aAbs) && fixMap.get(aAbs).named.has(entryAbs),
      "(f) buildImporterMap: named import edge a.ts ← entry.ts not recorded");
    assert(fixMap.has(bAbs) && fixMap.get(bAbs).sideEffect.has(entryAbs),
      "(g) buildImporterMap: side-effect import edge b.ts ← entry.ts not recorded");
    assert(fixMap.has(cAbs) && fixMap.get(cAbs).reexport.has(entryAbs),
      "(h) buildImporterMap: re-export edge c.ts ← entry.ts not recorded");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log(`PASS: self-test (${assertionsRun} assertions)\n`);
  console.log("  (a) file with no live importers                       → DEAD");
  console.log("  (b) file reachable via side-effect import             → RETAINED-BY-CONTRACT");
  console.log("  (c) file reachable via re-export from live barrel     → RETAINED-BY-CONTRACT");
  console.log("  (d) barrel export imported THROUGH the barrel         → RETAINED-BY-CONTRACT");
  console.log("  (d1) barrel re-export no file imports through         → UNCLASSIFIED (gate bites)");
  console.log("  (d2) named contract-barrel export with no consumer    → UNCLASSIFIED (gate bites)");
  console.log("  (d6) the use index omits a symbol nobody imports      → per-symbol, not per-file");
  console.log("  (e) export from CRM domain                            → EXCLUDED");
  console.log("  (f) buildImporterMap: named import edge recorded");
  console.log("  (g) buildImporterMap: side-effect import edge recorded");
  console.log("  (h) buildImporterMap: re-export edge recorded");
  console.log("  (i) export with no EXPORT_VERDICTS entry              → UNCLASSIFIED (gate bites)");
  console.log("  (j) export with DEFERRED verdict in EXPORT_VERDICTS   → DEFERRED");
  console.log("  (k) export with KEEP verdict in EXPORT_VERDICTS       → KEEP");
  console.log("  (l) EXPORT_VERDICTS entry not in knip output          → stale (gate bites)");
  console.log("  (m) test-utils file                                   → RETAINED-BY-CONVENTION");
  console.log("  (n) test-utils export                                 → RETAINED-BY-CONVENTION");
  console.log("  (o) data-layer TYPE in a live module                  → RETAINED-BY-CONTRACT");
  console.log("  (p) data-layer VALUE nothing imports                  → UNCLASSIFIED (gate bites)");
  console.log("  (q) TYPE in a module no live file imports             → UNCLASSIFIED (gate bites)");
  console.log("  (r) a TYPE outside hooks/api                          → UNCLASSIFIED (rule is scoped)");
  console.log("  (s) unused dependency with no verdict                 → UNCLASSIFIED (gate bites)");
  console.log("  (u) dependency with a written verdict                 → KEEP");
  console.log("  (w) an unrecorded knip `binaries` finding             → UNCLASSIFIED");
  console.log("  (x) a package finding is not answered by a path rule  → UNCLASSIFIED");
  console.log("  (aa) a dep: verdict knip no longer reports            → stale (gate bites)");
  console.log("  (af) knip.json carries no unexplained ignoreDependencies");
}

async function runMain() {
  let knipJson;
  try {
    let rawOut;
    try {
      rawOut = execSync("pnpm exec knip --no-progress --reporter json", {
        cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      rawOut = e.stdout;
      if (!rawOut) { console.error("knip run failed:", e.stderr ?? e.message); process.exit(1); }
    }
    knipJson = JSON.parse(rawOut);
  } catch (e) {
    console.error("knip JSON parse failed:", e.message);
    process.exit(1);
  }

  const issues = knipJson.issues ?? [];
  const deadFileRels = [];
  const deadExportItems = [];

  // Every array-valued group knip emits, so a group added upstream shows up as an unread corpus
  // gap in the corpus line rather than as silence.
  const groupsSeen = new Map();
  for (const issue of issues) {
    for (const [group, value] of Object.entries(issue))
      if (Array.isArray(value)) groupsSeen.set(group, (groupsSeen.get(group) ?? 0) + value.length);

    for (const f of issue.files ?? []) deadFileRels.push(f.name ?? f);
    for (const group of SYMBOL_GROUPS)
      for (const item of issue[group] ?? [])
        deadExportItems.push({
          file: issue.file,
          name: symbolName(item),
          kind: group === "exports" ? "export" : group === "types" ? "type" : group.replace(/s$/, ""),
        });
    for (const group of DEPENDENCY_GROUPS)
      for (const item of issue[group] ?? [])
        deadExportItems.push({ file: issue.file, name: symbolName(item), kind: group, depKey: true });
  }

  const knipDeadSet = new Set(deadFileRels);

  const knipTotal = deadFileRels.length + deadExportItems.length;
  if (knipTotal < SCAN_FLOOR.knipTotal) {
    console.error(
      `FAIL: knip returned only ${deadFileRels.length} files and ` +
      `${deadExportItems.length} exports/types — scan looks broken, not clean.`
    );
    process.exit(1);
  }

  console.log("Building import graph (scanning all TS/TSX files)...");
  const graphStats = { walked: 0, read: 0 };
  const importerMap = buildImporterMap(ROOT, graphStats);
  const barrelUse = buildBarrelUseIndex(ROOT);

  const graphFileCount = importerMap.size;
  let graphEdgeCount = 0;
  for (const entry of importerMap.values()) {
    for (const set of Object.values(entry)) graphEdgeCount += set.size;
  }
  if (graphFileCount < SCAN_FLOOR.graphFiles || graphEdgeCount < SCAN_FLOOR.graphEdges) {
    console.error(
      `FAIL: module-graph walk resolved only ${graphFileCount} files / ` +
      `${graphEdgeCount} import edges — scan looks broken.`
    );
    process.exit(1);
  }

  const buckets = {
    "DEAD": [],
    "OUT-OF-SCOPE": [],
    "RETAINED-BY-CONTRACT": [],
    "RETAINED-BY-CONVENTION": [],
    "WIRE": [],
    "DEFERRED": [],
    "KEEP": [],
    "EXCLUDED": [],
    "UNCLASSIFIED": [],
  };

  for (const rel of deadFileRels) {
    const r = classifyFile(rel, knipDeadSet, importerMap, ROOT);
    buckets[r.cls].push({ type: "file", path: rel, reason: r.reason });
  }

  const processedVerdictKeys = new Set();

  for (const ex of deadExportItems) {
    const r = classifyExport(ex.file, ex.name, EXPORT_VERDICTS, ex.kind, knipDeadSet, ex.depKey === true, barrelUse);
    if (r.cls === "WIRE" || r.cls === "DEFERRED" || r.cls === "KEEP") {
      processedVerdictKeys.add(verdictKey(ex));
    }
    buckets[r.cls].push({ type: ex.kind, path: ex.file, name: ex.name, reason: r.reason });
  }

  const staleVerdicts = checkStaleVerdicts(EXPORT_VERDICTS, processedVerdictKeys);

  console.log("\n=== Dead Code Classification ===\n");

  /*
   * Say how much of knip's report was read before saying what was in it. The gate read three of
   * knip's groups and printed "knip raw: files=… exports=… types=…", a denominator made of its own
   * filtered subset — the exact shape gate-corpus.mjs exists to stop. `total` here is every finding
   * knip emitted, in every array-valued group; `scanned` is the ones this gate classified. They
   * are equal only because the six dependency groups were wired in.
   */
  const knipReported = [...groupsSeen.values()].reduce((a, b) => a + b, 0);
  const knipRead = deadFileRels.length + deadExportItems.length;
  reportCorpus({ gate: "check-dead-code (knip findings)", scanned: knipRead, total: knipReported, unit: "finding" });
  reportCorpus({ gate: "check-dead-code (module graph)", scanned: graphStats.read, total: graphStats.walked, unit: "file" });

  const byGroup = [...groupsSeen.entries()].filter(([, n]) => n > 0).map(([g, n]) => `${g}=${n}`);
  console.log(`knip raw: ${byGroup.join(" ") || "(no findings)"}`);
  console.log(
    `dependency groups read: ${DEPENDENCY_GROUPS.join(", ")} — ` +
      `${deadExportItems.filter((e) => e.depKey).length} finding(s) over ${declaredDependencyCount(ROOT)} declared dependencies`,
  );

  for (const [label, items] of Object.entries(buckets)) {
    console.log(`\n${label} (${items.length}):`);
    if (items.length === 0) { console.log("  (none)"); continue; }
    for (const it of items) {
      const name = it.name ? `:${it.name}` : "";
      console.log(`  [${it.type}] ${it.path}${name}  — ${it.reason}`);
    }
  }

  const deadFiles = buckets["DEAD"].filter((i) => i.type === "file").length;
  const deadExports = buckets["DEAD"].filter((i) => i.type !== "file").length;

  console.log(`\n=== Baseline: files=${BASELINE.deadFiles} exports=${BASELINE.deadExports} ===`);
  console.log(`=== Current:  files=${deadFiles} exports=${deadExports} ===`);

  if (staleVerdicts.length > 0) {
    console.error(
      `\nFAIL: ${staleVerdicts.length} stale EXPORT_VERDICTS entr${staleVerdicts.length === 1 ? "y" : "ies"} ` +
      `(export no longer dead — remove from EXPORT_VERDICTS or confirm it regressed):`
    );
    for (const key of staleVerdicts) console.error(`  ${key}`);
    process.exit(1);
  }

  if (buckets["UNCLASSIFIED"].length > 0) {
    console.error(
      `\nFAIL: ${buckets["UNCLASSIFIED"].length} unclassified export(s) — add a WIRE or KEEP entry to EXPORT_VERDICTS for each:`
    );
    for (const it of buckets["UNCLASSIFIED"]) {
      console.error(`  ${it.path}:${it.name}`);
    }
    process.exit(1);
  }

  if (deadFiles > BASELINE.deadFiles || deadExports > BASELINE.deadExports) {
    console.error("\nFAIL: dead code count exceeds baseline. New dead code introduced.");
    process.exit(1);
  }

  console.log("\nPASS: dead code within baseline.");
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runMain().catch((e) => { console.error(e); process.exit(1); });
}
