"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  VENDOR_RETURNS_PERMISSION,
  useApproveVendorReturn,
  useCancelVendorReturn,
  usePostVendorReturn,
  useVendorReturns,
  type ReturnStatus,
  type VendorReturnSummary,
} from "@/hooks/api/inventory/returns";
import { useCan } from "@/hooks/api/access";
import { ReturnApproveDialog } from "./return-approve-dialog";
import { ReturnRowActions } from "./return-row-actions";
import { ReturnStatusBadge } from "./return-status-badge";

export interface VendorReturnsTableProps {
  status: ReturnStatus | undefined;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onCreate: () => void;
}

export function VendorReturnsTable({
  status,
  page,
  pageSize,
  onPageChange,
  onCreate,
}: VendorReturnsTableProps) {
  const canManage = useCan(VENDOR_RETURNS_PERMISSION);
  const [approving, setApproving] = useState<VendorReturnSummary | null>(null);

  const query = useVendorReturns({ page, limit: pageSize, ...(status ? { status } : {}) });
  const approve = useApproveVendorReturn();
  const post = usePostVendorReturn();
  const cancel = useCancelVendorReturn();

  function handleRetry(): void {
    void query.refetch();
  }

  function handleApproveDialogChange(open: boolean): void {
    if (!open) setApproving(null);
  }

  function handleApprove(creditReference: string | undefined): void {
    if (!approving) return;
    approve.mutate(
      {
        returnId: approving.id,
        ...(creditReference !== undefined ? { creditReference } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Vendor return approved");
          setApproving(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const columns = useMemo((): DataTableColumn<VendorReturnSummary>[] => [
    {
      key: "returnNumber",
      header: "Return #",
      cell: (row) => <span className="font-mono text-dense">{row.returnNumber}</span>,
    },
    { key: "vendor", header: "Vendor", cell: (row) => row.vendor?.name ?? "—" },
    {
      key: "creditReference",
      header: "Credit ref.",
      cell: (row) => (
        <span className="font-mono text-dense text-muted-foreground">
          {row.creditReference ?? "—"}
        </span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ReturnStatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => (
        <span className="font-mono tabular-nums text-dense">
          {formatShortDate(row.createdAt) || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (row) => {
        function handleApproveRow(): void {
          setApproving(row);
        }
        function handlePostRow(): void {
          post.mutate(
            { returnId: row.id },
            {
              onSuccess: () => toast.success("Vendor return posted"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          );
        }
        function handleCancelRow(): void {
          cancel.mutate(
            { returnId: row.id },
            {
              onSuccess: () => toast.success("Vendor return cancelled"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          );
        }
        return (
          <ReturnRowActions
            returnNumber={row.returnNumber}
            status={row.status}
            canManage={canManage}
            isPosting={post.isPending}
            onApprove={handleApproveRow}
            onPost={handlePostRow}
            onCancel={handleCancelRow}
          />
        );
      },
    },
  ], [canManage, post, cancel]);

  return (
    <>
      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        className="flex-1 min-h-0"
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        pagination={{
          mode: "server",
          page,
          pageSize,
          total: query.data?.total ?? 0,
          onPageChange,
        }}
        emptyState={
          query.error ? (
            <ErrorState
              title="Couldn't load vendor returns"
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
              compact
            />
          ) : status ? (
            <InventoryEmptyState
              title="No returns match this filter"
              description="Clear the status filter to see every vendor return."
              compact
            />
          ) : (
            <InventoryEmptyState
              title="No vendor returns"
              description="Raise a vendor return to send goods back to a supplier."
              action={{ label: "New Vendor Return", onClick: onCreate }}
              compact
            />
          )
        }
        minWidth="640px"
      />

      <ReturnApproveDialog
        open={approving !== null}
        onOpenChange={handleApproveDialogChange}
        returnNumber={approving?.returnNumber ?? "return"}
        isSubmitting={approve.isPending}
        onApprove={handleApprove}
      />
    </>
  );
}
