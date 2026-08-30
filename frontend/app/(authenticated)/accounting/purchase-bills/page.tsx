"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { SearchInput } from "@/components/ui/search-input";
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
          <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Bill actions" />
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
          className="font-mono text-xs text-foreground hover:text-primary hover:underline"
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
    limit: 100,
    q: debouncedSearch.trim() || undefined,
    status: status === "ALL" ? undefined : status,
  });

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.data ?? [];
  const columns = buildColumns(canApprove);

  return (
    <PageWrapper
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
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput value={search} onValueChange={handleSearchChange} placeholder="Search by bill number" />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
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
      <div className="flex flex-1 min-h-0 flex-col">
        {query.error ? (
          <ErrorState
            title="Failed to load purchase bills"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable<PurchaseBillSummary>
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={query.isLoading}
            minWidth="680px"
            className="flex-1 min-h-0"
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
      </div>
    </PageWrapper>
  );
}
