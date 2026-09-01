"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { ErrorState } from "@/components/shared";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { CreditNoteFormSheet } from "@/features/accounting/sales/credit-note-form-sheet";
import { ApplyCreditNoteDialog } from "@/features/accounting/sales/apply-credit-note-dialog";
import { useCreditNotes, usePostCreditNote } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import type { CreditNote, CreditNoteStatus } from "@/types/accounting/ar";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";

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
      <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule">
        Applied
      </Badge>
    );
  }
  if (status === "POSTED") return <FinanceStatusBadge status="POSTED" />;
  if (status === "DRAFT") return <FinanceStatusBadge status="DRAFT" />;
  return <FinanceStatusBadge status="VOID" />;
}

interface CreditNoteRowActionsProps {
  credit: CreditNote;
  onApply: (credit: CreditNote) => void;
  canManage: boolean;
}

function CreditNoteRowActions({ credit, onApply, canManage }: CreditNoteRowActionsProps) {
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
        <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="ghost" size="icon" className="w-7" aria-label="Credit note actions" />
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

export function CreditNotesPage() {
  const canCreate = useCan("accounting:credit-notes:create");
  const [createOpen, setCreateOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<CreditNote | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const query = useCreditNotes({
    status: statusFilter !== "all" && isCreditNoteStatus(statusFilter) ? statusFilter : undefined,
    cursor: cursors[cursorIndex] ?? undefined,
    limit: 20,
  });

  const credits = query.data?.data ?? [];
  const hasMore = query.data?.pagination.hasMore ?? false;

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
    setCursors([null]);
    setCursorIndex(0);
  }

  function handleCustomerSearchChange(value: string): void {
    setCustomerSearch(value);
  }

  function handleOpenApply(credit: CreditNote): void {
    setApplyTarget(credit);
    setApplyDialogOpen(true);
  }

  function handleApplyDialogOpenChange(open: boolean): void {
    setApplyDialogOpen(open);
    if (!open) setApplyTarget(null);
  }

  function handlePrevPage(): void {
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
        <span className="text-sm text-muted-foreground">{formatShortDate(row.createdAt) || "—"}</span>
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
          <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
            <Plus className="size-4 mr-1" />
            New credit note
          </LoadingButton>
        ) : undefined
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className={`w-[140px] ${FILTER_SELECT_TRIGGER}`}>
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
            placeholder="Search customer…"
            value={customerSearch}
            onValueChange={handleCustomerSearchChange}
          />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.isError && (
          <ErrorState
            title="Failed to load credit notes"
            description={getErrorMessage(query.error)}
          />
        )}

        <DataTable
          data={filteredCredits}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          className="flex-1 min-h-0"
          emptyState={
            <EmptyState
              illustrationPreset="documents"
              title="No credit notes yet"
              description="Create credit notes to record refunds and billing adjustments."
              action={{ label: "New credit note", onClick: handleNewClick }}
            />
          }
        />
        {(cursorIndex > 0 || hasMore) ? (
          <CursorPageControls
            page={cursorIndex + 1}
            hasNext={hasMore}
            onPrevious={handlePrevPage}
            onNext={handleNextPage}
            className="mt-2"
          />
        ) : null}
      </div>

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
