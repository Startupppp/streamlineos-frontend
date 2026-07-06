"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type ReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

const RETURN_STATUS_BADGE: Record<ReturnStatus, string> = {
  DRAFT: "bg-blue-50 text-blue-700 border-blue-200",
  POSTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function ReturnStatusBadge({ status }: { status: VendorReturnStatus | CustomerReturnStatus }) {
  const cls = RETURN_STATUS_BADGE[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0", cls)}>
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
        onError: (err) => toast.error(err.message ?? "Failed to post"),
      },
    );
  }, [postVendorMutation]);

  const handleCancelVendorReturn = useCallback((id: number): void => {
    cancelVendorMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Vendor return cancelled"),
        onError: (err) => toast.error(err.message ?? "Failed to cancel"),
      },
    );
  }, [cancelVendorMutation]);

  const handlePostCustomerReturn = useCallback((id: number): void => {
    postCustomerMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Customer return posted"),
        onError: (err) => toast.error(err.message ?? "Failed to post"),
      },
    );
  }, [postCustomerMutation]);

  const handleCancelCustomerReturn = useCallback((id: number): void => {
    cancelCustomerMutation.mutate(
      { returnId: id },
      {
        onSuccess: () => toast.success("Customer return cancelled"),
        onError: (err) => toast.error(err.message ?? "Failed to cancel"),
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
      cell: (r) => <span className="font-mono text-[11px]">{r.returnNumber}</span>,
      sortable: true,
      sortValue: (r) => r.returnNumber,
    },
    { key: "vendorName", header: "Vendor", cell: (r) => r.vendorName ?? "—" },
    {
      key: "poId",
      header: "PO ID",
      cell: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.poId ?? "—"}</span>,
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
      cell: (r) => <span className="font-mono tabular-nums text-[11px]">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "DRAFT" ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => handlePostVendorReturn(r.id)}
              disabled={postVendorMutation.isPending}
            >
              Post
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-red-600">
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
                    onClick={() => handleCancelVendorReturn(r.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancel Return
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null,
    },
  ], [handlePostVendorReturn, handleCancelVendorReturn, postVendorMutation.isPending]);

  const customerColumns = useMemo((): DataTableColumn<CustomerReturnSummary>[] => [
    {
      key: "returnNumber",
      header: "Return #",
      cell: (r) => <span className="font-mono text-[11px]">{r.returnNumber}</span>,
      sortable: true,
      sortValue: (r) => r.returnNumber,
    },
    { key: "customerName", header: "Customer", cell: (r) => r.customerName ?? "—" },
    {
      key: "soId",
      header: "SO ID",
      cell: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.soId ?? "—"}</span>,
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
      cell: (r) => <span className="font-mono tabular-nums text-[11px]">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "DRAFT" ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => handlePostCustomerReturn(r.id)}
              disabled={postCustomerMutation.isPending}
            >
              Post
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-red-600">
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
                    onClick={() => handleCancelCustomerReturn(r.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancel Return
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null,
    },
  ], [handlePostCustomerReturn, handleCancelCustomerReturn, postCustomerMutation.isPending]);

  return (
    <PageWrapper
      eyebrow="Inventory / Operations"
      title="Returns"
      subtitle="Manage vendor and customer return merchandise authorizations"
    >
      <Tabs defaultValue="vendor">
        <TabsList className="mb-4">
          <TabsTrigger value="vendor">Vendor Returns</TabsTrigger>
          <TabsTrigger value="customer">Customer Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={handleOpenVendorSheet}>
              New Vendor Return
            </Button>
          </div>
          <DataTable
            data={vendorItems}
            columns={vendorColumns}
            getRowKey={(r) => r.id}
            isLoading={vendorQuery.isLoading}
            emptyState={
              vendorQuery.error ? (
                <ErrorState description={vendorQuery.error.message} onRetry={handleVendorRetry} compact />
              ) : (
                <InventoryEmptyState title="No vendor returns" description="Create a vendor return to get started." compact />
              )
            }
            minWidth="580px"
            className="min-h-[280px]"
          />
        </TabsContent>

        <TabsContent value="customer">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={handleOpenCustomerSheet}>
              New Customer Return
            </Button>
          </div>
          <DataTable
            data={customerItems}
            columns={customerColumns}
            getRowKey={(r) => r.id}
            isLoading={customerQuery.isLoading}
            emptyState={
              customerQuery.error ? (
                <ErrorState description={customerQuery.error.message} onRetry={handleCustomerRetry} compact />
              ) : (
                <InventoryEmptyState title="No customer returns" description="Create a customer return to get started." compact />
              )
            }
            minWidth="580px"
            className="min-h-[280px]"
          />
        </TabsContent>
      </Tabs>

      <VendorReturnSheet open={vendorSheetOpen} onOpenChange={setVendorSheetOpen} />
      <CustomerReturnSheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen} />
    </PageWrapper>
  );
}
