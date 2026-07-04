import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared";
import { FnfStatusBadge } from "./fnf-status-badge";
import type { FnfSettlement, FnfStatement, FnfStatementComponent } from "@/types/payroll";

interface FnfStatementViewProps {
  settlement: FnfSettlement;
  statement: FnfStatement;
}

function derivedComponents(settlement: FnfSettlement): FnfStatementComponent[] {
  const all: FnfStatementComponent[] = [
    { label: "Pending Salary", amount: settlement.basicDues, type: "credit" },
    { label: "Leave Encashment", amount: settlement.leaveEncashment, type: "credit" },
    { label: "Bonus Due", amount: settlement.bonusDue, type: "credit" },
    { label: "Reimbursements", amount: settlement.reimbursementsDue, type: "credit" },
    { label: "Loan Recovery", amount: settlement.loanRecovery, type: "deduction" },
    { label: "Asset Recovery", amount: settlement.assetRecovery, type: "deduction" },
    { label: "Notice Recovery", amount: settlement.noticeRecovery, type: "deduction" },
    { label: "Other Deductions", amount: settlement.otherDeductions, type: "deduction" },
  ];
  return all.filter((c) => c.amount !== 0);
}

export function FnfStatementView({ settlement, statement }: FnfStatementViewProps) {
  const components =
    statement.components.length > 0 ? statement.components : derivedComponents(settlement);
  const isPositive = statement.netPayable >= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{statement.employee.name}</span>
          <FnfStatusBadge status={statement.status} />
        </div>
        <span className="text-[11px] text-muted-foreground">{statement.employee.email}</span>
        <span className="text-[10px] text-muted-foreground">Settlement #{settlement.id}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Component
              </th>
              <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Type
              </th>
              <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
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
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        isCredit
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200",
                      )}
                    >
                      {isCredit ? "Credit" : "Deduction"}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 font-mono tabular-nums text-right",
                      isCredit ? "text-emerald-700" : "text-red-600",
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
              <td className="px-3 py-2 font-bold text-[12px]" colSpan={2}>
                Net Payable
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono tabular-nums text-right font-bold text-[14px]",
                  isPositive ? "text-emerald-700" : "text-red-600",
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
