"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { MoreHorizontal } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { VendorCreditFormSheet } from "@/features/accounting/purchases/vendor-credit-form-sheet";
import { VendorCreditApplyDialog } from "@/features/accounting/purchases/vendor-credit-apply-dialog";
import {
  useVendorCredits,
  useVendorCredit,
  usePostVendorCredit,
} from "@/hooks/api/accounting/ap";
import type { VendorCreditSummary, VendorCreditStatus } from "@/hooks/api/accounting/ap";
import { useVendorsOutstanding } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "POSTED", label: "Posted" },
  { value: "APPLIED", label: "Applied" },
  { value: "VOID", label: "Void" },
];

interface CreditRowActionsProps {
  credit: VendorCreditSummary;
  onViewDetail: () => void;
  onApply: () => void;
}

function CreditRowActions({ credit, onViewDetail, onApply }: CreditRowActionsProps) {
  const postMutation = usePostVendorCredit(credit.id);

  function handlePost(): void {
    postMutation.mutate(undefined, {
      onSuccess: () => toast.success("Vendor credit posted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {credit.status === "DRAFT" && (
          <DropdownMenuItem onClick={handlePost} disabled={postMutation.isPending}>
            Post
          </DropdownMenuItem>
        )}
        {credit.status === "POSTED" && (
          <DropdownMenuItem onClick={onApply}>Apply to bill</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onViewDetail}>View detail</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreditDetailSheet({
  creditId,
  open,
  onOpenChange,
}: {
  creditId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useVendorCredit(creditId);
  const credit = query.data;

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={credit?.vendorCreditNumber ?? "Vendor Credit"}>
      {query.isLoading && (
        <div className="px-6 py-8 text-sm text-muted-foreground text-center">Loading…</div>
      )}
      {credit && (
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Vendor</p>
              <p>{credit.vendorName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Status</p>
              <FinanceStatusBadge status={credit.status} size="chip" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Total</p>
              <Money value={Number(credit.total)} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Applied</p>
              <Money value={Number(credit.appliedAmount)} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Remaining</p>
              <Money value={Number(credit.total) - Number(credit.appliedAmount)} />
            </div>
            {credit.reason && (
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Reason</p>
                <p className="text-sm">{credit.reason}</p>
              </div>
            )}
          </div>
          {credit.items.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Rate</th>
                    <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {credit.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-1.5">{item.description}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{item.rate}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppSheet>
  );
}

export default function VendorCreditsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTargetId, setApplyTargetId] = useState<number | null>(null);
  const [applyTargetVendorId, setApplyTargetVendorId] = useState<number | null>(null);
  const [applyTargetRemaining, setApplyTargetRemaining] = useState<number>(0);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const vendorsQuery = useVendorsOutstanding({ pageSize: 100 });
  const query = useVendorCredits({
    page: 1,
    pageSize: 50,
    vendorId: vendorFilter !== "all" ? Number(vendorFilter) : undefined,
    status: statusFilter !== "all" ? (statusFilter as VendorCreditStatus) : undefined,
  });

  const vendors = vendorsQuery.data?.items ?? [];
  const credits = query.data?.items ?? [];

  function handleNewClick(): void {
    setCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean): void {
    setCreateOpen(open);
  }

  function handleDetailOpenChange(open: boolean): void {
    if (!open) setSelectedCreditId(null);
  }

  function handleApplyDialogOpenChange(open: boolean): void {
    setApplyDialogOpen(open);
  }

  function handleVendorFilterChange(value: string): void {
    setVendorFilter(value);
  }

  function handleStatusFilterChange(value: string): void {
    setStatusFilter(value);
  }

  const handleOpenApply = useCallback((credit: VendorCreditSummary) => {
    setApplyTargetId(credit.id);
    setApplyTargetVendorId(credit.vendorId);
    setApplyTargetRemaining(Number(credit.total) - Number(credit.appliedAmount));
    setApplyDialogOpen(true);
  }, []);

  const handleOpenDetail = useCallback((credit: VendorCreditSummary) => {
    setSelectedCreditId(credit.id);
  }, []);

  const columns: DataTableColumn<VendorCreditSummary>[] = [
    {
      key: "vendorCreditNumber",
      header: "Credit #",
      cell: (row) => <span className="font-mono text-xs">{row.vendorCreditNumber}</span>,
    },
    {
      key: "vendorName",
      header: "Vendor",
      cell: (row) => <span className="text-sm">{row.vendorName ?? "—"}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
          {row.reason ?? "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <Money value={Number(row.total)} />,
    },
    {
      key: "appliedAmount",
      header: "Applied",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => <Money value={Number(row.appliedAmount)} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <FinanceStatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => (
        <CreditRowActions
          credit={row}
          onViewDetail={() => handleOpenDetail(row)}
          onApply={() => handleOpenApply(row)}
        />
      ),
    },
  ];

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Vendor Credits"
      subtitle="Debit notes and credit memos from vendors."
      actions={
        <Button size="sm" onClick={handleNewClick}>
          New credit
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={vendorFilter} onValueChange={handleVendorFilterChange}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                  {v.vendorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
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
      <DataTable
        data={credits}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        emptyState={
          <EmptyState
            illustrationPreset="orders"
            title="No vendor credits"
            description="Record a debit note or credit memo received from a vendor."
            action={{ label: "New credit", onClick: handleNewClick }}
          />
        }
      />

      <VendorCreditFormSheet open={createOpen} onOpenChange={handleCreateOpenChange} />

      {selectedCreditId !== null && (
        <CreditDetailSheet
          creditId={selectedCreditId}
          open={selectedCreditId !== null}
          onOpenChange={handleDetailOpenChange}
        />
      )}

      {applyTargetId !== null && (
        <VendorCreditApplyDialog
          open={applyDialogOpen}
          onOpenChange={handleApplyDialogOpenChange}
          creditId={applyTargetId}
          vendorId={applyTargetVendorId}
          remaining={applyTargetRemaining}
        />
      )}
    </PageWrapper>
  );
}
