"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useDeleteSignEnvelope, useSignEnvelopes } from "@/hooks/api/sign/envelopes";
import { CreateEnvelopeDialog } from "@/components/sign/create-envelope-dialog";
import { EditEnvelopeSheet } from "../components/edit-envelope-sheet";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { envelopeColumns } from "./envelope-list-columns";
import type { SignEnvelope } from "@/types/sign";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, STANDARD_PAGE_SIZE_OPTIONS, parsePage, parsePageSize } from "@/lib/list-pagination";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_completed", label: "Partially signed" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
  { value: "expired", label: "Expired" },
] as const;

const STATUS_VALUES = new Set<string>(STATUS_FILTERS.map((f) => f.value));

export function EnvelopeList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canCreateEnvelope = useCan("sign:envelope:create");
  const statusParam = searchParams.get("status") ?? "all";
  const status = STATUS_VALUES.has(statusParam) ? statusParam : "all";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");
  const [editEnvelope, setEditEnvelope] = useState<SignEnvelope | null>(null);
  const [deleteEnvelope, setDeleteEnvelope] = useState<SignEnvelope | null>(null);
  const { data, isLoading, isError, error, refetch } = useSignEnvelopes({
    status: status === "all" ? undefined : status,
    page,
    limit: pageSize,
  });
  const envelopes = data?.items ?? [];
  const total = data?.total ?? 0;
  /** SIGN-002: Track whether this is a post-load error vs initial load */
  const hasData = data !== undefined;
  const deleteMutation = useDeleteSignEnvelope();

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function handleStatusChange(value: string) {
    replaceParams((params) => {
      if (value === "all") params.delete("status");
      else params.set("status", value);
      params.delete("page");
    });
  }

  function handleClearFilter() {
    handleStatusChange("all");
  }

  function handlePageChange(next: number) {
    replaceParams((params) => {
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
    });
  }

  function handlePageSizeChange(next: number) {
    replaceParams((params) => {
      if (next === DEFAULT_PAGE_SIZE) params.delete("size");
      else params.set("size", String(next));
      params.delete("page");
    });
  }

  function handleCreateOpen() {
    openCreate();
  }

  async function handleRetry() {
    /** SIGN-002: Await refetch to ensure it completes before any UI update */
    await refetch();
  }

  function handleRowClick(envelope: SignEnvelope) {
    router.push(`/sign/envelopes/${envelope.id}`);
  }

  function handleEditRequest(envelope: SignEnvelope) {
    setEditEnvelope(envelope);
  }

  function handleDeleteRequest(envelope: SignEnvelope) {
    setDeleteEnvelope(envelope);
  }

  function handleEditOpenChange(open: boolean) {
    if (!open) setEditEnvelope(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteEnvelope(null);
  }

  async function handleConfirmDelete() {
    if (!deleteEnvelope) return;
    try {
      await deleteMutation.mutateAsync(deleteEnvelope.id);
      toast.success("Envelope deleted");
      setDeleteEnvelope(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const activeFilter = STATUS_FILTERS.find((f) => f.value === status && status !== "all");

  const emptyState = activeFilter ? (
    <EmptyState
      illustrationPreset="search"
      title={`No ${activeFilter.label.toLowerCase()} envelopes`}
      description="Try a different status filter or clear it to see all."
      action={{ label: "Clear filter", onClick: handleClearFilter }}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  ) : (
    <EmptyState
      illustrationPreset="upload"
      title="No envelopes yet"
      description="Upload a PDF and send it for signature to get started."
      action={canCreateEnvelope ? { label: "New envelope", onClick: handleCreateOpen } : undefined}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  );

  const columns = envelopeColumns({
    canDelete: canCreateEnvelope,
    onOpen: handleRowClick,
    onEdit: handleEditRequest,
    onDelete: handleDeleteRequest,
  });

  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={
        canCreateEnvelope ? (
          <Button onClick={handleCreateOpen}>
            <Plus className="size-4" />
            New envelope
          </Button>
        ) : undefined
      }
      filters={
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")} aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.value === "all" ? "All statuses" : f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isError && !hasData ? (
          <ErrorState
            className="flex-1"
            title="Failed to load envelopes"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={envelopes}
            columns={columns}
            getRowKey={(envelope) => envelope.id}
            isLoading={isLoading}
            emptyState={emptyState}
            onRowClick={handleRowClick}
            minWidth="720px"
            mobileCard={(envelope) => (
              <div className="flex flex-col gap-2 p-3 border-b border-border last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <TruncatedText text={envelope.title} className="font-medium text-sm flex-1" />
                  <EnvelopeStatusBadge status={envelope.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Sent:</span>{" "}
                    {envelope.sentAt ? formatShortDate(envelope.sentAt) : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>{" "}
                    {envelope.expiresAt ? formatShortDate(envelope.expiresAt) : "—"}
                  </div>
                </div>
              </div>
            )}
            pagination={{
              mode: "server",
              page,
              pageSize,
              total,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            }}
          />
        )}
      </div>

      <CreateEnvelopeDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editEnvelope && (
        <EditEnvelopeSheet
          envelope={editEnvelope}
          open
          onOpenChange={handleEditOpenChange}
        />
      )}
      <ConfirmDialog
        open={!!deleteEnvelope}
        onOpenChange={handleDeleteOpenChange}
        title="Delete envelope?"
        description={`This will permanently delete "${deleteEnvelope?.title ?? "this envelope"}". This can’t be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
