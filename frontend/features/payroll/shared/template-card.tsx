"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { TemplateRow } from "@/types/payroll/setup";
import { COMPLEXITY_CONFIG } from "@/features/payroll/setup/lib/constants";

const TOGGLE_CHIP_LABELS: Record<string, string> = {
  pf: "PF",
  esi: "ESI",
  professionalTax: "PT",
  tds: "TDS",
  gratuity: "Gratuity",
  lwf: "LWF",
  lopFromAttendance: "LOP",
  overtime: "OT",
  timesheets: "TS",
  leaveSync: "Leave",
  expenseSync: "Exp",
  salesIncentives: "Sales",
  manualAdjustments: "Adj",
  reimbursements: "Reimb",
  bonuses: "Bonus",
  incentives: "Incent",
  loans: "Loans",
  contractorPayments: "Contract",
  multiCurrency: "Multi-FX",
  employeeDeclarations: "Decl",
  payrollVarianceWarnings: "Var",
  countryComplianceChecklist: "Checklist",
  globalPaymentReport: "GloPay",
  bankPayoutFile: "Bank",
  payslipPublishing: "Payslip",
  emailPayslips: "Email",
  approvalWorkflow: "Approval",
  managerApproval: "Mgr",
  financeApproval: "Finance",
  lockAfterApproval: "Lock",
  essShowSalaryStructure: "ESS:View",
  essAllowBankUpdate: "ESS:Bank",
  essAllowLoanRequests: "ESS:Loan",
  essAllowTaxDeclarations: "ESS:Tax",
  essAllowReimbursements: "ESS:Reimb",
};

type TemplateCardProps = {
  template: TemplateRow;
  selected?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
};

export function TemplateCard({ template, selected, onSelect, actions }: TemplateCardProps) {
  const complexity = COMPLEXITY_CONFIG[template.complexity];
  const shownComponents = template.defaultComponents.slice(0, 4);
  const extraCount = template.defaultComponents.length - shownComponents.length;
  const enabledToggles = Object.entries(template.defaultToggles)
    .filter(([, val]) => val)
    .map(([key]) => key);
  const shownToggles = enabledToggles.slice(0, 6);
  const extraToggleCount = enabledToggles.length - shownToggles.length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (onSelect && (e.key === "Enter" || e.key === " ")) onSelect();
  }

  function stopEvent(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative rounded-lg border p-4 text-left transition-all",
        onSelect && "cursor-pointer",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
      )}
    >
      {template.isRecommended && (
        <div className="absolute -top-2.5 left-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
            Recommended
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <TruncatedText text={template.name} className="text-sm font-semibold text-foreground" />
            {template.badge && (
              <span className="inline-block mt-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {template.badge}
              </span>
            )}
          </div>
          <span className={cn("shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", complexity.className)}>
            {complexity.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{template.bestFor}</p>

        <div className="flex flex-wrap gap-1">
          {shownComponents.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {c.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
              +{extraCount} more
            </span>
          )}
        </div>

        {shownToggles.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {shownToggles.map((key) => (
              <span
                key={key}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30"
              >
                {TOGGLE_CHIP_LABELS[key] ?? key}
              </span>
            ))}
            {extraToggleCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                +{extraToggleCount}
              </span>
            )}
          </div>
        )}

        {actions && (
          <div
            className="flex items-center gap-2 pt-1"
            onClick={stopEvent}
            onKeyDown={stopEvent}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
