import fs from "node:fs";
import path from "node:path";

/**
 * Phase 2, ticket 26 — a surface may not tell a denied user their data is empty.
 *
 * Every gated read hook in this codebase disables itself when the caller lacks
 * the permission:
 *
 *     const canView = useCan("crm:campaigns:view");
 *     return useQuery({ ..., enabled: canView });
 *
 * In TanStack Query v5 a **disabled** query reports `isPending: true,
 * isFetching: false`, and `isLoading` is `isPending && isFetching` — so
 * `isLoading` is **false**. Those are the same flags an empty list has. A screen
 * branching `isLoading ? skeleton : rows.length === 0 ? empty : list` therefore
 * lands on the empty branch and tells somebody **"No campaigns yet"** when the
 * truth is **"you are not allowed to see this"**.
 *
 * That is worse than an unexplained failure: the product **asserts something
 * false about the customer's data**. A rep who cannot see the pipeline is told
 * the pipeline is empty, and their next action is to re-create something that
 * already exists.
 *
 * It is invisible to everyone able to fix it. An owner or an admin holds every
 * permission and will never once see it.
 *
 * ## Why this is a ratchet and not a pass/fail
 *
 * The ticket estimated 82 hooks across 21 files, in the CRM. Measured, it is
 * **365 surfaces across every module in the platform** — HR, build, inventory
 * and payroll each have more of it than the CRM does. It was never a CRM bug;
 * the CRM is only where somebody noticed.
 *
 * A list that large cannot be converted in one change, and a test that failed on
 * all of it would be switched off within a day. So this freezes the list and
 * allows it only to shrink. The value is the other direction: a surface **not**
 * on the list that reads a gated hook and renders an empty state fails the
 * build. The bug stops growing today and shrinks from here.
 *
 * Fixing one means wrapping its states in `<Gated>` (`components/shared/gated.tsx`),
 * which owns the branch order, and deleting its line below. `crm/issues` is the
 * worked example.
 */

const ROOT = path.join(__dirname, "..", "..");

/**
 * Surfaces that could still show a denied caller an empty state.
 *
 * **This list may only shrink.** Delete a line when you convert its surface;
 * never add one. A new entry means a new instance of a bug we have already
 * decided is unacceptable.
 */
/*
 * Paths updated 2026-08-27, when `crm/phases-complete` merged in: it renamed
 * `features/knowledge-base/components/` to `features/wiki/components/` and moved
 * `kb-content-gaps` into `features/help-centre/`. Twenty entries here are those
 * same surfaces at their new paths -- the debt did not grow, it moved. Two came
 * off because they genuinely no longer have the problem.
 */
