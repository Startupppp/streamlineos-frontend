"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useBugs, useDeleteBug } from "@/hooks/api/build/bugs";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useProjectMembers } from "@/hooks/api/build";
import { getUserDisplayName } from "@/lib/person-display";
import type { Bug } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
import { BugSheet } from "./bug-sheet";
import {
  BUGS_TABLE_HEADERS,
  BugMobileCard,
  buildBugsColumns,
} from "./bugs-table-columns";

const BUG_STATUSES = [
  "new", "triaged", "assigned", "in_progress", "fixed",
  "ready_for_qa", "verified", "reopened", "closed",
] as const;

const BUG_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "fixed", label: "Fixed" },
  { value: "ready_for_qa", label: "Ready for QA" },
  { value: "verified", label: "Verified" },
  { value: "reopened", label: "Reopened" },
  { value: "closed", label: "Closed" },
];

const BUG_SEVERITY_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All severities" },
  { value: "blocker", label: "Blocker" },
  { value: "critical", label: "Critical" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "trivial", label: "Trivial" },
];

const FILTER_DEFINITIONS = [
  { param: "status", options: BUG_STATUSES },
  { param: "severity", options: ["blocker", "critical", "major", "minor", "trivial"] as const },
  { param: "assignee" },
] as const;

interface BugsPageProps {
  projectId: number;
}

export function BugsPage({ projectId }: BugsPageProps) {
  const canCreate = useCan("build:bugs:create");
  const canUpdate = useCan("build:bugs:update");
  const canDelete = useCan("build:bugs:delete");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bug | null>(null);

  const statusValue = listFilters.value("status");
  const severityValue = listFilters.value("severity");
  const assigneeValue = listFilters.value("assignee");

  const { data: bugs, isLoading, isError, error, refetch } = useBugs(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    severity: severityValue !== BUILD_FILTER_ALL ? severityValue : undefined,
    assigneeId: assigneeValue !== BUILD_FILTER_ALL ? assigneeValue : undefined,
    q: listFilters.debouncedSearch || undefined,
  });

  const { data: members = [] } = useProjectMembers(projectId);

  const assigneeOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All assignees" },
      ...members.map((m) => ({ value: m.id, label: getUserDisplayName(m) })),
    ],
    [members],
  );

  const deleteBug = useDeleteBug();
  const pageState = usePageState({ permission: "build:bugs:view", isLoading, isError, error });

  const handleEdit = useCallback((bug: Bug) => {
    setEditBug(bug);
    setSheetOpen(true);
  }, []);

  const handleNewBug = useCallback(() => {
    setEditBug(null);
    setSheetOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteBug.mutate(
      { projectId, bugId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Bug deleted");
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteBug, projectId]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSeverityChange = useCallback(
    (value: string) => listFilters.setValue("severity", value),
    [listFilters],
  );

  const handleAssigneeChange = useCallback(
    (value: string) => listFilters.setValue("assignee", value),
    [listFilters],
  );

  const columns = useMemo(
    () =>
      buildBugsColumns({
        canUpdate,
        canDelete,
        onEdit: handleEdit,
        onDelete: setDeleteTarget,
      }),
    [canUpdate, canDelete, handleEdit],
  );

  const renderMobileCard = useCallback(
    (row: Bug) => (
      <BugMobileCard
        bug={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />
    ),
    [canUpdate, canDelete, handleEdit],
  );

  return (
    <PageWrapper
      title="Bugs"
      subtitle="Track and triage project bugs"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search bugs…",
            label: "Search bugs",
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
                  options={BUG_STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "severity",
              label: "Severity",
              active: listFilters.isActive("severity"),
              control: (
                <BuildFilterSelect
                  label="Severity"
                  value={severityValue}
                  onValueChange={handleSeverityChange}
                  options={BUG_SEVERITY_OPTIONS}
                />
              ),
            },
            {
              id: "assignee",
              label: "Assignee",
              active: listFilters.isActive("assignee"),
              control: (
                <BuildFilterSelect
                  label="Assignee"
                  value={assigneeValue}
                  onValueChange={handleAssigneeChange}
                  options={assigneeOptions}
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
                    id: "report-bug",
                    label: "Report Bug",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNewBug,
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
              <DataTableSkeleton rows={12} headers={BUGS_TABLE_HEADERS} className="flex-1" />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No bugs found"
                description="Report a bug to get started."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={canCreate ? { label: "Report Bug", onClick: handleNewBug } : undefined}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable<Bug>
              data={bugs ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              className={PM_FILL_PANEL}
              mobileCard={renderMobileCard}
              pagination={{ pageSize: 25 }}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <BugSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editBug={editBug}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete bug?"
        description={`BUG-${deleteTarget?.ticketNumber ?? ""}${deleteTarget?.title ? ` · ${deleteTarget.title}` : ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
