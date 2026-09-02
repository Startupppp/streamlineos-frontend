"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { usePurchaseBills } from "@/hooks/api/accounting";
import {
  useBillSubmitApproval,
  useBillApprove,
  useBillCancel,
} from "@/hooks/api/accounting/ap";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
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

const PAGE_SIZE = 25;

function parseStatusFilter(value: string | null): StatusFilter {
  if (STATUS_OPTIONS.some((opt) => opt.value === value && value !== "ALL"))
    return value as PurchaseBillStatus;
  return "ALL";
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
        <span className="text-muted-foreground">{formatShortDate(bill.billDate)}</span>
      ),
      sortable: true,
      sortValue: (bill) => bill.billDate ?? "",
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (bill) => (
        <span className="text-muted-foreground">{formatShortDate(bill.dueDate)}</span>
      ),
      sortable: true,
      sortValue: (bill) => bill.dueDate ?? "",
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (bill) => <Money value={Number(bill.total)} />,
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

export function PurchaseBillsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchParam = searchParams.get("q") ?? "";
  const statusParam = parseStatusFilter(searchParams.get("status"));

  const [searchInput, setSearchInput] = useState(searchParam);

  const canApprove = useCan("accounting:payables:approve");
  const canManage = useCan("accounting:payables:manage");

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const filterKey = `${searchParam}|${statusParam}`;

  useEffect(() => {
    setCursors([null]);
    setCursorIndex(0);
  }, [filterKey]);

  const currentCursor = cursors[cursorIndex] ?? null;

  const query = usePurchaseBills({
    limit: PAGE_SIZE,
    cursor: currentCursor ?? undefined,
    q: debouncedSearch.trim() || undefined,
    status: statusParam === "ALL" ? undefined : statusParam,
  });

  function setParam(key: string, value: string): void {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleSearchChange(value: string): void {
    setSearchInput(value);
    setParam("q", value);
  }

  function handleStatusChange(value: string): void {
    setParam("status", value === "ALL" ? "" : value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    setSearchInput("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("status");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handlePreviousPage(): void {
    setCursorIndex(Math.max(0, cursorIndex - 1));
  }

  function handleNextPage(): void {
    const next = query.data?.pagination.nextCursor ?? null;
    setCursors((prev) => {
      const copy = prev.slice(0, cursorIndex + 1);
      copy.push(next);
      return copy;
    });
    setCursorIndex(cursorIndex + 1);
  }

  const items = query.data?.data ?? [];
  const hasMore = query.data?.pagination?.hasMore ?? false;
  const columns = buildColumns(canApprove);
  const filtersActive = searchInput.trim() !== "" || statusParam !== "ALL";

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
          <SearchInput value={searchInput} onValueChange={handleSearchChange} placeholder="Search by bill number" />
          <Select value={statusParam} onValueChange={handleStatusChange}>
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
          <>
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
                  description={
                    filtersActive
                      ? undefined
                      : "Record a vendor bill to start tracking accounts payable."
                  }
                  filtersActive={filtersActive}
                  onClearFilters={handleClearFilters}
                  action={
                    canManage && !filtersActive
                      ? { label: "New bill", href: "/accounting/purchase-bills/new" }
                      : undefined
                  }
                />
              }
            />
            {(cursorIndex > 0 || hasMore) ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={hasMore}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