const NOT_YET_CONVERTED: readonly string[] = [
  "app/(authenticated)/build/[projectId]/analytics/page.tsx",
  "app/(authenticated)/build/[projectId]/backlog/page.tsx",
  "app/(authenticated)/build/[projectId]/budget/page.tsx",
  "app/(authenticated)/build/[projectId]/cycles/[cycleId]/page.tsx",
  "app/(authenticated)/build/[projectId]/cycles/page.tsx",
  "app/(authenticated)/build/[projectId]/intake/page.tsx",
  "app/(authenticated)/build/[projectId]/milestones/page.tsx",
  "app/(authenticated)/build/[projectId]/modules/page.tsx",
  "app/(authenticated)/build/[projectId]/sprints/page.tsx",
  "app/(authenticated)/build/[projectId]/webhooks/page.tsx",
  "app/(authenticated)/build/[projectId]/whiteboard/page.tsx",
  "app/(authenticated)/build/templates/page.tsx",
  "app/(authenticated)/hr/comp-off/page.tsx",
  "app/(authenticated)/hr/employees/find-expert/page.tsx",
  "app/(authenticated)/hr/employees/skills-matrix/page.tsx",
  "app/(authenticated)/hr/engagement/page.tsx",
  "app/(authenticated)/hr/expenses/page.tsx",
  "app/(authenticated)/hr/leave-policies/page.tsx",
  "app/(authenticated)/hr/onboarding/[userId]/page.tsx",
  "app/(authenticated)/hr/onboarding/probation/page.tsx",
  "app/(authenticated)/hr/performance/analytics/page.tsx",
  "app/(authenticated)/hr/recruitment/automations/page.tsx",
  "app/(authenticated)/hr/recruitment/candidates/intake/page.tsx",
  "app/(authenticated)/hr/recruitment/diversity-report/page.tsx",
  "app/(authenticated)/hr/recruitment/headcount/page.tsx",
  "app/(authenticated)/hr/recruitment/interviewer-performance/page.tsx",
  "app/(authenticated)/hr/recruitment/jobs/page.tsx",
  "app/(authenticated)/hr/recruitment/offers/page.tsx",
  "app/(authenticated)/hr/recruitment/page.tsx",
  "app/(authenticated)/hr/recruitment/requisitions/page.tsx",
  "app/(authenticated)/hr/recruitment/sla-report/page.tsx",
  "app/(authenticated)/hr/recruitment/talent-pools/page.tsx",
  "app/(authenticated)/hr/service-delivery/page.tsx",
  "app/(authenticated)/hr/travel/approvals/page.tsx",
  "app/(authenticated)/inventory/3pl/page.tsx",
  "app/(authenticated)/inventory/carriers/page.tsx",
  "app/(authenticated)/inventory/channels/page.tsx",
  "app/(authenticated)/inventory/loads/page.tsx",
  "app/(authenticated)/inventory/operations/issues/page.tsx",
  "app/(authenticated)/inventory/operations/receipts/page.tsx",
  "app/(authenticated)/inventory/operations/returns/page.tsx",
  "app/(authenticated)/inventory/packages/page.tsx",
  "app/(authenticated)/inventory/products/[productId]/page.tsx",
  "app/(authenticated)/inventory/products/categories/page.tsx",
  "app/(authenticated)/inventory/products/page.tsx",
  "app/(authenticated)/inventory/products/uom/page.tsx",
  "app/(authenticated)/inventory/purchase-orders/page.tsx",
  "app/(authenticated)/inventory/quality/holds/page.tsx",
  "app/(authenticated)/inventory/quality/inspections/page.tsx",
  "app/(authenticated)/inventory/quality/page.tsx",
  "app/(authenticated)/inventory/quality/recalls/page.tsx",
  "app/(authenticated)/inventory/reports/expiry/page.tsx",
  "app/(authenticated)/inventory/reports/movements/page.tsx",
  "app/(authenticated)/inventory/reports/reorder/page.tsx",
  "app/(authenticated)/inventory/reports/slow-moving/page.tsx",
  "app/(authenticated)/inventory/reports/stock-summary/page.tsx",
  "app/(authenticated)/inventory/sales-orders/page.tsx",
  "app/(authenticated)/inventory/shipments/page.tsx",
  "app/(authenticated)/inventory/stock/adjustments/page.tsx",
  "app/(authenticated)/inventory/stock/movements/page.tsx",
  "app/(authenticated)/inventory/stock/page.tsx",
  "app/(authenticated)/inventory/stock/transfers/[transferId]/page.tsx",
  "app/(authenticated)/inventory/stock/transfers/page.tsx",
  "app/(authenticated)/inventory/vendors/[vendorId]/page.tsx",
  "app/(authenticated)/inventory/vendors/page.tsx",
  "app/(authenticated)/inventory/warehouses/[warehouseId]/page.tsx",
  "app/(authenticated)/inventory/warehouses/page.tsx",
  "app/(authenticated)/payroll/page.tsx",
  "app/(authenticated)/settings/modules/page.tsx",
  "app/(authenticated)/settings/roles/audit/page.tsx",
  "app/(authenticated)/support/knowledge-gaps/page.tsx",
  "app/(authenticated)/support/reports/agent-performance/page.tsx",
  "app/(authenticated)/support/routing/page.tsx",
  "app/(authenticated)/support/settings/audit-log/page.tsx",
  "app/(authenticated)/workflows/approvals/page.tsx",
  "app/(portal)/projects/[projectId]/page.tsx",
  "app/(portal)/projects/page.tsx",
  "components/rbac/role-assignments-sheet.tsx",
  "features/accounting/banking/reconciliation/match-suggestions-panel.tsx",
  "features/accounting/banking/reconciliation/unreconciled-split-view.tsx",
  "features/accounting/reports/aging-report.tsx",
  "features/accounting/reports/tax-summary-report.tsx",
  "features/accounting/reports/trial-balance-report.tsx",
  "features/accounting/settings/fx-rates-card.tsx",
  "features/billing/components/payments-tab.tsx",
  "features/build/all-work/all-work-page.tsx",
  "features/build/all-work/all-work-views-menu.tsx",
  "features/build/approvals/approvals-inbox-page.tsx",
  "features/build/approvals/project-approvals-page.tsx",
  "features/build/automations/automations-page.tsx",
  "features/build/bugs/bugs-page.tsx",
  "features/build/change-requests/change-requests-page.tsx",
  "features/build/client-portal/client-visibility-page.tsx",
  "features/build/client-portal/portal-dashboard-page.tsx",
  "features/build/client-portal/portal-list-page.tsx",
  "features/build/customers/project-customers-page.tsx",
  "features/build/drafts/comment-drafts-page.tsx",
  "features/build/epics/epics-page.tsx",
  "features/build/feedbucket/project-feedbucket-page.tsx",
  "features/build/forms/components/form-submissions-tab.tsx",
  "features/build/forms/form-detail-page.tsx",
  "features/build/forms/forms-list-page.tsx",
  "features/build/governance/decisions-page.tsx",
  "features/build/governance/risks-page.tsx",
  "features/build/incidents/incidents-page.tsx",
  "features/build/managed-products/managed-product-detail-page.tsx",
  "features/build/managed-products/managed-products-page.tsx",
  "features/build/meetings/meetings-list-page.tsx",
  "features/build/my-tickets/my-tickets-page.tsx",
  "features/build/my-work/my-work-page.tsx",
  "features/build/pm-workspaces/pm-workspace-members-sheet.tsx",
  "features/build/pm-workspaces/pm-workspaces-page.tsx",
  "features/build/portfolios/portfolio-detail-page.tsx",
  "features/build/portfolios/portfolios-page.tsx",
  "features/build/programs/programs-page.tsx",
  "features/build/project-list/projects-page.tsx",
  "features/build/qa/runs/run-execution-page.tsx",
  "features/build/qa/test-case-sheet.tsx",
  "features/build/qa/test-cases-tab.tsx",
  "features/build/qa/test-runs-tab.tsx",
  "features/build/releases/releases-page.tsx",
  "features/build/reports/burnup-section.tsx",
  "features/build/reports/cfd-section.tsx",
  "features/build/reports/critical-path-section.tsx",
  "features/build/reports/cycle-time-section.tsx",
  "features/build/reports/lead-time-section.tsx",
  "features/build/reports/velocity-section.tsx",
  "features/build/roadmap/changelog-tab.tsx",
  "features/build/roadmap/feedback-tab.tsx",
  "features/build/roadmap/roadmap-tab.tsx",
  "features/build/settings/custom-fields-settings.tsx",
  "features/build/settings/project-member-roles-section.tsx",
  "features/build/teams/team-projects-section.tsx",
  "features/build/ticket-details/ticket-relations.tsx",
  "features/build/tickets/ticket-activity-log.tsx",
  "features/build/triage/triage-page.tsx",
  "features/build/views/gantt-view.tsx",
  "features/build/views/views-page.tsx",
  "features/build/whiteboard/share-dialog.tsx",
  "features/build/workflow/transitions-table.tsx",
  "features/build/workflow/workflow-page.tsx",
  "features/chat/channel-sidebar.tsx",
  "features/dashboard/dashboard-client.tsx",
  "features/dashboard/expenses-widget.tsx",
  "features/dashboard/hr-widgets.tsx",
  "features/dashboard/my-attendance-widget.tsx",
  "features/dashboard/payroll-widget.tsx",
  "features/dashboard/public-documents-card.tsx",
  "features/directory/people/people-directory-page.tsx",
  "features/directory/people/person-detail-page.tsx",
  "features/directory/people/person-worker-tab.tsx",
  "features/directory/workers/worker-engagements-sheet.tsx",
  "features/directory/workers/workers-page.tsx",
  "features/employee-self-service/components/my-documents-page.tsx",
  "features/employee-self-service/components/my-expenses-page.tsx",
  "features/hr/analytics/analytics-page-client.tsx",
  "features/hr/asset-returns/asset-returns-page.tsx",
  "features/hr/attendance/daily-history-table.tsx",
  "features/hr/attendance/manage-holidays-card.tsx",
  "features/hr/attendance/team-attendance-card.tsx",
  "features/hr/background-verification/background-verification-page-client.tsx",
  "features/hr/biometric/biometric-devices-list.tsx",
  "features/hr/biometric/biometric-logs-list.tsx",
  "features/hr/documents/compliance-calendar.tsx",
  "features/hr/documents/templates-list-page.tsx",
  "features/hr/employees/detail/timeline-tab.tsx",
  "features/hr/employees/employees-list-page.tsx",
  "features/hr/engagement/recognition-feed.tsx",
  "features/hr/enterprise/comp/comp-cycle-detail.tsx",
  "features/hr/enterprise/comp/equity-page.tsx",
  "features/hr/enterprise/ops/accommodations/accommodations-page-content.tsx",
  "features/hr/enterprise/ops/event-stream/event-stream-page-content.tsx",
  "features/hr/enterprise/ops/identity/identity-page-content.tsx",
  "features/hr/enterprise/ops/simulator/simulation-history.tsx",
  "features/hr/exit/exit-management-page.tsx",
  "features/hr/feedback/my-reviews-tab.tsx",
  "features/hr/geofencing/geofence-list.tsx",
  "features/hr/helpdesk/my-tickets-tab.tsx",
  "features/hr/import-export/components/job-history-table.tsx",
  "features/hr/leave-policies/policy-form-sheet.tsx",
  "features/hr/leaves/components/leave-analytics-client.tsx",
  "features/hr/leaves/components/leave-approvals.tsx",
  "features/hr/leaves/components/leaves-tab-content.tsx",
  "features/hr/leaves/components/wfh-tab-content.tsx",
  "features/hr/leaves/leave-types-manager.tsx",
  "features/hr/onboarding/my-onboarding-tasks-page.tsx",
  "features/hr/onboarding/onboarding-detail-sheet.tsx",
  "features/hr/onboarding/onboarding-list.tsx",
  "features/hr/onboarding/onboarding-templates-tab.tsx",
  "features/hr/overtime/comp-off-panel.tsx",
  "features/hr/overtime/overtime-list.tsx",
  "features/hr/performance/calibration-tab.tsx",
  "features/hr/performance/nine-box-grid.tsx",
  "features/hr/performance/pip-tab.tsx",
  "features/hr/performance/reviews-tab.tsx",
  "features/hr/performance/succession-tab.tsx",
  "features/hr/recruitment/referrals/internal-referrals-tab.tsx",
  "features/hr/recruitment/vendors/submission-sheet.tsx",
  "features/hr/reimbursements/reimbursements-page.tsx",
  "features/hr/rosters/rosters-grid.tsx",
  "features/hr/settings/hr-integrations/webhook-deliveries-sheet.tsx",
  "features/hr/settings/hr-integrations/webhooks-section.tsx",
  "features/hr/shifts/shift-assignments-tab.tsx",
  "features/hr/shifts/shift-swaps-tab.tsx",
  "features/hr/shifts/shift-templates-tab.tsx",
  "features/hr/workforce/workforce-planning-page.tsx",
  "features/inventory/components/channels/channel-publications-panel.tsx",
  "features/inventory/components/control/cycle-counts-client.tsx",
  "features/inventory/components/control/physical-audits-client.tsx",
  "features/inventory/components/dashboard-insights-panel.tsx",
  "features/inventory/components/finance/costing-client.tsx",
  "features/inventory/components/finance/valuation-client.tsx",
  "features/inventory/components/inventory-dashboard-client.tsx",
  "features/inventory/components/inventory-recent-movements.tsx",
  "features/inventory/components/operations/so-queue-page.tsx",
  "features/inventory/components/planning/forecasting-client.tsx",
  "features/inventory/components/planning/replenishment-client.tsx",
  "features/inventory/components/planning/replenishment-rules-client.tsx",
  "features/inventory/components/product-field-selects.tsx",
  "features/inventory/components/stock/reservations-panel.tsx",
  "features/inventory/components/tools/import-client.tsx",
  "features/inventory/components/tools/inventory-settings-client.tsx",
  "features/inventory/components/tools/webhooks-settings-card.tsx",
  "features/inventory/components/traceability/expiry-client.tsx",
  "features/inventory/components/traceability/lots-client.tsx",
  "features/inventory/components/traceability/serials-client.tsx",
  "features/inventory/components/warehouse/warehouse-stock-tab.tsx",
  "features/help-centre/components/kb-content-gaps.tsx",
  "features/wiki/components/export-jobs-card.tsx",
  "features/wiki/components/favorites-page.tsx",
  "features/wiki/components/import-page.tsx",
  "features/wiki/components/knowledge-analytics-page.tsx",
  "features/wiki/components/knowledge-settings-page.tsx",
  "features/wiki/components/page-comments-sheet.tsx",
  "features/wiki/components/page-document-toolbar.tsx",
  "features/wiki/components/page-history-page.tsx",
  "features/wiki/components/page-history-sheet.tsx",
  "features/wiki/components/private-page.tsx",
  "features/wiki/components/recent-page.tsx",
  "features/wiki/components/reviews-page.tsx",
  "features/wiki/components/shared-page.tsx",
  "features/wiki/components/space-detail-page.tsx",
  "features/wiki/components/spaces-page.tsx",
  "features/wiki/components/templates-page.tsx",
  "features/wiki/components/trash-page.tsx",
  "features/wiki/components/wiki-home-page.tsx",
  "features/party/parties/parties-page.tsx",
  "features/party/parties/party-detail-sheet.tsx",
  "features/party/subject-types/subject-types-page.tsx",
  "features/party/subjects/subject-detail-sheet.tsx",
  "features/party/subjects/subjects-page.tsx",
  "features/payments/components/webhooks-tab.tsx",
  "features/payroll/bank-transfers/bank-transfers-content.tsx",
  "features/payroll/bonuses/bonuses-tab.tsx",
  "features/payroll/bonuses/incentives-tab.tsx",
  "features/payroll/components/components-page.tsx",
  "features/payroll/employees/employee-detail-page.tsx",
  "features/payroll/employees/employees-list-page.tsx",
  "features/payroll/employees/worker-detail-page.tsx",
  "features/payroll/ess/components/ess-bank-section.tsx",
  "features/payroll/ess/components/ess-loans-section.tsx",
  "features/payroll/ess/components/ess-payslips-section.tsx",
  "features/payroll/ess/components/ess-reimbursements-section.tsx",
  "features/payroll/ess/components/ess-salary-section.tsx",
  "features/payroll/ess/components/ess-total-rewards-section.tsx",
  "features/payroll/fnf/fnf-table.tsx",
  "features/payroll/loans/loans-table.tsx",
  "features/payroll/payout/bank-transfers/batches-table.tsx",
  "features/payroll/payout/payslips/publications-tab.tsx",
  "features/payroll/payout/payslips/templates-tab.tsx",
  "features/payroll/reimbursements/reimbursements-page.tsx",
  "features/payroll/reports/accounting-mappings-sheet.tsx",
  "features/payroll/reports/calendar-manager.tsx",
  "features/payroll/reports/journal-batches-sheet.tsx",
  "features/payroll/reports/report-bank-payout.tsx",
  "features/payroll/reports/report-cost-center.tsx",
  "features/payroll/reports/report-dept-cost.tsx",
  "features/payroll/reports/report-journal.tsx",
  "features/payroll/reports/report-pivot.tsx",
  "features/payroll/reports/report-register.tsx",
  "features/payroll/reports/report-summary.tsx",
  "features/payroll/reports/report-variance.tsx",
  "features/payroll/runs/employees-tab.tsx",
  "features/payroll/runs/exceptions-tab.tsx",
  "features/payroll/runs/inputs-tab.tsx",
  "features/payroll/runs/runs-page-content.tsx",
  "features/payroll/runs/variance-tab.tsx",
  "features/payroll/settings/entities-section.tsx",
  "features/payroll/settings/settings-page.tsx",
  "features/payroll/settings/version-history-section.tsx",
  "features/payroll/setup/steps/step-template.tsx",
  "features/payroll/taxes/declarations-tab.tsx",
  "features/payroll/taxes/filings-tab.tsx",
  "features/payroll/taxes/statutory-overview-tab.tsx",
  "features/payroll/taxes/tax-report-tab.tsx",
  "features/payroll/taxes/tax-windows-tab.tsx",
  "features/payroll/team/team-page.tsx",
  "features/payroll/templates/templates-page.tsx",
  "features/portal-access/client-access-page.tsx",
  "features/settings/audit-log/audit-log-page.tsx",
  "features/settings/organization/hierarchy/branches-page.tsx",
  "features/settings/organization/hierarchy/departments-page.tsx",
  "features/settings/organization/hierarchy/organization-chart-page.tsx",
  "features/settings/organization/hierarchy/teams-page.tsx",
  "features/settings/organization/incoming-transfer-page.tsx",
  "features/settings/roles/groups/group-detail-sheet.tsx",
  "features/settings/roles/groups/groups-panel.tsx",
  "features/settings/webhooks/webhook-delivery-log.tsx",
  "features/settings/webhooks/webhooks-page.tsx",
  "features/shared/automations/module-automations-settings.tsx",
  "features/timesheets/approvals/approvals-tab-panel.tsx",
  "features/timesheets/approvals/approvals-view.tsx",
  "features/timesheets/billing/billing-view.tsx",
  "features/timesheets/payroll/payroll-exports-history.tsx",
  "features/timesheets/payroll/payroll-page-client.tsx",
  "features/timesheets/reports/project-budgets-tab.tsx",
  "features/timesheets/reports/reports-view.tsx",
  "features/timesheets/settings/audit-tab.tsx",
  "features/timesheets/settings/rates-tab.tsx",
  "features/timesheets/team/member-detail-sheet.tsx",
  "features/timesheets/team/team-view.tsx",
  "features/users/user-audit-tab.tsx",
  "features/users/user-login-history-tab.tsx",
  "features/users/user-sessions-tab.tsx",
  "features/users/users-page.tsx"
];

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) found.push(full);
  }
  return found;
}

