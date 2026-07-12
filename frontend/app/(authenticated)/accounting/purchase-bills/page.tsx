"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { LoadingState, ErrorState } from "@/components/shared";
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

export default function PurchaseBillsListPage() {
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const canApprove = useCan("accounting:payables:approve");

  const query = usePurchaseBills({
    page: 1,
    pageSize: 100,
    q: search || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }, []);

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Purchase Bills"
      subtitle="Vendor bills and accounts payable."
      actions={
        <Button size="sm" asChild>
          <Link href="/accounting/purchase-bills/new">
            <Plus className="size-4 mr-1" />
            New bill
          </Link>
        </Button>
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
      {query.isLoading && <LoadingState variant="table" rows={8} />}
      {query.error && (
        <ErrorState
          title="Failed to load purchase bills"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      )}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No purchase bills yet"
          description="Record a vendor bill to start tracking accounts payable."
          action={{ label: "New bill", href: "/accounting/purchase-bills/new" }}
        />
      )}

      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                    Bill #
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                    Vendor
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                    Bill date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                    Due date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                    Status
                  </TableHead>
                  <TableHead className="w-10 px-2 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <TableCell className="font-mono text-xs px-3 py-2">
                      <Link
                        href={`/accounting/purchase-bills/${bill.id}`}
                        className="text-foreground hover:text-blue-600 hover:underline"
                      >
                        {bill.billNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm px-3 py-2">
                      {bill.vendorName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                      {formatDate(bill.billDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                      {formatDate(bill.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium px-3 py-2">
                      {Number(bill.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <FinanceStatusBadge status={bill.status} />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <BillRowActions bill={bill} canApprove={canApprove} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
