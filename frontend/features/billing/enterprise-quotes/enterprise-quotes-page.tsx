"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { useCursorPager } from "@/components/ui/table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useEnterpriseQuoteAction,
  useEnterpriseQuotes,
  type EnterpriseQuoteAction,
} from "@/hooks/api/billing/enterprise-quotes";
import { ENTERPRISE_QUOTE_STATUSES, type EnterpriseQuoteListItem } from "@/hooks/api/billing/billing-growth-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { CreateEnterpriseQuoteSheet } from "./create-enterprise-quote-sheet";
import { QUOTE_HEADERS, QUOTE_STATUS_META, enterpriseQuoteColumns } from "./enterprise-quote-columns";
import { ENTERPRISE_QUOTE_PAGE_SIZE, readQuoteStatus } from "./enterprise-quote-list-state";


function rowKey(row: EnterpriseQuoteListItem): number {
  return row.id;
}

const CONFIRM_COPY: Record<Exclude<EnterpriseQuoteAction, "reject">, { title: string; description: string; label: string }> = {
  submit: { title: "Submit for approval?", description: "An approver reviews the seats, price and term before the quote can be sent.", label: "Submit" },
  approve: { title: "Approve this quote?", description: "Approved quotes can be sent to the customer.", label: "Approve" },
  send: { title: "Mark as sent?", description: "Record that the approved quote has gone to the customer.", label: "Mark as sent" },
  accept: {
    title: "Accept this quote?",
    description: "Accepting applies the negotiated seats to this organisation's plan. This cannot be undone here.",
    label: "Accept quote",
  },
};

const DONE_COPY: Record<EnterpriseQuoteAction, string> = {
  submit: "submitted for approval",
  approve: "approved",
  reject: "sent back to draft",
  send: "marked as sent",
  accept: "accepted",
};

export function EnterpriseQuotesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = readQuoteStatus(searchParams.get("status"));
  const pager = useCursorPager(status ?? "all");
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<{ action: EnterpriseQuoteAction; row: EnterpriseQuoteListItem } | null>(null);

  const query = useEnterpriseQuotes({ status, cursor: pager.cursor, limit: ENTERPRISE_QUOTE_PAGE_SIZE });
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  const canCreate = useCan("billing:enterprise-quotes:create");
  const canApprove = useCan("billing:enterprise-quotes:approve");
  const canView = useCan("billing:enterprise-quotes:view");
  const mutations = {
    submit: useEnterpriseQuoteAction("submit"),
    approve: useEnterpriseQuoteAction("approve"),
    reject: useEnterpriseQuoteAction("reject"),
    send: useEnterpriseQuoteAction("send"),
    accept: useEnterpriseQuoteAction("accept"),
  };

  const allowed = useCallback(
    (action: EnterpriseQuoteAction) =>
      action === "submit" ? canCreate : action === "accept" ? canView : canApprove,
    [canApprove, canCreate, canView],
  );
  const handleAction = useCallback(
    (action: EnterpriseQuoteAction, row: EnterpriseQuoteListItem) => setTarget({ action, row }),
    [],
  );
  const columns = useMemo(() => enterpriseQuoteColumns(allowed, handleAction), [allowed, handleAction]);

  const pageState = usePageState({
    permission: "billing:enterprise-quotes:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && rows.length === 0 && !pager.hasPrevious,
    hasActiveFilters: status !== undefined,
  });

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    params.delete("cursor");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function handleClearFilters() {
    handleStatusChange("all");
  }

  function handleCreate() {
    setCreating(true);
  }

  function handleNext() {
    pager.goNext(query.data?.pagination.nextCursor);
  }

  function handleRetry() {
    void query.refetch();
  }

  function handleDialogChange(open: boolean) {
    if (!open) setTarget(null);
  }

  function run(action: EnterpriseQuoteAction, reason?: string) {
    if (!target) return;
    const { row } = target;
    mutations[action].mutate(
      { quoteId: row.id, reason },
      {
        onSuccess: () => {
          toast.success(`${row.quoteRef} ${DONE_COPY[action]}`);
          setTarget(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleConfirm() {
    if (target && target.action !== "reject") run(target.action);
  }

  function handleReject(reason: string) {
    run("reject", reason.trim());
  }

  const confirmAction = target && target.action !== "reject" ? target.action : null;
  const emptyState = (
    <EmptyState
      illustrationPreset="documents"
      title="No enterprise quotes yet"
      description="Negotiated multi-year plans with custom seat pricing appear here."
      filtersActive={status !== undefined}
      onClearFilters={handleClearFilters}
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <PageWrapper
      title="Enterprise quotes"
      subtitle="Negotiated seats, pricing and terms, from draft to acceptance."
      actions={
        canCreate ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" className="w-full sm:w-auto" onClick={handleCreate}>
            New quote
          </AnimatedIconButton>
        ) : null
      }
      filters={
        <Select value={status ?? "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn("w-full sm:w-48", FILTER_SELECT_TRIGGER)} aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="all">All statuses</SelectItem>
            {ENTERPRISE_QUOTE_STATUSES.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {QUOTE_STATUS_META[candidate].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton headers={QUOTE_HEADERS} rows={10} />}
        empty={emptyState}
        onClearFilters={handleClearFilters}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={rowKey}
          emptyState={emptyState}
          minWidth="860px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            rowCount: rows.length,
            hasMore: query.data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>

      <CreateEnterpriseQuoteSheet open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={handleDialogChange}
        title={confirmAction ? CONFIRM_COPY[confirmAction].title : ""}
        description={confirmAction ? CONFIRM_COPY[confirmAction].description : ""}
        confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction].label : undefined}
        isPending={confirmAction ? mutations[confirmAction].isPending : false}
        onConfirm={handleConfirm}
      />
      <ConfirmWithReasonSheet
        open={target?.action === "reject"}
        onOpenChange={handleDialogChange}
        title={`Send ${target?.row.quoteRef ?? "quote"} back to draft?`}
        description="The author sees your reason and can resubmit."
        reasonLabel="Reason"
        reasonRequired
        confirmLabel="Send back"
        isPending={mutations.reject.isPending}
        onConfirm={handleReject}
      />
    </PageWrapper>
  );
}

