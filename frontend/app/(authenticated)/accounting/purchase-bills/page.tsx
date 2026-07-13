"use client";

import { useState, type ChangeEvent } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { usePurchaseBills } from "@/hooks/api/accounting";
import {
  useBillSubmitApproval,
  useBillApprove,
  useBillCancel,
} from "@/hooks/api/accounting/ap";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PurchaseBillStatus, PurchaseBillSummary } from "@/types/accounting";

type StatusFilter = "ALL" | PurchaseBillStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "POSTED", label: "Posted" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

interface BillRowActionsProps {
  bill: PurchaseBillSummary;
  canApprove: boolean;
}

function BillRowActions({ bill, canApprove }: BillRowActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const submitApproval = useBillSubmitApproval(bill.id);
  const approveMutation = useBillApprove(bill.id);
  const cancelMutation = useBillCancel(bill.id);

  const showSubmit = bill.status === "DRAFT";
  const showApprove = bill.status === "PENDING_APPROVAL" && canApprove;
  const showCancel = bill.status === "DRAFT" || bill.status === "PENDING_APPROVAL";

  if (!showSubmit && !showApprove && !showCancel) return null;

  function handleSubmitApproval(): void {
    submitApproval.mutate(
      {},
      {
        onSuccess: () => toast.success("Submitted for approval"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleApprove(): void {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success("Bill approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(
      {},
      {
        onSuccess: () => {
          setCancelOpen(false);
          toast.success("Bill cancelled");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleOpenCancel(): void {
    setCancelOpen(true);
  }

  function handleCancelDialogChange(open: boolean): void {
    if (!cancelMutation.isPending) setCancelOpen(open);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {showSubmit && (
            <DropdownMenuItem
              onSelect={handleSubmitApproval}
              disabled={submitApproval.isPending}
            >
              Submit for approval
            </DropdownMenuItem>
          )}
          {showApprove && (
            <DropdownMenuItem
              onSelect={handleApprove}
              disabled={approveMutation.isPending}
            >
              Approve
            </DropdownMenuItem>
          )}
          {showCancel && (showSubmit || showApprove) && (
            <DropdownMenuSeparator />
          )}
          {showCancel && (
            <DropdownMenuItem
              onSelect={handleOpenCancel}
              className="text-destructive focus:text-destructive"
            >
              Cancel bill
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={handleCancelDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel bill {bill.billNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the bill and reverse any pending accounting entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep bill
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildColumns(canApprove: boolean): DataTableColumn<PurchaseBillSummary>[] {
  return [
    {
      key: "billNumber",
      header: "Bill #",
      cell: (bill) => (
        <Link
          href={`/accounting/purchase-bills/${bill.id}`}
          className="font-mono text-xs text-foreground hover:text-blue-600 hover:underline"
        >
          {bill.billNumber}
        </Link>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      cell: (bill) => bill.vendorName ?? "—",
      sortable: true,
      sortValue: (bill) => bill.vendorName ?? "",
    },
    {
      key: "billDate",
      header: "Bill date",
      cell: (bill) => (
        <span className="text-muted-foreground">{formatDate(bill.billDate)}</span>
      ),
      sortable: true,
      sortValue: (bill) => bill.billDate ?? "",
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (bill) => (
        <span className="text-muted-foreground">{formatDate(bill.dueDate)}</span>
      ),
      sortable: true,
      sortValue: (bill) => bill.dueDate ?? "",
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (bill) => Number(bill.total).toFixed(2),
      sortable: true,
      sortValue: (bill) => Number(bill.total),
    },
    {
      key: "status",
      header: "Status",
      cell: (bill) => <FinanceStatusBadge status={bill.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (bill) => <BillRowActions bill={bill} canApprove={canApprove} />,
    },
  ];
}

export default function PurchaseBillsListPage() {
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const canApprove = useCan("accounting:payables:approve");
  const canManage = useCan("accounting:payables:manage");

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = usePurchaseBills({
    page: 1,
    pageSize: 100,
    q: debouncedSearch.trim() || undefined,
    status: status === "ALL" ? undefined : status,
  });

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];
  const columns = buildColumns(canApprove);

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Purchase Bills"
      subtitle="Vendor bills and accounts payable."
      actions={
        canManage ? (
          <Button size="sm" asChild>
            <Link href="/accounting/purchase-bills/new">
              <Plus className="size-4 mr-1" />
              New bill
            </Link>
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by bill number"
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {query.error && (
        <ErrorState
          title="Failed to load purchase bills"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      )}

      {!query.error && (
        <DataTable<PurchaseBillSummary>
          data={items}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          minWidth="680px"
          emptyState={
            <EmptyState
              illustration={<EmptyExpensesIllustration />}
              title="No purchase bills yet"
              description="Record a vendor bill to start tracking accounts payable."
              action={{ label: "New bill", href: "/accounting/purchase-bills/new" }}
            />
          }
        />
      )}
    </PageWrapper>
  );
}
