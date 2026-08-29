"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CUSTOMER_RETURNS_PERMISSION,
  useApproveCustomerReturn,
  useCancelCustomerReturn,
  useCustomerReturns,
  usePostCustomerReturn,
  type CustomerReturnSummary,
  type ReturnStatus,
} from "@/hooks/api/inventory/returns";
import { useCan } from "@/hooks/api/access";
import { CustomerReturnInspectSheet } from "./customer-return-inspect-sheet";
import { ReturnApproveDialog } from "./return-approve-dialog";
import { ReturnRowActions } from "./return-row-actions";
import { ReturnStatusBadge } from "./return-status-badge";

export interface CustomerReturnsTableProps {
  status: ReturnStatus | undefined;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onCreate: () => void;
}

export function CustomerReturnsTable({
  status,
  page,
  pageSize,
  onPageChange,
  onCreate,
}: CustomerReturnsTableProps) {
  const canManage = useCan(CUSTOMER_RETURNS_PERMISSION);
  const [approving, setApproving] = useState<CustomerReturnSummary | null>(null);
  const [inspectingId, setInspectingId] = useState<number | null>(null);

  const query = useCustomerReturns({ page, limit: pageSize, ...(status ? { status } : {}) });
  const approve = useApproveCustomerReturn();
  const post = usePostCustomerReturn();
  const cancel = useCancelCustomerReturn();

  function handleRetry(): void {
    void query.refetch();
  }

  function handleApproveDialogChange(open: boolean): void {
    if (!open) setApproving(null);
  }

  function handleInspectSheetChange(open: boolean): void {
    if (!open) setInspectingId(null);
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
          toast.success("Customer return approved");
          setApproving(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const columns = useMemo((): DataTableColumn<CustomerReturnSummary>[] => [
    {
      key: "returnNumber",
      header: "Return #",
      cell: (row) => <span className="font-mono text-dense">{row.returnNumber}</span>,
      sortable: true,
      sortValue: (row) => row.returnNumber,
    },
    { key: "client", header: "Customer", cell: (row) => row.client?.name ?? "—" },
    {
      // INV-209 made the inspection the gate on posting, so "how far through the
      // boxes are we" is the column that decides what to do next.
      key: "inspection",
      header: "Inspected",
      cell: (row) => {
        const lines = row.lines ?? [];
        const done = lines.filter((line) => line.inspectedAt !== null).length;
        return (
          <span className="font-mono tabular-nums text-dense text-muted-foreground">
            {done}/{lines.length}
          </span>
        );
      },
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
        function handleInspectRow(): void {
          setInspectingId(row.id);
        }
        function handleApproveRow(): void {
          setApproving(row);
        }
        function handlePostRow(): void {
          post.mutate(
            { returnId: row.id },
            {
              onSuccess: () => toast.success("Customer return posted"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          );
        }
        function handleCancelRow(): void {
          cancel.mutate(
            { returnId: row.id },
            {
              onSuccess: () => toast.success("Customer return cancelled"),
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
            onInspect={handleInspectRow}
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
              title="Couldn't load customer returns"
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
              compact
            />
          ) : status ? (
            <InventoryEmptyState
              title="No returns match this filter"
              description="Clear the status filter to see every customer return."
              compact
            />
          ) : (
            <InventoryEmptyState
              title="No customer returns"
              description="Log a return when goods come back from a customer."
              action={{ label: "New Customer Return", onClick: onCreate }}
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

      <CustomerReturnInspectSheet
        returnId={inspectingId}
        open={inspectingId !== null}
        onOpenChange={handleInspectSheetChange}
      />
    </>
  );
}
