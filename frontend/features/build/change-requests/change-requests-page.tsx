"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useChangeRequests, useDeleteChangeRequest } from "@/hooks/api/build/change-requests";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import type { ChangeRequest } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCursorPager } from "@/components/ui/table-pagination";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ChangeRequestSheet } from "./change-request-sheet";
import { CR_STATUSES, CR_STATUS_LABELS } from "./change-request-schema";
import {
  CHANGE_REQUESTS_TABLE_HEADERS,
  ChangeRequestMobileCard,
  buildChangeRequestsColumns,
} from "./change-requests-table-columns";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  ...CR_STATUSES.map((s) => ({ value: s, label: CR_STATUS_LABELS[s] })),
];

const CLIENT_VISIBLE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All visibility" },
  { value: "true", label: "Client visible" },
  { value: "false", label: "Internal only" },
];

const FILTER_DEFINITIONS = [
  { param: "status", options: CR_STATUSES },
  { param: "clientVisible", options: ["true", "false"] as const },
  { param: "impact" },
  { param: "requesterId" },
  { param: "approverId" },
  { param: "releaseId" },
] as const;

const PAGE_SIZE = 25;

interface ChangeRequestsPageProps {
  projectId: number;
}

export function ChangeRequestsPage({ projectId }: ChangeRequestsPageProps) {
  const canCreate = useCan("build:changerequests:create");
  const canManage = useCan("build:changerequests:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(listFilters.resetKey);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCr, setEditCr] = useState<ChangeRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangeRequest | null>(null);

  const statusValue = listFilters.value("status");
  const clientVisibleValue = listFilters.value("clientVisible");
  const impactValue = listFilters.value("impact");
  const requesterIdValue = listFilters.value("requesterId");
  const approverIdValue = listFilters.value("approverId");
  const releaseIdValue = listFilters.value("releaseId");

  const { data: crPage, isLoading, isError, error, refetch } = useChangeRequests(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    clientVisible:
      clientVisibleValue !== BUILD_FILTER_ALL
        ? clientVisibleValue === "true"
        : undefined,
    impact: impactValue !== BUILD_FILTER_ALL && impactValue ? impactValue : undefined,
    requesterId: requesterIdValue !== BUILD_FILTER_ALL ? requesterIdValue : undefined,
    approverId: approverIdValue !== BUILD_FILTER_ALL ? approverIdValue : undefined,
    releaseId:
      releaseIdValue !== BUILD_FILTER_ALL && releaseIdValue
        ? Number(releaseIdValue)
        : undefined,
    q: listFilters.debouncedSearch || undefined,
    cursor: cursor ?? undefined,
    limit: PAGE_SIZE,
  });

  const { data: membersData } = useOrgMembers(1, 100);
  const deleteCr = useDeleteChangeRequest(projectId);
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const crs = crPage?.data ?? [];
  const pagination = crPage?.pagination;

  const pageState = usePageState({
    permission: "build:changerequests:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && crs.length === 0,
  });

  const handleNew = useCallback(() => {
    setEditCr(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((cr: ChangeRequest) => {
    setEditCr(cr);
    setSheetOpen(true);
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCr.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Change request deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteCr]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const cr = crs[index];
      if (cr) handleEdit(cr);
    },
    [crs, handleEdit],
  );

  const handleKeyboardClear = useCallback(() => {}, []);

  useBuildListKeyboard({
    itemCount: crs.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    enabled: pageState.kind === "ready",
  });

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleClientVisibleChange = useCallback(
    (value: string) => listFilters.setValue("clientVisible", value),
    [listFilters],
  );

  const handleImpactChange = useCallback(
    (value: string) => listFilters.setValue("impact", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleNextPage = useCallback(() => {
    goNext(pagination?.nextCursor);
  }, [pagination, goNext]);

  const columns = useMemo(
    () =>
      buildChangeRequestsColumns({
        canManage,
        members,
        onEdit: handleEdit,
        onDelete: setDeleteTarget,
      }),
    [canManage, members, handleEdit],
  );

  const renderMobileCard = useCallback(
    (row: ChangeRequest) => (
      <ChangeRequestMobileCard
        cr={row}
        canManage={canManage}
        members={members}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />
    ),
    [canManage, members, handleEdit],
  );

  return (
    <PageWrapper
      title="Change Requests"
      subtitle="Track and manage change requests"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search change requests…",
            label: "Search change requests",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "clientVisible",
              label: "Visibility",
              active: listFilters.isActive("clientVisible"),
              control: (
                <BuildFilterSelect
                  label="Visibility"
                  value={clientVisibleValue}
                  onValueChange={handleClientVisibleChange}
                  options={CLIENT_VISIBLE_OPTIONS}
                />
              ),
            },
            {
              id: "impact",
              label: "Impact",
              active: listFilters.isActive("impact"),
              control: (
                <SearchInput
                  placeholder="Filter by impact…"
                  value={impactValue !== BUILD_FILTER_ALL ? impactValue : ""}
                  onValueChange={handleImpactChange}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canCreate
              ? [
                  {
                    id: "new-cr",
                    label: "New Change Request",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNew,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={CHANGE_REQUESTS_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No change requests"
                description="Create a change request to get started."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={canCreate ? { label: "New Change Request", onClick: handleNew } : undefined}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable<ChangeRequest>
              data={crs}
              columns={columns}
              getRowKey={(row) => row.id}
              className={PM_FILL_PANEL}
              mobileCard={renderMobileCard}
              pagination={{
                mode: "cursor",
                pageSize: PAGE_SIZE,
                hasMore: Boolean(pagination?.hasMore),
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <ChangeRequestSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCr={editCr}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete change request?"
        description={`CR-${deleteTarget?.crNumber ?? ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteCr.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
