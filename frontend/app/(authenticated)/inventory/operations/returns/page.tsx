"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  useVendorReturns,
  useCustomerReturns,
  usePostVendorReturn,
  useCancelVendorReturn,
  usePostCustomerReturn,
  useCancelCustomerReturn,
  type VendorReturnSummary,
  type CustomerReturnSummary,
  type VendorReturnStatus,
  type CustomerReturnStatus,
} from "@/hooks/api/inventory/operations";
import { VendorReturnSheet } from "@/features/inventory/components/operations/vendor-return-sheet";
import { CustomerReturnSheet } from "@/features/inventory/components/operations/customer-return-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";

type ReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

const RETURN_STATUS_BADGE: Record<ReturnStatus, string> = {
  DRAFT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  POSTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

function ReturnStatusBadge({ status }: { status: VendorReturnStatus | CustomerReturnStatus }) {
  const cls = RETURN_STATUS_BADGE[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0", cls)}>
      {status}
    </Badge>
  );
}

export default function ReturnsPage() {
  const [vendorSheetOpen, setVendorSheetOpen] = useState(false);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  const vendorQuery = useVendorReturns({ pageSize: 50 });
  const customerQuery = useCustomerReturns({ pageSize: 50 });
  const postVendorMutation = usePostVendorReturn();
  const cancelVendorMutation = useCancelVendorReturn();
  const postCustomerMutation = usePostCustomerReturn();
  const cancelCustomerMutation = useCancelCustomerReturn();

  const vendorItems = vendorQuery.data?.items ?? [];
  const customerItems = customerQuery.data?.items ?? [];

  function handleOpenVendorSheet(): void {
    setVendorSheetOpen(true);
  }

  function handleOpenCustomerSheet(): void {
    setCustomerSheetOpen(true);
  }

  const handlePostVendorReturn = useCallback((id: number): void => {
    postVendorMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Vendor return posted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [postVendorMutation]);

  const handleCancelVendorReturn = useCallback((id: number): void => {
    cancelVendorMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Vendor return cancelled"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [cancelVendorMutation]);

  const handlePostCustomerReturn = useCallback((id: number): void => {
    postCustomerMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Customer return posted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [postCustomerMutation]);

  const handleCancelCustomerReturn = useCallback((id: number): void => {
    cancelCustomerMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Customer return cancelled"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [cancelCustomerMutation]);

  function handleVendorRetry(): void {
    void vendorQuery.refetch();
  }

  function handleCustomerRetry(): void {
    void customerQuery.refetch();
  }

  const vendorColumns = useMemo((): DataTableColumn<VendorReturnSummary>[] => [
    {
      key: "returnNumber",
      header: "Return #",
      cell: (r) => <span className="font-mono text-dense">{r.returnNumber}</span>,
      sortable: true,
      sortValue: (r) => r.returnNumber,
    },
    { key: "vendorId", header: "Vendor ID", cell: (r) => <span className="font-mono text-dense text-muted-foreground">{r.vendorId}</span> },
    {
      key: "poId",
      header: "PO ID",
      cell: (r) => <span className="font-mono text-dense text-muted-foreground">{r.poId ?? "—"}</span>,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <ReturnStatusBadge status={r.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (r) => <span className="font-mono tabular-nums text-dense">{formatShortDate(r.createdAt) || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => {
        function handlePost(): void { handlePostVendorReturn(r.id); }
        function handleCancel(): void { handleCancelVendorReturn(r.id); }
        return r.status === "DRAFT" ? (
          <div className="flex items-center gap-1.5">
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-6 text-micro px-2"
              onClick={handlePost}
              isPending={postVendorMutation.isPending}
              loadingText="Posting…"
            >
              Post
            </LoadingButton>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-micro px-2 text-destructive">
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this return?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    variant="destructive"
                  >
                    Cancel Return
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null;
      },
    },
  ], [handlePostVendorReturn, handleCancelVendorReturn, postVendorMutation.isPending]);

  const customerColumns = useMemo((): DataTableColumn<CustomerReturnSummary>[] => [
    {
      key: "returnNumber",
      header: "Return #",
      cell: (r) => <span className="font-mono text-dense">{r.returnNumber}</span>,
      sortable: true,
      sortValue: (r) => r.returnNumber,
    },
    { key: "clientId", header: "Client ID", cell: (r) => <span className="font-mono text-dense text-muted-foreground">{r.clientId ?? "—"}</span> },
    {
      key: "soId",
      header: "SO ID",
      cell: (r) => <span className="font-mono text-dense text-muted-foreground">{r.soId ?? "—"}</span>,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <ReturnStatusBadge status={r.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (r) => <span className="font-mono tabular-nums text-dense">{formatShortDate(r.createdAt) || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => {
        function handlePost(): void { handlePostCustomerReturn(r.id); }
        function handleCancel(): void { handleCancelCustomerReturn(r.id); }
        return r.status === "DRAFT" ? (
          <div className="flex items-center gap-1.5">
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-6 text-micro px-2"
              onClick={handlePost}
              isPending={postCustomerMutation.isPending}
              loadingText="Posting…"
            >
              Post
            </LoadingButton>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-micro px-2 text-destructive">
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this return?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    variant="destructive"
                  >
                    Cancel Return
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null;
      },
    },
  ], [handlePostCustomerReturn, handleCancelCustomerReturn, postCustomerMutation.isPending]);

  return (
    <PageWrapper
      title="Returns"
      subtitle="Manage vendor and customer return merchandise authorizations"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <Tabs defaultValue="vendor" className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="vendor">Vendor Returns</TabsTrigger>
          <TabsTrigger value="customer">Customer Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={handleOpenVendorSheet}>
              New Vendor Return
            </Button>
          </div>
          <DataTable
            data={vendorItems}
            columns={vendorColumns}
            className="flex-1 min-h-0"
            getRowKey={(r) => r.id}
            isLoading={vendorQuery.isLoading}
            emptyState={
              vendorQuery.error ? (
                <ErrorState description={getErrorMessage(vendorQuery.error)} onRetry={handleVendorRetry} compact />
              ) : (
                <InventoryEmptyState title="No vendor returns" description="Create a vendor return to get started." compact />
              )
            }
            minWidth="580px"
          />
        </TabsContent>

        <TabsContent value="customer" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={handleOpenCustomerSheet}>
              New Customer Return
            </Button>
          </div>
          <DataTable
            data={customerItems}
            columns={customerColumns}
            className="flex-1 min-h-0"
            getRowKey={(r) => r.id}
            isLoading={customerQuery.isLoading}
            emptyState={
              customerQuery.error ? (
                <ErrorState description={getErrorMessage(customerQuery.error)} onRetry={handleCustomerRetry} compact />
              ) : (
                <InventoryEmptyState title="No customer returns" description="Create a customer return to get started." compact />
              )
            }
            minWidth="580px"
          />
        </TabsContent>
      </Tabs>
      </div>

      <VendorReturnSheet open={vendorSheetOpen} onOpenChange={setVendorSheetOpen} />
      <CustomerReturnSheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen} />
    </PageWrapper>
  );
}
