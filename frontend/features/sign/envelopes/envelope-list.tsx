"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { usePageState } from "@/hooks/api/use-page-state";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useDeleteSignEnvelope, useSignEnvelopes, type SignEnvelopeSortField } from "@/hooks/api/sign/envelopes";
import { CreateEnvelopeDialog } from "@/components/sign/create-envelope-dialog";
import { EditEnvelopeSheet } from "../components/edit-envelope-sheet";
import { envelopeColumns, envelopeMobileCard } from "./envelope-list-columns";
import { EnvelopeListSkeleton } from "./envelope-list-skeleton";
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

const SORT_FIELDS: readonly SignEnvelopeSortField[] = ["title", "status", "sentAt", "expiresAt"];

export function EnvelopeList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canCreateEnvelope = useCan("sign:envelope:create");
  const statusParam = searchParams.get("status") ?? "all";
  const status = STATUS_VALUES.has(statusParam) ? statusParam : "all";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));
  const searchQuery = searchParams.get("search") ?? "";
  const sortField = SORT_FIELDS.find((field) => field === searchParams.get("sort")) ?? null;
  const sortDirection = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const [search, setSearch] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");
  const [editEnvelope, setEditEnvelope] = useState<SignEnvelope | null>(null);
  const [deleteEnvelope, setDeleteEnvelope] = useState<SignEnvelope | null>(null);
  const { data, isLoading, isError, error, refetch } = useSignEnvelopes({
    status: status === "all" ? undefined : status,
    search: searchQuery || undefined,
    sort: sortField ?? undefined,
    direction: sortField ? sortDirection : undefined,
    page,
    limit: pageSize,
  });
  const envelopes = data?.items ?? [];
  const total = data?.total ?? 0;
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

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;
    replaceParams((params) => {
      if (debouncedSearch) params.set("search", debouncedSearch);
      else params.delete("search");
      params.delete("page");
    });
  }, [debouncedSearch, searchQuery, replaceParams]);

  function handleSortChange(field: string, direction: "asc" | "desc") {
    replaceParams((params) => {
      params.set("sort", field);
      params.set("dir", direction);
      params.delete("page");
    });
  }

  function handleClearSearch() {
    setSearch("");
  }

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

  const emptyState = searchQuery ? (
    <EmptyState
      illustrationPreset="search"
      title="No envelopes match your search"
      description="Search looks at the envelope title and each signer's name and email."
      action={{ label: "Clear search", onClick: handleClearSearch }}
      className="h-full min-h-full flex-1 border-0 bg-transparent"
    />
  ) : activeFilter ? (
    <EmptyState
      illustrationPreset="search"
      title={`No ${activeFilter.label.toLowerCase()} envelopes`}
      description="Try a different status filter or clear it to see all."
      action={{ label: "Clear filter", onClick: handleClearFilter }}
      className="h-full min-h-full flex-1 border-0 bg-transparent"
    />
  ) : (
    <EmptyState
      illustrationPreset="upload"
      title="No envelopes yet"
      description="Upload a PDF and send it for signature to get started."
      action={canCreateEnvelope ? { label: "New envelope", onClick: handleCreateOpen } : undefined}
      className="h-full min-h-full flex-1 border-0 bg-transparent"
    />
  );

  const pageState = usePageState({
    permission: "sign:envelope:view",
    isLoading: isLoading && !hasData,
    isError: isError && !hasData,
    error,
  });

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
      state={pageState}
      loading={<EnvelopeListSkeleton />}
      onRetry={handleRetry}
      actions={
        canCreateEnvelope ? (
          <Button onClick={handleCreateOpen}>
            <Plus className="size-4" />
            New envelope
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <SearchInput
            placeholder="Search title or signer"
            aria-label="Search envelopes"
            value={search}
            onValueChange={setSearch}
            className="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger
              className={cn(FILTER_SELECT_TRIGGER, "w-auto max-w-[11rem] shrink-0 sm:w-44 sm:max-w-none")}
              aria-label="Status"
            >
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
        </div>
      }
    >
      <DataTable
        data={envelopes}
        columns={columns}
        getRowKey={(envelope) => envelope.id}
        isLoading={isLoading}
        emptyState={emptyState}
        onRowClick={handleRowClick}
        sortState={{
          fields: SORT_FIELDS,
          field: sortField,
          direction: sortDirection,
          onChange: handleSortChange,
        }}
        minWidth="720px"
        mobileCard={envelopeMobileCard}
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
