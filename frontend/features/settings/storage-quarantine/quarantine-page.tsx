"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { useCursorPager } from "@/components/ui/table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { PageState } from "@/components/shared/page-state";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useMemberDirectory, type DirectoryScope } from "@/hooks/api/members/use-member-directory";
import {
  useDeleteQuarantined,
  useQuarantine,
  useRejectQuarantined,
  useReleaseQuarantined,
} from "@/hooks/api/storage/quarantine";
import { QUARANTINE_STATUSES, type QuarantineRecord } from "@/hooks/api/storage/quarantine-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { QUARANTINE_RECORD_LAYOUT } from "@/lib/renderer/settings/quarantine-record-layout";
import { cn } from "@/lib/utils";
import { QUARANTINE_PAGE_SIZE, readQuarantineStatus } from "./quarantine-list-state";
import { QUARANTINE_HEADERS, RowActions, STATUS_META, quarantineCells, type QuarantineAction } from "./quarantine-cells";

const ORG_SCOPE: DirectoryScope = { kind: "org" };

function rowKey(row: QuarantineRecord): string {
  return row.id;
}

/** Uploads held for malware scanning: review, release, reject or delete. */
export function QuarantinePage() {
  const layout = useTenantLayout(QUARANTINE_RECORD_LAYOUT);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = readQuarantineStatus(searchParams.get("status"));
  const pager = useCursorPager(status ?? "all");
  const canManage = useCan("storage:quarantine:manage");
  const [target, setTarget] = useState<{ action: QuarantineAction; row: QuarantineRecord } | null>(null);

  const query = useQuarantine({ status, cursor: pager.cursor, limit: QUARANTINE_PAGE_SIZE });
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);
  const uploaderIds = useMemo(() => [...new Set(rows.map((row) => row.uploadedBy))], [rows]);
  const { selectedMembers } = useMemberDirectory(ORG_SCOPE, { selectedIds: uploaderIds });

  const release = useReleaseQuarantined();
  const reject = useRejectQuarantined();
  const remove = useDeleteQuarantined();

  const cells = useMemo(() => {
    const names = new Map(selectedMembers.map((member) => [member.id, getUserDisplayName(member)]));
    return quarantineCells((userId: string) => names.get(userId) ?? "Former member");
  }, [selectedMembers]);
  const handleAction = useCallback(
    (action: QuarantineAction, row: QuarantineRecord) => setTarget({ action, row }),
    [],
  );
  const renderActions = useCallback(
    (row: QuarantineRecord) => <RowActions row={row} onAction={handleAction} />,
    [handleAction],
  );

  const pageState = usePageState({
    permission: "storage:quarantine:view",
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

  function handleNext() {
    pager.goNext(query.data?.pagination.nextCursor);
  }

  function handleRetry() {
    void query.refetch();
  }

  function handleDialogChange(open: boolean) {
    if (!open) setTarget(null);
  }

  const callbacks = (done: string) => ({
    onSuccess: () => {
      toast.success(done);
      setTarget(null);
    },
    onError: (error: Error) => toast.error(getErrorMessage(error)),
  });

  function handleRelease() {
    if (target) release.mutate(target.row.id, callbacks(`Released ${target.row.filename}`));
  }

  function handleReject(reason: string) {
    if (target) reject.mutate({ id: target.row.id, reason: reason.trim() || undefined }, callbacks(`Rejected ${target.row.filename}`));
  }

  function handleDelete() {
    if (target) remove.mutate(target.row.id, callbacks(`Deleted ${target.row.filename}`));
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="security"
      title="Nothing in quarantine"
      description="Uploads waiting on a malware scan, or flagged by one, appear here for review."
      filtersActive={status !== undefined}
      onClearFilters={handleClearFilters}
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <PageWrapper
      title="Upload quarantine"
      subtitle="Files held back until a malware scan clears them."
      filters={
        <Select value={status ?? "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)} aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="all">All statuses</SelectItem>
            {QUARANTINE_STATUSES.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {STATUS_META[candidate].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton headers={QUARANTINE_HEADERS} rows={10} />}
        empty={emptyState}
        onClearFilters={handleClearFilters}
        onRetry={handleRetry}
        className="flex-1"
      >
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={rowKey}
          cells={cells}
          actions={canManage ? renderActions : undefined}
          emptyState={emptyState}
          minWidth="760px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: QUARANTINE_PAGE_SIZE,
            hasMore: query.data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>

      <ConfirmDialog
        open={target?.action === "release"}
        onOpenChange={handleDialogChange}
        title={`Release ${target?.row.filename ?? "file"}?`}
        description="The file is marked clean without a scan result and becomes available to download. Release only a file you trust."
        confirmLabel="Release"
        isPending={release.isPending}
        onConfirm={handleRelease}
      />
      <ConfirmWithReasonSheet
        open={target?.action === "reject"}
        onOpenChange={handleDialogChange}
        title={`Reject ${target?.row.filename ?? "file"}?`}
        description="The file is marked infected and can never be downloaded."
        reasonLabel="Reason (optional)"
        confirmLabel="Reject"
        isPending={reject.isPending}
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={target?.action === "delete"}
        onOpenChange={handleDialogChange}
        title={`Delete ${target?.row.filename ?? "file"}?`}
        description="The file is removed from the quarantine queue and can no longer be released."
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
