"use client";

import { format } from "date-fns";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { Reimbursement } from "@/hooks/api/hr";
import { getStatusConfig } from "./reimbursement-status";
import { ReimbursementActions } from "./reimbursement-actions";

interface ReimbursementColumnDeps {
  currentUserId: string | undefined;
  isAdmin: boolean;
  isProcessing: boolean;
  onApprove: (id: number) => void;
  onStartReject: (id: number) => void;
}

export function buildReimbursementColumns({
  currentUserId,
  isAdmin,
  isProcessing,
  onApprove,
  onStartReject,
}: ReimbursementColumnDeps): DataTableColumn<Reimbursement>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => <span className="text-xs font-medium">{r.user?.name ?? r.user?.email ?? "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (r) => (
        <span className="inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
          {r.category}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[200px] truncate",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.description ?? "—"}</span>,
    },
    {
      key: "date",
      header: "Date",
      cell: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (r) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const statusCfg = getStatusConfig(r.status);
        return (
          <span className={cn("inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
            {statusCfg.icon}
            {r.status ?? "PENDING"}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => (
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
          ₹{Number(r.amount).toLocaleString("en-IN")}
        </span>
      ),
      sortable: true,
      sortValue: (r) => Number(r.amount),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) =>
        r.status === "PENDING" ? (
          <ReimbursementActions
            reimbursementId={r.id}
            reimbursementUserId={r.userId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isPending={isProcessing}
            onApprove={onApprove}
            onStartReject={onStartReject}
          />
        ) : null,
    },
  ];
}
