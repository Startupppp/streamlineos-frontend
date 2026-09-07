import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared";
import { FnfStatusBadge } from "./fnf-status-badge";
import type { FnfStatement } from "@/types/payroll";
import type { FnfGetOne } from "@/hooks/api/payroll/fnf-schema";

type LocalFnfComponent = { label: string; amount: string; type?: string | null };

interface FnfStatementViewProps {
  settlement: FnfGetOne;
  statement: FnfStatement;
}

function derivedComponents(settlement: FnfGetOne): LocalFnfComponent[] {
  const all: LocalFnfComponent[] = [
    { label: "Pending Salary", amount: settlement.basicDues, type: "credit" },
    { label: "Leave Encashment", amount: settlement.leaveEncashment, type: "credit" },
    { label: "Bonus Due", amount: settlement.bonusDue, type: "credit" },
    { label: "Reimbursements", amount: settlement.reimbursementsDue, type: "credit" },
    { label: "Loan Recovery", amount: settlement.loanRecovery, type: "deduction" },
    { label: "Asset Recovery", amount: settlement.assetRecovery, type: "deduction" },
    { label: "Notice Recovery", amount: settlement.noticeRecovery, type: "deduction" },
    { label: "Other Deductions", amount: settlement.otherDeductions, type: "deduction" },
  ];
  return all.filter((c) => parseFloat(c.amount) !== 0);
}

export function FnfStatementView({ settlement, statement }: FnfStatementViewProps) {
  const components =
    statement.components.length > 0 ? statement.components : derivedComponents(settlement);
  const isPositive = parseFloat(statement.netPayable) >= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{statement.employee.name}</span>
          <FnfStatusBadge status={statement.status} />
        </div>
        <span className="text-dense text-muted-foreground">{statement.employee.email}</span>
        <span className="text-micro text-muted-foreground">Settlement #{settlement.id}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-dense">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-micro uppercase tracking-wider font-bold text-muted-foreground">
                Component
              </th>
              <th className="text-center px-3 py-2 text-micro uppercase tracking-wider font-bold text-muted-foreground">
                Type
              </th>
              <th className="text-right px-3 py-2 text-micro uppercase tracking-wider font-bold text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => {
              const isCredit = c.type !== "deduction";
              return (
                <tr key={i} className="border-b border-border last:border-0 h-8">
                  <td className="px-3 py-1.5 font-medium">{c.label}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border",
                        isCredit
                          ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                          : "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
                      )}
                    >
                      {isCredit ? "Credit" : "Deduction"}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono tabular-nums text-right",
                      isCredit ? "text-status-success-ink" : "text-status-danger-ink",
                    )}
                  >
                    {isCredit ? "+" : "−"}
                    {formatMoney(c.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="px-3 py-2 font-bold text-xs" colSpan={2}>
                Net Payable
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono tabular-nums text-right font-bold text-sm",
                  isPositive ? "text-status-success-ink" : "text-status-danger-ink",
                )}
              >
                {formatMoney(statement.netPayable)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
