"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { ReimbursementStatusBadge } from "./reimbursement-status-badge";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import {
  useReimbursements,
  useProcessReimbursement,
  type Reimbursement,
} from "@/hooks/api/hr/reimbursements";
import { useCan } from "@/hooks/api/access";
import { EmptyExpensesIllustration } from "@/components/illustrations";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "TRAVEL", label: "Travel" },
  { value: "FOOD", label: "Food" },
  { value: "INTERNET", label: "Internet" },
  { value: "MEDICAL", label: "Medical" },
  { value: "FUEL", label: "Fuel" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "CLIENT_PROJECT", label: "Client / Project" },
  { value: "CUSTOM", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toYearMonth(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReimbursementsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const month = searchParams.get("month") ?? getCurrentMonth();
  const status = searchParams.get("status") ?? "all";
  const category = searchParams.get("category") ?? "all";

  const [rejectTarget, setRejectTarget] = useState<Reimbursement | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useReimbursements();
  const processReimbursement = useProcessReimbursement();
  const canApprove = useCan("hr:payroll:approve");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleMonthChange(value: string) {
    updateParam("month", value);
  }

  function handleStatusChange(value: string) {
    updateParam("status", value);
  }

  function handleCategoryChange(value: string) {
    updateParam("category", value);
  }

  function makeApproveHandler(id: number) {
    function handleApprove() {
      processReimbursement.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Claim approved"),
          onError: () => toast.error("Failed to approve claim"),
        },
      );
    }
    return handleApprove;
  }

  function makeRejectOpener(row: Reimbursement) {
    function handleOpenReject() {
      setRejectTarget(row);
      setRejectReason("");
    }
    return handleOpenReject;
  }

  function handleCancelReject() {
    setRejectTarget(null);
    setRejectReason("");
  }

  function handleRejectDialogChange(open: boolean) {
    if (!open) handleCancelReject();
  }

  function handleRejectReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRejectReason(e.target.value);
  }

  function handleConfirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    processReimbursement.mutate(
      { id: rejectTarget.id, status: "REJECTED", rejectionReason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success("Claim rejected");
          handleCancelReject();
        },
        onError: () => toast.error("Failed to reject claim"),
      },
    );
  }

  const filtered = (data ?? []).filter((r) => {
    const monthMatch = toYearMonth(r.createdAt) === month;
    const statusMatch = status === "all" || r.status === status;
    const categoryMatch =
      category === "all" || r.category.toUpperCase().replace(/\s+/g, "_") === category;
    return monthMatch && statusMatch && categoryMatch;
  });

  const actionColumn: DataTableColumn<Reimbursement> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
            disabled={processReimbursement.isPending}
            onClick={makeApproveHandler(row.id)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
            disabled={processReimbursement.isPending}
            onClick={makeRejectOpener(row)}
          >
            Reject
          </Button>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Reimbursement>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[11px] font-medium truncate">{row.user?.name ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground truncate">
            {row.user?.email ?? row.userId}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-muted text-muted-foreground border-border">
          {row.category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.amount)}</span>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) =>
        row.receiptUrl ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ReimbursementStatusBadge status={row.status} />,
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

  const filterBar = (
    <div className="flex items-center gap-2 flex-wrap">
      <MonthPicker value={month} onChange={handleMonthChange} yearRange={[-1, 0]} className="w-44" />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 text-sm w-36">
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
      <Select value={category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="h-8 text-sm w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageWrapper
        title="Reimbursements"
        subtitle="Review and approve employee expense claims"
        filters={filterBar}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
            Approved claims flow into the{" "}
            <span className="font-medium">{formatMonth(month)}</span> payroll run automatically.
            Approved reimbursements are included as payroll inputs.
          </div>
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                isLoading={isLoading}
                minWidth="820px"
                emptyState={
                  <EmptyState
                    illustration={<EmptyExpensesIllustration />}
                    title="No claims found"
                    description="No reimbursement claims match the current filters."
                  />
                }
              />
            </CardContent>
          </Card>
        </div>
      </PageWrapper>

      <Dialog open={rejectTarget !== null} onOpenChange={handleRejectDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this reimbursement claim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="reject-reason" className="text-sm">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={handleRejectReasonChange}
              placeholder="Explain why this claim is being rejected…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelReject}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || processReimbursement.isPending}
              onClick={handleConfirmReject}
            >
              Reject Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
