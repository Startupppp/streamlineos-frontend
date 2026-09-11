import { memo } from "react";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatMoney } from "@/features/payroll/shared";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { LoanAdminItem } from "@/hooks/api/payroll/loans-admin";
import type { LoanAdjustmentType } from "@/types/payroll";
import { LoanStatusBadge } from "./loan-status-badge";

function computeOutstanding(
  totalEmis: number | null,
  paidEmis: number,
  emiAmount: string | null,
): number {
  if (totalEmis === null || emiAmount === null) return 0;
  const emi = parseFloat(emiAmount);
  return isNaN(emi) ? 0 : (totalEmis - paidEmis) * emi;
}

interface BuildColumnsOptions {
  canManage: boolean;
  onAdjust: (row: LoanAdminItem, type: LoanAdjustmentType) => void;
  onApproval: (loanId: number, action: "approve" | "reject") => void;
}

const PendingActions = memo(function PendingActions({
  loanId,
  onApproval,
}: {
  loanId: number;
  onApproval: (id: number, action: "approve" | "reject") => void;
}) {
  function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    onApproval(loanId, "approve");
  }
  function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    onApproval(loanId, "reject");
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-micro"
        onClick={handleApprove}
      >
        Approve
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-micro text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={handleReject}
      >
        Reject
      </Button>
    </div>
  );
});

const ActiveActions = memo(function ActiveActions({
  row,
  onAdjust,
}: {
  row: LoanAdminItem;
  onAdjust: (r: LoanAdminItem, type: LoanAdjustmentType) => void;
}) {
  function handleSkip(e: React.MouseEvent) {
    e.stopPropagation();
    onAdjust(row, "SKIP_EMI");
  }
  function handleExtra(e: React.MouseEvent) {
    e.stopPropagation();
    onAdjust(row, "EXTRA_RECOVERY");
  }
  function handleForeclose(e: React.MouseEvent) {
    e.stopPropagation();
    onAdjust(row, "FORECLOSURE");
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-micro"
        onClick={handleSkip}
      >
        Skip EMI
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-micro"
        onClick={handleExtra}
      >
        Extra
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-micro"
        onClick={handleForeclose}
      >
        Foreclose
      </Button>
    </div>
  );
});

export function buildLoanColumns({
  canManage,
  onAdjust,
  onApproval,
}: BuildColumnsOptions): DataTableColumn<LoanAdminItem>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.user?.name ?? "—"} className="text-dense font-medium" />
          <TruncatedText text={row.user?.email ?? ""} className="text-micro text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "principal",
      header: "Principal",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-right text-dense">
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: "emi",
      header: "EMI Amount",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono tabular-nums text-right text-dense">
          {row.emiAmount ? formatMoney(row.emiAmount) : "—"}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      cell: (row) => {
        const total = row.totalEmis ?? 0;
        const paid = row.paidEmis;
        const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
        return (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="text-micro text-muted-foreground">
              {paid}/{total} EMIs
            </span>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "outstanding",
      header: "Outstanding",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) => {
        const outstanding = computeOutstanding(row.totalEmis, row.paidEmis, row.emiAmount);
        return (
          <span className="font-mono tabular-nums text-right text-dense">
            {outstanding > 0 ? formatMoney(outstanding) : "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <LoanStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => {
        if (!canManage) return null;
        if (row.status === "PENDING") {
          return <PendingActions loanId={row.id} onApproval={onApproval} />;
        }
        if (row.status === "ACTIVE") {
          return <ActiveActions row={row} onAdjust={onAdjust} />;
        }
        return null;
      },
    },
  ];
}