/**
 * Read hooks whose query is disabled by a permission.
 *
 * Collected from source rather than listed, because the set changes with every
 * new hook and a stale list would silently stop watching whatever was added
 * last. A hook qualifies when a `useCan` result decides its `enabled` — that is
 * precisely the shape that turns a refusal into an empty result.
 */
function gatedReadHooks(): Set<string> {
  const hooks = new Set<string>();
  const dir = path.join(ROOT, "hooks");

  for (const file of walk(dir).concat(
    fs
      .readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.includes(".test."))
      .map((e) => path.join(e.parentPath ?? e.path, e.name)),
  )) {
    const source = fs.readFileSync(file, "utf8");
    const starts = [...source.matchAll(/^export (?:function|const) (use[A-Za-z0-9_]+)/gm)];

    starts.forEach((match, index) => {
      const from = match.index ?? 0;
      const to = index + 1 < starts.length ? (starts[index + 1]?.index ?? source.length) : source.length;
      const body = source.slice(from, to);
      if (!body.includes("useQuery")) return;
      if (!/useCan\(\s*["'][^"']+["']/.test(body)) return;
      if (!/enabled:\s*[^,\n]*can/i.test(body)) return;
      hooks.add(match[1] as string);
    });
  }

  return hooks;
}

/** Does this file assert to a person that there is nothing here? */
function claimsEmptiness(source: string): boolean {
  return /EmptyState|No .{0,30} yet|isEmpty/.test(source);
}

