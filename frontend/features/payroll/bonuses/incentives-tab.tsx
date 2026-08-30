"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { formatShortDate } from "@/lib/date-utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ADDED_TO_PAYROLL", label: "In Payroll" },
];

const INCENTIVE_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  ADDED_TO_PAYROLL: "bg-primary/10 text-foreground border-primary/20",
};


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
          <LoadingButton
            size="sm"
            variant="outline"
            className="h-6 text-micro px-2 text-status-success-ink border-status-success-rule hover:bg-status-success-surface"
            isPending={approveIncentive.isPending}
            onClick={makeApproveOpener(row)}
          >
            Approve
          </LoadingButton>
          <LoadingButton
            size="sm"
            variant="outline"
            className="h-6 text-micro px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            isPending={rejectIncentive.isPending}
            onClick={makeRejectHandler(row.id)}
          >
            Reject
          </LoadingButton>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Incentive>[] = [
    {
      key: "salesRep",
      header: "Sales Rep",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.salesRep.name ?? "—"} className="text-dense font-medium" />
        </div>
      ),
    },
    {
      key: "investmentAmount",
      header: "Investment",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMoney(row.investmentAmount)}
        </span>
      ),
    },
    {
      key: "incentiveRate",
      header: "Rate",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {row.incentiveRate ? `${row.incentiveRate}%` : "—"}
        </span>
      ),
    },
    {
      key: "calculatedAmount",
      header: "Calculated",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMoney(row.calculatedAmount)}
        </span>
      ),
    },
    {
      key: "approvedAmount",
      header: "Approved",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {row.approvedAmount ? formatMoney(row.approvedAmount) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${
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
        <span className="text-micro text-muted-foreground">{formatShortDate(row.createdAt)}</span>
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
        <DataTable
          className="flex-1 min-h-0"
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
            <LoadingButton
              disabled={!approvedAmount.trim()}
              isPending={approveIncentive.isPending}
              onClick={handleConfirmApprove}
            >
              Approve
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
