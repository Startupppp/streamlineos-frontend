"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useIncentives,
  useApproveIncentive,
  useRejectIncentive,
  type Incentive,
} from "@/hooks/api/payroll/bonuses-admin";
import { useCan } from "@/hooks/api/access";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ADDED_TO_PAYROLL", label: "In Payroll" },
];

const INCENTIVE_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  ADDED_TO_PAYROLL: "bg-primary/10 text-foreground border-primary/20",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function IncentivesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const istatus = searchParams.get("i_status") ?? "all";
  const [page, setPage] = useState(1);

  const [approveTarget, setApproveTarget] = useState<Incentive | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");

  const { data, isLoading } = useIncentives({
    status: istatus === "all" ? undefined : istatus,
    page,
    limit: 20,
  });

  const approveIncentive = useApproveIncentive();
  const rejectIncentive = useRejectIncentive();
  const canApprove = useCan("crm:incentives:approve");

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("i_status", value);
    router.replace(`?${params.toString()}`, { scroll: false });
    setPage(1);
  }

  function makeApproveOpener(row: Incentive) {
    function handleOpenApprove() {
      setApproveTarget(row);
      setApprovedAmount(row.calculatedAmount ?? "");
    }
    return handleOpenApprove;
  }

  function handleApproveDialogChange(open: boolean) {
    if (!open) {
      setApproveTarget(null);
      setApprovedAmount("");
    }
  }

  function handleApprovedAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setApprovedAmount(e.target.value);
  }

  function handleConfirmApprove() {
    if (!approveTarget || !approvedAmount.trim()) return;
    approveIncentive.mutate(
      { id: approveTarget.id, approvedAmount: approvedAmount.trim() },
      {
        onSuccess: () => {
          toast.success("Incentive approved");
          setApproveTarget(null);
          setApprovedAmount("");
        },
        onError: () => toast.error("Failed to approve incentive"),
      },
    );
  }

  function handleCancelApproveDialog() {
    setApproveTarget(null);
    setApprovedAmount("");
  }

  function makeRejectHandler(id: number) {
    function handleReject() {
      rejectIncentive.mutate(id, {
        onSuccess: () => toast.success("Incentive rejected"),
        onError: () => toast.error("Failed to reject incentive"),
      });
    }
    return handleReject;
  }

  const actionColumn: DataTableColumn<Incentive> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            disabled={approveIncentive.isPending}
            onClick={makeApproveOpener(row)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
            disabled={rejectIncentive.isPending}
            onClick={makeRejectHandler(row.id)}
          >
            Reject
          </Button>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Incentive>[] = [
    {
      key: "salesRep",
      header: "Sales Rep",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.salesRep.name ?? "—"} className="text-[11px] font-medium" />
        </div>
      ),
    },
    {
      key: "investmentAmount",
      header: "Investment",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">
          {formatMoney(row.investmentAmount)}
        </span>
      ),
    },
    {
      key: "incentiveRate",
      header: "Rate",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">
          {row.incentiveRate ? `${row.incentiveRate}%` : "—"}
        </span>
      ),
    },
    {
      key: "calculatedAmount",
      header: "Calculated",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">
          {formatMoney(row.calculatedAmount)}
        </span>
      ),
    },
    {
      key: "approvedAmount",
      header: "Approved",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">
          {row.approvedAmount ? formatMoney(row.approvedAmount) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
            INCENTIVE_STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground border-border"
          }`}
        >
          {row.status === "ADDED_TO_PAYROLL" ? "In Payroll" : row.status.charAt(0) + row.status.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(canApprove ? [actionColumn] : []),
  ];

  return (
    <>
      <div className="flex flex-1 min-h-0 flex-col gap-0 pt-3">
        <div className={`${FILTER_TOOLBAR_ROW} mb-3`}>
          <Select value={istatus} onValueChange={handleStatusChange}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-40`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-col overflow-hidden p-0">
            <DataTable
              data={data?.incentives ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              minWidth="800px"
              pagination={{
                mode: "server",
                page,
                pageSize: 20,
                total: data?.total ?? 0,
                onPageChange: setPage,
              }}
              emptyState={
                <EmptyState
                  illustration={<EmptyTargetIllustration />}
                  title="No incentives found"
                  description="No sales incentives match the current filters."
                />
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={approveTarget !== null} onOpenChange={handleApproveDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Incentive</DialogTitle>
            <DialogDescription>Confirm the approved amount for this incentive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="approved-amount" className="text-sm">
              Approved Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="approved-amount"
              type="number"
              min="0"
              step="0.01"
              value={approvedAmount}
              onChange={handleApprovedAmountChange}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelApproveDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={!approvedAmount.trim() || approveIncentive.isPending}
              onClick={handleConfirmApprove}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
