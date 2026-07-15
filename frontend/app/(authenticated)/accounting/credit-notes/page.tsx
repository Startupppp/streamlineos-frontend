"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { CreditNoteFormSheet } from "@/features/accounting/sales/credit-note-form-sheet";
import { ApplyCreditNoteDialog } from "@/features/accounting/sales/apply-credit-note-dialog";
import { useCreditNotes, usePostCreditNote } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import type { CreditNote, CreditNoteStatus } from "@/types/accounting/ar";
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

const CREDIT_NOTE_STATUS_VALUES: ReadonlyArray<string> = ["DRAFT", "POSTED", "APPLIED", "VOID"];

function isCreditNoteStatus(v: string): v is CreditNoteStatus {
  return CREDIT_NOTE_STATUS_VALUES.includes(v);
}

function CreditNoteStatusBadge({ status }: { status: CreditNoteStatus }) {
  if (status === "APPLIED") {
    return (
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
        Applied
      </Badge>
    );
  }
  if (status === "POSTED") {
    return <FinanceStatusBadge status="POSTED" />;
  }
  if (status === "DRAFT") {
    return <FinanceStatusBadge status="DRAFT" />;
  }
  return <FinanceStatusBadge status="VOID" />;
}

interface RowActionsProps {
  credit: CreditNote;
  onApply: (credit: CreditNote) => void;
  canManage: boolean;
}

function CreditNoteRowActions({ credit, onApply, canManage }: RowActionsProps) {
  const postMutation = usePostCreditNote();

  function handleApply(): void {
    onApply(credit);
  }

  function handlePost(): void {
    postMutation.mutate(
      { creditNoteId: credit.id },
      {
        onSuccess: (res) => {
          if (res.needsApproval) {
            toast.info("Pending approval before posting");
          } else {
            toast.success("Credit note posted");
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canManage && credit.status === "DRAFT" && (
          <DropdownMenuItem onClick={handlePost} disabled={postMutation.isPending}>
            {postMutation.isPending ? "Posting…" : "Post"}
          </DropdownMenuItem>
        )}
        {canManage && credit.status === "POSTED" && (
          <DropdownMenuItem onClick={handleApply}>Apply to invoice</DropdownMenuItem>
        )}
        {canManage && (credit.status === "DRAFT" || credit.status === "POSTED") && (
          <DropdownMenuSeparator />
        )}
        <DropdownMenuItem disabled>View detail</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function CreditNotesPage() {
  const canCreate = useCan("accounting:credit-notes:create");
  const [createOpen, setCreateOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<CreditNote | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useCreditNotes({
    status: statusFilter !== "all" && isCreditNoteStatus(statusFilter) ? statusFilter : undefined,
    page,
    pageSize: 20,
  });

  const credits = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const filteredCredits = customerSearch.trim()
    ? credits.filter((c) =>
        c.client?.name?.toLowerCase().includes(customerSearch.toLowerCase()),
      )
    : credits;

  function handleNewClick(): void {
    setCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean): void {
    setCreateOpen(open);
  }

  function handleStatusFilterChange(value: string): void {
    setStatusFilter(value);
    setPage(1);
  }

  function handleCustomerSearchChange(value: string): void {
    setCustomerSearch(value);
  }

  function handlePageChange(p: number): void {
    setPage(p);
  }

  function handleOpenApply(credit: CreditNote): void {
    setApplyTarget(credit);
    setApplyDialogOpen(true);
  }

  function handleApplyDialogOpenChange(open: boolean): void {
    setApplyDialogOpen(open);
    if (!open) setApplyTarget(null);
  }

  const columns: DataTableColumn<CreditNote>[] = [
    {
      key: "creditNoteNumber",
      header: "Credit #",
      cell: (row) => <span className="font-mono text-xs">{row.creditNoteNumber}</span>,
    },
    {
      key: "client",
      header: "Customer",
      cell: (row) => <span className="text-sm">{row.client?.name ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
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
      key: "balance",
      header: "Balance",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <Money value={Number(row.total) - Number(row.appliedAmount)} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <CreditNoteStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => (
        <CreditNoteRowActions
          credit={row}
          onApply={handleOpenApply}
          canManage
        />
      ),
    },
  ];

  return (
    <PageWrapper
      title="Credit Notes"
      subtitle="Manage refunds and billing adjustments"
      actions={
        canCreate ? (
          <Button size="sm" onClick={handleNewClick}>
            <Plus className="size-4 mr-1" />
            New credit note
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[140px] text-xs">
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
          <SearchInput
            className="w-[180px]"
            placeholder="Search customer…"
            value={customerSearch}
            onValueChange={handleCustomerSearchChange}
          />
        </div>
      }
    >
      {query.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
          {getErrorMessage(query.error)}
        </div>
      )}

      <DataTable
        data={filteredCredits}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        className="flex-1 min-h-0"
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total,
          onPageChange: handlePageChange,
        }}
        emptyState={
          <EmptyState
            illustrationPreset="documents"
            title="No credit notes yet"
            description="Create credit notes to record refunds and billing adjustments."
            action={{ label: "New credit note", onClick: handleNewClick }}
          />
        }
      />

      <CreditNoteFormSheet open={createOpen} onOpenChange={handleCreateOpenChange} />

      {applyTarget && (
        <ApplyCreditNoteDialog
          open={applyDialogOpen}
          onOpenChange={handleApplyDialogOpenChange}
          creditNote={applyTarget}
        />
      )}
    </PageWrapper>
  );
}