function handlesDenial(source: string): boolean {
  return source.includes("NoPermissionState") || /<Gated\b/.test(source);
}

function surfacesTellingDeniedUsersTheyAreEmpty(): string[] {
  const hooks = [...gatedReadHooks()];
  const found: string[] = [];

  for (const base of ["app", "features", "components"]) {
    for (const file of walk(path.join(ROOT, base))) {
      const source = fs.readFileSync(file, "utf8");
      if (!hooks.some((hook) => new RegExp(`\\b${hook}\\b\\s*\\(`).test(source))) continue;
      if (!claimsEmptiness(source)) continue;
      if (handlesDenial(source)) continue;
      found.push(path.relative(ROOT, file).split(path.sep).join("/"));
    }
  }

  return found.sort();
}

describe("no surface tells a denied user their data is empty", () => {
  const measured = surfacesTellingDeniedUsersTheyAreEmpty();

  it("adds none that is not already known about", () => {
    const known = new Set(NOT_YET_CONVERTED);
    const added = measured.filter((file) => !known.has(file));

    // Named rather than counted, so a failure says which file to look at.
    // Wrap its states in `<Gated>`; see `crm/issues/issues-page.tsx`.
    expect(added).toEqual([]);
  });

  /**
   * The other direction, so the list cannot rot into an allowlist.
   *
   * An entry for a surface that has since been converted — or deleted, which the
   * renderer migration does constantly — would quietly excuse the next thing
   * added at that path.
   */
  it("keeps no entry for a surface that no longer has the problem", () => {
    const still = new Set(measured);
    const stale = NOT_YET_CONVERTED.filter((file) => !still.has(file));

    expect(stale).toEqual([]);
  });
});
